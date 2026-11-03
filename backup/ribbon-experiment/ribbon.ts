import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshStandardNodeMaterial, Vector3 } from 'three/webgpu';
import {
  attribute,
  cameraViewMatrix,
  color,
  dot,
  exp,
  float,
  faceDirection,
  fwidth,
  fract,
  max,
  mix,
  modelViewMatrix,
  normalize,
  normalView,
  positionView,
  pow,
  smoothstep,
  sqrt,
  uv,
  vec4,
} from 'three/tsl';
import type { SignatureLayout } from './signature';

export const RIBBON_POINTS = 1800;

const ACROSS = 4;
const RING = ACROSS + 1;
const STEP = 1 / 60;
const HALF_WIDTH = 0.125;
const NIB_ANGLE = 0.7;
const SPRING = 95;
const DAMPING = 0.955;
const WRITE_SECONDS = 3.4;
const RESIGN_SECONDS = 1.9;
const RESIGN_DELAY = 0.4;
const STITCH_LENGTH = 3;
const FLIP_START = 8;
const FLIP_LENGTH = 45;
const FLIP_ANGLE = 2.5;

function smooth(value: number, edge0: number, edge1: number) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

interface SatinColors {
  face: string;
  back: string;
  thread: string;
  sheen: string;
}

/** uv.x runs across the ribbon, uv.y along it, one unit per stitch. */
export function satinMaterial(lightDirection: Vector3, colors: SatinColors) {
  const material = new MeshStandardNodeMaterial({ side: DoubleSide });
  const across = uv().x;
  const along = uv().y;
  const front = faceDirection.greaterThan(0);

  const edge = smoothstep(0, 0.05, across).mul(smoothstep(0, 0.05, float(1).sub(across)));
  const inset = across.sub(0.5).abs().sub(0.37).abs();
  const dash = smoothstep(0.32, 0.4, fract(along)).mul(smoothstep(0, 0.08, float(1).sub(fract(along))));
  // Fades out once a stitch would be smaller than a pixel, so narrow ribbons don't shimmer.
  const resolved = smoothstep(0.5, 0.2, fwidth(along)).mul(smoothstep(0.09, 0.04, fwidth(across)));
  const stitch = smoothstep(0.03, 0.012, inset).mul(dash).mul(resolved);

  const cloth = mix(color(colors.face), color(colors.back), front.select(float(0), float(1))).mul(
    mix(float(0.86), float(1), edge),
  );
  material.colorNode = mix(cloth, color(colors.thread), stitch.mul(0.5));
  material.roughnessNode = front.select(float(0.42), float(0.72));
  material.metalnessNode = float(0);

  // Satin threads run along the ribbon, so its highlight follows the length, not the surface.
  const thread = normalize(modelViewMatrix.mul(vec4(attribute('aThread', 'vec3'), 0)).xyz);
  const view = normalize(positionView.negate());
  const light = normalize(cameraViewMatrix.mul(vec4(lightDirection, 0)).xyz);
  const halfway = normalize(light.add(view));
  const threadDotHalf = dot(thread, halfway);
  const sheen = pow(sqrt(max(float(1).sub(threadDotHalf.mul(threadDotHalf)), 0)), 70);
  const lit = max(dot(normalView, light), 0);
  // A soft streak that runs the whole length, off-centre towards the light.
  const offset = across.sub(0.4).div(0.17);
  const streak = exp(offset.mul(offset).negate()).mul(max(dot(normalView, view), 0));
  material.emissiveNode = color(colors.sheen)
    .mul(sheen.mul(lit).mul(0.36).add(streak.mul(0.09)))
    .mul(front.select(float(1), float(0.3)));

  return material;
}

export class Ribbon {
  readonly mesh: Mesh<BufferGeometry, MeshStandardNodeMaterial>;

  private positions = new Float32Array(RIBBON_POINTS * 3);
  private previous = new Float32Array(RIBBON_POINTS * 3);
  private targets = new Float32Array(RIBBON_POINTS * 3);
  private rest = new Float32Array(RIBBON_POINTS);
  private twist = new Float32Array(RIBBON_POINTS);
  private loose = new Float32Array(RIBBON_POINTS);

  private vertexPositions = new Float32Array(RIBBON_POINTS * RING * 3);
  private vertexNormals = new Float32Array(RIBBON_POINTS * RING * 3);
  private vertexThreads = new Float32Array(RIBBON_POINTS * RING * 3);

  private scale = 1;
  private time = 0;
  private leftover = 0;
  private laidOut = false;
  private written = 0;
  private writing = false;
  private writeClock = 0;
  private pen = -1;
  private sinceGust = Infinity;

  private pointerX = 0;
  private pointerY = 0;
  private windX = 0;
  private windY = 0;

  constructor(lightDirection: Vector3) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.vertexPositions, 3));
    geometry.setAttribute('normal', new BufferAttribute(this.vertexNormals, 3));
    geometry.setAttribute('aThread', new BufferAttribute(this.vertexThreads, 3));

    const uvs = new Float32Array(RIBBON_POINTS * RING * 2);
    const indices = new Uint32Array((RIBBON_POINTS - 1) * ACROSS * 6);
    let cursor = 0;
    for (let i = 0; i < RIBBON_POINTS; i++) {
      for (let j = 0; j < RING; j++) {
        const vertex = i * RING + j;
        uvs[vertex * 2] = j / ACROSS;
        uvs[vertex * 2 + 1] = i / STITCH_LENGTH;
        if (i < RIBBON_POINTS - 1 && j < ACROSS) {
          indices[cursor++] = vertex;
          indices[cursor++] = vertex + RING;
          indices[cursor++] = vertex + 1;
          indices[cursor++] = vertex + 1;
          indices[cursor++] = vertex + RING;
          indices[cursor++] = vertex + RING + 1;
        }
      }
    }
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));

    this.mesh = new Mesh(
      geometry,
      satinMaterial(lightDirection, { face: '#ff6a48', back: '#c9304f', thread: '#ffa98c', sheen: '#ffc9b0' }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
  }

  /** Takes on a new layout. After the first one, the ribbon flows across to it. */
  setLayout({ points, scale, hairlines, dot: dotRange, exit }: SignatureLayout) {
    this.scale = scale;
    this.targets.set(points);
    this.liftCrossings();
    this.computeRestAndTwist(hairlines, dotRange, exit);
    if (!this.laidOut) {
      this.positions.set(this.targets);
      this.previous.set(this.targets);
      this.laidOut = true;
    }
  }

  /** Starts the opening, where the signature is written from the P to the n. */
  write() {
    this.written = 0;
    this.writeClock = 0;
    this.writing = true;
  }

  /** Shows the finished signature with no opening. */
  finish() {
    this.written = RIBBON_POINTS;
    this.writing = false;
    this.positions.set(this.targets);
    this.previous.set(this.targets);
  }

  /** The cursor as wind. Velocity is in world units per second. */
  blow(x: number, y: number, velocityX: number, velocityY: number) {
    this.pointerX = x;
    this.pointerY = y;
    this.windX = velocityX;
    this.windY = velocityY;
  }

  /** A click or tap: a burst that throws the nearby ribbon loose. */
  burst(x: number, y: number) {
    const reach = 3 * this.scale;
    for (let i = 0; i < RIBBON_POINTS; i++) {
      const p = i * 3;
      const dx = this.positions[p] - x;
      const dy = this.positions[p + 1] - y;
      const force = Math.exp(-(dx * dx + dy * dy) / (2 * reach * reach));
      const distance = Math.hypot(dx, dy) || 1;
      const push = force * 0.07 * this.scale;
      this.positions[p] += (dx / distance) * push;
      this.positions[p + 1] += (dy / distance) * push;
      this.positions[p + 2] += push * (0.8 + Math.sin(i * 0.031));
      this.loose[i] = Math.max(this.loose[i], force);
    }
    this.sinceGust = 0;
    this.pen = -1;
  }

  update(delta: number, moving: boolean) {
    if (this.writing) {
      // Runs on real time, so a slow device gets a rougher opening but not a longer one.
      this.writeClock += delta;
      const progress = Math.min(1, this.writeClock / WRITE_SECONDS);
      this.written = RIBBON_POINTS * (progress * progress * (3 - 2 * progress));
      if (progress === 1) this.writing = false;
    }
    if (moving) {
      this.leftover = Math.min(this.leftover + delta, STEP * 3);
      while (this.leftover >= STEP) {
        this.step();
        this.leftover -= STEP;
      }
    }
    this.writeGeometry(moving);
  }

  private step() {
    this.time += STEP;

    this.applyWind();
    this.resign();
    this.integrate();
    this.keepLength();
  }

  private applyWind() {
    const speed = Math.hypot(this.windX, this.windY);
    if (speed < 0.05 * this.scale) {
      this.sinceGust += STEP;
      this.windX *= 0.8;
      this.windY *= 0.8;
      return;
    }

    const reach = 1.25 * this.scale;
    const gusting = speed > 2 * this.scale;
    for (let i = 0; i < RIBBON_POINTS; i++) {
      const p = i * 3;
      const dx = this.positions[p] - this.pointerX;
      const dy = this.positions[p + 1] - this.pointerY;
      const distance = Math.hypot(dx, dy);
      if (distance > reach) continue;
      const force = (1 - distance / reach) ** 2;
      this.positions[p] += this.windX * force * STEP * 0.32;
      this.positions[p + 1] += this.windY * force * STEP * 0.32;
      this.positions[p + 2] += speed * force * STEP * 0.14;
      if (gusting) {
        this.loose[i] = Math.min(1, this.loose[i] + (force * speed * STEP) / (2.2 * this.scale));
      }
    }

    if (gusting) {
      this.sinceGust = 0;
      this.pen = -1;
    } else {
      this.sinceGust += STEP;
    }
    this.windX *= 0.8;
    this.windY *= 0.8;
  }

  /** Once the wind drops, a pen sweeps from the first loose point and writes the rest back. */
  private resign() {
    if (this.sinceGust < RESIGN_DELAY) return;
    if (this.pen < 0) {
      const first = this.loose.findIndex((value) => value > 0.01);
      if (first < 0) return;
      this.pen = first;
    }
    this.pen += (RIBBON_POINTS / RESIGN_SECONDS) * STEP;
    const end = Math.min(RIBBON_POINTS, Math.floor(this.pen));
    for (let i = 0; i < end; i++) {
      this.loose[i] = this.loose[i] < 0.01 ? 0 : this.loose[i] * 0.86;
    }
    if (this.pen >= RIBBON_POINTS) this.pen = -1;
  }

  private integrate() {
    const { positions, previous, targets, loose, scale, time } = this;
    const stepSquared = STEP * STEP;

    for (let i = 0; i < RIBBON_POINTS; i++) {
      const p = i * 3;
      const looseness = loose[i];
      const hold = (1 - looseness) ** 2;
      const spring = SPRING * hold + 1.4;

      // At rest the ribbon breathes in long slow waves. Loose, it billows.
      const breath = Math.sin(i * 0.011 - time * 0.75);
      const homeY = targets[p + 1] + 0.012 * scale * Math.sin(i * 0.017 - time * 0.55);
      const homeZ = targets[p + 2] + 0.05 * scale * breath;

      let forceX = (targets[p] - positions[p]) * spring;
      let forceY = (homeY - positions[p + 1]) * spring;
      let forceZ = (homeZ - positions[p + 2]) * spring;

      if (looseness > 0) {
        const billow = looseness * 7 * scale;
        forceX += billow * Math.sin(positions[p + 1] * 1.4 / scale + time * 1.3 + i * 0.006);
        forceY += billow * Math.cos(positions[p] * 1.1 / scale + time * 1.1 - i * 0.004);
        forceZ += billow * 1.2 * Math.sin(positions[p] * 0.9 / scale - time * 1.6 + i * 0.009);
      }

      for (let axis = 0; axis < 3; axis++) {
        const force = axis === 0 ? forceX : axis === 1 ? forceY : forceZ;
        const current = positions[p + axis];
        positions[p + axis] = current + (current - previous[p + axis]) * DAMPING + force * stepSquared;
        previous[p + axis] = current;
      }
    }
  }

  /** Ribbon doesn't stretch: holds each point at its rest distance from the next. */
  private keepLength() {
    const { positions, rest } = this;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < RIBBON_POINTS - 1; i++) {
        const a = i * 3;
        const b = a + 3;
        const dx = positions[b] - positions[a];
        const dy = positions[b + 1] - positions[a + 1];
        const dz = positions[b + 2] - positions[a + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        if (distance <= rest[i]) continue;
        const correction = ((distance - rest[i]) / distance) * 0.5 * 0.8;
        positions[a] += dx * correction;
        positions[a + 1] += dy * correction;
        positions[a + 2] += dz * correction;
        positions[b] -= dx * correction;
        positions[b + 1] -= dy * correction;
        positions[b + 2] -= dz * correction;
      }
    }
  }

  /** Where the stroke crosses itself, the later pass goes over the earlier one. */
  private liftCrossings() {
    const { targets, scale } = this;
    const lift = new Float32Array(RIBBON_POINTS);
    const stride = 4;
    const reach = (HALF_WIDTH * scale * 1.5) ** 2;
    for (let later = 0; later < RIBBON_POINTS; later += stride) {
      for (let earlier = 0; earlier < later - 60; earlier += stride) {
        const dx = targets[later * 3] - targets[earlier * 3];
        const dy = targets[later * 3 + 1] - targets[earlier * 3 + 1];
        if (dx * dx + dy * dy < reach) {
          lift[later] = 1;
          break;
        }
      }
    }

    const radius = 44;
    const running = new Float32Array(RIBBON_POINTS + 1);
    for (let i = 0; i < RIBBON_POINTS; i++) running[i + 1] = running[i] + lift[i];
    for (let i = 0; i < RIBBON_POINTS; i++) {
      const start = Math.max(0, i - radius);
      const end = Math.min(RIBBON_POINTS, i + radius);
      const raised = Math.min(1, ((running[end] - running[start]) / (end - start)) * 6);
      targets[i * 3 + 2] = raised * scale * 0.2;
    }
  }

  private computeRestAndTwist(
    hairlines: SignatureLayout['hairlines'],
    dotRange: SignatureLayout['dot'],
    exit: number,
  ) {
    const { targets, rest, twist } = this;
    const raw = new Float32Array(RIBBON_POINTS);
    const nibX = Math.sin(NIB_ANGLE);
    const nibY = -Math.cos(NIB_ANGLE);

    for (let i = 0; i < RIBBON_POINTS; i++) {
      const a = Math.max(0, i - 1) * 3;
      const b = Math.min(RIBBON_POINTS - 1, i + 1) * 3;
      const dx = targets[b] - targets[a];
      const dy = targets[b + 1] - targets[a + 1];
      const length = Math.hypot(dx, dy) || 1;
      // A flat ribbon twists edge-on along the nib angle, like a broad pen's thin strokes.
      const broad = Math.abs((dx / length) * nibX + (dy / length) * nibY);
      const pen = 0.26 + 0.74 * smooth(broad, 0.05, 0.85);
      const thin = hairlines.some(([start, end]) => i >= start && i <= end);
      const full = i >= dotRange[0] && i <= dotRange[1];
      raw[i] = Math.acos(full ? 1 : thin ? 0.34 : pen);
      if (i >= exit) {
        // On its way out the ribbon rolls over and shows its darker back.
        const roll = smooth(i - exit, FLIP_START, FLIP_START + FLIP_LENGTH);
        raw[i] = Math.acos(0.72) + (FLIP_ANGLE - Math.acos(0.72)) * roll;
      }
    }

    const radius = 14;
    for (let i = 0; i < RIBBON_POINTS; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - radius); j <= Math.min(RIBBON_POINTS - 1, i + radius); j++) {
        sum += raw[j];
        count++;
      }
      twist[i] = sum / count;
    }

    for (let i = 0; i < RIBBON_POINTS - 1; i++) {
      const a = i * 3;
      const b = a + 3;
      rest[i] = Math.hypot(targets[b] - targets[a], targets[b + 1] - targets[a + 1], targets[b + 2] - targets[a + 2]);
    }
  }

  private writeGeometry(moving: boolean) {
    const { positions, twist, loose, time, scale, written } = this;
    const halfWidth = HALF_WIDTH * scale;
    let acrossX = 0;
    let acrossY = 1;
    let acrossZ = 0;

    const lastDrawn = Math.min(RIBBON_POINTS - 1, Math.ceil(written));
    for (let i = 0; i <= lastDrawn; i++) {
      // A wider span than the neighbours, so small simulation jitter doesn't band the sheen.
      const a = Math.max(0, i - 4) * 3;
      const b = Math.min(RIBBON_POINTS - 1, i + 4) * 3;
      let tx = positions[b] - positions[a];
      let ty = positions[b + 1] - positions[a + 1];
      let tz = positions[b + 2] - positions[a + 2];
      const length = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1e-6;
      tx /= length;
      ty /= length;
      tz /= length;

      const flat = Math.hypot(tx, ty);
      const looseness = loose[i];
      if (flat > 0.15) {
        const sideX = -ty / flat;
        const sideY = tx / flat;
        const wave = moving ? 0.2 * Math.sin(i * 0.016 - time * 0.62) : 0;
        const tumble = looseness * 2.6 * Math.sin(i * 0.014 + time * 2.1);
        const angle = twist[i] + wave + tumble;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const blend = i === 0 ? 1 : 0.35;
        acrossX += (sideX * cos - acrossX) * blend;
        acrossY += (sideY * cos - acrossY) * blend;
        acrossZ += (sin - acrossZ) * blend;
      }

      // Keeps the across direction square to the length.
      const along = acrossX * tx + acrossY * ty + acrossZ * tz;
      let ux = acrossX - along * tx;
      let uy = acrossY - along * ty;
      let uz = acrossZ - along * tz;
      const uLength = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1e-6;
      ux /= uLength;
      uy /= uLength;
      uz /= uLength;

      // Lit as if turned part-way to the viewer, so edge-on strokes stay coral instead of going dark.
      const facing = 1.1 * (1 - looseness);
      const nx = ty * uz - tz * uy;
      const ny = tz * ux - tx * uz;
      const trueZ = tx * uy - ty * ux;
      const nz = trueZ + (trueZ < 0 ? -facing : facing);

      // The pen's end tapers while it writes.
      const taper = this.writing ? smooth(written - i, 0, 34) : 1;
      const width = halfWidth * taper;
      const p = i * 3;

      for (let j = 0; j < RING; j++) {
        const v = (j / ACROSS) * 2 - 1;
        const cup = (1 - v * v) * width * 0.07;
        const faceScale = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        const vertex = (i * RING + j) * 3;
        this.vertexPositions[vertex] = positions[p] + ux * v * width + nx * faceScale * cup;
        this.vertexPositions[vertex + 1] = positions[p + 1] + uy * v * width + ny * faceScale * cup;
        this.vertexPositions[vertex + 2] = positions[p + 2] + uz * v * width + nz * faceScale * cup;

        const normalX = nx * faceScale + ux * v * 0.12;
        const normalY = ny * faceScale + uy * v * 0.12;
        const normalZ = nz * faceScale + uz * v * 0.12;
        const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
        this.vertexNormals[vertex] = normalX / normalLength;
        this.vertexNormals[vertex + 1] = normalY / normalLength;
        this.vertexNormals[vertex + 2] = normalZ / normalLength;

        this.vertexThreads[vertex] = tx;
        this.vertexThreads[vertex + 1] = ty;
        this.vertexThreads[vertex + 2] = tz;
      }
    }

    const geometry = this.mesh.geometry;
    geometry.setDrawRange(0, Math.max(0, lastDrawn) * ACROSS * 6);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.aThread.needsUpdate = true;
  }
}

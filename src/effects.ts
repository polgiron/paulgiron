import { CylinderGeometry, InstancedMesh, Matrix4, MeshBasicNodeMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Object3D, Scene } from 'three/webgpu';
import { BRICK } from './bricks';
import { PALETTE } from './palette';

const MAX_PUFFS = 160;
const MAX_DASHES = 48;
const DASH_RADIUS = 0.024;
const PUFF_DRAG = 3.2;
const PUFF_RISE = 0.45;
const SETTLE_SECONDS = 0.7;

interface Puff {
  position: Vector3;
  velocity: Vector3;
  radius: number;
  age: number;
  life: number;
}

interface Dash {
  position: Vector3;
  turn: Quaternion;
  length: number;
  age: number;
}

interface Settling {
  mesh: Object3D;
  y: number;
  age: number;
}

const DASH_SECONDS = 0.7;
const UP = new Vector3(0, 1, 0);

function between(low: number, high: number) {
  return low + Math.random() * (high - low);
}

/** Cartoon effects, on the scene's clock so they pause and speed up with it: inked puffs of smoke, speed lines, and bricks that settle. */
export function createEffects(scene: Scene) {
  // Solid balls rather than soft particles, so the ink pass outlines them like everything else.
  const puffMesh = new InstancedMesh(
    new SphereGeometry(1, 20, 14),
    new MeshBasicNodeMaterial({ color: PALETTE.smoke }),
    MAX_PUFFS,
  );
  const dashMesh = new InstancedMesh(
    new CylinderGeometry(DASH_RADIUS, DASH_RADIUS, 1, 6).translate(0, 0.5, 0),
    new MeshBasicNodeMaterial({ color: PALETTE.ink }),
    MAX_DASHES,
  );
  for (const mesh of [puffMesh, dashMesh]) {
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
  }

  let puffs: Puff[] = [];
  let dashes: Dash[] = [];
  let settling: Settling[] = [];
  const matrix = new Matrix4();
  const scale = new Vector3();
  const none = new Quaternion();

  function addPuff(x: number, y: number, z: number, velocity: Vector3, radius: number, life: number) {
    if (puffs.length < MAX_PUFFS) puffs.push({ position: new Vector3(x, y, z), velocity, radius, age: 0, life });
  }

  return {
    /** A cloud of dust around the foot of a brick, smaller off the floor, with a few specks thrown further. */
    dust(position: Vector3) {
      const y = position.y - BRICK / 2 + 0.2;
      const size = position.y < BRICK ? 1 : 0.6;
      for (let i = 0; i < 9; i++) {
        const angle = ((i + Math.random() * 0.6) / 9) * Math.PI * 2;
        const [x, z] = [Math.cos(angle), Math.sin(angle)];
        const speed = between(1.6, 3.2) * size;
        const velocity = new Vector3(x * speed, between(0.9, 2.4) * size, z * speed + 1.4);
        addPuff(position.x + x * 0.5, y, position.z + z * 0.5, velocity, between(0.3, 0.68) * size, between(1.7, 2.6));
      }
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const [x, z] = [Math.cos(angle), Math.sin(angle)];
        const speed = between(4.5, 7) * size;
        const velocity = new Vector3(x * speed, between(1.5, 3) * size, z * speed + 1.4);
        addPuff(position.x + x * 0.5, y, position.z + z * 0.5, velocity, between(0.08, 0.17), between(1.2, 1.8));
      }
    },
    /** A speed line whose front stays at position and whose tail runs back along direction. */
    dash(position: Vector3, direction: Vector3, length: number) {
      if (dashes.length >= MAX_DASHES) return;
      const turn = new Quaternion().setFromUnitVectors(UP, direction);
      dashes.push({ position: position.clone(), turn, length, age: 0 });
    },
    /** A brick squashes as it lands, then springs back, keeping its foot on the ground. */
    settle(mesh: Object3D) {
      settling.push({ mesh, y: mesh.position.y, age: 0 });
    },
    update(seconds: number) {
      puffs = puffs.filter((puff) => (puff.age += seconds) < puff.life);
      puffs.forEach((puff, index) => {
        puff.velocity.multiplyScalar(Math.exp(-PUFF_DRAG * seconds));
        puff.position.addScaledVector(puff.velocity, seconds);
        puff.position.y += PUFF_RISE * seconds;
        // Pops out, holds, then shrinks away: cartoon smoke never fades.
        const t = puff.age / puff.life;
        const grow = 1 - (1 - Math.min(t / 0.22, 1)) ** 3;
        const shrink = 1 - Math.max((t - 0.55) / 0.45, 0) ** 2;
        const size = puff.radius * grow * shrink;
        puffMesh.setMatrixAt(index, matrix.compose(puff.position, none, scale.setScalar(size)));
      });
      puffMesh.count = puffs.length;
      puffMesh.instanceMatrix.needsUpdate = true;

      dashes = dashes.filter((dash) => (dash.age += seconds) < DASH_SECONDS);
      dashes.forEach((dash, index) => {
        const length = dash.length * Math.sin((dash.age / DASH_SECONDS) * Math.PI);
        dashMesh.setMatrixAt(index, matrix.compose(dash.position, dash.turn, scale.set(1, length, 1)));
      });
      dashMesh.count = dashes.length;
      dashMesh.instanceMatrix.needsUpdate = true;

      settling = settling.filter((item) => {
        item.age += seconds;
        const done = item.age >= SETTLE_SECONDS;
        const height = done ? 1 : 1 - 0.17 * Math.exp(-7 * item.age) * Math.cos(15 * item.age);
        const width = 1 + (1 - height) * 0.4;
        item.mesh.scale.set(width, height, width);
        item.mesh.position.y = item.y + ((height - 1) * BRICK) / 2;
        return !done;
      });
    },
    clear() {
      for (const item of settling) {
        item.mesh.scale.setScalar(1);
        item.mesh.position.y = item.y;
      }
      settling = [];
      puffs = [];
      dashes = [];
      puffMesh.count = 0;
      dashMesh.count = 0;
    },
  };
}

export type Effects = ReturnType<typeof createEffects>;

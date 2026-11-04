import { Raycaster, Vector2, Vector3 } from 'three/webgpu';
import type { Camera, Mesh } from 'three/webgpu';
import type { Builder } from './builder';
import { BRICK, restsOn, takeOut } from './bricks';
import type { Brick, Yard } from './bricks';
import { boxesTouch, castBox, pushApart, rectanglesTouch, slideBox } from './collisions';
import type { Box } from './collisions';
import type { Effects } from './effects';
import { robotBoxes } from './robot';
import type { Robot } from './robot';

// How quickly a held brick catches up with the cursor, per second.
const CHASE = 30;
const GRAVITY = 40;
const CAST_LENGTH = 200;
const DUST_DROP = 0.2;
const BRICK_HALF = new Vector3(BRICK / 2, BRICK / 2, BRICK / 2);
// Larger than the room in every direction, and thick enough that nothing can get through.
const FAR = 500;
// How far from a brick a fingertip still takes it, in CSS pixels.
const TOUCH_RADIUS = 24;
// How long a brick has to stay in hand before an arm comes for it, so that a plain click disturbs nobody.
const CHASE_DELAY_SECONDS = 0.4;
// How much further an arm with its claw full counts as being, as it has to put that brick down first.
const BUSY_ARM_PENALTY = 5;

export interface Worker {
  builder: Builder;
  robot: Robot;
}

interface Drag {
  brick: Brick;
  box: Box;
  start: Vector3;
  slot?: Vector3;
  aim: Vector2;
}

interface Fall extends Omit<Drag, 'aim'> {
  from: Vector3;
  to: Vector3;
  speed: number;
  age: number;
  seconds: number;
}

function wall(x: number, y: number, z: number): Box {
  return { center: new Vector3(x, y, z), half: new Vector3(FAR, FAR, FAR), yaw: 0 };
}

function brickBox({ position, rotation }: Mesh): Box {
  return { center: position, half: BRICK_HALF, yaw: rotation.y };
}

const FLOOR = wall(0, -FAR, 0);
const ROOM = [FLOOR, wall(0, 0, -6 - FAR), wall(-17.5 - FAR, 0, 0), wall(17.5 + FAR, 0, 0)];

/**
 * Lets the mouse or a finger pick up a brick and move it anywhere in the room. The brick stays under the cursor
 * where it can, standing on the first thing the cursor's ray meets, and is stopped by everything solid
 * on the way there. The robots carry on meanwhile, and their arms shove it aside. Let go, it falls straight down.
 */
export function createGrabber(canvas: HTMLCanvasElement, camera: Camera, yard: Yard, workers: Worker[], effects: Effects) {
  const meshes = yard.bricks.map(({ mesh }) => mesh);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const aimed = new Vector2();
  const motion = new Vector3();
  const target = new Vector3();
  const projected = new Vector3();
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  let drag: Drag | null = null;
  let fall: Fall | null = null;
  let chaser: Worker | null = null;
  let heldFor = 0;

  /** The screen's edge is the only limit on the cursor, even with the pointer captured outside it. */
  function readPointer(event: PointerEvent) {
    const { left, top, width, height } = canvas.getBoundingClientRect();
    const x = ((event.clientX - left) / width) * 2 - 1;
    const y = -((event.clientY - top) / height) * 2 + 1;
    pointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  }

  /** The bricks lying still, other than this one. */
  function restingBoxes(brick: Brick) {
    return yard.bricks.filter((other) => other !== brick && !yard.carried.has(other)).map(({ mesh }) => brickBox(mesh));
  }

  /** Free to take: not in a claw, and with nothing resting on it. */
  function isFree(brick: Brick) {
    if (yard.carried.has(brick)) return false;
    const { position, rotation } = brick.mesh;
    return !restingBoxes(brick).some(({ center, yaw }) => restsOn(center, yaw, position, rotation.y));
  }

  /** The brick under the cursor, if it is free to take. */
  function brickAtPointer() {
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(meshes, false);
    const brick = hit && yard.bricks.find(({ mesh }) => mesh === hit.object);
    return brick && isFree(brick) ? brick : null;
  }

  /** The closest free brick around a fingertip, which covers more than it can see. */
  function brickNearPointer() {
    const { width, height } = canvas.getBoundingClientRect();
    let nearest: Brick | null = null;
    let least = TOUCH_RADIUS;
    for (const brick of yard.bricks) {
      projected.copy(brick.mesh.position).project(camera);
      const away = Math.hypot(((projected.x - pointer.x) * width) / 2, ((projected.y - pointer.y) * height) / 2);
      if (away < least && isFree(brick)) {
        nearest = brick;
        least = away;
      }
    }
    return nearest;
  }

  function pickUp(brick: Brick) {
    const { mesh, slot } = brick;
    // The cursor keeps the spot it took the brick by, so the brick doesn't jump to centre on it.
    projected.copy(mesh.position).project(camera);
    drag = {
      brick,
      box: brickBox(mesh),
      start: mesh.position.clone(),
      slot,
      aim: new Vector2(projected.x - pointer.x, projected.y - pointer.y),
    };
    yard.grabbed = brick;
    heldFor = 0;
    takeOut(yard, brick);
    for (const { builder } of workers) builder.taken(brick);
  }

  /** Sends the arm best placed after the brick in hand. */
  function setChaser({ brick }: Drag) {
    const cost = ({ builder, robot }: Worker) =>
      robot.root.position.distanceTo(brick.mesh.position) + (builder.carrying ? BUSY_ARM_PENALTY : 0);
    chaser = workers.reduce((best, worker) => (cost(worker) < cost(best) ? worker : best));
    chaser.builder.chase(brick, () => {
      drag = null;
      chaser = null;
      yard.grabbed = null;
      canvas.style.cursor = '';
    });
  }

  function follow({ brick, box, aim }: Drag, seconds: number) {
    const resting = restingBoxes(brick);
    const still = [...resting, ...ROOM];
    const moving = [
      // The chasing claw is the one thing that closes around the brick rather than shoving it. It comes last in the list.
      ...workers.flatMap((worker) => (worker === chaser ? robotBoxes(worker.robot).slice(0, -1) : robotBoxes(worker.robot))),
      ...[...yard.carried].map(({ mesh }) => brickBox(mesh)),
    ];
    for (const part of moving) pushApart(box, part, still);

    raycaster.setFromCamera(aimed.addVectors(pointer, aim), camera);
    const { origin, direction } = raycaster.ray;
    const cast = { center: origin, half: box.half, yaw: box.yaw };
    const reached = castBox(cast, motion.copy(direction).multiplyScalar(CAST_LENGTH), still);
    target.copy(origin).addScaledVector(direction, CAST_LENGTH * reached);
    motion.subVectors(target, box.center).multiplyScalar(1 - Math.exp(-CHASE * seconds));
    slideBox(box, motion, [...still, ...moving]);
  }

  /** Where a brick let go of ends up: straight down, or centred on the one brick under it if it would topple off. */
  function restingPlace({ brick, box }: Drag) {
    const resting = restingBoxes(brick);
    const down = new Vector3(0, -box.center.y, 0);
    const to = box.center.clone().addScaledVector(down, castBox(box, down, [...resting, FLOOR]));
    const supports = resting.filter((other) => restsOn(to, box.yaw, other.center, other.yaw));
    if (supports.length !== 1) return to;
    const [support] = supports;
    if (rectanglesTouch(to, box.yaw, [0, 0], support.center, support.yaw, [BRICK / 2, BRICK / 2])) return to;
    const centred = to.clone().setX(support.center.x).setZ(support.center.z);
    const place = { center: centred, half: box.half, yaw: box.yaw };
    return resting.some((other) => boxesTouch(place, other)) ? to : centred;
  }

  function land({ brick, box, from, to, start, slot }: Fall) {
    const { position } = brick.mesh;
    position.x = to.x;
    position.z = to.z;
    // Always a whole number of bricks up, even if what it landed on was still squashing.
    position.y = BRICK * (Math.round(position.y / BRICK - 0.5) + 0.5);
    fall = null;
    yard.grabbed = null;
    brick.spot = { position: position.clone(), yaw: box.yaw };
    // A click that moved nothing leaves a letter in its place.
    if (slot && position.distanceTo(start) < 0.01 && !yard.bricks.some((other) => other.slot === slot)) brick.slot = slot;
    if (!calm.matches) {
      if (from.y - position.y > DUST_DROP) effects.dust(position);
      effects.settle(brick.mesh);
    }
    for (const { builder } of workers) builder.moved(brick);
  }

  function letGo() {
    if (!drag) return;
    // Catches up with the cursor first, so a quick flick lands where it was aimed.
    follow(drag, Infinity);
    chaser?.builder.stopChase();
    chaser = null;
    const { brick, box, start, slot } = drag;
    const to = restingPlace(drag);
    drag = null;
    fall = {
      brick,
      box,
      start,
      slot,
      from: box.center.clone(),
      to,
      speed: 0,
      age: 0,
      seconds: Math.sqrt((2 * (box.center.y - to.y)) / GRAVITY),
    };
    canvas.style.cursor = '';
  }

  /** Falls for real, a frame at a time: what it was going to land on may have been taken by now. */
  function drop(current: Fall, seconds: number) {
    const { box, from, to } = current;
    current.age += seconds;
    current.speed += GRAVITY * seconds;
    const distance = calm.matches ? box.center.y : current.speed * seconds;
    const reached = castBox(box, motion.set(0, -distance, 0), [...restingBoxes(current.brick), FLOOR]);
    box.center.y -= distance * reached;
    const along = current.seconds > 0 ? Math.min(current.age / current.seconds, 1) : 1;
    box.center.x = from.x + (to.x - from.x) * along;
    box.center.z = from.z + (to.z - from.z) * along;
    if (reached < 1) land(current);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || drag || fall) return;
    effects.finishSettling();
    readPointer(event);
    const brick = brickAtPointer() ?? (event.pointerType === 'touch' ? brickNearPointer() : null);
    if (!brick) return;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    pickUp(brick);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!event.isPrimary) return;
    readPointer(event);
    if (!drag) canvas.style.cursor = !fall && brickAtPointer() ? 'grab' : '';
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    canvas.addEventListener(type, (event) => {
      if (event.isPrimary) letGo();
    });
  }

  return {
    /** A brick is in the air. */
    get busy() {
      return drag !== null || fall !== null;
    },
    letGo,
    update(seconds: number) {
      if (drag && !chaser && (heldFor += seconds) >= CHASE_DELAY_SECONDS) setChaser(drag);
      if (drag) follow(drag, seconds);
      if (fall) drop(fall, seconds);
    },
    /** Forgets any brick in the air, for when everything goes back to the start. */
    cancel() {
      drag = null;
      fall = null;
      chaser = null;
      canvas.style.cursor = '';
    },
  };
}

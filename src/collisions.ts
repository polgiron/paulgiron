import { Vector3 } from 'three/webgpu';

/** An upright box. Like every brick here, it only ever turns around the vertical. */
export interface Box {
  center: Vector3;
  half: Vector3;
  yaw: number;
}

// Overlapping by more than this is a box that started inside another, which never blocks: it can only leave.
const SKIN = 0.02;

/** Whether two rectangles on the floor overlap, by the separating axis test. */
export function rectanglesTouch(
  a: Vector3,
  aYaw: number,
  aHalf: readonly [number, number],
  b: Vector3,
  bYaw: number,
  bHalf: readonly [number, number],
) {
  const axes = [aYaw, aYaw + Math.PI / 2, bYaw, bYaw + Math.PI / 2];
  const extent = (yaw: number, half: readonly [number, number], axis: number) =>
    half[0] * Math.abs(Math.cos(axis - yaw)) + half[1] * Math.abs(Math.sin(axis - yaw));
  return axes.every((axis) => {
    const gap = Math.abs((b.x - a.x) * Math.cos(axis) - (b.z - a.z) * Math.sin(axis));
    return gap < extent(aYaw, aHalf, axis) + extent(bYaw, bHalf, axis);
  });
}

/** Whether two boxes overlap. */
export function boxesTouch(a: Box, b: Box) {
  return (
    Math.abs(a.center.y - b.center.y) < a.half.y + b.half.y &&
    rectanglesTouch(a.center, a.yaw, [a.half.x, a.half.z], b.center, b.yaw, [b.half.x, b.half.z])
  );
}

/** Runs a test on every axis that could separate two boxes, for as long as it passes. */
function testAxes(a: Box, b: Box, test: (x: number, y: number, z: number, reach: number) => boolean) {
  const flat = (yaw: number) => {
    const extent = ({ half, yaw: turn }: Box) =>
      half.x * Math.abs(Math.cos(yaw - turn)) + half.z * Math.abs(Math.sin(yaw - turn));
    return test(Math.cos(yaw), 0, -Math.sin(yaw), extent(a) + extent(b));
  };
  return (
    test(0, 1, 0, a.half.y + b.half.y) &&
    flat(a.yaw) &&
    flat(a.yaw + Math.PI / 2) &&
    flat(b.yaw) &&
    flat(b.yaw + Math.PI / 2)
  );
}

/** When a moving box first hits another along its motion: 0 is now, 1 is the end of the motion. */
function sweep(moving: Box, motion: Vector3, other: Box, normal: Vector3) {
  let enter = -Infinity;
  let exit = Infinity;
  let shallowest = Infinity;
  let closing = false;
  const enterNormal = new Vector3();
  const shallowNormal = new Vector3();
  const gapX = other.center.x - moving.center.x;
  const gapY = other.center.y - moving.center.y;
  const gapZ = other.center.z - moving.center.z;

  const axis = (x: number, y: number, z: number, reach: number) => {
    const gap = gapX * x + gapY * y + gapZ * z;
    const speed = motion.x * x + motion.y * y + motion.z * z;
    const away = gap < 0 ? -1 : 1;
    const depth = reach - Math.abs(gap);
    if (depth < shallowest) {
      shallowest = depth;
      closing = speed * away > 1e-9;
      shallowNormal.set(-x * away, -y * away, -z * away);
    }
    if (Math.abs(speed) < 1e-9) return depth > 0;
    const near = Math.min((gap - reach) / speed, (gap + reach) / speed);
    const far = Math.max((gap - reach) / speed, (gap + reach) / speed);
    if (near > enter) {
      enter = near;
      const facing = speed > 0 ? -1 : 1;
      enterNormal.set(x * facing, y * facing, z * facing);
    }
    exit = Math.min(exit, far);
    return true;
  };

  if (!testAxes(moving, other, axis) || enter >= exit || exit <= 0 || enter >= 1) return null;

  if (enter < 0) {
    if (shallowest > SKIN || !closing) return null;
    normal.copy(shallowNormal);
    return 0;
  }
  normal.copy(enterNormal);
  return enter;
}

function firstHit(box: Box, motion: Vector3, obstacles: Box[], normal: Vector3) {
  const candidate = new Vector3();
  let earliest = 1;
  for (const obstacle of obstacles) {
    const time = sweep(box, motion, obstacle, candidate);
    if (time !== null && time < earliest) {
      earliest = time;
      normal.copy(candidate);
    }
  }
  return earliest;
}

/** How far along a straight motion a box gets before it hits anything, from 0 to 1. */
export function castBox(box: Box, motion: Vector3, obstacles: Box[]) {
  return firstHit(box, motion, obstacles, new Vector3());
}

/** Moves a box as far as it can go, sliding along whatever it hits. */
export function slideBox(box: Box, motion: Vector3, obstacles: Box[]) {
  const left = motion.clone();
  const normal = new Vector3();
  for (let bounce = 0; bounce < 4 && left.lengthSq() > 1e-10; bounce++) {
    normal.set(0, 0, 0);
    const time = firstHit(box, left, obstacles, normal);
    box.center.addScaledVector(left, time);
    if (time === 1) return;
    left.multiplyScalar(1 - time);
    left.addScaledVector(normal, -left.dot(normal));
  }
}

/** Shoves a box out of another that has moved into it, by the shortest way out, as far as the obstacles allow. */
export function pushApart(box: Box, other: Box, obstacles: Box[]) {
  const push = new Vector3();
  let shallowest = Infinity;
  const touching = testAxes(box, other, (x, y, z, reach) => {
    const gap =
      (other.center.x - box.center.x) * x + (other.center.y - box.center.y) * y + (other.center.z - box.center.z) * z;
    const depth = reach - Math.abs(gap);
    if (depth <= 0) return false;
    if (depth < shallowest) {
      shallowest = depth;
      push.set(x, y, z).multiplyScalar(gap > 0 ? -depth : depth);
    }
    return true;
  });
  if (touching) slideBox(box, push, obstacles);
}

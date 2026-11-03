import { Vector3 } from 'three/webgpu';
import { BRICK } from './bricks';
import type { Brick, Crew, Spot } from './bricks';
import { heldPosition, setGrip, setPose, solveReach } from './robot';
import type { Reach, Robot } from './robot';

// A brick's height while it travels: its bottom and the fingertips clear the top of the name.
const TRAVEL_HEIGHT = 5.75;
const SWING_SECONDS = 3.2;
const VERTICAL_SECONDS = 1.4;
const GRIP_SECONDS = 0.5;
const BRICK_SECONDS = 2 * SWING_SECONDS + 4 * VERTICAL_SECONDS + 2 * GRIP_SECONDS;
// A moment with the finished name, each time it has been built.
const NAME_HOLD_SECONDS = 6;
const EMPTY_HOLD_SECONDS = 4;

function ease(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Drives one robot for ever: it builds its part of the name from random loose bricks nearby,
 * then takes it apart again, dropping the bricks in random free spots.
 * The arm only swings through the half of the circle centred on frontAngle, so it never meets the back wall.
 * A smaller crew waits between bricks, so that both robots finish together with the largest one.
 */
export function createBuilder(robot: Robot, frontAngle: number, crew: Crew, largestCrew: number) {
  const { slots, bricks } = crew;
  const base = robot.root.position;
  const scratch = new Vector3();
  const pause = BRICK_SECONDS * (largestCrew / slots.length - 1);
  const inName = new Map<Vector3, Brick>();
  let freeSpots: Spot[] = [];
  let delta = 0;
  let held: Brick | null = null;

  const reachOf = (point: Vector3, yaw: number, height = point.y): Reach => {
    let angle = Math.atan2(base.z - point.z, point.x - base.x);
    while (angle < frontAngle - Math.PI) angle += Math.PI * 2;
    while (angle >= frontAngle + Math.PI) angle -= Math.PI * 2;
    return { angle, radius: Math.hypot(point.x - base.x, point.z - base.z), height, yaw };
  };

  const start = reachOf(bricks[0].spot.position, bricks[0].spot.yaw, TRAVEL_HEIGHT);
  let at = start;

  function pose() {
    setPose(robot, solveReach(at));
    if (held) {
      held.mesh.position.copy(heldPosition(robot, scratch));
      held.mesh.rotation.y = at.yaw;
    }
  }
  setGrip(robot, 0);
  pose();

  function* moveTo(target: Reach, seconds: number) {
    const from = at;
    for (let time = 0; time < seconds; time += delta) {
      const t = ease(time / seconds);
      at = {
        angle: from.angle + (target.angle - from.angle) * t,
        radius: from.radius + (target.radius - from.radius) * t,
        height: from.height + (target.height - from.height) * t,
        yaw: from.yaw + (target.yaw - from.yaw) * t,
      };
      pose();
      yield;
    }
    at = target;
    pose();
  }

  function* grip(from: number, to: number) {
    for (let time = 0; time < GRIP_SECONDS; time += delta) {
      setGrip(robot, from + (to - from) * ease(time / GRIP_SECONDS));
      yield;
    }
    setGrip(robot, to);
  }

  function* carry(brick: Brick, from: Vector3, fromYaw: number, to: Vector3, toYaw: number) {
    yield* moveTo(reachOf(from, fromYaw, TRAVEL_HEIGHT), SWING_SECONDS);
    yield* moveTo(reachOf(from, fromYaw), VERTICAL_SECONDS);
    yield* grip(0, 1);
    held = brick;
    yield* moveTo(reachOf(from, fromYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
    yield* moveTo(reachOf(to, toYaw, TRAVEL_HEIGHT), SWING_SECONDS);
    yield* moveTo(reachOf(to, toYaw), VERTICAL_SECONDS);
    held = null;
    brick.mesh.position.copy(to);
    brick.mesh.rotation.y = toYaw;
    yield* grip(1, 0);
    yield* moveTo(reachOf(to, toYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
  }

  /** Any loose brick, but not one the same colour as the bricks it will touch, when there is a choice. */
  function chooseBrick(slot: Vector3) {
    const taken = new Set(inName.values());
    const loose = bricks.filter((brick) => !taken.has(brick));
    const neighbours = new Set(
      [...inName].filter(([other]) => other.distanceTo(slot) < BRICK * 1.1).map(([, brick]) => brick.colorName),
    );
    const different = loose.filter((brick) => !neighbours.has(brick.colorName));
    return randomItem(different.length > 0 ? different : loose);
  }

  function* wait(seconds: number) {
    for (let time = 0; time < seconds; time += delta) yield;
  }

  function* build() {
    for (const slot of slots) {
      const brick = chooseBrick(slot);
      inName.set(slot, brick);
      const { position, yaw } = brick.spot;
      yield* carry(brick, position, yaw, slot, 0);
      freeSpots.push(brick.spot);
      yield* wait(pause);
    }
  }

  function* unbuild() {
    for (const slot of [...slots].reverse()) {
      const brick = inName.get(slot);
      if (!brick) continue;
      const spot = randomItem(freeSpots);
      freeSpots = freeSpots.filter((other) => other !== spot);
      yield* carry(brick, slot, 0, spot.position, spot.yaw);
      brick.spot = spot;
      inName.delete(slot);
      yield* wait(pause);
    }
  }

  function* forever(built: boolean): Generator<void, void, void> {
    if (built) yield* wait(NAME_HOLD_SECONDS);
    else yield* build();
    while (true) {
      if (!built) yield* wait(NAME_HOLD_SECONDS);
      built = false;
      yield* unbuild();
      yield* wait(EMPTY_HOLD_SECONDS);
      yield* build();
    }
  }
  let script = forever(false);

  return {
    update(seconds: number) {
      delta = seconds;
      script.next();
    },
    /** Back to the opening: every brick loose where it started, and no name. */
    reset() {
      for (const brick of bricks) {
        brick.spot = brick.firstSpot;
        brick.mesh.position.copy(brick.spot.position);
        brick.mesh.rotation.y = brick.spot.yaw;
      }
      inName.clear();
      freeSpots = [];
      held = null;
      at = start;
      setGrip(robot, 0);
      pose();
      script = forever(false);
    },
    /** Jumps straight to the finished name, for visitors who asked for less motion. */
    showFinished() {
      for (const slot of slots) {
        const brick = chooseBrick(slot);
        inName.set(slot, brick);
        freeSpots.push(brick.spot);
        brick.mesh.position.copy(slot);
        brick.mesh.rotation.y = 0;
      }
      at = reachOf(slots[slots.length - 1], 0, TRAVEL_HEIGHT);
      pose();
      script = forever(true);
    },
  };
}

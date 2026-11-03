import { Vector3 } from 'three/webgpu';
import { BURIED_REDS } from './bricks';
import type { Brick, Crew, Spot } from './bricks';
import type { Effects } from './effects';
import { PALETTE } from './palette';
import { heldPosition, setGrip, setPose, solveReach } from './robot';
import type { Reach, Robot } from './robot';

// A brick's height while it travels: its bottom and the fingertips clear the top of the name.
const TRAVEL_HEIGHT = 5.75;
const SWING_SECONDS = 3.2;
const VERTICAL_SECONDS = 1.4;
const GRIP_SECONDS = 0.5;
// A moment with the finished name, each time it has been built.
const NAME_HOLD_SECONDS = 6;
const EMPTY_HOLD_SECONDS = 4;
// The arm bobs upward as it stops, never down, so the bob can't reach the name.
const BOB_HEIGHT = 0.16;
const DASH_MIN_SPEED = 3.5;
const DASH_SPACING = 0.75;

function ease(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Drives one robot for ever: it builds its part of the name from the red bricks nearby,
 * then takes it apart again, dropping the bricks in random free spots.
 * The arm only swings through the half of the circle centred on frontAngle, so it never meets the back wall.
 * Each way takes both robots the same number of moves. Building, they dig out buried red bricks, and a smaller crew
 * sorts other colours aside between its own bricks. Taking apart, they bury a few red bricks again for the next round.
 */
export function createBuilder(robot: Robot, frontAngle: number, crew: Crew, largestCrew: number, effects: Effects) {
  const { slots, bricks } = crew;
  const base = robot.root.position;
  const scratch = new Vector3();
  const tip = new Vector3();
  const lastTip = new Vector3();
  const travel = new Vector3();
  const across = new Vector3();
  const dashAt = new Vector3();
  const towardCamera = new Vector3(0, 0, 1);
  const movesEachWay = largestCrew + BURIED_REDS;
  const inName = new Map<Vector3, Brick>();
  let freeSpots = [...crew.emptySpots];
  let movesMade = 0;
  let delta = 0;
  let held: Brick | null = null;
  let sinceSwing = 99;
  let sinceDash = 0;
  let swinging = false;

  const reachOf = (point: Vector3, yaw: number, height = point.y): Reach => {
    let angle = Math.atan2(base.z - point.z, point.x - base.x);
    while (angle < frontAngle - Math.PI) angle += Math.PI * 2;
    while (angle >= frontAngle + Math.PI) angle -= Math.PI * 2;
    return { angle, radius: Math.hypot(point.x - base.x, point.z - base.z), height, yaw };
  };

  const start = reachOf(bricks[0].spot.position, bricks[0].spot.yaw, TRAVEL_HEIGHT);
  let at = start;

  function pose() {
    const bob = BOB_HEIGHT * Math.exp(-6 * sinceSwing) * ((1 - Math.cos(18 * sinceSwing)) / 2);
    setPose(robot, solveReach({ ...at, height: at.height + bob }));
    if (held) {
      held.mesh.position.copy(heldPosition(robot, scratch));
      held.mesh.rotation.y = at.yaw;
    }
  }
  setGrip(robot, 0);
  pose();

  /** Speed lines left behind the claw while it swings fast. */
  function trail() {
    if (!swinging) return;
    heldPosition(robot, tip);
    travel.subVectors(lastTip, tip);
    const distance = travel.length();
    lastTip.copy(tip);
    if (delta === 0 || distance / delta < DASH_MIN_SPEED) return;
    travel.divideScalar(distance);
    sinceDash += distance;
    if (sinceDash < DASH_SPACING) return;
    sinceDash = 0;
    across.crossVectors(travel, towardCamera).normalize();
    dashAt.copy(tip).addScaledVector(travel, 0.7).addScaledVector(across, (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45));
    effects.dash(dashAt, travel, 0.7 + (distance / delta) * 0.12);
  }

  function* moveTo(target: Reach, seconds: number) {
    const from = at;
    heldPosition(robot, lastTip);
    for (let time = 0; time < seconds; time += delta) {
      const t = ease(time / seconds);
      at = {
        angle: from.angle + (target.angle - from.angle) * t,
        radius: from.radius + (target.radius - from.radius) * t,
        height: from.height + (target.height - from.height) * t,
        yaw: from.yaw + (target.yaw - from.yaw) * t,
      };
      sinceSwing += delta;
      pose();
      trail();
      yield;
    }
    at = target;
    pose();
  }

  function* swingTo(target: Reach) {
    swinging = true;
    yield* moveTo(target, SWING_SECONDS);
    swinging = false;
    sinceSwing = 0;
  }

  function* grip(from: number, to: number) {
    for (let time = 0; time < GRIP_SECONDS; time += delta) {
      setGrip(robot, from + (to - from) * ease(time / GRIP_SECONDS));
      yield;
    }
    setGrip(robot, to);
  }

  function* carry(brick: Brick, from: Vector3, fromYaw: number, to: Vector3, toYaw: number) {
    movesMade++;
    yield* swingTo(reachOf(from, fromYaw, TRAVEL_HEIGHT));
    yield* moveTo(reachOf(from, fromYaw), VERTICAL_SECONDS);
    yield* grip(0, 1);
    held = brick;
    effects.dust(from);
    yield* moveTo(reachOf(from, fromYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
    yield* swingTo(reachOf(to, toYaw, TRAVEL_HEIGHT));
    yield* moveTo(reachOf(to, toYaw), VERTICAL_SECONDS);
    held = null;
    brick.mesh.position.copy(to);
    brick.mesh.rotation.y = toYaw;
    effects.dust(to);
    effects.settle(brick.mesh);
    yield* grip(1, 0);
    yield* moveTo(reachOf(to, toYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
  }

  function looseBricks() {
    const taken = new Set(inName.values());
    return bricks.filter((brick) => !taken.has(brick));
  }

  /** Loose bricks with nothing resting on them. */
  function pickableBricks() {
    return looseBricks().filter(({ spot: { above } }) => !above || freeSpots.includes(above));
  }

  function isForLetters(brick: Brick) {
    return brick.colorName === PALETTE.letters;
  }

  /** Free spots on the floor or on top of another brick. */
  function droppableSpots() {
    return freeSpots.filter((spot) => !spot.below || !freeSpots.includes(spot.below));
  }

  /** The brick resting on this one, if any. */
  function brickOn(brick: Brick) {
    return looseBricks().find((other) => other.spot === brick.spot.above);
  }

  /** The loose brick a spot would rest on, if any. */
  function brickUnder(spot: Spot) {
    return looseBricks().find((other) => other.spot === spot.below);
  }

  function buriedReds() {
    return looseBricks().filter((brick) => {
      const cover = isForLetters(brick) && brickOn(brick);
      return cover && !isForLetters(cover);
    }).length;
  }

  /** Any loose red brick. The top one of two red bricks comes first, to avoid moving a red brick for nothing. */
  function chooseBrick() {
    const brick = randomItem(looseBricks().filter(isForLetters));
    const cover = brickOn(brick);
    return cover && isForLetters(cover) ? cover : brick;
  }

  /** Where to drop a brick. Red bricks go low and other colours high, leaving room to bury a red one when wanted. */
  function spotFor(brick: Brick, bury: boolean) {
    const spots = droppableSpots().filter((spot) => brickUnder(spot) !== brick);
    const onRed = spots.filter((spot) => {
      const under = brickUnder(spot);
      return under && isForLetters(under);
    });
    const clear = spots.filter((spot) => !onRed.includes(spot));
    if (isForLetters(brick)) {
      const low = clear.filter((spot) => spot.above);
      return randomItem(low.length > 0 ? low : clear.length > 0 ? clear : spots);
    }
    const high = clear.filter((spot) => !spot.above);
    const preferred = bury ? onRed : high.length > 0 ? high : clear;
    return randomItem(preferred.length > 0 ? preferred : spots);
  }

  function* wait(seconds: number) {
    for (let time = 0; time < seconds; time += delta) yield;
  }

  function* moveLooseBrick(brick: Brick, spot: Spot) {
    const { position, yaw } = brick.spot;
    yield* carry(brick, position, yaw, spot.position, spot.yaw);
    freeSpots = freeSpots.filter((other) => other !== spot);
    freeSpots.push(brick.spot);
    brick.spot = spot;
  }

  /** This brick's share of the moves left over, spread evenly along the name. */
  function* moveSpareBricks(slotsLeft: number, digsLeft: number, bury: boolean) {
    const moves = Math.round((movesEachWay - movesMade - slotsLeft - digsLeft) / slotsLeft);
    for (let move = 0; move < moves; move++) {
      const brick = randomItem(pickableBricks().filter((other) => !isForLetters(other)));
      yield* moveLooseBrick(brick, spotFor(brick, bury && buriedReds() < BURIED_REDS));
    }
  }

  function* build() {
    movesMade = 0;
    for (const [index, slot] of slots.entries()) {
      yield* moveSpareBricks(slots.length - index, buriedReds(), false);
      const brick = chooseBrick();
      const cover = brickOn(brick);
      if (cover) yield* moveLooseBrick(cover, spotFor(cover, false));
      inName.set(slot, brick);
      const { position, yaw } = brick.spot;
      yield* carry(brick, position, yaw, slot, 0);
      freeSpots.push(brick.spot);
    }
  }

  function* unbuild() {
    movesMade = 0;
    for (const [index, slot] of [...slots].reverse().entries()) {
      const brick = inName.get(slot);
      if (!brick) continue;
      yield* moveSpareBricks(slots.length - index, 0, true);
      const spot = spotFor(brick, false);
      freeSpots = freeSpots.filter((other) => other !== spot);
      yield* carry(brick, slot, 0, spot.position, spot.yaw);
      brick.spot = spot;
      inName.delete(slot);
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
      freeSpots = [...crew.emptySpots];
      held = null;
      at = start;
      sinceSwing = 99;
      swinging = false;
      setGrip(robot, 0);
      pose();
      script = forever(false);
    },
    /** Jumps straight to the finished name, for visitors who asked for less motion. */
    showFinished() {
      for (const slot of slots) {
        const brick = chooseBrick();
        const cover = brickOn(brick);
        if (cover) {
          const spot = spotFor(cover, false);
          freeSpots = freeSpots.filter((other) => other !== spot);
          freeSpots.push(cover.spot);
          cover.spot = spot;
          cover.mesh.position.copy(spot.position);
          cover.mesh.rotation.y = spot.yaw;
        }
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

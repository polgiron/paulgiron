import { Vector3 } from 'three/webgpu';
import { BODY, BRICK, CLAW, inFrame, MAX_REACH, restsOn, scatterPlace, takeOut } from './bricks';
import type { Brick, Crew, Spot, Yard } from './bricks';
import { rectanglesTouch } from './collisions';
import type { Effects } from './effects';
import { armPose, heldPosition, mixPose, setGrip, setPose, solveReach } from './robot';
import type { Pose, Reach, Robot } from './robot';

// A brick's height while it travels: its bottom and the fingertips clear the top of the name.
const TRAVEL_HEIGHT = 5.75;
const SWING_SECONDS = 3.2;
const VERTICAL_SECONDS = 1.4;
const GRIP_SECONDS = 0.5;
// A moment with the finished name, each time it has been built.
const NAME_HOLD_SECONDS = 8;
const EMPTY_HOLD_SECONDS = 4;
// The arm bobs upward as it stops, never down, so the bob can't reach the name.
const BOB_HEIGHT = 0.16;
const DASH_MIN_SPEED = 3.5;
const DASH_SPACING = 0.75;
// The wave: up beside the name with the claw to the ceiling, three wags of the wrist, and back. All of it stays well above the letters.
const WAVE_RAISE_SECONDS = 1.3;
const WAVE_WAG_SECONDS = 3.3;
const WAVE_LOWER_SECONDS = 1.2;
const WAVE_WAGS = 3;
// The second arm answers the first.
const WAVE_LAG_SECONDS = 0.45;
const WAVE_UPPER_LEAN = 0.5;
const WAVE_FOREARM_LEAN = 1.1;
const WAVE_HAND_LEAN = 0.18;
// How far out the raised claw is from its base, and how near the room's centre it may come, so the two arms never meet.
const WAVE_REACH = 7.25;
const WAVE_CLEARANCE = 2.1;
// The double-take: a glance at the stolen brick, back to work, then a proper look.
const LOOK_KEYS = [[0, 0], [0.4, 0.65], [0.75, 0.05], [1, 0.05], [1.35, 1], [1.95, 1], [2.3, 0]];
const LOOK_TURN = 0.42;
const LOOK_TILT = 0.4;
const LOOK_HOP = 0.3;
// A gesture a visitor cuts short fades out over this long, rather than the arm jumping.
const GESTURE_FADE_SECONDS = 0.5;
// The grab hint: an open claw comes down around a loose brick, and its back finger pushes it a little towards the viewer.
const HINT_PUSH = 0.6;
const HINT_PUSH_SECONDS = 0.6;
const HINT_HEIGHT = 0.72;
const HINT_FINGER_REACH = 0.65;
const HINT_MIN_RADIUS = 4.5;

function ease(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), high);
}

/** Where a value is along eased keys of [time, value]. */
function along(keys: number[][], time: number) {
  const next = keys.findIndex(([at]) => at > time);
  if (next <= 0) return next === 0 ? keys[0][1] : keys[keys.length - 1][1];
  const [fromTime, from] = keys[next - 1];
  const [toTime, to] = keys[next];
  return from + (to - from) * ease((time - fromTime) / (toTime - fromTime));
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Drives one robot for ever: it builds its part of the name from the bricks nearby, whatever their colour,
 * then takes it apart again, dropping the bricks in random free spots.
 * The arm only swings through the half of the circle centred on frontAngle, so it never meets the back wall.
 * Each way takes both robots the same number of moves: a smaller crew moves spare bricks around between its own.
 * Visitors can move bricks at any time, so every move is worked out from where the bricks are now. An arm uses any
 * brick it can reach, and with none in reach it waits for one, however long that takes.
 */
export function createBuilder(
  robot: Robot,
  frontAngle: number,
  crew: Crew,
  largestCrew: number,
  effects: Effects,
  yard: Yard,
  index: number,
  onNameBuilt?: () => void,
) {
  const { slots } = crew;
  const { bricks } = yard;
  const base = robot.root.position;
  const scratch = new Vector3();
  const tip = new Vector3();
  const lastTip = new Vector3();
  const travel = new Vector3();
  const across = new Vector3();
  const dashAt = new Vector3();
  const towardCamera = new Vector3(0, 0, 1);
  let movesMade = 0;
  let delta = 0;
  let held: Brick | null = null;
  let building = true;
  let gripped = 0;
  let sinceSwing = 99;
  let sinceDash = 0;
  let swinging = false;
  // A gesture is a pose laid over the arm's real one. `at` always stays where the arm is working.
  let gesturePose: Pose | null = null;
  let gestureBlend = 0;
  let gesturing = false;
  let hintDone = false;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  const reachOf = (point: Vector3, yaw: number, height = point.y): Reach => {
    let angle = Math.atan2(base.z - point.z, point.x - base.x);
    while (angle < frontAngle - Math.PI) angle += Math.PI * 2;
    while (angle >= frontAngle + Math.PI) angle -= Math.PI * 2;
    return { angle, radius: Math.hypot(point.x - base.x, point.z - base.z), height, yaw };
  };

  const start = reachOf(crew.bricks[0].spot.position, crew.bricks[0].spot.yaw, TRAVEL_HEIGHT);
  let at = start;

  function pose() {
    const bob = BOB_HEIGHT * Math.exp(-6 * sinceSwing) * ((1 - Math.cos(18 * sinceSwing)) / 2);
    const working = solveReach({ ...at, height: at.height + bob });
    setPose(robot, gesturePose && gestureBlend > 0 ? mixPose(working, gesturePose, gestureBlend) : working);
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
      gripped = from + (to - from) * ease(time / GRIP_SECONDS);
      setGrip(robot, gripped);
      yield;
    }
    gripped = to;
    setGrip(robot, to);
  }

  /** The bricks lying still: not in a visitor's hand or in a claw, and not the one about to move. */
  function standing(moving: Brick | null = null) {
    return bricks.filter((other) => other !== moving && other !== yard.grabbed && !yard.carried.has(other));
  }

  /** Whether this arm can lift a brick from here. */
  function canReach({ x, y, z }: Vector3) {
    return y < TRAVEL_HEIGHT && Math.hypot(x - base.x, z - base.z) <= MAX_REACH;
  }

  /** Whether an open claw fits around a brick here. Everything lower than its fingertips is out of its way. */
  function clawFits(position: Vector3, yaw: number, moving: Brick | null) {
    return standing(moving).every(
      ({ mesh }) =>
        mesh.position.y <= position.y - BRICK / 2 ||
        !rectanglesTouch(position, yaw, CLAW, mesh.position, mesh.rotation.y, BODY),
    );
  }

  /** The turn to take a brick by. A cube can be gripped by either pair of faces, whichever has room. */
  function gripYaw(brick: Brick) {
    const { position, rotation } = brick.mesh;
    return clawFits(position, rotation.y, brick) || !clawFits(position, rotation.y + Math.PI / 2, brick)
      ? rotation.y
      : rotation.y + Math.PI / 2;
  }

  function stand(brick: Brick, spot: Spot) {
    yard.freeSpots = yard.freeSpots.filter((other) => other !== spot);
    brick.spot = spot;
  }

  function* place(brick: Brick, to: Vector3, toYaw: number, arrive: () => void) {
    yield* swingTo(reachOf(to, toYaw, TRAVEL_HEIGHT));
    yield* moveTo(reachOf(to, toYaw), VERTICAL_SECONDS);
    held = null;
    yard.carried.delete(brick);
    yard.moves[index] = null;
    brick.mesh.position.copy(to);
    brick.mesh.rotation.y = toYaw;
    arrive();
    effects.dust(to);
    effects.settle(brick.mesh);
    yield* grip(1, 0);
    yield* moveTo(reachOf(to, toYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
  }

  function* carry(brick: Brick, to: Vector3, toYaw: number, arrive: () => void) {
    movesMade++;
    const from = brick.mesh.position.clone();
    const fromYaw = gripYaw(brick);
    yard.moves[index] = { brick, to, yaw: toYaw };
    yield* swingTo(reachOf(from, fromYaw, TRAVEL_HEIGHT));
    yield* moveTo(reachOf(from, fromYaw), VERTICAL_SECONDS);
    yield* grip(0, 1);
    held = brick;
    yard.carried.add(brick);
    takeOut(yard, brick);
    effects.dust(from);
    yield* moveTo(reachOf(from, fromYaw, TRAVEL_HEIGHT), VERTICAL_SECONDS);
    yield* place(brick, to, toYaw, arrive);
  }

  function looseBricks() {
    return bricks.filter((brick) => !brick.slot);
  }

  /** Whether this arm could set out for a brick now: nobody else has it, and it can get to whatever is on top of it. */
  function isAvailable(brick: Brick): boolean {
    if (brick === yard.grabbed || yard.carried.has(brick) || yard.moves.some((move) => move?.brick === brick)) return false;
    if (!canReach(brick.mesh.position)) return false;
    const cover = brickOn(brick);
    return !cover || isAvailable(cover);
  }

  /** Loose bricks in reach with nothing resting on them. */
  function pickableBricks() {
    return looseBricks().filter((brick) => isAvailable(brick) && !brickOn(brick));
  }

  /** Any brick, or any place the other robot is about to use, in the way of a brick standing here. */
  function isBlocked(position: Vector3, yaw: number, moving: Brick | null) {
    const clash = (y: number, other: Vector3, turn: number) =>
      Math.abs(y - position.y) < BRICK - 0.02 && rectanglesTouch(position, yaw, BODY, other, turn, BODY);
    return (
      standing(moving).some(({ mesh }) => clash(mesh.position.y, mesh.position, mesh.rotation.y)) ||
      yard.moves.some((move) => move && move.brick !== moving && clash(move.to.y, move.to, move.yaw))
    );
  }

  /** Whether something standing here has the floor or a brick under it. */
  function isSupported(position: Vector3, yaw: number, moving: Brick | null) {
    return (
      position.y < BRICK ||
      standing(moving).some(({ mesh }) => restsOn(position, yaw, mesh.position, mesh.rotation.y))
    );
  }

  /** Free spots in reach, on the floor or on top of another brick, with room left for the claw. */
  function droppableSpots(moving: Brick | null) {
    return yard.freeSpots.filter(
      ({ position, yaw }) =>
        canReach(position) &&
        isSupported(position, yaw, moving) &&
        !isBlocked(position, yaw, moving) &&
        clawFits(position, yaw, moving),
    );
  }

  /** A brick resting on this one, if any. */
  function brickOn(brick: Brick) {
    const { position, rotation } = brick.mesh;
    return standing(brick).find(({ mesh }) => restsOn(mesh.position, mesh.rotation.y, position, rotation.y));
  }

  /** A new spot on the floor, for when visitors have left none of the others usable. */
  function freshSpot(moving: Brick): Spot {
    for (let tries = 0; ; ) {
      const place = scatterPlace(crew.side, Math.random);
      if (!place) continue;
      tries++;
      if (tries > 400 || (!isBlocked(place.position, place.yaw, moving) && clawFits(place.position, place.yaw, moving))) {
        return place;
      }
    }
  }

  /** The brick standing where a slot in the name should go, if any. */
  function brickInSlot(slot: Vector3) {
    return standing().find(
      ({ mesh }) =>
        Math.abs(mesh.position.y - slot.y) < BRICK - 0.02 &&
        rectanglesTouch(slot, 0, [BRICK / 2 - 0.01, BRICK / 2 - 0.01], mesh.position, mesh.rotation.y, [BRICK / 2 - 0.01, BRICK / 2 - 0.01]),
    );
  }

  /** Where to drop a brick. */
  function spotFor(brick: Brick) {
    const spots = droppableSpots(brick);
    return spots.length > 0 ? randomItem(spots) : freshSpot(brick);
  }

  function* wait(seconds: number) {
    for (let time = 0; time < seconds; time += delta) yield;
  }

  /** Holds a pose worked out afresh each moment. It should start and end on the arm's working pose. */
  function* gesture(seconds: number, shape: (time: number) => Pose) {
    for (let time = 0; time < seconds; time += delta) {
      gesturePose = shape(time);
      gestureBlend = 1;
      gesturing = true;
      pose();
      yield;
    }
    gestureBlend = 0;
    pose();
  }

  /** A hello from up beside the finished name. The arm stays clear of the letters as it goes up and comes down again. */
  function* wave(lag: number) {
    yield* wait(lag);
    const rest = solveReach(at);
    // Round from straight at the viewer towards the name, so the wag shows side on, as far as the other arm allows.
    const turret = frontAngle - crew.side * Math.asin((Math.abs(base.x) - WAVE_CLEARANCE) / WAVE_REACH);
    // The claw is the same either way round, so it takes the shorter way to face the viewer.
    const roll = Math.round(rest.roll / Math.PI) * Math.PI;
    const wagStart = WAVE_RAISE_SECONDS * 0.7;
    const wagEnd = WAVE_RAISE_SECONDS + WAVE_WAG_SECONDS;
    yield* gesture(wagEnd + WAVE_LOWER_SECONDS, (time) => {
      const raised = ease(Math.min(time / WAVE_RAISE_SECONDS, 1));
      const lowered = ease(clamp((time - wagEnd) / WAVE_LOWER_SECONDS, 0, 1));
      const wagTime = clamp((time - wagStart) / (wagEnd - wagStart), 0, 1);
      // The wags build and fade, and the wrist follows the forearm a beat late.
      const swell = Math.sin(wagTime * Math.PI) ** 0.5;
      const beat = wagTime * WAVE_WAGS * Math.PI * 2;
      const up = armPose(
        turret + Math.sin(beat) * 0.05 * swell,
        WAVE_UPPER_LEAN + Math.sin(beat) * 0.025 * swell,
        WAVE_FOREARM_LEAN + Math.sin(beat) * 0.12 * swell,
        WAVE_HAND_LEAN + Math.sin(beat - 0.8) * 0.62 * swell,
        roll,
      );
      return mixPose(rest, up, raised * (1 - lowered));
    });
  }

  /** The arm looks round at a brick a visitor just took from under it, twice. It keeps following the brick in the hand. */
  function* doubleTake(brick: Brick) {
    const front = Math.max(Math.abs(at.angle - frontAngle), Math.PI / 2);
    yield* gesture(LOOK_KEYS[LOOK_KEYS.length - 1][0], (time) => {
      const look = along(LOOK_KEYS, time);
      const { position } = brick.mesh;
      const seen = reachOf(position, 0);
      let turn = seen.angle - at.angle;
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      // Never round to where the arm would reach the back wall.
      const angle = clamp(at.angle + clamp(turn, -LOOK_TURN, LOOK_TURN) * look, frontAngle - front, frontAngle + front);
      const looking = solveReach({ ...at, angle, height: at.height + LOOK_HOP * Math.max(look - 0.65, 0) / 0.35 });
      // A held brick has to stay level, so only an empty claw tips towards what it sees.
      if (!held) looking.wrist += Math.sign(seen.radius - at.radius) * LOOK_TILT * look;
      return looking;
    });
  }

  /** Where the hint could push this brick, if the arm has room for it there. */
  function hintPush(brick: Brick) {
    const { position, rotation } = brick.mesh;
    if (position.y > BRICK) return null;
    if (Math.hypot(position.x - base.x, position.z - base.z) < HINT_MIN_RADIUS) return null;
    const to = position.clone().setZ(position.z + HINT_PUSH);
    const inReach = canReach(to) && inFrame(to);
    if (!inReach || isBlocked(to, rotation.y, brick) || !clawFits(to, rotation.y, brick)) return null;
    // The back finger starts against the brick's back corner, the claw's front finger well past it.
    const depth = (BRICK / 2) * (Math.abs(Math.cos(rotation.y)) + Math.abs(Math.sin(rotation.y)));
    const hand = position.clone().setY(HINT_HEIGHT).setZ(position.z + HINT_FINGER_REACH - depth);
    const mid = hand.clone().setZ(hand.z + HINT_PUSH / 2);
    return clawFits(mid, 0, brick) ? { to, hand } : null;
  }

  /** Once a visit: pushes a loose brick a little towards the viewer, to show that the bricks can be moved. */
  function* grabHint() {
    if (hintDone || calm.matches) return;
    const candidates = pickableBricks()
      .map((brick) => ({ brick, push: hintPush(brick) }))
      .filter(({ push }) => push)
      .sort((a, b) => b.brick.mesh.position.z - a.brick.mesh.position.z);
    const [choice] = candidates;
    if (!choice?.push) return;
    hintDone = true;
    const { brick, push } = choice;
    const { to, hand } = push;
    const yaw = brick.mesh.rotation.y;
    yard.moves[index] = { brick, to, yaw };
    yield* swingTo(reachOf(hand, 0, TRAVEL_HEIGHT));
    yield* moveTo(reachOf(hand, 0), VERTICAL_SECONDS);
    // From here the brick already stands where it is going, and the effect only catches its mesh up.
    takeOut(yard, brick);
    stand(brick, { position: to, yaw });
    yard.moves[index] = null;
    effects.nudge(brick.mesh, to, HINT_PUSH_SECONDS);
    const pushed = hand.clone().setZ(hand.z + HINT_PUSH);
    yield* moveTo(reachOf(pushed, 0), HINT_PUSH_SECONDS);
    yield* wait(0.7);
    yield* moveTo(reachOf(pushed, 0, TRAVEL_HEIGHT), VERTICAL_SECONDS);
  }

  function* moveLooseBrick(brick: Brick, spot: Spot) {
    yield* carry(brick, spot.position, spot.yaw, () => stand(brick, spot));
  }

  /** This brick's share of the moves left over, spread evenly along the name. */
  function* moveSpareBricks(slotsLeft: number) {
    const moves = Math.round((largestCrew - movesMade - slotsLeft) / slotsLeft);
    for (let move = 0; move < moves; move++) {
      const spare = pickableBricks();
      if (spare.length === 0) return;
      const brick = randomItem(spare);
      yield* moveLooseBrick(brick, spotFor(brick));
    }
  }

  /** Clears whatever rests on a brick, top first, waiting out any the arm can't have for now. */
  function* uncover(brick: Brick): Generator<void, void, void> {
    for (let cover = brickOn(brick); cover; cover = brickOn(brick)) {
      if (!isAvailable(cover)) {
        yield;
        continue;
      }
      yield* uncover(cover);
      if (brickOn(cover) || !isAvailable(cover)) continue;
      yield* moveLooseBrick(cover, spotFor(cover));
    }
  }

  function brickInName(slot: Vector3) {
    return bricks.find((brick) => brick.slot === slot);
  }

  function emptySlots() {
    return slots.filter((slot) => !brickInName(slot));
  }

  function fullSlots() {
    return slots.filter(brickInName);
  }

  function* build() {
    for (let [slot] = emptySlots(); slot; [slot] = emptySlots()) {
      // Nothing to build with, for now. The arm waits for a visitor or the other arm to change that.
      if (pickableBricks().length === 0) {
        yield;
        continue;
      }
      yield* moveSpareBricks(emptySlots().length);
      if (brickInName(slot)) continue;
      const inTheWay = brickInSlot(slot);
      if (inTheWay) {
        if (!isAvailable(inTheWay)) {
          yield;
          continue;
        }
        yield* uncover(inTheWay);
        if (!brickOn(inTheWay) && isAvailable(inTheWay)) yield* moveLooseBrick(inTheWay, spotFor(inTheWay));
        continue;
      }
      const spare = pickableBricks();
      if (spare.length === 0) continue;
      const brick = randomItem(spare);
      const target = slot;
      yield* carry(brick, target, 0, () => {
        brick.slot = target;
      });
      if (index === 0) yield* grabHint();
    }
  }

  function* unbuild() {
    for (let slot = fullSlots().at(-1); slot; slot = fullSlots().at(-1)) {
      const brick = brickInName(slot);
      if (!brick) continue;
      yield* moveSpareBricks(fullSlots().length);
      if (brick.slot !== slot) continue;
      yield* uncover(brick);
      if (brick.slot !== slot || brickOn(brick)) {
        yield;
        continue;
      }
      yield* moveLooseBrick(brick, spotFor(brick));
    }
  }

  /** Waits for the other robot to finish this stretch too, as a visitor may have set it back. */
  function* meet() {
    yard.legs[index]++;
    movesMade = 0;
    while (yard.legs[1 - index] < yard.legs[index]) yield;
  }

  function* forever(holdFirst = false): Generator<void, void, void> {
    if (holdFirst) yield* wait(NAME_HOLD_SECONDS);
    while (true) {
      if (building) {
        yield* build();
        yield* meet();
        building = false;
        if (calm.matches) {
          yield* wait(NAME_HOLD_SECONDS);
          continue;
        }
        if (index === 0) onNameBuilt?.();
        const lag = index * WAVE_LAG_SECONDS;
        yield* wave(lag);
        yield* wait(NAME_HOLD_SECONDS - lag - WAVE_RAISE_SECONDS - WAVE_WAG_SECONDS - WAVE_LOWER_SECONDS);
      } else {
        yield* unbuild();
        yield* meet();
        building = true;
        yield* wait(EMPTY_HOLD_SECONDS);
      }
    }
  }
  let script = forever();

  /** Drops the move under way after a visitor upset it: lets go or puts down what it holds, then plans afresh. */
  function* recover(stolen: Brick | null = null): Generator<void, void, void> {
    yard.moves[index] = null;
    swinging = false;
    if (!held && gripped > 0) yield* grip(gripped, 0);
    if (at.height < TRAVEL_HEIGHT) yield* moveTo({ ...at, height: TRAVEL_HEIGHT }, VERTICAL_SECONDS);
    if (stolen && !calm.matches) yield* doubleTake(stolen);
    if (held) {
      const brick = held;
      const spot = spotFor(brick);
      yard.moves[index] = { brick, to: spot.position, yaw: spot.yaw };
      yield* place(brick, spot.position, spot.yaw, () => stand(brick, spot));
    }
    yield* forever();
  }

  return {
    update(seconds: number) {
      delta = seconds;
      gesturing = false;
      script.next();
      // Whatever replaced a gesture part way through, the arm eases back from it.
      if (!gesturing && gestureBlend > 0) {
        gestureBlend = Math.max(gestureBlend - seconds / GESTURE_FADE_SECONDS, 0);
        pose();
      }
    },
    /** A visitor has picked a brick up, maybe the one this arm was going for or meaning to stand on. */
    taken(brick: Brick) {
      const move = yard.moves[index];
      if (!move) return;
      const { position, rotation } = brick.mesh;
      if ((!held && move.brick === brick) || restsOn(move.to, move.yaw, position, rotation.y)) script = recover(brick);
    },
    /** A visitor's brick has landed, maybe on what this arm was going for or where it was going. */
    moved(brick: Brick) {
      const move = yard.moves[index];
      if (!move) return;
      const { position, rotation } = brick.mesh;
      const covers = !held && restsOn(position, rotation.y, move.brick.mesh.position, move.brick.mesh.rotation.y);
      const inTheWay =
        Math.abs(position.y - move.to.y) < BRICK - 0.02 &&
        rectanglesTouch(move.to, move.yaw, BODY, position, rotation.y, BODY);
      if (covers || inTheWay) script = recover();
    },
    /** Back to the opening, with the arm over its first brick. */
    reset() {
      held = null;
      building = true;
      gripped = 0;
      movesMade = 0;
      at = start;
      sinceSwing = 99;
      swinging = false;
      gestureBlend = 0;
      setGrip(robot, 0);
      pose();
      script = forever();
    },
    /** Jumps straight to the finished name, for visitors who asked for less motion. */
    showFinished() {
      for (const slot of slots) {
        const spare = pickableBricks();
        if (spare.length === 0) break;
        const brick = randomItem(spare);
        takeOut(yard, brick);
        brick.slot = slot;
        brick.mesh.position.copy(slot);
        brick.mesh.rotation.y = 0;
      }
      at = reachOf(slots[slots.length - 1], 0, TRAVEL_HEIGHT);
      gestureBlend = 0;
      pose();
      building = false;
      yard.legs[index] = 1;
      script = forever(true);
    },
  };
}

export type Builder = ReturnType<typeof createBuilder>;

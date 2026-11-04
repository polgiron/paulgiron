import { BoxGeometry, Mesh, MeshToonNodeMaterial, Vector3 } from 'three/webgpu';
import type { Scene } from 'three/webgpu';
import { rectanglesTouch } from './collisions';
import { PALETTE } from './palette';

export const BRICK = 0.9;
const GAP = 0.03;

const LETTERS = {
  P: ['###', '#.#', '###', '#..', '#..'],
  A: ['###', '#.#', '###', '#.#', '#.#'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
};
// What the robots build: any letters from above, split between the two arms.
const NAME = ['H', 'I'] as const;
const LETTER_GAP = 1;
const LOOSE_BRICKS = 30;
// Spots left empty, so that an arm always has somewhere to put a brick it needs out of the way.
const EMPTY_SPOTS = 2;
// Half sizes on the floor: a brick, and the space its claw needs along the brick's front and back.
export const BODY = [0.48, 0.48] as const;
export const CLAW = [0.2, 1.04] as const;
// A brick's foot, just short of the brick, so that neighbours side by side don't count as touching.
const FOOT = [0.44, 0.44] as const;
// How far an arm reaches: far enough to lift a brick to its travel height from there.
export const MAX_REACH = 8.6;

// Standing behind the name, each arm reaches a brick from behind and never crosses another letter.
const ROBOT_X = 8;
const ROBOT_Z = -3.6;
// On a tall screen the arms stand closer, with piles spread out in front of them, to use depth rather than width.
// Their bricks start just out of the other arm's reach, so the arms still never cross.
const TALL_ROBOT_X = 6;
const TALL_ROBOT_Z = -2.6;
const TALL_INNER_X = 2.7;
const TALL_OUTER_X = 8.7;
const TALL_NEAR_Z = 7;
const TALL_LEAST_REACH = 2.6;
// The name, the room a claw needs around it, and in front of it, so no pile stands in the way of reading it.
const NAME_CLEARANCE_X = 4.6;
const NAME_CLEARANCE_Z = 3.6;

let tall = false;

/** Picks the layout for bricks placed from now on. */
export function setTallLayout(value: boolean) {
  tall = value;
}

/** Where a robot stands in the current layout. */
export function robotBase(side: number) {
  return tall ? new Vector3(side * TALL_ROBOT_X, 0, TALL_ROBOT_Z) : new Vector3(side * ROBOT_X, 0, ROBOT_Z);
}

/** The same layout on every visit, so the composition stays the one that was checked. */
function createRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const LAYOUT_SEED = 11;

/** One plain block: a cube of solid colour, with nothing on its faces. */
function createBrickFactory() {
  const size = BRICK - GAP;
  const geometry = new BoxGeometry(size, size, size);
  const materials = new Map(PALETTE.bricks.map((name) => [name, new MeshToonNodeMaterial({ color: name })]));

  return (colorName: string) => {
    const brick = new Mesh(geometry, materials.get(colorName));
    brick.castShadow = true;
    brick.receiveShadow = true;
    return brick;
  };
}

export interface Spot {
  position: Vector3;
  yaw: number;
  /** The next spot up in a stack, as a spot with one above it can't start out free. */
  above?: Spot;
}

export interface Brick {
  mesh: Mesh;
  spot: Spot;
  firstSpot: Spot;
  /** Its place in the name, while it has one. */
  slot?: Vector3;
}

export interface Crew {
  /** Which half of the room this robot works in: -1 is left, 1 is right. */
  side: number;
  /** Where this robot's bricks go in the name, in building order. */
  slots: Vector3[];
  bricks: Brick[];
  emptySpots: Spot[];
}

/** A move a robot has set out on, until the brick is put down. */
export interface Move {
  brick: Brick;
  to: Vector3;
  yaw: number;
}

/** What the robots share: any brick belongs to whichever arm can reach it. */
export interface Yard {
  bricks: Brick[];
  freeSpots: Spot[];
  firstFreeSpots: Spot[];
  /** The brick in a visitor's hand, or falling from it. */
  grabbed: Brick | null;
  /** The bricks in a claw. */
  carried: Set<Brick>;
  /** What each robot is doing now. */
  moves: (Move | null)[];
  /** How many times each robot has finished building or unbuilding, so neither starts the next round ahead of the other. */
  legs: number[];
}

/** A brick has left where it was: its slot in the name, or its spot on the floor. */
export function takeOut(yard: Yard, brick: Brick) {
  if (brick.slot) brick.slot = undefined;
  else yard.freeSpots.push(brick.spot);
}

/** Back to the opening: every brick loose where it started. */
export function resetYard(yard: Yard) {
  for (const brick of yard.bricks) {
    brick.spot = brick.firstSpot;
    brick.slot = undefined;
    brick.mesh.position.copy(brick.spot.position);
    brick.mesh.rotation.y = brick.spot.yaw;
  }
  yard.freeSpots = [...yard.firstFreeSpots];
  yard.grabbed = null;
  yard.carried.clear();
  yard.moves.fill(null);
  yard.legs.fill(0);
}

/** Whether a brick at top sits directly on a brick at bottom. */
export function restsOn(top: Vector3, topYaw: number, bottom: Vector3, bottomYaw: number) {
  // Loose enough to still hold while a brick squashes as it lands.
  return Math.abs(top.y - bottom.y - BRICK) < 0.1 && rectanglesTouch(top, topYaw, FOOT, bottom, bottomYaw, FOOT);
}

/** A random place on the floor around a robot, or nothing if this try fell out of its reach or out of the frame. */
export function scatterPlace(side: number, random: () => number) {
  if (tall) return tallScatterPlace(side, random);
  const position = new Vector3(side * (7.7 + random() * 8), BRICK / 2, -5.1 + random() * 10.6);
  const yaw = (random() - 0.5) * 2.6;
  const reach = Math.hypot(position.x - side * ROBOT_X, position.z - ROBOT_Z);
  if (reach < 3 || reach > MAX_REACH) return null;
  // Stays inside the frame, which narrows towards the camera.
  if (Math.abs(position.x) > 15.4 - Math.max(position.z, 0) * 0.43) return null;
  return { position, yaw };
}

function tallScatterPlace(side: number, random: () => number) {
  const x = TALL_INNER_X + random() * (TALL_OUTER_X - TALL_INNER_X);
  const position = new Vector3(side * x, BRICK / 2, TALL_ROBOT_Z + random() * (TALL_NEAR_Z - TALL_ROBOT_Z));
  const yaw = (random() - 0.5) * 2.6;
  const reach = Math.hypot(x - TALL_ROBOT_X, position.z - TALL_ROBOT_Z);
  if (reach < TALL_LEAST_REACH || reach > MAX_REACH) return null;
  if (x < NAME_CLEARANCE_X && Math.abs(position.z) < NAME_CLEARANCE_Z) return null;
  // Stays inside the frame, which narrows towards the camera.
  if (x > TALL_OUTER_X - Math.max(position.z, 0) * 0.13) return null;
  return { position, yaw };
}

/** Loose bricks around a robot, some in stacks, spaced so its open claw fits around each one without touching the next. */
function scatterSpots(side: number, random: () => number) {
  const spots: Spot[] = [];
  const total = LOOSE_BRICKS + EMPTY_SPOTS;
  for (let attempt = 0; attempt < 40000 && spots.length < total; attempt++) {
    const place = scatterPlace(side, random);
    if (!place) continue;
    const { position, yaw } = place;
    // The same bricks on less floor stand in taller piles.
    const height = Math.min(tall ? 2 + Math.floor(random() * 3) : random() < 0.42 ? 2 : 1, total - spots.length);
    // Each brick in a stack sits a little askew on the one below.
    const yaws = Array.from({ length: height }, (_, level) => yaw + (level > 0 ? (random() - 0.5) * 0.5 : 0));
    const clear = spots.every((spot) =>
      yaws.every(
        (turn) =>
          !rectanglesTouch(position, turn, BODY, spot.position, spot.yaw, BODY) &&
          !rectanglesTouch(position, turn, CLAW, spot.position, spot.yaw, BODY) &&
          !rectanglesTouch(position, turn, BODY, spot.position, spot.yaw, CLAW),
      ),
    );
    if (!clear) continue;
    let below: Spot | undefined;
    yaws.forEach((turn, level) => {
      const spot: Spot = { position: position.clone().setY(BRICK * (level + 0.5)), yaw: turn };
      if (below) below.above = spot;
      spots.push(spot);
      below = spot;
    });
  }
  return spots;
}

/** A robot's bricks' places, and the spots left empty among them. */
function chooseSpots(side: number, random: () => number) {
  const spots = scatterSpots(side, random);
  const shuffled = spots
    .map((spot) => ({ spot, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ spot }) => spot);
  const emptySpots = shuffled.filter((spot) => !spot.above).slice(0, EMPTY_SPOTS);
  return { emptySpots, taken: spots.filter((spot) => !emptySpots.includes(spot)) };
}

/** Creates every brick loose on the floor, and works out where each robot's part of the name goes. */
export function addBricks(scene: Scene) {
  const makeBrick = createBrickFactory();
  const random = createRandom(LAYOUT_SEED);
  const columns = NAME.reduce((sum, letter) => sum + LETTERS[letter][0].length, 0) + LETTER_GAP * (NAME.length - 1);
  let column = -(columns - 1) / 2;

  const letters = NAME.map((letter) => {
    const rows = LETTERS[letter];
    const slots: Vector3[] = [];
    rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, cellIndex) => {
        if (cell === '#') slots.push(new Vector3((column + cellIndex) * BRICK, BRICK * (rows.length - rowIndex - 0.5), 0));
      });
    });
    column += rows[0].length + LETTER_GAP;
    return slots.sort((a, b) => a.y - b.y);
  });

  const crew = (slots: Vector3[], side: number): Crew => {
    const { emptySpots, taken } = chooseSpots(side, random);
    return {
      side,
      slots,
      emptySpots,
      bricks: taken.map((spot) => {
        const mesh = makeBrick(PALETTE.bricks[Math.floor(random() * PALETTE.bricks.length)]);
        mesh.position.copy(spot.position);
        mesh.rotation.y = spot.yaw;
        scene.add(mesh);
        return { mesh, spot, firstSpot: spot };
      }),
    };
  };

  const middle = Math.ceil(letters.length / 2);
  const left = crew(letters.slice(0, middle).flat(), -1);
  const right = crew(letters.slice(middle).reverse().flat(), 1);
  const firstFreeSpots = [...left.emptySpots, ...right.emptySpots];
  const yard: Yard = {
    bricks: [...left.bricks, ...right.bricks],
    freeSpots: [...firstFreeSpots],
    firstFreeSpots,
    grabbed: null,
    carried: new Set(),
    moves: [null, null],
    legs: [0, 0],
  };
  return { left, right, yard };
}

/** Lays the same bricks out again for the current layout, back at the opening. */
export function rearrangeYard(yard: Yard, crews: Crew[]) {
  const random = createRandom(LAYOUT_SEED);
  yard.firstFreeSpots = crews.flatMap((crew) => {
    const { emptySpots, taken } = chooseSpots(crew.side, random);
    crew.bricks.forEach((brick, index) => {
      brick.firstSpot = taken[index];
      // The draw that picked its colour, so a layout comes out the same however it was reached.
      random();
    });
    crew.emptySpots = emptySpots;
    return emptySpots;
  });
  resetYard(yard);
}

import { BoxGeometry, Mesh, MeshToonNodeMaterial, Vector3 } from 'three/webgpu';
import type { Scene } from 'three/webgpu';
import { PALETTE } from './palette';

export const BRICK = 0.9;
const GAP = 0.03;

const LETTERS = {
  P: ['###', '#.#', '###', '#..', '#..'],
  A: ['###', '#.#', '###', '#.#', '#.#'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  i: ['.#.', '...', '##.', '.#.', '###'],
};
// What the robots build: any letters from above, split between the two arms.
const NAME = ['H', 'i'] as const;
const LETTER_GAP = 1;
const LOOSE_BRICKS = 30;
// Half sizes on the floor: a brick, and the space its claw needs along the brick's front and back.
const BODY = [0.48, 0.48] as const;
const CLAW = [0.2, 1.04] as const;

// Standing behind the name, each arm reaches a brick from behind and never crosses another letter.
export const ROBOT_X = 8;
export const ROBOT_Z = -3.6;

/** The same layout on every visit, so the composition stays the one that was checked. */
function createRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

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
  /** The neighbours in a stack: nothing rests on a free spot, and nothing can rest in mid-air. */
  below?: Spot;
  above?: Spot;
}

export interface Brick {
  mesh: Mesh;
  colorName: string;
  spot: Spot;
  firstSpot: Spot;
}

export interface Crew {
  /** Where this robot's bricks go in the name, in building order. */
  slots: Vector3[];
  bricks: Brick[];
}

/** Whether two rectangles on the floor overlap, by the separating axis test. */
function rectanglesTouch(
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

/** Loose bricks around a robot, some in stacks, spaced so its open claw fits around each one without touching the next. */
function scatterSpots(side: number, random: () => number) {
  const spots: Spot[] = [];
  for (let attempt = 0; attempt < 40000 && spots.length < LOOSE_BRICKS; attempt++) {
    const position = new Vector3(side * (7.7 + random() * 8), BRICK / 2, -5.1 + random() * 10.6);
    const yaw = (random() - 0.5) * 2.6;
    const reach = Math.hypot(position.x - side * ROBOT_X, position.z - ROBOT_Z);
    if (reach < 3 || reach > 8.6) continue;
    // Stays inside the frame, which narrows towards the camera.
    if (Math.abs(position.x) > 15.4 - Math.max(position.z, 0) * 0.43) continue;
    const roll = random();
    const height = Math.min(roll < 0.12 ? 3 : roll < 0.42 ? 2 : 1, LOOSE_BRICKS - spots.length);
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
      const spot: Spot = { position: position.clone().setY(BRICK * (level + 0.5)), yaw: turn, below };
      if (below) below.above = spot;
      spots.push(spot);
      below = spot;
    });
  }
  return spots;
}

/** Creates every brick loose on the floor, and works out where each robot's part of the name goes. */
export function addBricks(scene: Scene) {
  const makeBrick = createBrickFactory();
  const random = createRandom(11);
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

  const crew = (slots: Vector3[], side: number): Crew => ({
    slots,
    bricks: scatterSpots(side, random).map((spot) => {
      const colorName = PALETTE.bricks[Math.floor(random() * PALETTE.bricks.length)];
      const mesh = makeBrick(colorName);
      mesh.position.copy(spot.position);
      mesh.rotation.y = spot.yaw;
      scene.add(mesh);
      return { mesh, colorName, spot, firstSpot: spot };
    }),
  });

  const middle = Math.ceil(letters.length / 2);
  return { left: crew(letters.slice(0, middle).flat(), -1), right: crew(letters.slice(middle).reverse().flat(), 1) };
}

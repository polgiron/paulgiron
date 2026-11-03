import { Color, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshToonNodeMaterial, Shape, Vector3 } from 'three/webgpu';
import type { Scene } from 'three/webgpu';
import { PALETTE } from './palette';

export const BRICK = 0.9;
const GAP = 0.03;

const LETTERS = {
  P: ['###', '#.#', '###', '#..', '#..'],
  A: ['###', '#.#', '###', '#.#', '#.#'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
};
const NAME = ['P', 'A', 'U', 'L'] as const;
const LETTER_GAP = 1;
const LOOSE_BRICKS = 30;
// Half sizes on the floor: a brick, and the space its claw needs along the brick's front and back.
const BODY = [0.48, 0.48] as const;
const CLAW = [0.2, 1.04] as const;

// Standing behind the name, each arm reaches a brick from behind and never crosses another letter.
export const ROBOT_X = 8;
export const ROBOT_Z = -3.6;

function brickGeometry() {
  const size = BRICK - GAP;
  const chamfer = 0.05;
  const half = size / 2 - chamfer;
  const shape = new Shape();
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: size - chamfer * 2,
    bevelEnabled: true,
    bevelSize: chamfer,
    bevelThickness: chamfer,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -(size - chamfer * 2) / 2);
  return geometry;
}

/** The same layout on every visit, so the composition stays the one that was checked. */
function createRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** One toy block: a chamfered cube with a round socket on its face. */
function createBrickFactory() {
  const geometry = brickGeometry();
  const socket = new CylinderGeometry(BRICK * 0.25, BRICK * 0.25, 0.04, 20);
  socket.rotateX(Math.PI / 2);
  const hole = new CylinderGeometry(BRICK * 0.12, BRICK * 0.12, 0.06, 16);
  hole.rotateX(Math.PI / 2);
  const materials = new Map(PALETTE.bricks.map((name) => [name, new MeshToonNodeMaterial({ color: name })]));
  const holeMaterials = new Map(
    PALETTE.bricks.map((name) => [name, new MeshToonNodeMaterial({ color: new Color(name).multiplyScalar(0.62) })]),
  );

  return (colorName: string) => {
    const material = materials.get(colorName);
    const brick = new Group();
    const body = new Mesh(geometry, material);
    body.castShadow = true;
    body.receiveShadow = true;
    brick.add(body);
    const ring = new Mesh(socket, material);
    ring.position.z = BRICK / 2;
    brick.add(ring);
    const center = new Mesh(hole, holeMaterials.get(colorName));
    center.position.z = BRICK / 2;
    brick.add(center);
    return brick;
  };
}

export interface Spot {
  position: Vector3;
  yaw: number;
}

export interface Brick {
  mesh: Group;
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

/** Loose bricks around a robot, spaced so its open claw fits around each one without touching the next. */
function scatterSpots(side: number, random: () => number) {
  const spots: Spot[] = [];
  for (let attempt = 0; attempt < 40000 && spots.length < LOOSE_BRICKS; attempt++) {
    const position = new Vector3(side * (7.7 + random() * 8), BRICK / 2, -5.1 + random() * 10.6);
    const yaw = (random() - 0.5) * 2.6;
    const reach = Math.hypot(position.x - side * ROBOT_X, position.z - ROBOT_Z);
    if (reach < 3 || reach > 8.6) continue;
    // Stays inside the frame, which narrows towards the camera.
    if (Math.abs(position.x) > 15.4 - Math.max(position.z, 0) * 0.43) continue;
    const clear = spots.every(
      (spot) =>
        !rectanglesTouch(position, yaw, BODY, spot.position, spot.yaw, BODY) &&
        !rectanglesTouch(position, yaw, CLAW, spot.position, spot.yaw, BODY) &&
        !rectanglesTouch(position, yaw, BODY, spot.position, spot.yaw, CLAW),
    );
    if (clear) spots.push({ position, yaw });
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

  const [p, a, u, l] = letters;
  return { left: crew([...p, ...a], -1), right: crew([...l, ...u], 1) };
}

import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshToonNodeMaterial,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three/webgpu';
import { BRICK } from './bricks';
import { PALETTE } from './palette';

export const SHOULDER_HEIGHT = 2.2;
export const UPPER_ARM = 5.2;
export const FOREARM = 5;
const BASE_HEIGHT = 0.55;
const ROLL_OFFSET = 0.55;
const FINGER_OPEN = BRICK / 2 + 0.2;
const FINGER_CLOSED = BRICK / 2 + 0.07;
// How far past the roll joint a gripped brick's centre sits.
const HOLD = 1.02;

const body = new MeshToonNodeMaterial({ color: PALETTE.robot });
const trim = new MeshToonNodeMaterial({ color: PALETTE.robotRod });
const dark = new MeshToonNodeMaterial({ color: PALETTE.robotDark });

/** Rounds an extruded shape by blending normals across soft edges, keeping flat faces flat. */
function smooth(geometry: BufferGeometry, crease = Math.PI / 4) {
  const position = geometry.getAttribute('position');
  const faces: Vector3[] = [];
  const shared = new Map<string, number[]>();
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  const key = (index: number) =>
    `${Math.round(position.getX(index) * 1e4)},${Math.round(position.getY(index) * 1e4)},${Math.round(position.getZ(index) * 1e4)}`;

  for (let face = 0; face < position.count / 3; face++) {
    a.fromBufferAttribute(position, face * 3);
    b.fromBufferAttribute(position, face * 3 + 1);
    c.fromBufferAttribute(position, face * 3 + 2);
    // Its length is twice the area, so large flat faces outweigh the small bevel faces.
    faces.push(b.clone().sub(a).cross(c.clone().sub(a)));
    for (let corner = 0; corner < 3; corner++) {
      const id = key(face * 3 + corner);
      const list = shared.get(id);
      if (list) list.push(face);
      else shared.set(id, [face]);
    }
  }

  const normals = new Float32Array(position.count * 3);
  const sum = new Vector3();
  for (let index = 0; index < position.count; index++) {
    const own = faces[Math.floor(index / 3)];
    sum.set(0, 0, 0);
    for (const face of shared.get(key(index)) ?? []) {
      if (own.lengthSq() > 0 && faces[face].lengthSq() > 0 && own.angleTo(faces[face]) < crease) sum.add(faces[face]);
    }
    sum.normalize();
    normals.set([sum.x, sum.y, sum.z], index * 3);
  }
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  return geometry;
}

/** A soft link: two circles joined by their tangents, extruded with a rounded edge. It runs up from the origin. */
function link(startRadius: number, endRadius: number, length: number, depth: number, edge = 0.12) {
  const r1 = startRadius - edge;
  const r2 = endRadius - edge;
  const tangent = Math.asin((r1 - r2) / length);
  const shape = new Shape();
  shape.absarc(0, 0, r1, Math.PI - tangent, Math.PI * 2 + tangent, false);
  shape.absarc(0, length, r2, tangent, Math.PI - tangent, false);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - edge * 2,
    bevelEnabled: true,
    bevelSize: edge,
    bevelThickness: edge,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -(depth - edge * 2) / 2);
  return smooth(geometry);
}

/** A disc with a rounded rim, centred on the origin. Its axis is y, or z for the joint caps. */
function drum(radius: number, height: number, edge = 0.05, axis: 'y' | 'z' = 'y') {
  const points = [new Vector2(0, 0)];
  for (let step = 0; step <= 4; step++) {
    const angle = (step / 4) * (Math.PI / 2);
    points.push(new Vector2(radius - edge + Math.sin(angle) * edge, edge - Math.cos(angle) * edge));
  }
  for (let step = 0; step <= 4; step++) {
    const angle = (step / 4) * (Math.PI / 2);
    points.push(new Vector2(radius - edge + Math.cos(angle) * edge, height - edge + Math.sin(angle) * edge));
  }
  points.push(new Vector2(0, height));
  const geometry = new LatheGeometry(points, 40);
  geometry.translate(0, -height / 2, 0);
  if (axis === 'z') geometry.rotateX(Math.PI / 2);
  return geometry;
}

function taperedTube(startRadius: number, endRadius: number, length: number) {
  return new LatheGeometry([new Vector2(startRadius, 0), new Vector2(endRadius, length)], 32);
}

function add(parent: Group, geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function group(parent: Group, y = 0) {
  const joint = new Group();
  joint.position.y = y;
  parent.add(joint);
  return joint;
}

/** The concentric cover over a joint, on both faces of a link. */
function jointCaps(parent: Group, y: number, halfDepth: number, radius: number) {
  const outer = drum(radius, 0.1, 0.04, 'z');
  const inner = drum(radius * 0.55, 0.06, 0.025, 'z');
  for (const side of [-1, 1]) {
    add(parent, outer, body, 0, y, side * (halfDepth + 0.02));
    add(parent, inner, body, 0, y, side * (halfDepth + 0.08));
  }
}

function cables(parent: Group) {
  for (const z of [-0.14, 0, 0.14]) {
    const curve = new CatmullRomCurve3([
      new Vector3(-0.35, -0.55, z),
      new Vector3(-0.95, 0.2, z),
      new Vector3(-0.98, 1.6, z),
      new Vector3(-0.82, 3.4, z),
      new Vector3(-0.92 + z, UPPER_ARM - 0.5, z),
      new Vector3(-0.72 + z, UPPER_ARM + 0.32, z),
      new Vector3(-0.2, UPPER_ARM + 0.45, z),
    ]);
    add(parent, new TubeGeometry(curve, 60, 0.05, 8), dark);
  }
}

export interface Pose {
  turret: number;
  shoulder: number;
  elbow: number;
  wrist: number;
  roll: number;
}

/** A six-axis factory arm. Every link hangs from the previous one, so a pose is just five angles. */
export function createRobot() {
  const root = new Group();

  add(root, drum(1.55, 0.28, 0.08), dark, 0, 0.14);
  add(root, drum(1.15, 0.27, 0.07), body, 0, 0.415);

  const turret = group(root, BASE_HEIGHT);
  const shoulderLocal = SHOULDER_HEIGHT - BASE_HEIGHT;
  add(turret, drum(1, 0.26, 0.09), body, 0, 0.13);
  add(turret, link(0.8, 0.86, shoulderLocal - 0.55, 0.5), body, 0, 0.55, -0.72);
  add(turret, drum(0.74, 0.5, 0.12, 'z'), body, 0, shoulderLocal, -1.2);
  add(turret, drum(0.42, 0.06, 0.025, 'z'), trim, 0, shoulderLocal, -1.47);

  const shoulder = group(turret, shoulderLocal);
  add(shoulder, link(0.82, 0.6, UPPER_ARM, 0.9, 0.14), body);
  jointCaps(shoulder, 0, 0.45, 0.58);
  jointCaps(shoulder, UPPER_ARM, 0.45, 0.42);
  cables(shoulder);

  const elbow = group(shoulder, UPPER_ARM);
  add(elbow, link(0.58, 0.42, 1.45, 0.72), body);
  add(elbow, drum(0.42, 0.08, 0.025), trim, 0, 1.62);
  add(elbow, taperedTube(0.36, 0.31, FOREARM - 3.05), body, 0, 1.65);
  add(elbow, drum(0.38, 0.08, 0.025), trim, 0, FOREARM - 1.38);
  add(elbow, link(0.47, 0.5, 1.3, 0.62), body, 0, FOREARM - 1.3);
  jointCaps(elbow, FOREARM - 1.3, 0.31, 0.32);
  jointCaps(elbow, FOREARM, 0.31, 0.34);

  const wrist = group(elbow, FOREARM);
  add(wrist, drum(0.4, 0.36, 0.1), body, 0, 0.3);
  add(wrist, drum(0.31, 0.14, 0.03), trim, 0, 0.5);

  const roll = group(wrist, ROLL_OFFSET);
  add(roll, drum(0.4, 0.14, 0.04), dark, 0, 0.09);
  const palmLength = FINGER_OPEN * 2;
  const palm = add(roll, link(0.2, 0.2, palmLength, 0.46, 0.06), dark, -palmLength / 2, 0.34);
  palm.rotation.z = -Math.PI / 2;

  const fingers = [-1, 1].map((side) => {
    const finger = group(roll, 0.4);
    // A claw: out to a knuckle, then back in to the tip that touches the brick.
    const knuckle = add(finger, link(0.12, 0.1, 0.5, 0.34, 0.05), dark);
    knuckle.rotation.z = side * -0.5;
    const tip = add(finger, link(0.1, 0.07, 0.56, 0.34, 0.05), dark, side * 0.24, 0.44);
    tip.rotation.z = side * 0.42;
    return finger;
  });

  return { root, turret, shoulder, elbow, wrist, roll, fingers };
}

export type Robot = ReturnType<typeof createRobot>;

export function setPose(robot: Robot, pose: Pose) {
  robot.turret.rotation.y = pose.turret;
  robot.shoulder.rotation.z = pose.shoulder;
  robot.elbow.rotation.z = pose.elbow;
  robot.wrist.rotation.z = pose.wrist;
  robot.roll.rotation.y = pose.roll;
}

/** Where a gripped brick's centre would be, around the robot's base. */
export interface Reach {
  angle: number;
  radius: number;
  height: number;
  /** The brick's turn on the floor. The claw turns with it, to close on its front and back faces. */
  yaw: number;
}

/** Solves the arm for a brick held straight down. */
export function solveReach({ angle, radius, height, yaw }: Reach): Pose {
  const up = height + ROLL_OFFSET + HOLD - SHOULDER_HEIGHT;
  const distance = Math.min(Math.hypot(radius, up), UPPER_ARM + FOREARM - 0.01);
  const lean = Math.atan2(radius, up);
  const upperAngle =
    lean - Math.acos((UPPER_ARM ** 2 + distance ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * distance));
  const forearmAngle =
    lean + Math.acos((FOREARM ** 2 + distance ** 2 - UPPER_ARM ** 2) / (2 * FOREARM * distance));
  return {
    turret: angle,
    shoulder: -upperAngle,
    elbow: upperAngle - forearmAngle,
    wrist: forearmAngle - Math.PI,
    roll: angle + Math.PI / 2 - yaw,
  };
}

/** 0 is wide open, 1 is closed on a brick. */
export function setGrip(robot: Robot, closed: number) {
  const reach = FINGER_OPEN + (FINGER_CLOSED - FINGER_OPEN) * closed;
  robot.fingers[0].position.x = -reach;
  robot.fingers[1].position.x = reach;
}

export function heldPosition(robot: Robot, target: Vector3) {
  robot.root.updateWorldMatrix(true, true);
  return robot.roll.localToWorld(target.set(0, HOLD, 0));
}

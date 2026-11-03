import { Mesh, MeshToonNodeMaterial, PlaneGeometry } from 'three/webgpu';
import type { Scene } from 'three/webgpu';
import { PALETTE } from './palette';

const BACK_WALL = -6;
const SIDE_WALL = 17.5;
const SIZE = 800;

function surface(colorName: string) {
  const mesh = new Mesh(new PlaneGeometry(SIZE, SIZE), new MeshToonNodeMaterial({ color: colorName }));
  mesh.receiveShadow = true;
  return mesh;
}

export function addRoom(scene: Scene) {
  const floor = surface(PALETTE.floor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const back = surface(PALETTE.wall);
  back.position.z = BACK_WALL;
  scene.add(back);

  const left = surface(PALETTE.wall);
  left.position.x = -SIDE_WALL;
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  const right = surface(PALETTE.wall);
  right.position.x = SIDE_WALL;
  right.rotation.y = -Math.PI / 2;
  scene.add(right);
}

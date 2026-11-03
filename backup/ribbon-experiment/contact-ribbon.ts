import { BufferAttribute, BufferGeometry, Mesh, Vector3 } from 'three/webgpu';
import { satinMaterial } from './ribbon';

const ALONG = 28;
const ACROSS = 4;
const RING = ACROSS + 1;
const NOTCH = 0.25;
const NOTCH_HOVER = 0.38;
const STITCHES_PER_HEIGHT = 2.6;

/** The Contact button's body: a short cut length of the same satin, lit in the same room. */
export class ContactRibbon {
  readonly mesh: Mesh;

  private positions = new Float32Array((ALONG + 1) * RING * 3);
  private normals = new Float32Array((ALONG + 1) * RING * 3);
  private width = 1;
  private height = 1;
  private hover = 0;
  private hovering = false;

  constructor(
    private link: HTMLElement,
    lightDirection: Vector3,
  ) {
    const count = (ALONG + 1) * RING;
    const threads = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const indices: number[] = [];
    for (let i = 0; i <= ALONG; i++) {
      for (let j = 0; j < RING; j++) {
        const vertex = i * RING + j;
        threads[vertex * 3] = 1;
        uvs[vertex * 2] = j / ACROSS;
        if (i < ALONG && j < ACROSS) {
          indices.push(vertex, vertex + RING, vertex + 1, vertex + 1, vertex + RING, vertex + RING + 1);
        }
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(this.normals, 3));
    geometry.setAttribute('aThread', new BufferAttribute(threads, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    this.mesh = new Mesh(
      geometry,
      satinMaterial(lightDirection, { face: '#ffd622', back: '#d9a520', thread: '#ffe98a', sheen: '#fff2b8' }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;

    link.addEventListener('pointerenter', () => (this.hovering = true));
    link.addEventListener('pointerleave', () => (this.hovering = false));
    link.addEventListener('focus', () => (this.hovering = true));
    link.addEventListener('blur', () => (this.hovering = false));
  }

  /** Lines the mesh up with the link, which keeps the layout and takes the clicks. */
  fit(viewWidth: number, viewHeight: number) {
    const box = this.link.getBoundingClientRect();
    const unitX = viewWidth / window.innerWidth;
    const unitY = viewHeight / window.innerHeight;
    this.width = box.width * unitX;
    this.height = box.height * unitY;
    this.mesh.position.x = (box.left + box.width / 2 - window.innerWidth / 2) * unitX;
    this.mesh.position.y = (window.innerHeight / 2 - box.top - box.height / 2) * unitY;

    const uv = this.mesh.geometry.attributes.uv;
    const stitches = (this.width / this.height) * STITCHES_PER_HEIGHT * 2;
    for (let i = 0; i <= ALONG; i++) {
      for (let j = 0; j < RING; j++) uv.setY(i * RING + j, (i / ALONG) * stitches);
    }
    uv.needsUpdate = true;
  }

  update(time: number, moving: boolean) {
    const { width, height, positions, normals } = this;
    const halfHeight = height / 2;
    this.hover += ((this.hovering && moving ? 1 : 0) - this.hover) * 0.12;
    const notch = height * (NOTCH + (NOTCH_HOVER - NOTCH) * this.hover);
    const flutter = height * (0.05 + 0.05 * this.hover);
    this.mesh.rotation.z = -0.026 * this.hover;
    this.mesh.position.z = height * 0.06 * this.hover;

    for (let i = 0; i <= ALONG; i++) {
      const u = i / ALONG;
      const phase = u * 7 + (moving ? time * 1.3 : 0);
      const z = flutter * (Math.sin(phase) + 0.45 * Math.sin(phase * 1.9 + 1)) * (0.45 + Math.abs(u - 0.5));
      const slope = (flutter * 7 * (Math.cos(phase) + 0.855 * Math.cos(phase * 1.9 + 1))) / width;
      const normalLength = Math.hypot(slope, 1);
      for (let j = 0; j < RING; j++) {
        const v = (j / ACROSS) * 2 - 1;
        const cut = notch * (1 - Math.abs(v));
        const left = -width / 2 + cut;
        const right = width / 2 - cut;
        const vertex = (i * RING + j) * 3;
        positions[vertex] = left + (right - left) * u;
        positions[vertex + 1] = v * halfHeight;
        positions[vertex + 2] = z;
        normals[vertex] = -slope / normalLength;
        normals[vertex + 1] = 0;
        normals[vertex + 2] = 1 / normalLength;
      }
    }
    const geometry = this.mesh.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  }
}

import {
  BackSide,
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardNodeMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGPURenderer,
} from 'three/webgpu';
import { color, distance, dot, float, fract, mix, screenCoordinate, screenUV, sin, smoothstep, vec2 } from 'three/tsl';
import { ContactRibbon } from './contact-ribbon';
import { Ribbon, RIBBON_POINTS } from './ribbon';
import { layoutSignature } from './signature';

const WALL = '#1a4ad0';
const CAMERA_DISTANCE = 12;
const FIELD_OF_VIEW = 30;

function softRoom() {
  const room = new Scene();
  room.add(new Mesh(new BoxGeometry(20, 20, 20), new MeshBasicMaterial({ color: '#2a39b8', side: BackSide })));
  const panel = (hex: string, width: number, height: number, x: number, y: number, z: number, strength: number) => {
    const mesh = new Mesh(
      new PlaneGeometry(width, height),
      new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(strength) }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel('#fff1e6', 9, 3, -5, 7, 6, 7);
  panel('#ffd2bf', 2, 10, 8, 0, 5, 3);
  return room;
}

export async function startScene(canvas: HTMLCanvasElement, link: HTMLAnchorElement) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new Scene();
  scene.background = new Color(WALL);

  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);
  camera.position.z = CAMERA_DISTANCE;

  const lightDirection = new Vector3(-0.42, 0.62, 1).normalize();
  const sun = new DirectionalLight('#fff4ea', 2.3);
  sun.position.copy(lightDirection).multiplyScalar(14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 7;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.01;
  scene.add(sun);
  scene.add(new HemisphereLight('#e6e8ff', '#3a44a0', 1.45));

  const wallMaterial = new MeshStandardNodeMaterial({ roughness: 1, metalness: 0 });
  const falloff = smoothstep(0.25, 1.05, distance(screenUV, vec2(0.42, 0.42)));
  // The fine tooth of rolled paint, which also keeps the gradient from banding.
  const grain = fract(sin(dot(screenCoordinate.xy, vec2(12.9898, 78.233))).mul(43758.5453));
  const tooth = float(0.985).add(grain.mul(0.03));
  wallMaterial.colorNode = mix(color(WALL), color('#10309a'), falloff).mul(tooth);
  const wall = new Mesh(new PlaneGeometry(1, 1), wallMaterial);
  wall.receiveShadow = true;
  scene.add(wall);

  const ribbon = new Ribbon(lightDirection);
  scene.add(ribbon.mesh);

  const contact = new ContactRibbon(link, lightDirection);
  scene.add(contact.mesh);

  const renderer = new WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  await renderer.init();

  const environment = new PMREMGenerator(renderer);
  scene.environment = environment.fromScene(softRoom(), 0.05).texture;
  scene.environmentIntensity = 0.32;

  let viewWidth = 1;
  let viewHeight = 1;
  let needsRender = true;

  function resize() {
    const { innerWidth: width, innerHeight: height } = window;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    viewHeight = 2 * CAMERA_DISTANCE * Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    viewWidth = viewHeight * camera.aspect;

    const layout = layoutSignature(RIBBON_POINTS, viewWidth, viewHeight);
    ribbon.setLayout(layout);
    if (reducedMotion) ribbon.finish();

    // The wall's distance follows the lettering, so the shadow keeps its proportion.
    wall.position.z = -layout.scale * 0.6;
    wall.scale.set(viewWidth * 2, viewHeight * 2, 1);
    contact.fit(viewWidth, viewHeight);

    const shadow = sun.shadow.camera;
    shadow.left = -viewWidth * 0.8;
    shadow.right = viewWidth * 0.8;
    shadow.top = viewHeight * 0.8;
    shadow.bottom = -viewHeight * 0.8;
    shadow.far = 40;
    shadow.updateProjectionMatrix();
    needsRender = true;
  }

  window.addEventListener('resize', resize);
  resize();

  // The label can change length.
  new ResizeObserver(() => {
    contact.fit(viewWidth, viewHeight);
    needsRender = true;
  }).observe(link);

  if (reducedMotion) {
    ribbon.finish();
  } else {
    ribbon.write();

    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    const toWorld = (event: PointerEvent) => ({
      x: (event.clientX / window.innerWidth - 0.5) * viewWidth,
      y: (0.5 - event.clientY / window.innerHeight) * viewHeight,
    });
    const isControl = (event: Event) => event.target instanceof Element && event.target.closest('a') !== null;

    window.addEventListener('pointermove', (event) => {
      const { x, y } = toWorld(event);
      const elapsed = Math.max(0.004, (event.timeStamp - lastTime) / 1000);
      if (lastTime > 0 && elapsed < 0.2) ribbon.blow(x, y, (x - lastX) / elapsed, (y - lastY) / elapsed);
      lastX = x;
      lastY = y;
      lastTime = event.timeStamp;
    });
    window.addEventListener('pointerdown', (event) => {
      if (isControl(event)) return;
      const { x, y } = toWorld(event);
      lastX = x;
      lastY = y;
      lastTime = event.timeStamp;
      ribbon.burst(x, y);
    });
  }

  let previousTime = 0;
  renderer.setAnimationLoop((time) => {
    // A zero-sized window (hidden pane or iframe) has no drawing surface to render to.
    if (window.innerWidth === 0 || window.innerHeight === 0) return;
    if (reducedMotion && !needsRender) return;

    const delta = Math.min(0.25, (time - previousTime) / 1000);
    previousTime = time;
    ribbon.update(delta, !reducedMotion);
    contact.update(time / 1000, !reducedMotion);
    renderer.render(scene, camera);
    needsRender = false;
  });
}

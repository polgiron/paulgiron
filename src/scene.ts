import { AmbientLight, Color, NoToneMapping, PCFShadowMap, PerspectiveCamera, Scene, SpotLight, WebGPURenderer } from 'three/webgpu';
import { addBricks, resetYard, ROBOT_X, ROBOT_Z } from './bricks';
import { createEffects } from './effects';
import { createInkPipeline } from './ink';
import { PALETTE } from './palette';
import { createBuilder } from './builder';
import { createGrabber } from './grab';
import { createPinch } from './pinch';
import { createRobot } from './robot';
import { addRoom } from './world';

const SCENE_WIDTH = 33;

function spotlight(x: number) {
  // No decay: the pool of light keeps one flat colour, like paint.
  const spot = new SpotLight(PALETTE.spot, Math.PI * 0.17, 0, 0.36, 0.05, 0);
  spot.position.set(x, 17, 26);
  spot.target.position.set(x * 0.4, 3, -6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 10;
  spot.shadow.camera.far = 80;
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  return spot;
}

export async function startScene(canvas: HTMLCanvasElement) {
  const scene = new Scene();
  scene.background = new Color(PALETTE.wall);

  const camera = new PerspectiveCamera(30, 1, 1, 300);

  // The ambient alone is the colour of the room in the dark and of every shadow.
  scene.add(new AmbientLight(PALETTE.ambient, Math.PI * 0.76));
  for (const x of [-15, 15]) {
    const spot = spotlight(x);
    scene.add(spot, spot.target);
  }

  addRoom(scene);
  const { left, right, yard } = addBricks(scene);
  const largestCrew = Math.max(left.slots.length, right.slots.length);
  const effects = createEffects(scene);

  const crews = [
    { x: -ROBOT_X, frontAngle: -Math.PI / 2, crew: left },
    { x: ROBOT_X, frontAngle: (Math.PI * 3) / 2, crew: right },
  ];
  const workers = crews.map(({ x, frontAngle, crew }, index) => {
    const robot = createRobot();
    robot.root.position.set(x, 0, ROBOT_Z);
    scene.add(robot.root);
    return { robot, builder: createBuilder(robot, frontAngle, crew, largestCrew, effects, yard, index) };
  });
  const builders = workers.map(({ builder }) => builder);
  const grabber = createGrabber(canvas, camera, yard, workers, effects);

  // Visitors who ask for less motion get the finished name.
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (paused) for (const builder of builders) builder.showFinished();

  const renderer = new WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  await renderer.init();

  const { pipeline, pixelRatio } = createInkPipeline(renderer, scene, camera, PALETTE.ink);

  let speed = 3;
  let needsRender = true;
  // A brick let go of while paused still lands with its dust, on a clock of its own.
  let tidying = false;

  const pinch = createPinch(camera, grabber.letGo, () => {
    needsRender = true;
  });

  function resize() {
    const { innerWidth: width, innerHeight: height } = window;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;

    // Frames the room by width, so it always fits side to side.
    const halfFov = (camera.fov * Math.PI) / 360;
    const distance = SCENE_WIDTH / 2 / (Math.tan(halfFov) * camera.aspect);
    const reach = Math.max(distance, 26);
    camera.position.set(reach * 0.06, 3 + reach * 0.1, reach);
    camera.lookAt(0, 3.6, 0);
    pinch.frame();

    renderer.setSize(width, height, false);
    pixelRatio.value = renderer.getPixelRatio();
    needsRender = true;
  }
  window.addEventListener('resize', resize);
  resize();

  let previous = performance.now();
  renderer.setAnimationLoop((now) => {
    // A long gap means the tab was hidden: carry on from where it was instead of jumping.
    const elapsed = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (!paused) for (const builder of builders) builder.update(elapsed * speed);
    if (grabber.busy) {
      grabber.update(elapsed);
      tidying = true;
      needsRender = true;
    } else if (!effects.active) {
      tidying = false;
    }
    if (!paused || tidying) {
      effects.update(elapsed * speed);
      needsRender = true;
    }

    // A zero-sized window (hidden pane or iframe) has no drawing surface to render to.
    if (window.innerWidth === 0 || window.innerHeight === 0 || !needsRender) return;
    needsRender = false;
    pipeline.render();
  });

  return {
    get paused() {
      return paused;
    },
    setPaused(value: boolean) {
      paused = value;
    },
    setSpeed(value: number) {
      speed = value;
    },
    reset() {
      grabber.cancel();
      effects.clear();
      resetYard(yard);
      for (const builder of builders) builder.reset();
      needsRender = true;
    },
  };
}

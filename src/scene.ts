import { AmbientLight, Color, NoToneMapping, PCFShadowMap, PerspectiveCamera, Scene, SpotLight, Vector3, WebGPURenderer } from 'three/webgpu';
import { addBricks, rearrangeYard, resetYard, robotBase, setTallLayout } from './bricks';
import { createEffects } from './effects';
import { createInkPipeline } from './ink';
import { PALETTE } from './palette';
import { createBuilder } from './builder';
import { createGrabber } from './grab';
import { createPinch } from './pinch';
import { createRobot } from './robot';
import { addRoom } from './world';

const SCENE_WIDTH = 33;
// Narrower than this aspect, the bricks lay out in depth, in a room only this wide.
const TALL_ASPECT = 0.66;
const TALL_SCENE_WIDTH = 18;
// The view as a screen narrows from square down to tall: higher, wider and aimed at the floor in front of the name.
const SQUARE_ASPECT = 1;
const TALL_FOV = 38;
const TALL_PITCH = 0.72;
const TALL_AIM = new Vector3(0, 1.2, 2.6);
const AIM = new Vector3(0, 3.6, 0);
// The pools of light follow the bricks forward.
const LIGHT_BACK = -6;
const TALL_LIGHT_BACK = 1;
const LIGHT_ANGLE = 0.36;
const TALL_LIGHT_ANGLE = 0.44;

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function spotlight(x: number) {
  // No decay: the pool of light keeps one flat colour, like paint.
  const spot = new SpotLight(PALETTE.spot, Math.PI * 0.17, 0, LIGHT_ANGLE, 0.05, 0);
  spot.position.set(x, 17, 26);
  spot.target.position.set(x * 0.4, 3, LIGHT_BACK);
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
  const spots = [-15, 15].map(spotlight);
  for (const spot of spots) scene.add(spot, spot.target);

  addRoom(scene);
  let tall = window.innerWidth / window.innerHeight < TALL_ASPECT;
  setTallLayout(tall);
  const { left, right, yard } = addBricks(scene);
  const largestCrew = Math.max(left.slots.length, right.slots.length);
  const effects = createEffects(scene);

  const crews = [
    { frontAngle: -Math.PI / 2, crew: left },
    { frontAngle: (Math.PI * 3) / 2, crew: right },
  ];
  const workers = crews.map(({ frontAngle, crew }, index) => {
    const robot = createRobot();
    robot.root.position.copy(robotBase(crew.side));
    scene.add(robot.root);
    return { robot, side: crew.side, builder: createBuilder(robot, frontAngle, crew, largestCrew, effects, yard, index) };
  });
  const builders = workers.map(({ builder }) => builder);
  const grabber = createGrabber(canvas, camera, yard, workers, effects);

  // Visitors who ask for less motion get the finished name.
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = calm;
  if (calm) for (const builder of builders) builder.showFinished();

  const renderer = new WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  await renderer.init();

  const { pipeline, setScale } = createInkPipeline(renderer, scene, camera, PALETTE.ink);

  let speed = 3;
  let needsRender = true;
  // A brick let go of while paused still lands with its dust, on a clock of its own.
  let tidying = false;

  const pinch = createPinch(camera, grabber.letGo, () => {
    needsRender = true;
  });

  /** Crossing into or out of tall starts the name over in the other layout, as bricks can't walk there. */
  function layOut(nowTall: boolean) {
    tall = nowTall;
    setTallLayout(tall);
    for (const { robot, side } of workers) robot.root.position.copy(robotBase(side));
    grabber.cancel();
    effects.clear();
    rearrangeYard(yard, [left, right]);
    for (const builder of builders) {
      builder.reset();
      if (calm) builder.showFinished();
    }
  }

  function resize() {
    const { innerWidth: width, innerHeight: height } = window;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    if (camera.aspect < TALL_ASPECT !== tall) layOut(!tall);

    // 0 from square up, so landscape keeps the one view it was composed for; 1 once the screen is tall.
    const t = Math.max(0, Math.min(1, (SQUARE_ASPECT - camera.aspect) / (SQUARE_ASPECT - TALL_ASPECT)));
    camera.fov = lerp(30, TALL_FOV, t);

    // Frames the room by width, so it always fits side to side.
    const halfFov = (camera.fov * Math.PI) / 360;
    const distance = (tall ? TALL_SCENE_WIDTH : SCENE_WIDTH) / 2 / (Math.tan(halfFov) * camera.aspect);
    const reach = Math.max(distance, 26);
    const aimY = lerp(AIM.y, TALL_AIM.y, t);
    const aimZ = lerp(AIM.z, TALL_AIM.z, t);
    camera.position.set(
      lerp(reach * 0.06, 0, t),
      lerp(3 + reach * 0.1, aimY + reach * Math.sin(TALL_PITCH), t),
      lerp(reach, aimZ + reach * Math.cos(TALL_PITCH), t),
    );
    camera.lookAt(0, aimY, aimZ);
    pinch.frame();

    for (const spot of spots) {
      spot.target.position.z = lerp(LIGHT_BACK, TALL_LIGHT_BACK, t);
      spot.angle = lerp(LIGHT_ANGLE, TALL_LIGHT_ANGLE, t);
    }

    renderer.setSize(width, height, false);
    setScale(height / (2 * reach * Math.tan(halfFov)));
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

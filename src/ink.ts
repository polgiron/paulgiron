import { Color, RenderPipeline } from 'three/webgpu';
import type { Node, PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu';
import {
  abs,
  unpackRGBToNormal,
  packNormalToRGB,
  float,
  Fn,
  length,
  max,
  mix,
  mrt,
  mx_noise_float,
  normalView,
  output,
  pass,
  perspectiveDepthToViewZ,
  screenSize,
  screenUV,
  smoothstep,
  uniform,
  vec2,
} from 'three/tsl';

const LINE_WIDTH = 0.8;
// Below this many CSS pixels per unit of the room, the line thins with the scene so small bricks keep their colour.
const FULL_LINE_SCALE = 30;
// A thinner line than this would fall between the pixels it compares.
const THINNEST_LINE = 0.75;

/** Draws the ink: finds where surfaces fold or overlap, and inks those lines by hand. */
export function createInkPipeline(renderer: WebGPURenderer, scene: Scene, camera: PerspectiveCamera, ink: string) {
  const pipeline = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView) }));

  const colorTexture = scenePass.getTextureNode('output');
  const normalTexture = scenePass.getTextureNode('normal');
  const depthTexture = scenePass.getTextureNode('depth');
  const inkColor = uniform(new Color(ink), 'color').rgb;
  const lineWidth = uniform(LINE_WIDTH);
  // The scene camera's own range: cameraNear and cameraFar would be those of the flat camera drawing this pass.
  const near = uniform(camera.near);
  const far = uniform(camera.far);

  const inverseZ = (coordinate: Node<'vec2'>) =>
    float(1).div(perspectiveDepthToViewZ(depthTexture.sample(coordinate).r, near, far));

  pipeline.outputNode = Fn(() => {
    const step = vec2(lineWidth).div(screenSize);

    // A slight wander, so lines look drawn rather than computed.
    const wander = vec2(
      mx_noise_float(screenUV.mul(vec2(70, 40))),
      mx_noise_float(screenUV.mul(vec2(40, 70)).add(9)),
    ).mul(step.mul(0.9));
    const uvHere = screenUV.add(wander);

    const left = uvHere.sub(vec2(step.x, 0));
    const right = uvHere.add(vec2(step.x, 0));
    const down = uvHere.sub(vec2(0, step.y));
    const up = uvHere.add(vec2(0, step.y));

    const direction = (coordinate: Node<'vec2'>) => unpackRGBToNormal(normalTexture.sample(coordinate).rgb);
    const fold = length(direction(left).sub(direction(right))).add(length(direction(down).sub(direction(up))));

    // Inverse depth is linear across a flat surface, so only real jumps register.
    const zHere = inverseZ(uvHere);
    const jump = abs(inverseZ(left).add(inverseZ(right)).sub(zHere.mul(2)))
      .add(abs(inverseZ(down).add(inverseZ(up)).sub(zHere.mul(2))))
      .div(max(abs(zHere), 0.001));

    const line = max(smoothstep(0.55, 0.85, fold), smoothstep(0.012, 0.03, jump));
    return mix(colorTexture.sample(screenUV).rgb, inkColor, line);
  })();

  /** Sets the line for how large the room is on screen, in CSS pixels per unit. */
  function setScale(scale: number) {
    const width = renderer.getPixelRatio() * LINE_WIDTH * Math.min(scale / FULL_LINE_SCALE, 1);
    lineWidth.value = Math.max(width, THINNEST_LINE);
  }

  return { pipeline, setScale };
}

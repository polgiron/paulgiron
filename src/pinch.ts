import type { PerspectiveCamera } from 'three/webgpu';

const MOST_ZOOM = 4;

interface Finger {
  x: number;
  y: number;
}

function distance(a: Finger, b: Finger) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, least: number, most: number) {
  return Math.max(least, Math.min(most, value));
}

/**
 * Lets two fingers zoom into the room and move around it, with what is under them staying under them.
 * It crops the camera's picture rather than moving the camera, so the room keeps its perspective, the crop never
 * leaves the frame, and the page and its name stay as they are. Fingers are heard anywhere on the page.
 */
export function createPinch(camera: PerspectiveCamera, onStart: () => void, onChange: () => void) {
  const fingers = new Map<number, Finger>();
  let zoom = 1;
  // The crop's top left corner, as a share of the whole picture.
  let cropX = 0;
  let cropY = 0;

  /** Points the camera at the crop. Also what applies a new window size. */
  function frame() {
    const { innerWidth: width, innerHeight: height } = window;
    camera.setViewOffset(width, height, cropX * width, cropY * height, width / zoom, height / zoom);
  }

  function pinch(from: [Finger, Finger], to: [Finger, Finger]) {
    const { innerWidth: width, innerHeight: height } = window;
    const anchorX = cropX + (from[0].x + from[1].x) / 2 / width / zoom;
    const anchorY = cropY + (from[0].y + from[1].y) / 2 / height / zoom;

    zoom = clamp((zoom * distance(to[0], to[1])) / Math.max(distance(from[0], from[1]), 1), 1, MOST_ZOOM);
    const most = 1 - 1 / zoom;
    cropX = clamp(anchorX - (to[0].x + to[1].x) / 2 / width / zoom, 0, most);
    cropY = clamp(anchorY - (to[0].y + to[1].y) / 2 / height / zoom, 0, most);

    frame();
    onChange();
  }

  window.addEventListener('pointerdown', ({ pointerId, pointerType, clientX, clientY }) => {
    if (pointerType !== 'touch') return;
    fingers.set(pointerId, { x: clientX, y: clientY });
    if (fingers.size === 2) onStart();
  });

  window.addEventListener('pointermove', ({ pointerId, clientX, clientY }) => {
    if (!fingers.has(pointerId)) return;
    const [a, b] = fingers.values();
    const before: [Finger, Finger] | null = b ? [a, b] : null;
    fingers.set(pointerId, { x: clientX, y: clientY });
    const [c, d] = fingers.values();
    if (before && d) pinch(before, [c, d]);
  });

  for (const type of ['pointerup', 'pointercancel'] as const) {
    window.addEventListener(type, ({ pointerId }) => fingers.delete(pointerId));
  }

  // Safari's own page zoom, which it can start whatever touch-action says.
  document.addEventListener('gesturestart', (event) => event.preventDefault());

  return { frame };
}

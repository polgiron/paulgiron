import { setupControls } from './controls';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const controls = document.querySelector<HTMLElement>('#controls');
if (!canvas || !controls) throw new Error('Missing page elements');

// The name and Contact are plain HTML, so the page still works if the 3D can't run.
try {
  const { startScene } = await import('./scene');
  const contact = document.querySelector('.contact');
  contact?.addEventListener('animationend', () => contact.classList.remove('is-nudged'));
  const scene = await startScene(canvas, () => contact?.classList.add('is-nudged'));
  setupControls(controls, scene);
  document.documentElement.classList.add('scene-ready');
} catch (error) {
  console.error(error);
}

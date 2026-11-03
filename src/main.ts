import { setupContact } from './contact';
import { setupControls } from './controls';

const contact = document.querySelector<HTMLAnchorElement>('#contact');
const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const controls = document.querySelector<HTMLElement>('#controls');
if (!contact || !canvas || !controls) throw new Error('Missing page elements');

setupContact(contact);

// The name and Contact are plain HTML, so the page still works if the 3D can't run.
try {
  const { startScene } = await import('./scene');
  const scene = await startScene(canvas);
  setupControls(controls, scene);
  document.documentElement.classList.add('scene-ready');
} catch (error) {
  console.error(error);
}

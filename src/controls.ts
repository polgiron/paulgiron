interface Playback {
  paused: boolean;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
}

export function setupControls(controls: HTMLElement, scene: Playback) {
  const toggle = controls.querySelector<HTMLButtonElement>('#toggle');
  const reset = controls.querySelector<HTMLButtonElement>('#reset');
  const speeds = controls.querySelectorAll<HTMLButtonElement>('[data-speed]');
  if (!toggle || !reset) throw new Error('Missing controls');

  function showPaused() {
    toggle?.classList.toggle('is-paused', scene.paused);
    toggle?.setAttribute('aria-label', scene.paused ? 'Play' : 'Pause');
  }
  showPaused();

  function setPaused(paused: boolean) {
    scene.setPaused(paused);
    showPaused();
  }

  toggle.addEventListener('click', () => setPaused(!scene.paused));

  // Both of these ask to see something move, so they also resume a paused scene.
  reset.addEventListener('click', () => {
    scene.reset();
    setPaused(false);
  });

  for (const button of speeds) {
    button.addEventListener('click', () => {
      scene.setSpeed(Number(button.dataset.speed));
      setPaused(false);
      for (const other of speeds) other.setAttribute('aria-pressed', String(other === button));
    });
  }
}

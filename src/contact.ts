// The ID from your form's link: tally.so/r/<id>
const TALLY_FORM_ID = 'OQaeMg';

const EMBED_SCRIPT = 'https://tally.so/widgets/embed.js';

declare global {
  interface Window {
    Tally?: {
      openPopup: (formId: string, options?: Record<string, unknown>) => void;
    };
  }
}

let embed: Promise<void> | undefined;

function loadEmbed() {
  embed ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EMBED_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      embed = undefined;
      reject(new Error('Could not load the Tally script'));
    };
    document.head.append(script);
  });
  return embed;
}

function showNotConnected(link: HTMLAnchorElement) {
  const label = link.querySelector('span');
  if (!label) return;
  label.textContent = 'Form not connected yet';
  window.setTimeout(() => {
    label.textContent = 'Contact';
  }, 2400);
}

export function setupContact(link: HTMLAnchorElement) {
  if (!TALLY_FORM_ID) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showNotConnected(link);
    });
    return;
  }

  const formUrl = `https://tally.so/r/${TALLY_FORM_ID}`;
  link.href = formUrl;

  const preload = () => void loadEmbed().catch(() => {});
  link.addEventListener('pointerenter', preload, { once: true });
  link.addEventListener('focus', preload, { once: true });

  link.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try {
      await loadEmbed();
      window.Tally?.openPopup(TALLY_FORM_ID, { layout: 'modal', width: 560, overlay: true });
    } catch {
      window.location.href = formUrl;
    }
  });
}

// The script side of the docs' figure (components/visuals/VisualFrame.astro), run in the browser: when a figure draws
// what it lays over its stage, and drawing a figure under another shipped design system.
//
// A figure's live elements are in the page's markup and hold their room before they are defined; what a figure lays
// over them — numbers, lines, labels — is placed against the drawn elements, so it is drawn only once they are defined,
// and only when the figure's time has come (`data-hydrate`): when it comes within half a window of the view, when the
// browser is idle, or at once. The overlay is absolutely placed: drawing it moves nothing.

export type Hydrate = 'visible' | 'idle' | 'load';

/** Sent on the figure's element once its stage is drawn under another system; `detail.system` is that system's id. */
export const SYSTEM_EVENT = 'docs-visual-system';

const partOf = (frame: HTMLElement, part: string): HTMLElement => {
  const element = frame.querySelector<HTMLElement>(`[data-docs-visual-${part}]`);
  if (!element) throw new Error(`a docs figure without its ${part} (components/visuals/VisualFrame.astro)`);
  return element;
};

/** Resolves once every custom element under `root` is defined. */
export async function defined(root: Element): Promise<void> {
  const waiting = new Set([...root.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-') && !customElements.get(name)));
  await Promise.all([...waiting].map((name) => customElements.whenDefined(name)));
}

/**
 * Calls `draw` once, with the figure's canvas (what it shows) and its overlay (what it lays over it), when the figure's
 * time has come and every element in the canvas is defined.
 */
export function whenDrawn(frame: HTMLElement, draw: (canvas: HTMLElement, overlay: HTMLElement) => void): void {
  const canvas = partOf(frame, 'canvas');
  const overlay = partOf(frame, 'overlay');
  const go = () => void defined(canvas).then(() => draw(canvas, overlay));
  const time = (frame.dataset.hydrate ?? 'visible') as Hydrate;
  if (time === 'load') go();
  else if (time === 'idle') ('requestIdleCallback' in window ? window.requestIdleCallback : (callback: () => void) => setTimeout(callback, 1))(go);
  else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        go();
      },
      { rootMargin: '50% 0px' },
    );
    observer.observe(frame);
  }
}

// A preset's stylesheet, loaded once for the page however many figures ask for it.
const sheets = new Map<string, Promise<void>>();
function loadSheet(href: string): Promise<void> {
  let loading = sheets.get(href);
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => reject(new Error(`could not load ${href}`)), { once: true });
      document.head.append(link);
    });
    // A failed load may be asked again.
    loading.catch(() => sheets.delete(href));
    sheets.set(href, loading);
  }
  return loading;
}

const chosen = new WeakMap<HTMLElement, string>();

/**
 * Draws a figure's stage under a shipped system: a preset once its stylesheet (`sheet`) has arrived, the default system
 * (no sheet) at once. Where another choice was made on the same figure meanwhile, the later one wins. Resolves with the
 * system the stage is drawn under: the one asked for, or, where its stylesheet could not be loaded, the one it was.
 */
export async function drawUnder(frame: HTMLElement, system: string, sheet?: string): Promise<string> {
  const stage = partOf(frame, 'stage');
  const current = () => stage.getAttribute('data-tanrei-system') ?? frame.dataset.defaultSystem ?? '';
  chosen.set(frame, system);
  if (sheet) {
    try {
      await loadSheet(sheet);
    } catch {
      return current();
    }
  }
  if (chosen.get(frame) !== system) return current();
  if (sheet) stage.setAttribute('data-tanrei-system', system);
  else stage.removeAttribute('data-tanrei-system');
  frame.dispatchEvent(new CustomEvent(SYSTEM_EVENT, { detail: { system } }));
  return system;
}

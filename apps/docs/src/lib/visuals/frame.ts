// The script side of the docs' frame (components/visuals/Example.astro), run in the browser: when a figure draws what
// it lays over its stage, and which shipped design system it is drawn in (the page's look, lib/appearance.ts, or the
// one a page pinned it to).
//
// A figure's live elements are in the page's markup and hold their room before they are defined; what a figure lays
// over them — numbers, lines, labels — is placed against the drawn elements, so it is drawn only once they are defined,
// and only when the figure's time has come (`data-hydrate`): when it comes within half a window of the view, when the
// browser is idle, or at once. The overlay is absolutely placed: drawing it moves nothing.

import { LOOK_ATTR } from '../appearance';

export type Hydrate = 'visible' | 'idle' | 'load';

/** Sent on the frame's element once its stage is drawn in other tokens (the page's look changed); `detail.system` is the system it is drawn in now (`systemOf`). */
export const SYSTEM_EVENT = 'docs-example-system';

/** The attribute of a frame's element that names the default system, which a stage with no system of its own is drawn under. */
export const DEFAULT_SYSTEM_ATTR = 'data-default-system';

const partOf = (frame: HTMLElement, part: string): HTMLElement => {
  const element = frame.querySelector<HTMLElement>(`[data-example-${part}]`);
  if (!element) throw new Error(`a docs frame without its ${part} (components/visuals/Example.astro)`);
  return element;
};

/** Resolves once every custom element under `root` is defined. */
export async function defined(root: Element): Promise<void> {
  const waiting = new Set([...root.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-') && !customElements.get(name)));
  await Promise.all([...waiting].map((name) => customElements.whenDefined(name)));
}

/** Every shadow root under `root`, nearest first. */
export function shadowRootsIn(root: ParentNode): ShadowRoot[] {
  const found: ShadowRoot[] = [];
  const walk = (node: ParentNode) => {
    for (const element of node.querySelectorAll('*')) {
      if (!element.shadowRoot) continue;
      found.push(element.shadowRoot);
      walk(element.shadowRoot);
    }
  };
  walk(root);
  return found;
}

/**
 * Every Tanrei element under `root`, its shadow trees included, has drawn, and what it was moving has come to rest: a
 * figure measures the component as it stands, not part of the way through an entrance (a part still faded out is not
 * drawn for the figure). A motion that never ends (a spinner's turn) or that stands still is not waited for.
 */
export async function settled(root: Element): Promise<void> {
  const all = () => [root, ...root.querySelectorAll('*'), ...shadowRootsIn(root).flatMap((shadow) => [...shadow.querySelectorAll('*')])];
  await Promise.all(all().map((element) => (element as Element & { updateComplete?: Promise<unknown> }).updateComplete).filter(Boolean));
  await document.fonts.ready;
  const moving = new Set(all().flatMap((element) => element.getAnimations({ subtree: true })));
  const ending = [...moving].filter((animation) => animation.playState === 'running' && Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)));
  await Promise.all(ending.map((animation) => animation.finished.catch(() => undefined)));
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

/**
 * The shipped system a figure's stage is drawn in: the one a page pinned it to (its stage's scope), else the page's look
 * where that is a shipped system, else — under the reader's own theme, which no system's roles name — the default.
 */
export function systemOf(frame: HTMLElement): string {
  const fallback = frame.getAttribute(DEFAULT_SYSTEM_ATTR) ?? '';
  const pinned = frame.querySelector('[data-example-stage]')?.getAttribute('data-tanrei-system');
  if (pinned) return pinned;
  const look = document.documentElement.getAttribute(LOOK_ATTR);
  const shipped = document.querySelector<HTMLElement>('[data-docs-looks]')?.dataset.docsLooks?.split(' ') ?? [];
  return look && shipped.includes(look) ? look : fallback;
}

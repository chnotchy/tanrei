// What the gallery of fixtures does in the browser (components/fixtures/FixtureGallery.astro): each stage's width handle,
// its scheme, the scale of a window that is wider than the column, drawing a window's fixture again, and the one step in
// script a fixture asks for (the files a file upload keeps). A stage is placed and sized by its stylesheet before any of
// this runs; nothing here moves anything that is already drawn.
import { RESIZE_EVENT, resizeHandle } from './resize-handle';

/** The least width a stage is made narrower to by its handle, in CSS pixels. */
const LEAST = 160;

/** The width the stage's figure can give its canvas: the row's, less what the figure draws around the canvas. */
function room(stage: HTMLElement, canvas: HTMLElement): number {
  const row = stage.parentElement ?? stage;
  return Math.max(LEAST, row.clientWidth - (stage.getBoundingClientRect().width - canvas.getBoundingClientRect().width));
}

/** An inline stage whose fixture is as wide as its layout: the handle sets the canvas's width, which the fixture fills. */
function inlineStage(stage: HTMLElement, canvas: HTMLElement, handle: HTMLElement) {
  resizeHandle(handle, {
    value: () => canvas.getBoundingClientRect().width,
    min: () => LEAST,
    max: () => room(stage, canvas),
  });
  handle.addEventListener(RESIZE_EVENT, (event) => {
    canvas.style.setProperty('--docs-stage-width', `${(event as CustomEvent<{ value: number }>).detail.value}px`);
  });
}

/**
 * A window stage: the frame is laid out at the window's width (`--docs-window-width`, which the handle changes, so that
 * what reads the window's width reads the new one) and drawn scaled to the box, which is never wider than the column.
 */
function windowStage(canvas: HTMLElement, handle: HTMLElement | null) {
  const frame = canvas.querySelector<HTMLIFrameElement>('iframe');
  // A presented fixture takes focus when it opens (a modal dialog moves it in): the frame is written `inert`, so that
  // a window loading as the reader scrolls never takes the focus from the page, and is let go once what it draws has
  // opened. Each load of it (a "draw again") is held the same way.
  if (frame) {
    const release = () => {
      const view = frame.contentWindow;
      const later = (callback: () => void) => (view ? view.requestAnimationFrame(() => view.requestAnimationFrame(() => view.setTimeout(callback, 200))) : callback());
      later(() => frame.removeAttribute('inert'));
    };
    frame.addEventListener('load', release);
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.querySelector('main > .stage')) release();
  }
  const width = () => Number(getComputedStyle(canvas).getPropertyValue('--docs-window-width')) || 1;
  const scale = () => canvas.style.setProperty('--docs-window-scale', String(Math.min(1, canvas.getBoundingClientRect().width / width())));
  new ResizeObserver(scale).observe(canvas);
  scale();
  if (!handle) return;
  resizeHandle(handle, { value: width, min: () => LEAST, max: () => Math.max(width(), 1440) });
  handle.addEventListener(RESIZE_EVENT, (event) => {
    canvas.style.setProperty('--docs-window-width', String((event as CustomEvent<{ value: number }>).detail.value));
    scale();
  });
}

/** The scheme a stage draws in: the page's, until its switch is turned. */
const pageScheme = () => (document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');

function scheme(stage: HTMLElement, box: HTMLElement) {
  const toggle = stage.querySelector<HTMLElement & { selected?: boolean }>('[data-stage-theme]');
  const frame = box.querySelector<HTMLIFrameElement>('iframe');
  if (!toggle) return;
  const apply = () => {
    const dark = toggle.hasAttribute('selected') || toggle.selected === true;
    const chosen = dark ? 'dark' : 'light';
    box.dataset.tanreiTheme = chosen;
    const root = frame?.contentDocument?.documentElement;
    if (root) root.dataset.tanreiTheme = chosen;
  };
  if (pageScheme() === 'dark') toggle.setAttribute('selected', '');
  toggle.addEventListener('click', () => requestAnimationFrame(apply));
  frame?.addEventListener('load', () => {
    if (box.dataset.tanreiTheme) apply();
  });
  // The stage follows the page's scheme until its own switch is turned.
  if (pageScheme() === 'dark') apply();
}

/**
 * A stage's actions are written in a template and drawn when the stage comes near the view: each is a Button or a Copy
 * button, and a page of hundreds of fixtures would define them all as it loads (on the Field's page, over a thousand).
 */
function actions(stage: HTMLElement, box: HTMLElement) {
  const holder = stage.querySelector<HTMLElement>('[data-stage-actions]');
  const template = holder?.querySelector<HTMLTemplateElement>(':scope > template');
  if (!holder || !template) return;
  template.replaceWith(template.content.cloneNode(true));
  scheme(stage, box);
  stage.querySelector('[data-stage-redraw]')?.addEventListener('click', () => {
    const frame = box.querySelector('iframe');
    frame?.setAttribute('inert', '');
    frame?.contentWindow?.location.reload();
  });
}

const near = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      near.unobserve(entry.target);
      const stage = entry.target as HTMLElement;
      const box = stage.querySelector<HTMLElement>('.docs-stage-box');
      if (box) actions(stage, box);
    }
  },
  { rootMargin: '50% 0px' },
);

for (const stage of document.querySelectorAll<HTMLElement>('.docs-stage[data-drawn]')) {
  const box = stage.querySelector<HTMLElement>('.docs-stage-box');
  const canvas = stage.querySelector<HTMLElement>('.docs-stage-canvas');
  if (!box || !canvas) continue;
  const handle = canvas.querySelector<HTMLElement>(':scope > [data-resize-handle]');
  if (stage.dataset.stage === 'window') windowStage(canvas, handle);
  else if (handle) inlineStage(stage, canvas, handle);
  // A window follows the page's scheme from its first load, before its actions are drawn.
  const frame = box.querySelector<HTMLIFrameElement>('iframe');
  if (frame && pageScheme() === 'dark') {
    box.dataset.tanreiTheme = 'dark';
    frame.addEventListener('load', () => {
      const root = frame.contentDocument?.documentElement;
      if (root && box.dataset.tanreiTheme) root.dataset.tanreiTheme = box.dataset.tanreiTheme;
    });
  }
  near.observe(stage);
}

/**
 * A fixture's step in script (`STAGED_FILES` in lib/fixtures.ts): a file upload that keeps its own files is handed the
 * files its fixture lists, once it is defined — the same step the web package's harness runs (`Staging.after`). The
 * size function is set first and answers a size with its item's text (it is left unset where no item has one); then
 * `add()` is called once with one `File` per item, in order: named by the item, as many zero bytes long as its place
 * among the items, so that no two are the same file, with one fixed time of last change and the media type a browser
 * reports for the name's ending. Nothing is sent anywhere.
 */
export async function stageFiles(element: HTMLElement) {
  // (A chat composer that keeps its own files is handed them the same way, by its `addFiles()`; it has no size function.)
  type Upload = HTMLElement & { formatSize: ((bytes: number) => string) | null; add?: (files: File[]) => unknown; addFiles?: (files: File[]) => unknown };
  let items: { name: string; sizeText: string }[] = [];
  try {
    items = JSON.parse(element.dataset.fixtureFiles ?? '[]');
  } catch {
    return;
  }
  if (!items.length) return;
  await customElements.whenDefined(element.localName);
  const upload = element as Upload;
  const add = typeof upload.add === 'function' ? upload.add.bind(upload) : typeof upload.addFiles === 'function' ? upload.addFiles.bind(upload) : null;
  if (!add) return;
  const sizes = items.map((item) => item.sizeText ?? '');
  if (sizes.some(Boolean)) upload.formatSize = (bytes) => sizes[bytes - 1] ?? '';
  // The kind a browser reports of a file its picker hands over, for the endings the fixtures use: a staged file is
  // judged by a media type of `accept` as a chosen one is (the fixture `tiles-own` takes `image/*`).
  const kinds: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', mov: 'video/quicktime', csv: 'text/csv' };
  const kind = (name: string) => kinds[name.slice(name.lastIndexOf('.') + 1).toLowerCase()] ?? '';
  add(items.map((item, index) => new File([new Uint8Array(index + 1)], item.name, { lastModified: 1767225600000, type: kind(item.name) })));
}
for (const element of document.querySelectorAll<HTMLElement>('.fixture-element > [data-fixture-files]')) stageFiles(element);

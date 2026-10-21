// What the gallery of fixtures does in the browser (components/fixtures/FixtureGallery.astro): each stage's width handle,
// its scheme, the scale of a window that is wider than the column, drawing a window's fixture again, and the one step in
// script a fixture asks for (the files a file upload keeps). A stage is placed and sized by its stylesheet before any of
// this runs; nothing here moves anything that is already drawn.
import { RESIZE_EVENT, resizeHandle } from './resize-handle';

/** The least width a stage is made narrower to by its handle, in CSS pixels. */
const LEAST = 160;

/** The width a stage can give its canvas: the stage's box (as wide as the column), less its padding. */
function room(canvas: HTMLElement): number {
  const box = canvas.parentElement ?? canvas;
  const style = getComputedStyle(box);
  return Math.max(LEAST, box.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd));
}

/** An inline stage whose fixture is as wide as its layout: the handle sets the canvas's width, which the fixture fills. */
function inlineStage(canvas: HTMLElement, handle: HTMLElement) {
  resizeHandle(handle, {
    value: () => canvas.getBoundingClientRect().width,
    min: () => LEAST,
    max: () => room(canvas),
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
    // A fixture that is not presented stands in a frame of its stage's size, read from its baseline. Text set on
    // another machine can take a few pixels more (the baselines are taken on Linux at a device pixel ratio of 2), and a
    // stage's content can reach past the stage the baseline pictures: the frame grows to hold its document, never
    // shrinks below the room it held, and is otherwise left as it was.
    if (canvas.dataset.fit !== undefined) {
      const least = Number(getComputedStyle(canvas).getPropertyValue('--docs-window-height')) || 0;
      frame.addEventListener('load', () => {
        const view = frame.contentWindow as (Window & typeof globalThis) | null;
        const body = frame.contentDocument?.body;
        if (!view || !body) return;
        const fit = () => {
          const root = frame.contentDocument!.scrollingElement ?? frame.contentDocument!.documentElement;
          canvas.style.setProperty('--docs-window-height', String(Math.max(least, root.scrollHeight)));
        };
        new view.ResizeObserver(fit).observe(body);
        fit();
      });
    }
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.querySelector('.stage')) release();
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

/** The page's scheme: the one the header's picker put on the root (`data-theme`), else the system's. */
const pageScheme = () => (document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');

/** A stage's scheme: the page's, and every change of it, until the stage's own switch is turned; then the switch's. */
interface StageScheme {
  box: HTMLElement;
  frame: HTMLIFrameElement | null;
  toggle: (HTMLElement & { selected?: boolean }) | null;
  turned: boolean;
}
const stageSchemes = new Map<HTMLElement, StageScheme>();

/** What a stage draws in now. */
const schemeOf = (stage: StageScheme): 'light' | 'dark' => {
  if (!stage.turned) return pageScheme();
  return stage.toggle && (stage.toggle.hasAttribute('selected') || stage.toggle.selected === true) ? 'dark' : 'light';
};

/**
 * Draws a stage in its scheme. A stage in the page inherits the page's scheme: it is marked only where it draws its own
 * surface (dark, or turned). A window is a document of its own, which inherits nothing from the page: its root is
 * given the scheme, and the page's contrast with it (the contrast a live example's switch sets on the page's root).
 */
function drawScheme(stage: StageScheme) {
  const chosen = schemeOf(stage);
  if (stage.turned || chosen === 'dark') stage.box.dataset.tanreiTheme = chosen;
  else delete stage.box.dataset.tanreiTheme;
  if (stage.toggle && !stage.turned) stage.toggle.toggleAttribute('selected', chosen === 'dark');
  const root = stage.frame?.contentDocument?.documentElement;
  if (!root) return;
  root.dataset.tanreiTheme = chosen;
  const contrast = document.documentElement.dataset.tanreiContrast;
  if (contrast) root.dataset.tanreiContrast = contrast;
  else delete root.dataset.tanreiContrast;
}

/** A stage's scheme is held from the start, before its actions are drawn: a window follows the page's from its first load. */
function holdScheme(box: HTMLElement) {
  const stage: StageScheme = { box, frame: box.querySelector<HTMLIFrameElement>('iframe'), toggle: null, turned: false };
  stageSchemes.set(box, stage);
  stage.frame?.addEventListener('load', () => drawScheme(stage));
  drawScheme(stage);
}

/** The stage's own switch, once its actions are drawn: it shows the scheme the stage follows, and turning it keeps the stage in its own. */
function scheme(stage: HTMLElement, box: HTMLElement) {
  const held = stageSchemes.get(box);
  const toggle = stage.querySelector<HTMLElement & { selected?: boolean }>('[data-stage-theme]');
  if (!held || !toggle) return;
  held.toggle = toggle;
  toggle.addEventListener('click', () =>
    requestAnimationFrame(() => {
      held.turned = true;
      drawScheme(held);
    }),
  );
  drawScheme(held);
}

// Every change of the page's scheme or contrast reaches every stage that follows it: the header's picker sets
// `data-theme` on the root (and follows the system there while it is on "auto"), a live example's switch sets
// `data-tanrei-contrast`.
const followPage = () => {
  for (const stage of stageSchemes.values()) drawScheme(stage);
};
new MutationObserver(followPage).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tanrei-contrast'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', followPage);

/**
 * A stage's actions are written in a template and drawn when the stage comes near the view: each is a Button or a Copy
 * button, and a page of hundreds of fixtures would define them all as it loads (on the Field's page, over a thousand).
 */
function actions(stage: HTMLElement, box: HTMLElement) {
  const holder = stage.querySelector<HTMLElement>('[data-stage-actions]');
  const template = holder?.querySelector<HTMLTemplateElement>(':scope > template');
  if (!holder || !template) return;
  template.replaceWith(document.importNode(template.content, true));
  scheme(stage, box);
  stage.querySelector('[data-stage-redraw]')?.addEventListener('click', () => {
    const frame = box.querySelector('iframe');
    frame?.setAttribute('inert', '');
    frame?.contentWindow?.location.reload();
  });
}

/**
 * A fixture drawn in the page is written in a template and drawn when its stage comes near the view: a page of hundreds
 * of fixtures (the Field's has 368) would define and lay out every one of them before it had loaded. Its canvas holds
 * the room the fixture's baseline shows until then. A fixture that takes a step in script takes it once drawn.
 */
export function drawFixture(stage: Element) {
  const template = stage.querySelector<HTMLTemplateElement>('.fixture-element > template[data-stage-fixture]');
  if (!template) return;
  const holder = template.parentElement!;
  template.replaceWith(document.importNode(template.content, true));
  for (const element of holder.querySelectorAll<HTMLElement>(':scope > [data-fixture-files]')) stageFiles(element);
}

const near = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      near.unobserve(entry.target);
      const stage = entry.target as HTMLElement;
      drawFixture(stage);
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
  else if (handle) inlineStage(canvas, handle);
  holdScheme(box);
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

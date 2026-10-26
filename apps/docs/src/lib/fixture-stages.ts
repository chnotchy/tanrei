// What the gallery of fixtures does in the browser (components/fixtures/FixtureGallery.astro): drawing each fixture of
// the page from the web package's document of it when its stage comes near the view (the frame says so,
// lib/example.ts `NEAR_EVENT`), and the document's step in script for it; each stage's width handle; its scheme;
// opening a fixture drawn closed; writing each window's document when the window comes near the view and emptying it
// when it is far from it, drawing it again, and its scale where it is wider than the column. A stage is placed and
// sized by its stylesheet before any of this runs; nothing here moves anything that is already drawn. The frame's own
// actions — the code, its copy, the direction — are the frame's (lib/example.ts).
import { RESIZE_EVENT, resizeHandle } from './resize-handle';
import { CONTRAST_ATTR, THEME_ATTR } from './appearance';
import { NEAR_EVENT } from './example';
import windowSheet from '../styles/fixture-window.css?url';

/** The least width a stage is made narrower to by its handle, in CSS pixels. */
const LEAST = 160;

/** The width a stage can give its canvas: the stage's box (as wide as the column), less its padding. */
function room(canvas: HTMLElement): number {
  const box = canvas.parentElement ?? canvas;
  const style = getComputedStyle(box);
  return Math.max(LEAST, box.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd));
}

/** The style rules of the component's staging (the gallery's scoped stylesheet), those in a group rule included. */
function stagingRules(): CSSStyleRule[] {
  const sheet = document.querySelector<HTMLStyleElement>('style[data-fixture-staging]')?.sheet;
  const found: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) found.push(rule);
      if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  if (sheet) walk(sheet.cssRules);
  return found;
}

const matches = (element: Element, selector: string) => {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
};

/**
 * What the staging makes as wide as a layout, in a drawn stage: the fixture's element, or else the stage, where a rule
 * of the staging that matches it gives it a width in pixels (`.stage > tanrei-text-field { inline-size: 280px }`, a
 * table's stage 752 wide). Nothing where the fixture is as wide as what it draws (a Button). Where both have a width,
 * the stage is the layout when it is the wider (a popover's 480 stage around an anchor 240 wide).
 */
function laidOutBy(stage: Element): { sized: HTMLElement; width: number } | undefined {
  const widthOf = (rule: CSSStyleRule) => rule.style.getPropertyValue('inline-size') || rule.style.getPropertyValue('width');
  const rules = stagingRules().filter((rule) => /^[\d.]+px$/.test(widthOf(rule)));
  const sized = [stage.firstElementChild, stage].flatMap((element) => {
    // The last rule that matches is the one in effect, as their order in the staging says.
    const rule = element instanceof HTMLElement ? rules.findLast((each) => matches(element, each.selectorText)) : undefined;
    return rule ? [{ sized: element as HTMLElement, width: parseFloat(widthOf(rule)) }] : [];
  });
  const [own, ofStage] = sized.length === 2 ? sized : [sized[0], undefined];
  return ofStage && own && ofStage.width > own.width ? ofStage : own;
}

/**
 * The inline stages, fitted to their rows by one observer: it is told of every stage drawn or resized in a frame at
 * once (a stage is fitted when it is first observed, before it is painted), reads the room of each, and only then
 * writes their widths. A stage that read the layout after the one before it had written a width would lay the whole
 * page out again: drawing the stages near the view as the reader scrolled did that for every stage, and spent most of
 * its time on it on a page of hundreds (the Field's has 368).
 */
const fitters = new Map<Element, () => () => void>();
const rows = new ResizeObserver((entries) => {
  const writes = entries.flatMap((entry) => fitters.get(entry.target)?.() ?? []);
  for (const write of writes) write();
});

/**
 * An inline stage whose fixture is as wide as its layout: it starts at the width its staging gives it, and is never
 * wider than the stage's row — a layout wider than the column is laid out at the column's width, as a product's is.
 * The handle sets the width the reader wants, which the stage keeps for as long as the row has room for it.
 */
function inlineStage(canvas: HTMLElement, { sized, width: natural }: { sized: HTMLElement; width: number }, handle: HTMLElement) {
  let wanted = natural;
  // What the canvas draws around the sized element, in the sized element's own terms: the stage's padding and border
  // where the fixture's element is sized; where the stage is, its padding unless its width holds it (`border-box`).
  const around = () => {
    const stage = canvas.querySelector<HTMLElement>(':scope > .stage');
    if (!stage) return 0;
    const box = getComputedStyle(stage);
    const edges = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight) + parseFloat(box.borderLeftWidth) + parseFloat(box.borderRightWidth);
    return sized === stage ? (box.boxSizing === 'border-box' ? 0 : edges) : edges;
  };
  // Reads the layout and returns the write it calls for: the observer of rows reads every stage it is told of before it
  // writes any.
  const fit = () => {
    const width = Math.max(LEAST - around(), Math.min(wanted, room(canvas) - around()));
    const next = Math.abs(width - natural) < 0.5 ? '' : `${width}px`;
    return () => {
      if (sized.style.inlineSize !== next) sized.style.inlineSize = next;
    };
  };
  resizeHandle(handle, {
    value: () => canvas.getBoundingClientRect().width,
    min: () => LEAST,
    max: () => room(canvas),
  });
  handle.addEventListener(RESIZE_EVENT, (event) => {
    wanted = (event as CustomEvent<{ value: number }>).detail.value - around();
    fit()();
  });
  const row = canvas.parentElement ?? canvas;
  fitters.set(row, fit);
  rows.observe(row);
}


// ── Windows ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** How near the view a window's document is written: within half a window of it, as a frame is drawn (lib/example.ts). */
const NEAR_WINDOW = '50% 0px';
/** How far from the view a window's document is emptied: three windows away. */
const FAR_WINDOW = '300% 0px';

/** The mark of a window's root while it draws: `HELD` of lib/fixture-window.ts, which this script does not import (it is that module's own chunk, loaded by its address). */
const HELD = 'data-docs-held';

/** What every window of a gallery writes into its document besides its stage (the gallery's data, `windowScript`). */
interface WindowData {
  staging: string;
  page: boolean;
}

// One opt-in stylesheet per preset, scoped to [data-tanrei-system="<id>"]: a window drawn under a preset links it.
const presetSheets = import.meta.glob<string>('../../../../packages/web/src/generated/systems/*.css', { query: '?url', import: 'default', eager: true });
const presetSheetOf = (system: string) => Object.entries(presetSheets).find(([file]) => file.endsWith(`/${system}.css`))?.[1];

let module: Promise<string> | undefined;
/** The address of the module a window's document runs (lib/fixture-window.ts), asked for once. */
const windowModule = () => (module ??= import('./fixture-window').then((loaded) => loaded.windowModule));

const attribute = (name: string, value: string | null | undefined) => (value ? ` ${name}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"` : '');

/** What a window's document is drawn in: the stage's scheme, the page's contrast, the stage's system and direction. */
interface Look {
  theme: 'light' | 'dark';
  contrast?: string;
  system?: string;
  dir?: string;
}

/**
 * A window's document: the fixture's stage, alone, with the component's staging, the stylesheets every page of the site
 * draws a fixture with (styles/fixture-window.css), the preset's where it is drawn under one, and the module that
 * defines its elements. It holds no inline script: a document written into a frame (`srcdoc`) keeps the page's
 * policy, which runs only the inline scripts the page itself holds.
 */
function windowDocument(html: string, data: WindowData, look: Look, script: string): string {
  const holder = data.page ? 'div' : 'main';
  const preset = look.system ? presetSheetOf(look.system) : undefined;
  return (
    `<!doctype html><html lang="en" ${HELD}${attribute('dir', look.dir)}${attribute('data-tanrei-theme', look.theme)}${attribute('data-tanrei-contrast', look.contrast)}${attribute('data-tanrei-system', look.system)}>` +
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<link rel="stylesheet"${attribute('href', windowSheet)}>${preset ? `<link rel="stylesheet" data-preset${attribute('href', preset)}>` : ''}` +
    `<style>${data.staging.replaceAll('</style', '<\\/style')}</style></head>` +
    `<body><${holder} class="stages">${html}</${holder}><script type="module"${attribute('src', script)}></script></body></html>`
  );
}

interface WindowStage {
  stage: HTMLElement;
  box: HTMLElement;
  canvas: HTMLElement;
  frame: HTMLIFrameElement;
  /** Its document is wanted: the window is near the view. */
  wanted: boolean;
  /** It holds its fixture's document, or is being given it. */
  written: boolean;
  /** Its document is being written, loaded or defined: it is emptied, if it is no longer wanted, once it is drawn. */
  busy: boolean;
}
const windows = new Map<Element, WindowStage>();

/** The document a window draws now, where it holds its fixture (not the empty one of a frame without one). */
const drawnDocument = (frame: HTMLIFrameElement) => {
  const doc = frame.contentDocument;
  return doc?.querySelector('body > .stages > .stage') ? doc : null;
};

/** The look a window's document is drawn in now. */
function lookOf(win: WindowStage): Look {
  const held = stageSchemes.get(win.box);
  return {
    theme: held ? schemeOf(held) : pageScheme(),
    contrast: document.documentElement.dataset.tanreiContrast,
    system: win.box.getAttribute('data-tanrei-system') ?? undefined,
    dir: win.box.getAttribute('dir') ?? undefined,
  };
}

/** Gives a drawn window's document the stage's system and direction, as they are now (a reader chose a preset, turned the stage). */
function drawLook(win: WindowStage) {
  const doc = drawnDocument(win.frame);
  if (!doc) return;
  const { system, dir } = lookOf(win);
  const root = doc.documentElement;
  if (dir) root.setAttribute('dir', dir);
  else root.removeAttribute('dir');
  const preset = system ? presetSheetOf(system) : undefined;
  let link = doc.head.querySelector<HTMLLinkElement>('link[data-preset]');
  if (preset && link?.getAttribute('href') !== preset) {
    link?.remove();
    link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.preset = '';
    link.href = preset;
    doc.head.append(link);
  }
  if (system) root.setAttribute('data-tanrei-system', system);
  else root.removeAttribute('data-tanrei-system');
}

/**
 * Writes a window's document. A presented fixture takes focus when it opens (a modal dialog moves it in), and a window
 * that took it would scroll the page to itself as the reader scrolls past it: while the document draws, its root is
 * held (`HELD`), and its module gives the page back its focus and its scroll after each open and each focus
 * (lib/fixture-window.ts); the frame is `inert`, so that Tab does not go into it. Both are let go once what it draws
 * has opened.
 */
function writeWindow(win: WindowStage, again = false) {
  win.wanted = true;
  // A window left before it was drawn, and come back to, keeps the document it is drawing.
  if (win.written && !again) return;
  win.written = true;
  const gallery = win.stage.closest<HTMLElement>('[data-fixture-gallery]');
  const html = gallery ? drawingsOf(gallery)[win.stage.dataset.fixtureId ?? ''] : undefined;
  const data = gallery ? windowDataOf(gallery) : undefined;
  if (!html || !data) return;
  void windowModule().then((script) => {
    if (!win.wanted || !win.written) return;
    win.busy = true;
    win.frame.setAttribute('inert', '');
    if (win.frame.hasAttribute('srcdoc')) win.frame.removeAttribute('srcdoc');
    win.frame.srcdoc = windowDocument(html, data, lookOf(win), script);
  });
}

/**
 * Empties a window far from the view: its document, and every element it defined, is let go. A window still drawing
 * is emptied once it has drawn (`settle`): a document taken away while it loads has the loads of its modules cut off.
 */
function emptyWindow(win: WindowStage) {
  win.wanted = false;
  if (win.busy || !win.written) return;
  win.written = false;
  win.frame.setAttribute('inert', '');
  win.frame.removeAttribute('srcdoc');
}

/** How long a window's elements may take to be defined before the window is taken as drawn without them. */
const DEFINED_WITHIN = 10_000;

/**
 * A window's document has loaded: once its elements are defined and drawn — a modal fixture has opened — it is let go
 * (`HELD`, `inert`), and emptied if it is no longer wanted.
 */
function settle(win: WindowStage, doc: Document, view: Window & typeof globalThis) {
  const elements = [...doc.querySelectorAll('body > .stages *')].filter((element) => element.localName.includes('-'));
  const tags = new Set(elements.map((element) => element.localName));
  // The page's frames and timers: WebKit holds back those of a window out of view.
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const drawn = async () => {
    await Promise.all([...tags].map((tag) => view.customElements.whenDefined(tag)));
    await Promise.all(elements.map((element) => (element as Element & { updateComplete?: Promise<unknown> }).updateComplete));
    await frame();
    await frame();
    await new Promise((resolve) => setTimeout(resolve, 200));
  };
  void Promise.race([drawn(), new Promise((resolve) => setTimeout(resolve, DEFINED_WITHIN))]).then(() => {
    if (win.frame.contentDocument !== doc) return;
    win.busy = false;
    if (!win.wanted) return emptyWindow(win);
    doc.documentElement.removeAttribute(HELD);
    win.frame.removeAttribute('inert');
  });
}

const nearWindows = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const win = windows.get(entry.target);
      if (entry.isIntersecting && win && !win.wanted) writeWindow(win);
    }
  },
  { rootMargin: NEAR_WINDOW },
);
const farWindows = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const win = windows.get(entry.target);
      if (!entry.isIntersecting && win) emptyWindow(win);
    }
  },
  { rootMargin: FAR_WINDOW },
);

/**
 * A window stage: the frame is laid out at the window's width (`--docs-window-width`, which the handle changes, so that
 * what reads the window's width reads the new one) and drawn scaled to the box, which is never wider than the column.
 */
function windowStage(stage: HTMLElement, box: HTMLElement, canvas: HTMLElement, handle: HTMLElement | null) {
  const frame = canvas.querySelector<HTMLIFrameElement>('iframe');
  if (!frame) return;
  const win: WindowStage = { stage, box, canvas, frame, wanted: false, written: false, busy: false };
  windows.set(canvas, win);
  // A fixture that is not presented stands in a frame of its stage's size, read from its baseline. Text set on another
  // machine can take a few pixels more (the baselines are taken on Linux at a device pixel ratio of 2), and a stage's
  // content can reach past the stage the baseline pictures: the frame grows to hold its document, never shrinks below
  // the room it held, and is otherwise left as it was.
  const least = Number(getComputedStyle(canvas).getPropertyValue('--docs-window-height')) || 0;
  frame.addEventListener('load', () => {
    const doc = drawnDocument(frame);
    const view = frame.contentWindow as (Window & typeof globalThis) | null;
    if (!doc || !view) return;
    settle(win, doc, view);
    drawLook(win);
    const held = stageSchemes.get(box);
    if (held) drawScheme(held);
    if (canvas.dataset.fit === undefined) return;
    const fit = () => {
      const root = doc.scrollingElement ?? doc.documentElement;
      canvas.style.setProperty('--docs-window-height', String(Math.max(least, root.scrollHeight)));
    };
    new view.ResizeObserver(fit).observe(doc.body);
    fit();
  });
  // The stage's system (the reader's choice in the header, lib/example.ts) and its direction (the frame's action) reach
  // its window's document.
  new MutationObserver(() => drawLook(win)).observe(box, { attributes: true, attributeFilter: ['data-tanrei-system', 'dir'] });
  nearWindows.observe(canvas);
  farWindows.observe(canvas);
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

// ── Schemes ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The page's scheme: the one the reader's appearance draws on the root (`data-theme`, lib/appearance.ts), else the system's. */
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
  const root = stage.frame && drawnDocument(stage.frame)?.documentElement;
  if (!root) return;
  root.dataset.tanreiTheme = chosen;
  const contrast = document.documentElement.dataset.tanreiContrast;
  if (contrast) root.dataset.tanreiContrast = contrast;
  else delete root.dataset.tanreiContrast;
}

/** A stage's scheme is held from the start, before its actions are drawn: a window's document is written in it. */
function holdScheme(box: HTMLElement) {
  const stage: StageScheme = { box, frame: box.querySelector<HTMLIFrameElement>('iframe'), toggle: null, turned: false };
  stageSchemes.set(box, stage);
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

// Every change of the page's scheme or contrast reaches every stage that follows it: the reader's appearance
// (lib/appearance.ts) sets `data-theme` and `data-tanrei-contrast` on the root (and follows the device's scheme there
// while the mode is the device's), a live example's switch sets `data-tanrei-contrast`.
const followPage = () => {
  for (const stage of stageSchemes.values()) drawScheme(stage);
};
new MutationObserver(followPage).observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTR, CONTRAST_ATTR] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', followPage);

// ── Openers ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * An opener's action: the fixture is drawn closed, and the action presents it — sets the attribute its stage's data
 * names (`open`) on its element — and takes it away again. The action shows whether the fixture is presented, however it
 * was closed (Escape, a press outside it, a choice in its menu). A press of the action turns the fixture from what it
 * was when the press began: a press while it is open is also a press outside it, which closes it before the action
 * hears the press, and leaves it closed.
 */
function opener(stage: HTMLElement) {
  const toggle = stage.querySelector<HTMLElement & { selected?: boolean }>('[data-stage-open]');
  const presence = toggle?.dataset.stageOpen;
  const tag = stage.closest<HTMLElement>('[data-fixture-gallery]')?.dataset.fixtureTag;
  const element = tag ? stage.querySelector(`[data-fixture-scope] > .stage ${tag}`) : null;
  if (!toggle || !presence || !element) return;
  const open = () => element.hasAttribute(presence);
  new MutationObserver(() => toggle.toggleAttribute('selected', open())).observe(element, { attributes: true, attributeFilter: [presence] });
  // Heard before the fixture's own listeners, which it adds when it opens: these are added first.
  let openAtPress: boolean | undefined;
  const pressed = (event: Event) => {
    if (event.composedPath().includes(toggle)) openAtPress = open();
  };
  addEventListener('pointerdown', pressed, true);
  addEventListener('keydown', pressed, true);
  toggle.addEventListener('change', () => {
    const next = !(openAtPress ?? open());
    openAtPress = undefined;
    toggle.toggleAttribute('selected', next);
    element.toggleAttribute(presence, next);
  });
}

// ── The stages ───────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A stage's own actions, once the frame has drawn its actions (they are written in a template and drawn when the stage
 * comes near the view, lib/example.ts): its scheme, opening a fixture drawn closed, and drawing a window's fixture again.
 */
function actions(stage: HTMLElement, box: HTMLElement) {
  scheme(stage, box);
  if (stage.dataset.stage === 'opener') opener(stage);
  stage.querySelector('[data-stage-redraw]')?.addEventListener('click', () => {
    const win = windows.get(box.querySelector('.docs-window') ?? box);
    if (win) writeWindow(win, true);
  });
}

/** The markup of each stage of a gallery, by fixture id (the gallery's data). */
const drawings = new WeakMap<Element, Record<string, string>>();
function drawingsOf(gallery: Element): Record<string, string> {
  let found = drawings.get(gallery);
  if (!found) {
    found = readData<Record<string, string>>(gallery, 'data-fixture-stages') ?? {};
    drawings.set(gallery, found);
  }
  return found;
}

/** What a gallery's windows write into their documents (the gallery's data). */
const windowDatas = new WeakMap<Element, WindowData | null>();
function windowDataOf(gallery: Element): WindowData | undefined {
  if (!windowDatas.has(gallery)) windowDatas.set(gallery, readData<WindowData>(gallery, 'data-fixture-window') ?? null);
  return windowDatas.get(gallery) ?? undefined;
}

function readData<T>(gallery: Element, attribute: string): T | undefined {
  try {
    const text = gallery.querySelector(`:scope > script[${attribute}]`)?.textContent;
    return text ? (JSON.parse(text) as T) : undefined;
  } catch {
    return undefined;
  }
}

type Step = (element: Element, id: string) => unknown;
/** The component's step in script, once the gallery's script has kept it (`docsFixtureSteps`). */
function stepOf(component: string): Promise<Step | undefined> {
  const kept = () => (window as Window & { docsFixtureSteps?: Record<string, Step> }).docsFixtureSteps?.[component];
  return new Promise((resolve) => {
    if (kept()) return resolve(kept());
    const heard = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== component) return;
      removeEventListener('docs-fixture-step', heard);
      resolve(kept());
    };
    addEventListener('docs-fixture-step', heard);
  });
}

/**
 * A fixture drawn in the page is drawn when its stage comes near the view: a page of hundreds of fixtures (the Field's
 * has 368) would define and lay out every one of them before it had loaded. Its canvas holds the room the fixture's
 * baseline shows until then. It is the document's stage, written in the canvas the staging is scoped to — with
 * `document.importNode`, so that its children are defined before it is connected, as when a page is parsed — and it
 * takes the document's step in script once its element is defined, as the web package's harness runs it.
 */
export function drawFixture(figure: HTMLElement) {
  const canvas = figure.querySelector<HTMLElement>('.docs-stage-canvas[data-pending]');
  const gallery = figure.closest<HTMLElement>('[data-fixture-gallery]');
  if (!canvas || !gallery) return;
  const html = drawingsOf(gallery)[figure.dataset.fixtureId ?? ''];
  const template = document.createElement('template');
  template.innerHTML = html ?? '';
  canvas.prepend(document.importNode(template.content, true));
  canvas.removeAttribute('data-pending');
  const stage = canvas.querySelector<HTMLElement>(':scope > .stage');
  const handle = canvas.querySelector<HTMLElement>(':scope > [data-resize-handle]');
  const layout = stage && laidOutBy(stage);
  if (layout && handle) inlineStage(canvas, layout, handle);
  else handle?.remove();
  const tag = gallery.dataset.fixtureTag;
  if (stage && tag && gallery.dataset.fixtureStep !== undefined) {
    void Promise.all([stepOf(gallery.dataset.component ?? ''), customElements.whenDefined(tag)]).then(([step]) => {
      const element = stage.querySelector(tag);
      if (step && element) return step(element, stage.dataset.fixture ?? '');
    });
  }
}

/** A stage near the view (the frame tells it once, lib/example.ts): its fixture is drawn, and its own actions take effect. */
function near(stage: HTMLElement) {
  drawFixture(stage);
  const box = stage.querySelector<HTMLElement>('.docs-stage-box');
  if (box) actions(stage, box);
}

for (const stage of document.querySelectorAll<HTMLElement>('.docs-stage[data-drawn]')) {
  const box = stage.querySelector<HTMLElement>('.docs-stage-box');
  const canvas = stage.querySelector<HTMLElement>('.docs-stage-canvas');
  if (!box || !canvas) continue;
  holdScheme(box);
  const handle = canvas.querySelector<HTMLElement>(':scope > [data-resize-handle]');
  if (stage.dataset.stage === 'window') windowStage(stage, box, canvas, handle);
  stage.addEventListener(NEAR_EVENT, () => near(stage), { once: true });
}

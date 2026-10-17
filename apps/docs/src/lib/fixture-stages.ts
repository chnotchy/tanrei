// What the gallery of fixtures does in the browser (components/fixtures/FixtureGallery.astro): drawing each fixture of
// the page from the web package's document of it when its stage comes near the view, and the document's step in
// script for it; each stage's width handle; its scheme; the scale of a window that is wider than the column; drawing a
// window's fixture again. A stage is placed and sized by its stylesheet before any of this runs; nothing here moves
// anything that is already drawn.
import { RESIZE_EVENT, resizeHandle } from './resize-handle';

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
 * table's stage 752 wide). Nothing where the fixture is as wide as what it draws (a Button).
 */
function laidOutBy(stage: Element): { sized: HTMLElement; width: number } | undefined {
  const widthOf = (rule: CSSStyleRule) => rule.style.getPropertyValue('inline-size') || rule.style.getPropertyValue('width');
  const rules = stagingRules().filter((rule) => /^[\d.]+px$/.test(widthOf(rule)));
  for (const element of [stage.firstElementChild, stage]) {
    // The last rule that matches is the one in effect, as their order in the staging says.
    const rule = element instanceof HTMLElement ? rules.findLast((each) => matches(element, each.selectorText)) : undefined;
    if (rule) return { sized: element as HTMLElement, width: parseFloat(widthOf(rule)) };
  }
  return undefined;
}

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
  const apply = () => {
    const width = Math.max(LEAST - around(), Math.min(wanted, room(canvas) - around()));
    const next = Math.abs(width - natural) < 0.5 ? '' : `${width}px`;
    if (sized.style.inlineSize !== next) sized.style.inlineSize = next;
  };
  resizeHandle(handle, {
    value: () => canvas.getBoundingClientRect().width,
    min: () => LEAST,
    max: () => room(canvas),
  });
  handle.addEventListener(RESIZE_EVENT, (event) => {
    wanted = (event as CustomEvent<{ value: number }>).detail.value - around();
    apply();
  });
  new ResizeObserver(apply).observe(canvas.parentElement ?? canvas);
  apply();
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
  template.replaceWith(document.importNode(template.content, true));
  scheme(stage, box);
  stage.querySelector('[data-stage-redraw]')?.addEventListener('click', () => {
    const frame = box.querySelector('iframe');
    frame?.setAttribute('inert', '');
    frame?.contentWindow?.location.reload();
  });
}

/** The markup of each stage of a gallery drawn in the page, by fixture id (the gallery's data). */
const drawings = new WeakMap<Element, Record<string, string>>();
function drawingsOf(gallery: Element): Record<string, string> {
  let found = drawings.get(gallery);
  if (!found) {
    try {
      found = JSON.parse(gallery.querySelector(':scope > script[data-fixture-stages]')?.textContent ?? '{}') as Record<string, string>;
    } catch {
      found = {};
    }
    drawings.set(gallery, found);
  }
  return found;
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

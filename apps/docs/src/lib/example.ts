// What the docs' one frame does in the browser (components/visuals/Example.astro): it draws each frame under the design
// system the reader chose for the page, defines what its stage holds once it comes near the view, and draws its
// actions then — its code, in HTML or in React, and the copy of it; its stage right to left; its stage's width.
//
// Nothing here moves what is drawn: the stage holds its markup from the first paint, the actions' room is held by the
// stylesheet, and the code opens under the stage only when a reader asks for it.
import { DEFAULT_SYSTEM_ATTR, drawUnder } from './visuals/frame';
import './define-on-demand';
import { RESIZE_EVENT, resizeHandle } from './resize-handle';
import { htmlOf, reactOf, type ReactNames } from './example-code';
import { SYSTEM_ATTR } from './listing.mjs';

/** Sent on a frame's element once it has come near the view, its stage released and its actions drawn. */
export const NEAR_EVENT = 'docs-example-near';
/**
 * Sent on a frame's element by a part of the page that changes what its stage holds (a playground's controls), with
 * the stage's markup as a product writes it (`detail.source`): the frame's code and its copy follow it.
 */
export const SOURCE_EVENT = 'docs-example-source';

/** How near the view a frame is drawn: within half a window of it. */
const NEAR = '50% 0px';
/** The least width a stage is made narrower to by its handle, in CSS pixels. */
const LEAST = 160;
/** Where the code's flavor a reader chose is kept, for every example of every page. */
const FLAVOR_KEY = 'tanrei-docs-example-code';

type Flavor = 'html' | 'react';
type Choice = HTMLElement & { value: string | null };

// One opt-in stylesheet per preset, scoped to [data-tanrei-system="<id>"]: the one the reader chose is loaded once.
const sheets = import.meta.glob<string>('../../../../packages/web/src/generated/systems/*.css', { query: '?url', import: 'default', eager: true });
const sheetOf = (system: string) => Object.entries(sheets).find(([path]) => path.endsWith(`/${system}.css`))?.[1];

const stageOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>(':scope > figure > [data-part="frame"] > [data-example-stage]');

/** The design system the reader chose for the page (the header's menu, lib/listing.mjs), else the frame's default. */
const pageSystem = (frame: HTMLElement) => document.documentElement.getAttribute(SYSTEM_ATTR) || frame.getAttribute(DEFAULT_SYSTEM_ATTR) || '';

/** Draws a frame under the page's system, unless a page pinned it to a preset. */
function follow(frame: HTMLElement) {
  if (frame.dataset.pinned) return;
  const stage = stageOf(frame);
  const fallback = frame.getAttribute(DEFAULT_SYSTEM_ATTR) ?? '';
  const system = pageSystem(frame);
  if (!stage || (stage.getAttribute('data-tanrei-system') ?? fallback) === system) return;
  void drawUnder(frame, system, system === fallback ? undefined : sheetOf(system));
}

// ── The code ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The markup a part of the page said the stage holds now (`SOURCE_EVENT`), by frame. */
const changed = new WeakMap<HTMLElement, string>();

/** The markup the stage holds: what a part of the page said it holds now, else what it held as the page was built (the frame's inline script), or the one the page gave. */
function sourceOf(frame: HTMLElement): string {
  const now = changed.get(frame);
  if (now !== undefined) return now;
  const given = frame.querySelector<HTMLScriptElement>(':scope > figure > [data-part="frame"] > script[data-example-source]');
  if (given) {
    try {
      return JSON.parse(given.textContent ?? '""') as string;
    } catch {
      return '';
    }
  }
  const stage = stageOf(frame);
  return (stage && (window as Window & { docsExampleSources?: WeakMap<Element, string> }).docsExampleSources?.get(stage)) ?? '';
}

let names: Promise<ReactNames> | undefined;
/** The React package's names, fetched when they are first needed. */
const reactNames = () => (names ??= import('virtual:tanrei-react-names').then((module) => module.default));

const storedFlavor = (): Flavor => {
  try {
    return localStorage.getItem(FLAVOR_KEY) === 'react' ? 'react' : 'html';
  } catch {
    return 'html';
  }
};
let flavor: Flavor = storedFlavor();

async function codeOf(frame: HTMLElement, as: Flavor): Promise<string> {
  const source = sourceOf(frame);
  return as === 'react' ? reactOf(source, await reactNames()) : htmlOf(source);
}

/** The frames drawn so far, whose copy and open code follow the flavor. */
const drawn = new Set<HTMLElement>();

/** Writes the frame's code in the flavor chosen: what its copy button copies and, where it is open, its code block. */
async function writeCode(frame: HTMLElement) {
  const as = flavor;
  const text = await codeOf(frame, as);
  if (as !== flavor) return;
  const copy = frame.querySelector<HTMLElement & { text: string }>('[data-example-copy]');
  if (copy) copy.text = text;
  const panel = frame.querySelector<HTMLElement>('[data-example-code-panel]');
  if (!panel) return;
  const block = panel.querySelector<HTMLElement & { code: string; language: string }>('tanrei-code-block');
  if (block) {
    block.language = as === 'react' ? 'jsx' : 'html';
    block.code = text;
  }
  const flavors = panel.querySelector<Choice>('[data-example-flavors]');
  if (flavors && flavors.value !== as) flavors.value = as;
}

function choose(next: Flavor) {
  if (next === flavor) return;
  flavor = next;
  try {
    localStorage.setItem(FLAVOR_KEY, next);
  } catch {}
  for (const frame of drawn) void writeCode(frame);
}

/** Opens the frame's code under its stage, or closes it: it is made the first time it is opened. */
function toggleCode(frame: HTMLElement, button: HTMLElement) {
  let panel = frame.querySelector<HTMLElement>('[data-example-code-panel]');
  if (!panel) {
    const template = document.querySelector<HTMLTemplateElement>('template[data-example-panel]');
    const stage = stageOf(frame);
    if (!template || !stage) return;
    // Under the stage, and under a playground's controls where the frame has them.
    const controls = frame.querySelector(':scope > figure > [data-part="frame"] > [data-example-controls]');
    (controls ?? stage).after(document.importNode(template.content, true));
    panel = frame.querySelector<HTMLElement>('[data-example-code-panel]');
    if (!panel) return;
    panel.hidden = true;
    panel.id = button.getAttribute('aria-controls') ?? '';
    // The code block is named after the frame: «Code of Icon-only buttons and a toggle».
    const title = frame.querySelector(':scope > figure > [data-part="frame"] > header > [data-part="title"]')?.textContent?.trim() ?? '';
    panel.querySelector('tanrei-code-block')?.setAttribute('label', (template.dataset.label ?? '{title}').replace('{title}', title));
    panel.querySelector('[data-example-flavors]')?.addEventListener('change', (event) => {
      const value = (event.currentTarget as Choice).value;
      if (value === 'html' || value === 'react') choose(value);
    });
    void writeCode(frame);
  }
  panel.hidden = !panel.hidden;
  button.setAttribute('aria-expanded', String(!panel.hidden));
}

// ── The frame's actions ──────────────────────────────────────────────────────────────────────────────────────────────

function drawActions(frame: HTMLElement, stage: HTMLElement) {
  const holder = frame.querySelector<HTMLElement>('[data-example-actions]');
  const template = holder?.querySelector<HTMLTemplateElement>(':scope > template');
  if (!holder || !template) return;
  // The frame's own actions (a page's), then those it offers of the ones every frame shares.
  const offers = (holder.dataset.exampleOffers ?? '').split(' ');
  const shared = document.querySelector<HTMLTemplateElement>('template[data-example-shared]');
  const actions = document.importNode(template.content, true);
  if (shared) {
    const common = document.importNode(shared.content, true);
    if (!offers.includes('direction')) common.querySelector('[data-example-direction]')?.remove();
    if (!offers.includes('code')) for (const element of common.querySelectorAll('[data-example-code], [data-example-copy]')) element.remove();
    common.querySelector('[data-example-code]')?.setAttribute('aria-controls', `${stage.id}-code`);
    actions.append(common);
  }
  template.replaceWith(actions);
  const direction = holder.querySelector<HTMLElement & { selected?: boolean }>('[data-example-direction]');
  direction?.addEventListener('change', () => {
    const turned = direction.selected === true || direction.hasAttribute('selected');
    if (turned) stage.setAttribute('dir', direction.dataset.exampleDirection ?? 'rtl');
    else stage.removeAttribute('dir');
  });
  const code = holder.querySelector<HTMLElement>('[data-example-code]');
  code?.addEventListener('click', () => toggleCode(frame, code));
  if (holder.querySelector('[data-example-copy]')) {
    drawn.add(frame);
    void writeCode(frame);
  }
}

/** The stage's width handle: the stage is never wider than its frame, nor narrower than the least width. */
function widthHandle(stage: HTMLElement) {
  const handle = stage.querySelector<HTMLElement>(':scope > [data-resize-handle]');
  if (!handle) return;
  const room = () => stage.parentElement?.clientWidth ?? stage.getBoundingClientRect().width;
  resizeHandle(handle, { value: () => stage.getBoundingClientRect().width, min: () => LEAST, max: room });
  handle.addEventListener(RESIZE_EVENT, (event) => {
    const width = (event as CustomEvent<{ value: number }>).detail.value;
    if (width >= room() - 0.5) stage.style.removeProperty('--docs-example-width');
    else stage.style.setProperty('--docs-example-width', `${width}px`);
  });
}

/** A frame near the view: its elements are defined, its actions drawn, and a page's script told (`NEAR_EVENT`). */
function draw(frame: HTMLElement) {
  const stage = stageOf(frame);
  if (!stage) return;
  // What it holds is defined now (lib/define-on-demand.ts watches the mark).
  stage.removeAttribute('data-example-pending');
  drawActions(frame, stage);
  widthHandle(stage);
  frame.dispatchEvent(new CustomEvent(NEAR_EVENT));
}

const near = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      near.unobserve(entry.target);
      draw(entry.target as HTMLElement);
    }
  },
  { rootMargin: NEAR },
);

const frames = () => document.querySelectorAll<HTMLElement>('[data-example]');
for (const frame of frames()) {
  follow(frame);
  near.observe(frame);
  frame.addEventListener(SOURCE_EVENT, (event) => {
    changed.set(frame, (event as CustomEvent<{ source: string }>).detail.source);
    if (drawn.has(frame) || frame.querySelector('[data-example-code-panel]')) void writeCode(frame);
  });
}
// The reader's choice of system, wherever it is made (the header's menu, the index's select), is the root's attribute.
new MutationObserver(() => {
  for (const frame of frames()) follow(frame);
}).observe(document.documentElement, { attributes: true, attributeFilter: [SYSTEM_ATTR] });

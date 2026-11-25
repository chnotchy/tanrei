// What the docs' one frame does in the browser (components/visuals/Example.astro): it defines what its stage holds once
// it comes near the view, and draws its actions then — its code, in HTML or in React, and the copy of it; its stage
// right to left; its stage's width. A stage has no system of its own: it is drawn in the page's look, whose stylesheet
// is the root's (lib/appearance.ts), and is told when that changes (`SYSTEM_EVENT`), so that a figure that reads its
// values draws them again; only a frame a page pins to a shipped system is drawn under that system's scope.
//
// Nothing here moves what is drawn: the stage holds its markup from the first paint, the actions' room is held by the
// stylesheet, and the code opens under the stage only when a reader asks for it.
import { LOOK_SHEET_EVENT } from './appearance';
import { SYSTEM_EVENT, systemOf } from './visuals/frame';
import { defineAhead, toBeDefined } from './define-on-demand';
import { RESIZE_EVENT, resizeHandle } from './resize-handle';
import { htmlOf, reactOf, type ReactNames } from './example-code';

/** Sent on a frame's element once it has come near the view, its stage released and its actions drawn. */
export const NEAR_EVENT = 'docs-example-near';
/**
 * Sent on a frame's element by a part of the page that changes what its stage holds (a playground's controls), with
 * the stage's markup as a product writes it (`detail.source`): the frame's code and its copy follow it.
 */
export const SOURCE_EVENT = 'docs-example-source';

/** How near the view a frame is drawn: within half a window of it, above or below; `NEAR` is the observer's margin for it. */
const NEAR_SHARE = 0.5;
const NEAR = `${NEAR_SHARE * 100}% 0px`;
/** The least width a stage is made narrower to by its handle, in CSS pixels. */
const LEAST = 160;
/** Where the code's flavor a reader chose is kept, for every example of every page. */
const FLAVOR_KEY = 'tanrei-docs-example-code';

type Flavor = 'html' | 'react';
type Choice = HTMLElement & { value: string | null };

const stageOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>(':scope > figure > [data-part="frame"] > [data-example-stage]');

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

/** The frames that have come near the view and been drawn. */
const reached = new WeakSet<HTMLElement>();

/**
 * Runs `then` once `frame` has come near the view: now, if it already has, else when it does (`NEAR_EVENT`). A page's
 * script that runs after this module may find its frame drawn already (below), so it asks here rather than waiting
 * for the event alone.
 */
export function whenNear(frame: HTMLElement, then: () => void) {
  if (reached.has(frame)) then();
  else frame.addEventListener(NEAR_EVENT, then, { once: true });
}

/** The mark of a stage that holds its room while it is away from the view, and the property that says how tall it is (components/visuals/Example.astro). */
const HELD_ATTR = 'data-example-held';
const HELD_PROPERTY = '--docs-example-held';

/**
 * A stage away from the view keeps the room it has until it comes near. What it holds is not defined for it until
 * then, but a tag the page defines for a stage near the view (or that a component's module defines as it draws) is
 * defined for every element of it on the page at once, and the browser upgrades them all: without this, each stage
 * away from the view that holds one would grow to the element's size in the same frame (the Calendar's page grew by
 * about 2.7k px so), and where the browser does not anchor the scroll to what the reader is looking at, push it out of
 * the view (WebKit did, under the focus order's test). Held, a stage moves nothing until it is drawn or let go below
 * the view (`releaseSoon`), and the page's stylesheet lets it go the moment its mark is taken away, however that is done.
 */
function hold(frame: HTMLElement, stage: HTMLElement, height: number) {
  stage.style.setProperty(HELD_PROPERTY, `${height}px`);
  stage.setAttribute(HELD_ATTR, '');
  const tags = [...new Set([...stage.querySelectorAll(':not(:defined)')].map((element) => element.localName))];
  if (!tags.length) return;
  held.set(frame, { stage, tags });
  for (const tag of tags) void customElements.whenDefined(tag).then(releaseSoon);
}

/**
 * The room a stage holds is the room of its elements before they are defined. The web package's cloak, scoped to the
 * stages (lib/stage-cloak.mjs), makes that the room they take drawn wherever their tokens give it, before any script
 * runs; where they do not (an element as tall as what it draws: a list's rows, a multiline input's lines), it is a few
 * lines of their text, or nothing, not the room they take drawn, and it is held until the stage comes
 * near the view. A reader who moves farther than that in a frame (a page at a time, a fling) reaches the stage while
 * it holds the wrong room and sees everything below it pushed down as it is drawn. So right after the page's
 * load, the elements the held stages hold are defined (`defineAhead`: their modules fetched, as a stage near the view
 * asks for them, after what the page needed to load), and a held stage whose elements have all been defined — so, or
 * for a stage near the view — takes the room they take at once, while it is still below the view, where its growing
 * moves nothing the reader sees, in every engine: the drawn room itself, at the reader's width and in the page's
 * language. It is still pending until it comes near (its actions undrawn). A stage above the view, which a reader
 * passed by a jump, keeps holding its room.
 */
const held = new Map<HTMLElement, { stage: HTMLElement; tags: string[] }>();
let releasing = false;

/** Lets go, in one frame and after one reading of the layout, every held stage below the view whose elements are all defined. */
function releaseSoon() {
  if (releasing) return;
  releasing = true;
  requestAnimationFrame(() => {
    releasing = false;
    const ready = [...held].filter(([frame, { stage, tags }]) => {
      if (reached.has(frame) || !stage.hasAttribute(HELD_ATTR)) {
        held.delete(frame);
        return false;
      }
      return tags.every((tag) => customElements.get(tag));
    });
    const below = ready.filter(([, { stage }]) => stage.getBoundingClientRect().top >= innerHeight);
    for (const [frame, { stage }] of below) {
      held.delete(frame);
      stage.removeAttribute(HELD_ATTR);
      stage.style.removeProperty(HELD_PROPERTY);
    }
  });
}

/** A frame near the view: its elements are defined, its actions drawn, and a page's script told (`NEAR_EVENT`). */
function draw(frame: HTMLElement) {
  const stage = stageOf(frame);
  if (!stage) return;
  reached.add(frame);
  // What it holds is defined now (lib/define-on-demand.ts watches the mark).
  stage.removeAttribute('data-example-pending');
  drawActions(frame, stage);
  widthHandle(stage);
  frame.dispatchEvent(new CustomEvent(NEAR_EVENT));
  if (stage.hasAttribute(HELD_ATTR)) letGoWhenDefined(stage);
}

/**
 * A held stage that comes near the view keeps the room it holds until what it holds is defined — what it held as the
 * page was parsed, and what a page's script gave it as it came near (the gallery's fixture, lib/fixture-stages.ts) — and
 * then takes the room it is drawn in, in one frame. Its elements' modules may arrive after the reader has reached it
 * (a page down within moments of the load, a slow line): the room it holds is the drawn room wherever the page could
 * know it before any script (the cloak's, lib/stage-cloak.mjs; a fixture's baseline, components/fixtures/FixtureGallery.astro),
 * and the room of its undefined elements would not be (a fixture is not in the page until its stage comes near).
 */
function letGoWhenDefined(stage: HTMLElement) {
  const letGo = () => {
    stage.removeAttribute(HELD_ATTR);
    stage.style.removeProperty(HELD_PROPERTY);
  };
  const tags = toBeDefined(stage);
  if (!tags.length) return letGo();
  void Promise.all(tags.map((tag) => customElements.whenDefined(tag))).then(() => requestAnimationFrame(letGo));
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
  near.observe(frame);
  frame.addEventListener(SOURCE_EVENT, (event) => {
    changed.set(frame, (event as CustomEvent<{ source: string }>).detail.source);
    if (drawn.has(frame) || frame.querySelector('[data-example-code-panel]')) void writeCode(frame);
  });
}
// The frames near the view already are drawn now, not at the observer's first notice: Firefox gives that notice only
// once the page's later scripts have run (it runs those that have arrived one after another, before any other task,
// a timer's included), so on a component's page, with the gallery's, the tables' and the diagrams' scripts after this
// one, the frame the reader is looking at would wait for all of them before even asking for its elements. The
// observer is left the frames further down, each holding the room its stage has now (`hold`). Every frame's place is
// read before any is drawn or held, so the page is laid out once for all of them, not once for each.
const measured = [...frames()].map((frame) => {
  const stage = stageOf(frame);
  // A stage with no box (in a closed panel) has no room to keep: it is laid out when it is shown, and drawn as it comes near.
  return { frame, stage, isNear: nearNow(frame), height: stage?.getClientRects().length ? stage.getBoundingClientRect().height : null };
});
for (const { frame, stage, isNear, height } of measured) {
  if (isNear) {
    near.unobserve(frame);
    draw(frame);
  } else if (stage && height !== null && stage.hasAttribute('data-example-pending')) hold(frame, stage, height);
}
// The held stages' elements are asked for in the task after the page's load, in every engine, so that their stages
// take their drawn room before the reader reaches them (`releaseSoon`). Not when the browser is next idle: on a long
// page on a busy machine that came as late as its time limit allowed, a second or two after the load, and a reader
// who paged down meanwhile drew the stage near the view in the room of its elements before they are defined and saw
// it grow in the view as its module arrived (the Arabic Text field's first example, 80 px held for its 236, moved the
// page by 0.06 so at 390 px).
if (held.size) {
  const ahead = () => {
    for (const [frame, { stage }] of held) if (!reached.has(frame)) defineAhead(stage);
  };
  if (document.readyState === 'complete') setTimeout(ahead);
  else addEventListener('load', () => setTimeout(ahead), { once: true });
}

/** Whether a frame is near the view now, as the observer reckons it (`NEAR`): a box, within half a window of the view. */
function nearNow(frame: HTMLElement) {
  if (!frame.getClientRects().length) return false;
  const { top, bottom, left, right } = frame.getBoundingClientRect();
  const margin = innerHeight * NEAR_SHARE;
  return bottom >= -margin && top <= innerHeight + margin && right >= 0 && left <= innerWidth;
}
// The look's stylesheet, in, replaced or taken away: every frame not pinned to a system is drawn in the new tokens, and
// what reads their values (a figure's measures, its colors) draws them again.
document.addEventListener(LOOK_SHEET_EVENT, () => {
  for (const frame of frames()) if (!frame.dataset.pinned) frame.dispatchEvent(new CustomEvent(SYSTEM_EVENT, { detail: { system: systemOf(frame) } }));
});

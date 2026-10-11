// `@tanrei/web/timeline` — the script side of `@tanrei/web/timeline.css` (specs/timeline.spec.json), for
// a page that uses `class="tanrei-timeline"` without the components. `@tanrei/web` loads it too.
//
// The timeline is a class on the product's own ordered list, and the stylesheet alone draws it: there is no state and
// no event (TML-11). This adds what a stylesheet cannot say and what the spec asks of a debug build:
//
//   - TML-12: while exactly one event of a timeline has `data-status="current"`, that item carries
//     `aria-current="true"`; with none or several, no item does (an `aria-current` the product wrote is left alone);
//   - TML-12: where the engine does not take alternative text for generated content — which is how the stylesheet has
//     an event's status read in words — the words of `data-status-label` are written as a `.tanrei-timeline-status`
//     element at the start of the event instead, which the stylesheet draws nowhere;
//   - TML-15: a timeline inside an event is reported (it is still drawn as a timeline of its own);
//   - TML-21: a size or a density neither the spec nor the active design system has, and a status the spec does not
//     have, are reported (they are drawn as the default, and as an event with no status);
//   - TML-22: a timeline with no event, an event with neither a time, a title nor a body, a status without its words
//     and words without a status are reported.
//
// Nothing else here is needed for a timeline to be drawn or read aloud. It formats no time and reads none (TML-3).
import { report } from './primitives/report.js';

const TIMELINE = 'tanrei-timeline';
const MARKER = 'tanrei-timeline-marker';
const STATUS = 'tanrei-timeline-status';
/** The mark of a `.tanrei-timeline-status` this script wrote (one the product wrote is the product's). */
const WRITTEN = 'data-tanrei-timeline-written';
/** The values the spec defines; a design system may add a size or a density, which is known by its tokens. */
const SIZES = ['medium', 'large'];
const DENSITIES = ['regular', 'compact'];
const STATUSES = ['done', 'current', 'upcoming'];
/** What the observer re-reads a timeline for. */
const ATTRIBUTES = ['class', 'data-size', 'data-density', 'data-status', 'data-status-label'];

/** The items this script marked as current: the only ones it unmarks. */
const marked = new WeakSet<Element>();

/**
 * Whether the stylesheet's way of saying a status in words reaches this engine: generated content with alternative
 * text read from an attribute. Asked once per document's window.
 */
const altText = (() => {
  let known: boolean | undefined;
  return () => (known ??= typeof CSS === 'undefined' || !CSS.supports || CSS.supports('content', `'a' / attr(data-status-label) ', '`));
})();

/** An event's status as the timeline draws it: one of the three, or none (TML-21: an unknown value is none). */
const statusOf = (event: Element) => {
  const given = event.getAttribute('data-status');
  return given !== null && STATUSES.includes(given) ? given : 'none';
};

/** TML-12 where generated content cannot carry the words: an element at the event's start that does. */
function writeStatus(event: Element, words: string) {
  const own = [...event.children].find((child) => child.classList.contains(STATUS) && child.hasAttribute(WRITTEN));
  // Words the product wrote as an element are the product's: nothing is added beside them.
  const theirs = [...event.children].some((child) => child.classList.contains(STATUS) && !child.hasAttribute(WRITTEN));
  if (!words || theirs || altText()) {
    own?.remove();
    return;
  }
  const text = `${words}, `;
  if (own) {
    if (own.textContent !== text) own.textContent = text;
    return;
  }
  const span = event.ownerDocument.createElement('span');
  span.className = STATUS;
  span.setAttribute(WRITTEN, '');
  span.textContent = text;
  // Before the time, after the product's glyph where there is one.
  const glyph = event.firstElementChild?.classList.contains(MARKER) ? event.firstElementChild : null;
  if (glyph) glyph.after(span);
  else event.prepend(span);
}

/** One timeline, read when it is seen and again when it changes. */
function read(list: Element) {
  const style = getComputedStyle(list);
  const size = list.getAttribute('data-size');
  if (size !== null && !SIZES.includes(size) && !style.getPropertyValue(`--tanrei-comp-timeline-marker-height-${size}`).trim()) {
    report(list, 'TML-21', `data-size "${size}" is not a size it or the active design system defines; it is drawn as "medium"`);
  }
  const density = list.getAttribute('data-density');
  if (density !== null && !DENSITIES.includes(density) && !style.getPropertyValue(`--tanrei-comp-timeline-item-gap-${density}`).trim()) {
    report(list, 'TML-21', `data-density "${density}" is not a density it or the active design system defines; it is drawn as "regular"`);
  }
  // TML-15: timelines are not meant to be nested (events inside an event are a list of prose in the body).
  if (list.parentElement?.closest(`.${TIMELINE} > li`)) report(list, 'TML-15', 'it is a timeline inside an event: it is drawn as a timeline of its own; events inside an event are a list in the body');
  const events = [...list.children].filter((child) => child.localName === 'li');
  // TML-22.
  if (!events.length) report(list, 'TML-22', 'it holds no event, so nothing is drawn');
  for (const event of events) {
    const given = event.getAttribute('data-status');
    const status = statusOf(event);
    if (given !== null && given !== 'none' && status === 'none') report(event, 'TML-21', `data-status "${given}" is not a status; the event is drawn as one with no status`);
    const words = event.getAttribute('data-status-label')?.trim() ?? '';
    const element = [...event.children].find((child) => child.classList.contains(STATUS) && !child.hasAttribute(WRITTEN));
    if (status !== 'none' && !words && !element?.textContent?.trim()) report(event, 'TML-22', `the event's status "${status}" is not given in words (data-status-label); it is still drawn`);
    if (status === 'none' && words) report(event, 'TML-22', `data-status-label "${words}" is ignored: the event has no status`);
    writeStatus(event, status === 'none' ? '' : words);
    const content = [...event.childNodes].some((node) => (node instanceof Element ? !node.classList.contains(MARKER) && !node.classList.contains(STATUS) : !!node.textContent?.trim()));
    if (!content) report(event, 'TML-22', 'the event has neither a time, a title nor a body; its marker is still drawn and it is counted');
  }
  // TML-12: the current item of the list, while exactly one event is under way.
  const under = events.filter((event) => statusOf(event) === 'current');
  const one = under.length === 1 ? under[0] : null;
  for (const event of events) {
    if (event === one) {
      if (!event.hasAttribute('aria-current')) {
        event.setAttribute('aria-current', 'true');
        marked.add(event);
      }
    } else if (marked.has(event)) {
      event.removeAttribute('aria-current');
      marked.delete(event);
    }
  }
}

const OBSERVING = Symbol.for('tanrei.observe-timeline');
type Stop = (() => void) & { owner?: object };
type Observed = (Document | ShadowRoot) & { [OBSERVING]?: Stop };
const OWNER = {};

/**
 * Marks the current item of every `.tanrei-timeline` under `root` and adds the timeline's debug reports, now and as
 * the page changes. `@tanrei/web` and `@tanrei/web/timeline` call it for the document when they load; call it yourself
 * for a shadow root of your own. Calling it twice for one root observes once. Returns a function that stops.
 */
export function observeTimeline(root: Document | ShadowRoot = document): () => void {
  const observed = root as Observed;
  const running = observed[OBSERVING];
  if (running?.owner === OWNER) return running;
  if (typeof MutationObserver === 'undefined') return () => {};
  running?.();
  const observer = new MutationObserver((records) => {
    const lists = new Set<Element>();
    for (const record of records) {
      const around = record.target instanceof Element ? record.target.closest(`.${TIMELINE}`) : null;
      if (around) lists.add(around);
      // An event that left its timeline keeps no mark of this script's.
      for (const node of record.removedNodes) {
        if (node instanceof Element && marked.has(node) && !node.parentElement?.classList.contains(TIMELINE)) {
          node.removeAttribute('aria-current');
          marked.delete(node);
        }
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList.contains(TIMELINE)) lists.add(node);
        for (const inner of node.querySelectorAll(`.${TIMELINE}`)) lists.add(inner);
      }
    }
    for (const list of lists) if (list.isConnected) read(list);
  });
  observer.observe(root, { attributes: true, attributeFilter: ATTRIBUTES, childList: true, subtree: true });
  for (const list of root.querySelectorAll(`.${TIMELINE}`)) read(list);
  const stop = () => {
    observer.disconnect();
    if (observed[OBSERVING] === stop) delete observed[OBSERVING];
  };
  observed[OBSERVING] = Object.assign(stop, { owner: OWNER });
  return stop;
}

if (typeof document !== 'undefined') observeTimeline(document);

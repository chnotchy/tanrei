// `@tanrei/web/steps` — the script side of `@tanrei/web/steps.css` (specs/steps.spec.json), for a page
// that uses `class="tanrei-steps"` without the components. `@tanrei/web` loads it too.
//
// The steps are a class on the product's own ordered list, and the stylesheet alone draws them: there is no state and
// no event (STP-11). This adds what the spec asks of a debug build, the one refusal a stylesheet cannot make, and one
// measure:
//
//   - STP-1: where a number is too long for a circle (three digits and more), the marker column of the set is made as
//     wide as its widest marker;
//   - STP-4: when `start` changes while the steps are shown, the numbers are drawn again (two engines do not by
//     themselves);
//   - STP-9: a set of steps inside a step is reported (it is still drawn as a set of its own);
//   - STP-19: a size neither the spec nor the active design system has is reported (it is drawn as medium); a `start`
//     that is not a whole number is reported and taken off, so the steps number from 1;
//   - STP-20: a set with no step, and a step with neither a title nor a body, are reported.
//
// Nothing else here is needed for the steps to be drawn, numbered or read aloud.
import { report } from './primitives/report.js';

const STEPS = 'tanrei-steps';
/** The sizes the spec defines; a design system may add one, which is known by its tokens. */
const SIZES = ['medium', 'large'];
/** What the observer re-reads a set for. */
const ATTRIBUTES = ['class', 'start', 'data-size', 'reversed'];

/**
 * STP-1: the marker column is as wide as the widest marker of the set. Every marker of one or two digits is the
 * marker's height wide, which is the column the stylesheet draws; a number too long for a circle widens its own marker,
 * and how wide the widest then is can only be measured — here, and handed to the stylesheet as `--_steps-measured`, in
 * rems so that it grows with the reader's text size as the tokens do.
 */
function measure(list: HTMLElement) {
  const steps = [...list.children].filter((child) => child.localName === 'li');
  if (!steps.length) return;
  const widest = Math.max(...steps.map((step) => Number.parseFloat(getComputedStyle(step, '::before').width) || 0));
  const least = Number.parseFloat(getComputedStyle(steps[0], '::before').minWidth) || 0;
  // (Not ems: the value is read by the marker too, whose text is smaller than the list's.)
  const size = Number.parseFloat(getComputedStyle(list.ownerDocument.documentElement).fontSize) || 0;
  const value = widest > least + 0.01 && size ? `${Math.round((widest / size) * 10000) / 10000}rem` : '';
  if (list.style.getPropertyValue('--_steps-measured') === value) return;
  if (value) list.style.setProperty('--_steps-measured', value);
  else {
    list.style.removeProperty('--_steps-measured');
    if (!list.getAttribute('style')) list.removeAttribute('style');
  }
}

/** The `start` each set was last read with (null: none). */
const starts = new WeakMap<Element, string | null>();

/**
 * STP-4: a change of `start` while the steps are shown. The number is the list's own counter, read by the marker's
 * generated content; two engines do not draw that content again when the attribute changes, and do when the list's
 * boxes are made again — so they are, at once, and focus that was inside the list is put back.
 */
function recount(list: HTMLElement) {
  const root = list.getRootNode() as Document | ShadowRoot;
  const focused = root.activeElement instanceof HTMLElement && list.contains(root.activeElement) ? root.activeElement : null;
  const [value, priority] = [list.style.getPropertyValue('display'), list.style.getPropertyPriority('display')];
  list.style.setProperty('display', 'none', 'important');
  void list.offsetHeight;
  if (value) list.style.setProperty('display', value, priority);
  else list.style.removeProperty('display');
  if (!list.getAttribute('style')) list.removeAttribute('style');
  focused?.focus({ preventScroll: true });
}

/** One set, read when it is seen and again when it changes. */
function read(list: Element) {
  // STP-19: a whole number, zero and below included; anything else numbers from 1.
  const given = list.getAttribute('start');
  let start = given;
  if (start !== null && !/^[-+]?\d+$/.test(start.trim())) {
    report(list, 'STP-19', `start "${start}" is not a whole number; it is taken off and the steps number from 1`);
    list.removeAttribute('start');
    start = null;
  }
  // A change since it was last read — the refusal above is one.
  if ((starts.has(list) ? starts.get(list) : given) !== start) recount(list as HTMLElement);
  starts.set(list, start);
  const size = list.getAttribute('data-size');
  if (size !== null && !SIZES.includes(size) && !getComputedStyle(list).getPropertyValue(`--tanrei-comp-steps-marker-height-${size}`).trim()) {
    report(list, 'STP-19', `data-size "${size}" is not a size it or the active design system defines; it is drawn as "medium"`);
  }
  // STP-9: steps are not meant to be nested in steps (sub-steps are an ordered list in the body).
  if (list.parentElement?.closest(`.${STEPS} > li`)) report(list, 'STP-9', 'it is a set of steps inside a step: it is drawn as a set of its own, numbered from its own start; sub-steps are an ordered list without the class');
  // STP-20.
  const steps = [...list.children].filter((child) => child.localName === 'li');
  if (!steps.length) report(list, 'STP-20', 'it holds no step, so nothing is drawn');
  for (const step of steps) {
    if (!step.childElementCount && !step.textContent?.trim()) report(step, 'STP-20', 'the step has neither a title nor a body; its marker is still drawn and its number counted');
  }
  measure(list as HTMLElement);
}

const OBSERVING = Symbol.for('tanrei.observe-steps');
type Stop = (() => void) & { owner?: object };
type Observed = (Document | ShadowRoot) & { [OBSERVING]?: Stop };
const OWNER = {};

/**
 * Adds the debug reports of the steps to every `.tanrei-steps` under `root`, now and as the page changes. `@tanrei/web`
 * and `@tanrei/web/steps` call it for the document when they load; call it yourself for a shadow root of your own.
 * Calling it twice for one root observes once. Returns a function that stops.
 */
export function observeSteps(root: Document | ShadowRoot = document): () => void {
  const observed = root as Observed;
  const running = observed[OBSERVING];
  if (running?.owner === OWNER) return running;
  if (typeof MutationObserver === 'undefined') return () => {};
  running?.();
  const observer = new MutationObserver((records) => {
    const lists = new Set<Element>();
    for (const record of records) {
      const around = record.target instanceof Element ? record.target.closest(`.${STEPS}`) : null;
      if (around) lists.add(around);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList.contains(STEPS)) lists.add(node);
        for (const inner of node.querySelectorAll(`.${STEPS}`)) lists.add(inner);
      }
    }
    for (const list of lists) if (list.isConnected) read(list);
  });
  observer.observe(root, { attributes: true, attributeFilter: ATTRIBUTES, childList: true, subtree: true });
  for (const list of root.querySelectorAll(`.${STEPS}`)) read(list);
  // The markers are measured in the faces they are drawn in: once more when those have arrived.
  let stopped = false;
  void (root.ownerDocument ?? (root as Document)).fonts?.ready.then(() => {
    if (!stopped) for (const list of root.querySelectorAll<HTMLElement>(`.${STEPS}`)) measure(list);
  });
  const stop = () => {
    stopped = true;
    observer.disconnect();
    if (observed[OBSERVING] === stop) delete observed[OBSERVING];
  };
  observed[OBSERVING] = Object.assign(stop, { owner: OWNER });
  return stop;
}

if (typeof document !== 'undefined') observeSteps(document);

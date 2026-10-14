// `@tanrei/web/previous-next-links` — the script side of `@tanrei/web/previous-next-links.css` (specs/previous-next-links.spec.json), for a
// page that uses `class="tanrei-previous-next-links"` without the components. `@tanrei/web` loads it too.
//
// The previous and next links are classes on the product's own `nav` and anchors, and the stylesheet alone draws it in every state.
// This adds what a stylesheet cannot, through listeners on the document, as the Link's script does (src/link.ts) — no
// anchor is wrapped, replaced or given a listener of its own:
//
//   - the shared press primitive (PNL-10, PNL-11): `data-pressed` named after `sys.behavior.pressed-feedback`
//     (overlay, ripple, dim, none), on pointer down and on Enter — never Space (PNL-14) — held for press-hold;
//   - the order (PNL-1): items given next-first are put previous-first, so the focus order is the reading order;
//   - `rel="prev"` and `rel="next"` where the product left them out (PNL-2);
//   - the refusals of PNL-3: an address that is only white space, names a script or cannot be read is taken off the
//     anchor, which is then not drawn;
//   - `data-focus-style`, where the browser has no style queries to read `sys.behavior.focus-style` with (PNL-12);
//   - `data-tanrei-unmirrored`, where the active icon set does not mark the arrows as mirrored (PNL-21);
//   - every debug report (PNL-1, PNL-3, PNL-7).
//
// What the browser gives an anchor stays the browser's (PNL-2, PNL-14): Enter fires `click` and then follows the
// address unless the product cancelled the click; a modified or a middle click opens a tab. Nothing here follows a link.
import { syncFocusStyle } from './primitives/focus-ring.js';
import { type IconSet, iconSets, systemIconSets } from './generated/icon-sets.js';
import { LINK_KEYS, readDestination } from './primitives/link.js';
import { PressController } from './primitives/press.js';
import { report } from './primitives/report.js';

const ROOT = 'tanrei-previous-next-links';
const ITEM = 'tanrei-previous-next-links-item';
const LABEL = 'tanrei-previous-next-links-label';
const UNMIRRORED = 'data-tanrei-unmirrored';
type Direction = 'previous' | 'next';
/** The glyph each direction draws (PNL-6), which the stylesheet writes; named here to ask the icon set about it. */
const ARROWS: Record<Direction, string> = { previous: 'arrow_back', next: 'arrow_forward' };
const REL: Record<Direction, string> = { previous: 'prev', next: 'next' };
/** What the observer re-reads a pair of previous and next links for. */
const ATTRIBUTES = ['href', 'class', 'data-direction', 'aria-label', 'aria-labelledby', 'data-tanrei-system'];

/** The item a node is in: an anchor with the item's class. */
function itemOf(node: EventTarget | null): HTMLAnchorElement | null {
  const anchor = node instanceof Element ? node.closest('a') : null;
  return anchor instanceof HTMLAnchorElement && anchor.classList.contains(ITEM) ? anchor : null;
}

/** An item's direction: the two the previous and next links have, `next` where none is written (the prop's default), or null. */
function directionOf(item: Element): Direction | null {
  const written = item.getAttribute('data-direction');
  return written === null || written === 'next' ? 'next' : written === 'previous' ? 'previous' : null;
}

/**
 * The icon set the item's arrow is drawn from, as `activeIconSet()` finds it for a glyph (src/primitives/
 * glyph-mirror.ts): the set of the design system around the item, and for a system Tanrei does not ship the set that
 * holds the icon family the arrow is drawn with — the item's own font is its text's, so the family is read from the
 * token. Null: no set describes it, and nothing is mirrored by itself.
 */
function arrowSet(item: Element): IconSet | null {
  const system = item.closest('[data-tanrei-system]')?.getAttribute('data-tanrei-system') || 'tanrei';
  if (Object.hasOwn(systemIconSets, system)) {
    const id = systemIconSets[system];
    return id && Object.hasOwn(iconSets, id) ? iconSets[id] : null;
  }
  const family = getComputedStyle(item).getPropertyValue('--tanrei-sys-icon-family-unselected').split(',')[0]?.trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (!family) return null;
  return Object.values(iconSets).find((set) => set.families.some((name) => name.toLowerCase() === family)) ?? null;
}

/** An item that can be followed now. */
const live = (item: HTMLAnchorElement) => item.hasAttribute('href');

/** The anchors whose address was refused and taken off: said once, as a refusal. */
const refused = new WeakSet<Element>();

/** One item, read when it is seen and again when it changes (PNL-2, PNL-3, PNL-7, PNL-21). */
function readItem(item: HTMLAnchorElement) {
  const given = item.getAttribute('href');
  if (given !== null) {
    const { href, refusal } = readDestination(given);
    if (href === null) {
      // White space is no destination and no finding (PNL-3): the sequence has no page on that side.
      item.removeAttribute('href');
      if (refusal) {
        refused.add(item);
        report(item, 'PNL-3', refusal === 'script' ? 'href names a script to run, not a place to go; it is taken off and the item is not drawn' : `href "${given}" cannot be read as an address; it is taken off and the item is not drawn`);
      }
    }
  }
  const direction = directionOf(item);
  if (!direction) {
    report(item, 'PNL-3', `data-direction "${item.getAttribute('data-direction')}" is not a direction it has ("previous" or "next"); the item is not drawn`);
    return;
  }
  if (!live(item)) return;
  // PNL-2: how the destination relates to the page.
  if (!item.hasAttribute('rel')) item.setAttribute('rel', REL[direction]);
  // PNL-7: the direction is said in words by the label.
  if (!(item.querySelector(`:scope > .${LABEL}`)?.textContent ?? '').trim()) {
    report(item, 'PNL-7', 'its label is empty, so it does not say its direction in words: the arrow is hidden from assistive technology; give it a span with class "tanrei-previous-next-links-label"');
  }
  // PNL-21: the icon set says whether the arrow is mirrored in a right-to-left layout; the stylesheet mirrors it
  // unless this mark says the active set does not.
  item.toggleAttribute(UNMIRRORED, !arrowSet(item)?.mirrored.has(ARROWS[direction]));
}

/** One landmark (PNL-1, PNL-3): its name, the order of its items, and a second item of a direction. */
function readRoot(root: Element) {
  const items = [...root.querySelectorAll<HTMLAnchorElement>(`:scope > a.${ITEM}`)];
  for (const item of items) readItem(item);
  const seen = new Map<Direction, HTMLAnchorElement>();
  for (const item of items) {
    const direction = directionOf(item);
    if (!direction) continue;
    if (seen.has(direction)) report(item, 'PNL-3', `it is a second "${direction}" item; a pair of previous and next links holds at most one of each, and this one is not drawn`);
    else seen.set(direction, item);
  }
  // PNL-1: previous, then next, in the document and so in the focus order, whatever order the product gave them in.
  const [previous, next] = [seen.get('previous'), seen.get('next')];
  if (previous && next && next.compareDocumentPosition(previous) & Node.DOCUMENT_POSITION_FOLLOWING) next.before(previous);
  if (items.some(live) && !(root.getAttribute('aria-label') ?? '').trim() && !root.hasAttribute('aria-labelledby')) {
    report(root, 'PNL-1', 'the landmark has no accessible name; give it aria-label ("Pages"), which tells it from the page’s other navigation');
  }
}

/** See src/link.ts: `data-pressed` is written before the press primitive reads a style, so the stylesheet's own `:active` answer stands down. */
function answered(item: HTMLAnchorElement) {
  if (!item.hasAttribute('data-pressed')) item.dataset.pressed = 'none';
}

const presses = new WeakMap<HTMLAnchorElement, PressController>();
/** The press of one item (the shared primitive), made when it is first pressed. */
function pressOf(item: HTMLAnchorElement): PressController {
  let press = presses.get(item);
  if (!press) {
    press = new PressController(item, {
      container: () => item,
      // The item's first transition is the hold (previous-next-links.css), so its delay is press-hold as a time.
      holdCarrier: () => item,
      disabled: () => !live(item),
      keys: LINK_KEYS,
    });
    presses.set(item, press);
  }
  return press;
}

const OBSERVING = Symbol.for('tanrei.observe-previous-next-links');
type Stop = (() => void) & { owner?: object };
type Observed = (Document | ShadowRoot) & { [OBSERVING]?: Stop };
const OWNER = {};

/**
 * Adds the script side of the previous and next links to every `.tanrei-previous-next-links` under `root`, now and as the page changes.
 * `@tanrei/web` and `@tanrei/web/previous-next-links` call it for the document when they load; call it yourself for a shadow
 * root of your own. Calling it twice for one root observes once. Returns a function that stops.
 */
export function observePreviousNextLinks(root: Document | ShadowRoot = document): () => void {
  const observed = root as Observed;
  const running = observed[OBSERVING];
  if (running?.owner === OWNER) return running;
  if (typeof MutationObserver === 'undefined') return () => {};
  running?.();
  let held: { item: HTMLAnchorElement; press: PressController } | null = null;
  const release = () => {
    held?.press.release();
    held = null;
  };
  const onPointerDown = (event: Event) => {
    const item = itemOf(event.target);
    if (!item || !live(item)) return;
    const pointer = event as PointerEvent;
    if (pointer.button !== 0 && pointer.pointerType === 'mouse') return;
    answered(item);
    held = { item, press: pressOf(item) };
    held.press.onPointerDown(pointer);
  };
  // `pointerleave` does not reach the document: the press ends when the pointer goes out of the item it holds.
  const onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (held && !(to instanceof Node && held.item.contains(to))) release();
  };
  const onKeyDown = (event: Event) => {
    const item = itemOf(event.target);
    const key = event as KeyboardEvent;
    if (!item || !live(item) || key.repeat || !LINK_KEYS.includes(key.key)) return;
    answered(item);
    pressOf(item).onKeyDown(key);
  };
  const onKeyUp = (event: Event) => {
    const item = itemOf(event.target);
    if (item) presses.get(item)?.onKeyUp(event as KeyboardEvent);
  };
  const onFocusIn = (event: Event) => {
    const item = itemOf(event.target);
    if (item) syncFocusStyle(item, item);
  };
  const onFocusOut = (event: Event) => {
    const item = itemOf(event.target);
    if (item) presses.get(item)?.onBlur();
  };
  const listeners: [string, (event: Event) => void][] = [
    ['pointerdown', onPointerDown],
    ['pointerup', release],
    ['pointercancel', release],
    ['pointerout', onPointerOut],
    ['dragstart', release],
    ['keydown', onKeyDown],
    ['keyup', onKeyUp],
    ['focusin', onFocusIn],
    ['focusout', onFocusOut],
  ];
  for (const [type, listener] of listeners) root.addEventListener(type, listener, true);

  const observer = new MutationObserver((records) => {
    const roots = new Set<Element>();
    let system = false;
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName === 'data-tanrei-system') system = true;
      const around = record.target instanceof Element ? record.target.closest(`.${ROOT}`) : null;
      if (around) roots.add(around);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList.contains(ROOT)) roots.add(node);
        for (const inner of node.querySelectorAll(`.${ROOT}`)) roots.add(inner);
      }
    }
    // Another design system around the page: another icon set may say otherwise of the arrows.
    if (system) for (const every of root.querySelectorAll(`.${ROOT}`)) roots.add(every);
    for (const one of roots) if (one.isConnected) readRoot(one);
  });
  observer.observe(root, { attributes: true, attributeFilter: ATTRIBUTES, childList: true, subtree: true, characterData: true });
  for (const one of root.querySelectorAll(`.${ROOT}`)) readRoot(one);

  const stop = () => {
    observer.disconnect();
    for (const [type, listener] of listeners) root.removeEventListener(type, listener, true);
    release();
    if (observed[OBSERVING] === stop) delete observed[OBSERVING];
  };
  observed[OBSERVING] = Object.assign(stop, { owner: OWNER });
  return stop;
}

if (typeof document !== 'undefined') observePreviousNextLinks(document);

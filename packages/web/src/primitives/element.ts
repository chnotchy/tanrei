import { type CSSResultGroup, type CSSResultOrNative, LitElement, ReactiveElement } from 'lit';
import { settleStyles, stillPointerStyles } from '../styles/motion.js';
import { flatParent } from './flat-tree.js';
import { Settle } from './motion.js';

// The base every element of this package extends, so that what each of them owes from its first frame is written once.
//
//   TanreiElement        an element with a shadow root (LitElement)
//   TanreiLightElement   an element that draws in the light DOM, its stylesheet the document's (ReactiveElement): a
//                        tree view, a table, an accordion
//
// What they carry: MOT-3 (docs/architecture/motion.md) — the element settles from each time it is connected until two
// frames after its first update there (`Settle`, src/primitives/motion.ts), and nothing in it starts a transition
// meanwhile. In a shadow root the rule is `settleStyles`, composed after the component's own styles here, so no
// component lists it — and after it `stillPointerStyles`, which holds a hover under a pointer at rest in a surface that
// opened (`holdStillPointer()`), left out of an element that draws nothing under a pointer (`drawsHover`). A light-DOM
// element's stylesheet has both written into it by the build as one rule (`settleRule()`, scripts/build.js), because its
// rules are the document's.
//
// Settling is no substitute for a first state written where the element renders (`willUpdate`): a state written late
// still shows wrong for the frame it is late, only without fading. The element that appears — a surface an overlay
// opens, marked `data-tanrei-appear` — is left out, so an overlay mounted (or opened) right after it was connected
// still plays its entrance where MOT-4 says it does.
//
// And a focus asked for before the element has drawn. A script that calls `focus()` before the first update (React's
// `ref.current.focus()` right after mounting) finds a shadow root with nothing in it to delegate to, or a part the
// element's own focus goes to that is not there yet; one that calls it while what holds the element has not drawn its
// latest state (a dialog told to open in the same task: `dialog.open = true; field.focus()`), or has not yet shown the
// slot the element is in (an app bar), finds nothing that can take focus. Either way focus lands nowhere. So when
// `focus()` lands nowhere on an element that has not drawn or is not shown, and it, or an element of this package's
// kind that holds it in the flat tree, still has an update to draw, the call is kept with its options (`focusVisible`,
// `preventScroll`) and given once those updates have ended (`updateComplete`, which a composed element extends to its
// members) — tried again in each of the two frames after, where what holds it shows it only then — if the element is
// still on the page, `blur()` has not been called since, no later `focus()` kept by another element has taken its
// place, and focus has not moved elsewhere meanwhile: what has it then is what had it at the call, nothing but the
// page, or what holds the element (a dialog that gave focus to itself as it opened). A focus the page moved anywhere
// else is never taken back. A drawn, shown control that takes no focus (a disabled one) is answered as the platform
// answers it: nothing is kept. A script that tries elements in turn until focus lands in one asks `focusKept()` too. A
// host that is focusable itself (a `tabindex`) takes the focus at once, as before.
//
// Where the element's focus goes is `delegateFocus()`: the host's own `focus()` (its shadow root delegates, or it is
// focusable itself) unless the element overrides it to focus a part it draws. `focus()` itself is written here only
// (test/kept-focus.test.mjs refuses an override of it elsewhere); an override of `blur()` calls `super.blur()` or
// `forgetKeptFocus()`.

/** What has focus in `document`, inside every shadow root it is in. */
function focusedIn(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** Whether `inner` is `outer`, or is drawn inside it: in its shadow root, or slotted into it. */
function within(inner: Element | null, outer: Element): boolean {
  for (let node = inner; node; node = flatParent(node)) if (node === outer) return true;
  return false;
}

/** An element that draws in updates: one of this package (or another Lit element). */
type Updating = Element & { hasUpdated: boolean; isUpdatePending: boolean; updateComplete: Promise<unknown> };

/** `element` and what holds it where it is drawn, those of them with an update still to draw. */
function undrawn(element: Element): Updating[] {
  const found: Updating[] = [];
  for (let node: Element | null = element; node; node = flatParent(node)) {
    // Not every element draws in updates: one that does has `isUpdatePending`.
    const each = node as Partial<Updating> & Element;
    if (each.isUpdatePending !== undefined && (!each.hasUpdated || each.isUpdatePending)) found.push(each as Updating);
  }
  return found;
}

/** The frames after the updates have ended in which a kept focus is tried again: what an element counts as drawn (MOT-3). */
const KEPT_FRAMES = 2;

/**
 * A focus asked for before the element (or what holds it) has drawn: the element, and whether focus has moved since to
 * anything but what holds the element.
 */
interface KeptFocus {
  element: Element;
  moved?: boolean;
}

/**
 * The focus kept: the one asked for last. A later `focus()` of another element that is kept too takes its place, as a
 * later focus that lands would take it from the first; so does a later call on the same element, with its options.
 */
let latest: KeptFocus | null = null;

/**
 * Whether `element` holds the focus asked for last, kept until it has drawn: a script that tries elements in turn
 * until one takes focus (`focus()`, then whether focus is in it) counts this one as taken.
 */
export function focusKept(element: Element): boolean {
  return latest?.element === element;
}

/**
 * Whether focus on `now` leaves a focus kept for `element` owed: on nothing but the page, or on what holds it. (Focus
 * that has reached the element itself ends the keeping where it is seen.)
 */
const waits = (element: Element, now: Element | null) => !now || now === element.ownerDocument.body || within(element, now);

/** The documents whose focus moves are heard (once each): a kept focus is not given where the page moved focus meanwhile. */
const heard = new WeakSet<Document>();

/**
 * Keeps a focus asked for on `element` — with the call's `options`, and `was`, what had focus then — and gives it
 * where the element's focus goes (`aim`, its `delegateFocus()`) once the element and what holds it have no update left
 * to draw (a composed element's waits for its members), and again in each of the next `KEPT_FRAMES` frames while it
 * lands nowhere: what holds it may show it only after an update its own first one started (an app bar shows a slot
 * once it has seen what is in it). It is given while it is still the one asked for last, the element is still on the
 * page and not focused already, and focus is where it was at the call, or has moved since only to nothing but the page
 * or to what holds the element (a surface that gave focus to itself as it opened): focus the page moved anywhere else
 * is left there, even where something moved it on since.
 */
async function keep(element: Element, options: FocusOptions | undefined, was: Element | null, aim: (options?: FocusOptions) => void) {
  const kept: KeptFocus = { element };
  latest = kept;
  const document = element.ownerDocument;
  if (!heard.has(document)) {
    heard.add(document);
    document.addEventListener('focusin', () => latest && !waits(latest.element, focusedIn(document)) && (latest.moved = true), true);
  }
  for (let frame = 0; frame <= KEPT_FRAMES; frame++) {
    if (frame) await new Promise(requestAnimationFrame);
    await Promise.allSettled(undrawn(element).map((each) => each.updateComplete));
    const now = focusedIn(document);
    if (latest !== kept || kept.moved || !element.isConnected || within(now, element) || (now !== was && !waits(element, now))) break;
    // Laid out first: WebKit, focusing a field whose box it has not laid out yet, scrolls to it once it has, whatever
    // `preventScroll` said.
    element.getBoundingClientRect();
    aim(options);
    if (within(focusedIn(document), element)) break;
  }
  if (latest === kept) latest = null;
}

/**
 * An element of this package with a shadow root: MOT-3's settling, its rule composed last in the element's styles, and
 * a `focus()` called before it (or what holds it) has drawn kept until it has.
 */
export abstract class TanreiElement extends LitElement {
  constructor() {
    super();
    new Settle(this);
  }

  /**
   * @internal HTMLElement's own `focus()`, to where `delegateFocus()` says: what lands nowhere while the element, or
   * what holds it, has not drawn is kept until it has.
   */
  override focus(options?: FocusOptions) {
    const was = focusedIn(this.ownerDocument);
    this.delegateFocus(options);
    // Landed: a focus kept for it before is given (one kept for another element sees focus move, and is left).
    if (within(focusedIn(this.ownerDocument), this)) this.forgetKeptFocus();
    // Kept only where it may land once drawn: an element not drawn yet, or one not shown (a closed dialog's field, a
    // slot the bar has not shown yet). One that is drawn and shown and still takes no focus (a disabled control) is
    // answered as the platform answers it, even while what holds it has an update to draw.
    else if ((!this.hasUpdated || !this.checkVisibility({ visibilityProperty: true })) && undrawn(this).length) void keep(this, options, was, (given) => this.delegateFocus(given));
  }

  /** @internal HTMLElement's own `blur()`, which also gives up a focus kept until the element has drawn. */
  override blur() {
    this.forgetKeptFocus();
    super.blur();
  }

  /**
   * @internal Where the element's focus goes: the host's own `focus()` (its shadow root delegates, or the host is
   * focusable itself). An element that focuses a part it draws overrides this, never `focus()`; before the part is
   * drawn it may focus nothing, and the call is kept. An override is listed in the manifest as the element's `focus()`
   * (custom-elements-manifest.config.mjs); this one, the host's own, is not.
   */
  protected delegateFocus(options?: FocusOptions) {
    super.focus(options);
  }

  /** `blur()` gives up a focus kept until the element has drawn. */
  protected forgetKeptFocus() {
    if (latest?.element === this) latest = null;
  }

  /**
   * `false` where the element draws nothing under a pointer: its spec gives it no hovered state and no state layer (an
   * avatar, a swatch). Its shadow root then carries no rule for a hover — not the one that holds a hover under a
   * pointer at rest (`stillPointerStyles`, src/styles/motion.ts), which would hold nothing there. Unset, it draws one.
   * Declared, not initialized: a static field with a value would keep this class, and Lit's element with it, in the
   * bundle of every light-DOM element that imports this module.
   */
  protected declare static readonly drawsHover?: false;

  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    const own = [...super.finalizeStyles(styles), settleStyles];
    return this.drawsHover === false ? own : [...own, stillPointerStyles];
  }
}

/** An element of this package that draws in the light DOM: MOT-3's settling; its stylesheet carries the rule (`settleRule()`). */
export abstract class TanreiLightElement extends ReactiveElement {
  constructor() {
    super();
    new Settle(this);
  }
}

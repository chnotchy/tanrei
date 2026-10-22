import { type CSSResultGroup, type CSSResultOrNative, LitElement, ReactiveElement } from 'lit';
import { settleStyles } from '../styles/motion.js';
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
// component lists it; a light-DOM element's stylesheet has the same rule written into it by the build
// (`settleRule()`, scripts/build.js), because its rules are the document's.
//
// Settling is no substitute for a first state written where the element renders (`willUpdate`): a state written late
// still shows wrong for the frame it is late, only without fading. The element that appears — a surface an overlay
// opens, marked `data-tanrei-appear` — is left out, so an overlay mounted (or opened) right after it was connected
// still plays its entrance where MOT-4 says it does.
//
// And a focus asked for before the element has drawn: a script that calls `focus()` before the first update (React's
// `ref.current.focus()` right after mounting) finds a shadow root with nothing in it to delegate to, or a part the
// element's own `focus()` goes to that is not there yet, and focus lands nowhere. The call is kept, with its options,
// and given once the first update has ended (`updateComplete`, which a composed element extends to its members) — if
// the element is still on the page, `blur()` has not been called since, and focus has not moved meanwhile: what has it
// then is what had it at the call, or nothing but the page. A host that is focusable itself (a `tabindex`) takes the
// focus at once, as before. An override of `focus()` that focuses a part it draws starts with
// `if (this.keepFocusUntilRendered(options)) return;`; one that ends in `super.focus()` has it already; an override of
// `blur()` calls `forgetKeptFocus()` (test/kept-focus.test.mjs reads them all).

/** What has focus in `document`, inside every shadow root it is in. */
function focusedIn(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** A focus asked for before the first update: its options, and what had focus when it was asked for. */
interface KeptFocus {
  options?: FocusOptions;
  was: Element | null;
}

/**
 * An element of this package with a shadow root: MOT-3's settling, its rule composed last in the element's styles, and
 * a `focus()` called before its first update kept until it has drawn.
 */
export abstract class TanreiElement extends LitElement {
  private keptFocus: KeptFocus | null = null;

  constructor() {
    super();
    new Settle(this);
  }

  /** @internal HTMLElement's own `focus()`: what lands nowhere before the element has drawn is kept until it has. */
  override focus(options?: FocusOptions) {
    super.focus(options);
    if (!this.hasUpdated && !this.matches(':focus')) this.keepFocusUntilRendered(options);
  }

  /** @internal HTMLElement's own `blur()`, which also gives up a focus kept until the element has drawn. */
  override blur() {
    this.forgetKeptFocus();
    super.blur();
  }

  /**
   * Before the first update, keeps a focus asked for — the last call's options — and gives it once the update has
   * ended: `true` when it was kept, and the caller focuses nothing now. After it, `false`.
   */
  protected keepFocusUntilRendered(options?: FocusOptions): boolean {
    if (this.hasUpdated) return false;
    const waiting = !!this.keptFocus;
    this.keptFocus = { options, was: focusedIn(this.ownerDocument) };
    if (!waiting) this.updateComplete.then(() => this.giveKeptFocus(), () => undefined);
    return true;
  }

  /** `blur()` gives up a focus kept until the element has drawn. */
  protected forgetKeptFocus() {
    this.keptFocus = null;
  }

  private giveKeptFocus() {
    const kept = this.keptFocus;
    this.keptFocus = null;
    if (!kept || !this.isConnected) return;
    const document = this.ownerDocument;
    const now = focusedIn(document);
    const moved = now !== kept.was && now !== null && now !== document.body && now !== document.documentElement;
    if (!moved) this.focus(kept.options);
  }

  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return [...super.finalizeStyles(styles), settleStyles];
  }
}

/** An element of this package that draws in the light DOM: MOT-3's settling; its stylesheet carries the rule (`settleRule()`). */
export abstract class TanreiLightElement extends ReactiveElement {
  constructor() {
    super();
    new Settle(this);
  }
}

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

/** An element of this package with a shadow root: MOT-3's settling, its rule composed last in the element's styles. */
export abstract class TanreiElement extends LitElement {
  constructor() {
    super();
    new Settle(this);
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

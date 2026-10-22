import { type CSSResult, unsafeCSS } from 'lit';

// The first frame drawn at rest (MOT-3, docs/architecture/motion.md): while an element settles — from the moment it is
// connected until two frames after its first update (`Settle`, src/primitives/motion.ts) — it carries
// `data-tanrei-settling`, and nothing in it starts a transition. A state the element writes after its first render (an
// attribute it reflects in `updated()`, a size it measured in a frame callback or a resize observer) is then drawn as
// it is, not faded in from the state it never was in.
//
// Transitions are turned off by `transition-property: none`, never by a zero duration and never by the `transition`
// shorthand. A zero duration still starts a transition that has a delay (a transition runs where its duration plus its
// delay is above zero, CSS Transitions §3), so a state changed under a delay would arrive a delay late; and the
// shorthand resets `transition-delay`, which the press-hold carrier reads (`pressHold()`, src/primitives/press.ts).
//
// What appears is left alone: the element an `AppearController` moves carries `data-tanrei-appear`, and its entrance is
// that controller's to play or to skip (MOT-4) — an overlay mounted open after the page's first paint still enters.

/** The host's attribute while it settles. */
export const SETTLING = 'data-tanrei-settling';
/** The attribute of the element an `AppearController` moves: settling never turns its transitions off. */
export const APPEARING = 'data-tanrei-appear';

const QUIET = 'transition-property: none !important;';
const withPseudos = (selectors: string[]) => selectors.flatMap((selector) => [selector, `${selector}::before`, `${selector}::after`]).join(',\n');

/**
 * The shadow root's rule: nothing in it, the host and its pseudo-elements included, starts a transition while the host
 * settles — except the element that appears. Compose it last in the component's `styles`.
 */
export const settleStyles: CSSResult = unsafeCSS(`${withPseudos([`:host([${SETTLING}]:not([${APPEARING}]))`, `:host([${SETTLING}]) :not([${APPEARING}])`])} {
  ${QUIET}
}`);

/**
 * The same rule for an element that draws in the light DOM (its stylesheet is the document's: a tree view, a table of
 * contents): `host` is a selector of the element (its tag or class), and the rule reaches everything inside it.
 */
export const settleRule = (host: string): string => `${withPseudos([`:where(${host})[${SETTLING}]:not([${APPEARING}])`, `:where(${host})[${SETTLING}] :not([${APPEARING}])`])} {
  ${QUIET}
}`;

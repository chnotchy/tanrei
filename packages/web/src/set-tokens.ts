// `setTokens()`: a product's way to set tokens from script, at the root or on any element, without the cost WebKit
// puts on the plain write.
//
//   setTokens({ '--tanrei-sys-color-primary': '#0b57d0' })              on the root
//   setTokens({ '--tanrei-comp-menu-surface-min-width': '20rem' }, { on: panel })
//   setTokens({ '--tanrei-sys-color-primary': '' })                     takes the value off again
//
// WebKit restyles a page slowly after one custom property the element already had is written alone: it compares the
// element's set of custom properties with the one before, value by value, for every element that inherits them, when
// the two sets are the same size — 9.9 s for 2,000 elements on the root, 0.08 s when the size differs. So each write
// also changes the size, by names of its own (`--tanrei-tokens-written-<n>`, value `1`) that nothing reads:
//
// - a write can grow the set by at most the number of names it gives a value (each may be new), and shrink it by at
//   most the number it takes off;
// - so adding one marker more than it takes off makes the size grow whatever the write did, and taking off one more
//   than it gives a value makes it shrink;
// - it takes them off when the element holds enough, and adds them otherwise, so an element holds at most a few.
//
// Nothing is read from the page's style, so the write itself forces no style work.
import { debugBuild } from './primitives/report.js';

/** The names of the markers: `--tanrei-tokens-written-0`, `-1`, … */
const MARKER = '--tanrei-tokens-written-';

export interface SetTokensOptions {
  /** The element whose own style holds the tokens: the root (`document.documentElement`) when left out. */
  on?: HTMLElement | SVGElement;
}

/**
 * Sets custom properties on an element's own style: each name of `tokens` to its value, and a name given `''`, `null`
 * or `undefined` taken off. The tokens apply to the element and everything it holds, as a stylesheet's do, and any
 * rule of higher precedence still wins. A name that is not a custom property (`--…`) is ignored, and reported in a debug build.
 */
export function setTokens(tokens: Readonly<Record<string, string | null | undefined>>, { on = document.documentElement }: SetTokensOptions = {}): void {
  const style = on.style;
  let given = 0;
  let taken = 0;
  for (const [name, value] of Object.entries(tokens)) {
    if (!name.startsWith('--')) {
      if (debugBuild()) console.warn(`[tanrei] setTokens(): "${name}" is not a custom property; it is ignored`);
      continue;
    }
    if (value === '' || value === null || value === undefined) {
      style.removeProperty(name);
      taken++;
    } else {
      style.setProperty(name, value);
      given++;
    }
  }
  if (given + taken === 0) return;
  let held = 0;
  while (style.getPropertyValue(`${MARKER}${held}`)) held++;
  if (held > given) {
    // Taking off one more than the write can have added: the set is smaller, whatever the write did.
    for (let n = 0; n <= given; n++) style.removeProperty(`${MARKER}${held - 1 - n}`);
  } else {
    // Adding one more than the write can have taken off: the set is larger.
    for (let n = 0; n <= taken; n++) style.setProperty(`${MARKER}${held + n}`, '1');
  }
}

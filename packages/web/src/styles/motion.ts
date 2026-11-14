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
//
// A surface that opens is the first frame of what it holds, and the pointer resting where it opens is part of the state
// that frame is given: an element of it that the pointer is over is drawn hovered at once, not faded into hover. The
// engines hover it a few frames late, each on its own clock (Chromium in the first frame after the opening one, Firefox
// in the second, WebKit some eight frames on, and in a sheet that slides in, once the slide has ended), so it is not
// left to the two frames of settling: an element inside a surface that opened carries `data-tanrei-still-pointer` until
// the person next acts — moves the pointer, presses, turns a wheel or presses a key (`holdStillPointer()`,
// src/primitives/motion.ts) — and nothing in it starts a transition while it is hovered meanwhile. Every hover change
// the person's pointer makes afterwards moves as it always does.

/** The host's attribute while it settles. */
export const SETTLING = 'data-tanrei-settling';
/** The attribute of the element an `AppearController` moves: settling never turns its transitions off. */
export const APPEARING = 'data-tanrei-appear';
/**
 * The attribute of an element inside a surface that opened, until the person next acts: while it is hovered meanwhile,
 * it starts no transition (`holdStillPointer()`, src/primitives/motion.ts).
 */
export const STILL_POINTER = 'data-tanrei-still-pointer';

const QUIET = 'transition-property: none !important;';
const withPseudos = (selectors: string[]) => selectors.flatMap((selector) => [selector, `${selector}::before`, `${selector}::after`]).join(',\n');

/**
 * The shadow root's rule: nothing in it, the host and its pseudo-elements included, starts a transition while the host
 * settles, or while it is hovered under a pointer that has not moved since the surface it is in opened — except the
 * element that appears. Compose it last in the component's `styles`.
 */
export const settleStyles: CSSResult = unsafeCSS(`${withPseudos([
  `:host([${SETTLING}]:not([${APPEARING}]))`,
  `:host([${SETTLING}]) :not([${APPEARING}])`,
  `:host([${STILL_POINTER}]:hover:not([${APPEARING}]))`,
  `:host([${STILL_POINTER}]:hover) :not([${APPEARING}])`,
])} {
  ${QUIET}
}`);

/**
 * The same rule for an element that draws in the light DOM (its stylesheet is the document's: a tree view, a table of
 * contents): `host` is a selector of the element (its tag or class), and the rule reaches everything inside it.
 */
export const settleRule = (host: string): string => {
  const quiet = `:where(${host}):is([${SETTLING}], [${STILL_POINTER}]:hover)`;
  return `${withPseudos([`${quiet}:not([${APPEARING}])`, `${quiet} :not([${APPEARING}])`])} {
  ${QUIET}
}`;
};

// Reduced motion (MOT-6, docs/architecture/motion.md): motion is reduced where the person asks their system for it
// (`prefers-reduced-motion: reduce`) or where the product reduces it from inside the app (`data-tanrei-motion="reduce"`
// on the root element). The root's tokens (the generated tokens.css) say either as one inherited value,
// `--tanrei-motion: reduce`, which a style container query reads in a shadow root as in the document. A browser without
// style container queries (inside the package's floor: Safari 17, a Firefox before them) reads the media query alone,
// so every reduced form is written under both conditions: the two never disagree, and either is enough.

/** The person's setting, as a media query. */
export const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)';
/** The root element's attribute by which a product reduces motion from inside the app. */
export const REDUCED_MOTION_ATTRIBUTE = 'data-tanrei-motion';
/** The attribute's one value: there is none that turns motion back on against the person's setting. */
export const REDUCED_MOTION_VALUE = 'reduce';
/** The style container query of the root's `--tanrei-motion`, which the tokens set from either. */
export const REDUCED_MOTION_STYLE = `style(--tanrei-motion: ${REDUCED_MOTION_VALUE})`;

/**
 * The rules a component draws where motion is reduced (MOT-6) — only what is particular to it. They are written under
 * the media query and again under the root's style query, in place, so they stand where the component writes them in
 * its cascade. Pass a `css` template inside a `css` stylesheet (it is minified with it), or text inside text.
 */
export const reducedMotion = (rules: CSSResult | string): CSSResult => {
  const text = String(rules).trim();
  return unsafeCSS(`@media ${REDUCED_MOTION_MEDIA} {\n${text}\n}\n@container ${REDUCED_MOTION_STYLE} {\n${text}\n}`);
};

/** What `writeReducedMotion()` finds: the opening of a light-DOM stylesheet's reduced block. */
const REDUCED_BLOCK = `@media ${REDUCED_MOTION_MEDIA} {`;

/**
 * A light-DOM stylesheet (src/styles/*.css, read by scripts/build.js) writes its reduced form as plain CSS, under the
 * media query, so that its source is a stylesheet as it stands; the build writes each such block again right after
 * it, under the root's style query, as `reducedMotion()` does in a shadow root.
 */
export const writeReducedMotion = (source: string): string => {
  let out = '';
  let from = 0;
  for (let at = source.indexOf(REDUCED_BLOCK); at >= 0; at = source.indexOf(REDUCED_BLOCK, from)) {
    let depth = 0;
    let end = at + REDUCED_BLOCK.length - 1;
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}' && --depth === 0) break;
    }
    if (depth !== 0) throw new Error(`writeReducedMotion: the reduced block at ${at} is not closed`);
    const indent = /[ \t]*$/.exec(source.slice(0, at))?.[0] ?? '';
    out += `${source.slice(from, end + 1)}\n${indent}@container ${REDUCED_MOTION_STYLE} {${source.slice(at + REDUCED_BLOCK.length, end)}}`;
    from = end + 1;
  }
  return out + source.slice(from);
};

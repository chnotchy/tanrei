import { css, unsafeCSS } from 'lit';

/**
 * Corner smoothing: how a corner eases into the straight edge, `--tanrei-sys-shape-corner-smoothing`
 * 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous corner. One rule, shared by every component
 * that rounds a box (and by `shape.css` for light-DOM boxes): an element with `data-tanrei-shape` draws its corners
 * at the radius it names in `--tanrei-corner-radius`, eased by the amount where the browser has `corner-shape`
 * (Chromium 139+, WebKit 26.6), and circular — the amount at 0 — where it does not. A box names its radius with
 * `cornerRadius(token)`, which also carries whether that token is a pill (below).
 *
 * The web has no Bézier corners on a box, only the superellipse `corner-shape: superellipse(k)` (k = log2 of the
 * exponent; round is k = 1). A superellipse at the token's radius can never come nearer Apple's corner than a circle
 * does (every k ≠ 1 measured farther: 18 px² for the circle, 27+ for the rest on the 180×80 r20 box), because Apple's
 * curve is as deep as the circle on the diagonal but reaches 1.53 r along the edges. So the amount moves TWO things,
 * both linear in the amount and both the identity at 0:
 *
 *   exponent  n = 2 + s            → `superellipse(log(2 + s, 2))`     (2 = a circle; 2.6 at s = 0.6)
 *   radius    r · (1 + 0.4 s)      → `--_corner-scale`                  (1.24 r at s = 0.6)
 *
 * Linear, because the token defines two points — 0 = circle, 0.6 = the iOS corner — and between them nothing else is
 * measured; the exponent's form is the natural one (each tenth of smoothing adds a tenth to the exponent). Measured
 * in Chromium at 8× on the 180×80 r20 box: at s = 0.6 the symmetric difference is 9.5 px² from Figma's construction
 * (the floor of the whole superellipse family is
 * 9.3, a circle is 15.9 away) and 5.7 px² from CoreGraphics' `RoundedRectangle(style: .continuous)`
 * (`packages/flutter/tool/continuous_corner_reference.swift`; a circle: 18.2, Figma's construction itself: 4.6), and
 * 1.4 px² from CoreGraphics on 180×80 r10 and 180×36 r10 (cupertino's button). Above 0.6 the superellipse family
 * drifts from Figma's construction (22 px² at 0.8, 60 at 1 on the r20 box) — the amounts a shipped system uses are
 * 0 and 0.6. The tool: `scripts/measure-corner-smoothing.mjs`.
 *
 * A pill: a radius of at least half the short side is clamped by the browser, so only the exponent would apply and
 * the caps would flatten where Figma's construction (whose per-corner budget clamps the smoothing to 0) draws a
 * circle. CSS cannot tell an element its radius was clamped, but the build knows which shape tokens are the full step:
 * the CSS emitter writes, next to every comp token whose alias chain reaches `sys.shape.corner.full`, a companion
 * `<token>-pill: 1` (0 for every other comp shape token). A box names it with its radius — `cornerRadius(token)` does
 * both — and `--tanrei-corner-pill: 1` takes the smoothing to 0 for that box: `corner-shape` round, radius unscaled,
 * whatever the amount. It follows the token file, not a runtime override of the radius alone; a light-DOM pill of your
 * own sets `--tanrei-corner-pill: 1` itself.
 *
 * The radius in `border-radius` is scaled, so every derived radius (a focus ring's, a ripple's) must multiply by
 * `--_corner-scale` too, and pseudo-elements inherit the curve with `corner-shape: inherit`.
 */
export const SHAPE_CSS = `:where([data-tanrei-shape]) {
  --tanrei-corner-pill: 0;
}
[data-tanrei-shape] {
  --_corner-scale: 1;
  border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
}
@supports (corner-shape: superellipse(log(2, 2))) {
  [data-tanrei-shape] {
    --_corner-smoothing: calc(var(--tanrei-sys-shape-corner-smoothing, 0) * (1 - var(--tanrei-corner-pill, 0)));
    --_corner-scale: calc(1 + 0.4 * var(--_corner-smoothing));
    corner-shape: superellipse(log(calc(2 + var(--_corner-smoothing)), 2));
  }
}
[data-tanrei-shape]::before,
[data-tanrei-shape]::after {
  corner-shape: inherit;
}`;

/**
 * The declarations with which a box names its shape token: its radius, and whether that token is the full step (a
 * pill, drawn round whatever the smoothing — the emitter's `<token>-pill` companion). Use it wherever the component
 * would otherwise write `--tanrei-corner-radius`, once per state that has its own shape token.
 */
export const cornerRadius = (token: `--${string}`) => `
    --tanrei-corner-radius: var(${token});
    --tanrei-corner-pill: var(${token}-pill, 0);`;

/**
 * The same corner for a box that HOLDS other components — the container of a composed element: the rule
 * written out for one selector, with no custom property. A custom property on such a box is inherited by every member
 * inside it, and a composed element's stylesheet writes none (web-composing.md W3), so it cannot carry
 * `data-tanrei-shape`. `radius` is the box's radius as a CSS length expression, and `pill` the emitter's
 * `<token>-pill` mark of its shape token, as a CSS number expression (`var(--tanrei-comp-…-container-shape-pill, 0)`).
 * What is concentric with the box gets its radius from `heldRadius()`, and its pseudo-elements inherit the curve.
 */
export const heldShape = (selector: string, radius: string, pill: string): string => `
  ${selector} {
    border-radius: ${radius};
  }
  @supports (corner-shape: superellipse(log(2, 2))) {
    ${selector} {
      border-radius: ${heldRadius(radius, pill)};
      corner-shape: superellipse(log(calc(2 + ${heldSmoothing(pill)}), 2));
    }
  }
  ${selector}::before,
  ${selector}::after {
    corner-shape: inherit;
  }`;

/** The amount a box of `heldShape()` is smoothed by: the system's, and none for a pill. */
const heldSmoothing = (pill: string) => `calc(var(--tanrei-sys-shape-corner-smoothing, 0) * (1 - ${pill}))`;

/** The radius a box of `heldShape()` is drawn with where the browser eases corners: `radius`, scaled as the one rule scales it. */
export const heldRadius = (radius: string, pill: string): string => `calc(${radius} * (1 + 0.4 * ${heldSmoothing(pill)}))`;

/** The same rule, for a component's shadow styles. */
export const shape = css`${unsafeCSS(SHAPE_CSS)}`;

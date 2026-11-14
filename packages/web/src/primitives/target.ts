import { type CSSResult, unsafeCSS } from 'lit';

/**
 * The minimum target (BTN-5 and every control after it): the hit area meets `sys.target.pointer` for a fine pointer
 * and `sys.target.touch` for a coarse one, on both axes, centered, without changing the visual size. Drawn by the
 * `::before` of `on` (e.g. `button`), which must be a positioning container; RTL mirrors the centering.
 */
export function minimumTarget(on: string): CSSResult {
  return unsafeCSS(`
  ${on}::before {
    content: '';
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: max(100%, var(--tanrei-sys-target-pointer));
    block-size: max(100%, var(--tanrei-sys-target-pointer));
    transform: translate(-50%, -50%);
  }
  @media (pointer: coarse) {
    ${on}::before {
      inline-size: max(100%, var(--tanrei-sys-target-touch));
      block-size: max(100%, var(--tanrei-sys-target-touch));
    }
  }
  :host(:dir(rtl)) ${on}::before {
    transform: translate(50%, -50%);
  }
`);
}

/**
 * The minimum target of an element that may stand beside others (BTN-5, BGR-4, SPB-6, TBR-9, PGN-20 and every row
 * after them), in place of `minimumTarget(on)`: the hit area meets the target on both axes, centred, on each side as far
 * as `minimumTarget()` would reach, but toward a neighbour no further than a cap — half the gap between the two, so that
 * a press between them goes to the nearer one and never over a neighbour's visible bounds. Drawn by the `::before` of
 * `on`, which must be a positioning container; its sides are logical, so RTL mirrors them.
 *
 * The caps are `TARGET_CAPS`: the start and the end along the inline axis, the top and the bottom along the block axis.
 * They are inherited, so the nearest that sets one decides: the element's own component, for its own row (a button
 * group's standard item, BGR-4; a split button's half, SPB-6; pagination's item, PGN-20; a toolbar's measured reach,
 * TBR-9 — `inherit` where it has no neighbour there), else whatever lays the element out (`rowTargets()`, set on the
 * element itself, which reaches the `::before` in its shadow tree — so a Button in another component's row stops there
 * without that component touching its parts), else nothing: the side reaches the whole target.
 *
 * A cap larger than what the side lacks changes nothing, so where the drawn box is at least the target (the default
 * system's controls) nothing moves; a cap below 0 (two drawn boxes that overlap) is 0: the hit area is never smaller
 * than what is drawn.
 *
 * A cap is a length the `::before` resolves, so it may be written in terms of the element's own size: `100%` in a
 * start or end cap is the element's width, in a top or bottom cap its height. A row whose items are drawn wider than the
 * box it lays them out in (an icon-only Button centred in a glyph's box) writes the cap from the boxes' gap and gives
 * back what the drawing overflows: `calc(gap / 2 - (100% - box) / 2)`, declared on the box, where the row's own
 * custom properties resolve.
 */
export function neighbourTarget(on: string): CSSResult {
  // What a side lacks of the target (`--_reach`: `100%` is the width where an inline inset reads it, the height where a
  // block inset does), held to the side's cap.
  const side = (cap: keyof typeof TARGET_CAPS) => `calc(-1 * min(var(--_reach), max(0px, var(${TARGET_CAPS[cap]}, var(--_target)))))`;
  return unsafeCSS(`
  ${on}::before {
    content: '';
    position: absolute;
    --_target: var(--tanrei-sys-target-pointer);
    --_reach: max(0px, (var(--_target) - 100%) / 2);
    inset-inline: ${side('start')} ${side('end')};
    inset-block: ${side('top')} ${side('bottom')};
  }
  @media (pointer: coarse) {
    ${on}::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
`);
}

/**
 * The caps `neighbourTarget()` reads: how far an element's hit area may reach past its visible bounds toward each side.
 * Inherited, so a row sets them on the element it lays out and they reach that element's shadow tree; an internal
 * contract between a Tanrei element and what lays it out, not a styling API.
 */
export const TARGET_CAPS = {
  start: '--tanrei-target-cap-start',
  end: '--tanrei-target-cap-end',
  top: '--tanrei-target-cap-top',
  bottom: '--tanrei-target-cap-bottom',
} as const;

/**
 * The caps of the elements a component lays out one after another along a row, `gap` apart between their visible
 * bounds (a length expression of the component's tokens): half the gap toward each neighbour. `items` is a selector of
 * the component's shadow tree (its own targets, or the Tanrei elements it draws) or `::slotted(…)` (the product's
 * elements); each item draws its target with `neighbourTarget()`, as a Button does. Every item takes the half gap on
 * both sides, the row's first and last included: there it is less than the room the row leaves, never more — and the
 * items need not be told apart by their place (the product's elements in several slots of one box are not in the
 * row's order among the host's children).
 */
export function rowTargets(items: string, gap: string): CSSResult {
  return unsafeCSS(`
  ${items} {
    ${TARGET_CAPS.start}: calc(${gap} / 2);
    ${TARGET_CAPS.end}: calc(${gap} / 2);
  }
`);
}

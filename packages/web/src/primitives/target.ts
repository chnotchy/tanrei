import { type CSSResult, unsafeCSS } from 'lit';

/**
 * The minimum target (BTN-5 and every control after it): the hit area meets `sys.target.pointer` for a fine pointer
 * and `sys.target.touch` for a coarse one, on both axes, centered, without changing the visual size. Drawn by the
 * `::before` of `on` (e.g. `button`), which must be a positioning container.
 *
 * The hit area is laid out by its insets, each `(100% - size) / 2`, never centred by an inset of 50% and a translation
 * of -50%: the layout rounds an inset to its unit (1/64 px; 1/60 in Firefox) and leaves a translation as it is, and an
 * engine may hit-test a translated box at a whole pixel (Firefox does), so on a control whose size is an odd number of
 * units (a line height or a size token gives one), or that stands at a fraction of a pixel, a hit area centred that way
 * stands a unit, and up to half a pixel, toward one side, and a press a pixel short of the middle of the gap to a
 * neighbour goes to the neighbour (`target.test.ts`). Two insets of one value are the same length on both sides, and they need no direction: the same in RTL,
 * and for an element laid out left to right inside a right-to-left component (a time picker's hour and minute, DTM-21).
 *
 * A component that gives its hit area another size sets it on the same `::before`, after this rule, as
 * `--_hit-inline-size` and `--_hit-block-size` (lengths it resolves there: `100%` is the element's width in the one,
 * its height in the other), and reads the target as `--_target`, which this rule sets on the `::before` for the
 * pointer it has. It never sets `inline-size` or `block-size` there: the insets lay the box out.
 */
export function minimumTarget(on: string): CSSResult {
  return unsafeCSS(`
  ${on}::before {
    content: '';
    position: absolute;
    --_target: var(--tanrei-sys-target-pointer);
    --_hit-inline-size: max(100%, var(--_target));
    --_hit-block-size: max(100%, var(--_target));
    inset-inline: min(0px, calc((100% - var(--_hit-inline-size)) / 2));
    inset-block: min(0px, calc((100% - var(--_hit-block-size)) / 2));
  }
  @media (pointer: coarse) {
    ${on}::before {
      --_target: var(--tanrei-sys-target-touch);
    }
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
 * without that component touching its parts), else the product's, inherited from its own container of the row (BTN-5),
 * else nothing: the side reaches the whole target.
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
 * Inherited, so a row sets them on the element it lays out and they reach that element's shadow tree. They are public
 * under these names (BTN-5): a product that lays Buttons out beside each other itself sets them on its own container of
 * the row — half its gap toward each neighbour, as `rowTargets()` writes them — and a Tanrei row's own, set on its
 * items, is nearer and wins where it sets one (a button group's `inherit` leaves its outer ends to the product's).
 * Renaming one is a change to the Button spec.
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

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
 * The minimum target of an element that sits in a row beside others (a button group's standard item, BGR-4; a split
 * button's half, SPB-6). Put it after `minimumTarget(on)`: the hit area still reaches the target above and below, and
 * along the row as far as it would alone, but toward a neighbour no further than a cap the caller sets on the element
 * (inherited by its `::before`): `--_cap-start` toward the logical start, `--_cap-end` toward the end — half the gap
 * between the two, so that a press between them goes to the nearer one and never over a neighbour's visible bounds.
 * A side without a cap (unset, or `initial`) reaches the whole target. RTL mirrors the sides.
 *
 * `axis: 'block'` is the same for a column (a vertical toolbar's item, TBR-9): the caps apply above (`--_cap-start`)
 * and below (`--_cap-end`), and the hit area reaches the whole target across the column.
 */
export function neighbourTarget(on: string, { axis = 'inline' }: { axis?: 'inline' | 'block' } = {}): CSSResult {
  const reach = 'max(0px, calc((var(--_target) - 100%) / 2))';
  if (axis === 'block') {
    return unsafeCSS(`
  ${on}::before {
    --_target: var(--tanrei-sys-target-pointer);
    block-size: auto;
    inset-block-start: calc(-1 * min(${reach}, var(--_cap-start, var(--_target))));
    inset-block-end: calc(-1 * min(${reach}, var(--_cap-end, var(--_target))));
    transform: translateX(-50%);
  }
  @media (pointer: coarse) {
    ${on}::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  :host(:dir(rtl)) ${on}::before {
    transform: translateX(50%);
  }
`);
  }
  return unsafeCSS(`
  ${on}::before {
    --_target: var(--tanrei-sys-target-pointer);
    inline-size: auto;
    inset-inline-start: calc(-1 * min(${reach}, var(--_cap-start, var(--_target))));
    inset-inline-end: calc(-1 * min(${reach}, var(--_cap-end, var(--_target))));
    transform: translateY(-50%);
  }
  @media (pointer: coarse) {
    ${on}::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  :host(:dir(rtl)) ${on}::before {
    transform: translateY(-50%);
  }
`);
}

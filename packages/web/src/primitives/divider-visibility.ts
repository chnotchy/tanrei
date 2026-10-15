import { type CSSResult, unsafeCSS } from 'lit';
import { compChoice } from './actions.js';
import { styleQueries } from './separation.js';

// Divider visibility: when the line that parts a region that stays in place from content that scrolls is drawn — an
// app bar's bottom edge, a dialog's or a popover's dividers, a side sheet's divider below its header. `always`: whenever
// the two parts meet, at rest included; `scroll`: only while content lies beyond the line. One choice of kind for the
// whole system (`sys.behavior.divider-visibility`), a component token that follows it (`comp.<name>.….visibility`, an
// alias), and a `divider-visibility` attribute on the instance (`auto | always | scroll`).
//
// The three levels meet in one private custom property on the host, `--_divider-visibility`, as separation's do
// (src/primitives/separation.ts): the attribute's name, or — `auto`, unset or unknown — the component token's. A
// component writes its `always` form as its plain rules — always is the first value, so it is also what an unknown name
// draws — and its `scroll` form inside `whenScroll()`: a style container query answered by the cascade with no script,
// so a system switched on any ancestor, a layer that sets the component token apart and the attribute are all followed
// at once. Where the browser has no style queries the component's script writes `data-divider-visibility` on the
// element `whenScroll()` was given (`syncDividerVisibility()`), and the same rules match the attribute.
//
// The script still says where the content is (scrolled from its top, more of it below); the choice only decides which
// of those states draws the line.

/** `sys.behavior.divider-visibility`. The first value is the default, and what an unknown name falls back to. */
export const DIVIDER_VISIBILITIES = ['always', 'scroll'] as const;
export type DividerVisibility = (typeof DIVIDER_VISIBILITIES)[number];
/** The `dividerVisibility` prop of a component that reads the choice: `auto` takes the component token. */
export const DIVIDER_VISIBILITY_VALUES = ['auto', ...DIVIDER_VISIBILITIES] as const;
export type DividerVisibilityProp = (typeof DIVIDER_VISIBILITY_VALUES)[number];

const PRIVATE = '--_divider-visibility';

/** The host's rules: `--_divider-visibility` is the attribute's name, or the component token's. */
export function dividerVisibilityHost(token: `--${string}`): CSSResult {
  return unsafeCSS(`
  :host {
    ${PRIVATE}: var(${token});
  }
${DIVIDER_VISIBILITIES.map((name) => `  :host([divider-visibility='${name}']) {\n    ${PRIVATE}: ${name};\n  }`).join('\n')}
`);
}

/**
 * The rules of the scroll form. `rules` gets the selector of `element` — an element of the shadow root that is an
 * ancestor of (or is) everything the rules style; the always form is the component's plain rules, written before these.
 */
export function whenScroll(element: string, rules: (element: string) => string): CSSResult {
  return unsafeCSS(`
  @container style(${PRIVATE}: scroll) {
${rules(element)}
  }
${rules(`${element}[data-divider-visibility='scroll']`)}
`);
}

/** The divider visibility `host` draws now, by name: its attribute's, or the component token's as the cascade gives it. */
export function dividerVisibilityOf(host: Element): DividerVisibility {
  return compChoice(host, PRIVATE, DIVIDER_VISIBILITIES);
}

/** Whether `value` is a value of the prop; anything else is drawn as `auto`. */
export const isDividerVisibility = (value: unknown): value is DividerVisibilityProp => (DIVIDER_VISIBILITY_VALUES as readonly unknown[]).includes(value);

/**
 * The fallback for a browser without style container queries: the name `host` draws now, written as
 * `data-divider-visibility` on `element` (the one `whenScroll()` was given). Call it when the component has rendered or
 * laid out. Where the queries work it removes the attribute instead.
 */
export function syncDividerVisibility(host: Element, element: HTMLElement | SVGElement | null | undefined) {
  if (!element) return;
  if (styleQueries()) delete element.dataset.dividerVisibility;
  else element.dataset.dividerVisibility = dividerVisibilityOf(host);
}

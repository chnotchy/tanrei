import { type CSSResult, unsafeCSS } from 'lit';
import { compChoice } from './actions.js';

// Separation: how parts that sit side by side inside one component are told apart — by a
// line where they touch (`divider`) or by empty space (`gap`). One choice of kind for the whole system
// (`sys.behavior.separation`), a component token that follows it (`comp.<name>.….separation`, an alias), and a
// `separation` attribute on the instance (`auto | divider | gap`).
//
// The three levels meet in one private custom property on the host, `--_separation`:
//
//   :host                          → the component token's value (the choice's NAME, whatever the cascade says now)
//   :host([separation='divider'])  → divider
//   :host([separation='gap'])      → gap           (any other attribute value is `auto`: no rule matches it)
//
// A component writes its divider form as its plain rules — divider is the first value, so it is also what an unknown
// name draws — and its gap form inside `whenGap()`: a style container query on the host's
// `--_separation`, answered by the cascade with no script, so a system switched on any ancestor, a layer that sets the
// component token apart and the attribute are all followed at once (BGR-21, SPB-30, PRG-17).
//
// A browser without style container queries cannot answer the query. There the component's script reads the same
// property when it renders and writes `data-separation` on the element `whenGap()` was given (`syncSeparation()`); the
// same rules match the attribute. Where the queries work nothing is written: an attribute could only go stale.

/** `sys.behavior.separation`. The first value is the default, and what an unknown name falls back to. */
export const SEPARATIONS = ['divider', 'gap'] as const;
export type Separation = (typeof SEPARATIONS)[number];
/** The `separation` prop of a component that reads the choice: `auto` takes the component token. */
export const SEPARATION_VALUES = ['auto', ...SEPARATIONS] as const;
export type SeparationProp = (typeof SEPARATION_VALUES)[number];

const PRIVATE = '--_separation';

/** The host's rules: `--_separation` is the attribute's name, or — `auto`, unset or unknown — the component token's. */
export function separationHost(token: `--${string}`): CSSResult {
  return unsafeCSS(`
  :host {
    ${PRIVATE}: var(${token});
  }
${SEPARATIONS.map((name) => `  :host([separation='${name}']) {\n    ${PRIVATE}: ${name};\n  }`).join('\n')}
`);
}

/**
 * The rules of the gap form. `rules` gets the selector of `element` — an element of the shadow root that is an ancestor
 * of (or is) everything the rules style; the divider form is the component's plain rules, written before these.
 */
export function whenGap(element: string, rules: (element: string) => string): CSSResult {
  return unsafeCSS(`
  @container style(${PRIVATE}: gap) {
${rules(element)}
  }
${rules(`${element}[data-separation='gap']`)}
`);
}

/** The separation `host` draws now, by name: its attribute's, or the component token's as the cascade gives it. */
export function separationOf(host: Element): Separation {
  return compChoice(host, PRIVATE, SEPARATIONS);
}

let queries: boolean | undefined;

/**
 * Whether this browser answers style container queries: asked once, with a probe that is gone when it returns. The
 * probe's rule stands in a shadow root of the probe's own, never in the document's sheets: a sheet added to the
 * document and taken away again has the browser build the document's rules twice for one answer.
 */
export function styleQueries(): boolean {
  if (queries !== undefined) return queries;
  if (typeof document === 'undefined' || typeof CSSStyleSheet === 'undefined') return (queries = false);
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('@container style(--tanrei-style-query-probe: on) { [data-tanrei-style-query-probe] { --tanrei-style-query-answer: yes; } }');
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.style.setProperty('--tanrei-style-query-probe', 'on');
    outer.style.display = 'none';
    inner.setAttribute('data-tanrei-style-query-probe', '');
    const root = outer.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sheet];
    root.append(inner);
    document.documentElement.append(outer);
    queries = getComputedStyle(inner).getPropertyValue('--tanrei-style-query-answer').trim() === 'yes';
    outer.remove();
  } catch {
    queries = false;
  }
  return queries;
}

/**
 * The fallback for a browser without style container queries: the name `host` draws now, written as `data-separation`
 * on `element` (the one `whenGap()` was given). Call it when the component has rendered. Where the queries work it
 * removes the attribute instead.
 */
export function syncSeparation(host: Element, element: HTMLElement | SVGElement | null | undefined) {
  if (!element) return;
  if (styleQueries()) delete element.dataset.separation;
  else element.dataset.separation = separationOf(host);
}

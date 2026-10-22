import { type CSSResult, unsafeCSS } from 'lit';

/**
 * The blur a modal surface's scrim draws behind it (MDL-1: "WHILE comp.modal-layer.scrim.blur is above 0"), as a
 * backdrop filter only where there is a blur to draw.
 *
 * A blur of 0 — every shipped system's — is no filter at all, rather than `blur(0px)`, which draws nothing: WebKit
 * (Playwright's build on Linux) redraws everything under a backdrop that holds a filter whenever anything on the page
 * changes. On a page of 27 open modal date-time pickers one 1-pixel change took about 1.9 s to draw with `blur(0px)` on
 * their backdrops, and 16–23 ms with no filter. A blur a layer sets is drawn as before.
 *
 * `on` is the element the scrim is drawn for: the `<dialog>` whose `::backdrop` is the scrim (a `::backdrop` inherits
 * from its dialog), or the scrim element itself. `blur` is the token as `var(--name)`. The rule that draws the scrim
 * sets `backdrop-filter: ${SCRIM_FILTER}`. The token is read by a style container query on the element's container,
 * where its value is the one the element inherits — as `appearStyles` reads the appearance's blur.
 */
export function scrimFilter(on: string, blur: string): CSSResult {
  const name = /^var\((--[\w-]+)\)$/.exec(blur.trim())?.[1];
  if (!name) throw new Error(`scrimFilter: ${blur} is not one custom property, as var(--name)`);
  return unsafeCSS(`
  ${on} {
    --_scrim-filter: blur(${blur});
  }
  @container style(${name}: 0px) {
    ${on} {
      --_scrim-filter: none;
    }
  }`);
}

/** A scrim's `backdrop-filter`: what `scrimFilter()` decided for the element it is drawn for. */
export const SCRIM_FILTER = unsafeCSS('var(--_scrim-filter, none)');

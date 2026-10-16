// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiEmptyState as TanreiEmptyStateElement } from '@tanrei/web/components/empty-state';

/**
 * What stands in the place of content that is not there — a search with no results, a list nobody has added to, a page before its first item: what is missing, why or what to do, and the action that does it. Quiet and flat: no fill, no edge, no elevation.
 *
 * Children, by their `slot`:
 * - default — The description: text, with the product's own links and inline content. Empty draws the title alone.
 * - `media` — A glyph of the system's icon set (its ligature text, in an element), drawn at the media size of the element's size; or a picture or a view of the product's own (an `<img>`, an `<svg>`, any other element), which keeps its own size and colors. Decorative: hidden from assistive technology. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `title` — The product's own title content in place of `headline`: a heading of the level the page's outline needs, or text with inline content. It is drawn in the title's style; its role and its level are not changed.
 * - `actions` — The product's own Buttons or links, one or two, the main one first, laid out in a row below the text.
 */
export const EmptyState = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-empty-state',
  elementClass: TanreiEmptyStateElement,
  react: React,
  events: {},
});

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiSearchResultGroup as TanreiSearchResultGroupElement } from '@tanrei/web/components/search';

/**
 * Results that belong together, under one heading — the spec's item kind `result-group`: the sections found in one page, or the results of one kind. With `href` its heading is itself a result (the page), drawn as a result's row, and its `<tanrei-search-result>` children are inset under it as its parts; without one its heading is a quiet title.
 *
 * Children, by their `slot`:
 * - default — The group's `<tanrei-search-result>` children and, while `href` is set, the heading's excerpt (text with `<mark>`).
 */
export const SearchResultGroup = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-search-result-group',
  elementClass: TanreiSearchResultGroupElement,
  react: React,
  events: {},
});

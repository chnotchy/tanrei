// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiSearchSuggestion as TanreiSearchSuggestionElement } from '@tanrei/web/components/search';

/**
 * A suggestion the search offers while the person types — the spec's item kind `suggestion`: a query they searched before, or a completion. Choosing it fires `select` and the product sets the value; a thing the product opens is a `<tanrei-search-result>`. It is data, as an `<option>` in a `<datalist>`: the search draws the row, names it and answers it; the element itself draws nothing.
 */
export const SearchSuggestion = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-search-suggestion',
  elementClass: TanreiSearchSuggestionElement,
  react: React,
  events: {},
});

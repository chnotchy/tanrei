// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiSearchResult as TanreiSearchResultElement } from '@tanrei/web/components/search';

/**
 * A thing the search found that the person can go to — the spec's item kind `result`: a page, a section of a page, a message, a file. It is a link, never an option: with `href` its row is an `<a>` in its shadow root, which the browser follows as it follows any link; without one it is a `<button>`, and `select` is all that happens.
 *
 * Children, by their `slot`:
 * - default — The excerpt: text, with `<mark>` elements for the matches.
 */
export const SearchResult = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-search-result',
  elementClass: TanreiSearchResultElement,
  react: React,
  events: {},
});

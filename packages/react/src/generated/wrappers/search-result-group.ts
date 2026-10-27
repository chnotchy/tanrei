// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiSearchResultGroup as TanreiSearchResultGroupElement } from '@tanrei/web/components/search';

const SearchResultGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-search-result-group',
  elementClass: TanreiSearchResultGroupElement,
  react: React,
  events: {},
});
const SearchResultGroupAttributes = { value: ['value', ''], headline: ['headline', ''], excerpt: ['excerpt'], leadingIcon: ['leading-icon', ''], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], rel: ['rel', null], download: ['download', null] } as const;
/**
 * Results that belong together, under one heading — the spec's item kind `result-group`: the sections found in one page, or the results of one kind. With `href` its heading is itself a result (the page), drawn as a result's row, and its `<tanrei-search-result>` children are inset under it as its parts; without one its heading is a quiet title.
 *
 * Children, by their `slot`:
 * - default — The group's `<tanrei-search-result>` children and, while `href` is set, the heading's excerpt (text with `<mark>`).
 */
export const SearchResultGroup = /* @__PURE__ */ withServerAttributes(SearchResultGroupElement, 'tanrei-search-result-group', TanreiSearchResultGroupElement, SearchResultGroupAttributes);

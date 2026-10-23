// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiSearch as TanreiSearchElement, type TanreiSearchToggleDetail, type TanreiSearchSelectDetail, type TanreiSearchSubmitDetail } from '@tanrei/web/components/search';

/** The attributes of `<tanrei-search>` that are not properties of the element, as props of `Search`. */
export interface SearchMarks {
  /** The id of the form the search belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SearchElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-search',
  elementClass: TanreiSearchElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchToggleDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchSelectDetail>>>,
    onSubmit: 'submit' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchSubmitDetail>>>,
  },
});
const withSearchMarks = /* @__PURE__ */ withMarks<SearchMarks>([], ['form']);
/**
 * Lets people search the product from a bar or a compact trigger, and offers suggestions and results while they type in a view under the bar, in a dialog or over the whole screen.
 *
 * Children, by their `slot`:
 * - `leading` — An icon button at the bar's start (a menu or back button), drawn in place of the search glyph.
 * - `trailing` — Up to two icon buttons at the bar's end, after the clear button (voice input, account). The bar's action buttons — the clear button and these — stand `container.button-gap` apart (0 in the default system), each keeping a touch target's length along the row: two medium Buttons stand 8 apart, the small clear button and a medium one 12 (SRC-34).
 * - default — The product's own content in the view, after the suggestions, the status row and the results (a button that loads more results, a link to the full results page, richer content for an empty query); and the item children: `<tanrei-search-suggestion>`, which the search draws as rows, and `<tanrei-search-result>` and `<tanrei-search-result-group>`, which it places after the status row.
 *
 * Events:
 * - `onToggle` (`toggle`) — The search opened or closed its view: `detail.expanded` (and the element's `expanded`) is the new value, and `detail.reason` says why it closed (`escape`, `back`, `select`, `submit`, `outside`, `tab`, `focus-out`, `shortcut`), or `null` when it opened.
 * - `onSelect` (`select`) — The person chose a suggestion, or activated a result in place (without a modifier key, in the same window): `detail.value` is its value. The search does not change `value`; set the value you want. For a result it is fired before the browser follows the link and is cancelable: cancelling it keeps the link from being followed, so that a router can take it. A result opened in a new tab (a modifier key, the middle button, `target="new"`) fires nothing.
 * - `onSubmit` (`submit`) — The action key (Enter, Search) was pressed with no suggestion active and no result current: `detail.value`. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const Search: Marked<typeof SearchElement, SearchMarks> = /* @__PURE__ */ withSearchMarks(SearchElement);

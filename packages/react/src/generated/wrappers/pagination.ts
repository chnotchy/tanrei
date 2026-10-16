// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiPagination as TanreiPaginationElement, type TanreiPaginationChangeDetail } from '@tanrei/web/components/pagination';

/**
 * Moves through the numbered pages of one list — search results, the posts of a blog, the rows of a table: a row of page numbers with the current page marked and the pages that do not fit left out behind an ellipsis, previous and next, first and last where the product asks for them, and a short form that says which page of how many.
 *
 * Events:
 * - `onChange` (`change`) — The person asked for another page: `detail.page`. Fired before the page changes and before a link is followed; cancelable — `preventDefault()` keeps the page and opens nothing.
 */
export const Pagination = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-pagination',
  elementClass: TanreiPaginationElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiPaginationElement, CustomEvent<TanreiPaginationChangeDetail>>>,
  },
});

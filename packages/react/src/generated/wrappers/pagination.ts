// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiPagination as TanreiPaginationElement, type TanreiPaginationChangeDetail } from '@tanrei/web/components/pagination';

const PaginationElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-pagination',
  elementClass: TanreiPaginationElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiPaginationElement, CustomEvent<TanreiPaginationChangeDetail>>>,
  },
});
const PaginationAttributes = { label: ['label', ''], page: ['page', 1], count: ['count', 1], siblings: ['siblings', 1], boundaries: ['boundaries', 1], variant: ['variant', 'numbered'], size: ['size', 'medium'], firstLast: ['first-last', false], href: ['href', ''], previousLabel: ['previous-label', ''], nextLabel: ['next-label', ''], firstLabel: ['first-label', ''], lastLabel: ['last-label', ''], pageLabel: ['page-label', ''], countText: ['count-text', ''] } as const;
/**
 * Moves through the numbered pages of one list — search results, the posts of a blog, the rows of a table: a row of page numbers with the current page marked and the pages that do not fit left out behind an ellipsis, previous and next, first and last where the product asks for them, and a short form that says which page of how many.
 *
 * Events:
 * - `onChange` (`change`) — The person asked for another page: `detail.page`. Fired before the page changes and before a link is followed; cancelable — `preventDefault()` keeps the page and opens nothing.
 */
export const Pagination = /* @__PURE__ */ withServerAttributes(PaginationElement, 'tanrei-pagination', TanreiPaginationElement, PaginationAttributes);

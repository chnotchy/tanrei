// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiTable as TanreiTableElement } from '@tanrei/web/components/table';

/**
 * Presents data that has rows and columns, with named columns, optional row headers, a caption and footer rows. A price list, a comparison, a list of settings, a status of many things. It scrolls in its own box when it does not fit. A column's header can ask for the rows in its order (`sort`); the table itself never sorts, filters, fetches or pages: it draws the rows it is given, in the order it is given them.
 *
 * Children, by their `slot`:
 * - default — The native `<table>`: an optional `<caption>`, a `<thead>` of one row of `<th scope="col">`, one or more `<tbody>`, an optional `<tfoot>`. It is a child in the document, not a slotted node: the element has no shadow root.
 *
 * Events:
 * - `onSort` (`sort`) — The user pressed the header of a sortable column. `detail`: `{ column, index, direction }` — the header cell's `data-value`, its place among the columns of data (from 0) and the direction asked for (`ascending`, or `descending` where the rows ascend by it). The table changes nothing. Cancelable where the control is an anchor: cancelled, the link is not followed.
 * - `onSelectionchange` (`selectionchange`) — The user changed which rows are chosen, by a row's checkbox or radio button (or a press on the row, or an arrow key on a radio button) or by the header's checkbox. `detail`: `{ values }` — the `data-value` of every chosen row after the change, in row order; under `single`, the one chosen row's. Not emitted for what the product writes.
 */
export const Table = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-table',
  elementClass: TanreiTableElement,
  react: React,
  events: {
    onSort: 'sort' as EventName<TanreiEvent<TanreiTableElement>>,
    onSelectionchange: 'selectionchange' as EventName<TanreiEvent<TanreiTableElement>>,
  },
});

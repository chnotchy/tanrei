// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiTableOfContents as TanreiTableOfContentsElement, type TanreiTableOfContentsCurrentChangeDetail, type TanreiTableOfContentsToggleDetail, type TanreiTableOfContentsSelectDetail } from '@tanrei/web/components/table-of-contents';

const TableOfContentsElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-table-of-contents',
  elementClass: TanreiTableOfContentsElement,
  react: React,
  events: {
    onCurrentChange: 'currentchange' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsCurrentChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsToggleDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsSelectDetail>>>,
  },
});
const TableOfContentsAttributes = { label: ['label', ''], labelHidden: ['label-hidden', false], presentation: ['presentation', 'list'], density: ['density', 'regular'], open: ['open', false], current: ['current', ''], tracking: ['tracking', 'auto'] } as const;
/**
 * Lists the headings of the page being read as links to them and marks the one whose section is being read.
 *
 * Children, by their `slot`:
 * - default — The items: the product's own nested list (`<ul>` of `<li>`, each with its `<a href>` first). It stays in the document.
 * - `title` — The product's own title in place of the label's text: a heading of the level the page's outline needs. Drawn in the title's text style whatever its level; `label` still names the landmark and the compact row.
 *
 * Events:
 * - `onCurrentChange` (`currentchange`) — The current item changed while tracking is auto; `detail.href` is the new item's href, or an empty string. Never for a value the product set, never while tracking is manual.
 * - `onToggle` (`toggle`) — The compact presentation's list was shown or hidden by the user (the row, an item chosen, Escape); `detail.open` is the new state.
 * - `onSelect` (`select`) — An item was activated; `detail.href` is its href. Dispatched from the anchor's click, before the browser follows the link; cancelable, cancelling the click with it.
 */
export const TableOfContents = /* @__PURE__ */ withServerAttributes(TableOfContentsElement, 'tanrei-table-of-contents', TanreiTableOfContentsElement, TableOfContentsAttributes);

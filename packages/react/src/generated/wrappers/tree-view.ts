// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiTreeView as TanreiTreeViewElement, type TanreiTreeViewCreateDetail, type TanreiTreeViewFilterChangeDetail, type TanreiTreeViewChangeDetail, type TanreiTreeViewToggleDetail, type TanreiTreeViewRenameDetail } from '@tanrei/web/components/tree-view';

/**
 * A hierarchy of items that open and close: rows that begin further in at each level, a chevron at the start or the end of every row that holds others (or none, the folder glyph opening), names on one line shown whole in a tooltip where they are cut, the rows of the open parents above what is shown pinned at the top of the scrolling box; read and opened only, or with one item or several chosen. One stop in the focus order, moved through with the arrow keys. A file tree in a page, the tokens of a design system, the folders of a product.
 *
 * Children, by their `slot`:
 * - default — The items: the product's own nested lists (`<ul>` of `<li>`). They are children in the document, not slotted nodes: the element has no shadow root.
 *
 * Events:
 * - `onCreate` (`create`) — The user named the new item `create()` asked for: `detail.label`, `detail.parent`, and the `<li>` it goes under (`detail.within`, null at the first level) and follows (`detail.after`, null where it is first). The tree's own row is gone; add the item, and the tree moves focus to it.
 * - `onFilterchange` (`filterchange`) — The person changed the filter text (typing, deleting, pasting, an input method, the clear button, Escape): `detail.value` (and `filterValue`) is the new text. Not fired when the product sets `filterValue`.
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change.
 * - `onToggle` (`toggle`) — Dispatched on an item's `<li>` (it bubbles): the user, or the browser's find-in-page, opened or closed it; `detail.open` is its new state. The moment to give the items of an `data-expandable` parent.
 * - `onRename` (`rename`) — Dispatched on an item's `<li>` (it bubbles): the user gave it a new name in place; `detail.label` is the name (trimmed, not empty, not the old one) and `detail.previous` the label it had. The tree changes no label: set it to rename the item. Filter (TRV-54 to TRV-71): with `filterable`, the element puts a box of its own before its first list — the filter field (a `<tanrei-text-input type="search">`, `[data-tanrei-filter]`), and after it the status line (`[data-tanrei-filter-status]`, hidden from assistive technology) — and takes them away again. It writes on the product's items only attributes of its own: `data-tanrei-filtered` on an `<li>` a filter hides, and `data-tanrei-filter-open` on a closed parent it draws open (never `data-open` or `hidden`), and `data-tanrei-filter-active` on the active match's row; and marks matches with the CSS Custom Highlight API (the highlights `tanrei-tree-view-match` and `tanrei-tree-view-match-selected`), never by touching the product's text.
 */
export const TreeView = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tree-view',
  elementClass: TanreiTreeViewElement,
  react: React,
  events: {
    onCreate: 'create' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewCreateDetail>>>,
    onFilterchange: 'filterchange' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewFilterChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewToggleDetail>>>,
    onRename: 'rename' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewRenameDetail>>>,
  },
});

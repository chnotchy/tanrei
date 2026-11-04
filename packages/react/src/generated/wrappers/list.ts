// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiList as TanreiListElement, type TanreiListMoveDetail, type TanreiListChangeDetail } from '@tanrei/web/components/list';

const ListElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-list',
  elementClass: TanreiListElement,
  react: React,
  events: {
    onMove: 'move' as EventName<TanreiEvent<TanreiListElement, CustomEvent<TanreiListMoveDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiListElement, CustomEvent<TanreiListChangeDetail>>>,
  },
});
const ListAttributes = { orientation: ['orientation', 'vertical'], wrap: ['wrap', false], gap: ['gap', 'none'], dividers: ['dividers', false], iconSpace: ['icon-space', 'auto'], density: ['density', 'regular'], selection: ['selection', 'none'], label: ['label', ''], value: ['value', null], values: ['values'], reorderable: ['reorderable', false], dragHandleLabel: ['drag-handle-label', ''], dragHandleHint: ['drag-handle-hint', ''], moveToStartLabel: ['move-to-start-label', ''], moveBeforeLabel: ['move-before-label', ''], moveAfterLabel: ['move-after-label', ''], moveToEndLabel: ['move-to-end-label', ''], liftedText: ['lifted-text', ''], movedText: ['moved-text', ''], cancelledText: ['cancelled-text', ''] } as const;
/**
 * Holds a set of your own items in one column, one line, or lines that wrap into a grid; people read them, open them one by one, choose from them, or drag them into another order.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-list-item>` children.
 *
 * Events:
 * - `onMove` (`move`) — The user asked for an item to stand in another place — by the move menu, the keyboard or a drag: `detail.from` is the item's index and `detail.to` the index it is to have, both from 0. Fired once per move; it bubbles and cannot be cancelled. The list has moved nothing: reorder your items.
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the list already holds.
 */
export const List = /* @__PURE__ */ withServerAttributes(ListElement, 'tanrei-list', TanreiListElement, ListAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiMenuCheckboxItem as TanreiMenuCheckboxItemElement, type TanreiMenuCheckboxItemChangeDetail } from '@tanrei/web/components/menu';

/**
 * An option switched on or off on its own — the spec's item kind `checkbox-item`. Its `checked` is its own: the menu switches it when the item is activated and fires the item's `change`. A checked item's row is filled, and it is marked as the design system chooses (`comp.menu.checkbox-item.mark`: the checkbox look, a box in both conditions, in the default system; the icon set's check in m3-like and cupertino) unless the item or its group names a glyph.
 *
 * Events:
 * - `onChange` (`change`) — The item was activated: `detail.checked` (and the element's `checked`) is the new value.
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuCheckboxItem = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menu-checkbox-item',
  elementClass: TanreiMenuCheckboxItemElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiMenuCheckboxItemElement, CustomEvent<TanreiMenuCheckboxItemChangeDetail>>>,
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuCheckboxItemElement, MouseEvent>>,
  },
});

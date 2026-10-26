// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiMenubarMenu as TanreiMenubarMenuElement, type TanreiMenubarMenuToggleDetail } from '@tanrei/web/components/menubar';

const MenubarMenuElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menubar-menu',
  elementClass: TanreiMenubarMenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiMenubarMenuElement, CustomEvent<TanreiMenubarMenuToggleDetail>>>,
  },
});
const MenubarMenuAttributes = { label: ['label', ''], open: ['open', false], disabled: ['disabled', false] } as const;
/**
 * One menu of a menubar — the spec's item kind `menu`: its title in the bar's row, and the items that open below it.
 *
 * Children, by their `slot`:
 * - default — The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The person opened or closed the menu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes to `open` fires none. A submenu item's `toggle` bubbles through the element too: tell them apart by the event's target.
 */
export const MenubarMenu = /* @__PURE__ */ withServerAttributes(MenubarMenuElement, 'tanrei-menubar-menu', TanreiMenubarMenuElement, MenubarMenuAttributes);

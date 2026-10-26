// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSubmenu as TanreiSubmenuElement, type TanreiSubmenuToggleDetail } from '@tanrei/web/components/menu';

const SubmenuElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-submenu',
  elementClass: TanreiSubmenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSubmenuElement, CustomEvent<TanreiSubmenuToggleDetail>>>,
  },
});
const SubmenuAttributes = { open: ['open', false], label: ['label', ''], supportingText: ['supporting-text', ''], leadingIcon: ['leading-icon', ''], trailingText: ['trailing-text', ''], disabled: ['disabled', false] } as const;
/**
 * An item that opens another level of the menu beside it — the spec's item kind `submenu`. It holds that level's items as its children, of any kind, further submenus included; it draws its row, ending in the icon set's `chevron_right`, in the surface that holds it, and its own surface as a manual popover in the top layer, placed against the row (MNU-46, MNU-47). It is not an action: activating it opens its submenu and closes nothing. `open` is its own: the menu sets it when the person opens or closes the submenu and fires `toggle`; the product may also set it. The menu it is in does the rest — the keys, the pointer's path, placement, focus and closing.
 *
 * Children, by their `slot`:
 * - default — The submenu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The person opened or closed the submenu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes, and the whole menu closing, fire none.
 */
export const Submenu = /* @__PURE__ */ withServerAttributes(SubmenuElement, 'tanrei-submenu', TanreiSubmenuElement, SubmenuAttributes);

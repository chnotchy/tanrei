// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiFabMenuItem as TanreiFabMenuItemElement } from '@tanrei/web/components/fab-menu';

const FabMenuItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-fab-menu-item',
  elementClass: TanreiFabMenuItemElement,
  react: React,
  events: {},
});
const FabMenuItemAttributes = { label: ['label', ''], icon: ['icon', ''] } as const;
/**
 * One action of a FAB menu — the spec's item kind `item`: an icon and a label on a raised container. The host carries the item's semantics (a menu item named by its label, with its position) and takes focus from the FAB menu; it is never a Tab stop. Its colors are the item parts of the FAB menu's variant, which it inherits from the menu.
 */
export const FabMenuItem = /* @__PURE__ */ withServerAttributes(FabMenuItemElement, 'tanrei-fab-menu-item', TanreiFabMenuItemElement, FabMenuItemAttributes);

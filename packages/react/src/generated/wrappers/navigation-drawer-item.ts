// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiNavigationDrawerItem as TanreiNavigationDrawerItemElement } from '@tanrei/web/components/navigation-drawer';

/**
 * One destination of a navigation drawer — the spec's item kind `destination`: an icon, a label (a short label while the drawer is collapsed), optional trailing content at the end of its row and an optional badge on its icon. A child of `<tanrei-navigation-drawer>`, of one of its sections or of one of its groups, in order.
 *
 * Children, by their `slot`:
 * - `trailing` — Content at the end of the expanded row, in place of `trailing-text`: a glyph of the icon set (drawn at comp.navigation-drawer.item.trailing-icon.size, e.g. `open_in_new`), a short text. Not interactive. A count belongs in `trailing-text`, and a badge on the icon (`badge`): a badge needs an anchor, and the end of the row has none.
 */
export const NavigationDrawerItem = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-drawer-item',
  elementClass: TanreiNavigationDrawerItemElement,
  react: React,
  events: {},
});

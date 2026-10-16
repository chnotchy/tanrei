// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiMenubar as TanreiMenubarElement } from '@tanrei/web/components/menubar';

/**
 * Keeps an application's commands within reach in one persistent row of named menus (File, Edit, View…), each opening a menu below its title, with the arrow keys moving along the row and into each menu.
 *
 * Children, by their `slot`:
 * - default — The entries, in the order given: `<tanrei-menubar-menu>` and `<tanrei-menubar-item>` elements. Anything else gets no title, no key and no place in the row, and is reported in debug builds (MBR-20).
 */
export const Menubar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menubar',
  elementClass: TanreiMenubarElement,
  react: React,
  events: {},
});

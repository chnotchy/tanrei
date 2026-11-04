// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiMenubarItem as TanreiMenubarItemElement } from '@tanrei/web/components/menubar';

const MenubarItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menubar-item',
  elementClass: TanreiMenubarItemElement,
  react: React,
  events: {},
});
const MenubarItemAttributes = { label: ['label'], disabled: ['disabled', false], targetLabel: ['target-label', ''] } as const;
/**
 * A bar item of a menubar — the spec's item kind `item`: an entry of the row that acts by itself instead of opening a menu. It is drawn exactly as a menu's title is and reached by the same keys; nothing at rest tells them apart but their words, so name an action with a verb ("Run") and a link with its place ("Documentation").
 *
 * Children, by their `slot`:
 * - default — A link item's anchor: one `<a href>` child of the product's own. An action has no child.
 */
export const MenubarItem = /* @__PURE__ */ withServerAttributes(MenubarItemElement, 'tanrei-menubar-item', TanreiMenubarItemElement, MenubarItemAttributes);

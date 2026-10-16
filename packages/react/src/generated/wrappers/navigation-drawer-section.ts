// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiNavigationDrawerSection as TanreiNavigationDrawerSectionElement } from '@tanrei/web/components/navigation-drawer';

/**
 * A group of a drawer's destinations and groups under an optional heading — the spec's item kind `section`: the divider component before it while `divider` is set, its heading (a heading, level 2 unless `heading-level` says otherwise) and its children. Sections do not nest and do not go inside a group: such a section draws only its items, in its place, and a debug build says so (NVD-17). Collapsed, its heading keeps its row and draws no text (NVD-16).
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 */
export const NavigationDrawerSection = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-drawer-section',
  elementClass: TanreiNavigationDrawerSectionElement,
  react: React,
  events: {},
});

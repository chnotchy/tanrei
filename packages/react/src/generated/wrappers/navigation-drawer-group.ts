// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiNavigationDrawerGroup as TanreiNavigationDrawerGroupElement, type TanreiNavigationDrawerToggleDetail } from '@tanrei/web/components/navigation-drawer';

const NavigationDrawerGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-drawer-group',
  elementClass: TanreiNavigationDrawerGroupElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiNavigationDrawerGroupElement, CustomEvent<TanreiNavigationDrawerToggleDetail>>>,
  },
});
const NavigationDrawerGroupAttributes = { open: ['open', false], openIcon: ['open-icon', ''], loading: ['loading', false], value: ['value'], href: ['href', ''], supportingText: ['supporting-text', ''], supportingPosition: ['supporting-position', 'below'], trailingText: ['trailing-text', ''], label: ['label', ''], shortLabel: ['short-label', ''], icon: ['icon', ''], disabled: ['disabled', false] } as const;
/**
 * A group of a drawer's destinations — the spec's item kind `group`: a row that opens and closes it (an icon, a label, a short label for the collapsed drawer, and the icon set's `expand_more` turned half a turn while open), and under it, indented one level further, its `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children. A collapsed drawer draws it as one cell; activating that cell expands the drawer with the group open.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The user opened or closed the group from its row, or from its cell in the collapsed drawer, or the drawer opened it to show the selected destination (`reveal-selected`, NVD-58): `detail.open` (and `open`) is its new state. Bubbles.
 */
export const NavigationDrawerGroup = /* @__PURE__ */ withServerAttributes(NavigationDrawerGroupElement, 'tanrei-navigation-drawer-group', TanreiNavigationDrawerGroupElement, NavigationDrawerGroupAttributes);

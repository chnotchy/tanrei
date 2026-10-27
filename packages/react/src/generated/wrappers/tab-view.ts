// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiTabView as TanreiTabViewElement, type TanreiTabViewChangeDetail } from '@tanrei/web/components/tab-view';

const TabViewElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tab-view',
  elementClass: TanreiTabViewElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTabViewElement, CustomEvent<TanreiTabViewChangeDetail>>>,
  },
});
const TabViewAttributes = { value: ['value', null], variant: ['variant', 'primary'], size: ['size', 'medium'], track: ['track', null], fullWidth: ['full-width', false], label: ['label', ''], tabs: ['tabs', ''], noSwipe: ['no-swipe', false], transition: ['transition', 'auto'], group: ['group', ''], rememberAs: ['remember-as', ''] } as const;
/**
 * Shows the view of the selected tab under its own row of tabs, or linked to a row of `<tanrei-tabs>` placed elsewhere, and lets a person swipe from view to view with the tabs' indicator following the finger.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-tab-panel>` children: the panels, one per tab, each with the value of its tab.
 * - `tabs` — The view's own row, which it places there itself (a `<tanrei-tabs>`); not for the product.
 *
 * Events:
 * - `onChange` (`change`) — The user selected another panel — by a tab of the view's own row, or by a swipe: `detail.value` (and the view's and the tabs' `value`) is its value.
 */
export const TabView = /* @__PURE__ */ withServerAttributes(TabViewElement, 'tanrei-tab-view', TanreiTabViewElement, TabViewAttributes);

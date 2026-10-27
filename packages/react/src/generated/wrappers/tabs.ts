// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiTabs as TanreiTabsElement, type TanreiTabsChangeDetail } from '@tanrei/web/components/tabs';

const TabsElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tabs',
  elementClass: TanreiTabsElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTabsElement, CustomEvent<TanreiTabsChangeDetail>>>,
  },
});
const TabsAttributes = { variant: ['variant', 'primary'], size: ['size', 'medium'], track: ['track', null], fullWidth: ['full-width', false], orientation: ['orientation', 'horizontal'], value: ['value', null], transition: ['transition', 'auto'], label: ['label', ''], group: ['group', ''], rememberAs: ['remember-as', ''] } as const;
/**
 * Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it shows.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-tab>` children (the tabs) and `<tanrei-tab-panel>` children (the panels).
 *
 * Events:
 * - `onChange` (`change`) — The user selected another tab: `detail.value` (and the row's `value`) is its value.
 */
export const Tabs = /* @__PURE__ */ withServerAttributes(TabsElement, 'tanrei-tabs', TanreiTabsElement, TabsAttributes);

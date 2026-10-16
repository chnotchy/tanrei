// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiTabPanel as TanreiTabPanelElement } from '@tanrei/web/components/tabs';

/**
 * The view a tab shows. Placed as a child of `<tanrei-tabs>` after its tabs, or of a `<tanrei-tab-view>`, and matched to the tab whose `value` is its own. The row (or the view) gives it the tab panel role, names it by its tab, hides it while its tab is not selected, and makes it a Tab stop itself while it holds nothing focusable.
 *
 * Children, by their `slot`:
 * - default — The view.
 */
export const TabPanel = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tab-panel',
  elementClass: TanreiTabPanelElement,
  react: React,
  events: {},
});

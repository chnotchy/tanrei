// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiNavigationBarItem as TanreiNavigationBarItemElement } from '@tanrei/web/components/navigation-bar';

const NavigationBarItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-bar-item',
  elementClass: TanreiNavigationBarItemElement,
  react: React,
  events: {},
});
const NavigationBarItemAttributes = { value: ['value'], label: ['label', ''], icon: ['icon', ''], disabled: ['disabled', false], badge: ['badge', false], badgeCount: ['badge-count', null], badgeLabel: ['badge-label', ''], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], rel: ['rel', null], download: ['download', null] } as const;
/**
 * One destination of a navigation bar — the spec's item kind `destination`: an icon, a label under it and an optional badge on the icon, inside the item container. Placed as a child of `<tanrei-navigation-bar>`, in order; the bar decides whether it is the selected one and answers its activation.
 */
export const NavigationBarItem = /* @__PURE__ */ withServerAttributes(NavigationBarItemElement, 'tanrei-navigation-bar-item', TanreiNavigationBarItemElement, NavigationBarItemAttributes);

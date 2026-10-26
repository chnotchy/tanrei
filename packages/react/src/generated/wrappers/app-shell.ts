// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiAppShell as TanreiAppShellElement, type TanreiAppShellWindowClassChangeDetail, type TanreiAppShellNavigationOpenChangeDetail } from '@tanrei/web/components/app-shell';

const AppShellElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-app-shell',
  elementClass: TanreiAppShellElement,
  react: React,
  events: {
    onWindowClassChange: 'windowclasschange' as EventName<TanreiEvent<TanreiAppShellElement, CustomEvent<TanreiAppShellWindowClassChangeDetail>>>,
    onNavigationOpenChange: 'navigationopenchange' as EventName<TanreiEvent<TanreiAppShellElement, CustomEvent<TanreiAppShellNavigationOpenChangeDetail>>>,
  },
});
const AppShellAttributes = { scrolls: ['scroll', 'page'], headerPosition: ['header-position', 'sticky'], mainWidth: ['main-width', 'contained'], asideOrder: ['aside-order', 'after'], footerHidden: ['footer-hidden', false], separation: ['separation', 'auto'], navigationOpen: ['navigation-open', false], asideLabel: ['aside-label', ''] } as const;
/**
 * Frames a page or an app: places a header, the navigation, the main content, an aside and a footer, decides from the window's width how each of them is shown, and lets a keyboard reach the content in one step. It draws the frame and none of what stands in it.
 *
 * Children, by their `slot`:
 * - default — The main region: the one `<main>` child without a `slot` attribute. Its `id` is the skip link's destination.
 * - `skip-link` — The skip link: a standalone Link (`class="tanrei-link" data-standalone`) whose `href` is the main region's id, with the product's words. Shown only while it has keyboard focus.
 * - `announcement` — The notice above the header: an element around a callout, across the frame's width.
 * - `header` — The header: a `<header>` around the product's app bar, with the menu button in the bar's navigation slot.
 * - `navigation` — The navigation: a `<tanrei-navigation-drawer responsive>`. Anything else is placed beside the content in an expanded window and is not shown in a narrower one.
 * - `aside` — The aside: an `<aside>` with the product's supporting content, or a side sheet.
 * - `footer` — The footer: a `<footer>` with the product's own layout.
 * - `navigation-bar` — A navigation bar for the bottom edge of a compact window.
 *
 * Events:
 * - `onWindowClassChange` (`windowclasschange`) — The frame decided the window's class for the first time, or the window's width changed it: `detail.windowClass` (and `windowClass`) is `compact`, `medium` or `expanded`.
 * - `onNavigationOpenChange` (`navigationopenchange`) — The navigation asks to be presented over the content, or to be put away: the menu button was activated (`detail.navigationOpen` true), or the open navigation closed or the window's class changed (false). `navigationOpen` already holds it.
 */
export const AppShell = /* @__PURE__ */ withServerAttributes(AppShellElement, 'tanrei-app-shell', TanreiAppShellElement, AppShellAttributes);

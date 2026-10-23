// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiNavigationDrawer as TanreiNavigationDrawerElement, type TanreiNavigationDrawerFilterChangeDetail, type TanreiNavigationDrawerExpandedChangeDetail, type TanreiNavigationDrawerPresentationChangeDetail, type TanreiNavigationChangeDetail } from '@tanrei/web/components/navigation-drawer';

/**
 * A panel of destinations at the start edge, in two variants — `standard`, a layout region beside the content, and `modal`, a modal overlay over a scrim that closes itself after a destination is chosen — and, while `collapsible`, in two forms: expanded, and collapsed to a column of icons, which is the expanded drawer with its labels gone: every row is the same row cut after its icon, at the same height and with the same corners, and every icon exactly in place while the drawer moves between the two. A collapsed cell shows its name in a plain tooltip on hover and keyboard focus; `collapsed-labels` draws short labels under the icons instead, for a product or a system whose column is labelled.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>`, `<tanrei-navigation-drawer-group>` and `<tanrei-navigation-drawer-section>` children.
 * - `header-button` — Icon-only `<tanrei-button>`s stacked in the icon column; the first is the menu button while the drawer is collapsible.
 * - `main-action` — A `<tanrei-main-action-button>` below the header buttons, collapsed to its icon with the drawer. Only the first is drawn.
 * - `header` — Content beside the first header button while the drawer is expanded (a title, an account switcher). Its box gives what it holds the header's inherited text style and color (`comp.navigation-drawer.header.typescale` and `.color`): plain text is drawn in them, and an element that sets its own keeps it.
 *
 * Events:
 * - `onFilterChange` (`filterchange`) — The person changed the filter text (typing, deleting, pasting, an input method, the clear button, Escape): `detail.value` (and `filterValue`) is the new text. Not fired when the product sets `filterValue`.
 * - `onClose` (`close`) — A modal drawer closed: the scrim, Escape, back, a drag, the menu button, or after a destination was activated. `open` is already false.
 * - `onExpandedChange` (`expandedchange`) — The user asked a collapsible drawer for its other form (its menu button, or a group's cell while collapsed): `detail.expanded`. `expanded` (or, for a modal drawer, `open`) already holds it.
 * - `onPresentationChange` (`presentationchange`) — A responsive drawer decided its presentation for the first time, or the window's width changed it: `detail.presentation` (and `presentation`) is `standard`, `column` or `modal`. A product shows its own menu button while it is `modal`.
 * - `onChange` (`change`) — The user activated another destination: `detail.value` (and, for a button destination, the drawer's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * - `onReselect` (`reselect`) — The user activated the selected destination again; for a link, as `change`.
 */
export const NavigationDrawer = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-drawer',
  elementClass: TanreiNavigationDrawerElement,
  react: React,
  events: {
    onFilterChange: 'filterchange' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationDrawerFilterChangeDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiNavigationDrawerElement>>,
    onExpandedChange: 'expandedchange' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>>>,
    onPresentationChange: 'presentationchange' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationDrawerPresentationChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationChangeDetail>>>,
    onReselect: 'reselect' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationChangeDetail>>>,
  },
});

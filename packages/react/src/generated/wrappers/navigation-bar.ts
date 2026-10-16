// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiNavigationBar as TanreiNavigationBarElement, type TanreiNavigationChangeDetail } from '@tanrei/web/components/navigation-bar';

/**
 * Three to five top-level destinations along the bottom edge of a compact window, one of them the current screen.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-bar-item>` children: the destinations.
 *
 * Events:
 * - `onChange` (`change`) — The user activated another destination, or released a drag of the active indicator on one: `detail.value` (and, for a button destination, the bar's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * - `onReselect` (`reselect`) — The user activated the selected destination again: `detail.value` is its value; for a link, as `change`. A drag that returns the indicator to it does not fire it.
 */
export const NavigationBar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-navigation-bar',
  elementClass: TanreiNavigationBarElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiNavigationBarElement, CustomEvent<TanreiNavigationChangeDetail>>>,
    onReselect: 'reselect' as EventName<TanreiEvent<TanreiNavigationBarElement, CustomEvent<TanreiNavigationChangeDetail>>>,
  },
});

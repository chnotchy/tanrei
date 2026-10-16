// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiFabMenu as TanreiFabMenuElement, type TanreiFabMenuCloseDetail, type TanreiFabMenuToggleDetail } from '@tanrei/web/components/fab-menu';

/**
 * Opens a short list of related actions from a floating action button, which turns into the list's close button while they show.
 *
 * Children, by their `slot`:
 * - `icon` — The toggle's glyph while closed: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - default — The items: `<tanrei-fab-menu-item>` children, two to six, the first drawn at the top.
 *
 * Events:
 * - `onClose` (`close`) — The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 * - `onToggle` (`toggle`) — The toggle asks to open or close the menu: `detail.open` is the value asked for. Set `open` to it.
 */
export const FabMenu = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-fab-menu',
  elementClass: TanreiFabMenuElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiFabMenuElement, CustomEvent<TanreiFabMenuCloseDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiFabMenuElement, CustomEvent<TanreiFabMenuToggleDetail>>>,
  },
});

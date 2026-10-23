// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiMenu as TanreiMenuElement, type TanreiMenuCloseDetail, type TanreiMenuContextRequestDetail } from '@tanrei/web/components/menu';

/**
 * Offers a short set of actions or choices on a temporary surface that opens from the element that asked for it, with further levels in submenus where the set needs them.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onClose` (`close`) — The menu asks to be closed, every open submenu with it: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 * - `onContextRequest` (`contextrequest`) — With `trigger="context"`: a person asked for the context menu in the area. `detail` is `{ x, y, element, input }` — client coordinates, the element under the pointer or with focus, and `pointer`, `long-press` or `keyboard`. Set `open` to true; cancel it to leave the request to the browser's own context menu.
 */
export const Menu = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menu',
  elementClass: TanreiMenuElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiMenuElement, CustomEvent<TanreiMenuCloseDetail>>>,
    onContextRequest: 'contextrequest' as EventName<TanreiEvent<TanreiMenuElement, CustomEvent<TanreiMenuContextRequestDetail>>>,
  },
});

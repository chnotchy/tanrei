// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiMenuItem as TanreiMenuItemElement } from '@tanrei/web/components/menu';

/**
 * An action in a menu — the spec's item kind `item`: it does something and closes the menu.
 *
 * Events:
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuItem = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menu-item',
  elementClass: TanreiMenuItemElement,
  react: React,
  events: {
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuItemElement, MouseEvent>>,
  },
});

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiMenuRadioItem as TanreiMenuRadioItemElement } from '@tanrei/web/components/menu';

const MenuRadioItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menu-radio-item',
  elementClass: TanreiMenuRadioItemElement,
  react: React,
  events: {
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuRadioItemElement, MouseEvent>>,
  },
});
const MenuRadioItemAttributes = { value: ['value', ''], markIcon: ['mark-icon', ''], trailingIcon: ['trailing-icon', ''], shortcut: ['shortcut'], label: ['label', ''], supportingText: ['supporting-text', ''], leadingIcon: ['leading-icon', ''], trailingText: ['trailing-text', ''], disabled: ['disabled', false] } as const;
/**
 * One choice of several in its group — the spec's item kind `radio-item`: it is checked while its group's `value` is its own. A checked item's row is filled, and it is marked as the design system chooses (`comp.menu.radio-item.mark`: the radio look, a ring in both conditions, in the default system; the icon set's check in m3-like and cupertino) unless the item or its group names a glyph.
 *
 * Events:
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuRadioItem = /* @__PURE__ */ withServerAttributes(MenuRadioItemElement, 'tanrei-menu-radio-item', TanreiMenuRadioItemElement, MenuRadioItemAttributes);

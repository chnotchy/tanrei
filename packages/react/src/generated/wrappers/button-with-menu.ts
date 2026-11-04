// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiButtonWithMenu as TanreiButtonWithMenuElement, type TanreiButtonWithMenuToggleDetail, type TanreiButtonWithMenuCloseDetail } from '@tanrei/web/components/button-with-menu';

const ButtonWithMenuElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-button-with-menu',
  elementClass: TanreiButtonWithMenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiButtonWithMenuElement, CustomEvent<TanreiButtonWithMenuToggleDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiButtonWithMenuElement, CustomEvent<TanreiButtonWithMenuCloseDetail>>>,
  },
});
const ButtonWithMenuAttributes = { variant: ['variant', 'filled'], destructive: ['destructive', false], size: ['size', 'medium'], separation: ['separation', 'auto'], trailingWidth: ['trailing-width', 'default'], label: ['label', ''], menuLabel: ['menu-label', ''], open: ['open', false], disabled: ['disabled', false], hoverOpen: ['hover-open', false], hoverDelay: ['hover-delay', null] } as const;
/**
 * Performs a main action with one press, and offers related actions in a menu from a second, joined button beside it.
 *
 * Children, by their `slot`:
 * - `icon` — The leading half's icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `chevron` — The trailing half's glyph in place of `expand_more` (one glyph of the icon set). Alone, it turns half a turn while open; with `chevron-open` it is the closed form only.
 * - `chevron-open` — The trailing half's glyph while open (one glyph of the icon set): the trailing half then cross-fades between the closed glyph and this one instead of turning. A glyph of either chevron slot that the icon set flags is mirrored in right-to-left (`data-mirror` decides for one use); `expand_more` never is.
 * - `menu` — The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>` and `<tanrei-menu-group>` children, each with `slot="menu"`. Their events are theirs, as in any menu.
 *
 * Events:
 * - `onToggle` (`toggle`) — The trailing half asks to open or close the menu — by a press, a key or, with `hover-open`, a hover: `detail.open` is the value asked for. Set `open` to it.
 * - `onClose` (`close`) — The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export const ButtonWithMenu = /* @__PURE__ */ withServerAttributes(ButtonWithMenuElement, 'tanrei-button-with-menu', TanreiButtonWithMenuElement, ButtonWithMenuAttributes);

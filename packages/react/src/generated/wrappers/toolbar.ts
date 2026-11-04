// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiToolbar as TanreiToolbarElement } from '@tanrei/web/components/toolbar';

const ToolbarElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-toolbar',
  elementClass: TanreiToolbarElement,
  react: React,
  events: {},
});
const ToolbarAttributes = { variant: ['variant', 'inline'], orientation: ['orientation', 'horizontal'], label: ['label', ''], overflow: ['overflow', 'menu'], overflowLabel: ['overflow-label', ''], separation: ['separation', 'auto'] } as const;
/**
 * Holds a set of related controls — actions, toggles, a menu — as one Tab stop: inline where its content needs it, docked across the bottom edge, or floating over the content.
 *
 * Children, by their `slot`:
 * - default — The items, in reading order: `<tanrei-button>` elements — an icon-only one for an action (a toggle such as Bold is one with `toggle`), a labelled one, one with a `<tanrei-menu anchor="<its id>">` beside it for a menu button — `<tanrei-button-with-menu>` elements, `<tanrei-toolbar-group>`s holding them and `<tanrei-divider>` separators. An item with `toolbar-overflow="never"` is never hidden. Anything else is still laid out, and reported in debug builds (TBR-12).
 */
export const Toolbar = /* @__PURE__ */ withServerAttributes(ToolbarElement, 'tanrei-toolbar', TanreiToolbarElement, ToolbarAttributes);

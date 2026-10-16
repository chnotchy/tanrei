// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiAppBar as TanreiAppBarElement } from '@tanrei/web/components/app-bar';

/**
 * Names the current screen at its top edge and holds the way back and the screen's most used actions, its bottom edge drawn as the edge of a region that stays (or, under `divider-visibility="scroll"`, only once content scrolls under it).
 *
 * Children, by their `slot`:
 * - `navigation` — The navigation item: one icon-only `<tanrei-button>` (back, menu or close) at the start.
 * - `actions` — The action items: up to three icon-only `<tanrei-button>`s at the end, in reading order.
 */
export const AppBar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-app-bar',
  elementClass: TanreiAppBarElement,
  react: React,
  events: {},
});

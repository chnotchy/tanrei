// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiToolbar as TanreiToolbarElement } from '@tanrei/web/components/toolbar';

/**
 * Holds a short row of actions for the current screen or selection, docked across the bottom edge or floating over the content.
 *
 * Children, by their `slot`:
 * - default — The items, in reading order: `<tanrei-button>` elements — an icon-only one for an action (a toggle such as Bold is one with `toggle`), a labelled one for a text action. Anything else is still laid out, and reported in debug builds (TBR-12).
 */
export const Toolbar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-toolbar',
  elementClass: TanreiToolbarElement,
  react: React,
  events: {},
});

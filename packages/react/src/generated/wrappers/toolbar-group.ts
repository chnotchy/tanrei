// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiToolbarGroup as TanreiToolbarGroupElement } from '@tanrei/web/components/toolbar';

const ToolbarGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-toolbar-group',
  elementClass: TanreiToolbarGroupElement,
  react: React,
  events: {},
});
const ToolbarGroupAttributes = { label: ['label', ''] } as const;
/**
 * A run of related items in a toolbar (Bold, Italic, Underline), optionally named. It draws nothing of its own: its items are laid out in the toolbar's line as the toolbar's items, and the toolbar sets the group apart from what is next to it as its separation says (TBR-22, TBR-23).
 *
 * Children, by their `slot`:
 * - default — The group's items: `<tanrei-button>` and `<tanrei-button-with-menu>` elements, and a `<tanrei-menu anchor>` anchored to one of them, which is not laid out.
 */
export const ToolbarGroup = /* @__PURE__ */ withServerAttributes(ToolbarGroupElement, 'tanrei-toolbar-group', TanreiToolbarGroupElement, ToolbarGroupAttributes);

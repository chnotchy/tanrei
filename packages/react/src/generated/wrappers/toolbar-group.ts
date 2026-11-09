// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiToolbarGroup as TanreiToolbarGroupElement, type TanreiToolbarGroupChangeDetail } from '@tanrei/web/components/toolbar';

const ToolbarGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-toolbar-group',
  elementClass: TanreiToolbarGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiToolbarGroupElement, CustomEvent<TanreiToolbarGroupChangeDetail>>>,
  },
});
const ToolbarGroupAttributes = { label: ['label', ''], selection: ['selection', 'none'], value: ['value', ''], values: ['values'] } as const;
/**
 * A run of related items in a toolbar (Bold, Italic, Underline), optionally named. It draws nothing of its own: its items are laid out in the toolbar's line as the toolbar's items, and the toolbar sets the group apart from what is next to it as its separation says (TBR-22, TBR-23).
 *
 * Children, by their `slot`:
 * - default — The group's items: `<tanrei-button>` and `<tanrei-button-with-menu>` elements, and a `<tanrei-menu anchor>` anchored to one of them, which is not laid out. In a selection group, `<tanrei-button toggle value>` members.
 *
 * Events:
 * - `onChange` (`change`) — A person changed the selection of a group whose `selection` is `single` or `multiple`: `detail.value` and `detail.values` after the change, which the group already holds. Never fired when the product sets them.
 */
export const ToolbarGroup = /* @__PURE__ */ withServerAttributes(ToolbarGroupElement, 'tanrei-toolbar-group', TanreiToolbarGroupElement, ToolbarGroupAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiMenuGroup as TanreiMenuGroupElement, type TanreiMenuGroupChangeDetail } from '@tanrei/web/components/menu';

const MenuGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-menu-group',
  elementClass: TanreiMenuGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiMenuGroupElement, CustomEvent<TanreiMenuGroupChangeDetail>>>,
  },
});
const MenuGroupAttributes = { label: ['label', ''], value: ['value', null], markIcon: ['mark-icon', ''] } as const;
/**
 * A run of related items — the spec's item kind `group` — optionally under a title (its `label`, as `<optgroup label>`: a `title` attribute would also draw the browser's tooltip), which names it. The menu separates a group from what is next to it, by a divider or a gap as its `separation` names; a group of radio items is one set of choices, and holds which one is checked in `value`.
 *
 * Children, by their `slot`:
 * - default — The group's items.
 *
 * Events:
 * - `onChange` (`change`) — A radio item of the group was chosen: `detail.value` (and the element's `value`) is the new value.
 */
export const MenuGroup = /* @__PURE__ */ withServerAttributes(MenuGroupElement, 'tanrei-menu-group', TanreiMenuGroupElement, MenuGroupAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiListItem as TanreiListItemElement } from '@tanrei/web/components/list';

const ListItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-list-item',
  elementClass: TanreiListItemElement,
  react: React,
  events: {},
});
const ListItemAttributes = { label: ['label', ''], interactive: ['interactive', false], value: ['value', ''], disabled: ['disabled', false], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], rel: ['rel', null], download: ['download', null] } as const;
/**
 * One item of a list — the spec's item kind `list-item`: a box around your own content (its children). Placed as a child of `<tanrei-list>`, which decides whether it is an option; otherwise it is static, one action with `interactive`, or a link with `href`.
 *
 * Children, by their `slot`:
 * - default — The item's content: your own — text, an image, a card, a file item. An interactive item, a link item or an option must hold no interactive element (reported in debug builds); a static item may hold your controls, which keep their own semantics and focus.
 */
export const ListItem = /* @__PURE__ */ withServerAttributes(ListItemElement, 'tanrei-list-item', TanreiListItemElement, ListItemAttributes);

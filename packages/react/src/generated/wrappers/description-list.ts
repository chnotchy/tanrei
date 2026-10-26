// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiDescriptionList as TanreiDescriptionListElement } from '@tanrei/web/components/description-list';

const DescriptionListElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-description-list',
  elementClass: TanreiDescriptionListElement,
  react: React,
  events: {},
});
const DescriptionListAttributes = { layout: ['layout', 'inline'], columns: ['columns', 1], density: ['density', 'regular'], separation: ['separation', 'auto'] } as const;
/**
 * Presents what is known about one thing as named facts — a quiet term and the value that answers it — with the terms in one column beside their values, above them, or under a large figure. An order, a file, an account, a component; the few numbers a screen opens with. It is laid out by its own width and is never a control.
 *
 * Children, by their `slot`:
 * - default — The native `<dl>`: one `<div>` per fact around a `<dt>` and its `<dd>`s. It is a child in the document, not a slotted node: the element has no shadow root.
 */
export const DescriptionList = /* @__PURE__ */ withServerAttributes(DescriptionListElement, 'tanrei-description-list', TanreiDescriptionListElement, DescriptionListAttributes);

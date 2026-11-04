// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiScrollArea as TanreiScrollAreaElement } from '@tanrei/web/components/scroll-area';

const ScrollAreaElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-scroll-area',
  elementClass: TanreiScrollAreaElement,
  react: React,
  events: {},
});
const ScrollAreaAttributes = { scrollEdge: ['scroll-edge', 'auto'], edges: ['edges'], label: ['label', ''] } as const;
/**
 * A box that scrolls the product's content with the platform's own scrolling and shows, at each edge it watches, that more lies beyond it — a band in the surface's color, a fade of the content, a line or a blur, as the design system or the instance chooses — without changing its size or moving the content.
 *
 * Children, by their `slot`:
 * - default — The content the area scrolls.
 */
export const ScrollArea = /* @__PURE__ */ withServerAttributes(ScrollAreaElement, 'tanrei-scroll-area', TanreiScrollAreaElement, ScrollAreaAttributes);

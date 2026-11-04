// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiSkeleton as TanreiSkeletonElement } from '@tanrei/web/components/skeleton';

const SkeletonElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-skeleton',
  elementClass: TanreiSkeletonElement,
  react: React,
  events: {},
});
const SkeletonAttributes = { label: ['label', ''], decorative: ['decorative', false], showDelay: ['show-delay', null] } as const;
/**
 * Stands where content will be while it loads: quiet placeholders in the shape of what is coming — lines of text, a block, a circle — that keep the box the content will take, in a region that says once that it is busy.
 *
 * Children, by their `slot`:
 * - default — The placeholders — empty elements with `class="tanrei-skeleton-placeholder"` — alone or inside a layout of the product's own. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const Skeleton = /* @__PURE__ */ withServerAttributes(SkeletonElement, 'tanrei-skeleton', TanreiSkeletonElement, SkeletonAttributes);

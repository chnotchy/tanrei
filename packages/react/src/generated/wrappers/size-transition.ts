// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSizeTransition as TanreiSizeTransitionElement, type TanreiSizeTransitionSettleDetail } from '@tanrei/web/components/size-transition';

const SizeTransitionElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-size-transition',
  elementClass: TanreiSizeTransitionElement,
  react: React,
  events: {
    onSettle: 'settle' as EventName<TanreiEvent<TanreiSizeTransitionElement, CustomEvent<TanreiSizeTransitionSettleDetail>>>,
  },
});
const SizeTransitionAttributes = { axis: ['axis', 'block'], anchor: ['anchor', 'start'], duration: ['duration', null], disabled: ['disabled', false] } as const;
/**
 * Wraps content whose size changes — a message that grows, a section that gains a line, a panel that loses a row — and moves its own size to the content's new size as one motion, so that what stands after it moves smoothly instead of jumping, while the edge it is anchored to stays still.
 *
 * Children, by their `slot`:
 * - default — The content whose size the box follows.
 *
 * Events:
 * - `onSettle` (`settle`) — The box's size has come to rest after a change, by a motion or at once: once per change, after its last frame; `detail` is the new `width` and `height` in CSS pixels. It does not bubble.
 */
export const SizeTransition = /* @__PURE__ */ withServerAttributes(SizeTransitionElement, 'tanrei-size-transition', TanreiSizeTransitionElement, SizeTransitionAttributes);

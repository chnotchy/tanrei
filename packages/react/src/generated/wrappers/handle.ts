// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiHandle as TanreiHandleElement, type TanreiHandleResizeEndDetail, type TanreiHandleResizeStartDetail, type TanreiHandleResizeDetail, type TanreiHandleStepDetail } from '@tanrei/web/components/handle';

/**
 * The mark a person drags, or moves from the keyboard, to change the size of what it stands on: a sheet's top, a text field's corner, a pane's or a preview frame's edge. One axis is a short capsule; two axes are a quarter-circle arc that bows toward its corner.
 *
 * Events:
 * - `onActivate` (`activate`) — Pressed and released without a drag, or Enter or Space with keyboard focus: the owner switches between the sizes it knows.
 * - `onResizeEnd` (`resizeend`) — The drag ended, once: released, or cancelled by the platform (`detail.cancelled`).
 * - `onResizeStart` (`resizestart`) — A drag began: a press on the handle moved past the touch slop.
 * - `onResize` (`resize`) — The drag moved: `detail.inline` and `detail.block`, the distance from the press.
 * - `onStep` (`step`) — A key asked for a change of size: `detail.axis`, `detail.direction`, `detail.amount`.
 */
export const Handle = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-handle',
  elementClass: TanreiHandleElement,
  react: React,
  events: {
    onActivate: 'activate' as EventName<TanreiEvent<TanreiHandleElement>>,
    onResizeEnd: 'resizeend' as EventName<TanreiEvent<TanreiHandleElement, CustomEvent<TanreiHandleResizeEndDetail>>>,
    onResizeStart: 'resizestart' as EventName<TanreiEvent<TanreiHandleElement, CustomEvent<TanreiHandleResizeStartDetail>>>,
    onResize: 'resize' as EventName<TanreiEvent<TanreiHandleElement, CustomEvent<TanreiHandleResizeDetail>>>,
    onStep: 'step' as EventName<TanreiEvent<TanreiHandleElement, CustomEvent<TanreiHandleStepDetail>>>,
  },
});

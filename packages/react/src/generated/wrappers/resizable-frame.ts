// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiResizableFrame as TanreiResizableFrameElement, type TanreiResizableFrameSizeDetail } from '@tanrei/web/components/resizable-frame';

const ResizableFrameElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-resizable-frame',
  elementClass: TanreiResizableFrameElement,
  react: React,
  events: {
    onResize: 'resize' as EventName<TanreiEvent<TanreiResizableFrameElement, CustomEvent<TanreiResizableFrameSizeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiResizableFrameElement, CustomEvent<TanreiResizableFrameSizeDetail>>>,
  },
});
const ResizableFrameAttributes = { variant: ['variant', 'outlined'], handles: ['handles'], width: ['width', null], height: ['height', null], minWidth: ['min-width', null], maxWidth: ['max-width', null], minHeight: ['min-height', null], maxHeight: ['max-height', null], snapWidths: ['snap-widths'], step: ['step', 10], largeStep: ['large-step', 100], sizeIndicator: ['size-indicator', 'active'], widthLabel: ['width-label', ''], heightLabel: ['height-label', ''], cornerLabel: ['corner-label', ''] } as const;
/**
 * Gives its content — a component preview, a page in an embedded document, a navigation drawer, a side bar — a width and a height a person changes by dragging a handle on its edge or its corner, from the keyboard (each handle is a separator: the arrows, Page Up and Page Down, Home and End), or by activating the handle, which switches between the greatest size and the one before it.
 *
 * Children, by their `slot`:
 * - default — The content: a component, an embedded document, a layout, a navigation drawer.
 *
 * Events:
 * - `onResize` (`resize`) — The size changed during a drag, in every frame it changes.
 * - `onChange` (`change`) — A person finished changing the size: a drag ended, a key changed it, or a handle was activated.
 */
export const ResizableFrame = /* @__PURE__ */ withServerAttributes(ResizableFrameElement, 'tanrei-resizable-frame', TanreiResizableFrameElement, ResizableFrameAttributes);

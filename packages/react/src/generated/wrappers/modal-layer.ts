// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiModalLayer as TanreiModalLayerElement, type TanreiModalLayerCloseDetail } from '@tanrei/web/components/modal-layer';

const ModalLayerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-modal-layer',
  elementClass: TanreiModalLayerElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiModalLayerElement, CustomEvent<TanreiModalLayerCloseDetail>>>,
  },
});
const ModalLayerAttributes = { open: ['open', false], closedBy: ['closedby', 'any'], scrim: ['no-scrim', true], label: ['label', ''] } as const;
/**
 * The layer under every modal surface: it dims the window behind what it presents, makes everything there inert, moves focus in, keeps it there and gives it back, and asks to close on Escape, the platform's back or a press on the dim. The dialog, the modal sheets, the modal drawer, the image preview, the modal picker and the search's modal views are built from it; use it alone for a modal surface Tanrei does not have (a command palette, a takeover of the window).
 *
 * Children, by their `slot`:
 * - default — The content: the surface you present modally. The layer draws, styles and sizes nothing of it.
 *
 * Events:
 * - `onClose` (`close`) — The layer asks to be closed: `detail.reason` is `escape`, `back` or `scrim`. Set `open` to false. Only while `closedby` is not `none`.
 */
export const ModalLayer = /* @__PURE__ */ withServerAttributes(ModalLayerElement, 'tanrei-modal-layer', TanreiModalLayerElement, ModalLayerAttributes);

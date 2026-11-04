// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiBottomSheet as TanreiBottomSheetElement, type TanreiBottomSheetCloseDetail, type TanreiBottomSheetDetentChangeDetail } from '@tanrei/web/components/bottom-sheet';

const BottomSheetElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-bottom-sheet',
  elementClass: TanreiBottomSheetElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiBottomSheetElement, CustomEvent<TanreiBottomSheetCloseDetail>>>,
    onDetentChange: 'detentchange' as EventName<TanreiEvent<TanreiBottomSheetElement, CustomEvent<TanreiBottomSheetDetentChangeDetail>>>,
  },
});
const BottomSheetAttributes = { variant: ['variant', 'modal'], open: ['open', false], detent: ['detent', 'partial'], closedBy: ['closedby', 'any'], handle: ['no-handle', true], handleLabel: ['handle-label', ''], inset: ['flush', true], label: ['label', ''], headline: ['headline', ''], closable: ['closable', false], closeLabel: ['close-label', ''], dividerVisibility: ['divider-visibility', 'auto'] } as const;
/**
 * Shows supplementary content or a short task in a surface that rises from the bottom edge: `standard`, over the lower part of its parent while the content above stays usable (a layout region), or `modal`, a modal step that dims and blocks everything else until it is dismissed (a modal overlay).
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role.
 *
 * Events:
 * - `onClose` (`close`) — The sheet asks to be closed: `detail.reason` is `close` (its close button, whatever `closedby` says), or `drag`, `scrim`, `escape` or `back` (only while `closedby` is not `none`). Set `open` to false.
 * - `onDetentChange` (`detentchange`) — The person moved the sheet to its other height, by a drag or with the handle: `detail.detent` (and `detent`) is the new one. Not fired when you set `detent`.
 */
export const BottomSheet = /* @__PURE__ */ withServerAttributes(BottomSheetElement, 'tanrei-bottom-sheet', TanreiBottomSheetElement, BottomSheetAttributes);

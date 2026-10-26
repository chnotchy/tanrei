// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSideSheet as TanreiSideSheetElement, type TanreiSideSheetCloseDetail } from '@tanrei/web/components/side-sheet';

const SideSheetElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-side-sheet',
  elementClass: TanreiSideSheetElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiSideSheetElement, CustomEvent<TanreiSideSheetCloseDetail>>>,
  },
});
const SideSheetAttributes = { variant: ['variant', 'standard'], open: ['open', false], headline: ['headline', ''], closable: ['not-closable', true], closeLabel: ['close-label', ''], dividerVisibility: ['divider-visibility', 'auto'] } as const;
/**
 * Shows supplementary content or a secondary task in a panel at the end edge, with a headline, a close button and actions: `standard`, beside the content in the layout (a layout region), where actions are optional, or `modal`, over the content with a scrim, holding focus until it closes (a modal overlay), with at least one action (SSH-16).
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * - `actions` — Tanrei Buttons, each marked `confirming` or `dismissive`; at least one in a modal sheet. The sheet places them and gives those without a `variant` its own; it never restyles them.
 *
 * Events:
 * - `onClose` (`close`) — The sheet asks to be closed: `detail.reason` is `close` (its close button), or for a modal sheet `scrim`, `escape`, `back` or `drag`. Set `open` to false.
 */
export const SideSheet = /* @__PURE__ */ withServerAttributes(SideSheetElement, 'tanrei-side-sheet', TanreiSideSheetElement, SideSheetAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiPopover as TanreiPopoverElement, type TanreiPopoverCloseDetail } from '@tanrei/web/components/popover';

const PopoverElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-popover',
  elementClass: TanreiPopoverElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiPopoverElement, CustomEvent<TanreiPopoverCloseDetail>>>,
  },
});
const PopoverAttributes = { open: ['open', false], placement: ['placement', 'bottom-start'], offset: ['offset', null], crossOffset: ['cross-offset', 0], arrow: ['arrow', null], width: ['width', 'content'], compactPresentation: ['compact-presentation', 'sheet'], inset: ['no-inset', true], initialFocus: ['initial-focus', 'popover'], headline: ['headline', ''], label: ['label', ''], closable: ['closable', false], closeLabel: ['close-label', ''], dividerVisibility: ['divider-visibility', 'auto'], anchor: ['anchor', ''], opener: ['opener', ''], inline: ['inline', false] } as const;
/**
 * Shows content a person can read and operate on a small surface that opens beside the control they pressed and stays with it, without dimming or blocking the rest of the page.
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * - `actions` — Tanrei Buttons, each marked `confirming` or `dismissive` where it is one. The popover places them and gives those without a `variant` its own; it never restyles them.
 *
 * Events:
 * - `onClose` (`close`) — The popover asks to be closed: `detail.reason` is `escape`, `outside` (as a sheet, a press on its scrim), `focus-out`, `close` (its close button) or `anchor-hidden`. Set `open` to false.
 */
export const Popover = /* @__PURE__ */ withServerAttributes(PopoverElement, 'tanrei-popover', TanreiPopoverElement, PopoverAttributes);

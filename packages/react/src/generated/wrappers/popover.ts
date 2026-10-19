// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiPopover as TanreiPopoverElement, type TanreiPopoverCloseDetail } from '@tanrei/web/components/popover';

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
export const Popover = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-popover',
  elementClass: TanreiPopoverElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiPopoverElement, CustomEvent<TanreiPopoverCloseDetail>>>,
  },
});

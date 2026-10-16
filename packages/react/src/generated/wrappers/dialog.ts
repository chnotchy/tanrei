// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiDialog as TanreiDialogElement, type TanreiDialogDismissDetail } from '@tanrei/web/components/dialog';

/**
 * Stops a person for a decision or a few details that the task cannot go on without, in a surface that dims and blocks everything behind it and always offers at least one answer, until one is chosen or the dialog is dismissed.
 *
 * Children, by their `slot`:
 * - default — Custom content, below the supporting text: it gets the content color, and plain text the body role.
 * - `icon` — A glyph at the headline's start (its ligature text), centred on the headline's first line; or above a centred headline where the system sets `icon.placement` to above. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `actions` — The answers, one at least: Tanrei Buttons, each marked `confirming` or `dismissive`. The dialog places them and gives those without a `variant` its own.
 *
 * Events:
 * - `onCancel` (`cancel`) — Escape, back, a press on the scrim or the close button asked to close it (only while `closedby` is not `none`): `detail.reason` is `escape`, `back`, `scrim` or `close`. Cancelable: `preventDefault()` keeps it open.
 * - `onClose` (`close`) — The dialog closed, whatever closed it.
 */
export const Dialog = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-dialog',
  elementClass: TanreiDialogElement,
  react: React,
  events: {
    onCancel: 'cancel' as EventName<TanreiEvent<TanreiDialogElement, CustomEvent<TanreiDialogDismissDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiDialogElement>>,
  },
});

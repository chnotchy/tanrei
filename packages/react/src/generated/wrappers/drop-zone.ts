// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiDropZone as TanreiDropZoneElement } from '@tanrei/web/components/drop-zone';

/**
 * Wraps any part of a screen so that files can be dropped anywhere on it, while what it holds is used exactly as without it: it draws nothing at rest and adds no hover, no press, no focus stop and no role (DRZ-1, DRZ-2). While files are dragged over it, one overlay covers it and says they can be dropped (DRZ-4); on the drop it judges them by the File picker's rule and hands over what passed and what was refused (DRZ-9). It keeps nothing (DRZ-10), and it is never the only way to add a file: the page also has a File picker or a File upload (DRZ-13).
 *
 * Children, by their `slot`:
 * - default — The content: any part of the product's screen.
 *
 * Events:
 * - `onSelect` (`select`) — Files were dropped and passed. Once per drop; `detail.files` is a `File[]`. Bubbles.
 * - `onReject` (`reject`) — Files of one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export const DropZone = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-drop-zone',
  elementClass: TanreiDropZoneElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiDropZoneElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiDropZoneElement>>,
  },
});

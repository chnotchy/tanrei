// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiFilePicker as TanreiFilePickerElement } from '@tanrei/web/components/file-picker';

const FilePickerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-file-picker',
  elementClass: TanreiFilePickerElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiFilePickerElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiFilePickerElement>>,
  },
});
const FilePickerAttributes = { layout: ['layout', 'button'], multiple: ['multiple', false], accept: ['accept'], maxSize: ['max-size', null], maxFiles: ['max-files', null], label: ['label', ''], constraintsText: ['constraints-text', ''], dropText: ['drop-text', ''], selectionText: ['selection-text', ''], disabled: ['disabled', false], error: ['error', false], required: ['required', false] } as const;
/**
 * Lets people choose files through the browser's own picker — from the product's Button and, where there is room, from a place files can also be dragged onto — says the limits in words before the choice, judges what was chosen against them, and hands over what passed and what was refused. **It keeps nothing, lists nothing and takes no part in a form** (FPK-7): whoever holds the files shows them — a `<tanrei-file-upload>` does, with a list and a form value.
 *
 * Children, by their `slot`:
 * - `trigger` — The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * - `icon` — A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onSelect` (`select`) — Files were chosen or dropped and passed. Once per choice; `detail.files` is a `File[]`. Bubbles.
 * - `onReject` (`reject`) — Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export const FilePicker = /* @__PURE__ */ withServerAttributes(FilePickerElement, 'tanrei-file-picker', TanreiFilePickerElement, FilePickerAttributes);

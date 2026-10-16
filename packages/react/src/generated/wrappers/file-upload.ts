// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiFileUpload as TanreiFileUploadElement, type TanreiFileUploadMoveDetail } from '@tanrei/web/components/file-upload';

/** The attributes of `<tanrei-file-upload>` that are not properties of the element, as props of `FileUpload`. */
export interface FileUploadMarks {
  /** The id of the form the file upload belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const FileUploadElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-file-upload',
  elementClass: TanreiFileUploadElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onMove: 'move' as EventName<TanreiEvent<TanreiFileUploadElement, CustomEvent<TanreiFileUploadMoveDetail>>>,
  },
});
const withFileUploadMarks = /* @__PURE__ */ withMarks<FileUploadMarks>([], ['form']);
/**
 * Lets people choose files and shows what was chosen. Built from a File picker (`<tanrei-file-picker>`) — the trigger, the drop area, the limits in words, the judging of a choice — and File items (`<tanrei-file-item>`), one for each file, in a column of rows or a strip of tiles; it adds the state that ties them: which files are kept, the room that is left, one form for all its items, one message for many changes, where focus goes after a removal, and the form's value. **It never uploads**: it opens no connection and reads no byte of a file (FUP-7).
 *
 * Children, by their `slot`:
 * - `trigger` — The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * - `icon` — A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - default — While `rows` is `given`: the rows, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `rows` is `own` nothing here is.
 *
 * Events:
 * - `onSelect` (`select`) — Files were chosen or dropped, passed and found room. Once per choice; `detail.files` is a `File[]` — while `rows` is `own`, the files newly kept. Bubbles.
 * - `onReject` (`reject`) — Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * - `onChange` (`change`) — While `rows` is `own`: the kept files changed by what a person did — a choice or a drop that kept or replaced a file, or a kept file's row removed. Once, after `select` and `reject`; `detail.files` is the `File[]` now kept. Bubbles. Never for `add()`, `clear()`, a reset or a change of `rows`.
 * - `onMove` (`move`) — While `rows` is `given` and `reorderable` is set: a person asked for a row to stand in another place, by the move menu, the keyboard or a drag. `detail.from` and `detail.to`, from 0. The file upload has moved nothing: put your file item in its new place. Bubbles.
 */
export const FileUpload: Marked<typeof FileUploadElement, FileUploadMarks> = /* @__PURE__ */ withFileUploadMarks(FileUploadElement);

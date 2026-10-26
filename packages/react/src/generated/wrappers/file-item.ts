// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiFileItem as TanreiFileItemElement } from '@tanrei/web/components/file-item';

const FileItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-file-item',
  elementClass: TanreiFileItemElement,
  react: React,
  events: {
    onRetry: 'retry' as EventName<TanreiEvent<TanreiFileItemElement>>,
    onRemove: 'remove' as EventName<TanreiEvent<TanreiFileItemElement>>,
  },
});
const FileItemAttributes = { form: ['form', 'row'], value: ['value', ''], name: ['name', ''], mediaType: ['media-type', ''], glyph: ['glyph', ''], formatText: ['format-text', ''], sizeText: ['size-text', ''], status: ['status', 'pending'], statusText: ['status-text', ''], progress: ['progress', null], errorText: ['error-text', ''], retryable: ['retryable', false], preview: ['preview', false], previewSrc: ['preview-src', ''], fit: ['fit', 'cover'], nameHidden: ['name-hidden', false], width: ['width', null], height: ['height', null], interactive: ['interactive', false], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], removeLabel: ['remove-label', ''], retryLabel: ['retry-label', ''], disabled: ['disabled', false], readOnly: ['readonly', false], rel: ['rel', null], download: ['download', null] } as const;
/**
 * Shows one file: a glyph that says its format, or a small picture of it; its name; a second line with what the product says of it — its format, its size, where its sending stands, what went wrong; a bar while it is sent; and the actions to take it back and to try it again. As a row of a column of files (`form="row"`, the default) or as a tile of a strip of pictures (`form="tile"`, a box of `width` by `height`). **It never reads, keeps or sends the file** (FIT-7, FIT-33): what it shows is what its props say.
 *
 * Children, by their `slot`:
 * - `icon` — A glyph of the product's own in place of the format's glyph, where a name in the icon set (`glyph`) is not enough. Decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onRetry` (`retry`) — The person asked to try a failed file again. Bubbles and is composed; `detail.value` is the file item's value.
 * - `onRemove` (`remove`) — The person asked to take this file back. Bubbles and is composed; `detail.value` is the file item's value. Whoever holds the file item removes it.
 */
export const FileItem = /* @__PURE__ */ withServerAttributes(FileItemElement, 'tanrei-file-item', TanreiFileItemElement, FileItemAttributes);

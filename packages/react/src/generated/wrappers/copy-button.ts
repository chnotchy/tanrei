// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiCopyButton as TanreiCopyButtonElement, type TanreiCopyButtonCopiedDetail, type TanreiCopyButtonCopyFailedDetail } from '@tanrei/web/components/copy-button';

/**
 * Copies a given text to the clipboard with one press and confirms it — its glyph becomes a check for a moment and assistive technology is told — or says that it could not. It is drawn by Button and never moves the layout.
 *
 * Events:
 * - `onCopied` (`copied`) — The browser confirmed that the text is on the clipboard; `detail.text` is the text.
 * - `onCopyFailed` (`copyfailed`) — The browser refused the copy or has no clipboard to write to; `detail.reason` is its reason, where it gave one.
 */
export const CopyButton = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-copy-button',
  elementClass: TanreiCopyButtonElement,
  react: React,
  events: {
    onCopied: 'copied' as EventName<TanreiEvent<TanreiCopyButtonElement, CustomEvent<TanreiCopyButtonCopiedDetail>>>,
    onCopyFailed: 'copyfailed' as EventName<TanreiEvent<TanreiCopyButtonElement, CustomEvent<TanreiCopyButtonCopyFailedDetail>>>,
  },
});

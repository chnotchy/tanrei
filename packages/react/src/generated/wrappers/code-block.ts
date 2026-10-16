// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiCodeBlock as TanreiCodeBlockElement, type TanreiCodeBlockCopiedDetail, type TanreiCodeBlockCopyFailedDetail } from '@tanrei/web/components/code-block';

/**
 * Shows lines of code to read, compare and copy: in the code face, on a quiet fill or inside one hairline, scrolling inside itself or wrapping, with an optional header, line numbers, marked lines, a prompt and a copy button; given the code and its language it highlights the code by itself, in the system's syntax colors.
 *
 * Children, by their `slot`:
 * - default — The code: one `<pre><code>`. Runs are `<span data-syntax="…">` inside the `<code>`.
 *
 * Events:
 * - `onCopied` (`copied`) — The code was copied by the block's copy button; `detail.text` is the text that was copied.
 * - `onCopyfailed` (`copyfailed`) — The platform refused the copy asked for by the block's copy button; `detail.reason` is its reason, where it gave one.
 */
export const CodeBlock = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-code-block',
  elementClass: TanreiCodeBlockElement,
  react: React,
  events: {
    onCopied: 'copied' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopiedDetail>>>,
    onCopyfailed: 'copyfailed' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopyFailedDetail>>>,
  },
});

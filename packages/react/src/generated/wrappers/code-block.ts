// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiCodeBlock as TanreiCodeBlockElement, type TanreiCodeBlockCopiedDetail, type TanreiCodeBlockCopyFailedDetail } from '@tanrei/web/components/code-block';

const CodeBlockElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-code-block',
  elementClass: TanreiCodeBlockElement,
  react: React,
  events: {
    onCopied: 'copied' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopiedDetail>>>,
    onCopyFailed: 'copyfailed' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopyFailedDetail>>>,
  },
});
const CodeBlockAttributes = { code: ['code', ''], variant: ['variant', 'filled'], size: ['size', 'medium'], headline: ['headline', ''], language: ['language', ''], languageLabel: ['language-label', ''], highlight: ['highlight', true], label: ['label', ''], wrap: ['wrap', false], lineNumbers: ['line-numbers', false], startLine: ['start-line', 1], highlightedLines: ['highlighted-lines', ''], addedLines: ['added-lines', ''], removedLines: ['removed-lines', ''], highlightedLabel: ['highlighted-label', ''], addedLabel: ['added-label', ''], removedLabel: ['removed-label', ''], prompt: ['prompt', ''], maxLines: ['max-lines', null], copy: ['copy', false], copyLabel: ['copy-label', ''], copiedLabel: ['copied-label', ''], copyFailedLabel: ['copy-failed-label', ''] } as const;
/**
 * Shows lines of code to read, compare and copy: in the code face, on a quiet fill or inside one hairline, scrolling inside itself or wrapping, with an optional header, line numbers, marked lines, a prompt and a copy button; given the code and its language it highlights the code by itself, in the system's syntax colors.
 *
 * Children, by their `slot`:
 * - default — The code: one `<pre><code>`. Runs are `<span data-syntax="…">` inside the `<code>`.
 *
 * Events:
 * - `onCopied` (`copied`) — The code was copied by the block's copy button; `detail.text` is the text that was copied.
 * - `onCopyFailed` (`copyfailed`) — The platform refused the copy asked for by the block's copy button; `detail.reason` is its reason, where it gave one.
 */
export const CodeBlock = /* @__PURE__ */ withServerAttributes(CodeBlockElement, 'tanrei-code-block', TanreiCodeBlockElement, CodeBlockAttributes);

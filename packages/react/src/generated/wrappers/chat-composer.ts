// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiChatComposer as TanreiChatComposerElement, type TanreiChatComposerSendableDetail, type TanreiChatComposerSendDetail, type TanreiChatComposerSelectDetail, type TanreiChatComposerRejectDetail, type TanreiChatComposerAttachmentsChangeDetail } from '@tanrei/web/components/chat-composer';

/** The attributes of `<tanrei-chat-composer>` that are not properties of the element, as props of `ChatComposer`. */
export interface ChatComposerMarks {
  /** Web only: the name each kept file is submitted under, while `attachments` is `own` and the chat composer stands in a form. Without it no file is submitted. */
  "files-name"?: string;
  /** The id of the form the chat composer belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ChatComposerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-chat-composer',
  elementClass: TanreiChatComposerElement,
  react: React,
  events: {
    onSendableChange: 'sendablechange' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendableDetail>>>,
    onSendBlocked: 'sendblocked' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendableDetail>>>,
    onSend: 'send' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSelectDetail>>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerRejectDetail>>>,
    onAttachmentsChange: 'attachmentschange' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerAttachmentsChangeDetail>>>,
    onStop: 'stop' as EventName<TanreiEvent<TanreiChatComposerElement>>,
  },
});
const withChatComposerMarks = /* @__PURE__ */ withMarks<ChatComposerMarks>([], ['form']);
/**
 * Lets a person write a message and send it, in one capsule that holds everything. Built from an Embedded text input (`<tanrei-embedded-text-input>`) — the typing, which grows with what is written — a File picker (`<tanrei-file-picker>`) and File items (`<tanrei-file-item>`) — the attachments, as a strip at the top of the capsule — and Buttons (`<tanrei-button>`): the send button, the stop button in its place, the attach button, and the product's own in its slots. It adds what ties them: the capsule, which is its own part and shows the typing area's focus on its edge; whether what it holds can be sent, and why not; the files it keeps; the counter; one live region; and the form's value. **It never sends**: `send` hands the text and the attachments to the product.
 *
 * Children, by their `slot`:
 * - `leading` — The product's own Buttons after the attach button: before the typing area in the inline layout, at the start of the row beneath it in the stacked one. Laid out and never restyled.
 * - `trailing` — The product's own Buttons before the send button in the inline layout, and at the end of the row beneath the typing area in the stacked one. Laid out and never restyled.
 * - `attach` — The product's own Button in place of the attach button the chat composer brings. Exactly one; it opens the browser's picker. Not drawn while `attachments` is `none`.
 * - `send` — The product's own Button in place of the send button the chat composer brings. Exactly one; it sends, and is disabled while nothing can be sent.
 * - `stop` — The product's own Button in place of the stop button the chat composer brings, shown in the send button's place while `sending` and `stoppable` are set. Exactly one.
 * - default — While `attachments` is `given`: the attachments, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `attachments` is `own` or `none` nothing here is.
 *
 * Events:
 * - `onSendableChange` (`sendablechange`) — Whether what the chat composer holds can be sent changed, or the reasons it cannot did: `detail.sendable`, and `detail.reasons` by name — `disabled`, `sending`, `blocked`, `empty`, `length`, `uploading`, `failed`. Bubbles. Never when it is first drawn.
 * - `onSendBlocked` (`sendblocked`) — The person asked to send by the keyboard while it could not be sent for a reason other than being empty or disabled; `detail.reasons` says why. Bubbles.
 * - `onSend` (`send`) — The person sent what the chat composer holds, by the send button or the keyboard, while it could be sent. `detail.value` is the text exactly as written; `detail.attachments` the kept `File`s (`own`) or the values of the File items that have not failed (`given`), in the order of the strip. Bubbles; cancelable — a cancelled one keeps the content and asks no form to submit.
 * - `onSelect` (`select`) — Files were chosen in the picker, dropped on the capsule or pasted, and passed. Once per arrival; `detail.files` is a `File[]` — while `attachments` is `own`, the files newly kept. Bubbles.
 * - `onReject` (`reject`) — Files of one arrival were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * - `onAttachmentsChange` (`attachmentschange`) — While `attachments` is `own`: the kept files changed by what a person did — an arrival that kept a file, or a kept file removed by its File item. `detail.files` is the `File[]` now kept. Bubbles. Never for `addFiles()`, `clear()`, the emptying after `send` or a reset.
 * - `onStop` (`stop`) — The person activated the stop button while `sending` and `stoppable` were set. The product stops what is under way and sets `sending`. Bubbles.
 */
export const ChatComposer: Marked<typeof ChatComposerElement, ChatComposerMarks> = /* @__PURE__ */ withChatComposerMarks(ChatComposerElement);

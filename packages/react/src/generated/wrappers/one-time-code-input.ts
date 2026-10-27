// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiOneTimeCodeInput as TanreiOneTimeCodeInputElement, type TanreiOneTimeCodeInputDetail } from '@tanrei/web/components/one-time-code-input';

/** The attributes of `<tanrei-one-time-code-input>` that are not properties of the element, as props of `OneTimeCodeInput`. */
export interface OneTimeCodeInputMarks {
  /** The id of the form the one-time-code input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const OneTimeCodeInputElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-one-time-code-input',
  elementClass: TanreiOneTimeCodeInputElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onComplete: 'complete' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
  },
});
const withOneTimeCodeInputMarks = /* @__PURE__ */ withMarks<OneTimeCodeInputMarks>([], ['form']);
const OneTimeCodeInputAttributes = { value: ['value', ''], length: ['length', 6], type: ['type', 'numeric'], groupSize: ['group-size', 0], mask: ['mask', false], label: ['label', ''], error: ['error', false], disabled: ['disabled', false], readOnly: ['readonly', false], name: ['name', ''], form: ['form'] } as const;
/**
 * Takes a short code sent to the person — a sign-in or verification code — as one text value drawn in separate cells, so that its length and what is still missing can be seen, and the browser can fill it in one step.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the value; the element's `value` is already the new one.
 * - `onComplete` (`complete`) — A change by the person left the value `length` characters long. After that change's input, once.
 * - `onChange` (`change`) — The person committed a changed value: focus left the field, or Enter was pressed.
 * - `onAction` (`action`) — The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 */
export const OneTimeCodeInput: Marked<typeof OneTimeCodeInputElement, OneTimeCodeInputMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withOneTimeCodeInputMarks(OneTimeCodeInputElement), 'tanrei-one-time-code-input', TanreiOneTimeCodeInputElement, OneTimeCodeInputAttributes);

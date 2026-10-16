// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiOneTimeCodeField as TanreiOneTimeCodeFieldElement, type TanreiOneTimeCodeInputDetail } from '@tanrei/web/components/one-time-code-field';

/** The attributes of `<tanrei-one-time-code-field>` that are not properties of the element, as props of `OneTimeCodeField`. */
export interface OneTimeCodeFieldMarks {
  /** The id of the form the one-time-code field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const OneTimeCodeFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-one-time-code-field',
  elementClass: TanreiOneTimeCodeFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onComplete: 'complete' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
  },
});
const withOneTimeCodeFieldMarks = /* @__PURE__ */ withMarks<OneTimeCodeFieldMarks>([], ['form']);
/**
 * Asks for a short code sent to the person as one complete field. Built from a Field (`<tanrei-field>`) and the One-time-code input (`<tanrei-one-time-code-input>`) it frames: the input under the Field's label, with the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the value; the element's `value` is already the new one.
 * - `onChange` (`change`) — The person committed a changed value: focus left the field, or Enter was pressed.
 * - `onComplete` (`complete`) — A change by the person left the value `length` characters long. After that change's input, once.
 * - `onAction` (`action`) — The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 */
export const OneTimeCodeField: Marked<typeof OneTimeCodeFieldElement, OneTimeCodeFieldMarks> = /* @__PURE__ */ withOneTimeCodeFieldMarks(OneTimeCodeFieldElement);

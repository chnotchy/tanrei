// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiNumberInput as TanreiNumberInputElement, type TanreiNumberInputInputDetail, type TanreiNumberInputEntryErrorDetail } from '@tanrei/web/components/number-input';

/** The attributes of `<tanrei-number-input>` that are not properties of the element, as props of `NumberInput`. */
export interface NumberInputMarks {
  /** The id of the form the number input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const NumberInputElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-number-input',
  elementClass: TanreiNumberInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiNumberInputElement>>,
    onInput: 'input' as EventName<TanreiEvent<TanreiNumberInputElement, CustomEvent<TanreiNumberInputInputDetail>>>,
    onEntryError: 'entryerror' as EventName<TanreiEvent<TanreiNumberInputElement, CustomEvent<TanreiNumberInputEntryErrorDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiNumberInputElement>>,
  },
});
const withNumberInputMarks = /* @__PURE__ */ withMarks<NumberInputMarks>([], ['form']);
const NumberInputAttributes = { variant: ['variant', 'stacked'], size: ['size', 'medium'], value: ['value'], name: ['name', ''], label: ['label', ''], labelHidden: ['label-hidden', false], placeholder: ['placeholder', ''], error: ['error', false], disabled: ['disabled', false], readOnly: ['readonly', false], min: ['min', null], max: ['max', null], step: ['step', 1], noSteppers: ['no-steppers', false], incrementLabel: ['increment-label', ''], decrementLabel: ['decrement-label', ''], prefixText: ['prefix-text', ''], suffixText: ['suffix-text', ''], valueText: ['value-text', ''], align: ['align', 'start'], minFractionDigits: ['min-fraction-digits', 0], maxFractionDigits: ['max-fraction-digits', 3], locale: ['locale', ''], invalidText: ['invalid-text', ''], form: ['form'] } as const;
/**
 * The box of a number: lets people enter a number as a number — typed in their locale's form or stepped by a key or a button, kept within limits, with its unit beside it — and draws no row around it. A `<tanrei-field>` frames it with a label, a requirement mark, help and an error, or the product names it with `label` where its visible label is elsewhere: the head of a table's column, a toolbar, the title of a row that also holds a slider. `<tanrei-number-field>` is the two as one element.
 *
 * Events:
 * - `onChange` (`change`) — A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onInput` (`input`) — The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryError` (`entryerror`) — The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 * - `onAction` (`action`) — The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 */
export const NumberInput: Marked<typeof NumberInputElement, NumberInputMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withNumberInputMarks(NumberInputElement), 'tanrei-number-input', TanreiNumberInputElement, NumberInputAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiNumberField as TanreiNumberFieldElement, type TanreiNumberInputInputDetail, type TanreiNumberInputEntryErrorDetail } from '@tanrei/web/components/number-field';

/** The attributes of `<tanrei-number-field>` that are not properties of the element, as props of `NumberField`. */
export interface NumberFieldMarks {
  /** The id of the form the number field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const NumberFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-number-field',
  elementClass: TanreiNumberFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiNumberFieldElement, CustomEvent<TanreiNumberInputInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiNumberFieldElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiNumberFieldElement>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiNumberFieldElement, CustomEvent<TanreiNumberInputEntryErrorDetail>>>,
  },
});
const withNumberFieldMarks = /* @__PURE__ */ withMarks<NumberFieldMarks>([], ['form']);
/**
 * Lets people enter a number as one complete field. Built from a Field (`<tanrei-field>`) and the Number input (`<tanrei-number-input>`) it frames: the box — the number, its unit and its two steppers — under the Field's label, or, in the filled and the outlined look, with the label floating in it; with the Field's requirement mark, its help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * - `onChange` (`change`) — A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onAction` (`action`) — The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 */
export const NumberField: Marked<typeof NumberFieldElement, NumberFieldMarks> = /* @__PURE__ */ withNumberFieldMarks(NumberFieldElement);

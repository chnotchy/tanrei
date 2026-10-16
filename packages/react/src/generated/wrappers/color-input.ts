// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiColorInput as TanreiColorInputElement, type TanreiColorInputEntryErrorDetail, type TanreiColorInputPickerRequestDetail } from '@tanrei/web/components/color-input';

/** The attributes of `<tanrei-color-input>` that are not properties of the element, as props of `ColorInput`. */
export interface ColorInputMarks {
  /** The id of the form the color input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ColorInputElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-color-input',
  elementClass: TanreiColorInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiColorInputElement>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiColorInputElement, CustomEvent<TanreiColorInputEntryErrorDetail>>>,
    onPickerrequest: 'pickerrequest' as EventName<TanreiEvent<TanreiColorInputElement, CustomEvent<TanreiColorInputPickerRequestDetail>>>,
  },
});
const withColorInputMarks = /* @__PURE__ */ withMarks<ColorInputMarks>([], ['form']);
/**
 * The box in which people set one color: a text value they can read, type and paste, a sample of it beside the text, a button that asks for a picker and — in the looks that float one — its label inside the box. It looks and measures like a text input. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-color-field>`, which is the two together.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 * - `onPickerrequest` (`pickerrequest`) — The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 */
export const ColorInput: Marked<typeof ColorInputElement, ColorInputMarks> = /* @__PURE__ */ withColorInputMarks(ColorInputElement);

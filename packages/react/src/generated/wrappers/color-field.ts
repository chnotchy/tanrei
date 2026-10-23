// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiColorField as TanreiColorFieldElement, type TanreiColorInputPickerRequestDetail, type TanreiColorInputEntryErrorDetail } from '@tanrei/web/components/color-field';

/** The attributes of `<tanrei-color-field>` that are not properties of the element, as props of `ColorField`. */
export interface ColorFieldMarks {
  /** The id of the form the color field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ColorFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-color-field',
  elementClass: TanreiColorFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiColorFieldElement>>,
    onPickerRequest: 'pickerrequest' as EventName<TanreiEvent<TanreiColorFieldElement, CustomEvent<TanreiColorInputPickerRequestDetail>>>,
    onEntryError: 'entryerror' as EventName<TanreiEvent<TanreiColorFieldElement, CustomEvent<TanreiColorInputEntryErrorDetail>>>,
  },
});
const withColorFieldMarks = /* @__PURE__ */ withMarks<ColorFieldMarks>([], ['form']);
/**
 * Lets people set one color as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Color input (`<tanrei-color-input>`) it frames: the box — a sample of the value, the value as text, a button that asks for a picker — under the Field's label, or, in the filled and the outlined look, with the label floating in it, with the Field's help and its error, tied together for assistive technology and taking part in a form as one control. It looks and measures like a text field.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onPickerRequest` (`pickerrequest`) — The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 * - `onEntryError` (`entryerror`) — The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 */
export const ColorField: Marked<typeof ColorFieldElement, ColorFieldMarks> = /* @__PURE__ */ withColorFieldMarks(ColorFieldElement);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiTextInput as TanreiTextInputElement, type TanreiTextInputEntryErrorDetail, type TanreiTextInputPickerRequestDetail, type TanreiTextInputResizeEndDetail, type TanreiTextInputRevealChangeDetail, type TanreiTextInputActionDetail } from '@tanrei/web/components/text-input';

/** The attributes of `<tanrei-text-input>` that are not properties of the element, as props of `TextInput`. */
export interface TextInputMarks {
  /** The id of the form the text input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const TextInputElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-text-input',
  elementClass: TanreiTextInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTextInputElement>>,
    onEntryError: 'entryerror' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputEntryErrorDetail>>>,
    onPickerRequest: 'pickerrequest' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputPickerRequestDetail>>>,
    onResizeEnd: 'resizeend' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputResizeEndDetail>>>,
    onRevealChange: 'revealchange' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputRevealChangeDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputActionDetail>>>,
  },
});
const withTextInputMarks = /* @__PURE__ */ withMarks<TextInputMarks>([], ['form']);
/**
 * The box people type in, and everything typed in it — one line, or several that follow the text or are resized by hand, or a date or a time entered unit by unit in the locale's form — with optional icons, a prefix and a suffix, a picker button, and, in the two looks that have one, the label that floats inside the box. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-text-field>`, which is the two as one element. Bare, it is for a place whose label stands elsewhere: a filter in a toolbar, a cell of a table, a row with its label beside it; give it `label` there.
 *
 * Children, by their `slot`:
 * - `leading-icon` — An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `trailing-icon` — An icon at the end of the field, or the product's own icon-only Button. The clear button and a date or time field's picker button come after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 * - `entries` — What was entered already — the product's own elements, or the chips of a component that holds the input (a chip field): laid out inside the box before the typing part, in lines that wrap (TXI-64). The text input gives them no role, no focus order and no key (TXI-66).
 *
 * Events:
 * - `onChange` (`change`) — The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * - `onEntryError` (`entryerror`) — The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 * - `onPickerRequest` (`pickerrequest`) — The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * - `onResizeEnd` (`resizeend`) — The person finished changing the size of a field resized by hand: a drag of its handle ended, or a key or an activation of the handle changed it (TXI-69). `detail.lines` and `detail.width`.
 * - `onRevealChange` (`revealchange`) — The person showed or hid the value of a password field with the reveal button (TXI-72); `revealed` is already the new one. `detail.revealed`. Never fired when the product sets `revealed`, or when the field hides the value itself.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const TextInput: Marked<typeof TextInputElement, TextInputMarks> = /* @__PURE__ */ withTextInputMarks(TextInputElement);

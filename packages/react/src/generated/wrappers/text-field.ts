// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiTextField as TanreiTextFieldElement, type TanreiTextInputActionDetail, type TanreiTextInputPickerRequestDetail, type TanreiTextInputEntryErrorDetail, type TanreiTextInputResizeEndDetail, type TanreiTextInputRevealChangeDetail } from '@tanrei/web/components/text-field';

/** The attributes of `<tanrei-text-field>` that are not properties of the element, as props of `TextField`. */
export interface TextFieldMarks {
  /** The id of the form the text field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const TextFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-text-field',
  elementClass: TanreiTextFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTextFieldElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputActionDetail>>>,
    onPickerRequest: 'pickerrequest' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputPickerRequestDetail>>>,
    onEntryError: 'entryerror' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputEntryErrorDetail>>>,
    onResizeEnd: 'resizeend' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputResizeEndDetail>>>,
    onRevealChange: 'revealchange' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputRevealChangeDetail>>>,
  },
});
const withTextFieldMarks = /* @__PURE__ */ withMarks<TextFieldMarks>([], ['form']);
const TextFieldAttributes = { label: ['label', ''], labelHidden: ['label-hidden', false], supportingText: ['supporting-text', ''], errorText: ['error-text', ''], error: ['error', false], disabled: ['disabled', false], required: ['required', false], optional: ['optional', false], requiredMark: ['required-mark', 'auto'], requiredText: ['required-text', ''], optionalText: ['optional-text', ''], variant: ['variant', 'stacked'], size: ['size', 'medium'], type: ['type', 'text'], value: ['value'], placeholder: ['placeholder', ''], readOnly: ['readonly', false], clearable: ['clearable', false], clearLabel: ['clear-label', ''], revealable: ['revealable', false], revealed: ['revealed', false], revealLabel: ['reveal-label', ''], multiline: ['multiline', false], minRows: ['min-rows', 2], maxRows: ['max-rows', 0], resize: ['resize', 'auto'], resizeAxis: ['resize-axis', 'vertical'], resizeLabel: ['resize-label', ''], noWrap: ['no-wrap', false], maxLength: ['maxlength', 0], counter: ['counter', false], counterText: ['counter-text', ''], counterNoLimitText: ['counter-no-limit-text', ''], prefixText: ['prefix-text', ''], suffixText: ['suffix-text', ''], autocomplete: ['autocomplete', ''], locale: ['locale', ''], min: ['min', ''], max: ['max', ''], disabledDates: ['disabled-dates'], invalidText: ['invalid-text', ''], unavailableText: ['unavailable-text', ''], segmentEmptyText: ['segment-empty-text', ''], picker: ['picker', false], pickerLabel: ['picker-label', ''], name: ['name', ''], form: ['form'] } as const;
/**
 * Lets people enter and edit text as one complete field. Built from a Field (`<tanrei-field>`) and the Text input (`<tanrei-text-input>`) it frames: the box under the Field's label — or, in the filled and the outlined look, with the label floating in it — with the Field's help, its error and the count, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `leading-icon` — An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `trailing-icon` — An icon at the end of the field, or the product's own icon-only Button. The clear button and a date or time field's picker button come after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 *
 * Events:
 * - `onChange` (`change`) — The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 * - `onPickerRequest` (`pickerrequest`) — The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * - `onEntryError` (`entryerror`) — The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 * - `onResizeEnd` (`resizeend`) — The person finished changing the size of a field resized by hand: a drag of its handle ended, or a key or an activation of the handle changed it (TXI-69). `detail.lines` and `detail.width`.
 * - `onRevealChange` (`revealchange`) — The person showed or hid the value of a password field with the reveal button (TXI-72); `revealed` is already the new one. `detail.revealed`. Never fired when the product sets `revealed`, or when the field hides the value itself.
 */
export const TextField: Marked<typeof TextFieldElement, TextFieldMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withTextFieldMarks(TextFieldElement), 'tanrei-text-field', TanreiTextFieldElement, TextFieldAttributes);

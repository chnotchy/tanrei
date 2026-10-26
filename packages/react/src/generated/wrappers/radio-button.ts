// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiRadioButton as TanreiRadioButtonElement, type TanreiRadioButtonChangeDetail } from '@tanrei/web/components/radio-button';

/** The attributes of `<tanrei-radio-button>` that are not properties of the element, as props of `RadioButton`. */
export interface RadioButtonMarks {
  /** The id of the form the radio button belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const RadioButtonElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-radio-button',
  elementClass: TanreiRadioButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiRadioButtonElement, CustomEvent<TanreiRadioButtonChangeDetail>>>,
  },
});
const withRadioButtonMarks = /* @__PURE__ */ withMarks<RadioButtonMarks>([], ['form']);
const RadioButtonAttributes = { checked: ['checked', false], value: ['value', ''], name: ['name', ''], disabled: ['disabled', false], readOnly: ['readonly', false], error: ['error', false], label: ['label', ''], labelHidden: ['label-hidden', false], form: ['form'] } as const;
/**
 * Lets people choose exactly one option from a small group shown all at once.
 *
 * Events:
 * - `onChange` (`change`) — The user selected this option; `detail.value` is its value.
 */
export const RadioButton: Marked<typeof RadioButtonElement, RadioButtonMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withRadioButtonMarks(RadioButtonElement), 'tanrei-radio-button', TanreiRadioButtonElement, RadioButtonAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiRadioGroup as TanreiRadioGroupElement, type TanreiRadioGroupChangeDetail } from '@tanrei/web/components/radio-group';

/** The attributes of `<tanrei-radio-group>` that are not properties of the element, as props of `RadioGroup`. */
export interface RadioGroupMarks {
  /** The id of the form the radio group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const RadioGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-radio-group',
  elementClass: TanreiRadioGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiRadioGroupElement, CustomEvent<TanreiRadioGroupChangeDetail>>>,
  },
});
const withRadioGroupMarks = /* @__PURE__ */ withMarks<RadioGroupMarks>([], ['form']);
/**
 * Asks one question that has exactly one answer among a few options shown all at once. Built from a field group (`<tanrei-field-group>`) and radio buttons (`<tanrei-radio-button>`): the field group itself, in its radio-group kind — its label, requirement, description and one error — around the product's own radio buttons, whose chosen value the group holds under one name.
 *
 * Children, by their `slot`:
 * - default — The radio buttons of the set, in the order given: `<tanrei-radio-button value="…">` elements.
 *
 * Events:
 * - `onChange` (`change`) — The person selected another option; `detail.value` is the new value, which the group already holds.
 */
export const RadioGroup: Marked<typeof RadioGroupElement, RadioGroupMarks> = /* @__PURE__ */ withRadioGroupMarks(RadioGroupElement);

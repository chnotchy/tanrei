// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiCheckboxGroup as TanreiCheckboxGroupElement, type TanreiCheckboxGroupChangeDetail } from '@tanrei/web/components/checkbox-group';

/** The attributes of `<tanrei-checkbox-group>` that are not properties of the element, as props of `CheckboxGroup`. */
export interface CheckboxGroupMarks {
  /** The id of the form the checkbox group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const CheckboxGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-checkbox-group',
  elementClass: TanreiCheckboxGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCheckboxGroupElement, CustomEvent<TanreiCheckboxGroupChangeDetail>>>,
  },
});
const withCheckboxGroupMarks = /* @__PURE__ */ withMarks<CheckboxGroupMarks>([], ['form']);
/**
 * Asks one question that may have several answers among a few choices shown all at once. Built from a field group (`<tanrei-field-group>`) and checkboxes (`<tanrei-checkbox>`): the field group's label, requirement, description and one error around the product's own checkboxes, whose checked values the group holds as one list under one name, and — where `select-all-label` is given — one more checkbox before the first that checks them all.
 *
 * Children, by their `slot`:
 * - default — The checkboxes of the set, in the order given: `<tanrei-checkbox value="…">` elements.
 *
 * Events:
 * - `onChange` (`change`) — The person switched a checkbox of the set, or the select-all checkbox; `detail.value` is a copy of the new list, which the group already holds. Fired once per action, by the group and not by its checkboxes.
 */
export const CheckboxGroup: Marked<typeof CheckboxGroupElement, CheckboxGroupMarks> = /* @__PURE__ */ withCheckboxGroupMarks(CheckboxGroupElement);

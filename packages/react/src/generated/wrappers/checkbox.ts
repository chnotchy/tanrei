// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiCheckbox as TanreiCheckboxElement, type TanreiCheckboxChangeDetail } from '@tanrei/web/components/checkbox';

/** The attributes of `<tanrei-checkbox>` that are not properties of the element, as props of `Checkbox`. */
export interface CheckboxMarks {
  /** The id of the form the checkbox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const CheckboxElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-checkbox',
  elementClass: TanreiCheckboxElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCheckboxElement, CustomEvent<TanreiCheckboxChangeDetail>>>,
  },
});
const withCheckboxMarks = /* @__PURE__ */ withMarks<CheckboxMarks>([], ['form']);
const CheckboxAttributes = { checked: ['checked', false], indeterminate: ['indeterminate', false], error: ['error', false], disabled: ['disabled', false], readOnly: ['readonly', false], label: ['label', ''], labelHidden: ['label-hidden', false], required: ['required', false], name: ['name', ''], value: ['value', 'on'], form: ['form'] } as const;
/**
 * Lets people turn one independent choice on or off, show a parent choice that is only partly on, and mark a required choice left unmade.
 *
 * Events:
 * - `onChange` (`change`) — The user switched it; `detail.checked` (and the element's `checked`) is the new value.
 */
export const Checkbox: Marked<typeof CheckboxElement, CheckboxMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withCheckboxMarks(CheckboxElement), 'tanrei-checkbox', TanreiCheckboxElement, CheckboxAttributes);

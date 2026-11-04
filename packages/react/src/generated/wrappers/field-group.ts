// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiFieldGroup as TanreiFieldGroupElement } from '@tanrei/web/components/field-group';

const FieldGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-field-group',
  elementClass: TanreiFieldGroupElement,
  react: React,
  events: {},
});
const FieldGroupAttributes = { label: ['label', ''], labelHidden: ['label-hidden', false], supportingText: ['supporting-text', ''], errorText: ['error-text', ''], error: ['error', false], disabled: ['disabled', false], required: ['required', false], optional: ['optional', false], requiredMark: ['required-mark', 'auto'], requiredText: ['required-text', ''], optionalText: ['optional-text', ''], orientation: ['orientation', 'vertical'], spacing: ['spacing', 'controls'], kind: ['kind', 'group'] } as const;
/**
 * Names a set of controls that answer one question — checkboxes, switches, or fields that belong together — with a label that can say the set is required or optional, a description, and one error for the set, and lays the controls out in a column or a row. It frames the set and never selects, moves focus or holds a value.
 *
 * Children, by their `slot`:
 * - default — The controls of the set, in the order given.
 */
export const FieldGroup = /* @__PURE__ */ withServerAttributes(FieldGroupElement, 'tanrei-field-group', TanreiFieldGroupElement, FieldGroupAttributes);

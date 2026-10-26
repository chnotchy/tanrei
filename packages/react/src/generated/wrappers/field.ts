// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiField as TanreiFieldElement } from '@tanrei/web/components/field';

const FieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-field',
  elementClass: TanreiFieldElement,
  react: React,
  events: {},
});
const FieldAttributes = { label: ['label', ''], labelHidden: ['label-hidden', false], supportingText: ['supporting-text', ''], errorText: ['error-text', ''], error: ['error', false], disabled: ['disabled', false], required: ['required', false], optional: ['optional', false], requiredMark: ['required-mark', 'auto'], requiredText: ['required-text', ''], optionalText: ['optional-text', ''], countText: ['count-text', ''], valueText: ['value-text', ''] } as const;
/**
 * Frames one control with what a form gives every field: a label above it that can say the control is required or optional, a line of help, and the reason a value was refused, each tied to the control for assistive technology. It is a frame, never a control.
 *
 * Children, by their `slot`:
 * - default — The one control the field frames.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Field = /* @__PURE__ */ withServerAttributes(FieldElement, 'tanrei-field', TanreiFieldElement, FieldAttributes);

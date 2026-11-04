// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiStepperStep as TanreiStepperStepElement } from '@tanrei/web/components/stepper';

const StepperStepElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-stepper-step',
  elementClass: TanreiStepperStepElement,
  react: React,
  events: {},
});
const StepperStepAttributes = { value: ['value', ''], label: ['label', ''], description: ['description', ''], status: ['status', 'auto'], disabled: ['disabled', false] } as const;
/**
 * One step of a stepper — the spec's item kind `step`: its value, its label, an optional description, its status and whether it can be gone to. Placed as a child of `<tanrei-stepper>`, as `<option>` in a `<select>`; the stepper decides its condition, its number and whether it can be pressed.
 */
export const StepperStep = /* @__PURE__ */ withServerAttributes(StepperStepElement, 'tanrei-stepper-step', TanreiStepperStepElement, StepperStepAttributes);

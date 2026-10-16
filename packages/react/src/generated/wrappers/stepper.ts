// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiStepper as TanreiStepperElement, type TanreiStepperSelectDetail } from '@tanrei/web/components/stepper';

/**
 * Shows where a person is in a flow the product runs in a fixed order of steps — which step is current, which are complete, which has an error and which are still to come — and, where the product allows it, lets the person press a step to go back to it.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-stepper-step>` children: the steps.
 *
 * Events:
 * - `onSelect` (`select`) — The person pressed a step to go to it: `detail.value` is its value. The stepper does not change `value`.
 */
export const Stepper = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-stepper',
  elementClass: TanreiStepperElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiStepperElement, CustomEvent<TanreiStepperSelectDetail>>>,
  },
});

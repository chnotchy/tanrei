// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSlider as TanreiSliderElement, type TanreiSliderChangeDetail } from '@tanrei/web/components/slider';

/** The attributes of `<tanrei-slider>` that are not properties of the element, as props of `Slider`. */
export interface SliderMarks {
  /** The id of the form the slider belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SliderElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-slider',
  elementClass: TanreiSliderElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiSliderElement, CustomEvent<TanreiSliderChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSliderElement, CustomEvent<TanreiSliderChangeDetail>>>,
  },
});
const withSliderMarks = /* @__PURE__ */ withMarks<SliderMarks>([], ['form']);
const SliderAttributes = { size: ['size', 'small'], orientation: ['orientation', 'horizontal'], value: ['value', 0], startValue: ['start-value', 0], range: ['range', false], min: ['min', 0], max: ['max', 100], step: ['step', 0], origin: ['origin', null], stops: ['stops', false], valueIndicator: ['value-indicator', 'none'], disabled: ['disabled', false], label: ['label', ''], startLabel: ['start-label', ''], valueText: ['value-text', ''], startValueText: ['start-value-text', ''], name: ['name', ''], form: ['form'] } as const;
/**
 * Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging a handle along a track.
 *
 * Events:
 * - `onInput` (`input`) — The person changed a value; the element's `value` (and `startValue`) is already the new one.
 * - `onChange` (`change`) — The person finished changing a value (the press ended, or a key was pressed); always after its input.
 */
export const Slider: Marked<typeof SliderElement, SliderMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withSliderMarks(SliderElement), 'tanrei-slider', TanreiSliderElement, SliderAttributes);

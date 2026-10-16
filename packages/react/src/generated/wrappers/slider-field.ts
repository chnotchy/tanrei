// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiSliderField as TanreiSliderFieldElement, type TanreiSliderChangeDetail } from '@tanrei/web/components/slider-field';

/** The attributes of `<tanrei-slider-field>` that are not properties of the element, as props of `SliderField`. */
export interface SliderFieldMarks {
  /** The id of the form the slider field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SliderFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-slider-field',
  elementClass: TanreiSliderFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiSliderFieldElement, CustomEvent<TanreiSliderChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSliderFieldElement, CustomEvent<TanreiSliderChangeDetail>>>,
  },
});
const withSliderFieldMarks = /* @__PURE__ */ withMarks<SliderFieldMarks>([], ['form']);
/**
 * Lets people choose a value, or a range of values, on a scale as one complete field. Built from a Field (`<tanrei-field>`) and the Slider (`<tanrei-slider>`) it frames: the track under the Field's label, with the value in words at the end of the label row, the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed a value; the element's `value` (and `startValue`) is already the new one.
 * - `onChange` (`change`) — The person finished changing a value (the press ended, or a key was pressed); always after its input.
 */
export const SliderField: Marked<typeof SliderFieldElement, SliderFieldMarks> = /* @__PURE__ */ withSliderFieldMarks(SliderFieldElement);

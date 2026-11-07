// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiRating as TanreiRatingElement, type TanreiRatingChangeDetail, type TanreiRatingPreviewDetail } from '@tanrei/web/components/rating';

/** The attributes of `<tanrei-rating>` that are not properties of the element, as props of `Rating`. */
export interface RatingMarks {
  /** The id of the form the rating belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element. */
  form?: string;
}

const RatingElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-rating',
  elementClass: TanreiRatingElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiRatingElement, CustomEvent<TanreiRatingChangeDetail>>>,
    onPreview: 'preview' as EventName<TanreiEvent<TanreiRatingElement, CustomEvent<TanreiRatingPreviewDetail>>>,
  },
});
const withRatingMarks = /* @__PURE__ */ withMarks<RatingMarks>([], ['form']);
const RatingAttributes = { value: ['value', 0], max: ['max', 5], allowHalf: ['allow-half', false], size: ['size', 'medium'], icon: ['icon', ''], label: ['label', ''], optionLabels: ['option-labels'], valueText: ['value-text', ''], readOnly: ['read-only', false], disabled: ['disabled', false], name: ['name', ''], form: ['form'] } as const;
/**
 * Lets a person give a score out of a few marks — stars by default — or shows a score already given, a whole mark or, where the product allows it, a half mark at a time.
 *
 * Events:
 * - `onChange` (`change`) — The person changed the score, by a press or a key; `detail.value` is the new score, which `value` already holds. Not fired when the product sets `value`.
 * - `onPreview` (`preview`) — A fine pointer moved onto a mark (`detail.value` is the score it would give) or off the rating (`null`).
 */
export const Rating: Marked<typeof RatingElement, RatingMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withRatingMarks(RatingElement), 'tanrei-rating', TanreiRatingElement, RatingAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiSegment as TanreiSegmentElement } from '@tanrei/web/components/segmented-button';

const SegmentElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-segment',
  elementClass: TanreiSegmentElement,
  react: React,
  events: {},
});
const SegmentAttributes = { value: ['value', ''], label: ['label', ''], icon: ['icon', ''], labelHidden: ['label-hidden', false], disabled: ['disabled', false] } as const;
/**
 * One option of a segmented button — the spec's item kind `segment`: a label, an optional icon, and the value that selects it. Placed as a child of `<tanrei-segmented-button>`, as `<option>` in a `<select>`; the set decides whether it is selected and which segment is the Tab stop, and answers its activation.
 */
export const Segment = /* @__PURE__ */ withServerAttributes(SegmentElement, 'tanrei-segment', TanreiSegmentElement, SegmentAttributes);

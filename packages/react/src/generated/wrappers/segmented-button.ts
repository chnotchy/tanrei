// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiSegmentedButton as TanreiSegmentedButtonElement, type TanreiSegmentedButtonChangeDetail } from '@tanrei/web/components/segmented-button';

/**
 * Lets people choose one option, or several, from two to five related options drawn side by side as the joined segments of one control.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-segment>` children: the segments.
 *
 * Events:
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the set already holds.
 */
export const SegmentedButton = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-segmented-button',
  elementClass: TanreiSegmentedButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSegmentedButtonElement, CustomEvent<TanreiSegmentedButtonChangeDetail>>>,
  },
});

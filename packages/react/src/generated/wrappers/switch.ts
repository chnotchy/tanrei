// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiSwitch as TanreiSwitchElement, type TanreiSwitchChangeDetail } from '@tanrei/web/components/switch';

/** The attributes of `<tanrei-switch>` that are not properties of the element, as props of `Switch`. */
export interface SwitchMarks {
  /** The id of the form the switch belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SwitchElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-switch',
  elementClass: TanreiSwitchElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSwitchElement, CustomEvent<TanreiSwitchChangeDetail>>>,
  },
});
const withSwitchMarks = /* @__PURE__ */ withMarks<SwitchMarks>([], ['form']);
/**
 * Turns one setting on or off, taking effect at once, with a handle that follows a finger dragged along the track.
 *
 * Events:
 * - `onChange` (`change`) — The user switched it; `detail.checked` (and the element's `checked`) is the new value.
 */
export const Switch: Marked<typeof SwitchElement, SwitchMarks> = /* @__PURE__ */ withSwitchMarks(SwitchElement);

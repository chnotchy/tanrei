// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiSelectField as TanreiSelectFieldElement, type TanreiSelectToggleDetail } from '@tanrei/web/components/select-field';

/** The attributes of `<tanrei-select-field>` that are not properties of the element, as props of `SelectField`. */
export interface SelectFieldMarks {
  /** For tests and fixtures: the select's own attribute of that name, passed on. It draws the open list in place below the trigger and not in the top layer, so that an open fixture and its twin are staged alike. No prop of the component. */
  inline?: boolean;
  /** The id of the form the select field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SelectFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-select-field',
  elementClass: TanreiSelectFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSelectFieldElement>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSelectFieldElement, CustomEvent<TanreiSelectToggleDetail>>>,
  },
});
const withSelectFieldMarks = /* @__PURE__ */ withMarks<SelectFieldMarks>(['inline'], ['form']);
/**
 * Lets people choose one value from a closed list as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Select (`<tanrei-select>`) it frames: the trigger and its list under the Field's label — or, in the filled and the outlined look, with the label floating in the box — with the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place.
 * - `leading-icon` — A glyph at the start of the container that stands for the field whatever is chosen (a globe before a language). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The person chose an option whose value differs from the select's, or cleared the value with the clear button; `value` is already the new one. A composed, bubbling Event, as a native select's. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `escape`, `outside`, `focus-out`, `anchor-hidden`, `press` or `tab`. After a choice it follows `change`. Composed and not bubbling: heard on the element — and on an element composed around it — and by no ancestor. Never fired when the product sets `open`.
 */
export const SelectField: Marked<typeof SelectFieldElement, SelectFieldMarks> = /* @__PURE__ */ withSelectFieldMarks(SelectFieldElement);

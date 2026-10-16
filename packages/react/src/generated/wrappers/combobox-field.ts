// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { TanreiComboboxField as TanreiComboboxFieldElement, type TanreiComboboxChangeDetail, type TanreiComboboxToggleDetail } from '@tanrei/web/components/combobox-field';

/** The attributes of `<tanrei-combobox-field>` that are not properties of the element, as props of `ComboboxField`. */
export interface ComboboxFieldMarks {
  /** The id of the form the combobox field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ComboboxFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-combobox-field',
  elementClass: TanreiComboboxFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxToggleDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxChangeDetail>>>,
  },
});
const withComboboxFieldMarks = /* @__PURE__ */ withMarks<ComboboxFieldMarks>([], ['form']);
/**
 * Lets people find one value by typing, as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Combobox (`<tanrei-combobox>`) it frames: the box with its list of options under the Field's label — or, in the filled and the outlined look, with the label floating in it — with the Field's requirement mark, its help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `leading-icon` — A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * - `onAction` (`action`) — The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 */
export const ComboboxField: Marked<typeof ComboboxFieldElement, ComboboxFieldMarks> = /* @__PURE__ */ withComboboxFieldMarks(ComboboxFieldElement);

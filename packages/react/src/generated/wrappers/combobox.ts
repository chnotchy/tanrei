// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiCombobox as TanreiComboboxElement, type TanreiComboboxChangeDetail, type TanreiComboboxToggleDetail } from '@tanrei/web/components/combobox';

/** The attributes of `<tanrei-combobox>` that are not properties of the element, as props of `Combobox`. */
export interface ComboboxMarks {
  /** The id of the form the combobox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ComboboxElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-combobox',
  elementClass: TanreiComboboxElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxToggleDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxChangeDetail>>>,
  },
});
const withComboboxMarks = /* @__PURE__ */ withMarks<ComboboxMarks>([], ['form']);
const ComboboxAttributes = { variant: ['variant', 'stacked'], size: ['size', 'medium'], value: ['value', ''], inputValue: ['input-value'], name: ['name', ''], label: ['label', ''], labelHidden: ['label-hidden', false], placeholder: ['placeholder', ''], error: ['error', false], disabled: ['disabled', false], readOnly: ['readonly', false], open: ['open', false], allowCustomValue: ['allow-custom-value', false], filter: ['filter', 'contains'], wrap: ['no-wrap', true], noChevron: ['no-chevron', false], clearable: ['clearable', false], clearLabel: ['clear-label', ''], status: ['status', 'idle'], statusText: ['status-text', ''], emptyText: ['empty-text', ''], separation: ['separation', 'auto'], iconSpace: ['icon-space', 'auto'], density: ['density', 'regular'], inline: ['inline', false], form: ['form'] } as const;
/**
 * Lets people find one value by typing: a box that looks and measures like a text input, with a list of options that narrows as they type and that they choose from, or, where the product allows it, a value of their own. The bare control: it has no label row and no message of its own.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * - `leading-icon` — A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * - `onAction` (`action`) — The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 */
export const Combobox: Marked<typeof ComboboxElement, ComboboxMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withComboboxMarks(ComboboxElement), 'tanrei-combobox', TanreiComboboxElement, ComboboxAttributes);

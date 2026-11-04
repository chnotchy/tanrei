// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSelect as TanreiSelectElement, type TanreiSelectToggleDetail } from '@tanrei/web/components/select';

/** The attributes of `<tanrei-select>` that are not properties of the element, as props of `Select`. */
export interface SelectMarks {
  /** The id of the form the select belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const SelectElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-select',
  elementClass: TanreiSelectElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSelectElement>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSelectElement, CustomEvent<TanreiSelectToggleDetail>>>,
  },
});
const withSelectMarks = /* @__PURE__ */ withMarks<SelectMarks>([], ['form']);
const SelectAttributes = { variant: ['variant', 'stacked'], size: ['size', 'medium'], value: ['value', ''], name: ['name', ''], label: ['label', ''], labelHidden: ['label-hidden', false], placeholder: ['placeholder', ''], error: ['error', false], disabled: ['disabled', false], readOnly: ['readonly', false], clearable: ['clearable', false], clearLabel: ['clear-label', ''], open: ['open', false], separation: ['separation', 'auto'], iconSpace: ['icon-space', 'auto'], density: ['density', 'regular'], status: ['status', 'idle'], statusText: ['status-text', ''], emptyText: ['empty-text', ''], inline: ['inline', false], form: ['form'] } as const;
/**
 * Lets people choose one value from a closed list: a trigger that looks and measures like a text input's box and shows the chosen option, and a list of options, optionally grouped, that opens from it. The bare control: it draws no label row, no requirement mark, no help and no error text.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place.
 * - `leading-icon` — A glyph at the start of the container that stands for the field whatever is chosen (a globe before a language). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The person chose an option whose value differs from the select's, or cleared the value with the clear button; `value` is already the new one. A composed, bubbling Event, as a native select's. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `escape`, `outside`, `focus-out`, `anchor-hidden`, `press` or `tab`. After a choice it follows `change`. Composed and not bubbling: heard on the element — and on an element composed around it — and by no ancestor. Never fired when the product sets `open`.
 */
export const Select: Marked<typeof SelectElement, SelectMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withSelectMarks(SelectElement), 'tanrei-select', TanreiSelectElement, SelectAttributes);

// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiEmbeddedTextInput as TanreiEmbeddedTextInputElement, type TanreiEmbeddedTextInputActionDetail, type TanreiEmbeddedTextInputRowsChangeDetail } from '@tanrei/web/components/embedded-text-input';

/** The attributes of `<tanrei-embedded-text-input>` that are not properties of the element, as props of `EmbeddedTextInput`. */
export interface EmbeddedTextInputMarks {
  /** The id of the form the input belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element. */
  form?: string;
}

const EmbeddedTextInputElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-embedded-text-input',
  elementClass: TanreiEmbeddedTextInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement, CustomEvent<TanreiEmbeddedTextInputActionDetail>>>,
    onRowsChange: 'rowschange' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement, CustomEvent<TanreiEmbeddedTextInputRowsChangeDetail>>>,
  },
});
const withEmbeddedTextInputMarks = /* @__PURE__ */ withMarks<EmbeddedTextInputMarks>([], ['form']);
const EmbeddedTextInputAttributes = { type: ['type', 'text'], value: ['value'], label: ['label', ''], description: ['description', ''], placeholder: ['placeholder', ''], multiline: ['multiline', false], minRows: ['min-rows', 1], maxRows: ['max-rows', 0], enterKey: ['enter-key', 'line-break'], error: ['error', false], required: ['required', false], disabled: ['disabled', false], readOnly: ['readonly', false], autocomplete: ['autocomplete', ''], name: ['name', ''], form: ['form'] } as const;
/**
 * The typing alone, for a box that something else draws: the text, a placeholder, the caret and the selection — on one line, or (`multiline`) on lines that wrap, as tall as its lines between `min-rows` and `max-rows` and changing its height with a motion. **It draws no container, fill, edge, padding, label or message, and no focus indication**: whatever holds it — a Tanrei component built from it, or the product's own box — draws the box, shows the focus on the box (`:focus-within`), marks an error, pads the text, names the input (`label`, required: nothing else names it) and decides what its action is. A holder that shows no focus on its box fails WCAG 2.4.7. Where the box is a text field's box, use `<tanrei-text-input>` (or `<tanrei-text-field>`).
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, or `action` was emitted. Bubbles.
 * - `onAction` (`action`) — The person asked for the action of whatever holds the input, by Enter as `enter-key` says or by Ctrl+Enter or Command+Enter. `detail.value` is the value. Bubbles; cancelable — a cancelled one keeps a single-line input from submitting its form.
 * - `onRowsChange` (`rowschange`) — The number of lines the input shows is about to change, or it was first drawn: `detail.rows`, and `detail.scrolling` where the text has more lines and scrolls inside. Once per change, before the height moves. Bubbles.
 */
export const EmbeddedTextInput: Marked<typeof EmbeddedTextInputElement, EmbeddedTextInputMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withEmbeddedTextInputMarks(EmbeddedTextInputElement), 'tanrei-embedded-text-input', TanreiEmbeddedTextInputElement, EmbeddedTextInputAttributes);

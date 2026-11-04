// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiChipField as TanreiChipFieldElement, type TanreiChipFieldChangeDetail, type TanreiChipFieldRejectDetail, type TanreiChipFieldCheckDetail, type TanreiTextInputActionDetail } from '@tanrei/web/components/chip-field';

/** The attributes of `<tanrei-chip-field>` that are not properties of the element, as props of `ChipField`. */
export interface ChipFieldMarks {
  /** The id of the form the chip field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}

const ChipFieldElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-chip-field',
  elementClass: TanreiChipFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldChangeDetail>>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldRejectDetail>>>,
    onCheck: 'check' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldCheckDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiTextInputActionDetail>>>,
  },
});
const withChipFieldMarks = /* @__PURE__ */ withMarks<ChipFieldMarks>([], ['form']);
const ChipFieldAttributes = { value: ['value'], inputValue: ['input-value'], separators: ['separators'], maxEntries: ['max-entries', 0], variant: ['variant', 'stacked'], size: ['size', 'medium'], type: ['type', 'text'], placeholder: ['placeholder', ''], readOnly: ['readonly', false], autocomplete: ['autocomplete', ''], label: ['label', ''], labelHidden: ['label-hidden', false], supportingText: ['supporting-text', ''], errorText: ['error-text', ''], error: ['error', false], disabled: ['disabled', false], required: ['required', false], optional: ['optional', false], requiredMark: ['required-mark', 'auto'], requiredText: ['required-text', ''], optionalText: ['optional-text', ''], invalidText: ['invalid-text', ''], duplicateText: ['duplicate-text', ''], limitText: ['limit-text', ''], removeLabel: ['remove-label', ''], addedText: ['added-text', ''], addedCountText: ['added-count-text', ''], removedText: ['removed-text', ''], name: ['name', ''], form: ['form'] } as const;
/**
 * Collects a list of short texts — e-mail addresses, telephone numbers, keywords — typed one after another in one field. Built from a Field (`<tanrei-field>`), the Text input it frames (`<tanrei-text-input>`) and one Chip (`<tanrei-chip>`) for each entry, standing in the Text input's box before the typing part: each text the product's check accepts becomes a chip that can be removed or taken back, and the list is the field's one value.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The list changed by the person: an entry was made, several were made from pasted text, one was removed, or one was taken back to be changed. `detail.value` (and the element's `value`) is the new list, `detail.added` and `detail.removed` what the act added and took away. Never fired when the product sets `value`, nor for typed text.
 * - `onReject` (`reject`) — A candidate entry was refused: `detail.text`, `detail.reason` (`invalid`, `duplicate` or `limit`) and `detail.message`, the words shown. Once for each refused candidate.
 * - `onCheck` (`check`) — Asked once for each candidate entry, before it is made: `detail.text` and `detail.values`, the entries so far. Cancelable: `preventDefault()` refuses the candidate, and `detail.reason`, set by the listener, gives the words shown. Read when the event returns; an answer given later is not read.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const ChipField: Marked<typeof ChipFieldElement, ChipFieldMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withChipFieldMarks(ChipFieldElement), 'tanrei-chip-field', TanreiChipFieldElement, ChipFieldAttributes);

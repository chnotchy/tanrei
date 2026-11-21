---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
'@tanrei/docs': patch
---

Combobox chooses several values: `selection="multiple"` (default `single`, which is unchanged) with `values`, an array
in the order the values were chosen (the attribute is a JSON array or words). Each chosen value is an input Chip in the
box before the text, in lines that wrap; the box grows by whole lines and never hides a value behind a count. A choice
adds the option, or takes it out where it is chosen, empties the text and leaves the list open for the next one;
leaving the field or Escape empties the text and chooses nothing. Backspace at the start of the text moves focus to the
last chip, where the arrows, Home and End move among the chips and Backspace or Delete removes one — the chip field's
keys. The listbox is `aria-multiselectable`, each option says whether it is selected, the chips are a list named like
the combobox, and a polite live region says what was added or removed (`remove-label`, `added-text`, `removed-text`,
which read the chip field's words `entryRemoveLabel`, `entryAddedText` and `entryRemovedText` when left empty). In a
form it submits one entry per value under its `name`, as `<select multiple>` does, and resets to its `values`
attribute. `change` carries `detail.values`. New parts: `entry`, `entry-container`, `entry-label`, `entry-remove`. New
tokens `comp.combobox.entries.gap`, `.row-gap` and `.typing-min-width`, aliases of the text input's entries spacing.
Combobox spec: CMB-70 to CMB-82; the native platforms have not implemented it yet.

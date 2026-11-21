---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Text input and select: `clearable` and `clearLabel`, as the combobox has them. With `clearable`, a single-line text
input draws a clear button at its end, after the `trailing-icon` slot, while it holds a value; a press empties the value,
emits `input` and — where the value changed since the input took focus — `change`, and leaves focus in the input (a
pointer press never takes focus from it). A select draws its clear button before the chevron while a value is chosen; a
press empties the value, emits `change` and gives focus back to the select, and an open list stays open. The button is a
small icon-only text Button showing `close`, a focus stop after the control, named by `clearLabel` or the product's
`clearLabel` word (`setWords({ clearLabel })`). Its room is kept while the value is empty, so the text, the chevron and a
bare select's width do not move. In the select it stands after the `role="combobox"` element, never inside it. A
multi-line text input, a date and a time draw none, and a debug build says so. The text field and the select field
forward both props. New part `clear-button` on both elements; the text field and the select field export it.

New tokens: `comp.text-input.container.action-gap` and `comp.select.container.action-gap`, the gap between the clear
button and the next button of the box's own (the chevron, the picker button). Both follow
`comp.combobox.container.action-gap` by default, so that the three boxes end alike. The vocabulary grows by these two; the native platforms gain the two tokens in their generated token sets
and do not draw the clear button yet.

New fixtures (`stacked-clearable`, `stacked-clearable-empty`, `outlined-clearable`, `stacked-clearable-rtl` of the text
input; `stacked-clearable`, `stacked-clearable-empty`, `outlined-clearable`, `clearable-rtl` of the select) have new
baselines. No existing picture changes: the text input's end buttons are laid out by one rule now, which draws the
picker button where it was.

---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Number input, one-time-code input, search, color input and date-time picker: rules settled by the web review.

- Number input (and number field): Page Up and Page Down step ten steps on the grid of `step`, as a slider's page keys
  and the platform's `stepUp(10)` do — with a step of 2, 42 goes to 62 and 82, no longer to the next multiple of 20
  (60). Where the place is too narrow for the input's line and the steppers side by side (text at 200% in a window
  320 wide, with a prefix and a suffix), the steppers move to a row of their own below the line, at the container's
  end, instead of making the box wider than the window; they are never hidden, because on touch they are the only way
  to step.
- One-time-code input: the caret's width is a token of its own, `comp.one-time-code-input.caret.width` (new
  vocabulary). The default system keeps the hairline; `m3-like` and `cupertino` draw it 2 wide, as their platforms'
  text carets are. The spec now says what the default system does at 200% text in a layout 288 wide: two rows of
  three, because the paddings and gaps grow with the text.
- Search: a match in an excerpt is told by a fill as well as by its color and weight —
  `comp.search.result.mark.container.color` now aliases `sys.color.secondary-container` instead of being transparent —
  so it is found in every script, also where the reader's font has no weight between regular and bold. The match's
  color keeps at least 7:1 on the fill in every scheme of every shipped system. The docs add that a product that binds
  a single character key such as `/` gives people a way to turn it off or change it (WCAG 2.1.4).
- Color input (and color field): while the picker button is shown, a press on the swatch does what a press on the
  button does; the swatch still takes no focus and draws no answer, and the keyboard's way stays the button. A commit
  reads three hexadecimal digits (`#fff`, `F0A`) as the six they stand for and writes them in the value's form
  (`#ffffff`, `#ff00aa`), with `input` and then `change`; while typing, three digits are still no color.
- Date-time picker: while the period has focus, typing the first letter of a period's name in the locale (A or P in
  English) sets that period; where both names begin with the same character (午前, 午後) it changes the period.

The native platforms are paused: their generated tokens carry the new and changed values, and each platform takes the
behaviour when it catches up with the spec.

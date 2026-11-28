---
'@tanrei/web': minor
---

Table: `selection="single"` chooses one row at most. Each body row that can be chosen holds a radio button in its
selection cell — a `<tanrei-radio-button label-hidden>` or a native `<input type="radio">` — and the header row's
selection cell stays empty, since no control stands for every row. The radio buttons of a table share one name (yours,
or one the element gives those that have none), so they are one group: one Tab stop, and the arrow keys move the choice
from row to row. Choosing a row lets the chosen one go, and `selectionchange` carries that one value. As a radio is not
cleared by its own activation, the chosen row's radio button and a press on that row change nothing; to choose no row
again, remove `data-selected` yourself. A press anywhere on a row, its hover and its press work as they do for a row's
checkbox. The table stays a table: no grid, no `aria-selected`, and no radio group around the rows. Native radios of
one name work without script, and the row of the checked one is drawn chosen. Nothing changes for `none` and
`multiple`.

A new fixture, `selection-single`, has its own baselines.

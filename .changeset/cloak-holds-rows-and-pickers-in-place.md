---
'@tanrei/web': patch
---

**Cloak: a multi-line input is held at its fewest rows, and an open date and time picker drawn in place is held as
its surface.** `@tanrei/web/cloak.css` held a multi-line text input, text field or embedded text input at one line, so
a field of `min-rows="3"` grew by two lines when it was defined and moved everything below it; and it took every date
and time picker out of the page, so one drawn in place (`inline open`, as documentation draws it) went from no height
to its surface's. Before they are defined:

- a multi-line text input or text field is as tall as it is drawn empty — its first line where its variant sets it,
  `min-rows` lines of its input text (2 by default), and its block padding, at every size and in every variant; an
  embedded text input is `min-rows` lines (1 by default). `min-rows` is read as a number where the browser reads an
  attribute as one (`attr()`), and counted from 1 to 50 otherwise. A field that holds a value of more lines still grows
  by them when it is defined;
- an open picker drawn in place is a block of its surface's height — its header, its calendar and time section, and its
  actions, from the picker's tokens, under the design system's entry modes and actions' size — and of its body's width.
  The horizontal layout, a label or a range field's time that wraps, and actions that stack are not held. A picker that
  is not drawn in place still takes no room before it is defined.

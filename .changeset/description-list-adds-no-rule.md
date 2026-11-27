---
'@tanrei/web': patch
---

The description list adds no rule to the page any more. It used to add a rule to a stylesheet of the page for each
width an inline list stacks under, and for each size added by a design system or number of columns above 6. In WebKit,
a rule added to a page's sheets, or a sheet added to them, rebuilds every rule of the page and restyles the whole page:
0.8 s on the docs' Arabic Button page, and 0.22 s for each list on a test page of 17 000 elements. Chromium takes 2 to
4 ms for the same work. Now the list writes each decision on its own wrapper, which restyles only the list:

- DSL-4: the width under which the list stacks becomes the wrapper's line height (`--_dl-stacks-below`). No text of
  the list uses that line height. One container query in `description-list.css`, `(inline-size < 1lh)`, compares it
  with the list's width. The rule is no longer delayed until after the first paint, so a list that has room is drawn
  in its final form in the frame where it is measured.
- DSL-7: a number of columns above 6 is written as `--_dl-columns`.
- DSL-23: a size added by a design system is written as the size's own names, read from its tokens.

What is drawn does not change. The wrapper's line height is 0 until the list is measured, and stays 0 without script
and in the stacked and stat layouts.

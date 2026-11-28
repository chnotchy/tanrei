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
and in the stacked and stat layouts. The container query is asked of every list in every state, also while it is
measured, by a second rule that sets a name nothing reads: Chromium answers a container query again when the
container's line height changes only if it asked that query before, so a list inserted after the page was painted,
and first styled while it was measured, would otherwise stay in two columns however narrow it was.

Measured on the docs' Arabic Button page: the list's write there cost WebKit 0.79 s and now costs 2 ms. Fifty lists
appended to that page at once reach their next frame in 0.17 s instead of 1.2 s, and one list appended alone in 67 ms
instead of 1 s. Chromium pays for the change once per list: its line height changes after the list is measured, and
that adds one style pass over the list's own elements. Fifty lists on a bare page cost 105 style passes instead of 55,
about 3 ms more style time. The test of the style passes now holds the description list to two passes per list.

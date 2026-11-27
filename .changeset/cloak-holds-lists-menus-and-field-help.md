---
'@tanrei/web': patch
---

Before their elements are defined, lists keep the box they are drawn in.

- The cloak (`@tanrei/web/cloak.css`) lays a list out as the list lays out its items: a column, a line or lines that
  wrap, its `gap` apart. In a reorderable list each item keeps its handle's room; an action, a link or an option keeps
  its paddings, its least height and its text style, and an option the room of its check. Before, a list's items stood
  one under another with no gap: a docs figure of a column, a line and a grid was 602 px high before and 474 px drawn,
  and a figure of options 254 px before and 336 px drawn.

---
'@tanrei/web': patch
---

Before their elements are defined, lists, menus drawn in place, menu bars and fields whose help or error text wraps
keep the box they are drawn in.

- The cloak (`@tanrei/web/cloak.css`) lays a list out as the list lays out its items: a column, a line or lines that
  wrap, its `gap` apart. In a reorderable list each item keeps its handle's room; an action, a link or an option keeps
  its paddings, its least height and its text style, and an option the room of its check. Before, a list's items stood
  one under another with no gap: a docs figure of a column, a line and a grid was 602 px high before and 474 px drawn,
  and a figure of options 254 px before and 336 px drawn.
- `menu.css` holds a menu drawn in place at the width it is drawn as well as its height: its rows' labels and
  supporting texts are laid out, unpainted, in their text styles, with the room of the mark, leading icon and trailing
  icon columns its sections keep, within the surface's least and greatest width. A label or a supporting text that
  wraps holds its lines. Before, such a menu had no width, so two menus side by side that wrap onto two rows once drawn
  stood on one: a docs figure was 406 px high before and 764 px drawn. Not held: the width of a shortcut or a trailing
  text, which the element draws from what CSS cannot measure.
- `menubar.css` holds a bar at the height it is drawn: one row of titles between its paddings, where it holds no link
  item to show. Before, a bar of titles was as tall as its paddings alone (72 px before, 108 px drawn).
- The cloak lays a field's help, or its error text while it is in error, out in the supporting text's style where the
  field draws it, from the start of its control's content, so a text that wraps holds its lines. Before, the cloak held
  one line of it: a docs figure of two narrow color fields was 248 px high before and 280 px drawn. A label that wraps,
  and a help beside a count, are still held at fewer lines than they may take.

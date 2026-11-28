---
'@tanrei/web': patch
---

Before their elements are defined, chips, tag groups, callouts and empty states keep the box they are drawn in.

- The cloak (`@tanrei/web/cloak.css`) holds a chip at the width it is drawn: its `label` in the label's text style,
  between the size's paddings, with the room of its glyph, its check, its avatar, its remove glyph or its new-context
  mark. A glyph's name written inside it takes no room. Before, a chip had no width, and a row of chips wrapped only
  once they were drawn: a docs figure was 100 px high before and 152 px drawn.
- The cloak lays out a tag group's lines with the group's gaps, and a text input's entries (chips in its `entries`
  slot) in lines that wrap before its typing part.
- `callout.css` and `empty-state.css` write a `headline` given as an attribute in the title's text style. They lay out
  the row of actions below the body, with the actions' gap and the item gap, where the body is text alone. An empty
  state's glyph keeps its box, and a hidden empty state or callout takes no room. Before, a docs figure of callouts was
  322 px high before and 404 px drawn.

Not held: a chip field's entries, which it draws from its `value`; and the row of actions of a callout or an empty
state whose body holds elements of its own.

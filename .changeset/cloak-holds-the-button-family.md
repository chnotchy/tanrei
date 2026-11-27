---
'@tanrei/web': patch
---

The cloak (`@tanrei/web/cloak.css`) holds the width of the buttons before their script defines them, read from the
same tokens, so a row of them wraps where it will and a figure of them keeps its height when they are defined:

- A button is its label — what is written between its tags — in the label's text style, between its size's paddings,
  with its glyph's box and the container's gap; an icon-only one (named by `label`, with a glyph) is the width its
  `width` names; a link that opens a new context has the room of its mark; a full-width one is as wide as its place.
  The glyph's name is no longer laid out as a word: the first thing written in a button is given the glyph's box, so
  write the glyph before the label, also where it is drawn after it (`icon-position="trailing"`). A button in a button
  group or a toolbar that names a size is held at that size.
- A button group lays its items out as it will: one row that never wraps (or a column), its gap, the target and the
  outer padding of a connected row, and the shares of a full-width group.
- A segmented button is its equal columns, each the widest segment's label and glyph room between its paddings.
- A button with menu, a main action button (extended or collapsed) and a FAB menu's toggle are as wide as they are
  drawn; an icon-only copy button is the button's height wide, and a labelled one the widest of the texts it is given
  as attributes.
- A bottom sheet and a modal side sheet take no room before they are defined, as once they are: their content was laid
  out in the page.

What breaks: a page that wrote a button's glyph after its label sees the cloak hold that button at another width than it is drawn at.

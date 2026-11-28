---
'@tanrei/web': patch
---

**A cloak for the elements before they are defined.** A new opt-in stylesheet, `@tanrei/web/cloak.css`, hides every
Tanrei element until its script has defined it, so a page whose bundle arrives late shows nothing unstyled — no glyph
names, no option words, no label that is not yet a button. Each control whose height is a token of its own (buttons,
chips, tags, keys, selection controls, input boxes, tabs, pagination, the navigation bar, the search bar…) is held at
that height, by its `size` and its `variant`, and an element whose surface is in the top layer (a dialog, a popover)
takes no room, so what is around them stays where it is when they are defined. Widths are not held: lay out controls
that stand side by side in a row of their own. It is not in `tanrei.css` or `tokens.css`, because an element stays
hidden for as long as it is not defined: a page whose script never arrives would show nothing inside its elements.
Without it, nothing changes.

---
'@tanrei/web': patch
---

The cloak (`@tanrei/web/cloak.css`) and `@tanrei/web/avatar.css` hold more of the box an element will be drawn in
before its script defines it, read from the same tokens, so a page moves less when its elements arrive:

- A tag is as wide as it is drawn — its `label` in the label's text style between the size's paddings, with the room of
  its glyph or its dot — and stands on the baseline it will have, so a row of tags wraps where it will. A glyph's name
  written inside it no longer widens it.
- A checkbox, a radio button and a switch are as wide as they are drawn — the control, the label's gap and the `label`
  in the label's text style — and as high: a label that wraps takes the lines it will take. One that draws no label is
  its control wide. A radio button is at least `comp.radio-button.option.min-height` high, as it is drawn (taller than
  its container in the cupertino and m3-like presets).
- A card's content is inset by `comp.card.container.padding` (not with `flush`), so it wraps at the width it is drawn at.
- A divider is the line's thickness across its length, a wavy one twice its amplitude and the thickness. A `thickness`
  or an `amplitude` it is given is read where the browser reads an attribute as a length (`attr(… px)`); a browser
  that does not holds such a divider at the tokens' size.
- A badge is the box of its anchor, not the line of text it stands in.
- An avatar group that draws an overflow box — more members than its `max`, or a `total` above the members given —
  holds the members it will draw and the box.
- A control in a slot of an app bar that is not defined is left to `app-bar.css`, which takes it out of the page until
  the bar draws it: where the cloak came after it, the cloak laid the bar's Buttons out in a column under its title.

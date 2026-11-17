---
'@tanrei/web': patch
---

Search: the trailing Buttons a product forwards with a slot of its own, or wraps in an element of `display: contents`,
are laid out as the trailing slot's own. A Button inside an element of `display: contents` now keeps the space SRC-34
keeps before it (it used to stand against the Button before it). Where no clear button is shown, the first trailing
Button reaches toward the input only to the middle of `container.gap` (BTN-5, SRC-25) when it is forwarded or wrapped
too: the search now writes that cap on the Button it lays out first instead of matching it with `::slotted()`, which
reached only a Button slotted directly. The spaces now follow changes that fire no `slotchange`: white space among the
forwarded Buttons becoming text, and text or Buttons written into an element of `display: contents`, move them at once
instead of at the search's next update.

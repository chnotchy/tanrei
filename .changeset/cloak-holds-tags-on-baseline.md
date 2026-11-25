---
'@tanrei/web': patch
---

**Cloak: a tag and a keycap are held on the baseline they are drawn on.** `@tanrei/web/cloak.css` held every inline
control centred on its line, but a `<tanrei-tag>` and a `<tanrei-keyboard-shortcut>` drawn as keycaps stand on the
baseline of the text beside them, their label's. On a page whose text is the body face (`@tanrei/web/base.css`), a
24 px tag on a 22 px line stood out of the line by other amounts above and below than once it was defined, and the
line and everything after it moved by 0.68 px in Firefox and WebKit on Linux when the script arrived. Before it is
defined each is now held as it will be drawn: its container's height, inside a keycap's edges, with its baseline where
its label's will be (an empty line of the label's text style, in the element's `::before`, sets it). Nothing else
changes.

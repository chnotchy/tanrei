---
'@tanrei/web': patch
---

**`<tanrei-text-input>`, `<tanrei-select>`, `<tanrei-combobox>`, `<tanrei-number-input>`, `<tanrei-color-input>`: the
value and the label are checked for contrast.** A field's edge — the stacked line (`outline` part) and the outlined
variant's three pieces — was drawn by boxes over the whole container, which axe's `color-contrast` rule took for elements
covering the text: the value, the placeholder and the floating label were left incomplete ("overlapped by another
element") in every field, and in every component built on one (the fields, the chip field). The parts now hold the edge's
values while hidden, and each piece's `::before` draws its line over the piece's border box; the line's color changes
with the part's, and its width over `motion.state-*` as before. Nothing a field draws changes.

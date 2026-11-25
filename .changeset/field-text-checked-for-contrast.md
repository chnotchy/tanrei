---
'@tanrei/web': patch
---

**The text of every input box is checked for contrast** — in `<tanrei-text-input>`, `<tanrei-select>`,
`<tanrei-combobox>`, `<tanrei-number-input>`, `<tanrei-color-input>` and every field built on them (`<tanrei-text-field>`,
`<tanrei-select-field>`, `<tanrei-combobox-field>`, `<tanrei-number-field>`, `<tanrei-color-field>`,
`<tanrei-chip-field>`). A stacked box's inner line and an outlined box's outline are drawn above the value, the
placeholder and the floating label, by elements that axe's `color-contrast` rule took for ones covering the text: it
left that text incomplete ("overlapped by another element") instead of checking it, so faint text in a field was never
reported. The `outline` part (and the outline's pieces) now draws nothing itself, and the `::before` of each draws its
line — border, widths, colors and their transition — at the same place in the paint order. A field draws the same at
rest and hovered in every engine; in Chromium a focused outlined field's outline corners are antialiased slightly
differently (most pixels off by one level). A select's placeholder, while its label rests over it, is hidden as well as
transparent, so it is no text for a checker to find under the label. What breaks: a product's style on `::part(outline)` that set a stacked box's
line (its border) is now written on `::part(outline)::before`. In forced colors the container draws the edges, as
before.

---
'@tanrei/web': minor
---

Button: a product that places buttons side by side itself, outside a button group or a toolbar, can now stop their hit
areas at the middle of the gap. `--tanrei-target-cap-start`, `--tanrei-target-cap-end`, `--tanrei-target-cap-top` and
`--tanrei-target-cap-bottom` are public: inherited custom properties, each the furthest a hit area may reach past the
button's visible bounds on that side. One declaration of half the gap on the product's own row reaches every button in
it. Before, where buttons were drawn smaller than the target (a narrow icon-only button, or any button under a system
whose targets are larger than its controls), two of them laid out close together by the product reached over each
other, and a press on one could go to the other. A Tanrei row (a button group, a toolbar, a dialog's actions) keeps
setting its own caps between its items, and a button group takes the product's at its outer ends. The Button page and
the accessibility foundations say when to use a Tanrei row and when to set the caps, in every language of the docs.

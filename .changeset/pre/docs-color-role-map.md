---
'@tanrei/docs': minor
---

**Docs: a color role map on the Button, Menu, Tabs, Slider and Text field pages.**
The Specs section of these pages, in every language, draws the live component beside a table of the color token each
of its parts is drawn with: a swatch of the token as the page draws it, the `sys.color` role it is in the system the
page is drawn under, and its contrast against what is drawn behind the part, measured by the token build's own contrast
check. A leader joins each part to its row, and focusing a row outlines its part. The Button page shows its five
variants and a destructive one, the Menu page its items at rest and checked. A row whose part the component draws in
another color than its token says so, with the color it found.

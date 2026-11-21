---
'@tanrei/web': patch
---

Menubar: a bar inserted whole as markup after its elements are defined (`innerHTML`, `insertAdjacentHTML`: a view a
single-page product draws) now holds its entries, as MBR-1 and MBR-32 say. The browser upgrades the bar, and runs its
`connectedCallback`, before the menus and bar items inside it, and no child is added after that: the bar read no
entry, drew an empty row and never told a menu written open where it was drawn, so a bar drawn in place (`inline`)
opened that menu in the top layer instead. The bar now reads its entries again once they are upgraded, before their
first update: each is drawn where the bar places it from its first frame (MOT-3).

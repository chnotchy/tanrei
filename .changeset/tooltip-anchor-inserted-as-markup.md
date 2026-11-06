---
'@tanrei/web': patch
---

Tooltip: a tooltip inserted whole as markup after its elements are defined (`innerHTML`, `insertAdjacentHTML`: a view a
single-page product draws) now gives a Tanrei anchor its shortcut as its keyboard shortcut (`aria-keyshortcuts` on the
anchor's native control), as TIP-27 says, and its text alone as its description. The browser runs the tooltip's first
update before the anchor has drawn its control: the tooltip wrote the keys on the anchor's host, the host moved them
onto its control as the product's own, and the tooltip then took them for a shortcut the anchor states itself — so it
added the keys to the description instead and left no keyboard shortcut. The tooltip now reads its anchor once the
anchor has drawn.

---
'@tanrei/web': patch
---

App shell: the sticky header and the navigation bar stay over what scrolls under them. Before, anything in the main
region with a z-index of its own was drawn over the header as it scrolled under it, and caught its clicks: a Code
block's copy button, the overlapping parts of a Carousel, a Text input's label, and any element of the product's
raised with `z-index`. The footer was drawn over the header too when the page ended under it. Now the frame and each
region are a stacking context of their own (`isolation: isolate`): whatever a region holds stacks inside that region,
the header and the navigation bar stand over every region, the footer over the navigation and the aside, and the
focused skip link over all of them. Nothing moves and no color changes; only what is drawn on top where two regions
overlap. Overlays (menus, tooltips, dialogs, sheets, snackbars) are drawn in the top layer as before. A positioned
element the product puts inside a region is now ordered within that region: an overlay of the product's own belongs in
the top layer (`popover`, or a `<dialog>` opened with `showModal()`), not in a high `z-index`.

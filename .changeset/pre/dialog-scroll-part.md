---
'@tanrei/web': patch
---

Dialog: the part that scrolls the supporting text and the content is now a CSS part, `scroll`. It reaches the
container's inline edges through whatever inline padding the container has, instead of through `container.padding`:
a product that changed `::part(container)`'s `padding-inline` used to get a scrolling part, dividers and a focus box
that overflowed the container or fell short of its edges, and now they follow the padding, at each side and while
the dialog is open. A row the product keeps sticky at the foot of its content is cleared with
`::part(scroll) { scroll-padding-block-end }`. A dialog whose padding was not changed is drawn as before.

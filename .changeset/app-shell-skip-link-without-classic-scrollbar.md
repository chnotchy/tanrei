---
'@tanrei/web': patch
---

App shell: a long skip link stays inside the window under a classic scrollbar. While it has keyboard focus, the skip
link is never wider than the window less its offset and padding at each side. That greatest width was taken from
`100vw`, which counts a scrollbar that takes room in the window, so the end of its box lay under the scrollbar: 10
under a 10-wide one. It is now `100%` of what the link is placed in while it is shown (it is fixed to the window).
That is the window less the scrollbar, whatever margins the root has.

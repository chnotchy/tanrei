---
'@tanrei/web': patch
---

Tree view: the stylesheet's rule that draws the `guides="hover"` lines no longer makes WebKit restyle the whole page whenever the pointer moves onto another element or focus moves. It named `:hover` and `:focus-within` as alternatives of one `:is()` list, and WebKit then restyles everything inside each element whose hover or focus changes, the root included, whether or not the page has a tree. On a long documentation page in WebKit, a focus change cost 57 ms and resting the pointer on a list row 60 ms; both now cost about 1 ms. Each condition is now its own selector, and nothing changes in how the guides are drawn.

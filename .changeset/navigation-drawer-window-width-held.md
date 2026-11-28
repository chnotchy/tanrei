---
'@tanrei/web': patch
---

Navigation drawer: a window that changes width no longer restyles every item of a modal drawer when nothing in its
rows changes. While the drawer stands over the content, the element writes the window's width on its host, so the
rows end where the panel does. Every element of the drawer inherits that value, and each write restyled all of them.
In Safari, on a documentation page whose drawer of 340 elements was closed, each width took 0.5 s instead of 0.2 s.
With the drawer open, each width added 0.2 s. The width written now stops at the width beyond which the rows keep
`container.width`, so a wider window writes nothing new. Below that width the rows still follow the window, as
before. What the drawer writes on its host, its dialog and its panel now changes the number of custom properties
with each write, as `setTokens()` does, so Safari no longer compares the token set value by value.

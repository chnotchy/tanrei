---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): switching to Groups no longer draws the whole
level under the press. The panels the window shows are drawn before the first paint, the others as the page is
scrolled near them, and the rest one at a time while the page is idle, so every panel is there for the Tab key and the
browser's find soon after. A declaration of the layer's own, the build's warnings and the import are written when their
fold first opens. The switch drew some 3,100 elements in one task of about 300 ms; it now draws a few hundred, and the
press is answered in about 50 ms.

---
'@tanrei/web': patch
---

A search's full-screen or dialog view drawn in place (`inline`, as the documentation draws it) and written `expanded`
in the page's markup is now there in its first frame (MOT-4), instead of fading in from its starting style as the page
loads. Marked open after the document's first paint, it still fades in. `atOnce()` (`src/primitives/modal-exit.ts`),
which changes a dialog with no transition on it or its scrim, is now exported for this.

---
---

The web and React packages' builds remove `dist/` before they write it, so a file an earlier build wrote (a module of a
removed component, a renamed stylesheet, a removed system's theme colors) no longer stays in a checkout, where the
tests read it and `npm pack` would ship it. A build from a clean checkout writes the same files as before; nothing
released changes.

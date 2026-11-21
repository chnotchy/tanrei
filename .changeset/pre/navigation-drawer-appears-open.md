---
'@tanrei/web': patch
---

Navigation drawer: a modal, collapsible drawer that appears with `open` set is drawn open from its first frame, at its
full width and over its whole scrim. It no longer widens from a 72 px column it never showed while its scrim fades in.
Opening it later still widens it from its column, as before.

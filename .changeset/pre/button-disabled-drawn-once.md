---
'@tanrei/web': patch
---

Button: a change of `disabled` is drawn in one update instead of two. The `disabled` attribute that reflects the
property brings a word from the platform after the update that drew the change, and the button used to draw itself
again for it although nothing it draws had changed. It now draws again only for a word that changes what it draws: a
disabled fieldset around it, disabled or enabled.

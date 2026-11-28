---
'@tanrei/web': minor
---

Button: a Button that sets no `size` no longer writes `size="medium"` on itself. Since it takes the size of the
container around it, its first render wrote the default's name as an attribute, so a Button drawn small in a small
button group still said `size="medium"`. Only a size set on the Button is written now, and removing it removes the
attribute. A page's style or script that reads `tanrei-button[size='medium']` on a Button that sets none finds no
attribute. The custom elements manifest no longer marks Button's `size` as reflected by Lit: the Button writes the size
set on it itself.

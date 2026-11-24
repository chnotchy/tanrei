---
'@tanrei/web': patch
---

**`<tanrei-tabs>`: a tab's label is checked for contrast.** Two boxes lay over every label: the focus ring's, which draws
nothing until a tab has keyboard focus, and, on the selected tab, the container (`container` part), whose state layer lies
over the active indicator. axe's `color-contrast` rule took them for elements covering the text and left every label
incomplete. The ring's box is now hidden while it draws no ring (`overRing()`, which now takes `within`), and the
container part holds its color while hidden, its `::before` drawing it under the ripple as before. Nothing a tab draws
changes.

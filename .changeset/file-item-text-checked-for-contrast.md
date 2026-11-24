---
'@tanrei/web': patch
---

**`<tanrei-file-item>`: a pressable item's name and second line are checked for contrast.** The state layer lies over the
item's texts, and axe's `color-contrast` rule took it for an element covering them, leaving them incomplete ("overlapped
by another element"). The layer now holds its color while hidden, and its `::before` draws it, under the ripple as
before; nothing an item draws changes.

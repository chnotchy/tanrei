---
'@tanrei/docs': patch
---

Documentation site: every fixture of every component is drawn.

- The App shell, Code block, Inline code, Link, Menu, Navigation drawer, Previous and next links, Steps and Timeline
  pages drew none of their 258 fixtures ("Not available in the installed web build", which was not so: the site's own
  renderer did not know their markup). Each is now drawn alone in a window of its own.
- A fixture drawn in a window — those, and every presented one (a modal dialog, a sheet, a tooltip) — is drawn from the
  web package's own document of it, the one its tests take each baseline from, at the size of that baseline: what the
  page shows is what every platform's baseline is compared with. A dialog's actions stand in its actions row, and a
  popover beside its anchor, as there.

---
'@tanrei/tokens-build': patch
'@tanrei/web': patch
'@tanrei/cli': patch
---

**A system's scope inherits the colour scheme around it.** A preset's stylesheet (`@tanrei/web/systems/<id>.css`), and a
product's built with `tanrei build`, no longer declares `color-scheme: light dark` on `[data-tanrei-system="<id>"]`.
That declaration took the scope back to the operating system's scheme: a preset placed under `<html
data-tanrei-theme="dark">` drew light on a light system. Now only the root declares both themes, and a scope draws in
the theme forced around it, or follows the system where nothing is forced, as every other subtree does; a scope still
forces its own with `data-tanrei-theme` on itself. What broke: a page that relied on a scope following the operating
system under a forced ancestor must take `data-tanrei-theme` off that ancestor, or remove it from around the scope.

The documentation's gallery of fixtures follows the header's theme as it changes (until a stage's own switch is
turned), and a gallery window is given the page's contrast, at its first paint and on every change.

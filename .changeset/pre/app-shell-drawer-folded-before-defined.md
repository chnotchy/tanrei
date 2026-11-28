---
'@tanrei/web': patch
---

App shell: a page that gives a navigation drawer back folded or at a stored width no longer shifts when the drawer
loads. Before the drawer was defined, `app-shell.css` gave it its full default width in an expanded window even when
the page wrote `expanded="false"`, so the main region jumped when the drawer folded itself. In an expanded window the
stylesheet now gives a drawer that is not defined yet the place it will have:

- a collapsible drawer written `expanded="false"`, or a collapsible modal drawer: its collapsed column, at the
  compact width with `density="compact"`;
- a responsive drawer that is not collapsible, written `expanded="false"`: no space;
- a drawer at a stored width: that width, held between `container.min-width` and `container.max-width`, as before.
  Write the width as `--tanrei-navigation-drawer-width` on the element as well as in `width`.

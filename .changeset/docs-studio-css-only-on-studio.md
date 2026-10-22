---
'@tanrei/docs': patch
'@tanrei/studio': patch
---

Theme Studio's stylesheets are loaded by the page that hosts the Studio, not by its entry module.

- `@tanrei/studio` no longer imports its stylesheets from its entry. The host loads them with the page that mounts the
  Studio: `@tanrei/web/icons.css`, `tree-view.css`, `accordion.css` and `description-list.css`, and
  `@tanrei/studio/studio.css`. The standalone app does this in `app/main.ts`, and its built stylesheet is unchanged.
- Documentation site: the Studio's stylesheet is linked by the six Theme Studio pages only (21.8 KB). Before, a 101 KB
  sheet was linked from 755 of the 845 pages. The Theme Studio page draws exactly as before.

---
'@tanrei/docs': patch
---

Documentation site: the header has one menu button, the app shell's, at every width.

- The site's second menu button, which took the shell's place in medium and expanded windows, is removed with its
  script and its styles. It set the navigation drawer's `open` itself at the column's width, so the shell did not know
  the navigation was open: the content under the scrim stayed reachable by keyboard and assistive technology.
- The shell's own button now collapses and expands the sidebar in an expanded window, widens its column over the
  content in a medium one and opens the drawer in a compact one. While the column or the drawer is open, the skip
  link, the page's content and its table of contents are inert, and the header stays usable.
- Without script the menu button is not drawn at any width, as before.

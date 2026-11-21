---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking:** on the web and in React, a heading's text is `headline` on every component. Three components used other
names. There is no alias for the old names.

| Component | Before | Now |
|---|---|---|
| Code block | `<tanrei-code-block title="sizes.js">`, `<CodeBlock title="sizes.js">` | `headline="sizes.js"` |
| Tooltip (rich) | `<tanrei-tooltip variant="rich" title="Storage">`, `<Tooltip title="Storage">` | `headline="Storage"` |
| Navigation drawer section | `<tanrei-navigation-drawer-section heading="Mail">`, `<NavigationDrawerSection heading="Mail">` | `headline="Mail"` |

What breaks:

- **Code block and tooltip:** a `title` attribute is the browser's own again. The two elements no longer read it or
  remove it, so a `title` left on them draws the browser's native tooltip and no heading. Rename it to `headline`.
  The `title` property is the platform's `HTMLElement.title`.
- **Navigation drawer section:** a `heading` attribute or property is no longer read. The spec names this prop `title`,
  as a group's heading is named in the other specs. Its web-only `heading-level` keeps its name, because it is the
  level of the heading element it draws, not its text.
- **The docs' code fences:** a fence names the block's heading with `headline="…"` (it was `title="…"`).

Nothing is drawn differently.

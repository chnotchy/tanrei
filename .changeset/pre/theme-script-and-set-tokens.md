---
'@tanrei/web': minor
---

Two helpers for a page that changes its theme or its tokens at run time.

**`@tanrei/web/theme-script`** keeps a person's choice of theme and draws it from the first frame.

- `themeScript()` returns a small inline script for `<head>`. It puts the stored `light` or `dark` on `<html>` as
  `data-tanrei-theme` while the page is still being parsed, so the page no longer flashes the system's theme first.
- `saveTheme('light' | 'dark' | 'system')` stores a choice and draws it at once. `'system'` takes the choice away,
  and the page follows the operating system again.
- `loadTheme()` reads what is stored.
- The storage key can be your own (`{ storageKey }`).
- The module runs nothing when it is imported, so a server can import it.
- Getting started shows it in Next.js and Astro.

**`setTokens(tokens, { on })`** from `@tanrei/web` sets custom properties from script, on the root or on any element.
A token given `''` is taken off.

- One token set alone on the root with `style.setProperty()` makes WebKit restyle the page for seconds: 4.4–6.0 s
  for 2,000 elements, measured.
- `setTokens()` writes it in 6–7 ms. With each write it also adds or takes off a few names of its own
  (`--tanrei-tokens-written-<n>`), so the number of the element's custom properties always changes, and WebKit does
  not compare the two sets value by value.

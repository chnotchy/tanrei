---
'@tanrei/web': minor
'@tanrei/cli': minor
---

Resolved token values for programs, and the browser's theme color.

**`@tanrei/web/systems/<id>.<scheme>.json`**: every token of a shipped system as one scheme draws it (`light`,
`light-medium`, `light-high`, `dark`, `dark-medium`, `dark-high`), by its id, with no alias and no expression. A color is
`#rrggbb` (`#rrggbbaa` when it is not opaque), a dimension or a duration one string with its unit. A canvas, a chart, a
native app or a language model reads them without the token engine and without `getComputedStyle()`, which returns the
`light-dark()` expression. They are the values of the resolved DTCG files for design tools, written flat when the
package is built. About 0.5 MB per file, 24 files.

**`@tanrei/web/systems/<id>.theme-color.json`** and **`themeColorMeta(colors)`** from `@tanrei/web/theme-script`: a
system's surface in each scheme, and one `<meta name="theme-color">` per scheme with the media query that picks it
(dark and light, each at more contrast too). Put the tags before `themeScript()`: the inline script and `saveTheme()`
point them at a theme a person chose, so the browser's own interface follows it as well.

**`tanrei build`** writes the same for a product's own system: `<id>.<scheme>.json` in the `tokens` output, and
`<id>.theme-color.json` in the `web` output.

`@tanrei/web/systems/*.components.json` is now served by the export `./systems/*.json`; the path is the same.

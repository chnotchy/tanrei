---
'@tanrei/web': patch
---

The browser floor is written in numbers: Chrome and Edge 125, Firefox 126, Safari 17.5 (macOS and iOS), set by
`light-dark()`, CSS `round()` and custom states (`:state()`), with the JavaScript at ES2022. The web getting-started
page (in all six languages) and the package README list each feature with its versions, and show how a product's entry
point tests the features and loads the app with `import()` only when they are there, so that it can tell an older
browser's visitor instead. The package's build now parses every file of `dist/` as ES2022 and fails on anything later.
A box-shadow's lengths are read without a regular-expression lookbehind, with the same result. Nothing breaks.

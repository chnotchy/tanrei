---
'@tanrei/web': minor
---

An English word pack: `import '@tanrei/web/words/en'` gives a word in plain, neutral English for every key of the
product's words (96 keys: "Required", "Close", "Previous month", "Remove {entry}", …), as one `setWords()` call would,
so that a product that only wants Tanrei's look writes one line instead of every phrase before its first quiet screen.
The module also exports the same words as `englishWords`, for a product that starts from them.

It is applied only by that import: `@tanrei/web`, `@tanrei/react`, a component, a stylesheet and the element's `lang`
never import it, and a page that does not import it behaves as before — no word it did not give, and a report for each
missing one. A word given with `setWords()` after the import replaces the pack's for its key, and a word on an element
wins over both.

The words are written once, in `specs/words/en.json`, and generated into the package: `pnpm validate` and `pnpm drift`
fail while a key the specs declare has no word there, has one that drops a place its key needs, or the file has a key
the specs do not. The Words page's table of keys shows each key's word in the pack.

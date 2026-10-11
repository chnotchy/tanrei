# The docs in several languages

The site is written in English and translated into the languages listed in [`locales.mjs`](./locales.mjs): today Japanese (`/ja/`), Simplified Chinese (`/zh-cn/`), Hindi (`/hi/`), Spanish (`/es/`) and Arabic (`/ar/`, right-to-left). The rule: the five most spoken languages of the world, and at least one that is written right to left. English is the source. A page in another language is a translation of the English page at the same path, never a page of its own.

| | Where |
|---|---|
| The languages, and which pages each must have | `i18n/locales.mjs` (read by `astro.config.mjs` and by the check) |
| The words a translation uses | `i18n/glossary.md` |
| A page's translation | `src/content/docs/<dir>/<same path>.mdx` |
| Strings of the docs' own components and generated tables | `src/lib/i18n.ts` — one dictionary per language, typed against the English one |
| Strings of Starlight's chrome ("On this page", the fallback notice) | Starlight's own dictionaries; `src/content/i18n/<lang>.json` overrides a key |
| Sidebar group labels | `translations` on each group in `astro.config.mjs` |
| Typefaces for a script | `src/styles/tanrei-theme.css`, "Typefaces by script" |
| The check | `scripts/i18n-check.mjs` — `pnpm --filter @tanrei/docs i18n` |

## What a translated page records

```yaml
---
title: カラー
description: …
translationOf: foundations/color.mdx
sourceHash: 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
---
```

`translationOf` is the English page, as a path under `src/content/docs/`. `sourceHash` is the git blob id of that page as it stood when the translation was made or last brought up to date (`git hash-object <file>`). Do not type it: after translating, or after bringing a translation up to date, run

```
node scripts/i18n-check.mjs --stamp "ja/foundations/color.mdx"     # a path or a glob under src/content/docs/
```

which writes both lines with today's id. Stamping says "this page is a translation of the English page as it is now" — run it only when that is true.

## The check, and the rule

`pnpm --filter @tanrei/docs i18n` (also the first step of the package's `validate`) puts every page of every language in one of these states:

| State | Meaning | Fails? |
|---|---|---|
| fresh | `sourceHash` is the id of today's English page | no |
| stale | the English page changed since; the report prints `git diff <then> <now>` for the translator | no — reported |
| unverified | translated, with no `sourceHash`: nobody recorded what it was made from | no — reported |
| fallback | not translated, and the language does not require it: Starlight shows the English page with a notice | no — reported |
| missing | not translated, and the language requires it (`required` in `locales.mjs`) | **yes** |
| misplaced | `translationOf` names another page than the one at this path | **yes** |
| orphan | a page in a language's folder with no English page at that path | **yes** |

So adding an English page means adding its translations, in the same change, in every language that requires it; changing one does not wait for them. The reason for the difference: a missing page is a hole a reader falls through into another language, and it is cheap to see at the time; a stale page is still a correct page of yesterday, and holding a component change back for three translations would make the English docs lag behind the code instead. The report (`i18n/status.generated.md`, not committed) is what whoever translates next works from.

A language being translated for the first time requires nothing (`required: []`) until it has every page, and then requires `**`. A language that cannot carry every page narrows its `required` globs in `locales.mjs` (for instance to everything but `components/**`) rather than shipping partial or machine-quality pages: a page is translated completely and naturally, or not at all.

## What stays English, by design

What a page *renders from the repository* is shown as the repository has it, in English, and marked `lang="en"` where the component can: a spec's requirements (EARS sentences), anatomy and prop descriptions, a token's `$description`, a system's description and disclaimer, fixture content. These are the sources of truth or generated from them, and a translation of them kept by hand in the docs would be a second, drifting copy. Their *frames* — table headers, legends, section titles, status names and their explanations — are translated, in `src/lib/i18n.ts`. This is how the Japanese pages have always worked; the other languages follow the same rule.

Theme Studio (`@tanrei/studio`) carries its own strings, in English and Japanese; a page in another language hosts it in English.

## Right-to-left

Arabic pages are right-to-left: Starlight writes `dir="rtl"` on `<html>`, the docs' own styles use logical properties only, and Tanrei's components follow the direction of where they are used. Code blocks stay left-to-right. Digits are Western in every language, in prose as in code: every figure in these docs is a value a reader copies.

Prose's rules for Chinese and Japanese (strict line breaking, PRS-19; no heading tracking, PRS-20; upright emphasis, PRS-3) apply to `ja` and `zh-CN`. Hindi and Arabic have no such rules in prose's spec yet; the docs' chrome drops tracking and uppercase labels for them.

## Translating a page

1. Read `glossary.md`, and two or three pages already in the language.
2. Copy the English page to the same path under the language's folder. Relative imports need one more `../`. Internal links take the language's prefix (`/ja/…`); check anchors against the translated headings.
3. Translate prose, headings, table text, `title` and `description`, `alt` text, the visible text of components (`title=`, `description=`, `label=` of cards and demos, a hero's `title`, `tagline` and `actions[].text`), product text and comments inside samples. Leave code, identifiers, imports, component names and prop names alone (glossary, "What is never translated"). A `TabItem` whose label is not ASCII needs a `value`, the same in every language.
4. Stamp it (above), then `pnpm --filter @tanrei/docs build`.

## Adding a language

Add it to `locales.mjs` (with the pages it requires), a dictionary to `src/lib/i18n.ts`, the group labels in `astro.config.mjs`, a column to `glossary.md`, and — if its script is not one the site already sets — its faces to the theme ("Typefaces by script") and its rules to prose's spec first. Starlight's chrome is already translated for most languages. A right-to-left language sets `direction: 'rtl'` in `locales.mjs` and its pages are reviewed in that direction: a glyph that points is mirrored, text of the other direction is isolated, and what never mirrors (code, numbers, the product's pictures) is not.

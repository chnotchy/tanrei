// The languages of the docs site, in one place: `astro.config.mjs` builds Starlight's `locales` from it, and
// `scripts/i18n-check.mjs` reads which translations must exist. English is the source; every other page is a
// translation of the English page at the same path (i18n/README.md).
//
// `dir` is the folder under `src/content/docs/` and the URL prefix; `lang` is the BCP 47 tag written on <html> —
// prose reads it for line breaking, heading tracking and emphasis (PRS-3, PRS-19, PRS-20), and the theme for the
// script's typefaces. `direction: 'rtl'` makes the language's pages right-to-left (the frame and every Tanrei
// component follow the direction of where they are used).
//
// `required` lists the page paths (globs over the English tree, without the extension) whose translation must exist:
// a missing one fails `pnpm --filter @tanrei/docs i18n`. A page outside the list falls back to English with
// Starlight's notice and is only reported.
//
// `ogLocale` is the language as the Open Graph protocol writes it (`language_TERRITORY`), for a page's `og:locale`.
// `imageFaces` are the families the image of a shared link (src/lib/social-image.mjs) sets the language's text in
// beside the type tokens' own (Inter, Noto Sans JP): `[]` where those draw its script, `null` where the build has no
// face for it — Simplified Chinese must not be drawn in the Japanese face, and no Devanagari face is a dependency of
// the site — and a page of that language shows the English page's image.

/** @type {{ dir: string, lang: string, label: string, direction?: 'rtl', required: string[], ogLocale: string, imageFaces: string[] | null }[]} */
export const translations = [
  { dir: 'ja', lang: 'ja', label: '日本語', required: ['**'], ogLocale: 'ja_JP', imageFaces: [] },
  // The four below are being translated for the first time: until a language
  // has every page, it requires none, and its untranslated pages fall back to English. Then it requires `**`.
  { dir: 'zh-cn', lang: 'zh-CN', label: '简体中文', required: [], ogLocale: 'zh_CN', imageFaces: null },
  { dir: 'hi', lang: 'hi', label: 'हिन्दी', required: [], ogLocale: 'hi_IN', imageFaces: null },
  { dir: 'es', lang: 'es', label: 'Español', required: [], ogLocale: 'es_ES', imageFaces: [] },
  { dir: 'ar', lang: 'ar', label: 'العربية', direction: 'rtl', required: [], ogLocale: 'ar_AR', imageFaces: ['Noto Sans Arabic'] },
];

export const source = { dir: '', lang: 'en', label: 'English', ogLocale: 'en_US', imageFaces: [] };

/** Starlight's `locales`: English at the root, each translation under its folder. */
export const starlightLocales = {
  root: { label: source.label, lang: source.lang },
  ...Object.fromEntries(translations.map(({ dir, lang, label, direction }) => [dir, direction ? { label, lang, dir: direction } : { label, lang }])),
};

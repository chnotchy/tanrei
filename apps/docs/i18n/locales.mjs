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

/** @type {{ dir: string, lang: string, label: string, direction?: 'rtl', required: string[] }[]} */
export const translations = [
  { dir: 'ja', lang: 'ja', label: '日本語', required: ['**'] },
  // The four below are being translated for the first time: until a language
  // has every page, it requires none, and its untranslated pages fall back to English. Then it requires `**`.
  { dir: 'zh-cn', lang: 'zh-CN', label: '简体中文', required: [] },
  { dir: 'hi', lang: 'hi', label: 'हिन्दी', required: [] },
  { dir: 'es', lang: 'es', label: 'Español', required: [] },
  { dir: 'ar', lang: 'ar', label: 'العربية', direction: 'rtl', required: [] },
];

export const source = { dir: '', lang: 'en', label: 'English' };

/** Starlight's `locales`: English at the root, each translation under its folder. */
export const starlightLocales = {
  root: { label: source.label, lang: source.lang },
  ...Object.fromEntries(translations.map(({ dir, lang, label, direction }) => [dir, direction ? { label, lang, dir: direction } : { label, lang }])),
};

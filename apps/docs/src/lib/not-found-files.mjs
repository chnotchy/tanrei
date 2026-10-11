// Where a host finds the page that was not found, in each language.
//
// The site is built with one folder for each page, so the not-found page of a language is written as
// `<language>/404/index.html`; only the root's is written as `404.html`, the file a static host answers a missing
// address with. A host that answers with the nearest `404.html` above the address — so that a missing page under
// `/ja/` is answered in Japanese — needs that file in each language's folder. This step writes it when the site has
// been built: a copy of the language's page, whose addresses are all from the site's root.
import fs from 'node:fs/promises';

/**
 * @param {{ dir: string }[]} translations The languages under a folder of their own (i18n/locales.mjs).
 * @returns {{ name: string, hooks: { 'astro:build:done': (options: { dir: URL }) => Promise<void> } }}
 */
export function notFoundFiles(translations) {
  return {
    name: 'tanrei-docs:not-found-files',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        for (const { dir: language } of translations) await fs.copyFile(new URL(`./${language}/404/index.html`, dir), new URL(`./${language}/404.html`, dir));
      },
    },
  };
}

// What the search index reads of a piece of markup, asked of the index itself: the package the framework's build
// writes the site's index with reads a page given to it here and returns the page's text as it will be searched and
// shown in an excerpt. A test that says «these two are two words to the index» asks this, not a model of it.
//
// The package is the framework's dependency, not the docs': it is found beside the framework in the store, by path.
// If an upgrade moves it, this file is the one place to follow it. It starts the index's own program (a native
// binary, the one the build runs) and stops it with `close()`: call that when the tests that ask are done.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const framework = fs.realpathSync(fileURLToPath(new URL('../node_modules/@astrojs/starlight', import.meta.url)));
const service = () => import(pathToFileURL(path.join(framework, '../../pagefind/lib/index.js')).href);

/** What the index's files say before their content. */
const SIGNATURE = 'pagefind_dcd';

/**
 * The text the index holds for each piece of markup, read as the main region of a page of its own.
 *
 * @param {string[]} regions The markup of a page's main region, as the build writes it.
 * @param {string} [lang] The page's language.
 * @returns {Promise<string[]>}
 */
export async function indexReads(regions, lang = 'en') {
  const { createIndex } = await service();
  const { index, errors } = await createIndex({});
  if (!index) throw new Error(`The search index could not be started: ${errors.join('; ')}`);
  try {
    for (const [at, region] of regions.entries()) {
      const added = await index.addHTMLFile({ url: `/${at}/`, content: `<html lang="${lang}"><head><title>${at}</title></head><body><main data-pagefind-body>${region}</main></body></html>` });
      if (added.errors.length > 0) throw new Error(added.errors.join('; '));
    }
    const { files } = await index.getFiles();
    /** @type {Record<string, string>} */
    const text = {};
    for (const file of files) {
      if (!/fragment/.test(file.path)) continue;
      const raw = zlib.gunzipSync(Buffer.from(file.content)).toString('utf8');
      const page = JSON.parse(raw.startsWith(SIGNATURE) ? raw.slice(SIGNATURE.length) : raw);
      text[page.url] = page.content;
    }
    return regions.map((_, at) => text[`/${at}/`] ?? '');
  } finally {
    await index.deleteIndex();
  }
}

/** Stops the index's program. */
export const close = async () => (await service()).close();

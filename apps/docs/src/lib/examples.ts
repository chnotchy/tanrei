// The examples a page shows beside its guidance — a Do and a Don't (components/visuals/DoDont.astro) — written once,
// in `src/examples/<component>/<id>.html`, and shared by the six languages: the markup is the same on every page, and
// only the product's words in it differ, which the example writes as places (`{{words.deleteFiles}}`) and
// `src/examples/words.ts` gives in each language. An example says on its first line, in a comment, the debug reports
// it is meant to produce (`<!-- reports: BTN-43 -->`): a Don't that shows what a component refuses produces the
// report it illustrates, and a Do produces none (test/browser/do-dont.test.mjs asks each in a browser).
//
// No file is read here: the component has Vite read the files (a glob of them), and a test reads them with
// Node, and both hand the text to these functions.
import { words, type WordKey } from '../examples/words';

/** The id of an example: its folder, the component, and its file's name (`button/link-destructive`). */
export const EXAMPLE_ID = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

const REPORTS = /^\s*<!--\s*reports:\s*([^>]*?)\s*-->\s*\n?/;
const PLACE = /\{\{\s*words\.([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** The behaviour ids of the debug reports an example's first line says it produces; none where it says nothing. */
export function exampleReports(text: string): string[] {
  const [, list = ''] = text.match(REPORTS) ?? [];
  return list
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

/** The keys of the words an example names. */
export function exampleWords(text: string): string[] {
  return [...text.matchAll(PLACE)].map(([, key]) => key);
}

/** The language a word is looked up in: the primary subtag of the page's language (`zh-CN` → `zh`), as the docs' dictionaries are kept. */
export const wordLanguage = (lang: string) => lang.toLowerCase().split('-')[0];

/**
 * An example's markup in a page's language: its line of reports taken away, and each place filled with the word,
 * escaped, so that a word can stand in an attribute or in text. A word the table does not have, or does not have in
 * the language, fails the build with the example's id.
 */
export function exampleMarkup(id: string, text: string, lang: string): string {
  const language = wordLanguage(lang);
  return text
    .replace(REPORTS, '')
    .replace(PLACE, (_, key: string) => {
      const entry = (words as Record<string, Record<string, string>>)[key];
      if (!entry) throw new Error(`example ${id}: no word "${key}" in src/examples/words.ts`);
      const word = entry[language];
      if (word === undefined) throw new Error(`example ${id}: the word "${key}" has no "${language}" in src/examples/words.ts`);
      return word.replace(/[&<>"]/g, (c) => ESCAPES[c]);
    })
    .trim();
}

export type { WordKey };

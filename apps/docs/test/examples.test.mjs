// The shared examples (src/examples/<component>/<id>.html, lib/examples.ts) and the pairs that draw them
// (components/visuals/DoDont.astro), read by Node: no browser, no build.
//
// - every element an example writes is one the web package defines, and every attribute one it reads, with a value
//   among those it reads where its manifest lists them (as test/fixtures.test.mjs asks of the landing page's specimen);
// - every word an example names is in src/examples/words.ts, in each language of the docs;
// - every report an example's first line names is a behaviour of a spec, and a Do names none;
// - every pair a page draws names examples that exist, every example is drawn by a page, and each translation of a page
//   draws the same pairs as the English page, so that the six languages share one markup.
// That each Don't produces the report it names, in a browser, is test/browser/do-dont.test.mjs's.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { exampleMarkup, exampleReports, exampleWords, EXAMPLE_ID } = await import('../src/lib/examples.ts');
const { words } = await import('../src/examples/words.ts');
const { specs, webReadsAttribute, webAttributeValues, definedTags } = await import('../src/lib/repo.ts');
const { translations } = await import('../i18n/locales.mjs');

const docs = fileURLToPath(new URL('../', import.meta.url));
const examplesDir = path.join(docs, 'src/examples');
const content = path.join(docs, 'src/content/docs');

/** Every example: its id and its text. */
const examples = new Map(
  fs
    .readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((folder) =>
      fs
        .readdirSync(path.join(examplesDir, folder.name))
        .filter((file) => file.endsWith('.html'))
        .map((file) => [`${folder.name}/${file.slice(0, -'.html'.length)}`, fs.readFileSync(path.join(examplesDir, folder.name, file), 'utf8')]),
    ),
);

const isGlobal = (name) => ['class', 'style', 'dir', 'lang', 'slot', 'id', 'inert', 'hidden', 'title'].includes(name) || name.startsWith('data-') || name.startsWith('aria-');
/** The elements of markup, with their attributes and values. */
const elements = (html) =>
  [...html.matchAll(/<([a-z][a-z0-9-]*)((?:\s+[^\s=<>"/]+(?:="[^"]*")?)*)\s*\/?>/g)].map((tag) => ({
    tag: tag[1],
    attributes: [...tag[2].matchAll(/\s+([^\s=<>"/]+)(?:="([^"]*)")?/g)].map(([, name, value]) => ({ name, value })),
  }));

/** Every pair a page draws, by the page's path under src/content/docs. */
function pairsOf(file) {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/<DoDont\b([^>]*)>/g)].map(([, attributes]) => Object.fromEntries([...attributes.matchAll(/\b(do|dont|caution)="([^"]+)"/g)].map(([, verdict, id]) => [verdict, id])));
}
const pages = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const at = path.join(dir, entry.name);
    if (entry.isDirectory()) return translations.some((language) => language.dir === entry.name) && dir === content ? [] : pages(at);
    return entry.name.endsWith('.mdx') ? [at] : [];
  });
const english = pages(content).map((file) => ({ rel: path.relative(content, file), pairs: pairsOf(file) })).filter((page) => page.pairs.length > 0);

/** Every behaviour id of the specs. */
const behaviourIds = new Set(Object.values(specs).flatMap((spec) => (spec.behavior ?? spec.behaviour ?? []).map((behaviour) => behaviour.id)));

describe('the shared examples (src/examples/)', () => {
  test('there are examples, each a file of a component the repository has a spec of', () => {
    assert.ok(examples.size > 0);
    for (const id of examples.keys()) {
      assert.match(id, EXAMPLE_ID, id);
      assert.ok(specs[id.split('/')[0]], `src/examples/${id}.html: no spec named ${id.split('/')[0]}`);
    }
  });

  test('every element is one the web package defines, and every attribute one it reads, with a value it reads', () => {
    const native = new Set(['span', 'a', 'div', 'p', 'strong', 'em', 'br', 'code']);
    for (const [id, text] of examples) {
      for (const { tag, attributes } of elements(exampleMarkup(id, text, 'en'))) {
        if (native.has(tag)) continue;
        assert.ok(definedTags.has(tag), `${id}: the web package defines no <${tag}>`);
        for (const { name, value } of attributes) {
          if (isGlobal(name)) continue;
          assert.ok(webReadsAttribute(tag, name), `${id}: <${tag}> reads no attribute ${name}`);
          const values = webAttributeValues(tag, name);
          if (values && value !== undefined) assert.ok(values.includes(value), `${id}: <${tag} ${name}="${value}"> is not one of ${values.join(', ')}`);
        }
      }
    }
  });

  test('every word an example names is in the table, in each language, and every word of the table is used', () => {
    const languages = ['en', ...new Set(translations.map((language) => language.lang.toLowerCase().split('-')[0]))];
    const used = new Set();
    for (const [id, text] of examples) {
      for (const key of exampleWords(text)) {
        used.add(key);
        assert.ok(words[key], `${id}: no word "${key}" in src/examples/words.ts`);
        for (const language of languages) assert.ok(words[key][language]?.trim(), `${id}: the word "${key}" has no ${language}`);
      }
      for (const language of languages) assert.doesNotMatch(exampleMarkup(id, text, language), /\{\{/, `${id} in ${language}: a place is left unfilled`);
    }
    assert.deepEqual(Object.keys(words).filter((key) => !used.has(key)), [], 'words no example names');
  });

  test('a word is text in the markup: it is escaped where it stands', () => {
    const [id, text] = [...examples].find(([, each]) => /="\{\{words\./.test(each));
    const filled = exampleMarkup(id, text.replace(/\{\{words\.\w+\}\}/, '{{words.cancel}}'), 'en');
    assert.doesNotMatch(filled, /\{\{/);
    assert.equal(exampleMarkup('x/y', '<p>{{words.ok}}</p>', 'en'), '<p>OK</p>');
    assert.throws(() => exampleMarkup('x/y', '{{words.noSuchWord}}', 'en'), /no word "noSuchWord"/);
  });

  test('the reports an example names are behaviours of the specs', () => {
    assert.deepEqual(exampleReports('<!-- reports: BTN-43, BTN-16 -->\n<b></b>'), ['BTN-43', 'BTN-16']);
    assert.deepEqual(exampleReports('<b></b>'), []);
    for (const [id, text] of examples) for (const report of exampleReports(text)) assert.ok(behaviourIds.has(report), `${id}: no spec has a behaviour ${report}`);
  });
});

describe('the pairs the pages draw (components/visuals/DoDont.astro)', () => {
  test('pages draw pairs, each of examples that exist, a Do never one that reports, and every example is drawn', () => {
    assert.ok(english.length >= 6, 'the first pages draw pairs');
    const drawn = new Set();
    for (const { rel, pairs } of english) {
      for (const pair of pairs) {
        assert.ok(Object.keys(pair).length >= 2, `${rel}: a pair of fewer than two examples`);
        for (const [verdict, id] of Object.entries(pair)) {
          assert.ok(examples.has(id), `${rel}: no example ${id}`);
          drawn.add(id);
          if (verdict === 'do') assert.deepEqual(exampleReports(examples.get(id)), [], `${rel}: the Do ${id} names a report`);
        }
      }
    }
    assert.deepEqual([...examples.keys()].filter((id) => !drawn.has(id)), [], 'examples no page draws');
  });

  test('a page of a component draws its own examples', () => {
    for (const { rel, pairs } of english) {
      const name = path.basename(rel, '.mdx');
      for (const pair of pairs) for (const id of Object.values(pair)) assert.equal(id.split('/')[0], name, `${rel} draws ${id}`);
    }
  });

  test('each translation of a page draws the pairs of the English page, in its order', () => {
    for (const { rel, pairs } of english) {
      for (const { dir } of translations) {
        const file = path.join(content, dir, rel);
        if (!fs.existsSync(file)) continue;
        assert.deepEqual(pairsOf(file), pairs, `${dir}/${rel}`);
      }
    }
  });
});

// Which pages' heads carry a component's facts (src/lib/page-head.ts): the page of a component that has a spec, in
// every language — and every component page the site has is one. And the page that has no head at all: the page that
// was not found, whose words every language has, and whose file a host finds in each language's folder
// (src/lib/not-found-files.mjs). And the two facts under a component page's head: its level in the page's language, and
// what it is built from, each member by its title and linked to its page — with no name of a level written here.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { isNotFoundPage, levelFacts, notFoundFrontmatter, specOfPage } = await import('../src/lib/page-head.ts');
const { levels, specs, statusComponents } = await import('../src/lib/repo.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');
const { notFoundFiles } = await import('../src/lib/not-found-files.mjs');

describe('the spec a page documents', () => {
  test("is the component's, in every language", () => {
    assert.equal(specOfPage('components/button')?.name, 'button');
    for (const { dir } of translations) assert.equal(specOfPage(`${dir}/components/button`)?.name, 'button', dir);
    assert.equal(specOfPage('components/description-list.mdx')?.name, 'description-list');
  });
  test('is none for the index, for a page elsewhere and for a name with no spec', () => {
    assert.equal(specOfPage('components'), undefined);
    assert.equal(specOfPage('components/index'), undefined);
    assert.equal(specOfPage('foundations/button'), undefined);
    assert.equal(specOfPage('announcements/components/button'), undefined);
    assert.equal(specOfPage('components/button/extra'), undefined);
    assert.equal(specOfPage('components/constructor'), undefined);
  });
  test('is found for every component page the site has', () => {
    const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
    for (const prefix of ['', ...translations.map(({ dir }) => `${dir}/`)]) {
      const folder = `${docs}${prefix}components/`;
      if (!fs.existsSync(folder)) continue;
      for (const file of fs.readdirSync(folder).filter((name) => name.endsWith('.mdx') && name !== 'index.mdx')) {
        const id = `${prefix}components/${file.replace(/\.mdx$/, '')}`;
        const spec = specOfPage(id);
        assert.ok(spec, `${id}: no spec`);
        // The facts the head draws.
        assert.ok(spec.category && spec.tokens, `${id}: a fact is missing`);
      }
    }
  });
});

describe("a component's level and what it is built from, under the head of its page", () => {
  const languages = [source.lang, ...translations.map(({ lang }) => lang)];
  // The spec of each level that the repository's own specs give: one put together from members, one that coordinates
  // several controls, and the Button, a single part.
  const arranging = Object.values(specs).find((spec) => spec.level === levels.completes);
  const coordinating = Object.values(specs).find((spec) => spec.level === levels.coordinates);
  const drawing = specs.button;

  test('the status file says which name is which, and every spec carries one of the three', () => {
    assert.deepEqual(Object.keys(levels), ['single', 'completes', 'coordinates']);
    assert.equal(new Set(Object.values(levels)).size, 3);
    for (const spec of Object.values(specs)) assert.ok(Object.values(levels).includes(spec.level), spec.name);
    assert.ok(arranging, 'no spec is put together from members');
    assert.ok(coordinating, 'no spec coordinates several controls');
    assert.equal(drawing.level, levels.single);
  });
  test('every language has a word for "Level", for each of the three levels and for "Built from"', () => {
    for (const lang of languages) {
      const t = strings(lang);
      assert.deepEqual(Object.keys(t.level), Object.keys(levels), lang);
      for (const word of [t.level_, t.builtFrom, ...Object.values(t.level)]) assert.ok(typeof word === 'string' && word.trim().length > 0, lang);
      assert.equal(new Set(Object.values(t.level)).size, 3, lang);
    }
    // A translation has its own words for the two headings (the names of the levels may be a language's loanwords).
    const english = strings(source.lang);
    for (const { lang } of translations) {
      assert.notEqual(strings(lang).level_, english.level_, lang);
      assert.notEqual(strings(lang).builtFrom, english.builtFrom, lang);
    }
  });
  test("the level is said in the page's language, by what the level is", () => {
    for (const lang of languages) {
      assert.equal(levelFacts(arranging, lang).level, strings(lang).level.completes, lang);
      assert.equal(levelFacts(coordinating, lang).level, strings(lang).level.coordinates, lang);
      assert.equal(levelFacts(drawing, lang).level, strings(lang).level.single, lang);
    }
    // A name the status file does not know is shown as it is, never dropped.
    assert.equal(levelFacts({ level: 'another' }, 'en').level, 'another');
  });
  test('a component built from none has no "Built from"; one that is names each member by its title, linked to its page', () => {
    assert.deepEqual(levelFacts(drawing, 'en').builtFrom, []);
    const members = levelFacts(arranging, 'en').builtFrom;
    assert.deepEqual(members.map((member) => member.name), arranging.builtFrom);
    for (const member of members) {
      assert.equal(member.title, specs[member.name].title);
      assert.equal(member.href, statusComponents.find((row) => row.name === member.name).docs ?? undefined);
    }
    // Under a language's base, the address is that language's.
    for (const { dir } of translations) {
      for (const member of levelFacts(arranging, undefined, `/${dir}`).builtFrom) if (member.href) assert.ok(member.href.startsWith(`/${dir}/components/`), member.href);
    }
    // A member with no page is named and not linked; a name with no spec is shown as it is.
    assert.deepEqual(levelFacts({ level: levels.completes, builtFrom: ['button', 'nothing'] }, 'en', '', { button: { title: 'Button' } }, () => undefined).builtFrom, [
      { name: 'button', title: 'Button' },
      { name: 'nothing', title: 'nothing' },
    ]);
  });
  test('every component page the site has shows a level of its language, and every member it names has a title', () => {
    const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
    for (const [prefix, lang] of [['', source.lang], ...translations.map(({ dir, lang }) => [`${dir}/`, lang])]) {
      const folder = `${docs}${prefix}components/`;
      if (!fs.existsSync(folder)) continue;
      for (const file of fs.readdirSync(folder).filter((name) => name.endsWith('.mdx') && name !== 'index.mdx')) {
        const spec = specOfPage(`${prefix}components/${file.replace(/\.mdx$/, '')}`);
        const facts = levelFacts(spec, lang, prefix ? `/${prefix.slice(0, -1)}` : '');
        assert.ok(Object.values(strings(lang).level).includes(facts.level), `${prefix}${file}: ${facts.level}`);
        for (const member of facts.builtFrom) assert.ok(specs[member.name] && member.title === specs[member.name].title, `${prefix}${file}: ${member.name}`);
      }
    }
  });
});

describe('the page that was not found', () => {
  test('is the page `404` of any language, and no other', () => {
    assert.equal(isNotFoundPage('404'), true);
    for (const { dir } of translations) assert.equal(isNotFoundPage(`${dir}/404`), true, dir);
    assert.equal(isNotFoundPage('ja/404.html'), true);
    for (const id of ['', 'index', '4040', 'components/404', 'ja/components/404', 'announcements/404/more']) assert.equal(isNotFoundPage(id), false, id);
  });
  test("has a title, a sentence and two actions' words in every language, none of them English's but English's own", () => {
    const english = strings(source.lang).notFound;
    assert.deepEqual(Object.keys(english), ['title', 'text', 'home', 'search']);
    for (const { lang } of translations) {
      const words = strings(lang).notFound;
      for (const key of Object.keys(english)) {
        assert.ok(words[key].trim(), `${lang}: ${key}`);
        assert.notEqual(words[key], english[key], `${lang}: ${key} is still English`);
      }
      assert.notEqual(strings(lang).fileTree.label, strings(source.lang).fileTree.label, `${lang}: fileTree.label`);
    }
  });
  test("is titled in its language, has no \"On this page\" and no neighbours, and is kept out of the search and of a crawler's index", () => {
    for (const lang of [source.lang, ...translations.map((translation) => translation.lang)]) {
      const frontmatter = notFoundFrontmatter(lang);
      assert.equal(frontmatter.title, strings(lang).notFound.title, lang);
      assert.deepEqual([frontmatter.tableOfContents, frontmatter.pagefind, frontmatter.prev, frontmatter.next], [false, false, false, false], lang);
      assert.deepEqual(frontmatter.head, [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } }], lang);
    }
  });
  test("is written as `404.html` in each language's folder once the site is built, a copy of that language's page", async () => {
    const dir = fs.mkdtempSync(`${os.tmpdir()}/tanrei-docs-not-found-`);
    try {
      for (const { dir: language } of translations) {
        fs.mkdirSync(`${dir}/${language}/404`, { recursive: true });
        fs.writeFileSync(`${dir}/${language}/404/index.html`, `<html lang="${language}"></html>`);
      }
      await notFoundFiles(translations).hooks['astro:build:done']({ dir: pathToFileURL(`${dir}/`) });
      for (const { dir: language } of translations) assert.equal(fs.readFileSync(`${dir}/${language}/404.html`, 'utf8'), `<html lang="${language}"></html>`, language);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

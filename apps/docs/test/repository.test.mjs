// The foot of a page's links into the repository (src/lib/repository.ts, components/frame/Footer.astro): the page's
// source as GitHub shows it — the file lastmod.mjs dates the page by, in its language — and on a component's page its
// spec; and a new issue about the page in the repository's bug form, whose fields the address fills. The repository is
// tanrei.config.json's. test/browser/page-foot.test.mjs reads the same links out of the built pages.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { pageSources } from '../src/lib/lastmod.mjs';
import { translations } from '../i18n/locales.mjs';

register('./vite-shim.mjs', import.meta.url);
const { fileHref, ISSUE_FORM, pageSourceLinks, reportProblemHref, repositoryHref } = await import('../src/lib/repository.ts');
const { strings } = await import('../src/lib/i18n.ts');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const config = JSON.parse(fs.readFileSync(new URL('tanrei.config.json', `file://${repoRoot}`), 'utf8'));
const where = { repoRoot, contentDir: 'apps/docs/src/content/docs', languages: translations.map(({ dir }) => dir) };
const blob = (file) => `https://github.com/${config.repository.public}/blob/main/${file}`;

describe('the links to a page’s source', () => {
  test('a prose page links its own file in its language, and no spec', () => {
    assert.deepEqual(pageSourceLinks(pageSources('/foundations/accessibility/', where)), { source: blob('apps/docs/src/content/docs/foundations/accessibility.mdx') });
    assert.deepEqual(pageSourceLinks(pageSources('/ja/foundations/accessibility/', where)), { source: blob('apps/docs/src/content/docs/ja/foundations/accessibility.mdx') });
  });
  test('a component page links its file and its spec, in every language', () => {
    assert.deepEqual(pageSourceLinks(pageSources('/components/button/', where)), { source: blob('apps/docs/src/content/docs/components/button.mdx'), spec: blob('specs/button.spec.json') });
    assert.deepEqual(pageSourceLinks(pageSources('/ja/components/button/', where)), { source: blob('apps/docs/src/content/docs/ja/components/button.mdx'), spec: blob('specs/button.spec.json') });
  });
  test('an address with no source links to none', () => {
    assert.deepEqual(pageSourceLinks(pageSources('/no-such-page/', where)), {});
  });
  test('the repository is the configuration’s, and a file’s path is written as GitHub reads it', () => {
    assert.equal(repositoryHref, `https://github.com/${config.repository.public}`);
    assert.equal(fileHref('a b/c#d.mdx'), `${repositoryHref}/blob/main/a%20b/c%23d.mdx`);
  });
});

describe('the report of a problem with a page', () => {
  const form = fs.readFileSync(new URL(`.github/ISSUE_TEMPLATE/${ISSUE_FORM.template}`, `file://${repoRoot}`), 'utf8');
  test('names the bug form, and every field it fills is one of the form’s, with a value it offers', () => {
    for (const id of [ISSUE_FORM.platform.field, ISSUE_FORM.component, ISSUE_FORM.what]) assert.match(form, new RegExp(`^\\s*id: ${id}$`, 'm'), id);
    assert.match(form, new RegExp(`options: \\[[^\\]]*\\b${ISSUE_FORM.platform.value}\\b`));
  });
  test('its title and its first field carry the page’s address; a component page names the component', () => {
    const page = 'https://tanrei.example/ja/components/button/';
    const url = new URL(reportProblemHref(page, 'button'));
    assert.equal(`${url.origin}${url.pathname}`, `${repositoryHref}/issues/new`);
    assert.equal(url.searchParams.get('template'), 'bug.yml');
    assert.ok(url.searchParams.get('title').includes(page));
    assert.ok(url.searchParams.get('what').includes(page));
    assert.equal(url.searchParams.get('platform'), 'Docs');
    assert.equal(url.searchParams.get('component'), 'button');
    assert.equal(new URL(reportProblemHref('https://tanrei.example/foundations/color/')).searchParams.has('component'), false);
  });
});

describe('the words', () => {
  test('every language has each of the foot’s words', () => {
    const keys = Object.keys(strings('en').pageFoot);
    for (const lang of ['en', ...translations.map(({ lang }) => lang)]) {
      for (const key of keys) assert.ok(strings(lang).pageFoot[key]?.trim(), `${lang}: pageFoot.${key}`);
      if (lang !== 'en') for (const key of keys) assert.notEqual(strings(lang).pageFoot[key], strings('en').pageFoot[key], `${lang}: pageFoot.${key} is its own`);
    }
  });
});

// When each page of the sitemap last changed (src/lib/lastmod.mjs): the files a page's date is read from — its own
// source in its language, the English page where a translation does not exist yet, and a component's spec — and, for
// every page of the site, that its date is the one git gives for those files, asked one page at a time
// (`git log -1 --first-parent`); and that a shallow clone stops the build instead of dating every page alike.
// test/browser/sitemap.test.mjs reads the same dates out of the built sitemap.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { tempDir } from '../../../packages/tools/src/test-tmp.js';
import { commitDates, pageSources, sitemapLastmod } from '../src/lib/lastmod.mjs';
import { translations } from '../i18n/locales.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const contentDir = 'apps/docs/src/content/docs';
const languages = translations.map(({ dir }) => dir);
const where = { repoRoot, contentDir, languages };

/** Every page of the content collection, as the address the site gives it and the file it is written in. */
function pages() {
  const root = path.join(repoRoot, contentDir);
  return fs
    .readdirSync(root, { recursive: true })
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const name = file.split(path.sep).join('/').replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
      return { url: `/${name}${name ? '/' : ''}`, file: `${contentDir}/${file.split(path.sep).join('/')}` };
    });
}

/** What git says, one page at a time: the newest commit along first parents that touched any of the files. */
const gitDate = async (files) => (await promisify(execFile)('git', ['log', '-1', '--first-parent', '--format=%cI', '--', ...files], { cwd: repoRoot })).stdout.trim();

describe("a page's sources", () => {
  test('are its own file, in its own language, for every page of the site', () => {
    const all = pages();
    assert.ok(all.length > 100, `${all.length} pages`);
    for (const { url, file } of all) assert.equal(pageSources(url, where)[0], file, url);
  });

  test("of a component's page are its file and then its spec, in every language", () => {
    for (const prefix of ['', ...languages.map((dir) => `/${dir}`)]) {
      const sources = pageSources(`https://site.invalid${prefix}/components/button/`, where);
      assert.deepEqual(sources, [`${contentDir}${prefix}/components/button.mdx`, 'specs/button.spec.json']);
    }
  });

  test('of Theme Studio’s page, in every language, are the component that writes it', () => {
    for (const prefix of ['', ...languages.map((dir) => `/${dir}`)]) assert.deepEqual(pageSources(`${prefix}/studio/`, where), ['apps/docs/src/components/StudioPage.astro']);
  });

  test('of a translation that does not exist yet are the English page it shows; an address with no page has none', () => {
    const root = tempDir('docs-lastmod-sources');
    fs.mkdirSync(path.join(root, 'content/ja/foundations'), { recursive: true });
    fs.mkdirSync(path.join(root, 'content/foundations'), { recursive: true });
    fs.mkdirSync(path.join(root, 'content/components'), { recursive: true });
    fs.mkdirSync(path.join(root, 'specs'));
    fs.writeFileSync(path.join(root, 'content/index.mdx'), '');
    fs.writeFileSync(path.join(root, 'content/foundations/color.mdx'), '');
    fs.writeFileSync(path.join(root, 'content/ja/foundations/color.mdx'), '');
    fs.writeFileSync(path.join(root, 'content/components/chip.md'), '');
    fs.writeFileSync(path.join(root, 'specs/chip.spec.json'), '{}');
    const at = { repoRoot: root, contentDir: 'content', languages: ['ja'] };
    assert.deepEqual(pageSources('/ja/foundations/color/', at), ['content/ja/foundations/color.mdx']);
    assert.deepEqual(pageSources('/ja/', at), ['content/index.mdx']);
    assert.deepEqual(pageSources('/ja/components/chip/', at), ['content/components/chip.md', 'specs/chip.spec.json']);
    assert.deepEqual(pageSources('/foundations/shape/', at), []);
  });
});

describe("a page's date", () => {
  test('is, for every page of the site, the date git gives for its sources one page at a time', async () => {
    const lastmod = sitemapLastmod(where);
    lastmod.integration.hooks['astro:build:start']();
    const all = pages();
    const wrong = [];
    // A few at a time: each is one `git log`.
    for (let i = 0; i < all.length; i += 16) {
      await Promise.all(
        all.slice(i, i + 16).map(async ({ url }) => {
          const expected = await gitDate(pageSources(url, where));
          const actual = lastmod.of(url);
          if (!expected || actual !== expected) wrong.push(`${url}: ${actual} (git: ${expected || 'no commit'})`);
        }),
      );
    }
    assert.deepEqual(wrong, [], 'a page no commit holds yet has no date: commit it');
  });

  test('is never read from a shallow clone, which knows only its last commit', () => {
    const repo = tempDir('docs-lastmod-shallow');
    const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid' } });
    git('init', '-q');
    fs.writeFileSync(path.join(repo, 'page.mdx'), '');
    git('add', '.');
    // The plumbing: a commit of the index, with no editor, signing or hook of the machine's configuration.
    git('update-ref', 'HEAD', git('commit-tree', git('write-tree').trim(), '-m', 'page').trim());
    assert.match(commitDates(repo, ['page.mdx']).get('page.mdx'), /^\d{4}-\d\d-\d\dT/);
    fs.writeFileSync(path.join(repo, '.git/shallow'), `${git('rev-parse', 'HEAD').trim()}\n`);
    assert.throws(() => commitDates(repo, ['page.mdx']), /shallow/);
  });
});

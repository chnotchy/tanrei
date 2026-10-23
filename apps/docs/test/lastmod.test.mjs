// When each page last changed (src/lib/lastmod.mjs): the files a page's date is read from — its own source in its
// language, the English page where a translation does not exist yet, a component's spec and component tokens, and
// `tokens/` for a page that draws tokens — and, for every page of the site, that its date is the one git gives for
// those files, asked one page at a time (`git log -1 --first-parent`); that what the pages read from the virtual module
// is the sitemap's date for every page, from the one reading of the history; and that a shallow clone stops the build
// instead of dating every page alike. test/browser/sitemap.test.mjs reads the same dates out of the built sitemap and
// the built pages.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { tempDir } from '../../../packages/tools/src/test-tmp.js';
import { LAST_UPDATED_MODULE, commitDates, pageLastmod, pageSources } from '../src/lib/lastmod.mjs';
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

/** A repository of its own, committed with the plumbing: no editor, signing or hook of the machine's configuration. */
function scratchRepo(name) {
  const repo = tempDir(name);
  const git = (env, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid', ...env } });
  git({}, 'init', '-q');
  const commit = (date, files) => {
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      fs.writeFileSync(path.join(repo, file), text);
    }
    git({}, 'add', '.');
    const env = { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
    const parent = fs.existsSync(path.join(repo, '.git/refs/heads')) && git({}, 'for-each-ref', '--format=%(objectname)', 'refs/heads').trim();
    git({}, 'update-ref', 'HEAD', git(env, 'commit-tree', git({}, 'write-tree').trim(), ...(parent ? ['-p', parent] : []), '-m', 'change').trim());
  };
  return { repo, git: (...args) => git({}, ...args), commit };
}

/** The integration as Astro runs it for `command`: the Vite plugin it adds, and its hooks. */
function setUp(lastmod, command) {
  let plugin;
  const warnings = [];
  lastmod.integration.hooks['astro:config:setup']({ command, updateConfig: ({ vite }) => ([plugin] = vite.plugins), logger: { warn: (message) => warnings.push(message) } });
  return { plugin, warnings };
}

/** The virtual module as a page imports it: what the plugin serves, loaded by Node. */
async function loadModule(plugin, name) {
  const id = plugin.resolveId(LAST_UPDATED_MODULE);
  assert.ok(id, `the plugin resolves ${LAST_UPDATED_MODULE}`);
  const file = path.join(tempDir(name), 'last-updated.mjs');
  fs.writeFileSync(file, plugin.load(id));
  return import(pathToFileURL(file).href);
}

describe("a page's sources", () => {
  test('are its own file, in its own language, for every page of the site', () => {
    const all = pages();
    assert.ok(all.length > 100, `${all.length} pages`);
    for (const { url, file } of all) assert.equal(pageSources(url, where)[0], file, url);
  });

  test("of a component's page are its file, its spec and its component tokens, in every language", () => {
    for (const prefix of ['', ...languages.map((dir) => `/${dir}`)]) {
      const sources = pageSources(`https://site.invalid${prefix}/components/button/`, where);
      assert.deepEqual(sources, [`${contentDir}${prefix}/components/button.mdx`, 'specs/button.spec.json', 'tokens/comp/button.tokens.json']);
    }
    // A group named apart from the component, and a shared set that names the component among its readers.
    assert.deepEqual(pageSources('/components/text-field/', where).slice(1), ['specs/text-field.spec.json', 'tokens/comp/field.tokens.json']);
    assert.ok(pageSources('/components/select/', where).includes('tokens/comp/input-box.tokens.json'));
  });

  test('of a page that draws tokens end with the whole of tokens/', () => {
    assert.deepEqual(pageSources('/tokens/color/', where), [`${contentDir}/tokens/color.mdx`, 'tokens']);
    assert.deepEqual(pageSources('/ja/foundations/shape/', where), [`${contentDir}/ja/foundations/shape.mdx`, 'tokens']);
    assert.deepEqual(pageSources('/getting-started/web/', where), [`${contentDir}/getting-started/web.mdx`]);
  });

  test('of Theme Studio’s page, in every language, are the component that writes it', () => {
    for (const prefix of ['', ...languages.map((dir) => `/${dir}`)]) assert.deepEqual(pageSources(`${prefix}/studio/`, where), ['apps/docs/src/components/StudioPage.astro']);
  });

  test('of a translation that does not exist yet are the English page it shows; an address with no page has none', () => {
    const root = tempDir('docs-lastmod-sources');
    const write = (file, text = '') => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text);
    };
    write('tanrei.config.json', JSON.stringify({ namespace: 'tanrei' }));
    write('content/index.mdx');
    write('content/foundations/color.mdx', "import ColorRoles from '../../components/tokens/ColorRoles.astro';\n");
    write('content/ja/foundations/color.mdx', 'Prose that names /components/tokens/ in a sentence, not in an import.\n');
    write('content/components/chip.md');
    write('content/components/sheet.md');
    write('specs/chip.spec.json', JSON.stringify({ tokens: 'comp.chip' }));
    write('specs/sheet.spec.json', JSON.stringify({ tokens: 'comp.sheet', layer: 'kit' }));
    write('tokens/comp/chip.tokens.json', '{}');
    write('tokens/comp/box.tokens.json', JSON.stringify({ tanrei: { comp: { box: { $extensions: { 'dev.tanrei.shared': { readers: ['chip'] } } } } } }));
    write('tokens/systems/kit/comp/sheet.tokens.json', '{}');
    const at = { repoRoot: root, contentDir: 'content', languages: ['ja'] };
    assert.deepEqual(pageSources('/foundations/color/', at), ['content/foundations/color.mdx', 'tokens']);
    assert.deepEqual(pageSources('/ja/foundations/color/', at), ['content/ja/foundations/color.mdx']);
    assert.deepEqual(pageSources('/ja/', at), ['content/index.mdx']);
    assert.deepEqual(pageSources('/ja/components/chip/', at), ['content/components/chip.md', 'specs/chip.spec.json', 'tokens/comp/chip.tokens.json', 'tokens/comp/box.tokens.json']);
    assert.deepEqual(pageSources('/components/sheet/', at), ['content/components/sheet.md', 'specs/sheet.spec.json', 'tokens/systems/kit/comp/sheet.tokens.json']);
    assert.deepEqual(pageSources('/foundations/shape/', at), []);
  });
});

describe("a page's date", () => {
  test('is, for every page of the site, the instant git gives for its sources one page at a time, in UTC', async () => {
    const lastmod = pageLastmod(where);
    lastmod.integration.hooks['astro:build:start']();
    const all = pages();
    const wrong = [];
    // A few at a time: each is one `git log`.
    for (let i = 0; i < all.length; i += 16) {
      await Promise.all(
        all.slice(i, i + 16).map(async ({ url }) => {
          const expected = await gitDate(pageSources(url, where));
          const actual = lastmod.of(url);
          if (!expected || actual !== new Date(expected).toISOString()) wrong.push(`${url}: ${actual} (git: ${expected || 'no commit'})`);
        }),
      );
    }
    assert.deepEqual(wrong, [], 'a page no commit holds yet has no date: commit it');
  });

  test('is, as the pages read it from the virtual module, the sitemap’s date for every page', async () => {
    const lastmod = pageLastmod(where);
    const { plugin } = setUp(lastmod, 'build');
    lastmod.integration.hooks['astro:build:start']();
    const { lastUpdated } = await loadModule(plugin, 'docs-lastmod-module');
    const all = pages();
    const wrong = all.flatMap(({ url }) => {
      const sitemap = lastmod.of(`https://tanrei.invalid${url}`);
      return sitemap && lastUpdated(url) === sitemap && lastUpdated(`https://tanrei.invalid${url}`) === sitemap ? [] : [`${url}: ${lastUpdated(url)} (sitemap: ${sitemap})`];
    });
    assert.deepEqual(wrong, []);
  });

  test('is read once when the site is built, and never before', () => {
    const lastmod = pageLastmod(where);
    const { plugin } = setUp(lastmod, 'build');
    assert.equal(lastmod.of('/'), undefined);
    assert.throws(() => plugin.load(plugin.resolveId(LAST_UPDATED_MODULE)), /before the build read the dates/);
    assert.equal(plugin.resolveId('virtual:something-else'), undefined);
  });

  test('is written in UTC whatever offset its commits were made in', () => {
    const { repo, commit } = scratchRepo('docs-lastmod-utc');
    commit('2026-09-21T01:30:00+09:00', { 'content/index.mdx': '' });
    commit('2026-09-21T10:00:00-05:00', { 'content/guide.mdx': '' });
    const lastmod = pageLastmod({ repoRoot: repo, contentDir: 'content', languages: [] });
    lastmod.integration.hooks['astro:build:start']();
    assert.equal(lastmod.of('/'), '2026-09-20T16:30:00.000Z');
    assert.equal(lastmod.of('https://tanrei.invalid/guide/'), '2026-09-21T15:00:00.000Z');
  });

  test('of a folder is the newest of the files under it', () => {
    const { repo, commit } = scratchRepo('docs-lastmod-folders');
    commit('2026-01-01T00:00:00+09:00', { 'tokens/sys/a.json': '1', 'tokens/comp/b.json': '1', 'page.mdx': '' });
    commit('2026-02-01T00:00:00+09:00', { 'tokens/comp/b.json': '2' });
    commit('2026-03-01T00:00:00+09:00', { 'page.mdx': 'changed' });
    const dates = commitDates(repo, ['tokens', 'page.mdx']);
    assert.equal(dates.get('tokens/sys/a.json'), '2026-01-01T00:00:00+09:00');
    assert.equal(dates.get('tokens/sys'), '2026-01-01T00:00:00+09:00');
    assert.equal(dates.get('tokens/comp'), '2026-02-01T00:00:00+09:00');
    assert.equal(dates.get('tokens'), '2026-02-01T00:00:00+09:00');
    assert.equal(dates.get('page.mdx'), '2026-03-01T00:00:00+09:00');
  });

  test('is never read from a shallow clone, which knows only its last commit; `astro dev` then prints none', async () => {
    const { repo, git, commit } = scratchRepo('docs-lastmod-shallow');
    commit('2026-09-21T10:00:00+09:00', { 'content/index.mdx': '' });
    assert.equal(commitDates(repo, ['content/index.mdx']).get('content/index.mdx'), '2026-09-21T10:00:00+09:00');
    fs.writeFileSync(path.join(repo, '.git/shallow'), `${git('rev-parse', 'HEAD').trim()}\n`);
    assert.throws(() => commitDates(repo, ['content/index.mdx']), /shallow/);
    const at = { repoRoot: repo, contentDir: 'content', languages: [] };
    assert.throws(() => pageLastmod(at).integration.hooks['astro:build:start'](), /shallow/);
    const { plugin, warnings } = setUp(pageLastmod(at), 'dev');
    const { lastUpdated } = await loadModule(plugin, 'docs-lastmod-dev');
    assert.equal(lastUpdated('/'), undefined);
    assert.match(warnings.join('\n'), /shallow/);
  });
});

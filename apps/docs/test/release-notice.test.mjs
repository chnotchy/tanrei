// The install pages are written as they read once a version is released, and the one notice at their top says what
// differs today (src/lib/release-notice.ts, components/ReleaseNotice.astro): a prerelease and its dist-tag, a paused
// platform not yet published. Held here: what the notice says for each version and each platform, in every language;
// that it says nothing once nothing differs; that the headings it names are the pages' own; and that no page says in
// its own prose what only the notice may say.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { releaseNotice } = await import('../src/lib/release-notice.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
const config = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tanrei.config.json', import.meta.url)), 'utf8'));
const languages = [{ lang: source?.lang ?? 'en', dir: '' }, ...translations.map(({ lang, dir }) => ({ lang, dir }))];
const page = (dir, rel) => fs.readFileSync(`${docs}${dir ? `${dir}/` : ''}${rel}`, 'utf8');
const NATIVE = ['swiftui', 'compose', 'flutter', 'react-native'];
const ALL = ['web', ...NATIVE];

describe('the notice, in every language', () => {
  for (const { lang } of languages) {
    const t = strings(lang).release;
    const unfilled = (notice) => notice.paragraphs.filter((p) => /\{\w+\}/.test(p));

    test(`${lang}: a prerelease says what to install until its release, with its tag`, () => {
      const notice = releaseNotice({ lang, platform: 'web', pkgs: ['@tanrei/react', '@tanrei/web'], version: '0.1.0-next.3', paused: NATIVE });
      assert.equal(notice.title, t.prereleaseTitle);
      assert.equal(notice.paragraphs.length, 1);
      const [text] = notice.paragraphs;
      for (const part of ['<code>0.1.0-next.3</code>', '<code>next</code>', '<code>0.1.0</code>', '<code>@tanrei/react@next</code>', '<code>@tanrei/web@next</code>']) assert.ok(text.includes(part), `${lang}: ${part} in ${text}`);
      assert.ok(text.includes(t.noCompat), `${lang}: a 0.x prerelease says it keeps no backward compatibility`);
      assert.deepEqual(unfilled(notice), []);
    });

    test(`${lang}: a prerelease of 1.0 or later says nothing of the 0.x rule`, () => {
      const notice = releaseNotice({ lang, pkgs: ['@tanrei/cli'], version: '1.2.0-rc.1', paused: [] });
      assert.ok(notice.paragraphs[0].includes('<code>@tanrei/cli@rc</code>'));
      assert.ok(!notice.paragraphs[0].includes(t.noCompat));
    });

    test(`${lang}: a release of a published package needs no notice`, () => {
      assert.equal(releaseNotice({ lang, platform: 'web', pkgs: ['@tanrei/web'], version: '0.1.0', paused: NATIVE }), null);
      assert.equal(releaseNotice({ lang, pkgs: ['@tanrei/cli', '@tanrei/mcp'], version: '0.1.0', paused: NATIVE }), null);
    });

    test(`${lang}: a paused platform's guide says it is not published, at a release too`, () => {
      for (const version of ['0.1.0-next.0', '0.1.0']) {
        const notice = releaseNotice({ lang, platform: 'swiftui', pkgs: ['Tanrei'], registry: 'Swift Package Manager', version, paused: NATIVE });
        assert.equal(notice.title, t.unpublishedTitle);
        const [text] = notice.paragraphs;
        for (const part of ['<code>Tanrei</code>', 'Swift Package Manager', strings(lang).platform.swiftui, `https://github.com/${config.repository.public}`]) assert.ok(text.includes(part), `${lang}: ${part} in ${text}`);
        assert.deepEqual(unfilled(notice), []);
      }
    });

    test(`${lang}: the overview names the prerelease and every paused platform, and nothing once neither holds`, () => {
      const both = releaseNotice({ lang, version: '0.1.0-next.0', paused: ['compose', 'flutter'] });
      assert.equal(both.title, t.prereleaseTitle);
      assert.equal(both.paragraphs.length, 2);
      assert.ok(both.paragraphs[0].includes(`<code>npm install ${config.packages.npmScope}/web@next</code>`));
      for (const p of ['compose', 'flutter']) assert.ok(both.paragraphs[1].includes(strings(lang).platform[p]));
      for (const p of ['swiftui', 'react-native']) assert.ok(!both.paragraphs[1].includes(strings(lang).platform[p]));
      const paused = releaseNotice({ lang, version: '0.1.0', paused: ['swiftui'] });
      assert.equal(paused.title, t.unpublishedTitle);
      assert.equal(paused.paragraphs.length, 1);
      assert.equal(releaseNotice({ lang, version: '0.1.0', paused: [] }), null);
      assert.deepEqual([...unfilled(both), ...unfilled(paused)], []);
    });
  }
});

describe('the install pages, in every language', () => {
  /** The headings a notice names, quoted in the language's own marks. */
  const quoted = (text) => [...text.replace(/<[^>]*>/g, '').matchAll(/[“「«]([^”」»]+)[”」»]/g)].map(([, name]) => name);

  for (const { lang, dir } of languages) {
    test(`${lang}: each platform's guide carries the notice for its own platform`, () => {
      for (const platform of ALL) {
        const text = page(dir, `getting-started/${platform}.mdx`);
        assert.match(text, new RegExp(`<ReleaseNotice platform="${platform}" `), `${dir}/getting-started/${platform}.mdx`);
      }
      assert.match(page(dir, 'getting-started/react.mdx'), /<ReleaseNotice platform="web" /);
      assert.match(page(dir, 'getting-started/index.mdx'), /<ReleaseNotice \/>/);
      assert.match(page(dir, 'getting-started/your-design-system.mdx'), /<ReleaseNotice registry="npm" pkg=\{\["@tanrei\/cli", "@tanrei\/mcp"\]\} \/>/);
      assert.match(page(dir, 'getting-started/ai-agents.mdx'), /<ReleaseNotice registry="npm" pkg="@tanrei\/mcp" \/>/);
    });

    test(`${lang}: the headings a paused platform's notice names are that guide's own`, () => {
      const names = quoted(strings(lang).release.unpublished);
      assert.equal(names.length, 2, `${lang}: ${names}`);
      for (const platform of NATIVE) {
        const text = page(dir, `getting-started/${platform}.mdx`);
        for (const name of names) assert.ok(text.includes(`### ${name}\n`), `${dir}/getting-started/${platform}.mdx has no heading «${name}»`);
      }
    });
  }

  test('no page writes a version, a dist-tag or the release in its own prose: the notice says them', () => {
    const files = fs.readdirSync(docs, { recursive: true }).map(String).filter((f) => f.endsWith('.mdx'));
    const tag = /@tanrei\/[a-z-]+@(next|latest|\d)/;
    for (const file of files) {
      const text = fs.readFileSync(docs + file, 'utf8');
      assert.doesNotMatch(text, tag, file);
      assert.ok(!text.includes(config.version), `${file} names ${config.version}`);
      assert.doesNotMatch(text, /PreReleaseNotice/, file);
    }
  });

  test('the English guides never say that a published package is unpublished', () => {
    const UNRELEASED = [/not on npm/i, /not on a registry/i, /nothing has been released/i, /(before|until|after) the first release/i];
    for (const name of fs.readdirSync(`${docs}getting-started`)) {
      const text = page('', `getting-started/${name}`);
      for (const pattern of UNRELEASED) assert.doesNotMatch(text, pattern, `getting-started/${name}`);
    }
  });
});

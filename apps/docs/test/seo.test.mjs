// What a page's head says to a search engine and to a shared link (src/lib/seo.ts, src/routeData.ts), and the image a
// shared link shows (src/lib/social-image.mjs): the language as Open Graph writes it, which page's image each page
// names, the titles of the first page and of a component's page in every language, the structured data and whose name
// it carries, and the image itself — 1200 × 630, in the page's language, its colors the light scheme's.
//
// The built site is asked the same of every page in a browser (test/browser/seo.test.mjs).
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

register('./vite-shim.mjs', import.meta.url);
const seo = await import('../src/lib/seo.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { config } = await import('../src/lib/repo.ts');
const { source, translations } = await import('../i18n/locales.mjs');
const { SOCIAL, bidiRuns, breakUnits, fontStack, setLine, setLines, socialPng, socialSvg, typeRole } = await import('../src/lib/social-image.mjs');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const docs = new URL('../', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, docs), 'utf8');
const languages = [source, ...translations];
const owner = config.repository.public.split('/')[0];

describe('the language', () => {
  test('every language has its Open Graph locale, `language_TERRITORY`, and says which faces its image is set in', () => {
    for (const language of languages) {
      assert.match(language.ogLocale, /^[a-z]{2}_[A-Z]{2}$/, language.lang);
      assert.equal(language.ogLocale.slice(0, 2), language.lang.slice(0, 2).toLowerCase(), language.lang);
      assert.ok(language.imageFaces === null || Array.isArray(language.imageFaces), language.lang);
    }
  });
  test('a page names its own as `og:locale` and every other one as an alternate', () => {
    for (const language of languages) {
      const { locale, alternates } = seo.ogLocales(language.lang);
      assert.equal(locale, language.ogLocale);
      assert.deepEqual([...alternates].sort(), languages.filter((other) => other !== language).map((other) => other.ogLocale).sort());
    }
  });
});

describe('which image a page names', () => {
  test('its own, in its language, where the build draws that language', () => {
    assert.equal(seo.socialImagePath(''), '/og/index.png');
    assert.equal(seo.socialImagePath('components/button'), '/og/components/button.png');
    assert.equal(seo.socialImagePath('ja'), '/og/ja/index.png');
    assert.equal(seo.socialImagePath('ja/components/button'), '/og/ja/components/button.png');
    assert.equal(seo.socialImagePath('ar/foundations/color'), '/og/ar/foundations/color.png');
  });
  test('the English page’s for a language the build has no face for, and for a page shown in English', () => {
    for (const { dir } of translations.filter((language) => language.imageFaces === null)) {
      assert.equal(seo.socialImagePath(`${dir}/components/button`), '/og/components/button.png', dir);
      assert.equal(seo.socialImagePath(dir), '/og/index.png', dir);
    }
    assert.equal(seo.socialImagePath('ja/components/button', true), '/og/components/button.png');
  });
  test('the languages without a face are named, with the reason (Chinese is not drawn in the Japanese face)', () => {
    assert.deepEqual(translations.filter((language) => language.imageFaces === null).map((language) => language.lang).sort(), ['hi', 'zh-CN']);
  });
});

describe('the titles', () => {
  test('the first page is titled by what the system is, once, in every language — never «Tanrei | Tanrei»', () => {
    for (const language of languages) {
      const title = seo.homeTitle(language.lang);
      assert.equal(title.split(config.name).length - 1, 1, `${language.lang}: ${title}`);
      assert.doesNotMatch(title, /\|/);
      for (const platform of config.platforms) assert.ok(title.includes(platform === 'web' ? 'Web Components' : strings(language.lang).platform[platform]), `${language.lang}: ${platform}`);
    }
    assert.equal(seo.homeTitle('en'), `${config.name} — design system for Web Components, SwiftUI, Jetpack Compose, Flutter and React Native`);
  });
  test('an Arabic title opens with an Arabic word (i18n/glossary.md)', () => {
    assert.match(seo.homeTitle('ar'), /^\p{Script=Arabic}/u);
    assert.match(seo.componentTitles('الزر', 'ar').document, /^\p{Script=Arabic}/u);
  });
  test('a component’s page: «<Component> — accessible UI component | Tanrei design system»', () => {
    assert.deepEqual(seo.componentTitles('Button', 'en'), { document: `Button — accessible UI component | ${config.name} design system`, og: 'Button — accessible UI component' });
    for (const language of languages) {
      const { document, og } = seo.componentTitles('X', language.lang);
      assert.ok(document.startsWith(`${og} | `) && og.startsWith('X — ') && document.includes(config.name), `${language.lang}: ${document}`);
    }
  });
  test('the words are in every language, and a title is filled as text', () => {
    for (const language of languages) {
      const words = strings(language.lang).seo;
      for (const key of ['component', 'site', 'home', 'web']) assert.ok(words[key], `${language.lang}: seo.${key}`);
      assert.equal(words.list.length, 2, language.lang);
    }
    assert.equal(seo.componentTitles('A & <B>', 'en').og, 'A & <B> — accessible UI component');
  });
});

describe('the structured data', () => {
  const site = new URL('https://site.test/');
  test('the trail: every level that has a page, and the page itself', () => {
    const list = seo.breadcrumbList([{ name: 'Home', href: '/' }, { name: 'Foundations' }, { name: 'Components', href: '/components/' }, { name: 'Button', href: '/components/button/' }], site);
    assert.equal(list['@type'], 'BreadcrumbList');
    assert.deepEqual(
      list.itemListElement.map((item) => [item.position, item.name, item.item]),
      [
        [1, 'Home', 'https://site.test/'],
        [2, 'Components', 'https://site.test/components/'],
        [3, 'Button', 'https://site.test/components/button/'],
      ],
    );
  });
  test('the site and its source code: the name, 端麗, the repository, the license and the version from tanrei.config.json', () => {
    const website = seo.webSite('https://site.test/', 'ja', 'D');
    assert.deepEqual([website['@type'], website.name, website.alternateName, website.inLanguage], ['WebSite', config.name, '端麗', 'ja']);
    const code = seo.softwareSourceCode('https://site.test/', 'D');
    assert.equal(code['@type'], 'SoftwareSourceCode');
    assert.equal(code.codeRepository, `https://github.com/${config.repository.public}`);
    assert.equal(code.version, config.version);
    assert.equal(code.license, `https://spdx.org/licenses/${config.license}.html`);
    assert.deepEqual(code.programmingLanguage, ['TypeScript', 'Swift', 'Kotlin', 'Dart']);
  });
  test('a platform’s page of "Getting started" names that platform’s language', () => {
    assert.equal(seo.gettingStartedPlatform('getting-started/swiftui'), 'swiftui');
    assert.equal(seo.gettingStartedPlatform('getting-started'), undefined);
    assert.equal(seo.gettingStartedPlatform('getting-started/your-design-system'), undefined);
    assert.equal(seo.softwareSourceCode('https://site.test/', 'D', ['compose']).programmingLanguage, 'Kotlin');
    for (const platform of [...config.platforms, 'react']) assert.ok(seo.PLATFORM_CODE[platform], platform);
    for (const page of fs.readdirSync(new URL('src/content/docs/getting-started/', docs)).map((file) => file.replace(/\.mdx?$/, ''))) {
      if (page !== 'index' && page !== 'your-design-system') assert.ok(seo.gettingStartedPlatform(`getting-started/${page}`), page);
    }
  });
  test('the only author is the account that owns the repository', () => {
    const code = seo.softwareSourceCode('https://site.test/', 'D');
    assert.deepEqual(code.author, { '@type': 'Person', name: owner, url: `https://github.com/${owner}` });
    const people = JSON.stringify([code, seo.webSite('https://site.test/', 'en', 'D')]).match(/"@type":"(?:Person|Organization)"/g);
    assert.equal(people.length, 1);
    assert.doesNotMatch(read('src/routeData.ts') + read('src/lib/seo.ts'), /"author"|creator|publisher|Organization/);
  });
  test('JSON-LD cannot end its script element', () => {
    assert.equal(seo.jsonLd({ a: '</script><b>' }), '{"a":"\\u003c/script>\\u003cb>"}');
    assert.deepEqual(JSON.parse(seo.jsonLd({ a: '</script>' })), { a: '</script>' });
  });
});

describe('the image', () => {
  const sys = JSON.parse(fs.readFileSync(new URL(`design/tokens/${config.namespace}.light.tokens.json`, `file://${repoRoot}`), 'utf8'))[config.namespace].sys;
  const colors = Object.fromEntries(Object.entries(sys.color).map(([name, token]) => [name, token.$value.hex]));
  const look = {
    wordmark: fs.readFileSync(`${repoRoot}design/brand/generated/wordmark.light.svg`, 'utf8'),
    colors,
    type: { display: typeRole(sys.typescale.display.$value, 1.5), body: typeRole(sys.typescale['body-large'].$value, 1.875), label: typeRole(sys.typescale.label.$value, 1.75) },
    host: 'site.test',
  };
  const statuses = config.platforms.map((platform) => ({ label: strings('en').platform[platform], status: 'lagging', word: 'Lagging' }));
  const pages = [
    { heading: 'Button', description: 'Lets people take an action.', lang: 'en', dir: 'ltr', statuses },
    { heading: 'ボタン', description: '1 回のタップまたはクリックで、アクションを実行します。', lang: 'ja', dir: 'ltr' },
    { heading: 'Botón', description: 'Permite realizar una acción con un solo toque o clic.', lang: 'es', dir: 'ltr' },
    { heading: 'الزر', description: 'نظام تصميم واحد لـ Web Components و SwiftUI.', lang: 'ar', dir: 'rtl', faces: ['Noto Sans Arabic'] },
    { description: 'One design system.', lang: 'en', dir: 'ltr' },
  ];

  test('is 1200 × 630 and opaque, in every language the build draws', async () => {
    for (const page of pages) {
      const png = await socialPng(page, look, repoRoot);
      const meta = await sharp(png).metadata();
      assert.deepEqual([meta.format, meta.width, meta.height], ['png', SOCIAL.width, SOCIAL.height], page.lang);
      assert.equal((await sharp(png).stats()).isOpaque, true, page.lang);
    }
  });
  test('draws with the light scheme’s colors and no others, the wordmark as its only mark, and the text as outlines', async () => {
    const allowed = new Set(Object.values(colors));
    for (const page of pages) {
      const svg = await socialSvg(page, look, repoRoot);
      for (const [, color] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)) assert.ok(allowed.has(color), `${page.lang}: ${color} is no sys.color of the light scheme`);
      assert.equal(svg.match(/<svg /g).length, 2, 'the image and the wordmark: no symbol beside it');
      assert.doesNotMatch(svg, /<text\b|font-family/, 'no system font is asked for');
    }
  });
  test('a character no face sets fails the build, and says which', async () => {
    await assert.rejects(socialSvg({ heading: 'नमस्ते', lang: 'hi', dir: 'ltr' }, look, repoRoot), /no face of Inter, Noto Sans JP.*sets “न”/);
  });
  test('text the room cannot hold stops at its last line, which ends with an ellipsis', async () => {
    const stack = fontStack(look.type.body.families, repoRoot);
    const style = { size: 30, weight: 400, tracking: 0, lang: 'en', dir: 'ltr' };
    const ellipsis = (await setLine('…', stack, style)).glyphs[0].d;
    const long = await setLines('word '.repeat(80), stack, style, { width: 600, maxLines: 2 });
    assert.equal(long.cut, true);
    assert.equal(long.lines.length, 2);
    assert.ok(long.lines.every((line) => line.width <= 600));
    assert.equal(long.lines[1].glyphs.at(-1).d, ellipsis);
    const short = await setLines('two words', stack, style, { width: 600, maxLines: 2 });
    assert.deepEqual([short.cut, short.lines.length], [false, 1]);
  });
  test('Japanese breaks between characters but never before a small kana or a closing mark; Arabic keeps a Latin run in its order', () => {
    assert.deepEqual(breakUnits('アクションの実行、オン'), ['ア', 'ク', 'ショ', 'ン', 'の', '実', '行、', 'オ', 'ン']);
    assert.deepEqual(breakUnits('Lets people'), ['Lets ', 'people']);
    assert.deepEqual(bidiRuns('لـ Web Components و', 'rtl').map((run) => [run.dir, run.text]), [
      ['rtl', ' و'],
      ['ltr', 'Web Components'],
      ['rtl', 'لـ '],
    ]);
  });
});

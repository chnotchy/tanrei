// What the site makes of the brand marks (src/lib/brand.mjs, design/brand/): the header's wordmark, the icons, the
// social images and the brand page's drawings, all derived from the marks' files — none drawn by hand, none left in
// public/.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import sharp from 'sharp';
import { ICO_SIZES, TOUCH_ICON_SIZE, ico, icoOf, iconSvg, inlineMark, png } from '../src/lib/brand.mjs';
import { frameOf, inkBox } from '../src/lib/brand-geometry.mjs';
import { translations } from '../i18n/locales.mjs';

const repo = new URL('../../../', import.meta.url);
const docs = new URL('../', import.meta.url);
const read = (base, file) => fs.readFileSync(new URL(file, base), 'utf8');
const symbol = read(repo, 'design/brand/symbol.svg');
const symbolLight = read(repo, 'design/brand/generated/symbol.light.svg');
const wordmark = read(repo, 'design/brand/wordmark.svg');

describe('the header', () => {
  const header = read(docs, 'src/components/frame/Header.astro');
  const css = read(docs, 'src/styles/frame.css');

  test('the header’s brand is the app bar’s: a link to the first page named by the site’s name', () => {
    assert.match(header, /<tanrei-app-bar class="docs-app-bar" brand-href=\{homeHref\(route\)\} brand-label=\{route\.siteTitle\}>/);
    assert.doesNotMatch(header, /<a slot="(?:navigation|brand)/, 'the link is the bar’s, not one written by the page');
  });

  test('it always shows the wordmark — never the symbol — named by the site’s name until the bar takes the name', () => {
    assert.match(header, /inlineMark\(marks\.wordmark, \{[^}]*slot: 'brand-wordmark'[^}]*role: 'img', 'aria-label': route\.siteTitle/);
    assert.doesNotMatch(header, /marks\.symbol/);
    assert.doesNotMatch(header, /brand-layout=/, 'one image at every width: no layout that swaps it');
    const mark = inlineMark(wordmark, { width: 120, height: 40, slot: 'brand-wordmark', class: 'docs-brand' });
    assert.match(mark, /width="120" height="40"/, 'it holds its size before any stylesheet');
    assert.match(mark, /fill="currentColor"/);
  });

  test('until the bar is defined, the wordmark holds the box the bar gives it, from the bar’s tokens', () => {
    const rule = css.match(/\n  tanrei-app-bar:not\(:defined\) > \.docs-brand \{([^}]*)\}/)?.[1] ?? '';
    assert.match(rule, /block-size: var\(--tanrei-comp-app-bar-brand-wordmark-height\)/);
    assert.match(rule, /padding-inline: calc\(\(var\(--tanrei-sys-target-pointer\) - var\(--tanrei-comp-app-bar-brand-symbol-size\)\) \/ 2\)/);
    assert.match(rule, /padding-block: calc\(\(var\(--tanrei-sys-target-pointer\) - var\(--tanrei-comp-app-bar-brand-wordmark-height\)\) \/ 2\)/);
    assert.match(rule, /color: var\(--tanrei-comp-app-bar-brand-color\)/);
  });

  test('the wordmark at the bar’s height keeps its capital at the brand’s minimum, 24 px', async () => {
    const tokens = read(repo, 'tokens/comp/app-bar.tokens.json');
    const height = Number(tokens.match(/"wordmark": \{\s*"height": \{[\s\S]*?"value": (\d+)/)[1]);
    const cap = (await inkBox(wordmark, { to: 0.25 })).height;
    const drawn = (cap * height) / frameOf(wordmark).height;
    assert.ok(drawn >= 24, `the capital is ${drawn} px at ${height} px`);
  });
});

describe('the icons and the social images', () => {
  test('nothing of the brand is a file of public/: every icon and social image is rendered from the marks', () => {
    for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
      assert.ok(!fs.existsSync(new URL(`public/${file}`, docs)), `public/${file} would shadow the one the build renders`);
      assert.ok(fs.existsSync(new URL(`src/pages/${file}.ts`, docs)), `src/pages/${file}.ts renders /${file}`);
    }
    assert.ok(!fs.existsSync(new URL('public/og', docs)) && !fs.existsSync(new URL('public/og.png', docs)), 'a social image in public/ would shadow the ones the build renders');
    assert.ok(fs.existsSync(new URL('src/pages/og/[...slug].png.ts', docs)), 'src/pages/og/[...slug].png.ts renders each page’s social image (test/seo.test.mjs)');
  });

  test('the head names each of them', () => {
    const config = read(docs, 'astro.config.mjs');
    assert.match(config, /favicon: '\/favicon\.svg'/);
    assert.match(config, /rel: 'icon', href: '\/favicon\.ico', sizes: '32x32'/);
    assert.match(config, /rel: 'apple-touch-icon', href: '\/apple-touch-icon\.png'/);
    assert.doesNotMatch(config, /og:image/, 'each page names its own social image (src/routeData.ts), not one for every page');
    assert.match(config, /routeMiddleware: '\.\/src\/routeData\.ts'/);
  });

  test('an ICO holds each size as a PNG, as its directory says', async () => {
    const file = await icoOf(symbolLight, { background: '#ffffff' });
    assert.deepEqual([file.readUInt16LE(0), file.readUInt16LE(2), file.readUInt16LE(4)], [0, 1, ICO_SIZES.length]);
    for (const [i, size] of ICO_SIZES.entries()) {
      const entry = 6 + 16 * i;
      assert.equal(file.readUInt8(entry), size);
      const [length, offset] = [file.readUInt32LE(entry + 8), file.readUInt32LE(entry + 12)];
      const meta = await sharp(file.subarray(offset, offset + length)).metadata();
      assert.deepEqual([meta.format, meta.width, meta.height], ['png', size, size]);
    }
    assert.equal(ico([]).length, 6);
  });

  test('the home-screen icon is opaque and square', async () => {
    const touch = await sharp(await png(iconSvg(symbolLight, { size: TOUCH_ICON_SIZE, background: '#ffffff' }))).stats();
    assert.equal(touch.isOpaque, true, 'a home screen draws a transparent icon on black');
    const meta = await sharp(await png(iconSvg(symbolLight, { size: TOUCH_ICON_SIZE, background: '#ffffff' }))).metadata();
    assert.deepEqual([meta.width, meta.height], [TOUCH_ICON_SIZE, TOUCH_ICON_SIZE]);
  });
});

describe('the brand page', () => {
  const languages = ['', ...translations.map(({ dir }) => dir)];
  const page = (dir) => read(docs, `src/content/docs/${dir ? `${dir}/` : ''}foundations/brand.mdx`);

  test('it takes the place of the principles page in every language: in the sidebar, and at the old address', () => {
    const config = read(docs, 'astro.config.mjs');
    assert.match(config, /'foundations\/brand',/);
    assert.doesNotMatch(config, /'foundations\/principles',/);
    assert.match(config, /redirects: moved/);
    for (const dir of languages) {
      assert.ok(page(dir), `${dir || 'en'}: the brand page`);
      assert.ok(!fs.existsSync(new URL(`src/content/docs/${dir ? `${dir}/` : ''}foundations/principles.mdx`, docs)), `${dir || 'en'}: the principles page is gone`);
    }
  });

  test('no page links to the old address', () => {
    const walk = (url) => fs.readdirSync(url, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(new URL(`${entry.name}/`, url)) : entry.name.endsWith('.mdx') ? [new URL(entry.name, url)] : []));
    const linking = walk(new URL('src/content/docs/', docs)).filter((file) => fs.readFileSync(file, 'utf8').includes('/foundations/principles/'));
    assert.deepEqual(linking.map(String), []);
  });

  test('every language draws the marks from their files (BrandFigure), with the same panels, and states the favicon’s exception to the minimum size', () => {
    const panels = (text) => [...text.matchAll(/\{ mark: '([a-z]+)'(?:, (?:scheme|height|misuse|clearSpace): [^,}]+)*/g)].map((m) => m[0]);
    const english = panels(page(''));
    assert.ok(english.length >= 10);
    for (const dir of languages) {
      const text = page(dir);
      assert.match(text, /import BrandFigure from '[./]+components\/BrandFigure\.astro';/);
      assert.doesNotMatch(text, /<svg/, 'no mark is written into a page');
      assert.deepEqual(panels(text), english, `${dir || 'en'}: the same drawings as the English page`);
      assert.match(text, /16 px/, `${dir || 'en'}: the favicon's 16 px`);
      assert.match(text, /24 px/, `${dir || 'en'}: the minimum size`);
      assert.match(text, /Apache License 2\.0/, `${dir || 'en'}: the use of the marks by others`);
    }
  });

  test('the drawings measure the marks: the symbol’s ink lies inside its frame, and the wordmark’s first capital gives its minimum height', async () => {
    const ink = await inkBox(symbol);
    const frame = frameOf(symbol);
    assert.ok(ink.x > 0 && ink.y > 0 && ink.x + ink.width < frame.width && ink.y + ink.height < frame.height);
    const wordmark = read(repo, 'design/brand/wordmark.svg');
    const cap = (await inkBox(wordmark, { to: 0.25 })).height;
    assert.ok(cap > 0 && cap < frameOf(wordmark).height);
  });
});

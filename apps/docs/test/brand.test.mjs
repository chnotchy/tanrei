// What the site makes of the brand marks (src/lib/brand.mjs, design/brand/): the header's symbol, the icons and the
// social image, all derived from the marks' files — none drawn by hand, none left in public/.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import sharp from 'sharp';
import { ICO_SIZES, SOCIAL, TOUCH_ICON_SIZE, ico, icoOf, iconSvg, inlineMark, png, socialSvg } from '../src/lib/brand.mjs';

const repo = new URL('../../../', import.meta.url);
const docs = new URL('../', import.meta.url);
const read = (base, file) => fs.readFileSync(new URL(file, base), 'utf8');
const symbol = read(repo, 'design/brand/symbol.svg');
const symbolLight = read(repo, 'design/brand/generated/symbol.light.svg');
const wordmarkLight = read(repo, 'design/brand/generated/wordmark.light.svg');

describe('the header', () => {
  const header = read(docs, 'src/components/frame/Header.astro');
  const link = header.match(/<a slot="brand" class="tanrei-link docs-site-title"[^>]*>([\s\S]*?)<\/a>/);

  test('the link to the first page is the app bar’s brand in its default layout — one image, the symbol — named by the site’s name for assistive technology', () => {
    assert.ok(link, 'the header has the link to the first page in the bar’s brand slot, not in its navigation slot');
    assert.doesNotMatch(header, /<tanrei-app-bar[^>]*brand-layout=/, 'the header gives one image: the default layout');
    assert.match(link[0], /href=\{homeHref\(route\)\}/);
    assert.match(link[1], /<Fragment set:html=\{symbol\} \/>/, 'the symbol is drawn inline, so a token paints it');
    assert.match(link[1], /<span class="sr-only">\{route\.siteTitle\}<\/span>/, 'the link is named by the site’s name');
    assert.doesNotMatch(link[1].replace(/<span class="sr-only">[^<]*<\/span>/, ''), /siteTitle/, 'the name is not set as text beside the symbol');
  });

  test('the symbol holds its size before any stylesheet, hidden from assistive technology, in currentColor', () => {
    const mark = inlineMark(symbol, { width: 24, height: 24, class: 'docs-site-mark', 'aria-hidden': 'true', focusable: 'false' });
    assert.match(mark, /^<svg [^>]*viewBox="0 0 512 512" width="24" height="24" fill="none" class="docs-site-mark" aria-hidden="true" focusable="false">/);
    assert.match(mark, /fill="currentColor"/);
    assert.doesNotMatch(mark, /<!--/);
    assert.match(header, /inlineMark\(marks\.symbol, \{ width: 24, height: 24, class: 'docs-site-mark', 'aria-hidden': 'true', focusable: 'false' \}\)/);
  });

  test('the symbol is painted by the brand’s color and drawn at the brand’s size; the bar gives it its cell', () => {
    const css = read(docs, 'src/styles/frame.css');
    const rule = (selector) => css.match(new RegExp(`\\n  ${selector.replace(/[.[\]]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '';
    assert.match(rule('.docs-site-title'), /color: var\(--tanrei-comp-app-bar-brand-color\)/);
    assert.doesNotMatch(rule('.docs-site-title'), /min-inline-size/, 'the cell is the bar’s (APB-19)');
    assert.match(rule('.docs-site-title'), /--tanrei-comp-link-focused-container-shape: var\(--tanrei-comp-button-focused-container-shape\)/);
    assert.match(rule('.docs-site-mark'), /inline-size: var\(--tanrei-comp-app-bar-brand-size\)/);
    assert.match(rule('.docs-site-mark'), /block-size: var\(--tanrei-comp-app-bar-brand-size\)/);
  });
});

describe('the icons and the social image', () => {
  test('nothing of the brand is a file of public/: every icon is rendered from the marks', () => {
    for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png']) {
      assert.ok(!fs.existsSync(new URL(`public/${file}`, docs)), `public/${file} would shadow the one the build renders`);
      assert.ok(fs.existsSync(new URL(`src/pages/${file}.ts`, docs)), `src/pages/${file}.ts renders /${file}`);
    }
  });

  test('the head names each of them', () => {
    const config = read(docs, 'astro.config.mjs');
    assert.match(config, /favicon: '\/favicon\.svg'/);
    assert.match(config, /rel: 'icon', href: '\/favicon\.ico', sizes: '32x32'/);
    assert.match(config, /rel: 'apple-touch-icon', href: '\/apple-touch-icon\.png'/);
    assert.match(config, /property: 'og:image', content: new URL\('\/og\.png', site\)\.href/);
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

  test('the home-screen icon is opaque and square; the social image is the wordmark at 1200 × 630', async () => {
    const touch = await sharp(await png(iconSvg(symbolLight, { size: TOUCH_ICON_SIZE, background: '#ffffff' }))).stats();
    assert.equal(touch.isOpaque, true, 'a home screen draws a transparent icon on black');
    const meta = await sharp(await png(iconSvg(symbolLight, { size: TOUCH_ICON_SIZE, background: '#ffffff' }))).metadata();
    assert.deepEqual([meta.width, meta.height], [TOUCH_ICON_SIZE, TOUCH_ICON_SIZE]);
    const social = socialSvg(wordmarkLight, { background: '#ffffff' });
    assert.match(social, new RegExp(`^<svg [^>]*width="${SOCIAL.width}" height="${SOCIAL.height}"`));
    assert.match(social, /fill="#1b1b1b"/, 'the wordmark in the light scheme’s on-surface');
    const card = await sharp(await png(social)).metadata();
    assert.deepEqual([card.width, card.height], [SOCIAL.width, SOCIAL.height]);
  });
});

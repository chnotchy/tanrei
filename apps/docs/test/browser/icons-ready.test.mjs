// Icons are not drawn as their names while the icon font cannot draw (components/frame/Head.astro): the head sets the
// web package's switch, `--tanrei-icon-visibility: hidden`, before anything is drawn, and takes it off once the icon
// families draw a glyph as one ligature. While the font is held back, every glyph the package's stylesheets draw in the
// light DOM — a `.tanrei-icon` and the generated glyphs (a link's arrow, a breadcrumb's chevron…) — is not painted,
// even after the browser's block period of `font-display: block` (about 3 s) has run out; once the font arrives they are
// drawn, each in the box it held, so nothing moves. A font that fails to load leaves them hidden and says so in the
// console; a page whose script does not run never hides them.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/icons-ready.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the glyphs held back, took
// 8 s in CI.
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines();
/** The page: it writes bare `.tanrei-icon`s in its prose, and its links and frame generate glyphs of their own. */
const PAGE = '/foundations/icons/';
/** The icon families' files, the cut-down ones every page registers. */
const ICON_FILES = /material-symbols-[a-z]+\.subset\.generated\.[^/]*\.woff2$/;
/** Longer than the block period browsers give `font-display: block` (3 s in each engine). */
const PAST_BLOCK_PERIOD = 3500;
/** The site's cut-down file of its default icon family, by its address. */
const SITE_ICON_FILE = `/_astro/${fs.readdirSync(path.join(dist, '_astro')).find((file) => /^material-symbols-rounded\.subset\.generated\..*\.woff2$/.test(file))}`;

let host;
before(async () => {
  host = await serveDist(dist);
});
after(async () => {
  await host?.close();
});

/**
 * In the page: every glyph of the icon set drawn in the light DOM, as [what it is, its computed visibility, its box,
 * the visibility of what holds it]. A glyph inside something hidden for a reason of its own (a stage not yet defined)
 * is hidden by inheritance, and the switch is seen as a glyph hidden inside something visible.
 * A `.tanrei-icon` (its text or its `data-icon`) and a generated box whose content is a glyph name set in an icon
 * family. The head's probes are not glyphs of the page.
 */
const glyphs = () => {
  if (!document.body) return [];
  const icon = (style) => /^["']?(Material Symbols|Tanrei Test Icons)/.test(style.fontFamily);
  const out = [];
  for (const el of document.querySelectorAll('body *:not([data-docs-icon-probe])')) {
    const style = getComputedStyle(el);
    if (el.matches('.tanrei-icon') && icon(style) && style.display !== 'none') {
      const r = el.getBoundingClientRect();
      out.push([`${el.localName}.tanrei-icon "${el.textContent.trim() || el.getAttribute('data-icon')}"`, style.visibility, [r.x, r.y, r.width, r.height].map(Math.round).join(','), getComputedStyle(el.parentElement).visibility]);
    }
    for (const pseudo of ['::before', '::after']) {
      const generated = getComputedStyle(el, pseudo);
      const name = generated.content.match(/^"([a-z0-9_]+)"/)?.[1];
      if (name && icon(generated) && generated.display !== 'none') out.push([`${el.localName}${pseudo} "${name}"`, generated.visibility, '', style.visibility]);
    }
  }
  return out;
};

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    /**
     * Opens the page with the icon files answered by `answer(route)`; returns the page and what its console warned.
     *
     * The page's icon families are named, by its tokens, after a family of the test's own whose one face is `iconFile`
     * (the site's cut-down file, or a file that is not there): the site's own family would be drawn from a copy of
     * Material Symbols installed on the machine — Chromium does so once its face fails, WebKit even while it loads —
     * and the glyphs would be drawn, as they should, whatever the test held back. The style is added past the page's
     * policy, which allows no inline style, once the document is parsed.
     */
    async function open(answer, { iconFile, ...options } = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', bypassCSP: !!iconFile, ...options });
      if (iconFile) {
        await context.addInitScript((file) => {
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = `@font-face { font-family: 'Tanrei Test Icons'; font-display: block; font-weight: 300 500; src: url('${file}') format('woff2-variations'); }
              :root { --tanrei-sys-icon-family-unselected: 'Tanrei Test Icons'; --tanrei-sys-icon-family-selected: 'Tanrei Test Icons'; }`;
            document.head.append(style);
          });
        }, iconFile);
      }
      const page = await context.newPage();
      const warnings = [];
      page.on('pageerror', (error) => warnings.push(`pageerror: ${error.message}`));
      page.on('console', (message) => message.type() === 'warning' && warnings.push(message.text()));
      await page.route(ICON_FILES, answer);
      await page.goto(`${host.origin}${PAGE}`, { waitUntil: 'domcontentloaded' });
      return { context, page, warnings };
    }

    test('while the font is held back no glyph is painted, past the block period; once it arrives each is drawn in the box it held', LIMIT, async () => {
      const held = [];
      const { context, page } = await open((route) => held.push(route), { iconFile: SITE_ICON_FILE });
      try {
        // Waited out on purpose: what is asked is that the names stay unpainted after the browser's own block period.
        await page.waitForTimeout(PAST_BLOCK_PERIOD);
        assert.ok(held.length > 0, 'the page asked for an icon file');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-icon-visibility').trim()), 'hidden');
        const hidden = await page.evaluate(glyphs);
        assert.ok(hidden.filter(([what]) => what.includes('.tanrei-icon')).length >= 3, `bare icons on the page: ${hidden.map(([what]) => what).join('; ')}`);
        assert.ok(hidden.some(([what]) => what.includes('::')), `generated glyphs on the page: ${hidden.map(([what]) => what).join('; ')}`);
        assert.deepEqual(hidden.filter(([, visibility]) => visibility !== 'hidden'), [], 'glyphs painted while the font is held back');

        for (const route of held.splice(0)) await route.continue();
        await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-icon-visibility').trim() === '', null, { timeout: 15_000 });
        const drawn = await page.evaluate(glyphs);
        assert.deepEqual(drawn.filter(([, visibility, , holder]) => visibility !== holder), [], 'glyphs still hidden once the font has arrived');
        // Each in the box it held: hidden glyphs keep their room (CLS unchanged).
        assert.deepEqual(drawn.map(([what, , box]) => [what, box]), hidden.map(([what, , box]) => [what, box]));
        assert.equal(await page.locator('[data-docs-icon-probe]').count(), 0, 'the probes are taken away');
      } finally {
        await context.close();
      }
    });

    test('a font that fails to load leaves the glyphs hidden, and the page says so', LIMIT, async () => {
      const { context, page, warnings } = await open((route) => route.continue(), { iconFile: '/no-such-icon-font.woff2' });
      try {
        await page.waitForLoadState('load');
        const until = Date.now() + 15_000;
        while (!warnings.some((text) => text.includes('icon font cannot draw')) && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 100));
        assert.ok(warnings.some((text) => text.includes('icon font cannot draw')), `the console warned: ${warnings.join(' | ') || 'nothing'}`);
        const shown = await page.evaluate(glyphs);
        assert.deepEqual(shown.filter(([, visibility]) => visibility !== 'hidden'), [], 'glyphs painted as their names');
      } finally {
        await context.close();
      }
    });

    test('a page whose script does not run never hides them', LIMIT, async () => {
      const { context, page } = await open((route) => route.continue(), { javaScriptEnabled: false });
      try {
        await page.waitForLoadState('load');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-icon-visibility').trim()), '');
        const shown = await page.evaluate(glyphs);
        assert.ok(shown.length > 0, 'glyphs on the page');
        assert.deepEqual(shown.filter(([, visibility, , holder]) => visibility !== holder), [], 'glyphs hidden with no script to show them');
      } finally {
        await context.close();
      }
    });
  });
}

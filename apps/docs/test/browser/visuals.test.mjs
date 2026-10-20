// The docs' figure frame as the built site draws it (components/visuals/VisualFrame.astro, SystemSwitch.astro), on
// the first page that uses it, the button's:
//
// - its stage takes the same room before any element is defined as once they are, at a phone's width and a desktop's,
//   so nothing under it moves when its script arrives; and what it shows stands in one row;
// - it is drawn under the default system, and no preset's stylesheet is asked for with the page; choosing a preset in
//   its header loads that stylesheet once and draws the stage — and only the stage — with that system's tokens.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8'));
const NS = config.namespace;
const PREFIX = config.web.cssPrefix;
/** What a system resolves a token to in its light scheme, read from disk (the default system's files are at the top). */
const resolvedIn = (system, dotted) => {
  const file = system === NS ? `design/tokens/${NS}.light.tokens.json` : `design/tokens/${system}/${NS}.light.tokens.json`;
  return dotted.split('.').reduce((node, key) => node?.[key], JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'))).$value;
};
const rgb = (color) => {
  const [r, g, b] = color.components.map((c) => Math.round(c * 255));
  return (color.alpha ?? 1) < 1 ? `rgba(${r}, ${g}, ${b}, ${color.alpha})` : `rgb(${r}, ${g}, ${b})`;
};

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
let server;
let origin;
let browser;

before(async () => {
  server = http.createServer((request, response) => {
    let file = path.join(dist, decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

const PAGE = '/components/button/';
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const FIGURE = '[data-docs-visual]';

/** The first figure's boxes: its stage, its header, and the top of each element its canvas shows. */
const boxes = (page) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const box = (element) => element.getBoundingClientRect();
    return {
      stage: box(frame.querySelector('[data-docs-visual-stage]')).height,
      header: box(frame.querySelector('header')).height,
      tops: [...frame.querySelector('[data-docs-visual-canvas]').children].filter((child) => !child.matches('[data-docs-visual-overlay]')).map((child) => box(child).top),
    };
  }, FIGURE);

/** Settled: the figure's elements defined, the fonts in, and two frames drawn after. */
const settled = (page) =>
  page.evaluate(async (selector) => {
    const frame = document.querySelector(selector);
    const names = new Set([...frame.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')));
    await Promise.all([...names].map((name) => customElements.whenDefined(name)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, FIGURE);

describe('the figure frame on the button’s page', () => {
  for (const viewport of VIEWPORTS) {
    test(`at ${viewport.width}: the stage and the header take the same room before anything is defined as after, and the variants stand in one row`, async () => {
      // Without script nothing is defined: the room the page holds for the figure.
      const before = await browser.newContext({ viewport, javaScriptEnabled: false });
      const still = await before.newPage();
      await still.goto(`${origin}${PAGE}`);
      await still.evaluate(() => document.fonts.ready);
      const held = await boxes(still);
      await before.close();
      // The control in the header is not drawn where no script runs; held before definition, it is measured with script
      // held back, as a slow line delivers the page.
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route(/\.m?js(\?|$)/, async (route) => {
        await gate;
        await route.continue();
      });
      // The document is parsed (`interactive`) before its module scripts run: DOMContentLoaded waits for them.
      await page.goto(`${origin}${PAGE}`, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.readyState !== 'loading');
      await page.evaluate(() => document.fonts.ready);
      const parsed = await boxes(page);
      release();
      await settled(page);
      const drawn = await boxes(page);
      await context.close();
      assert.ok(Math.abs(drawn.stage - held.stage) < 0.5, `the stage holds ${held.stage}px before definition and takes ${drawn.stage}px once drawn`);
      assert.ok(Math.abs(drawn.stage - parsed.stage) < 0.5, `the stage holds ${parsed.stage}px while the script is held and takes ${drawn.stage}px once drawn`);
      assert.ok(Math.abs(drawn.header - parsed.header) < 0.5, `the header holds ${parsed.header}px while the script is held and takes ${drawn.header}px once drawn`);
      assert.equal(new Set(drawn.tops.map((top) => Math.round(top))).size, 1, `the variants stand in one row: tops ${drawn.tops.join(', ')}`);
    });
  }

  test('drawn under the default system; a preset’s stylesheet is loaded when it is chosen, once, and reaches the stage only', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    const sheets = [];
    page.on('request', (request) => {
      if (/\/systems?\/|m3-|cupertino/.test(new URL(request.url()).pathname) && request.resourceType() === 'stylesheet') sheets.push(new URL(request.url()).pathname);
    });
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    assert.deepEqual(sheets, [], 'no preset’s stylesheet is asked for with the page');

    const frame = page.locator(FIGURE).first();
    const stage = frame.locator('[data-docs-visual-stage]');
    assert.equal(await stage.getAttribute('data-tanrei-system'), null);
    const tabs = frame.locator('[data-docs-visual-system]');
    assert.equal(await tabs.evaluate((row) => row.value), NS);
    assert.deepEqual(await tabs.locator('tanrei-tab').evaluateAll((all) => all.map((tab) => tab.getAttribute('value'))).then((ids) => ids[0]), NS, 'the default system is the first tab');

    /** The value a token takes inside the stage, and on the page outside the figure. */
    const probe = (token) =>
      page.evaluate(
        ({ selector, property }) => {
          const read = (parent) => {
            const element = document.createElement('div');
            element.style.backgroundColor = `var(${property})`;
            parent.append(element);
            const value = getComputedStyle(element).backgroundColor;
            element.remove();
            return value;
          };
          return { inside: read(document.querySelector(selector).querySelector('[data-docs-visual-canvas]')), outside: read(document.querySelector('main')) };
        },
        { selector: FIGURE, property: `${PREFIX}-${token.split('.').slice(1).join('-')}` },
      );
    const token = `${NS}.comp.button.filled.container.color`;
    const presets = await tabs.locator('tanrei-tab').evaluateAll((all) => all.map((tab) => tab.getAttribute('value')).slice(1));
    const preset = presets.find((id) => rgb(resolvedIn(id, token)) !== rgb(resolvedIn(NS, token)));
    assert.ok(preset, 'a preset draws the filled button in another color than the default system');
    assert.equal((await probe(token)).inside, rgb(resolvedIn(NS, token)));

    await tabs.locator(`tanrei-tab[value="${preset}"]`).click();
    await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-docs-visual-stage]').hasAttribute('data-tanrei-system'), FIGURE);
    assert.equal(await stage.getAttribute('data-tanrei-system'), preset);
    assert.equal(sheets.length, 1, `one stylesheet is asked for: ${sheets.join(', ')}`);
    assert.match(sheets[0], new RegExp(`${preset}[^/]*\\.css$`));
    const under = await probe(token);
    assert.equal(under.inside, rgb(resolvedIn(preset, token)), 'the stage is drawn with the preset’s tokens');
    assert.equal(under.outside, rgb(resolvedIn(NS, token)), 'the page outside the figure is not');

    // Back to the default system, and to the preset again: drawn at once, its stylesheet not asked for a second time.
    await tabs.locator(`tanrei-tab[value="${NS}"]`).click();
    await page.waitForFunction((selector) => !document.querySelector(selector).querySelector('[data-docs-visual-stage]').hasAttribute('data-tanrei-system'), FIGURE);
    assert.equal((await probe(token)).inside, rgb(resolvedIn(NS, token)));
    await tabs.locator(`tanrei-tab[value="${preset}"]`).click();
    await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-docs-visual-stage]').hasAttribute('data-tanrei-system'), FIGURE);
    assert.equal(sheets.length, 1, 'the stylesheet is loaded once for the page');
    await context.close();
  });
});

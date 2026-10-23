// The state matrix as the built site draws it (components/visuals/StateMatrix.astro, lib/visuals/pseudo-states.ts), on
// the first page that draws one, the button's:
//
// - each cell is drawn with its state's tokens: the container and the label of every variant, at rest and selected, in
//   every state a column shows, computed in the cell equal to what the default system resolves the state's tokens to —
//   so a component whose state rules the figure fails to hold fails here;
// - under a preset chosen in the figure's header, the cells are held again and drawn with that system's tokens;
// - the table takes the same room before its elements are defined (its scripts held back) as once they are, at a
//   phone's width and a desktop's, so nothing under it moves when they arrive;
// - nothing in a cell is reached by Tab or by assistive technology, and each cell says in words what it shows.
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
/** What a system resolves a token to in its light scheme, read from disk (the default system's files are at the top). */
const resolvedIn = (system, dotted) => {
  const file = system === NS ? `design/tokens/${NS}.light.tokens.json` : `design/tokens/${system}/${NS}.light.tokens.json`;
  return dotted.split('.').reduce((node, key) => node?.[key], JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8')))?.$value;
};
const rgb = (color) => {
  const [r, g, b] = color.components.map((c) => Math.round(c * 255));
  return (color.alpha ?? 1) < 1 ? `rgba(${r}, ${g}, ${b}, ${color.alpha})` : `rgb(${r}, ${g}, ${b})`;
};

/** A computed color as `rgb()`/`rgba()`: a color mixed in sRGB computes to `color(srgb r g b / a)`. */
const computedRgb = (color) => {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(color);
  return srgb ? rgb({ components: srgb.slice(1, 4).map(Number), alpha: srgb[4] === undefined ? 1 : Number(srgb[4]) }) : color;
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
const TABLE = '[data-docs-state-matrix]';

/** Settled: the matrix's figure in view, its elements defined, every cell that holds a state held, and a frame drawn after. */
const settled = (page) =>
  page.evaluate(async (selector) => {
    const table = document.querySelector(selector);
    const frame = table.closest('[data-example]');
    frame.scrollIntoView({ block: 'center' });
    const names = new Set([...frame.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')));
    await Promise.all([...names].map((name) => customElements.whenDefined(name)));
    await document.fonts.ready;
    await new Promise((resolve) => {
      const held = () => [...table.querySelectorAll('[data-docs-hold] > *')].every((element) => element.hasAttribute('data-docs-state'));
      const wait = () => (held() ? resolve() : requestAnimationFrame(wait));
      wait();
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, TABLE);

/** Each cell: its row's value and props, its column's state, and the colors its element's container and label compute to. */
const cells = (page) =>
  page.evaluate((selector) => {
    const table = document.querySelector(selector);
    const states = [...table.querySelectorAll('thead th')].slice(1).map((th) => th.textContent.trim());
    return [...table.querySelectorAll('tbody tr')].flatMap((row) => {
      const codes = row.querySelector('th').textContent.trim().split(' · ');
      return [...row.querySelectorAll('td')].map((td, column) => {
        const element = td.querySelector('[data-docs-hold] > *');
        const button = element.shadowRoot.querySelector('button');
        const style = getComputedStyle(button);
        return { variant: codes[0], selected: codes.includes('selected'), column: states[column], state: element.parentElement.dataset.docsHold || (element.hasAttribute('disabled') ? 'disabled' : 'enabled'), background: style.backgroundColor, color: style.color };
      });
    });
  }, TABLE);

/** The tokens a cell is drawn with: `comp.button.<variant>[.<state>][.selected].<part>.color`. */
const tokenOf = (cell, part) => `${NS}.comp.button.${cell.variant}${cell.state === 'enabled' ? '' : `.${cell.state}`}${cell.selected ? '.selected' : ''}.${part}.color`;

describe('the state matrix on the button’s page', () => {
  test('every cell is drawn with its state’s tokens: the container and the label, of every variant, at rest and selected', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    const drawn = await cells(page);
    await context.close();
    const states = new Set(drawn.map((cell) => cell.state));
    for (const state of ['enabled', 'disabled', 'hovered', 'focused', 'pressed']) assert.ok(states.has(state), `a column shows ${state}`);
    assert.ok(drawn.some((cell) => cell.selected), 'a row is selected');
    for (const cell of drawn) {
      for (const [part, computed] of [['container', cell.background], ['label', cell.color]]) {
        const value = resolvedIn(NS, tokenOf(cell, part));
        assert.ok(value, `${tokenOf(cell, part)} is resolved`);
        assert.equal(computedRgb(computed), rgb(value), `${cell.variant}${cell.selected ? ' selected' : ''}, ${cell.state}: the ${part} is ${tokenOf(cell, part)}`);
      }
    }
    // The states differ where the tokens do: a hold that reached nothing would leave a held cell at rest.
    for (const state of ['hovered', 'focused', 'pressed']) {
      const differs = drawn.filter((cell) => cell.state === state && rgb(resolvedIn(NS, tokenOf(cell, 'container'))) !== rgb(resolvedIn(NS, tokenOf({ ...cell, state: 'enabled' }, 'container'))));
      assert.ok(differs.length > 0, `the default system draws ${state} apart from rest in some cell`);
    }
  });

  test('under a preset chosen in the header, every cell is held again and drawn with that system’s tokens', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    const presets = await page.locator('tanrei-menu[anchor="docs-system"] tanrei-menu-radio-item').evaluateAll((all) => all.map((item) => item.getAttribute('value')).slice(1));
    const token = `${NS}.comp.button.filled.hovered.container.color`;
    const preset = presets.find((id) => resolvedIn(id, token) && rgb(resolvedIn(id, token)) !== rgb(resolvedIn(NS, token)));
    assert.ok(preset, 'a preset draws the hovered filled button in another color than the default system');
    await page.locator('#docs-system').click();
    await page.locator(`tanrei-menu[anchor="docs-system"] tanrei-menu-radio-item[value="${preset}"]`).click();
    await page.waitForFunction((selector) => document.querySelector(selector).closest('[data-example]').querySelector('[data-example-stage]').getAttribute('data-tanrei-system'), TABLE);
    await settled(page);
    const drawn = await cells(page);
    await context.close();
    for (const cell of drawn.filter((each) => each.state !== 'disabled')) {
      const value = resolvedIn(preset, tokenOf(cell, 'container'));
      if (!value) continue;
      assert.equal(computedRgb(cell.background), rgb(value), `${preset}: ${cell.variant}${cell.selected ? ' selected' : ''}, ${cell.state}: the container is ${tokenOf(cell, 'container')}`);
    }
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`at ${viewport.width}: the table takes the same room before its elements are defined as once they are drawn`, async () => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route(/\.m?js(\?|$)/, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(`${origin}${PAGE}`, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.readyState !== 'loading');
      // No face still loading (WebKit and Firefox resolve `document.fonts.ready` only once the held scripts have run).
      await page.waitForFunction(() => [...document.fonts].every((face) => face.status !== 'loading'));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const measure = () =>
        page.evaluate((selector) => {
          const table = document.querySelector(selector);
          const box = (element) => element.getBoundingClientRect();
          const stage = box(table.closest('[data-example-stage]'));
          return { stage: stage.height, cells: [...table.querySelectorAll('td, th')].map((cell) => [box(cell).left - stage.left, box(cell).top - stage.top, box(cell).width, box(cell).height]) };
        }, TABLE);
      const parsed = await measure();
      release();
      await settled(page);
      const drawn = await measure();
      await context.close();
      assert.ok(Math.abs(drawn.stage - parsed.stage) < 0.5, `the stage holds ${parsed.stage}px while the scripts are held and takes ${drawn.stage}px once drawn`);
      assert.equal(drawn.cells.length, parsed.cells.length);
      for (const [index, cell] of drawn.cells.entries()) {
        cell.forEach((value, at) => assert.ok(Math.abs(value - parsed.cells[index][at]) < 0.5, `cell ${index}: ${parsed.cells[index]} while held, ${cell} once drawn`));
      }
    });
  }

  test('nothing in a cell takes the focus or is exposed; each cell says what it shows', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    const facts = await page.evaluate((selector) => {
      const table = document.querySelector(selector);
      return [...table.querySelectorAll('tbody td')].map((td) => {
        const holder = td.querySelector('[data-docs-hold]');
        return { inert: holder.inert, hidden: holder.getAttribute('aria-hidden'), words: td.querySelector('.docs-state-words').textContent.trim() };
      });
    }, TABLE);
    const snapshot = await page.locator(TABLE).ariaSnapshot();
    await context.close();
    for (const cell of facts) {
      assert.equal(cell.inert, true);
      assert.equal(cell.hidden, 'true');
      assert.match(cell.words, /^\S.*, \S/, `a cell says its row and its state: «${cell.words}»`);
    }
    assert.doesNotMatch(snapshot, /- button/, 'no button is exposed in the matrix');
  });
});

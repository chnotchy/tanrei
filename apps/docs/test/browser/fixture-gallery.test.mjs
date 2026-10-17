// Every component page's fixtures, as a reader sees them: the Specs tab has a gallery of fixtures, with a stage for each
// fixture of the spec; and every fixture it draws can be seen whole, at a desktop's width and at a phone's — its stage
// stands inside the page's column and the window, and what the fixture draws stands inside its stage (an element as
// wide as a layout is made narrower with its stage, a window is scaled down with it). The page itself never scrolls
// sideways.
//
// It was written after the fixtures stood in a table, where at 390 wide the drawing of 1953 of 2390 fixtures began
// past the table's visible box (the reader had to scroll the table sideways to find it), and where the drawing of
// nine components was missing altogether.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port, as previews.test.mjs does. It asks where each stage stands, not what
// a window draws inside it, and does not wait for a window to load.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
const repo = path.join(docs, '../..');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// Every component page of the root language, and the fixtures its spec lists.
const pages = fs
  .readdirSync(path.join(dist, 'components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(repo, 'specs', `${entry.name}.spec.json`)))
  .map((entry) => ({ name: entry.name, fixtures: JSON.parse(fs.readFileSync(path.join(repo, 'specs', `${entry.name}.spec.json`), 'utf8')).fixtures.map((f) => f.id) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
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

/**
 * Runs IN THE PAGE: the gallery's stages, and for each drawn one what stands outside where it must stand. Measured once
 * the elements are defined and every stage is laid out.
 */
async function measure() {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const gallery = document.querySelector('[data-fixture-gallery]');
  if (!gallery) return { gallery: false };
  const laidOut = document.createElement('style');
  laidOut.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.append(laidOut);
  const tags = new Set([...gallery.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')));
  await Promise.race([Promise.all([...tags].map((n) => customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 5000))]);
  await Promise.all([...gallery.querySelectorAll('*')].map((e) => e.updateComplete).filter(Boolean));
  await document.fonts.ready;
  for (let k = 0; k < 4; k++) await frame();

  const column = gallery.getBoundingClientRect();
  const outside = (inner, outer, slack = 1) => inner.left < outer.left - slack || inner.right > outer.right + slack || inner.top < outer.top - slack || inner.bottom > outer.bottom + slack;
  const stages = [...gallery.querySelectorAll('.docs-stage')];
  const found = [];
  for (const stage of stages) {
    const id = stage.dataset.fixtureId;
    const box = stage.getBoundingClientRect();
    if (box.left < -1 || box.right > innerWidth + 1) found.push(`${id}: its stage stands outside the window (${Math.round(box.left)}…${Math.round(box.right)} of ${innerWidth})`);
    else if (outside(box, { left: column.left, right: column.right, top: box.top, bottom: box.bottom })) found.push(`${id}: its stage stands outside the page's column`);
    if (stage.dataset.drawn === undefined) continue;
    const area = stage.querySelector('.docs-stage-box').getBoundingClientRect();
    const drawn = stage.dataset.stage === 'window' ? stage.querySelector('.docs-window') : stage.querySelector('.fixture-element > *');
    if (!drawn) {
      found.push(`${id}: nothing is drawn on its stage`);
      continue;
    }
    const r = drawn.getBoundingClientRect();
    // One length drawn and the other none: it fills a length its stage does not give it. No width is always that (a
    // divider, a linear indicator, a slider drawn 0 wide); no height is that unless nothing inside it is drawn either
    // (a Tab view without its panel draws nothing, by design).
    const inside = (root) => [...root.querySelectorAll('*')].some((n) => {
      const q = n.getBoundingClientRect();
      return (q.width >= 1 && q.height >= 1) || (n.shadowRoot && inside(n.shadowRoot));
    });
    const empty = !inside(drawn) && !(drawn.shadowRoot && inside(drawn.shadowRoot));
    if ((r.width < 1 && r.height >= 1) || (r.height < 1 && r.width >= 1 && !empty)) found.push(`${id}: what it draws has no length (${Math.round(r.width)} × ${Math.round(r.height)})`);
    else if (outside(r, area)) found.push(`${id}: what it draws is cut by its stage (${Math.round(r.width)} × ${Math.round(r.height)} in ${Math.round(area.width)} × ${Math.round(area.height)})`);
  }
  laidOut.remove();
  return {
    gallery: true,
    ids: stages.map((stage) => stage.dataset.fixtureId),
    drawn: stages.filter((stage) => stage.dataset.drawn !== undefined).length,
    sideways: document.scrollingElement.scrollWidth - innerWidth,
    found,
  };
}

describe('every component page shows its fixtures, each whole, on a stage of its own', { concurrency: 4 }, () => {
  test('there are component pages', () => assert.ok(pages.length > 80, `found ${pages.length} component pages`));
  for (const { name, fixtures } of pages) {
    test(name, async () => {
      const problems = [];
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          await page.goto(`${origin}/components/${name}/`, { waitUntil: 'load' });
          const result = await page.evaluate(measure);
          const at = `${viewport.width}`;
          if (!result.gallery) {
            problems.push(`${at}: the page has no gallery of fixtures`);
            continue;
          }
          if (JSON.stringify([...result.ids].sort()) !== JSON.stringify([...fixtures].sort())) problems.push(`${at}: the stages are not the spec's fixtures (${result.ids.length} stages, ${fixtures.length} fixtures)`);
          if (result.sideways > 1) problems.push(`${at}: the page scrolls sideways by ${result.sideways}px`);
          for (const line of result.found) problems.push(`${at}: ${line}`);
        } finally {
          await context.close();
        }
      }
      assert.deepEqual(problems, [], `${name}:\n  ${problems.join('\n  ')}`);
    });
  }
});

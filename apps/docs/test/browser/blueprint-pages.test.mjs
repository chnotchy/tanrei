// Every anatomy and measure figure of the built site (components/visuals/AnatomyDiagram.astro, MeasureDiagram.astro),
// on every page of the root language that draws one, in Chromium (blueprint.test.mjs asks the rest of the button's
// page in each engine):
//
// - no figure makes anything modal over the page: a figure is a picture, and a modal fixture (`showModal()`) drawn in
//   the page would cover the whole site and hold its focus;
// - an anatomy figure numbers at least one part, each number once and as the spec numbers it, inside the figure and
//   clear of every other number;
// - a measure figure draws each length of its table as long as its token resolves to, to half a pixel, or draws no
//   line for it and says in the table what the component draws instead — never a line of a length the component does
//   not have. The lengths not drawn are printed: each is a place where a component and its tokens part.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the figures of every page,
// took 122 s in CI.
const LIMIT = { timeout: 360_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const specs = path.join(docs, '../../specs');
const NEAR = 0.5;

// The root language's component pages that draw a figure, read from the built HTML.
const components = path.join(dist, 'components');
const pages = fs
  .readdirSync(components, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(components, entry.name, 'index.html')))
  .map((entry) => entry.name)
  .filter((name) => /data-blueprint-figure/.test(fs.readFileSync(path.join(components, name, 'index.html'), 'utf8')))
  .sort();

let host;
let browser;
before(async () => {
  host = await serveDist(dist);
  browser = await launch();
});
after(async () => {
  await browser?.close();
  await host?.close();
});

test('the figures are drawn on the pages of the components whose specs say where the web draws their parts', () => {
  assert.ok(pages.includes('button') && pages.includes('tabs') && pages.includes('slider'), `pages with a figure: ${pages.join(', ')}`);
});

test('every figure: each number once, inside and clear; each line its token’s length, or none and the table says why', LIMIT, async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const notDrawn = [];
  for (const name of pages) {
    const component = fs.readdirSync(specs).includes(`${name}.spec.json`) ? name : null;
    await page.goto(`${host.origin}/components/${name}/`);
    await page.waitForLoadState('load');
    // Each figure brought into view and given 15 s to be drawn, with two frames drawn on the way (bounded: launch.mjs).
    const figures = [];
    const count = await page.locator('[data-blueprint-figure]').count();
    for (let at = 0; at < count; at += 1) {
      const deadline = Date.now() + 15_000;
      const drawn = ({ at, left, scroll }) => {
        const frame = document.querySelectorAll('[data-blueprint-figure]')[at];
        if (scroll) frame.scrollIntoView({ block: 'center' });
        const until = Date.now() + left;
        const done = () => frame.querySelector('[data-example-overlay][data-drawn]:not([data-drawing])');
        return (async () => {
          while (!done() && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 50));
        })();
      };
      await page.evaluate(drawn, { at, left: deadline - Date.now(), scroll: true });
      await settlePage(page, { fonts: false });
      await page.evaluate(drawn, { at, left: Math.max(0, deadline - Date.now()), scroll: false });
      figures.push(await page.evaluate((at) => {
        const frame = document.querySelectorAll('[data-blueprint-figure]')[at];
        const done = () => frame.querySelector('[data-example-overlay][data-drawn]:not([data-drawing])');
        // A figure is a picture: nothing of it is modal over the page (a modal fixture is drawn in a window of its own,
        // in the gallery, and stands under no figure). `:modal` is looked for in every shadow tree, where a dialog is.
        const modal = [];
        const walk = (root) => {
          for (const element of root.querySelectorAll('*')) {
            if (element.matches(':modal')) modal.push(element.getRootNode().host?.localName ?? element.localName);
            if (element.shadowRoot) walk(element.shadowRoot);
          }
        };
        walk(document);
        const overlay = frame.querySelector('[data-example-overlay]').getBoundingClientRect();
        const box = (element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left - overlay.left, top: r.top - overlay.top, right: r.right - overlay.left, bottom: r.bottom - overlay.top };
        };
        return {
          kind: frame.dataset.blueprintFigure,
          drawn: Boolean(done()),
          modal,
          room: { width: overlay.width, height: overlay.height },
          markers: [...frame.querySelectorAll('.docs-blueprint-marker')].map((marker) => ({ n: Number(marker.dataset.n), part: marker.dataset.part, box: box(marker) })),
          rows: [...frame.querySelectorAll('[data-measure-row]')].map((row) => ({ token: row.dataset.measureRow, drawn: row.dataset.drawn, measured: Number(row.dataset.measured), value: Number(row.dataset.value), note: row.querySelector('[data-measure-note]').hidden ? '' : row.querySelector('[data-measure-note]').textContent })),
          lines: [...frame.querySelectorAll('.docs-blueprint-length')].map((label) => ({ token: label.dataset.token, value: Number(label.dataset.value), measured: Number(label.dataset.measured) })),
        };
      }, at));
    }
    assert.ok(figures.length > 0, `${name}: a figure`);
    const anatomy = component ? JSON.parse(fs.readFileSync(path.join(specs, `${component}.spec.json`), 'utf8')).anatomy.map((part) => part.id) : [];
    for (const figure of figures) {
      assert.ok(figure.drawn, `${name}: the ${figure.kind} figure is drawn`);
      assert.deepEqual(figure.modal, [], `${name}: the ${figure.kind} figure makes nothing modal over the page`);
      if (figure.kind === 'anatomy') {
        assert.ok(figure.markers.length > 0, `${name}: a part is numbered`);
        assert.equal(new Set(figure.markers.map((marker) => marker.n)).size, figure.markers.length, `${name}: each number once`);
        for (const marker of figure.markers) {
          if (anatomy.length) assert.equal(anatomy[marker.n - 1], marker.part, `${name}: number ${marker.n} is the spec's ${marker.n}th part`);
          assert.ok(marker.box.left >= -NEAR && marker.box.top >= -NEAR && marker.box.right <= figure.room.width + NEAR && marker.box.bottom <= figure.room.height + NEAR, `${name}: number ${marker.n} is inside the figure`);
        }
        for (const [i, a] of figure.markers.entries()) {
          for (const b of figure.markers.slice(i + 1)) {
            const apart = a.box.right <= b.box.left + NEAR || b.box.right <= a.box.left + NEAR || a.box.bottom <= b.box.top + NEAR || b.box.bottom <= a.box.top + NEAR;
            assert.ok(apart, `${name}: numbers ${a.n} and ${b.n} do not overlap`);
          }
        }
      } else {
        assert.ok(figure.rows.length > 0, `${name}: a length`);
        for (const row of figure.rows) {
          const line = figure.lines.find((candidate) => candidate.token === row.token);
          if (row.drawn === 'true') {
            assert.ok(line, `${name}: ${row.token} has its line`);
            assert.ok(Math.abs(line.measured - line.value) <= NEAR, `${name}: ${row.token} drawn ${line.measured}px, its token ${line.value}px`);
          } else {
            assert.equal(line, undefined, `${name}: ${row.token} is not drawn`);
            assert.ok(row.note.trim(), `${name}: the table says why ${row.token} is not drawn`);
            notDrawn.push(`${name}: ${row.token} — the token ${row.value}px, the component ${Number.isFinite(row.measured) ? `${row.measured}px` : 'no such box'}`);
          }
        }
        assert.equal(figure.lines.length, figure.rows.filter((row) => row.drawn === 'true').length, `${name}: a line for each length drawn, and no other`);
      }
    }
  }
  assert.deepEqual(errors, [], 'no script failed');
  if (notDrawn.length) console.log(`Lengths not drawn, where a component draws another length than its token's:\n  ${notDrawn.join('\n  ')}`);
  await context.close();
});

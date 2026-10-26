// The anatomy and measure figures as the built site draws them (components/visuals/AnatomyDiagram.astro,
// MeasureDiagram.astro, lib/visuals/blueprint.ts), on the button's page, in each engine:
//
// - the anatomy figure numbers every part the fixture draws, each number once, in the spec's order, inside the figure
//   and clear of every other number, with a leader to its part; the focus ring is drawn as far out as the component
//   draws it (the system's offset and strokes, read from its tokens);
// - the measure figure draws every length of its table, and each drawn line is as long as its token says, to half a
//   pixel: measured on the component, compared with the value the default system's tokens resolve to on disk;
// - on a page that reads right to left the figures are mirrored: a part at the start stands at the right;
// - under a preset chosen in the header, the lines are drawn again, with that system's values;
// - in the dark scheme the numbers are drawn with the dark scheme's badge color, and under forced colors (Chromium,
//   the engine that emulates them) with the system's text color;
// - the figure takes the same room before its elements are defined as once it is drawn.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/blueprint.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8'));
const NS = config.namespace;
/** A token as a system resolves it in a context, read from disk (the default system's files are at the top). */
const resolvedIn = (system, dotted, context = 'light') => {
  const file = system === NS ? `design/tokens/${NS}.${context}.tokens.json` : `design/tokens/${system}/${NS}.${context}.tokens.json`;
  return dotted.split('.').reduce((node, key) => node?.[key], JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8')))?.$value;
};
const rgb = (color) => {
  const [r, g, b] = color.components.map((c) => Math.round(c * 255));
  return (color.alpha ?? 1) < 1 ? `rgba(${r}, ${g}, ${b}, ${color.alpha})` : `rgb(${r}, ${g}, ${b})`;
};

const ENGINES = engines('chromium,firefox,webkit');
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

const PAGE = '/components/button/';
const ANATOMY = '[data-blueprint-figure="anatomy"]';
const MEASURE = '[data-blueprint-figure="measure"]';
const NEAR = 0.5;

/** The figure in view and drawn, with no drawing on its way. */
const drawn = (page, selector) =>
  page.evaluate(async (selector) => {
    const frame = document.querySelector(selector);
    frame.scrollIntoView({ block: 'center' });
    const deadline = Date.now() + 15_000;
    const done = () => frame.querySelector('[data-example-overlay][data-drawn]:not([data-drawing])');
    await document.fonts.ready;
    while (!done() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    while (!done() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    if (!done()) throw new Error(`${selector} was not drawn`);
  }, selector);

/** What the anatomy figure drew: each number, where it stands, its leader, and the ring. */
const anatomy = (page) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const overlay = frame.querySelector('[data-example-overlay]').getBoundingClientRect();
    const box = (element) => {
      const r = element.getBoundingClientRect();
      return { left: r.left - overlay.left, top: r.top - overlay.top, right: r.right - overlay.left, bottom: r.bottom - overlay.top };
    };
    const host = frame.querySelector('tanrei-button');
    const container = host.shadowRoot.querySelector('[part~="container"]');
    const ring = frame.querySelector('.docs-blueprint-lines rect.ring');
    return {
      room: { width: overlay.width, height: overlay.height },
      markers: [...frame.querySelectorAll('.docs-blueprint-marker')].map((marker) => ({ n: Number(marker.dataset.n), part: marker.dataset.part, text: marker.textContent, band: marker.dataset.band, box: box(marker) })),
      leaders: frame.querySelectorAll('.docs-blueprint-lines line.leader').length,
      container: box(container),
      ring: ring && { x: Number(ring.getAttribute('x')), y: Number(ring.getAttribute('y')), width: Number(ring.getAttribute('width')), height: Number(ring.getAttribute('height')) },
      background: getComputedStyle(frame.querySelector('.docs-blueprint-marker')).backgroundColor,
      leader: getComputedStyle(frame.querySelector('.docs-blueprint-lines line.leader')).stroke,
      direction: getComputedStyle(host).direction,
    };
  }, ANATOMY);

/** What the measure figure drew: each row of its table, and each drawn line's label. */
const measures = (page) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const overlay = frame.querySelector('[data-example-overlay]').getBoundingClientRect();
    const container = frame.querySelector('tanrei-button').shadowRoot.querySelector('[part~="container"]').getBoundingClientRect();
    return {
      rows: [...frame.querySelectorAll('[data-measure-row]')].map((row) => ({ token: row.dataset.measureRow, drawn: row.dataset.drawn, value: row.querySelector('[data-measure-value]').textContent.trim(), note: row.querySelector('[data-measure-note]').hidden })),
      lines: [...frame.querySelectorAll('.docs-blueprint-length')].map((label) => {
        const r = label.getBoundingClientRect();
        return { token: label.dataset.token, axis: label.dataset.axis, value: Number(label.dataset.value), measured: Number(label.dataset.measured), x: (r.left + r.right) / 2 - overlay.left };
      }),
      centre: (container.left + container.right) / 2 - overlay.left,
    };
  }, MEASURE);

const overlaps = (a, b) => a.left < b.right - NEAR && b.left < a.right - NEAR && a.top < b.bottom - NEAR && b.top < a.bottom - NEAR;

for (const engine of ENGINES) {
  describe(`the anatomy and measure figures in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (url = PAGE, options = {}) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light', ...options });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await page.waitForLoadState('load');
      return { context, page };
    };

    test('the anatomy figure numbers each part the fixture draws, once, inside the figure and clear of the others, with a leader to it', async () => {
      const { context, page } = await open();
      await drawn(page, ANATOMY);
      const figure = await anatomy(page);
      const spec = JSON.parse(fs.readFileSync(path.join(repo, 'specs/button.spec.json'), 'utf8'));
      // The filled button with its icon draws every part: its container, label, icon, the edge its outline is drawn at,
      // and its focus ring.
      assert.deepEqual(
        figure.markers.map(({ n, part, text }) => [n, part, text]).sort((a, b) => a[0] - b[0]),
        spec.anatomy.map((part, index) => [index + 1, part.id, String(index + 1)]),
      );
      assert.equal(figure.leaders, figure.markers.length, 'a leader for each number');
      for (const marker of figure.markers) {
        assert.ok(marker.box.left >= -NEAR && marker.box.top >= -NEAR && marker.box.right <= figure.room.width + NEAR && marker.box.bottom <= figure.room.height + NEAR, `number ${marker.n} is inside the figure`);
        assert.ok(marker.band === 'top' ? marker.box.bottom <= figure.container.top : marker.box.top >= figure.container.bottom, `number ${marker.n} stands in its band, off the component`);
      }
      for (const [i, a] of figure.markers.entries()) for (const b of figure.markers.slice(i + 1)) assert.ok(!overlaps(a.box, b.box), `numbers ${a.n} and ${b.n} do not overlap`);
      // The focus ring: the system's offset, then its inner and outer strokes, around the container.
      const reach = ['offset', 'inner-width', 'outer-width'].reduce((sum, key) => sum + resolvedIn(NS, `${NS}.sys.focus.${key}`).value, 0);
      assert.ok(Math.abs(figure.ring.x - (figure.container.left - reach)) <= NEAR && Math.abs(figure.ring.width - (figure.container.right - figure.container.left + 2 * reach)) <= NEAR, 'the ring is as far out as the button draws its focus indicator');
      assert.ok(Math.abs(figure.ring.height - (figure.container.bottom - figure.container.top + 2 * reach)) <= NEAR);
      await context.close();
    });

    test('the measure figure draws every length of its table, each as long as its token resolves to', async () => {
      const { context, page } = await open();
      await drawn(page, MEASURE);
      const figure = await measures(page);
      assert.ok(figure.rows.length >= 5, 'the button’s paddings, gap, height and icon size');
      for (const row of figure.rows) {
        const value = resolvedIn(NS, row.token).value;
        assert.equal(row.drawn, 'true', `${row.token} is drawn on the button`);
        assert.equal(row.note, true, `${row.token}: no note`);
        assert.equal(Number(row.value), value, `${row.token}: the table says the default system's value`);
        const line = figure.lines.find((candidate) => candidate.token === row.token);
        assert.ok(line, `${row.token} has its line`);
        assert.equal(line.value, value, `${row.token}: labelled with the value its token resolves to`);
        assert.ok(Math.abs(line.measured - value) <= NEAR, `${row.token}: drawn ${line.measured}px, the token says ${value}px`);
      }
      await context.close();
    });

    test('on a page that reads right to left, the figures are mirrored: the start stands at the right', async () => {
      for (const [url, rtl] of [[PAGE, false], ['/ar/components/button/', true]]) {
        const { context, page } = await open(url);
        await drawn(page, ANATOMY);
        const figure = await anatomy(page);
        assert.equal(figure.direction, rtl ? 'rtl' : 'ltr');
        const icon = figure.markers.find((marker) => marker.part === 'icon');
        const centre = (figure.container.left + figure.container.right) / 2;
        const iconAt = (icon.box.left + icon.box.right) / 2;
        assert.ok(rtl ? iconAt > centre : iconAt < centre, `${url}: the leading icon's number stands at the ${rtl ? 'right' : 'left'}`);
        await drawn(page, MEASURE);
        const lengths = await measures(page);
        const start = lengths.lines.find((line) => line.axis === 'padding-start');
        assert.ok(rtl ? start.x > lengths.centre : start.x < lengths.centre, `${url}: the start padding is drawn at the ${rtl ? 'right' : 'left'}`);
        for (const line of lengths.lines) assert.ok(Math.abs(line.measured - line.value) <= NEAR, `${url}: ${line.token}`);
        await context.close();
      }
    });

    test('under a preset chosen in the header, the lines are drawn again with that system’s values', async () => {
      const { context, page } = await open();
      await drawn(page, MEASURE);
      const presets = await page.locator('tanrei-menu[anchor="docs-system"] tanrei-menu-radio-item').evaluateAll((all) => all.map((item) => item.getAttribute('value')).slice(1));
      const [preset] = presets;
      await page.locator('#docs-system').click();
      await page.locator(`tanrei-menu[anchor="docs-system"] tanrei-menu-radio-item[value="${preset}"]`).click();
      await page.waitForFunction(({ selector, preset }) => document.querySelector(selector).querySelector('[data-example-stage]').getAttribute('data-tanrei-system') === preset, { selector: MEASURE, preset });
      await drawn(page, MEASURE);
      await page.waitForFunction((selector) => !document.querySelector(selector).querySelector('[data-example-overlay][data-drawing]'), MEASURE);
      const figure = await measures(page);
      for (const row of figure.rows) {
        const value = resolvedIn(preset, row.token)?.value;
        assert.equal(Number(row.value), value, `${preset}: ${row.token} in the table`);
        const line = figure.lines.find((candidate) => candidate.token === row.token);
        if (row.drawn === 'true') assert.ok(line && Math.abs(line.measured - value) <= NEAR && line.value === value, `${preset}: ${row.token}`);
        else assert.equal(row.note, false, `${preset}: ${row.token} is not drawn, and the table says why`);
      }
      await context.close();
    });

    test('in the dark scheme the numbers take the dark scheme’s badge color', async () => {
      const { context, page } = await open(PAGE, { colorScheme: 'dark' });
      await drawn(page, ANATOMY);
      const figure = await anatomy(page);
      assert.equal(figure.background, rgb(resolvedIn(NS, `${NS}.comp.badge.container.color`, 'dark')));
      assert.equal(figure.leader, rgb(resolvedIn(NS, `${NS}.comp.badge.container.color`, 'dark')));
      await context.close();
    });

    if (engine === 'chromium') {
      test('under forced colors every number and line is the system’s text color', async () => {
        const { context, page } = await open(PAGE, { forcedColors: 'active' });
        await drawn(page, ANATOMY);
        const figure = await anatomy(page);
        const text = await page.evaluate(() => {
          const probe = document.createElement('span');
          probe.style.color = 'CanvasText';
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        });
        assert.equal(figure.background, text);
        assert.equal(figure.leader, text);
        await context.close();
      });
    }

    test('each figure takes the same room before its elements are defined as once it is drawn', async () => {
      const { context, page } = await open();
      const room = (selector) => page.evaluate((selector) => document.querySelector(selector).getBoundingClientRect().height, selector);
      const held = {};
      for (const selector of [ANATOMY, MEASURE]) {
        const pending = await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-stage]').hasAttribute('data-example-pending'), selector);
        assert.equal(pending, true, `${selector} is far from the view as the page loads`);
        held[selector] = await room(selector);
      }
      for (const selector of [ANATOMY, MEASURE]) {
        await drawn(page, selector);
        const now = await room(selector);
        assert.ok(Math.abs(now - held[selector]) <= NEAR, `${selector}: ${held[selector]}px held, ${now}px drawn`);
      }
      await context.close();
    });
  });
}

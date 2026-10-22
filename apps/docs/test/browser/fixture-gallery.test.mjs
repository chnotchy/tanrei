// Every component page's fixtures, as a reader sees them: the Specs tab has a gallery of fixtures, with a stage for each
// fixture of the spec; and every fixture it draws can be seen whole, at a desktop's width and at a phone's — its stage
// stands inside the page's column and the window, and what the fixture draws stands inside its stage (an element as
// wide as a layout is made narrower with its stage, a window is scaled down with it). The page itself never scrolls
// sideways.
//
// It was written after the fixtures stood in a table, where at 390 wide the drawing of 1953 of 2390 fixtures began
// past the table's visible box (the reader had to scroll the table sideways to find it), and where the drawing of
// nine components was missing altogether. Every fixture of a component the web implements is drawn: in the page, or
// alone in a window drawn from the web package's own document of it. That document is the window's only: no page
// links to it, and the sitemap does not list it.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port as the host does (host.mjs). It asks where each stage stands, not what
// a window draws inside it, and does not wait for a window to load (fixture-windows.test.mjs does).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { serveDist } from './host.mjs';

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

let host;
let origin;
let browser;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await host?.close();
});

/**
 * How long the browser may take over one thing asked of it before the test fails, naming it: a page's script that
 * never yields, or a browser that stops answering, would otherwise hold the suite until the job's own limit, with
 * nothing in its log (the gallery of 368 fixtures, the Field's, is drawn and measured in about a minute and a half on
 * a loaded machine). `page.goto` has Playwright's own limit.
 */
const ANSWER = 240_000;

/**
 * `promise`, or a failure after ANSWER that says what was waited for (`what`, and `more()` at that time).
 * @template T
 * @param {string} what
 * @param {Promise<T>} promise
 * @param {() => string} [more]
 * @returns {Promise<T>}
 */
async function bounded(what, promise, more = () => '') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what}: no answer within ${ANSWER / 1000} s${more()}`)), ANSWER);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `page.evaluate(fn, arg)`, bounded, its failure naming the last step the page named with `console.debug('[step] …')`.
 * @param {import('@playwright/test').Page} page
 * @param {string} what
 * @param {Function} fn
 * @param {unknown} [arg]
 */
async function evaluateBounded(page, what, fn, arg) {
  let step = '';
  const heard = (message) => {
    if (message.text().startsWith('[step] ')) step = message.text().slice('[step] '.length);
  };
  page.on('console', heard);
  try {
    return await bounded(`${what}: the page's script`, page.evaluate(fn, arg), () => (step ? `; its last step: ${step}` : ''));
  } finally {
    page.off('console', heard);
  }
}

/**
 * A new context and page of `browser`, and closing it, each bounded.
 * @param {string} what
 * @param {import('@playwright/test').BrowserContextOptions} options
 */
async function openPage(what, options) {
  const context = await bounded(`${what}: a new browser context`, browser.newContext(options));
  const page = await bounded(`${what}: a new page`, context.newPage());
  return { page, close: () => bounded(`${what}: closing its context`, context.close()) };
}

/**
 * Runs IN THE PAGE: the gallery's stages, and for each drawn one what stands outside where it must stand. Measured once
 * the elements are defined and every stage is laid out. Every wait is bounded: one that ends without what it waited for
 * throws, naming what did not come.
 */
async function measure() {
  const step = (what) => console.debug(`[step] ${what}`);
  const within = (ms, missing, promise) => {
    let timer;
    const late = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${missing()}, after ${ms / 1000} s`)), ms);
    });
    return Promise.race([promise, late]).finally(() => clearTimeout(timer));
  };
  const frame = () => within(10_000, () => 'no frame was drawn', new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
  const gallery = document.querySelector('[data-fixture-gallery]');
  if (!gallery) return { gallery: false };
  const laidOut = document.createElement('style');
  laidOut.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.append(laidOut);
  // What each stage drawn in the page holds before it is drawn: the room of its baseline.
  const held = new Map([...gallery.querySelectorAll('.docs-stage[data-stage="inline"][data-drawn]')].map((stage) => [stage, stage.getBoundingClientRect().height]));
  // A fixture is drawn when its stage comes within half a window of the view (the gallery's IntersectionObserver): the
  // page is scrolled through a window at a time, one frame at each (the observer reads a place in the frame after it is
  // scrolled to), and the page draws each stage it comes near. A stage passed by, as the stages above it grew when they
  // were drawn, is then brought into view on its own. (Half a window at a time, two frames at each, was four times the
  // frames, for nothing more drawn.)
  const start = document.scrollingElement.scrollHeight;
  for (let y = 0; y < document.scrollingElement.scrollHeight; y += innerHeight) {
    if (y > 4 * start) throw new Error(`the page kept growing as it was scrolled through: ${start} tall at first, ${document.scrollingElement.scrollHeight} at ${y}`);
    step(`scrolling through, at ${y} of ${document.scrollingElement.scrollHeight}`);
    scrollTo(0, y);
    await frame();
  }
  for (const canvas of gallery.querySelectorAll('.docs-stage-canvas[data-pending]')) {
    step(`bringing ${canvas.closest('.docs-stage')?.dataset.fixtureId} into view`);
    canvas.scrollIntoView({ block: 'center' });
    await frame();
    await frame();
  }
  scrollTo(0, 0);
  step('defining the elements');
  const tags = new Set([...gallery.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')));
  await Promise.race([Promise.all([...tags].map((n) => customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 5000))]);
  step('updating the elements');
  const updating = [...gallery.querySelectorAll('*')].filter((e) => e.updateComplete);
  const named = (e) => `${e.localName} in ${e.closest('.docs-stage')?.dataset.fixtureId ?? 'the gallery'}`;
  await within(10_000, () => `the update of ${updating.filter((e) => e.isUpdatePending).map(named).join(', ') || 'an element'} did not complete`, Promise.all(updating.map((e) => e.updateComplete)));
  step('loading the faces');
  await within(10_000, () => `the faces ${[...document.fonts].filter((f) => f.status === 'loading').map((f) => f.family).join(', ') || 'of the page'} did not load`, document.fonts.ready);
  step('laying out');
  for (let k = 0; k < 4; k++) await frame();
  step('measuring');

  const column = gallery.getBoundingClientRect();
  const outside = (inner, outer, slack = 1) => inner.left < outer.left - slack || inner.right > outer.right + slack || inner.top < outer.top - slack || inner.bottom > outer.bottom + slack;
  const stages = [...gallery.querySelectorAll('.docs-stage')];
  const found = [];
  for (const stage of stages) {
    const id = stage.dataset.fixtureId;
    const box = stage.getBoundingClientRect();
    if (box.left < -1 || box.right > innerWidth + 1) found.push(`${id}: its stage stands outside the window (${Math.round(box.left)}…${Math.round(box.right)} of ${innerWidth})`);
    else if (outside(box, { left: column.left, right: column.right, top: box.top, bottom: box.bottom })) found.push(`${id}: its stage stands outside the page's column`);
    if (stage.dataset.drawn === undefined) {
      found.push(`${id}: it is not drawn`);
      continue;
    }
    const area = stage.querySelector('.docs-stage-box').getBoundingClientRect();
    const drawn = stage.dataset.stage === 'window' ? stage.querySelector('.docs-window') : stage.querySelector('[data-fixture-scope] > .stage');
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
  // A stage drawn in the page holds its baseline's room before it is drawn, and is as tall once it is — unless it is
  // drawn narrower than its baseline (a layout wider than the column, laid out at the column's width), where it is
  // taller by design.
  const grown = [];
  let narrowed = 0;
  for (const [stage, before] of held) {
    const canvas = stage.querySelector('[data-fixture-scope]');
    const reserve = parseFloat(canvas.style.getPropertyValue('--docs-stage-reserve-inline'));
    const after = stage.getBoundingClientRect().height;
    if (canvas.getBoundingClientRect().width < reserve - 1) {
      narrowed++;
      continue;
    }
    if (after > before + 1) grown.push({ id: stage.dataset.fixtureId, before: Math.round(before), after: Math.round(after), stage: canvas.querySelector(':scope > .stage').getBoundingClientRect().height });
  }
  laidOut.remove();
  return {
    grown,
    narrowed,
    held: held.size,
    gallery: true,
    ids: stages.map((stage) => stage.dataset.fixtureId),
    drawn: stages.filter((stage) => stage.dataset.drawn !== undefined).length,
    sideways: document.scrollingElement.scrollWidth - innerWidth,
    found,
  };
}

// The fixture documents the site was built with (scripts/fixture-documents.mjs): each component's stages and the size
// of each stage's baseline.
const documents = JSON.parse(fs.readFileSync(path.join(docs, 'src/fixture-documents.generated.json'), 'utf8'));

describe('a fixture drawn alone is the one fixture its page draws, every element of it defined', { concurrency: 4 }, () => {
  for (const [name, document] of Object.entries(documents)) {
    // The first fixture of the component that has a baseline, in a window of the baseline's size. (Whether it fits there
    // exactly is not asked: text set on another machine than the baselines' can take a few pixels more, and the gallery's
    // frame grows to hold its document.)
    const stage = document.stages.find((each) => document.sizes[each.id]);
    if (!stage) continue;
    test(`${name}/${stage.id}`, async () => {
      const size = document.sizes[stage.id];
      const { page, close } = await openPage(`/fixtures/${name}/?id=${stage.id}`, { viewport: size, reducedMotion: 'reduce' });
      try {
        await page.goto(`${origin}/fixtures/${name}/?id=${encodeURIComponent(stage.id)}`, { waitUntil: 'load' });
        const result = await evaluateBounded(page, `/fixtures/${name}/?id=${stage.id}`, async (id) => {
          const tags = new Set([...document.querySelectorAll('.stage *')].map((e) => e.localName).filter((n) => n.includes('-')));
          await Promise.race([Promise.all([...tags].map((n) => customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 5000))]);
          await document.fonts.ready;
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const stages = [...document.querySelectorAll('.stage')];
          const box = stages[0]?.getBoundingClientRect();
          return {
            stages: stages.map((s) => s.dataset.fixture),
            undefined: [...tags].filter((n) => !customElements.get(n)),
            box: box && { width: Math.round(box.width), height: Math.round(box.height) },
            scroll: { width: document.scrollingElement.scrollWidth, height: document.scrollingElement.scrollHeight },
            id,
          };
        }, stage.id);
        assert.deepEqual(result.stages, [stage.id], 'the page draws the one fixture it is asked for');
        assert.deepEqual(result.undefined, [], 'every element on its stage is defined');
      } finally {
        await close();
      }
    });
  }
});

describe('a fixture document is the windows’ only: no reader is sent to it', () => {
  const htmlFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? htmlFiles(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []));

  test('no page links to one', () => {
    const linking = htmlFiles(dist)
      .filter((file) => !file.startsWith(path.join(dist, 'fixtures') + path.sep))
      .filter((file) => /\shref="\/fixtures\//.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(dist, file));
    assert.deepEqual(linking, []);
  });

  test('the sitemap lists none', () => {
    const maps = fs.readdirSync(dist).filter((name) => /^sitemap.*\.xml$/.test(name));
    assert.ok(maps.length > 0, 'the site has a sitemap');
    const listed = maps.flatMap((name) => [...fs.readFileSync(path.join(dist, name), 'utf8').matchAll(/<loc>([^<]*\/fixtures\/[^<]*)<\/loc>/g)].map((m) => m[1]));
    assert.deepEqual(listed, []);
    // The component pages are still listed.
    assert.match(fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8'), /<loc>[^<]*\/components\/button\/<\/loc>/);
  });

  test('without the id of a fixture it draws nothing', async () => {
    const { page, close } = await openPage('/fixtures/button/', {});
    try {
      await page.goto(`${origin}/fixtures/button/`, { waitUntil: 'load' });
      assert.equal(await page.locator('.stage').count(), 0);
      assert.equal(await page.locator('meta[name="robots"][content="noindex"]').count(), 1);
    } finally {
      await close();
    }
  });
});

// What each page's stages did when they were drawn, at each width: read by the last test below.
const drawing = [];

describe('every component page shows its fixtures, each whole, on a stage of its own', { concurrency: 4 }, () => {
  test('there are component pages', () => assert.ok(pages.length > 80, `found ${pages.length} component pages`));
  for (const { name, fixtures } of pages) {
    test(name, async () => {
      const problems = [];
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const { page, close } = await openPage(`/components/${name}/ at ${viewport.width}`, { viewport, reducedMotion: 'reduce' });
        try {
          await page.goto(`${origin}/components/${name}/`, { waitUntil: 'load' });
          const result = await evaluateBounded(page, `/components/${name}/ at ${viewport.width}`, measure);
          const at = `${viewport.width}`;
          if (!result.gallery) {
            problems.push(`${at}: the page has no gallery of fixtures`);
            continue;
          }
          if (JSON.stringify([...result.ids].sort()) !== JSON.stringify([...fixtures].sort())) problems.push(`${at}: the stages are not the spec's fixtures (${result.ids.length} stages, ${fixtures.length} fixtures)`);
          if (result.sideways > 1) problems.push(`${at}: the page scrolls sideways by ${result.sideways}px`);
          for (const line of result.found) problems.push(`${at}: ${line}`);
          // A stage that grew: is it as tall as its own document draws it on this machine? Then the page drew what the
          // document draws, and the baseline's room was set by another machine's text (a face the document does not
          // embed, a line that breaks otherwise); the stage is counted, not failed. Otherwise the page drew it otherwise.
          const grown = [];
          let otherMachine = 0;
          for (const each of result.grown) {
            const size = documents[name].sizes[each.id];
            const { page: own, close: closeOwn } = await openPage(`/fixtures/${name}/?id=${each.id}`, { viewport: { width: Math.max(size.width, 800), height: 1000 }, reducedMotion: 'reduce' });
            try {
              await own.goto(`${origin}/fixtures/${name}/?id=${encodeURIComponent(each.id)}`, { waitUntil: 'load' });
              const height = await evaluateBounded(own, `/fixtures/${name}/?id=${each.id}`, async () => {
                const tags = new Set([...document.querySelectorAll('.stage *')].map((e) => e.localName).filter((n) => n.includes('-')));
                await Promise.race([Promise.all([...tags].map((n) => customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 5000))]);
                await document.fonts.ready;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                return document.querySelector('.stage')?.getBoundingClientRect().height ?? 0;
              });
              if (Math.abs(height - each.stage) <= 1) otherMachine++;
              else grown.push(`${each.id}: its stage held ${each.before} and grew to ${each.after} when it was drawn (its own document draws it ${Math.round(height)} tall, the page ${Math.round(each.stage)})`);
            } finally {
              await closeOwn();
            }
          }
          drawing.push({ name, at, held: result.held, narrowed: result.narrowed, otherMachine, grown });
        } finally {
          await close();
        }
      }
      assert.deepEqual(problems, [], `${name}:\n  ${problems.join('\n  ')}`);
    });
  }
});

describe('a stage does not grow when it is drawn', () => {
  // A stage drawn in the page holds the room of its baseline — the web package's document's stage — until it is drawn,
  // and that stage is what it draws: nothing below it moves when it is. (While the site drew fixtures with a renderer
  // of its own, 179 stages of 2390 grew at 1440 wide, and 345 at 390.) One drawn narrower than its baseline, at the
  // column's width, is counted and left out: it is laid out anew there. So is one that grew to the height its own
  // document gives it on this machine: the page drew what the document draws, and the room was another machine's.
  test('every stage drawn at its baseline’s width is as tall as the room it held', () => {
    assert.ok(drawing.length > 160, `${drawing.length} pages and widths were drawn`);
    for (const at of ['1440', '390']) {
      const of = drawing.filter((each) => each.at === at);
      const sum = (key) => of.reduce((total, each) => total + (Array.isArray(each[key]) ? each[key].length : each[key]), 0);
      console.log(`${at}: ${sum('held')} stages drawn in the page, ${sum('narrowed')} narrower than their baseline, ${sum('otherMachine')} taller than their baseline as their own document draws them on this machine, ${sum('grown')} grew`);
    }
    const grown = drawing.flatMap((each) => each.grown.map((line) => `${each.name} at ${each.at}: ${line}`));
    assert.deepEqual(grown, []);
  });
});

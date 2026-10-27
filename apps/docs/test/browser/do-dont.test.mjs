// The Do and Don't pairs (components/visuals/DoDont.astro) and the shared examples they draw (src/examples/,
// lib/examples.ts), in each engine:
//
// - **a Don't produces the report it illustrates.** Every example is drawn alone, in a page of its own, by the web
//   package's development bundle (`dist/tanrei.bundle.js`, which reports as a debug build does: the site's own build is
//   a production one and reports nothing), and the debug reports it writes are the ones its first line names — every
//   one of them, and no other. A Do names none, so a Do that a component would report fails here, and so does a Don't
//   whose mistake the component has stopped refusing;
// - **the pairs as the built site draws them**: on the button's page, each pair is its frames, each named by its
//   verdict's word, its stage a picture (`inert`, hidden from assistive technology) holding the example in the page's
//   words, side by side at 1440 and one under the other at 390; the Japanese page draws the same markup in its words.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/do-dont.test.mjs   # in one engine (all three by default)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { exampleMarkup, exampleReports } = await import('../../src/lib/examples.ts');
const { strings } = await import('../../src/lib/i18n.ts');
const { words } = await import('../../src/examples/words.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const bundlePath = path.join(docs, '../../packages/web/dist/tanrei.bundle.js');
if (!fs.existsSync(bundlePath)) throw new Error('packages/web/dist holds no bundle: run `pnpm --filter @tanrei/web build` first');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const examplesDir = path.join(docs, 'src/examples');
const examples = fs
  .readdirSync(examplesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((folder) =>
    fs
      .readdirSync(path.join(examplesDir, folder.name))
      .filter((file) => file.endsWith('.html'))
      .map((file) => ({ id: `${folder.name}/${file.slice(0, -'.html'.length)}`, text: fs.readFileSync(path.join(examplesDir, folder.name, file), 'utf8') })),
  );

const ENGINES = engines('chromium,firefox,webkit');
/** A page of no site, for an example drawn alone: the browser asks it for the page and the bundle, and the test answers. */
const ALONE = 'https://examples.test';
const REPORT = /^\[tanrei\] <[a-z0-9-]+>: .* \(([A-Z]+-\d+)\)/s;

let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => {
  await host?.close();
});

for (const engine of ENGINES) {
  describe(`the Do and Don't pairs in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    test("every example writes the debug reports its first line names, and no other: a Don't the one it illustrates, a Do none", async () => {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      await context.route(`${ALONE}/**`, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/tanrei.bundle.js') return route.fulfill({ contentType: 'text/javascript', body: bundle });
        const example = examples.find(({ id }) => `/${id}` === url.pathname);
        if (!example) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><meta charset="utf-8"><body>${exampleMarkup(example.id, example.text, 'en')}<script type="module" src="/tanrei.bundle.js"></script></body></html>` });
      });
      const failures = [];
      for (const { id, text } of examples) {
        const page = await context.newPage();
        const reported = new Set();
        page.on('console', (message) => {
          const report = message.text().match(REPORT);
          if (report) reported.add(report[1]);
        });
        await page.goto(`${ALONE}/${id}`);
        // Every element defined and drawn, and what it reports after its first update written.
        await page.evaluate(async () => {
          const deadline = Date.now() + 10_000;
          const names = () => [...new Set([...document.body.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')))];
          while (names().some((name) => !customElements.get(name)) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
          for (let round = 0; round < 3; round++) {
            await Promise.all([...document.body.querySelectorAll('*')].map((element) => element.updateComplete).filter(Boolean));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          }
        });
        const named = exampleReports(text);
        const missing = named.filter((report) => !reported.has(report));
        const unnamed = [...reported].filter((report) => !named.includes(report));
        if (missing.length || unnamed.length) failures.push(`${id}: ${missing.length ? `does not report ${missing.join(', ')}` : ''}${missing.length && unnamed.length ? '; ' : ''}${unnamed.length ? `reports ${unnamed.join(', ')}, which its first line does not name` : ''}`);
        await page.close();
      }
      await context.close();
      assert.deepEqual(failures, []);
      assert.ok(examples.some(({ text }) => exampleReports(text).length > 0), "a Don't illustrates a report");
    });

    /** The pairs of a page as drawn: each frame's verdict, title, stage and box. */
    const pairsOn = (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-do-dont]')].map((pair) =>
          [...pair.querySelectorAll(':scope > [data-example]')].map((frame) => {
            const stage = frame.querySelector('[data-example-stage]');
            const box = frame.getBoundingClientRect();
            const figure = frame.querySelector('figure');
            const title = document.getElementById(figure.getAttribute('aria-labelledby').split(' ')[0]);
            return {
              verdict: frame.dataset.verdict,
              id: frame.dataset.exampleId,
              // What the title says without its glyph, whose name is drawn as a ligature and not read.
              title: (() => {
                const words = title.cloneNode(true);
                for (const glyph of words.querySelectorAll('.tanrei-icon')) glyph.remove();
                return words.textContent.replace(/\s+/g, ' ').trim();
              })(),
              glyphHidden: title.querySelector('.tanrei-icon')?.getAttribute('aria-hidden') === 'true',
              inert: stage.hasAttribute('inert'),
              hidden: stage.getAttribute('aria-hidden') === 'true',
              described: Boolean(figure.getAttribute('aria-describedby')),
              text: stage.innerHTML,
              top: Math.round(box.top + scrollY),
              left: Math.round(box.left),
              width: Math.round(box.width),
            };
          }),
        ),
      );

    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      test(`the button's pairs at ${viewport.width}: named by their verdicts, their stages pictures, ${viewport.width >= 1024 ? 'side by side' : 'one under the other'}`, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`${origin}/components/button/`);
        await page.waitForLoadState('load');
        const pairs = await pairsOn(page);
        const t = strings('en');
        assert.ok(pairs.length >= 4, 'the button page draws its pairs');
        for (const pair of pairs) {
          assert.deepEqual(
            pair.map((frame) => frame.verdict),
            ['do', 'dont'],
          );
          for (const frame of pair) {
            // The glyph's name is not read: the title says the verdict's word alone.
            assert.equal(frame.title, t.visuals[frame.verdict], `${frame.id}: its title is its verdict's word`);
            assert.ok(frame.glyphHidden, `${frame.id}: the glyph is hidden from assistive technology`);
            assert.ok(frame.inert && frame.hidden, `${frame.id}: its stage is a picture`);
            assert.ok(frame.described, `${frame.id}: its caption describes it`);
          }
          const [first, second] = pair;
          if (viewport.width >= 1024) {
            assert.equal(first.top, second.top, `${first.id} and ${second.id} stand side by side`);
            assert.ok(second.left > first.left + first.width - 1);
          } else {
            assert.ok(second.top >= first.top + 1, `${first.id} stands above ${second.id}`);
            assert.equal(first.left, second.left);
          }
        }
        await context.close();
      });
    }

    test("the Japanese page draws the same examples in its own words", async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/components/button/`);
      const en = (await pairsOn(page)).flat();
      await page.goto(`${origin}/ja/components/button/`);
      const ja = (await pairsOn(page)).flat();
      assert.deepEqual(
        ja.map((frame) => frame.id),
        en.map((frame) => frame.id),
      );
      const frame = ja.find((each) => each.id === 'button/form-delete-text');
      assert.ok(frame.text.includes(words.delete.ja) && frame.text.includes(words.saveChanges.ja), 'the example holds the Japanese words');
      assert.equal(frame.title, strings('ja').visuals.do);
      await context.close();
    });
  });
}

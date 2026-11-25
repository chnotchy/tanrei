// The home page's hero, before and after its elements are defined: nothing in it moves when they are — the specimen's
// stage holds the room its Buttons are drawn in from the first paint, at every width, in every language — and its
// primary action's label is never drawn in the plain link's color over the Button's fill.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/hero.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs). The order is the one a slow line gives:
// the header's script defines the Buttons, and the hero's own script — which holds the whole library
// (lib/register-web.ts) — arrives after it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the Arabic home page at
// 390, took 9 s in CI.
const LIMIT = { timeout: 120_000 };

const ENGINES = engines();

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// The home page of each language: the root one and each language's directory (a folder of the content with its own
// `components`).
const content = path.join(docs, 'src/content/docs');
const languages = fs.readdirSync(content).filter((name) => fs.existsSync(path.join(content, name, 'components')));
const homes = ['/', ...languages.map((lang) => `/${lang}/`)];

let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

const everythingDefined = () => [...document.querySelectorAll('.hero *')].every((el) => !el.localName.includes('-') || el.matches(':defined'));

/**
 * The modules that define the elements, as the site's build writes them: each the chunk that calls
 * `customElements.define` (as test/browser/layout-shift.test.mjs reads them).
 */
const elementChunks = new Set(
  fs.readdirSync(path.join(dist, '_astro')).filter((file) => file.endsWith('.js') && fs.readFileSync(path.join(dist, '_astro', file), 'utf8').includes('customElements.define(')),
);
/** How late each of those modules arrives once it is asked for, as on a slow line: long past the page's first paint. */
const LATE = 1_500;

/**
 * Runs in the page before any of its scripts: from the first frame that has the specimen until the test says stop, in
 * each frame, the height of the specimen's stage, how far below the stage's top the platform list under the specimen
 * stands, and how many of the stage's elements are not defined yet. Measured from the stage's top, so that only the
 * specimen moves it: in one column the copy above it is set in the page's faces as they arrive, which moves the
 * specimen and the list together.
 */
function watchSpecimen() {
  const frames = [];
  let stopped = false;
  Object.defineProperty(window, '__heroSpecimen', { value: frames });
  Object.defineProperty(window, '__heroSpecimenStop', { value: () => (stopped = true) });
  const tick = () => {
    const stage = document.querySelector('.hero .specimen-stage');
    const under = document.querySelector('.hero .platforms');
    if (stage && under) {
      const box = stage.getBoundingClientRect();
      frames.push({ height: box.height, under: under.getBoundingClientRect().top - box.top, pending: stage.querySelectorAll(':scope > :not(:defined)').length });
    }
    if (!stopped) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    /** Where the hero's title and what stands under the specimen are, with no script run, and with every element defined. */
    async function places(url, width) {
      const out = {};
      for (const scripts of [false, true]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          if (!scripts) await page.route(/\.m?js(\?|$)/, (route) => route.abort());
          await page.goto(origin + url, { waitUntil: 'load' });
          await settlePage(page, { frames: 0 });
          if (scripts) await page.waitForFunction(everythingDefined, null, { timeout: 30000 });
          out[scripts ? 'defined' : 'stopped'] = await page.evaluate(() => {
            const top = (selector) => document.querySelector(selector).getBoundingClientRect().top + scrollY;
            return { title: top('.hero h1'), under: top('.hero .platforms') };
          });
        } finally {
          await context.close();
        }
      }
      return out;
    }

    describe('the hero holds its place while its elements are defined', { concurrency: 4 }, () => {
      test('there is a home page in every language', () => assert.ok(homes.length >= 6, homes.join(', ')));
      for (const url of homes) {
        // Two columns, the copy beside the specimen; one column, the specimen under the copy. The specimen's stage holds
        // its Buttons in the boxes they are drawn in before they are defined (Hero.astro), so it wraps them into the
        // rows they take once drawn.
        for (const width of [1440, 390]) {
          test(`${url} at ${width}: the title and what stands under the specimen`, LIMIT, async () => {
            const { stopped, defined } = await places(url, width);
            assert.ok(Math.abs(stopped.title - defined.title) <= 0.5, `the title stood at ${stopped.title} with no script and at ${defined.title} once defined`);
            assert.ok(Math.abs(stopped.under - defined.under) <= 0.5, `the platform list stood at ${stopped.under} with no script and at ${defined.under} once defined`);
          });
        }
      }
    });

    // The page as a slow line gives it: each element's module LATE ms after it is asked for, so that the specimen is
    // drawn before its Buttons are defined, and they are defined while it is in the view. Its stage keeps one height in
    // every frame, and what stands under it does not move: at a phone's width (one column, where the Buttons wrap into
    // more rows the narrower it is) and a desktop's (two columns), in every language, Arabic right to left.
    describe(`the specimen keeps its height in every frame while its Buttons are defined, each element's module ${LATE / 1000} s late`, { concurrency: 4 }, () => {
      for (const url of homes) {
        for (const width of [360, 1440]) {
          test(`${url} at ${width}`, LIMIT, async (t) => {
            const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
            try {
              const page = await context.newPage();
              await page.addInitScript(watchSpecimen);
              let held = 0;
              await page.route(/\/_astro\/[^/]+\.js(\?|$)/, async (route) => {
                if (elementChunks.has(new URL(route.request().url()).pathname.split('/').pop())) {
                  held++;
                  await new Promise((resolve) => setTimeout(resolve, LATE));
                }
                await route.continue();
              });
              await page.goto(origin + url, { waitUntil: 'load' });
              await page.waitForFunction(everythingDefined, null, { timeout: 30_000 });
              await settlePage(page);
              const frames = await page.evaluate(() => {
                window.__heroSpecimenStop();
                return window.__heroSpecimen;
              });
              assert.ok(held > 0, 'no element module was asked for: the build names its chunks otherwise, and this test held nothing late');
              const early = frames.filter(({ pending }) => pending > 0);
              const last = frames.at(-1);
              t.diagnostic(`${held} module requests held ${LATE} ms; ${frames.length} frames, ${early.length} of them before every Button of the specimen was defined; the stage ${last.height} px tall, the list ${last.under} px below its top`);
              assert.ok(early.length > 0, 'no frame drew the specimen before its Buttons were defined: the test saw nothing of what it asks about');
              assert.equal(last.pending, 0, 'the specimen still holds Buttons that are not defined');
              const moved = frames.filter(({ height, under }) => Math.abs(height - last.height) > 0.5 || Math.abs(under - last.under) > 0.5);
              assert.deepEqual(
                moved.map(({ height, under, pending }) => `the stage ${height} px tall, the list ${under} px below its top, ${pending} Buttons not defined`),
                [],
                `frames whose specimen differs from the one drawn once its Buttons are defined (the stage ${last.height} px tall, the platform list ${last.under} px below its top)`,
              );
            } finally {
              await context.close();
            }
          });
        }
      }
    });

    describe('the primary action, in every frame it is drawn as a Button', () => {
      for (const width of [1440, 390]) {
        test(`at ${width}: its label stands out from its fill (4.5:1), the plain anchor gone`, LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
          try {
            // Every frame from the first: is the action defined, does it still hold its anchor, and the contrast of the
            // color its label is drawn in (the anchor's, while it is there) over the container's fill.
            await context.addInitScript(() => {
              const frames = (window.__heroFrames = []);
              const channels = (color) => (color.match(/[\d.]+/g) ?? []).map(Number);
              const luminance = ([r, g, b]) => {
                const linear = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
                return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
              };
              const tick = () => {
                const action = document.querySelector('.hero .action');
                const container = action?.shadowRoot?.querySelector('[part~="container"]');
                const label = action?.shadowRoot?.querySelector('[part~="label"]');
                if (action?.matches(':defined') && container && label) {
                  const anchor = action.querySelector('a');
                  const fill = channels(getComputedStyle(container).backgroundColor);
                  const ink = channels(getComputedStyle(anchor ?? label).color);
                  const [hi, lo] = [luminance(fill), luminance(ink)].sort((a, b) => b - a);
                  frames.push({ anchor: !!anchor, opaque: (fill[3] ?? 1) === 1, contrast: (hi + 0.05) / (lo + 0.05) });
                }
                if (frames.length < 30) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            });
            const page = await context.newPage();
            // The hero's script is held until the Button is defined (by the header's script), or 10 s.
            await page.route(/\/_astro\/Hero\.astro_astro_type_script[^/]*\.js$/, async (route) => {
              await page.waitForFunction(() => !!customElements.get('tanrei-button'), null, { timeout: 10000, polling: 50 }).catch(() => {});
              await route.continue();
            });
            await page.goto(origin + '/', { waitUntil: 'load' });
            await page.waitForFunction(() => window.__heroFrames.length >= 30, null, { timeout: 30000 });
            const frames = await page.evaluate(() => window.__heroFrames);
            assert.ok(frames[0].opaque, 'the primary action is drawn with an opaque fill');
            assert.deepEqual(frames.filter((frame) => frame.anchor).length, 0, 'frames drawn as a Button with the plain anchor still in it');
            const worst = Math.min(...frames.map((frame) => frame.contrast));
            assert.ok(worst >= 4.5, `the label's contrast over the fill fell to ${worst.toFixed(2)}:1`);
          } finally {
            await context.close();
          }
        });
      }
    });
  });
}

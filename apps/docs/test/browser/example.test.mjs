// The docs' one frame as the built site draws it (components/visuals/Example.astro, lib/example.ts), in each engine:
//
// - its code is closed until a reader opens it, under the stage; it is what the stage held as the page was built, in
//   HTML or — the reader's choice, kept for every example — in React with the React package's wrappers; the copy button
//   copies the code in the flavor chosen;
// - its stage is drawn in the other direction when the direction is turned, and as wide as its handle says; a gallery
//   stage whose fixture names a direction offers no other;
// - every frame is drawn in the page's look, with no system of its own (a frame pinned to a preset excepted): the
//   tokens the look's stylesheet gives the root, and the scheme chosen in the appearance menu;
// - what a stage holds is defined once it comes near the view, not with the page, and a stage below the view takes the
//   room its elements take drawn once a tag it holds is defined for another part of the page, moving nothing in the view.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/example.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settle, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the frames under the
// reader’s system, in WebKit, took 34 s in CI.
const LIMIT = { timeout: 120_000 };

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8'));
/** The select's spec: the fixtures its page's gallery draws, some of which name a direction. */
const SELECT = JSON.parse(fs.readFileSync(path.join(docs, '../../specs/select.spec.json'), 'utf8'));

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
const WIDE = { width: 1440, height: 900 };
const t = strings('en');

/** The page's first example that shows its code: one of the page's own, not a stage of the gallery. */
const FIRST = '[data-example]:not([data-stage]):has([data-example-actions])';

/** The frame's actions drawn, its elements defined, the fonts in, and two frames drawn since (each wait bounded: launch.mjs). */
const drawn = (page, selector) => settle(page, selector, { scroll: 'center', pending: '[data-example-actions] > template:not([data-example-panel])' });

/** What the frame's open code block shows, and what its copy button copies. */
const code = (page, selector) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const panel = frame.querySelector('[data-example-code-panel]');
    return { open: Boolean(panel && !panel.hidden), shown: panel?.querySelector('tanrei-code-block')?.code ?? null, copied: frame.querySelector('[data-example-copy]')?.text ?? null, language: panel?.querySelector('tanrei-code-block')?.language ?? null };
  }, selector);

/** Chooses a look in the header's Appearance panel, as a reader does, and closes the panel. */
async function chooseLook(page, id) {
  const panel = page.locator('tanrei-popover[anchor="docs-appearance"]');
  if (!(await panel.evaluate((popover) => popover.open))) await page.locator('#docs-appearance').click();
  await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === true);
  await panel.locator(`tanrei-list-item[value="${id}"]`).click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === false);
}

for (const engine of ENGINES) {
  describe(`the one frame in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (url = PAGE, viewport = WIDE) => {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await page.waitForLoadState('load');
      return { context, page };
    };

    test('its code is closed until it is opened, under the stage, in HTML or React as the reader chose, and the copy copies it', LIMIT, async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const frame = page.locator(FIRST).first();
      const button = frame.locator('[data-example-code]');
      // The button says whether the code is shown: the state is the inner button's, where the element hands it.
      const says = (expanded) => frame.getByRole('button', { name: t.example.code, exact: true, expanded }).count();
      assert.equal(await says(false), 1);
      const closed = await code(page, FIRST);
      assert.equal(closed.open, false, 'the code is closed until a reader opens it');
      assert.match(closed.copied, /<tanrei-button\b/, 'the copy copies the code before it is shown');

      await button.click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block')?.code, FIRST);
      const html = await code(page, FIRST);
      assert.equal(html.open, true);
      assert.equal(await says(true), 1);
      assert.equal(html.language, 'html');
      assert.match(html.shown, /<tanrei-button\b/);
      assert.doesNotMatch(html.shown, /data-pagefind|="true"|astro-|data-resize-handle/, 'the markup as an author writes it');
      assert.equal(html.copied, html.shown);
      // The panel stands under the stage, inside the frame.
      assert.ok(await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-stage] + [data-example-code-panel]') !== null, FIRST));

      await frame.locator('[data-example-flavors] tanrei-tab[value="react"]').click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block').language === 'jsx', FIRST);
      const react = await code(page, FIRST);
      assert.match(react.shown, new RegExp(`^import \\{ Button \\} from '${config.packages.npmScope}/react';`));
      assert.match(react.shown, /<Button\b/);
      assert.equal(react.copied, react.shown);
      assert.equal(await page.evaluate(() => localStorage.getItem('tanrei-docs-tabs-example-code')), 'react', 'the choice is kept');

      // Another frame opened after follows the choice.
      const next = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('[data-example]:not([data-stage])')].filter((frame) => frame.querySelector('[data-example-actions]'));
        frames[1].id ||= 'docs-test-second-frame';
        return `#${frames[1].id}`;
      });
      await drawn(page, next);
      await page.locator(`${next} [data-example-code]`).click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block')?.language === 'jsx', next);
      // The rows share one choice and keep it with the Tabs' own group and key, not a store of the site's own.
      assert.equal(await page.locator(`${next} [data-example-flavors]`).evaluate((row) => row.value), 'react', 'the row opened after shows the choice of its group');
      assert.deepEqual(await page.locator('[data-example-flavors]').evaluateAll((rows) => rows.map((row) => [row.getAttribute('group'), row.getAttribute('remember-as')])), [['example-code', 'tanrei-docs-tabs-example-code'], ['example-code', 'tanrei-docs-tabs-example-code']]);

      await button.click();
      assert.equal((await code(page, FIRST)).open, false, 'pressed again, the code closes');
      assert.equal(await says(false), 1);
      await context.close();
    });

    test('its stage is drawn in the other direction when that is turned, and as wide as its handle says', LIMIT, async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const frame = page.locator(FIRST).first();
      const stage = frame.locator('[data-example-stage]');
      const toggle = frame.locator('[data-example-direction]');
      assert.equal(await toggle.getAttribute('data-example-direction'), 'rtl');
      assert.equal(await toggle.getAttribute('label'), t.example.direction.ltr);
      await toggle.click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-stage]').getAttribute('dir') === 'rtl', FIRST);
      assert.equal(await stage.evaluate((element) => getComputedStyle(element.querySelector('tanrei-button')).direction), 'rtl');
      await toggle.click();
      await page.waitForFunction((selector) => !document.querySelector(selector).querySelector('[data-example-stage]').hasAttribute('dir'), FIRST);

      const handle = stage.locator(':scope > [data-resize-handle]');
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-resize-handle]').hasAttribute('aria-valuenow'), FIRST);
      const full = await stage.evaluate((element) => element.getBoundingClientRect().width);
      await handle.focus();
      await page.keyboard.press('Home');
      await page.waitForFunction((selector) => Math.round(document.querySelector(selector).querySelector('[data-example-stage]').getBoundingClientRect().width) === 160, FIRST);
      assert.equal(await handle.getAttribute('aria-valuenow'), '160');
      await page.keyboard.press('End');
      await page.waitForFunction(({ selector, full }) => Math.abs(document.querySelector(selector).querySelector('[data-example-stage]').getBoundingClientRect().width - full) < 1, { selector: FIRST, full });
      await context.close();
    });

    test('on a page that reads right to left, the direction turned is left to right', LIMIT, async () => {
      const { context, page } = await open('/ar/components/button/');
      await drawn(page, FIRST);
      const toggle = page.locator(FIRST).first().locator('[data-example-direction]');
      assert.equal(await toggle.getAttribute('data-example-direction'), 'ltr');
      assert.equal(await toggle.getAttribute('label'), strings('ar').example.direction.rtl);
      await context.close();
    });

    // A fixture that names a direction exists to show it, and its document's stage carries it (`dir`), over the
    // frame's: a button that turned the frame would turn nothing. Its stage offers none; one whose fixture names none
    // does, and turns it.
    for (const [lang, url] of [['en', '/components/select/'], ['ar', '/ar/components/select/']]) {
      test(`a gallery stage offers the other direction only where its fixture names none (${lang})`, LIMIT, async () => {
        const { context, page } = await open(url);
        const pageDirection = lang === 'ar' ? 'rtl' : 'ltr';
        const named = SELECT.fixtures.filter((fixture) => fixture.direction);
        const unnamed = SELECT.fixtures.find((fixture) => !fixture.direction);
        assert.ok(named.length > 0, 'a fixture of the select names a direction');
        /** The frame of a fixture's stage drawn: its actions, the room they held, and the direction its fixture is drawn in. */
        const stageOf = async (id) => {
          const selector = `[data-example][data-fixture-id="${id}"]`;
          await drawn(page, selector);
          await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-stage] .stage'), selector);
          return page.locator(selector).evaluate((frame) => {
            const holder = frame.querySelector('[data-example-actions]');
            return {
              held: Number(holder.dataset.exampleActions),
              actions: holder.querySelectorAll(':scope > :is(tanrei-button, tanrei-copy-button)').length,
              direction: !!holder.querySelector('[data-example-direction]'),
              drawnIn: getComputedStyle(frame.querySelector('[data-example-stage] .stage')).direction,
            };
          });
        };
        for (const fixture of named) {
          const stage = await stageOf(fixture.id);
          assert.equal(stage.direction, false, `${fixture.id}: its fixture names ${fixture.direction}, and its stage offers to turn it`);
          assert.equal(stage.actions, stage.held, `${fixture.id}: its actions hold the room of ${stage.held} and draw ${stage.actions}`);
          assert.equal(stage.drawnIn, fixture.direction, `${fixture.id}: drawn ${stage.drawnIn}`);
        }
        const before = await stageOf(unnamed.id);
        assert.equal(before.direction, true, `${unnamed.id}: its fixture names no direction, and its stage offers none`);
        assert.equal(before.actions, before.held);
        assert.equal(before.drawnIn, pageDirection, `${unnamed.id}: drawn in the page's direction`);
        await page.locator(`[data-example][data-fixture-id="${unnamed.id}"] [data-example-direction]`).click();
        const turned = pageDirection === 'ltr' ? 'rtl' : 'ltr';
        await page.waitForFunction(({ id, turned }) => getComputedStyle(document.querySelector(`[data-example][data-fixture-id="${id}"] [data-example-stage] .stage`)).direction === turned, { id: unnamed.id, turned });
        await context.close();
      });
    }

    test('every frame is drawn in the look and the scheme the reader chose for the page, with no system of its own', LIMIT, async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const presets = await page.locator('tanrei-popover[anchor="docs-appearance"] tanrei-list-item').evaluateAll((all) => all.map((item) => item.getAttribute('value')).slice(1));
      assert.ok(presets.length > 0, 'a preset is shipped');
      const [preset] = presets;
      /** Every stage not pinned to a system: whether any has a scope of its own, and the brand role each takes, beside the root's. */
      const stages = () =>
        page.evaluate(() => {
          const role = (element) => getComputedStyle(element).getPropertyValue('--tanrei-sys-color-primary').trim();
          const all = [...document.querySelectorAll('[data-example]:not([data-pinned]) [data-example-stage]')];
          return { scoped: all.filter((stage) => stage.hasAttribute('data-tanrei-system')).length, roles: [...new Set(all.map(role))], root: role(document.documentElement) };
        });
      const before = await stages();
      await chooseLook(page, preset);
      await page.waitForFunction(({ id, preset }) => document.getElementById(id)?.sheet && document.getElementById(id).getAttribute('href').includes(`/look-${preset}.`), { id: 'docs-look-sheet', preset });
      const under = await stages();
      assert.deepEqual(under, { scoped: 0, roles: [under.root], root: under.root }, 'every stage takes the root’s tokens');
      assert.notEqual(under.root, before.root, 'which are the look’s');
      // The scheme is the page's: the stage inherits it.
      await page.locator('#docs-mode').click();
      await page.waitForFunction((selector) => getComputedStyle(document.querySelector(selector).querySelector('[data-example-stage]')).colorScheme.includes('dark'), FIRST);
      // And back: the default system again.
      await chooseLook(page, config.namespace);
      await page.waitForFunction(() => !document.getElementById('docs-look-sheet'));
      assert.deepEqual(await stages(), before);
      await context.close();
    });

    test('what a stage holds is defined when it comes near the view, not with the page', LIMIT, async () => {
      const { context, page } = await open();
      await settlePage(page, { fonts: false });
      const far = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('[data-example]')];
        const last = frames.at(-1);
        last.id ||= 'docs-test-far-frame';
        return { id: `#${last.id}`, pending: last.querySelector('[data-example-stage]').hasAttribute('data-example-pending'), near: document.querySelector('[data-example]').querySelector('[data-example-stage]').hasAttribute('data-example-pending') };
      });
      assert.equal(far.near, false, 'the first frame, in the view, is drawn');
      assert.equal(far.pending, true, 'the last frame, far from the view, holds its elements back');
      await drawn(page, far.id);
      assert.equal(await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-stage]').hasAttribute('data-example-pending'), far.id), false);
      assert.equal(await page.evaluate((selector) => document.querySelector(selector).querySelectorAll('[data-example-stage] :not(:defined)').length, far.id), 0);
      await context.close();
    });

    // The Calendar's page: its first example, in the view, defines the calendar; the six further down hold one each,
    // which the browser upgrades with it while their stages are still away from the view. Each of those, below the view,
    // takes the calendar's room then — the room it is drawn in, not the room of an undefined element, so that a reader
    // who reaches it in one move (a page at a time) sees nothing pushed down — while the stage in the view does not move,
    // and its elements are still held back (its actions are drawn when it comes near).
    test('a stage below the view takes the room its elements take once a tag it holds is defined for another part of the page, and nothing in the view moves', LIMIT, async () => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await context.newPage();
      // Every script is held until the page has been read as it is drawn without them.
      let release;
      const held = new Promise((resolve) => (release = resolve));
      await page.route(/\.m?js(\?|$)/, async (route) => {
        await held;
        await route.continue();
      });
      // (DOMContentLoaded waits for the module scripts, which are held: the page is read once it has been parsed.)
      await page.goto(`${origin}/components/calendar/`, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.readyState !== 'loading');
      // (WebKit's fonts are ready only once the document has loaded, after the scripts held: their wait is bounded, as
      // the layout shift's test bounds it.)
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5_000))]));
      const heights = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('[data-example-stage]:has(> tanrei-calendar)')].map((stage) => ({
            id: stage.id,
            top: stage.getBoundingClientRect().top,
            height: stage.getBoundingClientRect().height,
            pending: stage.hasAttribute('data-example-pending'),
            held: stage.hasAttribute('data-example-held'),
            defined: stage.querySelector(':scope > tanrei-calendar').matches(':defined'),
          })),
        );
      const before = await heights();
      release();
      await page.waitForLoadState('load');
      await page.waitForFunction(() => customElements.get('tanrei-calendar'));
      await settlePage(page, { tags: ['tanrei-calendar'], among: '[data-example-stage]', update: '[data-example-stage] > tanrei-calendar', fonts: false });
      // (A stage is let go in the frame after its tag is defined.)
      await page.waitForFunction(() => !document.querySelector('[data-example-stage][data-example-held]:has(> tanrei-calendar:defined)'), null, { timeout: 10_000 });
      const after = await heights();
      const away = after.filter((stage) => stage.pending);
      const [first] = after.filter((stage) => !stage.pending);
      assert.ok(first, 'the first calendar, in the view, is drawn');
      assert.ok(away.length >= 1, 'a calendar further down is away from the view');
      const firstBefore = before.find((each) => each.id === first.id);
      assert.ok(Math.abs(first.top - firstBefore.top) < 0.5, `the stage in the view does not move: its top was ${firstBefore.top} px, it is ${first.top} px`);
      for (const stage of away) {
        assert.equal(stage.defined, true, `#${stage.id}'s calendar is upgraded with the tag`);
        assert.equal(stage.held, false, `#${stage.id}, below the view, no longer holds the room of an undefined calendar`);
        assert.ok(Math.abs(stage.height - first.height) < 0.5, `#${stage.id}, below the view, is as tall as the first calendar's stage (${first.height} px) before it comes near: it is ${stage.height} px`);
      }
      // Once it comes near, it is drawn in that same room.
      const last = away.at(-1);
      await settle(page, `#${last.id}`, { scroll: 'center', pending: '[data-example-pending]' });
      const drawnLast = (await heights()).find((stage) => stage.id === last.id);
      assert.equal(drawnLast.pending, false);
      assert.ok(Math.abs(drawnLast.height - first.height) < 0.5, `#${last.id}, drawn, is as tall as the first calendar's stage (${first.height} px): it is ${drawnLast.height} px`);
      await context.close();
    });
  });
}

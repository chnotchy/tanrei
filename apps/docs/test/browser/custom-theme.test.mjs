// The reader's own theme ("My theme", src/lib/custom-theme.ts): a layer Theme Studio gives the documentation from its
// Share menu — off until the reader turns it on, kept in this browser only — and the documentation drawn in it, the
// whole page and every example, from the first paint of every page after; the header naming it and listing it, and
// going back to the default system in one choice; the switch turned off taking it away; each press answered within
// 150 ms, the stylesheet computed in a worker; nothing refused by the site's policy, and nothing axe finds.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/custom-theme.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs: the site's headers, its policy with them).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { serveDist } from './host.mjs';
import { sheetKept, until } from './kept-sheet.mjs';
import { bounded, engines, launch } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const { APPEARANCE_KEY, CUSTOM_ATTR, CUSTOM_KEY, CUSTOM_LOOK, CUSTOM_STYLE_ID, LATE_ATTR, MISSING_ATTR, PENDING_ATTR, REVEAL_AFTER, SHEET_STORE } = await import('../../src/lib/appearance.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'studio', 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8')).namespace;

// Each test's limit: the backstop for what has no limit of its own (launch.mjs). A theme computed in a worker for the
// first time takes a few seconds in CI's engines.
const LIMIT = { timeout: 180_000 };
/** The most a press may take before the page draws what it answers (an interaction's next paint), in milliseconds. */
const INTERACTION = 150;

const ENGINES = engines('chromium,firefox,webkit');
const WIDE = { width: 1440, height: 900 };
const PAGE = '/components/button/';
const en = strings('en');
/** A layer as Theme Studio's switch would give it: a brand color of its own (the Studio's brand color row writes this). */
const tone = (light, dark) => ({ derive: { fn: 'tone', palette: 'primary', tone: { light, dark } } });
const LAYER = {
  id: 'acme',
  extends: DEFAULT,
  palettes: { primary: { source: { seed: '#0b6e4f' } } },
  tokens: {
    [`${DEFAULT}.sys.color.primary`]: tone([45, 38, 30], [72, 80, 87]),
    [`${DEFAULT}.sys.color.on-primary`]: tone([100], [10]),
    [`${DEFAULT}.sys.color.primary-container`]: tone([93, 91, 89], [22]),
    [`${DEFAULT}.sys.color.on-primary-container`]: tone([20, 15, 10], [88, 92, 96]),
    [`${DEFAULT}.sys.color.inverse-primary`]: tone([80], [40]),
  },
};

let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => host?.close());

/** What `<html>` says of the look, and what this browser keeps. */
const state = (page) =>
  page.evaluate(
    ({ appearance, custom, style, pending, available }) => ({
      look: document.documentElement.dataset.docsSystem,
      kept: document.documentElement.hasAttribute(available),
      pending: document.documentElement.hasAttribute(pending),
      sheet: Boolean(document.getElementById(style)),
      stored: JSON.parse(localStorage.getItem(appearance) ?? 'null'),
      theme: JSON.parse(localStorage.getItem(custom) ?? 'null'),
    }),
    { appearance: APPEARANCE_KEY, custom: CUSTOM_KEY, style: CUSTOM_STYLE_ID, pending: PENDING_ATTR, available: CUSTOM_ATTR },
  );

/**
 * The brand role as drawn: the color a probe takes from it on the root (`root`) and in the first example's stage
 * (`example`, with whether the stage has a system scope of its own); and whether the theme's sheet declares it.
 */
const primary = (page) =>
  page.evaluate((style) => {
    const name = '--tanrei-sys-color-primary';
    const drawnIn = (parent) => {
      const probe = parent.appendChild(document.createElement('span'));
      probe.style.color = `var(${name})`;
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const stage = document.querySelector('[data-example] [data-example-stage]');
    return {
      root: drawnIn(document.body),
      example: stage ? drawnIn(stage) : null,
      scoped: stage?.getAttribute('data-tanrei-system') ?? null,
      declared: Boolean(document.getElementById(style)?.textContent?.includes(`${name}:`)),
    };
  }, CUSTOM_STYLE_ID);

/** Waits for the theme's sheet to be in and the page shown. */
const drawn = (page) =>
  bounded(
    `${page.url()}: the theme's stylesheet in and the page shown`,
    page.waitForFunction(({ style, pending }) => document.getElementById(style) && !document.documentElement.hasAttribute(pending), { style: CUSTOM_STYLE_ID, pending: PENDING_ATTR }, { timeout: 60_000 }),
    () => state(page).then((now) => JSON.stringify({ ...now, theme: Boolean(now.theme) })),
  );

/** How long a press takes to be drawn: from its pointerdown to the frame after the `change` it fires, in the page's clock. */
async function pressed(page, locator, event = 'change') {
  await page.evaluate((type) => {
    window.pressTimes = null;
    let start = 0;
    let heard = 0;
    addEventListener('pointerdown', () => (start = performance.now()), { capture: true, once: true });
    document.addEventListener(type, () => ((heard = performance.now()), requestAnimationFrame(() => (window.pressTimes = { total: performance.now() - start, heard: heard - start }))), { capture: true, once: true });
  }, event);
  await locator.click();
  await page.waitForFunction(() => window.pressTimes !== null);
  return page.evaluate(() => window.pressTimes);
}

for (const engine of ENGINES) {
  describe(`the reader's own theme in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    /** A context whose pages are watched: what the console says, what the policy refuses, and every request. */
    const context = async () => {
      const made = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light', locale: 'en-US' });
      made.setDefaultTimeout(30_000);
      const problems = [];
      const requests = [];
      made.on('page', (page) => {
        page.on('console', (message) => message.type() === 'error' && problems.push(`${page.url()}: ${message.text()}`));
        page.on('pageerror', (error) => problems.push(`${page.url()}: ${error.message}`));
      });
      made.on('request', (request) => requests.push(request.url()));
      await made.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => console.error(`CSP ${event.violatedDirective} ${event.blockedURI}`)));
      return { context: made, problems, requests };
    };

    test('the Studio’s Share menu: off by default; on, the documentation keeps the layer and shows it, every page from its first paint, the examples with it; off, it is gone', LIMIT, async () => {
      const { context: tabs, problems, requests } = await context();
      const studio = await tabs.newPage();
      await studio.goto(`${origin}/studio/`);
      await studio.waitForSelector('[data-studio][data-pane] [data-share-open]');
      await studio.evaluate(() => customElements.whenDefined('tanrei-popover'));
      // The layer the Studio keeps: given as a person would load it, through the browser's own storage.
      await studio.evaluate((layer) => localStorage.setItem('tanrei-theme-studio', JSON.stringify({ layer })), LAYER);
      // Its faces in first: a reload cancels a face still downloading, and Firefox logs the cancelled download as an error.
      await studio.evaluate(() => document.fonts.ready);
      await studio.reload();
      await studio.waitForSelector('[data-studio][data-pane] [data-share-open]');
      // The Studio drawn: every element defined, its faces in, and two frames since (its first computation is done).
      await studio.evaluate(async () => {
        await Promise.all([...new Set([...document.querySelectorAll('*')].map((el) => el.localName).filter((name) => name.includes('-')))].map((name) => customElements.whenDefined(name)));
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      // A tab of the documentation, open beside the Studio.
      const reader = await tabs.newPage();
      await reader.goto(`${origin}${PAGE}`);
      await reader.waitForFunction(() => customElements.get('tanrei-app-bar'));
      assert.deepEqual(await state(reader), { look: DEFAULT, kept: false, pending: false, sheet: false, stored: null, theme: null }, 'nothing kept before the switch');
      const own = await primary(reader);

      await studio.locator('[data-share-open]').click();
      const toggle = studio.locator('[data-share-docs]');
      await toggle.waitFor();
      assert.equal(await toggle.evaluate((element) => element.checked), false, 'off by default');
      const axe = await new AxeBuilder({ page: studio }).include('[data-share]').analyze();
      assert.deepEqual(axe.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`), [], 'axe: the Share menu');

      const took = await pressed(studio, toggle);
      assert.ok(took.total < INTERACTION, `the switch is drawn on within ${INTERACTION} ms of its press (${took.total.toFixed(0)} ms; heard after ${took.heard.toFixed(0)} ms)`);
      const kept = await state(studio);
      assert.equal(kept.stored.look, CUSTOM_LOOK, 'the look is the reader’s theme');
      assert.deepEqual(kept.theme.layer, LAYER, 'the layer the Studio keeps, in this browser');

      // The open tab follows: the whole page in the theme, the examples with it.
      await reader.waitForFunction((look) => document.documentElement.dataset.docsSystem === look, CUSTOM_LOOK);
      await drawn(reader);
      const colors = await primary(reader);
      assert.ok(colors.declared, 'the theme’s sheet declares the brand role');
      assert.notEqual(colors.root, own.root, 'the root draws the theme’s brand color, not the default system’s');
      assert.deepEqual({ example: colors.example, scoped: colors.scoped }, { example: colors.root, scoped: null }, 'an example is drawn in the theme, on the root’s tokens');
      assert.equal(await reader.locator('#docs-appearance .docs-look-name').textContent(), en.frame.myTheme, 'the header names it');
      assert.equal(await reader.locator('#docs-appearance').getAttribute('label'), en.frame.appearanceOf.replace('{look}', en.frame.myTheme));

      // The next page: the sheet from IndexedDB, before anything is shown, and no worker asked for. (A page is shown in
      // the theme as soon as its sheet is computed; the sheet is written to IndexedDB meanwhile, which an engine still
      // loading the page's modules may finish only later: the next page is opened once it is kept.)
      await until(reader, 'the theme’s sheet kept', sheetKept, { ...SHEET_STORE, hash: kept.theme.hash });
      const next = await tabs.newPage();
      await next.addInitScript(({ style, pending }) => {
        window.cloak = { hidden: null, shown: null, sheetThen: null };
        // (The document has no root element yet when this runs: the document is watched, its root with it.)
        new MutationObserver(() => {
          const on = document.documentElement.hasAttribute(pending);
          if (on && window.cloak.hidden === null) window.cloak.hidden = performance.now();
          if (!on && window.cloak.hidden !== null && window.cloak.shown === null) Object.assign(window.cloak, { shown: performance.now(), sheetThen: Boolean(document.getElementById(style)) });
        }).observe(document, { subtree: true, attributes: true, attributeFilter: [pending] });
      }, { style: CUSTOM_STYLE_ID, pending: PENDING_ATTR });
      const before = requests.length;
      await next.goto(`${origin}/foundations/accessibility/`);
      await drawn(next);
      const cloak = await next.evaluate(() => window.cloak);
      // Shown with the sheet in — or, on an engine too loaded to answer IndexedDB in time, once REVEAL_AFTER had passed.
      assert.ok(cloak.hidden !== null && (cloak.sheetThen || cloak.shown - cloak.hidden >= REVEAL_AFTER - 50), `the page was shown with the theme’s sheet in, never before it (${JSON.stringify(cloak)})`);
      assert.equal((await primary(next)).root, colors.root, 'the theme survives the navigation');
      assert.deepEqual(requests.slice(before).filter((url) => /sheet-worker/.test(url)), [], 'the kept sheet is read, not computed again');

      // Off: the documentation keeps nothing, and the open tabs are drawn in the default system again.
      await toggle.click();
      await reader.waitForFunction((look) => document.documentElement.dataset.docsSystem === look, DEFAULT);
      const off = await state(reader);
      assert.deepEqual({ ...off, stored: off.stored?.look ?? null }, { look: DEFAULT, kept: false, pending: false, sheet: false, stored: null, theme: null });
      assert.equal(await reader.locator('#docs-appearance .docs-look-name').textContent(), DEFAULT);
      assert.equal((await primary(reader)).root, own.root, 'the default system’s brand color again');
      await tabs.close();
      assert.deepEqual(problems, [], 'no console errors, page errors or refusals of the policy');
    });

    test('the header: “My theme” listed while it is kept, chosen in one press, and the default system one choice away; axe finds nothing in the panel', LIMIT, async () => {
      const { context: tabs, problems } = await context();
      const page = await tabs.newPage();
      await page.goto(`${origin}${PAGE}`);
      await page.waitForFunction(() => customElements.get('tanrei-app-bar'));
      // Not kept: the panel does not offer it.
      await page.locator('#docs-appearance').click();
      const panel = page.locator('tanrei-popover[anchor="docs-appearance"]');
      await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === true);
      assert.equal(await panel.getByRole('option', { name: en.frame.myTheme }).count(), 0, 'no theme kept: no choice of it');
      await page.keyboard.press('Escape');

      // Kept (as the Studio's switch keeps it, the look left as it was): offered, and chosen in one press.
      await page.evaluate(({ key, layer }) => localStorage.setItem(key, JSON.stringify({ hash: 'k3x9', layer })), { key: CUSTOM_KEY, layer: LAYER });
      await page.reload();
      await page.waitForFunction(() => customElements.get('tanrei-app-bar'));
      assert.deepEqual(await state(page).then(({ look, kept, pending }) => ({ look, kept, pending })), { look: DEFAULT, kept: true, pending: false });
      await page.evaluate(() => document.fonts.ready);
      const underDefault = [...new Set((await new AxeBuilder({ page }).include('main').analyze()).violations.map((violation) => violation.id))];
      await page.locator('#docs-appearance').click();
      await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === true);
      const mine = panel.getByRole('option', { name: en.frame.myTheme });
      await mine.waitFor();
      const axe = await new AxeBuilder({ page }).include('tanrei-popover[anchor="docs-appearance"]').analyze();
      assert.deepEqual(axe.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`), [], 'axe: the panel with the reader’s theme');
      const took = await pressed(page, mine, 'docs-appearance');
      assert.ok(took.total < INTERACTION, `the choice is drawn within ${INTERACTION} ms of its press (${took.total.toFixed(0)} ms; heard after ${took.heard.toFixed(0)} ms)`);
      await drawn(page);
      assert.equal((await state(page)).stored.look, CUSTOM_LOOK);
      // The page under the theme: axe finds nothing in it that it does not find under the default system (what it
      // finds there is the page's, whatever the look, and is not this test's to judge).
      const ids = (report) => [...new Set(report.violations.map((violation) => violation.id))].sort();
      const themed = await new AxeBuilder({ page }).include('main').analyze();
      assert.deepEqual(ids(themed).filter((id) => !underDefault.includes(id)), [], `axe: the page in the theme (${themed.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`).join('; ')})`);

      // One choice back.
      await panel.getByRole('option', { name: DEFAULT, exact: true }).click();
      await page.waitForFunction((look) => document.documentElement.dataset.docsSystem === look, DEFAULT);
      const back = await state(page);
      assert.equal(back.sheet, false, 'the theme’s sheet is taken away');
      assert.equal(back.kept, true, 'and still kept, to be chosen again');
      await tabs.close();
      assert.deepEqual(problems, [], 'no console errors, page errors or refusals of the policy');
    });

    test('a page opened under a theme whose sheet is not kept yet: hidden, computed in the worker, then shown in the theme', LIMIT, async (t) => {
      const { context: tabs, problems, requests } = await context();
      await tabs.addInitScript(({ key, appearance, layer, look }) => {
        if (location.protocol !== 'http:' || localStorage.getItem(key)) return;
        localStorage.setItem(key, JSON.stringify({ hash: 'fresh1', layer }));
        localStorage.setItem(appearance, JSON.stringify({ look }));
      }, { key: CUSTOM_KEY, appearance: APPEARANCE_KEY, layer: LAYER, look: CUSTOM_LOOK });
      const page = await tabs.newPage();
      // When the page was hidden (before its body was parsed?) and when it was shown: with the sheet in, or not before
      // REVEAL_AFTER from when it was hidden (a slow engine on a loaded machine may take longer than that to compute it).
      // And where the time went, from navigation (`performance.now()`, ms): the head's IndexedDB read answered (`missing`:
      // the root marked), the theme's module run (`moduleRan`: the mark taken away), its script elements put in
      // (`early`: the parser's and the head's), the worker made and its answer heard, the sheet put in, the first
      // animation frame, the document's milestones, the fetches of the theme's scripts and the worker's
      // (`resources`: start–end), and the main thread's long tasks before the page was shown (Chromium only).
      await page.addInitScript(({ pending, style, missing }) => {
        window.cloak = { hidden: null, bodyThen: null, shown: null, sheetThen: null };
        const now = () => Math.round(performance.now());
        const at = (window.timings = { missing: null, moduleRan: null, early: [], workerMade: null, workerAnswered: null, sheetIn: null, firstFrame: null, longTasks: [] });
        const Made = window.Worker;
        window.Worker = class extends Made {
          constructor(...args) {
            super(...args);
            at.workerMade ??= now();
            this.addEventListener('message', () => (at.workerAnswered ??= now()));
          }
        };
        requestAnimationFrame(() => (at.firstFrame = now()));
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) at.longTasks.push([Math.round(entry.startTime), Math.round(entry.duration)]);
          }).observe({ type: 'longtask', buffered: true });
        } catch {
          // Only Chromium reports long tasks.
        }
        new MutationObserver((records) => {
          const time = performance.now();
          const on = document.documentElement.hasAttribute(pending);
          if (on && window.cloak.hidden === null) Object.assign(window.cloak, { hidden: time, bodyThen: Boolean(document.body) });
          if (!on && window.cloak.hidden !== null && window.cloak.shown === null) Object.assign(window.cloak, { shown: time, sheetThen: Boolean(document.getElementById(style)) });
          for (const record of records) {
            if (record.attributeName === missing) {
              if (document.documentElement.hasAttribute(missing)) at.missing ??= now();
              else if (at.missing !== null) at.moduleRan ??= now();
            }
            for (const node of record.addedNodes) {
              if (node.localName === 'script' && /ThemeProvider/.test(node.getAttribute('src') ?? '')) at.early.push(now());
              if (node.id === style) at.sheetIn ??= now();
            }
          }
        }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: [pending, missing] });
      }, { pending: PENDING_ATTR, style: CUSTOM_STYLE_ID, missing: MISSING_ATTR });
      await page.goto(`${origin}${PAGE}`);
      await page.waitForFunction(() => window.cloak.shown !== null, undefined, { timeout: 60_000 });
      const cloak = await page.evaluate(() => window.cloak);
      assert.ok(cloak.hidden !== null && cloak.bodyThen === false, `hidden by the head’s script, before the body (${JSON.stringify(cloak)})`);
      // The worker answers whether or not the page waited for it.
      await page.waitForFunction(() => window.timings.workerAnswered !== null, undefined, { timeout: 60_000 });
      const timings = await page.evaluate((shown) => {
        const nav = performance.getEntriesByType('navigation')[0];
        const resources = performance
          .getEntriesByType('resource')
          .filter((entry) => /ThemeProvider|custom-theme|appearance\.|sheet-worker/.test(entry.name))
          .map((entry) => `${entry.name.replace(/^.*\//, '')} ${Math.round(entry.startTime)}–${Math.round(entry.responseEnd)}`);
        const { longTasks, ...rest } = window.timings;
        const before = longTasks.filter(([start]) => start < shown);
        return {
          ...rest,
          response: Math.round(nav.responseEnd),
          interactive: Math.round(nav.domInteractive),
          parsed: Math.round(nav.domContentLoadedEventStart),
          loaded: Math.round(nav.loadEventStart),
          resources,
          longTasksBeforeShown: { count: before.length, ms: before.reduce((sum, [, ms]) => sum + ms, 0), longest: before.sort((a, b) => b[1] - a[1]).slice(0, 3) },
        };
      }, cloak.shown);
      const measured = JSON.stringify({ hidden: Math.round(cloak.hidden), shown: Math.round(cloak.shown), sheetThen: cloak.sheetThen, ...timings });
      t.diagnostic(`hidden for ${Math.round(cloak.shown - cloak.hidden)} ms, ${cloak.sheetThen ? 'shown in the theme' : 'shown in the default system: the sheet was not in after REVEAL_AFTER'}`);
      t.diagnostic(`${engine} first load, ms from navigation: ${measured}`);
      // Whether the first page is shown in the theme is reported, not asserted, in every engine. On a Mac each engine has
      // the sheet in time (Chromium at about 0.7 s from navigation, Firefox and WebKit at 2.1 to 2.2 s), but on CI's
      // runners, where this file runs beside other browser test files, nothing about it is reliable. There Chromium's
      // worker took 2.6 s from being made (578 ms) to answering (3142 ms), against 0.4 s on an idle Mac page, while the
      // page's main thread had 2.2 s of long tasks. One run took the late path. The next was in the theme only because the
      // fallback timer itself ran 85 ms late (sheet in at 3143 ms, the timer due at 3058). Firefox fetched the worker's
      // script only after the page had loaded (6.8 s). So the numbers are printed (above) and both paths are accepted.
      if (!cloak.sheetThen) {
        // A sheet the page could not wait for: shown after REVEAL_AFTER, in the default system, which it keeps; the sheet
        // is computed all the same and kept, and the next page is drawn in the theme.
        assert.ok(cloak.shown - cloak.hidden >= REVEAL_AFTER - 50, `shown without the sheet only once the page had been hidden for ${REVEAL_AFTER} ms (${JSON.stringify(cloak)})`);
        assert.deepEqual(await page.evaluate((late) => [document.documentElement.dataset.docsSystem, document.documentElement.hasAttribute(late)], LATE_ATTR), [DEFAULT, true]);
        assert.equal(await page.evaluate((style) => Boolean(document.getElementById(style)), CUSTOM_STYLE_ID), false, 'the late sheet is not put in on that page');
        // The next page: the sheet kept by then is read before the page is shown.
        await until(page, 'the late sheet kept', sheetKept, { ...SHEET_STORE, hash: 'fresh1' });
        await page.reload();
      }
      await drawn(page);
      assert.ok(requests.some((url) => /sheet-worker/.test(url)), 'computed in the worker');
      const colors = await primary(page);
      assert.ok(colors.declared, 'the theme’s sheet declares the brand role');
      assert.deepEqual({ example: colors.example, scoped: colors.scoped }, { example: colors.root, scoped: null });
      await tabs.close();
      assert.deepEqual(problems, [], 'no console errors, page errors or refusals of the policy');
    });
  });
}

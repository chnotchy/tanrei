// The lists of components and the reader's look on the built site (the header's Appearance panel,
// components/frame/Appearance.astro, which a compact window puts first in the drawer; lib/list-filter.ts): the
// lists — the sidebar's and the index's — have no choice of system of their own and follow the look, the default
// system until the reader chooses another, and the choice is kept across pages. A component the look does not have
// stays in both lists, a link as before, drawn faint: its row ends with "Not in <look>", which the sidebar's row also
// says as its description. The page of a component some systems do not have says which, and what they use instead
// (components/ComponentAvailability.astro); the presets page holds the facts of every preset. At a phone's width
// (390 px) and a desktop's (1440 px).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/system-filter.test.mjs   # in each engine (Chromium by default)
//
// It reads `dist/` (the site) and the generated manifests, and serves the site itself on a free port, as the host does
// (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { watchNetwork } from './network-quiet.mjs';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the FAB menu’s page at
// 1440, took 21 s in CI.
const LIMIT = { timeout: 120_000 };

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const manifestOf = (id) => JSON.parse(fs.readFileSync(path.join(repo, `tokens/generated/${id}/components.json`), 'utf8'));
const presets = fs.readdirSync(path.join(repo, 'tokens/generated')).filter((id) => id !== DEFAULT && fs.existsSync(path.join(repo, `tokens/generated/${id}/components.json`)));
/** The words a row ends with under a look that does not have it. */
const notIn = (system, lang = 'en') => strings(lang).listing.notIn.replace('{system}', system);

const ENGINES = engines('chromium');
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

/**
 * A page, loaded with its elements defined — and in Chromium quiet, which only its protocol can tell (network-quiet.mjs);
 * the other engines wait for what is asked of them. The context (and its storage) is the caller's to close.
 */
async function open(context, url) {
  const page = await context.newPage();
  const network = context.browser()?.browserType().name() === 'chromium' ? await watchNetwork(page) : null;
  await page.goto(origin + url, { waitUntil: 'load' });
  await network?.quiet();
  await page.waitForFunction(() => ['tanrei-menu', 'tanrei-button', 'tanrei-navigation-drawer', 'tanrei-navigation-drawer-item'].every((name) => customElements.get(name)));
  return page;
}

/**
 * A component's rows in each list now: how many the index and the sidebar hold, whether each is faint, what the
 * index's row says at its end, and what the sidebar's row says at its end and as its link's description.
 */
const rows = (page, name) =>
  page.evaluate(async (href) => {
    const index = [...document.querySelectorAll(`.index tanrei-list-item[href="${href}"]`)];
    const sidebar = [...document.querySelectorAll(`.docs-sidebar tanrei-navigation-drawer-item[href="${href}"]`)];
    await Promise.all(sidebar.map((item) => item.updateComplete));
    const anchor = sidebar[0]?.shadowRoot?.querySelector('a');
    return {
      index: index.length,
      sidebar: sidebar.length,
      faint: { index: index.some((row) => row.hasAttribute('data-docs-faint')), sidebar: sidebar.some((row) => row.hasAttribute('data-docs-faint')) },
      said: {
        index: index[0]?.querySelector('.end')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
        supporting: sidebar[0]?.getAttribute('supporting-text') ?? '',
        description: anchor?.getAttribute('aria-description') ?? '',
      },
    };
  }, `/components/${name}/`);

/** A component the look has: in both lists, not faint, nothing said of the look. */
const whole = () => ({ index: 1, sidebar: 1, faint: { index: false, sidebar: false }, said: { index: '', supporting: '', description: '' } });
/** A component the look `system` does not have: in both lists all the same, faint, and saying so. */
const faint = (system) => ({ index: 1, sidebar: 1, faint: { index: true, sidebar: true }, said: { index: notIn(system), supporting: notIn(system), description: notIn(system) } });

/** What the header's buttons and panels say (the bar's, and the drawer's of a compact window). */
const saidByTheHeader = (page) =>
  page.evaluate(() => ({
    groups: [...document.querySelectorAll('tanrei-list.docs-appearance-look')].map((list) => list.value ?? list.getAttribute('value')),
    names: [...document.querySelectorAll('tanrei-button.docs-look .docs-look-name')].map((name) => name.textContent),
  }));
/** The look the reader keeps. */
const kept = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tanrei-docs-appearance') ?? 'null')?.look);

/** Chooses `system` in the header's Appearance panel, as a reader does: its button (in a compact window, in the opened drawer), then the option; then closes the panel (and the drawer). */
async function choose(page, system, compact) {
  if (compact) {
    await page.locator('tanrei-app-bar [data-app-shell-menu]').click();
    await page.locator('#docs-appearance-drawer').waitFor({ state: 'visible' });
  }
  const id = compact ? 'docs-appearance-drawer' : 'docs-appearance';
  await page.locator(`#${id}`).click();
  const panel = page.locator(`tanrei-popover[anchor="${id}"]`);
  await page.waitForFunction((anchor) => document.querySelector(`tanrei-popover[anchor="${anchor}"]`)?.open === true, id);
  await panel.getByRole('option', { name: system, exact: true }).click();
  await page.waitForFunction((id) => document.documentElement.getAttribute('data-docs-system') === id, system);
  await page.keyboard.press('Escape');
  await page.waitForFunction((anchor) => document.querySelector(`tanrei-popover[anchor="${anchor}"]`)?.open !== true, id);
  if (compact) {
    await page.keyboard.press('Escape');
    await page.locator('#docs-appearance-drawer').waitFor({ state: 'hidden' });
  }
}

for (const engine of ENGINES) {
  describe(engine, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const width of [390, 1440]) {
      describe(`at ${width} px`, () => {
        const compact = width < 600;

        test('the index has no choice of system: the header’s Appearance panel chooses the look, says it on its button and keeps it', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/components/');
            assert.equal(await page.locator('.index tanrei-select-field, .index select').count(), 0, 'no select of the system on the index');
            assert.equal(await page.locator('.docs-sidebar tanrei-select-field').count(), 0, 'nor in the sidebar');
            // The bar draws its own button only where it has room: in a compact window the drawer holds it.
            assert.equal(await page.locator('#docs-appearance').isVisible(), !compact);
            await choose(page, 'cupertino', compact);
            assert.deepEqual(await rows(page, 'segmented-button'), whole());
            assert.equal(await kept(page), 'cupertino');
            assert.deepEqual(await saidByTheHeader(page), { groups: ['cupertino', 'cupertino'], names: ['cupertino', 'cupertino'] });
            assert.match(await page.locator(compact ? '#docs-appearance-drawer' : '#docs-appearance').getAttribute('label'), /cupertino/);
            const next = await open(context, '/components/button/');
            assert.deepEqual(await saidByTheHeader(next), { groups: ['cupertino', 'cupertino'], names: ['cupertino', 'cupertino'] }, 'another page says it from the first frame');
            assert.equal(await next.evaluate(() => document.documentElement.scrollWidth), width, 'no row is wider than the window');
          } finally {
            await context.close();
          }
        });

        test('under the default system the lists still hold what it does not have, faint and saying so; m3-like has everything; the choice is kept', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/components/');
            assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-docs-system')), DEFAULT);
            for (const name of manifestOf(DEFAULT).omitted.map((entry) => entry.name)) assert.deepEqual(await rows(page, name), faint(DEFAULT), `${DEFAULT}: ${name}`);
            assert.deepEqual(await rows(page, 'button'), whole());
            // Only the default system's words are in the document: another look's are taken out.
            assert.equal(await page.locator('.index [data-docs-system-only="cupertino"], .docs-sidebar [data-docs-system-only="cupertino"]').count(), 0);
            // The faint title is the secondary text role, as the row's meta line is.
            const colors = await page.locator('.index tanrei-list-item[href="/components/fab-menu/"]').evaluate((row) => ({ title: getComputedStyle(row.querySelector('.title')).color, meta: getComputedStyle(row.querySelector('.meta')).color }));
            assert.equal(colors.title, colors.meta);
            // The group of the layer the default system does not descend from is faint too; its rows say why.
            const group = page.locator('.docs-sidebar tanrei-navigation-drawer-group:has(> tanrei-navigation-drawer-item[href="/components/fab-menu/"])');
            assert.equal(await group.evaluate((element) => element.hasAttribute('data-docs-faint')), true);
            // The words stand under the label, which keeps its room (where the sidebar stands beside the content).
            if (!compact) {
              const fit = await page.locator('.docs-sidebar tanrei-navigation-drawer-item[href="/components/segmented-button/"]').evaluate(async (item) => {
                const group = item.closest('tanrei-navigation-drawer-group');
                group.open = true;
                await group.updateComplete;
                await item.updateComplete;
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const label = item.shadowRoot.querySelector('.label').getBoundingClientRect();
                const supporting = item.shadowRoot.querySelector('.supporting').getBoundingClientRect();
                return { label: label.width > 0, below: supporting.top >= label.bottom - 1 };
              });
              assert.deepEqual(fit, { label: true, below: true });
            }
            // The line of what the default system does not have, with what it uses instead.
            const line = page.locator(`[data-docs-system-only="${DEFAULT}"].absent`);
            await line.waitFor();
            for (const href of ['/components/fab-menu/', '/components/main-action-button/', '/components/bottom-sheet/']) assert.equal(await line.locator(`a[href="${href}"]`).count(), 1, href);
            assert.equal(await page.locator('.absent[data-docs-system-only]').count(), 1, 'only the chosen system’s line');

            await choose(page, 'm3-like', compact);
            assert.deepEqual(await rows(page, 'fab-menu'), whole());
            assert.deepEqual(await rows(page, 'segmented-button'), whole());
            assert.equal(await page.locator('[data-docs-faint]').count(), 0, 'm3-like has everything');
            assert.equal(await page.locator('[data-docs-system-only]').count(), 0, 'and nothing is said of it');
            assert.equal(await kept(page), 'm3-like');
            assert.deepEqual(await saidByTheHeader(page), { groups: ['m3-like', 'm3-like'], names: ['m3-like', 'm3-like'] }, 'the header’s panels and buttons say the same');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no row is wider than the window');

            // Another page, from the first frame: the head's script read the choice.
            const next = await open(context, '/components/');
            assert.equal(await next.evaluate(() => document.documentElement.getAttribute('data-docs-system')), 'm3-like');
            assert.deepEqual(await rows(next, 'fab-menu'), whole());

            await choose(next, DEFAULT, compact);
            assert.deepEqual(await rows(next, 'fab-menu'), faint(DEFAULT));
            assert.deepEqual(await rows(next, 'segmented-button'), faint(DEFAULT));
            await choose(next, 'cupertino', compact);
            assert.deepEqual(await rows(next, 'fab-menu'), faint('cupertino'));
            assert.deepEqual(await rows(next, 'segmented-button'), whole());
          } finally {
            await context.close();
          }
        });

        test('the FAB menu’s page, under the default system, keeps its row in the sidebar, faint, and its note names a main action button and a bottom sheet instead and says the lists still show it', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/components/fab-menu/');
            assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-docs-system')), DEFAULT);
            const own = await rows(page, 'fab-menu');
            assert.equal(own.sidebar, 1, 'the page being read is never nowhere');
            assert.equal(own.faint.sidebar, true);
            assert.match(own.said.description, new RegExp(notIn(DEFAULT)));
            const note = page.locator('[data-docs-availability-note]');
            assert.equal(await note.count(), 1);
            for (const href of ['/components/main-action-button/', '/components/bottom-sheet/']) assert.equal(await note.locator(`a[href="${href}"]`).count(), 1, href);
            const text = await note.innerText();
            for (const id of [DEFAULT, 'cupertino', 'm3-like']) assert.match(text, new RegExp(`\\b${id}\\b`), id);
            assert.ok(text.includes(strings('en').system.listed), 'the note says the lists still show it, marked');
            assert.match(text, /"from": "m3-like"/);
            assert.match(text, /@tanrei\/web\/components\/fab-menu/);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
            // A component every system has carries no such note.
            const button = await open(context, '/components/button/');
            assert.equal(await button.locator('[data-docs-availability-note]').count(), 0);
          } finally {
            await context.close();
          }
        });

        test('the presets page holds the facts of every preset and fits the window', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/getting-started/presets/');
            assert.deepEqual((await page.locator('[data-docs-preset]').evaluateAll((all) => all.map((node) => node.getAttribute('data-docs-preset')))).sort(), [...presets].sort());
            for (const id of presets) {
              const facts = await page.locator(`[data-docs-preset="${id}"]`).innerText();
              assert.match(facts, new RegExp(`@tanrei/web/systems/${id}\\.css`), id);
              assert.match(facts, new RegExp(`data-tanrei-system="${id}"`), id);
              assert.match(facts, new RegExp(`${manifestOf(id).components.length}\\b`), id);
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
          } finally {
            await context.close();
          }
        });
      });
    }
  });
}

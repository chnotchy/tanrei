// The lists of components and the reader's look on the built site (the header's Appearance panel,
// components/frame/Appearance.astro, which a compact window puts first in the drawer; lib/list-filter.ts): the
// lists — the sidebar's and the index's — have no choice of system of their own, and do not follow the look either:
// the look is how the site is drawn, not which product's catalogue is read, so every component stays in both lists,
// marked by nothing but its listing, under every look. The look is chosen in the header, said on its button and kept
// across pages. The page of a component some systems do not have says which, and what they use instead
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
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { watchNetwork } from './network-quiet.mjs';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the FAB menu’s page at
// 1440, took 21 s in CI.
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const manifestOf = (id) => JSON.parse(fs.readFileSync(path.join(repo, `tokens/generated/${id}/components.json`), 'utf8'));
const presets = fs.readdirSync(path.join(repo, 'tokens/generated')).filter((id) => id !== DEFAULT && fs.existsSync(path.join(repo, `tokens/generated/${id}/components.json`)));
/** The components some shipped system does not have: what a list that followed the look would mark or leave out. */
const leftOut = [...new Set([DEFAULT, ...presets].flatMap((id) => manifestOf(id).omitted.map((entry) => entry.name)))];

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
 * A component's rows in each list now: how many the index and the sidebar hold, and what the index's row says at its
 * end and the sidebar's row as its supporting text and its link's description.
 */
const rows = async (page, name) => {
  // The sidebar's rows updated first (bounded: launch.mjs).
  await settlePage(page, { update: `.docs-sidebar tanrei-navigation-drawer-item[href="/components/${name}/"]`, fonts: false, frames: 0 });
  return page.evaluate((href) => {
    const index = [...document.querySelectorAll(`.index tanrei-list-item[href="${href}"]`)];
    const sidebar = [...document.querySelectorAll(`.docs-sidebar tanrei-navigation-drawer-item[href="${href}"]`)];
    const anchor = sidebar[0]?.shadowRoot?.querySelector('a');
    return {
      index: index.length,
      sidebar: sidebar.length,
      said: {
        index: index[0]?.querySelector('.end')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
        supporting: sidebar[0]?.getAttribute('supporting-text') ?? '',
        description: anchor?.getAttribute('aria-description') ?? '',
      },
    };
  }, `/components/${name}/`);
};

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
  await page.waitForFunction((id) => document.documentElement.getAttribute('data-docs-look') === id, system);
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

        test('the lists do not follow the look: under every system each component is in both lists, and nothing is said of the system', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/components/');
            assert.ok(leftOut.length > 0, 'the premise: a shipped system leaves a component out');
            // Under the default system: each such component's rows, which say nothing of any system.
            const under = new Map();
            for (const name of leftOut) {
              const drawn = await rows(page, name);
              assert.deepEqual([drawn.said.supporting, drawn.said.description], ['', ''], `${name}: the sidebar says nothing of a system`);
              assert.ok(![DEFAULT, ...presets].some((id) => drawn.said.index.includes(id)), `${name}: the index says nothing of a system (${drawn.said.index})`);
              under.set(name, drawn);
            }
            assert.ok([...under.values()].some((drawn) => drawn.index === 1 && drawn.sidebar === 1), 'the premise: a component a system leaves out is in both lists');
            // Under every other look: the same rows.
            for (const look of presets) {
              await choose(page, look, compact);
              for (const name of leftOut) assert.deepEqual(await rows(page, name), under.get(name), `${look}: ${name}`);
              assert.equal(await page.locator('[data-docs-faint], [data-docs-system-only], [data-docs-absent-from]').count(), 0, `${look}: no row marked by a system`);
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no row is wider than the window');
          } finally {
            await context.close();
          }
        });

        test('the FAB menu’s page keeps its row in the sidebar as any other, and its note names a main action button and a bottom sheet instead', LIMIT, async () => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          try {
            const page = await open(context, '/components/fab-menu/');
            assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-docs-look')), DEFAULT);
            const own = await rows(page, 'fab-menu');
            assert.equal(own.sidebar, 1, 'the page being read is never nowhere');
            assert.deepEqual([own.said.supporting, own.said.description], ['', ''], 'nothing said of the look');
            const note = page.locator('[data-docs-availability-note]');
            assert.equal(await note.count(), 1);
            for (const href of ['/components/main-action-button/', '/components/bottom-sheet/']) assert.equal(await note.locator(`a[href="${href}"]`).count(), 1, href);
            const text = await note.innerText();
            for (const id of [DEFAULT, 'cupertino', 'm3-like']) assert.match(text, new RegExp(`\\b${id}\\b`), id);
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

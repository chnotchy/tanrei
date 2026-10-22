// The choice of design system on the built site, as a reader makes it (components/SystemSelect.astro,
// lib/list-filter.ts): the lists of components — the sidebar's and the index's — show the components of the chosen
// system, the default one until the reader chooses, and the choice is kept across pages; the page of a component some
// systems do not have says which, and what they use instead (components/ComponentAvailability.astro); the presets page
// holds the facts of every preset. At a phone's width (390 px) and a desktop's (1440 px).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` (the site) and the generated manifests, and serves the site itself on a free port, as the host does
// (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { watchNetwork } from './network-quiet.mjs';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const manifestOf = (id) => JSON.parse(fs.readFileSync(path.join(repo, `tokens/generated/${id}/components.json`), 'utf8'));
const presets = fs.readdirSync(path.join(repo, 'tokens/generated')).filter((id) => id !== DEFAULT && fs.existsSync(path.join(repo, `tokens/generated/${id}/components.json`)));

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

/** A page at `width`, loaded and quiet; the context (and its storage) is the caller's to close. */
async function open(context, url) {
  const page = await context.newPage();
  const network = await watchNetwork(page);
  await page.goto(origin + url, { waitUntil: 'load' });
  await network.quiet();
  await page.waitForFunction(() => customElements.get('tanrei-select-field') && customElements.get('tanrei-navigation-drawer'));
  return page;
}

/** How many rows of a component's page each list holds now: the index's, and the sidebar's. */
const rows = (page, name) =>
  page.evaluate((href) => ({ index: document.querySelectorAll(`.index tanrei-list-item[href="${href}"]`).length, sidebar: document.querySelectorAll(`.docs-sidebar tanrei-navigation-drawer-item[href="${href}"]`).length }), `/components/${name}/`);

/** Chooses `system` in the index's select, as a reader does: the trigger, then the option. */
async function choose(page, system) {
  const field = page.locator('.index .docs-system');
  await field.getByRole('combobox').click();
  await field.getByRole('option', { name: new RegExp(`^${system}\\b`) }).click();
  await page.waitForFunction((id) => document.documentElement.getAttribute('data-docs-system') === id, system);
}

for (const width of [390, 1440]) {
  describe(`at ${width} px`, () => {
    test('the index shows the default system’s components until the reader chooses m3-like, which shows the FAB menu; the choice is kept', async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        const page = await open(context, '/components/');
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-docs-system')), DEFAULT);
        for (const name of manifestOf(DEFAULT).omitted.map((entry) => entry.name)) assert.deepEqual(await rows(page, name), { index: 0, sidebar: 0 }, `${DEFAULT}: ${name}`);
        assert.deepEqual(await rows(page, 'button'), { index: 1, sidebar: 1 });
        // The line of what the default system does not have, with what it uses instead.
        const line = page.locator(`[data-docs-system-only="${DEFAULT}"]`);
        await line.waitFor();
        for (const href of ['/components/fab-menu/', '/components/main-action-button/', '/components/bottom-sheet/']) assert.equal(await line.locator(`a[href="${href}"]`).count(), 1, href);
        assert.equal(await page.locator('[data-docs-system-only]').count(), 1, 'only the chosen system’s line');

        await choose(page, 'm3-like');
        assert.deepEqual(await rows(page, 'fab-menu'), { index: 1, sidebar: 1 });
        assert.deepEqual(await rows(page, 'segmented-button'), { index: 1, sidebar: 1 });
        assert.equal(await page.locator('[data-docs-system-only]').count(), 0, 'm3-like has everything');
        assert.equal(await page.evaluate(() => localStorage.getItem('tanrei-docs-tabs-system')), 'm3-like');
        assert.equal(await page.locator('.docs-sidebar .docs-system').evaluate((field) => field.value), 'm3-like', 'every select says the same');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no row is wider than the window');

        // Another page, from the first frame: the head's script read the choice.
        const next = await open(context, '/components/');
        assert.equal(await next.evaluate(() => document.documentElement.getAttribute('data-docs-system')), 'm3-like');
        assert.deepEqual(await rows(next, 'fab-menu'), { index: 1, sidebar: 1 });
        assert.equal(await next.locator('.index .docs-system').evaluate((field) => field.value), 'm3-like');

        await choose(next, DEFAULT);
        assert.deepEqual(await rows(next, 'fab-menu'), { index: 0, sidebar: 0 });
        assert.deepEqual(await rows(next, 'segmented-button'), { index: 0, sidebar: 0 });
        await choose(next, 'cupertino');
        assert.deepEqual(await rows(next, 'fab-menu'), { index: 0, sidebar: 0 });
        assert.deepEqual(await rows(next, 'segmented-button'), { index: 1, sidebar: 1 });
      } finally {
        await context.close();
      }
    });

    test('the FAB menu’s page, under the default system, keeps its row in the sidebar and names a main action button and a bottom sheet instead', async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        const page = await open(context, '/components/fab-menu/');
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-docs-system')), DEFAULT);
        assert.equal((await rows(page, 'fab-menu')).sidebar, 1, 'the page being read is never nowhere');
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

    test('the presets page holds the facts of every preset and fits the window', async () => {
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

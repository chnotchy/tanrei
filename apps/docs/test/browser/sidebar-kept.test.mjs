// What the sidebar keeps (components/frame/Sidebar.astro), in each engine: the width the reader gives the navigation
// drawer and whether they fold it to its column are kept across visits, in the origin's localStorage, and given back
// before the drawer is first drawn; which groups are open is kept for the tab only (sessionStorage), so a new tab has
// the reader's width but the groups as the page writes them. A width kept that is out of the drawer's range is held in
// it, and one that does not parse is not given back. Where storage throws (a private window), nothing is kept and the
// page works as before.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/sidebar-kept.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';
import { SETTLE } from './waits.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

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

const PAGE = '/foundations/accessibility/';
const WIDE = { width: 1440, height: 800 };
const DRAWER = 'tanrei-navigation-drawer.docs-sidebar';
/** Where the width and the fold are kept (Sidebar.astro). */
const KEY = 'tanrei-docs-sidebar-layout';

/** Waits until the drawer is defined, drawn and at rest, each wait bounded (launch.mjs; its motion given `SETTLE.frames`). */
const ready = async (page) => {
  await settlePage(page, { tags: ['tanrei-app-shell', 'tanrei-navigation-drawer'], update: DRAWER, fonts: false, frames: 0 });
  const moving = await page.evaluate(
    async ([selector, ms]) => {
      const motions = document.querySelector(selector).getAnimations({ subtree: true });
      let timer;
      await Promise.race([Promise.all(motions.map((motion) => motion.finished.catch(() => {}))), new Promise((resolve) => (timer = setTimeout(resolve, ms)))]);
      clearTimeout(timer);
      return motions.filter((motion) => motion.playState === 'running').map((motion) => motion.animationName || motion.transitionProperty || 'an animation');
    },
    [DRAWER, SETTLE.frames],
  );
  if (moving.length) throw new Error(`${page.url()}: the drawer still moves after ${SETTLE.frames / 1000} s (${moving.join(', ')})`);
  await settlePage(page, { fonts: false });
};

/** The drawer as it is drawn: its width, whether it is folded, what it was given, and what is kept. */
const seen = (page) =>
  page.evaluate((key) => {
    const drawer = document.querySelector('tanrei-navigation-drawer.docs-sidebar');
    let kept = null;
    try {
      kept = JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {}
    return {
      drawn: Math.round(drawer.getBoundingClientRect().width),
      width: drawer.width,
      collapsed: drawer.collapsed,
      expanded: drawer.expanded,
      kept,
      groups: [...drawer.querySelectorAll(':scope > tanrei-navigation-drawer-group')].map((group) => !!group.open),
    };
  }, KEY);

for (const engine of ENGINES) {
  describe(`what the sidebar keeps, in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (context, url = PAGE) => {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${origin}${url}`);
      await ready(page);
      return { page, errors };
    };
    const handle = (page) => page.locator(`${DRAWER} tanrei-handle [role="separator"]`);

    test('resized, then reloaded: drawn at the same width; a new tab has the width but not the groups the reader opened', LIMIT, async () => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce' });
      try {
        const { page, errors } = await open(context);
        const before = await seen(page);
        assert.equal(before.kept, null, 'nothing is kept before the reader changes anything');
        await handle(page).focus();
        for (let n = 0; n < 4; n++) await page.keyboard.press('ArrowRight');
        await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) ?? '{}').width > 0, KEY);
        const resized = await seen(page);
        assert.equal(resized.drawn, before.drawn + 40, 'four steps of 10 widen the drawer by 40');
        assert.deepEqual(resized.kept, { width: resized.width }, 'the width the drawer fired is kept');

        // A group the reader opened, kept for this tab.
        const closed = before.groups.indexOf(false);
        assert.ok(closed >= 0, 'a group is closed to begin with');
        await page.evaluate((index) => {
          const group = document.querySelectorAll('tanrei-navigation-drawer.docs-sidebar > tanrei-navigation-drawer-group')[index];
          group.open = true;
          group.dispatchEvent(new Event('toggle', { bubbles: true }));
        }, closed);

        await page.reload();
        await ready(page);
        const reloaded = await seen(page);
        assert.equal(reloaded.drawn, resized.drawn, 'drawn at the width the reader gave it');
        assert.equal(reloaded.width, resized.width);
        assert.equal(reloaded.groups[closed], true, 'the group the reader opened is open again in the same tab');

        const { page: other, errors: otherErrors } = await open(context);
        const fresh = await seen(other);
        assert.equal(fresh.drawn, resized.drawn, 'a new tab has the width');
        assert.deepEqual(fresh.groups, before.groups, 'and the groups as the page writes them');
        assert.deepEqual([...errors, ...otherErrors], []);
      } finally {
        await context.close();
      }
    });

    test('folded to its column, then reloaded: still folded, and unfolded at the width it had', LIMIT, async () => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce' });
      try {
        const { page, errors } = await open(context);
        const before = await seen(page);
        await handle(page).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) ?? '{}').expanded === false, KEY);
        const folded = await seen(page);
        assert.equal(folded.collapsed, true, 'Enter on the handle folds the drawer to its column');

        await page.reload();
        await ready(page);
        const reloaded = await seen(page);
        assert.equal(reloaded.collapsed, true, 'still folded');
        assert.equal(reloaded.drawn, folded.drawn, 'at the column\'s width');

        await handle(page).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) ?? '{}').expanded === true, KEY);
        await ready(page);
        assert.equal((await seen(page)).drawn, before.drawn, 'unfolded, it is drawn at its width again');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('a kept width out of the drawer\'s range is held in it; one that does not parse is not given back', LIMIT, async () => {
      for (const [stored, expect] of [
        [JSON.stringify({ width: 100000 }), 'most'],
        [JSON.stringify({ width: 1 }), 'least'],
        ['{not json', 'default'],
        [JSON.stringify({ width: 'wide', expanded: 'no' }), 'default'],
        [JSON.stringify([320]), 'default'],
      ]) {
        const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce' });
        try {
          await context.addInitScript(
            ([key, value]) => {
              if (location.protocol === 'http:' && !sessionStorage.getItem('seeded')) {
                localStorage.setItem(key, value);
                sessionStorage.setItem('seeded', '1');
              }
            },
            [KEY, stored],
          );
          const { page, errors } = await open(context);
          const range = await page.evaluate(() => {
            const probe = (token) => {
              const span = document.createElement('span');
              span.style.cssText = `position:absolute;inline-size:var(${token})`;
              document.body.append(span);
              const width = span.getBoundingClientRect().width;
              span.remove();
              return Math.round(width);
            };
            return {
              least: probe('--tanrei-comp-navigation-drawer-container-min-width'),
              most: probe('--tanrei-comp-navigation-drawer-container-max-width'),
              default: probe('--tanrei-comp-navigation-drawer-container-width'),
            };
          });
          const drawn = await seen(page);
          assert.equal(drawn.drawn, range[expect], `${stored}: drawn at the ${expect} width`);
          assert.equal(drawn.collapsed, false, `${stored}: not folded`);
          if (expect === 'default') assert.equal(drawn.width, null, `${stored}: no width given`);
          else assert.equal(drawn.width, range[expect], `${stored}: given as the ${expect} width`);
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      }
    });

    test('where storage throws, nothing is kept and the sidebar works as before', LIMIT, async () => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(() => {
          const refuse = () => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          };
          for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { get: refuse, configurable: true });
        });
        const { page, errors } = await open(context);
        const before = await seen(page);
        await handle(page).focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((width) => Math.round(document.querySelector('tanrei-navigation-drawer.docs-sidebar').getBoundingClientRect().width) === width + 10, before.drawn);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').collapsed === true);
        await page.reload();
        await ready(page);
        const reloaded = await seen(page);
        assert.equal(reloaded.drawn, before.drawn, 'nothing was kept: drawn at the default width');
        assert.equal(reloaded.collapsed, false);
        assert.deepEqual(
          errors.filter((message) => !/insecure/i.test(message)),
          [],
          'no error but what the page\'s other scripts say of the storage refused them',
        );
      } finally {
        await context.close();
      }
    });
  });
}

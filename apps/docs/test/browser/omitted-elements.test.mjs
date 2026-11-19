// The site defines only what `@tanrei/web` registers, the default system's components, as the built site draws it
// (lib/define-on-demand.ts, lib/omitted-elements.ts), in each engine: an element of a component the default system does
// not have — the segmented button, the FAB menu — added to a page stays undefined, as in a product on `@tanrei/web`,
// whatever design system the reader chose, while an element of the default system's added beside it is defined; it is
// defined on its own page, and in a frame pinned to a system that has it, and not in one pinned to a system that does
// not. And a value of `variant` the default system leaves out is drawn only in a frame pinned to a system that has it
// (below). Where each such element of the built pages stands is held in test/own-ui.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/omitted-elements.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultSystemContext } from '../../../../packages/tools/src/own-ui.js';
import { DEFAULT_SYSTEM } from '../../src/lib/element-modules.mjs';
import { serveDist } from './host.mjs';
import { engines, launch, settle, settlePage } from './launch.mjs';

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

/** An element of the default system's that no page below draws: added beside the others, it says the loader has seen them. */
const WITNESS = 'tanrei-calendar';

/**
 * Adds `tags` and the witness into `where` (a selector; the page's main region by default), waits until the witness is
 * defined and two frames are drawn, and says which of `tags` were defined.
 */
async function added(page, tags, where = 'main') {
  assert.equal(await page.evaluate((tag) => customElements.get(tag) === undefined, WITNESS), true, `${WITNESS} is not defined on ${page.url()} before it is added`);
  await page.evaluate(
    ({ tags, where, witness }) => {
      const holder = document.createElement('div');
      holder.dataset.testAdded = '';
      for (const tag of [...tags, witness]) holder.append(document.createElement(tag));
      document.querySelector(where).append(holder);
    },
    { tags, where, witness: WITNESS },
  );
  await settlePage(page, { tags: [WITNESS], fonts: false });
  // One more turn for a module asked for beside the witness's.
  await page.waitForTimeout(500);
  return page.evaluate((tags) => tags.filter((tag) => customElements.get(tag) !== undefined), tags);
}

/** Adds one element of `tag` into `where` and says whether it is defined within five seconds. */
const definedIn = (page, tag, where) =>
  page.evaluate(
    ({ tag, where }) => {
      document.querySelector(where).append(document.createElement(tag));
      return Promise.race([customElements.whenDefined(tag).then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5000))]);
    },
    { tag, where },
  );

for (const engine of ENGINES) {
  describe(`the components the default system does not have, in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    test('on another component’s page they stay undefined, whatever system the reader chose; the default system’s own is defined', LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/components/button/`);
      await settlePage(page);
      assert.deepEqual(await added(page, ['tanrei-segmented-button', 'tanrei-segment', 'tanrei-fab-menu', 'tanrei-fab-menu-item']), []);
      assert.equal(await page.locator('[data-test-added] tanrei-segmented-button:not(:defined)').count(), 1);
      await page.close();
      // The reader chose a preset that has them: what the page may use does not change.
      const chosen = await context.newPage();
      await chosen.goto(`${origin}/components/tabs/`);
      await settlePage(chosen);
      await chosen.evaluate(() => document.documentElement.setAttribute('data-docs-system', 'm3-like'));
      assert.deepEqual(await added(chosen, ['tanrei-segmented-button', 'tanrei-fab-menu']), []);
      await context.close();
    });

    test('on its own page it is defined, and another such component is not', LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/ja/components/segmented-button/`);
      await settlePage(page);
      assert.deepEqual(await added(page, ['tanrei-segmented-button', 'tanrei-fab-menu']), ['tanrei-segmented-button']);
      await context.close();
    });

    test('in a frame pinned to a system that has it, it is defined; in one pinned to a system that does not, it is not', LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/foundations/design-systems/`);
      await settlePage(page);
      const stage = (id) => `[data-docs-shows-system="${id}"]`;
      await settle(page, stage('cupertino'), { scroll: 'center' });
      // The cupertino preset has the segmented button and not the FAB menu; the m3-like preset has both.
      assert.deepEqual(await added(page, ['tanrei-fab-menu'], stage('cupertino')), [], 'the FAB menu, in the cupertino stage');
      assert.equal(await definedIn(page, 'tanrei-segmented-button', stage('cupertino')), true, 'the segmented button, in the cupertino stage');
      assert.equal(await definedIn(page, 'tanrei-fab-menu', stage('m3-like')), true, 'the FAB menu, in the m3-like stage');
      await context.close();
    });
  });
}

// ── The variants the default system leaves out ──────────────────────────────────────────────────────────────────────
// A value of a component's `variant` the default system leaves out (the text field's `outlined`) still draws in a
// product on `@tanrei/web`, and a debug build reports it; the site uses one only in a frame pinned to a system that has
// it. Each page below is scrolled from top to bottom, so that every stage is drawn as a reader meets it (a stage's
// window is emptied again once it is far from the view), and at each step every element of the page, of every shadow
// root and of every stage's window, is read: its `variant` (the property where it is defined, else the attribute) and
// the system of the nearest pinned frame around it. A playground offers no such value either.

const fromLayers = defaultSystemContext();
const leftOut = fromLayers.shipped.get(DEFAULT_SYSTEM).omittedVariants;
const hasVariant = (system, component, variant) => {
  const manifest = fromLayers.shipped.get(system);
  return Boolean(manifest?.components.some((each) => each.name === component) && !(manifest.omittedVariants[component] ?? []).includes(variant));
};
/** The pages that draw what the default system leaves out on purpose — each component's own, and the field's, whose fixtures hold them — and two of the site's own. */
const VARIANT_PAGES = [...Object.keys(leftOut).map((name) => `/components/${name}/`), '/components/field/', '/', '/foundations/design-systems/'];

/** Every use of a value in `leftOut` the page draws as it is scrolled through, with the pinned system around it, and the values its playground offers. */
async function variantUses(page, leftOut) {
  return page.evaluate(
    async ({ leftOut, shows }) => {
      const prefix = 'tanrei-';
      const found = new Map();
      const pinnedAround = (element) => {
        for (let at = element; at; ) {
          const pinned = at.closest(`[${shows}]`);
          if (pinned) return pinned.getAttribute(shows);
          const root = at.getRootNode();
          at = root instanceof ShadowRoot ? root.host : (root.defaultView?.frameElement ?? null);
        }
        return null;
      };
      const read = (root) => {
        for (const element of root.querySelectorAll('*')) {
          const component = element.localName.startsWith(prefix) ? element.localName.slice(prefix.length) : null;
          const variant = typeof element.variant === 'string' ? element.variant : element.getAttribute('variant');
          if (component && leftOut[component]?.includes(variant)) {
            const where = pinnedAround(element);
            found.set(`${element.localName}:${variant}:${where}`, { component, variant, shows: where });
          }
          if (element.shadowRoot) read(element.shadowRoot);
          if (element.localName === 'iframe' && element.contentDocument) read(element.contentDocument);
        }
      };
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      // A stage drawn in the page keeps what it drew; a window is emptied once it is far from the view, so the windows
      // are read at each step and the whole page once at the end.
      for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight) {
        scrollTo(0, y);
        await frame();
        await new Promise((resolve) => setTimeout(resolve, 60));
        for (const stageWindow of document.querySelectorAll('iframe')) if (stageWindow.contentDocument) read(stageWindow.contentDocument);
      }
      read(document);
      const offered = [...document.querySelectorAll('[data-playground]')].flatMap((playground) => [...playground.querySelectorAll('[data-playground-prop="variant"] tanrei-tab')].map((tab) => ({ component: playground.dataset.playground, variant: tab.getAttribute('value') })));
      return { uses: [...found.values()], offered };
    },
    { leftOut, shows: 'data-docs-shows-system' },
  );
}

for (const engine of ENGINES) {
  describe(`the variants the default system leaves out, in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const address of VARIANT_PAGES) {
      test(`${address}: each is drawn only in a frame pinned to a system that has it, and no playground offers one`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`${origin}${address}`);
        await settlePage(page);
        const { uses, offered } = await variantUses(page, leftOut);
        const stray = uses.filter(({ component, variant, shows }) => !(shows && hasVariant(shows, component, variant))).map(({ component, variant, shows }) => `${component}:${variant}${shows ? ` under ${shows}` : ''}`);
        assert.deepEqual(stray, [], `${address}: drawn outside a frame pinned to a system that has it`);
        assert.deepEqual(offered.filter(({ component, variant }) => leftOut[component]?.includes(variant)).map(({ component, variant }) => `${component}:${variant}`), [], `${address}: offered by its playground`);
        if (address.startsWith('/components/') && address !== '/components/field/' && leftOut[address.split('/')[2]]) assert.ok(uses.length > 0, `${address} documents what the default system leaves out, under a system that has it`);
        await context.close();
      });
    }
  });
}

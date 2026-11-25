// The site's focus ring and a component that draws its own, in a built page, in each engine (src/styles/tanrei-theme.css).
//
// The site gives everything that takes focus a ring (`:focus-visible { outline: … }`). A component whose host takes
// focus itself — a tab, a tab panel, a list item, a menubar's menu — draws its indicator on a box inside, and its
// `:host { outline: none }` lost to the site's rule (a page's normal rules win over a shadow root's): the site's
// rectangle was drawn around the host on top of the component's ring. The host now says it `!important`, which no
// rule of the page outweighs. Each case moves focus by the keyboard to such a host and reads that the host draws no
// outline while the component's own indicator, in its shadow root, does; and that the site's ring still reaches what
// draws none of its own (the skip link).
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/focus-own-indicator.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 90_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');
let host;
before(async () => {
  host = await serveDist(dist);
});
after(async () => {
  await host?.close();
});

/**
 * Each case: the page, the element given focus first (from script, the one Tab stop of its group), and the key that
 * then moves focus, by the keyboard, to the host that is read; the tag that host has.
 */
const CASES = [
  { what: 'a tab', url: '/components/tabs/', start: 'main tanrei-tabs tanrei-tab[tabindex="0"]', key: 'ArrowRight', tag: 'tanrei-tab' },
  { what: 'a tab panel', url: '/components/tabs/', start: 'main tanrei-tabs tanrei-tab[tabindex="0"]', key: 'Tab', tag: 'tanrei-tab-panel' },
  { what: 'an option of a list', url: '/components/list/', start: 'main tanrei-list[selection] tanrei-list-item[tabindex="0"]', key: 'ArrowDown', tag: 'tanrei-list-item' },
  { what: "a menubar's menu", url: '/components/menubar/', start: 'main tanrei-menubar tanrei-menubar-menu[tabindex="0"]', key: 'ArrowRight', tag: 'tanrei-menubar-menu' },
];

/** What the focused element draws: its own outline, and each outline drawn in its shadow root (a box, or its `::before`). */
const READ_FOCUSED = () => {
  const focused = document.activeElement;
  const own = [];
  for (const element of focused.shadowRoot?.querySelectorAll('*') ?? []) {
    for (const pseudo of [null, '::before']) {
      const style = getComputedStyle(element, pseudo);
      if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) own.push(`${element.localName}.${element.classList[0] ?? ''}${pseudo ?? ''}`);
    }
  }
  const style = getComputedStyle(focused);
  return { tag: focused.localName, visible: focused.matches(':focus-visible'), outline: style.outlineStyle, own };
};

for (const engine of ENGINES) {
  describe(`the site's focus ring and a component's own, in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (url) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`${host.origin}${url}`);
      return { context, page };
    };

    for (const { what, url, start, key, tag } of CASES) {
      test(`${what} focused by the keyboard is drawn by its own indicator, with no outline of the page's around it`, LIMIT, async () => {
        const { context, page } = await open(url);
        try {
          await page.waitForFunction(
            ({ start, tag }) => customElements.get(tag) && document.querySelector(start),
            { start, tag },
          );
          await page.evaluate((start) => {
            const first = document.querySelector(start);
            first.scrollIntoView({ block: 'center' });
            first.focus();
          }, start);
          await page.keyboard.press(key);
          await page.waitForFunction((tag) => document.activeElement?.localName === tag, tag);
          const focused = await page.evaluate(READ_FOCUSED);
          assert.equal(focused.visible, true, `the ${tag} shows focus (:focus-visible)`);
          assert.equal(focused.outline, 'none', `the page draws no outline around the ${tag}`);
          assert.ok(focused.own.length > 0, `the ${tag} draws its own indicator in its shadow root`);
        } finally {
          await context.close();
        }
      });
    }

    test("the site's ring still reaches what draws none of its own: the skip link", LIMIT, async () => {
      const { context, page } = await open('/components/tabs/');
      try {
        // WebKit's Tab key passes over links unless Option is held, as Safari's does by default.
        await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        const focused = await page.evaluate(() => ({ tag: document.activeElement.localName, outline: getComputedStyle(document.activeElement).outlineStyle }));
        assert.equal(focused.tag, 'a', 'the first Tab stop is the skip link');
        assert.equal(focused.outline, 'solid', "it is drawn with the site's ring");
      } finally {
        await context.close();
      }
    });
  });
}

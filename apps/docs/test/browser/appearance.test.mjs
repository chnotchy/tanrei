// The reader's appearance as the site draws and keeps it (src/lib/appearance.ts, components/frame/Appearance.astro,
// Header.astro), in each engine: the header's panel chooses the color mode, the contrast and the look, and every
// choice is on `<html>` at once, kept under one key and there from the first paint of the next page; the bar's toggle
// switches light and dark; the device's scheme is followed while the mode is the device's; another tab follows a
// choice; a link that shares an appearance shows it on its page, keeps nothing until the reader keeps it, and is what
// the panel's "Copy link" copies; and in a compact window the drawer's button opens the same panel.
//
// And the look draws the whole site, the one way for every look (one stylesheet over the default system's on the
// root): under the default system, each gallery example and the reader's own theme, the app bar, the sidebar's selected
// row, the content's text, a stage's button, a playground's control and a dialog open in the top layer are each drawn
// in what that look resolves their tokens to (a gallery example's from disk, `design/tokens/<id>/`; the reader's
// theme's as its sheet gives the root), from the first frame of the next page. No element of a built page is drawn
// under a system's own scope but a figure that compares systems and a frame a page pins to one.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/appearance.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { bounded, engines, launch, settlePage } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const { APPEARANCE_KEY, CUSTOM_KEY, CUSTOM_LOOK, LOOK_SHEET_ID, PENDING_ATTR } = await import('../../src/lib/appearance.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
const repo = path.join(docs, '../..');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const SHOWCASE = 'cupertino';
/** The theme gallery's examples: every shipped system but the default, as its components manifest names it. */
const GALLERY = fs
  .readdirSync(path.join(repo, 'tokens/generated'))
  .filter((id) => id !== DEFAULT && fs.existsSync(path.join(repo, 'tokens/generated', id, 'components.json')))
  .sort();

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
const COMPACT = { width: 390, height: 800 };
const en = strings('en');

/** What `<html>` says, and what storage holds. */
const root = (page) =>
  page.evaluate((key) => {
    const html = document.documentElement;
    return { theme: html.dataset.theme, tanreiTheme: html.dataset.tanreiTheme, mode: html.dataset.docsMode, contrast: html.getAttribute('data-tanrei-contrast'), look: html.dataset.docsLook, shared: html.hasAttribute('data-docs-appearance-shared'), stored: JSON.parse(localStorage.getItem(key) ?? 'null') };
  }, APPEARANCE_KEY);

/** The look's stylesheet in the page: its element and the address it links, or null. */
const lookSheet = (page) => page.evaluate((id) => (document.getElementById(id) ? { as: document.getElementById(id).localName, href: document.getElementById(id).getAttribute('href') } : null), LOOK_SHEET_ID);

// Each test's limit: the backstop for what has no limit of its own (launch.mjs). The slowest takes about 43 s in CI
// (the shared link, in Firefox and WebKit).
const LIMIT = { timeout: 150_000 };

/** The page's controls defined, its fonts in, and two frames drawn after both (each wait bounded: launch.mjs). */
const settled = (page) => settlePage(page, { tags: ['tanrei-app-bar', 'tanrei-button'] });

/** Opens the panel of the button `id` (the bar's, or the drawer's) and waits for it. */
async function openPanel(page, id = 'docs-appearance') {
  await page.locator(`#${id}`).click();
  const panel = page.locator(`tanrei-popover[anchor="${id}"]`);
  await page.waitForFunction((anchor) => document.querySelector(`tanrei-popover[anchor="${anchor}"]`)?.open === true, id);
  return panel;
}

// ── What a look resolves a token to ─────────────────────────────────────────────────────────────────────────────────

/** A shipped system's resolved tokens in the light scheme, from disk (the default system's files are at the top). */
const resolvedFiles = new Map();
const resolvedIn = (system, dotted) => {
  const file = system === DEFAULT ? `design/tokens/${DEFAULT}.light.tokens.json` : `design/tokens/${system}/${DEFAULT}.light.tokens.json`;
  if (!resolvedFiles.has(file)) resolvedFiles.set(file, JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8')));
  return `${DEFAULT}.${dotted}`.split('.').reduce((node, key) => node?.[key], resolvedFiles.get(file))?.$value;
};
/** A resolved color as a browser computes it: `rgb()`, or `rgba()` where it is not opaque. */
const rgbOf = (color) => {
  const [r, g, b] = color.components.map((c) => Math.round(c * 255));
  return (color.alpha ?? 1) < 1 ? `rgba(${r}, ${g}, ${b}, ${color.alpha})` : `rgb(${r}, ${g}, ${b})`;
};
/** A computed color as `rgb()`/`rgba()`: a color mixed in sRGB computes to `color(srgb r g b / a)`; a transparent one is any color with no alpha. */
const computedRgb = (color) => {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(color);
  const rgb = srgb ? rgbOf({ components: srgb.slice(1, 4).map(Number), alpha: srgb[4] === undefined ? 1 : Number(srgb[4]) }) : color;
  return /^rgba\(\d+, \d+, \d+, 0\)$/.test(rgb) ? 'transparent' : rgb;
};

/**
 * The parts of the page each look must draw, each with the token it is drawn with: the property of the element `part`
 * finds (in the page's script, below) and the token whose resolved value it must compute to.
 */
const PARTS = [
  { part: 'appBar', what: 'the app bar', token: 'comp.app-bar.flat.container.color' },
  { part: 'sidebar', what: 'the sidebar’s selected row', token: 'comp.navigation-drawer.selected.item.container.color' },
  { part: 'text', what: 'the content’s text', token: 'sys.color.on-surface' },
  { part: 'stage', what: 'a stage’s filled button', token: 'comp.button.filled.container.color' },
  { part: 'playground', what: 'the label of the playground’s selected tab', token: 'comp.tabs.tonal.selected.covered-label.color' },
  { part: 'dialog', what: 'the search’s dialog, open in the top layer', token: 'comp.search.view.container.color' },
];

/** The page's parts as drawn (`PARTS`), with the search's dialog open, and the font of the content's text. */
async function drawnParts(page) {
  await page.locator('[data-example-controls]').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-example-controls] tanrei-tab')].some((tab) => tab.shadowRoot?.querySelector('.tab.selected .cover .label')));
  await page.evaluate(() => scrollTo(0, 0));
  // The search is defined on its first use (a pointer over it): pressed once it is, it opens its view.
  await page.locator('tanrei-search.docs-search').hover();
  await page.waitForFunction(() => customElements.get('tanrei-search') && document.querySelector('tanrei-search.docs-search').shadowRoot);
  await page.locator('tanrei-search.docs-search').click();
  await page.waitForFunction(() => document.querySelector('tanrei-search.docs-search')?.shadowRoot?.querySelector('dialog[part="dialog"]')?.matches(':modal'));
  // Its entrance at its end: what is measured is the dialog at rest.
  await page.evaluate(() => Promise.all(document.querySelector('tanrei-search.docs-search').shadowRoot.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined))));
  const drawn = await page.evaluate((tokens) => {
    const inShadow = (host, selector) => host?.shadowRoot?.querySelector(selector) ?? null;
    const text = document.querySelector('.sl-markdown-content > p');
    const found = {
      appBar: [inShadow(document.querySelector('tanrei-app-bar'), '[part="container"]'), 'backgroundColor'],
      sidebar: [inShadow(document.querySelector('#docs-sidebar tanrei-navigation-drawer-item[href$="/components/button/"]'), '[part="active-indicator"]'), 'backgroundColor'],
      text: [text, 'color'],
      stage: [inShadow(document.querySelector('[data-example]:not([data-pinned]) [data-example-stage] tanrei-button[variant="filled"]'), '[part="container"]'), 'backgroundColor'],
      playground: [[...document.querySelectorAll('[data-example-controls] tanrei-tab')].map((tab) => inShadow(tab, '.tab.selected .cover .label')).find(Boolean), 'color'],
      dialog: [inShadow(document.querySelector('tanrei-search.docs-search'), 'dialog[part="dialog"]'), 'backgroundColor'],
    };
    // What the page's own root gives each token: a probe in the body, which inherits it.
    const probe = document.body.appendChild(document.createElement('span'));
    const given = Object.fromEntries(
      Object.entries(tokens).map(([part, token]) => {
        probe.style.backgroundColor = `var(--${token.replaceAll('.', '-')})`;
        return [part, getComputedStyle(probe).backgroundColor];
      }),
    );
    probe.remove();
    return {
      parts: Object.fromEntries(Object.entries(found).map(([part, [element, property]]) => [part, element ? getComputedStyle(element)[property] : null])),
      given,
      font: text ? getComputedStyle(text).fontFamily : null,
    };
  }, Object.fromEntries(PARTS.map(({ part, token }) => [part, `${DEFAULT}.${token}`])));
  await page.keyboard.press('Escape');
  return drawn;
}

/** The first family of a stack, as a computed `font-family` writes it. */
const firstFamily = (stack) => String([stack].flat()[0]).replace(/^["']|["']$/g, '');

/** A layer as Theme Studio's switch would give it: a brand color of its own, the `primary` palette the Studio's brand color row writes (the engine draws the primary roles from it). */
const LAYER = {
  id: 'acme',
  extends: DEFAULT,
  palettes: { primary: { source: { seed: '#0b6e4f' } } },
};

for (const engine of ENGINES) {
  describe(`the appearance in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (options = {}, url = PAGE) => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light', ...options });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await settled(page);
      return { context, page };
    };

    test('a first visit: the device’s scheme, standard contrast, the default system, nothing stored', LIMIT, async () => {
      const { context, page } = await open();
      assert.deepEqual(await root(page), { theme: 'light', tanreiTheme: 'light', mode: 'system', contrast: null, look: DEFAULT, shared: false, stored: null });
      assert.equal(await lookSheet(page), null, 'the default system: no stylesheet over the root’s');
      assert.equal(await page.locator('#docs-appearance').getAttribute('label'), en.frame.appearanceOf.replace('{look}', DEFAULT));
      assert.equal(await page.locator('#docs-mode').evaluate((toggle) => toggle.selected), false);
      // The device's scheme, while the mode is the device's.
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal((await root(page)).mode, 'system');
      assert.equal(await page.locator('#docs-mode').evaluate((toggle) => toggle.selected), true, 'the toggle says the page is dark');
      await context.close();
    });

    test('the panel chooses the mode, the contrast and the look; each is on the root at once, kept, and there from the next page’s first paint', LIMIT, async () => {
      const { context, page } = await open();
      const panel = await openPanel(page);
      await panel.getByRole('radio', { name: en.dark, exact: true }).click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await panel.getByRole('radio', { name: en.contrastHigh, exact: true }).click();
      await page.waitForFunction(() => document.documentElement.getAttribute('data-tanrei-contrast') === 'high');
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await page.waitForFunction((id) => document.documentElement.dataset.docsLook === id, SHOWCASE);
      const chosen = { mode: 'dark', contrast: 'high', look: SHOWCASE };
      assert.deepEqual(await root(page), { theme: 'dark', tanreiTheme: 'dark', mode: 'dark', contrast: 'high', look: SHOWCASE, shared: false, stored: chosen });
      assert.equal(await page.locator('#docs-appearance .docs-look-name').textContent(), SHOWCASE);
      // The look's stylesheet over the root, and no stage under a scope of its own.
      await page.waitForFunction((id) => document.getElementById(id)?.getAttribute('href')?.includes('/look-cupertino.'), LOOK_SHEET_ID);
      assert.equal(await page.locator('[data-example]:not([data-pinned]) [data-example-stage][data-tanrei-system]').count(), 0);

      // The next page, from its first paint: the head's script wrote the root before anything was drawn.
      const next = await context.newPage();
      await next.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          window.firstSeen = { theme: document.documentElement.dataset.theme, look: document.documentElement.dataset.docsLook, contrast: document.documentElement.getAttribute('data-tanrei-contrast') };
        });
      });
      await next.goto(`${origin}/foundations/accessibility/`);
      await settled(next);
      assert.deepEqual(await next.evaluate(() => window.firstSeen), { theme: 'dark', look: SHOWCASE, contrast: 'high' });
      const again = await openPanel(next);
      assert.deepEqual(await again.evaluate((popover) => [...popover.querySelectorAll('tanrei-tabs, tanrei-list')].map((control) => control.value)), ['dark', 'high', SHOWCASE], 'the panel says what is kept');
      // Back to the default system: the look's stylesheet taken away.
      await again.getByRole('option', { name: DEFAULT, exact: true }).click();
      await next.waitForFunction((id) => !document.getElementById(id), LOOK_SHEET_ID);
      await context.close();
    });

    for (const look of [DEFAULT, ...GALLERY, CUSTOM_LOOK]) {
      test(`under ${look}, the whole page is drawn in it: the app bar, the sidebar, the content, a stage, the playground and an open dialog`, LIMIT, async (t) => {
        const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light' });
        if (look === CUSTOM_LOOK) {
          await context.addInitScript(({ appearance, custom, layer }) => {
            if (localStorage.getItem(custom)) return;
            localStorage.setItem(custom, JSON.stringify({ hash: 'look1acme', layer }));
            localStorage.setItem(appearance, JSON.stringify({ look: 'custom' }));
          }, { appearance: APPEARANCE_KEY, custom: CUSTOM_KEY, layer: LAYER });
        }
        const page = await context.newPage();
        await page.goto(`${origin}${PAGE}${look === CUSTOM_LOOK ? '' : `?look=${look}`}`);
        if (look === CUSTOM_LOOK) {
          // The first page computes the theme's sheet (it may take the late path, test/browser/custom-theme.test.mjs);
          // the next one has it kept.
          await bounded(`${engine}: the theme's stylesheet kept`, page.waitForFunction((id) => document.getElementById(id)?.localName === 'style' || document.documentElement.hasAttribute('data-docs-look-late'), LOOK_SHEET_ID, { timeout: 60_000 }));
          await page.waitForFunction(() => localStorage.getItem('tanrei-docs-custom-sheet'));
          await page.reload();
        }
        await settled(page);
        assert.equal((await root(page)).look, look);
        const sheet = await lookSheet(page);
        if (look === DEFAULT) assert.equal(sheet, null);
        else if (look === CUSTOM_LOOK) assert.equal(sheet?.as, 'style', 'the reader’s theme’s sheet, in a style of its own');
        else assert.match(sheet?.href ?? '', new RegExp(`/look-${look}\\.[0-9a-f]{8}\\.css$`), 'the gallery example’s sheet, linked');
        const { parts, given, font } = await drawnParts(page);
        for (const { part, what, token } of PARTS) {
          // A shipped system's value is on disk; the reader's theme's is what its sheet gives the root.
          const want = look === CUSTOM_LOOK ? computedRgb(given[part]) : computedRgb(rgbOf(resolvedIn(look, token)));
          assert.equal(computedRgb(parts[part] ?? 'none'), want, `${look}: ${what} (${token})`);
        }
        if (look === CUSTOM_LOOK) assert.notEqual(computedRgb(given.stage), computedRgb(rgbOf(resolvedIn(DEFAULT, 'comp.button.filled.container.color'))), 'the theme’s own brand color, not the default system’s');
        // The content's face: the look's own stack, first. (A gallery example's face is set by the faces the site
        // registers, which do not follow the look yet: styles/fonts.generated.css writes the default system's stacks on
        // the root for every look.)
        const stack = resolvedIn(look === CUSTOM_LOOK ? DEFAULT : look, 'sys.typescale.body')?.fontFamily;
        await t.test(`${look}: the content's text is set in the look's own face`, { todo: firstFamily(stack) !== firstFamily(resolvedIn(DEFAULT, 'sys.typescale.body').fontFamily) ? 'the faces the site registers set the default system’s stacks on the root, whatever the look' : false }, () => {
          assert.equal(firstFamily(font.split(',')[0].trim()), firstFamily(stack));
        });
        await context.close();
      });
    }

    test('a figure that compares systems draws each in its own, whatever the look: the default system’s too', LIMIT, async () => {
      const { context, page } = await open({}, `/foundations/design-systems/?look=${SHOWCASE}`);
      const filled = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('[data-docs-compare] [data-tanrei-system]')].map((scope) => {
            const button = scope.querySelector('tanrei-button[variant="filled"]');
            return [scope.getAttribute('data-tanrei-system'), button?.shadowRoot?.querySelector('[part="container"]') ? getComputedStyle(button.shadowRoot.querySelector('[part="container"]')).backgroundColor : null];
          }),
        ),
      );
      assert.deepEqual(Object.keys(filled).sort(), [DEFAULT, ...GALLERY].sort(), 'a figure for every shipped system');
      for (const [system, drawn] of Object.entries(filled)) assert.equal(computedRgb(drawn ?? 'none'), computedRgb(rgbOf(resolvedIn(system, 'comp.button.filled.container.color'))), `${system}, on a page drawn in ${SHOWCASE}`);
      await context.close();
    });

    test('the next page is drawn in a gallery example from its first frame: the look’s stylesheet is in before anything is drawn', LIMIT, async () => {
      const { context, page } = await open();
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ look: 'cupertino' })), APPEARANCE_KEY);
      const next = await context.newPage();
      // Each frame until the first one that draws the page (its body there, the page not hidden): what the root's
      // tokens say then, and whether the look's sheet is in.
      await next.addInitScript(({ id, pending }) => {
        const look = () => {
          const root = document.documentElement;
          if (!document.body || root.hasAttribute(pending)) return requestAnimationFrame(look);
          window.firstFrame = { sheet: Boolean(document.getElementById(id)?.sheet), filled: getComputedStyle(root).getPropertyValue('--tanrei-comp-button-filled-container-color').trim() };
        };
        requestAnimationFrame(look);
      }, { id: LOOK_SHEET_ID, pending: PENDING_ATTR });
      await next.goto(`${origin}${PAGE}`);
      await settled(next);
      const first = await next.evaluate(() => window.firstFrame);
      const now = await next.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-button-filled-container-color').trim());
      assert.deepEqual(first, { sheet: true, filled: now }, 'the first frame drawn is drawn in the look');
      await context.close();
    });

    test('the bar’s toggle shows the other scheme and keeps it as the mode', LIMIT, async () => {
      const { context, page } = await open();
      const toggle = page.locator('#docs-mode');
      assert.equal(await toggle.getByRole('button', { name: en.frame.darkMode, exact: true }).getAttribute('aria-pressed'), 'false');
      await toggle.click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal((await root(page)).stored.mode, 'dark');
      assert.equal(await toggle.getByRole('button', { name: en.frame.darkMode, exact: true }).getAttribute('aria-pressed'), 'true');
      await toggle.click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      assert.equal((await root(page)).stored.mode, 'light');
      await context.close();
    });

    test('another tab of the site follows a choice', LIMIT, async () => {
      const { context, page } = await open();
      const other = await context.newPage();
      await other.goto(`${origin}/foundations/accessibility/`);
      await settled(other);
      const panel = await openPanel(page);
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await other.waitForFunction((id) => document.documentElement.dataset.docsLook === id, SHOWCASE);
      assert.equal(await other.locator('#docs-appearance .docs-look-name').textContent(), SHOWCASE);
      await other.waitForFunction((id) => document.getElementById(id)?.getAttribute('href')?.includes('/look-cupertino.'), LOOK_SHEET_ID);
      await context.close();
    });

    test('a shared link shows its appearance on its page, keeps nothing until the reader keeps it, and is what “Copy link” copies', LIMIT, async () => {
      const { context, page } = await open();
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ mode: 'light', contrast: 'standard', look: 'm3-like' })), APPEARANCE_KEY);
      await page.goto(`${origin}${PAGE}?look=${SHOWCASE}&mode=dark&contrast=medium`);
      await settled(page);
      const shown = await root(page);
      assert.deepEqual(shown, { theme: 'dark', tanreiTheme: 'dark', mode: 'dark', contrast: 'medium', look: SHOWCASE, shared: true, stored: { mode: 'light', contrast: 'standard', look: 'm3-like' } });
      assert.match((await lookSheet(page))?.href ?? '', /\/look-cupertino\./, 'drawn in the look it shares');
      // The snackbar offers to keep it.
      const keep = page.locator('tanrei-snackbar').getByRole('button', { name: en.frame.keepShared, exact: true });
      await keep.waitFor();
      await keep.click();
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-docs-appearance-shared'));
      assert.deepEqual((await root(page)).stored, { mode: 'dark', contrast: 'medium', look: SHOWCASE });
      assert.equal(new URL(page.url()).search, '', 'the address loses the shared names');

      // The copy: a link to this page as it looks now.
      await page.evaluate(() => {
        window.copied = [];
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => void window.copied.push(text) } });
      });
      const panel = await openPanel(page);
      await panel.getByRole('button', { name: en.frame.copyLink, exact: true }).click();
      await page.waitForFunction(() => window.copied.length === 1);
      assert.equal(await page.evaluate(() => window.copied[0]), `${origin}${PAGE}?look=${SHOWCASE}&mode=dark&contrast=medium`);
      await page.locator('tanrei-snackbar', { hasText: en.frame.linkCopied }).waitFor();
      await context.close();
    });

    test('a compact window: the drawer’s button opens the same panel, as a sheet, and the bar keeps its toggle', LIMIT, async () => {
      const { context, page } = await open({ viewport: COMPACT });
      assert.equal(await page.locator('#docs-appearance').isVisible(), false, 'the bar has no room for the look’s button');
      assert.ok(await page.locator('#docs-mode').isVisible());
      await page.locator('tanrei-app-bar [data-app-shell-menu]').click();
      await page.locator('#docs-appearance-drawer').waitFor({ state: 'visible' });
      const panel = await openPanel(page, 'docs-appearance-drawer');
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await page.waitForFunction((id) => document.documentElement.dataset.docsLook === id, SHOWCASE);
      assert.equal(await page.locator('#docs-appearance-drawer .docs-look-name').textContent(), SHOWCASE);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), COMPACT.width, 'nothing scrolls sideways');
      await context.close();
    });

    test('the look’s button and the toggle are named in the page’s language', LIMIT, async () => {
      for (const [dir, lang] of [['', 'en'], ['ja/', 'ja'], ['zh-cn/', 'zh-cn'], ['hi/', 'hi'], ['es/', 'es'], ['ar/', 'ar']]) {
        const { context, page } = await open({}, `/${dir}foundations/accessibility/`);
        const words = strings(lang).frame;
        assert.equal(await page.locator('#docs-appearance').getAttribute('label'), words.appearanceOf.replace('{look}', DEFAULT), lang);
        assert.equal(await page.locator('#docs-mode').getByRole('button', { name: words.darkMode, exact: true }).count(), 1, lang);
        await context.close();
      }
    });
  });
}

describe('the built pages', () => {
  test('no element is drawn under a system’s own scope but a figure that compares systems and a frame a page pins to one', () => {
    const pages = fs.readdirSync(dist, { recursive: true }).filter((file) => file.endsWith('.html'));
    const wrong = [];
    let compared = 0;
    let pinned = 0;
    for (const file of pages) {
      const html = fs.readFileSync(path.join(dist, file), 'utf8');
      if (!html.includes('data-tanrei-system=')) continue;
      // Every start tag that carries the attribute, and the figure it stands in.
      for (const match of html.matchAll(/<([a-z][\w-]*)\b[^>]*\sdata-tanrei-system="([^"]*)"[^>]*>/g)) {
        const before = html.slice(0, match.index);
        const figure = before.lastIndexOf('<tanrei-figure');
        const opener = figure >= 0 ? html.slice(figure, html.indexOf('>', figure) + 1) : '';
        const closed = figure >= 0 && before.slice(figure).includes('</tanrei-figure>');
        if (!closed && /\sdata-docs-compare\b/.test(opener)) compared += 1;
        else if (!closed && /\sdata-pinned="[^"]+"/.test(opener) && /\sdata-example-stage\b/.test(match[0])) pinned += 1;
        else wrong.push(`${file}: <${match[1]} data-tanrei-system="${match[2]}">`);
      }
    }
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} elements under a system's scope that no figure compares or pins`);
    assert.ok(compared > 0 && pinned > 0, `the premise: figures that compare systems (${compared}) and frames pinned to one (${pinned})`);
  });
});

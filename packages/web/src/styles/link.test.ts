// `.tanrei-link` (link.css, src/link.ts), driven by specs/link.spec.json: every behaviour id (LNK-1…35) is cited by a
// test title, every fixture has a baseline, and every length, color and time is read back from the tokens, never from
// a number written here. A fixture cannot put text around a link,
// so the tests of a link in a paragraph give the stage their own markup.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { acmeSystemCss, fixtureHost, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../test/icons.js';
import { fixturePicture } from '../../test/pictures.js';
import { decodePng } from '../../test/png.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('link');
/** The fixture picture of a site (specs: `fixtures/site-icon.png`), as an address a page loads from nowhere. */
const fixturePictureUrl = fixturePicture('fixtures/site-icon.png');
type P = Page;
const T = (name: string) => `--tanrei-comp-link-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const link = (page: P, id: string) => fixtureHost(page, spec, id);

interface MountOptions { system?: string; systemCss?: string; dir?: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl'; theme?: 'light' | 'dark' }
/** The spec's fixtures named, or all of them. */
/**
 * A window of its own for every mount: `setContent` writes the new document over the same window, where the script of
 * the document before would still be observing while the new one is parsed, and would report its anchors a second time.
 */
const fresh = (page: P) => page.goto('about:blank');
const mountSpec = async (page: P, ids: string[] = [], options: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) } : {}), ...options });
};
/** A stage holding `html` as it is: the fixture `t`. */
const mount = async (page: P, html: string, { direction, ...options }: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 't', props: {}, content: html.includes('<') ? html : `<span>${html}</span>`, ...(direction ? { direction } : {}) }], ...options });
};
/** A page with the stylesheets and NO script of the package: what the stylesheet alone does. */
const bare = (page: P, body: string) =>
  page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>link</title>
    <style>${read('dist/tokens.css')}</style><style>${read('dist/icons.css')}</style><style>${read('dist/link.css')}</style>
    <style>body { margin: 16px; inline-size: 320px; font: var(--tanrei-sys-typescale-body-font); color: var(--tanrei-sys-color-on-surface); background: var(--tanrei-sys-color-surface); }</style>
    </head><body>${body}</body></html>`);

const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The link's part of each line it runs over: the boxes of its fragments. */
const fragments = (target: Locator): Promise<Box[]> =>
  target.evaluate((el) => [...el.getClientRects()].map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom })));
/** The boxes of the link's own text (not its glyph), one per line. */
const textLines = (target: Locator): Promise<Box[]> =>
  target.evaluate((el) => {
    const range = document.createRange();
    const rects: DOMRect[] = [];
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent!.trim()) continue;
      range.selectNodeContents(node);
      rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
    }
    const out: { x: number; y: number; width: number; height: number; right: number; bottom: number }[] = [];
    for (const r of rects.sort((a, b) => a.top - b.top)) {
      const line = out.find((l) => Math.abs(l.y - r.top) < r.height / 2);
      if (!line) { out.push({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }); continue; }
      const [x, right] = [Math.min(line.x, r.left), Math.max(line.right, r.right)];
      Object.assign(line, { x, right, width: right - x });
    }
    return out;
  });
const near = (actual: number, expected: number, what: string, tolerance = 1) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);

/** A color as the browser serializes it — `rgb()`, `rgba()` or `color(srgb …)` — as four numbers. */
const rgba = (color: string): number[] => {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(color);
  if (srgb) return [...srgb.slice(1, 4).map((c) => Math.round(Number(c) * 255)), Math.round(Number(srgb[4] ?? 1) * 100) / 100];
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [...parts.slice(0, 3).map(Math.round), Math.round((parts[3] ?? 1) * 100) / 100];
};
const color = async (page: P, name: string) => rgba(await resolveColor(page, name));
/**
 * A color of `target` once it has settled: a state changes over the motion tokens (LNK-11), and a color on its way is
 * serialized in the space it is interpolated in — where the engine says so. WebKit serializes the container's color in
 * srgb on its way too, and gives the same value to two reads that no frame came between (the hovered 0.08 of LNK-18,
 * read after focus arrived and before the change to 0.1 had begun to be drawn), so two equal reads are not the end of
 * the motion there: the transitions the element and its generated boxes are running are waited for first.
 */
const drawn = async (target: Locator, property: string, pseudo?: string) => {
  await target.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => undefined))));
  let last = await css(target, property, pseudo);
  for (let reads = 0; reads < 60; reads++) {
    await target.page().waitForTimeout(20);
    const now = await css(target, property, pseudo);
    if (now === last && !/^(oklab|oklch|lab|lch)\(/.test(now)) break;
    last = now;
  }
  return rgba(last);
};
/** Debug reports of the page so far. */
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text()); });
  return seen;
};
const hoverless = async (page: P) => page.mouse.move(0, 0);
/** The property through which the link's container changes over the state motion: the background's own color (link.css registers nothing). */
const CONTAINER = 'background-color';

// The `acme` fixture layer is built once per worker, outside any test's own time: the build takes longer than a test
// has on a busy machine, and LNK-6 and LNK-10 were the tests that paid for it.
test.beforeAll(async () => {
  test.setTimeout(240_000);
  await acmeSystemCss();
});

test.describe('the stylesheet', () => {
  test('every value is a token: no literal color, length, duration or opacity', () => {
    const body = read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
      .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
      .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
    // `1em` is the glyph's box (LNK-14: as large as the font size of the link's text); `0px` and `0s` are nothing: the
    // floor of the hit area's reach, the initial line height, and a change that takes no time.
    expect(literals.filter((literal) => !['0px', '0s', '1em'].includes(literal))).toEqual([]);
  });

  test('dist/prose.css holds the same rules, under prose’s own anchors, and the corner rule is the shared one (LNK-10, PRS-17)', async () => {
    const rules = (text: string) => text.slice(text.indexOf('/* link:rules */'), text.indexOf('/* link:rules:end */')).replace(/\s+/g, ' ');
    const [own, prose] = [read('dist/link.css'), read('dist/prose.css')];
    expect(rules(own).length).toBeGreaterThan(5000);
    expect(prose.replace(/\s+/g, ' ')).toContain(rules(own).replace('/* link:rules */', '').trim());
    expect(prose).toMatch(/^ {4}:where\(a\) \{\s+\/\* ── The tokens of the look/m);
    expect(prose).toContain('@keyframes tanrei-link-ripple');
    // Neither registers a custom property: one registered name makes every transition of a page dear (registered-properties.ts).
    for (const sheet of [own, prose]) expect(sheet).not.toMatch(/@property\s+--/);
    // The hold of a press that no script answers is said by the same two names in both.
    for (const sheet of [own, prose]) for (const name of ['--_link-held-image', '--_link-held-clip']) expect(sheet).toContain(name);
    // The corners: src/styles/shape.ts, written for the anchor.
    const { SHAPE_CSS } = (await import(path.join(pkg, 'dist/styles/shape.js'))) as { SHAPE_CSS: string };
    expect(own.replace(/\s+/g, ' ')).toContain(SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/\s+/g, ' '));
    expect(read('src/styles/link.css')).not.toContain('superellipse');
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first', async ({ page }) => {
    await mount(page, '<a class="tanrei-link mine" href="#a">a link</a>');
    await page.addStyleTag({ content: '@layer tanrei.components { .mine { color: rgb(1, 2, 3); } }' });
    // (The link's color changes over its state motion — LNK-11 — so the new color is waited for: read at once on a
    // busy machine it was still one step short, rgb(3, 4, 5).)
    await expect.poll(() => drawn(page.locator('.mine'), 'color')).toEqual([1, 2, 3, 1]);
  });

  test('LNK-20 no state for a destination already visited: the stylesheet names no visited link, and one rule colors a link whether followed or not', () => {
    const sheet = read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sheet).not.toMatch(/:visited/);
    expect(sheet).not.toMatch(/:link\b/);
    expect(sheet).toMatch(/color: var\(--_link-now-label\)/);
  });
});

test.describe('the platform’s own link', () => {
  test('LNK-1 the link is an anchor in the document itself: with scripting off it has its href, the link role, is listed by document.links and is followed by a click and by Enter', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await bare(page, '<p>Read <a class="tanrei-link" href="#there">the guide</a>.</p><p id="there">There</p>');
    const anchor = page.getByRole('link', { name: 'the guide', exact: true });
    await expect(anchor).toHaveCount(1);
    await expect(anchor).toHaveAttribute('href', '#there');
    await anchor.click();
    await expect(page).toHaveURL(/#there$/);
    await page.goBack().catch(() => {});
    await anchor.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#there$/);
    await context.close();
  });

  test('LNK-1 the anchor is the product’s own element, in no shadow root, and whatever it carries is the browser’s: rel and download are left as written', async ({ page }) => {
    await mount(page, '<p>Get <a class="tanrei-link" href="/tokens.zip" download="tokens.zip" rel="nofollow">the tokens</a>.</p>');
    const anchor = page.locator('a.tanrei-link');
    expect(await anchor.evaluate((el) => el.getRootNode() === document && el.shadowRoot === null && [...document.links].includes(el as HTMLAnchorElement))).toBe(true);
    await expect(anchor).toHaveAttribute('download', 'tokens.zip');
    await expect(anchor).toHaveAttribute('rel', 'nofollow');
    await expect(page.getByRole('link', { name: 'the tokens', exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => customElements.get('tanrei-link'))).toBeUndefined();
  });
});

test.describe('the look', () => {
  const TEXTS = `<p id="p">Read <a class="tanrei-link" href="#a">the guide</a> first.</p><p id="p0">Read the guide first.</p>
    <h2 id="h" style="font: var(--tanrei-sys-typescale-heading-2-font); margin: 0">About <a class="tanrei-link" href="#a">the guide</a></h2><h2 id="h0" style="font: var(--tanrei-sys-typescale-heading-2-font); margin: 0">About the guide</h2>
    <p id="c" style="font: var(--tanrei-sys-typescale-caption-font)">See <a class="tanrei-link" href="#a">the guide</a>.</p><p id="c0" style="font: var(--tanrei-sys-typescale-caption-font)">See the guide.</p>`;

  test('LNK-2 the label is drawn in the text style of the text it sits in — body, heading, caption — in the label color of its variant, without making the line taller', async ({ page }) => {
    await mount(page, TEXTS);
    for (const id of ['p', 'h', 'c']) {
      const anchor = page.locator(`#${id} a`);
      for (const property of ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-style']) {
        expect(await css(anchor, property), `${id} ${property}`).toBe(await css(page.locator(`#${id}`), property));
      }
      near((await box(page.locator(`#${id}`))).height, (await box(page.locator(`#${id}0`))).height, `${id}: the line`, 0.01);
      expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-label-color')));
    }
    await mountSpec(page, ['inverse', 'in-text']);
    expect(await drawn(link(page, 'inverse'), 'color')).toEqual(await color(page, T('inverse-label-color')));
    expect(await drawn(link(page, 'in-text'), 'color')).toEqual(await color(page, '--tanrei-sys-color-link'));
    // On the baseline of the text beside it: an empty inline block inside and outside the link are level.
    await mount(page, '<p>Read <a class="tanrei-link" href="#a">the guide<i class="probe"></i></a> first<i class="probe"></i>.</p><style>.probe { display: inline-block; }</style>');
    near((await box(page.locator('.probe').nth(0))).bottom, (await box(page.locator('.probe').nth(1))).bottom, 'the baseline', 0.01);
  });

  test('LNK-3 the label is underlined at rest and in every state, by the underline tokens, in the label’s color, under the text only; the current link and a glyph alone draw none', async ({ page }) => {
    await mountSpec(page, ['in-text', 'standalone-leading-icon', 'in-text-new', 'current', 'icon-only', 'disabled', 'inverse']);
    expect(await resolveToken(page, T('underline-width'))).toBe(1);
    expect(await resolveToken(page, T('underline-offset'))).toBe(2);
    for (const id of ['in-text', 'standalone-leading-icon', 'in-text-new', 'disabled', 'inverse']) {
      const anchor = link(page, id);
      expect(await css(anchor, 'text-decoration-line'), id).toBe('underline');
      expect(await px(anchor, 'text-decoration-thickness'), id).toBe(await resolveToken(page, T('underline-width')));
      expect(await px(anchor, 'text-underline-offset'), id).toBe(await resolveToken(page, T('underline-offset')));
      expect(await css(anchor, 'text-decoration-style'), id).toBe('solid');
      // The underline is the label's color, whatever the state: it names none of its own.
      expect(await drawn(anchor, 'text-decoration-color'), id).toEqual(await drawn(anchor, 'color'));
    }
    // In every state.
    const anchor = link(page, 'in-text');
    await anchor.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    await anchor.hover();
    expect(await css(anchor, 'text-decoration-line')).toBe('underline');
    await page.mouse.down();
    expect(await css(anchor, 'text-decoration-line')).toBe('underline');
    await page.mouse.up();
    await hoverless(page);
    await tabTo(page, anchor);
    expect(await css(anchor, 'text-decoration-line')).toBe('underline');
    // Not under a glyph or the mark: neither is in the line of text (an underline is not drawn under what is placed out of it).
    expect(await css(link(page, 'standalone-leading-icon').locator('.tanrei-icon'), 'position')).toBe('absolute');
    expect(await css(link(page, 'in-text-new'), 'position', '::after')).toBe('absolute');
    expect(await css(link(page, 'current'), 'text-decoration-line')).toBe('none');
    expect(await css(link(page, 'icon-only'), 'text-decoration-line')).toBe('none');
  });

  test('LNK-4 a label wraps with its text and is never cut; an address longer than the line breaks inside itself; underline, container and ring are the link’s part of each line', async ({ page }) => {
    await mountSpec(page, ['in-text-wrapping', 'in-text-wrapping-rtl', 'long-address', 'standalone-wrapping']);
    for (const id of ['in-text-wrapping', 'in-text-wrapping-rtl', 'long-address', 'standalone-wrapping']) {
      const anchor = link(page, id);
      const parts = await fragments(anchor);
      const area = await box(stage(page, id));
      expect(parts.length, `${id}: lines`).toBeGreaterThan(1);
      for (const part of parts) {
        expect(part.x, id).toBeGreaterThanOrEqual(area.x + 16 - 0.5);
        expect(part.right, id).toBeLessThanOrEqual(area.right - 16 + 0.5);
      }
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await css(anchor, 'display'), id).toBe('inline');
      expect(await css(anchor, 'text-overflow'), id).toBe('clip');
      expect(await css(anchor, 'white-space-collapse').catch(() => 'collapse'), id).toBe('collapse');
      expect(await css(anchor, 'overflow-wrap'), id).toBe('break-word');
      // One part per line, each its own line of text: no two share a line.
      expect(new Set(parts.map((part) => Math.round(part.y))).size, id).toBe(parts.length);
    }
    // The address has no space: every break is inside it.
    expect(await link(page, 'long-address').evaluate((el) => /\s/.test(el.textContent!))).toBe(false);
  });

  test('LNK-5 the container is the box of the link’s text on each line, with the container shape, filled by the state’s token, and takes no room: hovering a link in a paragraph moves no character', async ({ page }) => {
    await mount(page, '<p id="p">A paragraph of text that is long enough to wrap, with <a class="tanrei-link" href="#a">a link in the middle of it that runs over the end of a line</a> and more text after the link, so that anything that moved would show.</p>');
    const anchor = page.locator('#p a');
    const places = () =>
      page.locator('#p').evaluate((el) => {
        const range = document.createRange();
        const out: number[] = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (let i = 0; i < node.textContent!.length; i += 7) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const r = range.getBoundingClientRect();
            out.push(r.left, r.top);
          }
        }
        return out;
      });
    const before = await places();
    expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-container-color')));
    await anchor.hover();
    await expect.poll(() => drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
    expect(await places()).toEqual(before);
    await page.mouse.down();
    expect(await places()).toEqual(before);
    await page.mouse.up();
    const parts = await fragments(anchor);
    expect(parts.length).toBeGreaterThan(1);
    const line = await px(anchor, 'line-height');
    // As high as the text's own box, never the line's whole height: two parts on neighbouring lines do not touch.
    for (const part of parts) expect(part.height).toBeLessThan(line);
    expect(parts[1].y - parts[0].bottom).toBeGreaterThan(0);
    expect(await px(anchor, 'border-top-left-radius')).toBeGreaterThanOrEqual(await resolveToken(page, T('container-shape')));
    expect(await resolveToken(page, T('container-shape'))).toBe(await resolveToken(page, '--tanrei-sys-shape-corner-extra-small'));
    // Every corner on every line.
    expect(await anchor.evaluate((el) => getComputedStyle(el).boxDecorationBreak || getComputedStyle(el).getPropertyValue('-webkit-box-decoration-break'))).toBe('clone');
    for (const side of ['padding-left', 'padding-right', 'margin-left', 'margin-right', 'border-left-width']) expect(await px(anchor, side), side).toBe(0);
  });
});

test.describe('states', () => {
  test('LNK-6 under acme, where the three states differ, pressed beats focused beats hovered, and focus by pointer does not select the focused state', async ({ page }) => {
    await mountSpec(page, ['in-text', 'icon-only'], { system: 'acme', systemCss: await acmeSystemCss() });
    const anchor = link(page, 'in-text');
    const bg = () => drawn(anchor, 'background-color');
    const [rest, hovered, focused, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => color(page, T(`standard-${s}container-color`))));
    expect(new Set([rest, hovered, focused, down].map(String)).size).toBe(4);
    expect(await bg()).toEqual(rest);
    await anchor.hover();
    await expect.poll(bg).toEqual(hovered);
    await anchor.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    await tabTo(page, anchor); // hovered AND keyboard-focused
    await expect.poll(bg).toEqual(focused);
    await page.keyboard.down('Enter'); // hovered AND focused AND pressed
    await expect.poll(bg).toEqual(down);
    expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-pressed-label-color')));
    await page.keyboard.up('Enter');
    await expect.poll(bg).toEqual(focused);
    await page.mouse.down(); // the same with the pointer
    await expect.poll(bg).toEqual(down);
    await page.mouse.up();
    // A glyph alone reads the icon tokens of the state.
    const alone = link(page, 'icon-only');
    expect(await drawn(alone, 'color')).toEqual(await color(page, T('standard-icon-color')));
    await alone.hover();
    await expect.poll(() => drawn(alone, 'background-color')).toEqual(hovered);
    expect(await drawn(alone, 'color')).toEqual(await color(page, T('standard-hovered-icon-color')));
    // Focus by pointer: a script focuses it the way a press does, and the focused tokens are not read.
    await mount(page, '<p><a class="tanrei-link" href="#a" id="one">one</a> and <button id="b">b</button></p>', { system: 'acme', systemCss: await acmeSystemCss() });
    await page.locator('#b').click();
    await page.locator('#one').evaluate((el: HTMLElement) => el.focus());
    await hoverless(page);
    expect(await page.locator('#one').evaluate((el) => el.matches(':focus') && !el.matches(':focus-visible'))).toBe(true);
    expect(await drawn(page.locator('#one'), 'background-color')).toEqual(rest);
    expect(await css(page.locator('#one'), 'outline-style')).toBe('none');
  });

  test('LNK-7 keyboard focus shows the system’s focus indicator without animation, around the link’s part of each line; pointer focus shows none', async ({ page }) => {
    await mountSpec(page, ['in-text-wrapping', 'icon-only']);
    const anchor = link(page, 'in-text-wrapping');
    expect(await css(anchor, 'outline-style')).toBe('none');
    await tabTo(page, anchor);
    expect(await css(anchor, 'outline-style')).toBe('solid');
    expect(await px(anchor, 'outline-width')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await px(anchor, 'outline-offset')).toBe((await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width')));
    expect(await drawn(anchor, 'outline-color')).toEqual(await color(page, '--tanrei-sys-color-focus-ring'));
    expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-focused-container-color')));
    // Never animated: the outline is in no transition.
    expect(await css(anchor, 'transition-property')).not.toMatch(/outline|all|box-shadow/);
    // One ring per line: the outline is the inline box's, which the browser draws for each of its parts — the link
    // is not one box around the lines between its first word and its last.
    expect(await css(anchor, 'display')).toBe('inline');
    expect((await fragments(anchor)).length).toBeGreaterThan(1);
    // A glyph alone takes it too.
    await tabTo(page, link(page, 'icon-only'));
    expect(await css(link(page, 'icon-only'), 'outline-style')).toBe('solid');
    // Pointer focus.
    await mount(page, '<p><a class="tanrei-link" href="#a" id="one">one</a></p>');
    await page.locator('#one').evaluate((el: HTMLElement) => el.addEventListener('click', (e) => e.preventDefault()));
    await page.locator('#one').click();
    expect(await css(page.locator('#one'), 'outline-style')).toBe('none');
  });

  /** Records, inside the page, when data-pressed appears and disappears, when the press ends, and what was seen. */
  const watchPress = (anchor: Locator) =>
    anchor.evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; click?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.backgroundColor, s.opacity];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
      el.addEventListener('click', () => (log.click ??= performance.now()));
    });
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; click?: number; seen?: string[] });
  const CLOCK = 1;

  test('LNK-8 LNK-12 a press by Enter or a click is shown at once and for at least press-hold, and the navigation is not held back for it', async ({ page }) => {
    for (const how of ['Enter', 'click'] as const) {
      await mount(page, '<p>Read <a class="tanrei-link" href="#there" id="one">the guide</a>.</p>');
      // (4 s: the press must be the shorter of the two, and a key's release is sent one answer after its press — up to
      // 570 ms in WebKit on Linux, where a hold of 400 ms was over first.)
      await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '4000ms' });
      const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      expect(hold).toBe(4000);
      const anchor = page.locator('#one');
      await watchPress(anchor);
      await page.evaluate(() => addEventListener('hashchange', () => ((window as any).went = performance.now())));
      if (how === 'Enter') {
        await tabTo(page, anchor);
        expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-focused-container-color')));
        await page.keyboard.press('Enter');
      } else {
        await anchor.hover();
        expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
        await anchor.click();
      }
      await expect.poll(async () => (await pressLog(page)).off, { timeout: 5000 }).toBeDefined();
      const log = await pressLog(page);
      expect(log.seen![0], how).toBe('overlay');
      expect(rgba(log.seen![1]), `${how}: pressed at once`).toEqual(await color(page, T('standard-pressed-container-color')));
      // Measured from the input event, on the page's clock (the observer hears of the attribute a moment later).
      expect(log.off! - log.down!, `${how}: held`).toBeGreaterThanOrEqual(hold - CLOCK);
      expect(log.up! - log.down!, `${how}: the press itself was shorter`).toBeLessThan(hold);
      // LNK-12: the address opened while the press was still shown.
      const went = await page.evaluate(() => (window as any).went as number);
      expect(went, `${how}: followed`).toBeDefined();
      expect(went, `${how}: not held back`).toBeLessThan(log.off!);
      expect(await page.evaluate(() => location.hash)).toBe('#there');
    }
  });

  test('LNK-8 without the package’s script the stylesheet alone shows the press at once and holds it for press-hold: the pressed container is what is painted, in the state’s place, in every frame of the hold', async ({ page }) => {
    // Two swatches beside the link: the pressed and the hovered container, each painted alone over the page.
    await bare(
      page,
      `<p>Read <a class="tanrei-link" href="#there" id="one">the guide</a>.</p>
       <p><i id="pressed" style="display: inline-block; inline-size: 24px; block-size: 24px; background: var(${T('standard-pressed-container-color')})"></i>
          <i id="hovered" style="display: inline-block; inline-size: 24px; block-size: 24px; background: var(${T('standard-hovered-container-color')})"></i></p>`,
    );
    // The hold is a delayed step of two names (link.css), which the engine lists as transitions the moment the press
    // ends. The page takes hold of them in that moment and steps them by hand: what is drawn at each moment of the hold
    // is then read at that moment of the hold's own clock, however few frames the machine draws (WebKit on Linux drew
    // a frame in 570 ms, and six frames did not fit in the 3.4 s that were watched). A hold of 4 s, so that the frame
    // which announces it comes while it lasts.
    await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '4000ms' });
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(4000);
    const anchor = page.locator('#one');
    const bg = () => drawn(anchor, 'background-color');
    const pressedColor = await color(page, T('standard-pressed-container-color'));
    const hovered = await color(page, T('standard-hovered-container-color'));
    expect(pressedColor).not.toEqual(hovered);
    // What is painted: one pixel of the container above the label's letters, and one of each swatch.
    const painted = async (target: Locator, at: 'top' | 'middle') => {
      const b = await box(target);
      const shot = decodePng(await page.screenshot({ clip: { x: b.x + b.width / 2 - 1, y: at === 'top' ? b.y + 1 : b.y + b.height / 2, width: 2, height: 1 } }));
      return [...shot.data.slice(0, 3)];
    };
    // (Two levels of 255: Firefox paints an image of one translucent color from its premultiplied bytes — 230 where the
    // color alone is 232. The hovered container is five levels from the pressed one, and the two laid over each other sixteen.)
    const same = (actual: number[], expected: number[], what: string) => {
      for (const [i, channel] of actual.entries()) expect(Math.abs(channel - expected[i]!), `${what}: painted rgb(${actual}) for rgb(${expected})`).toBeLessThanOrEqual(2);
    };
    const [pressedPaint, hoveredPaint] = [await painted(page.locator('#pressed'), 'middle'), await painted(page.locator('#hovered'), 'middle')];
    expect(Math.abs(pressedPaint[0]! - hoveredPaint[0]!), 'the two containers are told apart by what is painted').toBeGreaterThan(3);
    await anchor.hover();
    await expect.poll(bg).toEqual(hovered);
    same(await painted(anchor, 'top'), hoveredPaint, 'hovered');
    await page.mouse.down();
    expect(await anchor.getAttribute('data-pressed')).toBeNull();
    // At once: the pressed container, alone — not laid over the hovered one.
    same(await painted(anchor, 'top'), pressedPaint, 'held down');
    // The release, in the page: everything the release set moving on the anchor is held where it began — the hold's two
    // steps, and a color on its way if there were one — the moment the engine announces it.
    await anchor.evaluate((el) => {
      const kept = window as unknown as { heldMotions?: string[] };
      el.addEventListener('transitionrun', () => {
        if (kept.heldMotions) return;
        const motions = el.getAnimations();
        for (const motion of motions) {
          motion.pause();
          motion.currentTime = 0;
        }
        kept.heldMotions = motions.map((motion) => `${(motion as CSSTransition).transitionProperty} ${Number(motion.effect!.getTiming().delay)}+${Number(motion.effect!.getTiming().duration)}`);
      });
    });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => (window as unknown as { heldMotions?: string[] }).heldMotions), 'the release begins the hold').toBeDefined();
    const motions = await page.evaluate(() => (window as unknown as { heldMotions: string[] }).heldMotions);
    // The hold is press-hold long, and then a step: nothing of it is a fade.
    expect(motions).toEqual(expect.arrayContaining([`--_link-held-image ${hold}+0`, `--_link-held-clip ${hold}+0`]));
    /** The container as it is drawn `time` ms after the release: every motion of the anchor set to that moment. */
    const at = (time: number) =>
      anchor.evaluate((el, time) => {
        for (const motion of el.getAnimations()) motion.currentTime = time;
        const style = getComputedStyle(el);
        return { image: style.backgroundImage, clip: style.backgroundClip, color: style.backgroundColor };
      }, time);
    // Held: the press has ended and what is painted is still the pressed container (a hold that faded toward the
    // hovered color and came back is caught
    // by the moments below: the background's color takes no part in the hold, and stays the hovered one throughout).
    same(await painted(anchor, 'top'), pressedPaint, 'held after the release');
    const moments = [0, 1, 8, 16, 33, 50, hold / 4, hold / 2, (3 * hold) / 4, hold - 16, hold - 1];
    for (const time of moments) {
      const frame = await at(time);
      const when = `${time} ms after the release`;
      const layer = /^linear-gradient\(((?:rgba?|color)\([^)]*\))/.exec(frame.image);
      expect(layer, `${when}: the pressed layer (${frame.image})`).not.toBeNull();
      expect(rgba(layer![1]!), when).toEqual(pressedColor);
      expect(frame.clip.split(',').at(-1)!.trim(), `${when}: the state's color is not painted under it`).toBe('text');
      expect(rgba(frame.color), `${when}: the state's color did not move`).toEqual(hovered);
    }
    // …and painted so half-way through the hold, and just before its end.
    await at(hold / 2);
    same(await painted(anchor, 'top'), pressedPaint, 'half-way through the hold');
    await at(hold - 1);
    same(await painted(anchor, 'top'), pressedPaint, 'at the end of the hold');
    // Let go a moment before its end, the hold ends by itself.
    await anchor.evaluate((el) => el.getAnimations().forEach((motion) => motion.play()));
    // The hold over: the hovered container, and no layer.
    await expect.poll(() => css(anchor, 'background-image'), { timeout: 5000 }).toBe('none');
    expect(await css(anchor, 'background-clip')).toBe('border-box');
    expect(await bg()).toEqual(hovered);
    same(await painted(anchor, 'top'), hoveredPaint, 'after the hold');
  });

  test('LNK-9 ripple (m3-like): the layer grows from the point of contact inside a link on one line and the container stays with the state under the press; a link over several lines answers with the overlay', async ({ page }) => {
    await mountSpec(page, ['in-text', 'in-text-wrapping', 'icon-only'], { system: 'm3-like' });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const anchor = link(page, 'in-text');
    await anchor.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    const place = await box(anchor);
    await page.mouse.move(place.x + 10, place.y + place.height / 2);
    const hovered = await color(page, T('standard-hovered-container-color'));
    await expect.poll(() => drawn(anchor, 'background-color')).toEqual(hovered);
    await page.mouse.down();
    await expect(anchor).toHaveAttribute('data-pressed', 'ripple');
    const ripple = anchor.locator('.ripple');
    await expect(ripple).toHaveCount(1);
    expect(await drawn(anchor, 'background-color')).toEqual(hovered);
    expect(await drawn(ripple, 'background-color')).toEqual(await color(page, T('standard-pressed-container-color')));
    near(Number.parseFloat(await ripple.evaluate((el: HTMLElement) => el.style.getPropertyValue('--_x'))), 10, 'the point of contact', 1.5);
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'transition-duration')).toBe(`${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'pointer-events')).toBe('none');
    // Under the text, and no part of the layout.
    expect(await css(ripple, 'position')).toBe('absolute');
    near((await box(anchor)).width, place.width, 'the link’s width', 0.01);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0, { timeout: 5000 });
    await expect(anchor).not.toHaveAttribute('data-pressed');
    // From the center for the keyboard.
    await tabTo(page, anchor);
    await page.keyboard.down('Enter');
    near(Number.parseFloat(await anchor.locator('.ripple').evaluate((el: HTMLElement) => el.style.getPropertyValue('--_x'))), place.width / 2, 'the center', 1);
    await page.keyboard.up('Enter');
    // Several lines: no one box to grow it in — the overlay (the README says so).
    const long = link(page, 'in-text-wrapping');
    await long.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    const first = (await fragments(long))[0];
    await page.mouse.move(first.x + 10, first.y + first.height / 2);
    await page.mouse.down();
    await expect(long).toHaveAttribute('data-pressed', 'overlay');
    await expect(long.locator('.ripple')).toHaveCount(0);
    expect(await drawn(long, 'background-color')).toEqual(await color(page, T('standard-pressed-container-color')));
    await page.mouse.up();
    // Where motion is reduced the layer appears whole.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(place.x + 10, place.y + place.height / 2);
    await page.mouse.down();
    expect(await css(anchor.locator('.ripple'), 'animation-name')).toBe('none');
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('LNK-9 dim (cupertino) applies the pressed opacity to the whole link and draws no layer; none answers nothing; the default is the overlay', async ({ page }) => {
    await mountSpec(page, ['in-text'], { system: 'cupertino' });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    let anchor = link(page, 'in-text');
    await anchor.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    const under = async () => drawn(anchor, 'background-color');
    await anchor.hover();
    const beforePress = await under();
    await page.mouse.down();
    await expect(anchor).toHaveAttribute('data-pressed', 'dim');
    await expect(anchor.locator('.ripple')).toHaveCount(0);
    expect(await under()).toEqual(beforePress);
    expect(await css(anchor, 'opacity')).toBe(await page.evaluate((name) => { const probe = document.createElement('i'); probe.style.opacity = `var(${name})`; document.body.append(probe); const o = getComputedStyle(probe).opacity; probe.remove(); return o; }, T('pressed-opacity')));
    expect(Number(await css(anchor, 'opacity'))).toBeLessThan(1);
    await page.mouse.up();

    await mountSpec(page, ['in-text']);
    anchor = link(page, 'in-text');
    await anchor.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
    await anchor.hover();
    await page.mouse.down();
    await expect(anchor).toHaveAttribute('data-pressed', 'overlay');
    await page.mouse.up();
    await expect(anchor).not.toHaveAttribute('data-pressed', 'overlay', { timeout: 5000 });
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    const hovered = await color(page, T('standard-hovered-container-color'));
    await expect.poll(under).toEqual(hovered);
    await page.mouse.down();
    await expect(anchor).toHaveAttribute('data-pressed', 'none');
    expect(await under()).toEqual(hovered);
    expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-hovered-label-color')));
    await page.mouse.up();
  });

  test('LNK-10 the corners are eased by sys.shape.corner-smoothing where the browser can (cupertino), and keyboard focus is a glow where sys.behavior.focus-style says so (acme)', async ({ page }) => {
    await mountSpec(page, ['in-text'], { system: 'cupertino' });
    const anchor = link(page, 'in-text');
    const eases = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(1)'));
    const smoothing = Number(await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing'));
    expect(smoothing).toBeGreaterThan(0);
    const radius = await resolveToken(page, T('container-shape'));
    near(await px(anchor, 'border-top-left-radius'), radius * (eases ? 1 + 0.4 * smoothing : 1), 'the radius', 0.05);
    if (eases) expect(await css(anchor, 'corner-top-left-shape')).not.toBe('round');
    else test.info().annotations.push({ type: 'corner-shape', description: 'not in this browser: circular corners, the first value' });

    await mountSpec(page, ['in-text', 'in-text-wrapping'], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-focus-style')).toBe('glow');
    const glowing = link(page, 'in-text-wrapping');
    await tabTo(page, glowing);
    expect(await drawn(glowing, 'outline-color')).toEqual([0, 0, 0, 0]);
    expect(await css(glowing, 'outline-style')).toBe('solid');
    expect(await css(glowing, 'box-shadow')).not.toBe('none');
    // The default system is the ring.
    await mountSpec(page, ['in-text']);
    await tabTo(page, link(page, 'in-text'));
    expect((await drawn(link(page, 'in-text'), 'outline-color'))[3]).toBe(1);
  });

  test('LNK-11 a state changes over the motion tokens, and at once where motion is reduced', async ({ page }) => {
    await mountSpec(page, ['in-text']);
    const anchor = link(page, 'in-text');
    const timing = () =>
      anchor.evaluate((el, container) => {
        const s = getComputedStyle(el);
        const properties = s.transitionProperty.split(', ');
        const durations = s.transitionDuration.split(', ');
        const easings = s.transitionTimingFunction.split(/, (?=[a-z])/);
        const at = (name: string) => properties.indexOf(name);
        return { properties, color: durations[at('color') % durations.length], background: durations[at(container) % durations.length], opacity: durations[at('opacity') % durations.length], easing: easings[at(container) % easings.length] };
      }, CONTAINER);
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const moving = await timing();
    // The container's color changes by the background's own transition; the hold of a press that no script answers is
    // two names of its own, which the color takes no part in (LNK-8).
    expect(moving.properties).toEqual(expect.arrayContaining([CONTAINER, 'color', 'opacity']));
    expect(moving.properties.filter((name) => name.startsWith('--'))).toEqual(['--_link-held-image', '--_link-held-clip']);
    expect([moving.color, moving.background, moving.opacity]).toEqual([duration, duration, duration]);
    expect(moving.easing).toBe(await page.evaluate((name) => { const probe = document.createElement('i'); probe.style.transitionTimingFunction = `var(${name})`; document.body.append(probe); const e = getComputedStyle(probe).transitionTimingFunction; probe.remove(); return e; }, T('motion-state-easing')));
    // Drawn: with the motion slowed, the background is on its way between the two container colors part-way through.
    // (At 60 s, and the container's own transition held half way through its time when it is first found: read 300 ms
    // and an answer after the hover at 2 s, it was read wherever the machine had let it get to — on a slow one, at its end.)
    await rootTokens(page, { [T('motion-state-duration')]: '60s' });
    const [rest, hovered] = [await color(page, T('standard-container-color')), await color(page, T('standard-hovered-container-color'))];
    expect(await drawn(anchor, 'background-color')).toEqual(rest);
    await anchor.hover();
    let halfWay: string | null = null;
    await expect
      .poll(async () => {
        halfWay = await anchor.evaluate((el, container) => {
          const moving = el.getAnimations().filter((animation) => (animation as CSSTransition).transitionProperty === container);
          if (moving.length === 0) return null;
          for (const animation of moving) {
            animation.pause();
            animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
          }
          return getComputedStyle(el).backgroundColor;
        }, CONTAINER);
        return halfWay;
      }, 'the hover begins a transition of the container')
      .not.toBeNull();
    const between = rgba(halfWay!);
    expect(between[3], 'the container is neither at rest nor hovered yet').toBeGreaterThan(rest[3]);
    expect(between[3], 'the container is neither at rest nor hovered yet').toBeLessThan(hovered[3]);
    await anchor.evaluate((el) => el.getAnimations().forEach((animation) => animation.finish()));
    await rootTokens(page, { [T('motion-state-duration')]: '' });
    await hoverless(page);
    await expect.poll(() => drawn(anchor, 'background-color')).toEqual(rest);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await timing()).properties).not.toEqual(expect.arrayContaining([CONTAINER]));
    await anchor.hover();
    expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});

test.describe('activation', () => {
  test('LNK-12 Enter and a click emit click once and follow the address; a cancelled click opens nothing; Space emits nothing, shows no press and is left to the page; a modified click is left to the browser', async ({ page }) => {
    await mount(page, '<p>Read <a class="tanrei-link" href="#there" id="one">the guide</a>.</p><div style="block-size: 3000px"></div>');
    const anchor = page.locator('#one');
    await page.evaluate(() => {
      const w = window as any;
      w.clicks = 0;
      document.querySelector('#one')!.addEventListener('click', () => w.clicks++);
    });
    await tabTo(page, anchor);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([1, '#there']);
    await page.evaluate(() => history.replaceState(null, '', location.href.replace(/#.*/, '')));
    await anchor.click();
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([2, '#there']);
    // Space: no click, no pressed state; the key is not taken from the page.
    await page.evaluate(() => {
      history.replaceState(null, '', location.href.replace(/#.*/, ''));
      scrollTo(0, 0);
      addEventListener('keydown', (e) => ((window as any).spacePrevented = e.defaultPrevented));
    });
    await anchor.focus();
    await expect(anchor).not.toHaveAttribute('data-pressed', /./, { timeout: 5000 });
    await page.keyboard.down('Space');
    expect(await anchor.getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash, (window as any).spacePrevented])).toEqual([2, '', false]);
    // The product's router takes the navigation.
    await page.evaluate(() => document.querySelector('#one')!.addEventListener('click', (e) => { if (!(e as MouseEvent).ctrlKey && !(e as MouseEvent).metaKey) e.preventDefault(); }));
    await anchor.click();
    await tabTo(page, anchor); // (Safari does not focus a link that is clicked.)
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([4, '']);
    // A click with the new-tab modifier reaches the browser uncancelled by the link (the test stops it at the window).
    const cancelled = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          addEventListener('click', (e) => { resolve(e.defaultPrevented); e.preventDefault(); }, { once: true });
          document.querySelector('#one')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ctrlKey: true, metaKey: true }));
        }),
    );
    expect(cancelled).toBe(false);
  });

  test('LNK-13 a new context: target _blank, noopener, the mark open_in_new after the label unless the product’s glyph stands there or the link has no label, mirrored at the left in right-to-left; aria-description either way', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['in-text', 'in-text-new', 'standalone-new', 'standalone-new-leading-icon', 'standalone-new-trailing-icon', 'in-text-new-rtl', 'icon-only-new', 'disabled-new']);
    const gap = await resolveToken(page, T('container-gap'));
    for (const id of ['in-text-new', 'standalone-new', 'standalone-new-leading-icon', 'disabled-new']) {
      const anchor = link(page, id);
      const size = await px(anchor, 'font-size');
      expect(await css(anchor, 'content', '::after'), id).toContain('open_in_new');
      expect(await px(anchor, 'width', '::after'), id).toBe(size);
      expect(await px(anchor, 'height', '::after'), id).toBe(size);
      expect(await px(anchor, 'margin-left', '::after'), id).toBe(gap);
      // Room for it at the end of the label, kept with the last word: the box ends a glyph and a gap after the text.
      const text = (await textLines(anchor)).at(-1)!;
      near((await fragments(anchor)).at(-1)!.right - text.right, size + gap, `${id}: the room`, 0.1);
      expect(await drawn(anchor, 'color', '::after'), id).toEqual(await drawn(anchor, 'color'));
      expect(await css(anchor, 'font-family', '::after'), id).toBe(await css(page.locator('html'), '--tanrei-sys-icon-family-unselected').then((f) => page.evaluate((family) => { const probe = document.createElement('i'); probe.style.fontFamily = family; document.body.append(probe); const out = getComputedStyle(probe).fontFamily; probe.remove(); return out; }, f)));
      expect(await css(anchor, 'pointer-events', '::after'), id).toBe('none');
      // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
      expect(await drawnOpticalSize(anchor, '::after'), id).toBe(await opticalSize(page, size));
    }
    for (const id of ['in-text-new', 'standalone-new', 'standalone-new-leading-icon', 'standalone-new-trailing-icon', 'icon-only-new']) {
      const anchor = link(page, id);
      await expect(anchor).toHaveAttribute('target', '_blank');
      // No handle to the page that opened it.
      expect((await anchor.getAttribute('rel'))!.split(' '), id).toContain('noopener');
      await expect(anchor).toHaveAttribute('aria-description', 'opens in a new tab');
    }
    // The product's own glyph at the trailing side, or no label: no mark.
    for (const id of ['standalone-new-trailing-icon', 'icon-only-new', 'in-text']) expect(await css(link(page, id), 'content', '::after'), id).toBe('none');
    await expect(link(page, 'standalone-new-leading-icon').locator('.tanrei-icon')).toHaveCount(1);
    // The name holds neither the mark nor the description.
    await expect(stage(page, 'in-text-new').getByRole('link', { name: 'the source code', exact: true })).toHaveCount(1);
    await expect(stage(page, 'in-text-new').getByRole('link', { name: 'the source code', exact: true })).toHaveAccessibleDescription('opens in a new tab');
    // Right to left: the room and the mark are at the left of the label, and the mark is mirrored.
    const rtl = link(page, 'in-text-new-rtl');
    const text = (await textLines(rtl))[0];
    near(text.x - (await fragments(rtl))[0].x, (await px(rtl, 'font-size')) + gap, 'the room, at the left', 0.1);
    expect(await px(rtl, 'left', '::after')).toBe(0);
    expect(await css(rtl, 'transform', '::after')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(link(page, 'in-text-new'), 'transform', '::after')).toBe('none');
    expect(seen.filter((line) => line.includes('LNK-13'))).toEqual([]);
    // No words for it: still drawn, and reported. target same: no mark, and the description is not asked for.
    await mount(page, '<p><a class="tanrei-link" href="https://example.com/" target="_blank" id="silent">elsewhere</a> <a class="tanrei-link" href="#a" id="same">here</a></p>');
    expect(await css(page.locator('#silent'), 'content', '::after')).toContain('open_in_new');
    expect(await css(page.locator('#same'), 'content', '::after')).toBe('none');
    await expect.poll(() => seen.filter((line) => line.includes('LNK-13')).length, { message: seen.join('\n') }).toBe(1);
    expect(seen.find((line) => line.includes('LNK-13'))).toContain('aria-description');
  });
});

test.describe('glyphs and names', () => {
  test('LNK-14 a glyph beside the label stands at the side iconPosition names, in a box the size of the text, the gap from the label, centred on its line, in the label’s color, outlined and hidden from assistive technology', async ({ page }) => {
    await mountSpec(page, ['standalone-leading-icon', 'standalone-trailing-icon', 'standalone-wrapping', 'current-leading-icon', 'standalone-new-leading-icon']);
    const gap = await resolveToken(page, T('container-gap'));
    expect(gap).toBe(4);
    for (const id of ['standalone-leading-icon', 'standalone-trailing-icon', 'standalone-wrapping', 'current-leading-icon', 'standalone-new-leading-icon']) {
      const anchor = link(page, id);
      const glyph = anchor.locator('.tanrei-icon');
      const [place, size, lines] = [await box(glyph), await px(anchor, 'font-size'), await textLines(anchor)];
      expect([place.width, place.height], id).toEqual([size, size]);
      const trailing = (await anchor.getAttribute('data-icon-position')) === 'trailing';
      const beside = trailing ? lines.at(-1)! : lines[0];
      if (trailing) near(place.x - beside.right, gap, `${id}: after the label`, 0.1);
      else near(beside.x - place.right, gap, `${id}: before the label`, 0.1);
      near(place.y + place.height / 2, beside.y + beside.height / 2, `${id}: centred on the line of the word beside it`, 0.75);
      expect(await drawn(glyph, 'color'), id).toEqual(await drawn(anchor, 'color'));
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
      expect(await css(glyph, 'font-variation-settings'), id).toContain(`"FILL" ${await css(page.locator('html'), '--tanrei-sys-icon-fill-unselected')}`);
      expect(await css(glyph, 'font-variation-settings'), id).toContain(`"wght" ${await css(page.locator('html'), '--tanrei-sys-icon-weight')}`);
      // The container covers the glyph: its box is the room and the text.
      const whole = await box(anchor);
      expect(place.x, id).toBeGreaterThanOrEqual(whole.x - 0.1);
      expect(place.right, id).toBeLessThanOrEqual(whole.right + 0.1);
    }
    // The optical size follows the box, which the font clamps to its range (sys.icon.optical-size).
    expect(await css(link(page, 'standalone-leading-icon').locator('.tanrei-icon'), 'font-optical-sizing')).toBe('auto');
    expect((await textLines(link(page, 'standalone-wrapping'))).length).toBeGreaterThan(1);
  });

  test('LNK-14 at every width a leading glyph stays on the line of the first word and a trailing glyph and the mark on the line of the last: neither is ever alone on a line', async ({ page }) => {
    await mount(
      page,
      `<p>Some words first, then <a class="tanrei-link" href="#a" id="lead"><span class="tanrei-icon" aria-hidden="true">download</span>Download the tokens of the system</a> and after it
       <a class="tanrei-link" href="#a" id="trail" data-icon-position="trailing">Next: the tokens of the system<span class="tanrei-icon" aria-hidden="true">arrow_forward</span></a> and at last
       <a class="tanrei-link" href="https://example.com/" target="_blank" aria-description="opens in a new tab" id="mark">the source code of it</a>, with words after it.</p>`,
    );
    let wrapped = 0;
    for (let width = 150; width <= 420; width += 6) {
      await page.locator('.stage').evaluate((el: HTMLElement, w) => (el.style.inlineSize = `${w}px`), width);
      const [lead, trail, mark] = [page.locator('#lead'), page.locator('#trail'), page.locator('#mark')];
      const first = (await textLines(lead))[0];
      const leading = await box(lead.locator('.tanrei-icon'));
      expect(Math.abs(leading.y + leading.height / 2 - (first.y + first.height / 2)), `${width}: leading glyph on the first word’s line`).toBeLessThan(1);
      expect(first.x - leading.right, `${width}: leading glyph beside the first word`).toBeLessThan(6);
      const last = (await textLines(trail)).at(-1)!;
      const trailing = await box(trail.locator('.tanrei-icon'));
      expect(Math.abs(trailing.y + trailing.height / 2 - (last.y + last.height / 2)), `${width}: trailing glyph on the last word’s line`).toBeLessThan(1);
      expect(trailing.x - last.right, `${width}: trailing glyph beside the last word`).toBeLessThan(6);
      // The mark stands in the room at the end of the label's last part, which no break parts from the last word.
      const end = (await textLines(mark)).at(-1)!;
      const part = (await fragments(mark)).at(-1)!;
      expect(Math.abs(part.y - end.y), `${width}: the mark’s room on the last word’s line`).toBeLessThan(1);
      expect(part.right - end.right, `${width}: the mark’s room after the last word`).toBeGreaterThan(17);
      expect(part.right, `${width}: inside the stage`).toBeLessThanOrEqual((await box(page.locator('.stage'))).right - 16 + 0.5);
      if ((await fragments(trail)).length > 1) wrapped++;
    }
    expect(wrapped).toBeGreaterThan(10);
  });
  // A link that begins late on a line and ends early on a later one keeps its mark at its end, not where its FIRST
  // line began. One test for each direction of the layout and each kind of label, every one at every width.
  const END_LABELS = { 'a left-to-right': 'Design Tokens Community Group', 'a right-to-left': 'مجموعة مجتمع رموز التصميم', 'a mixed': 'مجموعة Tokens مجتمع Group' };
  const END_WORDS = { rtl: ['هذا نص عربي قبل الرابط', 'ونص بعده طويل يكفي لسطر آخر'], ltr: ['Some words before the link', 'and words after it, enough for a line'] };
  for (const direction of ['rtl', 'ltr'] as const) {
    for (const [kind, label] of Object.entries(END_LABELS)) {
      test(`LNK-14 LNK-31 LNK-13 LNK-25 in a ${direction} layout, with ${kind} label, a trailing glyph and the mark stand beside the last line of the label at every width: on its line, the gap from it, at the layout’s end side, never alone on a line and never apart from it`, async ({ page }) => {
        await mount(
          page,
          `<p>${END_WORDS[direction][0]} <a class="tanrei-link" href="#a" id="trail" data-icon-position="trailing">${label}<span class="tanrei-icon" aria-hidden="true">arrow_forward</span></a> ${END_WORDS[direction][1]}</p>
           <p>${END_WORDS[direction][0]} <a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link" id="mark">${label}</a> ${END_WORDS[direction][1]}</p>`,
          { direction },
        );
        const gap = await resolveToken(page, T('container-gap'));
        const mark = page.locator('#mark');
        const size = await px(mark, 'font-size');
        expect(await css(mark, 'direction')).toBe(direction);
        // Every width, measured in the page: the product's own trailing glyph is an element, so its box can be asked
        // for; of the mark, a pseudo-element, the room the anchor keeps for it.
        const widths = await page.locator('.stage').evaluate((stage: HTMLElement) => {
          const rect = (r: DOMRect) => ({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom });
          const lastLine = (anchor: Element) => {
            const range = document.createRange();
            range.selectNodeContents(anchor.firstChild!);
            const rects = [...range.getClientRects()].filter((r) => r.width > 0);
            const top = Math.max(...rects.map((r) => r.top));
            const line = rects.filter((r) => Math.abs(r.top - top) < r.height / 2);
            const [x, right] = [Math.min(...line.map((r) => r.left)), Math.max(...line.map((r) => r.right))];
            return { x, right, y: top, height: line[0].height };
          };
          const out = [];
          for (let width = 150; width <= 420; width += 6) {
            stage.style.inlineSize = `${width}px`;
            const [trail, mark] = [stage.querySelector('#trail')!, stage.querySelector('#mark')!];
            out.push({
              width,
              stage: rect(stage.getBoundingClientRect()),
              glyph: rect(trail.querySelector('.tanrei-icon')!.getBoundingClientRect()),
              last: lastLine(trail),
              parts: [...trail.getClientRects()].map(rect),
              end: lastLine(mark),
              markParts: [...mark.getClientRects()].map(rect),
            });
          }
          return out;
        });
        /** The link's last line ends before the place its first line began: the geometry that would part them. */
        const apart = (parts: Box[]) => parts.length > 1 && (direction === 'rtl' ? parts.at(-1)!.x > parts[0].right : parts.at(-1)!.right < parts[0].x);
        for (const { width, stage: around, glyph, last, end, markParts } of widths) {
          const what = `${width} wide`;
          near(glyph.y + glyph.height / 2, last.y + last.height / 2, `${what}: the trailing glyph on the last line of the label`, 1);
          near(direction === 'rtl' ? last.x - glyph.right : glyph.x - last.right, gap, `${what}: the trailing glyph the gap from the label`, 0.6);
          expect(glyph.x, `${what}: the trailing glyph inside the stage`).toBeGreaterThanOrEqual(around.x + 16 - 0.5);
          expect(glyph.right, `${what}: the trailing glyph inside the stage`).toBeLessThanOrEqual(around.right - 16 + 0.5);
          const part = markParts.at(-1)!;
          near(part.y + part.height / 2, end.y + end.height / 2, `${what}: the mark’s room on the last line of the label`, 1);
          near(direction === 'rtl' ? end.x - part.x : part.right - end.right, size + gap, `${what}: the mark’s room beside the last line of the label`, 0.6);
        }
        expect(widths.filter((w) => w.parts.length > 1).length, 'the link wraps at many widths').toBeGreaterThan(10);
        expect(widths.filter((w) => apart(w.parts)).length, 'widths at which the last line ends before the first began').toBeGreaterThan(2);
        // The mark itself, where it is painted (a picture of the page each time, so at a few widths: three of those
        // that would part them, the narrowest and the widest).
        const parted = widths.filter((w) => apart(w.markParts)).map((w) => w.width);
        expect(parted.length).toBeGreaterThan(2);
        const looked = [...new Set([150, parted[0], parted[Math.floor(parted.length / 2)], parted.at(-1)!, 420])];
        const picture = async (clip: { x: number; y: number; width: number; height: number }) => decodePng(await page.screenshot({ clip }));
        for (const width of looked) {
          const what = `${width} wide`;
          await page.locator('.stage').evaluate((el: HTMLElement, w) => (el.style.inlineSize = `${w}px`), width);
          const [end, part, paragraph] = [(await textLines(mark)).at(-1)!, (await fragments(mark)).at(-1)!, await box(page.locator('.stage p').nth(1))];
          const room = { x: direction === 'rtl' ? end.x - gap - size : end.right + gap, y: part.y, width: size, height: part.height };
          // With the mark and without it: what differs is the mark, and it differs in the room and nowhere else.
          const drawn = await picture(paragraph);
          await mark.evaluate((el: HTMLElement) => el.style.setProperty('--_link-arrow', 'none'));
          const without = await picture(paragraph);
          await mark.evaluate((el: HTMLElement) => el.style.removeProperty('--_link-arrow'));
          // (Device pixels: the picture is taken at the scale of the device.)
          const scale = drawn.width / paragraph.width;
          let [inside, elsewhere] = [0, 0];
          for (let y = 0; y < drawn.height; y++) {
            for (let x = 0; x < drawn.width; x++) {
              if (drawn.at(x, y) === without.at(x, y)) continue;
              const [left, top] = [paragraph.x + x / scale, paragraph.y + y / scale];
              if (left >= room.x - 1 && left <= room.x + room.width + 1 && top >= room.y - 1 && top <= room.y + room.height + 1) inside++;
              else elsewhere++;
            }
          }
          expect(inside, `${what}: the mark is painted in its room`).toBeGreaterThan(8);
          expect(elsewhere, `${what}: the mark is painted nowhere but in its room`).toBe(0);
        }
      });
    }
  }

  test('LNK-15 a link with a label is named by its text; a glyph alone by aria-label, its glyph hidden; nothing is added to the name; a glyph alone with no name still renders and is reported', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['in-text', 'standalone-leading-icon', 'icon-only', 'icon-only-new', 'current', 'in-text-new']);
    await expect(stage(page, 'in-text').getByRole('link', { name: 'the Button’s page'.replace('’', "'"), exact: true })).toHaveCount(1);
    await expect(stage(page, 'standalone-leading-icon').getByRole('link', { name: 'Download the tokens', exact: true })).toHaveCount(1);
    await expect(stage(page, 'icon-only').getByRole('link', { name: 'Link to Installation', exact: true })).toHaveCount(1);
    await expect(stage(page, 'icon-only-new').getByRole('link', { name: 'Source code', exact: true })).toHaveCount(1);
    await expect(stage(page, 'current').getByRole('link', { name: 'Components', exact: true })).toHaveCount(1);
    await expect(stage(page, 'in-text-new').getByRole('link', { name: 'the source code', exact: true })).toHaveCount(1);
    await expect(link(page, 'icon-only').locator('.tanrei-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(seen.filter((line) => line.includes('LNK-15'))).toEqual([]);
    await mount(page, '<p><a class="tanrei-link" href="#a" id="nameless"><span class="tanrei-icon" aria-hidden="true">link</span></a> <a class="tanrei-link" href="#a" id="both" aria-label="Other"><span class="tanrei-icon" aria-hidden="true">link</span>Text</a></p>');
    await expect(page.locator('#nameless')).toBeVisible();
    await expect.poll(() => seen.filter((line) => line.includes('LNK-15')).length, { message: seen.join('\n') }).toBe(2);
    expect(seen.some((line) => line.includes('no accessible name'))).toBe(true);
  });

  test('LNK-16 a glyph alone is drawn in a box the size of the text, in the icon color, its container a square one line high, with no underline and no mark; after a heading it does not make the line taller', async ({ page }) => {
    await mountSpec(page, ['icon-only', 'inverse-icon-only', 'icon-only-new']);
    for (const [id, variant] of [['icon-only', 'standard'], ['inverse-icon-only', 'inverse']] as const) {
      const anchor = link(page, id);
      const [place, line, size] = [await box(anchor), await px(anchor, 'line-height'), await px(anchor, 'font-size')];
      near(place.width, line, `${id}: one line wide`, 0.05);
      near(place.height, line, `${id}: one line high`, 0.05);
      const glyph = await box(anchor.locator('.tanrei-icon'));
      expect([glyph.width, glyph.height], id).toEqual([size, size]);
      near(glyph.x + glyph.width / 2, place.x + place.width / 2, `${id}: centred`, 0.05);
      near(glyph.y + glyph.height / 2, place.y + place.height / 2, `${id}: centred`, 0.05);
      expect(await drawn(anchor, 'color'), id).toEqual(await color(page, T(`${variant}-icon-color`)));
      expect(await drawn(anchor.locator('.tanrei-icon'), 'color'), id).toEqual(await color(page, T(`${variant}-icon-color`)));
      expect(await css(anchor, 'text-decoration-line'), id).toBe('none');
      expect(await css(anchor, 'content', '::after'), id).toBe('none');
    }
    expect(await css(link(page, 'icon-only-new'), 'content', '::after')).toBe('none');
    await mount(
      page,
      `<h2 id="with" style="font: var(--tanrei-sys-typescale-heading-2-font); margin: 0">Installation <a class="tanrei-link" href="#with" aria-label="Link to Installation"><span class="tanrei-icon" aria-hidden="true">link</span></a></h2>
       <h2 id="without" style="font: var(--tanrei-sys-typescale-heading-2-font); margin: 0">Installation</h2>`,
    );
    near((await box(page.locator('#with'))).height, (await box(page.locator('#without'))).height, 'the heading’s line', 0.01);
    near((await box(page.locator('#with a'))).height, await px(page.locator('#with'), 'line-height'), 'a line of the heading', 0.05);
    near((await box(page.locator('#with .tanrei-icon'))).width, await px(page.locator('#with'), 'font-size'), 'the heading’s font size', 0.05);
  });

  test('LNK-17 in a sentence the hit area is the link’s own text on each line; standalone, or a glyph alone, it reaches the minimum target on both axes without changing size or layout', async ({ page, browserName }) => {
    await mount(page, '<p style="inline-size: 220px"><a class="tanrei-link" href="#upper" id="upper">An upper link that fills the whole of its line</a> <a class="tanrei-link" href="#lower" id="lower">and a lower link right under it on the next</a></p>');
    const [upper, lower] = [(await fragments(page.locator('#upper')))[0], (await fragments(page.locator('#lower'))).at(-1)!];
    const hit = (x: number, y: number) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.id ?? '', [x, y]);
    // The lower half of the upper line reaches the upper link; the upper half of the lower line the lower.
    expect(await hit(upper.x + 20, upper.y + upper.height * 0.8)).toBe('upper');
    expect(await hit(lower.x + 20, lower.y + lower.height * 0.2)).toBe('lower');
    expect(await css(page.locator('#upper'), 'content', '::before')).toBe('none');
    // Beside it on its own line: not the link.
    expect(await hit((await fragments(page.locator('#lower'))).at(-1)!.right + 12, lower.y + lower.height / 2)).not.toBe('lower');

    await mountSpec(page, ['standalone', 'in-text', 'icon-only', 'disabled']);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const id of ['standalone', 'icon-only']) {
      const anchor = link(page, id);
      const place = await box(anchor);
      expect(place.height, `${id}: its visual size is below the target`).toBeLessThan(pointer);
      expect(await px(anchor, 'height', '::before'), id).toBeGreaterThanOrEqual(pointer - 0.05);
      expect(await px(anchor, 'width', '::before'), id).toBeGreaterThanOrEqual(Math.min(pointer, Math.max(place.width, pointer)) - 0.05);
      await anchor.evaluate((el) => {
        (window as any).hits = 0;
        el.addEventListener('click', (e) => { (window as any).hits++; e.preventDefault(); });
      });
      const reach = (pointer - place.height) / 2;
      await page.mouse.click(place.x + place.width / 2, place.y - reach + 1.5);
      await page.mouse.click(place.x + place.width / 2, place.bottom + reach - 1.5);
      expect(await page.evaluate(() => (window as any).hits), `${id}: above and below`).toBe(2);
    }
    // It takes no room: a standalone link is as large as the same link in a sentence would be.
    expect((await box(link(page, 'standalone'))).height).toBe((await box(link(page, 'in-text'))).height);
    near((await box(stage(page, 'standalone'))).height, (await box(stage(page, 'in-text'))).height, 'the stage', 0.01);
    expect(await css(link(page, 'in-text'), 'content', '::before')).toBe('none');
    expect(await css(link(page, 'disabled'), 'content', '::before')).toBe('none');
    // A coarse pointer: sys.target.touch (48 under the default system) for a link 22 high in its line of body text.
    expect(await px(link(page, 'standalone'), 'line-height')).toBeCloseTo(22, 1);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect(touch).toBe(48);
    await expect.poll(() => px(link(page, 'standalone'), 'height', '::before')).toBeGreaterThanOrEqual(touch - 0.05);
  });
});

test.describe('current, disabled, not a link', () => {
  test('LNK-18 the current link carries aria-current, stays a link that is focused and followed, and is drawn from the current tokens with no underline at the emphasized weight of its text style', async ({ page }) => {
    await mountSpec(page, ['standalone', 'current', 'current-leading-icon', 'inverse-current']);
    const anchor = link(page, 'current');
    await expect(anchor).toHaveAttribute('aria-current', 'page');
    await expect(anchor).toHaveAttribute('href', '/components/');
    expect(await css(anchor, 'text-decoration-line')).toBe('none');
    expect(await css(link(page, 'standalone'), 'text-decoration-line')).toBe('underline');
    const weight = Number(await css(anchor, 'font-weight'));
    expect(weight).toBe(Number(await css(link(page, 'standalone'), 'font-weight')) + Number(await css(page.locator('html'), '--tanrei-sys-typescale-emphasis-body')));
    expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-current-label-color')));
    expect(await drawn(link(page, 'inverse-current'), 'color')).toEqual(await color(page, T('inverse-current-label-color')));
    expect(await drawn(link(page, 'current-leading-icon').locator('.tanrei-icon'), 'color')).toEqual(await color(page, T('standard-current-icon-color')));
    await anchor.hover();
    await expect.poll(() => drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-hovered-current-container-color')));
    await hoverless(page);
    await tabTo(page, anchor);
    await expect(anchor).toBeFocused();
    expect(await drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-focused-current-container-color')));
    await expect(stage(page, 'current').getByRole('link', { name: 'Components', exact: true })).toHaveAttribute('aria-current', 'page');
    // In a heading: that style's emphasized weight (prose and text.css name it for the text they set).
    await mount(page, '<h2 style="font: var(--tanrei-sys-typescale-heading-2-font); --tanrei-text-emphasized-weight: var(--tanrei-sys-typescale-heading-2-font-weight-emphasized)"><a class="tanrei-link" href="#a" aria-current="location" id="here">Here</a> <a class="tanrei-link" href="#b" id="there">There</a></h2>');
    expect(Number(await css(page.locator('#here'), 'font-weight'))).toBe(Number(await css(page.locator('#there'), 'font-weight')) + Number(await css(page.locator('html'), '--tanrei-sys-typescale-emphasis-heading')));
    expect(await css(page.locator('#here'), 'text-decoration-line')).toBe('none');
    // aria-current="false" is not current.
    await mount(page, '<p><a class="tanrei-link" href="#a" aria-current="false" id="not">Not current</a></p>');
    expect(await css(page.locator('#not'), 'text-decoration-line')).toBe('underline');
  });

  test('LNK-19 a disabled link is the anchor without href, with the link role and the disabled state: drawn from the disabled tokens with its underline and mark, passed by Tab, emitting no click and opening nothing', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['standalone', 'disabled', 'disabled-new', 'disabled-icon-only', 'inverse-disabled', 'in-text']);
    for (const [id, variant, part] of [['disabled', 'standard', 'label'], ['disabled-new', 'standard', 'label'], ['disabled-icon-only', 'standard', 'icon'], ['inverse-disabled', 'inverse', 'label']] as const) {
      const anchor = link(page, id);
      expect(await anchor.getAttribute('href'), id).toBeNull();
      await expect(anchor).toHaveAttribute('role', 'link');
      await expect(anchor).toHaveAttribute('aria-disabled', 'true');
      expect(await drawn(anchor, 'color'), id).toEqual(await color(page, T(`${variant}-disabled-${part}-color`)));
      expect(await drawn(anchor, 'background-color'), id).toEqual(await color(page, T(`${variant}-disabled-container-color`)));
      expect(await anchor.evaluate((el: HTMLElement) => (el.focus(), document.activeElement === el)), `${id}: not focusable`).toBe(false);
      await anchor.hover();
      expect(await drawn(anchor, 'background-color'), `${id}: no hover`).toEqual(await color(page, T(`${variant}-disabled-container-color`)));
      await page.mouse.down();
      expect(await anchor.getAttribute('data-pressed'), `${id}: no press`).toBeNull();
      await page.mouse.up();
    }
    expect(await css(link(page, 'disabled'), 'text-decoration-line')).toBe('underline');
    expect(await drawn(link(page, 'disabled'), 'text-decoration-color')).toEqual(await color(page, T('standard-disabled-label-color')));
    expect(await css(link(page, 'disabled-new'), 'content', '::after')).toContain('open_in_new');
    expect(await drawn(link(page, 'disabled-new'), 'color', '::after')).toEqual(await color(page, T('standard-disabled-label-color')));
    await expect(stage(page, 'disabled').getByRole('link', { name: 'Previous page', exact: true, disabled: true })).toHaveCount(1);
    expect(seen.filter((line) => line.includes('LNK-19'))).toEqual([]);
    // Tab passes it: from the link before to the link after.
    await mount(page, '<p><a class="tanrei-link" href="#a" id="before">Before</a> <a class="tanrei-link" role="link" aria-disabled="true" id="off">Previous page</a> <a class="tanrei-link" href="#b" id="after">After</a></p>');
    await tabTo(page, page.locator('#before'));
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
    // An address left on a disabled link is not opened, and no click is emitted; a debug build says what to write.
    await mount(page, '<p><a class="tanrei-link" href="#there" role="link" aria-disabled="true" id="left">Previous page</a></p>');
    await page.evaluate(() => {
      (window as any).clicks = 0;
      document.querySelector('#left')!.addEventListener('click', () => (window as any).clicks++);
    });
    await page.locator('#left').click({ force: true });
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([0, '']);
    await expect.poll(() => seen.filter((line) => line.includes('LNK-19')).length).toBe(1);
  });

  test('LNK-21 an address that is empty, white space, a script or unreadable is no link: drawn as the text around it, with no role, no focus, no state and no mark, and reported; an unknown target opens as same and an unknown variant is the default', async ({ page }) => {
    const seen = reports(page);
    await mount(
      page,
      `<p id="p">Text <a class="tanrei-link" href="" id="empty" target="_blank">empty</a> <a class="tanrei-link" href="   " id="space">space</a> <a class="tanrei-link" href="javascript:void(0)" id="script">script</a>
       <a class="tanrei-link" href="java&#10;script:alert(1)" id="split">split</a> <a class="tanrei-link" href="https://[" id="unreadable">unreadable</a> <a class="tanrei-link" id="none">none</a>
       <a class="tanrei-link" href="#ok" id="ok" data-standalone>ok</a></p>
       <p><a class="tanrei-link" href="#a" target="frame" id="frame">frame</a> <a class="tanrei-link" href="#a" data-variant="loud" id="loud">loud</a> <a class="tanrei-link" href="#a" id="plain">plain</a></p>`,
    );
    const text = await drawn(page.locator('#p'), 'color');
    for (const id of ['empty', 'space', 'script', 'split', 'unreadable', 'none']) {
      const anchor = page.locator(`#${id}`);
      await expect.poll(() => anchor.getAttribute('href'), id).toBeNull();
      expect(await drawn(anchor, 'color'), id).toEqual(text);
      expect(await css(anchor, 'text-decoration-line'), id).toBe('none');
      expect(await css(anchor, 'content', '::after'), id).toBe('none');
      expect(await css(anchor, 'content', '::before'), id).toBe('none');
      expect(await anchor.evaluate((el: HTMLElement) => (el.focus(), document.activeElement === el)), `${id}: not focusable`).toBe(false);
      await anchor.hover();
      expect(await drawn(anchor, 'background-color'), `${id}: no hover`).toEqual([0, 0, 0, 0]);
      await page.mouse.down();
      expect(await anchor.getAttribute('data-pressed'), `${id}: no press`).toBeNull();
      await page.mouse.up();
    }
    await expect(page.locator('#p').getByRole('link')).toHaveCount(1);
    await tabTo(page, page.locator('#ok'));
    for (const id of ['empty', 'space', 'script', 'split', 'unreadable', 'none']) expect(seen.filter((line) => line.includes('LNK-21') && line.includes('href')).length, id).toBeGreaterThanOrEqual(6);
    expect(seen.filter((line) => line.includes('names a script')).length).toBe(2);
    expect(seen.filter((line) => line.includes('cannot be read')).length).toBe(1);
    expect(seen.filter((line) => line.includes('is empty')).length).toBe(2);
    expect(seen.filter((line) => line.includes('has no href')).length).toBe(1);
    // An unknown target: taken off, so the link opens where the person is; an unknown variant: the default's tokens.
    await expect.poll(() => page.locator('#frame').getAttribute('target')).toBeNull();
    expect(await css(page.locator('#frame'), 'content', '::after')).toBe('none');
    expect(seen.some((line) => line.includes('target "frame"'))).toBe(true);
    expect(await drawn(page.locator('#loud'), 'color')).toEqual(await drawn(page.locator('#plain'), 'color'));
    expect(seen.some((line) => line.includes('data-variant "loud"'))).toBe(true);
    // An address given later is read again.
    await page.locator('#none').evaluate((el) => el.setAttribute('href', 'javascript:void(0)'));
    await expect.poll(() => page.locator('#none').getAttribute('href')).toBeNull();
  });

  test('LNK-21 without the package’s script the stylesheet draws an anchor with no address, an empty one or a script’s as the text around it', async ({ page }) => {
    await bare(page, '<p id="p">Text <a class="tanrei-link" id="none">none</a> <a class="tanrei-link" href="" id="empty">empty</a> <a class="tanrei-link" href="JavaScript:void(0)" target="_blank" id="script">script</a> <a class="tanrei-link" href="#a" id="ok">ok</a></p>');
    const text = await drawn(page.locator('#p'), 'color');
    for (const id of ['none', 'empty', 'script']) {
      expect(await drawn(page.locator(`#${id}`), 'color'), id).toEqual(text);
      expect(await css(page.locator(`#${id}`), 'text-decoration-line'), id).toBe('none');
      expect(await css(page.locator(`#${id}`), 'content', '::after'), id).toBe('none');
    }
    expect(await css(page.locator('#ok'), 'text-decoration-line')).toBe('underline');
  });
});

test.describe('forced colors, scaling, direction', () => {
  test('LNK-22 while the platform forces its colors the label, the glyph and the underline are its link color, a disabled link its disabled text color, the underline stays and the focus ring is its highlight', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['in-text', 'standalone-leading-icon', 'disabled', 'icon-only', 'inverse']);
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.cssText = `color: ${keyword}; forced-color-adjust: none`;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, name);
    const forced = await page.evaluate(() => {
      // The media query alone is not the mode: WebKit answers it under emulation and repaints nothing.
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    // The stylesheet's own rule holds in every engine that answers the query: the colors it names are the platform's.
    for (const id of ['in-text', 'standalone-leading-icon', 'icon-only', 'inverse']) {
      expect(rgba(await css(link(page, id), 'color')), id).toEqual(rgba(await system('LinkText')));
    }
    expect(rgba(await css(link(page, 'standalone-leading-icon').locator('.tanrei-icon'), 'color'))).toEqual(rgba(await system('LinkText')));
    expect(rgba(await css(link(page, 'disabled'), 'color'))).toEqual(rgba(await system('GrayText')));
    for (const id of ['in-text', 'disabled', 'inverse']) {
      expect(await css(link(page, id), 'text-decoration-line'), id).toBe('underline');
      expect(rgba(await css(link(page, id), 'text-decoration-color')), id).toEqual(rgba(await css(link(page, id), 'color')));
    }
    await tabTo(page, link(page, 'in-text'));
    expect(rgba(await css(link(page, 'in-text'), 'outline-color'))).toEqual(rgba(await system('Highlight')));
    expect(await css(link(page, 'in-text'), 'outline-style')).toBe('solid');
    if (!forced) test.info().annotations.push({ type: 'forced-colors', description: 'the mode is not emulated by this browser: the stylesheet’s rule is read, the repaint is not' });
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('LNK-23 with the text size enlarged the label, the glyph box, the container and the hit area grow with the text; the underline, its offset and the gap stay', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountSpec(page, ['standalone-leading-icon', 'icon-only', 'in-text-wrapping']);
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      const anchor = link(page, 'standalone-leading-icon');
      const glyph = await box(anchor.locator('.tanrei-icon'));
      return {
        size: await px(anchor, 'font-size'),
        glyph: glyph.width,
        part: (await fragments(anchor))[0].height,
        alone: (await box(link(page, 'icon-only'))).height,
        hit: await px(link(page, 'icon-only'), 'height', '::before'),
        underline: await px(anchor, 'text-decoration-thickness'),
        offset: await px(anchor, 'text-underline-offset'),
        gap: (await textLines(anchor))[0].x - glyph.right,
        lines: (await fragments(link(page, 'in-text-wrapping'))).length,
        fits: await stage(page, 'in-text-wrapping').evaluate((el) => el.scrollWidth <= el.clientWidth),
      };
    };
    const normal = await measure(false);
    const large = await measure(true);
    near(large.size, normal.size * 2, 'the label', 0.01);
    near(large.glyph, normal.glyph * 2, 'the glyph box', 0.01);
    expect(large.part).toBeGreaterThan(normal.part * 1.8);
    near(large.alone, normal.alone * 2, 'a glyph alone', 0.1);
    expect(large.hit).toBeGreaterThanOrEqual(Math.max(normal.hit, large.alone) - 0.05);
    // The underline, its offset and the gap stay the tokens': none is a multiple of the text's size. (On the web a
    // space token is a rem length, so the system's spaces follow the reader's text size, here as in every component;
    // a border width does not.)
    expect(large.underline).toBe(normal.underline);
    expect([large.underline, large.offset]).toEqual([await resolveToken(page, T('underline-width')), await resolveToken(page, T('underline-offset'))]);
    near(large.gap, await resolveToken(page, T('container-gap')), 'the gap', 0.1);
    // Nothing has a fixed size: it wraps over more lines and nothing is cut.
    expect(large.lines).toBeGreaterThan(normal.lines);
    expect(large.fits).toBe(true);
  });

  test('LNK-24 the link takes its direction from an ancestor inside the page and has none of its own; a change while it is shown is drawn at once, keeping its focus', async ({ page }) => {
    await mount(page, '<div id="region" dir="rtl"><p><a class="tanrei-link" href="#a" id="one" data-standalone><span class="tanrei-icon" aria-hidden="true">download</span>تنزيل الرموز</a></p></div>');
    const anchor = page.locator('#one');
    expect(await page.locator('html').getAttribute('dir')).toBeNull();
    expect(await anchor.getAttribute('dir')).toBeNull();
    expect(await css(anchor, 'direction')).toBe('rtl');
    const side = async () => {
      const [glyph, text] = [await box(anchor.locator('.tanrei-icon')), (await textLines(anchor))[0]];
      return glyph.x > text.right ? 'right' : glyph.right < text.x ? 'left' : 'over';
    };
    expect(await side()).toBe('right');
    await tabTo(page, anchor);
    await page.locator('#region').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await side()).toBe('left');
    await expect(anchor).toBeFocused();
    expect(await css(anchor, 'transition-property')).not.toMatch(/padding|margin|all/);
    await page.locator('#region').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await side()).toBe('right');
    await expect(anchor).toBeFocused();
  });

  test('LNK-25 right to left: a glyph the icon set marks is drawn mirrored in its own box, at the left of the label; one it does not mark is not; the link mirrors nothing itself', async ({ page }) => {
    await mountSpec(page, ['standalone-trailing-icon-rtl']);
    const rtl = link(page, 'standalone-trailing-icon-rtl');
    const glyph = rtl.locator('.tanrei-icon');
    await expect(glyph).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(glyph, 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    const [place, text, size, gap] = [await box(glyph), (await textLines(rtl))[0], await px(rtl, 'font-size'), await resolveToken(page, T('container-gap'))];
    near(text.x - place.right, gap, 'at the left of the label', 0.1);
    expect([place.width, place.height]).toEqual([size, size]);
    expect(await drawn(glyph, 'color')).toEqual(await drawn(rtl, 'color'));
    // The link mirrors nothing itself: the glyph's own box is what is turned.
    expect(await css(rtl, 'transform')).toBe('none');
    // A leading glyph, and a trailing one of a link that wraps, in a right-to-left layout: each at its own edge.
    await mount(
      page,
      `<p><a class="tanrei-link" href="#a" id="lead" data-standalone><span class="tanrei-icon" aria-hidden="true">download</span>تنزيل الرموز</a></p>
       <p><a class="tanrei-link" href="#a" id="trail" data-standalone data-icon-position="trailing">دليل إمكانية الوصول الذي يشرح كيف يُسمّى كل مكوّن وكيف يُستخدم من لوحة المفاتيح<span class="tanrei-icon" aria-hidden="true">arrow_forward</span></a></p>`,
      { direction: 'rtl' },
    );
    const [leadGlyph, leadText] = [await box(page.locator('#lead .tanrei-icon')), (await textLines(page.locator('#lead')))[0]];
    near(leadGlyph.x - leadText.right, gap, 'a leading glyph at the right of the label', 0.1);
    const [trailGlyph, trailLines] = [await box(page.locator('#trail .tanrei-icon')), await textLines(page.locator('#trail'))];
    expect(trailLines.length).toBeGreaterThan(1);
    near(trailLines.at(-1)!.x - trailGlyph.right, gap, 'a trailing glyph at the left of the last line', 0.1);
    near(trailGlyph.y + trailGlyph.height / 2, trailLines.at(-1)!.y + trailLines.at(-1)!.height / 2, 'on the last line', 0.75);
    await mountSpec(page, ['standalone-trailing-icon', 'icon-only-rtl']);
    // Left to right, the same glyph is unmirrored; `link` is not marked by the icon set.
    expect(await css(link(page, 'standalone-trailing-icon').locator('.tanrei-icon'), 'transform')).toBe('none');
    expect(await css(link(page, 'icon-only-rtl').locator('.tanrei-icon'), 'transform')).toBe('none');
    // The product's word for one use, and content that is not a glyph's name.
    await mount(
      page,
      `<p><a class="tanrei-link" href="#a" id="never" data-icon-position="trailing">التالي<span class="tanrei-icon" aria-hidden="true" data-mirror="never">arrow_forward</span></a>
       <a class="tanrei-link" href="#a" id="always"><span class="tanrei-icon" aria-hidden="true" data-mirror="always">download</span>تنزيل</a>
       <a class="tanrei-link" href="#a" id="picture"><img alt="" width="14" height="14" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">صورة</a></p>`,
      { direction: 'rtl' },
    );
    expect(await css(page.locator('#never .tanrei-icon'), 'transform')).toBe('none');
    expect(await css(page.locator('#always .tanrei-icon'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(page.locator('#picture img'), 'transform')).toBe('none');
  });

  test('LNK-26 a standalone link lays out its label as text of its own direction, placed by the layout’s; a link in a sentence is part of that sentence, isolated', async ({ page }) => {
    await mountSpec(page, ['ltr-label-rtl', 'in-text', 'standalone']);
    const anchor = link(page, 'ltr-label-rtl');
    expect(await css(anchor, 'unicode-bidi')).toBe('plaintext');
    expect(await css(link(page, 'standalone'), 'unicode-bidi')).toBe('plaintext');
    // (A standalone link with a glyph or the mark stays the layout's text: the web's limit, README "Link".)
    expect(await css(link(page, 'in-text'), 'unicode-bidi')).toBe('isolate');
    // The address reads in its own order — "example" at the left of "tanrei" — at the right edge of the stage.
    const at = (index: number) =>
      anchor.evaluate((el, i) => {
        const range = document.createRange();
        range.setStart(el.firstChild!, i);
        range.setEnd(el.firstChild!, i + 1);
        return range.getBoundingClientRect().left;
      }, index);
    const length = (await anchor.textContent())!.length;
    expect(await at(0)).toBeLessThan(await at(length - 1));
    for (let i = 1; i < length; i++) expect(await at(i), `character ${i}`).toBeGreaterThan(await at(i - 1));
    near((await box(anchor)).right, (await box(stage(page, 'ltr-label-rtl'))).right - 16, 'the start edge of the layout', 0.5);
    // In a sentence: a left-to-right phrase in a right-to-left sentence reorders nothing beside it.
    await mount(page, '<p id="p">هذا <a class="tanrei-link" href="#a" id="in">example.com/tanrei</a>! نص</p>', { direction: 'rtl' });
    expect(await css(page.locator('#in'), 'unicode-bidi')).toBe('isolate');
    const mark = await page.locator('#p').evaluate((el) => {
      const node = el.lastChild!;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 1);
      return range.getBoundingClientRect().right;
    });
    // The "!" after the link belongs to the sentence: it stands at the left of the link, not at its right.
    expect(mark).toBeLessThanOrEqual((await box(page.locator('#in'))).x + 0.5);
  });
});

test.describe('prose', () => {
  test('prose’s own anchors are the Link without a class, and a heading’s anchor is the glyph alone (PRS-16, PRS-17, PRS-21; LNK-16)', async ({ page }) => {
    const prose = loadSpec('prose');
    await fresh(page);
    await mountFixtures(page, prose, {
      icons: true,
      fixtures: [{
        id: 't',
        props: {},
        content: `<div class="tanrei-prose-heading"><h2 id="s">A section</h2><a class="tanrei-prose-anchor" href="#s" aria-label="Link to: A section"><span class="tanrei-icon" aria-hidden="true">link</span></a></div>
          <p>Read <a href="#s" id="in">the section</a> and <a href="https://example.com/" target="_blank" aria-description="opens in a new tab" id="out">the source</a>.</p>
          <div class="tanrei-not-prose"><a href="#s" id="island">an island’s own</a></div>`,
      }],
    });
    const [inText, out, anchor] = [page.locator('#in'), page.locator('#out'), page.locator('.tanrei-prose-anchor')];
    expect(await drawn(inText, 'color')).toEqual(await color(page, T('standard-label-color')));
    expect(await css(inText, 'text-decoration-line')).toBe('underline');
    expect(await px(inText, 'text-underline-offset')).toBe(await resolveToken(page, T('underline-offset')));
    await inText.hover();
    await expect.poll(() => drawn(inText, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
    expect(await css(out, 'content', '::after')).toContain('open_in_new');
    expect((await out.getAttribute('rel'))!.split(' ')).toContain('noopener');
    // The heading's anchor: the icon color, no underline, one line of the heading square, the hit area, the ring.
    expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-icon-color')));
    expect(await css(anchor, 'text-decoration-line')).toBe('none');
    near((await box(anchor)).height, await px(page.locator('.tanrei-prose-heading'), 'line-height'), 'one line of the heading', 0.05);
    near((await box(anchor.locator('.tanrei-icon'))).width, await px(page.locator('.tanrei-prose-heading'), 'font-size'), 'the heading’s font size', 0.05);
    expect(await px(anchor, 'height', '::before')).toBeGreaterThanOrEqual((await resolveToken(page, '--tanrei-sys-target-pointer')) - 0.05);
    await tabTo(page, anchor);
    expect(await css(anchor, 'outline-style')).toBe('solid');
    // An island's anchor is not prose's.
    expect(await css(page.locator('#island'), 'text-underline-offset')).toBe('auto');
  });
});

test.describe('fixtures', () => {
  test('all 50 fixtures are mounted, each as an anchor with the class in a stage of its own, the inverse ones on the inverse surface', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(50);
    await mountSpec(page);
    await expect(page.locator('.stage > a.tanrei-link')).toHaveCount(50);
    for (const f of spec.fixtures) {
      await expect(link(page, f.id), f.id).toHaveCount(1);
      const surface = await drawn(stage(page, f.id), 'background-color');
      expect(surface, f.id).toEqual(await color(page, f.props.variant === 'inverse' ? '--tanrei-sys-color-inverse-surface' : '--tanrei-sys-color-surface'));
    }
    // The review gallery draws the same document (review/server.ts asks for it with the assets as URLs).
    const gallery = await fixturesDocument(spec, { icons: true, assets: { font: '/f.css', tokens: '/t.css', system: (id) => `/${id}.css`, icons: () => '/i.css', bundle: '/b.js' } });
    for (const f of spec.fixtures) expect(gallery, f.id).toContain(`data-fixture="${f.id}"`);
    expect(gallery.match(/<div class="stage" data-fixture="[^"]+"(?: dir="rtl")?><a class="tanrei-link"/g)).toHaveLength(50);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`accessibility: every fixture passes axe in ${theme}`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      // A site's picture is asked for lazily: it has arrived, or failed, before the stage is compared. One that is not
      // drawn (the mark is off, or a glyph leads: LNK-32) is never asked for, so it is not waited for.
      await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete || image.getClientRects().length === 0))).toBe(true);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// ── The underline is a choice, and a link that leaves the site says so ────────────────────
// LNK-27 to LNK-35, and the parts of LNK-3, 13, 15, 19, 21, 22, 23 and 25 that concern them.

/** The page's own address in the tests that need one: every request of the page is answered here, and none leaves. */
const SITE = 'https://site.test';
const SITE_FILES: Record<string, [string, string]> = {
  '/tokens.css': ['dist/tokens.css', 'text/css'],
  '/icons.css': ['dist/icons.css', 'text/css'],
  '/link.css': ['dist/link.css', 'text/css'],
  '/prose.css': ['dist/prose.css', 'text/css'],
  '/tanrei.bundle.js': ['dist/tanrei.bundle.js', 'text/javascript'],
};
interface Asked { url: string; type: string; referer: string | undefined }
/**
 * A page served at `https://site.test/` — a page with an address, which a page written into a blank window has not —
 * holding `body`, the package's stylesheets and, unless `script` is false, its script as a module the test can import
 * again. Returns every request the page made; a request to any other origin is recorded and refused.
 */
const served = async (page: P, body: string, { script = true }: { script?: boolean } = {}): Promise<Asked[]> => {
  const asked: Asked[] = [];
  await fresh(page);
  await page.unroute('**/*').catch(() => {});
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    asked.push({ url: request.url(), type: request.resourceType(), referer: (await request.allHeaders()).referer });
    if (url.origin !== SITE) return route.abort();
    if (url.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>site</title><link rel="icon" href="data:,">
          <link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/icons.css"><link rel="stylesheet" href="/link.css"><link rel="stylesheet" href="/prose.css">
          <style>body { margin: 16px; inline-size: 480px; font: var(--tanrei-sys-typescale-body-font); color: var(--tanrei-sys-color-on-surface); background: var(--tanrei-sys-color-surface); }</style>
          ${script ? '<script type="module" src="/tanrei.bundle.js"></script>' : ''}</head><body>${body}</body></html>`,
      });
    }
    const file = SITE_FILES[url.pathname];
    if (file) return route.fulfill({ contentType: file[1], body: read(file[0]) });
    if (url.pathname === '/icons/site.png') return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(pkg, 'test/fixtures/site-icon.png')) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
  await page.goto(`${SITE}/`);
  if (script) await page.waitForFunction(() => !!(document as unknown as Record<symbol, unknown>)[Symbol.for('tanrei.observe-links')]);
  return asked;
};
/** Calls a function of the package's script on a `served` page: the module the page itself loaded. */
const api = (page: P, name: 'setSiteOrigins' | 'setExternalLabel' | 'setWords', value: unknown) =>
  page.evaluate(async ([n, v]) => { const module = (await import('/tanrei.bundle.js' as string)) as Record<string, (value: unknown) => void>; module[n as string](v); }, [name, value] as const);
const TRANSPARENT = [0, 0, 0, 0];
/** The underline as it is drawn now: its line, and its color once settled. */
const underline = async (anchor: Locator) => ({ line: await css(anchor, 'text-decoration-line'), color: await drawn(anchor, 'text-decoration-color') });
const external = (anchor: Locator) => anchor.getAttribute('data-external');
const picture = (anchor: Locator) => anchor.locator('> img.tanrei-link-site-icon');
/** The room the link keeps before its first word and after its last. */
const rooms = async (anchor: Locator) => {
  const [parts, text] = [await fragments(anchor), await textLines(anchor)];
  const rtl = (await css(anchor, 'direction')) === 'rtl';
  const [first, last] = [{ part: parts[0], text: text[0] }, { part: parts.at(-1)!, text: text.at(-1)! }];
  return rtl ? { start: first.part.right - first.text.right, end: last.text.x - last.part.x } : { start: first.text.x - first.part.x, end: last.part.right - last.text.right };
};
/** Whether this browser answers style container queries, as the package's script asks. */
const hasStyleQueries = (page: P) =>
  page.evaluate(() => {
    const [outer, inner, sheet] = [document.createElement('div'), document.createElement('div'), document.createElement('style')];
    sheet.textContent = '@container style(--probe: on) { .probe-inner { --answer: yes; } }';
    outer.style.setProperty('--probe', 'on');
    inner.className = 'probe-inner';
    outer.append(inner);
    document.head.append(sheet);
    document.body.append(outer);
    const answer = getComputedStyle(inner).getPropertyValue('--answer').trim() === 'yes';
    outer.remove();
    sheet.remove();
    return answer;
  });
/** What Chromium's accessibility tree says of the links of the page: role, name, description, and the roles under each. */
const exposedLinks = async (page: P) => {
  const session = await page.context().newCDPSession(page);
  const { nodes } = (await session.send('Accessibility.getFullAXTree')) as { nodes: { nodeId: string; ignored?: boolean; role?: { value: string }; name?: { value: string }; description?: { value: string }; childIds?: string[]; properties?: { name: string; value: { value: unknown } }[] }[] };
  await session.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const under = (id: string): string[] => (byId.get(id)?.childIds ?? []).flatMap((child) => [...(byId.get(child)?.ignored ? [] : [byId.get(child)?.role?.value ?? '']), ...under(child)]);
  return nodes.filter((node) => !node.ignored && node.role?.value === 'link').map((node) => ({ name: node.name?.value ?? '', description: node.description?.value ?? '', within: under(node.nodeId), disabled: node.properties?.find((p) => p.name === 'disabled')?.value.value === true }));
};

test.describe('the underline is a choice', () => {
  test('LNK-27 LNK-3 the underline is drawn as data-underline names, whatever the tokens say, and otherwise as comp.link.underline.visibility names — the system’s choice, a region’s, the default always; the line is hidden by its color, never taken away', async ({ page }) => {
    await mountSpec(page, ['in-text', 'underline-always', 'underline-hover', 'underline-never', 'standalone-underline-hover', 'standalone-underline-never', 'inverse-underline-never', 'current', 'icon-only']);
    await hoverless(page);
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-link-underline')).toBe('always');
    expect(await css(page.locator('html'), T('underline-visibility'))).toBe('always');
    // The default system: at rest, in the label's color; `always` says the same.
    for (const id of ['in-text', 'underline-always']) expect(await underline(link(page, id)), id).toEqual({ line: 'underline', color: await drawn(link(page, id), 'color') });
    // hover and never: the line stays a part of the text's decoration (LNK-3's thickness and offset) and has no color.
    for (const id of ['underline-hover', 'underline-never', 'standalone-underline-hover', 'standalone-underline-never', 'inverse-underline-never']) {
      expect(await underline(link(page, id)), id).toEqual({ line: 'underline', color: TRANSPARENT });
      expect(await px(link(page, id), 'text-decoration-thickness'), id).toBe(await resolveToken(page, T('underline-width')));
      expect(await px(link(page, id), 'text-underline-offset'), id).toBe(await resolveToken(page, T('underline-offset')));
    }
    // The current link and a glyph alone draw none, whatever the choice.
    for (const choice of ['always', 'hover', 'never']) {
      for (const id of ['current', 'icon-only']) {
        await link(page, id).evaluate((el, value) => el.setAttribute('data-underline', value), choice);
        expect(await css(link(page, id), 'text-decoration-line'), `${id} ${choice}`).toBe('none');
      }
    }

    // The tokens: the system's choice reaches the link through the component's, and one link is set apart from both.
    if (!(await hasStyleQueries(page))) return test.info().annotations.push({ type: 'style-queries', description: 'not in this browser: the tokens are read by the script, on the root alone (the next test)' });
    await mount(page, `<p id="system">Read <a class="tanrei-link" href="#a" id="auto">the guide</a>, <a class="tanrei-link" href="#a" data-underline="always" id="always">the manual</a>, <a class="tanrei-link" href="#a" data-underline="hover" id="hover">the notes</a> and <a class="tanrei-link" href="#a" data-underline="never" id="never">the index</a>.</p>
      <footer id="region" style="${T('underline-visibility')}: never"><a class="tanrei-link" href="#a" data-standalone id="in-region">About</a> <a class="tanrei-link" href="#a" data-standalone data-underline="always" id="apart">Contact</a></footer>`);
    await hoverless(page);
    const at = async (id: string) => (await underline(page.locator(`#${id}`))).color[3];
    const shown = async () => Object.fromEntries(await Promise.all(['auto', 'always', 'hover', 'never', 'in-region', 'apart'].map(async (id) => [id, await at(id)])));
    await expect.poll(shown).toEqual({ auto: 1, always: 1, hover: 0, never: 0, 'in-region': 0, apart: 1 });
    // The system's choice: one line of a design system or a product's layer. A link's own value still wins, and a
    // region's own value of the component token stands.
    const words = await textLines(page.locator('#auto'));
    await page.locator('#auto').focus();
    await rootTokens(page, { '--tanrei-sys-behavior-link-underline': 'never' });
    expect(await css(page.locator('#system'), T('underline-visibility'))).toBe('never');
    await expect.poll(shown).toEqual({ auto: 0, always: 1, hover: 0, never: 0, 'in-region': 0, apart: 1 });
    // At once, moving no text and keeping the focus (the line is its color: nothing is laid out again).
    expect(await textLines(page.locator('#auto'))).toEqual(words);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('auto');
    // (hover: the focused link shows its line — the keyboard reveals what the pointer does, LNK-28 — and the others none.)
    await rootTokens(page, { '--tanrei-sys-behavior-link-underline': 'hover' });
    await expect.poll(shown).toEqual({ auto: 1, always: 1, hover: 0, never: 0, 'in-region': 0, apart: 1 });
    await page.locator('#auto').evaluate((el: HTMLElement) => el.blur());
    await expect.poll(() => at('auto')).toBe(0);
    // The component set apart from the system: the Link's own token.
    await rootTokens(page, { '--tanrei-sys-behavior-link-underline': 'never', [T('underline-visibility')]: 'always' });
    await expect.poll(shown).toEqual({ auto: 1, always: 1, hover: 0, never: 0, 'in-region': 0, apart: 1 });
    // A name the choice does not have is the first value, always.
    await rootTokens(page, { [T('underline-visibility')]: 'sometimes' });
    await expect.poll(() => at('auto')).toBe(1);
  });

  test('LNK-27 LNK-33 without style queries the script writes the two choices on the document’s root, where the stylesheet reads them; with them it writes nothing, and both draw the same', async ({ page }) => {
    const body = `<p>Read <a class="tanrei-link" href="#a" id="auto">the guide</a> and <a class="tanrei-link" href="#a" data-underline="always" id="always">the manual</a>, or
      <a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link" id="out"><img class="tanrei-link-site-icon" src="${fixturePictureUrl}" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">the standard</a>.</p>`;
    await mount(page, body);
    await hoverless(page);
    const queries = await hasStyleQueries(page);
    const root = page.locator('html');
    const names = async () => [await root.getAttribute('data-underline-system'), await root.getAttribute('data-external-marks-system')];
    // The default system: the first value of each.
    expect(await names()).toEqual(queries ? [null, null] : ['always', 'all']);
    expect((await underline(page.locator('#auto'))).color[3]).toBe(1);
    expect(await css(picture(page.locator('#out')), 'display')).not.toBe('none');
    // Another choice, on the root: read again when the root changes.
    await rootTokens(page, { [T('underline-visibility')]: 'never', [T('external-marks')]: 'arrow' });
    await expect.poll(names).toEqual(queries ? [null, null] : ['never', 'arrow']);
    await expect.poll(async () => (await underline(page.locator('#auto'))).color).toEqual(TRANSPARENT);
    expect((await underline(page.locator('#always'))).color[3]).toBe(1);
    expect(await css(picture(page.locator('#out')), 'display')).toBe('none');
    near((await rooms(page.locator('#out'))).start, 0, 'no room for a picture that is not drawn', 0.1);
    expect(await css(page.locator('#out'), 'content', '::after')).toContain('arrow_outward');
    await rootTokens(page, { [T('underline-visibility')]: 'hover', [T('external-marks')]: 'none' });
    await expect.poll(names).toEqual(queries ? [null, null] : ['hover', 'none']);
    await expect.poll(async () => (await underline(page.locator('#auto'))).color).toEqual(TRANSPARENT);
    expect(await css(page.locator('#out'), 'display', '::after')).toBe('none');
    near((await rooms(page.locator('#out'))).end, 0, 'no room for an arrow that is not drawn', 0.1);
    // A name neither choice has is its first value.
    await rootTokens(page, { [T('underline-visibility')]: 'sometimes', [T('external-marks')]: 'some' });
    await expect.poll(names).toEqual(queries ? [null, null] : ['always', 'all']);
    await expect.poll(async () => (await underline(page.locator('#auto'))).color[3]).toBe(1);
    expect(await css(picture(page.locator('#out')), 'display')).not.toBe('none');
    expect(await css(page.locator('#out'), 'display', '::after')).not.toBe('none');
  });

  test('LNK-28 hover: no line at rest; the line arrives with hover, keyboard focus and press, over the state’s motion and moving nothing, with the focus ring; never: no line in any state, and the states are still shown', async ({ page }) => {
    await mount(page, `<p id="p">Read <a class="tanrei-link" href="#a" data-underline="hover" id="hover">the guide to the tokens</a> first, then <a class="tanrei-link" href="#a" data-underline="never" id="never">the index</a>.</p>`);
    await hoverless(page);
    const [hover, never] = [page.locator('#hover'), page.locator('#never')];
    for (const anchor of [hover, never]) await anchor.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    const label = await color(page, T('standard-label-color'));
    const paragraph = await textLines(page.locator('#p'));
    const lines = await textLines(hover);
    const resting = await drawn(hover, 'background-color');
    expect(await underline(hover)).toEqual({ line: 'underline', color: TRANSPARENT });
    // Nothing stands in its place at rest: no fill, no border, no other decoration.
    expect(resting[3]).toBe(0);
    expect(await css(hover, 'border-bottom-style')).toBe('none');
    expect(await css(hover, 'text-decoration-style')).toBe('solid');
    // The line is a part of the state's change (LNK-11): its color is one of the properties that move with it.
    expect(await css(hover, 'transition-property')).toContain('text-decoration-color');
    const moving = (await css(hover, 'transition-property')).split(', ').indexOf('text-decoration-color');
    expect(Number.parseFloat((await css(hover, 'transition-duration')).split(', ')[moving]) * 1000).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    // Hovered.
    await hover.hover();
    await expect.poll(async () => (await underline(hover)).color).toEqual(await drawn(hover, 'color'));
    expect((await underline(hover)).color[3]).toBe(1);
    expect(await textLines(hover)).toEqual(lines);
    expect(await textLines(page.locator('#p'))).toEqual(paragraph);
    // Pressed.
    await page.mouse.down();
    expect((await underline(hover)).color[3]).toBe(1);
    await page.mouse.up();
    await hoverless(page);
    await expect.poll(async () => (await underline(hover)).color).toEqual(TRANSPARENT);
    // Focused from the keyboard: the ring and the line together.
    await tabTo(page, hover);
    await expect.poll(async () => (await underline(hover)).color[3]).toBe(1);
    expect(await css(hover, 'outline-style')).toBe('solid');
    expect(await px(hover, 'outline-width')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await textLines(page.locator('#p'))).toEqual(paragraph);
    // Focus by a pointer is not keyboard focus: with the pointer away again there is no line.
    await page.locator('#p').click({ position: { x: 2, y: 2 } });
    await hover.evaluate((el: HTMLElement) => el.blur());
    await hoverless(page);
    await expect.poll(async () => (await underline(hover)).color).toEqual(TRANSPARENT);

    // never: no line hovered, pressed or focused — and the container, the label color and the ring still answer.
    await never.hover();
    await expect.poll(() => drawn(never, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
    expect((await underline(never)).color).toEqual(TRANSPARENT);
    await page.mouse.down();
    expect((await underline(never)).color).toEqual(TRANSPARENT);
    await page.mouse.up();
    await hoverless(page);
    // (The press focused it by pointer; where Tab does not leave the last link of a page, it would stay so.)
    await never.evaluate((el: HTMLElement) => el.blur());
    await tabTo(page, hover);
    await tabTo(page, never);
    expect((await underline(never)).color).toEqual(TRANSPARENT);
    expect(await css(never, 'outline-style')).toBe('solid');
    expect(await drawn(never, 'color')).toEqual(await color(page, T('standard-focused-label-color')));
    expect(label).toEqual(await color(page, '--tanrei-sys-color-link'));
  });

  test('LNK-28 where the input has no hover the line of a hover link is not brought back by a pointer that rests on it, and nothing is put in its place', async ({ browser, browserName }) => {
    // The rule is the stylesheet's `(hover: hover)`, in every engine…
    const sheet = read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const hoverRule = /@media \(hover: hover\) \{\s*&:where\(:any-link:hover\) \{[^}]*--_link-rule: var\(--_link-rule-active\)/.exec(sheet);
    expect(hoverRule, 'the hovered state, and the line with it, stand under (hover: hover)').not.toBeNull();
    expect(sheet.match(/:hover/g)).toHaveLength(1);
    // …and is seen where a browser can be a device without hover.
    test.skip(browserName !== 'chromium', 'only Chromium emulates a device without hover');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 700 } });
    const page = await context.newPage();
    await bare(page, '<p>Read <a class="tanrei-link" href="#a" data-underline="hover" id="hover">the guide</a> first.</p>');
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false);
    const anchor = page.locator('#hover');
    const at = await box(anchor);
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    expect(await anchor.evaluate((el) => el.matches(':hover'))).toBe(true);
    expect(await underline(anchor)).toEqual({ line: 'underline', color: TRANSPARENT });
    expect((await drawn(anchor, 'background-color'))[3]).toBe(0);
    // For the length of a press it is seen (the stylesheet's own answer, here without the script).
    await page.mouse.down();
    expect((await underline(anchor)).color[3]).toBe(1);
    await page.mouse.up();
    await context.close();
  });

  test('LNK-29 a phrase in running text that is not underlined at rest and stands under 3:1 from its text is reported, and still drawn; a standalone link, a current link, a glyph alone, an underlined link and a color 3:1 apart are not', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `<p>Read <a class="tanrei-link" href="#a" data-underline="never" id="never">the guide</a>, <a class="tanrei-link" href="#a" data-underline="hover" id="hover">the manual</a> and <a class="tanrei-link" href="#a" id="always">the notes</a>.</p>
      <p><a class="tanrei-link" href="#a" data-underline="never" data-standalone id="standalone">By itself</a> <a class="tanrei-link" href="#a" data-underline="never" aria-current="page" id="current">Here</a>
      <a class="tanrei-link" href="#a" data-underline="never" aria-label="Link to a" id="glyph"><span class="tanrei-icon" aria-hidden="true">link</span></a></p>
      <p style="${T('standard-label-color')}: rgb(26, 115, 232); color: rgb(0, 0, 0)">Read <a class="tanrei-link" href="#a" data-underline="never" id="apart">the guide</a>.</p>`);
    const told = () => seen.filter((line) => line.includes('LNK-29'));
    await expect.poll(() => told().length, { message: seen.join('\n') }).toBe(2);
    // The default system's link color is its text color: 1.00:1 (the reason its choice is always).
    for (const line of told()) expect(line).toContain('1.00:1');
    expect(told().join('\n')).toContain('WCAG 1.4.1');
    // Still drawn, as chosen.
    expect(await underline(page.locator('#never'))).toEqual({ line: 'underline', color: TRANSPARENT });
    expect(await drawn(page.locator('#never'), 'color')).toEqual(await color(page, T('standard-label-color')));
    await expect(page.getByRole('link', { name: 'the guide', exact: true }).first()).toBeVisible();
    // The design system's own choice is held by the build; where a layer sets it anyway, the phrase is reported too.
    if (await hasStyleQueries(page)) {
      await mount(page, `<p style="${T('underline-visibility')}: hover"><span>Read <a class="tanrei-link" href="#a" id="auto">the guide</a></span>.</p><p>Read <a class="tanrei-link" href="#a" id="plain">the manual</a>.</p>`);
      await expect.poll(() => told().length, { message: seen.join('\n') }).toBe(3);
    }
  });
});

test.describe('a link that leaves the site', () => {
  const ADDRESSES = `<p id="auto">
    <a class="tanrei-link" href="https://example.com/a" id="other">another site</a>
    <a class="tanrei-link" href="http://example.com/a" id="other-http">another site, http</a>
    <a class="tanrei-link" href="//example.com/a" id="other-relative-scheme">another site, scheme left out</a>
    <a class="tanrei-link" href="https://docs.site.test/a" id="subdomain">a subdomain</a>
    <a class="tanrei-link" href="https://site.test:8443/a" id="port">another port</a>
    <a class="tanrei-link" href="/guides/" id="path">a path</a>
    <a class="tanrei-link" href="guides/" id="relative">a relative path</a>
    <a class="tanrei-link" href="#top" id="fragment">a fragment</a>
    <a class="tanrei-link" href="https://site.test/guides/" id="own">the site’s own address, written whole</a>
    <a class="tanrei-link" href="mailto:hello@example.com" id="mail">a mail address</a>
    <a class="tanrei-link" href="tel:+81312345678" id="telephone">a telephone number</a>
    <a class="tanrei-link" href="ftp://example.com/file" id="scheme">another scheme</a>
    <a class="tanrei-link" href="https://example.com/tokens.zip" download id="download">a download</a>
    <a class="tanrei-link" href="https://example.com/a" data-external="false" id="off">another site, said not to be</a>
    <a class="tanrei-link" href="/partners/" data-external="true" id="on">this site, said to leave it</a>
    <a class="tanrei-link" href="/partners/" data-external id="bare">this site, said so by the bare attribute</a>
    <a class="tanrei-link" role="link" aria-disabled="true" id="disabled">disabled, with no address</a>
    <a class="tanrei-link" href="https://example.com/a" aria-label="Another site" id="glyph"><span class="tanrei-icon" aria-hidden="true">public</span></a>
  </p>
  <div class="tanrei-prose"><p>Prose: <a href="https://example.com/b" id="prose-other">another site</a>, <a href="/b" id="prose-path">a path</a>.</p><div class="tanrei-not-prose"><a href="https://example.com/c" id="island">an island’s own anchor</a></div></div>
  <p><a href="https://example.com/d" id="plain">an anchor that is no Link</a></p>`;

  test('LNK-30 auto: an http or https address of another origin than the page’s is external, and a path, a fragment, another scheme and a download never are; on and off are the product’s word; origins the product declares are its own site; the address is read again when it changes', async ({ page }) => {
    await served(page, ADDRESSES);
    const marks = async () => Object.fromEntries(await page.locator('a[id]').evaluateAll((anchors) => anchors.map((a) => [a.id, a.getAttribute('data-external')])));
    const found = {
      other: 'detected', 'other-http': 'detected', 'other-relative-scheme': 'detected', subdomain: 'detected', port: 'detected',
      path: null, relative: null, fragment: null, own: null, mail: null, telephone: null, scheme: null, download: null,
      off: 'false', on: 'true', bare: '', disabled: null, glyph: 'detected',
      'prose-other': 'detected', 'prose-path': null, island: null, plain: null,
    };
    expect(await marks()).toEqual(found);
    // The arrow is drawn for what was found (and never for a glyph alone, a suppressed link or what stays on the site).
    for (const id of ['other', 'subdomain', 'on', 'bare', 'prose-other']) expect(await css(page.locator(`#${id}`), 'content', '::after'), id).toContain('arrow_outward');
    for (const id of ['path', 'own', 'mail', 'download', 'off', 'glyph', 'plain', 'island']) expect(await css(page.locator(`#${id}`), 'content', '::after'), id).toBe('none');
    // Being external changes what is shown and said, and nothing else: no target, no rel, the address as written.
    for (const id of ['other', 'on']) {
      expect(await page.locator(`#${id}`).evaluate((a) => [a.getAttribute('target'), a.getAttribute('rel'), a.getAttribute('referrerpolicy')]), id).toEqual([null, null, null]);
    }
    await expect(page.locator('#other')).toHaveAttribute('href', 'https://example.com/a');

    // The product's own origins: an origin, and a host with a leading *. for its subdomains.
    await api(page, 'setSiteOrigins', ['https://example.com', '*.site.test']);
    expect(await marks()).toEqual({ ...found, other: null, 'other-relative-scheme': null, subdomain: null, glyph: null, 'prose-other': null });
    // (http://example.com is another origin than https://example.com; another port of the page's host is another origin.)
    // The product's word is never changed: only what the script wrote.
    expect((await marks()).off).toBe('false');
    expect((await marks()).on).toBe('true');
    await api(page, 'setSiteOrigins', []);
    expect(await marks()).toEqual(found);

    // The address changes: read again.
    await page.locator('#path').evaluate((a) => a.setAttribute('href', 'https://example.org/'));
    await expect(page.locator('#path')).toHaveAttribute('data-external', 'detected');
    await page.locator('#other').evaluate((a) => a.setAttribute('href', '/now-here/'));
    await expect(page.locator('#other')).not.toHaveAttribute('data-external');
    await page.locator('#off').evaluate((a) => a.setAttribute('href', '/now-here/'));
    await expect(page.locator('#off')).toHaveAttribute('data-external', 'false');
    await page.locator('#subdomain').evaluate((a) => a.setAttribute('download', ''));
    await expect(page.locator('#subdomain')).not.toHaveAttribute('data-external');
    // A link that is disabled later keeps what was found while it had an address (LNK-19 draws its arrow).
    await page.locator('#port').evaluate((a) => { a.removeAttribute('href'); a.setAttribute('role', 'link'); a.setAttribute('aria-disabled', 'true'); });
    await expect(page.locator('#port')).toHaveAttribute('aria-disabled', 'true');
    expect(await external(page.locator('#port'))).toBe('detected');
    // An anchor added later is read as the first ones were.
    await page.evaluate(() => document.querySelector('#auto')!.insertAdjacentHTML('beforeend', '<a class="tanrei-link" href="https://example.net/" id="late">added later</a>'));
    await expect(page.locator('#late')).toHaveAttribute('data-external', 'detected');
  });

  test('LNK-30 without the package’s script nothing is computed about an address: a page that was not marked where it was made shows no external mark — a missing mark, never a wrong one', async ({ page }) => {
    await served(page, ADDRESSES, { script: false });
    for (const id of ['other', 'subdomain', 'path', 'own', 'mail', 'off', 'prose-other']) expect(await css(page.locator(`#${id}`), 'content', '::after'), id).toBe('none');
    for (const id of ['on', 'bare']) expect(await css(page.locator(`#${id}`), 'content', '::after'), id).toContain('arrow_outward');
    expect(await external(page.locator('#other'))).toBeNull();
    const sheet = read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '');
    // The stylesheet names no scheme and no host: `data-external` is all it reads.
    expect(sheet).not.toMatch(/href[\^*$]?=['"]?(https?:|\/\/)/);
  });

  test('LNK-30 marks written by the script arrive after the first paint and take the arrow’s room, once: the text after each link moves by the size of the text and the gap; marks written where the page is made move nothing', async ({ page }) => {
    const paragraph = (attribute: string) => `<p id="p">Set by <a class="tanrei-link" href="https://example.com/a"${attribute} id="first">the standard</a><span id="after-first"> and </span><a class="tanrei-link" href="https://example.com/b"${attribute} id="second">the manual</a><span id="after-second">.</span></p>`;
    await served(page, paragraph(''), { script: false });
    const places = async () => ({ first: (await box(page.locator('#after-first'))).x, second: (await box(page.locator('#after-second'))).x, height: (await box(page.locator('#p'))).height });
    const before = await places();
    const room = (await px(page.locator('#first'), 'font-size')) + (await resolveToken(page, T('container-gap')));
    await page.addScriptTag({ type: 'module', url: '/tanrei.bundle.js' });
    await expect(page.locator('#second')).toHaveAttribute('data-external', 'detected');
    const after = await places();
    near(after.first - before.first, room, 'the text after the first link moves by one arrow’s room', 0.1);
    near(after.second - before.second, room * 2, 'and after the second by two', 0.1);
    test.info().annotations.push({ type: 'measured', description: `each mark written after the first paint moves what follows it on its line by ${room}px (the text's ${await px(page.locator('#first'), 'font-size')}px and the gap); the paragraph is ${after.height - before.height}px taller here` });
    // Marked where the page is made: the script changes nothing, and nothing moves.
    await served(page, paragraph(' data-external="true" aria-description="external link"'), { script: false });
    const made = await places();
    near(made.first, after.first, 'the marks are in the first paint', 0.1);
    await page.addScriptTag({ type: 'module', url: '/tanrei.bundle.js' });
    await page.waitForFunction(() => !!(document as unknown as Record<symbol, unknown>)[Symbol.for('tanrei.observe-links')]);
    expect(await places()).toEqual(made);
    await expect(page.locator('#first')).toHaveAttribute('data-external', 'true');
  });

  test('LNK-31 LNK-13 an external link that opens where the person is draws arrow_outward after its label as a trailing glyph is drawn, never beginning a line and not underlined; a new context draws open_in_new alone; the product’s own trailing glyph, or no label, draws none', async ({ page }) => {
    await mountSpec(page, ['in-text', 'external', 'external-standalone', 'external-forced', 'external-wrapping', 'external-inverse', 'external-new', 'external-trailing-icon', 'external-leading-icon', 'external-suppressed', 'external-mail', 'external-rtl', 'in-text-new', 'icon-only']);
    await hoverless(page);
    const gap = await resolveToken(page, T('container-gap'));
    for (const id of ['external', 'external-standalone', 'external-forced', 'external-wrapping', 'external-inverse', 'external-leading-icon']) {
      const anchor = link(page, id);
      const size = await px(anchor, 'font-size');
      const content = await css(anchor, 'content', '::after');
      expect(content, id).toContain('arrow_outward');
      expect(content, id).not.toContain('open_in_new');
      expect([await px(anchor, 'width', '::after'), await px(anchor, 'height', '::after')], id).toEqual([size, size]);
      expect(await px(anchor, 'margin-left', '::after'), id).toBe(gap);
      // On the line of the last word, in room kept beside it: no line break can come between them.
      near((await rooms(anchor)).end, size + gap, `${id}: the room after the label`, 0.1);
      // Out of the line of text: not underlined, and it takes no press.
      expect(await css(anchor, 'position', '::after'), id).toBe('absolute');
      expect(await css(anchor, 'pointer-events', '::after'), id).toBe('none');
      expect(await drawn(anchor, 'color', '::after'), id).toEqual(await drawn(anchor, 'color'));
      expect(await css(anchor, 'transform', '::after'), id).toBe('none');
      // The arrow's optical size is its box's too, as open_in_new's is (one rule draws both).
      expect(await drawnOpticalSize(anchor, '::after'), id).toBe(await opticalSize(page, size));
    }
    expect(await drawn(link(page, 'external-inverse'), 'color', '::after')).toEqual(await color(page, T('inverse-label-color')));
    expect((await fragments(link(page, 'external-wrapping'))).length).toBeGreaterThan(2);
    // Where it is painted (a pseudo-element has no box to ask for): ink in the room after the last word, on its line,
    // and none on the line below the link — left to right, over several lines, and at the left in right-to-left.
    const inks = async (clip: { x: number; y: number; width: number; height: number }) => {
      const shot = decodePng(await page.screenshot({ clip }));
      const colors = new Set<string>();
      for (let y = 0; y < shot.height; y++) for (let x = 0; x < shot.width; x++) colors.add(shot.at(x, y));
      return colors.size > 1;
    };
    for (const id of ['external', 'external-wrapping', 'external-forced', 'external-rtl']) {
      const anchor = link(page, id);
      const size = await px(anchor, 'font-size');
      // (A clip is the window's: the stage is brought into it first, and measured where it then stands.)
      await stage(page, id).scrollIntoViewIfNeeded();
      const [last, text] = [(await fragments(anchor)).at(-1)!, (await textLines(anchor)).at(-1)!];
      const rtl = id === 'external-rtl';
      const room = { x: rtl ? last.x : text.right + gap, y: last.y, width: size, height: last.height };
      expect(await inks(room), `${id}: the arrow is painted in its room`).toBe(true);
      const around = await box(stage(page, id));
      expect(await inks({ x: around.x, y: last.bottom + 2, width: around.width, height: around.bottom - last.bottom - 2 }), `${id}: nothing is painted under the link`).toBe(false);
    }
    // The same glyph in the state's color.
    const hovered = link(page, 'external');
    await hovered.hover();
    await expect.poll(() => drawn(hovered, 'color', '::after')).toEqual(await color(page, T('standard-hovered-label-color')));
    await hoverless(page);
    // One place, one glyph (LNK-13): a new context shows open_in_new whether or not the link is external, and no arrow.
    for (const id of ['external-new', 'in-text-new']) {
      const content = await css(link(page, id), 'content', '::after');
      expect(content, id).toContain('open_in_new');
      expect(content, id).not.toContain('arrow_outward');
    }
    // The product's own trailing glyph stands; a link that is not external, a suppressed one, a mail address and a glyph alone draw none.
    for (const id of ['external-trailing-icon', 'external-suppressed', 'external-mail', 'in-text', 'icon-only']) expect(await css(link(page, id), 'content', '::after'), id).toBe('none');
    await expect(link(page, 'external-trailing-icon').locator('.tanrei-icon')).toHaveText('code');
    near((await rooms(link(page, 'external-suppressed'))).end, 0, 'no room where there is no arrow', 0.1);
    await link(page, 'icon-only').evaluate((el) => el.setAttribute('data-external', 'true'));
    expect(await css(link(page, 'icon-only'), 'content', '::after')).toBe('none');
    // Right to left: the arrow is at the left of the label, mirrored — the icon set marks its name.
    const rtl = link(page, 'external-rtl');
    near((await rooms(rtl)).end, (await px(rtl, 'font-size')) + gap, 'the room, at the left', 0.1);
    expect(await px(rtl, 'left', '::after')).toBe(0);
    expect(await css(rtl, 'transform', '::after')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    const set = JSON.parse(fs.readFileSync(path.resolve(pkg, '../../tokens/icon-sets/material-symbols.icon-set.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(set)).toContain('"arrow_outward"');
    // Hidden from assistive technology: the name is the label's text alone.
    await expect(stage(page, 'external').getByRole('link', { name: 'the specification', exact: true })).toHaveCount(1);
  });

  test('LNK-32 the site’s picture is the product’s own img before the label: a square the size of the text, the gap from the label, centred on the first word’s line, fitted whole, with the site-icon corners, never mirrored, the same in every state and kept from assistive technology', async ({ page, browserName }) => {
    await mountSpec(page, ['external', 'external-site-icon', 'external-standalone-site-icon', 'external-standalone-underline-never', 'external-wrapping', 'external-new', 'external-inverse', 'external-rtl', 'external-leading-icon', 'external-trailing-icon', 'external-suppressed']);
    await hoverless(page);
    const gap = await resolveToken(page, T('container-gap'));
    for (const id of ['external-site-icon', 'external-standalone-site-icon', 'external-standalone-underline-never', 'external-wrapping', 'external-new', 'external-inverse', 'external-trailing-icon']) {
      const anchor = link(page, id);
      const image = picture(anchor);
      await expect(image, id).toHaveCount(1);
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { message: id }).toBe(32);
      const size = await px(anchor, 'font-size');
      const at = await box(image);
      near(at.width, size, `${id}: as wide as the text’s size`, 0.01);
      near(at.height, size, `${id}: square`, 0.01);
      const first = (await textLines(anchor))[0];
      near(first.x - at.right, gap, `${id}: the gap from the label`, 0.1);
      const line = (await fragments(anchor))[0];
      near(at.y + at.height / 2, line.y + line.height / 2, `${id}: centred on the line of the first word`, 1);
      near((await rooms(anchor)).start, size + gap, `${id}: its room`, 0.1);
      near(at.x, line.x, `${id}: inside the link’s own box`, 0.1);
      expect(await css(image, 'object-fit'), id).toBe('contain');
      expect(await px(image, 'border-top-left-radius'), id).toBe(await resolveToken(page, T('site-icon-shape')));
      // Out of the line: not underlined. A picture, in every state and every direction: nothing recolors or mirrors it.
      expect(await css(image, 'position'), id).toBe('absolute');
      expect([await css(image, 'transform'), await css(image, 'filter'), await css(image, 'opacity')], id).toEqual(['none', 'none', '1']);
      // Decoration: an empty alternative, no role, and the request carries no address of the page.
      expect(await image.evaluate((el) => [el.localName, el.getAttribute('alt'), el.getAttribute('role'), el.getAttribute('referrerpolicy')]), id).toEqual(['img', '', null, 'no-referrer']);
      await expect(anchor.getByRole('img'), id).toHaveCount(0);
    }
    // The same in every state.
    const anchor = link(page, 'external-site-icon');
    const resting = await box(picture(anchor));
    await anchor.hover();
    await expect.poll(() => drawn(anchor, 'background-color')).toEqual(await color(page, T('standard-hovered-container-color')));
    expect(await box(picture(anchor))).toEqual(resting);
    expect([await css(picture(anchor), 'opacity'), await css(picture(anchor), 'filter')]).toEqual(['1', 'none']);
    await hoverless(page);
    // With a new context the picture still says whose site it is, beside open_in_new.
    expect(await css(link(page, 'external-new'), 'content', '::after')).toContain('open_in_new');
    // Over several lines the picture stays with the first word.
    const wrapping = link(page, 'external-wrapping');
    const parts = await fragments(wrapping);
    expect(parts.length).toBeGreaterThan(2);
    expect((await box(picture(wrapping))).bottom).toBeLessThanOrEqual(parts[0].bottom + 0.5);
    // No picture given: no room for one — the arrow alone.
    near((await rooms(link(page, 'external'))).start, 0, 'no room without a picture', 0.1);
    // The product's own leading glyph stands, and no picture is drawn; a link that is not external draws none either.
    for (const id of ['external-leading-icon', 'external-suppressed']) expect(await css(picture(link(page, id)), 'display'), id).toBe('none');
    const glyph = link(page, 'external-leading-icon').locator('.tanrei-icon');
    await expect(glyph).toHaveText('code');
    near((await rooms(link(page, 'external-leading-icon'))).start, (await px(link(page, 'external-leading-icon'), 'font-size')) + gap, 'the glyph’s room, once', 0.1);
    near((await rooms(link(page, 'external-suppressed'))).start, 0, 'no room on a link that is not external', 0.1);
    // Right to left: at the right of the label, the start edge, and not mirrored.
    const rtl = link(page, 'external-rtl');
    const rtlPicture = await box(picture(rtl));
    near(rtlPicture.right, (await fragments(rtl))[0].right, 'at the start edge, the right', 0.1);
    near(rtlPicture.x - (await textLines(rtl))[0].right, gap, 'the gap, at the right of the label', 0.1);
    expect(await css(picture(rtl), 'transform')).toBe('none');
    // What assistive technology is given (Chromium's own tree): the link, its name, and no picture under it.
    if (browserName === 'chromium') {
      const exposed = (await exposedLinks(page)).filter((node) => node.name === 'the specification');
      expect(exposed.length).toBeGreaterThan(3);
      for (const node of exposed) expect(node.within.filter((role) => /image|img/i.test(role))).toEqual([]);
    }
  });

  test('LNK-32 the picture’s room is kept from the first frame; a picture that cannot be loaded keeps its room and draws nothing — no broken-picture mark, no text — and is reported; a picture that is not the first child, or has an alternative, is reported', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['external-site-icon', 'external-site-icon-failed']);
    const [loaded, failed] = [link(page, 'external-site-icon'), link(page, 'external-site-icon-failed')];
    await expect(picture(failed)).toHaveAttribute('data-failed', '');
    // The same room, the same place for the label: nothing moves when a picture arrives, or when it never does.
    expect(await rooms(failed)).toEqual(await rooms(loaded));
    expect((await textLines(failed))[0].x - (await box(stage(page, 'external-site-icon-failed'))).x).toBe((await textLines(loaded))[0].x - (await box(stage(page, 'external-site-icon'))).x);
    expect(await css(picture(failed), 'visibility')).toBe('hidden');
    await expect(picture(failed)).not.toHaveAttribute('data-failed', 'x');
    await expect(picture(loaded)).not.toHaveAttribute('data-failed');
    // Nothing is painted in the room: every pixel of it is the surface's.
    const paints = async (anchor: Locator) => {
      const part = (await fragments(anchor))[0];
      const size = await px(anchor, 'font-size');
      const shot = decodePng(await page.screenshot({ clip: { x: part.x, y: part.y, width: size, height: part.height } }));
      const colors = new Set<string>();
      for (let y = 0; y < shot.height; y++) for (let x = 0; x < shot.width; x++) colors.add(shot.at(x, y));
      return colors.size;
    };
    expect(await paints(failed)).toBe(1);
    // (A site's picture is asked for lazily and decoded off the page's turn: it is in the picture taken of the page
    // once it has arrived and been decoded, not before.)
    await picture(loaded).evaluate((el: HTMLImageElement) => el.decode());
    expect(await paints(loaded)).toBeGreaterThan(1);
    await expect.poll(() => seen.filter((line) => line.includes('LNK-32')).length, { message: seen.join('\n') }).toBe(1);
    expect(seen.find((line) => line.includes('LNK-32'))).toContain('cannot be loaded');
    // The arrow is still there: the picture is never the only mark.
    expect(await css(failed, 'content', '::after')).toContain('arrow_outward');
    // A picture that arrives after all is drawn.
    await picture(failed).evaluate((el: HTMLImageElement, src) => { el.src = src; }, fixturePictureUrl);
    await expect(picture(failed)).not.toHaveAttribute('data-failed');
    expect(await css(picture(failed), 'visibility')).toBe('visible');

    // What the markup got wrong is repaired where it can be, and said.
    await mount(page, `<p><a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link" id="alt"><img class="tanrei-link-site-icon" src="${fixturePictureUrl}" alt="Example" width="32" height="32" referrerpolicy="no-referrer">the standard</a>
      <a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link" id="late">the manual<img class="tanrei-link-site-icon" src="${fixturePictureUrl}" alt="" width="32" height="32" referrerpolicy="no-referrer"></a></p>`);
    await expect(picture(page.locator('#alt'))).toHaveAttribute('alt', '');
    await expect(page.getByRole('link', { name: 'the standard', exact: true })).toHaveCount(1);
    await expect.poll(() => seen.filter((line) => line.includes('LNK-32') && line.includes('alt')).length, { message: seen.join('\n') }).toBe(1);
    expect(seen.filter((line) => line.includes('LNK-32') && line.includes('first child'))).toHaveLength(1);
  });

  test('LNK-32 without the package’s script a picture that cannot be loaded keeps its room, and draws nothing in it where the engine draws nothing for a broken picture; the picture is drawn as a picture only: an img, never markup, an object or a frame', async ({ browser, browserName }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await bare(page, `<p><a class="tanrei-link" href="https://example.com/" data-external="true" id="failed"><img class="tanrei-link-site-icon" src="data:image/png;base64,AAAA" alt="" width="32" height="32">the standard</a></p>
      <p><a class="tanrei-link" href="https://example.com/" data-external="true" id="vector"><img class="tanrei-link-site-icon" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="rgb(200,0,0)"/><script>document.title="ran"</script><a href="https://example.com/"><text y="6">x</text></a></svg>')}" alt="" width="32" height="32">the manual</a></p>`);
    const failed = page.locator('#failed');
    const part = (await fragments(failed))[0];
    const size = await px(failed, 'font-size');
    const gap = Number.parseFloat(await failed.evaluate((el) => getComputedStyle(el).paddingLeft)) - size;
    expect(gap).toBeGreaterThan(0);
    near((await textLines(failed))[0].x - part.x, size + gap, 'the room is kept', 0.1);
    const shot = decodePng(await page.screenshot({ clip: { x: part.x, y: part.y, width: size, height: part.height } }));
    const colors = new Set<string>();
    for (let y = 0; y < shot.height; y++) for (let x = 0; x < shot.width; x++) colors.add(shot.at(x, y));
    // Chromium draws nothing for a broken picture whose alternative is empty. Firefox and WebKit draw their own
    // outline of a broken picture, which no rule of a stylesheet can name or hide: there the script is what keeps the
    // room empty (the test above), and without it the outline stands (README, "Link").
    if (browserName === 'chromium') expect([...colors]).toHaveLength(1);
    else test.info().annotations.push({ type: 'broken picture', description: `without the script this engine paints its own outline of a broken picture in the room (${colors.size} colors)` });
    // A vector file is drawn as a picture: what it holds is neither run nor reachable.
    await context.close();
    const scripted = await browser.newContext();
    const live = await scripted.newPage();
    await bare(live, `<p><a class="tanrei-link" href="#here" data-external="true" id="vector"><img class="tanrei-link-site-icon" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="rgb(200,0,0)"/><script>document.title="ran"</script></svg>')}" alt="" width="32" height="32">the manual</a></p>`);
    await expect.poll(() => live.locator('#vector img').evaluate((el: HTMLImageElement) => el.complete)).toBe(true);
    expect(await live.title()).toBe('link');
    expect(await live.locator('#vector').evaluate((el) => [...el.querySelectorAll('*')].map((child) => child.localName))).toEqual(['img']);
    const sheet = read('src/styles/link.css');
    expect(sheet).toContain('> :where(img.tanrei-link-site-icon)');
    expect(sheet.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|[\s>+~,(])(svg|object|iframe|embed)\b(?!-)/m);
    await scripted.close();
  });

  test('LNK-33 comp.link.external.marks: all draws the picture where one is given and the arrow; arrow draws the arrow alone and keeps no room for a picture; none draws neither; the mark of a new context is not touched, and the choice is drawn at once', async ({ page }) => {
    await mountSpec(page, ['external-site-icon', 'external', 'external-new', 'external-trailing-icon', 'external-standalone-site-icon']);
    await hoverless(page);
    expect(await css(page.locator('html'), T('external-marks'))).toBe('all');
    if (!(await hasStyleQueries(page))) return test.info().annotations.push({ type: 'style-queries', description: 'not in this browser: the choice is read by the script, on the root (LNK-27 LNK-33 above)' });
    const gap = await resolveToken(page, T('container-gap'));
    const [both, arrowOnly, opensNew, own] = [link(page, 'external-site-icon'), link(page, 'external'), link(page, 'external-new'), link(page, 'external-trailing-icon')];
    const size = await px(both, 'font-size');
    const choose = (name: string) => rootTokens(page, { [T('external-marks')]: name });
    const drawnMarks = async (anchor: Locator) => ({ picture: (await picture(anchor).count()) ? (await css(picture(anchor), 'display')) !== 'none' : false, after: (await css(anchor, 'display', '::after')) === 'none' ? 'none' : (await css(anchor, 'content', '::after')).replace(/["\s]|\/.*$/g, ''), rooms: await rooms(anchor).then((r) => [Math.round(r.start), Math.round(r.end)]) });
    expect(await drawnMarks(both)).toEqual({ picture: true, after: 'arrow_outward', rooms: [size + gap, size + gap] });
    expect(await drawnMarks(arrowOnly)).toEqual({ picture: false, after: 'arrow_outward', rooms: [0, size + gap] });
    expect(await drawnMarks(opensNew)).toEqual({ picture: true, after: 'open_in_new', rooms: [size + gap, size + gap] });
    expect(await drawnMarks(own)).toEqual({ picture: true, after: 'none', rooms: [size + gap, size + gap] });
    // arrow: no picture, and no room for one.
    await choose('arrow');
    expect(await drawnMarks(both)).toEqual({ picture: false, after: 'arrow_outward', rooms: [0, size + gap] });
    expect(await drawnMarks(arrowOnly)).toEqual({ picture: false, after: 'arrow_outward', rooms: [0, size + gap] });
    expect(await drawnMarks(opensNew)).toEqual({ picture: false, after: 'open_in_new', rooms: [0, size + gap] });
    expect(await drawnMarks(own)).toEqual({ picture: false, after: 'none', rooms: [0, size + gap] });
    // none: neither — and the mark of a new context, and the product's own glyph, stand as they were.
    await choose('none');
    expect(await drawnMarks(both)).toEqual({ picture: false, after: 'none', rooms: [0, 0] });
    expect(await drawnMarks(arrowOnly)).toEqual({ picture: false, after: 'none', rooms: [0, 0] });
    expect(await drawnMarks(opensNew)).toEqual({ picture: false, after: 'open_in_new', rooms: [0, size + gap] });
    expect(await drawnMarks(own)).toEqual({ picture: false, after: 'none', rooms: [0, size + gap] });
    // A link without marks is drawn as one that stays on the site: its container has every corner on every line again.
    expect(await css(both, 'box-decoration-break').catch(() => '')).toBe(await css(link(page, 'external-standalone-site-icon'), 'box-decoration-break').catch(() => ''));
    // A name the choice does not have is the first value; and a region may carry its own.
    await choose('some');
    expect(await drawnMarks(both)).toEqual({ picture: true, after: 'arrow_outward', rooms: [size + gap, size + gap] });
    await stage(page, 'external-site-icon').evaluate((el, token) => el.style.setProperty(token, 'arrow'), T('external-marks'));
    expect(await drawnMarks(both)).toEqual({ picture: false, after: 'arrow_outward', rooms: [0, size + gap] });
    expect((await drawnMarks(link(page, 'external-standalone-site-icon'))).picture).toBe(true);
  });

  test('LNK-34 LNK-15 an external link that opens where the person is has one description — its own aria-description, or the words the product set once — and a new context has targetLabel alone; nothing is added to the name; with no words anywhere it is reported once for the page', async ({ page, browserName }) => {
    const seen = reports(page);
    await mountSpec(page, ['external', 'external-site-icon', 'external-new', 'external-trailing-icon', 'external-rtl', 'external-forced', 'in-text']);
    // The link's own words: read after its name, and no part of the name. The picture and the arrow name nothing.
    for (const id of ['external', 'external-site-icon', 'external-trailing-icon']) {
      await expect(stage(page, id).getByRole('link', { name: id === 'external-trailing-icon' ? 'View source' : 'the specification', exact: true }), id).toHaveAccessibleDescription('external link');
    }
    await expect(stage(page, 'external-forced').getByRole('link', { name: 'our partner\'s catalogue', exact: true })).toHaveAccessibleDescription('external link');
    await expect(stage(page, 'external-rtl').getByRole('link', { name: 'المواصفة', exact: true })).toHaveAccessibleDescription('رابط خارجي');
    // A new context: targetLabel alone — one description, never two.
    await expect(stage(page, 'external-new').getByRole('link', { name: 'the specification', exact: true })).toHaveAccessibleDescription('opens in a new tab');
    await expect(stage(page, 'in-text').getByRole('link', { name: 'the Button\'s page', exact: true })).toHaveAccessibleDescription('');
    if (browserName === 'chromium') {
      const exposed = await exposedLinks(page);
      expect(exposed.filter((node) => node.name === 'the specification').map((node) => node.description).sort()).toEqual(['external link', 'external link', 'opens in a new tab']);
      expect(exposed.find((node) => node.name === 'View source')?.description).toBe('external link');
    }
    expect(seen.filter((line) => line.includes('LNK-34'))).toEqual([]);

    // The words the product sets once for every external link (a link written in Markdown has no place for a prop).
    await served(page, `<p><a class="tanrei-link" href="https://example.com/a" id="found">found by the script</a> <a class="tanrei-link" href="/partners/" data-external="true" id="marked">marked where the page was made</a>
      <a class="tanrei-link" href="https://example.com/b" data-external="true" aria-description="opens the publisher’s site" id="own">with its own words</a>
      <a class="tanrei-link" href="https://example.com/c" target="_blank" aria-description="opens in a new tab" id="new">a new context</a>
      <a class="tanrei-link" href="https://example.com/d" target="_blank" id="new-silent">a new context that says nothing</a>
      <a class="tanrei-link" href="https://example.com/e" data-external="false" id="off">said not to be external</a>
      <a class="tanrei-link" href="/here/" id="here">on this site</a>
      <a class="tanrei-link" href="https://example.com/f" aria-label="Another site" id="glyph"><span class="tanrei-icon" aria-hidden="true">public</span></a>
      <span style="${T('external-marks')}: none"><a class="tanrei-link" href="https://example.com/g" id="unmarked">where the marks are turned off</a></span></p>
      <div class="tanrei-prose"><p>Prose: <a href="https://example.com/h" id="prose">written in Markdown</a>.</p></div>`);
    const descriptions = async () => Object.fromEntries(await page.locator('a[id]').evaluateAll((anchors) => anchors.map((a) => [a.id, a.getAttribute('aria-description')])));
    const none = { found: null, marked: null, own: 'opens the publisher’s site', new: 'opens in a new tab', 'new-silent': null, off: null, here: null, glyph: null, unmarked: null, prose: null };
    expect(await descriptions()).toEqual(none);
    // No words anywhere: every link is still drawn, and the page is told once — not once for each of its links.
    await expect.poll(() => seen.filter((line) => line.includes('LNK-34')).length, { message: seen.join('\n') }).toBe(1);
    expect(seen.find((line) => line.includes('LNK-34'))).toContain('setWords({ externalLabel })');
    // The key was needed and given by nobody: a product's own test can ask.
    expect(await page.evaluate(async () => ((await import('/tanrei.bundle.js' as string)) as { missingWords: () => string[] }).missingWords())).toContain('externalLabel');
    expect(await css(page.locator('#found'), 'content', '::after')).toContain('arrow_outward');
    // Tanrei ships no words: nothing was invented for them.
    expect(read('src/link.ts').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')).not.toMatch(/setAttribute\('aria-description', '[^']/);

    await api(page, 'setExternalLabel', 'leaves this site');
    const styleQueries = await hasStyleQueries(page);
    const said = { ...none, found: 'leaves this site', marked: 'leaves this site', prose: 'leaves this site', ...(styleQueries ? {} : { unmarked: 'leaves this site' }) };
    expect(await descriptions()).toEqual(said);
    await expect(page.getByRole('link', { name: 'found by the script', exact: true })).toHaveAccessibleDescription('leaves this site');
    // Other words: what the script wrote follows; what the product wrote stands.
    await api(page, 'setExternalLabel', 'external link');
    expect((await descriptions()).found).toBe('external link');
    expect((await descriptions()).own).toBe('opens the publisher’s site');
    // A link that stops being external loses the words the script gave it; one that becomes a new context too.
    await page.locator('#found').evaluate((a) => a.setAttribute('href', '/here/'));
    await expect(page.locator('#found')).not.toHaveAttribute('aria-description');
    await page.locator('#marked').evaluate((a) => a.setAttribute('target', '_blank'));
    await expect(page.locator('#marked')).not.toHaveAttribute('aria-description');
    // Taken back.
    await api(page, 'setExternalLabel', '');
    expect((await descriptions()).prose).toBeNull();
    expect((await descriptions()).own).toBe('opens the publisher’s site');
    // The same words are the key `externalLabel` of the product's words: `setWords()` gives them, and
    // takes them back, as `setExternalLabel()` does — one store.
    await api(page, 'setWords', { externalLabel: 'leaves the site' });
    expect((await descriptions()).prose).toBe('leaves the site');
    expect(await page.evaluate(async () => ((await import('/tanrei.bundle.js' as string)) as { missingWords: () => string[] }).missingWords())).not.toContain('externalLabel');
    await api(page, 'setWords', { externalLabel: '' });
    expect((await descriptions()).prose).toBeNull();
    expect(seen.filter((line) => line.includes('LNK-34'))).toHaveLength(1);
  });

  test('LNK-35 the link requests nothing by itself: a page of external links, hovered, focused and pressed, makes no request for them and none leaves the site; the one picture it loads is the one it was given, without the page’s address', async ({ page }) => {
    const seen = reports(page);
    const asked = await served(page, `<p><a class="tanrei-link" href="https://example.com/standards/levelling" id="found">found by the script</a>
      <a class="tanrei-link" href="https://example.org/manual" data-external="true" aria-description="external link" id="marked">marked where the page was made</a>
      <a class="tanrei-link" href="https://example.net/tanrei" data-external="true" aria-description="external link" id="given"><img class="tanrei-link-site-icon" src="/icons/site.png" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">with the picture it was given</a>
      <a class="tanrei-link" href="https://example.net/tanrei" target="_blank" aria-description="opens in a new tab" id="new">a new context</a></p>
      <div class="tanrei-prose"><p>Prose: <a href="https://example.edu/paper" id="prose">written in Markdown</a>.</p></div>`);
    await expect(page.locator('#found')).toHaveAttribute('data-external', 'detected');
    await expect.poll(() => picture(page.locator('#given')).evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(32);
    // Pointed at, focused, pressed: the destination is not reached before the person follows the link.
    for (const id of ['found', 'marked', 'given', 'prose']) {
      const anchor = page.locator(`#${id}`);
      await anchor.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
      await anchor.hover();
      await anchor.focus();
      await page.mouse.down();
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const paths = asked.map((request) => new URL(request.url));
    // Nothing left the site: no destination, no icon of one, no service asked about one.
    expect(paths.filter((url) => url.origin !== SITE).map(String)).toEqual([]);
    // What the page asked for is the page, what it names itself, and the one picture it was given — once, as given.
    expect([...new Set(paths.map((url) => url.pathname))].sort()).toEqual(['/', '/icons.css', '/icons/site.png', '/link.css', '/prose.css', '/tanrei.bundle.js', '/tokens.css']);
    const pictures = asked.filter((request) => request.type === 'image');
    expect(pictures.map((request) => new URL(request.url).pathname)).toEqual(['/icons/site.png']);
    // Without the page's address.
    expect(pictures[0].referer).toBeUndefined();
    expect(seen.filter((line) => line.includes('LNK-35'))).toEqual([]);
    // No picture's address is derived from an address: the script names none and builds none.
    const script = read('src/link.ts').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(script).not.toMatch(/favicon|fetch\(|XMLHttpRequest|sendBeacon|new Image|createElement\('(img|link|script|iframe)'\)|\.src\s*=/);
    expect(read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/url\(/);
  });

  test('LNK-35 a site icon of another origin than the page’s is reported — every reader’s browser would tell that party which page is being read — and one whose markup leaves out referrerpolicy is given it, and reported', async ({ page }) => {
    const seen = reports(page);
    const asked = await served(page, `<p><a class="tanrei-link" href="https://example.com/a" data-external="true" aria-description="external link" id="third"><img class="tanrei-link-site-icon" src="https://icons.example/example.com.png" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">a picture of another origin</a>
      <a class="tanrei-link" href="https://example.com/b" data-external="true" aria-description="external link" id="bare"><img class="tanrei-link-site-icon" src="/icons/site.png" alt="" width="32" height="32">no referrer policy</a>
      <a class="tanrei-link" href="https://example.com/c" data-external="true" aria-description="external link" id="origin"><img class="tanrei-link-site-icon" src="/icons/site.png" alt="" width="32" height="32" referrerpolicy="origin">another referrer policy</a>
      <a class="tanrei-link" href="https://example.com/d" data-external="true" aria-description="external link" id="data"><img class="tanrei-link-site-icon" src="${fixturePictureUrl}" alt="" width="32" height="32" referrerpolicy="no-referrer">a picture in the page itself</a></p>`);
    const told = () => seen.filter((line) => line.includes('LNK-35'));
    await expect.poll(() => told().length, { message: seen.join('\n') }).toBe(3);
    expect(told().find((line) => line.includes('https://icons.example'))).toContain('which page is being read');
    expect(told().filter((line) => line.includes('referrerpolicy'))).toHaveLength(2);
    await expect(picture(page.locator('#bare'))).toHaveAttribute('referrerpolicy', 'no-referrer');
    // The product's own attribute is the product's: said, and left.
    await expect(picture(page.locator('#origin'))).toHaveAttribute('referrerpolicy', 'origin');
    // The picture of the other origin is the product's markup, asked for by the browser as written (and refused here):
    // the link made no other request for it, and the picture that fails keeps its room.
    await expect(picture(page.locator('#third'))).toHaveAttribute('data-failed', '');
    expect(asked.filter((request) => new URL(request.url).origin !== SITE).map((request) => request.url)).toEqual(['https://icons.example/example.com.png']);
  });
});

test.describe('the underline as a choice and the external mark in LNK-2 to LNK-25', () => {
  test('LNK-2 the link’s color can be overridden alone: the stylesheet names no color role, the standard look follows sys.color.link and the inverse look sys.color.inverse-link — re-pointing either recolors the label, the arrow and the underline, and the primary and its inverse stand', async ({ page }) => {
    // The stylesheet reads the component's tokens and nothing of the system's colors but the focus ring's.
    const sheet = read('src/styles/link.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect([...new Set(sheet.match(/--tanrei-sys-color-[\w-]+/g))].sort()).toEqual(['--tanrei-sys-color-focus-ring', '--tanrei-sys-color-focus-ring-inner']);
    const tokens = read('dist/tokens.css');
    expect(tokens).toMatch(/--tanrei-comp-link-inverse-label-color: var\(--tanrei-sys-color-inverse-link\);/);
    expect(tokens).toMatch(/--tanrei-comp-link-standard-label-color: var\(--tanrei-sys-color-link\);/);
    expect(tokens.match(/--tanrei-comp-link-[\w-]+: var\(--tanrei-sys-color-inverse-primary\)/g)).toBeNull();

    await mountSpec(page, ['external', 'external-inverse']);
    await hoverless(page);
    const [standard, inverse] = [link(page, 'external'), link(page, 'external-inverse')];
    const before = { primary: await color(page, '--tanrei-sys-color-primary'), inversePrimary: await color(page, '--tanrei-sys-color-inverse-primary') };
    expect(await drawn(inverse, 'color')).toEqual(await color(page, '--tanrei-sys-color-inverse-link'));
    // A layer's two lines.
    await rootTokens(page, { '--tanrei-sys-color-link': 'rgb(10, 90, 200)', '--tanrei-sys-color-inverse-link': 'rgb(150, 200, 250)' });
    for (const [anchor, expected] of [[standard, [10, 90, 200, 1]], [inverse, [150, 200, 250, 1]]] as const) {
      await expect.poll(() => drawn(anchor, 'color')).toEqual(expected);
      expect(await drawn(anchor, 'color', '::after')).toEqual(expected);
      await expect.poll(() => drawn(anchor, 'text-decoration-color')).toEqual(expected);
    }
    expect({ primary: await color(page, '--tanrei-sys-color-primary'), inversePrimary: await color(page, '--tanrei-sys-color-inverse-primary') }).toEqual(before);
  });

  test('LNK-19 a disabled external link draws its arrow in the disabled label color and its picture at the site-icon disabled opacity; under hover it has no underline, being neither hovered nor focused', async ({ page }) => {
    await mountSpec(page, ['external-disabled', 'disabled']);
    const anchor = link(page, 'external-disabled');
    await expect(anchor).toHaveAttribute('aria-disabled', 'true');
    await expect(anchor).not.toHaveAttribute('href');
    expect(await css(anchor, 'content', '::after')).toContain('arrow_outward');
    expect(await drawn(anchor, 'color', '::after')).toEqual(await drawn(anchor, 'color'));
    expect(await drawn(anchor, 'color')).toEqual(await color(page, T('standard-disabled-label-color')));
    const opacity = Number(await css(page.locator('html'), T('site-icon-disabled-opacity')).then((value) => page.evaluate((v) => { const probe = document.createElement('i'); probe.style.opacity = v; document.body.append(probe); const out = getComputedStyle(probe).opacity; probe.remove(); return out; }, value)));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(Number(await css(picture(anchor), 'opacity'))).toBe(opacity);
    expect(await css(picture(anchor), 'display')).not.toBe('none');
    // Its underline: where the choice draws one at rest it is the disabled label's; under hover there is none, even
    // with the pointer on it and after Tab has passed it.
    expect(await underline(link(page, 'disabled'))).toEqual({ line: 'underline', color: await drawn(link(page, 'disabled'), 'color') });
    await link(page, 'disabled').evaluate((el) => el.setAttribute('data-underline', 'hover'));
    await link(page, 'disabled').hover();
    await page.waitForTimeout(100);
    expect((await underline(link(page, 'disabled'))).color).toEqual(TRANSPARENT);
    await hoverless(page);
  });

  test('LNK-21 an unknown underline is auto and an unknown external is taken off, the address deciding, each reported; what is not a link draws no arrow and no picture', async ({ page }) => {
    const seen = reports(page);
    await served(page, `<p><a class="tanrei-link" href="/a/" data-underline="sometimes" id="underline">an unknown underline</a>
      <a class="tanrei-link" href="/a/" data-underline="auto" id="auto">auto, said aloud</a>
      <a class="tanrei-link" href="/a/" data-external="yes" id="here">an unknown external, on this site</a>
      <a class="tanrei-link" href="https://example.com/" data-external="on" id="there">an unknown external, on another</a>
      <a class="tanrei-link" data-external="true" id="no-address"><img class="tanrei-link-site-icon" src="/icons/site.png" alt="" width="32" height="32" referrerpolicy="no-referrer">no address</a>
      <a class="tanrei-link" href="javascript:void 0" data-external="true" id="script"><img class="tanrei-link-site-icon" src="/icons/site.png" alt="" width="32" height="32" referrerpolicy="no-referrer">a script</a></p>`);
    await hoverless(page);
    // auto: the design system's choice — always, in the default system.
    for (const id of ['underline', 'auto']) expect((await underline(page.locator(`#${id}`))).color[3], id).toBe(1);
    await expect(page.locator('#here')).not.toHaveAttribute('data-external');
    await expect(page.locator('#there')).toHaveAttribute('data-external', 'detected');
    expect(await css(page.locator('#here'), 'content', '::after')).toBe('none');
    const told = seen.filter((line) => line.includes('LNK-21'));
    expect(told.filter((line) => line.includes('data-underline "sometimes"'))).toHaveLength(1);
    expect(told.filter((line) => line.includes('data-underline "auto"'))).toHaveLength(0);
    expect(told.filter((line) => line.includes('data-external "yes"'))).toHaveLength(1);
    expect(told.filter((line) => line.includes('data-external "on"'))).toHaveLength(1);
    // Not a link: the text around it — no underline, no arrow, no picture, no room for either.
    for (const id of ['no-address', 'script']) {
      const anchor = page.locator(`#${id}`);
      expect(await css(anchor, 'text-decoration-line'), id).toBe('none');
      expect(await css(anchor, 'content', '::after'), id).toBe('none');
      expect(await css(picture(anchor), 'display'), id).toBe('none');
      expect([await px(anchor, 'padding-left'), await px(anchor, 'padding-right')], id).toEqual([0, 0]);
    }
  });

  test('LNK-22 forced colors draw the underline at rest whatever was chosen — on a link set to hover or never, and under a system that chose either — except on a current link and a glyph alone; the arrow is the platform’s link color and the picture is unchanged', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['underline-hover', 'underline-never', 'standalone-underline-never', 'inverse-underline-never', 'in-text', 'current', 'icon-only', 'external-site-icon', 'external-disabled']);
    await hoverless(page);
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.cssText = `color: ${keyword}; forced-color-adjust: none`;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, name);
    const linkText = rgba(await system('LinkText'));
    for (const id of ['underline-hover', 'underline-never', 'standalone-underline-never', 'inverse-underline-never', 'in-text']) {
      expect(await css(link(page, id), 'text-decoration-line'), id).toBe('underline');
      expect(rgba(await css(link(page, id), 'text-decoration-color')), id).toEqual(linkText);
      expect(rgba(await css(link(page, id), 'color')), id).toEqual(linkText);
    }
    // The system's own choice is overruled the same way.
    await rootTokens(page, { [T('underline-visibility')]: 'never' });
    expect(rgba(await css(link(page, 'in-text'), 'text-decoration-color'))).toEqual(linkText);
    for (const id of ['current', 'icon-only']) expect(await css(link(page, id), 'text-decoration-line'), id).toBe('none');
    // The arrow in the platform's link color (a disabled link's in its disabled text color); the picture as it is.
    const marked = link(page, 'external-site-icon');
    expect(rgba(await css(marked, 'color', '::after'))).toEqual(linkText);
    expect(rgba(await css(link(page, 'external-disabled'), 'color', '::after'))).toEqual(rgba(await system('GrayText')));
    expect([await css(picture(marked), 'filter'), await css(picture(marked), 'opacity'), await css(picture(marked), 'display')]).toEqual(['none', '1', 'block']);
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('LNK-23 LNK-25 with the text size enlarged the picture’s box and the arrow grow with the text while the gap and the picture’s corners stay; right to left the picture is never mirrored and the arrow is', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountSpec(page, ['external-site-icon', 'external-rtl']);
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      const anchor = link(page, 'external-site-icon');
      const at = await box(picture(anchor));
      return { size: await px(anchor, 'font-size'), picture: [at.width, at.height], arrow: await px(anchor, 'width', '::after'), gap: (await textLines(anchor))[0].x - at.right, radius: await px(picture(anchor), 'border-top-left-radius') };
    };
    const normal = await measure(false);
    const large = await measure(true);
    near(large.size, normal.size * 2, 'the label', 0.01);
    near(large.picture[0], normal.picture[0] * 2, 'the picture’s box', 0.01);
    near(large.picture[1], normal.picture[1] * 2, 'the picture’s box is square', 0.01);
    near(large.arrow, normal.arrow * 2, 'the arrow', 0.01);
    // The gap is a space token and the corners a shape token: neither is a multiple of the text's size.
    near(large.gap, await resolveToken(page, T('container-gap')), 'the gap', 0.1);
    expect(large.radius).toBe(await resolveToken(page, T('site-icon-shape')));
    // LNK-25: the picture is the product's own image, never mirrored; the arrow is a glyph the icon set marks.
    const rtl = link(page, 'external-rtl');
    expect(await css(picture(rtl), 'transform')).toBe('none');
    expect(await css(rtl, 'transform', '::after')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(rtl, 'transform')).toBe('none');
  });

  test('the fixtures that carry their marks in the markup are drawn the same with scripting off and on: nothing moves when the script arrives', async ({ browser, page }) => {
    const ids = spec.fixtures.filter((f) => /underline|external/.test(f.id) && f.id !== 'external-site-icon-failed').map((f) => f.id);
    const boxes = async (target: P) =>
      target.evaluate(() => [...document.querySelectorAll('.stage')].map((el) => { const a = el.querySelector('a')!; const img = a.querySelector('img'); const r = (b: Element) => [...b.getClientRects()].map((rect) => [rect.left, rect.top, rect.width, rect.height].map((n) => Math.round(n * 100) / 100)); return [el.getAttribute('data-fixture'), r(a), img ? r(img) : null, getComputedStyle(a, '::after').content, getComputedStyle(a).textDecorationColor]; }));
    const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 2 });
    const off = await context.newPage();
    await off.setContent(await fixturesDocument(spec, { icons: true, fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) }));
    await off.waitForLoadState('load');
    await expect.poll(() => off.evaluate(() => [...document.images].every((img) => img.complete))).toBe(true);
    await off.waitForTimeout(300);
    const without = await boxes(off);
    await context.close();
    await mountSpec(page, ids);
    await hoverless(page);
    await page.waitForTimeout(300);
    expect(await boxes(page)).toEqual(without);
    expect(without).toHaveLength(ids.length);
  });
});

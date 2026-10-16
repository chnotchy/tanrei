// `<tanrei-link-card>` (link-card.css, link-card.ts), driven by specs/link-card.spec.json: every behaviour id (LKC-1…36)
// is cited by a test title, every fixture has a baseline, and every length, color and time is read back from the
// tokens, never from a number written here. A fixture cannot set the width of its stage:
// LKC-12's verify names the widths a test sets — 720, 320, and 720 with the text doubled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { acmeSystemCss, fixtureHost, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../../test/icons.js';
import { fixturePicture } from '../../../test/pictures.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('link-card');
type P = Page;
const T = (name: string) => `--tanrei-comp-link-card-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const card = (page: P, id: string) => fixtureHost(page, spec, id);
const anchor = (page: P, id: string) => card(page, id).locator(':scope > a');
const part = (page: P, id: string, name: string) => card(page, id).locator(`[data-part="${name}"]`);
const PICTURE = fixturePicture('fixtures/link-card.png');
const ICON = fixturePicture('fixtures/site-icon.png');
const HREF = 'https://example.com/articles/designing-with-tokens';
/** The characters LKC-15 drops, made here by number: none is written in this file. */
const RLO = String.fromCodePoint(0x202e);
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);

interface MountOptions { system?: string; systemCss?: string; dir?: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl'; theme?: 'light' | 'dark' }
/** A window of its own for every mount: the script of the document before would still be observing the new one. */
const fresh = (page: P) => page.goto('about:blank');
const mountSpec = async (page: P, ids: string[] = [], options: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) } : {}), ...options });
};
/** A stage holding `html` as it is: the fixture `t`. */
const mount = async (page: P, html: string, { direction, ...options }: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 't', props: {}, content: html, ...(direction ? { direction } : {}) }], ...options });
};
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text()); });
  return seen;
};
const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The boxes of an element's own text, one per line. */
const lines = (target: Locator): Promise<Box[]> =>
  target.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rows: { x: number; y: number; width: number; height: number; right: number; bottom: number }[] = [];
    const own = el.getBoundingClientRect();
    for (const r of range.getClientRects()) {
      // (A line that a clamp cut away is not drawn.)
      if (r.width < 0.5 || r.top >= own.bottom - 1 || r.bottom <= own.top + 1) continue;
      const row = rows.find((known) => Math.abs(known.y - r.top) < r.height / 2);
      if (row) { row.x = Math.min(row.x, r.left); row.right = Math.max(row.right, r.right); row.width = row.right - row.x; }
      else rows.push({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom });
    }
    return rows;
  });
/** A color as the browser paints it, as sRGB bytes — whatever space it is written in. */
const painted = (page: P, color: string): Promise<number[]> =>
  page.evaluate((c) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = c;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, color);
const drawn = async (target: Locator, property: string, pseudo?: string) => painted(target.page(), await css(target, property, pseudo));
const token = async (page: P, name: string) => painted(page, await resolveColor(page, T(name)));
const near = (a: number[], b: number[], slack = 2) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= slack);
const setStage = (page: P, id: string, style: string) => stage(page, id).evaluate((el, s) => ((el as HTMLElement).style.cssText += s), style);
const hoverless = (page: P) => page.mouse.move(0, 0);
/** A card written as a site's build step writes it, for a test's own values. */
const built = (attributes: string, body: string, media = '') => `<tanrei-link-card><a ${attributes}><span data-part="body">${body}</span>${media}</a></tanrei-link-card>`;
const mediaImg = (src = PICTURE) => `<img data-part="media" src="${src}" alt="" width="600" height="315" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;

/** What Chromium's accessibility tree says of the links of the page: role, name, description, and the roles under each. */
const exposedLinks = async (page: P) => {
  const session = await page.context().newCDPSession(page);
  const { nodes } = (await session.send('Accessibility.getFullAXTree')) as { nodes: { nodeId: string; ignored?: boolean; role?: { value: string }; name?: { value: string }; description?: { value: string }; childIds?: string[] }[] };
  await session.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const under = (id: string): string[] => (byId.get(id)?.childIds ?? []).flatMap((child) => [...(byId.get(child)?.ignored ? [] : [byId.get(child)?.role?.value ?? '']), ...under(child)]);
  return nodes.filter((node) => !node.ignored && node.role?.value === 'link').map((node) => ({ name: node.name?.value ?? '', description: node.description?.value ?? '', within: [...new Set(under(node.nodeId))] }));
};

// ── A site: pages served from one origin, with every request recorded (LKC-14, LKC-24) ──────────────────────────────
const SITE = 'https://site.test';
const SITE_FILES: Record<string, [string, string]> = {
  '/tokens.css': ['dist/tokens.css', 'text/css'],
  '/icons.css': ['dist/icons.css', 'text/css'],
  '/link-card.css': ['dist/link-card.css', 'text/css'],
  '/link.css': ['dist/link.css', 'text/css'],
  '/tanrei.bundle.js': ['dist/tanrei.bundle.js', 'text/javascript'],
};
interface Asked { url: string; type: string; referer: string | undefined }
interface Served { script?: boolean; hold?: (pathname: string) => Promise<void> | void; files?: Record<string, { contentType: string; body: string | Buffer }> }
/**
 * Loads a page of the site `SITE` — a real origin, so a web address elsewhere is of another one — holding `body`, the
 * package's stylesheets and, unless `script` is false, its script. Returns every request the page made; a request to
 * any other origin is recorded and refused.
 */
const served = async (page: P, body: string, { script = true, hold, files = {} }: Served = {}): Promise<Asked[]> => {
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
          <link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/icons.css"><link rel="stylesheet" href="/link-card.css"><link rel="stylesheet" href="/link.css">
          <style>body { margin: 16px; inline-size: 720px; font: var(--tanrei-sys-typescale-body-font); color: var(--tanrei-sys-color-on-surface); background: var(--tanrei-sys-color-surface); } tanrei-link-card { margin-block-end: 16px; }</style>
          ${script ? '<script type="module" src="/tanrei.bundle.js"></script>' : ''}</head><body>${body}</body></html>`,
      });
    }
    await hold?.(url.pathname);
    const file = SITE_FILES[url.pathname];
    if (file) return route.fulfill({ contentType: file[1], body: read(file[0]) });
    if (files[url.pathname]) return route.fulfill(files[url.pathname]);
    if (url.pathname === '/pictures/card.png') return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(pkg, 'test/fixtures/link-card.png')) });
    if (url.pathname === '/pictures/icon.png') return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(pkg, 'test/fixtures/site-icon.png')) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
  // (Not `load`: a picture a test holds back would hold the page's load back with it.)
  await page.goto(`${SITE}/`, { waitUntil: 'domcontentloaded' });
  if (script) await page.waitForFunction(() => !!customElements.get('tanrei-link-card'));
  return asked;
};
const api = (page: P, name: 'setSiteOrigins' | 'setExternalLabel', value: unknown) =>
  page.evaluate(async ([n, v]) => { const module = (await import('/tanrei.bundle.js' as string)) as Record<string, (value: unknown) => void>; module[n as string](v); }, [name, value] as const);
const sitePicture = (part: 'media' | 'site-icon', src: string) => `<img data-part="${part}" src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
const siteCard = (id: string, href: string, { media = '', icon = '', extra = '' }: { media?: string; icon?: string; extra?: string } = {}) =>
  `<tanrei-link-card id="${id}"><a href="${href}" ${extra}><span data-part="body"><span data-part="title" dir="auto">Card ${id}</span><span data-part="site">${icon ? sitePicture('site-icon', icon) : ''}<span data-part="address"></span></span></span>${media ? sitePicture('media', media) : ''}</a></tanrei-link-card>`;

test.describe('the platform’s own link', () => {
  test('LKC-1 LKC-36 with scripting off the page holds an anchor with the href around the card’s text: document.links lists it, and it is followed by a click and by Enter', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>t</title><style>${read('dist/tokens.css')}</style><style>${read('dist/link-card.css')}</style></head>
      <body><div style="inline-size: 720px">${built('href="#there"', '<span data-part="title" dir="auto">Designing with tokens</span><span data-part="description" dir="auto">How a handful of dials becomes a whole system.</span>')}</div><p id="there">There</p></body></html>`);
    const link = page.getByRole('link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '#there');
    expect(await page.evaluate(() => [...document.links].map((a) => a.getAttribute('href')))).toEqual(['#there']);
    expect(await page.evaluate(() => customElements.get('tanrei-link-card'))).toBeUndefined();
    await link.click();
    await expect(page).toHaveURL(/#there$/);
    await page.goBack().catch(() => {});
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#there$/);
    await context.close();
  });

  test('LKC-1 the card is exactly one focusable element with the link role, in no shadow root, and everything it draws is that element’s presentational content', async ({ page, browserName }) => {
    await mountSpec(page, ['full', 'new-tab', 'title-only']);
    expect(await card(page, 'full').evaluate((el) => [el.shadowRoot === null, el.firstElementChild?.localName, el.childElementCount])).toEqual([true, 'a', 1]);
    await expect(page.getByRole('link')).toHaveCount(3);
    // Tab reaches each card once, and nothing inside it.
    await tabTo(page, anchor(page, 'full'));
    const stops: string[] = ['a:full'];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      stops.push(await page.evaluate(() => `${document.activeElement?.localName}:${document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? ''}`));
    }
    expect(stops, stops.join(' ')).toHaveLength(4);
    expect(stops.slice(0, 3), stops.join(' ')).toEqual(['a:full', 'a:title-only', 'a:new-tab']);
    // After the last card focus leaves the cards (or, where a headless browser does not wrap around, stays on it): no fourth stop.
    expect(new Set(stops.filter((stop) => stop.startsWith('a:'))).size).toBe(3);
    if (browserName !== 'chromium') return;
    for (const link of await exposedLinks(page)) expect(link.within.filter((role) => !['StaticText', 'InlineTextBox', 'generic', 'none', 'LineBreak'].includes(role)), link.name).toEqual([]);
  });

  test('LKC-36 before its script has run, or without it, every fixture is drawn whole and at rest, and nothing moves when the script arrives: the box of the card and of each of its parts is the same before and after', async ({ browser, page }) => {
    const document = await fixturesDocument(spec, { icons: true });
    const measure = (p: P) =>
      p.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('[data-fixture]')].map((stage) => [
            stage.getAttribute('data-fixture'),
            [...stage.querySelectorAll('tanrei-link-card, tanrei-link-card > a, [data-part]')]
              // The words and the picture's description are never drawn, and a failed picture is the script's to take away.
              .filter((el) => !['words', 'image-alt'].includes(el.getAttribute('data-part') ?? ''))
              .map((el) => { const r = el.getBoundingClientRect(); return `${el.getAttribute('data-part') ?? el.localName} ${r.left.toFixed(1)} ${(r.top + scrollY).toFixed(1)} ${r.width.toFixed(1)} ${r.height.toFixed(1)}`; }),
          ]),
        ),
      );
    // The same document without the package's script: no element is defined, and the stylesheet alone draws. (A
    // context with scripting turned off cannot be measured in every engine; LKC-1's test follows a card in one.)
    const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const plain = await context.newPage();
    await plain.setContent(document.replace(/<script type="module">[\s\S]*<\/script>/, ''));
    await plain.evaluate(() => document.fonts.ready);
    expect(await plain.evaluate(() => customElements.get('tanrei-link-card'))).toBeUndefined();
    const before = await measure(plain);
    await context.close();
    await page.setViewportSize({ width: 1000, height: 800 });
    await mountSpec(page);
    await page.waitForTimeout(100);
    const after = await measure(page);
    expect(Object.keys(before)).toHaveLength(spec.fixtures.length);
    for (const f of spec.fixtures) {
      // LKC-13: the picture that fails is taken away by the script; everything below it is then drawn as `no-picture`.
      if (f.id === 'image-failed') continue;
      expect(after[f.id], f.id).toEqual(before[f.id]);
      expect(before[f.id]?.length, f.id).toBeGreaterThan(3);
    }
  });
});

test.describe('the block, the container and the body', () => {
  test('LKC-2 the card is a block as wide as its container gives it, never wider, with no outer space and no height of its own; its container has the look’s fill, the token’s corners and one edge inside its size, and no elevation', async ({ page }) => {
    await mountSpec(page, ['full', 'full-filled', 'title-only']);
    for (const id of ['full', 'full-filled']) {
      const look = id === 'full' ? 'outlined' : 'filled';
      const [outer, inner] = [await box(card(page, id)), await box(anchor(page, id))];
      expect(outer.width, id).toBeCloseTo(720, 1);
      expect(inner, id).toEqual(outer);
      expect(await css(card(page, id), 'display')).toBe('block');
      for (const side of ['margin-top', 'margin-bottom', 'margin-left', 'margin-right']) expect(await px(card(page, id), side), side).toBe(0);
      expect(await drawn(anchor(page, id), 'background-color'), id).toEqual(await token(page, `${look}-container-color`));
      expect(await px(anchor(page, id), 'border-top-left-radius'), id).toBeCloseTo(await resolveToken(page, T('container-shape')), 1);
      expect(await css(anchor(page, id), 'box-shadow')).toBe('none');
      // The edge: the anchor's ::before, inside its size.
      expect(await px(anchor(page, id), 'border-top-width', '::before'), id).toBeCloseTo(await resolveToken(page, T('outline-width')), 2);
      expect(await drawn(anchor(page, id), 'border-top-color', '::before'), id).toEqual(await token(page, `${look}-outline-color`));
      expect(await css(anchor(page, id), 'inset', '::before')).toMatch(/^0px/);
      expect(await css(card(page, id), 'height')).not.toBe('0px');
    }
    // Default system: corners of 8 and one hairline.
    expect(await resolveToken(page, T('container-shape'))).toBe(8);
    expect(await resolveToken(page, T('outline-width'))).toBe(1);
    // As tall as what it holds.
    expect((await box(card(page, 'title-only'))).height).toBeCloseTo((await box(part(page, 'title-only', 'body'))).height, 1);
    // Never wider than its container.
    await setStage(page, 'full', 'inline-size: 200px;');
    expect((await box(card(page, 'full'))).width).toBeCloseTo(200, 1);
    expect(await card(page, 'full').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  test('LKC-2 the link card’s outlined and filled values are the Card’s, repeated by value: fill, edge, corners, padding and edge width resolve alike', async ({ page }) => {
    await mountSpec(page, ['full']);
    const cardToken = (name: string) => `--tanrei-comp-card-${name}`;
    for (const name of ['outlined-container-color', 'filled-container-color', 'outlined-outline-color']) expect(await resolveColor(page, T(name)), name).toBe(await resolveColor(page, cardToken(name)));
    for (const name of ['container-shape', 'container-padding', 'outline-width']) expect(await resolveToken(page, T(name)), name).toBe(await resolveToken(page, cardToken(name)));
  });

  test('LKC-2 in prose the card is one gap from the paragraph above and below, adds none of its own, starts at the text’s start edge and takes the column’s width; prose reaches nothing inside it', async ({ page }) => {
    await fresh(page);
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>t</title><style>${read('dist/tokens.css')}</style><style>${read('dist/prose.css')}</style><style>${read('dist/link-card.css')}</style></head>
      <body style="margin:16px"><div class="tanrei-prose" style="inline-size: 640px"><p id="a">One paragraph.</p><p id="b">Another.</p>${built(`href="${HREF}" data-external="false"`, '<span data-part="title" dir="auto">Designing with tokens</span><span data-part="site"><span data-part="address"><bdi data-part="host" dir="ltr">example.com</bdi></span></span>')}<p id="c">After it.</p></div>
      <script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
    await page.waitForFunction(() => !!customElements.get('tanrei-link-card'));
    const [a, b, c, it] = [await box(page.locator('#a')), await box(page.locator('#b')), await box(page.locator('#c')), await box(page.locator('tanrei-link-card'))];
    const gap = b.y - a.bottom;
    expect(gap).toBeGreaterThan(0);
    expect(it.y - b.bottom).toBeCloseTo(gap, 1);
    expect(c.y - it.bottom).toBeCloseTo(gap, 1);
    expect(it.x).toBeCloseTo(a.x, 1);
    expect(it.width).toBeCloseTo(640, 1);
    // PRS-16: the anchor is the card's, not prose's — no underline, the card's own colors.
    expect(await css(page.locator('tanrei-link-card > a'), 'text-decoration-line')).toBe('none');
    expect(await drawn(page.locator('tanrei-link-card [data-part="title"]'), 'color')).toEqual(await token(page, 'outlined-title-color'));
  });

  test('LKC-3 the body is padded by container.padding on every side and holds, from top to bottom, the title, the description title.gap below it and the site line site.gap below that, all at the start edge; a part that is not drawn takes no room and leaves no gap', async ({ page }) => {
    await mountSpec(page, ['no-picture', 'no-description', 'title-only', 'internal']);
    const padding = await resolveToken(page, T('container-padding'));
    const [body, title, description, site] = await Promise.all(['body', 'title', 'description', 'site'].map((name) => box(part(page, 'no-picture', name))));
    expect(title.y - body.y).toBeCloseTo(padding, 1);
    expect(title.x - body.x).toBeCloseTo(padding, 1);
    expect(body.right - title.right).toBeCloseTo(padding, 1);
    expect(description.y - title.bottom).toBeCloseTo(await resolveToken(page, T('title-gap')), 1);
    expect(site.y - description.bottom).toBeCloseTo(await resolveToken(page, T('site-gap')), 1);
    expect(body.bottom - site.bottom).toBeCloseTo(padding, 1);
    expect(description.x).toBeCloseTo(title.x, 1);
    expect(site.x).toBeCloseTo(title.x, 1);
    // No description: the site line follows the title by its own gap alone.
    await expect(part(page, 'no-description', 'description')).toHaveCount(0);
    expect((await box(part(page, 'no-description', 'site'))).y - (await box(part(page, 'no-description', 'title'))).bottom).toBeCloseTo(await resolveToken(page, T('site-gap')), 1);
    // A path of the product's own: no site line, and no room under the description.
    await expect(part(page, 'internal', 'site')).toHaveCount(0);
    expect((await box(part(page, 'internal', 'body'))).bottom - (await box(part(page, 'internal', 'description'))).bottom).toBeCloseTo(padding, 1);
  });
});

test.describe('the title, the address and the description', () => {
  test('LKC-4 the title is drawn in its text style and color on at most title.max-lines lines, cut with an ellipsis at the end of its last line; a run with no place to break breaks inside itself; no underline, no heading, and the whole of it is the accessible name', async ({ page, browserName }) => {
    await mountSpec(page, ['long-text', 'full']);
    const title = part(page, 'long-text', 'title');
    const max = Number(await css(page.locator('html'), T('title-max-lines')));
    expect(max).toBe(2);
    expect((await css(title, 'font-size'))).toBe(await css(page.locator('html'), '--tanrei-sys-typescale-heading-5-font-size').then(async () => `${await resolveToken(page, T('title-typescale-font-size'))}px`));
    expect(await drawn(title, 'color')).toEqual(await token(page, 'outlined-title-color'));
    const lineHeight = await px(title, 'line-height');
    expect((await box(title)).height).toBeCloseTo(lineHeight * max, 0);
    // Cut: more text than is drawn.
    expect(await title.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);
    expect(await css(title, '-webkit-line-clamp')).toBe(String(max));
    expect(await css(anchor(page, 'long-text'), 'text-decoration-line')).toBe('none');
    expect(await title.evaluate((el) => el.localName)).toBe('span');
    await expect(page.getByRole('heading')).toHaveCount(0);
    // The whole title names the link, whatever part of it is drawn.
    const whole = String(spec.fixtures.find((f) => f.id === 'long-text')!.props.title);
    await expect(page.getByRole('link', { name: whole, exact: true })).toHaveCount(1);
    // The short title is one line and is not cut.
    expect((await box(part(page, 'full', 'title'))).height).toBeCloseTo(lineHeight, 0);
    // A run longer than the line breaks inside the run rather than overflow.
    await mount(page, built(`href="${HREF}" data-external="false"`, `<span data-part="title" dir="auto">${'W'.repeat(400)}</span>`));
    await setStage(page, 't', 'inline-size: 320px;');
    const run = part(page, 't', 'title');
    expect((await box(run)).width).toBeLessThanOrEqual(320);
    expect(await run.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect((await box(run)).height).toBeCloseTo(lineHeight * max, 0);
    expect(browserName).toBeTruthy();
  });

  test('LKC-5 without a title the address of href, as it was given, is drawn in the title’s place and style as one left-to-right run that may break anywhere, on the same number of lines; the card is named by it, and a debug build says it has no title', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['address-only', 'full']);
    const title = part(page, 'address-only', 'title');
    await expect(title).toHaveText(HREF);
    await expect(title).toHaveAttribute('dir', 'ltr');
    expect(await css(title, 'font-size')).toBe(await css(part(page, 'full', 'title'), 'font-size'));
    expect(await css(title, 'word-break')).toBe('break-all');
    await expect(page.getByRole('link', { name: HREF, exact: true })).toHaveCount(1);
    await expect.poll(() => seen.filter((line) => line.includes('LKC-5')).length).toBe(1);
    // A title of white space alone is no title; in a right-to-left layout the address is still left to right.
    await mount(page, `<tanrei-link-card href="${HREF}?a=1&b=2" headline="   " external="off"></tanrei-link-card>`, { direction: 'rtl' });
    await expect(part(page, 't', 'title')).toHaveText(`${HREF}?a=1&b=2`);
    expect(await css(part(page, 't', 'title'), 'direction')).toBe('ltr');
    // Held to the same number of lines.
    await setStage(page, 't', 'inline-size: 160px;');
    const max = Number(await css(page.locator('html'), T('title-max-lines')));
    expect((await box(part(page, 't', 'title'))).height).toBeCloseTo((await px(part(page, 't', 'title'), 'line-height')) * max, 0);
    // A title given later takes the address's place.
    await card(page, 't').evaluate((el) => el.setAttribute('headline', 'Designing with tokens'));
    await expect(part(page, 't', 'title')).toHaveText('Designing with tokens');
    await expect(part(page, 't', 'title')).not.toHaveAttribute('data-address', '');
  });

  test('LKC-6 a description is drawn in its text style and color on at most description.max-lines lines, cut as the title is, and exposed whole; an empty one, or white space alone, draws nothing', async ({ page }) => {
    await mountSpec(page, ['long-text', 'full']);
    const description = part(page, 'long-text', 'description');
    const max = Number(await css(page.locator('html'), T('description-max-lines')));
    expect(await px(description, 'font-size')).toBe(await resolveToken(page, T('description-typescale-font-size')));
    expect(await drawn(description, 'color')).toEqual(await token(page, 'outlined-description-color'));
    expect((await box(description)).height).toBeCloseTo((await px(description, 'line-height')) * max, 0);
    expect(await description.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);
    await expect(description).toHaveText(String(spec.fixtures.find((f) => f.id === 'long-text')!.props.description));
    await mount(page, `<tanrei-link-card href="${HREF}" headline="Designing with tokens" description="   " external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'description')).toHaveCount(0);
    await card(page, 't').evaluate((el) => el.setAttribute('description', 'A sentence.'));
    await expect(part(page, 't', 'description')).toHaveText('A sentence.');
    await card(page, 't').evaluate((el) => el.removeAttribute('description'));
    await expect(part(page, 't', 'description')).toHaveCount(0);
  });
});

test.describe('the site line and the host', () => {
  test('LKC-7 the site line holds, in reading order, the icon, the site’s name, a middle dot, the host and the mark, item-gap apart and centred on the line’s first row, in its text style and color; a name that is empty or only repeats the host is not drawn', async ({ page }) => {
    await mountSpec(page, ['external', 'no-site-name', 'site-name-repeats-host', 'full']);
    const gap = await resolveToken(page, T('site-item-gap'));
    const site = part(page, 'external', 'site');
    expect(await px(site, 'font-size')).toBe(await resolveToken(page, T('site-typescale-font-size')));
    expect(await drawn(site, 'color')).toEqual(await token(page, 'outlined-site-color'));
    const [icon, name, host] = [await box(part(page, 'external', 'site-icon')), (await lines(part(page, 'external', 'site-name').locator('span')))[0], (await lines(part(page, 'external', 'host')))[0]];
    expect(name.x - icon.right).toBeCloseTo(gap, 0);
    expect(icon.x).toBeCloseTo((await box(site)).x, 1);
    // name, gap, dot (one character wide), gap, host.
    const dot = await px(part(page, 'external', 'site-name').locator('span'), 'width', '::after');
    expect(await css(part(page, 'external', 'site-name').locator('span'), 'content', '::after')).toContain('·');
    expect(host.x - name.right).toBeCloseTo(gap * 2 + dot, 0);
    // The mark follows the host by the gap.
    const address = part(page, 'external', 'address');
    expect(await px(address, 'margin-left', '::after')).toBeCloseTo(gap, 1);
    // Each centred on the height of the first row.
    const row = await px(site, 'line-height');
    expect(icon.y + icon.height / 2).toBeCloseTo((await box(site)).y + row / 2, 0);
    expect(name.y + name.height / 2).toBeCloseTo((await box(site)).y + row / 2, 0);
    // No name: the icon, then the host; no dot.
    await expect(part(page, 'no-site-name', 'site-name')).toHaveCount(0);
    expect((await lines(part(page, 'no-site-name', 'host')))[0].x - (await box(part(page, 'no-site-name', 'site-icon'))).right).toBeCloseTo(gap, 0);
    // "Example.com" says only what the host says: not drawn, and the host is.
    await expect(part(page, 'site-name-repeats-host', 'site-name')).toHaveCount(0);
    await expect(part(page, 'site-name-repeats-host', 'host')).toHaveText('example.com');
    // Given by script, with a leading www. and other case: marked, and not drawn.
    for (const name of ['WWW.Example.COM', 'example.com', ' Example.com ']) {
      await mount(page, `<tanrei-link-card href="${HREF}" headline="T" site-name="${name}" external="off"></tanrei-link-card>`);
      await expect(part(page, 't', 'site-name'), name).toBeHidden();
      await expect(part(page, 't', 'host')).toBeVisible();
    }
    await mount(page, `<tanrei-link-card href="https://www.example.com/" headline="T" site-name="example.com" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'site-name')).toBeHidden();
  });

  test('LKC-7 where the line is too narrow the site’s name gives way first — cut at its own end with an ellipsis, then left out together with the dot — and the host is never cut: a host longer than the line runs onto further lines, breaking after a dot, with the mark after its last character', async ({ page }) => {
    await mountSpec(page, ['long-text', 'long-host']);
    // long-text at 720: the name is cut, on one line; the whole host is shown.
    const name = part(page, 'long-text', 'site-name').locator('span');
    expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(true);
    expect(await css(name, 'text-overflow')).toBe('ellipsis');
    const host = part(page, 'long-text', 'host');
    expect(await lines(host)).toHaveLength(1);
    expect((await lines(host))[0].right).toBeLessThanOrEqual((await box(part(page, 'long-text', 'site'))).right + 0.5);
    expect(await css(part(page, 'long-text', 'address'), 'text-overflow')).not.toBe('ellipsis');
    // long-host on a stage 320 wide: the host wraps over two lines and none of it is hidden; the name has given way.
    await setStage(page, 'long-host', 'inline-size: 320px;');
    const long = part(page, 'long-host', 'host');
    const rows = await lines(long);
    expect(rows).toHaveLength(2);
    const site = await box(part(page, 'long-host', 'site'));
    for (const row of rows) {
      expect(row.x).toBeGreaterThanOrEqual(site.x - 0.5);
      expect(row.right).toBeLessThanOrEqual(site.right + 0.5);
    }
    await expect(long).toHaveText('documentation.design-systems.engineering.research.example.org');
    // It broke after a dot.
    expect(await long.evaluate((el) => {
      const range = document.createRange();
      const text = [...el.children];
      const tops = text.map((node) => { range.selectNodeContents(node); return Math.round(range.getClientRects()[0].top); });
      const first = text.filter((_, index) => tops[index] === tops[0]).map((node) => node.textContent).join('');
      return first.endsWith('.');
    })).toBe(true);
    for (const el of [part(page, 'long-host', 'address'), long]) expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 || getComputedStyle(node).display === 'inline')).toBe(true);
    // The name and its dot are not drawn there: its text is on a row that is clipped.
    const narrow = part(page, 'long-host', 'site-name');
    const [outer, inner] = [await box(narrow), await box(narrow.locator('span'))];
    expect(inner.y).toBeGreaterThanOrEqual(outer.bottom - 0.5);
    expect(await css(narrow, 'overflow-y')).toBe('hidden');
    // With a mark: after the host's last character, on its last line.
    await mount(page, `<tanrei-link-card href="https://documentation.design-systems.engineering.research.example.org/a" headline="T" external="on" external-label="external link"></tanrei-link-card>`);
    await setStage(page, 't', 'inline-size: 280px;');
    const last = (await lines(part(page, 't', 'host'))).at(-1)!;
    const mark = await part(page, 't', 'address').evaluate((el) => {
      // The mark's box: the address's last client rect is its pseudo-element's line; its own position is read from a range after the host.
      const r = el.getBoundingClientRect();
      return { bottom: r.bottom };
    });
    expect((await lines(part(page, 't', 'host'))).length).toBeGreaterThan(1);
    expect(last.bottom).toBeLessThanOrEqual(mark.bottom + 0.5);
    expect(await css(part(page, 't', 'address'), 'content', '::after')).toContain('arrow_outward');
  });

  test('LKC-8 the host is computed from href and from nothing else — never a user name, a path, a query, a fragment or a value the card is given — and no prop can set, replace or hide it; an address with no host of its own draws none; a host written in the document that differs is replaced and reported', async ({ page }) => {
    const seen = reports(page);
    const cases: [string, string][] = [
      ['https://example.com@other.example/a?b=example.org', 'other.example'],
      ['https://EXAMPLE.com:8443/', 'example.com:8443'],
      ['https://example.com:443/x#example.org', 'example.com'],
      ['https://user:secret@example.com/', 'example.com'],
      ['//example.net/x', 'example.net'],
    ];
    for (const [href, host] of cases) {
      await mount(page, `<tanrei-link-card href="${href}" headline="example.org — the real one" description="at https://example.org/" site-name="example.org" external="off"></tanrei-link-card>`);
      await expect(part(page, 't', 'host'), href).toHaveText(host);
      // The site's name stands before the host, never in its place.
      await expect(part(page, 't', 'site-name')).toBeVisible();
      expect((await lines(part(page, 't', 'host')))[0].x).toBeGreaterThan((await lines(part(page, 't', 'site-name').locator('span')))[0].right);
    }
    // No host of its own: a path, a fragment, an address relative to the page, a scheme that has none.
    for (const href of ['/foundations/tokens/', '#install', 'next/', '?page=2', 'mailto:hello@example.com']) {
      await mount(page, `<tanrei-link-card href="${href}" headline="Tokens"></tanrei-link-card>`);
      await expect(part(page, 't', 'host'), href).toHaveCount(0);
      await expect(part(page, 't', 'site'), href).toHaveCount(0);
    }
    await mountSpec(page, ['internal']);
    await expect(part(page, 'internal', 'site')).toHaveCount(0);
    // No attribute of the element is the host's.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" host="example.org" site="example.org" data-host="example.org" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'host')).toHaveText('example.com');
    // Written in the document, and differing: replaced when the element is defined, and reported.
    seen.length = 0;
    await mount(page, built(`href="https://evil.example/login" data-external="false"`, '<span data-part="title" dir="auto">Your bank</span><span data-part="site"><span data-part="address"><bdi data-part="host" dir="ltr">bank.example</bdi></span></span>'));
    await expect(part(page, 't', 'host')).toHaveText('evil.example');
    await expect.poll(() => seen.filter((line) => line.includes('LKC-8')).length).toBe(1);
    expect(seen.find((line) => line.includes('LKC-8'))).toContain('bank.example');
    // Changed later by the page: computed again.
    await part(page, 't', 'host').evaluate((el) => (el.textContent = 'bank.example'));
    await expect(part(page, 't', 'host')).toHaveText('evil.example');
    await anchor(page, 't').evaluate((el) => el.setAttribute('href', 'https://other.example/'));
    await expect(part(page, 't', 'host')).toHaveText('other.example');
    // Hidden by the page's markup? The part is written again where it was taken out.
    await part(page, 't', 'host').evaluate((el) => el.remove());
    await expect(part(page, 't', 'host')).toHaveText('other.example');
  });

  test('LKC-9 a host is drawn in its Unicode form only while every xn-- label decodes cleanly in one script; a borrowed letter and a whole borrowed word stay in the xn-- form; and the host is one left-to-right run, isolated, in every layout direction', async ({ page }) => {
    await mountSpec(page, ['idn-unicode', 'idn-ascii-mixed', 'idn-ascii-whole-script', 'full-rtl']);
    await expect(part(page, 'idn-unicode', 'host')).toHaveText('例え.jp');
    await expect(part(page, 'idn-ascii-mixed', 'host')).toHaveText('xn--exmple-4nf.com');
    await expect(part(page, 'idn-ascii-whole-script', 'host')).toHaveText('xn--80ak6aa92e.com');
    // Never a part in each form.
    await mount(page, `<tanrei-link-card href="https://xn--r8jz45g.xn--exmple-4nf.com/" headline="T" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'host')).toHaveText('xn--r8jz45g.xn--exmple-4nf.com');
    await mountSpec(page, ['full-rtl']);
    const host = part(page, 'full-rtl', 'host');
    expect(await host.evaluate((el) => el.localName)).toBe('bdi');
    expect(await css(host, 'direction')).toBe('ltr');
    expect(await css(host, 'unicode-bidi')).toBe('isolate');
    expect(await css(part(page, 'full-rtl', 'site'), 'direction')).toBe('rtl');
    // Its labels in the address's own order: "example." is left of "com".
    const order = await host.evaluate((el) => {
      const range = document.createRange();
      return [...el.children].map((node) => { range.selectNodeContents(node); return range.getBoundingClientRect().left; });
    });
    expect(order[0]).toBeLessThan(order[1]);
  });

  test('LKC-10 the site icon is a square box of site.icon.size at the start of the site line, the whole picture inside it, with site.icon.shape corners, kept from assistive technology; empty or failing, there is no icon, no glyph and no box, it is not asked for again, and the failure is reported', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['full', 'title-only']);
    const icon = part(page, 'full', 'site-icon');
    const size = await resolveToken(page, T('site-icon-size'));
    expect(await box(icon)).toMatchObject({ width: size, height: size });
    expect(await css(icon, 'object-fit')).toBe('contain');
    expect(await px(icon, 'border-top-left-radius')).toBeCloseTo(await resolveToken(page, T('site-icon-shape')), 1);
    await expect(icon).toHaveAttribute('alt', '');
    await expect(page.getByRole('img')).toHaveCount(0);
    await expect.poll(() => icon.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(part(page, 'title-only', 'site-icon')).toHaveCount(0);
    // Failing: taken away, no box — the host stands where the icon would have.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" site-icon="${fixturePicture('fixtures/missing.png')}" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'site-icon')).toHaveCount(0);
    expect((await lines(part(page, 't', 'host')))[0].x).toBeCloseTo((await box(part(page, 't', 'site'))).x, 0);
    await expect.poll(() => seen.filter((line) => line.includes('LKC-10')).length).toBe(1);
    // Not asked for again by the card itself: another change of the card writes no picture.
    await card(page, 't').evaluate((el) => el.setAttribute('description', 'A sentence.'));
    await expect(part(page, 't', 'description')).toHaveText('A sentence.');
    await expect(part(page, 't', 'site-icon')).toHaveCount(0);
    // A new address from the product is a new picture.
    await card(page, 't').evaluate((el, src) => el.setAttribute('site-icon', src), ICON);
    await expect(part(page, 't', 'site-icon')).toHaveCount(1);
  });
});

test.describe('the picture', () => {
  test('LKC-11 a picture is drawn over the whole of a box filled with media.container.color, covering it with its proportions kept and its centre on the box’s centre, clipped by the card’s corners where the box meets them, and never mirrored or tinted; without an image there is no box', async ({ page }) => {
    await mountSpec(page, ['full', 'full-rtl', 'no-picture']);
    for (const id of ['full', 'full-rtl']) {
      const media = part(page, id, 'media');
      expect(await drawn(media, 'background-color'), id).toEqual(await token(page, 'media-container-color'));
      expect(await css(media, 'object-fit')).toBe('cover');
      expect(await css(media, 'object-position')).toBe('50% 50%');
      expect(await css(media, 'transform')).toBe('none');
      expect(await css(media, 'filter')).toBe('none');
      expect(await css(media, 'opacity')).toBe('1');
      expect(await media.evaluate((el) => el.localName)).toBe('img');
      await expect(media).toHaveAttribute('alt', '');
    }
    const radius = await px(anchor(page, 'full'), 'border-top-left-radius');
    expect(await px(part(page, 'full', 'media'), 'border-top-right-radius')).toBeCloseTo(radius, 1);
    expect(await px(part(page, 'full', 'media'), 'border-bottom-right-radius')).toBeCloseTo(radius, 1);
    expect(await px(part(page, 'full', 'media'), 'border-top-left-radius')).toBe(0);
    // Right to left: the box meets the card's left corners.
    expect(await px(part(page, 'full-rtl', 'media'), 'border-top-left-radius')).toBeCloseTo(radius, 1);
    expect(await px(part(page, 'full-rtl', 'media'), 'border-top-right-radius')).toBe(0);
    await expect(part(page, 'no-picture', 'media')).toHaveCount(0);
    await expect(card(page, 'no-picture').locator('img[data-part="media"]')).toHaveCount(0);
  });

  test('LKC-12 a card at least layout.beside-min-width wide draws the picture beside the body at its end edge, media.width wide and as tall as the card; a narrower one draws it above, across the card, at media.aspect-ratio; with the text doubled it stacks sooner; the card decides from its own width, and two cards on one page take different layouts', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await mountSpec(page, ['full', 'full-filled']);
    const media = part(page, 'full', 'media');
    const width = await resolveToken(page, T('media-width'));
    const ratio = Number(await css(page.locator('html'), T('media-aspect-ratio')));
    expect([width, ratio, await resolveToken(page, T('layout-beside-min-width'))]).toEqual([192, 1.9, 480]);
    // 720: beside, at the right, 192 wide, as tall as the card, whose height is the body's.
    let [outer, picture, body] = [await box(card(page, 'full')), await box(media), await box(part(page, 'full', 'body'))];
    expect(picture.width).toBeCloseTo(width, 1);
    expect(picture.right).toBeCloseTo(outer.right, 1);
    expect(picture.height).toBeCloseTo(outer.height, 1);
    expect(outer.height).toBeCloseTo(body.height, 1);
    expect(body.right).toBeCloseTo(picture.x, 1);
    // 320: above the text, 320 wide and 320 / 1.9 high — and the other card, on the same page, is still beside.
    await setStage(page, 'full', 'inline-size: 320px;');
    [outer, picture, body] = [await box(card(page, 'full')), await box(media), await box(part(page, 'full', 'body'))];
    expect(picture.width).toBeCloseTo(320, 1);
    expect(picture.height).toBeCloseTo(320 / ratio, 0);
    expect(Math.round(picture.height)).toBe(168);
    expect(picture.y).toBeCloseTo(outer.y, 1);
    expect(body.y).toBeCloseTo(picture.bottom, 1);
    expect(body.width).toBeCloseTo(320, 1);
    expect((await box(part(page, 'full-filled', 'media'))).width).toBeCloseTo(width, 1);
    // The boundary is the card's own width, at the token's value: beside from 480, above just under it.
    await setStage(page, 'full', 'inline-size: 480px;');
    expect((await box(media)).width).toBeCloseTo(width, 1);
    await setStage(page, 'full', 'inline-size: 479px;');
    expect((await box(media)).width).toBeCloseTo(479, 1);
    // The window's width decides nothing.
    await setStage(page, 'full', 'inline-size: 720px;');
    await page.setViewportSize({ width: 400, height: 900 });
    await setStage(page, 'full', 'max-inline-size: none;');
    expect((await box(media)).width).toBeCloseTo(width, 1);
    await page.setViewportSize({ width: 1000, height: 900 });
    // 720 with the text size doubled: the boundary is 960, so the picture is above.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect((await box(media)).width).toBeCloseTo(720, 1);
    expect((await box(media)).y).toBeCloseTo((await box(card(page, 'full'))).y, 1);
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    // Crossing the boundary: at once, without a motion, keeping focus.
    await tabTo(page, anchor(page, 'full'));
    await setStage(page, 'full', 'inline-size: 300px;');
    expect((await box(media)).width).toBeCloseTo(300, 1);
    expect(await css(media, 'transition-duration')).toBe('0s');
    await expect(anchor(page, 'full')).toBeFocused();
    // The stylesheet's boundary is the token's, written by the build in rem.
    expect(read('dist/link-card.css')).toContain('@container (inline-size >= 30rem)');
    expect(read('src/styles/link-card.css')).toContain('@container (inline-size >= token(comp.link-card.layout.beside-min-width))');
  });

  test('LKC-13 the picture box has its final size before the picture arrives, so nothing moves when it does; a picture that cannot be loaded leaves a card without a picture — no mark, no text, no address — is not asked for again and is reported; a changed image draws the box until the new picture has loaded', async ({ page }) => {
    const seen = reports(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    const asked = await served(page, siteCard('slow', HREF, { media: '/pictures/card.png', extra: 'data-external="false"' }), { hold: (pathname) => (pathname === '/pictures/card.png' ? held : undefined) });
    const media = page.locator('#slow img[data-part="media"]');
    await page.waitForTimeout(150);
    expect(await media.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(false);
    const before = [await box(media), await box(page.locator('#slow')), await box(page.locator('#slow [data-part="title"]'))];
    expect(before[0].width).toBeCloseTo(await resolveToken(page, T('media-width')), 1);
    release();
    await expect.poll(() => media.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect([await box(media), await box(page.locator('#slow')), await box(page.locator('#slow [data-part="title"]'))]).toEqual(before);
    expect(await css(media, 'transition-duration')).toBe('0s');
    expect(await css(media, 'animation-name')).toBe('none');
    expect(asked.filter((request) => request.type === 'image')).toHaveLength(1);
    // image-failed is drawn exactly as no-picture with the same text.
    await page.unroute('**/*');
    await mountSpec(page, ['image-failed', 'no-picture']);
    await card(page, 'image-failed').scrollIntoViewIfNeeded();
    await expect(part(page, 'image-failed', 'media')).toHaveCount(0);
    const parts = (id: string) => card(page, id).evaluate((el) => [...el.querySelectorAll('a, [data-part]')].map((node) => { const r = node.getBoundingClientRect(); const o = el.getBoundingClientRect(); return `${node.getAttribute('data-part') ?? 'a'} ${(r.left - o.left).toFixed(1)} ${(r.top - o.top).toFixed(1)} ${r.width.toFixed(1)} ${r.height.toFixed(1)}`; }));
    expect(await parts('image-failed')).toEqual(await parts('no-picture'));
    await expect(card(page, 'image-failed').locator('img[data-part="media"]')).toHaveCount(0);
    await expect.poll(() => seen.filter((line) => line.includes('LKC-13')).length).toBe(1);
    expect(seen.find((line) => line.includes('LKC-13'))).toContain('cannot be loaded');
    // Not asked for again: the card changes, and no picture is written.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" image="${fixturePicture('fixtures/missing.png')}" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'media')).toHaveCount(0);
    await card(page, 't').evaluate((el) => el.setAttribute('headline', 'Another title'));
    await expect(part(page, 't', 'title')).toHaveText('Another title');
    await expect(part(page, 't', 'media')).toHaveCount(0);
    // A changed image is a new picture element: the box, not the picture before it, until it has loaded.
    await card(page, 't').evaluate((el, src) => el.setAttribute('image', src), PICTURE);
    await expect(part(page, 't', 'media')).toHaveCount(1);
    await part(page, 't', 'media').evaluate((el) => ((el as HTMLElement & { first?: boolean }).first = true));
    await card(page, 't').evaluate((el, src) => el.setAttribute('image', `${src}#again`), PICTURE);
    await expect(part(page, 't', 'media')).toHaveCount(1);
    expect(await part(page, 't', 'media').evaluate((el) => (el as HTMLElement & { first?: boolean }).first === true)).toBe(false);
  });
});

test.describe('it loads nothing about the destination', () => {
  test('LKC-14 a page of link cards with no image and no site icon makes no request beyond the page’s own — pointed at, focused and pressed included — and nothing leaves the site', async ({ page }) => {
    const asked = await served(page, `${siteCard('a', 'https://example.com/articles/a')}${siteCard('b', 'https://example.org/b', { extra: 'target="_blank"' })}<tanrei-link-card id="c" href="https://example.net/c" headline="Built by script" description="From attributes." site-name="Example"></tanrei-link-card>`);
    await expect(page.locator('#c a')).toHaveAttribute('href', 'https://example.net/c');
    for (const id of ['a', 'b', 'c']) {
      const link = page.locator(`#${id} > a`);
      await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
      await link.hover();
      await link.focus();
      await page.mouse.down();
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const urls = asked.map((request) => new URL(request.url));
    expect(urls.filter((url) => url.origin !== SITE).map(String)).toEqual([]);
    expect([...new Set(urls.map((url) => url.pathname))].sort()).toEqual(['/', '/icons.css', '/link-card.css', '/link.css', '/tanrei.bundle.js', '/tokens.css']);
    expect(asked.filter((request) => !['document', 'stylesheet', 'script', 'font'].includes(request.type))).toEqual([]);
  });

  test('LKC-14 with an image and a site icon the only requests are for those two addresses, each as a picture and without a Referer header, and a card below the fold has asked for nothing', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    const asked = await served(page, `${siteCard('near', 'https://example.com/a', { media: '/pictures/card.png?near', icon: '/pictures/icon.png?near' })}<div style="block-size: 6000px"></div>${siteCard('far', 'https://example.org/b', { media: '/pictures/card.png?far', icon: '/pictures/icon.png?far' })}
      <tanrei-link-card id="made" href="https://example.net/c" headline="Built by script" image="/pictures/card.png?made" site-icon="/pictures/icon.png?made"></tanrei-link-card>`);
    await expect.poll(() => page.locator('#near img[data-part="media"]').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect.poll(() => page.locator('#near img[data-part="site-icon"]').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.waitForTimeout(300);
    const pictures = asked.filter((request) => request.type === 'image');
    expect(pictures.map((request) => new URL(request.url).pathname + new URL(request.url).search).sort()).toEqual(['/pictures/card.png?near', '/pictures/icon.png?near']);
    for (const request of pictures) expect(request.referer, request.url).toBeUndefined();
    expect(asked.filter((request) => new URL(request.url).origin !== SITE)).toEqual([]);
    // The card the element built writes the same attributes before the address, so its request is put off and bare too.
    for (const name of ['media', 'site-icon']) {
      const picture = page.locator(`#made img[data-part="${name}"]`);
      await expect(picture).toHaveAttribute('referrerpolicy', 'no-referrer');
      await expect(picture).toHaveAttribute('loading', 'lazy');
      await expect(picture).toHaveAttribute('decoding', 'async');
    }
    // Near what is shown, it is asked for — still without the page's address.
    await page.locator('#far').scrollIntoViewIfNeeded();
    await expect.poll(() => asked.filter((request) => request.type === 'image').length).toBe(6);
    for (const request of asked.filter((r) => r.type === 'image')) expect(request.referer, request.url).toBeUndefined();
    // Nothing but pictures, and no request for a destination, ever.
    expect(asked.filter((request) => !['document', 'stylesheet', 'script', 'font', 'image'].includes(request.type))).toEqual([]);
    expect(asked.some((request) => /example\.(com|org|net)/.test(request.url))).toBe(false);
  });

  test('LKC-14 what arrives is drawn as a picture and nothing else: an image address that answers with a document of markup draws nothing of it and is a failure; an address that names a script, or is no picture’s, is treated as empty and reported; a picture asked of another party is reported', async ({ page }) => {
    const seen = reports(page);
    const asked = await served(
      page,
      `${siteCard('markup', 'https://example.com/a', { media: '/pictures/page.png', extra: 'data-external="false"' })}
       <tanrei-link-card id="script" href="https://example.com/b" headline="A script for a picture" image="javascript:window.ran=1" site-icon="JaVaScRiPt:window.ran=2" external="off"></tanrei-link-card>
       <tanrei-link-card id="data" href="https://example.com/c" headline="A document for a picture" image="data:text/html,<script>window.ran=3</script>" external="off"></tanrei-link-card>
       ${siteCard('third', 'https://example.com/d', { media: 'https://pictures.example/card.png', extra: 'data-external="false"' })}
       <tanrei-link-card id="written"><a href="https://example.com/e" data-external="false"><span data-part="body"><span data-part="title">Written with a script</span></span><img data-part="media" src="javascript:window.ran=4" alt=""></a></tanrei-link-card>`,
      { files: { '/pictures/page.png': { contentType: 'text/html', body: '<!doctype html><script>window.ran = 5</script><p>markup</p>' } } },
    );
    await expect(page.locator('#markup img')).toHaveCount(0);
    await expect(page.locator('#script img')).toHaveCount(0);
    await expect(page.locator('#data img')).toHaveCount(0);
    await expect(page.locator('#written img')).toHaveCount(0);
    await expect(page.locator('#third img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { ran?: number }).ran)).toBeUndefined();
    // Never a frame, a document or markup.
    expect(await page.locator('iframe, object, embed, frame').count()).toBe(0);
    const told = seen.filter((line) => line.includes('LKC-14'));
    expect(told.filter((line) => line.includes('is not the address of a picture'))).toHaveLength(4);
    expect(told.find((line) => line.includes('https://pictures.example'))).toContain('which page is being read');
    // The picture of another party is the product's markup, asked for by the browser as written (and refused here).
    expect(asked.filter((request) => new URL(request.url).origin !== SITE).map((request) => request.url)).toEqual(['https://pictures.example/card.png']);
    expect(asked.find((request) => request.url.includes('pictures.example'))?.referer).toBeUndefined();
    // Markup that leaves the referrer policy out is given it, and told.
    await served(page, `<tanrei-link-card id="bare"><a href="https://example.com/f" data-external="false"><span data-part="body"><span data-part="title">No policy</span></span><img data-part="media" src="/pictures/card.png" alt=""></a></tanrei-link-card>`);
    await expect(page.locator('#bare img')).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect.poll(() => seen.filter((line) => line.includes('has no referrerpolicy')).length).toBe(1);
  });

  test('LKC-14 neither the element nor the stylesheet names or builds an address: no fetch, no request object, no picture made from href, no url() in the stylesheet', () => {
    const script = read('src/components/link-card/link-card.ts').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(script).not.toMatch(/favicon|fetch\(|XMLHttpRequest|sendBeacon|new Image|EventSource|WebSocket|createElement\('(link|script|iframe|object|embed)'\)|\.src\s*=|srcset/);
    // The one place a picture is made writes the address it was given, cleaned, and nothing derived from href.
    expect(script.match(/setAttribute\('src', [^)]*\)/g)).toEqual(["setAttribute('src', src)"]);
    expect(read('src/styles/link-card.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/url\(|@import/);
    const pure = read('src/links/index.ts').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(pure).not.toMatch(/fetch\(|XMLHttpRequest|document\.|window\.|from 'node:|require\(/);
  });

  test('LKC-15 every given value is drawn and exposed as plain text: a character that would begin markup is the character it is, nothing is parsed or run, and the characters that embed, override or isolate direction are dropped, so the letters after them stand in the order they were written', async ({ page, browserName }) => {
    await mountSpec(page, ['untrusted-text']);
    const fixture = spec.fixtures.find((f) => f.id === 'untrusted-text')!;
    // The spec's title carries U+202E: the fixture is what it says it is.
    expect(String(fixture.props.title)).toContain(RLO);
    const title = part(page, 'untrusted-text', 'title');
    await expect(title).toHaveText('<b>Designing</b> with tokens snekot<script>');
    expect(await title.evaluate((el) => [el.childElementCount, el.textContent?.includes(String.fromCodePoint(0x202e))])).toEqual([0, false]);
    await expect(part(page, 'untrusted-text', 'description')).toHaveText('A value is drawn as the characters it holds: <img src=x onerror=alert(1)> is text here.');
    await expect(part(page, 'untrusted-text', 'site-name')).toHaveText('Example <i>Journal</i>');
    expect(await card(page, 'untrusted-text').evaluate((el) => el.querySelectorAll('b, i, script, img, iframe').length)).toBe(0);
    // In the title's own style: the tag's name is not bold.
    expect(await css(title, 'font-weight')).toBe(String(await css(page.locator('html'), T('title-typescale-font-weight'))).trim());
    // "snekot" in the order it was written: s is left of t.
    const order = await title.evaluate((el) => {
      const node = el.firstChild as Text;
      const at = node.data.indexOf('snekot');
      const range = document.createRange();
      const left = (index: number) => { range.setStart(node, index); range.setEnd(node, index + 1); return range.getBoundingClientRect().left; };
      return left(at) < left(at + 5);
    });
    expect(order).toBe(true);
    if (browserName === 'chromium') expect((await exposedLinks(page))[0].name).toBe('<b>Designing</b> with tokens snekot<script>');
    // Given by script — as attributes and as properties: cleaned, and written as text.
    await mount(page, `<tanrei-link-card href="${HREF}" external="off"></tanrei-link-card>`);
    await card(page, 't').evaluate(
      (el, [rlo, lri, pdi]) => {
        Object.assign(el, {
          headline: `line one\nline\ttwo ${rlo}evil${pdi} <img src=x onerror="window.ran=1">`,
          description: `a\u0000b\u0007c ${lri}isolated${pdi} &amp; \u200Fmark\u200E join\u200Der\u200C`,
          siteName: `<a href="https://evil.example">${rlo}Example</a>`,
          image: (el as HTMLElement).dataset.picture ?? '',
        });
      },
      [RLO, LRI, PDI] as const,
    );
    await expect(part(page, 't', 'title')).toHaveText('line one line two evil <img src=x onerror="window.ran=1">', { useInnerText: false });
    expect(await part(page, 't', 'title').evaluate((el) => el.textContent)).toBe('line one line two evil <img src=x onerror="window.ran=1">');
    // Other control characters are dropped; the marks that only state a direction and the joiners are kept; an entity is not read.
    expect(await part(page, 't', 'description').evaluate((el) => el.textContent)).toBe(`abc isolated &amp; ${String.fromCodePoint(0x200f)}mark${String.fromCodePoint(0x200e)} join${String.fromCodePoint(0x200d)}er${String.fromCodePoint(0x200c)}`);
    expect(await part(page, 't', 'site-name').evaluate((el) => el.textContent)).toBe('<a href="https://evil.example">Example</a>');
    expect(await card(page, 't').evaluate((el) => [el.querySelectorAll('a').length, el.querySelectorAll('img').length, (window as unknown as { ran?: number }).ran])).toEqual([1, 0, undefined]);
    // Each value is isolated from the others and from the text around: a part of its own, with its own direction.
    for (const name of ['title', 'description']) await expect(part(page, 't', name)).toHaveAttribute('dir', 'auto');
    // The alternative text of the picture is text too.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" image="${PICTURE}" image-alt="&lt;b&gt;bold&lt;/b&gt; ${RLO}tla" external="off"></tanrei-link-card>`);
    expect(await part(page, 't', 'image-alt').evaluate((el) => [el.textContent, el.childElementCount])).toEqual(['<b>bold</b> tla', 0]);
  });
});

test.describe('states, focus and press', () => {
  test('LKC-16 hovered, keyboard-focused and pressed each render the container, the outline, the title, the description, the site line and the opacity from that state’s tokens, pressed over focused over hovered; focus by pointer is not the focused state; the answer is behind the text and never over the picture', async ({ page, browserName }) => {
    await mountSpec(page, ['full', 'full-filled'], { systemCss: await acmeSystemCss(), system: 'acme' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [id, look] of [['full', 'outlined'], ['full-filled', 'filled']] as const) {
      const link = anchor(page, id);
      const state = async (name: string) => {
        const prefix = name ? `${look}-${name}-` : `${look}-`;
        expect(await drawn(link, 'background-color'), `${id} ${name} container`).toEqual(await token(page, `${prefix}container-color`));
        expect(await drawn(link, 'border-top-color', '::before'), `${id} ${name} outline`).toEqual(await token(page, `${prefix}outline-color`));
        expect(await drawn(part(page, id, 'title'), 'color'), `${id} ${name} title`).toEqual(await token(page, `${prefix}title-color`));
        expect(await drawn(part(page, id, 'description'), 'color'), `${id} ${name} description`).toEqual(await token(page, `${prefix}description-color`));
        expect(await drawn(part(page, id, 'site'), 'color'), `${id} ${name} site`).toEqual(await token(page, `${prefix}site-color`));
        if (name) expect(await css(link, 'opacity'), `${id} ${name} opacity`).toBe(String(Number(await css(page.locator('html'), T(`${name}-opacity`)))));
      };
      await hoverless(page);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await state('');
      const rest = await drawn(link, 'background-color');
      await link.hover();
      await state('hovered');
      const hovered = await drawn(link, 'background-color');
      // acme values the three states differently: the test can tell them apart.
      expect(hovered).not.toEqual(rest);
      await hoverless(page);
      await tabTo(page, link);
      await state('focused');
      expect(await drawn(link, 'background-color')).not.toEqual(hovered);
      // Focused and hovered: focused wins.
      await link.hover();
      await state('focused');
      // Pressed over both.
      await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
      await page.mouse.down();
      await state('pressed');
      await page.mouse.up();
      await hoverless(page);
      // The picture is drawn as at rest: its own fill, above the state.
      expect(await drawn(part(page, id, 'media'), 'background-color')).toEqual(await token(page, 'media-container-color'));
      expect(await css(part(page, id, 'media'), 'opacity')).toBe('1');
    }
    // Focus gained by a pointer is not the focused state.
    await mountSpec(page, ['full'], { systemCss: await acmeSystemCss(), system: 'acme' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await anchor(page, 'full').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await anchor(page, 'full').click();
    await hoverless(page);
    // (Safari does not focus a link that is clicked: there the card is simply at rest.)
    if (browserName !== 'webkit') await expect(anchor(page, 'full')).toBeFocused();
    await expect.poll(() => drawn(anchor(page, 'full'), 'background-color')).toEqual(await token(page, 'outlined-container-color'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('LKC-17 keyboard focus shows the system’s focus ring around the whole card, outside the container and following its corners, without animation; focus by pointer shows none', async ({ page, browserName }) => {
    await mountSpec(page, ['full']);
    const link = anchor(page, 'full');
    await tabTo(page, link);
    const [offset, inner, outer] = [await resolveToken(page, '--tanrei-sys-focus-offset'), await resolveToken(page, '--tanrei-sys-focus-inner-width'), await resolveToken(page, '--tanrei-sys-focus-outer-width')];
    expect(await css(link, 'outline-style')).toBe('solid');
    expect(await px(link, 'outline-width')).toBeCloseTo(outer, 1);
    expect(await px(link, 'outline-offset')).toBeCloseTo(offset + inner, 1);
    expect(await drawn(link, 'outline-color')).toEqual(await painted(page, await resolveColor(page, '--tanrei-sys-color-focus-ring')));
    // The inner stroke, concentric with the container.
    expect(await px(link, 'border-top-width', '::after')).toBeCloseTo(inner, 1);
    expect(await px(link, 'top', '::after')).toBeCloseTo(-(offset + inner), 1);
    expect(await px(link, 'border-top-left-radius', '::after')).toBeCloseTo((await px(link, 'border-top-left-radius')) + offset + inner, 1);
    // Nothing clips it: the container does not clip, so a picture of any color cannot hide the ring.
    expect(await css(link, 'overflow')).toBe('visible');
    // Never animated.
    expect(await css(link, 'transition-property')).not.toMatch(/outline|all/);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await link.click();
    // (Safari does not focus a link that is clicked.)
    if (browserName !== 'webkit') await expect(link).toBeFocused();
    expect(await css(link, 'outline-style')).toBe('none');
  });

  test('LKC-18 a press by pointer or by Enter shows the pressed state without delay and keeps it for at least press-hold, even when the press ends sooner', async ({ page }) => {
    await mountSpec(page, ['full']);
    const link = anchor(page, 'full');
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    // Shown in the turn of the event that pressed, and there for press-hold from that event on — the event as it
    // reached the window, before the element's own listener (test/watched-press.ts).
    await watchPress(link);
    const at = await box(link);
    await page.mouse.move(at.x + 20, at.y + 20);
    await page.mouse.down();
    await page.mouse.up();
    await expectPressShownAndHeld(page, hold, 'pointer');
    // The pressed tokens are shown at once: no transition into the press.
    await page.mouse.down();
    expect(await css(link, 'transition-duration')).toMatch(/^0s/);
    expect(await drawn(link, 'background-color')).toEqual(await token(page, 'outlined-pressed-container-color'));
    await page.mouse.up();
    await hoverless(page);
    await expect(link).not.toHaveAttribute('data-pressed');
    await link.focus();
    await watchPress(link);
    await page.keyboard.press('Enter');
    await expectPressShownAndHeld(page, hold, 'Enter');
  });

  test('LKC-18 a press by Enter stays while the key is down, though the pointer resting over the card leaves it; the keyup ends it', async ({ page }) => {
    await mountSpec(page, ['full']);
    const link = anchor(page, 'full');
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await expectKeyPressOutlastsPointer(page, { control: link, key: 'Enter' });
  });

  test('LKC-19 a press is answered as sys.behavior.pressed-feedback names: overlay applies the pressed tokens to the whole container, ripple grows a layer from the point of contact and keeps the container color, dim applies the pressed opacity and draws no layer, none draws nothing', async ({ page }) => {
    const press = async (options: MountOptions, style = '') => {
      await mountSpec(page, ['full'], options);
      if (style) await setStage(page, 'full', style);
      const link = anchor(page, 'full');
      await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
      const at = await box(link);
      await page.mouse.move(at.x + 40, at.y + 30);
      const rest = await drawn(link, 'background-color');
      await page.mouse.down();
      return { link, rest, at };
    };
    // The default system: overlay.
    let { link, rest } = await press({});
    await expect(link).toHaveAttribute('data-pressed', 'overlay');
    expect(await drawn(link, 'background-color')).toEqual(await token(page, 'outlined-pressed-container-color'));
    await expect(link.locator('.ripple')).toHaveCount(0);
    await page.mouse.up();
    // m3-like: ripple — a layer of the pressed container color from the point of contact; the container stays.
    let at: Box;
    ({ link, rest, at } = await press({ system: 'm3-like' }));
    await expect(link).toHaveAttribute('data-pressed', 'ripple');
    const ripple = link.locator('.ripple');
    await expect(ripple).toHaveCount(1);
    await expect.poll(() => drawn(link, 'background-color')).toEqual(await token(page, 'outlined-hovered-container-color'));
    expect(await drawn(ripple, 'background-color')).toEqual(await token(page, 'outlined-pressed-container-color'));
    expect(await ripple.evaluate((el) => [el.style.getPropertyValue('--_x'), el.style.getPropertyValue('--_y')].map((v) => Math.round(Number.parseFloat(v))))).toEqual([40, 30]);
    expect(at.width).toBeGreaterThan(0);
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'z-index')).toBe('-1');
    await expect(ripple).toHaveAttribute('aria-hidden', 'true');
    // The title still comes from the pressed tokens.
    expect(await drawn(part(page, 'full', 'title'), 'color')).toEqual(await token(page, 'outlined-pressed-title-color'));
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
    // Enter: from the center.
    await link.focus();
    await page.keyboard.down('Enter');
    const centre = await link.locator('.ripple').evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), el.getBoundingClientRect().width / 2]);
    expect(centre[0]).toBeCloseTo(centre[1], 0);
    await page.keyboard.up('Enter');
    // Reduced motion: the ripple appears whole.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    ({ link } = await press({ system: 'm3-like' }));
    expect(await css(link.locator('.ripple'), 'animation-name')).toBe('none');
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // cupertino: dim — the pressed opacity on the whole control, no layer, the container stays.
    ({ link, rest } = await press({ system: 'cupertino' }));
    await expect(link).toHaveAttribute('data-pressed', 'dim');
    await expect(link.locator('.ripple')).toHaveCount(0);
    await expect.poll(() => drawn(link, 'background-color')).toEqual(await token(page, 'outlined-hovered-container-color'));
    expect(rest).toHaveLength(4);
    expect(await css(link, 'opacity')).toBe(String(Number(await css(page.locator('html'), T('pressed-opacity')))));
    await page.mouse.up();
    // none: nothing answers.
    ({ link, rest } = await press({}, '--tanrei-sys-behavior-pressed-feedback: none;'));
    await expect(link).toHaveAttribute('data-pressed', 'none');
    await expect.poll(() => drawn(link, 'background-color')).toEqual(await token(page, 'outlined-hovered-container-color'));
    await expect(link.locator('.ripple')).toHaveCount(0);
    await page.mouse.up();
  });

  test('LKC-20 the container’s corners are eased by sys.shape.corner-smoothing, and keyboard focus is shown as sys.behavior.focus-style names: the ring, or under a system that says so the glow', async ({ page }) => {
    await mountSpec(page, ['full'], { systemCss: await acmeSystemCss(), system: 'acme' });
    const link = anchor(page, 'full');
    await tabTo(page, link);
    // acme: glow — no stroke, a halo of the same two colors.
    expect(await drawn(link, 'outline-color')).toEqual([0, 0, 0, 0]);
    expect(await css(link, 'box-shadow', '::after')).not.toBe('none');
    expect(await px(link, 'border-top-width', '::after')).toBe(0);
    // The default: a ring.
    await mountSpec(page, ['full']);
    await tabTo(page, anchor(page, 'full'));
    expect(await css(anchor(page, 'full'), 'box-shadow', '::after')).toBe('none');
    expect((await drawn(anchor(page, 'full'), 'outline-color'))[3]).toBe(255);
    // cupertino: continuous corners, where the browser draws them; the radius is scaled with the curve.
    await mountSpec(page, ['full'], { system: 'cupertino' });
    const smooth = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(2)'));
    const shape = await css(anchor(page, 'full'), 'corner-shape');
    if (smooth) expect(shape).toContain('superellipse');
    const radius = await resolveToken(page, T('container-shape'));
    const smoothing = Number(await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing'));
    expect(smoothing).toBeGreaterThan(0);
    expect(await px(anchor(page, 'full'), 'border-top-left-radius')).toBeCloseTo(smooth ? radius * (1 + 0.4 * smoothing) : radius, 1);
  });

  test('LKC-21 where the card is drawn smaller than the minimum target its hit area reaches the target on both axes without changing its size; under the default system the smallest card is already larger', async ({ page }) => {
    // The smallest card: a title on one line and nothing else — a path of the product's own has no host.
    await fresh(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'title-only', props: {}, content: '<tanrei-link-card href="/tokens/" headline="Tokens"></tanrei-link-card>' }] });
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const smallest = await box(card(page, 'title-only'));
    expect(smallest.height).toBe(56);
    expect(smallest.height).toBeGreaterThanOrEqual(target);
    expect(await px(part(page, 'title-only', 'body'), 'top', '::before')).toBe(0);
    // A system with no padding: the card is one line of text high, and the hit area is the target.
    await setStage(page, 'title-only', `${T('container-padding')}: 0px; ${T('title-typescale-font')}: 400 12px/16px sans-serif; inline-size: 24px;`);
    const small = await box(card(page, 'title-only'));
    expect(small.height).toBeLessThan(target);
    const body = part(page, 'title-only', 'body');
    expect(small.height - 2 * (await px(body, 'top', '::before'))).toBeCloseTo(target, 0);
    expect(small.width - 2 * (await px(body, 'left', '::before'))).toBeCloseTo(target, 0);
    // A press just outside the drawn card, inside the target, reaches the link.
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a') !== null, [small.x + small.width / 2, small.y - (target - small.height) / 2 + 2])).toBe(true);
    expect(await box(card(page, 'title-only'))).toEqual(small);
  });

  test('LKC-22 Enter follows the link and fires click once; Space fires no click, shows no pressed state and leaves the page to scroll; a listener that cancels the click keeps the page where it is; a click with the new-tab modifier or the middle button is the browser’s, and the card cancels neither', async ({ page }) => {
    await mount(page, `${built('href="#there"', '<span data-part="title" dir="auto">Designing with tokens</span>')}<div style="block-size: 3000px"></div><p id="there">There</p>`);
    const link = anchor(page, 't');
    await link.evaluate((el) => {
      const counted = window as unknown as { clicks: number; pressed: number };
      counted.clicks = 0;
      counted.pressed = 0;
      el.addEventListener('click', () => (counted.clicks += 1));
      new MutationObserver(() => { if (el.hasAttribute('data-pressed')) counted.pressed += 1; }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
    });
    const counted = () => page.evaluate(() => { const w = window as unknown as { clicks: number; pressed: number }; return [w.clicks, w.pressed]; });
    await link.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await counted()).toEqual([0, 0]);
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#there$/);
    expect((await counted())[0]).toBe(1);
    // It is not held back for press-hold: the address changed while the pressed state still stood, or at once after.
    // Cancelled by the product: nothing opens.
    await page.evaluate(() => history.replaceState(null, '', location.href.replace(/#.*$/, '')));
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await link.click();
    expect(new URL(page.url()).hash).toBe('');
    expect((await counted())[0]).toBe(2);
    // The platform's own gestures: the card listens to no click and cancels none.
    const untouched = await link.evaluate((el) => {
      const results: boolean[] = [];
      const read = (event: Event) => { results.push(event.defaultPrevented); event.preventDefault(); };
      document.addEventListener('click', read, true);
      document.addEventListener('auxclick', read, true);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, metaKey: true, ctrlKey: true }));
      el.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, composed: true, button: 1 }));
      document.removeEventListener('click', read, true);
      document.removeEventListener('auxclick', read, true);
      return results;
    });
    expect(untouched).toEqual([false, false]);
    const script = read('src/components/link-card/link-card.ts').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(script).not.toMatch(/\['click'|\['auxclick'|preventDefault|stopPropagation|location\.|window\.open/);
  });
});

test.describe('a new context, and another site', () => {
  test('LKC-23 target new opens a new context that gets no handle to the page, and draws open_in_new at the end of the site line in a box the size of the line’s text, in the site color, mirrored in a right-to-left layout and hidden from assistive technology; a card with neither a host nor a site name draws the mark alone; without targetLabel it still renders and says so', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['new-tab', 'new-tab-rtl', 'full']);
    const link = anchor(page, 'new-tab');
    await expect(link).toHaveAttribute('target', '_blank');
    expect((await link.getAttribute('rel'))?.split(/\s+/)).toContain('noopener');
    const address = part(page, 'new-tab', 'address');
    expect(await css(address, 'content', '::after')).toContain('open_in_new');
    const size = await px(part(page, 'new-tab', 'site'), 'font-size');
    expect(await px(address, 'width', '::after')).toBeCloseTo(size, 1);
    expect(await px(address, 'height', '::after')).toBeCloseTo(size, 1);
    expect(await drawn(address, 'color', '::after')).toEqual(await token(page, 'outlined-site-color'));
    const family = (text: string) => text.trim().replaceAll(/["']/g, '');
    expect(family(await css(address, 'font-family', '::after'))).toBe(family(await css(page.locator('html'), '--tanrei-sys-icon-family-unselected')));
    // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
    expect(await drawnOpticalSize(address, '::after')).toBe(await opticalSize(page, size));
    expect(await css(address, 'transform', '::after')).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    // At the end of the line: after the host.
    const [host, whole] = [(await lines(part(page, 'new-tab', 'host')))[0], await box(address)];
    expect(whole.right - host.right).toBeCloseTo(size + (await resolveToken(page, T('site-item-gap'))), 0);
    // Right to left: at the left end of the site line, mirrored.
    const rtl = part(page, 'new-tab-rtl', 'address');
    expect(await css(rtl, 'transform', '::after')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    const [rtlHost, rtlWhole] = [(await lines(part(page, 'new-tab-rtl', 'host')))[0], await box(rtl)];
    expect(rtlHost.x - rtlWhole.x).toBeCloseTo(size + (await resolveToken(page, T('site-item-gap'))), 0);
    // …which is the left end of everything the line holds.
    expect(rtlWhole.x).toBeLessThan((await lines(part(page, 'new-tab-rtl', 'site-name').locator('span')))[0].x);
    // The words are read; the glyph's name is not.
    await expect(part(page, 'new-tab', 'words')).toHaveText('opens in a new tab');
    await expect(anchor(page, 'new-tab')).toHaveAccessibleDescription(/opens in a new tab$/);
    for (const name of await page.getByRole('link').evaluateAll((links) => links.map((a) => `${a.getAttribute('aria-label') ?? ''} ${a.textContent}`))) expect(name).not.toContain('open_in_new');
    // target same: no such mark, and targetLabel is ignored.
    expect(await css(part(page, 'full', 'address'), 'content', '::after')).toBe('none');
    expect(seen.filter((line) => line.includes('LKC-23'))).toEqual([]);
    // Neither a host nor a site name: a site line that holds the mark alone.
    await mount(page, `<tanrei-link-card href="/foundations/tokens/" headline="Tokens" target="new" target-label="opens in a new tab"></tanrei-link-card><tanrei-link-card id="same" href="/x/" headline="Same" target-label="opens in a new tab"></tanrei-link-card>`);
    const alone = part(page, 't', 'site').first();
    await expect(alone).toBeVisible();
    expect(await css(card(page, 't').first().locator('[data-part="address"]'), 'content', '::after')).toContain('open_in_new');
    expect((await box(alone)).height).toBeGreaterThan(0);
    expect(await px(card(page, 't').first().locator('[data-part="address"]'), 'margin-left', '::after')).toBe(0);
    await expect(page.locator('#same [data-part="words"]')).toHaveCount(0);
    await expect(page.locator('#same [data-part="site"]')).toHaveCount(0);
    // HTML's spelling is read as new; no prop hides the mark.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" target="_blank" external="off"></tanrei-link-card>`);
    await expect(anchor(page, 't')).toHaveAttribute('target', '_blank');
    expect(await css(part(page, 't', 'address'), 'content', '::after')).toContain('open_in_new');
    await expect.poll(() => seen.filter((line) => line.includes('LKC-23')).length).toBe(1);
    await expect(part(page, 't', 'title')).toBeVisible();
  });

  test('LKC-24 an external destination that opens where the person is draws arrow_outward in the mark’s place and exposes externalLabel last; external off draws no arrow and still draws the host; a new context draws its own mark alone and says targetLabel; nothing else changes', async ({ page }) => {
    await mountSpec(page, ['external', 'external-off', 'new-tab']);
    expect(await css(part(page, 'external', 'address'), 'content', '::after')).toContain('arrow_outward');
    await expect(anchor(page, 'external')).not.toHaveAttribute('target');
    await expect(part(page, 'external', 'words')).toHaveText('external link');
    await expect(anchor(page, 'external')).toHaveAccessibleDescription('How a handful of dials becomes a whole system. Example Journal example.com external link');
    expect(await css(part(page, 'external-off', 'address'), 'content', '::after')).toBe('none');
    await expect(part(page, 'external-off', 'host')).toHaveText('example.com');
    await expect(part(page, 'external-off', 'words')).toHaveCount(0);
    // The same box, the same host: being external changes nothing else.
    expect((await box(card(page, 'external'))).height).toBe((await box(card(page, 'external-off'))).height);
    // Never two marks: a new context wins, and says targetLabel and not externalLabel.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" target="new" target-label="opens in a new tab" external="on" external-label="external link"></tanrei-link-card>`);
    expect(await css(part(page, 't', 'address'), 'content', '::after')).toContain('open_in_new');
    await expect(part(page, 't', 'words')).toHaveText('opens in a new tab');
    // Back to the same context: the arrow, and its words.
    await card(page, 't').evaluate((el) => el.setAttribute('target', 'same'));
    await expect(anchor(page, 't')).not.toHaveAttribute('target');
    expect(await css(part(page, 't', 'address'), 'content', '::after')).toContain('arrow_outward');
    await expect(part(page, 't', 'words')).toHaveText('external link');
    await card(page, 't').evaluate((el) => el.setAttribute('external', 'off'));
    await expect(anchor(page, 't')).toHaveAttribute('data-external', 'false');
    await expect(part(page, 't', 'words')).toHaveCount(0);
  });

  test('LKC-24 under auto the card decides exactly as the Link does, from the same declaration of the product’s own site: on a page of another origin the card shows the arrow as a text link to the same address does, a destination of the page’s own or a declared origin shows none, and the words set once for every external link are read', async ({ page }) => {
    const seen = reports(page);
    await served(page, `<p><a class="tanrei-link" id="text" href="${HREF}">a text link</a> <a class="tanrei-link" id="own-text" href="/guides/">an own link</a></p>
      <tanrei-link-card id="auto"><a href="${HREF}"><span data-part="body"><span data-part="title" dir="auto">Designing with tokens</span><span data-part="site"><span data-part="address"><bdi data-part="host" dir="ltr">example.com</bdi></span></span></span></a></tanrei-link-card>
      <tanrei-link-card id="own" href="${SITE}/guides/" headline="A page of this site"></tanrei-link-card>
      <tanrei-link-card id="path" href="/guides/" headline="A path"></tanrei-link-card>
      <tanrei-link-card id="said"><a href="${HREF}" data-external="false"><span data-part="body"><span data-part="title" dir="auto">Marked where the page was made</span></span></a></tanrei-link-card>`);
    await expect(page.locator('#text')).toHaveAttribute('data-external', 'detected');
    await expect(page.locator('#auto > a')).toHaveAttribute('data-external', 'detected');
    expect(await css(page.locator('#auto [data-part="address"]'), 'content', '::after')).toContain('arrow_outward');
    expect(await css(page.locator('#text'), 'content', '::after')).toContain('arrow_outward');
    for (const id of ['own', 'path']) {
      await expect(page.locator(`#${id} > a`), id).not.toHaveAttribute('data-external');
      await expect(page.locator('#own-text')).not.toHaveAttribute('data-external');
    }
    // The host is drawn for a destination on the product's own site as well.
    await expect(page.locator('#own [data-part="host"]')).toHaveText('site.test');
    // The product's word, written where the page was made, stands.
    await expect(page.locator('#said > a')).toHaveAttribute('data-external', 'false');
    // Nothing says it yet, and a debug build says so; the words set once for the page are then read.
    await expect.poll(() => seen.filter((line) => line.includes('LKC-24')).length).toBe(1);
    await expect(page.locator('#auto [data-part="words"]')).toHaveCount(0);
    await api(page, 'setExternalLabel', 'external link');
    await expect(page.locator('#auto [data-part="words"]')).toHaveText('external link');
    await expect(page.locator('#text')).toHaveAttribute('aria-description', 'external link');
    await expect(page.locator('#auto > a')).toHaveAccessibleDescription('example.com external link');
    // The card's own words win over the page's.
    await page.locator('#auto').evaluate((el) => el.setAttribute('external-label', 'leaves this site'));
    await expect(page.locator('#auto [data-part="words"]')).toHaveText('leaves this site');
    // Declared as the product's own: neither is external any more.
    await api(page, 'setSiteOrigins', ['example.com']);
    await expect(page.locator('#text')).not.toHaveAttribute('data-external');
    await expect(page.locator('#auto > a')).not.toHaveAttribute('data-external');
    await expect(page.locator('#auto [data-part="words"]')).toHaveCount(0);
    expect(await css(page.locator('#auto [data-part="address"]'), 'content', '::after')).toBe('none');
    await api(page, 'setSiteOrigins', []);
    await expect(page.locator('#auto > a')).toHaveAttribute('data-external', 'detected');
  });

  test('LKC-25 the title — or the address — is the accessible name and nothing is added to it; the description is, in order, the description, the picture’s alternative text, the site’s name where drawn, the host as drawn and last the words of a new context or of another site; the picture, the icon, the dot and the marks are kept from assistive technology', async ({ page, browserName }) => {
    await mountSpec(page, ['full', 'image-alt', 'new-tab', 'address-only', 'site-name-repeats-host', 'title-only']);
    const full = anchor(page, 'full');
    await expect(full).toHaveAccessibleName('Designing with tokens');
    await expect(full).toHaveAccessibleDescription('How a handful of dials becomes a whole system. Example Journal example.com');
    await expect.poll(() => part(page, 'image-alt', 'media').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(anchor(page, 'image-alt')).toHaveAccessibleDescription('How a handful of dials becomes a whole system. A wall of color swatches arranged from light to dark Example Journal example.com');
    await expect(anchor(page, 'new-tab')).toHaveAccessibleDescription('How a handful of dials becomes a whole system. Example Journal example.com opens in a new tab');
    await expect(anchor(page, 'address-only')).toHaveAccessibleName(HREF);
    await expect(anchor(page, 'address-only')).toHaveAccessibleDescription('example.com');
    await expect(anchor(page, 'site-name-repeats-host')).toHaveAccessibleDescription('How a handful of dials becomes a whole system. example.com');
    await expect(anchor(page, 'title-only')).toHaveAccessibleDescription('example.com');
    // No picture is exposed as one; the alternative text is never drawn.
    await expect(page.getByRole('img')).toHaveCount(0);
    await expect(part(page, 'image-alt', 'media')).toHaveAttribute('alt', '');
    expect((await box(part(page, 'image-alt', 'image-alt'))).width).toBeLessThanOrEqual(1);
    if (browserName === 'chromium') {
      const links = await exposedLinks(page);
      expect(links.find((link) => link.description.includes('A wall'))).toMatchObject({ name: 'Designing with tokens', description: 'How a handful of dials becomes a whole system. A wall of color swatches arranged from light to dark Example Journal example.com' });
      expect(links.find((link) => link.name === 'Designing with tokens' && !link.description.includes('opens') && !link.description.includes('A wall') && link.description.includes('Journal'))).toMatchObject({ description: 'How a handful of dials becomes a whole system. Example Journal example.com' });
      for (const link of links) {
        expect(`${link.name} ${link.description}`).not.toMatch(/·|open_in_new|arrow_outward/);
        expect(link.within).not.toContain('image');
      }
    }
    // The alternative text is read only with a picture: one that fails takes its words with it.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" image="${fixturePicture('fixtures/missing.png')}" image-alt="What it shows" external="off"></tanrei-link-card>`);
    await expect(part(page, 't', 'media')).toHaveCount(0);
    await expect(anchor(page, 't')).toHaveAccessibleDescription('example.com');
    await expect(part(page, 't', 'image-alt')).toHaveCount(0);
  });

  test('LKC-26 no state for a destination already visited: the stylesheet names no visited link, and one rule colors the title whether the card was followed or not', () => {
    const sheet = read('src/styles/link-card.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sheet).not.toMatch(/:visited/);
    expect(sheet).not.toMatch(/:link\b/);
    expect(sheet).toMatch(/color: var\(--_lc-now-title\)/);
  });
});

test.describe('refusals and unknown values', () => {
  test('LKC-27 an href that is empty, white space, a script or unreadable is no link and is not drawn as a card: the title as plain text in the style of the text around it and nothing else, no role, no focus, no request, and a report', async ({ page }) => {
    const seen = reports(page);
    for (const href of ['javascript:alert(1)', '', '   ', 'JaVaScRiPt:void 0', 'http://[']) {
      seen.length = 0;
      await mount(page, `<p id="around" style="font: italic 20px serif; color: rgb(10, 20, 30); margin: 0">Before <tanrei-link-card href="${href}" headline="Designing with tokens" description="A sentence." site-name="Example" image="${PICTURE}" site-icon="${ICON}" target="new" target-label="opens in a new tab"></tanrei-link-card> after</p>`);
      const title = part(page, 't', 'title');
      await expect(title, href).toHaveText('Designing with tokens');
      await expect(anchor(page, 't')).not.toHaveAttribute('href');
      await expect(page.getByRole('link')).toHaveCount(0);
      for (const property of ['font-style', 'font-size', 'font-family', 'color']) expect(await css(title, property), `${href} ${property}`).toBe(await css(page.locator('#around'), property));
      expect(await css(anchor(page, 't'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(anchor(page, 't'), 'content', '::before')).toBe('none');
      await expect(card(page, 't').locator('img')).toHaveCount(0);
      for (const name of ['description', 'site', 'words']) await expect(part(page, 't', name), name).toHaveCount(0);
      // Nothing can be focused or pressed.
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tab(page);
      expect(await page.evaluate(() => document.activeElement?.closest('tanrei-link-card'))).toBeNull();
      const at = await box(title);
      await page.mouse.move(at.x + 4, at.y + 4);
      await page.mouse.down();
      await expect(anchor(page, 't')).not.toHaveAttribute('data-pressed');
      await page.mouse.up();
      await expect.poll(() => seen.filter((line) => line.includes('LKC-27')).length, { message: href }).toBeGreaterThan(0);
    }
    // Written in the document: the script address is taken off; without script the stylesheet already draws no card.
    await mount(page, built('href="javascript:alert(1)"', '<span data-part="title" dir="auto">Designing with tokens</span><span data-part="description" dir="auto">A sentence.</span>', mediaImg()));
    await expect(anchor(page, 't')).not.toHaveAttribute('href');
    await expect(part(page, 't', 'description')).toBeHidden();
    await expect(card(page, 't').locator('img')).toHaveCount(0);
    const sheet = read('src/styles/link-card.css');
    expect(sheet).toContain("[href^='javascript:' i]");
  });

  test('LKC-27 a target the card does not define behaves as same, an external it does not define as auto, and a variant the active system does not have is drawn with the default’s tokens; each is reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" target="_top" external="maybe" variant="glass"></tanrei-link-card>`);
    await expect(anchor(page, 't')).not.toHaveAttribute('target');
    // auto: on a page written into a blank window every web address is of another origin.
    await expect(anchor(page, 't')).toHaveAttribute('data-external', 'detected');
    expect(await drawn(anchor(page, 't'), 'background-color')).toEqual(await token(page, 'outlined-container-color'));
    expect(await drawn(anchor(page, 't'), 'border-top-color', '::before')).toEqual(await token(page, 'outlined-outline-color'));
    await expect.poll(() => ['target "_top"', 'external "maybe"', 'variant "glass"'].map((text) => seen.some((line) => line.includes('LKC-27') && line.includes(text)))).toEqual([true, true, true]);
    // A value that is no token name is the default too, and nothing of it reaches a stylesheet.
    await card(page, 't').evaluate((el) => el.setAttribute('variant', "x'] { } * { display: none"));
    expect(await drawn(anchor(page, 't'), 'background-color')).toEqual(await token(page, 'outlined-container-color'));
    await expect(part(page, 't', 'title')).toBeVisible();
    // A look a design system added is drawn from its tokens.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="T" variant="tinted" external="off"></tanrei-link-card>`);
    await setStage(page, 't', `${T('tinted-container-color')}: rgb(1, 2, 3); ${T('tinted-title-color')}: rgb(200, 201, 202);`);
    await card(page, 't').evaluate((el) => { el.setAttribute('variant', 'outlined'); el.setAttribute('variant', 'tinted'); });
    await expect.poll(() => drawn(anchor(page, 't'), 'background-color')).toEqual([1, 2, 3, 255]);
    expect(await drawn(part(page, 't', 'title'), 'color')).toEqual([200, 201, 202, 255]);
    // What it lacks falls back to the default's.
    expect(await drawn(part(page, 't', 'site'), 'color')).toEqual(await token(page, 'outlined-site-color'));
  });

  test('LKC-28 a change of state animates the colors over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    await mountSpec(page, ['full']);
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const easing = (await css(page.locator('html'), T('motion-state-easing'))).trim();
    expect(duration).not.toBe('0s');
    const link = anchor(page, 'full');
    expect(await css(link, 'transition-property')).toBe('background-color, opacity');
    expect(await css(link, 'transition-duration')).toBe(`${duration}, ${duration}`);
    expect((await css(link, 'transition-timing-function')).replaceAll(' ', '')).toContain(easing.replaceAll(' ', ''));
    for (const name of ['title', 'description', 'site']) {
      expect(await css(part(page, 'full', name), 'transition-property'), name).toBe('color');
      expect(await css(part(page, 'full', name), 'transition-duration'), name).toBe(duration);
    }
    expect(await css(link, 'transition-property', '::before')).toBe('border-color');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(link, 'transition-duration')).toBe('0s');
    expect(await css(part(page, 'full', 'title'), 'transition-duration')).toBe('0s');
    expect(await css(link, 'transition-duration', '::before')).toBe('0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});

test.describe('enlarged text, forced colors, direction', () => {
  test('LKC-29 with the text enlarged the title, the description, the site line and the mark grow, the paddings, gaps, edge, icon box and media.width stay, lines are still counted, the card grows in height with no fixed one, and at 320 wide with text at 200 % nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountSpec(page, ['long-text', 'new-tab', 'long-host', 'address-only']);
    await page.addStyleTag({ content: '.stage { padding: 0 !important; inline-size: auto !important; max-inline-size: 100% !important; } main { align-items: stretch !important; }' });
    const read1 = async () => ({
      title: await px(part(page, 'long-text', 'title'), 'font-size'),
      description: await px(part(page, 'long-text', 'description'), 'font-size'),
      site: await px(part(page, 'long-text', 'site'), 'font-size'),
      mark: await px(part(page, 'new-tab', 'address'), 'width', '::after'),
      padding: await px(part(page, 'long-text', 'body'), 'padding-left'),
      gap: await px(part(page, 'long-text', 'description'), 'margin-top'),
      edge: await px(anchor(page, 'long-text'), 'border-top-width', '::before'),
      icon: (await box(part(page, 'long-text', 'site-icon'))).width,
      height: (await box(card(page, 'long-text'))).height,
      titleLines: (await box(part(page, 'long-text', 'title'))).height / (await px(part(page, 'long-text', 'title'), 'line-height')),
    });
    const before = await read1();
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await read1();
    for (const name of ['title', 'description', 'site', 'mark'] as const) expect(after[name], name).toBeCloseTo(before[name] * 2, 0);
    // The paddings, the gaps, the edge and the icon's box are still exactly the tokens' — on the web the size dial is a
    // length in rem, so a page that enlarges its root text enlarges them with it.
    expect(after.padding).toBeCloseTo(await resolveToken(page, T('container-padding')), 1);
    expect(after.gap).toBeCloseTo(await resolveToken(page, T('title-gap')), 1);
    expect(after.edge).toBeCloseTo(await resolveToken(page, T('outline-width')), 1);
    expect(after.icon).toBeCloseTo(await resolveToken(page, T('site-icon-size')), 1);
    expect(before.padding).toBeGreaterThan(0);
    expect(after.titleLines).toBeCloseTo(before.titleLines, 1);
    expect(after.height).toBeGreaterThan(before.height);
    for (const property of ['height', 'min-height', 'max-height']) expect(await card(page, 'long-text').evaluate((el, p) => el.style.getPropertyValue(p) || getComputedStyle(el).getPropertyValue(p), property)).toMatch(/^(auto|none|0px|[\d.]+px)$/);
    expect(read('src/styles/link-card.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|\s)(block-size|height): (?!auto|100%|1lh|1em|var\(--tanrei-sys-border-hairline\)|var\(--tanrei-comp-link-card-site-icon-size\))/m);
    // No sideways scrolling of what holds it, and nothing of any card reaches past the window.
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    for (const id of ['long-text', 'new-tab', 'long-host', 'address-only']) {
      for (const el of await card(page, id).locator('[data-part]').all()) expect((await box(el)).right, id).toBeLessThanOrEqual(320.5);
    }
    // The picture is above the text (LKC-12), and the host is whole.
    expect((await box(part(page, 'long-text', 'media'))).width).toBeCloseTo(320, 0);
    await expect(part(page, 'long-host', 'host')).toHaveText('documentation.design-systems.engineering.research.example.org');
  });

  test('LKC-30 in forced colors both looks have an edge of outline.width in the text color, the title is the link color, the description and the site line the text color, the focus ring the highlight color, the picture box has no fill and the pictures are left as they are', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['full', 'full-filled']);
    test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), `${browserName} does not emulate forced colors`);
    const system = (name: string) => page.evaluate((color) => { const probe = document.createElement('span'); probe.style.color = color; document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; }, name);
    for (const id of ['full', 'full-filled']) {
      expect(await css(anchor(page, id), 'border-top-color', '::before'), id).toBe(await system('CanvasText'));
      expect(await px(anchor(page, id), 'border-top-width', '::before'), id).toBeCloseTo(await resolveToken(page, T('outline-width')), 2);
      expect(await css(part(page, id, 'title'), 'color'), id).toBe(await system('LinkText'));
      expect(await css(part(page, id, 'description'), 'color'), id).toBe(await system('CanvasText'));
      expect(await css(part(page, id, 'site'), 'color'), id).toBe(await system('CanvasText'));
      expect(await drawn(part(page, id, 'media'), 'background-color'), id).toEqual([0, 0, 0, 0]);
      expect(await css(part(page, id, 'media'), 'filter')).toBe('none');
      expect(await css(part(page, id, 'site-icon'), 'filter')).toBe('none');
    }
    await tabTo(page, anchor(page, 'full'));
    expect(await css(anchor(page, 'full'), 'outline-color')).toBe(await system('Highlight'));
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('LKC-31 the layout direction comes from the nearest ancestor that sets one — the card has no direction setting — and a change while it is shown is drawn at once, without a motion, keeping its focus', async ({ page }) => {
    await mountSpec(page, ['full']);
    expect(await card(page, 'full').evaluate((el) => [el.hasAttribute('dir'), 'dir' in (el.constructor as unknown as { properties: object }).properties])).toEqual([false, false]);
    const side = async () => ((await box(part(page, 'full', 'media'))).x - (await box(card(page, 'full'))).x < 1 ? 'left' : 'right');
    expect(await side()).toBe('right');
    await tabTo(page, anchor(page, 'full'));
    // On an ancestor inside the page, not on the root; changed after the first render.
    await stage(page, 'full').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
    expect(await side()).toBe('left');
    expect(await css(part(page, 'full', 'title'), 'text-align')).toBe('right');
    await expect(anchor(page, 'full')).toBeFocused();
    expect(await css(part(page, 'full', 'media'), 'transition-duration')).toBe('0s');
    await stage(page, 'full').evaluate((el) => el.removeAttribute('dir'));
    expect(await side()).toBe('right');
    // The document's own direction is followed where no ancestor sets one.
    await mountSpec(page, ['full'], { dir: 'rtl' });
    expect(await side()).toBe('left');
  });

  test('LKC-32 right to left the layout is mirrored — the picture at the left, the text from the right, the site line from the right: icon, name, host, mark — with paddings by logical edge; top and bottom do not change; the picture and the icon are not mirrored, the host stays left to right, and a ripple still grows from the point of contact', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await mountSpec(page, ['full-rtl', 'full', 'new-tab-rtl']);
    const [outer, media, body, title, site] = await Promise.all([box(card(page, 'full-rtl')), box(part(page, 'full-rtl', 'media')), box(part(page, 'full-rtl', 'body')), box(part(page, 'full-rtl', 'title')), box(part(page, 'full-rtl', 'site'))]);
    const padding = await resolveToken(page, T('container-padding'));
    expect(media.x).toBeCloseTo(outer.x, 1);
    expect(media.width).toBeCloseTo(await resolveToken(page, T('media-width')), 1);
    expect(body.x).toBeCloseTo(media.right, 1);
    expect(outer.right - title.right).toBeCloseTo(padding, 1);
    expect((await lines(part(page, 'full-rtl', 'title')))[0].right).toBeCloseTo(title.right, 0);
    // The site line from the right: icon, name, host.
    const [icon, name, host] = [await box(part(page, 'full-rtl', 'site-icon')), (await lines(part(page, 'full-rtl', 'site-name').locator('span')))[0], (await lines(part(page, 'full-rtl', 'host')))[0]];
    expect(icon.right).toBeCloseTo(site.right, 1);
    expect(name.right).toBeLessThan(icon.x);
    expect(host.right).toBeLessThan(name.x);
    // Top and bottom as in left to right.
    const ltr = await Promise.all([box(card(page, 'full')), box(part(page, 'full', 'title')), box(part(page, 'full', 'site'))]);
    expect(title.y - outer.y).toBeCloseTo(ltr[1].y - ltr[0].y, 1);
    expect(outer.bottom - site.bottom).toBeCloseTo(ltr[0].bottom - ltr[2].bottom, 1);
    for (const name2 of ['media', 'site-icon']) expect(await css(part(page, 'full-rtl', name2), 'transform'), name2).toBe('none');
    expect(await css(part(page, 'full-rtl', 'host'), 'direction')).toBe('ltr');
    // The mark at the left end of the site line, mirrored inside its own box (the glyph itself is not).
    expect(await css(part(page, 'new-tab-rtl', 'address'), 'transform', '::after')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(part(page, 'new-tab-rtl', 'address'), 'direction', '::after')).toBe('ltr');
    // A ripple from the point of contact, as in left to right.
    await mountSpec(page, ['full-rtl'], { system: 'm3-like' });
    const link = anchor(page, 'full-rtl');
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    const at = await box(link);
    await page.mouse.move(at.x + 300, at.y + 20);
    await page.mouse.down();
    expect(await link.locator('.ripple').evaluate((el) => Math.round(Number.parseFloat(el.style.getPropertyValue('--_x'))))).toBe(300);
    await page.mouse.up();
  });

  test('LKC-33 the title, the description and the site’s name are each text of their own direction, isolated from the others: a left-to-right title in a right-to-left layout reads in its own order, begins at the right edge, and loses its right end where it is cut', async ({ page }) => {
    await mountSpec(page, ['ltr-title-rtl']);
    const title = part(page, 'ltr-title-rtl', 'title');
    await expect(title).toHaveAttribute('dir', 'auto');
    expect(await css(title, 'direction')).toBe('ltr');
    expect(await css(part(page, 'ltr-title-rtl', 'description'), 'direction')).toBe('rtl');
    expect(await css(part(page, 'ltr-title-rtl', 'site-name').locator('span'), 'direction')).toBe('ltr');
    // Placed and aligned by the layout direction: its lines end at the right edge.
    expect(await css(title, 'text-align')).toBe('right');
    const rows = await lines(title);
    expect(rows.length).toBe(Number(await css(page.locator('html'), T('title-max-lines'))));
    expect(rows[0].right).toBeCloseTo((await box(title)).right, 0);
    // In its own order: "Designing" is left of "tokens" on the first line.
    const order = await title.evaluate((el) => {
      const node = el.firstChild as Text;
      const range = document.createRange();
      const left = (word: string) => { const at = node.data.indexOf(word); range.setStart(node, at); range.setEnd(node, at + word.length); return range.getBoundingClientRect().left; };
      return left('Designing') < left('tokens');
    });
    expect(order).toBe(true);
    // Cut where its own direction ends: the first words are drawn, the last are not.
    expect(await title.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);
    const drawnWords = await title.evaluate((el) => {
      const node = el.firstChild as Text;
      const range = document.createRange();
      const box = el.getBoundingClientRect();
      const inside = (word: string) => { const at = node.data.lastIndexOf(word); range.setStart(node, at); range.setEnd(node, at + word.length); const r = range.getBoundingClientRect(); return r.top < box.bottom - 1 && r.bottom > box.top; };
      return [inside('Designing'), inside('built')];
    });
    expect(drawnWords).toEqual([true, false]);
    // A right-to-left name in a left-to-right card keeps its own order and reorders nothing beside it.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="مرحبا 2.0 beta" site-name="مجلة" external="off"></tanrei-link-card>`);
    expect(await css(part(page, 't', 'title'), 'direction')).toBe('rtl');
    expect(await css(part(page, 't', 'title'), 'text-align')).toBe('left');
    expect((await lines(part(page, 't', 'host')))[0].x).toBeGreaterThan((await lines(part(page, 't', 'site-name').locator('span')))[0].right);
  });
});

test.describe('changes, and what a card may hold', () => {
  test('LKC-34 a change of any prop while the card is shown is drawn and exposed at once, without a motion, keeping its focus, and is not announced', async ({ page }) => {
    await mount(page, `<tanrei-link-card href="${HREF}" headline="One" description="First." site-name="Journal" external="off"></tanrei-link-card>`);
    const link = anchor(page, 't');
    await tabTo(page, link);
    const node = await link.elementHandle();
    await card(page, 't').evaluate(
      (el, [picture, icon]) =>
        Object.assign(el, { href: 'https://example.org/two', headline: 'Two', description: 'Second.', image: picture, imageAlt: 'A picture', siteName: 'Other', siteIcon: icon, target: 'new', targetLabel: 'opens in a new tab', external: 'on', externalLabel: 'external link', variant: 'filled' }),
      [PICTURE, ICON] as const,
    );
    await expect(link).toHaveAttribute('href', 'https://example.org/two');
    await expect(part(page, 't', 'title')).toHaveText('Two');
    await expect(part(page, 't', 'description')).toHaveText('Second.');
    await expect(part(page, 't', 'host')).toHaveText('example.org');
    await expect(part(page, 't', 'site-name')).toHaveText('Other');
    await expect(part(page, 't', 'media')).toHaveCount(1);
    await expect(part(page, 't', 'site-icon')).toHaveCount(1);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(part(page, 't', 'words')).toHaveText('opens in a new tab');
    await expect(card(page, 't')).toHaveAttribute('variant', 'filled');
    expect(await drawn(link, 'background-color')).not.toEqual(await token(page, 'outlined-container-color'));
    await expect.poll(() => part(page, 't', 'media').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(link).toHaveAccessibleName('Two');
    await expect(link).toHaveAccessibleDescription('Second. A picture Other example.org opens in a new tab');
    // The same anchor, still focused; the order of the parts is the document's.
    expect(await link.evaluate((el, first) => el === first && document.activeElement === el, node)).toBe(true);
    expect(await card(page, 't').evaluate((el) => [...el.querySelectorAll('[data-part]')].map((p) => p.getAttribute('data-part')))).toEqual(['body', 'title', 'description', 'image-alt', 'site', 'site-icon', 'site-name', 'address', 'host', 'words', 'media']);
    // Not announced: no live region, no alert.
    expect(await card(page, 't').evaluate((el) => el.querySelectorAll('[aria-live], [role="alert"], [role="status"]').length + (el.hasAttribute('aria-live') ? 1 : 0))).toBe(0);
    // Back again: the parts go, and leave nothing.
    await card(page, 't').evaluate((el) => Object.assign(el, { description: '', image: '', imageAlt: '', siteName: '', siteIcon: '', target: 'same', external: 'off', variant: 'outlined' }));
    for (const name of ['description', 'media', 'image-alt', 'site-name', 'site-icon', 'words']) await expect(part(page, 't', name), name).toHaveCount(0);
    await expect(link).not.toHaveAttribute('target');
    await expect(link).toBeFocused();
    // The product's own anchor: a change of its markup is read again, and an attribute given is written over its part.
    await mount(page, built(`href="${HREF}" data-external="false"`, '<span data-part="title" dir="auto">Written</span><span data-part="site"><span data-part="address"><bdi data-part="host" dir="ltr">example.com</bdi></span></span>'));
    await part(page, 't', 'title').evaluate((el) => (el.textContent = 'Rewritten'));
    await expect(anchor(page, 't')).toHaveAccessibleName('Rewritten');
    await card(page, 't').evaluate((el) => el.setAttribute('headline', 'Given'));
    await expect(part(page, 't', 'title')).toHaveText('Given');
    await card(page, 't').evaluate((el) => el.setAttribute('description', 'Added.'));
    await expect(part(page, 't', 'description')).toHaveText('Added.');
    expect(await card(page, 't').evaluate((el) => [...el.querySelectorAll('[data-part="body"] > [data-part]')].map((p) => p.getAttribute('data-part')))).toEqual(['title', 'description', 'site']);
  });

  test('LKC-35 the card holds no interactive element and offers no place to put one: it has no slot and no property that takes markup, and one found inside the product’s own markup is reported and made inert, so the card stays one link', async ({ page }) => {
    const seen = reports(page);
    await mount(page, built(`href="${HREF}" data-external="false"`, '<span data-part="title" dir="auto">Designing with tokens</span><button id="save" type="button">Save</button><span tabindex="0" id="stop">a stop</span>'));
    await expect.poll(() => seen.filter((line) => line.includes('LKC-35')).length).toBe(2);
    await expect(page.locator('#save')).toHaveAttribute('inert', '');
    await expect(page.locator('#stop')).toHaveAttribute('inert', '');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const stops: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      stops.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.localName || ''));
    }
    expect(stops[0]).toBe('a');
    expect(stops).not.toContain('save');
    expect(stops).not.toContain('stop');
    expect(await page.locator('#save').evaluate((el) => el.matches(':focus, :focus-within'))).toBe(false);
    // A card built from attributes writes text only: nothing given becomes an element.
    await mount(page, `<tanrei-link-card href="${HREF}" headline="&lt;button&gt;Save&lt;/button&gt;" description="&lt;a href=x&gt;more&lt;/a&gt;" external="off"><span slot="actions">ignored</span></tanrei-link-card>`);
    expect(await card(page, 't').evaluate((el) => el.querySelectorAll('button, a').length)).toBe(1);
    expect(await card(page, 't').evaluate((el) => [el.shadowRoot, el.querySelectorAll('slot').length])).toEqual([null, 0]);
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`LKC-25 LKC-30 axe finds nothing in any fixture (${theme})`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      await page.waitForTimeout(100);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`)).toEqual([]);
    });
  }

  test('LKC-36 every fixture is mounted: each draws one card around one anchor with a title, and the mounted markup is the build step’s own', async ({ page }) => {
    await mountSpec(page);
    expect(spec.fixtures).toHaveLength(24);
    for (const f of spec.fixtures) {
      await expect(card(page, f.id), f.id).toHaveCount(1);
      await expect(anchor(page, f.id), f.id).toHaveCount(1);
      await expect(part(page, f.id, 'title'), f.id).toBeVisible();
      await expect(anchor(page, f.id), f.id).toHaveAttribute('href', String(f.props.href));
      if (f.props.variant) await expect(card(page, f.id), f.id).toHaveAttribute('variant', String(f.props.variant));
    }
  });
});

test.describe('baselines', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountSpec(page);
      await card(page, f.id).scrollIntoViewIfNeeded();
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

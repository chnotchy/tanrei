// <tanrei-code-block>, driven by specs/code-block.spec.json: every behaviour id (COD-1…33) is cited by a test title,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here. The code is the product's own `<pre><code>` in the light DOM (the harness writes it from the fixture's `code`
// or its runs); the tests of what a fixture cannot hold — a width, a press, a selection — give the stage their own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { atRest } from '../../../test/at-rest.js';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('code-block');
type P = Page;
const TAG = 'tanrei-code-block';
const T = (name: string) => `--tanrei-comp-code-block-${name}`;
const BUTTON = '--tanrei-comp-button-container-height-small';
const COPY = { copy: true, copyLabel: 'Copy', copiedLabel: 'Copied', copyFailedLabel: 'Could not copy' };

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const container = (page: P, id: string) => host(page, id).locator('.container');
const body = (page: P, id: string) => host(page, id).locator('.body');
const header = (page: P, id: string) => host(page, id).locator('.header');
const copyButton = (page: P, id: string) => host(page, id).locator('tanrei-copy-button');
const pre = (page: P, id: string) => host(page, id).locator('pre');
const lines = (page: P, id: string) => host(page, id).locator('[data-line]');
const line = (page: P, id: string, n: number) => lines(page, id).nth(n - 1);
const lineCode = (page: P, id: string, n: number) => line(page, id, n).locator('[data-line-code]');
const gutter = (page: P, id: string, n: number) => line(page, id, n).locator('[data-line-gutter]');
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Example', ...props }, ...extra });
const SIZES = String(fixture('titled').props.code);
const LONG = String(fixture('long-lines').props.code);
const mount = (page: P, fixtures: Fixture[], options: { theme?: 'light' | 'dark'; system?: string; systemCss?: string } = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });

interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
/** One line of a text style, in px: the line height its `font` shorthand token computes to. */
const lineOf = (page: P, font: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;font:var(${name})`;
    document.body.appendChild(probe);
    const value = Number.parseFloat(getComputedStyle(probe).lineHeight);
    probe.remove();
    return Math.round(value * 100) / 100;
  }, font);
const near = (actual: number, expected: number, what: string, tolerance = 0.6) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);
const unquoted = (family: string) => family.replaceAll(/["']/g, '').replaceAll(/\s*,\s*/g, ', ').trim();
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The boxes of the characters of one line's code, one per row it is drawn on: where each row begins and ends. */
const rows = (target: Locator): Promise<Box[]> =>
  target.evaluate((el) => {
    const range = document.createRange();
    const out: { x: number; y: number; width: number; height: number; right: number; bottom: number }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      for (let i = 0; i < node.length; i++) {
        if (node.data[i] === '\n') continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const row = out.find((each) => Math.abs(each.y - r.top) < r.height / 2);
        if (!row) out.push({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom });
        else Object.assign(row, { x: Math.min(row.x, r.left), right: Math.max(row.right, r.right), width: Math.max(row.right, r.right) - Math.min(row.x, r.left) });
      }
    }
    return out.sort((a, b) => a.y - b.y);
  });
/** The text of the code as the block's lines hold it: the `[data-line-code]` boxes, joined. */
const codeText = (page: P, id: string) => host(page, id).evaluate((el) => [...el.querySelectorAll('[data-line-code]')].map((each) => each.textContent).join(''));
/** The nine syntax roles (COD-18): the values of the token axis comp.code-block.syntax. */
const ROLES = ['comment', 'keyword', 'string', 'constant', 'function', 'type', 'tag', 'property', 'punctuation'] as const;
/** The fixtures of COD-19's verify — one per language — and the roles the code of each holds. */
const LANGUAGE_FIXTURES: Record<string, readonly string[]> = {
  'auto-tsx': ROLES,
  'auto-html': ['comment', 'punctuation', 'tag', 'property', 'string'],
  'auto-css': ['comment', 'keyword', 'punctuation', 'property', 'constant', 'tag', 'function'],
  'auto-javascript': ['keyword', 'punctuation', 'string', 'function', 'property', 'comment'],
  'auto-json': ['punctuation', 'property', 'string', 'constant'],
  'auto-shell': ['comment', 'function', 'property', 'keyword', 'string', 'punctuation'],
  'auto-swift': ['keyword', 'type', 'comment', 'punctuation', 'constant', 'string', 'property', 'function'],
  'auto-kotlin': ['keyword', 'function', 'punctuation', 'type', 'constant', 'property', 'comment', 'string'],
  'auto-dart': ['keyword', 'type', 'punctuation', 'property', 'constant', 'function', 'string'],
};
/** The highlighter as a build would import it: the same file the element imports, run here in Node. */
const H = (await import(path.join(pkg, 'dist/highlight/index.js'))) as typeof import('../../highlight/index.js');
type Runs = [role: string, text: string][];
/** Runs with every two neighbours of one role joined: the form in which what is drawn and what a highlighter answers are compared. */
const mergedRuns = (runs: Runs): Runs => runs.reduce<Runs>((out, [role, text]) => (out.length && out[out.length - 1][0] === role ? ((out[out.length - 1][1] += text), out) : [...out, [role, text]]), []);
const expectedRuns = async (code: string, language: string): Promise<Runs> => mergedRuns(((await H.highlight(code, language)) ?? [{ text: code }]).map((run) => [run.syntax ?? '', run.text]));
/** Runs by line, each line's break at its end. */
const perLine = (runs: Runs): Runs[] => {
  const out: Runs[] = [[]];
  for (const [role, text] of runs) {
    for (const piece of text.split(/(?<=\n)/)) {
      out[out.length - 1].push([role, piece]);
      if (piece.endsWith('\n')) out.push([]);
    }
  }
  return out.filter((each) => each.length).map(mergedRuns);
};
/** What is drawn in a block's code, or in one line's: the text of its `[data-line-code]` boxes by role, neighbours of one role joined. */
const drawnRuns = (target: Locator): Promise<Runs> =>
  target.evaluate((el) => {
    const out: [string, string][] = [];
    for (const box of el.matches('[data-line-code]') ? [el] : el.querySelectorAll('[data-line-code]')) {
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const role = node.parentElement!.closest('[data-syntax]')?.getAttribute('data-syntax') ?? '';
        if (out.length && out[out.length - 1][0] === role) out[out.length - 1][1] += node.data;
        else if (node.data) out.push([role, node.data]);
      }
    }
    return out;
  });
/** Waits for a block's colors: the first run with a role. */
const colors = (page: P, id: string) => expect(host(page, id).locator('[data-syntax]').first()).toBeAttached();
/** Replaces the highlighter of every block (the element's seam) by one the test answers by hand: what it was asked, and the answers it owes. */
const held = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as { __asked: { code: string; language: string; aborted: () => boolean }[]; __answer: ((runs: unknown) => void)[] };
    w.__asked = [];
    w.__answer = [];
    (customElements.get('tanrei-code-block') as unknown as { highlighter: unknown }).highlighter = (code: string, language: string, signal: AbortSignal) => {
      w.__asked.push({ code, language, aborted: () => signal.aborted });
      return new Promise((resolve) => w.__answer.push(resolve));
    };
  });
const asked = (page: P) => page.evaluate(() => (window as unknown as { __asked: { code: string; language: string; aborted: () => boolean }[] }).__asked.map((each) => ({ code: each.code, language: each.language, aborted: each.aborted() })));
const answer = (page: P, index: number, runs: unknown) => page.evaluate(([n, value]) => (window as unknown as { __answer: ((runs: unknown) => void)[] }).__answer[n as number](value), [index, runs] as const);
/** A block put into the mounted document after it was drawn: in a stage of its own, its code as text (or as markup). */
const insert = (page: P, id: string, attributes: Record<string, string>, code: string, markup = false) =>
  page.evaluate(
    ([name, attrs, text, html]) => {
      const stage = document.createElement('div');
      stage.className = 'stage';
      stage.dataset.fixture = name;
      const block = document.createElement('tanrei-code-block');
      for (const [key, value] of Object.entries(attrs)) block.setAttribute(key, value);
      const inner = document.createElement('code');
      if (html) inner.innerHTML = text;
      else inner.textContent = text;
      const outer = document.createElement('pre');
      outer.append(inner);
      block.append(outer);
      stage.append(block);
      document.querySelector('main')!.append(stage);
    },
    [id, attributes, code, markup] as const,
  );
/**
 * A page that loads the element as a product without a bundler would: the package's own modules, one request each
 * (`dist/`, and Lit by an import map), so that what is loaded — and when — can be read. `window.highlighter()` imports
 * `@tanrei/web/highlight` as a product would: the module the element imports, the same instance. `before` is script
 * run after the element is defined, in the task that defines it; `refuse` are paths whose request fails.
 */
async function modules(page: P, body: string, { before = '', refuse = [] as string[] } = {}) {
  const lit = fs.realpathSync(path.join(pkg, 'node_modules/lit'));
  const requested: string[] = [];
  const imports = { lit: '/m/lit/index.js', 'lit/': '/m/lit/', 'lit-html': '/m/lit-html/lit-html.js', 'lit-html/': '/m/lit-html/', 'lit-element/': '/m/lit-element/', '@lit/reactive-element': '/m/@lit/reactive-element/reactive-element.js', '@lit/reactive-element/': '/m/@lit/reactive-element/' };
  const document = `<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>modules</title>
    <script type="importmap">${JSON.stringify({ imports })}</script><style>${read('dist/tokens.css')}</style></head>
    <body>${body}<script type="module">
      import '/dist/components/code-block/code-block.js';
      window.highlighter = () => import('/dist/highlight/index.js');
      ${before}
    </script></body></html>`;
  await page.unroute('http://tanrei.test/**');
  await page.route('http://tanrei.test/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: document });
    requested.push(pathname);
    if (refuse.some((each) => pathname.includes(each))) return route.abort();
    const file = pathname.startsWith('/dist/') ? path.join(pkg, pathname) : path.join(lit, '..', pathname.replace(/^\/m\//, ''));
    return fs.existsSync(file) ? route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) }) : route.fulfill({ status: 404 });
  });
  await page.goto('http://tanrei.test/');
  await page.waitForFunction(() => !!customElements.get('tanrei-code-block'));
  return { requested: () => [...requested] };
}
/** The browser's clipboard replaced by a double that records what it is asked to write, and writes or refuses. */
const double = (page: P, refuses = false) =>
  page.evaluate((refuse) => {
    const w = window as unknown as { __writes: string[] };
    w.__writes = [];
    const clipboard = { writeText: (text: string) => (w.__writes.push(text), refuse ? Promise.reject(new DOMException('no', 'NotAllowedError')) : Promise.resolve()) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => clipboard });
  }, refuses);
const writes = (page: P) => page.evaluate(() => (window as unknown as { __writes: string[] }).__writes);
/** What a copy of the selection `select` makes inside the block's code would put on the clipboard. */
const copied = (target: Locator, select: 'all' | [number, number, number, number] = 'all') =>
  target.evaluate((el, how) => {
    const code = el.querySelector('code')!;
    const selection = getSelection()!;
    selection.removeAllRanges();
    const range = document.createRange();
    if (how === 'all') range.selectNodeContents(code);
    else {
      const texts = (n: number) => code.querySelectorAll('[data-line-code]')[n - 1];
      const first = (node: Element) => document.createTreeWalker(node, NodeFilter.SHOW_TEXT).nextNode()!;
      range.setStart(first(texts(how[0])), how[1]);
      range.setEnd(first(texts(how[2])), how[3]);
    }
    selection.addRange(range);
    const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
    (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement! : (range.startContainer as Element)).dispatchEvent(event);
    return { text: event.clipboardData?.getData('text/plain') ?? null, taken: event.defaultPrevented };
  }, select);

test.describe('the container and the code', () => {
  test('COD-1: a container filled with its variant’s color, with container.shape corners eased by the corner smoothing and no elevation, as wide as its layout gives it and no wider, bringing no space outside itself; outlined draws one edge inside the container and following its corners, filled none', async ({ page }) => {
    await mount(page, only('plain', 'outlined'));
    for (const [id, variant] of [['plain', 'filled'], ['outlined', 'outlined']] as const) {
      const c = container(page, id);
      expect(await css(c, 'background-color'), id).toBe(await resolveColor(page, T(`${variant}-container-color`)));
      expect(await px(c, 'border-top-left-radius'), id).toBe(await resolveToken(page, T('container-shape')));
      expect(await css(c, 'box-shadow'), id).toBe('none');
      // As wide as the stage's content box, and the host brings no margin.
      const inner = await stage(page, id).evaluate((el) => el.clientWidth - Number.parseFloat(getComputedStyle(el).paddingLeft) - Number.parseFloat(getComputedStyle(el).paddingRight));
      near((await box(c)).width, inner, `${id} width`, 0.1);
      expect(await host(page, id).evaluate((el) => getComputedStyle(el).margin), id).toBe('0px');
    }
    expect(await css(container(page, 'outlined'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // The edge: outline.width in outline.color, inside the container's size, with its corners.
    const edge = async (id: string) => ({ content: await css(container(page, id), 'content', '::after'), width: await css(container(page, id), 'border-top-width', '::after'), color: await css(container(page, id), 'border-top-color', '::after') });
    expect(await edge('outlined')).toEqual({ content: '""', width: `${await resolveToken(page, T('outline-width'))}px`, color: await resolveColor(page, T('outline-color')) });
    expect(await resolveToken(page, T('outline-width'))).toBeGreaterThan(0);
    expect((await edge('plain')).content).toBe('none');
    expect(await container(page, 'outlined').evaluate((el) => { const s = getComputedStyle(el, '::after'); return [s.position, s.inset || s.top, s.borderTopLeftRadius === getComputedStyle(el).borderTopLeftRadius]; })).toEqual(['absolute', '0px', true]);
    // It takes no room: an outlined block is the filled block's size, its code in the same place.
    expect((await box(container(page, 'outlined'))).height).toBe((await box(container(page, 'plain'))).height);
    expect((await rows(lineCode(page, 'outlined', 1)))[0].x - (await box(container(page, 'outlined'))).x).toBe((await rows(lineCode(page, 'plain', 1)))[0].x - (await box(container(page, 'plain'))).x);
    // Eased corners, where the browser draws the curve.
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const eased = await page.evaluate(() => CSS.supports('corner-shape: superellipse(2)'));
    expect(await px(container(page, 'plain'), 'border-top-left-radius')).toBeCloseTo((await resolveToken(page, T('container-shape'))) * (eased ? 1.24 : 1), 1);
  });

  test('COD-2: the code is set in the text style of its size, taken whole, in code.color, every line of the code on one line of that style; characters as given — spaces kept, a tab to the next multiple of code.tab-size columns, nothing transformed, translated or spell-checked — and no empty last line for a line break at the end', async ({ page }) => {
    await mount(page, [...only('plain', 'small', 'tabs', 'titled'), fx('trailing', { code: 'a\nb\n' }), fx('blank-last', { code: 'a\n\n' }), fx('spaces', { code: 'a    b  c' })]);
    for (const [id, size] of [['plain', 'medium'], ['small', 'small']] as const) {
      const code = pre(page, id);
      expect(await px(code, 'font-size'), id).toBe(await resolveToken(page, T(`code-typescale-${size}-font-size`)));
      near(await px(code, 'line-height'), await lineOf(page, T(`code-typescale-${size}-font`)), `${id} line height`, 0.01);
      expect(unquoted(await css(code, 'font-family')), id).toBe(unquoted(await css(code, T(`code-typescale-${size}-font-family`))));
      expect(await css(code, 'font-weight'), id).toBe((await css(code, T(`code-typescale-${size}-font-weight`))).trim());
      expect(await css(code, 'color'), id).toBe(await resolveColor(page, T('code-color')));
      expect(await css(host(page, id).locator('code'), 'font-size'), id).toBe(await css(code, 'font-size'));
    }
    // Every line of the code is one line of the style: seven lines, the empty one included.
    const height = await lineOf(page, T('code-typescale-medium-font'));
    await expect(lines(page, 'titled')).toHaveCount(SIZES.split('\n').length);
    for (let n = 1; n <= 7; n++) expect((await box(line(page, 'titled', n))).height, `line ${n}`).toBe(height);
    expect(await codeText(page, 'titled')).toBe(SIZES);
    // A line break at the end is no line; two are one empty line.
    await expect(lines(page, 'trailing')).toHaveCount(2);
    await expect(lines(page, 'blank-last')).toHaveCount(2);
    expect((await box(pre(page, 'trailing'))).height).toBe((await box(pre(page, 'blank-last'))).height);
    // Spaces are kept; a tab advances to the next multiple of tab-size columns.
    const spaced = await rows(lineCode(page, 'spaces', 1));
    const column = spaced[0].width / 'a    b  c'.length;
    const tabSize = Number((await css(pre(page, 'tabs'), T('code-tab-size'))).trim());
    expect(await css(pre(page, 'tabs'), 'tab-size')).toBe(String(tabSize));
    const start = (await box(lineCode(page, 'tabs', 1))).x;
    near((await rows(lineCode(page, 'tabs', 2)))[0].right - start, (tabSize + 'node scripts/build.js'.length) * column, 'one tab', 1);
    near((await rows(lineCode(page, 'tabs', 6)))[0].right - start, (tabSize * 2 + '# two tabs deep'.length) * column, 'two tabs', 1);
    // Nothing is transformed, hyphenated, translated or spell-checked.
    expect([await css(pre(page, 'plain'), 'white-space-collapse').then((v) => v || 'preserve'), await css(pre(page, 'plain'), 'text-transform'), await css(pre(page, 'plain'), 'hyphens')]).toEqual(['preserve', 'none', 'none']);
    expect([await pre(page, 'plain').getAttribute('translate'), await pre(page, 'plain').getAttribute('spellcheck')]).toEqual(['no', 'false']);
  });

  test('COD-3: the code is padded by the block padding of its size above the first line and below the last, and by the inline padding of its size before the start of the lines — or of the gutter — and after the end of the longest line', async ({ page }) => {
    await mount(page, only('plain', 'small', 'line-numbers', 'long-lines'));
    for (const [id, size] of [['plain', 'medium'], ['small', 'small'], ['line-numbers', 'medium']] as const) {
      const c = await box(container(page, id));
      const [block, inline] = [await resolveToken(page, T(`container-padding-block-${size}`)), await resolveToken(page, T(`container-padding-inline-${size}`))];
      const count = await lines(page, id).count();
      near((await box(line(page, id, 1))).y - c.y, block, `${id}: above the first line`, 0.1);
      near(c.bottom - (await box(line(page, id, count))).bottom, block, `${id}: below the last line`, 0.1);
      const starts = id === 'line-numbers' ? (await box(gutter(page, id, 1))).x + (await px(gutter(page, id, 1), 'padding-left')) : (await rows(lineCode(page, id, 1)))[0].x;
      near(starts - c.x, inline, `${id}: before the lines`, 0.1);
    }
    // After the end of the longest line: scrolled to its end, the last character stands the padding before the edge.
    await body(page, 'long-lines').evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const c = await box(container(page, 'long-lines'));
    near(c.right - (await rows(lineCode(page, 'long-lines', 1)))[0].right, await resolveToken(page, T('container-padding-inline-medium')), 'after the longest line', 0.6);
  });
});

test.describe('scrolling and wrapping', () => {
  test('COD-4: a line is never broken; a line wider than the body scrolls sideways inside the container and never the page, the padding after the longest line scrolls with it, the header and the copy button do not, and a wheel up or down over a body that cannot scroll that way scrolls the page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await mount(page, [...only('long-lines'), fx('framed', { code: LONG, title: 'footer.js', languageLabel: 'JavaScript', label: '', ...COPY }), fx('tall', { code: Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n') })]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 100vw; }' });
    for (const id of ['long-lines', 'framed']) {
      const b = body(page, id);
      // One row each: no line is broken.
      const height = await lineOf(page, T('code-typescale-medium-font'));
      for (let n = 1; n <= 4; n++) expect((await box(line(page, id, n))).height, `${id} line ${n}`).toBe(height);
      expect(await b.evaluate((el) => el.scrollWidth > el.clientWidth), id).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), id).toBe(true);
      expect((await box(host(page, id))).width, id).toBeLessThanOrEqual(320);
    }
    const before = { title: await box(host(page, 'framed').locator('.title')), copy: await box(copyButton(page, 'framed')) };
    // Scrolled to the end, by the body's own scrolling: the last character is clear of the container's edge.
    await body(page, 'framed').evaluate((el) => (el.scrollLeft = el.scrollWidth));
    expect(await body(page, 'framed').evaluate((el) => el.scrollLeft)).toBeGreaterThan(200);
    const [c, last] = [await box(container(page, 'framed')), (await rows(lineCode(page, 'framed', 1)))[0]];
    near(c.right - last.right, await resolveToken(page, T('container-padding-inline-medium')), 'the padding scrolls with the code');
    expect({ title: await box(host(page, 'framed').locator('.title')), copy: await box(copyButton(page, 'framed')) }).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollLeft)).toBe(0);
    // A wheel up or down over a body that cannot scroll that way scrolls the page; a wheel sideways, the body. (The
    // page first: a browser keeps a run of wheel movements with the box that took the first.)
    await body(page, 'long-lines').hover();
    expect(await body(page, 'long-lines').evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await body(page, 'long-lines').evaluate((el) => el.scrollLeft)).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1600);
    await body(page, 'long-lines').hover();
    await page.mouse.wheel(120, 0);
    await expect.poll(() => body(page, 'long-lines').evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('COD-5: with wrap a line that does not fit continues on following rows — broken at its spaces first, and anywhere where a part has none — each beginning at the column where the line’s code begins, with no mark and no added character; the body does not scroll sideways, and what is selected or copied holds the code’s own line breaks alone', async ({ page }) => {
    await mount(page, [...only('long-lines-wrapped', 'long-lines-wrapped-numbered-copy'), fx('terminal-wrapped', { code: 'npm install package another one more and a_very_long_name_without_any_space_in_it_at_all_that_is_wider_than_the_row_of_this_block_by_far', prompt: '$', wrap: true, lineNumbers: true })]);
    for (const id of ['long-lines-wrapped', 'long-lines-wrapped-numbered-copy', 'terminal-wrapped']) {
      const b = body(page, id);
      expect(await b.evaluate((el) => el.scrollWidth <= el.clientWidth), id).toBe(true);
      const first = await rows(lineCode(page, id, 1));
      expect(first.length, id).toBeGreaterThan(2);
      // Every following row begins where the line's code begins: after the gutter and the prompt.
      for (const row of first.slice(1)) near(row.x, first[0].x, `${id}: a following row`, 0.6);
      const edge = (await box(b)).right;
      for (const row of first) expect(row.right, id).toBeLessThanOrEqual(edge + 0.5);
      expect(await codeText(page, id), id).toBe(String(fixture('long-lines').props.code ?? '').length && id !== 'terminal-wrapped' ? LONG : await codeText(page, id));
    }
    // The gutter and the prompt are on the first row only, beside the code: one number, one prompt per line.
    const g = await box(gutter(page, 'terminal-wrapped', 1));
    const p = await box(line(page, 'terminal-wrapped', 1).locator('[data-line-prompt]'));
    const codeRows = await rows(lineCode(page, 'terminal-wrapped', 1));
    expect(g.right).toBeLessThanOrEqual(p.x + 0.5);
    expect(p.right).toBeLessThanOrEqual(codeRows[0].x + 0.5);
    near(p.y, codeRows[0].y, 'the prompt is on the first row', 3);
    // At the spaces first; anywhere in the part that has none.
    const ends = await lineCode(page, 'terminal-wrapped', 1).evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      const out: string[] = [];
      let last = -1;
      for (let i = 0; i < text.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const top = range.getBoundingClientRect().top;
        if (last >= 0 && Math.abs(top - last) > 4) out.push(text.data[i - 1]);
        last = top;
      }
      return out;
    });
    expect(ends[0]).toBe(' ');
    expect(ends.at(-1)).not.toBe(' ');
    // No hyphen and no added character: a selection of the whole code, copied, is the code.
    expect(await css(lineCode(page, 'long-lines-wrapped', 1), 'hyphens')).toBe('none');
    expect(await copied(host(page, 'long-lines-wrapped'))).toEqual({ text: LONG, taken: true });
  });

  test('COD-6: with maxLines and more lines than that, the body is maxLines lines of the code’s text style high plus its paddings and scrolls up and down inside the container, the header and the copy button staying; with no more lines than maxLines, or null, the block is as tall as its lines', async ({ page }) => {
    await mount(page, [...only('max-lines'), fx('enough', { code: SIZES, maxLines: 7 }), fx('none', { code: SIZES }), fx('capped', { code: SIZES, maxLines: 3 })]);
    const height = await lineOf(page, T('code-typescale-medium-font'));
    const block = await resolveToken(page, T('container-padding-block-medium'));
    const b = body(page, 'max-lines');
    near((await box(b)).height, 5 * height + (await resolveToken(page, T('header-padding-block-end'))) + block, 'five lines and the paddings', 0.1);
    expect(await b.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    near((await box(body(page, 'capped'))).height, 3 * height + 2 * block, 'three lines and the paddings', 0.1);
    const before = { title: await box(host(page, 'max-lines').locator('.title')), copy: await box(copyButton(page, 'max-lines')) };
    await b.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await b.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    expect({ title: await box(host(page, 'max-lines').locator('.title')), copy: await box(copyButton(page, 'max-lines')) }).toEqual(before);
    // The last line can be brought into view.
    expect((await box(line(page, 'max-lines', 12))).bottom).toBeLessThanOrEqual((await box(b)).bottom + 0.5);
    // As tall as its lines.
    for (const id of ['enough', 'none']) {
      near((await box(body(page, id))).height, 7 * height + 2 * block, id, 0.1);
      expect(await body(page, id).evaluate((el) => el.scrollHeight <= el.clientHeight), id).toBe(true);
    }
  });

  test('COD-7: a body that can scroll is one stop in the focus order after the copy button, scrolls by the arrow keys, and shows the keyboard focus indicator inside the container’s edge with its corners — a ring, or the glow a system chooses — never for a pointer; a body that cannot scroll is not a stop', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    const fixtures = [fx('fits', { code: 'npm test', ...COPY }), fx('wide', { code: LONG, ...COPY }), fx('capped', { code: Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n'), maxLines: 4 })];
    await mount(page, fixtures);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 100vw; }' });
    expect(await body(page, 'fits').getAttribute('tabindex')).toBeNull();
    await expect.poll(() => body(page, 'wide').getAttribute('tabindex')).toBe('0');
    expect(await body(page, 'capped').getAttribute('tabindex')).toBe('0');
    // The order: the fitting block's copy button, the wide block's copy button, its body, the capped block's body.
    const focused = () =>
      page.evaluate(() => {
        const block = document.activeElement?.closest('tanrei-code-block');
        const inner = block?.shadowRoot?.activeElement;
        return block ? `${block.closest('[data-fixture]')!.getAttribute('data-fixture')}:${inner?.localName === 'tanrei-copy-button' ? 'copy' : inner?.classList.contains('body') ? 'body' : inner?.localName}` : null;
      });
    await tabTo(page, copyButton(page, 'fits'));
    const order = [await focused()];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await focused());
    }
    expect(order).toEqual(['fits:copy', 'wide:copy', 'wide:body', 'capped:body']);
    // The focus indicator: on a box that does not scroll, inside the container's edge, with the container's corners.
    const ring = host(page, 'capped').locator('.focus');
    expect(await css(ring, 'outline-style')).toBe('solid');
    expect(await css(ring, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(ring, 'outline-offset')).toBe(-(await resolveToken(page, '--tanrei-sys-focus-outer-width')));
    expect(await box(ring)).toEqual(await box(container(page, 'capped')));
    expect(await px(ring, 'border-top-left-radius')).toBe(await px(container(page, 'capped'), 'border-top-left-radius'));
    expect(await ring.evaluate((el) => el.getAnimations().length)).toBe(0);
    // The arrow keys scroll the focused body, as the browser scrolls any region.
    // (WebKit takes the first arrow key after focus arrives for itself, in any scrolling box: a key is pressed until it scrolls.)
    await expect
      .poll(async () => {
        await page.keyboard.press('ArrowDown');
        return body(page, 'capped').evaluate((el) => el.scrollTop);
      })
      .toBeGreaterThan(0);
    // End is pressed on a body at rest, as a person presses it: the arrow key scrolls over some frames, and Chromium
    // drops a key that arrives between the last of them and that scroll's end — the body would never reach its end.
    await atRest(body(page, 'capped'));
    await page.keyboard.press('End');
    await expect.poll(() => body(page, 'capped').evaluate((el) => Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight)).toBe(true);
    await tab(page, { back: true });
    expect(await focused()).toBe('wide:body');
    await expect
      .poll(async () => {
        await page.keyboard.press('ArrowRight');
        return body(page, 'wide').evaluate((el) => el.scrollLeft);
      })
      .toBeGreaterThan(0);
    // A pointer's focus shows no indicator.
    await body(page, 'capped').click();
    expect(await css(host(page, 'capped').locator('.focus'), 'outline-style')).toBe('none');
  });

  test('COD-7: under a system that chooses the glow the body’s keyboard focus is the glow, inside the container’s edge — and where style queries are missing the element says so when focus arrives', async ({ page }) => {
    await mount(page, [fx('capped', { code: Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n'), maxLines: 4 })], { system: 'acme', systemCss: await acmeSystemCss() });
    expect((await css(host(page, 'capped'), '--tanrei-sys-behavior-focus-style')).trim()).toBe('glow');
    await tabTo(page, body(page, 'capped'));
    expect(await body(page, 'capped').getAttribute('data-focus-style')).toBe('glow');
    expect(await css(host(page, 'capped').locator('.focus'), 'box-shadow', '::after')).not.toBe('none');
    expect(await css(host(page, 'capped').locator('.focus'), 'outline-color')).toMatch(/, 0\)$|transparent/);
  });
});

test.describe('the header and the copy button', () => {
  test('COD-8: with a title or a language label the header is the top of the same container, with no fill and no line: the title at the start in its text style, one line, cut at the end of its own direction; the language label at the end before the copy button, never cut; the row begins copy-button.inset from the top and is as tall as the copy button, or as one line of the title; the code begins header.padding-block-end below it', async ({ page }) => {
    await mount(page, only('titled', 'titled-language-copy', 'language-only', 'plain', 'rtl-ltr-title', 'auto-html'));
    // language itself is not drawn: a block that has one, and neither a title nor a language label, has no header.
    await expect(header(page, 'auto-html')).toHaveCount(0);
    await expect(header(page, 'plain')).toHaveCount(0);
    const inset = await resolveToken(page, T('copy-button-inset'));
    const inline = await resolveToken(page, T('container-padding-inline-medium'));
    const gap = await resolveToken(page, T('header-gap'));
    for (const id of ['titled', 'titled-language-copy', 'language-only']) {
      const [c, h] = [await box(container(page, id)), await box(header(page, id))];
      expect([await css(header(page, id), 'background-color'), await css(header(page, id), 'border-bottom-width'), await css(header(page, id), 'box-shadow')], id).toEqual(['rgba(0, 0, 0, 0)', '0px', 'none']);
      // The row: from the inset, as tall as the copy button where there is one and as a line of the title otherwise.
      const row = { top: h.y - c.y + (await px(header(page, id), 'padding-top')), height: h.height - (await px(header(page, id), 'padding-top')) };
      near(row.top, inset, `${id}: the row begins at the inset`, 0.1);
      near(row.height, id === 'titled-language-copy' ? await resolveToken(page, BUTTON) : await lineOf(page, T('title-typescale-font')), `${id}: the row's height`, 0.1);
      // The code begins header.padding-block-end below the row.
      near((await box(line(page, id, 1))).y - h.bottom, await resolveToken(page, T('header-padding-block-end')), `${id}: below the row`, 0.1);
    }
    // The title: at the start, at the inline padding, in its text style and color.
    const title = host(page, 'titled-language-copy').locator('.title');
    const language = host(page, 'titled-language-copy').locator('.language');
    const c = await box(container(page, 'titled-language-copy'));
    near((await box(title)).x - c.x, inline, 'the title begins at the inline padding', 0.1);
    expect(await px(title, 'font-size')).toBe(await resolveToken(page, T('title-typescale-font-size')));
    expect(await css(title, 'color')).toBe(await resolveColor(page, T('title-color')));
    expect(await px(language, 'font-size')).toBe(await resolveToken(page, T('language-typescale-font-size')));
    expect(await css(language, 'color')).toBe(await resolveColor(page, T('language-color')));
    await expect(title).toHaveText('sizes.js');
    await expect(language).toHaveText('JavaScript');
    // The language at the end, header.gap before the copy button; all centred on the row.
    const [l, b] = [await box(language), await box(copyButton(page, 'titled-language-copy'))];
    near(b.x - l.right, gap, 'the gap', 0.1);
    near(c.right - b.right, inset, 'the copy button’s inset', 0.1);
    near(l.y + l.height / 2, b.y + b.height / 2, 'centred', 0.6);
    near(c.right - (await box(host(page, 'language-only').locator('.language'))).right, inline, 'the language alone ends at the padding', 0.1);
    // A title that does not fit: one line, cut with an ellipsis at the end of its own direction (left to right here,
    // in a right-to-left layout), the language and the copy button whole.
    const long = host(page, 'rtl-ltr-title').locator('.title');
    expect(await long.evaluate((el) => [el.scrollWidth > el.clientWidth, getComputedStyle(el).textOverflow, getComputedStyle(el).whiteSpace, getComputedStyle(el).direction, el.getAttribute('dir')])).toEqual([true, 'ellipsis', 'nowrap', 'ltr', 'auto']);
    near((await box(long)).height, await lineOf(page, T('title-typescale-font')), 'one line', 0.1);
    expect(await host(page, 'rtl-ltr-title').evaluate((el) => (el as unknown as { title: string }).title)).toBe(String(fixture('rtl-ltr-title').props.title));
    expect((await box(copyButton(page, 'rtl-ltr-title'))).width).toBe(await resolveToken(page, BUTTON));
    // The attribute is taken and removed, so the browser draws no tooltip of its own over the block.
    expect(await host(page, 'titled').getAttribute('title')).toBeNull();
  });

  test('COD-9: with copy the block places a Copy button — icon-only, the text variant, the small size, named by copyLabel, with the two announcements — copy-button.inset from the top and the end edge, in the header or over the top end corner; it is drawn whenever the block is, comes before the body in the focus and reading order, keeps its place in every form, and the container is at least as tall as the button and twice the inset', async ({ page }) => {
    await mount(page, only('copy', 'titled-language-copy', 'one-line-copy', 'plain'));
    await double(page);
    await expect(copyButton(page, 'plain')).toHaveCount(0);
    const inset = await resolveToken(page, T('copy-button-inset'));
    const size = await resolveToken(page, BUTTON);
    for (const id of ['copy', 'titled-language-copy', 'one-line-copy']) {
      const button = copyButton(page, id);
      expect(await button.evaluate((el) => { const b = el as unknown as Record<string, unknown>; return [b.variant, b.size, b.iconOnly, b.label, b.copiedLabel, b.failedLabel]; }), id).toEqual(['text', 'small', true, 'Copy', 'Copied', 'Could not copy']);
      const [c, b] = [await box(container(page, id)), await box(button)];
      expect([b.width, b.height], id).toEqual([size, size]);
      near(b.y - c.y, inset, `${id}: from the top edge`, 0.1);
      near(c.right - b.right, inset, `${id}: from the end edge`, 0.1);
      // Drawn whenever the block is: with no pointer over it and no focus in it.
      await page.mouse.move(0, 0);
      expect([await css(button, 'opacity'), await css(button, 'visibility'), (await css(button, 'display')) !== 'none'], id).toEqual(['1', 'visible', true]);
      await expect(stage(page, id).getByRole('button', { name: 'Copy', exact: true }), id).toHaveCount(1);
      // Before the body, in the order of the document.
      expect(await host(page, id).evaluate((el) => !!(el.shadowRoot!.querySelector('tanrei-copy-button')!.compareDocumentPosition(el.shadowRoot!.querySelector('.body')!) & Node.DOCUMENT_POSITION_FOLLOWING)), id).toBe(true);
      // Its place and size in every form.
      await button.locator('button').click();
      await expect.poll(() => button.evaluate((el) => el.shadowRoot!.querySelector('.ink')!.textContent), id).toBe('check');
      expect(await box(button), id).toEqual(b);
      expect((await box(container(page, id))).height, id).toBeGreaterThanOrEqual(size + 2 * inset);
    }
    // A block of one line is exactly the button and twice the inset in the default system; with smaller paddings it
    // is still that tall.
    expect((await box(container(page, 'one-line-copy'))).height).toBe(size + 2 * inset);
    await override(page, { [T('container-padding-block-medium')]: '2px' });
    expect((await box(container(page, 'one-line-copy'))).height).toBe(size + 2 * inset);
  });

  test('COD-10: without a header the copy button never covers code that cannot be moved clear of it — not wrapped, the padding after the longest line is widened by the button and its inset; wrapped, every row ends before the button’s column — and it stands on a patch of the container’s own color where code can pass under it', async ({ page }) => {
    await mount(page, [...only('long-lines-copy', 'long-lines-wrapped-numbered-copy', 'long-lines'), fx('outlined-copy', { code: LONG, variant: 'outlined', ...COPY })]);
    const [size, inset, inline] = [await resolveToken(page, BUTTON), await resolveToken(page, T('copy-button-inset')), await resolveToken(page, T('container-padding-inline-medium'))];
    // The widened padding: what scrolls is wider by the button and its inset than without the button.
    const width = (id: string) => body(page, id).evaluate((el) => el.scrollWidth);
    expect((await width('long-lines-copy')) - (await width('long-lines'))).toBeCloseTo(size + inset, 0);
    await body(page, 'long-lines-copy').evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const button = await box(copyButton(page, 'long-lines-copy'));
    const end = (await rows(lineCode(page, 'long-lines-copy', 1)))[0].right;
    expect(end).toBeLessThanOrEqual(button.x + 0.5);
    near(button.x - end, inline, 'the line’s end stands its padding before the button');
    // Wrapped: every row of every line ends before the button's column.
    const column = (await box(copyButton(page, 'long-lines-wrapped-numbered-copy'))).x;
    for (let n = 1; n <= 4; n++) for (const row of await rows(lineCode(page, 'long-lines-wrapped-numbered-copy', n))) expect(row.right, `line ${n}`).toBeLessThanOrEqual(column + 0.5);
    // The patch: the container's own color — the ground, for an outlined block — over whole lines, no taller than the block.
    const patch = host(page, 'long-lines-copy').locator('.corner');
    expect(await css(patch, 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    const p = await box(patch);
    const c = await box(container(page, 'long-lines-copy'));
    expect([p.y, p.right]).toEqual([c.y, c.right]);
    expect(p.x).toBeLessThanOrEqual(button.x);
    const [lineHeight, block] = [await lineOf(page, T('code-typescale-medium-font')), await resolveToken(page, T('container-padding-block-medium'))];
    expect((p.height - block) % lineHeight).toBeCloseTo(0, 1);
    expect(p.height).toBeGreaterThanOrEqual(size + inset);
    expect(await css(host(page, 'outlined-copy').locator('.corner'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    await override(page, { '--tanrei-code-block-ground': 'rgb(1, 2, 3)' });
    expect(await css(host(page, 'outlined-copy').locator('.corner'), 'background-color')).toBe('rgb(1, 2, 3)');
    // Wrapped, no code passes under it: no patch.
    expect(await css(host(page, 'long-lines-wrapped-numbered-copy').locator('.corner'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
  });

  test('COD-11: the copy button copies the code as plain text — its lines in order, joined by line breaks, without line numbers, prompts, signs or labels, without the removed lines, with no break that wrapping added — and the block emits copied with the text, or copyfailed, when its copy button does', async ({ page }) => {
    await mount(page, [...only('diff', 'terminal', 'long-lines-wrapped-numbered-copy', 'syntax-marked'), fx('trailing', { code: 'a\nb\n', ...COPY })]);
    await double(page);
    await page.evaluate(() => {
      const w = window as unknown as { __events: { id: string; type: string; detail: unknown; target: string }[] };
      w.__events = [];
      for (const type of ['copied', 'copyfailed']) document.addEventListener(type, (event) => w.__events.push({ id: (event.target as Element).closest('[data-fixture]')!.getAttribute('data-fixture')!, type, detail: (event as CustomEvent).detail, target: (event.target as Element).localName }));
    });
    const press = (id: string) => copyButton(page, id).locator('button').click();
    const diff = SIZES.split('\n');
    const shown = String(fixture('diff').props.code).split('\n');
    const expected: Record<string, string> = {
      diff: shown.filter((_, index) => index !== 3).join('\n'),
      terminal: 'npm install @tanrei/web\nnpx tanrei studio',
      'long-lines-wrapped-numbered-copy': LONG,
      trailing: 'a\nb',
    };
    expect(shown.length).toBe(diff.length + 1);
    for (const [id, text] of Object.entries(expected)) {
      await press(id);
      await expect.poll(async () => (await writes(page)).at(-1), id).toBe(text);
    }
    // The removed line is drawn, and is not in what was copied.
    await expect(line(page, 'diff', 4)).toHaveAttribute('data-removed', '');
    expect(expected.diff).not.toContain("createElement('button')");
    expect(expected.diff).toContain("createElement('tanrei-button')");
    // Runs are no part of the text: the code with runs copies as its characters.
    await press('syntax-marked');
    await expect.poll(async () => (await writes(page)).at(-1)).toContain("import { Button } from '@tanrei/react';\n\nexport function Footer(");
    // The block's own events, once each, from the block.
    const seen = await page.evaluate(() => (window as unknown as { __events: { id: string; type: string; detail: { text?: string }; target: string }[] }).__events);
    expect(seen.map((e) => [e.id, e.type, e.target])).toEqual([...Object.keys(expected), 'syntax-marked'].map((id) => [id, 'copied', TAG]));
    expect(seen[0].detail).toEqual({ text: expected.diff });
    await double(page, true);
    await press('terminal');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __events: { type: string; target: string }[] }).__events.at(-1))).toMatchObject({ type: 'copyfailed', target: TAG });
  });

  test('COD-12: a selection in the body selects characters of the code alone — line numbers, prompts, signs, bars and the marks’ labels are not selectable and are no part of a copied selection, which holds the selected characters, removed lines included, with the code’s own line breaks', async ({ page }) => {
    await mount(page, [...only('diff', 'terminal'), fx('marked', { code: 'one\ntwo\nthree', lineNumbers: true, prompt: '>', highlightedLines: '2', highlightedLabel: 'Highlighted', removedLines: '3', removedLabel: 'Removed' })]);
    // Everything beside the code is drawn, not text, or is kept out of a selection.
    for (const part of ['[data-line-gutter]', '[data-line-prompt]', '[data-line-label]']) {
      const each = host(page, 'marked').locator(part).first();
      expect(await each.evaluate((el) => getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect), part).toBe('none');
    }
    expect(await host(page, 'marked').locator('[data-line-gutter]').first().evaluate((el) => el.textContent)).toBe('');
    expect(await host(page, 'marked').locator('[data-line-prompt]').first().evaluate((el) => el.textContent)).toBe('');
    // The whole code: its characters with its own line breaks — the removed line too, and no number, sign, prompt or label.
    expect(await copied(host(page, 'marked'))).toEqual({ text: 'one\ntwo\nthree', taken: true });
    expect(await copied(host(page, 'diff'))).toEqual({ text: String(fixture('diff').props.code), taken: true });
    expect(await copied(host(page, 'terminal'))).toEqual({ text: 'npm install @tanrei/web\nnpx tanrei studio', taken: true });
    // A part of it: from the middle of one line to the middle of another.
    expect(await copied(host(page, 'marked'), [1, 1, 3, 2])).toEqual({ text: 'ne\ntwo\nth', taken: true });
    // What the browser itself selects holds no number, prompt or sign either.
    const selected = await host(page, 'marked').evaluate((el) => { getSelection()!.selectAllChildren(el.querySelector('code')!); return getSelection()!.toString(); });
    expect(selected).not.toMatch(/[123>−+]/);
    expect(selected.replace(/\s+/g, ' ').trim()).toContain('one');
    // A selection that is not inside this block's code is the browser's to copy.
    expect(await page.evaluate(() => {
      getSelection()!.selectAllChildren(document.body);
      const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
      document.querySelector('tanrei-code-block code')!.dispatchEvent(event);
      return event.defaultPrevented;
    })).toBe(false);
  });
});

test.describe('lines', () => {
  test('COD-13: lineNumbers draws before each line its number, counting from startLine, in the code’s text style with digits of one width, in line-number.color, right-aligned in a column as wide as the widest number, on the first row of a wrapped line only; the gutter stands line-number.gap from the code, stays in view on the container’s color while the code scrolls under it, and is kept from assistive technology', async ({ page }) => {
    await mount(page, [...only('line-numbers', 'line-numbers-start', 'long-lines-wrapped-numbered-copy'), fx('scrolls', { code: LONG, lineNumbers: true }), fx('outlined', { code: LONG, lineNumbers: true, variant: 'outlined' })]);
    const numbers = (id: string) => host(page, id).evaluate((el) => [...el.querySelectorAll('[data-line-gutter]')].map((g) => g.getAttribute('data-number')!.trim()));
    expect(await numbers('line-numbers')).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(await numbers('line-numbers-start')).toEqual(['96', '97', '98', '99', '100', '101', '102']);
    // Drawn, not text: generated content, in the code's text style, with tabular digits, in line-number.color.
    const g = gutter(page, 'line-numbers-start', 1);
    expect(await css(g, 'content', '::before')).toMatch(/^attr\(data-number\)|^" 96"/);
    expect([await g.textContent(), await g.getAttribute('aria-hidden')]).toEqual(['', 'true']);
    expect(await css(g, 'color')).toBe(await resolveColor(page, T('line-number-color')));
    expect(await css(g, 'font-variant-numeric')).toBe('tabular-nums');
    expect([await css(g, 'font-size'), await css(g, 'font-family')]).toEqual([await css(pre(page, 'line-numbers-start'), 'font-size'), await css(pre(page, 'line-numbers-start'), 'font-family')]);
    // A column as wide as the widest number: every gutter box is the same width — three digits wide, where one digit
    // would be narrower — and the code of every line begins at the same place, line-number.gap after it.
    const widths = await host(page, 'line-numbers-start').evaluate((el) => [...el.querySelectorAll('[data-line-gutter]')].map((each) => each.getBoundingClientRect().width));
    expect(new Set(widths.map((w) => Math.round(w * 10))).size).toBe(1);
    const digit = (widths[0] - (await px(g, 'padding-left')) - (await px(g, 'padding-right'))) / 3;
    near((await box(gutter(page, 'line-numbers', 1))).width, widths[0] - 2 * digit, 'one digit is two digits narrower than three', 0.6);
    expect(await px(g, 'padding-right')).toBe(await resolveToken(page, T('line-number-gap')));
    for (const n of [1, 5]) near((await rows(lineCode(page, 'line-numbers-start', n)))[0].x, (await box(gutter(page, 'line-numbers-start', n))).right, `line ${n}: the code begins after the gutter`, 0.6);
    // A wrapped line carries its number once, on its first row.
    const wrapped = await box(gutter(page, 'long-lines-wrapped-numbered-copy', 1));
    expect(wrapped.height).toBeGreaterThan(3 * (await lineOf(page, T('code-typescale-medium-font'))));
    await expect(line(page, 'long-lines-wrapped-numbered-copy', 1).locator('[data-line-gutter]')).toHaveCount(1);
    // It stays in view while the code scrolls sideways under it, on the container's color.
    for (const [id, ground] of [['scrolls', T('filled-container-color')], ['outlined', '--tanrei-sys-color-surface']] as const) {
      const before = await box(gutter(page, id, 1));
      const first = (await rows(lineCode(page, id, 1)))[0].x;
      await body(page, id).evaluate((el) => (el.scrollLeft = 200));
      expect(await box(gutter(page, id, 1)), id).toEqual(before);
      near((await rows(lineCode(page, id, 1)))[0].x, first - 200, `${id}: the code scrolled`, 0.6);
      expect(await css(gutter(page, id, 1), 'background-color'), id).toBe(await resolveColor(page, ground));
      expect(await css(gutter(page, id, 1), 'position'), id).toBe('sticky');
    }
    // Kept from assistive technology: no number is read.
    expect(await stage(page, 'line-numbers-start').ariaSnapshot()).not.toMatch(/\b9[6-9]\b|\b10[0-2]\b/);
  });

  test('COD-14: highlightedLines, addedLines and removedLines are numbers and ranges separated by commas, counted as the numbers are whether or not they are drawn; a number outside the code and an entry that cannot be read are ignored and reported; a line both added and removed is drawn removed and reported; a line highlighted and added or removed is drawn as both', async ({ page }) => {
    const seen = warnings(page);
    const labels = { highlightedLabel: 'Highlighted', addedLabel: 'Added', removedLabel: 'Removed' };
    await mount(page, [
      ...only('highlighted-lines'),
      fx('from-96', { code: SIZES, startLine: 96, highlightedLines: '98, 100-101', ...labels }),
      fx('odd', { code: SIZES, highlightedLines: ' 2 ,x, 5-3, 6 - 7, 40, 0, 7-9,,', ...labels }),
      fx('both', { code: SIZES, addedLines: '2-4', removedLines: '3', highlightedLines: '3-4', ...labels }),
    ]);
    const marked = (id: string, mark: string) => host(page, id).evaluate((el, m) => [...el.querySelectorAll('[data-line]')].flatMap((each, index) => (each.hasAttribute(`data-${m}`) ? [index + 1] : [])), mark);
    expect(await marked('highlighted-lines', 'highlighted')).toEqual([1, 4, 5]);
    // Counted from startLine, though no number is drawn.
    expect(await marked('from-96', 'highlighted')).toEqual([3, 5, 6]);
    await expect(host(page, 'from-96').locator('[data-number]')).toHaveCount(0);
    // What can be read is drawn; the rest is ignored, and said.
    expect(await marked('odd', 'highlighted')).toEqual([2, 6, 7]);
    const about = (text: string) => seen.filter((w) => w.includes('COD-14') && w.includes(text));
    expect(about('"x"')).toHaveLength(1);
    expect(about('"5-3"')).toHaveLength(1);
    expect(about('names 40')).toHaveLength(1);
    expect(about('names 0')).toHaveLength(1);
    expect(about('names 7-9')).toHaveLength(1);
    // Added and removed: removed. Highlighted and added, or removed: both.
    expect([await marked('both', 'added'), await marked('both', 'removed'), await marked('both', 'highlighted')]).toEqual([[2, 4], [3], [3, 4]]);
    expect(about('line 3 is named by addedLines and by removedLines')).toHaveLength(1);
    expect(await gutter(page, 'both', 3).getAttribute('data-sign')).toBe('−');
    expect(await gutter(page, 'both', 4).getAttribute('data-sign')).toBe('+');
    await expect(line(page, 'both', 4).locator('[data-line-label]')).toHaveText('Highlighted, Added, ');
    await expect(line(page, 'both', 3).locator('[data-line-label]')).toHaveText('Highlighted, Removed, ');
  });

  test('COD-15: a highlighted line has a band of line.highlighted.container.color behind all of its rows from the container’s left edge to its right, a bar line.mark.width wide in line.highlighted.mark.color at the left edge as tall as the line, and highlightedLabel exposed before its text and not drawn; its code keeps its colors', async ({ page }) => {
    await mount(page, only('highlighted-lines', 'highlighted-outlined', 'long-lines-wrapped-numbered-copy', 'syntax-marked'));
    const band = await resolveColor(page, T('line-highlighted-container-color'));
    const mark = await resolveColor(page, T('line-highlighted-mark-color'));
    const width = await resolveToken(page, T('line-mark-width'));
    for (const [id, n] of [['highlighted-lines', 4], ['highlighted-outlined', 3], ['long-lines-wrapped-numbered-copy', 1]] as const) {
      const [l, c, g] = [await box(line(page, id, n)), await box(container(page, id)), gutter(page, id, n)];
      expect(await css(line(page, id, n), 'background-color'), id).toBe(band);
      // From the container's left edge to its right — and on, with a line that is longer than the body.
      expect(l.x, id).toBe(c.x);
      expect(l.right, id).toBeGreaterThanOrEqual(c.right);
      // The bar: the gutter's own paint, at the block's left edge, the mark's width, the line's height.
      expect((await box(g)).x, id).toBe(c.x);
      expect((await box(g)).height, id).toBe(l.height);
      const paint = await css(g, 'background-image');
      expect(paint.replaceAll(/\s+/g, ' '), id).toContain(`linear-gradient(${mark}, ${mark})`);
      expect((await css(g, 'background-size')).split(',')[0], id).toBe(`${width}px 100%`);
      expect((await css(g, 'background-repeat')).split(',')[0], id).toBe('no-repeat');
      expect(await css(g, 'background-color'), id).toBe(band);
    }
    // An unmarked line has neither.
    expect([await css(line(page, 'highlighted-lines', 2), 'background-color'), await css(gutter(page, 'highlighted-lines', 2), 'background-image')]).toEqual(['rgba(0, 0, 0, 0)', 'none']);
    // The label: before the line's text in what assistive technology reads, and not drawn.
    const label = line(page, 'highlighted-lines', 4).locator('[data-line-label]');
    expect(await label.evaluate((el) => [el.textContent, el.nextElementSibling?.hasAttribute('data-line-code'), getComputedStyle(el).position, getComputedStyle(el).clipPath, el.getBoundingClientRect().width])).toEqual(['Highlighted, ', true, 'absolute', 'inset(50%)', 1]);
    const snapshot = await stage(page, 'highlighted-lines').ariaSnapshot();
    expect(snapshot.replaceAll(/\s+/g, ' ')).toMatch(/Highlighted, const button = document\.createElement/);
    await expect(line(page, 'highlighted-lines', 2).locator('[data-line-label]')).toHaveCount(0);
    // The code keeps its colors: a keyword on a highlighted line is the keyword it is elsewhere.
    const keyword = (n: number) => line(page, 'syntax-marked', n).locator('[data-syntax="keyword"]').first();
    await expect(line(page, 'syntax-marked', 5)).toHaveAttribute('data-highlighted', '');
    expect([await css(keyword(5), 'color'), await css(keyword(5), 'font-weight')]).toEqual([await css(keyword(4), 'color'), await css(keyword(4), 'font-weight')]);
  });

  test('COD-16: an added or a removed line has a bar at the container’s left edge and, in the gutter after the numbers, a plus or a minus — both in its mark color — and its label exposed before its text; a band of its kind behind it from edge to edge; it keeps its colors and is not struck through: the sign and the label say what it is', async ({ page }) => {
    await mount(page, only('diff', 'diff-without-numbers'));
    const width = await resolveToken(page, T('line-mark-width'));
    for (const [id, removed, added] of [['diff', 4, 5], ['diff-without-numbers', 1, 2]] as const) {
      for (const [n, kind, sign, words] of [[removed, 'removed', '−', 'Removed'], [added, 'added', '+', 'Added']] as const) {
        const color = await resolveColor(page, T(`line-${kind}-mark-color`));
        const g = gutter(page, id, n);
        expect(await g.getAttribute('data-sign'), `${id} ${kind}`).toBe(sign);
        expect(await css(g, 'color', '::after'), `${id} ${kind}`).toBe(color);
        expect((await css(g, 'background-image')).replaceAll(/\s+/g, ' '), `${id} ${kind}`).toContain(`linear-gradient(${color}, ${color})`);
        expect((await css(g, 'background-size')).split(',')[0], `${id} ${kind}`).toBe(`${width}px 100%`);
        expect((await box(g)).x, `${id} ${kind}`).toBe((await box(container(page, id))).x);
        // The band of its kind, behind the gutter too; no strike, the code's own color.
        const band = await resolveColor(page, T(`line-${kind}-container-color`));
        expect([await css(line(page, id, n), 'background-color'), await css(lineCode(page, id, n), 'text-decoration-line'), await css(lineCode(page, id, n), 'color')], `${id} ${kind}`).toEqual([band, 'none', await resolveColor(page, T('code-color'))]);
        expect(await css(g, 'background-color'), `${id} ${kind}`).toBe(band);
        const [l, c] = [await box(line(page, id, n)), await box(container(page, id))];
        expect([l.x, l.right >= c.right], `${id} ${kind}: from the container's left edge to its right`).toEqual([c.x, true]);
        await expect(line(page, id, n).locator('[data-line-label]'), `${id} ${kind}`).toHaveText(`${words}, `);
      }
      // The sign is drawn, not text, and stands after the number; an unmarked line keeps the column.
      expect(await gutter(page, id, removed).textContent()).toBe('');
      expect(await gutter(page, id, 3).getAttribute('data-sign')).toBe(' ');
      expect((await box(gutter(page, id, 3))).width).toBe((await box(gutter(page, id, removed))).width);
    }
    expect(await gutter(page, 'diff', 4).evaluate((el) => [getComputedStyle(el, '::before').content !== 'none', getComputedStyle(el, '::after').marginLeft !== '0px'])).toEqual([true, true]);
    // Not the color alone: the words are read before the line.
    const snapshot = (await stage(page, 'diff').ariaSnapshot()).replaceAll(/\s+/g, ' ');
    expect(snapshot).toMatch(/Removed, const button = document\.createElement\('button'\)/);
    expect(snapshot).toMatch(/Added, const button = document\.createElement\('tanrei-button'\)/);
    expect(snapshot).not.toMatch(/[−+] const/);
  });

  test('COD-17: prompt draws the prompt and one space before the first row of every line that is not empty, in prompt.color, after the gutter; it is kept from assistive technology and is not code', async ({ page }) => {
    await mount(page, [...only('terminal', 'terminal-one-line'), fx('gaps', { code: 'npm ci\n\nnpm test', prompt: '>>', lineNumbers: true })]);
    for (const [id, count] of [['terminal', 2], ['terminal-one-line', 1], ['gaps', 2]] as const) await expect(host(page, id).locator('[data-line-prompt]'), id).toHaveCount(count);
    // Not before an empty line.
    await expect(line(page, 'gaps', 2).locator('[data-line-prompt]')).toHaveCount(0);
    const prompt = line(page, 'terminal', 1).locator('[data-line-prompt]');
    expect(await css(prompt, 'color')).toBe(await resolveColor(page, T('prompt-color')));
    expect([await prompt.textContent(), await prompt.getAttribute('aria-hidden'), await prompt.getAttribute('data-prompt')]).toEqual(['', 'true', '$']);
    // The prompt and one space of the code's text style: two characters wide for "$", three for ">>".
    const column = (await rows(lineCode(page, 'terminal', 1)))[0].width / 'npm install @tanrei/web'.length;
    near((await box(prompt)).width, 2 * column, 'the prompt and a space', 0.6);
    near((await box(line(page, 'gaps', 1).locator('[data-line-prompt]'))).width, 3 * column, 'a longer prompt and a space', 0.6);
    near((await rows(lineCode(page, 'terminal', 1)))[0].x, (await box(prompt)).right, 'the code follows it', 0.6);
    // After the gutter.
    expect((await box(line(page, 'gaps', 1).locator('[data-line-prompt]'))).x).toBeCloseTo((await box(gutter(page, 'gaps', 1))).right, 0);
    // Not read, and not code.
    expect(await stage(page, 'terminal').ariaSnapshot()).not.toContain('$');
    expect(await codeText(page, 'terminal')).toBe('npm install @tanrei/web\nnpx tanrei studio');
  });
});

test.describe('syntax', () => {
  test('COD-18: each run is drawn in the color of its syntax role and with the code’s weight plus the emphasis of its role — whether the block’s highlighter found it or the product gave it — in the light and the dark scheme; a role changes color and weight alone: auto-tsx, highlighted, has the same box for every line as the same code with highlight false; and a role a design system added to the axis is drawn from its two tokens', async ({ page }) => {
    const seen = warnings(page);
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, only('auto-tsx', 'auto-off', 'syntax', 'syntax-small'), { theme });
      await colors(page, 'auto-tsx');
      const code = await resolveColor(page, T('code-color'));
      const weight = Number((await css(pre(page, 'syntax'), T('code-typescale-medium-font-weight'))).trim());
      // The runs the product gave (syntax) and the runs the block's highlighter found (auto-tsx), by the same rules.
      for (const id of ['syntax', 'auto-tsx']) {
        for (const role of ROLES) {
          const run = host(page, id).locator(`[data-syntax="${role}"]`).first();
          const emphasis = Number((await css(pre(page, id), T(`syntax-emphasis-${role}`))).trim());
          expect(await css(run, 'color'), `${theme} ${id} ${role}`).toBe(await resolveColor(page, T(`syntax-color-${role}`)));
          expect(Number(await css(run, 'font-weight')), `${theme} ${id} ${role}`).toBe(weight + emphasis);
          // Nothing else: the size, the family, the spacing, the slant, the decoration and the background are the code's.
          for (const property of ['font-size', 'font-family', 'letter-spacing', 'font-style', 'text-decoration-line', 'background-color']) expect(await css(run, property), `${id} ${role} ${property}`).toBe(await css(lineCode(page, id, 1), property));
        }
      }
      // The keyword is told by weight as well as by color; plain text between runs is the code's color.
      expect(Number((await css(pre(page, 'syntax'), T('syntax-emphasis-keyword'))).trim())).toBeGreaterThan(0);
      expect(await css(lineCode(page, 'syntax', 2), 'color')).toBe(code);
      // No role borrows a status color or the focus ring's: syntax has hues of its own, beside the text's.
      for (const role of ROLES) for (const other of ['error', 'success', 'warning', 'info', 'focus-ring']) expect(await resolveColor(page, T(`syntax-color-${role}`)), `${theme} ${role} is not ${other}`).not.toBe(await resolveColor(page, `--tanrei-sys-color-${other}`));
    }
    // A token a system re-points is followed: a role is its token.
    await override(page, { [T('syntax-color-string')]: 'rgb(1, 2, 3)' });
    expect(await css(host(page, 'syntax').locator('[data-syntax="string"]').first(), 'color')).toBe('rgb(1, 2, 3)');
    expect(await css(host(page, 'auto-tsx').locator('[data-syntax="string"]').first(), 'color')).toBe('rgb(1, 2, 3)');
    // The same lines, columns and size as the same code drawn plain (COD-18's verify).
    expect(await codeText(page, 'auto-tsx')).toBe(await codeText(page, 'auto-off'));
    await expect(host(page, 'auto-off').locator('[data-syntax]')).toHaveCount(0);
    const count = await lines(page, 'auto-tsx').count();
    expect(await lines(page, 'auto-off').count()).toBe(count);
    // (auto-tsx has a header and auto-off has none: the lines are compared from the first line of each.)
    const [first, firstPlain] = [await box(lineCode(page, 'auto-tsx', 1)), await box(lineCode(page, 'auto-off', 1))];
    for (let n = 1; n <= count; n++) {
      const [colored, plain] = [await box(lineCode(page, 'auto-tsx', n)), await box(lineCode(page, 'auto-off', n))];
      expect([plain.x - firstPlain.x, plain.y - firstPlain.y, plain.height], `line ${n}`).toEqual([colored.x - first.x, colored.y - first.y, colored.height]);
      const [a, b] = [(await rows(lineCode(page, 'auto-tsx', n)))[0], (await rows(lineCode(page, 'auto-off', n)))[0]];
      // (A face that is not strictly one width per weight may differ by a fraction of a pixel over a line.)
      if (a) near(a.width, b.width, `line ${n}: the same columns`, 0.5);
    }
    // A run that spans lines is split at the line break without a character lost, each piece its role.
    await mount(page, [fx('spanning', { label: 'x' }, { content: '<pre><code><span data-syntax="comment">/* one\n   two */</span>\nconst a = 1;</code></pre>' })]);
    await expect(lines(page, 'spanning')).toHaveCount(3);
    expect(await codeText(page, 'spanning')).toBe('/* one\n   two */\nconst a = 1;');
    expect(await host(page, 'spanning').evaluate((el) => [...el.querySelectorAll('[data-syntax="comment"]')].map((run) => run.textContent))).toEqual(['/* one\n', '   two */']);
    // A role a design system added to the axis: its two tokens are in the cascade, and it is drawn from them.
    expect(seen.filter((w) => w.includes('COD-19'))).toEqual([]);
    await override(page, { [T('syntax-color-operator')]: 'rgb(4, 5, 6)', [T('syntax-emphasis-operator')]: '200' });
    await insert(page, 'added-role', { label: 'x' }, 'a <span data-syntax="operator">=</span> 1', true);
    const operator = host(page, 'added-role').locator('[data-syntax="operator"]');
    await expect.poll(() => css(operator, 'color')).toBe('rgb(4, 5, 6)');
    expect(Number(await css(operator, 'font-weight'))).toBe(Number(await css(lineCode(page, 'added-role', 1), 'font-weight')) + 200);
    expect(seen.filter((w) => w.includes('COD-19'))).toEqual([]);
  });

  test('COD-19: with highlight true, no runs of the product’s, a language the highlighter knows and code within the limit, the block highlights the code by itself — every language fixture, in the light and the dark scheme, holds a run of every role its language has — and changes nothing but colors and weights: the characters, the lines and what the copy button copies are the code as given; in every other case all of the code is code.color; a role the design system does not have is drawn plain and reported', async ({ page }) => {
    const seen = warnings(page);
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, Object.keys(LANGUAGE_FIXTURES).map((id) => ({ ...fixture(id), props: { ...fixture(id).props, ...COPY } })), { theme });
      await double(page);
      for (const [id, roles] of Object.entries(LANGUAGE_FIXTURES)) {
        await colors(page, id);
        const given = String(fixture(id).props.code);
        // The roles drawn are the highlighter's for this code, and each is in its token's color.
        const drawn = await drawnRuns(host(page, id));
        expect(drawn, `${theme} ${id}`).toEqual(await expectedRuns(given, String(fixture(id).props.language)));
        expect([...new Set(drawn.map(([role]) => role).filter(Boolean))].sort(), `${theme} ${id}: its roles`).toEqual([...roles].sort());
        for (const role of roles) expect(await css(host(page, id).locator(`[data-syntax="${role}"]`).first(), 'color'), `${theme} ${id} ${role}`).toBe(await resolveColor(page, T(`syntax-color-${role}`)));
        // Nothing but colors and weights: the characters and the lines are the code's, and so is what is copied.
        expect(await codeText(page, id), id).toBe(given);
        expect(await host(page, id).evaluate((el) => el.querySelector('code')!.textContent), id).toBe(given);
        await expect(lines(page, id), id).toHaveCount(given.split('\n').length);
        await copyButton(page, id).locator('button').click();
        await expect.poll(async () => (await writes(page)).at(-1), id).toBe(given);
      }
    }
    // In every other case the code is one color: no language, highlight false, and a block with no code is still nothing.
    await mount(page, [...only('plain', 'auto-off', 'titled-language-copy'), fx('unknown-role', {}, { content: '<pre><code><span data-syntax="regex">/a/</span> <span data-syntax="keyword">in</span></code></pre>' })]);
    await page.waitForTimeout(150);
    for (const id of ['plain', 'auto-off', 'titled-language-copy']) {
      expect(await host(page, id).evaluate((el) => el.querySelectorAll('[data-syntax]').length), id).toBe(0);
      expect(await css(lineCode(page, id, 1), 'color'), id).toBe(await resolveColor(page, T('code-color')));
    }
    // A role the active design system does not have: plain, and said.
    const unknown = host(page, 'unknown-role').locator('[data-syntax="regex"]');
    expect([await css(unknown, 'color'), await css(unknown, 'font-weight')]).toEqual([await resolveColor(page, T('code-color')), await css(lineCode(page, 'unknown-role', 1), 'font-weight')]);
    expect(seen.filter((w) => w.includes('COD-19') && w.includes('"regex"'))).toHaveLength(1);
    // The roles are the token axis: the element's list is the roles the generated tokens name, one rule each, from the
    // two tokens that carry the role's name. And the package depends on no parser: its one dependency is the element base.
    const { SYNTAX_ROLES, CODE_BLOCK_CSS } = (await import(path.join(pkg, 'dist/components/code-block/code-block.light.js'))) as { SYNTAX_ROLES: string[]; CODE_BLOCK_CSS: string };
    const axis = [...new Set([...read('dist/tokens.css').matchAll(/--tanrei-comp-code-block-syntax-color-([a-z0-9-]+):/g)].map((match) => match[1]))];
    expect([...SYNTAX_ROLES].sort()).toEqual(axis.sort());
    expect([...SYNTAX_ROLES].sort()).toEqual([...ROLES].sort());
    for (const role of SYNTAX_ROLES) {
      expect(CODE_BLOCK_CSS, role).toContain(`[data-syntax='${role}'] {\n    color: var(--tanrei-comp-code-block-syntax-color-${role});\n    font-weight: calc(var(--_code-block-weight) + var(--tanrei-comp-code-block-syntax-emphasis-${role}, 0));`);
      expect(read('dist/tokens.css'), role).toContain(`--tanrei-comp-code-block-syntax-emphasis-${role}:`);
    }
    expect(Object.keys(JSON.parse(read('package.json')).dependencies)).toEqual(['lit']);
  });

  test('COD-27: language is an identifier read without regard to case and to space around it; empty, text, plain and plaintext are plain and nothing is said; a language the highlighter does not know is plain and reported once for each name; and nothing is guessed from the code, the title or the language label', async ({ page }) => {
    const seen = warnings(page);
    const tsx = String(fixture('auto-tsx').props.code);
    await mount(page, [
      ...only('auto-text', 'auto-unknown-language', 'auto-tsx'),
      fx('upper', { code: tsx, language: 'TSX' }),
      fx('spaced', { code: tsx, language: '  Tsx ' }),
      fx('cobol-again', { code: 'STOP RUN.', language: 'COBOL' }),
      fx('plain-name', { code: tsx, language: 'plain' }),
      fx('plaintext-name', { code: tsx, language: 'PlainText' }),
      // Nothing to guess from: a file name that ends in .tsx, a label that says TSX, code that is plainly TSX.
      fx('no-language', { code: tsx, title: 'Footer.tsx', languageLabel: 'TSX', label: '' }),
    ]);
    await colors(page, 'auto-tsx');
    await colors(page, 'upper');
    await colors(page, 'spaced');
    const expected = await expectedRuns(tsx, 'tsx');
    for (const id of ['auto-tsx', 'upper', 'spaced']) expect(await drawnRuns(host(page, id)), id).toEqual(expected);
    await page.waitForTimeout(150);
    for (const id of ['auto-text', 'auto-unknown-language', 'cobol-again', 'plain-name', 'plaintext-name', 'no-language']) {
      expect(await host(page, id).evaluate((el) => el.querySelectorAll('[data-syntax]').length), id).toBe(0);
      expect(await css(lineCode(page, id, 1), 'color'), id).toBe(await resolveColor(page, T('code-color')));
    }
    // Reported once for the name, though two blocks name it; nothing for text, plain, plaintext or no language at all.
    expect(seen.filter((w) => w.includes('COD-27'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('COD-27'))).toContain('"cobol"');
    expect(seen.filter((w) => /the language "(?:text|plain|plaintext|)"/.test(w))).toEqual([]);
    // The languages the block's highlighter knows, by their names and their other names.
    const names = H.languages();
    for (const name of ['markup', 'html', 'xml', 'svg', 'css', 'javascript', 'js', 'mjs', 'cjs', 'jsx', 'typescript', 'ts', 'tsx', 'json', 'jsonc', 'shell', 'sh', 'bash', 'zsh', 'swift', 'kotlin', 'kt', 'dart']) expect(names, name).toContain(name);
    for (const name of ['text', 'plain', 'plaintext', 'python', 'diff']) expect(names, name).not.toContain(name);
  });

  test('COD-27: a product adds a language, replaces one and replaces the highlighter whole, once for all its code blocks — through the module the element itself imports', async ({ page }) => {
    const ini = '; a comment\nname = acme\n';
    const { requested } = await modules(page, `
      <tanrei-code-block id="ini" label="x" language="ini"><pre><code>${ini}</code></pre></tanrei-code-block>
      <tanrei-code-block id="json" label="x" language="json"><pre><code>{ "a": 1 }</code></pre></tanrei-code-block>`);
    const runs = (id: string) => drawnRuns(page.locator(`#${id}`));
    await expect.poll(() => runs('json')).toEqual(await expectedRuns('{ "a": 1 }', 'json'));
    expect(await runs('ini')).toEqual([['', ini]]);
    // Add a language: a grammar is data. A block that names it is highlighted the next time it is read.
    await page.evaluate(async () => {
      const { registerLanguage } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      registerLanguage(['ini', 'conf'], { states: { main: [{ match: ';[^\\n]*', role: 'comment' }, { match: '[A-Za-z_][\\w.-]*(?=\\s*=)', role: 'property' }, { match: '=', role: 'punctuation' }] } });
      document.getElementById('ini')!.setAttribute('language', 'CONF');
    });
    await expect.poll(() => runs('ini')).toEqual([['comment', '; a comment'], ['', '\n'], ['property', 'name'], ['', ' '], ['punctuation', '='], ['', ' acme\n']]);
    // Replace one: json, by a grammar that knows only numbers.
    await page.evaluate(async () => {
      const { registerLanguage } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      registerLanguage('json', () => ({ states: { main: [{ match: '\\d+', role: 'constant' }] } }));
      (document.getElementById('json') as unknown as { code: string }).code = '{ "b": 2 }';
    });
    await expect.poll(() => runs('json')).toEqual([['', '{ "b": '], ['constant', '2'], ['', ' }']]);
    // Replace the highlighter whole: it is asked for every block, with the language trimmed and in lower case.
    await page.evaluate(async () => {
      const { setHighlighter } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      setHighlighter((code, language) => [{ text: code, syntax: language === 'conf' ? 'string' : 'keyword' }]);
      for (const id of ['ini', 'json']) (document.getElementById(id) as unknown as { code: string }).code = `${id} `;
    });
    await expect.poll(() => runs('ini')).toEqual([['string', 'ini ']]);
    await expect.poll(() => runs('json')).toEqual([['keyword', 'json ']]);
    // Null turns automatic highlighting off for the page; undefined gives Tanrei's back.
    await page.evaluate(async () => {
      const { setHighlighter } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      setHighlighter(null);
      (document.getElementById('json') as unknown as { code: string }).code = '{ "c": 3 }';
    });
    await expect.poll(() => runs('json')).toEqual([['', '{ "c": 3 }']]);
    expect(requested().filter((url) => url.includes('/highlight/'))).toEqual(['/dist/highlight/index.js', '/dist/highlight/grammars/json.js', '/dist/highlight/grammars/shared.js']);
  });

  test('COD-27: the element’s own seam — TanreiCodeBlock.highlighter — replaces the highlighter whole without loading Tanrei’s, and null turns it off', async ({ page }) => {
    const { requested } = await modules(page, '<tanrei-code-block id="a" label="x" language="js"><pre><code>const a = 1;</code></pre></tanrei-code-block>', {
      before: `customElements.whenDefined('tanrei-code-block').then((element) => { element.highlighter = (code, language) => [{ text: code.slice(0, 5), syntax: language === 'js' ? 'type' : 'string' }, { text: code.slice(5) }]; });`,
    });
    await expect.poll(() => drawnRuns(page.locator('#a'))).toEqual([['type', 'const'], ['', ' a = 1;']]);
    await page.evaluate(() => {
      (customElements.get('tanrei-code-block') as unknown as { highlighter: null }).highlighter = null;
      (document.getElementById('a') as unknown as { code: string }).code = 'let b = 2;';
    });
    await expect.poll(() => drawnRuns(page.locator('#a'))).toEqual([['', 'let b = 2;']]);
    expect(requested().filter((url) => url.includes('/highlight/'))).toEqual([]);
  });

  test('COD-28: the code is drawn at once, plain and complete, without waiting for its highlighter, and no part of the highlighter is loaded for a block that will not use it; when the runs are ready every color and weight arrives in one frame, without a motion, moving no line and no character and keeping the scroll offsets, the selection and the focus; runs that are with the code are drawn in the first frame', async ({ page }) => {
    const tsx = String(fixture('auto-tsx').props.code);
    await mount(page, only('plain'));
    await held(page);
    // The header's words are drawn in the text face, and the page has not asked for it yet: the fixture plain has no
    // header, and a face is fetched when a word first needs it. Words drawn before their face arrived move when it
    // does — by the difference between two faces, which is the page's and not the block's (measured where the face
    // that stands in is 4 px narrower for the language label: one layout shift, a second before the runs arrive). So
    // the faces of the header are here before the block is.
    await page.evaluate(async (fonts) => {
      const probe = document.body.appendChild(document.createElement('span'));
      for (const font of fonts) {
        probe.style.font = `var(${font})`;
        await document.fonts.load(getComputedStyle(probe).font, 'Footer.tsx TSX');
      }
      probe.remove();
      await document.fonts.ready;
    }, [T('title-typescale-font'), T('language-typescale-font')]);
    await page.evaluate(() => {
      const w = window as unknown as { __shifts: number; __mutations: number[] };
      w.__shifts = 0;
      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) new PerformanceObserver((list) => (w.__shifts += list.getEntries().length)).observe({ type: 'layout-shift', buffered: false });
    });
    // The fixture auto-tsx, drawn while its highlighter is held back: capped at four lines so that its body scrolls.
    await insert(page, 'held', { language: 'tsx', title: 'Footer.tsx', 'language-label': 'TSX', 'max-lines': '4', copy: '', 'copy-label': 'Copy', 'copied-label': 'Copied', 'copy-failed-label': 'Could not copy' }, tsx);
    await expect.poll(() => asked(page)).toEqual([{ code: tsx, language: 'tsx', aborted: false }]);
    // Complete in every other respect: the code, its lines, the header, the copy button, the scrolling body.
    expect(await codeText(page, 'held')).toBe(tsx);
    await expect(lines(page, 'held')).toHaveCount(tsx.split('\n').length);
    await expect(host(page, 'held').locator('[data-syntax]')).toHaveCount(0);
    await expect(header(page, 'held')).toHaveCount(1);
    await double(page);
    await copyButton(page, 'held').locator('button').click();
    await expect.poll(() => writes(page)).toEqual([tsx]);
    // A word selected, the body scrolled and focused, before the colors arrive.
    await body(page, 'held').evaluate((el) => {
      el.scrollTop = 30;
      el.focus();
    });
    await lineCode(page, 'held', 4).evaluate((el) => {
      const range = document.createRange();
      const text = el.firstChild as Text;
      range.setStart(text, text.data.indexOf('FooterProps'));
      range.setEnd(text, text.data.indexOf('FooterProps') + 'FooterProps'.length);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    const where = () =>
      host(page, 'held').evaluate((el) => {
        const selection = getSelection()!;
        const range = selection.rangeCount ? selection.getRangeAt(0) : null;
        const before = document.createRange();
        if (range) {
          before.selectNodeContents(el.querySelector('code')!);
          before.setEnd(range.startContainer, range.startOffset);
        }
        return {
          selected: selection.toString(),
          from: range ? before.toString().length : -1,
          scroll: el.shadowRoot!.querySelector('.body')!.scrollTop,
          focused: el.shadowRoot!.activeElement === el.shadowRoot!.querySelector('.body'),
          boxes: [...el.querySelectorAll('[data-line-code]')].map((line) => { const r = line.getBoundingClientRect(); return [r.left, r.top, r.height]; }),
          size: [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
        };
      });
    await page.waitForTimeout(1000);
    const before = await where();
    expect(before.selected).toBe('FooterProps');
    await expect(host(page, 'held').locator('[data-syntax]')).toHaveCount(0);
    // The runs arrive — a second late — and are drawn in one pass: one batch of mutations, every color in it.
    await host(page, 'held').evaluate((el) => {
      const w = window as unknown as { __batches: number };
      w.__batches = 0;
      new MutationObserver(() => w.__batches++).observe(el, { childList: true, subtree: true });
    });
    await answer(page, 0, await H.highlight(tsx, 'tsx'));
    await colors(page, 'held');
    expect(await drawnRuns(host(page, 'held'))).toEqual(await expectedRuns(tsx, 'tsx'));
    expect(await page.evaluate(() => (window as unknown as { __batches: number }).__batches)).toBe(1);
    const after = await where();
    // Nothing moved, nothing changed size, and the selection, the scroll offset and the focus are where they were.
    expect({ ...after, boxes: after.boxes.map((each) => each.map((value) => Math.round(value * 100))) }).toEqual({ ...before, boxes: before.boxes.map((each) => each.map((value) => Math.round(value * 100))) });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as unknown as { __shifts: number }).__shifts)).toBe(0);
    // Without a motion and without a fade.
    const run = host(page, 'held').locator('[data-syntax="keyword"]').first();
    expect([await css(run, 'transition-duration'), await css(run, 'animation-name'), await run.evaluate((el) => el.getAnimations().length)]).toEqual(['0s', 'none', 0]);
    // Runs that are with the code when the block is first drawn — highlighted where the page was made — have their
    // colors in the first frame: the highlighter is not asked, and the colors are there in the task that inserts them.
    const made = await H.highlightToHtml(tsx, 'tsx');
    const first = await page.evaluate(
      async ([html]) => {
        const stage = document.createElement('div');
        stage.className = 'stage';
        stage.dataset.fixture = 'made';
        stage.innerHTML = `<tanrei-code-block label="x" language="tsx"><pre><code data-syntax-of="tsx">${html}</code></pre></tanrei-code-block>`;
        document.querySelector('main')!.append(stage);
        // (The element's first render: a microtask of this task, before any frame.)
        await (stage.firstElementChild as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const keyword = stage.querySelector('[data-syntax="keyword"]')!;
        return { color: getComputedStyle(keyword).color, weight: getComputedStyle(keyword).fontWeight, plain: getComputedStyle(stage.querySelector('code')!).fontWeight };
      },
      [made],
    );
    expect(first.color).toBe(await resolveColor(page, T('syntax-color-keyword')));
    expect(Number(first.weight)).toBeGreaterThan(Number(first.plain));
    await page.waitForTimeout(100);
    expect((await asked(page)).length).toBe(1);
    expect(await drawnRuns(host(page, 'made'))).toEqual(await expectedRuns(tsx, 'tsx'));
  });

  test('COD-28: no part of the highlighter is loaded for a block that will not use it — no language, text, highlight false, code highlighted where the page was made — and a block that needs it loads the module and its own language’s grammar, once', async ({ page }) => {
    const made = await H.highlightToHtml('const a = 1;', 'js', { lines: true });
    const { requested } = await modules(page, `
      <tanrei-code-block id="none" label="x"><pre><code>const a = 1;</code></pre></tanrei-code-block>
      <tanrei-code-block id="text" label="x" language="text"><pre><code>const a = 1;</code></pre></tanrei-code-block>
      <tanrei-code-block id="off" label="x" language="js" highlight="false"><pre><code>const a = 1;</code></pre></tanrei-code-block>
      <tanrei-code-block id="made" label="x" language="js"><pre><code data-syntax-of="js">${made}</code></pre></tanrei-code-block>
      <tanrei-code-block id="made-plain" label="x" language="js"><pre><code data-syntax-of="js">const a = 1;</code></pre></tanrei-code-block>`);
    await page.waitForTimeout(300);
    expect(requested().filter((url) => url.includes('/highlight/'))).toEqual([]);
    expect(await drawnRuns(page.locator('#made'))).toEqual(await expectedRuns('const a = 1;', 'js'));
    await expect(page.locator('#made [data-line]')).toHaveCount(1);
    for (const id of ['none', 'text', 'off', 'made-plain']) expect(await drawnRuns(page.locator(`#${id}`)), id).toEqual([['', 'const a = 1;']]);
    // The element's own module does not import the highlighter: it asks for it.
    const element = read('dist/components/code-block/code-block.js');
    expect(element).toMatch(/import\(['"]\.\.\/\.\.\/highlight\/index\.js['"]\)/);
    expect(element).not.toMatch(/^import .*highlight/m);
    // Two blocks of one language and one of another: the module once, each grammar once, and no grammar nobody asked for.
    await page.evaluate(() => {
      for (const [language, code] of [['json', '{ "a": 1 }'], ['json', '[1]'], ['css', 'a { color: red }']]) {
        const block = document.createElement('tanrei-code-block');
        block.setAttribute('label', 'x');
        block.setAttribute('language', language);
        block.innerHTML = '<pre><code></code></pre>';
        block.querySelector('code')!.textContent = code;
        block.className = `late-${language}`;
        document.body.append(block);
      }
    });
    await expect(page.locator('.late-css [data-syntax]').first()).toBeAttached();
    await expect(page.locator('.late-json [data-syntax]').first()).toBeAttached();
    expect(requested().filter((url) => url.includes('/highlight/')).sort()).toEqual(['/dist/highlight/grammars/css.js', '/dist/highlight/grammars/json.js', '/dist/highlight/grammars/shared.js', '/dist/highlight/index.js']);
  });

  test('COD-29: where the product gives runs the block draws them as given and does not highlight the code itself, whatever language and highlight say — the fixture syntax with language css keeps its roles — and code given with the statement that it has been highlighted and no run is drawn plain in the same way', async ({ page }) => {
    const given = fixture('syntax').items!.map((item) => [item.props.syntax && item.props.syntax !== 'plain' ? String(item.props.syntax) : '', String(item.props.text)] as [string, string]);
    const merged = given.reduce<[string, string][]>((out, [role, text]) => (out.length && out[out.length - 1][0] === role ? ((out[out.length - 1][1] += text), out) : [...out, [role, text]]), []);
    await mount(page, [
      { ...fixture('syntax'), id: 'as-css', props: { ...fixture('syntax').props, language: 'css' } },
      { ...fixture('syntax'), id: 'off', props: { ...fixture('syntax').props, language: 'tsx', highlight: false } },
      fx('stated', { language: 'js' }, { content: '<pre><code data-syntax-of="js">const a = 1;</code></pre>' }),
      fx('own-lines', { language: 'js' }, { content: `<pre><code data-syntax-of="js">${await H.highlightToHtml('const a = 1;\nlet b;', 'js', { lines: true })}</code></pre>` }),
    ]);
    await page.waitForTimeout(200);
    for (const id of ['as-css', 'off']) {
      expect(await drawnRuns(host(page, id)), id).toEqual(merged);
      expect(await css(host(page, id).locator('[data-syntax="tag"]').first(), 'color'), id).toBe(await resolveColor(page, T('syntax-color-tag')));
    }
    expect(await drawnRuns(host(page, 'stated'))).toEqual([['', 'const a = 1;']]);
    expect(await drawnRuns(host(page, 'own-lines'))).toEqual(await expectedRuns('const a = 1;\nlet b;', 'js'));
    await expect(lines(page, 'own-lines')).toHaveCount(2);
    // Never asked for again: a highlighter set now is asked nothing when the blocks are drawn again.
    await held(page);
    await page.evaluate(() => {
      for (const block of document.querySelectorAll('tanrei-code-block')) Object.assign(block, { lineNumbers: true });
    });
    await expect(gutter(page, 'as-css', 1)).toHaveCount(1);
    await page.waitForTimeout(100);
    expect(await asked(page)).toEqual([]);
    // The code prop is ignored where the document gives runs: their texts are the code.
    await host(page, 'stated').evaluate((el) => ((el as unknown as { code: string }).code = 'other'));
    await page.waitForTimeout(50);
    expect(await codeText(page, 'stated')).toBe('const a = 1;');
  });

  test('COD-30: when code, language or highlight changes the new code is drawn at once and highlighted again — a line appended to auto-javascript twenty times in a second keeps the colors of the first line, and has its own in the task of the change; where the highlighter answers later the lines before the change keep their colors and the new ones are plain until then; and a result for code that is no longer shown is dropped, never drawn', async ({ page }) => {
    const js = String(fixture('auto-javascript').props.code);
    await mount(page, only('auto-javascript', 'auto-json'));
    await colors(page, 'auto-javascript');
    await host(page, 'auto-javascript').evaluate((el) => {
      (window as unknown as { __first: Node[] }).__first = [...el.querySelector('[data-line-code]')!.childNodes];
    });
    let code = js;
    for (let n = 1; n <= 20; n++) {
      code += `\nconst added${n} = ${n}; // more`;
      // In one task: the change, and what is drawn after it.
      const drawn = await host(page, 'auto-javascript').evaluate(async (el, next) => {
        (el as unknown as { code: string }).code = next;
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const first = [...el.querySelector('[data-line-code]')!.childNodes];
        const last = [...el.querySelectorAll('[data-line-code]')].at(-1)!;
        return { kept: first.length === (window as unknown as { __first: Node[] }).__first.length && first.every((node, index) => node === (window as unknown as { __first: Node[] }).__first[index]), last: [...last.querySelectorAll('[data-syntax]')].map((run) => run.getAttribute('data-syntax')), text: el.querySelector('code')!.textContent };
      }, code);
      expect(drawn, `piece ${n}`).toEqual({ kept: true, last: ['keyword', 'constant', 'punctuation', 'comment'], text: code });
      expect(await css(lineCode(page, 'auto-javascript', 1).locator('[data-syntax="keyword"]'), 'color')).toBe(await resolveColor(page, T('syntax-color-keyword')));
      await page.waitForTimeout(50);
    }
    expect(await drawnRuns(host(page, 'auto-javascript'))).toEqual(await expectedRuns(code, 'js'));
    // Code that grows in the document itself (text appended to the <code>) is read in the task of the change too.
    const grown = await host(page, 'auto-json').evaluate(async (el) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const first = el.querySelector('[data-line-code]')!.firstChild;
      el.querySelector('code')!.append('\n[true]');
      await Promise.resolve();
      return { kept: el.querySelector('[data-line-code]')!.firstChild === first, last: [...[...el.querySelectorAll('[data-line-code]')].at(-1)!.querySelectorAll('[data-syntax]')].map((run) => run.textContent) };
    });
    expect(grown).toEqual({ kept: true, last: ['[', 'true', ']'] });
    // language and highlight change: read again, at once.
    expect(
      await host(page, 'auto-json').evaluate(async (el) => {
        Object.assign(el, { highlight: false });
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const off = el.querySelectorAll('[data-syntax]').length;
        Object.assign(el, { highlight: true });
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const on = el.querySelectorAll('[data-syntax]').length;
        el.setAttribute('language', 'text');
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        return [off, on > 0, el.querySelectorAll('[data-syntax]').length];
      }),
    ).toEqual([0, true, 0]);
    // A highlighter that answers later. Its first answer colors the block.
    await held(page);
    await insert(page, 'late', { language: 'js', label: 'x' }, 'const a = 1;\nlet b = 2;');
    await expect.poll(() => asked(page)).toHaveLength(1);
    await answer(page, 0, await H.highlight('const a = 1;\nlet b = 2;', 'js'));
    await colors(page, 'late');
    // A line is added: the lines before it keep their colors, and it is plain until the new runs are ready.
    const kept = await host(page, 'late').evaluate(async (el) => {
      const first = [...el.querySelectorAll('[data-line-code]')].slice(0, 2).map((line) => [...line.childNodes]);
      (el as unknown as { code: string }).code = 'const a = 1;\nlet b = 2;\nvar c = 3;';
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 60));
      const now = [...el.querySelectorAll('[data-line-code]')];
      return { lines: now.length, kept: first.every((nodes, line) => nodes.every((node, index) => now[line].childNodes[index] === node)), colors: now.map((line) => line.querySelectorAll('[data-syntax]').length > 0) };
    });
    expect(kept).toEqual({ lines: 3, kept: true, colors: [true, true, false] });
    // The code changes twice in one task, before any answer: the first of the two questions is cancelled, and its
    // result — when it comes — is never drawn.
    await host(page, 'late').evaluate(async (el) => {
      const w = window as unknown as { __drawn: string[] };
      w.__drawn = [];
      new MutationObserver(() => w.__drawn.push(el.querySelector('code')!.textContent + '|' + [...el.querySelectorAll('[data-syntax]')].map((run) => run.textContent).join(','))).observe(el, { childList: true, subtree: true, characterData: true });
      (el as unknown as { code: string }).code = 'one();';
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      (el as unknown as { code: string }).code = 'two();';
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect.poll(async () => (await asked(page)).map((each) => [each.code, each.aborted])).toEqual([['const a = 1;\nlet b = 2;', false], ['const a = 1;\nlet b = 2;\nvar c = 3;', true], ['one();', true], ['two();', false]]);
    await answer(page, 2, [{ text: 'one', syntax: 'function' }, { text: '();', syntax: 'punctuation' }]);
    await answer(page, 1, await H.highlight('const a = 1;\nlet b = 2;\nvar c = 3;', 'js'));
    await page.waitForTimeout(100);
    await expect(host(page, 'late').locator('[data-syntax]')).toHaveCount(0);
    await answer(page, 3, [{ text: 'two', syntax: 'function' }, { text: '();', syntax: 'punctuation' }]);
    await expect.poll(() => drawnRuns(host(page, 'late'))).toEqual([['function', 'two'], ['punctuation', '();']]);
    expect((await page.evaluate(() => (window as unknown as { __drawn: string[] }).__drawn)).filter((each) => each.includes('one,') || each.includes('const,'))).toEqual([]);
  });

  test('COD-31: code longer than syntax.max-length characters is drawn plain, all of it, and reported — JavaScript one character longer than the token’s value has no run with a role, and with one character less it has its colors; the limit is the cascade’s; runs the product gives are drawn whatever their length', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, only('auto-javascript', 'syntax-outlined'));
    await colors(page, 'auto-javascript');
    const limit = Number((await css(host(page, 'auto-javascript'), T('syntax-max-length'))).trim());
    expect(limit).toBeGreaterThan(1000);
    const line = 'const answer = 42; // a line of code\n';
    const long = `${line.repeat(Math.ceil(limit / line.length))}`.slice(0, limit - 1) + ';;';
    expect(long.length).toBe(limit + 1);
    await host(page, 'auto-javascript').evaluate((el, text) => ((el as unknown as { code: string }).code = text), long);
    await expect(lines(page, 'auto-javascript')).toHaveCount(long.split('\n').length);
    await page.waitForTimeout(200);
    // Never a part of it highlighted.
    await expect(host(page, 'auto-javascript').locator('[data-syntax]')).toHaveCount(0);
    expect(await codeText(page, 'auto-javascript')).toBe(long);
    expect(seen.filter((w) => w.includes('COD-31'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('COD-31'))).toContain(String(limit));
    // One character less: at the limit, it is highlighted.
    await host(page, 'auto-javascript').evaluate((el, text) => ((el as unknown as { code: string }).code = text), long.slice(0, -1));
    await colors(page, 'auto-javascript');
    expect(await codeText(page, 'auto-javascript')).toBe(long.slice(0, -1));
    expect(await lineCode(page, 'auto-javascript', 1).evaluate((el) => [...el.querySelectorAll('[data-syntax]')].map((run) => run.getAttribute('data-syntax')))).toEqual(['keyword', 'constant', 'punctuation', 'comment']);
    // The limit is the token as the cascade gives it to the block: a product that lowers it is followed.
    await host(page, 'auto-javascript').evaluate((el) => {
      el.style.setProperty('--tanrei-comp-code-block-syntax-max-length', '20');
      (el as unknown as { code: string }).code = 'const twenty_one = 1;';
    });
    await page.waitForTimeout(150);
    await expect(host(page, 'auto-javascript').locator('[data-syntax]')).toHaveCount(0);
    await host(page, 'auto-javascript').evaluate((el) => ((el as unknown as { code: string }).code = 'const twenty___ = 1;'));
    await colors(page, 'auto-javascript');
    // Runs the product gives are drawn whatever their length.
    await host(page, 'syntax-outlined').evaluate((el) => el.style.setProperty('--tanrei-comp-code-block-syntax-max-length', '5'));
    await host(page, 'syntax-outlined').evaluate((el) => Object.assign(el, { lineNumbers: true }));
    await expect(gutter(page, 'syntax-outlined', 1)).toHaveCount(1);
    expect(await host(page, 'syntax-outlined').evaluate((el) => el.querySelectorAll('[data-syntax]').length)).toBeGreaterThan(10);
  });

  test('COD-32: a highlighter that cannot be loaded, fails while it reads the code, or answers with runs that do not join to the code leaves the code plain and everything else working — the header, the copy button, the lines, the marks, scrolling — and says so once; a failure in one block does not change another', async ({ page }) => {
    const seen = warnings(page);
    const block = (id: string, language: string, code = 'const a = 1;\nlet b = 2;') =>
      `<tanrei-code-block id="${id}" title="${id}.txt" language="${language}" line-numbers highlighted-lines="2" highlighted-label="Highlighted" copy copy-label="Copy" copied-label="Copied" copy-failed-label="Could not copy"><pre><code>${code}</code></pre></tanrei-code-block>`;
    const whole = async (id: string, code = 'const a = 1;\nlet b = 2;') => {
      const target = page.locator(`#${id}`);
      expect(await drawnRuns(target), id).toEqual([['', code]]);
      await expect(target.locator('.header'), id).toHaveCount(1);
      await expect(target.locator('[data-line]'), id).toHaveCount(2);
      await expect(target.locator('[data-line][data-highlighted]'), id).toHaveCount(1);
      await expect(target.locator('[data-line-gutter][data-number]'), id).toHaveCount(2);
      await target.locator('tanrei-copy-button button').click();
      await expect.poll(async () => (await writes(page)).at(-1), id).toBe(code);
    };
    // A grammar that throws, a grammar the interpreter refuses, and a highlighter that drops a character.
    await modules(page, `${block('throws', 'boom')}${block('refused', 'nested')}${block('fine', 'js')}`, {
      before: `window.highlighter().then(({ registerLanguage }) => {
        registerLanguage('boom', () => { throw new Error('no grammar today'); });
        registerLanguage('nested', { states: { main: [{ match: '(a+)+b', role: 'keyword' }] } });
      });`,
    });
    await double(page);
    await expect(page.locator('#fine [data-syntax]').first()).toBeAttached();
    await page.waitForTimeout(150);
    await whole('throws');
    await whole('refused');
    expect(seen.filter((w) => w.includes('COD-32') && w.includes('no grammar today'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('COD-32') && w.includes('repeats a group that holds a repetition'))).toHaveLength(1);
    // The other block is as it would be without them.
    expect(await drawnRuns(page.locator('#fine'))).toEqual(await expectedRuns('const a = 1;\nlet b = 2;', 'js'));
    // Runs that do not join to the code: one that drops a character, one that adds one.
    await page.evaluate(async () => {
      const { setHighlighter } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      setHighlighter((code, language) => (language === 'boom' ? [{ text: code.slice(1), syntax: 'keyword' }] : language === 'nested' ? [{ text: `${code};`, syntax: 'keyword' }] : [{ text: code, syntax: 'string' }]));
      for (const id of ['throws', 'refused', 'fine']) (document.getElementById(id) as unknown as { code: string }).code = 'x = 1;\ny = 2;';
    });
    await expect.poll(() => drawnRuns(page.locator('#fine'))).toEqual([['string', 'x = 1;\ny = 2;']]);
    await page.waitForTimeout(100);
    await whole('throws', 'x = 1;\ny = 2;');
    await whole('refused', 'x = 1;\ny = 2;');
    expect(seen.filter((w) => w.includes('COD-32') && w.includes('do not join'))).toHaveLength(2);
    // A highlighter that throws, and one whose promise is refused: the same.
    await page.evaluate(async () => {
      const { setHighlighter } = await (window as unknown as { highlighter: () => Promise<typeof import('../../highlight/index.js')> }).highlighter();
      setHighlighter((code, language) => {
        if (language === 'boom') throw new Error('thrown at once');
        return language === 'nested' ? Promise.reject(new Error('refused later')) : [{ text: code, syntax: 'type' }];
      });
      for (const id of ['throws', 'refused', 'fine']) (document.getElementById(id) as unknown as { code: string }).code = 'p = 1;\nq = 2;';
    });
    await expect.poll(() => drawnRuns(page.locator('#fine'))).toEqual([['type', 'p = 1;\nq = 2;']]);
    await page.waitForTimeout(100);
    await whole('throws', 'p = 1;\nq = 2;');
    await whole('refused', 'p = 1;\nq = 2;');
    expect(seen.filter((w) => w.includes('COD-32') && w.includes('thrown at once'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('COD-32') && w.includes('refused later'))).toHaveLength(1);
  });

  test('COD-32: where the highlighter’s module, or a language’s grammar, cannot be loaded the code is plain, everything else works, it is said once — and a block whose runs the document gave is as it was', async ({ page }) => {
    const seen = warnings(page);
    const { requested } = await modules(
      page,
      `<tanrei-code-block id="a" title="a.js" language="js" copy copy-label="Copy" copied-label="Copied" copy-failed-label="Could not copy"><pre><code>const a = 1;</code></pre></tanrei-code-block>
       <tanrei-code-block id="b" label="x" language="js"><pre><code>let b;</code></pre></tanrei-code-block>
       <tanrei-code-block id="given" label="x"><pre><code><span data-syntax="keyword">const</span> c;</code></pre></tanrei-code-block>`,
      { refuse: ['/dist/highlight/index.js'] },
    );
    await double(page);
    await expect.poll(() => seen.filter((w) => w.includes('COD-32') && w.includes('could not be loaded')).length).toBe(2);
    expect(await drawnRuns(page.locator('#a'))).toEqual([['', 'const a = 1;']]);
    await expect(page.locator('#a .header')).toHaveCount(1);
    await page.locator('#a tanrei-copy-button button').click();
    await expect.poll(() => writes(page)).toEqual(['const a = 1;']);
    expect(await drawnRuns(page.locator('#given'))).toEqual([['keyword', 'const'], ['', ' c;']]);
    expect(requested().filter((url) => url.includes('/highlight/'))).toEqual(['/dist/highlight/index.js']);
    // A grammar that cannot be loaded: the module is there, its json is not.
    const second = await modules(page, '<tanrei-code-block id="j" label="x" language="json"><pre><code>{ "a": 1 }</code></pre></tanrei-code-block><tanrei-code-block id="c" label="x" language="css"><pre><code>a { b: c }</code></pre></tanrei-code-block>', { refuse: ['/grammars/json.js'] });
    await expect(page.locator('#c [data-syntax]').first()).toBeAttached();
    await expect.poll(() => seen.filter((w) => w.includes('COD-32') && w.includes('<tanrei-code-block>')).length).toBe(3);
    expect(await drawnRuns(page.locator('#j'))).toEqual([['', '{ "a": 1 }']]);
    expect(second.requested().filter((url) => url.includes('json'))).toEqual(['/dist/highlight/grammars/json.js']);
  });

  test('COD-33: with added and removed lines the code is highlighted as the two texts it holds — the lines that are not removed, which is what is copied, color the lines that are not removed, and the lines that are not added color the removed ones — so that in auto-marked the removed line, which opens a string, does not color the line after it; a marked line keeps the colors of its runs over the band and beside the bar and the sign', async ({ page }) => {
    await mount(page, only('auto-marked', 'auto-highlighted-lines'));
    await double(page);
    await colors(page, 'auto-marked');
    const all = String(fixture('auto-marked').props.code).split('\n');
    // The fixture: line 2 is removed and opens a template string it does not close; line 3 is the line that replaces it.
    await expect(line(page, 'auto-marked', 2)).toHaveAttribute('data-removed', '');
    await expect(line(page, 'auto-marked', 3)).toHaveAttribute('data-added', '');
    const after = all.filter((_, index) => index !== 1).join('\n');
    const before = all.filter((_, index) => index !== 2).join('\n');
    // Read as one text, the line after them would be a string to its end: that is what the two readings prevent.
    const naive = perLine(await expectedRuns(all.join('\n'), 'js'));
    expect(naive[3].map(([role]) => role)).toEqual(['string']);
    const [afterLines, beforeLines] = [perLine(await expectedRuns(after, 'js')), perLine(await expectedRuns(before, 'js'))];
    const drawn = [];
    for (let n = 1; n <= all.length; n++) drawn.push(await drawnRuns(lineCode(page, 'auto-marked', n)));
    // Every line that is not removed has the colors it has in the code without the removed line...
    expect([drawn[0], drawn[2], drawn[3], drawn[4], drawn[5]]).toEqual(afterLines);
    expect(drawn[3].map(([role, text]) => `${role}:${text}`).slice(0, 4)).toEqual(['keyword:for', ': ', 'punctuation:(', 'keyword:const']);
    // ...and the removed line the colors it has in the code as it was before the change.
    expect(drawn[1]).toEqual(beforeLines[1]);
    expect(drawn[1].map(([role]) => role)).toContain('string');
    // What is copied is the first of the two texts.
    await copyButton(page, 'auto-marked').locator('button').click();
    await expect.poll(() => writes(page)).toEqual([after]);
    // The marks are drawn as before, and the code keeps its colors over the band and beside the bar and the sign.
    await colors(page, 'auto-highlighted-lines');
    await expect(line(page, 'auto-highlighted-lines', 4)).toHaveAttribute('data-highlighted', '');
    expect(await css(line(page, 'auto-highlighted-lines', 4), 'background-color')).toBe(await resolveColor(page, T('line-highlighted-container-color')));
    for (const [id, n, role] of [['auto-highlighted-lines', 4, 'keyword'], ['auto-highlighted-lines', 5, 'string'], ['auto-marked', 2, 'keyword'], ['auto-marked', 3, 'string']] as const) {
      expect(await css(lineCode(page, id, n).locator(`[data-syntax="${role}"]`).first(), 'color'), `${id} ${n}`).toBe(await resolveColor(page, T(`syntax-color-${role}`)));
    }
    expect([await gutter(page, 'auto-marked', 2).getAttribute('data-sign'), await gutter(page, 'auto-marked', 3).getAttribute('data-sign')]).toEqual(['−', '+']);
    expect(await css(lineCode(page, 'auto-marked', 2), 'text-decoration-line')).toBe('none');
    // A mark that changes is read again: with no line removed there is one text, and the open string runs on.
    await host(page, 'auto-marked').evaluate((el) => Object.assign(el, { removedLines: '', addedLines: '' }));
    await expect.poll(() => drawnRuns(lineCode(page, 'auto-marked', 4))).toEqual(naive[3]);
  });
});

test.describe('direction', () => {
  test('COD-20: the body is laid out left to right in every layout direction — lines, the gutter, the bars and the start of scrolling at the left — and a right-to-left layout mirrors the frame alone: the title at the right, the language and the copy button at the left, the copy button of a block without a header at the top left, with COD-10’s padding at its side', async ({ page }) => {
    await mount(page, only('rtl', 'rtl-copy-without-header', 'titled-language-copy', 'long-lines-copy'));
    const c = await box(container(page, 'rtl'));
    const inline = await resolveToken(page, T('container-padding-inline-medium'));
    const inset = await resolveToken(page, T('copy-button-inset'));
    // The frame, mirrored.
    const [title, language, button] = [await box(host(page, 'rtl').locator('.title')), await box(host(page, 'rtl').locator('.language')), await box(copyButton(page, 'rtl'))];
    near(c.right - title.right, inline, 'the title at the right', 0.1);
    near(button.x - c.x, inset, 'the copy button at the left', 0.1);
    expect(language.x).toBeGreaterThan(button.right);
    expect(language.right).toBeLessThan(title.x);
    // The body, not mirrored: numbers and the first column of code at the left, the bar at the left edge.
    expect([await body(page, 'rtl').getAttribute('dir'), await css(pre(page, 'rtl'), 'direction'), await css(lineCode(page, 'rtl', 1), 'direction')]).toEqual(['ltr', 'ltr', 'ltr']);
    const ltr = { gutter: (await box(gutter(page, 'titled-language-copy', 1).or(lineCode(page, 'titled-language-copy', 1)).first())).x - (await box(container(page, 'titled-language-copy'))).x };
    expect((await box(gutter(page, 'rtl', 1))).x).toBe(c.x);
    expect((await rows(lineCode(page, 'rtl', 1)))[0].x).toBeLessThan(c.x + c.width / 3);
    expect(ltr.gutter).toBe(inline);
    expect((await css(gutter(page, 'rtl', 3), 'background-position')).split(',')[0]).toMatch(/^(0%|left) (0%|top)$|^0px 0px$/);
    // Scrolling starts at the left.
    expect(await body(page, 'rtl-copy-without-header').evaluate((el) => [el.scrollLeft, el.scrollWidth > el.clientWidth])).toEqual([0, true]);
    // Without a header: the button at the top left, and the padding before the lines widened there instead of after them.
    const [rc, rb] = [await box(container(page, 'rtl-copy-without-header')), await box(copyButton(page, 'rtl-copy-without-header'))];
    near(rb.x - rc.x, inset, 'the button at the left', 0.1);
    near(rb.y - rc.y, inset, 'at the top', 0.1);
    const first = (await rows(lineCode(page, 'rtl-copy-without-header', 1)))[0].x;
    near(first - rc.x, inline + rb.width + inset, 'the padding at the button’s side', 0.6);
    expect(first).toBeGreaterThanOrEqual(rb.right);
    await body(page, 'rtl-copy-without-header').evaluate((el) => (el.scrollLeft = el.scrollWidth));
    near(rc.right - (await rows(lineCode(page, 'rtl-copy-without-header', 1)))[0].right, inline, 'the other side has the plain padding', 0.6);
    // A comment in a right-to-left script is laid out by the bidirectional algorithm inside its left-to-right line.
    await mount(page, [fx('arabic', { code: 'const a = 1; // تعليق عربي\nconst b = 2;' }, { direction: 'rtl' })]);
    const row = (await rows(lineCode(page, 'arabic', 1)))[0];
    expect(row.x).toBe((await rows(lineCode(page, 'arabic', 2)))[0].x);
    expect(await css(pre(page, 'arabic'), 'unicode-bidi')).toBe('isolate');
  });

  test('COD-20: in a right-to-left layout the copy button of a block without a header stands over the gutter where there is one, and has no patch there — the gutter stays in view under it, so no code passes under the button and a marked line’s bar and band are drawn from the container’s left edge (COD-10, COD-15); without a gutter it keeps its patch', async ({ page }) => {
    const code = 'const a = 1;\nconst b = 2;\nconst c = a + b; // a line that is long enough to be scrolled sideways under whatever stands over the body of this block\nexport { c };';
    await mount(page, [
      fx('gutter-rtl', { code, lineNumbers: true, highlightedLines: '1-2', highlightedLabel: 'Highlighted', ...COPY }, { direction: 'rtl' }),
      fx('marks-rtl', { code, addedLines: '1', addedLabel: 'Added', ...COPY }, { direction: 'rtl' }),
      fx('bare-rtl', { code, ...COPY }, { direction: 'rtl' }),
      fx('gutter-ltr', { code, lineNumbers: true, highlightedLines: '1-2', highlightedLabel: 'Highlighted', ...COPY }),
    ]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 360px; }' });
    const patch = (id: string) => css(host(page, id).locator('.corner'), 'background-color');
    for (const id of ['gutter-rtl', 'marks-rtl']) {
      expect(await patch(id), id).toBe('rgba(0, 0, 0, 0)');
      // The gutter of the first line: from the container's left edge to past the button, its bar at its left edge,
      // and still there when the code is scrolled to its end.
      const [c, g, b] = [await box(container(page, id)), await box(gutter(page, id, 1)), await box(copyButton(page, id))];
      expect(g.x, id).toBe(c.x);
      expect(g.right, id).toBeGreaterThanOrEqual(b.right);
      expect((await css(gutter(page, id, 1), 'background-image')).startsWith('linear-gradient'), id).toBe(true);
      await body(page, id).evaluate((el) => (el.scrollLeft = el.scrollWidth));
      expect((await box(gutter(page, id, 1))).x, id).toBe(c.x);
    }
    // Where code can pass under the button it stands on its patch: no gutter at the left, or the button at the right.
    const ground = await resolveColor(page, T('filled-container-color'));
    expect(await patch('bare-rtl')).toBe(ground);
    expect(await patch('gutter-ltr')).toBe(ground);
  });

  test('COD-21: the direction comes from the nearest ancestor that sets one — not from the root — and a change after the first render is drawn at once, without a motion, keeping the body’s scroll offsets, its selection and its focus', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 600 });
    await mount(page, [fx('t', { code: LONG, title: 'footer.js', maxLines: 2, ...COPY })]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 100vw; }' });
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
    const places = async () => ({ title: (await box(host(page, 't').locator('.title'))).x, copy: (await box(copyButton(page, 't'))).x });
    const ltr = await places();
    expect(ltr.title).toBeLessThan(ltr.copy);
    await tabTo(page, body(page, 't'));
    await body(page, 't').evaluate((el) => { el.scrollLeft = 120; el.scrollTop = 20; });
    await host(page, 't').evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el.querySelectorAll('[data-line-code]')[2]); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); });
    const selection = await page.evaluate(() => getSelection()!.toString());
    await stage(page, 't').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await places();
    expect(rtl.title).toBeGreaterThan(rtl.copy);
    expect(await body(page, 't').evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([120, 20]);
    expect(await page.evaluate(() => getSelection()!.toString())).toBe(selection);
    expect(await host(page, 't').evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('body'))).toBe(true);
    expect(await host(page, 't').evaluate((el) => [el.hasAttribute('dir'), el.shadowRoot!.querySelector('.container')!.getAnimations({ subtree: true }).length])).toEqual([false, 0]);
    await stage(page, 't').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await places()).toEqual(ltr);
  });
});

test.describe('accessibility', () => {
  test('COD-22: the code is exposed as text in reading order with the code role, inside a group named by title, or by label; the language label is read as text of the header and language itself is not read; no syntax role is exposed, and colors that arrive or change are not announced; and a change of the code, its runs or a marked line is drawn and exposed at once, announced by nothing, the scroll offsets kept', async ({ page }) => {
    await mount(page, [...only('titled-language-copy', 'plain', 'syntax', 'auto-off'), fx('unnamed', { code: 'a', label: '' }), fx('live', { code: LONG, maxLines: 2 }), fx('labelled', { code: '{ "a": 1 }', language: 'json', languageLabel: 'Data file', title: 'acme.txt', label: '' })]);
    await expect(stage(page, 'titled-language-copy').getByRole('group', { name: 'sizes.js', exact: true })).toHaveCount(1);
    await expect(stage(page, 'plain').getByRole('group', { name: 'Example', exact: true })).toHaveCount(1);
    await expect(stage(page, 'unnamed').getByRole('group')).toHaveCount(0);
    await expect(stage(page, 'titled-language-copy').getByRole('code')).toHaveCount(1);
    const snapshot = (await stage(page, 'titled-language-copy').ariaSnapshot()).replaceAll(/\s+/g, ' ');
    // Reading order: the title, the language label, the copy button, then the code, line after line.
    const order = ['sizes.js', 'JavaScript', 'button "Copy"', 'group "sizes.js"', "const sizes = ['small', 'medium', 'large'];", 'for (const size of sizes) {', 'document.body.append(button);'].map((part) => snapshot.indexOf(part));
    expect(order.every((at) => at >= 0), snapshot).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // A syntax role is not exposed: the code with runs reads as its text.
    const colored = (await stage(page, 'syntax').ariaSnapshot()).replaceAll(/\s+/g, ' ');
    expect(colored).toContain("import { Button } from '@tanrei/react';");
    expect(colored).not.toMatch(/keyword|punctuation|constant|property|comment"|data-syntax/);
    // The language label is read; the identifier the block highlights by is not.
    await colors(page, 'labelled');
    const labelled = (await stage(page, 'labelled').ariaSnapshot()).replaceAll(/\s+/g, ' ');
    expect(labelled).toContain('Data file');
    expect(labelled).not.toMatch(/json/i);
    // Colors that arrive or change say nothing: the block read with its colors is the block read without them, and
    // there is no live region for them to speak through (the copy button's own, CPY-5, is for the copy alone).
    const read = async (id: string) => (await stage(page, id).ariaSnapshot()).replaceAll(/\s+/g, ' ');
    const plainRead = await read('auto-off');
    await host(page, 'auto-off').evaluate((el) => Object.assign(el, { highlight: true }));
    await colors(page, 'auto-off');
    expect(await read('auto-off')).toBe(plainRead);
    expect(await host(page, 'auto-off').evaluate((el) => [el.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role]').length, el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length])).toEqual([0, 0]);
    // A change: drawn and exposed at once, with no live region and no motion, the scroll offsets kept.
    await body(page, 'live').evaluate((el) => { el.scrollLeft = 90; el.scrollTop = 30; });
    expect(await host(page, 'live').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length)).toBe(0);
    await host(page, 'live').evaluate((el) => (el.querySelector('code')!.textContent = `${el.querySelector('code')!.textContent}\nconst added = true;`));
    await expect(lines(page, 'live')).toHaveCount(5);
    expect(await codeText(page, 'live')).toBe(`${LONG}\nconst added = true;`);
    expect(await body(page, 'live').evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([90, 30]);
    await host(page, 'live').evaluate((el) => Object.assign(el, { highlightedLines: '5', highlightedLabel: 'Highlighted' }));
    await expect(line(page, 'live', 5)).toHaveAttribute('data-highlighted', '');
    expect(await body(page, 'live').evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([90, 30]);
    expect(await line(page, 'live', 5).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    // A block built by script: the element writes the pre and the code, and follows the prop.
    await host(page, 'plain').evaluate((el) => { el.replaceChildren(); (el as unknown as { code: string }).code = 'x = 1\ny = 2'; });
    await expect(lines(page, 'plain')).toHaveCount(2);
    expect(await host(page, 'plain').evaluate((el) => [el.firstElementChild?.localName, el.firstElementChild?.firstElementChild?.localName])).toEqual(['pre', 'code']);
    await host(page, 'plain').evaluate((el) => ((el as unknown as { code: string }).code = 'z = 3'));
    await expect(lines(page, 'plain')).toHaveCount(1);
    expect(await codeText(page, 'plain')).toBe('z = 3');
  });

  test('COD-23: with forced colors every variant has an edge outline.width wide in the platform’s text color; the code is that text color whatever role a run names, every run keeping the weight of its role; numbers, prompts, signs and bars are that color; and there is no band — a highlighted line is marked by its bar, an added or removed one by its bar and its sign', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...only('plain', 'diff', 'outlined', 'syntax', 'highlighted-lines', 'terminal', 'copy', 'auto-tsx')]);
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const text = await css(pre(page, 'plain'), 'color');
    const width = `${await resolveToken(page, T('outline-width'))}px`;
    for (const id of ['plain', 'diff', 'outlined']) {
      expect([await css(container(page, id), 'content', '::after'), await css(container(page, id), 'border-top-width', '::after'), await css(container(page, id), 'border-top-color', '::after'), await css(container(page, id), 'border-top-style', '::after')], id).toEqual(['""', width, text, 'solid']);
    }
    // No part relies on a background color: the container's and the band's are the mode's own ground.
    const ground = await css(stage(page, 'plain'), 'background-color');
    expect(await css(container(page, 'plain'), 'background-color')).toBe(ground);
    expect(await css(line(page, 'highlighted-lines', 4), 'background-color')).toMatch(/, 0\)$/);
    for (const n of [4, 5]) expect(await css(line(page, 'diff', n), 'background-color'), `diff ${n}`).toMatch(/, 0\)$/);
    // Every role is the text color, in runs the product gave and in runs the block found; each keeps the weight of its role.
    await colors(page, 'auto-tsx');
    const weight = Number((await css(pre(page, 'syntax'), T('code-typescale-medium-font-weight'))).trim());
    for (const id of ['syntax', 'auto-tsx']) {
      for (const role of ROLES) {
        const run = host(page, id).locator(`[data-syntax="${role}"]`).first();
        expect(await css(run, 'color'), `${id} ${role}`).toBe(text);
        expect(Number(await css(run, 'font-weight')), `${id} ${role}`).toBe(weight + Number((await css(pre(page, id), T(`syntax-emphasis-${role}`))).trim()));
      }
    }
    expect(Number(await css(host(page, 'syntax').locator('[data-syntax="keyword"]').first(), 'font-weight'))).toBeGreaterThan(weight);
    // Numbers, signs, the prompt and the bars, in that color.
    expect(await css(gutter(page, 'diff', 1), 'color')).toBe(text);
    expect(await css(gutter(page, 'diff', 4), 'color', '::after')).toBe(text);
    expect(await css(line(page, 'terminal', 1).locator('[data-line-prompt]'), 'color')).toBe(text);
    for (const [id, n] of [['diff', 4], ['diff', 5], ['highlighted-lines', 4]] as const) {
      expect((await css(gutter(page, id, n), 'background-image')).replaceAll(/\s+/g, ' '), `${id} ${n}`).toContain(`linear-gradient(${text}, ${text})`);
      expect(await css(gutter(page, id, n), 'forced-color-adjust'), `${id} ${n}`).toBe('none');
    }
    expect(await gutter(page, 'diff', 4).getAttribute('data-sign')).toBe('−');
  });

  test('COD-24: with the text size enlarged the lines, the gutter and the header grow with the text and the copy button keeps its size; at twice the text size in a container 320 wide the body scrolls inside the container or wraps, the title is cut, and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const fixtures = [fx('scrolls', { code: SIZES, lineNumbers: true, title: 'a-file-name-that-is-long-enough-to-be-cut.js', languageLabel: 'JavaScript', label: '', ...COPY }), fx('wraps', { code: SIZES, wrap: true, lineNumbers: true })];
    await mount(page, fixtures);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 100vw; }' });
    const read = async () => ({ line: (await box(line(page, 'scrolls', 1))).height, gutter: (await box(gutter(page, 'scrolls', 1))).width - (await px(gutter(page, 'scrolls', 1), 'padding-left')) - (await px(gutter(page, 'scrolls', 1), 'padding-right')), title: await px(host(page, 'scrolls').locator('.title'), 'font-size'), button: await box(copyButton(page, 'scrolls')), radius: await px(container(page, 'scrolls'), 'border-top-left-radius') });
    const before = await read();
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.evaluate(() => document.fonts.ready);
    const after = await read();
    expect(after.line).toBeCloseTo(before.line * 2, 0);
    expect(after.gutter).toBeCloseTo(before.gutter * 2, 0);
    expect(after.title).toBeCloseTo(before.title * 2, 1);
    expect([after.button.width, after.button.height]).toEqual([await resolveToken(page, BUTTON), await resolveToken(page, BUTTON)]);
    expect(after.radius).toBe(await resolveToken(page, T('container-shape')));
    expect(await px(pre(page, 'scrolls'), 'padding-bottom')).toBe(await resolveToken(page, T('container-padding-block-medium')));
    // The body scrolls inside the container, or wraps; the title is cut; the page does not scroll sideways.
    await expect.poll(() => body(page, 'scrolls').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await body(page, 'scrolls').getAttribute('tabindex')).toBe('0');
    expect(await body(page, 'wraps').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect((await rows(lineCode(page, 'wraps', 4))).length).toBeGreaterThan(1);
    expect(await host(page, 'scrolls').locator('.title').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await box(host(page, 'scrolls').locator('.language'))).right).toBeLessThanOrEqual(after.button.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('COD-25: with no code it draws nothing, takes no space, exposes nothing and reports; with copy and a missing label, a marked line and no label for its mark, or a body that scrolls with no title and no label, it still draws and reports what is missing; an unknown variant or size is the default, a startLine below 1 is 1 and a maxLines below 1 none', async ({ page }) => {
    const seen = warnings(page);
    await page.setViewportSize({ width: 360, height: 600 });
    await mount(page, [
      fx('empty', {}),
      fx('empty-code', { code: '' }),
      fx('no-words', { code: 'a\nb', copy: true, highlightedLines: '1', addedLines: '2' }),
      fx('unnamed', { code: LONG, label: '' }),
      fx('unknown', { code: 'a', variant: 'glass', size: 'huge' }),
      fx('numbers', { code: 'a\nb\nc', lineNumbers: true, startLine: 0, maxLines: 0 }),
      fx('fraction', { code: 'a', lineNumbers: true, startLine: 2.5 }),
      fx('reference', { code: 'a' }),
    ]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-code-block) { inline-size: 100vw; }' });
    const about = (text: string) => seen.filter((w) => w.includes('COD-25') && w.includes(text));
    // Nothing: no box, no space, nothing exposed.
    for (const id of ['empty', 'empty-code']) {
      expect(await css(host(page, id), 'display'), id).toBe('none');
      expect(await host(page, id).evaluate((el) => [el.getBoundingClientRect().height, el.shadowRoot!.querySelector('.container')]), id).toEqual([0, null]);
      expect(await stage(page, id).ariaSnapshot(), id).toBe('');
    }
    expect(about('has no code').length).toBe(2);
    // Code that arrives later is drawn.
    await host(page, 'empty').evaluate((el) => (el.innerHTML = '<pre><code>late()</code></pre>'));
    await expect(lines(page, 'empty')).toHaveCount(1);
    expect(await css(host(page, 'empty'), 'display')).toBe('block');
    // What is missing is said, and the block still draws.
    await expect(copyButton(page, 'no-words')).toHaveCount(1);
    await expect(line(page, 'no-words', 1)).toHaveAttribute('data-highlighted', '');
    await expect(host(page, 'no-words').locator('[data-line-label]')).toHaveCount(0);
    expect(about('copyLabel, copiedLabel, copyFailedLabel are empty')).toHaveLength(1);
    expect(about('highlightedLabel is empty')).toHaveLength(1);
    expect(about('addedLabel is empty')).toHaveLength(1);
    await expect.poll(() => body(page, 'unnamed').getAttribute('tabindex')).toBe('0');
    await expect.poll(() => about('both title and label are empty').length).toBe(1);
    // An unknown variant and size: the defaults.
    expect(await css(container(page, 'unknown'), 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await box(container(page, 'unknown'))).toMatchObject({ height: (await box(container(page, 'reference'))).height });
    expect(await px(pre(page, 'unknown'), 'font-size')).toBe(await resolveToken(page, T('code-typescale-medium-font-size')));
    expect(about('variant "glass"')).toHaveLength(1);
    expect(about('size "huge"')).toHaveLength(1);
    // startLine below 1, or not whole, is 1; maxLines below 1 is none.
    expect(await gutter(page, 'numbers', 1).getAttribute('data-number')).toBe('1');
    expect(await gutter(page, 'fraction', 1).getAttribute('data-number')).toBe('1');
    expect(await body(page, 'numbers').evaluate((el) => [el.classList.contains('capped'), el.scrollHeight <= el.clientHeight])).toEqual([false, true]);
    expect(about('startLine 0')).toHaveLength(1);
    expect(about('startLine 2.5')).toHaveLength(1);
    expect(about('maxLines 0')).toHaveLength(1);
  });

  test('COD-26: the code block takes no press and has no hovered, pressed, selected or disabled state — no state layer, no ripple, nothing that changes under a pointer; what is pressed inside it is its Copy button', async ({ page }) => {
    await mount(page, only('copy'));
    await double(page);
    const drawn = async () => ({ fill: await css(container(page, 'copy'), 'background-color'), color: await css(pre(page, 'copy'), 'color'), cursor: await css(body(page, 'copy'), 'cursor'), shadow: await css(container(page, 'copy'), 'box-shadow') });
    const rest = await drawn();
    await lineCode(page, 'copy', 3).hover();
    expect(await drawn()).toEqual(rest);
    await page.mouse.down();
    expect(await drawn()).toEqual(rest);
    expect(await host(page, 'copy').evaluate((el) => [el.shadowRoot!.querySelectorAll('.ripple, .state-layer').length, el.shadowRoot!.querySelector('.container')!.hasAttribute('data-pressed'), el.getAttribute('role'), el.hasAttribute('tabindex')])).toEqual([0, false, null, false]);
    await page.mouse.up();
    expect(await writes(page)).toEqual([]);
    expect(rest.cursor).toBe('auto');
    const styles = await host(page, 'copy').evaluate((el) => (el.constructor as unknown as { styles: { cssText: string } }).styles.cssText);
    expect(styles).not.toMatch(/:hover|:active|transition|ripple|state-layer/);
    // The copy button is what is pressed: it answers as its own spec says.
    await copyButton(page, 'copy').locator('button').click();
    await expect.poll(() => writes(page)).toHaveLength(1);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`axe: ${theme} — every fixture`, async ({ page }) => {
      await mount(page, spec.fixtures, { theme });
      // With their colors: the fixtures the block highlights by itself are read once it has.
      for (const id of [...Object.keys(LANGUAGE_FIXTURES), 'auto-outlined', 'auto-small', 'auto-highlighted-lines', 'auto-marked', 'auto-japanese-comment']) await colors(page, id);
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`).join('; ')}`).toEqual([]);
    });
  }
});

/**
 * Where a block and its lines are, read from the document alone and the same way whether the element is defined or
 * not: the block's box, and for every line of the code the boxes of its rows — the rectangles of its characters, by
 * row — so a line that begins somewhere else, is another height or wraps at another column is seen.
 */
const geometry = (page: P) =>
  page.evaluate(() => {
    const round = (value: number) => Math.round(value * 1000) / 1000;
    return Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('[data-fixture]')].map((stage) => {
        const host = stage.querySelector('tanrei-code-block')!;
        const code = host.querySelector('code')!;
        const { left, top, width, height } = host.getBoundingClientRect();
        // The characters of the code: every text node that is not a mark's label.
        const texts: Text[] = [];
        const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) if (!node.parentElement!.closest('[data-line-label]')) texts.push(node);
        const lines: number[][][] = [];
        let open = document.createRange();
        let begun = false;
        const close = () => {
          const rows = new Map<number, number[]>();
          for (const rect of begun ? open.getClientRects() : []) {
            if (!rect.width) continue;
            const key = Math.round(rect.top);
            const row = rows.get(key);
            if (row) [row[0], row[2]] = [Math.min(row[0], rect.left), Math.max(row[2], rect.right)];
            else rows.set(key, [rect.left, rect.top, rect.right, rect.bottom]);
          }
          lines.push([...rows.values()].map((row) => row.map(round)));
          open = document.createRange();
          begun = false;
        };
        for (const node of texts) {
          for (let from = 0; from <= node.data.length; ) {
            const at = node.data.indexOf('\n', from);
            const to = at < 0 ? node.data.length : at;
            if (to > from) {
              if (!begun) open.setStart(node, from);
              open.setEnd(node, to);
              begun = true;
            }
            if (at < 0) break;
            close();
            from = at + 1;
          }
        }
        if (begun) close();
        return [stage.dataset.fixture!, { block: [left, top, width, height].map(round), lines }];
      }),
    );
  });
const settled = (page: P) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    void document.body.offsetWidth;
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
/** The fixtures drawn by `code.css` alone, with no script in the page; `define` then brings the element. */
async function undefinedFixtures(page: P, fixtures: Fixture[], dir?: 'ltr' | 'rtl') {
  const html = await fixturesDocument(spec, { fixtures, dir });
  const script = html.lastIndexOf('<script type="module">');
  await page.setContent(`${html.slice(0, script).replace('</head>', `<style>${read('dist/code.css')}</style></head>`)}</body></html>`);
  expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-code-block')].some((el) => el.matches(':defined')))).toBe(false);
  await settled(page);
  return async () => {
    await page.addScriptTag({ type: 'module', content: read('dist/tanrei.bundle.js') });
    await page.evaluate(async () => {
      await customElements.whenDefined('tanrei-code-block');
      await Promise.all([...document.querySelectorAll('tanrei-code-block')].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
    });
    await settled(page);
    await page.waitForTimeout(100);
    await settled(page);
  };
}
/** What a fixture's props say stands beside its lines, as `highlightToHtml` takes it. */
const besideLines = (props: Fixture['props']) =>
  Object.fromEntries(['lineNumbers', 'startLine', 'highlightedLines', 'addedLines', 'removedLines', 'highlightedLabel', 'addedLabel', 'removedLabel', 'prompt'].filter((name) => props[name] !== undefined).map((name) => [name, props[name]]));
/** The fixture as a build writes it: its lines made where the page is made, with what stands beside them. */
function built(f: Fixture): Fixture {
  const code = f.items ? f.items.map((item) => String(item.props.text)).join('') : String(f.props.code);
  const language = String(f.props.language ?? '');
  // A fixture that gives its runs: they are the highlighter's answer.
  if (f.items) H.setHighlighter(() => f.items!.map((item) => ({ text: String(item.props.text), syntax: item.props.syntax === undefined ? undefined : String(item.props.syntax) })));
  const inner = H.highlightToHtml(code, language || 'text', { lines: besideLines(f.props) });
  H.setHighlighter(undefined);
  if (typeof inner !== 'string') throw new Error(`the grammar of ${language} is not loaded`);
  return { ...f, items: undefined, content: `<pre translate="no" spellcheck="false"><code data-syntax-of="${language || 'text'}">${inner}</code></pre>` };
}
const lineCount = (id: string) => {
  const f = [...spec.fixtures, ...STEADY].find((each) => each.id === id)!;
  return (f.items ? f.items.map((item) => String(item.props.text)).join('') : String(f.props.code)).replace(/\n$/, '').split('\n').length;
};
type Geometry = { block: number[]; lines: number[][][] };
/** The same rows of the same lines, and no edge of the block or of a row further than `tolerance` from where it was. */
function steady(after: Geometry, before: Geometry, what: string, tolerance = 0.01) {
  expect(after.lines.map((rows) => rows.length), `${what}: the rows of each line`).toEqual(before.lines.map((rows) => rows.length));
  const [now, was] = [[after.block, ...after.lines.flat()].flat(), [before.block, ...before.lines.flat()].flat()];
  const moved = now.map((value, index) => Math.abs(value - was[index]));
  expect(Math.max(...moved), `${what}: ${JSON.stringify(after)} is not ${JSON.stringify(before)}`).toBeLessThanOrEqual(tolerance);
}
/** More than the spec's fixtures hold: the attributes a product writes, together. */
const STEADY: Fixture[] = [
  fx('steady-prompt-title-copy', { title: 'install.sh', prompt: '$', ...COPY, code: 'pnpm add @tanrei/web\n\npnpm build' }),
  fx('steady-prompt-numbers', { prompt: '>', lineNumbers: true, code: 'ls\ncd src\nls' }),
  fx('steady-prompt-wrapped', { prompt: '$', wrap: true, ...COPY, code: `echo ${'a long line of words '.repeat(8)}\necho done` }),
  fx('steady-long-prompt', { prompt: 'PS>', code: 'Get-ChildItem\nSet-Location src' }),
  fx('steady-label-copy', { languageLabel: 'Shell', ...COPY, size: 'small', code: 'ls' }),
  fx('steady-title-small-outlined', { title: 'a.js', size: 'small', variant: 'outlined', code: 'let a;\nlet b;' }),
  fx('steady-numbers-wrapped-marked', { lineNumbers: true, wrap: true, addedLines: '2', removedLines: '1', highlightedLines: '3', addedLabel: 'Added', removedLabel: 'Removed', highlightedLabel: 'Highlighted', ...COPY, code: `const a = '${'word '.repeat(30)}';\nconst b = 2;\nconst c = 3;` }),
  fx('steady-twelve-lines', { lineNumbers: true, title: 'twelve.txt', code: Array.from({ length: 12 }, (_, n) => `line ${n + 1}`).join('\n') }),
  fx('steady-rtl-title', { title: 'مثال', languageLabel: 'JavaScript', prompt: '$', ...COPY, code: 'ls' }),
  fx('steady-empty-title', { title: '', languageLabel: '', ...COPY, code: 'ls\nls' }),
  fx('steady-max-lines', { maxLines: 3, wrap: true, ...COPY, code: Array.from({ length: 7 }, (_, n) => `line ${n + 1}`).join('\n') }),
  fx('steady-max-lines-not-reached', { maxLines: 9, title: 'few.txt', code: 'one\ntwo' }),
];
/**
 * What a stylesheet cannot know of code that is NOT in the element's lines (text in the `<code>`): how many digits the
 * widest number has (it keeps room for one), how long the prompt is (it keeps room for one character). Such a block
 * is where the element will draw it only when its lines were written where the page was made.
 */
const knownAsText = (f: Fixture) => (!f.props.lineNumbers || String(Number(f.props.startLine ?? 1) + lineCount(f.id) - 1).length === 1) && String(f.props.prompt ?? '$').length === 1;

test.describe('before the element', () => {
  test('a block that is not upgraded is drawn by code.css alone — the fill, the corners, the padding, the code’s face — and a long line scrolls inside it; the code is in the document (COD-1 to COD-4)', async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>code</title>
      <style>${read('dist/tokens.css')}</style><style>${read('dist/code.css')}</style><style>body { margin: 16px; inline-size: 320px; }</style></head>
      <body><tanrei-code-block id="a"><pre><code>${LONG.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</code></pre></tanrei-code-block>
      <tanrei-code-block id="b" variant="outlined" size="small"><pre><code>const <span data-syntax="keyword">a</span> = 1;</code></pre></tanrei-code-block>
      <tanrei-code-block id="c" title="sizes.js" language-label="JavaScript" copy><pre><code>let a;</code></pre></tanrei-code-block></body></html>`);
    const [a, b, c] = [page.locator('#a'), page.locator('#b'), page.locator('#c')];
    expect(await a.evaluate((el) => el.matches(':defined'))).toBe(false);
    expect(await css(a, 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await px(a, 'border-top-left-radius')).toBe(await resolveToken(page, T('container-shape')));
    expect([await px(a.locator('pre'), 'padding-top'), await px(a.locator('pre'), 'padding-left')]).toEqual([await resolveToken(page, T('container-padding-block-medium')), await resolveToken(page, T('container-padding-inline-medium'))]);
    expect(await px(a.locator('pre'), 'font-size')).toBe(await resolveToken(page, T('code-typescale-medium-font-size')));
    expect(await a.locator('pre').evaluate((el) => [getComputedStyle(el).overflowX, el.scrollWidth > el.clientWidth, getComputedStyle(el).marginTop])).toEqual(['auto', true, '0px']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // The other look and size, and a run's role.
    expect(await css(b, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(b, 'box-shadow')).toContain('inset');
    expect(await px(b.locator('pre'), 'font-size')).toBe(await resolveToken(page, T('code-typescale-small-font-size')));
    expect(Number(await css(b.locator('[data-syntax]'), 'font-weight'))).toBeGreaterThan(Number(await css(b.locator('code'), 'font-weight')));
    // The text is the document's own.
    expect(await a.locator('code').textContent()).toBe(LONG);
    // COD-8: the header's words are drawn from the attributes, in their text styles and colors, and the code begins
    // header.padding-block-end below the row.
    expect(await c.evaluate((el) => [getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content])).toEqual(['"sizes.js"', '"JavaScript"']);
    expect(await css(c, 'color', '::before')).toBe(await resolveColor(page, T('title-color')));
    expect(await css(c, 'color', '::after')).toBe(await resolveColor(page, T('language-color')));
    expect(await px(c, 'font-size', '::before')).toBe(await resolveToken(page, T('title-typescale-font-size')));
    expect(await px(c.locator('pre'), 'padding-top')).toBe(await resolveToken(page, T('header-padding-block-end')));
  });

  // The rule every light-DOM stylesheet of Tanrei keeps: what is drawn before the element is defined is where the
  // element draws it. Every fixture and every combination of STEADY, in both layout directions, twice: with its lines
  // written where the page was made (highlightToHtml with the block's props), and with its code as text.
  for (const dir of ['ltr', 'rtl'] as const) {
    test(`nothing moves when the element is defined, ${dir}: a block whose lines were written where the page was made is drawn by code.css alone with its header, its copy button’s room, its numbers, signs, marks and prompt, and cut at max-lines — the block’s box and every row of every line are where the element draws them, to a hundredth of a pixel (COD-3, COD-6, COD-8, COD-9, COD-10, COD-13, COD-15, COD-16, COD-17, COD-20)`, async ({ page }) => {
      for (const language of H.languages()) await H.loadLanguage(language);
      const fixtures = [...spec.fixtures, ...STEADY].map(built);
      const define = await undefinedFixtures(page, fixtures, dir);
      // Drawn, before any script: a number, a sign, a prompt and a band are in the page.
      expect(await css(gutter(page, 'diff', 4), 'content', '::after')).toContain('−');
      expect(await css(gutter(page, 'line-numbers', 1), 'content', '::before')).toContain('1');
      expect(await css(line(page, 'terminal', 1).locator('[data-line-prompt]'), 'content', '::before')).toContain('$');
      expect(await css(line(page, 'highlighted-lines', 1), 'background-color')).toBe(await resolveColor(page, T('line-highlighted-container-color')));
      const before = await geometry(page);
      const lineNodes = await page.evaluate(() => {
        const w = window as unknown as { __lines: Element[]; __changes: number };
        w.__lines = [...document.querySelectorAll('[data-line], [data-line] *')];
        w.__changes = 0;
        new MutationObserver((records) => (w.__changes += records.length)).observe(document.querySelector('main')!, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-line', 'data-line-code', 'data-line-gutter', 'data-line-prompt', 'data-line-label', 'data-number', 'data-sign', 'data-prompt', 'data-highlighted', 'data-added', 'data-removed', 'data-syntax', 'aria-hidden', 'translate', 'spellcheck'] });
        return w.__lines.length;
      });
      await define();
      const after = await geometry(page);
      for (const f of fixtures) {
        expect(after[f.id].lines.length, f.id).toBe(lineCount(f.id));
        steady(after[f.id], before[f.id], f.id);
      }
      // And the element wrote nothing into the code: every node of every line is the one the page was made with.
      expect(await page.evaluate(() => { const w = window as unknown as { __lines: Element[]; __changes: number }; const now = [...document.querySelectorAll('[data-line], [data-line] *')]; return [w.__changes, now.length, now.every((node, index) => node === w.__lines[index])]; })).toEqual([0, lineNodes, true]);
    });

    test(`nothing moves when the element is defined, ${dir}: a block whose code is text is drawn by code.css alone with its header and with the room of its copy button, of a one-character prompt and of one-digit numbers and signs, and cut at max-lines (COD-3, COD-6, COD-8, COD-9, COD-10, COD-13, COD-16, COD-17, COD-20)`, async ({ page }) => {
      // Without `language`: what is measured is the element being defined, not its colors arriving (COD-28's own test).
      const fixtures = [...spec.fixtures, ...STEADY].map((f) => ({ ...f, props: Object.fromEntries(Object.entries(f.props).filter(([name]) => name !== 'language')) }));
      const define = await undefinedFixtures(page, fixtures, dir);
      const before = await geometry(page);
      await define();
      const after = await geometry(page);
      // The room of the numbers, the signs and a prompt is kept in `ch`, which a browser rounds to its layout unit once
      // where the element's boxes are each as wide as their glyphs: a line begins within a sixteenth of a pixel of
      // where it will. Everything else — the block, every row's height, a block with none of them — is exact.
      for (const f of fixtures.filter(knownAsText)) steady(after[f.id], before[f.id], f.id, f.props.lineNumbers || f.props.prompt || f.props.addedLines || f.props.removedLines ? 1 / 16 : 0.01);
      // What is left to lines written where the page is made: more digits, a longer prompt. The block itself is
      // where it will be, and its lines at their heights; only where a line begins is not known.
      const unknown = fixtures.filter((f) => !knownAsText(f)).map((f) => f.id);
      expect(unknown).toEqual(['line-numbers-start', 'syntax-marked', 'max-lines', 'steady-long-prompt', 'steady-twelve-lines']);
      for (const id of unknown) steady({ block: after[id].block, lines: [] }, { block: before[id].block, lines: [] }, id);
    });
  }

  test('defining the blocks of a page costs the page a few style passes and layouts between them, not some for each block: no block asks for a layout of its own, and a block whose lines the page was made with has none of them written again (COD-7, COD-29)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the counts of style passes and layouts are read from the Chromium protocol');
    for (const language of H.languages()) await H.loadLanguage(language);
    const BLOCKS = 30;
    const fixtures = Array.from({ length: BLOCKS }, (_, n) => built(fx(`cost-${n}`, n % 3 ? { language: 'tsx', ...COPY, code: String(fixture('auto-tsx').props.code) } : { language: 'sh', prompt: '$', lineNumbers: n % 2 === 0, ...COPY, code: 'pnpm add @tanrei/web\npnpm build' })));
    const define = await undefinedFixtures(page, fixtures);
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    const counts = async () => {
      const { metrics } = await session.send('Performance.getMetrics');
      const of = (name: string) => metrics.find((metric) => metric.name === name)!.value;
      return { styles: of('RecalcStyleCount'), layouts: of('LayoutCount') };
    };
    await page.evaluate(() => {
      const w = window as unknown as { __changes: number };
      w.__changes = 0;
      new MutationObserver((records) => (w.__changes += records.length)).observe(document.querySelector('main')!, { subtree: true, childList: true, characterData: true });
    });
    const before = await counts();
    await define();
    const after = await counts();
    await expect(page.locator('tanrei-code-block tanrei-copy-button')).toHaveCount(BLOCKS);
    // Measured: 5 style passes and 1 layout for thirty blocks, and for fifty. Before, 4 passes and 2 layouts for EACH.
    expect(after.styles - before.styles, 'style passes').toBeLessThanOrEqual(BLOCKS / 3);
    expect(after.layouts - before.layouts, 'layouts').toBeLessThanOrEqual(BLOCKS / 3);
    expect(await page.evaluate(() => (window as unknown as { __changes: number }).__changes), 'nodes written into the document').toBe(0);
  });

  test('the element draws itself without code.css: it adopts its light-DOM rules into the root that holds it, once', async ({ page }) => {
    await mount(page, only('diff', 'plain'));
    expect(await page.evaluate(() => [document.adoptedStyleSheets.length, [...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes('data-line-gutter')))])).toEqual([1, false]);
    expect(await css(gutter(page, 'diff', 1), 'position')).toBe('sticky');
    // In a shadow root of the product's own.
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-code-block line-numbers><pre><code>a\nb</code></pre></tanrei-code-block>';
      document.querySelector('.stage')!.append(outer);
    });
    const inner = page.locator('#outer tanrei-code-block [data-line-gutter]').first();
    await expect(inner).toHaveCount(1);
    expect(await css(inner, 'position')).toBe('sticky');
    expect(await page.evaluate(() => document.getElementById('outer')!.shadowRoot!.adoptedStyleSheets.length)).toBe(1);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, spec.fixtures);
  });

  test('every fixture draws its code, its look, its size and the parts its props name', async ({ page }) => {
    expect(spec.fixtures.length).toBe(48);
    for (const f of spec.fixtures) {
      const text = f.items ? f.items.map((item) => String(item.props.text)).join('') : String(f.props.code);
      expect(await codeText(page, f.id), f.id).toBe(text);
      await expect(lines(page, f.id), f.id).toHaveCount(text.replace(/\n$/, '').split('\n').length);
      expect(await css(container(page, f.id), 'background-color'), f.id).toBe(await resolveColor(page, T(`${String(f.props.variant ?? 'filled')}-container-color`)));
      expect(await px(pre(page, f.id), 'font-size'), f.id).toBe(await resolveToken(page, T(`code-typescale-${String(f.props.size ?? 'medium')}-font-size`)));
      await expect(header(page, f.id), f.id).toHaveCount(f.props.title || f.props.languageLabel ? 1 : 0);
      await expect(copyButton(page, f.id), f.id).toHaveCount(f.props.copy ? 1 : 0);
      await expect(host(page, f.id).locator('[data-number]'), f.id).toHaveCount(f.props.lineNumbers ? await lines(page, f.id).count() : 0);
      // No fixture scrolls its stage, and each is named.
      expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), f.id).toBe(true);
      const name = f.props.title ?? f.props.label;
      if (name) await expect(stage(page, f.id).getByRole('group', { name: String(name), exact: true }), f.id).toHaveCount(1);
      else await expect(stage(page, f.id).getByRole('group'), f.id).toHaveCount(0);
      // Colors: the runs the fixture gives; or the block's own, where it has a language its highlighter knows and
      // highlight is not false; or none.
      const own = !f.items && f.props.highlight !== false && H.languages().includes(String(f.props.language ?? ''));
      if (own) await colors(page, f.id);
      const expected = f.items ? mergedRuns(f.items.map((item) => [item.props.syntax && item.props.syntax !== 'plain' ? String(item.props.syntax) : '', String(item.props.text)])) : own && !f.props.addedLines && !f.props.removedLines ? await expectedRuns(text, String(f.props.language)) : null;
      if (expected) expect(await drawnRuns(host(page, f.id)), f.id).toEqual(expected);
      else if (!own) await expect(host(page, f.id).locator('[data-syntax]'), f.id).toHaveCount(0);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      // A fixture the block highlights by itself is compared with its colors, which arrive after the code is drawn.
      if (!f.items && f.props.highlight !== false && H.languages().includes(String(f.props.language ?? ''))) await colors(page, f.id);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

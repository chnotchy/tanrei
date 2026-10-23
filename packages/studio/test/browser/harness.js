// What every browser test shares: one Chromium per test file, and per test a layer file of its own, a mock of
// `tanrei studio` on a free port serving the built app (test/mock-server.mjs), and a page that is WATCHED — console
// errors, page errors, CSP violations and every request are collected, and `close()` fails the test if the page
// complained or talked to anyone but its own server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { leavesNothingBehind, tempDir } from '../../../tools/src/test-tmp.js';
import { startMockServer } from '../mock-server.mjs';

const appDir = process.env.TANREI_STUDIO_APP;
if (!appDir) throw new Error('run these through `pnpm test:browser` (test/browser/run.mjs builds the app and says where it is)');

let browser;
before(async () => (browser = await chromium.launch()));
after(async () => browser?.close());
leavesNothingBehind(after);

export const until = async (condition, what = 'condition', ms = 15_000) => {
  let last;
  for (const start = Date.now(); Date.now() - start < ms; ) {
    try {
      if (await condition()) return;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`timed out waiting for: ${what}${last ? ` (${last.message})` : ''}`);
};

/**
 * Runs in the page. Every pointer target that is the Studio's own — the light DOM outside the preview; a Tanrei
 * component keeps its own minimum — with the size a pointer lands on: the element's box, or what extends it (the
 * input laid over a segment's label, the `::after` laid under a fold's row). `ok` when that is `min` by `min` CSS
 * pixels at least (WCAG 2.2, 2.5.8) and the square on its centre is its own: nothing else answers there. `within`: a
 * selector — only the targets inside it (a modal sheet: what is under its scrim is not operable while it is open).
 */
function measureTargets({ min, within }) {
  const found = [];
  const shown = (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden], [inert], details:not([open]) > :not(summary)');
  const round = (n) => Math.round(n * 10) / 10;
  // A tab is found by its element as well as its role: a row of tabs without panels is a radio group, its tabs radios.
  for (const el of document.querySelectorAll('a[href], button, summary, input:not([type="hidden"]), select, textarea, [role="tab"], tanrei-tab, [role="treeitem"], [tabindex="0"]')) {
    if (el.disabled || el.closest('[data-scope]') || (within && !el.closest(within))) continue;
    // A radio or a checkbox is pressed on its label.
    const host = (el.matches('input[type="radio"], input[type="checkbox"]') && el.closest('label')) || el;
    if (!shown(host)) continue;
    let box = host.getBoundingClientRect();
    const size = [box.width, box.height];
    const extend = (width, height) => { size[0] = Math.max(size[0], width); size[1] = Math.max(size[1], height); };
    if (host !== el && getComputedStyle(el).position === 'absolute') extend(el.getBoundingClientRect().width, el.getBoundingClientRect().height);
    const after = getComputedStyle(host, '::after');
    if (after.content !== 'none' && after.position === 'absolute') extend(parseFloat(after.width) || 0, parseFloat(after.height) || 0);
    const target = { what: `${host.tagName.toLowerCase()}${typeof host.className === 'string' && host.className ? `.${host.className.trim().split(/\s+/).join('.')}` : ''}`, text: (el.getAttribute('aria-label') ?? host.textContent ?? '').trim().slice(0, 32), size: size.map(round) };
    // A box of 32 by 32 or more cannot be brought under the minimum by a neighbour that reaches a pixel or two into it.
    if (box.width >= 32 && box.height >= 32) {
      found.push({ ...target, own: true, ok: true });
      continue;
    }
    const mine = (x, y) => { const hit = document.elementFromPoint(x, y); return Boolean(hit) && (host.contains(hit) || hit === el); };
    let x, y;
    // Bring it into view clear of what is stuck to the top (the bar, and on a phone the preview): low in the window first.
    const reached = [0.8, 0.6, 0.9, 0.4, 0.2].some((at) => {
      host.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      box = host.getBoundingClientRect();
      scrollBy({ top: box.top + box.height / 2 - innerHeight * at, behavior: 'instant' });
      box = host.getBoundingClientRect();
      [x, y] = [box.left + box.width / 2, box.top + box.height / 2];
      return mine(x, y);
    });
    // Hit-testing snaps boxes and points to whole pixels: two pixels inside the square's edge is asked, not the edge.
    const reach = min / 2 - 2;
    const own = reached && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => mine(x + dx * reach, y + dy * reach));
    found.push({ ...target, own, reached, ok: own && size[0] >= min - 0.01 && size[1] >= min - 0.01 });
  }
  return found;
}

/** Everything the panel's column can hold: the rail's sections (src/ui/sections.ts), then Inspect's two tabs. */
export const VIEWS = ['color', 'neutral', 'typeface', 'size', 'radius', 'smoothing', 'icons', 'press', 'focus', 'base', 'dials', 'palettes', 'components', 'behavior', 'vocabulary', 'about', 'a11y', 'tokens', 'source'];

/**
 * @param {{ layer?: object, parents?: object[], viewport?: { width: number, height: number }, colorScheme?: 'light' | 'dark', locale?: string, server?: object, ready?: boolean }} [options]
 */
export async function openStudio({ layer = { id: 'acme', extends: 'tanrei' }, parents = [], viewport = { width: 1440, height: 1100 }, colorScheme = 'light', locale = 'en-US', server: serverOptions = {}, ready = true } = {}) {
  const dir = tempDir('studio-browser');
  const file = path.join(dir, `${layer.id}.system.json`);
  const write = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  write(file, layer);
  for (const parent of parents) write(path.join(dir, `${parent.id}.system.json`), parent);
  const server = await startMockServer({ file, appDir, ...serverOptions });
  const context = await browser.newContext({ viewport, colorScheme, locale });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const problems = [];
  const requests = [];
  /** Problems a test CAUSES on purpose (a 409, a 422) are the browser's own console lines about a failed request. */
  const expected = [];
  page.on('console', (message) => message.type() === 'error' && !expected.some((pattern) => pattern.test(message.text())) && problems.push(`console: ${message.text()}`));
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => console.error(`CSP ${event.violatedDirective} ${event.blockedURI}`)));
  await page.goto(server.url);
  await page.waitForSelector('[data-rail] [data-row]');
  if (ready) await page.waitForSelector('[data-save-state="saved"]');

  const onDisk = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  const scope = page.locator('[data-scope]');
  const choose = (group, value) => group.locator(`> tanrei-radio-button[data-value="${value}"], > tanrei-tab[data-value="${value}"]`).click();
  const section = async (name) => {
    await page.locator(`[data-rail] [data-row="${name}"]`).click();
    await page.waitForSelector(`[data-studio][data-section="${name}"][data-pane="edit"]`);
  };
  const inspect = async (tab) => {
    if (!(await page.locator('[data-inspect]').evaluate((el) => el.selected))) await page.locator('[data-inspect]').click();
    await page.waitForSelector('[data-studio][data-pane="tokens"], [data-studio][data-pane="source"]');
    await choose(page.locator('[data-inspect-tabs]'), tab);
    await page.waitForSelector(`[data-studio][data-pane="${tab}"]`);
  };
  return {
    page,
    server,
    dir,
    file,
    requests,
    problems,
    expected,
    onDisk,
    write,
    scope,
    lightPane: scope.locator('.ts-pane').first(),
    darkPane: scope.locator('.ts-pane').nth(1),
    /** One of a radio group's options, or one of a row of tabs: a person presses it, and so does this. */
    choose,
    /** Show a section of the rail in the panel, as a person does: press its row (src/ui/sections.ts names them). */
    section,
    /** Open Inspect at one of its tabs (`tokens`, `source`), as a person does: the bar's Inspect, then the tab. */
    inspect,
    /** A section, or a tab of Inspect: what the panel's column can hold. */
    view: (name) => (VIEWS.slice(-2).includes(name) ? inspect(name) : section(name)),
    /** Choose an option of a `<tanrei-select>`, a `<tanrei-combobox>` or a `<tanrei-combobox-field>` as a person does: open it, type towards the option, press it. */
    pick: async (host, label) => {
      const typed = host.locator('input[role="combobox"]');
      if (await typed.count()) await typed.fill(label);
      else {
        // A select: opened, then the label's first letters are typed — its own typeahead moves to the option, which a
        // long list (drawn only near where it is scrolled to) has no row for until then.
        await host.click();
        await host.locator('[role="option"]').first().waitFor();
        await page.keyboard.type(label.slice(0, 16), { delay: 10 });
      }
      await host.locator('[role="option"]').filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click();
    },
    /** The token tree's search: a text field. */
    search: (text) => page.locator('[data-search] input').fill(text),
    /** Wait until the FILE holds what the page was told. */
    saved: (predicate, what) => until(() => predicate(onDisk()), `saved: ${what}`).catch((error) => Promise.reject(new Error(`${error.message}\nthe file holds: ${fs.readFileSync(file, 'utf8')}`))),
    css: (locator, property) => locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property),
    /** Can this browser draw the family? (The check the Studio itself makes is tested against this one.) */
    installed: (family) => page.evaluate(async (name) => {
      await document.fonts.load(`72px "${name}"`).catch(() => {});
      const c = document.createElement('canvas').getContext('2d');
      const w = (f) => ((c.font = f), c.measureText('BESbswy mmwwll 0123').width);
      return ['monospace', 'serif', 'sans-serif'].some((g) => w(`72px ${g}`) !== w(`72px "${name}", ${g}`));
    }, family),
    axe: async (include, what) => {
      const report = await new AxeBuilder({ page }).include(include).analyze();
      assert.deepEqual(report.violations.map((violation) => `${violation.id}: ${violation.nodes.length} — ${violation.nodes[0]?.target}`), [], `axe: ${what}`);
    },
    /** Every pointer target of the Studio's own controls, as drawn now — or of those inside `within` — is 24 by 24 CSS pixels at least. Returns what it measured. */
    targets: async (what, within) => {
      const found = await page.evaluate(measureTargets, { min: 24, within });
      assert.deepEqual(found.filter((target) => !target.ok).map((target) => `${target.what} «${target.text}» ${target.size.join('×')}${target.own ? '' : target.reached ? ' — a neighbour answers inside it' : ' — could not be brought into view'}`), [], `${what}: a pointer target under 24 by 24`);
      return found;
    },
    /** No horizontal scrolling, and nothing sticking out of the viewport, inside `selector`. */
    fits: async (selector, what) => {
      const found = await page.evaluate((sel) => {
        const host = document.querySelector(sel);
        // Not drawn, or drawn inside something that scrolls or clips by itself (the JSON of the file, the Source editor).
        // (Up the tree as it is drawn: a row of tabs scrolls its tabs in a box inside its shadow root.)
        const above = (el) => el.assignedSlot ?? el.parentElement ?? el.getRootNode().host;
        // Of a component — its host and what is inside its shadow root — only a box that SCROLLS counts: one that cuts (a card's corners) would hide the fault.
        const holds = (up) => (up.getRootNode() instanceof ShadowRoot || up.localName.includes('-') ? ['auto', 'scroll'].includes(getComputedStyle(up).overflowX) : getComputedStyle(up).overflowX !== 'visible');
        const clipped = (el) => { for (let up = above(el); up; up = above(up)) if (up instanceof Element && holds(up) && up.getBoundingClientRect().right <= innerWidth + 1) return true; return false; };
        const hidden = (el) => el.closest('[hidden], details:not([open]) > :not(summary)') || getComputedStyle(el).position === 'absolute' || clipped(el);
        return { page: document.scrollingElement.scrollWidth, width: innerWidth, wide: [...host.querySelectorAll('*')].filter((el) => !hidden(el) && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > innerWidth + 1).map((el) => `<${el.tagName.toLowerCase()} class="${el.className}"> “${(el.textContent ?? '').trim().slice(0, 40)}” in ${el.closest('[data-panel]')?.getAttribute('data-panel') ?? el.parentElement?.className} (right edge ${Math.round(el.getBoundingClientRect().right)})`).slice(0, 5) };
      }, selector);
      assert.ok(found.page <= found.width && found.wide.length === 0, `${what}: ${JSON.stringify(found)}`);
    },
    async close() {
      await context.close();
      await server.close();
      fs.rmSync(dir, { recursive: true, force: true });
      assert.deepEqual(problems, [], 'no console errors, page errors or CSP violations');
      const origin = new URL(server.url).origin;
      assert.deepEqual(requests.filter((url) => !url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== origin), [], 'no request left the origin');
      assert.deepEqual(requests.filter((url) => url.includes(server.token)), [], 'no request URL carries the token');
    },
  };
}

/** `test()` with a Studio: opened before, closed (and its page's complaints asserted) after, whatever happens. */
export function studioTest(name, options, body) {
  test(name, async (t) => {
    const studio = await openStudio(typeof options === 'function' ? options(t) : options);
    let failed = false;
    try {
      await body(studio, t);
    } catch (error) {
      failed = true;
      // What the page complained about is usually WHY the body failed.
      if (studio.problems.length) error.message += `\nthe page said: ${studio.problems.join(' | ')}`;
      throw error;
    } finally {
      // A failure inside the body is the one to report; the page's complaints are asserted only after a clean run.
      if (failed) await studio.close().catch(() => {});
      else await studio.close();
    }
  });
}

// What a change of every token at once costs: a page of 2,000 elements with a mix of
// components changes its contrast — `data-tanrei-contrast` on the root, which swaps the system's colours — and the
// time to the second frame after it is held, in each engine, with and without reduced motion.
//
// What was measured (1,000 plain elements under the tokens, medians of 7, in ms):
//
//   the page's own sheet has                              Chromium   Firefox   WebKit
//   nothing                                                     12         9        9
//   `* { transition-duration: 0.01ms }`                        694        28      676    one registered property in the document
//   the same, no registered property in the document            19        33       10
//   `* { transition: color 1s }` (a transition starts)         689        18        8    one registered property in the document
//
// Three things multiply: the ten thousand custom properties every element inherits from the root, ONE registered
// custom property anywhere in the document (an inheriting one, in WebKit), and an element that is restyled while its
// `transition-property` is `all` (Chromium: with a duration above zero; WebKit: with any) — or, in Chromium, on which
// a transition starts. Each such element then costs about 0.7 ms instead of 0.01.
//
// The package takes the second factor out:
// `tokens.css` registers nothing, no element of a shadow root needs a registered name, and the link's and prose's
// stylesheets — which a page of text loads — register nothing either, and neither do the accordion's and the tree
// view's (src/styles/registered-properties.ts, and its test). So:
//
//   - a page of the tokens, the elements, links and prose has no registered property, and neither rule above costs it
//     anything, in any engine: the tests below hold a change of contrast within the same small budget with and without
//     the usual reduced-motion reset on the page, and the components' own state transitions starting (300 buttons:
//     278 ms in Chromium with a registered property, 44 without; the mixed page with links and prose: 370 ms and 46);
//   - a page that holds tree views and loads their stylesheet has none either, and is held to the same budget;
//   - in Chromium, where a registered property is dear, each of those pages is also measured against itself with one
//     property registered (`withinCleanBudget` below): a number of ms tells a clean page from a dear one on one
//     machine only;
//   - the README still tells a page what its own sheet must not do — a product may register a property of its own, or
//     load another library that does — and the last tests still hold that no rule of the package transitions every
//     property.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { EVERY_ANIMATION } from '../../test/motions.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

// The tests of this file run one after another in one worker, never beside each other. Each times a style engine that
// works on several threads, on a page of 2,000 elements or more, and a change timed while the other worker restyles a
// page as large is timed on half the machine. With every file's tests in parallel (the Playwright config), the two
// tests with tree views were timed at the same moment on a shard's two workers in each of fifteen CI runs. Firefox, the
// one where transitions start, in the CI-like container (4 CPUs, each change 50 ms after the one before rather than at
// rest as `drawn` makes it now, the median of 6 to 10 runs): 97 ms alone, 115 beside the other test with tree views,
// 131 beside two busy threads.
test.describe.configure({ mode: 'default' });

/** One screenful of a product: shadow-root components, stylesheet-drawn ones, links in prose, plain elements. */
const unit = (i: number) => `<section>
<h2>Section ${i}</h2>
<div class="tanrei-prose"><p>Text with <a href="#x">a link</a> in it, and <code>code</code>.</p><ul><li>One <span>thing</span></li><li>Another <span>thing</span></li></ul></div>
<p><a class="tanrei-link" href="#y">A link of its own</a></p>
<tanrei-button>Save</tanrei-button><tanrei-button variant="outlined">Cancel</tanrei-button><tanrei-button variant="text">More</tanrei-button>
<tanrei-checkbox>Agree</tanrei-checkbox><tanrei-checkbox checked>Checked</tanrei-checkbox>
<tanrei-switch>Wifi</tanrei-switch>
<tanrei-chip>Chip</tanrei-chip><tanrei-tag>Tag</tanrei-tag><tanrei-badge>3</tanrei-badge>
<tanrei-divider></tanrei-divider>
<tanrei-card><p>Card text</p></tanrei-card>
<tanrei-text-field label="Name"></tanrei-text-field>
<tanrei-progress-indicator value="0.4"></tanrei-progress-indicator>
<tanrei-slider></tanrei-slider>
<tanrei-list><tanrei-list-item>One</tanrei-list-item><tanrei-list-item>Two</tanrei-list-item></tanrei-list>
<tanrei-tabs><tanrei-tab>A</tanrei-tab><tanrei-tab>B</tanrei-tab></tanrei-tabs>
<tanrei-radio-group><tanrei-radio-button value="a">A</tanrei-radio-button><tanrei-radio-button value="b">B</tanrei-radio-button></tanrei-radio-group>
<table class="tanrei-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>a</td><td>1</td></tr><tr><td>b</td><td>2</td></tr></tbody></table>
</section>`;
const UNITS = 10;
/** A page of a product that writes with the package's prose and links: their stylesheets register no custom property either. */
const SHEETS = ['dist/tokens.css', 'dist/link.css', 'dist/prose.css', 'dist/table.css'];
/** A page of the tokens and the elements alone — a table's stylesheet registers nothing: no registered custom property in the document. */
const ELEMENTS = ['dist/tokens.css', 'dist/table.css'];
const main = Array.from({ length: UNITS }, (_, i) => unit(i)).join('');
const html = (css = '', sheets = SHEETS, body = main) => `<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8">${sheets.map((file) => `<style>${read(file)}</style>`).join('')}<style>body { margin: 0; color: var(--tanrei-sys-color-on-surface); background: var(--tanrei-sys-color-surface); }${css}</style></head><body><main>${body}</main><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

async function mount(page: Page, reducedMotion: boolean, css = '', sheets = SHEETS, body = main) {
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.setContent(html(css, sheets, body));
  await page.waitForFunction(() => ['tanrei-button', 'tanrei-switch', 'tanrei-tabs', 'tanrei-radio-group', 'tanrei-slider'].every((tag) => !!customElements.get(tag)));
  // Drawn and at rest: two frames, then the longest of the components' own first transitions.
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 600)))));
}

/** Every element of the page, through its shadow roots. */
const elements = (page: Page) =>
  page.evaluate(() => {
    const count = (root: Document | ShadowRoot): number => {
      let n = 0;
      for (const element of root.querySelectorAll('*')) n += 1 + (element.shadowRoot ? count(element.shadowRoot) : 0);
      return n;
    };
    return count(document);
  });

/**
 * The time, in ms, from a change made in the page to the second frame after it — the change is drawn, and the page
 * answers again — the median of `runs` changes; `change` is called with the run's number.
 *
 * Each change is made on a page at rest: every motion the change before started (the components' state transitions,
 * 250 ms) has ended first. A change made while they still run interrupts each of them, which is a dearer change, and
 * how many still ran depended on how fast the machine drew the change before (the next one came two frames and 50 ms
 * after it). Firefox, the page with trees where transitions start, in the CI-like container, the median of 4 or 5 runs:
 * 115 ms when the next change came 50 ms after, 69 at rest (4 CPUs); 198 and 124 (2 CPUs). Where motion is reduced,
 * and nothing runs, it is the same either way (70 to 86 ms and 64 to 70, 4 CPUs).
 */
const drawn = (page: Page, change: string, runs = 5) =>
  page.evaluate(
    async ({ change, runs, every }) => {
      const act = (0, eval)(`(${change})`) as (run: number) => void;
      const running = (0, eval)(every) as (root: Document) => Animation[];
      const times: number[] = [];
      for (let run = 0; run < runs; run++) {
        // (An animation that never ends, a spinner's, is not waited for.)
        await Promise.all(running(document).filter((motion) => Number(motion.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY).map((motion) => motion.finished.catch(() => undefined)));
        await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50))));
        const from = performance.now();
        act(run);
        // The style of the whole document is brought up to date here, in every engine: the time is the style engine's.
        void getComputedStyle(document.querySelector('main')!.lastElementChild!).color;
        await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        times.push(performance.now() - from);
      }
      return times.sort((a, b) => a - b)[Math.floor(times.length / 2)]!;
    },
    { change, runs, every: EVERY_ANIMATION },
  );

const CONTRAST = `(run) => document.documentElement.setAttribute('data-tanrei-contrast', run % 2 ? 'standard' : 'high')`;
/** The same change from wherever the page is: to the other contrast. */
const CONTRAST_TOGGLE = `() => document.documentElement.setAttribute('data-tanrei-contrast', document.documentElement.getAttribute('data-tanrei-contrast') === 'high' ? 'standard' : 'high')`;

/**
 * The most a change of contrast may take on this page (`SHEETS`: it loads the link's and prose's stylesheets, which
 * register nothing), in ms. Measured (load 12 to 16), the median of five changes on three pages: Chromium
 * 46 without the preference — each part that draws a color starts its state transition — and 22 with it; Firefox 69
 * and 33; WebKit 61 and 49. With four names registered by those two stylesheets the same change takes Chromium 370 ms
 * without the preference (a start is one of the dear cases above wherever a property is registered): Chromium's budget
 * is the one of a page with no registered property (`CLEAN_BUDGET` and `withinCleanBudget` below), which that fails. The others: about five
 * times the measured value — room for a busy machine and another engine version, none for the rule this guards
 * against (`UNIVERSAL` below: 1.8 s in WebKit while a registered property inherited, 70 s and 29 s on a page of 9,000).
 */
const BUDGET = { chromium: { 'no-preference': 150, reduce: 150 }, firefox: { 'no-preference': 400, reduce: 400 }, webkit: { 'no-preference': 400, reduce: 400 } } as const;

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`a change of contrast on 2,000 elements is drawn within its budget (motion: ${motion})`, async ({ page, browserName }) => {
    test.slow();
    await mount(page, motion === 'reduce');
    expect(await elements(page), 'the page is the size the budget was measured on').toBeGreaterThan(2000);
    expect(await registered(page), 'registered custom properties').toBe(0);
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-color-outline').trim());
    const standard = await color();
    const ms = await drawn(page, CONTRAST);
    test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName}, ${motion})` });
    // Five changes: the page ends on high contrast, and the tokens did change.
    expect(await color(), 'the contrast changed the tokens').not.toBe(standard);
    if (browserName === 'chromium') await withinCleanBudget(page, browserName, ms, motion === 'no-preference');
    else expect(ms, `the change is drawn within ${BUDGET[browserName][motion]} ms`).toBeLessThan(BUDGET[browserName][motion]);
  });
}

/**
 * The usual reduced-motion reset, as a page writes it: in its media query, a duration for every element and its two
 * pseudo-elements, and `transition-property` left at `all`.
 */
const RESET = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }';

/** How many custom properties the document has registered by a rule of its stylesheets (a registration from script is held by registered-properties.test.ts). */
const registered = (page: Page) =>
  page.evaluate(() => {
    let found = 0;
    const look = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule.constructor.name === 'CSSPropertyRule') found += 1;
        const inner = (rule as CSSGroupingRule).cssRules;
        if (inner) look(inner);
      }
    };
    for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) look(sheet.cssRules);
    return found;
  });

/**
 * The most a change of contrast may take on a page that has NO registered custom property (`ELEMENTS`: the tokens and
 * the elements), in ms — with the reset on the page or without, the preference set or not. Measured (load
 * 3 to 6, 2,036 elements), the median of 7: Chromium 44 without the preference and 35 with it, 47 with the reset;
 * WebKit 62, 50 and 52; Firefox as on the other page. With registered properties in the document (tokens
 * that register twenty-five) the same page takes Chromium 267 without the preference and
 * 260 with the reset, and WebKit 546 with the reset. Three to four times the measured value, and far under those.
 */
const CLEAN_BUDGET = { chromium: 150, firefox: 400, webkit: 400 } as const;

/** One registered custom property, as a page's own sheet or another library may bring one. */
const REGISTERED = `@property --restyle-perf-registered { syntax: '*'; inherits: false; }`;
/**
 * The most the change may take in Chromium on a page that is also compared with itself, in ms: what the other engines
 * are given, and about five times the dearest clean page on a fast machine (the page with trees, 70).
 */
const CHROMIUM_CEILING = 400;

/**
 * Holds that the change of contrast measured on this page (`ms`) is the one of a page with no registered property.
 * `dear`: a part of the page starts a transition, or the usual reset is on it — the cases a registered property makes
 * dear in Chromium.
 *
 * In Chromium, in those cases, no number of ms serves two machines. Measured as the median of five changes,
 * clean and then with `REGISTERED` added to the same page, on a fast machine (load 6 to 8): the page of the tokens
 * and the elements 35 and 213, with the reset 34 and 304; the page with links and prose 36 and 229, with the reset 38
 * and 301; 300 buttons 36 and 213; the page with trees — a larger page, and twice the time — 70 and 520, with
 * the reset 69 and 446. On the CI's runner (two slow cores, one worker) the clean page with trees took 176 and 166:
 * over the 150 a clean page is given, and not far under the 213 a dear page takes on the fast machine. So the page is
 * its own measure: one property is registered in it, the same change is measured again, and the clean page must have
 * taken less than half of that. It took between a ninth and a sixth of it on the fast machine, and between a seventh
 * and a fifth in the CI's image on the same machine (46 and 226, 90 and 550); a page that already pays for a
 * registered property takes all of it (the page with trees: 533, and 522 after). `CHROMIUM_CEILING` is held besides.
 * (Those numbers are of changes made 50 ms after the one before. Made at rest, as `drawn` makes them now, in the
 * CI-like container: between a seventh and a quarter, 37 and 195 for 300 buttons, 69 and 427 for the page with trees.)
 *
 * Elsewhere the number alone is held: in Firefox and WebKit, whose budgets that runner kept, and in Chromium where
 * nothing transitions — a registered property costs that page nothing (17 to 23 ms with it and without).
 */
async function withinCleanBudget(page: Page, browserName: 'chromium' | 'firefox' | 'webkit', ms: number, dear: boolean) {
  if (browserName !== 'chromium' || !dear) {
    expect(ms, `the change is drawn within ${CLEAN_BUDGET[browserName]} ms`).toBeLessThan(CLEAN_BUDGET[browserName]);
    return;
  }
  await page.addStyleTag({ content: REGISTERED });
  expect(await registered(page), 'registered custom properties, once the page registers one').toBe(1);
  // At rest again: adding a stylesheet restyles the document.
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 600)))));
  const registeredMs = await drawn(page, CONTRAST_TOGGLE);
  test.info().annotations.push({ type: 'measured', description: `${Math.round(registeredMs)} ms with one registered property on the same page (${browserName})` });
  expect(ms, `the change (${Math.round(ms)} ms) takes less than half of what it takes once the page registers one property (${Math.round(registeredMs)} ms): the page was not paying for one`).toBeLessThan(registeredMs / 2);
  expect(ms, `the change is drawn within ${CHROMIUM_CEILING} ms`).toBeLessThan(CHROMIUM_CEILING);
}

for (const [motion, css, what] of [
  ['no-preference', '', 'the components\' own transitions start'],
  ['reduce', '', 'motion is reduced'],
  ['reduce', RESET, 'motion is reduced and the page has the usual reset'],
] as const) {
  test(`a page of the tokens and the elements has no registered property, and a change of contrast is drawn within its budget where ${what}`, async ({ page, browserName }) => {
    test.slow();
    await mount(page, motion === 'reduce', css, ELEMENTS);
    expect(await elements(page), 'the page is the size the budget was measured on').toBeGreaterThan(2000);
    expect(await registered(page), 'registered custom properties').toBe(0);
    // The reset is on the page, and reaches its elements: one of them transitions every property.
    if (css) {
      const [property, duration] = await page.evaluate(() => [getComputedStyle(document.querySelector('main h2')!).transitionProperty, getComputedStyle(document.querySelector('main h2')!).transitionDuration]);
      expect(property).toBe('all');
      expect(Number.parseFloat(duration)).toBeGreaterThan(0);
    }
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-color-outline').trim());
    const standard = await color();
    const ms = await drawn(page, CONTRAST);
    test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName}, ${what})` });
    expect(await color(), 'the contrast changed the tokens').not.toBe(standard);
    await withinCleanBudget(page, browserName, ms, motion === 'no-preference' || css !== '');
  });
}

/**
 * 300 buttons, and nothing else: each starts its state transition when the contrast changes. 278 ms in Chromium while
 * the tokens registered properties (0.7 ms a part that starts a transition), 44 without (Firefox 40, WebKit 60, as
 * before). The budget is the clean page's: the 278 fail it.
 */
test('a change of contrast on 300 buttons, each starting its own transition, is drawn within the budget of a page with no registered property', async ({ page, browserName }) => {
  test.slow();
  const buttons = Array.from({ length: 300 }, (_, i) => `<tanrei-button${['', ' variant="outlined"', ' variant="text"'][i % 3]}>Button ${i}</tanrei-button>`).join('');
  await mount(page, false, '', ['dist/tokens.css'], buttons);
  expect(await page.locator('tanrei-button').count()).toBe(300);
  expect(await registered(page), 'registered custom properties').toBe(0);
  // What makes this page a dear one is counted while it is measured: the transitions each button's shadow root sees
  // run (the event does not leave the root). Not asked afterwards — a transition of 150 ms is over by the time a
  // later question arrives wherever a frame takes longer than that, as on a runner without a GPU; its `transitionrun`
  // is sent all the same, in the frame after the change, and `drawn` waits two frames after each change.
  await page.evaluate(() => {
    const runs = ((window as unknown as { transitionRuns: number[] }).transitionRuns = [] as number[]);
    document.querySelectorAll('tanrei-button').forEach((button, i) => {
      runs[i] = 0;
      button.shadowRoot!.addEventListener('transitionrun', () => runs[i]!++);
    });
  });
  const CHANGES = 5;
  const ms = await drawn(page, CONTRAST, CHANGES);
  test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName})` });
  // The transitions did start: in every one of the buttons, at every one of the changes.
  const runs = await page.evaluate(() => (window as unknown as { transitionRuns: number[] }).transitionRuns);
  expect(runs.length, 'buttons watched').toBe(300);
  expect(Math.min(...runs), 'transitions the least of the buttons started, over the changes measured').toBeGreaterThanOrEqual(CHANGES);
  await withinCleanBudget(page, browserName, ms, true);
});

/**
 * The same page with a tree in every section — ten trees of three levels and twenty-one rows each, drawn by
 * `tree-view.css` and `icons.css` — which would be a page with registered properties if
 * the tree view's stylesheet registered any: each part that starts a transition would then cost Chromium 0.7 ms. The
 * stylesheet registers nothing, and the page is held to the clean page's budget,
 * with the components' transitions starting and with the usual reset where motion is reduced.
 */
const tree = (i: number) =>
  `<tanrei-tree-view label="Files ${i}" selection="single"><ul>${Array.from(
    { length: 3 },
    (_, a) =>
      `<li data-value="${i}-${a}" data-open><span><i class="tanrei-icon" aria-hidden="true">folder</i>Folder ${a} <small data-supporting-text>kept</small><span data-trailing-text>${a + 3} files</span></span><ul>${Array.from(
        { length: 3 },
        (_, b) => `<li data-value="${i}-${a}-${b}" data-open><span>Part ${b}</span><ul><li data-value="${i}-${a}-${b}-0"><span><i class="tanrei-icon" aria-hidden="true">description</i>File</span></li></ul></li>`,
      ).join('')}</ul></li>`,
  ).join('')}</ul></tanrei-tree-view>`;
const WITH_TREES = Array.from({ length: UNITS }, (_, i) => `${unit(i)}${tree(i)}`).join('');
const TREE_SHEETS = [...SHEETS, 'dist/icons.css', 'dist/tree-view.css'];

for (const [motion, css, what] of [
  ['no-preference', '', 'the components\' own transitions start'],
  ['reduce', RESET, 'motion is reduced and the page has the usual reset'],
] as const) {
  test(`a page that holds tree views and loads their stylesheet has no registered property, and a change of contrast is drawn within the budget of a clean page where ${what}`, async ({ page, browserName }) => {
    test.slow();
    await mount(page, motion === 'reduce', css, TREE_SHEETS, WITH_TREES);
    await page.waitForFunction(() => !!customElements.get('tanrei-tree-view'));
    expect(await elements(page), 'the page is the size the budget was measured on').toBeGreaterThan(2000);
    // The trees are drawn: every row is a tree item, and a row of the third level begins two indents in.
    expect(await page.locator('tanrei-tree-view [role="treeitem"]').count()).toBe(UNITS * 21);
    expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector('tanrei-tree-view ul ul ul > li > :first-child')!).paddingLeft) - Number.parseFloat(getComputedStyle(document.querySelector('tanrei-tree-view > ul > li > :first-child')!).paddingLeft))).toBeGreaterThan(0);
    expect(await registered(page), 'registered custom properties').toBe(0);
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-color-outline').trim());
    const standard = await color();
    const ms = await drawn(page, CONTRAST);
    test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName}, ${what})` });
    expect(await color(), 'the contrast changed the tokens').not.toBe(standard);
    await withinCleanBudget(page, browserName, ms, true);
  });
}

/**
 * The page of a product that loads the link's and prose's stylesheets (`SHEETS`), with the usual reset on it and the
 * preference set. Those stylesheets register nothing, so the reset costs the page nothing in any engine: 618 ms in
 * WebKit while the link's line and a task's were registered and inherited, 272 ms in Chromium while any name was
 * registered. The budget is the clean page's.
 */
test('with the usual reduced-motion reset on a page that loads the link\'s and prose\'s stylesheets, a change of contrast is drawn within the budget of a page with no registered property', async ({ page, browserName }) => {
  test.slow();
  await mount(page, true, RESET);
  expect(await elements(page), 'the page is the size the budget was measured on').toBeGreaterThan(2000);
  expect(await registered(page), 'registered custom properties').toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('main h2')!).transitionProperty)).toBe('all');
  const ms = await drawn(page, CONTRAST);
  test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName})` });
  await withinCleanBudget(page, browserName, ms, true);
});

/**
 * The rule a page must not have, and no sheet of the package may: a transition of EVERY property — the initial
 * `transition-property` — given a duration on elements wholesale. It is the usual reduced-motion reset
 * (`transition-duration: 0.01ms !important` on `*`), and any `transition: all …`.
 */
const UNIVERSAL = '*, *::before, *::after { transition-duration: 0.01ms !important; }';

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`no element the package draws transitions every property (motion: ${motion})`, async ({ page }) => {
    await mount(page, motion === 'reduce');
    const all = () =>
      page.evaluate(() => {
        const seconds = (value: string) => Math.max(...value.split(',').map((part) => (part.trim().endsWith('ms') ? parseFloat(part) / 1000 : parseFloat(part))));
        const found: string[] = [];
        const look = (root: Document | ShadowRoot, where: string) => {
          for (const element of root.querySelectorAll('*')) {
            for (const pseudo of [undefined, '::before', '::after']) {
              const style = getComputedStyle(element, pseudo);
              if (pseudo && style.content === 'none') continue;
              // WebKit pays for `all` at any duration that a rule gave; no engine can tell a given 0s from the initial one, so a duration above zero is what is asked.
              if (style.transitionProperty.split(',').some((name) => name.trim() === 'all') && seconds(style.transitionDuration) > 0) found.push(`${where}${element.localName}${element.className && typeof element.className === 'string' ? `.${element.className}` : ''}${pseudo ?? ''}`);
            }
            if (element.shadowRoot) look(element.shadowRoot, `${where}${element.localName} » `);
          }
        };
        look(document, '');
        return [...new Set(found)];
      });
    expect(await all(), 'elements whose transition is of every property, with a duration').toEqual([]);
    // The look is seen to tell: with the rule on the page, the page's own elements are found (a shadow root's are not reached by it).
    await mount(page, motion === 'reduce', UNIVERSAL);
    expect((await all()).length, 'the same look finds the rule a page must not have').toBeGreaterThan(0);
  });
}

/**
 * One token set on the root from script. In WebKit the root's set of custom properties is compared with the one it
 * had, element by element, value by value until the first that differs — and every value that holds a `var()` is a new
 * object after the root is styled again, compared token by token: 2.3 s for 1,000 plain elements when the token that
 * changed is met late (`--tanrei-comp-menu-surface-min-width`), 10 ms when it is met at once, 10 ms in the other
 * engines either way. A set of another SIZE is not compared at all: the same token set together with a name the root
 * did not hold — or with the removal of one it held — took 7 ms. That is what a script that sets tokens on the root
 * can do (README), and this holds that it stays true: 82 ms on this page in WebKit, 9.9 s without the second name
 * (23 and 35 ms in Chromium and Firefox, with or without).
 */
const TOKEN_BUDGET = 500;
test('a token set on the root with a name the root did not hold is drawn within its budget', async ({ page, browserName }) => {
  test.slow();
  await mount(page, false);
  const ms = await drawn(
    page,
    `(run) => {
      const style = document.documentElement.style;
      style.setProperty('--tanrei-comp-menu-surface-min-width', (100 + run) + 'px');
      // The size of the root's set changes at every write: the name is added by one and removed by the next.
      if (style.getPropertyValue('--changed')) style.removeProperty('--changed');
      else style.setProperty('--changed', '1');
    }`,
  );
  test.info().annotations.push({ type: 'measured', description: `${Math.round(ms)} ms (${browserName})` });
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--tanrei-comp-menu-surface-min-width').trim())).toBe('104px');
  expect(ms, `the token is drawn within ${TOKEN_BUDGET} ms`).toBeLessThan(TOKEN_BUDGET);
});

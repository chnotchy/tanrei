// Which custom properties a page of the package has registered, and what the first element of a kind costs the page
// it arrives on.
//
// A registered custom property is paid for by the whole page: with ONE in the document — an `@property` rule or
// `CSS.registerProperty()`, used or not — every element on which a transition starts costs Chromium 0.7 ms a restyle
// on a page that carries the tokens, and with one that INHERITS every element whose `transition-property` is `all`
// costs WebKit the same (src/styles/restyle.perf.test.ts measures both). And a registration from script has the browser
// style every element of the document again. So this holds, in each engine:
//
//   - a page with the tokens and the elements — every element a shadow root draws, the switch and the calendar among
//     them, and every element a stylesheet draws, the tree view among them — has NO registered custom property: no
//     `@property` rule in any of its stylesheets, no call of `CSS.registerProperty()`, and no name the package ever
//     registered answers with an initial value;
//   - no stylesheet of `dist/` holds an `@property` rule, and no source of the package calls `CSS.registerProperty()`;
//   - the first of each element that once registered names, on a page of `N` unrelated elements, has the browser
//     style its own parts, not the page (Chromium's count of the elements styled, from its trace — never a time, which
//     is the machine's as much as the package's); on a page that did not load its stylesheet, the page once, for the
//     sheet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CDPSession, type Page, expect, test } from '@playwright/test';
import { RETIRED_NAMES } from './registered-properties.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's pages are served at (nothing is fetched from it). */
const PAGE = 'http://registered-properties.test/';

/** How many elements the page holds that have nothing to do with the one appended. */
const N = 2000;
const UNRELATED = Array.from({ length: N / 5 }, (_, n) => `<section><p>Paragraph ${n} <span>a</span> <b>b</b> <i>c</i></p></section>`).join('');

const html = (body: string, { css = [] as string[] } = {}) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style>${css.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}</head><body>${body}<div id="at"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

/** Every `CSS.registerProperty()` of the page is told to `window.__registered`, from before any of its scripts. */
async function watch(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __registered: string[] }).__registered = seen;
    if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') return;
    const register = CSS.registerProperty.bind(CSS);
    CSS.registerProperty = (definition) => {
      seen.push(definition.name);
      register(definition);
    };
  });
}
const fromScript = (page: Page) => page.evaluate(() => (window as unknown as { __registered: string[] }).__registered);

async function open(page: Page, document: string) {
  await page.unroute(PAGE);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: document }));
  await page.goto(PAGE);
  await page.evaluate(() => customElements.whenDefined('tanrei-button'));
  await rest(page);
}

/** The page at rest: its fonts answered, and `frames` frames drawn with nothing asked for in between. */
async function rest(page: Page, frames = 6) {
  await page.evaluate(async (count) => {
    await document.fonts.ready;
    for (let frame = 0; frame < count; frame++) await new Promise((done) => requestAnimationFrame(done));
  }, frames);
}

/**
 * Every `@property` rule the document can see: in its own stylesheets and the ones it adopted, through every grouping
 * rule (a rule in a layer, a media query or a `@supports` block registers as well). The rules of a shadow root's sheets
 * are not looked at: they register nothing, in any engine.
 */
const propertyRules = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    const look = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule.constructor.name === 'CSSPropertyRule') found.push((rule as CSSPropertyRule).name);
        const inner = (rule as CSSGroupingRule).cssRules;
        if (inner) look(inner);
      }
    };
    for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) look(sheet.cssRules);
    return found;
  });

/** Which of `names` the document has registered: a registered property has its initial value on the root, and one that is not has none. */
const answering = (page: Page, names: readonly string[]) =>
  page.evaluate((list) => {
    const root = getComputedStyle(document.documentElement);
    return list.filter((name) => root.getPropertyValue(name).trim() !== '');
  }, [...new Set(names)]);

/**
 * Every `@property` rule a stylesheet of `dist/` holds, by file: the whole of what the package registers for a page
 * (a registration from script is of these names alone, by the element whose stylesheet could not).
 */
const SHEETS = fs
  .readdirSync(path.join(pkg, 'dist'), { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.css'))
  .sort();
const rulesOf = (file: string) =>
  [...read(`dist/${file}`).matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)].map((match) => ({
    name: match[1]!,
    syntax: /syntax:\s*'([^']*)'/.exec(match[2]!)?.[1],
    inherits: /inherits:\s*(true|false)/.exec(match[2]!)?.[1] === 'true',
    initialValue: /initial-value:\s*([^;]*);/.exec(match[2]!)?.[1]?.trim(),
  }));

/** A rule that registers a name, for a page of the test's own: the looks below are seen to tell with it. */
const PROBE = '--_registered-probe';
const PROBE_RULE = `@property ${PROBE} { syntax: '<length>'; inherits: false; initial-value: 0px; }`;
/** Every name that is asked after: those the package once registered, the link's two that step, and the probe. */
const EVERY_NAME = [...RETIRED_NAMES, '--_link-held-image', '--_link-held-clip', PROBE];

test.describe('the custom properties a page has registered', () => {
  test('no stylesheet of the package registers a custom property — the tokens are the generated ones to the byte — and no source registers one from script', () => {
    const found = Object.fromEntries(SHEETS.map((file) => [file, rulesOf(file).map((rule) => rule.name)] as const).filter(([, rules]) => rules.length));
    expect(found).toEqual({});
    // The look is seen to tell: the same reading finds the rule of a sheet that has one.
    expect([...`${PROBE_RULE}`.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)].map((match) => match[1])).toEqual([PROBE]);
    expect(SHEETS).toContain('tree-view.css');
    // The sheet every page loads is the generated tokens, to the byte.
    expect(read('dist/tokens.css')).toBe(read('src/generated/tokens.css'));
    // No source of the package registers a property: a `CSS.registerProperty()` anywhere would escape every list here.
    const sources = fs
      .readdirSync(path.join(pkg, 'src'), { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.startsWith('generated'));
    expect(sources.length).toBeGreaterThan(100);
    // (In its code: a comment may name the call.)
    const code = (file: string) => read(`src/${file}`).split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
    expect(sources.filter((file) => /CSS\.registerProperty\(|\bregisterProperties\(/.test(code(file)))).toEqual([]);
    expect(/CSS\.registerProperty\(/.test('CSS.registerProperty({ name })'), 'the look is seen to tell').toBe(true);
    expect(new Set(RETIRED_NAMES).size, 'each name once').toBe(RETIRED_NAMES.length);
  });

  test('a page with the tokens alone has no registered custom property', async ({ page }) => {
    await watch(page);
    await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style></head><body><p>Text</p></body></html>` }));
    await page.goto(PAGE);
    expect(await propertyRules(page)).toEqual([]);
    expect(await answering(page, EVERY_NAME)).toEqual([]);
    expect(await fromScript(page)).toEqual([]);
    // The tree view's stylesheet, which registered five names, adds none.
    await page.addStyleTag({ content: read('dist/tree-view.css') });
    expect(await propertyRules(page)).toEqual([]);
    expect(await answering(page, EVERY_NAME)).toEqual([]);
    // The look is seen to tell: the same page with a stylesheet that registers a name answers with that name.
    await page.addStyleTag({ content: PROBE_RULE });
    expect(await propertyRules(page)).toEqual([PROBE]);
    expect(await answering(page, EVERY_NAME)).toEqual([PROBE]);
  });

  test('a page with the tokens and every element — a switch, a calendar, an accordion, a table that sorts, a table of contents, breadcrumbs and a tree view among them, at rest and moved — has no registered custom property, and nothing registers one from script', async ({ page }) => {
    await watch(page);
    // Every element the package defines, one of each, as the manifest lists them.
    const tags: string[] = (JSON.parse(read('custom-elements.json')) as { modules: { declarations?: { tagName?: string }[] }[] }).modules
      .flatMap((module) => module.declarations ?? [])
      .map((declaration) => declaration.tagName)
      .filter((tag): tag is string => !!tag)
      .sort();
    expect(tags).toContain('tanrei-switch');
    expect(tags).toContain('tanrei-calendar');
    expect(tags.length).toBeGreaterThan(40);
    expect(tags).toContain('tanrei-tree-view');
    // (The five that once registered the press of a row or a header, or a row's lengths, are given what they draw: a table registered nothing until a column sorted.)
    const drawn = SUBJECTS.filter((subject) => ['tanrei-accordion', 'tanrei-table-of-contents', 'tanrei-breadcrumbs', 'tanrei-table', 'tanrei-tree-view'].includes(subject.tag)).map((subject) => subject.html);
    expect(drawn).toHaveLength(5);
    await open(page, html(`<tanrei-switch id="switch" label="Switch"></tanrei-switch><tanrei-calendar id="calendar" value="2026-10-08"></tanrei-calendar>${drawn.join('')}${tags.map((tag) => `<${tag}></${tag}>`).join('')}`));
    const none = async (when: string) => {
      expect(await propertyRules(page), `@property rules, ${when}`).toEqual([]);
      expect(await answering(page, EVERY_NAME), `names that answer, ${when}`).toEqual([]);
      expect(await fromScript(page), `registered from script, ${when}`).toEqual([]);
    };
    await none('at rest');
    // The switch is switched and the calendar's month is changed — the two motions a registered progress once drew —
    // and each is seen on its way: the handle between its two places, the calendar's grid holding two months.
    const moved = await page.evaluate(async () => {
      const [toggle, calendar] = [document.getElementById('switch') as HTMLElement & { selected: boolean; updateComplete: Promise<unknown> }, document.getElementById('calendar') as HTMLElement & { updateComplete: Promise<unknown> }];
      const thumb = toggle.shadowRoot!.querySelector('.thumb')!;
      const place = () => Number.parseFloat(getComputedStyle(thumb).translate) || 0;
      const months = () => calendar.shadowRoot!.querySelector('.pages')!.getAttribute('data-moving');
      const seen = { places: [place()], months: [months()] };
      toggle.selected = true;
      (calendar.shadowRoot!.querySelector('.next') as HTMLElement).click();
      await Promise.all([toggle.updateComplete, calendar.updateComplete]);
      // Read once in the task that began them, before any frame — the handle's travel put half way through its time for
      // the reading and back to its beginning: a machine whose next frame comes after both motions have ended (they are
      // of the tokens' lengths) would otherwise see nothing on its way.
      void getComputedStyle(thumb).translate;
      const travel = toggle.shadowRoot!.getAnimations();
      for (const animation of travel) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) / 2;
      }
      seen.places.push(place());
      seen.months.push(months());
      for (const animation of travel) {
        animation.currentTime = 0;
        animation.play();
      }
      const until = performance.now() + 4000;
      do {
        await new Promise((done) => requestAnimationFrame(done));
        seen.places.push(place());
        seen.months.push(months());
      } while (performance.now() < until && (toggle.shadowRoot!.getAnimations().length > 0 || months() !== null));
      return seen;
    });
    const [from, to] = [moved.places[0]!, moved.places[moved.places.length - 1]!];
    expect(from).toBe(0);
    expect(to).toBeGreaterThan(0);
    expect(moved.places.filter((value) => value > from && value < to).length, `SWT-13: the handle between its ends (${moved.places.join(', ')})`).toBeGreaterThan(0);
    expect(moved.places[1]! > from && moved.places[1]! < to, `SWT-13: held half way through its time, the handle is between its ends (${moved.places[1]})`).toBe(true);
    expect(moved.months[1], 'CAL-14: the calendar on its way in the task that changed its month').not.toBe(null);
    expect(moved.months[0], 'CAL-14: the calendar at rest').toBe(null);
    expect(moved.months.filter((value) => value !== null).length, 'CAL-14: the calendar on its way').toBeGreaterThan(0);
    expect(moved.months[moved.months.length - 1], 'CAL-14: the calendar at rest again').toBe(null);
    await none('after a switch and a calendar moved');
  });

  test('a tree view registers nothing, in the document and in a shadow root of the product — where its stylesheet\'s rules would not count, and it once registered its names from script — and it reads its two lengths there all the same', async ({ page }) => {
    await watch(page);
    const tree = '<tanrei-tree-view label="Tree"><ul><li data-value="a" data-open><span>Item</span><ul><li data-value="b"><span>Inner</span></li></ul></li></ul></tanrei-tree-view>';
    /** The indent of a level and the pointer target, as the tree's real property computes them; and where the inner row's container begins. */
    const lengths = (root: 'document' | 'shadow') =>
      page.evaluate((where) => {
        const scope = where === 'document' ? document : document.getElementById('host')!.shadowRoot!;
        const element = scope.querySelector('tanrei-tree-view')!;
        const probe = document.body.appendChild(document.createElement('div'));
        probe.style.cssText = 'position:absolute;inline-size:var(--tanrei-comp-tree-view-level-indent-regular);block-size:var(--tanrei-sys-target-pointer)';
        const expected = [probe.getBoundingClientRect().width, probe.getBoundingClientRect().height];
        probe.remove();
        const rows = [...element.querySelectorAll('li > :first-child:not(ul)')];
        return { read: getComputedStyle(element).objectPosition.split(' ').map((length) => Number.parseFloat(length)), expected, inner: Number.parseFloat(getComputedStyle(rows[1]!, '::after').left) - Number.parseFloat(getComputedStyle(rows[0]!, '::after').left) };
      }, root);
    // In the document.
    await open(page, html('<div id="host"></div>'));
    await page.evaluate((markup) => document.getElementById('at')!.insertAdjacentHTML('beforeend', markup), tree);
    await rest(page);
    expect(await fromScript(page), 'in the document').toEqual([]);
    expect(await answering(page, EVERY_NAME)).toEqual([]);
    const inDocument = await lengths('document');
    expect(inDocument.read).toEqual(inDocument.expected);
    expect(inDocument.expected[0]).toBeGreaterThan(0);
    expect(inDocument.inner, 'the second level begins one indent further in').toBeCloseTo(inDocument.expected[0]!, 1);
    // In a product's shadow root: the stylesheet is adopted there.
    await open(page, html('<div id="host"></div>'));
    await page.evaluate((markup) => {
      const root = document.getElementById('host')!.attachShadow({ mode: 'open' });
      root.innerHTML = markup;
    }, tree);
    await rest(page);
    expect(await fromScript(page), 'in a shadow root').toEqual([]);
    expect(await answering(page, EVERY_NAME)).toEqual([]);
    const inShadow = await lengths('shadow');
    expect(inShadow.read).toEqual(inShadow.expected);
    expect(inShadow.inner, 'the second level begins one indent further in').toBeCloseTo(inShadow.expected[0]!, 1);
  });
});

/**
 * The elements Chromium styled from `script` — one task of the page — until the page is at rest again: the sum of
 * `elementCount` over every style pass of its trace (the timeline's own event; DevTools shows the same number).
 */
async function styled(page: Page, cdp: CDPSession, script: string): Promise<number> {
  const events: { args?: { elementCount?: number } }[] = [];
  const collect = (data: { value: unknown[] }) => void events.push(...(data.value as typeof events));
  cdp.on('Tracing.dataCollected', collect);
  await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'blink'] } });
  await cdp.send('Runtime.evaluate', { expression: `{ ${script} }; undefined` });
  await rest(page);
  const complete = new Promise((done) => cdp.once('Tracing.tracingComplete', done));
  await cdp.send('Tracing.end');
  await complete;
  cdp.off('Tracing.dataCollected', collect);
  const passes = events.filter((event) => typeof event.args?.elementCount === 'number');
  // A trace with no style pass in it is a trace that was not read, not a page that cost nothing.
  expect(passes.length, 'style passes in the trace').toBeGreaterThan(0);
  return passes.reduce((sum, event) => sum + event.args!.elementCount!, 0);
}

const append = (markup: string) => `document.getElementById('at').insertAdjacentHTML('beforeend', ${JSON.stringify(markup)})`;

interface Subject {
  /** The element. */
  tag: string;
  /** One instance. */
  html: string;
  /**
   * The stylesheet the page loads for it, where the element is drawn by one. Such an element on a page
   * that did not load its sheet hands the document the sheet, and the document is styled again for THAT (src/primitives/
   * sheets.ts: what is held there is "once"): the cost of a registration is told apart only where the sheet is loaded.
   */
  css?: string;
}

/**
 * The seven elements that once registered custom properties (src/styles/registered-properties.ts): the switch, the
 * calendar, the accordion, the table of contents, the breadcrumbs, the table and the tree view. None does now.
 */
const SUBJECTS: Subject[] = [
  { tag: 'tanrei-switch', html: '<tanrei-switch label="Switch"></tanrei-switch>' },
  { tag: 'tanrei-calendar', html: '<tanrei-calendar label="Calendar" value="2026-10-08"></tanrei-calendar>' },
  { tag: 'tanrei-accordion', css: 'accordion.css', html: '<tanrei-accordion><details><summary>Question</summary><div>Answer</div></details></tanrei-accordion>' },
  { tag: 'tanrei-table-of-contents', css: 'table-of-contents.css', html: '<tanrei-table-of-contents label="Contents"><ul><li><a href="#s">Section</a></li></ul></tanrei-table-of-contents>' },
  { tag: 'tanrei-breadcrumbs', css: 'breadcrumbs.css', html: '<tanrei-breadcrumbs label="Trail"><a href="#h">Home</a><span aria-current="page">Here</span></tanrei-breadcrumbs>' },
  // (A column that can be sorted: the press of its sort button is the one a registered property once held.)
  { tag: 'tanrei-table', css: 'table.css', html: '<tanrei-table><table><thead><tr><th scope="col" aria-sort="none" data-value="name"><button type="button">Name</button></th></tr></thead><tbody><tr><td>row</td></tr></tbody></table></tanrei-table>' },
  { tag: 'tanrei-tree-view', css: 'tree-view.css', html: '<tanrei-tree-view label="Tree"><ul><li data-value="a"><span>Item</span></li></ul></tanrei-tree-view>' },
];

/**
 * What the first instance may cost more than the second, in elements styled: its own parts styled a second time by a
 * first measurement, a first frame — a fixed number, a twentieth of the page. A registration from script costs the
 * page itself: `N` and more.
 */
const ALLOWANCE = N / 20;

test.describe('the first element of a kind that once needed a registered property', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the count of elements styled is read from Chromium\'s trace');

  for (const subject of SUBJECTS) {
    test(`${subject.tag}: the first one connected on a page of ${N} unrelated elements has the browser style its own, not the page`, async ({ page }) => {
      await watch(page);
      await open(page, html(UNRELATED, { css: subject.css ? [subject.css] : [] }));
      const cdp = await page.context().newCDPSession(page);
      const first = await styled(page, cdp, append(subject.html));
      const second = await styled(page, cdp, append(subject.html));
      await cdp.detach();
      test.info().annotations.push({ type: 'elements styled', description: `first ${first}, second ${second}` });
      expect(first, `elements styled for the first (for the second: ${second}; the page holds ${N})`).toBeLessThanOrEqual(second + ALLOWANCE);
      expect(await fromScript(page), 'nothing is registered from script').toEqual([]);
    });
  }

  // An element drawn by a stylesheet, on a page that did not load it, hands the document its sheet: the page is
  // styled again for that, once (src/primitives/sheets.ts) — and not a second time for a registration: neither the
  // sheet nor the element registers anything.
  for (const subject of SUBJECTS.filter((subject) => subject.css)) {
    test(`${subject.tag}: on a page that did not load ${subject.css} the first one connected has the page styled again once, for its sheet, and not again for a registration`, async ({ page }) => {
      await watch(page);
      await open(page, html(UNRELATED));
      const cdp = await page.context().newCDPSession(page);
      const first = await styled(page, cdp, append(subject.html));
      const second = await styled(page, cdp, append(subject.html));
      await cdp.detach();
      test.info().annotations.push({ type: 'elements styled', description: `first ${first}, second ${second}` });
      expect(first, `elements styled for the first (for the second: ${second}; the page holds ${N})`).toBeLessThanOrEqual(N + second + ALLOWANCE);
      expect(await fromScript(page), 'nothing is registered from script').toEqual([]);
    });
  }
});

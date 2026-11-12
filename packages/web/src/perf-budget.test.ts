// What the components cost at run time, counted rather than timed, against the budgets in perf-budgets.json
// (`runtime`). A count is the same on a fast machine and on a loaded runner, so a budget can be held; a time can only be
// reported (the components' own *.perf.test.ts report it beside their counts).
//
// The page is what a product ships: every element of the package (`@tanrei/web/all`) bundled with
// `process.env.NODE_ENV` defined as "production" — no debug report runs, and reads nothing — and every stylesheet, in
// the one file a product links for them (`@tanrei/web/tanrei.css`: the base, the tokens and every other stylesheet), once.
// Each stylesheet beside it as well would declare every token and every rule twice, which no product's page does.
//
//   forced   the passes building N copies of a component's first fixture forced the browser to style or lay out the
//            page for, in the task and the work it queued (a Chromium trace: the style and layout events that carry a
//            script's stack), at 100 against 10. Every component is held to 1: the hosts of one turn read the cascade
//            and the layout together after their renders (src/primitives/read-phase.ts), so a hundred instances cost
//            the passes ten do. A component that still reads in its own turn has a budget of its own (`forced`): the
//            growth it was measured at, a finding to bring down to 1. Paths the first fixtures do not take (another
//            fixture, or what is done to the instances once built: `VARIANTS`) are held to 1 the same way.
//   reads    what building N instances (or N items) reads of the page's layout and style — `getBoundingClientRect`,
//            `getClientRects`, the offset, client and scroll sizes, `getComputedStyle` — at 100 against 10: the reads
//            the 90 more cost. A read after a write makes the browser lay the page out again before it answers, so a
//            component whose every instance reads at build forces a layout per instance. 0 is a build that reads
//            nothing per instance.
//   updates  how many times the elements drew again (Lit's `updated`, every element counted) for one change of one
//            property: 1 is the change drawn once.
//   sheets   the stylesheets the instances' shadow roots adopt that are not shared, at 100 against 1: 0 is a component
//            whose every instance shares its sheets.
//
// Chromium only: the counts are the page's own and every engine makes them, but the budgets were measured in Chromium,
// and an engine that takes another branch (a style query it lacks) reads differently.
//
// A count over its budget is a finding. A count that falls is the budget's to follow: lower it in the same change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { loadSpec, stageMarkup, withoutIconFont } from '../test/harness.js';
import { motionAtItsOwnSpeed } from '../test/harsh.js';
import { twoFrames } from '../test/work-count.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

interface Budget {
  budget: number;
  measured: number;
}
const budgets = JSON.parse(read('perf-budgets.json')).runtime as Record<'forced' | 'reads' | 'updates' | 'sheets', Record<string, Budget>>;

/** `@tanrei/web/all` as a product's production build makes it. */
let bundle: Promise<string> | undefined;
const production = () =>
  (bundle ??= build({
    entryPoints: [path.join(pkg, 'dist/all.js')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
  }).then((result) => result.outputFiles[0]!.text));

/**
 * Counts, on `__perf`, every layout and style read the page makes from the start (`reads`), and every `updated` of a
 * Tanrei element by its tag (`updates`). Installed before the bundle runs, so the elements' own references to the
 * prototypes are the counted ones.
 */
function counters() {
  const perf = { reads: 0, updates: {} as Record<string, number> };
  (globalThis as { __perf?: typeof perf }).__perf = perf;
  const wrap = (owner: object, name: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name)!;
    if (descriptor.get) {
      const get = descriptor.get;
      Object.defineProperty(owner, name, {
        ...descriptor,
        get(this: unknown) {
          perf.reads++;
          return get.call(this);
        },
      });
    } else {
      const fn = descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(owner, name, {
        ...descriptor,
        value(this: unknown, ...args: unknown[]) {
          perf.reads++;
          return fn.apply(this, args);
        },
      });
    }
  };
  for (const name of ['getBoundingClientRect', 'getClientRects', 'clientWidth', 'clientHeight', 'clientTop', 'clientLeft', 'scrollWidth', 'scrollHeight', 'scrollTop', 'scrollLeft']) wrap(Element.prototype, name);
  for (const name of ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft', 'offsetParent']) wrap(HTMLElement.prototype, name);
  for (const name of ['getBoundingClientRect', 'getClientRects']) wrap(Range.prototype, name);
  wrap(window, 'getComputedStyle');
  // Every element class is defined by the bundle: its `updated` is counted from its definition on.
  const define = customElements.define;
  customElements.define = function (this: CustomElementRegistry, tag: string, element: CustomElementConstructor, options?: ElementDefinitionOptions) {
    const proto = element.prototype as { updated?: (...args: unknown[]) => unknown };
    const updated = proto.updated;
    if (tag.startsWith('tanrei-') && updated) {
      proto.updated = function (this: Element, ...args: unknown[]) {
        if (this.localName === tag) perf.updates[tag] = (perf.updates[tag] ?? 0) + 1;
        return updated.apply(this, args);
      };
    }
    return define.call(this, tag, element, options);
  };
}

/**
 * A page with every stylesheet of the package (`tanrei.css`, once), the counters, the production bundle, and an empty
 * `#pane`. The icon set names a family no machine has (`withoutIconFont`): its font is missing on every machine, as on
 * a page that has not loaded it yet. The default's family may be installed locally — a Mac with Material Symbols drew
 * every glyph and took none of the branches a missing face takes, where the Linux runner took them all — and a count
 * must not depend on which machine made it.
 */
async function budgetPage(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const head = `<meta charset="utf-8"><style>${read('dist/tanrei.css')}</style><style>body { margin: 0; }</style><script>(${counters.toString()})()</script>`;
  await page.setContent(`<!doctype html><html lang="en"><head>${head}</head><body><div id="pane"></div><script type="module">${await production()}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-chat-composer'));
  await withoutIconFont(page);
}

/** The counts from `act` to two frames after it (the work it queued for a microtask, an observer or a frame included). */
async function counted(page: Page, act: (page: Page) => Promise<unknown>) {
  await twoFrames(page);
  await page.evaluate(() => {
    const perf = (globalThis as unknown as { __perf: { reads: number; updates: Record<string, number> } }).__perf;
    perf.reads = 0;
    perf.updates = {};
  });
  await act(page);
  await twoFrames(page);
  await twoFrames(page);
  return page.evaluate(() => {
    const { reads, updates } = (globalThis as unknown as { __perf: { reads: number; updates: Record<string, number> } }).__perf;
    return { reads, updates: { ...updates }, drawn: Object.values(updates).reduce((sum, count) => sum + count, 0) };
  });
}

/** Builds `markup` in the emptied `#pane`, counted. */
const built = (page: Page, markup: string) =>
  counted(page, async () => {
    await page.evaluate(() => {
      document.querySelector('#pane')!.innerHTML = '';
    });
    await twoFrames(page);
    await page.evaluate((html) => {
      (globalThis as unknown as { __perf: { reads: number } }).__perf.reads = 0;
      document.querySelector('#pane')!.innerHTML = html;
    }, markup);
  });

const times = (n: number, item: (i: number) => string) => Array.from({ length: n }, (_, i) => item(i)).join('');

/** What building is measured at 10 and at 100: instances of a component, or items of one container. */
const BUILDS: Record<string, (n: number) => string> = {
  button: (n) => times(n, (i) => `<tanrei-button label="Button ${i}"></tanrei-button>`),
  'text-field, in error': (n) => times(n, (i) => `<tanrei-text-field label="Name ${i}" error error-text="Required"></tanrei-text-field>`),
  'menu, items': (n) => `<tanrei-menu open inline>${times(n, (i) => `<tanrei-menu-item label="Item ${i}"></tanrei-menu-item>`)}</tanrei-menu>`,
  'list, items': (n) => `<tanrei-list label="Many">${times(n, (i) => `<tanrei-list-item label="Item ${i}"></tanrei-list-item>`)}</tanrei-list>`,
  'dialog, closed': (n) => times(n, (i) => `<tanrei-dialog headline="Dialog ${i}">Body</tanrei-dialog>`),
  'side-sheet, closed': (n) => times(n, (i) => `<tanrei-side-sheet headline="Sheet ${i}">Body</tanrei-side-sheet>`),
  'popover, closed': (n) => times(n, (i) => `<tanrei-popover headline="Popover ${i}">Body</tanrei-popover>`),
  'chat-composer': (n) => times(n, (i) => `<tanrei-chat-composer label="Message ${i}"></tanrei-chat-composer>`),
};

/** One change of one property, on markup built first: the element `#it` and what is changed on it. */
const CHANGES: Record<string, { markup: string; change: (it: HTMLElement & Record<string, unknown>) => void }> = {
  'button, disabled': { markup: '<tanrei-button id="it" label="Save"></tanrei-button>', change: (it) => (it.disabled = true) },
  'text-field, value': { markup: '<tanrei-text-field id="it" label="Name"></tanrei-text-field>', change: (it) => (it.value = 'Ada') },
  'text-field, error': { markup: '<tanrei-text-field id="it" label="Name" error-text="Required"></tanrei-text-field>', change: (it) => (it.error = true) },
  'menu item, label': { markup: `<tanrei-menu open inline>${times(10, (i) => `<tanrei-menu-item${i ? '' : ' id="it"'} label="Item ${i}"></tanrei-menu-item>`)}</tanrei-menu>`, change: (it) => (it.label = 'Renamed') },
  'list item, label': { markup: `<tanrei-list label="Many">${times(10, (i) => `<tanrei-list-item${i ? '' : ' id="it"'} label="Item ${i}"></tanrei-list-item>`)}</tanrei-list>`, change: (it) => (it.label = 'Renamed') },
  'tabs, value': {
    markup: `<tanrei-tabs id="it" label="Many" value="v0">${times(10, (i) => `<tanrei-tab value="v${i}" label="Tab ${i}"></tanrei-tab>`)}${times(10, (i) => `<tanrei-tab-panel value="v${i}">Panel ${i}</tanrei-tab-panel>`)}</tanrei-tabs>`,
    change: (it) => (it.value = 'v5'),
  },
};

/** The instances whose shadow roots' adopted sheets are counted, at 1 and at 100. */
const SHEETS: Record<string, (n: number) => string> = {
  button: BUILDS.button!,
  'text-field': (n) => times(n, (i) => `<tanrei-text-field label="Name ${i}"></tanrei-text-field>`),
  'chat-composer': BUILDS['chat-composer']!,
};

/** The adopted stylesheets of every shadow root in `#pane` that are not the same object. */
const uniqueSheets = (page: Page) =>
  page.evaluate(() => {
    const sheets = new Set<CSSStyleSheet>();
    const visit = (root: ParentNode) => {
      for (const element of root.querySelectorAll('*')) {
        if (!element.shadowRoot) continue;
        for (const sheet of element.shadowRoot.adoptedStyleSheets) sheets.add(sheet);
        visit(element.shadowRoot);
      }
    };
    visit(document.querySelector('#pane')!);
    return sheets.size;
  });

const held = (kind: 'reads' | 'updates' | 'sheets', name: string, count: number, detail: string) => {
  const entry = budgets[kind][name];
  const line = `${kind} ${name}: ${count} (budget ${entry?.budget}, measured ${entry?.measured}); ${detail}`;
  console.log(`perf-budget ${line}`);
  test.info().annotations.push({ type: 'cost', description: line });
  expect(entry, `perf-budgets.json has no runtime.${kind}["${name}"]`).toBeTruthy();
  expect(count, line).toBeLessThanOrEqual(entry!.budget);
};

/**
 * The passes script forced the browser to style or lay out the page for while `act` ran and the work it queued settled
 * (two frames): the trace's `UpdateLayoutTree` and `Layout` events that carry a stack. A pass the frame makes for its
 * own paint has none. Each is named by the four innermost frames of its stack (in the minified bundle: a hint).
 */
async function forcedDuring(page: Page, act: () => Promise<unknown>): Promise<{ forced: number; at: Record<string, number> }> {
  const cdp = await page.context().newCDPSession(page);
  type Frame = { lineNumber: number; columnNumber?: number; functionName: string };
  const events: { name: string; args?: { beginData?: { stackTrace?: Frame[] } } }[] = [];
  cdp.on('Tracing.dataCollected', ({ value }) => events.push(...(value as unknown as typeof events)));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.stack'] }, transferMode: 'ReportEvents' });
  await act();
  await twoFrames(page);
  const complete = new Promise<void>((resolve) => cdp.once('Tracing.tracingComplete', () => resolve()));
  await cdp.send('Tracing.end');
  await complete;
  await cdp.detach();
  const forced = events.filter((event) => (event.name === 'Layout' || event.name === 'UpdateLayoutTree') && event.args?.beginData?.stackTrace?.length);
  const at: Record<string, number> = {};
  for (const event of forced) {
    const stack = event.args!.beginData!.stackTrace!.slice(0, 4).map((frame) => `${frame.functionName || '(anonymous)'}:${frame.lineNumber}:${frame.columnNumber ?? 0}`);
    const where = `${event.name} ${stack.join(' < ')}`;
    at[where] = (at[where] ?? 0) + 1;
  }
  return { forced: forced.length, at };
}

/** Every component, by its spec. */
const SPECS = fs
  .readdirSync(path.join(pkg, '../../specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => file.replace('.spec.json', ''))
  .sort();

/** What every component without a budget of its own is held to: 100 instances force at most one pass more than 10. */
const FORCED_GROWTH = 1;

/** A spec fixture's markup, by id. */
const fixtureMarkup = (name: string, id: string) => {
  const spec = loadSpec(name);
  return stageMarkup(spec, spec.fixtures.find((fixture) => fixture.id === id)!, 'data-copy');
};

/**
 * Paths a first fixture does not take, held to the same growth: building other markup, or what is done to every
 * instance once they are built (`act`, after `prepare`; only the act is traced). `motion`: the page does not ask for
 * reduced motion, for a path that moves.
 */
const VARIANTS: Record<string, { markup: () => string; motion?: boolean; prepare?: string; act?: string }> = {
  // CRL-32, CRL-36: the clock and the current dot's fill follow the autoplay interval, which the cascade gives.
  'carousel, autoplay with its progress fill': { markup: () => fixtureMarkup('carousel', 'autoplay-progress'), motion: true },
  // CRL-8: an arrangement (a new item width) stops the motion running, and the row comes to rest where it was put.
  'carousel, arranged while it moves': {
    markup: () => fixtureMarkup('carousel', 'centered'),
    motion: true,
    prepare: `for (const carousel of document.querySelectorAll('tanrei-carousel')) carousel.shadowRoot.querySelector('tanrei-button.next').click()`,
    act: `for (const carousel of document.querySelectorAll('tanrei-carousel')) carousel.itemWidth = 150`,
  },
  // SCA-8, SCA-10: content 1.4px past the box. The scroll extents round it to 1px, within the sentinel's thickness, so
  // the sizes find that it fits; the bottom sentinel, out of the box, says that it does not — the fit the intersection
  // observer tells, which asks whether anything inside takes focus.
  'scroll-area, its fit told by the sentinels': {
    markup: () => `<tanrei-scroll-area label="Messages" style="inline-size: 280px; block-size: 100px"><div style="block-size: 101.4px"></div></tanrei-scroll-area>`,
  },
};

// Harsh mode leaves these pages' motion at its own speed: its rate in Chromium is the DevTools protocol's Animation
// domain, with which the engine skips some of the passes counted here.
test.describe('forced passes do not grow with the number of instances (a Chromium trace)', motionAtItsOwnSpeed('the passes counted are the engine’s own work, which the Animation domain changes'), () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the passes are counted from a Chromium trace');

  test('every forced budget names a component, and allows more than every other component is held to', () => {
    for (const [name, entry] of Object.entries(budgets.forced)) {
      expect(SPECS, `runtime.forced["${name}"] names no spec`).toContain(name);
      expect(entry.budget, `runtime.forced["${name}"] is no wider than ${FORCED_GROWTH}: remove it`).toBeGreaterThan(FORCED_GROWTH);
    }
  });

  for (const name of SPECS) {
    test(`forced: ${name} — building its first fixture 100 times forces no more passes than 10 times do, but one`, async ({ page }) => {
      await budgetPage(page);
      const spec = loadSpec(name);
      const stage = stageMarkup(spec, spec.fixtures[0]!, 'data-copy');
      const build = async (n: number) => {
        await page.evaluate(() => {
          document.querySelector('#pane')!.innerHTML = '';
        });
        await twoFrames(page);
        return forcedDuring(page, () =>
          page.evaluate((html) => {
            document.querySelector('#pane')!.innerHTML = html;
          }, times(n, () => stage)),
        );
      };
      // The first build compiles what the others run, and loads what they draw with.
      await build(10);
      const small = await build(10);
      const large = await build(100);
      const growth = large.forced - small.forced;
      const entry = budgets.forced[name];
      const sites = Object.entries(large.at)
        .sort((a, b) => b[1] - a[1])
        .filter(([, count]) => count >= 50)
        .map(([where, count]) => `${count} × ${where}`);
      const line = `forced ${name}: ${growth} more at 100 than at 10 (${small.forced} → ${large.forced}; ${entry ? `budget ${entry.budget}, measured ${entry.measured}` : `held to ${FORCED_GROWTH}`})`;
      console.log(`perf-budget ${line}`);
      test.info().annotations.push({ type: 'cost', description: line });
      expect(growth, [line, ...sites].join('\n')).toBeLessThanOrEqual(entry?.budget ?? FORCED_GROWTH);
    });
  }

  for (const [name, variant] of Object.entries(VARIANTS)) {
    test(`forced: ${name} — 100 instances force no more passes than 10 do, but one`, async ({ page }) => {
      await budgetPage(page);
      if (variant.motion) await page.emulateMedia({ reducedMotion: 'no-preference' });
      const stage = variant.markup();
      const run = async (n: number) => {
        await page.evaluate(() => {
          document.querySelector('#pane')!.innerHTML = '';
        });
        await twoFrames(page);
        const build = () =>
          page.evaluate((html) => {
            document.querySelector('#pane')!.innerHTML = html;
          }, times(n, () => stage));
        if (!variant.act) return forcedDuring(page, build);
        await build();
        await twoFrames(page);
        await twoFrames(page);
        if (variant.prepare) await page.evaluate(variant.prepare);
        return forcedDuring(page, () => page.evaluate(variant.act!));
      };
      // The first run compiles what the others run, and loads what they draw with.
      await run(10);
      const small = await run(10);
      const large = await run(100);
      const growth = large.forced - small.forced;
      const sites = Object.entries(large.at)
        .sort((a, b) => b[1] - a[1])
        .filter(([, count]) => count >= 50)
        .map(([where, count]) => `${count} × ${where}`);
      const line = `forced ${name}: ${growth} more at 100 than at 10 (${small.forced} → ${large.forced}; held to ${FORCED_GROWTH})`;
      console.log(`perf-budget ${line}`);
      test.info().annotations.push({ type: 'cost', description: line });
      expect(growth, [line, ...sites].join('\n')).toBeLessThanOrEqual(FORCED_GROWTH);
    });
  }
});

test.describe('the run-time budgets (perf-budgets.json)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the budgets are measured in Chromium');

  test('every budget is a case here, and every case has a budget', () => {
    expect(Object.keys(budgets.reads).sort()).toEqual(Object.keys(BUILDS).sort());
    expect(Object.keys(budgets.updates).sort()).toEqual(Object.keys(CHANGES).sort());
    expect(Object.keys(budgets.sheets).sort()).toEqual(Object.keys(SHEETS).sort());
  });

  for (const [name, markup] of Object.entries(BUILDS)) {
    test(`reads: ${name} — what 90 more cost to build, in layout and style reads, is within its budget`, async ({ page }) => {
      await budgetPage(page);
      // The first build compiles what the others run, and loads what they draw with.
      await built(page, markup(10));
      const small = await built(page, markup(10));
      const large = await built(page, markup(100));
      held('reads', name, large.reads - small.reads, `${small.reads} reads at 10, ${large.reads} at 100`);
    });
  }

  for (const [name, { markup, change }] of Object.entries(CHANGES)) {
    test(`updates: ${name} — one change is drawn within its budget of updates`, async ({ page }) => {
      await budgetPage(page);
      await built(page, markup);
      const made = await counted(page, (p) => p.evaluate(`(${change.toString()})(document.querySelector('#it'))`));
      held('updates', name, made.drawn, JSON.stringify(made.updates));
    });
  }

  for (const [name, markup] of Object.entries(SHEETS)) {
    test(`sheets: ${name} — 99 more instances adopt no more unshared sheets than the budget`, async ({ page }) => {
      await budgetPage(page);
      await built(page, markup(1));
      const one = await uniqueSheets(page);
      await built(page, markup(100));
      const hundred = await uniqueSheets(page);
      held('sheets', name, hundred - one, `${one} distinct sheets at 1, ${hundred} at 100`);
    });
  }
});

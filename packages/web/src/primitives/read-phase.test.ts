// The frame's read phase (src/primitives/read-phase.ts), and the elements that read there instead of in their own turn.
//
// A read of a box or of a computed style made as an element is connected, or in its first update, has the browser style
// and lay out the page there and then; a page that is still loading pays for it once for every module that defines an
// element in a task of its own. What is held here, in every engine, as COUNTS (a time is the machine's):
//
//   - the phase runs every read it was asked for before any of the writes they return, once per owner, after the
//     frame's layout and before the frame is painted (between the frame's callbacks and an observer made anew in them);
//   - mounting ten closed menus with shortcuts, tables, app bars and navigation drawers in one task forces the browser
//     to style or lay out the page in that task and its microtasks as often as mounting one does — a read that follows
//     a write is one such pass; reads one after another are one — and what they read is in the first frame painted.
//     (The one pass these make is the debug build's question of availability, src/primitives/availability.ts: read for
//     every host of a turn together, once they have drawn, and not made in a production build.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { build } from 'esbuild';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's pages are served at (nothing is fetched from it). */
const PAGE = 'http://read-phase.test/';

async function open(page: Page, html: string) {
  await page.unroute(PAGE);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
}

/** The phase alone, as a script that puts `readInPhase` and `cancelPhaseRead` on `window.phase`. */
async function phaseScript(): Promise<string> {
  const result = await build({ entryPoints: [path.join(pkg, 'src/primitives/read-phase.ts')], bundle: true, write: false, format: 'iife', globalName: 'phase', target: 'es2022' });
  return result.outputFiles[0].text;
}

test.describe('the read phase', () => {
  test('every read runs before any write, once per owner, after the frame\'s layout and before it is painted; a request withdrawn is not run', async ({ page }) => {
    await open(page, `<!doctype html><html><body><div id="box" style="width: 100px"></div><script>${await phaseScript()}</script></body></html>`);
    const order = await page.evaluate(
      () =>
        new Promise<string[]>((done) => {
          const { readInPhase, cancelPhaseRead } = (window as unknown as { phase: typeof import('./read-phase.js') }).phase;
          const log: string[] = [];
          const box = document.getElementById('box')!;
          const a = {};
          const b = {};
          const c = {};
          // The frame's callbacks run before the phase; an observer the page makes anew in one of them is told after it,
          // though the page asked for its frame before any element asked for the phase.
          requestAnimationFrame(() => {
            log.push('frame callback');
            const after = new ResizeObserver(() => {
              after.disconnect();
              log.push(`painted with ${box.offsetWidth}`);
              done(log);
            });
            after.observe(document.documentElement);
          });
          readInPhase(a, () => {
            log.push('a: first request');
          });
          readInPhase(b, () => {
            log.push(`b reads ${box.offsetWidth}`);
            return () => {
              box.style.width = '200px';
              log.push('b writes');
            };
          });
          // A second request of the same owner replaces its first.
          readInPhase(a, () => {
            log.push(`a reads ${box.offsetWidth}`);
            return () => log.push('a writes');
          });
          readInPhase(c, () => {
            log.push('c');
          });
          cancelPhaseRead(c);
        }),
    );
    expect(order).toEqual(['frame callback', 'a reads 100', 'b reads 100', 'a writes', 'b writes', 'painted with 200']);
  });

  test('a read asked for while the phase runs is read in the next frame\'s phase, without an error of the observer', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await open(page, `<!doctype html><html><body><script>${await phaseScript()}</script></body></html>`);
    const frames = await page.evaluate(
      () =>
        new Promise<number[]>((done) => {
          const { readInPhase } = (window as unknown as { phase: typeof import('./read-phase.js') }).phase;
          let frame = 0;
          const count = () => {
            frame++;
            requestAnimationFrame(count);
          };
          requestAnimationFrame(count);
          const seen: number[] = [];
          const owner = {};
          readInPhase(owner, () => {
            seen.push(frame);
            return () => readInPhase(owner, () => {
              seen.push(frame);
              done(seen);
            });
          });
        }),
    );
    expect(frames[1] - frames[0]).toBe(1);
    expect(errors).toEqual([]);
  });
});

// ── The elements that read in the phase ──────────────────────────────────────────────────────────────────────────────

/** A page with the tokens, the stylesheets of the light-DOM elements here, an empty `#pane` and the bundle that defines every element. */
const pageHtml = () =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style><style>${read('dist/table.css')}</style><style>body { margin: 0; } #pane { inline-size: 320px; }</style></head><body><div id="pane"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

interface Subject {
  name: string;
  /** One instance. */
  html: (n: number) => string;
  /** What the instance read, as the first frame painted shows it (the page's own observer made anew in the frame's callback). */
  painted: string;
  /** What `painted` gives for the instance. */
  expected: unknown;
}

const SUBJECTS: Subject[] = [
  {
    // MNU-31: the shortcuts' form is the cascade's, read while the menu is open: a closed menu reads none.
    name: 'closed menu with shortcuts',
    html: (n) => `<tanrei-menu><tanrei-menu-item label="Cut ${n}" shortcut="mod+x"></tanrei-menu-item><tanrei-menu-item label="Copy ${n}" shortcut="mod+c"></tanrei-menu-item></tanrei-menu>`,
    painted: `(host) => host.open`,
    expected: false,
  },
  {
    // TBL-22: a table wider than its box scrolls, and is a focus stop and a region — in the first frame painted.
    name: 'table wider than its box',
    html: (n) => `<tanrei-table label="Table ${n}"><table><thead><tr>${Array.from({ length: 12 }, (_, c) => `<th>Column ${c}</th>`).join('')}</tr></thead><tbody><tr>${Array.from({ length: 12 }, (_, c) => `<td>value ${n}.${c}</td>`).join('')}</tr></tbody></table></tanrei-table>`,
    painted: `(host) => [host.getAttribute('role'), host.getAttribute('tabindex'), host.hasAttribute('data-more-end')]`,
    expected: ['region', '0', true],
  },
  {
    // APB-21: the window's class against sys.breakpoint.medium, read in the phase: a 320 wide window is compact, and a
    // responsive brand shows its symbol in the first frame painted.
    name: 'app bar with a responsive brand',
    html: (n) => `<tanrei-app-bar headline="Title ${n}" brand-label="Brand" brand-layout="responsive"><span slot="brand-symbol">S</span><span slot="brand-wordmark">Wordmark</span></tanrei-app-bar>`,
    painted: `(host) => [...host.children].filter((brand) => brand.getClientRects().length).map((brand) => brand.slot)`,
    expected: ['brand-symbol'],
  },
  {
    // NVD-57, NVD-61, NVD-62: the items at the offset given, in the first frame painted.
    name: 'navigation drawer with an offset',
    html: (n) =>
      `<tanrei-navigation-drawer label="Drawer ${n}" scroll-offset="40" style="block-size: 200px">${Array.from({ length: 20 }, (_, i) => `<tanrei-navigation-drawer-item value="d${i}" label="Destination ${i}"></tanrei-navigation-drawer-item>`).join('')}</tanrei-navigation-drawer>`,
    painted: `(host) => host.shadowRoot.querySelector('.items').scrollTop`,
    expected: 40,
  },
];

/**
 * From before any script of the page: every read of a computed style or a box while `window.__counting` is true that
 * follows a write — a pass the browser is made to style or lay out the page for — named by what was read and on what.
 * A write is a mutation of the document or of a shadow root in it (an attribute, a style, a child), or a root's list of
 * sheets assigned.
 */
async function watchPasses(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __counting: boolean; __passes: string[] };
    w.__counting = false;
    w.__passes = [];
    let written = true;
    const writes = new MutationObserver(() => undefined);
    const options = { subtree: true, attributes: true, childList: true, characterData: true };
    writes.observe(document, options);
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
      const root = attach.call(this, init);
      writes.observe(root, options);
      return root;
    };
    for (const proto of [Document.prototype, ShadowRoot.prototype]) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'adoptedStyleSheets');
      if (!descriptor?.set) continue;
      const set = descriptor.set;
      Object.defineProperty(proto, 'adoptedStyleSheets', {
        ...descriptor,
        set(this: Document | ShadowRoot, sheets: CSSStyleSheet[]) {
          written = true;
          set.call(this, sheets);
        },
      });
    }
    const read = (name: string, on: unknown) => {
      if (writes.takeRecords().length) written = true;
      if (!written) return;
      written = false;
      if (w.__counting) w.__passes.push(`${name} of ${(on as Element)?.localName ?? '?'}`);
    };
    const own = window.getComputedStyle;
    window.getComputedStyle = function (...args: Parameters<typeof getComputedStyle>) {
      const style = own.apply(this, args);
      // The style is computed when a value of it is read: that read is the pass.
      return new Proxy(style, {
        get(target, key) {
          const value = Reflect.get(target, key, target);
          if (typeof value === 'function') {
            return (...values: unknown[]) => {
              read(`style ${String(key)}`, args[0]);
              return (value as (...v: unknown[]) => unknown).apply(target, values);
            };
          }
          if (typeof key === 'string') read(`style ${key}`, args[0]);
          return value;
        },
      });
    };
    for (const name of ['getBoundingClientRect', 'getClientRects'] as const) {
      const method = Element.prototype[name] as (...args: unknown[]) => unknown;
      (Element.prototype as unknown as Record<string, unknown>)[name] = function (this: Element, ...args: unknown[]) {
        read(name, this);
        return method.apply(this, args);
      };
    }
    const getters: [object, string[]][] = [
      [Element.prototype, ['clientWidth', 'clientHeight', 'clientTop', 'clientLeft', 'scrollWidth', 'scrollHeight', 'scrollTop', 'scrollLeft']],
      [HTMLElement.prototype, ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft']],
    ];
    for (const [proto, names] of getters) {
      for (const name of names) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, name);
        if (!descriptor?.get) continue;
        const get = descriptor.get;
        Object.defineProperty(proto, name, {
          ...descriptor,
          get(this: Element) {
            read(name, this);
            return get.call(this);
          },
        });
      }
    }
  });
}

/**
 * Appends `count` instances in one task, and returns the passes forced in that task and its microtasks — until every
 * element in the pane has updated — and what `painted` gives for each instance in the first frame painted after it.
 */
const mount = (page: Page, subject: Subject, count: number) =>
  page.evaluate(
    async ({ markup, painted }) => {
      const w = window as unknown as { __counting: boolean; __passes: string[] };
      const pane = document.getElementById('pane')!;
      pane.replaceChildren();
      // The page at rest: nothing owed from before is counted.
      for (let frame = 0; frame < 2; frame++) await new Promise((done) => requestAnimationFrame(done));
      w.__passes = [];
      w.__counting = true;
      pane.insertAdjacentHTML('beforeend', markup);
      const all = [...pane.querySelectorAll('*')] as (Element & { updateComplete?: Promise<unknown> })[];
      for (let turn = 0; turn < 4; turn++) await Promise.all(all.map((element) => element.updateComplete));
      w.__counting = false;
      const passes = w.__passes.splice(0);
      const read = (0, eval)(painted) as (host: Element) => unknown;
      const shown = await new Promise<unknown[]>((done) =>
        requestAnimationFrame(() => {
          const observer = new ResizeObserver(() => {
            observer.disconnect();
            done([...pane.children].map((host) => read(host)));
          });
          observer.observe(document.documentElement);
        }),
      );
      return { passes, shown };
    },
    { markup: Array.from({ length: count }, (_, n) => subject.html(n)).join(''), painted: subject.painted },
  );

test.describe('elements that read the layout or the cascade in the frame\'s read phase', () => {
  for (const subject of SUBJECTS) {
    test(`${subject.name}: ten mounted in one task force no more styles or layouts in it than one does, and the first frame painted shows what they read`, async ({ page }) => {
      await watchPasses(page);
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, pageHtml());
      await page.evaluate(() => customElements.whenDefined('tanrei-table'));
      // A first one, for what is asked once for a page (whether the browser answers style queries, the sheets' question).
      await mount(page, subject, 1);
      const one = await mount(page, subject, 1);
      const ten = await mount(page, subject, 10);
      test.info().annotations.push({ type: 'passes', description: `1 → ${JSON.stringify(one.passes)}; 10 → ${JSON.stringify(ten.passes)}` });
      expect(ten.passes, 'passes forced by mounting ten').toEqual(one.passes);
      expect(one.passes.length, `passes forced by mounting one: ${one.passes.join(', ')}`).toBeLessThanOrEqual(1);
      expect(ten.shown).toEqual(Array.from({ length: 10 }, () => subject.expected));
    });
  }
});

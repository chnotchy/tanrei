// Where the package's probes stand (src/primitives/probe-place.ts): an element the package puts in the page for the
// instant it is measured — the style queries' probe, the box of the window `windowBox()` reads — goes at the end of the
// body once there is one, never into the root element. A child put in or taken out of the root element has Firefox
// style the whole body again, each way: it marks the root element for the rules that look at a child's place among its
// siblings, and the light-DOM stylesheets' rules whose last part names no tag or class are tried on the body and the
// head too (about 200 ms each way on the documentation's Button page, against about 10 ms at the end of the body). So
// what is counted here is the root element's children coming and going, not a time, which is the machine's as much as
// the package's; and the window's box is still the window's where the body would hold a fixed probe in a box of its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's pages are served at (nothing is fetched from it but what is routed here). */
const PAGE = 'http://probe-place.test/';

/** What came and went: the root element's children other than the head and the body, and the probes put in the body. */
interface Seen {
  root: string[];
  body: string[];
}

/** What a child of the body or the root element was, by its shape: the style queries' probe, the window's, or another. */
function watch(page: Page) {
  return page.addInitScript(() => {
    const seen: Seen = { root: [], body: [] };
    (window as unknown as { __probes: Seen }).__probes = seen;
    const kind = (node: Element) => {
      if (node.shadowRoot?.querySelector('[data-tanrei-style-query-probe]')) return 'style queries';
      if (node instanceof HTMLElement && node.style.position === 'fixed' && node.style.visibility === 'hidden') return 'window';
      return node.localName;
    };
    new MutationObserver((records) => {
      for (const record of records) {
        const where = record.target === document.documentElement ? 'root' : record.target === document.body ? 'body' : null;
        if (!where) continue;
        for (const node of [...record.addedNodes]) {
          if (!(node instanceof Element) || node === document.head || node === document.body) continue;
          const what = kind(node);
          if (where === 'root' || what === 'style queries' || what === 'window') seen[where].push(what);
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const seen = (page: Page) => page.evaluate(() => (window as unknown as { __probes: Seen }).__probes);

test('MNU-35: the style queries\' probe a loading page asks is put at the end of the body, and taken out of it; nothing is put in the root element', async ({ page }) => {
  await watch(page);
  // A menu asks when it is drawn (MNU-35); so do the others that read a choice of kind.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style></head><body><tanrei-menu open><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-menu><tanrei-button label="Button"></tanrei-button><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
  await page.evaluate(() => customElements.whenDefined('tanrei-menu'));
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const { root, body } = await seen(page);
  expect(body, 'the probe was asked, in the body').toContain('style queries');
  expect(root, 'what was put in the root element').toEqual([]);
  expect(await page.evaluate(() => [...document.body.children].some((child) => child.shadowRoot?.querySelector('[data-tanrei-style-query-probe]'))), 'the probe is taken out').toBe(false);
});

/** A page of `body`, in a document whose body has the style `bodyStyle`, with the modal primitives as they are built. */
async function windowPage(page: Page, bodyStyle: string) {
  await page.route(PAGE, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html { margin: 0 } body { margin: 0 37px; ${bodyStyle} }</style></head><body><p>Content</p></body></html>` }),
  );
  for (const file of ['modal.js', 'probe-place.js']) {
    await page.route(`${PAGE}${file}`, (route) => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: read(`dist/primitives/${file}`) }));
  }
  await page.goto(PAGE);
}

/** What `windowBox()` reads, and the window's own box as an element fixed to it, a child of the root element, has it. */
const boxes = (page: Page) =>
  page.evaluate(async () => {
    const { windowBox } = (await import('/modal.js' as string)) as { windowBox(root: HTMLElement): { left: number; right: number } };
    const read = windowBox(document.documentElement);
    const fixed = document.createElement('div');
    fixed.style.cssText = 'position: fixed; left: 0; right: 0; top: 0; height: 0';
    document.documentElement.append(fixed);
    const { left, right } = fixed.getBoundingClientRect();
    fixed.remove();
    return { read, window: { left, right } };
  });

test('NVD-97, MDL-2: the window\'s box is read from a probe at the end of the body, and is the window\'s, not the body\'s', async ({ page }) => {
  await watch(page);
  await windowPage(page, '');
  const { read, window } = await boxes(page);
  expect(read).toEqual(window);
  const { root, body } = await seen(page);
  expect(body).toEqual(['window']);
  // The test's own element is the one child the root element was given.
  expect(root).toEqual(['div']);
});

for (const [what, style] of [
  ['a transform', 'transform: translateX(11px)'],
  ['a filter', 'filter: blur(0px)'],
  ['layout containment', 'contain: layout'],
  ['a container', 'container-type: inline-size'],
  ['a promised transform', 'will-change: transform'],
] as const) {
  test(`NVD-97, MDL-2: where the body holds what is fixed in a box of its own (${what}), the window's box is read from a child of the root element`, async ({ page }) => {
    await watch(page);
    await windowPage(page, style);
    const { read, window } = await boxes(page);
    expect(read).toEqual(window);
    const { root, body } = await seen(page);
    expect(body).toEqual([]);
    expect(root).toEqual(['window', 'div']);
  });
}

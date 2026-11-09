// The CSS zoom an element is drawn at (`cssZoom()`, src/primitives/layout-scale.ts), which every surface placed against
// its anchor by script places itself by (src/zoom.test.ts). Where an engine has no `Element.currentCSSZoom` it is found
// from the computed `zoom` of the element and its ancestors in the flat tree, never from the element's box: a surface is
// measured while its entrance scales it (a menu's from 0.96), and a box drawn at 0.96 of its size is not a zoom of 0.96.
// So the same answers are asked of it here twice, in every engine: with the engine's `currentCSSZoom`, and with it taken
// away — under nested zooms, through a shadow root and a slot, in the top layer, and on a transformed element in it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { build } from 'esbuild';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The address the test's page is served at (nothing is fetched from it). */
const PAGE = 'http://layout-scale.test/';

/** The module alone, as a script that puts `cssZoom` and `layoutScale` on `window.scale`. */
async function scaleScript(): Promise<string> {
  const result = await build({ entryPoints: [path.join(pkg, 'src/primitives/layout-scale.ts')], bundle: true, write: false, format: 'iife', globalName: 'scale', target: 'es2022' });
  return result.outputFiles[0].text;
}

/** Each element by id, and the zoom it is drawn at: its own times its ancestors' in the flat tree. */
const EXPECTED: Record<string, number> = {
  outer: 1.5,
  inner: 3,
  plain: 3,
  half: 1.5,
  slotted: 4.5,
  'in-shadow': 4.5,
  dialog: 1.5,
  scaled: 1.5,
  'in-scaled': 1.5,
  none: 1,
};

async function open(page: Page) {
  const html = `<!doctype html><html><body style="margin: 0">
    <div id="outer" style="zoom: 1.5">
      <div id="inner" style="zoom: 2"><div id="plain">plain</div><div id="half" style="zoom: 50%">half</div></div>
      <div id="host"><div id="slotted">slotted</div></div>
      <dialog id="dialog"><div style="width: 100px; height: 20px"></div></dialog>
      <div id="scaled" popover="manual" style="transform: scale(0.96); width: 120px; height: 40px; padding: 0; border: 0">
        <div id="in-scaled" style="width: 100px; height: 20px"></div>
      </div>
    </div>
    <div id="none" style="width: 100px; height: 20px"></div>
    <script>${await scaleScript()}</script>
  </body></html>`;
  await page.unroute(PAGE);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
  await page.evaluate(() => {
    const root = document.getElementById('host')!.attachShadow({ mode: 'open' });
    root.innerHTML = '<div style="zoom: 3"><slot></slot><div id="in-shadow">in the shadow tree</div></div>';
    (document.getElementById('dialog') as HTMLDialogElement).showModal();
    document.getElementById('scaled')!.showPopover();
  });
}

/** What `cssZoom()` answers for each element, with the engine's `currentCSSZoom` or without it. */
function answers(page: Page, without: boolean) {
  return page.evaluate(
    ({ ids, without }) => {
      const { cssZoom } = (window as unknown as { scale: typeof import('./layout-scale.js') }).scale;
      const host = document.getElementById('host')!;
      const find = (id: string) => document.getElementById(id) ?? host.shadowRoot!.getElementById(id)!;
      const own = Object.getOwnPropertyDescriptor(Element.prototype, 'currentCSSZoom');
      if (without) Object.defineProperty(Element.prototype, 'currentCSSZoom', { configurable: true, get: () => undefined });
      try {
        return Object.fromEntries(ids.map((id) => [id, cssZoom(find(id))]));
      } finally {
        if (without) {
          if (own) Object.defineProperty(Element.prototype, 'currentCSSZoom', own);
          else delete (Element.prototype as { currentCSSZoom?: number }).currentCSSZoom;
        }
      }
    },
    { ids: Object.keys(EXPECTED), without },
  );
}

test.describe('the CSS zoom an element is drawn at', () => {
  test('nested zooms multiply, a percentage counts as its fraction, a slotted element takes its slot’s, the top layer takes its ancestors’, and a transform is never a zoom — with currentCSSZoom and without it', async ({ page }) => {
    await open(page);
    const close = (expected: Record<string, number>) => Object.fromEntries(Object.entries(expected).map(([id, zoom]) => [id, expect.closeTo(zoom, 6)]));
    expect(await answers(page, false), 'with the engine’s currentCSSZoom, where it has one').toEqual(close(EXPECTED));
    expect(await answers(page, true), 'from the computed zoom up the flat tree').toEqual(close(EXPECTED));
    // The transformed element is drawn at 0.96 of its zoomed size: what its box is drawn at over what it is laid out at
    // is not its zoom.
    const drawn = await page.evaluate(() => {
      const { layoutScale } = (window as unknown as { scale: typeof import('./layout-scale.js') }).scale;
      return layoutScale(document.getElementById('scaled')!).x;
    });
    expect(drawn).toBeCloseTo(1.5 * 0.96, 3);
  });
});

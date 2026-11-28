// affected: each component — the page is the whole bundle, read from disk; each test names the component it acts on.
//
// What an interaction costs the page in passes a SCRIPT forced: style recalculations and layouts the browser made
// because a script read the cascade or a box while something was still to be styled (a Chromium trace: the
// `UpdateLayoutTree` and `Layout` events that carry a script's stack). The frame styles and lays the page out for its
// paint by itself, and a read in its read phase (src/primitives/read-phase.ts) — after that layout, before the paint —
// finds nothing left to do. A read anywhere else after a write (the task of the event, a microtask after it, a frame
// callback before the frame's own style) has the browser do it there and then, for the whole page: a product that has
// just switched its theme pays for its whole page once more for each such read.
//
// What is held, each as an exact count of 0 — counted, not timed (a time is the machine's as much as the package's):
//   - a glyph's name kept through a render, with the page restyled in the same task (a theme chosen, its checkbox
//     checked): whether the ink's family changed too is read in the read phase, not in the turn of the render
//     (src/primitives/glyph.ts);
//   - an anchored surface opened by a click: the frame's check of what its placement depends on is read in the read
//     phase, not in the frame's callbacks before the frame has styled the page (src/primitives/anchored.ts,
//     src/primitives/follow.ts);
//   - the pointer coming onto a row whose text is cut: the tooltip's waits are read in the read phase, not in the
//     `pointerenter`, after the page has just written something for the pointer (src/primitives/cut-text.ts).
//
// Chromium only: the passes are counted from its trace.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { rootTokens, withoutIconFont } from '../../test/harness.js';
import { motionAtItsOwnSpeed } from '../../test/harsh.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/**
 * `@tanrei/web/all` as a product's production build makes it — no debug report runs, and reads nothing — but not
 * minified, so that a pass's stack names the functions that forced it.
 */
let bundle: Promise<string> | undefined;
const production = () =>
  (bundle ??= build({
    entryPoints: [path.join(pkg, 'dist/all.js')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
  }).then((result) => result.outputFiles[0]!.text));

/**
 * A page of `markup` with every stylesheet of the package, once (`tanrei.css`), and the production bundle, at rest. The
 * icon set names a family no machine has (`withoutIconFont`): a count must not depend on whether the machine has it.
 */
async function open(page: Page, markup: string) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tanrei.css')}</style><style>body { margin: 0; }</style></head><body>${markup}<script type="module">${await production()}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-chat-composer'));
  await withoutIconFont(page);
  await frames(page, 4);
}

/** `count` frames, each to its end: a task after its callbacks, when its style, layout, observers and paint have run. */
const frames = (page: Page, count: number) =>
  page.evaluate(
    (left) =>
      new Promise<void>((resolve) => {
        const frame = (n: number) => requestAnimationFrame(() => setTimeout(() => (n > 1 ? frame(n - 1) : resolve())));
        frame(left);
      }),
    count,
  );

type Frame = { lineNumber: number; columnNumber?: number; functionName: string };
type TraceEvent = { name: string; ph: string; ts: number; dur?: number; pid: number; tid: number; args?: { beginData?: { stackTrace?: Frame[] } } };

/** A pass a script forced, and whether it was forced in a frame's callbacks (`requestAnimationFrame`). */
interface Forced {
  pass: string;
  inFrame: boolean;
}

/**
 * The passes a script forced while `act` ran and for four frames after it: every style recalculation and layout that
 * carries a script's stack (a pass the frame makes for its own paint carries none), each named by the innermost frames
 * of its stack, and whether it was made inside a frame's callbacks (the trace's `FireAnimationFrame`).
 */
async function forcedDuring(page: Page, act: () => Promise<unknown>): Promise<Forced[]> {
  const cdp = await page.context().newCDPSession(page);
  const events: TraceEvent[] = [];
  cdp.on('Tracing.dataCollected', ({ value }) => events.push(...(value as unknown as TraceEvent[])));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.stack'] }, transferMode: 'ReportEvents' });
  await act();
  await frames(page, 4);
  const complete = new Promise<void>((resolve) => cdp.once('Tracing.tracingComplete', () => resolve()));
  await cdp.send('Tracing.end');
  await complete;
  await cdp.detach();
  const callbacks = events.filter((event) => event.ph === 'X' && event.name === 'FireAnimationFrame');
  return events
    .filter((event) => event.ph === 'X' && (event.name === 'Layout' || event.name === 'UpdateLayoutTree') && !!event.args?.beginData?.stackTrace?.length)
    .sort((a, b) => a.ts - b.ts)
    .map((event) => ({
      pass: `${event.name} ${event.args!.beginData!.stackTrace!.slice(0, 5).map((frame) => frame.functionName || '(anonymous)').join(' < ')}`,
      inFrame: callbacks.some((callback) => callback.pid === event.pid && callback.tid === event.tid && callback.ts <= event.ts && event.ts <= callback.ts + (callback.dur ?? 0)),
    }));
}

/** Says what was counted, and holds it to none. */
function noneForced(forced: Forced[], what: string) {
  const passes = forced.map(({ pass, inFrame }) => `${pass}${inFrame ? ' (in a frame callback)' : ''}`);
  test.info().annotations.push({ type: 'passes', description: `${passes.length} forced: ${passes.join('; ')}` });
  expect(passes, `passes a script forced ${what}`).toEqual([]);
}

// Harsh mode leaves these pages' motion at its own speed: its rate in Chromium is the DevTools protocol's Animation
// domain, with which the engine skips some of the passes counted here.
test.describe('passes an interaction forces (a Chromium trace)', motionAtItsOwnSpeed('the passes counted are the engine’s own work, which the Animation domain changes'), () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the passes are counted from a Chromium trace');

  test('tanrei-checkbox, tanrei-list: checked and chosen in the task that restyles the whole page (a theme chosen), no glyph reads the cascade before the frame does', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const boxes = Array.from({ length: 10 }, (_, n) => `<tanrei-checkbox label="Option ${n}"></tanrei-checkbox>`).join('');
    const items = ['a', 'b', 'c', 'd'].map((value) => `<tanrei-list-item value="${value}" label="Look ${value}"></tanrei-list-item>`).join('');
    await open(page, `${boxes}<tanrei-list selection="single" label="Look" value="a">${items}</tanrei-list>`);
    // Each glyph has been read once, as a page that has been shown has read them.
    const choose = (theme: string, value: string) =>
      forcedDuring(page, () =>
        page.evaluate(
          ([theme, value]) => {
            document.documentElement.setAttribute('data-tanrei-theme', theme);
            for (const box of document.querySelectorAll('tanrei-checkbox')) (box as unknown as { checked: boolean }).checked = !(box as unknown as { checked: boolean }).checked;
            (document.querySelector('tanrei-list') as unknown as { value: string }).value = value;
          },
          [theme, value],
        ),
      );
    await choose('dark', 'b');
    noneForced(await choose('light', 'c'), 'by the hosts’ renders');
    // And the marks are what they were: nothing about the glyphs changed.
    const marks = await page.evaluate(() => [...document.querySelectorAll('tanrei-checkbox, tanrei-list-item')].map((host) => host.shadowRoot!.querySelectorAll('[data-drawn]').length));
    expect(new Set(marks).size, `marks ${marks.join(',')}`).toBe(1);
  });

  test('tanrei-popover: opened by a click on its opener, no frame callback after it reads what the frame has not styled and laid out yet', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, `<div style="padding: 120px"><tanrei-button id="opener" label="Storage">Storage</tanrei-button></div><tanrei-popover anchor="opener" label="Storage" headline="Storage">Files in the trash still count toward your storage.</tanrei-popover>`);
    // The product answers the popover's request, as a product does.
    await page.evaluate(() => {
      const popover = document.querySelector('tanrei-popover') as HTMLElement & { open: boolean };
      popover.addEventListener('toggle', (event) => (popover.open = (event as unknown as CustomEvent<{ open: boolean }>).detail.open));
    });
    // Clicked where it is, with the mouse: a locator's click waits for the element in frame callbacks of its own.
    const at = (await page.locator('#opener').boundingBox())!;
    const click = () => page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    const isOpen = () => page.evaluate(() => (document.querySelector('tanrei-popover') as unknown as { open: boolean }).open);
    // Opened once and closed: what the first opening loads and compiles is not counted.
    for (const want of [true, false]) {
      await click();
      await frames(page, 4);
      expect(await isOpen(), 'the click toggled it').toBe(want);
    }
    const forced = await forcedDuring(page, click);
    expect(await isOpen(), 'the click opened it').toBe(true);
    test.info().annotations.push({ type: 'passes of the click', description: forced.map(({ pass }) => pass).join('; ') });
    // The passes of the click's own task and its microtasks are its press and its placement, which must be in place
    // before any frame; what follows it is counted in the frames' callbacks, before the frame's own style.
    noneForced(
      forced.filter((pass) => pass.inFrame),
      'in the frames’ callbacks after the click',
    );
  });

  test('tanrei-list-row: the pointer coming onto a row whose headline is cut, in a page that answers the pointer too, reads no style in its pointerenter, and the tooltip still opens after its show delay', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, `<div id="region" style="inline-size: 160px; padding: 40px"><tanrei-list-row headline="A headline far too long to be drawn whole in this row"></tanrei-list-row></div>`);
    // A show delay longer than what is traced (the move, four frames and harsh mode's wait after an action): the
    // tooltip's own opening, after it, is not the pointerenter's.
    await rootTokens(page, { '--tanrei-comp-tooltip-motion-show-delay': '1500ms' });
    // The page marks the region the pointer is over before the row hears it (a product's own hover highlight): the
    // page has something to style again when the row's pointerenter runs.
    await page.evaluate(() => {
      let over = 0;
      document.addEventListener('pointerover', (event) => (document.getElementById('region')!.style.outlineWidth = `${(event.target as Element).closest('#region') ? ++over : 0}px`), { capture: true });
    });
    const row = page.locator('tanrei-list-row');
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 80);
    await frames(page, 2);
    const forced = await forcedDuring(page, () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2));
    noneForced(forced, 'by the pointer coming onto the row');
    await expect.poll(() => row.evaluate((el) => !!el.shadowRoot!.querySelector<HTMLElement & { open: boolean }>('tanrei-tooltip')?.open)).toBe(true);
  });
});

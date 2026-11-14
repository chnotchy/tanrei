// Whether a middle-button press reaches the page where a test aims it.
//
// Playwright's WebKit on macOS sends a middle-button press — and only that button — through a CGEvent and back, to
// set the button's number on it (`WebPageInspectorInputAgent::platformDispatchMouseEvent` in its patch of WebKit); the
// left and the right buttons go to the page as the NSEvent that was aimed. For some stretches of time a middle press
// does not arrive where it was aimed. Seen on 2026-11-14 from about 10:08 to 10:25 (the session locked, the display
// asleep), and earlier and later the same morning not: every middle press arrived at one point, (183, 1115) in a
// 1280 × 720 page, whether it was aimed at (1255, 17) or at (120, 192) and wherever the mouse had been — outside the
// page, so the root element took it, with `pointerdown`, `pointerup` and `auxclick` and no `mousedown` — every time,
// at a load of 5, while the left and the right buttons were aimed. `locator.click({ button: 'middle' })` then waits out
// the test's time with "<html> intercepts pointer events" (Playwright's own check of where its press went): the
// navigation drawer's NVD-59, the accordion's ACC-36 and the menu's MNU-54 each failed so, every time they ran. What starts and ends such a stretch was not found; it is the
// machine's, not the test's timing nor the page's. Linux's WebKit, Chromium and Firefox are not affected.
//
// So a test that presses the middle button asks `middlePressAimed()` first, before anything it opens could be closed
// by a press elsewhere, and leaves its middle presses out where the answer is false. The answer is measured, not
// assumed: in every engine one middle press goes to a probe of the helper's own, and none of its events reaches the
// page's listeners. Where it lands elsewhere in WebKit on macOS, the test is annotated (`MIDDLE_PRESS_LEFT_OUT`) and
// goes on without its middle presses, which the other engines, and WebKit whenever it aims them, still make; anywhere
// else that is a failure, with where the press landed.
import { type Page, test } from '@playwright/test';

/** The annotation of a test that left its middle presses out, because the engine did not land one where it was aimed. */
export const MIDDLE_PRESS_LEFT_OUT = 'middle press left out';

interface Landed {
  aimed: boolean;
  at: string;
  x: number;
  y: number;
}

/**
 * Whether a middle-button press lands where it is aimed in `page`, now. Press it on an element of the probe's own, in
 * the top layer at the page's start corner, whose press none of the page's listeners hears; the pointer is left there.
 * Ask before the test opens anything a press elsewhere could close (a menu, a popover): the probe is a press outside
 * it. False only in WebKit on macOS (with an annotation on the test, saying where the press landed); a press another
 * engine lands elsewhere fails the test.
 */
export async function middlePressAimed(page: Page): Promise<boolean> {
  const aim = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.setAttribute('popover', 'manual');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position: fixed; inset: 0 auto auto 0; margin: 0; padding: 0; border: 0; inline-size: 16px; block-size: 16px; background: transparent; overflow: hidden;';
    document.documentElement.append(probe);
    probe.showPopover();
    const landed: { down?: boolean; up?: boolean; at?: string; x?: number; y?: number } = {};
    const types = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'auxclick', 'click', 'contextmenu'];
    // On the window, capturing, so before anything of the page's: the probe's press is nobody's.
    const swallow = (event: Event) => {
      const mouse = event as MouseEvent;
      const target = event.composedPath()[0] as Element;
      if (event.type === 'pointerdown') landed.down = target === probe;
      if (event.type === 'pointerup') {
        landed.up = target === probe;
        landed.at = target.localName;
        landed.x = Math.round(mouse.clientX);
        landed.y = Math.round(mouse.clientY);
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    for (const type of types) window.addEventListener(type, swallow, true);
    (window as unknown as { tanreiMiddleProbe: unknown }).tanreiMiddleProbe = {
      landed,
      end: () => {
        for (const type of types) window.removeEventListener(type, swallow, true);
        probe.remove();
      },
    };
    const box = probe.getBoundingClientRect();
    return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
  });
  type Probe = { landed: { down?: boolean; up?: boolean; at?: string; x?: number; y?: number }; end: () => void };
  let landed: Landed;
  try {
    await page.mouse.click(aim.x, aim.y, { button: 'middle' });
    // The press ends with a pointerup wherever it lands (on the root element where it misses the page).
    await page.waitForFunction(() => (window as unknown as { tanreiMiddleProbe: Probe }).tanreiMiddleProbe.landed.up !== undefined);
  } finally {
    landed = await page.evaluate(() => {
      const probe = (window as unknown as { tanreiMiddleProbe: Probe }).tanreiMiddleProbe;
      probe.end();
      const { down, up, at, x, y } = probe.landed;
      return { aimed: down === true && up === true, at: at ?? '', x: x ?? NaN, y: y ?? NaN };
    });
  }
  if (landed.aimed) return true;
  const where = `a middle press aimed at (${aim.x}, ${aim.y}) landed at (${landed.x}, ${landed.y}), on <${landed.at}>`;
  if (page.context().browser()?.browserType().name() === 'webkit' && process.platform === 'darwin') {
    test.info().annotations.push({ type: MIDDLE_PRESS_LEFT_OUT, description: `${where}: Playwright's WebKit on macOS did not aim it (test/middle-press.ts), so this test's middle presses were not made` });
    return false;
  }
  throw new Error(`${where}: the engine does not aim a middle press here (test/middle-press.ts)`);
}

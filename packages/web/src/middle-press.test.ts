// test/middle-press.ts, tested: `middlePressAimed()` answers what a middle press does in the page at that moment, and
// its own press reaches none of the page's listeners.
//
// A test that pressed the middle button on a link in WebKit on macOS waited out its 30 s with "<html> intercepts
// pointer events" whenever Playwright's WebKit landed the press away from its aim (the session locked: at (183, 1115)
// in a 1280 × 720 page, whatever it was aimed at), and passed when it did not. The answer is checked against the press
// itself: where it is true, a middle click on a link reaches the link; where it is false (WebKit on macOS alone), a
// middle press aimed at the link lands elsewhere too, and the test says so in its annotations.
import { type Page, expect, test } from '@playwright/test';
import { MIDDLE_PRESS_LEFT_OUT, middlePressAimed } from '../test/middle-press.js';

const PAGE = `<!doctype html><html lang="en"><body style="margin: 0">
  <a id="target" href="#target" style="position: fixed; inset-block-start: 8px; inset-inline-end: 8px">A link</a>
  <script>
    window.heard = [];
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'auxclick', 'click', 'contextmenu']) {
      window.addEventListener(type, (event) => {
        heard.push(type + ':' + event.composedPath()[0].localName + (event.composedPath()[0].id ? '#' + event.composedPath()[0].id : ''));
        // The test opens no tab: what reaches the window is read, then held back.
        if (type === 'auxclick' || type === 'click') event.preventDefault();
      });
    }
  </script></body></html>`;

const heard = (page: Page) => page.evaluate(() => (window as unknown as { heard: string[] }).heard.splice(0));

test('middlePressAimed: its own press reaches none of the page’s listeners and leaves no element of its own; true, a middle click on a link reaches the link; false (WebKit on macOS only, annotated), a middle press aimed at the link lands elsewhere too', async ({ page, browserName }) => {
  await page.setContent(PAGE);
  const before = await page.evaluate(() => document.documentElement.querySelectorAll('*').length);
  const aimed = await middlePressAimed(page);
  expect(await heard(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.querySelectorAll('*').length)).toBe(before);
  const notes = test.info().annotations.filter((note) => note.type === MIDDLE_PRESS_LEFT_OUT);
  const target = page.locator('#target');
  if (aimed) {
    expect(notes).toEqual([]);
    await target.click({ button: 'middle' });
    expect(await heard(page)).toContain('auxclick:a#target');
    expect(await page.evaluate(() => location.hash)).toBe('');
    return;
  }
  expect(browserName).toBe('webkit');
  expect(process.platform).toBe('darwin');
  expect(notes).toHaveLength(1);
  expect(notes[0].description).toMatch(/^a middle press aimed at \(\d+, \d+\) landed at \(-?\d+, -?\d+\), on <\w+>/);
  // The same press aimed at the link: it lands away from it, as the probe's did.
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'middle' });
  await expect.poll(() => page.evaluate(() => (window as unknown as { heard: string[] }).heard.some((each) => each.startsWith('pointerup:')))).toBe(true);
  const events = await heard(page);
  expect(events.filter((each) => each.endsWith('a#target')), events.join(' ')).toEqual([]);
  // A left press is aimed all the same.
  await target.click();
  expect(await heard(page)).toContain('click:a#target');
});

// The stretch in which WebKit lands a middle press elsewhere cannot be brought about on purpose. Its answer is
// reached here every time, in every engine, by a press that does land elsewhere: an element of the page's own put over
// the probe as soon as the probe is shown (a mutation observer's callback, which runs before the helper's script
// returns, so before the press is sent).
test('middlePressAimed: where its press lands elsewhere, false with an annotation saying where, in WebKit on macOS, and a failure saying where anywhere else; either way its press reaches none of the page’s listeners and it leaves nothing behind', async ({ page, browserName }) => {
  await page.setContent(PAGE);
  await page.evaluate(() => {
    const watch = new MutationObserver(() => {
      const probe = document.documentElement.querySelector(':scope > [popover]:popover-open');
      if (!probe) return;
      watch.disconnect();
      const cover = document.createElement('div');
      cover.id = 'cover';
      cover.setAttribute('popover', 'manual');
      cover.style.cssText = 'position: fixed; inset: 0 auto auto 0; margin: 0; padding: 0; border: 0; inline-size: 64px; block-size: 64px;';
      document.body.append(cover);
      cover.showPopover();
    });
    watch.observe(document.documentElement, { childList: true });
  });
  const before = await page.evaluate(() => document.documentElement.querySelectorAll('*').length);
  const answer = await middlePressAimed(page).then(
    (aimed) => ({ aimed, error: '' }),
    (error: Error) => ({ aimed: undefined, error: error.message }),
  );
  const where = /^a middle press aimed at \(8, 8\) landed at \(8, 8\), on <div>/;
  const notes = test.info().annotations.filter((note) => note.type === MIDDLE_PRESS_LEFT_OUT);
  if (browserName === 'webkit' && process.platform === 'darwin') {
    expect(answer).toEqual({ aimed: false, error: '' });
    expect(notes).toHaveLength(1);
    expect(notes[0].description).toMatch(where);
  } else {
    expect(answer.aimed).toBeUndefined();
    expect(answer.error).toMatch(where);
    expect(notes).toEqual([]);
  }
  expect(await heard(page)).toEqual([]);
  // The cover is the page's; the probe is gone.
  expect(await page.evaluate(() => document.documentElement.querySelectorAll('*').length)).toBe(before + 1);
  expect(await page.evaluate(() => [...document.querySelectorAll('[popover]')].map((each) => each.id))).toEqual(['cover']);
});

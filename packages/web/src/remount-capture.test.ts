// test/harness.ts, tested: a document of fixtures mounted into a page after the mouse moved over an earlier one still
// lets an element capture the mouse, so a drag that leaves the element it began on is followed — as it is on a page of
// its own. Without the harness's step before such a mount, Chromium captured nothing there (`setPointerCapture()`
// threw nothing and took no effect) and the drag stopped at the element's edge, while a test that did not look at
// where the drag went still passed. The Handle stands for every component that captures the pointer for a drag.
import { type Page, expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

const spec = loadSpec('handle');
const fixtures = spec.fixtures.filter((f) => f.id === 'both-bottom-end');

/** The centre of the handle's box. */
async function handleCentre(page: Page) {
  const b = (await page.locator('tanrei-handle .container').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test('a drag in a document mounted after the mouse moved over an earlier one is followed past the element it began on', async ({ page }) => {
  await mountFixtures(page, spec, { fixtures });
  // A move alone over the first document, then a second document into the same window.
  const first = await handleCentre(page);
  await page.mouse.move(first.x, first.y);
  await mountFixtures(page, spec, { fixtures });
  await page.evaluate(() => {
    const seen: { inline: number; block: number }[] = [];
    (window as unknown as { seen: typeof seen }).seen = seen;
    // The Handle's resize is a CustomEvent; the DOM's types know the name only as the window's resize (a UIEvent).
    const type: string = 'resize';
    document.querySelector('tanrei-handle')!.addEventListener(type, (e) => seen.push((e as CustomEvent).detail));
  });
  const at = await handleCentre(page);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  // Well past the handle's box along both axes, in steps.
  await page.mouse.move(at.x + 160, at.y + 120, { steps: 8 });
  await page.mouse.up();
  const seen = await page.evaluate(() => (window as unknown as { seen: { inline: number; block: number }[] }).seen);
  const last = seen.at(-1);
  expect(last, 'the drag was followed').toBeDefined();
  // The whole distance from the press, not where the pointer left the box.
  expect(last!.inline).toBeCloseTo(160, 0);
  expect(last!.block).toBeCloseTo(120, 0);
});

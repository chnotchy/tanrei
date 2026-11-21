// One control height, the selection controls. A product sets `dial.control.height` once, and every control of this
// family that stands on a row is drawn at it: a checkbox, a radio button and a switch take its height in layout, so that
// one with a label of one line is a row of that height, and a horizontal slider is that thick. What each draws inside
// that row is the sign of its condition or its value and keeps its own size: the checkbox's box, the radio button's
// ring, the switch's track and handle, the slider's track and handle. A rating's marks are the pitch of a row of glyphs
// and keep theirs. Each is measured here at the control heights a product may set, the minimum target no higher (the
// default system's 36, or the control height where that is lower), under a fine pointer (CHK-26, RAD-30, RGP-22,
// SWT-27, SLD-31; the rating's own test measures RAT-20 so).
import { type Locator, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken } from '../test/harness.js';
import { CONTROL_HEIGHTS, atControlHeight } from '../test/control-height.js';

const box = async (locator: Locator) => (await locator.boundingBox())!;
const height = async (locator: Locator) => (await box(locator)).height;
/** Every locator is `h` tall, within 0.05: polled, since a new control height restyles the page. */
async function expectAt(h: number, parts: Record<string, Locator>) {
  for (const [name, locator] of Object.entries(parts)) await expect.poll(() => height(locator), `${name} at ${h}`).toBeCloseTo(h, 1);
}
/** `inner` stands whole inside `outer`, within half a pixel. */
async function expectInside(inner: Locator, outer: Locator, what: string) {
  const [i, o] = [await box(inner), await box(outer)];
  expect(i.y, `${what}: top`).toBeGreaterThanOrEqual(o.y - 0.5);
  expect(i.y + i.height, `${what}: bottom`).toBeLessThanOrEqual(o.y + o.height + 0.5);
}
/** `inner` is centered across `outer`, within half a pixel. */
async function expectCentered(inner: Locator, outer: Locator, what: string) {
  const [i, o] = [await box(inner), await box(outer)];
  expect(Math.abs(i.y + i.height / 2 - (o.y + o.height / 2)), what).toBeLessThanOrEqual(0.5);
}
const fixturesOf = (name: string, ids: string[]): Fixture[] => loadSpec(name).fixtures.filter((f) => ids.includes(f.id));

test.describe('the control height: selection controls', () => {
  test.beforeEach(async ({ page }) => {
    expect(CONTROL_HEIGHTS).toEqual([32, 36, 40]);
    if (!(await page.evaluate(() => matchMedia('(pointer: fine)').matches))) test.skip(true, 'measured under a fine pointer');
  });

  // The checkbox's box and the radio button's ring: the sign drawn inside the row, at its own size.
  const ROWS = [
    { name: 'checkbox', id: 'CHK-26', inner: '.box', token: '--tanrei-comp-checkbox-box-size', own: 18 },
    { name: 'radio-button', id: 'RAD-30', inner: '.ring', token: '--tanrei-comp-radio-button-ring-size', own: 20 },
  ] as const;
  for (const { name, id, inner, token, own } of ROWS) {
    test(`${id}: a ${name} and its container are the control height at 32, 36 and 40, its label whole inside the row; what it draws inside keeps its own size`, async ({ page }) => {
      const spec = loadSpec(name);
      const tag = spec.platforms.web.name;
      await mountFixtures(page, spec, { icons: true, fixtures: fixturesOf(name, ['unselected', 'label-hidden']) });
      const host = (fixture: string) => page.locator(`[data-fixture="${fixture}"] ${tag}`);
      expect(await resolveToken(page, token), `the default system's ${inner}`).toBe(own);
      for (const h of CONTROL_HEIGHTS) {
        await atControlHeight(page, h);
        await expectAt(h, {
          labelled: host('unselected'),
          'label hidden': host('label-hidden'),
          container: host('unselected').locator('.container'),
          'container, label hidden': host('label-hidden').locator('.container'),
        });
        await expectInside(host('unselected').locator('.label'), host('unselected'), `the label at ${h}`);
        for (const fixture of ['unselected', 'label-hidden']) {
          const sign = host(fixture).locator(inner);
          expect(await height(sign), `${fixture}: ${inner} at ${h}`).toBeCloseTo(own, 1);
          await expectCentered(sign, host(fixture).locator('.container'), `${fixture}: ${inner} centered at ${h}`);
        }
      }
    });
  }

  test('RGP-22: a radio group’s options are rows of the control height at 32, 36 and 40, the field group’s gap between them', async ({ page }) => {
    const spec = loadSpec('radio-group');
    await mountFixtures(page, spec, { fixtures: fixturesOf('radio-group', ['default']) });
    const options = page.locator('[data-fixture="default"] tanrei-radio-button');
    expect(await options.count()).toBe(3);
    const gap = await resolveToken(page, '--tanrei-comp-field-group-gap-controls');
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      for (let n = 0; n < 3; n++) await expectAt(h, { [`option ${n}`]: options.nth(n) });
      for (let n = 1; n < 3; n++) expect((await box(options.nth(n))).y - (await box(options.nth(n - 1))).y, `options ${n - 1} and ${n} at ${h}`).toBeCloseTo(h + gap, 1);
    }
  });

  test('SWT-27: a switch and its container are the control height at 32, 36 and 40, the track centered in it at its own size, the label whole inside the row', async ({ page }) => {
    const spec = loadSpec('switch');
    await mountFixtures(page, spec, { icons: true, fixtures: fixturesOf('switch', ['unselected', 'label-hidden', 'selected']) });
    const host = (fixture: string) => page.locator(`[data-fixture="${fixture}"] tanrei-switch`);
    const [width, thick] = [await resolveToken(page, '--tanrei-comp-switch-track-width'), await resolveToken(page, '--tanrei-comp-switch-track-height')];
    expect([width, thick], "the default system's track").toEqual([52, 32]);
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      await expectAt(h, {
        labelled: host('unselected'),
        'label hidden': host('label-hidden'),
        container: host('unselected').locator('.container'),
        'container, selected': host('selected').locator('.container'),
      });
      await expectInside(host('unselected').locator('.label'), host('unselected'), `the label at ${h}`);
      for (const fixture of ['unselected', 'label-hidden', 'selected']) {
        const track = host(fixture).locator('.track');
        const t = await box(track);
        expect([t.width, t.height], `${fixture}: the track at ${h}`).toEqual([width, thick]);
        await expectCentered(track, host(fixture).locator('.control'), `${fixture}: the track centered at ${h}`);
        await expectCentered(host(fixture).locator('.handle'), track, `${fixture}: the handle on the track's midline at ${h}`);
      }
      expect((await box(host('label-hidden'))).width, `the switch's length at ${h}`).toBeCloseTo(width, 1);
    }
  });

  test('SLD-31: a horizontal slider and its handles’ containers are the control height at 32, 36 and 40 at every size, the tracks and handles at their own sizes', async ({ page }) => {
    const spec = loadSpec('slider');
    await mountFixtures(page, spec, { fixtures: fixturesOf('slider', ['continuous', 'medium', 'large']) });
    const host = (fixture: string) => page.locator(`[data-fixture="${fixture}"] tanrei-slider`);
    const SIZES = { continuous: 'small', medium: 'medium', large: 'large' } as const;
    const own = {} as Record<string, [number, number]>;
    for (const [fixture, size] of Object.entries(SIZES)) own[fixture] = [await resolveToken(page, `--tanrei-comp-slider-track-thickness-${size}`), await resolveToken(page, `--tanrei-comp-slider-handle-height-${size}`)];
    expect(Object.values(own), "the default system's tracks and handles").toEqual([[4, 20], [6, 20], [8, 20]]);
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      for (const fixture of Object.keys(SIZES)) {
        await expectAt(h, { [fixture]: host(fixture), [`${fixture}: its handle's container`]: host(fixture).locator('.container').first() });
        const [track, handle] = own[fixture];
        expect(await height(host(fixture).locator('.piece').first()), `${fixture}: the track at ${h}`).toBeCloseTo(track, 1);
        expect(await height(host(fixture).locator('.handle').first()), `${fixture}: the handle at ${h}`).toBeCloseTo(handle, 1);
      }
    }
  });
});

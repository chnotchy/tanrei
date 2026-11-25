// One control height, the fields and pickers. A product sets `dial.control.height` once, and every control of this
// family that stands on a row is drawn at it in its default size: the search bar and its button trigger, an input box of
// every look (stacked, outlined, filled), the one-time-code input's cells, the date-time picker's range fields, the
// calendar's view toggle, days and years, and the segmented button. Each is measured here at the control heights a
// product may set, the minimum target no higher (the default system's 36, or the control height where that is lower),
// under a fine pointer. What is no control on a row keeps its own height: the calendar's cell, a wheel's row and the
// search view's header (SRC-59, DTM-53, CAL-37).
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken } from '../test/harness.js';
import { CONTROL_HEIGHTS, atControlHeight } from '../test/control-height.js';

const height = async (locator: Locator) => (await locator.boundingBox())!.height;
/** Every locator is `h` tall, within 0.05: polled, since a new control height restyles the page. */
async function expectAt(h: number, parts: Record<string, Locator>) {
  for (const [name, locator] of Object.entries(parts)) await expect.poll(() => height(locator), `${name} at ${h}`).toBeCloseTo(h, 1);
}
/** `inner` stands whole inside `outer`, within half a pixel. */
async function expectInside(inner: Locator, outer: Locator, what: string) {
  const [i, o] = [(await inner.boundingBox())!, (await outer.boundingBox())!];
  expect(i.y, `${what}: top`).toBeGreaterThanOrEqual(o.y - 0.5);
  expect(i.y + i.height, `${what}: bottom`).toBeLessThanOrEqual(o.y + o.height + 0.5);
}
const fixturesOf = (name: string, ids: string[]): Fixture[] => loadSpec(name).fixtures.filter((f) => ids.includes(f.id));

test.describe('the control height: fields and pickers', () => {
  test.beforeEach(async ({ page }) => {
    expect(CONTROL_HEIGHTS).toEqual([32, 36, 40]);
    if (!(await page.evaluate(() => matchMedia('(pointer: fine)').matches))) test.skip(true, 'measured under a fine pointer');
  });

  test('SRC-59: the search bar and its button trigger are the control height at 32, 36 and 40, the input whole inside the bar; the full-screen header keeps its own', async ({ page }) => {
    const spec = loadSpec('search');
    await mountFixtures(page, spec, { icons: true, fixtures: fixturesOf('search', ['bar', 'bar-value-slots', 'trigger', 'full-screen']) });
    const host = (id: string) => page.locator(`[data-fixture="${id}"] tanrei-search`);
    const header = host('full-screen').locator('.header');
    const own = await resolveToken(page, '--tanrei-comp-search-header-height');
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      await expectAt(h, { bar: host('bar').locator('.bar'), 'bar with slots': host('bar-value-slots').locator('.bar'), trigger: host('trigger').locator('.trigger') });
      await expectInside(host('bar').locator('.bar .input'), host('bar').locator('.bar'), `the input at ${h}`);
      expect(await height(header), `the header at ${h}`).toBeCloseTo(own, 1);
    }
    expect(own, "the default system's full-screen header").toBe(72);
  });

  const BOXES = ['text-input', 'select', 'combobox', 'number-input', 'color-input'] as const;
  const PROPS: Record<(typeof BOXES)[number], Record<string, unknown>> = {
    'text-input': { label: 'Code', value: 'TANREI' },
    select: { label: 'Country', placeholder: 'Choose' },
    combobox: { label: 'City', value: 'Kyoto' },
    'number-input': { label: 'Quantity', value: 2 },
    'color-input': { label: 'Accent', value: '#336699' },
  };
  /** A filled box that draws its label: twice its padding, the floated label's line and the value's line, or the height. */
  const filledWithLabel = (page: Page, h: number) =>
    page.evaluate((h) => {
      const line = (role: string) => {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;visibility:hidden;font-size:var(--tanrei-comp-input-box-${role}-typescale-medium-font-size);line-height:var(--tanrei-comp-input-box-${role}-typescale-medium-line-height)`;
        document.body.appendChild(probe);
        const value = Number.parseFloat(getComputedStyle(probe).lineHeight);
        probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--tanrei-comp-input-box-container-padding-block-with-label-medium)';
        const pad = Number.parseFloat(getComputedStyle(probe).width);
        probe.remove();
        return [value, pad] as const;
      };
      const [floated, pad] = line('label-floated');
      const [input] = line('input');
      return Math.max(h, 2 * pad + floated + input);
    }, h);

  for (const name of BOXES) {
    test(`${{ 'text-input': 'TXI-74', select: 'SEL-75', combobox: 'CMB-85', 'number-input': 'NMI-50', 'color-input': 'CLI-48' }[name]}: a medium ${name} is the control height at 32, 36 and 40 stacked, outlined and filled without a label, its value's line whole inside it; filled with its label it holds the two lines`, async ({ page }) => {
      const spec = loadSpec(name);
      const tag = spec.platforms.web.name;
      const fixtures: Fixture[] = [
        { id: 'stacked', props: { ...PROPS[name], variant: 'stacked' } },
        { id: 'outlined', props: { ...PROPS[name], variant: 'outlined' } },
        { id: 'filled-unlabelled', props: { ...PROPS[name], variant: 'filled', labelHidden: true } },
        { id: 'filled', props: { ...PROPS[name], variant: 'filled' } },
      ];
      await mountFixtures(page, spec, { fixtures });
      const box = (id: string) => page.locator(`[data-fixture="${id}"] ${tag} >> .container`).first();
      for (const h of CONTROL_HEIGHTS) {
        await atControlHeight(page, h);
        await expectAt(h, { stacked: box('stacked'), outlined: box('outlined'), 'filled without a label': box('filled-unlabelled') });
        for (const id of ['stacked', 'outlined', 'filled-unlabelled']) {
          const line = page.locator(`[data-fixture="${id}"] ${tag} >> .container :is(input, .value, .placeholder)`).first();
          if (await line.count()) await expectInside(line, box(id), `${id} at ${h}`);
        }
        const expected = await filledWithLabel(page, h);
        await expect.poll(() => height(box('filled')), `filled with its label at ${h}`).toBeCloseTo(expected, 1);
      }
    });
  }

  test('OTC-32: every cell of a one-time-code input is the control height at 32, 36 and 40, its character whole inside it', async ({ page }) => {
    const spec = loadSpec('one-time-code-input');
    await mountFixtures(page, spec, { fixtures: fixturesOf('one-time-code-input', ['empty', 'complete']) });
    const cells = (id: string) => page.locator(`[data-fixture="${id}"] tanrei-one-time-code-input`).locator('.cell');
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      for (const id of ['empty', 'complete']) {
        const count = await cells(id).count();
        expect(count, id).toBe(6);
        for (let n = 0; n < count; n++) await expectAt(h, { [`${id} cell ${n}`]: cells(id).nth(n) });
      }
      await expectInside(cells('complete').nth(0).locator('.char'), cells('complete').nth(0), `a character at ${h}`);
    }
  });

  test('DTM-53: the range fields of a date-time picker are the control height at 32, 36 and 40, their times whole inside them; a wheel’s row and the wheels keep their own', async ({ page }) => {
    const spec = loadSpec('date-time-picker');
    await mountFixtures(page, spec, { icons: true, fixtures: fixturesOf('date-time-picker', ['modal-time-range']) });
    const host = page.locator('[data-fixture="modal-time-range"] tanrei-date-time-picker');
    const field = (end: string) => host.locator(`.range-field[data-end="${end}"]`);
    const [row, wheel] = [await resolveToken(page, '--tanrei-comp-date-time-picker-wheel-row-height'), await resolveToken(page, '--tanrei-comp-date-time-picker-wheel-height')];
    expect([row, wheel], "the default system's wheel").toEqual([48, 240]);
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      await expectAt(h, { start: field('start'), end: field('end') });
      for (const end of ['start', 'end']) await expectInside(field(end).locator('.value'), field(end), `the ${end}'s time at ${h}`);
      expect(await resolveToken(page, '--tanrei-comp-date-time-picker-wheel-row-height'), `a wheel's row at ${h}`).toBe(row);
      expect(await height(host.locator('.wheel[data-unit="hour"]')), `the hour wheel at ${h}`).toBeCloseTo(wheel, 1);
    }
  });

  test('CAL-37: the view toggle, a day’s container and a year’s container are the control height at 32, 36 and 40, as the previous and next Buttons are; a cell keeps its own', async ({ page }) => {
    const spec = loadSpec('calendar');
    await mountFixtures(page, spec, { icons: true, fixtures: fixturesOf('calendar', ['single', 'year']) });
    const host = (id: string) => page.locator(`[data-fixture="${id}"] tanrei-calendar`);
    const cell = await resolveToken(page, '--tanrei-comp-calendar-cell-size');
    expect(cell, "the default system's cell").toBe(48);
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      await expectAt(h, {
        'view toggle': host('single').locator('.toggle .box'),
        day: host('single').locator('.page.current .day[data-date="2026-09-10"] .box'),
        previous: host('single').locator('tanrei-button.previous button'),
        next: host('single').locator('tanrei-button.next button'),
        year: host('year').locator('.year[data-year="2026"] .box'),
      });
      const day = host('single').locator('.page.current .day[data-date="2026-09-10"]');
      expect(await height(day), `a day's cell at ${h}`).toBeCloseTo(cell, 1);
    }
  });

  test('SEG-32: the set and every segment of a medium segmented button are the control height at 32, 36 and 40, every label whole inside its segment; large is the large step', async ({ page }) => {
    const spec = loadSpec('segmented-button');
    await mountFixtures(page, spec, { fixtures: fixturesOf('segmented-button', ['single', 'large']) });
    const set = (id: string) => page.locator(`[data-fixture="${id}"] tanrei-segmented-button`);
    const padding = await resolveToken(page, '--tanrei-comp-segmented-button-set-padding');
    for (const h of CONTROL_HEIGHTS) {
      await atControlHeight(page, h);
      await expectAt(h, { set: set('single') });
      for (let n = 0; n < 3; n++) {
        const segment = set('single').locator('tanrei-segment').nth(n).locator('.container');
        await expectAt(h - 2 * padding, { [`segment ${n}`]: segment });
        await expectInside(segment.locator('.label').first(), segment, `segment ${n}'s label at ${h}`);
      }
    }
    await atControlHeight(page, 40);
    await expectAt(56, { large: set('large') });
  });
});

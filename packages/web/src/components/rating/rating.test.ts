// <tanrei-rating>, driven by specs/rating.spec.json: every behaviour id (RAT-1…18) is cited by a test title, every
// fixture has a baseline, and every length, color and duration is read back from the tokens — never from a number
// written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, rootTokens, tab, tabTo } from '../../../test/harness.js';
import { expectBaseline } from '../../../test/baseline.js';
import { motionEnded, settledCss } from '../../../test/motions.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('rating');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-rating`);
const row = (page: P, id: string) => host(page, id).locator('.row');
const items = (page: P, id: string) => host(page, id).locator('.item');
const item = (page: P, id: string, n: number) => items(page, id).nth(n);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-rating-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const value = (page: P, id: string) => host(page, id).evaluate((el) => (el as unknown as { value: number }).value);
const setProps = (page: P, id: string, props: Record<string, unknown>) =>
  host(page, id).evaluate((el, p) => {
    Object.assign(el, p);
    return (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
  }, props);
const fills = (page: P, id: string) => items(page, id).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.fill));
/** Every `change` and `preview` the rating fires, from now on: their `detail.value`s. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: { change: number[]; preview: (number | null)[] } = { change: [], preview: [] };
    (window as unknown as { __log: typeof log }).__log = log;
    el.addEventListener('change', (e) => log.change.push((e as CustomEvent<{ value: number }>).detail.value));
    el.addEventListener('preview', (e) => log.preview.push((e as CustomEvent<{ value: number | null }>).detail.value));
  });
const logged = (page: P) => page.evaluate(() => (window as unknown as { __log: { change: number[]; preview: (number | null)[] } }).__log);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const fixture = (id: string, props: Fixture['props'], direction?: 'rtl'): Fixture => ({ id, props: { label: 'Your rating', ...props }, ...(direction ? { direction } : {}) }) as Fixture;
/** The point at `share` of a mark's width from its left edge, on its middle line. */
async function pointOn(page: P, id: string, n: number, share = 0.75) {
  const b = await box(item(page, id, n));
  return { x: b.x + b.width * share, y: b.y + b.height / 2 };
}
const rootValue = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
  });

  test('RAT-1: max marks in a row from the inline-start, each glyph at mark.size centred in a container.size container, touching; the marks within value in the selected form and color, the others in the unselected', async ({ page }) => {
    for (const [id, size, count] of [['value', 'medium', 5], ['small', 'small', 5], ['large', 'large', 5], ['ten', 'medium', 10]] as const) {
      await expect(items(page, id)).toHaveCount(count);
      const container = await resolveToken(page, T(`container-size-${size}`));
      const mark = await resolveToken(page, T(`mark-size-${size}`));
      const boxes = await items(page, id).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      boxes.forEach((b, i) => {
        expect(b.width, `${id} ${i}`).toBeCloseTo(container, 1);
        expect(b.height, `${id} ${i}`).toBeCloseTo(container, 1);
        if (i > 0) expect(b.left, `${id} ${i}: touching`).toBeCloseTo(boxes[i - 1].right, 1);
      });
      const glyph = await box(item(page, id, 0).locator('.mark'));
      const first = boxes[0];
      expect(glyph.width).toBeCloseTo(mark, 1);
      expect(glyph.x + glyph.width / 2).toBeCloseTo(first.x + first.width / 2, 1);
      expect(glyph.y + glyph.height / 2).toBeCloseTo(first.y + first.height / 2, 1);
    }
    expect(await fills(page, 'value')).toEqual(['full', 'full', 'full', 'empty', 'empty']);
    expect(await fills(page, 'empty')).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    expect(await fills(page, 'full')).toEqual(['full', 'full', 'full', 'full', 'full']);
    await motionEnded(page);
    const [selected, unselected] = [await resolveColor(page, T('selected-mark-color')), await resolveColor(page, T('unselected-mark-color'))];
    const on = item(page, 'value', 0).locator('.on .glyph');
    const off = item(page, 'value', 4).locator('.off .glyph');
    expect(await css(on, 'color')).toBe(selected);
    expect(await css(off, 'color')).toBe(unselected);
    expect(await css(item(page, 'value', 0).locator('.on'), 'opacity')).toBe('1');
    expect(await css(item(page, 'value', 0).locator('.off'), 'opacity')).toBe('0');
    expect(await css(item(page, 'value', 4).locator('.on'), 'opacity')).toBe('0');
    expect(await css(item(page, 'value', 4).locator('.off'), 'opacity')).toBe('1');
    // The selected form is the icon set's selected family and fill, the unselected form its unselected ones, at sys.icon.weight.
    const fill = async (l: Locator) => (await css(l, 'font-variation-settings')).match(/"FILL" ([\d.]+)/)?.[1];
    expect(await fill(on)).toBe(String(Number(await rootValue(page, '--tanrei-sys-icon-fill-selected'))));
    expect(await fill(off)).toBe(String(Number(await rootValue(page, '--tanrei-sys-icon-fill-unselected'))));
    expect(await css(on, 'font-variation-settings')).toContain(`"wght" ${Number(await rootValue(page, '--tanrei-sys-icon-weight'))}`);
    // star while icon is empty; the glyph icon names otherwise.
    await expect(item(page, 'value', 0).locator('.on .glyph')).toHaveText('star');
    await expect(item(page, 'heart', 0).locator('.on .glyph')).toHaveText('favorite');
  });

  test('RAT-2: a half value draws its last mark in both forms, the selected one on its inline-start half and the unselected one on its inline-end half — the filled half on the right in right-to-left', async ({ page }) => {
    expect(await fills(page, 'half')).toEqual(['full', 'full', 'full', 'half', 'empty']);
    const half = item(page, 'half', 3);
    expect(await css(half.locator('.on'), 'clip-path')).toBe('inset(0px 50% 0px 0px)');
    expect(await css(half.locator('.off'), 'clip-path')).toBe('inset(0px 0px 0px 50%)');
    expect(await css(half.locator('.on'), 'opacity')).toBe('1');
    expect(await css(half.locator('.off'), 'opacity')).toBe('1');
    expect(await fills(page, 'half-rtl')).toEqual(['full', 'full', 'half', 'empty', 'empty']);
    const rtl = item(page, 'half-rtl', 2);
    expect(await css(rtl.locator('.on'), 'clip-path')).toBe('inset(0px 0px 0px 50%)');
    expect(await css(rtl.locator('.off'), 'clip-path')).toBe('inset(0px 50% 0px 0px)');
  });

  test('RAT-3: whole marks up to seven are a radio group named by label, a radio per mark named by its number or its entry, one tab stop; arrows check and wrap (exchanged in right-to-left), Space checks; change once per change', async ({ page }) => {
    await expect(row(page, 'value')).toHaveAttribute('role', 'radiogroup');
    await expect(row(page, 'value')).toHaveAccessibleName('Your rating');
    const radios = items(page, 'value');
    expect(await radios.evaluateAll((els) => els.map((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-checked'), el.getAttribute('tabindex')]))).toEqual([
      ['radio', '1', 'false', '-1'],
      ['radio', '2', 'false', '-1'],
      ['radio', '3', 'true', '0'],
      ['radio', '4', 'false', '-1'],
      ['radio', '5', 'false', '-1'],
    ]);
    // No score: the first mark is the stop.
    expect(await items(page, 'empty').evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')))).toEqual(['0', '-1', '-1', '-1', '-1']);
    await listen(page, 'value');
    await tabTo(page, item(page, 'value', 2));
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'value', 3)).toHaveAttribute('aria-checked', 'true');
    await expect(item(page, 'value', 3)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    // Wrapped from the last to the first.
    await expect(item(page, 'value', 0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(item(page, 'value', 4)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'value', 3)).toHaveAttribute('aria-checked', 'true');
    expect((await logged(page)).change).toEqual([4, 5, 1, 5, 4]);
    await expect(item(page, 'value', 3)).toHaveAttribute('tabindex', '0');
    // Space checks the focused mark while none is checked, and changes nothing on the checked one.
    await listen(page, 'empty');
    await tabTo(page, item(page, 'empty', 0));
    await page.keyboard.press('Space');
    await expect(item(page, 'empty', 0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Space');
    expect((await logged(page)).change).toEqual([1]);
    // Right to left: Left Arrow checks the next mark.
    await mountFixtures(page, spec, { fixtures: [fixture('rtl', { value: 2 }, 'rtl')] });
    await tabTo(page, item(page, 'rtl', 1));
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'rtl', 2)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'rtl', 1)).toHaveAttribute('aria-checked', 'true');
    // Each radio named by its entry of optionLabels; the others by their numbers in the element's language.
    await mountFixtures(page, spec, { fixtures: [fixture('named', { value: 2, optionLabels: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] }), fixture('numbers', { max: 3 })] });
    await expect(item(page, 'named', 1)).toHaveAccessibleName('Fair');
    await expect(item(page, 'named', 4)).toHaveAccessibleName('Excellent');
    await host(page, 'numbers').evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await setProps(page, 'numbers', { max: 4 });
    await expect(item(page, 'numbers', 2)).toHaveAccessibleName(new Intl.NumberFormat('ar-EG').format(3));
  });

  test('RAT-4: halves, or more than seven marks, are one slider from 0 to max named by label; arrows by a step (a half), Page Up and Down by a mark, Home to one step, End to max, never below a step; value text from optionLabels', async ({ page }) => {
    const slider = row(page, 'half');
    await expect(slider).toHaveAttribute('role', 'slider');
    await expect(slider).toHaveAccessibleName('Your rating');
    await expect(slider).toHaveAttribute('aria-valuemin', '0');
    await expect(slider).toHaveAttribute('aria-valuemax', '5');
    await expect(slider).toHaveAttribute('aria-valuenow', '3.5');
    await expect(slider).not.toHaveAttribute('aria-valuetext');
    await expect(items(page, 'half').first()).not.toHaveAttribute('role');
    await expect(items(page, 'half').first()).not.toHaveAttribute('tabindex');
    await listen(page, 'half');
    await tabTo(page, slider);
    const steps: [string, string][] = [['ArrowRight', '4'], ['ArrowUp', '4.5'], ['ArrowLeft', '4'], ['ArrowDown', '3.5'], ['PageDown', '2.5'], ['PageUp', '3.5'], ['Home', '0.5'], ['ArrowLeft', '0.5'], ['End', '5'], ['ArrowRight', '5']];
    for (const [key, now] of steps) {
      await page.keyboard.press(key);
      await expect(slider, key).toHaveAttribute('aria-valuenow', now);
    }
    expect((await logged(page)).change).toEqual([4, 4.5, 4, 3.5, 2.5, 3.5, 0.5, 5]);
    // More than seven whole marks: a slider by whole marks.
    await expect(row(page, 'ten')).toHaveAttribute('role', 'slider');
    await tabTo(page, row(page, 'ten'));
    await page.keyboard.press('ArrowRight');
    await expect(row(page, 'ten')).toHaveAttribute('aria-valuenow', '8');
    // Right to left: Left raises. From no score, a key that lowers gives none; one that raises gives one step.
    await mountFixtures(page, spec, {
      fixtures: [fixture('rtl', { value: 2, allowHalf: true }, 'rtl'), fixture('none', { allowHalf: true, optionLabels: ['½', '1', '1½', '2', '2½', '3', '3½', '4', '4½', 'Excellent'] })],
    });
    await tabTo(page, row(page, 'rtl'));
    await page.keyboard.press('ArrowLeft');
    await expect(row(page, 'rtl')).toHaveAttribute('aria-valuenow', '2.5');
    await tabTo(page, row(page, 'none'));
    await page.keyboard.press('ArrowDown');
    await expect(row(page, 'none')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('End');
    await expect(row(page, 'none')).toHaveAttribute('aria-valuetext', 'Excellent');
  });

  test('RAT-5: read-only is one image named by label and described by valueText (else its entry, else its number), drawn as RAT-1 and RAT-2, taking no press, key or focus; with neither valueText nor a value it is reported', async ({ page }) => {
    const img = row(page, 'read-only');
    await expect(img).toHaveAttribute('role', 'img');
    await expect(img).toHaveAccessibleName('Average rating');
    await expect(img).toHaveAttribute('aria-description', '4.5 out of 5 stars');
    expect(await fills(page, 'read-only')).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(await items(page, 'read-only').evaluateAll((els) => els.filter((el) => el.hasAttribute('tabindex') || el.hasAttribute('role')).length)).toBe(0);
    await expect(img).not.toHaveAttribute('tabindex');
    await listen(page, 'read-only');
    await item(page, 'read-only', 1).click();
    expect(await value(page, 'read-only')).toBe(4.5);
    expect((await logged(page)).change).toEqual([]);
    expect(await host(page, 'read-only').evaluate((el) => !!el.shadowRoot!.activeElement)).toBe(false);
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('number', { readOnly: true, value: 4 }), fixture('nothing', { readOnly: true })] });
    await expect(row(page, 'number')).toHaveAttribute('aria-description', '4');
    await expect(row(page, 'nothing')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('RAT-5'))).toHaveLength(1);
  });

  test('RAT-6: a press gives that mark’s score, and the start half of a mark less a half while halves are allowed (the right half in right-to-left); a press on the score already given changes nothing', async ({ page }) => {
    await listen(page, 'value');
    await item(page, 'value', 3).click();
    expect(await value(page, 'value')).toBe(4);
    await item(page, 'value', 3).click();
    await item(page, 'value', 0).click();
    expect((await logged(page)).change).toEqual([4, 1]);
    // Halves: the start half gives the mark less a half, the end half the whole mark.
    await listen(page, 'half');
    let at = await pointOn(page, 'half', 1, 0.25);
    await page.mouse.click(at.x, at.y);
    expect(await value(page, 'half')).toBe(1.5);
    at = await pointOn(page, 'half', 1, 0.75);
    await page.mouse.click(at.x, at.y);
    expect(await value(page, 'half')).toBe(2);
    expect((await logged(page)).change).toEqual([1.5, 2]);
    // Right to left: the right half is the start half.
    at = await pointOn(page, 'half-rtl', 0, 0.75);
    await page.mouse.click(at.x, at.y);
    expect(await value(page, 'half-rtl')).toBe(0.5);
  });

  test('RAT-7: a fine pointer over a mark draws the score it would give, hovers that mark and fires preview with it; leaving draws the value again and fires preview null once', async ({ page }) => {
    await listen(page, 'value');
    let at = await pointOn(page, 'value', 0);
    await page.mouse.move(at.x, at.y);
    await expect.poll(() => fills(page, 'value')).toEqual(['full', 'empty', 'empty', 'empty', 'empty']);
    await expect(item(page, 'value', 0)).toHaveAttribute('data-hovered', '');
    at = await pointOn(page, 'value', 4);
    await page.mouse.move(at.x, at.y);
    await expect.poll(() => fills(page, 'value')).toEqual(['full', 'full', 'full', 'full', 'full']);
    await expect(item(page, 'value', 0)).not.toHaveAttribute('data-hovered');
    await page.mouse.move(at.x + 2, at.y);
    await page.mouse.move(0, 0);
    await expect.poll(() => fills(page, 'value')).toEqual(['full', 'full', 'full', 'empty', 'empty']);
    expect((await logged(page)).preview).toEqual([1, 5, null]);
    expect((await logged(page)).change).toEqual([]);
    // The hovered container is drawn from its condition's hovered tokens.
    at = await pointOn(page, 'value', 1);
    await page.mouse.move(at.x, at.y);
    await expect.poll(() => settledCss(item(page, 'value', 1), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-container-color')));
  });

  test('RAT-8: the hit area reaches the minimum target around the row without changing what is drawn; a point belongs to the nearer mark, the row divided at the middle between marks', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const container = await resolveToken(page, T('container-size-small'));
    const r = await box(row(page, 'small'));
    expect(r.height).toBeCloseTo(container, 1);
    expect(Number.parseFloat(await css(row(page, 'small'), 'height', '::before'))).toBeCloseTo(Math.max(container, pointer), 1);
    // Above the row, within the target: the mark below.
    await page.mouse.click(r.x + container * 1.5, r.y - (pointer - container) / 2 + 1);
    expect(await value(page, 'small')).toBe(2);
    // Past the end of the row, within the target: the last mark.
    await page.mouse.click(r.x + r.width + (pointer - container) / 2 - 1, r.y + r.height / 2);
    expect(await value(page, 'small')).toBe(5);
    // Either side of the middle between the first and the second mark.
    await page.mouse.click(r.x + container - 1, r.y + r.height / 2);
    expect(await value(page, 'small')).toBe(1);
    await page.mouse.click(r.x + container + 1, r.y + r.height / 2);
    expect(await value(page, 'small')).toBe(2);
  });

  test('RAT-9: a press that ends within a frame — Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    for (const [name, activate] of [
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, item(page, 'empty', 1))],
    ] as const) {
      await mountFixtures(page, spec);
      await tabTo(page, item(page, 'empty', 0));
      const pressed = name === 'Space' ? item(page, 'empty', 0) : item(page, 'empty', 1);
      await pressed.evaluate((el) => {
        const log: { down?: number; on?: number; off?: number; up?: number } = ((window as unknown as { press: object }).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
          else if (log.on !== undefined) log.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
      });
      const read = () => page.evaluate(() => (window as unknown as { press: { down: number; on: number; off?: number; up: number } }).press);
      await heldPress(page, hold, activate, async () => (await read()).off !== undefined, name);
      const log = await read();
      expect(log.up - log.on, name).toBeLessThan(hold);
      expect(log.off! - log.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('RAT-10: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press on the pressed mark’s container; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, system ? { system } : {});
      if (feedback) await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      const b = item(page, 'value', 4);
      await b.hover();
      // The pointer previews the score 5 (RAT-7): the mark it is over is drawn selected, hovered.
      await expect.poll(() => settledCss(b, 'background-color')).toBe(await resolveColor(page, T('selected-hovered-container-color')));
      const hovered = await css(b, 'background-color');
      await page.mouse.down();
      const result = { pressed: await b.getAttribute('data-pressed'), bg: await css(b, 'background-color'), hovered, ripple: await b.locator('.ripple').count() };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0 });
    expect(overlay.bg).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1 });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0 });
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // The ripple grows over feedback-duration from the centre for Space, and appears whole where motion is reduced.
    await mountFixtures(page, spec, { system: 'm3-like' });
    await tabTo(page, item(page, 'empty', 0));
    await page.keyboard.down('Space');
    const layer = await item(page, 'empty', 0)
      .locator('.ripple')
      .evaluate((el) => ({ x: Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(getComputedStyle(el).animationDuration) * 1000 }));
    await page.keyboard.up('Space');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Space');
    expect(await css(item(page, 'empty', 0).locator('.ripple'), 'animation-name')).toBe('none');
    await page.keyboard.up('Space');
  });

  test('RAT-11: keyboard focus shows the ring around the focused mark’s container (a radio group) or around the row (a slider), at sys.focus.offset, never animated and never for pointer focus', async ({ page }) => {
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const offset = await resolveToken(page, '--tanrei-sys-focus-offset');
    await item(page, 'value', 1).click();
    await expect(item(page, 'value', 1)).toBeFocused();
    await expect(item(page, 'value', 1)).toHaveCSS('outline-style', 'none');
    await tabTo(page, item(page, 'value', 1));
    await expect(item(page, 'value', 1)).toHaveCSS('outline-style', 'solid');
    await expect(item(page, 'value', 1)).toHaveCSS('outline-width', `${outer}px`);
    expect(Number.parseFloat(await css(item(page, 'value', 1), 'outline-offset'))).toBeCloseTo(offset + (await resolveToken(page, '--tanrei-sys-focus-inner-width')), 1);
    expect(await css(item(page, 'value', 1), 'transition-property')).not.toContain('outline');
    await tabTo(page, row(page, 'half'));
    await expect(row(page, 'half')).toHaveCSS('outline-style', 'solid');
    await expect(item(page, 'half', 0)).toHaveCSS('outline-style', 'none');
    // The containers are round: a pill whatever the corner smoothing.
    await mountFixtures(page, spec, { system: 'cupertino' });
    const radius = Number.parseFloat(await css(item(page, 'value', 0), 'border-top-left-radius'));
    expect(radius).toBeGreaterThanOrEqual((await box(item(page, 'value', 0))).width / 2 - 0.5);
  });

  test('RAT-12: a change of value fades each mark between its forms over selection-duration; the containers’ colors change over state-duration; the first frame has no motion; reduced motion keeps the fades', async ({ page }) => {
    const layer = item(page, 'value', 3).locator('.on');
    expect(Number.parseFloat(await css(layer, 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-selection-duration'), 'duration'));
    expect(await css(layer, 'transition-property')).toBe('opacity');
    expect(Number.parseFloat(await css(item(page, 'value', 3), 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    // A change of value starts the fade: a frame later the new form is on its way, not there.
    await setProps(page, 'value', { value: 4 });
    const midway = Number(await css(layer, 'opacity'));
    expect(midway).toBeLessThan(1);
    await motionEnded(page);
    expect(await css(layer, 'opacity')).toBe('1');
    // The first frame is drawn at the value without a motion.
    await mountFixtures(page, spec, { fixtures: [fixture('first', { value: 4 })], beforePaint: true });
    expect(await css(item(page, 'first', 3).locator('.on'), 'opacity')).toBe('1');
    // Reduced motion keeps the fade (MOT-6).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixtures(page, spec);
    expect(Number.parseFloat(await css(item(page, 'value', 3).locator('.on'), 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-selection-duration'), 'duration'));
  });

  test('RAT-13: disabled draws from the disabled tokens of each mark’s condition, is not focusable, takes no input, emits nothing, exposes its disabled state and its value, and is left out of the form', async ({ page }) => {
    await motionEnded(page);
    expect(await css(item(page, 'disabled', 0).locator('.on .glyph'), 'color')).toBe(await resolveColor(page, T('selected-disabled-mark-color')));
    expect(await css(item(page, 'disabled', 4).locator('.off .glyph'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-mark-color')));
    expect(await css(item(page, 'disabled', 0), 'background-color')).toBe(await resolveColor(page, T('selected-disabled-container-color')));
    await expect(row(page, 'disabled')).toHaveAttribute('aria-disabled', 'true');
    await expect(item(page, 'disabled', 1)).toHaveAttribute('aria-checked', 'true');
    await expect(item(page, 'disabled', 1)).toHaveAttribute('aria-disabled', 'true');
    expect(await items(page, 'disabled').evaluateAll((els) => els.filter((el) => el.hasAttribute('tabindex')).length)).toBe(0);
    await listen(page, 'disabled');
    // (aria-disabled: Playwright's actionability would wait for it to be enabled, so the mouse goes there itself.)
    const at = await pointOn(page, 'disabled', 4);
    await page.mouse.click(at.x, at.y);
    expect(await value(page, 'disabled')).toBe(2);
    expect(await logged(page)).toEqual({ change: [], preview: [] });
    await expect(item(page, 'disabled', 4)).not.toHaveAttribute('data-hovered');
  });

  test('RAT-14: a value the product sets is drawn without change; out of range it is clamped, between scores the nearest, and max below 1 or fractional is the whole number below it — each reported', async ({ page }) => {
    const seen = warnings(page);
    await listen(page, 'value');
    await setProps(page, 'value', { value: 1 });
    expect(await fills(page, 'value')).toEqual(['full', 'empty', 'empty', 'empty', 'empty']);
    expect((await logged(page)).change).toEqual([]);
    await setProps(page, 'value', { value: 9 });
    await expect(item(page, 'value', 4)).toHaveAttribute('aria-checked', 'true');
    await setProps(page, 'value', { value: 2.4 });
    await expect(item(page, 'value', 1)).toHaveAttribute('aria-checked', 'true');
    await setProps(page, 'half', { value: 2.3 });
    await expect(row(page, 'half')).toHaveAttribute('aria-valuenow', '2.5');
    await setProps(page, 'value', { value: -1, max: 3.7 });
    await expect(items(page, 'value')).toHaveCount(3);
    expect(await fills(page, 'value')).toEqual(['empty', 'empty', 'empty']);
    await setProps(page, 'value', { max: 0 });
    await expect(items(page, 'value')).toHaveCount(1);
    await expect.poll(() => seen.filter((w) => w.includes('RAT-14')).length).toBeGreaterThanOrEqual(5);
  });

  test('RAT-15: in a form it takes name, submits a value above 0 and nothing at 0, resets to the value it was first given, read-only submits and disabled does not; Enter submits the form', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('form', { value: 3 })] });
    const data = await page.evaluate(async () => {
      const make = (attrs: string) => {
        const form = document.createElement('form');
        form.innerHTML = `<tanrei-rating label="Rating" name="score" ${attrs}></tanrei-rating>`;
        document.body.append(form);
        return form;
      };
      const forms = { given: make('value="3"'), none: make(''), readOnly: make('value="4" read-only'), disabled: make('value="2" disabled'), half: make('value="2.5" allow-half') };
      await Promise.all([...document.querySelectorAll('tanrei-rating')].map((el) => (el as unknown as { updateComplete: Promise<boolean> }).updateComplete));
      const read = (form: HTMLFormElement) => [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`);
      const before = Object.fromEntries(Object.entries(forms).map(([k, f]) => [k, read(f)]));
      const given = forms.given.querySelector('tanrei-rating') as unknown as { value: number; updateComplete: Promise<boolean> };
      given.value = 5;
      await given.updateComplete;
      const changed = read(forms.given);
      forms.given.reset();
      await given.updateComplete;
      return { before, changed, reset: given.value };
    });
    expect(data.before).toEqual({ given: ['score=3'], none: [], readOnly: ['score=4'], disabled: [], half: ['score=2.5'] });
    expect(data.changed).toEqual(['score=5']);
    expect(data.reset).toBe(3);
    // Enter in the rating submits its form.
    const submitted = await page.evaluate(() => {
      const form = document.querySelector('form')!;
      return new Promise<boolean>((resolve) => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          resolve(true);
        });
        (form.querySelector('tanrei-rating') as HTMLElement).focus();
        setTimeout(() => resolve(false), 2000);
        form.querySelector('tanrei-rating')!.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      });
    });
    expect(submitted).toBe(true);
  });

  test('RAT-16: right to left draws the first mark at the right, the score growing leftward, and mirrors a glyph exactly when the icon set marks it; no direction setting of its own', async ({ page }) => {
    const [first, second] = [await box(item(page, 'half-rtl', 0)), await box(item(page, 'half-rtl', 1))];
    expect(first.x).toBeGreaterThan(second.x);
    expect(await css(item(page, 'half-rtl', 0).locator('.on .glyph'), 'transform')).toBe('none');
    await mountFixtures(page, spec, { fixtures: [fixture('mirrored', { value: 2, icon: 'send' }, 'rtl'), fixture('plain', { value: 2, icon: 'send' })] });
    await expect(item(page, 'mirrored', 0).locator('.on .glyph')).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(item(page, 'mirrored', 0).locator('.on .glyph'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(item(page, 'plain', 0).locator('.on .glyph'), 'transform')).toBe('none');
    expect((spec.props ?? []).map((p) => p.name)).not.toContain('direction');
  });

  test('RAT-17: with forced colors every mark is in the text color, filled or outlined, the hovered container in the highlight color, a disabled rating in the disabled text color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    await motionEnded(page);
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.cssText = `forced-color-adjust: none; background-color: ${n}`;
        document.body.appendChild(probe);
        const v = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return v;
      }, name);
    const [text, highlight, gray] = [await system('CanvasText'), await system('Highlight'), await system('GrayText')];
    expect(await css(item(page, 'value', 0).locator('.on .glyph'), 'color')).toBe(text);
    expect(await css(item(page, 'value', 4).locator('.off .glyph'), 'color')).toBe(text);
    expect(await css(item(page, 'disabled', 0).locator('.on .glyph'), 'color')).toBe(gray);
    const at = await pointOn(page, 'value', 4);
    await page.mouse.move(at.x, at.y);
    await expect.poll(() => css(item(page, 'value', 4), 'background-color')).toBe(highlight);
  });

  test('RAT-18: without a label it still renders and is reported; optionLabels of the wrong length names the rest by number and is reported; an unknown size renders as medium and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        { id: 'nameless', props: { value: 2 } },
        fixture('short', { value: 2, optionLabels: ['Poor', 'Fair'] }),
        fixture('odd', { value: 2, size: 'huge' }),
      ],
    });
    await expect(items(page, 'nameless')).toHaveCount(5);
    await expect.poll(() => seen.filter((w) => w.includes('RAT-18') && w.includes('label is empty'))).toHaveLength(1);
    await expect(item(page, 'short', 1)).toHaveAccessibleName('Fair');
    await expect(item(page, 'short', 2)).toHaveAccessibleName('3');
    await expect.poll(() => seen.filter((w) => w.includes('RAT-18') && w.includes('optionLabels holds 2 entries for 5 scores'))).toHaveLength(1);
    expect((await box(item(page, 'odd', 0))).width).toBeCloseTo(await resolveToken(page, T('container-size-medium')), 1);
    await expect.poll(() => seen.filter((w) => w.includes('size "huge" is not a value of the active design system'))).toHaveLength(1);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, reducedMotion: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('Tab reaches a radio group at its checked mark and a slider once; a read-only or disabled rating not at all', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('a', { value: 3 }), fixture('b', { readOnly: true, value: 2, valueText: 'Two' }), fixture('c', { disabled: true, value: 2 }), fixture('d', { value: 2, allowHalf: true })] });
    await tab(page);
    await expect(item(page, 'a', 2)).toBeFocused();
    await tab(page);
    await expect(row(page, 'd')).toBeFocused();
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  test('a fixture that names a surface is drawn on a stage of that color role', async ({ page }) => {
    const color = (id: string) => stage(page, id).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await color('on-container-highest')).toBe(await resolveColor(page, '--tanrei-sys-color-surface-container-highest'));
    expect(await color('value')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expectBaseline(stage(page, f.id), [spec.name, `${f.id}.png`]);
    });
  }
});

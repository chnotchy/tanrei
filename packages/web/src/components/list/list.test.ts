// <tanrei-list> and <tanrei-list-item>, driven by specs/list.spec.json: every behaviour id the web has built (LST-1…43,
// LST-51, LST-52; the drag form's LST-44…50 stand at the end as tests still to be written) is cited by a test
// title, every fixture has a baseline, and every state, condition and choice of kind is read back from the tokens —
// never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import {
  type Fixture,
  type FixtureItem,
  acmeSystemCss,
  iconFaceArrives,
  loadSpec,
  missingWords,
  mountFixtures,
  resolveColor,
  resolveToken,
  setWords,
  tab,
  tabTo,
  withoutIconFont,
  rootTokens,
} from '../../../test/harness.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { opticalSizeAxis } from '../../../test/icons.js';

import { MIRRORED, anchorOf, expectDisabledLink, expectDrawnAlike, expectLinkActivation, expectNewContext, expectRefusals, expectTargetLabel, markOf, settledPaint } from '../../../test/links.js';

const spec = loadSpec('list');
type P = Page;
type ItemProps = FixtureItem['props'];
const list = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-list`);
const item = (page: P, id: string, n: number) => list(page, id).locator('tanrei-list-item').nth(n);
const row = (page: P, id: string, n: number) => item(page, id, n).locator('.row');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-list-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** A fixture of this test's own: the list's props and one list item per entry. */
const fixture = (id: string, props: Fixture['props'], items: ItemProps[]): Fixture => ({ id, props, items: items.map((p) => ({ kind: 'list-item', props: p })) });
/** Counts click events on each item and change events on each list, by fixture and index. */
const listen = (page: P) =>
  page.evaluate(() => {
    const log = ((window as any).events = { clicks: [] as string[], changes: [] as unknown[] });
    for (const element of document.querySelectorAll('tanrei-list-item')) {
      element.addEventListener('click', () => log.clicks.push(`${element.closest('[data-fixture]')!.getAttribute('data-fixture')}:${(element as any).headline}`));
    }
    for (const element of document.querySelectorAll('tanrei-list')) element.addEventListener('change', (e) => log.changes.push((e as CustomEvent).detail));
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { clicks: string[]; changes: unknown[] });
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** Everything a state paints on a row, as drawn. */
const drawn = (page: P, id: string, n: number) =>
  item(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const r = getComputedStyle(root.querySelector('.row')!);
    return { bg: r.backgroundColor, headline: getComputedStyle(root.querySelector('.headline')!).color, opacity: r.opacity };
  });
const expected = async (page: P, condition: 'unselected' | 'selected', state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    headline: await resolveColor(page, name('headline-color')),
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};
/** The element that has focus, through shadow roots. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const host = active?.closest('tanrei-list-item') ?? (active?.getRootNode() as ShadowRoot).host;
    return (host as any)?.headline ?? null;
  });

test.describe('behavior', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('LST-1: pointer, Enter and Space activate an interactive item exactly once — Enter on key-down, Space on key-up', async ({ page }) => {
    await listen(page);
    await row(page, 'interactive', 0).click();
    expect((await events(page)).clicks).toEqual(['interactive:Wi-Fi']);
    // A press on the row's content is the row's press.
    await row(page, 'interactive', 0).locator('.supporting').click();
    expect((await events(page)).clicks).toHaveLength(2);
    await row(page, 'interactive', 0).focus();
    await page.keyboard.down('Enter');
    expect((await events(page)).clicks, 'Enter, on key-down').toHaveLength(3);
    await page.keyboard.up('Enter');
    await page.keyboard.down('Space');
    expect((await events(page)).clicks, 'Space: nothing until the key comes up').toHaveLength(3);
    await page.keyboard.up('Space');
    expect((await events(page)).clicks, 'Space, on key-up').toHaveLength(4);
    await item(page, 'interactive', 0).evaluate((el) => (el as HTMLElement).click());
    expect((await events(page)).clicks, 'element.click()').toHaveLength(5);
    // A Space released after focus left does not activate, as on a native button.
    await page.keyboard.down('Space');
    await row(page, 'interactive', 0).evaluate((el) => el.blur());
    await page.keyboard.up('Space');
    expect((await events(page)).clicks).toEqual(Array(5).fill('interactive:Wi-Fi'));
    // The click comes from one button, named by the headline.
    await expect(list(page, 'interactive').getByRole('button', { name: 'Wi-Fi' })).toHaveCount(1);
  });

  test('LST-2: a disabled action or option emits no click or change, exposes disabled, and is reached by the arrow keys only', async ({ page }) => {
    await listen(page);
    const archive = item(page, 'interactive-disabled', 0);
    await archive.evaluate((el) => {
      (el as HTMLElement).click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      el.shadowRoot!.querySelector('.row')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await row(page, 'interactive-disabled', 0).click({ force: true });
    await expect(list(page, 'interactive-disabled').getByRole('button', { name: 'Archive', disabled: true })).toHaveCount(1);
    // Tab lands on the first enabled item; the arrow keys still reach the disabled one, where Enter and Space do nothing.
    await tabTo(page, row(page, 'interactive-disabled', 1));
    await page.keyboard.press('ArrowUp');
    await expect(row(page, 'interactive-disabled', 0)).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect((await events(page)).clicks).toEqual([]);

    // Options: a disabled selected option and a disabled unselected one change nothing.
    for (const [id, n] of [['selected-disabled', 0], ['unselected-disabled', 0]] as const) {
      await expect(item(page, id, n)).toHaveAttribute('aria-disabled', 'true');
      await row(page, id, n).click({ force: true });
      await item(page, id, n).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
    }
    expect((await events(page)).changes).toEqual([]);
    expect(await list(page, 'selected-disabled').evaluate((el: any) => el.value)).toBe('light');
    expect(await list(page, 'unselected-disabled').evaluate((el: any) => el.values)).toEqual([]);
    await expect(list(page, 'unselected-disabled').getByRole('option', { name: 'Bug', disabled: true })).toHaveCount(1);
  });

  test('LST-3: each state renders the row from that state’s tokens of its condition; pointer focus is not the focused state (default system)', async ({ page }) => {
    for (const [id, n, condition] of [['interactive', 0, 'unselected'], ['single-selected', 0, 'selected'], ['single-selected', 1, 'unselected']] as const) {
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id, n), `${id} ${n}`).toEqual(await expected(page, condition));
      await row(page, id, n).hover();
      await expect.poll(() => drawn(page, id, n), `${id} ${n} hovered`).toEqual(await expected(page, condition, 'hovered'));
      expect((await drawn(page, id, n)).bg).not.toBe((await expected(page, condition)).bg);
      await page.mouse.down(); // hovered AND pressed: pressed wins
      await expect.poll(() => drawn(page, id, n), `${id} ${n} pressed`).toEqual(await expected(page, condition, 'pressed'));
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await mountFixtures(page, spec);
      await row(page, id, n).click();
      await page.mouse.move(0, 0);
      // An option that was just chosen is selected now; the point here is that pointer focus draws no focused state.
      const now = id === 'single-selected' ? 'selected' : condition;
      await expect.poll(() => drawn(page, id, n), `${id} ${n} after a click`).toEqual(await expected(page, now));
      await mountFixtures(page, spec);
      await tabTo(page, id === 'interactive' ? row(page, id, n) : item(page, id, 0));
      if (n === 1) await page.keyboard.press('ArrowDown');
      await expect.poll(() => drawn(page, id, n), `${id} ${n} focused`).toEqual(await expected(page, condition, 'focused'));
      await mountFixtures(page, spec);
    }
    // A static item answers no state (LST-11).
    await row(page, 'one-line', 0).hover();
    await page.waitForTimeout(250);
    expect(await drawn(page, 'one-line', 0)).toEqual(await expected(page, 'unselected'));
    // The component draws no overlay of its own: state is entirely a matter of token values.
    expect(await item(page, 'interactive', 0).locator('.state-layer').count()).toBe(0);
  });

  test('LST-3: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(row(page, 'interactive', 0), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`unselected-${s}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await row(page, 'interactive', 0).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, row(page, 'interactive', 0)); // hovered AND keyboard-focused: focused wins
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space'); // and pressed: pressed wins
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
    await expect.poll(bg).toBe(focus);
  });

  test('LST-4: keyboard focus shows the ring inside the row, on an action and on an option; pointer focus does not', async ({ page }) => {
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await row(page, 'interactive', 0).click();
    await expect(row(page, 'interactive', 0)).toHaveCSS('outline-style', 'none');
    expect(await css(row(page, 'interactive', 0), 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (const [target, r] of [[row(page, 'interactive', 0), row(page, 'interactive', 0)], [item(page, 'single-selected', 0), row(page, 'single-selected', 0)]] as const) {
      await tabTo(page, target);
      await expect(r).toHaveCSS('outline-style', 'solid');
      await expect(r).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      // Inside: the outer stroke lies on the row's edge, so a scrolling ancestor cannot clip it.
      await expect(r).toHaveCSS('outline-offset', `${-outer}px`);
      expect(await css(r, 'top', '::after')).toBe(`${outer}px`);
      expect(await css(r, 'transition-property')).not.toContain('outline');
    }
    // The host of an option never draws the browser's own ring around itself.
    await expect(item(page, 'single-selected', 0)).toHaveCSS('outline-style', 'none');
  });

  test('LST-5: an action or an option is at least sys.target.pointer tall; the whole row is its hit area', async ({ page }) => {
    await override(page, { [T('container-height-one-line')]: '20px', [T('container-padding-block')]: '0px' });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect((await bounds(row(page, 'interactive-disabled', 1))).height).toBeCloseTo(pointer, 1);
    expect((await bounds(row(page, 'single-selected', 1))).height).toBeCloseTo(pointer, 1);
    // A static item keeps its own height: nothing is pressed there.
    expect((await bounds(row(page, 'one-line', 0))).height).toBeLessThan(pointer);
    await mountFixtures(page, spec);
    await listen(page);
    // The leading icon, the text, the trailing icon and the row's padding all belong to the row's press.
    for (const part of ['.leading-icon', '.headline', '.trailing-icon']) await row(page, 'interactive', 1).locator(part).click();
    const box = await bounds(row(page, 'interactive', 1));
    await page.mouse.click(box.x + 2, box.y + 2);
    await page.mouse.click(box.x + box.width - 2, box.y + box.height - 2);
    expect((await events(page)).clicks).toEqual(Array(5).fill('interactive:Bluetooth'));
  });

  test('LST-5: a coarse pointer makes the row at least sys.target.touch tall', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    await override(page, { [T('container-height-one-line')]: '20px', [T('container-padding-block')]: '0px' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect((await bounds(row(page, 'interactive-disabled', 1))).height).toBeCloseTo(touch, 1);
  });

  test('LST-6: a disabled action or option renders from the disabled tokens of its condition, and the opacity reaches the whole item', async ({ page }) => {
    const opacity = await token(page, T('disabled-opacity'));
    expect(Number(opacity)).toBeLessThan(1);
    await expect.poll(() => drawn(page, 'interactive-disabled', 0)).toEqual(await expected(page, 'unselected', 'disabled'));
    await expect.poll(() => drawn(page, 'selected-disabled', 0)).toEqual(await expected(page, 'selected', 'disabled'));
    await expect.poll(() => drawn(page, 'unselected-disabled', 0)).toEqual(await expected(page, 'unselected', 'disabled'));
    // A disabled selected option keeps its fill: the default system dims it as a whole instead.
    expect((await drawn(page, 'selected-disabled', 0)).bg).toBe(await resolveColor(page, T('selected-container-color')));
    // The leading media is inside the row, so the row's opacity reaches it.
    await mountFixtures(page, spec, { fixtures: [fixture('media', {}, [{ headline: 'Ada', leadingMedia: 'avatar', interactive: true, disabled: true }])] });
    await expect(row(page, 'media', 0).locator('.media')).toHaveCount(1);
    await expect.poll(() => css(row(page, 'media', 0), 'opacity')).toBe(opacity);
  });

  test('LST-7: a selection or leading media the list does not define renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('odd', { selection: 'sparkly' }, [{ headline: 'Inbox', leadingMedia: 'hexagon' }, { headline: 'Sent', interactive: true }])] });
    await expect(list(page, 'odd')).toHaveAttribute('role', 'list');
    await expect(item(page, 'odd', 0)).toHaveAttribute('role', 'listitem');
    await expect(row(page, 'odd', 0).locator('.media')).toHaveCount(0);
    await expect(list(page, 'odd').getByRole('button', { name: 'Sent' })).toHaveCount(1);
    await expect.poll(() => seen.filter((w) => w.includes('LST-7')).length).toBe(2);
    expect(seen).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/selection "sparkly" is not a value the list defines; it is drawn as "none" \(LST-7\)/),
        expect.stringMatching(/leadingMedia "hexagon" is not a value the list defines; it is drawn as "none" \(LST-7\)/),
      ]),
    );
  });

  test('LST-11: a static item takes no focus, emits no click of its own, answers no state, ignores disabled and leaves its trailing control alone', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        { ...fixture('static', {}, [{ headline: 'Airplane mode', disabled: true }, { headline: 'Sent' }]), content: undefined },
        { id: 'after', props: {}, items: [{ kind: 'list-item', props: { headline: 'After', interactive: true } }] },
      ],
    });
    await item(page, 'static', 0).evaluate((el) => {
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.slot = 'trailing';
      toggle.setAttribute('aria-label', 'Airplane mode');
      el.append(toggle);
    });
    for (const n of [0, 1]) {
      await expect(item(page, 'static', n)).not.toHaveAttribute('tabindex');
      await expect(row(page, 'static', n)).not.toHaveAttribute('tabindex');
      await expect(row(page, 'static', n)).not.toHaveAttribute('role');
    }
    // A static item ignores disabled: it is drawn at rest and exposes nothing.
    await expect(item(page, 'static', 0)).not.toHaveAttribute('aria-disabled');
    expect(await drawn(page, 'static', 0)).toEqual(await expected(page, 'unselected'));
    // element.click() does nothing; its trailing control keeps its own focus stop and its own clicks.
    await listen(page);
    await item(page, 'static', 0).evaluate((el) => (el as HTMLElement).click());
    expect((await events(page)).clicks).toEqual([]);
    const toggle = item(page, 'static', 0).locator('input');
    await tabTo(page, toggle);
    await page.keyboard.press('Space');
    expect(await toggle.isChecked()).toBe(true);
    // The list of static items is not a tab stop: Tab goes from the control straight on.
    await tab(page);
    await expect(row(page, 'after', 0)).toBeFocused();
  });

  test('LST-12: a list of list items with their positions; an action is one button inside its list item; a listbox names its options, selected or not', async ({ page }) => {
    await expect(list(page, 'one-line')).toHaveAttribute('role', 'list');
    for (const n of [0, 1, 2]) {
      await expect(item(page, 'one-line', n)).toHaveAttribute('role', 'listitem');
      await expect(item(page, 'one-line', n)).toHaveAttribute('aria-posinset', String(n + 1));
      await expect(item(page, 'one-line', n)).toHaveAttribute('aria-setsize', '3');
    }
    await expect(item(page, 'interactive', 0)).toHaveAttribute('role', 'listitem');
    await expect(row(page, 'interactive', 0)).toHaveAttribute('role', 'button');
    await expect(list(page, 'interactive').getByRole('listitem')).toHaveCount(2);
    await expect(list(page, 'interactive').getByRole('listitem').first().getByRole('button', { name: 'Wi-Fi', exact: true })).toHaveCount(1);
    await expect(list(page, 'interactive').getByRole('button')).toHaveCount(2);

    await expect(page.getByRole('listbox', { name: 'Theme' }).first()).toBeVisible();
    await expect(list(page, 'single-selected')).not.toHaveAttribute('aria-multiselectable');
    await expect(list(page, 'multiple-selected')).toHaveAttribute('aria-multiselectable', 'true');
    await expect(list(page, 'single-selected').getByRole('option', { name: 'Light', selected: true })).toHaveCount(1);
    await expect(list(page, 'single-selected').getByRole('option', { selected: false })).toHaveCount(2);
    await expect(list(page, 'multiple-selected').getByRole('option', { selected: true })).toHaveCount(2);
    await expect(item(page, 'single-selected', 2)).toHaveAttribute('aria-posinset', '3');
    await expect(item(page, 'single-selected', 2)).toHaveAttribute('aria-setsize', '3');
    // In a listbox, interactive is ignored: every item is an option.
    await mountFixtures(page, spec, { fixtures: [fixture('mixed', { selection: 'single', label: 'Theme' }, [{ headline: 'Light', value: 'light', interactive: true }])] });
    await expect(item(page, 'mixed', 0)).toHaveAttribute('role', 'option');
    await expect(row(page, 'mixed', 0)).not.toHaveAttribute('role');
  });

  test('LST-13: choosing another option of a single-select list sets value and emits change once; choosing the selected one changes nothing', async ({ page }) => {
    await listen(page);
    const theme = list(page, 'single-selected');
    const seen = await theme.evaluate((el) => {
      const log: unknown[] = [];
      el.addEventListener('change', () => log.push((el as any).value));
      (window as any).seenValue = log;
      return log.length;
    });
    expect(seen).toBe(0);
    await row(page, 'single-selected', 1).click();
    expect(await theme.evaluate((el: any) => el.value)).toBe('dark');
    // The list holds the new value before change is fired, as a native control does.
    expect(await page.evaluate(() => (window as any).seenValue)).toEqual(['dark']);
    expect((await events(page)).changes).toEqual([{ value: 'dark' }]);
    await expect(item(page, 'single-selected', 1)).toHaveAttribute('aria-selected', 'true');
    await expect(item(page, 'single-selected', 0)).toHaveAttribute('aria-selected', 'false');
    await expect(row(page, 'single-selected', 1)).toHaveClass(/selected/);
    await row(page, 'single-selected', 1).click();
    await item(page, 'single-selected', 1).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect((await events(page)).changes).toEqual([{ value: 'dark' }]);
    // The keyboard chooses too.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect((await events(page)).changes).toEqual([{ value: 'dark' }, { value: 'system' }]);
  });

  test('LST-14: choosing an option of a multiple-select list adds or removes its value and emits change once', async ({ page }) => {
    await listen(page);
    const labels = list(page, 'multiple-selected');
    await row(page, 'multiple-selected', 1).click();
    expect(await labels.evaluate((el: any) => el.values)).toEqual(['bug', 'docs', 'feature']);
    await row(page, 'multiple-selected', 0).click();
    expect(await labels.evaluate((el: any) => el.values)).toEqual(['docs', 'feature']);
    await item(page, 'multiple-selected', 2).focus();
    await page.keyboard.press('Space');
    expect((await events(page)).changes).toEqual([{ values: ['bug', 'docs', 'feature'] }, { values: ['docs', 'feature'] }, { values: ['feature'] }]);
    await expect(list(page, 'multiple-selected').getByRole('option', { selected: true })).toHaveCount(1);
  });

  test('LST-15: one tab stop — the first selected option, the first enabled item, then the one focused last; arrows without wrapping, Home, End, typeahead', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('theme', { selection: 'single', label: 'Theme', value: 'system' }, [
          { headline: 'Light', value: 'light' },
          { headline: 'Dark', value: 'dark' },
          { headline: 'Match the system', value: 'system' },
          { headline: 'Midnight', value: 'midnight' },
        ]),
        fixture('mixed', {}, [{ headline: 'Header' }, { headline: 'Wi-Fi', interactive: true, disabled: true }, { headline: 'Bluetooth', interactive: true }, { headline: 'About' }, { headline: 'Battery', interactive: true }]),
      ],
    });
    // The first selected option is the tab stop; only it is in the tab order.
    await tabTo(page, item(page, 'theme', 2));
    expect(await list(page, 'theme').locator('tanrei-list-item[tabindex="0"]').count()).toBe(1);
    // Down / Up Arrow, without wrapping; moving focus never changes the selection.
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Midnight');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Midnight');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Light');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Light');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Midnight');
    expect(await list(page, 'theme').evaluate((el: any) => el.value)).toBe('system');
    // Typeahead: the next item whose headline begins with the characters typed within a second of each other; a Space
    // that continues a search is typed, not an activation.
    await page.keyboard.press('d');
    expect(await focused(page)).toBe('Dark');
    await page.waitForTimeout(1100);
    await page.keyboard.press('m');
    expect(await focused(page)).toBe('Match the system');
    await page.waitForTimeout(1100);
    await page.keyboard.press('m');
    expect(await focused(page)).toBe('Midnight');
    await page.waitForTimeout(1100);
    await page.keyboard.type('match t', { delay: 50 });
    expect(await focused(page)).toBe('Match the system');
    expect(await list(page, 'theme').evaluate((el: any) => el.value)).toBe('system');
    // Space or Enter activates the focused item.
    await page.waitForTimeout(1100);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    expect(await list(page, 'theme').evaluate((el: any) => el.value)).toBe('dark');
    // Tab leaves the list; Shift+Tab comes back to the item focused last.
    await page.keyboard.press('ArrowDown');
    await tab(page);
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Match the system');

    // A list of actions: the first ENABLED item is the tab stop; static items take no focus; disabled ones are reached.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, row(page, 'mixed', 2));
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Battery');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Wi-Fi');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Wi-Fi');
    await page.keyboard.press('b');
    expect(await focused(page)).toBe('Bluetooth');
    await page.keyboard.press('a'); // "ba" continues the search from Bluetooth: Battery; "About" is static
    expect(await focused(page)).toBe('Battery');
  });

  test('LST-16: one row — the paddings, the leading element, the text column, the trailing elements, each a gap apart — mirrored in RTL', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [start, end, gap, icon] = await Promise.all([T('container-padding-inline-start'), T('container-padding-inline-end'), T('container-gap'), T('leading-icon-size')].map((n) => resolveToken(page, n)));
    const measure = async () => {
      const r = await bounds(row(page, 'leading-icon', 0));
      const lead = await bounds(row(page, 'leading-icon', 0).locator('.leading-icon'));
      const text = await bounds(row(page, 'leading-icon', 0).locator('.text'));
      const trail = await bounds(row(page, 'leading-icon', 0).locator('.trailing-text'));
      return { r, lead, text, trail };
    };
    const ltr = await measure();
    expect(ltr.r.width).toBe(360);
    expect(ltr.lead.x - ltr.r.x).toBeCloseTo(start, 1);
    expect(ltr.lead.width).toBeCloseTo(icon, 1);
    expect(ltr.text.x - (ltr.lead.x + ltr.lead.width)).toBeCloseTo(gap, 1);
    expect(ltr.trail.x - (ltr.text.x + ltr.text.width)).toBeCloseTo(gap, 1);
    expect(ltr.r.x + ltr.r.width - (ltr.trail.x + ltr.trail.width)).toBeCloseTo(end, 1);
    // A selectable list ends each row with the mark's box.
    const mark = await bounds(row(page, 'single-selected', 0).locator('.mark'));
    const r = await bounds(row(page, 'single-selected', 0));
    expect(r.x + r.width - (mark.x + mark.width)).toBeCloseTo(end, 1);

    await page.locator('[data-fixture="leading-icon"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await measure();
    expect(rtl.r.x + rtl.r.width - (rtl.lead.x + rtl.lead.width)).toBeCloseTo(start, 1);
    expect(rtl.lead.x - (rtl.text.x + rtl.text.width)).toBeCloseTo(gap, 1);
    expect(rtl.trail.x - rtl.r.x).toBeCloseTo(end, 1);
  });

  test('LST-16: in RTL a ripple still grows from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.locator('[data-fixture="interactive"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await row(page, 'interactive', 0).scrollIntoViewIfNeeded();
    const box = await bounds(row(page, 'interactive', 0));
    // Whole pixels: WebKit delivers the pointer at integer coordinates.
    const [x, y] = [Math.round(box.x + 40), Math.round(box.y + 20)];
    await page.mouse.move(x, y);
    await page.mouse.down();
    const at = await row(page, 'interactive', 0).locator('.ripple').evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), Number.parseFloat(el.style.getPropertyValue('--_y'))]);
    expect(at[0]).toBeCloseTo(x - box.x, 0);
    expect(at[1]).toBeCloseTo(y - box.y, 0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('LST-17: one-, two- and three-line minimum heights, the padding above and below, alignment, and growth with the content', async ({ page }) => {
    const [one, two, three, pad] = await Promise.all(['container-height-one-line', 'container-height-two-line', 'container-height-three-line', 'container-padding-block'].map((n) => resolveToken(page, T(n))));
    expect((await bounds(row(page, 'one-line', 0))).height).toBeCloseTo(one, 1);
    expect((await bounds(row(page, 'two-line-avatar', 0))).height).toBeCloseTo(two, 1);
    // Three lines of text are taller than the minimum: the row grows with them, padded above and below.
    const tall = await bounds(row(page, 'three-line-image', 0));
    expect(tall.height).toBeGreaterThanOrEqual(three);
    const text = await bounds(row(page, 'three-line-image', 0).locator('.text'));
    expect(text.y - tall.y).toBeCloseTo(pad, 1);
    expect(tall.y + tall.height - (text.y + text.height)).toBeCloseTo(pad, 1);
    // Centered on the text column in a two-line item; aligned with its top in a taller one.
    const avatar = await bounds(row(page, 'two-line-avatar', 0).locator('.media'));
    const twoText = await bounds(row(page, 'two-line-avatar', 0).locator('.text'));
    expect(avatar.y + avatar.height / 2).toBeCloseTo(twoText.y + twoText.height / 2, 0);
    const image = await bounds(row(page, 'three-line-image', 0).locator('.media'));
    expect(image.y).toBeCloseTo(text.y, 1);
    // Supporting text that wraps to two lines, alone, makes a three-line item (its minimum is taller than its content).
    await mountFixtures(page, spec, { fixtures: [fixture('wrap', {}, [{ headline: 'Roadmap', supportingText: 'The plan for the next quarter, with milestones, owners and the risks we already know about.' }])] });
    await expect(row(page, 'wrap', 0)).toHaveClass(/lines-3/);
    expect((await bounds(row(page, 'wrap', 0))).height).toBeCloseTo(three, 1);
    // At 200% text the rows grow and nothing is clipped.
    await mountFixtures(page, spec);
    const before = (await bounds(row(page, 'two-line-avatar', 0))).height;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await bounds(row(page, 'two-line-avatar', 0))).height).toBeGreaterThan(before * 1.3);
    const [scroll, client] = await row(page, 'two-line-avatar', 0).evaluate((el) => [el.scrollHeight, el.clientHeight]);
    expect(scroll).toBe(client);
  });

  test('LST-18: headline, overline, supporting and trailing text in their roles; they wrap; supportingMaxLines ends in an ellipsis, the full text still described', async ({ page }) => {
    const role = async (part: string, name: string) => {
      const locator = row(page, 'three-line-image', 0).locator(part);
      expect(await css(locator, 'font-size'), part).toBe(`${await resolveToken(page, T(`${name}-typescale-font-size`))}px`);
    };
    await role('.headline', 'headline');
    await role('.overline', 'overline');
    await role('.supporting', 'supporting-text');
    await role('.trailing-text', 'trailing-text');
    // Cut after two lines with an ellipsis…
    const supporting = row(page, 'three-line-image', 0).locator('.supporting');
    expect(await css(supporting, '-webkit-line-clamp')).toBe('2');
    const [scroll, client, line] = await supporting.evaluate((el) => [el.scrollHeight, el.clientHeight, Number.parseFloat(getComputedStyle(el).lineHeight)]);
    expect(scroll).toBeGreaterThan(client);
    expect(client).toBeCloseTo(line * 2, 0);
    // …and the headline wraps rather than truncating.
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('long', {}, [{ headline: 'A headline long enough to wrap onto a second line in a list that is three hundred and sixty wide', interactive: true, supportingText: 'The plan for the next quarter, with milestones, owners and the risks we already know about.', supportingMaxLines: 1 }]),
      ],
    });
    const headline = row(page, 'long', 0).locator('.headline');
    const [hScroll, hClient, hLine] = await headline.evaluate((el) => [el.scrollWidth, el.clientWidth, Number.parseFloat(getComputedStyle(el).lineHeight)]);
    expect(hScroll).toBe(hClient);
    expect((await bounds(headline)).height).toBeGreaterThan(hLine * 1.5);
    await expect(row(page, 'long', 0)).toHaveAttribute('aria-description', 'The plan for the next quarter, with milestones, owners and the risks we already know about.');
  });

  test('LST-30, LST-18: a supporting text cut by supportingMaxLines is cut at the end of its own direction in every engine — the box that cuts it has the text’s direction, a left-to-right text in a right-to-left list begins at its own left and a right-to-left one in a left-to-right list at its own right; a text without a letter, and one that is not cut, keep the layout’s', async ({ page }) => {
    const LATIN = 'The plan for the next quarter, with milestones, owners and the risks we already know about.';
    const ARABIC = 'خطة الربع القادم مع المراحل والمسؤولين والمخاطر التي نعرفها بالفعل وكل ما يتبعها من تفاصيل';
    const told = (id: string, text: string, lines: number, direction?: 'rtl'): Fixture => ({ ...fixture(id, {}, [{ headline: 'Plan', supportingText: text, supportingMaxLines: lines }]), ...(direction ? { direction } : {}) });
    await mountFixtures(page, spec, { fixtures: [told('latin-rtl', LATIN, 1, 'rtl'), told('arabic-ltr', ARABIC, 1), told('signs-rtl', '10 – 20', 1, 'rtl'), told('open-rtl', LATIN, 0, 'rtl')] });
    const measured = (id: string) =>
      row(page, id, 0).locator('.supporting').evaluate((el) => {
        const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, (node) => ((node as Text).data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)).nextNode() as Text;
        const at = text.data.search(/\S/);
        const range = document.createRange();
        range.setStart(text, at);
        range.setEnd(text, at + 1);
        const first = range.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return { dir: el.getAttribute('dir'), direction: getComputedStyle(el).direction, cut: el.scrollHeight > el.clientHeight, fromLeft: first.left - box.left, fromRight: box.right - first.right };
      });
    const latin = await measured('latin-rtl');
    expect([latin.dir, latin.direction, latin.cut]).toEqual(['auto', 'ltr', true]);
    expect(latin.fromLeft, 'it begins at its own left').toBeCloseTo(0, 0);
    const arabic = await measured('arabic-ltr');
    expect([arabic.dir, arabic.direction, arabic.cut]).toEqual(['auto', 'rtl', true]);
    expect(arabic.fromRight, 'it begins at its own right').toBeCloseTo(0, 0);
    expect([(await measured('signs-rtl')).dir, (await measured('signs-rtl')).direction]).toEqual([null, 'rtl']);
    // Not cut: nothing of its own, and aligned by the layout — at the right in a right-to-left list.
    const open = await measured('open-rtl');
    expect([open.dir, open.direction]).toEqual([null, 'rtl']);
    expect(await css(row(page, 'open-rtl', 0).locator('.supporting'), 'text-align')).toBe('right');
  });

  test('LST-19: icons at their sizes, in the family and fill of the item’s condition; an empty name draws nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const glyph = (id: string, n: number, part: string) => row(page, id, n).locator(part);
    expect(await css(glyph('leading-icon', 0, '.leading-icon'), 'font-size')).toBe(`${await resolveToken(page, T('leading-icon-size'))}px`);
    expect(await css(glyph('interactive', 0, '.trailing-icon'), 'font-size')).toBe(`${await resolveToken(page, T('trailing-icon-size'))}px`);
    expect(await css(glyph('leading-icon', 0, '.leading-icon'), 'color')).toBe(await resolveColor(page, T('unselected-leading-icon-color')));
    // A selected option's icon takes the selected family and fill, and its color.
    const fill = (id: string, n: number) => css(glyph(id, n, '.leading-icon'), '--tanrei-icon-fill').then((v) => v.trim());
    expect(await fill('multiple-selected', 0)).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    expect(await fill('multiple-selected', 1)).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    expect(await css(glyph('multiple-selected', 0, '.leading-icon'), 'color')).toBe(await resolveColor(page, T('selected-leading-icon-color')));
    expect(await glyph('leading-icon', 0, '.leading-icon').getAttribute('aria-hidden')).toBe('true');
    // No name: no element and no space — the text starts at the padding.
    await expect(row(page, 'one-line', 0).locator('.leading-icon, .trailing-icon')).toHaveCount(0);
    const r = await bounds(row(page, 'one-line', 0));
    expect((await bounds(row(page, 'one-line', 0).locator('.text'))).x - r.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-start')), 1);
  });

  test('LST-20: an avatar and an image frame the leading slot at their sizes and shapes, filled and colored by the media tokens; a monogram in the headline style', async ({ page }) => {
    const avatar = row(page, 'two-line-avatar', 0).locator('.media');
    const image = row(page, 'three-line-image', 0).locator('.media');
    const [a, i] = [await bounds(avatar), await bounds(image)];
    expect([a.width, a.height]).toEqual([await resolveToken(page, T('avatar-size')), await resolveToken(page, T('avatar-size'))]);
    expect([i.width, i.height]).toEqual([await resolveToken(page, T('image-size')), await resolveToken(page, T('image-size'))]);
    expect(Number.parseFloat(await css(avatar, 'border-top-left-radius'))).toBeGreaterThanOrEqual(a.width / 2);
    expect(Number.parseFloat(await css(image, 'border-top-left-radius'))).toBe(await resolveToken(page, T('image-shape')));
    for (const media of [avatar, image]) {
      expect(await css(media, 'background-color')).toBe(await resolveColor(page, T('media-container-color')));
      expect(await css(media, 'color')).toBe(await resolveColor(page, T('media-content-color')));
      expect(await css(media, 'overflow')).toBe('hidden');
    }
    // The monogram (the fixture's first letter) is set in the headline's style, centred.
    const monogram = item(page, 'two-line-avatar', 0).locator('[slot="leading"]');
    expect(await css(monogram, 'font-size')).toBe(`${await resolveToken(page, T('headline-typescale-font-size'))}px`);
    const m = await bounds(monogram);
    expect(m.x + m.width / 2).toBeCloseTo(a.x + a.width / 2, 0);
    // With media, no leading icon; without media, no leading slot.
    await mountFixtures(page, spec, { fixtures: [fixture('both', {}, [{ headline: 'Ada', leadingMedia: 'avatar', leadingIcon: 'person' }, { headline: 'Grace' }])] });
    await expect(row(page, 'both', 0).locator('.leading-icon')).toHaveCount(0);
    await expect(row(page, 'both', 1).locator('slot[name="leading"]')).toHaveCount(0);
  });

  test('LST-21: a mark box of mark.size (the trailing icon’s size) is reserved in every option; a selected option draws the icon set’s check in it, in the mark color, the selected family and fill, never mirrored; no mark of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const size = await resolveToken(page, T('mark-size'));
    expect(size).toBe(await resolveToken(page, T('trailing-icon-size')));
    await expect(list(page, 'single-selected').locator('tanrei-list-item')).toHaveCount(3);
    const mark = (id: string, n: number) => row(page, id, n).locator('.mark');
    for (const n of [0, 1, 2]) {
      const box = await bounds(mark('single-selected', n));
      expect([box.width, box.height]).toEqual([size, size]);
      await expect(mark('single-selected', n)).toHaveText('check');
      await expect(mark('single-selected', n)).toHaveAttribute('data-drawn', '');
    }
    await expect(row(page, 'one-line', 0).locator('.mark')).toHaveCount(0);
    // Only the selected options show it, in the mark color of their condition.
    expect(await css(mark('single-selected', 0), 'opacity')).toBe('1');
    expect(await css(mark('single-selected', 1), 'opacity')).toBe('0');
    expect(await css(mark('single-selected', 0), 'color')).toBe(await resolveColor(page, T('selected-mark-color')));
    expect(await css(mark('multiple-selected', 0), 'opacity')).toBe('1');
    // The selected family and fill at sys.icon.weight, at mark.size, whatever the option's condition.
    const probe = (property: string, value: string) =>
      page.evaluate(([p, v]) => {
        const el = document.createElement('div');
        el.style.setProperty(p, v);
        document.body.append(el);
        const out = getComputedStyle(el).getPropertyValue(p);
        el.remove();
        return out;
      }, [property, value] as const);
    const family = await probe('font-family', 'var(--tanrei-sys-icon-family-selected)');
    const variation = await probe('font-variation-settings', `'FILL' var(--tanrei-sys-icon-fill-selected), 'wght' var(--tanrei-sys-icon-weight), 'GRAD' 0${await opticalSizeAxis(page, size)}`);
    for (const n of [0, 1]) {
      expect(Number.parseFloat(await css(mark('single-selected', n), 'font-size'))).toBe(size);
      expect(await css(mark('single-selected', n), 'font-family')).toBe(family);
      expect(await css(mark('single-selected', n), 'font-variation-settings')).toBe(variation);
    }
    // No path, shape or character of its own.
    expect(await item(page, 'single-selected', 0).evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, img, canvas').length)).toBe(0);
    // Not mirrored in a right-to-left layout: the glyph is laid out left to right, neither flipped nor scaled.
    await list(page, 'single-selected').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await css(mark('single-selected', 0), 'direction')).toBe('ltr');
    expect(await css(mark('single-selected', 0), 'transform')).toBe('none');
    expect(await css(mark('single-selected', 0), 'scale')).toBe('none');
    // Under acme, whose icon set is static, the check is in acme's selected family.
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), icons: true });
    const families = (value: string) => value.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
    const selected = families(await token(page, '--tanrei-sys-icon-family-selected'));
    expect(selected).not.toEqual(families(await token(page, '--tanrei-sys-icon-family-unselected')));
    expect(families(await css(mark('single-selected', 0), 'font-family'))).toEqual(selected);
  });

  test('LST-21: selecting or unselecting fades the check over the state motion, without moving or scaling it; at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const check = (n: number) => row(page, 'single-selected', n).locator('.mark');
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const easing = await page.evaluate((n) => {
      const el = document.createElement('div');
      el.style.transitionTimingFunction = `var(${n})`;
      document.body.append(el);
      const out = getComputedStyle(el).transitionTimingFunction;
      el.remove();
      return out;
    }, T('motion-state-easing'));
    const transitions = await check(1).evaluate((el) => {
      const s = getComputedStyle(el);
      const properties = s.transitionProperty.split(', ');
      const durations = s.transitionDuration.split(', ');
      const easings = s.transitionTimingFunction.split(/,\s*(?![^(]*\))/);
      return Object.fromEntries(properties.map((p, i) => [p, [Number.parseFloat(durations[i]) * 1000, easings[i]]]));
    });
    expect(transitions.opacity).toEqual([duration, easing]);
    for (const moving of ['transform', 'scale', 'translate', 'clip-path', 'all']) expect(transitions[moving], moving).toBeUndefined();
    // Where the check sits in its row (the page may scroll to the row on the click).
    const place = () =>
      check(1).evaluate((el) => {
        const [m, r] = [el.getBoundingClientRect(), el.closest('.row')!.getBoundingClientRect()];
        return [m.x - r.x, m.y - r.y, m.width, m.height];
      });
    const before = await place();
    // A slow state motion, so the fade is still running when it is read.
    await override(page, { [T('motion-state-duration')]: '2000ms' });
    // What the check begins is kept as the engine announces it: asked two answers after the click what is running, a
    // runner that takes a second an answer was told nothing.
    await check(1).evaluate((el) => {
      const begun: string[] = ((window as any).checkBegan = []);
      el.addEventListener('transitionrun', (event) => event.target === el && begun.push(event.propertyName));
    });
    await row(page, 'single-selected', 1).click();
    await page.mouse.move(0, 0);
    // The fade runs on opacity alone, and the glyph stays where it was.
    await expect.poll(() => page.evaluate(() => (window as any).checkBegan as string[])).toContain('opacity');
    expect(await place()).toEqual(before);
    await expect.poll(() => css(check(1), 'opacity')).toBe('1');
    await expect.poll(() => css(check(0), 'opacity')).toBe('0');
    // …and at once where motion is reduced.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(check(1), 'transition-duration')).toBe('0s');
    await row(page, 'single-selected', 2).click();
    expect(await css(check(2), 'opacity')).toBe('1');
  });

  test('LST-27: while the icon set cannot draw the check nothing is drawn in its place — never its name — the box keeps its size and the selected state is exposed; the check appears without the fade once the font arrives', async ({ page }) => {
    await withoutIconFont(page);
    const size = await resolveToken(page, T('mark-size'));
    const check = (n: number) => row(page, 'single-selected', n).locator('.mark');
    await expect(check(0)).not.toHaveAttribute('data-drawn');
    // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
    expect(await check(0).locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeGreaterThan(size * 1.5);
    expect(await css(check(0), 'visibility')).toBe('hidden');
    for (const n of [0, 1, 2]) {
      const box = await bounds(check(n));
      expect([box.width, box.height], `option ${n}`).toEqual([size, size]);
    }
    await expect(list(page, 'single-selected').getByRole('option', { selected: true })).toHaveCount(1);
    const text = await bounds(row(page, 'single-selected', 0).locator('.text'));
    // A slow state motion: an appearing check that faded would still be fading when read.
    await rootTokens(page, { [T('motion-state-duration')]: '60000ms' });
    await iconFaceArrives(page);
    await expect(check(0)).toHaveAttribute('data-drawn', '');
    expect(await css(check(0), 'visibility')).toBe('visible');
    expect(await css(check(0), 'opacity')).toBe('1');
    expect(await check(0).evaluate((el) => el.getAnimations().length), 'without motion').toBe(0);
    expect(await bounds(row(page, 'single-selected', 0).locator('.text')), 'the text does not move').toEqual(text);
  });

  test('LST-22: the divider runs along the bottom from the text column to the end, in its color and thickness, at full opacity, hidden', async ({ page }) => {
    const [pad, thickness] = await Promise.all([T('container-padding-inline-start'), T('divider-thickness')].map((n) => resolveToken(page, n)));
    const line = item(page, 'dividers', 0).locator('.divider');
    const [r, d, host] = [await bounds(row(page, 'dividers', 0)), await bounds(line), await bounds(item(page, 'dividers', 0))];
    expect(d.height).toBeCloseTo(thickness, 1);
    expect(d.x - r.x).toBeCloseTo(pad, 1);
    expect(d.x + d.width).toBeCloseTo(r.x + r.width, 1);
    expect(d.y + d.height).toBeCloseTo(host.y + host.height, 1);
    expect(await css(line, 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    await expect(line).toHaveAttribute('aria-hidden', 'true');
    await expect(item(page, 'dividers', 2).locator('.divider')).toHaveCount(0);
    // It starts where the text does, after a leading element.
    await mountFixtures(page, spec, {
      fixtures: [fixture('lead', {}, [{ headline: 'Inbox', leadingIcon: 'inbox', divider: true, interactive: true, disabled: true }, { headline: 'Ada', leadingMedia: 'avatar', divider: true }])],
    });
    for (const n of [0, 1]) {
      const text = await bounds(row(page, 'lead', n).locator('.text'));
      expect((await bounds(item(page, 'lead', n).locator('.divider'))).x).toBeCloseTo(text.x, 1);
    }
    // A disabled item's opacity does not reach it.
    const opacity = await item(page, 'lead', 0).locator('.divider').evaluate((el) => {
      let o = 1;
      for (let at: Element | null = el; at; at = at.parentElement ?? ((at.parentNode as ShadowRoot)?.host ?? null)) o *= Number(getComputedStyle(at).opacity);
      return o;
    });
    expect(opacity).toBe(1);
    expect(await css(row(page, 'lead', 0), 'opacity')).toBe(await token(page, T('disabled-opacity')));
  });

  test('LST-23: named by the headline, described by overline, supporting and trailing text; decorations hidden; an empty name and a nameless listbox are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('options', { selection: 'single', label: 'Files' }, [{ headline: 'Roadmap', overline: 'Engineering', supportingText: 'The plan', trailingText: '9:41', leadingIcon: 'description', value: 'roadmap' }]),
        fixture('actions', {}, [{ headline: 'Wi-Fi', supportingText: 'Connected', trailingIcon: 'chevron_right', interactive: true }, { headline: '', interactive: true }]),
        fixture('nameless', { selection: 'multiple' }, [{ headline: 'Bug', value: 'bug' }]),
        fixture('people', {}, [{ headline: 'Ada Lovelace', leadingMedia: 'avatar' }, { headline: 'Grace Hopper', leadingMedia: 'avatar' }]),
      ],
    });
    await expect(item(page, 'options', 0)).toHaveAttribute('aria-label', 'Roadmap');
    await expect(item(page, 'options', 0)).toHaveAttribute('aria-description', 'Engineering, The plan, 9:41');
    await expect(row(page, 'actions', 0)).toHaveAttribute('aria-label', 'Wi-Fi');
    await expect(row(page, 'actions', 0)).toHaveAttribute('aria-description', 'Connected');
    for (const part of ['.leading-icon', '.mark']) await expect(row(page, 'options', 0).locator(part)).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, 'actions', 0).locator('.trailing-icon')).toHaveAttribute('aria-hidden', 'true');
    // The media is hidden unless the product names what it put there.
    await item(page, 'people', 0).evaluate((el) => (el.innerHTML = '<span slot="leading">A</span>'));
    await item(page, 'people', 1).evaluate((el) => (el.innerHTML = '<img slot="leading" alt="Grace Hopper, portrait" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">'));
    await expect(row(page, 'people', 0).locator('.media')).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, 'people', 1).locator('.media')).not.toHaveAttribute('aria-hidden');
    expect(await list(page, 'people').ariaSnapshot()).toBe('- list:\n  - listitem: Ada Lovelace\n  - listitem:\n    - img "Grace Hopper, portrait"\n    - text: Grace Hopper');
    // An empty headline still renders; a debug build reports it, and a listbox without a label.
    await expect(list(page, 'actions').locator('tanrei-list-item')).toHaveCount(2);
    await expect.poll(() => seen.filter((w) => w.includes('LST-23')).length).toBe(2);
    expect(seen).toEqual(
      expect.arrayContaining([expect.stringMatching(/headline is empty, so the item has no accessible name/), expect.stringMatching(/a selectable list has no label, so the listbox has no accessible name/)]),
    );
  });

  test('LST-24: an action’s or an option’s slots hold nothing interactive — a debug build reports one, on every slot change', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('action', {}, [{ headline: 'Wi-Fi', interactive: true }]), fixture('plain', {}, [{ headline: 'Airplane mode' }]), fixture('option', { selection: 'single', label: 'Theme' }, [{ headline: 'Light', value: 'light' }])],
    });
    await item(page, 'plain', 0).evaluate((el) => (el.innerHTML = '<input slot="trailing" type="checkbox" aria-label="Airplane mode">'));
    await page.waitForTimeout(200);
    expect(seen.filter((w) => w.includes('LST-24'))).toEqual([]);
    await item(page, 'action', 0).evaluate((el) => (el.innerHTML = '<button slot="trailing">More</button>'));
    await item(page, 'option', 0).evaluate((el) => (el.innerHTML = '<a slot="trailing" href="#x">Edit</a>'));
    await expect.poll(() => seen.filter((w) => w.includes('LST-24')).length).toBe(2);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/an interactive item holds an interactive element \(<button>\) in its trailing slot/), expect.stringMatching(/an option holds an interactive element \(<a>\)/)]));
  });

  test('LST-25: an action’s or an option’s colors change over the state motion, and at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    const r = row(page, 'interactive', 0);
    expect(await css(r, 'transition-property')).toContain('background-color');
    expect((await css(r, 'transition-duration')).split(', ').map((d) => Number.parseFloat(d) * 1000)).toContain(duration);
    expect(await css(r, 'transition-timing-function')).toContain(easing);
    expect(await css(r.locator('.headline'), 'transition-property')).toContain('color');
    expect(Number.parseFloat(await css(r.locator('.headline'), 'transition-duration')) * 1000).toBe(duration);
    // Hover starts a transition: halfway, the color is between the two. (At 60 s, and the row's own transition held half
    // way through its time when it is first found: read 300 ms and an answer after the hover at 2 s, it was read
    // wherever the machine had let it get to.)
    await override(page, { [T('motion-state-duration')]: '60s' });
    const unhovered = await css(r, 'background-color');
    await r.hover();
    let mid: string | null = null;
    await expect
      .poll(async () => {
        mid = await r.evaluate((el) => {
          const moving = el.getAnimations().filter((animation) => (animation as CSSTransition).transitionProperty === 'background-color');
          if (moving.length === 0) return null;
          for (const animation of moving) {
            animation.pause();
            animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
          }
          return getComputedStyle(el).backgroundColor;
        });
        return mid;
      }, 'the hover begins a transition of the row’s color')
      .not.toBeNull();
    expect(mid).not.toBe(await resolveColor(page, T('unselected-hovered-container-color')));
    expect(mid, 'and it has left the color it had').not.toBe(unhovered);
    await r.evaluate((el) => el.getAnimations().forEach((animation) => animation.finish()));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(r, 'transition-duration')).toBe('0s');
    expect(await css(r.locator('.headline'), 'transition-duration')).toBe('0s');
  });

  test('LST-26: options are selected by the list’s value or values; values that name nothing, empty and repeated values are still drawn and reported', async ({ page }) => {
    const seen = warnings(page);
    await expect(row(page, 'single-selected', 0)).toHaveClass(/selected/);
    await expect(row(page, 'multiple-selected', 1)).not.toHaveClass(/selected/);
    // The product sets the selection too.
    await list(page, 'single-selected').evaluate((el: any) => (el.value = 'system'));
    await expect(item(page, 'single-selected', 2)).toHaveAttribute('aria-selected', 'true');
    await list(page, 'multiple-selected').evaluate((el: any) => (el.values = ['feature']));
    await expect(list(page, 'multiple-selected').getByRole('option', { selected: true })).toHaveCount(1);
    await list(page, 'single-selected').evaluate((el: any) => (el.value = null));
    await expect(list(page, 'single-selected').getByRole('option', { selected: true })).toHaveCount(0);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('odd', { selection: 'multiple', label: 'Labels', values: ['bug', 'wontfix'] }, [
          { headline: 'Bug', value: 'bug' },
          { headline: 'Bug again', value: 'bug' },
          { headline: 'No value' },
        ]),
      ],
    });
    await expect(list(page, 'odd').locator('tanrei-list-item')).toHaveCount(3);
    await expect(list(page, 'odd').getByRole('option', { selected: true })).toHaveCount(2);
    await expect.poll(() => seen.filter((w) => w.includes('LST-26')).length, seen.join('\n')).toBe(3);
    expect(seen).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/repeats the value "bug"/),
        expect.stringMatching(/option 3 \("No value"\) has no value/),
        expect.stringMatching(/the selection names "wontfix", which no option has as its value/),
      ]),
    );
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });
  const pressed = (page: P, id: string, n: number) => row(page, id, n).getAttribute('data-pressed');
  const ripples = (page: P, id: string, n: number) => row(page, id, n).locator('.ripple');

  /** Records, inside the page, when data-pressed appears and disappears, and when the press ends. */
  const watchPress = (page: P, target: Locator) =>
    target.evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.transitionDuration, s.backgroundColor];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('LST-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold, on an action and an option', async ({ page }) => {
    expect(await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration')).toBe(100);
    const hold = 1000;
    for (const [id, n, focus] of [['interactive', 0, 'row'], ['single-selected', 1, 'host']] as const) {
      for (const [name, activate] of [
        ['Enter', () => page.keyboard.press('Enter')],
        ['Space', () => page.keyboard.press('Space')],
        ['click', () => row(page, id, n).click()],
      ] as const) {
        // (Six mounts in one test: only the two fixtures it presses, so that the test fits its time in every engine.)
        await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'interactive' || f.id === 'single-selected') });
        await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
        await (focus === 'row' ? row(page, id, n) : item(page, id, n)).focus();
        await expect.poll(() => css(row(page, id, n), 'background-color')).toBe(await resolveColor(page, T('unselected-focused-container-color')));
        await watchPress(page, row(page, id, n));
        await activate();
        await expect.poll(async () => (await pressLog(page)).off, `${id} ${name}`).toBeDefined();
        const log = await pressLog(page);
        expect(log.seen?.slice(0, 2), `${id} ${name}`).toEqual(['overlay', '0s']);
        expect(log.up! - log.on!, `${id} ${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
        expect(log.off! - log.down!, `${id} ${name}`).toBeGreaterThanOrEqual(hold - 1);
      }
    }
  });

  test('LST-8: a pointer press lasts while the pointer is down; a key press ends when focus leaves; a disabled item shows none', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await row(page, 'interactive', 0).hover();
    await page.mouse.down();
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, 'interactive', 0)).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'interactive', 0)).toBeNull();
    await item(page, 'single-selected', 1).focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, 'single-selected', 1)).toBe('overlay');
    await item(page, 'single-selected', 1).evaluate((el) => (el as HTMLElement).blur());
    await expect.poll(() => pressed(page, 'single-selected', 1)).toBeNull();
    await page.keyboard.up('Space');
    await row(page, 'interactive-disabled', 0).hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive-disabled', 0)).toBeNull();
    await page.mouse.up();
  });

  test('LST-9 overlay (the default system): the pressed tokens on the whole row at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await row(page, 'interactive', 0).hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('overlay');
    expect(await css(row(page, 'interactive', 0), 'background-color')).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    expect(await ripples(page, 'interactive', 0).count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('LST-9 ripple (m3-like): the pressed layer grows from the point of contact under the content; the parts take their pressed colors at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const r = row(page, 'single-selected', 1);
    await r.scrollIntoViewIfNeeded();
    const box = await bounds(r);
    const hovered = await resolveColor(page, T('unselected-hovered-container-color'));
    await override(page, { [T('unselected-pressed-headline-color')]: 'rgb(0, 0, 255)' });
    const [px, py] = [Math.round(box.x + 30), Math.round(box.y + 12)];
    await page.mouse.move(px, py);
    await expect.poll(() => css(r, 'background-color')).toBe(hovered);
    await page.mouse.down();
    expect(await pressed(page, 'single-selected', 1)).toBe('ripple');
    const ripple = ripples(page, 'single-selected', 1);
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')), y: Number.parseFloat(el.style.getPropertyValue('--_y')), color: s.backgroundColor, animation: s.animationName, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000, under: s.zIndex };
    });
    expect(layer.x).toBeCloseTo(px - box.x, 0);
    expect(layer.y).toBeCloseTo(py - box.y, 0);
    expect(layer).toMatchObject({ color: await resolveColor(page, T('unselected-pressed-container-color')), animation: 'ripple-grow', under: '-1' });
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(await css(r, 'background-color')).toBe(hovered);
    expect(await css(r.locator('.headline'), 'color')).toBe('rgb(0, 0, 255)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
    // Keyboard activation answers from the center; reduced motion makes the layer appear whole.
    await row(page, 'interactive', 0).focus();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    const still = await ripples(page, 'interactive', 0).evaluate((el) => {
      const s = getComputedStyle(el);
      const own = el.getBoundingClientRect();
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, animation: s.animationName };
    });
    expect(still.x).toBeCloseTo(0.5, 5);
    expect(still.animation).toBe('none');
    await page.keyboard.up('Enter');
  });

  test('LST-9 dim (cupertino): the pressed opacity on the whole row, no state layer; the parts take their pressed colors', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, { [T('unselected-pressed-container-color')]: 'rgb(255, 0, 0)', [T('unselected-pressed-headline-color')]: 'rgb(0, 0, 255)' });
    const r = row(page, 'interactive', 0);
    await r.hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('dim');
    expect(await css(r, 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(r, 'opacity'))).toBeLessThan(1);
    expect(await css(r, 'background-color')).not.toBe('rgb(255, 0, 0)');
    expect(await css(r.locator('.headline'), 'color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, 'interactive', 0).count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('LST-9 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    const r = row(page, 'interactive', 0);
    await r.hover();
    await expect.poll(() => css(r, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('none');
    expect(await css(r, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await r.hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('overlay');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('LST-10 corner smoothing: the default rows are square; a rounded row under cupertino eases its corners, the ring concentric', async ({ page }) => {
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    await mountFixtures(page, spec, { system: 'cupertino' });
    await override(page, { [T('container-shape')]: '12px' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    const r = row(page, 'interactive', 0);
    if (supported) {
      expect(Number.parseFloat((await css(r, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      await expect.poll(async () => Number.parseFloat(await css(r, 'border-top-left-radius'))).toBeCloseTo(12 * 1.24, 2);
      await tabTo(page, r);
      expect(await css(r, 'corner-top-left-shape', '::after')).toBe(await css(r, 'corner-top-left-shape'));
    } else await expect.poll(async () => Number.parseFloat(await css(r, 'border-top-left-radius'))).toBe(12);
  });

  test('LST-10 focus-style: acme shows keyboard focus as a glow inside the row, on an action and an option; the default is a ring', async ({ page }) => {
    await tabTo(page, row(page, 'interactive', 0));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(row(page, 'interactive', 0), 'box-shadow', '::after')).toBe('none');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    for (const [target, r] of [[row(page, 'interactive', 0), row(page, 'interactive', 0)], [item(page, 'single-selected', 0), row(page, 'single-selected', 0)]] as const) {
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, target);
      expect(await css(r, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(r, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${ring} 0px 0px ${outer}px ${outer + 1}px`);
      // Inside: the halo's box is the row shrunk by its reach, so it spreads out to the edge and is not clipped.
      expect(await css(r, 'top', '::after')).toBe(`${(1 + outer) * 2}px`);
      await expect(target).toHaveAttribute('data-focus-style', 'glow');
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('forced colors: a disabled row reads as disabled and the check stays visible where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
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
    // The check is text, so the mode paints it in CanvasText; it keeps its full opacity.
    const mark = row(page, 'single-selected', 0).locator('.mark');
    expect(await css(mark, 'color')).not.toBe('rgba(0, 0, 0, 0)');
    expect(await css(mark, 'opacity')).toBe('1');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// ── A list item with a destination is a link item ──────────────────────
test.describe('link form', () => {
  const links = spec.fixtures.find((f) => f.id === 'links')!;
  const linksRtl = spec.fixtures.find((f) => f.id === 'links-rtl')!;
  /** The same items as interactive items without a destination: what link items must be drawn as (LST-31). */
  const twins: Fixture = {
    id: 'links-twin',
    props: {},
    items: links.items!.map(({ props: { href: _href, target: _target, targetLabel: _targetLabel, ...props } }) => ({ kind: 'list-item', props: { ...props, interactive: true } })),
  };
  const NEW = { href: 'https://example.com/tanrei', target: 'new', targetLabel: 'opens in a new tab' };
  const trailing = (page: P, id: string, n: number) => markOf(item(page, id, n), '.trailing-icon');

  test('LST-31, LST-12, LST-11: an item with href is one anchor to it — the link role and not the button role — inside its list item, named and described as an item is, whether interactive is set or not, drawn in every state exactly as an interactive item; a static item beside it takes no focus', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [links, twins, fixture('mixed', {}, [{ headline: 'Header' }, { headline: 'Docs', supportingText: 'Guides', href: '/docs/', interactive: true }, { headline: 'Planned', href: '   ', disabled: true }])],
    });
    await expect(list(page, 'links')).toHaveAttribute('role', 'list');
    await expect(list(page, 'links').getByRole('listitem')).toHaveCount(4);
    await expect(list(page, 'links').getByRole('link')).toHaveCount(4);
    await expect(list(page, 'links').getByRole('button')).toHaveCount(0);
    for (const [n, name, description, href] of [[0, 'Button', 'Actions and toggles', '/components/button/'], [1, 'Card', 'Related content, set apart', '/components/card/']] as const) {
      await expect(item(page, 'links', n)).toHaveAttribute('role', 'listitem');
      await expect(item(page, 'links', n)).toHaveAttribute('aria-posinset', String(n + 1));
      await expect(item(page, 'links', n)).toHaveAttribute('aria-setsize', '4');
      expect(await anchorOf(item(page, 'links', n)), name).toMatchObject({ tag: 'a', href, target: null, rel: null, role: null, disabled: null, description });
      await expect(list(page, 'links').getByRole('listitem').nth(n).getByRole('link', { name, exact: true })).toHaveAccessibleDescription(description);
      // The platform's own link: one anchor with the address, and nothing else in the row that takes focus.
      expect(await item(page, 'links', n).evaluate((el) => el.shadowRoot!.querySelectorAll('a[href], [tabindex]').length), name).toBe(1);
      await expectDrawnAlike(page, item(page, 'links', n), item(page, 'links-twin', n));
      await expect.poll(() => drawn(page, 'links', n), name).toEqual(await expected(page, 'unselected'));
      // No underline, and each text in the color of its part — never a link's.
      expect(await css(row(page, 'links', n), 'text-decoration-line'), name).toBe('none');
      expect(await css(item(page, 'links', n).locator('.supporting'), 'color'), name).toBe(await resolveColor(page, T('unselected-supporting-text-color')));
      expect((await bounds(row(page, 'links', n))).height, name).toBe((await bounds(row(page, 'links-twin', n))).height);
    }
    // The leading icon of the second item is where an interactive item's is.
    expect((await bounds(item(page, 'links', 1).locator('.leading-icon'))).x).toBe((await bounds(item(page, 'links-twin', 1).locator('.leading-icon'))).x);
    // Keyboard focus: the same ring inside the row, the same focused paint. (The item pressed last is each list's tab stop.)
    await tabTo(page, row(page, 'links', 1));
    await expect(row(page, 'links', 1)).toHaveCSS('outline-style', 'solid');
    const focusedLink = await settledPaint(item(page, 'links', 1));
    await tabTo(page, row(page, 'links-twin', 1));
    expect(focusedLink).toEqual(await settledPaint(item(page, 'links-twin', 1)));
    // interactive beside href: still a link, not a button. LST-11: an item with neither (white space is no destination)
    // is static — no role of its own in the row, no tabindex, disabled ignored, the resting tokens.
    expect(await anchorOf(item(page, 'mixed', 1))).toMatchObject({ tag: 'a', href: '/docs/', role: null });
    expect(await anchorOf(item(page, 'mixed', 2))).toMatchObject({ tag: 'div', href: null, role: null, tabindex: null, disabled: null });
    expect(await anchorOf(item(page, 'mixed', 0))).toMatchObject({ tag: 'div', role: null, tabindex: null });
    expect(await drawn(page, 'mixed', 2)).toEqual(await expected(page, 'unselected'));
    await listen(page);
    await row(page, 'mixed', 2).click();
    await tabTo(page, row(page, 'mixed', 1));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Docs');
    expect(await list(page, 'mixed').evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => each.shadowRoot!.querySelector('.row')!.getAttribute('tabindex')))).toEqual([null, '0', null]);
  });

  test('LST-15, LST-31: link items are in the list’s one tab stop and arrow-key order — Down and Up Arrow without wrapping, Home, End and typeahead move between them, a disabled one included', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [links] });
    await tabTo(page, row(page, 'links', 0));
    expect(await list(page, 'links').evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => each.shadowRoot!.querySelector('a')!.getAttribute('tabindex')))).toEqual(['0', '-1', '-1', '-1']);
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Card');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Archive');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Archive');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Source');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Button');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Button');
    await page.keyboard.press('s');
    expect(await focused(page)).toBe('Source');
    // The item focused last is the tab stop.
    expect(await list(page, 'links').evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => each.shadowRoot!.querySelector('a')!.getAttribute('tabindex')))).toEqual(['-1', '-1', '0', '-1']);
  });

  test('LST-1, LST-32, LST-15: a link item emits its click exactly once for a pointer and for Enter on the focused item and then follows href, at once; a cancelled click opens nothing; Space emits no click, shows no press and scrolls the page; a modified or a middle click is the browser’s', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [links] });
    await expectLinkActivation(page, item(page, 'links', 0));
  });

  test('LST-33: a link item that opens a new context draws open_in_new as its trailing icon — at trailing-icon.size, in the trailing-icon color, hidden — unless trailingIcon names a glyph, and ends its description with targetLabel; an empty one is reported; target same draws no mark and ignores it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [links, fixture('own', {}, [{ headline: 'Releases', supportingText: 'Every version', trailingIcon: 'chevron_right', ...NEW }, { headline: 'Changelog', trailingText: '12', href: '/changelog/', targetLabel: 'opens in a new tab' }])],
    });
    const source = item(page, 'links', 2);
    expect(await anchorOf(source)).toMatchObject({ tag: 'a', href: 'https://example.com/tanrei', target: '_blank', rel: 'noopener', description: 'The repository, opens in a new tab' });
    await expect(source.getByRole('link', { name: 'Source', exact: true })).toHaveAccessibleDescription('The repository, opens in a new tab');
    const mark = (await trailing(page, 'links', 2))!;
    const size = await resolveToken(page, T('trailing-icon-size'));
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.hidden).toBe(true);
    expect([mark.width, mark.height]).toEqual([size, size]);
    expect(size, 'the default system: 24').toBe(24);
    expect(mark.right, 'at the row’s end').toBeCloseTo(await resolveToken(page, T('container-padding-inline-end')), 1);
    expect(mark.color).toBe(await resolveColor(page, T('unselected-trailing-icon-color')));
    expect(mark.mirrored, 'the icon set marks its name').toBe(true);
    expect(mark.transform, 'left-to-right draws it as it is').toBe('none');
    // The items that open in place draw none.
    for (const n of [0, 1, 3]) expect(await trailing(page, 'links', n), `item ${n}`).toBeNull();
    // The product's own trailing icon stands, and no mark is added; the description still ends with the words.
    expect(await item(page, 'own', 0).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.trailing-icon')].map((each) => each.textContent!.trim()))).toEqual(['chevron_right']);
    expect(await anchorOf(item(page, 'own', 0))).toMatchObject({ target: '_blank', description: 'Every version, opens in a new tab' });
    // In place: no mark, and targetLabel is ignored.
    expect(await trailing(page, 'own', 1)).toBeNull();
    expect(await anchorOf(item(page, 'own', 1))).toMatchObject({ target: null, description: '12' });
    await expectTargetLabel(page, source, seen, 'LST-33', { before: 'The repository' });
    expect((await trailing(page, 'links', 2))?.glyph, 'the mark stays without the words').toBe('open_in_new');
    await expectNewContext(page, source);
  });

  test('LST-33: in a right-to-left layout the mark stands at the left of the row, mirrored by the icon helper', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [linksRtl] });
    const mark = (await trailing(page, 'links-rtl', 1))!;
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.left).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end')), 1);
    expect(mark.left).toBeLessThan((await bounds(item(page, 'links-rtl', 1).locator('.headline'))).x - (await bounds(row(page, 'links-rtl', 1))).x);
    expect(mark.mirrored).toBe(true);
    expect(mark.transform).toBe(MIRRORED);
    expect(await trailing(page, 'links-rtl', 0)).toBeNull();
  });

  test('LST-34: a disabled link item is an anchor without href — the link role, disabled — that the arrow keys still reach, where Enter does nothing, that emits no click and opens nothing, drawn as a disabled interactive item with its mark', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [links, twins, fixture('new-disabled', {}, [{ headline: 'Open', href: '/open/' }, { headline: 'Mirror', supportingText: 'Elsewhere', disabled: true, ...NEW }])],
    });
    const archive = item(page, 'links', 3);
    await expectDisabledLink(page, archive);
    await expect(list(page, 'links').getByRole('link', { name: 'Archive', disabled: true })).toHaveCount(1);
    await expect.poll(() => drawn(page, 'links', 3)).toEqual(await expected(page, 'unselected', 'disabled'));
    expect(await drawn(page, 'links', 3)).toEqual(await drawn(page, 'links-twin', 3));
    // Reached by the arrow keys, as every disabled item is (LST-2); Enter and Space do nothing there.
    await page.evaluate(() => history.replaceState(null, '', '#'));
    await listen(page);
    await tabTo(page, row(page, 'links', 0));
    await page.keyboard.press('End');
    await expect(row(page, 'links', 3)).toBeFocused();
    await page.keyboard.press('Enter');
    expect((await events(page)).clicks).toEqual([]);
    expect(await page.evaluate(() => location.hash)).toBe('');
    await expect(row(page, 'links', 3)).not.toHaveAttribute('data-pressed');
    // A pointer press does not focus it.
    await row(page, 'links', 0).focus();
    await row(page, 'links', 3).click({ force: true });
    await expect(row(page, 'links', 3)).not.toBeFocused();
    expect((await events(page)).clicks).toEqual([]);
    // The mark of a disabled link that opens a new context is drawn with it, and its description stands.
    const mark = (await trailing(page, 'new-disabled', 1))!;
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.color).toBe(await resolveColor(page, T('unselected-disabled-trailing-icon-color')));
    expect(await anchorOf(item(page, 'new-disabled', 1))).toMatchObject({ href: null, target: null, role: 'link', disabled: 'true', tabindex: '-1', description: 'Elsewhere, opens in a new tab' });
  });

  test('LST-35, LST-12: a selectable list ignores every item’s href, target and targetLabel — each is an option — and reports an option that has one; an unknown target is same, reported; white space is no destination; a javascript: address and one that cannot be read are refused and reported, and the item is then what its interactive makes it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('options', { selection: 'single', label: 'Theme', value: 'light' }, [{ headline: 'Light', value: 'light', ...NEW }, { headline: 'Dark', value: 'dark' }]),
        fixture('plain', {}, [{ headline: 'Somewhere', href: '/somewhere/' }, { headline: 'Do it', interactive: true, href: 'javascript:alert(1)' }]),
      ],
    });
    await expect(item(page, 'options', 0)).toHaveAttribute('role', 'option');
    await expect(item(page, 'options', 0)).toHaveAttribute('aria-selected', 'true');
    await expect(item(page, 'options', 0)).not.toHaveAttribute('aria-description');
    expect(await anchorOf(item(page, 'options', 0))).toMatchObject({ tag: 'div', href: null, target: null, rel: null, role: null, description: null });
    await expect(list(page, 'options').getByRole('link')).toHaveCount(0);
    // No mark: the option's trailing place holds only its check.
    expect(await trailing(page, 'options', 0)).toBeNull();
    await expect.poll(() => seen.filter((w) => w.includes('(LST-35)') && w.includes('an option of a selectable list cannot be a link')).length).toBe(1);
    // It is chosen as an option is.
    await listen(page);
    await row(page, 'options', 1).click();
    expect((await events(page)).changes).toEqual([{ value: 'dark' }]);

    await expectRefusals(page, item(page, 'plain', 0), seen, 'LST-35', { tag: 'div' });
    // Refused, the item is what its interactive makes it: static here …
    await item(page, 'plain', 0).evaluate((el) => Object.assign(el, { href: 'javascript:alert(1)' }));
    await expect.poll(async () => await anchorOf(item(page, 'plain', 0))).toMatchObject({ tag: 'div', href: null, role: null, tabindex: null });
    // … and a button there, which Space activates as it does no link.
    expect(await anchorOf(item(page, 'plain', 1))).toMatchObject({ tag: 'div', href: null, role: 'button' });
    await item(page, 'plain', 1).evaluate((el) => (el as HTMLElement).focus());
    await expect(row(page, 'plain', 1)).toBeFocused();
    await page.keyboard.press('Space');
    expect((await events(page)).clicks).toEqual(['options:Dark', 'plain:Do it']);
    expect(seen.filter((w) => w.includes('(LST-35)') && w.includes('<tanrei-list-item>: href names a script to run')).length).toBeGreaterThanOrEqual(1);
  });
});

// ── A list whose items can be put in another order: the buttons form ─────────────
// The test is the product: it gives the three words, answers `move` by reordering its own items, and removes one.
// The drag form (LST-44 … LST-50) is not built on the web yet: its ids are named below
// as tests still to be written, and what `reorder="drag"` draws in the meantime is tested with LST-36.
const WORDS = { moveUpLabel: 'Move up', moveDownLabel: 'Move down', movedText: '{headline}: {position} of {count}' };
const REORDER = { reorder: 'buttons', ...WORDS };
const REMOVE = (name: string) => `<tanrei-button slot="trailing" variant="text" label="Remove ${name}"><span slot="icon">close</span></tanrei-button>`;
const reorderable = (id: string, headlines: string[], props: Fixture['props'] = REORDER, each: ItemProps = {}, content?: (h: string) => string): Fixture => ({
  id,
  props,
  items: headlines.map((headline) => ({ kind: 'list-item', props: { headline, ...each }, ...(content ? { content: content(headline) } : {}) })),
});
const FOUR = ['Inbox', 'Starred', 'Sent', 'Archive'];
const moveButton = (page: P, id: string, n: number, which: 'up' | 'down') => item(page, id, n).locator(`.move.${which}`);
const order = (page: P, id: string) => list(page, id).evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => (each as any).headline as string));
const announced = (page: P, id: string) => list(page, id).evaluate((el) => el.shadowRoot!.querySelector('.announcer')?.textContent ?? null);
const moves = (page: P) => page.evaluate(() => (window as any).moves as { from: number; to: number }[]);
/** Where keyboard focus stands: the item's headline and which of its controls. */
const focusedControl = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active || active === document.body) return null;
    let node: Node | null = active;
    let place = '';
    while (node && !(node instanceof Element && node.localName === 'tanrei-list-item')) {
      if (node instanceof Element && node.localName === 'tanrei-button') place = node.slot === 'trailing' ? 'trailing' : node.classList.contains('up') ? 'up' : node.classList.contains('down') ? 'down' : place;
      node = node.parentNode ?? (node as ShadowRoot).host ?? null;
    }
    return node ? `${(node as any).headline}:${place}` : 'outside';
  });
/**
 * The product's answer to `move`. `handler`, `microtask`, `frame` and a number (milliseconds) say when it reorders;
 * `how` says in which way: it moves the element it has, gives new elements for every item, or keeps its elements and
 * gives each the content of its new place (what a framework that keys by index does). `ignore` changes nothing.
 */
const product = (page: P, id: string, when: 'handler' | 'microtask' | 'frame' | 'ignore' | number = 'handler', how: 'move' | 'replace' | 'props' = 'move') =>
  list(page, id).evaluate(
    (el, [when, how]) => {
      const log = ((window as any).moves ??= [] as unknown[]);
      el.addEventListener('move', (event) => {
        const { from, to } = (event as CustomEvent).detail;
        log.push({ from, to });
        const apply = () => {
          const items = [...el.querySelectorAll('tanrei-list-item')] as any[];
          if (how === 'move') el.insertBefore(items[from], items[to > from ? to + 1 : to] ?? null);
          else {
            const data = items.map((each) => ({ headline: each.headline, trailing: each.querySelector('[slot="trailing"]')?.outerHTML ?? '' }));
            data.splice(to, 0, data.splice(from, 1)[0]);
            if (how === 'props') items.forEach((each, n) => (each.headline = data[n].headline));
            else
              el.replaceChildren(
                ...data.map((each) => {
                  const next = document.createElement('tanrei-list-item') as any;
                  next.headline = each.headline;
                  next.innerHTML = each.trailing;
                  return next;
                }),
              );
          }
        };
        if (when === 'handler') apply();
        else if (when === 'microtask') queueMicrotask(apply);
        else if (when === 'frame') requestAnimationFrame(apply);
        else if (typeof when === 'number') setTimeout(apply, when);
      });
    },
    [when, how] as const,
  );
/** The Chromium accessibility nodes of a role, over the DevTools protocol: what the browser computed. */
async function axNodes(page: P, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && (role === '*' || node.role?.value === role))
    .map((node) => ({
      text: nodes.filter((child) => node.childIds?.includes(child.nodeId)).flatMap((child) => [child, ...nodes.filter((inner) => child.childIds?.includes(inner.nodeId))]).map((child) => (child.role?.value === 'StaticText' ? ((child.name?.value ?? '') as string) : '')).join(''),
      name: (node.name?.value ?? '') as string,
      description: (node.description?.value ?? '') as string,
      disabled: node.properties?.find((p) => p.name === 'disabled')?.value?.value as boolean | undefined,
      focusable: node.properties?.find((p) => p.name === 'focusable')?.value?.value as boolean | undefined,
      live: node.properties?.find((p) => p.name === 'live')?.value?.value as string | undefined,
    }));
}
/** Takes focus from the control that has it, through shadow roots (a host's own blur() does not reach its native button in every engine). */
const blurFocused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    (active as HTMLElement | null)?.blur();
  });
const reorderWindow = (page: P) => resolveToken(page, T('motion-reorder-duration'), 'duration');
/** Each item's top as it is drawn now, by headline. */
const tops = (page: P, id: string) => list(page, id).evaluate((el) => Object.fromEntries([...el.querySelectorAll('tanrei-list-item')].map((each) => [(each as any).headline as string, each.getBoundingClientRect().top])));

test.describe('reordering: the buttons form', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });

  test('LST-7: a reorder the list does not define is drawn as none and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [reorderable('odd', FOUR, { ...REORDER, reorder: 'sideways' })] });
    await expect(item(page, 'odd', 0).locator('.row')).toBeVisible();
    expect(await item(page, 'odd', 0).locator('.move').count()).toBe(0);
    expect(await announced(page, 'odd'), 'no live region').toBeNull();
    expect(seen.filter((text) => text.includes('LST-7') && text.includes('sideways'))).toHaveLength(1);
  });

  test('LST-36: a reorderable list draws two move buttons in every item, makes every item static and reports one that asks to be a button or a link; a selectable list ignores reorder and reports it; nothing reorders by itself', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        reorderable('plain', FOUR),
        { id: 'asks', props: REORDER, items: [{ kind: 'list-item', props: { headline: 'A button', interactive: true } }, { kind: 'list-item', props: { headline: 'A link', href: '/somewhere/' } }] },
        reorderable('chosen', FOUR, { ...REORDER, selection: 'single', label: 'Folders' }, { value: 'x' }),
        // The spec's third value, until its handle is built: the buttons, which are complete by themselves.
        reorderable('dragged', FOUR, { ...REORDER, reorder: 'drag' }),
      ],
    });
    for (const n of [0, 1, 2, 3]) expect(await item(page, 'plain', n).locator('.move').count(), `item ${n}`).toBe(2);
    // Static: no element with the button or the link role for the row, no tab stop of the row's.
    for (const n of [0, 1]) {
      const r = row(page, 'asks', n);
      expect(await r.evaluate((el) => [el.localName, el.getAttribute('role'), el.getAttribute('tabindex'), el.getAttribute('href')])).toEqual(['div', null, null, null]);
      expect(await item(page, 'asks', n).locator('.move').count()).toBe(2);
      await expect(item(page, 'asks', n)).toHaveAttribute('role', 'listitem');
    }
    expect(seen.filter((text) => text.includes('LST-36') && text.includes('interactive'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('LST-36') && text.includes('href'))).toHaveLength(1);
    // A selectable list: options, no move button, no live region, one report.
    await expect(list(page, 'chosen')).toHaveAttribute('role', 'listbox');
    expect(await list(page, 'chosen').locator('tanrei-list-item').first().locator('.move').count()).toBe(0);
    expect(await announced(page, 'chosen')).toBeNull();
    expect(seen.filter((text) => text.includes('LST-36') && text.includes('selection'))).toHaveLength(1);
    // reorder="drag": the two buttons and no handle, said once (LST-44 is not built on the web).
    expect(await item(page, 'dragged', 1).locator('.move').count()).toBe(2);
    expect(await item(page, 'dragged', 1).locator('.handle, [part="handle"]').count()).toBe(0);
    expect(seen.filter((text) => text.includes('LST-44') && text.includes('drag'))).toHaveLength(1);
    // The list never reorders: a product that changes nothing keeps its order.
    await product(page, 'plain', 'ignore');
    await moveButton(page, 'plain', 1, 'up').click();
    expect(await moves(page)).toEqual([{ from: 1, to: 0 }]);
    await page.waitForTimeout((await reorderWindow(page)) + 100);
    expect(await order(page, 'plain')).toEqual(FOUR);
  });

  test('LST-16, LST-37: after the trailing text and icon come the button that moves up, the one that moves down, then the trailing control; each an icon-only text Button of the medium size drawn from Button’s tokens, a touch target’s length each along the row, centred on the row; Tab goes through them in that order and no arrow key moves focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('row', FOUR, REORDER, { trailingText: '12', trailingIcon: 'star' }, REMOVE)] });
    // Wide enough for the text to keep reorder.text-min-width beside all of them (LST-51).
    await page.addStyleTag({ content: '.stage > tanrei-list { inline-size: 560px !important; }' });
    await expect(row(page, 'row', 1)).not.toHaveClass(/stacked/);
    const r = await bounds(row(page, 'row', 1));
    const parts = [row(page, 'row', 1).locator('.trailing-text'), row(page, 'row', 1).locator('.trailing-icon'), moveButton(page, 'row', 1, 'up'), moveButton(page, 'row', 1, 'down'), item(page, 'row', 1).locator('[slot="trailing"]')];
    const boxes = [];
    for (const part of parts) boxes.push(await bounds(part));
    for (let n = 1; n < boxes.length; n++) expect(boxes[n].x, `part ${n} stands after part ${n - 1}`).toBeGreaterThanOrEqual(boxes[n - 1].x + boxes[n - 1].width - 0.5);
    const gap = await resolveToken(page, T('container-gap'));
    const end = await resolveToken(page, T('container-padding-inline-end'));
    expect(boxes[2].x - (boxes[1].x + boxes[1].width)).toBeCloseTo(gap, 0);
    expect(boxes[4].x - (boxes[3].x + boxes[3].width)).toBeCloseTo(gap, 0);
    expect(r.x + r.width - (boxes[4].x + boxes[4].width)).toBeCloseTo(end, 0);
    // A Button of the text variant at the medium size and the default width, from Button's own tokens.
    const height = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    for (const which of ['up', 'down'] as const) {
      const button = moveButton(page, 'row', 1, which);
      expect(await button.evaluate((el) => [(el as any).variant, (el as any).size, (el as any).width, el.localName])).toEqual(['text', 'medium', 'default', 'tanrei-button']);
      const box = await bounds(button);
      expect([box.width, box.height]).toEqual([height, height]);
      expect(box.y + box.height / 2, 'centred on the row').toBeCloseTo(r.y + r.height / 2, 0);
      expect(await button.locator('.ink').textContent()).toBe(which === 'up' ? 'arrow_upward' : 'arrow_downward');
    }
    // move-buttons.gap apart, or as much further as two buttons shorter than the touch target lack.
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const between = await resolveToken(page, T('move-buttons-gap'));
    expect(boxes[3].x - (boxes[2].x + boxes[2].width)).toBeCloseTo(Math.max(between, Math.max(0, touch - height)), 1);
    await override(page, { [T('move-buttons-gap')]: '20px' });
    await expect.poll(async () => (await bounds(moveButton(page, 'row', 1, 'down'))).x - ((await bounds(moveButton(page, 'row', 1, 'up'))).x + height)).toBeCloseTo(20, 1);
    // Tab: the first item's enabled move button (its move-up is disabled and passed), its trailing control, then the next item's three.
    await tabTo(page, moveButton(page, 'row', 0, 'down').locator('button'));
    const stops = [await focusedControl(page)];
    for (let n = 0; n < 4; n++) {
      await tab(page);
      stops.push(await focusedControl(page));
    }
    expect(stops).toEqual(['Inbox:down', 'Inbox:trailing', 'Starred:up', 'Starred:down', 'Starred:trailing']);
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'a']) {
      await page.keyboard.press(key);
      expect(await focusedControl(page), key).toBe('Starred:trailing');
    }
  });

  test('LST-37: a move button is a Button in its press, its target, its states and its focus ring (BTN-5, BTN-8, BTN-9, BTN-10), and its glyph is the icon set’s', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('button', FOUR)] });
    const host = moveButton(page, 'button', 1, 'up');
    const native = host.locator('button');
    // BTN-5: the hit area reaches the minimum target though the button is drawn smaller.
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const target = await native.evaluate((el) => {
      const before = getComputedStyle(el, '::before');
      return [Number.parseFloat(before.width), Number.parseFloat(before.height)];
    });
    expect(Math.min(...target)).toBeGreaterThanOrEqual(Math.min(touch, await resolveToken(page, '--tanrei-sys-target-pointer')));
    // BTN-8, BTN-9: pressed at once, by the Button's own press controller, and kept for press-hold.
    await native.dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse', isPrimary: true, clientX: 0, clientY: 0, bubbles: true, composed: true });
    expect(await native.getAttribute('data-pressed'), 'pressed without delay').not.toBeNull();
    await native.dispatchEvent('pointerup', { button: 0, pointerType: 'mouse', isPrimary: true, bubbles: true, composed: true });
    await expect(native).not.toHaveAttribute('data-pressed', /.*/);
    // Its colors are Button's text variant's.
    expect(await css(native, 'color')).toBe(await resolveColor(page, '--tanrei-comp-button-text-label-color'));
    // BTN-10: keyboard focus draws the Button's ring on the native button, and none on the row.
    await tabTo(page, native);
    expect(await css(native, 'outline-style')).not.toBe('none');
    expect(await css(row(page, 'button', 1), 'outline-style')).toBe('none');
    // The glyph is drawn only while the icon set can draw it, and is never marked for mirroring.
    await expect(host.locator('.move-glyph')).toHaveAttribute('data-drawn', '');
    await expect(host.locator('.move-glyph')).toHaveAttribute('data-mirror', 'never');
  });

  test('LST-37: right-to-left — the row is mirrored, the button that moves up still comes first in reading order (at the right of the other), and neither glyph is mirrored', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const up = await bounds(moveButton(page, 'reorder-buttons-rtl', 1, 'up'));
    const down = await bounds(moveButton(page, 'reorder-buttons-rtl', 1, 'down'));
    const text = await bounds(row(page, 'reorder-buttons-rtl', 1).locator('.text'));
    expect(up.x, 'up is at the right of down').toBeGreaterThan(down.x);
    expect(text.x, 'the text column is at the right of both').toBeGreaterThan(up.x);
    for (const which of ['up', 'down'] as const) {
      const glyph = moveButton(page, 'reorder-buttons-rtl', 1, which).locator('.move-glyph');
      expect(await glyph.evaluate((el) => el.hasAttribute('data-tanrei-mirrored'))).toBe(false);
      expect(await css(glyph, 'transform')).toBe('none');
    }
    await tabTo(page, moveButton(page, 'reorder-buttons-rtl', 1, 'up').locator('button'));
    await tab(page);
    expect(await focusedControl(page)).toBe('الخط الكوفي:down');
    // A move up is still a move up.
    await product(page, 'reorder-buttons-rtl');
    await moveButton(page, 'reorder-buttons-rtl', 1, 'up').click();
    expect(await moves(page)).toEqual([{ from: 1, to: 0 }]);
    await expect.poll(() => announced(page, 'reorder-buttons-rtl')).toBe('الخط الكوفي: 1 من 3');
  });

  test('LST-38: each move button is named by the product’s word and described by its item’s headline — the prop, else the product’s words; with neither the buttons are drawn, work, have no name, nothing is announced, and the three keys are reported once', async ({ page, browserName }) => {
    // The product's words, given once, and no prop.
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('said', FOUR, { reorder: 'buttons' }), reorderable('own', FOUR, { reorder: 'buttons', moveUpLabel: 'Earlier', moveDownLabel: 'Later', movedText: '{headline} → {position}' })] });
    await setWords(page, WORDS);
    await expect(moveButton(page, 'said', 1, 'up').locator('button')).toHaveAttribute('aria-label', 'Move up');
    await expect(moveButton(page, 'said', 1, 'down').locator('button')).toHaveAttribute('aria-label', 'Move down');
    await expect(moveButton(page, 'said', 1, 'up').locator('button')).toHaveAttribute('aria-description', 'Starred');
    // The prop wins.
    await expect(moveButton(page, 'own', 2, 'up').locator('button')).toHaveAttribute('aria-label', 'Earlier');
    await expect(moveButton(page, 'own', 2, 'down').locator('button')).toHaveAttribute('aria-label', 'Later');
    await product(page, 'said');
    await product(page, 'own');
    await moveButton(page, 'said', 2, 'up').click();
    await expect.poll(() => announced(page, 'said')).toBe('Sent: 2 of 4');
    await moveButton(page, 'own', 2, 'up').click();
    await expect.poll(() => announced(page, 'own')).toBe('Sent → 2');
    expect(await missingWords(page)).toEqual([]);
    if (browserName === 'chromium') {
      const buttons = (await axNodes(page, 'button')).filter((node) => node.description === 'Archive');
      expect(buttons.map((node) => node.name).sort()).toEqual(['Earlier', 'Later', 'Move down', 'Move up']);
    }
    // Nobody gave them (a new document: the product's words are the page's).
    await page.goto('about:blank');
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('bare', FOUR, { reorder: 'buttons' })] });
    await product(page, 'bare');
    const bare = moveButton(page, 'bare', 1, 'up');
    await expect(bare.locator('button')).toBeVisible();
    expect(await bare.locator('button').getAttribute('aria-label')).toBeNull();
    expect(await bare.getAttribute('aria-hidden'), 'exposed, without a name').toBeNull();
    if (browserName === 'chromium') expect((await axNodes(page, 'button')).filter((node) => node.description === 'Starred').map((node) => node.name)).toEqual(['', '']);
    await bare.click();
    expect(await moves(page)).toEqual([{ from: 1, to: 0 }]);
    await expect.poll(() => order(page, 'bare')).toEqual(['Starred', 'Inbox', 'Sent', 'Archive']);
    await page.waitForTimeout(100);
    expect(await announced(page, 'bare'), 'nothing is announced').toBe('');
    expect(await missingWords(page)).toEqual(['moveDownLabel', 'moveUpLabel', 'movedText']);
    for (const [attribute, key] of [['move-up-label', 'moveUpLabel'], ['move-down-label', 'moveDownLabel'], ['moved-text', 'movedText']]) {
      expect(seen.filter((text) => text.includes(`${attribute} is empty`) && text.includes(key) && text.includes('LST-38')), key).toHaveLength(1);
    }
  });

  test('LST-39: a move button emits move exactly once — from i, to i − 1 or i + 1 — by pointer, Enter and Space; the list moves nothing, the event bubbles and cannot be cancelled, and the item is no action of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await list(page, 'reorder-buttons').evaluate((el) => {
      const log = ((window as any).seen = { moves: [] as unknown[], bubbled: 0, prevented: [] as boolean[] });
      el.addEventListener('move', (event) => {
        log.moves.push([(event as CustomEvent).detail, event.bubbles, event.cancelable]);
        event.preventDefault();
        log.prevented.push(event.defaultPrevented);
      });
      document.addEventListener('move', () => log.bubbled++);
    });
    const seen = () => page.evaluate(() => (window as any).seen as { moves: unknown[]; bubbled: number; prevented: boolean[] });
    await moveButton(page, 'reorder-buttons', 1, 'up').click();
    expect((await seen()).moves).toEqual([[{ from: 1, to: 0 }, true, false]]);
    await moveButton(page, 'reorder-buttons', 1, 'down').click();
    expect((await seen()).moves.at(-1)).toEqual([{ from: 1, to: 2 }, true, false]);
    await tabTo(page, moveButton(page, 'reorder-buttons', 1, 'up').locator('button'));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    const log = await seen();
    expect(log.moves.map((each) => (each as [unknown])[0])).toEqual([{ from: 1, to: 0 }, { from: 1, to: 2 }, { from: 1, to: 0 }, { from: 1, to: 0 }]);
    expect(log.bubbled).toBe(4);
    expect(log.prevented.every((each) => each === false), 'not cancelable').toBe(true);
    // Nothing moved, and the row is no button and no link: it has no click of its own to emit.
    expect(await order(page, 'reorder-buttons')).toEqual(['Inter', 'Noto Sans JP', 'Helvetica Neue']);
    expect(await row(page, 'reorder-buttons', 1).evaluate((el) => [el.getAttribute('role'), el.getAttribute('tabindex')])).toEqual([null, null]);
    // A disabled move button emits nothing.
    await moveButton(page, 'reorder-buttons', 0, 'up').evaluate((el) => (el as HTMLElement).click());
    expect((await seen()).moves).toHaveLength(4);
  });

  test('LST-40: the first item’s move-up and the last item’s move-down are disabled as a Button is — not focusable, exposed as disabled — and still drawn where the others are; both of an item that is alone', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true });
    const state = (id: string, n: number, which: 'up' | 'down') => moveButton(page, id, n, which).locator('button').evaluate((el) => (el as HTMLButtonElement).disabled);
    expect([await state('reorder-buttons', 0, 'up'), await state('reorder-buttons', 0, 'down')]).toEqual([true, false]);
    expect([await state('reorder-buttons', 1, 'up'), await state('reorder-buttons', 1, 'down')]).toEqual([false, false]);
    expect([await state('reorder-buttons', 2, 'up'), await state('reorder-buttons', 2, 'down')]).toEqual([false, true]);
    expect([await state('reorder-single-item', 0, 'up'), await state('reorder-single-item', 0, 'down')]).toEqual([true, true]);
    // The same parts in the same places in every row.
    const xs = [];
    for (const n of [0, 1, 2]) xs.push([(await bounds(moveButton(page, 'reorder-buttons', n, 'up'))).x, (await bounds(moveButton(page, 'reorder-buttons', n, 'down'))).x]);
    expect(xs[1]).toEqual(xs[0]);
    expect(xs[2]).toEqual(xs[0]);
    expect((await bounds(moveButton(page, 'reorder-buttons', 0, 'up'))).width).toBeGreaterThan(0);
    if (browserName === 'chromium') {
      const first = (await axNodes(page, 'button')).filter((node) => node.description === 'Inter' && node.name === 'Move up');
      expect(first.every((node) => node.disabled === true)).toBe(true);
      expect(first.length).toBeGreaterThan(0);
    }
    // The order the product gives decides: the item that becomes first loses its move-up.
    await product(page, 'reorder-buttons');
    await moveButton(page, 'reorder-buttons', 1, 'up').click();
    await expect.poll(() => state('reorder-buttons', 0, 'up')).toBe(true);
    await expect.poll(() => state('reorder-buttons', 1, 'up')).toBe(false);
  });

  for (const how of ['move', 'replace', 'props'] as const) {
    test(`LST-41: Enter three times on the fourth item’s move-up, with a product that reorders in its handler (${how === 'move' ? 'it moves the element' : how === 'replace' ? 'it gives new elements' : 'it gives each element the content of its new place'}), leaves the item first, focus on its move-down and three announcements`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('stack', FOUR)] });
      await product(page, 'stack', 'handler', how);
      await list(page, 'stack').evaluate((el) => {
        const said = ((window as any).said = [] as string[]);
        new MutationObserver(() => {
          const text = el.shadowRoot!.querySelector('.announcer')!.textContent!;
          if (text && said.at(-1) !== text) said.push(text);
        }).observe(el.shadowRoot!.querySelector('.announcer')!, { childList: true, subtree: true, characterData: true });
      });
      await tabTo(page, moveButton(page, 'stack', 3, 'up').locator('button'));
      for (const [place, at] of [[3, 'Archive:up'], [2, 'Archive:up'], [1, 'Archive:down']] as const) {
        await page.keyboard.press('Enter');
        await expect.poll(() => focusedControl(page), `after the move to place ${place}`).toBe(at);
        await expect.poll(() => announced(page, 'stack')).toBe(`Archive: ${place} of 4`);
      }
      expect(await order(page, 'stack')).toEqual(['Archive', 'Inbox', 'Starred', 'Sent']);
      expect(await page.evaluate(() => (window as any).said)).toEqual(['Archive: 3 of 4', 'Archive: 2 of 4', 'Archive: 1 of 4']);
      expect(await moves(page)).toEqual([{ from: 3, to: 2 }, { from: 2, to: 1 }, { from: 1, to: 0 }]);
      // LST-12: every item's position anew.
      expect(await list(page, 'stack').evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => `${each.getAttribute('aria-posinset')}/${each.getAttribute('aria-setsize')}`))).toEqual(['1/4', '2/4', '3/4', '4/4']);
      // The same key moves it back down: focus is on move-down, the first control that can take it there.
      await page.keyboard.press('Enter');
      await expect.poll(() => focusedControl(page)).toBe('Archive:down');
      expect(await order(page, 'stack')).toEqual(['Inbox', 'Archive', 'Starred', 'Sent']);
    });
  }

  test('LST-41: focus that was elsewhere is not moved; a product that takes focus in its handler keeps it; a product that ignores the event changes nothing — the order, the focus, and nothing is announced', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('else', FOUR), reorderable('ignored', FOUR), reorderable('taken', FOUR)] });
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.id = 'elsewhere';
      document.body.prepend(field);
    });
    // Focus elsewhere: the move is asked for from script (assistive technology, voice), and focus stays.
    await product(page, 'else');
    await page.locator('#elsewhere').focus();
    await moveButton(page, 'else', 2, 'up').evaluate((el) => (el as HTMLElement).click());
    await expect.poll(() => announced(page, 'else')).toBe('Sent: 2 of 4');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('elsewhere');
    // The product takes focus itself.
    await product(page, 'taken');
    await list(page, 'taken').evaluate((el) => el.addEventListener('move', () => document.getElementById('elsewhere')!.focus()));
    await tabTo(page, moveButton(page, 'taken', 2, 'up').locator('button'));
    await page.keyboard.press('Enter');
    await expect.poll(() => announced(page, 'taken')).toBe('Sent: 2 of 4');
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('elsewhere');
    // Ignored.
    await product(page, 'ignored', 'ignore');
    await tabTo(page, moveButton(page, 'ignored', 2, 'up').locator('button'));
    await page.keyboard.press('Enter');
    await page.waitForTimeout((await reorderWindow(page)) + 150);
    expect(await order(page, 'ignored')).toEqual(FOUR);
    expect(await focusedControl(page)).toBe('Sent:up');
    expect(await announced(page, 'ignored')).toBe('');
    void browserName;
  });

  for (const [when, name] of [['microtask', 'a microtask later'], ['frame', 'a frame later']] as const) {
    for (const how of ['move', 'replace'] as const) {
      test(`LST-41: a product that re-renders ${name} (${how === 'move' ? 'moving its elements' : 'with new elements'}) is answered as one that reorders in its handler: the order, focus on the same button of the moved item, one announcement`, async ({ page }) => {
        await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('async', FOUR)] });
        await product(page, 'async', when, how);
        await tabTo(page, moveButton(page, 'async', 2, 'up').locator('button'));
        await page.keyboard.press('Enter');
        await expect.poll(() => order(page, 'async')).toEqual(['Inbox', 'Sent', 'Starred', 'Archive']);
        await expect.poll(() => focusedControl(page)).toBe('Sent:up');
        await expect.poll(() => announced(page, 'async')).toBe('Sent: 2 of 4');
        await page.keyboard.press('Enter');
        await expect.poll(() => focusedControl(page)).toBe('Sent:down');
        await expect.poll(() => announced(page, 'async')).toBe('Sent: 1 of 4');
      });
    }
  }

  for (const how of ['move', 'replace'] as const) {
    test(`LST-41: a product that re-renders later than comp.list.motion.reorder-duration (${how === 'move' ? 'moving its elements' : 'with new elements'}) has refused the move as far as the list knows — its order is drawn and the positions set anew, nothing is announced, and keyboard focus is kept in the list`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('late', FOUR)] });
      const wait = await reorderWindow(page);
      expect(wait).toBeGreaterThan(0);
      await product(page, 'late', wait + 250, how);
      await tabTo(page, moveButton(page, 'late', 2, 'up').locator('button'));
      // The list's window and the product's delay run on the page's clock, held still and moved on by the test.
      await holdClock(page);
      await page.keyboard.press('Enter');
      // Within the window — one millisecond short of its end — nothing has happened.
      await page.clock.runFor(wait - 1);
      expect(await order(page, 'late')).toEqual(FOUR);
      expect(await focusedControl(page)).toBe('Sent:up');
      // Nor when it has ended, until the product re-renders, 250 ms after it.
      await page.clock.runFor(250);
      expect(await order(page, 'late')).toEqual(FOUR);
      await page.clock.runFor(1);
      await expect.poll(() => order(page, 'late'), { timeout: 5000 }).toEqual(['Inbox', 'Sent', 'Starred', 'Archive']);
      await page.clock.runFor(1000);
      expect(await announced(page, 'late'), 'a late order is not announced').toBe('');
      expect(await list(page, 'late').evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => each.getAttribute('aria-posinset')))).toEqual(['1', '2', '3', '4']);
      // What a late re-render looks like to a keyboard: the element that held focus was taken out of its place, which
      // drops focus in every engine. The list puts it back on the same control — of the same element where the product
      // moved it, and of the item now standing in the old place where the product gave new elements (LST-52).
      await releaseClock(page);
      await expect.poll(() => focusedControl(page)).toBe(how === 'move' ? 'Sent:up' : 'Starred:up');
    });
  }

  test('LST-42: one polite live region of the list’s own, empty at rest and drawn nowhere; a move fills movedText’s three places wherever and however often they are written, a later move replaces the text, the headline is isolated, and other braces stay and are reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        reorderable('three', ['Inbox', 'Starred', 'Sent']),
        reorderable('twice', ['Inbox', 'Starred', 'Sent'], { ...REORDER, movedText: '{count}: {headline} {position}/{count} — {headline}' }),
        reorderable('odd', ['Inbox', 'Starred', 'Sent'], { ...REORDER, movedText: '{headline} {place}' }),
        reorderable('doubled', ['Inbox', 'Starred', 'Sent'], { ...REORDER, movedText: '{{headline}} {position}' }),
        reorderable('lone', ['Inbox', 'Starred', 'Sent'], { ...REORDER, movedText: '{headline} { {position}' }),
        reorderable('none', ['Inbox', 'Starred', 'Sent'], { reorder: 'none' }),
      ],
    });
    const region = list(page, 'three').locator('.announcer');
    expect(await list(page, 'three').evaluate((el) => el.shadowRoot!.querySelectorAll('[role="status"], [role="alert"], [aria-live]').length)).toBe(1);
    await expect(region).toHaveAttribute('role', 'status');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    // The region is no child of the list: the list role is a box around the items, and the region stands beside it.
    expect(await list(page, 'three').evaluate((el) => [el.getAttribute('role'), el.shadowRoot!.querySelector('[role="list"]')!.contains(el.shadowRoot!.querySelector('.announcer')), el.shadowRoot!.querySelector('[role="list"] slot') !== null])).toEqual([null, false, true]);
    if (browserName === 'chromium') {
      // LST-12: still one list of three list items, each with its position, to assistive technology.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      const children = nodes.filter((node) => !node.ignored && node.role?.value === 'list').map((node) => nodes.filter((child) => node.childIds?.includes(child.nodeId) && !child.ignored).map((child) => child.role?.value));
      expect(children.filter((roles) => roles.length === 3), 'five lists of three list items, and nothing else in them').toEqual(Array.from({ length: 5 }, () => ['listitem', 'listitem', 'listitem']));
    }
    expect(await announced(page, 'three'), 'empty at rest').toBe('');
    const box = await bounds(region);
    expect(box.width * box.height).toBeLessThanOrEqual(1);
    expect(await announced(page, 'none'), 'no live region while the list is not reorderable').toBeNull();
    // Nothing else of the list announces: no item and no button is a live region.
    expect(await item(page, 'three', 0).evaluate((el) => el.shadowRoot!.querySelectorAll('[role="status"], [role="alert"], [aria-live]').length)).toBe(0);
    await product(page, 'three');
    await moveButton(page, 'three', 2, 'up').click();
    await expect.poll(() => announced(page, 'three')).toBe('Sent: 2 of 3');
    // The headline is a run of its own direction.
    expect(await region.evaluate((el) => [...el.querySelectorAll('bdi')].map((each) => each.textContent))).toEqual(['Sent']);
    await moveButton(page, 'three', 1, 'up').click();
    await expect.poll(() => announced(page, 'three'), 'replaced, not added to').toBe('Sent: 1 of 3');
    if (browserName === 'chromium') expect((await axNodes(page, 'status')).filter((node) => node.live === 'polite' && node.text === 'Sent: 1 of 3'), 'the region is exposed, polite, with the sentence').toHaveLength(1);
    await product(page, 'twice');
    await moveButton(page, 'twice', 0, 'down').click();
    await expect.poll(() => announced(page, 'twice')).toBe('3: Inbox 2/3 — Inbox');
    await product(page, 'odd');
    await moveButton(page, 'odd', 0, 'down').click();
    await expect.poll(() => announced(page, 'odd')).toBe('Inbox {place}');
    expect(seen.filter((text) => text.includes('LST-42') && text.includes('{place}'))).toHaveLength(1);
    // A second move says the same sentence again, and is reported no second time.
    await moveButton(page, 'odd', 1, 'down').click();
    await expect.poll(() => announced(page, 'odd')).toBe('Inbox {place}');
    expect(seen.filter((text) => text.includes('LST-42') && text.includes('{place}') && text.includes('movedText'))).toHaveLength(1);
    // A brace written twice is one brace, and nothing between doubled braces is filled.
    await product(page, 'doubled');
    await moveButton(page, 'doubled', 0, 'down').click();
    await expect.poll(() => announced(page, 'doubled')).toBe('{headline} 2');
    expect(await list(page, 'doubled').evaluate((el) => el.shadowRoot!.querySelectorAll('.announcer bdi').length), 'no headline was put in').toBe(0);
    expect(seen.filter((text) => text.includes('LST-42')), 'nothing more is reported').toHaveLength(1);
    // A brace that opens or closes nothing stays as it is written, and is reported.
    await product(page, 'lone');
    await moveButton(page, 'lone', 0, 'down').click();
    await expect.poll(() => announced(page, 'lone')).toBe('Inbox { 2');
    expect(seen.filter((text) => text.includes('LST-42') && text.includes('movedText') && text.includes('a brace that opens or closes nothing'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('LST-42'))).toHaveLength(2);
    // The numbers are written as the list's language writes them.
    await list(page, 'three').evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await moveButton(page, 'three', 0, 'down').click();
    await expect.poll(() => announced(page, 'three')).toBe('Sent: ٢ of ٣');
    // At rest again once focus has left the list.
    await tabTo(page, moveButton(page, 'three', 1, 'up').locator('button'));
    await blurFocused(page);
    await expect.poll(() => announced(page, 'three')).toBe('');
  });

  test('LST-43: after a move the two items that changed places are drawn between their places for the length of the motion — along the axis only, neither faded nor scaled — and at rest after it; the focus ring travels with the button', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, fixtures: [reorderable('motion', FOUR)] });
    // The motion at 60 s, held a third of the way through and ended by hand: at 600 ms it had to be still running four
    // questions and a wait of 200 ms after the key, and again where the focused button is measured.
    await override(page, { [T('motion-reorder-duration')]: '60s' });
    const rest = await tops(page, 'motion');
    await product(page, 'motion');
    await tabTo(page, moveButton(page, 'motion', 2, 'up').locator('button'));
    await page.keyboard.press('Enter');
    await expect.poll(() => order(page, 'motion')).toEqual(['Inbox', 'Sent', 'Starred', 'Archive']);
    const state = () =>
      list(page, 'motion').evaluate((el) =>
        Object.fromEntries(
          [...el.querySelectorAll('tanrei-list-item')].map((each) => {
            const running = each.getAnimations();
            const style = getComputedStyle(each);
            return [(each as any).headline as string, { top: each.getBoundingClientRect().top, left: each.getBoundingClientRect().left, running: running.length, opacity: style.opacity, transform: style.transform, duration: running[0]?.effect?.getTiming().duration ?? 0, easing: running[0]?.effect?.getTiming().easing ?? '' }];
          }),
        ),
      );
    await page.waitForTimeout(200);
    const motions = (to: 'third' | 'end') =>
      list(page, 'motion').evaluate((el, point) => {
        const running = [...el.querySelectorAll('tanrei-list-item')].flatMap((each) => each.getAnimations());
        for (const motion of running) {
          if (point === 'end') motion.finish();
          else {
            motion.pause();
            motion.currentTime = Number(motion.effect!.getComputedTiming().endTime) / 3;
          }
        }
        return running.length;
      }, to);
    await expect.poll(() => motions('third')).toBe(2);
    const during = await state();
    // Sent goes up from the third place to the second, Starred down from the second to the third.
    expect(during.Sent.running).toBe(1);
    expect(during.Starred.running).toBe(1);
    expect(during.Sent.top).toBeGreaterThan(rest.Starred);
    expect(during.Sent.top).toBeLessThan(rest.Sent);
    expect(during.Starred.top).toBeGreaterThan(rest.Starred);
    expect(during.Starred.top).toBeLessThan(rest.Sent);
    expect([during.Inbox.running, during.Archive.running], 'an item whose place did not change does not move').toEqual([0, 0]);
    expect(during.Sent.duration).toBe(60000);
    expect(during.Sent.easing).toBe((await token(page, T('motion-reorder-easing'))).replace(/\s+/g, ' '));
    for (const name of ['Sent', 'Starred']) {
      expect(during[name].opacity).toBe('1');
      // A translation along the axis: matrix(1, 0, 0, 1, 0, y).
      expect(during[name].transform).toMatch(/^matrix\(1, 0, 0, 1, 0, -?[\d.]+\)$/);
      expect(during[name].left).toBe(during.Inbox.left);
    }
    // The focused button, and its ring, are where the moving item is.
    const button = await bounds(moveButton(page, 'motion', 1, 'up').locator('button'));
    expect(button.y).toBeGreaterThan(during.Sent.top - 1);
    expect(button.y).toBeLessThan(during.Sent.top + 60);
    await motions('end');
    await expect.poll(async () => (await state()).Sent.running).toBe(0);
    const after = await state();
    expect(after.Sent.top).toBeCloseTo(rest.Starred, 0);
    expect(after.Starred.top).toBeCloseTo(rest.Sent, 0);
    expect(after.Sent.transform).toBe('none');
    // An item that is gone leaves at once; the ones below it take their new places with the motion.
    await item(page, 'motion', 0).evaluate((el) => el.remove());
    await page.waitForTimeout(100);
    const closing = await state();
    expect(closing.Inbox).toBeUndefined();
    expect(closing.Sent.running).toBe(1);
    // An item that is new appears at once.
    await list(page, 'motion').evaluate((el) => {
      const added = document.createElement('tanrei-list-item') as any;
      added.headline = 'Drafts';
      el.append(added);
    });
    await page.waitForTimeout(100);
    expect((await state()).Drafts.running).toBe(0);
  });

  test('LST-43: where motion is reduced the first frame after the change is the final one', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [reorderable('still', FOUR)] });
    const rest = await tops(page, 'still');
    // The product reorders, and the test reads the next frame that is painted.
    const frame = await list(page, 'still').evaluate(
      (el) =>
        new Promise<Record<string, { top: number; running: number }>>((resolve) => {
          el.addEventListener('move', (event) => {
            const { from, to } = (event as CustomEvent).detail;
            const items = [...el.querySelectorAll('tanrei-list-item')];
            el.insertBefore(items[from], items[to]);
            requestAnimationFrame(() => resolve(Object.fromEntries([...el.querySelectorAll('tanrei-list-item')].map((each) => [(each as any).headline, { top: each.getBoundingClientRect().top, running: each.getAnimations().length }]))));
          });
          (el.querySelectorAll('tanrei-list-item')[2].shadowRoot!.querySelector('.move.up') as HTMLElement).click();
        }),
    );
    expect(frame.Sent).toEqual({ top: rest.Starred, running: 0 });
    expect(frame.Starred).toEqual({ top: rest.Sent, running: 0 });
    await expect.poll(() => announced(page, 'still'), 'the move is still announced').toBe('Sent: 2 of 4');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('LST-51: 320 wide at 200% text — the move buttons and the trailing control stand on a line of their own below the text in every row, at the row’s end and in order; no text is cut or under a control, no control is smaller than its target, nothing scrolls sideways; and a row with room keeps them beside the text', async ({ page }) => {
    const long = 'A section whose name is long enough to need more than one line beside its controls';
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'narrow', props: REORDER, items: [{ kind: 'list-item', props: { headline: long, supportingText: 'Supporting text that also wraps: nothing is cut, and the buttons keep their size.', leadingMedia: 'avatar' }, content: REMOVE('long') }, { kind: 'list-item', props: { headline: 'Short', supportingText: 'One line' }, content: REMOVE('short') }] },
        reorderable('roomy', FOUR),
      ],
    });
    // 360 wide, text at 100%: the roomy rows keep their controls beside the text.
    await expect(row(page, 'roomy', 0)).not.toHaveClass(/stacked/);
    const beside = [await bounds(row(page, 'roomy', 1).locator('.text')), await bounds(moveButton(page, 'roomy', 1, 'up'))];
    expect(beside[1].y).toBeLessThan(beside[0].y + beside[0].height);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addStyleTag({ content: '.stage { padding: 0 !important; } .stage > tanrei-list { inline-size: 320px !important; }' });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await override(page, { '--tanrei-dial-type-base': '32px' });
    for (const n of [0, 1]) await expect(row(page, 'narrow', n), `row ${n}: every item at once`).toHaveClass(/stacked/);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const pad = await resolveToken(page, T('container-padding-block'));
    const end = await resolveToken(page, T('container-padding-inline-end'));
    const ups = [];
    for (const n of [0, 1]) {
      const r = await bounds(row(page, 'narrow', n));
      const text = await bounds(row(page, 'narrow', n).locator('.text'));
      const up = await bounds(moveButton(page, 'narrow', n, 'up'));
      const down = await bounds(moveButton(page, 'narrow', n, 'down'));
      const remove = await bounds(item(page, 'narrow', n).locator('[slot="trailing"]'));
      ups.push(up.x);
      // Below the text, padding-block from it, at the row's end, in the same order.
      expect(up.y, `row ${n}: below the text`).toBeGreaterThanOrEqual(text.y + text.height + pad - 0.5);
      expect(down.x).toBeGreaterThan(up.x);
      // The trailing control is last in reading order: after move-down on its line, or — the line too short for the
      // three — on the next one. Each line ends at the row's end padding, and nothing reaches into it.
      expect(remove.y > down.y ? remove.y >= down.y + down.height + pad - 0.5 : remove.x > down.x, `row ${n}: the trailing control comes last`).toBe(true);
      expect(r.x + r.width - (remove.x + remove.width)).toBeCloseTo(end, 0);
      expect(r.x + r.width - (down.x + down.width)).toBeGreaterThanOrEqual(end - 0.5);
      expect(up.x).toBeGreaterThanOrEqual(r.x + (await resolveToken(page, T('container-padding-inline-start'))) - 0.5);
      expect(remove.y + remove.height).toBeLessThanOrEqual(r.y + r.height + 0.5);
      // No text is cut: every text's box holds its content, inside the row.
      for (const part of ['.headline', '.supporting']) {
        const [scrollW, clientW, scrollH, clientH] = await row(page, 'narrow', n).locator(part).evaluate((el) => [el.scrollWidth, el.clientWidth, el.scrollHeight, el.clientHeight]);
        expect(scrollW, `row ${n} ${part}`).toBeLessThanOrEqual(clientW);
        expect(scrollH, `row ${n} ${part}`).toBeLessThanOrEqual(clientH);
      }
      expect(text.x + text.width).toBeLessThanOrEqual(r.x + r.width + 0.5);
      // No control is smaller than its target: the Button's hit area, and the two keep a touch target's length each.
      for (const which of ['up', 'down'] as const) {
        const target = await moveButton(page, 'narrow', n, which).locator('button').evaluate((el) => Math.min(Number.parseFloat(getComputedStyle(el, '::before').width), Number.parseFloat(getComputedStyle(el, '::before').height)));
        expect(target).toBeGreaterThanOrEqual(Math.min(touch, await resolveToken(page, '--tanrei-sys-target-pointer')));
      }
      expect(down.x + down.width / 2 - (up.x + up.width / 2)).toBeGreaterThanOrEqual(touch - 0.5);
    }
    expect(ups[1], 'the buttons of all rows stand under each other').toBeCloseTo(ups[0], 1);
    expect((await bounds(row(page, 'narrow', 0).locator('.headline'))).height, 'the headline wraps').toBeGreaterThan((await bounds(row(page, 'narrow', 1).locator('.headline'))).height * 1.5);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    // A move still works there, and focus stays with the item.
    await product(page, 'narrow', 'handler', 'move');
    await tabTo(page, moveButton(page, 'narrow', 1, 'up').locator('button'));
    await page.keyboard.press('Enter');
    await expect.poll(() => focusedControl(page)).toBe('Short:down');
  });

  test('LST-51: the controls stand below the text only where they would leave it narrower than reorder.text-min-width — a length that grows with the text — so a usual row (a handle, two move buttons and a remove button) keeps them beside its text in a list 360 wide at the default text size', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('fonts', ['Inter', 'Noto Sans JP', 'Helvetica Neue'], { ...REORDER, reorder: 'drag' }, {}, REMOVE)] });
    const least = await resolveToken(page, T('reorder-text-min-width'));
    expect(least).toBe(96);
    // 360 wide at 100%: one line, the buttons beside the text, and the text column at least the least width.
    for (const n of [0, 1, 2]) await expect(row(page, 'fonts', n)).not.toHaveClass(/stacked/);
    const text = await bounds(row(page, 'fonts', 1).locator('.text'));
    const up = await bounds(moveButton(page, 'fonts', 1, 'up'));
    expect(up.y).toBeLessThan(text.y + text.height);
    expect(text.width).toBeGreaterThanOrEqual(least);
    // A least width wider than the text column has: every row stacks at once.
    // (A change of a token alone resizes nothing; the list measures again when its box changes, so it is nudged.)
    const nudge = (width: number) => page.locator('tanrei-list').first().evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}px`), width);
    await override(page, { [T('reorder-text-min-width')]: `${Math.ceil(text.width) + 1}px` });
    await nudge(359);
    for (const n of [0, 1, 2]) await expect(row(page, 'fonts', n), `row ${n}`).toHaveClass(/stacked/);
    await override(page, { [T('reorder-text-min-width')]: '' });
    await nudge(360);
    for (const n of [0, 1, 2]) await expect(row(page, 'fonts', n), `row ${n}`).not.toHaveClass(/stacked/);
    // At 200% text the least width grows by the same factor, and the same rows stack.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await override(page, { '--tanrei-dial-type-base': '32px' });
    expect(await resolveToken(page, T('reorder-text-min-width'))).toBe(least * 2);
    for (const n of [0, 1, 2]) await expect(row(page, 'fonts', n), `row ${n} at 200%`).toHaveClass(/stacked/);
  });

  test('LST-52: the trailing control keeps its own semantics and focus stop after the move buttons; when the product removes the item that holds focus, focus goes to the control in the same place of the item now standing there, else of the one before it, else to that item’s first control that can take focus; the last item gone, focus is the product’s; nothing is announced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('removing', ['Inter', 'Noto Sans JP', 'Helvetica Neue'], REORDER, {}, REMOVE), reorderable('moving', FOUR, REORDER, {}, REMOVE)] });
    // The product's removal: its button's click takes its item away.
    await page.evaluate(() => document.addEventListener('click', (event) => (event.target as Element).closest?.('[slot="trailing"]')?.closest('tanrei-list-item')?.remove()));
    const remove = (id: string, n: number) => item(page, id, n).locator('[slot="trailing"]');
    await expect(remove('removing', 1).locator('button')).toHaveAttribute('aria-label', 'Remove Noto Sans JP');
    // The second of three, its remove button focused: the remove button of the item that was third.
    await tabTo(page, remove('removing', 1).locator('button'));
    await page.keyboard.press('Enter');
    await expect.poll(() => order(page, 'removing')).toEqual(['Inter', 'Helvetica Neue']);
    await expect.poll(() => focusedControl(page)).toBe('Helvetica Neue:trailing');
    // The last item: the remove button of the one before.
    await page.keyboard.press('Enter');
    await expect.poll(() => order(page, 'removing')).toEqual(['Inter']);
    await expect.poll(() => focusedControl(page)).toBe('Inter:trailing');
    expect(await announced(page, 'removing'), 'a removal is the product’s to say').toBe('');
    // The last item of all: focus is left to the product.
    await page.keyboard.press('Enter');
    await expect.poll(() => order(page, 'removing')).toEqual([]);
    await page.waitForTimeout(100);
    expect(await focusedControl(page)).toBeNull();
    // A move button: the same move button of the item now standing there; where that one is disabled, the first control that can take focus.
    await tabTo(page, moveButton(page, 'moving', 1, 'down').locator('button'));
    await item(page, 'moving', 1).evaluate((el) => el.remove());
    await expect.poll(() => focusedControl(page)).toBe('Sent:down');
    await tabTo(page, moveButton(page, 'moving', 2, 'up').locator('button'));
    await item(page, 'moving', 2).evaluate((el) => el.remove());
    // The last item is gone: the one before it, whose move-up can take focus.
    await expect.poll(() => focusedControl(page)).toBe('Sent:up');
    await item(page, 'moving', 1).evaluate((el) => el.remove());
    // One item left: both move buttons are disabled, so its remove button.
    await expect.poll(() => focusedControl(page)).toBe('Inbox:trailing');
    // Focus that is elsewhere is not taken by a removal.
    await mountFixtures(page, spec, { icons: true, fixtures: [reorderable('quiet', FOUR, REORDER, {}, REMOVE)] });
    await tabTo(page, moveButton(page, 'quiet', 1, 'down').locator('button'));
    await blurFocused(page);
    await item(page, 'quiet', 1).evaluate((el) => el.remove());
    await page.waitForTimeout(100);
    expect(await focusedControl(page)).toBeNull();
  });

  test('LST-37, LST-50: forced colors — the move buttons are drawn as Buttons are there, a disabled one in the disabled text color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
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
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.color = keyword;
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, name);
    expect(await css(moveButton(page, 'reorder-buttons', 0, 'up').locator('button'), 'color')).toBe(await system('GrayText'));
    expect(await css(moveButton(page, 'reorder-buttons', 1, 'up').locator('button'), 'color')).not.toBe(await system('GrayText'));
    expect(await css(moveButton(page, 'reorder-buttons', 1, 'up').locator('.move-glyph'), 'visibility')).toBe('visible');
  });

  test('accessibility of the reorderable fixtures: no axe violations in light and dark, with the product’s remove button in the trailing slot', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [...spec.fixtures.filter((f) => f.id.startsWith('reorder-')), reorderable('with-remove', FOUR, REORDER, {}, REMOVE)] });
      await product(page, 'with-remove');
      await moveButton(page, 'with-remove', 1, 'up').click();
      await expect.poll(() => announced(page, 'with-remove')).toBe('Starred: 1 of 4');
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });

  // The drag form is not built on the web: the handle and the carried item are not built.
  for (const [id, what] of [
    ['LST-44', 'the handle at the row’s start'],
    ['LST-45', 'a press on the handle lifts the item'],
    ['LST-46', 'the carried item follows the pointer and its neighbours make room'],
    ['LST-47', 'a drop emits move once and the item settles'],
    ['LST-48', 'Escape, a cancelled pointer or a change of the items ends a drag without a move'],
    ['LST-49', 'a drag where motion is reduced'],
    ['LST-50', 'a carried item in forced colors'],
  ] as const) {
    test.fixme(`${id}: ${what} — reorder="drag" is not built on the web yet`, () => {});
  }
});

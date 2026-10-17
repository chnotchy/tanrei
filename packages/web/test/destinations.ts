// The tests every region of destinations whose item is `NavigationDestination` shares (a navigation bar, NVB-*): activation,
// selection, the states and the press, focus, labels, icon, badge and semantics. Each component's
// own test file calls `destinationSuite()` with the behaviour ids its spec gives each sentence — written out there, so
// the parity check finds every id in that file — and tests what only it has (its layout, its insets) itself.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, type Spec, acmeSystemCss, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from './harness.js';
import { opticalSize } from './icons.js';

type P = Page;

/** The behaviour id of each shared sentence, as the component's spec numbers it. */
export interface DestinationIds {
  activate: string;
  disabled: string;
  selectedParts: string;
  states: string;
  focusRing: string;
  disabledLook: string;
  pressHold: string;
  feedback: string;
  cornersAndFocusStyle: string;
  labels: string;
  icon: string;
  selection: string;
  badge: string;
  count: string;
  semantics: string;
  emptyLabel: string;
  duplicate: string;
}

export interface DestinationSuiteOptions {
  spec: Spec;
  /** The region's and the item's tags. */
  tag: string;
  itemTag: string;
  ids: DestinationIds;
  /** How many lines a label takes at most. */
  lines: 1;
  /** How many destinations the region is made for. */
  range: readonly [number, number];
  /**
   * The shared sentences the component's spec words its own way, which its own test file tests instead: a bar's indicator
   * slides rather than grows (NVB-15).
   */
  own?: readonly 'selection'[];
}

export const destination = (value: string, label: string, icon: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'destination', props: { value, label, icon, ...props } });
export const FOUR = [destination('inbox', 'Inbox', 'inbox'), destination('sent', 'Sent', 'send'), destination('starred', 'Starred', 'star'), destination('settings', 'Settings', 'settings')];

export function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

export const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);

export const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);

export const bounds = async (locator: Locator) => (await locator.boundingBox())!;

const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

export function destinationSuite({ spec, tag, itemTag, ids, lines, range, own = [] }: DestinationSuiteOptions) {
  const prefix = `--tanrei-comp-${spec.name}`;
  const shared = (sentence: 'selection') => (own.includes(sentence) ? test.skip : test);
  const T = (name: string) => `${prefix}-${name}`;
  const region = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${tag}`);
  const item = (page: P, id: string, n: number) => region(page, id).locator(itemTag).nth(n);
  const cell = (page: P, id: string, n: number) => item(page, id, n).locator('.cell');
  const container = (page: P, id: string, n: number) => item(page, id, n).locator('.container');
  const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { label: 'Main', ...props }, items });
  const mount = (page: P, fixtures?: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, ...(fixtures ? { fixtures } : {}), ...options });

  /** What a destination draws: its item container (the indicator's color), icon, label and opacity. */
  const drawn = (page: P, id: string, n: number) =>
    item(page, id, n).evaluate((el) => {
      const root = el.shadowRoot!;
      return {
        container: getComputedStyle(root.querySelector('.indicator')!).backgroundColor,
        icon: getComputedStyle(root.querySelector('.icon')!).color,
        label: getComputedStyle(root.querySelector('.label')!).color,
        opacity: getComputedStyle(root.querySelector('.cell')!).opacity,
      };
    });
  const expected = async (page: P, condition: 'unselected' | 'selected', state = '') => {
    const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}item-${part}-color`);
    return {
      container: await resolveColor(page, name('container')),
      icon: await resolveColor(page, name('icon')),
      label: await resolveColor(page, name('label')),
      opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
    };
  };

  /** Logs every change and reselect the regions fire: the event, the value it carried and the region's value then. */
  const wire = (page: P) =>
    page.evaluate((t) => {
      const log: string[] = ((window as any).log = []);
      for (const r of document.querySelectorAll<any>(t)) for (const type of ['change', 'reselect']) r.addEventListener(type, (e: CustomEvent) => log.push(`${type}:${e.detail.value}:${r.value}`));
    }, tag);
  const log = (page: P) => page.evaluate(() => (window as any).log as string[]);

  test.describe('destinations: activation and selection', () => {
    test(`${ids.activate}: a pointer, Enter, Space or click() emits change once with the value (the region already holds it), and reselect on the selected destination`, async ({ page }) => {
      await mount(page, [fixture('r', FOUR, { value: 'inbox' })]);
      await wire(page);
      await cell(page, 'r', 1).click();
      await cell(page, 'r', 1).click();
      expect(await log(page)).toEqual(['change:sent:sent', 'reselect:sent:sent']);
      await tabTo(page, cell(page, 'r', 2));
      await page.keyboard.press('Enter');
      await tabTo(page, cell(page, 'r', 3));
      await page.keyboard.press('Space');
      await item(page, 'r', 0).evaluate((el: HTMLElement) => el.click());
      expect(await log(page)).toEqual(['change:sent:sent', 'reselect:sent:sent', 'change:starred:starred', 'change:settings:settings', 'change:inbox:inbox']);
      // Setting the value from script fires nothing.
      await region(page, 'r').evaluate((el: any) => (el.value = 'sent'));
      expect((await log(page)).length).toBe(5);
    });

    test(`${ids.activate}: a destination with href is a link — Enter activates it, Space does not; the region emits change with the address and leaves its value to the page`, async ({ page }) => {
      const links = FOUR.map((d) => ({ ...d, props: { ...d.props, href: `#${d.props.value}` } }));
      await mount(page, [fixture('r', links, { value: 'inbox' })]);
      await wire(page);
      await region(page, 'r').evaluate((el) => {
        for (const type of ['change', 'reselect']) el.addEventListener(type, (e) => ((window as any).log as string[]).push(`href:${(e as CustomEvent).detail.href}`));
      });
      await tabTo(page, cell(page, 'r', 1));
      await page.keyboard.down('Space');
      await expect(container(page, 'r', 1)).not.toHaveAttribute('data-pressed');
      await page.keyboard.up('Space');
      expect(await log(page)).toEqual([]);
      await page.keyboard.press('Enter');
      // The event carries the pressed destination's value and its address; the region's value is still the page's.
      expect(await log(page)).toEqual(['change:sent:inbox', 'href:#sent']);
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#sent');
      await cell(page, 'r', 2).click();
      expect(await log(page)).toEqual(['change:sent:inbox', 'href:#sent', 'change:starred:inbox', 'href:#starred']);
      expect(await page.evaluate(() => location.hash)).toBe('#starred');
      expect(await region(page, 'r').evaluate((el: any) => el.value)).toBe('inbox');
      await expect(cell(page, 'r', 0)).toHaveAttribute('aria-current', 'page');
    });

    test(`${ids.disabled}: a disabled destination emits nothing, is not focusable and is exposed as disabled`, async ({ page }) => {
      await mount(page, [fixture('r', FOUR.map((d, i) => (i === 2 ? { ...d, props: { ...d.props, disabled: true } } : d)), { value: 'inbox' })]);
      await wire(page);
      await cell(page, 'r', 2).dispatchEvent('click');
      await item(page, 'r', 2).dispatchEvent('click');
      await item(page, 'r', 2).evaluate((el: HTMLElement) => el.click());
      expect(await log(page)).toEqual([]);
      await expect(region(page, 'r').getByRole('button', { name: 'Starred' })).toBeDisabled();
      await item(page, 'r', 2).evaluate((el: HTMLElement) => el.focus());
      expect(await page.evaluate(() => document.activeElement?.getAttribute('value'))).not.toBe('starred');
      // Tab goes from Sent to Settings.
      await tabTo(page, cell(page, 'r', 1));
      await tab(page);
      expect(await page.evaluate(() => document.activeElement?.getAttribute('value'))).toBe('settings');
      // A disabled link is not a link to anywhere.
      await mount(page, [fixture('l', [destination('a', 'A', 'inbox', { href: '#a' }), destination('b', 'B', 'send', { href: '#b', disabled: true })], { value: 'a' })]);
      const link = cell(page, 'l', 1);
      await expect(link).not.toHaveAttribute('href');
      await expect(link).toHaveAttribute('aria-disabled', 'true');
      await expect(region(page, 'l').getByRole('link', { name: 'B' })).toBeDisabled();
    });

    test(`${ids.selectedParts}: the destination whose value is the region's is drawn from the selected parts, every other from the unselected; a value naming none draws none selected and is reported`, async ({ page }) => {
      const seen = warnings(page);
      await mount(page, [...spec.fixtures.filter((f) => f.id === 'four-destinations' || f.id === 'none-selected'), fixture('unknown', FOUR, { value: 'nowhere' })]);
      await page.mouse.move(0, 0);
      const [selected, unselected] = [await expected(page, 'selected'), await expected(page, 'unselected')];
      expect(selected.container).not.toBe(unselected.container);
      await expect.poll(() => drawn(page, 'four-destinations', 0)).toEqual(selected);
      for (const n of [1, 2, 3]) expect(await drawn(page, 'four-destinations', n)).toEqual(unselected);
      for (const id of ['none-selected', 'unknown']) {
        if (!(await region(page, id).count())) continue;
        for (const n of [0, 1, 2, 3]) expect(await drawn(page, id, n), `${id}/${n}`).toEqual(unselected);
      }
      await expect.poll(() => seen.filter((w) => w.includes(ids.selectedParts)).length).toBe(1);
      expect(seen.join('\n')).toMatch(new RegExp(`value "nowhere" names no destination; none is drawn selected \\(${ids.selectedParts}\\)`));
    });

    test(`${ids.duplicate}: two destinations with one value — the first is the one the value selects, and it is reported`, async ({ page }) => {
      const seen = warnings(page);
      await mount(page, [fixture('r', [destination('inbox', 'Inbox', 'inbox'), destination('inbox', 'Also inbox', 'send'), destination('starred', 'Starred', 'star')], { value: 'inbox' })]);
      await expect(cell(page, 'r', 0)).toHaveAttribute('aria-current', 'page');
      await expect(cell(page, 'r', 1)).not.toHaveAttribute('aria-current');
      await expect.poll(() => seen.filter((w) => w.includes(ids.duplicate)).length).toBe(1);
      expect(seen.join('\n')).toMatch(/the value "inbox" is given to more than one destination; the first of them is the one it selects/);
    });

    test(`${ids.count}: fewer than ${range[0]} or more than ${range[1]} destinations still render, and are reported`, async ({ page }) => {
      const seen = warnings(page);
      const many = Array.from({ length: range[1] + 1 }, (_, i) => destination(`d${i}`, `D${i}`, 'star'));
      await mount(page, [fixture('few', FOUR.slice(0, range[0] - 1), { value: 'inbox' }), fixture('many', many, { value: 'd0' })]);
      await expect(region(page, 'few').locator(itemTag)).toHaveCount(range[0] - 1);
      await expect(region(page, 'many').locator(itemTag)).toHaveCount(range[1] + 1);
      for (const n of [0, range[1]]) await expect(container(page, 'many', n)).toBeVisible();
      await expect.poll(() => seen.filter((w) => w.includes(ids.count)).length).toBe(2);
      expect(seen.join('\n')).toMatch(new RegExp(`it holds ${range[0] - 1} destinations; it is made for ${range[0]} to ${range[1]}`));
      expect(seen.join('\n')).toMatch(new RegExp(`it holds ${range[1] + 1} destinations; it is made for ${range[0]} to ${range[1]}`));
    });

    test(`${ids.emptyLabel}: a destination with an empty label still renders, and a debug build says it has no accessible name`, async ({ page }) => {
      const seen = warnings(page);
      await mount(page, [fixture('r', [...FOUR.slice(0, 2), destination('blank', '', 'star')], { value: 'inbox' })]);
      await expect(container(page, 'r', 2)).toBeVisible();
      await expect(item(page, 'r', 2).locator('.icon')).toHaveText('star');
      await expect.poll(() => seen.filter((w) => w.includes(ids.emptyLabel)).length).toBe(1);
      expect(seen.join('\n')).toMatch(/a destination \(value "blank"\) has an empty label, so it has no accessible name/);
    });
  });

  test.describe('destinations: states, press and focus', () => {
    test.beforeAll(async () => {
      test.setTimeout(240_000);
      await acmeSystemCss();
    });

    test(`${ids.states}: each state draws the destination from that state's tokens of its condition; pointer focus is not the focused state`, async ({ page, browserName }) => {
      for (const [n, condition] of [
        [1, 'unselected'],
        [0, 'selected'],
      ] as const) {
        await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
        await page.mouse.move(0, 0);
        await expect.poll(() => drawn(page, 'four-destinations', n)).toEqual(await expected(page, condition));
        // Hover over the cell's edge, away from the item container: the whole cell answers on the item container.
        await cell(page, 'four-destinations', n).hover({ position: { x: 2, y: 2 } });
        await expect.poll(() => drawn(page, 'four-destinations', n), `${condition} hovered`).toEqual(await expected(page, condition, 'hovered'));
        await page.mouse.down();
        await expect.poll(() => drawn(page, 'four-destinations', n), `${condition} pressed`).toEqual(await expected(page, condition, 'pressed'));
        await page.mouse.up();
        await page.mouse.move(0, 0);
        // Pointer focus: the destination is focused and now selected, but not in the focused state.
        // (Safari does not focus a button that is clicked.)
        if (browserName !== 'webkit') await expect(cell(page, 'four-destinations', n)).toBeFocused();
        await expect.poll(() => drawn(page, 'four-destinations', n), `${condition} pointer focus`).toEqual(await expected(page, 'selected'));
        await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
        await page.mouse.click(1, 1); // the page, not the browser, has the keyboard (WebKit)
        await tabTo(page, cell(page, 'four-destinations', n));
        await expect.poll(() => drawn(page, 'four-destinations', n), `${condition} focused`).toEqual(await expected(page, condition, 'focused'));
      }
    });

    test(`${ids.states}: under acme, where the three states differ, pressed beats focused beats hovered`, async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'), { system: 'acme', systemCss: await acmeSystemCss() });
      const bg = () => css(item(page, 'four-destinations', 0).locator('.indicator'), 'background-color');
      const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`selected-${s}item-container-color`))));
      expect(new Set([rest, hovered, focus, down]).size).toBe(4);
      await page.mouse.move(0, 0);
      await expect.poll(bg).toBe(rest);
      await container(page, 'four-destinations', 0).hover();
      await expect.poll(bg).toBe(hovered);
      await tabTo(page, cell(page, 'four-destinations', 0));
      await expect.poll(bg).toBe(focus);
      await page.keyboard.down('Space');
      await expect.poll(bg).toBe(down);
      await page.keyboard.up('Space');
    });

    test(`${ids.focusRing}: keyboard focus shows the ring around the item container, without animation; pointer focus does not`, async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
      const [outer, offset, inner] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width'].map((n) => resolveToken(page, n)));
      // A press anywhere in a cell — on its icon, its badge, its label — lands on the native button itself. Where a clicked
      // button takes focus (WebKit on Linux), a press on a descendant of it inside the shadow root left Tab and Shift+Tab
      // unable to move focus at all; the Tab below proves it there, this proves the cause in every engine.
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations' || f.id === 'badges'));
      for (const [id, n] of [['four-destinations', 1], ['badges', 0], ['badges', 1]] as const) {
        const hits = await item(page, id, n).evaluate((el) => {
          const root = el.shadowRoot!;
          return ['.icon', '.label', '.container', '.cell', 'tanrei-badge'].flatMap((part) => {
            const box = root.querySelector(part)?.getBoundingClientRect();
            if (!box) return [];
            const at = root.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return [`${part}: ${at?.classList.contains('cell') ? 'cell' : at?.outerHTML.slice(0, 60)}`];
          });
        });
        expect(hits.length, `${id} ${n}`).toBe(id === 'badges' ? 5 : 4);
        for (const hit of hits) expect(hit, `${id} ${n}`).toMatch(/: cell$/);
      }
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
      await cell(page, 'four-destinations', 1).click();
      await expect(container(page, 'four-destinations', 1)).toHaveCSS('outline-style', 'none');
      await tabTo(page, cell(page, 'four-destinations', 2));
      const c = container(page, 'four-destinations', 2);
      await expect(c).toHaveCSS('outline-style', 'solid');
      await expect(c).toHaveCSS('outline-width', `${outer}px`);
      await expect(c).toHaveCSS('outline-offset', `${offset + inner}px`);
      expect(await css(c, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      expect(await css(c, 'transition-property')).not.toContain('outline');
      // The cell itself draws nothing.
      await expect(cell(page, 'four-destinations', 2)).toHaveCSS('outline-style', 'none');
    });

    test(`${ids.disabledLook}: a disabled destination is drawn from the disabled tokens of its condition; a disabled selected one keeps its indicator`, async ({ page }) => {
      await mount(page, [...spec.fixtures.filter((f) => f.id === 'disabled'), fixture('selected-disabled', FOUR.map((d, i) => (i === 0 ? { ...d, props: { ...d.props, disabled: true } } : d)), { value: 'inbox' })]);
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, 'disabled', 2)).toEqual(await expected(page, 'unselected', 'disabled'));
      await expect.poll(() => drawn(page, 'selected-disabled', 0)).toEqual(await expected(page, 'selected', 'disabled'));
      expect((await drawn(page, 'selected-disabled', 0)).container).toBe(await resolveColor(page, T('selected-item-container-color')));
      expect((await drawn(page, 'disabled', 2)).container).toBe(await resolveColor(page, T('unselected-item-container-color')));
    });

    test(`${ids.pressHold}: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold`, async ({ page }) => {
      expect(await (async () => {
        await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
        return resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      })()).toBe(100);
      const hold = 1000;
      for (const [name, activate] of [
        ['Enter', () => page.keyboard.press('Enter')],
        ['Space', () => page.keyboard.press('Space')],
        ['click', () => cell(page, 'four-destinations', 1).click()],
      ] as const) {
        await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
        await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
        await cell(page, 'four-destinations', 1).evaluate((el: HTMLElement) => el.focus());
        await container(page, 'four-destinations', 1).evaluate((el) => {
          const log: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
          new MutationObserver(() => {
            if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
            else if (log.on !== undefined) log.off ??= performance.now();
          }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
          for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
          for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
        });
        await activate();
        await expect.poll(() => page.evaluate(() => (window as any).press.off), name).toBeDefined();
        const logged = await page.evaluate(() => (window as any).press);
        expect(logged.up - logged.on, name).toBeLessThan(hold);
        expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
      }
    });

    test(`${ids.feedback}: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first`, async ({ page }) => {
      const press = async (system?: string, feedback?: string) => {
        await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'), system ? { system } : {});
        if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
        await override(page, { [T('unselected-pressed-item-label-color')]: 'rgb(0, 0, 255)' });
        const c = container(page, 'four-destinations', 1);
        await c.hover();
        await expect.poll(() => css(item(page, 'four-destinations', 1).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
        const hovered = await css(item(page, 'four-destinations', 1).locator('.indicator'), 'background-color');
        await page.mouse.down();
        const result = {
          pressed: await c.getAttribute('data-pressed'),
          bg: await css(item(page, 'four-destinations', 1).locator('.indicator'), 'background-color'),
          hovered,
          label: await css(item(page, 'four-destinations', 1).locator('.label'), 'color'),
          ripple: await c.locator('.ripple').count(),
          opacity: await css(cell(page, 'four-destinations', 1), 'opacity'),
        };
        await page.mouse.move(0, 0);
        await page.mouse.up();
        return result;
      };
      const overlay = await press();
      expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)' });
      expect(overlay.bg).toBe(await resolveColor(page, T('unselected-pressed-item-container-color')));
      const ripple = await press('m3-like');
      expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, label: 'rgb(0, 0, 255)' });
      expect(ripple.bg).toBe(ripple.hovered);
      const dim = await press('cupertino');
      expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, label: 'rgb(0, 0, 255)' });
      expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
      const none = await press(undefined, 'none');
      expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
      expect(none.bg).toBe(none.hovered);
      expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
      // The ripple is clipped to the item container; from its centre for a key, and for a press elsewhere in the cell.
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'), { system: 'm3-like' });
      const layer = () =>
        container(page, 'four-destinations', 1)
          .locator('.ripple')
          .evaluate((el) => {
            const s = getComputedStyle(el);
            const box = el.getBoundingClientRect();
            const host = el.parentElement!.getBoundingClientRect();
            return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / box.width, y: Number.parseFloat(el.style.getPropertyValue('--_y')) / box.height, inside: box.width === host.width && box.height === host.height, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
          });
      await page.mouse.click(1, 1); // the page, not the browser, has the keyboard (WebKit)
      await tabTo(page, cell(page, 'four-destinations', 1));
      await page.keyboard.down('Enter');
      const key = await layer();
      await page.keyboard.up('Enter');
      expect(key).toMatchObject({ x: expect.closeTo(0.5, 5), y: expect.closeTo(0.5, 5), inside: true });
      expect(key.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
      expect(key.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
      // Elsewhere in the cell: a region whose item containers are held in from its edges (a bar's container.padding) has
      // a strip of the cell outside them, and a press there grows the ripple from the item container's centre.
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
      await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
      const [edge, inner] = [await bounds(cell(page, 'four-destinations', 1)), await bounds(container(page, 'four-destinations', 1))];
      test.skip(inner.y + inner.height > edge.y + edge.height - 1, 'the item container reaches the cell’s edge: no part of the cell is outside it');
      await page.mouse.move(edge.x + edge.width / 2 + 10, edge.y + edge.height - 1);
      await page.mouse.down();
      expect(await layer()).toMatchObject({ x: expect.closeTo(0.5, 5), y: expect.closeTo(0.5, 5) });
      await page.mouse.up();
    });

    test(`${ids.cornersAndFocusStyle} corner smoothing and focus-style: cupertino eases the item container's corners; acme shows focus as a glow`, async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'), { system: 'cupertino' });
      expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
      // The token is the full step by default, which is drawn round whatever the smoothing (its `-pill` companion).
      await override(page, { [T('item-container-shape')]: '12px', [`${T('item-container-shape')}-pill`]: '0' });
      const c = container(page, 'four-destinations', 1);
      if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
        expect(Number.parseFloat((await css(c, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
        await expect.poll(async () => Number.parseFloat(await css(c, 'border-top-left-radius'))).toBeCloseTo(12 * 1.24, 2);
      } else expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBe(12);

      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'), { system: 'acme', systemCss: await acmeSystemCss() });
      expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
      await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
      const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
      await tabTo(page, cell(page, 'four-destinations', 1));
      const focused = container(page, 'four-destinations', 1);
      expect(await css(focused, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(focused, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
      await expect(cell(page, 'four-destinations', 1)).toHaveAttribute('data-focus-style', 'glow');
    });
  });

  test.describe('destinations: drawing', () => {
    test(`${ids.labels}: always draws every label, selected only the selected one's, never none; a destination without its label centres its item container, and every label stays its accessible name`, async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations' || f.id === 'labels-selected' || f.id === 'labels-never'));
      const shown = (id: string, n: number) => item(page, id, n).locator('.label-box').evaluate((el) => el.getBoundingClientRect().height > 0 && getComputedStyle(el).opacity === '1');
      for (const n of [0, 1, 2, 3]) expect(await shown('four-destinations', n)).toBe(true);
      const selectedIndex = (id: string) => ['inbox', 'sent', 'starred', 'settings'].indexOf(String(spec.fixtures.find((f) => f.id === id)!.props.value));
      for (const n of [0, 1, 2, 3]) {
        await expect.poll(() => shown('labels-selected', n), `selected ${n}`).toBe(n === selectedIndex('labels-selected'));
        await expect.poll(() => shown('labels-never', n), `never ${n}`).toBe(false);
      }
      // Without a label the item container is in the middle of the cell.
      for (const [id, n] of [['labels-never', 0], ['labels-selected', (selectedIndex('labels-selected') + 1) % 4]] as const) {
        const [c, own] = [await bounds(container(page, id, n)), await bounds(cell(page, id, n))];
        expect(c.y + c.height / 2, `${id}/${n}`).toBeCloseTo(own.y + own.height / 2, 0);
      }
      for (const id of ['labels-selected', 'labels-never']) {
        for (const name of ['Inbox', 'Sent', 'Starred', 'Settings']) await expect(region(page, id).getByRole('button', { name }), `${id} ${name}`).toHaveCount(1);
      }
      // Unknown values are always; the property follows the attribute.
      await region(page, 'labels-never').evaluate((el: any) => (el.labelVisibility = 'sometimes'));
      await expect.poll(() => shown('labels-never', 2)).toBe(true);
    });

    test(`${ids.icon}: each icon at item.icon.size, in the family and fill of its condition, sys.icon.weight, the optical size of its box`, async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'four-destinations'));
      const size = await resolveToken(page, T('item-icon-size'));
      const unquote = (family: string) => family.replace(/["']/g, '');
      const sys = async (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
      const glyph = (n: number) =>
        item(page, 'four-destinations', n)
          .locator('.icon')
          .evaluate((el) => {
            const s = getComputedStyle(el);
            return { size: Number.parseFloat(s.fontSize), family: s.fontFamily, settings: s.fontVariationSettings, optical: s.fontOpticalSizing };
          });
      for (const [n, condition] of [
        [0, 'selected'],
        [1, 'unselected'],
      ] as const) {
        await expect.poll(async () => (await glyph(n)).settings, condition).toContain(`"FILL" ${Number(await sys(`--tanrei-sys-icon-fill-${condition}`))}`);
        const g = await glyph(n);
        expect(g.size).toBe(size);
        expect(unquote(g.family)).toBe(unquote(await sys(`--tanrei-sys-icon-family-${condition}`)));
        expect(g.settings).toContain(`"wght" ${Number(await sys('--tanrei-sys-icon-weight'))}`);
        // The optical size is the box's, clamped to sys.icon.optical-size (test/icons.ts).
        const opsz = await opticalSize(page, size);
        if (opsz === undefined) expect(g.settings).not.toContain('"opsz"');
        else expect(g.settings).toContain(`"opsz" ${opsz}`);
        expect(g.optical).toBe('auto');
      }
    });

    shared('selection')(`${ids.selection}: a new selection grows its indicator in width from the centre at full height, fades the old one and recolors over the selection motion; at once where motion is reduced`, async ({ page }) => {
      await mount(page, [...spec.fixtures.filter((f) => f.id === 'four-destinations' || f.id === 'labels-selected')]);
      const duration = await resolveToken(page, T('motion-selection-duration'), 'duration');
      expect(duration).toBeGreaterThan(0);
      await override(page, { [T('motion-selection-duration')]: '2000ms' });
      const [wasSelected, unselected] = [await resolveColor(page, T('selected-item-container-color')), await resolveColor(page, T('unselected-item-container-color'))];
      const [iconFrom, iconTo] = [await resolveColor(page, T('unselected-item-icon-color')), await resolveColor(page, T('selected-item-icon-color'))];
      // Selected by value (a press recolors at once: the pressed state arrives without a transition). What the change
      // starts is read in the task that makes it, and the fade and the recolor half-way through on each one's own timeline
      // (paused, set, read, put back) — not after a wall-clock wait, which a busy renderer can outlast: CI read the end
      // value of a 2 s fade "500 ms" in.
      const seen = await region(page, 'four-destinations').evaluate(async (el: any, itemTag) => {
        el.value = 'starred';
        await el.updateComplete;
        const items = [...el.querySelectorAll(itemTag)] as any[];
        await Promise.all(items.map((each) => each.updateComplete));
        const part = (n: number, selector: string) => items[n].shadowRoot.querySelector(selector) as HTMLElement;
        const indicator = part(2, '.indicator');
        const a = indicator.getAnimations().find((each) => (each as Animation).id === 'tanrei-destination-grow');
        const box = indicator.getBoundingClientRect();
        const host = indicator.parentElement!.getBoundingClientRect();
        const grow = a ? { duration: a.effect!.getTiming().duration, frames: (a.effect as KeyframeEffect).getKeyframes().map((k) => k.insetInline), width: box.width < host.width, height: box.height === host.height, centred: Math.abs(box.x + box.width / 2 - (host.x + host.width / 2)) < 0.5 } : null;
        /**
         * The one transition of `property` (a color) on `on`, drawn half-way through its own motion: every animation of the
         * part is paused and set, on its own timeline, to the moment the drawn color is half-way from where it starts to
         * where it ends (found by bisection — an engine may put the easing on the effect or on its keyframes, and a
         * spring's curve is nearly done at half its duration), read there, and put back.
         */
        const halfway = (on: HTMLElement, property: string): { found: number; duration?: number; value?: string } => {
          const all = on.getAnimations();
          const running = all.filter((each) => (each as CSSTransition).transitionProperty === property);
          if (running.length !== 1) return { found: running.length };
          ((window as any).selectionMotion ??= []).push({ on, transition: running[0] });
          const duration = Number(running[0].effect!.getTiming().duration);
          const was = all.map((each) => each.currentTime);
          const drawn = (time: number) => {
            for (const each of all) {
              each.pause();
              each.currentTime = time;
            }
            const [r, g, b, alpha = 1] = (getComputedStyle(on).getPropertyValue(property).match(/[\d.]+/g) ?? []).map(Number);
            return [r, g, b, alpha * 255];
          };
          const [from, to] = [drawn(0), drawn(duration)];
          const channel = [0, 1, 2, 3].reduce((best, c) => (Math.abs(to[c] - from[c]) > Math.abs(to[best] - from[best]) ? c : best), 0);
          const done = (time: number) => (drawn(time)[channel] - from[channel]) / (to[channel] - from[channel]);
          let [early, late] = [0, duration];
          for (let step = 0; step < 24; step++) {
            const time = (early + late) / 2;
            if (done(time) < 0.5) early = time;
            else late = time;
          }
          drawn(late);
          const value = getComputedStyle(on).getPropertyValue(property);
          all.forEach((each, i) => {
            each.currentTime = was[i] ?? 0;
            each.play();
          });
          return { found: 1, duration, value };
        };
        return { grow, fade: halfway(part(0, '.indicator'), 'background-color'), recolor: halfway(part(2, '.icon'), 'color') };
      }, itemTag);
      expect(seen.grow).toEqual({ duration: 2000, frames: ['50%', '0px'], width: true, height: true, centred: true });
      // The previous indicator fades and the new icon recolors over the selection motion (not the state motion): half-way
      // through, they are neither color.
      expect(seen.fade, 'the previous indicator fades').toMatchObject({ found: 1, duration: 2000 });
      expect([wasSelected, unselected]).not.toContain(seen.fade.value);
      expect(seen.recolor, 'the new icon recolors').toMatchObject({ found: 1, duration: 2000 });
      expect([iconFrom, iconTo]).not.toContain(seen.recolor.value);
      // They keep that motion when the mark of the change comes off (two frames on, markConditionChange): each is still the
      // transition it started as — not one restarted over the state motion.
      const kept = await page.evaluate(async () => {
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        for (let n = 0; n < 3; n++) await frame();
        return ((window as any).selectionMotion as { on: HTMLElement; transition: Animation }[]).map(({ on, transition }) => {
          const now = on.getAnimations().filter((each) => (each as CSSTransition).transitionProperty === (transition as CSSTransition).transitionProperty);
          return now.length === 0 ? transition.playState === 'finished' : now.length === 1 && now[0] === transition;
        });
      });
      expect(kept, 'the fade and the recolor run on over the selection motion').toEqual([true, true]);
      const old = item(page, 'four-destinations', 0);
      await expect.poll(() => css(old.locator('.indicator'), 'background-color'), { timeout: 4000 }).toBe(unselected);
      // After the change, the parts recolor over the state motion again.
      expect(await css(old.locator('.indicator'), 'transition-duration')).toBe(`${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`);
      // Labels shown only for the selected destination move over the same motion.
      expect(await css(item(page, 'labels-selected', 0).locator('.label-box'), 'transition-duration')).toContain('2s');
      // Reduced motion: at once.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await region(page, 'four-destinations').evaluate((el: any) => (el.value = 'settings'));
      expect(await item(page, 'four-destinations', 3).locator('.indicator').evaluate((el) => el.getAnimations().length)).toBe(0);
      expect(await css(item(page, 'four-destinations', 2).locator('.indicator'), 'transition-duration')).toBe('0s');
      expect(await css(item(page, 'labels-selected', 0).locator('.label-box'), 'transition-duration')).toBe('0s');
      expect(await css(item(page, 'four-destinations', 3).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    });

    test(`${ids.badge}: a badge is the badge component on the icon, from badgeCount and badgeLabel; it stays while disabled, and its text is the destination's description`, async ({ page }) => {
      await mount(page, [
        ...spec.fixtures.filter((f) => f.id === 'badges'),
        fixture('more', [
          destination('a', 'A', 'inbox', { badge: true, badgeCount: 7 }),
          destination('b', 'B', 'send', { badge: true, badgeCount: 1500 }),
          destination('c', 'C', 'star', { badge: true, badgeCount: 0, badgeLabel: 'None' }),
          destination('d', 'D', 'settings', { badge: true, badgeCount: 2, badgeLabel: '2 new', disabled: true }),
        ], { value: 'a' }),
      ]);
      // A bar draws a second, hidden badge on the covered copy of its icon (NVB-23); the destination's own is the first.
      const badge = (id: string, n: number) => item(page, id, n).locator('tanrei-badge:not(.covered-badge)');
      await expect(badge('badges', 0)).toHaveCount(1);
      expect(await badge('badges', 0).evaluate((el: any) => [el.count, el.label])).toEqual([3, '3 unread']);
      expect(await badge('badges', 1).evaluate((el: any) => [el.count, el.label])).toEqual([null, 'New']);
      await expect(badge('badges', 2)).toHaveCount(0);
      // Anchored on the icon: the badge wraps the glyph.
      await expect(badge('badges', 0).locator('.icon')).toHaveCount(1);
      await expect(cell(page, 'badges', 0)).toHaveAccessibleDescription('3 unread');
      await expect(cell(page, 'badges', 1)).toHaveAccessibleDescription('New');
      await expect(cell(page, 'more', 0)).toHaveAccessibleDescription('7');
      await expect(cell(page, 'more', 1)).toHaveAccessibleDescription('999+');
      await expect(cell(page, 'more', 2)).not.toHaveAttribute('aria-description');
      await expect(cell(page, 'more', 3)).toHaveAccessibleDescription('2 new');
      await expect(badge('more', 3).locator('.container')).toBeVisible();
    });

    test(`${ids.semantics}: a navigation landmark named by its label; each destination a button (a link with href) named by its label, the selected one aria-current, its position in the set, its icon hidden`, async ({ page }) => {
      await mount(page, [...spec.fixtures.filter((f) => f.id === 'four-destinations' || f.id === 'labels-never'), fixture('links', FOUR.map((d) => ({ ...d, props: { ...d.props, href: `#${d.props.value}` } })), { value: 'sent', label: 'Links' })]);
      const nav = page.locator('[data-fixture="four-destinations"]').getByRole('navigation', { name: /^Main\b/ });
      await expect(nav).toHaveCount(1);
      await expect(page.locator('[data-fixture="four-destinations"]')).toMatchAriaSnapshot(`
        - navigation /^Main/:
          - list:
            - listitem:
              - button "Inbox"
            - listitem:
              - button "Sent"
            - listitem:
              - button "Starred"
            - listitem:
              - button "Settings"
      `);
      await expect(nav.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
      await expect(nav.getByRole('button', { name: 'Sent' })).not.toHaveAttribute('aria-current');
      for (const n of [0, 1, 2, 3]) {
        await expect(item(page, 'four-destinations', n)).toHaveAttribute('aria-posinset', String(n + 1));
        await expect(item(page, 'four-destinations', n)).toHaveAttribute('aria-setsize', '4');
        await expect(item(page, 'four-destinations', n).locator('.icon')).toHaveAttribute('aria-hidden', 'true');
      }
      await expect(page.locator('[data-fixture="labels-never"]').getByRole('button', { name: 'Starred' })).toHaveCount(1);
      const links = page.locator('[data-fixture="links"]').getByRole('navigation', { name: /^Links\b/ });
      await expect(links.getByRole('link', { name: 'Sent' })).toHaveAttribute('aria-current', 'page');
      await expect(links.getByRole('link')).toHaveCount(4);
    });
  });

  test.describe('destinations: accessibility', () => {
    test('no axe violations in light and dark', async ({ page }) => {
      for (const theme of ['light', 'dark'] as const) {
        await mount(page, undefined, { theme });
        await page.waitForTimeout(400); // colors transition
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    });

    test('forced colors: the selected indicator and a disabled destination keep system colors', async ({ page }) => {
      await mount(page, spec.fixtures.filter((f) => f.id === 'disabled'));
      await page.emulateMedia({ forcedColors: 'active' });
      test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), 'forced colors are not emulated by this browser');
      expect(await css(item(page, 'disabled', 0).locator('.indicator'), 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('fixtures', () => {
    for (const f of spec.fixtures) {
      test(`snapshot: ${f.id}`, async ({ page }) => {
        await mount(page);
        await page.mouse.move(0, 0);
        await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
      });
    }
  });
}

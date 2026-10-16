// <tanrei-navigation-drawer>, its items, groups and sections, driven by specs/navigation-drawer.spec.json: every behaviour
// id (NVD-1…67) is cited by a test title, every fixture has a baseline, and every value is read back from the tokens.
import AxeBuilder from '@axe-core/playwright';
import { atRest } from '../../../test/at-rest.js';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { bounds, css, override, warnings } from '../../../test/destinations.js';
import { type Fixture, type FixtureItem, acmeSystemCss, drawerWindow, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';

const spec = loadSpec('navigation-drawer');
type P = Page;
const drawer = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-navigation-drawer`);
const item = (page: P, id: string, n: number) => drawer(page, id).locator('tanrei-navigation-drawer-item').nth(n);
const group = (page: P, id: string, n: number) => drawer(page, id).locator('tanrei-navigation-drawer-group').nth(n);
/** A destination's cell: its native button or link. */
const cell = (page: P, id: string, n: number) => item(page, id, n).locator('.cell');
/** A group's own row (its shadow root comes before its items' in the order a locator reads). */
const groupRow = (page: P, id: string, n: number) => group(page, id, n).locator('.cell').first();
const panel = (page: P, id: string) => drawer(page, id).locator('.drawer');
const menu = (page: P, id: string) => drawer(page, id).locator('tanrei-button[slot="header-button"]').first();
const T = (name: string) => `--tanrei-comp-navigation-drawer-${name}`;
const d = (value: string, label: string, icon = '', props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'destination', props: { value, label, ...(icon ? { icon } : {}), ...props } });
const section = (heading: string, items: FixtureItem[], props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'section', props: { heading, ...props }, items });
const grp = (label: string, items: FixtureItem[], props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'group', props: { label, ...props }, items });
/** A link destination without a value of its own: its href stands for it (NVD-59). */
const link = (label: string, href: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'destination', props: { label, href, ...props } });
const MENU: FixtureItem = { kind: 'header-button', props: { label: 'Menu' }, content: 'menu' };
const MAIN: FixtureItem = { kind: 'main-action', props: { label: 'Compose' }, content: 'edit' };
const MAIL = [d('inbox', 'Inbox', 'inbox', { trailingText: '24' }), d('sent', 'Sent', 'send'), d('drafts', 'Drafts', 'draft'), d('trash', 'Trash', 'delete')];
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { open: true, value: 'inbox', label: 'Mail', ...props }, items });
/** The item container of a destination (a badge has a container of its own inside it). */
const box = (page: P, id: string, n: number) => item(page, id, n).locator('.row > .container');
/** A collapsible drawer with a menu button, collapsed unless `props` says otherwise. */
const rail = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => fixture(id, [MENU, ...items], { collapsible: true, expanded: false, ...props });
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = (page: P, name: string) => resolveToken(page, name);
const shadowOf = (page: P, n: string) =>
  page.evaluate((name) => {
    const p = document.createElement('div');
    p.style.boxShadow = `var(${name})`;
    document.body.appendChild(p);
    const v = getComputedStyle(p).boxShadow;
    p.remove();
    return v;
  }, n);
const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
/**
 * A one-line text against the box that cuts it: where its first and its last character are laid out, whether it
 * overflows the box (so an ellipsis is drawn), and the box's own direction and `text-overflow`.
 */
const cutEnds = (locator: Locator) =>
  locator.evaluate((el) => {
    const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode() as Text;
    const at = (index: number) => {
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const { left, right } = range.getBoundingClientRect();
      return { left, right };
    };
    const { left, right } = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { box: { left, right }, first: at(0), last: at(text.length - 1), overflows: el.scrollWidth > el.clientWidth, direction: style.direction, textOverflow: style.textOverflow, dir: el.getAttribute('dir') };
  });
/** A long right-to-left label. */
const ARABIC_LONG = 'في انتظار مراجعة ثانية من فريق إمكانية الوصول';
/** Sets the drawer's props and waits for the update that draws them. */
const setProps = (page: P, id: string, props: Record<string, unknown>) =>
  drawer(page, id).evaluate(async (el: any, p) => {
    Object.assign(el, p);
    await el.updateComplete;
    for (const child of el.querySelectorAll('*')) await (child as any).updateComplete;
  }, props);

type Condition = 'unselected' | 'selected' | 'collapsed-unselected' | 'collapsed-selected';
/** What a cell draws: its item container (the active indicator), icon indicator, icon, label (the short label while collapsed), trailing text and opacity. */
const drawn = (locator: Locator) =>
  locator.evaluate((el) => {
    const root = el.shadowRoot!;
    const style = (s: string) => {
      const e = root.querySelector(s);
      return e ? getComputedStyle(e) : null;
    };
    const collapsed = root.querySelector('.cell')!.classList.contains('collapsed');
    return {
      container: style('.indicator')!.backgroundColor,
      indicator: style('.icon-indicator')!.backgroundColor,
      icon: style('.icon')?.color ?? null,
      label: style(collapsed ? '.short' : '.label')!.color,
      trailing: style('.trailing-text')?.color ?? null,
      opacity: style('.cell')!.opacity,
    };
  });
const expected = async (page: P, condition: Condition, state = '', { icon = true, trailing = false } = {}) => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}item-${part}-color`);
  return {
    container: await resolveColor(page, name('container')),
    indicator: await resolveColor(page, name('icon-indicator')),
    icon: icon ? await resolveColor(page, name('icon')) : null,
    label: await resolveColor(page, name('label')),
    trailing: trailing ? await resolveColor(page, name('trailing-text')) : null,
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const r of document.querySelectorAll<any>('tanrei-navigation-drawer')) {
      for (const type of ['change', 'reselect', 'close', 'expandedchange', 'toggle']) {
        r.addEventListener(type, (e: any) => {
          if (type === 'toggle') log.push(`toggle:${e.target.label}:${e.detail.open}:${e.target.open}`);
          else if (type === 'expandedchange') log.push(`expandedchange:${e.detail.expanded}:${r.expanded}:${r.open}`);
          else log.push(`${type}${e.detail ? `:${e.detail.value}:${r.value}` : `:${r.open}`}`);
        });
      }
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/**
 * A fast drag toward the start edge, released while still moving (NVD-20's fling): dispatched in the page, each event
 * stamped 8 ms after the one before — the time the finger was there, as a touchscreen stamps it. The drawer measures a
 * release's velocity on those stamps, so a fling is a fling however late the test's commands reach a loaded browser.
 */
const fling = (page: P, id: string, from: { x: number; y: number }, moves: number[]) =>
  page.evaluate(
    async ([id, x, y, moves]) => {
      const drawer = document.querySelector(`[data-fixture="${id}"] tanrei-navigation-drawer`)!;
      const target = drawer.shadowRoot!.elementFromPoint(x, y)!;
      let stamp = performance.now();
      const at = (type: string, xx: number) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: xx, clientY: y });
        Object.defineProperty(event, 'timeStamp', { value: stamp });
        return event;
      };
      target.dispatchEvent(at('pointerdown', x));
      for (const xx of moves) {
        await new Promise((resolve) => setTimeout(resolve, 8));
        stamp += 8;
        target.dispatchEvent(at('pointermove', xx));
      }
      target.dispatchEvent(at('pointerup', moves.at(-1)!));
    },
    [id, from.x, from.y, moves] as const,
  );
/** What has focus: a destination by its value, a group by its label, a header button by its label, anything else by its id or tag. */
const activeValue = (page: P) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active?.localName === 'tanrei-navigation-drawer-item') return active.getAttribute('value');
    if (active?.localName === 'tanrei-navigation-drawer-group') return `group:${(active as any).label}`;
    if (active?.getAttribute('slot') === 'header-button') return `header-button:${active.getAttribute('label')}`;
    let deep: Element | null | undefined = active;
    while (deep?.shadowRoot?.activeElement) deep = deep.shadowRoot.activeElement;
    return deep?.id || deep?.localName || null;
  });

test.describe('activation and selection', () => {
  test('NVD-1: a pointer, Enter, Space or click() emits change once with the value (the drawer already holds a button’s), and reselect on the selected destination; a link takes Enter and not Space, and is not selected by it', async ({ page }) => {
    await mount(page, [fixture('r', MAIL)]);
    await wire(page);
    await cell(page, 'r', 1).click();
    await cell(page, 'r', 1).click();
    await tabTo(page, cell(page, 'r', 2));
    await page.keyboard.press('Enter');
    await tabTo(page, cell(page, 'r', 3));
    await page.keyboard.press('Space');
    await item(page, 'r', 0).evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['change:sent:sent', 'reselect:sent:sent', 'change:drafts:drafts', 'change:trash:trash', 'change:inbox:inbox']);
    // Collapsed, the same.
    await mount(page, [rail('c', MAIL)]);
    await wire(page);
    await cell(page, 'c', 2).click();
    expect(await log(page)).toEqual(['change:drafts:drafts']);
    // A link: Enter activates it, Space does not. The drawer says so and follows the link; it does not select it
    // (NVD-60): its value is still the page's, until the page says otherwise.
    await mount(page, [fixture('l', MAIL.map((x) => ({ ...x, props: { ...x.props, href: `#${x.props.value}` } })))]);
    await wire(page);
    // A press on the page first: Safari on macOS starts Tab nowhere in a document nothing was pressed in.
    await page.mouse.click(700, 5);
    await tabTo(page, cell(page, 'l', 1));
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual([]);
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['change:sent:inbox']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#sent');
    await expect(cell(page, 'l', 0)).toHaveAttribute('aria-current', 'page');
    // The page shown next says where the product is; the same link is then the selected one.
    await setProps(page, 'l', { value: 'sent' });
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['change:sent:inbox', 'reselect:sent:sent']);
  });

  test('NVD-2: a disabled destination emits nothing, is not focusable and is exposed as disabled', async ({ page }) => {
    await mount(page, only('standard-disabled', 'collapsed-disabled'));
    await wire(page);
    await cell(page, 'standard-disabled', 2).dispatchEvent('click');
    await item(page, 'standard-disabled', 2).evaluate((el: HTMLElement) => el.click());
    await item(page, 'collapsed-disabled', 2).evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual([]);
    await expect(drawer(page, 'standard-disabled').getByRole('button', { name: 'Drafts' })).toBeDisabled();
    await expect(drawer(page, 'collapsed-disabled').getByRole('button', { name: 'Starred' })).toBeDisabled();
    await tabTo(page, cell(page, 'standard-disabled', 1));
    await tab(page);
    expect(await activeValue(page)).toBe('trash');
  });

  test('NVD-3: the selected destination — in a section, a group or neither — is drawn from the selected parts, every other from the unselected; collapsed, from collapsed-selected and collapsed-unselected; a value naming none draws none selected and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...only('standard', 'standard-no-icons', 'groups', 'collapsed'), fixture('unknown', MAIL, { value: 'nowhere' })], { reducedMotion: true });
    await page.mouse.move(700, 10);
    await expect.poll(() => drawn(item(page, 'standard', 0))).toEqual(await expected(page, 'selected', '', { trailing: true }));
    expect(await drawn(item(page, 'standard', 1))).toEqual(await expected(page, 'unselected'));
    expect(await drawn(item(page, 'standard', 5))).toEqual(await expected(page, 'unselected', '', { trailing: true }));
    expect(await drawn(item(page, 'standard-no-icons', 1))).toEqual(await expected(page, 'selected', '', { icon: false, trailing: true }));
    // In an open group: the destination itself.
    expect(await drawn(item(page, 'groups', 2))).toEqual(await expected(page, 'selected', '', { icon: false }));
    // Collapsed: the collapsed conditions (the trailing text is there, and not drawn: NVD-32).
    const collapsed = { ...(await expected(page, 'collapsed-selected')), trailing: await resolveColor(page, T('collapsed-selected-item-trailing-text-color')) };
    expect(await drawn(item(page, 'collapsed', 0))).toEqual(collapsed);
    expect(await drawn(item(page, 'collapsed', 1))).toEqual(await expected(page, 'collapsed-unselected'));
    for (const n of [0, 1, 2, 3]) expect((await drawn(item(page, 'unknown', n))).container).toBe(await resolveColor(page, T('unselected-item-container-color')));
    await expect.poll(() => seen.filter((w) => w.includes('NVD-3)')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/value "nowhere" names no destination; none is drawn selected \(NVD-3\)/);
  });

  test('NVD-29: two destinations with one value — the first in reading order is selected, and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('r', [section('A', [d('x', 'First', 'inbox')]), section('B', [d('x', 'Second', 'send')])], { value: 'x' })]);
    await expect(cell(page, 'r', 0)).toHaveAttribute('aria-current', 'page');
    await expect(cell(page, 'r', 1)).not.toHaveAttribute('aria-current');
    await expect.poll(() => seen.filter((w) => w.includes('NVD-29')).length).toBe(1);
  });

  test('NVD-24: an empty destination label still renders and is reported; so is a modal drawer without a label', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('r', [d('a', 'A', 'inbox'), d('blank', '', 'send')], { value: 'a' })]);
    await expect(cell(page, 'r', 1)).toBeVisible();
    await mount(page, [fixture('m', [d('a', 'A', 'inbox')], { variant: 'modal', label: '', value: 'a' })]);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-24')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/a destination \(value "blank"\) has an empty label/);
    expect(seen.join('\n')).toMatch(/label is empty, so the modal drawer is a dialog without a name/);
  });
});

test.describe('states, press and focus', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });

  test('NVD-4: each state draws the cell from that state’s tokens of its condition, in both forms and on a group’s row; pointer focus is not the focused state', async ({ page, browserName }) => {
    for (const [f, n, condition] of [
      [fixture('r', MAIL.slice(1)), 1, 'unselected'],
      [fixture('r', MAIL.slice(1), { value: 'drafts' }), 1, 'selected'],
      [rail('r', MAIL.slice(1)), 0, 'collapsed-unselected'],
      [rail('r', MAIL.slice(1), { value: 'sent' }), 0, 'collapsed-selected'],
    ] as const) {
      await mount(page, [f]);
      await page.mouse.move(700, 10);
      await expect.poll(() => drawn(item(page, 'r', n)), condition).toEqual(await expected(page, condition));
      await cell(page, 'r', n).hover();
      await expect.poll(() => drawn(item(page, 'r', n)), `${condition} hovered`).toEqual(await expected(page, condition, 'hovered'));
      await page.mouse.down();
      await expect.poll(() => drawn(item(page, 'r', n)), `${condition} pressed`).toEqual(await expected(page, condition, 'pressed'));
      await page.mouse.up();
      await page.mouse.move(700, 10);
      if (browserName !== 'webkit') await expect(cell(page, 'r', n)).toBeFocused();
      const now = condition.startsWith('collapsed') ? 'collapsed-selected' : 'selected';
      await expect.poll(() => drawn(item(page, 'r', n)), `${condition} pointer focus`).toEqual(await expected(page, now));
      await mount(page, [f]);
      await page.mouse.click(700, 10);
      await tabTo(page, cell(page, 'r', n));
      await expect.poll(() => drawn(item(page, 'r', n)), `${condition} focused`).toEqual(await expected(page, condition, 'focused'));
    }
    // A group's row, from the unselected condition.
    await mount(page, [fixture('g', [d('home', 'Home', 'home'), grp('Projects', [d('a', 'A')], { icon: 'folder' })], { value: 'home' })]);
    await page.mouse.move(700, 10);
    await groupRow(page, 'g', 0).hover();
    await expect.poll(() => drawn(group(page, 'g', 0))).toEqual(await expected(page, 'unselected', 'hovered'));
    // Under acme the three states differ: pressed beats focused beats hovered.
    await mount(page, [fixture('r', MAIL)], { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(item(page, 'r', 0).locator('.indicator'), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`selected-${s}item-container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(700, 10);
    await expect.poll(bg).toBe(rest);
    await cell(page, 'r', 0).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, cell(page, 'r', 0));
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('NVD-5: keyboard focus shows the ring around the item container, without animation, in both forms; pointer focus does not', async ({ page }) => {
    await mount(page, [fixture('r', MAIL), rail('c', MAIL)]);
    const [outer, offset, inner] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width'].map((n) => resolveToken(page, n)));
    const container = (id: string, n: number) => item(page, id, n).locator('.container');
    await cell(page, 'r', 1).click();
    await expect(container('r', 1)).toHaveCSS('outline-style', 'none');
    for (const id of ['r', 'c']) {
      await tabTo(page, cell(page, id, 2));
      await expect(container(id, 2)).toHaveCSS('outline-style', 'solid');
      await expect(container(id, 2)).toHaveCSS('outline-width', `${outer}px`);
      await expect(container(id, 2)).toHaveCSS('outline-offset', `${offset + inner}px`);
      expect(await css(container(id, 2), 'transition-property')).not.toContain('outline');
    }
  });

  test('NVD-6: the hit area is the whole cell — the drawer’s width, with half of container.gap above and below, never below the minimum target — in both forms, without changing the drawn cell; hover over any of it answers on the item container', async ({ page }) => {
    await mount(page, [fixture('r', MAIL), rail('c', MAIL)], { reducedMotion: true });
    const [gap, pointer] = await Promise.all([T('container-gap-regular'), '--tanrei-sys-target-pointer'].map((n) => px(page, n)));
    for (const id of ['r', 'c']) {
      await drawer(page, id).scrollIntoViewIfNeeded();
      const box = await bounds(cell(page, id, 1));
      const p = await bounds(panel(page, id));
      expect([box.x, box.width], id).toEqual([p.x, p.width]);
      const hit = await cell(page, id, 1).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
      expect(hit, id).toBeCloseTo(Math.max(box.height + gap, pointer), 1);
      const at = (x: number, y: number) => page.evaluate(([xx, yy]) => document.elementFromPoint(xx, yy)?.closest('tanrei-navigation-drawer-item')?.getAttribute('value') ?? null, [x, y]);
      expect(await at(box.x + 2, box.y + 2), id).toBe('sent');
      expect(await at(box.x + box.width - 2, box.y + box.height - 2), id).toBe('sent');
      expect(await at(box.x + 2, box.y + box.height + 2), id).toBe('drafts');
      await page.mouse.move(box.x + box.width - 3, box.y + 2);
      await expect.poll(() => css(item(page, id, 1).locator('.indicator'), 'background-color'), id).toBe(await resolveColor(page, T(`${id === 'c' ? 'collapsed-' : ''}unselected-hovered-item-container-color`)));
    }
    // A system whose cells and gap give less still reaches the target.
    await override(page, { [T('item-container-height-regular')]: '20px', [T('container-gap-regular')]: '0px' });
    expect(await cell(page, 'r', 1).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBe(pointer);
    expect((await bounds(cell(page, 'r', 1))).height).toBeLessThan(pointer);
  });

  test('NVD-7: a disabled cell is drawn from the disabled tokens of its condition, its trailing content kept', async ({ page }) => {
    await mount(page, [
      fixture('r', [d('inbox', 'Inbox', 'inbox', { disabled: true, trailingText: '3' }), d('sent', 'Sent', 'send', { disabled: true, trailingText: 'New' })]),
      rail('c', [d('inbox', 'Inbox', 'inbox', { disabled: true }), d('sent', 'Sent', 'send', { disabled: true })]),
    ]);
    await page.mouse.move(700, 10);
    await expect.poll(() => drawn(item(page, 'r', 0))).toEqual(await expected(page, 'selected', 'disabled', { trailing: true }));
    await expect.poll(() => drawn(item(page, 'r', 1))).toEqual(await expected(page, 'unselected', 'disabled', { trailing: true }));
    await expect(item(page, 'r', 1).locator('.trailing-text')).toBeVisible();
    await expect.poll(() => drawn(item(page, 'c', 0))).toEqual(await expected(page, 'collapsed-selected', 'disabled'));
    await expect.poll(() => drawn(item(page, 'c', 1))).toEqual(await expected(page, 'collapsed-unselected', 'disabled'));
  });

  test('NVD-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = 1000;
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => cell(page, 'r', 1).click()],
    ] as const) {
      await mount(page, [fixture('r', MAIL)]);
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await cell(page, 'r', 1).evaluate((el: HTMLElement) => el.focus());
      await item(page, 'r', 1)
        .locator('.container')
        .evaluate((el) => {
          const l: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
          new MutationObserver(() => {
            if (el.hasAttribute('data-pressed')) l.on ??= performance.now();
            else if (l.on !== undefined) l.off ??= performance.now();
          }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
          for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (l.up ??= performance.now()), true);
          for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (l.down ??= performance.now()), true);
        });
      await activate();
      await expect.poll(() => page.evaluate(() => (window as any).press.off), name).toBeDefined();
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('NVD-8: a destination and a group pressed by Space stay pressed while the key is down, though the pointer resting over them leaves; the keyup ends the press', async ({ page }) => {
    await mount(page, [fixture('g', [...MAIL, grp('Folders', [d('work', 'Work'), d('home', 'Home')])])]);
    await expectKeyPressOutlastsPointer(page, { control: cell(page, 'g', 1) });
    await expectKeyPressOutlastsPointer(page, { control: groupRow(page, 'g', 0) });
  });

  test('NVD-9: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mount(page, [fixture('r', MAIL)], system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('unselected-pressed-item-label-color')]: 'rgb(0, 0, 255)' });
      const c = cell(page, 'r', 1);
      const fill = item(page, 'r', 1).locator('.indicator');
      await c.hover();
      await expect.poll(() => css(fill, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
      const hovered = await css(fill, 'background-color');
      await page.mouse.down();
      const container = item(page, 'r', 1).locator('.container');
      const result = {
        pressed: await container.getAttribute('data-pressed'),
        bg: await css(fill, 'background-color'),
        hovered,
        label: await css(item(page, 'r', 1).locator('.label'), 'color'),
        ripple: await container.locator('.ripple').count(),
        opacity: await css(c, 'opacity'),
      };
      await page.mouse.move(700, 10);
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
    await mount(page, [fixture('r', MAIL)], { system: 'm3-like' });
    await page.mouse.click(700, 10);
    await tabTo(page, cell(page, 'r', 1));
    await page.keyboard.down('Enter');
    const layer = await item(page, 'r', 1)
      .locator('.ripple')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
  });

  test('NVD-10 corner smoothing and focus-style: cupertino eases the item containers’ and the modal drawer’s end corners; acme shows focus as a glow', async ({ page }) => {
    await mount(page, [fixture('r', MAIL), fixture('m', MAIL, { variant: 'modal' })], { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const c = item(page, 'r', 0).locator('.container');
    const radius = await px(page, T('item-container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      if (radius > 0) {
        expect(Number.parseFloat((await css(c, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
        expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBeCloseTo(radius * 1.24, 1);
      }
      const p = panel(page, 'm');
      expect(Number.parseFloat((await css(p, 'corner-top-right-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(p, 'border-top-right-radius'))).toBeCloseTo((await px(page, T('container-shape-modal'))) * 1.24, 1);
    } else expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBe(radius);

    await mount(page, [fixture('r', MAIL)], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await px(page, '--tanrei-sys-focus-outer-width');
    await page.mouse.click(700, 10);
    await tabTo(page, cell(page, 'r', 1));
    const container = item(page, 'r', 1).locator('.container');
    expect(await css(container, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(container, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    await expect(cell(page, 'r', 1)).toHaveAttribute('data-focus-style', 'glow');
  });
});

test.describe('drawing', () => {
  test('NVD-11: container.width expanded and collapsed.container.width collapsed, beside the start inset, the parent’s full height, its variant’s color, elevation and end corners (start corners square) and end edge; mirrored in right-to-left', async ({ page }) => {
    await mount(page, [fixture('s', MAIL), fixture('m', MAIL, { variant: 'modal' }), rail('c', MAIL)], { reducedMotion: true });
    const [width, column, edge] = await Promise.all([T('container-width'), T('collapsed-container-width-regular'), T('outline-width')].map((n) => px(page, n)));
    for (const [id, variant, w] of [
      ['s', 'standard', width],
      ['m', 'modal', width],
      ['c', 'standard', column],
    ] as const) {
      const p = panel(page, id);
      const box = await bounds(p);
      expect(box.width, id).toBeCloseTo(w, 2);
      expect(await css(p, 'background-color'), id).toBe(await resolveColor(page, T(`container-color-${variant}`)));
      expect(await css(p, 'box-shadow'), id).toBe(await shadowOf(page, T(`container-elevation-${variant}`)));
      const shape = await px(page, T(`container-shape-${variant}`));
      expect([await css(p, 'border-top-left-radius'), await css(p, 'border-bottom-left-radius')], id).toEqual(['0px', '0px']);
      expect(Number.parseFloat(await css(p, 'border-top-right-radius')), id).toBeCloseTo(shape, 1);
      const line = drawer(page, id).locator('.edge');
      expect(await css(line, 'background-color'), id).toBe(await resolveColor(page, T(`outline-color-${variant}`)));
      const l = await bounds(line);
      expect(l.x + l.width, id).toBeCloseTo(box.x + box.width, 2);
      expect(l.width, id).toBeCloseTo(edge, 2);
    }
    const [stage, s] = [await bounds(page.locator('[data-fixture="s"]')), await bounds(panel(page, 's'))];
    expect([s.x, s.y, s.height]).toEqual([stage.x, stage.y, stage.height]);
    const m = await bounds(panel(page, 'm'));
    expect([m.x, m.y, m.height]).toEqual([0, 0, page.viewportSize()!.height]);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await expect.poll(async () => (await bounds(panel(page, 'm'))).x).toBe(page.viewportSize()!.width - width);
    expect(await css(panel(page, 'm'), 'border-top-right-radius')).toBe('0px');
    expect(Number.parseFloat(await css(panel(page, 'm'), 'border-top-left-radius'))).toBeGreaterThan(0);
  });

  test('NVD-12: the header and then, header.gap below, the items; padding-block measured to the first cell; container.gap between cells; the items scroll and the header stays', async ({ page }) => {
    await mount(page, [fixture('r', [MENU, ...MAIL, ...Array.from({ length: 12 }, (_, i) => d(`x${i}`, `More ${i}`, 'label'))], { collapsible: true }), fixture('bare', MAIL)], { reducedMotion: true });
    const [pb, gap, headerGap] = await Promise.all([T('container-padding-block'), T('container-gap-regular'), T('header-gap')].map((n) => px(page, n)));
    const p = await bounds(panel(page, 'r'));
    const button = await bounds(menu(page, 'r'));
    expect(button.y - p.y).toBeCloseTo(pb, 0);
    const [first, second] = [await bounds(cell(page, 'r', 0)), await bounds(cell(page, 'r', 1))];
    expect(first.y - (button.y + button.height)).toBeCloseTo(headerGap, 0);
    expect(second.y - (first.y + first.height)).toBeCloseTo(gap, 0);
    // Without a header: padding-block above the first cell.
    expect((await bounds(cell(page, 'bare', 0))).y - (await bounds(panel(page, 'bare'))).y).toBeCloseTo(pb, 0);
    const content = drawer(page, 'r').locator('.items');
    expect(await content.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await content.evaluate((el) => (el.scrollTop = 100));
    expect((await bounds(menu(page, 'r'))).y).toBeCloseTo(button.y, 0);
    expect((await bounds(cell(page, 'r', 0))).y).toBeCloseTo(first.y - 100, 0);
  });

  test('NVD-13: an expanded row across the inner width, at least item.container.height, its corners; the icon on the icon column, the wrapping label item.gap after it, the trailing content item.padding-inline from its end; mirrored in right-to-left', async ({ page }) => {
    await mount(page, [fixture('r', [d('inbox', 'Inbox', 'inbox', { trailingText: '24' }), d('long', 'A destination with a name long enough to wrap onto a second line', 'label', { trailingText: 'New' }), d('plain', 'Plain')], { labelWrap: true })]);
    const [height, radius, ipi, gap, column, pi] = await Promise.all([T('item-container-height-regular'), T('item-container-shape'), T('item-padding-inline-regular'), T('item-gap'), T('collapsed-container-width-regular'), T('container-padding-inline')].map((n) => px(page, n)));
    const p = await bounds(panel(page, 'r'));
    const [row, icon, label, trailing] = await Promise.all(['.container', '.icon', '.label', '.trailing-text'].map((s) => bounds(item(page, 'r', 0).locator(s))));
    expect(row.height).toBe(height);
    expect(row.x - p.x).toBeCloseTo(pi, 1);
    expect(p.x + p.width - (row.x + row.width)).toBeCloseTo(pi, 1);
    expect(Number.parseFloat(await css(item(page, 'r', 0).locator('.container'), 'border-top-left-radius'))).toBeCloseTo(radius, 1);
    expect(centre(icon).x - p.x).toBeCloseTo(column / 2, 1);
    expect(centre(icon).y).toBeCloseTo(centre(row).y, 0);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(gap, 1);
    expect(row.x + row.width - (trailing.x + trailing.width)).toBeCloseTo(ipi, 1);
    expect(trailing.x - (label.x + label.width)).toBeGreaterThanOrEqual(gap - 0.5);
    // Without an icon, among rows that have one, the icon's room is kept (iconSpace auto): the labels stand in one column.
    expect((await bounds(item(page, 'r', 2).locator('.label'))).x).toBeCloseTo(label.x, 1);
    // labelWrap: wrapping, not truncating, the row grows.
    expect((await bounds(item(page, 'r', 1).locator('.container'))).height).toBeGreaterThan(height);
    expect(await item(page, 'r', 1).locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [rp, ri, rt, rr] = [await bounds(panel(page, 'r')), await bounds(item(page, 'r', 0).locator('.icon')), await bounds(item(page, 'r', 0).locator('.trailing-text')), await bounds(item(page, 'r', 0).locator('.container'))];
    expect(rp.x + rp.width - centre(ri).x).toBeCloseTo(column / 2, 1);
    expect(rt.x - rr.x).toBeCloseTo(ipi, 1);
  });

  test('NVD-13, NVD-69, NVD-70: a nested row’s content begins one step of indent further per level — in auto, what its group’s row draws before its label, so its icon stands where its group’s label begins — and its item container begins there under highlight indented, or at the drawer’s padding under full', async ({ page }) => {
    const end = (id: string, props: Fixture['props'] = {}) => ({ ...spec.fixtures.find((f) => f.id === id)!, id: `${id}-${props.highlight ?? 'indented'}`, props: { ...spec.fixtures.find((f) => f.id === id)!.props, chevron: 'end', ...props } });
    await mount(page, [end('groups-nested', { highlight: 'full' }), end('groups-nested'), end('nested-icons')], { reducedMotion: true });
    const [pi, ipi, column] = await Promise.all([T('container-padding-inline'), T('item-padding-inline-regular'), T('collapsed-container-width-regular')].map((n) => px(page, n)));
    // The verify, under the default system.
    expect([pi, ipi, column]).toEqual([12, 12, 72]);
    const full = 'groups-nested-full';
    const p = await bounds(panel(page, full));
    const startOf = async (locator: Locator) => (await bounds(locator)).x - p.x;
    // groups-nested: Foundations (group, an icon) › Color, Design tokens (group, no icon) › Overview, Tiers.
    const top = await bounds(group(page, full, 0).locator('.row > .container').first());
    expect(top.x - p.x).toBe(12);
    expect(top.height).toBe(48);
    // The top-level icon has 12 on its start side inside its item container, as above and below it.
    const topIcon = await bounds(group(page, full, 0).locator('.icon').first());
    expect([topIcon.x - top.x, topIcon.y - top.y, top.y + top.height - (topIcon.y + topIcon.height)]).toEqual([12, 12, 12]);
    expect(topIcon.x + topIcon.width / 2 - p.x).toBe(36);
    // One level deep (auto): one icon and gap further, so the label is under its group's label, 60.
    expect(await startOf(item(page, full, 0).locator('.label'))).toBe(60);
    expect(await startOf(group(page, full, 0).locator('.label').first())).toBe(60);
    // Two levels deep: Design tokens draws nothing before its label, so its items step by the level's indent (36).
    expect(await startOf(item(page, full, 1).locator('.label'))).toBe(96);
    // highlight full: every item container begins at the drawer's padding and ends at its end padding.
    for (const n of [0, 1]) {
      const c = await bounds(box(page, full, n));
      expect([c.x - p.x, p.x + p.width - (c.x + c.width)], `${n}`).toEqual([12, 12]);
    }
    const nested = item(page, full, 0);
    await nested.locator('.cell').hover();
    await expect.poll(() => css(nested.locator('.row > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
    const fill = await bounds(nested.locator('.row > .container > .indicator'));
    expect([fill.x, fill.width]).toEqual([top.x, top.width]);
    // highlight indented (the default): the nested item container begins where its content's level begins, its fill too.
    const ind = 'groups-nested-indented';
    const q = await bounds(panel(page, ind));
    const c = await bounds(box(page, ind, 0));
    expect(c.x - q.x).toBe(48);
    expect(q.x + q.width - (c.x + c.width)).toBe(12);
    const inner = item(page, ind, 0);
    await inner.locator('.cell').hover();
    await expect.poll(() => css(inner.locator('.row > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
    expect((await bounds(inner.locator('.row > .container > .indicator'))).x).toBe(c.x);
    await page.mouse.click(700, 5);
    await tabTo(page, inner.locator('.cell'));
    await expect(box(page, ind, 0)).toHaveCSS('outline-style', 'solid');
    // nested-icons: a nested icon is centred 72 from the start edge, starting at 60 where its group's label starts; its
    // trailing text item.padding-inline and an end chevron's room from the end.
    const n = 'nested-icons-indented';
    const r = await bounds(panel(page, n));
    const icon = await bounds(item(page, n, 2).locator('.icon'));
    const groupLabel = await bounds(group(page, n, 0).locator('.label').first());
    expect(icon.x + icon.width / 2 - r.x).toBe(72);
    expect(icon.x).toBe(groupLabel.x);
    const [row, trailing] = [await bounds(box(page, n, 2)), await bounds(item(page, n, 2).locator('.trailing-text'))];
    expect(row.x - r.x).toBe(48);
    const chevron = await px(page, T('item-trailing-icon-size-regular'));
    const gap = await px(page, T('item-gap'));
    expect(row.x + row.width - (trailing.x + trailing.width)).toBeCloseTo(ipi + chevron + gap, 1);
    // Mirrored in right-to-left.
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [rp, rc] = [await bounds(panel(page, full)), await bounds(box(page, full, 0))];
    expect(rp.x + rp.width - (rc.x + rc.width)).toBe(12);
    expect(rc.x - rp.x).toBe(12);
    const label = await bounds(item(page, full, 0).locator('.label'));
    expect(rp.x + rp.width - (label.x + label.width)).toBe(60);
  });

  test('NVD-6: a nested destination’s hit area is the drawer’s full width, however deep it is nested, and a press outside the item container answers on it', async ({ page }) => {
    await mount(page, only('groups-nested'), { reducedMotion: true });
    const p = await bounds(panel(page, 'groups-nested'));
    const [hit, c] = [await bounds(cell(page, 'groups-nested', 1)), await bounds(box(page, 'groups-nested', 1))];
    expect(hit.x).toBeCloseTo(p.x, 0);
    expect(hit.width).toBeGreaterThan(c.width);
    // Before the item container's start, at the drawer's start edge: the destination's.
    const at = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-navigation-drawer-item')?.getAttribute('value') ?? null, [p.x + 2, c.y + c.height / 2]);
    expect(at).toBe(await item(page, 'groups-nested', 1).getAttribute('value'));
    await page.mouse.move(p.x + 2, c.y + c.height / 2);
    await expect.poll(() => css(item(page, 'groups-nested', 1).locator('.row > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-item-container-color')));
  });

  test('NVD-14: each icon at item.icon.size, in the family and fill of its condition, sys.icon.weight', async ({ page }) => {
    await mount(page, [fixture('r', MAIL)]);
    const sys = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
    const unquote = (family: string) => family.replace(/["']/g, '');
    const size = await px(page, T('item-icon-size-regular'));
    for (const [n, condition] of [
      [0, 'selected'],
      [1, 'unselected'],
    ] as const) {
      const g = await item(page, 'r', n)
        .locator('.icon')
        .evaluate((el) => ({ size: Number.parseFloat(getComputedStyle(el).fontSize), family: getComputedStyle(el).fontFamily, settings: getComputedStyle(el).fontVariationSettings }));
      expect(g.size).toBe(size);
      expect(unquote(g.family)).toBe(unquote(await sys(`--tanrei-sys-icon-family-${condition}`)));
      expect(g.settings).toContain(`"FILL" ${Number(await sys(`--tanrei-sys-icon-fill-${condition}`))}`);
      expect(g.settings).toContain(`"wght" ${Number(await sys('--tanrei-sys-icon-weight'))}`);
    }
  });

  test('NVD-15: trailing content is part of the destination’s description, after its name, state and badge, not an element of its own, and stays while disabled', async ({ page }) => {
    await mount(page, [
      fixture('r', [
        d('inbox', 'Inbox', 'inbox', { trailingText: '24' }),
        d('work', 'Work', 'label', { trailingText: 'New', disabled: true }),
        d('plain', 'Plain', 'label'),
        d('chat', 'Chat', 'chat', { badge: true, badgeLabel: 'New messages', trailingText: '3' }),
      ]),
    ]);
    await expect(cell(page, 'r', 0)).toHaveAccessibleDescription('24');
    await expect(cell(page, 'r', 0)).toHaveAccessibleName('Inbox');
    await expect(cell(page, 'r', 1)).toHaveAccessibleDescription('New');
    await expect(item(page, 'r', 1).locator('.trailing-text')).toBeVisible();
    await expect(cell(page, 'r', 2)).not.toHaveAttribute('aria-description');
    await expect(cell(page, 'r', 3)).toHaveAttribute('aria-description', 'New messages, 3');
    await expect(item(page, 'r', 0).locator('.trailing')).toHaveAttribute('aria-hidden', 'true');
  });

  test('NVD-16: a section heading in heading.typescale and heading.color, at least heading.height, centred, starting where labels without an icon start; a heading, not focusable; collapsed, its row keeps its height, draws no text and is hidden; empty draws none', async ({ page }) => {
    await mount(page, [fixture('r', [section('Mail', MAIL.slice(0, 2)), section('', [d('x', 'X', 'label')])]), rail('c', [section('Mail', MAIL.slice(0, 2))])], { reducedMotion: true });
    const [height, pi, ipi] = await Promise.all([T('heading-height-regular'), T('container-padding-inline'), T('item-padding-inline-regular')].map((n) => px(page, n)));
    const heading = drawer(page, 'r').locator('tanrei-navigation-drawer-section').first().locator('.heading');
    const h = await bounds(heading);
    expect(h.height).toBeGreaterThanOrEqual(height);
    const text = await heading.locator('.heading-text').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, height: r.height };
    });
    const p = await bounds(panel(page, 'r'));
    expect(text.x - p.x).toBeCloseTo(pi + ipi, 0);
    expect(Math.abs(text.y + text.height / 2 - (h.y + h.height / 2))).toBeLessThanOrEqual(1);
    expect(await css(heading.locator('.heading-text'), 'color')).toBe(await resolveColor(page, T('heading-color')));
    await expect(drawer(page, 'r').getByRole('heading', { name: 'Mail', level: 2 })).toHaveCount(1);
    expect(await heading.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    await expect(drawer(page, 'r').locator('tanrei-navigation-drawer-section').nth(1).locator('.heading')).toHaveCount(0);
    // Collapsed: the row is kept, the text is not drawn and not exposed.
    const collapsed = drawer(page, 'c').locator('tanrei-navigation-drawer-section .heading');
    expect((await bounds(collapsed)).height).toBeCloseTo(h.height, 0);
    await expect(collapsed.locator('.heading-text')).toHaveCSS('opacity', '0');
    await expect(collapsed).toHaveAttribute('aria-hidden', 'true');
  });

  test('NVD-17: a section with divider draws the divider component before it, across the inner width in either form; a section in a section, or in a group, draws its items in its place, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(
      page,
      [
        ...only('standard'),
        rail('c', [section('A', MAIL.slice(0, 2)), section('B', MAIL.slice(2), { divider: true })]),
        fixture('nested', [section('Outer', [d('a', 'A', 'inbox'), section('Inner', [d('b', 'B', 'send')], { divider: true })]), grp('G', [section('In a group', [d('c', 'C')])], { icon: 'folder', open: true })], { value: 'a' }),
      ],
      { reducedMotion: true },
    );
    const pi = await px(page, T('container-padding-inline'));
    for (const id of ['standard', 'c']) {
      const sections = drawer(page, id).locator('tanrei-navigation-drawer-section');
      await expect(sections.nth(0).locator('tanrei-divider')).toHaveCount(0);
      const divider = sections.nth(1).locator('tanrei-divider');
      await expect(divider).toHaveCount(1);
      const [line, p, heading] = [await bounds(divider), await bounds(panel(page, id)), await bounds(sections.nth(1).locator('.heading'))];
      expect(line.x - p.x, id).toBeCloseTo(pi, 1);
      expect(line.width, id).toBeCloseTo(p.width - 2 * pi, 1);
      expect(line.y).toBeLessThan(heading.y);
    }
    await expect(cell(page, 'nested', 1)).toBeVisible();
    await expect(cell(page, 'nested', 2)).toBeVisible();
    const inner = drawer(page, 'nested').locator('tanrei-navigation-drawer-section tanrei-navigation-drawer-section');
    await expect(inner.locator('.heading')).toHaveCount(0);
    await expect(inner.locator('tanrei-divider')).toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-17')).length).toBe(2);
  });

  test('NVD-25: the color reaches under the start, top and bottom insets; the header, destinations and sections stay inside them (env(safe-area-inset-*))', async ({ page }) => {
    await mount(page, [fixture('r', MAIL)], { reducedMotion: true });
    const sheet = await drawer(page, 'r').evaluate((el) => (el.constructor as any).styles.cssText as string);
    for (const side of ['top', 'bottom', 'left', 'right']) expect(sheet).toContain(`env(safe-area-inset-${side}, 0px)`);
    const width = await px(page, T('container-width'));
    const before = await bounds(item(page, 'r', 0).locator('.container'));
    await drawer(page, 'r').evaluate((el) => el.setAttribute('style', '--_inset-top: 24px; --_inset-bottom: 20px; --_inset-start: 30px'));
    const p = await bounds(panel(page, 'r'));
    expect(p.width).toBe(width + 30);
    const after = await bounds(item(page, 'r', 0).locator('.container'));
    expect([after.x - before.x, after.y - before.y, after.width]).toEqual([30, 24, before.width]);
    const content = await bounds(drawer(page, 'r').locator('.items'));
    expect(p.y + p.height - (content.y + content.height)).toBe(20);
  });

  test('NVD-26: a variant the system does not have renders with standard’s tokens and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('odd', MAIL, { variant: 'floating' }), fixture('s', MAIL)]);
    for (const property of ['background-color', 'box-shadow', 'border-top-right-radius']) expect(await css(panel(page, 'odd'), property), property).toBe(await css(panel(page, 's'), property));
    await expect(drawer(page, 'odd').locator('dialog')).toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-26')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/variant "floating" is not a value of the active design system; it is drawn as "standard"/);
  });

  test('NVD-27: enlarged text keeps both widths, grows each cell and heading alike in both forms, keeps short labels on one line, and does not scale icons, icon indicators or trailing glyphs', async ({ page }) => {
    await mount(page, [...only('standard', 'trailing'), fixture('e', [MENU, section('Mail', MAIL)], { collapsible: true }), rail('c', [section('Mail', MAIL)])], { reducedMotion: true });
    const measure = async () => ({
      panel: (await bounds(panel(page, 'standard'))).width,
      column: (await bounds(panel(page, 'c'))).width,
      row: (await bounds(cell(page, 'standard', 0))).height,
      expanded: (await bounds(cell(page, 'e', 0))).height,
      collapsed: (await bounds(cell(page, 'c', 0))).height,
      heading: (await bounds(drawer(page, 'standard').locator('.heading').first())).height,
      icon: (await bounds(item(page, 'standard', 0).locator('.icon'))).width,
      indicator: (await bounds(item(page, 'c', 0).locator('.icon-indicator'))).height,
      glyph: (await bounds(item(page, 'trailing', 3).locator('.trailing-slot'))).width,
    });
    const before = await measure();
    await override(page, { '--tanrei-dial-type-base': '48px' });
    const after = await measure();
    expect([after.panel, after.column]).toEqual([before.panel, before.column]);
    expect(after.row).toBeGreaterThan(before.row);
    expect(after.heading).toBeGreaterThan(before.heading);
    expect(after.collapsed).toBeGreaterThan(before.collapsed);
    expect(after.expanded).toBeCloseTo(after.collapsed, 0);
    expect([after.icon, after.indicator, after.glyph]).toEqual([before.icon, before.indicator, before.glyph]);
    const short = item(page, 'c', 0).locator('.short');
    expect(await css(short, 'white-space')).toBe('nowrap');
    expect(await short.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });

  test('NVD-23: a navigation landmark named by the label; each destination a button (a link with href) named by its label in both forms, the selected one aria-current, its position among the items of its level, its icon hidden; modal, also a dialog named by the label; the selected destination is the current page — exactly one, or none, and no second state', async ({ page }) => {
    await mount(page, only('standard', 'groups', 'collapsed'), { reducedMotion: true });
    await expect(page.locator('[data-fixture="standard"]').getByRole('navigation', { name: /^Mail\b/ })).toHaveCount(1);
    const nav = drawer(page, 'standard');
    await expect(nav.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    for (const n of [0, 5]) {
      await expect(item(page, 'standard', n)).toHaveAttribute('aria-posinset', String(n + 1));
      await expect(item(page, 'standard', n)).toHaveAttribute('aria-setsize', '6');
      await expect(item(page, 'standard', n).locator('.lead')).toHaveAttribute('aria-hidden', 'true');
    }
    // The items of a group are counted among themselves; the group among the top level.
    await expect(group(page, 'groups', 0)).toHaveAttribute('aria-posinset', '2');
    await expect(group(page, 'groups', 0)).toHaveAttribute('aria-setsize', '4');
    await expect(item(page, 'groups', 2)).toHaveAttribute('aria-posinset', '2');
    await expect(item(page, 'groups', 2)).toHaveAttribute('aria-setsize', '3');
    await expect(page.locator('[data-fixture="standard"]')).toMatchAriaSnapshot(`
      - navigation /^Mail/:
        - list:
          - listitem:
            - heading "Mail" [level=2]
            - list:
              - listitem:
                - button "Inbox"
              - listitem:
                - button "Sent"
              - listitem:
                - button "Drafts"
              - listitem:
                - button "Trash"
          - listitem:
            - heading "Labels" [level=2]
            - list:
              - listitem:
                - button "Family"
              - listitem:
                - button "Work"
    `);
    // Collapsed: the same roles, names and state; the short labels are not names.
    await expect(drawer(page, 'collapsed').getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    await expect(drawer(page, 'collapsed').getByRole('button', { name: 'Starred', exact: true })).toHaveCount(1);
    await mount(page, [fixture('m', MAIL.map((x) => ({ ...x, props: { ...x.props, href: `#${x.props.value}` } })), { variant: 'modal' })]);
    const dialog = page.getByRole('dialog', { name: /^Mail\b/ });
    await expect(dialog).toHaveCount(1);
    await expect(dialog.getByRole('navigation', { name: /^Mail\b/ })).toHaveCount(1);
    await expect(drawer(page, 'm').getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    // A site's sidebar: links and disclosure buttons in the landmark; the page's own link is the one current thing,
    // whoever said which it is, and a drawer whose value names no destination exposes none.
    await mount(page, only('site-sidebar'), { reducedMotion: true });
    const site = drawer(page, 'site-sidebar');
    await expect(page.locator('[data-fixture="site-sidebar"]').getByRole('navigation', { name: /^Documentation\b/ })).toHaveCount(1);
    await expect(site.getByRole('link', { name: 'Navigation drawer' })).toHaveAttribute('aria-current', 'page');
    await expect(site.getByRole('link', { name: 'Source code' })).toHaveCount(1);
    await expect(site.getByRole('button', { name: 'Components' })).toHaveAttribute('aria-expanded', 'true');
    await expect(site.locator('[aria-current]')).toHaveCount(1);
    await expect(site.locator('[aria-selected], [aria-pressed]')).toHaveCount(0);
    await setProps(page, 'site-sidebar', { value: '/components/tabs/' });
    await expect(site.locator('[aria-current]')).toHaveCount(1);
    await expect(site.getByRole('link', { name: 'Tabs' })).toHaveAttribute('aria-current', 'page');
    await setProps(page, 'site-sidebar', { value: '/nowhere/' });
    await expect(site.locator('[aria-current]')).toHaveCount(0);
  });
});

test.describe('the collapsed form', () => {
  test('NVD-30: not collapsible, always expanded whatever expanded says; collapsible standard, as expanded says; collapsible modal, collapsed while closed and expanded while open; the collapsed attribute reflects it', async ({ page }) => {
    await mount(page, [fixture('plain', MAIL, { expanded: false }), rail('std', MAIL), rail('mod', MAIL, { variant: 'modal', open: false, expanded: true })], { reducedMotion: true });
    const [width, column] = await Promise.all([T('container-width'), T('collapsed-container-width-regular')].map((n) => px(page, n)));
    await expect(drawer(page, 'plain')).not.toHaveAttribute('collapsed');
    expect((await bounds(panel(page, 'plain'))).width).toBeCloseTo(width, 1);
    await expect(drawer(page, 'std')).toHaveAttribute('collapsed', '');
    await expect(drawer(page, 'std')).toHaveAttribute('expanded', 'false');
    expect((await bounds(panel(page, 'std'))).width).toBeCloseTo(column, 1);
    await setProps(page, 'std', { expanded: true });
    await expect(drawer(page, 'std')).not.toHaveAttribute('collapsed');
    await expect.poll(async () => (await bounds(panel(page, 'std'))).width).toBeCloseTo(width, 1);
    await expect(drawer(page, 'mod')).toHaveAttribute('collapsed', '');
    expect(await drawer(page, 'mod').evaluate((el: any) => el.collapsed)).toBe(true);
    expect((await bounds(drawer(page, 'mod'))).width).toBeCloseTo(column, 1);
    await setProps(page, 'mod', { open: true });
    await expect(drawer(page, 'mod')).not.toHaveAttribute('collapsed');
    await expect.poll(async () => (await bounds(panel(page, 'mod'))).width).toBeCloseTo(width, 1);
  });

  test('NVD-31: every cell, icon, header button and main action glyph is at the same place in both forms; under the default system a cell is 48 high in both with its icon line 24 below its top; collapsedLabels always grows the cells in both forms alike; a heading keeps its row', async ({ page }) => {
    const items = [MAIN, section('Mail', MAIL)];
    await mount(page, [fixture('e', [MENU, ...items], { collapsible: true }), rail('c', items), fixture('ea', [MENU, ...items], { collapsible: true, collapsedLabels: 'always' }), rail('ca', items, { collapsedLabels: 'always' })], { reducedMotion: true });
    const [row, pad, ind, gap] = await Promise.all([T('item-container-height-regular'), T('collapsed-item-container-padding-block-regular'), T('item-icon-indicator-height-regular'), T('collapsed-item-gap')].map((n) => px(page, n)));
    const line = (await bounds(item(page, 'ca', 0).locator('.short'))).height;
    const above = Math.max(row / 2, pad + ind / 2);
    const at = async (id: string) => {
      const p = await bounds(panel(page, id));
      const cells = await Promise.all([0, 1, 2, 3].map((n) => bounds(cell(page, id, n))));
      const icons = await Promise.all([0, 1, 2, 3].map(async (n) => centre(await bounds(item(page, id, n).locator('.icon')))));
      const glyph = async (selector: string) => {
        const c = centre(await bounds(drawer(page, id).locator(selector).first()));
        return { x: Math.round((c.x - p.x) * 2) / 2, y: Math.round((c.y - p.y) * 2) / 2 };
      };
      return {
        cells: cells.map((c) => ({ y: Math.round(c.y - p.y), height: Math.round(c.height) })),
        icons: icons.map((c) => ({ x: Math.round((c.x - p.x) * 2) / 2, y: Math.round((c.y - p.y) * 2) / 2 })),
        menu: await glyph('tanrei-button[slot="header-button"] span[slot="icon"]'),
        main: await glyph('tanrei-main-action-button span[slot="icon"]'),
        heading: (await bounds(drawer(page, id).locator('.heading'))).height,
      };
    };
    const [e, c, ea, ca] = [await at('e'), await at('c'), await at('ea'), await at('ca')];
    // The default (collapsedLabels never): the same cells and the same points in both forms.
    expect(c.cells).toEqual(e.cells);
    expect(c.icons).toEqual(e.icons);
    expect(c.menu).toEqual(e.menu);
    expect(c.heading).toBeCloseTo(e.heading, 0);
    // The verify: 48 high in both forms, the icon line 24 below the top.
    expect(c.cells[0].height).toBe(48);
    expect(c.icons[0].y - c.cells[0].y).toBe(24);
    expect(c.cells[0].height).toBeCloseTo(above + Math.max(row / 2, ind / 2 + pad), 0);
    // With labels: a cell grows to hold the short label, in both forms alike.
    expect(ca.cells).toEqual(ea.cells);
    expect(ca.icons).toEqual(ea.icons);
    expect(ca.cells[0].height).toBeGreaterThan(c.cells[0].height);
    expect(ca.cells[0].height).toBeCloseTo(above + Math.max(row / 2, ind / 2 + gap + line + pad), 0);
    // The main action's glyph does not move WHERE its padding before the glyph is half the difference of its height and
    // its glyph (NVD-39): measured here, and reported by the test when the system's button does not have that padding.
    expect(Math.abs(c.main.y - e.main.y)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(c.main.x - e.main.x)).toBeLessThanOrEqual(0.5);
  });

  test('NVD-32: collapsed, a top-level cell is its row cut after its icon — under the default system 48 by 48 with the expanded row’s corners, its icon at the point it has expanded, no label, filled exactly as the expanded row is and never a capsule — with no trailing content and none of a group’s items', async ({ page }) => {
    await mount(page, only('collapsed', 'collapsible-expanded', 'collapsed-groups'), { reducedMotion: true });
    const [column, cw, pad, iw, ih, shape, rowShape] = await Promise.all(
      [T('collapsed-container-width-regular'), T('collapsed-item-container-width-regular'), T('collapsed-item-container-padding-block-regular'), T('item-icon-indicator-width-regular'), T('item-icon-indicator-height-regular'), T('collapsed-item-container-shape'), T('item-container-shape')].map((n) => px(page, n)),
    );
    const p = await bounds(panel(page, 'collapsed'));
    const e = await bounds(panel(page, 'collapsible-expanded'));
    for (const n of [0, 1, 2, 3]) {
      const [c, indicator, icon] = await Promise.all(['.row > .container', '.icon-indicator', '.icon'].map((s) => bounds(item(page, 'collapsed', n).locator(s))));
      // The verify: 48 by 48, centred in the icon column.
      expect([c.width, c.height], `${n}`).toEqual([48, 48]);
      expect([c.width, column]).toEqual([cw, 72]);
      expect(centre(c).x - p.x).toBeCloseTo(column / 2, 1);
      expect([indicator.width, indicator.height]).toEqual([iw, ih]);
      expect(centre(indicator).x - p.x).toBeCloseTo(column / 2, 1);
      expect(indicator.y - c.y).toBeCloseTo(pad, 1);
      expect(c.y + c.height - (indicator.y + indicator.height)).toBeCloseTo(pad, 1);
      // The expanded row's corners, not a capsule.
      const radius = Number.parseFloat(await css(item(page, 'collapsed', n).locator('.row > .container'), 'border-top-left-radius'));
      expect(radius).toBeCloseTo(shape, 0);
      expect(shape).toBe(rowShape);
      expect(radius).toBeLessThan(c.height / 4);
      // The icon is at the point it has in the expanded drawer.
      const [expandedIcon, expandedRow] = [await bounds(item(page, 'collapsible-expanded', n).locator('.icon')), await bounds(box(page, 'collapsible-expanded', n))];
      expect([icon.x - p.x, icon.y - p.y]).toEqual([expandedIcon.x - e.x, expandedIcon.y - e.y]);
      // And the cell is the expanded row cut after its icon: the same start, top and height.
      expect([c.x - p.x, c.y - p.y, c.height]).toEqual([expandedRow.x - e.x, expandedRow.y - e.y, expandedRow.height]);
      // No label: neither the expanded one nor a short one under the icon.
      await expect(item(page, 'collapsed', n).locator('.short')).toHaveCSS('opacity', '0');
      await expect(item(page, 'collapsed', n).locator('.row > .text')).toHaveCSS('opacity', '0');
    }
    await expect(item(page, 'collapsed', 0).locator('.trailing')).toHaveCSS('opacity', '0');
    // The selected one is filled exactly as the expanded row is.
    await page.mouse.move(700, 5);
    await expect.poll(() => css(item(page, 'collapsed', 0).locator('.row > .container > .indicator'), 'background-color')).toBe(await css(item(page, 'collapsible-expanded', 0).locator('.row > .container > .indicator'), 'background-color'));
    expect(await css(item(page, 'collapsed', 0).locator('.row > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    // A group: one cell, none of its items.
    expect(await group(page, 'collapsed-groups', 0).locator('.items').first().evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
    await expect(item(page, 'collapsed-groups', 1)).toBeHidden();
  });

  test('NVD-32: where a short label is drawn it is collapsed.item.gap under the icon indicator, centred on one line, cut with an ellipsis, collapsed padding-block below it; under m3-like, in collapsed-labels-always, the cell is Material’s — a 56 by 32 indicator behind the glyph and the short label under it', async ({ page }) => {
    await mount(page, only('collapsed-labels-always'), { reducedMotion: true });
    const [pad, gap, cw] = await Promise.all([T('collapsed-item-container-padding-block-regular'), T('collapsed-item-gap'), T('collapsed-item-container-width-regular')].map((n) => px(page, n)));
    const [c, indicator, short] = await Promise.all(['.row > .container', '.icon-indicator', '.short'].map((s) => bounds(item(page, 'collapsed-labels-always', 0).locator(s))));
    expect(c.width).toBeCloseTo(cw, 1);
    expect(indicator.y - c.y).toBeCloseTo(pad, 1);
    expect(short.y - (indicator.y + indicator.height)).toBeCloseTo(gap, 1);
    expect(c.y + c.height - (short.y + short.height)).toBeCloseTo(pad, 0);
    await expect(item(page, 'collapsed-labels-always', 0).locator('.short')).toHaveCSS('opacity', '1');
    expect(await css(item(page, 'collapsed-labels-always', 0).locator('.short'), 'text-align')).toBe('center');
    await mount(page, only('collapsed-labels-always'), { reducedMotion: true, system: 'm3-like' });
    const m3 = await Promise.all(['.icon-indicator', '.short', '.icon'].map((s) => bounds(item(page, 'collapsed-labels-always', 0).locator(s))));
    expect([m3[0].width, m3[0].height]).toEqual([56, 32]);
    expect(centre(m3[2]).x).toBeCloseTo(centre(m3[0]).x, 0);
    expect(m3[1].y).toBeGreaterThanOrEqual(m3[0].y + m3[0].height);
    await expect(item(page, 'collapsed-labels-always', 0).locator('.short')).toHaveCSS('opacity', '1');
    await page.mouse.move(700, 5);
    await expect.poll(() => css(item(page, 'collapsed-labels-always', 0).locator('.icon-indicator'), 'background-color')).toBe(await resolveColor(page, T('collapsed-selected-item-icon-indicator-color')));
  });

  test('NVD-33: collapsedLabels never (the default) draws no short label, so a collapsed cell is its row with the label and trailing content gone; selected draws only the selected cell’s; always draws every one; every label stays the accessible name; anything else is never', async ({ page }) => {
    await mount(page, only('collapsed', 'collapsed-labels-selected', 'collapsed-labels-always'), { reducedMotion: true });
    expect(await drawer(page, 'collapsed').evaluate((el: any) => el.collapsedLabels)).toBe('never');
    const shown = (id: string) => Promise.all([0, 1, 2, 3].map((n) => css(item(page, id, n).locator('.short'), 'opacity')));
    expect(await shown('collapsed')).toEqual(['0', '0', '0', '0']);
    expect(await shown('collapsed-labels-selected')).toEqual(['0', '0', '1', '0']);
    expect(await shown('collapsed-labels-always')).toEqual(['1', '1', '1', '1']);
    for (const id of ['collapsed', 'collapsed-labels-selected', 'collapsed-labels-always']) await expect(drawer(page, id).getByRole('button', { name: 'Inbox' })).toHaveCount(1);
    await setProps(page, 'collapsed-labels-always', { collapsedLabels: 'sometimes' });
    await expect.poll(() => shown('collapsed-labels-always')).toEqual(['0', '0', '0', '0']);
  });

  test('NVD-52: a short label that does not fit is cut at the end of its own direction — a left-to-right one at its right end in a right-to-left drawer, a right-to-left one at its left end in a left-to-right drawer — and stays centred where the layout puts it', async ({ page }) => {
    const labels = (id: string, text: string, direction?: 'rtl'): Fixture => ({ ...rail(id, [d('a', text, 'notifications'), d('b', 'Sent', 'send')], { value: 'a', label: 'Mail', collapsedLabels: 'always' }), ...(direction ? { direction } : {}) });
    await mount(page, [labels('latin-rtl', 'Notifications', 'rtl'), labels('arabic-ltr', ARABIC_LONG), labels('latin-ltr', 'Notifications')], { reducedMotion: true });
    const text = (id: string) => item(page, id, 0).locator('.short-text');
    expect(await css(drawer(page, 'latin-rtl'), 'direction')).toBe('rtl');
    for (const id of ['latin-rtl', 'latin-ltr']) {
      const e = await cutEnds(text(id));
      expect([e.overflows, e.direction, e.textOverflow], id).toEqual([true, 'ltr', 'ellipsis']);
      expect(e.first.left, id).toBeCloseTo(e.box.left, 0);
      expect(e.last.left, id).toBeGreaterThan(e.first.left);
      expect(await css(text(id), 'unicode-bidi'), id).toBe('plaintext');
    }
    const arabic = await cutEnds(text('arabic-ltr'));
    expect([arabic.overflows, arabic.direction]).toEqual([true, 'rtl']);
    expect(arabic.first.right).toBeCloseTo(arabic.box.right, 0);
    expect(arabic.last.right).toBeLessThan(arabic.first.right);
    // Placed by the layout: the short label's box is centred on the item container in either direction.
    for (const id of ['latin-rtl', 'latin-ltr', 'arabic-ltr']) {
      const [short, c] = [await bounds(item(page, id, 0).locator('.short')), await bounds(box(page, id, 0))];
      expect(centre(short).x, id).toBeCloseTo(centre(c).x, 0);
    }
  });

  test('NVD-34: a collapsed cell draws its shortLabel, or its label; the label stays its accessible name; a short label that is not part of the label is drawn and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...only('collapsed-short-labels'), rail('odd', [d('a', 'Account', 'person', { shortLabel: 'Me' })], { value: 'a', label: 'Odd', collapsedLabels: 'always' })], { reducedMotion: true });
    await expect(item(page, 'collapsed-short-labels', 1).locator('.short')).toHaveText('Shared');
    await expect(drawer(page, 'collapsed-short-labels').getByRole('button', { name: 'Shared with me' })).toHaveCount(1);
    const long = item(page, 'collapsed-short-labels', 3).locator('.short');
    await expect(long).toHaveText('Notifications');
    // The box that cuts it is the text's own, inside the one the layout places (NVD-52).
    expect(await long.locator('.short-text').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await css(long.locator('.short-text'), 'text-overflow')).toBe('ellipsis');
    await expect(item(page, 'odd', 0).locator('.short')).toHaveText('Me');
    await expect.poll(() => seen.filter((w) => w.includes('NVD-34')).length).toBe(1);
  });

  test('NVD-35: a change of form moves the end edge over motion.expand, changes each item container around the same icon line — its end edge alone where the two forms give it the same height and corners — fades the expanded labels over the first half of a collapse and the short labels in over the second, and keeps every icon in place; at once where motion is reduced', async ({ page }) => {
    await mount(page, [fixture('d', [MENU, section('Mail', MAIL)], { collapsible: true }), fixture('a', [MENU, section('Mail', MAIL)], { collapsible: true, collapsedLabels: 'always' })], { reducedMotion: false });
    const expand = await resolveToken(page, T('motion-expand-duration'), 'duration');
    const sample = (id: string) =>
      drawer(page, id).evaluate(async (el: any) => {
        const first = el.querySelector('tanrei-navigation-drawer-item');
        const icon = first.shadowRoot.querySelector('.icon');
        const container = first.shadowRoot.querySelector('.row > .container');
        const before = icon.getBoundingClientRect();
        const rowBefore = container.getBoundingClientRect();
        el.expanded = false;
        await el.updateComplete;
        await first.updateComplete;
        const timing = (e: Element, properties: string[]) => {
          const a = e.getAnimations().find((x: any) => properties.includes(x.transitionProperty)) as any;
          return a ? { duration: Math.round(Number(a.effect.getTiming().duration)), delay: Math.round(Number(a.effect.getTiming().delay)) } : null;
        };
        const moving = (e: Element) => e.getAnimations().map((x: any) => x.transitionProperty).filter(Boolean).sort();
        const root = first.shadowRoot;
        const during = icon.getBoundingClientRect();
        const rowDuring = container.getBoundingClientRect();
        return {
          width: timing(el.shadowRoot.querySelector('.drawer'), ['inline-size', 'width']),
          label: timing(root.querySelector('.text'), ['opacity']),
          short: timing(root.querySelector('.short'), ['opacity']),
          container: timing(container, ['inline-size', 'width']),
          containerMoves: moving(container),
          still: [during.x - before.x, during.y - before.y],
          rowStill: [rowDuring.x - rowBefore.x, rowDuring.y - rowBefore.y, rowDuring.height - rowBefore.height],
          formChange: el.hasAttribute('data-form-change'),
        };
      });
    const sampled = await sample('d');
    expect(sampled.width?.duration).toBeCloseTo(expand, -1);
    expect(sampled.container?.duration).toBeCloseTo(expand, -1);
    expect(sampled.label?.duration).toBeCloseTo(expand / 2, -1);
    expect(sampled.label?.delay).toBe(0);
    expect(sampled.still).toEqual([0, 0]);
    expect(sampled.formChange).toBe(true);
    // The default system: the same height and corners in both forms, so only the item container's width changes — its
    // start, its top and its height stay.
    expect(sampled.rowStill).toEqual([0, 0, 0]);
    expect(sampled.short).toBeNull();
    // Where short labels are drawn they fade in over the second half.
    const labelled = await sample('a');
    expect(labelled.short?.duration).toBeCloseTo(expand / 2, -1);
    expect(labelled.short?.delay).toBeCloseTo(expand / 2, -1);
    // A header button is the Button it is on the way: not stretched, not reshaped.
    const button = menu(page, 'd');
    const size = await bounds(button);
    expect(size.width).toBe(size.height);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setProps(page, 'd', { expanded: true });
    expect(Number.parseFloat(await css(panel(page, 'd'), 'transition-duration'))).toBe(0);
    expect((await bounds(panel(page, 'd'))).width).toBeCloseTo(await px(page, T('container-width')), 1);
  });

  test('NVD-36: a change of form keeps focus where it is; focus on what the collapsed form does not draw moves to the menu button; that content leaves the focus order and the accessibility tree; a destination’s role, name and state do not change', async ({ page }) => {
    await mount(page, [fixture('d', [MENU, d('home', 'Home', 'home'), grp('Projects', [d('a', 'Alpha'), d('b', 'Beta')], { icon: 'folder', open: true })], { collapsible: true, value: 'home', label: 'Work' })], { reducedMotion: true });
    await drawer(page, 'd').evaluate((el) => el.insertAdjacentHTML('beforeend', '<button slot="header" id="switcher">Account</button>'));
    await item(page, 'd', 0).evaluate((el: HTMLElement) => el.focus());
    await setProps(page, 'd', { expanded: false });
    expect(await activeValue(page)).toBe('home');
    await expect(drawer(page, 'd').getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    // The header slot and a group's items are out of the focus order while collapsed.
    expect(await page.locator('#switcher').evaluate((el: HTMLElement) => (el.focus(), document.activeElement === el))).toBe(false);
    expect(await item(page, 'd', 1).evaluate((el: HTMLElement) => (el.focus(), document.activeElement === el))).toBe(false);
    await expect(drawer(page, 'd').getByRole('button', { name: 'Alpha' })).toHaveCount(0);
    await setProps(page, 'd', { expanded: true });
    await item(page, 'd', 1).evaluate((el: HTMLElement) => el.focus());
    expect(await activeValue(page)).toBe('a');
    await setProps(page, 'd', { expanded: false });
    await expect.poll(() => activeValue(page)).toBe('header-button:Menu');
    await setProps(page, 'd', { expanded: true });
    await page.locator('#switcher').focus();
    await setProps(page, 'd', { expanded: false });
    await expect.poll(() => activeValue(page)).toBe('header-button:Menu');
  });

  test('NVD-37: the first header button of a collapsible drawer is its menu button — aria-expanded and aria-controls on its native button — and asks for the other form: expanded set, then expandedchange; an open modal drawer closes instead; without a header button it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [rail('std', MAIL), rail('mod', MAIL, { variant: 'modal', open: false }), fixture('plain', [MENU, ...MAIL]), fixture('none', MAIL, { collapsible: true })], { reducedMotion: true });
    await wire(page);
    const inner = (id: string) => menu(page, id).locator('button');
    await expect(inner('std')).toHaveAttribute('aria-expanded', 'false');
    expect(await inner('std').evaluate((el: any) => (el.ariaControlsElements === undefined ? ['unsupported'] : (el.ariaControlsElements ?? []).map((e: Element) => e.localName)))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(tanrei-navigation-drawer|unsupported)$/)]),
    );
    await expect(inner('plain')).not.toHaveAttribute('aria-expanded');
    await inner('std').click();
    await expect(inner('std')).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer(page, 'std')).not.toHaveAttribute('collapsed');
    await inner('std').click();
    expect(await log(page)).toEqual(['expandedchange:true:true:true', 'expandedchange:false:false:true']);
    // Modal: the menu button opens it; open, it closes it.
    await page.evaluate(() => ((window as any).log.length = 0));
    await inner('mod').click();
    await expect(drawer(page, 'mod')).toHaveAttribute('open', '');
    await expect(inner('mod')).toHaveAttribute('aria-expanded', 'true');
    await inner('mod').click();
    await expect(drawer(page, 'mod')).not.toHaveAttribute('open');
    expect(await log(page)).toEqual(['expandedchange:true:false:true', 'close:false']);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-37')).length).toBe(1);
  });

  test('NVD-38: the header — header buttons stacked on the icon column header.item-gap apart, the header slot item.gap after the first one and centred in its row, then the main action — comes first in reading and focus order', async ({ page }) => {
    await mount(page, [fixture('h', [{ ...MENU, content: 'menu_open' }, { kind: 'header-button', props: { label: 'Search' }, content: 'search' }, ...MAIL, MAIN], { collapsible: true }), fixture('t', MAIL)], { reducedMotion: true });
    // (A block, so that its box is its line: an inline box is as high as its font's ascent and descent, each rounded
    // to a whole pixel — 17 in a line of 18 in the default serif of the CI's Linux, half a pixel off the centre of the
    // line it stands in, which is the row's centre.)
    await drawer(page, 'h').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="header" id="title" style="display: block">Mail</span>'));
    await drawer(page, 't').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="header" id="t-title">Mail</span>'));
    const [column, itemGap, gap, pi] = await Promise.all([T('collapsed-container-width-regular'), T('header-item-gap'), T('item-gap'), T('container-padding-inline')].map((n) => px(page, n)));
    const p = await bounds(panel(page, 'h'));
    const buttons = drawer(page, 'h').locator('tanrei-button[slot="header-button"]');
    const [first, second] = [await bounds(buttons.nth(0)), await bounds(buttons.nth(1))];
    expect(centre(first).x - p.x).toBeCloseTo(column / 2, 1);
    expect(centre(second).x - p.x).toBeCloseTo(column / 2, 1);
    expect(second.y - (first.y + first.height)).toBeCloseTo(itemGap, 1);
    const title = await bounds(page.locator('#title'));
    expect(title.x - (first.x + first.width)).toBeCloseTo(gap, 0);
    expect(centre(title).y).toBeCloseTo(centre(first).y, 1);
    const main = await bounds(drawer(page, 'h').locator('tanrei-main-action-button'));
    expect(main.y - (second.y + second.height)).toBeCloseTo(itemGap, 1);
    // Without a header button the header slot starts at padding-inline.
    expect((await bounds(page.locator('#t-title'))).x - (await bounds(panel(page, 't'))).x).toBeCloseTo(pi, 0);
    // Plain text in the header slot inherits header.typescale and header.color; an element that sets its own keeps it.
    const style = await page.evaluate((name) => {
      const probe = document.createElement('span');
      probe.style.font = `var(${name}-font)`;
      probe.style.color = `var(${name.replace('-typescale', '')}-color)`;
      document.body.appendChild(probe);
      const { fontFamily, fontSize, fontWeight, color } = getComputedStyle(probe);
      probe.remove();
      return { fontFamily, fontSize, fontWeight, color };
    }, '--tanrei-comp-navigation-drawer-header-typescale');
    for (const id of ['#title', '#t-title']) {
      const drawn = await page.locator(id).evaluate((el) => {
        const { fontFamily, fontSize, fontWeight, color } = getComputedStyle(el);
        return { fontFamily, fontSize, fontWeight, color };
      });
      expect(drawn, id).toEqual(style);
    }
    await page.locator('#t-title').evaluate((el) => (el.style.fontSize = '30px'));
    expect(await css(page.locator('#t-title'), 'font-size')).toBe('30px');
    // First in focus order, wherever the items stand among the children.
    await page.mouse.click(700, 5);
    await tabTo(page, buttons.nth(0).locator('button'));
    await tab(page);
    expect(await activeValue(page)).toBe('header-button:Search');
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-main-action-button');
    await tab(page);
    expect(await activeValue(page)).toBe('inbox');
  });

  test('NVD-39: the main action is the Main Action Button — collapsed to its icon while the drawer is collapsed, extended while expanded, centred in the icon column and started at the same place; its label its name; a second one is not drawn and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('d', [MENU, MAIN, { ...MAIN, props: { label: 'Other' } }, ...MAIL], { collapsible: true })], { reducedMotion: true });
    const column = await px(page, T('collapsed-container-width-regular'));
    const main = drawer(page, 'd').locator('tanrei-main-action-button').first();
    expect(await main.evaluate((el: any) => el.extended)).toBe(true);
    const expanded = await bounds(main);
    await setProps(page, 'd', { expanded: false });
    await expect.poll(() => main.evaluate((el: any) => el.extended)).toBe(false);
    await expect(main).toHaveAttribute('collapsed', '');
    await expect.poll(async () => Math.round((await bounds(main)).width)).toBe(Math.round((await bounds(main)).height));
    const collapsed = await bounds(main);
    const p = await bounds(panel(page, 'd'));
    expect(centre(collapsed).x - p.x).toBeCloseTo(column / 2, 1);
    // Its glyph does not move: in the default system the padding before it is half its square less the glyph.
    expect(expanded.x).toBeCloseTo(collapsed.x, 1);
    await expect(drawer(page, 'd').getByRole('button', { name: 'Compose' })).toHaveCount(1);
    await expect(drawer(page, 'd').locator('tanrei-main-action-button').nth(1)).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('NVD-39')).length).toBe(1);
  });

  test('NVD-39: the main action’s glyph is centred on the destinations’ icon line — small, medium and large, regular and compact, expanded and collapsed, left to right and right to left, under the default system, m3-like and cupertino; a square wider than the column and a trailing glyph are reported', async ({ page }) => {
    test.setTimeout(120_000);
    const SIZES = ['small', 'medium', 'large'] as const;
    const DENSITIES = ['regular', 'compact'] as const;
    const glyph = async (id: string) => centre(await bounds(drawer(page, id).locator('tanrei-main-action-button').locator('.icon-box'))).x;
    const icon = async (id: string) => centre(await bounds(item(page, id, 0).locator('.icon'))).x;
    const measured: string[] = [];
    for (const system of [undefined, 'm3-like', 'cupertino'] as const) {
      for (const direction of ['ltr', 'rtl'] as const) {
        const seen = warnings(page);
        const fixtures = DENSITIES.flatMap((density) =>
          SIZES.map((size) => ({ ...fixture(`${density}-${size}`, [MENU, { ...MAIN, props: { label: 'Compose', size } }, ...MAIL], { collapsible: true, density }), direction })),
        );
        await mount(page, fixtures, { reducedMotion: true, ...(system ? { system } : {}) });
        for (const form of ['expanded', 'collapsed'] as const) {
          if (form === 'collapsed') for (const f of fixtures) await setProps(page, f.id, { expanded: false });
          for (const f of fixtures) {
            const main = drawer(page, f.id).locator('tanrei-main-action-button');
            await expect.poll(() => main.evaluate((el: any) => el.extended)).toBe(form === 'expanded');
            const where = `${system ?? 'tanrei'} ${direction} ${f.id} ${form}`;
            const [g, i] = [await glyph(f.id), await icon(f.id)];
            measured.push(`${where}: ${(g - i).toFixed(2)}`);
            expect(Math.abs(g - i), where).toBeLessThanOrEqual(0.5);
          }
        }
        // Under the default system the line is 36 from the start edge in the regular column and 28 in the compact one.
        if (!system && direction === 'ltr') {
          for (const density of DENSITIES) {
            const p = await bounds(panel(page, `${density}-medium`));
            expect((await icon(`${density}-medium`)) - p.x).toBe(density === 'regular' ? 36 : 28);
          }
        }
        // Reported: a collapsed square wider than the column — the large one in the default system's columns.
        if (!system) {
          await expect.poll(() => seen.filter((w) => w.includes('NVD-39') && w.includes('collapsed square')).length).toBe(2);
          expect(seen.filter((w) => w.includes('NVD-39') && w.includes('collapsed square') && !w.includes('is 96 wide'))).toEqual([]);
        }
      }
    }
    test.info().annotations.push({ type: 'glyph minus icon, in px', description: measured.join('; ') });
    // A trailing glyph is placed as collapsed, and reported.
    const seen = warnings(page);
    await mount(page, [fixture('t', [MENU, { ...MAIN, props: { label: 'Compose', iconPosition: 'trailing' } }, ...MAIL], { collapsible: true, expanded: false })], { reducedMotion: true });
    expect(Math.abs((await glyph('t')) - (await icon('t')))).toBeLessThanOrEqual(0.5);
    await expect.poll(() => seen.some((w) => w.includes('NVD-39') && w.includes('trailing glyph'))).toBe(true);
  });

  test('NVD-40: a modal collapsible drawer keeps its column in the layout in the standard look while closed, and widens over the content from it in the modal look with the scrim, over motion.expand, without resizing the content', async ({ page }) => {
    await mount(page, only('modal-collapsible-closed'));
    const [column, width] = await Promise.all([T('collapsed-container-width-regular'), T('container-width')].map((n) => px(page, n)));
    const id = 'modal-collapsible-closed';
    const host = await bounds(drawer(page, id));
    expect(host.width).toBeCloseTo(column, 1);
    await expect(drawer(page, id).locator('dialog')).toHaveCount(0);
    expect(await css(panel(page, id), 'background-color')).toBe(await resolveColor(page, T('container-color-standard')));
    expect(await css(drawer(page, id).locator('.edge'), 'background-color')).toBe(await resolveColor(page, T('outline-color-standard')));
    await expect(page.locator(`[data-fixture="${id}"]`).getByRole('navigation', { name: /^Mail\b/ })).toHaveCount(1);
    await menu(page, id).locator('button').click();
    const dialog = drawer(page, id).locator('dialog');
    await expect(dialog).toHaveJSProperty('open', true);
    expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(Number.parseFloat(await css(dialog, 'transition-duration'))).toBeCloseTo((await resolveToken(page, T('motion-expand-duration'), 'duration')) / 1000, 3);
    await expect.poll(async () => (await bounds(dialog)).width).toBeCloseTo(width, 1);
    const box = await bounds(dialog);
    expect([box.x, box.y]).toEqual([host.x, host.y]);
    expect((await bounds(drawer(page, id))).width).toBeCloseTo(column, 1);
    expect(await css(dialog, 'background-color')).toBe(await resolveColor(page, T('container-color-modal')));
    expect(await css(dialog, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    await page.keyboard.press('Escape');
    await expect(drawer(page, id)).toHaveAttribute('collapsed', '');
    await expect.poll(() => drawer(page, id).locator('dialog').count(), { timeout: 5000 }).toBe(0);
  });

  test('NVD-41: a new selection changes the item containers’ colors in place over motion.state — no frame shows one narrower than at rest, expanded or collapsed, and none grows, shrinks or slides — and grows the icon indicator from its centre over motion.selection; collapsedLabels selected moves its short label with it and no cell; at once where motion is reduced', async ({ page }) => {
    await mount(page, [fixture('e', MAIL), rail('c', MAIL), ...only('collapsed-labels-selected')], { reducedMotion: false });
    const [selection, state] = await Promise.all([resolveToken(page, T('motion-selection-duration'), 'duration'), resolveToken(page, T('motion-state-duration'), 'duration')]);
    for (const [id, n, old] of [
      ['e', 2, 0],
      ['c', 2, 0],
      ['collapsed-labels-selected', 1, 2],
    ] as const) {
      const before = await Promise.all([0, 1, 2, 3].map((k) => bounds(cell(page, id, k))));
      const rest = await Promise.all([n, old].map((k) => bounds(item(page, id, k).locator('.row > .container > .indicator'))));
      const change = await item(page, id, n).evaluate(async (el: any, previous) => {
        const other = el.parentElement.closest('tanrei-navigation-drawer').querySelectorAll('tanrei-navigation-drawer-item')[previous];
        el.click();
        await el.updateComplete;
        await other.updateComplete;
        const read = (cell: any) => {
          const fill = cell.shadowRoot.querySelector('.row > .container > .indicator');
          const transitions = fill.getAnimations().filter((x: any) => x.transitionProperty);
          const rect = fill.getBoundingClientRect();
          return {
            // Everything that animates the fill: its color, and nothing else.
            properties: transitions.map((x: any) => x.transitionProperty),
            duration: transitions.length ? Math.round(Number(transitions[0].effect.getTiming().duration)) : null,
            scripted: fill.getAnimations().filter((x: any) => !x.transitionProperty).length,
            box: [rect.x, rect.width, rect.height],
          };
        };
        const indicator = el.shadowRoot.querySelector('.icon-indicator');
        const grow = indicator.getAnimations().find((x: Animation) => x.id === 'tanrei-drawer-grow') as any;
        const frames = grow?.effect.getKeyframes();
        return { now: read(el), was: read(other), grow: grow ? { duration: Math.round(Number(grow.effect.getTiming().duration)), from: frames[0].inlineSize, to: frames.at(-1).inlineSize } : null };
      }, old);
      // In place, at full size, in the first frame of the change and in every one after it: only the color moves.
      for (const [index, each] of [change.now, change.was].entries()) {
        expect(each.properties, `${id} ${index}`).toEqual(['background-color']);
        // The state motion — never the longer selection motion (a browser shortens a transition that reverses one
        // still running, so it is at most the state motion).
        expect(state, id).toBeLessThan(selection);
        expect(each.duration, `${id} ${index}`).toBeGreaterThan(0);
        expect(each.duration, `${id} ${index}`).toBeLessThanOrEqual(Math.round(state));
        expect(each.scripted, `${id} ${index}`).toBe(0);
        expect(each.box, `${id} ${index}`).toEqual([expect.closeTo(rest[index].x, 2), expect.closeTo(rest[index].width, 2), expect.closeTo(rest[index].height, 2)]);
      }
      // The icon indicator — transparent in the default system — grows in width from its centre, at full height.
      expect(change.grow, id).toEqual({ duration: Math.round(selection), from: '0px', to: `${await px(page, T('item-icon-indicator-width-regular'))}px` });
      expect(await Promise.all([0, 1, 2, 3].map((k) => bounds(cell(page, id, k))))).toEqual(before);
    }
    await expect.poll(() => css(item(page, 'collapsed-labels-selected', 1).locator('.short'), 'opacity')).toBe('1');
    await expect.poll(() => css(item(page, 'collapsed-labels-selected', 2).locator('.short'), 'opacity')).toBe('0');
    await expect.poll(() => css(item(page, 'e', 2).locator('.row > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-item-container-color')).then(async (hovered) => ((await item(page, 'e', 2).locator('.cell').evaluate((el) => el.matches(':hover'))) ? hovered : resolveColor(page, T('selected-item-container-color')))));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await item(page, 'e', 3).evaluate(async (el: any) => {
      el.click();
      await el.updateComplete;
      return [el.shadowRoot.querySelector('.row > .container > .indicator').getAnimations().length, el.shadowRoot.querySelector('.icon-indicator').getAnimations().length];
    });
    expect(reduced).toEqual([0, 0]);
  });

  test('NVD-41: under m3-like, collapsed, the indicator behind the glyph still grows from its centre, as Material’s does', async ({ page }) => {
    await mount(page, only('collapsed-labels-always'), { reducedMotion: false, system: 'm3-like' });
    const grow = await item(page, 'collapsed-labels-always', 2).evaluate(async (el: any) => {
      el.click();
      await el.updateComplete;
      const indicator = el.shadowRoot.querySelector('.icon-indicator');
      const a = indicator.getAnimations().find((x: Animation) => x.id === 'tanrei-drawer-grow') as any;
      const before = indicator.getBoundingClientRect();
      a.pause();
      a.currentTime = Number(a.effect.getTiming().duration) / 2;
      const mid = indicator.getBoundingClientRect();
      a.finish();
      const end = indicator.getBoundingClientRect();
      return { centre: [mid.x + mid.width / 2, end.x + end.width / 2], widths: [mid.width, end.width], heights: [mid.height, end.height], start: before.width };
    });
    expect(grow.widths[1]).toBe(56);
    expect(grow.widths[0]).toBeGreaterThan(0);
    expect(grow.widths[0]).toBeLessThan(56);
    expect(grow.heights).toEqual([32, 32]);
    expect(grow.centre[0]).toBeCloseTo(grow.centre[1], 0);
  });

  test('NVD-42: a badge (the badge component) on the icon in both forms, kept while disabled, its description after the name and state', async ({ page }) => {
    await mount(page, [...only('collapsed-badges'), fixture('e', [d('inbox', 'Inbox', 'inbox', { badge: true, badgeCount: 3, badgeLabel: '3 unread' }), d('x', 'Off', 'chat', { badge: true, badgeLabel: 'New', disabled: true })])], { reducedMotion: true });
    for (const id of ['collapsed-badges', 'e']) {
      const badge = item(page, id, 0).locator('tanrei-badge');
      await expect(badge).toHaveCount(1);
      await expect(badge.locator('.icon')).toHaveCount(1);
      await expect(cell(page, id, 0)).toHaveAccessibleDescription('3 unread');
    }
    await expect(item(page, 'e', 1).locator('tanrei-badge')).toHaveCount(1);
    await expect(cell(page, 'collapsed-badges', 1)).toHaveAccessibleDescription('New messages');
  });

  test('NVD-43: the trailing slot’s glyph at item.trailing-icon.size in its condition’s trailing icon color, else the trailing text on one line in its color; both given, the slot wins and it is reported; a focusable element in it leaves the focus order and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...only('trailing'), fixture('both', [{ ...d('a', 'A', 'inbox', { trailingText: '9' }), content: 'open_in_new' }], { value: 'a' }), fixture('focusable', [d('a', 'A', 'inbox'), d('b', 'B', 'send')], { value: 'a' })], { reducedMotion: true });
    await page.mouse.move(700, 5);
    const size = await px(page, T('item-trailing-icon-size-regular'));
    const glyph = item(page, 'trailing', 3).locator('.trailing-slot');
    expect((await bounds(glyph)).width).toBe(size);
    expect(await css(glyph, 'color')).toBe(await resolveColor(page, T('unselected-item-trailing-icon-color')));
    const text = item(page, 'trailing', 1).locator('.trailing-text');
    expect(await css(text, 'white-space')).toBe('nowrap');
    expect(await css(text, 'color')).toBe(await resolveColor(page, T('unselected-item-trailing-text-color')));
    expect(await css(item(page, 'trailing', 0).locator('.trailing-text'), 'color')).toBe(await resolveColor(page, T('selected-item-trailing-text-color')));
    await expect(text).toHaveText('1,280');
    await expect(item(page, 'both', 0).locator('.trailing-text')).toHaveCount(0);
    await drawer(page, 'focusable').evaluate((el) => el.querySelector('tanrei-navigation-drawer-item')!.insertAdjacentHTML('beforeend', '<button slot="trailing" id="inner">More</button>'));
    await page.mouse.click(700, 5);
    await tabTo(page, cell(page, 'focusable', 0));
    await tab(page);
    expect(await activeValue(page)).toBe('b');
    await expect.poll(() => seen.filter((w) => w.includes('NVD-43')).length).toBe(2);
  });

  test('NVD-44, NVD-68: a group’s row is drawn as a destination’s with its chevron — at the end expand_more at trailing-icon.size, turned half a turn while open; at the start chevron_right, turned a quarter turn; open and close move the cells below over motion.disclosure', async ({ page }) => {
    const groups = spec.fixtures.find((f) => f.id === 'groups')!;
    await mount(page, [{ ...groups, id: 'end', props: { ...groups.props, chevron: 'end' } }, { ...groups, id: 'start' }], { reducedMotion: false });
    const [trailing, height] = await Promise.all([T('item-trailing-icon-size-regular'), T('item-container-height-regular')].map((n) => px(page, n)));
    const chevron = group(page, 'end', 0).locator('.chevron').first();
    await expect(chevron).toHaveText('expand_more');
    expect((await bounds(chevron)).width).toBe(trailing);
    expect(await css(chevron, 'rotate')).toBe('180deg');
    expect(await css(group(page, 'end', 1).locator('.chevron').first(), 'rotate')).toBe('none');
    expect((await bounds(groupRow(page, 'end', 0))).height).toBeGreaterThanOrEqual(height);
    // At the start (the default): chevron_right, pointing down while open; every row of the drawer keeps its box, so the
    // icons of a level stand in one column.
    const start = group(page, 'start', 0).locator('.chevron').first();
    await expect(start).toHaveText('chevron_right');
    expect(await css(start, 'rotate')).toBe('90deg');
    expect(await css(group(page, 'start', 1).locator('.chevron').first(), 'rotate')).toBe('none');
    const iconX = async (locator: Locator) => (await bounds(locator.locator('.icon').first())).x;
    expect(await iconX(group(page, 'start', 0))).toBe(await iconX(item(page, 'start', 0)));
    const disclosure = await resolveToken(page, T('motion-disclosure-duration'), 'duration');
    expect(Number.parseFloat(await css(group(page, 'end', 0).locator('.items').first(), 'transition-duration'))).toBeCloseTo(disclosure / 1000, 3);
    const below = (await bounds(groupRow(page, 'end', 1))).y;
    await groupRow(page, 'end', 0).click();
    await expect.poll(async () => (await bounds(groupRow(page, 'end', 1))).y).toBeLessThan(below);
    await expect.poll(() => css(chevron, 'rotate')).toBe('none');
  });

  test('NVD-45: activating a group’s row toggles it — open set, then toggle, no change, reselect or close; the arrow toward the end opens, toward the start closes, and inside a group moves to its row; a disabled group does nothing', async ({ page }) => {
    await mount(page, only('groups', 'groups-nested'), { reducedMotion: true });
    await wire(page);
    await groupRow(page, 'groups', 1).click();
    await expect(group(page, 'groups', 1)).toHaveAttribute('open', '');
    await tabTo(page, groupRow(page, 'groups', 1));
    await page.keyboard.press('Enter');
    await expect(group(page, 'groups', 1)).not.toHaveAttribute('open');
    await page.keyboard.press('ArrowRight');
    await expect(group(page, 'groups', 1)).toHaveAttribute('open', '');
    await page.keyboard.press('ArrowLeft');
    await expect(group(page, 'groups', 1)).not.toHaveAttribute('open');
    expect(await log(page)).toEqual(['toggle:Archive:true:true', 'toggle:Archive:false:false', 'toggle:Archive:true:true', 'toggle:Archive:false:false']);
    // Inside an open group, the arrow toward the start goes to its row.
    await item(page, 'groups', 1).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('ArrowLeft');
    expect(await activeValue(page)).toBe('group:Projects');
    // Right-to-left: mirrored.
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await page.keyboard.press('ArrowRight');
    await expect(group(page, 'groups', 0)).not.toHaveAttribute('open');
    // A disabled group.
    await group(page, 'groups-nested', 3).evaluate((el: any) => el.shadowRoot.querySelector('.cell').click());
    await expect(group(page, 'groups-nested', 3)).not.toHaveAttribute('open');
    await expect(groupRow(page, 'groups-nested', 3)).toBeDisabled();
  });

  test('NVD-46: a group’s row is one button named by its label with aria-expanded and aria-controls; its items a list labelled by it; closed or collapsed, its items are neither exposed nor focusable; an empty label is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...only('groups', 'collapsed-groups'), fixture('blank', [grp('', [d('a', 'A')], { icon: 'folder' })], { value: 'a' })], { reducedMotion: true });
    const projects = drawer(page, 'groups').getByRole('button', { name: 'Projects' });
    await expect(projects).toHaveAttribute('aria-expanded', 'true');
    await expect(projects).toHaveAttribute('aria-controls', 'items');
    await expect(drawer(page, 'groups').getByRole('list', { name: 'Projects' })).toHaveCount(1);
    await expect(drawer(page, 'groups').getByRole('button', { name: 'Archive' })).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer(page, 'groups').getByRole('button', { name: '2025' })).toHaveCount(0);
    await expect(drawer(page, 'collapsed-groups').getByRole('button', { name: 'Website' })).toHaveCount(0);
    await expect(group(page, 'collapsed-groups', 0).locator('.items').first()).toHaveAttribute('inert', '');
    await expect.poll(() => seen.filter((w) => w.includes('NVD-46')).length).toBe(1);
  });

  test('NVD-47: a closed group holding the selection is drawn selected, and collapsed its top-level group; activating a group’s cell while collapsed expands the drawer, opens the group and takes focus to its row', async ({ page }) => {
    await mount(page, only('group-closed-selected', 'collapsed-groups'), { reducedMotion: true });
    await page.mouse.move(700, 5);
    expect(await drawn(group(page, 'group-closed-selected', 0))).toEqual(await expected(page, 'selected'));
    expect(await drawn(group(page, 'collapsed-groups', 0))).toEqual(await expected(page, 'collapsed-selected'));
    await setProps(page, 'collapsed-groups', { expanded: true });
    await group(page, 'collapsed-groups', 0).evaluate(async (el: any) => {
      el.open = false;
      await el.updateComplete;
    });
    await setProps(page, 'collapsed-groups', { expanded: false });
    await wire(page);
    await groupRow(page, 'collapsed-groups', 0).click();
    await expect(drawer(page, 'collapsed-groups')).not.toHaveAttribute('collapsed');
    await expect(group(page, 'collapsed-groups', 0)).toHaveAttribute('open', '');
    expect(await log(page)).toEqual(['expandedchange:true:true:true', 'toggle:Projects:true:true']);
    await expect.poll(() => activeValue(page)).toBe('group:Projects');
  });

  test('NVD-48, NVD-69: groups nested deeper than three levels still render, each level a step further in, no row’s label beginning past half of the drawer’s width, and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('deep', [grp('1', [grp('2', [grp('3', [grp('4', [d('x', 'Deep')], { open: true })], { open: true })], { open: true })], { icon: 'folder', open: true })], { value: 'x' })], { reducedMotion: true });
    await expect(cell(page, 'deep', 0)).toBeVisible();
    const width = await px(page, T('container-width'));
    const p = await bounds(panel(page, 'deep'));
    const labels = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(group(page, 'deep', n).locator('.label').first())).x - p.x));
    // The top level: the padding, the chevron's room and the icon's before the label (12 + 12 + 20 + 12 + 24 + 12).
    expect(labels[0]).toBe(92);
    // Deeper, the step would begin each label past half of the width: each begins there.
    for (const n of [1, 2, 3]) expect(labels[n], `level ${n}`).toBeCloseTo(width / 2, 1);
    expect((await bounds(item(page, 'deep', 0).locator('.label'))).x - p.x).toBeCloseTo(width / 2, 1);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-48')).length).toBe(1);
  });

  test('NVD-49: collapsed, a top-level cell without an icon is still drawn — an empty icon indicator on the icon column and, where labels are drawn, its short label — and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [rail('c', [d('a', 'Alpha', 'inbox'), d('b', 'Beta')], { value: 'a', collapsedLabels: 'always' })], { reducedMotion: true });
    await expect(item(page, 'c', 1).locator('.short')).toHaveText('Beta');
    await expect(item(page, 'c', 1).locator('.short')).toHaveCSS('opacity', '1');
    await expect(item(page, 'c', 1).locator('.icon-indicator')).toHaveCount(1);
    const column = await px(page, T('collapsed-container-width-regular'));
    expect(centre(await bounds(item(page, 'c', 1).locator('.icon-indicator'))).x - (await bounds(panel(page, 'c'))).x).toBeCloseTo(column / 2, 1);
    await expect.poll(() => seen.filter((w) => w.includes('NVD-49')).length).toBe(1);
  });
});

test.describe('forms and focus', () => {
  const opener = (page: P) =>
    page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="menu">Menu</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after-drawer">After</button>');
    });

  test('NVD-18: a standard drawer takes its form’s width while open and none while closed — hidden from assistive technology and focus — sliding over the enter and exit motion, at once where motion is reduced; no scrim, no close, no trap', async ({ page }) => {
    await mount(page, [fixture('s', MAIL), rail('c', MAIL)]);
    await wire(page);
    const [width, column, enter, exit] = [await px(page, T('container-width')), await px(page, T('collapsed-container-width-regular')), await resolveToken(page, T('motion-enter-duration'), 'duration'), await resolveToken(page, T('motion-exit-duration'), 'duration')];
    expect((await bounds(drawer(page, 's'))).width).toBe(width);
    expect((await bounds(drawer(page, 'c'))).width).toBe(column);
    // Mid-slide is sampled on the transition's own timeline, not the wall clock.
    const slide = await drawer(page, 's').evaluate(async (el: any) => {
      el.open = false;
      await el.updateComplete;
      const t = el.getAnimations().find((a: Animation) => ['inline-size', 'width'].includes((a as CSSTransition).transitionProperty)) as CSSTransition | undefined;
      if (!t) return null;
      const duration = Number(t.effect!.getTiming().duration);
      t.pause();
      t.currentTime = duration / 3;
      const mid = el.getBoundingClientRect().width;
      t.play();
      return { duration, mid };
    });
    expect(slide).not.toBeNull();
    expect(slide!.duration).toBeCloseTo(exit, 0);
    expect(slide!.mid).toBeGreaterThan(0);
    expect(slide!.mid).toBeLessThan(width);
    await expect.poll(async () => (await bounds(drawer(page, 's'))).width).toBe(0);
    await expect(drawer(page, 's')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('[data-fixture="s"]').getByRole('navigation')).toHaveCount(0);
    await cell(page, 's', 1).evaluate((el: HTMLElement) => el.focus());
    expect(await drawer(page, 's').evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await drawer(page, 's').evaluate((el: any) => (el.open = true));
    expect(Number.parseFloat(await css(drawer(page, 's'), 'transition-duration'))).toBeCloseTo(enter / 1000, 3);
    await expect.poll(async () => (await bounds(drawer(page, 's'))).width).toBe(width);
    await expect(drawer(page, 's').locator('dialog')).toHaveCount(0);
    expect(await log(page)).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await drawer(page, 's').evaluate((el: any) => (el.open = false));
    expect((await bounds(drawer(page, 's'))).width).toBe(0);
  });

  test('NVD-28: opening a standard drawer moves focus to the selected destination (else the first); closing it with focus inside returns focus; Tab leaves it open', async ({ page }) => {
    await mount(page, [fixture('s', MAIL, { open: false }), fixture('none', MAIL, { open: false, value: '' })]);
    await opener(page);
    await page.locator('#menu').focus();
    await drawer(page, 's').evaluate((el: any) => (el.open = true));
    await expect.poll(() => activeValue(page)).toBe('inbox');
    await tabTo(page, cell(page, 's', 3));
    await tab(page);
    await expect.poll(() => drawer(page, 's').evaluate((el) => el.contains(document.activeElement))).toBe(false);
    // …to the next control of the page: the closed standard drawer between them is not in the focus order (NVD-18).
    expect(await activeValue(page)).toBe('after-drawer');
    await expect(drawer(page, 's')).toHaveAttribute('open', '');
    await cell(page, 's', 2).evaluate((el: HTMLElement) => el.focus());
    await drawer(page, 's').evaluate((el: any) => (el.open = false));
    await expect.poll(() => activeValue(page)).toBe('menu');
    await drawer(page, 'none').evaluate((el: any) => (el.open = true));
    await expect.poll(() => activeValue(page)).toBe('inbox');
  });

  test('NVD-19: a modal drawer slides in over a scrim, takes focus to the selected destination (or the group row that shows it), keeps it inside and makes everything behind it inert', async ({ page }) => {
    await mount(page, [fixture('m', MAIL, { variant: 'modal', open: false })]);
    await opener(page);
    await page.locator('#menu').focus();
    const enter = await resolveToken(page, T('motion-enter-duration'), 'duration');
    await drawer(page, 'm').evaluate((el: any) => (el.open = true));
    const dialog = drawer(page, 'm').locator('dialog');
    await expect(dialog).toHaveJSProperty('open', true);
    expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(Number.parseFloat(await css(dialog, 'transition-duration'))).toBeCloseTo(enter / 1000, 3);
    expect(await css(dialog, 'transition-property')).toContain('translate');
    expect(await css(dialog, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    await expect.poll(() => activeValue(page)).toBe('inbox');
    await cell(page, 'm', 3).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Tab');
    expect(await activeValue(page)).toBe('inbox');
    await page.keyboard.press('Shift+Tab');
    expect(await activeValue(page)).toBe('trash');
    expect(await page.evaluate(() => document.elementFromPoint(5, 5)?.closest('button')?.id ?? null)).not.toBe('menu');
    // The selection inside a closed group: focus to the group's row.
    const [closed] = only('group-closed-selected');
    await mount(page, [{ ...closed, props: { ...closed.props, variant: 'modal', open: false } }]);
    await drawer(page, 'group-closed-selected').evaluate((el: any) => (el.open = true));
    await expect.poll(() => activeValue(page)).toBe('group:Projects');
  });

  test('NVD-20: the scrim, Escape, back, the menu button and a drag past half its width (or a fling) close a modal drawer: open is false and close fires once', async ({ page }) => {
    const width = await (async () => {
      await mount(page, [fixture('m', MAIL, { variant: 'modal' })]);
      return px(page, T('container-width'));
    })();
    const cases: [string, () => Promise<void>][] = [
      ['scrim', () => page.mouse.click(width + 40, 300)],
      ['Escape', () => page.keyboard.press('Escape')],
      ['back', () => drawer(page, 'm').locator('dialog').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })))],
      [
        'drag',
        async () => {
          await page.mouse.move(width - 20, 500);
          await page.mouse.down();
          for (let x = width - 20; x >= width / 2 - 40; x -= 10) await page.mouse.move(x, 500);
          await page.waitForTimeout(100); // slow: not a fling
          await page.mouse.move(width / 2 - 50, 500);
          await page.mouse.up();
        },
      ],
      ['fling', () => fling(page, 'm', { x: width - 20, y: 500 }, [width - 40, width - 90])],
    ];
    for (const [name, act] of cases) {
      await mount(page, [fixture('m', MAIL, { variant: 'modal' })]);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await wire(page);
      await act();
      await expect.poll(() => log(page), name).toEqual(['close:false']);
      await expect(drawer(page, 'm'), name).not.toHaveAttribute('open');
    }
    // The menu button of a collapsible modal drawer.
    await mount(page, [rail('mc', MAIL, { variant: 'modal', open: true })], { reducedMotion: true });
    await wire(page);
    await menu(page, 'mc').locator('button').click();
    await expect.poll(() => log(page)).toEqual(['close:false']);
    // A short, slow drag springs back and stays open; a press inside the drawer does not close it.
    await mount(page, [fixture('m', MAIL, { variant: 'modal' })]);
    await wire(page);
    await page.mouse.move(width - 20, 500);
    await page.mouse.down();
    await page.mouse.move(width - 30, 500);
    await page.waitForTimeout(100);
    await page.mouse.move(width - 40, 500);
    await page.waitForTimeout(100);
    await page.mouse.move(width - 41, 500);
    await page.mouse.up();
    await page.mouse.click(width - 20, 600);
    expect(await log(page)).toEqual([]);
    await expect(drawer(page, 'm')).toHaveAttribute('open', '');
  });

  test('NVD-21: activating a destination of a modal drawer emits change or reselect, then closes it; a link opened somewhere else — a modified click, a link to a new context — leaves it open', async ({ page, context }) => {
    await mount(page, [fixture('m', MAIL, { variant: 'modal' })]);
    await wire(page);
    await cell(page, 'm', 1).click();
    expect(await log(page)).toEqual(['change:sent:sent', 'close:false']);
    await drawer(page, 'm').evaluate((el: any) => (el.open = true));
    await cell(page, 'm', 1).click();
    expect(await log(page)).toEqual(['change:sent:sent', 'close:false', 'reselect:sent:sent', 'close:false']);
    // Links: a person opening pages in other tabs from the menu keeps the menu.
    await mount(page, [fixture('n', [link('Inbox', '#inbox'), link('Sent', '#sent'), link('Help', '#help', { target: 'new', targetLabel: 'opens in a new tab' })], { variant: 'modal', value: '#inbox' })]);
    await wire(page);
    await cell(page, 'n', 1).click({ modifiers: ['ControlOrMeta'] });
    await cell(page, 'n', 2).click();
    await page.waitForTimeout(200);
    expect(await log(page)).toEqual([]);
    expect(await drawer(page, 'n').evaluate((el: any) => el.open)).toBe(true);
    await expect(panel(page, 'n')).toBeVisible();
    for (const other of context.pages()) if (other !== page) await other.close();
    // A plain activation follows the link here: change, then close.
    await cell(page, 'n', 1).click();
    await expect.poll(() => log(page)).toEqual(['change:#sent:#inbox', 'close:false']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#sent');
  });

  test('NVD-22: a closing modal drawer slides out over the exit motion (a collapsible one narrows over motion.expand) and returns focus to where it was — or drops it when that element is gone', async ({ page }) => {
    await mount(page, [fixture('m', MAIL, { variant: 'modal', open: false })]);
    await opener(page);
    await page.locator('#menu').focus();
    await drawer(page, 'm').evaluate((el: any) => (el.open = true));
    await expect.poll(() => activeValue(page)).toBe('inbox');
    const exit = await resolveToken(page, T('motion-exit-duration'), 'duration');
    await page.keyboard.press('Escape');
    const dialog = drawer(page, 'm').locator('dialog');
    expect(Number.parseFloat(await css(dialog, 'transition-duration'))).toBeCloseTo(exit / 1000, 3);
    expect(await activeValue(page)).toBe('menu');
    await drawer(page, 'm').evaluate((el: any) => (el.open = true));
    await expect.poll(() => activeValue(page)).toBe('inbox');
    await page.locator('#menu').evaluate((el) => el.remove());
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('body');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(dialog, 'transition-duration')).toBe('0s');
    // Collapsible: it narrows back to its column over the change's motion, and focus returns to the menu button.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mount(page, [rail('mc', MAIL, { variant: 'modal', open: false })]);
    await menu(page, 'mc').locator('button').click();
    await expect.poll(() => activeValue(page)).toBe('inbox');
    await page.keyboard.press('Escape');
    const narrowing = drawer(page, 'mc').locator('dialog');
    expect(Number.parseFloat(await css(narrowing, 'transition-duration'))).toBeCloseTo((await resolveToken(page, T('motion-expand-duration'), 'duration')) / 1000, 3);
    await expect.poll(() => activeValue(page)).toBe('header-button:Menu');
  });
});

test.describe('a collapsed cell’s name', () => {
  const tip = (page: P, id: string, n: number) => item(page, id, n).locator('tanrei-tooltip.tip');
  const surface = (page: P, id: string, n: number) => tip(page, id, n).locator('.surface');

  test('NVD-56: in collapsed, hovering Sent shows "Sent" in a plain tooltip beside the cell, toward the content, after the tooltip’s show delay, and the accessibility tree is unchanged; it goes when the pointer leaves, and on activation', async ({ page }) => {
    await mount(page, only('collapsed'), { reducedMotion: true });
    const stage = page.locator('[data-fixture="collapsed"]');
    await page.mouse.move(700, 5);
    const before = await stage.ariaSnapshot();
    await expect(tip(page, 'collapsed', 1)).toHaveCount(1);
    await expect(tip(page, 'collapsed', 1)).toHaveAttribute('aria-hidden', 'true');
    await expect(tip(page, 'collapsed', 1)).toHaveAttribute('no-describe', '');
    expect(await tip(page, 'collapsed', 1).evaluate((el: any) => [el.variant, el.placement, el.text])).toEqual(['plain', 'end', 'Sent']);
    // The tooltip answers no pointer itself: the cell is the one hit target (NVD-5's reason).
    expect(await css(tip(page, 'collapsed', 1), 'pointer-events')).toBe('none');
    const delay = await resolveToken(page, '--tanrei-comp-tooltip-motion-show-delay', 'duration');
    expect(delay).toBeGreaterThan(0);
    // The delay runs on the page's clock, held still and moved on by the test: not one millisecond before it, at it.
    await holdClock(page);
    await cell(page, 'collapsed', 1).hover();
    await page.clock.runFor(delay - 1);
    expect(await tip(page, 'collapsed', 1).evaluate((el: any) => el.open)).toBe(false);
    await page.clock.runFor(1);
    expect(await tip(page, 'collapsed', 1).evaluate((el: any) => el.open)).toBe(true);
    await releaseClock(page);
    await expect(surface(page, 'collapsed', 1)).toBeVisible();
    await expect(surface(page, 'collapsed', 1)).toHaveText('Sent');
    // Beside the item container, on the side of the content (the end), vertically on the cell.
    const [shown, c] = [await bounds(surface(page, 'collapsed', 1)), await bounds(box(page, 'collapsed', 1))];
    expect(shown.x).toBeGreaterThanOrEqual(c.x + c.width);
    expect(shown.y + shown.height / 2).toBeCloseTo(c.y + c.height / 2, 0);
    // Not added to the cell's name or description, which already hold it; nothing new is exposed.
    expect(await stage.ariaSnapshot()).toBe(before);
    expect(await cell(page, 'collapsed', 1).evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-description'), el.getAttribute('aria-describedby')])).toEqual(['Sent', null, null]);
    await page.mouse.move(700, 5);
    await expect(surface(page, 'collapsed', 1)).toBeHidden();
    // An activation closes it.
    await cell(page, 'collapsed', 2).hover();
    await expect(surface(page, 'collapsed', 2)).toBeVisible();
    await page.mouse.down();
    await page.mouse.up();
    await expect(surface(page, 'collapsed', 2)).toBeHidden();
  });

  test('NVD-56: keyboard focus shows the name at once and focus leaving hides it; a touch shows none; in collapsed-labels-always nothing is shown, because the label is drawn, and the expanded drawer has none; under labels selected only the cells without a label have one', async ({ page }) => {
    await mount(page, only('collapsed', 'collapsed-labels-always', 'collapsible-expanded', 'collapsed-labels-selected', 'collapsed-groups'), { reducedMotion: true });
    await page.mouse.click(700, 5);
    await tabTo(page, cell(page, 'collapsed', 0));
    await expect(surface(page, 'collapsed', 0)).toBeVisible();
    await expect(surface(page, 'collapsed', 0)).toHaveText('Inbox');
    await tabTo(page, cell(page, 'collapsed', 1));
    await expect(surface(page, 'collapsed', 0)).toBeHidden();
    await expect(surface(page, 'collapsed', 1)).toBeVisible();
    // Where the label is drawn there is nothing to show.
    for (const id of ['collapsed-labels-always', 'collapsible-expanded']) await expect(drawer(page, id).locator('tanrei-navigation-drawer-item').locator('tanrei-tooltip.tip')).toHaveCount(0);
    await cell(page, 'collapsed-labels-always', 1).hover();
    await page.waitForTimeout((await resolveToken(page, '--tanrei-comp-tooltip-motion-show-delay', 'duration')) + 150);
    expect(await page.locator('tanrei-tooltip.tip[open]').count()).toBeLessThanOrEqual(1);
    await expect(item(page, 'collapsed-labels-always', 1).locator('.short')).toHaveCSS('opacity', '1');
    // Labels selected: Starred draws its label and has no tooltip; the others have one.
    expect(await Promise.all([0, 1, 2, 3].map((n) => tip(page, 'collapsed-labels-selected', n).count()))).toEqual([1, 1, 0, 1]);
    // A group's cell is named the same way.
    await expect(group(page, 'collapsed-groups', 0).locator('tanrei-tooltip.tip').first()).toHaveCount(1);
    // A touch does not hover: nothing opens.
    await cell(page, 'collapsed', 3).dispatchEvent('pointerenter', { pointerType: 'touch' });
    await page.waitForTimeout((await resolveToken(page, '--tanrei-comp-tooltip-motion-show-delay', 'duration')) + 150);
    expect(await tip(page, 'collapsed', 3).evaluate((el: any) => el.open)).toBe(false);
  });

  test('NVD-56: keyboard focus on a cell outside the window shows its name once the browser has brought it into view, however many frames that takes', async ({ page }) => {
    // The page scrolls smoothly, so the focused cell comes into view over many frames, as WebKit sometimes brings it a
    // few frames late: the name must not be lost to a tooltip that opened while its anchor was still out of sight.
    await page.setViewportSize({ width: 800, height: 300 });
    await mount(page, only('collapsible-expanded', 'collapsed'), { reducedMotion: true });
    await page.addStyleTag({ content: 'html { scroll-behavior: smooth; }' });
    await page.mouse.click(790, 5);
    await tabTo(page, cell(page, 'collapsed', 0));
    // Back to the top of the page, with focus where it is: the next cell is then well below the window.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const target = cell(page, 'collapsed', 1);
    expect((await bounds(target)).y).toBeGreaterThan(300);
    await tab(page);
    await expect(target).toBeFocused();
    await expect(surface(page, 'collapsed', 1)).toBeVisible();
    await expect(surface(page, 'collapsed', 1)).toHaveText('Sent');
    const [shown, c] = [await bounds(surface(page, 'collapsed', 1)), await bounds(box(page, 'collapsed', 1))];
    expect(shown.x).toBeGreaterThanOrEqual(c.x + c.width);
  });

  test('NVD-56: keyboard focus on a cell that only touches the window\u2019s edge waits until part of it is seen, then shows its name', async ({ page }) => {
    // An intersection observer calls a box that touches the window's edge intersecting, though nothing of it is seen,
    // and a tooltip counts that anchor out of sight and closes at once: the name must open once part of it is seen.
    await page.setViewportSize({ width: 800, height: 300 });
    await mount(page, only('collapsible-expanded', 'collapsed'), { reducedMotion: true });
    await page.mouse.click(790, 5);
    await tabTo(page, cell(page, 'collapsed', 0));
    await expect(surface(page, 'collapsed', 0)).toBeVisible();
    // The next cell's box just below the window, its top on the window's bottom edge.
    const edge = await tip(page, 'collapsed', 1).evaluate((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - document.documentElement.clientHeight, behavior: 'instant' });
      return [el.getBoundingClientRect().top, document.documentElement.clientHeight];
    });
    expect(edge[0]).toBe(edge[1]);
    // Keyboard focus moves to it without scrolling (focus that follows keyboard focus is keyboard focus), and the
    // observers' answer for that layout has arrived: the cell's own, and one made after it, in the same task.
    const touching = await tip(page, 'collapsed', 1).evaluate(async (el) => {
      const answer = () => new Promise<IntersectionObserverEntry>((resolve) => {
        const observer = new IntersectionObserver((entries) => (observer.disconnect(), resolve(entries[0])));
        observer.observe(el);
      });
      const target = (el.getRootNode() as ShadowRoot).querySelector<HTMLElement>('.cell')!;
      target.focus({ preventScroll: true });
      const entry = await answer();
      await new Promise((resolve) => setTimeout(resolve));
      return { keyboard: target.matches(':focus-visible'), intersecting: entry.isIntersecting, ratio: entry.intersectionRatio, open: (el as HTMLElement & { open: boolean }).open };
    });
    expect(touching).toEqual({ keyboard: true, intersecting: true, ratio: 0, open: false });
    // Part of it comes into view: its name is shown.
    await page.evaluate(() => window.scrollBy({ top: 12, behavior: 'instant' }));
    await expect(surface(page, 'collapsed', 1)).toBeVisible();
    await expect(surface(page, 'collapsed', 1)).toHaveText('Sent');
  });
});

test.describe('a drawer that follows the window', () => {
  const RESPONSIVE = spec.fixtures.find((f) => f.id === 'responsive-wide')!;
  /** One responsive drawer alone in a window `width` wide, as the three responsive fixtures are drawn. */
  const inWindow = async (page: P, width: number, props: Fixture['props'] = {}, options: Parameters<typeof mountFixtures>[2] = {}) => {
    await page.setViewportSize({ width, height: 640 });
    await mount(page, [{ ...RESPONSIVE, id: 'r', props: { ...RESPONSIVE.props, ...props } }], options);
  };
  const resize = async (page: P, width: number) => {
    await page.setViewportSize({ width, height: 640 });
    await drawer(page, 'r').evaluate(async (el: any) => {
      await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
    });
  };
  const state = (page: P) =>
    drawer(page, 'r').evaluate((el: any) => ({ presentation: el.presentation, attribute: el.getAttribute('presentation'), open: el.open, expanded: el.expanded, variant: el.variant, collapsed: el.collapsed }));
  /** Logs the events of the drawer `r`. */
  const wire = (page: P) =>
    drawer(page, 'r').evaluate((el: any) => {
      const log: string[] = ((window as any).log = []);
      el.addEventListener('presentationchange', (e: CustomEvent) => {
        log.push(`presentation:${e.detail.presentation}`);
        // What is drawn when the change is announced: the new presentation, whole, with nothing on its way.
        const panel = el.shadowRoot.querySelector('.drawer');
        const moving = (node: any) => (node.getAnimations?.() ?? []).filter((a: any) => ['inline-size', 'width', 'translate'].includes(a.transitionProperty) && a.playState === 'running').length;
        (window as any).drawn = { tag: panel.localName, width: panel.getBoundingClientRect().width, host: el.getBoundingClientRect().width, running: moving(el) + moving(panel), instant: el.hasAttribute('data-instant'), formChange: el.hasAttribute('data-form-change'), sliding: el.hasAttribute('data-sliding') };
      });
      el.addEventListener('close', () => log.push('close'));
      el.addEventListener('expandedchange', (e: CustomEvent) => log.push(`expanded:${e.detail.expanded}`));
    });
  const log = (page: P) => page.evaluate(() => (window as any).log as string[]);

  test('NVD-53: the three responsive fixtures in their windows — 1280 wide the drawer is beside the content, expanded, shown whatever open says; 800 wide its column, in the layout; 400 wide, open, over the content with its scrim — and the two widths are 1024 and 600', async ({ page }) => {
    const only1 = (id: string) => spec.fixtures.filter((f) => f.id === id);
    const [width, column] = [240, 72];
    // responsive-wide: 1280.
    await page.setViewportSize(drawerWindow('responsive-wide'));
    expect(drawerWindow('responsive-wide').width).toBe(1280);
    await mount(page, only1('responsive-wide'), { reducedMotion: true });
    expect([await px(page, T('breakpoint-expanded')), await px(page, T('breakpoint-collapsed'))]).toEqual([1024, 600]);
    expect(await drawer(page, 'responsive-wide').evaluate((el: any) => [el.presentation, el.open, el.collapsed, el.getAttribute('presentation')])).toEqual(['standard', false, false, 'standard']);
    await expect(panel(page, 'responsive-wide')).toHaveJSProperty('localName', 'nav');
    expect((await bounds(drawer(page, 'responsive-wide'))).width).toBe(width);
    expect(await panel(page, 'responsive-wide').evaluate((el) => el.hasAttribute('inert'))).toBe(false);
    await expect(cell(page, 'responsive-wide', 0)).toBeVisible();
    // The stage stands for the window: as wide as it.
    expect((await bounds(page.locator('[data-fixture="responsive-wide"]'))).width).toBe(1280);
    // responsive-medium: 800.
    await page.setViewportSize(drawerWindow('responsive-medium'));
    expect(drawerWindow('responsive-medium').width).toBe(800);
    await mount(page, only1('responsive-medium'), { reducedMotion: true });
    expect(await drawer(page, 'responsive-medium').evaluate((el: any) => [el.presentation, el.open, el.collapsed])).toEqual(['column', false, true]);
    expect((await bounds(drawer(page, 'responsive-medium'))).width).toBe(column);
    await expect(drawer(page, 'responsive-medium').locator('nav.column')).toHaveCount(1);
    // Its column is drawn as a standard drawer's (NVD-40).
    expect(await css(panel(page, 'responsive-medium'), 'background-color')).toBe(await resolveColor(page, T('container-color-standard')));
    // responsive-narrow: 400, open.
    await page.setViewportSize(drawerWindow('responsive-narrow'));
    expect(drawerWindow('responsive-narrow').width).toBe(400);
    await mount(page, only1('responsive-narrow'), { reducedMotion: true });
    expect(await drawer(page, 'responsive-narrow').evaluate((el: any) => [el.presentation, el.open, el.collapsed])).toEqual(['modal', true, false]);
    await expect(drawer(page, 'responsive-narrow').locator('dialog[open]')).toHaveCount(1);
    expect(await drawer(page, 'responsive-narrow').locator('dialog').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(panel(page, 'responsive-narrow'), 'background-color')).toBe(await resolveColor(page, T('container-color-modal')));
    // Nothing in the layout.
    expect((await bounds(drawer(page, 'responsive-narrow')))?.height ?? 0).toBe(0);
  });

  test('NVD-53: a window exactly 1024 wide is standard and 1023 the column, 600 the column and 599 modal, and a drawer that is not collapsible is modal at 800; variant is ignored; each presentation behaves as the drawer it stands for; while responsive is false the window’s width is not read', async ({ page }) => {
    for (const [width, expected] of [
      [1024, 'standard'],
      [1023, 'column'],
      [600, 'column'],
      [599, 'modal'],
    ] as const) {
      await inWindow(page, width, { variant: 'modal' }, { reducedMotion: true });
      expect((await state(page)).presentation, `${width}`).toBe(expected);
    }
    await inWindow(page, 800, { collapsible: false }, { reducedMotion: true });
    expect((await state(page)).presentation).toBe('modal');
    // variant is ignored, and never written: a "modal" drawer in a wide window is a standard one, a nav beside the content.
    await inWindow(page, 1280, { variant: 'modal', open: false }, { reducedMotion: true });
    expect(await state(page)).toMatchObject({ presentation: 'standard', variant: 'modal', open: false });
    await expect(drawer(page, 'r').locator('dialog')).toHaveCount(0);
    expect(await css(panel(page, 'r'), 'background-color')).toBe(await resolveColor(page, T('container-color-standard')));
    // Standard: collapsible, in the form expanded chooses (NVD-30) — the menu button collapses it.
    await wire(page);
    await menu(page, 'r').click();
    expect(await state(page)).toMatchObject({ expanded: false, collapsed: true, presentation: 'standard' });
    expect(await log(page)).toEqual(['expanded:false']);
    // Column: the menu button opens it over the content (NVD-37, NVD-40), a destination closes it (NVD-21).
    await inWindow(page, 800, {}, { reducedMotion: true });
    await wire(page);
    await menu(page, 'r').click();
    await expect(drawer(page, 'r').locator('dialog[open]')).toHaveCount(1);
    expect(await state(page)).toMatchObject({ open: true, collapsed: false, presentation: 'column' });
    await cell(page, 'r', 1).click();
    await expect.poll(async () => (await state(page)).open).toBe(false);
    expect(await log(page)).toEqual(['expanded:true', 'close']);
    // Modal: a modal drawer that is not collapsible — closed it draws nothing, open it is the full drawer, and Escape closes it.
    await inWindow(page, 400, {}, { reducedMotion: true });
    await wire(page);
    expect(await state(page)).toMatchObject({ presentation: 'modal', collapsed: false });
    await expect(drawer(page, 'r').locator('dialog[open]')).toHaveCount(0);
    await setProps(page, 'r', { open: true });
    await expect(drawer(page, 'r').locator('dialog[open]')).toHaveCount(1);
    expect((await bounds(panel(page, 'r'))).width).toBe(240);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page)).open).toBe(false);
    expect(await log(page)).toEqual(['close']);
    // Not responsive: the width decides nothing, and nothing listens to it.
    await inWindow(page, 400, { responsive: false, open: true }, { reducedMotion: true });
    await wire(page);
    expect(await state(page)).toMatchObject({ presentation: null, attribute: null });
    await expect(drawer(page, 'r').locator('nav.standard')).toHaveCount(1);
    await resize(page, 1280);
    await resize(page, 400);
    expect(await log(page)).toEqual([]);
    await expect(drawer(page, 'r').locator('nav.standard')).toHaveCount(1);
  });

  test('NVD-54: open over the content at 800 wide and resized to 1280, the drawer is standard and expanded, has emitted one close and one presentationChange, and Tab leaves it; the change is drawn at once, without the motions of opening, closing or changing form', async ({ page }) => {
    await inWindow(page, 800, {}, { reducedMotion: false });
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<button id="after">After</button>'));
    await wire(page);
    await menu(page, 'r').click();
    await expect(drawer(page, 'r').locator('dialog[open]')).toHaveCount(1);
    await expect.poll(async () => (await bounds(panel(page, 'r'))).width).toBe(240);
    expect(await log(page)).toEqual(['expanded:true']);
    // Resized: when the change is announced the standard drawer is at its full width, and nothing is on its way.
    await resize(page, 1280);
    const drawn = await page.evaluate(() => (window as any).drawn);
    expect(drawn).toEqual({ tag: 'nav', width: 240, host: 240, running: 0, instant: true, formChange: false, sliding: false });
    expect(await state(page)).toMatchObject({ presentation: 'standard', open: false, expanded: true, collapsed: false });
    expect(await log(page)).toEqual(['expanded:true', 'close', 'presentation:standard']);
    await expect(drawer(page, 'r').locator('dialog')).toHaveCount(0);
    // The page behind is free again, and focus that the overlay kept inside is free to leave: Tab goes on to the content.
    await expect.poll(() => drawer(page, 'r').evaluate((el) => el.hasAttribute('data-instant'))).toBe(false);
    await page.locator('#after').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    await tabTo(page, cell(page, 'r', 0));
    await tabTo(page, page.locator('#after'));
    expect(await state(page)).toMatchObject({ presentation: 'standard', open: false });
  });

  test('NVD-54: collapsed by its menu button at 1280, resized to 800 and back, the drawer is collapsed again and no resize emitted expandedChange; resized from 1280 to 400 it draws nothing, in one frame, and an open group is still open when it is next shown; value is kept', async ({ page }) => {
    await inWindow(page, 1280, {}, { reducedMotion: false });
    await wire(page);
    await menu(page, 'r').click();
    expect(await state(page)).toMatchObject({ expanded: false, collapsed: true });
    // Resized while the collapse is still on its way: it stops where the new presentation puts it.
    await resize(page, 800);
    expect(await state(page)).toMatchObject({ presentation: 'column', expanded: false, open: false, collapsed: true });
    expect((await bounds(drawer(page, 'r'))).width).toBe(72);
    await resize(page, 1280);
    expect(await state(page)).toMatchObject({ presentation: 'standard', expanded: false, collapsed: true });
    expect((await bounds(drawer(page, 'r'))).width).toBe(72);
    expect(await log(page)).toEqual(['expanded:false', 'presentation:column', 'presentation:standard']);
    // Expanded again by the user, a group open, another destination chosen.
    await menu(page, 'r').click();
    await cell(page, 'r', 1).click();
    await expect(group(page, 'r', 0)).toHaveAttribute('open', '');
    expect(await drawer(page, 'r').evaluate((el: any) => el.value)).toBe('sent');
    // 1280 to 400: nothing in the layout, in the frame after.
    await page.setViewportSize({ width: 400, height: 640 });
    const gone = await drawer(page, 'r').evaluate(async (el: any) => {
      await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const dialog = el.shadowRoot.querySelector('dialog');
      return { presentation: el.presentation, dialog: !!dialog, open: dialog?.open ?? null, height: el.getBoundingClientRect().height, visible: dialog ? getComputedStyle(dialog).display : null };
    });
    expect(gone).toEqual({ presentation: 'modal', dialog: true, open: false, height: 0, visible: 'none' });
    expect(await state(page)).toMatchObject({ open: false, expanded: true });
    // Shown next: the group is still open, the value kept.
    await setProps(page, 'r', { open: true });
    await expect(drawer(page, 'r').locator('dialog[open]')).toHaveCount(1);
    await expect(group(page, 'r', 0)).toHaveAttribute('open', '');
    await expect(item(page, 'r', 2).locator('.cell')).toBeVisible();
    expect(await drawer(page, 'r').evaluate((el: any) => el.value)).toBe('sent');
    await expect(cell(page, 'r', 1)).toHaveAttribute('aria-current', 'page');
    expect((await log(page)).filter((entry) => entry.startsWith('expanded'))).toEqual(['expanded:false', 'expanded:true']);
    expect((await log(page)).at(-1)).toBe('presentation:modal');
  });

  test('NVD-54: presentationChange fires once when the presentation is first decided, without a close; focus on something the new presentation does not show moves to the menu button, and where it shows nothing is left to the platform', async ({ page }) => {
    // The first decision: heard by a listener that is there before the drawer is.
    await page.setViewportSize({ width: 1280, height: 640 });
    const html = await fixturesDocument(spec, { fixtures: [{ ...RESPONSIVE, id: 'r' }], icons: true });
    await page.setContent(html.replace('<body>', `<body><script>window.log = []; for (const type of ['presentationchange', 'close']) document.addEventListener(type, (e) => window.log.push(type + ':' + (e.detail ? e.detail.presentation : '')), true);</script>`));
    await page.waitForFunction(() => !!customElements.get('tanrei-navigation-drawer'));
    await drawer(page, 'r').evaluate((el: any) => el.updateComplete);
    expect(await log(page)).toEqual(['presentationchange:standard']);
    // Focus on an item inside a group (the column does not draw it) goes to the menu button.
    await page.mouse.click(700, 5);
    await tabTo(page, cell(page, 'r', 2));
    await resize(page, 800);
    /** The name of what has focus, wherever it is in the shadow trees. */
    const focusedName = () =>
      page.evaluate(() => {
        let active: Element | null = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        return active && active !== document.body ? (active.getAttribute('aria-label') ?? active.getAttribute('label')) : null;
      });
    await expect.poll(focusedName).toBe('Menu');
    // Focus on a top-level destination, which the column still shows, stays.
    await resize(page, 1280);
    await tabTo(page, cell(page, 'r', 1));
    await resize(page, 800);
    await expect.poll(focusedName).toBe('Sent');
    // Where the new presentation shows nothing, focus is the platform's: not in the drawer.
    await resize(page, 400);
    await expect.poll(focusedName).toBeNull();
    expect((await log(page)).filter((entry) => entry.startsWith('close'))).toEqual([]);
  });

  test('NVD-55: the presentation is derived from the width alone and written into no prop; open is false again after every change of presentation and every close; expanded is the user’s and is stored nowhere; a drawer created in a window 400 wide with open false shows nothing in its first frame and animates nothing', async ({ page }) => {
    // The first frame: decided before the element first renders, so nothing moves into place.
    await page.setViewportSize({ width: 400, height: 640 });
    const html = await fixturesDocument(spec, { fixtures: [{ ...RESPONSIVE, id: 'r' }], icons: true });
    await page.setContent(
      html.replace(
        '<body>',
        `<body><script>
          window.first = null;
          customElements.whenDefined('tanrei-navigation-drawer').then(() => {
            const el = document.querySelector('tanrei-navigation-drawer');
            // As it connects — before its first render — the presentation is already the window's.
            window.first = { presentation: el.presentation, as: el.getAttribute('data-as'), rendered: !!el.shadowRoot?.querySelector('.drawer') };
            el.updateComplete.then(() => {
              const dialog = el.shadowRoot.querySelector('dialog');
              window.frame = { open: dialog?.open ?? null, inert: !!el.shadowRoot.querySelector('[inert]'), running: document.getAnimations().length, height: el.getBoundingClientRect().height };
            });
          });
        </script>`,
      ),
    );
    await page.waitForFunction(() => !!(window as any).frame);
    expect(await page.evaluate(() => (window as any).first)).toEqual({ presentation: 'modal', as: 'modal', rendered: false });
    expect(await page.evaluate(() => (window as any).frame)).toEqual({ open: false, inert: false, running: 0, height: 0 });
    // Read-only, and written into no prop the product sets.
    await wire(page);
    expect(await drawer(page, 'r').evaluate((el: any) => {
      try {
        el.presentation = 'standard';
      } catch {
        // A getter without a setter throws in strict code; either way nothing changes.
      }
      return [el.presentation, el.variant, el.getAttribute('variant'), el.open, el.expanded, el.hasAttribute('collapsible')];
    })).toEqual(['modal', 'standard', 'standard', false, true, true]);
    // open is transient: false again after a close, and after a change of presentation.
    await setProps(page, 'r', { open: true });
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page)).open).toBe(false);
    await setProps(page, 'r', { open: true });
    await resize(page, 800);
    expect(await state(page)).toMatchObject({ open: false, presentation: 'column' });
    await resize(page, 1280);
    // expanded is the user's choice, kept for the element's lifetime and written to no storage.
    await menu(page, 'r').click();
    await resize(page, 400);
    await resize(page, 1280);
    expect(await state(page)).toMatchObject({ expanded: false, variant: 'standard' });
    // (A test document has no storage to look into; the element's own code names none.)
    expect(await drawer(page, 'r').evaluate((el) => /localStorage|sessionStorage|indexedDB|document\.cookie/.test(String(el.constructor)))).toBe(false);
    // A new drawer starts from its props again: nothing was remembered for it.
    await inWindow(page, 1280, {}, { reducedMotion: true });
    expect(await state(page)).toMatchObject({ expanded: true, collapsed: false });
  });

  test('NVD-55: before the width is known — the element not upgraded yet, as in markup rendered on a server — no dialog is open and nothing is inert', async ({ page }) => {
    // The fixture's markup alone, with no script: what a server sends, before the element is defined.
    const html = await fixturesDocument(spec, { fixtures: spec.fixtures.filter((f) => f.id === 'responsive-narrow'), icons: true });
    await page.setContent(html.replace(/<script type="module">[\s\S]*<\/script>/, ''));
    expect(await page.evaluate(() => !!customElements.get('tanrei-navigation-drawer'))).toBe(false);
    expect(await page.evaluate(() => ({ dialogs: document.querySelectorAll('dialog[open]').length, inert: document.querySelectorAll('[inert]').length, modal: document.querySelectorAll(':modal').length }))).toEqual({ dialogs: 0, inert: 0, modal: 0 });
    await expect(page.locator('tanrei-navigation-drawer-item').first()).toBeAttached();
  });
});

test.describe('a site’s sidebar', () => {
  const LONG = spec.fixtures.find((f) => f.id === 'site-sidebar-long')!;
  const RESTORED = spec.fixtures.find((f) => f.id === 'site-sidebar-restored')!;
  /** The long tree with other props, and each group's `open` as `open(label)` says (as the fixture has it where it says nothing). */
  const long = (props: Fixture['props'], open: (label: string) => boolean | undefined = () => undefined): Fixture => ({
    ...LONG,
    props: { ...LONG.props, ...props },
    items: LONG.items!.map((each) => (each.kind === 'group' ? { ...each, props: { ...each.props, open: open(String(each.props.label)) ?? each.props.open ?? false } } : each)),
  });
  const LINKS = [link('Inbox', '#inbox'), link('Sent', '#sent'), link('Drafts', '#drafts'), link('Trash', '#trash')];
  /**
   * What a page sees of a drawer from before its elements are upgraded: every frame in which its cells are drawn (how far
   * the items are scrolled, each group's shown height, what is animating, whether focus is still the page's), every
   * event the drawer and its groups fire, and every call to the browser's storage. (A function's own scope: a page
   * mounted twice keeps its window, and a second `const` of the same name would stop the script.)
   */
  const WATCH = `(() => {
    const seen = (window.seen = { frames: [], events: [], storage: 0 });
    for (const type of ['toggle', 'change', 'reselect', 'close']) {
      document.addEventListener(type, (event) => seen.events.push(type === 'toggle' ? 'toggle:' + event.target.label + ':' + event.detail.open : type), true);
    }
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      const original = Storage.prototype[method].__original || Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        seen.storage++;
        return original.apply(this, args);
      };
      Storage.prototype[method].__original = original;
    }
    const frame = () => {
      const drawer = document.querySelector('tanrei-navigation-drawer');
      const items = drawer && drawer.shadowRoot && drawer.shadowRoot.querySelector('.items');
      const cell = drawer && drawer.querySelector('tanrei-navigation-drawer-item');
      if (items && cell && cell.shadowRoot && cell.getBoundingClientRect().height > 0) {
        const roots = [drawer, ...drawer.querySelectorAll('*')].map((element) => element.shadowRoot).filter(Boolean);
        seen.frames.push({
          top: items.scrollTop,
          groups: [...drawer.querySelectorAll('tanrei-navigation-drawer-group')].map((group) => Math.round(group.shadowRoot.querySelector('.items').getBoundingClientRect().height)),
          moving: roots.flatMap((root) => root.getAnimations().map((animation) => animation.transitionProperty || animation.animationName || animation.id)),
          focus: document.activeElement === document.body,
        });
      }
      if (seen.frames.length < 20) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  })();`;
  type Seen = { frames: { top: number; groups: number[]; moving: string[]; focus: boolean }[]; events: string[]; storage: number };
  /** Mounts `fixtures` in a page that has watched them since before they were upgraded, and waits for twenty drawn frames. */
  const watched = async (page: P, fixtures: Fixture[], inline = '') => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const document = await fixturesDocument(spec, { icons: true, fixtures });
    // `inline`: a script of the page's own right after the drawer's markup, as a site's would stand.
    await page.setContent(document.replace('<head>', `<head><script>${WATCH}</script>`).replace('</main>', () => `</main><script>${inline}</script>`));
    await page.waitForFunction(() => (window as any).seen.frames.length >= 20);
  };
  const seen = (page: P) => page.evaluate(() => (window as any).seen as Seen);
  /** How far the items are scrolled, their range, and where the row that shows the selection (`.cell.selected`) is in the space they scroll in. */
  const scrolled = (page: P, id: string) =>
    drawer(page, id).evaluate((el: any) => {
      const items = el.shadowRoot.querySelector('.items') as HTMLElement;
      const space = items.getBoundingClientRect();
      const shower = [...el.querySelectorAll('tanrei-navigation-drawer-item, tanrei-navigation-drawer-group')].find((each: any) => each.shadowRoot.querySelector('.cell.selected')) as any;
      const row = shower?.shadowRoot.querySelector('.container').getBoundingClientRect();
      return { offset: el.scrollOffset as number, top: items.scrollTop, range: items.scrollHeight - items.clientHeight, height: items.scrollHeight, space: items.clientHeight, row: row ? row.top - space.top : null, centre: row ? row.top + row.height / 2 - (space.top + space.height / 2) : null };
    });
  /** Where a cell's row is: from the start of the items, and from the top of the space they scroll in. */
  const rowOf = (locator: Locator) =>
    locator.evaluate((el: any) => {
      const items = el.closest('tanrei-navigation-drawer').shadowRoot.querySelector('.items') as HTMLElement;
      const row = el.shadowRoot.querySelector('.container').getBoundingClientRect();
      const inView = row.top - items.getBoundingClientRect().top;
      return { inView, fromStart: inView + items.scrollTop, height: row.height };
    });
  const longItem = (page: P, href: string) => drawer(page, 'site-sidebar-long').locator(`tanrei-navigation-drawer-item[href="${href}"]`);
  const longGroup = (page: P, label: string) => drawer(page, 'site-sidebar-long').locator(`tanrei-navigation-drawer-group[label="${label}"]`);
  /** Logs what a drawer of links fires, what the click that caused it came to, and stops the browser where a test says so. */
  const wireLinks = (page: P) =>
    page.evaluate(() => {
      const log: string[] = ((window as any).log = []);
      const drawer = document.querySelector<any>('tanrei-navigation-drawer');
      for (const type of ['change', 'reselect']) {
        drawer.addEventListener(type, (e: any) => {
          log.push(`${type}:${e.detail.value}:${e.detail.href}:${drawer.value}:${location.hash}:${e.cancelable}`);
          if ((window as any).cancel) e.preventDefault();
        });
      }
      drawer.addEventListener('close', () => log.push('close'));
      // On the window, so after the drawer has heard the click: what the drawer left of it, and — only where a test
      // asks, and only now — the browser held back from opening a tab or saving a file.
      for (const type of ['click', 'auxclick', 'contextmenu']) {
        window.addEventListener(type, (e: any) => {
          const anchor = e.composedPath().find((node: any) => node.localName === 'a');
          if (!anchor) return;
          log.push(`${type}:${anchor.id === 'plain' ? 'plain' : 'drawer'}:${e.defaultPrevented ? 'prevented' : 'left alone'}`);
          if ((window as any).hold) e.preventDefault();
        });
      }
    });

  test('NVD-57: in site-sidebar-long, a frame 800 high, the items are scrolled by 3120 in the first frame and the selected row is centred; site-sidebar-restored stays at its 2900 because the row is in view there; no frame shows the items at 0 and focus does not move', async ({ page }) => {
    for (const [f, top, row] of [
      [LONG, 3120, 376],
      [RESTORED, 2900, 596],
    ] as const) {
      await watched(page, [f]);
      const { frames, events } = await seen(page);
      expect([...new Set(frames.map((each) => each.top))], f.id).toEqual([top]);
      expect(frames.every((each) => each.focus)).toBe(true);
      expect(events).toEqual([]);
      const at = await scrolled(page, f.id);
      // 77 cells, 4024 tall, in a frame 800 high; the selected row 3496 from the start of the items.
      expect(at).toMatchObject({ offset: top, top, height: 4024, space: 800, range: 3224, row });
      expect(at.row! + top).toBe(3496);
    }
    expect((await scrolled(page, RESTORED.id)).centre).not.toBe(0);
    await watched(page, [LONG]);
    expect((await scrolled(page, LONG.id)).centre).toBe(0);
  });

  test('NVD-57: when value changes the selection is brought into view at once — centred if it was not wholly in view, as far as the range allows, and not moved at all if it was — without motion and without moving focus; a closed group’s row that shows it is the row brought into view', async ({ page }) => {
    await mount(page, [LONG]);
    const set = (value: string) => drawer(page, LONG.id).evaluate(async (el: any, v) => {
      el.value = v;
      await el.updateComplete;
      // The cells are told, drawn, and the row is brought into view, all before the next frame.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return { top: el.scrollOffset, body: document.activeElement === document.body };
    }, value);
    // The first page of the site: far out of view, so centred — which the start of the range cuts short.
    expect(await set('/getting-started/')).toEqual({ top: 0, body: true });
    // In view: nothing moves, wherever in view it is.
    await drawer(page, LONG.id).evaluate((el: any) => (el.scrollOffset = 100));
    expect(await set('/getting-started/react/')).toEqual({ top: 100, body: true });
    expect(await set('/foundations/principles/')).toEqual({ top: 100, body: true });
    // Half out of view counts as out of view.
    const half = await rowOf(longItem(page, '/getting-started/web/'));
    await drawer(page, LONG.id).evaluate((el: any, to) => (el.scrollOffset = to), half.fromStart + 24);
    expect((await set('/getting-started/web/')).top).toBe(0);
    // Out of view below: centred exactly.
    const far = await rowOf(longItem(page, '/components/button/'));
    expect(await set('/components/button/')).toEqual({ top: far.fromStart + 24 - 400, body: true });
    expect((await scrolled(page, LONG.id)).centre).toBe(0);
    // The last page: centred as far as the end of the range allows.
    expect((await set('/roadmap/')).top).toBe(3224);
    // NVD-47's row: Components closed, its row shows the selection and is what is brought into view.
    await mount(page, [long({}, (label) => (label === 'Components' ? false : undefined))]);
    const closed = await scrolled(page, LONG.id);
    await expect(longGroup(page, 'Components').locator('.cell').first()).toHaveClass(/\bselected\b/);
    expect(closed.row).not.toBeNull();
    expect(closed.row! >= 0 && closed.row! + 48 <= closed.space).toBe(true);
    expect(closed.centre).toBe(0);
    // A standard drawer that was closed takes its place only now: the offset it was given, then its selection.
    await mount(page, [long({ open: false, scrollOffset: 2900 }), { ...long({ open: false }), id: RESTORED.id }], { reducedMotion: true });
    for (const id of [LONG.id, RESTORED.id]) await setProps(page, id, { open: true });
    expect(await scrolled(page, LONG.id)).toMatchObject({ top: 2900, row: 596 });
    expect(await scrolled(page, RESTORED.id)).toMatchObject({ top: 3120, centre: 0 });
  });

  test('NVD-58: in site-sidebar every group’s open is false and revealSelected draws Components open in the first frame, without the disclosure motion, with one toggle and no change, reselect or close; closed again by its row it shows the selection and stays closed until value changes; without revealSelected group-closed-selected is as before', async ({ page }) => {
    const SITE = spec.fixtures.find((f) => f.id === 'site-sidebar')!;
    expect(SITE.items!.filter((each) => each.kind === 'group').every((each) => !each.props.open)).toBe(true);
    await watched(page, [SITE]);
    const { frames, events } = await seen(page);
    // Getting started, Foundations, Components, Project: only the third is shown, at its full height, in every frame.
    const heights = frames.map((each) => each.groups.join(','));
    expect(new Set(heights).size).toBe(1);
    expect(frames[0].groups[0]).toBe(0);
    expect(frames[0].groups[1]).toBe(0);
    expect(frames[0].groups[2]).toBe(4 * 52);
    expect(frames[0].groups[3]).toBe(0);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    expect(events).toEqual(['toggle:Components:true']);
    const opens = () => drawer(page, 'site-sidebar').evaluate((el: any) => el.groups.map((g: any) => g.open));
    expect(await opens()).toEqual([false, false, true, false]);
    await expect(cell(page, 'site-sidebar', 8)).toHaveAttribute('aria-current', 'page');
    await expect(groupRow(page, 'site-sidebar', 2)).not.toHaveClass(/\bselected\b/);
    // The user closes it: its row shows the selection (NVD-47), and nothing opens it again while value is the same.
    await groupRow(page, 'site-sidebar', 2).click();
    await expect(groupRow(page, 'site-sidebar', 2)).toHaveClass(/\bselected\b/);
    await groupRow(page, 'site-sidebar', 0).click();
    await setProps(page, 'site-sidebar', { label: 'Docs' });
    expect(await opens()).toEqual([true, false, false, false]);
    // value changes: the group that holds the new page opens, with the motion this time; the others are left alone.
    await page.evaluate(() => ((window as any).seen.events.length = 0));
    const moving = await drawer(page, 'site-sidebar').evaluate(async (el: any) => {
      el.value = '/foundations/color/';
      await el.updateComplete;
      await el.groups[1].updateComplete;
      // Read in the page, as soon as the group is drawn open: a loaded browser may take longer than the motion to answer the test.
      return el.groups[1].shadowRoot.querySelector('.items').getAnimations().length as number;
    });
    expect(moving).toBeGreaterThan(0);
    expect(await opens()).toEqual([true, true, false, false]);
    await setProps(page, 'site-sidebar', { value: '/components/navigation-drawer/' });
    expect(await opens()).toEqual([true, true, true, false]);
    expect((await seen(page)).events).toEqual(['toggle:Foundations:true', 'toggle:Components:true']);
    // Turned on later, it shows the selection it has; collapsed, the groups are opened all the same.
    await mount(page, [{ ...SITE, id: 'late', props: { ...SITE.props, revealSelected: false } }, rail('c', [grp('Projects', [d('tanrei', 'Tanrei')], { icon: 'folder' })], { value: 'tanrei', revealSelected: true })], { reducedMotion: true });
    expect(await drawer(page, 'late').evaluate((el: any) => el.groups.map((g: any) => g.open))).toEqual([false, false, false, false]);
    await expect(groupRow(page, 'late', 2)).toHaveClass(/\bselected\b/);
    await setProps(page, 'late', { revealSelected: true });
    expect(await drawer(page, 'late').evaluate((el: any) => el.groups.map((g: any) => g.open))).toEqual([false, false, true, false]);
    expect(await drawer(page, 'c').evaluate((el: any) => [el.collapsed, el.groups[0].open])).toEqual([true, true]);
    // revealSelected false: a closed group stays closed and shows the selection.
    await mount(page, only('group-closed-selected'), { reducedMotion: true });
    expect(await drawer(page, 'group-closed-selected').evaluate((el: any) => el.groups.map((g: any) => g.open))).toEqual([false]);
    await expect(groupRow(page, 'group-closed-selected', 0)).toHaveClass(/\bselected\b/);
  });

  test('NVD-59: a destination with an href is an anchor with that address, drawn exactly as a button destination and with its hit area; a control-, command-, shift- and middle click and the context menu are the browser’s — the drawer prevents none and does what a plain anchor does; Space does not activate it; its href stands as its value; disabled, it is a link without an address', async ({ page, context, browserName }) => {
    await mount(page, [fixture('k', [d('inbox', 'Inbox', 'inbox'), d('sent', 'Sent', 'send'), link('Drafts', '#drafts', { icon: 'draft' }), link('Trash', '#trash', { icon: 'delete' }), link('Spam', '#spam', { icon: 'report', disabled: true })], { value: 'inbox' })], { reducedMotion: true });
    await page.mouse.move(700, 5);
    await expect(cell(page, 'k', 2)).toHaveJSProperty('localName', 'a');
    await expect(cell(page, 'k', 2)).toHaveAttribute('href', '#drafts');
    await expect(cell(page, 'k', 1)).toHaveJSProperty('localName', 'button');
    // The same tokens in every condition: a link beside a button, unselected and selected.
    expect(await drawn(item(page, 'k', 2))).toEqual(await drawn(item(page, 'k', 1)));
    expect(await drawn(item(page, 'k', 2))).toEqual(await expected(page, 'unselected'));
    const size = async (n: number) => {
      const b = await bounds(cell(page, 'k', n));
      return [b.width, b.height];
    };
    expect(await size(2)).toEqual(await size(1));
    // NVD-6: the hit area is the link's.
    expect(await cell(page, 'k', 2).evaluate((el) => [getComputedStyle(el, '::before').position, el.matches('a[href]')])).toEqual(['absolute', true]);
    // No look of its own for a visited link.
    expect(await item(page, 'k', 2).evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes(':visited'))))).toBe(false);
    // Its href stands as its value: the page names itself by its address and the link is the selected one.
    expect(await item(page, 'k', 2).evaluate((el: any) => [el.value, el.hasAttribute('value')])).toEqual(['#drafts', false]);
    await setProps(page, 'k', { value: '#drafts' });
    await expect(cell(page, 'k', 2)).toHaveAttribute('aria-current', 'page');
    expect(await drawn(item(page, 'k', 2))).toEqual(await expected(page, 'selected'));
    await setProps(page, 'k', { value: 'inbox' });
    // Disabled: the link role, the disabled state and no address; nothing opens and nothing is fired.
    await expect(cell(page, 'k', 4)).toHaveJSProperty('localName', 'a');
    expect(await cell(page, 'k', 4).evaluate((el) => [el.getAttribute('href'), el.getAttribute('role'), el.getAttribute('aria-disabled')])).toEqual([null, 'link', 'true']);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<a id="plain" href="#plain" style="position:fixed;inset-inline-end:8px;inset-block-start:8px">Plain</a>'));
    await wireLinks(page);
    await cell(page, 'k', 4).click({ force: true });
    await item(page, 'k', 4).evaluate((el: HTMLElement) => el.click());
    expect((await log(page)).filter((each) => !each.startsWith('click:'))).toEqual([]);
    expect(await page.evaluate(() => location.hash)).toBe('');
    await page.evaluate(() => ((window as any).log.length = 0));
    // Space scrolls, as on any link, and shows no pressed state.
    await tabTo(page, cell(page, 'k', 2));
    await page.keyboard.down('Space');
    await expect(box(page, 'k', 2)).not.toHaveAttribute('data-pressed');
    await page.keyboard.up('Space');
    expect(await log(page)).toEqual([]);
    // What the browser does with an anchor, it does with this one: the same events reach the page, none of them
    // prevented, as many tabs or windows open as a plain anchor opens, and the drawer fires nothing.
    // How many tabs or windows a press opened: counted until the number has stood still for a while (a loaded browser
    // opens them late), or until it is the number `wanted`.
    const opened = async (press: () => Promise<void>, wanted?: number) => {
      const before = context.pages().length;
      await press();
      let pages = -1;
      for (let turn = 0, still = 0; turn < 60 && still < 8; turn++) {
        await page.waitForTimeout(100);
        const now = context.pages().length - before;
        still = now === pages && (wanted === undefined || now === wanted) ? still + 1 : 0;
        pages = now;
      }
      for (const other of context.pages()) if (other !== page) await other.close();
      const said = await log(page);
      // Whether this page itself went to the link, and back to where it was for the next press.
      const navigated = await page.evaluate(() => {
        (window as any).log.length = 0;
        const went = location.hash !== '';
        if (went) location.hash = '';
        return went;
      });
      return { pages, said, navigated };
    };
    const plain = page.locator('#plain');
    for (const press of [{ modifiers: ['ControlOrMeta'] }, { modifiers: ['Shift'] }, { button: 'middle' }, { button: 'right' }] as const) {
      const there = await opened(() => plain.click(press));
      const here = await opened(() => cell(page, 'k', 3).click(press), there.pages);
      const what = `${browserName} ${JSON.stringify(press)}`;
      expect(here.said.every((each) => /^(click|auxclick|contextmenu):drawer:left alone$/.test(each)), `${what}: ${here.said}`).toBe(true);
      expect(here.said.map((each) => each.replace(':drawer:', ':')), what).toEqual(there.said.map((each) => each.replace(':plain:', ':')));
      // The count of tabs is compared where the browser reports a new tab before the press returns. Firefox and WebKit
      // report theirs late under load — a tab of the press before turns up in the next count — so there the events
      // that reached the page, none of them prevented, are the evidence.
      if (browserName === 'chromium') expect(here.pages, what).toBe(there.pages);
      expect(here.navigated, what).toBe(there.navigated);
    }
    expect(await drawer(page, 'k').evaluate((el: any) => el.value)).toBe('inbox');
  });

  test('NVD-60: a plain click on a link that is not selected emits one cancelable change with its value and href before the link is followed, leaves value to the page and navigates; cancelled, it does not navigate; a modified click, a link to a new context and a download emit nothing and change nothing; click() and Enter count, Enter with a modifier does not', async ({ page, context }) => {
    await mount(page, [fixture('k', [...LINKS, link('Help', '#help', { target: 'new', targetLabel: 'opens in a new tab' }), link('Export', '#export', { download: 'mail.txt' }), d('local', 'Local', '', { href: '#local' })], { value: '#inbox' })], { reducedMotion: true });
    await wireLinks(page);
    const said = async () => {
      const all = await log(page);
      await page.evaluate(() => ((window as any).log.length = 0));
      return all;
    };
    const state = () => drawer(page, 'k').evaluate((el: any) => [el.value, location.hash, el.items.findIndex((each: any) => each.selected)]);
    // The event carries the value and the href, is cancelable, and comes while the page is still where it was; the
    // click is left alone, so the browser follows the link at once — nothing waits for the press to have been shown.
    await cell(page, 'k', 1).click();
    expect(await said()).toEqual(['change:#sent:#sent:#inbox::true', 'click:drawer:left alone']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#sent');
    expect(await state()).toEqual(['#inbox', '#sent', 0]);
    // A value of its own is what is carried, beside the address.
    await cell(page, 'k', 6).click();
    expect(await said()).toEqual(['change:local:#local:#inbox:#sent:true', 'click:drawer:left alone']);
    // The product that routes by itself cancels it: the link is not followed.
    await page.evaluate(() => ((window as any).cancel = true));
    await cell(page, 'k', 2).click();
    expect(await said()).toEqual(['change:#drafts:#drafts:#inbox:#local:true', 'click:drawer:prevented']);
    await page.waitForTimeout(100);
    expect(await state()).toEqual(['#inbox', '#local', 0]);
    await page.evaluate(() => ((window as any).cancel = false));
    // The selected link again: reselect, as change.
    await cell(page, 'k', 0).click();
    expect(await said()).toEqual(['reselect:#inbox:#inbox:#inbox:#local:true', 'click:drawer:left alone']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#inbox');
    // click() — the default action of assistive technology — and Enter count.
    await item(page, 'k', 3).evaluate((el: HTMLElement) => el.click());
    expect(await said()).toEqual(['change:#trash:#trash:#inbox:#inbox:true', 'click:drawer:left alone']);
    await tabTo(page, cell(page, 'k', 1));
    await page.keyboard.press('Enter');
    expect(await said()).toEqual(['change:#sent:#sent:#inbox:#trash:true', 'click:drawer:left alone']);
    // Opened somewhere else: nothing is fired, value and the drawn selection stay. (The browser is held back only
    // after the drawer has heard the click, so that the test opens no window and saves no file.)
    await page.evaluate(() => ((window as any).hold = true));
    for (const press of [() => cell(page, 'k', 2).click({ modifiers: ['ControlOrMeta'] }), () => cell(page, 'k', 2).click({ modifiers: ['Shift'] }), () => cell(page, 'k', 2).click({ modifiers: ['Alt'] }), () => cell(page, 'k', 2).click({ button: 'middle' }), () => cell(page, 'k', 4).click(), () => cell(page, 'k', 5).click()]) {
      await press();
      expect((await said()).filter((each) => !/^(click|auxclick):drawer:left alone$/.test(each))).toEqual([]);
    }
    await tabTo(page, cell(page, 'k', 2));
    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('Shift+Enter');
    expect((await said()).filter((each) => !/^click:drawer:left alone$/.test(each))).toEqual([]);
    expect(await state()).toEqual(['#inbox', '#sent', 0]);
    expect(context.pages().length).toBe(1);
    // A click the product already cancelled is not an activation either.
    await item(page, 'k', 2).evaluate((el) => el.addEventListener('click', (e) => e.preventDefault(), { capture: true }));
    await cell(page, 'k', 2).click();
    expect(await said()).toEqual(['click:drawer:prevented']);
  });

  test('NVD-61: scrollOffset reads the present distance and writes it at once, held inside the range (5000 gives 3224 in site-sidebar-long); the attribute is read for the first frame only; a wheel turned past the end of the items leaves the page where it was; closing and opening Foundations with its row 200 from the top leaves the row at 200; keyboard focus on a cell that is not wholly in view scrolls it by the least distance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await mount(page, [LONG], { reducedMotion: true });
    const long = drawer(page, LONG.id);
    const offset = (to?: number) => long.evaluate((el: any, to) => (to === undefined ? el.scrollOffset : ((el.scrollOffset = to), el.scrollOffset)), to);
    expect(await offset()).toBe(3120);
    expect(await offset(5000)).toBe(3224);
    expect(await offset(-40)).toBe(0);
    expect(await offset(1234)).toBe(1234);
    expect((await scrolled(page, LONG.id)).top).toBe(1234);
    expect(await long.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.items')!).scrollBehavior)).toBe('auto');
    // The header stays (NVD-12): there is none here, and the scroller is the list alone.
    // After the first frame the attribute is not read again: a page that renders the same markup twice does not pull the drawer back.
    await long.evaluate((el) => el.setAttribute('scroll-offset', '10'));
    expect(await offset()).toBe(1234);
    // The user's own scrolling is read back, and fires nothing the drawer defines.
    await wire(page);
    await page.mouse.move(100, 300);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => offset()).toBe(1534);
    expect(await log(page)).toEqual([]);
    // Past the end of the items the page behind stays where it is; the same wheel beside the drawer does scroll it.
    await page.evaluate(() => (document.body.style.minBlockSize = '3000px'));
    expect(await long.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.items')!).overscrollBehaviorY)).toBe('contain');
    await offset(5000);
    for (let turn = 0; turn < 4; turn++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await offset()).toBe(3224);
    await page.mouse.move(900, 300);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // The page is put back once the wheel's scroll has ended: an engine may take a turn over many frames (WebKit on
    // Linux: ten or so), and what is left of it would move the page again under what is read next.
    await atRest(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    // A group that closes or opens keeps its own row where it is; only what follows moves.
    const foundations = longGroup(page, 'Foundations');
    const row = foundations.locator('.cell').first();
    await offset((await rowOf(foundations)).fromStart - 200);
    expect((await rowOf(foundations)).inView).toBe(200);
    const below = longGroup(page, 'Token reference');
    const before = (await rowOf(below)).inView;
    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    expect((await rowOf(foundations)).inView).toBe(200);
    expect((await rowOf(below)).inView).toBe(before - 14 * 52);
    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    expect((await rowOf(foundations)).inView).toBe(200);
    expect((await rowOf(below)).inView).toBe(before);
    // Keyboard focus: a cell half below the fold comes up by exactly what shows it whole, and one half above it comes
    // down by the same; one wholly in view moves nothing.
    const cells = long.locator('tanrei-navigation-drawer-item');
    await tabTo(page, cells.nth(40).locator('.cell'));
    const next = await rowOf(cells.nth(41));
    await offset(next.fromStart - 800 + 24);
    await tab(page);
    await expect(cells.nth(41)).toBeFocused();
    expect(await offset()).toBe(next.fromStart + 48 - 800);
    await tab(page);
    await expect(cells.nth(42)).toBeFocused();
    expect(await offset()).toBe(next.fromStart + 48 - 800 + 52);
    const previous = await rowOf(cells.nth(41));
    await offset(previous.fromStart + 24);
    await tab(page, { back: true });
    await expect(cells.nth(41)).toBeFocused();
    expect(await offset()).toBe(previous.fromStart);
    await offset(previous.fromStart - 300);
    await tab(page);
    await expect(cells.nth(42)).toBeFocused();
    expect(await offset()).toBe(previous.fromStart - 300);
  });

  test('NVD-58, NVD-62: a state the product gives back loses to revealSelected in the first frame — a group given open false by a script before its element is upgraded, or closed again by the product before that frame, is drawn open where it holds the selected destination, without motion and with one toggle; once the frame is drawn, a group the product closes stays closed until value changes', async ({ page }) => {
    const SITE = spec.fixtures.find((f) => f.id === 'site-sidebar')!;
    const opens = () => drawer(page, 'site-sidebar').evaluate((el: any) => el.groups.map((g: any) => g.open));
    // What a site gives back from its own storage, as the README's script does — `open = false` on every group, as a property, by an inline script after
    // the drawer's markup and before the elements are upgraded. The group that holds the page opens all the same.
    await watched(page, [SITE], `document.querySelectorAll('tanrei-navigation-drawer-group').forEach((group) => { if (customElements.get('tanrei-navigation-drawer-group')) throw new Error('upgraded already'); group.open = false; });`);
    let { frames, events } = await seen(page);
    expect(new Set(frames.map((each) => each.groups.join(','))).size, 'the same in every frame').toBe(1);
    expect(frames[0].groups).toEqual([0, 0, 4 * 52, 0]);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    expect(events).toEqual(['toggle:Components:true']);
    expect(await opens()).toEqual([false, false, true, false]);
    await expect(drawer(page, 'site-sidebar').locator('tanrei-navigation-drawer-group').nth(2)).toHaveAttribute('open', '');
    await expect(cell(page, 'site-sidebar', 8)).toHaveAttribute('aria-current', 'page');
    // The others are as they were given back: one given open is open, with no event of its own.
    await watched(page, [SITE], `document.querySelectorAll('tanrei-navigation-drawer-group').forEach((group, index) => (group.open = index === 0));`);
    ({ frames, events } = await seen(page));
    expect(frames[0].groups.map((height) => height > 0)).toEqual([true, false, true, false]);
    expect(new Set(frames.map((each) => each.groups.join(','))).size).toBe(1);
    expect(events).toEqual(['toggle:Components:true']);
    expect(await opens()).toEqual([true, false, true, false]);
    // Closed again by the product once the drawer has opened it and before the first frame is drawn (the page's script
    // answers the toggle): still the first frame's, so it is drawn open — and the one toggle has been fired.
    // (Only before a frame is drawn: where the module ran before this script the toggle was fired already, and the
    // script that gave the state back late, above, was that case.)
    await watched(page, [SITE], `document.addEventListener('toggle', (event) => { if (!window.seen.frames.length) queueMicrotask(() => (event.target.open = false)); });`);
    ({ frames, events } = await seen(page));
    expect(frames[0].groups).toEqual([0, 0, 4 * 52, 0]);
    expect(new Set(frames.map((each) => each.groups.join(','))).size).toBe(1);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    expect(events).toEqual(['toggle:Components:true']);
    expect(await opens()).toEqual([false, false, true, false]);
    // Once the first frame is drawn the group is as its open says: closed by the product it stays closed, its row
    // showing the selection (NVD-47), until value changes.
    await drawer(page, 'site-sidebar').evaluate(async (el: any) => {
      el.groups[2].open = false;
      await el.groups[2].updateComplete;
      await el.updateComplete;
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await opens()).toEqual([false, false, false, false]);
    await expect(groupRow(page, 'site-sidebar', 2)).toHaveClass(/\bselected\b/);
    expect((await seen(page)).events).toEqual(['toggle:Components:true']);
    const other = await drawer(page, 'site-sidebar').evaluate((el: any) => el.groups[2].querySelector('tanrei-navigation-drawer-item:not([selected])')?.value ?? el.items.filter((each: any) => each.closest('tanrei-navigation-drawer-group') === el.groups[2]).find((each: any) => each.value !== el.value).value);
    await setProps(page, 'site-sidebar', { value: other });
    await expect.poll(opens).toEqual([false, false, true, false]);
  });

  test('NVD-62, NVD-35: a drawer first drawn collapsed draws every cell collapsed in its first frame and animates nothing — the first destination included, whichever is selected: the change of form’s motion is for a change of form', async ({ page }) => {
    for (const value of ['inbox', 'drafts']) {
      await watched(page, [rail('c', MAIL, { value })]);
      const { frames, events } = await seen(page);
      expect(frames.flatMap((each) => each.moving), value).toEqual([]);
      expect(events, value).toEqual([]);
      const column = await px(page, T('collapsed-item-container-width-regular'));
      for (const n of [0, 1, 2, 3]) expect((await bounds(box(page, 'c', n))).width, `${value} ${n}`).toBe(column);
    }
  });

  test('NVD-62: a drawer rendered with two groups’ open, a scrollOffset and a value shows all four in its first frame and animates nothing; the first frame’s order is the groups as given, what revealSelected opens, the offset, then the selection; nothing is read from or written to the browser’s storage', async ({ page }) => {
    // Two groups open as the product kept them, the place it kept, and the page: all in view, so nothing else moves.
    await watched(page, [long({ scrollOffset: 100, value: '/getting-started/react/' }, (label) => label === 'Getting started' || label === 'Components')]);
    let { frames, events } = await seen(page);
    expect([...new Set(frames.map((each) => each.top))]).toEqual([100]);
    expect(new Set(frames.map((each) => each.groups.join(','))).size).toBe(1);
    expect(frames[0].groups.map((height) => height > 0)).toEqual([true, false, false, true, false]);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    expect(events).toEqual([]);
    expect(await drawer(page, LONG.id).evaluate((el: any) => el.items.find((each: any) => each.selected)?.label)).toBe('React');
    // The order: every group closed as the product gave it; revealSelected opens Components; the items go to the
    // offset given; and only then is the selection looked for — out of view at 40, so it is centred. Had the selection
    // been brought into view before the group was open, or the offset written last, the drawer would stand at 40.
    await watched(page, [long({ scrollOffset: 40, revealSelected: true }, () => false)]);
    ({ frames, events } = await seen(page));
    expect(events).toEqual(['toggle:Components:true']);
    expect(new Set(frames.map((each) => each.top)).size).toBe(1);
    expect(frames[0].top).toBeGreaterThan(40);
    expect(frames[0].groups.map((height) => height > 0)).toEqual([false, false, false, true, false]);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    const at = await scrolled(page, LONG.id);
    expect(at.top === at.range || at.centre === 0).toBe(true);
    // An offset alone, with no destination selected, is where the drawer stands.
    await watched(page, [long({ scrollOffset: 700, value: '' })]);
    expect([...new Set((await seen(page)).frames.map((each) => each.top))]).toEqual([700]);
    // What a site gives back from its own storage, by an inline script after the drawer's markup — properties set on
    // elements that are upgraded only afterwards: the first frame is that state.
    await watched(
      page,
      [long({ value: '/tokens/color/' })],
      `{
        const drawer = document.querySelector('tanrei-navigation-drawer');
        drawer.querySelectorAll('tanrei-navigation-drawer-group').forEach((group, index) => (group.open = index !== 1));
        drawer.scrollOffset = 250;
      }`,
    );
    ({ frames, events } = await seen(page));
    expect([...new Set(frames.map((each) => each.top))]).toEqual([250]);
    expect(frames[0].groups.map((height) => height > 0)).toEqual([true, false, true, true, true]);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    expect(events).toEqual([]);
    // Nothing is kept: the user scrolls, opens and closes, follows a link and the value changes — the storage is never
    // touched, and a new drawer of the same markup starts from its markup.
    await longGroup(page, 'Foundations').locator('.cell').first().click();
    await page.mouse.move(100, 300);
    await page.mouse.wheel(0, 200);
    await setProps(page, LONG.id, { value: '/status/' });
    await drawer(page, LONG.id).evaluate((el: any) => (el.scrollOffset = 300));
    expect((await seen(page)).storage).toBe(0);
    expect(await page.evaluate(() => Object.keys((window as any).seen).includes('storage'))).toBe(true);
    await watched(page, [long({ scrollOffset: 700, value: '' })]);
    expect(await drawer(page, LONG.id).evaluate((el: any) => [el.scrollOffset, el.groups.map((g: any) => g.open)])).toEqual([700, [true, true, true, true, true]]);
  });

  test('NVD-63: in site-sidebar Source code opens a new tab without a handle to this page, ends in open_in_new at trailing-icon.size in its condition’s trailing icon color, mirrored in right-to-left and hidden from assistive technology, and is described as "opens in a new tab"; no other row has a mark; trailing text or slot content stands in its place and the description is still said; an empty targetLabel is reported', async ({ page }) => {
    const said = warnings(page);
    await mount(page, only('site-sidebar'), { reducedMotion: true });
    await page.mouse.move(700, 5);
    const site = drawer(page, 'site-sidebar');
    const source = site.locator('tanrei-navigation-drawer-item[label="Source code"]');
    const anchor = source.locator('.cell');
    expect(await anchor.evaluate((el) => [el.localName, el.getAttribute('href'), el.getAttribute('target'), el.getAttribute('rel'), el.getAttribute('aria-description')])).toEqual(['a', 'https://example.com/tanrei', '_blank', 'noopener', 'opens in a new tab']);
    const mark = source.locator('.link-mark');
    await expect(mark).toHaveText('open_in_new');
    await expect(site.locator('.link-mark')).toHaveCount(1);
    const size = await px(page, T('item-trailing-icon-size-regular'));
    expect(await bounds(mark)).toMatchObject({ width: size, height: size });
    expect(await css(mark, 'color')).toBe(await resolveColor(page, T('unselected-item-trailing-icon-color')));
    expect(await css(mark, 'font-size')).toBe(`${size}px`);
    // Where trailing content is: item.padding-inline from the row's end.
    const row = await bounds(source.locator('.row > .container'));
    const at = await bounds(mark);
    expect(row.x + row.width - (at.x + at.width)).toBeCloseTo(await px(page, T('item-padding-inline-regular')), 1);
    // Decorative, and not interactive: inside the row's inert, hidden trailing box.
    expect(await mark.evaluate((el) => [el.closest('[aria-hidden="true"]') !== null, el.closest('[inert]') !== null])).toEqual([true, true]);
    // The icon set marks the name, so the helper mirrors it in a right-to-left layout.
    expect(await mark.evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform])).toEqual([true, 'none']);
    // No mark on a link that stays, on Tabs (which has trailing text) or on a group's row; the rest say nothing of a target.
    await expect(site.locator('tanrei-navigation-drawer-item[label="Tabs"] .trailing-text')).toHaveText('New');
    await expect(site.locator('tanrei-navigation-drawer-item[label="Button"] .cell')).not.toHaveAttribute('aria-description');
    await expect(site.locator('tanrei-navigation-drawer-item[label="Button"] .cell')).not.toHaveAttribute('target');
    // Selected, the mark takes the selected condition's color.
    await setProps(page, 'site-sidebar', { value: 'https://example.com/tanrei' });
    await expect.poll(() => css(mark, 'color')).toBe(await resolveColor(page, T('selected-item-trailing-icon-color')));
    await mount(page, only('site-sidebar'), { reducedMotion: true, dir: 'rtl' });
    expect(await mark.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    // The product's own trailing content stands; the words are said all the same, after the badge and the trailing content.
    const NEW = { target: 'new', targetLabel: 'opens in a new tab' };
    await mount(page, [
      fixture('t', [
        link('Text', '#a', { ...NEW, trailingText: '24' }),
        { ...link('Slot', '#b', NEW), content: 'launch' },
        link('Badge', '#c', { ...NEW, icon: 'inbox', badge: true, badgeCount: 3, badgeLabel: '3 unread', trailingText: 'New' }),
        link('Same', '#d', { target: 'same', targetLabel: 'opens in a new tab' }),
        link('Html', '#e', { target: '_blank', targetLabel: 'opens in a new tab' }),
        link('Silent', '#f', { target: 'new' }),
        d('button', 'Button', '', NEW),
      ]),
      rail('c', [link('Out', '#g', { ...NEW, icon: 'launch' })], { value: '' }),
    ], { reducedMotion: true });
    const described = (id: string, n: number) => cell(page, id, n).evaluate((el) => [el.getAttribute('aria-description'), el.getAttribute('target'), el.parentNode!.querySelectorAll('.link-mark').length]);
    expect(await described('t', 0)).toEqual(['24, opens in a new tab', '_blank', 0]);
    expect(await described('t', 1)).toEqual(['opens in a new tab', '_blank', 0]);
    expect(await described('t', 2)).toEqual(['3 unread, New, opens in a new tab', '_blank', 0]);
    // target same: no mark, and targetLabel is ignored.
    expect(await described('t', 3)).toEqual([null, null, 0]);
    // HTML's spelling is read as `new`.
    expect(await described('t', 4)).toEqual(['opens in a new tab', '_blank', 1]);
    // Without the words it still renders, marked, and says so in a debug build.
    expect(await described('t', 5)).toEqual([null, '_blank', 1]);
    await expect.poll(() => said.filter((each) => each.includes('NVD-63')).length).toBe(1);
    expect(said.join('\n')).toMatch(/opens a new context and targetLabel is empty.*NVD-63/);
    // NVD-64: without an address there is no link, so no target, no words and no mark.
    expect(await described('t', 6)).toEqual([null, null, 0]);
    // Collapsed, the trailing content is not drawn; the description is said in both forms.
    expect(await described('c', 0)).toEqual(['opens in a new tab', '_blank', 1]);
    expect(await css(item(page, 'c', 0).locator('.trailing'), 'opacity')).toBe('0');
  });

  test('NVD-64: an unknown target is same and is reported; an href of white space makes a button and says nothing; a javascript: address and one that cannot be read make a button and are reported; without an href target and targetLabel are ignored', async ({ page }) => {
    const said = warnings(page);
    await mount(page, [
      fixture('k', [
        link('Frame', '#a', { target: 'sidebar', targetLabel: 'opens in a new tab' }),
        link('Blank', '   '),
        link('Script', 'javascript:alert(1)'),
        link('Broken', 'http://['),
        d('plain', 'Plain', '', { target: 'new', targetLabel: 'opens in a new tab' }),
        link('Path', 'guide/'),
      ], { value: '' }),
    ], { reducedMotion: true });
    const what = (n: number) => cell(page, 'k', n).evaluate((el) => [el.localName, el.getAttribute('href'), el.getAttribute('target'), el.getAttribute('aria-description'), el.parentNode!.querySelectorAll('.link-mark').length]);
    expect(await what(0)).toEqual(['a', '#a', null, null, 0]);
    expect(await what(1)).toEqual(['button', null, null, null, 0]);
    expect(await what(2)).toEqual(['button', null, null, null, 0]);
    expect(await what(3)).toEqual(['button', null, null, null, 0]);
    expect(await what(4)).toEqual(['button', null, null, null, 0]);
    expect(await what(5)).toEqual(['a', 'guide/', null, null, 0]);
    await expect.poll(() => said.filter((each) => each.includes('NVD-64')).length).toBe(3);
    const text = said.join('\n');
    expect(text).toMatch(/target "sidebar" is not a value it defines.*NVD-64/);
    expect(text).toMatch(/href names a script to run.*NVD-64/);
    expect(text).toMatch(/href "http:\/\/\[" cannot be read as an address.*NVD-64/);
    // A button made of a refused address is a button: it has no value of its own to select by, takes Space, and a
    // press selects it only if the product gave it a value.
    expect(await drawer(page, 'k').evaluate((el: any) => el.items.map((each: any) => each.value))).toEqual(['#a', '', '', '', 'plain', 'guide/']);
    await wire(page);
    await tabTo(page, cell(page, 'k', 4));
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['change:plain:plain']);
  });
});

test.describe('density', () => {
  const COMPACT = spec.fixtures.find((f) => f.id === 'compact')!;
  const COMPACT_COLLAPSED = spec.fixtures.find((f) => f.id === 'compact-collapsed')!;

  test('NVD-65: compact draws every row, glyph, gap, indent and heading from the compact tokens, and a nested icon stands where its group’s label starts (NVD-13’s verify)', async ({ page }) => {
    await mount(page, [COMPACT, fixture('r', MAIL)], { reducedMotion: true });
    const [height, icon, gap, heading, nest, itemGap] = await Promise.all(
      ['item-container-height-compact', 'item-icon-size-compact', 'container-gap-compact', 'heading-height-compact', 'item-nest-indent-compact', 'item-gap'].map((n) => px(page, T(n))),
    );
    // The verify, under the default system.
    expect([height, icon, gap, heading, nest, itemGap]).toEqual([32, 16, 2, 28, 24, 12]);
    const p = await bounds(panel(page, 'compact'));
    const x = (b: { x: number }) => b.x - p.x;
    // compact: Home, then the section Projects › Tanrei (group) › Tokens, Components (group) › Button, Tree view; Archive.
    const home = item(page, 'compact', 0);
    const [row, homeIcon, homeLabel] = await Promise.all(['.row > .container', '.icon', '.label'].map((s) => bounds(home.locator(s))));
    expect(row.height).toBe(32);
    expect([homeIcon.width, homeIcon.height]).toEqual([16, 16]);
    expect(x(homeIcon) + homeIcon.width / 2).toBe(28);
    expect(x(homeLabel)).toBe(48);
    expect(centre(homeIcon).y).toBeCloseTo(centre(row).y, 0);
    // One level deep (Tokens): its icon centred 56 from the start edge, starting at 48 — where its group's label starts.
    const tanrei = group(page, 'compact', 0);
    const tanreiLabel = await bounds(tanrei.locator('.label').first());
    const tokensIcon = await bounds(item(page, 'compact', 1).locator('.icon'));
    expect(x(tokensIcon) + tokensIcon.width / 2).toBe(56);
    expect(x(tokensIcon)).toBe(x(tanreiLabel));
    // Two levels deep (Button): 84 and 76, under the label of the group that holds it.
    const componentsLabel = await bounds(group(page, 'compact', 1).locator('.label').first());
    const buttonIcon = await bounds(item(page, 'compact', 2).locator('.icon'));
    expect(x(buttonIcon) + buttonIcon.width / 2).toBe(84);
    expect(x(buttonIcon)).toBe(x(componentsLabel));
    // Every item container ends at the drawer's end padding, and (highlight indented) begins where its row's level does:
    // its icon item.padding-inline in.
    for (const n of [0, 2, 3]) {
      const [c, i] = [await bounds(box(page, 'compact', n)), await bounds(item(page, 'compact', n).locator('.icon'))];
      expect(c.x + c.width, `${n}`).toBe(row.x + row.width);
      expect(i.x - c.x, `${n}`).toBe(homeIcon.x - row.x);
    }
    // container.gap between two cells; the heading's row at its least height.
    const [first, second] = [await bounds(cell(page, 'compact', 2)), await bounds(cell(page, 'compact', 3))];
    expect(second.y - (first.y + first.height)).toBeCloseTo(gap, 1);
    expect((await bounds(drawer(page, 'compact').locator('tanrei-navigation-drawer-section').locator('.heading'))).height).toBe(heading);
    // The group's chevron and a trailing glyph are the compact trailing size; the label is the compact text style.
    expect((await bounds(tanrei.locator('.chevron').first())).width).toBe(await px(page, T('item-trailing-icon-size-compact')));
    expect(await css(home.locator('.label'), 'font-size')).toBe(await css(item(page, 'r', 0).locator('.label'), 'font-size'));
    // A regular drawer beside it is unchanged.
    expect((await bounds(box(page, 'r', 0))).height).toBe(await px(page, T('item-container-height-regular')));
    expect((await bounds(item(page, 'r', 0).locator('.icon'))).width).toBe(await px(page, T('item-icon-size-regular')));
  });

  test('NVD-65: compact-collapsed is a 56 column of 32 by 32 cells, every icon, the menu button and the selection at the point it has in the same drawer expanded (NVD-31 in each density)', async ({ page }) => {
    await mount(page, [COMPACT_COLLAPSED], { reducedMotion: true });
    const p = await bounds(panel(page, 'compact-collapsed'));
    expect(p.width).toBe(await px(page, T('collapsed-container-width-compact')));
    expect(p.width).toBe(56);
    const pill = await bounds(box(page, 'compact-collapsed', 0));
    expect([pill.width, pill.height]).toEqual([32, 32]);
    expect(pill.x - p.x + pill.width / 2).toBe(28);
    const at = async () => ({
      icons: await Promise.all([0, 1, 2].map(async (n) => centre(await bounds(item(page, 'compact-collapsed', n).locator('.icon'))))),
      menu: centre(await bounds(menu(page, 'compact-collapsed'))),
      cells: await Promise.all([0, 1, 2].map(async (n) => (await bounds(cell(page, 'compact-collapsed', n))).height)),
    });
    const collapsed = await at();
    expect(collapsed.cells).toEqual([32, 32, 32]);
    for (const icon of collapsed.icons) expect(icon.x - p.x).toBe(28);
    await setProps(page, 'compact-collapsed', { expanded: true });
    await page.waitForTimeout(50);
    await expect.poll(async () => (await bounds(panel(page, 'compact-collapsed'))).width).toBe(await px(page, T('container-width')));
    expect(await at()).toEqual(collapsed);
  });

  test('NVD-65: a change of density on a shown drawer is drawn at once and emits nothing; the form, the selection, every group’s open and focus stay', async ({ page }) => {
    await mount(page, [{ ...COMPACT, props: { ...COMPACT.props, density: 'regular' } }]);
    await wire(page);
    await tabTo(page, cell(page, 'compact', 2));
    const before = await page.evaluate(() => [...document.querySelectorAll<any>('tanrei-navigation-drawer-group')].map((g) => g.open));
    for (const density of ['compact', 'regular', 'compact']) {
      await setProps(page, 'compact', { density });
      // No motion: the row is the new density's height in the frame after the change.
      expect((await bounds(box(page, 'compact', 2))).height, density).toBe(await px(page, T(`item-container-height-${density}`)));
      expect(await drawer(page, 'compact').getAttribute('density')).toBe(density);
    }
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => [...document.querySelectorAll<any>('tanrei-navigation-drawer-group')].map((g) => g.open))).toEqual(before);
    expect(await drawer(page, 'compact').evaluate((el: any) => el.value)).toBe('tree-view');
    await expect(cell(page, 'compact', 2)).toBeFocused();
  });

  test('NVD-26: a density the active system does not have is drawn as regular and reported; a density a layer added is drawn from its own tokens', async ({ page }) => {
    const seen: string[] = [];
    page.on('console', (message) => seen.push(message.text()));
    await mount(page, [fixture('r', MAIL, { density: 'roomy' })], { reducedMotion: true });
    expect((await bounds(box(page, 'r', 0))).height).toBe(await px(page, T('item-container-height-regular')));
    await expect.poll(() => seen.some((line) => line.includes('NVD-26') && line.includes('density "roomy"'))).toBe(true);
    // A layer that adds the value: its tokens draw it, regular's stand in for any it leaves out.
    await override(page, { [T('item-container-height-roomy')]: '56px' });
    await setProps(page, 'r', { density: 'regular' });
    await setProps(page, 'r', { density: 'roomy' });
    expect((await bounds(box(page, 'r', 0))).height).toBe(56);
    expect((await bounds(item(page, 'r', 0).locator('.icon'))).width).toBe(await px(page, T('item-icon-size-regular')));
  });

  test('NVD-6: a compact cell’s hit area is the cell and half the gap around it for a fine pointer; for touch a compact cell is drawn at least the touch target high', async ({ page, browser, browserName }) => {
    await mount(page, [COMPACT], { reducedMotion: true });
    const gap = await px(page, T('container-gap-compact'));
    const c = cell(page, 'compact', 0);
    const hit = await c.evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBeCloseTo((await bounds(c)).height + gap, 1);
    expect(hit).toBeLessThan(await px(page, '--tanrei-sys-target-pointer'));
    test.skip(browserName !== 'chromium', 'only Chromium emulates a device whose pointer is coarse');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 600, height: 900 }, deviceScaleFactor: 2 });
    const touch = await context.newPage();
    await mount(touch, [COMPACT], { reducedMotion: true });
    expect(await touch.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const target = await px(touch, '--tanrei-sys-target-touch');
    expect((await bounds(cell(touch, 'compact', 0))).height).toBeCloseTo(target, 2);
    expect((await bounds(box(touch, 'compact', 0))).height).toBeCloseTo(target, 2);
    await context.close();
  });
});

test.describe('groups that are destinations', () => {
  const SELECTABLE = spec.fixtures.find((f) => f.id === 'selectable-groups')!;
  /** The chevron's own button of a group that is a destination. */
  const toggle = (page: P, id: string, n: number) => group(page, id, n).locator('.toggle').first();
  /** The value of the group or item at a point of the page. */
  const at = (page: P, x: number, y: number) =>
    page.evaluate(([xx, yy]) => {
      let node: Element | null = document.elementFromPoint(xx, yy);
      // Into the shadow roots, to the deepest element at the point.
      while (node?.shadowRoot) {
        const inner = node.shadowRoot.elementFromPoint(xx, yy);
        if (!inner || inner === node) break;
        node = inner;
      }
      return node?.classList.contains('toggle') ? 'toggle' : node?.classList.contains('cell') ? 'row' : (node?.localName ?? null);
    }, [x, y]);

  test('NVD-66: with selectableGroups a group with a value is a destination — selected by value and drawn from the selected parts, the current page, chosen by its row (change, then reselect) without opening or closing; one without a value only opens and closes; with selectableGroups false every group only opens and closes, and a value on one is reported', async ({ page }) => {
    const seen: string[] = [];
    page.on('console', (message) => seen.push(message.text()));
    await mount(page, [SELECTABLE], { reducedMotion: true });
    await wire(page);
    const id = 'selectable-groups';
    // Components (group 1) is the selected destination.
    await expect.poll(() => drawn(group(page, id, 1))).toEqual(await expected(page, 'selected'));
    await expect(groupRow(page, id, 1)).toHaveAttribute('aria-current', 'page');
    await expect(groupRow(page, id, 1)).not.toHaveAttribute('aria-expanded');
    await expect(groupRow(page, id, 0)).not.toHaveAttribute('aria-current');
    // The drawer's items are its items; a group that is a destination is selected through value alone.
    expect(await drawer(page, id).evaluate((el: any) => el.items.length)).toBe(6);
    // A press on Foundations' label: one change, no toggle, and it stays closed.
    await group(page, id, 0).locator('.label').first().click();
    expect(await log(page)).toEqual(['change:foundations:foundations']);
    expect(await group(page, id, 0).evaluate((el: any) => el.open)).toBe(false);
    await expect(groupRow(page, id, 0)).toHaveAttribute('aria-current', 'page');
    await group(page, id, 0).locator('.label').first().click();
    expect((await log(page)).at(-1)).toBe('reselect:foundations:foundations');
    // Resources has no value: its row is the disclosure button it always was.
    await expect(groupRow(page, id, 2)).toHaveAttribute('aria-expanded', 'false');
    expect(await group(page, id, 2).locator('.toggle').count()).toBe(0);
    await groupRow(page, id, 2).click();
    expect((await log(page)).at(-1)).toBe('toggle:Resources:true:true');
    // selectableGroups false: Foundations only opens and closes, and its value is reported.
    await setProps(page, id, { selectableGroups: false, value: 'button' });
    await page.evaluate(() => ((window as any).log.length = 0));
    await groupRow(page, id, 0).click();
    expect(await log(page)).toEqual(['toggle:Foundations:true:true']);
    await expect(groupRow(page, id, 0)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => seen.some((line) => line.includes('NVD-66') && line.includes('"Foundations"'))).toBe(true);
    // Turned on again while shown: drawn at once, nothing emitted, every group's open kept.
    await page.evaluate(() => ((window as any).log.length = 0));
    const opens = await page.evaluate(() => [...document.querySelectorAll<any>('tanrei-navigation-drawer-group')].map((g) => g.open));
    await setProps(page, id, { selectableGroups: true });
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => [...document.querySelectorAll<any>('tanrei-navigation-drawer-group')].map((g) => g.open))).toEqual(opens);
    await expect(toggle(page, id, 0)).toHaveAttribute('aria-expanded', 'true');
  });

  test('NVD-66: a group with an href is a link, counted as a link destination is (NVD-60), its href standing as its value', async ({ page }) => {
    await mount(page, [fixture('l', [{ kind: 'group', props: { label: 'Guides', icon: 'menu_book', href: '#guides' }, items: [link('Start', '#start')] }, link('About', '#about')], { selectableGroups: true, value: '#guides' })], { reducedMotion: true });
    await wire(page);
    const row = groupRow(page, 'l', 0);
    await expect(row).toHaveAttribute('href', '#guides');
    await expect(row).toHaveAttribute('aria-current', 'page');
    expect(await group(page, 'l', 0).evaluate((el: any) => el.value)).toBe('#guides');
    await drawer(page, 'l').evaluate((el) => el.addEventListener('reselect', (e) => e.preventDefault()));
    await row.click();
    expect(await log(page)).toEqual(['reselect:#guides:#guides']);
    // A modified click is the browser's: nothing is emitted.
    await row.click({ modifiers: ['ControlOrMeta'] });
    expect(await log(page)).toEqual(['reselect:#guides:#guides']);
  });

  test('NVD-67: the chevron opens and the row chooses — a press on the chevron toggles and chooses nothing, a press just before its hit area chooses and toggles nothing; its hit area reaches the cell’s end and is at least the pointer target wide; hover anywhere shows on the item container', async ({ page }) => {
    await mount(page, [{ ...SELECTABLE, props: { ...SELECTABLE.props, chevron: 'end' } }], { reducedMotion: true });
    await wire(page);
    const id = 'selectable-groups';
    const target = await px(page, '--tanrei-sys-target-pointer');
    const c = await bounds(groupRow(page, id, 1));
    const hit = await toggle(page, id, 1).evaluate((el) => {
      const box = el.getBoundingClientRect();
      const before = getComputedStyle(el, '::before');
      return { right: box.right, width: Number.parseFloat(before.width) };
    });
    const p = await bounds(panel(page, id));
    // The hit area ends at the cell's end edge.
    expect(hit.width).toBeGreaterThanOrEqual(target - 0.5);
    const startOfHit = p.x + p.width - hit.width;
    const y = c.y + c.height / 2;
    expect(await at(page, startOfHit + 1, y)).toBe('toggle');
    expect(await at(page, p.x + p.width - 1, y)).toBe('toggle');
    expect(await at(page, startOfHit - 1, y)).toBe('row');
    // The chevron's box covers the chevron.
    const chevron = await bounds(group(page, id, 1).locator('.chevron').first());
    const box = await bounds(toggle(page, id, 1));
    expect(box.x).toBeLessThanOrEqual(chevron.x);
    expect(box.x + box.width).toBeGreaterThanOrEqual(chevron.x + chevron.width);
    await page.mouse.click(p.x + p.width - 4, y);
    expect(await log(page)).toEqual(['toggle:Components:false:false']);
    await page.mouse.click(startOfHit - 2, y);
    expect(await log(page)).toEqual(['toggle:Components:false:false', 'reselect:components:components']);
    // Hover on the chevron is a hover on the cell.
    await page.mouse.move(700, 5);
    await page.mouse.move(p.x + p.width - 4, y);
    await expect.poll(() => css(group(page, id, 1).locator('.indicator').first(), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-item-container-color')));
    // A press on the chevron shows the pressed state on the item container.
    await page.mouse.down();
    expect(await group(page, id, 1).locator('.row > .container').first().getAttribute('data-pressed')).toBe('overlay');
    await page.mouse.up();
  });

  test('NVD-67: Tab moves from the row to its chevron and on to the first item; Enter and Space on the chevron toggle; the arrows open and close from the row and the chevron; the ring is drawn around the chevron’s own box', async ({ page }) => {
    await mount(page, [SELECTABLE], { reducedMotion: true });
    await wire(page);
    const id = 'selectable-groups';
    await tabTo(page, groupRow(page, id, 1));
    await tab(page);
    await expect(toggle(page, id, 1)).toBeFocused();
    await expect(toggle(page, id, 1)).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page, id, 1)).toHaveAttribute('aria-label', 'Components');
    await expect(toggle(page, id, 1)).toHaveCSS('outline-style', 'solid');
    await expect(group(page, id, 1).locator('.row > .container').first()).toHaveCSS('outline-style', 'none');
    await tab(page);
    await expect(cell(page, id, 3)).toBeFocused();
    // Back to the chevron: Enter and Space close and open it; nothing is chosen.
    await tab(page, { back: true });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['toggle:Components:false:false', 'toggle:Components:true:true']);
    await page.keyboard.press('ArrowLeft');
    expect((await log(page)).at(-1)).toBe('toggle:Components:false:false');
    // On the row: Right opens it, Left closes it, Enter chooses it.
    await tab(page, { back: true });
    await expect(groupRow(page, id, 1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    expect((await log(page)).at(-1)).toBe('toggle:Components:true:true');
    await page.keyboard.press('Enter');
    expect((await log(page)).at(-1)).toBe('reselect:components:components');
    expect(await group(page, id, 1).evaluate((el: any) => el.open)).toBe(true);
  });

  test('NVD-67, NVD-47: collapsed, a group that is a destination is its cell alone — a press chooses it, does not expand the drawer and opens nothing; NVD-36: focus on its chevron when the drawer collapses goes to the menu button', async ({ page }) => {
    await mount(page, [rail('c', [{ kind: 'group', props: { label: 'Folders', icon: 'folder', value: 'folders' }, items: [d('work', 'Work', 'work')] }, ...MAIL], { selectableGroups: true })], { reducedMotion: true });
    await wire(page);
    expect(await group(page, 'c', 0).locator('.toggle').count()).toBe(0);
    await groupRow(page, 'c', 0).click();
    expect(await log(page)).toEqual(['change:folders:folders']);
    expect(await drawer(page, 'c').evaluate((el: any) => [el.expanded, el.collapsed])).toEqual([false, true]);
    expect(await group(page, 'c', 0).evaluate((el: any) => el.open)).toBe(false);
    await expect(groupRow(page, 'c', 0)).toHaveAttribute('aria-current', 'page');
    // Expanded, the chevron is drawn; focus on it when the drawer collapses goes to the menu button.
    await setProps(page, 'c', { expanded: true });
    await tabTo(page, toggle(page, 'c', 0));
    await setProps(page, 'c', { expanded: false });
    await expect.poll(() => menu(page, 'c').evaluate((el) => el.matches(':focus-within'))).toBe(true);
  });

  test('NVD-58: revealSelected opens a group that is itself the selected destination, and the groups that hold it, emitting toggle for each', async ({ page }) => {
    const nested = { kind: 'group', props: { label: 'Navigation', value: 'navigation' }, items: [d('drawer', 'Navigation drawer')] } as FixtureItem;
    await mount(page, [fixture('s', [{ kind: 'group', props: { label: 'Components', value: 'components' }, items: [d('button', 'Button'), nested] }, d('home', 'Home')], { selectableGroups: true, revealSelected: true, value: 'navigation' })], { reducedMotion: true });
    expect(await page.evaluate(() => [...document.querySelectorAll<any>('tanrei-navigation-drawer-group')].map((g) => g.open))).toEqual([true, true]);
    await expect(groupRow(page, 's', 1)).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('the row model shared with the tree view', () => {
  const F = (id: string) => spec.fixtures.find((f) => f.id === id)!;
  const with_ = (id: string, props: Fixture['props'], as = id) => ({ ...F(id), id: as, props: { ...F(id).props, ...props } });
  const x = async (locator: Locator) => (await bounds(locator)).x;
  const glyphText = (locator: Locator) => locator.locator('.icon').first().textContent();

  test('NVD-68: with chevron none a press on a group’s icon opens and closes it and its icon shows openIcon while open; a group without an icon opens by its row unless it is a destination, which its row chooses while the arrows still open it; a group without an icon or an openIcon is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [F('chevron-none'), with_('selectable-groups', { chevron: 'none' }, 'sel'), fixture('bare', [grp('Plain', [d('a', 'A')], { open: true })], { chevron: 'none' })], { reducedMotion: true });
    await wire(page);
    const projects = group(page, 'chevron-none', 0);
    expect(await projects.locator('.chevron').count()).toBe(0);
    expect(await glyphText(projects)).toBe('folder_open');
    await projects.locator('.icon').first().click();
    expect(await log(page)).toEqual(['toggle:Projects:false:false']);
    expect(await glyphText(projects)).toBe('folder');
    // A destination group with an icon: the icon is its toggle, the label chooses.
    await page.evaluate(() => ((window as any).log.length = 0));
    await group(page, 'sel', 0).locator('.label').first().click();
    expect(await log(page)).toEqual(['change:foundations:foundations']);
    await group(page, 'sel', 0).locator('.toggle').first().click();
    expect((await log(page)).at(-1)).toBe('toggle:Foundations:true:true');
    // A group without an icon opens by its row; reported, as nothing shows whether it is open.
    await groupRow(page, 'bare', 0).click();
    expect((await log(page)).at(-1)).toBe('toggle:Plain:false:false');
    await expect.poll(() => seen.some((w) => w.includes('NVD-68') && w.includes('"Plain"'))).toBe(true);
  });

  test('NVD-69: auto lines a nested row’s first part up with its group’s label; indent 0 begins it where its group’s row begins; a number steps by that many pixels', async ({ page }) => {
    await mount(page, [F('chevron-end'), with_('chevron-end', { indent: 0 }, 'zero'), with_('chevron-end', { indent: 20 }, 'twenty')], { reducedMotion: true });
    for (const [id, expectStart] of [
      ['chevron-end', async () => x(group(page, 'chevron-end', 0).locator('.label').first())],
      ['zero', async () => x(group(page, 'zero', 0).locator('.icon').first())],
      ['twenty', async () => (await x(group(page, 'twenty', 0).locator('.icon').first())) + 20],
    ] as const) {
      expect(await x(item(page, id, 1).locator('.icon')), id).toBeCloseTo(await expectStart(), 1);
    }
  });

  test('NVD-71: iconSpace auto keeps an icon’s room where another row of the level has an icon; never keeps none; always keeps it everywhere', async ({ page }) => {
    await mount(page, [F('icon-space'), with_('icon-space', { iconSpace: 'never' }, 'never'), with_('icon-space', { iconSpace: 'always' }, 'always')], { reducedMotion: true });
    const label = (id: string, n: number) => x(item(page, id, n).locator('.label'));
    expect(await label('icon-space', 1)).toBeCloseTo(await label('icon-space', 0), 1);
    // Work and Family: no row of their level has an icon.
    const ipi = await px(page, T('item-padding-inline-regular'));
    expect((await label('icon-space', 3)) - (await x(box(page, 'icon-space', 3)))).toBeCloseTo(ipi, 1);
    expect((await label('never', 1)) - (await x(box(page, 'never', 1)))).toBeCloseTo(ipi, 1);
    expect((await label('always', 3)) - (await x(box(page, 'always', 3)))).toBeGreaterThan(ipi + 1);
  });

  test('NVD-72: while expandable is false every group is shown open, draws no chevron, takes no focus and is not exposed as expandable; a press on its row does nothing', async ({ page }) => {
    await mount(page, [F('not-expandable')], { reducedMotion: true });
    await wire(page);
    const id = 'not-expandable';
    for (const n of [0, 1, 2]) await expect(cell(page, id, n)).toBeVisible();
    expect(await drawer(page, id).locator('.chevron').count()).toBe(0);
    for (const n of [0, 1]) {
      const row = group(page, id, n).locator('#row');
      await expect(row).not.toHaveAttribute('aria-expanded');
      await expect(row).toHaveAttribute('aria-hidden', 'true');
    }
    await group(page, id, 0).locator('#row').click();
    expect(await log(page)).toEqual([]);
    await tabTo(page, cell(page, id, 0));
    await tab(page);
    await expect(cell(page, id, 1)).toBeFocused();
    await tab(page);
    await expect(cell(page, id, 2)).toBeFocused();
    // The list of a group's items is named by its label.
    await expect(drawer(page, id).getByRole('list', { name: 'Foundations' })).toHaveCount(1);
  });

  test('NVD-73: a guide line runs from an open group’s row to its last shown row, under the start chevron, else the icon, else the label’s start; hover draws it only while the pointer is over the drawer; indent 0 draws none', async ({ page }) => {
    await mount(page, [F('guides'), F('guides-chevron-none'), with_('chevron-end', { guides: 'shown', indent: 0 }, 'zero'), with_('chevron-end', { guides: 'hover' }, 'hover'), fixture('labels', [grp('Folders', [d('a', 'A'), d('b', 'B')], { open: true })], { guides: 'shown', chevron: 'end' })], { reducedMotion: true });
    const line = (id: string, n: number) =>
      group(page, id, n).evaluate((el) => {
        const fold = el.shadowRoot!.querySelector('.fold')!;
        const style = getComputedStyle(fold, '::before');
        const box = fold.getBoundingClientRect();
        const start = Number.parseFloat(style.insetInlineStart);
        return { display: style.display, opacity: style.opacity, centre: box.left + start + Number.parseFloat(style.width) / 2, top: box.top, bottom: box.bottom };
      });
    const centreOf = async (locator: Locator) => centre(await bounds(locator)).x;
    // Chevron start: under the chevron.
    const g = await line('guides', 0);
    expect(g.display).toBe('block');
    expect(g.centre).toBeCloseTo(await centreOf(group(page, 'guides', 0).locator('.chevron').first()), 0);
    expect(g.top).toBeCloseTo((await bounds(groupRow(page, 'guides', 0))).y + (await bounds(groupRow(page, 'guides', 0))).height, 0);
    const lastRow = await bounds(cell(page, 'guides', 3));
    expect(g.bottom).toBeCloseTo(lastRow.y + lastRow.height, 0);
    // Chevron none: under the icon.
    expect((await line('guides-chevron-none', 0)).centre).toBeCloseTo(await centreOf(group(page, 'guides-chevron-none', 0).locator('.icon').first()), 0);
    // No icon and an end chevron: at the label's start.
    expect((await line('labels', 0)).centre).toBeCloseTo(await x(group(page, 'labels', 0).locator('.label').first()), 0);
    // indent 0: none.
    expect((await line('zero', 0)).display).toBe('none');
    // hover: drawn while the pointer is over the drawer.
    await page.mouse.move(1200, 700);
    await expect.poll(async () => (await line('hover', 0)).opacity).toBe('0');
    await groupRow(page, 'hover', 0).hover();
    await expect.poll(async () => (await line('hover', 0)).opacity).toBe('1');
  });

  test('NVD-74: supporting text below the label grows the row; inline it stands after the label on its line; it is read as the row’s description', async ({ page }) => {
    await mount(page, [F('supporting')], { reducedMotion: true });
    const id = 'supporting';
    const height = await px(page, T('item-container-height-regular'));
    const [label, note] = [await bounds(item(page, id, 0).locator('.label')), await bounds(item(page, id, 0).locator('.supporting'))];
    expect(note.y).toBeGreaterThanOrEqual(label.y + label.height - 0.5);
    const row = await bounds(box(page, id, 0));
    const padBlock = await px(page, T('item-padding-block-regular'));
    expect(row.height).toBeGreaterThanOrEqual(height);
    expect(row.y + row.height - (note.y + note.height)).toBeGreaterThanOrEqual(padBlock - 0.5);
    const [l2, n2] = [await bounds(item(page, id, 1).locator('.label')), await bounds(item(page, id, 1).locator('.supporting'))];
    expect(n2.x).toBeGreaterThan(l2.x + l2.width);
    expect(Math.abs(centre(n2).y - centre(l2).y)).toBeLessThan(4);
    await expect(cell(page, id, 0)).toHaveAttribute('aria-description', '3 new');
    await expect(groupRow(page, id, 0)).toHaveAttribute('aria-description', '2 folders');
  });

  test('NVD-75: a label that does not fit is one line ending in an ellipsis and its whole text is shown in a tooltip on hover and keyboard focus — never for a row drawn whole; Escape dismisses it; labelWrap wraps and shows none', async ({ page }) => {
    await mount(page, [F('one-line'), F('label-wrap')], { reducedMotion: true });
    const tip = (id: string, n: number) => item(page, id, n).locator('tanrei-tooltip.cut-tip');
    const open = async (id: string, n: number) => (await tip(id, n).count()) > 0 && (await tip(id, n).evaluate((el: any) => el.open));
    const long = item(page, 'one-line', 1).locator('.label');
    expect(await long.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await css(long, 'text-overflow')).toBe('ellipsis');
    const delay = await resolveToken(page, '--tanrei-comp-tooltip-motion-show-delay', 'duration');
    expect(delay).toBeGreaterThan(0);
    // The show delay runs on the page's clock, held still and moved on by the test: a row drawn whole shows nothing
    // once it is over; a cut one nothing a millisecond before it, and its tooltip at it.
    await holdClock(page);
    await cell(page, 'one-line', 0).hover();
    await page.clock.runFor(delay);
    expect(await open('one-line', 0)).toBe(false);
    await cell(page, 'one-line', 1).hover();
    await page.clock.runFor(delay - 1);
    expect(await open('one-line', 1)).toBe(false);
    await page.clock.runFor(1);
    expect(await tip('one-line', 1).evaluate((el: any) => el.open)).toBe(true);
    await releaseClock(page);
    // A rich tooltip: the label as its title, the supporting text as its text.
    expect(await tip('one-line', 1).evaluate((el: any) => [el.variant, el.title, el.text])).toEqual(['rich', 'A destination whose name is far too long for one line of the drawer', 'and a note that is also longer than the row can hold']);
    await page.keyboard.press('Escape');
    await expect.poll(() => tip('one-line', 1).evaluate((el: any) => el.open)).toBe(false);
    await page.mouse.move(1200, 700);
    // Keyboard focus shows it at once.
    await page.mouse.click(1200, 700);
    await tabTo(page, cell(page, 'one-line', 1));
    await expect.poll(() => tip('one-line', 1).evaluate((el: any) => el.open)).toBe(true);
    // The accessible name is the whole label.
    await expect(cell(page, 'one-line', 1)).toHaveAttribute('aria-label', 'A destination whose name is far too long for one line of the drawer');
    // labelWrap: drawn whole, so no tooltip.
    expect(await item(page, 'label-wrap', 1).locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5)).toBe(true);
    await holdClock(page);
    await cell(page, 'label-wrap', 1).hover();
    await page.clock.runFor(delay);
    expect(await open('label-wrap', 1)).toBe(false);
  });

  test('NVD-76: an open group that is loading draws a loading row under its items, one step further in, named by loadingLabel, taking no focus; its list is busy', async ({ page }) => {
    await mount(page, [F('group-loading')], { reducedMotion: true });
    const archive = group(page, 'group-loading', 0);
    const row = archive.locator('.loading-row');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Loading…');
    await expect(archive.locator('#items')).toHaveAttribute('aria-busy', 'true');
    expect(await row.evaluate((el) => el.querySelectorAll('[tabindex], button, a').length)).toBe(0);
    const [loading, item2025] = [await bounds(row.locator('.loading-box')), await bounds(item(page, 'group-loading', 1).locator('.icon'))];
    expect(loading.x).toBeCloseTo(item2025.x, 0);
    expect(loading.y).toBeGreaterThan(item2025.y);
  });

  test('NVD-77: with stickyParents the rows of the open groups the top rows belong to are pinned, the innermost stickyMax of them, each under the one above, the last with its line; Tab to a row under them scrolls it below them; none while collapsed or off', async ({ page }) => {
    await mount(page, [{ ...F('sticky'), props: { ...F('sticky').props, scrollOffset: 0 } }], { reducedMotion: true });
    const id = 'sticky';
    const scroller = drawer(page, id).locator('[part="content"]');
    const pinned = () => drawer(page, id).evaluate((el) => [...el.querySelectorAll<any>('tanrei-navigation-drawer-group')].filter((g) => g.isPinned).map((g) => g.label));
    expect(await pinned()).toEqual([]);
    await scroller.evaluate((el) => (el.scrollTop = 220));
    await expect.poll(pinned).toEqual(['2026', 'February']);
    const top = (await bounds(scroller)).y;
    const rows = await Promise.all([0, 1].map(async (n) => bounds(groupRow(page, id, n))));
    expect(rows[0].y).toBeCloseTo(top, 0);
    expect(rows[1].y).toBeCloseTo(rows[0].y + rows[0].height, 0);
    expect(await group(page, id, 1).locator('.pinned-last').count()).toBe(1);
    // A focused row under the pinned rows is brought in below them.
    await page.mouse.click(790, 5);
    const target = cell(page, id, 3);
    await target.evaluate((el: any) => el.scrollIntoView({ block: 'start' }));
    await scroller.evaluate((el) => (el.scrollTop = 220));
    await tabTo(page, target);
    const b = await bounds(target);
    expect(b.y).toBeGreaterThanOrEqual(rows[1].y + rows[1].height - 1);
    // stickyMax 1: the innermost alone.
    await setProps(page, id, { stickyMax: 1 });
    await scroller.evaluate((el) => (el.scrollTop = 221));
    await expect.poll(pinned).toEqual(['February']);
    // Off: none.
    await setProps(page, id, { stickyParents: false });
    await scroller.evaluate((el) => (el.scrollTop = 222));
    await expect.poll(pinned).toEqual([]);
  });

  test('NVD-39: the main action keeps its place under a page’s reset (* { margin: 0; padding: 0 }) in both forms: it is placed by the drawer’s own box, not by a margin on it', async ({ page }) => {
    await mount(page, [fixture('reset', [MENU, MAIN, ...MAIL], { collapsible: true })], { reducedMotion: true });
    await page.addStyleTag({ content: '* { margin: 0; padding: 0; }' });
    for (const expanded of [true, false]) {
      await setProps(page, 'reset', { expanded });
      await expect.poll(() => drawer(page, 'reset').locator('tanrei-main-action-button').evaluate((el: any) => el.extended)).toBe(expanded);
      const glyph = centre(await bounds(drawer(page, 'reset').locator('tanrei-main-action-button').locator('.icon-box'))).x;
      const icon = centre(await bounds(item(page, 'reset', 0).locator('.icon'))).x;
      expect(Math.abs(glyph - icon), String(expanded)).toBeLessThanOrEqual(0.5);
    }
  });

  test('NVD-39, NVD-68: with a start chevron the main action’s glyph moves with the destinations’ icons, a chevron’s room and a gap further in', async ({ page }) => {
    await mount(page, [fixture('s', [MENU, MAIN, d('home', 'Home', 'home'), grp('Projects', [d('a', 'A', 'palette')], { icon: 'folder', open: true })], { value: 'home' })], { reducedMotion: true });
    const glyph = centre(await bounds(drawer(page, 's').locator('tanrei-main-action-button').locator('.icon-box'))).x;
    const icon = centre(await bounds(item(page, 's', 0).locator('.icon'))).x;
    expect(Math.abs(glyph - icon)).toBeLessThanOrEqual(0.5);
    const p = await bounds(panel(page, 's'));
    const [chevron, gap] = await Promise.all([T('item-trailing-icon-size-regular'), T('item-gap')].map((n) => px(page, n)));
    expect(icon - p.x).toBeCloseTo(36 + chevron + gap, 1);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark (standard and collapsed, and modal)', async ({ page }) => {
    test.setTimeout(120_000);
    // A responsive fixture is what its window makes it: each alone, in its window (`drawerWindow`).
    const responsive = spec.fixtures.filter((f) => f.props.responsive);
    const inline = spec.fixtures.filter((f) => !f.props.responsive && (f.props.variant !== 'modal' || !f.props.open));
    for (const theme of ['light', 'dark'] as const) {
      for (const fixtures of [inline, only('modal'), only('modal-collapsible-open'), ...responsive.map((f) => [f])]) {
        await page.setViewportSize(fixtures.length === 1 ? drawerWindow(fixtures[0].id) : { width: 1280, height: 720 });
        await mount(page, fixtures, { theme, reducedMotion: true });
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    }
  });
});

/** An open modal fixture's window and its drawing: opened after a pointer press, as from a menu button (no focus ring). */
async function modalWindow(page: P, fixture: Fixture, options: Parameters<typeof mountFixtures>[2] = {}) {
  await page.setViewportSize(drawerWindow(fixture.id));
  await mount(page, [{ ...fixture, props: { ...fixture.props, open: false } }], options);
  // A menu button pressed with the pointer opens it, and is gone from the picture once it has.
  await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<button id="opener" style="position:fixed;inset-inline-end:0;inset-block-end:0">Menu</button>'));
  await page.locator('#opener').click();
  await page.locator('tanrei-navigation-drawer').evaluate((el: any) => (el.open = true));
  await page.locator('tanrei-navigation-drawer').evaluate((el: any) => el.updateComplete);
  await page.locator('#opener').evaluate((el) => el.remove());
}

test.describe('fixtures', () => {
  /** Presented in the top layer: an open modal drawer. A collapsible modal drawer that is closed is its column in the layout. */
  const presented = (f: Fixture) => (f.props.variant === 'modal' || f.id === 'responsive-narrow') && f.props.open === true;
  /** A responsive fixture is drawn alone in the window that makes it what it shows (NVD-53's verify: 1280, 800, 400 wide). */
  const windowed = (f: Fixture) => f.props.responsive === true;
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      if (presented(f)) {
        await modalWindow(page, f, { reducedMotion: true });
        await page.waitForTimeout(100);
        await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
        return;
      }
      if (windowed(f)) {
        await page.setViewportSize(drawerWindow(f.id));
        await mount(page, [f], { reducedMotion: true });
        await page.mouse.move(drawerWindow(f.id).width - 20, 5);
        await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
        return;
      }
      await mount(page, spec.fixtures.filter((each) => !presented(each) && !windowed(each)), { reducedMotion: true });
      await page.mouse.move(700, 5);
      await expect(page.locator(`[data-fixture="${f.id}"]`) as Locator).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// <tanrei-tabs>, <tanrei-tab> and <tanrei-tab-panel>, driven by specs/tabs.spec.json: every behaviour id (TAB-1…45, TAB-49, TAB-50) is
// cited by a test title, every fixture has a baseline, and every state, look and choice of kind is read back from the
// tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, fixturesDocument, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';
import { expectOneThumb, readThumb } from '../../../test/thumb.js';

const spec = loadSpec('tabs');
type P = Page;
const row = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-tabs`);
const tabs = (page: P, id: string) => row(page, id).locator('tanrei-tab');
const tabAt = (page: P, id: string, n: number) => tabs(page, id).nth(n);
/** The whole tab: what answers the pointer and carries `data-pressed`. */
const box = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.tab');
/** The tab's container (TAB-18): the state layer, drawn in the indicator's box. */
const layer = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.box');
/** The focus ring's element (TAB-4): the same box as the container. */
const ring = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.ring');
/** The track (TAB-27): the scroller. */
const track = (page: P, id: string) => row(page, id).locator('.scroller');
// Each label and icon is drawn twice (TAB-24): the plain one in the tab's content, the covered copy in the cover.
const label = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.tab > .content > .label');
const icon = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.tab > .content > .icon');
const content = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.tab > .content');
const cover = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.cover');
const underline = (page: P, id: string, n: number) => tabAt(page, id, n).locator('.underline');
const tip = (page: P, id: string, n: number) => tabAt(page, id, n).locator('tanrei-tooltip');
const panel = (page: P, id: string, value: string) => row(page, id).locator(`tanrei-tab-panel[value="${value}"]`);
type Rect = { x: number; y: number; width: number; height: number; radius: number };
/**
 * Where a clipped piece is drawn, on the page: the element's box less the insets of its `clip-path: inset(…)`, and the
 * first corner radius. Null while it is clipped away by the stylesheet (`inset(50%)`: nothing placed yet).
 */
const clipped = (locator: Locator) =>
  locator.evaluate((el): Rect | null => {
    const m = /^inset\((.*)\)$/.exec(getComputedStyle(el).clipPath);
    if (!m || m[1].includes('%')) return null;
    const [edges, round] = m[1].split(' round ');
    const v = edges.trim().split(/\s+/).map(Number.parseFloat);
    const [top, right, bottom, left] = v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v.length === 3 ? [v[0], v[1], v[2], v[1]] : v;
    const r = el.getBoundingClientRect();
    return { x: r.x + left, y: r.y + top, width: r.width - left - right, height: r.height - top - bottom, radius: round ? Number.parseFloat(round) : 0 };
  });
const pill = async (page: P, id: string, n: number) => (await clipped(cover(page, id, n)))!;
const line = async (page: P, id: string, n: number) => (await clipped(underline(page, id, n)))!;
/** Whether `inner` lies within `outer`, to half a pixel. */
const within = (inner: { x: number; y: number; width: number; height: number }, outer: { x: number; y: number; width: number; height: number }) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;
/** Whether a label is cut short: its text overflows the box that cuts it (the label's `.text`, or the element itself). */
const truncated = (locator: Locator) =>
  locator.evaluate((label) => {
    const el = label.querySelector(':scope > .text') ?? label;
    return el.scrollWidth > el.clientWidth;
  });
/**
 * A one-line text against the box that cuts it: where its first and its last character are laid out, whether it
 * overflows the box (so an ellipsis is drawn), and the box's own direction and `text-overflow`.
 */
const cutEnds = (locator: Locator) =>
  locator.evaluate((label) => {
    // A tab's label cuts its text in its `.text` (the label also holds the unseen copy that keeps its width).
    const el = label.querySelector(':scope > .text') ?? label;
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
    return { box: { left, right }, first: at(0), last: at(text.length - 1), overflows: el.scrollWidth > el.clientWidth, direction: style.direction, textOverflow: style.textOverflow, dir: label.getAttribute('dir') };
  });
/** A long right-to-left label. */
const ARABIC_LONG = 'في انتظار مراجعة ثانية من فريق إمكانية الوصول';
/** The easing token as the browser serializes a timing function. */
const easingToken = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.append(probe);
    const v = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return v;
  }, name);
/**
 * Holds the row's slide at `at` of its duration, and reads its timing and the easing's progress there. The slide is the
 * row's clock on the strip and every tab's pieces, which the browser moves (all named `tanrei-tabs-slide`, on one
 * timeline from one moment): held together, as a person holds them in a browser's animation inspector.
 */
const holdSlide = (page: P, id: string, at: number) =>
  row(page, id)
    .locator('.tabs')
    .evaluate(async (el, f) => {
      const a = el.getAnimations().find((each) => each.id === 'tanrei-tabs-slide')!;
      const timing = a.effect!.getTiming();
      const host = (el.getRootNode() as ShadowRoot).host;
      const parts = [...host.querySelectorAll(':scope > tanrei-tab')].flatMap((tab) => tab.shadowRoot!.getAnimations()).filter((each) => each.id === 'tanrei-tabs-slide');
      for (const each of [a, ...parts]) {
        each.pause();
        each.currentTime = (timing.duration as number) * f;
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { duration: timing.duration, easing: timing.easing, progress: a.effect!.getComputedTiming().progress! };
    }, at);
const slides = (page: P, id: string) => row(page, id).locator('.tabs').evaluate((el) => el.getAnimations().filter((a) => a.id === 'tanrei-tabs-slide').length);
const finishSlide = (page: P, id: string) =>
  row(page, id)
    .locator('.tabs')
    .evaluate(async (el) => {
      const host = (el.getRootNode() as ShadowRoot).host;
      for (const a of [...el.getAnimations(), ...[...host.querySelectorAll(':scope > tanrei-tab')].flatMap((tab) => tab.shadowRoot!.getAnimations())]) if (a.id === 'tanrei-tabs-slide') a.finish();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-tabs-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** One move of a dispatched drag: the pointer's clientX (and how far below the press it is), `dt` ms after the event before. */
interface Step {
  x: number;
  y?: number;
  dt?: number;
}
const POINTER = 21;
/**
 * A drag dispatched in the page (TAB-28): pointer down on tab `n` at its centre — or at `at.x` — one move per step, and,
 * unless `up` is null, the release `up` ms after the last move, where it is. Each event is stamped with the time the
 * pointer was there, so a release's velocity is what the test says however late the page's timers run.
 */
async function drag(page: P, id: string, n: number, steps: Step[], { up = 300 as number | null, pointerType = 'touch', at = null as { x: number } | null } = {}) {
  await page.evaluate(
    ({ id, n, steps, up, pointerType, at, pointerId }) => {
      const target = document.querySelectorAll(`[data-fixture="${id}"] tanrei-tabs > tanrei-tab`)[n];
      const r = target.getBoundingClientRect();
      const [x0, y0] = [at ? at.x : r.left + r.width / 2, r.top + r.height / 2];
      let stamp = ((window as any).dragStamp = performance.now() - 5000);
      const event = (type: string, x: number, y: number) => {
        const e = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId, pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
        Object.defineProperty(e, 'timeStamp', { value: stamp });
        return e;
      };
      target.dispatchEvent(event('pointerdown', x0, y0));
      let last = { x: x0, y: y0 };
      for (const step of steps) {
        stamp += step.dt ?? 16;
        last = { x: step.x, y: y0 + (step.y ?? 0) };
        target.dispatchEvent(event('pointermove', last.x, last.y));
      }
      if (up !== null) {
        stamp += up;
        target.dispatchEvent(event('pointerup', last.x, last.y));
      }
      (window as any).dragStamp = stamp;
    },
    { id, n, steps, up, pointerType, at, pointerId: POINTER },
  );
}
/** One more event of the held drag, on the row: a move to `x`, the release there, or the platform taking the pointer back. */
const pointer = (page: P, id: string, type: 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture', x = 0, dt = 300) =>
  page.evaluate(
    ({ id, type, x, dt, pointerId }) => {
      const target = document.querySelector(`[data-fixture="${id}"] tanrei-tabs`)!;
      const r = target.getBoundingClientRect();
      const stamp = ((window as any).dragStamp += dt);
      const e = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointermove' ? 1 : 0, clientX: x, clientY: r.top + r.height / 2 });
      Object.defineProperty(e, 'timeStamp', { value: stamp });
      target.dispatchEvent(e);
    },
    { id, type, x, dt, pointerId: POINTER },
  );
/** Eight moves from `from` to `to`, 16 ms apart: slow enough that a release 300 ms later is no fling. */
const glide = (from: number, to: number, moves = 8): Step[] => Array.from({ length: moves }, (_, i) => ({ x: from + ((to - from) * (i + 1)) / moves, dt: 16 }));
const dragging = (page: P, id: string) => row(page, id).evaluate((el: any) => el.dragging as boolean);
const centreX = async (page: P, id: string, n: number) => {
  const b = await bounds(tabAt(page, id, n));
  return b.x + b.width / 2;
};
/** Where tabs `a` and `b` meet: the middle of whatever lies between them. */
const meetX = async (page: P, id: string, a: number, b: number) => {
  const [ba, bb] = [await bounds(tabAt(page, id, a)), await bounds(tabAt(page, id, b))];
  return (ba.x + ba.width + bb.x) / 2;
};
/** A tab's container on the page: the box the indicator has on it (TAB-16, TAB-18). */
const seat = (page: P, id: string, n: number) => bounds(layer(page, id, n));
const frames = (page: P, n = 2) =>
  page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, n);
/** The catch-up of a taken drag (TAB-28): finished, so that the indicator is where the pointer is. */
const finishCatchUp = (page: P, id: string) =>
  row(page, id)
    .locator('.tabs')
    .evaluate(async (el) => {
      for (const a of el.getAnimations()) if (a.id === 'tanrei-tabs-catch-up') a.finish();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

// Tabs, as a fixture lists them.
const t = (value: string, label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'tab', props: { value, label, ...props } });
const THREE = [t('overview', 'Overview'), t('activity', 'Activity'), t('settings', 'Settings')];
const panels = (values: string[], focusable: string[] = []) =>
  values.map((v) => `<tanrei-tab-panel value="${v}">${focusable.includes(v) ? `<button id="in-${v}">In ${v}</button>` : `<p>View of ${v}</p>`}</tanrei-tab-panel>`).join('');
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}, content?: string): Fixture => ({ id, props: { label: 'Project', ...props }, items, ...(content ? { content } : {}) });

/** Logs every change the rows fire, with the value it carried and the row's value when it fired. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const r of document.querySelectorAll<any>('tanrei-tabs')) r.addEventListener('change', (e: CustomEvent) => log.push(`${e.detail.value}:${r.value}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const focused = (page: P) =>
  page.evaluate(() => {
    const active = document.activeElement as any;
    return active?.localName === 'tanrei-tab' ? active.value : (active?.id ?? null);
  });

/** What a tab draws: its container, label, covered label, underline piece, indicator piece and opacity. */
const drawn = (page: P, id: string, n: number) =>
  tabAt(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const s = getComputedStyle(root.querySelector('.tab')!);
    const label = root.querySelector('.tab > .content > .label');
    const covered = root.querySelector('.cover .label');
    return {
      bg: getComputedStyle(root.querySelector('.box')!).backgroundColor,
      label: label ? getComputedStyle(label).color : null,
      covered: covered ? getComputedStyle(covered).color : null,
      pill: getComputedStyle(root.querySelector('.cover')!).backgroundColor,
      underline: getComputedStyle(root.querySelector('.underline')!).backgroundColor,
      opacity: s.opacity,
    };
  });
/**
 * What the tokens say a tab of `look` draws in `state`. The indicator and the underline are the selected look's wherever
 * they are drawn (TAB-17): a tab that is not selected draws their resting selected color, the selected tab its state's.
 */
const expected = async (page: P, variant: string, look: '' | 'selected', state = '') => {
  const name = (part: string) => T(`${variant}-${state ? `${state}-` : ''}${look ? `${look}-` : ''}${part}`);
  const moving = (part: string) => (look ? name(part) : T(`${variant}-selected-${part}`));
  return {
    bg: await resolveColor(page, name('container-color')),
    label: await resolveColor(page, name('label-color')),
    covered: await resolveColor(page, name('covered-label-color')),
    pill: await resolveColor(page, moving('active-indicator-color')),
    underline: await resolveColor(page, moving('underline-color')),
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};

test.describe('selection and keyboard', () => {
  test('TAB-1: a pointer, Enter or Space on an enabled tab selects it and emits change once; the selected tab emits nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('r', THREE, { selected: 'overview' })] });
    await wire(page);
    await tabAt(page, 'r', 1).click();
    await tabAt(page, 'r', 1).click();
    // A tab the product focused without selecting it is selected by Enter, or Space.
    await tabAt(page, 'r', 2).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await tabAt(page, 'r', 0).focus();
    await page.keyboard.press('Space');
    await tabAt(page, 'r', 1).evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['activity:activity', 'settings:settings', 'overview:overview', 'activity:activity']);
    await expect(tabAt(page, 'r', 1)).toHaveAttribute('aria-selected', 'true');
    // The product sets value: no change.
    await row(page, 'r').evaluate((el: any) => (el.value = 'settings'));
    await expect(tabAt(page, 'r', 2)).toHaveAttribute('aria-selected', 'true');
    expect(await log(page)).toHaveLength(4);
  });

  test('TAB-2: a disabled tab is never selected, skipped by the arrows, never the Tab stop, and exposed as disabled', async ({ page }) => {
    await mountFixtures(page, spec);
    await wire(page);
    const billing = tabAt(page, 'primary-disabled', 2);
    await expect(billing).toHaveAttribute('aria-disabled', 'true');
    await expect(billing).not.toHaveAttribute('tabindex');
    await billing.click({ force: true });
    await billing.evaluate((el) => (el as HTMLElement).click());
    await billing.dispatchEvent('click');
    expect(await log(page)).toEqual([]);
    // The arrows skip it: Activity → (Billing skipped) → Overview.
    await tabAt(page, 'primary-disabled', 1).focus();
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('overview');
    // A selected tab that is disabled is not the Tab stop: the first enabled tab is.
    await expect(tabAt(page, 'primary-selected-disabled', 2)).toHaveAttribute('aria-selected', 'true');
    await expect(tabAt(page, 'primary-selected-disabled', 2)).not.toHaveAttribute('tabindex');
    await expect(tabAt(page, 'primary-selected-disabled', 0)).toHaveAttribute('tabindex', '0');
  });

  test('TAB-11: the tab whose value is selected — or the first enabled tab while it is null — is drawn from the selected parts; a value naming no tab selects none, shows no panel and is reported; empty and repeated values are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('null', [t('a', 'A', { disabled: true }), t('b', 'B'), t('c', 'C')], {}, panels(['a', 'b', 'c'])),
        fixture('none', THREE, { selected: 'nothing' }, panels(['overview', 'activity', 'settings'])),
        fixture('odd', [t('', 'Empty'), t('x', 'First x'), t('x', 'Second x')], { selected: 'x' }),
      ],
    });
    await expect(tabAt(page, 'null', 1)).toHaveAttribute('aria-selected', 'true');
    await expect(box(page, 'null', 1)).toHaveClass(/selected/);
    await expect.poll(() => drawn(page, 'null', 1)).toEqual(await expected(page, 'primary', 'selected'));
    await expect.poll(() => drawn(page, 'null', 2)).toEqual(await expected(page, 'primary', ''));
    await expect(panel(page, 'null', 'b')).toBeVisible();
    await expect(tabs(page, 'none').and(page.locator('[aria-selected="true"]'))).toHaveCount(0);
    for (const v of ['overview', 'activity', 'settings']) await expect(panel(page, 'none', v)).toBeHidden();
    await expect(tabAt(page, 'odd', 0)).toBeVisible();
    await expect(tabAt(page, 'odd', 1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabAt(page, 'odd', 2)).toHaveAttribute('aria-selected', 'false');
    await expect.poll(() => seen.filter((w) => w.includes('TAB-11')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/value "nothing" names no tab; none is drawn selected \(TAB-11\)/);
    expect(seen.join('\n')).toMatch(/the tab "Empty" has an empty value/);
    expect(seen.join('\n')).toMatch(/the value "x" is given to more than one tab; the first of them is the one it selects/);
  });

  test('TAB-12: one Tab stop, the selected tab; Right and Left wrap over enabled tabs, Home and End, each selecting; mirrored in RTL; Tab goes into the panel', async ({ page }) => {
    const items = [t('a', 'A'), t('b', 'B', { disabled: true }), t('c', 'C'), t('d', 'D')];
    await mountFixtures(page, spec, { fixtures: [fixture('r', items, { selected: 'c' }, panels(['a', 'c', 'd'], ['d']))] });
    await page.evaluate(() => document.body.prepend(Object.assign(document.createElement('button'), { id: 'before', textContent: 'Before' })));
    await wire(page);
    await expect(tabAt(page, 'r', 2)).toHaveAttribute('tabindex', '0');
    for (const n of [0, 3]) await expect(tabAt(page, 'r', n)).toHaveAttribute('tabindex', '-1');
    await page.locator('#before').focus();
    await tab(page);
    expect(await focused(page)).toBe('c');
    const order: string[] = [];
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      await page.keyboard.press(key);
      order.push((await focused(page)) as string);
    }
    expect(order).toEqual(['d', 'a', 'c', 'a', 'a', 'd']);
    // Each move selected (Home on the selected tab emits nothing).
    expect(await log(page)).toEqual(['d:d', 'a:a', 'c:c', 'a:a', 'd:d']);
    await expect(tabAt(page, 'r', 3)).toHaveAttribute('tabindex', '0');
    // Tab from the selected tab goes into its panel (here, to the button in it).
    await tab(page);
    expect(await focused(page)).toBe('in-d');
    // Right-to-left: Left Arrow is next.
    await page.locator('[data-fixture="r"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await tabAt(page, 'r', 3).focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('a');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('d');
  });

  test('TAB-13: the tab list named by its label; tabs with their role, selection, position, count and name, drawn or not; the selected panel named by its tab and controlled by it, the others hidden; an empty panel is a Tab stop', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('r', [t('overview', 'Overview', { icon: 'dashboard', labelHidden: true }), t('activity', 'Activity', { icon: 'history', labelHidden: true })], { selected: 'overview' }, panels(['overview', 'activity'], ['activity'])),
      ],
    });
    await expect(page.getByRole('tablist', { name: 'Project' })).toHaveCount(1);
    await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toHaveCount(1);
    await expect(page.getByRole('tab', { name: 'Activity', selected: false })).toHaveCount(1);
    await expect(tabAt(page, 'r', 1)).toHaveAttribute('aria-posinset', '2');
    await expect(tabAt(page, 'r', 1)).toHaveAttribute('aria-setsize', '2');
    await expect(page.getByRole('tabpanel', { name: 'Overview' })).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    const [overviewId, panelId] = [await tabAt(page, 'r', 0).getAttribute('id'), await panel(page, 'r', 'overview').getAttribute('id')];
    await expect(tabAt(page, 'r', 0)).toHaveAttribute('aria-controls', panelId!);
    await expect(panel(page, 'r', 'overview')).toHaveAttribute('aria-labelledby', overviewId!);
    await expect(panel(page, 'r', 'activity')).toHaveAttribute('hidden', '');
    // A panel with nothing focusable is a Tab stop; one with a control is not.
    await expect(panel(page, 'r', 'overview')).toHaveAttribute('tabindex', '0');
    await expect(panel(page, 'r', 'activity')).not.toHaveAttribute('tabindex');
    await tabAt(page, 'r', 0).focus();
    await tab(page);
    expect(await focused(page)).toBe(panelId);
    // The icon, the indicator (with the covered copy), the underline and the divider are decorative.
    await expect(icon(page, 'r', 0)).toHaveAttribute('aria-hidden', 'true');
    await expect(cover(page, 'r', 0)).toHaveAttribute('aria-hidden', 'true');
    await expect(underline(page, 'r', 0)).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, 'r').locator('.divider')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('layout', () => {
  test('TAB-14: tabs that hug are their content plus the padding, whole and on one line, never narrower than their indicator, track.padding in from the track’s ends, and scroll inside it; tabs that fill share the width less that padding, at least the target, and truncate a label at its end with an ellipsis; nothing wraps and no icon shrinks', async ({ page }) => {
    const long = 'A label far too long for any share of this row';
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, fixture('long', [t('a', long), t('b', 'B'), t('c', 'C')]), fixture('short-stacked', [t('a', 'A', { icon: 'dashboard' }), t('b', 'Overview', { icon: 'history' })])],
    });
    const [pad, iconSize, inset] = await Promise.all([resolveToken(page, T('container-padding-inline-medium')), resolveToken(page, T('icon-size-medium')), resolveToken(page, T('track-padding'))]);
    expect(inset).toBeGreaterThan(0);
    const oneLine = (await resolveToken(page, T('label-typescale-font-size'))) * Number(await token(page, T('label-typescale-line-height')));
    // Hug (the default): each tab its label plus the padding, the label whole; the tabs start track.padding in from the
    // row's start edge and end the same distance before the track's end, which ends with its last tab (narrower than 360).
    for (const n of [0, 1, 2]) {
      const [b, l] = [await bounds(tabAt(page, 'primary', n)), await bounds(label(page, 'primary', n))];
      expect(b.width).toBeCloseTo(l.width + 2 * pad, 0);
      expect(await truncated(label(page, 'primary', n))).toBe(false);
    }
    const [first, last, tr, r] = [await bounds(tabAt(page, 'primary', 0)), await bounds(tabAt(page, 'primary', 2)), await bounds(track(page, 'primary')), await bounds(row(page, 'primary'))];
    expect(first.x).toBeCloseTo(r.x + inset, 0);
    expect(tr.x).toBeCloseTo(r.x, 0);
    expect(tr.x + tr.width).toBeCloseTo(last.x + last.width + inset, 0);
    expect(tr.width).toBeLessThan(r.width);
    expect(r.width).toBeCloseTo(360, 0);
    // Never narrower than its indicator: a one-letter label under a stacked icon is as wide as the indicator is tall.
    const [narrow, tall] = [await bounds(tabAt(page, 'short-stacked', 0)), await seat(page, 'short-stacked', 0)];
    expect(narrow.width).toBeCloseTo(tall.height, 0);
    expect(tall.height).toBeGreaterThan(narrow.height - 2 * inset - 0.5);
    // A long label stays whole however long: the tab grows and the tabs scroll inside the track.
    expect(await truncated(label(page, 'long', 0))).toBe(false);
    expect((await bounds(label(page, 'long', 0))).height).toBeCloseTo(oneLine, 0);
    expect(await track(page, 'long').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const scroller = track(page, 'primary-scrollable');
    expect(await scroller.evaluate((el) => [el.scrollLeft, el.scrollWidth > el.clientWidth])).toEqual([0, true]);
    expect((await bounds(tabAt(page, 'primary-scrollable', 0))).x).toBeCloseTo((await bounds(row(page, 'primary-scrollable'))).x + inset, 0);
    // …and scrolled to its end, the last tab ends track.padding before the track's end.
    await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const [end, view] = [await bounds(tabAt(page, 'primary-scrollable', 5)), await bounds(scroller)];
    expect(end.x + end.width).toBeCloseTo(view.x + view.width - inset, 0);
    // Fill: equal shares of the 360 row less the padding at each end; a label wider than its share is truncated at its
    // end, on one line, with an ellipsis.
    const share = (360 - 2 * inset) / 3;
    for (const id of ['primary-fill', 'secondary-fill', 'primary-fill-truncated', 'secondary-icons-fill', 'primary-icon-only-fill']) {
      const widths = await Promise.all([0, 1, 2].map(async (n) => (await bounds(tabAt(page, id, n))).width));
      expect(widths.every((w) => Math.abs(w - share) < 0.5), id).toBe(true);
      expect((await bounds(tabAt(page, id, 0))).x, id).toBeCloseTo((await bounds(row(page, id))).x + inset, 0);
      expect((await bounds(track(page, id))).width, id).toBeCloseTo(360, 0);
    }
    expect(await truncated(label(page, 'primary-fill-truncated', 0))).toBe(false);
    for (const n of [1, 2]) {
      const l = label(page, 'primary-fill-truncated', n);
      expect(await truncated(l)).toBe(true);
      expect([await css(l.locator('.text'), 'white-space'), await css(l.locator('.text'), 'text-overflow')]).toEqual(['nowrap', 'ellipsis']);
      expect((await bounds(l)).height).toBeCloseTo(oneLine, 0);
      // Less the padding on each side.
      expect((await bounds(l)).width).toBeCloseTo(share - 2 * pad, 0);
    }
    // Beside an icon: the icon keeps its size; the label is less the icon and the gap, and some do not fit (TAB-14's verify).
    const cutShort = await Promise.all([0, 1, 2].map((n) => truncated(label(page, 'secondary-icons-fill', n))));
    expect(cutShort.some(Boolean)).toBe(true);
    for (const n of [0, 1, 2]) {
      expect((await bounds(icon(page, 'secondary-icons-fill', n))).width).toBeCloseTo(iconSize, 1);
      expect((await bounds(label(page, 'secondary-icons-fill', n))).height).toBeCloseTo(oneLine, 0);
    }
    // A tab that fills is at least the minimum target wide, and the row scrolls when it is too narrow for that.
    await mountFixtures(page, spec, { fixtures: [fixture('many', 'abcdefghijklmnop'.split('').map((c) => t(c, `${c} tab`)), { fullWidth: true })] });
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect((await bounds(tabAt(page, 'many', 0))).width).toBeCloseTo(target, 0);
    expect(await track(page, 'many').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // Under m3-like, whose track.padding is nothing, the first tab starts at the row's edge.
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await resolveToken(page, T('track-padding'))).toBe(0);
    expect((await bounds(tabAt(page, 'primary', 0))).x).toBeCloseTo((await bounds(row(page, 'primary'))).x, 1);
  });

  test('TAB-15: the selected tab is brought into view at once when the row appears, over the indicator’s motion when it is selected or focused, and at once where motion is reduced', async ({ page }) => {
    const long = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'].map((v) => t(v, `${v[0].toUpperCase()}${v.slice(1)} tab`));
    await mountFixtures(page, spec, { fixtures: [fixture('r', long, { selected: 'hotel' })] });
    const scroller = row(page, 'r').locator('.scroller');
    const visible = async (n: number) => {
      const [s, b] = [await bounds(scroller), await bounds(tabAt(page, 'r', n))];
      // Within a pixel: a scroll position is whole pixels, a tab's edge need not be.
      return b.x >= s.x - 1 && b.x + b.width <= s.x + s.width + 1;
    };
    // At once: by the first frames after it appears (the row reveals it again at once while its size settles).
    await expect.poll(() => visible(7), { timeout: 1000 }).toBe(true);
    // Over the motion: sampled on the reveal's own timeline, never the wall clock — a loaded machine may spend the whole
    // motion between two steps of the test. A long duration keeps it running until the test holds it; the spring's curve
    // is within a pixel of its end well before its end, and past it (then clamped) after that.
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    const [duration, easing] = [await resolveToken(page, T('motion-indicator-duration'), 'duration'), await easingToken(page, T('motion-indicator-easing'))];
    await tabAt(page, 'r', 7).focus();
    const start = await scroller.evaluate((el) => el.scrollLeft);
    expect(start).toBeGreaterThan(0);
    await page.keyboard.press('Home');
    /** Holds the reveal at `at` of its duration, and reads the scroll a step of it drew there and the easing's progress. */
    const hold = (at: number) =>
      scroller.evaluate(async (el, f) => {
        const a = el.getAnimations().find((each) => each.id === 'tanrei-tabs-reveal')!;
        const timing = a.effect!.getTiming();
        a.pause();
        a.currentTime = (timing.duration as number) * f;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { duration: timing.duration, easing: timing.easing, progress: a.effect!.getComputedTiming().progress!, scroll: el.scrollLeft };
      }, at);
    for (const at of [0, 0.1, 0.3]) {
      const held = await hold(at);
      expect([held.duration, held.easing]).toEqual([duration, easing]);
      // Where the token's curve puts it (to the scroll position's whole pixel).
      expect(Math.abs(held.scroll - start * (1 - held.progress))).toBeLessThanOrEqual(1);
      expect(await visible(0)).toBe(false); // still moving
    }
    await scroller.evaluate((el) => el.getAnimations().find((each) => each.id === 'tanrei-tabs-reveal')!.finish());
    await expect.poll(() => visible(0)).toBe(true);
    expect(await scroller.evaluate((el) => [el.scrollLeft, el.getAnimations().length])).toEqual([expect.closeTo(0, 0), 0]);
    // At once where motion is reduced: no motion, and the tab in view as soon as the key is handled.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('End');
    expect(await scroller.evaluate((el) => el.getAnimations().filter((a) => a.id === 'tanrei-tabs-reveal').length)).toBe(0);
    expect(await visible(7)).toBe(true);
  });

  test('TAB-16: the indicator behind the content, centred, as tall as the row less track.padding on every tab; in a row that hugs the content plus its padding, and a circle where the content is not wider than it is tall; in a row that fills the tab; the same rule in both variants; the underline on the row’s bottom edge above the divider, spanning the content or the tab', async ({ page }) => {
    test.setTimeout(120_000); // every fixture of the spec is walked: 77 rows
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        fixture('empty', [t('a', ''), t('b', 'B')], { selected: 'a' }),
        fixture('cjk', [t('a', '日'), t('b', 'Recent activity')], { selected: 'a' }),
        fixture('words', [t('a', '日'), t('b', 'Recent activity')], { selected: 'b' }),
        fixture('secondary-letters', [t('s', 'S'), t('custom', 'Custom')], { variant: 'secondary', selected: 's' }),
      ],
    });
    const [pad, inset, gap, plain, stacked] = await Promise.all(['active-indicator-padding-inline-medium', 'track-padding', 'container-gap', 'container-height-medium', 'container-height-with-icon'].map((n) => resolveToken(page, T(n))));
    const centre = (a: { x: number; y: number; width: number; height: number }) => ({ x: a.x + a.width / 2, y: a.y + a.height / 2 });
    const selectedOf = (id: string) => {
      const f = spec.fixtures.find((each) => each.id === id)!;
      return f.items!.findIndex((item) => item.props.value === f.props.selected);
    };
    // The same height on every tab of every row: the row less track.padding above and below — 40 without stacked icons,
    // 56 with them (the default system's numbers, read from its tokens).
    for (const f of spec.fixtures) {
      const n = selectedOf(f.id);
      const [p, b] = [await pill(page, f.id, n), await bounds(tabAt(page, f.id, n))];
      // (A small row has its own height: TAB-44.)
      const rowHeight = f.id === 'primary-icons' ? stacked : f.props.size === 'small' ? await resolveToken(page, T('container-height-small')) : plain;
      expect(b.height, f.id).toBeCloseTo(rowHeight, 0);
      expect(p.height, f.id).toBeCloseTo(rowHeight - 2 * inset, 0);
      expect(p.y, f.id).toBeCloseTo(b.y + inset, 0);
      expect(p.width, f.id).toBeGreaterThanOrEqual(p.height - 0.5);
      // Four corners, at most half its height (sys.shape.corner.full in the default system).
      const variant = String(f.props.variant ?? 'primary');
      expect(p.radius, f.id).toBeCloseTo(Math.min(await resolveToken(page, T(`${variant}-active-indicator-shape`)), p.height / 2, p.width / 2), 1);
      // Behind the content and centred on it.
      const c = await bounds(content(page, f.id, n));
      expect([centre(p).x, centre(p).y], f.id).toEqual([expect.closeTo(centre(c).x, 0), expect.closeTo(centre(c).y, 0)]);
    }
    expect(plain - 2 * inset).toBe(40);
    expect(stacked - 2 * inset).toBe(56);
    // Hugging, content wider than tall: the content plus the padding, which is the tab's own (the alias), so the whole tab
    // — in primary and in secondary alike.
    for (const id of ['primary', 'secondary', 'primary-second-selected', 'primary-icons', 'secondary-icons']) {
      const n = selectedOf(id);
      const [p, b, c] = [await pill(page, id, n), await bounds(tabAt(page, id, n)), await bounds(content(page, id, n))];
      expect([p.x, p.width], id).toEqual([expect.closeTo(c.x - pad, 0), expect.closeTo(c.width + 2 * pad, 0)]);
      expect([p.x, p.width], id).toEqual([expect.closeTo(b.x, 0), expect.closeTo(b.width, 0)]);
    }
    // Hugging, content not wider than tall — an icon alone, a one-letter label, one full-width character — exactly as wide
    // as it is tall: a circle, centred in its tab; the same in secondary.
    for (const [id, n] of [
      ['primary-icon-only', 0],
      ['primary-single-characters', 1],
      ['cjk', 0],
      ['secondary-letters', 0],
    ] as const) {
      const [p, b] = [await pill(page, id, n), await bounds(tabAt(page, id, n))];
      expect(p.width, id).toBeCloseTo(p.height, 1);
      expect(p.width, id).toBeCloseTo(40, 0);
      expect(p.radius, id).toBeCloseTo(p.height / 2, 1);
      expect(centre(p).x, id).toBeCloseTo(centre(b).x, 0);
      expect(p.width, id).toBeLessThanOrEqual(b.width + 0.5);
    }
    // …and a two-word label, a capsule as wide as its tab.
    const [words, wordsTab] = [await pill(page, 'words', 1), await bounds(tabAt(page, 'words', 1))];
    expect(words.width).toBeGreaterThan(words.height);
    expect([words.x, words.width]).toEqual([expect.closeTo(wordsTab.x, 0), expect.closeTo(wordsTab.width, 0)]);
    // Filling: as wide as the tab, whatever it holds — icons alone too — and in both variants.
    for (const id of ['primary-fill', 'secondary-fill', 'primary-fill-truncated', 'secondary-icons-fill', 'primary-icon-only-fill']) {
      const n = selectedOf(id);
      const [p, b] = [await pill(page, id, n), await bounds(tabAt(page, id, n))];
      expect([p.x, p.width], id).toEqual([expect.closeTo(b.x, 0), expect.closeTo(b.width, 0)]);
      expect(p.width, id).toBeGreaterThan(p.height);
    }
    // A stacked icon and its label are both inside the one indicator.
    const [si, ii, il] = [await pill(page, 'primary-icons', 0), await bounds(icon(page, 'primary-icons', 0)), await bounds(label(page, 'primary-icons', 0))];
    expect(il.y - (ii.y + ii.height)).toBeCloseTo(gap, 1);
    expect(within(ii, si) && within(il, si)).toBe(true);
    // A tab with no content: a circular indicator, an underline of no width.
    const none = await pill(page, 'empty', 0);
    expect(none.width).toBeCloseTo(none.height, 1);
    expect((await line(page, 'empty', 0)).width).toBeCloseTo(0, 0);
    // A layer that lowers active-indicator.padding-inline leaves air beside the indicator: the content plus the padding,
    // centred, and no longer the tab.
    await override(page, { [T('active-indicator-padding-inline-medium')]: '6px' });
    await expect.poll(async () => (await pill(page, 'primary', 0)).width).toBeCloseTo((await bounds(label(page, 'primary', 0))).width + 12, 0);
    expect(centre(await pill(page, 'primary', 0)).x).toBeCloseTo(centre(await bounds(tabAt(page, 'primary', 0))).x, 0);
    // …but never narrower than it is tall, and the circle stays a circle.
    expect((await pill(page, 'primary-single-characters', 1)).width).toBeCloseTo(40, 0);
    await override(page, { [T('active-indicator-padding-inline-medium')]: '' });
    await expect.poll(async () => (await pill(page, 'primary', 0)).width).toBeCloseTo((await bounds(tabAt(page, 'primary', 0))).width, 0);
    // The underline: on the row's bottom edge, over the divider, its variant's thickness, the content (primary) or the tab
    // (secondary), its corners away from the divider rounded; in its look's color (transparent in the default system).
    for (const [id, variant] of [
      ['primary', 'primary'],
      ['secondary', 'secondary'],
    ] as const) {
      const [u, r, d] = [await line(page, id, 0), await bounds(row(page, id)), await bounds(row(page, id).locator('.divider'))];
      expect(u.y + u.height).toBeCloseTo(r.y + r.height, 1);
      expect(u.y + u.height).toBeCloseTo(d.y + d.height, 1);
      expect(u.height).toBeCloseTo(await resolveToken(page, T(`${variant}-underline-thickness`)), 1);
      expect(u.radius).toBeCloseTo(await resolveToken(page, T(`${variant}-underline-shape`)), 1);
      expect(await css(underline(page, id, 0), 'background-color')).toBe(await resolveColor(page, T(`${variant}-selected-underline-color`)));
    }
    const [pu, pc] = [await line(page, 'primary', 0), await bounds(content(page, 'primary', 0))];
    expect([pu.x, pu.width]).toEqual([expect.closeTo(pc.x, 0), expect.closeTo(pc.width, 0)]);
    const [su, sb] = [await line(page, 'secondary', 0), await bounds(tabAt(page, 'secondary', 0))];
    expect([su.x, su.width]).toEqual([expect.closeTo(sb.x, 0), expect.closeTo(sb.width, 0)]);
    // A colored underline is drawn where it is, and nowhere else.
    await override(page, { [T('primary-selected-underline-color')]: 'rgb(255, 0, 0)' });
    await expect.poll(() => css(underline(page, 'primary', 0), 'background-color')).toBe('rgb(255, 0, 0)');
    expect((await line(page, 'primary', 1)).x).toBeCloseTo(pu.x, 0);
    // Under m3-like the indicator is transparent and the underline is drawn, as before this revision.
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await css(cover(page, 'primary', 0), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(underline(page, 'primary', 0), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
    const [mu, mc] = [await line(page, 'primary', 0), await bounds(content(page, 'primary', 0))];
    expect([mu.x, mu.width]).toEqual([expect.closeTo(mc.x, 0), expect.closeTo(mc.width, 0)]);
  });

  test('TAB-17: the indicator and the underline slide and resize together from the old tab to the new one over the indicator’s motion, in the new tab’s colors, at once where motion is reduced; the panel changes at once; the first draw and a resize place them at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('r', [t('a', 'Short'), t('b', 'A longer label'), t('c', 'C')], { selected: 'a' }, panels(['a', 'b', 'c']))] });
    // The first draw: in place, no slide.
    expect(await slides(page, 'r')).toBe(0);
    expect(within(await bounds(label(page, 'r', 0)), await pill(page, 'r', 0))).toBe(true);
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    const [duration, easing] = [await resolveToken(page, T('motion-indicator-duration'), 'duration'), await easingToken(page, T('motion-indicator-easing'))];
    const [from, fromLine] = [await pill(page, 'r', 0), await line(page, 'r', 0)];
    await tabAt(page, 'r', 1).click();
    await expect(panel(page, 'r', 'b')).toBeVisible();
    await expect(panel(page, 'r', 'a')).toBeHidden();
    // Held on the slide's own timeline: every tab draws the same box, between the two, where the token's curve puts it.
    for (const at of [0, 0.25, 0.5]) {
      const held = await holdSlide(page, 'r', at);
      expect([held.duration, held.easing]).toEqual([duration, easing]);
      const pieces = await Promise.all([0, 1, 2].map((n) => pill(page, 'r', n)));
      for (const piece of pieces) expect([piece.x, piece.width]).toEqual([expect.closeTo(pieces[0].x, 1), expect.closeTo(pieces[0].width, 1)]);
      const u = await line(page, 'r', 2);
      if (at === 0) {
        expect([pieces[0].x, pieces[0].width]).toEqual([expect.closeTo(from.x, 0), expect.closeTo(from.width, 0)]);
        expect([u.x, u.width]).toEqual([expect.closeTo(fromLine.x, 0), expect.closeTo(fromLine.width, 0)]);
      }
    }
    // The pill is drawn in the newly selected tab's colors wherever it is.
    expect(await css(cover(page, 'r', 0), 'background-color')).toBe(await resolveColor(page, T('primary-selected-active-indicator-color')));
    const mid = await holdSlide(page, 'r', 0.5);
    await finishSlide(page, 'r');
    const [to, toLine] = [await pill(page, 'r', 1), await line(page, 'r', 1)];
    expect(within(await bounds(label(page, 'r', 1)), to)).toBe(true);
    expect(toLine.width).toBeCloseTo((await bounds(content(page, 'r', 1))).width, 0);
    // Between the two at its middle, where the token's curve puts it (the progress read from the effect).
    await tabAt(page, 'r', 0).click();
    const back = await holdSlide(page, 'r', 0.5);
    const now = await pill(page, 'r', 0);
    expect(now.x).toBeCloseTo(to.x + (from.x - to.x) * back.progress, 0);
    expect(now.width).toBeCloseTo(to.width + (from.width - to.width) * back.progress, 0);
    expect(mid.progress).toBe(back.progress);
    await finishSlide(page, 'r');
    // A resize without a new selection: at once, no slide.
    await tabAt(page, 'r', 0).evaluate((el: any) => (el.label = 'Much longer than it was'));
    await expect.poll(async () => within(await bounds(label(page, 'r', 0)), await pill(page, 'r', 0))).toBe(true);
    expect(await slides(page, 'r')).toBe(0);
    // At once where motion is reduced.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tabAt(page, 'r', 2).click();
    expect(await slides(page, 'r')).toBe(0);
    expect(within(await bounds(label(page, 'r', 2)), await pill(page, 'r', 2))).toBe(true);
  });

  test('TAB-17: every frame of a slide is a look a drag draws — a circle becomes a capsule on the way, and a slide over several tabs takes each one’s indicator as it passes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'primary-single-characters'), reducedMotion: false });
    const id = 'primary-single-characters';
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    // S, M, L are circles and Custom a capsule: from M (1) to Custom (3) the indicator passes L (2).
    const seats = await Promise.all([0, 1, 2, 3].map((n) => seat(page, id, n)));
    expect(seats[1].width).toBeCloseTo(seats[1].height, 1);
    expect(seats[3].width).toBeGreaterThan(seats[3].height + 8);
    await tabAt(page, id, 3).click();
    for (const at of [0.05, 0.2, 0.4, 0.6]) {
      const held = await holdSlide(page, id, at);
      // Along the tabs: M at 0, L at one half, Custom at 1 — and between two neighbours, each edge interpolated.
      const along = 1 + 2 * held.progress;
      const drawn = await pill(page, id, 0);
      if (along >= 3) continue; // past the end (an easing that overshoots)
      const [a, b, f] = [seats[Math.floor(along)], seats[Math.floor(along) + 1], along - Math.floor(along)];
      expect(drawn.x, `${at}`).toBeCloseTo(a.x + (b.x - a.x) * f, 0);
      expect(drawn.width, `${at}`).toBeCloseTo(a.width + (b.width - a.width) * f, 0);
      expect(drawn.height, `${at}`).toBeCloseTo(seats[1].height, 1);
      // Never narrower than it is tall, never wider than the capsule it goes to.
      expect(drawn.width).toBeGreaterThanOrEqual(seats[1].height - 0.5);
      expect(drawn.width).toBeLessThanOrEqual(seats[3].width + 0.5);
    }
    await finishSlide(page, id);
    const landed = await pill(page, id, 3);
    expect([landed.x, landed.width]).toEqual([expect.closeTo(seats[3].x, 0), expect.closeTo(seats[3].width, 0)]);
  });

  test('TAB-18: every tab is as tall as the row — at least container.height, height-with-icon where an icon is stacked, and tall enough to keep the tallest content inside the indicator; a primary tab stacks its icon above the label, a secondary one puts it before, centred on its line, gap apart; icons at their size in the fill of the selection; the label in its role', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('mixed', [t('a', 'Stacked', { icon: 'dashboard' }), t('b', 'Plain')], { selected: 'b' })] });
    const [height, withIcon, gap, iconSize, thick, inset] = await Promise.all(['container-height-medium', 'container-height-with-icon', 'container-gap', 'icon-size-medium', 'primary-underline-thickness', 'track-padding'].map((n) => resolveToken(page, T(n))));
    expect((await bounds(tabAt(page, 'primary', 0))).height).toBeCloseTo(height, 1);
    expect((await bounds(tabAt(page, 'primary-icons', 0))).height).toBeCloseTo(withIcon, 1);
    expect((await bounds(tabAt(page, 'secondary-icons', 0))).height).toBeCloseTo(height, 1);
    // Every tab of a row is as tall as the row: a tab without an icon beside one that stacks one, and its indicator too.
    const [tallTab, plainTab, r] = [await bounds(tabAt(page, 'mixed', 0)), await bounds(tabAt(page, 'mixed', 1)), await bounds(track(page, 'mixed'))];
    expect([tallTab.height, plainTab.height]).toEqual([expect.closeTo(withIcon, 1), expect.closeTo(withIcon, 1)]);
    expect(r.height).toBeCloseTo(withIcon, 1);
    expect((await pill(page, 'mixed', 1)).height).toBeCloseTo(withIcon - 2 * inset, 0);
    const [pi, pl] = [await bounds(icon(page, 'primary-icons', 0)), await bounds(label(page, 'primary-icons', 0))];
    expect(pl.y - (pi.y + pi.height)).toBeCloseTo(gap, 1);
    const [si, sl] = [await bounds(icon(page, 'secondary-icons', 0)), await bounds(label(page, 'secondary-icons', 0))];
    expect(sl.x - (si.x + si.width)).toBeCloseTo(gap, 1);
    // Centred on the label's line (one line: TAB-14).
    expect(si.y + si.height / 2).toBeCloseTo(sl.y + sl.height / 2, 0);
    expect(pi.width).toBeCloseTo(iconSize, 1);
    const fill = (n: number) => css(icon(page, 'primary-icons', n), '--tanrei-icon-fill').then((v) => v.trim());
    expect(await fill(0)).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    expect(await fill(1)).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    expect(await css(label(page, 'primary', 0), 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-font-size'))}px`);
    // The row grows as a whole to keep active-indicator.padding-block between the indicator's edge and the content, and
    // the content stays clear of the underline's thickness at the bottom edge.
    await override(page, { [T('active-indicator-padding-block-medium')]: '20px' });
    const oneLine = (await bounds(label(page, 'primary', 0))).height;
    await expect.poll(async () => (await pill(page, 'primary', 0)).height).toBeCloseTo(oneLine + 40, 0);
    const [b, p, other, l] = [await bounds(tabAt(page, 'primary', 0)), await pill(page, 'primary', 0), await bounds(tabAt(page, 'primary', 2)), await bounds(label(page, 'primary', 0))];
    expect(b.height).toBeCloseTo(p.height + 2 * inset, 0);
    expect(other.height).toBeCloseTo(b.height, 1);
    expect(l.y - p.y).toBeCloseTo(20, 0);
    expect(l.y + l.height).toBeLessThanOrEqual(b.y + b.height - thick + 0.5);
  });

  test('TAB-18: hover and press are drawn in the indicator’s box — a capsule, a circle where the content is not wider than tall, the tab’s share in a row that fills — rounded by container.shape, above the track and under the indicator, never on the tab’s rectangle; the whole tab still answers the pointer', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const inset = await resolveToken(page, T('track-padding'));
    const hoveredColor = await resolveColor(page, T('primary-hovered-container-color'));
    expect(hoveredColor).not.toBe(await resolveColor(page, T('primary-container-color')));
    for (const [id, n, form] of [
      ['primary', 1, 'capsule'],
      ['primary-icon-only', 1, 'circle'],
      ['primary-single-characters', 0, 'circle'],
      ['primary-fill', 1, 'capsule'],
      ['primary-icon-only-fill', 2, 'capsule'],
    ] as const) {
      const [whole, c] = [await bounds(tabAt(page, id, n)), await seat(page, id, n)];
      // The box: the row less track.padding above and below, centred in the tab.
      expect([c.y, c.height], id).toEqual([expect.closeTo(whole.y + inset, 1), expect.closeTo(whole.height - 2 * inset, 1)]);
      expect(c.height, id).toBeCloseTo(40, 0);
      expect(c.x + c.width / 2, id).toBeCloseTo(whole.x + whole.width / 2, 0);
      if (form === 'circle') {
        expect(c.width, id).toBeCloseTo(c.height, 1);
        expect(c.width, id).toBeLessThan(whole.width - 1);
      } else expect([c.x, c.width], id).toEqual([expect.closeTo(whole.x, 0), expect.closeTo(whole.width, 0)]);
      // Rounded by container.shape, each corner at most half its height: a capsule or a circle, never a rectangle.
      expect(Number.parseFloat(await css(layer(page, id, n), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(c.height / 2);
      // Where this tab's indicator would be if it were selected: the same box.
      await row(page, id).evaluate((el: any, index) => (el.value = el.tabs[index].value), n);
      await expect.poll(async () => (await pill(page, id, n)).x, id).toBeCloseTo(c.x, 0);
      await finishSlide(page, id);
      const there = await pill(page, id, n);
      expect([there.x, there.y, there.width, there.height], id).toEqual([expect.closeTo(c.x, 0), expect.closeTo(c.y, 0), expect.closeTo(c.width, 0), expect.closeTo(c.height, 0)]);
    }
    // A pointer at the tab's corner — outside the container — shows the hovered state, in the container; the tab's own
    // rectangle draws nothing, in any state.
    await mountFixtures(page, spec, { icons: true });
    for (const [id, n] of [
      ['primary', 1],
      ['primary-icon-only', 1],
    ] as const) {
      const whole = await bounds(tabAt(page, id, n));
      await page.mouse.move(whole.x + 1, whole.y + 1);
      await expect.poll(() => css(layer(page, id, n), 'background-color'), id).toBe(hoveredColor);
      expect(await css(box(page, id, n), 'background-color'), id).toBe('rgba(0, 0, 0, 0)');
      const c = await seat(page, id, n);
      expect(whole.y + 1).toBeLessThan(c.y);
      await page.mouse.down();
      await expect.poll(() => css(layer(page, id, n), 'background-color'), id).toBe(await resolveColor(page, T('primary-pressed-container-color')));
      expect(await css(box(page, id, n), 'background-color'), id).toBe('rgba(0, 0, 0, 0)');
      await page.mouse.up();
      await expect(tabAt(page, id, n)).toHaveAttribute('aria-selected', 'true');
    }
    // Above the track (inside it) and under the indicator: the container comes before the content and the covered layer.
    expect(
      await tabAt(page, 'primary', 0).evaluate((el) => {
        const order = [...el.shadowRoot!.querySelector('.tab')!.children].map((child) => child.className.split(' ')[0]);
        return order.indexOf('box') < order.indexOf('content') && order.indexOf('content') < order.indexOf('cover');
      }),
    ).toBe(true);
    await expect(layer(page, 'primary', 0)).toHaveAttribute('aria-hidden', 'true');
    // m3-like (track.padding nothing, container.shape square): the container is the whole tab, square — on a tab whose
    // content is not wider than it is tall in a row that hugs too, since such a tab is as wide as its indicator's box
    // (the row's height) and no wider (TAB-14): the container is as wide as the row is tall, and that is the tab.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    for (const id of ['primary', 'primary-fill', 'primary-icon-only-fill', 'secondary-icons']) {
      const [whole, c] = [await bounds(tabAt(page, id, 1)), await seat(page, id, 1)];
      expect([c.x, c.y, c.width, c.height], id).toEqual([expect.closeTo(whole.x, 1), expect.closeTo(whole.y, 1), expect.closeTo(whole.width, 1), expect.closeTo(whole.height, 1)]);
      expect(await css(layer(page, id, 1), 'border-top-left-radius'), id).toBe('0px');
    }
    const [gapTab, gapSeat] = [await bounds(tabAt(page, 'primary-icon-only', 1)), await seat(page, 'primary-icon-only', 1)];
    expect(gapSeat.width).toBeCloseTo(gapTab.height, 1);
    expect(gapSeat.width).toBeCloseTo(gapTab.width, 1);
  });

  test('TAB-19: an icon-only tab draws its icon alone and keeps its label as its name; without an icon it draws the label and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('bare', [t('a', 'Alone', { labelHidden: true }), t('b', 'B')])] });
    await expect(tabAt(page, 'primary-icon-only', 0).locator('.label')).toHaveCount(0);
    await expect(icon(page, 'primary-icon-only', 0)).toHaveCount(1);
    await expect(tabAt(page, 'primary-icon-only', 0)).toHaveAttribute('aria-label', 'Overview');
    await expect(label(page, 'bare', 0)).toHaveText('Alone');
    await expect.poll(() => seen.filter((w) => w.includes('TAB-19')).length).toBe(1);
  });

  test('TAB-20: a divider of its thickness and color along the whole bottom of the row, even while it scrolls, hidden from assistive technology', async ({ page }) => {
    await mountFixtures(page, spec);
    const d = row(page, 'primary-scrollable').locator('.divider');
    const [b, r] = [await bounds(d), await bounds(row(page, 'primary-scrollable'))];
    expect([b.x, b.width, b.y + b.height]).toEqual([expect.closeTo(r.x, 1), expect.closeTo(r.width, 1), expect.closeTo(r.y + r.height, 1)]);
    expect(b.height).toBeCloseTo(await resolveToken(page, T('divider-thickness')), 1);
    expect(await css(d, 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    await row(page, 'primary-scrollable').locator('.scroller').evaluate((el) => (el.scrollLeft = 200));
    const after = await bounds(d);
    expect([after.x, after.width]).toEqual([b.x, b.width]);
    await expect(d).toHaveAttribute('aria-hidden', 'true');
  });

  test('TAB-21: right-to-left orders the tabs from the right, starts a row that hugs at its right edge, truncates a label at the end of the label’s own direction (TAB-33: a left-to-right label at its right end, in both copies) and mirrors the slide', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('hug', THREE, { selected: 'overview' }),
        { ...spec.fixtures.find((f) => f.id === 'primary-scrollable')!, id: 'scroll' },
        { ...spec.fixtures.find((f) => f.id === 'primary-fill-truncated')!, id: 'cut' },
      ],
    });
    await page.locator('main').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const [a, b, r] = [await bounds(tabAt(page, 'hug', 0)), await bounds(tabAt(page, 'hug', 1)), await bounds(row(page, 'hug'))];
    expect(a.x).toBeGreaterThan(b.x);
    // The track starts at the right edge, and the tabs track.padding in from it.
    const inset = await resolveToken(page, T('track-padding'));
    const tr = await bounds(track(page, 'hug'));
    expect(tr.x + tr.width).toBeCloseTo(r.x + r.width, 0);
    expect(tr.width).toBeLessThan(r.width);
    expect(a.x + a.width).toBeCloseTo(r.x + r.width - inset, 0);
    const [first, s] = [await bounds(tabAt(page, 'scroll', 0)), await bounds(row(page, 'scroll'))];
    expect(first.x + first.width).toBeCloseTo(s.x + s.width - inset, 0);
    // TAB-33: a label is cut at the end of ITS direction. "Recent activity" is a left-to-right label in a right-to-left
    // row: in both of its copies it begins at its box's left edge and loses its right end, where the ellipsis is drawn —
    // the box that cuts it has the label's direction, which is what places the ellipsis in every engine.
    expect(await css(row(page, 'cut'), 'direction')).toBe('rtl');
    for (const copy of [label(page, 'cut', 1), tabAt(page, 'cut', 1).locator('.cover .label')]) {
      const e = await cutEnds(copy);
      expect(e.overflows).toBe(true);
      expect([e.direction, e.textOverflow]).toEqual(['ltr', 'ellipsis']);
      expect(e.first.left).toBeCloseTo(e.box.left, 0);
      expect(e.last.left).toBeGreaterThan(e.first.left);
    }
    // The slide goes left, from the old tab's box to the new one's.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const from = await pill(page, 'hug', 0);
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    await tabAt(page, 'hug', 1).click();
    await holdSlide(page, 'hug', 0);
    expect((await pill(page, 'hug', 1)).x).toBeCloseTo(from.x, 0);
    await finishSlide(page, 'hug');
    const to = await pill(page, 'hug', 1);
    expect(to.x).toBeLessThan(from.x);
    expect(within(await bounds(label(page, 'hug', 1)), to)).toBe(true);
    // A drag still carries the indicator to where the pointer is: toward the left is toward the later tabs.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const third = await seat(page, 'hug', 2);
    await drag(page, 'hug', 1, glide(await centreX(page, 'hug', 1), await centreX(page, 'hug', 2)), { up: null });
    const carried = await pill(page, 'hug', 2);
    expect([carried.x, carried.width]).toEqual([expect.closeTo(third.x, 0), expect.closeTo(third.width, 0)]);
    expect(carried.x).toBeLessThan(to.x);
    await pointer(page, 'hug', 'pointerup', await centreX(page, 'hug', 2));
    expect(await row(page, 'hug').evaluate((el: any) => el.value)).toBe('settings');
  });

  test('TAB-33: a label is cut at the end of its own direction whatever the layout’s — a right-to-left label at its left end in a left-to-right row, a left-to-right label at its right end in either — and the box of a label without a letter keeps the layout’s direction', async ({ page }) => {
    const fill = (id: string, text: string, direction?: 'rtl'): Fixture => ({ ...fixture(id, [t('a', text), t('b', 'B'), t('c', 'C'), t('d', 'D')], { fullWidth: true, selected: 'b' }), ...(direction ? { direction } : {}) });
    await mountFixtures(page, spec, { fixtures: [fill('arabic-ltr', ARABIC_LONG), fill('arabic-rtl', ARABIC_LONG, 'rtl'), fill('latin-ltr', 'Notification settings and privacy'), fill('number-rtl', '2026-10-06 12:00:00.000000 +0900', 'rtl')] });
    // A right-to-left label: it begins at its box's right edge and loses its left end, in either layout.
    for (const id of ['arabic-ltr', 'arabic-rtl']) {
      for (const copy of [label(page, id, 0), tabAt(page, id, 0).locator('.cover .label')]) {
        const e = await cutEnds(copy);
        expect(e.overflows, id).toBe(true);
        expect([e.direction, e.textOverflow], id).toEqual(['rtl', 'ellipsis']);
        expect(e.first.right, id).toBeCloseTo(e.box.right, 0);
        expect(e.last.right, id).toBeLessThan(e.first.right);
      }
      expect(await css(label(page, id, 0), 'unicode-bidi'), id).toBe('plaintext');
    }
    // A left-to-right label in a left-to-right row: the same end as in a right-to-left one (TAB-21's test).
    const latin = await cutEnds(label(page, 'latin-ltr', 0));
    expect([latin.overflows, latin.direction]).toEqual([true, 'ltr']);
    expect(latin.first.left).toBeCloseTo(latin.box.left, 0);
    expect(latin.last.left).toBeGreaterThan(latin.first.left);
    // No letter, no direction of its own: the box keeps the layout's (no `dir` is written), its digits in their own
    // order. (Where such a label is cut is not asserted: the engines disagree on the paragraph direction of a text
    // without a strong character.)
    const number = await cutEnds(label(page, 'number-rtl', 0));
    expect([number.direction, number.dir]).toEqual(['rtl', null]);
    expect(number.last.left).toBeGreaterThan(number.first.left);
  });

  test('TAB-22: a tab without a label still renders, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('r', [t('a', ''), t('b', 'B')])] });
    await expect(tabs(page, 'r')).toHaveCount(2);
    await expect(tabAt(page, 'r', 0)).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('TAB-22')).length).toBe(1);
  });

  test('TAB-24: each label and icon is drawn again in its look’s covered colors, clipped to the indicator: wholly covered when it lands in every fixture, partly while it slides; a clip, not a blend; each label exposed once', async ({ page }) => {
    test.setTimeout(120_000); // every fixture of the spec is walked: 77 rows
    await mountFixtures(page, spec, { icons: true });
    await page.waitForTimeout(400); // colors transition
    // Landed, in every fixture: the selected tab's content lies wholly within the indicator, in the covered colors; the
    // plain content has the indicator's shape cut out, so nothing is drawn twice under a translucent indicator.
    for (const f of spec.fixtures) {
      const n = f.items!.findIndex((item) => item.props.value === f.props.selected);
      const variant = (f.props.variant as string) ?? 'primary';
      const state = f.items![n].props.disabled ? 'disabled-' : '';
      const p = await pill(page, f.id, n);
      for (const part of [label(page, f.id, n), icon(page, f.id, n)]) if (await part.count()) expect(within(await bounds(part), p), f.id).toBe(true);
      if (await label(page, f.id, n).count()) {
        expect(await css(tabAt(page, f.id, n).locator('.cover .label'), 'color'), f.id).toBe(await resolveColor(page, T(`${variant}-${state}selected-covered-label-color`)));
      }
      if (await icon(page, f.id, n).count()) {
        expect(await css(tabAt(page, f.id, n).locator('.cover .icon'), 'color'), f.id).toBe(await resolveColor(page, T(`${variant}-${state}selected-covered-icon-color`)));
      }
      expect(await css(content(page, f.id, n), 'clip-path'), f.id).toMatch(/^path\(evenodd/);
      // The others are not covered: nothing of their copy is drawn, and their plain content is whole. Every other tab
      // the fixture has — a row may hold two (the two-icon fixtures) or six, not always three.
      for (const other of f.items!.map((_, m) => m).filter((m) => m !== n)) {
        const o = await pill(page, f.id, other);
        const c = await bounds(content(page, f.id, other));
        expect(o.x + o.width <= c.x + 0.5 || o.x >= c.x + c.width - 0.5, `${f.id}/${other}`).toBe(true);
        expect(await css(content(page, f.id, other), 'clip-path'), `${f.id}/${other}`).toBe('none');
      }
    }
    // A clip, not a blend mode.
    for (const part of ['.cover', '.cover .label', '.tab > .content']) expect(await css(tabAt(page, 'primary', 0).locator(part), 'mix-blend-mode'), part).toBe('normal');
    // Each label exposed once: the copy is hidden, the tab named by its label.
    const tree = await row(page, 'primary').locator('[role="tablist"]').ariaSnapshot();
    expect(tree.match(/Overview/g)).toHaveLength(1);

    // Mid-slide, with motion: a label the indicator passes over is covered where it is covered — in the same frame as
    // the indicator, on every tab — and the newly selected one only when it lands.
    await mountFixtures(page, spec, { fixtures: [fixture('r', [t('a', 'First'), t('b', 'The middle one'), t('c', 'Last')], { selected: 'a' })], reducedMotion: false });
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    await tabAt(page, 'r', 2).click();
    const middle = await bounds(label(page, 'r', 1));
    let partly = false;
    for (const at of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
      const { progress } = await holdSlide(page, 'r', at);
      const pieces = await Promise.all([0, 1, 2].map((n) => pill(page, 'r', n)));
      for (const piece of pieces) expect([piece.x, piece.width, piece.y, piece.height]).toEqual([expect.closeTo(pieces[0].x, 1), expect.closeTo(pieces[0].width, 1), expect.closeTo(pieces[0].y, 1), expect.closeTo(pieces[0].height, 1)]);
      const p = pieces[1];
      const overlaps = p.x < middle.x + middle.width && p.x + p.width > middle.x;
      if (overlaps && !within(middle, p)) {
        partly = true;
        // The copy on the middle tab is in its own (not selected) look's covered color; its plain label is cut where covered.
        expect(await css(tabAt(page, 'r', 1).locator('.cover .label'), 'color')).toBe(await resolveColor(page, T('primary-covered-label-color')));
        expect(await css(content(page, 'r', 1), 'clip-path')).toMatch(/^path\(evenodd/);
      }
      // The newly selected label is not wholly covered while the indicator is still on its way (a spring may overshoot at
      // the end, carrying the indicator past its place and back).
      if (progress < 0.5) expect(within(await bounds(label(page, 'r', 2)), p)).toBe(false);
    }
    expect(partly).toBe(true);
    await finishSlide(page, 'r');
    expect(within(await bounds(label(page, 'r', 2)), await pill(page, 'r', 2))).toBe(true);
  });

  test('TAB-25: a truncated label stays the whole name and is shown whole in a plain tooltip on hover and keyboard focus, not exposed again; a label that fits has none', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [{ ...spec.fixtures.find((f) => f.id === 'primary-fill-truncated')!, id: 'cut' }] });
    // "Profile" fits; "Recent activity" and "Notification settings" do not.
    await expect(tip(page, 'cut', 0)).toHaveCount(0);
    await expect(tip(page, 'cut', 1)).toHaveCount(1);
    await expect(tip(page, 'cut', 2)).toHaveCount(1);
    // The whole label is the name, once: no description, and the tooltip is hidden from assistive technology.
    await expect(page.getByRole('tab', { name: 'Recent activity', exact: true })).toHaveCount(1);
    for (const n of [1, 2]) {
      await expect(tip(page, 'cut', n)).toHaveAttribute('aria-hidden', 'true');
      await expect(tabAt(page, 'cut', n)).not.toHaveAttribute('aria-describedby');
      await expect(tabAt(page, 'cut', n)).not.toHaveAttribute('aria-description');
    }
    const open = (n: number) => tip(page, 'cut', n).evaluate((el: any) => el.open as boolean);
    // Hover: a plain tooltip with the whole label.
    await box(page, 'cut', 1).hover();
    await expect.poll(() => open(1), { timeout: 5000 }).toBe(true);
    await expect(tip(page, 'cut', 1)).toHaveAttribute('variant', 'plain');
    await expect(tip(page, 'cut', 1).locator('.text')).toHaveText('Recent activity');
    await page.mouse.move(0, 0);
    await expect.poll(() => open(1), { timeout: 5000 }).toBe(false);
    // Keyboard focus: at once, on the selected tab (the Tab stop), and on each truncated tab the arrows reach.
    await tabTo(page, tabAt(page, 'cut', 2));
    await expect.poll(() => open(2)).toBe(true);
    await expect(tip(page, 'cut', 2).locator('.text')).toHaveText('Notification settings');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => open(1)).toBe(true);
    expect(await open(2)).toBe(false);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => open(1)).toBe(false);
    // Once the labels fit (a wider row), no tooltip at all.
    await row(page, 'cut').evaluate((el) => ((el as HTMLElement).style.inlineSize = '720px'));
    await expect(row(page, 'cut').locator('tanrei-tooltip')).toHaveCount(0);
  });

  test('TAB-26: indicatorOffset draws the indicator and the underline between the selected tab and its next (above 0) or previous (below 0) enabled neighbour, each edge interpolated, clamped to 1, in the frame it is set and without a slide; on the selected tab where there is none; a selection made at an offset is placed at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('r', [t('a', 'Short'), t('b', 'A longer label'), t('c', 'C'), t('d', 'Last')], { selected: 'b' })], reducedMotion: true });
    // Where the indicator and the underline land on each tab (placed at once: motion is reduced).
    const landed: { x: number; width: number }[] = [];
    const lines: { x: number; width: number }[] = [];
    for (const v of ['a', 'b', 'c', 'd']) {
      await row(page, 'r').evaluate((el: any, value) => (el.value = value), v);
      const n = ['a', 'b', 'c', 'd'].indexOf(v);
      await expect.poll(async () => within(await bounds(label(page, 'r', n)), await pill(page, 'r', n))).toBe(true);
      landed.push(await pill(page, 'r', n));
      lines.push(await line(page, 'r', n));
    }
    await row(page, 'r').evaluate((el: any) => (el.value = 'b'));
    await expect.poll(async () => (await pill(page, 'r', 1)).x).toBeCloseTo(landed[1].x, 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    /** Sets the offset and reads, in the same task, where tab `n`'s piece of the indicator is drawn. */
    const set = (offset: number, n = 0) =>
      row(page, 'r').evaluate((el: any, [o, i]) => {
        el.indicatorOffset = o;
        const cover = el.querySelectorAll('tanrei-tab')[i].shadowRoot.querySelector('.cover') as HTMLElement;
        const v = /^inset\((.*)\)$/.exec(cover.style.clipPath)![1].split(' round ')[0].trim().split(/\s+/).map(Number.parseFloat);
        const [right, left] = v.length === 1 ? [v[0], v[0]] : v.length < 4 ? [v[1], v[1]] : [v[1], v[3]];
        const r = cover.getBoundingClientRect();
        return { x: r.x + left, width: r.width - left - right, slides: el.renderRoot.querySelector('.tabs').getAnimations().length };
      }, [offset, n] as const);
    const between = (from: { x: number; width: number }, to: { x: number; width: number }, m: number) => ({ x: from.x + (to.x - from.x) * m, width: from.width + (to.width - from.width) * m });
    for (const [offset, to] of [[0.5, landed[2]], [-0.5, landed[0]], [0.25, landed[2]]] as const) {
      const now = await set(offset);
      const want = between(landed[1], to, Math.abs(offset));
      expect([now.x, now.width, now.slides], String(offset)).toEqual([expect.closeTo(want.x, 0), expect.closeTo(want.width, 0), 0]);
    }
    // The underline follows too.
    await set(0.5);
    const u = await line(page, 'r', 1);
    const wantLine = between(lines[1], lines[2], 0.5);
    expect([u.x, u.width]).toEqual([expect.closeTo(wantLine.x, 0), expect.closeTo(wantLine.width, 0)]);
    // Halfway, a label under the indicator is partly in each color: its covered copy is drawn, its plain label cut.
    expect(await css(cover(page, 'r', 2), 'visibility')).toBe('visible');
    expect(await css(content(page, 'r', 2), 'clip-path')).toMatch(/^path\(evenodd/);
    // 1 is wholly on the neighbour; beyond 1 it stays there.
    for (const offset of [1, 2]) {
      const now = await set(offset);
      expect([now.x, now.width], String(offset)).toEqual([expect.closeTo(landed[2].x, 0), expect.closeTo(landed[2].width, 0)]);
    }
    expect(within(await bounds(label(page, 'r', 2)), await pill(page, 'r', 2))).toBe(true);
    // The selected tab's colors, wherever it is drawn.
    expect(await css(cover(page, 'r', 2), 'background-color')).toBe(await resolveColor(page, T('primary-selected-active-indicator-color')));
    // A disabled neighbour is skipped; with no enabled tab in that direction the indicator stays on the selected tab.
    await tabAt(page, 'r', 2).evaluate((el: any) => (el.disabled = true));
    await expect(tabAt(page, 'r', 2)).toHaveAttribute('aria-disabled', 'true');
    let now = await set(1);
    expect(now.x).toBeCloseTo(landed[3].x, 0);
    await tabAt(page, 'r', 2).evaluate((el: any) => (el.disabled = false));
    await set(0);
    await row(page, 'r').evaluate((el: any) => (el.value = 'd'));
    await page.waitForTimeout(50);
    await finishSlide(page, 'r');
    now = await set(0.5, 3);
    expect([now.x, now.width]).toEqual([expect.closeTo(landed[3].x, 0), expect.closeTo(landed[3].width, 0)]);
    // A selection made at an offset (the commit of TBV-4): the next tab selected and the offset −0.5 in one frame — the
    // indicator does not move, and no slide starts (TAB-17 slides only while the offset is 0).
    await set(0);
    await row(page, 'r').evaluate((el: any) => (el.value = 'b'));
    await page.waitForTimeout(50);
    await finishSlide(page, 'r');
    const before = await set(0.5);
    await row(page, 'r').evaluate((el: any) => {
      el.value = 'c';
      el.indicatorOffset = -0.5;
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await slides(page, 'r')).toBe(0);
    const after = await pill(page, 'r', 0);
    expect([after.x, after.width]).toEqual([expect.closeTo(before.x, 0), expect.closeTo(before.width, 0)]);
    await expect(tabAt(page, 'r', 2)).toHaveAttribute('aria-selected', 'true');
    // Back to 0: on the selected tab at once.
    now = await set(0, 2);
    expect([now.x, now.slides]).toEqual([expect.closeTo(landed[2].x, 0), 0]);
  });

  test('TAB-13: where a Tab view is linked, its panels take the place of the row’s own — each tab controls the view’s panel of its value, the row’s panels stay hidden — and the row’s own come back when the view goes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('r', THREE, { selected: 'overview' }, panels(['overview', 'activity', 'settings']))] });
    await row(page, 'r').evaluate((el) => {
      el.id = 'linked-row';
      const view = document.createElement('tanrei-tab-view');
      view.setAttribute('tabs', 'linked-row');
      view.innerHTML = ['overview', 'activity', 'settings'].map((v) => `<tanrei-tab-panel value="${v}"><p>Linked ${v}</p></tanrei-tab-panel>`).join('');
      el.after(view);
    });
    const linked = (v: string) => page.locator(`tanrei-tab-view tanrei-tab-panel[value="${v}"]`);
    await expect(linked('overview')).toBeVisible();
    for (const [n, v] of ['overview', 'activity', 'settings'].entries()) {
      await expect(tabAt(page, 'r', n)).toHaveAttribute('aria-controls', (await linked(v).getAttribute('id'))!);
      await expect(panel(page, 'r', v)).toBeHidden();
    }
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel', { name: 'Overview' })).toHaveText('Linked overview');
    await expect(linked('overview')).toHaveAttribute('aria-labelledby', (await tabAt(page, 'r', 0).getAttribute('id'))!);
    // The view goes: the row's own panels are its panels again.
    await page.locator('tanrei-tab-view').evaluate((el) => el.remove());
    await expect(panel(page, 'r', 'overview')).toBeVisible();
    await expect(tabAt(page, 'r', 0)).toHaveAttribute('aria-controls', (await panel(page, 'r', 'overview').getAttribute('id'))!);
  });
});

/**
 * Touch input, for the tests that read what TAB-5 gives it: only Chromium can emulate a coarse pointer (touch emulation
 * over CDP). Returns whether it did; the page's fixtures take the touch target in the frame after.
 */
async function touchInput(page: P, browserName: string): Promise<boolean> {
  if (browserName !== 'chromium') return false;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await expect.poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  await frames(page, 3);
  return true;
}
/** Half a device pixel, in CSS px: what TAB-34's and TAB-35's distances are held to. */
const halfPixel = (page: P) => page.evaluate(() => 0.5 / devicePixelRatio);
/** Selects a tab by the row's value, as a product does, and lets the indicator land and the row scroll to it. */
const choose = async (page: P, id: string, n: number) => {
  await row(page, id).evaluate(async (el: any, index) => {
    el.value = el.querySelectorAll('tanrei-tab')[index].value;
    await el.updateComplete;
  }, n);
  await frames(page, 3);
};
/** Scrolls the tabs inside the track to its start or its end, as far as they go (TAB-34: the distance holds there). */
const scrollTo = async (page: P, id: string, end: 'start' | 'end') => {
  await track(page, id).evaluate((el, to) => {
    const rtl = getComputedStyle(el).direction === 'rtl';
    const far = el.scrollWidth - el.clientWidth;
    el.scrollLeft = to === 'start' ? 0 : rtl ? -far : far;
  }, end);
  await frames(page, 3);
};
/** A box's distances from the track's top, bottom, start and end edges (left and right: a right-to-left row's start is its `end` here). */
const insets = async (page: P, id: string, inner: { x: number; y: number; width: number; height: number }) => {
  const outer = await bounds(track(page, id));
  return { top: inner.y - outer.y, bottom: outer.y + outer.height - (inner.y + inner.height), start: inner.x - outer.x, end: outer.x + outer.width - (inner.x + inner.width) };
};

test.describe('concentric at every size', () => {
  test('TAB-14, TAB-34: a row whose end tab is a circle has its settled width in the frame it is first laid out in, before that frame is painted — what stands beside it is never drawn at the wider place', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.slice(0, 1) });
    for (const labels of [['標準', '中', '高'], ['قياسي', 'متوسط', 'عالٍ'], ['Standard', 'Medium', 'High']]) {
      const seen = await page.evaluate(async (labels) => {
        const holder = document.createElement('div');
        holder.style.cssText = 'display: flex; align-items: center; padding: 16px';
        holder.innerHTML = `<tanrei-tabs variant="tonal" track="false" transition="none" size="small" label="Contrast" value="a">${labels.map((label, i) => `<tanrei-tab value="${'abc'[i]}" label="${label}"></tanrei-tab>`).join('')}</tanrei-tabs><span>after</span>`;
        document.body.prepend(holder);
        const [row, after] = [holder.firstElementChild as HTMLElement, holder.lastElementChild as HTMLElement];
        // An observer made after the row's own is told after it, in the same frame: after its layout, before its paint.
        const first = await new Promise<number[]>((resolve) => {
          const observer = new ResizeObserver(() => {
            observer.disconnect();
            resolve([row.getBoundingClientRect().width, after.getBoundingClientRect().x]);
          });
          observer.observe(row);
        });
        await new Promise((resolve) => setTimeout(resolve, 400));
        const settled = [row.getBoundingClientRect().width, after.getBoundingClientRect().x];
        const round = [...row.querySelectorAll('tanrei-tab')].map((tab) => tab.shadowRoot!.querySelector('.tab')!.hasAttribute('data-round'));
        holder.remove();
        return { first, settled, round };
      }, labels);
      expect(seen.first, `${labels.join(' / ')}: ${JSON.stringify(seen)}`).toEqual(seen.settled);
      // (Whether a short Arabic word is wider than it is tall is the face's, which differs by engine here.)
      if (labels[0] === '標準') expect(seen.round[2], `${labels.join(' / ')}: the last tab is a circle`).toBe(true);
    }
  });

  test('TAB-14: a tab whose indicator is a circle is that circle and no wider — an icon-only tab and a one-character tab take no inline padding and are as wide as the minimum target, not their content plus the padding — while a capsule keeps its content plus the padding; the tabs are placed by the indicator, the first one’s starting track.padding from the track’s start and the last one’s ending the same distance before its end', async ({ page, browserName }) => {
    test.setTimeout(120_000); // every fixture of the spec is walked
    await mountFixtures(page, spec, { icons: true });
    const [pad, inset, height] = await Promise.all([resolveToken(page, T('container-padding-inline-medium')), resolveToken(page, T('track-padding')), resolveToken(page, T('container-height-medium'))]);
    const half = await halfPixel(page);
    const circle = height - 2 * inset;
    const check = async (target: number) => {
      // The circles: `primary-icon-only` (every tab), `primary-single-characters` (S, M, L), the two-icon rows.
      for (const [id, round] of [['primary-icon-only', [0, 1, 2]], ['primary-single-characters', [0, 1, 2]], ['primary-two-icons', [0, 1]], ['secondary-two-icons', [0, 1]]] as const) {
        for (const n of round) {
          const [whole, c] = [await bounds(tabAt(page, id, n)), await seat(page, id, n)];
          expect(c.width, `${id}/${n}: a circle`).toBeCloseTo(c.height, 1);
          expect(c.width, `${id}/${n}`).toBeCloseTo(circle, 1);
          // The larger of the circle and the minimum target — never the content plus container.padding-inline on each side.
          expect(whole.width, `${id}/${n}`).toBeCloseTo(Math.max(circle, target), 1);
          if (await icon(page, id, n).count()) expect(whole.width, `${id}/${n}`).toBeLessThan((await bounds(content(page, id, n))).width + 2 * pad);
          expect(await css(box(page, id, n), 'padding-inline-start'), `${id}/${n}`).toBe('0px');
          expect(await css(cover(page, id, n), 'padding-inline-end'), `${id}/${n}`).toBe('0px');
          // The circle is centred in its tab, and its glyph or letter in the circle.
          expect(c.x + c.width / 2, `${id}/${n}`).toBeCloseTo(whole.x + whole.width / 2, 1);
          const inner = await bounds(content(page, id, n));
          expect(inner.x + inner.width / 2, `${id}/${n}`).toBeCloseTo(c.x + c.width / 2, 1);
        }
      }
      // A capsule beside them keeps its content plus the padding on each side.
      const [custom, text] = [await bounds(tabAt(page, 'primary-single-characters', 3)), await bounds(label(page, 'primary-single-characters', 3))];
      expect(custom.width).toBeCloseTo(text.width + 2 * pad, 0);
      expect(await css(box(page, 'primary-single-characters', 3), 'padding-inline-start')).toBe(`${pad}px`);
      // Placed by the indicator: track.padding from the track's start to the first indicator, and from the last one to
      // its end — whatever the tab around the indicator is wide — and the track ends there, no wider.
      for (const f of spec.fixtures.filter((each) => !each.id.includes('scrollable'))) {
        // (A row whose tabs scroll is held to it at each end by TAB-34's test, which scrolls there.)
        if (await track(page, f.id).evaluate((el) => el.scrollWidth - el.clientWidth > 0.5)) continue;
        const last = f.items!.length - 1;
        // In a right-to-left row the first tab is at the right: the two measured ends change places.
        const [a, b] = [await insets(page, f.id, await seat(page, f.id, 0)), await insets(page, f.id, await seat(page, f.id, last))];
        const [first, end] = f.direction === 'rtl' ? [{ start: a.end }, { end: b.start }] : [a, b];
        expect(Math.abs(first.start - inset), `${f.id}: the first indicator is ${first.start} from the track's start`).toBeLessThanOrEqual(half);
        expect(Math.abs(end.end - inset), `${f.id}: the last indicator ends ${end.end} before the track's end`).toBeLessThanOrEqual(half);
      }
      // The tab itself reaches into that inset by half of what it is wider than its circle, and no further than the edge.
      const reach = Math.min(inset, (Math.max(circle, target) - circle) / 2);
      const [t0, tr] = [await bounds(tabAt(page, 'primary-icon-only', 0)), await bounds(track(page, 'primary-icon-only'))];
      expect(t0.x - tr.x).toBeCloseTo(inset - reach, 1);
      const [t2] = [await bounds(tabAt(page, 'primary-icon-only', 2))];
      expect(tr.x + tr.width - (t2.x + t2.width)).toBeCloseTo(inset - reach, 1);
      // A row that fills keeps its shares, with the padding: an icon alone in a share is not a circle's tab.
      const share = await bounds(tabAt(page, 'primary-icon-only-fill', 0));
      expect(share.width).toBeGreaterThan(2 * target);
      expect(await css(box(page, 'primary-icon-only-fill', 0), 'padding-inline-start')).toBe(`${pad}px`);
    };
    await check(await resolveToken(page, '--tanrei-sys-target-pointer'));
    // No tab scrolls for it: the narrower tabs still fit their track exactly.
    for (const id of ['primary-icon-only', 'primary-two-icons', 'primary-single-characters']) expect(await track(page, id).evaluate((el) => el.scrollWidth - el.clientWidth), id).toBeLessThanOrEqual(0.5);
    if (await touchInput(page, browserName)) await check(await resolveToken(page, '--tanrei-sys-target-touch'));
    // m3-like, whose track.padding is nothing: the first tab starts at the row's edge, as before.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    for (const id of ['primary', 'primary-icon-only', 'primary-two-icons']) {
      const [first, outer] = [await bounds(tabAt(page, id, 0)), await bounds(track(page, id))];
      expect(first.x, id).toBeCloseTo(outer.x, 1);
    }
  });

  test('TAB-34: in every fixture the selected indicator lies track.padding from the track’s top, from its bottom and — with the first tab selected, then the last — from the track’s end, within half a device pixel; the track’s corner less track.padding is the indicator’s corner, so the two ends are concentric: rows 48 tall, 64 with stacked icons, rows that fill, circles', async ({ page }) => {
    test.setTimeout(120_000);
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const inset = await resolveToken(page, T('track-padding'));
    const half = await halfPixel(page);
    expect(inset).toBe(4);
    const heights = new Set<number>();
    for (const f of spec.fixtures) {
      const last = f.items!.length - 1;
      for (const [n, side] of [[0, 'start'], [last, 'end']] as const) {
        await choose(page, f.id, n);
        await scrollTo(page, f.id, side);
        const where = `${f.id}, the ${side === 'start' ? 'first' : 'last'} tab selected`;
        // In a right-to-left row the start is the right edge: the edge measured is the other one.
        const at = f.direction === 'rtl' ? (side === 'start' ? 'end' : 'start') : side;
        const [thumb, outer] = [await pill(page, f.id, n), await bounds(track(page, f.id))];
        const d = await insets(page, f.id, thumb);
        // Where the tabs scroll inside the track, the far end is as near as the engine scrolls: it rounds the range it
        // scrolls over to whole CSS pixels, and tabs that hug their text are not whole pixels wide.
        const scrolled = side === 'end' && (await track(page, f.id).evaluate((el) => el.scrollWidth - el.clientWidth > 0.5));
        for (const [name, distance] of [['top', d.top], ['bottom', d.bottom], [side, d[at]]] as const) {
          expect(Math.abs(distance - inset), `${where}: ${distance} from the track's ${name}`).toBeLessThanOrEqual(scrolled && name === side ? 0.5 : half);
        }
        // Concentric: both corners are full, the track's half its height and the indicator's half its own — the track's
        // corner less track.padding. The curves then share their centre: half the track's height from its end and top.
        const corner = Number.parseFloat(await css(track(page, f.id), 'border-top-left-radius'));
        expect(Math.min(corner, outer.height / 2), where).toBeCloseTo(outer.height / 2, 1);
        expect(Math.min(thumb.radius, thumb.height / 2), where).toBeCloseTo(outer.height / 2 - inset, 1);
        const centre = at === 'start' ? thumb.x + thumb.height / 2 - outer.x : outer.x + outer.width - (thumb.x + thumb.width - thumb.height / 2);
        expect(Math.abs(centre - outer.height / 2), `${where}: the end's centre is ${centre} from the track's end`).toBeLessThanOrEqual(scrolled ? 0.5 : half);
        expect(thumb.y + thumb.height / 2, where).toBeCloseTo(outer.y + outer.height / 2, 1);
        heights.add(outer.height);
        // The tab's container and its focus ring are drawn in the indicator's box: the same place.
        const [c, r] = [await seat(page, f.id, n), await bounds(ring(page, f.id, n))];
        for (const part of [c, r]) expect([part.x, part.y, part.width, part.height], where).toEqual([expect.closeTo(thumb.x, 1), expect.closeTo(thumb.y, 1), expect.closeTo(thumb.width, 1), expect.closeTo(thumb.height, 1)]);
      }
    }
    // Both row heights were measured: 48, and 64 where a primary tab stacks its icon above its label.
    expect([...heights].sort((a, b) => a - b)).toEqual([await resolveToken(page, T('container-height-small')), await resolveToken(page, T('container-height-medium')), await resolveToken(page, T('container-height-with-icon'))]);
    // The circles: 24 from the end and 24 from the top — the centre of the track's half circle.
    for (const id of ['primary-icon-only', 'primary-single-characters', 'primary-two-icons']) {
      await choose(page, id, 0);
      const [thumb, outer] = [await pill(page, id, 0), await bounds(track(page, id))];
      expect(thumb.width, id).toBeCloseTo(thumb.height, 1);
      expect([thumb.x + thumb.width / 2 - outer.x, thumb.y + thumb.height / 2 - outer.y], id).toEqual([expect.closeTo(24, 1), expect.closeTo(24, 1)]);
    }
  });

  test('TAB-34: hovered and focused, the first and the last tab’s container and focus ring lie in the indicator’s box, track.padding from the track’s top, bottom and end; the ring meets the track’s edge and stays inside it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: spec.fixtures.filter((f) => ['primary', 'primary-icons', 'primary-fill', 'primary-icon-only', 'primary-two-icons', 'secondary-two-icons'].includes(f.id)) });
    const inset = await resolveToken(page, T('track-padding'));
    const half = await halfPixel(page);
    for (const f of spec.fixtures.filter((each) => ['primary', 'primary-icons', 'primary-fill', 'primary-icon-only', 'primary-two-icons', 'secondary-two-icons'].includes(each.id))) {
      const last = f.items!.length - 1;
      for (const [n, side] of [[0, 'start'], [last, 'end']] as const) {
        // The tab that is not selected: its container shows on hover.
        await choose(page, f.id, n === 0 ? last : 0);
        const where = `${f.id}/${n}`;
        await tabAt(page, f.id, n).hover();
        await expect.poll(() => css(layer(page, f.id, n), 'background-color'), where).not.toBe('rgba(0, 0, 0, 0)');
        const hovered = await insets(page, f.id, await seat(page, f.id, n));
        for (const [name, distance] of [['top', hovered.top], ['bottom', hovered.bottom], [side, hovered[side]]] as const) {
          expect(Math.abs(distance - inset), `${where} hovered: ${distance} from the track's ${name}`).toBeLessThanOrEqual(half);
        }
        await page.mouse.move(0, 0);
        await tabAt(page, f.id, n).focus();
        await page.keyboard.press(n === 0 ? 'ArrowRight' : 'ArrowLeft');
        await page.keyboard.press(n === 0 ? 'ArrowLeft' : 'ArrowRight');
        await expect(tabAt(page, f.id, n), where).toBeFocused();
        await frames(page, 3);
        const r = ring(page, f.id, n);
        expect(await css(r, 'outline-style'), where).toBe('solid');
        const focused = await insets(page, f.id, await bounds(r));
        for (const [name, distance] of [['top', focused.top], ['bottom', focused.bottom], [side, focused[side]]] as const) {
          expect(Math.abs(distance - inset), `${where} focused: ${distance} from the track's ${name}`).toBeLessThanOrEqual(half);
        }
        // The ring reaches the track's edge and no further: its offset and width are what the inset holds.
        const reach = Number.parseFloat(await css(r, 'outline-offset')) + Number.parseFloat(await css(r, 'outline-width'));
        expect(reach, where).toBeLessThanOrEqual(inset + 0.01);
      }
    }
  });

  test('TAB-34: at twice the text size the row is taller and the indicator still lies track.padding from the track’s top, bottom and ends, its corner the track’s less that padding; in right-to-left the ends are the mirrored ones', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: spec.fixtures.filter((f) => ['primary', 'primary-two-icons'].includes(f.id)) });
    const before = (await bounds(track(page, 'primary'))).height;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page, 4);
    const inset = await resolveToken(page, T('track-padding'));
    const half = await halfPixel(page);
    for (const id of ['primary', 'primary-two-icons']) {
      const last = id === 'primary' ? 2 : 1;
      for (const [n, side] of [[0, 'start'], [last, 'end']] as const) {
        await choose(page, id, n);
        await scrollTo(page, id, side);
        const [thumb, outer] = [await pill(page, id, n), await bounds(track(page, id))];
        expect(outer.height, id).toBeGreaterThan(before);
        const d = await insets(page, id, thumb);
        // (This row scrolls at this size: its far end is as near as the engine scrolls, to a whole CSS pixel.)
        const scrolled = side === 'end' && (await track(page, id).evaluate((el) => el.scrollWidth - el.clientWidth > 0.5));
        for (const distance of [d.top, d.bottom]) expect(Math.abs(distance - inset), `${id}/${n} at twice the text size: ${JSON.stringify(d)}`).toBeLessThanOrEqual(half);
        expect(Math.abs(d[side] - inset), `${id}/${n} at twice the text size: ${JSON.stringify(d)}`).toBeLessThanOrEqual(scrolled ? 0.5 : half);
        expect(Math.min(thumb.radius, thumb.height / 2), id).toBeCloseTo(outer.height / 2 - inset, 1);
      }
    }
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, dir: 'rtl', fixtures: spec.fixtures.filter((f) => ['primary', 'primary-two-icons'].includes(f.id)) });
    const rtlInset = await resolveToken(page, T('track-padding'));
    for (const id of ['primary', 'primary-two-icons']) {
      const last = id === 'primary' ? 2 : 1;
      // The first tab is at the right end, the last at the left.
      for (const [n, side] of [[0, 'end'], [last, 'start']] as const) {
        await choose(page, id, n);
        const d = await insets(page, id, await pill(page, id, n));
        for (const distance of [d.top, d.bottom, d[side]]) expect(Math.abs(distance - rtlInset), `${id}/${n} right-to-left: ${JSON.stringify(d)}`).toBeLessThanOrEqual(half);
      }
    }
  });

  /** TAB-35's table for one input type: the two-icon row, to the pixel. */
  const twoIcons = async (page: P, id: string, target: number) => {
    const [inset, height, glyph] = await Promise.all([resolveToken(page, T('track-padding')), resolveToken(page, T('container-height-medium')), resolveToken(page, T('icon-size-medium'))]);
    const half = await halfPixel(page);
    const circle = height - 2 * inset;
    const pitch = Math.max(circle, target);
    // In the viewport: the hit areas are read from the page, where a point is.
    await row(page, id).scrollIntoViewIfNeeded();
    const outer = await bounds(track(page, id));
    const near = (value: number, want: number, what: string) => expect(Math.abs(value - want), `${id}: ${what} is ${value}, not ${want}`).toBeLessThanOrEqual(half);
    // The track: as wide as two tabs leave it and no wider, the row's height tall, a capsule.
    near(outer.height, height, 'the track’s height');
    near(outer.width, 2 * pitch - 2 * Math.min(inset, (pitch - circle) / 2) + 2 * inset, 'the track’s width');
    expect(Number.parseFloat(await css(track(page, id), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(height / 2);
    const seats = [await seat(page, id, 0), await seat(page, id, 1)];
    for (const [n, c] of seats.entries()) {
      // Each tab's place: a circle of one diameter, the glyph at its centre, clear all round by the same amount.
      near(c.width, circle, `circle ${n}’s width`);
      near(c.height, circle, `circle ${n}’s height`);
      expect(Number.parseFloat(await css(layer(page, id, n), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(circle / 2);
      const g = await bounds(icon(page, id, n));
      near(g.width, glyph, `glyph ${n}’s width`);
      near(g.x + g.width / 2, c.x + c.width / 2, `glyph ${n}’s centre`);
      near(g.y + g.height / 2, c.y + c.height / 2, `glyph ${n}’s middle`);
      near(c.y - outer.y, inset, `circle ${n} from the track’s top`);
      near(outer.y + outer.height - (c.y + c.height), inset, `circle ${n} from the track’s bottom`);
    }
    // The centres: half the track's height from its start, and one tab's width further; the ends concentric.
    near(seats[0].x + circle / 2 - outer.x, height / 2, 'the first centre');
    near(seats[1].x - seats[0].x, pitch, 'the pitch');
    near(seats[0].x - outer.x, inset, 'the first circle from the track’s start');
    near(outer.x + outer.width - (seats[1].x + circle), inset, 'the last circle from the track’s end');
    near(seats[1].x - (seats[0].x + circle), pitch - circle, 'the space between the circles');
    // Symmetric about the track's middle.
    near(seats[0].x + circle / 2 - outer.x, outer.x + outer.width - (seats[1].x + circle / 2), 'the mirror');
    // The hit areas: every point of the track selects the tab whose circle is nearer — they meet halfway between the
    // circles and reach the track's top, its bottom and its ends — so each is half the track wide and all of it tall.
    const hit = (x: number, y: number) =>
      page.evaluate(([px, py]) => {
        let el: Element | null = document.elementFromPoint(px, py);
        while (el && el.localName !== 'tanrei-tab') el = el.parentElement ?? ((el.getRootNode() as ShadowRoot).host ?? null);
        return el ? [...el.parentElement!.querySelectorAll('tanrei-tab')].indexOf(el) : -1;
      }, [x, y] as const);
    const mid = outer.x + outer.width / 2;
    const middle = outer.y + outer.height / 2;
    for (const [x, y, want, what] of [
      [outer.x + 0.75, middle, 0, 'the track’s start edge'],
      [mid - 1.5, middle, 0, 'just before the middle'],
      [mid + 1.5, middle, 1, 'just after the middle'],
      [outer.x + outer.width - 0.75, middle, 1, 'the track’s end edge'],
      [seats[0].x + circle / 2, outer.y + 0.75, 0, 'the top, above the first circle'],
      [seats[0].x + circle / 2, outer.y + outer.height - 0.75, 0, 'the bottom, under the first circle'],
      [seats[1].x + circle / 2, outer.y + 0.75, 1, 'the top, above the second circle'],
      [seats[1].x + circle / 2, outer.y + outer.height - 0.75, 1, 'the bottom, under the second circle'],
    ] as const) {
      expect(await hit(x, y), `${id}: ${what}`).toBe(want);
    }
    expect(outer.width / 2, `${id}: each hit area's width`).toBeGreaterThanOrEqual(Math.min(target, outer.width / 2) - half);
    return { outer, seats, circle, pitch, inset };
  };

  test('TAB-35: the two-icon row with a fine pointer — a 92 by 48 track, two 40 circles 4 apart with a 24 glyph at each centre, centres 24 and 68 from the start, each hit area half the track; the second-selected fixture is its mirror image and the secondary one has the same geometry in its thumb’s color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const a = await twoIcons(page, 'primary-two-icons', target);
    // The table's numbers, in the default system.
    expect([a.outer.width, a.outer.height, a.circle, a.pitch]).toEqual([92, 48, 40, 44]);
    expect(a.seats.map((c) => c.x + 20 - a.outer.x)).toEqual([expect.closeTo(24, 1), expect.closeTo(68, 1)]);
    expect(a.seats[1].x - (a.seats[0].x + 40)).toBeCloseTo(4, 1);
    expect(a.outer.width / 2).toBe(46);
    const b = await twoIcons(page, 'primary-two-icons-second-selected', target);
    const c = await twoIcons(page, 'secondary-two-icons', target);
    for (const other of [b, c]) {
      expect([other.outer.width, other.outer.height]).toEqual([a.outer.width, a.outer.height]);
      expect(other.seats.map((s) => s.x - other.outer.x)).toEqual(a.seats.map((s) => expect.closeTo(s.x - a.outer.x, 1)));
    }
    // Mirrored: the thumb is on the other circle, the same distance from the other end.
    const [thumbA, thumbB] = [await pill(page, 'primary-two-icons', 0), await pill(page, 'primary-two-icons-second-selected', 1)];
    expect(thumbB.width).toBeCloseTo(thumbA.width, 1);
    expect(b.outer.x + b.outer.width - (thumbB.x + thumbB.width)).toBeCloseTo(thumbA.x - a.outer.x, 1);
    // Secondary: the same thumb, in the secondary thumb's color.
    const thumbC = await pill(page, 'secondary-two-icons', 0);
    expect([thumbC.x - c.outer.x, thumbC.width, thumbC.height]).toEqual([expect.closeTo(thumbA.x - a.outer.x, 1), expect.closeTo(40, 1), expect.closeTo(40, 1)]);
    await expect.poll(async () => (await drawn(page, 'secondary-two-icons', 0)).pill).toBe(await resolveColor(page, T('secondary-selected-active-indicator-color')));
    await expect.poll(async () => (await drawn(page, 'primary-two-icons', 0)).pill).toBe(await resolveColor(page, T('primary-selected-active-indicator-color')));
  });

  test('TAB-35: the two-icon row with touch input — a 96 by 48 track, two 40 circles 8 apart, centres 24 and 72 from the start, each hit area 48 by 48', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    await touchInput(page, browserName);
    const target = await resolveToken(page, '--tanrei-sys-target-touch');
    for (const id of ['primary-two-icons', 'primary-two-icons-second-selected', 'secondary-two-icons']) {
      const a = await twoIcons(page, id, target);
      expect([a.outer.width, a.outer.height, a.circle, a.pitch], id).toEqual([96, 48, 40, 48]);
      expect(a.seats.map((c) => c.x + 20 - a.outer.x), id).toEqual([expect.closeTo(24, 1), expect.closeTo(72, 1)]);
      expect(a.seats[1].x - (a.seats[0].x + 40), id).toBeCloseTo(8, 1);
      // The first tab's 48 box starts at the track's edge, and each tab is a 48 by 48 half of the track.
      for (const n of [0, 1]) {
        const whole = await bounds(tabAt(page, id, n));
        expect([whole.x - a.outer.x, whole.width, whole.height], `${id}/${n}`).toEqual([expect.closeTo(48 * n, 1), expect.closeTo(48, 1), expect.closeTo(48, 1)]);
      }
    }
  });

  test('TAB-35: selecting the other tab slides the thumb across as that circle — 40 wide in every frame, its centre travelling one tab’s width — and a drag carries it the same way; the tab that is not selected hovers and focuses as a 40 circle concentric with the track’s other end', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, fixtures: spec.fixtures.filter((f) => f.id === 'primary-two-icons') });
    const id = 'primary-two-icons';
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    const [inset, half] = [await resolveToken(page, T('track-padding')), await halfPixel(page)];
    const outer = await bounds(track(page, id));
    const seats = [await seat(page, id, 0), await seat(page, id, 1)];
    const circle = seats[0].width;
    const travel = seats[1].x - seats[0].x;
    expect([circle, travel]).toEqual([expect.closeTo(40, 1), expect.closeTo(await resolveToken(page, '--tanrei-sys-target-pointer'), 1)]);
    // The slide: every frame held is the circle, between the two places.
    await tabAt(page, id, 1).click();
    const xs: number[] = [];
    for (const at of [0.05, 0.2, 0.4, 0.6, 0.8]) {
      await holdSlide(page, id, at);
      const thumb = await pill(page, id, 0);
      expect(Math.abs(thumb.width - circle), `slide at ${at}: ${thumb.width} wide`).toBeLessThanOrEqual(half);
      expect(Math.abs(thumb.height - circle), `slide at ${at}`).toBeLessThanOrEqual(half);
      expect(Math.min(thumb.radius, thumb.height / 2), `slide at ${at}`).toBeCloseTo(circle / 2, 1);
      expect(thumb.y - outer.y, `slide at ${at}`).toBeCloseTo(inset, 1);
      expect(thumb.x).toBeGreaterThanOrEqual(seats[0].x - 0.5);
      expect(thumb.x).toBeLessThanOrEqual(seats[1].x + 0.5);
      xs.push(thumb.x);
    }
    expect(new Set(xs.map((x) => Math.round(x * 10))).size, `${xs}`).toBeGreaterThan(2);
    await finishSlide(page, id);
    const landed = await pill(page, id, 1);
    expect(landed.x - seats[0].x).toBeCloseTo(travel, 1);
    expect(landed.width).toBeCloseTo(circle, 1);
    await expect(tabAt(page, id, 1)).toHaveAttribute('aria-selected', 'true');
    // The drag: from the selected (second) tab's centre to the first one's, held on the way — the same circle.
    await override(page, { [T('motion-indicator-duration')]: '0s' });
    const [c0, c1] = [await centreX(page, id, 0), await centreX(page, id, 1)];
    const path = [0.25, 0.5, 0.75, 1].map((f) => c1 + (c0 - c1) * f);
    await drag(page, id, 1, glide(c1, path[0]), { up: null });
    expect(await dragging(page, id)).toBe(true);
    await finishCatchUp(page, id);
    for (const x of path) {
      await pointer(page, id, 'pointermove', x, 16);
      await frames(page);
      const thumb = await pill(page, id, 0);
      expect(Math.abs(thumb.width - circle), `drag at ${x}: ${thumb.width} wide`).toBeLessThanOrEqual(half);
      expect(thumb.x + thumb.width / 2, `drag at ${x}`).toBeCloseTo(x, 0);
    }
    await pointer(page, id, 'pointerup', c0);
    await expect(tabAt(page, id, 0)).toHaveAttribute('aria-selected', 'true');
    await frames(page, 3);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[0].x, 1);
    // The tab that is not selected (the second): hovered, then focused — a 40 circle concentric with the other end.
    await tabAt(page, id, 1).hover();
    await expect.poll(() => css(layer(page, id, 1), 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
    for (const part of [await seat(page, id, 1), await bounds(ring(page, id, 1))]) {
      expect([part.width, part.height]).toEqual([expect.closeTo(circle, 1), expect.closeTo(circle, 1)]);
      expect(outer.x + outer.width - (part.x + part.width / 2)).toBeCloseTo(outer.height / 2, 1);
      expect(part.y + part.height / 2).toBeCloseTo(outer.y + outer.height / 2, 1);
    }
    await page.mouse.move(0, 0);
    await tabAt(page, id, 0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabAt(page, id, 1)).toBeFocused();
    expect(await css(ring(page, id, 1), 'outline-style')).toBe('solid');
    expect(Number.parseFloat(await css(ring(page, id, 1), 'border-top-left-radius'))).toBeGreaterThanOrEqual(circle / 2);
  });

  test('TAB-35: a tap in the track’s inset at each end selects the nearer tab; the row stays a row of tabs — each a tab named by its label — and activating the selected one changes nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: spec.fixtures.filter((f) => f.id === 'primary-two-icons') });
    const id = 'primary-two-icons';
    await wire(page);
    const outer = await bounds(track(page, id));
    const middle = outer.y + outer.height / 2;
    // The inset at the end: beyond the last circle, inside the track.
    await page.mouse.click(outer.x + outer.width - 1, middle);
    expect(await log(page)).toEqual(['dark:dark']);
    await expect(tabAt(page, id, 1)).toHaveAttribute('aria-selected', 'true');
    // …and at the start.
    await page.mouse.click(outer.x + 1, middle);
    expect(await log(page)).toEqual(['dark:dark', 'light:light']);
    // The selected half again: nothing changes, and no change is emitted.
    await page.mouse.click(outer.x + 1, middle);
    await tabAt(page, id, 0).click();
    await tabAt(page, id, 0).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['dark:dark', 'light:light']);
    await expect(tabAt(page, id, 0)).toHaveAttribute('aria-selected', 'true');
    // A row of tabs, not a switch: a tab list of two tabs, each named by its label; the arrows select.
    expect(await row(page, id).locator('[role="tablist"]').ariaSnapshot()).toBe(['- tablist "Theme":', '  - tab "Light" [selected]', '  - tab "Dark"'].join('\n'));
    await expect(row(page, id).getByRole('switch')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    expect(await log(page)).toEqual(['dark:dark', 'light:light', 'dark:dark']);
  });
});

test.describe('the track and the drag', () => {
  const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
  const state = (page: P, id: string) =>
    row(page, id).evaluate((el: any) => ({
      value: el.value as string | null,
      selected: [...el.querySelectorAll('tanrei-tab')].map((tab) => tab.getAttribute('aria-selected')),
      stops: [...el.querySelectorAll('tanrei-tab')].map((tab) => tab.getAttribute('tabindex')),
      hidden: [...el.querySelectorAll('tanrei-tab-panel')].map((panel) => panel.hasAttribute('hidden')),
      focus: (document.activeElement as HTMLElement | null)?.getAttribute('value') ?? null,
    }));

  test('TAB-27: a track behind the whole row — its variant’s color, track.shape corners, no outline, as tall as the row, as wide as the tabs plus its padding and never wider than the row — the same whichever tab is selected and whatever state a tab is in; it stays still while the tabs scroll inside it; transparent under m3-like', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const inset = await resolveToken(page, T('track-padding'));
    const look = async (id: string) => {
      const tr = track(page, id);
      const b = await bounds(tr);
      return { color: await css(tr, 'background-color'), radius: await css(tr, 'border-top-left-radius'), border: await css(tr, 'border-top-width'), outline: await css(tr, 'outline-style'), shadow: await css(tr, 'box-shadow'), width: b.width, height: b.height };
    };
    for (const [id, variant] of [
      ['primary', 'primary'],
      ['secondary', 'secondary'],
    ] as const) {
      const [l, r, last] = [await look(id), await bounds(row(page, id)), await bounds(tabAt(page, id, 2))];
      expect(l.color, id).toBe(await resolveColor(page, T(`${variant}-track-color`)));
      expect(l.color, id).toBe(await resolveColor(page, '--tanrei-sys-color-secondary-container'));
      // A capsule: each corner at most half its height. No outline of any kind.
      expect(Number.parseFloat(l.radius), id).toBeGreaterThanOrEqual(l.height / 2);
      expect([l.border, l.outline, l.shadow], id).toEqual(['0px', 'none', 'none']);
      expect(l.height, id).toBeCloseTo(r.height, 1);
      expect(l.height, id).toBeCloseTo((await bounds(tabAt(page, id, 0))).height, 1);
      expect(r.x + l.width, id).toBeCloseTo(last.x + last.width + inset, 0);
      expect(l.width, id).toBeLessThanOrEqual(r.width);
    }
    // The same whichever tab is selected, and whatever state a tab is in.
    const rest = await look('primary');
    expect(await look('primary-second-selected')).toEqual(rest);
    for (const id of ['primary-disabled', 'primary-selected-disabled']) expect({ ...(await look(id)), width: 0 }, id).toEqual({ ...rest, width: 0 });
    expect((await look('primary-disabled')).width).toBeCloseTo((await look('primary-selected-disabled')).width, 1);
    await box(page, 'primary', 1).hover();
    await page.mouse.down();
    expect(await look('primary')).toEqual(rest);
    await page.mouse.up();
    await finishSlide(page, 'primary');
    expect(await look('primary')).toEqual(rest);
    // The label and icon on the track are its content color, selected or not (seen outside the indicator).
    const onTrack = await resolveColor(page, '--tanrei-sys-color-on-secondary-container');
    expect([await resolveColor(page, T('primary-label-color')), await resolveColor(page, T('primary-selected-label-color'))]).toEqual([onTrack, onTrack]);
    // No line: the underline and the divider are drawn, transparent.
    expect(await css(row(page, 'primary').locator('.divider'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(underline(page, 'primary', 0), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // Tabs that do not fit: the track is the row's 360, stays still, and the tabs scroll under its rounded ends.
    const scroller = track(page, 'primary-scrollable');
    const before = await bounds(scroller);
    expect(before.width).toBeCloseTo(360, 0);
    await scroller.evaluate((el) => (el.scrollLeft = 120));
    expect(await bounds(scroller)).toEqual(before);
    expect((await bounds(tabAt(page, 'primary-scrollable', 0))).x).toBeLessThan(before.x);
    expect([await css(scroller, 'overflow-x'), Number.parseFloat(await css(scroller, 'border-top-left-radius')) >= before.height / 2]).toEqual(['auto', true]);
    // Hidden from assistive technology: the track is the scroller's own background, no element of its own.
    expect(await scroller.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([null, null]);
    // m3-like: nothing is drawn — transparent, square, no padding — and the divider is.
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await css(track(page, 'primary'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(track(page, 'primary'), 'border-top-left-radius')).toBe('0px');
    expect(await css(row(page, 'primary').locator('.divider'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-outline-variant'));
  });

  test('TAB-28: a touch, a pen or a mouse dragged past the slop, further sideways than up or down, is taken — the press activates no tab and the pressed tab leaves its pressed state — and the indicator and the underline are drawn where the pointer is: on a tab at its centre, halfway where two meet, each edge interpolated between, on the end tabs beyond their centres', async ({ page }) => {
    for (const system of [undefined, 'm3-like']) {
      await mountFixtures(page, spec, { fixtures: only('primary-fill', 'primary'), reducedMotion: true, ...(system ? { system } : {}) });
      await wire(page);
      const id = 'primary-fill';
      const seats = await Promise.all([0, 1, 2].map((n) => seat(page, id, n)));
      const lines = await Promise.all([0, 1, 2].map((n) => bounds(content(page, id, n))));
      const [c0, c1, c2, meet, meet12] = [await centreX(page, id, 0), await centreX(page, id, 1), await centreX(page, id, 2), await meetX(page, id, 0, 1), await meetX(page, id, 1, 2)];
      const before = await state(page, id);
      // Not past the slop: nothing follows.
      await drag(page, id, 0, [{ x: c0 + 6 }], { up: null });
      expect(await dragging(page, id)).toBe(false);
      await pointer(page, id, 'pointerup', c0 + 6);
      // Held where Overview and Activity meet: halfway between them.
      await drag(page, id, 0, glide(c0, meet), { up: null });
      expect(await dragging(page, id), `${system}`).toBe(true);
      const half = await pill(page, id, 0);
      expect([half.x, half.width]).toEqual([expect.closeTo((seats[0].x + seats[1].x) / 2, 0), expect.closeTo((seats[0].width + seats[1].width) / 2, 0)]);
      const halfLine = await line(page, id, 0);
      expect([halfLine.x, halfLine.width]).toEqual([expect.closeTo((lines[0].x + lines[1].x) / 2, 0), expect.closeTo((lines[0].width + lines[1].width) / 2, 0)]);
      // Activity's label is partly under the indicator: partly in each color (the covered copy's clip, TAB-24).
      const l1 = await bounds(label(page, id, 1));
      expect(half.x + half.width).toBeGreaterThan(l1.x + 1);
      expect(half.x + half.width).toBeLessThan(l1.x + l1.width - 1);
      // Nothing is selected, exposed or emitted.
      expect(await state(page, id)).toEqual(before);
      expect(await log(page)).toEqual([]);
      // Every edge at the linear interpolation in between: a quarter of the way to where they meet is an eighth…
      for (const [x, from, to, f] of [
        [c0 + (meet - c0) / 2, 0, 1, 0.25],
        [meet + (c1 - meet) / 2, 0, 1, 0.75],
        [c1, 1, 1, 0],
        [meet12, 1, 2, 0.5],
        [c2, 2, 2, 0],
        // …and on the first or last enabled tab before or beyond its centre.
        [c2 + 40, 2, 2, 0],
        [c0 - 30, 0, 0, 0],
      ] as const) {
        await pointer(page, id, 'pointermove', x, 16);
        const now = await pill(page, id, 1);
        expect(now.x, `${system} ${x}`).toBeCloseTo(seats[from].x + (seats[to].x - seats[from].x) * f, 0);
        expect(now.width, `${system} ${x}`).toBeCloseTo(seats[from].width + (seats[to].width - seats[from].width) * f, 0);
        expect((await line(page, id, 1)).x, `${system} ${x}`).toBeCloseTo(lines[from].x + (lines[to].x - lines[from].x) * f, 0);
      }
      expect(await state(page, id)).toEqual(before);
      await pointer(page, id, 'pointercancel');
      expect(await dragging(page, id)).toBe(false);
      // A pen drags it as a finger does.
      await drag(page, id, 0, glide(c0, c1), { up: null, pointerType: 'pen' });
      expect(await dragging(page, id)).toBe(true);
      expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
      await pointer(page, id, 'pointercancel');
      // Further up or down than sideways when it passes the slop: left to the page for its whole length.
      await drag(page, id, 0, [{ x: c0 + 4, y: 12 }, { x: c0 + 60, y: 14 }, { x: c1, y: 14 }], { up: null });
      expect(await dragging(page, id)).toBe(false);
      expect((await pill(page, id, 0)).x).toBeCloseTo(seats[0].x, 0);
      await pointer(page, id, 'pointerup', c1);
      expect(await log(page)).toEqual([]);
    }
    // A mouse: a press on Settings dragged 12 to the side is taken — the pointer captured, the tab's pressed state ended
    // as when a press ends — and one dragged 12 down is not, and is a tap.
    await mountFixtures(page, spec, { fixtures: only('primary'), reducedMotion: true });
    await wire(page);
    const s = await bounds(tabAt(page, 'primary', 2));
    const [sx, sy] = [s.x + s.width / 2, s.y + s.height / 2];
    await page.evaluate(() => window.addEventListener('pointerdown', (e) => ((window as any).mouseId = e.pointerId), { capture: true }));
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await expect(box(page, 'primary', 2)).toHaveAttribute('data-pressed', 'overlay');
    await page.mouse.move(sx - 6, sy);
    await page.mouse.move(sx - 12, sy);
    expect(await dragging(page, 'primary')).toBe(true);
    expect(await row(page, 'primary').evaluate((el) => el.hasPointerCapture((window as any).mouseId))).toBe(true);
    await expect.poll(() => box(page, 'primary', 2).getAttribute('data-pressed')).toBeNull();
    // Released there: Settings is the tab the indicator is on, selected by the release — once, not again by a click.
    await page.mouse.up();
    expect(await log(page)).toEqual(['settings:settings']);
    await row(page, 'primary').evaluate((el: any) => (el.value = 'overview'));
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx, sy + 6);
    await page.mouse.move(sx, sy + 12);
    expect(await dragging(page, 'primary')).toBe(false);
    await page.mouse.up();
    expect(await log(page)).toEqual(['settings:settings', 'settings:settings']);
    // Sideways drags are the row's and vertical ones the page's.
    expect(await css(track(page, 'primary'), 'touch-action')).toBe('pan-y pinch-zoom');
  });

  test('TAB-28: the look changes continuously with the pointer, with no threshold — a circle widens into a capsule, nothing jumps where two tabs meet — and a frame of a tap’s slide is the frame a drag draws at that place (TAB-17)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-single-characters', 'primary'), reducedMotion: false });
    await override(page, { [T('motion-state-duration')]: '0s' });
    const id = 'primary-single-characters';
    const seats = await Promise.all([0, 1, 2, 3].map((n) => seat(page, id, n)));
    const [cL, cCustom, meet] = [await centreX(page, id, 2), await centreX(page, id, 3), await meetX(page, id, 2, 3)];
    // Held where L and Custom meet (dragged from M, across L): halfway between L's circle and Custom's capsule.
    await drag(page, id, 1, glide(await centreX(page, id, 1), meet), { up: null });
    const half = await pill(page, id, 0);
    expect(half.width).toBeCloseTo((seats[2].width + seats[3].width) / 2, 0);
    expect(half.x).toBeCloseTo((seats[2].x + seats[3].x) / 2, 0);
    expect(half.width).toBeGreaterThan(seats[2].width + 4);
    expect(half.height).toBeCloseTo(seats[2].height, 1);
    // Custom's label is in its covered color exactly where the indicator covers it.
    const custom = await bounds(label(page, id, 3));
    expect(half.x + half.width).toBeGreaterThan(custom.x);
    expect(half.x + half.width).toBeLessThan(custom.x + custom.width);
    // No frame shows a jump as the pointer crosses the place where the tabs meet: a pixel of travel is at most a pixel or
    // so of change, on both sides of it and across it.
    let last = await pill(page, id, 0);
    for (let x = meet - 3; x <= meet + 3; x += 1) {
      await pointer(page, id, 'pointermove', x, 16);
      const now = await pill(page, id, 0);
      expect(Math.abs(now.width - last.width), `${x}`).toBeLessThan(3);
      expect(Math.abs(now.x - last.x), `${x}`).toBeLessThan(3);
      last = now;
    }
    // Monotonic from the circle to the capsule.
    const widths: number[] = [];
    for (let i = 0; i <= 10; i++) {
      await pointer(page, id, 'pointermove', cL + ((cCustom - cL) * i) / 10, 16);
      widths.push((await pill(page, id, 0)).width);
    }
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    expect([widths[0], widths[10]]).toEqual([expect.closeTo(seats[2].width, 0), expect.closeTo(seats[3].width, 0)]);
    await pointer(page, id, 'pointercancel');

    // A frame of a tap's slide, and a drag held at the indicator's place in that frame: the same thing.
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    await tabAt(page, 'primary', 1).click();
    const held = await holdSlide(page, 'primary', 0.2);
    const [slid, slidLine, slidClip] = [await pill(page, 'primary', 1), await line(page, 'primary', 1), await css(cover(page, 'primary', 1), 'clip-path')];
    expect(held.progress).toBeGreaterThan(0);
    expect(held.progress).toBeLessThan(1);
    await finishSlide(page, 'primary');
    await row(page, 'primary').evaluate((el: any) => (el.value = 'overview'));
    await finishSlide(page, 'primary');
    const [c0, c1, m01] = [await centreX(page, 'primary', 0), await centreX(page, 'primary', 1), await meetX(page, 'primary', 0, 1)];
    const x = held.progress <= 0.5 ? c0 + ((m01 - c0) * held.progress) / 0.5 : m01 + ((c1 - m01) * (held.progress - 0.5)) / 0.5;
    await drag(page, 'primary', 0, glide(c0, x), { up: null });
    const [dragged, draggedLine] = [await pill(page, 'primary', 1), await line(page, 'primary', 1)];
    expect([dragged.x, dragged.y, dragged.width, dragged.height, dragged.radius]).toEqual([slid.x, slid.y, slid.width, slid.height, slid.radius].map((v) => expect.closeTo(v, 1)));
    expect([draggedLine.x, draggedLine.width]).toEqual([expect.closeTo(slidLine.x, 1), expect.closeTo(slidLine.width, 1)]);
    const numbers = (clip: string) => (clip.match(/-?[\d.]+/g) ?? []).map(Number);
    numbers(await css(cover(page, 'primary', 1), 'clip-path')).forEach((v, i) => expect(v).toBeCloseTo(numbers(slidClip)[i], 1));
    await pointer(page, 'primary', 'pointercancel');
  });

  test('TAB-28: taken with the pointer away from where the indicator rests, the drag brings it to the pointer over the state motion, following the pointer meanwhile, and then follows it frame by frame', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-fill'), reducedMotion: false });
    const id = 'primary-fill';
    await override(page, { [T('motion-state-duration')]: '60s' });
    const [duration, easing] = [await resolveToken(page, T('motion-state-duration'), 'duration'), await easingToken(page, T('motion-state-easing'))];
    const seats = await Promise.all([0, 1, 2].map((n) => seat(page, id, n)));
    const c2 = await centreX(page, id, 2);
    // A press on Settings while Overview is selected, dragged 12 to the side (toward the end: still on Settings).
    await drag(page, id, 2, [{ x: c2 + 6 }, { x: c2 + 12 }], { up: null });
    expect(await dragging(page, id)).toBe(true);
    const hold = (at: number) =>
      row(page, id)
        .locator('.tabs')
        .evaluate(async (el, f) => {
          const a = el.getAnimations().find((each) => each.id === 'tanrei-tabs-catch-up')!;
          const timing = a.effect!.getTiming();
          a.pause();
          a.currentTime = (timing.duration as number) * f;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return { duration: timing.duration, easing: timing.easing, progress: a.effect!.getComputedTiming().progress! };
        }, at);
    for (const at of [0, 0.3, 0.6]) {
      const held = await hold(at);
      expect([held.duration, held.easing]).toEqual([duration, easing]);
      expect((await pill(page, id, 0)).x, `${at}`).toBeCloseTo(seats[0].x + (seats[2].x - seats[0].x) * held.progress, 0);
    }
    // Following the pointer meanwhile: the pointer moves to Activity, and the catch-up now ends there.
    await pointer(page, id, 'pointermove', await centreX(page, id, 1), 16);
    const meanwhile = await hold(0.6);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[0].x + (seats[1].x - seats[0].x) * meanwhile.progress, 0);
    await finishCatchUp(page, id);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    // Then in the frame the pointer moves, without a motion of its own.
    await pointer(page, id, 'pointermove', c2, 16);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[2].x, 0);
    expect(await row(page, id).locator('.tabs').evaluate((el) => el.getAnimations().length)).toBe(0);
    await pointer(page, id, 'pointercancel');
  });

  test('TAB-28: while the tabs scroll inside the track only a drag from the selected tab carries the indicator — every other sideways drag is left to scroll them — and the tabs scroll to keep it in view; a wheel only scrolls', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-scrollable', 'primary'), reducedMotion: true });
    const id = 'primary-scrollable';
    const scroller = track(page, id);
    await expect(scroller).toHaveClass(/scrolls/);
    // The browser keeps sideways panning on the tabs, except on the selected one; a row that fits keeps it all.
    expect(await css(scroller, 'touch-action')).toBe('auto');
    expect(await css(box(page, id, 0), 'touch-action')).toBe('pan-y pinch-zoom');
    expect(await css(box(page, id, 1), 'touch-action')).toBe('auto');
    await expect(track(page, 'primary')).not.toHaveClass(/scrolls/);
    // A drag that starts on Deployments is not the indicator's.
    const rest = await pill(page, id, 0);
    await drag(page, id, 1, glide(await centreX(page, id, 1), await centreX(page, id, 2)), { up: null });
    expect(await dragging(page, id)).toBe(false);
    expect((await pill(page, id, 0)).x).toBeCloseTo(rest.x, 1);
    await pointer(page, id, 'pointerup', await centreX(page, id, 2));
    expect(await row(page, id).evaluate((el: any) => el.value)).toBe('overview');
    // One that starts on Overview carries it — and, held near the track's end, the tabs scroll to keep it in view.
    const view = await bounds(scroller);
    await drag(page, id, 0, glide(await centreX(page, id, 0), view.x + view.width - 6), { up: null });
    expect(await dragging(page, id)).toBe(true);
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(20);
    await expect
      .poll(async () => {
        const p = await pill(page, id, 0);
        return p.x + p.width <= view.x + view.width + 1;
      })
      .toBe(true);
    expect(await row(page, id).evaluate((el: any) => el.value)).toBe('overview');
    await pointer(page, id, 'pointercancel');
    // A wheel or a trackpad only scrolls.
    await scroller.evaluate((el) => (el.scrollLeft = 0));
    await page.mouse.move(view.x + 100, view.y + view.height / 2);
    await page.mouse.wheel(80, 0);
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await dragging(page, id)).toBe(false);
    expect(await row(page, id).evaluate((el: any) => el.value)).toBe('overview');
  });

  test('TAB-24: a frame of a drag held between two tabs draws a label partly in each color — the covered copy’s clip moves with the indicator, a clip and not a blend', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-fill'), reducedMotion: true });
    const id = 'primary-fill';
    await drag(page, id, 0, glide(await centreX(page, id, 0), await meetX(page, id, 0, 1)), { up: null });
    const [mark, l] = [await pill(page, id, 1), await bounds(label(page, id, 1))];
    // Activity's covered copy is clipped to the indicator, which ends inside its label; the plain label has that shape cut out.
    expect(await css(cover(page, id, 1), 'visibility')).toBe('visible');
    expect(mark.x + mark.width).toBeGreaterThan(l.x);
    expect(mark.x + mark.width).toBeLessThan(l.x + l.width);
    expect(await css(content(page, id, 1), 'clip-path')).toMatch(/^path\(evenodd/);
    expect(await css(cover(page, id, 1).locator('.label'), 'color')).toBe(await resolveColor(page, T('primary-covered-label-color')));
    expect(await css(label(page, id, 1), 'color')).toBe(await resolveColor(page, T('primary-label-color')));
    expect(await css(cover(page, id, 1), 'mix-blend-mode')).toBe('normal');
    // Overview's piece is the same indicator, in the same frame.
    const first = await pill(page, id, 0);
    expect([first.x, first.width]).toEqual([expect.closeTo(mark.x, 1), expect.closeTo(mark.width, 1)]);
    await pointer(page, id, 'pointercancel');
  });

  test('TAB-26: while indicatorOffset is not 0 the tabs take no drag of their own, and an offset set during a drag ends it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-fill'), reducedMotion: true });
    const id = 'primary-fill';
    await wire(page);
    const [c0, c1] = [await centreX(page, id, 0), await centreX(page, id, 1)];
    await row(page, id).evaluate((el: any) => (el.indicatorOffset = 0.5));
    const placed = await pill(page, id, 0);
    await drag(page, id, 0, glide(c0, c1 + 60), { up: null });
    expect(await dragging(page, id)).toBe(false);
    expect((await pill(page, id, 0)).x).toBeCloseTo(placed.x, 1);
    await pointer(page, id, 'pointerup', c1 + 60);
    expect(await log(page)).toEqual([]);
    // The swipe that sets the offset has the indicator: a drag in progress gives way, and its release selects nothing.
    await row(page, id).evaluate((el: any) => (el.indicatorOffset = 0));
    await drag(page, id, 0, glide(c0, c1), { up: null });
    expect(await dragging(page, id)).toBe(true);
    await row(page, id).evaluate((el: any) => (el.indicatorOffset = 0.5));
    expect(await dragging(page, id)).toBe(false);
    expect((await pill(page, id, 0)).x).toBeCloseTo(placed.x, 1);
    await pointer(page, id, 'pointerup', c1);
    expect(await log(page)).toEqual([]);
    expect(await row(page, id).evaluate((el: any) => el.value)).toBe('overview');
  });

  test('TAB-29: a release chooses the nearer of the two tabs the indicator lies between, or the one a fling is toward — selected is set and change emitted once, the indicator settling from where it was left over the indicator’s motion — or returns it and emits nothing; a disabled tab is never chosen; the chosen tab is the Tab stop; the release is not a tap', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-fill', 'primary-disabled', 'primary'), reducedMotion: false });
    await override(page, { [T('motion-state-duration')]: '0s', [T('motion-indicator-duration')]: '60s' });
    await wire(page);
    const id = 'primary-fill';
    const seats = await Promise.all([0, 1, 2].map((n) => seat(page, id, n)));
    const [c0, c1, c2, m01, m12] = [await centreX(page, id, 0), await centreX(page, id, 1), await centreX(page, id, 2), await meetX(page, id, 0, 1), await meetX(page, id, 1, 2)];
    const [duration, easing] = [await resolveToken(page, T('motion-indicator-duration'), 'duration'), await easingToken(page, T('motion-indicator-easing'))];
    // Released past the place where Overview meets Activity: Activity, one change, the value set first.
    await drag(page, id, 0, glide(c0, m01 + 6), { up: null });
    const left = await pill(page, id, 0);
    await pointer(page, id, 'pointerup', m01 + 6);
    expect(await log(page)).toEqual(['activity:activity']);
    expect(await dragging(page, id)).toBe(false);
    // The indicator settles from where the release left it, over the indicator's motion.
    const start = await holdSlide(page, id, 0);
    expect([start.duration, start.easing]).toEqual([duration, easing]);
    expect((await pill(page, id, 0)).x).toBeCloseTo(left.x, 0);
    const mid = await holdSlide(page, id, 0.3);
    expect((await pill(page, id, 0)).x).toBeCloseTo(left.x + (seats[1].x - left.x) * mid.progress, 0);
    await finishSlide(page, id);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    // Activity is the selected tab and the Tab stop.
    expect(await state(page, id)).toMatchObject({ value: 'activity', selected: ['false', 'true', 'false'], stops: ['-1', '0', '-1'] });
    // Released short of the place where Activity meets Settings: the indicator returns over the same motion; nothing is emitted.
    await drag(page, id, 1, glide(c1, m12 - 6), { up: null });
    const short = await pill(page, id, 0);
    expect(short.x).toBeGreaterThan(seats[1].x + 4);
    await pointer(page, id, 'pointerup', m12 - 6);
    const back = await holdSlide(page, id, 0);
    expect([back.duration, back.easing]).toEqual([duration, easing]);
    expect((await pill(page, id, 0)).x).toBeCloseTo(short.x, 0);
    await finishSlide(page, id);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    expect(await log(page)).toEqual(['activity:activity']);
    // A fling toward Settings released short of that place selects Settings…
    await drag(page, id, 1, [
      { x: c1 + 10, dt: 4 },
      { x: c1 + 20, dt: 4 },
      { x: c1 + 30, dt: 4 },
    ], { up: 0 });
    expect(c1 + 30).toBeLessThan(m12);
    expect(await log(page)).toEqual(['activity:activity', 'settings:settings']);
    await finishSlide(page, id);
    // …and a fling back toward Settings, released past that place on Activity's side, leaves Settings selected.
    await drag(page, id, 2, [...glide(c2, m12 - 30), { x: m12 - 30, dt: 400 }, { x: m12 - 20, dt: 4 }, { x: m12 - 10, dt: 4 }], { up: 0 });
    expect(await log(page)).toEqual(['activity:activity', 'settings:settings']);
    expect(await slides(page, id)).toBe(1);
    await finishSlide(page, id);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[2].x, 0);
    // A slow release at exactly one half is the tab after it.
    await drag(page, id, 2, glide(c2, m12), { up: null });
    await pointer(page, id, 'pointermove', m12 - 1, 16);
    await pointer(page, id, 'pointerup', m12 - 1);
    expect(await log(page)).toEqual(['activity:activity', 'settings:settings', 'activity:activity']);
    await finishSlide(page, id);

    // A drag across a disabled tab never selects it: the indicator never rests on Billing, and a release beyond it is Activity.
    const d = 'primary-disabled';
    const billing = await bounds(tabAt(page, d, 2));
    await drag(page, d, 0, glide(await centreX(page, d, 0), billing.x + billing.width / 2), { up: null });
    const on = await pill(page, d, 0);
    expect(on.x).toBeCloseTo((await seat(page, d, 1)).x, 0);
    await pointer(page, d, 'pointerup', billing.x + billing.width / 2);
    expect(await row(page, d).evaluate((el: any) => el.value)).toBe('activity');
    expect(await tabAt(page, d, 2).getAttribute('aria-selected')).toBe('false');

    // The release is not also a tap: with a real mouse, pressed on Overview and released on Settings, a listener hears one
    // change — and a click right after it is a tap again.
    const m = 'primary';
    const [from, to] = [await bounds(tabAt(page, m, 0)), await bounds(tabAt(page, m, 2))];
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.waitForTimeout(150); // at rest: no fling
    await page.mouse.up();
    expect(await log(page)).toEqual(['settings:settings']);
    await expect(tabAt(page, m, 2)).toHaveAttribute('tabindex', '0');
    // The focus the press gave Overview follows the selection.
    await expect(tabAt(page, m, 2)).toBeFocused();
    await tabAt(page, m, 1).click();
    expect(await log(page)).toEqual(['settings:settings', 'activity:activity']);
  });

  test('TAB-30: Escape, a cancelled pointer, a lost capture, selected set by the product, or a tab under the indicator removed or disabled cancel the drag — the indicator returns over the indicator’s motion and nothing is emitted; while it lasts nothing is selected, shown, focused or exposed; where motion is reduced it follows the pointer and lands at once', async ({ page }) => {
    const mount = async (reducedMotion = false) => {
      await mountFixtures(page, spec, { fixtures: [fixture('r', THREE, { selected: 'overview', fullWidth: true }, panels(['overview', 'activity', 'settings']))], reducedMotion });
      await override(page, { [T('motion-state-duration')]: '0s', [T('motion-indicator-duration')]: '60s' });
      await wire(page);
    };
    const id = 'r';
    await mount();
    const seats = await Promise.all([0, 1, 2].map((n) => seat(page, id, n)));
    const [c0, m01, c1] = [await centreX(page, id, 0), await meetX(page, id, 0, 1), await centreX(page, id, 1)];
    const held = async () => {
      await drag(page, id, 0, glide(c0, m01 + 20), { up: null });
      expect(await dragging(page, id)).toBe(true);
      expect((await pill(page, id, 0)).x).toBeGreaterThan(seats[0].x + 10);
    };
    /** The indicator returns to tab `n` over the indicator's motion, from where the drag left it. */
    const returns = async (n: number, what: string) => {
      expect(await dragging(page, id), what).toBe(false);
      const from = await holdSlide(page, id, 0);
      expect(from.duration, what).toBe(await resolveToken(page, T('motion-indicator-duration'), 'duration'));
      await finishSlide(page, id);
      const p = await pill(page, id, 0);
      expect([p.x, p.width], what).toEqual([expect.closeTo((await seat(page, id, n)).x, 0), expect.closeTo((await seat(page, id, n)).width, 0)]);
    };
    // While it lasts: what assistive technology is told, the panel shown and the focus are what they were before the press.
    await tabAt(page, id, 0).focus();
    const before = await state(page, id);
    const tree = await row(page, id).ariaSnapshot();
    await held();
    expect(await state(page, id)).toEqual(before);
    expect(await row(page, id).ariaSnapshot()).toBe(tree);
    await expect(panel(page, id, 'overview')).toBeVisible();
    await expect(panel(page, id, 'activity')).toBeHidden();
    // Escape: returns, emits nothing — and the release that follows selects nothing.
    await page.keyboard.press('Escape');
    await returns(0, 'Escape');
    await pointer(page, id, 'pointerup', m01 + 20);
    expect(await log(page)).toEqual([]);
    expect(await state(page, id)).toEqual(before);
    // The platform cancels the pointer.
    await held();
    await pointer(page, id, 'pointercancel');
    await returns(0, 'pointercancel');
    // The capture is lost.
    await held();
    await pointer(page, id, 'lostpointercapture');
    await returns(0, 'lostpointercapture');
    await pointer(page, id, 'pointerup', m01 + 20);
    // The product sets selected: the indicator goes to the tab it has just set.
    await held();
    await row(page, id).evaluate((el: any) => (el.value = 'settings'));
    await returns(2, 'value set');
    await pointer(page, id, 'pointerup', m01 + 20);
    expect(await row(page, id).evaluate((el: any) => el.value)).toBe('settings');
    await row(page, id).evaluate((el: any) => (el.value = 'overview'));
    await finishSlide(page, id);
    // A tab the indicator lies between is disabled, or removed.
    await held();
    await tabAt(page, id, 1).evaluate((el: any) => (el.disabled = true));
    await returns(0, 'disabled');
    await pointer(page, id, 'pointerup', m01 + 20);
    await tabAt(page, id, 1).evaluate((el: any) => (el.disabled = false));
    await expect(tabAt(page, id, 1)).toHaveAttribute('tabindex', '-1');
    await held();
    await tabAt(page, id, 1).evaluate((el) => el.remove());
    await returns(0, 'removed');
    await pointer(page, id, 'pointerup', m01 + 20);
    expect(await log(page)).toEqual([]);

    // Motion reduced: the indicator is where the pointer is at once (no catch-up), and on its tab in the frame after the
    // release or the cancel.
    await mount(true);
    await override(page, { [T('motion-state-duration')]: '60s' });
    await drag(page, id, 2, [{ x: (await centreX(page, id, 2)) - 6 }, { x: c1 }], { up: null });
    expect(await row(page, id).locator('.tabs').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    await pointer(page, id, 'pointermove', m01 + 30, 16);
    await pointer(page, id, 'pointerup', m01 + 30);
    await frames(page, 1);
    expect(await slides(page, id)).toBe(0);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    expect(await log(page)).toEqual(['activity:activity']);
    await drag(page, id, 1, glide(c1, m01 - 20), { up: null });
    await page.keyboard.press('Escape');
    await frames(page, 1);
    expect(await slides(page, id)).toBe(0);
    expect((await pill(page, id, 0)).x).toBeCloseTo(seats[1].x, 0);
    await pointer(page, id, 'pointerup', m01 - 20);
    expect(await log(page)).toEqual(['activity:activity']);
  });
});

test.describe('states, press, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  // These tests read the spec's first 22 fixtures, up to `tonal`; the rest are drawn by the tests of their own block,
  // so that a page here stays small — some of these tests draw it several times.
  const EARLIER = spec.fixtures.slice(0, spec.fixtures.findIndex((f) => f.id === 'tonal'));
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: EARLIER });
  });

  test('TAB-3: each state renders the tab from that state’s tokens of its look and variant; pointer focus is not the focused state (default system)', async ({ page }) => {
    for (const [id, n, variant, look] of [
      ['primary', 1, 'primary', ''],
      ['primary', 0, 'primary', 'selected'],
      ['secondary', 0, 'secondary', 'selected'],
    ] as const) {
      await mountFixtures(page, spec, { fixtures: EARLIER });
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id, n), `${id}/${n}`).toEqual(await expected(page, variant, look));
      await box(page, id, n).hover();
      await expect.poll(() => drawn(page, id, n), `${id}/${n} hovered`).toEqual(await expected(page, variant, look, 'hovered'));
      await page.mouse.down();
      await expect.poll(() => drawn(page, id, n), `${id}/${n} pressed`).toEqual(await expected(page, variant, look, 'pressed'));
      // The release selects the tab (a click); the pointer focused it, which is not the focused state. (Released over the
      // tab: after a second setContent, Chromium under Playwright sends no pointerleave to a drag off a pressed element —
      // a known Chromium behaviour.)
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect(tabAt(page, id, n)).toBeFocused();
      await expect.poll(() => drawn(page, id, n), `${id}/${n} pointer focus`).toEqual(await expected(page, variant, 'selected'));
      // Keyboard focus: Tab to the row's stop (its selected first tab), and from there to the tab by script.
      await mountFixtures(page, spec, { fixtures: EARLIER });
      await tabTo(page, tabAt(page, id, 0));
      if (n !== 0) await tabAt(page, id, n).evaluate((el) => (el as HTMLElement).focus());
      await expect.poll(() => drawn(page, id, n), `${id}/${n} focused`).toEqual(await expected(page, variant, look, 'focused'));
    }
  });

  test('TAB-3: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: EARLIER, system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(layer(page, 'primary', 0), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`primary-${s}selected-container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await box(page, 'primary', 0).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, tabAt(page, 'primary', 0)); // hovered AND keyboard-focused: focused wins
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('TAB-4: keyboard focus shows the ring around the tab’s container, concentric and in its shape — a capsule or a circle — sys.focus.offset outside it, held inside the track, above the neighbours and the indicator, without animation; pointer focus does not', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: EARLIER, icons: true });
    const [outer, inner, offset, inset] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-inner-width', '--tanrei-sys-focus-offset', T('track-padding')].map((n) => resolveToken(page, n)));
    // The default system: the ring reaches offset + widths beyond the container, which is track.padding — so it is drawn
    // around the container, and meets the track's edge without crossing it.
    expect(offset + inner + outer).toBe(inset);
    await box(page, 'primary', 1).click();
    await expect(ring(page, 'primary', 1)).toHaveCSS('outline-style', 'none');
    await tabTo(page, tabAt(page, 'primary', 1));
    for (const [id, form] of [
      ['primary', 'capsule'],
      ['primary-icon-only', 'circle'],
      ['primary-single-characters', 'circle'],
    ] as const) {
      const n = id === 'primary-single-characters' ? 1 : id === 'primary' ? 1 : 0;
      await tabTo(page, tabAt(page, id, n));
      const r = ring(page, id, n);
      await expect(r).toHaveCSS('outline-style', 'solid');
      await expect(r).toHaveCSS('outline-width', `${outer}px`);
      await expect(r).toHaveCSS('outline-offset', `${offset + inner}px`);
      await expect(r).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      // The same box as the container — where the indicator is on this tab — and its shape: never a rectangle.
      const [rb, c, tr] = [await bounds(r), await seat(page, id, n), await bounds(track(page, id))];
      expect([rb.x, rb.y, rb.width, rb.height], id).toEqual([expect.closeTo(c.x, 1), expect.closeTo(c.y, 1), expect.closeTo(c.width, 1), expect.closeTo(c.height, 1)]);
      expect(Number.parseFloat(await css(r, 'border-top-left-radius')), id).toBeGreaterThanOrEqual(rb.height / 2);
      if (form === 'circle') expect(rb.width, id).toBeCloseTo(rb.height, 1);
      else expect(rb.width, id).toBeGreaterThan(rb.height);
      // Its outer edge is inside the track, and meets it above and below.
      const reach = offset + inner + outer;
      expect(rb.y - reach, id).toBeCloseTo(tr.y, 1);
      expect(rb.y + rb.height + reach, id).toBeCloseTo(tr.y + tr.height, 1);
      expect(rb.x - reach, id).toBeGreaterThanOrEqual(tr.x - 0.5);
      expect(await css(track(page, id), 'overflow-y'), id).toBe('hidden');
      // Above the neighbouring tabs and the indicator; never animated; never on the host.
      await expect(tabAt(page, id, n)).toHaveCSS('z-index', '1');
      expect(await tabAt(page, id, n).evaluate((el) => !!(el.shadowRoot!.querySelector('.cover')!.compareDocumentPosition(el.shadowRoot!.querySelector('.ring')!) & Node.DOCUMENT_POSITION_FOLLOWING)), id).toBe(true);
      expect(await css(r, 'transition-property')).not.toContain('outline');
      await expect(tabAt(page, id, n)).toHaveCSS('outline-style', 'none');
    }
    // The first tab's ring meets the track's start edge too.
    await tabTo(page, tabAt(page, 'primary-second-selected', 1));
    await page.keyboard.press('ArrowLeft');
    const [firstRing, firstTrack] = [await bounds(ring(page, 'primary-second-selected', 0)), await bounds(track(page, 'primary-second-selected'))];
    expect(firstRing.x - (offset + inner + outer)).toBeCloseTo(firstTrack.x, 1);
    // Less room than the ring reaches: it is drawn further in by the difference, on every side alike.
    await override(page, { [T('track-padding')]: '1px' });
    await expect(ring(page, 'primary-second-selected', 0)).toHaveCSS('outline-offset', `${offset + inner - (offset + inner + outer - 1)}px`);
    // m3-like: no room at all (track.padding is nothing), so the ring is wholly inside the container, square.
    await mountFixtures(page, spec, { fixtures: EARLIER, system: 'm3-like' });
    const m3outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await tabTo(page, tabAt(page, 'primary', 0));
    const m = ring(page, 'primary', 0);
    await expect(m).toHaveCSS('outline-style', 'solid');
    await expect(m).toHaveCSS('outline-offset', `${-m3outer}px`);
    expect(await css(m, 'top', '::after')).toBe(`${m3outer}px`);
    expect(await css(m, 'border-top-left-radius')).toBe('0px');
    const [mb, mt] = [await bounds(m), await bounds(tabAt(page, 'primary', 0))];
    expect([mb.x, mb.y, mb.width, mb.height]).toEqual([expect.closeTo(mt.x, 1), expect.closeTo(mt.y, 1), expect.closeTo(mt.width, 1), expect.closeTo(mt.height, 1)]);
  });

  test('TAB-5: a tab is at least the minimum target wide in layout — pointer, and touch for a coarse pointer — and a row lower than the target is not made taller', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('many', 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => t(c, ''))), ...spec.fixtures.filter((f) => ['primary-single-characters', 'primary-small-single-characters'].includes(f.id))] });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const id of ['primary-single-characters', 'primary-small-single-characters']) {
      const count = await tabs(page, id).count();
      const inset = await resolveToken(page, T('track-padding'));
      for (let n = 0; n < count; n++) {
        // TAB-34: a circle's tab at an end of the row ends at the track's edge — narrower in layout by what would lie
        // beyond it, which its hit area still reaches (the small row's test presses there).
        const circle = (await seat(page, id, n)).width;
        const beyond = n === 0 || n === count - 1 ? Math.max(0, (pointer - circle) / 2 - inset) : 0;
        expect((await bounds(tabAt(page, id, n))).width, `${id} ${n}`).toBeGreaterThanOrEqual(pointer - beyond - 0.01);
      }
      expect((await bounds(tabAt(page, id, 1))).width, id).toBeGreaterThanOrEqual(pointer - 0.01);
    }
    await override(page, { [T('container-height-medium')]: '10px', [T('container-padding-inline-medium')]: '0px' });
    const b = await bounds(tabAt(page, 'many', 1));
    expect(b.width).toBeCloseTo(pointer, 1);
    // The height is the content's and the insets': below the target, and no longer raised to it in layout.
    expect(b.height).toBeLessThan(pointer - 1);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(async () => (await bounds(tabAt(page, 'many', 1))).width).toBeCloseTo(touch, 1);
    expect((await bounds(tabAt(page, 'many', 1))).height).toBeCloseTo(b.height, 1);
  });

  test('TAB-6: a disabled tab renders from the disabled tokens of its variant and, when selected, of its selected parts', async ({ page }) => {
    await expect.poll(() => drawn(page, 'primary-disabled', 2)).toEqual(await expected(page, 'primary', '', 'disabled'));
    await expect.poll(() => drawn(page, 'secondary-disabled', 2)).toEqual(await expected(page, 'secondary', '', 'disabled'));
    await expect.poll(() => drawn(page, 'primary-selected-disabled', 2)).toEqual(await expected(page, 'primary', 'selected', 'disabled'));
    // A disabled tab that is not selected has no indicator over it; a selected one keeps a faded one (a fill, not content:
    // the disabled container opacity), and so does its piece on every tab it may pass over.
    const c = await bounds(content(page, 'primary-disabled', 2));
    const p = await pill(page, 'primary-disabled', 2);
    expect(p.x + p.width <= c.x + 0.5 || p.x >= c.x + c.width - 0.5).toBe(true);
    const faded = await resolveColor(page, T('primary-disabled-selected-active-indicator-color'));
    expect(faded).not.toBe('rgba(0, 0, 0, 0)');
    expect(faded).not.toBe(await resolveColor(page, T('primary-disabled-selected-covered-label-color')));
    for (const n of [0, 1, 2]) expect(await css(cover(page, 'primary-selected-disabled', n), 'background-color'), `${n}`).toBe(faded);
    expect(within(await bounds(label(page, 'primary-selected-disabled', 2)), await pill(page, 'primary-selected-disabled', 2))).toBe(true);
  });

  test('TAB-7: a variant the system does not have renders with the default’s tokens, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('odd', THREE, { variant: 'sparkle', selected: 'overview' })] });
    await expect.poll(() => drawn(page, 'odd', 0)).toEqual(await expected(page, 'primary', 'selected'));
    expect((await line(page, 'odd', 0)).height).toBeCloseTo(await resolveToken(page, T('primary-underline-thickness')), 1);
    expect((await pill(page, 'odd', 0)).width).toBeCloseTo((await bounds(label(page, 'odd', 0))).width + 2 * (await resolveToken(page, T('active-indicator-padding-inline-medium'))), 0);
    await expect.poll(() => seen.filter((w) => w.includes('TAB-7')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/variant "sparkle" is not a value of the active design system; it is drawn as "primary" \(TAB-7\)/);
  });

  test('TAB-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    expect(await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration')).toBe(100);
    const hold = 1000;
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => box(page, 'primary', 1).click()],
    ] as const) {
      await mountFixtures(page, spec, { fixtures: EARLIER });
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await tabAt(page, 'primary', 1).focus();
      await box(page, 'primary', 1).evaluate((el) => {
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

  test('TAB-9: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, { fixtures: EARLIER, ...(system ? { system } : {}) });
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('primary-pressed-label-color')]: 'rgb(0, 0, 255)', [T('primary-pressed-covered-label-color')]: 'rgb(0, 128, 0)' });
      const b = box(page, 'primary', 1);
      await b.hover();
      const state = layer(page, 'primary', 1);
      await expect.poll(() => css(state, 'background-color')).toBe(await resolveColor(page, T('primary-hovered-container-color')));
      const hovered = await css(state, 'background-color');
      await page.mouse.down();
      const result = {
        pressed: await b.getAttribute('data-pressed'),
        bg: await css(state, 'background-color'),
        rectangle: await css(b, 'background-color'),
        hovered,
        label: await css(b.locator(':scope > .content > .label'), 'color'),
        covered: await css(b.locator('.cover .label'), 'color'),
        ripple: await b.locator('.ripple').count(),
        opacity: await css(b, 'opacity'),
      };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)', covered: 'rgb(0, 128, 0)' });
    // Every answer is drawn in the container (the indicator's box): the tab's rectangle draws none.
    expect(overlay.rectangle).toBe('rgba(0, 0, 0, 0)');
    expect(overlay.bg).toBe(await resolveColor(page, T('primary-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, label: 'rgb(0, 0, 255)', covered: 'rgb(0, 128, 0)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, label: 'rgb(0, 0, 255)', covered: 'rgb(0, 128, 0)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // The ripple grows over the feedback duration and fades over the state duration; from the center for a key.
    await mountFixtures(page, spec, { fixtures: EARLIER, system: 'm3-like' });
    await tabAt(page, 'primary', 1).focus();
    await page.keyboard.down('Enter');
    const grown = await box(page, 'primary', 1)
      .locator('.ripple')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(grown.x).toBeCloseTo(0.5, 5);
    expect(grown.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(grown.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    // The ripple is the container's: wherever on the tab the press lands — its corner, outside the container — the layer
    // is the container's box, clipped to its shape, growing from the nearest point of it.
    await mountFixtures(page, spec, { fixtures: EARLIER, icons: true });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    const whole = await bounds(tabAt(page, 'primary-icon-only', 1));
    await page.mouse.move(whole.x + 1, whole.y + 1);
    await page.mouse.down();
    const drawnIn = await tabAt(page, 'primary-icon-only', 1).evaluate((el) => {
      const ripple = el.shadowRoot!.querySelector<HTMLElement>('.ripple')!;
      const [r, c] = [ripple.getBoundingClientRect(), el.shadowRoot!.querySelector('.box')!.getBoundingClientRect()];
      return { parent: ripple.parentElement!.className, same: Math.abs(r.x - c.x) + Math.abs(r.y - c.y) + Math.abs(r.width - c.width) + Math.abs(r.height - c.height) < 0.5, x: ripple.style.getPropertyValue('--_x'), radius: Number.parseFloat(getComputedStyle(ripple).borderTopLeftRadius), height: r.height };
    });
    await page.mouse.up();
    expect(drawnIn).toMatchObject({ parent: 'box', same: true, x: '0px' });
    expect(drawnIn.radius).toBeGreaterThanOrEqual(drawnIn.height / 2);
  });

  test('TAB-10 corner smoothing and focus-style: cupertino eases a rounded container’s and track’s corners, the ring concentric; acme shows focus as a glow around the container, held inside the track', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: EARLIER, system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    // The default containers and track are fully rounded, which no amount changes: give them a corner below full.
    await override(page, { [T('container-shape')]: '12px', [`${T('container-shape')}-pill`]: '0', [T('track-shape')]: '12px', [`${T('track-shape')}-pill`]: '0' });
    const b = layer(page, 'primary', 1);
    const r = ring(page, 'primary', 1);
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      for (const each of [b, track(page, 'primary')]) {
        expect(Number.parseFloat((await css(each, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
        await expect.poll(async () => Number.parseFloat(await css(each, 'border-top-left-radius'))).toBeCloseTo(12 * 1.24, 2);
      }
      await tabTo(page, tabAt(page, 'primary', 0));
      await page.keyboard.press('ArrowRight');
      expect(await css(r, 'corner-top-left-shape', '::after')).toBe(await css(b, 'corner-top-left-shape'));
    } else expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBe(12);

    await mountFixtures(page, spec, { fixtures: EARLIER, system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const [outer, offset, inset] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', T('track-padding')].map((n) => resolveToken(page, n)));
    await tabTo(page, tabAt(page, 'primary', 0));
    await page.keyboard.press('ArrowRight');
    expect(await css(r, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(r, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    // The halo starts after the offset and reaches twice each width: what the track's padding does not hold of that, it
    // is drawn further in.
    expect(Number.parseFloat(await css(r, 'top', '::after'))).toBeCloseTo(Math.max(0, offset + (1 + outer) * 2 - inset) - offset, 2);
    await expect(tabAt(page, 'primary', 1)).toHaveAttribute('data-focus-style', 'glow');
  });

  test('TAB-23: colors change over the state motion — between states and between selected and not — and at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const b = box(page, 'primary', 0);
    const state = layer(page, 'primary', 0);
    expect(await css(state, 'transition-property')).toContain('background-color');
    expect(await css(b, 'transition-property')).toContain('opacity');
    for (const each of [state, b]) expect((await css(each, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000)).toContain(duration);
    for (const part of [':scope > .content > .label', '.cover', '.cover .label', '.underline']) expect(Number.parseFloat(await css(b.locator(part), 'transition-duration')) * 1000, part).toBe(duration);
    // Selecting another tab recolors its label over the same motion (the default system gives both looks one color on the
    // track, so the selected look gets another here).
    // The label's own transition is held half way through its time in the task that sets the value, and read there: read
    // an answer and 100 ms after the change, a runner that takes 700 ms over the two read a label that had arrived.
    await override(page, { [T('motion-state-duration')]: '800ms', [T('primary-selected-label-color')]: 'rgb(255, 0, 0)' });
    const plain = await css(label(page, 'primary', 1), 'color');
    const recolored = await row(page, 'primary').evaluate(async (el: any) => {
      el.value = 'activity';
      await el.updateComplete;
      const tab = el.querySelectorAll('tanrei-tab')[1];
      await tab.updateComplete;
      const text = tab.shadowRoot.querySelector('.tab > .content > .label');
      void getComputedStyle(text).color;
      const moving = text.getAnimations().filter((animation: CSSTransition) => animation.transitionProperty === 'color');
      for (const animation of moving) {
        animation.pause();
        animation.currentTime = 400;
      }
      const mid = getComputedStyle(text).color;
      for (const animation of moving) animation.play();
      // Whole milliseconds: Firefox reports a duration of 800 ms as a float of seconds.
      return { durations: moving.map((animation: CSSTransition) => Math.round(Number(animation.effect!.getTiming().duration))), mid };
    });
    expect(recolored.durations).toEqual([800]);
    expect([plain, await resolveColor(page, T('primary-selected-label-color'))]).not.toContain(recolored.mid);
    await expect.poll(() => css(label(page, 'primary', 1), 'color')).toBe(await resolveColor(page, T('primary-selected-label-color')));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(b, 'transition-duration')).toBe('0s');
    for (const part of [':scope > .box', ':scope > .content > .label', '.cover', '.underline']) expect(await css(b.locator(part), 'transition-duration'), part).toBe('0s');
  });
});

// The row is measured when it is first drawn — which is often while what holds it is not at rest: a dialog or a popover
// growing in from a scale, a surface not displayed yet, a face not loaded yet. Nothing here touches the row: what is
// asserted is what the first paint shows.
test.describe('the indicator at the first paint', () => {
  /** The fixtures whose thumb is each shape: a capsule (plain, icon before the label, icon above it), a circle, a share. */
  const SHAPES: Record<string, 'circle' | 'capsule' | 'fill'> = {
    primary: 'capsule',
    secondary: 'capsule',
    'secondary-icons': 'capsule',
    'primary-icons': 'capsule',
    'primary-second-selected': 'capsule',
    'secondary-fill': 'fill',
    'secondary-icons-fill': 'fill',
    'primary-icon-only-fill': 'fill',
    'primary-icon-only': 'circle',
    'primary-single-characters': 'circle',
    'primary-two-icons-second-selected': 'circle',
    'secondary-two-icons': 'circle',
  };
  const fixtures = spec.fixtures.filter((f) => f.id in SHAPES);
  const everyThumb = async (page: P, hint: string) => {
    for (const [id, shape] of Object.entries(SHAPES)) await expectOneThumb(row(page, id), shape, `${hint}, ${id}`);
  };
  /**
   * Draws every row anew — new elements, measured for the first time — inside a holder with `style`, as a surface that
   * opens draws what it holds; the row keeps the stage's width.
   */
  const drawAnewIn = (page: P, style: string) =>
    page.evaluate(async (holder) => {
      for (const stage of document.querySelectorAll<HTMLElement>('.stage')) {
        const markup = stage.innerHTML;
        stage.innerHTML = `<div class="holder" style="${holder}">${markup}</div>`;
        stage.querySelector<HTMLElement>('tanrei-tabs')!.style.inlineSize = '360px';
      }
      await Promise.all([...document.querySelectorAll<any>('tanrei-tabs, tanrei-tab')].map((el) => el.updateComplete));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, style);
  const frames = (page: P) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const holders = (page: P, style: string) =>
    page.evaluate(async (css) => {
      for (const holder of document.querySelectorAll<HTMLElement>('.holder')) holder.style.cssText = css;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, style);

  test('TAB-16, TAB-24: a row first drawn while an ancestor scales it (a surface growing in from 0.9) draws one thumb, at the selected tab’s container, a capsule or a circle, with the covered copy’s clip and the plain content’s cut the same box — while it is scaled and after, untouched', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await everyThumb(page, 'at rest');
    for (const scale of ['scale(0.9)', 'scale(0.5)', 'scale(1.25, 0.8)']) {
      await drawAnewIn(page, `transform: ${scale}; transform-origin: 0 0;`);
      const scaled = await readThumb(row(page, 'secondary'));
      expect(scaled[0].scale, scale).not.toBeCloseTo(1, 2);
      await everyThumb(page, `under ${scale}`);
      // The transform ends, which nothing reports: what was drawn is still right, and nothing was drawn again for it.
      const before = await Promise.all(Object.keys(SHAPES).map((id) => readThumb(row(page, id))));
      await holders(page, '');
      await everyThumb(page, `after ${scale}`);
      const after = await Promise.all(Object.keys(SHAPES).map((id) => readThumb(row(page, id))));
      before.forEach((pieces, i) => pieces.forEach((piece, n) => {
        expect(after[i][n].scale).toBeCloseTo(1, 3);
        for (const k of ['x', 'y', 'w', 'h', 'r'] as const) if (piece.clip) expect(after[i][n].clip![k], `${Object.keys(SHAPES)[i]} ${n} ${k}`).toBeCloseTo(piece.clip[k], 1);
      }));
    }
  });

  test('TAB-16, TAB-24: a row first drawn in a surface that grows in over a running motion (an animated scale from 0.9, with a fade) draws one whole thumb at every frame read and at its end', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await page.addStyleTag({ content: '@keyframes grow-in { from { scale: 0.9; opacity: 0; } to { scale: 1; opacity: 1; } }' });
    await drawAnewIn(page, 'animation: grow-in 60s linear both;');
    const running = await page.evaluate(() => document.querySelector('.holder')!.getAnimations()[0]?.playState);
    expect(running).toBe('running');
    expect((await readThumb(row(page, 'secondary')))[0].scale).toBeLessThan(0.99);
    await everyThumb(page, 'growing in');
    // The surface's motion is the test's own, and long: a loaded machine may take longer between two reads than a short
    // one lasts, and would then read a surface that has already grown in. It is ended here, not waited for.
    await page.evaluate(() => {
      for (const a of document.getAnimations()) if ((a as CSSAnimation).animationName === 'grow-in') a.finish();
      return Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    await frames(page);
    await everyThumb(page, 'grown in');
  });

  test('TAB-16, TAB-24: a row first drawn in an element that is not displayed draws its one thumb when the element is shown, without a touch — in a closed dialog shown later too', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await drawAnewIn(page, 'display: none;');
    for (const id of Object.keys(SHAPES)) expect((await readThumb(row(page, id))).filter((piece) => piece.drawn), id).toHaveLength(0);
    await holders(page, '');
    await everyThumb(page, 'shown');
    // A modal dialog: closed while the row is created, then shown and growing in.
    await page.evaluate(async () => {
      const dialog = document.createElement('dialog');
      dialog.id = 'modal';
      dialog.style.cssText = 'inline-size: 420px; animation: grow-in 60s linear both;';
      const style = document.createElement('style');
      style.textContent = '@keyframes grow-in { from { scale: 0.9; } to { scale: 1; } }';
      document.head.append(style);
      document.body.append(dialog);
      for (const stage of document.querySelectorAll('.stage')) dialog.append(stage);
      for (const holder of document.querySelectorAll('.holder')) holder.replaceWith(...holder.childNodes);
      await new Promise((resolve) => setTimeout(resolve, 50));
      dialog.showModal();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect((await readThumb(row(page, 'secondary')))[0].scale).toBeLessThan(0.999);
    await everyThumb(page, 'in the dialog, growing in');
    // The surface's motion is the test's own, and long: a loaded machine may take longer between two reads than a short
    // one lasts, and would then read a surface that has already grown in. It is ended here, not waited for.
    await page.evaluate(() => {
      for (const a of document.getAnimations()) if ((a as CSSAnimation).animationName === 'grow-in') a.finish();
      return Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    await frames(page);
    await everyThumb(page, 'in the dialog, at rest');
  });

  test('TAB-16, TAB-24: a row first drawn flat — in a surface that grows from an edge, scaled to nothing — draws nothing wrong meanwhile and its one thumb as soon as it has a size, without a touch', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    for (const flat of ['scale(1, 0)', 'scale(0)']) {
      await drawAnewIn(page, `transform: ${flat}; transform-origin: 0 0;`);
      await holders(page, 'transform: scale(1, 0.5); transform-origin: 0 0;');
      await frames(page);
      await everyThumb(page, `growing from ${flat}`);
      await holders(page, '');
      await everyThumb(page, `grown from ${flat}`);
    }
  });

  test('TAB-16, TAB-14: a row first drawn before the icon face has loaded draws one thumb in its shape then — an icon-only tab’s a circle — and when the face arrives', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await withoutIconFont(page);
    await drawAnewIn(page, 'transform: scale(0.9); transform-origin: 0 0;');
    await everyThumb(page, 'without the face');
    await iconFaceArrives(page);
    await frames(page);
    await everyThumb(page, 'with the face, still scaled');
    await holders(page, '');
    await everyThumb(page, 'with the face');
  });

  test('TAB-16, TAB-24: a row whose container resizes after the first paint — a row that fills growing and shrinking, enlarged text, a longer label — keeps one thumb at the selected tab’s container, a capsule whatever its size', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await drawAnewIn(page, 'transform: scale(0.9); transform-origin: 0 0;');
    for (const width of ['520px', '240px', '360px']) {
      await page.evaluate(async (w) => {
        for (const each of document.querySelectorAll<HTMLElement>('tanrei-tabs')) each.style.inlineSize = w;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }, width);
      await everyThumb(page, `${width} wide`);
    }
    // Larger content: text twice as large, a label many times as long, and a tab made tall by the row (a capsule still,
    // never a rounded rectangle).
    await holders(page, '');
    await override(page, { [T('label-typescale-font')]: '600 28px/40px Inter', [T('container-height-medium')]: '96px', [T('container-height-with-icon')]: '132px' });
    await page.evaluate(async () => {
      for (const each of document.querySelectorAll<any>('tanrei-tab[value="overview"]')) each.label = 'Overview of everything in the project';
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await frames(page);
    for (const id of ['primary', 'secondary', 'secondary-icons', 'primary-icons', 'secondary-fill', 'secondary-icons-fill', 'primary-icon-only-fill', 'primary-icon-only']) {
      const tall = (await readThumb(row(page, id))).find((piece) => piece.drawn)!;
      expect(tall.box.h, id).toBeGreaterThan(80);
      await expectOneThumb(row(page, id), SHAPES[id], `enlarged, ${id}`);
    }
  });
});

// A shared choice (TAB-36…41). The spec's two fixtures name one group; a test stages them — and rows of
// its own — in one document, each given its props before it is first drawn, so that none of them is the group's choice.
const PLATFORMS = [t('web', 'Web'), t('react', 'React'), t('swiftui', 'SwiftUI'), t('flutter', 'Flutter')];
const sharedFixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
/** A member of the group `g`: the four platforms, `selected` its own. */
const member = (id: string, selected: string, props: Fixture['props'] = {}, content?: string) => fixture(id, PLATFORMS, { label: 'Platform', selected, group: 'g', ...props }, content);
/** The row's `value` and the tab it exposes as selected, which are the same tab's: what the row shows. */
const shows = (page: P, id: string) =>
  row(page, id).evaluate((el: any) => {
    const exposed = [...el.querySelectorAll(':scope > tanrei-tab')].filter((each: any) => each.getAttribute('aria-selected') === 'true').map((each: any) => each.value);
    // While `value` is null the row selects its first enabled tab (TAB-11).
    return exposed.length === 1 && (el.value ?? exposed[0]) === exposed[0] ? (exposed[0] as string) : `${el.value}≠${exposed.join(',')}`;
  });
const showsAll = (page: P, ids: string[]) => Promise.all(ids.map((id) => shows(page, id)));
/** Every `change` the document hears: the fixture it came from and the value it carried. */
const hear = (page: P) =>
  page.evaluate(() => {
    const heard: string[] = ((window as any).heard = []);
    document.addEventListener('change', (e) => heard.push(`${(e.target as Element).closest('[data-fixture]')?.getAttribute('data-fixture')}:${(e as CustomEvent).detail?.value}`));
  });
const heard = (page: P) => page.evaluate(() => (window as any).heard as string[]);
/** The tab of `value` in a row. */
const tabOf = (page: P, id: string, value: string) => row(page, id).locator(`tanrei-tab[value="${value}"]`);
const indexOf = (page: P, id: string, value: string) => row(page, id).evaluate((el, v) => [...el.querySelectorAll(':scope > tanrei-tab')].findIndex((each: any) => each.value === v), value);
/** A person uses the tab of `value` in the page — focus on it, then its activation — and one frame passes. */
const useTab = (page: P, id: string, value: string) =>
  tabOf(page, id, value).evaluate(async (el: HTMLElement) => {
    // As the row moves focus itself (TAB-12): without the browser's own scrolling to the focused element.
    el.focus({ preventScroll: true });
    el.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
/** The motions running in a row now: its slide, its reveal, and the transitions of its tabs' colors. */
const moving = (page: P, id: string) =>
  row(page, id).evaluate((el) => ({
    slide: el.shadowRoot!.querySelector('.tabs')!.getAnimations().filter((a) => a.id === 'tanrei-tabs-slide').length,
    reveal: el.shadowRoot!.querySelector('.scroller')!.getAnimations().filter((a) => a.id === 'tanrei-tabs-reveal').length,
    colors: [...el.querySelectorAll(':scope > tanrei-tab')].flatMap((each) => each.shadowRoot!.getAnimations()).length,
  }));
/** Whether the indicator is drawn whole on tab `n`: its piece there is the tab's container. */
const wholeOn = async (page: P, id: string, n: number) => {
  const [piece, box] = [await clipped(cover(page, id, n)), await seat(page, id, n)];
  return !!piece && Math.abs(piece.x - box.x) < 0.5 && Math.abs(piece.width - box.width) < 0.5;
};

/**
 * A storage the test owns (TAB-39): `localStorage` needs a document with an origin, so the fixtures are served at one,
 * and every read and write of it — and every tab ever exposed as selected, every panel ever shown — is recorded from
 * before the first element exists.
 */
const ORIGIN = 'http://tabs.test/';
async function serve(page: P, fixtures: Fixture[], { blocked = false } = {}) {
  const body = await fixturesDocument(spec, { fixtures });
  await page.unroute(`${ORIGIN}**`);
  await page.route(`${ORIGIN}**`, (route) => route.fulfill({ contentType: 'text/html', body }));
  if (blocked) {
    // A browser that blocks storage: reaching for it throws, and so does every use of one reached before.
    await page.addInitScript(() => {
      const refuse = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: refuse });
      Storage.prototype.getItem = refuse;
      Storage.prototype.setItem = refuse;
    });
  } else {
    await page.addInitScript(() => {
      const w = window as any;
      if (w.reads) return;
      [w.reads, w.writes, w.exposed] = [[], [], []];
      const { getItem, setItem } = Storage.prototype;
      Storage.prototype.getItem = function (key: string) {
        w.reads.push(key);
        return getItem.call(this, key);
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        w.writes.push([key, value]);
        setItem.call(this, key, value);
      };
      new MutationObserver((records) => {
        for (const { target, attributeName } of records) {
          const el = target as Element;
          if (attributeName === 'aria-selected' && el.getAttribute('aria-selected') === 'true') w.exposed.push(`${el.closest('[data-fixture]')?.getAttribute('data-fixture')}:tab:${el.getAttribute('value')}`);
          if (attributeName === 'hidden' && !el.hasAttribute('hidden') && el.localName === 'tanrei-tab-panel') w.exposed.push(`${el.closest('[data-fixture]')?.getAttribute('data-fixture')}:panel:${el.getAttribute('value')}`);
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-selected', 'hidden'] });
    });
  }
  await page.goto(ORIGIN);
  await page.waitForFunction(() => !!customElements.get('tanrei-tabs'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
const storageLog = (page: P) => page.evaluate(() => ({ reads: (window as any).reads as string[], writes: (window as any).writes as [string, string][], exposed: (window as any).exposed as string[] }));

test.describe('a shared choice', () => {
  test('TAB-36: rows that name one group show one choice — a row with an enabled tab of it has it selected in the frame it changes, gains the tab, has it enabled or is given the group, and emits nothing; a row without one keeps its own and follows again; another group and no group never change', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [sharedFixture('shared-choice'), sharedFixture('shared-choice-lacking'), fixture('other', PLATFORMS, { label: 'Platform', selected: 'flutter', group: 'another' }), fixture('none', PLATFORMS, { label: 'Platform', selected: 'flutter' })],
    });
    await hear(page);
    const [a, b] = ['shared-choice', 'shared-choice-lacking'];
    // A group holds no choice until someone makes one: each row is drawn with its own selected.
    expect(await showsAll(page, [a, b, 'other', 'none'])).toEqual(['flutter', 'react', 'flutter', 'flutter']);
    // The second row has no SwiftUI: it keeps React, and reports nothing.
    await tabOf(page, a, 'swiftui').click();
    expect(await showsAll(page, [a, b])).toEqual(['swiftui', 'react']);
    expect(await heard(page)).toEqual([`${a}:swiftui`]);
    // It follows again as soon as the choice is one it has — in the frame the choice changes.
    await useTab(page, a, 'web');
    expect(await showsAll(page, [a, b])).toEqual(['web', 'web']);
    await useTab(page, b, 'react');
    expect(await showsAll(page, [a, b])).toEqual(['react', 'react']);
    expect(await heard(page)).toEqual([`${a}:swiftui`, `${a}:web`, `${b}:react`]);
    // The frame it gains a tab of the choice.
    await useTab(page, a, 'swiftui');
    expect(await shows(page, b)).toBe('react');
    await row(page, b).evaluate(async (el) => {
      const added = Object.assign(document.createElement('tanrei-tab'), { value: 'swiftui', label: 'SwiftUI' });
      el.append(added);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await shows(page, b)).toBe('swiftui');
    // A disabled tab is never followed to; the frame it is enabled, it is.
    await row(page, b).evaluate((el) => el.append(Object.assign(document.createElement('tanrei-tab'), { value: 'flutter', label: 'Flutter', disabled: true })));
    await useTab(page, a, 'flutter');
    expect(await showsAll(page, [a, b])).toEqual(['flutter', 'swiftui']);
    await tabOf(page, b, 'flutter').evaluate(async (el: any) => {
      el.disabled = false;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await shows(page, b)).toBe('flutter');
    // The frame a row is given the group; a row of another group, and one of none, never changed.
    await useTab(page, a, 'web');
    expect(await showsAll(page, [a, b, 'other', 'none'])).toEqual(['web', 'web', 'flutter', 'flutter']);
    await row(page, 'none').evaluate(async (el: any) => {
      el.group = 'fixture-platform';
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await showsAll(page, ['none', 'other'])).toEqual(['web', 'flutter']);
    // Group names are compared exactly; an empty group shares with nobody.
    await row(page, 'none').evaluate((el: any) => (el.group = 'Fixture-Platform'));
    await useTab(page, a, 'react');
    expect(await showsAll(page, [a, b, 'none', 'other'])).toEqual(['react', 'react', 'web', 'flutter']);
    // Only the rows a person used were heard.
    expect((await heard(page)).every((each) => each.startsWith(`${a}:`) || each === `${b}:react`)).toBe(true);
  });

  test('TAB-37: a tab tapped, each arrow key and a released drag on a member are the group’s choice and are heard once, from that row; selected set by the product moves the group and is heard from none; the selected a row is first drawn with, one that names no tab or a disabled one, a held drag and indicatorOffset are not shared', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [member('a', 'web'), member('b', 'react'), member('c', 'swiftui')] });
    await hear(page);
    const all = ['a', 'b', 'c'];
    // The selected each row is first drawn with is its own.
    expect(await showsAll(page, all)).toEqual(['web', 'react', 'swiftui']);
    await tabOf(page, 'a', 'flutter').click();
    expect(await showsAll(page, all)).toEqual(['flutter', 'flutter', 'flutter']);
    expect(await heard(page)).toEqual(['a:flutter']);
    // Each arrow key that selects a tab is one choice.
    await tabTo(page, tabOf(page, 'b', 'flutter'));
    await page.keyboard.press('ArrowLeft');
    expect(await showsAll(page, all)).toEqual(['swiftui', 'swiftui', 'swiftui']);
    await page.keyboard.press('ArrowLeft');
    expect(await showsAll(page, all)).toEqual(['react', 'react', 'react']);
    expect(await heard(page)).toEqual(['a:flutter', 'b:swiftui', 'b:react']);
    // A drag held between two tabs of one member leaves the others as they were; its release is one choice.
    await override(page, { [T('motion-indicator-duration')]: '0s' });
    const [react, web] = [await centreX(page, 'c', 1), await centreX(page, 'c', 0)];
    await drag(page, 'c', 1, glide(react, (react + web) / 2), { up: null });
    expect(await dragging(page, 'c')).toBe(true);
    expect(await showsAll(page, all)).toEqual(['react', 'react', 'react']);
    expect(await wholeOn(page, 'a', 1)).toBe(true);
    await pointer(page, 'c', 'pointermove', web);
    await pointer(page, 'c', 'pointerup', web);
    expect(await showsAll(page, all)).toEqual(['web', 'web', 'web']);
    expect(await heard(page)).toEqual(['a:flutter', 'b:swiftui', 'b:react', 'c:web']);
    // The product sets selected on a member: every member follows, and nothing is heard.
    await row(page, 'c').evaluate((el: any) => (el.value = 'flutter'));
    await expect.poll(() => showsAll(page, all)).toEqual(['flutter', 'flutter', 'flutter']);
    // indicatorOffset is the row's alone.
    await row(page, 'a').evaluate((el: any) => (el.indicatorOffset = -0.5));
    await frames(page);
    expect(await wholeOn(page, 'a', 3)).toBe(false);
    expect([await wholeOn(page, 'b', 3), await wholeOn(page, 'c', 3)]).toEqual([true, true]);
    await row(page, 'a').evaluate((el: any) => (el.indicatorOffset = 0));
    // A selected that names no tab, or a disabled one, is not the group's choice: the others stay, and the row, which
    // has an enabled tab of the choice, has it selected again (TAB-36).
    await row(page, 'a').evaluate((el: any) => (el.value = 'nothing'));
    await frames(page);
    expect(await showsAll(page, all)).toEqual(['flutter', 'flutter', 'flutter']);
    await tabOf(page, 'b', 'react').evaluate((el: any) => (el.disabled = true));
    await row(page, 'b').evaluate((el: any) => (el.value = 'react'));
    await frames(page);
    expect(await showsAll(page, all)).toEqual(['flutter', 'flutter', 'flutter']);
    expect(await heard(page)).toEqual(['a:flutter', 'b:swiftui', 'b:react', 'c:web']);
  });

  test('TAB-38: in the frame after a tab is selected on one member every other member is whole on the new tab — no slide, no color motion, its panel changed — while the member acted on is part of the way; focus stays on the tab the person used, the page does not scroll, and a member that follows a drag of its own ends it', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [member('a', 'web'), member('b', 'web', {}, panels(['web', 'react', 'swiftui', 'flutter'], ['react'])), member('c', 'web')] });
    await hear(page);
    await override(page, { [T('motion-indicator-duration')]: '60s', [T('motion-state-duration')]: '60s' });
    const scrolled = () => page.evaluate(() => [scrollX, scrollY]);
    const before = await scrolled();
    await useTab(page, 'a', 'flutter');
    // One frame on: the followers have drawn the choice, whole and in their colors; the row acted on is on its way.
    expect(await moving(page, 'a')).toMatchObject({ slide: 1 });
    expect((await moving(page, 'a')).colors).toBeGreaterThan(0);
    for (const id of ['b', 'c']) {
      expect(await moving(page, id), id).toEqual({ slide: 0, reveal: 0, colors: 0 });
      expect(await wholeOn(page, id, 3), id).toBe(true);
      expect(await shows(page, id)).toBe('flutter');
      expect((await drawn(page, id, 3)).covered).toBe((await expected(page, 'primary', 'selected')).covered);
      expect((await drawn(page, id, 0)).label).toBe((await expected(page, 'primary', '')).label);
    }
    expect(await wholeOn(page, 'a', 3)).toBe(false);
    // Its own panel changed at once (TAB-13).
    await expect(panel(page, 'b', 'flutter')).toBeVisible();
    await expect(panel(page, 'b', 'web')).toBeHidden();
    // Focus is where the person put it; nothing outside a track scrolled; one change, from the row acted on.
    expect(await focused(page)).toBe('flutter');
    expect(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture'))).toBe('a');
    expect(await scrolled()).toEqual(before);
    expect(await heard(page)).toEqual(['a:flutter']);
    // A follower shows no state for the change.
    expect(await box(page, 'b', 3).getAttribute('data-pressed')).toBeNull();
    expect(await tabOf(page, 'b', 'flutter').evaluate((el) => el.matches(':focus, :hover'))).toBe(false);
    await finishSlide(page, 'a');
    // A member that follows a drag of its own when the choice changes ends it, without a selection (TAB-30).
    const [flutter, swiftui] = [await centreX(page, 'c', 3), await centreX(page, 'c', 2)];
    await drag(page, 'c', 3, glide(flutter, (flutter + swiftui) / 2), { up: null });
    expect(await dragging(page, 'c')).toBe(true);
    await useTab(page, 'a', 'react');
    expect(await dragging(page, 'c')).toBe(false);
    expect(await showsAll(page, ['a', 'b', 'c'])).toEqual(['react', 'react', 'react']);
    await pointer(page, 'c', 'pointerup', swiftui);
    expect(await showsAll(page, ['a', 'b', 'c'])).toEqual(['react', 'react', 'react']);
    expect(await heard(page)).toEqual(['a:flutter', 'a:react']);
  });

  test('TAB-38, TAB-16: a member that follows while it is not displayed, far out of view, in a hidden panel or drawn scaled draws one whole thumb on the chosen tab — at once where it is displayed, and when it appears where it is not, without a touch', async ({ page }) => {
    const ids = ['hidden', 'far', 'scaled'];
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [member('a', 'web'), ...[...ids, 'nested'].map((id) => member(id, 'web'))] });
    const nested = page.locator('#outer tanrei-tab-panel[value="two"] tanrei-tabs');
    await page.evaluate(async () => {
      const stage = (id: string) => document.querySelector<HTMLElement>(`[data-fixture="${id}"]`)!;
      stage('hidden').style.display = 'none';
      stage('far').style.marginBlockStart = '6000px';
      stage('scaled').style.scale = '0.9';
      // A row inside the hidden panel of another row: a sample within a tab of its own.
      const outer = document.createElement('tanrei-tabs');
      outer.innerHTML = '<tanrei-tab value="one" label="One"></tanrei-tab><tanrei-tab value="two" label="Two"></tanrei-tab><tanrei-tab-panel value="one">One</tanrei-tab-panel><tanrei-tab-panel value="two"></tanrei-tab-panel>';
      outer.id = 'outer';
      const inner = stage('nested').querySelector('tanrei-tabs')!;
      document.querySelector('main')!.append(outer);
      outer.querySelector('tanrei-tab-panel[value="two"]')!.append(inner);
      inner.style.inlineSize = '360px';
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await useTab(page, 'a', 'swiftui');
    expect(await showsAll(page, ids)).toEqual(['swiftui', 'swiftui', 'swiftui']);
    expect(await nested.evaluate((el: any) => el.value)).toBe('swiftui');
    const onChosen = async (id: string, hint: string) => {
      await expectOneThumb(row(page, id).last(), 'capsule', `${id}, ${hint}`);
      expect((await readThumb(row(page, id).last())).findIndex((piece) => piece.drawn), `${id}, ${hint}`).toBe(2);
    };
    // Displayed, though out of view or scaled: drawn in the frame of the choice.
    await onChosen('far', 'out of view');
    await onChosen('scaled', 'scaled');
    for (const id of ['far', 'scaled']) expect(await moving(page, id)).toEqual({ slide: 0, reveal: 0, colors: 0 });
    // Not displayed: correct as soon as it is, with no motion.
    await page.evaluate(async () => {
      document.querySelector<HTMLElement>('[data-fixture="hidden"]')!.style.display = '';
      (document.querySelector('#outer tanrei-tab[value="two"]') as HTMLElement).click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await onChosen('hidden', 'shown');
    expect(await slides(page, 'hidden')).toBe(0);
    await expectOneThumb(nested, 'capsule', 'nested, shown');
    expect((await readThumb(nested)).findIndex((piece) => piece.drawn)).toBe(2);
    // And a second choice while they are displayed moves each at once.
    await useTab(page, 'a', 'react');
    for (const id of ['hidden', 'far', 'scaled']) expect((await readThumb(row(page, id).last())).findIndex((piece) => piece.drawn), id).toBe(1);
  });

  test('TAB-17: a row that follows a choice made on another row puts the indicator and the underline on its tab at once, without a slide, while the row the product set slides as any selection does', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [member('a', 'web'), member('b', 'web')] });
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    // The product sets selected on a: a slides (TAB-17), b is there at once (TAB-38).
    await row(page, 'a').evaluate(async (el: any) => {
      el.value = 'swiftui';
      await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await slides(page, 'a')).toBe(1);
    expect(await slides(page, 'b')).toBe(0);
    expect(await wholeOn(page, 'b', 2)).toBe(true);
    const [mark, under] = [await pill(page, 'b', 2), await line(page, 'b', 2)];
    expect(within(await bounds(label(page, 'b', 2)), mark)).toBe(true);
    expect(under.width).toBeCloseTo((await bounds(content(page, 'b', 2))).width, 0);
    expect(await wholeOn(page, 'a', 2)).toBe(false);
    // A follower in the middle of a slide of its own ends it where the choice is.
    await finishSlide(page, 'a');
    await useTab(page, 'b', 'flutter');
    expect(await slides(page, 'b')).toBe(1);
    await useTab(page, 'a', 'web');
    expect(await slides(page, 'b')).toBe(0);
    expect(await wholeOn(page, 'b', 0)).toBe(true);
  });

  test('TAB-23: a tab that becomes selected, or stops being selected, because its row follows a choice changes its colors at once, while the row acted on animates them; two frames on, a follower’s tabs answer a pointer with the state motion again', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [member('a', 'web'), member('b', 'web')] });
    await override(page, { [T('motion-state-duration')]: '60s', [T('motion-indicator-duration')]: '0s' });
    await useTab(page, 'a', 'react');
    const [on, off] = [await expected(page, 'primary', 'selected'), await expected(page, 'primary', '')];
    // The follower: the new tab wholly in its selected colors, the old one wholly in its own, nothing in between.
    expect(await drawn(page, 'b', 1)).toMatchObject({ covered: on.covered, pill: on.pill, underline: on.underline, bg: on.bg });
    expect(await drawn(page, 'b', 0)).toMatchObject({ label: off.label, bg: off.bg });
    expect((await moving(page, 'b')).colors).toBe(0);
    // The row the person used animates its colors over the state motion.
    expect((await moving(page, 'a')).colors).toBeGreaterThan(0);
    // The mark is for the frame that draws the change only.
    await frames(page, 3);
    expect(await box(page, 'b', 1).getAttribute('data-still')).toBeNull();
    // (Its color and its weight.)
    expect((await css(label(page, 'b', 1), 'transition-duration')).split(', ').every((duration) => duration === '60s')).toBe(true);
    await box(page, 'b', 2).hover();
    expect((await moving(page, 'b')).colors).toBeGreaterThan(0);
  });

  test('TAB-15: a tab that becomes selected because its row follows its group’s choice is brought into view inside the track at once, while the row acted on scrolls over the indicator’s motion; nothing outside the track scrolls', async ({ page }) => {
    const many = ['Overview', 'Activity', 'Settings', 'Members', 'Billing', 'Integrations', 'Security', 'Advanced'].map((name) => t(name.toLowerCase(), name));
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a', many, { selected: 'overview', group: 'g' }), fixture('b', many, { selected: 'overview', group: 'g' })] });
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    const scroll = (id: string) => track(page, id).evaluate((el) => el.scrollLeft);
    expect([await scroll('a'), await scroll('b')]).toEqual([0, 0]);
    const page0 = await page.evaluate(() => [scrollX, scrollY]);
    await useTab(page, 'a', 'advanced');
    // The follower: the whole tab in view in the next frame, with no motion of the track.
    expect(await moving(page, 'b')).toEqual({ slide: 0, reveal: 0, colors: 0 });
    expect(within(await bounds(tabAt(page, 'b', 7)), await bounds(track(page, 'b')))).toBe(true);
    expect(await scroll('b')).toBeGreaterThan(0);
    // The row acted on is on its way there.
    expect((await moving(page, 'a')).reveal).toBe(1);
    expect(await scroll('a')).toBeLessThan(await scroll('b'));
    expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(page0);
  });

  test('TAB-39: a row with rememberAs reads its key once, stores a person’s choice — the tab’s value, under exactly that key — and never one the product set; a row drawn later, and the next document, show the remembered tab in their first frame and emit nothing; a stored value that names no tab, a disabled one or markup changes nothing and is drawn nowhere; without a key no storage is touched', async ({ page }) => {
    const remembering = (id: string, selected: string | null = null, props: Fixture['props'] = {}) =>
      fixture(id, PLATFORMS, { label: 'Platform', ...(selected ? { selected } : {}), rememberAs: 'k', ...props }, panels(['web', 'react', 'swiftui', 'flutter']));
    await serve(page, [remembering('r'), fixture('plain', PLATFORMS, { label: 'Platform' }), fixture('grouped', PLATFORMS, { label: 'Platform', group: 'quiet' })]);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => !!customElements.get('tanrei-tabs'));
    await hear(page);
    // Nothing stored: the row draws its own selected, and has read its key once. Rows without a key read nothing.
    expect(await shows(page, 'r')).toBe('web');
    expect((await storageLog(page)).reads).toEqual(['k']);
    // A person's selection is stored: that key, that string, once. A row without a key stores nothing.
    await tabOf(page, 'r', 'react').click();
    await tabOf(page, 'plain', 'flutter').click();
    await tabOf(page, 'grouped', 'flutter').click();
    expect((await storageLog(page)).writes).toEqual([['k', 'react']]);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ k: 'react' });
    // A selected set by the product is stored by no row.
    await row(page, 'r').evaluate(async (el: any) => {
      el.value = 'swiftui';
      await el.updateComplete;
    });
    expect((await storageLog(page)).writes).toEqual([['k', 'react']]);
    // A row drawn afterwards with the key shows the remembered tab in its first frame, emits nothing, and reads nothing
    // again: a key is read once in the life of a document.
    await page.evaluate(async () => {
      const stage = document.createElement('div');
      stage.className = 'stage';
      stage.dataset.fixture = 'later';
      stage.innerHTML = `<tanrei-tabs label="Platform" remember-as="k" value="flutter">${['web', 'react', 'swiftui', 'flutter'].map((v) => `<tanrei-tab value="${v}" label="${v}"></tanrei-tab>`).join('')}</tanrei-tabs>`;
      document.querySelector('main')!.append(stage);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await shows(page, 'later')).toBe('react');
    const session = await storageLog(page);
    expect(session.reads).toEqual(['k']);
    expect(session.exposed.filter((each) => each.startsWith('later:'))).toEqual(['later:tab:react']);
    expect(await heard(page)).toEqual(['r:react', 'plain:flutter', 'grouped:flutter']);

    // The next document: the remembered tab and its panel from the first frame — the first tab is never exposed as
    // selected and its panel never shown — and nothing is emitted or written.
    await page.reload();
    await page.waitForFunction(() => !!customElements.get('tanrei-tabs'));
    await frames(page);
    expect(await shows(page, 'r')).toBe('react');
    await expect(panel(page, 'r', 'react')).toBeVisible();
    await expect(panel(page, 'r', 'web')).toBeHidden();
    const next = await storageLog(page);
    expect(next.exposed.filter((each) => each.startsWith('r:'))).toEqual(['r:tab:react']);
    expect([next.reads, next.writes]).toEqual([['k'], []]);
    expect(await showsAll(page, ['plain', 'grouped'])).toEqual(['web', 'web']);

    // A stored value that names no tab, a disabled tab, or markup: the row is as it is with nothing stored, and the
    // value is drawn nowhere.
    const markup = '<img src=x onerror="window.ran = true"><b id="stored-markup">stored</b>';
    // (`r` has an enabled Flutter tab and restores it; `off`, whose Flutter tab is disabled, does not.)
    for (const [stored, own, shown] of [['compose', null, 'web'], ['flutter', null, 'flutter'], [markup, 'swiftui', 'swiftui']] as const) {
      await page.evaluate((value) => localStorage.setItem('k', value), stored);
      await serve(page, [remembering('r', own), fixture('off', [...PLATFORMS.slice(0, 3), t('flutter', 'Flutter', { disabled: true })], { label: 'Platform', rememberAs: 'k' })]);
      expect(await showsAll(page, ['r', 'off']), stored).toEqual([shown, 'web']);
      expect(await page.evaluate(() => [document.querySelector('#stored-markup'), (window as any).ran ?? null, document.documentElement.innerHTML.includes('stored-markup')])).toEqual([null, null, false]);
      expect((await storageLog(page)).writes.filter(([key]) => key === 'k').length, 'the test’s own write only').toBe(0);
    }
  });

  test('TAB-39: a stored value is its group’s choice — whether or not the row that read it has a tab of it — so members without a key follow before their first frame; a group that holds a choice keeps it; a member that names a key stores a choice made on another member, once for a key however many name it', async ({ page }) => {
    const lacking = fixture('lacking', PLATFORMS.slice(0, 2), { label: 'Platform', selected: 'react', group: 'g', rememberAs: 'k' });
    await serve(page, [lacking, member('a', 'web'), member('b', 'swiftui', { rememberAs: 'k' }), member('c', 'web', { rememberAs: 'other' })]);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('k', 'flutter');
      localStorage.setItem('other', 'react');
    });
    await page.reload();
    await page.waitForFunction(() => !!customElements.get('tanrei-tabs'));
    await frames(page);
    await hear(page);
    // The first member with a key has no Flutter tab; the stored value is the group's choice all the same. The key
    // read later finds a group that holds a choice, which keeps it.
    expect(await showsAll(page, ['lacking', 'a', 'b', 'c'])).toEqual(['react', 'flutter', 'flutter', 'flutter']);
    const log = await storageLog(page);
    expect(log.reads.sort()).toEqual(['k', 'other']);
    expect(log.writes).toEqual([]);
    // No frame showed another tab first on a member that follows.
    expect(log.exposed.filter((each) => /^[abc]:/.test(each)).sort()).toEqual(['a:tab:flutter', 'b:tab:flutter', 'c:tab:flutter']);
    expect(await heard(page)).toEqual([]);
    // A choice made on a member without a key is stored by the members that name one and whose tab it changed: once
    // for each key.
    await page.evaluate(() => ((window as any).writes.length = 0));
    await tabOf(page, 'a', 'web').click();
    expect(await showsAll(page, ['lacking', 'a', 'b', 'c'])).toEqual(['web', 'web', 'web', 'web']);
    expect((await storageLog(page)).writes.sort()).toEqual([['k', 'web'], ['other', 'web']]);
    // A member whose tab the choice does not change stores nothing: SwiftUI is not a tab of the row that lacks it.
    await page.evaluate(() => ((window as any).writes.length = 0));
    await row(page, 'b').evaluate((el: any) => (el.rememberAs = ''));
    await tabOf(page, 'a', 'swiftui').click();
    expect(await showsAll(page, ['lacking', 'a', 'b', 'c'])).toEqual(['web', 'swiftui', 'swiftui', 'swiftui']);
    expect((await storageLog(page)).writes).toEqual([['other', 'swiftui']]);
    expect(await heard(page)).toEqual(['a:web', 'a:swiftui']);
  });

  test('TAB-39: with a storage that is blocked — reaching for it throws, and so does every access — the rows work, the choice is kept for as long as the document lasts, and nothing is thrown or logged', async ({ page }) => {
    const said: string[] = [];
    page.on('console', (message) => said.push(`${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => said.push(`error: ${error.message}`));
    await serve(page, [fixture('r', PLATFORMS, { label: 'Platform', rememberAs: 'k' }), member('m', 'react', { rememberAs: 'k' }), member('n', 'web')], { blocked: true });
    await hear(page);
    expect(await showsAll(page, ['r', 'm', 'n'])).toEqual(['web', 'react', 'web']);
    await tabOf(page, 'r', 'swiftui').click();
    await tabOf(page, 'm', 'flutter').click();
    expect(await showsAll(page, ['r', 'm', 'n'])).toEqual(['swiftui', 'flutter', 'flutter']);
    expect(await heard(page)).toEqual(['r:swiftui', 'm:flutter']);
    // What could not be stored lasts as long as the document: a row drawn later with the key takes it.
    await page.evaluate(async () => {
      const stage = document.createElement('div');
      stage.dataset.fixture = 'later';
      stage.innerHTML = `<tanrei-tabs label="Platform" remember-as="k">${['web', 'react', 'swiftui', 'flutter'].map((v) => `<tanrei-tab value="${v}" label="${v}"></tanrei-tab>`).join('')}</tanrei-tabs>`;
      document.querySelector('main')!.append(stage);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await shows(page, 'later')).toBe('flutter');
    expect(said).toEqual([]);
  });

  test('TAB-39: a document that has no storage at all — no origin to keep one for — draws its rows and keeps their choices, silently', async ({ page }) => {
    const said: string[] = [];
    page.on('console', (message) => said.push(`${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => said.push(`error: ${error.message}`));
    // The harness's own document: `setContent` on about:blank.
    await mountFixtures(page, spec, { fixtures: [fixture('r', PLATFORMS, { label: 'Platform', rememberAs: 'k' })] });
    await tabOf(page, 'r', 'react').click();
    expect(await shows(page, 'r')).toBe('react');
    expect(said).toEqual([]);
  });

  test('TAB-40: a tab selected on the eighth of ten members, by pointer and by an arrow key, leaves its row at the same place in the window in every frame while the seven before it change height — in the document and in a region that scrolls, with the browser’s own scroll anchoring on and off; as far as the region goes where it cannot scroll that far; and not for a choice the product set', async ({ page }) => {
    const heights: Record<string, number> = { web: 40, react: 120, swiftui: 300, flutter: 80 };
    const own = Object.entries(heights).map(([value, height]) => `<tanrei-tab-panel value="${value}"><div style="block-size:${height}px">View of ${value}</div></tanrei-tab-panel>`).join('');
    // A group keeps its choice for as long as its document lasts (TAB-41), and the harness mounts into one document:
    // each staging names a group of its own.
    const ten = (group: string) => Array.from({ length: 10 }, (_, i) => member(`m${i + 1}`, 'web', { group }, own));
    /** The eighth row's top edge in every frame from two frames before `act` to ten after, and how far `region` scrolled. */
    const during = async (region: string, act: () => Promise<void>) => {
      await page.evaluate((selector) => {
        const w = window as any;
        const target = document.querySelector('[data-fixture="m8"] tanrei-tabs')!;
        const scroller = selector ? document.querySelector(selector)! : document.scrollingElement!;
        w.tops = [];
        w.from = scroller.scrollTop;
        w.watching = true;
        const tick = () => {
          w.tops.push(target.getBoundingClientRect().top);
          if (w.watching) requestAnimationFrame(tick);
        };
        tick();
      }, region);
      await frames(page);
      await act();
      await frames(page, 10);
      return page.evaluate((selector) => {
        const w = window as any;
        w.watching = false;
        const scroller = selector ? document.querySelector(selector)! : document.scrollingElement!;
        return { tops: w.tops as number[], scrolled: scroller.scrollTop - w.from };
      }, region);
    };
    const still = (tops: number[]) => Math.max(...tops) - Math.min(...tops);
    const centre = (id: string) => row(page, id).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    // One device pixel at the harness's scale of 2.
    const PIXEL = 0.5;
    for (const region of ['', 'main']) {
      for (const anchoring of ['auto', 'none']) {
        await mountFixtures(page, spec, { fixtures: ten(`${region}-${anchoring}`) });
        await page.addStyleTag({
          content: `${region ? 'main { box-sizing: border-box; block-size: 100vh; overflow-y: auto; flex-wrap: nowrap; } main > .stage { flex: none; }' : ''}
            html, main { overflow-anchor: ${anchoring}; } main::after { content: ''; flex: none; block-size: 3000px; }`,
        });
        const where = `${region || 'document'}, anchoring ${anchoring}`;
        await centre('m8');
        // By pointer: the seven rows before it grow by 260 each.
        const target = await bounds(tabOf(page, 'm8', 'swiftui'));
        const tapped = await during(region, () => page.mouse.click(target.x + target.width / 2, target.y + target.height / 2));
        expect(await showsAll(page, ['m1', 'm7', 'm8', 'm10']), where).toEqual(['swiftui', 'swiftui', 'swiftui', 'swiftui']);
        expect(still(tapped.tops), `${where}: by pointer`).toBeLessThanOrEqual(PIXEL);
        expect(tapped.scrolled, where).toBeCloseTo(7 * (heights.swiftui - heights.web), 0);
        // By an arrow key: they shrink again.
        await tabOf(page, 'm8', 'swiftui').focus();
        const keyed = await during(region, () => page.keyboard.press('ArrowRight'));
        expect(await shows(page, 'm1'), where).toBe('flutter');
        expect(still(keyed.tops), `${where}: by an arrow key`).toBeLessThanOrEqual(PIXEL);
        expect(keyed.scrolled, where).toBeCloseTo(7 * (heights.flutter - heights.swiftui), 0);
        // What lies after the row moved as its own panel required: the ninth row is lower by the eighth's panel alone.
        if (region) expect(await page.evaluate(() => scrollY), where).toBe(0);
        // A choice the product set keeps no place: no person has one. (Seen where the browser does not anchor either.)
        if (anchoring === 'none') {
          const set = await during(region, () => row(page, 'm8').evaluate((el: any) => (el.value = 'swiftui')));
          expect(await shows(page, 'm1'), where).toBe('swiftui');
          expect(still(set.tops), `${where}: set by the product`).toBeCloseTo(7 * (heights.swiftui - heights.flutter), 0);
          expect(set.scrolled, where).toBe(0);
        }
      }
    }
    // Where the region cannot scroll that far, it goes as far as it does: the third row, 100 from the top of the
    // region's content, with 520 less before it.
    await page.evaluate(() => document.scrollingElement!.scrollTo({ top: 0, behavior: 'instant' }));
    await page.evaluate(() => document.querySelector('main')!.scrollTo({ top: 100, behavior: 'instant' }));
    const third = await bounds(tabOf(page, 'm3', 'web'));
    await page.mouse.click(third.x + third.width / 2, third.y + third.height / 2);
    await frames(page);
    expect(await shows(page, 'm1')).toBe('web');
    expect(await page.evaluate(() => document.querySelector('main')!.scrollTop)).toBe(0);
  });

  test('TAB-41: sixty-two members that name one key read the storage once as they appear and write it once for a choice; every member has changed in the frame after the selection and none that was not acted on runs a motion; a member that is removed leaves the group, which keeps its choice for a row drawn later', async ({ page }) => {
    const sixtyTwo = Array.from({ length: 62 }, (_, i) => member(`m${i + 1}`, 'web', { rememberAs: 'k' }));
    await serve(page, sixtyTwo);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => !!customElements.get('tanrei-tabs'));
    await frames(page);
    await hear(page);
    expect((await storageLog(page)).reads).toEqual(['k']);
    // One choice: one frame later every member shows it, and only the row acted on moves.
    const after = await tabOf(page, 'm31', 'swiftui').evaluate(async (el: HTMLElement) => {
      el.focus();
      el.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const rows = [...document.querySelectorAll<any>('tanrei-tabs')];
      const acted = el.parentElement!;
      // Every motion of a row: its own shadow tree's (the slide, the reveal) and its tabs' (their colors).
      const motions = (each: Element) => [each, ...each.querySelectorAll(':scope > tanrei-tab')].flatMap((host) => host.shadowRoot!.getAnimations()).length;
      return {
        values: [...new Set(rows.map((each) => each.value))],
        exposed: [...new Set(rows.map((each) => each.querySelector('[aria-selected="true"]')?.value))],
        moving: rows.filter((each) => each !== acted).reduce((sum, each) => sum + motions(each), 0),
        acted: motions(acted),
      };
    });
    expect(after.values).toEqual(['swiftui']);
    expect(after.exposed).toEqual(['swiftui']);
    expect(after.moving).toBe(0);
    expect(after.acted).toBeGreaterThan(0);
    const log = await storageLog(page);
    expect([log.reads, log.writes]).toEqual([['k'], [['k', 'swiftui']]]);
    expect(await heard(page)).toEqual(['m31:swiftui']);
    for (const id of ['m1', 'm30', 'm62']) expect(await wholeOn(page, id, 2), id).toBe(true);
    // Every member leaves; the group keeps its choice, and a row drawn later takes it in its first frame.
    await page.evaluate(async () => {
      for (const stage of [...document.querySelectorAll('.stage')]) stage.remove();
      (window as any).exposed.length = 0;
      const stage = document.createElement('div');
      stage.className = 'stage';
      stage.dataset.fixture = 'later';
      stage.innerHTML = `<tanrei-tabs label="Platform" group="g" value="react">${['web', 'react', 'swiftui', 'flutter'].map((v) => `<tanrei-tab value="${v}" label="${v}"></tanrei-tab>`).join('')}</tanrei-tabs>`;
      document.querySelector('main')!.append(stage);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await shows(page, 'later')).toBe('swiftui');
    expect((await storageLog(page)).exposed).toEqual(['later:tab:swiftui']);
    // A member that left follows nothing: it is out of its group until it is in the document again.
    const kept = await page.evaluate(async () => {
      const later = document.querySelector<any>('[data-fixture="later"] tanrei-tabs');
      const parent = later.parentElement;
      later.remove();
      const other = document.createElement('div');
      other.innerHTML = `<tanrei-tabs label="Platform" group="g">${['web', 'react'].map((v) => `<tanrei-tab value="${v}" label="${v}"></tanrei-tab>`).join('')}</tanrei-tabs>`;
      document.querySelector('main')!.append(other);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      (other.querySelector('tanrei-tab[value="react"]') as HTMLElement).click();
      const away = later.value;
      parent.append(later);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return [away, later.value];
    });
    expect(kept).toEqual(['swiftui', 'react']);
  });
});

// Three variants, a row with or without its track, two sizes, and the transition set per instance.
test.describe('variants, the track, sizes and the transition', () => {
  const only = (...ids: string[]) => ids.map((id) => spec.fixtures.find((f) => f.id === id)!);
  /** A color as its four numbers, whether the browser writes `rgb()`, `rgba()` or `color(srgb …)`. */
  const rgba = (value: string) => {
    const n = (value.match(/-?\d*\.?\d+(e-?\d+)?/g) ?? []).map(Number);
    const srgb = value.startsWith('color(');
    const [r, g, b] = srgb ? n.slice(0, 3).map((c) => Math.round(c * 255)) : n.slice(0, 3);
    return [r, g, b, Math.round((n[3] ?? 1) * 100) / 100];
  };
  const selectedValue = (page: P, id: string) => row(page, id).evaluate((el: any) => el.selectedTab?.value as string | null);
  /** The first frame after `act` ran in the page: every tab's piece of the indicator, its label's colors, and what still moves. */
  const firstFrame = (page: P, id: string, act: string) =>
    row(page, id).evaluate(async (el: any, script) => {
      new Function('row', script)(el);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const strip = el.shadowRoot.querySelector('.tabs') as HTMLElement;
      const scroller = el.shadowRoot.querySelector('.scroller') as HTMLElement;
      return {
        row: [...strip.getAnimations(), ...scroller.getAnimations()].map((a) => a.id),
        tabs: [...el.querySelectorAll(':scope > tanrei-tab')].map((tab: any) => {
          const root = tab.shadowRoot as ShadowRoot;
          const cover = root.querySelector('.cover') as HTMLElement;
          return {
            covered: getComputedStyle(cover).visibility === 'visible',
            clip: getComputedStyle(cover).clipPath,
            label: getComputedStyle(root.querySelector('.tab > .content > .label')!).color,
            // What the selection moves: the indicator's pieces and the colors of the two looks. (A state's own fade is another matter.)
            moving: root.getAnimations().filter((a) => a.id === 'tanrei-tabs-slide' || ((a as CSSTransition).transitionProperty === 'color' && (a.effect as KeyframeEffect).target?.classList.contains('label'))).length,
          };
        }),
      };
    }, act);

  test('TAB-50, TAB-24: the tonal indicator is the selected content color at 16 % laid over what is beneath it, under a darker label, the hover layer showing through, drawn once at that opacity while it slides; the three variants say the same to assistive technology', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: only('primary', 'secondary', 'tonal', 'tonal-no-track'), reducedMotion: false });
    for (const id of ['tonal', 'tonal-no-track']) {
      await expect.poll(() => drawn(page, id, 0)).toEqual(await expected(page, 'tonal', 'selected'));
      await expect.poll(() => drawn(page, id, 1)).toEqual(await expected(page, 'tonal', ''));
      const layerColor = rgba(await resolveColor(page, T('tonal-selected-state-layer-color')));
      expect(rgba(await css(cover(page, id, 0), 'background-color')), id).toEqual([...layerColor.slice(0, 3), 0.16]);
      // The darker label on the indicator, the quiet one beside it.
      expect(rgba(await css(tabAt(page, id, 0).locator('.cover .label'), 'color'))).toEqual(rgba(await resolveColor(page, '--tanrei-sys-color-on-secondary-container')));
      expect(rgba(await css(label(page, id, 1), 'color'))).toEqual(rgba(await resolveColor(page, '--tanrei-sys-color-on-surface-variant')));
      expect(within(await bounds(label(page, id, 0)), await pill(page, id, 0))).toBe(true);
    }
    // The same layer whatever the row stands on: nothing is computed against the page.
    const onPage = await css(cover(page, 'tonal-no-track', 0), 'background-color');
    await page.locator('[data-fixture="tonal-no-track"]').evaluate((el) => (el.style.background = 'var(--tanrei-sys-color-surface-container)'));
    expect(await css(cover(page, 'tonal-no-track', 0), 'background-color')).toBe(onPage);
    // Hover on the selected tab: its state layer, over the translucent indicator (TAB-18).
    await box(page, 'tonal', 0).hover();
    await expect.poll(() => css(layer(page, 'tonal', 0), 'background-color')).toBe(await resolveColor(page, T('tonal-hovered-selected-container-color')));
    expect(rgba(await css(layer(page, 'tonal', 0), 'background-color'))[3]).toBeGreaterThan(0);
    expect(rgba(await css(cover(page, 'tonal', 0), 'background-color'))[3]).toBe(0.16);
    expect(await css(layer(page, 'tonal', 0), 'z-index')).toBe('1');
    await page.mouse.move(0, 0);
    // Mid-slide: every tab's piece is one drawing, at the opacity it has at rest, and no two pieces lie over each other.
    await override(page, { [T('motion-indicator-duration')]: '60s' });
    await box(page, 'tonal', 2).click();
    await expect.poll(() => slides(page, 'tonal')).toBe(1);
    await holdSlide(page, 'tonal', 0.5);
    const pieces = [] as { left: number; right: number }[];
    for (const n of [0, 1, 2]) {
      expect(rgba(await css(cover(page, 'tonal', n), 'background-color'))[3], `${n}`).toBe(0.16);
      expect(await tabAt(page, 'tonal', n).evaluate((el) => el.shadowRoot!.querySelectorAll('.cover').length)).toBe(1);
      const [own, piece] = [await bounds(tabAt(page, 'tonal', n)), await pill(page, 'tonal', n)];
      pieces.push({ left: Math.max(own.x, piece.x), right: Math.min(own.x + own.width, piece.x + piece.width) });
    }
    for (const n of [0, 1]) expect(pieces[n].right, `${n}`).toBeLessThanOrEqual(Math.max(pieces[n + 1].left, pieces[n].left) + 0.5);
    await finishSlide(page, 'tonal');
    // The three variants are one control: the same roles, names and states.
    const said = (id: string) =>
      row(page, id).evaluate((el) => [
        el.shadowRoot!.querySelector('[role="tablist"]')!.getAttribute('aria-label'),
        ...[...el.querySelectorAll('tanrei-tab')].map((tab) => ['role', 'aria-selected', 'aria-label', 'aria-posinset', 'aria-setsize', 'aria-controls', 'tabindex'].map((name) => tab.getAttribute(name)).join('|')),
      ]);
    await mountFixtures(page, spec, { fixtures: only('primary', 'secondary', 'tonal') });
    expect(await said('secondary')).toEqual(await said('primary'));
    expect(await said('tonal')).toEqual(await said('primary'));
    if (browserName === 'chromium') {
      const { axTree } = await import('../../../test/ax-tree.js');
      const tree = (id: string) => axTree(page, `[data-fixture="${id}"]`);
      expect(await tree('tonal')).toEqual(await tree('primary'));
      expect(await tree('secondary')).toEqual(await tree('primary'));
    }
  });

  test('TAB-50, TAB-16: the selected label gains its variant’s selected.label.emphasis of weight — 100 for tonal, none for primary and secondary in the default system — in both copies, and moving the selection changes no tab’s width', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary', 'secondary', 'tonal', 'tonal-no-track'), reducedMotion: true });
    const base = Number(await css(label(page, 'primary', 1), 'font-weight'));
    expect(await token(page, T('tonal-selected-label-emphasis'))).not.toBe('');
    for (const id of ['tonal', 'tonal-no-track']) {
      expect(Number(await css(label(page, id, 0), 'font-weight')), id).toBe(base + 100);
      expect(Number(await css(tabAt(page, id, 0).locator('.cover .label'), 'font-weight')), id).toBe(base + 100);
      expect(Number(await css(label(page, id, 1), 'font-weight')), id).toBe(base);
    }
    for (const id of ['primary', 'secondary']) {
      for (const n of [0, 1]) expect(Number(await css(label(page, id, n), 'font-weight')), `${id} ${n}`).toBe(base);
    }
    // Every tab keeps the width of its label at the heavier weight: nothing moves when the selection does.
    const widths = async (id: string) => Promise.all([0, 1, 2].map(async (n) => (await bounds(tabAt(page, id, n))).width));
    const before = await widths('tonal');
    await box(page, 'tonal', 1).click();
    await expect.poll(async () => Number(await css(label(page, 'tonal', 1), 'font-weight'))).toBe(base + 100);
    expect(Number(await css(label(page, 'tonal', 0), 'font-weight'))).toBe(base);
    expect(await widths('tonal')).toEqual(before);
    // The label's own text is never cut by the room kept for the heavier weight.
    for (const n of [0, 1, 2]) expect(await truncated(label(page, 'tonal', n)), `${n}`).toBe(false);
  });

  test('TAB-18: on the selected tab the state layer — in the covered content’s color — is drawn over the active indicator, so hover and press show there; the ring and the underline stay above it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary', 'secondary'), reducedMotion: true });
    for (const variant of ['primary', 'secondary']) {
      expect(await resolveColor(page, T(`${variant}-selected-state-layer-color`)), variant).toBe(await resolveColor(page, T(`${variant}-selected-covered-label-color`)));
      await box(page, variant, 0).hover();
      await expect.poll(() => css(layer(page, variant, 0), 'background-color')).toBe(await resolveColor(page, T(`${variant}-hovered-selected-container-color`)));
      expect(await css(layer(page, variant, 0), 'z-index'), variant).toBe('1');
      // The layer is drawn after the indicator in the tab's own stacking order: it is what the hovered tab shows on top.
      expect(await tabAt(page, variant, 0).evaluate((el) => {
        const root = el.shadowRoot!;
        const z = (selector: string) => getComputedStyle(root.querySelector(selector)!).zIndex;
        return [z('.cover'), z('.box'), z('.ring'), z('.underline')];
      })).toEqual(['auto', '1', '1', '1']);
      // A tab that is not selected keeps its container under the indicator.
      expect(await css(layer(page, variant, 1), 'z-index'), variant).toBe('auto');
      await page.mouse.move(0, 0);
    }
  });

  test('TAB-18: a primary tab stacks its icon or puts it before its label as its size’s icon.placement says; a size a layer adds takes its own value, or medium’s where it declares none', async ({ page }) => {
    // Two sizes a layer added: one declares inline, the other declares nothing and is drawn as medium is.
    const sizesCss = `:root { ${T('container-height-roomy')}: 56px; ${T('icon-placement-roomy')}: inline; ${T('container-height-airy')}: 56px; }`;
    await mountFixtures(page, spec, {
      icons: true,
      system: 'sizes',
      systemCss: sizesCss,
      fixtures: [...only('primary-icons', 'primary-small-icons'), fixture('added-inline', [t('a', 'Alpha', { icon: 'home' }), t('b', 'Beta', { icon: 'star' })], { size: 'roomy', selected: 'a' }), fixture('added-undeclared', [t('a', 'Alpha', { icon: 'home' }), t('b', 'Beta', { icon: 'star' })], { size: 'airy', selected: 'a' })],
    });
    expect([await token(page, T('icon-placement-medium')), await token(page, T('icon-placement-small'))]).toEqual(['stacked', 'inline']);
    const stacks = async (id: string) => {
      const [i, l] = [await bounds(icon(page, id, 0)), await bounds(label(page, id, 0))];
      return i.y + i.height <= l.y + 0.5;
    };
    expect(await stacks('primary-icons')).toBe(true);
    expect(await stacks('primary-small-icons')).toBe(false);
    expect(await stacks('added-inline')).toBe(false);
    expect(await stacks('added-undeclared')).toBe(true);
    const [i, l] = [await bounds(icon(page, 'added-inline', 0)), await bounds(label(page, 'added-inline', 0))];
    expect(i.x + i.width).toBeLessThanOrEqual(l.x + 0.5);
    expect(Math.abs(i.y + i.height / 2 - (l.y + l.height / 2))).toBeLessThanOrEqual(1);
  });

  test('TAB-16, TAB-18: a tonal tab puts its icon before its label at every size and its underline spans the whole tab, as a secondary tab’s does', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('tonal-icons', 'tonal-small-no-track-icons', 'secondary-icons') });
    for (const id of ['tonal-icons', 'tonal-small-no-track-icons']) {
      const [i, l] = [await bounds(icon(page, id, 0)), await bounds(label(page, id, 0))];
      expect(i.x + i.width, id).toBeLessThanOrEqual(l.x + 0.5);
      expect(Math.abs(i.y + i.height / 2 - (l.y + l.height / 2)), id).toBeLessThanOrEqual(1);
      expect(await box(page, id, 0).evaluate((el) => [el.classList.contains('stacked'), el.classList.contains('wide')])).toEqual([false, true]);
      const [whole, drawnLine] = [await bounds(tabAt(page, id, 0)), await line(page, id, 0)];
      expect([drawnLine.x, drawnLine.width]).toEqual([expect.closeTo(whole.x, 0), expect.closeTo(whole.width, 0)]);
      expect(drawnLine.height).toBeCloseTo(await resolveToken(page, T('tonal-underline-thickness')), 1);
    }
  });

  test('TAB-44, TAB-14, TAB-18, TAB-34, TAB-35: a small row is 32 tall with a 24 indicator, its size’s paddings and glyph, the icon before the label in every variant; a medium one 48 and 40; nothing else differs, and an unknown size is the default’s (TAB-7)', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...only('primary', 'tonal-no-track', 'primary-small', 'tonal-small-no-track', 'primary-small-icons', 'secondary-small-icons', 'primary-icons', 'primary-small-icon-only', 'primary-small-fill'), fixture('odd-size', THREE, { size: 'huge', selected: 'overview' })],
    });
    const inset = await resolveToken(page, T('track-padding'));
    const of = async (size: string) => ({
      height: await resolveToken(page, T(`container-height-${size}`)),
      pad: await resolveToken(page, T(`container-padding-inline-${size}`)),
      around: await resolveToken(page, T(`active-indicator-padding-inline-${size}`)),
      block: await resolveToken(page, T(`active-indicator-padding-block-${size}`)),
      glyph: await resolveToken(page, T(`icon-size-${size}`)),
    });
    const [small, medium] = [await of('small'), await of('medium')];
    expect([small.height, medium.height]).toEqual([32, 48]);
    for (const [id, size] of [['primary', medium], ['tonal-no-track', medium], ['primary-small', small], ['tonal-small-no-track', small]] as const) {
      const [r, p, tabBox, text] = [await bounds(track(page, id)), await pill(page, id, 0), await bounds(tabAt(page, id, 0)), await bounds(label(page, id, 0))];
      expect([r.height, tabBox.height, p.height], id).toEqual([expect.closeTo(size.height, 1), expect.closeTo(size.height, 1), expect.closeTo(size.height - 2 * inset, 1)]);
      // TAB-14, TAB-16: the tab is its label and the size's padding; the indicator the label and the size's margin.
      expect(tabBox.width, id).toBeCloseTo(text.width + 2 * size.pad, 0);
      expect(p.width, id).toBeCloseTo(text.width + 2 * size.around, 0);
      // TAB-34: track.padding from the track's top, bottom and start.
      expect([p.y - r.y, r.y + r.height - (p.y + p.height), p.x - r.x], id).toEqual([expect.closeTo(inset, 1), expect.closeTo(inset, 1), expect.closeTo(inset, 1)]);
      // The content keeps the size's margin inside the indicator.
      expect((await bounds(content(page, id, 0))).height, id).toBeLessThanOrEqual(p.height + 0.5);
      expect(Number.parseFloat(await css(content(page, id, 0), 'padding-top')), id).toBeCloseTo(size.block, 1);
    }
    // The same label style, gap and track at both sizes.
    for (const property of ['font-size', 'line-height', 'font-weight', 'letter-spacing']) expect(await css(label(page, 'primary-small', 0), property), property).toBe(await css(label(page, 'primary', 0), property));
    expect(await css(track(page, 'primary-small'), 'background-color')).toBe(await css(track(page, 'primary'), 'background-color'));
    // TAB-18: at small no variant stacks — the icon stands before the label, and the row stays 32.
    for (const id of ['primary-small-icons', 'secondary-small-icons']) {
      const [i, l] = [await bounds(icon(page, id, 0)), await bounds(label(page, id, 0))];
      expect(i.x + i.width, id).toBeLessThanOrEqual(l.x + 0.5);
      expect([i.width, i.height], id).toEqual([expect.closeTo(small.glyph, 1), expect.closeTo(small.glyph, 1)]);
      expect((await bounds(track(page, id))).height, id).toBeCloseTo(small.height, 1);
      expect(await css(content(page, id, 0), 'flex-direction'), id).toBe('row');
    }
    expect(await css(content(page, 'primary-icons', 0), 'flex-direction')).toBe('column');
    expect((await bounds(icon(page, 'primary-icons', 0))).width).toBeCloseTo(medium.glyph, 1);
    // TAB-35, TAB-14: an icon-only tab of a small row is a circle as tall as its indicator, the small glyph at its centre.
    const circle = await pill(page, 'primary-small-icon-only', 0);
    expect([circle.width, circle.height]).toEqual([expect.closeTo(small.height - 2 * inset, 1), expect.closeTo(small.height - 2 * inset, 1)]);
    const glyph = await bounds(icon(page, 'primary-small-icon-only', 0));
    expect([glyph.width, glyph.x + glyph.width / 2]).toEqual([expect.closeTo(small.glyph, 1), expect.closeTo(circle.x + circle.width / 2, 0)]);
    // A row that fills shares its width at the small size too.
    const shares = await Promise.all([0, 1, 2].map(async (n) => (await bounds(tabAt(page, 'primary-small-fill', n))).width));
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(0.5);
    // TAB-7: a size the system does not have is drawn as medium, and reported.
    expect((await bounds(track(page, 'odd-size'))).height).toBeCloseTo(medium.height, 1);
    await expect.poll(() => seen.filter((w) => w.includes('TAB-7')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/size "huge" is not a value of the active design system; it is drawn as "medium" \(TAB-7\)/);
    // Changing size changes neither the selection nor the focus.
    await tabAt(page, 'primary', 0).focus();
    await page.keyboard.press('ArrowRight');
    await row(page, 'primary').evaluate((el: any) => (el.size = 'small'));
    await expect.poll(async () => (await bounds(track(page, 'primary'))).height).toBeCloseTo(small.height, 1);
    expect([await selectedValue(page, 'primary'), await focused(page)]).toEqual(['activity', 'activity']);
    await expect.poll(async () => (await pill(page, 'primary', 1)).height).toBeCloseTo(small.height - 2 * inset, 1);
  });

  test('TAB-44: at 200 % text in a stage 320 wide a small row grows taller, keeps every label whole and scrolls its tabs inside itself, and the stage does not scroll sideways', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('tonal-small-no-track-long-labels') });
    const id = 'tonal-small-no-track-long-labels';
    const stage = page.locator(`[data-fixture="${id}"]`);
    const before = (await bounds(track(page, id))).height;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await stage.evaluate((el) => {
      el.style.cssText += ';box-sizing:border-box;inline-size:320px;overflow-x:auto';
      (el.querySelector('tanrei-tabs') as HTMLElement).style.inlineSize = 'auto';
    });
    await expect.poll(async () => (await bounds(track(page, id))).height).toBeGreaterThan(before + 4);
    for (let n = 0; n < (await tabs(page, id).count()); n++) expect(await truncated(label(page, id, n)), `${n}`).toBe(false);
    expect(await track(page, id).evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await stage.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('TAB-5: a small row answers a press just above and just below it, in line with a tab, without being taller; a control under the row keeps its own press, and so does a press that selects text', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('primary-small', 'tonal-small-no-track', 'primary') });
    await wire(page);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const id of ['primary-small', 'tonal-small-no-track']) {
      const stage = page.locator(`[data-fixture="${id}"]`);
      // Room around the row, and a Button directly under it.
      await stage.evaluate((el) => {
        el.style.paddingBlock = '24px';
        el.insertAdjacentHTML('beforeend', '<div><tanrei-button id="under" label="Under"></tanrei-button><p id="words" style="margin:0">Words under the row</p></div>');
        (el.querySelector('#under') as HTMLElement).addEventListener('click', () => ((window as any).pressedUnder = ((window as any).pressedUnder ?? 0) + 1));
      });
      const r = await bounds(track(page, id));
      expect(r.height).toBeCloseTo(32, 1);
      const reach = (pointer - r.height) / 2;
      expect(reach).toBeGreaterThanOrEqual(5);
      const x = (n: number) => centreX(page, id, n);
      // 5 above the top edge, in line with Activity.
      await page.mouse.click(await x(1), r.y - 5);
      expect(await selectedValue(page, id), id).toBe('activity');
      // 5 below the bottom edge, in line with Settings — if nothing that answers a press is there.
      await stage.evaluate((el) => ((el.querySelector('#under')!.parentElement as HTMLElement).style.marginBlockStart = '12px'));
      await page.mouse.click(await x(2), r.y + r.height + 5);
      expect(await selectedValue(page, id), id).toBe('settings');
      // Beyond the reach: nothing.
      await page.mouse.click(await x(0), r.y - reach - 3);
      expect(await selectedValue(page, id), id).toBe('settings');
      // Beside the row, at its height: nothing either.
      await page.mouse.click(r.x + r.width + 20, r.y - 3);
      expect(await selectedValue(page, id), id).toBe('settings');
      // The Button directly under the row: a press on its top edge, within the row's reach, is the Button's.
      await stage.evaluate((el) => ((el.querySelector('#under')!.parentElement as HTMLElement).style.marginBlockStart = '0'));
      const under = await bounds(stage.locator('#under'));
      expect(under.y - (r.y + r.height)).toBeLessThan(reach);
      await page.evaluate(() => ((window as any).pressedUnder = 0));
      const onButton = under.x + under.width / 2;
      const inLine = await Promise.all([0, 1, 2].map(async (n) => bounds(tabAt(page, id, n))));
      expect(inLine.some((each) => onButton >= each.x && onButton < each.x + each.width), 'the Button stands in line with a tab').toBe(true);
      await page.mouse.click(onButton, under.y + 2);
      expect([await page.evaluate(() => (window as any).pressedUnder), await selectedValue(page, id)], id).toEqual([1, 'settings']);
      // A press that ends a selection of text within the row's reach is the text's.
      const words = await bounds(stage.locator('#words'));
      await page.mouse.move(words.x + 60, words.y + words.height / 2);
      await page.mouse.down();
      await page.mouse.move(words.x + 30, words.y + words.height / 2, { steps: 3 });
      await page.mouse.move(under.x + under.width + 30, r.y + r.height + 3, { steps: 3 });
      expect(await page.evaluate(() => getSelection()!.isCollapsed)).toBe(false);
      await page.mouse.up();
      expect(await selectedValue(page, id), id).toBe('settings');
      await page.evaluate(() => getSelection()!.removeAllRanges());
      // Each selection was heard once, from the row, as a press on the tab is.
      expect((await log(page)).filter((entry) => entry.endsWith(entry.split(':')[0]))).toEqual(await log(page));
    }
    expect(await log(page)).toEqual(['activity:activity', 'settings:settings', 'activity:activity', 'settings:settings']);
    // TAB-34: a small row of circles — the end tabs end at the track's edge, and a press just beyond it is theirs.
    await mountFixtures(page, spec, { icons: true, fixtures: only('primary-small-icon-only') });
    const circles = 'primary-small-icon-only';
    const [edge, firstTab, lastTab, firstSeat] = [await bounds(track(page, circles)), await bounds(tabAt(page, circles, 0)), await bounds(tabAt(page, circles, 2)), await seat(page, circles, 0)];
    expect([firstTab.x, lastTab.x + lastTab.width]).toEqual([expect.closeTo(edge.x, 1), expect.closeTo(edge.x + edge.width, 1)]);
    expect(firstTab.width).toBeLessThan(pointer - 1);
    expect(firstSeat.x - edge.x).toBeCloseTo(await resolveToken(page, T('track-padding')), 1);
    const lacks = pointer - lastTab.width;
    await page.mouse.click(edge.x + edge.width + lacks - 1, edge.y + edge.height / 2);
    expect(await selectedValue(page, circles)).toBe('settings');
    await page.mouse.click(edge.x - lacks + 1, edge.y - 3);
    expect(await selectedValue(page, circles)).toBe('overview');
    await page.mouse.click(edge.x + edge.width + lacks + 3, edge.y + edge.height / 2);
    expect(await selectedValue(page, circles)).toBe('overview');
    await mountFixtures(page, spec, { fixtures: only('primary') });
    // A medium row is as tall as the target for touch: nothing beside it is its.
    const m = await bounds(track(page, 'primary'));
    await page.mouse.click(await centreX(page, 'primary', 1), m.y - 3);
    expect(await selectedValue(page, 'primary')).toBe('overview');
  });

  test('TAB-49, TAB-27: a row with and without its track has the same boxes — only the fill differs; null takes the system’s choice, true and false their own, and a change is drawn at once', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: only('primary', 'primary-no-track', 'secondary', 'secondary-no-track', 'tonal', 'tonal-no-track', 'primary-small', 'primary-small-no-track', 'secondary-small', 'secondary-small-no-track', 'tonal-small', 'tonal-small-no-track', 'tonal-track-on'),
    });
    const boxes = async (id: string) => {
      const origin = await bounds(row(page, id));
      const rel = (b: { x: number; y: number; width: number; height: number }) => [b.x - origin.x, b.y - origin.y, b.width, b.height].map((v) => Math.round(v * 100) / 100);
      const out = [rel(await bounds(track(page, id))), [origin.width, origin.height]];
      for (const n of [0, 1, 2]) out.push(rel(await bounds(tabAt(page, id, n))), rel(await seat(page, id, n)), rel(await bounds(ring(page, id, n))));
      const p = await pill(page, id, 0);
      out.push(rel(p), [p.radius]);
      return out;
    };
    for (const [variant, size] of [['primary', ''], ['secondary', ''], ['tonal', ''], ['primary', '-small'], ['secondary', '-small'], ['tonal', '-small']]) {
      const [on, off] = [`${variant}${size}`, `${variant}${size}-no-track`];
      expect(await boxes(off), off).toEqual(await boxes(on));
      expect(await css(track(page, on), 'background-color'), on).toBe(await resolveColor(page, T(`${variant}-track-color`)));
      expect(rgba(await css(track(page, off), 'background-color'))[3], off).toBe(0);
      // The clip and the corners stay; every color of the variant too.
      for (const property of ['border-top-left-radius', 'overflow-x', 'padding-left']) expect(await css(track(page, off), property), `${off} ${property}`).toBe(await css(track(page, on), property));
      expect(await drawn(page, off, 0), off).toEqual(await drawn(page, on, 0));
      expect(await drawn(page, off, 1), off).toEqual(await drawn(page, on, 1));
      expect(await track(page, off).getAttribute('aria-hidden')).toBe(await track(page, on).getAttribute('aria-hidden'));
    }
    // The attribute forms: absent is null, bare is true, ="false" is false.
    expect(await Promise.all(['tonal', 'tonal-track-on', 'tonal-no-track'].map((id) => row(page, id).evaluate((el: any) => [el.track, el.getAttribute('track')])))).toEqual([[null, null], [true, ''], [false, 'false']]);
    // A system whose answer is off: null has no track, true still has one.
    await override(page, { [T('track-visible')]: 'off' });
    await expect.poll(async () => rgba(await css(track(page, 'tonal'), 'background-color'))[3]).toBe(0);
    expect(await css(track(page, 'tonal-track-on'), 'background-color')).toBe(await resolveColor(page, T('tonal-track-color')));
    // An unknown name is the first value: off.
    await override(page, { [T('track-visible')]: 'sometimes' });
    expect(rgba(await css(track(page, 'tonal'), 'background-color'))[3]).toBe(0);
    await override(page, { [T('track-visible')]: '' });
    await expect.poll(() => css(track(page, 'tonal'), 'background-color')).toBe(await resolveColor(page, T('tonal-track-color')));
    // Turning it off is drawn at once and changes neither the selection nor the focus, and emits nothing.
    await wire(page);
    await tabAt(page, 'primary', 0).focus();
    const before = await boxes('primary');
    await row(page, 'primary').evaluate(async (el: any) => {
      el.track = false;
      await el.updateComplete;
    });
    expect(rgba(await css(track(page, 'primary'), 'background-color'))[3]).toBe(0);
    expect(await css(track(page, 'primary'), 'transition-property')).not.toContain('background');
    expect([await boxes('primary'), await selectedValue(page, 'primary'), await focused(page), await log(page)]).toEqual([before, 'overview', 'overview', []]);
  });

  test('TAB-49: where style queries are missing the track’s choice and the transition’s (TAB-43) are read from the cascade when the row is drawn and when a selection is made', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('tonal', 'tonal-no-track', 'tonal-track-on', 'tonal-no-transition', 'primary'), reducedMotion: false });
    const queries = await page.evaluate(() => CSS.supports('container-name: a') && (() => { try { return !!new CSSStyleSheet().insertRule('@container style(--a: b) { i { color: red } }') || true; } catch { return false; } })());
    const marks = (id: string) => row(page, id).evaluate((el) => { const r = el.shadowRoot!.querySelector('.row') as HTMLElement; return [r.dataset.track ?? null, r.dataset.transition ?? null]; });
    expect(rgba(await css(track(page, 'tonal-no-track'), 'background-color'))[3]).toBe(0);
    expect(await css(track(page, 'tonal'), 'background-color')).toBe(await resolveColor(page, T('tonal-track-color')));
    expect(await css(track(page, 'tonal-no-transition'), 'animation-duration')).toBe('0s');
    expect(Number.parseFloat(await css(track(page, 'primary'), 'animation-duration'))).toBeGreaterThan(0);
    const written = await marks('tonal-no-track');
    // Where the browser answers the queries nothing is written; where it does not, the names are.
    if (written[0] === null) expect([await marks('tonal'), await marks('tonal-no-transition')]).toEqual([[null, null], [null, null]]);
    else expect([written, await marks('tonal'), await marks('tonal-no-transition'), queries !== undefined]).toEqual([['off', 'slide'], ['on', 'slide'], ['on', 'none'], true]);
    // The system's answer changes; the next selection is drawn as it says.
    await override(page, { [T('motion-transition')]: 'none', [T('motion-indicator-duration')]: '60s' });
    const frame = await firstFrame(page, 'primary', 'row.querySelectorAll("tanrei-tab")[2].click()');
    expect([frame.row, frame.tabs.map((each) => each.covered)]).toEqual([[], [false, false, true]]);
  });

  test('TAB-43, TAB-15, TAB-17, TAB-23: under none a new selection is whole in its first frame — the indicator on the new tab, both labels in their final colors, the tab in view, nothing running — whatever made it; hover still fades; an unknown value is auto', async ({ page }) => {
    const seen = warnings(page);
    const long = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'].map((v) => t(v, `${v[0].toUpperCase()}${v.slice(1)} tab`));
    await mountFixtures(page, spec, { fixtures: [...only('tonal-no-transition', 'primary-no-transition', 'primary-slide', 'primary'), fixture('far', long, { selected: 'alpha', transition: 'none' })], reducedMotion: false });
    await override(page, { [T('motion-indicator-duration')]: '60s', [T('motion-state-duration')]: '60s', [T('tonal-selected-label-color')]: 'rgb(255, 0, 0)', [T('primary-selected-label-color')]: 'rgb(255, 0, 0)' });
    await wire(page);
    const plain = { tonal: await resolveColor(page, T('tonal-label-color')), primary: await resolveColor(page, T('primary-label-color')) };
    // A press, a key, the product: each is whole in the frame after it.
    for (const [id, variant, act, to] of [
      ['tonal-no-transition', 'tonal', 'row.querySelectorAll("tanrei-tab")[1].click()', 1],
      ['tonal-no-transition', 'tonal', 'row.value = "settings"', 2],
      ['primary-no-transition', 'primary', 'row.querySelectorAll("tanrei-tab")[0].focus(); row.querySelectorAll("tanrei-tab")[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))', 1],
    ] as const) {
      const frame = await firstFrame(page, id, act);
      expect(frame.row, `${id} ${act}`).toEqual([]);
      expect(frame.tabs.map((each) => each.moving), `${id} ${act}`).toEqual([0, 0, 0]);
      expect(frame.tabs.map((each) => each.covered), `${id} ${act}`).toEqual([0, 1, 2].map((n) => n === to));
      expect(frame.tabs.map((each) => each.label), `${id} ${act}`).toEqual([0, 1, 2].map((n) => (n === to ? 'rgb(255, 0, 0)' : plain[variant])));
      // At its full size: the tab's own container.
      const [p, s] = [await pill(page, id, to), await seat(page, id, to)];
      expect([p.x, p.width, p.height], id).toEqual([expect.closeTo(s.x, 0), expect.closeTo(s.width, 0), expect.closeTo(s.height, 0)]);
    }
    expect(await log(page)).toEqual(['activity:activity', 'activity:activity']);
    // TAB-15: a tab out of view is in view in that frame, with no reveal running.
    const scroller = track(page, 'far');
    const end = await firstFrame(page, 'far', 'row.value = "hotel"');
    expect(end.row).toEqual([]);
    const [s, last] = [await bounds(scroller), await bounds(tabAt(page, 'far', 7))];
    expect(last.x + last.width).toBeLessThanOrEqual(s.x + s.width + 1);
    // Hover is answered as under slide: the state layer fades in over the state motion.
    await page.waitForTimeout(100);
    await box(page, 'tonal-no-transition', 0).hover();
    expect(Number.parseFloat(await css(layer(page, 'tonal-no-transition', 0), 'transition-duration'))).toBe(60);
    await expect.poll(() => tabAt(page, 'tonal-no-transition', 0).evaluate((el) => el.shadowRoot!.getAnimations().filter((a) => (a as CSSTransition).transitionProperty === 'background-color').length)).toBeGreaterThan(0);
    expect(await css(layer(page, 'tonal-no-transition', 0), 'background-color')).not.toBe(await resolveColor(page, T('tonal-hovered-container-color')));
    await page.mouse.move(0, 0);
    // A system whose answer is none: `primary` (auto) does not slide, `primary-slide` does.
    await override(page, { [T('motion-transition')]: 'none' });
    const auto = await firstFrame(page, 'primary', 'row.querySelectorAll("tanrei-tab")[2].click()');
    expect([auto.row, auto.tabs.map((each) => each.covered)]).toEqual([[], [false, false, true]]);
    await box(page, 'primary-slide', 2).click();
    await expect.poll(() => slides(page, 'primary-slide')).toBe(1);
    // A slide that is running when the row's transition becomes none ends on its tab at once.
    await row(page, 'primary-slide').evaluate(async (el: any) => {
      el.transition = 'none';
      await el.updateComplete;
    });
    expect(await slides(page, 'primary-slide')).toBe(0);
    const landed = [await pill(page, 'primary-slide', 2), await seat(page, 'primary-slide', 2)];
    expect(landed[0].x).toBeCloseTo(landed[1].x, 0);
    expect(await selectedValue(page, 'primary-slide')).toBe('settings');
    // An unknown name of the system's is the first value, slide; an unknown value of the prop is auto, and reported.
    await override(page, { [T('motion-transition')]: 'wobble' });
    await row(page, 'primary').evaluate(async (el: any) => {
      el.transition = 'sideways';
      await el.updateComplete;
    });
    await box(page, 'primary', 0).click();
    await expect.poll(() => slides(page, 'primary')).toBe(1);
    await finishSlide(page, 'primary');
    await expect.poll(() => seen.filter((w) => w.includes('TAB-43')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/transition "sideways" is not a transition of the tabs; it is taken as "auto" \(TAB-43\)/);
    // Where motion is reduced a selection is drawn as none does, whatever transition names.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await override(page, { [T('motion-transition')]: '' });
    const reduced = await firstFrame(page, 'primary-slide', 'row.transition = "slide"; row.value = "overview"');
    expect([reduced.row, reduced.tabs.map((each) => each.covered)]).toEqual([[], [true, false, false]]);
  });

  test('TAB-43, TAB-26, TAB-28: under none a drag is still taken and carries the indicator in every frame, without a catch-up, and lands on its tab at once on release or cancel; indicatorOffset still places it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('tonal-no-transition'), reducedMotion: false });
    const id = 'tonal-no-transition';
    await override(page, { [T('motion-indicator-duration')]: '60s', [T('motion-state-duration')]: '60s' });
    await wire(page);
    const seats = await Promise.all([0, 1, 2].map((n) => seat(page, id, n)));
    const [c0, c2, meet] = [await centreX(page, id, 0), await centreX(page, id, 2), await meetX(page, id, 0, 1)];
    await drag(page, id, 0, glide(c0, meet), { up: null });
    expect(await dragging(page, id)).toBe(true);
    // No catch-up: the indicator is where the pointer is in this frame.
    expect(await row(page, id).locator('.tabs').evaluate((el) => el.getAnimations().length)).toBe(0);
    const half = await pill(page, id, 0);
    expect([half.x, half.width]).toEqual([expect.closeTo((seats[0].x + seats[1].x) / 2, 0), expect.closeTo((seats[0].width + seats[1].width) / 2, 0)]);
    await pointer(page, id, 'pointermove', c2, 16);
    expect((await pill(page, id, 2)).x).toBeCloseTo(seats[2].x, 0);
    // The release selects Settings; the next frame has the indicator on it, with nothing running.
    await pointer(page, id, 'pointerup', c2);
    await frames(page, 1);
    expect([await selectedValue(page, id), await slides(page, id), await log(page)]).toEqual(['settings', 0, ['settings:settings']]);
    expect((await pill(page, id, 2)).x).toBeCloseTo(seats[2].x, 0);
    // A cancelled drag is back on its tab at once.
    await drag(page, id, 2, glide(c2, c0), { up: null });
    expect(await dragging(page, id)).toBe(true);
    await pointer(page, id, 'pointercancel');
    await frames(page, 1);
    expect([await selectedValue(page, id), await slides(page, id)]).toEqual(['settings', 0]);
    expect((await pill(page, id, 2)).x).toBeCloseTo(seats[2].x, 0);
    // TAB-26: an offset is drawn in the frame it is set.
    await row(page, id).evaluate((el: any) => (el.indicatorOffset = -0.5));
    const between = await pill(page, id, 1);
    expect(between.x).toBeCloseTo((seats[2].x + seats[1].x) / 2, 0);
    await row(page, id).evaluate((el: any) => (el.indicatorOffset = 0));
  });

  test('TAB-42, TAB-12, TAB-13: a row without panels is a tab list named by its label whose tabs control nothing; the arrows select and emit, and Tab leaves the row to what follows it', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: only('tonal-small-no-track-no-transition') });
    const id = 'tonal-small-no-track-no-transition';
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.insertAdjacentHTML('beforeend', '<button id="after">After</button>'));
    await wire(page);
    const said = await row(page, id).evaluate((el) => ({
      list: [el.shadowRoot!.querySelector('[role="tablist"]')!.getAttribute('aria-label'), el.shadowRoot!.querySelectorAll('[role="tablist"]').length],
      tabs: [...el.querySelectorAll('tanrei-tab')].map((tab) => ['role', 'aria-selected', 'aria-label', 'aria-posinset', 'aria-setsize', 'aria-controls'].map((name) => tab.getAttribute(name))),
      panels: document.querySelectorAll('[role="tabpanel"]').length + el.shadowRoot!.querySelectorAll('[role="tabpanel"]').length,
    }));
    expect(said).toEqual({
      list: ['Contrast', 1],
      tabs: [
        ['tab', 'true', 'Standard', '1', '3', null],
        ['tab', 'false', 'Medium', '2', '3', null],
        ['tab', 'false', 'High', '3', '3', null],
      ],
      panels: 0,
    });
    if (browserName === 'chromium') {
      const { axTree } = await import('../../../test/ax-tree.js');
      const tree = await axTree(page, `[data-fixture="${id}"] tanrei-tabs`);
      expect(tree.filter((line) => /^\s*tablist "Contrast"/.test(line)).length).toBe(1);
      expect(tree.filter((line) => /^\s*tab "/.test(line)).map((line) => line.trim().split(' focusable')[0])).toEqual(['tab "Standard"', 'tab "Medium"', 'tab "High"']);
      expect(tree.some((line) => /tabpanel/.test(line))).toBe(false);
    }
    await tabTo(page, tabAt(page, id, 0));
    await page.keyboard.press('ArrowRight');
    expect([await selectedValue(page, id), await focused(page), await log(page)]).toEqual(['medium', 'medium', ['medium:medium']]);
    expect(await tabAt(page, id, 1).getAttribute('aria-selected')).toBe('true');
    await tab(page);
    expect(await focused(page)).toBe('after');
    // A row with a panel for some tabs only: each tab that has one controls it, and none is shown for a tab without.
    await mountFixtures(page, spec, { fixtures: [fixture('some', THREE, { selected: 'overview' }, panels(['activity']))] });
    expect(await Promise.all([0, 1, 2].map((n) => tabAt(page, 'some', n).getAttribute('aria-controls')))).toEqual([null, await panel(page, 'some', 'activity').getAttribute('id'), null]);
    expect(await panel(page, 'some', 'activity').evaluate((el) => el.hasAttribute('hidden'))).toBe(true);
  });

  test('TAB-45: with forced colors the indicator is a filled highlight with highlighted-text content in every variant, with or without the track; the other labels are the text color and a disabled tab’s the disabled one', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { fixtures: only('primary', 'secondary', 'tonal', 'tonal-small-no-track', 'tonal-no-track-disabled', 'tonal-no-track-selected-disabled') });
    if (!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches))) {
      await page.emulateMedia({ forcedColors: 'none' });
      return; // An engine whose forced colors cannot be emulated here.
    }
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.cssText = `color: ${keyword}; forced-color-adjust: none`;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, name);
    const [highlight, highlightText, canvasText, gray] = [rgba(await system('Highlight')), rgba(await system('HighlightText')), rgba(await system('CanvasText')), rgba(await system('GrayText'))];
    const forces = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.append(probe);
      const forced = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return forced;
    });
    for (const id of ['primary', 'secondary', 'tonal', 'tonal-small-no-track', 'tonal-no-track-disabled']) {
      // Filled and opaque, whatever the variant's own indicator is.
      expect(rgba(await css(cover(page, id, 0), 'background-color')), id).toEqual(highlight);
      expect(rgba(await css(cover(page, id, 0), 'background-color'))[3], id).not.toBe(0.16);
      expect(rgba(await css(tabAt(page, id, 0).locator('.cover .label'), 'color')), id).toEqual(highlightText);
      expect(within(await bounds(label(page, id, 0)), await pill(page, id, 0)), id).toBe(true);
      // Every other label is the platform's text color — where the engine itself forces colors (one that only answers
      // the media query leaves what the stylesheet does not name).
      if (forces) expect(rgba(await css(label(page, id, 1), 'color')), id).toEqual(canvasText);
    }
    expect(rgba(await css(label(page, 'tonal-no-track-disabled', 2), 'color'))).toEqual(gray);
    // A disabled selected tab's indicator is the disabled color too.
    expect(rgba(await css(cover(page, 'tonal-no-track-selected-disabled', 2), 'background-color'))).toEqual(gray);
    // A focused tab shows a ring.
    await tabTo(page, tabAt(page, 'tonal-small-no-track', 0));
    const focusRing = ring(page, 'tonal-small-no-track', 0);
    expect([await css(focusRing, 'outline-style'), Number.parseFloat(await css(focusRing, 'outline-width'))]).toEqual(['solid', expect.any(Number)]);
    expect(Number.parseFloat(await css(focusRing, 'outline-width'))).toBeGreaterThan(0);
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('TAB-14, TAB-21: the new rows that hug and scroll keep every label whole on one line, and a right-to-left row starts at its right edge at each size, with and without the track', async ({ page }) => {
    const ids = ['primary-long-labels', 'tonal-long-labels', 'tonal-no-track-long-labels', 'primary-small-long-labels', 'tonal-small-no-track-long-labels', 'primary-rtl', 'secondary-rtl', 'tonal-rtl', 'tonal-no-track-rtl', 'primary-small-rtl', 'tonal-small-no-track-rtl', 'tonal-small-no-track-icons-rtl', 'tonal-small-no-track-long-labels-rtl', 'secondary-icons', 'secondary-icons-fill'];
    await mountFixtures(page, spec, { icons: true, fixtures: only(...ids) });
    for (const id of ids) {
      const f = spec.fixtures.find((each) => each.id === id)!;
      const fill = f.props.fullWidth === true;
      for (let n = 0; n < f.items!.length; n++) {
        if (!(await label(page, id, n).count())) continue;
        // One line, never broken within a word: a label that does not fit a shared tab is cut with an ellipsis instead.
        const text = await label(page, id, n).evaluate((label) => {
          // The label's text is cut in its `.text`.
          const el = label.querySelector(':scope > .text') ?? label;
          return { lines: Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)), wrap: getComputedStyle(el).whiteSpace, overflow: getComputedStyle(el).textOverflow };
        });
        expect(text, `${id} ${n}`).toEqual({ lines: 1, wrap: 'nowrap', overflow: 'ellipsis' });
        if (!fill) expect(await truncated(label(page, id, n)), `${id} ${n}`).toBe(false);
      }
      if (f.direction === 'rtl') {
        const [r, first, second] = [await bounds(track(page, id)), await bounds(tabAt(page, id, 0)), await bounds(tabAt(page, id, 1))];
        expect(first.x, id).toBeGreaterThan(second.x);
        expect(r.x + r.width - (first.x + first.width), id).toBeLessThanOrEqual((await resolveToken(page, T('track-padding'))) + 0.5);
      }
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, with panels', async ({ page }) => {
    test.setTimeout(120_000); // every fixture of the spec is walked: 77 rows
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [...spec.fixtures, fixture('panels', THREE, { selected: 'activity' }, panels(['overview', 'activity', 'settings'], ['settings']))] });
      await page.waitForTimeout(400); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  // One fixture is mounted for its picture, drawn as on the page of all of them (`mountFixtureAsInAll`): that page is
  // mounted once for a worker, not once for each picture.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

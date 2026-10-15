// <tanrei-badge>, driven by specs/badge.spec.json: every behaviour id (BDG-1…14, BDG-16) is cited by a test title, every fixture
// has a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('badge');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-badge`);
/** The anchor: the badge's first slotted element. */
const anchor = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-badge > *`).first();
const container = (page: P, id: string) => host(page, id).locator('.container');
const label = (page: P, id: string) => host(page, id).locator('.label');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-badge-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props'], content = 'notifications'): Fixture => ({ id, props, content });
const COUNTS = ['count-single', 'count-double', 'count-overflow', 'count-custom-max'];

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('BDG-1: no count draws a dot of dot.size in container.color with no label, centered dot.offset inside the anchor’s top-end corner', async ({ page }) => {
    const [size, offset] = [await resolveToken(page, T('dot-size')), await resolveToken(page, T('dot-offset'))];
    const [dot, a] = [await box(container(page, 'dot')), await box(anchor(page, 'dot'))];
    expect([dot.width, dot.height]).toEqual([size, size]);
    expect(dot.x + dot.width / 2).toBeCloseTo(a.x + a.width - offset, 5);
    expect(dot.y + dot.height / 2).toBeCloseTo(a.y + offset, 5);
    expect(await css(container(page, 'dot'), 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(Number.parseFloat(await css(container(page, 'dot'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(size / 2);
    await expect(label(page, 'dot')).toHaveCount(0);
    // A circle whatever corners the container has: square the pill off and the dot stays round.
    await override(page, { [T('container-shape')]: 'var(--tanrei-sys-shape-corner-none)' });
    expect(await css(container(page, 'count-single'), 'border-top-left-radius')).toBe('0px');
    expect(await css(container(page, 'dot'), 'border-top-left-radius')).toBe('50%');
    expect(await host(page, 'dot').evaluate((el) => el.shadowRoot!.textContent!.trim())).toBe('');
  });

  test('BDG-2: a count draws a pill at least container.height high and as wide as high, padded, shaped and colored by its tokens, the label centered', async ({ page }) => {
    const height = await resolveToken(page, T('container-height'));
    const padding = await resolveToken(page, T('container-padding-inline'));
    for (const id of COUNTS) {
      const pill = await box(container(page, id));
      expect(pill.height, id).toBe(height);
      expect(pill.width, id).toBeGreaterThanOrEqual(pill.height);
      expect(await css(container(page, id), 'padding-inline-start'), id).toBe(`${padding}px`);
      expect(await css(container(page, id), 'padding-inline-end'), id).toBe(`${padding}px`);
      expect(await css(container(page, id), 'background-color'), id).toBe(await resolveColor(page, T('container-color')));
      // container.shape is the full step: round caps.
      expect(Number.parseFloat(await css(container(page, id), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(height / 2);
      expect(await css(label(page, id), 'color'), id).toBe(await resolveColor(page, T('label-color')));
      expect(Number.parseFloat(await css(label(page, id), 'font-size')), id).toBe(await resolveToken(page, T('label-typescale-font-size')));
      expect(await css(label(page, id), 'font-weight'), id).toBe(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), '--tanrei-sys-typescale-label-small-font-weight'));
      const text = await box(label(page, id));
      expect(text.x + text.width / 2, id).toBeCloseTo(pill.x + pill.width / 2, 0);
      expect(text.y + text.height / 2, id).toBeCloseTo(pill.y + pill.height / 2, 0);
    }
    // A single digit sits in a circle.
    const single = await box(container(page, 'count-single'));
    expect(single.width).toBe(single.height);
  });

  test('BDG-3: the pill’s leading circle — a square of its drawn height — is centered container.offset inside the anchor’s top-end corner; a longer count grows toward the end', async ({ page }) => {
    const offset = await resolveToken(page, T('container-offset'));
    let previous = 0;
    for (const id of ['count-single', 'count-double', 'count-overflow']) {
      const [pill, a] = [await box(container(page, id)), await box(anchor(page, id))];
      expect(pill.x + pill.height / 2, id).toBeCloseTo(a.x + a.width - offset, 5);
      expect(pill.y + pill.height / 2, id).toBeCloseTo(a.y + offset, 5);
      expect(pill.width, id).toBeGreaterThan(previous);
      previous = pill.width;
    }
    // Moved by the token: a larger offset moves the circle inward on both axes.
    await override(page, { [T('container-offset')]: '4px' });
    const [pill, a] = [await box(container(page, 'count-single')), await box(anchor(page, 'count-single'))];
    expect([pill.x + pill.height / 2, pill.y + pill.height / 2]).toEqual([a.x + a.width - 4, a.y + 4]);
  });

  test('BDG-4: a count above max shows max followed by a plus sign; otherwise the count in full', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('at-max', { count: 999 }), fixture('at-custom-max', { count: 99, max: 99 })] });
    expect(await label(page, 'count-single').textContent()).toBe('3');
    expect(await label(page, 'count-double').textContent()).toBe('42');
    expect(await label(page, 'count-overflow').textContent()).toBe('999+');
    expect(await label(page, 'count-custom-max').textContent()).toBe('99+');
    expect(await label(page, 'at-max').textContent()).toBe('999');
    expect(await label(page, 'at-custom-max').textContent()).toBe('99');
  });

  test('BDG-5: a count of 0 draws nothing and exposes nothing; the anchor renders and is announced as without a badge', async ({ page }) => {
    await expect(container(page, 'count-zero')).toBeHidden();
    await expect(anchor(page, 'count-zero')).not.toHaveAttribute('aria-description');
    await expect(anchor(page, 'count-zero')).toHaveAccessibleDescription('');
    // The tree is the anchor's alone.
    expect(await stage(page, 'count-zero').ariaSnapshot()).toBe(await anchor(page, 'count-zero').ariaSnapshot());
    const [zero, single] = [await box(anchor(page, 'count-zero')), await box(anchor(page, 'count-single'))];
    expect([zero.width, zero.height]).toEqual([single.width, single.height]);
    // Going to 0 and back.
    await host(page, 'count-single').evaluate((el) => ((el as any).count = 0));
    await expect(container(page, 'count-single')).toBeHidden();
    await expect(anchor(page, 'count-single')).not.toHaveAttribute('aria-description');
    await host(page, 'count-single').evaluate((el) => ((el as any).count = 5));
    await expect(container(page, 'count-single')).toBeVisible();
    await expect(anchor(page, 'count-single')).toHaveAttribute('aria-description', '3 unread');
  });

  test('BDG-6: outline.width of outline.color is drawn outside the dot and the pill, without changing their size or position', async ({ page }) => {
    const width = await resolveToken(page, T('outline-width'));
    const color = await resolveColor(page, T('outline-color'));
    for (const id of ['dot', 'count-double']) {
      expect(await css(container(page, id), 'box-shadow'), id).toBe(`${color} 0px 0px 0px ${width}px`);
      const before = await box(container(page, id));
      await override(page, { [T('outline-width')]: '10px' });
      expect(await box(container(page, id)), id).toEqual(before);
      await override(page, { [T('outline-width')]: `var(--tanrei-sys-border-thick)` });
    }
  });

  test('BDG-7: the badge takes no space, never moves or resizes its anchor, and input over it reaches the anchor', async ({ page }) => {
    // Beside a bare anchor in a row, and across every form: the anchor is where and as large as it is without a badge.
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: spec.fixtures.map((f) => ({ ...f, content: `<span class="tanrei-icon" data-size="medium" role="img" aria-label="Notifications">notifications</span>` })),
    });
    await page.addStyleTag({ content: '.stage { display: flex; align-items: center; gap: 8px; }' });
    await page.evaluate(() => {
      for (const s of document.querySelectorAll('.stage')) s.insertAdjacentHTML('beforeend', '<span class="bare tanrei-icon" data-size="medium" role="img" aria-label="Bare">notifications</span>');
    });
    for (const f of spec.fixtures) {
      const [a, bare, own] = [await box(anchor(page, f.id)), await box(stage(page, f.id).locator('.bare')), await box(host(page, f.id))];
      expect([a.width, a.height, a.y], f.id).toEqual([bare.width, bare.height, bare.y]);
      expect(own, f.id).toEqual(a);
    }
    // Pointer: a click on the part of the pill that overlaps the anchor is the anchor's.
    const [pill, a] = [await box(container(page, 'count-single')), await box(anchor(page, 'count-single'))];
    const [x, y] = [(pill.x + a.x + a.width) / 2, (pill.y + pill.height + a.y) / 2];
    expect(x).toBeGreaterThan(pill.x);
    expect(y).toBeLessThan(pill.y + pill.height);
    const clicked = page.evaluate(() => new Promise<string>((resolve) => document.addEventListener('click', (event) => resolve((event.target as Element).getAttribute('aria-label') ?? ''), { once: true })));
    await page.mouse.click(x, y);
    expect(await clicked).toBe('Notifications');
    expect(await css(host(page, 'count-single').locator('.corner'), 'pointer-events')).toBe('none');
  });

  test('BDG-7: keyboard focus reaches the anchor; the badge itself is never focusable', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('button', { count: 3, label: '3 unread' }, '<tanrei-button variant="text" label="Inbox"><span slot="icon">inbox</span></tanrei-button>')] });
    const button = anchor(page, 'button');
    await tabTo(page, button);
    await expect(button.locator('button')).toBeFocused();
    expect(await host(page, 'button').evaluate((el) => el.shadowRoot!.querySelectorAll('[tabindex], button, a, input').length)).toBe(0);
  });

  test('BDG-8: the drawn dot and number are hidden; label is the anchor’s description, or the displayed text when label is empty', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, fixture('unlabelled', { count: 1200 }), fixture('button', { count: 3, label: '3 unread' }, '<tanrei-button variant="text" label="Inbox"><span slot="icon">inbox</span></tanrei-button>'), fixture('text-button', { count: 2 }, '<tanrei-button>Drafts</tanrei-button>')],
    });
    for (const f of spec.fixtures.filter((x) => x.props.count !== 0)) {
      await expect(anchor(page, f.id), f.id).toHaveAccessibleDescription(String(f.props.label));
      await expect(host(page, f.id).locator('.corner'), f.id).toHaveAttribute('aria-hidden', 'true');
      // The badge adds nothing of its own to the tree: only the anchor is there.
      expect(await stage(page, f.id).ariaSnapshot(), f.id).toBe(await anchor(page, f.id).ariaSnapshot());
    }
    await expect(anchor(page, 'unlabelled')).toHaveAccessibleDescription('999+');
    // An anchor that is a Tanrei component passes the description on to its native element.
    await expect(page.getByRole('button', { name: 'Inbox' })).toHaveAccessibleDescription('3 unread');
    await expect(page.getByRole('button', { name: 'Drafts' })).toHaveAccessibleDescription('2');
    // …and follows it: a count of 0 takes the description away from the native button too.
    await host(page, 'text-button').evaluate((el) => ((el as any).count = 0));
    await expect(page.getByRole('button', { name: 'Drafts' })).toHaveAccessibleDescription('');
  });

  test('BDG-9: a dot without a label still renders, and a debug build reports that it tells assistive technology nothing', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('bare-dot', {}), fixture('labelled-dot', { label: 'New' })] });
    await expect(container(page, 'bare-dot')).toBeVisible();
    await expect(anchor(page, 'bare-dot')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('BDG-9'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('BDG-9'))).toMatch(/<tanrei-badge>: the dot has no label/);
    await host(page, 'bare-dot').evaluate((el) => ((el as any).label = 'New messages'));
    await expect(anchor(page, 'bare-dot')).toHaveAttribute('aria-description', 'New messages');
    expect(seen.filter((w) => w.includes('BDG-9'))).toHaveLength(1);
  });

  test('BDG-10: a change of count or label updates the anchor’s description and announces nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('live', { count: 3 }), fixture('own', { count: 2 }, '<span role="img" aria-label="Mail" aria-description="Personal">mail</span>')] });
    const a = anchor(page, 'live');
    await expect(a).toHaveAttribute('aria-description', '3');
    await host(page, 'live').evaluate((el) => ((el as any).count = 4));
    await expect(a).toHaveAttribute('aria-description', '4');
    await host(page, 'live').evaluate((el) => ((el as any).label = '4 unread'));
    await expect(a).toHaveAttribute('aria-description', '4 unread');
    await host(page, 'live').evaluate((el) => el.setAttribute('count', '1500'));
    await expect(a).toHaveAttribute('aria-description', '4 unread');
    await host(page, 'live').evaluate((el) => ((el as any).label = ''));
    await expect(a).toHaveAttribute('aria-description', '999+');
    // Nothing that would announce: no live region, no status role, in the badge or around it.
    const live = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*'), ...[...document.querySelectorAll('tanrei-badge')].flatMap((b) => [...b.shadowRoot!.querySelectorAll('*')])];
      return all.filter((el) => el.hasAttribute('aria-live') || ['status', 'alert', 'log'].includes(el.getAttribute('role') ?? '')).length;
    });
    expect(live).toBe(0);
    // An anchor's own description is given back when the badge stops describing it, and a replaced anchor is released.
    await expect(anchor(page, 'own')).toHaveAttribute('aria-description', '2');
    await host(page, 'own').evaluate((el) => ((el as any).count = 0));
    await expect(anchor(page, 'own')).toHaveAttribute('aria-description', 'Personal');
    await host(page, 'live').evaluate((el) => {
      const old = el.firstElementChild!;
      old.id = 'old';
      el.insertAdjacentHTML('afterbegin', '<span id="new" role="img" aria-label="Chat">chat</span>');
      old.remove();
      document.body.append(old);
    });
    await expect(page.locator('#new')).toHaveAttribute('aria-description', '999+');
    await expect(page.locator('#old')).not.toHaveAttribute('aria-description');
  });

  test('BDG-11: in RTL the badge takes the top-left corner and grows to the left; a capped count keeps its plus sign after the digits', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [offset, dotOffset] = [await resolveToken(page, T('container-offset')), await resolveToken(page, T('dot-offset'))];
    const [dot, da] = [await box(container(page, 'dot')), await box(anchor(page, 'dot'))];
    expect(dot.x + dot.width / 2).toBeCloseTo(da.x + dotOffset, 5);
    expect(dot.y + dot.height / 2).toBeCloseTo(da.y + dotOffset, 5);
    for (const id of ['count-single', 'count-overflow']) {
      const [pill, a] = [await box(container(page, id)), await box(anchor(page, id))];
      expect(pill.x + pill.width - pill.height / 2, id).toBeCloseTo(a.x + offset, 5);
      expect(pill.y + pill.height / 2, id).toBeCloseTo(a.y + offset, 5);
    }
    // The plus sign is drawn to the right of the digits, as in LTR.
    const [plus, digits] = await label(page, 'count-overflow').evaluate((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('+'))!;
      const at = (from: number, to: number) => { const r = document.createRange(); r.setStart(node, from); r.setEnd(node, to); return r.getBoundingClientRect().x; };
      const i = node.textContent!.indexOf('+');
      return [at(i, i + 1), at(0, 1)];
    });
    expect(plus).toBeGreaterThan(digits);
    expect(await css(label(page, 'count-overflow'), 'unicode-bidi')).toBe('isolate');
  });

  test('BDG-12: count and max use the locale’s digits, no grouping separator, and tabular figures', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('grouped', { count: 1200, max: 5000 }), fixture('arabic', { count: 42 }), fixture('arabic-capped', { count: 1200, max: 99 })],
    });
    expect(await label(page, 'grouped').textContent()).toBe('1200');
    await page.locator('[data-fixture="arabic"], [data-fixture="arabic-capped"]').evaluateAll((els) => els.forEach((el) => el.setAttribute('lang', 'ar-EG')));
    // The locale is read when the text is drawn: redraw.
    for (const id of ['arabic', 'arabic-capped']) await host(page, id).evaluate((el) => (el as any).requestUpdate());
    await expect(label(page, 'arabic')).toHaveText('٤٢');
    await expect(label(page, 'arabic-capped')).toHaveText('٩٩+');
    expect(await css(label(page, 'grouped'), 'font-variant-numeric')).toBe('tabular-nums');
    // The description reads what is drawn.
    await expect(anchor(page, 'arabic')).toHaveAttribute('aria-description', '٤٢');
  });

  test('BDG-13: at 200% text size the pill grows with its label, keeps its leading circle’s placement, and the dot stays at dot.size', async ({ page }) => {
    const before = await box(container(page, 'count-double'));
    // The pill's leading circle follows its drawn height through a ResizeObserver, which delivers in the rendering
    // update after the layout that changed it — before that frame is painted, never within the task that changed the
    // text size. Measure what is drawn: in the frame after that rendering update, not in the same task.
    await page.evaluate(async () => {
      document.documentElement.style.fontSize = '200%';
      for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
    });
    const [height, offset] = [await resolveToken(page, T('container-height')), await resolveToken(page, T('container-offset'))];
    const [pill, a] = [await box(container(page, 'count-double')), await box(anchor(page, 'count-double'))];
    expect(pill.height).toBeGreaterThan(before.height);
    expect(pill.width).toBeGreaterThan(before.width);
    expect(pill.height).toBeGreaterThanOrEqual(height);
    expect(pill.x + pill.height / 2).toBeCloseTo(a.x + a.width - offset, 5);
    expect(pill.y + pill.height / 2).toBeCloseTo(a.y + offset, 5);
    // A label that grows without the root size (a larger text style): the pill outgrows container.height, and the
    // leading circle — a square of the grown height — keeps its center on the corner point.
    await override(page, { [T('label-typescale-font')]: '500 2rem/1.5 Inter' });
    await expect.poll(async () => (await box(container(page, 'count-double'))).height).toBeGreaterThan(height);
    await expect.poll(async () => { const [p, q] = [await box(container(page, 'count-double')), await box(anchor(page, 'count-double'))]; return p.x + p.height / 2 - (q.x + q.width - offset); }).toBeCloseTo(0, 3);
    const [grown, a2] = [await box(container(page, 'count-double')), await box(anchor(page, 'count-double'))];
    expect(grown.y + grown.height / 2).toBeCloseTo(a2.y + offset, 3);
    const size = await resolveToken(page, T('dot-size'));
    const dot = await box(container(page, 'dot'));
    expect([dot.width, dot.height]).toEqual([size, size]);
  });

  test('BDG-14: a negative count or one that is not a number renders as 0, a fraction rounded down, a max below 1 as 999 — each reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('negative', { count: -3, label: 'x' }), fixture('fraction', { count: 2.7 }), fixture('low-max', { count: 1200, max: 0 }), fixture('nan', { count: 'many', label: 'New' })],
    });
    await expect(container(page, 'negative')).toBeHidden();
    await expect(anchor(page, 'negative')).not.toHaveAttribute('aria-description');
    await expect(label(page, 'fraction')).toHaveText('2');
    await expect(anchor(page, 'fraction')).toHaveAttribute('aria-description', '2');
    await expect(label(page, 'low-max')).toHaveText('999+');
    // Not a number: as for 0 — nothing drawn, nothing announced.
    await expect(container(page, 'nan')).toBeHidden();
    await expect(anchor(page, 'nan')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('BDG-14')).length).toBe(4);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/count -3 is negative; it is drawn as 0 \(BDG-14\)/),
      expect.stringMatching(/count 2\.7 is not a whole number; it is drawn as 2 \(BDG-14\)/),
      expect.stringMatching(/max 0 is below 1; the default 999 is used \(BDG-14\)/),
      expect.stringMatching(/count is not a number; it is drawn as 0 \(BDG-14\)/),
    ]));
  });

  test('BDG-16: with no anchor the badge draws nothing, takes no space and exposes nothing, and a debug build reports it; given an anchor it draws on it at once, and gives it back when it is taken away', async ({ page }) => {
    const seen = warnings(page);
    // No content: nothing in the default slot. A count, a dot and a capped count alike.
    const alone = [{ id: 'alone', props: { count: 3, label: '3 unread' } }, { id: 'alone-dot', props: { label: 'New messages' } }, { id: 'alone-capped', props: { count: 1200 } }];
    await mountFixtures(page, spec, { icons: true, fixtures: alone });
    for (const { id } of alone) {
      await expect(host(page, id).locator('.corner'), id).toBeHidden();
      const own = await box(host(page, id));
      expect(own.width, id).toBe(0);
      // Nothing for assistive technology: the stage holds no node of the tree.
      expect(await stage(page, id).ariaSnapshot(), id).toBe('');
    }
    await expect.poll(() => seen.filter((w) => w.includes('BDG-16'))).toHaveLength(alone.length);
    expect(seen.find((w) => w.includes('BDG-16'))).toMatch(/<tanrei-badge>: the badge has no anchor, so it draws nothing/);
    // Given an anchor: drawn on its corner (BDG-3) and describing it (BDG-8) at once, with no report.
    await host(page, 'alone').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<span class="tanrei-icon" data-size="medium" role="img" aria-label="Inbox">inbox</span>'));
    await expect(container(page, 'alone')).toBeVisible();
    await expect(anchor(page, 'alone')).toHaveAttribute('aria-description', '3 unread');
    const offset = await resolveToken(page, T('container-offset'));
    const [pill, a] = [await box(container(page, 'alone')), await box(anchor(page, 'alone'))];
    expect(pill.x + pill.height / 2).toBeCloseTo(a.x + a.width - offset, 5);
    expect(pill.y + pill.height / 2).toBeCloseTo(a.y + offset, 5);
    expect(seen.filter((w) => w.includes('BDG-16'))).toHaveLength(alone.length);
    // Taken away: the anchor's own description comes back, nothing is drawn, and a debug build reports it again.
    await host(page, 'alone').evaluate((el) => {
      const taken = el.firstElementChild!;
      taken.id = 'taken';
      document.body.append(taken);
    });
    await expect(host(page, 'alone').locator('.corner')).toBeHidden();
    await expect(page.locator('#taken')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('BDG-16'))).toHaveLength(alone.length + 1);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('forced colors: the badge is drawn in a system color where the engine has the mode', async ({ page }) => {
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
    const [fill, text] = [await css(container(page, 'count-single'), 'background-color'), await css(label(page, 'count-single'), 'color')];
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(fill).not.toBe(text);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('the anchor is the glyph at sys.icon.medium in on-surface-variant, named by its glyph name, the label its description; its face is loaded, so every baseline draws the glyph', async ({ page }) => {
    for (const { id, props, content } of spec.fixtures) {
      const a = await box(anchor(page, id));
      expect(a.width, id).toBe(await resolveToken(page, '--tanrei-sys-icon-medium'));
      expect(await css(anchor(page, id), 'color'), id).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface-variant'));
      await expect(anchor(page, id), id).toHaveAccessibleName(String(content));
      // "notifications, 3 unread" — the label once, as the description (none for a count of 0).
      await expect(anchor(page, id), id).toHaveAccessibleDescription(props.count === 0 ? '' : String(props.label));
      const text = await anchor(page, id).evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; });
      expect(text, id).toBeLessThanOrEqual(a.width + 0.5);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

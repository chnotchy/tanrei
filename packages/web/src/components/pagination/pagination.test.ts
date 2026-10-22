// <tanrei-pagination>, driven by specs/pagination.spec.json: every behaviour id (PGN-1…24) is cited by a test title,
// every fixture has a baseline, and every state, size and choice of kind is read back from the tokens — never from a
// number written here, except where the spec's own verify gives it.
// PGN-25: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, rootTokens, setWords, tab, tabTo } from '../../../test/harness.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { expectAnimated, sampleFrames } from '../../../test/frames.js';

const spec = loadSpec('pagination');
type P = Page;
const T = (name: string) => `--tanrei-comp-pagination-${name}`;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-pagination`);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const items = (page: P, id: string) => host(page, id).locator('.row .item');
const pageItem = (page: P, id: string, n: number) => host(page, id).locator(`.row .item:not(.control)[data-page="${n}"]`);
const control = (page: P, id: string, name: string) => host(page, id).locator(`.row .item[data-control="${name}"]`);
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const settledCss = (locator: Locator, property: string) =>
  locator.evaluate(async (el, p) => {
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
    return getComputedStyle(el).getPropertyValue(p);
  }, property);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const settle = (page: P, id: string) => host(page, id).evaluate(async (el: any) => el.updateComplete);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** A fixture of the test's own, with the words a product gives. */
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { label: `Pages ${id}`, page: 1, count: 10, previousLabel: 'Previous page', nextLabel: 'Next page', pageLabel: 'Page {page}', ...props },
  ...extra,
});
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;

/** What the row draws, in order: a page's number, a control's name, `…` for an ellipsis, the sentence for the count. */
const row = (page: P, id: string) =>
  host(page, id).evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('.row > li')].map((li) => {
      if (li.querySelector('.ellipsis')) return '…';
      if (li.querySelector('.count')) return li.textContent!.trim();
      const item = li.querySelector('.item')!;
      return item.classList.contains('control') ? `<${item.getAttribute('data-control')}>` : item.textContent!.trim();
    }),
  );
/** The pages of the row alone, as numbers and `…`. */
const pages = async (page: P, id: string) => (await row(page, id)).filter((each) => !each.startsWith('<'));

/** Logs every change: the page it carried and the page the element held when it was fired. */
const wire = (page: P, { cancel = false } = {}) =>
  page.evaluate((c) => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll<any>('tanrei-pagination')) {
      el.addEventListener('change', (e: CustomEvent) => {
        log.push(`${e.detail.page}:${el.page}`);
        if (c) e.preventDefault();
      });
    }
  }, cancel);
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** The item that holds focus inside the element: its page or control. */
const focused = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    return active ? (active.dataset.control ?? active.dataset.page ?? active.localName) : null;
  });

/** What an item draws: its fill, number, arrow and opacity. */
const drawn = (item: Locator) =>
  item.evaluate((el) => {
    const c = getComputedStyle(el);
    const glyph = el.querySelector('.glyph');
    return { bg: c.backgroundColor, label: c.color, icon: glyph ? getComputedStyle(glyph).color : null, opacity: c.opacity };
  });
const expected = async (page: P, part: 'item' | 'current', state = '', glyph = false) => {
  const name = (p: string) => T(`${part}-${state ? `${state}-` : ''}${p}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    label: await resolveColor(page, name('label-color')),
    icon: glyph ? await resolveColor(page, name('icon-color')) : null,
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};

test.describe('structure and the pages shown', () => {
  test('PGN-1: one navigation landmark named by label holding one list — first, previous, the pages and ellipses, next, last; compact: the sentence in place of the pages — in document and focus order, in both directions; an empty label still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('first-last'), fixture('compact-first-last'), fx('unnamed', { label: '' }), { ...fixture('first-last'), id: 'first-last-rtl', direction: 'rtl' }] });
    const nav = page.getByRole('navigation', { name: 'Pages (first-last)' });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('list')).toHaveCount(1);
    expect(await row(page, 'first-last')).toEqual(['<first>', '<previous>', '1', '…', '11', '12', '13', '…', '40', '<next>', '<last>']);
    expect(await row(page, 'compact-first-last')).toEqual(['<first>', '<previous>', 'Page 1 of 25', '<next>', '<last>']);
    // The list holds nothing but its items; the measuring copy is outside the landmark and hidden.
    expect(await host(page, 'first-last').evaluate((el) => [...el.shadowRoot!.querySelector('nav')!.children].map((c) => c.localName))).toEqual(['ol']);
    await expect(host(page, 'first-last').locator('.measure')).toHaveAttribute('aria-hidden', 'true');
    // Focus order is document order, whichever the direction.
    for (const id of ['first-last', 'first-last-rtl']) {
      await tabTo(page, control(page, id, 'first'));
      const order: string[] = [(await focused(page, id))!];
      for (let n = 0; n < 8; n++) {
        await tab(page);
        order.push((await focused(page, id))!);
      }
      expect(order, id).toEqual(['first', 'previous', '1', '11', '12', '13', '40', 'next', 'last']);
    }
    // Unnamed: drawn, a landmark without a name, reported.
    await expect(items(page, 'unnamed')).toHaveCount(8);
    expect(await host(page, 'unnamed').locator('nav').getAttribute('aria-label')).toBeNull();
    expect(seen.join('\n')).toMatch(/label is empty, so the navigation landmark has no accessible name.*\(PGN-1\)/);
  });

  test('PGN-2: the numbered form shows the boundaries, the current page with its siblings and ellipses for what is left out, a page in place of an ellipsis of one, and the same number of places on every page', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fx('ten', { page: 1 }), fx('five', { page: 2, count: 5 }), fx('wide', { page: 10, count: 30, siblings: 2, boundaries: 2 }), fx('none', { page: 5, boundaries: 0 })],
    });
    const at = async (id: string, n: number) => {
      await host(page, id).evaluate((el: any, v) => (el.page = v), n);
      await settle(page, id);
      return (await pages(page, id)).join(' ');
    };
    // The spec's verify, under siblings 1 and boundaries 1, and 2 and 2.
    expect(await at('ten', 1)).toBe('1 2 3 4 5 … 10');
    expect(await at('ten', 5)).toBe('1 … 4 5 6 … 10');
    expect(await at('ten', 10)).toBe('1 … 6 7 8 9 10');
    expect(await at('five', 2)).toBe('1 2 3 4 5');
    expect(await at('wide', 10)).toBe('1 2 … 8 9 10 11 12 … 29 30');
    // An ellipsis never stands for one page: page 4 of 10 shows 2, not an ellipsis for it.
    expect(await at('ten', 4)).toBe('1 2 3 4 5 … 10');
    // boundaries 0: an ellipsis at an end.
    expect(await at('none', 5)).toBe('… 4 5 6 …');
    // The same number of places — 2 × boundaries + 2 × siblings + 3 — on every page.
    for (const [id, count, places] of [
      ['ten', 10, 7],
      ['wide', 30, 11],
      ['none', 10, 5],
    ] as const) {
      for (let n = 1; n <= count; n++) expect((await at(id, n)).split(' '), `${id} page ${n}`).toHaveLength(places);
    }
    // The current page is always shown.
    for (let n = 1; n <= 30; n++) expect((await at('wide', n)).split(' ')).toContain(String(n));
  });

  test('PGN-3: count is a whole number, and below 1 or unreadable draws nothing, takes no room and exposes no landmark; page is held between 1 and count; siblings and boundaries are whole numbers of 0 or more; each change is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fx('zero', { count: 0 }), fx('unread', { count: 'many' }), fx('over', { page: 12, count: 10 }), fx('under', { page: -3 }), fx('fraction', { page: 2.7, count: 10.9 }), fx('negative', { page: 5, siblings: -2, boundaries: -1 })],
    });
    for (const id of ['zero', 'unread']) {
      await expect(host(page, id).locator('nav')).toHaveCount(0);
      const box = await host(page, id).boundingBox();
      expect(box, id).toBeNull();
    }
    expect(seen.join('\n')).toMatch(/count "many" cannot be read as a number; nothing is drawn \(PGN-3\)/);
    // The spec's verify: page 12 of 10 draws page 10 as current and reports it.
    await expect(pageItem(page, 'over', 10)).toHaveAttribute('aria-current', 'page');
    expect(seen.join('\n')).toMatch(/page 12 is not a whole number from 1 to the count \(10\); page 10 is drawn as the current one \(PGN-3\)/);
    await expect(pageItem(page, 'under', 1)).toHaveAttribute('aria-current', 'page');
    await expect(pageItem(page, 'fraction', 2)).toHaveAttribute('aria-current', 'page');
    expect((await pages(page, 'fraction')).at(-1)).toBe('10');
    expect(seen.join('\n')).toMatch(/count 10\.9 is not a whole number; it is read as 10 \(PGN-3\)/);
    // siblings and boundaries below 0 are 0: the current page alone between two ellipses.
    expect((await pages(page, 'negative')).join(' ')).toBe('… 5 …');
    expect(seen.join('\n')).toMatch(/siblings -2 is not a whole number of 0 or more; it is read as 0 \(PGN-3\)/);
    expect(seen.join('\n')).toMatch(/boundaries -1 is not a whole number of 0 or more; it is read as 0 \(PGN-3\)/);
    // Back to a count: drawn again.
    await host(page, 'zero').evaluate((el: any) => (el.count = 3));
    await expect(items(page, 'zero')).toHaveCount(5);
  });

  test('PGN-4: the current page is drawn from the current tokens and is the one element with aria-current, the same kind of element as the other pages; activating it emits no change', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.mouse.move(0, 0);
    // The spec's verify: the fixture middle — page 5 is filled, and is the one element with aria-current.
    await expect(host(page, 'middle').locator('[aria-current]')).toHaveCount(1);
    await expect(pageItem(page, 'middle', 5)).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => drawn(pageItem(page, 'middle', 5))).toEqual(await expected(page, 'current'));
    await expect.poll(() => drawn(pageItem(page, 'middle', 4))).toEqual(await expected(page, 'item'));
    expect(await expected(page, 'current')).not.toEqual(await expected(page, 'item'));
    for (const id of ['middle', 'links']) {
      const kinds = await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.row .item:not(.control)')].map((each) => each.localName));
      expect(new Set(kinds).size, id).toBe(1);
    }
    expect(await host(page, 'links').locator('.row .item.current').evaluate((el) => [el.localName, el.getAttribute('href')])).toEqual(['a', '/results/?page=3']);
    await wire(page);
    await pageItem(page, 'middle', 5).click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual([]);
  });

  test('PGN-5: on the first page first and previous are disabled, on the last next and last: drawn disabled, exposed as disabled, out of the focus order, not activatable, in their places; a disabled link has no address', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fixture('last-page'), fixture('links-first'), fixture('compact-first-last'), fx('second', { page: 2 })] });
    await wire(page);
    await expect(control(page, 'default', 'previous')).toBeDisabled();
    await expect(control(page, 'default', 'next')).toBeEnabled();
    await expect(control(page, 'last-page', 'next')).toBeDisabled();
    await expect(control(page, 'compact-first-last', 'first')).toBeDisabled();
    await expect(control(page, 'compact-first-last', 'last')).toBeEnabled();
    // The spec's verify: in links-first previous is disabled, not focusable and has no href; next is a link to page 2.
    const previous = control(page, 'links-first', 'previous');
    expect(
      await previous.evaluate((el) => {
        (el as HTMLElement).focus();
        return [el.localName, el.getAttribute('href'), el.getAttribute('role'), el.getAttribute('aria-disabled'), el.getAttribute('rel'), (el.getRootNode() as ShadowRoot).activeElement === el];
      }),
    ).toEqual(['a', null, 'link', 'true', null, false]);
    await expect(page.getByRole('link', { name: 'Previous page' }).first()).toBeDisabled();
    await expect(control(page, 'links-first', 'next')).toHaveAttribute('href', '/blog/page/2/');
    // Drawn from the disabled tokens.
    await page.mouse.move(0, 0);
    const disabled = await expected(page, 'item', 'disabled', true);
    await expect.poll(() => drawn(control(page, 'default', 'previous'))).toEqual({ ...disabled, label: disabled.icon });
    // Not activatable: a click, a dispatched click and Tab reach nothing.
    await control(page, 'default', 'previous').click({ force: true });
    await previous.click({ force: true });
    await previous.evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => location.href)).toBe('about:blank');
    // In its place: the row is as wide on page 1 as on page 2.
    const width = async (id: string) => {
      const all = await items(page, id).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      return all.at(-1)!.right - all[0]!.left;
    };
    expect(await width('default')).toBeCloseTo(await width('second'), 1);
  });

  test('PGN-6: with href each page and enabled control is a link to href with {page} in Western digits, rel prev and next on previous and next; an href without {page}, or a script, draws buttons and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('links'), fx('arabic', { page: 3, href: '/r/{page}', pageLabel: 'الصفحة {page}' }), fx('placeless', { href: '/results/' }), fx('script', { href: 'javascript:go({page})' })],
    });
    // The spec's verify: page 4 is an anchor to /results/?page=4; previous to ?page=2 with rel prev.
    expect(await pageItem(page, 'links', 4).evaluate((el) => [el.localName, el.getAttribute('href')])).toEqual(['a', '/results/?page=4']);
    expect(await control(page, 'links', 'previous').evaluate((el) => [el.localName, el.getAttribute('href'), el.getAttribute('rel')])).toEqual(['a', '/results/?page=2', 'prev']);
    expect(await control(page, 'links', 'next').evaluate((el) => [el.getAttribute('href'), el.getAttribute('rel')])).toEqual(['/results/?page=4', 'next']);
    expect(await pageItem(page, 'links', 12).getAttribute('href')).toBe('/results/?page=12');
    await expect(page.getByRole('link', { name: 'Page 4' })).toHaveCount(1);
    // Western digits in the address, whatever the language.
    await host(page, 'arabic').evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await host(page, 'arabic').evaluate((el: any) => el.requestUpdate());
    await settle(page, 'arabic');
    const shown = await page.evaluate(() => new Intl.NumberFormat('ar-EG').format(4));
    const four = host(page, 'arabic').locator('.row .item:not(.control)[href="/r/4"]');
    await expect(four).toHaveText(shown);
    expect(shown).not.toBe('4');
    for (const id of ['placeless', 'script']) {
      expect(await items(page, id).evaluateAll((els) => [...new Set(els.map((el) => el.localName))]), id).toEqual(['button']);
    }
    expect(seen.join('\n')).toMatch(/href "\/results\/" holds no place \{page\}.*drawn as buttons \(PGN-6\)/);
    expect(seen.join('\n')).toMatch(/href "javascript:go\(\{page\}\)" is not a place to go.*drawn as buttons \(PGN-6\)/);
  });
});

test.describe('activation', () => {
  test('PGN-7: a page or an enabled control activated by pointer, Enter or Space on a button emits change once with its page — first 1, previous −1, next +1, last count — and then the element takes it; cancelled, the page stays', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fx('ends', { page: 5, firstLast: true, firstLabel: 'First page', lastLabel: 'Last page' })] });
    await wire(page);
    // The spec's verify: clicking page 4 fires change with page 4, and page becomes 4.
    await pageItem(page, 'default', 4).click();
    await expect.poll(() => host(page, 'default').evaluate((el: any) => el.page)).toBe(4);
    expect(await log(page)).toEqual(['4:1']);
    await tabTo(page, control(page, 'default', 'next'));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect.poll(() => host(page, 'default').evaluate((el: any) => el.page)).toBe(6);
    await control(page, 'ends', 'first').click();
    await control(page, 'ends', 'last').click();
    await control(page, 'ends', 'previous').click();
    await control(page, 'ends', 'previous').evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['4:1', '5:4', '6:5', '1:5', '10:1', '9:10', '8:9']);
    // A listener that cancels keeps the page.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default')] });
    await wire(page, { cancel: true });
    await pageItem(page, 'default', 4).click();
    await control(page, 'default', 'next').click();
    expect(await log(page)).toEqual(['4:1', '2:1']);
    await expect(pageItem(page, 'default', 1)).toHaveAttribute('aria-current', 'page');
    expect(await host(page, 'default').evaluate((el: any) => el.page)).toBe(1);
  });

  test('PGN-7: a link is followed after change, and the element takes the page; cancelled, the address stays where it is; Space does not activate a link', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('hash', { href: '#results-{page}' })] });
    await wire(page);
    await pageItem(page, 'hash', 4).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#results-4');
    await expect.poll(() => host(page, 'hash').evaluate((el: any) => el.page)).toBe(4);
    expect(await log(page)).toEqual(['4:1']);
    // Enter follows a link; Space does nothing to it.
    await tabTo(page, control(page, 'hash', 'next'));
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await log(page)).toEqual(['4:1']);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#results-5');
    // Cancelled: nothing is followed, and the page stays.
    await page.evaluate(() => document.querySelector('tanrei-pagination')!.addEventListener('change', (e) => e.preventDefault()));
    await pageItem(page, 'hash', 6).click();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => location.hash)).toBe('#results-5');
    expect(await host(page, 'hash').evaluate((el: any) => el.page)).toBe(5);
    expect(await log(page)).toEqual(['4:1', '5:4', '6:5']);
  });

  test('PGN-19: each enabled item is one Tab stop, no arrow key moves; after a change focus is on the page activated, on the control while it is enabled, else on the page now current', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('nine', { page: 9 }), fx('two', { page: 2 }), fx('compact', { page: 9, variant: 'compact', countText: 'Page {page} of {count}' })] });
    // The spec's verify: activating next on page 9 of 10 — next is disabled on page 10, and focus is on page 10.
    await tabTo(page, control(page, 'nine', 'next'));
    await page.keyboard.press('Enter');
    await expect(control(page, 'nine', 'next')).toBeDisabled();
    await expect.poll(() => focused(page, 'nine')).toBe('10');
    expect(await pageItem(page, 'nine', 10).evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    // A page activated: focus on it, now the current page.
    await tabTo(page, pageItem(page, 'nine', 7));
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page, 'nine')).toBe('7');
    await expect(pageItem(page, 'nine', 7)).toHaveAttribute('aria-current', 'page');
    // By pointer too, without the ring.
    await pageItem(page, 'nine', 6).click();
    await expect.poll(() => focused(page, 'nine')).toBe('6');
    // The control still enabled keeps focus.
    await tabTo(page, control(page, 'two', 'next'));
    await page.keyboard.press('Enter');
    await expect.poll(() => host(page, 'two').evaluate((el: any) => el.page)).toBe(3);
    expect(await focused(page, 'two')).toBe('next');
    // Arrow keys move nothing.
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) await page.keyboard.press(key);
    expect(await focused(page, 'two')).toBe('next');
    // Disabled controls are no stops: from the last page of 'nine'… (its next and last are disabled).
    await host(page, 'nine').evaluate((el: any) => (el.page = 10));
    await settle(page, 'nine');
    await tabTo(page, pageItem(page, 'nine', 10));
    await tab(page);
    expect(await focused(page, 'nine')).toBeNull();
    // Compact: next becomes disabled on the last page — focus goes to the nearest enabled control.
    await tabTo(page, control(page, 'compact', 'next'));
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page, 'compact')).toBe('previous');
  });
});

test.describe('what is drawn', () => {
  test('PGN-8: previous, next, first and last are icons only — the icon set’s chevron_left, chevron_right, first_page, last_page at comp.pagination.icon.size, unselected — named by their labels or the product’s words; an unnamed one is still drawn and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('first-last'), fx('worded', { previousLabel: '', nextLabel: '' }), fx('unnamed', { previousLabel: '', nextLabel: '' })] });
    // The spec's verify: four controls, each named by its label; the arrows hidden from assistive technology.
    for (const [name, glyph] of [
      ['First page', 'first_page'],
      ['Previous page', 'chevron_left'],
      ['Next page', 'chevron_right'],
      ['Last page', 'last_page'],
    ]) {
      const button = host(page, 'first-last').getByRole('button', { name, exact: true });
      await expect(button).toHaveCount(1);
      await expect(button.locator('.glyph')).toHaveText(glyph);
      await expect(button.locator('.glyph')).toHaveAttribute('aria-hidden', 'true');
    }
    const glyph = control(page, 'first-last', 'next').locator('.glyph');
    const size = await resolveToken(page, T('icon-size'));
    expect((await bounds(glyph)).width).toBeCloseTo(size, 1);
    expect(await css(glyph, 'font-family')).toContain((await token(page, '--tanrei-sys-icon-family-unselected')).replaceAll('"', '').split(',')[0]!.trim());
    // The product's words, where the instance gives none; nothing at all: drawn, unnamed, reported.
    await host(page, 'worded').evaluate((el) => el.setAttribute('lang', 'en-GB'));
    await setWords(page, { previousPageLabel: 'Earlier', nextPageLabel: 'Later' }, { lang: 'en-GB' });
    await expect(host(page, 'worded').getByRole('button', { name: 'Earlier' })).toHaveCount(1);
    await expect(host(page, 'worded').getByRole('button', { name: 'Later' })).toHaveCount(1);
    await expect(control(page, 'unnamed', 'previous')).not.toHaveAttribute('aria-label', /./);
    await expect(control(page, 'unnamed', 'next').locator('.glyph')).toBeVisible();
    expect(await missingWords(page)).toEqual(expect.arrayContaining(['previousPageLabel', 'nextPageLabel']));
    expect(seen.join('\n')).toMatch(/previous-label is empty and the product's words have no previousPageLabel: the previous control is drawn and has no accessible name.*\(PGN-8\)/);
  });

  test('PGN-9: a page’s number in the label text style, the language’s digits and figures of one width; named by pageLabel with the number as drawn, the words, else the number alone', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fixture('rtl'), fx('egypt', { page: 3, pageLabel: 'الصفحة {page}' }), fx('plain', { pageLabel: '' })] });
    // The spec's verify: page 2 of default is named "Page 2" and shows 2; rtl draws ar's digits.
    const two = page.getByRole('button', { name: 'Page 2', exact: true }).first();
    await expect(two).toHaveText('2');
    const label = pageItem(page, 'default', 2);
    expect(await css(label, 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-font-size'))}px`);
    expect(await css(label, 'font-variant-numeric')).toBe('tabular-nums');
    const ar = await page.evaluate(() => [3, 10].map((n) => new Intl.NumberFormat('ar').format(n)));
    await expect(host(page, 'rtl').locator('.row .item.current')).toHaveText(ar[0]!);
    await expect(host(page, 'rtl').locator('.row .item.current')).toHaveAttribute('aria-label', `الصفحة ${ar[0]}`);
    expect((await pages(page, 'rtl')).at(-1)).toBe(ar[1]);
    // Where the language writes other digits, the number drawn and the name hold them.
    await host(page, 'egypt').evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await host(page, 'egypt').evaluate((el: any) => el.requestUpdate());
    await settle(page, 'egypt');
    const three = await page.evaluate(() => new Intl.NumberFormat('ar-EG').format(3));
    await expect(host(page, 'egypt').locator('.row .item.current')).toHaveText(three);
    await expect(host(page, 'egypt').locator('.row .item.current')).toHaveAttribute('aria-label', `الصفحة ${three}`);
    // No pageLabel anywhere: named by the number alone, and the key is missing.
    expect(await pageItem(page, 'plain', 2).getAttribute('aria-label')).toBeNull();
    await expect(host(page, 'plain').getByRole('button', { name: '2', exact: true })).toHaveCount(1);
    expect(await missingWords(page)).toContain('pageLabel');
    await setWords(page, { pageLabel: 'Seite {page}' });
    await expect(pageItem(page, 'plain', 2)).toHaveAttribute('aria-label', 'Seite 2');
  });

  test('PGN-10: an ellipsis is the character … in the label style and the ellipsis color, centred in a place as wide as an item is high, hidden and not focusable', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('middle'), fixture('small')] });
    // The spec's verify: middle has two ellipses, neither exposed nor focusable.
    const ellipses = host(page, 'middle').locator('.row .ellipsis');
    await expect(ellipses).toHaveCount(2);
    await expect(ellipses.first()).toHaveText('…');
    for (let n = 0; n < 2; n++) {
      const li = ellipses.nth(n).locator('xpath=..');
      await expect(li).toHaveAttribute('aria-hidden', 'true');
      expect(await ellipses.nth(n).evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    }
    expect(await css(ellipses.first(), 'color')).toBe(await resolveColor(page, T('ellipsis-color')));
    expect(await css(ellipses.first(), 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-font-size'))}px`);
    expect((await bounds(ellipses.first())).width).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
    expect((await bounds(host(page, 'small').locator('.row .ellipsis').first())).width).toBeCloseTo(await resolveToken(page, T('container-height-small')), 1);
    expect(await css(ellipses.first(), 'justify-content')).toBe('center');
  });

  test('PGN-11: compact draws first and previous, the sentence with its places filled, next and last; with no sentence "3 / 10" and a report; numbered falls back to compact where its row does not fit its width, and asks a content-sized layout for the row’s width', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('compact'), fixture('compact-numbers'), fx('narrow', { page: 3, countText: 'Page {page} of {count}' })] });
    // The spec's verify: compact draws "Page 3 of 10" between previous and next.
    expect(await row(page, 'compact')).toEqual(['<previous>', 'Page 3 of 10', '<next>']);
    const count = host(page, 'compact').locator('.row .count');
    expect(await css(count, 'color')).toBe(await resolveColor(page, T('count-color')));
    expect(await css(count, 'font-size')).toBe(`${await resolveToken(page, T('count-typescale-font-size'))}px`);
    const pad = await resolveToken(page, T('count-padding-inline'));
    expect(await css(count, 'padding-inline-start')).toBe(`${pad}px`);
    expect(await css(count, 'padding-inline-end')).toBe(`${pad}px`);
    // Text: not a control, not a live region.
    expect(await host(page, 'compact').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"]').length)).toBe(0);
    expect(await row(page, 'compact-numbers')).toEqual(['<previous>', '3 / 10', '<next>']);
    expect(await missingWords(page)).toContain('pageCountText');
    expect(seen.join('\n')).toMatch(/count-text is empty and the product's words have no pageCountText: the two numbers are drawn with a slash between them.*\(PGN-11\)/);
    // A content-sized layout gives the numbered form its row's width.
    const numbered = async () => {
      const all = await items(page, 'narrow').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      return all.at(-1)!.right - all[0]!.left;
    };
    const rowWidth = await numbered();
    expect((await bounds(host(page, 'narrow'))).width).toBeCloseTo(rowWidth, 0);
    expect(await row(page, 'narrow')).toHaveLength(9);
    // Test the fall-back by setting the stage's width (the spec's verify): a pixel short draws compact…
    await stage(page, 'narrow').evaluate((el, w) => (el.style.cssText = `box-sizing: content-box; inline-size: ${w}px`), rowWidth - 1);
    await expect.poll(() => row(page, 'narrow')).toEqual(['<previous>', 'Page 3 of 10', '<next>']);
    // …its width still asks for the row's, and the room coming back draws the numbers again.
    await stage(page, 'narrow').evaluate((el) => (el.style.cssText = 'display: inline-block'));
    await expect.poll(() => row(page, 'narrow')).toHaveLength(9);
    // Decided by its own width, not the window's.
    await page.setViewportSize({ width: 320, height: 720 });
    await stage(page, 'narrow').evaluate((el) => (el.style.cssText = ''));
    await page.setViewportSize({ width: 1280, height: 720 });
    await stage(page, 'narrow').evaluate((el) => (el.style.cssText = 'box-sizing: content-box; inline-size: 200px'));
    await expect.poll(() => row(page, 'narrow')).toHaveLength(3);
    // The compact variant never draws the numbers, however much room it has.
    await stage(page, 'compact').evaluate((el) => (el.style.cssText = 'box-sizing: content-box; inline-size: 1000px'));
    await page.waitForTimeout(100);
    expect(await row(page, 'compact')).toHaveLength(3);
  });

  test('PGN-12: one row at the start edge, comp.pagination.gap apart, items the size’s height high and at least as wide, numbers wider than the square padded, never wrapped', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fixture('small'), fixture('large-numbers')] });
    const [medium, small, gap, pad] = await Promise.all([T('container-height-medium'), T('container-height-small'), T('gap'), T('container-padding-inline')].map((n) => resolveToken(page, n)));
    // The spec's verify, under the default system: medium items 40 high and 40 wide for one digit, 4 apart; small 32.
    expect([medium, small, gap]).toEqual([40, 32, 4]);
    const one = await bounds(pageItem(page, 'default', 2));
    expect(one.height).toBeCloseTo(medium, 1);
    expect(one.width).toBeCloseTo(medium, 1);
    const three = await bounds(pageItem(page, 'default', 3));
    expect(three.x - (one.x + one.width)).toBeCloseTo(gap, 1);
    expect((await bounds(pageItem(page, 'small', 4))).height).toBeCloseTo(small, 1);
    const glyph = await bounds(control(page, 'default', 'next').locator('.glyph'));
    const next = await bounds(control(page, 'default', 'next'));
    expect(glyph.x + glyph.width / 2).toBeCloseTo(next.x + next.width / 2, 0);
    expect(glyph.y + glyph.height / 2).toBeCloseTo(next.y + next.height / 2, 0);
    // A number wider than the square: its own width plus the padding on each side.
    const wide = pageItem(page, 'large-numbers', 1205);
    const text = await wide.locator('.label').evaluate((el) => el.getBoundingClientRect().width);
    expect((await bounds(wide)).width).toBeCloseTo(text + 2 * pad, 0);
    expect(await css(wide, 'padding-inline-start')).toBe(`${pad}px`);
    // One row, at the start edge.
    const tops = await items(page, 'large-numbers').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const first = await bounds(items(page, 'default').first());
    const nav = await bounds(host(page, 'default'));
    expect(first.x).toBeCloseTo(nav.x, 1);
  });

  test('PGN-22: enlarged text grows each item with its number, never below its height, keeps the gap and the arrows’ size, and draws compact where the row no longer fits; nothing overlaps and the page does not scroll sideways', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('big', { page: 5, count: 200, countText: 'Page {page} of {count}' })] });
    const size = await resolveToken(page, T('label-typescale-font-size'));
    const line = await resolveToken(page, T('label-typescale-line-height'));
    const medium = await resolveToken(page, T('container-height-medium'));
    const gap = await resolveToken(page, T('gap'));
    // The row's width at the text's own size, which fits the stage set to it.
    const before = (await bounds(host(page, 'big'))).width;
    await stage(page, 'big').evaluate((el, w) => (el.style.cssText = `box-sizing: content-box; inline-size: ${w}px`), Math.ceil(before));
    expect(await row(page, 'big')).toHaveLength(9);
    // 200 % text: the number's text style at twice its size. The grown row no longer fits the same width: compact.
    await override(page, { [T('label-typescale-font')]: `${await token(page, T('label-typescale-font-weight'))} ${size * 2}px/${line * 2}px ${await token(page, T('label-typescale-font-family'))}` });
    await expect.poll(async () => (await row(page, 'big')).length).toBe(3);
    // Room for it: the grown numbered row.
    await stage(page, 'big').evaluate((el) => (el.style.cssText = ''));
    await expect.poll(async () => (await row(page, 'big')).length).toBe(9);
    const rects = await items(page, 'big').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    for (const r of rects) expect(r.height).toBeGreaterThanOrEqual(medium - 0.5);
    expect(rects.some((r) => r.width > medium + 1)).toBe(true);
    // No number is cut: each label lies inside its item.
    const numbers = await items(page, 'big').evaluateAll((els) =>
      els
        .filter((el) => !el.classList.contains('control'))
        .map((el) => {
          const box = el.getBoundingClientRect();
          const text = el.querySelector('.label')!.getBoundingClientRect();
          return text.left >= box.left - 0.5 && text.right <= box.right + 0.5 && text.top >= box.top - 0.5 && text.bottom <= box.bottom + 0.5;
        }),
    );
    expect(numbers.every(Boolean)).toBe(true);
    expect((await bounds(control(page, 'big', 'next').locator('.glyph'))).width).toBeCloseTo(await resolveToken(page, T('icon-size')), 1);
    const sorted = [...rects].sort((a, b) => a.left - b.left);
    for (let n = 1; n < sorted.length; n++) expect(sorted[n]!.left - sorted[n - 1]!.right).toBeGreaterThanOrEqual(gap - 0.5);
    // A narrow window, the stage as wide as it: compact, and nothing scrolls sideways.
    await page.setViewportSize({ width: 320, height: 720 });
    await stage(page, 'big').evaluate((el) => (el.style.cssText = 'box-sizing: border-box; inline-size: 100%'));
    await page.evaluate(() => (document.querySelector('main')!.style.alignItems = 'stretch'));
    await expect.poll(async () => (await row(page, 'big')).length).toBe(3);
    expect(await page.evaluate(() => document.scrollingElement!.scrollWidth <= document.scrollingElement!.clientWidth)).toBe(true);
  });

  test('PGN-23: right-to-left lays the row from the right, first at the right edge, keeping reading and focus order; an arrow is mirrored where the icon set marks it; a change of direction redraws at once and keeps focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('rtl'), fixture('default')] });
    // The spec's verify: page 1 at the right; previous right of the numbers with chevron_left mirrored to point right.
    const ar = (n: number) => page.evaluate((v) => new Intl.NumberFormat('ar').format(v), n);
    const one = await bounds(host(page, 'rtl').locator(`.row .item:not(.control)[data-page="1"]`));
    const two = await bounds(host(page, 'rtl').locator(`.row .item:not(.control)[data-page="2"]`));
    expect(one.x).toBeGreaterThan(two.x);
    const previous = await bounds(control(page, 'rtl', 'previous'));
    const first = await bounds(control(page, 'rtl', 'first'));
    expect(previous.x).toBeGreaterThan(one.x);
    expect(first.x).toBeGreaterThan(previous.x);
    expect(await pageItem(page, 'rtl', 1).textContent()).toContain(await ar(1));
    const mirrored = (id: string, name: string) => css(control(page, id, name).locator('.glyph'), 'transform');
    expect(await mirrored('rtl', 'previous')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await mirrored('rtl', 'next')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await mirrored('default', 'next')).toBe('none');
    // The default icon set marks all four arrows as mirrored, so first and last point outward too.
    expect(await mirrored('rtl', 'first')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await mirrored('rtl', 'last')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    // Mirrored by the icon set's mark alone: the transform is the mark's rule, not one of the pagination's own.
    const marks = await host(page, 'rtl').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.row .glyph')].map((g) => g.hasAttribute('data-tanrei-mirrored')));
    expect(marks).toEqual([true, true, true, true]);
    // A change of direction: drawn at once, focus kept.
    await tabTo(page, pageItem(page, 'default', 2));
    await stage(page, 'default').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect((await bounds(pageItem(page, 'default', 1))).x).toBeGreaterThan((await bounds(pageItem(page, 'default', 2))).x);
    expect(await mirrored('default', 'next')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await focused(page, 'default')).toBe('2');
  });

  test('PGN-24: the sentence is text of its own direction, isolated, and each number keeps its order: "3 / 10" reads 3 then 10 in either direction', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('rtl-compact'), { ...fixture('compact-numbers'), id: 'numbers-rtl', direction: 'rtl' }, fixture('compact-numbers')] });
    // The spec's verify: rtl-compact's sentence reads in Arabic, with its numbers in place.
    const [three, ten] = await page.evaluate(() => [3, 10].map((n) => new Intl.NumberFormat('ar').format(n)));
    await expect(host(page, 'rtl-compact').locator('.row .count')).toHaveText(`الصفحة ${three} من ${ten}`);
    expect(await css(host(page, 'rtl-compact').locator('.row .count'), 'unicode-bidi')).toBe('plaintext');
    // Where 3 and 10 are drawn: 3 to the left of 10, in both directions, and 10's digits in their order.
    const places = (id: string) =>
      host(page, id)
        .locator('.row .count')
        .evaluate((el) => {
          const text = el.firstChild!.nodeType === 3 ? el.firstChild! : [...el.childNodes].find((n) => n.nodeType === 3)!;
          const at = (from: number, to: number) => {
            const range = document.createRange();
            range.setStart(text, from);
            range.setEnd(text, to);
            return range.getBoundingClientRect();
          };
          const s = text.textContent!;
          const i3 = s.indexOf('3');
          const i10 = s.indexOf('10');
          return { three: at(i3, i3 + 1).left, ten: at(i10, i10 + 2).left, one: at(i10, i10 + 1).left, zero: at(i10 + 1, i10 + 2).left };
        });
    for (const id of ['compact-numbers', 'numbers-rtl']) {
      const p = await places(id);
      expect(p.three, id).toBeLessThan(p.ten);
      expect(p.one, id).toBeLessThan(p.zero);
    }
  });
});

test.describe('states', () => {
  test('PGN-13: each state renders the item from that state’s tokens of its part (item or current), disabled over pressed over focused over hovered; pointer focus is not the focused state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fixture('middle')] });
    const item = pageItem(page, 'default', 2);
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(item)).toEqual(await expected(page, 'item'));
    await item.hover();
    await expect.poll(() => drawn(item)).toEqual(await expected(page, 'item', 'hovered'));
    await page.mouse.down();
    await expect.poll(() => drawn(item)).toEqual(await expected(page, 'item', 'pressed'));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    // The current page: its own tokens in every state.
    const current = pageItem(page, 'middle', 5);
    await current.hover();
    await expect.poll(() => drawn(current)).toEqual(await expected(page, 'current', 'hovered'));
    await page.mouse.move(0, 0);
    // Keyboard focus is the focused state; pointer focus is not.
    await tabTo(page, pageItem(page, 'middle', 4));
    await expect.poll(() => drawn(pageItem(page, 'middle', 4))).toEqual(await expected(page, 'item', 'focused'));
    await tabTo(page, current);
    await expect.poll(() => drawn(current)).toEqual(await expected(page, 'current', 'focused'));
    await pageItem(page, 'middle', 6).click();
    await page.mouse.move(0, 0);
    await expect.poll(() => settledCss(pageItem(page, 'middle', 6), 'background-color')).toBe((await expected(page, 'current')).bg);
    // Disabled wins over hover.
    await control(page, 'default', 'previous').hover({ force: true });
    const disabled = await expected(page, 'item', 'disabled', true);
    await expect.poll(() => drawn(control(page, 'default', 'previous'))).toEqual({ ...disabled, label: disabled.icon });
  });

  test('PGN-13: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fixture('default')] });
    const item = pageItem(page, 'default', 3);
    const bg = () => css(item, 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((st) => resolveColor(page, T(`item-${st}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await item.hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, item);
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.evaluate(() => document.querySelector('tanrei-pagination')!.addEventListener('change', (e) => e.preventDefault()));
    await page.keyboard.up('Space');
  });

  test('PGN-14: keyboard focus shows the ring around the item — offset, outer width, inner stroke — without animation; pointer focus does not', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default')] });
    await page.evaluate(() => document.querySelector('tanrei-pagination')!.addEventListener('change', (e) => e.preventDefault()));
    const item = pageItem(page, 'default', 3);
    await item.click();
    await expect(item).toHaveCSS('outline-style', 'none');
    await tabTo(page, item);
    const [offset, inner, outer] = await Promise.all(['--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width', '--tanrei-sys-focus-outer-width'].map((n) => resolveToken(page, n)));
    await expect(item).toHaveCSS('outline-style', 'solid');
    await expect(item).toHaveCSS('outline-width', `${outer}px`);
    await expect(item).toHaveCSS('outline-offset', `${offset + inner}px`);
    expect(await css(item, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await css(item, 'transition-property')).not.toContain('outline');
    expect(await css(item, 'top', '::after')).toBe(`${-(offset + inner)}px`);
  });

  test('PGN-15: a press that ends within a frame — Enter, Space on a button, a click, Enter on a link — is shown at once and for at least press-hold, without holding the change back', async ({ page }) => {
    for (const [name, href, activate] of [
      ['Enter', '', () => page.keyboard.press('Enter')],
      ['Space', '', () => page.keyboard.press('Space')],
      ['click', '', () => clickCentre(page, control(page, 'p', 'next'))],
      ['link Enter', '#p{page}', () => page.keyboard.press('Enter')],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fx('p', { href })] });
      const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      expect(hold, name).toBe(100);
      await control(page, 'p', 'next').focus();
      await control(page, 'p', 'next').evaluate((el) => {
        const log: { down?: number; on?: number; off?: number; up?: number; change?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
          else if (log.on !== undefined) log.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
        document.querySelector('tanrei-pagination')!.addEventListener('change', () => (log.change ??= performance.now()));
      });
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release; and the change, sent
      // without waiting for the hold, is there before half of it has passed.
      await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, name);
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
      expect(logged.change - logged.down, name).toBeLessThan(hold / 2);
    }
    // Space on a link presses nothing.
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('l', { href: '#p{page}' })] });
    await control(page, 'l', 'next').focus();
    await page.keyboard.down('Space');
    expect(await control(page, 'l', 'next').getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
  });

  test('PGN-15: an item pressed by Space stays pressed while the key is down, though the pointer resting over it leaves; the keyup ends it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('p')] });
    await expectKeyPressOutlastsPointer(page, { control: control(page, 'p', 'next') });
  });

  test('PGN-16: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default')], ...(system ? { system } : {}) });
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('item-pressed-label-color')]: 'rgb(0, 0, 255)' });
      const b = pageItem(page, 'default', 3);
      await b.hover();
      await expect.poll(() => settledCss(b, 'background-color')).toBe(await resolveColor(page, T('item-hovered-container-color')));
      const hovered = await css(b, 'background-color');
      await page.mouse.down();
      const result = {
        pressed: await b.getAttribute('data-pressed'),
        bg: await css(b, 'background-color'),
        hovered,
        label: await css(b, 'color'),
        ripple: await b.locator('.ripple').count(),
        opacity: await css(b, 'opacity'),
      };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('item-pressed-container-color')));
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
    // The ripple grows over the feedback duration and fades over the state duration, from the center for a key.
    await mountFixtures(page, spec, { system: 'm3-like', icons: true, fixtures: [fixture('default')] });
    await control(page, 'default', 'next').focus();
    await page.keyboard.down('Enter');
    const layer = await control(page, 'default', 'next')
      .locator('.ripple')
      .evaluate((el) => {
        const st = getComputedStyle(el);
        return {
          x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width,
          grow: Number.parseFloat(st.animationDuration) * 1000,
          fade: Number.parseFloat(st.transitionDuration) * 1000,
          radius: st.borderTopLeftRadius,
          container: getComputedStyle(el.parentElement!).borderTopLeftRadius,
        };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(layer.radius).toBe(layer.container);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await css(control(page, 'default', 'next').locator('.ripple'), 'animation-name')).toBe('none');
    await page.keyboard.up('Enter');
  });

  test('PGN-17 corner smoothing and focus-style: cupertino eases the item corners, the ring concentric; acme shows focus as a glow', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino', icons: true, fixtures: [fixture('default')] });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const b = pageItem(page, 'default', 3);
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      // A fully rounded item draws round caps whatever the smoothing; a radius below full is eased.
      const pill = (await token(page, T('container-shape-pill'))) === '1';
      const shapeOf = await css(b, 'corner-top-left-shape');
      if (pill) expect(shapeOf).toMatch(/superellipse\(1\)|round/);
      else expect(Number.parseFloat(shapeOf.replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      await tabTo(page, b);
      expect(await css(b, 'corner-top-left-shape', '::after')).toBe(shapeOf);
    }
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fixture('default')] });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const g = pageItem(page, 'default', 3);
    await tabTo(page, g);
    expect(await css(g, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(g, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    await expect(g).toHaveAttribute('data-focus-style', 'glow');
  });

  test('PGN-18: an item changes between states over the state motion, and at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default')] });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const b = pageItem(page, 'default', 3);
    const properties = (await css(b, 'transition-property')).split(', ');
    const durations = (await css(b, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000);
    for (const p of ['background-color', 'color', 'opacity']) {
      expect(properties, p).toContain(p);
      expect(durations[properties.indexOf(p) % durations.length], p).toBe(duration);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(b, 'transition-duration')).toBe('0s');
  });

  test('PGN-18: a new current page — in every fixture that draws more than one page, the item that was current and the item that becomes current change between their states over the state motion', async ({ page }) => {
    const all = spec.fixtures.filter((f) => Number(f.props?.count) > 1);
    expect(all.length).toBe(spec.fixtures.length - 1);
    await mountFixtures(page, spec, { icons: true, fixtures: all });
    await page.mouse.move(0, 0);
    for (const f of all) {
      const el = host(page, f.id);
      // The nearest page shown whose item, and the current one's, keep their places in the row — or, where every page
      // shown moves the row (the middle of it), the nearest one of which either keeps its place: an item the row uses
      // for another page is drawn at once (the next test). The compact form draws no pages: its previous control
      // changes state instead (enabled, or disabled on page 1).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const chosen = await el.evaluate(async (pagination: any) => {
        const at = () => [...pagination.shadowRoot.querySelectorAll('.row > li')].map((li: Element) => li.querySelector('.item:not(.control)')?.getAttribute('data-page') ?? null);
        const from = pagination.page as number;
        const before = at();
        if (!before.some(Boolean)) return { to: from === 1 ? 2 : 1, was: '.row .item[data-control="previous"]', now: '' };
        const shown = before.filter(Boolean).map(Number).filter((n) => n !== from).sort((a, b) => Math.abs(a - from) - Math.abs(b - from));
        const kept: { to: number; was: string; now: string }[] = [];
        for (const to of shown) {
          pagination.page = to;
          await pagination.updateComplete;
          const after = at();
          pagination.page = from;
          await pagination.updateComplete;
          const keeps = (n: number) => before.indexOf(String(n)) === after.indexOf(String(n));
          const item = (n: number) => `.row .item:not(.control)[data-page="${n}"]`;
          if (keeps(from) || keeps(to)) kept.push({ to, was: keeps(from) ? item(from) : '', now: keeps(to) ? item(to) : '' });
        }
        return kept.find((each) => each.was && each.now) ?? kept[0] ?? null;
      });
      expect(chosen, f.id).not.toBeNull();
      await el.evaluate((pagination: HTMLElement, c) => {
        pagination.dataset.was = c!.was;
        pagination.dataset.now = c!.now;
        return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      }, chosen);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const seen = await sampleFrames(el, () => el.evaluate((pagination: any, to) => (pagination.page = to), chosen!.to), {
        elements: false,
        probe: (root) => {
          // What the item draws — its fill, its number's or arrow's color, its opacity — as one number that changes
          // whenever any of them does.
          const read = (selector: string | undefined) => {
            const item = selector ? root.shadowRoot!.querySelector(selector) : null;
            if (!item) return 0;
            const c = getComputedStyle(item);
            const glyph = item.querySelector('.glyph');
            const drawn = `${c.backgroundColor} ${c.color} ${c.opacity} ${glyph ? getComputedStyle(glyph).color : ''}`;
            return (drawn.match(/[\d.]+/g) ?? []).reduce((sum, n, i) => sum + Number(n) * (i + 1), 0);
          };
          return { was: read((root as HTMLElement).dataset.was), now: read((root as HTMLElement).dataset.now) };
        },
      });
      if (chosen!.was) expectAnimated(seen, 'was');
      if (chosen!.now) expectAnimated(seen, 'now');
      await expect(el, f.id).toHaveJSProperty('page', chosen!.to);
    }
  });

  test('PGN-18: an item the row uses for another page is drawn as that page at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default')] });
    await page.mouse.move(0, 0);
    const el = host(page, 'default');
    expect(await pages(page, 'default')).toEqual(['1', '2', '3', '4', '5', '…', '10']);
    // Page 6 draws 1 … 5 6 7 … 10: the item in the fourth place of the pages, which drew page 4, draws the current page
    // 6; the first keeps page 1 and loses its fill over the motion.
    const seen = await sampleFrames(el, () => el.evaluate((pagination: any) => (pagination.page = 6)), {
      elements: false,
      probe: (root) => {
        const read = (selector: string) => {
          const item = root.shadowRoot!.querySelector(selector)!;
          return `${item.getAttribute('data-page')} ${getComputedStyle(item).backgroundColor}`;
        };
        const fill = (getComputedStyle(root.shadowRoot!.querySelector('.row > li:nth-child(2) .item')!).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
        return { first: fill.reduce((sum, n, i) => sum + n * (i + 1), 0), fourth: read('.row > li:nth-child(5) .item') };
      },
    });
    expect(await pages(page, 'default')).toEqual(['1', '…', '5', '6', '7', '…', '10']);
    expectAnimated(seen, 'first');
    const fourth = [seen.before, ...seen.frames, seen.rest].map((frame) => frame.probe.fourth).filter((value, i, all) => i === 0 || value !== all[i - 1]);
    expect(fourth).toEqual([`4 ${await resolveColor(page, T('item-container-color'))}`, `6 ${await resolveColor(page, T('current-container-color'))}`]);
  });

  test('PGN-20: an item smaller than the minimum target reaches it on both axes — touch and fine pointer — without changing its size, and toward a neighbour no further than half the gap', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('small')] });
    const [small, pointer, gap] = await Promise.all([T('container-height-small'), '--tanrei-sys-target-pointer', T('gap')].map((n) => resolveToken(page, n)));
    const item = pageItem(page, 'small', 2);
    const box = await bounds(item);
    expect(box.height).toBeCloseTo(small, 1);
    const target = (locator: Locator) =>
      locator.evaluate((el) => {
        const r = getComputedStyle(el, '::before');
        return { width: Number.parseFloat(r.width), height: Number.parseFloat(r.height) };
      });
    expect((await target(item)).height).toBeCloseTo(Math.max(small, pointer), 1);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    // The spec's verify: a small item is 32 high and its hit area 44 for touch.
    expect(small).toBe(32);
    await expect.poll(async () => (await target(item)).height).toBeCloseTo(touch, 1);
    expect((await bounds(item)).height).toBeCloseTo(small, 1);
    // Along the row: half the gap on each side, so no two hit areas overlap.
    expect((await target(item)).width).toBeCloseTo(box.width + gap, 1);
    // At the row's start: the whole reach toward the outside.
    const first = control(page, 'small', 'previous');
    const firstBox = await bounds(first);
    expect((await target(first)).width).toBeCloseTo(firstBox.width + gap / 2 + Math.max(0, (touch - firstBox.width) / 2), 1);
  });

  test('PGN-21: forced colors draw the numbers and arrows in the text or link color, the current page in the highlight colors, a disabled control in the disabled text color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('default'), fixture('links-first'), fixture('compact')] });
    await page.emulateMedia({ forcedColors: 'active' });
    test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), 'this browser does not emulate forced colors');
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;forced-color-adjust:none;color:${n};background:${n}`;
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    // The spec's verify: the current page is Highlight with HighlightText; a disabled control is GrayText.
    const current = pageItem(page, 'default', 1);
    expect(await settledCss(current, 'background-color')).toBe(await system('Highlight'));
    expect(await settledCss(current, 'color')).toBe(await system('HighlightText'));
    expect(await settledCss(control(page, 'default', 'previous').locator('.glyph'), 'color')).toBe(await system('GrayText'));
    expect(await settledCss(pageItem(page, 'default', 2), 'color')).toBe(await system('CanvasText'));
    expect(await settledCss(pageItem(page, 'links-first', 2), 'color')).toBe(await system('LinkText'));
    expect(await settledCss(host(page, 'compact').locator('.row .count'), 'color')).toBe(await system('CanvasText'));
    await tabTo(page, pageItem(page, 'default', 2));
    expect(await css(pageItem(page, 'default', 2), 'outline-color')).toBe(await system('Highlight'));
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(400); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// <tanrei-modal-layer>, driven by specs/modal-layer.spec.json: every behaviour id (MDL-1…12) is cited by a test title,
// every fixture has a baseline (the 640 × 640 window, since the layer and its scrim are in the top layer), and every
// value is read back from the tokens — never from a number written here. The components built from the layer (the
// dialog, the sheets, the drawer, the picker, the search) are held to its tokens here too: one value changes them all.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, dialogWindow, loadSpec, mountFixtures, resolveColor, resolveToken, rootTokens, tab } from '../../../test/harness.js';

const spec = loadSpec('modal-layer');
type P = Page;
const WINDOW = { width: 640, height: 640 };
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > tanrei-modal-layer`);
const container = (page: P, id: string) => host(page, id).locator('dialog');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const T = (name: string) => `--tanrei-comp-modal-layer-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
/** What debug builds report: warnings and errors. */
function reports(page: P) {
  const seen: { type: string; text: string }[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push({ type: message.type(), text: message.text() });
  });
  return seen;
}
const isOpen = (page: P, id: string) => container(page, id).evaluate((el) => (el as HTMLDialogElement).open);
/** The deepest focused element: its id, the layer's container (`container`), or its tag. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return null;
    if (active.localName === 'dialog') return 'container';
    return active.id || active.localName;
  });

/** A closed layer fixture with an opener button before it; every close request is logged with its reason. */
const f = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { label: 'Export photos', ...props },
  content: '<button id="first-' + id + '">First</button> <button id="last-' + id + '">Last</button>',
  ...extra,
});
async function mount(page: P, fixtures: Fixture[]) {
  await page.setViewportSize(WINDOW);
  await mountFixtures(page, spec, { fixtures });
  await page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const layer of document.querySelectorAll<any>('[data-fixture] > tanrei-modal-layer')) {
      const id = layer.closest('[data-fixture]')?.dataset.fixture ?? layer.id;
      layer.insertAdjacentHTML('beforebegin', `<button id="open-${id}">Open ${id}</button>`);
      document.getElementById(`open-${id}`)!.addEventListener('click', () => (layer.open = true));
      layer.addEventListener('close', (event: CustomEvent) => log.push(`${id}:${event.detail.reason}`));
    }
  });
}
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
async function open(page: P, id: string) {
  await page.locator(`#open-${id}`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => isOpen(page, id)).toBe(true);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}
const close = (page: P, id: string) => host(page, id).evaluate((el: any) => (el.open = false));

test.describe('presentation', () => {
  test('MDL-1: open, the container is in the top layer over the scrim of its color, which covers the whole window; its blur is the token’s', async ({ page }) => {
    await mount(page, [f('l')]);
    await open(page, 'l');
    expect(await container(page, 'l').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(container(page, 'l'), 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    // No blur in the default system: a radius of 0.
    expect(await css(container(page, 'l'), 'backdrop-filter', '::backdrop')).toBe('blur(0px)');
    // The whole window: a point at each corner is the scrim (the layer's backdrop), not the page.
    for (const [x, y] of [[1, 1], [WINDOW.width - 2, 1], [1, WINDOW.height - 2], [WINDOW.width - 2, WINDOW.height - 2]]) {
      expect(await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.localName, [x, y])).toBe('tanrei-modal-layer');
    }
    // A system that blurs: what lies behind is blurred by that radius.
    await rootTokens(page, { [T('scrim-blur')]: '6px' });
    expect(await css(container(page, 'l'), 'backdrop-filter', '::backdrop')).toBe('blur(6px)');
  });

  test('MDL-1, MDL-2: without the scrim nothing is drawn behind the container, and it still blocks what is behind', async ({ page }) => {
    await mount(page, [f('bare', { scrim: false })]);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="behind" style="position:fixed;inset-block-start:0;inset-inline-start:0">Behind</button>');
      document.getElementById('behind')!.addEventListener('click', () => (window as any).log.push('behind:click'));
    });
    await open(page, 'bare');
    expect(await css(container(page, 'bare'), 'background-color', '::backdrop')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(container(page, 'bare'), 'backdrop-filter', '::backdrop')).toBe('none');
    const behind = await bounds(page.locator('#behind'));
    await page.mouse.click(behind.x + 4, behind.y + 4);
    expect(await log(page)).toEqual(['bare:scrim']);
  });

  test('MDL-2: everything outside is inert and the page does not scroll until it closes; then both are as before', async ({ page }) => {
    await mount(page, [f('l')]);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div><button id="elsewhere">Elsewhere</button>'));
    await open(page, 'l');
    await page.locator('#elsewhere').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page)).not.toBe('elsewhere');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await close(page, 'l');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('visible');
    await page.locator('#elsewhere').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page)).toBe('elsewhere');
  });

  test('MDL-11: the container draws nothing, is the size of its content, centred in the window, takes the page’s color, and is placed by ::part(container)', async ({ page }) => {
    await mount(page, [f('l')]);
    await open(page, 'l');
    const box = container(page, 'l');
    expect(await css(box, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(box, 'box-shadow')).toBe('none');
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(await css(box, `padding-${side}`)).toBe('0px');
      expect(await css(box, `border-${side}-width`)).toBe('0px');
    }
    expect(await css(box, 'color')).toBe(await page.evaluate(() => getComputedStyle(document.body).color));
    const rect = await bounds(box);
    const first = await bounds(page.locator('#first-l'));
    const last = await bounds(page.locator('#last-l'));
    // As large as its content (the two buttons on their line), centred.
    expect(Math.abs(rect.width - (last.x + last.width - first.x))).toBeLessThan(1.5);
    expect(Math.abs(rect.x + rect.width / 2 - WINDOW.width / 2)).toBeLessThan(1);
    expect(Math.abs(rect.y + rect.height / 2 - WINDOW.height / 2)).toBeLessThan(1);
    // The product places it: at the start of the window's top edge.
    await page.addStyleTag({ content: 'tanrei-modal-layer::part(container) { margin: 0; }' });
    const placed = await bounds(box);
    expect(placed.x).toBeLessThan(1);
    expect(placed.y).toBeLessThan(1);
  });

  test('MDL-11: content larger than the window scrolls inside the container, which stays inside the window', async ({ page }) => {
    await mount(page, [f('tall', {}, { content: '<div style="block-size: 2000px; inline-size: 100px"></div>' })]);
    await open(page, 'tall');
    const rect = await bounds(container(page, 'tall'));
    expect(rect.height).toBeLessThanOrEqual(WINDOW.height + 0.5);
    expect(await container(page, 'tall').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test('MDL-12: the direction comes from where it is used, and nothing is mirrored: the container stays centred in right-to-left', async ({ page }) => {
    await mount(page, [f('l')]);
    await page.evaluate(() => document.querySelector('[data-fixture="l"]')!.setAttribute('dir', 'rtl'));
    await open(page, 'l');
    const rect = await bounds(container(page, 'l'));
    expect(Math.abs(rect.x + rect.width / 2 - WINDOW.width / 2)).toBeLessThan(1);
    expect(await container(page, 'l').evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    // The content follows the direction: the first button is at the right.
    const first = await bounds(page.locator('#first-l'));
    const last = await bounds(page.locator('#last-l'));
    expect(first.x).toBeGreaterThan(last.x);
  });
});

test.describe('focus', () => {
  test('MDL-3: focus goes to the element marked autofocus, or to the container; the next Tab reaches the first focusable element', async ({ page }) => {
    await mount(page, [f('plain'), f('marked', {}, { content: '<button id="a">A</button><input id="field" aria-label="Name" autofocus>' })]);
    await open(page, 'plain');
    expect(await focused(page)).toBe('container');
    await tab(page);
    expect(await focused(page)).toBe('first-plain');
    await close(page, 'plain');
    await open(page, 'marked');
    expect(await focused(page)).toBe('field');
  });

  test('MDL-3: written open, it moves focus in as if it had just opened', async ({ page }) => {
    await page.setViewportSize(WINDOW);
    await mountFixtures(page, spec, { fixtures: [f('written', { open: true })] });
    await expect.poll(() => focused(page)).toBe('container');
  });

  test('MDL-4: Tab and Shift+Tab wrap inside; with nothing focusable the container keeps focus', async ({ page }) => {
    await mount(page, [f('l'), f('empty', {}, { content: 'Nothing to press.' })]);
    await open(page, 'l');
    await tab(page);
    expect(await focused(page)).toBe('first-l');
    await tab(page);
    expect(await focused(page)).toBe('last-l');
    await tab(page);
    expect(await focused(page)).toBe('first-l');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('last-l');
    await close(page, 'l');
    await open(page, 'empty');
    await tab(page);
    expect(await focused(page)).toBe('container');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('container');
  });

  test('MDL-5: closing returns focus to the element that had it; when that element is gone, focus is dropped', async ({ page }) => {
    await mount(page, [f('l')]);
    await open(page, 'l');
    await close(page, 'l');
    await expect.poll(() => focused(page)).toBe('open-l');
    await open(page, 'l');
    await page.evaluate(() => document.getElementById('open-l')!.remove());
    await close(page, 'l');
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});

test.describe('closing', () => {
  test('MDL-6: while dismissible, Escape, back and a press on the scrim ask to close once each with the reason, and it stays open until open is false', async ({ page }) => {
    await mount(page, [f('l')]);
    await open(page, 'l');
    // The platform's back: a close request without a key, which reaches the native dialog as cancel (asked first: a
    // cancel within a second of an Escape is that Escape's).
    await container(page, 'l').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4); // the scrim
    expect(await log(page)).toEqual(['l:back', 'l:escape', 'l:scrim']);
    expect(await isOpen(page, 'l')).toBe(true);
    // A press that starts inside the container and ends on the scrim is not a press on the scrim.
    const first = await bounds(page.locator('#first-l'));
    await page.mouse.move(first.x + 4, first.y + 4);
    await page.mouse.down();
    await page.mouse.move(4, 4);
    await page.mouse.up();
    expect(await log(page)).toEqual(['l:back', 'l:escape', 'l:scrim']);
    await close(page, 'l');
    await expect.poll(() => isOpen(page, 'l')).toBe(false);
  });

  test('MDL-6: an Escape that an element inside takes goes no further; closedby none ignores every way and the scrim still blocks', async ({ page }) => {
    await mount(page, [f('l', {}, { content: '<input id="search" aria-label="Search">' }), f('fixed', { dismissible: false })]);
    await page.evaluate(() => {
      document.getElementById('search')!.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') event.preventDefault();
      });
    });
    await open(page, 'l');
    await page.locator('#search').focus();
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual([]);
    await close(page, 'l');
    await open(page, 'fixed');
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4);
    await container(page, 'fixed').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(await log(page)).toEqual([]);
    expect(await isOpen(page, 'fixed')).toBe(true);
    expect(await page.evaluate(() => document.elementFromPoint(4, 4)?.localName)).toBe('tanrei-modal-layer');
  });

  test('MDL-8: a layer opened from another stacks above it with its own scrim; Escape reaches only the top one, and focus returns inside the first', async ({ page }) => {
    await mount(page, [f('outer', {}, { content: '<button id="inner-opener">More</button>' })]);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<tanrei-modal-layer id="inner" label="Are you sure?"><button id="ok">OK</button></tanrei-modal-layer>');
      const inner: any = document.getElementById('inner');
      document.getElementById('inner-opener')!.addEventListener('click', () => (inner.open = true));
      inner.addEventListener('close', (event: CustomEvent) => {
        (window as any).log.push(`inner:${event.detail.reason}`);
        inner.open = false;
      });
    });
    await open(page, 'outer');
    await page.locator('#inner-opener').focus();
    await page.keyboard.press('Enter');
    const inner = page.locator('#inner').locator('dialog');
    await expect.poll(() => inner.evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
    expect(await inner.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(inner, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    // The inner one is on top: a point over the outer's button hits the inner layer.
    const opener = await bounds(page.locator('#inner-opener'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [opener.x + 4, opener.y + 4])).toBe('inner');
    await page.keyboard.press('Escape');
    await expect.poll(() => inner.evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);
    expect(await isOpen(page, 'outer')).toBe(true);
    await expect(page.locator('#inner-opener')).toBeFocused();
    expect(await log(page)).toEqual(['inner:escape']);
  });

  test('MDL-9: a popover opened from inside the container is above the layer and operable, and a press in it is not a press on the scrim', async ({ page }) => {
    await mount(page, [f('l', {}, { content: '<button id="anchor">Options</button><tanrei-popover anchor="anchor" label="Options"><button id="inside">Inside</button></tanrei-popover>' })]);
    await open(page, 'l');
    // The popover grows in from its anchor's edge over its open motion (POP-1), so a point measured while it grows lies
    // elsewhere in the grown box: the press is aimed at #inside where it rests, once every motion in the popover is over.
    // Opened and waited for in one task: reading the animations flushes the style that starts them.
    await page.locator('tanrei-popover').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
      await Promise.all([...el.shadowRoot.querySelectorAll('*')].flatMap((part: Element) => part.getAnimations()).map((a: Animation) => a.finished));
    });
    const inside = page.locator('#inside');
    await expect(inside).toBeVisible();
    const box = await bounds(inside);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [box.x + box.width / 2, box.y + box.height / 2])).toBe('inside');
    await inside.evaluate((el) => el.addEventListener('click', () => (window as any).log.push('inside:click')));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await log(page)).toEqual(['inside:click']);
    expect(await isOpen(page, 'l')).toBe(true);
  });
});

test.describe('motion', () => {
  test('MDL-7: the scrim and the container fade in over the enter motion and out over the exit motion, still drawn until the fade ends; reduced motion still fades', async ({ page }) => {
    await mount(page, [f('l')]);
    await open(page, 'l');
    const enter = await resolveToken(page, T('motion-enter-duration'), 'duration');
    const exit = await resolveToken(page, T('motion-exit-duration'), 'duration');
    const ms = (value: string) => Number.parseFloat(value) * 1000;
    expect(ms(await css(container(page, 'l'), 'transition-duration'))).toBe(enter);
    expect(ms(await css(container(page, 'l'), 'transition-duration', '::backdrop'))).toBe(enter);
    expect(await css(container(page, 'l'), 'transition-property')).toContain('opacity');
    await close(page, 'l');
    // Closed, it fades out over the exit motion — still displayed while it runs, where the browser can keep a closed
    // dialog in the top layer for its transition (the `overlay` property; the spec's web note says what happens without).
    if (await page.evaluate(() => CSS.supports('overlay', 'auto'))) expect(await css(container(page, 'l'), 'display')).not.toBe('none');
    expect(ms(await css(container(page, 'l'), 'transition-duration'))).toBe(exit);
    await expect.poll(() => css(container(page, 'l'), 'display')).toBe('none');
    // Reduced motion: opacity is all that moves, so it still fades, over the same times.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 'l');
    expect(ms(await css(container(page, 'l'), 'transition-duration'))).toBe(enter);
    expect(await css(container(page, 'l'), 'scale')).toBe('none');
    expect(await css(container(page, 'l'), 'translate')).toBe('none');
  });

  test('MDL-1, MDL-7: the components built from the layer take its scrim and its tempo — one value changes every modal surface', async ({ page }) => {
    const members: { name: string; tag: string; pick: (fixture: Fixture) => boolean; window: { width: number; height: number }; scrim: string; enter: string }[] = [
      { name: 'dialog', tag: 'tanrei-dialog', pick: (fx) => fx.id === 'basic', window: dialogWindow('basic'), scrim: 'dialog', enter: 'dialog-motion-enter-duration' },
      { name: 'bottom-sheet', tag: 'tanrei-bottom-sheet', pick: (fx) => fx.id === 'modal', window: { width: 400, height: 720 }, scrim: 'bottom-sheet', enter: 'bottom-sheet-motion-enter-duration' },
      { name: 'side-sheet', tag: 'tanrei-side-sheet', pick: (fx) => fx.id === 'modal', window: { width: 720, height: 480 }, scrim: 'side-sheet', enter: 'side-sheet-motion-enter-duration' },
    ];
    for (const member of members) {
      const memberSpec = loadSpec(member.name);
      await page.setViewportSize(member.window);
      await mountFixtures(page, memberSpec, { icons: true, fixtures: memberSpec.fixtures.filter(member.pick) });
      const backdrop = page.locator(member.tag).locator('dialog').first();
      await expect.poll(() => backdrop.evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
      await rootTokens(page, { [T('scrim-color')]: 'rgb(10, 20, 30)', [T('scrim-blur')]: '5px', [T('motion-enter-duration')]: '321ms' });
      expect(await css(backdrop, 'background-color', '::backdrop'), member.name).toBe('rgb(10, 20, 30)');
      expect(await css(backdrop, 'backdrop-filter', '::backdrop'), member.name).toBe('blur(5px)');
      expect(await resolveToken(page, `--tanrei-comp-${member.enter}`, 'duration'), member.name).toBe(321);
      expect(await resolveColor(page, `--tanrei-comp-${member.scrim}-scrim-color`), member.name).toBe('rgb(10, 20, 30)');
    }
  });
});

test.describe('accessibility', () => {
  test('MDL-10: the container is a modal dialog named by the label; an empty label still opens and is reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [f('l'), f('nameless', { label: '' })]);
    await open(page, 'l');
    await expect(page.getByRole('dialog', { name: 'Export photos' })).toHaveCount(1);
    expect(await container(page, 'l').evaluate((el) => el.matches(':modal'))).toBe(true);
    await close(page, 'l');
    await open(page, 'nameless');
    expect(await isOpen(page, 'nameless')).toBe(true);
    await expect.poll(() => seen.filter((w) => w.text.includes('MDL-10')).length).toBe(1);
  });

  test('no axe violations in light and dark, with and without the scrim', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      for (const fixture of spec.fixtures) {
        await page.setViewportSize(WINDOW);
        await mountFixtures(page, spec, { theme, fixtures: [fixture] });
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations, `${theme} ${fixture.id}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    }
  });
});

test.describe('fixtures', () => {
  // One at a time in its 640 × 640 window; the baseline is the window, because the layer and its scrim are in the top layer.
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await page.setViewportSize(WINDOW);
      await mountFixtures(page, spec, { fixtures: [fixture] });
      await expect.poll(() => isOpen(page, fixture.id)).toBe(true);
      await container(page, fixture.id).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      await expect(page).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});

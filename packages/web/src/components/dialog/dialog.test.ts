// <tanrei-dialog>, driven by specs/dialog.spec.json: every behaviour id (DLG-1…24) is cited by a test title, every
// fixture has a baseline (the 640 × 640 window, 360 × 640 for the compact ones, since the dialog and its scrim are in the
// top layer), and every value is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { watchTransitions, transitionsRun } from '../../../test/transitions.js';
import { type Fixture, type FixtureItem, dialogWindow, innerStrokeAtEdges, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('dialog');
type P = Page;
const WIDE = dialogWindow('basic');
const COMPACT = dialogWindow('compact');
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > tanrei-dialog`);
const dialog = (page: P, id: string) => host(page, id).locator('dialog');
const action = (page: P, id: string, label: string) => host(page, id).locator('tanrei-button', { hasText: label });
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-dialog-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);
/** What debug builds report: warnings and errors, by the behaviour id they end with. */
function reports(page: P) {
  const seen: { type: string; text: string }[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push({ type: message.type(), text: message.text() });
  });
  return seen;
}
const isOpen = (page: P, id: string) => dialog(page, id).evaluate((el) => (el as HTMLDialogElement).open);
/** The deepest focused element: its id, a dialog's `dialog`, or its text. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return null;
    if (active.localName === 'dialog') return 'dialog';
    return active.id || (active.getRootNode() as ShadowRoot).host?.textContent?.trim() || active.localName;
  });

const act = (content: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'action', props, content });
const CANCEL_DISCARD = [act('Cancel', { dismissive: true }), act('Discard', { confirming: true })];
/** A closed dialog fixture with an opener button before it; every cancel, close and action is logged. */
const f = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { headline: 'Discard draft?', supportingText: 'The message you were writing will be deleted from this device.', ...props },
  items: CANCEL_DISCARD,
  ...extra,
});
/** The spec's own fixture, closed, so that a test opens it. */
const closed = (id: string): Fixture => {
  const fixture = spec.fixtures.find((fx) => fx.id === id)!;
  return { ...fixture, props: { ...fixture.props, open: false } };
};
async function mount(page: P, fixtures: Fixture[], window = WIDE) {
  await page.setViewportSize(window);
  await mountFixtures(page, spec, { icons: true, fixtures });
  await page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const d of document.querySelectorAll<any>('tanrei-dialog')) {
      if (d.parentElement?.closest('tanrei-dialog')) continue; // a nested one is opened by its test
      const id = d.closest('[data-fixture]')?.dataset.fixture ?? d.id;
      d.insertAdjacentHTML('beforebegin', `<button id="open-${id}">Open ${id}</button>`);
      document.getElementById(`open-${id}`)!.addEventListener('click', () => (d.open = true));
      d.addEventListener('cancel', () => log.push(`${id}:cancel`));
      d.addEventListener('close', () => log.push(`${id}:close`));
      for (const b of d.querySelectorAll('[slot="actions"]')) b.addEventListener('click', () => log.push(`${id}:${b.textContent.trim()}`));
    }
  });
}
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
async function open(page: P, id: string) {
  await page.locator(`#open-${id}`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => isOpen(page, id)).toBe(true);
  // Measured once the enter motion is over.
  await dialog(page, id).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}
const close = (page: P, id: string) => host(page, id).evaluate((el: any) => (el.open = false));
/** The Tab order inside an open dialog, from the dialog itself. */
async function tabOrder(page: P, id: string, count: number) {
  await dialog(page, id).evaluate((el) => (el as HTMLElement).focus());
  const order: string[] = [];
  for (let i = 0; i < count; i++) {
    await tab(page);
    order.push((await focused(page)) as string);
  }
  return order;
}

test.describe('presentation and focus', () => {
  test('DLG-1: opening presents it in the top layer over the scrim of its color, makes everything else inert and holds the page’s scroll until it closes', async ({ page }) => {
    await mount(page, [f('d')]);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div><button id="elsewhere">Elsewhere</button>'));
    await open(page, 'd');
    expect(await dialog(page, 'd').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(dialog(page, 'd'), 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    // The whole window: a point at the corner is the scrim (the dialog's backdrop), not the page.
    expect(await page.evaluate(() => document.elementFromPoint(2, 2)?.localName)).toBe('tanrei-dialog');
    await page.locator('#elsewhere').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page)).not.toBe('elsewhere');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await close(page, 'd');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('visible');
    await page.locator('#elsewhere').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page)).toBe('elsewhere');
  });

  test('DLG-2: focus goes to the element marked autofocus, or to the dialog itself; the next Tab reaches the first focusable element', async ({ page }) => {
    await mount(page, [f('plain'), f('marked', {}, { content: '<input id="field" aria-label="Name" autofocus>' })]);
    await open(page, 'plain');
    expect(await focused(page)).toBe('dialog');
    await tab(page);
    expect(await focused(page)).toBe('Cancel');
    await close(page, 'plain');
    await open(page, 'marked');
    expect(await focused(page)).toBe('field');
  });

  test('DLG-3: focus stays inside — Tab from the last goes to the first, Shift+Tab from the first to the last', async ({ page }) => {
    await mount(page, [f('d', {}, { content: '<input id="field" aria-label="Name">' })]);
    await open(page, 'd');
    expect(await tabOrder(page, 'd', 4)).toEqual(['field', 'Cancel', 'Discard', 'field']);
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Discard');
    // From the dialog itself, Shift+Tab goes to the last.
    await dialog(page, 'd').evaluate((el) => (el as HTMLElement).focus());
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Discard');
  });

  test('DLG-4: closing returns focus to the element that had it, or — when that is gone — leaves none inside the dialog', async ({ page }) => {
    await mount(page, [f('d')]);
    await open(page, 'd');
    await close(page, 'd');
    await expect(page.locator('#open-d')).toBeFocused();
    await open(page, 'd');
    await page.locator('#open-d').evaluate((el) => el.remove());
    await close(page, 'd');
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('body');
  });

  test('DLG-5: while dismissible, Escape, back and a press on the scrim fire cancel once and it closes unless cancel is prevented; closedby none ignores them; close follows every close', async ({ page }) => {
    await mount(page, [f('d'), f('fixed', { dismissible: false })]);
    await open(page, 'd');
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    await expect(host(page, 'd')).not.toHaveAttribute('open');
    await open(page, 'd');
    await page.mouse.click(4, 4); // the scrim
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    await open(page, 'd');
    // The platform's back: a close request without a key, which reaches the native dialog as cancel.
    await dialog(page, 'd').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    expect(await log(page)).toEqual(['d:cancel', 'd:close', 'd:cancel', 'd:close', 'd:cancel', 'd:close']);
    // Cancelled: it stays open.
    await page.evaluate(() => document.querySelector('[data-fixture="d"] tanrei-dialog')!.addEventListener('cancel', (e) => e.preventDefault()));
    await open(page, 'd');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    expect(await isOpen(page, 'd')).toBe(true);
    expect((await log(page)).slice(6)).toEqual(['d:cancel', 'd:cancel', 'd:cancel']);
    // A press that starts inside the dialog and ends on the scrim is not a press on the scrim.
    const box = await bounds(dialog(page, 'd'));
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(4, 4);
    await page.mouse.up();
    expect((await log(page)).length).toBe(9);
    await close(page, 'd');
    // Not dismissible: nothing.
    await open(page, 'fixed');
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4);
    await dialog(page, 'fixed').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(await isOpen(page, 'fixed')).toBe(true);
    expect((await log(page)).filter((e) => e.startsWith('fixed'))).toEqual([]);
    await expect(host(page, 'fixed')).toHaveAttribute('closedby', 'none');
  });

  test('DLG-6: activating an action does not close the dialog', async ({ page }) => {
    await mount(page, [f('d')]);
    await open(page, 'd');
    await action(page, 'd', 'Discard').click();
    expect(await isOpen(page, 'd')).toBe(true);
    expect(await log(page)).toEqual(['d:Discard']);
  });

  test('DLG-13: centred, it fades and grows in over the enter motion, fades out over the exit motion, and only fades where motion is reduced; focus moves at once', async ({ page }) => {
    await mount(page, [f('d')]);
    // The motions at 40 s, ended by hand: the opacity and the scale are read 'on their way' three to five answers after
    // the opening, and at 2 s a runner that takes half a second an answer read a dialog that had arrived. The durations
    // are read from the transitions after the override, so the binding to the tokens is still what is proved.
    await override(page, { [T('motion-enter-duration')]: '40s', [T('motion-exit-duration')]: '40s' });
    await page.locator('#open-d').focus();
    await host(page, 'd').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    // Focus has already moved, while the motion runs.
    expect(await focused(page)).toBe('dialog');
    const running = await dialog(page, 'd').evaluate((el) =>
      el.getAnimations().map((a) => ({ property: (a as CSSTransition).transitionProperty, duration: a.effect!.getTiming().duration })),
    );
    expect(running).toEqual(expect.arrayContaining([{ property: 'opacity', duration: 40_000 }, { property: 'scale', duration: 40_000 }]));
    expect(running.map((r) => r.property)).not.toContain('translate');
    expect(Number(await css(dialog(page, 'd'), 'opacity'))).toBeLessThan(1);
    expect(Number.parseFloat(await css(dialog(page, 'd'), 'scale'))).toBeLessThan(1);
    expect(Number.parseFloat(await css(dialog(page, 'd'), 'scale'))).toBeGreaterThanOrEqual(Number(await token(page, T('motion-enter-scale'))) - 0.001);
    await dialog(page, 'd').evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    await close(page, 'd');
    await expect(page.locator('#open-d')).toBeFocused();
    await dialog(page, 'd').evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [f('d')]);
    // (Opened and read in one step, as the close of the compact dialog is: nothing of the test stands between the
    // opening and what moves at it.)
    const reduced = await host(page, 'd').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
      return (el.shadowRoot.querySelector('dialog') as HTMLElement).getAnimations().map((a) => (a as CSSTransition).transitionProperty);
    });
    expect(reduced).toContain('opacity');
    expect(reduced).not.toContain('scale');
    // The tokens' own durations.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mount(page, [f('d')]);
    expect(Number.parseFloat(await css(dialog(page, 'd'), 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-exit-duration'), 'duration'));
    await open(page, 'd');
    expect(Number.parseFloat(await css(dialog(page, 'd'), 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-enter-duration'), 'duration'));
  });

  test('DLG-14: a dialog, or an alertdialog, named by the headline and described by the supporting text; an empty headline still opens and is reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [f('d'), f('alert', { alert: true, headline: 'Connection lost' }), f('nameless', { headline: '' })]);
    await open(page, 'd');
    await expect(page.getByRole('dialog', { name: 'Discard draft?' })).toHaveAttribute('aria-describedby', 'supporting');
    expect(await page.getByRole('dialog').evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById('supporting')?.textContent)).toBe('The message you were writing will be deleted from this device.');
    await close(page, 'd');
    await open(page, 'alert');
    await expect(page.getByRole('alertdialog', { name: 'Connection lost' })).toHaveCount(1);
    await close(page, 'alert');
    await open(page, 'nameless');
    await expect.poll(() => seen.filter((w) => w.text.includes('DLG-14')).length).toBe(1);
  });

  test('DLG-15: a dialog opened from another stacks above it with its own scrim, the first inert; Escape dismisses only the top one, and focus returns inside the first', async ({ page }) => {
    await mount(page, [f('outer', {}, { content: '<button id="inner-opener">More</button>' })]);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<tanrei-dialog id="inner" headline="Are you sure?"><tanrei-button slot="actions" confirming>OK</tanrei-button></tanrei-dialog>');
      const inner: any = document.getElementById('inner');
      document.getElementById('inner-opener')!.addEventListener('click', () => (inner.open = true));
      inner.addEventListener('close', () => (window as any).log.push('inner:close'));
    });
    await open(page, 'outer');
    await page.locator('#inner-opener').focus();
    await page.keyboard.press('Enter');
    const innerDialog = page.locator('#inner').locator('dialog');
    await expect.poll(() => innerDialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
    expect(await innerDialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(innerDialog, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    // The inner one is on top: the outer's controls are not what a point over them hits.
    const cancel = await bounds(action(page, 'outer', 'Cancel'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [cancel.x + 4, cancel.y + 4])).toBe('inner');
    await page.keyboard.press('Escape');
    await expect.poll(() => innerDialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);
    expect(await isOpen(page, 'outer')).toBe(true);
    await expect(page.locator('#inner-opener')).toBeFocused();
    expect(await log(page)).toEqual(['inner:close']);
  });

  test('DLG-1, DLG-15: under another modal overlay — an image preview opened from it — the dialog is inert to a script too: focus() on what is slotted into it moves no focus, and it takes focus again once the overlay above has closed', async ({ page }) => {
    // WebKit keeps the lower dialog's style from when it was the topmost — "not inert" — so a script could focus into
    // it; `modalLayer` has it styled again.
    const preview = loadSpec('image-preview');
    await mountFixtures(page, preview, {
      fixtures: [{ ...preview.fixtures[0], id: 'above', props: { ...preview.fixtures[0].props, open: false } }],
      lead: '<tanrei-dialog id="under" headline="Room" open><button id="thumb" autofocus>Enlarge</button><tanrei-button slot="actions" confirming>Done</tanrei-button></tanrei-dialog>',
    });
    const above = page.locator('tanrei-image-preview');
    const thumb = page.locator('#thumb');
    await thumb.focus();
    await expect(thumb).toBeFocused();
    await above.evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect.poll(() => above.locator('dialog').evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(thumb).not.toBeFocused();
    // The engine has drawn the two: what it computed for the lower dialog is from now.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await thumb.evaluate((el) => ((el as HTMLElement).focus(), document.activeElement === el))).toBe(false);
    await above.evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await expect.poll(() => above.locator('dialog').evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);
    expect(await thumb.evaluate((el) => ((el as HTMLElement).focus(), document.activeElement === el))).toBe(true);
  });

  test('DLG-19: with no action it still opens and lays out its parts, and a debug build reports it as an error; all actions disabled with closedby none is reported too', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [
      f('none', {}, { items: [] }),
      f('trapped', { dismissible: false }, { items: [act('Cancel', { dismissive: true, disabled: true }), act('Discard', { confirming: true, disabled: true })] }),
      f('fine', { dismissible: false }),
    ]);
    await open(page, 'none');
    await expect(dialog(page, 'none').locator('.headline')).toBeVisible();
    await expect(dialog(page, 'none').locator('.supporting')).toBeVisible();
    await expect(dialog(page, 'none').locator('.actions')).toBeHidden();
    await expect.poll(() => seen.filter((r) => r.type === 'error' && r.text.includes('DLG-19') && r.text.includes('no action')).length).toBe(1);
    await close(page, 'none');
    // Counted each time it opens.
    await open(page, 'none');
    await expect.poll(() => seen.filter((r) => r.type === 'error' && r.text.includes('DLG-19') && r.text.includes('no action')).length).toBe(2);
    await close(page, 'none');
    await open(page, 'trapped');
    await expect.poll(() => seen.filter((r) => r.type === 'error' && r.text.includes('DLG-19') && r.text.includes('disabled')).length).toBe(1);
    await close(page, 'trapped');
    await open(page, 'fine');
    expect(seen.filter((r) => r.text.includes('DLG-19')).length).toBe(3);
  });

  test('DLG-2, DLG-19: a dialog written open in a document that is read after the element was defined counts the actions it was written with, and gives focus to the element marked in it', async ({ page }) => {
    // The first mount defines the element; every later document is read with the definition there, so the dialog
    // opens at its start tag. An engine that runs the element's first update before it has read the dialog's children
    // (WebKit; SSH-16 was the side sheet's) would count no action and find no mark.
    const seen = reports(page);
    await mount(page, [f('first')]);
    const written = spec.fixtures.filter((fx) => fx.props.open === true);
    expect(written.length).toBeGreaterThan(0);
    for (const fixture of written) {
      await mount(page, [fixture], dialogWindow(fixture.id));
      await expect.poll(() => isOpen(page, fixture.id)).toBe(true);
      await expect(host(page, fixture.id).locator('.actions')).toBeVisible();
    }
    // A dialog trapped by its markup is still reported, and one with a way out is not.
    await mount(page, [f('fine', { open: true, dismissible: false })]);
    await expect.poll(() => isOpen(page, 'fine')).toBe(true);
    await page.waitForTimeout(100);
    expect(seen.filter((r) => r.text.includes('DLG-19'))).toEqual([]);
    await mount(page, [f('none', { open: true }, { items: [] })]);
    await expect.poll(() => seen.filter((r) => r.type === 'error' && r.text.includes('DLG-19') && r.text.includes('no action')).length).toBe(1);
    await page.waitForTimeout(100);
    expect(seen.filter((r) => r.text.includes('DLG-19')).length).toBe(1);
    // DLG-2: the mark stands after the dialog's start tag too.
    await mount(page, [f('marked', { open: true }, { content: '<input id="name" aria-label="Name" autofocus />' })]);
    await expect.poll(() => isOpen(page, 'marked')).toBe(true);
    await expect.poll(() => focused(page)).toBe('name');
  });
});

test.describe('layout', () => {
  test('DLG-7: in a window that is not compact, centred, at least the margin from every edge, as wide as its widest part within its bounds; its color, elevation and corners, eased (cupertino)', async ({ page }) => {
    await mount(page, [closed('basic'), closed('scrolling'), f('long-actions', {}, { items: [act('Keep editing the draft', { dismissive: true }), act('Discard the draft', { confirming: true })] })]);
    const [margin, minW, maxW, pad, gap] = await Promise.all(['container-margin', 'container-min-width', 'container-max-width', 'container-padding', 'actions-gap'].map((n) => resolveToken(page, T(n))));
    await open(page, 'basic');
    const d = dialog(page, 'basic');
    let b = await bounds(d);
    expect(b.width).toBeGreaterThanOrEqual(minW - 0.5);
    expect(b.width).toBeLessThanOrEqual(maxW + 0.5);
    expect(b.x + b.width / 2).toBeCloseTo(WIDE.width / 2, 0);
    expect(b.y + b.height / 2).toBeCloseTo(WIDE.height / 2, 0);
    expect(await css(d, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(await css(d, 'box-shadow')).toBe(await resolveShadow(page, T('container-elevation')));
    expect(Number.parseFloat(await css(d, 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    await close(page, 'basic');
    // Its widest part may be the actions in one row at their own widths.
    await open(page, 'long-actions');
    const row = await Promise.all(['Keep editing the draft', 'Discard the draft'].map((label) => action(page, 'long-actions', label).evaluate((el) => (el.shadowRoot!.querySelector('.label') as HTMLElement).scrollWidth)));
    b = await bounds(dialog(page, 'long-actions'));
    expect(b.width + 0.5).toBeGreaterThanOrEqual(Math.min(maxW, row.reduce((a, w) => a + w, 0) + gap + 2 * pad));
    await close(page, 'long-actions');
    await open(page, 'scrolling');
    b = await bounds(dialog(page, 'scrolling'));
    expect(b.width).toBeCloseTo(Math.min(maxW, WIDE.width - 2 * margin), 0);
    expect(b.y).toBeCloseTo(margin, 0);
    expect(b.y + b.height).toBeCloseTo(WIDE.height - margin, 0);
    // Wide window: the widest is max-width.
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect.poll(async () => (await bounds(dialog(page, 'scrolling'))).width).toBeCloseTo(maxW, 0);
    // Cupertino eases the corners.
    await page.setViewportSize(WIDE);
    await mountFixtures(page, spec, { icons: true, system: 'cupertino', fixtures: [spec.fixtures[0]] });
    const c = dialog(page, 'basic');
    await expect.poll(() => c.evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
    const radius = await resolveToken(page, T('container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(c, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBeCloseTo(radius * 1.24, 2);
    } else expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBe(radius);
  });

  test('DLG-8: the padding, the parts container.gap apart with the empty ones left out, the actions below; the headline wraps; the headline and supporting text in their roles and colors; the content color and body text', async ({ page }) => {
    await mount(page, [
      f('d', {}, { content: 'Anyone on the team with the link can open this document.' }),
      f('bare', { supportingText: '' }),
      f('wraps', { headline: 'A headline long enough that it cannot stay on one line in the widest dialog there is' }),
    ]);
    await open(page, 'd');
    const [pad, gap, above] = await Promise.all(['container-padding', 'container-gap', 'actions-margin-block-start'].map((n) => resolveToken(page, T(n))));
    const box = await bounds(dialog(page, 'd'));
    const parts = dialog(page, 'd');
    const [headline, supporting, content, actions] = await Promise.all(['.headline', '.supporting', '.content', '.actions'].map((s) => bounds(parts.locator(s))));
    expect(headline.x - box.x).toBeCloseTo(pad, 0);
    expect(headline.y - box.y).toBeCloseTo(pad, 0);
    expect(supporting.y - (headline.y + headline.height)).toBeCloseTo(gap, 0);
    expect(content.y - (supporting.y + supporting.height)).toBeCloseTo(gap, 0);
    expect(actions.y - (content.y + content.height)).toBeCloseTo(above, 0);
    expect(box.y + box.height - (actions.y + actions.height)).toBeCloseTo(pad, 0);
    expect(await css(parts.locator('.headline'), 'color')).toBe(await resolveColor(page, T('headline-color')));
    expect(await css(parts.locator('.headline'), 'font-size')).toBe(`${await resolveToken(page, T('headline-typescale-font-size'))}px`);
    expect(await css(parts.locator('.supporting'), 'color')).toBe(await resolveColor(page, T('supporting-text-color')));
    expect(await css(parts.locator('.supporting'), 'font-size')).toBe(`${await resolveToken(page, T('supporting-text-typescale-font-size'))}px`);
    expect(await css(parts.locator('.content'), 'color')).toBe(await resolveColor(page, T('content-color')));
    expect(await css(parts.locator('.content'), 'font-size')).toBe(`${await resolveToken(page, '--tanrei-sys-typescale-body-font-size')}px`);
    await close(page, 'd');
    // A headline and its actions: no middle, the actions actions.margin-block-start below the headline.
    await open(page, 'bare');
    const only = await bounds(dialog(page, 'bare').locator('.headline'));
    const bareActions = await bounds(dialog(page, 'bare').locator('.actions'));
    expect(bareActions.y - (only.y + only.height)).toBeCloseTo(above, 0);
    for (const part of ['.middle', '.icon']) await expect(dialog(page, 'bare').locator(part)).toBeHidden();
    await close(page, 'bare');
    // Wrapping, never truncated.
    await open(page, 'wraps');
    const long = dialog(page, 'wraps').locator('.headline');
    const lineHeight = Number.parseFloat(await css(long, 'line-height'));
    expect((await bounds(long)).height).toBeGreaterThan(lineHeight * 1.5);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5)).toBe(true);
  });

  test('DLG-9: inline, the icon at its size and color, unselected, header.gap before the headline and centred on its first line, everything aligned to the start; above (a system choice), icon and headline centred; without an icon, the start', async ({ page }) => {
    const iconItems = [act('Cancel', { dismissive: true }), act('Delete', { confirming: true })];
    await mount(page, [
      f('i', {}, { slots: { icon: 'delete' }, items: iconItems }),
      f('wrapping', { headline: 'A headline long enough that it wraps onto a second line beside its icon' }, { slots: { icon: 'delete' }, items: iconItems }),
      f('plain'),
    ]);
    await open(page, 'i');
    const d = dialog(page, 'i');
    const icon = d.locator('.icon');
    expect(await css(icon, 'font-size')).toBe(`${await resolveToken(page, T('icon-size'))}px`);
    expect(await css(icon, 'color')).toBe(await resolveColor(page, T('icon-color')));
    expect((await css(icon, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    const [box, ib, hb] = [await bounds(d), await bounds(icon), await bounds(d.locator('.headline'))];
    const [pad, headerGap] = await Promise.all(['container-padding', 'header-gap'].map((n) => resolveToken(page, T(n))));
    expect(ib.x - box.x).toBeCloseTo(pad, 0);
    expect(hb.x - (ib.x + ib.width)).toBeCloseTo(headerGap, 0);
    const line = Number.parseFloat(await css(d.locator('.headline'), 'line-height'));
    expect(ib.y + ib.height / 2).toBeCloseTo(hb.y + line / 2, 0);
    // DLG-23: the layout's start edge is written physically, because the text's own direction does not decide it.
    expect(await css(d.locator('.headline'), 'text-align')).toBe('left');
    expect(await css(d.locator('.supporting'), 'text-align')).toBe('left');
    await close(page, 'i');
    // A headline that wraps keeps the icon beside its first line.
    await open(page, 'wrapping');
    const w = dialog(page, 'wrapping');
    const [wi, wh] = [await bounds(w.locator('.icon')), await bounds(w.locator('.headline'))];
    expect(wh.height).toBeGreaterThan(line * 1.5);
    expect(wi.y + wi.height / 2).toBeCloseTo(wh.y + line / 2, 0);
    await close(page, 'wrapping');
    // Above, as a system chooses it: the icon above the headline, container.gap apart, both centred; the text at the start.
    await override(page, { [T('icon-placement')]: 'above' });
    await open(page, 'i');
    const [ab, ai, ah] = [await bounds(d), await bounds(icon), await bounds(d.locator('.headline'))];
    const gap = await resolveToken(page, T('container-gap'));
    expect(ai.x + ai.width / 2).toBeCloseTo(ab.x + ab.width / 2, 0);
    expect(ah.y - (ai.y + ai.height)).toBeCloseTo(gap, 0);
    expect(await css(d.locator('.headline'), 'text-align')).toBe('center');
    expect(await css(d.locator('.supporting'), 'text-align')).toBe('left');
    await close(page, 'i');
    // Without an icon the headline is at the start, whatever the placement.
    await open(page, 'plain');
    expect(await css(dialog(page, 'plain').locator('.headline'), 'text-align')).toBe('left');
  });

  test('DLG-10: fill — dismissive at the start and confirming at the end of a row the actions share equally, actions.gap apart; a column as wide as the container, confirming on top, when a label does not fit its share; focus follows the placed order', async ({ page }) => {
    await mount(page, [closed('basic'), closed('stacked'), f('given', {}, { items: [act('Discard', { confirming: true }), act('Cancel', { dismissive: true })] })]);
    const [gap, pad] = await Promise.all(['actions-gap', 'container-padding'].map((n) => resolveToken(page, T(n))));
    await open(page, 'basic');
    const box = await bounds(dialog(page, 'basic'));
    const [cancel, discard] = [await bounds(action(page, 'basic', 'Cancel')), await bounds(action(page, 'basic', 'Discard'))];
    expect(cancel.x - box.x).toBeCloseTo(pad, 0);
    expect(discard.x - (cancel.x + cancel.width)).toBeCloseTo(gap, 0);
    expect(box.x + box.width - (discard.x + discard.width)).toBeCloseTo(pad, 0);
    expect(cancel.width).toBeCloseTo(discard.width, 0);
    expect(cancel.y).toBeCloseTo(discard.y, 0);
    // The Button's container fills its share, its label centred.
    const container = await bounds(action(page, 'basic', 'Cancel').locator('button'));
    expect(container.width).toBeCloseTo(cancel.width, 0);
    await close(page, 'basic');
    // Given confirming first: still placed dismissive first, in focus order too (BGR-15).
    await open(page, 'given');
    const [gc, gd] = [await bounds(action(page, 'given', 'Cancel')), await bounds(action(page, 'given', 'Discard'))];
    expect(gc.x).toBeLessThan(gd.x);
    expect(await tabOrder(page, 'given', 2)).toEqual(['Cancel', 'Discard']);
    await close(page, 'given');
    // Stacked: confirming on top, then the unflagged one, dismissive at the bottom — each as wide as the inner width.
    await open(page, 'stacked');
    await expect(dialog(page, 'stacked').locator('.actions')).toHaveClass(/stacked/);
    const labels = ['Allow while using the app', 'Allow once', "Don't allow"];
    const rows = await Promise.all(labels.map((label) => bounds(action(page, 'stacked', label))));
    const sb = await bounds(dialog(page, 'stacked'));
    for (let i = 1; i < rows.length; i++) expect(rows[i].y - (rows[i - 1].y + rows[i - 1].height)).toBeCloseTo(gap, 0);
    for (const r of rows) {
      expect(r.x - sb.x).toBeCloseTo(pad, 0);
      expect(r.width).toBeCloseTo(sb.width - 2 * pad, 0);
    }
    expect(await tabOrder(page, 'stacked', 3)).toEqual(labels);
    // Re-decided when the width changes: a wide window gives the row room again.
    await page.setViewportSize({ width: 1200, height: 800 });
    await override(page, { [T('container-max-width')]: '1000px' });
    await expect(dialog(page, 'stacked').locator('.actions')).not.toHaveClass(/stacked/);
    const wide = await Promise.all(labels.map((label) => bounds(action(page, 'stacked', label))));
    expect(wide[2].x).toBeLessThan(wide[1].x);
    expect(wide[1].x).toBeLessThan(wide[0].x);
  });

  test('DLG-10: end (a system choice) — at their own widths, the row at the end; a column as wide as its widest action, at the end, when the row does not fit', async ({ page }) => {
    await mount(page, [closed('basic'), closed('stacked')]);
    await override(page, { [T('actions-arrangement')]: 'end' });
    const [gap, pad] = await Promise.all(['actions-gap', 'container-padding'].map((n) => resolveToken(page, T(n))));
    await open(page, 'basic');
    const box = await bounds(dialog(page, 'basic'));
    const [cancel, discard] = [await bounds(action(page, 'basic', 'Cancel')), await bounds(action(page, 'basic', 'Discard'))];
    expect(box.x + box.width - (discard.x + discard.width)).toBeCloseTo(pad, 0);
    expect(discard.x - (cancel.x + cancel.width)).toBeCloseTo(gap, 0);
    expect(cancel.x - box.x).toBeGreaterThan(pad + 1);
    await close(page, 'basic');
    // Narrow enough that the row does not fit.
    await override(page, { [T('container-max-width')]: '320px' });
    await open(page, 'stacked');
    await expect(dialog(page, 'stacked').locator('.actions')).toHaveClass(/stacked/);
    const sb = await bounds(dialog(page, 'stacked'));
    const rows = await Promise.all(['Allow while using the app', 'Allow once', "Don't allow"].map((label) => bounds(action(page, 'stacked', label))));
    const widest = Math.max(...rows.map((r) => r.width));
    for (const r of rows) {
      expect(r.width).toBeCloseTo(widest, 0);
      expect(sb.x + sb.width - (r.x + r.width)).toBeCloseTo(pad, 0);
    }
    expect(rows[0].y).toBeLessThan(rows[1].y);
    expect(rows[1].y).toBeLessThan(rows[2].y);
  });

  test('DLG-11: the keyboard focus of the scrolling part is drawn inside its edges and stays there while it scrolls — its inner stroke does not move away with the content', async ({ page }) => {
    await mount(page, [closed('scrolling')]);
    await open(page, 'scrolling');
    const scroll = dialog(page, 'scrolling').locator('.scroll');
    await tabTo(page, scroll);
    expect(await scroll.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, scroll), 'before it is scrolled').toEqual({ top: true, bottom: true });
    await scroll.evaluate((el) => (el.scrollTop = 40));
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(40);
    expect(await innerStrokeAtEdges(page, scroll), 'scrolled by 40').toEqual({ top: true, bottom: true });
    await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, scroll), 'scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('DLG-11: long content scrolls between the fixed header and actions; under always both dividers stand for as long as it scrolls, at its top included; none while everything fits', async ({ page }) => {
    await mount(page, [closed('scrolling'), closed('basic')]);
    await open(page, 'scrolling');
    const d = dialog(page, 'scrolling');
    const scroll = d.locator('.scroll');
    const divider = (which: '::before' | '::after') => css(d.locator('.middle'), 'visibility', which);
    expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // At rest, nothing scrolled: the header and the actions are ruled off from the part that scrolls.
    expect([await divider('::before'), await divider('::after')]).toEqual(['visible', 'visible']);
    await scroll.evaluate((el) => (el.scrollTop = 100));
    await expect.poll(() => divider('::before')).toBe('visible');
    expect(await divider('::after')).toBe('visible');
    await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1)).toBe(true);
    expect([await divider('::before'), await divider('::after')]).toEqual(['visible', 'visible']);
    await close(page, 'scrolling');
    await open(page, 'basic');
    expect(await css(dialog(page, 'basic').locator('.middle'), 'visibility', '::before')).toBe('hidden');
    expect(await css(dialog(page, 'basic').locator('.middle'), 'visibility', '::after')).toBe('hidden');
  });

  test('DLG-11: under scroll, a divider below the header once scrolled and above the actions while more lies below; none while everything fits', async ({ page }) => {
    const scrolling = closed('scrolling');
    await mount(page, [{ ...scrolling, props: { ...scrolling.props, dividerVisibility: 'scroll' } }, { ...closed('basic'), props: { ...closed('basic').props, dividerVisibility: 'scroll' } }]);
    await open(page, 'scrolling');
    const d = dialog(page, 'scrolling');
    const scroll = d.locator('.scroll');
    const middle = d.locator('.middle');
    const divider = (which: '::before' | '::after') => css(middle, 'visibility', which);
    expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await divider('::before')).toBe('hidden');
    expect(await divider('::after')).toBe('visible');
    // It scrolls from the keyboard too: the scrolling part is a Tab stop, with its ring drawn inside.
    await expect(scroll).toHaveAttribute('tabindex', '0');
    const headline = await bounds(d.locator('.headline'));
    const actions = await bounds(d.locator('.actions'));
    await scroll.evaluate((el) => (el.scrollTop = 100));
    await expect.poll(() => divider('::before')).toBe('visible');
    expect(await bounds(d.locator('.headline'))).toEqual(headline);
    expect(await bounds(d.locator('.actions'))).toEqual(actions);
    await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect.poll(() => divider('::after')).toBe('hidden');
    // The divider: its width and color, across the container.
    const line = await middle.evaluate((el) => {
      const s = getComputedStyle(el, '::before');
      return { height: Number.parseFloat(s.height), color: s.backgroundColor, left: Number.parseFloat(s.left), right: Number.parseFloat(s.right) };
    });
    const pad = await resolveToken(page, T('container-padding'));
    expect(line).toEqual({ height: await resolveToken(page, T('divider-width')), color: await resolveColor(page, T('divider-color')), left: -pad, right: -pad });
    await close(page, 'scrolling');
    await open(page, 'basic');
    await expect(dialog(page, 'basic').locator('.scroll')).not.toHaveAttribute('tabindex');
    expect(await css(dialog(page, 'basic').locator('.middle'), 'visibility', '::before')).toBe('hidden');
    expect(await css(dialog(page, 'basic').locator('.middle'), 'visibility', '::after')).toBe('hidden');
  });

  test('DLG-24: auto follows comp.dialog.divider.visibility, which follows sys.behavior.divider-visibility; the attribute overrides it; a change is drawn at once; an unknown value is auto and reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [closed('scrolling')]);
    await open(page, 'scrolling');
    const d = dialog(page, 'scrolling');
    const before = () => css(d.locator('.middle'), 'visibility', '::before');
    const after = () => css(d.locator('.middle'), 'visibility', '::after');
    // The default system's choice is always.
    expect(await token(page, T('divider-visibility'))).toBe('always');
    expect(await before()).toBe('visible');
    // The system's choice set to scroll: the content is at its top, so the divider below the header goes, at once.
    await override(page, { '--tanrei-sys-behavior-divider-visibility': 'scroll' });
    await expect.poll(before).toBe('hidden');
    expect(await after()).toBe('visible');
    // The component token set apart from the system's choice.
    await override(page, { [T('divider-visibility')]: 'always' });
    await expect.poll(before).toBe('visible');
    // The attribute overrides the token.
    await host(page, 'scrolling').evaluate(async (el: any) => {
      el.dividerVisibility = 'scroll';
      await el.updateComplete;
    });
    await expect(host(page, 'scrolling')).toHaveAttribute('divider-visibility', 'scroll');
    await expect.poll(before).toBe('hidden');
    // The scroll position is kept across a change.
    await d.locator('.scroll').evaluate((el) => (el.scrollTop = 60));
    await expect.poll(before).toBe('visible');
    await host(page, 'scrolling').evaluate(async (el: any) => {
      el.dividerVisibility = 'always';
      await el.updateComplete;
    });
    expect(await d.locator('.scroll').evaluate((el) => el.scrollTop)).toBe(60);
    // A value the dialog does not define is drawn as auto (the token's always here) and reported.
    await host(page, 'scrolling').evaluate(async (el: any) => {
      el.setAttribute('divider-visibility', 'sometimes');
      await el.updateComplete;
    });
    await d.locator('.scroll').evaluate((el) => (el.scrollTop = 0));
    await expect.poll(before).toBe('visible');
    await expect.poll(() => seen.some((m) => m.text.includes('DLG-24') && m.text.includes('sometimes'))).toBe(true);
  });

  test('DLG-12: with no room left for the scrolled part (large text, a short window) all the parts scroll together, and nothing is cut off', async ({ page }) => {
    await mount(page, [f('d', { headline: 'A long headline that takes several lines when the text is large' })]);
    await page.setViewportSize({ width: WIDE.width, height: 220 });
    await override(page, { '--tanrei-dial-type-base': '24px' });
    await open(page, 'd');
    const d = dialog(page, 'd');
    await expect(d).toHaveClass(/whole/);
    expect(await css(d, 'overflow-y')).toBe('auto');
    expect(await d.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // Everything can be reached by scrolling the dialog.
    await d.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const [actions, box] = [await bounds(d.locator('.actions')), await bounds(d)];
    expect(actions.y + actions.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    // Room again: back to the scrolled middle.
    await page.setViewportSize(WIDE);
    await override(page, { '--tanrei-dial-type-base': '' });
    await expect(d).not.toHaveClass(/whole/);
  });

  test('DLG-16: right-to-left puts the icon at the right of the headline, the text at the right, dismissive at the right and confirming at the left of a row, a column unchanged', async ({ page }) => {
    await mount(page, [f('d', {}, { slots: { icon: 'delete' } }), closed('stacked')]);
    for (const id of ['d', 'stacked']) await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.setAttribute('dir', 'rtl'));
    await open(page, 'd');
    const d = dialog(page, 'd');
    const [box, icon, headline, cancel, discard] = await Promise.all([bounds(d), bounds(d.locator('.icon')), bounds(d.locator('.headline')), bounds(action(page, 'd', 'Cancel')), bounds(action(page, 'd', 'Discard'))]);
    const pad = await resolveToken(page, T('container-padding'));
    expect(box.x + box.width - (icon.x + icon.width)).toBeCloseTo(pad, 0);
    expect(headline.x + headline.width).toBeLessThanOrEqual(icon.x + 0.5);
    expect(await css(d.locator('.supporting'), 'direction')).toBe('rtl');
    expect(box.x + box.width - (cancel.x + cancel.width)).toBeCloseTo(pad, 0);
    expect(discard.x - box.x).toBeCloseTo(pad, 0);
    // Reading order is still dismissive first.
    expect(await tabOrder(page, 'd', 2)).toEqual(['Cancel', 'Discard']);
    await close(page, 'd');
    await open(page, 'stacked');
    const rows = await Promise.all(['Allow while using the app', 'Allow once', "Don't allow"].map((label) => bounds(action(page, 'stacked', label))));
    expect(rows[0].y).toBeLessThan(rows[1].y);
    expect(rows[1].y).toBeLessThan(rows[2].y);
  });
});

test.describe('compact window', () => {
  const B = (name: string) => `--tanrei-comp-bottom-sheet-${name}`;
  test('DLG-17: narrower than compact.window-width it takes the bottom sheet’s appearance — at the bottom edge, as wide as the window up to its greatest width, its color, elevation and top corners, square at the bottom — and stays a modal dialog; crossing the width moves it at once, focus kept; own and 0 keep it centred; an unknown value is a sheet, and reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [closed('compact'), f('own', { compactPresentation: 'own' })], COMPACT);
    const windowWidth = await resolveToken(page, T('compact-window-width'));
    expect(COMPACT.width).toBeLessThan(windowWidth);
    expect(WIDE.width).toBeGreaterThanOrEqual(windowWidth);
    await open(page, 'compact');
    const d = dialog(page, 'compact');
    const [maxW, radius, padding] = await Promise.all([resolveToken(page, B('container-max-width')), resolveToken(page, B('container-shape')), resolveToken(page, T('container-padding'))]);
    let b = await bounds(d);
    expect(b.x).toBeCloseTo(0, 0);
    expect(b.width).toBeCloseTo(Math.min(maxW, COMPACT.width), 0);
    expect(b.y + b.height).toBeCloseTo(COMPACT.height, 0);
    for (const corner of ['top-left', 'top-right']) expect(Number.parseFloat(await css(d, `border-${corner}-radius`))).toBeCloseTo(radius, 1);
    for (const corner of ['bottom-left', 'bottom-right']) expect(Number.parseFloat(await css(d, `border-${corner}-radius`))).toBe(0);
    expect(await css(d, 'background-color')).toBe(await resolveColor(page, B('container-color')));
    expect(await css(d, 'box-shadow')).toBe(await resolveShadow(page, B('container-elevation')));
    // Its parts keep the dialog's padding and its scrim is the dialog's own.
    expect(Number.parseFloat(await css(d, 'padding-inline-start'))).toBeCloseTo(padding, 1);
    expect(await css(d, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    // Still a modal dialog, dismissed as one, with no handle.
    expect(await d.evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(page.getByRole('dialog', { name: 'Discard draft?' })).toHaveCount(1);
    await expect(host(page, 'compact').locator('.handle')).toHaveCount(0);
    // Crossing the width while open: centred at once, focus where it was.
    await tab(page);
    expect(await focused(page)).toBe('Cancel');
    await page.setViewportSize(WIDE);
    await expect.poll(async () => {
      const box = await bounds(d);
      return Math.round(box.y + box.height / 2);
    }).toBe(WIDE.height / 2);
    expect(await d.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await focused(page)).toBe('Cancel');
    await watchTransitions(d);
    await page.setViewportSize(COMPACT);
    await expect.poll(async () => Math.round((await bounds(d)).y + (await bounds(d)).height)).toBe(COMPACT.height);
    expect(await transitionsRun(d)).toEqual([]);
    expect(await focused(page)).toBe('Cancel');
    // Escape still dismisses it.
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'compact')).toBe(false);
    // own: centred in the compact window, the dialog's own color and corners.
    await open(page, 'own');
    const o = dialog(page, 'own');
    b = await bounds(o);
    expect(b.y + b.height / 2).toBeCloseTo(COMPACT.height / 2, 0);
    expect(await css(o, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    // …and a change of compact-presentation while open is drawn at once.
    await host(page, 'own').evaluate((el: any) => (el.compactPresentation = 'sheet'));
    await expect.poll(async () => Math.round((await bounds(o)).y + (await bounds(o)).height)).toBe(COMPACT.height);
    await close(page, 'own');
    // An unknown value: a sheet, and reported.
    await host(page, 'own').evaluate((el: any) => (el.compactPresentation = 'centred'));
    await open(page, 'own');
    expect(Math.round((await bounds(o)).y + (await bounds(o)).height)).toBe(COMPACT.height);
    expect(seen.some((r) => r.text.includes('DLG-17') && r.text.includes('"centred"'))).toBe(true);
    await close(page, 'own');
    // 0: no window is compact — centred in the same window.
    await override(page, { [T('compact-window-width')]: '0px' });
    await open(page, 'compact');
    b = await bounds(d);
    expect(b.y + b.height / 2).toBeCloseTo(COMPACT.height / 2, 0);
  });

  test('DLG-18: as a sheet it slides up from below the bottom edge over the bottom sheet’s enter motion, without growing, and down over its exit motion, the scrim fading; only fades where motion is reduced', async ({ page }) => {
    await mount(page, [closed('compact')], COMPACT);
    // The motions at 40 s, each ended by hand: what is read 'on its way' is read some answers after the change that
    // begins it. The durations are read from the transitions after the override, so the binding to the tokens is
    // still what is proved.
    await override(page, { [B('motion-enter-duration')]: '40s', [B('motion-exit-duration')]: '40s' });
    await page.locator('#open-compact').focus();
    await host(page, 'compact').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    expect(await focused(page)).toBe('dialog');
    const d = dialog(page, 'compact');
    const running = await d.evaluate((el) => el.getAnimations().map((a) => ({ property: (a as CSSTransition).transitionProperty, duration: a.effect!.getTiming().duration })));
    expect(running).toEqual(expect.arrayContaining([{ property: 'translate', duration: 40_000 }]));
    expect(running.map((r) => r.property)).not.toContain('scale');
    expect(running.map((r) => r.property)).not.toContain('opacity');
    const [moving, height] = await d.evaluate((el) => [Number.parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0'), el.getBoundingClientRect().height]);
    expect(moving).toBeGreaterThan(0);
    expect(moving).toBeLessThanOrEqual(height + 0.5);
    await d.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    // (Closed and read in one step: nothing of the test stands between the close and what moves at it.)
    const leaving = await host(page, 'compact').evaluate(async (el: any) => {
      el.open = false;
      await el.updateComplete;
      return (el.shadowRoot.querySelector('dialog') as HTMLElement).getAnimations().map((a) => ({ property: (a as CSSTransition).transitionProperty, duration: a.effect!.getTiming().duration }));
    });
    // A closed dialog stays in the top layer for its exit only where the engine can transition `overlay`. Where it
    // cannot (Firefox) it is gone at once and nothing is left to move, so what is read there is what the exit is
    // declared to be — the same properties and time.
    if (await page.evaluate(() => CSS.supports('overlay', 'auto'))) {
      expect(leaving).toEqual(expect.arrayContaining([{ property: 'translate', duration: 40_000 }]));
      expect(leaving.map((l) => l.property)).not.toContain('scale');
    } else {
      expect(leaving).toEqual([]);
      expect(await css(d, 'display')).toBe('none');
    }
    const out = await d.evaluate((el) => {
      const style = getComputedStyle(el);
      return { properties: style.transitionProperty.split(', '), duration: Number.parseFloat(style.transitionDuration) * 1000, scale: style.scale };
    });
    expect(out.properties).toEqual(expect.arrayContaining(['translate', 'display', 'overlay']));
    expect(out.duration).toBe(40_000);
    expect(out.scale).toBe('none');
    await d.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    // Out of view: its own height below its place.
    expect(await css(d, 'translate')).toBe('0px 100%');
    await expect(page.locator('#open-compact')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [closed('compact')], COMPACT);
    // (Opened and read in one step: the fade is as long as the system says, and no answer may stand in it.)
    const reduced = await host(page, 'compact').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
      return (el.shadowRoot.querySelector('dialog') as HTMLElement).getAnimations().map((a) => (a as CSSTransition).transitionProperty);
    });
    expect(reduced).toContain('opacity');
    expect(reduced).not.toContain('translate');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});

test.describe('actions', () => {
  test('DLG-20: an action without a variant takes actions.variant (tonal in the default system) from its tokens and states; one with a variant keeps it; the flags never change a look', async ({ page }) => {
    await mount(page, [closed('basic'), closed('action-variants')]);
    const paint = (locator: Locator) => locator.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await token(page, T('actions-variant'))).toBe('tonal');
    await open(page, 'basic');
    const tonal = await resolveColor(page, '--tanrei-comp-button-tonal-container-color');
    for (const label of ['Cancel', 'Discard']) {
      await expect(action(page, 'basic', label)).not.toHaveAttribute('variant');
      expect(await paint(action(page, 'basic', label))).toBe(tonal);
    }
    // Its states are the variant's: hovered paints the tonal hovered container.
    await action(page, 'basic', 'Discard').hover();
    await expect.poll(() => paint(action(page, 'basic', 'Discard'))).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-hovered-container-color'));
    await close(page, 'basic');
    // Set: kept as set (the pointer moved off, so no action is hovered).
    await page.mouse.move(0, 0);
    await open(page, 'action-variants');
    expect(await paint(action(page, 'action-variants', 'Cancel'))).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    expect(await paint(action(page, 'action-variants', 'Delete'))).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    await close(page, 'action-variants');
    // A system's choice: outlined for every action without one.
    await override(page, { [T('actions-variant')]: 'outlined' });
    await open(page, 'basic');
    expect(await paint(action(page, 'basic', 'Cancel'))).toBe(await resolveColor(page, '--tanrei-comp-button-outlined-container-color'));
    // A variant written later wins; removed, the dialog's again.
    await action(page, 'basic', 'Cancel').evaluate((el) => el.setAttribute('variant', 'filled'));
    await expect.poll(() => paint(action(page, 'basic', 'Cancel'))).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    await action(page, 'basic', 'Cancel').evaluate((el) => el.removeAttribute('variant'));
    await expect.poll(() => paint(action(page, 'basic', 'Cancel'))).toBe(await resolveColor(page, '--tanrei-comp-button-outlined-container-color'));
    // Taken out of the dialog, a Button is Button's default again.
    await action(page, 'basic', 'Cancel').evaluate((el) => document.body.append(el));
    await expect.poll(() => page.locator('body > tanrei-button').locator('button').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    // An unknown name is the first value (filled). The dialog opens again during its exit, so its actions are still drawn
    // and Discard's colors move from outlined to filled over the Button's state transition: polled, like a variant written
    // later above.
    await close(page, 'basic');
    await override(page, { [T('actions-variant')]: 'sparkly' });
    await open(page, 'basic');
    await expect(action(page, 'basic', 'Discard').locator('button')).toHaveAttribute('data-host-variant', 'filled');
    await expect.poll(() => paint(action(page, 'basic', 'Discard'))).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
  });

  test('DLG-10: an action marked both confirming and dismissive is placed among the unflagged ones and reported (BGR-18)', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [f('both', {}, { items: [act('Discard', { confirming: true }), act('Both', { confirming: true, dismissive: true }), act('Cancel', { dismissive: true })] })]);
    await open(page, 'both');
    expect(await tabOrder(page, 'both', 3)).toEqual(['Cancel', 'Both', 'Discard']);
    await expect.poll(() => seen.filter((r) => r.text.includes('BGR-18')).length).toBe(1);
  });
});

test.describe('close button and width', () => {
  const closeButton = (page: P, id: string) => host(page, id).locator('tanrei-button.close');
  const paint = (locator: Locator) => locator.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
  /** Every `cancel`'s reason, as `<id>:<reason>`. */
  const reasons = (page: P) =>
    page.evaluate(() => {
      const seen: string[] = ((window as any).reasons = []);
      for (const d of document.querySelectorAll<any>('tanrei-dialog')) {
        const id = d.closest('[data-fixture]')?.dataset.fixture ?? d.id;
        d.addEventListener('cancel', (e: CustomEvent) => seen.push(`${id}:${e.detail?.reason}`));
      }
    });
  const reasonLog = (page: P) => page.evaluate(() => (window as any).reasons as string[]);
  const CLOSABLE = { closable: true, closeLabel: 'Close' };

  test('DLG-5, DLG-25: dismiss carries its reason — escape, back, scrim, and close for the close button', async ({ page }) => {
    await mount(page, [f('d', CLOSABLE)]);
    await reasons(page);
    // The platform's back first: a close request without a key, before any Escape has been pressed.
    await open(page, 'd');
    await dialog(page, 'd').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    await open(page, 'd');
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    await open(page, 'd');
    await page.mouse.click(4, 4);
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    await open(page, 'd');
    await closeButton(page, 'd').locator('button').click();
    await expect.poll(() => isOpen(page, 'd')).toBe(false);
    expect(await reasonLog(page)).toEqual(['d:back', 'd:escape', 'd:scrim', 'd:close']);
    expect(await log(page)).toEqual(['d:cancel', 'd:close', 'd:cancel', 'd:close', 'd:cancel', 'd:close', 'd:cancel', 'd:close']);
  });

  test('DLG-25: while closable, an icon-only small Button with the close glyph named by close-label, in close-button.variant (text) given through the Button’s channel; a click, Enter or Space dismisses once with the reason close, unless cancelled; an empty close-label still draws it and is reported; closedby none draws none and reports it', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [f('d', CLOSABLE), f('unnamed', { closable: true }), f('fixed', { ...CLOSABLE, dismissible: false }), f('plain')]);
    await reasons(page);
    expect(await token(page, T('close-button-variant'))).toBe('text');
    await open(page, 'd');
    // Focus does not start on it (DLG-2): the dialog itself has it, and the close button is the first Tab stop.
    expect(await focused(page)).toBe('dialog');
    const button = closeButton(page, 'd');
    await expect(button).not.toHaveAttribute('variant');
    await expect(button).toHaveAttribute('size', 'small');
    expect(await button.evaluate((el) => el.textContent?.trim())).toBe('close');
    await page.mouse.move(0, 0);
    await expect.poll(() => paint(button)).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    const size = await resolveToken(page, '--tanrei-comp-button-container-height-small');
    const box = await bounds(button.locator('button'));
    expect(box.width).toBeCloseTo(size, 2);
    expect(box.height).toBeCloseTo(size, 2);
    await expect(host(page, 'd').getByRole('button', { name: 'Close' })).toHaveCount(1);
    expect(await tabOrder(page, 'd', 1)).toEqual(['close']);
    // Cancelled, it stays open; each activation asks once.
    await page.evaluate(() => document.querySelector('[data-fixture="d"] tanrei-dialog')!.addEventListener('cancel', (e) => e.preventDefault()));
    await button.locator('button').click();
    await button.locator('button').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await reasonLog(page)).toEqual(['d:close', 'd:close', 'd:close']);
    expect(await isOpen(page, 'd')).toBe(true);
    await close(page, 'd');
    // A system's choice (tonal), read when the dialog lays out.
    await override(page, { [T('close-button-variant')]: 'tonal' });
    await open(page, 'd');
    await page.mouse.move(0, 0);
    await expect.poll(() => paint(button)).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
    await close(page, 'd');
    // Not closable: none.
    await open(page, 'plain');
    await expect(closeButton(page, 'plain')).toHaveCount(0);
    await close(page, 'plain');
    // Unnamed: drawn and reported.
    await open(page, 'unnamed');
    await expect(closeButton(page, 'unnamed')).toBeVisible();
    expect(seen.some((r) => r.text.includes('DLG-25') && r.text.includes('close-label is empty'))).toBe(true);
    await close(page, 'unnamed');
    // Not dismissible: no close button, and the ignored closable is reported.
    await open(page, 'fixed');
    await expect(closeButton(page, 'fixed')).toHaveCount(0);
    expect(seen.some((r) => r.text.includes('DLG-25') && r.text.includes('closable is ignored'))).toBe(true);
    // Made dismissible again, it draws the button.
    await host(page, 'fixed').evaluate((el: any) => (el.closedBy = 'any'));
    await expect(closeButton(page, 'fixed')).toBeVisible();
  });

  test('DLG-26: the header is one row — the close button at its end, header.gap after the headline, its end edge at the padding, centred on the headline’s first line; right-to-left at the left; above, the icon and the headline stay centred in the container', async ({ page }) => {
    await mount(page, [
      f('d', CLOSABLE),
      f('long', { ...CLOSABLE, headline: 'A headline long enough that it wraps onto a second line beside the close button' }),
      f('i', CLOSABLE, { slots: { icon: 'delete' } }),
      f('untitled', { ...CLOSABLE, headline: '' }),
    ]);
    const [pad, headerGap] = await Promise.all(['container-padding', 'header-gap'].map((n) => resolveToken(page, T(n))));
    await open(page, 'd');
    const d = dialog(page, 'd');
    const [box, hb, cb] = [await bounds(d), await bounds(d.locator('.headline')), await bounds(closeButton(page, 'd').locator('button'))];
    expect(box.x + box.width - (cb.x + cb.width)).toBeCloseTo(pad, 0);
    expect(cb.y - box.y).toBeCloseTo(pad, 0);
    const line = Number.parseFloat(await css(d.locator('.headline'), 'line-height'));
    expect(hb.y + line / 2).toBeCloseTo(cb.y + cb.height / 2, 0);
    await close(page, 'd');
    // A headline that wraps takes the width the button leaves, header.gap before it.
    await open(page, 'long');
    const l = dialog(page, 'long');
    const [lh, lc] = [await bounds(l.locator('.headline')), await bounds(closeButton(page, 'long').locator('button'))];
    expect(lh.height).toBeGreaterThan(line * 1.5);
    expect(lc.x - (lh.x + lh.width)).toBeGreaterThanOrEqual(headerGap - 0.5);
    expect(lc.y + lc.height / 2).toBeCloseTo(lh.y + line / 2, 0);
    await close(page, 'long');
    // Without a headline, the header is still drawn for the close button.
    await open(page, 'untitled');
    await expect(closeButton(page, 'untitled')).toBeVisible();
    await close(page, 'untitled');
    // Right-to-left: at the left, the headline at the right of it. (The glyph close is not one the icon set mirrors.)
    await page.evaluate(() => document.querySelector('[data-fixture="d"]')!.setAttribute('dir', 'rtl'));
    await open(page, 'd');
    const [rb, rc, rh] = [await bounds(d), await bounds(closeButton(page, 'd').locator('button')), await bounds(d.locator('.headline'))];
    expect(rc.x - rb.x).toBeCloseTo(pad, 0);
    expect(rh.x).toBeGreaterThan(rc.x + rc.width);
    await close(page, 'd');
    // Above, as a system chooses it: the icon and the headline centred in the container, the button at the top end.
    await override(page, { [T('icon-placement')]: 'above' });
    await open(page, 'i');
    const a = dialog(page, 'i');
    const [ab, ai, ah, ac] = [await bounds(a), await bounds(a.locator('.head .icon')), await bounds(a.locator('.headline')), await bounds(closeButton(page, 'i').locator('button'))];
    expect(ai.x + ai.width / 2).toBeCloseTo(ab.x + ab.width / 2, 0);
    expect(ah.x + ah.width / 2).toBeCloseTo(ab.x + ab.width / 2, 0);
    expect(ac.y - ab.y).toBeCloseTo(pad, 0);
    expect(ac.x - (ah.x + ah.width)).toBeGreaterThanOrEqual(headerGap - 0.5);
  });

  test('DLG-27: small, medium and large are their widths whatever the parts ask, never wider than the window less the margins; content is DLG-7’s; a compact window places every width alike; a change is drawn at once; an unknown width is content and reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [f('d', { width: 'small' }), f('content')]);
    const [margin, minW, maxW, small, medium, large] = await Promise.all(
      ['container-margin', 'container-min-width', 'container-max-width', 'width-small', 'width-medium', 'width-large'].map((n) => resolveToken(page, T(n))),
    );
    await open(page, 'd');
    const d = dialog(page, 'd');
    expect((await bounds(d)).width).toBeCloseTo(small, 0);
    await expect(host(page, 'd')).toHaveAttribute('width', 'small');
    await host(page, 'd').evaluate((el: any) => (el.width = 'medium'));
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(Math.min(medium, WIDE.width - 2 * margin), 0);
    // Large is wider than this window allows: the window less the margins.
    await host(page, 'd').evaluate((el: any) => (el.width = 'large'));
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(Math.min(large, WIDE.width - 2 * margin), 0);
    // In a wide window it is its width, wider than max-width.
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(large, 0);
    expect(large).toBeGreaterThan(maxW);
    // Focus is kept through a change.
    await dialog(page, 'd').evaluate((el) => (el as HTMLElement).focus());
    await host(page, 'd').evaluate((el: any) => (el.width = 'small'));
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(small, 0);
    expect(await focused(page)).toBe('dialog');
    // A compact window: a sheet as wide as the window, whatever width names (DLG-17).
    const sheetWidth = Math.min(await resolveToken(page, '--tanrei-comp-bottom-sheet-container-max-width'), COMPACT.width);
    await page.setViewportSize(COMPACT);
    await host(page, 'd').evaluate((el: any) => (el.width = 'large'));
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(sheetWidth, 0);
    await host(page, 'd').evaluate((el: any) => (el.width = 'small'));
    await expect.poll(async () => (await bounds(d)).width).toBeCloseTo(sheetWidth, 0);
    await close(page, 'd');
    // Content (the default) is sized by its parts, between min-width and max-width.
    await page.setViewportSize(WIDE);
    await open(page, 'content');
    const c = await bounds(dialog(page, 'content'));
    expect(c.width).toBeGreaterThanOrEqual(minW - 0.5);
    expect(c.width).toBeLessThanOrEqual(maxW + 0.5);
    await close(page, 'content');
    // Unknown: drawn as content, and reported.
    await host(page, 'content').evaluate((el: any) => (el.width = 'huge'));
    await open(page, 'content');
    expect((await bounds(dialog(page, 'content'))).width).toBeCloseTo(c.width, 0);
    expect(seen.some((r) => r.text.includes('DLG-27') && r.text.includes('"huge"'))).toBe(true);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, open, centred and compact', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      for (const id of ['icon', 'scrolling', 'compact-stacked']) {
        await page.setViewportSize(dialogWindow(id));
        await mountFixtures(page, spec, { theme, icons: true, fixtures: [spec.fixtures.find((fx) => fx.id === id)!] });
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations, `${theme} ${id}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    }
  });
});

test.describe('fixtures', () => {
  // One at a time in its window (640 × 640, 360 × 640 for the compact ones); the baseline is the window, because the
  // dialog and its scrim are in the top layer.
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await page.setViewportSize(dialogWindow(fixture.id));
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
      await expect.poll(() => isOpen(page, fixture.id)).toBe(true);
      await expect(page).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});

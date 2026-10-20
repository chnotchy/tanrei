// <tanrei-card>, driven by specs/card.spec.json: every behaviour id (CRD-1…17) is cited by a test title, every fixture
// has a baseline, and every variant, state and choice of kind is read back from the tokens — never from a number written
// here.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { anchorOf as linkAnchor, expectDisabledLink, expectDrawnAlike, expectLinkActivation, expectNewContext, expectRefusals, expectTargetLabel, painted, settledPaint } from '../../../test/links.js';
import { decodePng } from '../../../test/png.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { motionEnded } from '../../../test/motions.js';
import { allSettled } from '../../../test/settled.js';

const spec = loadSpec('card');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-card`);
const inner = (page: P, id: string) => host(page, id).locator('.container');
const clip = (page: P, id: string) => host(page, id).locator('.clip');
const edge = (page: P, id: string) => host(page, id).locator('.outline');
const content = (page: P, id: string) => host(page, id).locator(':scope > *').first();
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-card-${name}`;
const pressed = (page: P, id: string) => inner(page, id).getAttribute('data-pressed');
const ripples = (page: P, id: string) => inner(page, id).locator('.ripple');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** The shadow a `shadow` token resolves to, as the browser serializes a box-shadow. */
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);
/** Counts the element's click events. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = { click: 0 });
    el.addEventListener('click', () => log.click++);
  });
const clicks = (page: P) => page.evaluate(() => (window as any).events.click as number);
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const TEXT = 'Quarterly report. Revenue grew 12% over the previous quarter.';
const body = (text = TEXT) => `<div class="tanrei-text-body">${text}</div>`;
const fixture = (id: string, props: Fixture['props'], markup = body()): Fixture => ({ id, props, content: markup });
/** Everything a state paints, as drawn. */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const c = getComputedStyle(root.querySelector('.container')!);
    return { bg: c.backgroundColor, color: c.color, elevation: c.boxShadow, outline: getComputedStyle(root.querySelector('.outline')!).boxShadow, opacity: c.opacity };
  });
const expected = async (page: P, variant: string, state = '') => {
  const name = (part: string) => T(`${variant}-${state ? `${state}-` : ''}${part}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    color: await resolveColor(page, name('content-color')),
    elevation: await resolveShadow(page, name('container-elevation')),
    outline: `${await resolveColor(page, name('outline-color'))} 0px 0px 0px ${await resolveToken(page, T('outline-width'))}px inset`,
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};

test.describe('behavior', () => {
  // Building the acme fixture system takes longer than a test's budget on a busy machine: once per worker, up front.
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('CRD-1: pointer, Enter and Space each emit click exactly once — Enter on key-down, Space on key-up', async ({ page }) => {
    const id = 'outlined-interactive';
    await listen(host(page, id));
    await host(page, id).click();
    expect(await clicks(page), 'pointer').toBe(1);
    // A press on the content is the card's press: its content is presentational.
    await content(page, id).click();
    expect(await clicks(page), 'pointer on the content').toBe(2);
    await host(page, id).focus();
    await page.keyboard.down('Enter');
    expect(await clicks(page), 'Enter, on key-down').toBe(3);
    await page.keyboard.up('Enter');
    await page.keyboard.down('Space');
    expect(await clicks(page), 'Space: nothing until the key comes up').toBe(3);
    await page.keyboard.up('Space');
    expect(await clicks(page), 'Space, on key-up').toBe(4);
    // element.click() activates it as a person would: once.
    await host(page, id).evaluate((el) => (el as HTMLElement).click());
    expect(await clicks(page), 'element.click()').toBe(5);
    // Space does not scroll the page, and a Space whose key-up lands elsewhere does not activate (as a native button).
    await page.keyboard.down('Space');
    await inner(page, id).evaluate((el) => el.blur());
    await page.keyboard.up('Space');
    expect(await clicks(page), 'Space released after focus left').toBe(5);
    // The click comes from the card, whose name is the label.
    await expect(host(page, id).getByRole('button', { name: 'Quarterly report' })).toHaveCount(1);
  });

  test('CRD-2: a disabled interactive card emits no click, is not focusable and exposes disabled', async ({ page }) => {
    for (const id of ['outlined-disabled', 'elevated-disabled']) {
      const target = host(page, id);
      await listen(target);
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
        el.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await target.click({ force: true });
      await target.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await clicks(page), id).toBe(0);
      // This card — not whichever card is focused: the Space above scrolls the page (the focus stayed on the body), and a
      // pointer that lands on a neighbour mid-scroll focuses it where it is a link card, which says nothing about this one.
      expect(await target.evaluate((el) => el === document.activeElement || el.matches(':focus-within')), id).toBe(false);
      await expect(inner(page, id), id).not.toHaveAttribute('tabindex');
      await expect(target.getByRole('button', { name: 'Quarterly report', disabled: true }), id).toHaveCount(1);
    }
    // Tab passes over both: from the interactive card straight past the end.
    await tabTo(page, host(page, 'outlined-interactive'));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? '')).not.toMatch(/disabled/);
  });

  test('CRD-3: each state renders the container, content color, outline, elevation and opacity from that state’s tokens (default system)', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...spec.fixtures, fixture('elevated-interactive', { variant: 'elevated', interactive: true, label: 'Quarterly report' })],
    });
    for (const [id, variant] of [['outlined-interactive', 'outlined'], ['elevated-interactive', 'elevated']] as const) {
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id), id).toEqual(await expected(page, variant));
      // A card at rest still shows state: the default mixes its state-layer color into the container.
      await host(page, id).hover();
      await expect.poll(() => drawn(page, id), `${id} hovered`).toEqual(await expected(page, variant, 'hovered'));
      expect((await drawn(page, id)).bg, id).not.toBe((await expected(page, variant)).bg);
      await page.mouse.down(); // hovered AND pressed: pressed wins
      await expect.poll(() => drawn(page, id), `${id} pressed`).toEqual(await expected(page, variant, 'pressed'));
      await page.mouse.up();
      // Focus gained by the pointer does not select the focused state.
      await page.mouse.move(0, 0);
      expect(await inner(page, id).evaluate((el) => el.matches(':focus-visible')), id).toBe(false);
      await expect.poll(() => drawn(page, id), `${id} after a click`).toEqual(await expected(page, variant));
      // Keyboard focus does.
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, host(page, id));
      await expect.poll(() => drawn(page, id), `${id} focused`).toEqual(await expected(page, variant, 'focused'));
    }
    // An elevated card rises on hover in the default system: its hovered elevation is not its resting one.
    expect(await resolveShadow(page, T('elevated-hovered-container-elevation'))).not.toBe(await resolveShadow(page, T('elevated-container-elevation')));
    // The component draws no overlay of its own: state is entirely a matter of token values.
    expect(await host(page, 'outlined-interactive').locator('.state-layer').count()).toBe(0);
  });

  test('CRD-3: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const id = 'outlined-interactive';
    const bg = () => css(inner(page, id), 'background-color');
    const [rest, hovered, focused, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`outlined-${s}container-color`))));
    // The point of the fixture system: no two of them are equal, so the assertions below cannot pass by accident.
    expect(new Set([rest, hovered, focused, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await host(page, id).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, host(page, id)); // hovered AND keyboard-focused: focused wins
    await expect.poll(bg).toBe(focused);
    await page.keyboard.down('Space'); // hovered AND focused AND pressed: pressed wins
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
    await expect.poll(bg).toBe(focused);
    await page.mouse.down(); // the same with the pointer
    await expect.poll(bg).toBe(down);
    await page.mouse.move(0, 0); // leaving ends the press without a click
    await page.mouse.up();
  });

  test('CRD-4: keyboard focus shows the focus ring immediately; pointer focus does not', async ({ page }) => {
    const id = 'outlined-interactive';
    const target = inner(page, id);
    await host(page, id).click();
    await expect(target).toHaveCSS('outline-style', 'none');
    expect(await css(target, 'content', '::after')).toBe('none');

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    await expect(target).toHaveCSS('outline-style', 'solid');
    await expect(target).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(target).toHaveCSS('outline-width', `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    await expect(target).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    // Never animated: the outline is not part of any transition. And the clip does not cut the ring off.
    expect(await css(target, 'transition-property')).not.toContain('outline');
    expect(await css(target, 'overflow')).toBe('visible');
  });

  test('CRD-5: a card thinner than the minimum target is hit over sys.target.pointer on both axes; its visual size is unchanged', async ({ page }) => {
    const sliver = '<span style="display:block;inline-size:8px;block-size:8px"></span>';
    await mountFixtures(page, spec, { fixtures: [fixture('thin', { interactive: true, inset: false, label: 'Open' }, sliver), fixture('thin-wide', { interactive: true, inset: false, label: 'Open' }, sliver)] });
    await page.addStyleTag({ content: '[data-fixture="thin"] tanrei-card { inline-size: 8px; }' });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const box = await bounds(inner(page, 'thin'));
    expect([box.width, box.height]).toEqual([8, 8]);
    const hit = await inner(page, 'thin').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit).toEqual([pointer, pointer]);
    await listen(host(page, 'thin'));
    const [cx, cy, d] = [box.x + box.width / 2, box.y + box.height / 2, (pointer - 8) / 4];
    for (const [x, y] of [[cx, box.y - d], [cx, box.y + box.height + d], [box.x - d, cy], [box.x + box.width + d, cy]]) await page.mouse.click(x, y);
    expect(await clicks(page)).toBe(4);
    // A card wider than the target keeps its width and gains only height.
    const wide = await bounds(inner(page, 'thin-wide'));
    expect(await inner(page, 'thin-wide').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBe(wide.width);
  });

  test('CRD-5: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    await mountFixtures(page, spec, { fixtures: [fixture('thin', { interactive: true, inset: false, label: 'Open' }, '<span style="display:block;inline-size:8px;block-size:8px"></span>')] });
    await page.addStyleTag({ content: 'tanrei-card { inline-size: 8px; }' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await inner(page, 'thin').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit).toEqual([touch, touch]);
  });

  test('CRD-6: disabled renders from the disabled tokens of its variant — the whole card dims', async ({ page }) => {
    for (const [id, variant] of [['outlined-disabled', 'outlined'], ['elevated-disabled', 'elevated']] as const) {
      expect(await drawn(page, id), id).toEqual(await expected(page, variant, 'disabled'));
      // In the Tanrei system the card keeps its resting colors and dims as a whole: it cannot recolor content it does not know.
      expect(Number((await drawn(page, id)).opacity), id).toBeLessThan(1);
      expect((await drawn(page, id)).bg, id).toBe(await resolveColor(page, T(`${variant}-container-color`)));
      // Hover over a disabled card changes nothing.
      const before = await drawn(page, id);
      await host(page, id).hover({ force: true });
      await page.waitForTimeout(250);
      expect(await drawn(page, id), `${id} hovered`).toEqual(before);
    }
  });

  test('CRD-11: WHILE interactive is false the card is not focusable, emits no click of its own, answers no state and ignores disabled', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('plain-disabled', { variant: 'outlined', disabled: true })] });
    for (const id of ['outlined', 'plain-disabled']) {
      const target = host(page, id);
      await expect(inner(page, id), id).not.toHaveAttribute('tabindex');
      await expect(inner(page, id), id).not.toHaveAttribute('role');
      await expect(inner(page, id), id).not.toHaveAttribute('aria-disabled');
      await target.focus();
      expect(await page.evaluate(() => document.activeElement?.tagName), id).not.toBe('TANREI-CARD');
      await listen(target);
      await target.evaluate((el) => (el as HTMLElement).click());
      await inner(page, id).evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true })));
      expect(await clicks(page), `${id}: element.click() and Enter`).toBe(0);
      // At rest, under hover and under a press: the resting tokens of its variant, with no pressed state.
      expect(await drawn(page, id), id).toEqual(await expected(page, 'outlined'));
      await target.hover();
      await page.mouse.down();
      await page.waitForTimeout(250);
      expect(await pressed(page, id), id).toBeNull();
      expect(await drawn(page, id), `${id} hovered and pressed`).toEqual(await expected(page, 'outlined'));
      await page.mouse.up();
      await page.mouse.move(0, 0);
    }
    // Tab never stops on a card that is not an action: the first tab stop on the page is the interactive card.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, 'outlined-interactive'));
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? '')).not.toMatch(/^(outlined|filled|elevated|outlined-flush|plain-disabled)$/);
  });

  test('CRD-12: inset puts the content comp.card.container.padding inside on every side; flush lets it reach the edges; the card grows with its content', async ({ page }) => {
    const padding = await resolveToken(page, T('container-padding'));
    expect(padding).toBeGreaterThan(0);
    for (const [id, pad] of [['outlined', padding], ['outlined-flush', 0]] as const) {
      const card = await bounds(inner(page, id));
      const inside = await bounds(content(page, id));
      expect(inside.x - card.x, `${id} start`).toBeCloseTo(pad, 1);
      expect(card.x + card.width - (inside.x + inside.width), `${id} end`).toBeCloseTo(pad, 1);
      expect(inside.y - card.y, `${id} top`).toBeCloseTo(pad, 1);
      // No height of its own: the content's height and the padding.
      expect(card.height, `${id} height`).toBeCloseTo(inside.height + 2 * pad, 1);
    }
    // More content, a taller card.
    const before = (await bounds(inner(page, 'outlined'))).height;
    await content(page, 'outlined').evaluate((el) => el.insertAdjacentHTML('beforeend', '<br>A second paragraph.'));
    expect((await bounds(inner(page, 'outlined'))).height).toBeGreaterThan(before);
    // The property and its attribute agree: `inset` false is the `flush` attribute.
    expect(await host(page, 'outlined-flush').evaluate((el) => (el as any).inset)).toBe(false);
    await host(page, 'outlined').evaluate((el) => ((el as any).inset = false));
    await expect(host(page, 'outlined')).toHaveAttribute('flush', '');
  });

  test('CRD-12: the content is clipped to the container’s shape and the outline is drawn above it', async ({ page }) => {
    // Media that bleeds to the edges and even stacks itself above its siblings.
    const media = '<div style="block-size:48px;background:rgb(255,0,0);position:relative;z-index:5"></div>';
    await mountFixtures(page, spec, { fixtures: [fixture('media', { variant: 'outlined', inset: false }, media)] });
    const radius = await resolveToken(page, T('container-shape'));
    expect(await css(clip(page, 'media'), 'overflow')).toBe('hidden');
    expect(Number.parseFloat(await css(clip(page, 'media'), 'border-top-left-radius'))).toBe(radius);
    const card = await bounds(inner(page, 'media'));
    const shot = decodePng(await page.screenshot({ clip: card, scale: 'css' }));
    // The corner is clipped: the page shows through, not the red media.
    expect(shot.at(0, 0)).not.toBe('rgb(255, 0, 0)');
    // The outline is painted over the media along the edge, in the middle of the side.
    const width = await resolveToken(page, T('outline-width'));
    expect(width).toBeGreaterThan(0);
    const side = shot.at(0, Math.floor(shot.height / 2));
    expect(side).not.toBe('rgb(255, 0, 0)');
    // …and nowhere else: inside the edge the media is untouched.
    expect(shot.at(Math.ceil(width) + 2, Math.floor(shot.height / 2))).toBe('rgb(255, 0, 0)');
  });

  test('CRD-13: the content inherits the content color of the variant and the state', async ({ page }) => {
    for (const [id, variant] of [['outlined', 'outlined'], ['filled', 'filled'], ['elevated', 'elevated'], ['outlined-disabled', 'outlined']] as const) {
      const state = id.endsWith('disabled') ? 'disabled-' : '';
      expect(await css(content(page, id), 'color'), id).toBe(await resolveColor(page, T(`${variant}-${state}content-color`)));
    }
    // A state that changes the content color changes it for the content too.
    await override(page, { [T('outlined-hovered-content-color')]: 'rgb(0, 0, 255)' });
    await host(page, 'outlined-interactive').hover();
    await expect.poll(() => css(content(page, 'outlined-interactive'), 'color')).toBe('rgb(0, 0, 255)');
    // Content that sets its own color keeps it: the card hands a default, it does not force one.
    await content(page, 'outlined').evaluate((el) => ((el as HTMLElement).style.color = 'rgb(0, 128, 0)'));
    expect(await css(content(page, 'outlined'), 'color')).toBe('rgb(0, 128, 0)');
  });

  test('CRD-14: an interactive card is one button named by label; without a label its content is the name and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fixture('nameless', { interactive: true }, '<h3 class="tanrei-text-heading-5">Quarterly report</h3><p>Revenue grew.</p>'),
        fixture('group', { label: 'Quarterly report' }),
      ],
    });
    expect(await host(page, 'outlined-interactive').ariaSnapshot()).toMatch(/^- button "Quarterly report"/);
    // Exactly one focusable element: the card.
    expect(await host(page, 'outlined-interactive').evaluate((el) => el.shadowRoot!.querySelectorAll('[tabindex]').length)).toBe(1);
    // Without a label: the text of its content — a heading and a paragraph — merged in reading order into one name.
    await expect(host(page, 'nameless').getByRole('button', { name: 'Quarterly report Revenue grew.' })).toHaveCount(1);
    await expect.poll(() => seen.filter((w) => w.includes('CRD-14'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('CRD-14'))).toMatch(/<tanrei-card>: an interactive card has no label/);
    // Not interactive: no role of its own, the content's semantics untouched; with a label, a named group.
    expect(await inner(page, 'outlined').getAttribute('role')).toBeNull();
    expect(await host(page, 'outlined').ariaSnapshot()).toBe(`- text: ${TEXT}`);
    await expect(host(page, 'group').getByRole('group', { name: 'Quarterly report' })).toHaveCount(1);
    // Labelled later: named, and nothing more is reported.
    await host(page, 'nameless').evaluate((el) => ((el as any).label = 'Report'));
    await expect(host(page, 'nameless').getByRole('button', { name: 'Report' })).toHaveCount(1);
    expect(seen.filter((w) => w.includes('CRD-14'))).toHaveLength(1);
  });

  test('CRD-15: an interactive card reports an interactive element in its content, on every slot change', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('with-button', { interactive: true, label: 'A' }, `${body()}<button>Share</button>`),
        fixture('with-link', { interactive: true, label: 'B' }, '<div><a href="#x">Read more</a></div>'),
        fixture('with-tanrei', { interactive: true, label: 'C' }, '<tanrei-button>Share</tanrei-button>'),
        fixture('clean', { interactive: true, label: 'D' }),
        fixture('plain-with-button', { label: 'E' }, `${body()}<button>Share</button>`),
      ],
    });
    await expect.poll(() => seen.filter((w) => w.includes('CRD-15')).length).toBe(3);
    expect(seen.filter((w) => w.includes('CRD-15')).map((w) => w.match(/\(<([a-z-]+)>\)/)?.[1]).sort()).toEqual(['a', 'button', 'tanrei-button']);
    // Content added later is inspected too.
    await host(page, 'clean').evaluate((el) => el.insertAdjacentHTML('beforeend', '<input aria-label="Name">'));
    await expect.poll(() => seen.filter((w) => w.includes('CRD-15')).length).toBe(4);
    // A card that is not interactive may hold actions: nothing is reported for it.
    expect(seen.filter((w) => w.includes('CRD-15') && w.includes('E'))).toEqual([]);
  });

  test('CRD-16: colors and elevation change over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    const target = inner(page, 'outlined-interactive');
    // The transition the card has at rest: a card just mounted settles for two frames (data-tanrei-settling, MOT-3),
    // and starts no transition meanwhile — its transition-property reads none until then, which a slow runner reaches.
    await allSettled(page);
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    expect(Number.parseFloat(await css(target, 'transition-duration')) * 1000).toBe(duration);
    expect(await css(target, 'transition-property')).toBe('background-color, color, box-shadow, opacity');
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    expect(await css(target, 'transition-timing-function')).toBe(easing);
    expect(Number.parseFloat(await css(edge(page, 'outlined-interactive'), 'transition-duration')) * 1000).toBe(duration);
    // A hover starts a transition of the container color, at that duration.
    // Kept as the engine announces them, not asked for after the hover: on a slow runner the answer to a later question
    // can arrive when a transition of this length is over.
    await watchTransitions(target);
    await host(page, 'outlined-interactive').hover();
    await expect.poll(() => transitionsRun(target)).toContainEqual({ property: 'background-color', pseudo: '', own: true, on: expect.any(String), duration, easing });
    await page.mouse.move(0, 0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(target, 'transition-duration')).toBe('0s');
    expect(await css(edge(page, 'outlined-interactive'), 'transition-duration')).toBe('0s');
    await host(page, 'outlined-interactive').hover();
    expect(await css(target, 'background-color')).toBe(await resolveColor(page, T('outlined-hovered-container-color')));
  });

  test('CRD-17: in RTL the padding and the clip are logical, a ripple grows from the point of contact, and the content follows the direction', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const id = 'outlined-interactive';
    const padding = await resolveToken(page, T('container-padding'));
    const card = await bounds(inner(page, id));
    const inside = await bounds(content(page, id));
    // The content box starts at the right edge now, still `padding` away.
    expect(card.x + card.width - (inside.x + inside.width)).toBeCloseTo(padding, 1);
    expect(inside.x - card.x).toBeCloseTo(padding, 1);
    expect(await css(clip(page, id), 'padding-inline-start')).toBe(`${padding}px`);
    // The content is laid out right to left by the page's direction; the card does not mirror it itself.
    expect(await css(content(page, id), 'direction')).toBe('rtl');
    expect(await css(content(page, id), 'transform')).toBe('none');
    // A press near the left edge grows from there, not mirrored.
    await page.mouse.move(card.x + 20, card.y + 10);
    await page.mouse.down();
    const origin = await ripples(page, id).evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), Number.parseFloat(el.style.getPropertyValue('--_y'))]);
    expect(origin[0]).toBeCloseTo(20, 0);
    expect(origin[1]).toBeCloseTo(10, 0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });
});

// ── Choices of kind and the press itself ─────────────────────────────────────────────
test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  /** Records, inside the page, when data-pressed appears and disappears, and when the press ends. */
  const watchPress = (page: P, id: string) =>
    inner(page, id).evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.transitionDuration, s.backgroundColor];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) el.addEventListener(type, () => (log.up ??= performance.now()));
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  /** performance.now() is coarsened (and jittered in Firefox). */
  const CLOCK = 1;
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('CRD-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    const id = 'outlined-interactive';
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, host(page, id))],
    ] as const) {
      await mountFixtures(page, spec);
      await host(page, id).focus();
      await expect.poll(() => css(inner(page, id), 'background-color')).toBe(await resolveColor(page, T('outlined-focused-container-color')));
      await watchPress(page, id);
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await pressLog(page)).off !== undefined, name);
      const log = await pressLog(page);
      expect(log.seen, name).toEqual(['overlay', '0s', await resolveColor(page, T('outlined-pressed-container-color'))]);
      expect(log.up! - log.on!, `${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
      expect(log.off! - log.down!, name).toBeGreaterThanOrEqual(hold - CLOCK);
    }
  });

  test('CRD-8: a pointer press lasts while the pointer is down; a key press ends when focus leaves; a disabled card shows none', async ({ page }) => {
    const id = 'outlined-interactive';
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await host(page, id).hover();
    await page.mouse.down();
    await inner(page, id).evaluate((el) => el.blur());
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, id)).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, id)).toBeNull();

    await host(page, id).focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, id)).toBe('overlay');
    await inner(page, id).evaluate((el) => el.blur());
    await expect.poll(() => pressed(page, id)).toBeNull();
    await page.keyboard.up('Space');

    await host(page, 'outlined-disabled').click({ force: true });
    expect(await pressed(page, 'outlined-disabled')).toBeNull();
  });

  test('CRD-9 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    const id = 'outlined-interactive';
    await host(page, id).hover();
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('overlay');
    expect(await css(inner(page, id), 'background-color')).toBe(await resolveColor(page, T('outlined-pressed-container-color')));
    expect(await ripples(page, id).count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CRD-9 ripple (m3-like): the pressed layer grows from the point of contact under the content; the content color is the pressed one at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'outlined-interactive';
    const box = await bounds(inner(page, id));
    const hovered = await resolveColor(page, T('outlined-hovered-container-color'));
    await override(page, { [T('outlined-pressed-content-color')]: 'rgb(0, 0, 255)' });
    await page.mouse.move(box.x + 30, box.y + 12);
    await expect.poll(() => css(inner(page, id), 'background-color')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, id));
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('ripple');
    const ripple = ripples(page, id);
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      const own = el.getBoundingClientRect();
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')),
        y: Number.parseFloat(el.style.getPropertyValue('--_y')),
        r: Number.parseFloat(el.style.getPropertyValue('--_r')),
        color: s.backgroundColor,
        radius: Number.parseFloat(s.borderTopLeftRadius),
        animation: s.animationName,
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
        hidden: el.getAttribute('aria-hidden'),
        under: s.zIndex,
        diagonal: Math.hypot(own.width, own.height),
      };
    });
    expect(layer.x).toBeCloseTo(30, 0);
    expect(layer.y).toBeCloseTo(12, 0);
    expect(layer.r).toBeGreaterThan(layer.diagonal * 0.75);
    expect(layer.color).toBe(await resolveColor(page, T('outlined-pressed-container-color')));
    expect(layer).toMatchObject({ animation: 'ripple-grow', hidden: 'true', under: '-1' });
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(layer.radius).toBeCloseTo(await resolveToken(page, T('container-shape')), 1);
    expect(await css(inner(page, id), 'background-color')).toBe(hovered);
    expect(await css(content(page, id), 'color')).toBe('rgb(0, 0, 255)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
    expect(await pressed(page, id)).toBeNull();
  });

  test('CRD-9 ripple: keyboard activation answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    const id = 'outlined-interactive';
    await host(page, id).focus();
    await page.keyboard.down('Enter');
    const center = await ripples(page, id).evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await expect(ripples(page, id)).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    const still = await ripples(page, id).evaluate((el) => {
      const s = getComputedStyle(el);
      return { animation: s.animationName, transition: s.transitionDuration };
    });
    expect(still).toEqual({ animation: 'none', transition: '0s' });
    await page.keyboard.up('Enter');
    await expect(ripples(page, id)).toHaveCount(0);
  });

  test('CRD-9 dim (cupertino): the pressed opacity on the whole card, no state layer; the content takes its pressed color', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    const id = 'outlined-interactive';
    await override(page, {
      [T('outlined-pressed-container-color')]: 'rgb(255, 0, 0)',
      [T('outlined-hovered-container-color')]: 'rgb(0, 255, 0)',
      [T('outlined-pressed-content-color')]: 'rgb(0, 0, 255)',
    });
    await host(page, id).hover();
    await expect.poll(() => css(inner(page, id), 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('dim');
    expect(await css(inner(page, id), 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(inner(page, id), 'opacity'))).toBeLessThan(1);
    expect(await css(inner(page, id), 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await css(content(page, id), 'color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, id).count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CRD-9 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    const id = 'outlined-interactive';
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await host(page, id).hover();
    await expect.poll(() => css(inner(page, id), 'background-color')).toBe(await resolveColor(page, T('outlined-hovered-container-color')));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, id));
    const before = await drawn(page, id);
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('none');
    expect(await drawn(page, id)).toEqual(before);
    expect(await ripples(page, id).count()).toBe(0);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('overlay');
    await page.mouse.up();
  });

  test('CRD-10 corner smoothing: a quarter circle at the token radius by default; cupertino eases it, and the clip and outline follow', async ({ page }) => {
    const id = 'outlined-interactive';
    const radius = (locator: Locator, pseudo?: string) => css(locator, 'border-top-left-radius', pseudo).then(Number.parseFloat);
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0');
    expect(await radius(inner(page, id))).toBe(await resolveToken(page, T('container-shape')));
    expect(await css(inner(page, id), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);

    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const shape = await resolveToken(page, T('container-shape'));
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback' });
    if (supported) {
      expect(Number.parseFloat((await css(inner(page, id), 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(await radius(inner(page, id))).toBeCloseTo(shape * 1.24, 2);
      // The clip and the outline are concentric with the container: the same radius, the same curve.
      for (const part of [clip(page, id), edge(page, id)]) {
        expect(await radius(part)).toBeCloseTo(shape * 1.24, 2);
        expect(await css(part, 'corner-top-left-shape')).toBe(await css(inner(page, id), 'corner-top-left-shape'));
      }
      await tabTo(page, host(page, id));
      expect(await css(inner(page, id), 'corner-top-left-shape', '::after')).toBe(await css(inner(page, id), 'corner-top-left-shape'));
    } else {
      expect(await radius(inner(page, id))).toBe(shape);
      expect(await radius(clip(page, id))).toBe(shape);
    }
  });

  test('CRD-10 focus-style: acme shows keyboard focus as a glow in the same two focus colors; the default is a ring', async ({ page }) => {
    const id = 'outlined-interactive';
    await tabTo(page, host(page, id));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(inner(page, id), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await css(inner(page, id), 'box-shadow', '::after')).toBe('none');
    expect(await inner(page, id).getAttribute('data-focus-style')).toBe('ring');

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    await host(page, id).click(); // pointer focus: no indicator at all (CRD-4)
    expect(await css(inner(page, id), 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    const [outer, offset] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset')];
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    expect(await css(inner(page, id), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(inner(page, id), 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${ring} 0px 0px ${outer}px ${outer + 1}px`);
    expect(await css(inner(page, id), 'top', '::after')).toBe(`${-offset}px`);
    expect(await inner(page, id).getAttribute('data-focus-style')).toBe('glow');
  });

  test('CRD-9 / CRD-10: the choices follow data-tanrei-system at runtime on the same elements', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like', fixtures: [...spec.fixtures, fixture('second', { interactive: true, label: 'Second' })] });
    await page.addStyleTag({ content: fs.readFileSync(new URL('../../../dist/systems/cupertino.css', import.meta.url), 'utf8') });
    // Each press is released where it went down. Moving away with the button held would select the text from the card
    // to the corner of the page — across the cards between — and the next press, landing on that selection, would drag
    // it (a native drag, which engines end differently: after one, WebKit on Linux answered no press at all).
    const press = async (id: string) => {
      await host(page, id).hover();
      await page.mouse.down();
      const kind = await pressed(page, id);
      await page.mouse.up();
      await page.mouse.move(0, 0);
      return kind;
    };
    expect(await press('second')).toBe('ripple');
    await page.locator('[data-fixture="second"]').evaluate((el) => el.setAttribute('data-tanrei-system', 'cupertino'));
    expect(await press('second')).toBe('dim');
    expect(await press('outlined-interactive')).toBe('ripple');
    expect(await page.evaluate(() => String(getSelection())), 'no press selected text').toBe('');
  });
});

// ── A design system may add variants ─────────────────────────────────────────────────
test.describe('values a design system adds', () => {
  const layer = {
    id: 'inverse-cards',
    name: 'Inverse cards',
    extends: 'tanrei',
    description: 'A test layer that adds a card variant.',
    vocabulary: { 'tanrei.comp.card.variant.inverse': { from: 'filled', rationale: 'A dark card on a light page.' } },
    tokens: {
      'tanrei.comp.card.inverse.container.color': { $value: '{tanrei.sys.color.inverse-surface}' },
      'tanrei.comp.card.inverse.content.color': { $value: '{tanrei.sys.color.inverse-on-surface}' },
    },
  };
  let layerCss: Promise<string> | undefined;
  const sheet = () =>
    (layerCss ??= (async () => {
      const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
      const { emitCss } = await import('@tanrei/tokens-build/emit/css');
      return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    })());
  const fixtures = [fixture('inverse', { variant: 'inverse', interactive: true, label: 'A' }), fixture('unknown', { variant: 'sparkly' }), fixture('plain', {})];
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await sheet();
  });

  test('a variant a layer adds renders from its tokens, with no report', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures });
    expect(await css(inner(page, 'inverse'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-inverse-surface'));
    expect(await css(content(page, 'inverse'), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-inverse-on-surface'));
    await host(page, 'inverse').hover();
    await expect.poll(() => css(inner(page, 'inverse'), 'background-color')).toBe(await resolveColor(page, T('inverse-hovered-container-color')));
    expect(seen.filter((w) => w.includes('variant "inverse"'))).toEqual([]);
  });

  test('CRD-7: a variant the active design system does not have renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures });
    for (const id of ['unknown', 'inverse']) {
      expect(await drawn(page, id), id).toEqual(await drawn(page, 'plain'));
    }
    await expect.poll(() => seen.filter((w) => w.includes('CRD-7')).length).toBe(2);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/variant "sparkly" is not a value of the active design system; it is drawn as "outlined" \(CRD-7\)/)]));
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      await page.waitForTimeout(300); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('roles: a button only while interactive, a link only with a destination, disabled where it is; a plain card leaves its content alone', async ({ page }) => {
    await mountFixtures(page, spec);
    await expect(page.getByRole('button', { name: 'Quarterly report' })).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Quarterly report', disabled: true })).toHaveCount(2);
    await expect(page.getByRole('link')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Getting started', disabled: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Source' })).toHaveAccessibleDescription('opens in a new tab');
    for (const id of ['outlined', 'filled', 'elevated', 'outlined-flush']) {
      expect(await host(page, id).ariaSnapshot(), id).toBe(`- text: ${TEXT}`);
    }
  });

  test('keyboard: Tab stops on the enabled interactive cards and link cards only, Shift+Tab back', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('second', { interactive: true, label: 'Second' })] });
    await tabTo(page, host(page, 'outlined-interactive'));
    // The plain and the disabled cards are passed — the disabled link card too; the two link cards are tab stops.
    for (const id of ['outlined-link', 'filled-link-new', 'second']) {
      await tab(page);
      await expect(inner(page, id)).toBeFocused();
    }
    for (const id of ['filled-link-new', 'outlined-link', 'outlined-interactive']) {
      await tab(page, { back: true });
      await expect(inner(page, id)).toBeFocused();
    }
  });

  test('at 200% text size the card grows with its content and nothing is clipped', async ({ page }) => {
    await mountFixtures(page, spec);
    const before = await bounds(inner(page, 'outlined'));
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await bounds(inner(page, 'outlined'));
    expect(after.height).toBeGreaterThan(before.height * 1.5);
    const [scroll, client] = await clip(page, 'outlined').evaluate((el) => [el.scrollHeight, el.clientHeight]);
    expect(scroll).toBe(client);
  });

  test('forced colors: the card keeps a visible edge where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec);
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
    for (const id of ['filled', 'elevated', 'outlined']) expect(await css(edge(page, id), 'border-top-style'), id).toBe('solid');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// ── A card with a destination is a link card ──────────────────────────
test.describe('link form', () => {
  const spec$ = (id: string) => spec.fixtures.find((f) => f.id === id)!;
  /** The same card as an interactive card without a destination: what a link card must be drawn as (CRD-19). */
  const twin = (id: string): Fixture => {
    const { href: _href, target: _target, targetLabel: _targetLabel, ...props } = spec$(id).props;
    return { ...spec$(id), id: `${id}-twin`, props: { ...props, interactive: true } };
  };
  const LINK_TEXT = 'Getting started. Install and use Tanrei on your platform.';

  test('CRD-19, CRD-14: with href the card is one anchor around its content — the link role and not the button role, named by label, one tab stop, whether interactive is set or not — drawn in every state exactly as an interactive card; without a label its content is the name, reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        spec$('outlined-link'),
        twin('outlined-link'),
        fixture('link-and-interactive', { variant: 'outlined', interactive: true, href: '/getting-started/', label: 'Getting started' }, body(LINK_TEXT)),
        fixture('nameless-link', { href: '/reports/' }, '<h3 class="tanrei-text-heading-5">Quarterly report</h3><p>Revenue grew.</p>'),
      ],
    });
    for (const id of ['outlined-link', 'link-and-interactive']) {
      expect(await linkAnchor(host(page, id)), id).toMatchObject({ tag: 'a', href: '/getting-started/', target: null, rel: null, role: null, disabled: null, tabindex: null });
      expect(await host(page, id).ariaSnapshot(), id).toMatch(/^- link "Getting started"/);
      await expect(host(page, id).getByRole('button'), id).toHaveCount(0);
      // Exactly one focusable element, and it is the anchor; the slot is inside it.
      expect(await host(page, id).evaluate((el) => [el.shadowRoot!.querySelectorAll('a[href], [tabindex]').length, !!el.shadowRoot!.querySelector('a[href] slot')]), id).toEqual([1, true]);
    }
    await expectDrawnAlike(page, host(page, 'outlined-link'), host(page, 'outlined-link-twin'));
    // Back at rest (the hover eases out): the resting tokens of its variant, the outline layer included.
    await expect.poll(() => drawn(page, 'outlined-link')).toEqual(await expected(page, 'outlined'));
    await expect.poll(() => drawn(page, 'outlined-link-twin')).toEqual(await expected(page, 'outlined'));
    // The content keeps the card's content color, never a link's, and is not underlined.
    expect(await css(content(page, 'outlined-link'), 'color')).toBe(await resolveColor(page, T('outlined-content-color')));
    expect(await css(content(page, 'outlined-link'), 'text-decoration-line')).toBe('none');
    // Keyboard focus: the same ring on the anchor, the same focused paint; one tab stop each.
    await tabTo(page, host(page, 'outlined-link'));
    await expect(inner(page, 'outlined-link')).toBeFocused();
    await expect(inner(page, 'outlined-link')).toHaveCSS('outline-style', 'solid');
    const focused = await settledPaint(host(page, 'outlined-link'));
    await tab(page);
    await expect(inner(page, 'outlined-link-twin')).toBeFocused();
    expect(focused).toEqual(await settledPaint(host(page, 'outlined-link-twin')));
    // The hit area is an interactive card's.
    expect(await css(inner(page, 'outlined-link'), 'block-size', '::before')).toBe(await css(inner(page, 'outlined-link-twin'), 'block-size', '::before'));
    // CRD-14: without a label the content, merged, is the link's name, and a debug build says so.
    await expect(host(page, 'nameless-link').getByRole('link', { name: 'Quarterly report Revenue grew.' })).toHaveCount(1);
    await expect.poll(() => seen.filter((w) => w.includes('CRD-14'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('CRD-14'))).toMatch(/<tanrei-card>: a link card has no label/);
  });

  test('CRD-1, CRD-20: a link card emits click exactly once for a pointer and for Enter and then follows href, at once; a cancelled click opens nothing; Space emits no click, shows no press and scrolls the page; a modified or a middle click is the browser’s', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [spec$('outlined-link')] });
    await expectLinkActivation(page, host(page, 'outlined-link'));
  });

  test('CRD-21: target new opens a new context that has no handle to its opener; the card draws no mark of its own and exposes targetLabel as its description, reporting an empty one; target same ignores it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('filled-link-new'), twin('filled-link-new')] });
    const link = host(page, 'filled-link-new');
    expect(await linkAnchor(link)).toMatchObject({ tag: 'a', href: 'https://example.com/tanrei', target: '_blank', rel: 'noopener', description: 'opens in a new tab' });
    await expect(link.getByRole('link', { name: 'Source' })).toHaveAccessibleDescription('opens in a new tab');
    // Drawn as a filled interactive card, and nothing in the shadow root is a glyph: the content is the product's.
    await expectDrawnAlike(page, link, host(page, 'filled-link-new-twin'));
    await expect.poll(() => drawn(page, 'filled-link-new')).toEqual(await expected(page, 'filled'));
    expect(await link.evaluate((el) => el.shadowRoot!.textContent!.trim())).toBe('');
    expect((await bounds(inner(page, 'filled-link-new'))).height).toBe((await bounds(inner(page, 'filled-link-new-twin'))).height);
    await expectTargetLabel(page, link, seen, 'CRD-21');
    await expectNewContext(page, link);
  });

  test('CRD-2, CRD-6, CRD-22: a disabled link card is an anchor without href — the link role, disabled — that is not focusable, emits no click and opens nothing, drawn exactly as a disabled interactive card', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [spec$('outlined-link'), spec$('outlined-link-disabled'), twin('outlined-link-disabled'), fixture('after', { interactive: true, label: 'After' })] });
    const link = host(page, 'outlined-link-disabled');
    await expectDisabledLink(page, link);
    expect(await drawn(page, 'outlined-link-disabled')).toEqual(await drawn(page, 'outlined-link-disabled-twin'));
    expect(await drawn(page, 'outlined-link-disabled')).toEqual(await expected(page, 'outlined', 'disabled'));
    expect(await painted(link)).toEqual(await painted(host(page, 'outlined-link-disabled-twin')));
    expect(await css(inner(page, 'outlined-link-disabled'), 'cursor')).toBe('default');
    // Not focusable: by script, and Tab goes from the card before it to the one after its twin.
    await link.focus();
    expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('tanrei-card');
    await tabTo(page, host(page, 'outlined-link'));
    await tab(page);
    await expect(inner(page, 'after')).toBeFocused();
    // Enabled again, it is the link it was.
    await link.evaluate((el) => ((el as any).disabled = false));
    await expect(inner(page, 'outlined-link-disabled')).toHaveAttribute('href', '/getting-started/');
    await expect(inner(page, 'outlined-link-disabled')).not.toHaveAttribute('aria-disabled');
    await expect(inner(page, 'outlined-link-disabled')).not.toHaveAttribute('role');
  });

  test('CRD-15: a link card reports an interactive element in its content, as an interactive card does, on every slot change', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('link-with-button', { href: '/a/', label: 'A' }, `${body()}<button>Share</button>`),
        fixture('link-with-link', { href: '/b/', label: 'B' }, '<div><a href="#x">Read more</a></div>'),
        fixture('clean-link', { href: '/c/', label: 'C' }),
      ],
    });
    await expect.poll(() => seen.filter((w) => w.includes('CRD-15')).length).toBe(2);
    expect(seen.filter((w) => w.includes('CRD-15')).every((w) => w.includes('a link card holds an interactive element'))).toBe(true);
    await host(page, 'clean-link').evaluate((el) => el.insertAdjacentHTML('beforeend', '<input aria-label="Name">'));
    await expect.poll(() => seen.filter((w) => w.includes('CRD-15')).length).toBe(3);
  });

  test('CRD-11, CRD-23: an unknown target is same, reported; white space is no destination; a javascript: address and one that cannot be read are refused and reported — the card is then what its interactive makes it, a plain card or a button', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('plain', { variant: 'outlined', href: '/somewhere/', label: 'Somewhere' }),
        fixture('action', { variant: 'outlined', interactive: true, href: 'javascript:alert(1)', label: 'Do it' }),
        fixture('blank', { variant: 'outlined', href: '   ', disabled: true }),
      ],
    });
    await expectRefusals(page, host(page, 'plain'), seen, 'CRD-23', { tag: 'div' });
    // Refused, it is the card its interactive makes it: here a plain card, with a label a named group.
    await host(page, 'plain').evaluate((el) => Object.assign(el, { href: 'javascript:alert(1)' }));
    await expect(host(page, 'plain').getByRole('group', { name: 'Somewhere' })).toHaveCount(1);
    expect(await linkAnchor(host(page, 'plain'))).toMatchObject({ tag: 'div', href: null, tabindex: null });
    // … and there a button: Space activates it, as it does no link.
    expect(await linkAnchor(host(page, 'action'))).toMatchObject({ tag: 'div', href: null, role: 'button', tabindex: '0' });
    await listen(host(page, 'action'));
    await host(page, 'action').focus();
    await page.keyboard.press('Space');
    expect(await clicks(page)).toBe(1);
    expect(seen.filter((w) => w.includes('(CRD-23)') && w.includes('<tanrei-card>: href names a script to run')).length).toBeGreaterThanOrEqual(1);
    // CRD-11: with no destination and not interactive the card is plain — not focusable, no click of its own, no state
    // answer, disabled ignored, the resting tokens.
    expect(await linkAnchor(host(page, 'blank'))).toMatchObject({ tag: 'div', href: null, role: null, tabindex: null, disabled: null });
    await host(page, 'blank').focus();
    expect(await host(page, 'blank').evaluate((el) => el === document.activeElement || el.matches(':focus-within'))).toBe(false);
    await host(page, 'blank').hover();
    await page.mouse.down();
    expect(await pressed(page, 'blank')).toBeNull();
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await expect.poll(() => drawn(page, 'blank')).toEqual(await expected(page, 'outlined'));
  });
});

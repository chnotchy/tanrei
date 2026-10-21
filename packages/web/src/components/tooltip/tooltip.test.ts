// <tanrei-tooltip>, driven by specs/tooltip.spec.json: every behaviour id (TIP-1…29) is cited by a test title, every
// fixture has a baseline (drawn on a 320 × 200 window, the spec's stage), and every value is read back from the tokens.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';
import { PLACEMENTS, type TanreiTooltipPlacement, type TooltipArrow, placeTooltip } from './tooltip-placement.js';

const spec = loadSpec('tooltip');
type P = Page;
const tip = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-tooltip`);
/** The placed box (the popover), never transformed; what is painted inside it; and what moves as it opens and closes. */
const surface = (page: P, id: string) => tip(page, id).locator('.surface');
const container = (page: P, id: string) => tip(page, id).locator('.bubble');
const motion = (page: P, id: string) => tip(page, id).locator('.motion');
const arrow = (page: P, id: string) => tip(page, id).locator('.arrow');
const side = (page: P, id: string) => surface(page, id).evaluate((el: HTMLElement) => el.dataset.side);
const anchor = (page: P, id: string) => tip(page, id).locator('tanrei-button');
const button = (page: P, id: string) => anchor(page, id).locator('button');
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-tooltip-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const shown = (page: P, id: string) => surface(page, id).evaluate((el) => el.matches(':popover-open'));
const isOpen = (page: P, id: string) => tip(page, id).evaluate((el: any) => el.open as boolean);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);

const f = (id: string, props: Fixture['props'], content = 'delete'): Fixture => ({ id, props: { text: 'Move to trash', ...props }, content });
/** Every toggle the tooltips fire, as `<fixture>:<open>`. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const t of document.querySelectorAll<any>('tanrei-tooltip')) t.addEventListener('toggle', (e: CustomEvent) => log.push(`${t.closest('[data-fixture]').dataset.fixture}:${e.detail.open}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/**
 * Holds the page's timers still (`setTimeout`, `requestAnimationFrame`) until the test moves them on with
 * `page.clock.runFor()`. CSS animations keep the document's own timeline.
 */
async function pauseClock(page: P) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
}
/** Mounts fixtures with short, distinct delays, so that each is observable without long waits. */
async function mount(page: P, fixtures: Fixture[], delays: { show?: string; hide?: string; touch?: string } = {}) {
  await mountFixtures(page, spec, { icons: true, fixtures });
  await override(page, { [T('motion-show-delay')]: delays.show ?? '400ms', [T('motion-hide-delay')]: delays.hide ?? '300ms', [T('timeout-touch')]: delays.touch ?? '500ms' });
  await wire(page);
  // Somewhere for Tab to go after the last anchor (headless Firefox does not wrap around).
  await page.evaluate(() => document.querySelector('main')!.append(Object.assign(document.createElement('button'), { id: 'after', textContent: 'After' })));
  await page.mouse.move(0, 0);
}
/** A touch long-press on the first anchor: the platform's `contextmenu`. Whether it was prevented (no menu, no callout). */
const longPress = (page: P) =>
  page.locator('tanrei-button button').first().evaluate((el) => {
    const event = new PointerEvent('contextmenu', { pointerType: 'touch', bubbles: true, composed: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
/** A touch event on the first anchor or on the page. */
const touch = (page: P, type: string, where: 'anchor' | 'body') =>
  page.evaluate(
    ([t, w]) => {
      const target = w === 'anchor' ? document.querySelector('tanrei-button')! : document.body;
      target.dispatchEvent(new PointerEvent(t, { pointerType: 'touch', bubbles: true, composed: true }));
    },
    [type, where] as const,
  );
const timing = (page: P, id: string) => tip(page, id).evaluate((el: any) => el.timing() as { show: number; hide: number; touch: number });

test.describe('opening and closing', () => {
  test('TIP-1: a resting pointer opens it after the show delay; it stays while the pointer moves onto it, and closes once the pointer has been off both for the hide delay', async ({ page }) => {
    // The delays are the tokens'.
    await mountFixtures(page, spec, { icons: true, fixtures: [f('a', {})] });
    expect(await tip(page, 'a').evaluate((el: any) => el.timing())).toEqual({
      show: await resolveToken(page, T('motion-show-delay'), 'duration'),
      hide: await resolveToken(page, T('motion-hide-delay'), 'duration'),
      touch: await resolveToken(page, T('timeout-touch'), 'duration'),
    });
    await mount(page, [f('a', {})]);
    // The delays run on the page's clock, held still and moved on by the test: what is checked is how the pointer's moves
    // and the delays order the tooltip, not how quickly a loaded machine gets from one step of the test to the next.
    await pauseClock(page);
    await anchor(page, 'a').hover();
    await page.clock.runFor(399);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    // Across the gap onto the tooltip: it stays, for longer than the hide delay.
    const s = await bounds(surface(page, 'a'));
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2, { steps: 4 });
    await page.clock.runFor(500);
    expect(await isOpen(page, 'a')).toBe(true);
    // Off both: it closes once the hide delay has passed, and not before.
    await page.mouse.move(2, 190);
    await page.clock.runFor(299);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false']);
  });

  test('TIP-2: keyboard focus opens it at once and losing focus closes it; focus by pointer does not open it', async ({ page, browserName }) => {
    await mount(page, [f('a', {})], { show: '10s' });
    await tabTo(page, button(page, 'a'));
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => shown(page, 'a')).toBe(true);
    await tab(page);
    await expect.poll(() => isOpen(page, 'a')).toBe(false);
    // Once tooltips are no longer warm (TIP-28: the pointer would open it at once inside that time, whatever its delay).
    await page.waitForTimeout((await resolveToken(page, T('motion-warm-duration'), 'duration')) + 100);
    await page.mouse.move(0, 0);
    await anchor(page, 'a').hover();
    await page.mouse.down();
    // Safari does not focus a button that is pressed; the others do.
    if (browserName !== 'webkit') await expect(button(page, 'a')).toBeFocused();
    await page.waitForTimeout(200);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.mouse.up();
    expect(await log(page)).toEqual(['a:true', 'a:false']);
  });

  test('TIP-3: a touch long-press opens it without activating the anchor; after the finger lifts it stays for the touch timeout; a touch elsewhere closes it sooner', async ({ page }) => {
    await mount(page, [f('a', {})], { touch: '600ms' });
    await page.evaluate(() => document.querySelector('tanrei-button')!.addEventListener('click', () => (window as any).log.push('click')));
    expect(await longPress(page)).toBe(true); // no context menu, no callout
    expect(await isOpen(page, 'a')).toBe(true);
    // The touch timeout runs on the page's clock, moved on by the test (as in TIP-1).
    await pauseClock(page);
    await touch(page, 'pointerup', 'anchor');
    await page.clock.runFor(599);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(false);
    await longPress(page);
    await touch(page, 'pointerup', 'anchor');
    await touch(page, 'pointerdown', 'body');
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'a:true', 'a:false']);
  });

  test('TIP-1: the gap between the anchor and the tooltip counts as hover, so it stays hoverable at a hide delay of 0; the gap is not drawn and takes no press', async ({ page }) => {
    await mount(page, [f('a', { hideDelay: 0 })]);
    await pauseClock(page);
    await anchor(page, 'a').hover();
    await page.clock.runFor(400);
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => shown(page, 'a')).toBe(true);
    const [a, s] = [await bounds(anchor(page, 'a')), await bounds(surface(page, 'a'))];
    expect(a.y - (s.y + s.height)).toBeCloseTo(await resolveToken(page, T('offset')), 0);
    const gap = (s.y + s.height + a.y) / 2;
    // Up out of the anchor into the gap, then along it to near the container's start edge, far from the anchor: resting
    // there for longer than any delay, it stays.
    await page.mouse.move(a.x + a.width / 2, gap, { steps: 4 });
    await page.mouse.move(s.x + 2, gap, { steps: 8 });
    await page.clock.runFor(1000);
    expect(await isOpen(page, 'a')).toBe(true);
    // Nothing is drawn there: what lies under the gap is what a press there reaches.
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-tooltip') ?? null, [s.x + 2, gap])).toBeNull();
    // Beside the gap (past the container's edge) is off everything: at a hide delay of 0 it closes at once.
    await page.mouse.move(s.x - 4, gap);
    expect(await isOpen(page, 'a')).toBe(false);
    // Across the gap onto the tooltip, slowly, and off it: it stays until the pointer leaves the tooltip.
    await anchor(page, 'a').hover();
    await page.clock.runFor(400);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.mouse.move(a.x + a.width / 2, s.y + s.height / 2, { steps: 12 });
    await page.clock.runFor(1000);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.mouse.move(2, 190);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'a:true', 'a:false']);
  });

  test('TIP-3: a touch timeout of 0 shows it for the whole long-press and closes it as the finger lifts (TIP-17)', async ({ page }) => {
    await mount(page, [f('a', { touchTimeout: 0 })]);
    expect(await longPress(page)).toBe(true);
    expect(await isOpen(page, 'a')).toBe(true);
    await pauseClock(page);
    // The finger stays down: it stays.
    await page.clock.runFor(2000);
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => shown(page, 'a')).toBe(true);
    await touch(page, 'pointerup', 'anchor');
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false']);
  });

  test('TIP-4: Escape closes it without moving focus, is consumed (an enclosing dialog stays open), and it stays closed until the anchor is entered or focused again', async ({ page }) => {
    await mount(page, [f('a', {})]);
    await page.evaluate(() => document.addEventListener('keydown', (e) => e.key === 'Escape' && (window as any).log.push('escape reached the page')));
    await tabTo(page, button(page, 'a'));
    await page.keyboard.press('Escape');
    expect(await isOpen(page, 'a')).toBe(false);
    await expect(button(page, 'a')).toBeFocused();
    await page.waitForTimeout(500);
    expect(await isOpen(page, 'a')).toBe(false);
    // Hovered again: it opens again.
    await anchor(page, 'a').hover();
    await expect.poll(() => isOpen(page, 'a')).toBe(true);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'a:true']);
    // Inside a modal dialog: Escape closes the tooltip and the dialog stays open.
    await page.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.innerHTML = '<tanrei-tooltip text="In a dialog"><button id="inner">Inner</button></tanrei-tooltip>';
      document.body.append(dialog);
      dialog.showModal();
    });
    await tabTo(page, page.locator('#inner'));
    await expect.poll(() => page.locator('dialog tanrei-tooltip').evaluate((el: any) => el.open)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await page.locator('dialog tanrei-tooltip').evaluate((el: any) => el.open)).toBe(false);
    expect(await page.locator('dialog').evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
  });

  test('TIP-5: while hovered or keyboard-focused it stays open with no time limit', async ({ page }) => {
    await mount(page, [f('a', {}), f('b', {})], { show: '100ms', hide: '100ms', touch: '100ms' });
    await tabTo(page, button(page, 'a'));
    await page.waitForTimeout(800);
    expect(await isOpen(page, 'a')).toBe(true);
    await anchor(page, 'b').hover();
    await page.waitForTimeout(800);
    expect(await isOpen(page, 'b')).toBe(true);
  });

  test('TIP-6: activating the anchor closes it, and the same hover does not open it again until the pointer leaves and comes back', async ({ page }) => {
    // Enter and Space on the focused anchor close it.
    for (const key of ['Enter', 'Space']) {
      await mount(page, [f('a', {})]);
      await tabTo(page, button(page, 'a'));
      expect(await isOpen(page, 'a'), key).toBe(true);
      await page.keyboard.press(key);
      expect(await isOpen(page, 'a'), key).toBe(false);
    }
    // A click closes it; the same hover does not open it again, a new one does.
    await mount(page, [f('a', {})]);
    await anchor(page, 'a').hover();
    await expect.poll(() => isOpen(page, 'a')).toBe(true);
    await anchor(page, 'a').click();
    expect(await isOpen(page, 'a')).toBe(false);
    await page.waitForTimeout(700);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.mouse.move(0, 0);
    await anchor(page, 'a').hover();
    await expect.poll(() => isOpen(page, 'a')).toBe(true);
  });

  test('TIP-7: opening and closing by itself emits toggle with the new value; setting open emits nothing and the tooltip keeps following its triggers', async ({ page }) => {
    await mount(page, [f('a', {})]);
    await tip(page, 'a').evaluate((el: any) => (el.open = true));
    await expect.poll(() => shown(page, 'a')).toBe(true);
    await tip(page, 'a').evaluate((el: any) => (el.open = false));
    await expect.poll(() => shown(page, 'a')).toBe(false);
    expect(await log(page)).toEqual([]);
    await tabTo(page, button(page, 'a'));
    await tab(page);
    expect(await log(page)).toEqual(['a:true', 'a:false']);
  });

  test('TIP-8: a tooltip opening closes the open one at once, and opens without the show delay; at most one is open', async ({ page }) => {
    await mount(page, [f('a', {}), f('b', {})], { show: '2s' });
    await tabTo(page, button(page, 'a'));
    expect(await isOpen(page, 'a')).toBe(true);
    await anchor(page, 'b').hover();
    await expect.poll(() => isOpen(page, 'b'), { timeout: 1000 }).toBe(true);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await shown(page, 'a')).toBe(false); // at once, without the fade
    expect(await log(page)).toEqual(['a:true', 'a:false', 'b:true']);
    // Set by the product too: one at a time.
    await tip(page, 'a').evaluate((el: any) => (el.open = true));
    await expect.poll(() => isOpen(page, 'b')).toBe(false);
    expect(await page.evaluate(() => document.querySelectorAll('tanrei-tooltip[open]').length)).toBe(1);
  });

  test('TIP-17: show-delay, hide-delay and touch-timeout are milliseconds used as given in place of the tokens, not scaled by the motion dial; 0 opens and closes at once', async ({ page }) => {
    const set = { showDelay: 150, hideDelay: 50, touchTimeout: 250 };
    // Unset, the tokens; set, the values as written, whatever the motion dial says.
    await mountFixtures(page, spec, { icons: true, fixtures: [f('a', set), f('unset', {})] });
    await override(page, { '--tanrei-dial-motion-unit': '100ms' });
    const tokens = { show: await resolveToken(page, T('motion-show-delay'), 'duration'), hide: await resolveToken(page, T('motion-hide-delay'), 'duration'), touch: await resolveToken(page, T('timeout-touch'), 'duration') };
    expect(tokens.show).not.toBe(150);
    expect(await timing(page, 'unset')).toEqual(tokens);
    expect(await timing(page, 'a')).toEqual({ show: 150, hide: 50, touch: 250 });
    expect(await tip(page, 'a').evaluate((el: any) => [el.showDelay, el.hideDelay, el.touchTimeout])).toEqual([150, 50, 250]);

    await mount(page, [f('a', set), f('z', { showDelay: 0, hideDelay: 0 })]);
    await pauseClock(page);
    await anchor(page, 'a').hover();
    await page.clock.runFor(149);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.mouse.move(2, 190);
    await page.clock.runFor(49);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(false);
    // 0: it opens as the pointer enters, and closes as it leaves.
    await anchor(page, 'z').hover();
    expect(await isOpen(page, 'z')).toBe(true);
    await page.mouse.move(2, 190);
    expect(await isOpen(page, 'z')).toBe(false);
    // The touch timeout, after the finger lifts.
    await longPress(page);
    await touch(page, 'pointerup', 'anchor');
    await page.clock.runFor(249);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'z:true', 'z:false', 'a:true', 'a:false']);
  });

  test('TIP-17: an empty, negative or non-numeric value takes the token, does not open at once, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [f('empty', { showDelay: '' }), f('negative', { showDelay: -5, hideDelay: -1 }), f('word', { touchTimeout: '2s' })]);
    await tip(page, 'word').evaluate((el: any) => {
      el.showDelay = Number.NaN;
      el.hideDelay = Number.POSITIVE_INFINITY;
    });
    const tokens = { show: 400, hide: 300, touch: 500 };
    for (const id of ['empty', 'negative', 'word']) expect(await timing(page, id), id).toEqual(tokens);
    // An empty attribute is not 0: the pointer waits for the token.
    await pauseClock(page);
    await anchor(page, 'empty').hover();
    expect(await isOpen(page, 'empty')).toBe(false);
    await page.clock.runFor(399);
    expect(await isOpen(page, 'empty')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'empty')).toBe(true);
    await expect.poll(() => seen.filter((w) => w.includes('TIP-17')).length).toBe(6);
    const said = seen.join('\n');
    expect(said).toMatch(/show-delay "-5" is negative; comp\.tooltip\.motion\.show-delay is used/);
    expect(said).toMatch(/hide-delay "-1" is negative; comp\.tooltip\.motion\.hide-delay is used/);
    expect(said).toMatch(/touch-timeout "NaN" is not a finite number; comp\.tooltip\.timeout\.touch is used/);
    expect(said).toMatch(/hide-delay "Infinity" is not a finite number/);
  });

  test('TIP-18: the waits are kept where motion is reduced; focus, another open tooltip and open do not wait for them; a change mid-wait applies from the next wait', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [f('a', { showDelay: 300, hideDelay: 200 }), f('b', { showDelay: 10000 })]);
    await pauseClock(page);
    // Reduced motion: the set delays and the tokens both still wait.
    await anchor(page, 'a').hover();
    await page.clock.runFor(299);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    // Another tooltip open (TIP-8): b opens without its 10 s wait, and a closes at once.
    await anchor(page, 'b').hover();
    expect(await isOpen(page, 'b')).toBe(true);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.mouse.move(2, 190);
    await page.clock.runFor(299); // b's hide delay is the token's
    expect(await isOpen(page, 'b')).toBe(true);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'b')).toBe(false);
    // Keyboard focus (TIP-2) opens it at once, whatever its show delay.
    await tabTo(page, button(page, 'b'));
    expect(await isOpen(page, 'b')).toBe(true);
    await tab(page);
    expect(await isOpen(page, 'b')).toBe(false);
    // The product setting open (TIP-7): at once.
    await tip(page, 'b').evaluate((el: any) => (el.open = true));
    await expect.poll(() => shown(page, 'b')).toBe(true);
    await tip(page, 'b').evaluate((el: any) => (el.open = false));
    // A change while the show delay runs: the running wait finishes as it started; the next one takes the new value.
    // (Past the fade and the warm time first: inside them the pointer waits for no delay at all, TIP-28.)
    await rested(page, 'b');
    await page.clock.runFor(1000);
    await anchor(page, 'a').hover();
    await page.clock.runFor(100);
    await tip(page, 'a').evaluate((el: any) => (el.showDelay = 1000));
    await page.clock.runFor(199);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.mouse.move(2, 190);
    await page.clock.runFor(200);
    expect(await isOpen(page, 'a')).toBe(false);
    await rested(page, 'a');
    await page.clock.runFor(1000);
    await anchor(page, 'a').hover();
    await page.clock.runFor(999);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
  });
});

/** Puts a fixture's anchor — 40 × 40 at the centre of its 320 × 200 stage — with its top left corner at (x, y) of the window. */
const anchorAt = (page: P, id: string, x: number, y: number) =>
  page.evaluate(
    ([fixture, left, top]) => {
      const stage = document.querySelector<HTMLElement>(`[data-fixture="${fixture}"]`)!;
      Object.assign(stage.style, { position: 'fixed', left: `${left}px`, top: `${top}px`, background: 'none' });
    },
    [id, x - 140, y - 80] as const,
  );
/** Once the faces have arrived and the frames that follow the anchor have run: what is measured is where it settled. */
const settle = (page: P) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
  });
/** Once its entering or leaving motion has run to its end. */
const rested = (page: P, id: string) => motion(page, id).evaluate((el) => Promise.allSettled(el.getAnimations().map((animation) => animation.finished)).then(() => undefined));
/** Sets props and waits for the update that draws them. */
const set = (page: P, id: string, props: Record<string, unknown>) =>
  tip(page, id).evaluate(async (el: any, p) => {
    Object.assign(el, p);
    await el.updateComplete;
  }, props);
/** Opens it as a product does and returns the anchor's box and the placed box, once it has settled. */
async function openIt(page: P, id: string) {
  await set(page, id, { open: true });
  await expect.poll(() => shown(page, id)).toBe(true);
  await settle(page);
  // …and its entering motion has ended, so that what is drawn inside the placed box is at rest too.
  await rested(page, id);
  return [await bounds(anchor(page, id)), await bounds(surface(page, id))] as const;
}
const edges = (b: { x: number; y: number; width: number; height: number }) => ({ left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, centerX: b.x + b.width / 2, centerY: b.y + b.height / 2 });
type Edges = ReturnType<typeof edges>;
/** Opens it and returns both boxes as their edges and centres. */
async function openedEdges(page: P, id: string): Promise<[Edges, Edges]> {
  const [a, s] = await openIt(page, id);
  return [edges(a), edges(s)];
}
/**
 * The running motions of the wrapper, held at their first frame (0) or their last (1). They are kept for `endMotion()`:
 * held at its end a transition is no longer among the element's animations, and it has not finished either.
 */
const holdMotion = (page: P, id: string, progress: 0 | 1) =>
  motion(page, id).evaluate((el, at) => {
    const held = ((el as any).held = el.getAnimations());
    for (const animation of held) {
      animation.pause();
      animation.currentTime = at ? Number(animation.effect!.getComputedTiming().endTime) : 0;
    }
    return held.length;
  }, progress);
/** Lets the motions end now: those running, and those held. */
const endMotion = (page: P, id: string) =>
  motion(page, id).evaluate((el) => {
    for (const animation of new Set<Animation>([...((el as any).held ?? []), ...el.getAnimations()])) animation.finish();
    (el as any).held = [];
  });
const running = (page: P, id: string) => motion(page, id).evaluate((el) => el.getAnimations().length);

test.describe('placement in numbers', () => {
  // The geometry alone (tooltip-placement.ts): a 100 × 30 container, a 40 × 40 anchor, a 400 × 300 window, an offset of 4
  // and a margin of 8 — every side, alignment, direction and edge, without a browser's rounding in the way.
  const viewport = { width: 400, height: 300 };
  const size = { width: 100, height: 30 };
  const middle = { x: 180, y: 130, width: 40, height: 40 };
  const tri: TooltipArrow = { width: 12, height: 6, inset: 8, radius: 6, drawn: false };
  const place = (placement: TanreiTooltipPlacement, more: Partial<Parameters<typeof placeTooltip>[0]> = {}) =>
    placeTooltip({ anchor: middle, surface: size, viewport, placement, offset: 4, margin: 8, rtl: false, arrow: tri, ...more });
  const at = (x: number, y: number) => ({ ...middle, x, y });

  test('TIP-22: each of the twelve sides and alignments puts the container where it says: centred, or edge on edge', () => {
    const expected: Record<Exclude<TanreiTooltipPlacement, 'auto'>, [left: number, top: number]> = {
      top: [150, 96],
      'top-start': [180, 96],
      'top-end': [120, 96],
      bottom: [150, 174],
      'bottom-start': [180, 174],
      'bottom-end': [120, 174],
      start: [76, 135],
      'start-top': [76, 130],
      'start-bottom': [76, 140],
      end: [224, 135],
      'end-top': [224, 130],
      'end-bottom': [224, 140],
    };
    expect(PLACEMENTS).toHaveLength(13);
    for (const [placement, [left, top]] of Object.entries(expected) as [TanreiTooltipPlacement, [number, number]][]) {
      const got = place(placement);
      expect([got.left, got.top], placement).toEqual([left, top]);
      expect(got.held, placement).toBe(false);
    }
    // An unknown value is placed as the default says.
    expect(place('middle' as TanreiTooltipPlacement)).toEqual(place('top'));
  });

  test('TIP-20: in right-to-left, start and end are the right and the left, -start and -end the right and the left edges, and a positive crossOffset above or below moves left; top, bottom, -top, -bottom, a crossOffset beside the anchor and the centring stay', () => {
    const rtl = (placement: TanreiTooltipPlacement, more = {}) => place(placement, { rtl: true, ...more });
    // The sides.
    expect(rtl('start')).toMatchObject({ side: 'right', left: 224, top: 135 });
    expect(rtl('end')).toMatchObject({ side: 'left', left: 76, top: 135 });
    // The alignments above and below: the right edges meet for -start, the left edges for -end.
    expect(rtl('top-start').left).toBe(120);
    expect(rtl('bottom-end').left).toBe(180);
    // What does not mirror.
    for (const placement of ['top', 'bottom'] as const) expect(rtl(placement), placement).toEqual(place(placement));
    expect(rtl('start-top').top).toBe(place('start-top').top);
    expect(rtl('end-bottom').top).toBe(place('end-bottom').top);
    // crossOffset: towards the end — the left — above or below; towards the bottom beside, in both directions.
    expect(place('top', { crossOffset: 10 }).left).toBe(160);
    expect(rtl('top', { crossOffset: 10 }).left).toBe(140);
    expect(place('end', { crossOffset: 10 }).top).toBe(145);
    expect(rtl('end', { crossOffset: 10 }).top).toBe(145);
    // Flipping and shifting go on from there: start with no room at the right goes to the left, and keeps its alignment.
    expect(rtl('start-bottom', { anchor: at(340, 130) })).toMatchObject({ side: 'left', top: 140 });
    // auto keeps its order by the sides' names: end — the left — before start.
    const short = { viewport: { width: 400, height: 80 }, anchor: at(180, 20) };
    expect(place('auto', short).side).toBe('right');
    expect(rtl('auto', short).side).toBe('left');
  });

  test('TIP-9: it flips to the opposite side keeping its alignment, takes the roomier side when neither has room, shifts along the side as far as the margin asks, and larger than the room on its side stands over the anchor, still the margin inside the window — a window smaller than itself keeps the margin at its top and start edges', () => {
    // Flip: no room above, room below — the same edges still meet.
    expect(place('top-start', { anchor: at(180, 20) })).toMatchObject({ side: 'bottom', left: 180, top: 64, held: false });
    expect(place('top-end', { anchor: at(180, 20) })).toMatchObject({ side: 'bottom', left: 120 });
    expect(place('bottom', { anchor: at(180, 250) })).toMatchObject({ side: 'top', left: 150, top: 216 });
    expect(place('start-bottom', { anchor: at(20, 130) })).toMatchObject({ side: 'right', left: 64, top: 140 });
    expect(place('end-top', { anchor: at(340, 130) })).toMatchObject({ side: 'left', left: 236, top: 130 });
    // Every side and alignment, with the anchor in each corner: inside the window, and on the anchor's other side.
    for (const placement of PLACEMENTS) {
      for (const rtl of [false, true]) {
        for (const [x, y] of [[2, 2], [358, 2], [2, 258], [358, 258]]) {
          const got = place(placement, { anchor: at(x, y), rtl });
          const label = `${placement} ${rtl ? 'rtl' : 'ltr'} ${x},${y}`;
          expect(got.left, label).toBeGreaterThanOrEqual(8);
          expect(got.left + size.width, label).toBeLessThanOrEqual(392);
          expect(got.top, label).toBeGreaterThanOrEqual(8);
          expect(got.top + size.height, label).toBeLessThanOrEqual(292);
          expect(got.held, label).toBe(false);
        }
      }
    }
    // Neither side has room: the one with more, still the margin inside the window's edge — over the anchor rather than in the margin.
    const low = { viewport: { width: 400, height: 100 } };
    expect(place('top', { ...low, anchor: at(180, 36) })).toMatchObject({ side: 'top', top: 8, held: true });
    expect(place('top', { ...low, anchor: at(180, 24) })).toMatchObject({ side: 'bottom', top: 62, held: true });
    // Shift: as far as the margin asks, and no farther.
    expect(place('top', { anchor: at(2, 130) }).left).toBe(8);
    expect(place('top', { anchor: at(358, 130) }).left).toBe(292);
    expect(place('end', { anchor: at(180, 2) }).top).toBe(8);
    expect(place('end', { anchor: at(180, 258) }).top).toBe(262);
    expect(place('top', { anchor: at(100, 130) }).left).toBe(70); // room enough: it is not moved
    // Larger than the room on its side: the margin inside the window, over the anchor; a window smaller than the
    // container gives up the margin at its bottom and end edges — its top and start edges keep it.
    const small = { viewport: { width: 90, height: 60 }, anchor: at(30, 10) };
    expect(place('top', small)).toMatchObject({ side: 'top', top: 8, left: 8, held: true });
    expect(place('top', { ...small, rtl: true })).toMatchObject({ top: 8, left: -18, held: true });
    expect(place('top', { ...small, viewport: { width: 90, height: 20 } })).toMatchObject({ top: 8, held: true });
    expect(place('end', small)).toMatchObject({ side: 'left', left: 8, held: true });
    expect(place('start', { ...small, rtl: true })).toMatchObject({ side: 'left', left: -18, held: true });
  });

  test('TIP-9: it keeps the side it is on for as long as that side has room, and decides again only when it has none', () => {
    // Flipped below; the anchor moves down until there is room above again: it stays below.
    expect(place('top', { anchor: at(180, 20) }).side).toBe('bottom');
    expect(place('top', { anchor: at(180, 100), keep: 'bottom' }).side).toBe('bottom');
    expect(place('top', { anchor: at(180, 100) }).side).toBe('top'); // a tooltip that opens there takes its preferred side
    // …until below has no room: then it decides again, from its preferred side.
    expect(place('top', { anchor: at(180, 250), keep: 'bottom' }).side).toBe('top');
    // A side the placement does not name is not a side to keep.
    expect(place('start', { keep: 'top' }).side).toBe('left');
  });

  test('TIP-23: auto takes the first of top, bottom, end and start that has room, or the one with the most, centred, and keeps the side it took while it has room', () => {
    expect(place('auto')).toMatchObject({ side: 'top', left: 150, top: 96 });
    expect(place('auto', { anchor: at(180, 10) })).toMatchObject({ side: 'bottom', left: 150 });
    // A window too short for the container above or below: end; and start where end has no room either.
    const short = { width: 400, height: 80 };
    expect(place('auto', { viewport: short, anchor: at(10, 20) })).toMatchObject({ side: 'right', top: 25 });
    expect(place('auto', { viewport: short, anchor: at(340, 20) })).toMatchObject({ side: 'left', top: 25 });
    // None has room: the one with the most.
    expect(place('auto', { viewport: { width: 120, height: 80 }, anchor: at(60, 20) }).side).toBe('left');
    // Scrolled while open: the side is kept until it has no room.
    expect(place('auto', { anchor: at(180, 100), keep: 'bottom' }).side).toBe('bottom');
    expect(place('auto', { anchor: at(180, 250), keep: 'bottom' }).side).toBe('top');
  });

  test('TIP-24: the offset is the distance from the anchor’s edge — to the arrow’s tip while one is drawn — and crossOffset moves it along the side, never leaving less than the arrow’s width of it beside the anchor', () => {
    expect(place('top', { offset: 0 }).top).toBe(100);
    expect(place('top', { offset: 20 }).top).toBe(80);
    expect(place('end', { offset: 20 }).left).toBe(240);
    // With an arrow the container stands the arrow's height farther away, so the tip keeps the offset.
    expect(place('top', { arrow: { ...tri, drawn: true } }).top).toBe(90);
    expect(place('start', { arrow: { ...tri, drawn: true } }).left).toBe(70);
    // crossOffset, before the shift; a value that is not a number is 0.
    expect(place('top-start', { crossOffset: 16 }).left).toBe(196);
    expect(place('top-start', { crossOffset: -16 }).left).toBe(164);
    expect(place('top', { crossOffset: Number.NaN }).left).toBe(150);
    expect(place('top', { anchor: at(2, 130), crossOffset: -30 }).left).toBe(8);
    // Limited: an arrow's width (12) of the container stays beside the anchor (180 to 220).
    expect(place('top-start', { crossOffset: 500 }).left).toBe(208);
    expect(place('top-start', { crossOffset: -500 }).left).toBe(92);
    expect(place('end-top', { crossOffset: 500 }).top).toBe(158);
  });

  test('TIP-25: the arrow points at the middle of the part of the anchor’s edge the container stands beside, stays off the corners, moves with a flip and a shift, and is not drawn over the anchor', () => {
    const drawn = { arrow: { ...tri, drawn: true } };
    // Centred, start-aligned and end-aligned: the anchor's centre (200), wherever that is along the container.
    for (const [placement, point] of [['top', 50], ['top-start', 20], ['top-end', 80], ['bottom-start', 20], ['start', 15], ['end-top', 15]] as const) {
      const got = place(placement, drawn);
      expect(got.arrow, placement).toBe(true);
      expect(got.point, placement).toBe(point);
    }
    // Right-to-left: top-start meets the right edges, and the tip is still at the anchor's centre.
    expect(place('top-start', { ...drawn, rtl: true })).toMatchObject({ left: 120, point: 80 });
    // After a flip: on the edge that now faces the anchor, at the same point.
    expect(place('top-start', { ...drawn, anchor: at(180, 20) })).toMatchObject({ side: 'bottom', point: 20, top: 70 });
    // After a shift at the window's edge: the middle of what is left of the anchor beside the container…
    expect(place('top', { ...drawn, anchor: at(2, 130) })).toMatchObject({ left: 8, point: 17 });
    // …and never nearer a corner than the inset (8) or the radius, plus half its base (6).
    expect(place('top', { ...drawn, anchor: at(-10, 130) }).point).toBe(14);
    expect(place('top-start', { arrow: { ...tri, drawn: true, radius: 15 } }).point).toBe(21);
    // An edge too short for both insets: its middle.
    expect(place('top', { surface: { width: 30, height: 30 }, arrow: { ...tri, drawn: true, radius: 15 } }).point).toBe(15);
    // Where it would point without one is the same point (TIP-15's fixed point).
    expect(place('top-start').point).toBe(20);
    expect(place('top-start').arrow).toBe(false);
    // Over the anchor: no arrow.
    expect(place('top', { ...drawn, viewport: { width: 400, height: 60 }, anchor: at(180, 10) })).toMatchObject({ held: true, arrow: false });
  });
});

test.describe('placement', () => {
  test('TIP-9: the offset from the anchor on the placement side, flipped keeping the alignment when there is no room, shifted into the margin, following the anchor', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('top', { placement: 'top' }), f('aligned', { placement: 'top-start' }), f('beside', { placement: 'end-bottom' })]);
    const [offset, margin] = [await resolveToken(page, T('offset')), await resolveToken(page, T('window-margin'))];
    for (const id of ['top', 'aligned', 'beside']) await anchorAt(page, id, 380, 280);
    let [a, s] = await openIt(page, 'top');
    expect(a.y - (s.y + s.height)).toBeCloseTo(offset, 0);
    expect(edges(s).centerX).toBeCloseTo(edges(a).centerX, 0);
    // No room above: it flips below; near the left edge it shifts right to the margin, and no farther.
    await anchorAt(page, 'top', 2, 2);
    await settle(page);
    [a, s] = [await bounds(anchor(page, 'top')), await bounds(surface(page, 'top'))];
    expect(await side(page, 'top')).toBe('bottom');
    expect(s.y - (a.y + a.height)).toBeCloseTo(offset, 0);
    expect(s.x).toBeCloseTo(margin, 0);
    // It follows the anchor.
    await anchorAt(page, 'top', 300, 300);
    await settle(page);
    [a, s] = [await bounds(anchor(page, 'top')), await bounds(surface(page, 'top'))];
    expect(edges(s).centerX).toBeCloseTo(edges(a).centerX, 0);
    // Flipped, the alignment is kept: top-start below is bottom-start, the start edges still meeting.
    await anchorAt(page, 'aligned', 380, 2);
    [a, s] = await openIt(page, 'aligned');
    expect(await side(page, 'aligned')).toBe('bottom');
    expect(s.x).toBeCloseTo(a.x, 0);
    expect(s.y - (a.y + a.height)).toBeCloseTo(offset, 0);
    // …and beside the anchor: end-bottom with no room at the right stands at the left, the bottom edges still meeting.
    await anchorAt(page, 'beside', 756, 280);
    [a, s] = await openIt(page, 'beside');
    expect(await side(page, 'beside')).toBe('left');
    expect(a.x - (s.x + s.width)).toBeCloseTo(offset, 0);
    expect(edges(s).bottom).toBeCloseTo(edges(a).bottom, 0);
  });

  test('TIP-9: it keeps the side it is on while that side has room, so a page that scrolls does not throw it from side to side', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', { placement: 'top' })]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div style="block-size: 2000px"></div>'));
    // The anchor is at the top of the page: no room above, so it stands below.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="a"]')!.style.cssText = 'padding: 0; block-size: 40px; margin-block-start: 10px'));
    await openIt(page, 'a');
    expect(await side(page, 'a')).toBe('bottom');
    // The page is laid out lower, and there is room above now: it stays below, following.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="a"]')!.style.marginBlockStart = '300px'));
    await settle(page);
    expect(await side(page, 'a')).toBe('bottom');
    let [a, s] = [await bounds(anchor(page, 'a')), await bounds(surface(page, 'a'))];
    expect(s.y).toBeGreaterThan(a.y + a.height);
    // Scrolled until below has no room: it decides again, and takes its preferred side.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="a"]')!.style.marginBlockStart = '540px'));
    await settle(page);
    expect(await side(page, 'a')).toBe('top');
    // …which it keeps in turn.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="a"]')!.style.marginBlockStart = '300px'));
    await settle(page);
    expect(await side(page, 'a')).toBe('top');
    [a, s] = [await bounds(anchor(page, 'a')), await bounds(surface(page, 'a'))];
    expect(s.y + s.height).toBeLessThan(a.y);
    expect(await isOpen(page, 'a')).toBe(true);
  });

  test('TIP-9: in a window smaller than the tooltip it stands inside the window over the anchor, top and start edges first, and draws no arrow', async ({ page }) => {
    await page.setViewportSize({ width: 240, height: 120 });
    const text = 'Move the selected files to the trash. They are deleted after 30 days, and until then they still count toward your storage.';
    await mount(page, [f('a', { text, arrow: true })]);
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="a"]')!.style.cssText = 'position: fixed; inset: 0; inline-size: auto; block-size: auto'));
    const [, s] = await openIt(page, 'a');
    // Taller than the room above or below the anchor: it is back inside the window, over the anchor.
    expect(s.height).toBeGreaterThan(40);
    const margin = await resolveToken(page, T('window-margin'));
    expect(s.y).toBeGreaterThanOrEqual(margin - 0.5);
    // The margin kept at the bottom too where the window has room for it; else the top edge keeps it first.
    if (s.height <= 120 - 2 * margin) expect(s.y + s.height).toBeLessThanOrEqual(120.5 - margin);
    else expect(s.y).toBeCloseTo(margin, 0);
    expect(s.x).toBeGreaterThanOrEqual(await resolveToken(page, T('window-margin')) - 0.5);
    await expect(arrow(page, 'a')).toBeHidden();
    // Smaller still — shorter than the tooltip itself: its top edge keeps the margin, and the bottom gives it up.
    await page.setViewportSize({ width: 240, height: 48 });
    await settle(page);
    expect(await isOpen(page, 'a')).toBe(true);
    expect((await bounds(surface(page, 'a'))).y).toBeCloseTo(await resolveToken(page, T('window-margin')), 0);
  });

  test('TIP-9: it closes when the anchor is hidden, scrolled out of the window, removed, or scrolled out of sight inside a scrolling ancestor', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('hidden', {}), f('window', {}), f('removed', {}), f('scroller', {}), f('across', {})]);
    await page.addStyleTag({ content: `.stage:has(> tanrei-tooltip) { position: fixed; top: 200px; left: 240px; background: none; }` });
    await page.evaluate(() => ((window as any).log.length = 0));
    await openIt(page, 'hidden');
    await page.addStyleTag({ content: `[data-fixture="hidden"] tanrei-button { display: none; }` });
    await expect.poll(() => isOpen(page, 'hidden')).toBe(false);
    await openIt(page, 'window');
    await page.addStyleTag({ content: `[data-fixture="window"] { top: 900px !important; }` });
    await expect.poll(() => isOpen(page, 'window')).toBe(false);
    await openIt(page, 'removed');
    await tip(page, 'removed').evaluate((el) => el.remove());
    expect(await page.evaluate(() => document.querySelectorAll('tanrei-tooltip').length)).toBe(4);
    // Inside a scrolling ancestor, in the middle of the window: scrolled until none of it shows, while it is still inside
    // the window. Half out of sight it stays; the moment nothing of it can be seen it closes.
    for (const [id, axis] of [['scroller', 'y'], ['across', 'x']] as const) {
      await page.evaluate((fixture) => {
        const stage = document.querySelector<HTMLElement>(`[data-fixture="${fixture}"]`)!;
        const scroller = document.createElement('div');
        scroller.id = `scroller-${fixture}`;
        scroller.style.cssText = 'position: fixed; top: 200px; left: 240px; inline-size: 200px; block-size: 120px; overflow: auto';
        const content = document.createElement('div');
        content.style.cssText = 'box-sizing: border-box; inline-size: 1000px; block-size: 1000px; padding: 40px 80px';
        content.append(stage.querySelector('tanrei-tooltip')!);
        scroller.append(content);
        stage.replaceChildren(scroller);
        stage.style.position = 'static';
      }, id);
      await openIt(page, id);
      const scroll = (by: number) => page.evaluate(([fixture, along, to]) => document.querySelector(`#scroller-${fixture}`)!.scrollTo(along === 'x' ? { left: to } : { top: to }), [id, axis, by] as const);
      await scroll(axis === 'y' ? 60 : 100); // half of the anchor is past the scroller's edge
      await settle(page);
      expect(await isOpen(page, id), id).toBe(true);
      await scroll(axis === 'y' ? 80 : 120); // all of it
      await expect.poll(() => isOpen(page, id), id).toBe(false);
      const a = await bounds(anchor(page, id));
      expect(a.y + a.height, id).toBeGreaterThan(0); // still inside the window
      expect(a.x + a.width, id).toBeGreaterThan(0);
    }
    expect(await log(page)).toEqual(['hidden:false', 'window:false', 'scroller:false', 'across:false']);
  });

  test('TIP-19: when the layout direction of an ancestor changes while it is shown it is placed again by the new direction at once, staying open', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', { placement: 'end' })]);
    await anchorAt(page, 'a', 380, 280);
    await page.evaluate(() => {
      const stage = document.querySelector('[data-fixture="a"]')!;
      const inner = document.createElement('div');
      inner.id = 'direction';
      inner.style.display = 'contents';
      inner.append(...stage.childNodes);
      stage.append(inner);
    });
    let [a, s] = await openIt(page, 'a');
    expect(s.x).toBeGreaterThan(a.x + a.width);
    await rested(page, 'a');
    await page.evaluate(() => document.querySelector('#direction')!.setAttribute('dir', 'rtl'));
    await settle(page);
    [a, s] = [await bounds(anchor(page, 'a')), await bounds(surface(page, 'a'))];
    expect(s.x + s.width).toBeLessThan(a.x);
    expect(await isOpen(page, 'a')).toBe(true);
    expect(await running(page, 'a')).toBe(0);
    expect(await log(page)).toEqual([]);
  });

  test('TIP-20: right-to-left — start is the anchor’s right side and end its left, top-start meets the right edges and bottom-end the left, a positive crossOffset moves left, the shortcut is at the left of the text and a rich title and text start at the right', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const rtl = (id: string, props: Fixture['props'], content?: string): Fixture => ({ ...f(id, props, content), direction: 'rtl' });
    await mount(page, [
      rtl('start', { placement: 'start' }),
      rtl('end', { placement: 'end' }),
      rtl('top-start', { placement: 'top-start' }),
      rtl('bottom-end', { placement: 'bottom-end' }),
      rtl('cross', { placement: 'top', crossOffset: 12 }),
      f('cross-ltr', { placement: 'top', crossOffset: 12 }),
      rtl('beside', { placement: 'end-top', crossOffset: 12 }),
      rtl('keys', { shortcut: ['mod+b'], text: 'Bold' }),
      rtl('rich', { variant: 'rich', title: 'Storage', text: 'Files in the trash still count toward your storage until they are deleted for good.' }, 'info'),
    ]);
    const offset = await resolveToken(page, T('offset'));
    const opened = async (id: string) => {
      await anchorAt(page, id, 380, 280);
      const [a, s] = await openIt(page, id);
      return [edges(a), edges(s)] as const;
    };
    let [a, s] = await opened('start');
    expect(s.left - a.right).toBeCloseTo(offset, 0);
    expect(s.centerY).toBeCloseTo(a.centerY, 0);
    [a, s] = await opened('end');
    expect(a.left - s.right).toBeCloseTo(offset, 0);
    [a, s] = await opened('top-start');
    expect(s.right).toBeCloseTo(a.right, 0);
    expect(s.left).toBeLessThan(a.left);
    [a, s] = await opened('bottom-end');
    expect(s.left).toBeCloseTo(a.left, 0);
    expect(s.top - a.bottom).toBeCloseTo(offset, 0);
    // A positive crossOffset: towards the end — left here, right in left-to-right.
    [a, s] = await opened('cross');
    expect(s.centerX).toBeCloseTo(a.centerX - 12, 0);
    [a, s] = await opened('cross-ltr');
    expect(s.centerX).toBeCloseTo(a.centerX + 12, 0);
    // Beside the anchor nothing mirrors but the side: the top edges meet, and a crossOffset still moves down.
    [a, s] = await opened('beside');
    expect(a.left - s.right).toBeCloseTo(offset, 0);
    expect(s.top).toBeCloseTo(a.top + 12, 0);
    // TIP-27: the shortcut after the text is at its left.
    await opened('keys');
    const [words, keys] = [await bounds(container(page, 'keys').locator('.text')), await bounds(container(page, 'keys').locator('.shortcut'))];
    expect(keys.x + keys.width).toBeLessThan(words.x + 0.5);
    // TIP-12: a rich tooltip's title and wrapped text start at the right: the same inset from the container's right edge.
    await opened('rich');
    const box = edges(await bounds(container(page, 'rich')));
    const inset = await resolveToken(page, T('rich-container-padding-inline'));
    for (const part of ['.title', '.text']) {
      // Where its lines of text end at the right: the short title too, which would stand at the left were it not start-aligned.
      const inked = await container(page, 'rich').locator(part).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return Math.max(...[...range.getClientRects()].map((rect) => rect.right));
      });
      expect(box.right - inked, part).toBeCloseTo(inset, 0);
    }
  });

  test('TIP-22: each placement stands on its side with its alignment; an unknown value is placed as top and reported; a change while shown takes the new place at once, without a motion', async ({ page }) => {
    const seen = warnings(page);
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', {})]);
    await anchorAt(page, 'a', 380, 280);
    const offset = await resolveToken(page, T('offset'));
    await openIt(page, 'a');
    await rested(page, 'a');
    const checks: Record<string, (a: Edges, s: Edges) => [number, number][]> = {
      top: (a, s) => [[a.top - s.bottom, offset], [s.centerX, a.centerX]],
      'top-start': (a, s) => [[a.top - s.bottom, offset], [s.left, a.left]],
      'top-end': (a, s) => [[a.top - s.bottom, offset], [s.right, a.right]],
      bottom: (a, s) => [[s.top - a.bottom, offset], [s.centerX, a.centerX]],
      'bottom-start': (a, s) => [[s.top - a.bottom, offset], [s.left, a.left]],
      'bottom-end': (a, s) => [[s.top - a.bottom, offset], [s.right, a.right]],
      start: (a, s) => [[a.left - s.right, offset], [s.centerY, a.centerY]],
      'start-top': (a, s) => [[a.left - s.right, offset], [s.top, a.top]],
      'start-bottom': (a, s) => [[a.left - s.right, offset], [s.bottom, a.bottom]],
      end: (a, s) => [[s.left - a.right, offset], [s.centerY, a.centerY]],
      'end-top': (a, s) => [[s.left - a.right, offset], [s.top, a.top]],
      'end-bottom': (a, s) => [[s.left - a.right, offset], [s.bottom, a.bottom]],
      auto: (a, s) => [[a.top - s.bottom, offset], [s.centerX, a.centerX]],
    };
    for (const [placement, check] of Object.entries(checks)) {
      // Measured in the same task as the update that changed it: the new place is taken at once, and nothing moves there.
      const got = await tip(page, 'a').evaluate(async (el: any, value) => {
        el.placement = value;
        await el.updateComplete;
        const box = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
        const moving = el.shadowRoot.querySelector('.motion');
        return { a: box(el.querySelector('tanrei-button').getBoundingClientRect()), s: box(el.shadowRoot.querySelector('.surface').getBoundingClientRect()), drawn: box(moving.getBoundingClientRect()), running: moving.getAnimations().length };
      }, placement);
      for (const [actual, expected] of check(edges(got.a), edges(got.s))) expect(actual, placement).toBeCloseTo(expected, 0);
      expect(got.running, placement).toBe(0);
      expect(got.drawn, placement).toEqual(got.s);
      await expect(tip(page, 'a')).toHaveAttribute('placement', placement);
    }
    // A value the tooltip does not define: placed as the default, and reported.
    await set(page, 'a', { placement: 'left' });
    const [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(a.top - s.bottom).toBeCloseTo(offset, 0);
    expect(s.centerX).toBeCloseTo(a.centerX, 0);
    await expect.poll(() => seen.filter((w) => w.includes('TIP-22')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/placement "left" is not one of top, top-start, .*auto; the tooltip is placed as "top"/);
  });

  test('TIP-23: auto takes bottom near the top edge, end in the top corner of a window too short above and below, start where end has no room either, and keeps the side it took while scrolled', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', { placement: 'auto' })]);
    await anchorAt(page, 'a', 380, 280);
    let [a, s] = await openIt(page, 'a');
    expect(await side(page, 'a')).toBe('top');
    expect(edges(s).centerX).toBeCloseTo(edges(a).centerX, 0);
    await set(page, 'a', { open: false });
    await anchorAt(page, 'a', 380, 4);
    [a, s] = await openIt(page, 'a');
    expect(await side(page, 'a')).toBe('bottom');
    // Scrolled while open: there is room above again, and it stays below until below has none.
    await anchorAt(page, 'a', 380, 280);
    await settle(page);
    expect(await side(page, 'a')).toBe('bottom');
    await anchorAt(page, 'a', 380, 552);
    await settle(page);
    expect(await side(page, 'a')).toBe('top');
    await set(page, 'a', { open: false });
    // A window too short for the container above or below the anchor: end, centred beside it.
    await page.setViewportSize({ width: 800, height: 80 });
    await anchorAt(page, 'a', 8, 20);
    [a, s] = await openIt(page, 'a');
    expect(await side(page, 'a')).toBe('right');
    expect(edges(s).centerY).toBeCloseTo(edges(a).centerY, 0);
    await set(page, 'a', { open: false });
    // …and start where end has no room either.
    await anchorAt(page, 'a', 752, 20);
    await openIt(page, 'a');
    expect(await side(page, 'a')).toBe('left');
  });

  test('TIP-24: offset is the distance from the anchor’s edge, 0 letting them touch, and the token while null; crossOffset moves it along the side but never off the anchor’s side; a negative or non-finite value is ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', {}), f('attributes', { offset: 20, crossOffset: 12, placement: 'bottom-start' }), f('empty', { offset: '', crossOffset: '' }), f('arrowed', { arrow: true, offset: 10 })]);
    for (const id of ['a', 'attributes', 'empty', 'arrowed']) await anchorAt(page, id, 380, 280);
    const token = await resolveToken(page, T('offset'));
    const gap = async (id: string) => {
      const [a, s] = [edges(await bounds(anchor(page, id))), edges(await bounds(surface(page, id)))];
      return (await side(page, id)) === 'top' ? a.top - s.bottom : s.top - a.bottom;
    };
    await openIt(page, 'a');
    expect(await gap('a')).toBeCloseTo(token, 0);
    for (const offset of [0, 20, 1.5]) {
      await set(page, 'a', { offset });
      expect(await gap('a'), String(offset)).toBeCloseTo(offset, 1);
    }
    // Null again: the token. A negative or non-finite one: the token too, and reported.
    await set(page, 'a', { offset: null });
    expect(await gap('a')).toBeCloseTo(token, 0);
    for (const offset of [-4, Number.NaN, Number.POSITIVE_INFINITY]) {
      await set(page, 'a', { offset });
      expect(await gap('a'), String(offset)).toBeCloseTo(token, 0);
    }
    // crossOffset along the side: towards the end above the anchor, towards the bottom beside it.
    await set(page, 'a', { offset: null, crossOffset: 16 });
    let [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(s.centerX).toBeCloseTo(a.centerX + 16, 0);
    await set(page, 'a', { placement: 'start', crossOffset: -6 });
    [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(s.centerY).toBeCloseTo(a.centerY - 6, 0);
    // Never off the anchor's side: an arrow's width of the container stays beside the anchor.
    const beside = await resolveToken(page, T('arrow-width'));
    await set(page, 'a', { placement: 'top', crossOffset: 1000 });
    [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(a.right - s.left).toBeCloseTo(beside, 0);
    await set(page, 'a', { crossOffset: -1000 });
    [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(s.right - a.left).toBeCloseTo(beside, 0);
    // Not a finite number: 0, and reported.
    await set(page, 'a', { crossOffset: Number.NaN });
    [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    expect(s.centerX).toBeCloseTo(a.centerX, 0);
    // The attributes: `offset` and `cross-offset` in CSS pixels.
    [a, s] = await openedEdges(page, 'attributes');
    expect(s.top - a.bottom).toBeCloseTo(20, 0);
    expect(s.left).toBeCloseTo(a.left + 12, 0);
    expect(await tip(page, 'attributes').evaluate((el: any) => [el.offset, el.crossOffset])).toEqual([20, 12]);
    // An empty attribute is not a number (not 0): the token, and no move.
    [a, s] = await openedEdges(page, 'empty');
    expect(a.top - s.bottom).toBeCloseTo(token, 0);
    expect(s.centerX).toBeCloseTo(a.centerX, 0);
    // With an arrow the offset is kept by the tip: the container stands the arrow's height farther away.
    [a, s] = await openedEdges(page, 'arrowed');
    expect(a.top - s.bottom).toBeCloseTo(10 + (await resolveToken(page, T('arrow-height'))), 0);
    const said = seen.join('\n');
    expect(said).toMatch(/offset "-4" is negative; comp\.tooltip\.offset is used in its place \(TIP-24\)/);
    expect(said).toMatch(/offset "NaN" is not a finite number; comp\.tooltip\.offset is used/);
    expect(said).toMatch(/offset "Infinity" is not a finite number/);
    expect(said).toMatch(/cross-offset "NaN" is not a finite number; 0 is used in its place \(TIP-24\)/);
  });

  test('TIP-1: the gap is as deep as the offset, and the arrow’s height deeper while an arrow is drawn; the pointer crosses it at any offset', async ({ page }) => {
    await mount(page, [f('a', { hideDelay: 0, showDelay: 0, offset: 24, arrow: true })]);
    await pauseClock(page);
    await anchor(page, 'a').hover();
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => shown(page, 'a')).toBe(true);
    const [a, s] = [edges(await bounds(anchor(page, 'a'))), edges(await bounds(surface(page, 'a')))];
    const deep = 24 + (await resolveToken(page, T('arrow-height')));
    expect(a.top - s.bottom).toBeCloseTo(deep, 0);
    // Up through the whole gap, slowly, resting in it: it stays, at a hide delay of 0.
    for (let y = a.top - 2; y > s.bottom; y -= 6) {
      await page.mouse.move(a.centerX, y);
      await page.clock.runFor(200);
      expect(await isOpen(page, 'a'), `y ${y}`).toBe(true);
    }
    await page.mouse.move(s.centerX, s.centerY, { steps: 3 });
    await page.clock.runFor(500);
    expect(await isOpen(page, 'a')).toBe(true);
    // Back into the gap, beside the arrow, near the container's edge: still hover. Past the container's side: not.
    await page.mouse.move(s.left + 2, (s.bottom + a.top) / 2, { steps: 3 });
    await page.clock.runFor(500);
    expect(await isOpen(page, 'a')).toBe(true);
    await page.mouse.move(s.left - 6, (s.bottom + a.top) / 2);
    expect(await isOpen(page, 'a')).toBe(false);
  });
});

test.describe('drawing', () => {
  test('TIP-10: plain — its text role and color on its container color, corners, elevation, padding, minimum height and maximum width, wrapping; the title ignored', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 400 });
    await mount(page, [f('p', { open: true, title: 'Ignored' }), f('w', { open: false, text: 'Move the selected files to the trash. They are deleted after 30 days.' })]);
    const s = container(page, 'p');
    await expect.poll(() => shown(page, 'p')).toBe(true);
    expect(await css(s, 'background-color')).toBe(await resolveColor(page, T('plain-container-color')));
    expect(await css(s.locator('.text'), 'color')).toBe(await resolveColor(page, T('plain-supporting-text-color')));
    expect(await css(s.locator('.text'), 'font-size')).toBe(`${await resolveToken(page, T('plain-supporting-text-typescale-font-size'))}px`);
    expect(Number.parseFloat(await css(s, 'border-top-left-radius'))).toBe(await resolveToken(page, T('plain-container-shape')));
    expect(await css(s, 'box-shadow')).toBe(await resolveShadow(page, T('plain-container-elevation')));
    expect(Number.parseFloat(await css(s, 'padding-left'))).toBe(await resolveToken(page, T('plain-container-padding-inline')));
    expect(Number.parseFloat(await css(s, 'padding-top'))).toBe(await resolveToken(page, T('plain-container-padding-block')));
    expect((await bounds(s)).height).toBeGreaterThanOrEqual(await resolveToken(page, T('plain-container-min-height')) - 0.5);
    await expect(s.locator('.title')).toHaveCount(0);
    // The placed box is the container's box, and paints nothing itself.
    await rested(page, 'p');
    expect(await bounds(surface(page, 'p'))).toEqual(await bounds(s));
    expect(await css(surface(page, 'p'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    await set(page, 'w', { open: true });
    await expect.poll(() => shown(page, 'w')).toBe(true);
    const wide = await bounds(container(page, 'w'));
    expect(wide.width).toBeCloseTo(await resolveToken(page, T('plain-container-max-width')), 0);
    expect(wide.height).toBeGreaterThan(await resolveToken(page, T('plain-container-min-height')) * 1.5);
  });

  test('TIP-11: rich — the title in its role and color above the text, a gap apart, on its container; untitled, the text alone', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 400 });
    await mount(page, [f('r', { variant: 'rich', title: 'Storage', text: 'Trash still counts toward storage.', open: true }, 'info')]);
    const s = container(page, 'r');
    await expect.poll(() => shown(page, 'r')).toBe(true);
    expect(await css(s, 'background-color')).toBe(await resolveColor(page, T('rich-container-color')));
    expect(await css(s, 'box-shadow')).toBe(await resolveShadow(page, T('rich-container-elevation')));
    expect(Number.parseFloat(await css(s, 'border-top-left-radius'))).toBe(await resolveToken(page, T('rich-container-shape')));
    expect(Number.parseFloat(await css(s, 'padding-left'))).toBe(await resolveToken(page, T('rich-container-padding-inline')));
    expect(Number.parseFloat(await css(s, 'padding-top'))).toBe(await resolveToken(page, T('rich-container-padding-block')));
    const [title, text] = [s.locator('.title'), s.locator('.text')];
    expect(await css(title, 'color')).toBe(await resolveColor(page, T('rich-title-color')));
    expect(await css(title, 'font-size')).toBe(`${await resolveToken(page, T('rich-title-typescale-font-size'))}px`);
    expect(await css(text, 'color')).toBe(await resolveColor(page, T('rich-supporting-text-color')));
    expect((await bounds(text)).y - ((await bounds(title)).y + (await bounds(title)).height)).toBeCloseTo(await resolveToken(page, T('rich-container-gap')), 0);
    await set(page, 'r', { headline: '' });
    await expect(s.locator('.title')).toHaveCount(0);
    await set(page, 'r', { text: 'A longer explanation that runs well past the widest a rich tooltip may be, so that it wraps.' });
    await expect.poll(async () => (await bounds(s)).width).toBeCloseTo(await resolveToken(page, T('rich-container-max-width')), 0);
  });

  test('TIP-12: corners eased by the smoothing (cupertino), growing with enlarged text without clipping, text start-aligned', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'cupertino', fixtures: [f('p', { open: true })] });
    const s = container(page, 'p');
    await expect.poll(() => shown(page, 'p')).toBe(true);
    const radius = await resolveToken(page, T('plain-container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(s, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(s, 'border-top-left-radius'))).toBeCloseTo(radius * 1.24, 2);
    } else expect(Number.parseFloat(await css(s, 'border-top-left-radius'))).toBe(radius);
    expect(await css(s, 'text-align')).toBe('start');
    const before = (await bounds(s)).height;
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await bounds(s)).height).toBeGreaterThan(before * 1.4);
    expect(await s.evaluate((el) => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('TIP-13: it takes no focus and holds nothing focusable, makes nothing inert, is drawn above an open dialog, and a press on it closes it and reaches nothing under it', async ({ page }) => {
    await mount(page, [f('a', {})]);
    await tabTo(page, button(page, 'a'));
    await expect.poll(() => shown(page, 'a')).toBe(true);
    expect(await surface(page, 'a').evaluate((el) => el.querySelectorAll('[tabindex], button, a, input').length)).toBe(0);
    await expect(button(page, 'a')).toBeFocused();
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0);
    // A press on it closes it; the page under it and its ancestors hear nothing.
    await page.evaluate(() => {
      for (const type of ['pointerdown', 'mousedown', 'click']) {
        document.body.addEventListener(type, () => (window as any).log.push(`page:${type}`));
      }
    });
    const s = await bounds(surface(page, 'a'));
    await page.mouse.click(s.x + 4, s.y + 4);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false']);
    // Above an open modal dialog and its scrim.
    await page.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.innerHTML = '<tanrei-tooltip text="Above the dialog" open><button id="inner">Inner</button></tanrei-tooltip>';
      document.body.append(dialog);
      dialog.showModal();
    });
    const inDialog = page.locator('dialog tanrei-tooltip .surface');
    await expect.poll(() => inDialog.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    const b = await bounds(inDialog);
    expect(await page.evaluate(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return top?.localName;
    }, [b.x + b.width / 2, b.y + b.height / 2])).toBe('tanrei-tooltip');
  });

  test('TIP-14: while describes is true the text (after a rich title) is the anchor’s description, open or not, and the drawn tooltip is hidden; describes false adds nothing; the name and role stay the anchor’s', async ({ page }) => {
    await mount(page, [f('a', {}), f('r', { variant: 'rich', title: 'Storage', text: 'Trash still counts toward storage.' }, 'info'), f('n', { describes: false, text: 'delete' })]);
    await expect(button(page, 'a')).toHaveAttribute('aria-description', 'Move to trash');
    await expect(button(page, 'r')).toHaveAttribute('aria-description', 'Storage, Trash still counts toward storage.');
    await expect(surface(page, 'a')).toHaveAttribute('aria-hidden', 'true');
    await expect(surface(page, 'a')).toHaveAttribute('role', 'tooltip');
    await expect(button(page, 'n')).not.toHaveAttribute('aria-description');
    await expect(anchor(page, 'n')).not.toHaveAttribute('aria-description');
    await expect(surface(page, 'n')).not.toHaveAttribute('aria-hidden');
    await expect(page.getByRole('button', { name: 'delete' })).toHaveCount(2);
    // Open or not, the same; and it follows the text.
    await tabTo(page, button(page, 'a'));
    await expect(button(page, 'a')).toHaveAttribute('aria-description', 'Move to trash');
    await tip(page, 'a').evaluate((el: any) => (el.text = 'Delete for good'));
    await expect(button(page, 'a')).toHaveAttribute('aria-description', 'Delete for good');
    await tip(page, 'a').evaluate((el: any) => (el.describes = false));
    await expect(button(page, 'a')).not.toHaveAttribute('aria-description');
    await expect(tip(page, 'a')).toHaveAttribute('no-describe', '');
    // A plain button anchor carries it itself.
    await mountFixtures(page, spec, { fixtures: [{ id: 'plain-button', props: { text: 'Saves a copy' }, content: '<button>Save</button>' }] });
    await expect(page.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-description', 'Saves a copy');
  });

  test('TIP-16: without text it never opens and adds nothing, and is reported; a plain tooltip reports an ignored title', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [f('empty', { text: '' }), f('titled', { title: 'Heading' })]);
    await tabTo(page, button(page, 'empty'));
    await page.waitForTimeout(100);
    expect(await isOpen(page, 'empty')).toBe(false);
    await tip(page, 'empty').evaluate((el: any) => (el.open = true));
    await page.waitForTimeout(100);
    expect(await shown(page, 'empty')).toBe(false);
    await expect(button(page, 'empty')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('TIP-16')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/text is empty, so the tooltip never opens/);
    expect(seen.join('\n')).toMatch(/a plain tooltip ignores its headline "Heading"/);
  });

  test('TIP-25: an arrow is drawn while arrow is true, or null with the system’s choice on, and not otherwise; it is the arrow’s width at its base and its height tall on the edge that faces the anchor, in the container’s color, and the container stands its height farther away', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('on', { arrow: true }), f('off', { arrow: false }), f('unset', {})]);
    for (const id of ['on', 'off', 'unset']) await anchorAt(page, id, 380, 280);
    const [width, height, offset] = [await resolveToken(page, T('arrow-width')), await resolveToken(page, T('arrow-height')), await resolveToken(page, T('offset'))];
    expect(await token(page, T('arrow-visible'))).toBe('off');
    let [a, s] = await openedEdges(page, 'on');
    await expect(arrow(page, 'on')).toBeVisible();
    await expect(arrow(page, 'on')).toHaveAttribute('aria-hidden', 'true');
    // The triangle: its base on the container's bottom edge, its tip the arrow's height below it and the offset above the anchor.
    const tipOf = async (id: string) => {
      const box = edges(await bounds(arrow(page, id)));
      const facing = await side(page, id);
      return { box, facing, clip: await css(arrow(page, id), 'clip-path') };
    };
    const drawn = await tipOf('on');
    expect(drawn.box.right - drawn.box.left).toBeCloseTo(width, 1);
    expect(drawn.box.bottom - s.bottom).toBeCloseTo(height, 1);
    expect(a.top - drawn.box.bottom).toBeCloseTo(offset, 1);
    expect(a.top - s.bottom).toBeCloseTo(offset + height, 1);
    expect(drawn.box.top).toBeLessThan(s.bottom); // it reaches under the container: no line between the two
    expect(drawn.clip).toMatch(/^polygon\(/);
    expect(await css(arrow(page, 'on'), 'background-color')).toBe(await css(container(page, 'on'), 'background-color'));
    // False: none, and the container at the offset. Unset: the system's choice — off, then on.
    [a, s] = await openedEdges(page, 'off');
    await expect(arrow(page, 'off')).toBeHidden();
    expect(a.top - s.bottom).toBeCloseTo(offset, 1);
    [a, s] = await openedEdges(page, 'unset');
    await expect(arrow(page, 'unset')).toBeHidden();
    await override(page, { [T('arrow-visible')]: 'on' });
    await expect(arrow(page, 'unset')).toBeVisible();
    await settle(page);
    expect(a.top - edges(await bounds(surface(page, 'unset'))).bottom).toBeCloseTo(offset + height, 1);
    // A system whose choice is on is refused by arrow="false", and the attribute says which of the three it is.
    await openIt(page, 'off');
    await expect(arrow(page, 'off')).toBeHidden();
    await expect(tip(page, 'off')).toHaveAttribute('arrow', 'false');
    await expect(tip(page, 'on')).toHaveAttribute('arrow', '');
    await expect(tip(page, 'unset')).not.toHaveAttribute('arrow');
    expect(await tip(page, 'off').evaluate((el: any) => el.arrow)).toBe(false);
    await set(page, 'off', { arrow: null });
    await expect(tip(page, 'off')).not.toHaveAttribute('arrow');
    await expect(arrow(page, 'off')).toBeVisible(); // unset now: the system's choice, which is on
    // An unknown name of the choice is its first value: off.
    await override(page, { [T('arrow-visible')]: 'sometimes' });
    await openIt(page, 'unset');
    await expect(arrow(page, 'unset')).toBeHidden();
  });

  test('TIP-25: the tip points at the anchor’s centre for a centred, a start-aligned and an end-aligned placement on each side, in both layout directions, after a flip and after a shift at the window’s edge, and its base stays off the corners', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const text = 'Move the selected files to the trash';
    await mount(page, [f('a', { arrow: true, text }), { ...f('rtl', { arrow: true, text }), direction: 'rtl' }]);
    const [width, height, inset] = [await resolveToken(page, T('arrow-width')), await resolveToken(page, T('arrow-height')), await resolveToken(page, T('arrow-inset'))];
    /** Where the tip is, and which way it points, from the arrow's box on the side it is on. */
    const tipAt = async (id: string) => {
      const box = edges(await bounds(arrow(page, id)));
      const facing = (await side(page, id))!;
      const s = edges(await bounds(surface(page, id)));
      const along = facing === 'top' || facing === 'bottom' ? box.centerX : box.centerY;
      const tipEdge = { top: box.bottom, bottom: box.top, left: box.right, right: box.left }[facing as 'top'];
      const base = { top: s.bottom, bottom: s.top, left: s.right, right: s.left }[facing as 'top'];
      return { facing, along, out: Math.abs(tipEdge - base), s };
    };
    for (const id of ['a', 'rtl']) {
      await anchorAt(page, id, 380, 280);
      await openIt(page, id);
      for (const placement of PLACEMENTS.filter((p) => p !== 'auto')) {
        await set(page, id, { placement });
        const a = edges(await bounds(anchor(page, id)));
        const got = await tipAt(id);
        const above = got.facing === 'top' || got.facing === 'bottom';
        // The container is wider than the anchor, so the part of the anchor's edge it stands beside is the whole edge.
        expect(got.along, `${id} ${placement}`).toBeCloseTo(above ? a.centerX : a.centerY, 0);
        expect(got.out, `${id} ${placement}`).toBeCloseTo(height, 1);
      }
      await set(page, id, { open: false });
    }
    // After a flip (no room above): on the top edge now, still at the anchor's centre.
    await anchorAt(page, 'a', 380, 2);
    await set(page, 'a', { placement: 'top-start' });
    await openIt(page, 'a');
    let got = await tipAt('a');
    expect(got.facing).toBe('bottom');
    expect(got.along).toBeCloseTo(edges(await bounds(anchor(page, 'a'))).centerX, 0);
    // After a shift at the window's edge: the container moved, the tip did not leave the anchor.
    await anchorAt(page, 'a', 12, 280);
    await set(page, 'a', { placement: 'top' });
    await settle(page);
    got = await tipAt('a');
    expect(got.s.left).toBeCloseTo(await resolveToken(page, T('window-margin')), 0);
    expect(got.along).toBeCloseTo(edges(await bounds(anchor(page, 'a'))).centerX, 0);
    // Off the corners: the anchor half out of the window, the tip is the inset and half the base from the container's end.
    await anchorAt(page, 'a', -30, 280);
    await settle(page);
    got = await tipAt('a');
    expect(got.along - got.s.left).toBeCloseTo(inset + width / 2, 0);
    // A full corner: the base keeps the corner's radius from each end — on a container one line tall, half its height.
    await override(page, { [T('plain-container-shape')]: '999px' });
    await anchorAt(page, 'a', 380, 280);
    await set(page, 'a', { placement: 'top-start', crossOffset: 14, text: 'Move to trash' });
    await settle(page);
    got = await tipAt('a');
    const tall = got.s.bottom - got.s.top;
    expect(tall / 2).toBeGreaterThan(inset);
    // The anchor's centre is nearer the container's start than the corner allows: the base stops at the corner's end.
    expect(edges(await bounds(anchor(page, 'a'))).centerX - got.s.left).toBeLessThan(tall / 2);
    expect(got.along - got.s.left).toBeCloseTo(tall / 2 + width / 2, 0);
  });

  test('TIP-25: the container and the arrow are one shape — the elevation’s ring runs round both, with no line and no shadow between the two', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 200 });
    await mountFixtures(page, spec, { icons: true, fixtures: [f('a', { arrow: true, inverse: false, open: true })] });
    // A ring nobody can miss: 2 px of red round the shape, and a green shape.
    await override(page, { [T('plain-surface-container-elevation')]: '0 0 0 2px rgb(255, 0, 0)', [T('plain-surface-container-color')]: 'rgb(0, 128, 0)' });
    await expect.poll(() => shown(page, 'a')).toBe(true);
    await settle(page);
    await rested(page, 'a');
    await expect.poll(() => surface(page, 'a').evaluate((el: HTMLElement) => el.dataset.arrow)).toBe('shaded');
    await expect.poll(() => surface(page, 'a').evaluate((el) => el.querySelector('feMorphology')?.getAttribute('radius'))).toBe('2');
    await settle(page);
    // The container gives up its own shadow for the one drawn round both.
    expect(await css(container(page, 'a'), 'box-shadow')).toBe('none');
    expect(await css(motion(page, 'a'), 'filter')).toMatch(/url\(.*#shade.*\)/);
    const [s, tipBox] = [edges(await bounds(surface(page, 'a'))), edges(await bounds(arrow(page, 'a')))];
    const pixels = decodePng(await page.screenshot({ scale: 'css' }));
    const rgb = (x: number, y: number) => {
      const i = (Math.round(y) * pixels.width + Math.round(x)) * 4;
      return [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
    };
    const red = (c: number[]) => c[0] > 180 && c[1] < 90 && c[2] < 90;
    const green = (c: number[]) => c[0] < 60 && c[1] > 90 && c[2] < 60;
    // Inside the arrow, and across its base into the container: the fill, with no ring where the two meet.
    for (const y of [s.bottom - 3, s.bottom - 1, s.bottom, s.bottom + 1, s.bottom + 2]) expect(green(rgb(tipBox.centerX, y)), `fill at ${y - s.bottom}`).toBe(true);
    // Round the arrow: the ring beside its slanted edges and under its tip…
    expect(red(rgb(tipBox.centerX, tipBox.bottom)), 'under the tip').toBe(true);
    expect(red(rgb(tipBox.left + 1, s.bottom + 2)), 'beside the left edge').toBe(true);
    expect(red(rgb(tipBox.right - 2, s.bottom + 2)), 'beside the right edge').toBe(true);
    // …and along the container's edge on either side of it, as round the rest of the container.
    expect(red(rgb(tipBox.left - 6, s.bottom + 1)), 'the edge before the arrow').toBe(true);
    expect(red(rgb(tipBox.right + 6, s.bottom + 1)), 'the edge after the arrow').toBe(true);
    expect(red(rgb(s.centerX, s.top - 1)), 'the far edge').toBe(true);
    // A flat container (the default plain one) has no elevation to draw: no filter at all.
    await set(page, 'a', { inverse: true });
    await settle(page);
    await expect.poll(() => surface(page, 'a').evaluate((el: HTMLElement) => el.dataset.arrow)).toBe('flat');
    expect(await css(motion(page, 'a'), 'filter')).toBe('none');
  });

  test('TIP-26: each form in both looks — inverse true, false, or null as its form’s choice says; a set inverse wins over the choice; colors and elevation only; a change while shown redraws at once and stays open', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const rich = { variant: 'rich', title: 'Storage', text: 'Trash still counts toward storage.' };
    await mount(page, [f('plain', {}), f('plain-on', { inverse: true }), f('plain-off', { inverse: false }), f('rich', rich, 'info'), f('rich-on', { ...rich, inverse: true }, 'info'), f('rich-off', { ...rich, inverse: false }, 'info')]);
    const look = async (id: string) => {
      const box = container(page, id);
      const title = box.locator('.title');
      return { fill: await css(box, 'background-color'), elevation: await css(box, 'box-shadow'), text: await css(box.locator('.text'), 'color'), title: (await title.count()) ? await css(title, 'color') : null };
    };
    const tokens = async (prefix: string, title: boolean) => ({
      fill: await resolveColor(page, T(`${prefix}-container-color`)),
      elevation: await resolveShadow(page, T(`${prefix}-container-elevation`)),
      text: await resolveColor(page, T(`${prefix}-supporting-text-color`)),
      title: title ? await resolveColor(page, T(`${prefix}-title-color`)) : null,
    });
    const [plainInverse, plainSurface, richSurface, richInverse] = [await tokens('plain', false), await tokens('plain-surface', false), await tokens('rich', true), await tokens('rich-inverse', true)];
    // The two looks of each form are different tokens, and different pictures.
    expect(plainInverse.fill).not.toBe(plainSurface.fill);
    expect(richInverse.fill).not.toBe(richSurface.fill);
    expect(plainSurface.elevation).not.toBe(plainInverse.elevation);
    // The default system chooses inverse for plain and a surface for rich.
    expect([await token(page, T('plain-container-inverse')), await token(page, T('rich-container-inverse'))]).toEqual(['on', 'off']);
    const all = async (expected: Record<string, unknown>) => {
      for (const [id, tokensOf] of Object.entries(expected)) expect(await look(id), id).toEqual(tokensOf);
    };
    const set3 = { 'plain-on': plainInverse, 'plain-off': plainSurface, 'rich-on': richInverse, 'rich-off': richSurface };
    await all({ plain: plainInverse, rich: richSurface, ...set3 });
    // A system that chooses the other way: null follows it, and a set inverse wins over either choice.
    await override(page, { [T('plain-container-inverse')]: 'off', [T('rich-container-inverse')]: 'on' });
    await set(page, 'plain', {}); // a browser without style queries reads the choice again when it draws
    await set(page, 'rich', {});
    await page.evaluate(() => document.querySelectorAll<any>('tanrei-tooltip').forEach((el) => el.requestUpdate()));
    await settle(page);
    await all({ plain: plainSurface, rich: richInverse, ...set3 });
    // An unknown name is the first value: off, a surface.
    await override(page, { [T('plain-container-inverse')]: 'maybe', [T('rich-container-inverse')]: 'maybe' });
    await page.evaluate(() => document.querySelectorAll<any>('tanrei-tooltip').forEach((el) => el.requestUpdate()));
    await settle(page);
    await all({ plain: plainSurface, rich: richSurface, ...set3 });
    await override(page, { [T('plain-container-inverse')]: 'on', [T('rich-container-inverse')]: 'off' });
    await page.evaluate(() => document.querySelectorAll<any>('tanrei-tooltip').forEach((el) => el.requestUpdate()));
    // Colors and elevation only: the box, its corners, its padding and its text style are the same in both looks.
    const shape = async (id: string) => {
      await anchorAt(page, id, 380, 280);
      await openIt(page, id);
      const box = container(page, id);
      const size = await bounds(box);
      return { width: size.width, height: size.height, radius: await css(box, 'border-top-left-radius'), padding: await css(box, 'padding'), font: await css(box.locator('.text'), 'font-size'), y: size.y };
    };
    expect(await shape('plain-on')).toEqual(await shape('plain-off'));
    expect(await shape('rich-on')).toEqual(await shape('rich-off'));
    // A change while it is shown: the other look at once, still open, without a motion; and the attribute says which.
    await openIt(page, 'plain');
    await rested(page, 'plain');
    await set(page, 'plain', { inverse: false });
    expect(await look('plain')).toEqual(plainSurface);
    expect(await shown(page, 'plain')).toBe(true);
    expect(await running(page, 'plain')).toBe(0);
    await expect(tip(page, 'plain')).toHaveAttribute('inverse', 'false');
    await set(page, 'plain', { inverse: true });
    expect(await look('plain')).toEqual(plainInverse);
    await expect(tip(page, 'plain')).toHaveAttribute('inverse', '');
    await set(page, 'plain', { inverse: null });
    await expect(tip(page, 'plain')).not.toHaveAttribute('inverse');
    expect(await look('plain')).toEqual(plainInverse);
    expect((await log(page)).filter((entry) => entry.startsWith('plain:'))).toEqual([]);
  });

  test('TIP-27: a plain tooltip draws its shortcut after the text, a gap away on the text’s first line, with the keyboard shortcut in its plain form at size small in the text’s style and the shortcut color; whole on one line while the text wraps, within the maximum width', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mount(page, [f('a', { text: 'Bold', shortcut: ['mod+b'] }), f('long', { text: 'Move the selected files to the trash', shortcut: ['mod+backspace'] }), f('surface', { text: 'Bold', shortcut: ['mod+b'], inverse: false }), f('none', { text: 'Bold' })]);
    for (const id of ['a', 'long', 'surface', 'none']) await anchorAt(page, id, 380, 280);
    await openIt(page, 'a');
    const keys = container(page, 'a').locator('tanrei-keyboard-shortcut');
    await expect(keys).toHaveAttribute('variant', 'plain');
    await expect(keys).toHaveAttribute('size', 'small');
    await expect(keys).toHaveAttribute('aria-hidden', 'true');
    expect(await keys.evaluate((el: any) => [el.hosted, el.convention, el.keys])).toEqual([true, 'auto', ['mod+b']]);
    // The stage sets the standard convention: Ctrl+B, whatever machine this is.
    expect((await keys.evaluate((el) => el.shadowRoot!.querySelector('.sequence')!.textContent))!.replace(/\s+/g, '')).toBe('Ctrl+B');
    // After the text, the gap away, on its line.
    const [words, drawn] = [edges(await bounds(container(page, 'a').locator('.text'))), edges(await bounds(keys))];
    expect(drawn.left - words.right).toBeCloseTo(await resolveToken(page, T('plain-container-gap')), 0);
    const legend = keys.locator('.label').first();
    const baseline = (locator: Locator) =>
      locator.evaluate((el) => {
        const mark = document.createElement('span');
        mark.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0';
        el.append(mark);
        const y = mark.getBoundingClientRect().bottom;
        mark.remove();
        return y;
      });
    expect(await baseline(legend)).toBeCloseTo(await baseline(container(page, 'a').locator('.text')), 0);
    // Its legends and separators in the text's style and the shortcut color (KBS-13).
    for (const part of ['.label', '.separator']) {
      expect(await css(keys.locator(part).first(), 'font-size'), part).toBe(`${await resolveToken(page, T('plain-supporting-text-typescale-font-size'))}px`);
      expect(await css(keys.locator(part).first(), 'color'), part).toBe(await resolveColor(page, T('plain-shortcut-color')));
    }
    // One line of text and keys: no taller than a tooltip without keys.
    await set(page, 'a', { open: false });
    await openIt(page, 'none');
    const plainHeight = (await bounds(container(page, 'none'))).height;
    await openIt(page, 'a');
    expect((await bounds(container(page, 'a'))).height).toBe(plainHeight);
    // On a surface the shortcut takes the surface look's color.
    await openIt(page, 'surface');
    expect(await css(container(page, 'surface').locator('tanrei-keyboard-shortcut .label').first(), 'color')).toBe(await resolveColor(page, T('plain-surface-shortcut-color')));
    expect(await resolveColor(page, T('plain-surface-shortcut-color'))).not.toBe(await resolveColor(page, T('plain-surface-supporting-text-color')));
    // A text too long for one line wraps beside the shortcut, which stays whole on the first line, inside the maximum width.
    await openIt(page, 'long');
    const box = container(page, 'long');
    const [longWords, longKeys, whole] = [await bounds(box.locator('.text')), await bounds(box.locator('tanrei-keyboard-shortcut')), await bounds(box)];
    expect(whole.width).toBeLessThanOrEqual((await resolveToken(page, T('plain-container-max-width'))) + 0.5);
    const line = Number.parseFloat(await css(box.locator('.text'), 'line-height'));
    expect(longWords.height).toBeGreaterThan(line * 1.5);
    expect(longKeys.height).toBeLessThan(line * 1.5);
    expect(longKeys.y).toBeLessThan(longWords.y + line);
    expect(longKeys.x).toBeGreaterThanOrEqual(longWords.x + longWords.width);
    expect(longKeys.x + longKeys.width).toBeLessThanOrEqual(whole.x + whole.width);
  });

  test('TIP-27: the shortcut is the anchor’s keyboard shortcut (aria-keyshortcuts on its focusable element) unless the anchor states one, when the text KBS-10 gives — the notation, for a hosted shortcut has no label — ends the description, with no name of a key; a rich tooltip ignores it and reports it; nothing makes the keys work', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [f('a', { shortcut: ['mod+backspace'] }), f('two', { text: 'Comment', shortcut: ['mod+k', 'mod+c'] }), f('rich', { variant: 'rich', title: 'Storage', shortcut: ['mod+s'] }, 'info'), f('quiet', { describes: false, shortcut: ['mod+b'] })]);
    // KBS-12's form, on the native button the Tanrei button draws; the host is not a control and carries nothing.
    await expect(button(page, 'a')).toHaveAttribute('aria-keyshortcuts', 'Control+Backspace');
    await expect(button(page, 'two')).toHaveAttribute('aria-keyshortcuts', 'Control+K Control+C');
    await expect(button(page, 'a')).toHaveAttribute('aria-description', 'Move to trash');
    // Whether or not the tooltip describes the anchor: the shortcut is the command's, not the tooltip's words.
    await expect(button(page, 'quiet')).toHaveAttribute('aria-keyshortcuts', 'Control+B');
    await expect(button(page, 'quiet')).not.toHaveAttribute('aria-description');
    // It follows the keys and the keyboard: the Apple convention on an ancestor, then no keys at all.
    await tip(page, 'a').evaluate((el) => el.setAttribute('data-tanrei-keyboard-convention', 'apple'));
    await expect(button(page, 'a')).toHaveAttribute('aria-keyshortcuts', 'Meta+Backspace');
    await set(page, 'a', { shortcut: ['mod+shift+d'] });
    await expect(button(page, 'a')).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+D');
    await set(page, 'a', { shortcut: [] });
    await expect(button(page, 'a')).not.toHaveAttribute('aria-keyshortcuts');
    await expect(container(page, 'a').locator('tanrei-keyboard-shortcut')).toHaveCount(0);
    // The attribute holds the chords separated by spaces.
    await tip(page, 'a').evaluate((el) => el.setAttribute('shortcut', 'mod+k mod+c'));
    expect(await tip(page, 'a').evaluate((el: any) => el.shortcut)).toEqual(['mod+k', 'mod+c']);
    await expect(button(page, 'a')).toHaveAttribute('aria-keyshortcuts', 'Meta+K Meta+C');
    // A rich tooltip ignores it: nothing drawn, nothing on the anchor, and a report.
    await expect(container(page, 'rich').locator('tanrei-keyboard-shortcut')).toHaveCount(0);
    await expect(button(page, 'rich')).not.toHaveAttribute('aria-keyshortcuts');
    await expect.poll(() => seen.filter((w) => w.includes('TIP-27')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/a rich tooltip ignores its shortcut "mod\+s"; a plain tooltip draws it \(TIP-27\)/);
    // An anchor that states its shortcut itself keeps it; the tooltip's keys are then the end of its description, in words.
    await mountFixtures(page, spec, {
      fixtures: [
        { id: 'own', props: { text: 'Saves a copy', shortcut: 'mod+shift+s' }, content: '<button aria-keyshortcuts="Alt+S">Save</button>' },
        { id: 'own-quiet', props: { text: 'Save', shortcut: 'mod+s', describes: false }, content: '<button aria-keyshortcuts="Alt+S">Save</button>' },
        { id: 'native', props: { text: 'Saves a copy', shortcut: 'mod+s' }, content: '<button>Save</button>' },
      ],
    });
    const own = page.locator('[data-fixture="own"] button');
    await expect(own).toHaveAttribute('aria-keyshortcuts', 'Alt+S');
    // The text KBS-10 gives: the tooltip's shortcut has no label, so it is the notation of aria-keyshortcuts (KBS-11) —
    // the same in every language, and never the keys spelled out in one.
    await expect(own).toHaveAttribute('aria-description', 'Saves a copy, Control+Shift+S');
    await expect(page.locator('[data-fixture="own-quiet"] button')).toHaveAttribute('aria-keyshortcuts', 'Alt+S');
    await expect(page.locator('[data-fixture="own-quiet"] button')).not.toHaveAttribute('aria-description');
    await expect(page.locator('[data-fixture="native"] button')).toHaveAttribute('aria-keyshortcuts', 'Control+S');
    await expect(page.locator('[data-fixture="native"] button')).toHaveAttribute('aria-description', 'Saves a copy');
    // The anchor stops stating one: the tooltip's takes its place the next time it draws. Removed, it takes back what it wrote.
    await own.evaluate((el) => el.removeAttribute('aria-keyshortcuts'));
    await page.locator('[data-fixture="own"] tanrei-tooltip').evaluate(async (el: any) => {
      el.requestUpdate();
      await el.updateComplete;
    });
    await expect(own).toHaveAttribute('aria-keyshortcuts', 'Control+Shift+S');
    await expect(own).toHaveAttribute('aria-description', 'Saves a copy');
    await page.locator('[data-fixture="native"] tanrei-tooltip').evaluate((el) => {
      const kept = el.querySelector('button')!;
      el.replaceWith(kept);
    });
    await expect(page.locator('[data-fixture="native"] button')).not.toHaveAttribute('aria-keyshortcuts');
    await expect(page.locator('[data-fixture="native"] button')).not.toHaveAttribute('aria-description');
    // It does not make the keys work: pressing them does nothing to the anchor or the tooltip.
    await page.evaluate(() => {
      (window as any).pressed = 0;
      document.querySelector('[data-fixture="own"] button')!.addEventListener('click', () => (window as any).pressed++);
    });
    await page.keyboard.press('Control+Shift+S');
    expect(await page.evaluate(() => (window as any).pressed)).toBe(0);
  });

  test('web: the rich title is the headline attribute and property; a title attribute is the browser’s own — it stays on the element and draws nothing', async ({ page }) => {
    await mount(page, [f('r', { variant: 'rich', title: 'Storage', text: 'Trash still counts toward storage.', open: true }, 'info')]);
    // The spec's title is the attribute headline.
    await expect(tip(page, 'r')).toHaveAttribute('headline', 'Storage');
    await expect(tip(page, 'r')).not.toHaveAttribute('title');
    await expect(tip(page, 'r').locator('.title')).toHaveText('Storage');
    // A title attribute is not read: it is the platform's, kept as written, and the rich title stays the headline.
    await tip(page, 'r').evaluate(async (el: any) => {
      el.setAttribute('title', 'Quota');
      await el.updateComplete;
    });
    await expect(tip(page, 'r')).toHaveAttribute('title', 'Quota');
    expect(await tip(page, 'r').evaluate((el: any) => el.headline)).toBe('Storage');
    await expect(tip(page, 'r').locator('.title')).toHaveText('Storage');
  });
});

test.describe('motion', () => {
  /** The wrapper as it is drawn at this moment: its opacity and the box its transform makes of it. */
  const drawnNow = (page: P, id: string) =>
    motion(page, id).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return { opacity: Number(style.opacity), box: { x: r.x, y: r.y, width: r.width, height: r.height }, duration: style.transitionDuration, easing: style.transitionTimingFunction, origin: style.transformOrigin };
    });
  const easingOf = (page: P, name: string) =>
    page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, name);
  const near = (actual: { x: number; y: number; width: number; height: number }, expected: { x: number; y: number; width: number; height: number }, label: string) => {
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(actual[key], `${label} ${key}`).toBeCloseTo(expected[key], 0);
  };
  /**
   * Sets props and, in the task of the update that draws them, holds the motion that update starts at its first frame (0)
   * or its last (1), as `holdMotion` does; returns how many motions it held. A motion of the token's 150 or 200 ms that
   * is asked for a round trip later may be over where a frame takes longer than that.
   */
  const setAndHold = (page: P, id: string, props: Record<string, unknown>, progress: 0 | 1) =>
    tip(page, id).evaluate(
      async (el: any, [p, at]) => {
        Object.assign(el, p);
        await el.updateComplete;
        const moving = el.shadowRoot.querySelector('.motion');
        const held: Animation[] = (moving.held = moving.getAnimations());
        for (const animation of held) {
          animation.pause();
          animation.currentTime = at ? Number(animation.effect!.getComputedTiming().endTime) : 0;
        }
        return held.length;
      },
      [props, progress] as const,
    );

  test('TIP-15: it fades in while it grows from the enter scale and travels the enter offset out of the anchor’s side, fixed at the point of its edge that faces the anchor — above, below, at the start, at the end and after a flip — and goes back the same way; the placed box does not move', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const fixtures = [f('top', { placement: 'top' }), f('bottom', { placement: 'bottom' }), f('start', { placement: 'start' }), f('end', { placement: 'end' }), f('flip', { placement: 'top-start' })];
    await mount(page, fixtures);
    // The tokens' own times and curves, and a scale and a travel large enough to see which way it goes.
    const [enter, exit] = [await resolveToken(page, T('motion-enter-duration'), 'duration'), await resolveToken(page, T('motion-exit-duration'), 'duration')];
    expect(Number(await token(page, T('motion-enter-scale')))).toBeGreaterThan(0.5);
    await override(page, { [T('motion-enter-scale')]: '0.5', [T('motion-enter-offset')]: '16px' });
    const seconds = (value: string) => value.split(',').map((each) => Number.parseFloat(each) * 1000);
    for (const fixture of fixtures) {
      const id = fixture.id;
      await anchorAt(page, id, 380, id === 'flip' ? 2 : 280);
      // The first frame, held in the task that opens it: clear, half its size, 16 nearer the anchor, and fixed where its
      // edge faces the anchor's centre.
      expect(await setAndHold(page, id, { open: true }, 0), id).toBeGreaterThan(0);
      const [a, s] = [edges(await bounds(anchor(page, id))), edges(await bounds(surface(page, id)))];
      const first = await drawnNow(page, id);
      const facing = (await side(page, id))!;
      expect(facing, id).toBe({ top: 'top', bottom: 'bottom', start: 'left', end: 'right', flip: 'bottom' }[id]);
      expect(first.opacity, id).toBe(0);
      expect(first.box.width, id).toBeCloseTo((s.right - s.left) / 2, 0);
      expect(first.box.height, id).toBeCloseTo((s.bottom - s.top) / 2, 0);
      const box = edges(first.box);
      // Halved about a fixed point, every edge is half as far from that point as it is at rest: the point is on the edge
      // that faces the anchor, at the anchor's centre (where an arrow would point), and that edge is 16 nearer the anchor.
      const halved = (from: number, fixed: number) => fixed + (from - fixed) / 2;
      if (facing === 'top') expect([box.bottom, box.left, box.right].map(Math.round), id).toEqual([s.bottom + 16, halved(s.left, a.centerX), halved(s.right, a.centerX)].map(Math.round));
      if (facing === 'bottom') expect([box.top, box.left, box.right].map(Math.round), id).toEqual([s.top - 16, halved(s.left, a.centerX), halved(s.right, a.centerX)].map(Math.round));
      if (facing === 'left') expect([box.right, box.top, box.bottom].map(Math.round), id).toEqual([s.right + 16, halved(s.top, a.centerY), halved(s.bottom, a.centerY)].map(Math.round));
      if (facing === 'right') expect([box.left, box.top, box.bottom].map(Math.round), id).toEqual([s.left - 16, halved(s.top, a.centerY), halved(s.bottom, a.centerY)].map(Math.round));
      // Over the entering motion's time and curve.
      expect(seconds(first.duration), id).toEqual([enter, enter]);
      expect(first.easing.split(/,(?![^(]*\))/)[0].trim(), id).toBe(await easingOf(page, T('motion-enter-easing')));
      // The last frame: whole, in its place — the placed box, which the motion never moved.
      await holdMotion(page, id, 1);
      const last = await drawnNow(page, id);
      expect(last.opacity, id).toBe(1);
      near(last.box, await bounds(surface(page, id)), `${id} last`);
      expect(edges(await bounds(surface(page, id))), id).toEqual(s);
      await endMotion(page, id);
      // Closing: back the same way, over the leaving motion's time and curve, and then out of the top layer.
      expect(await setAndHold(page, id, { open: false }, 1), id).toBeGreaterThan(0);
      const gone = await drawnNow(page, id);
      expect(gone.opacity, id).toBe(0);
      near(gone.box, first.box, `${id} gone`);
      expect(seconds(gone.duration), id).toEqual([exit, exit]);
      expect(gone.easing.split(/,(?![^(]*\))/)[0].trim(), id).toBe(await easingOf(page, T('motion-exit-easing')));
      expect(await shown(page, id), id).toBe(true); // still leaving
      await endMotion(page, id);
      await expect.poll(() => shown(page, id), id).toBe(false);
    }
    expect(enter).not.toBe(exit);
  });

  test('TIP-15: a scale of 1 and an offset of 0 is a fade alone, and where motion is reduced it fades without growing or travelling, over the same times', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    for (const reduced of [false, true]) {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await mount(page, [f('a', {})]);
      await anchorAt(page, 'a', 380, 280);
      const enter = await resolveToken(page, T('motion-enter-duration'), 'duration');
      // Reduced motion ignores a scale and a travel however large; otherwise a system sets them to nothing.
      await override(page, reduced ? { [T('motion-enter-scale')]: '0.5', [T('motion-enter-offset')]: '16px' } : { [T('motion-enter-scale')]: '1', [T('motion-enter-offset')]: '0px' });
      expect(await setAndHold(page, 'a', { open: true }, 0)).toBeGreaterThan(0);
      const first = await drawnNow(page, 'a');
      expect(first.opacity).toBe(0);
      near(first.box, await bounds(surface(page, 'a')), reduced ? 'reduced' : 'fade');
      expect(Number.parseFloat(first.duration) * 1000).toBe(enter);
      await endMotion(page, 'a');
      expect((await drawnNow(page, 'a')).opacity).toBe(1);
      expect(await setAndHold(page, 'a', { open: false }, 1)).toBeGreaterThan(0);
      near((await drawnNow(page, 'a')).box, first.box, 'leaving');
      await endMotion(page, 'a');
      await expect.poll(() => shown(page, 'a')).toBe(false);
    }
  });

  test('TIP-28: a tooltip that takes over from one that is open, or still fading out, or that closed within the warm time because the pointer left its anchor, appears whole at once without its show delay, and the other disappears at once; after the warm time the next one waits and moves again', async ({ page }) => {
    await mount(page, [f('a', {}), f('b', {}), f('c', {})]);
    // (40 s: a tooltip is asked whether it moves, and read 'not yet whole' or 'still fading out', one to three answers
    // after it opens or closes; nothing here waits for a motion's end — `endMotion` ends the one that must be over.)
    await override(page, { [T('motion-warm-duration')]: '300ms', [T('motion-enter-duration')]: '40s', [T('motion-exit-duration')]: '40s' });
    expect(await tip(page, 'a').evaluate((el: any) => el.tokenTiming().warm)).toBe(300);
    const drawn = async (id: string) => ({ ...(await drawnNow(page, id)), running: await running(page, id) });
    const whole = async (id: string) => {
      const now = await drawn(id);
      expect(now.running, `${id} moves`).toBe(0);
      expect(now.opacity, `${id} opacity`).toBe(1);
      near(now.box, await bounds(surface(page, id)), id);
    };
    // The delays and the warm time run on the page's clock, held still; the motions run on the document's own.
    await pauseClock(page);
    // The first tooltip waits for its show delay, and moves.
    await anchor(page, 'a').hover();
    await page.clock.runFor(399);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => running(page, 'a')).toBeGreaterThan(0);
    expect((await drawnNow(page, 'a')).opacity).toBeLessThan(1);
    // To the next anchor inside the hide delay: there at once, whole, and the first is gone at once (TIP-8).
    await anchor(page, 'b').hover();
    expect(await isOpen(page, 'b')).toBe(true);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await shown(page, 'a')).toBe(false);
    await whole('b');
    // The pointer leaves everything: b closes after its hide delay and is still fading out.
    await page.mouse.move(2, 190);
    await page.clock.runFor(300);
    expect(await isOpen(page, 'b')).toBe(false);
    expect(await shown(page, 'b')).toBe(true);
    // Inside the warm time, onto another anchor: no show delay, no motion, and the fading one disappears.
    await page.clock.runFor(299);
    await anchor(page, 'c').hover();
    expect(await isOpen(page, 'c')).toBe(true);
    expect(await shown(page, 'b')).toBe(false);
    await whole('c');
    // After the warm time (and the fade): the next one waits for its show delay and moves, as a first one does.
    await page.mouse.move(2, 190);
    await page.clock.runFor(300);
    expect(await isOpen(page, 'c')).toBe(false);
    await endMotion(page, 'c');
    await expect.poll(() => shown(page, 'c')).toBe(false);
    await page.clock.runFor(300);
    await anchor(page, 'a').hover();
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(399);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(1);
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => running(page, 'a')).toBeGreaterThan(0);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'b:true', 'b:false', 'c:true', 'c:false', 'a:true']);
  });

  test('TIP-28: by the keyboard too — Tab from one anchor to the next shows the second whole at once; a tooltip closed by Escape, an activation or a press on it starts no warm time, so the next one waits and moves; the warm time is kept where motion is reduced', async ({ page }) => {
    await mount(page, [f('a', {}), f('b', {}), f('c', {})]);
    // (40 s: a tooltip is asked whether it moves, and read 'not yet whole' or 'still fading out', one to three answers
    // after it opens or closes; nothing here waits for a motion's end — `endMotion` ends the one that must be over.)
    await override(page, { [T('motion-warm-duration')]: '300ms', [T('motion-enter-duration')]: '40s', [T('motion-exit-duration')]: '40s' });
    // Keyboard focus: the first one moves, the next one — the focus left the first — does not.
    await tabTo(page, button(page, 'a'));
    expect(await isOpen(page, 'a')).toBe(true);
    await expect.poll(() => running(page, 'a')).toBeGreaterThan(0);
    await tab(page);
    await expect(button(page, 'b')).toBeFocused();
    expect(await isOpen(page, 'b')).toBe(true);
    expect(await shown(page, 'a')).toBe(false);
    expect(await running(page, 'b')).toBe(0);
    expect((await drawnNow(page, 'b')).opacity).toBe(1);
    // Escape on it, then on to the next: the person was done with tooltips, so this one moves as a first one does.
    await page.keyboard.press('Escape');
    expect(await isOpen(page, 'b')).toBe(false);
    await tab(page);
    await expect(button(page, 'c')).toBeFocused();
    expect(await isOpen(page, 'c')).toBe(true);
    await expect.poll(() => running(page, 'c')).toBeGreaterThan(0);
    expect((await drawnNow(page, 'c')).opacity).toBeLessThan(1);
    // An activation of the anchor, and a press on the tooltip: the next one waits for its whole show delay.
    for (const dismiss of ['activation', 'press'] as const) {
      await mount(page, [f('a', {}), f('b', {})]);
      await override(page, { [T('motion-warm-duration')]: '300ms' });
      await pauseClock(page);
      await anchor(page, 'a').hover();
      await page.clock.runFor(400);
      expect(await isOpen(page, 'a'), dismiss).toBe(true);
      if (dismiss === 'activation') await anchor(page, 'a').click();
      else {
        const s = await bounds(surface(page, 'a'));
        await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2, { steps: 4 });
        await page.mouse.down();
        await page.mouse.up();
      }
      expect(await isOpen(page, 'a'), dismiss).toBe(false);
      await anchor(page, 'b').hover();
      expect(await isOpen(page, 'b'), dismiss).toBe(false);
      await page.clock.runFor(399);
      expect(await isOpen(page, 'b'), dismiss).toBe(false);
      await page.clock.runFor(1);
      expect(await isOpen(page, 'b'), dismiss).toBe(true);
      // The next page is mounted on a running clock (the mount waits for its first paint), and the clock held after it.
      await page.clock.resume();
    }
    // Reduced motion keeps the warm time (TIP-18): it is a waiting time.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [f('a', {}), f('b', {})]);
    await override(page, { [T('motion-warm-duration')]: '300ms' });
    await pauseClock(page);
    await anchor(page, 'a').hover();
    await page.clock.runFor(400);
    await page.mouse.move(2, 190);
    await page.clock.runFor(300);
    expect(await isOpen(page, 'a')).toBe(false);
    await page.clock.runFor(299);
    await anchor(page, 'b').hover();
    expect(await isOpen(page, 'b')).toBe(true);
    expect(await running(page, 'b')).toBe(0);
    await page.mouse.move(2, 190);
    await page.clock.runFor(300);
    await rested(page, 'b');
    await page.clock.runFor(300);
    await anchor(page, 'a').hover();
    expect(await isOpen(page, 'a')).toBe(false);
  });

  test('TIP-29: told to close while entering, or to open while leaving, it turns round from the opacity and size it has reached, taking no longer than the whole motion; closed or leaving it takes no pointer input, and closed it takes no room and draws nothing', async ({ page }) => {
    await mount(page, [f('a', { showDelay: 0, hideDelay: 0 })]);
    // Motions of 40 s, so that what a slow machine does between two readings (a round trip of half a second) moves the
    // opacity by a hundredth: the readings below are compared within 0.15, which at 4 s was 600 ms of the machine's time.
    await override(page, { [T('motion-enter-duration')]: '40s', [T('motion-exit-duration')]: '40s', [T('motion-enter-easing')]: 'linear', [T('motion-exit-easing')]: 'linear', [T('motion-enter-scale')]: '0.5' });
    await page.evaluate(() => document.querySelector('[data-fixture="a"]')!.addEventListener('pointerdown', (e) => (window as any).log.push(`stage:${(e.target as Element).localName}`)));
    const remaining = () => motion(page, 'a').evaluate((el) => Math.max(...el.getAnimations().map((animation) => Number(animation.effect!.getComputedTiming().endTime) - Number(animation.currentTime))));
    // Entering…
    await anchor(page, 'a').hover();
    expect(await isOpen(page, 'a')).toBe(true);
    // …and a quarter of the way in: the entering motion itself is moved there (it goes on running), not waited for.
    expect(
      await motion(page, 'a').evaluate((el) => {
        const entering = el.getAnimations();
        for (const animation of entering) animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) / 4;
        return entering.length;
      }),
    ).toBeGreaterThan(0);
    const entering = await drawnNow(page, 'a');
    expect(entering.opacity).toBeGreaterThan(0.12);
    expect(entering.opacity).toBeLessThan(0.45);
    const s = edges(await bounds(surface(page, 'a')));
    // …and told to close: it leaves from where it is, not from whole.
    await page.mouse.move(2, 190);
    expect(await isOpen(page, 'a')).toBe(false);
    const turned = await drawnNow(page, 'a');
    expect(turned.opacity).toBeGreaterThan(0.02);
    expect(turned.opacity).toBeLessThan(0.6);
    expect(Math.abs(turned.opacity - entering.opacity)).toBeLessThan(0.15);
    expect(Math.abs(turned.box.width - entering.box.width)).toBeLessThan((s.right - s.left) * 0.1);
    expect(await remaining()).toBeLessThanOrEqual(40000);
    expect(await shown(page, 'a')).toBe(true);
    // Leaving, it is closed for the pointer: a press there reaches what lies under it, and the pointer on it is not hover.
    expect(await css(surface(page, 'a'), 'pointer-events')).toBe('none');
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-tooltip') ?? null, [s.centerX, s.centerY])).toBeNull();
    await page.mouse.move(s.centerX, s.centerY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
    expect(await isOpen(page, 'a')).toBe(false);
    expect(await log(page)).toEqual(['a:true', 'a:false', 'stage:div']);
    // …and told to open again while it leaves: it comes back from where it is, not from nothing.
    const leaving = await drawnNow(page, 'a');
    expect(leaving.opacity).toBeGreaterThan(0);
    await anchor(page, 'a').hover();
    expect(await isOpen(page, 'a')).toBe(true);
    const back = await drawnNow(page, 'a');
    expect(Math.abs(back.opacity - leaving.opacity)).toBeLessThan(0.15);
    expect(back.opacity).toBeLessThan(0.9);
    expect(await remaining()).toBeLessThanOrEqual(40000);
    expect(await css(surface(page, 'a'), 'pointer-events')).not.toBe('none');
    await endMotion(page, 'a');
    expect((await drawnNow(page, 'a')).opacity).toBe(1);
    // Closed: out of the top layer — no box, nothing drawn, nothing in the way.
    await page.mouse.move(2, 190);
    await expect.poll(() => running(page, 'a')).toBeGreaterThan(0);
    await endMotion(page, 'a');
    await expect.poll(() => shown(page, 'a')).toBe(false);
    expect(await surface(page, 'a').evaluate((el) => [el.getClientRects().length, getComputedStyle(el).display])).toEqual([0, 'none']);
    await page.mouse.move(s.centerX, s.centerY);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(100);
    expect(await isOpen(page, 'a')).toBe(false);
    expect((await log(page)).slice(-1)).toEqual(['stage:div']);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, open and closed', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [...spec.fixtures, f('closed', { open: false })] });
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).include('main').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  // Each fixture alone on the spec's stage: a 320 × 200 window with the anchor at its centre (one tooltip at a time, TIP-8).
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 200 });
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
      await expect.poll(() => shown(page, fixture.id)).toBe(true);
      await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});

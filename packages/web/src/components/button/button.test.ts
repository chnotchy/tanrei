import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { opticalSize } from '../../../test/icons.js';
import { MIRRORED, anchorOf, container, countClicks, expectDisabledLink, expectDrawnAlike, expectLinkActivation, expectNewContext, expectRefusals, expectTargetLabel, markOf, painted, settledPaint, warnings } from '../../../test/links.js';

const spec = loadSpec('button');
const button = (id: string) => `[data-fixture="${id}"] tanrei-button`;
const token = (page: import('@playwright/test').Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

test.beforeEach(async ({ page }) => {
  await mountFixtures(page, spec);
});

test.describe('behavior', () => {
  test('BTN-1: pointer, Enter and Space each emit click exactly once', async ({ page }) => {
    const target = page.locator(button('filled-medium'));
    await target.evaluate((el) => {
      (window as any).clicks = 0;
      el.addEventListener('click', () => (window as any).clicks++);
    });
    await target.click();
    expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
    await target.focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).clicks)).toBe(2);
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => (window as any).clicks)).toBe(3);
  });

  test('BTN-2: a disabled button emits nothing, is not focusable and exposes disabled', async ({ page }) => {
    const target = page.locator(button('filled-disabled'));
    await target.evaluate((el) => {
      (window as any).clicks = 0;
      el.addEventListener('click', () => (window as any).clicks++);
      (el as HTMLElement).click();
    });
    await target.click({ force: true });
    expect(await page.evaluate(() => (window as any).clicks)).toBe(0);

    await target.focus();
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('TANREI-BUTTON');
    await expect(target.getByRole('button', { disabled: true })).toHaveCount(1);
  });

  // Precedence between focused and pressed cannot be SEEN here (the default gives both 0.1): see the acme test below.
  test('BTN-3: each state renders from that state’s tokens (default system)', async ({ page }) => {
    const target = page.locator(button('filled-medium'));
    const inner = target.locator('button');
    const bg = () => inner.evaluate((el) => getComputedStyle(el).backgroundColor);
    const enabled = await bg();
    expect(enabled).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));

    await target.hover();
    await expect.poll(bg).toBe(await resolveColor(page, '--tanrei-comp-button-filled-hovered-container-color'));
    expect(await bg()).not.toBe(enabled);

    await page.mouse.down(); // hovered AND pressed: pressed wins
    await expect.poll(bg).toBe(await resolveColor(page, '--tanrei-comp-button-filled-pressed-container-color'));
    await page.mouse.up();

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, target); // keyboard focus, pointer elsewhere
    await expect.poll(bg).toBe(await resolveColor(page, '--tanrei-comp-button-filled-focused-container-color'));

    // A variant without a fill still shows state: its hovered container is the label color at the state opacity.
    const text = page.locator(button('text-medium')).locator('button');
    await page.locator(button('text-medium')).hover();
    await expect.poll(() => text.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-text-hovered-container-color'));
    // The component draws no overlay of its own: state is entirely a matter of token values.
    expect(await target.locator('.state-layer').count()).toBe(0);
  });

  test('BTN-4: keyboard focus shows the focus ring immediately; pointer focus does not', async ({ page }) => {
    const target = page.locator(button('filled-medium'));
    const inner = target.locator('button');
    await target.click();
    await expect(inner).toHaveCSS('outline-style', 'none');

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, target);
    await expect(inner).toHaveCSS('outline-style', 'solid');
    await expect(inner).toHaveCSS('outline-width', `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    await expect(inner).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    // Never animated: the outline is not part of any transition.
    expect(await inner.evaluate((el) => getComputedStyle(el).transitionProperty)).not.toContain('outline');
  });

  // The heights are read from the tokens, never written here: the tokens are the spec's values.
  test('BTN-5: the hit area meets the minimum target while the visual height stays at the token', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [fixture, size] of [['filled-small', 'small'], ['filled-medium', 'medium'], ['filled-large', 'large']] as const) {
      const target = page.locator(button(fixture));
      const box = await target.locator('button').boundingBox();
      const height = await resolveToken(page, `--tanrei-comp-button-container-height-${size}`);
      expect(box!.height).toBe(height);
      const hit = await target.evaluate((el) => {
        const r = getComputedStyle(el.shadowRoot!.querySelector('button')!, '::before');
        return { w: Number.parseFloat(r.width), h: Number.parseFloat(r.height) };
      });
      expect(hit.h).toBeGreaterThanOrEqual(pointer);
      expect(hit.w).toBeGreaterThanOrEqual(pointer);
      // Where the visual size is below the target: a click just outside the visual bounds, inside the target, still
      // activates. (The large size is taller than the target, and extends nothing.)
      if (height >= pointer) continue;
      await target.evaluate((el) => {
        (window as any).clicks = 0;
        el.addEventListener('click', () => (window as any).clicks++);
      });
      await page.mouse.click(box!.x + box!.width / 2, box!.y - (pointer - height) / 2 + 1);
      expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
    }
    expect(await resolveToken(page, '--tanrei-comp-button-container-height-small')).toBeLessThan(pointer);
  });

  test('BTN-6: disabled renders from the disabled tokens of its variant', async ({ page }) => {
    const styles = await page.locator(button('filled-disabled')).evaluate((el) => {
      const s = getComputedStyle(el.shadowRoot!.querySelector('button')!);
      return { color: s.color, background: s.backgroundColor, shadow: s.boxShadow };
    });
    expect(styles.background).toBe(await resolveColor(page, '--tanrei-comp-button-filled-disabled-container-color'));
    expect(styles.color).toBe(await resolveColor(page, '--tanrei-comp-button-filled-disabled-label-color'));
    // In the Tanrei system those are on-surface at the disabled opacities.
    expect(styles.color).toMatch(/0\.38\)$/);
    expect(styles.background).toMatch(/0\.12\)$/);
  });
});

// ── Choices of kind and the press itself ─────────────────────────────────────────────
test.describe('press, feedback, corners and focus style', () => {
  // Building the acme fixture system takes longer than a test's budget on a busy machine: once per worker, up front.
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  type P = import('@playwright/test').Page;
  const inner = (page: P, id: string) => page.locator(button(id)).locator('button');
  const css = (page: P, id: string, property: string, pseudo?: string) =>
    inner(page, id).evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
  const pressed = (page: P, id: string) => inner(page, id).getAttribute('data-pressed');
  const ripples = (page: P, id: string) => inner(page, id).locator('.ripple');
  /** Records, inside the page, when data-pressed appears and disappears, and when the press ends. */
  const watchPress = (page: P, id: string) =>
    inner(page, id).evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          // What the press looks like the moment it is shown: [feedback, transition in, container color].
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.transitionDuration, s.backgroundColor];
        }
        else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) el.addEventListener(type, () => (log.up ??= performance.now()));
      // The press begins with the event, before the element's own listener: what the person did, on the page's clock.
      // (`on` is a microtask later — a fraction of a millisecond in Chromium, several in Firefox under load.)
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  /** performance.now() is coarsened (and jittered in Firefox). */
  const CLOCK = 1;
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('BTN-3: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(page, 'filled-medium', 'background-color');
    const [hovered, focused, down] = await Promise.all(['hovered', 'focused', 'pressed'].map((s) => resolveColor(page, `--tanrei-comp-button-filled-${s}-container-color`)));
    // The point of the fixture system: no two of them are equal, so the assertions below cannot pass by accident.
    expect(new Set([hovered, focused, down, await bg()]).size).toBe(4);

    await page.locator(button('filled-medium')).hover();
    await expect.poll(bg).toBe(hovered);
    await tab(page); // hovered AND keyboard-focused: focused wins
    await expect(inner(page, 'filled-medium')).toBeFocused();
    await expect.poll(bg).toBe(focused);
    await page.keyboard.down('Space'); // hovered AND focused AND pressed: pressed wins
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
    await expect.poll(bg).toBe(focused);
    await page.mouse.down(); // the same with the pointer
    await expect.poll(bg).toBe(down);
    await page.mouse.up();
  });

  test('BTN-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    expect(await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration')).toBe(100);
    // A driver's key press or click is not always over within 100 ms (Firefox under load takes 200). The hold is
    // made longer than any of them, the way a design system would, so that every press below is the short one.
    // (4 s: a key's release is sent one answer after its press, and an answer of WebKit on Linux takes up to 570 ms.)
    const longHold = () => rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '4000ms' });
    const hold = 4000;
    const down = await resolveColor(page, '--tanrei-comp-button-filled-pressed-container-color');
    const activations: [string, () => Promise<void>][] = [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => page.locator(button('filled-medium')).click()],
    ];
    for (const [name, activate] of activations) {
      await mountFixtures(page, spec);
      await longHold();
      expect(await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration')).toBe(hold);
      await page.locator(button('filled-medium')).focus();
      // Let the focused state settle first: in the default system it has the pressed state's color, and a
      // transition already running towards that color is, correctly, not restarted by the press.
      await expect.poll(() => css(page, 'filled-medium', 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-filled-focused-container-color'));
      await watchPress(page, 'filled-medium');
      await activate();
      await expect.poll(async () => (await pressLog(page)).off, name).toBeDefined();
      const log = await pressLog(page);
      // Without delay: the pressed tokens are applied with no transition in.
      expect(log.seen, name).toEqual(['overlay', '0s', down]);
      expect(log.up! - log.on!, `${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
      expect(log.off! - log.down!, name).toBeGreaterThanOrEqual(hold - CLOCK);
    }
  });

  test('BTN-8: a press longer than press-hold ends when the press ends; a dial moves the hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await watchPress(page, 'filled-medium');
    await page.locator(button('filled-medium')).hover();
    await page.mouse.down();
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, 'filled-medium')).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'filled-medium')).toBeNull();
    const log = await pressLog(page);
    expect(log.off! - log.up!).toBeLessThan(hold);

    await mountFixtures(page, spec);
    await rootTokens(page, { '--tanrei-dial-motion-unit': '150ms' });
    const longer = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(longer).toBe(300);
    await page.locator(button('filled-medium')).focus();
    await watchPress(page, 'filled-medium');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await pressLog(page)).off).toBeDefined();
    const dialed = await pressLog(page);
    expect(dialed.off! - dialed.down!).toBeGreaterThanOrEqual(longer - CLOCK);
  });

  test('BTN-8: a pointer press lasts as long as the pointer is down, even when focus leaves; a key press ends when focus leaves', async ({ page }) => {
    // Safari takes focus away from a focused button on mouse down. Done by hand here, so every engine proves it.
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await page.locator(button('filled-medium')).focus();
    await page.locator(button('filled-medium')).hover();
    await page.mouse.down();
    await inner(page, 'filled-medium').evaluate((el) => el.blur());
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, 'filled-medium')).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'filled-medium')).toBeNull();

    await page.locator(button('filled-medium')).focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, 'filled-medium')).toBe('overlay');
    await inner(page, 'filled-medium').evaluate((el) => el.blur()); // the keyup will never reach the button
    await expect.poll(() => pressed(page, 'filled-medium')).toBeNull();
    await page.keyboard.up('Space');
  });

  test('BTN-8: a disabled button shows no pressed state', async ({ page }) => {
    await page.locator(button('filled-disabled')).click({ force: true });
    expect(await pressed(page, 'filled-disabled')).toBeNull();
  });

  test('BTN-9 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await page.locator(button('tonal-medium')).hover();
    await page.mouse.down();
    expect(await pressed(page, 'tonal-medium')).toBe('overlay');
    expect(await css(page, 'tonal-medium', 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-pressed-container-color'));
    expect(await ripples(page, 'tonal-medium').count()).toBe(0);
    await page.mouse.up();
  });

  test('BTN-9 ripple (m3-like): the pressed layer grows from the point of contact, clipped to the container', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const box = (await inner(page, 'filled-medium').boundingBox())!;
    const hovered = await resolveColor(page, '--tanrei-comp-button-filled-hovered-container-color');
    await page.mouse.move(box.x + 10, box.y + 8);
    await expect.poll(() => css(page, 'filled-medium', 'background-color')).toBe(hovered);
    await page.mouse.down();
    expect(await pressed(page, 'filled-medium')).toBe('ripple');
    const ripple = ripples(page, 'filled-medium');
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      const container = el.parentElement!.getBoundingClientRect();
      const own = el.getBoundingClientRect();
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - container.left,
        y: Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - container.top,
        r: Number.parseFloat(el.style.getPropertyValue('--_r')),
        color: s.backgroundColor,
        radius: Number.parseFloat(s.borderTopLeftRadius),
        animation: s.animationName,
        hidden: el.getAttribute('aria-hidden'),
        behindLabel: s.zIndex,
        diagonal: Math.hypot(own.width, own.height),
      };
    });
    // From the point of contact…
    expect(layer.x).toBeCloseTo(10, 0);
    expect(layer.y).toBeCloseTo(8, 0);
    // …far enough to cover the farthest corner, in the pressed state-layer color the tokens give…
    expect(layer.r).toBeGreaterThan(layer.diagonal * 0.75);
    expect(layer.r).toBeLessThanOrEqual(layer.diagonal + 1);
    expect(layer.color).toBe(await resolveColor(page, '--tanrei-comp-button-filled-pressed-container-color'));
    expect(layer.animation).toBe('ripple-grow');
    // It grows over comp.button.motion.feedback-duration with motion.state-easing, and will fade over motion.state-duration.
    const motion = await ripple.evaluate((el) => { const s = getComputedStyle(el); return { grow: Number.parseFloat(s.animationDuration) * 1000, curve: s.animationTimingFunction, fade: Number.parseFloat(s.transitionDuration) * 1000, fades: s.transitionProperty }; });
    const easing = await inner(page, 'filled-medium').evaluate((el) => getComputedStyle(el).transitionTimingFunction.split(/,\s*(?=cubic|ease|linear)/)[0]);
    expect(motion).toEqual({ grow: await resolveToken(page, '--tanrei-comp-button-motion-feedback-duration', 'duration'), curve: easing, fade: await resolveToken(page, '--tanrei-comp-button-motion-state-duration', 'duration'), fades: 'opacity' });
    // …clipped to the container shape, under the label, and the container itself does not switch at once.
    expect(layer.radius).toBeGreaterThanOrEqual(box.height / 2 - 1);
    expect(layer).toMatchObject({ hidden: 'true', behindLabel: '-1' });
    expect(await css(page, 'filled-medium', 'background-color')).toBe(hovered);
    // Mid-growth the clip is a circle around the point of contact, smaller than the final one.
    const clip = await ripple.evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip).toMatch(/^circle\(/);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0); // faded, removed
    expect(await pressed(page, 'filled-medium')).toBeNull();
  });

  test('BTN-9 ripple: the COMPONENT token decides the growth; the fade starts when the press and press-hold are over, not when the growth is', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    // A growth far longer than any press below — set where a design system sets it. sys.motion.duration.long1, which
    // the token aliases by default, is moved the other way to prove the component does not read it.
    await rootTokens(page, {
      '--tanrei-comp-button-motion-feedback-duration': '40000ms',
      '--tanrei-sys-motion-duration-long1': '1ms',
      // Long enough for the driver to send the release before the hold, which counts from the press, is over.
      '--tanrei-sys-motion-duration-press-hold': '4000ms',
    });
    // What must be looked at is looked at by the page itself, at the moment it happens: the driver's answers are
    // 150 ms and more apiece on a slow runner, and the press, the hold and the fade do not wait for them.
    await inner(page, 'filled-medium').evaluate((el) => {
      const log: Record<string, unknown> = ((window as any).rippleSeen = {});
      const layer = () => el.querySelector<HTMLElement>('.ripple');
      window.addEventListener('pointerdown', () => (log.down ??= performance.now()), { capture: true });
      // Once every listener of the release has run: the pressed state and the layer as the release left them.
      window.addEventListener('pointerup', () => { log.up ??= performance.now(); setTimeout(() => (log.afterUp ??= [el.getAttribute('data-pressed'), layer()?.classList.contains('leaving')])); }, { capture: true });
      new MutationObserver(() => {
        const ripple = layer();
        if (!ripple) {
          if (log.grows !== undefined) log.gone ??= performance.now();
          return;
        }
        log.grows ??= getComputedStyle(ripple).animationDuration;
        if (ripple.classList.contains('leaving') && log.fade === undefined) {
          log.fade = performance.now();
          const growth = ripple.getAnimations().find((a) => a instanceof CSSAnimation);
          log.growing = growth?.playState === 'running';
          log.grown = Number(growth?.effect?.getComputedTiming().progress);
        }
      }).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    const ripple = ripples(page, 'filled-medium');
    await page.locator(button('filled-medium')).hover();
    await page.mouse.down();
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
    const seen = await page.evaluate(() => (window as any).rippleSeen as { down: number; up: number; afterUp: [string | null, boolean | undefined]; grows: string; fade: number; growing: boolean; grown: number; gone: number });
    expect(seen.grows, 'the component token is the growth').toBe('40s');
    expect(seen.up - seen.down, 'the press ended within the hold (else this test looked at nothing)').toBeLessThan(4000);
    // Press-hold first: the layer is whole (not leaving) while the pressed state is still shown…
    expect(seen.afterUp).toEqual(['ripple', false]);
    expect(seen.fade - seen.down, 'the fade starts when the hold is over').toBeGreaterThanOrEqual(4000 - 1);
    // …then it fades while still growing, and is gone long before the growth would have ended.
    expect(seen.growing).toBe(true);
    expect(seen.grown, 'the growth at the moment the fade began').toBeLessThan(1);
    expect(seen.gone - seen.down).toBeLessThan(40_000 / 2);
  });

  test('BTN-9 ripple: keyboard activation answers from the center; reduced motion makes it an overlay', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.locator(button('filled-medium')).focus();
    await page.keyboard.down('Enter');
    const center = await ripples(page, 'filled-medium').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await expect(ripples(page, 'filled-medium')).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    const still = await ripples(page, 'filled-medium').evaluate((el) => {
      const s = getComputedStyle(el);
      return { animation: s.animationName, transition: s.transitionDuration, clip: s.clipPath, r: el.style.getPropertyValue('--_r') };
    });
    expect(still.animation).toBe('none');
    expect(still.transition).toBe('0s');
    expect(Number.parseFloat(still.clip.slice('circle('.length))).toBeCloseTo(Number.parseFloat(still.r), 2); // the whole layer, at once
    await page.keyboard.up('Enter');
    await expect(ripples(page, 'filled-medium')).toHaveCount(0);
  });

  test('BTN-9 dim (cupertino): the pressed opacity on the whole control, no state layer', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    // Make a state layer visible if one were drawn: cupertino's own pressed container equals its resting one.
    await rootTokens(page, { '--tanrei-comp-button-filled-pressed-container-color': 'rgb(255, 0, 0)' });
    // …and tell the state under the press (hovered) from rest, and the pressed label from every other label.
    await rootTokens(page, { '--tanrei-comp-button-filled-hovered-container-color': 'rgb(0, 255, 0)', '--tanrei-comp-button-filled-pressed-label-color': 'rgb(0, 0, 255)' });
    await page.locator(button('filled-medium')).hover();
    await expect.poll(() => css(page, 'filled-medium', 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, 'filled-medium')).toBe('dim');
    expect(await css(page, 'filled-medium', 'opacity')).toBe(await token(page, '--tanrei-comp-button-pressed-opacity'));
    expect(Number(await css(page, 'filled-medium', 'opacity'))).toBeLessThan(1);
    // Only the container color stays with the state under the press; the label is the pressed label.
    expect(await css(page, 'filled-medium', 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await css(page, 'filled-medium', 'color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, 'filled-medium').count()).toBe(0);
    await page.mouse.up();
  });

  test('BTN-9 none: no answer to the press (no shipped system chooses it, so the choice is delivered the way a system delivers it)', async ({ page }) => {
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await page.locator(button('filled-medium')).hover();
    const hovered = await resolveColor(page, '--tanrei-comp-button-filled-hovered-container-color');
    await expect.poll(() => css(page, 'filled-medium', 'background-color')).toBe(hovered);
    const before = await inner(page, 'filled-medium').evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.boxShadow, s.opacity, s.borderRadius]; });
    await page.mouse.down();
    expect(await pressed(page, 'filled-medium')).toBe('none');
    expect(await inner(page, 'filled-medium').evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.boxShadow, s.opacity, s.borderRadius]; })).toEqual(before);
    expect(await ripples(page, 'filled-medium').count()).toBe(0);
    await page.mouse.up();
    // An unknown name is answered as the first value.
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(page, 'filled-medium')).toBe('overlay');
    await page.mouse.up();
  });

  test('BTN-9 / BTN-10: the choices follow data-tanrei-system at runtime, and two systems on one page do not leak', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.addStyleTag({ content: (await import('node:fs')).readFileSync(new URL('../../../dist/systems/cupertino.css', import.meta.url), 'utf8') });
    await page.addStyleTag({ content: await acmeSystemCss() });
    const press = async (id: string) => {
      await page.locator(button(id)).hover();
      await page.mouse.down();
      const kind = await pressed(page, id);
      await page.mouse.up();
      return kind;
    };
    const smoothing = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    // A circle is `round`, which computes to superellipse(1); an eased corner is any other superellipse.
    const corner = async (id: string) => (/^(round|superellipse\(1\))$/.test(await css(page, id, 'corner-top-left-shape')) ? 'circular' : 'eased');
    expect(await press('tonal-medium')).toBe('ripple');

    // One stage switches to cupertino, another to acme; the rest of the page stays m3-like. Cupertino's Button is a
    // capsule since its review (a pill, which no smoothing eases — styles/shape.ts), so the page gives every Button a
    // rounded rectangle, the way a layer would: the smoothing of each scope can then be seen in its corner.
    // (The build writes a `-pill` companion beside every shape token, each state's included.)
    const notPill = ['', 'hovered-', 'focused-', 'pressed-', 'disabled-'].map((state) => `--tanrei-comp-button-${state}container-shape-pill: 0;`).join(' ');
    await page.addStyleTag({ content: `:root, [data-tanrei-system] { --tanrei-comp-button-container-shape: var(--tanrei-sys-shape-corner-medium); ${notPill} }` });
    await page.locator('[data-fixture="tonal-medium"]').evaluate((el) => el.setAttribute('data-tanrei-system', 'cupertino'));
    await page.locator('[data-fixture="outlined-medium"]').evaluate((el) => el.setAttribute('data-tanrei-system', 'acme'));
    expect(await press('tonal-medium')).toBe('dim');
    expect(await press('outlined-medium')).toBe('overlay');
    expect(await press('filled-medium')).toBe('ripple');
    if (smoothing) {
      expect(await corner('tonal-medium')).toBe('eased');
      expect(await corner('filled-medium')).toBe('circular');
      expect(await corner('outlined-medium')).toBe('circular');
    }
    // Keyboard focus: a glow only inside the acme scope.
    const halo = (id: string) => css(page, id, 'box-shadow', '::after');
    await page.locator(button('outlined-medium')).focus();
    await tab(page, { back: true }); await tab(page);
    await expect(inner(page, 'outlined-medium')).toBeFocused();
    expect(await halo('outlined-medium')).not.toBe('none');
    await tab(page, { back: true }); // elevated-medium, still m3-like
    await expect(inner(page, 'elevated-medium')).toBeFocused();
    expect(await halo('elevated-medium')).toBe('none');
    expect(await css(page, 'elevated-medium', 'outline-style')).toBe('solid');

    // And back again, on the same elements.
    await page.locator('[data-fixture="tonal-medium"]').evaluate((el) => el.setAttribute('data-tanrei-system', 'm3-like'));
    expect(await press('tonal-medium')).toBe('ripple');
    if (smoothing) expect(await corner('tonal-medium')).toBe('circular');
  });

  test('BTN-10 corner smoothing: the default is a quarter circle at the token radius; cupertino (0.6) eases it where the browser can', async ({ page }) => {
    const radius = (id: string, pseudo?: string) => css(page, id, 'border-top-left-radius', pseudo).then(Number.parseFloat);
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0');
    expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    expect(await radius('filled-medium')).toBe(await resolveToken(page, '--tanrei-comp-button-container-shape'));

    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback' });
    // Cupertino's own Button is a capsule since its review: a pill, which the smoothing leaves round whatever the amount.
    expect(await token(page, '--tanrei-comp-button-container-shape-pill')).toBe('1');
    if (supported) expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    // A rounded rectangle, set the way a layer sets it, is what the amount eases.
    await rootTokens(page, {
      '--tanrei-comp-button-container-shape': 'var(--tanrei-sys-shape-corner-medium)',
      // The build writes a `-pill` companion beside every shape token, each state's included (styles/shape.ts).
      ...Object.fromEntries(['', 'hovered-', 'focused-', 'pressed-', 'disabled-'].map((state) => [`--tanrei-comp-button-${state}container-shape-pill`, '0'])),
    });
    const shape = await resolveToken(page, '--tanrei-comp-button-container-shape');
    if (supported) {
      // Amount s → superellipse exponent 2 + s at radius (1 + 0.4 s) r (styles/shape.ts): 2.6 = superellipse(log2 2.6).
      expect(Number.parseFloat((await css(page, 'filled-medium', 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      // (The radius eases from the capsule's over the state motion.)
      await expect.poll(() => radius('filled-medium')).toBeCloseTo(shape * 1.24, 2);
      // The focus ring and the ripple follow: the same curve, concentric with the scaled radius.
      await tabTo(page, page.locator(button('filled-medium')));
      expect(await css(page, 'filled-medium', 'corner-top-left-shape', '::after')).toBe(await css(page, 'filled-medium', 'corner-top-left-shape'));
      const innerEdge = (await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width'));
      expect(await radius('filled-medium', '::after')).toBeCloseTo(shape * 1.24 + innerEdge, 2);
    } else {
      // Circular, the amount at 0: the token's radius, untouched.
      expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toBe('');
      await expect.poll(() => radius('filled-medium')).toBe(shape);
    }
  });

  test('BTN-10 focus-style: acme shows keyboard focus as a glow in the same two focus colors; the default is a ring', async ({ page }) => {
    // The default system: a hard line, and no halo.
    await tab(page);
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(page, 'filled-medium', 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await css(page, 'filled-medium', 'box-shadow', '::after')).toBe('none');
    expect(await inner(page, 'filled-medium').getAttribute('data-focus-style')).toBe('ring');
    // The path of a browser without style queries, alone: the attribute the element writes on focus draws the halo.
    await inner(page, 'filled-medium').evaluate((el) => el.setAttribute('data-focus-style', 'glow'));
    expect(await css(page, 'filled-medium', 'box-shadow', '::after')).not.toBe('none');
    expect(await css(page, 'filled-medium', 'outline-color')).toBe('rgba(0, 0, 0, 0)');

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    // A two-tone indicator, so both colors can be seen in the halo.
    await rootTokens(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    await page.locator(button('filled-medium')).click(); // pointer focus: no indicator at all (BTN-4)
    expect(await css(page, 'filled-medium', 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, page.locator(button('filled-medium')));
    const [outer, offset] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset')];
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    // No hard line (but still an outline, which forced-colors mode repaints)…
    expect(await css(page, 'filled-medium', 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(page, 'filled-medium', 'outline-style')).toBe('solid');
    // …a halo after the offset: inner color, then the ring color, each blurred by its own width.
    expect(await css(page, 'filled-medium', 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${ring} 0px 0px ${outer}px ${outer + 1}px`);
    expect(await css(page, 'filled-medium', 'top', '::after')).toBe(`${-offset}px`);
    expect(await css(page, 'filled-medium', 'border-top-width', '::after')).toBe('0px');
    // Never animated (BTN-4), and the fallback for browsers without style queries names the same choice.
    expect(await css(page, 'filled-medium', 'transition-property', '::after')).not.toContain('box-shadow');
    expect(await inner(page, 'filled-medium').getAttribute('data-focus-style')).toBe('glow');
    // Which of the two paths drew it in THIS browser: without the attribute the halo stays only where the style
    // container query is evaluated. A browser without style queries draws the halo through the attribute alone.
    const styleQueries = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.innerHTML = '<style>@container style(--probe: on) { .tanrei-probe { color: rgb(1, 2, 3) } }</style><div style="--probe: on"><div class="tanrei-probe"></div></div>';
      document.body.appendChild(probe);
      const supported = getComputedStyle(probe.querySelector('.tanrei-probe')!).color === 'rgb(1, 2, 3)';
      probe.remove();
      return supported;
    });
    const withoutAttribute = await inner(page, 'filled-medium').evaluate((el) => {
      el.removeAttribute('data-focus-style');
      const halo = getComputedStyle(el, '::after').boxShadow;
      el.setAttribute('data-focus-style', 'glow');
      return halo;
    });
    test.info().annotations.push({ type: 'focus-style', description: styleQueries ? 'drawn by the style container query' : 'no style container queries in this browser: drawn through data-focus-style, which the element wrote on focus' });
    expect(withoutAttribute !== 'none').toBe(styleQueries);
    await test.info().attach('glow-focus', { body: await page.locator('[data-fixture="filled-medium"]').screenshot(), contentType: 'image/png' });

    // Forced colors repaint the transparent outline — in the engines that have the mode.
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      // The media query alone is not the mode: WebKit answers it under emulation and repaints nothing.
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    if (forced) expect(await css(page, 'filled-medium', 'outline-color')).not.toBe('rgba(0, 0, 0, 0)');
    else test.info().annotations.push({ type: 'forced-colors', description: 'not emulated by this browser' });
  });
});

test.describe('values a design system may change', () => {
  const override = (page: import('@playwright/test').Page, vars: Record<string, string>) => rootTokens(page, vars);

  test('a two-tone focus indicator: inner stroke, then outer stroke, after the offset', async ({ page }, testInfo) => {
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': '#ffffff', '--tanrei-sys-color-focus-ring': '#000000', '--tanrei-sys-focus-offset': '1px' });
    const inner = page.locator(button('tonal-medium')).locator('button');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, page.locator(button('tonal-medium')));
    await expect(inner).toHaveCSS('outline-offset', '2px'); // offset 1 + inner 1
    const after = await inner.evaluate((el) => { const a = getComputedStyle(el, '::after'); return { width: a.borderTopWidth, color: a.borderTopColor, inset: a.top }; });
    expect(after).toEqual({ width: '1px', color: 'rgb(255, 255, 255)', inset: '-2px' });
    await testInfo.attach('two-tone-focus', { body: await page.locator('[data-fixture="tonal-medium"]').screenshot(), contentType: 'image/png' });
  });

  test('a negative offset draws the indicator inside the control', async ({ page }) => {
    await override(page, { '--tanrei-sys-focus-offset': '-3px' });
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, page.locator(button('filled-medium')));
    await expect(page.locator(button('filled-medium')).locator('button')).toHaveCSS('outline-offset', '-3px');
  });

  test('a leading icon selects its own leading padding token', async ({ page }) => {
    await override(page, { '--tanrei-comp-button-container-padding-inline-start-with-icon-medium': '6px' });
    const plain = `${await resolveToken(page, '--tanrei-comp-button-container-padding-inline-start-medium')}px`;
    const host = page.locator(button('filled-medium'));
    const inner = host.locator('button');
    await expect(inner).toHaveCSS('padding-inline-start', plain);
    await host.evaluate((el) => { const i = document.createElement('span'); i.slot = 'icon'; i.textContent = '+'; el.prepend(i); });
    await expect(inner).toHaveCSS('padding-inline-start', '6px');
    await expect(inner).toHaveCSS('padding-inline-end', `${await resolveToken(page, '--tanrei-comp-button-container-padding-inline-end-medium')}px`);
  });

  test('a pressed shape different from the resting shape', async ({ page }) => {
    await override(page, { '--tanrei-comp-button-pressed-container-shape': '2px' });
    const host = page.locator(button('filled-medium'));
    await host.hover(); await page.mouse.down();
    await expect(host.locator('button')).toHaveCSS('border-top-left-radius', '2px');
    await page.mouse.up();
  });
});

// ── The icon: its side's padding, and the widths of an icon-only Button ─────────────
test.describe('icon side padding and icon-only widths', () => {
  type P = import('@playwright/test').Page;
  const T = (name: string) => `--tanrei-comp-button-${name}`;
  const inner = (page: P, id: string) => page.locator(button(id)).locator('button');
  const box = async (page: P, id: string) => (await inner(page, id).boundingBox())!;
  /** How far a part of the button is from the container's left and right edge. */
  const insets = (page: P, id: string, part: string) =>
    inner(page, id).evaluate((el, selector) => {
      const [outer, own] = [el.getBoundingClientRect(), el.querySelector(selector)!.getBoundingClientRect()];
      return { left: Math.round((own.left - outer.left) * 100) / 100, right: Math.round((outer.right - own.right) * 100) / 100 };
    }, part);
  const warnings = (page: P) => {
    const seen: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') seen.push(message.text());
    });
    return seen;
  };
  const SIZES = [['small', '-small'], ['medium', ''], ['large', '-large']] as const;

  test('BTN-11: the icon sits on the side iconPosition names, the label container.gap from it, with the icon-side padding on its side and the plain padding on the other; without an icon the plain padding on both sides', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, { id: 'label-trailing', props: { variant: 'filled', iconPosition: 'trailing' }, content: 'Deploy' }] });
    for (const [size, suffix] of SIZES) {
      const [start, end, startIcon, endIcon, gap] = await Promise.all(
        ['container-padding-inline-start', 'container-padding-inline-end', 'container-padding-inline-start-with-icon', 'container-padding-inline-end-with-icon', 'container-gap'].map((member) => resolveToken(page, T(`${member}-${size}`))),
      );
      // The icon's side is a step tighter in the default system (12 / 12 / 16 against 16 / 16 / 24).
      expect(startIcon, size).toBeLessThan(start);
      expect(endIcon, size).toBeLessThan(end);
      // A leading icon: the icon first, at the icon-side padding; the label gap after it, at the plain padding from the end.
      const leading = `filled-leading-icon${suffix}`;
      const [icon, label] = [await insets(page, leading, '.icon'), await insets(page, leading, '.label')];
      expect(icon.left, leading).toBeCloseTo(startIcon, 1);
      expect(label.right, leading).toBeCloseTo(end, 1);
      const width = (await box(page, leading)).width;
      expect(label.left - (width - icon.right), `${leading}: the gap`).toBeCloseTo(gap, 1);
      // A trailing icon: the label first, at the plain padding; the icon after it, at the icon-side padding from the end.
      const trailing = `filled-trailing-icon${suffix}`;
      const [iconT, labelT] = [await insets(page, trailing, '.icon'), await insets(page, trailing, '.label')];
      expect(labelT.left, trailing).toBeCloseTo(start, 1);
      expect(iconT.right, trailing).toBeCloseTo(endIcon, 1);
      const widthT = (await box(page, trailing)).width;
      expect(iconT.left - (widthT - labelT.right), `${trailing}: the gap`).toBeCloseTo(gap, 1);
    }
    // No icon: the plain padding on both sides, whatever iconPosition says.
    const [start, end] = [await resolveToken(page, T('container-padding-inline-start-medium')), await resolveToken(page, T('container-padding-inline-end-medium'))];
    for (const id of ['filled-medium', 'label-trailing']) expect(await insets(page, id, '.label'), id).toEqual({ left: start, right: end });
    expect((await box(page, 'label-trailing')).width).toBe((await box(page, 'filled-medium')).width);
  });

  test('BTN-11: right-to-left mirrors the icon’s side and both paddings', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, dir: 'rtl' });
    const [start, end, startIcon, endIcon] = await Promise.all(
      ['container-padding-inline-start', 'container-padding-inline-end', 'container-padding-inline-start-with-icon', 'container-padding-inline-end-with-icon'].map((member) => resolveToken(page, T(`${member}-medium`))),
    );
    // Leading is the start: the right.
    const [icon, label] = [await insets(page, 'filled-leading-icon', '.icon'), await insets(page, 'filled-leading-icon', '.label')];
    expect(icon.right).toBeCloseTo(startIcon, 1);
    expect(label.left).toBeCloseTo(end, 1);
    expect(icon.left).toBeGreaterThan(label.left);
    // Trailing is the end: the left.
    const [iconT, labelT] = [await insets(page, 'filled-trailing-icon', '.icon'), await insets(page, 'filled-trailing-icon', '.label')];
    expect(iconT.left).toBeCloseTo(endIcon, 1);
    expect(labelT.right).toBeCloseTo(start, 1);
  });

  test('BTN-12: an icon-only button is as high as its size and as wide as its width names — its height, its glyph with container.padding-inline-narrow on each side, or container.width-wide — the glyph centred, with no inline padding of the container’s own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const [size, suffix] of SIZES) {
      const height = await resolveToken(page, T(`container-height-${size}`));
      // Narrow has no width of its own: the glyph's box and the inset twice.
      const narrow = (await resolveToken(page, T(`icon-size-without-label-${size}`))) + 2 * (await resolveToken(page, T(`container-padding-inline-narrow-${size}`)));
      const wide = await resolveToken(page, T(`container-width-wide-${size}`));
      // Three different widths at one height.
      expect(narrow, size).toBeLessThan(height);
      expect(wide, size).toBeGreaterThan(height);
      for (const [id, width] of [[`filled-icon${suffix}`, height], [`filled-icon-narrow${suffix}`, narrow], [`filled-icon-wide${suffix}`, wide]] as const) {
        const drawn = await box(page, id);
        expect([drawn.width, drawn.height], id).toEqual([width, height]);
        const glyph = await insets(page, id, '.icon');
        expect(glyph.left, `${id}: centred`).toBeCloseTo(glyph.right, 1);
        expect(await inner(page, id).evaluate((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]), id).toEqual(['0px', '0px']);
        // The glyph is the icon box of its size alone, at every width.
        expect((await page.locator(button(id)).locator('.icon').boundingBox())!.width, id).toBeCloseTo(await resolveToken(page, T(`icon-size-without-label-${size}`)), 1);
      }
    }
    // BTN-12's verify, under the default system: 28, 32 and 32 wide — the glyph's box of each size, 20, 24 and 24, and
    // 4 (sys.space.space50) on each side of it — and the container, its state layer (the container's own paint), its
    // outline and its ripple are a capsule of that width.
    const inset = await resolveToken(page, '--tanrei-sys-space-space50');
    expect(inset).toBe(4);
    for (const [size, suffix, glyphSize, width] of [['small', '-small', 20, 28], ['medium', '', 24, 32], ['large', '-large', 24, 32]] as const) {
      const id = `filled-icon-narrow${suffix}`;
      expect(await resolveToken(page, T(`icon-size-without-label-${size}`)), size).toBe(glyphSize);
      expect(await resolveToken(page, T(`container-padding-inline-narrow-${size}`)), size).toBe(inset);
      // The width token 0073 read is gone: the width is derived, so nothing can disagree with the glyph and the inset.
      expect(await token(page, T(`container-width-narrow-${size}`)), `${size}: no narrow width token`).toBe('');
      const drawn = await box(page, id);
      const glyph = (await page.locator(button(id)).locator('.icon').boundingBox())!;
      expect([glyph.x - drawn.x, drawn.x + drawn.width - glyph.x - glyph.width], `${id}: the inset on each side of the glyph`).toEqual([inset, inset]);
      expect(drawn.width, id).toBe(width);
      expect((await page.locator(button(id)).boundingBox())!.width, `${id}: the element is no wider`).toBe(width);
      expect(await inner(page, id).evaluate((el) => [getComputedStyle(el).minInlineSize, getComputedStyle(el).borderTopLeftRadius].map((value) => Number.parseFloat(value))), `${id}: no other minimum width, a capsule`).toEqual([width, expect.any(Number)]);
      expect(await inner(page, id).evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)), id).toBeGreaterThanOrEqual(width / 2);
    }
    // The narrow button follows its glyph: a design system that re-sizes the glyph keeps the room beside it, and one
    // that wants a size to differ more gives it a larger inset.
    await rootTokens(page, { [T('icon-size-without-label-medium')]: '40px', [T('container-padding-inline-narrow-large')]: '10px' });
    expect((await box(page, 'filled-icon-narrow')).width, 'a 40 glyph and 4 on each side').toBe(48);
    expect((await insets(page, 'filled-icon-narrow', '.icon')).left).toBeCloseTo(inset, 1);
    expect((await box(page, 'filled-icon-narrow-large')).width, 'a 24 glyph and 10 on each side').toBe(44);
    expect((await box(page, 'filled-icon-narrow-small')).width, 'the other sizes are not moved').toBe(28);
    await rootTokens(page, { [T('icon-size-without-label-medium')]: '', [T('container-padding-inline-narrow-large')]: '' });
    // The other looks take the same widths.
    expect((await box(page, 'text-icon-narrow')).width).toBe(32);
    expect((await box(page, 'outlined-icon-wide')).width).toBe(await resolveToken(page, T('container-width-wide-medium')));
    expect((await box(page, 'tonal-icon-wide-selected')).width).toBe(await resolveToken(page, T('container-width-wide-medium')));
  });

  test('BTN-12: the corner is capped at half the shorter side — a circle at the default width and a capsule at the other two under corner.full, a rounded rectangle under a smaller corner; the container grows with the text size and keeps its proportion', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    /** What is under a point of the stage: the button's container, or the stage around it. */
    const drawn = async (id: string, x: number, y: number) => {
      const { decodePng } = await import('../../../test/png.js');
      const container = await box(page, id);
      const scale = await page.evaluate(() => devicePixelRatio);
      const shot = decodePng(await inner(page, id).screenshot({ animations: 'disabled' }));
      return shot.at(Math.min(shot.width - 1, Math.round(x * container.width * scale)), Math.min(shot.height - 1, Math.round(y * container.height * scale))) === surface ? 'stage' : 'container';
    };
    // corner.full: the radius is far larger than the box, and the browser caps it at half the shorter side.
    expect(await resolveToken(page, T('container-shape'))).toBeGreaterThan(await resolveToken(page, T('container-height-large')));
    for (const id of ['filled-icon', 'filled-icon-narrow', 'filled-icon-wide']) {
      // The very corner is cut away; the middle of every edge is the container: round ends, never an ellipse.
      expect(await drawn(id, 0.04, 0.04), id).toBe('stage');
      expect(await drawn(id, 0.96, 0.96), id).toBe('stage');
      expect(await drawn(id, 0.5, 0.02), id).toBe('container');
      expect(await drawn(id, 0.03, 0.5), id).toBe('container');
    }
    // A capsule: along the wide one's straight top edge, a quarter of the way in, the container is still drawn…
    expect(await drawn('filled-icon-wide', 0.3, 0.03)).toBe('container');
    // …where the circle of the default width has already curved away.
    expect(await drawn('filled-icon', 0.12, 0.12)).toBe('stage');
    // A smaller corner: a rounded square, and a rounded rectangle.
    await rootTokens(page, { '--tanrei-comp-button-container-shape': '6px', '--tanrei-comp-button-container-shape-pill': '0' });
    for (const id of ['filled-icon', 'filled-icon-narrow', 'filled-icon-wide']) {
      await expect(inner(page, id)).toHaveCSS('border-top-left-radius', '6px');
      expect(await drawn(id, 0.12, 0.12), id).toBe('container');
    }
    // Text size: every size is a rem token, so the container grows and keeps the proportion of its width to its height.
    const before = await Promise.all(['filled-icon-narrow', 'filled-icon', 'filled-icon-wide'].map((id) => box(page, id)));
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await Promise.all(['filled-icon-narrow', 'filled-icon', 'filled-icon-wide'].map((id) => box(page, id)));
    for (const [n, grown] of after.entries()) {
      expect(grown.height).toBeCloseTo(before[n].height * 2, 1);
      expect(grown.width / grown.height).toBeCloseTo(before[n].width / before[n].height, 3);
    }
  });

  test('BTN-21: a labelled button ignores width; an unknown width renders at the default one and is reported; the hit area meets the target at every width without the button being drawn wider', async ({ page, browserName }) => {
    const seen = warnings(page);
    const labelled = (id: string, width: string): Fixture => ({ id, props: { variant: 'filled', width }, content: 'Deploy' });
    const icon = (id: string, props: Fixture['props']): Fixture => ({ id, props: { variant: 'text', label: 'Favorite', ...props }, slots: { icon: 'favorite' } });
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, labelled('label-narrow', 'narrow'), labelled('label-wide', 'wide'), { id: 'label-icon-wide', props: { variant: 'filled', width: 'wide' }, content: 'Create', slots: { icon: 'add' } }, icon('odd', { width: 'enormous' }), icon('narrow-small', { width: 'narrow', size: 'small' })],
    });
    // With a label: as wide as its content and its paddings, as filled-medium is.
    const plain = await box(page, 'filled-medium');
    for (const id of ['label-narrow', 'label-wide']) expect(await box(page, id).then((drawn) => [drawn.width, drawn.height]), id).toEqual([plain.width, plain.height]);
    expect((await box(page, 'label-icon-wide')).width).toBe((await box(page, 'filled-leading-icon')).width);
    // An unknown width: the default width, reported once.
    expect((await box(page, 'odd')).width).toBe((await box(page, 'text-icon')).width);
    await expect.poll(() => seen.filter((w) => w.includes('BTN-21')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/<tanrei-button>: width "enormous" is not a value of the button; it is drawn as "default" \(BTN-21\)/);
    // The target: a narrow button is narrower than the target and is not drawn wider to reach it; its hit area is.
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [id, size] of [['text-icon-narrow', 'medium'], ['narrow-small', 'small'], ['filled-icon-narrow-large', 'large'], ['filled-icon-wide-small', 'small'], ['filled-icon-wide', 'medium']] as const) {
      const drawn = await box(page, id);
      const own = id.includes('narrow') ? (await resolveToken(page, T(`icon-size-without-label-${size}`))) + 2 * (await resolveToken(page, T(`container-padding-inline-narrow-${size}`))) : await resolveToken(page, T(`container-width-wide-${size}`));
      expect(drawn.width, id).toBe(own);
      const hit = await inner(page, id).evaluate((el) => {
        const area = getComputedStyle(el, '::before');
        return { width: Number.parseFloat(area.width), height: Number.parseFloat(area.height) };
      });
      expect(hit.width, id).toBeGreaterThanOrEqual(Math.max(pointer, drawn.width));
      expect(hit.height, id).toBeGreaterThanOrEqual(Math.max(pointer, drawn.height));
    }
    // A press beside the narrow button's visible bounds, inside its target, still activates it.
    // BTN-21's verify: text-icon-narrow is 32 wide under the default system.
    const narrow = await box(page, 'text-icon-narrow');
    expect(narrow.width).toBe(32);
    expect(narrow.width).toBeLessThan(pointer);
    await page.locator(button('text-icon-narrow')).evaluate((el) => {
      (window as any).clicks = 0;
      el.addEventListener('click', () => (window as any).clicks++);
    });
    await page.locator(button('text-icon-narrow')).scrollIntoViewIfNeeded();
    const placed = await box(page, 'text-icon-narrow');
    await page.mouse.click(placed.x - (pointer - placed.width) / 2 + 1, placed.y + placed.height / 2);
    await page.mouse.click(placed.x + placed.width + (pointer - placed.width) / 2 - 1, placed.y + placed.height / 2);
    expect(await page.evaluate(() => (window as any).clicks)).toBe(2);
    // A coarse pointer: sys.target.touch across (BTN-21's verify: 48 under the default system), the button still 32 wide.
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(() => inner(page, 'text-icon-narrow').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBeGreaterThanOrEqual(touch);
    expect(touch).toBe(48);
    expect((await box(page, 'text-icon-narrow')).width).toBe(narrow.width);
  });

  // A preset keeps the narrow widths it drew — its own glyph and the inset it pins.
  for (const [system, widths] of [
    ['m3-like', { small: 28, medium: 32, large: 48 }],
    ['cupertino', { small: 28, medium: 32, large: 48 }],
    ['m3-expressive-like', { xsmall: 28, small: 28, medium: 32, large: 48, xlarge: 48 }],
  ] as const) {
    test(`BTN-12, BTN-21: under ${system} a narrow icon-only button is its glyph and the inset the preset pins on each side — ${Object.values(widths).join(' / ')} — the glyph centred, at the height of its size, and its hit area reaches the target`, async ({ page }) => {
      const sizes = Object.keys(widths) as (keyof typeof widths)[];
      await mountFixtures(page, spec, { icons: true, system, fixtures: sizes.map((size) => ({ id: `narrow-${size}`, props: { variant: 'filled', size, width: 'narrow', label: 'Favorite' }, slots: { icon: 'favorite' } })) });
      const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
      for (const size of sizes) {
        const id = `narrow-${size}`;
        const [glyphSize, pad, height] = [await resolveToken(page, T(`icon-size-without-label-${size}`)), await resolveToken(page, T(`container-padding-inline-narrow-${size}`)), await resolveToken(page, T(`container-height-${size}`))];
        const drawn = await box(page, id);
        expect([drawn.width, drawn.height], id).toEqual([glyphSize + 2 * pad, height]);
        expect(drawn.width, `${id}: what the preset drew`).toBe(widths[size]);
        const glyph = await insets(page, id, '.icon');
        expect([glyph.left, glyph.right], `${id}: the inset on each side`).toEqual([pad, pad]);
        const hit = await inner(page, id).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width));
        expect(hit, id).toBeGreaterThanOrEqual(Math.max(pointer, drawn.width));
      }
    });
  }

  test('BTN-10: outside a group nothing of a group reaches the button — no added padding, no clip, its own corners — and a group’s custom properties are no attribute of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const start = await resolveToken(page, T('container-padding-inline-start-medium'));
    const style = await inner(page, 'outlined-medium').evaluate((el) => {
      const s = getComputedStyle(el);
      return { clip: s.clipPath, margin: s.margin, paddingLeft: s.paddingLeft, classes: [...el.classList].filter((name) => ['joined', 'connected', 'standard', 'row', 'block', 'stretch', 'first', 'last'].includes(name)) };
    });
    expect(style).toEqual({ clip: 'none', margin: '0px', paddingLeft: `${start}px`, classes: [] });
    // The channel is internal: the element has no property or attribute for a corner, a seam or an outer padding.
    const surface = await page.locator(button('outlined-medium')).evaluate((el) => [...el.getAttributeNames(), ...Object.keys((el.constructor as any).elementProperties ? Object.fromEntries((el.constructor as any).elementProperties) : {})]);
    for (const name of surface) expect(name).not.toMatch(/group|seam|outer|radius|joined/i);
    // (What a connected group gives an item — corners, minimum size, seams, outer padding — is button-group.test.ts's:
    // BGR-2, BGR-3, BGR-16, BGR-22, BGR-23.)
  });
});

// ── One Button: an icon alone, and toggles ──────────────────────────────────────
test.describe('icon, accessible name and toggle', () => {
  type P = import('@playwright/test').Page;
  const T = (name: string) => `--tanrei-comp-button-${name}`;
  const inner = (page: P, id: string) => page.locator(button(id)).locator('button');
  const css = (page: P, id: string, property: string) => inner(page, id).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  const glyph = (page: P, id: string) =>
    page.locator(button(id)).evaluate((el) => {
      const box = el.shadowRoot!.querySelector('.icon') as HTMLElement;
      const slotted = el.querySelector('[slot="icon"]') as HTMLElement;
      const [boxStyle, style] = [getComputedStyle(box), getComputedStyle(slotted)];
      return { size: box.getBoundingClientRect().width, color: boxStyle.color, family: style.fontFamily.replaceAll('"', ''), settings: style.fontVariationSettings, hidden: box.getAttribute('aria-hidden') };
    });
  const warnings = (page: P) => {
    const seen: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') seen.push(message.text());
    });
    return seen;
  };
  const sys = (page: P, name: string) => token(page, `--tanrei-sys-${name}`).then((value) => value.replaceAll('"', ''));

  test('BTN-13: the icon is drawn at icon.size beside a label and icon.size-without-label alone, in the family and fill of its selection — selected only for a toggle that is on — taking the label color beside a label and the icon color alone', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const [size, suffix] of [['small', '-small'], ['medium', ''], ['large', '-large']] as const) {
      expect((await glyph(page, `filled-leading-icon${suffix}`)).size, size).toBe(await resolveToken(page, T(`icon-size-${size}`)));
      expect((await glyph(page, `filled-icon${suffix}`)).size, size).toBe(await resolveToken(page, T(`icon-size-without-label-${size}`)));
    }
    const [unselected, selected] = [await sys(page, 'icon-family-unselected'), await sys(page, 'icon-family-selected')];
    const fill = (settings: string) => Number(/"FILL" ([\d.]+)/.exec(settings)?.[1]);
    const weight = (settings: string) => Number(/"wght" ([\d.]+)/.exec(settings)?.[1]);
    // Unselected: a plain button, and a toggle that is off.
    for (const id of ['text-icon', 'filled-leading-icon', 'text-icon-unselected', 'text-leading-icon-toggle-unselected']) {
      const drawn = await glyph(page, id);
      expect(drawn.family.split(',')[0].trim(), id).toBe(unselected.split(',')[0].trim());
      expect(fill(drawn.settings), id).toBe(Number(await sys(page, 'icon-fill-unselected')));
      expect(weight(drawn.settings), id).toBe(Number(await sys(page, 'icon-weight')));
    }
    // Selected: only a toggle that is on.
    for (const id of ['text-icon-selected', 'text-leading-icon-toggle-selected', 'tonal-icon-wide-selected']) {
      const drawn = await glyph(page, id);
      expect(drawn.family.split(',')[0].trim(), id).toBe(selected.split(',')[0].trim());
      expect(fill(drawn.settings), id).toBe(Number(await sys(page, 'icon-fill-selected')));
    }
    expect(Number(await sys(page, 'icon-fill-selected'))).not.toBe(Number(await sys(page, 'icon-fill-unselected')));
    // Beside a label: the label color of the look. Alone: the icon color of the look.
    expect((await glyph(page, 'filled-leading-icon')).color).toBe(await resolveColor(page, T('filled-label-color')));
    expect((await glyph(page, 'text-leading-icon')).color).toBe(await resolveColor(page, T('text-label-color')));
    expect((await glyph(page, 'text-icon')).color).toBe(await resolveColor(page, T('text-icon-color')));
    expect((await glyph(page, 'text-icon-selected')).color).toBe(await resolveColor(page, T('text-selected-icon-color')));
    expect((await glyph(page, 'text-leading-icon-toggle-selected')).color).toBe(await resolveColor(page, T('text-selected-label-color')));
    // BTN-13's verify: a plain text icon is on-surface-variant under the default system.
    expect(await resolveColor(page, T('text-icon-color'))).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface-variant'));
  });

  test('BTN-13: the icon carries the optical size of its box — beside a label and alone, at every size — and is drawn exactly as an explicit opsz of that size', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // Axis values to 1/1000: Firefox serializes an opsz computed as tan(atan2(48px, 1px)) as 47.9999.
    const axes = (settings: string) => Object.fromEntries([...settings.matchAll(/"(\w+)" ([\d.]+)/g)].map((m) => [m[1], Math.round(Number(m[2]) * 1000) / 1000]));
    // The optical size is the box's, clamped to sys.icon.optical-size, written by hand (src/styles/icons.ts, test/icons.ts):
    // not every engine draws font-optical-sizing: auto (WebKit on Linux does not).
    for (const [size, suffix] of [['small', '-small'], ['medium', ''], ['large', '-large']] as const) {
      for (const [id, name] of [[`filled-leading-icon${suffix}`, `icon-size-${size}`], [`filled-icon${suffix}`, `icon-size-without-label-${size}`], [`filled-icon-narrow${suffix}`, `icon-size-without-label-${size}`], [`filled-icon-wide${suffix}`, `icon-size-without-label-${size}`]] as const) {
        const drawn = await glyph(page, id);
        expect(drawn.size, id).toBe(await resolveToken(page, T(name)));
        expect(axes(drawn.settings), id).toEqual({ FILL: Number(await sys(page, 'icon-fill-unselected')), wght: Number(await sys(page, 'icon-weight')), GRAD: 0, opsz: await opticalSize(page, drawn.size) });
        expect(await page.locator(button(id)).locator('.icon').evaluate((el) => getComputedStyle(el).fontOpticalSizing), id).toBe('auto');
      }
    }
    // A selected icon-only toggle keeps the axis beside its own fill.
    const selected = await glyph(page, 'text-icon-selected');
    expect(axes(selected.settings)).toEqual({ FILL: Number(await sys(page, 'icon-fill-selected')), wght: Number(await sys(page, 'icon-weight')), GRAD: 0, opsz: await opticalSize(page, selected.size) });
    // Pixels prove the drawing in every engine: an icon-only button whose box is 40 draws its glyph exactly as the same
    // button with an explicit opsz of 40 on the glyph, and not as the font's 20 master scaled up.
    const icon = (id: string): Fixture => ({ id, props: { variant: 'text', label: 'Favorite' }, slots: { icon: 'favorite' } });
    const [fill, weight] = [await sys(page, 'icon-fill-unselected'), await sys(page, 'icon-weight')];
    await mountFixtures(page, spec, { icons: true, fixtures: [icon('drawn'), icon('explicit'), icon('master')] });
    await page.addStyleTag({ content: `tanrei-button { ${T('icon-size-without-label-medium')}: 40px; }` });
    for (const [id, opsz] of [['explicit', 40], ['master', 20]] as const)
      await page.locator(button(id)).evaluate((el, settings) => ((el.querySelector('[slot="icon"]') as HTMLElement).style.fontVariationSettings = settings), `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`);
    for (const id of ['drawn', 'explicit', 'master']) expect((await glyph(page, id)).size, id).toBe(40);
    // (The axis moves to its new value over the state duration, as the fill does.)
    await expect.poll(async () => axes((await glyph(page, 'drawn')).settings).opsz).toBe(await opticalSize(page, 40));
    const [drawn, explicit, master] = await Promise.all(['drawn', 'explicit', 'master'].map((id) => page.locator(button(id)).locator('.icon').screenshot()));
    expect(drawn.equals(explicit), 'the optical size at 40px = opsz 40').toBe(true);
    expect(drawn.equals(master), 'and it is not the 20 master').toBe(false);
  });

  test('BTN-14: a toggle emits click and then change with the opposite of selected, and is exposed as pressed or not pressed; a button that is no toggle exposes no pressed state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const host = page.locator(button('tonal-icon-unselected'));
    await host.evaluate((el) => {
      const log: string[] = ((window as any).log = []);
      el.addEventListener('click', () => log.push(`click:${(el as any).selected}`));
      el.addEventListener('change', (e) => log.push(`change:${(e as CustomEvent).detail.selected}`));
    });
    await expect(inner(page, 'tonal-icon-unselected')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-fixture="tonal-icon-unselected"]').getByRole('button', { name: 'Favorite', pressed: false })).toHaveCount(1);
    await host.click();
    await host.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    // Each activation: the click (which already sees the new value), then the change.
    expect(await page.evaluate(() => (window as any).log)).toEqual(['click:true', 'change:true', 'click:false', 'change:false', 'click:true', 'change:true']);
    await expect(inner(page, 'tonal-icon-unselected')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-fixture="tonal-icon-unselected"]').getByRole('button', { name: 'Favorite', pressed: true })).toHaveCount(1);
    // No toggle: no pressed state, and no change.
    await expect(inner(page, 'filled-icon')).not.toHaveAttribute('aria-pressed');
    await page.locator(button('filled-icon')).evaluate((el) => el.addEventListener('change', () => (window as any).log.push('change:plain')));
    await page.locator(button('filled-icon')).click();
    expect(await page.evaluate(() => (window as any).log)).not.toContain('change:plain');
    // A disabled toggle switches nothing.
    await page.locator(button('filled-icon-selected-disabled')).click({ force: true });
    await expect(inner(page, 'filled-icon-selected-disabled')).toHaveAttribute('aria-pressed', 'true');
  });

  test('BTN-15: a toggle renders from the selected parts of its variant when it is on and from the unselected parts when it is off, its elevation from the variant’s own; a button that is no toggle from the variant’s own parts', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const variant of ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const) {
      for (const look of ['unselected', 'selected'] as const) {
        const id = `${variant}-icon-${look}`;
        expect(await css(page, id, 'background-color'), id).toBe(await resolveColor(page, T(`${variant}-${look}-container-color`)));
        expect((await glyph(page, id)).color, id).toBe(await resolveColor(page, T(`${variant}-${look}-icon-color`)));
        expect(await css(page, id, 'box-shadow'), id).toContain(await resolveColor(page, T(`${variant}-${look}-outline-color`)));
        // The elevation is the variant's in every look: the same layers after the outline as the plain button's.
        const layers = (value: string) => value.split(/,\s*(?![^(]*\))/).slice(1).join(', ');
        expect(layers(await css(page, id, 'box-shadow')), id).toBe(layers(await css(page, `${variant}-icon`, 'box-shadow')));
      }
      // No toggle: the variant's own parts.
      expect(await css(page, `${variant}-icon`, 'background-color'), variant).toBe(await resolveColor(page, T(`${variant}-container-color`)));
    }
    for (const look of ['unselected', 'selected'] as const) expect(await css(page, `tonal-leading-icon-toggle-${look}`, 'color'), look).toBe(await resolveColor(page, T(`tonal-${look}-label-color`)));
    // The two looks are told apart: a toggle that is on is not drawn as one that is off.
    expect(await resolveColor(page, T('tonal-selected-container-color'))).not.toBe(await resolveColor(page, T('tonal-unselected-container-color')));
    // Switched at run time, the look follows what assistive technology is told.
    await page.locator(button('tonal-icon-unselected')).click();
    await page.mouse.move(1, 1);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await expect.poll(() => css(page, 'tonal-icon-unselected', 'background-color')).toBe(await resolveColor(page, T('tonal-selected-container-color')));
  });

  test('BTN-16: an icon-only button is named by label and its glyph is hidden; a drawn label is the name while label is empty; without either it still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'labelled', props: { variant: 'filled' }, content: 'Create', slots: { icon: 'add' } },
        { id: 'icon-only', props: { variant: 'text', label: 'Favorite' }, slots: { icon: 'favorite' } },
        { id: 'nameless', props: { variant: 'text' }, slots: { icon: 'favorite' } },
      ],
    });
    await expect(page.locator('[data-fixture="labelled"]').getByRole('button')).toHaveAccessibleName('Create');
    await expect(inner(page, 'labelled')).not.toHaveAttribute('aria-label');
    await expect(page.locator('[data-fixture="icon-only"]').getByRole('button')).toHaveAccessibleName('Favorite');
    for (const id of ['labelled', 'icon-only', 'nameless']) expect((await glyph(page, id)).hidden, id).toBe('true');
    // No name: it still renders, at its size, and a debug build says so.
    expect((await inner(page, 'nameless').boundingBox())!.width).toBe(await resolveToken(page, T('container-height-medium')));
    await expect.poll(() => seen.filter((w) => w.includes('BTN-16')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/<tanrei-button>: it is icon-only and label is empty, so it has no accessible name; give it a label \(BTN-16\)/);
  });

  test('BTN-16: beside a drawn label, label is the whole accessible name and alone — on the one native element, the drawn text exposed no second time — and the button is drawn exactly as it is without it', async ({ page, browserName }) => {
    const seen = warnings(page);
    const named = ['text-named', 'filled-leading-icon-named', 'outlined-link-named'].map((id) => spec.fixtures.find((f) => f.id === id)!);
    const twins = named.map((f) => {
      const { label: _label, ...props } = f.props;
      return { ...f, id: `${f.id}-twin`, props };
    });
    await mountFixtures(page, spec, { icons: true, fixtures: [...named, ...twins] });
    for (const fixture of named) {
      const id = fixture.id;
      const role = fixture.props.href ? 'link' : 'button';
      const stage = page.locator(`[data-fixture="${id}"]`);
      await expect(stage.getByRole(role), id).toHaveAccessibleName(String(fixture.props.label));
      await expect(stage.getByRole(role), id).toHaveCount(1);
      // The one native element carries the name; the drawn text is still drawn, and no second node holds the name.
      const native = page.locator(button(id)).locator('[part="container"]');
      await expect(native).toHaveAttribute('aria-label', String(fixture.props.label));
      const drawn = (el: Element) => [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim();
      expect(await page.locator(button(id)).evaluate((el) => [el.shadowRoot!.querySelectorAll('[aria-label]').length, el.shadowRoot!.textContent!.trim()])).toEqual([1, '']);
      expect(await page.locator(button(id)).evaluate(drawn)).toBe(fixture.content);
      // Drawn as its twin without the prop: the same box, the same label box, the same paint.
      const look = (fid: string) =>
        page.locator(button(fid)).evaluate((el) => {
          const part = el.shadowRoot!.querySelector<HTMLElement>('[part="container"]')!;
          const text = el.shadowRoot!.querySelector<HTMLElement>('.label')!;
          const style = getComputedStyle(part);
          const box = (r: DOMRect) => [r.width, r.height];
          return { part: box(part.getBoundingClientRect()), label: box(text.getBoundingClientRect()), color: style.color, background: style.backgroundColor, font: style.font, border: style.borderTopColor };
        });
      expect(await look(id), `${id} is drawn as its twin`).toEqual(await look(`${id}-twin`));
    }
    // In the accessibility tree the name is there once: the drawn text is no child of the named control.
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const names = nodes.filter((n) => !n.ignored).map((n) => `${n.role?.value}:${n.name?.value}`);
      expect(names.filter((n) => n === 'button:Reset: Spacing')).toHaveLength(1);
      // (One button named «Reset» is on the page: the twin without the prop.)
      expect(names.filter((n) => n === 'button:Reset')).toHaveLength(1);
      expect(names.filter((n) => /Reset.*Reset/.test(n))).toHaveLength(0);
    }
    expect(seen.filter((w) => w.includes('BTN-16')), 'each name contains its drawn text: nothing to report').toEqual([]);
  });

  test('BTN-16: a label that does not contain the drawn text is reported once and is still the whole name — never the drawn text, never the two joined; compared without case, with white space at the ends dropped and runs as one; an equal label changes nothing', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        { id: 'apart', props: { variant: 'text', label: 'Spacing' }, content: 'Reset' },
        { id: 'loose', props: { variant: 'text', label: 'reset:  spacing' }, content: ' Reset ' },
        { id: 'runs', props: { variant: 'text', label: 'Reset   all: Spacing' }, content: 'Reset\n  all' },
        { id: 'equal', props: { variant: 'text', label: 'Reset' }, content: 'Reset' },
        { id: 'described', props: { variant: 'text', label: 'Reset: Spacing' }, content: 'Reset' },
      ],
    });
    const name = (id: string) => page.locator(`[data-fixture="${id}"]`).getByRole('button');
    await expect(name('apart')).toHaveAccessibleName('Spacing');
    await expect(name('loose')).toHaveAccessibleName('reset: spacing');
    await expect(name('runs')).toHaveAccessibleName('Reset all: Spacing');
    await expect(name('equal')).toHaveAccessibleName('Reset');
    // The report is all it does: it comes once, also when the button renders again, and the name stays what was given.
    await page.locator(button('apart')).evaluate(async (el: HTMLElement & { variant: string; updateComplete: Promise<unknown> }) => {
      el.variant = 'outlined';
      await el.updateComplete;
    });
    await expect.poll(() => seen.filter((w) => w.includes('BTN-16')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/<tanrei-button>: label "Spacing" does not contain the text the button draws \("reset"\), so a person who says what they see is not heard; label is still its whole name \(BTN-16\)/);
    await expect(name('apart')).toHaveAccessibleName('Spacing');
    // A label written later is compared too.
    await page.locator(button('equal')).evaluate(async (el: HTMLElement & { label: string; updateComplete: Promise<unknown> }) => {
      el.label = 'Clear';
      await el.updateComplete;
    });
    await expect.poll(() => seen.filter((w) => w.includes('BTN-16')).length).toBe(2);
    await expect(name('equal')).toHaveAccessibleName('Clear');
    // A description is read after the name and is no part of it.
    await page.locator(button('described')).evaluate((el) => el.setAttribute('aria-description', 'puts the scale back'));
    await expect(name('described')).toHaveAccessibleName('Reset: Spacing');
    await expect(name('described')).toHaveAccessibleDescription('puts the scale back');
  });

  test('BTN-17: a button with neither a label nor an icon still renders its container at the height of its size and as wide as it is high, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [{ id: 'empty', props: { variant: 'filled' } }, { id: 'empty-large', props: { variant: 'outlined', size: 'large' } }] });
    for (const [id, size] of [['empty', 'medium'], ['empty-large', 'large']] as const) {
      const height = await resolveToken(page, T(`container-height-${size}`));
      const drawn = (await inner(page, id).boundingBox())!;
      expect([drawn.width, drawn.height], id).toEqual([height, height]);
    }
    await expect.poll(() => seen.filter((w) => w.includes('BTN-17')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/<tanrei-button>: it has neither a label nor an icon; give it one \(BTN-17\)/);
  });
});

test('BTN-3: an outlined Button’s edge is the hairline in the default system — the color of the divider’s line, read from its own token — at rest, as a toggle that is off and while disabled; the presets keep the outline role', async ({ page }) => {
  await mountFixtures(page, spec, { icons: true });
  const T = (name: string) => `--tanrei-comp-button-${name}`;
  const hairline = await resolveColor(page, '--tanrei-sys-color-outline-variant');
  expect(hairline).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
  expect(hairline).not.toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
  // Each look's own token is the hairline — disabled too: the resting edge is kept, not faded into a stronger line.
  for (const name of ['outlined-outline-color', 'outlined-unselected-outline-color', 'outlined-disabled-outline-color', 'outlined-disabled-unselected-outline-color', 'outlined-hovered-outline-color', 'outlined-pressed-outline-color']) {
    expect(await resolveColor(page, T(name)), name).toBe(hairline);
  }
  // What is drawn is that token: the inset ring of the container, in every outlined fixture that is not selected.
  const ring = (id: string) => page.locator(button(id)).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).boxShadow);
  for (const id of ['outlined-medium', 'outlined-icon', 'outlined-icon-wide', 'outlined-icon-unselected', 'outlined-icon-disabled']) {
    const shadow = await ring(id);
    expect(shadow, id).toContain(hairline);
    expect(shadow.startsWith(hairline), `${id}: the first layer, the inset ring, is the hairline`).toBe(true);
    expect(shadow, id).toContain('inset');
    expect(shadow, id).not.toContain(await resolveColor(page, '--tanrei-sys-color-outline'));
  }
  // A preset pins what it drew: the outline role, and its faded disabled edge.
  for (const system of ['m3-like', 'cupertino']) {
    await mountFixtures(page, spec, { icons: true, system });
    expect(await resolveColor(page, T('outlined-outline-color')), system).toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
    expect(await resolveColor(page, T('outlined-disabled-outline-color')), system).not.toBe(await resolveColor(page, T('outlined-outline-color')));
  }
});

test('outlined draws its border from its outline token (guards against a baseline that blessed a missing border)', async ({ page }) => {
  const shadow = await page.locator(button('outlined-medium')).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).boxShadow);
  const outline = await token(page, '--tanrei-comp-button-outlined-outline-color');
  expect(outline).not.toBe('');
  expect(shadow).toContain('inset');
  expect(shadow).not.toMatch(/^rgba(0, 0, 0, 0)/);
});

test('contrast set on a subtree reaches the component tokens inside it, not only <html>', async ({ page }) => {
  const stage = page.locator('[data-fixture="filled-medium"]');
  const background = () => stage.locator('tanrei-button').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor);
  const standard = await background();
  await stage.evaluate((el) => el.setAttribute('data-tanrei-contrast', 'high'));
  // The container color transitions (state duration token), so wait for it to settle.
  await expect.poll(background).toBe('rgb(0, 0, 0)');
  expect(standard).not.toBe('rgb(0, 0, 0)');
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('the label grows with 200% text size instead of clipping', async ({ page }) => {
    const target = page.locator(button('filled-medium')).locator('button');
    const before = await target.boundingBox();
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await target.boundingBox();
    expect(after!.height).toBeGreaterThanOrEqual(before!.height * 2);
    expect(await target.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});

test.describe('fixtures', () => {
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});

// ── A design system may add sizes and variants ───────────────────────────────────────
test.describe('values a design system adds', () => {
  const fixture = (id: string, props: Record<string, string>) => ({ id, props, content: 'Deploy' });
  const fixtures = [
    fixture('size-3x', { size: '3x' }),
    fixture('size-3x-again', { size: '3x' }),
    fixture('variant-danger', { variant: 'danger' }),
    fixture('size-unknown', { size: 'colossal' }),
    fixture('variant-unknown', { variant: 'sparkly' }),
    fixture('size-hostile', { size: "x'])){}*{color:red}" }),
    fixture('plain', {}),
  ];
  const box = (page: import('@playwright/test').Page, id: string) => page.locator(button(id)).locator('button').boundingBox();
  const style = (page: import('@playwright/test').Page, id: string, property: string) =>
    page.locator(button(id)).locator('button').evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

  let acmeCss = '';
  test.beforeAll(async () => {
    acmeCss = await acmeSystemCss();
  });

  test('a size and a variant declared in one line each render from their tokens, and follow the dials', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: acmeCss, fixtures });
    expect((await box(page, 'size-3x'))!.height).toBe(await resolveToken(page, '--tanrei-comp-button-container-height-3x'));
    // The layer declares `3x` as large × 1.5: read from the tokens (large is 56).
    const large = await resolveToken(page, '--tanrei-comp-button-container-height-large');
    expect((await box(page, 'size-3x'))!.height).toBe(large * 1.5);
    expect(await style(page, 'size-3x', 'padding-left')).toBe(`${(await resolveToken(page, '--tanrei-comp-button-container-padding-inline-start-large')) * 1.5}px`);
    expect(await style(page, 'size-3x', 'padding-top')).toBe('16px'); // the one member the layer overrode
    const unit = await resolveToken(page, '--tanrei-dial-size-unit');
    await rootTokens(page, { '--tanrei-dial-size-unit': '5px' });
    expect((await box(page, 'size-3x'))!.height).toBe((large * 1.5 * 5) / unit);

    const danger = page.locator(button('variant-danger'));
    expect(await style(page, 'variant-danger', 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    await danger.hover();
    await expect.poll(() => style(page, 'variant-danger', 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-danger-hovered-container-color'));
    // One sheet per value for the whole page, shared by every button that needs it.
    const shared = await page.evaluate(() => {
      const [a, b] = ['size-3x', 'size-3x-again'].map((id) => document.querySelector(`[data-fixture="${id}"] tanrei-button`)!.shadowRoot!.adoptedStyleSheets.at(-1));
      return a !== undefined && a === b;
    });
    expect(shared).toBe(true);
    expect(await page.evaluate(() => document.querySelector('[data-fixture="plain"] tanrei-button')!.shadowRoot!.adoptedStyleSheets.length)).toBe(
      await page.evaluate(() => document.querySelector('[data-fixture="size-3x"] tanrei-button')!.shadowRoot!.adoptedStyleSheets.length - 1),
    );
  });

  test('BTN-7: a value the active design system does not have renders as the default, and a debug build reports it', async ({ page }) => {
    const reports: string[] = [];
    page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('BTN-7')) reports.push(message.text()); });
    await mountFixtures(page, spec, { system: 'acme', systemCss: acmeCss, fixtures });
    const plain = await box(page, 'plain');
    expect((await box(page, 'size-unknown'))!.height).toBe(plain!.height);
    expect(await style(page, 'variant-unknown', 'background-color')).toBe(await style(page, 'plain', 'background-color'));
    // colossal, sparkly and the hostile value — not 3x or danger, which acme has.
    await expect.poll(() => reports.length).toBe(3);
    expect(reports.join('\n')).toMatch(/<tanrei-button>: size "colossal" is not a value of the active design system; it is drawn as "medium" \(BTN-7\)/);
    expect(reports.join('\n')).not.toMatch(/"3x"|"danger"/);
    // The same markup under a system that never declared `3x` or `danger`: still the default, never unstyled.
    await mountFixtures(page, spec, { fixtures });
    expect((await box(page, 'size-3x'))!.height).toBe((await box(page, 'plain'))!.height);
    expect(await style(page, 'variant-danger', 'background-color')).toBe(await style(page, 'plain', 'background-color'));
    // An attribute value is interpolated into CSS, so anything but a token name is ignored.
    expect((await box(page, 'size-hostile'))!.height).toBe((await box(page, 'plain'))!.height);
    expect(await page.evaluate(() => getComputedStyle(document.body).color)).not.toBe('rgb(255, 0, 0)');
  });
});

// ── A button with a destination is a link ─────────────────────────────
test.describe('link form', () => {
  type P = import('@playwright/test').Page;
  const T = (name: string) => `--tanrei-comp-button-${name}`;
  const host = (page: P, id: string) => page.locator(button(id));
  const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
  /** The same button without a destination: what a link form must be drawn as (BTN-22). */
  const twin = (id: string): Fixture => {
    const { href: _href, target: _target, targetLabel: _targetLabel, ...props } = fixture(id).props;
    return { ...fixture(id), id: `${id}-twin`, props };
  };
  const NEW = { href: 'https://example.com/tanrei', target: 'new', targetLabel: 'opens in a new tab' };

  test('BTN-22: with href the shadow root holds an anchor to it in place of the button — the link role, named as a button is, with no pressed state — drawn in every state exactly as the button it would otherwise be', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('filled-link'), twin('filled-link'), fixture('text-icon-link'), twin('text-icon-link')] });
    for (const [id, name] of [['filled-link', 'Get started'], ['text-icon-link', 'Getting started']] as const) {
      const link = host(page, id);
      expect(await anchorOf(link), id).toMatchObject({ tag: 'a', href: '/getting-started/', target: null, rel: null, role: null, disabled: null, pressed: null });
      await expect(link.getByRole('link'), id).toHaveAccessibleName(name);
      await expect(link.getByRole('button'), id).toHaveCount(0);
      // The platform's own link: the anchor carries the address itself, so the browser's menu, drag and new tab are its.
      expect(await link.evaluate((el) => el.shadowRoot!.querySelectorAll('a[href], button').length), id).toBe(1);
      await expectDrawnAlike(page, link, host(page, `${id}-twin`));
    }
    // Keyboard focus: the same ring, on the anchor.
    for (const id of ['filled-link', 'filled-link-twin']) {
      await tabTo(page, host(page, id));
      await expect(container(host(page, id))).toHaveCSS('outline-style', 'solid');
    }
    await tabTo(page, host(page, 'filled-link'));
    const focusedLink = await settledPaint(host(page, 'filled-link'));
    await tabTo(page, host(page, 'filled-link-twin'));
    expect(focusedLink).toEqual(await settledPaint(host(page, 'filled-link-twin')));
    // The hit area is the button's: the same minimum target around the anchor.
    const target = (id: string) => container(host(page, id)).evaluate((el) => [getComputedStyle(el, '::before').width, getComputedStyle(el, '::before').height]);
    expect(await target('text-icon-link')).toEqual(await target('text-icon-link-twin'));
  });

  test('BTN-1, BTN-23: a link button emits click exactly once for a pointer and for Enter and then follows href, at once; a cancelled click opens nothing; Space emits no click, shows no press and scrolls the page; a modified or a middle click is the browser’s', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('filled-link')] });
    await expectLinkActivation(page, host(page, 'filled-link'));
  });

  test('BTN-24: target new opens a new context that has no handle to its opener — target _blank and noopener beside the product’s own rel', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('filled-link')] });
    await expectNewContext(page, host(page, 'filled-link'));
  });

  test('BTN-24: the mark open_in_new is drawn after the label as a trailing icon is — container.gap from it, at icon.size, the trailing icon’s padding at the end edge, in the label color, hidden from assistive technology — at every size, with a leading icon keeping its side', async ({ page }) => {
    const sized = (['small', 'medium', 'large'] as const).map((size) => ({ id: `new-${size}`, props: { variant: 'outlined', size, ...NEW }, content: 'View source' }) satisfies Fixture);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('outlined-link-new'), fixture('tonal-link-new-leading-icon'), ...sized] });
    const insets = (id: string, part: string) =>
      container(host(page, id)).evaluate((el, selector) => {
        const [outer, own] = [el.getBoundingClientRect(), el.querySelector(selector)!.getBoundingClientRect()];
        return { left: Math.round((own.left - outer.left) * 100) / 100, right: Math.round((outer.right - own.right) * 100) / 100, width: Math.round(own.width * 100) / 100 };
      }, part);
    for (const [id, size] of [['outlined-link-new', 'medium'], ['new-small', 'small'], ['new-medium', 'medium'], ['new-large', 'large']] as const) {
      const [gap, icon, endIcon, start] = await Promise.all(['container-gap', 'icon-size', 'container-padding-inline-end-with-icon', 'container-padding-inline-start'].map((member) => resolveToken(page, T(`${member}-${size}`))));
      const mark = (await markOf(host(page, id), '.mark'))!;
      const label = await insets(id, '.label');
      const outer = (await container(host(page, id)).boundingBox())!;
      expect(mark.glyph, id).toBe('open_in_new');
      expect(mark.hidden, id).toBe(true);
      expect([mark.width, mark.height], id).toEqual([icon, icon]);
      expect(mark.right, `${id}: the end edge`).toBeCloseTo(endIcon, 1);
      expect(mark.left - (outer.width - label.right), `${id}: the gap`).toBeCloseTo(gap, 1);
      expect(label.left, `${id}: the label's own side keeps the plain padding`).toBeCloseTo(start, 1);
      expect(mark.mirrored, `${id}: the icon set marks its name; left-to-right draws it as it is`).toBe(true);
      expect(mark.transform, id).toBe('none');
      expect(mark.color, `${id}: the label color of its look`).toBe(await container(host(page, id)).evaluate((el) => getComputedStyle(el).color));
    }
    // The default system's medium values, as the spec's verify gives them: 8, 24 and 12.
    const medium = (await markOf(host(page, 'outlined-link-new'), '.mark'))!;
    expect([medium.width, medium.right]).toEqual([24, 12]);
    expect(await resolveToken(page, T('container-gap-medium'))).toBe(8);
    expect(medium.color).toBe(await resolveColor(page, T('outlined-label-color')));

    // An icon and the mark: the product's icon keeps the leading side with its own padding, the mark follows the label.
    const [startIcon, endIcon] = await Promise.all(['container-padding-inline-start-with-icon', 'container-padding-inline-end-with-icon'].map((member) => resolveToken(page, T(`${member}-medium`))));
    const [icon, label, mark] = [await insets('tonal-link-new-leading-icon', '.icon'), await insets('tonal-link-new-leading-icon', '.label'), (await markOf(host(page, 'tonal-link-new-leading-icon'), '.mark'))!];
    expect(icon.left).toBeCloseTo(startIcon, 1);
    expect(mark.right).toBeCloseTo(endIcon, 1);
    expect(icon.left).toBeLessThan(label.left);
    expect(label.left).toBeLessThan(mark.left);
  });

  test('BTN-24: in a right-to-left layout the mark stands at the left of the label, mirrored by the icon helper', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('text-link-new-rtl')] });
    const link = host(page, 'text-link-new-rtl');
    const mark = (await markOf(link, '.mark'))!;
    const label = await container(link).evaluate((el) => el.querySelector('.label')!.getBoundingClientRect().left - el.getBoundingClientRect().left);
    expect(mark.left).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end-with-icon-medium')), 1);
    expect(mark.left).toBeLessThan(label);
    expect(mark.mirrored).toBe(true);
    expect(mark.transform).toBe(MIRRORED);
  });

  test('BTN-24: an icon-only link and a link whose trailing side holds the product’s icon draw no mark, and both still expose targetLabel as the description; target same draws none and ignores it; an empty targetLabel is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('text-icon-link-new'),
        { id: 'own-trailing', props: { variant: 'filled', iconPosition: 'trailing', ...NEW }, content: 'View source', slots: { icon: 'code' } },
        { id: 'same', props: { variant: 'filled', href: '/getting-started/', targetLabel: 'opens in a new tab' }, content: 'Get started' },
        fixture('outlined-link-new'),
      ],
    });
    for (const id of ['text-icon-link-new', 'own-trailing']) {
      expect(await markOf(host(page, id), '.mark'), id).toBeNull();
      expect(await anchorOf(host(page, id)), id).toMatchObject({ tag: 'a', target: '_blank', rel: 'noopener', description: 'opens in a new tab' });
      await expect(host(page, id).getByRole('link'), id).toHaveAccessibleDescription('opens in a new tab');
    }
    // The product's own trailing icon is drawn where the mark would be.
    expect(await host(page, 'own-trailing').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.icon')!).order)).toBe('1');
    await expect(host(page, 'text-icon-link-new').getByRole('link')).toHaveAccessibleName('Source code');
    // In place: no mark, no description.
    expect(await markOf(host(page, 'same'), '.mark')).toBeNull();
    expect(await anchorOf(host(page, 'same'))).toMatchObject({ tag: 'a', target: null, description: null });
    // A description of the product's own is read first.
    await host(page, 'outlined-link-new').evaluate((el) => el.setAttribute('aria-description', '3 open issues'));
    await expectTargetLabel(page, host(page, 'outlined-link-new'), seen, 'BTN-24', { before: '3 open issues' });
    expect(await markOf(host(page, 'outlined-link-new'), '.mark'), 'the mark stays without the words').not.toBeNull();
  });

  test('BTN-2, BTN-25: a disabled link button is an anchor without href — the link role, disabled — that Tab passes, that emits no click and opens nothing, drawn as the disabled button of its variant with its mark in the disabled label color', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('filled-medium'), fixture('filled-link-disabled'), twin('filled-link-disabled'), fixture('outlined-link-new-disabled'), twin('outlined-link-new-disabled'), fixture('text-medium')],
    });
    for (const id of ['filled-link-disabled', 'outlined-link-new-disabled']) {
      const link = host(page, id);
      await expectDisabledLink(page, link);
      // Not focusable, by script or by Tab.
      await link.focus();
      expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('tanrei-button');
      // BTN-6: the disabled tokens of its variant, as its twin's (the mark's padding aside, compared below).
      const [own, plain] = [await painted(link), await painted(host(page, `${id}-twin`))];
      for (const prop of ['background-color', 'color', 'box-shadow', 'opacity', 'cursor', 'height'] as const) expect(own[prop], `${id}: ${prop}`).toBe(plain[prop]);
      expect(own.cursor, id).toBe('default');
    }
    expect((await painted(host(page, 'filled-link-disabled'))).width).toBe((await painted(host(page, 'filled-link-disabled-twin'))).width);
    // Tab goes from the button before them to the one after them.
    await tabTo(page, host(page, 'filled-medium'));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture'))).toBe('text-medium');
    // The mark of a disabled link, in the disabled label color.
    const mark = (await markOf(host(page, 'outlined-link-new-disabled'), '.mark'))!;
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.color).toBe(await container(host(page, 'outlined-link-new-disabled')).evaluate((el) => getComputedStyle(el).color));
    expect(mark.color).toBe(await container(host(page, 'outlined-link-new-disabled-twin')).evaluate((el) => getComputedStyle(el).color));
    expect(await anchorOf(host(page, 'outlined-link-new-disabled'))).toMatchObject({ description: 'opens in a new tab' });
  });

  test('BTN-26: a toggle ignores href, target and targetLabel and stays a toggle, reported; an unknown target is same, reported; white space is no destination; a javascript: address and one that cannot be read are refused and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        { id: 'toggle', props: { variant: 'tonal', toggle: true, selected: true, ...NEW }, content: 'Bold' },
        { id: 'plain', props: { variant: 'filled', href: '/somewhere/' }, content: 'Go' },
      ],
    });
    const toggle = host(page, 'toggle');
    expect(await anchorOf(toggle)).toMatchObject({ tag: 'button', href: null, target: null, rel: null, pressed: 'true', description: null });
    await expect(toggle.getByRole('button', { pressed: true })).toHaveAccessibleName('Bold');
    expect(await markOf(toggle, '.mark')).toBeNull();
    const changes = toggle.evaluate((el) => new Promise<boolean>((resolve) => el.addEventListener('change', (event) => resolve((event as CustomEvent).detail.selected), { once: true })));
    await toggle.click();
    expect(await changes).toBe(false);
    await expect.poll(() => seen.filter((w) => w.includes('(BTN-26)') && w.includes('a toggle cannot be a link')).length).toBe(1);
    // Space still activates what is a button.
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveJSProperty('selected', true);

    await expectRefusals(page, host(page, 'plain'), seen, 'BTN-26', { tag: 'button' });
    // Without a destination it is the button it would be: Space activates it.
    await host(page, 'plain').evaluate((el) => Object.assign(el, { href: 'javascript:alert(1)' }));
    await expect.poll(async () => (await anchorOf(host(page, 'plain'))).tag).toBe('button');
    const clicks = await countClicks(host(page, 'plain'));
    await host(page, 'plain').focus();
    await page.keyboard.press('Space');
    expect(await clicks()).toBe(1);
  });
});

// ── The Button in a form (BTN-27 … BTN-33) ─────────────────────────────────────────────────────
test.describe('in a form', () => {
  type P = import('@playwright/test').Page;
  const warnings = (page: P) => {
    const seen: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') seen.push(message.text());
    });
    return seen;
  };
  /**
   * The page's own markup before the (empty) stages, and one log for the page: `click:<id>` for every button with an
   * id, `submit:<form>` with what is sent — read both ways a product reads the pressed button — `reset:<form>` and
   * `invalid:<id>`. No form is ever sent anywhere: each `submit` is cancelled after it was read.
   */
  const mountForm = async (page: P, markup: string) => {
    await mountFixtures(page, spec, { fixtures: [], lead: markup });
    await page.evaluate(async () => {
      const log: string[] = ((window as unknown as { log: string[] }).log = []);
      const entries = (data: FormData) => [...data.entries()].map(([k, v]) => `${k}=${String(v)}`).join('&');
      for (const el of document.querySelectorAll<HTMLElement>('tanrei-button[id], button[id], input[type="submit"][id]')) el.addEventListener('click', () => log.push(`click:${el.id}`));
      document.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
        log.push(`submit:${form.id}[${entries(new FormData(form, submitter))}]${submitter ? `<${submitter.localName}:${submitter.name}=${submitter.value}>` : ''}`);
      });
      document.addEventListener('reset', (event) => log.push(`reset:${(event.target as HTMLFormElement).id}`));
      document.addEventListener('invalid', (event) => log.push(`invalid:${(event.target as HTMLElement).id}`), true);
      for (const el of document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('form *, tanrei-button')) await el.updateComplete;
    });
  };
  const log = (page: P) => page.evaluate(() => (window as unknown as { log: string[] }).log.splice(0));
  const press = (page: P, id: string) => page.locator(`#${id}`).click();
  const FIELD = (id: string, rest = '') => `<tanrei-text-field id="${id}" name="${id}" label="${id}" ${rest}></tanrei-text-field>`;

  test('BTN-27: a submit button asks its form to submit after click, exactly once — by a pointer, Enter, Space and element.click() — with the form’s validation first; a cancelled click validates and sends nothing; a button without type does nothing to the form; the submission is not held for press-hold', async ({ page }) => {
    await mountForm(page, `<form id="f">${FIELD('who', 'requirement="required"')}<tanrei-button id="send" type="submit">Send</tanrei-button><tanrei-button id="plain">Other</tanrei-button></form>`);
    // The required field is empty: click, the field is told it is invalid (the platform shows its message), no submit.
    await press(page, 'send');
    expect(await log(page)).toEqual(['click:send', 'invalid:who']);
    expect(await page.locator('#who').evaluate((el: HTMLElement & { validity: ValidityState }) => el.validity.valueMissing)).toBe(true);
    // Filled: one submit, after the click.
    await page.locator('#who').evaluate(async (el: HTMLElement & { value: string; updateComplete: Promise<unknown> }) => {
      el.value = 'Ada';
      await el.updateComplete;
    });
    // A press where nothing is, so that the field loses focus and the platform's message closes (Firefox keeps it open
    // while its control has focus, and the next press is then not delivered). Not the page's first pixel: the text
    // field is a block as wide as its place and stands there, and a press on its label row is its control's (FLD-12).
    const view = page.viewportSize()!;
    await page.mouse.click(view.width - 2, view.height - 2);
    expect(await page.evaluate(() => document.activeElement === document.body), 'the press was outside the field').toBe(true);
    await press(page, 'send');
    expect(await log(page)).toEqual(['click:send', 'submit:f[who=Ada]<button:=>']);
    // Enter and Space on the focused button, and a script's click(), do the same.
    await page.locator('#send').focus();
    await page.keyboard.press('Enter');
    expect(await log(page), 'Enter').toEqual(['click:send', 'submit:f[who=Ada]<button:=>']);
    await page.keyboard.press('Space');
    expect(await log(page), 'Space').toEqual(['click:send', 'submit:f[who=Ada]<button:=>']);
    // Not held for press-hold: the form is asked while the click is still being dispatched.
    expect(
      await page.locator('#send').evaluate((el: HTMLElement) => {
        el.click();
        return (window as unknown as { log: string[] }).log.splice(0);
      }),
      'element.click(), read before anything else ran',
    ).toEqual(['click:send', 'submit:f[who=Ada]<button:=>']);
    // The pressed state is shown as for any press (BTN-8).
    await page.locator('#send').focus();
    await page.keyboard.down('Enter');
    await expect(page.locator('#send').locator('button')).toHaveAttribute('data-pressed', /.+/);
    await page.keyboard.up('Enter');
    await log(page);
    // A cancelled click: nothing validated, nothing sent.
    await page.locator('#who').evaluate(async (el: HTMLElement & { value: string; updateComplete: Promise<unknown> }) => {
      el.value = '';
      await el.updateComplete;
    });
    await page.locator('#send').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    await press(page, 'send');
    expect(await log(page), 'cancelled').toEqual(['click:send']);
    // A cancelled click whose propagation was stopped as well.
    await page.locator('#send').evaluate((el) =>
      el.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        { once: true },
      ),
    );
    await press(page, 'send');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await log(page), 'cancelled and stopped').toEqual(['click:send']);
    // A click stopped on its way and not cancelled still submits.
    await page.locator('#who').evaluate((el: HTMLElement & { value: string }) => (el.value = 'Ada'));
    await page.locator('#send').evaluate((el) => el.addEventListener('click', (event) => event.stopPropagation(), { once: true }));
    await press(page, 'send');
    await expect.poll(() => page.evaluate(() => (window as unknown as { log: string[] }).log.length)).toBe(2);
    expect(await log(page), 'stopped, not cancelled').toEqual(['click:send', 'submit:f[who=Ada]<button:=>']);
    // type button, the default: click and nothing of the form.
    await press(page, 'plain');
    expect(await log(page)).toEqual(['click:plain']);
    expect(await page.locator('#plain').evaluate((el: HTMLElement & { type: string }) => [el.type, el.hasAttribute('type')])).toEqual(['button', false]);
    // The native button in the shadow root never has another type: no form owns it there.
    expect(await page.locator('#send').evaluate((el) => [el.getAttribute('type'), el.shadowRoot!.querySelector('button')!.type])).toEqual(['submit', 'button']);
  });

  test('BTN-28: a reset button asks its form to reset after click — one reset event, then every control at its initial value — validates and submits nothing; a cancelled reset or a cancelled click leaves the values', async ({ page }) => {
    await mountForm(
      page,
      `<form id="f">${FIELD('who', 'value="Ada" requirement="required"')}<tanrei-checkbox id="agree" name="agree" label="Agree"></tanrei-checkbox><input id="plain" name="plain" value="native" aria-label="Plain" />
        <tanrei-button id="clear" type="reset" name="intent" value="clear">Clear</tanrei-button></form>`,
    );
    const change = () =>
      page.evaluate(async () => {
        const who = document.querySelector('#who') as HTMLElement & { value: string; updateComplete: Promise<unknown> };
        const agree = document.querySelector('#agree') as HTMLElement & { checked: boolean; updateComplete: Promise<unknown> };
        who.value = '';
        agree.checked = true;
        (document.querySelector('#plain') as HTMLInputElement).value = 'changed';
        await who.updateComplete;
        await agree.updateComplete;
      });
    const values = () =>
      page.evaluate(() => [
        (document.querySelector('#who') as HTMLElement & { value: string }).value,
        (document.querySelector('#agree') as HTMLElement & { checked: boolean }).checked,
        (document.querySelector('#plain') as HTMLInputElement).value,
      ]);
    await change();
    await press(page, 'clear');
    // The required field was empty: nothing was validated, nothing sent.
    expect(await log(page)).toEqual(['click:clear', 'reset:f']);
    expect(await values()).toEqual(['Ada', false, 'native']);
    // A reset listener that cancels it.
    await change();
    await page.evaluate(() => document.querySelector('#f')!.addEventListener('reset', (event) => event.preventDefault(), { once: true }));
    await press(page, 'clear');
    expect(await log(page)).toEqual(['click:clear', 'reset:f']);
    expect(await values(), 'reset cancelled').toEqual(['', true, 'changed']);
    // A cancelled click.
    await page.locator('#clear').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    await press(page, 'clear');
    expect(await log(page)).toEqual(['click:clear']);
    expect(await values(), 'click cancelled').toEqual(['', true, 'changed']);
    // It adds nothing to a later submission.
    await page.locator('#who').evaluate((el: HTMLElement & { value: string }) => (el.value = 'Ada'));
    await page.evaluate(() => (document.querySelector('#f') as HTMLFormElement).requestSubmit());
    expect(await log(page)).toEqual(['submit:f[who=Ada&agree=on&plain=changed]']);
  });

  test('BTN-29: the form is the one around the button or the one its form attribute names, read at the press; the form property returns it; every Button is listed in form.elements in document order and being listed sends nothing; without a form a submit or a reset button emits click and is reported once', async ({ page }) => {
    const seen = warnings(page);
    await mountForm(
      page,
      `<tanrei-button id="before" type="submit" form="checkout">Pay</tanrei-button>
       <form id="checkout">${FIELD('card', 'value="4242"')}<tanrei-button id="plain">Help</tanrei-button><tanrei-button id="link" href="#help">More</tanrei-button></form>
       <form id="a">${FIELD('note', 'value="n"')}<tanrei-button id="cross" type="submit" form="checkout">Pay from A</tanrei-button><tanrei-button id="own" type="submit">Save A</tanrei-button></form>
       <tanrei-button id="after" type="submit" form="checkout">Pay later</tanrei-button>
       <tanrei-button id="lost" type="submit" form="nowhere">Lost</tanrei-button>
       <tanrei-button id="lost-reset" type="reset">Lost reset</tanrei-button>
       <form id="outer"><div id="host"></div></form>
       <form id="d"><tanrei-dialog open headline="Send it?"><tanrei-button id="answer" slot="actions" confirming type="submit" name="answer" value="yes">Send</tanrei-button></tanrei-dialog></form>`,
    );
    // The dialog covers the page: its action is the product's own element in the page's tree, and reaches the form around the dialog.
    expect(await page.locator('#answer').evaluate((el: HTMLElement & { form: HTMLFormElement | null }) => el.form?.id)).toBe('d');
    await press(page, 'answer');
    expect(await log(page)).toEqual(['click:answer', 'submit:d[answer=yes]<button:answer=yes>']);
    await page.locator('tanrei-dialog').evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
      el.open = false;
      await el.updateComplete;
    });
    await expect(page.locator('tanrei-dialog')).not.toHaveAttribute('open');

    const formOf = (id: string) => page.locator(`#${id}`).evaluate((el: HTMLElement & { form: HTMLFormElement | null }) => el.form?.id ?? null);
    // Outside every form, naming one by id.
    expect(await formOf('before')).toBe('checkout');
    await page.locator('#before').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['click:before', 'submit:checkout[card=4242]<button:=>']);
    // Inside form A naming form B: B, and not A.
    expect(await formOf('cross')).toBe('checkout');
    await page.locator('#cross').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['click:cross', 'submit:checkout[card=4242]<button:=>']);
    expect(await formOf('own')).toBe('a');
    await page.locator('#own').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['click:own', 'submit:a[note=n]<button:=>']);

    // Listed among the form's controls, whatever the type — a plain button and a link button too — in document order;
    // a button that names the form from outside is listed where it stands in the document.
    const listed = (id: string) => page.evaluate((f) => [...(document.querySelector(`#${f}`) as HTMLFormElement).elements].map((el) => el.id), id);
    expect(await listed('checkout')).toEqual(['before', 'card', 'plain', 'link', 'cross', 'after']);
    expect(await listed('a')).toEqual(['note', 'own']);
    // Being listed sends nothing.
    expect(await page.evaluate(() => [...new FormData(document.querySelector('#checkout') as HTMLFormElement).keys()])).toEqual(['card']);

    // Read at the press: a form attribute written later, and a button moved into a form, are followed.
    await page.locator('#after').evaluate((el: HTMLElement) => {
      el.setAttribute('form', 'a');
      el.click();
    });
    expect(await log(page)).toEqual(['click:after', 'submit:a[note=n]<button:=>']);
    await page.locator('#after').evaluate((el: HTMLElement) => {
      el.removeAttribute('form');
      document.querySelector('#checkout')!.append(el);
      el.click();
    });
    expect(await log(page)).toEqual(['click:after', 'submit:checkout[card=4242]<button:=>']);

    // No form: click, nothing more, and one report however often it is pressed.
    expect(await formOf('lost')).toBe(null);
    for (let i = 0; i < 2; i++) await page.locator('#lost').evaluate((el: HTMLElement) => el.click());
    await page.locator('#lost-reset').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['click:lost', 'click:lost', 'click:lost-reset']);
    await expect.poll(() => seen.filter((w) => w.includes('BTN-29')).length).toBe(2);
    expect(seen.filter((w) => w.includes('BTN-29')).join('\n')).toMatch(/a submit button has no form[^]*a reset button has no form/);

    // Inside another component's shadow root it does not reach a form outside that root, as no control of the platform does.
    const inside = await page.evaluate(async () => {
      const host = document.querySelector('#host')!;
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<tanrei-button type="submit">Inside</tanrei-button><button type="submit">Native</button>';
      const button = root.querySelector('tanrei-button') as HTMLElement & { form: HTMLFormElement | null; updateComplete: Promise<unknown> };
      await button.updateComplete;
      button.click();
      return [button.form, root.querySelector('button')!.form, (document.querySelector('#outer') as HTMLFormElement).elements.length];
    });
    expect(inside).toEqual([null, null, 0]);
    expect(await log(page)).toEqual([]);
  });

  test('BTN-30: Enter in a field presses the form’s default button — its first submit button, a Button counted as the platform’s own — once, with its name and value sent, without focus or a pressed state; a disabled default button stops it; the platform’s own first button is the one pressed; composing, a cancelled action and a cancelled click submit nothing; a multi-line field breaks the line', async ({ page }) => {
    const two = (buttons: string, rest = '') => `${FIELD('first', 'value="a"')}<input id="second" name="second" value="b" aria-label="Second" />${rest}${buttons}`;
    const SEND = (rest = '') => `<tanrei-button id="send" type="submit" name="intent" value="send" ${rest}>Send</tanrei-button>`;
    const NATIVE = '<button id="native" type="submit" name="intent" value="native">Native</button>';
    const enterIn = async (id: string) => {
      // (The element's own focus(): a composed field passes it to its control, which Playwright's focus does not call.)
      await page.locator(`#${id}`).evaluate((el: HTMLElement) => el.focus());
      await page.keyboard.press('Enter');
    };
    const sent = 'first=a&second=b';

    // (1), (2): a Tanrei field and a native input, a Button after them.
    await mountForm(page, `<form id="f">${two(SEND())}</form>`);
    await enterIn('first');
    expect(await log(page), '(1) Enter in a Tanrei text field').toEqual(['click:send', `submit:f[${sent}&intent=send]<button:intent=send>`]);
    // The key was pressed elsewhere: the button takes no focus and draws no pressed state.
    expect(await page.evaluate(() => [document.activeElement?.id, document.querySelector('#send')!.shadowRoot!.querySelector('button')!.hasAttribute('data-pressed')])).toEqual(['first', false]);
    await enterIn('second');
    expect(await log(page), '(2) Enter in a native input').toEqual(['click:send', `submit:f[${sent}&intent=send]<button:intent=send>`]);
    expect(await page.evaluate(() => [document.activeElement?.id, document.querySelector('#send')!.shadowRoot!.querySelector('button')!.hasAttribute('data-pressed')])).toEqual(['second', false]);

    // (8) a click listener on the button that cancels it: no submit, from either field.
    await page.locator('#send').evaluate((el) => {
      const cancel = (event: Event) => event.preventDefault();
      el.addEventListener('click', cancel);
      (window as unknown as { uncancel: () => void }).uncancel = () => el.removeEventListener('click', cancel);
    });
    await enterIn('first');
    await enterIn('second');
    expect(await log(page), '(8) click cancelled').toEqual(['click:send', 'click:send']);
    await page.evaluate(() => (window as unknown as { uncancel: () => void }).uncancel());

    // (7) the Tanrei field's action cancelled: no click on the button.
    await page.locator('#first').evaluate((el) => el.addEventListener('action', (event) => event.preventDefault(), { once: true }));
    await enterIn('first');
    expect(await log(page), '(7) action cancelled').toEqual([]);
    // The native input's key cancelled by the page: nothing either.
    await page.locator('#second').evaluate((el) => el.addEventListener('keydown', (event) => event.preventDefault(), { once: true }));
    await enterIn('second');
    expect(await log(page), 'keydown cancelled by the page').toEqual([]);

    // (6) Enter while an input method composes submits nothing: the key is the input method's.
    for (const id of ['first', 'second']) {
      await page.locator(`#${id}`).evaluate((el) => {
        const input = el.shadowRoot?.querySelector('input') ?? el;
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, composed: true, cancelable: true }));
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true, data: '' }));
      });
    }
    expect(await log(page), '(6) composing').toEqual([]);

    // (3) the Button disabled: no click, no submit, from either field.
    await page.locator('#send').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => {
      el.disabled = true;
      await el.updateComplete;
    });
    await enterIn('first');
    await enterIn('second');
    expect(await log(page), '(3) disabled').toEqual([]);

    // (4) a native submit button first and a Button second: the native one is pressed.
    await mountForm(page, `<form id="f">${two(NATIVE + SEND())}</form>`);
    await enterIn('first');
    await enterIn('second');
    const native = ['click:native', `submit:f[${sent}&intent=native]<button:intent=native>`];
    expect(await log(page), '(4) native first').toEqual([...native, ...native]);
    // (5) the Button first and a native one second: the Button is pressed.
    await mountForm(page, `<form id="f">${two(SEND() + NATIVE)}</form>`);
    await enterIn('first');
    await enterIn('second');
    const tanrei = ['click:send', `submit:f[${sent}&intent=send]<button:intent=send>`];
    expect(await log(page), '(5) Button first').toEqual([...tanrei, ...tanrei]);
    // The Button first and disabled: Enter is stopped, and the enabled native button behind it is not pressed.
    await page.locator('#send').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => {
      el.disabled = true;
      await el.updateComplete;
    });
    await enterIn('first');
    await enterIn('second');
    expect(await log(page), 'a disabled Button first').toEqual([]);

    // A Button that names the form from outside it, standing before the form, is its first submit button.
    await mountForm(page, `${SEND('form="f"')}<form id="f">${two(NATIVE)}</form>`);
    await enterIn('first');
    await enterIn('second');
    // Its pair is sent at the button's own place among the form's entries — before the fields here — as the pair of
    // the platform's own button standing there is.
    const before = ['click:send', `submit:f[intent=send&${sent}]<button:intent=send>`];
    expect(await log(page), 'a Button before the form').toEqual([...before, ...before]);

    // A toggle and a link ignore type submit (BTN-33): neither is a default button.
    await mountForm(page, `<form id="f">${two('<tanrei-button id="t" toggle type="submit">Pin</tanrei-button><tanrei-button id="l" href="#x" type="submit">Go</tanrei-button>' + NATIVE)}</form>`);
    await enterIn('first');
    await enterIn('second');
    expect(await log(page), 'a toggle and a link are passed over').toEqual([...native, ...native]);

    // No submit button of either kind: the field and the platform do as they do without one.
    await mountForm(page, `<form id="f">${two('<tanrei-button id="plain">Help</tanrei-button>', '<input name="third" value="c" aria-label="Third" />')}</form>`);
    await enterIn('first');
    expect(await log(page), 'no submit button: the Tanrei field asks the form directly').toEqual([`submit:f[${sent}&third=c]`]);
    await enterIn('second');
    expect(await log(page), 'no submit button: two inputs of the platform’s own, so its input submits nothing').toEqual([]);

    // Enter in a multi-line field is a line break in every case.
    await mountForm(page, `<form id="f"><tanrei-text-field id="lines" name="lines" label="Lines" multiline value="a"></tanrei-text-field><textarea id="area" name="area" aria-label="Area">b</textarea>${SEND()}</form>`);
    for (const id of ['lines', 'area']) {
      await page.locator(`#${id}`).evaluate((el: HTMLElement) => el.focus());
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
    }
    expect(await log(page), 'multi-line').toEqual([]);
    expect(await page.evaluate(() => [(document.querySelector('#lines') as HTMLElement & { value: string }).value.includes('\n'), (document.querySelector('#area') as HTMLTextAreaElement).value.includes('\n')])).toEqual([true, true]);
  });

  test('BTN-30: a form’s default button is drawn no differently from any other Button of its variant', async ({ page }) => {
    await mountForm(page, `<form id="f">${FIELD('first')}<tanrei-button id="send" type="submit">Send</tanrei-button></form><tanrei-button id="twin">Send</tanrei-button>`);
    const look = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const part = el.shadowRoot!.querySelector<HTMLElement>('[part="container"]')!;
        const style = getComputedStyle(part);
        const box = part.getBoundingClientRect();
        return [box.width, box.height, style.color, style.backgroundColor, style.font, style.boxShadow, style.outlineStyle, style.borderTopWidth];
      });
    expect(await look('send')).toEqual(await look('twin'));
  });

  test('BTN-31: the pressed Button’s name and value are sent, once and only for the one pressed — read from the submitter and from FormData alike; the submitter is a button of the platform’s own that is gone after the dispatch, also when a listener throws; a nameless Button adds nothing; a page’s own request carries none', async ({ page }) => {
    await mountForm(
      page,
      `<form id="f" action="/never" method="post" enctype="text/plain" target="_self">${FIELD('title', 'value="Draft"')}
        <tanrei-button id="save" type="submit" name="intent" value="save" formaction="/elsewhere" formmethod="get" formnovalidate formtarget="_blank">Save</tanrei-button>
        <tanrei-button id="publish" type="submit" name="intent" value="publish">Publish</tanrei-button>
        <tanrei-button id="empty" type="submit" name="flag">Flag</tanrei-button>
        <tanrei-button id="nameless" type="submit" value="unused">Send</tanrei-button>
        <tanrei-button id="other" name="intent" value="other">Other</tanrei-button></form>`,
    );
    const before = await page.evaluate(() => (document.querySelector('#f') as HTMLFormElement).elements.length);
    await press(page, 'publish');
    expect(await log(page)).toEqual(['click:publish', 'submit:f[title=Draft&intent=publish]<button:intent=publish>']);
    await press(page, 'save');
    expect(await log(page)).toEqual(['click:save', 'submit:f[title=Draft&intent=save]<button:intent=save>']);
    // An empty value is sent as an empty value; no name, no entry.
    await press(page, 'empty');
    expect(await log(page)).toEqual(['click:empty', 'submit:f[title=Draft&flag=]<button:flag=>']);
    await press(page, 'nameless');
    expect(await log(page)).toEqual(['click:nameless', 'submit:f[title=Draft]<button:=unused>']);
    // Submitted by other means, it carries nothing of any Button.
    await page.evaluate(() => (document.querySelector('#f') as HTMLFormElement).requestSubmit());
    expect(await log(page)).toEqual(['submit:f[title=Draft]']);
    // The submitter lasts no longer than the dispatch: the form holds what it held, and no hidden button is left in it.
    const after = () => page.evaluate(() => [(document.querySelector('#f') as HTMLFormElement).elements.length, document.querySelectorAll('#f > button').length]);
    expect(await after()).toEqual([before, 0]);
    // During the dispatch the submitter is one of the form's controls, and it is not the Tanrei element.
    const during = await page.evaluate(() => {
      const form = document.querySelector('#f') as HTMLFormElement;
      let seen: unknown[] = [];
      form.addEventListener(
        'submit',
        (event) => {
          const submitter = (event as SubmitEvent).submitter as HTMLButtonElement;
          seen = [form.elements.length, submitter.localName, submitter.type, submitter.hidden, submitter.form === form, submitter === document.querySelector('#publish')];
        },
        { once: true },
      );
      (document.querySelector('#publish') as HTMLElement).click();
      return seen;
    });
    expect(during).toEqual([before + 1, 'button', 'submit', true, true, false]);
    await log(page);
    // A listener that throws: the submitter is removed all the same.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(() =>
      document.querySelector('#f')!.addEventListener(
        'submit',
        () => {
          throw new Error('the product’s listener failed');
        },
        { once: true },
      ),
    );
    await press(page, 'publish');
    await expect.poll(() => errors.length).toBe(1);
    expect(await after()).toEqual([before, 0]);
    // How the form is sent is the form's alone: the Button's formaction and its siblings are not read.
    expect(
      await page.evaluate(() => {
        const form = document.querySelector('#f') as HTMLFormElement;
        let seen: unknown[] = [];
        form.addEventListener(
          'submit',
          (event) => {
            const submitter = (event as SubmitEvent).submitter as HTMLButtonElement;
            seen = [submitter.hasAttribute('formaction'), submitter.hasAttribute('formmethod'), submitter.formNoValidate, submitter.hasAttribute('formtarget'), submitter.hasAttribute('formenctype')];
          },
          { once: true },
        );
        (document.querySelector('#save') as HTMLElement).click();
        return seen;
      }),
    ).toEqual([false, false, false, false, false]);
  });

  test('BTN-32: a disabled submit or reset button sends and resets nothing by any means and adds nothing to a submission; in a disabled fieldset a Button of each type is disabled as BTN-2 and BTN-6 say and enabled again at once with it; a link button there is still followed', async ({ page }) => {
    await mountForm(
      page,
      `<form id="f">${FIELD('who', 'value="Ada"')}
        <tanrei-button id="send" type="submit" name="intent" value="send" disabled>Send</tanrei-button>
        <tanrei-button id="clear" type="reset" disabled>Clear</tanrei-button>
        <fieldset id="set" disabled><legend>Set</legend>
          <tanrei-button id="in-plain">Plain</tanrei-button><tanrei-button id="in-submit" type="submit" name="intent" value="in">Send</tanrei-button><tanrei-button id="in-reset" type="reset">Clear</tanrei-button>
          <tanrei-button id="in-link" variant="outlined" href="#followed">Go</tanrei-button>
        </fieldset>
        <tanrei-button id="tail">Tail</tanrei-button></form>
       <tanrei-button id="twin" disabled>Plain</tanrei-button>`,
    );
    // Its own disabled: a pointer, a key and a script's click() emit nothing; Enter in a field of its form submits nothing.
    await page.locator('#send').click({ force: true });
    await page.locator('#clear').click({ force: true });
    await page.evaluate(() => {
      (document.querySelector('#send') as HTMLElement).click();
      (document.querySelector('#clear') as HTMLElement).click();
      document.querySelector('#send')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.locator('#who').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual([]);
    // It adds nothing to a submission made by other means.
    await page.evaluate(() => (document.querySelector('#f') as HTMLFormElement).requestSubmit());
    expect(await log(page)).toEqual(['submit:f[who=Ada]']);

    // Enabled by its own property, it is enabled by that one update: focus can be moved to it at once.
    expect(
      await page.locator('#clear').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => {
        el.disabled = false;
        await el.updateComplete;
        el.focus();
        const enabled = [el.shadowRoot!.querySelector('button')!.disabled, document.activeElement === el];
        el.disabled = true;
        await el.updateComplete;
        return [...enabled, el.shadowRoot!.querySelector('button')!.disabled];
      }),
    ).toEqual([false, true, true]);
    await log(page);

    // In the disabled fieldset: drawn as the disabled button, exposing the disabled state, passed by Tab, emitting nothing.
    const look = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const part = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="container"]')!;
        const style = getComputedStyle(part);
        return { disabled: part.disabled, color: style.color, background: style.backgroundColor, opacity: style.opacity, cursor: style.cursor };
      });
    const disabled = await look('twin');
    expect(disabled.disabled).toBe(true);
    for (const id of ['in-plain', 'in-submit', 'in-reset']) {
      expect(await look(id), id).toEqual(disabled);
      await expect(page.locator(`#${id}`).getByRole('button', { disabled: true }), id).toHaveCount(1);
      expect(await page.locator(`#${id}`).evaluate((el: HTMLElement & { disabled: boolean }) => [el.disabled, el.hasAttribute('disabled'), el.matches(':disabled')]), `${id}: its own property is untouched`).toEqual([false, false, true]);
      await page.locator(`#${id}`).click({ force: true });
      await page.locator(`#${id}`).evaluate((el: HTMLElement) => el.click());
    }
    expect(await log(page)).toEqual([]);
    // Tab from the field passes every disabled Button and stops at the link, which no fieldset disables.
    await page.locator('#who').evaluate((el: HTMLElement) => el.focus());
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('in-link');
    await expect(page.locator('#in-link').getByRole('link')).toHaveAttribute('href', '#followed');
    await expect(page.locator('#in-link').getByRole('link')).not.toHaveAttribute('aria-disabled');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash), 'Enter follows the link').toBe('#followed');
    await page.evaluate(() => (location.hash = ''));
    await page.locator('#in-link').locator('a').click();
    await expect.poll(() => page.evaluate(() => location.hash), 'a pointer follows the link').toBe('#followed');
    await log(page);

    // The fieldset enabled: each is enabled again within the same frame — read before a frame is drawn.
    const enabledAtOnce = await page.evaluate(async () => {
      const ids = ['in-plain', 'in-submit', 'in-reset'];
      const inner = (id: string) => document.querySelector(`#${id}`)!.shadowRoot!.querySelector('button')!;
      let frames = 0;
      const count = () => {
        frames++;
        requestAnimationFrame(count);
      };
      requestAnimationFrame(count);
      (document.querySelector('#set') as HTMLFieldSetElement).disabled = false;
      for (const id of ids) await (document.querySelector(`#${id}`) as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await Promise.resolve();
      for (const id of ids) await (document.querySelector(`#${id}`) as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      return [ids.map((id) => inner(id).disabled), frames];
    });
    expect(enabledAtOnce).toEqual([[false, false, false], 0]);
    await press(page, 'in-submit');
    expect(await log(page)).toEqual(['click:in-submit', 'submit:f[who=Ada&intent=in]<button:intent=in>']);
    // And disabled again with it; a Button's own disabled set and unset inside leaves it disabled by the fieldset.
    await page.evaluate(async () => {
      (document.querySelector('#set') as HTMLFieldSetElement).disabled = true;
      const el = document.querySelector('#in-submit') as HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> };
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      await Promise.resolve();
      await el.updateComplete;
    });
    expect(await look('in-submit')).toEqual(disabled);
    // Disabled by the fieldset and first among the form's enabled submit buttons, it still stops Enter.
    await page.locator('#send').evaluate((el) => el.remove());
    await page.locator('#who').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual([]);
  });

  test('BTN-33: a toggle and a link ignore type submit and reset and stay what they are, each reported once; a type the button does not define behaves as button, submits nothing and is reported; type button ignores form, name and value without a report', async ({ page }) => {
    const seen = warnings(page);
    await mountForm(
      page,
      `<form id="f">${FIELD('who', 'value="Ada"')}
        <tanrei-button id="pin" toggle type="submit" name="intent" value="pin">Pin</tanrei-button>
        <tanrei-button id="unpin" toggle type="reset">Unpin</tanrei-button>
        <tanrei-button id="go" href="#gone" type="submit" name="intent" value="go">Go</tanrei-button>
        <tanrei-button id="typo" type="send" name="intent" value="typo">Send</tanrei-button>
        <tanrei-button id="plain" type="button" form="f" name="intent" value="plain">Plain</tanrei-button>
        <tanrei-button id="real" type="submit" name="real" value="yes">Real</tanrei-button></form>`,
    );
    await page.locator('#pin').evaluate((el) => el.addEventListener('change', () => (window as unknown as { log: string[] }).log.push(`change:${String((el as HTMLElement & { selected: boolean }).selected)}`)));
    // A toggle switches its state and fires change; nothing is submitted or reset.
    await press(page, 'pin');
    await press(page, 'pin');
    await press(page, 'unpin');
    expect(await log(page)).toEqual(['click:pin', 'change:true', 'click:pin', 'change:false', 'click:unpin']);
    // A link is followed; nothing is submitted.
    await page.locator('#go').locator('a').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#gone');
    expect(await log(page)).toEqual(['click:go']);
    // An unknown type: click, no submit — where the platform's own button would submit.
    await press(page, 'typo');
    await press(page, 'typo');
    expect(await log(page)).toEqual(['click:typo', 'click:typo']);
    // type button with form, name and value: nothing, and no entry in a submission another button makes.
    await press(page, 'plain');
    await press(page, 'real');
    expect(await log(page)).toEqual(['click:plain', 'click:real', 'submit:f[who=Ada&real=yes]<button:real=yes>']);
    // None of the four is the form's default button: Enter presses the real one.
    // (The element's own focus(), as above: a composed field passes it to its control.)
    await page.locator('#who').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['click:real', 'submit:f[who=Ada&real=yes]<button:real=yes>']);

    const reports = seen.filter((w) => w.includes('BTN-33'));
    expect(reports.map((w) => w.replace(/^\[tanrei\] <tanrei-button>: | \(BTN-33\).*$/g, '')).sort()).toEqual([
      'a link cannot submit a form; type "submit" is ignored',
      'a toggle cannot reset a form; type "reset" is ignored',
      'a toggle cannot submit a form; type "submit" is ignored',
      'type "send" is not button, submit or reset; it behaves as "button" and submits nothing',
    ]);
    expect(seen.filter((w) => w.includes('BTN-29')), 'a plain button with a form attribute is not reported').toEqual([]);
  });

  test('BTN-29, BTN-31: in a form whose method is dialog, inside the platform’s own dialog, a submit Button closes the dialog with its value, as the platform’s own button does', async ({ page }) => {
    await mountForm(page, `<dialog id="native"><form id="f" method="dialog">${FIELD('who', 'value="Ada"')}<tanrei-button id="ok" type="submit" value="ok">OK</tanrei-button></form></dialog>`);
    await page.evaluate(() => (document.querySelector('#native') as HTMLDialogElement).showModal());
    // The page's log cancels every submit; this form is left to the platform.
    const closed = await page.evaluate(
      () =>
        new Promise<unknown[]>((resolve) => {
          const dialog = document.querySelector('#native') as HTMLDialogElement;
          document.addEventListener('submit', (event) => event.stopImmediatePropagation(), { capture: true, once: true });
          dialog.addEventListener('close', () => resolve([dialog.open, dialog.returnValue]));
          (document.querySelector('#ok') as HTMLElement).click();
        }),
    );
    expect(closed).toEqual([false, 'ok']);
  });

  test('BTN-34: the web is the platform with a form element — type, form, name and value are the element’s, and none of them is a spec prop', async () => {
    const props = (spec as unknown as { props: { name: string }[] }).props.map((p) => p.name);
    for (const name of ['type', 'form', 'name', 'value']) expect(props, name).not.toContain(name);
  });
});

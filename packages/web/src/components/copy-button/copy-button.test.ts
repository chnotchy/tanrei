// <tanrei-copy-button>, driven by specs/copy-button.spec.json: every behaviour id (CPY-1…18) is cited by a test title,
// every fixture has a baseline, and every color, length and time is read back from the tokens — the Button's, since the
// copy button has none of its own but one duration. The copied and failed forms last two seconds after a
// press, which a fixture cannot hold: the tests press with the browser's clipboard replaced by a double, and once with
// the browser's own.
// CPY-20: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, fixturesDocument, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { holdTransitions, stepTransitions } from '../../../test/stepped-transitions.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';

const spec = loadSpec('copy-button');
type P = Page;
const TAG = 'tanrei-copy-button';
const DURATION = '--tanrei-comp-copy-button-confirmation-duration';
const B = (name: string) => `--tanrei-comp-button-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** The Button it is drawn by, and that Button's native button. */
const drawnBy = (page: P, id: string) => host(page, id).locator('tanrei-button');
const native = (page: P, id: string) => drawnBy(page, id).locator('button');
const glyph = (page: P, id: string) => host(page, id).locator('.glyph');
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const WORDS = { label: 'Copy', copiedLabel: 'Copied', failedLabel: 'Could not copy' };
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** The glyph it shows, the form it is in, and what its two live regions hold. */
const shows = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    return {
      glyph: root.querySelector('.ink')!.textContent,
      form: root.querySelector('tanrei-button')!.getAttribute('data-form'),
      status: root.querySelector('[role="status"]')!.textContent,
      alert: root.querySelector('[role="alert"]')!.textContent,
    };
  });

/**
 * The browser's clipboard replaced by a double (CPY-3's verify): it records what it was asked to write, and answers as
 * `answer` says — at once, or (`held`) only when the test calls `release()`. It can never be read.
 */
async function double(page: P, answer: 'writes' | 'refuses' | 'held' = 'writes') {
  await page.evaluate((mode) => {
    const w = window as unknown as { __clipboard: { writes: string[]; reads: number; mode: string; release: (() => void)[] } };
    w.__clipboard = { writes: [], reads: 0, mode, release: [] };
    const clipboard = {
      writeText(text: string) {
        w.__clipboard.writes.push(text);
        if (w.__clipboard.mode === 'held') return new Promise<void>((resolve) => w.__clipboard.release.push(resolve));
        return w.__clipboard.mode === 'writes' ? Promise.resolve() : Promise.reject(new DOMException('The request is not allowed.', 'NotAllowedError'));
      },
      readText() {
        w.__clipboard.reads++;
        return Promise.resolve('');
      },
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => clipboard });
  }, answer);
}
const clipboard = (page: P) => page.evaluate(() => (window as unknown as { __clipboard: { writes: string[]; reads: number } }).__clipboard);
const answers = (page: P, mode: 'writes' | 'refuses') => page.evaluate((m) => ((window as unknown as { __clipboard: { mode: string } }).__clipboard.mode = m), mode);
const release = (page: P) => page.evaluate(() => (window as unknown as { __clipboard: { release: (() => void)[] } }).__clipboard.release.splice(0).forEach((resolve) => resolve()));

/** Records the element's two events, and every announcement a live region is given. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const w = window as unknown as { __events: { type: string; detail: unknown; bubbles: boolean }[]; __said: { role: string; text: string }[] };
    w.__events = [];
    w.__said = [];
    // Once per element: a second call starts the two records again.
    if ((el as unknown as { __listening?: boolean }).__listening) return;
    (el as unknown as { __listening?: boolean }).__listening = true;
    for (const type of ['copied', 'copyfailed']) {
      el.addEventListener(type, (event) => {
        const detail = (event as CustomEvent).detail as { text?: string; reason?: unknown };
        w.__events.push({ type, detail: 'text' in detail ? detail : { reason: String((detail.reason as Error)?.name ?? detail.reason) }, bubbles: event.bubbles });
      });
    }
    for (const region of el.shadowRoot!.querySelectorAll('.live')) {
      new MutationObserver(() => {
        if (region.textContent) w.__said.push({ role: region.getAttribute('role')!, text: region.textContent });
      }).observe(region, { childList: true, characterData: true, subtree: true });
    }
  });
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: { type: string; detail: unknown; bubbles: boolean }[] }).__events);
const said = (page: P) => page.evaluate(() => (window as unknown as { __said: { role: string; text: string }[] }).__said);
const setDuration = (page: P, value: string) => rootTokens(page, { [DURATION]: value });
const press = (page: P, id: string) => native(page, id).click();
/** A custom property's value as the given CSS property computes it. */
const resolveAs = (page: P, property: string, name: string) =>
  page.evaluate(([p, n]) => {
    const probe = document.createElement('div');
    probe.style.setProperty(p, `var(${n})`);
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).getPropertyValue(p);
    probe.remove();
    return value;
  }, [property, name] as const);

test.describe('drawn by Button', () => {
  test('CPY-1: it is a Button of its variant and size, drawn from the Button’s own tokens — its container, its glyph, its hit area — icon-only with content_copy, or with that glyph leading and label as its text; it has no color, shape or measure of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const [id, variant] of [['icon', 'text'], ['icon-tonal', 'tonal'], ['icon-outlined', 'outlined'], ['icon-elevated', 'elevated'], ['icon-filled', 'filled']] as const) {
      expect(await drawnBy(page, id).getAttribute('variant'), id).toBe(variant);
      expect(await css(native(page, id), 'background-color'), id).toBe(await resolveColor(page, B(`${variant}-container-color`)));
      expect(await css(drawnBy(page, id).locator('.icon'), 'color'), id).toBe(await resolveColor(page, B(`${variant}-icon-color`)));
    }
    for (const [id, size] of [['icon-small', 'small'], ['icon', 'medium'], ['icon-large', 'large']] as const) {
      const b = await box(native(page, id));
      const height = await resolveToken(page, B(`container-height-${size}`));
      // Icon-only: as wide as it is high (BTN-12), and the glyph in the Button's icon box.
      expect([b.width, b.height], id).toEqual([height, height]);
      expect((await shows(page, id)).glyph, id).toBe('content_copy');
      expect((await box(glyph(page, id))).width, id).toBeCloseTo((await box(drawnBy(page, id).locator('.icon'))).width, 1);
      await expect(host(page, id).locator('.labels'), id).toHaveCount(0);
      // The same element a product's own icon-only Button is: the same box as one written by hand.
      expect(await host(page, id).evaluate((el) => getComputedStyle(el).display)).toBe('inline-flex');
    }
    // The hit area is the Button's (BTN-5): at least the pointer target, though a small one is drawn 32 high.
    const target = await native(page, 'icon-small').evaluate((el) => {
      const r = getComputedStyle(el, '::before');
      return Math.min(Number.parseFloat(r.width), Number.parseFloat(r.height));
    });
    expect(target).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-pointer'));
    // Labelled: the glyph leading, then the label as its text, in the Button's label style.
    const [g, l] = [await box(glyph(page, 'labelled')), await box(host(page, 'labelled').locator('.labels .shown'))];
    expect(g.x + g.width).toBeLessThanOrEqual(l.x);
    await expect(host(page, 'labelled').locator('.labels .shown')).toHaveText('Copy JSON');
    expect(await css(native(page, 'labelled-tonal'), 'background-color')).toBe(await resolveColor(page, B('tonal-container-color')));
    expect((await box(native(page, 'labelled-outlined-large'))).height).toBe(await resolveToken(page, B('container-height-large')));
    // No color, shape or measure of its own: the stylesheet names its times only — the duration, and the motion of a
    // fitting label's width (CPY-19).
    const tokens = await host(page, 'icon').evaluate((el) => [...((el.constructor as unknown as { styles: { cssText: string } }).styles.cssText.matchAll(/--tanrei-[a-z0-9-]+/g))].map((m) => m[0]));
    expect([...new Set(tokens)].sort()).toEqual([DURATION, '--tanrei-comp-copy-button-motion-resize-duration', '--tanrei-comp-copy-button-motion-resize-easing'].sort());
  });

  test('CPY-12: a press — a click, Enter, Space — is shown as pressed without delay and for at least sys.motion.duration.press-hold, by the Button', async ({ page }) => {
    for (const activate of ['click', 'Enter', 'Space'] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: only('icon-filled') });
      await double(page);
      // Longer than any driver's press, so every press below is the short one (as the Button's own test does).
      await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '600ms' });
      await native(page, 'icon-filled').focus();
      // What the press looks like the moment an observer hears of it: the transition into the pressed tokens.
      await native(page, 'icon-filled').evaluate((el) => {
        const w = window as unknown as { __press: { transition?: string } };
        w.__press = {};
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) w.__press.transition ??= getComputedStyle(el).transitionDuration;
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      });
      await watchPress(native(page, 'icon-filled'));
      if (activate === 'click') await press(page, 'icon-filled');
      else await page.keyboard.press(activate);
      // Shown in the turn of the event that pressed, and there for press-hold from that event on — not from the moment
      // an observer heard of it, which is later by what the Button did in between (test/watched-press.ts).
      const seen = await expectPressShownAndHeld(page, 600, activate);
      expect(seen.feedback, activate).toBe('overlay');
      // Without delay: the pressed tokens, with no transition in.
      expect(await page.evaluate(() => (window as unknown as { __press: { transition?: string } }).__press.transition), activate).toBe('0s');
      expect((await clipboard(page)).writes, activate).toEqual(['#30a3f0']);
    }
  });

  test('CPY-13: the press is answered as sys.behavior.pressed-feedback names — overlay in the default system, ripple under m3-like, dim under cupertino — by the Button, from the Button’s motion tokens', async ({ page }) => {
    for (const [system, feedback] of [[undefined, 'overlay'], ['m3-like', 'ripple'], ['cupertino', 'dim']] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: only('icon-filled'), ...(system ? { system } : {}) });
      await double(page);
      expect((await css(host(page, 'icon-filled'), '--tanrei-sys-behavior-pressed-feedback')).trim(), String(system)).toBe(feedback);
      await native(page, 'icon-filled').hover();
      await page.mouse.down();
      await expect.poll(() => native(page, 'icon-filled').getAttribute('data-pressed'), String(system)).toBe(feedback);
      if (feedback === 'ripple') await expect(drawnBy(page, 'icon-filled').locator('.ripple')).toHaveCount(1);
      if (feedback === 'dim') expect(Number(await css(native(page, 'icon-filled'), 'opacity'))).toBeLessThan(1);
      await page.mouse.up();
    }
  });

  test('CPY-14: its corners are the Button’s, eased by sys.shape.corner-smoothing, and its keyboard focus is drawn as sys.behavior.focus-style names — a ring in the default system, a glow under a system that chooses it; a pointer shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'icon-filled') });
    await double(page);
    expect(await native(page, 'icon').evaluate((el) => el.hasAttribute('data-tanrei-shape'))).toBe(true);
    await press(page, 'icon-filled');
    expect(await css(native(page, 'icon-filled'), 'outline-style')).toBe('none');
    await tabTo(page, host(page, 'icon'));
    expect(await css(native(page, 'icon'), 'outline-style')).toBe('solid');
    expect(await css(native(page, 'icon'), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // acme chooses the glow, and eases its corners.
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon'), system: 'acme', systemCss: await acmeSystemCss() });
    expect((await css(host(page, 'icon'), '--tanrei-sys-behavior-focus-style')).trim()).toBe('glow');
    await tabTo(page, host(page, 'icon'));
    expect(await native(page, 'icon').getAttribute('data-focus-style')).toBe('glow');
    expect(await native(page, 'icon').evaluate((el) => getComputedStyle(el, '::after').boxShadow)).not.toBe('none');
  });
});

test.describe('copying', () => {
  test('CPY-2: an activation — pointer, Enter, Space, a script’s click — asks the platform to write text exactly as given, never reads the clipboard, moves no focus, shows nothing before the platform answers, and ignores a second activation until it has', async ({ page }) => {
    const text = '  a\ttab, a "quote" &amp; two\nlines  ';
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('t', { text, ...WORDS })] });
    await double(page, 'held');
    await listen(page, 't');
    await native(page, 't').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await clipboard(page)).writes).toEqual([text]);
    // Asked, not answered: still at rest, nothing emitted, nothing said.
    await page.waitForTimeout(150);
    expect(await shows(page, 't')).toEqual({ glyph: 'content_copy', form: 'rest', status: '', alert: '' });
    expect(await events(page)).toEqual([]);
    // A second activation before the answer is ignored.
    await page.keyboard.press('Space');
    await host(page, 't').evaluate((el) => (el as HTMLElement).click());
    expect((await clipboard(page)).writes).toEqual([text]);
    await release(page);
    await expect.poll(async () => (await shows(page, 't')).form).toBe('copied');
    expect(await events(page)).toEqual([{ type: 'copied', detail: { text }, bubbles: true }]);
    // Focus stayed on the button, and the clipboard was never read.
    expect(await host(page, 't').evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('tanrei-button');
    expect((await clipboard(page)).reads).toBe(0);
    // Space, a pointer and a script's click are activations too.
    await answers(page, 'writes');
    await page.keyboard.press('Space');
    await press(page, 't');
    await host(page, 't').evaluate((el) => (el as HTMLElement).click());
    await expect.poll(async () => (await clipboard(page)).writes.length).toBe(4);
  });

  test('CPY-3: when the platform confirms, the glyph is check in the same box and color, copied is emitted once with the text, and it returns to rest comp.copy-button.confirmation.duration after it took the form — not before', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await double(page);
    const duration = await resolveToken(page, DURATION, 'duration');
    expect(duration).toBe(2000);
    // The duration runs on the page's clock, held still and moved on by the test: no time passes between two steps.
    await holdClock(page);
    for (const id of ['icon', 'labelled']) {
      await listen(page, id);
      const before = { box: await box(glyph(page, id)), color: await css(glyph(page, id), 'color') };
      await press(page, id);
      await expect.poll(async () => (await shows(page, id)).glyph, id).toBe('check');
      expect({ box: await box(glyph(page, id)), color: await css(glyph(page, id), 'color') }, id).toEqual(before);
      expect(await events(page), id).toEqual([{ type: 'copied', detail: { text: String(fixture(id).props.text) }, bubbles: true }]);
      if (id === 'labelled') await expect(host(page, id).locator('.labels .shown')).toHaveText('Copied');
      // The clock, moved on to one millisecond short of the token's value: still copied; at it: at rest.
      await page.clock.runFor(duration - 1);
      expect((await shows(page, id)).form, id).toBe('copied');
      await page.clock.runFor(1);
      await expect.poll(async () => (await shows(page, id)).glyph, id).toBe('content_copy');
      if (id === 'labelled') await expect(host(page, id).locator('.labels .shown')).toHaveText('Copy JSON');
      expect((await events(page)).length, id).toBe(1);
    }
    // The time is the token's: a system that sets another is followed.
    await setDuration(page, '500ms');
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(499);
    expect((await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(1);
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('rest');
  });

  test('CPY-4: when the platform refuses, or has no clipboard, the glyph is error and copyfailed is emitted once, and it returns to rest after the duration; it selects nothing and opens nothing; with no text it copies nothing, fails, and reports', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('icon', 'labelled'), fx('empty', { text: '', ...WORDS })] });
    await setDuration(page, '400ms');
    await double(page, 'refuses');
    for (const id of ['icon', 'labelled']) {
      await listen(page, id);
      await press(page, id);
      await expect.poll(async () => (await shows(page, id)).glyph, id).toBe('error');
      expect(await events(page), id).toEqual([{ type: 'copyfailed', detail: { reason: 'NotAllowedError' }, bubbles: true }]);
      if (id === 'labelled') await expect(host(page, id).locator('.labels .shown')).toHaveText('Could not copy');
      // Nothing else by itself: no selection, no dialog, no popover, no second way.
      expect(await page.evaluate(() => [String(getSelection()), document.querySelectorAll('dialog, [popover]').length])).toEqual(['', 0]);
      await expect.poll(async () => (await shows(page, id)).form, id).toBe('rest');
      expect((await events(page)).length, id).toBe(1);
    }
    // No clipboard to write to (a page that is not secure).
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined }));
    await listen(page, 'icon');
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).glyph).toBe('error');
    expect((await events(page)).map((e) => e.type)).toEqual(['copyfailed']);
    // Nothing to copy.
    await double(page);
    await listen(page, 'empty');
    await press(page, 'empty');
    await expect.poll(async () => (await shows(page, 'empty')).glyph).toBe('error');
    expect((await events(page)).map((e) => e.type)).toEqual(['copyfailed']);
    expect((await clipboard(page)).writes).toEqual([]);
    expect(seen.filter((w) => w.includes('CPY-4') && w.includes('nothing to copy'))).toHaveLength(1);
  });

  test('CPY-2, CPY-4: the browser’s own clipboard — a person’s press on a secure page copies and is confirmed; a copy the browser refuses (the permission denied, or a page that is not secure) is a failure', async ({ page, context, browserName }) => {
    // A secure page of the fixture: the Clipboard API exists only there.
    const document = await fixturesDocument(spec, { icons: true, fixtures: only('icon') });
    await page.route('https://copy.test/**', (route) => route.fulfill({ contentType: 'text/html', body: document }));
    await page.goto('https://copy.test/');
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    expect(await page.evaluate(() => window.isSecureContext && typeof navigator.clipboard?.writeText === 'function')).toBe(true);
    const text = String(fixture('icon').props.text);
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://copy.test' });
    await listen(page, 'icon');
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    expect(await events(page)).toEqual([{ type: 'copied', detail: { text }, bubbles: true }]);
    // Chromium lets the page read it back with the permission granted.
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
    // Refused, by the person's own press. Chromium: a page whose permissions policy denies the clipboard (the
    // permission denied). Every engine: a page that is not secure, which has no clipboard to write to.
    const refusing: [string, Record<string, string>][] = [['http://insecure.test/', {}]];
    if (browserName === 'chromium') refusing.push(['https://denied.test/', { 'Permissions-Policy': 'clipboard-write=()' }]);
    for (const [url, headers] of refusing) {
      await page.route(`${url}**`, (route) => route.fulfill({ contentType: 'text/html', headers, body: document }));
      await page.goto(url);
      await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
      expect(await page.evaluate(() => typeof navigator.clipboard?.writeText === 'function'), url).toBe(url.startsWith('https'));
      await listen(page, 'icon');
      await press(page, 'icon');
      await expect.poll(async () => (await shows(page, 'icon')).form, url).toBe('failed');
      expect((await events(page)).map((e) => e.type), url).toEqual(['copyfailed']);
      expect((await shows(page, 'icon')).alert, url).toBe('Could not copy');
    }
  });

  test('CPY-5: copiedLabel is announced once, politely, and failedLabel once, assertively, through a live region; every activation is announced anew — two presses within the duration are two announcements — focus does not move, and nothing is said on the return to rest', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon') });
    await double(page);
    await listen(page, 'icon');
    // The regions: read, never drawn — and empty at rest.
    const regions = await host(page, 'icon').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.live')].map((r) => [r.getAttribute('role'), r.textContent, getComputedStyle(r).clipPath]));
    expect(regions).toEqual([['status', '', 'inset(50%)'], ['alert', '', 'inset(50%)']]);
    await native(page, 'icon').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => said(page)).toEqual([{ role: 'status', text: 'Copied' }]);
    // Again, a moment later: the same words, announced a second time.
    await page.keyboard.press('Enter');
    await expect.poll(() => said(page)).toEqual([{ role: 'status', text: 'Copied' }, { role: 'status', text: 'Copied' }]);
    expect(await host(page, 'icon').evaluate((el) => el.matches(':focus-within') && el.shadowRoot!.activeElement?.localName)).toBe('tanrei-button');
    // A failure is assertive.
    await answers(page, 'refuses');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await said(page)).at(-1)).toEqual({ role: 'alert', text: 'Could not copy' });
    expect((await shows(page, 'icon')).status).toBe('');
    // The return to rest says nothing: the regions are emptied, and no announcement is added.
    await setDuration(page, '200ms');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await said(page)).length).toBe(4);
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('rest');
    expect(await shows(page, 'icon')).toMatchObject({ status: '', alert: '' });
    expect((await said(page)).length).toBe(4);
  });

  test('CPY-6: icon-only, it is named by label in every form; labelled, it is named by the text it shows; the glyph is kept from assistive technology in every form', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await double(page);
    for (const mode of ['writes', 'refuses'] as const) {
      await answers(page, mode);
      const [form, glyphName, words] = mode === 'writes' ? ['copied', 'check', 'Copied'] : ['failed', 'error', 'Could not copy'];
      await press(page, 'icon');
      await press(page, 'labelled');
      await expect.poll(async () => (await shows(page, 'labelled')).form).toBe(form);
      await expect(stage(page, 'icon').getByRole('button', { name: 'Copy', exact: true })).toHaveCount(1);
      await expect(stage(page, 'labelled').getByRole('button', { name: words, exact: true })).toHaveCount(1);
      for (const id of ['icon', 'labelled']) {
        expect(await glyph(page, id).evaluate((el) => (el.assignedSlot!.closest('[aria-hidden="true"]') ? 'hidden' : 'exposed')), id).toBe('hidden');
        expect(await stage(page, id).getByRole('button').ariaSnapshot(), id).not.toContain(glyphName);
      }
    }
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await expect(stage(page, 'icon').getByRole('button', { name: 'Copy', exact: true })).toHaveCount(1);
    await expect(stage(page, 'labelled').getByRole('button', { name: 'Copy JSON', exact: true })).toHaveCount(1);
  });

  test('CPY-7: nothing moves or resizes when it changes form — the button’s box, the glyph’s and the label’s are equal at rest, copied and failed, the label’s box as wide as the widest of the three texts with the shown text at its start — and it opens no surface of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('labelled-long-confirmation', 'icon', 'labelled-rtl') });
    await double(page);
    for (const id of ['labelled-long-confirmation', 'icon', 'labelled-rtl']) {
      const read = async () => ({ button: await box(native(page, id)), glyph: await box(glyph(page, id)), host: await box(host(page, id)), labels: id === 'icon' ? null : await box(host(page, id).locator('.labels')) });
      const rest = await read();
      await answers(page, 'writes');
      await press(page, id);
      await expect.poll(async () => (await shows(page, id)).form, id).toBe('copied');
      expect(await read(), `${id} copied`).toEqual(rest);
      await answers(page, 'refuses');
      await press(page, id);
      await expect.poll(async () => (await shows(page, id)).form, id).toBe('failed');
      expect(await read(), `${id} failed`).toEqual(rest);
    }
    // The widest of the three is what the box holds: "Copied to the clipboard", though "Copy" is shown.
    const widths = await host(page, 'labelled-long-confirmation').evaluate((el) => {
      const labels = el.shadowRoot!.querySelector('.labels')!;
      return { box: labels.getBoundingClientRect().width, texts: [...labels.children].map((child) => child.getBoundingClientRect().width), start: labels.getBoundingClientRect().left - labels.querySelector('.shown')!.getBoundingClientRect().left };
    });
    expect(widths.box).toBeCloseTo(Math.max(...widths.texts), 1);
    expect(widths.texts[1]).toBeGreaterThan(widths.texts[0] * 2);
    expect(widths.start).toBeCloseTo(0, 1);
    // No popover or other surface but the confirmation of CPY-18: its shadow root holds the Tooltip around the Button,
    // the two regions and the probe of the duration; a labelled copy button never opens its Tooltip.
    expect(await host(page, 'icon').evaluate((el) => [...el.shadowRoot!.children].map((child) => child.localName).filter((name) => name !== 'style'))).toEqual(['tanrei-tooltip', 'span', 'span', 'span']);
    expect(await page.locator('tanrei-tooltip tanrei-tooltip, dialog').count()).toBe(0);
    for (const id of ['labelled-long-confirmation', 'labelled-rtl']) expect(await host(page, id).locator('tanrei-tooltip').getAttribute('open'), id).toBeNull();
  });

  test('CPY-18: icon-only, the copied and the failed form show their words above the button as a plain Tooltip for as long as the form lasts — no focus taken, no room, not read a second time, closed by Escape, shown anew on the next answer; hover and focus open nothing; labelled, no bubble', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await double(page);
    await holdClock(page);
    const duration = await resolveToken(page, DURATION, 'duration');
    const bubble = (id: string) => host(page, id).locator('tanrei-tooltip');
    const surface = (id: string) => bubble(id).locator('.surface');
    const open = (id: string) => surface(id).evaluate((el) => el.matches(':popover-open'));
    // Hover and keyboard focus at rest open nothing: it is no tooltip of the button's name.
    await native(page, 'icon').hover();
    await page.clock.runFor(2000);
    expect(await open('icon')).toBe(false);
    await tabTo(page, native(page, 'icon'));
    await page.clock.runFor(2000);
    expect(await open('icon')).toBe(false);
    const rest = { button: await box(native(page, 'icon')), host: await box(host(page, 'icon')) };
    await page.keyboard.press('Enter');
    await expect.poll(() => open('icon')).toBe(true);
    await expect(bubble('icon').locator('.text')).toHaveText('Copied');
    // Drawn as a plain Tooltip draws itself: its container color, placed as a tooltip places itself — above the button,
    // or below where the stage leaves no room above — and never over it.
    expect(await bubble('icon').getAttribute('variant')).not.toBe('rich');
    const [above, button] = [await box(bubble('icon').locator('.bubble')), await box(native(page, 'icon'))];
    expect(above.y + above.height <= button.y + 0.5 || above.y >= button.y + button.height - 0.5).toBe(true);
    expect(await css(bubble('icon').locator('.bubble'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-tooltip-plain-container-color'));
    // No focus taken, nothing moved, and hidden from assistive technology: CPY-5's region is what is heard.
    expect(await native(page, 'icon').evaluate((el) => el.matches(':focus'))).toBe(true);
    expect({ button: await box(native(page, 'icon')), host: await box(host(page, 'icon')) }).toEqual(rest);
    expect(await surface('icon').getAttribute('aria-hidden')).toBe('true');
    expect(await native(page, 'icon').getAttribute('aria-description')).toBeNull();
    // Leaving the button does not close it; the return to rest does.
    await page.mouse.move(0, 0);
    await page.clock.runFor(duration - 1);
    expect(await open('icon')).toBe(true);
    await page.clock.runFor(1);
    await expect.poll(() => open('icon')).toBe(false);
    // Failed: its words. Escape closes it at once; the next answer shows it anew.
    await answers(page, 'refuses');
    await page.keyboard.press('Enter');
    await expect.poll(() => open('icon')).toBe(true);
    await expect(bubble('icon').locator('.text')).toHaveText('Could not copy');
    await page.keyboard.press('Escape');
    await expect.poll(() => open('icon')).toBe(false);
    expect((await shows(page, 'icon')).form).toBe('failed');
    await answers(page, 'writes');
    await page.keyboard.press('Enter');
    await expect.poll(() => open('icon')).toBe(true);
    await expect(bubble('icon').locator('.text')).toHaveText('Copied');
    // Labelled: the label says it, and no bubble opens.
    await press(page, 'labelled');
    await expect.poll(async () => (await shows(page, 'labelled')).form).toBe('copied');
    expect(await open('labelled')).toBe(false);
  });

  test('CPY-8: activated while copied or failed, it copies again and takes the form the new answer gives, emits and announces it, and counts the duration from that moment', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon') });
    await double(page);
    await listen(page, 'icon');
    const duration = await resolveToken(page, DURATION, 'duration');
    // The duration runs on the page's clock, held still and moved on by the test: no time passes between two steps.
    await holdClock(page);
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(duration - 1);
    // Pressed again, and this time refused: the failed form, from now.
    await answers(page, 'refuses');
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('failed');
    expect((await events(page)).map((e) => e.type)).toEqual(['copied', 'copyfailed']);
    expect(await said(page)).toEqual([{ role: 'status', text: 'Copied' }, { role: 'alert', text: 'Could not copy' }]);
    // The first press's time has long passed; the second's has not, by one millisecond.
    await page.clock.runFor(duration - 1);
    expect((await shows(page, 'icon')).form).toBe('failed');
    // And from failed back to copied.
    await answers(page, 'writes');
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(duration - 1);
    expect((await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(1);
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('rest');
    expect((await clipboard(page)).writes.length).toBe(3);
  });

  test('CPY-9: the glyph and the text change at once, without a motion, both ways; the duration is not shortened where motion is reduced; and a text that changes while it shows copied returns it to rest at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await double(page);
    const duration = await resolveToken(page, DURATION, 'duration');
    expect(duration).toBe(2000);
    // The duration runs on the page's clock, held still and moved on by the test: no time passes between two steps.
    await holdClock(page);
    for (const part of [glyph(page, 'icon'), host(page, 'labelled').locator('.labels .shown')]) {
      expect(await part.evaluate((el) => [getComputedStyle(el).transitionDuration, el.getAnimations().length])).toEqual(['0s', 0]);
    }
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    expect(await glyph(page, 'icon').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await page.clock.runFor(duration - 1);
    expect((await shows(page, 'icon')).form).toBe('copied');
    await page.clock.runFor(1);
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('rest');
    // What was copied is no longer what would be.
    await press(page, 'labelled');
    await expect.poll(async () => (await shows(page, 'labelled')).form).toBe('copied');
    await host(page, 'labelled').evaluate((el) => ((el as unknown as { text: string }).text = '{ "name": "other" }'));
    await expect.poll(async () => (await shows(page, 'labelled')).form).toBe('rest');
    expect(await shows(page, 'labelled')).toMatchObject({ glyph: 'content_copy', status: '' });
    await press(page, 'labelled');
    await expect.poll(async () => (await clipboard(page)).writes.at(-1)).toBe('{ "name": "other" }');
  });

  test('CPY-19: with labelWidth fit, the label’s box is as wide as the text it shows; a change of form eases the width over the resize motion, keeping the height, the glyph and the start of the text, and at once where motion is reduced; the default, widest, never changes it', async ({ page }) => {
    const RESIZE = '--tanrei-comp-copy-button-motion-resize';
    await mountFixtures(page, spec, { icons: true, fixtures: only('labelled-fit', 'labelled-long-confirmation') });
    await double(page);
    const id = 'labelled-fit';
    const duration = await resolveToken(page, `${RESIZE}-duration`, 'duration');
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBe(await resolveToken(page, '--tanrei-sys-motion-role-resize-default', 'duration'));
    const easing = await resolveAs(page, 'transition-timing-function', `${RESIZE}-easing`);
    expect(easing).toBe(await resolveAs(page, 'transition-timing-function', '--tanrei-sys-motion-easing-spatial'));
    const labels = host(page, id).locator('.labels');
    expect(await css(labels, 'transition-property')).toBe('inline-size');
    expect(Number.parseFloat(await css(labels, 'transition-duration')) * 1000).toBe(duration);
    expect(await css(labels, 'transition-timing-function')).toBe(easing);
    expect(await host(page, id).getAttribute('label-width')).toBe('fit');
    /** The label box's width, and the widths of the three texts. */
    const widths = () =>
      host(page, id).evaluate((el) => {
        const box = el.shadowRoot!.querySelector('.labels')!;
        return { box: box.getBoundingClientRect().width, texts: [...box.children].map((child) => child.getBoundingClientRect().width) };
      });
    // At rest it is as wide as "Copy", narrower than the default's box for the same words.
    const rest = await widths();
    expect(rest.box).toBeCloseTo(rest.texts[0], 1);
    expect(rest.texts[1]).toBeGreaterThan(rest.texts[0] * 2);
    const button = await box(native(page, id));
    // The same words, outlined and medium, in the default's box: wider by what "Copied to the clipboard" adds to "Copy".
    expect((await box(native(page, 'labelled-long-confirmation'))).width - button.width).toBeCloseTo(rest.texts[1] - rest.texts[0], 0);
    const glyphAt = await box(glyph(page, id));
    // Copied: it widens through widths in between to the width of "Copied to the clipboard"; the height, the glyph and
    // the start of the text stay where they were. The width's motion is held at its start as the press begins it and
    // read at tenths of its duration (`stepTransitions`): the same moments on any machine, however late it draws. The
    // confirmation's duration runs on the page's clock, held still until the reduced motion below: a form that ended on
    // the way would start a motion back to rest in the middle of the readings.
    await holdClock(page);
    /** A press that waits for no frame (a locator's click waits for two, and the held clock holds them). */
    const activate = () => host(page, id).evaluate((el) => (el.shadowRoot!.querySelector('tanrei-button') as HTMLElement).click());
    await holdTransitions(labels, ['inline-size', 'width']);
    await activate();
    const { held, moments, rest: copied } = await stepTransitions(labels, () =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const b = root.querySelector('tanrei-button')!.shadowRoot!.querySelector('button')!.getBoundingClientRect();
        return { width: root.querySelector('.labels')!.getBoundingClientRect().width, height: b.height, glyph: root.querySelector('.glyph')!.getBoundingClientRect().left, start: root.querySelector('.labels .shown')!.getBoundingClientRect().left };
      }),
    );
    // One motion, of the label box's width, over the resize motion.
    expect(held.map(({ on, duration }) => [on, duration])).toEqual([['span.labels', duration]]);
    const samples = [...moments, copied];
    expect((await shows(page, id)).form).toBe('copied');
    expect(samples.some((s) => s.width > rest.texts[0] + 1 && s.width < rest.texts[1] - 1)).toBe(true);
    expect(samples.at(-1)!.width).toBeCloseTo(rest.texts[1], 1);
    expect(new Set(samples.map((s) => s.height))).toEqual(new Set([button.height]));
    expect(new Set(samples.map((s) => Math.round(s.glyph * 100) / 100))).toEqual(new Set([Math.round(glyphAt.x * 100) / 100]));
    // While the box is narrower than the text, the text is clipped at its end, on one line.
    expect(await css(labels, 'overflow-x')).toBe('clip');
    expect(await css(host(page, id).locator('.labels .shown'), 'white-space')).toBe('nowrap');
    // Failed: the width follows "Could not copy".
    await answers(page, 'refuses');
    await activate();
    await expect.poll(async () => (await shows(page, id)).form).toBe('failed');
    await expect.poll(async () => (await widths()).box).toBeCloseTo(rest.texts[2], 1);
    // New words for the form shown: the width follows them too.
    await host(page, id).evaluate((el) => ((el as unknown as { failedLabel: string }).failedLabel = 'No'));
    await expect.poll(async () => { const w = await widths(); return w.box - w.texts[2]; }).toBeCloseTo(0, 1);
    await host(page, id).evaluate((el) => ((el as unknown as { failedLabel: string }).failedLabel = 'Could not copy'));
    await releaseClock(page);

    // Where motion is reduced, each width is reached at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(labels, 'transition-duration')).toBe('0s');
    await answers(page, 'writes');
    await press(page, id);
    await expect.poll(async () => (await shows(page, id)).form).toBe('copied');
    expect((await widths()).box).toBeCloseTo(rest.texts[1], 1);
    expect(await labels.evaluate((el) => el.getAnimations().length)).toBe(0);

    // Back to widest (the default): the box holds the widest text again, and keeps it in every form.
    await host(page, id).evaluate((el) => ((el as unknown as { labelWidth: string }).labelWidth = 'widest'));
    await expect.poll(async () => (await widths()).box).toBeCloseTo(rest.texts[1], 1);
    expect(await labels.evaluate((el) => el.style.inlineSize)).toBe('');
    expect(await host(page, 'labelled-long-confirmation').evaluate((el) => (el as unknown as { labelWidth: string }).labelWidth)).toBe('widest');
  });

  test('CPY-19: a fitting label’s first width is taken at once, and so is a width a new face gives; icon-only ignores it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('labelled-fit'), fx('icon-fit', { labelWidth: 'fit', text: 'x', ...WORDS })] });
    const id = 'labelled-fit';
    const labels = host(page, id).locator('.labels');
    // No animation brought it to its width.
    expect(await labels.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await labels.evaluate((el) => el.getBoundingClientRect().width - el.children[0].getBoundingClientRect().width)).toBeCloseTo(0, 1);
    // A wider text face arrives: the box takes the text's new width at once.
    await host(page, id).evaluate((el) => {
      const shown = el.shadowRoot!.querySelector<HTMLElement>('.labels .shown')!;
      shown.style.letterSpacing = '4px';
    });
    await expect.poll(async () => labels.evaluate((el) => el.getBoundingClientRect().width - el.children[0].getBoundingClientRect().width)).toBeCloseTo(0, 1);
    expect(await labels.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(host(page, 'icon-fit').locator('.labels')).toHaveCount(0);
  });

  test('CPY-10: disabled, it is drawn and exposed as a disabled Button, copies nothing and emits nothing; becoming disabled while it shows a confirmation returns it to rest at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon-disabled', 'labelled-disabled', 'icon') });
    await double(page);
    for (const id of ['icon-disabled', 'labelled-disabled']) {
      await listen(page, id);
      await expect(stage(page, id).getByRole('button'), id).toBeDisabled();
      expect(await css(drawnBy(page, id).locator('.icon'), 'color'), id).toBe(await resolveColor(page, B('text-disabled-icon-color')));
      await native(page, id).click({ force: true });
      await host(page, id).evaluate((el) => (el as HTMLElement).click());
      await page.waitForTimeout(100);
      expect(await events(page), id).toEqual([]);
      expect((await shows(page, id)).form, id).toBe('rest');
    }
    expect((await clipboard(page)).writes).toEqual([]);
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('copied');
    await host(page, 'icon').evaluate((el) => ((el as unknown as { disabled: boolean }).disabled = true));
    await expect.poll(async () => (await shows(page, 'icon')).form).toBe('rest');
    expect(await shows(page, 'icon')).toMatchObject({ glyph: 'content_copy', status: '', alert: '' });
    await expect(stage(page, 'icon').getByRole('button')).toBeDisabled();
  });

  test('CPY-11: while the icon set cannot draw a glyph, nothing is drawn in its place — never its name — its box is kept and the words still reach assistive technology; once the set can, the glyph is drawn', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon', 'labelled') });
    await double(page);
    const before = await box(native(page, 'icon'));
    await expect.poll(() => glyph(page, 'icon').evaluate((el) => el.hasAttribute('data-drawn'))).toBe(true);
    const family = await withoutIconFont(page);
    for (const id of ['icon', 'labelled']) {
      await expect.poll(() => glyph(page, id).evaluate((el) => el.hasAttribute('data-drawn')), id).toBe(false);
      expect(await css(glyph(page, id), 'visibility'), id).toBe('hidden');
    }
    expect(await box(native(page, 'icon'))).toEqual(before);
    await expect(stage(page, 'icon').getByRole('button', { name: 'Copy', exact: true })).toHaveCount(1);
    // The other glyphs are held back too, and their announcement is still made.
    await listen(page, 'icon');
    await press(page, 'icon');
    await expect.poll(() => said(page)).toEqual([{ role: 'status', text: 'Copied' }]);
    expect(await css(glyph(page, 'icon'), 'visibility')).toBe('hidden');
    await iconFaceArrives(page, family);
    await expect.poll(() => glyph(page, 'icon').evaluate((el) => el.hasAttribute('data-drawn'))).toBe(true);
    expect(await css(glyph(page, 'icon'), 'visibility')).toBe('visible');
  });
});

test.describe('direction', () => {
  test('CPY-15: the direction comes from the nearest ancestor that sets one — not from the root — and a change after the first render is drawn at once, keeping its form, the time left and its focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...fixture('labelled'), id: 'in-rtl', direction: 'rtl' }, { ...fixture('labelled'), id: 'in-ltr' }] });
    await double(page);
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
    const order = async (id: string) => ((await box(glyph(page, id))).x < (await box(host(page, id).locator('.labels'))).x ? 'glyph first' : 'label first');
    expect([await order('in-ltr'), await order('in-rtl')]).toEqual(['glyph first', 'label first']);
    // Changed while it shows copied, with focus on it.
    const duration = await resolveToken(page, DURATION, 'duration');
    // The duration runs on the page's clock, held still and moved on by the test: no time passes between two steps.
    await holdClock(page);
    await native(page, 'in-ltr').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await shows(page, 'in-ltr')).form).toBe('copied');
    await page.clock.runFor(duration / 2);
    await stage(page, 'in-ltr').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await order('in-ltr')).toBe('label first');
    expect((await shows(page, 'in-ltr')).form).toBe('copied');
    expect(await host(page, 'in-ltr').evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('tanrei-button');
    // No motion of its own: the glyph and the labels carry none.
    expect(await glyph(page, 'in-ltr').evaluate((el) => [getComputedStyle(el).transitionDuration, el.getAnimations({ subtree: true }).length])).toEqual(['0s', 0]);
    // The time left is kept: not yet at rest one millisecond before the duration, at rest at it.
    await page.clock.runFor(duration / 2 - 1);
    expect((await shows(page, 'in-ltr')).form).toBe('copied');
    await page.clock.runFor(1);
    await expect.poll(async () => (await shows(page, 'in-ltr')).form).toBe('rest');
  });

  test('CPY-16: in a right-to-left layout the glyph and the label stand as a Button’s leading icon and label do, content_copy is drawn mirrored because the icon set marks it, and check and error are not: the icon helper mirrors, never the copy button', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon-rtl', 'labelled-rtl', 'icon') });
    await double(page);
    const mirrored = (id: string) => glyph(page, id).evaluate((el) => ({ marked: el.hasAttribute('data-tanrei-mirrored'), flipped: new DOMMatrix(getComputedStyle(el).transform).a === -1 }));
    expect(await mirrored('icon-rtl')).toEqual({ marked: true, flipped: true });
    expect(await mirrored('labelled-rtl')).toEqual({ marked: true, flipped: true });
    // The mark is the icon set's; left to right it is not drawn mirrored.
    expect(await mirrored('icon')).toEqual({ marked: true, flipped: false });
    const [g, l] = [await box(glyph(page, 'labelled-rtl')), await box(host(page, 'labelled-rtl').locator('.labels'))];
    expect(g.x).toBeGreaterThanOrEqual(l.x + l.width);
    const place = await box(glyph(page, 'icon-rtl'));
    for (const [mode, form] of [['writes', 'copied'], ['refuses', 'failed']] as const) {
      await answers(page, mode);
      await press(page, 'icon-rtl');
      await expect.poll(async () => (await shows(page, 'icon-rtl')).form).toBe(form);
      await expect.poll(() => mirrored('icon-rtl')).toEqual({ marked: false, flipped: false });
      expect(await box(glyph(page, 'icon-rtl'))).toEqual(place);
    }
    // Nothing of its own mirrors: its stylesheet names no transform.
    expect(await host(page, 'icon').evaluate((el) => (el.constructor as unknown as { styles: { cssText: string } }).styles.cssText.includes('transform'))).toBe(false);
  });
});

test.describe('what is missing', () => {
  test('CPY-17: without label, copiedLabel or failedLabel it still renders and copies, and a debug build says which is missing; a variant or size the Button does not have is drawn with the copy button’s own default, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fx('bare', { text: 'x' }), fx('unknown', { text: 'x', variant: 'loud', size: 'huge', ...WORDS }), fx('known', { text: 'x', variant: 'tonal', size: 'large', ...WORDS }), fx('default', { text: 'x', ...WORDS })],
    });
    await double(page);
    await press(page, 'bare');
    await expect.poll(async () => (await shows(page, 'bare')).glyph).toBe('check');
    expect((await clipboard(page)).writes).toEqual(['x']);
    const about = (id: string) => seen.filter((w) => w.includes('CPY-17') && w.includes(id));
    expect(about('label is empty')).toHaveLength(1);
    expect(about('copiedLabel is empty')).toHaveLength(1);
    expect(about('failedLabel is empty')).toHaveLength(1);
    // Its own defaults — text and medium — not the Button's (filled).
    expect([await drawnBy(page, 'unknown').getAttribute('variant'), await drawnBy(page, 'unknown').getAttribute('size')]).toEqual(['text', 'medium']);
    expect(await box(native(page, 'unknown'))).toMatchObject({ width: (await box(native(page, 'default'))).width, height: (await box(native(page, 'default'))).height });
    expect(await css(native(page, 'unknown'), 'background-color')).toBe(await css(native(page, 'default'), 'background-color'));
    expect(about('variant "loud"')).toHaveLength(1);
    expect(about('size "huge"')).toHaveLength(1);
    expect([await drawnBy(page, 'known').getAttribute('variant'), await drawnBy(page, 'known').getAttribute('size')]).toEqual(['tonal', 'large']);
    expect(seen.filter((w) => w.includes('tonal') || w.includes('"large"'))).toEqual([]);
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`axe: ${theme} — every fixture, at rest, copied and failed`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      await double(page);
      // The forms last a minute here, not two seconds: every fixture is pressed in turn and then scanned in real time
      // (the scan waits on timers of its own, so the page's clock cannot be held), and on a slow machine the first was
      // back at rest before the last was pressed — the scan then saw fewer forms than it says.
      await setDuration(page, '60s');
      for (const mode of [null, 'writes', 'refuses'] as const) {
        if (mode) {
          await answers(page, mode);
          const pressable = spec.fixtures.filter((each) => !each.props.disabled);
          for (const f of pressable) await press(page, f.id);
          for (const f of pressable) await expect.poll(async () => (await shows(page, f.id)).form, f.id).toBe(mode === 'writes' ? 'copied' : 'failed');
        }
        await page.waitForTimeout(400); // colors transition
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${mode ?? 'rest'}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`).join('; ')}`).toEqual([]);
      }
    });
  }

  test('forced colors: it is the Button’s forced-colors form, and the three glyphs are told by their shape (CPY-1, CPY-6)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: only('icon-outlined', 'icon') });
    await double(page);
    await press(page, 'icon');
    await expect.poll(async () => (await shows(page, 'icon')).glyph).toBe('check');
    // Nothing of the copy button's own is colored: what is drawn is the Button's, in the mode's colors.
    expect(await css(glyph(page, 'icon'), 'color')).toBe(await css(drawnBy(page, 'icon').locator('.icon'), 'color'));
    expect(await css(glyph(page, 'icon'), 'visibility')).toBe('visible');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is a Button of its variant and size, at rest, with its glyph drawn as a glyph and its name', async ({ page }) => {
    expect(spec.fixtures.length).toBe(17);
    for (const f of spec.fixtures) {
      expect(await drawnBy(page, f.id).getAttribute('variant'), f.id).toBe(String(f.props.variant ?? 'text'));
      expect(await drawnBy(page, f.id).getAttribute('size'), f.id).toBe(String(f.props.size ?? 'medium'));
      expect(await shows(page, f.id), f.id).toEqual({ glyph: 'content_copy', form: 'rest', status: '', alert: '' });
      await expect(host(page, f.id).locator('.labels'), f.id).toHaveCount(f.props.iconOnly === false ? 1 : 0);
      await expect(stage(page, f.id).getByRole('button', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      // One ligature in its box, not its name spelled out.
      expect(await glyph(page, f.id).evaluate((el) => el.hasAttribute('data-drawn')), f.id).toBe(true);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

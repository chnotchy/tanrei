// <tanrei-marquee-text>, driven by specs/marquee-text.spec.json: every behaviour id (MRQ-1…18) is cited by a test title,
// every fixture has a baseline, and every length, speed, duration and easing is read back from the tokens — never from
// a number written here.
//
// Time: the start delay is a timer, held with the page clock (`holdClock`) and moved on with `page.clock.runFor`. The
// passes are one Web Animations API animation on the document timeline, which no page clock holds: a test reads its
// keyframes and timing, and seeks it (`seek`) to the moment it asks about, instead of waiting for it.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken, setWords, tabTo } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock } from '../../../test/page-clock.js';

const spec = loadSpec('marquee-text');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-marquee-text`);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-marquee-text-${name}`;
const LONG = 'Track 7 — A very long title that does not fit in the row it stands in';
const fixture = (id: string, props: Fixture['props'] = {}, text = LONG, rest: Partial<Fixture> = {}): Fixture => ({ id, props, slots: { default: text }, ...rest }) as Fixture;
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));

function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** What the line shows now: the parts the tests read, from inside its shadow root. */
const state = (locator: Locator) =>
  locator.evaluate((el) => {
    const root = el.shadowRoot!;
    const viewport = root.querySelector<HTMLElement>('.viewport')!;
    const track = root.querySelector<HTMLElement>('.track')!;
    const text = root.querySelector<HTMLElement>('.text')!;
    const copy = root.querySelector<HTMLElement>('.copy')!;
    const runs = [...track.getAnimations(), ...viewport.getAnimations()];
    const style = getComputedStyle(track);
    return {
      playing: viewport.hasAttribute('data-playing'),
      dir: viewport.getAttribute('dir'),
      ellipsis: style.textOverflow,
      mask: getComputedStyle(viewport).maskImage,
      translate: Number.parseFloat(style.translate) || 0,
      copy: getComputedStyle(copy).display !== 'none',
      control: !!root.querySelector('.control'),
      animations: runs.length,
      states: runs.map((a) => a.playState),
      viewport: viewport.getBoundingClientRect().width,
      textWidth: text.getBoundingClientRect().width,
    };
  });

/** The run's motion of the text: its timing and keyframes. */
const run = (locator: Locator) =>
  locator.evaluate((el) => {
    const animation = el.shadowRoot!.querySelector('.track')!.getAnimations()[0];
    if (!animation) return null;
    const effect = animation.effect as KeyframeEffect;
    const timing = effect.getTiming();
    return {
      duration: Number(timing.duration),
      delay: timing.delay ?? 0,
      iterations: timing.iterations === Number.POSITIVE_INFINITY ? 'Infinity' : timing.iterations,
      easing: timing.easing,
      frames: effect.getKeyframes().map((k) => ({ offset: k.computedOffset, translate: Number.parseFloat(String(k.translate)), easing: k.easing })),
      playState: animation.playState,
      currentTime: Number(animation.currentTime),
    };
  });

/** Seeks every motion of the line to `ms` of its run (from the run's start, its delay included) and holds it there. */
const seek = (locator: Locator, ms: number) =>
  locator.evaluate((el, t) => {
    const root = el.shadowRoot!;
    for (const animation of [...root.querySelector('.track')!.getAnimations(), ...root.querySelector('.viewport')!.getAnimations()]) {
      animation.pause();
      animation.currentTime = t;
    }
  }, ms);

/** The mask's look on the viewport now: size and position, as computed. */
const mask = (locator: Locator) =>
  locator.evaluate((el) => {
    const style = getComputedStyle(el.shadowRoot!.querySelector('.viewport')!);
    return { size: style.maskSize, position: style.maskPosition };
  });

const easingOf = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);

const speedToken = (page: P) => page.evaluate((n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)), T('speed'));

/** Moves the mouse over a locator's middle, and away to a corner of the window. */
async function hover(page: P, locator: Locator) {
  const box = (await locator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}
const away = (page: P) => page.mouse.move(1, 1);

/** Mounts these fixtures with motion as asked, and the pointer out of the way. */
async function mount(page: P, fixtures: Fixture[], { reducedMotion = false, dir }: { reducedMotion?: boolean; dir?: 'ltr' | 'rtl' } = {}) {
  await page.mouse.move(1, 1);
  await mountFixtures(page, spec, { icons: true, reducedMotion, fixtures, dir });
}

/** The start delay, ms, and its timer run past with the page clock: the passes have begun. */
async function pastStartDelay(page: P) {
  await page.clock.runFor(await resolveToken(page, T('motion-start-delay'), 'duration'));
}

test.describe('behavior', () => {
  test('MRQ-1: a text that fits is a plain line of text — nothing starts on hover or focus, no copy, no control', async ({ page }) => {
    await mount(page, [fixture('fits', {}, 'Short title'), fixture('fits-always', { trigger: 'always', playbackControl: true, playLabel: 'Play', pauseLabel: 'Pause' }, 'Short title')]);
    await holdClock(page);
    await hover(page, host(page, 'fits'));
    await pastStartDelay(page);
    for (const id of ['fits', 'fits-always']) {
      const s = await state(host(page, id));
      expect(s.textWidth, id).toBeLessThanOrEqual(s.viewport);
      expect(s, id).toMatchObject({ playing: false, animations: 0, copy: false, control: false, translate: 0 });
      expect(s.mask, id).toBe('none');
    }
    // The line is one line high, as wide as its place (the stage's 240), and drawn in the text style around it.
    const box = (await host(page, 'fits').boundingBox())!;
    expect(box.width).toBe(240);
    const [lineHeight, own] = await host(page, 'fits').evaluate((el) => [getComputedStyle(el).lineHeight, el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect().height]);
    expect(own).toBeCloseTo(Number.parseFloat(lineHeight), 0);
  });

  test('MRQ-2: a text that does not fit rests at the line’s start, cut with the platform’s ellipsis at its end', async ({ page }) => {
    await mount(page, only('default'));
    const s = await state(host(page, 'default'));
    expect(s.textWidth).toBeGreaterThan(s.viewport);
    expect(s).toMatchObject({ playing: false, ellipsis: 'ellipsis', mask: 'none', translate: 0, animations: 0 });
    const [textLeft, viewLeft] = await host(page, 'default').evaluate((el) => [el.shadowRoot!.querySelector('.text')!.getBoundingClientRect().left, el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect().left]);
    expect(textLeft).toBeCloseTo(viewLeft, 0);
  });

  test('MRQ-3: a hover waits the start delay, then plays passes until the pointer leaves; it then returns to the start and rests', async ({ page }) => {
    await mount(page, only('default'));
    await holdClock(page);
    const line = host(page, 'default');
    const delay = await resolveToken(page, T('motion-start-delay'), 'duration');
    await hover(page, line);
    await page.clock.runFor(delay - 1);
    expect(await state(line), 'not yet at delay − 1').toMatchObject({ playing: false, animations: 0, ellipsis: 'ellipsis' });
    await page.clock.runFor(1);
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const passes = (await run(line))!;
    // Without iterations, passes go on while the trigger holds (the owner's choice for a hover and a focus).
    expect(passes).toMatchObject({ iterations: 'Infinity', delay: 0 });
    await seek(line, passes.duration / 4);
    await away(page);
    // The return: from where the text stood, over the return duration with the return easing.
    const back = (await run(line))!;
    expect(back.duration).toBe(await resolveToken(page, T('motion-return-duration'), 'duration'));
    expect(back.easing).toBe(await easingOf(page, T('motion-return-easing')));
    expect(back.frames.at(-1)!.translate).toBe(0);
    await motionEnded(line);
    await expect.poll(() => state(line)).toMatchObject({ playing: false, animations: 0, ellipsis: 'ellipsis', translate: 0 });
  });

  test('MRQ-3: a pointer that leaves within the start delay sets nothing moving', async ({ page }) => {
    await mount(page, only('default'));
    await holdClock(page);
    const line = host(page, 'default');
    await hover(page, line);
    await page.clock.runFor(100);
    await away(page);
    await pastStartDelay(page);
    expect(await state(line)).toMatchObject({ playing: false, animations: 0 });
  });

  test('MRQ-3: iterations plays that many passes, then the line rests at its start while the trigger still holds; a new trigger plays them again', async ({ page }) => {
    await mount(page, [fixture('two', { iterations: 2 })]);
    await holdClock(page);
    const line = host(page, 'two');
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await run(line))?.iterations).toBe(2);
    const { duration } = (await run(line))!;
    await line.evaluate((el, d) => {
      const root = el.shadowRoot!;
      for (const a of [...root.querySelector('.track')!.getAnimations(), ...root.querySelector('.viewport')!.getAnimations()]) a.currentTime = 2 * d;
    }, duration);
    await expect.poll(() => state(line)).toMatchObject({ playing: false, animations: 0, ellipsis: 'ellipsis' });
    // Still over it: nothing starts again.
    await pastStartDelay(page);
    expect((await state(line)).animations).toBe(0);
    await away(page);
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(line)).animations).toBe(2);
  });

  test('MRQ-3: focus on the control the line stands in starts it (hover-or-focus and focus); moving focus away stops it; hover over that control does too', async ({ page }) => {
    await mount(page, [fixture('in-row'), fixture('focus-only', { trigger: 'focus' }), fixture('hover-only', { trigger: 'hover' })]);
    // Each line inside a button 300 wide: the line is 240, the rest of the button is around it.
    await page.evaluate(() => {
      for (const line of document.querySelectorAll('tanrei-marquee-text')) {
        const button = document.createElement('button');
        button.style.cssText = 'inline-size: 300px; padding: 8px 30px;';
        line.replaceWith(button);
        button.append(line);
      }
    });
    await holdClock(page);
    for (const id of ['in-row', 'focus-only']) {
      const line = host(page, id);
      await tabTo(page, page.locator(`[data-fixture="${id}"] button`));
      await pastStartDelay(page);
      await expect.poll(async () => (await state(line)).animations, id).toBeGreaterThan(0);
      await page.locator(`[data-fixture="${id}"] button`).blur();
      await expect.poll(async () => (await state(line)).playing, `${id} after blur`).toBe(false);
    }
    // A hover over the button's padding, outside the line, is a hover of the control it stands in.
    const button = (await page.locator('[data-fixture="hover-only"] button').boundingBox())!;
    await page.mouse.move(button.x + 4, button.y + button.height / 2);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(host(page, 'hover-only'))).animations).toBeGreaterThan(0);
    // trigger hover does not start on focus.
    await away(page);
    await expect.poll(async () => (await state(host(page, 'hover-only'))).playing).toBe(false);
    await tabTo(page, page.locator('[data-fixture="hover-only"] button'));
    await pastStartDelay(page);
    expect((await state(host(page, 'hover-only'))).animations).toBe(0);
  });

  test('MRQ-4: repeat moves the text toward its start at speed, steadily, its copy a gap behind, until the copy stands where it began; then rests startPause', async ({ page }) => {
    await mount(page, only('default'));
    await holdClock(page);
    const line = host(page, 'default');
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(line)).copy).toBe(true);
    const s = await state(line);
    const gap = await resolveToken(page, T('gap'));
    const rest = await resolveToken(page, T('motion-start-pause'), 'duration');
    const speed = await speedToken(page);
    const passes = (await run(line))!;
    const distance = s.textWidth + gap;
    const travel = (distance / speed) * 1000;
    expect(passes.duration).toBeCloseTo(travel + rest, 0);
    expect(passes.frames.map((f) => f.translate)).toEqual([0, -distance, -distance].map((v) => expect.closeTo(v, 1)));
    expect(passes.frames[1]!.offset).toBeCloseTo(travel / (travel + rest), 3);
    for (const frame of passes.frames) expect(frame.easing).toBe(await easingOf(page, T('motion-easing')));
    // The copy follows the text a gap behind; at the pass's end it stands where the text began.
    const [textRight, copyLeft] = await line.evaluate((el) => [el.shadowRoot!.querySelector('.text')!.getBoundingClientRect().right, el.shadowRoot!.querySelector('.copy')!.getBoundingClientRect().left]);
    expect(copyLeft - textRight).toBeCloseTo(gap, 0);
    await seek(line, 0);
    const begin = await line.evaluate((el) => el.shadowRoot!.querySelector('.text')!.getBoundingClientRect().left);
    await seek(line, travel);
    const copyAt = await line.evaluate((el) => el.shadowRoot!.querySelector('.copy')!.getBoundingClientRect().left);
    expect(copyAt).toBeCloseTo(begin, 0);
    // The copy is the text again, hidden from assistive technology and inert.
    const copy = await line.evaluate((el) => {
      const c = el.shadowRoot!.querySelector<HTMLElement>('.copy')!;
      return { text: c.textContent, hidden: c.getAttribute('aria-hidden'), inert: c.inert };
    });
    expect(copy).toEqual({ text: LONG, hidden: 'true', inert: true });
  });

  test('MRQ-5: bounce moves the text until its end is in view, rests endPause, moves back at the same speed, rests startPause; no copy', async ({ page }) => {
    await mount(page, only('bounce'));
    await holdClock(page);
    const line = host(page, 'bounce');
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const s = await state(line);
    expect(s.copy).toBe(false);
    const speed = await speedToken(page);
    const end = await resolveToken(page, T('motion-end-pause'), 'duration');
    const rest = await resolveToken(page, T('motion-start-pause'), 'duration');
    const distance = s.textWidth - s.viewport;
    const travel = (distance / speed) * 1000;
    const passes = (await run(line))!;
    // Read back as a distance: the run was built from a width measured at rest, the test's is measured while it plays,
    // and WebKit lays the two out a hundredth of a pixel apart (0.7 ms of a pass at 30 px/s).
    expect((((passes.duration - end - rest) / 2) * speed) / 1000).toBeCloseTo(distance, 1);
    expect(passes.frames.map((f) => f.translate)).toEqual([0, -distance, -distance, 0, 0].map((v) => expect.closeTo(v, 1)));
    expect(passes.frames.map((f) => f.offset)).toEqual([0, travel, travel + end, 2 * travel + end, 2 * travel + end + rest].map((ms) => expect.closeTo(ms / passes.duration, 3)));
    // Its end in view at the viewport's end.
    await seek(line, travel + end / 2);
    const [textRight, viewRight] = await line.evaluate((el) => [el.shadowRoot!.querySelector('.text')!.getBoundingClientRect().right, el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect().right]);
    expect(textRight).toBeCloseTo(viewRight, 0);
  });

  test('MRQ-6: while it plays no ellipsis and a fade at each edge text lies hidden behind; at rest the ellipsis again and no fade', async ({ page }) => {
    await mount(page, only('default', 'bounce'));
    await holdClock(page);
    const fade = await resolveToken(page, T('fade-extent'));
    for (const id of ['default', 'bounce']) {
      const line = host(page, id);
      await hover(page, line);
      await pastStartDelay(page);
      await expect.poll(async () => (await state(line)).playing, id).toBe(true);
      const s = await state(line);
      expect(s.ellipsis, id).toBe('clip');
      expect(s.mask, id).toContain('gradient');
      // At the start only the end edge fades: the mask is widened past the left (start) edge by the fade.
      await seek(line, 0);
      expect(await mask(line), `${id} at the start`).toEqual({ size: `calc(100% + ${fade}px) 100%`, position: `${-fade}px 0px` });
      const passes = (await run(line))!;
      // Mid-pass, both edges fade: the mask is the line's own box.
      await seek(line, passes.duration * passes.frames[1]!.offset! * 0.5);
      expect((await mask(line)).size, `${id} mid-pass`).toBe('100% 100%');
      await away(page);
      await motionEnded(line);
      await expect.poll(() => state(line)).toMatchObject({ playing: false, ellipsis: 'ellipsis', mask: 'none' });
    }
    // Bounce with its end in view: only the start edge fades.
    const line = host(page, 'bounce');
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const passes = (await run(line))!;
    await seek(line, passes.duration * passes.frames[1]!.offset!);
    expect(await mask(line)).toEqual({ size: `calc(100% + ${fade}px) 100%`, position: '0px 0px' });
  });

  test('MRQ-6: a line that plays, its motion not drawn (a screenshot cancels an endless animation), looks as it rests at its start: the end edge of its direction fades', async ({ page }) => {
    await mount(page, only('always', 'rtl'));
    const fade = await resolveToken(page, T('fade-extent'));
    for (const [id, position] of [['always', `${-fade}px 0px`], ['rtl', '0px 0px']] as const) {
      const line = host(page, id);
      await expect.poll(async () => (await state(line)).animations, id).toBe(2);
      await line.evaluate((el) => {
        const root = el.shadowRoot!;
        for (const a of [...root.querySelector('.track')!.getAnimations(), ...root.querySelector('.viewport')!.getAnimations()]) a.cancel();
      });
      expect(await state(line), id).toMatchObject({ playing: true, translate: 0 });
      expect(await mask(line), id).toEqual({ size: `calc(100% + ${fade}px) 100%`, position });
    }
  });

  test('MRQ-7: the text moves and rests by its own direction, whatever the layout direction', async ({ page }) => {
    const hebrew = 'כותרת ארוכה מאוד שאינה נכנסת בשורה שבה היא עומדת';
    await mount(page, [fixture('hebrew-in-ltr', { trigger: 'always' }, hebrew), fixture('english-in-rtl', { trigger: 'always' }, LONG, { direction: 'rtl' })]);
    for (const [id, dir, sign] of [['hebrew-in-ltr', 'rtl', 1], ['english-in-rtl', 'ltr', -1]] as const) {
      const line = host(page, id);
      await expect.poll(async () => (await state(line)).animations, id).toBe(2);
      expect((await state(line)).dir, id).toBe(dir);
      const passes = (await run(line))!;
      expect(Math.sign(passes.frames[1]!.translate), id).toBe(sign);
      // It rests at the start edge of its own direction.
      await seek(line, 0);
      const [text, view] = await line.evaluate((el) => [el.shadowRoot!.querySelector('.text')!.getBoundingClientRect(), el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect()].map((r) => ({ left: r.left, right: r.right })));
      if (dir === 'rtl') expect(text!.right, id).toBeCloseTo(view!.right, 0);
      else expect(text!.left, id).toBeCloseTo(view!.left, 0);
    }
  });

  test('MRQ-8: where motion is reduced the text never moves; a hover shows it a viewport at a time, at once, resting startPause on each, and back', async ({ page }) => {
    await mount(page, only('default', 'always-control'), { reducedMotion: true });
    await holdClock(page);
    const line = host(page, 'default');
    const rest = await resolveToken(page, T('motion-start-pause'), 'duration');
    await hover(page, line);
    await pastStartDelay(page);
    const s = await state(line);
    expect(s.animations).toBe(0);
    const views: number[] = [];
    for (let at = s.viewport; at < s.textWidth - s.viewport; at += s.viewport) views.push(at);
    views.push(s.textWidth - s.viewport);
    for (const [i, view] of views.entries()) {
      await expect.poll(async () => (await state(line)).translate, `view ${i}`).toBeCloseTo(-view, 0);
      expect((await state(line)).animations, 'no motion').toBe(0);
      await page.clock.runFor(rest);
    }
    await expect.poll(async () => (await state(line)).translate, 'back at the start').toBe(0);
    expect((await state(line)).ellipsis).toBe('ellipsis');
    // trigger always rests as a cut line, with no control.
    expect(await state(host(page, 'always-control'))).toMatchObject({ animations: 0, playing: false, control: false, ellipsis: 'ellipsis' });
  });

  test('MRQ-9: always holds while the pointer is over it or focus within it, and while paused; out of view it holds and starts again from the start', async ({ page }) => {
    await mount(page, only('always-control'));
    const line = host(page, 'always-control');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const passes = (await run(line))!;
    // Its first rest is startPause, before the first pass.
    expect(passes.delay).toBe(await resolveToken(page, T('motion-start-pause'), 'duration'));
    await hover(page, line);
    await expect.poll(async () => (await state(line)).states).toEqual(['paused', 'paused']);
    await away(page);
    await expect.poll(async () => (await state(line)).states).toEqual(['running', 'running']);
    await line.evaluate((el) => el.setAttribute('paused', ''));
    await expect.poll(async () => (await state(line)).states).toEqual(['paused', 'paused']);
    await line.evaluate((el) => el.removeAttribute('paused'));
    await expect.poll(async () => (await state(line)).states).toEqual(['running', 'running']);
    // Out of view: nothing runs; back in view, a new run from the start.
    await seek(line, passes.delay + 500);
    await line.evaluate((el) => {
      const root = el.shadowRoot!;
      for (const a of [...root.querySelector('.track')!.getAnimations(), ...root.querySelector('.viewport')!.getAnimations()]) a.play();
    });
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'spacer';
      spacer.style.blockSize = '4000px';
      document.body.prepend(spacer);
      window.scrollTo(0, 0);
    });
    await expect.poll(async () => (await state(line)).animations).toBe(0);
    await page.evaluate(() => document.getElementById('spacer')!.remove());
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    expect((await run(line))!.currentTime).toBeLessThan(500);
    // A hidden page holds it the same way.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await state(line)).animations).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await state(line)).animations).toBe(2);
  });

  test('MRQ-10: the playback control — a small text Button at the line’s end, pause while it moves and play_arrow while paused, toggling paused once, focus kept', async ({ page }) => {
    await mount(page, only('always-control'));
    const line = host(page, 'always-control');
    const control = line.locator('tanrei-button.control');
    await expect(control).toHaveAttribute('variant', 'text');
    await expect(control).toHaveAttribute('size', 'small');
    await expect(control).toHaveAttribute('label', 'Pause scrolling text');
    await expect(control.locator('[slot="icon"]')).toHaveText('pause');
    const [viewRight, controlLeft] = await line.evaluate((el) => [el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect().right, el.shadowRoot!.querySelector('.control')!.getBoundingClientRect().left]);
    expect(controlLeft - viewRight).toBeCloseTo(await resolveToken(page, T('playback-gap')), 0);
    const events = await line.evaluate((el) => {
      const seen: boolean[] = [];
      el.addEventListener('pausedchange', (e) => seen.push((e as CustomEvent<{ paused: boolean }>).detail.paused));
      (window as unknown as { seen: boolean[] }).seen = seen;
      return seen.length;
    });
    expect(events).toBe(0);
    await tabTo(page, control);
    await page.keyboard.press('Enter');
    await expect(line).toHaveAttribute('paused', '');
    await expect(control).toHaveAttribute('label', 'Play scrolling text');
    await expect(control.locator('[slot="icon"]')).toHaveText('play_arrow');
    expect(await page.evaluate(() => (window as unknown as { seen: boolean[] }).seen)).toEqual([true]);
    expect(await page.evaluate(() => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return !!active?.closest('tanrei-button, button') && !!(active.closest('tanrei-button') ?? (active.getRootNode() as ShadowRoot).host)?.classList.contains('control');
    })).toBe(true);
    // Setting paused emits nothing.
    await line.evaluate((el) => el.removeAttribute('paused'));
    expect(await page.evaluate(() => (window as unknown as { seen: boolean[] }).seen)).toEqual([true]);
  });

  test('MRQ-10: always without the control reports, once, that the page needs a control that sets paused; a hover trigger does not', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, only('always', 'default'));
    await expect.poll(async () => (await state(host(page, 'always'))).animations).toBe(2);
    expect((await state(host(page, 'always'))).control).toBe(false);
    const reports = seen.filter((m) => m.includes('MRQ-10'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain('WCAG 2.2.2');
  });

  test('MRQ-11: the text is read once, whole; the copy, the ellipsis and the fade are not; the line takes no focus and says nothing as it moves', async ({ page }) => {
    await mount(page, only('always'));
    const line = host(page, 'always');
    await expect.poll(async () => (await state(line)).copy).toBe(true);
    const snapshot = await stage(page, 'always').ariaSnapshot();
    const text = spec.fixtures.find((f) => f.id === 'always')!.slots!.default as string;
    expect(snapshot.split(text).length - 1).toBe(1);
    const parts = await line.evaluate((el) => ({
      tabindex: el.getAttribute('tabindex'),
      focusable: [...el.shadowRoot!.querySelectorAll('*')].some((e) => (e as HTMLElement).tabIndex >= 0 && !e.closest('[inert]') && e.localName !== 'tanrei-button'),
      live: el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
      role: el.getAttribute('role'),
    }));
    expect(parts).toEqual({ tabindex: null, focusable: false, live: 0, role: null });
  });

  test('MRQ-12: an empty label reads the product’s words; with none the control is still drawn and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('no-labels', { trigger: 'always', playbackControl: true })]);
    const control = host(page, 'no-labels').locator('tanrei-button.control');
    await expect(control).toHaveCount(1);
    await expect.poll(() => seen.filter((m) => m.includes('MRQ-12') || m.includes('marqueePauseLabel')).length).toBeGreaterThan(0);
    await setWords(page, { marqueePauseLabel: 'Pause the title', marqueePlayLabel: 'Play the title' });
    await expect(control).toHaveAttribute('label', 'Pause the title');
  });

  test('MRQ-13: at an enlarged text size the speed grows with the text; the fade and the gap keep their sizes', async ({ page }) => {
    await mount(page, only('always'));
    const line = host(page, 'always');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const before = (await run(line))!;
    const gap = await resolveToken(page, T('gap'));
    const speed = await speedToken(page);
    // The browser's default text size doubled, as a person's setting does (the line's own probe of `font-size: medium`).
    await line.evaluate((el) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.timing.medium { font-size: 32px !important; }');
      el.shadowRoot!.adoptedStyleSheets = [...el.shadowRoot!.adoptedStyleSheets, sheet];
      el.textContent = `${el.textContent} again`;
    });
    await expect.poll(async () => (await state(line)).textWidth).toBeGreaterThan(before.frames[1]!.translate * -1 - gap + 1);
    await expect.poll(async () => (await run(line))?.duration).not.toBe(before.duration);
    const s = await state(line);
    const after = (await run(line))!;
    const rest = await resolveToken(page, T('motion-start-pause'), 'duration');
    expect(after.duration - rest).toBeCloseTo((((s.textWidth + gap) / (speed * 2)) * 1000), 0);
    expect(await resolveToken(page, T('gap'))).toBe(gap);
  });

  test('MRQ-14: a change of the text restarts the run from the start, or rests where it now fits; a change of speed takes effect from the next pass', async ({ page }) => {
    await mount(page, only('always'));
    const line = host(page, 'always');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const first = (await run(line))!;
    await seek(line, first.delay + 1000);
    await line.evaluate((el) => {
      for (const a of el.shadowRoot!.querySelector('.track')!.getAnimations()) a.play();
      el.textContent = `${el.textContent} and more words after it`;
    });
    await expect.poll(async () => (await run(line))?.duration).toBeGreaterThan(first.duration);
    expect((await run(line))!.currentTime).toBeLessThan(first.delay);
    // A speed changed mid-run: the pass in play keeps its timing and is the last of this run.
    const running = (await run(line))!;
    await line.evaluate((el) => el.setAttribute('speed', '60'));
    const kept = (await run(line))!;
    expect(kept.duration).toBe(running.duration);
    expect(kept.iterations).toBe(1);
    // The pass ends: the next is played at the new speed.
    await line.evaluate((el) => {
      const root = el.shadowRoot!;
      for (const a of [...root.querySelector('.track')!.getAnimations(), ...root.querySelector('.viewport')!.getAnimations()]) a.finish();
    });
    await expect.poll(async () => (await run(line))?.duration).toBeLessThan(running.duration);
    // Shortened so that it fits: it rests as a plain line.
    await line.evaluate((el) => (el.textContent = 'Short'));
    await expect.poll(() => state(line)).toMatchObject({ animations: 0, playing: false, control: false });
  });

  test('MRQ-15: a speed that is not positive, a negative pause or iterations is null, and an unknown trigger or loop is the default — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixture('bad', { speed: -5, startPause: -1, iterations: -2, trigger: 'sometimes', loop: 'spin' })]);
    await holdClock(page);
    const line = host(page, 'bad');
    for (const word of ['speed -5', 'startPause -1', 'iterations -2', 'trigger "sometimes"', 'loop "spin"']) expect(seen.some((m) => m.includes('MRQ-15') && m.includes(word)), word).toBe(true);
    // Drawn as hover-or-focus and repeat, at the token's speed, resting the token's pause, without end.
    await hover(page, line);
    await pastStartDelay(page);
    await expect.poll(async () => (await state(line)).copy).toBe(true);
    const s = await state(line);
    const passes = (await run(line))!;
    const travel = ((s.textWidth + (await resolveToken(page, T('gap')))) / (await speedToken(page))) * 1000;
    expect(passes.duration).toBeCloseTo(travel + (await resolveToken(page, T('motion-start-pause'), 'duration')), 0);
    expect(passes.iterations).toBe('Infinity');
  });

  test('MRQ-16: in a right-to-left layout the playback control is at the left end; the text moves by its own direction', async ({ page }) => {
    await mount(page, only('rtl'));
    const line = host(page, 'rtl');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    const [controlRight, viewLeft] = await line.evaluate((el) => [el.shadowRoot!.querySelector('.control')!.getBoundingClientRect().right, el.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect().left]);
    expect(controlRight).toBeLessThan(viewLeft);
    expect(Math.sign((await run(line))!.frames[1]!.translate)).toBe(1);
  });

  test('MRQ-17: the layout direction comes from an ancestor; a change of it rests the line at once and draws it for the new direction', async ({ page }) => {
    // Digits have no strong direction: the text takes the layout direction (MRQ-7's fallback).
    const digits = Array.from({ length: 20 }, (_, i) => String(1000 + i)).join(' ');
    await mount(page, [fixture('digits', { trigger: 'always' }, digits)]);
    const line = host(page, 'digits');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    expect((await state(line)).dir).toBe('ltr');
    await stage(page, 'digits').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await expect.poll(async () => (await state(line)).dir).toBe('rtl');
    await expect.poll(async () => Math.sign((await run(line))?.frames[1]?.translate ?? 0)).toBe(1);
  });

  test('MRQ-18: in forced colors there is no fade: the moving text is clipped at the viewport’s edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, only('always'));
    const line = host(page, 'always');
    await expect.poll(async () => (await state(line)).animations).toBe(2);
    expect((await state(line)).mask).toBe('none');
  });
});

test.describe('accessibility', () => {
  test('axe: every fixture, light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.mouse.move(1, 1);
      await mountFixtures(page, spec, { theme, icons: true, reducedMotion: false });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  // Motion not reduced, the pointer outside, and every run held at its start: a line that moves all the time is drawn
  // in its first rest, its end edge faded, its control shown.
  test.beforeEach(async ({ page }) => {
    await mount(page, spec.fixtures);
    for (const f of spec.fixtures.filter((x) => x.props.trigger === 'always')) {
      await expect.poll(async () => (await state(host(page, f.id))).animations, f.id).toBe(2);
      await seek(host(page, f.id), 0);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

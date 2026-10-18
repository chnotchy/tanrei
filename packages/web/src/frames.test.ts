// test/frames.ts, tested on pages of its own: each assertion fails on a page made to be wrong in the way it looks for,
// and passes on its correct twin; and what it reads is the same on a busy page and on a held clock as on a calm one.
// No component and no token is used: the pages state their own styles, so the helper is proved apart from what it
// will be used on.
import { type Page, expect, test } from '@playwright/test';
import { type Frames, type Probe, expectAnchored, expectAnimated, expectFirstFrameAtRest, expectNoFlicker, freezeFirstFrame, sampleFrames } from '../test/frames.js';
import { motionEnded } from '../test/motions.js';
import { holdClock } from '../test/page-clock.js';
import { decodePng } from '../test/png.js';

/** A page of its own: a white body and a stage, with `body` in it. */
async function stage(page: Page, body: string) {
  await page.setContent(`<!doctype html><html><head><style>body { margin: 0; background: rgb(255, 255, 255); font: 16px/20px sans-serif; }</style></head><body><div id="stage">${body}</div></body></html>`);
}

const insert = (page: Page, html: string) => page.locator('#stage').evaluate((el, markup) => el.insertAdjacentHTML('beforeend', markup), html);

/** Two frames drawn, for an act that must span frames. */
const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

const BAR = '<div id="bar" style="inline-size: 100px; block-size: 10px; background: rgb(0, 0, 0); transition: inline-size 300ms linear"></div>';
const widen = (page: Page) => page.locator('#bar').evaluate((el: HTMLElement) => (el.style.inlineSize = '200px'));
const barWidth: Probe = (root) => ({ width: root.querySelector('#bar')!.getBoundingClientRect().width });
const widths = (seen: Frames) => seen.frames.map((frame) => [frame.time, frame.probe.width]);

test.describe('sampleFrames', () => {
  test('frame n shows the motion n/60 s into the change, from its start to its end', async ({ page }) => {
    await stage(page, BAR);
    const seen = await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth });
    expect(seen.frames[0]).toMatchObject({ index: 0, time: 0, probe: { width: 100 } });
    for (const [time, width] of widths(seen)) expect(width, `the width ${time} ms in`).toBeCloseTo(100 + 100 * Math.min(Number(time) / 300, 1), 1);
    // 1/60 s to 299 ms: 17 frames on the way, whatever the machine draws.
    expect(widths(seen).filter(([time]) => Number(time) > 0 && Number(time) < 300)).toHaveLength(17);
    expect(seen.rest.probe.width).toBe(200);
    expect(seen.complete).toBe(true);
    // (Chromium names the transition of a logical property by its physical one.)
    expect(seen.motions).toEqual([expect.objectContaining({ kind: 'transition', name: expect.stringMatching(/^(inline-size|width)$/), duration: 300, easing: 'linear', endless: false })]);
    // The page's own motion runs on once the sampling is over.
    await expect(page.locator('#bar')).toHaveCSS('width', '200px');
  });

  test('a page that takes 40 ms to draw each frame gives the very same frames', async ({ page }) => {
    await stage(page, BAR);
    const calm = widths(await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth }));
    await stage(page, BAR);
    await page.evaluate(() => {
      const busy = () => {
        const until = performance.now() + 40;
        while (performance.now() < until);
        requestAnimationFrame(busy);
      };
      requestAnimationFrame(busy);
    });
    expect(widths(await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth }))).toEqual(calm);
  });

  test('a held page clock gives the very same frames: the sampler needs no timer and no animation frame callback', async ({ page }) => {
    await stage(page, BAR);
    const calm = widths(await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth }));
    await stage(page, BAR);
    await holdClock(page);
    expect(widths(await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth }))).toEqual(calm);
  });

  test('an act of several inputs is one moment: the motion stands still between them, however long the round trips take', async ({ page }) => {
    await stage(page, BAR);
    const seen = await sampleFrames(
      page.locator('#stage'),
      async () => {
        await widen(page);
        await twoFrames(page);
        await twoFrames(page);
      },
      { probe: barWidth },
    );
    expect(seen.frames.filter((frame) => frame.time === 0).map((frame) => frame.probe.width)).toEqual([100]);
    expect(seen.frames[1]).toMatchObject({ probe: { width: expect.closeTo(100 + (100 * (1000 / 60)) / 300, 1) } });
  });

  test('`frames` cuts the sampling short, and the rest is still where the motion ends', async ({ page }) => {
    await stage(page, BAR);
    const seen = await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth, frames: 5 });
    expect(seen.frames.at(-1)).toMatchObject({ time: expect.closeTo(5000 / 60, 3) });
    expect(seen.complete).toBe(false);
    expect(seen.rest.probe.width).toBe(200);
  });

  test('a motion that begins and ends while the test still acts fails the sampling in its own words', async ({ page }) => {
    await stage(page, BAR);
    const sampled = sampleFrames(page.locator('#stage'), async () => {
      // Begun and finished in one task, its events arrive in the next frame: two frames go by before the act ends.
      await page.locator('#bar').evaluate((el: HTMLElement) => {
        el.style.inlineSize = '200px';
        void getComputedStyle(el).inlineSize;
        for (const animation of el.getAnimations()) animation.finish();
      });
      await twoFrames(page);
    });
    await expect(sampled).rejects.toThrow(/sampleFrames: a motion began and ended between two frames read here/);
    // …and the sampler is gone from the page.
    expect(await page.evaluate(() => '__tanreiFrames' in window)).toBe(false);
  });
});

// An element whose mark turns blue: in its first update (right), from a resize observer under a transition (the first
// frame is grey and it fades to blue: a component that reads its size and then its state), or a frame late with no
// motion (grey for one frame).
const LATE_MARK = `customElements.define('late-mark', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host { display: block; inline-size: 20px; } .mark { display: block; block-size: 20px; background-color: rgb(200, 200, 200); transition: background-color 200ms linear; } :host([on]) .mark { background-color: rgb(0, 0, 255); } :host([instant]) .mark { transition: none; }</style><span class="mark"></span>';
  }
  connectedCallback() {
    const when = this.getAttribute('when');
    if (when === 'connected') this.setAttribute('on', '');
    if (when === 'measured') {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        this.setAttribute('on', '');
      });
      observer.observe(this);
    }
    if (when === 'next-frame') requestAnimationFrame(() => requestAnimationFrame(() => this.setAttribute('on', '')));
  }
});`;

test.describe('expectFirstFrameAtRest', () => {
  const mount = async (page: Page, markup: string) => {
    await stage(page, '');
    await page.evaluate(LATE_MARK);
    return sampleFrames(page.locator('#stage'), () => insert(page, markup));
  };

  test('finds a state written after the first frame and moved into, inside a shadow root', async ({ page }) => {
    const seen = await mount(page, '<late-mark when="measured"></late-mark>');
    expect(() => expectFirstFrameAtRest(seen)).toThrow(/late-mark:0>span:1 background-color: rgb\(200, 200, 200\) → rgb\(0, 0, 255\)/);
    expect(seen.motions).toEqual([expect.objectContaining({ kind: 'transition', name: 'background-color', on: 'span.mark' })]);
  });

  test('finds a state written a frame late with no motion', async ({ page }) => {
    const seen = await mount(page, '<late-mark when="next-frame" instant></late-mark>');
    expect(() => expectFirstFrameAtRest(seen)).toThrow(/background-color: rgb\(200, 200, 200\) → rgb\(0, 0, 255\)/);
    expect(seen.motions).toEqual([]);
  });

  test('passes an element that is in its state from its first frame', async ({ page }) => {
    const seen = await mount(page, '<late-mark when="connected"></late-mark>');
    expectFirstFrameAtRest(seen);
    expect(seen.motions).toEqual([]);
  });

  test('`ignore` leaves out what the spec asks to move', async ({ page }) => {
    const seen = await mount(page, '<late-mark when="measured"></late-mark>');
    expectFirstFrameAtRest(seen, { ignore: (key, property) => key.endsWith('>span:1') && property === 'background-color' });
  });
});

test.describe('expectNoFlicker', () => {
  const SUBJECT = '<div id="subject" style="inline-size: 100px; block-size: 20px; background-color: rgb(0, 0, 255)"></div>';
  const animate = async (page: Page, how: string) => {
    await stage(page, SUBJECT);
    return sampleFrames(page.locator('#stage'), () =>
      page.locator('#subject').evaluate((el, source) => {
        // Not awaited: a motion's `finished` waits for the sampler, which waits for the act.
        (0, eval)(`(${source})`)(el);
      }, how),
    );
  };

  test('finds a value that leaves its way (a flash)', async ({ page }) => {
    const seen = await animate(page, '(el) => el.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 300 })');
    expect(() => expectNoFlicker(seen)).toThrow(/off-path: div#stage:0\/div#subject:0 opacity/);
  });

  test('finds a motion finished in one jump', async ({ page }) => {
    const seen = await animate(page, "(el) => el.animate([{ inlineSize: '100px' }, { inlineSize: '110px', offset: 0.9 }, { inlineSize: '200px' }], { duration: 300, fill: 'forwards' })");
    expect(() => expectNoFlicker(seen)).toThrow(/end-jump: div#stage:0\/div#subject:0 width in frame\(s\) \d+: 150 → 200/);
  });

  test('finds a blink', async ({ page }) => {
    const seen = await animate(page, "(el) => el.animate([{ visibility: 'visible' }, { visibility: 'hidden', offset: 0.3 }, { visibility: 'hidden', offset: 0.6 }, { visibility: 'visible', offset: 0.61 }, { visibility: 'visible' }], { duration: 300 })");
    expect(() => expectNoFlicker(seen)).toThrow(/blink: div#stage:0\/div#subject:0 visibility/);
  });

  test('passes a fade to transparent, an accelerating exit, a box that closes and an endless spinner', async ({ page }) => {
    for (const how of [
      // The colour's channels drop to 0 at the end, as transparent's are: continuous once premultiplied.
      "(el) => el.animate([{ backgroundColor: 'rgb(0, 0, 255)' }, { backgroundColor: 'transparent' }], { duration: 250, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' })",
      "(el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' })",
      // A box that narrows and is then taken out of the layout: its box goes to nothing, which is no jump.
      "(el) => el.animate([{ inlineSize: '200px' }, { inlineSize: '100px' }], { duration: 300 }).finished.then(() => (el.style.display = 'none'))",
      "(el) => { el.innerHTML = '<i style=\"display: block; block-size: 4px; background: rgb(0, 0, 0)\"></i>'; el.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 1000, iterations: Infinity }); }",
    ]) {
      const seen = await animate(page, how);
      expectNoFlicker(seen);
      expectFirstFrameAtRest(seen, { ignore: (key) => key.endsWith('#subject:0') });
    }
  });
});

// A box that grows by a line while something brings the new line into view, as a caret does: a box that clips with
// `overflow: hidden` is a scroll container and scrolls its first line away; one that clips with `overflow: clip` cannot.
const growBox = (overflow: string) =>
  `<div id="box" style="overflow: ${overflow}; block-size: 40px; transition: block-size 200ms linear; background: rgb(240, 240, 240)"><div>one</div><div>two</div></div>`;
const grow = (page: Page) =>
  page.locator('#box').evaluate((box: HTMLElement) => {
    box.insertAdjacentHTML('beforeend', '<div>three</div>');
    box.style.blockSize = '60px';
    box.lastElementChild!.scrollIntoView({ block: 'nearest' });
  });
const lines: Probe = (root) => {
  const box = root.querySelector('#box')!;
  return { line: box.firstElementChild!.getBoundingClientRect().top, start: box.getBoundingClientRect().top, scrollTop: box.scrollTop };
};

test.describe('expectAnchored', () => {
  test('finds a first line that leaves the start of its box while the box grows', async ({ page }) => {
    await stage(page, growBox('hidden'));
    const seen = await sampleFrames(page.locator('#stage'), () => grow(page), { probe: lines });
    // The scroll is 20 px where the act's own layout started the motion. An engine that starts a motion at once (WebKit)
    // may grow the box a little before the frame that holds it, and a box that grows scrolls back: the time goes back to
    // the start, the scroll does not. So 20 px or a little less, never 0.
    expect(() => expectAnchored(seen, 'line', 'start')).toThrow(/frame 0 \(0\.0 ms\): line − start = -[1-9]/);
    expect(() => expectAnchored(seen, 'scrollTop', 0)).toThrow(/frame 0 \(0\.0 ms\): scrollTop − 0 = [1-9]/);
  });

  test('passes a first line that keeps its place', async ({ page }) => {
    await stage(page, growBox('clip'));
    const seen = await sampleFrames(page.locator('#stage'), () => grow(page), { probe: lines });
    expectAnchored(seen, 'line', 'start');
    expectAnchored(seen, 'scrollTop', 0);
    expectAnimated(seen, { element: 'div#box:0', property: 'height' });
  });
});

test.describe('expectAnimated', () => {
  test('finds a change made in one frame, and passes one that moves', async ({ page }) => {
    await stage(page, BAR.replace('transition: inline-size 300ms linear', 'transition: none'));
    const instant = await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth });
    expect(() => expectAnimated(instant, 'width')).toThrow(/probe width changes in 1 frame\(s\), fewer than 4: 100 → 200/);

    await stage(page, BAR);
    const moving = await sampleFrames(page.locator('#stage'), () => widen(page), { probe: barWidth });
    expectAnimated(moving, 'width');
    expectAnimated(moving, { element: /div#bar:0$/, property: 'width' }, { minSteps: 17 });
  });

  // A box that grows to its content's height with a motion of its own, as a multi-line field does: it is given an
  // explicit height while it moves (from where it stands, even mid-way), and its own back when the motion ends. The
  // hasty handler takes the end from any `transitionend` or `transitioncancel`: the cancel of the motion that a second
  // change cut short arrives a frame later, and ends the new motion at once. The careful one ends it only when no
  // motion of its height is left.
  const RESIZE = (careful: boolean) => `(() => {
    const box = document.querySelector('#grow');
    const content = box.firstElementChild;
    window.resize = (to) => {
      box.style.blockSize = box.getBoundingClientRect().height + 'px';
      getComputedStyle(box).blockSize;
      content.style.blockSize = to + 'px';
      box.setAttribute('data-resizing', '');
      box.style.blockSize = to + 'px';
    };
    const end = () => {
      if (${careful} && box.getAnimations().some((a) => a.transitionProperty === 'block-size' || a.transitionProperty === 'height')) return;
      box.removeAttribute('data-resizing');
      box.style.blockSize = '';
    };
    box.addEventListener('transitioncancel', end);
    box.addEventListener('transitionend', end);
  })()`;
  const GROW = '<style>#grow[data-resizing] { transition: block-size 200ms linear; }</style><div id="grow" style="inline-size: 10px; overflow: clip; background: rgb(0, 0, 0)"><div style="block-size: 40px"></div></div>';
  const height: Probe = (root) => ({ height: root.querySelector('#grow')!.getBoundingClientRect().height });
  /** Two changes a moment apart: a line, and the next one before the first has moved. */
  const twice = (page: Page) => async () => {
    await page.evaluate(() => (window as unknown as { resize: (to: number) => void }).resize(60));
    await twoFrames(page);
    await page.evaluate(() => (window as unknown as { resize: (to: number) => void }).resize(80));
  };

  test('finds a motion that the cancel of the one before it ends at once', async ({ page }) => {
    await stage(page, GROW);
    await page.evaluate(RESIZE(false));
    const seen = await sampleFrames(page.locator('#stage'), twice(page), { probe: height });
    expect(seen.rest.probe.height).toBe(80);
    expect(() => expectAnimated(seen, 'height')).toThrow(/probe height changes in 1 frame\(s\), fewer than 4: 40 → 80/);
  });

  test('passes the motion when the handler ends only its own', async ({ page }) => {
    await stage(page, GROW);
    await page.evaluate(RESIZE(true));
    const seen = await sampleFrames(page.locator('#stage'), twice(page), { probe: height });
    expect(seen.rest.probe.height).toBe(80);
    expectAnimated(seen, 'height', { minSteps: 12 });
  });
});

test.describe('freezeFirstFrame', () => {
  test('holds an entrance at its start for a screenshot, in every engine, until it is released', async ({ page }) => {
    await stage(page, '<div id="panel" style="position: absolute; left: 20px; top: 20px; inline-size: 40px; block-size: 40px; background: rgb(255, 0, 0); opacity: 0; transition: opacity 300ms linear"></div>');
    const opacity: Probe = (root) => ({ opacity: getComputedStyle(root.querySelector('#panel')!).opacity });
    const clip = { x: 20, y: 20, width: 40, height: 40 };
    const centre = async () => {
      const picture = decodePng(await page.screenshot({ clip }));
      return picture.at(picture.width / 2, picture.height / 2);
    };
    const frozen = await freezeFirstFrame(page.locator('#stage'), () => page.locator('#panel').evaluate((el: HTMLElement) => (el.style.opacity = '1')), { probe: opacity });
    expect(frozen.frame.probe.opacity).toBe('0');
    expect(await centre()).toBe('rgb(255, 255, 255)');
    await twoFrames(page);
    await expect(page.locator('#panel')).toHaveCSS('opacity', '0');
    await frozen.release();
    await motionEnded(page.locator('#stage'));
    await expect(page.locator('#panel')).toHaveCSS('opacity', '1');
    expect(await centre()).toBe('rgb(255, 0, 0)');
  });
});

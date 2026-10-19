// The motion primitives (src/primitives/motion.ts, src/styles/motion.ts), held to docs/architecture/motion.md on pages
// of their own: small elements made with Lit that compose them, and the package's tokens. No component uses them yet;
// what they promise is proved here once, in every engine, at moments that are the same on any machine — a motion is
// read frame by frame from a held clock (test/frames.ts), held where a test turns it round, or counted by the
// `transitionrun` the engine sends for it; the page clock is held where "no timer" is the claim.
//
//   appearStyles + AppearController   the first frame of an entrance is its start; turned round in the middle of
//                                     either motion it goes on from the value shown (MOT-2); `exit()` resolves when
//                                     the exit's transitions have finished and on nothing else (no timer); an overlay
//                                     mounted open before the document's first paint appears at once, after it enters
//                                     (MOT-4); reduced motion is a cross-fade (MOT-6); `unfold` scales one axis
//   AnimatedSize                      the content stays at its anchor edge and nothing scrolls while the box moves
//                                     (MOT-5); a change in the middle goes on as one motion, never cut short; at once
//                                     where it must be
//   Settle                            no transition in an element's first frames (MOT-3), its delayed ones included
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { buildSync } from 'esbuild';
import { type Frames, type Probe, expectAnchored, expectAnimated, expectFirstFrameAtRest, expectNoFlicker, sampleFrames } from '../../test/frames.js';
import { rootTokens } from '../../test/harness.js';
import { EVERY_ANIMATION } from '../../test/motions.js';
import { holdClock } from '../../test/page-clock.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
const PAGE = 'http://motion.test/';

/** The primitives as they are built, with Lit, as one module a page can import. */
let bundled: string | undefined;
const motionModule = () =>
  (bundled ??= buildSync({
    stdin: {
      contents: "export * from './dist/primitives/motion.js';\nexport * from './dist/styles/motion.js';\nexport { LitElement, css, html, unsafeCSS } from 'lit';\n",
      resolveDir: pkg,
      loader: 'js',
    },
    bundle: true,
    write: false,
    format: 'esm',
  }).outputFiles[0]!.text);

/**
 * The elements the tests use, each composing the primitives as a component will:
 *
 *   <x-appear>    a surface that appears from its centre (role modal), with Settle; a row inside it writes its state
 *                 after the first render (a state written late, which settling must draw without a motion)
 *   <x-anchored>  one that appears from its anchor (role anchored, `data-side` from the `side` attribute), starting
 *                 8 px toward it (a test layer's own appearance, `--x-appear-*`), so that a side changed while it
 *                 leaves replaces the exit's transitions
 *   <x-size>      a box of `lines` lines of 20 px that follows them (AnimatedSize); the last line is scrolled into view
 *                 after each change, as a caret on a new line is
 *   <x-settle>    an element that writes a state after its first render and again in the next frame, with Settle;
 *                 <x-unsettled> the same without it
 *
 * Each keeps the transitions that begin in its shadow root (`runs`, `<class>:<property>`).
 */
const ELEMENTS = `
import { LitElement, html, css, unsafeCSS, appearStyles, AppearController, AnimatedSize, Settle, settleStyles, afterFirstPaint, documentPainted } from '/motion.js';
window.__motion = { afterFirstPaint, documentPainted };
const kept = (Base) => class extends Base {
  createRenderRoot() {
    const root = super.createRenderRoot();
    this.runs = [];
    root.addEventListener('transitionrun', (event) => this.runs.push(event.target.classList[0] + ':' + event.propertyName));
    return root;
  }
};
const surface = css\`
  :host { display: block; }
  .surface { position: absolute; inset-block-start: 100px; inset-inline-start: 100px; }
  .box { inline-size: 120px; block-size: 80px; background: rgb(0, 0, 255); }
  .row { block-size: 20px; background: rgb(255, 0, 0); transition: background-color var(--tanrei-sys-motion-role-state-default) linear; }
  .row[data-on] { background: rgb(0, 128, 0); }
\`;
class Appearing extends kept(LitElement) {
  static properties = { open: { type: Boolean }, side: {} };
  appear = new AppearController(this, { motion: () => this.renderRoot.querySelector('.motion') });
  constructor() { super(); this.open = false; this.side = 'bottom'; }
  render() {
    return html\`<div class=\${this.open ? 'surface open' : 'surface'} data-side=\${this.side}><div class="motion"><div class="box"><div class="row"></div></div></div></div>\`;
  }
  updated(changed) {
    // A state written after the first render, once the row was styled (a component that measures and then writes).
    const row = this.renderRoot.querySelector('.row');
    void row.offsetWidth;
    row.setAttribute('data-on', '');
    if (!changed.has('open')) return;
    if (this.open) this.appear.enter();
    else if (changed.get('open') !== undefined) this.left = this.appear.exit();
  }
}
customElements.define('x-appear', class extends Appearing {
  static styles = [surface, appearStyles({ motion: '.motion', open: '.surface.open', role: 'modal', origin: 'center' }), settleStyles];
  settle = new Settle(this);
});
customElements.define('x-anchored', class extends Appearing {
  static styles = [
    surface,
    css\`:host { --x-appear-opacity: 0; --x-appear-scale: 0.96; --x-appear-distance: 8px; --x-appear-blur: 0px; --x-appear-origin: anchor; }\`,
    appearStyles({ motion: '.motion', open: '.surface.open', role: 'anchored', origin: 'anchor', appear: '--x-appear' }),
  ];
});
customElements.define('x-size', class extends kept(LitElement) {
  static properties = { lines: { type: Number }, anchor: {}, axis: {}, text: {} };
  static styles = css\`
    :host { display: block; font: 16px/20px sans-serif; }
    .box { background: rgb(240, 240, 240); }
    :host([axis='inline']) .box { display: inline-block; white-space: nowrap; }
    :host([axis='inline']) .content { display: inline-block; }
    .line { block-size: 20px; background: rgb(0, 0, 0); color: rgb(255, 255, 255); }
  \`;
  size = new AnimatedSize(this, {
    box: () => this.renderRoot.querySelector('.box'),
    content: () => this.renderRoot.querySelector('.content'),
    anchor: () => this.anchor ?? 'auto',
    axis: this.getAttribute('axis') ?? 'block',
    still: () => this.still === true,
  });
  constructor() { super(); this.lines = 2; this.text = 'ab'; }
  render() {
    const lines = Array.from({ length: this.lines }, (_, i) => html\`<div class="line">\${this.text} \${i}</div>\`);
    return html\`<div class="box"><div class="content">\${lines}</div></div>\`;
  }
  updated(changed) {
    if (!this.hasUpdated || (!changed.has('lines') && !changed.has('text'))) return;
    if (changed.get('lines') === undefined && changed.get('text') === undefined) return;
    this.size.fit(this.animate !== false);
    this.renderRoot.querySelector('.line:last-child')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
});
const late = css\`
  :host { display: block; }
  .mark { block-size: 20px; background: rgb(255, 0, 0); transition: background-color var(--tanrei-sys-motion-role-state-default) linear; }
  .mark[data-on] { background: rgb(0, 128, 0); }
  .delayed { block-size: 20px; color: rgb(255, 0, 0); transition: color 0s linear var(--tanrei-sys-motion-role-state-default); }
  .delayed[data-on] { color: rgb(0, 128, 0); }
  .carrier { transition-property: none; transition-delay: var(--tanrei-sys-motion-duration-press-hold); }
\`;
class Late extends kept(LitElement) {
  render() { return html\`<div class="mark"></div><div class="delayed">d</div><span class="carrier"></span>\`; }
  firstUpdated() {
    // Measured, then written: the state's change follows a style, so it would move.
    const mark = this.renderRoot.querySelector('.mark');
    void mark.offsetWidth;
    mark.setAttribute('data-on', '');
    requestAnimationFrame(() => this.renderRoot.querySelector('.delayed').setAttribute('data-on', ''));
  }
}
customElements.define('x-settle', class extends Late {
  static styles = [late, settleStyles];
  settle = new Settle(this);
});
customElements.define('x-unsettled', class extends Late {
  static styles = [late];
});
`;

/** A page of the package's tokens with `body` in it and the elements defined by a module script at its end. */
async function open(page: Page, body: string, { head = '', html = '' }: { head?: string; html?: string } = {}) {
  await page.unroute(`${PAGE}**`);
  await page.route(`${PAGE}**`, (route) =>
    route.request().url().endsWith('/motion.js')
      ? route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: motionModule() })
      : route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><html lang="en" ${html}><head><meta charset="utf-8"><title>motion</title><style>${read('dist/tokens.css')}</style>${head}<style>body { margin: 0; font: 16px/20px sans-serif; } #stage { position: relative; block-size: 400px; }</style></head><body>${body}<script type="module">${ELEMENTS}</script></body></html>`,
        }),
  );
  await page.goto(PAGE);
  await page.waitForFunction(() => customElements.get('x-size') !== undefined);
}

/** The document has been painted once (as the module sees it), and two frames more have been drawn. */
const painted = (page: Page) =>
  page.evaluate(async () => {
    await (window as unknown as { __motion: { afterFirstPaint(): Promise<void> } }).__motion.afterFirstPaint();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

/** Two frames drawn. */
const frames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

const runs = (host: Locator) => host.evaluate((el) => [...(el as Element & { runs: string[] }).runs]);

/**
 * Holds every motion in `host`'s shadow root at `fraction` of its duration (paused there, so it stays where it is
 * however long the test takes), after a frame has started it. A motion the page holds is the page's: test/frames.ts
 * leaves it where it is, and what the next change starts is sampled from there.
 */
const holdAt = (host: Locator, fraction: number, { frame = true }: { frame?: boolean } = {}) =>
  host.evaluate(
    async (el, [source, at, wait]) => {
      if (wait) await new Promise((resolve) => requestAnimationFrame(resolve));
      const every = (0, eval)(source as string) as (root: ShadowRoot) => Animation[];
      for (const animation of every(el.shadowRoot!)) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) * (at as number);
      }
    },
    [EVERY_ANIMATION, fraction, frame] as const,
  );

/** Every motion in `host`'s shadow root played to its end at once — but those of the property `except`. */
const finishAll = (host: Locator, except = '') =>
  host.evaluate(
    (el, [source, kept]) => {
      const every = (0, eval)(source) as (root: ShadowRoot) => Animation[];
      for (const animation of every(el.shadowRoot!)) if (!kept || (animation as CSSTransition).transitionProperty !== kept) animation.finish();
    },
    [EVERY_ANIMATION, except] as const,
  );

/** The motion element of the surface in `root`: its opacity, its scale on each axis and its translation on the block axis. */
const surfaceProbe: Probe = (root) => {
  const motion = root.querySelector('x-appear, x-anchored')?.shadowRoot?.querySelector('.motion');
  if (!motion) return {};
  const style = getComputedStyle(motion);
  const [sx = '1', sy = sx] = style.scale === 'none' ? [] : style.scale.split(' ');
  const [, ty = '0px'] = style.translate === 'none' ? [] : style.translate.split(' ');
  return { opacity: Number(style.opacity), sx: Number(sx), sy: Number(sy), ty: Number.parseFloat(ty) };
};

const series = (seen: Frames, name: string) => [...seen.frames, seen.rest].map((frame) => Number(frame.probe[name]));

/**
 * What `name` of the probe takes over the frames of an entrance into a surface the act inserted (before the act there
 * is nothing to read, so `expectAnimated` does not apply): it moves over at least `least` frames.
 */
function expectEntered(seen: Frames, name: string, least = 4) {
  const values = series(seen, name);
  const steps = values.filter((value, i) => i > 0 && value !== values[i - 1]).length;
  expect(steps, `${name} changes in ${steps} frame(s): ${values.join(' → ')}`).toBeGreaterThanOrEqual(least);
}

test.describe('appearStyles and AppearController', () => {
  test('MOT-4: an overlay in the page\'s markup with open is open in the first frame, and no entrance runs — nor any transition into a state its contents write late (MOT-3)', async ({ page }) => {
    await open(page, '<div id="stage"><x-appear id="a" open></x-appear></div>');
    await painted(page);
    const host = page.locator('#a');
    expect(await runs(host)).toEqual([]);
    const motion = host.locator('.motion');
    await expect(motion).toHaveCSS('opacity', '1');
    await expect(motion).toHaveCSS('scale', 'none');
    await expect(motion).toHaveAttribute('data-tanrei-appear', '');
    await expect(host.locator('.row')).toHaveCSS('background-color', 'rgb(0, 128, 0)');
  });

  test('MOT-4: an overlay mounted open after the first paint plays its entrance from the start (opacity and scale from the appear tokens), while what is inside it settles', async ({ page }) => {
    await open(page, '<div id="stage"></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const seen = await sampleFrames(stage, () => stage.evaluate((el) => el.insertAdjacentHTML('beforeend', '<x-appear id="a" open></x-appear>')), { probe: surfaceProbe });
    expect(seen.frames[0]!.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96 });
    expect(seen.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1 });
    expectEntered(seen, 'opacity');
    expectEntered(seen, 'sx');
    expectNoFlicker(seen);
    // The entrance is the role's (modal: 350 ms under the default system) on the enter curve; the row's late state is no motion.
    const opacity = seen.motions.find((motion) => motion.name === 'opacity')!;
    expect(opacity).toMatchObject({ on: 'div.motion', duration: 350 });
    expect(seen.motions.filter((motion) => motion.on.startsWith('div.row'))).toEqual([]);
    expect(await runs(page.locator('#a'))).toEqual(expect.arrayContaining(['motion:opacity', 'motion:scale']));
    expect((await runs(page.locator('#a'))).filter((run) => run.startsWith('row:'))).toEqual([]);
  });

  test('an entrance begun at the end of a task that outlasts it starts in the first frame drawn after that task: none of it is over before it is drawn', async ({ page }) => {
    // WebKit dates a transition from the frame drawn last, which stands still while a task runs: a combobox's list,
    // opened by a key whose task rendered its rows for 200–340 ms on a two-core runner, had its 300 ms entrance over
    // before its first frame, dropped without a transition event. The task here is held for longer than the entrance
    // (modal: 350 ms under the default system) and the first frame after it is read in its frame callback, as drawn.
    await open(page, '<div id="stage"><x-appear id="a"></x-appear></div>');
    await painted(page);
    const host = page.locator('#a');
    const first = await host.evaluate(async (el) => {
      const appear = el as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
      const motion = el.shadowRoot!.querySelector('.motion')!;
      appear.open = true;
      await appear.updateComplete;
      const end = performance.now() + 500;
      while (performance.now() < end);
      return new Promise<{ opacity: number; scale: string }>((resolve) =>
        requestAnimationFrame(() => {
          const style = getComputedStyle(motion);
          resolve({ opacity: Number(style.opacity), scale: style.scale });
        }),
      );
    });
    expect(first, 'the first frame after the task draws the entrance at its start').toEqual({ opacity: 0, scale: '0.96' });
    await expect(host.locator('.motion')).toHaveCSS('opacity', '1');
    expect(await runs(host)).toEqual(expect.arrayContaining(['motion:opacity', 'motion:scale']));
  });

  test('MOT-2: an entrance turned round goes on from the value shown, and back again; the exit that was turned round resolves false', async ({ page, browserName }) => {
    // Firefox starts a transition that replaces one a script holds (paused and set to a time) from the held one's value
    // at the timeline's time, not at the time it was held at: held at 40 % of a linear fade drawn at 0.4, the fade that
    // replaces it starts from 0.003 to 0.12 (measured). A running motion turned round starts from its value at the
    // moment of the change there too, which a test can only hold by holding it. So in Firefox the start is not compared
    // with the value held; the rest — one continuous motion from wherever it starts, to the closed or the open state —
    // is held in every engine.
    const exact = browserName !== 'firefox';
    await open(page, '<div id="stage"><x-appear id="a"></x-appear></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#a');
    // Opened, and held 40 % of the way in.
    await host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = true));
    await holdAt(host, 0.4);
    const out = await sampleFrames(stage, () => host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = false)), { probe: surfaceProbe });
    const shown = Number(out.before.probe.opacity);
    expect(shown, 'held part of the way in').toBeGreaterThan(0.2);
    expect(shown).toBeLessThan(0.98);
    if (exact) {
      expect(Number(out.frames[0]!.probe.opacity), 'the exit starts from the opacity shown').toBeCloseTo(shown, 2);
      expect(Number(out.frames[0]!.probe.sx)).toBeCloseTo(Number(out.before.probe.sx), 3);
    }
    expect(out.rest.probe).toMatchObject({ opacity: 0, sx: 0.96 });
    expectNoFlicker(out);
    expectAnimated(out, 'opacity', { minSteps: 4 });
    expect(await host.evaluate((el: HTMLElement & { left: Promise<boolean> }) => el.left), 'the exit played to its end').toBe(true);
    // Open again, closed, held 40 % of the way out, and opened: back up from where it is.
    await host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = true));
    await finishAll(host);
    await host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = false));
    await holdAt(host, 0.4);
    const back = await sampleFrames(stage, () => host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = true)), { probe: surfaceProbe });
    const left = Number(back.before.probe.opacity);
    expect(left).toBeGreaterThan(0.02);
    expect(left).toBeLessThan(0.98);
    if (exact) expect(Number(back.frames[0]!.probe.opacity), 'the entrance starts from the opacity shown').toBeCloseTo(left, 2);
    expect(back.rest.probe).toMatchObject({ opacity: 1, sx: 1 });
    expectNoFlicker(back);
    expectAnimated(back, 'opacity', { minSteps: 4 });
    expect(await host.evaluate((el: HTMLElement & { left: Promise<boolean> }) => el.left), 'an exit turned round did not leave').toBe(false);
  });

  test('exit() resolves when the exit\'s transitions have finished, on a held page clock (no timer, no frame callback), and not before', async ({ page }) => {
    await open(page, '<div id="stage"><x-appear id="a" open></x-appear></div>');
    await painted(page);
    const host = page.locator('#a');
    await holdClock(page);
    await host.evaluate((el: HTMLElement & { open: boolean; left: Promise<boolean>; settledAs?: boolean }) => {
      el.open = false;
      void el.updateComplete.then(() => el.left.then((left) => (el.settledAs = left)));
    });
    // Held half way out: the exit has not finished, and nothing has resolved it.
    await holdAt(host, 0.5, { frame: false });
    await host.evaluate(() => new Promise((resolve) => queueMicrotask(() => resolve(null))));
    expect(await host.evaluate((el: HTMLElement & { settledAs?: boolean }) => el.settledAs), 'still leaving').toBeUndefined();
    await finishAll(host);
    expect(await host.evaluate(async (el: HTMLElement & { left: Promise<boolean> }) => el.left)).toBe(true);
  });

  test('exit() waits for the transitions that replace its own: the side it leaves toward changed while it ran', async ({ page }) => {
    await open(page, '<div id="stage"><x-anchored id="a" open></x-anchored></div>');
    await painted(page);
    const host = page.locator('#a');
    await host.evaluate((el: HTMLElement & { open: boolean; left: Promise<boolean>; settledAs?: boolean }) => {
      el.open = false;
      void el.updateComplete.then(() => el.left.then((left) => (el.settledAs = left)));
    });
    await holdAt(host, 0.5);
    // Moved to the other side: the translation it leaves along is replaced (from where it is, toward the new side)…
    await host.evaluate(async (el: HTMLElement & { side: string; updateComplete: Promise<unknown> }) => {
      el.side = 'top';
      await el.updateComplete;
    });
    await expect(host.locator('.motion')).not.toHaveCSS('translate', 'none');
    // …and while that one still runs (held), the others finish: the exit has not.
    await holdAt(host, 0.5);
    await finishAll(host, 'translate');
    await frames(page);
    expect(await host.evaluate((el: HTMLElement & { settledAs?: boolean }) => el.settledAs), 'still leaving while the new translation runs').toBeUndefined();
    await finishAll(host);
    expect(await host.evaluate(async (el: HTMLElement & { left: Promise<boolean> }) => el.left)).toBe(true);
  });

  test('an anchored surface starts toward its anchor and grows from the edge that faces it; under unfold (m3-like) it scales along the one axis that leaves the anchor', async ({ page }) => {
    await open(page, '<div id="stage"></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const below = await sampleFrames(stage, () => stage.evaluate((el) => el.insertAdjacentHTML('beforeend', '<x-anchored id="a" open></x-anchored>')), { probe: surfaceProbe });
    expect(below.frames[0]!.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96, ty: -8 });
    await expect(page.locator('#a .motion')).toHaveCSS('transform-origin', '60px 0px');
    await stage.evaluate((el) => (el.innerHTML = ''));
    const above = await sampleFrames(stage, () => stage.evaluate((el) => el.insertAdjacentHTML('beforeend', '<x-anchored id="b" side="top" open></x-anchored>')), { probe: surfaceProbe });
    expect(above.frames[0]!.probe).toMatchObject({ ty: 8 });
    await expect(page.locator('#b .motion')).toHaveCSS('transform-origin', '60px 80px');

    await open(page, '<div id="stage"></div>', { head: `<style>${read('dist/systems/m3-like.css')}</style>`, html: 'data-tanrei-system="m3-like"' });
    await painted(page);
    const unfolded = await sampleFrames(stage, () => stage.evaluate((el) => el.insertAdjacentHTML('beforeend', '<x-appear id="c" open></x-appear><x-anchored id="d" open style="--x-appear-scale: var(--tanrei-sys-motion-appear-scale); --x-appear-distance: 0px"></x-anchored>')), {
      probe: (root) => {
        const read = (tag: string) => {
          const motion = root.querySelector(tag)?.shadowRoot?.querySelector('.motion');
          if (!motion) return '';
          const [x = '1', y = x] = getComputedStyle(motion).scale.replace('none', '').split(' ').filter(Boolean);
          return `${Number(x)} ${Number(y)}`;
        };
        return { centre: read('x-appear'), anchored: read('x-anchored') };
      },
    });
    // From the centre both axes unfold; below an anchor the width is whole and the height unfolds from 0.
    expect(unfolded.frames[0]!.probe).toEqual({ centre: '0 0', anchored: '1 0' });
  });

  test('enter(true) and exit(true) are made at once: no transition runs, and exit(true) resolves in the task that asks for it', async ({ page }) => {
    await open(page, '<div id="stage"><x-appear id="a"></x-appear></div>');
    await painted(page);
    const host = page.locator('#a');
    // Open and closed at once, each read in the task that asks: whole, then where it starts.
    // The open state written as a component writes it, and the controller told at once: whole, then where it starts —
    // each read in the task that asks, before anything has resolved.
    const seen = await host.evaluate(async (el: HTMLElement & { appear: { enter(at: boolean): void; exit(at: boolean): Promise<boolean> } }) => {
      const surface = el.shadowRoot!.querySelector('.surface')!;
      const motion = el.shadowRoot!.querySelector('.motion')!;
      surface.classList.add('open');
      el.appear.enter(true);
      const opened = [getComputedStyle(motion).opacity, getComputedStyle(motion).scale];
      surface.classList.remove('open');
      const leaving = el.appear.exit(true);
      const closed = [getComputedStyle(motion).opacity, getComputedStyle(motion).scale];
      return { opened, closed, settled: await leaving };
    });
    expect(seen).toEqual({ opened: ['1', 'none'], closed: ['0', '0.96'], settled: true });
    await frames(page);
    expect((await runs(host)).filter((run) => run.startsWith('motion:'))).toEqual([]);
  });

  test('drawAtOnce(): a surface placed on another side after its style was read starts its entrance from that side, not from the one its style gave it before', async ({ page }) => {
    await open(page, '<div id="stage"><x-anchored id="a"></x-anchored></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#a');
    // Read for its size below its anchor (as a placement reads it), then placed above it, then opened: in one task.
    const place = (drawn: boolean) =>
      host.evaluate((el: HTMLElement & { open: boolean; appear: { drawAtOnce(): void } }, draw) => {
        const surface = el.shadowRoot!.querySelector('.surface') as HTMLElement;
        void getComputedStyle(el.shadowRoot!.querySelector('.motion')!).translate;
        surface.dataset.side = 'top';
        if (draw) el.appear.drawAtOnce();
        el.open = true;
      }, drawn);
    const placed = await sampleFrames(stage, () => place(true), { probe: surfaceProbe });
    expect(placed.frames[0]!.probe).toMatchObject({ opacity: 0, ty: 8 });
    expectNoFlicker(placed);
    // Without it, the entrance starts from the side it was read on: moving across its anchor (the old code's frame).
    await host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = false));
    await finishAll(host);
    await host.evaluate((el: HTMLElement) => ((el.shadowRoot!.querySelector('.surface') as HTMLElement).dataset.side = 'bottom'));
    // (Closed, it moves to the start of its new side: that too is played to its end.)
    await frames(page);
    await finishAll(host);
    await frames(page);
    const unplaced = await sampleFrames(stage, () => place(false), { probe: surfaceProbe });
    expect(Number(unplaced.frames[0]!.probe.ty)).toBeLessThan(0);
  });

  test('keep(): a surface taken out of the top layer and put back while it leaves goes on from the value shown when it is opened again, not from its start', async ({ page }) => {
    await open(page, '<div id="stage"><x-appear id="a" open></x-appear></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#a');
    await host.evaluate((el: HTMLElement & { open: boolean }) => (el.open = false));
    await holdAt(host, 0.5);
    const shown = Number(await host.locator('.motion').evaluate((el) => getComputedStyle(el).opacity));
    expect(shown).toBeGreaterThan(0.2);
    expect(shown).toBeLessThan(0.98);
    // Out of the layout and back (as `hidePopover()` and `showPopover()` take a popover out and put it back), then opened.
    const back = await sampleFrames(
      stage,
      () =>
        host.evaluate((el: HTMLElement & { open: boolean; appear: { keep(during: () => void): void } }) => {
          const surface = el.shadowRoot!.querySelector('.surface') as HTMLElement;
          el.appear.keep(() => {
            surface.style.display = 'none';
            void surface.offsetWidth;
            surface.style.display = '';
          });
          el.open = true;
        }),
      { probe: surfaceProbe },
    );
    expect(Number(back.frames[0]!.probe.opacity), 'the entrance starts from the opacity shown').toBeCloseTo(shown, 1);
    expect(back.rest.probe).toMatchObject({ opacity: 1, sx: 1 });
    expectNoFlicker(back);
  });

  test('MOT-6: under reduced motion an appearance is a cross-fade over role.reduced, with no scale and no distance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '<div id="stage"></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const seen = await sampleFrames(stage, () => stage.evaluate((el) => el.insertAdjacentHTML('beforeend', '<x-anchored id="a" open></x-anchored>')), { probe: surfaceProbe });
    expect(seen.frames[0]!.probe).toMatchObject({ opacity: 0, sx: 1, sy: 1, ty: 0 });
    expect(seen.motions.filter((motion) => motion.on === 'div.motion').map((motion) => [motion.name, motion.duration])).toEqual([['opacity', 100]]);
    expectEntered(seen, 'opacity');
  });
});

/** The box of `<x-size>` in `root`: its edges, its first and last lines' edges, its first line's inline start, and its scroll. */
const sizeProbe: Probe = (root) => {
  const host = root.querySelector('x-size')!;
  const box = host.shadowRoot!.querySelector('.box')!;
  const lines = host.shadowRoot!.querySelectorAll('.line');
  const b = box.getBoundingClientRect();
  const first = lines[0]!.getBoundingClientRect();
  const last = lines[lines.length - 1]!.getBoundingClientRect();
  const content = host.shadowRoot!.querySelector('.content')!.getBoundingClientRect();
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height, width: b.width, first: first.top, last: last.bottom, contentLeft: content.left, contentRight: content.right, scrollTop: box.scrollTop, scrollLeft: box.scrollLeft };
};

const setLines = (host: Locator, lines: number) => host.evaluate((el: HTMLElement & { lines: number }, n) => (el.lines = n), lines);

/** The steps of a series, as fractions of the whole change: none is more than `most` of it, and none goes back. */
function expectOneMotion(values: number[], most = 0.35) {
  const total = values.at(-1)! - values[0]!;
  const steps = values.slice(1).map((value, i) => (value - values[i]!) / total);
  expect(steps.every((step) => step >= -0.001), `it never goes back: ${values.join(' → ')}`).toBe(true);
  expect(Math.max(...steps), `no step is more than ${most * 100} % of the change: ${values.join(' → ')}`).toBeLessThanOrEqual(most);
}

test.describe('AnimatedSize', () => {
  test('MOT-5: a box that grows and shrinks keeps its first line at its top, scrolls nothing (a line scrolled into view included) and moves in its layout', async ({ page }) => {
    await open(page, '<div id="stage"><x-size id="s"></x-size><div id="after" style="block-size: 10px; background: rgb(0, 0, 0)"></div></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#s');
    const probe: Probe = (root) => {
      const box = root.querySelector('x-size')!.shadowRoot!.querySelector('.box')!;
      const line = root.querySelector('x-size')!.shadowRoot!.querySelector('.line')!;
      return { top: box.getBoundingClientRect().top, bottom: box.getBoundingClientRect().bottom, height: box.getBoundingClientRect().height, first: line.getBoundingClientRect().top, scrollTop: box.scrollTop, after: root.querySelector('#after')!.getBoundingClientRect().top };
    };
    const grown = await sampleFrames(stage, () => setLines(host, 5), { probe });
    expect(grown.rest.probe.height).toBe(100);
    expectAnchored(grown, 'first', 'top');
    expectAnchored(grown, 'scrollTop', 0);
    // What stands after the box follows its edge in every frame: its size changes in its layout.
    expectAnchored(grown, 'after', 'bottom');
    expectAnimated(grown, 'height', { minSteps: 4 });
    expectNoFlicker(grown);
    expect(grown.motions.map((motion) => [motion.name, motion.duration])).toEqual([[expect.stringMatching(/^(block-size|height)$/), 300]]);
    const shrunk = await sampleFrames(stage, () => setLines(host, 1), { probe });
    expect(shrunk.rest.probe.height).toBe(20);
    expectAnchored(shrunk, 'first', 'top');
    expectAnchored(shrunk, 'scrollTop', 0);
    expectAnimated(shrunk, 'height', { minSteps: 4 });
    expectNoFlicker(shrunk);
    await expect(host.locator('.box')).not.toHaveAttribute('data-resizing');
    expect(await host.locator('.box').evaluate((box: HTMLElement) => box.style.cssText), 'nothing is left written on the box').toBe('');
  });

  test('MOT-5: docked to its container\'s end, the box keeps its content at its end edge (anchor auto) — or at its start, asked for', async ({ page }) => {
    const docked = '<div id="stage" style="display: flex; flex-direction: column; justify-content: flex-end; block-size: 300px"><x-size id="s"></x-size></div>';
    await open(page, docked);
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#s');
    const end = await sampleFrames(stage, () => setLines(host, 5), { probe: sizeProbe });
    expectAnchored(end, 'last', 'bottom');
    expectAnchored(end, 'bottom', 0);
    expectAnchored(end, 'scrollTop', 0);
    expectAnimated(end, 'top', { minSteps: 4 });
    expectNoFlicker(end);
    const shrunk = await sampleFrames(stage, () => setLines(host, 2), { probe: sizeProbe });
    expectAnchored(shrunk, 'last', 'bottom');
    expectAnchored(shrunk, 'scrollTop', 0);
    await host.evaluate((el: HTMLElement & { anchor: string }) => (el.anchor = 'start'));
    const start = await sampleFrames(stage, () => setLines(host, 5), { probe: sizeProbe });
    expectAnchored(start, 'first', 'top');
    expectAnchored(start, 'scrollTop', 0);
    expectAnimated(start, 'top', { minSteps: 4 });
  });

  test('a change while the box moves goes on from the size shown as one motion: the motion it replaces, and the late cancellation of its transition, end nothing', async ({ page }) => {
    await open(page, '<div id="stage"><x-size id="s"></x-size></div>');
    await painted(page);
    const stage = page.locator('#stage');
    const host = page.locator('#s');
    // 2 → 4 lines, held a third of the way.
    await setLines(host, 4);
    await holdAt(host, 1 / 3);
    const seen = await sampleFrames(stage, () => setLines(host, 6), { probe: sizeProbe });
    const heights = [Number(seen.before.probe.height), ...series(seen, 'height')];
    expect(heights[0], 'held part of the way').toBeGreaterThan(40);
    expect(heights[0]).toBeLessThan(80);
    expect(heights.at(-1)).toBe(120);
    expect(Number(seen.frames[0]!.probe.height), 'from the size shown').toBeCloseTo(heights[0]!, 1);
    expectOneMotion(heights);
    expectAnimated(seen, 'height', { minSteps: 8 });
    expectAnchored(seen, 'first', 'top');
    expectAnchored(seen, 'scrollTop', 0);
    expect(seen.complete).toBe(true);
  });

  test('fit(false) in the middle of a motion makes the change at once: the running transition is stopped, not left to hold the box', async ({ page }) => {
    await open(page, '<div id="stage"><x-size id="s"></x-size></div>');
    await painted(page);
    const host = page.locator('#s');
    await setLines(host, 4);
    await holdAt(host, 1 / 3);
    await host.evaluate(async (el: HTMLElement & { animate: boolean; lines: number; updateComplete: Promise<unknown> }) => {
      el.animate = false;
      el.lines = 5;
      await el.updateComplete;
    });
    await expect(host.locator('.box')).toHaveCSS('height', '100px');
    await frames(page);
    await expect(host.locator('.box')).toHaveCSS('height', '100px');
    await expect(host.locator('.box')).not.toHaveAttribute('data-resizing');
  });

  test('at once: under reduced motion (MOT-6), while still() answers true, and where the role takes no time', async ({ page }) => {
    for (const how of ['reduced', 'still', 'no time'] as const) {
      await page.emulateMedia({ reducedMotion: how === 'reduced' ? 'reduce' : 'no-preference' });
      await open(page, '<div id="stage"><x-size id="s"></x-size></div>');
      await painted(page);
      const host = page.locator('#s');
      if (how === 'still') await host.evaluate((el: HTMLElement & { still: boolean }) => (el.still = true));
      if (how === 'no time') await rootTokens(page, { '--tanrei-dial-motion-unit': '0ms' });
      const stage = page.locator('#stage');
      const seen = await sampleFrames(stage, () => setLines(host, 4), { probe: sizeProbe });
      expect(seen.motions, how).toEqual([]);
      expectFirstFrameAtRest(seen);
      expect(seen.rest.probe.height, how).toBe(80);
      await expect(host.locator('.box'), how).not.toHaveAttribute('data-resizing');
    }
  });

  test('on the inline axis the content keeps its place at the inline start, in either direction, and is not laid out again on the way', async ({ page }) => {
    for (const dir of ['ltr', 'rtl'] as const) {
      await open(page, `<div id="stage" dir="${dir}"><x-size id="s" axis="inline" lines="1"></x-size></div>`);
      await painted(page);
      const stage = page.locator('#stage');
      const host = page.locator('#s');
      const seen = await sampleFrames(stage, () => host.evaluate((el: HTMLElement & { text: string }) => (el.text = 'abcdefghijkl')), { probe: sizeProbe });
      expectAnimated(seen, 'width', { minSteps: 4 });
      if (dir === 'ltr') expectAnchored(seen, 'contentLeft', 'left');
      else expectAnchored(seen, 'contentRight', 'right');
      expectAnchored(seen, 'scrollLeft', 0);
      // The line is as tall as one line in every frame: it was never wrapped by the narrower box.
      expectAnchored(seen, 'last', 'first');
    }
  });
});

test.describe('Settle', () => {
  test('MOT-3: from its connection until two frames after its first update the host settles, and no transition starts in it — a delayed one included', async ({ page }) => {
    await open(page, '<div id="stage"></div>');
    await painted(page);
    const seen = await page.locator('#stage').evaluate(async (stage) => {
      const el = document.createElement('x-settle') as HTMLElement & { updateComplete: Promise<unknown> };
      stage.append(el);
      const connected = el.hasAttribute('data-tanrei-settling');
      await el.updateComplete;
      const updated = el.hasAttribute('data-tanrei-settling');
      const carrier = getComputedStyle(el.shadowRoot!.querySelector('.carrier')!).transitionDelay;
      // In each of the next four frames, whether it settles as the frame is drawn (read after the element's own callbacks).
      const drawn: boolean[] = [];
      await new Promise<void>((resolve) => {
        const tick = () => {
          drawn.push(el.hasAttribute('data-tanrei-settling'));
          if (drawn.length < 4) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return { connected, updated, drawn, carrier };
    });
    expect(seen).toMatchObject({ connected: true, updated: true });
    // The frame its first render is drawn in settles; the next is drawn without it.
    expect(seen.drawn).toEqual([true, false, false, false]);
    // The press-hold carrier keeps its delay while the host settles.
    expect(seen.carrier).not.toBe('0s');
    const host = page.locator('x-settle');
    expect(await runs(host)).toEqual([]);
    await expect(host.locator('.mark')).toHaveCSS('background-color', 'rgb(0, 128, 0)');
    await expect(host.locator('.delayed')).toHaveCSS('color', 'rgb(0, 128, 0)');
    // Settled, a change moves again.
    await host.evaluate((el) => el.shadowRoot!.querySelector('.mark')!.removeAttribute('data-on'));
    await expect.poll(() => runs(host)).toEqual(['mark:background-color']);
    // The same element without Settle: both late states move (what the test would see).
    const twin = page.locator('x-unsettled');
    await page.locator('#stage').evaluate((stage) => stage.append(document.createElement('x-unsettled')));
    await expect.poll(() => runs(twin)).toEqual(expect.arrayContaining(['mark:background-color', 'delayed:color']));
  });

  test('connected again, the host settles again', async ({ page }) => {
    await open(page, '<div id="stage"><x-settle id="s"></x-settle></div><div id="elsewhere"></div>');
    await painted(page);
    const host = page.locator('#s');
    await expect(host).not.toHaveAttribute('data-tanrei-settling');
    expect(await page.evaluate(() => {
      const el = document.querySelector('#s')!;
      document.querySelector('#elsewhere')!.append(el);
      return el.hasAttribute('data-tanrei-settling');
    })).toBe(true);
    await expect(host).not.toHaveAttribute('data-tanrei-settling');
  });

  test('settleRule(): the light DOM\'s rule holds everything inside the element while it settles', async ({ page }) => {
    await open(page, '<div id="stage"><x-light id="l"><div class="item"></div></x-light></div>', {
      head: '<style id="rule">.item { block-size: 20px; background: rgb(255, 0, 0); transition: background-color var(--tanrei-sys-motion-role-state-default) linear; } .item[data-on] { background: rgb(0, 128, 0); }</style>',
    });
    await painted(page);
    const changed = (settling: boolean) =>
      page.evaluate(async (on) => {
        const el = document.querySelector('#l')!;
        const item = el.querySelector('.item')!;
        const started: string[] = [];
        el.addEventListener('transitionrun', (event) => started.push((event as TransitionEvent).propertyName));
        el.toggleAttribute('data-tanrei-settling', on);
        item.toggleAttribute('data-on');
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        el.removeAttribute('data-tanrei-settling');
        return started;
      }, settling);
    await page.evaluate(async () => {
      const { settleRule } = (await import('/motion.js' as string)) as { settleRule(host: string): string };
      document.querySelector('#rule')!.textContent += settleRule('x-light');
    });
    expect(await changed(true)).toEqual([]);
    expect(await changed(false)).toEqual(['background-color']);
  });
});

// The motion demo as the built site draws it (components/visuals/MotionDemo.astro, lib/visuals/motion.client.ts): it
// plays the component's motion once when it comes into view and never again by itself; what moves lasts the
// duration its token resolves to on disk, and four times that in slow motion (a quarter of the speed), whether the
// component moves by a CSS transition (the switch) or by animations its script starts (the tabs' slide); and where the
// device asks for reduced motion it shows where the motion ends and nothing in the figure runs — its shadow trees
// included.
//
// What moves is read from the page as the play starts and for the frames after it, through every shadow root: each
// animation's length as it plays, its delay and active duration over its playback rate.
//
//   pnpm --filter @tanrei/docs build && node --test test/browser/motion-demo.test.mjs
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/motion-demo.test.mjs   # Chromium by default
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settle } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const json = (file) => JSON.parse(fs.readFileSync(path.join(docs, '../..', file), 'utf8'));
const NS = json('tanrei.config.json').namespace;
const light = json(`design/tokens/${NS}.light.tokens.json`);
/** A duration token of the default system, in milliseconds, as resolved on disk. */
const ms = (dotted) => {
  const value = `${NS}.${dotted}`.split('.').reduce((node, key) => node?.[key], light)?.$value;
  assert.equal(value?.unit, 'ms', `${dotted} is a duration in milliseconds`);
  return value.value;
};

const ENGINES = engines('chromium');
const VIEWPORT = { width: 1440, height: 900 };
const SLOW = 0.25;
/** Within a millisecond: a length the browser keeps as a double. */
const CLOSE = 1;

let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => {
  await host?.close();
});

const FRAME = (name) => `[data-motion-figure="${name}"]`;

/** The figure in view, its elements defined, two frames drawn, and its first play begun. */
async function inView(page, name) {
  await settle(page, FRAME(name), { scroll: 'center', pending: '[data-example-pending]' });
}

/**
 * Starts a play with `start` (a press of one of the frame's actions) and reads, from the play's beginning and for the
 * next twenty frames, every animation that runs in the figure's subject and its shadow trees: its kind, its name (the
 * property a transition carries, or the id a script gave it) and how long it plays — its delay and active duration
 * over its playback rate.
 */
const playAndRead = (page, name, action) =>
  page.evaluate(
    ([selector, action]) =>
      new Promise((resolve, reject) => {
        const frame = document.querySelector(selector);
        const subject = frame.querySelector('[data-motion]');
        const shadows = (root) => [...root.querySelectorAll('*')].flatMap((element) => (element.shadowRoot ? [element.shadowRoot, ...shadows(element.shadowRoot)] : []));
        const seen = new Map();
        const look = () => {
          for (const animation of [...subject.getAnimations({ subtree: true }), ...shadows(subject).flatMap((shadow) => shadow.getAnimations())]) {
            if (animation.playState !== 'running' || seen.has(animation)) continue;
            const timing = animation.effect.getComputedTiming();
            seen.set(animation, {
              kind: animation.constructor.name,
              name: animation.transitionProperty ?? animation.animationName ?? animation.id,
              plays: (Number(timing.delay) + Number(timing.activeDuration)) / Math.abs(animation.playbackRate),
            });
          }
        };
        const timer = setTimeout(() => reject(new Error('no play began')), 10_000);
        frame.addEventListener(
          'docs-motion-played',
          async () => {
            clearTimeout(timer);
            for (let n = 0; n < 20; n++) {
              look();
              await new Promise((done) => requestAnimationFrame(done));
            }
            resolve({ plays: Number(frame.dataset.motionPlays), animations: [...seen.values()] });
          },
          { once: true },
        );
        frame.querySelector(action).click();
      }),
    [FRAME(name), action],
  );

/** The demos measured: each by what of its play is the motion the demo names. */
const MEASURED = [
  {
    path: '/components/switch/',
    name: 'switch',
    duration: 'comp.switch.motion.selection-duration',
    // Every transition switching starts carries the progress over the selection motion.
    motion: (animation) => animation.kind === 'CSSTransition',
  },
  {
    path: '/components/tabs/',
    name: 'tabs',
    duration: 'comp.tabs.motion.indicator-duration',
    // The slide: animations the row's script starts, each named for it.
    motion: (animation) => animation.name === 'tanrei-tabs-slide',
  },
  {
    path: '/components/accordion/',
    name: 'accordion',
    duration: 'comp.accordion.motion.disclosure-duration',
    // The item's clock: the height itself moves on `::details-content`, which no engine lists among the animations.
    motion: (animation) => animation.name === '--_acc-open',
  },
];

for (const engine of ENGINES) {
  describe(`the motion demo (${engine})`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const { path: address, name, duration, motion } of MEASURED) {
      test(`${name}: it plays once in view, at the token's duration, and four times it in slow motion`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: VIEWPORT });
        try {
          const page = await context.newPage();
          await page.goto(`${origin}${address}`, { waitUntil: 'load' });
          await inView(page, name);
          await page.waitForFunction((selector) => document.querySelector(selector)?.dataset.motionPlays === '1', FRAME(name), { timeout: 10_000 });
          const token = ms(duration);

          // Once: long after the motion would have ended, it has not played again.
          await page.waitForTimeout(token * 3 + 500);
          assert.equal(await page.evaluate((selector) => document.querySelector(selector).dataset.motionPlays, FRAME(name)), '1', 'it plays once by itself');
          // The stage says it shows the second fixture once the play has reached it (compare-previews.mjs reads it).
          assert.equal(await page.evaluate((selector) => document.querySelector(`${selector} [data-motion-stage]`).dataset.motionShows, FRAME(name)), 'to', 'after the play the stage shows `to`');

          const full = await playAndRead(page, name, '[data-motion-replay]');
          assert.equal(full.plays, 2, 'the action plays it again');
          const moving = full.animations.filter(motion);
          assert.ok(moving.length > 0, `the play moves the ${name}: ${JSON.stringify(full.animations)}`);
          for (const animation of moving) assert.ok(Math.abs(animation.plays - token) <= CLOSE, `at full speed ${animation.name} lasts ${animation.plays} ms, the token's ${token}`);

          const slow = await playAndRead(page, name, '[data-motion-slow]');
          const slowed = slow.animations.filter(motion);
          assert.ok(slowed.length > 0, `the slow play moves the ${name}: ${JSON.stringify(slow.animations)}`);
          for (const animation of slowed) assert.ok(Math.abs(animation.plays - token / SLOW) <= CLOSE, `in slow motion ${animation.name} lasts ${animation.plays} ms, ${1 / SLOW} times ${token}`);
          // The caption says the duration the token gives, and the slowed one while slow motion is on.
          const caption = await page.evaluate((selector) => {
            const frame = document.querySelector(selector);
            const slowed = frame.querySelector('[data-motion-slowed]');
            return { ms: frame.querySelector('[data-motion-ms]').textContent, slowed: slowed.hidden ? null : frame.querySelector('[data-motion-slow-ms]').textContent };
          }, FRAME(name));
          assert.deepEqual(caption, { ms: String(token), slowed: String(token / SLOW) });
        } finally {
          await context.close();
        }
      });
    }

    test('under reduced motion each demo shows where its motion ends, and nothing in it runs', LIMIT, async () => {
      const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        for (const [address, name, ended] of [
          ['/components/switch/', 'switch', 'tanrei-switch[checked]'],
          ['/components/tabs/', 'tabs', 'tanrei-tabs[value="activity"]'],
          ['/components/accordion/', 'accordion', 'details[open]'],
        ]) {
          await page.goto(`${origin}${address}`, { waitUntil: 'load' });
          await inView(page, name);
          await page.waitForTimeout(500);
          const seen = await page.evaluate(
            ([selector, ended]) => {
              const frame = document.querySelector(selector);
              const subject = frame.querySelector('[data-motion]');
              const shadows = (root) => [...root.querySelectorAll('*')].flatMap((element) => (element.shadowRoot ? [element.shadowRoot, ...shadows(element.shadowRoot)] : []));
              const running = [...subject.getAnimations({ subtree: true }), ...shadows(subject).flatMap((shadow) => shadow.getAnimations())].filter((animation) => animation.playState === 'running');
              return {
                running: running.map((animation) => animation.transitionProperty ?? animation.animationName ?? animation.id),
                ended: Boolean(subject.querySelector(ended)),
                plays: frame.dataset.motionPlays ?? null,
                note: !frame.querySelector('[data-motion-reduced]').hidden,
                shows: subject.querySelector('[data-motion-stage]').dataset.motionShows,
                shadowRoots: shadows(subject).length,
              };
            },
            [FRAME(name), ended],
          );
          // The accordion draws its items in the light DOM (its details elements); the others in shadow trees, which are read.
          if (name !== 'accordion') assert.ok(seen.shadowRoots > 0, `${name}: the subject's shadow trees are read`);
          assert.deepEqual(seen.running, [], `${name}: nothing runs`);
          assert.equal(seen.ended, true, `${name}: the stage shows where the motion ends`);
          assert.equal(seen.plays, null, `${name}: nothing is played`);
          assert.equal(seen.note, true, `${name}: the caption says why`);
          assert.equal(seen.shows, 'to', `${name}: the stage says it shows the second fixture`);
        }
      } finally {
        await context.close();
      }
    });
  });
}

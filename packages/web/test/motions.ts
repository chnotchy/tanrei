import { type Locator, type Page, expect } from '@playwright/test';
import { CLOCK } from './watched-press.js';

/**
 * Motions that run inside shadow roots, waited for or counted where they run.
 *
 * `document.getAnimations()` lists only the animations of the document's own tree, and `el.getAnimations({ subtree:
 * true })` only those of the element's own tree: neither looks into a shadow root, in Chromium, Firefox or WebKit. A
 * component's motions run in its shadow root, so a wait built on either returns at once and a count reads 0 while the
 * component moves. These ask every shadow root on the way down.
 *
 * The waits for rest wait for a press that has been let go, too: its pressed state is kept for press-hold by a timer
 * (`PressController`, src/primitives/press.ts), which no list of animations shows, and the state's motion back to rest
 * starts only when that timer fires — after a wait for the motions alone has returned with nothing running.
 */

/**
 * The source of an in-page function `(root) => Animation[]`: every animation in `root` (a document, a shadow root or an
 * element and its subtree) and in each shadow root inside it, at any depth. For a script the test writes into the page
 * itself (`const every = ${EVERY_ANIMATION};`), where a function of this module cannot be called.
 */
export const EVERY_ANIMATION = `(function every(root) {
  const own = root.nodeType === Node.ELEMENT_NODE ? root.getAnimations({ subtree: true }) : root.getAnimations();
  const inside = [...(root.nodeType === Node.ELEMENT_NODE ? [root] : []), ...root.querySelectorAll('*')].flatMap((el) => (el.shadowRoot ? every(el.shadowRoot) : []));
  return [...own, ...inside];
})`;

/**
 * How many drawn frames an animation stays paused before a wait takes it as held. A paused animation moves nothing,
 * and its `finished` settles only once something plays it again — for a fill a hidden document holds, or a frame a
 * test holds with `pause()`, never while the test waits. But a pause can also be the first frame of a motion:
 * `startFromNextFrame()` (src/primitives/motion.ts) holds an entrance at its start in the task that opens a surface
 * and plays it in the next frame. So one that is paused is looked at again in each frame drawn, and taken as held only
 * once it has stayed paused through this many.
 */
export const HELD_FRAMES = 2;

/**
 * The source of an in-page expression whose value is a function `(animation) => Promise<void>` that settles once
 * `animation` is out of motion: it has finished, it was cancelled, or it has stayed paused through `HELD_FRAMES` drawn
 * frames — whether it was paused when asked or while it was waited for (the carousel's autoplay fill, held as the
 * pointer comes in or the document is hidden). A frame is a resize observer's first report of the root, which every
 * drawn frame gives and no page clock holds (`page.clock` holds `requestAnimationFrame`, and with it the frame that
 * plays a held entrance: a held clock holds that motion too). In a hidden document no frame is drawn, and nothing holds
 * a motion for one: a paused animation is held at once. Each evaluation makes one function, whose waits share their
 * frames. For a script the test writes into the page itself, as `EVERY_ANIMATION`.
 */
export const OUT_OF_MOTION = `(() => {
  let next = null;
  const frame = () =>
    (next ??= new Promise((resolve) => {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        next = null;
        resolve(undefined);
      });
      observer.observe(document.documentElement);
    }));
  return (animation) => {
    let settled = false;
    const ended = animation.finished.then(() => undefined, () => undefined).finally(() => (settled = true));
    return (async () => {
      for (let paused = 0; !settled; ) {
        paused = animation.playState === 'paused' ? paused + 1 : 0;
        if (paused > ${HELD_FRAMES} || (paused && document.visibilityState === 'hidden')) return;
        await Promise.race([ended, frame()]);
      }
    })();
  };
})()`;

/**
 * The source of an in-page function `(motions) => Promise<void>` that keeps `motions` — which a test has just paused,
 * in the task that began them, to read a change at the times it chooses — paused where they were paused, through the
 * frames in which a component plays the motions it held at their start. `startFromNextFrame()` (src/primitives/motion.ts)
 * holds a motion by pausing it at 0 and plays it in the next frame drawn if it still stands paused at 0 there — and a
 * test's pause of a motion at its start looks the same: the component played it on from that frame (a number ticker's
 * width, read wider than it began once a frame or two had passed). It waits `HELD_FRAMES` drawn frames — a resize
 * observer's first report of the root, which every drawn frame gives and no page clock holds, as the component's own
 * wait under a held clock — and pauses each motion played in them again at the time it was paused at. In a hidden
 * document no frame is drawn, and no motion is held: it returns at once. For a script the test writes into the page.
 */
export const KEEP_PAUSED = `(async (motions) => {
  const at = motions.map((animation) => [animation, animation.currentTime]);
  if (document.visibilityState === 'hidden') return;
  for (let frame = 0; frame < ${HELD_FRAMES}; frame++) {
    await new Promise((resolve) => {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        resolve(undefined);
      });
      observer.observe(document.documentElement);
    });
  }
  for (const [animation, time] of at) {
    if (animation.playState !== 'running') continue;
    animation.pause();
    animation.currentTime = time;
  }
})`;

/**
 * The source of an in-page function `(root) => Element[]`: every element in `root` (a document, a shadow root or an
 * element and its subtree) and in each shadow root inside it, at any depth, that shows a pressed state — `data-pressed`
 * naming a feedback, as `PressController` writes it (src/primitives/press.ts). `data-pressed="none"` paints nothing,
 * and an anchor's script writes it before any press (src/link.ts): it is no pressed state. For a script the test
 * writes into the page itself, as `EVERY_ANIMATION`.
 */
export const EVERY_PRESSED = `(function every(root) {
  const all = [...(root.nodeType === Node.ELEMENT_NODE ? [root] : []), ...root.querySelectorAll('*')];
  return all.flatMap((el) => [...(el.matches('[data-pressed]:not([data-pressed="none"])') ? [el] : []), ...(el.shadowRoot ? every(el.shadowRoot) : [])]);
})`;

/**
 * The source of an in-page expression whose value is a function `(el) => Promise<boolean>` that settles once the
 * pressed state `el` shows is no longer kept for a press that has been let go: `true` once the state is gone, `false`
 * once it is held — by a pointer or a key still down, which no wait can end, or by a page clock the test holds.
 *
 * A press let go keeps its state until press-hold has passed since it began, on a timer of the page's
 * (`PressController.release`, src/primitives/press.ts), which no list of animations shows and no event announces. The
 * press began before this is asked, so that timer is due no later than press-hold from now; a timer of this function's
 * own, due press-hold from now (and `CLOCK` more, for the coarse `performance.now()` both read), runs after it — timers
 * run in the order they are due, and a page clock (`page.clock`) runs its fakes in the same order. So the state still
 * shown when this one fires is not the timer's: the press is still held down, and is not waited for further. Nothing
 * here counts time against the machine's speed: however late the timers run, they run in that order. Press-hold is
 * read as `el` has it (`--tanrei-sys-motion-duration-press-hold`, an expression), computed through a real property of
 * an element of its own, as the press itself reads it.
 *
 * A held page clock holds both timers: the state is taken as held once the page's time has stood still through
 * `HELD_FRAMES` drawn frames (a resize observer's first report of the root, which no page clock holds), as a motion is
 * (`OUT_OF_MOTION`). In a hidden document no frame is drawn: there the state is held at once where a clock of the
 * page's own stands in for its timers. Each evaluation makes one function. For a script the test writes into the page
 * itself, as `EVERY_ANIMATION`.
 */
export const PRESS_LET_GO = `(() => {
  const shown = (el) => el.matches('[data-pressed]:not([data-pressed="none"])');
  const holdOf = (el) => {
    const value = getComputedStyle(el).getPropertyValue('--tanrei-sys-motion-duration-press-hold').trim();
    if (!value) return 0;
    const probe = document.createElement('div');
    probe.style.display = 'none';
    probe.style.transitionDelay = value;
    document.documentElement.append(probe);
    const hold = Number.parseFloat(getComputedStyle(probe).transitionDelay) * 1000;
    probe.remove();
    return Number.isFinite(hold) ? hold : 0;
  };
  const frame = () =>
    new Promise((resolve) => {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        resolve(undefined);
      });
      observer.observe(document.documentElement);
    });
  const ownTimers = /\\[native code\\]/.test(Function.prototype.toString.call(setTimeout));
  return (el) =>
    new Promise((resolve) => {
      if (!shown(el)) return resolve(true);
      let done = false;
      let timer;
      const observer = new MutationObserver(() => !shown(el) && finish());
      const finish = () => {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(!shown(el));
      };
      observer.observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      const due = performance.now() + holdOf(el) + ${CLOCK};
      const tick = () => {
        const left = due - performance.now();
        if (left > 0) timer = setTimeout(tick, left);
        else finish();
      };
      tick();
      if (document.visibilityState === 'hidden') {
        if (!ownTimers) finish();
        return;
      }
      (async () => {
        const start = performance.now();
        for (let still = 0; !done; ) {
          await frame();
          if (performance.now() !== start) return;
          if (++still >= ${HELD_FRAMES}) finish();
        }
      })();
    });
})()`;

/**
 * The source of an in-page function `(motions) => () => void` that holds each of `motions` that runs at the time it has
 * now, and returns a function that puts each one it held back to that time and plays it again. Those that do not run
 * (paused, finished, cancelled) are left as they are, by both.
 *
 * Reading in one task does not hold a running motion. Its `currentTime` stands still for the task, but WebKit computes
 * and lays out a running transform, translate, rotate, scale, opacity or filter at the moment each is read: two reads
 * back to back, or a read before a change and one after it, or a read beside a value worked out from `currentTime`, see
 * two moments (a segment 0.05 to 0.2 px further on). `pause()` alone holds it at once in Chromium, Firefox and WebKit on
 * macOS, but not in WebKit on Linux until the next frame; setting the current time completes the hold at once in every
 * engine. So each is paused and given its own time again. A motion begun in this task (pending, at its start) is held
 * there too. Between the hold and the call that ends it, the test may move the held motions to times of its own (a
 * colour read at a moment it chooses): ending the hold puts them back. For a script the test writes into the page, as
 * `EVERY_ANIMATION`:
 *
 *   const hold = (0, eval)(HOLD_NOW) as (motions: Animation[]) => () => void;
 *   const resume = hold(el.getAnimations());
 *   … // every read here is of one moment
 *   resume();
 */
export const HOLD_NOW = `((motions) => {
  const held = motions.filter((motion) => motion.playState === 'running').map((motion) => [motion, motion.currentTime]);
  for (const [motion, time] of held) {
    motion.pause();
    motion.currentTime = time;
  }
  return () => {
    for (const [motion, time] of held) {
      motion.currentTime = time;
      motion.play();
    }
  };
})`;

/**
 * Waits until nothing of `target` is in motion: the element's own motions, its subtree's, and those in every shadow
 * root inside it — or, given the page, every motion in it. Those it has when it is asked are waited for (asking
 * flushes style, so a motion the last change starts is among them), each until it finishes, is cancelled or is held —
 * paused through `HELD_FRAMES` drawn frames (`OUT_OF_MOTION`): an entrance held at its start for the frame before it
 * plays is waited for to its end, and a fill held through a hidden document or a frame a test holds with `pause()` is
 * not, which would otherwise never end. An animation that never ends (a spinner's) is not waited for, and a motion
 * that starts while it waits is not either — except what a press let go starts.
 *
 * A pressed state shown in `target` (`EVERY_PRESSED`) for a press that has been let go is waited for until press-hold
 * ends it (`PRESS_LET_GO`), and then the motions running are waited for again: the state's own motion back to rest,
 * which its end starts, and the ripple's fade. A press still held down — by a pointer or a key the test has not let go,
 * or under a page clock the test holds — is not waited for: it is part of the state the test reads.
 */
export const motionEnded = (target: Locator | Page): Promise<void> =>
  ('keyboard' in target ? target.locator(':root') : target).evaluate(
    async (given, [every, outOfMotion, everyPressed, pressLetGo]) => {
      const el = given === document.documentElement ? document : given;
      const motions = (0, eval)(every) as (root: Element | Document) => Animation[];
      const until = (0, eval)(outOfMotion) as (animation: Animation) => Promise<void>;
      const pressed = (0, eval)(everyPressed) as (root: Element | Document) => Element[];
      const letGo = (0, eval)(pressLetGo) as (el: Element) => Promise<boolean>;
      for (;;) {
        const ending = motions(el).filter((animation) => Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY);
        const [, ended] = await Promise.all([Promise.all(ending.map(until)), Promise.all(pressed(el).map(letGo))]);
        // A press that ended has started its motion back to rest: wait for the motions again.
        if (!ended.includes(true)) return;
      }
    },
    [EVERY_ANIMATION, OUT_OF_MOTION, EVERY_PRESSED, PRESS_LET_GO] as const,
  );

/**
 * The element's computed `property` (of its `pseudo`-element, given one), read once no motion that can change it still
 * runs: the element's own transitions and animations, its pseudo-element's, and those of every ancestor in the flat
 * tree — through the slot it is assigned to, and out of each shadow root to its host. An ancestor's motion counts
 * because an inherited property (`color`, a custom property a `var()` reads) follows it with no motion of its own, so
 * `el.getAnimations()` lists nothing while the value still moves.
 *
 * The race it closes: a colour polled until it equals its end value can pass while its transition still runs — an
 * engine serializes an interpolated colour like its end value (Firefox writes it in the end value's space, alpha already
 * rounded, and unpremultiplies a translucent one differently from one frame to the next) — and a strict read of the
 * same value a moment later reads another frame of the motion. Poll this, not a plain read, when an exact read of the
 * same value follows; or wait with `motionEnded()` between the two. An animation that never ends (a spinner's) is not
 * waited for; one that is cancelled counts as ended; one that is paused is waited for until it is held — paused through
 * `HELD_FRAMES` drawn frames (`OUT_OF_MOTION`), so that an entrance held at its start for the frame before it plays is
 * waited for and a fill held through a hidden document is not; one that a finished one starts is waited for in turn.
 * A pressed state of the element or of one of those ancestors, for a press that has been let go, is waited for until
 * press-hold ends it, and the motion that its end starts in turn (`PRESS_LET_GO`); one still held down is read as it is.
 */
export const settledCss = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate(
    async (el, [name, part, outOfMotion, pressLetGo]) => {
      const until = (0, eval)(outOfMotion) as (animation: Animation) => Promise<void>;
      const letGo = (0, eval)(pressLetGo) as (el: Element) => Promise<boolean>;
      const held = new Set<Animation>();
      const heldDown = new Set<Element>();
      for (;;) {
        const chain: Element[] = [];
        for (let node: Element | null = el; node; node = node.assignedSlot ?? node.parentElement ?? ((node.parentNode as ShadowRoot | null)?.host ?? null)) chain.push(node);
        // Asking flushes style, so a motion the last change starts is among them. The element's own list, with
        // subtree, holds its pseudo-elements' (each targets the element); a descendant's is no part of its value.
        const own = el.getAnimations({ subtree: true }).filter((animation) => (animation.effect as KeyframeEffect | null)?.target === el);
        const moving = [...own, ...chain.slice(1).flatMap((node) => node.getAnimations())].filter(
          (animation) =>
            (animation.playState === 'running' || (animation.playState === 'paused' && !held.has(animation))) && Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY,
        );
        const pressed = chain.filter((node) => node.matches('[data-pressed]:not([data-pressed="none"])') && !heldDown.has(node));
        if (!moving.length && !pressed.length) return getComputedStyle(el, part ?? undefined).getPropertyValue(name);
        await Promise.all([
          ...moving.map(async (animation) => {
            await until(animation);
            if (animation.playState === 'paused') held.add(animation);
          }),
          ...pressed.map(async (node) => {
            if (!(await letGo(node))) heldDown.add(node);
          }),
        ]);
      }
    },
    [property, pseudo ?? null, OUT_OF_MOTION, PRESS_LET_GO] as const,
  );

/**
 * How many motions `target` has now — its own, its subtree's and those in every shadow root inside it — counting those
 * running, paused or waiting for their delay: "nothing moves" is 0. Asking flushes style, so a motion the last change
 * starts is counted.
 */
export const motionCount = (target: Locator): Promise<number> =>
  target.evaluate((given, source) => ((0, eval)(source) as (root: Element) => Animation[])(given).length, EVERY_ANIMATION);

// ── A change made in a long task ──────────────────────────────────────────────────────────────────────────────────────

/** What `heldTaskFrame()` saw: the motions the change began, and each of them in the first frame drawn after its task. */
export interface HeldTask {
  /** Each motion the change began in its task: `<host> <element>.<class><pseudo> <property>`, sorted. */
  begun: string[];
  /** The same motions in the first frame drawn after the task: `<motion> at <current time> ms`, or `<motion> finished` once over (`idle` once cancelled). */
  at: string[];
}

/**
 * Makes a change at the start of a task that is then held for longer than every motion the change began lasts, and
 * reads those motions in the frame callbacks of the first frame drawn after it.
 *
 * WebKit dates a transition begun in a task from the frame drawn before that task, which stands still while the task
 * runs: a component that opens in a long task (its items placed and rendered on a loaded machine) has that much of each
 * motion it began over before any frame draws it, and none of it where the task outlasted the motion. A component that
 * plays them from the next frame (`startFromNextFrame`, `statesFromNextFrame`, src/primitives/motion.ts) has every one
 * at its start there, in every engine.
 *
 * `act` is the source of an in-page function `(host, active) => void`, called with the element of `host` and the
 * deepest focused element, which makes the change: what the person's key or click would do (the key's event is
 * dispatched, the click is `click()`). The microtasks it queues — the components' updates — run before the motions are
 * read, in the same task. Motions of the page's that are already running are left out.
 */
export const heldTaskFrame = (host: Locator, act: string): Promise<HeldTask> =>
  host.evaluate(
    async (el, [every, source]) => {
      const all = (0, eval)(every) as (root: Document) => Animation[];
      const change = (0, eval)(source) as (host: Element, active: Element | null) => void;
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      const before = new Set(all(document));
      change(el, active);
      // The components' updates, each a microtask that may queue the next (a parent's update, then its items').
      for (let turn = 0; turn < 200; turn++) await null;
      const name = (animation: Animation) => {
        const effect = animation.effect as KeyframeEffect;
        const target = effect.target as Element;
        const owner = (target.getRootNode() as ShadowRoot).host?.localName ?? '';
        const property = (animation as CSSTransition).transitionProperty ?? (animation as CSSAnimation).animationName ?? 'script';
        return `${owner} ${target.localName}${target.classList.length ? `.${target.classList[0]}` : ''}${effect.pseudoElement ?? ''} ${property}`;
      };
      const begun = all(document).filter((animation) => !before.has(animation) && animation.playState !== 'finished' && Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY);
      const end = performance.now() + Math.max(300, ...begun.map((animation) => Number(animation.effect!.getComputedTiming().endTime))) + 200;
      while (performance.now() < end);
      return new Promise<{ begun: string[]; at: string[] }>((resolve) =>
        requestAnimationFrame(() =>
          resolve({
            begun: begun.map(name).sort(),
            at: begun.map((animation) => `${name(animation)} ${animation.playState === 'finished' || animation.playState === 'idle' ? animation.playState : `at ${Math.round(Number(animation.currentTime))} ms`}`).sort(),
          }),
        ),
      );
    },
    [EVERY_ANIMATION, act] as const,
  );

/**
 * `heldTaskFrame()`, with what it saw held to the rule: the change began each of `expected` (and maybe more), and every
 * motion it began stands at its start in the first frame drawn after its task — none of it over, or under way, before a
 * frame draws it. `what` names the change in the messages.
 */
export async function expectFromNextFrame(host: Locator, act: string, expected: readonly string[], what: string): Promise<HeldTask> {
  const seen = await heldTaskFrame(host, act);
  expect(seen.begun, `${what}: the motions it begins`).toEqual(expect.arrayContaining([...expected]));
  expect(seen.at, `${what}: every motion it began stands at its start in the first frame drawn after the task`).toEqual(seen.begun.map((motion) => `${motion} at 0 ms`));
  return seen;
}

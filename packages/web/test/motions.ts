import type { Locator, Page } from '@playwright/test';

/**
 * Motions that run inside shadow roots, waited for or counted where they run.
 *
 * `document.getAnimations()` lists only the animations of the document's own tree, and `el.getAnimations({ subtree:
 * true })` only those of the element's own tree: neither looks into a shadow root, in Chromium, Firefox or WebKit. A
 * component's motions run in its shadow root, so a wait built on either returns at once and a count reads 0 while the
 * component moves. These ask every shadow root on the way down.
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
 * Waits until nothing of `target` is in motion: the element's own motions, its subtree's, and those in every shadow
 * root inside it — or, given the page, every motion in it. Those it has when it is asked are waited for (asking
 * flushes style, so a motion the last change starts is among them), each until it finishes, is cancelled or is held —
 * paused through `HELD_FRAMES` drawn frames (`OUT_OF_MOTION`): an entrance held at its start for the frame before it
 * plays is waited for to its end, and a fill held through a hidden document or a frame a test holds with `pause()` is
 * not, which would otherwise never end. An animation that never ends (a spinner's) is not waited for, and a motion
 * that starts while it waits is not either.
 */
export const motionEnded = (target: Locator | Page): Promise<void> =>
  ('keyboard' in target ? target.locator(':root') : target).evaluate(
    async (given, [every, outOfMotion]) => {
      const el = given === document.documentElement ? document : given;
      const running = ((0, eval)(every) as (root: Element | Document) => Animation[])(el);
      const until = (0, eval)(outOfMotion) as (animation: Animation) => Promise<void>;
      const ending = running.filter((animation) => Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY);
      await Promise.all(ending.map(until));
    },
    [EVERY_ANIMATION, OUT_OF_MOTION] as const,
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
 */
export const settledCss = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate(
    async (el, [name, part, outOfMotion]) => {
      const until = (0, eval)(outOfMotion) as (animation: Animation) => Promise<void>;
      const held = new Set<Animation>();
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
        if (!moving.length) return getComputedStyle(el, part ?? undefined).getPropertyValue(name);
        await Promise.all(
          moving.map(async (animation) => {
            await until(animation);
            if (animation.playState === 'paused') held.add(animation);
          }),
        );
      }
    },
    [property, pseudo ?? null, OUT_OF_MOTION] as const,
  );

/**
 * How many motions `target` has now — its own, its subtree's and those in every shadow root inside it — counting those
 * running, paused or waiting for their delay: "nothing moves" is 0. Asking flushes style, so a motion the last change
 * starts is counted.
 */
export const motionCount = (target: Locator): Promise<number> =>
  target.evaluate((given, source) => ((0, eval)(source) as (root: Element) => Animation[])(given).length, EVERY_ANIMATION);

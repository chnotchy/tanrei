// What each frame of a change paints, read at moments that are the same on any machine.
//
// A test that samples a motion in real frames reads what the machine happens to draw: a runner that draws a frame late
// shows a 200 ms motion as two frames and never the moment in between, a frame it drops is never read, and Chromium in
// harsh mode, which plays motion at a fifth of its speed, shows five times as many. Then "the first frame is already
// at rest", "nothing flickers", "the first line stays where it is" and "it moves, it does not jump" are true on one
// machine and not on another. This helper takes the motion's clock in hand instead:
//
// - every motion in the root — a CSS transition, a CSS animation, a script's `animate()`, through every shadow root
//   (`EVERY_ANIMATION`, test/motions.ts) — is held still at its start before any frame moves it;
// - each frame the page draws moves all of them on by one frame of motion time (1000/60 ms) and is read: frame n is the
//   moment n/60 s into the change, whatever the machine, the load, the harsh playback rate or the page clock. A frame
//   the machine drops is not lost: nothing moves until the next one is read;
// - each frame is read where it is painted: after its style, its layout and the page's own resize observers (a
//   component that measures itself writes what it measured there), from a resize observer made anew each frame, so it
//   is the last one asked.
//
// When the motions are held. A motion that a frame's own style begins is held in that frame, before it is painted. One
// that begins in a task (a style written and then read, by the page's script or, in WebKit, by the engine) is pending
// until the next frame, and that frame starts it from when it was made: a machine whose next frame comes later than
// the motion lasts would show it ended. So after each task that changes the root (a mutation in it or in a shadow root
// inside it, an attribute of the document's root element, an input), a task of the sampler's holds what has begun —
// and that brings the style up to date. By then every microtask of the changing task has run (an element's own
// update), so it is the style that task left: what any read of layout in it would see. What it can tell apart that a
// frame alone would not: a state an element writes in an animation frame callback after it was mounted is read as
// written a frame late (it is, wherever a script reads layout in the mounting task). Style is never brought up to date
// in the middle of a task: there, an attribute an element writes after its first render would start a transition the
// page never starts. A motion that began and ended between two frames read here all the same is in no frame: its
// events show it, and the sampling fails instead of returning frames without it.
//
// Held motions stand still while the test acts: an act of several inputs (a key, then another) is one moment, however
// long the round trips take. What moves on its own clock is not held — a script that moves a box frame by frame from
// `performance.now()`, a smooth scroll — and a timer is the page's own: hold the page clock for it (test/page-clock.ts;
// this helper uses neither timers nor `requestAnimationFrame`, so it runs on a held clock). An endless motion (a
// spinner) is held where it was caught and left out of the comparisons. A motion's time is set back to its start when
// it is held, but what the page did while it moved stays (a scroll clamped as a box grew).
//
// The engine's own pause (CDP `Animation.setPlaybackRate(0)`) would do the same in Chromium only, and harsh mode
// already sets that rate; holding each animation works in every engine.
//
//   const seen = await sampleFrames(page.locator('#stage'), () => page.locator('#stage').evaluate((el) => el.insertAdjacentHTML('beforeend', markup)));
//   expectFirstFrameAtRest(seen);
//   expectNoFlicker(seen);
//
//   const grown = await sampleFrames(host, () => page.keyboard.press('Shift+Enter'), { probe: (root) => ({ line: …, top: … }) });
//   expectAnchored(grown, 'line', 'top');
//   expectAnimated(grown, 'top', { minSteps: 4 });
import { type Locator, type Page, expect } from '@playwright/test';
import { EVERY_ANIMATION } from './motions.js';

/** The computed properties read on every element (and on its `::before` and `::after`) in each frame. */
export const PROPERTIES = ['opacity', 'transform', 'scale', 'translate', 'rotate', 'filter', 'clip-path', 'background-color', 'color', 'border-top-color', 'border-top-width', 'box-shadow', 'visibility', 'display'] as const;

/** What one element (or one of its pseudo-elements, keyed `<key>::before`) paints in one frame. */
export interface ElementFrame {
  /**
   * Its border box in CSS pixels (`[x, y, width, height]`, to a tenth), or null for an element that paints nothing of
   * its own (no fill, border, shadow, text or replaced content) — a box only for layout, whose size is no one's to see.
   */
  rect: [number, number, number, number] | null;
  /** The computed values of `PROPERTIES` (or of the properties asked for). */
  style: Record<string, string>;
  /** A motion of its own is held (a transition or animation on it or its pseudo-element). */
  moving: boolean;
  /** One of them never ends (a spinner's): it and everything inside it are left out of the comparisons. */
  endless: boolean;
}

/** One frame as it was painted. */
export interface Frame {
  /** Its place in `frames`. */
  index: number;
  /** The motion time it shows, in ms from the change: 0 while the test acts, then 1000/60 more each frame. */
  time: number;
  /**
   * Every element in the root, the root first, by its path: `localName[#id]:<index among its parent's children>`
   * joined by `/`, and by `>` into a shadow root: `div#stage:0/late-mark:0>span:1`. Classes are not in it: they change from frame to frame.
   */
  elements: Record<string, ElementFrame>;
  /** What the test's own probe read (`{}` without one). */
  probe: Record<string, number | string | boolean>;
}

/** A motion that was held. */
export interface HeldMotion {
  kind: 'transition' | 'animation' | 'script';
  /** The property of a transition, the name of a CSS animation, the id of a script's (often empty). */
  name: string;
  /** The element it runs on, as `localName.class.class` and its pseudo-element. */
  on: string;
  /** Its duration in whole ms, and its easing as the engine serializes it. */
  duration: number;
  easing: string;
  endless: boolean;
  /** The frame it was caught in (its first). */
  frame: number;
}

/** What `sampleFrames` saw. */
export interface Frames {
  /**
   * The frames from the first one the change shows. While the test acts, a frame is kept only when it differs from the
   * one before (motion time stands still then); from then on every frame is kept.
   */
  frames: Frame[];
  /** The root as it stood before the act (index -1). */
  before: Frame;
  /** The state the change came to rest in: every motion ended and nothing changed for three frames. */
  rest: Frame;
  /** Every motion that was held, in the order they began. */
  motions: HeldMotion[];
  /** Every motion ran to its end within the frames (false when `frames` cut the sampling short). */
  complete: boolean;
}

/** A probe: an in-page function of the root that reads what the test cares about. It is sent as its source text, so it may use nothing from the test's scope. */
export type Probe = (root: Element) => Record<string, number | string | boolean>;

export interface SampleOptions {
  /** Frames to sample after the act; by default, until every motion has ended (at most `maxFrames`). */
  frames?: number;
  /** Read alongside each frame: an arrow function or a function expression (not a method), self-contained. */
  probe?: Probe;
  /** Read every element's `PROPERTIES` and box in each frame (default); false reads the probe only. */
  elements?: boolean;
  /** The computed properties to read, in place of `PROPERTIES`. */
  properties?: readonly string[];
  /** Motion time per frame, in ms (default 1000/60). */
  step?: number;
  /** Frames after which a motion that has not ended fails the sampling (default 600: 10 s of motion time). */
  maxFrames?: number;
}

/** The in-page side, on `window.__tanreiFrames` while it runs. */
interface Sampler {
  go(): Promise<(Frames & { failure?: undefined }) | { failure: string }>;
  release(): void;
}

interface InPage {
  every: string;
  probe: string | null;
  elements: boolean;
  properties: string[];
  step: number;
  frames: number | null;
  maxFrames: number;
  /** Frames in a row that must be the same for rest (and, frozen, for the first frame to be complete). */
  settleFrames: number;
  freeze: boolean;
}

/**
 * The in-page sampler (sent to the page as its source: it uses nothing outside itself). Installed before the act; the
 * act is the test's; `go()` then samples and resolves with what was seen.
 */
function install(root: Element, o: InPage): void {
  interface Hold {
    /** The time last given to it, and the motion time it was given at. */
    set: number;
    at: number;
    endless: boolean;
  }
  type Phase = 'act' | 'motion' | 'settle' | 'frozen' | 'done';
  const w = window as unknown as { __tanreiFrames?: Sampler };
  w.__tanreiFrames?.release();
  const every = (0, eval)(o.every) as (root: Element) => Animation[];
  const probe = o.probe ? ((0, eval)(`(${o.probe})`) as (root: Element) => Record<string, number | string | boolean>) : undefined;

  // The frame clock, outside the page's layout: `mover` grows every frame (so the page draws frames, and the observer of
  // it is told in each), and the observer of `mark`, made anew in that callback, is told in the same frame's next round
  // of resize observations (`mark` is deeper) — after every observer the page made, since it is the newest.
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: 1px; block-size: 1px; overflow: clip; pointer-events: none; contain: strict;';
  const mover = document.createElement('div');
  mover.style.cssText = 'inline-size: 0; block-size: 1px;';
  const mark = document.createElement('div');
  mark.style.cssText = 'inline-size: 1px; block-size: 1px;';
  mover.append(mark);
  box.append(mover);
  document.documentElement.append(box);
  const ticking = mover.animate([{ inlineSize: '0px' }, { inlineSize: '1000000px' }], { duration: 1_000_000, fill: 'forwards' });

  const held = new Map<Animation, Hold>();
  const motions: HeldMotion[] = [];
  const frames: Frame[] = [];
  let phase: Phase = 'act';
  let index = -1;
  let time = 0;
  let previousTime = 0;
  let quiet = 0;
  let stable = 0;
  let settling = 0;
  let lastKept = '';
  let lastSeen = '';
  let complete = true;
  let released = false;
  let before!: Frame;
  let resolve!: (value: Awaited<ReturnType<Sampler['go']>>) => void;
  const done = new Promise<Awaited<ReturnType<Sampler['go']>>>((r) => (resolve = r));

  const target = (a: Animation) => (a.effect as KeyframeEffect | null)?.target ?? null;
  const ours = (a: Animation) => {
    const t = target(a);
    return !!t && box.contains(t);
  };
  const describe = (a: Animation, endless: boolean): HeldMotion => {
    const effect = a.effect as KeyframeEffect;
    const t = effect.target;
    const kind = 'transitionProperty' in a ? 'transition' : 'animationName' in a ? 'animation' : 'script';
    const name = kind === 'transition' ? (a as CSSTransition).transitionProperty : kind === 'animation' ? (a as CSSAnimation).animationName : a.id;
    const timing = effect.getTiming();
    return {
      kind,
      name,
      on: t ? [t.localName, ...t.classList].join('.') + (effect.pseudoElement ?? '') : '',
      duration: Math.round(Number(timing.duration) || 0),
      easing: String(timing.easing),
      endless,
      frame: Math.max(frames.length, 0),
    };
  };

  // A motion that began and ended between two frames read here (a machine that drew no frame for its whole duration)
  // is in no frame: its events tell, and the sampling fails rather than show frames without it.
  const named = (pseudo: string, name: string) => `${pseudo}|${name}`;
  const heldNames = new WeakMap<Element, Set<string>>();
  const begun = new WeakMap<Element, Set<string>>();
  const missed: string[] = [];
  const listened = new WeakSet<Node>();
  const stopped = new AbortController();
  const onEvent = (event: Event) => {
    const t = event.composedPath()[0] as Element;
    const e = event as TransitionEvent & AnimationEvent;
    const id = named(e.pseudoElement ?? '', event.type.startsWith('transition') ? e.propertyName : e.animationName);
    if (event.type === 'transitionrun' || event.type === 'animationstart') {
      const ids = begun.get(t) ?? new Set<string>();
      ids.add(id);
      begun.set(t, ids);
    } else if (begun.get(t)?.has(id) && !heldNames.get(t)?.has(id) && !box.contains(t)) {
      const what = `${event.type === 'transitionend' ? 'transition' : 'animation'} ${id} on ${[t.localName, ...t.classList].join('.')}`;
      if (!missed.includes(what)) missed.push(what);
    }
  };
  // A motion the page begins in a task (a style written there and then read, by the page or by the engine itself) is
  // pending until the next frame, and that frame starts it from when it was made: a machine that draws its next frame
  // later than the motion lasts ends it there. So after a task that changed the root (a mutation, an input) a task of
  // ours holds what it began, before any frame. By then every microtask of that task has run (an element's update):
  // the style is the one the task left, which is what any read of layout in it would see.
  const soon = new MessageChannel();
  let asked = false;
  soon.port1.onmessage = () => {
    asked = false;
    if (phase === 'done') return;
    try {
      listen();
      catchNew(false, true);
    } catch (error) {
      fail(String((error as Error)?.stack ?? error));
    }
  };
  const ask = () => {
    if (asked || phase === 'done') return;
    asked = true;
    soon.port2.postMessage(0);
  };
  // A script's motion changes no style: its start is seen where it is made (`animate()`, `play()`).
  const animate = Element.prototype.animate;
  const play = Animation.prototype.play;
  Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
    ask();
    return animate.apply(this, args);
  };
  Animation.prototype.play = function (this: Animation) {
    ask();
    return play.call(this);
  };
  const changes = new MutationObserver(ask);
  changes.observe(document.documentElement, { attributes: true });
  for (const type of ['pointerdown', 'pointerup', 'pointerover', 'pointerout', 'pointermove', 'keydown', 'keyup', 'focusin', 'focusout', 'input', 'change', 'scroll', 'wheel'])
    window.addEventListener(type, ask, { capture: true, passive: true, signal: stopped.signal });
  const listen = () => {
    const roots = (node: Element | ShadowRoot): (Element | ShadowRoot)[] => [node, ...[...node.querySelectorAll('*')].flatMap((el) => (el.shadowRoot ? roots(el.shadowRoot) : []))];
    for (const node of roots(root)) {
      if (listened.has(node)) continue;
      listened.add(node);
      changes.observe(node, { attributes: true, childList: true, characterData: true, subtree: true });
      for (const type of ['transitionrun', 'transitionend', 'animationstart', 'animationend']) node.addEventListener(type, onEvent, { capture: true, signal: stopped.signal });
    }
  };

  /** Holds every motion that has begun since the last frame, at its start (at install: where it is). */
  const catchNew = (initial: boolean, between = false) => {
    let caught = 0;
    // Caught between frames, a motion's first frame is the next one.
    const at = between && phase === 'motion' ? (index + 1) * o.step : time;
    for (const a of every(root)) {
      // One the page paused (a scrubbed timeline) is the page's; one that is over is no motion.
      if (held.has(a) || ours(a) || !a.effect || a.playState !== 'running') continue;
      const endless = a.effect.getComputedTiming().endTime === Number.POSITIVE_INFINITY || a.playbackRate === 0;
      const set = initial ? Number(a.currentTime ?? 0) : 0;
      a.pause();
      a.currentTime = set;
      held.set(a, { set, at, endless });
      const t = target(a);
      if (t) {
        const ids = heldNames.get(t) ?? new Set<string>();
        ids.add(named((a.effect as KeyframeEffect).pseudoElement ?? '', 'transitionProperty' in a ? (a as CSSTransition).transitionProperty : 'animationName' in a ? (a as CSSAnimation).animationName : ''));
        heldNames.set(t, ids);
      }
      motions.push(describe(a, endless));
      caught++;
    }
    return caught;
  };

  /** Moves every held motion to this frame's time; one that reaches its end is finished (its events follow next frame). */
  const advance = (finishAll: boolean) => {
    let running = 0;
    for (const [a, h] of held) {
      if (a.playState === 'idle' || a.playState === 'finished') {
        held.delete(a);
        continue;
      }
      // The page moved it itself (`play()`, `reverse()`, a time of its own): it goes on from there.
      // (A time read back may be rounded — Firefox coarsens it — so only a move of half a millisecond or more is the page's.)
      if (a.playState !== 'paused' || Math.abs(Number(a.currentTime ?? 0) - h.set) >= 0.5) {
        a.pause();
        h.set = Number(a.currentTime ?? 0);
        h.at = previousTime;
      }
      if (h.endless) {
        a.currentTime = h.set;
        h.at = time;
        continue;
      }
      const rate = a.playbackRate;
      const t = h.set + (time - h.at) * rate;
      const end = Number(a.effect!.getComputedTiming().endTime);
      if (finishAll || (rate > 0 && t >= end) || (rate < 0 && t <= 0)) {
        a.finish();
        held.delete(a);
      } else {
        a.currentTime = t;
        h.set = t;
        h.at = time;
        running++;
      }
    }
    return running;
  };

  const CLEAR = /^transparent$|rgba\([^)]*,\s*0\)$|\/\s*0\)$/;
  const REPLACED = new Set(['img', 'svg', 'canvas', 'video', 'iframe', 'input', 'textarea', 'select', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse']);
  const round = (n: number) => Math.round(n * 10) / 10;
  const read = (style: CSSStyleDeclaration) => {
    const values: Record<string, string> = {};
    for (const p of o.properties) values[p] = style.getPropertyValue(p);
    return values;
  };

  /** The frame as it stands. */
  const take = (): Frame => {
    // What is held, by element and pseudo-element ('' for the element's own): whether one of them is endless.
    const moving = new Map<Element, Map<string, boolean>>();
    for (const [a, h] of held) {
      const t = target(a);
      if (!t) continue;
      const pseudo = (a.effect as KeyframeEffect).pseudoElement ?? '';
      const own = moving.get(t) ?? new Map<string, boolean>();
      own.set(pseudo, (own.get(pseudo) ?? false) || h.endless);
      moving.set(t, own);
    }
    const elements: Record<string, ElementFrame> = {};
    const name = (el: Element, at: number) => `${el.localName}${el.id ? `#${el.id}` : ''}:${at}`;
    const visit = (el: Element, key: string) => {
      if (el === box || el.localName === 'style' || el.localName === 'script' || el.localName === 'template') return;
      const style = getComputedStyle(el);
      const paints =
        !CLEAR.test(style.backgroundColor) ||
        style.backgroundImage !== 'none' ||
        (Number.parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none') ||
        style.boxShadow !== 'none' ||
        REPLACED.has(el.localName) ||
        [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim());
      const r = el.getBoundingClientRect();
      const own = moving.get(el);
      elements[key] = { rect: paints ? [round(r.x), round(r.y), round(r.width), round(r.height)] : null, style: read(style), moving: own?.has('') ?? false, endless: own?.get('') ?? false };
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === 'none' || ps.content === 'normal') continue;
        elements[key + pseudo] = { rect: null, style: read(ps), moving: own?.has(pseudo) ?? false, endless: own?.get(pseudo) ?? false };
      }
      if (el.shadowRoot) [...el.shadowRoot.children].forEach((child, at) => visit(child, `${key}>${name(child, at)}`));
      [...el.children].forEach((child, at) => visit(child, `${key}/${name(child, at)}`));
    };
    if (o.elements) visit(root, name(root, 0));
    return { index: frames.length, time: Math.round(time * 1000) / 1000, elements, probe: probe ? probe(root) : {} };
  };
  const serial = (frame: Frame) => JSON.stringify([frame.elements, frame.probe]);
  const keep = (frame: Frame, text: string) => {
    frame.index = frames.length;
    frames.push(frame);
    lastKept = text;
  };

  let observer: ResizeObserver | undefined;
  // Where the engine delivers the new observer only in a later frame (and so never: the next frame replaces it), the
  // frame is read here instead, before the page's own observers.
  let framed = true;
  const clock = new ResizeObserver(() => {
    if (!framed) onFrame();
    framed = false;
    observer?.disconnect();
    observer = new ResizeObserver(onFrame);
    observer.observe(mark);
  });

  const release = () => {
    if (released) return;
    released = true;
    phase = 'done';
    clock.disconnect();
    observer?.disconnect();
    stopped.abort();
    changes.disconnect();
    soon.port1.close();
    Element.prototype.animate = animate;
    Animation.prototype.play = play;
    ticking.cancel();
    box.remove();
    // What is still held runs on at the machine's pace.
    for (const a of held.keys()) if (a.playState === 'paused') a.play();
    held.clear();
    if (w.__tanreiFrames === sampler) delete w.__tanreiFrames;
  };
  const fail = (failure: string) => {
    release();
    resolve({ failure });
  };

  function onFrame() {
    framed = true;
    if (phase === 'done') return;
    try {
      if (phase === 'motion') {
        index++;
        previousTime = time;
        time = index * o.step;
      }
      listen();
      const caught = catchNew(false);
      if (missed.length) {
        fail(`a motion began and ended between two frames read here, so no frame shows it (the machine drew no frame for its whole duration): ${missed.join('; ')}`);
        return;
      }
      const running = advance(phase === 'settle');
      const frame = take();
      const text = serial(frame);
      if (phase === 'act') {
        if (text !== lastKept) keep(frame, text);
      } else if (phase === 'frozen') {
        if (text !== lastKept) keep(frame, text);
        stable = text === lastSeen && !caught ? stable + 1 : 0;
        if (stable >= o.settleFrames) resolve({ before, frames, rest: frame, motions, complete: false });
      } else if (phase === 'motion') {
        // The first frame of motion time is still the act's moment: kept only if it shows something new.
        if (index > 0 || text !== lastKept || !frames.length) keep(frame, text);
        quiet = !running && !caught ? quiet + 1 : 0;
        if (o.frames !== null ? index >= o.frames : quiet >= 2) {
          // Cut short by `frames` while something still moved: the rest is reached by finishing it, not by its motion.
          complete = !running && !caught;
          phase = 'settle';
        } else if (index >= o.maxFrames) {
          const still = [...held.keys()].filter((a) => !held.get(a)!.endless).map((a) => describe(a, false));
          fail(`a motion was still running after ${o.maxFrames} frames: ${JSON.stringify(still)}`);
        }
      } else if (phase === 'settle') {
        settling++;
        stable = text === lastSeen && !caught && !running ? stable + 1 : 0;
        if (stable >= o.settleFrames) {
          release();
          resolve({ before, frames, rest: frame, motions, complete });
        } else if (settling > 120) fail('the root did not come to rest in 120 frames after its motions ended');
      }
      lastSeen = text;
    } catch (error) {
      fail(String((error as Error)?.stack ?? error));
    }
  }

  const sampler: Sampler = {
    go: () => {
      if (phase === 'act') phase = o.freeze ? 'frozen' : 'motion';
      return done;
    },
    release,
  };
  w.__tanreiFrames = sampler;
  // What already moves is held where it is; the root as it stands is what a first frame is told apart from.
  listen();
  catchNew(true);
  before = { ...take(), index: -1 };
  lastKept = lastSeen = serial(before);
  clock.observe(mover);
}

const rootOf = (target: Locator | Page): Locator => ('keyboard' in target ? target.locator(':root') : target);

async function run(target: Locator | Page, act: () => Promise<unknown>, options: SampleOptions, freeze: boolean) {
  const root = rootOf(target);
  await root.evaluate(install, {
    every: EVERY_ANIMATION,
    probe: options.probe ? options.probe.toString() : null,
    elements: options.elements ?? true,
    properties: [...(options.properties ?? PROPERTIES)],
    step: options.step ?? 1000 / 60,
    frames: options.frames ?? null,
    maxFrames: options.maxFrames ?? 600,
    settleFrames: 3,
    freeze,
  });
  try {
    await act();
  } catch (error) {
    await root.page().evaluate(() => (window as unknown as { __tanreiFrames?: Sampler }).__tanreiFrames?.release());
    throw error;
  }
  const seen = await root.page().evaluate(() => (window as unknown as { __tanreiFrames: Sampler }).__tanreiFrames.go());
  if (seen.failure !== undefined) throw new Error(`sampleFrames: ${seen.failure}`);
  return seen;
}

/**
 * Samples the frames of a change: installs the sampler on `root` (a container the change happens in, or the page),
 * runs `act` (the change: an input, an element inserted), and reads frame by frame, one frame of motion time each,
 * until every motion has ended and the root has come to rest (or for `frames` frames). Begin with the root at rest.
 */
export const sampleFrames = (root: Locator | Page, act: () => Promise<unknown>, options: SampleOptions = {}): Promise<Frames> => run(root, act, options, false);

/** A first frame held still: every motion stands at its start until `release()`. */
export interface FrozenFrame {
  /** The frame as it is held. */
  frame: Frame;
  /** Lets the held motions run on at the machine's pace, and takes the sampler off the page. */
  release(): Promise<void>;
}

/**
 * Freezes the first frame of a change: every motion in `root` that the change begins stands still at its start (an
 * entrance at opacity 0 and its starting scale, a box that grows at its old size), in every engine, until `release()` —
 * so a screenshot shows what the first frame paints. Take it with motion allowed (`page.screenshot()` does;
 * `toHaveScreenshot` is configured with `animations: 'disabled'`, which would run them to their end).
 */
export async function freezeFirstFrame(root: Locator | Page, act: () => Promise<unknown>, options: Pick<SampleOptions, 'probe' | 'elements' | 'properties'> = {}): Promise<FrozenFrame> {
  const seen = await run(root, act, options, true);
  const page = rootOf(root).page();
  return { frame: seen.rest, release: () => page.evaluate(() => (window as unknown as { __tanreiFrames?: Sampler }).__tanreiFrames?.release()) };
}

// ── Assertions ───────────────────────────────────────────────────────────────────────────────────────────────────────

const AXES = ['x', 'y', 'width', 'height'] as const;

/** The keys under an endless motion (it, its pseudo-elements and everything inside it), in any frame. */
function endlessKeys(seen: Frames): (key: string) => boolean {
  const roots = new Set<string>();
  for (const frame of [...seen.frames, seen.rest]) for (const [key, el] of Object.entries(frame.elements)) if (el.endless) roots.add(key.replace(/::(before|after)$/, ''));
  return (key) => [...roots].some((r) => key === r || key.startsWith(`${r}/`) || key.startsWith(`${r}>`) || key.startsWith(`${r}::`));
}

const sameValue = (a: unknown, b: unknown, tolerance: number) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= tolerance : a === b);

/**
 * The first frame is the state the change comes to rest in: nothing is drawn in a state it then leaves — not by a
 * motion (a selected row that fades from unselected), not for one frame without one (a state written a frame late).
 * Boxes are compared within `tolerance` px, probe numbers too; `ignore` leaves out a property of a key (`'x'`, `'width'`,
 * a CSS property or `probe:<name>`), such as an entrance the spec asks for.
 */
export function expectFirstFrameAtRest(seen: Frames, { tolerance = 0.5, ignore }: { tolerance?: number; ignore?: (key: string, property: string) => boolean } = {}): void {
  const first = seen.frames[0];
  if (!first) throw new Error('expectFirstFrameAtRest: no frame was sampled');
  const { rest } = seen;
  const endless = endlessKeys(seen);
  const differences: string[] = [];
  const keys = new Set([...Object.keys(first.elements), ...Object.keys(rest.elements)]);
  for (const key of keys) {
    if (endless(key)) continue;
    const a = first.elements[key];
    const b = rest.elements[key];
    if (!a || !b) {
      if (!ignore?.(key, 'drawn')) differences.push(`${key}: ${a ? 'drawn in the first frame, gone at rest' : 'not drawn in the first frame'}`);
      continue;
    }
    if (a.rect && b.rect) AXES.forEach((axis, i) => !ignore?.(key, axis) && !sameValue(a.rect![i], b.rect![i], tolerance) && differences.push(`${key} ${axis}: ${a.rect![i]} → ${b.rect![i]}`));
    else if (!a.rect !== !b.rect && !ignore?.(key, 'painted')) differences.push(`${key}: ${a.rect ? 'paints' : 'paints nothing'} in the first frame, ${b.rect ? 'paints' : 'paints nothing'} at rest`);
    for (const property of new Set([...Object.keys(a.style), ...Object.keys(b.style)]))
      if (a.style[property] !== b.style[property] && !ignore?.(key, property)) differences.push(`${key} ${property}: ${a.style[property]} → ${b.style[property]}`);
  }
  for (const name of new Set([...Object.keys(first.probe), ...Object.keys(rest.probe)]))
    if (!sameValue(first.probe[name], rest.probe[name], tolerance) && !ignore?.('', `probe:${name}`)) differences.push(`probe ${name}: ${first.probe[name]} → ${rest.probe[name]}`);
  expect(differences, 'the first frame differs from the state the change comes to rest in (first frame → rest)').toEqual([]);
}

/** A flicker found by `expectNoFlicker`. */
export interface Flicker {
  key: string;
  /** `x`, `y`, `width`, `height` or a CSS property. */
  property: string;
  /**
   * `off-path`: a value outside the way from where it started to where it ended (a flash, a step back);
   * `end-jump`: after three steps or more, the last step is more than 35 % of the whole way (a motion cut short and
   * finished in one frame); `blink`: visibility or display goes away and comes back.
   */
  kind: 'off-path' | 'end-jump' | 'blink';
  /** The frames it is seen in, and the values there. */
  frames: number[];
  values: (number | string)[];
}

/** A colour as premultiplied channels (r·a, g·a, b·a in 0–1, and a), or null for a form not read here (`oklch()`'s hue is an angle). */
function premultiplied(value: string): number[] | null {
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  const srgb = value.match(/^color\((?:srgb|srgb-linear|display-p3) ([^)]+)\)$/);
  const lab = value.match(/^(?:ok)?lab\(([^)]+)\)$/);
  const parts = (rgb ?? srgb ?? lab)?.[1]!.split(/[\s,/]+/).filter(Boolean).map((part) => (part.endsWith('%') ? Number.parseFloat(part) / 100 : Number(part)));
  if (!parts || parts.length < 3 || parts.some(Number.isNaN)) return null;
  const scale = rgb ? 255 : lab && !value.startsWith('ok') ? 100 : 1;
  const alpha = parts[3] ?? 1;
  return [...parts.slice(0, 3).map((channel) => (channel / scale) * alpha), alpha];
}

/**
 * Nothing flickers: no value leaves its way from start to end, no motion is finished in one jump, nothing blinks. A
 * colour is compared as premultiplied channels, as it is interpolated: a fade to `transparent` (whose channels are 0)
 * is continuous, and is no flicker. A box that stops being laid out at the end (a closed popup, `display: none`) is
 * no end-jump, and its way ends where it was last laid out. Endless motions are left out; `ignore` leaves out a finding.
 */
export function expectNoFlicker(seen: Frames, { ignore }: { ignore?: (flicker: Flicker) => boolean } = {}): void {
  const series = seen.complete ? [...seen.frames, seen.rest] : seen.frames;
  const endless = endlessKeys(seen);
  const keys = new Set(series.flatMap((frame) => Object.keys(frame.elements)));
  const found: Flicker[] = [];
  const at = (frames: number[]) => frames.map((f) => series[f]!.index);
  for (const key of keys) {
    if (endless(key)) continue;
    const states = series.map((frame) => frame.elements[key]);
    const closed = (() => {
      const last = states.at(-1)?.rect;
      return !!last && last[2] === 0 && last[3] === 0;
    })();
    const numeric = (property: string, values: (number | null)[], tolerance: number, least: number) => {
      const idx = values.map((_, f) => f).filter((f) => values[f] !== null);
      if (idx.length < 2) return;
      const v = (f: number) => values[f]!;
      const changes = idx.filter((f, j) => j > 0 && v(f) !== v(idx[j - 1]!));
      if (!changes.length) return;
      const start = v(idx[0]!);
      const end = v(idx.at(-1)!);
      const off = idx.filter((f) => v(f) < Math.min(start, end) - tolerance || v(f) > Math.max(start, end) + tolerance);
      if (off.length) found.push({ key, property, kind: 'off-path', frames: at(off), values: off.map(v) });
      const total = Math.abs(end - start);
      const lastAt = changes.at(-1)!;
      const last = Math.abs(v(lastAt) - v(idx[idx.indexOf(lastAt) - 1]!));
      if (changes.length >= 3 && total > least && last > 0.35 * total && !(closed && AXES.includes(property as (typeof AXES)[number])))
        found.push({ key, property, kind: 'end-jump', frames: at([lastAt]), values: [v(idx[idx.indexOf(lastAt) - 1]!), v(lastAt)] });
    };
    // A box that is not laid out in a frame (0 × 0 at the origin: `display: none`, or not in the top layer yet) has no
    // place on its way there: its way runs from where it was first laid out to where it was last — a surface that
    // appears the frame after it was put in the top layer, or leaves the way it came and is then taken out of it.
    const laidOut = states.map((s) => (s?.rect?.every((value) => value === 0) ? null : s));
    AXES.forEach((axis, i) => numeric(axis, laidOut.map((s) => s?.rect?.[i] ?? null), 2, 4));
    const style = (property: string) => states.map((s) => s?.style[property] ?? null);
    for (const property of ['opacity', 'border-top-width']) if (states.some((s) => s && property in s.style)) numeric(property, style(property).map((value) => (value === null ? null : Number.parseFloat(value))), 0.04, 0.1);
    for (const property of ['background-color', 'color', 'border-top-color']) {
      const raw = style(property);
      const colours = raw.map((value) => (value === null ? null : premultiplied(value)));
      const idx = colours.map((_, f) => f).filter((f) => colours[f] !== null);
      if (idx.length < 2) continue;
      const c = (f: number) => colours[f]!;
      const changes = idx.filter((f, j) => j > 0 && raw[f] !== raw[idx[j - 1]!]);
      if (!changes.length) continue;
      const a = c(idx[0]!);
      const b = c(idx.at(-1)!);
      const off = idx.filter((f) => c(f).some((channel, ch) => channel < Math.min(a[ch]!, b[ch]!) - 0.03 || channel > Math.max(a[ch]!, b[ch]!) + 0.03));
      if (off.length) found.push({ key, property, kind: 'off-path', frames: at(off), values: off.map((f) => raw[f]!) });
      const distance = (p: number[], q: number[]) => Math.max(...p.map((channel, ch) => Math.abs(channel - q[ch]!)));
      const lastAt = changes.at(-1)!;
      const before = idx[idx.indexOf(lastAt) - 1]!;
      const total = distance(a, b);
      if (changes.length >= 3 && total > 0.05 && distance(c(lastAt), c(before)) > 0.35 * total) found.push({ key, property, kind: 'end-jump', frames: at([lastAt]), values: [raw[before]!, raw[lastAt]!] });
    }
    for (const property of ['visibility', 'display']) {
      const values = style(property);
      const idx = values.map((_, f) => f).filter((f) => values[f] !== null);
      const changes = idx.filter((f, j) => j > 0 && values[f] !== values[idx[j - 1]!]);
      if (changes.length >= 2 && values[idx[0]!] === values[idx.at(-1)!]) found.push({ key, property, kind: 'blink', frames: at(changes), values: changes.map((f) => values[f]!) });
    }
  }
  expect(
    found.filter((flicker) => !ignore?.(flicker)).map(({ key, property, kind, frames, values }) => `${kind}: ${key} ${property} in frame(s) ${frames.join(', ')}: ${values.join(' → ')}`),
    'nothing flickers (off-path: leaves its way; end-jump: finished in one step; blink: goes and comes back)',
  ).toEqual([]);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

const probed = (frame: Frame, name: string | number) => {
  if (typeof name === 'number') return name;
  const value = frame.probe[name];
  if (typeof value !== 'number') throw new Error(`the probe gives no number named "${name}" (frame ${frame.index}: ${JSON.stringify(frame.probe)})`);
  return value;
};

/**
 * One thing keeps its place against another in every frame: `follower − anchor`, both read by the probe, is what it
 * is at rest, within `tolerance` px — the first line of a box that grows stays at the box's start, and
 * nothing scrolls on the way. `anchor` may be a number: `expectAnchored(seen, 'scrollTop', 0)` holds `scrollTop` where it
 * rests.
 */
export function expectAnchored(seen: Frames, follower: string, anchor: string | number, tolerance = 0.5): void {
  const offset = (frame: Frame) => probed(frame, follower) - probed(frame, anchor);
  const atRest = offset(seen.rest);
  const off = seen.frames.filter((frame) => Math.abs(offset(frame) - atRest) > tolerance).map((frame) => `frame ${frame.index} (${frame.time.toFixed(1)} ms): ${follower} − ${anchor} = ${round(offset(frame))}`);
  expect(off, `${follower} − ${anchor} stays ${round(atRest)} (as at rest) in every frame`).toEqual([]);
}


/** What `expectAnimated` follows: a probe's number, or a property of one element (a key, or the one key that ends with the text or matches the pattern). */
export type Followed = string | { element: string | RegExp; property: 'x' | 'y' | 'width' | 'height' | (string & {}) };

/**
 * A change the spec says moves does move: what `followed` names changes over at least `minSteps` frames on its way
 * from where it stood before the act to rest — a change made in one frame (an instant switch, or a motion cut short
 * and finished at once) is one step.
 */
export function expectAnimated(seen: Frames, followed: Followed, { minSteps = 4 }: { minSteps?: number } = {}): void {
  const series = [seen.before, ...seen.frames, ...(seen.complete ? [seen.rest] : [])];
  let label: string;
  let read: (frame: Frame) => number | string | null;
  if (typeof followed === 'string') {
    label = `probe ${followed}`;
    read = (frame) => probed(frame, followed);
  } else {
    const keys = [...new Set(series.flatMap((frame) => Object.keys(frame.elements)))];
    const matching = keys.filter((key) => (typeof followed.element === 'string' ? key === followed.element || key.endsWith(followed.element) : followed.element.test(key)));
    const exact = typeof followed.element === 'string' && keys.includes(followed.element) ? [followed.element] : matching;
    if (exact.length !== 1) throw new Error(`expectAnimated: ${String(followed.element)} names ${exact.length} elements${exact.length ? `: ${exact.join(', ')}` : ''}`);
    const [key] = exact as [string];
    const axis = AXES.indexOf(followed.property as (typeof AXES)[number]);
    label = `${key} ${followed.property}`;
    read = (frame) => {
      const el = frame.elements[key];
      if (!el) return null;
      return axis >= 0 ? (el.rect?.[axis] ?? null) : (el.style[followed.property] ?? null);
    };
  }
  const values = series.map(read);
  const steps = values.filter((value, i) => i > 0 && value !== values[i - 1]).length;
  const way = values.map((value) => String(value)).filter((value, i, all) => i === 0 || value !== all[i - 1]);
  expect(steps, `${label} changes in ${steps} frame(s), fewer than ${minSteps}: ${way.join(' → ')}`).toBeGreaterThanOrEqual(minSteps);
}

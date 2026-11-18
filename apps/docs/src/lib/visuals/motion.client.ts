// What the docs' motion demo does in the browser (components/visuals/MotionDemo.astro): it plays a component's motion
// on the live component, once, when the figure comes into view; plays it again from the start when the frame's first
// action is pressed; plays it in slow motion while the second is on; and, where the device asks for reduced motion,
// shows where the motion ends and moves nothing.
//
// - **The play is the component's own.** The stage holds the first fixture's elements, each numbered in the order it
//   opens (`data-motion-n`, lib/visuals/motion.ts `numbered`); the second fixture's stage is the same elements, and
//   the attributes that differ between the two are set on the live ones. The motion that follows is the component's.
// - **Again** is the first fixture's elements drawn afresh — a component draws its first frame without a motion — then
//   the same play.
// - **Slow motion** sets every duration custom property of the component's motion on the figure's subject, stretched
//   by the inverse of the demo's `slow`, read in the system the stage is drawn under. An animation that script starts
//   and that runs at an unstretched duration of the component's (it did not read the custom property) is slowed by its
//   `playbackRate` instead, so nothing is slowed twice.
// - **Reduced motion**: the stage is given the second fixture's elements before they are defined, so they are drawn at
//   the end from their first frame; there is nothing to play, and the actions are not shown.
// - **The stage says which fixture it shows** (`data-motion-shows`, `from` or `to`), so that a test comparing the
//   figure with a drawing of its served markup draws that fixture (test/browser/compare-previews.mjs).
//
// test/browser/motion-demo.test.mjs measures the play: the duration of what moves is the token's at full speed and
// four times it in slow motion, and nothing in the figure — its shadow trees included — runs under reduced motion.
import { whenNear } from '../example';
import { defined, settled, shadowRootsIn, SYSTEM_EVENT } from './frame';

/** Sent on a demo's frame each time a play has begun: the attributes are set and the motion is under way. */
export const MOTION_PLAYED_EVENT = 'docs-motion-played';

interface Data {
  durationVar: string;
  durationVars: string[];
  slow: number;
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** A fixture's numbered markup as elements no script defines yet. */
function parse(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}

const byNumber = (root: ParentNode) => new Map([...root.querySelectorAll<Element>('[data-motion-n]')].map((element) => [element.getAttribute('data-motion-n')!, element]));

/** The attributes the play sets on each numbered element (`null`: taken away), the stage itself left as it is. */
function changesOf(from: DocumentFragment, to: DocumentFragment): Map<string, Map<string, string | null>> {
  const after = byNumber(to);
  const out = new Map<string, Map<string, string | null>>();
  for (const [n, element] of byNumber(from)) {
    const target = after.get(n);
    // The stage (`data-fixture`, the fixture's id) is the first element: its staging is the first fixture's.
    if (!target || element.hasAttribute('data-fixture')) continue;
    const changes = new Map<string, string | null>();
    for (const { name, value } of target.attributes) if (element.getAttribute(name) !== value) changes.set(name, value);
    for (const { name } of element.attributes) if (!target.hasAttribute(name)) changes.set(name, null);
    if (changes.size) out.set(n, changes);
  }
  return out;
}

/** Every animation of the subject's elements, their shadow trees included. */
function animationsIn(root: Element): Animation[] {
  return [...new Set([...root.getAnimations({ subtree: true }), ...shadowRootsIn(root).flatMap((shadow) => shadow.getAnimations())])];
}

/** A computed duration (`300ms`, `0.3s`) in milliseconds, or null. */
function milliseconds(value: string): number | null {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value.trim());
  return match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : null;
}

const updated = (root: Element) =>
  Promise.all([...root.querySelectorAll('*')].map((element) => (element as Element & { updateComplete?: Promise<unknown> }).updateComplete).filter(Boolean));

const frameDone = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function demo(subject: HTMLElement) {
  const frame = subject.closest<HTMLElement>('[data-example]');
  const stage = subject.querySelector<HTMLElement>('[data-motion-stage]');
  const statesScript = subject.querySelector<HTMLScriptElement>('script[data-motion-states]');
  if (!frame || !stage || !statesScript) return;
  const data = JSON.parse(subject.dataset.motion ?? '{}') as Data;
  const states = JSON.parse(statesScript.textContent ?? '{}') as { from: string; to: string };
  const changes = changesOf(parse(states.from), parse(states.to));
  const caption = {
    ms: frame.querySelector<HTMLElement>('[data-motion-ms]'),
    slowed: frame.querySelector<HTMLElement>('[data-motion-slowed]'),
    slowMs: frame.querySelector<HTMLElement>('[data-motion-slow-ms]'),
    reduced: frame.querySelector<HTMLElement>('[data-motion-reduced]'),
  };
  let slow = false;
  let plays = 0;
  let playing: Promise<void> = Promise.resolve();

  /**
   * Each duration of the component's motion, in milliseconds, in the stage's system and without slow motion. A token's
   * custom property holds what the system wrote (an expression of the motion's scale), so each is computed as a
   * duration on a probe inside the subject.
   */
  const durations = (): Map<string, number> => {
    const kept = data.durationVars.map((name) => [name, subject.style.getPropertyValue(name)] as const);
    for (const [name] of kept) subject.style.removeProperty(name);
    const probe = subject.appendChild(document.createElement('span'));
    probe.hidden = true;
    const read = new Map(
      data.durationVars.flatMap((name) => {
        probe.style.transitionDuration = `var(${name})`;
        const ms = milliseconds(getComputedStyle(probe).transitionDuration);
        return ms === null ? [] : [[name, ms] as const];
      }),
    );
    probe.remove();
    for (const [name, value] of kept) if (value) subject.style.setProperty(name, value);
    return read;
  };

  /** The caption's numbers, and the custom properties slow motion stretches. */
  const write = () => {
    const read = durations();
    const ms = read.get(data.durationVar);
    if (caption.ms && ms !== undefined) caption.ms.textContent = String(ms);
    if (caption.slowMs && ms !== undefined) caption.slowMs.textContent = String(ms / data.slow);
    if (caption.slowed) caption.slowed.hidden = !slow;
    for (const [name, value] of read) {
      if (slow) subject.style.setProperty(name, `${value / data.slow}ms`);
      else subject.style.removeProperty(name);
    }
    return read;
  };

  /** The second fixture's elements in the stage, before or after they are defined: drawn at the end, nothing played. */
  const showEnd = () => {
    frame.dataset.motionReduced = '';
    if (caption.reduced) caption.reduced.hidden = false;
    if (caption.slowed) caption.slowed.hidden = true;
    stage.replaceChildren(parse(states.to));
    stage.dataset.motionShows = 'to';
  };

  /** Slows an animation script started at an unstretched duration of the component's (see the head of this file). */
  const slowScripted = (animation: Animation, originals: number[]) => {
    if (!slow || animation instanceof CSSTransition || animation instanceof CSSAnimation || animation.playbackRate !== 1) return;
    const duration = Number(animation.effect?.getTiming().duration);
    const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
    if (originals.some((ms) => near(duration, ms)) && !originals.some((ms) => near(duration, ms / data.slow))) animation.playbackRate = data.slow;
  };

  const play = async (again: boolean) => {
    if (reduced.matches) return;
    if (again) {
      stage.replaceChildren(parse(states.from));
      stage.dataset.motionShows = 'from';
    }
    await defined(stage);
    await updated(stage);
    // An element starts no transition while it settles, until two frames after its first update (the web package's
    // first frame at rest): the play waits for a frame more than that.
    for (let n = 0; n < 3; n++) await frameDone();
    await settled(stage);
    const originals = [...write().values()];
    const elements = byNumber(stage);
    for (const [n, attributes] of changes) {
      const element = elements.get(n);
      if (!element) continue;
      for (const [name, value] of attributes) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }
    stage.dataset.motionShows = 'to';
    await updated(stage);
    // What the change starts is found in the frame it is drawn, and in the frames after it (a component that measures
    // before it moves starts its motion a frame later), until a frame finds nothing running.
    const seen = new Set<Animation>();
    const look = () => {
      const running = animationsIn(stage).filter((animation) => animation.playState === 'running');
      for (const animation of running) {
        if (seen.has(animation)) continue;
        seen.add(animation);
        slowScripted(animation, originals);
      }
      return running.length;
    };
    look();
    plays += 1;
    frame.dataset.motionPlays = String(plays);
    frame.dispatchEvent(new CustomEvent(MOTION_PLAYED_EVENT, { detail: { plays } }));
    for (let quiet = 0; quiet < 3; ) {
      await frameDone();
      quiet = look() ? 0 : quiet + 1;
    }
  };
  /** Plays once the play before has ended (a press of "again" while the motion runs starts it over after it). */
  const queue = (again: boolean) => {
    playing = playing.then(() => play(again)).catch(() => undefined);
    return playing;
  };

  if (reduced.matches) showEnd();
  reduced.addEventListener('change', () => {
    if (reduced.matches) showEnd();
  });
  frame.addEventListener(SYSTEM_EVENT, () => void defined(stage).then(write));

  whenNear(frame, () => {
    // The actions are drawn now (lib/example.ts).
    const again = frame.querySelector<HTMLElement>('[data-motion-replay]');
    const slower = frame.querySelector<HTMLElement & { selected?: boolean }>('[data-motion-slow]');
    again?.addEventListener('click', () => void queue(true));
    slower?.addEventListener('change', () => {
      slow = slower.selected === true || slower.hasAttribute('selected');
      void queue(true);
    });
    void defined(stage).then(write);
    // Once, when half of the component is in view: not as it comes near, which the frame's elements wait for.
    const inView = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        inView.disconnect();
        void queue(false);
      },
      { threshold: [0.5] },
    );
    inView.observe(subject);
  });
}

for (const subject of document.querySelectorAll<HTMLElement>('[data-motion]')) demo(subject);

import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { APPEARING, REDUCED_MOTION_ATTRIBUTE, REDUCED_MOTION_MEDIA, REDUCED_MOTION_VALUE, SETTLING, reducedMotion } from '../styles/motion.js';
import { type PhaseRead, readThenWrite, readTogether } from './read-together.js';

// How a component moves, in four pieces, held to the principles of docs/architecture/motion.md (MOT-1 to MOT-6):
//
//   documentPainted()   whether the document has been painted once: an overlay mounted open before it appears at once,
//                       after it plays its entrance (MOT-4)
//   appearStyles()      the one appearance of a surface — its opacity, scale, distance and blur from
//                       `sys.motion.appear.*`, grown from its anchor, its centre or an edge, left the same way back on the
//                       exit curve, and the reduced form (MOT-6)
//   AppearController    opens and closes that surface: the entrance skipped where MOT-4 says so, turned round from the
//                       value shown (MOT-2), and `exit()` resolved when the exit has finished — never by a timer
//   AnimatedSize        a box whose size follows its content as one motion, its content fixed to an edge, nothing
//                       scrolled on the way (MOT-5)
//   Settle              no transition while an element draws its first frames (MOT-3; the rule is src/styles/motion.ts)
//
// Every duration and curve is a token the component names (its own, aliasing a role) or, where it names none, the
// role's system token. Nothing here parses a duration: a motion's end is its transitions' own `finished`.

type Host = ReactiveControllerHost & HTMLElement;

// ── The document's first paint (MOT-4) ────────────────────────────────────────────────────────────────────────────────

let painted = false;
let tellPainted!: () => void;
const whenPainted = new Promise<void>((resolve) => (tellPainted = resolve));
const markPainted = () => {
  painted = true;
  tellPainted();
};
// The second frame callback after the document is parsed runs once its first frame has been painted. Paint Timing would
// say so too, but Firefox reports no `first-paint`, and a `first-contentful-paint` before the parse ends (a browser may
// paint parsed content before the module scripts run) is a page whose overlays the module has not upgraded yet: they
// are still being mounted, and appear at once. A module that arrives after the parse (a chunk loaded later) finds a
// page that was painted where Paint Timing says so, and waits the two frames where it says nothing.
const twoFrames = () => requestAnimationFrame(() => requestAnimationFrame(markPainted));
if (typeof document !== 'undefined' && typeof requestAnimationFrame === 'function') {
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  const parsed = document.readyState === 'complete' || (navigation?.domContentLoadedEventEnd ?? 0) > 0;
  if (!parsed) document.addEventListener('DOMContentLoaded', twoFrames, { once: true });
  else if (performance.getEntriesByType?.('paint').length) markPainted();
  else twoFrames();
}

/** Whether the document has been painted once (MOT-4): false until then, and always on a server. */
export const documentPainted = (): boolean => painted;

/** Resolves once the document has been painted (MOT-4); never on a server. */
export const afterFirstPaint = (): Promise<void> => whenPainted;

// ── Reduced motion (MOT-6) ────────────────────────────────────────────────────────────────────────────────────────────

// The person's setting, or the product's on the root element (src/styles/motion.ts says how a stylesheet reads both).
// A motion that script plays or holds asks here, never `matchMedia` itself: the attribute is read as it is, with no
// style to work out first. The media query is asked again each time: a list kept from before answers in WebKit what
// held at its last rendering update, so a setting changed since (emulated, in a test) would be read a frame late. The
// kept list is only the one the watchers listen to.
const reducedQuery = typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION_MEDIA) : null;
const reducedByPerson = () => typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_MEDIA).matches;
const reducedInApp = () => typeof document !== 'undefined' && document.documentElement?.getAttribute(REDUCED_MOTION_ATTRIBUTE) === REDUCED_MOTION_VALUE;

/** Whether motion is reduced now (MOT-6): the person's `prefers-reduced-motion`, or the product's `data-tanrei-motion="reduce"` on the root. */
export const motionReduced = (): boolean => reducedByPerson() || reducedInApp();

const reducedWatchers = new Set<(reduced: boolean) => void>();
let reducedShown = false;
let reducedObserver: MutationObserver | null = null;
const reducedChanged = () => {
  const now = motionReduced();
  if (now === reducedShown) return;
  reducedShown = now;
  for (const watcher of [...reducedWatchers]) watcher(now);
};

/**
 * Calls `changed` with the new answer each time `motionReduced()` changes — the person changes their setting, or the
 * product sets or takes off the root's attribute — and returns the function that stops. One media query listener and
 * one observer of the root's attribute serve every watcher, and only while there is one.
 */
export const watchMotionReduced = (changed: (reduced: boolean) => void): (() => void) => {
  if (!reducedWatchers.size) {
    reducedShown = motionReduced();
    reducedQuery?.addEventListener('change', reducedChanged);
    if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
      reducedObserver = new MutationObserver(reducedChanged);
      reducedObserver.observe(document.documentElement, { attributes: true, attributeFilter: [REDUCED_MOTION_ATTRIBUTE] });
    }
  }
  reducedWatchers.add(changed);
  return () => {
    if (!reducedWatchers.delete(changed) || reducedWatchers.size) return;
    reducedQuery?.removeEventListener('change', reducedChanged);
    reducedObserver?.disconnect();
    reducedObserver = null;
  };
};

// ── The appearance (appearStyles) ─────────────────────────────────────────────────────────────────────────────────────

/** What appears: the role names how long it takes (`sys.motion.role.appear.<role>`). */
export type AppearRole = 'hint' | 'anchored' | 'modal' | 'sheet' | 'toast';

/**
 * Where a surface grows from, and the side it starts toward: its anchor (the edge that faces it, from the placed box's
 * `data-side`, as `AnchoredSurfaceController` writes it), its own centre, or one of its edges (a snackbar from the
 * window's edge, a sheet from the side it is docked to).
 */
export type AppearOrigin = 'anchor' | 'center' | 'block-start' | 'block-end' | 'inline-start' | 'inline-end';

/** A duration and a curve, each a CSS value (`var(--tanrei-comp-menu-motion-enter-duration)`). */
export interface AppearTiming {
  duration: string;
  easing: string;
}

export interface AppearOptions {
  /** The element that fades, scales, moves and blurs. */
  motion: string;
  /**
   * The condition that holds while the surface is open, on the motion element or an element round it in the same
   * shadow root (`.surface.open`, `[open]`). Keep it apart from the top layer's own state (`:popover-open`): the
   * surface is taken out of the top layer after `exit()` resolves, so it stays in it while its exit plays. A modal
   * `<dialog>` is opened and closed with `openModal()` and `closeModal()` (src/primitives/modal-exit.ts), which keep it
   * drawn in the top layer, its `[open]` gone, until its exit and its scrim's have played: `[open]` is its condition.
   */
  open: string;
  role: AppearRole;
  origin: AppearOrigin;
  /** The entrance's duration and curve: by default the role's `enter` and `sys.motion.easing.enter`. */
  enter?: AppearTiming;
  /** The exit's: by default the role's `exit` and `sys.motion.easing.exit`. */
  exit?: AppearTiming;
  /**
   * The prefix of the tokens it starts from — `<appear>-opacity`, `-scale`, `-distance`, `-blur` and `-origin` — for a component
   * whose own appearance aliases the system's (`--tanrei-comp-menu-motion-appear`). By default the system's,
   * `--tanrei-sys-motion-appear`. A sheet starts from its edge whatever they say.
   */
  appear?: string;
  /** The duration of the cross-fade under reduced motion: by default `sys.motion.role.reduced`. */
  reduced?: string;
  /**
   * Whether the scale follows `sys.behavior.appearance: unfold` along the one axis that leaves the origin (the
   * default). False: it scales on both axes under every appearance, for a surface that grows from its edge beside what
   * opened it rather than away from it (a FAB menu's item, from its end edge beside the toggle).
   */
  unfold?: boolean;
  /**
   * A translate of the component's own that the open surface stands at, in place of none: where a gesture of the
   * person's has moved it (a sheet's drag: `0 var(--_drag, 0px)`). The entrance ends there, the exit starts from
   * wherever it is drawn, and under reduced motion the surface fades in and out where it stands. Changing it while the
   * surface is open moves the surface over the entrance's duration and curve (a released drag going back), unless the
   * component turns the transitions off meanwhile (while the drag follows the pointer).
   */
  offset?: string;
}

/** The properties an appearance moves; what an exit waits for. `transform` too, for a surface still drawn with it. */
const APPEAR_PROPERTIES = new Set(['opacity', 'scale', 'translate', 'filter', 'transform']);
// Neither `display` nor `overlay` is transitioned: nothing the browser takes out of the top layer by itself has an exit
// to keep drawn. Every popover is a manual one, which the browser never light-dismisses (test/popovers-manual.test.mjs):
// its component dismisses it, plays its exit and takes it out of the top layer once `exit()` resolves. A modal
// `<dialog>` is closed with `closeModal()` (src/primitives/modal-exit.ts), which keeps it drawn, its display held, until
// its exit has played. Kept drawn by a discrete transition of the two instead, only Chromium would play that exit:
// WebKit and Firefox (which has no `overlay`) take the surface away at once.
const MOVED = 'opacity, scale, translate, filter';

/** `:is(<condition>)` on the motion element or on an element round it. */
const under = (condition: string, motion: string) => `:is(${condition}) :is(${motion}), :is(${motion}):is(${condition})`;

/**
 * The CSS of one appearance (MOT-2, MOT-6, report "One appearance" of docs/architecture/motion.md). Closed, the motion
 * element stands where it starts from — `appear.opacity`, `appear.scale` toward its origin, `appear.distance` toward
 * its origin's side, `appear.blur` — and open it is whole; between the two it moves on the role's enter or exit
 * duration and curve, from the value shown when it is turned round (a transition does). Its first frame, where it was
 * not drawn before (in the top layer, or shown with its host), is the start (`@starting-style`).
 *
 * An anchored surface grows from the edge that faces its anchor, or from its own centre where `appear.origin` says
 * `center` (its side is still the one it starts toward). Under `sys.behavior.appearance: unfold` the scale applies along the one axis that leaves the anchor or the edge (both
 * axes from the centre), read with a style container query; a browser without them scales both axes (and so does a
 * surface that asks for no unfolding, `unfold: false`). A sheet slides
 * from its edge by its own size, unfaded and unscaled, whatever the appearance (and stands at its `offset` open, where a
 * gesture of the person's moves it). Under reduced motion every appearance
 * is a cross-fade over `role.reduced`: no scale, no distance, no blur (WCAG 2.3.3 counts none of opacity as motion).
 *
 * It sets `opacity`, `scale`, `translate`, `filter`, `transform-origin` and the transition of the motion element: a
 * component draws nothing of its own with them there (an elevation's filter goes on another element). The writing
 * mode is horizontal.
 */
export function appearStyles(options: AppearOptions): CSSResult {
  const { motion, role, origin } = options;
  const enter = options.enter ?? { duration: `var(--tanrei-sys-motion-role-appear-${role}-enter)`, easing: 'var(--tanrei-sys-motion-easing-enter)' };
  const exit = options.exit ?? { duration: `var(--tanrei-sys-motion-role-appear-${role}-exit)`, easing: 'var(--tanrei-sys-motion-easing-exit)' };
  const from = options.appear ?? '--tanrei-sys-motion-appear';
  const fade = options.reduced ?? 'var(--tanrei-sys-motion-role-reduced)';
  const open = under(options.open, motion);
  const sheet = role === 'sheet';
  // Toward the side it starts from (-1, 0, 1 on each axis), and where it grows from (scaled on both axes).
  const toward = (x: number, y: number, at: string) =>
    `--_appear-dx: ${x}; --_appear-dy: ${y}; --_appear-sx: var(--_appear-scale); --_appear-sy: var(--_appear-scale); transform-origin: ${at};`;
  // The unfolding axis is the one that leaves the edge: a surface below its anchor unfolds downward, its width whole.
  const unfold = (keep: 'x' | 'y' | 'none') =>
    keep === 'none' ? '' : `--_appear-${keep === 'x' ? 'sx' : 'sy'}: 1; --_appear-${keep === 'x' ? 'sy' : 'sx'}: var(--_appear-scale);`;
  type Side = { x: number; y: number; keep: 'x' | 'y' | 'none'; at: string };
  const SIDES: Record<string, Side> = {
    // The placed box below its anchor starts toward it (up) and grows from its top edge; and so on round.
    bottom: { x: 0, y: -1, keep: 'x', at: '50% 0' },
    top: { x: 0, y: 1, keep: 'x', at: '50% 100%' },
    right: { x: -1, y: 0, keep: 'y', at: '0 50%' },
    left: { x: 1, y: 0, keep: 'y', at: '100% 50%' },
  };
  const EDGES: Record<Exclude<AppearOrigin, 'anchor'>, { ltr: Side; rtl?: Side }> = {
    // The centre: from below, where a distance is asked for (a dialog rises into place).
    center: { ltr: { x: 0, y: 1, keep: 'none', at: '50% 50%' } },
    'block-start': { ltr: { x: 0, y: -1, keep: 'x', at: '50% 0' } },
    'block-end': { ltr: { x: 0, y: 1, keep: 'x', at: '50% 100%' } },
    'inline-start': { ltr: { x: -1, y: 0, keep: 'y', at: '0 50%' }, rtl: { x: 1, y: 0, keep: 'y', at: '100% 50%' } },
    'inline-end': { ltr: { x: 1, y: 0, keep: 'y', at: '100% 50%' }, rtl: { x: -1, y: 0, keep: 'y', at: '0 50%' } },
  };
  const side = (s: Side) => toward(s.x, s.y, s.at);
  const places: string[] = [];
  const unfolds: string[] = [];
  const centred: string[] = [];
  if (origin === 'anchor') {
    places.push(`:is(${motion}) { ${side(SIDES.bottom!)} }`);
    unfolds.push(`:is(${motion}) { ${unfold('x')} }`);
    centred.push(`:is(${motion}) { transform-origin: 50% 50%; }`);
    for (const [name, s] of Object.entries(SIDES)) {
      places.push(`${under(`[data-side='${name}']`, motion)} { ${side(s)} }`);
      unfolds.push(`${under(`[data-side='${name}']`, motion)} { ${unfold(s.keep)} }`);
      centred.push(`${under(`[data-side='${name}']`, motion)} { transform-origin: 50% 50%; }`);
    }
    // Moved back over its anchor, it grows from its middle and moves toward no side.
    places.push(`${under('[data-held]', motion)} { --_appear-dx: 0; --_appear-dy: 0; transform-origin: 50% 50%; }`);
  } else {
    const edge = EDGES[origin];
    places.push(`:is(${motion}) { ${side(edge.ltr)} }`);
    unfolds.push(`:is(${motion}) { ${unfold(edge.ltr.keep)} }`);
    if (edge.rtl) {
      places.push(`:is(${motion}):dir(rtl) { ${side(edge.rtl)} }`);
      unfolds.push(`:is(${motion}):dir(rtl) { ${unfold(edge.rtl.keep)} }`);
    }
  }
  // Where it starts from. A sheet: its own size toward its edge, whole and unfaded.
  // The blur is a filter only where there is one to draw: closed with no blur, the surface has no filter, as it has none
  // open, so no transition of `filter` runs. WebKit (Playwright's build on Linux) crashes or stalls the page while one
  // runs — blur(0px) to none included, which draws nothing — and every shipped system starts from no blur.
  // The distance is a translate only where there is one to move by, in the same way: closed with no distance, the
  // surface has no translate, as it has none open, so no transition of `translate` runs (from `0px 0px` to `none`,
  // which moves nothing, a transition WebKit still runs beside the fade and the scale) — and every shipped system
  // starts from no distance. Both are style container queries: a browser without them keeps the
  // filter `blur(0px)` and the translate `0px 0px` closed, and runs those two transitions, which draw nothing.
  const offset = 'calc(var(--_appear-dx) * var(--_appear-distance)) calc(var(--_appear-dy) * var(--_appear-distance))';
  const start = sheet
    ? `--_appear-opacity: 1; --_appear-scale: 1; --_appear-distance: 100%; --_appear-translate: ${offset}; --_appear-blur: 0px; --_appear-filter: none;`
    : `--_appear-opacity: var(${from}-opacity); --_appear-scale: var(${from}-scale); --_appear-distance: var(${from}-distance); --_appear-translate: ${offset}; --_appear-blur: var(${from}-blur); --_appear-filter: blur(var(--_appear-blur));`;
  // A sheet is unscaled closed as open: `none` both ways, so no transition of `scale` runs (from `1 1` to `none`, which
  // scales nothing, a transition every engine still runs beside the slide).
  const closed = `opacity: var(--_appear-opacity);
    scale: ${sheet ? 'none' : 'var(--_appear-sx) var(--_appear-sy)'};
    translate: var(--_appear-translate);
    filter: var(--_appear-filter);`;
  const stands = options.offset ?? 'none';
  const whole = `opacity: 1; scale: none; translate: ${stands}; filter: none;`;
  const timing = (t: AppearTiming, properties = MOVED) => `transition-property: ${properties}; transition-duration: ${t.duration}; transition-timing-function: ${t.easing};`;
  const reducedClosed = `opacity: ${sheet ? 0 : 'var(--_appear-opacity)'}; scale: none; translate: ${stands}; filter: none;`;
  const reducedProperties = 'opacity';
  return unsafeCSS(`
  :is(${motion}) {
    ${start}
    ${closed}
    ${timing(exit)}
  }
  ${places.join('\n  ')}
  ${options.unfold === false ? '' : `@container style(--tanrei-sys-behavior-appearance: unfold) {\n    ${unfolds.join('\n    ')}\n  }`}
  ${centred.length ? `@container style(${from}-origin: center) {\n    ${centred.join('\n    ')}\n  }` : ''}
  ${sheet ? '' : `@container style(${from}-blur: 0px) {\n    :is(${motion}) { --_appear-filter: none; }\n  }`}
  ${sheet ? '' : `@container style(${from}-distance: 0px) {\n    :is(${motion}) { --_appear-translate: none; }\n  }`}
  ${open} {
    ${whole}
    ${timing(enter)}
  }
  @starting-style {
    ${open} {
      ${closed}
    }
  }
  ${reducedMotion(`
    :is(${motion}) {
      ${reducedClosed}
      ${timing({ duration: fade, easing: exit.easing }, reducedProperties)}
    }
    ${open} {
      opacity: 1;
      ${timing({ duration: fade, easing: enter.easing }, reducedProperties)}
    }
    @starting-style {
      ${open} {
        ${reducedClosed}
      }
    }
  `)}
`);
}

// ── Opening and closing (AppearController) ────────────────────────────────────────────────────────────────────────────

/** The transitions of an appearance running on `element` itself (not inside it); asking flushes style. */
const appearing = (element: Element) =>
  element.getAnimations().filter((animation) => APPEAR_PROPERTIES.has((animation as CSSTransition).transitionProperty ?? '') && animation.playState !== 'finished');

/** The motions `startFromNextFrame()` has held: each is held once. */
const heldOnce = new WeakSet<Animation>();

/**
 * The motions that a change of state just started, in the task that made it, begin in the first frame drawn after it,
 * in every engine. WebKit dates a transition from the timeline's time, which is the time of the frame drawn last and
 * stands still while a task runs: a surface opened at the end of a long task has that much of its entrance over before
 * its first frame, and none of it where the task outlasted the entrance — the transition is then dropped at that frame
 * (or ended there, with its events), and the surface is drawn whole at once. (A combobox's list, its rows rendered in
 * the task that opens it, took 200–340 ms there on a two-core Linux runner, against an entrance of 300 ms.) Played
 * again in the same task it is dated the same way; so each is held at its start, which the next frame draws, and
 * played from that frame (`nextFrame`), dated from that frame's time (`playFromThisFrame`). One that is no longer held
 * there — replaced or cancelled (opened or closed again), or held elsewhere by a script — is left as it is. A hidden
 * document draws no frame, and shows nothing, until it is shown: its motions are left to the engine. `leaving`: the
 * motions are an exit, which the surface waits for before it goes, and so are played even where a page clock holds
 * frame callbacks (`nextFrame`). A motion is held once: from the frame it is played from it runs as it is, and held
 * again it would start over from a later one.
 */
export function startFromNextFrame(motions: readonly Animation[], { leaving = false }: { leaving?: boolean } = {}): void {
  holdFromNextFrame(motions, leaving)?.();
}

/**
 * `startFromNextFrame()` with every other host's reads of the turn (`readTogether`, src/primitives/read-together.ts): the
 * motions `motions()` gives are listed — asking flushes style — together with the others, and held after every read.
 * Still in the task that started them, before any frame: they begin in the first frame drawn after it, as they would
 * held at once. Ask once the change that starts them has been made.
 */
export function startTogetherFromNextFrame(motions: () => readonly Animation[], { leaving = false }: { leaving?: boolean } = {}): void {
  askFrame();
  readTogether(() => holdFromNextFrame(motions(), leaving));
}

/**
 * `startFromNextFrame()` in two steps: which of `motions` to hold (a read: asking a CSS motion its state brings style up
 * to date), and the write that holds them. A motion cancelled in between (replaced by a write that came first) has no
 * time, and is left as it is.
 */
function holdFromNextFrame(motions: readonly Animation[], leaving: boolean): (() => void) | void {
  if (typeof requestAnimationFrame !== 'function' || document.visibilityState === 'hidden') return;
  const started = motions.filter((animation) => animation.playState === 'running' && !heldOnce.has(animation));
  if (!started.length) return;
  return () => {
    const held = started.filter((animation) => !heldOnce.has(animation) && animation.currentTime !== null);
    if (!held.length) return;
    for (const animation of held) {
      heldOnce.add(animation);
      animation.pause();
      animation.currentTime = 0;
    }
    nextFrame(() => {
      const due = held.filter((animation) => animation.playState === 'paused' && animation.currentTime === 0);
      return () => {
        for (const animation of due) playFromThisFrame(animation);
      };
    }, leaving);
  };
}

/**
 * Plays a held motion on from where it is held, dated from the frame being drawn (in a task, the frame drawn last): its
 * start time is that frame's time less the time it is held at, so it stands there in this frame and runs from there,
 * with nothing left pending. `play()` would leave it waiting for the engine to give it a start time, and from a frame's
 * rendering steps (a frame callback, a resize observer's report, or an input event Chromium sends there: a pointer's
 * moves, its entering and leaving) Chromium never gave one to a motion it had already been waiting for when it was
 * held — begun or played in an earlier task, or in an earlier frame, with no frame drawn since — where it was held at
 * the time that wait began: the motion stood there, pending, for good (a menu item's colors, begun by the key that moved
 * focus off it and held by the next key, which opened a submenu before a frame was drawn; a line's text, played on when
 * focus left it and held when focus came back before a frame was drawn). Every motion that the component holds and
 * plays on goes through here. The current time is written last: Firefox gives a page the timeline's time coarsened, a
 * few hundredths of a millisecond before its own, and a start time taken from it alone had the motion that far in (an
 * opacity of 1.5e-8, not 0). Where the timeline has no time, or the motion no current time, it is played as usual.
 */
export function playFromThisFrame(animation: Animation): void {
  const now = animation.timeline?.currentTime;
  const held = animation.currentTime;
  if (now === null || now === undefined || held === null) {
    animation.play();
    return;
  }
  animation.startTime = now;
  animation.currentTime = held;
}

/**
 * The motions of states that a change made in this task began under `roots` — focus given to an item as a surface
 * opens, a control's turn, a row's look in another form — begin in the first frame drawn after it, as an appearance
 * does (`startFromNextFrame`): WebKit dated them from the frame drawn before the task, and where opening took longer
 * than they last (a surface's items placed and rendered on a loaded machine) drew their end state at once, with no frame
 * of them. Each root is looked through whole: its subtree and every shadow root inside it, at any depth. Only a motion
 * that stands at its start is held; one under way goes on as it is, and an appearance's is left to its controller
 * (`holdStates`). It holds what has begun when it is called, and again once the updates the task queued under the roots
 * have rendered — still in the task, as they are microtasks: what an item draws differently once the change reaches it.
 * They are played in that frame even where a page clock holds frame callbacks (`leaving`): what a state's motion moves
 * runs on the document's timeline, which no page clock holds, so it must not stand at its start for as long as a clock
 * is held. Call it at the end of the opening (or closing) task, once focus has moved. The motions are listed with every
 * other host's reads of the turn (`readTogether`), still in the task: asking brings style up to date, once for them all.
 */
export function statesFromNextFrame(roots: readonly (Element | null | undefined)[]): void {
  const given = roots.filter((root): root is Element => !!root);
  holdStates(given);
  void afterUpdates(given).then(() => holdStates(given));
}

/**
 * Each root and every shadow root under `roots`, at any depth (`trees`), and every element in them (`elements`). An
 * element's `getAnimations({ subtree: true })` and a shadow root's `getAnimations()` list the motions of that tree,
 * pseudo-elements' included, and none inside a shadow root of it.
 */
function treesUnder(roots: readonly Element[]): { trees: (Element | ShadowRoot)[]; elements: Element[] } {
  const trees: (Element | ShadowRoot)[] = [];
  const elements: Element[] = [];
  const walk = (root: Element | ShadowRoot) => {
    trees.push(root);
    for (const element of root instanceof Element ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*')) {
      elements.push(element);
      if (element.shadowRoot) walk(element.shadowRoot);
    }
  };
  for (const root of roots) walk(root);
  return { trees, elements };
}

/**
 * `statesFromNextFrame()`'s hold: every motion under `roots` that stands at its start, but an appearance's (on an
 * element that carries `APPEARING`), which its controller holds or leaves (`AppearController`: an exit that turns an
 * entrance round is left as it is). Asked with every other host's reads of the turn (`startTogetherFromNextFrame`):
 * asking brings style up to date.
 */
function holdStates(roots: readonly Element[]) {
  const appearing = (animation: Animation) => !!((animation.effect as KeyframeEffect | null)?.target as Element | null)?.hasAttribute(APPEARING);
  startTogetherFromNextFrame(
    () =>
      treesUnder(roots)
        .trees.flatMap((tree) => (tree instanceof Element ? tree.getAnimations({ subtree: true }) : tree.getAnimations()))
        .filter((animation) => Number(animation.currentTime ?? 0) === 0 && !appearing(animation)),
    { leaving: true },
  );
}

/**
 * Settles once no element under `roots` has an update pending: what the task's change told them (an item's form, a
 * control's state) is rendered. Each update is a microtask, so this is still the same task.
 */
async function afterUpdates(roots: readonly Element[]): Promise<void> {
  await null;
  for (let round = 0; round < 8; round++) {
    const pending = treesUnder(roots).elements.filter((element) => (element as Partial<ReactiveControllerHost & { isUpdatePending: boolean }>).isUpdatePending);
    if (!pending.length) return;
    await Promise.all(pending.map((element) => (element as unknown as ReactiveControllerHost).updateComplete));
  }
}

/** A request of `nextFrame()`: its read, and the observer that runs it where a page clock holds frame callbacks. */
interface FrameRequest {
  read: PhaseRead;
  done: boolean;
  observer: ResizeObserver | null;
}

/** What has asked for the next frame, in the order it asked. */
let frameRequests: FrameRequest[] = [];
let frameAsked = false;

/**
 * The frame callback that runs the requests of the next frame (`nextFrame`), asked for once. A hold made with the
 * reads of the turn asks for it when it is asked for, not once it has read: its motions are played in that frame before
 * the callbacks a script asked for after it, as they would be held at once.
 */
function askFrame() {
  if (frameAsked || typeof requestAnimationFrame !== 'function') return;
  frameAsked = true;
  requestAnimationFrame(() => {
    frameAsked = false;
    const due = frameRequests;
    frameRequests = [];
    runFrame(due);
  });
}

/**
 * The reads of `requests` not made yet, then the writes they returned: asking a held motion its state brings style up
 * to date, and a motion played on changes it, so every read comes before the first write — one style for them all.
 */
function runFrame(requests: readonly FrameRequest[]) {
  const due = requests.filter((request) => !request.done);
  for (const request of due) {
    request.done = true;
    request.observer?.disconnect();
  }
  // One surface's failure is not another's: every read and write runs, and the first failure is the frame's.
  readThenWrite(due.map((request) => request.read));
}

/**
 * Runs `read` once, in the next frame the document draws: in its frame callbacks, with every other request of that
 * frame — all their reads, then the writes they return. `unheld` (an exit, which a surface waits for before it leaves
 * the top layer): also where a page clock holds those callbacks (Playwright's `page.clock`, a test's fake timers), at a
 * resize observer's first report of the root, which every drawn frame gives and no clock holds; else the surface would
 * stand at the start of its exit for as long as the clock does, and never leave. The root is observed from a task of
 * its own (a message, which no clock holds either), so that the report is a later frame's even when this is asked for
 * in a frame's callbacks, and so that no observation begins while resize observers report (WebKit reports one begun
 * then as a loop of undelivered notifications). An entrance is played from the frame callbacks alone, as before:
 * nothing waits for it (under a held clock it stands at its start). One frame callback serves every request: a
 * request made in it is the next frame's.
 */
function nextFrame(read: PhaseRead, unheld: boolean) {
  const request: FrameRequest = { read, done: false, observer: null };
  frameRequests.push(request);
  askFrame();
  if (!unheld || typeof ResizeObserver !== 'function' || typeof MessageChannel !== 'function') return;
  const soon = new MessageChannel();
  soon.port1.onmessage = () => {
    soon.port1.close();
    if (request.done) return;
    // Reported, every request observed by then is run with it.
    request.observer = new ResizeObserver(() => runFrame(frameRequests.filter((each) => each.observer)));
    request.observer.observe(document.documentElement);
  };
  soon.port2.postMessage(0);
}

/**
 * The entrance or the exit that the open or the closed state just started on `element` begins in the first frame drawn
 * after it (`startFromNextFrame`). Called in the task that wrote that state, so every transition of the appearance on
 * `element` began in it.
 */
const fromNextFrame = (element: HTMLElement, leaving = false) => startFromNextFrame(appearing(element), { leaving });

/**
 * Draws `element` in the style it has now with no transition into it: none starts, and one that had started is
 * finished at its end. The element's own inline transition is put back as it was, and changes no value.
 */
function atOnce(element: HTMLElement) {
  const value = element.style.getPropertyValue('transition-property');
  const priority = element.style.getPropertyPriority('transition-property');
  element.style.setProperty('transition-property', 'none', 'important');
  for (const animation of appearing(element)) animation.finish();
  void getComputedStyle(element).opacity;
  if (value) element.style.setProperty('transition-property', value, priority);
  else element.style.removeProperty('transition-property');
}

export interface AppearControllerOptions {
  /** The motion element `appearStyles()` styles (it is given `data-tanrei-appear`, which settling leaves alone). */
  motion: () => HTMLElement | null;
}

/** What an appearance moves, as a transition starts from it: read before the surface is put back, written after. */
const SHOWN = ['opacity', 'scale', 'translate', 'filter'] as const;

/**
 * Opens and closes one surface drawn with `appearStyles()`. The component changes its own open state (what `open`
 * names) and tells the controller, in the same update or the same task: `enter()` as it opens, `exit()` as it closes.
 *
 * - **MOT-4**: an entrance before the document's first paint is made at once — an overlay in the page's markup with
 *   `open` is there in the first frame — and one after it plays, from the start (`@starting-style`) or from wherever
 *   an exit had got to.
 * - **MOT-2**: turned round in the middle of either motion, the surface goes on from the value shown: the motion is
 *   the transition between the two states, which starts from the value then drawn.
 * - `exit()` resolves when the exit's transitions have finished — true — or with false as soon as the surface is told
 *   to open again; no timer is set, and an exit whose transitions are replaced while it runs (the side it leaves
 *   toward changed) resolves when the ones replacing them finish. Take the surface out of the top layer then.
 * - At once, asked for (`enter(true)`, `exit(true)`: a surface drawn in place for a fixture, one taken away with its
 *   host): no motion, in the same task where no update is pending.
 *
 * Two things a surface placed by script needs (an anchored one, src/primitives/anchored.ts), because its style is
 * read — and so its transitions started — before it is open:
 *
 * - `drawAtOnce()`: a surface whose start depends on where it was placed (the side it starts toward) is drawn there
 *   at once, after it is placed and before it is opened, so that its entrance starts from that place and not from the
 *   one its style gave it before it was placed (a frame read for its size).
 * - `keep(during)`: a surface still leaving that is taken out of the top layer and put back (to be the newest in it)
 *   goes on from the value shown, not from its start: an element out of the top layer is not drawn, and one drawn
 *   again has no value to go on from.
 */
export class AppearController implements ReactiveController {
  private run = 0;
  private opened = false;
  private waiting = false;
  /** The entrance asked for is made at once. */
  private instant = false;
  private quiet: HTMLElement | null = null;
  /** The transitions of the last entrance: an exit turns round from it while any of them has not finished. */
  private entrance: Animation[] = [];
  /** The motion element of an entrance asked for and not listed yet (`arrive()`). */
  private arriving: HTMLElement | null = null;

  constructor(
    private readonly host: Host & { isUpdatePending?: boolean },
    private readonly options: AppearControllerOptions,
  ) {
    host.addController(this);
  }

  /** Whether it was last told to open. */
  get open(): boolean {
    return this.opened;
  }

  hostUpdated() {
    const motion = this.options.motion();
    if (motion && !motion.hasAttribute(APPEARING)) motion.setAttribute(APPEARING, '');
    // Before the first paint there is nothing to move from: the motion element starts no transition until then, from
    // the update that renders it — before anything the component does after rendering reads a style, which would start
    // the entrance (and send its `transitionrun`) before `enter()` could make it at once.
    if (motion && motion !== this.quiet && !documentPainted()) {
      this.quiet = motion;
      const value = motion.style.getPropertyValue('transition-property');
      const priority = motion.style.getPropertyPriority('transition-property');
      motion.style.setProperty('transition-property', 'none', 'important');
      void afterFirstPaint().then(() => {
        if (value) motion.style.setProperty('transition-property', value, priority);
        else motion.style.removeProperty('transition-property');
      });
    }
    if (this.waiting) {
      this.waiting = false;
      this.arrive();
    }
  }

  /**
   * The surface opens: in the update under way (or now, where none is), after its open state is written. `instant`:
   * whole at once, with no entrance.
   */
  enter(instant = false): void {
    this.run++;
    this.opened = true;
    this.instant = instant;
    if (this.host.isUpdatePending) this.waiting = true;
    else this.arrive();
  }

  /**
   * The entrance, made at once or held to begin in the next frame. Held, its transitions are listed with every other
   * host's reads of the turn (`readTogether`): a hundred surfaces opened in one task style the page once for them, not
   * once each after the last one's write. An exit asked before that lists them itself (`exit()`).
   */
  private arrive() {
    const motion = this.options.motion();
    if (!motion || !this.opened) return;
    if (!motion.hasAttribute(APPEARING)) motion.setAttribute(APPEARING, '');
    if (this.instant || !documentPainted() || !motion.isConnected) {
      this.arriving = null;
      atOnce(motion);
      this.entrance = appearing(motion);
      return;
    }
    const run = this.run;
    this.arriving = motion;
    askFrame();
    readTogether(() => {
      if (run !== this.run || this.arriving !== motion) return;
      const entrance = appearing(motion);
      const hold = holdFromNextFrame(entrance, false);
      return () => {
        if (run !== this.run || this.arriving !== motion) return;
        this.arriving = null;
        this.entrance = entrance;
        hold?.();
      };
    });
  }

  /**
   * Draws the motion element in the state its style gives it now, with no transition into it (one that had begun is
   * finished at its end): a surface placed before it opens starts from where it was placed.
   */
  drawAtOnce(): void {
    const motion = this.options.motion();
    if (motion?.isConnected) atOnce(motion);
  }

  /**
   * Runs `during` — which takes the surface out of the top layer and puts it back, or anything else that draws it
   * anew — and draws the motion element with the values it showed before, with no transition into them: the motion
   * the component starts next (its entrance, turned round) goes on from there (MOT-2). Returns what `during` returns.
   */
  keep<T>(during: () => T): T {
    const motion = this.options.motion();
    if (!motion?.isConnected) return during();
    const style = getComputedStyle(motion);
    const shown = SHOWN.map((property) => [property, style.getPropertyValue(property)] as const);
    const result = during();
    const own = SHOWN.map((property) => [property, motion.style.getPropertyValue(property), motion.style.getPropertyPriority(property)] as const);
    const value = motion.style.getPropertyValue('transition-property');
    const priority = motion.style.getPropertyPriority('transition-property');
    motion.style.setProperty('transition-property', 'none', 'important');
    for (const [property, shownValue] of shown) motion.style.setProperty(property, shownValue, 'important');
    void getComputedStyle(motion).opacity;
    for (const [property, ownValue, ownPriority] of own) {
      if (ownValue) motion.style.setProperty(property, ownValue, ownPriority);
      else motion.style.removeProperty(property);
    }
    if (value) motion.style.setProperty('transition-property', value, priority);
    else motion.style.removeProperty('transition-property');
    return result;
  }

  /**
   * The surface closes: resolves with true once its exit has played (at once where there is none: reduced to nothing,
   * not drawn, before the first paint, or `instant` — made in this task where no update is pending), or with false
   * when it was told to open before that.
   */
  async exit(instant = false): Promise<boolean> {
    const run = ++this.run;
    // Closed in this task from rest (open, its entrance over): the exit's transitions begin in it, from the open look.
    // Told again while it leaves, they had begun before, and go on as they are. Turned round in the middle of its
    // entrance, the exit is not held either: in Firefox an exit held at its start that replaced an entrance still under
    // way was drawn from nothing (a tooltip closed a quarter of the way into an entrance a script had moved there: an
    // opacity of 0.0006 where 0.25 was shown, TIP-29).
    // An entrance asked in this task and not listed yet (`arrive()`) is listed now: it has begun, and is under way.
    const arriving = this.arriving;
    this.arriving = null;
    if (arriving?.isConnected) this.entrance = appearing(arriving);
    let closing = this.opened && this.entrance.every((animation) => animation.playState === 'finished');
    this.entrance = [];
    this.opened = false;
    this.waiting = false;
    if (this.host.isUpdatePending) await this.host.updateComplete;
    for (;;) {
      if (run !== this.run) return false;
      const motion = this.options.motion();
      if (!motion?.isConnected) return true;
      if (instant || !documentPainted()) {
        atOnce(motion);
        return true;
      }
      // Asking flushes style: the exit's transitions exist now. A cancelled one (turned round, or replaced) settles too,
      // and the loop asks again: what replaced it is waited for, and a surface opened again ends the wait.
      const running = appearing(motion);
      if (!running.length) return run === this.run;
      // The exit begins in the first frame drawn after the task that closed it, as an entrance does (`fromNextFrame`):
      // WebKit dated it from the frame drawn before that task, and a surface closed at the end of a task longer than its
      // exit was gone in the first frame after it, with no frame of its motion.
      if (closing) fromNextFrame(motion, true);
      closing = false;
      await Promise.allSettled(running.map((animation) => animation.finished));
    }
  }
}

// ── A box whose size follows its content (AnimatedSize) ───────────────────────────────────────────────────────────────

/** The axis a box's size moves on: its height (`block`), its width (`inline`) or both. */
export type SizeAxis = 'block' | 'inline' | 'both';
/**
 * The edge its content is fixed to while it moves: `start`, `end`, or `auto` — the end where the box's end edge is the
 * one that stays (a box docked to its container's end), the start otherwise.
 */
export type SizeAnchor = 'start' | 'end' | 'auto';

export interface AnimatedSizeOptions {
  /** The box whose size moves; its size in its layout changes at every frame. */
  box: () => HTMLElement | null;
  /**
   * The one element inside it that holds what it shows, at its own size. Needed to hold the content at the end edge
   * (it is moved there with the box, `translate`), and on the inline axis, where it keeps its end width while the box
   * moves (so its lines are not laid out again in every frame). Without it the content stands at the start.
   */
  content?: () => HTMLElement | null;
  /** Default `block`. */
  axis?: SizeAxis;
  /** Default `auto`. */
  anchor?: () => SizeAnchor;
  /**
   * The duration and the curve, as CSS values: by default `sys.motion.role.resize.default` and `sys.motion.easing.spatial`.
   * The duration may be a function of the distance the motion covers — the largest of its sizes' changes, in CSS pixels,
   * from the size shown — for a time that grows with the distance (the size transition, SZT-3).
   */
  duration?: string | ((distance: number) => string);
  easing?: string;
  /** A change is made at once while this answers true (a pointer held down in the text, ETI-9). */
  still?: () => boolean;
}

const SIZE = { block: ['block-size'], inline: ['inline-size'], both: ['block-size', 'inline-size'] } as const;
const SIZE_PROPERTIES = /^(block-size|inline-size|height|width)$/;
const SET_BY_SIZE = ['block-size', 'inline-size', 'overflow', 'transition-property', 'transition-duration', 'transition-timing-function'];
const SET_ON_CONTENT = ['translate', 'inline-size', 'transition-property', 'transition-duration', 'transition-timing-function'];

let clipValue: string | undefined;
/** `overflow: clip`: a box that clips and is no scroll container, so nothing (a caret, `scrollIntoView`) scrolls it. */
const clip = () => (clipValue ??= typeof CSS !== 'undefined' && CSS.supports('overflow', 'clip') ? 'clip' : 'hidden');

const transitionsOf = (element: Element, property: RegExp) => element.getAnimations().filter((animation) => property.test((animation as CSSTransition).transitionProperty ?? ''));

/**
 * MOT-5: a box whose size follows its content as one motion (the successor of `AutoHeight`'s box). `fit(true)` after
 * the content changed: the box is measured at its natural size and moves there from the size the last frame drew (a
 * resize observer of the box keeps it; before the box was first laid out the change is made at once) — in its layout,
 * so what stands after it moves with it — clipped with `overflow: clip` (a box with `hidden` is a scroll container,
 * and a caret on a line it does not hold yet scrolls its first line away), its content fixed to the anchor edge.
 *
 * A change while it moves goes on from the size then shown, as one motion. The motion it replaces is cancelled here,
 * and its end is its own transitions' `finished`, matched to its run: the late `transitioncancel` of a replaced
 * transition, which arrives with the next frame while the new one runs, ends nothing (taking a property out of
 * `transition-property` does not cancel a running transition in any engine, so a box is never ended by that either).
 *
 * At once: `fit(false)`, `still()`, reduced motion (MOT-6), a box not laid out, a duration of zero. It writes the box's
 * inline size, `overflow`, transition and `data-resizing` only while it moves, and the content's `translate` and
 * inline size: a component sets none of them inline itself, and may style `[data-resizing]`.
 */
export class AnimatedSize implements ReactiveController {
  /** Whether the box is moving. */
  resizing = false;
  private run = 0;
  /**
   * The box's size as it was last laid out, from a resize observer: by the time `fit()` is called the content has
   * changed and a box at rest already stands at its new size, so the size shown is the one the last frame drew.
   */
  private laid: { border: ResizeObserverSize; content: ResizeObserverSize } | null = null;
  private observed: HTMLElement | null = null;
  private readonly observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          const entry = entries.at(-1);
          if (entry?.borderBoxSize?.[0] && entry.contentBoxSize?.[0]) this.laid = { border: entry.borderBoxSize[0], content: entry.contentBoxSize[0] };
        })
      : null;

  constructor(
    host: ReactiveControllerHost,
    private readonly options: AnimatedSizeOptions,
  ) {
    host.addController(this);
  }

  hostUpdated() {
    const box = this.options.box();
    if (box === this.observed) return;
    this.observer?.disconnect();
    this.observed = box;
    this.laid = null;
    if (box) this.observer?.observe(box);
  }

  hostDisconnected() {
    this.run++;
    const box = this.options.box();
    if (box) this.stop(box);
    this.observer?.disconnect();
    this.observed = null;
    this.laid = null;
  }

  /** The box's size on each property of the axis, as its own inline style would write it. */
  private sizes(box: HTMLElement): Record<string, string> {
    const style = getComputedStyle(box);
    return Object.fromEntries(SIZE[this.options.axis ?? 'block'].map((property) => [property, style.getPropertyValue(property)]));
  }

  /** The size the last frame drew, in the box's own `box-sizing`; none before it was first laid out. */
  private drawn(box: HTMLElement): Record<string, string> | null {
    if (!this.laid) return null;
    const size = getComputedStyle(box).boxSizing === 'border-box' ? this.laid.border : this.laid.content;
    const of: Record<string, number> = { 'block-size': size.blockSize, 'inline-size': size.inlineSize };
    return Object.fromEntries(SIZE[this.options.axis ?? 'block'].map((property) => [property, `${of[property]}px`]));
  }

  /** The motion under way, if any, stopped, and the box and its content as tall and as wide as they are. */
  private stop(box: HTMLElement) {
    const content = this.options.content?.();
    for (const animation of transitionsOf(box, SIZE_PROPERTIES)) animation.cancel();
    if (content) for (const animation of transitionsOf(content, /^(translate|inline-size|width)$/)) animation.cancel();
    for (const property of SET_BY_SIZE) box.style.removeProperty(property);
    if (content) for (const property of SET_ON_CONTENT) content.style.removeProperty(property);
    if (box.hasAttribute('data-resizing')) box.removeAttribute('data-resizing');
    this.resizing = false;
  }

  /**
   * Fits the box to its content, after the content changed. With `animate`, the size moves from the one shown — the
   * size the last frame drew, or where a motion under way has got to — to the natural one, as one motion. Without it,
   * or where a change is made at once, the box is its natural size now. `drawn`: the size the last frame drew, in CSS
   * pixels, where the caller knows it and the box's own report may already be this frame's (a caller that hears the
   * change from a resize observer of the content: engines do not agree on which observer reports first).
   */
  fit(animate = true, drawn?: { inline: number; block: number }): void {
    const box = this.options.box();
    if (!box) return;
    const run = ++this.run;
    const axis = this.options.axis ?? 'block';
    // The size shown: where the motion under way has got to, or what the last frame drew…
    const told = drawn && Object.fromEntries(SIZE[axis].map((property) => [property, `${property === 'block-size' ? drawn.block : drawn.inline}px`]));
    const shown = this.resizing ? this.sizes(box) : (told ?? this.drawn(box));
    // …and the natural one, with the motion stopped (it would hold the box at its value otherwise).
    this.stop(box);
    if (!animate || !shown || this.options.still?.() || motionReduced() || !box.isConnected) return;
    const end = this.sizes(box);
    const after = box.getBoundingClientRect();
    const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;
    const moves = Object.keys(end).filter((property) => Number.isFinite(Number.parseFloat(end[property]!)) && Math.abs(px(shown[property]) - px(end[property])) >= 0.5);
    if (!moves.length || (!after.width && !after.height)) return;
    const content = this.options.content?.() ?? null;
    // On the inline axis the content keeps its end width: its lines are laid out once, not in every frame.
    if (content && axis !== 'block') content.style.setProperty('inline-size', getComputedStyle(content).getPropertyValue('inline-size'));
    // From the size shown, drawn without a transition…
    box.style.setProperty('overflow', clip());
    for (const property of moves) box.style.setProperty(property, shown[property]!);
    const before = box.getBoundingClientRect();
    // The edge that stays: in a box docked to its container's end, the end edge.
    const rtl = getComputedStyle(box).direction === 'rtl';
    const edges = (rect: DOMRect) => (axis === 'inline' ? (rtl ? { start: rect.right, end: rect.left } : { start: rect.left, end: rect.right }) : { start: rect.top, end: rect.bottom });
    const [was, is] = [edges(before), edges(after)];
    const asked = this.options.anchor?.() ?? 'auto';
    const anchor = asked === 'auto' ? (Math.abs(was.end - is.end) < 0.5 && Math.abs(was.start - is.start) >= 0.5 ? 'end' : 'start') : asked;
    // …the content where the end edge holds it: as far from its place as the box is from its end size…
    const offset = (property: string) => (moves.includes(property) ? px(shown[property]) - px(end[property]) : 0);
    const shift = anchor === 'end' && content ? [axis === 'block' ? 0 : (rtl ? -1 : 1) * offset('inline-size'), axis === 'inline' ? 0 : offset('block-size')] : null;
    if (content && shift) content.style.setProperty('translate', `${shift[0]}px ${shift[1]}px`);
    void getComputedStyle(content ?? box).getPropertyValue('translate');
    // …to the end size, as one motion, the content (where it is held at the end) on the same curve.
    const given = this.options.duration;
    const duration =
      typeof given === 'function' ? given(Math.max(...moves.map((property) => Math.abs(px(shown[property]) - px(end[property]))))) : (given ?? 'var(--tanrei-sys-motion-role-resize-default)');
    const easing = this.options.easing ?? 'var(--tanrei-sys-motion-easing-spatial)';
    const timing = (element: HTMLElement, properties: string) => {
      element.style.setProperty('transition-property', properties);
      element.style.setProperty('transition-duration', duration);
      element.style.setProperty('transition-timing-function', easing);
    };
    timing(box, moves.join(', '));
    box.setAttribute('data-resizing', '');
    for (const property of moves) box.style.setProperty(property, end[property]!);
    if (content && shift) {
      timing(content, 'translate');
      content.style.setProperty('translate', '0px 0px');
    }
    // Asking flushes style: the motion's transitions exist now. A duration of zero starts none, and none will end.
    const running = [...transitionsOf(box, SIZE_PROPERTIES), ...(content && shift ? transitionsOf(content, /^translate$/) : [])];
    if (!running.length) {
      this.stop(box);
      return;
    }
    this.resizing = true;
    // Begun in the task that changed the content, they start in the first frame drawn after it: WebKit dates them from
    // the frame drawn before that task, and where the task outlasted the motion (a chat composer's strip, its File
    // items rendered and measured in the task that adds them, on a loaded machine) drew the end size at once, with no
    // frame of the motion. Played even where a page clock holds frame callbacks (`leaving`): the size runs on the
    // document's timeline, and the box would stand at its old size for as long as the clock is held.
    startFromNextFrame(running, { leaving: true });
    void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (run === this.run) this.stop(box);
    });
  }
}

// ── The first frames (Settle) ─────────────────────────────────────────────────────────────────────────────────────────

// Every element settles, so the hosts that ask in one frame are let go by one pair of frame callbacks between them: a
// page that draws two thousand elements asks for two frames, not four thousand callbacks.
//
// Before they are let go the page is styled, once for the batch: a state written after the last frame drawn while they
// settled — in a task between it and this one (an image preview's zoom-in control, enabled when its image has loaded),
// or in an earlier callback of this frame — would otherwise be styled in the same pass as the attribute that turns
// transitions back on, and move from the state before it. The flush is a layout's: asking for one element's style is
// answered without styling the others (every engine skips a flush that element's own style does not need), and the
// state may be anywhere in a shadow tree. It is a layout the frame was about to make; letting go then changes only
// `transition-property`, which lays nothing out.
let settlingNow: (() => void)[] | null = null;
const afterTwoFrames = (done: () => void) => {
  if (typeof requestAnimationFrame !== 'function') return done();
  if (!settlingNow) {
    const batch: (() => void)[] = [];
    settlingNow = batch;
    requestAnimationFrame(() => {
      settlingNow = null;
      requestAnimationFrame(() => {
        void document.documentElement.offsetWidth;
        for (const settled of batch) settled();
      });
    });
  }
  settlingNow.push(done);
};

/**
 * MOT-3: the host carries `data-tanrei-settling` from each time it is connected until two frames after its first
 * update there — the frame its first render is drawn in, and the one after it, where a state it measured in a frame
 * callback or a resize observer is written — and `settleStyles` (src/styles/motion.ts) starts no transition in it
 * meanwhile. It makes a state written late arrive without a motion, not on time: the component still writes its first
 * state where it renders (`willUpdate`).
 */
export class Settle implements ReactiveController {
  /** Whether the host is settling. */
  settling = false;
  private connection = 0;

  constructor(private readonly host: Host) {
    host.addController(this);
  }

  hostConnected() {
    const connection = ++this.connection;
    this.settling = true;
    this.host.setAttribute(SETTLING, '');
    const settled = () => {
      if (connection !== this.connection) return;
      this.settling = false;
      this.host.removeAttribute(SETTLING);
    };
    void this.host.updateComplete.then(() => {
      if (connection === this.connection) afterTwoFrames(settled);
    });
  }

  hostDisconnected() {
    this.connection++;
    this.settling = false;
    this.host.removeAttribute(SETTLING);
  }
}

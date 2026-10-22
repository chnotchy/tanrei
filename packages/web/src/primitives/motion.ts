import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { APPEARING, SETTLING } from '../styles/motion.js';

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

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
   * shadow root (`.surface.open`, `[open]`). Keep it apart from the top layer's own state (`:popover-open`) where the
   * browser may take the surface out of it at once: the surface is taken out after `exit()` resolves. A modal
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
}

/** The properties an appearance moves; what an exit waits for. `transform` too, for a surface still drawn with it. */
const APPEAR_PROPERTIES = new Set(['opacity', 'scale', 'translate', 'filter', 'transform', 'display', 'overlay']);
const MOVED = 'opacity, scale, translate, filter, display, overlay';
// `display` and `overlay` change discretely, and only with `allow-discrete`: a popover the browser takes out of the top
// layer (a light dismiss) stays drawn, and in the top layer, until its exit has played — in Chromium; WebKit and
// Firefox take it away at once. A modal `<dialog>` does not rely on it: `closeModal()` keeps it drawn in every engine.
// Written as a longhand, so that an engine without it drops only this declaration.
const BEHAVIOUR = 'normal, normal, normal, normal, allow-discrete, allow-discrete';

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
 * axes from the centre), read with a style container query; a browser without them scales both axes. A sheet slides
 * from its edge by its own size, unfaded and unscaled, whatever the appearance. Under reduced motion every appearance
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
  const start = sheet
    ? `--_appear-opacity: 1; --_appear-scale: 1; --_appear-distance: 100%; --_appear-blur: 0px; --_appear-filter: none;`
    : `--_appear-opacity: var(${from}-opacity); --_appear-scale: var(${from}-scale); --_appear-distance: var(${from}-distance); --_appear-blur: var(${from}-blur); --_appear-filter: blur(var(--_appear-blur));`;
  const closed = `opacity: var(--_appear-opacity);
    scale: var(--_appear-sx) var(--_appear-sy);
    translate: calc(var(--_appear-dx) * var(--_appear-distance)) calc(var(--_appear-dy) * var(--_appear-distance));
    filter: var(--_appear-filter);`;
  const whole = 'opacity: 1; scale: none; translate: none; filter: none;';
  const timing = (t: AppearTiming, properties = MOVED, behaviour = BEHAVIOUR) =>
    `transition-property: ${properties}; transition-duration: ${t.duration}; transition-timing-function: ${t.easing}; transition-behavior: ${behaviour};`;
  const reducedClosed = `opacity: ${sheet ? 0 : 'var(--_appear-opacity)'}; scale: none; translate: none; filter: none;`;
  const reducedProperties = 'opacity, display, overlay';
  const reducedBehaviour = 'normal, allow-discrete, allow-discrete';
  return unsafeCSS(`
  :is(${motion}) {
    ${start}
    ${closed}
    ${timing(exit)}
  }
  ${places.join('\n  ')}
  @container style(--tanrei-sys-behavior-appearance: unfold) {
    ${unfolds.join('\n    ')}
  }
  ${centred.length ? `@container style(${from}-origin: center) {\n    ${centred.join('\n    ')}\n  }` : ''}
  ${sheet ? '' : `@container style(${from}-blur: 0px) {\n    :is(${motion}) { --_appear-filter: none; }\n  }`}
  ${open} {
    ${whole}
    ${timing(enter)}
  }
  @starting-style {
    ${open} {
      ${closed}
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :is(${motion}) {
      ${reducedClosed}
      ${timing({ duration: fade, easing: exit.easing }, reducedProperties, reducedBehaviour)}
    }
    ${open} {
      opacity: 1;
      ${timing({ duration: fade, easing: enter.easing }, reducedProperties, reducedBehaviour)}
    }
    @starting-style {
      ${open} {
        ${reducedClosed}
      }
    }
  }
`);
}

// ── Opening and closing (AppearController) ────────────────────────────────────────────────────────────────────────────

/** The transitions of an appearance running on `element` itself (not inside it); asking flushes style. */
const appearing = (element: Element) =>
  element.getAnimations().filter((animation) => APPEAR_PROPERTIES.has((animation as CSSTransition).transitionProperty ?? '') && animation.playState !== 'finished');

/**
 * The entrance that the open state just started on `element` begins in the first frame drawn after it, in every
 * engine. WebKit dates a transition from the timeline's time, which is the time of the frame drawn last and stands
 * still while a task runs: a surface opened at the end of a long task has that much of its entrance over before its
 * first frame, and none of it where the task outlasted the entrance — the transition is then dropped at that frame,
 * without a transition event, and the surface is drawn whole at once. (A combobox's list, its rows rendered in the
 * task that opens it, took 200–340 ms there on a two-core Linux runner, against an entrance of 300 ms.) Played again
 * in the same task it is dated the same way; so it is held at its start, which the next frame draws, and played from
 * that frame's callback, where the timeline has that frame's time. Called in the task that wrote the open state, so
 * every transition of the appearance on `element` began in it. One that is no longer held there — replaced or
 * cancelled (closed again), or held elsewhere by a script — is left as it is. A hidden document draws no frame, and
 * shows nothing, until it is shown: its entrance is left to the engine.
 */
function fromNextFrame(element: HTMLElement) {
  if (typeof requestAnimationFrame !== 'function' || document.visibilityState === 'hidden') return;
  const started = appearing(element).filter((animation) => animation.playState === 'running');
  if (!started.length) return;
  for (const animation of started) {
    animation.pause();
    animation.currentTime = 0;
  }
  requestAnimationFrame(() => {
    for (const animation of started) if (animation.playState === 'paused' && animation.currentTime === 0) animation.play();
  });
}

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

  private arrive() {
    const motion = this.options.motion();
    if (!motion || !this.opened) return;
    motion.setAttribute(APPEARING, '');
    if (this.instant || !documentPainted() || !motion.isConnected) atOnce(motion);
    else fromNextFrame(motion);
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
  /** The duration and the curve, as CSS values: by default `sys.motion.role.resize.default` and `sys.motion.easing.spatial`. */
  duration?: string;
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
   * or where a change is made at once, the box is its natural size now.
   */
  fit(animate = true): void {
    const box = this.options.box();
    if (!box) return;
    const run = ++this.run;
    const axis = this.options.axis ?? 'block';
    // The size shown: where the motion under way has got to, or what the last frame drew…
    const shown = this.resizing ? this.sizes(box) : this.drawn(box);
    // …and the natural one, with the motion stopped (it would hold the box at its value otherwise).
    this.stop(box);
    if (!animate || !shown || this.options.still?.() || reduced() || !box.isConnected) return;
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
    const duration = this.options.duration ?? 'var(--tanrei-sys-motion-role-resize-default)';
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
    void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (run === this.run) this.stop(box);
    });
  }
}

// ── The first frames (Settle) ─────────────────────────────────────────────────────────────────────────────────────────

// Every element settles, so the hosts that ask in one frame are let go by one pair of frame callbacks between them: a
// page that draws two thousand elements asks for two frames, not four thousand callbacks.
let settlingNow: (() => void)[] | null = null;
const afterTwoFrames = (done: () => void) => {
  if (typeof requestAnimationFrame !== 'function') return done();
  if (!settlingNow) {
    const batch: (() => void)[] = [];
    settlingNow = batch;
    requestAnimationFrame(() => {
      settlingNow = null;
      requestAnimationFrame(() => {
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

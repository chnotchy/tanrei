import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { type PressedFeedback, pressedFeedback } from './behavior.js';
import { type Point, fadeRipple, startRipple } from './ripple.js';

/** The keys that press a button. */
const DEFAULT_KEYS: readonly string[] = ['Enter', ' '];

/** What holds a press down. */
export type PressedBy = 'pointer' | 'key';

/**
 * What an event that ends a press holds: a key's keyup and a blur end a key's press; a pointer's, mouse's, touch's or
 * drag's event a pointer's. Any other event names none.
 */
function pressedByOf(event: Event): PressedBy | undefined {
  if (event instanceof KeyboardEvent || event instanceof FocusEvent) return 'key';
  // (A DragEvent and a PointerEvent are both MouseEvents; TouchEvent is not defined where there is no touch.)
  if (event instanceof MouseEvent || (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent)) return 'pointer';
  return undefined;
}

export interface PressOptions {
  /** The native element that is pressed and carries `data-pressed` (what `stateRules()`' pressed conditions name). */
  container: () => HTMLElement | null;
  /** The element whose `transition-delay` carries `sys.motion.duration.press-hold` — the one `pressHold()` styles. */
  holdCarrier: () => Element | null;
  /** Whether the control is disabled now: a disabled control shows no pressed state. */
  disabled: () => boolean;
  /**
   * The keys that press it (`KeyboardEvent.key`). A button: Enter and Space; a checkbox or a switch: Space. A function
   * is asked at each key, for a control whose keys depend on what it is now — a link takes Enter alone (D3,
   * src/primitives/link.ts); `undefined` from it is the default.
   */
  keys?: readonly string[] | (() => readonly string[] | undefined);
  /**
   * Where the ripple grows from, given the point of contact: the point itself when omitted, `null` for the center. A
   * control pressed outside its state layer (a selection control's label, CHK-10) grows it from the center.
   */
  origin?: (at: Point) => Point | null;
  /**
   * The element the ripple is drawn in, when that is not the pressed element itself: a control whose state layer is a
   * box of its own inside the area that answers the press (a tab's container, TAB-9, TAB-18). The layer is clipped to
   * it, and the point of contact is clamped into it. It must carry the shape and be its own stacking context.
   */
  rippleHost?: () => HTMLElement | null;
  /**
   * What the feedback the system names becomes for this press, for a control that cannot draw every choice in every
   * shape it takes: a text link that runs over several lines has no one box to grow a ripple in, and answers with the
   * overlay there (LNK-9's fallback). Left out, the system's choice is used as it is.
   */
  feedback?: (named: PressedFeedback) => PressedFeedback;
}

/**
 * The pressed state (BTN-8 / BTN-9 and every control after them), as a Lit controller. It sets
 * `data-pressed="<feedback>"` on the container on pointer down and on the control's keys, without delay, and keeps it
 * for at least `sys.motion.duration.press-hold`, even when the press ends within a frame (a key press or a tap). The
 * feedback is `sys.behavior.pressed-feedback`, read from the cascade at the moment of the press; under `ripple` it adds
 * the layer (`startRipple`) and fades it once the press and the hold are over.
 *
 * Bind its handlers on the container — they are arrow functions, so Lit's `this` (the host) does not matter:
 * `@pointerdown=${p.onPointerDown} @pointerup=${p.release} @pointercancel=${p.release} @pointerleave=${p.release}
 * @keydown=${p.onKeyDown} @keyup=${p.onKeyUp} @blur=${p.onBlur}`.
 */
export class PressController implements ReactiveController {
  private get keys(): readonly string[] {
    const { keys } = this.options;
    return (typeof keys === 'function' ? keys() : keys) ?? DEFAULT_KEYS;
  }
  private pressedAt = 0;
  /**
   * What is holding the press down: a pointer, a key, or both at once. A pointer's press ends with the pointer, a key's
   * with the key or with focus, and the press ends when nothing holds it any more.
   */
  private readonly heldBy = new Set<PressedBy>();
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private ripple: HTMLElement | null = null;

  constructor(
    // A host that is not a Lit element (the document's own anchor, src/link.ts) has no controllers to join: whoever
    // made the controller calls its handlers, and `hostDisconnected()` when the element is gone.
    private readonly host: Partial<Pick<ReactiveControllerHost, 'addController'>> & Element,
    private readonly options: PressOptions,
  ) {
    host.addController?.(this);
  }

  /** The pressed state starts here, without delay. `at` is the point of contact; a keyboard press answers from the center. */
  press(at: Point | null) {
    const container = this.options.container();
    if (!container || this.options.disabled()) return;
    this.heldBy.add(at ? 'pointer' : 'key');
    // For a host that is not a Lit element (no `hostUpdated()`): the same function each time, so a second press adds
    // nothing.
    container.addEventListener('dragstart', this.onDragStart);
    clearTimeout(this.holdTimer);
    const named = pressedFeedback(this.host);
    const feedback = this.options.feedback ? this.options.feedback(named) : named;
    this.pressedAt = performance.now();
    container.dataset.pressed = feedback;
    this.removeRipple();
    if (feedback === 'ripple') this.ripple = startRipple(this.options.rippleHost?.() ?? container, at && this.options.origin ? this.options.origin(at) : at);
  }

  /**
   * The press ended; the pressed state stays until press-hold has passed since it began. Given the event that ends it
   * (or what holds it, where no event is at hand), it ends only what that event holds: a pointer's `pointerup`,
   * `pointercancel` or `pointerleave` ends no press a key holds down — the pointer may rest over the control and leave
   * it, because the mouse moved or the control moved out from under it — and a key's keyup ends no press a pointer
   * holds, as the platform's own button keeps a key's press while the key is down wherever the pointer goes. Without
   * either, it ends the press whatever holds it (the control took the press for something else, or is gone).
   */
  readonly release = (by?: Event | PressedBy) => {
    const container = this.options.container();
    if (!container || container.dataset.pressed === undefined) return;
    const what = by === undefined || typeof by === 'string' ? by : pressedByOf(by);
    if (what) this.heldBy.delete(what);
    else this.heldBy.clear();
    if (this.heldBy.size > 0) return;
    clearTimeout(this.holdTimer);
    // The carrier holds press-hold as a transition-delay, which computes to seconds (see pressHold()).
    const carrier = this.options.holdCarrier();
    const hold = carrier ? Number.parseFloat(getComputedStyle(carrier).transitionDelay) * 1000 : 0;
    // A timer may fire a little early, so the clock decides, not the timer.
    const wait = () => {
      const remaining = (Number.isFinite(hold) ? hold : 0) - (performance.now() - this.pressedAt);
      if (remaining > 0) this.holdTimer = setTimeout(wait, remaining);
      else this.endPress();
    };
    wait();
  };

  readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.press({ x: event.clientX, y: event.clientY });
  };

  readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || !this.keys.includes(event.key)) return;
    this.press(null);
  };

  readonly onKeyUp = (event: KeyboardEvent) => {
    if (this.keys.includes(event.key)) this.release(event);
  };

  /**
   * A press is never the start of a drag of the control's text. WebKit takes a press held on a selection of the page
   * that reaches across the control for a drag of the selected text, and from then on sends the page no pointerup, no
   * pointercancel and no mouseup: the control would stay pressed. So the drag is refused, and the pointer ends the
   * press as it does everywhere else — also where the pointer has left the control before the engine begins the drag
   * (the press has ended by then; the drag would still begin at the control). What the browser offers to drag by
   * itself — a link's address, an image, an element the product made `draggable` — and the text selected inside a
   * text control the container holds stay the browser's: the drag begins, and the press ends there.
   * The controller listens for it on the container itself (`hostUpdated()`), so no component binds it.
   */
  private readonly onDragStart = (event: DragEvent) => {
    const path = event.composedPath();
    const within = path.slice(0, path.indexOf(event.currentTarget as EventTarget) + 1);
    const browsers = (each: EventTarget) => each instanceof HTMLElement && (each.draggable || each.isContentEditable || each instanceof HTMLInputElement || each instanceof HTMLTextAreaElement);
    if (within.some(browsers)) this.release(event);
    else event.preventDefault();
  };

  /**
   * Focus left while a key was down: its keyup will arrive somewhere else, so the key's press ends here. A pointer press
   * is not ended by focus — Safari takes focus AWAY from a focused button on mouse down, while the pointer is held.
   */
  readonly onBlur = () => {
    if (this.heldBy.has('key')) this.release('key');
  };

  /** The container the host has rendered refuses the engine's drag (`onDragStart`); the same function each time. */
  hostUpdated() {
    this.options.container()?.addEventListener('dragstart', this.onDragStart);
  }

  hostDisconnected() {
    clearTimeout(this.holdTimer);
    this.heldBy.clear();
    this.removeRipple();
    const container = this.options.container();
    if (container) delete container.dataset.pressed;
  }

  private endPress() {
    const container = this.options.container();
    if (container) delete container.dataset.pressed;
    const ripple = this.ripple;
    if (!ripple) return;
    this.ripple = null;
    fadeRipple(ripple);
  }

  private removeRipple() {
    this.ripple?.remove();
    this.ripple = null;
  }
}

/**
 * The carrier of press-hold for `PressController`: a custom property holds an expression, a real property computes it
 * to seconds. With no transition-property it changes nothing about `selector` (an element inside the container that
 * is always rendered, e.g. the label).
 */
export function pressHold(selector: string): CSSResult {
  return unsafeCSS(`
  ${selector} {
    transition-property: none;
    transition-delay: var(--tanrei-sys-motion-duration-press-hold);
  }
`);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PressHold {
  /** True from the moment a press starts until it has ended AND been visible for the hold duration. */
  pressed: boolean;
  /** Call from the host `Pressable`'s `onPressIn`, with its event (it names the touch that presses). */
  pressIn: (event?: { nativeEvent?: unknown } | null) => void;
  /**
   * Call from the host `Pressable`'s `onPressOut`. It ends the press when the finger left the press rectangle or the
   * responder was taken away; after `touchEnd` already ended it, it does nothing.
   */
  pressOut: () => void;
  /**
   * Call from the host's `onTouchEnd` AND `onTouchCancel`, with the event. React Native's `Pressable` holds
   * `onPressOut` back until 130 ms after the touch began (`DEFAULT_MIN_PRESS_DURATION` in
   * `Libraries/Pressability/Pressability.js`, not configurable through `Pressable`); the touch events are not held
   * back. So the END of a press is taken from them, and the hold is the token's alone — not max(token, 130 ms).
   * A touch that is not the pressing one (a second finger) is ignored.
   */
  touchEnd: (event?: { nativeEvent?: unknown } | null) => void;
  /**
   * Call from `onPress` with its event. An activation that did not come with a touch or pointer press — Enter /
   * Space / D-pad centre, a screen reader's double tap: React Native delivers those as a bare click, without touch
   * data — returns true and shows the pressed state for the hold duration. After a touch or pointer press it
   * returns false and does nothing.
   */
  activate: (event?: { nativeEvent?: unknown } | null) => boolean;
}

/** A responder (touch / pointer) event carries the touch; the click of a keyboard or an assistive technology does not. */
function isTouch(event?: { nativeEvent?: unknown } | null): boolean {
  const native = event?.nativeEvent as { changedTouches?: unknown; pageX?: unknown } | undefined;
  return Array.isArray(native?.changedTouches) || typeof native?.pageX === 'number';
}

type NativeTouch = { identifier?: unknown; changedTouches?: unknown };
/** The identifier of the touch an event is about (`undefined` when the event does not say). */
function touchId(event?: { nativeEvent?: unknown } | null): unknown {
  return (event?.nativeEvent as NativeTouch | undefined)?.identifier;
}
/** Whether a touch-end / touch-cancel event ends the touch `id`. An event (or a press) that names no touch ends it. */
function endsTouch(event: { nativeEvent?: unknown } | null | undefined, id: unknown): boolean {
  if (id === undefined) return true;
  const native = event?.nativeEvent as NativeTouch | undefined;
  const ended = (Array.isArray(native?.changedTouches) ? native.changedTouches : [native]).map((touch) => (touch as NativeTouch | undefined)?.identifier).filter((value) => value !== undefined);
  return ended.length === 0 || ended.includes(id);
}

/**
 * The pressed flag of a control, as Button BTN-8 asks: it turns on in the same frame as the press, and stays on for
 * at least `hold` milliseconds (`system.motion.duration.pressHold`) even when the press ends sooner — a tap or a key
 * press ends within a frame. Not motion: it applies with reduce-motion on, too.
 */
export function usePressHold(hold: number): PressHold {
  const [pressed, setPressed] = useState(false);
  const since = useRef(0);
  // A touch/pointer press is in progress, or ended in this very task (`onPressOut` runs right before `onPress`).
  const touch = useRef(false);
  // The press is down (between `pressIn` and whichever comes first: `touchEnd` or `pressOut`), and by which touch.
  const down = useRef(false);
  const finger = useRef<unknown>(undefined);
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const releaseAfterHold = useCallback(() => {
    clearTimeout(release.current);
    const remaining = hold - (Date.now() - since.current);
    if (remaining <= 0) setPressed(false);
    else release.current = setTimeout(() => setPressed(false), remaining);
  }, [hold]);

  const pressIn = useCallback((event?: { nativeEvent?: unknown } | null) => {
    clearTimeout(release.current);
    clearTimeout(settle.current);
    touch.current = true;
    down.current = true;
    finger.current = touchId(event);
    since.current = Date.now();
    setPressed(true);
  }, []);
  const pressOut = useCallback(() => {
    // Already ended by `touchEnd`: this is Pressable's late `onPressOut` of the same press (or of the one before).
    if (!down.current) return;
    down.current = false;
    settle.current = setTimeout(() => void (touch.current = false), 0);
    releaseAfterHold();
  }, [releaseAfterHold]);
  const touchEnd = useCallback(
    (event?: { nativeEvent?: unknown } | null) => {
      if (down.current && endsTouch(event, finger.current)) pressOut();
    },
    [pressOut],
  );
  const activate = useCallback((event?: { nativeEvent?: unknown } | null) => {
    if (touch.current || isTouch(event)) return false;
    since.current = Date.now();
    setPressed(true);
    releaseAfterHold();
    return true;
  }, [releaseAfterHold]);

  useEffect(
    () => () => {
      clearTimeout(release.current);
      clearTimeout(settle.current);
    },
    [],
  );
  return useMemo(() => ({ pressed, pressIn, pressOut, touchEnd, activate }), [pressed, pressIn, pressOut, touchEnd, activate]);
}

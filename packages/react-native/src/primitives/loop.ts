import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, type AppStateStatus } from 'react-native';

/** The app is on screen: not in the background, and not inactive (iOS: the app switcher, a call, Control Center). */
const onScreen = (state: AppStateStatus | string | null | undefined) => state !== 'background' && state !== 'inactive';

/** Whether the app is in the foreground, following `AppState`. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => onScreen(typeof AppState.currentState === 'string' ? AppState.currentState : null));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(onScreen(state)));
    return () => subscription?.remove();
  }, []);
  return active;
}

/**
 * A value that loops for as long as `loop` names an animation and the app is in the foreground (PRG-14, LDG-7: an
 * indeterminate animation does not run in an app in the background, and resumes when it comes back). `make` builds ONE
 * cycle from the value; `loop` is its identity — a new name (another form, another duration) restarts the loop at
 * `initial`, and `null` stops it and leaves the value at `initial`: the start of a cycle.
 */
export function useLoop(loop: string | null, make: (value: Animated.Value) => Animated.CompositeAnimation, initial = 0): Animated.Value {
  // A new value per loop: one that a native-driven loop has moved to the native side cannot be driven from JavaScript
  // by the next one (a bar's segment is a layout value; its reduced-motion pulse is native).
  const value = useMemo(() => new Animated.Value(initial), [loop]);
  const build = useRef(make);
  build.current = make;
  const active = useAppActive();
  const running = loop !== null && active;
  useEffect(() => {
    value.setValue(initial);
    if (!running) return undefined;
    const animation = Animated.loop(build.current(value));
    animation.start();
    return () => {
      animation.stop();
      value.setValue(initial);
    };
  }, [value, loop, running, initial]);
  return value;
}

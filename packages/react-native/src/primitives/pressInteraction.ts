import { useCallback, useRef, useState, type ComponentRef, type Ref, type RefObject } from 'react';
import type { GestureResponderEvent, Insets, LayoutChangeEvent, MouseEvent, NativeSyntheticEvent, Pressable, TargetedEvent } from 'react-native';
import type { TanreiCubicBezier } from '../generated/vocabulary';
import { useTanrei } from '../theme/TanreiProvider';
import { useKeyboardFocus } from './FocusRing';
import { resolveInteractionState, type InteractionState } from './interaction';
import { useMinimumTarget, type VisualSize } from './minimumTarget';
import { usePressHold } from './pressHold';
import { usePressRipple, type PressRippleState } from './PressRipple';

/** The host of every pressable control: an (animated) `Pressable`, a host `View` underneath. */
export type PressableHost = ComponentRef<typeof Pressable>;

/** The caller's handlers a control forwards: every one is called AFTER the control has updated its own state. */
export interface PressInteractionHandlers {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onPressIn?: ((event: GestureResponderEvent) => void) | null;
  onPressOut?: ((event: GestureResponderEvent) => void) | null;
  onTouchEnd?: ((event: GestureResponderEvent) => void) | null;
  onTouchCancel?: ((event: GestureResponderEvent) => void) | null;
  onHoverIn?: ((event: MouseEvent) => void) | null;
  onHoverOut?: ((event: MouseEvent) => void) | null;
  onFocus?: ((event: NativeSyntheticEvent<TargetedEvent>) => void) | null;
  onBlur?: ((event: NativeSyntheticEvent<TargetedEvent>) => void) | null;
  onLayout?: ((event: LayoutChangeEvent) => void) | null;
}

export interface PressInteractionOptions extends PressInteractionHandlers {
  disabled: boolean;
  /** The smallest box the control can have: the minimum target is computed from it until the first layout pass. */
  estimate: VisualSize;
  /**
   * The component's motion tokens for the ripple (`pressedFeedback: 'ripple'`): it grows over the feedback duration
   * and fades over the state duration, both with the state easing — one rule on every platform.
   */
  motion: { feedbackDuration: number; stateDuration: number; stateEasing: TanreiCubicBezier };
  /** The caller's ref, forwarded to the host. */
  ref?: Ref<PressableHost>;
  /**
   * Where the ripple grows, when that is not the whole host: a selection control's round container, which is one part
   * of a host that also holds the label. The point of contact is taken relative to `ref`'s node (measured
   * on the page when the press starts, so a container that moves — a switch's — is found where it is); a press outside
   * it (on the label) and an activation without a point start at its center (CHK-10, RAD-12, SWT-8). `size` is the area's token size, so a ripple needs no layout
   * pass. Absent: the ripple grows in the host, from its laid-out size.
   */
  rippleArea?: { ref: RefObject<RippleAreaNode | null>; size: VisualSize };
  /**
   * Focus came from a pointer moving onto the control (a menu item follows the pointer with focus, MNU-8): it is not
   * keyboard focus, so it draws neither the focused state nor the focus ring. The caller clears it when the control
   * loses focus.
   */
  pointerFocus?: boolean;
}

/** A node the ripple can be measured in: any host view. */
export interface RippleAreaNode {
  measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void;
}

export interface PressInteraction {
  /**
   * The state that is drawn (BTN-3): disabled, else pressed > focused > hovered. Under `pressedFeedback: 'none'` a
   * press changes nothing — this is the state under it.
   */
  state: InteractionState;
  /** The state under the press: what is drawn when nothing presses. */
  under: InteractionState;
  /**
   * True when the pressed state draws no layer on the container (`ripple` while a ripple draws, `dim`): the container
   * color is then the one of `under`; everything else still comes from the pressed tokens.
   */
  layerless: boolean;
  /** The held pressed flag (`usePressHold`). */
  pressed: boolean;
  /** Focus that did not come from a press: draw the focus indicator. */
  focused: boolean;
  hovered: boolean;
  /** The ripple of the press, for `<PressRipple>` (null at rest). */
  wave: PressRippleState;
  /** The host's laid-out size (null until the first layout pass). */
  measured: VisualSize | null;
  /** Spread on the host `Pressable`: its ref, the minimum target's `hitSlop`, and every handler. */
  hostProps: {
    ref: (node: PressableHost | null) => void | (() => void);
    hitSlop: Insets;
    onPress: (event: GestureResponderEvent) => void;
    onPressIn: (event: GestureResponderEvent) => void;
    onPressOut: (event: GestureResponderEvent) => void;
    onTouchEnd: (event: GestureResponderEvent) => void;
    onTouchCancel: (event: GestureResponderEvent) => void;
    onHoverIn: (event: MouseEvent) => void;
    onHoverOut: (event: MouseEvent) => void;
    onFocus: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onBlur: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout: (event: LayoutChangeEvent) => void;
  };
}

/**
 * Everything a pressable control does with input, so that each control only decides how a state LOOKS:
 *
 * - pressed from `usePressHold(system.motion.duration.pressHold)` (BTN-8): at once, visible at least that long; a touch
 *   ends on `onTouchEnd` / `onTouchCancel` (Pressable holds `onPressOut` back); a bare click (keyboard, assistive
 *   activation) is shown as a press;
 * - hovered from `onHoverIn/Out`, keyboard focus from `useKeyboardFocus()`;
 * - the minimum target as `hitSlop` (BTN-5), from `estimate` until the first layout pass;
 * - the ripple (`system.behavior.pressedFeedback === 'ripple'`, BTN-9) started at the point of contact, or at the
 *   center for an activation without one;
 * - the resolved state (`resolveInteractionState`), and whether the pressed state draws a container layer.
 *
 * The caller's handlers are always called too.
 */
export function usePressInteraction({
  disabled,
  estimate,
  motion,
  ref,
  onPress,
  onPressIn,
  onPressOut,
  onTouchEnd,
  onTouchCancel,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  onLayout,
  rippleArea,
  pointerFocus = false,
}: PressInteractionOptions): PressInteraction {
  const { system } = useTanrei();
  // Choices of kind: names from the system, never a system id.
  const { pressedFeedback } = system.behavior;

  const press = usePressHold(system.motion.duration.pressHold);
  const [hovered, setHovered] = useState(false);
  const keyboardFocus = useKeyboardFocus();
  const target = useMinimumTarget(estimate);
  // Null at rest, so nothing is rendered then.
  const wave = usePressRipple({
    enabled: pressedFeedback === 'ripple' && !disabled,
    pressed: press.pressed,
    growDuration: motion.feedbackDuration,
    fadeDuration: motion.stateDuration,
    easing: motion.stateEasing,
  });
  const host = useRef<PressableHost | null>(null);
  const setHost = useCallback(
    (node: PressableHost | null) => {
      host.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );

  /** Starts the ripple at a point of contact given in page coordinates (none: keyboard or assistive activation → center). */
  const areaRef = rippleArea?.ref;
  const areaSize = rippleArea?.size;
  const startWave = useCallback(
    (page: { x: number; y: number } | null) => {
      if (!wave.draws) return;
      const node: RippleAreaNode | null = areaRef ? areaRef.current : host.current;
      if (page && node && typeof node.measure === 'function') {
        // Where the area is on the page NOW (it may have scrolled or moved since layout). Fabric answers synchronously.
        node.measure((_x, _y, width, height, pageX, pageY) => {
          const point = { x: page.x - pageX, y: page.y - pageY };
          // A press outside the area (on a selection control's label) grows from the area's center (CHK-10).
          const outside = areaRef !== undefined && (point.x < 0 || point.y < 0 || point.x > width || point.y > height);
          wave.start(outside ? null : point, { width, height });
        });
      } else if (areaSize) {
        wave.start(null, areaSize);
      } else if (target.measured) {
        wave.start(null, target.measured);
      }
    },
    [wave.draws, wave.start, target.measured, areaRef, areaSize],
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      keyboardFocus.handlers.onPressIn();
      press.pressIn(event);
      const touch = event?.nativeEvent;
      startWave(touch && typeof touch.pageX === 'number' && typeof touch.pageY === 'number' ? { x: touch.pageX, y: touch.pageY } : null);
      onPressIn?.(event);
    },
    [keyboardFocus.handlers, press.pressIn, startWave, onPressIn],
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      keyboardFocus.handlers.onPressOut();
      press.pressOut();
      onPressOut?.(event);
    },
    [keyboardFocus.handlers, press.pressOut, onPressOut],
  );
  // The END of a touch comes from the touch events: `Pressable` holds `onPressOut` back until 130 ms after the touch
  // began, and BTN-8's hold is the token's (`usePressHold().touchEnd`). `onPressOut` still ends a press that left the
  // press rectangle or lost the responder.
  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      press.touchEnd(event);
      onTouchEnd?.(event);
    },
    [press.touchEnd, onTouchEnd],
  );
  const handleTouchCancel = useCallback(
    (event: GestureResponderEvent) => {
      press.touchEnd(event);
      onTouchCancel?.(event);
    },
    [press.touchEnd, onTouchCancel],
  );
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      // Enter / Space / D-pad centre and assistive activation arrive as a bare click: BTN-8 shows them pressed too.
      if (press.activate(event)) startWave(null);
      onPress?.(event);
    },
    [press.activate, startWave, onPress],
  );
  const handleHoverIn = useCallback(
    (event: MouseEvent) => {
      setHovered(true);
      onHoverIn?.(event);
    },
    [onHoverIn],
  );
  const handleHoverOut = useCallback(
    (event: MouseEvent) => {
      setHovered(false);
      onHoverOut?.(event);
    },
    [onHoverOut],
  );
  const handleFocus = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      keyboardFocus.handlers.onFocus();
      onFocus?.(event);
    },
    [keyboardFocus.handlers, onFocus],
  );
  const handleBlur = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      keyboardFocus.handlers.onBlur();
      onBlur?.(event);
    },
    [keyboardFocus.handlers, onBlur],
  );
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      target.onLayout(event);
      onLayout?.(event);
    },
    [target.onLayout, onLayout],
  );

  // One state wins, and everything drawn comes from that state's tokens.
  const focused = keyboardFocus.focused && !pointerFocus;
  const flags = { disabled, focused, hovered };
  const under = resolveInteractionState(flags);
  // `none`: no answer to the press — the state under it keeps being drawn.
  const state = pressedFeedback === 'none' ? under : resolveInteractionState({ ...flags, pressed: press.pressed });
  // `ripple` and `dim` draw no state layer on the container: its color stays the one of the state under the press.
  // `ripple` brings the pressed color in as a growing circle (with reduce-motion: at once, like `overlay`); `dim`
  // answers with the pressed opacity alone. The test is `wave.ripple`, not `pressedFeedback`: a ripple needs a box to
  // grow in, and there is none when a keyboard or assistive activation arrives before the first layout pass
  // (`measured` is null, and a bare click carries no point of contact to `measure()` from), or when reduce-motion is
  // on. Either way no circle is drawn and the pressed tokens reach the whole container at once — the `overlay`
  // answer — rather than nothing at all.
  const layerless = state === 'pressed' && (pressedFeedback === 'dim' || wave.ripple !== null);

  return {
    state,
    under,
    layerless,
    pressed: press.pressed,
    focused,
    hovered,
    wave,
    measured: target.measured,
    hostProps: {
      ref: setHost,
      hitSlop: target.hitSlop,
      onPress: handlePress,
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      onHoverIn: handleHoverIn,
      onHoverOut: handleHoverOut,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onLayout: handleLayout,
    },
  };
}

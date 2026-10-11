import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Keyboard, Modal, Platform, Pressable, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { TanreiCubicBezier } from '../generated/vocabulary';
import { toEasing, useReduceMotionSetting } from '../theme/motion';
import { OverlayLayer, useOverlayCover } from '../theme/overlay';
import type { TanreiResolvedInsets } from '../theme/TanreiProvider';
import { partTestID } from './content';

// What the modal pickers share (the date picker's modal presentation, DTP-1 / DTP-22; the time picker, TMP-1 / TMP-25):
// the transparent `Modal` with its own overlay layer, the presence and the enter / exit motion (a fade and a grow from
// enter-scale; a fade without growing where motion is reduced, at once on Android), the focus signal of `onShow`, and
// the area that draws the scrim and centres the container at least the margin from the window's edges, the insets and
// the on-screen keyboard. Each picker draws its own container. Package-internal.

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

export const PICKER_FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

export interface PickerModalMotionTokens {
  openDuration: number;
  openEasing: TanreiCubicBezier;
  closeDuration: number;
  closeEasing: TanreiCubicBezier;
  enterScale: number;
}

/** The scrim's and the container's opacity and the container's scale: animated while it moves, plain 1s in place. */
export interface PickerModalMotion {
  scrim: Moving<number> | Animated.Value;
  container: Moving<number> | Animated.Value;
  scale: Moving<number>;
}

export const PICKER_AT_REST: PickerModalMotion = { scrim: 1, container: 1, scale: 1 };

export interface PickerModalProps {
  visible: boolean;
  motion: PickerModalMotionTokens;
  /** Android's back (the `Modal`'s request to close). */
  onBack: () => void;
  testID: string | undefined;
  /** The layer's test id when the picker has no `testID`. */
  layerTestID: string;
  /** The picker's area and container: the motion, and a number that changes each time focus should move in. */
  children: (motion: PickerModalMotion, focusSignal: number) => ReactNode;
}

/**
 * A picker presented as a modal overlay: React Native's `Modal` is a window of its own — everything outside it is
 * inert and hidden from assistive technology, the content behind cannot scroll. Transparent, without its own animation
 * (Tanrei draws the scrim and the motion); translucent bars, so the scrim covers the whole window. The `Modal`'s window
 * hosts an overlay layer of its own (a tooltip inside is drawn above it); a snackbar of the layer it covers waits.
 */
export function PickerModal({ visible, motion: tokens, onBack, testID, layerTestID, children }: PickerModalProps) {
  const reduceSetting = useReduceMotionSetting();
  const reduce = reduceSetting === true;
  useOverlayCover(visible);
  const [present, setPresent] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const instant = reduce && Platform.OS === 'android';
  useEffect(() => {
    if (visible) {
      setPresent(true);
      setLeaving(false);
    } else if (!present) return undefined;
    else setLeaving(true);
    // Wait for the platform's answer before it grows in.
    if (reduceSetting === null && visible) return undefined;
    const target = visible ? 1 : 0;
    if (instant) {
      progress.setValue(target);
      if (!visible) setPresent(false);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: visible ? tokens.openDuration : tokens.closeDuration,
      easing: toEasing(visible ? tokens.openEasing : tokens.closeEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresent(false);
    });
    return () => animation.stop();
  }, [visible, instant, reduceSetting === null]);
  // It grows while it opens; it fades without growing back when it closes, and where motion is reduced.
  const scale = reduce || leaving ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [tokens.enterScale, 1] });
  // Focus moves in as it opens, and again when the Modal's window is shown (its content exists then).
  const [focusSignal, setFocusSignal] = useState(1);
  const onShow = useCallback(() => setFocusSignal((previous) => previous + 1), []);
  if (!present) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onBack} onShow={onShow} testID={partTestID(testID, 'modal')}>
      <OverlayLayer own testID={partTestID(testID, 'layer') ?? layerTestID}>
        {children({ scrim: progress, container: progress, scale }, focusSignal)}
      </OverlayLayer>
    </Modal>
  );
}

/** The height of the on-screen keyboard (0 while it is hidden). */
export function useKeyboardHeight(active: boolean): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const shown = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [active]);
  return height;
}

export interface PickerModalAreaProps {
  scrimColor: string;
  scrimOpacity: Moving<number> | Animated.Value;
  /** The container's least distance from the window's edges, the insets and the keyboard. */
  margin: number;
  insets?: TanreiResolvedInsets;
  /** Drawn in place (the pickers' surfaces): bounded by the area it is in once laid out, not by the window. */
  inPlace: boolean;
  /** A press on the scrim. */
  onOutside: () => void;
  testID: string | undefined;
  /** The container, given the room it may take (the area less the margins; null in place before layout). */
  children: (room: { width: number; height: number } | null) => ReactNode;
}

/** The scrim over the whole area (a press on it is `onOutside`; not an element to reach) and the container centred in it. */
export function PickerModalArea({ scrimColor, scrimOpacity, margin, insets, inPlace, onOutside, testID, children }: PickerModalAreaProps) {
  const part = (name: string) => partTestID(testID, name);
  const window = useWindowDimensions();
  const keyboard = useKeyboardHeight(true);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const edges = insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const bounds = area ?? (inPlace ? null : window);
  const room = bounds
    ? { width: Math.max(0, bounds.width - 2 * margin - edges.left - edges.right), height: Math.max(0, bounds.height - 2 * margin - edges.top - Math.max(edges.bottom, keyboard)) }
    : null;
  return (
    <View onLayout={onAreaLayout} style={[PICKER_FILL, { alignItems: 'center', justifyContent: 'center', paddingTop: edges.top, paddingBottom: Math.max(edges.bottom, keyboard), paddingLeft: edges.left, paddingRight: edges.right }]} testID={part('area')}>
      <Animated.View style={[PICKER_FILL, { backgroundColor: scrimColor, opacity: scrimOpacity }]} testID={part('scrim')} {...HIDDEN}>
        <Pressable style={{ flex: 1 }} onPress={onOutside} accessible={false} focusable={false} testID={part('scrim.press')} />
      </Animated.View>
      {children(room)}
    </View>
  );
}

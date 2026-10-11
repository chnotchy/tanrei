import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Animated, Modal, Platform, Pressable, type ViewStyle } from 'react-native';
import type { TanreiCubicBezier } from '../generated/vocabulary';
import { toEasing, useReduceMotionSetting } from '../theme/motion';
import { OverlayLayer, useOverlayCover } from '../theme/overlay';
import type { KeyDownEvent } from './rovingFocus';

// What a sheet does as a modal overlay or a layout region, shared by the
// bottom sheet and the side sheet: its presence and its enter / exit progress, the focus move when it opens, the
// transparent `Modal` it is presented in, and the scrim. Each sheet draws its own geometry from the progress.
// Package-internal.

/** Behaviour constants of the sheets' drags (BSH-9, SSH-4): React Native names no touch slop or fling velocity of its own. Not design values. */
export const SHEET_DRAG_SLOP = 8;
/** Points per millisecond (`PanResponder`'s `vx` / `vy` unit). */
export const SHEET_FLING_VELOCITY = 0.5;

export const SHEET_FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
export const HIDDEN_FROM_ASSISTIVE_TECHNOLOGY = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** Something focus can be moved to: any host view (a `Button`, a `TextField`, your own `Pressable`). */
export interface SheetFocusTarget {
  focus?: () => void;
}

export interface SheetMotionTokens {
  enterDuration: number;
  enterEasing: TanreiCubicBezier;
  exitDuration: number;
  exitEasing: TanreiCubicBezier;
}

export interface SheetPresence {
  /** Mounted: while open, and while it leaves. */
  present: boolean;
  /**
   * 0 (out of view) … 1 (in place). A plain 1 while it rests open (nothing is animated then, so a settled sheet carries
   * no interpolation); the animated value while it enters or leaves.
   */
  progress: Animated.Value | number;
  /** Reduce motion is on: the sheet fades in place instead of sliding (Android: it appears and goes at once). */
  reduce: boolean;
}

/**
 * The sheet's presence and its enter / exit progress (BSH-1, SSH-1, SSH-2). Opening animates the progress to 1 over the
 * enter motion, closing to 0 over the exit motion, after which the sheet goes. A sheet mounted open appears in place,
 * without motion. With reduce motion the progress still moves (the sheet fades) except on Android, whose setting removes
 * every animation: there it jumps. The entrance waits for the reduce-motion answer, so that it never slides first.
 * JS-driven: a standard side sheet's width is layout, and a drag adds to a slide.
 */
export function useSheetPresence(open: boolean, motion: SheetMotionTokens): SheetPresence {
  const setting = useReduceMotionSetting();
  const reduce = setting === true;
  const instant = reduce && Platform.OS === 'android';
  const [present, setPresent] = useState(open);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [moving, setMoving] = useState(false);
  const shown = useRef(open);
  useEffect(() => {
    if (open) setPresent(true);
    if (shown.current === open) return undefined;
    // Wait for the platform's answer before a sheet slides in.
    if (open && setting === null) return undefined;
    shown.current = open;
    const target = open ? 1 : 0;
    if (instant) {
      progress.setValue(target);
      setMoving(false);
      if (!open) setPresent(false);
      return undefined;
    }
    setMoving(true);
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: open ? motion.enterDuration : motion.exitDuration,
      easing: toEasing(open ? motion.enterEasing : motion.exitEasing),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setMoving(false);
      if (!open) setPresent(false);
    });
    return () => animation.stop();
  }, [open, instant, setting === null]);
  const resting = open && !moving && shown.current;
  // Present in the same render that opens it, so that its views exist when focus moves in (BSH-3, SSH-3).
  return { present: open || present, progress: resting ? 1 : progress, reduce };
}

/**
 * Focus moves in when the sheet opens (BSH-3, SSH-3) — when `open` changes from false to true, not when its motion
 * ends: to `initialFocusRef` (keyboard and screen reader), else the screen reader to `fallback` (the container, or the
 * headline, so that its name is read first). A `modal` sheet mounted open moves focus in as if it had just opened — it
 * makes everything behind it unfocusable, so focus must be somewhere it can reach; a standard sheet mounted open does
 * not. Returns the move, for the `Modal`'s `onShow` (the window is on screen): it moves once more for an opening.
 */
export function useSheetFocus(open: boolean, initialFocusRef: RefObject<SheetFocusTarget | null> | undefined, fallback: RefObject<unknown>, modal: boolean): () => void {
  // A modal sheet mounted open starts from "closed", so that its first effect is an opening.
  const was = useRef(modal ? false : open);
  const pending = useRef(false);
  const move = useCallback(() => {
    const marked = initialFocusRef?.current;
    if (marked) marked.focus?.();
    // Screen-reader focus: `sendAccessibilityEvent(ref, 'focus')` is `setAccessibilityFocus` for a ref (no native tag).
    const target = marked ?? fallback.current;
    if (!target) return;
    try {
      AccessibilityInfo.sendAccessibilityEvent(target as never, 'focus');
    } catch {
      // Not a host view: keyboard focus only.
    }
  }, [initialFocusRef, fallback]);
  useEffect(() => {
    const opened = open && !was.current;
    was.current = open;
    pending.current = opened;
    if (opened) move();
  }, [open]);
  return useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    move();
  }, [move]);
}

/** `onKeyDown` (a View prop React Native's types do not list yet) calling `onEscape` for Escape on a hardware keyboard. */
export function escapeKey(onEscape: () => void): object {
  return {
    onKeyDown: (event: KeyDownEvent) => {
      if (event.nativeEvent.key !== 'Escape') return;
      event.preventDefault?.();
      onEscape();
    },
  };
}

export interface SheetModalProps {
  /** Android's back (and the platform's Escape where it arrives as back). */
  onBack: () => void;
  /** The window is on screen: move focus in (`useSheetFocus`). */
  onShow: () => void;
  testID: string | undefined;
  /** The overlay layer's id inside the window. */
  layerTestID: string;
  children?: ReactNode;
}

/**
 * The modal sheet's window: a transparent React Native `Modal` — its own window, so everything behind it is inert to
 * touch, the keyboard and assistive technology, and the content behind cannot scroll — without the platform's
 * animation or dim (Tanrei draws the scrim and the motion), with translucent bars so the scrim covers the whole window.
 * The window hosts an overlay layer of its own (a tooltip or a menu in the sheet is drawn above it), and a snackbar of
 * the layer below waits while it is open (SNK-9, SNK-12).
 */
export function SheetModal({ onBack, onShow, testID, layerTestID, children }: SheetModalProps) {
  useOverlayCover(true);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onBack} onShow={onShow} testID={testID}>
      <OverlayLayer own testID={layerTestID}>
        {children}
      </OverlayLayer>
    </Modal>
  );
}

export interface SheetScrimProps {
  /** The scrim's color, resolved (`theme.paint(tokens.scrimColor)`); undefined draws no color. */
  color: string | undefined;
  opacity: Animated.Value | number;
  /** A press on it asks the sheet to close (the sheet decides whether it may). */
  onPress: () => void;
  testID: string | undefined;
}

/** The scrim over the whole window behind a modal sheet: it takes every press behind the sheet, and is not an element for assistive technology. */
export function SheetScrim({ color, opacity, onPress, testID }: SheetScrimProps) {
  return (
    <Animated.View style={[SHEET_FILL, color ? { backgroundColor: color } : null, { opacity }]} testID={testID} {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY}>
      <Pressable style={{ flex: 1 }} onPress={onPress} accessible={false} focusable={false} testID={testID ? `${testID}.press` : undefined} />
    </Animated.View>
  );
}

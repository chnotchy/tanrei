import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type Ref, type RefObject } from 'react';
import {
  Animated,
  Keyboard,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type PanResponderGestureState,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiBottomSheetTokens } from '../generated/vocabulary';
import { RESTING_OPACITY, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { usePressInteraction } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import {
  HIDDEN_FROM_ASSISTIVE_TECHNOLOGY,
  SHEET_DRAG_SLOP,
  SHEET_FILL,
  SHEET_FLING_VELOCITY,
  SheetModal,
  SheetScrim,
  escapeKey,
  useSheetFocus,
  useSheetPresence,
  type SheetFocusTarget,
} from '../primitives/sheet';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { ContentColorProvider } from '../theme/contentColor';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, useTanreiInsets, type TanreiInsets, type TanreiTheme } from '../theme/TanreiProvider';

/** Standard sits over the lower part of its parent while the content above stays usable; modal dims and blocks the rest of the window. */
export type BottomSheetVariant = 'standard' | 'modal';
/** The height the sheet rests at while its content is taller than it. */
export type BottomSheetDetent = 'partial' | 'full';
/** Why the sheet asks to close (the spec's `close` reasons, BSH-5). */
export type BottomSheetCloseReason = 'drag' | 'scrim' | 'escape' | 'back';
export type BottomSheetRef = ComponentRef<typeof View>;

const VARIANTS: readonly BottomSheetVariant[] = ['standard', 'modal'];
const DETENTS: readonly BottomSheetDetent[] = ['partial', 'full'];

export interface BottomSheetSurfaceProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `modal` (default) dims and blocks everything else; `standard` covers the bottom of its parent with no scrim (a layout region). Unknown values render as `modal` (BSH-25). */
  variant?: BottomSheetVariant;
  /**
   * The height it rests at while its content is taller than its partial height: `partial` (default) or `full`. A height
   * the person chose (a drag, the handle) stays until you set `detent` to another value. Unknown values render as `partial`.
   */
  detent?: BottomSheetDetent;
  /** The spec's `detentChange`: the person moved the sheet to its other height. Not called when you change `detent`. */
  onDetentChange?: (detent: BottomSheetDetent) => void;
  /** Whether a drag below its lowest height and, for a modal sheet, Escape, back and the scrim ask it to close. */
  dismissible?: boolean;
  /** Draws the drag handle (default true). */
  handle?: boolean;
  /** The handle's accessible name ("Resize sheet"). Required while the handle is interactive. */
  handleLabel?: string;
  /** Insets the content by the container padding (default true); false lets it reach the edges. */
  inset?: boolean;
  /** The spec's `label`: names the modal dialog or the standard sheet's region ("Share photo"). Required. */
  accessibilityLabel?: string;
  /** The spec's `close`, with its reason. **Controlled**: set `open` to false from it (the sheet does not close itself). */
  onClose?: (reason: BottomSheetCloseReason) => void;
  /** The window's system insets for this sheet; each side named replaces `TanreiProvider`'s `insets`. */
  insets?: TanreiInsets;
  /** The content. A string is drawn in the content color in `sys.typescale.body`; anything else reads `useContentColor()`. */
  children?: ReactNode;
  /** The container (the dialog or the region). */
  ref?: Ref<BottomSheetRef>;
}

export interface BottomSheetProps extends BottomSheetSurfaceProps {
  /** Whether the sheet is shown. **Controlled**: set it to false from `onClose` (or your own control). */
  open?: boolean;
  /** Where focus goes when it opens (a field, the first action). Without it the screen reader moves to the container. */
  initialFocusRef?: RefObject<SheetFocusTarget | null>;
}

/** Asks to close with a reason — only while `dismissible` (BSH-5). */
function useCloseRequest(dismissible: boolean, onClose: ((reason: BottomSheetCloseReason) => void) | undefined) {
  return useCallback(
    (reason: BottomSheetCloseReason) => {
      if (dismissible) onClose?.(reason);
    },
    [dismissible, onClose],
  );
}

/** One ref from the sheet's own (focus) and the caller's. */
function useMergedRef<Node>(own: RefObject<Node | null>, caller: Ref<Node> | undefined) {
  return useCallback(
    (node: Node | null) => {
      own.current = node;
      if (typeof caller === 'function') caller(node);
      else if (caller) (caller as { current: Node | null }).current = node;
    },
    [own, caller],
  );
}

/**
 * Tanrei BottomSheet — spec: `specs/bottom-sheet.spec.json`.
 * Anatomy: [scrim] + container (docked to the bottom of its area, centred, no wider than its maximum width; its top
 * corners rounded) > [drag handle (grip)] + content (inset, clipped, scrolling). Modal: a modal overlay presented in a
 * transparent `Modal` with Tanrei's own scrim and motion. Standard: a layout region placed absolutely over the bottom of
 * its parent. Controlled: it asks to close with `onClose(reason)`; the product sets `open` to false.
 */
export function BottomSheet({ open = false, initialFocusRef, ...props }: BottomSheetProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.bottomSheet;
  const variant = closedValue(VARIANTS, props.variant ?? 'modal', 'modal', 'BottomSheet variant');
  const presence = useSheetPresence(open, { enterDuration: tokens.motionEnterDuration, enterEasing: tokens.motionEnterEasing, exitDuration: tokens.motionExitDuration, exitEasing: tokens.motionExitEasing });
  const container = useRef<BottomSheetRef | null>(null);
  const ref = useMergedRef(container, props.ref);
  // BSH-3: focus moves in when it opens, for both variants; mounted open, only the modal sheet moves it (it makes
  // everything behind it unfocusable).
  const onShow = useSheetFocus(open, initialFocusRef, container, variant === 'modal');
  const requestClose = useCloseRequest(props.dismissible ?? true, props.onClose);
  if (!presence.present) return null;
  const stage = <SheetStage {...props} variant={variant} open={open} progress={presence.progress} containerRef={ref} />;
  if (variant !== 'modal') return stage;
  // BSH-2 / BSH-5: a window of its own; Android's back (and the platform's Escape where it arrives as back) asks to close.
  return (
    <SheetModal onBack={() => requestClose('back')} onShow={onShow} testID={partTestID(props.testID, 'modal')} layerTestID={partTestID(props.testID, 'layer') ?? 'tanrei.bottom-sheet.layer'}>
      {stage}
    </SheetModal>
  );
}

/**
 * The sheet as it rests open — the scrim (modal) and the sheet at the bottom of the view it is drawn in — without a
 * `Modal`, the enter and exit motion or a focus move: the spec's snapshot harness (a 400 × 720 view), the gallery and a
 * documentation page. The handle, the drag and the reasons to close work as in `BottomSheet`.
 */
export function BottomSheetSurface(props: BottomSheetSurfaceProps) {
  const variant = closedValue(VARIANTS, props.variant ?? 'modal', 'modal', 'BottomSheet variant');
  return <SheetStage {...props} variant={variant} open progress={1} containerRef={props.ref} />;
}

// ---------------------------------------------------------------------------------------------------------------
// Heights (BSH-6)

export interface BottomSheetHeights {
  /** The height at `partial`: the content's, at most the partial fraction of the area. */
  partial: number;
  /** The height at `full`: the content's, at most the area less the top margin. */
  full: number;
  /** The sheet has two heights: its content is taller than its partial height. */
  two: boolean;
}

/**
 * BSH-6: the sheet's heights in an area `area` high, for a sheet whose handle row, content and insets need `natural`.
 * Package-internal (under its tests).
 */
export function bottomSheetHeights(area: number, natural: number, tokens: Pick<TanreiBottomSheetTokens, 'containerPartialFraction' | 'containerMarginBlockStart'>): BottomSheetHeights {
  const fullLimit = Math.max(0, area - tokens.containerMarginBlockStart);
  const partialLimit = Math.min(area * tokens.containerPartialFraction, fullLimit);
  const full = Math.min(natural, fullLimit);
  const partial = Math.min(natural, partialLimit);
  return { partial, full, two: full - partial > 0.5 };
}

/**
 * BSH-9: where a released drag goes — `close` (below half the lowest height, or a downward fling with no height below),
 * else the next height in the direction of a fling, else the nearest. `position` is the sheet's visible height at the
 * release, `velocity` the release's vertical speed in points per millisecond (positive: down). Package-internal.
 */
export function bottomSheetRelease(position: number, velocity: number, heights: BottomSheetHeights): 'close' | BottomSheetDetent {
  const stops: { detent: BottomSheetDetent; height: number }[] = heights.two
    ? [
        { detent: 'partial', height: heights.partial },
        { detent: 'full', height: heights.full },
      ]
    : [{ detent: 'partial', height: heights.partial }];
  const lowest = stops[0]!;
  if (velocity > SHEET_FLING_VELOCITY) {
    const below = stops.filter((stop) => stop.height < position - 0.5);
    return below.length > 0 ? below[below.length - 1]!.detent : 'close';
  }
  if (position < lowest.height / 2) return 'close';
  if (velocity < -SHEET_FLING_VELOCITY) return (stops.find((stop) => stop.height > position + 0.5) ?? stops[stops.length - 1]!).detent;
  return stops.reduce((best, stop) => (Math.abs(stop.height - position) < Math.abs(best.height - position) ? stop : best)).detent;
}

/** The on-screen keyboard's height while it is shown (BSH-6, BSH-7). */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: [scrim] + the area the sheet is docked in (BSH-1 … BSH-12, BSH-20 … BSH-22, BSH-24, BSH-26)

interface SheetStageProps extends Omit<BottomSheetSurfaceProps, 'variant' | 'ref'> {
  variant: BottomSheetVariant;
  open: boolean;
  progress: Animated.Value | number;
  containerRef: Ref<BottomSheetRef> | undefined;
}

function SheetStage({
  variant,
  open,
  progress,
  containerRef,
  detent: detentProp = 'partial',
  onDetentChange,
  dismissible = true,
  handle = true,
  handleLabel = '',
  inset = true,
  accessibilityLabel = '',
  onClose,
  insets: ownInsets,
  children,
  testID,
  ...rest
}: SheetStageProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.bottomSheet;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const modal = variant === 'modal';
  const reduce = useReduceMotion();
  const requested = closedValue(DETENTS, detentProp, 'partial', 'BottomSheet detent');
  const requestClose = useCloseRequest(dismissible, onClose);
  const openRef = useRef(open);
  openRef.current = open;

  // BSH-6 / BSH-7: the area — the window below its top inset (modal) or the parent (standard), ending at the keyboard.
  const insets = useTanreiInsets(ownInsets);
  const keyboard = useKeyboardHeight();
  const bottomPad = keyboard > 0 ? 0 : insets.bottom;
  const window = useWindowDimensions();
  const rowHeight = handle ? tokens.handleContainerHeight + 2 * tokens.handleMarginBlock : 0;

  // What the drag needs: the area's height, the content's own height (so the sheet's natural one) and where it rests.
  const [area, setArea] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const heights = area !== null && contentHeight !== null ? bottomSheetHeights(area, rowHeight + contentHeight + bottomPad, tokens) : null;
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const two = heights?.two ?? false;

  // BSH-21: the height it rests at — the product's detent, or the one the person chose since the product last set it.
  const [chosen, setChosen] = useState<BottomSheetDetent>(requested);
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;

  // While it moves (a drag, a settle) the sheet has an explicit height and a downward offset; at rest it is laid out by
  // its detent's bound (the partial fraction as a maximum height, or the top margin as the area's padding).
  const [moving, setMoving] = useState(false);
  const height = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const at = useRef({ height: 0, offset: 0 });
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const place = useCallback(
    (nextHeight: number, nextOffset: number) => {
      at.current = { height: nextHeight, offset: nextOffset };
      height.setValue(nextHeight);
      offset.setValue(nextOffset);
    },
    [height, offset],
  );
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;
  const movingRef = useRef(moving);
  movingRef.current = moving;
  const heightOf = (which: BottomSheetDetent, of: BottomSheetHeights) => (which === 'full' ? of.full : of.partial);

  /** BSH-9 / BSH-11 / BSH-21: moves to a height over the enter motion (at once with reduce motion), then rests. */
  const settle = useCallback(
    (target: number) => {
      running.current?.stop();
      setMoving(true);
      const done = () => {
        running.current = null;
        at.current = { height: target, offset: 0 };
        setMoving(false);
      };
      if (reduce) {
        place(target, 0);
        done();
        return;
      }
      const timing = (value: Animated.Value, toValue: number) =>
        Animated.timing(value, { toValue, duration: tokens.motionEnterDuration, easing: toEasing(tokens.motionEnterEasing), useNativeDriver: false });
      height.setValue(at.current.height);
      offset.setValue(at.current.offset);
      const animation = Animated.parallel([timing(height, target), timing(offset, 0)]);
      running.current = animation;
      animation.start(({ finished }) => {
        if (finished) done();
      });
    },
    [reduce, tokens, place, height, offset],
  );

  /** The person moved it to `next` (BSH-9, BSH-11): the sheet keeps it, and says so once. */
  const choose = useCallback(
    (next: BottomSheetDetent) => {
      if (next === chosenRef.current) return;
      chosenRef.current = next;
      setChosen(next);
      onDetentChange?.(next);
    },
    [onDetentChange],
  );

  // BSH-21: the product changed detent — move there, without detentChange.
  const lastRequested = useRef(requested);
  useEffect(() => {
    if (lastRequested.current === requested) return;
    lastRequested.current = requested;
    if (requested === chosenRef.current) return;
    chosenRef.current = requested;
    setChosen(requested);
    const now = heightsRef.current;
    if (now && sheetHeight !== null) {
      at.current = { height: sheetHeight, offset: 0 };
      settle(heightOf(requested, now));
    }
  }, [requested]);

  // BSH-11: the handle moves the sheet to its other height.
  const toggle = useCallback(() => {
    const now = heightsRef.current;
    if (!now?.two) return;
    const next: BottomSheetDetent = chosenRef.current === 'full' ? 'partial' : 'full';
    at.current = { height: sheetHeight ?? heightOf(chosenRef.current, now), offset: 0 };
    choose(next);
    settle(heightOf(next, now));
  }, [choose, settle, sheetHeight]);

  // BSH-9 / BSH-10 / BSH-20: the drag, by the handle's row, the padding, or the content where the scroll lets it.
  const inContent = useRef(false);
  const scrollY = useRef(0);
  const start = useRef({ position: 0, detent: 'partial' as BottomSheetDetent });
  const drag = useMemo(() => {
    const claims = (gesture: PanResponderGestureState) => {
      const now = heightsRef.current;
      if (!now || Math.abs(gesture.dy) <= SHEET_DRAG_SLOP || Math.abs(gesture.dy) <= Math.abs(gesture.dx)) return false;
      if (!inContent.current) return true;
      // BSH-10: up raises the sheet to full height before the content scrolls; down scrolls the content to its top first.
      if (gesture.dy < 0) return now.two && at.current.height - at.current.offset < now.full - 0.5;
      return scrollY.current <= 0;
    };
    const follow = (position: number) => {
      const now = heightsRef.current;
      if (!now) return;
      const lowest = now.partial;
      const bounded = Math.min(position, now.two ? now.full : now.partial);
      if (bounded >= lowest) place(bounded, 0);
      else place(lowest, lowest - bounded);
    };
    const release = (gesture: PanResponderGestureState, velocity: number) => {
      const now = heightsRef.current;
      if (!now) return;
      const position = Math.min(start.current.position - gesture.dy, now.two ? now.full : now.partial);
      const decision = bottomSheetRelease(position, velocity, now);
      if (decision === 'close') {
        if (!dismissible) {
          settle(now.partial);
          if (now.two) choose('partial');
          return;
        }
        // BSH-20: ask, hold where the drag left it for one frame, then settle back unless the product closed it.
        onClose?.('drag');
        requestAnimationFrame(() => {
          if (!openRef.current) return;
          if (now.two) choose('partial');
          settle(now.partial);
        });
        return;
      }
      if (now.two) choose(decision);
      settle(heightOf(decision, now));
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) => claims(gesture),
      onMoveShouldSetPanResponder: (_event, gesture) => claims(gesture),
      onPanResponderGrant: () => {
        running.current?.stop();
        running.current = null;
        const resting = at.current.offset === 0 && sheetHeightRef.current !== null && !movingRef.current ? sheetHeightRef.current : at.current.height;
        place(resting, movingRef.current ? at.current.offset : 0);
        start.current = { position: at.current.height - at.current.offset, detent: chosenRef.current };
        setMoving(true);
      },
      onPanResponderMove: (_event, gesture) => follow(start.current.position - gesture.dy),
      onPanResponderRelease: (_event, gesture) => release(gesture, gesture.vy),
      onPanResponderTerminate: (_event, gesture) => release(gesture, 0),
      onPanResponderTerminationRequest: () => false,
    });
  }, [dismissible, onClose, settle, choose, place]);
  const touchContent = useCallback(() => void (inContent.current = true), []);
  const touchOver = useCallback(() => void (inContent.current = false), []);

  // Layout reports.
  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    setArea((previous) => (previous === measured ? previous : measured));
  }, []);
  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.height;
      setSheetHeight((previous) => (previous === measured ? previous : measured));
      if (!movingRef.current) at.current = { height: measured, offset: 0 };
    },
    [],
  );
  const onContentSize = useCallback((_width: number, measured: number) => setContentHeight((previous) => (previous === measured ? previous : measured)), []);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => void (scrollY.current = event.nativeEvent.contentOffset.y), []);

  // BSH-11 / BSH-22: the development reports.
  const named = accessibilityLabel.trim() !== '';
  const handleNamed = handleLabel.trim() !== '';
  const interactive = handle && two;
  useEffect(() => {
    if (__DEV__ && !named) console.warn(`Tanrei: a BottomSheet${where} has no accessibilityLabel, so its ${modal ? 'dialog' : 'region'} has no name.`);
  }, [named, modal, where]);
  useEffect(() => {
    if (__DEV__ && interactive && !handleNamed) console.warn(`Tanrei: the drag handle of a BottomSheet${where} has no handleLabel, so it has no accessible name.`);
  }, [interactive, handleNamed, where]);

  // BSH-7: the container — its color, elevation, rounded top corners (eased) and square bottom ones.
  const elevation = theme.elevation(tokens.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.containerColor);
  const shape = tokens.containerShape;
  const corners = { topStart: shape, topEnd: shape, bottomStart: 0, bottomEnd: 0 };

  // BSH-1: slid up from below the bottom edge (enter / exit), plus the drag's offset; with reduce motion it fades in place.
  const entering = typeof progress !== 'number';
  const slide = sheetHeight ?? window.height;
  const slid = entering && !reduce ? Animated.add((progress as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: [slide, 0] }), offset) : null;
  const translate = slid ?? (moving || entering ? offset : null);
  const sheetStyle: ViewStyle = {
    width: '100%',
    maxWidth: tokens.containerMaxWidth,
    flexShrink: 1,
    borderTopStartRadius: shape,
    borderTopEndRadius: shape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  // BSH-6: at rest the detent bounds it (the partial fraction of the area, or the area less the top margin).
  const bound: object = moving ? { height } : chosen === 'partial' ? { maxHeight: `${tokens.containerPartialFraction * 100}%` } : {};
  const motionStyle = { ...(translate ? { transform: [{ translateY: translate }] } : null), ...(entering && reduce ? { opacity: progress } : null) };

  // BSH-22: a modal dialog, or a region, named by the label; BSH-5: Escape and the escape gesture ask to close (modal).
  const semantics = modal
    ? { role: 'dialog' as const, 'aria-modal': true, accessibilityViewIsModal: true, accessibilityLabel: named ? accessibilityLabel : undefined, onAccessibilityEscape: () => requestClose('back') }
    : { role: 'region' as const, accessibilityLabel: named ? accessibilityLabel : undefined };
  const keys = modal ? escapeKey(() => requestClose('escape')) : {};

  // BSH-8: the content, inset by the padding (from the top too without a handle), clipped, in the content color; a
  // string in sys.typescale.body. The clip rounds only where the content can reach the container's top corners.
  const contentColor = theme.paint(tokens.contentColor);
  const padding = inset ? tokens.containerPadding : 0;
  const clip = Math.max(0, shape - rowHeight);
  const content = typeof children === 'string' ? (
    <Text style={{ ...theme.text('body'), color: contentColor }} allowFontScaling testID={part('text')}>
      {children}
    </Text>
  ) : (
    children
  );

  const areaStyle: ViewStyle = {
    position: 'absolute',
    top: modal ? insets.top : 0,
    right: 0,
    bottom: keyboard,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: !moving && chosen === 'full' ? tokens.containerMarginBlockStart : 0,
  };
  return (
    <View style={SHEET_FILL} pointerEvents="box-none" testID={part('stage')}>
      {/* BSH-1 / BSH-5: the scrim of a modal sheet, fading with the sheet; a press on it asks to close. */}
      {modal ? <SheetScrim color={theme.resolve(tokens.scrimColor).a > 0 ? theme.paint(tokens.scrimColor) : undefined} opacity={progress} onPress={() => requestClose('scrim')} testID={part('scrim')} /> : null}
      {/* BSH-4: a standard sheet lets presses above it reach the content. */}
      <View style={areaStyle} pointerEvents="box-none" onLayout={onAreaLayout} testID={part('area')}>
        <Animated.View
          {...rest}
          {...semantics}
          {...keys}
          ref={containerRef}
          onLayout={onSheetLayout}
          style={[sheetStyle, bound, motionStyle]}
          testID={testID}
        >
          {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={0} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
          {/* BSH-9: everything inside the container can be dragged; the content hands the drag over as BSH-10 says. */}
          <View {...drag.panHandlers} onTouchEnd={touchOver} onTouchCancel={touchOver} style={{ flexShrink: 1, paddingBottom: bottomPad }} testID={part('drag')}>
            {handle ? (
              <DragHandle tokens={tokens} theme={theme} interactive={interactive} expanded={chosen === 'full'} label={handleLabel} onToggle={toggle} testID={part('handle')} />
            ) : null}
            <View style={{ flexShrink: 1, overflow: 'hidden', borderTopStartRadius: clip, borderTopEndRadius: clip, ...borderCurveOf(clip > 0 ? cornerSmoothing : 0) }} onTouchStart={touchContent} testID={part('content')}>
              <ContentColorProvider color={contentColor}>
                <ScrollView
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  contentContainerStyle={{ paddingStart: padding, paddingEnd: padding, paddingBottom: padding, paddingTop: handle ? 0 : padding }}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  onContentSizeChange={onContentSize}
                  bounces={false}
                  testID={part('scroll')}
                >
                  {content}
                </ScrollView>
              </ContentColorProvider>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The drag handle (BSH-11 … BSH-19)

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DragHandleProps {
  tokens: TanreiBottomSheetTokens;
  theme: TanreiTheme;
  /** The sheet has two heights: the handle is a button. Otherwise it is drawn at rest and exposes nothing. */
  interactive: boolean;
  expanded: boolean;
  label: string;
  onToggle: () => void;
  testID: string | undefined;
}

function DragHandle({ tokens, theme, interactive, expanded, label, onToggle, testID }: DragHandleProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const appearance = lookupValue(tokens.controls, 'dragHandle', 'dragHandle', 'BottomSheet control');
  const box = { width: tokens.handleContainerWidth, height: tokens.handleContainerHeight };
  const handlePress = useCallback((_event: GestureResponderEvent) => onToggle(), [onToggle]);
  // BSH-13 … BSH-17: the press hold, hover, keyboard focus and the ripple; the state that wins.
  const interaction = usePressInteraction({
    disabled: !interactive,
    estimate: box,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    onPress: handlePress,
  });
  // The handle is never disabled: at one height it is simply not a control, and draws its resting look.
  const active = (value: typeof interaction.state) => (value === 'disabled' ? 'enabled' : value);
  const state = active(interaction.state);
  const current = appearance[state];
  const containerPaint = interaction.layerless ? appearance[active(interaction.under)].containerColor : current.containerColor;
  const { opacity } = stateShape({ containerShape: tokens.handleContainerShape, hoveredOpacity: tokens.hoveredOpacity, focusedOpacity: tokens.focusedOpacity, pressedOpacity: tokens.pressedOpacity, disabledOpacity: RESTING_OPACITY }, state);
  const colors = { container: theme.resolve(containerPaint), grip: theme.resolve(current.gripColor) };
  // BSH-19: the handle's colors move over the state motion; a press lands at once.
  const drawn = useStateTransition({ ...colors, opacity }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' });

  // BSH-15: the hit area is the handle's whole row across its box, and never less than the touch target.
  const target = theme.system.measure.target.touch;
  const vertical = Math.max(tokens.handleMarginBlock, Math.ceil((target - box.height) / 2));
  const horizontal = Math.max(0, Math.ceil((target - box.width) / 2));
  const slop: Insets = { top: vertical, bottom: vertical, left: horizontal, right: horizontal };

  const boxStyle: ViewStyle = {
    width: box.width,
    height: box.height,
    borderRadius: tokens.handleContainerShape,
    alignItems: 'center',
    justifyContent: 'center',
    ...borderCurveOf(cornerSmoothing),
  };
  // BSH-11 / BSH-22: a button named by handleLabel with its expanded state; at one height, nothing at all.
  const exposure = interactive
    ? { role: 'button' as const, accessibilityLabel: label.trim() ? label : undefined, accessibilityState: { expanded }, focusable: true }
    : { ...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY, focusable: false, disabled: true };
  return (
    <View style={{ alignSelf: 'center', marginVertical: tokens.handleMarginBlock }} testID={part('row')}>
      <AnimatedPressable
        {...interaction.hostProps}
        hitSlop={slop}
        {...exposure}
        style={[boxStyle, { backgroundColor: fillOf(colors.container, drawn.container), opacity: drawn.opacity }]}
        testID={testID}
      >
        {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={tokens.handleContainerShape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
        {/* BSH-12 / BSH-22: the grip, centred in the box; decorative. */}
        <Animated.View
          style={{ width: tokens.handleGripWidth, height: tokens.handleGripHeight, borderRadius: tokens.handleGripShape, backgroundColor: fillOf(colors.grip, drawn.grip) }}
          pointerEvents="none"
          testID={part('grip')}
          {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY}
        />
        {/* BSH-14 / BSH-18: keyboard focus only, never animated, in the system's focus style. */}
        <FocusRing visible={interaction.focused && interactive} radius={tokens.handleContainerShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
      </AnimatedPressable>
    </View>
  );
}

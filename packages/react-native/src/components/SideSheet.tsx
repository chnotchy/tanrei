import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type Ref, type RefObject } from 'react';
import {
  Animated,
  I18nManager,
  PanResponder,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type PanResponderGestureState,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiSideSheetTokens, TanreiSideSheetVariant, TanreiSideSheetVariantTokens } from '../generated/vocabulary';
import { ActionRow, actionItems } from '../primitives/actionRow';
import { partTestID } from '../primitives/content';
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
import { ContentColorProvider } from '../theme/contentColor';
import { supportsBoxShadow } from '../theme/elevation';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, useTanreiInsets, type TanreiInsets, type TanreiResolvedInsets } from '../theme/TanreiProvider';
import { IconButton } from './IconButton';

/**
 * Open keys: the core values — `standard`, `modal` — plus whatever the product's design system added (its
 * generated file augments `TanreiSideSheetVariantRegistry`). Only `modal` is presented over the content; any other value
 * is a layout region, as `standard` is.
 */
export type SideSheetVariant = TanreiSideSheetVariant;
/** Why the sheet asks to close (the spec's `close` reasons, SSH-4, SSH-5). */
export type SideSheetCloseReason = 'close' | 'scrim' | 'escape' | 'back' | 'drag';
export type SideSheetRef = ComponentRef<typeof View>;

/** The close glyph of the system's icon font (a ligature name), shown by the close button. */
const CLOSE_GLYPH = 'close';

export interface SideSheetSurfaceProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `standard` (default) sits beside the content in the layout; `modal` slides over it with a scrim. Unknown values render from `standard`'s tokens (SSH-13). */
  variant?: SideSheetVariant;
  /** What the sheet is about ("Filters"): drawn in its header, and its accessible name. Required. */
  headline?: string;
  /** Draws the close button at the end of the header (a standard, medium `IconButton` showing the close glyph). */
  closable?: boolean;
  /** The close button's accessible name ("Close filters"). Required while `closable`. */
  closeLabel?: string;
  /**
   * The spec's `close`, with its reason: the close button (`close`), and for a modal sheet the scrim, Escape, Android's
   * back or the iOS escape gesture (`back`), or a drag toward its edge. **Controlled**: set `open` to false from it.
   */
  onClose?: (reason: SideSheetCloseReason) => void;
  /** The spec's `actions` slot: Tanrei Buttons, main action first (a fragment is fine). Laid out, never restyled. */
  actions?: ReactNode;
  /** The content. A string is drawn in the content color in `sys.typescale.body`; anything else reads `useContentColor()`. */
  children?: ReactNode;
  /** The window's system insets for this sheet; each side named replaces `TanreiProvider`'s `insets`. */
  insets?: TanreiInsets;
  /** Layout of a standard sheet in its row (margins); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** The container (the dialog or the complementary region). */
  ref?: Ref<SideSheetRef>;
}

export interface SideSheetProps extends SideSheetSurfaceProps {
  /** Whether the sheet is shown: a standard sheet takes its place in the layout, a modal one is presented. **Controlled**. */
  open?: boolean;
  /** Where focus goes when it opens. Without it the screen reader moves to the headline (else the container). */
  initialFocusRef?: RefObject<SheetFocusTarget | null>;
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

/** The sheet's width (SSH-7): the token beside the end inset — a modal sheet never wider than the window less a target. */
function sheetWidth(tokens: TanreiSideSheetTokens, endInset: number, modal: boolean, window: number, target: number): number {
  const width = tokens.containerWidth + endInset;
  return modal ? Math.max(0, Math.min(width, window - target)) : width;
}

/**
 * Tanrei SideSheet — spec: `specs/side-sheet.spec.json`.
 * Anatomy: [scrim] + container (the end edge, full height; the start corners rounded by the variant's shape; the start
 * edge's outline) > [header: headline + close button] + content (scrolling) + [divider + actions]. Standard: a layout
 * region at the end of the row the product places it in. Modal: a modal overlay presented in a transparent
 * `Modal` with Tanrei's own scrim and slide. Controlled: it asks to close with `onClose(reason)`.
 */
export function SideSheet({ open = false, initialFocusRef, variant = 'standard', style, ...props }: SideSheetProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.sideSheet;
  const modal = variant === 'modal';
  const reduce = useReduceMotion();
  const presence = useSheetPresence(open, { enterDuration: tokens.motionEnterDuration, enterEasing: tokens.motionEnterEasing, exitDuration: tokens.motionExitDuration, exitEasing: tokens.motionExitEasing });
  const container = useRef<SideSheetRef | null>(null);
  const headline = useRef<ComponentRef<typeof Text> | null>(null);
  const ref = useMergedRef(container, props.ref);
  // SSH-3: focus moves in as it opens: the marked element, else the headline — read first. Mounted open, only the modal
  // sheet moves it (it makes everything behind it unfocusable).
  const fallback = (props.headline ?? '').trim() ? headline : container;
  const onShow = useSheetFocus(open, initialFocusRef, fallback, modal);

  const surface = { ...props, variant, containerRef: ref, headlineRef: headline };
  if (!modal) {
    // SSH-1: a layout region — its width in the row while open, none (and no presence) while closed; it slides while the
    // content beside it resizes (at once with reduce motion).
    const present = reduce ? open : presence.present;
    if (!present) return null;
    return <StandardSheet {...surface} progress={reduce ? 1 : presence.progress} style={style} />;
  }
  if (!presence.present) return null;
  return (
    // SSH-2: a window of its own; SSH-4: Android's back (and the platform's Escape where it arrives as back) asks to close.
    <SheetModal onBack={() => props.onClose?.('back')} onShow={onShow} testID={partTestID(props.testID, 'modal')} layerTestID={partTestID(props.testID, 'layer') ?? 'tanrei.side-sheet.layer'}>
      <ModalStage {...surface} open={open} progress={presence.progress} reduce={presence.reduce} />
    </SheetModal>
  );
}

/**
 * The sheet as it rests open, in place — a standard sheet at its width (put it at the end of a row), a modal one with
 * its scrim over the view it is drawn in and the panel at that view's end — without a `Modal`, motion or a focus move:
 * the spec's snapshot harness (a 720 × 480 view), the gallery and a documentation page.
 */
export function SideSheetSurface({ variant = 'standard', style, ...props }: SideSheetSurfaceProps) {
  const container = useRef<SideSheetRef | null>(null);
  const ref = useMergedRef(container, props.ref);
  const surface = { ...props, variant, containerRef: ref, headlineRef: undefined };
  if (variant !== 'modal') return <StandardSheet {...surface} progress={1} style={style} />;
  return <ModalStage {...surface} open progress={1} reduce={false} />;
}

// ---------------------------------------------------------------------------------------------------------------
// The two forms

interface FormProps extends Omit<SideSheetSurfaceProps, 'ref' | 'style' | 'variant'> {
  variant: SideSheetVariant;
  containerRef: Ref<SideSheetRef>;
  headlineRef: RefObject<ComponentRef<typeof Text> | null> | undefined;
}

/** SSH-1 / SSH-7: the standard sheet — its width in the row (moving while it slides), the panel anchored at the width's start. */
function StandardSheet({ progress, style, ...form }: FormProps & { progress: Animated.Value | number; style?: StyleProp<ViewStyle> }) {
  const theme = useTanrei();
  const tokens = theme.system.components.sideSheet;
  const rtl = I18nManager.isRTL;
  const insets = useTanreiInsets(form.insets);
  const width = sheetWidth(tokens, rtl ? insets.left : insets.right, false, 0, 0);
  const moving = typeof progress !== 'number';
  const animatedWidth = moving ? (progress as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: [0, width] }) : width;
  return (
    <Animated.View style={[{ alignSelf: 'stretch', width: animatedWidth, ...(moving ? { overflow: 'hidden' } : null) }, style]} testID={partTestID(form.testID, 'slot')}>
      <Panel {...form} modal={false} width={width} edges={insets} style={moving ? { position: 'absolute', top: 0, bottom: 0, start: 0 } : { flex: 1 }} />
    </Animated.View>
  );
}

/** SSH-2 / SSH-4 / SSH-6: the modal sheet — the scrim and the panel sliding in from the end edge, the drag toward it. */
function ModalStage({ open, progress, reduce, ...form }: FormProps & { open: boolean; progress: Animated.Value | number; reduce: boolean }) {
  const theme = useTanrei();
  const tokens = theme.system.components.sideSheet;
  const part = (name: string) => partTestID(form.testID, name);
  const rtl = I18nManager.isRTL;
  const insets = useTanreiInsets(form.insets);
  const window = useWindowDimensions();
  const width = sheetWidth(tokens, rtl ? insets.left : insets.right, true, window.width, theme.system.measure.target.touch);
  const openRef = useRef(open);
  openRef.current = open;
  const onClose = form.onClose;

  // SSH-4: the drag toward the end edge — it follows past the slop; released past half the width or flung that way it
  // asks to close (SSH-6: holding one frame, then sliding back if the product declined); otherwise it slides back.
  const drag = useRef(new Animated.Value(0)).current;
  const [dragged, setDragged] = useState(false);
  const toward = useCallback((dx: number) => (rtl ? Math.min(0, dx) : Math.max(0, dx)), [rtl]);
  const back = useCallback(() => {
    if (reduce) {
      drag.setValue(0);
      setDragged(false);
      return;
    }
    Animated.timing(drag, { toValue: 0, duration: tokens.motionEnterDuration, easing: toEasing(tokens.motionEnterEasing), useNativeDriver: false }).start(({ finished }) => {
      if (finished) setDragged(false);
    });
  }, [reduce, drag, tokens]);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture: PanResponderGestureState) => Math.abs(gesture.dx) > SHEET_DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponder: (_event, gesture: PanResponderGestureState) => Math.abs(gesture.dx) > SHEET_DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          drag.stopAnimation();
          setDragged(true);
        },
        onPanResponderMove: (_event, gesture) => drag.setValue(toward(gesture.dx)),
        onPanResponderRelease: (_event, gesture) => {
          const distance = Math.abs(toward(gesture.dx));
          const fling = rtl ? gesture.vx < -SHEET_FLING_VELOCITY : gesture.vx > SHEET_FLING_VELOCITY;
          if (distance > width / 2 || fling) {
            onClose?.('drag');
            requestAnimationFrame(() => {
              if (openRef.current) back();
            });
            return;
          }
          back();
        },
        onPanResponderTerminate: () => back(),
        onPanResponderTerminationRequest: () => false,
      }),
    [toward, rtl, width, onClose, back, drag],
  );

  // SSH-2: slid in from the end edge (a fade in place with reduce motion); at rest, no transform at all.
  const entering = typeof progress !== 'number';
  const hidden = rtl ? -width : width;
  const translate = entering && !reduce ? Animated.add((progress as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: [hidden, 0] }), drag) : entering || dragged ? drag : undefined;
  const motion: ViewStyle = { ...(translate !== undefined ? { transform: [{ translateX: translate as unknown as number }] } : null), ...(entering && reduce ? { opacity: progress as unknown as number } : null) };
  const scrim = theme.resolve(tokens.scrimColor);
  return (
    <View style={SHEET_FILL} testID={part('stage')}>
      {/* SSH-2 / SSH-4: the scrim over everything behind; a press on it asks to close. */}
      <SheetScrim color={scrim.a > 0 ? theme.paint(tokens.scrimColor) : undefined} opacity={progress} onPress={() => onClose?.('scrim')} testID={part('scrim')} />
      <Panel {...form} modal width={width} edges={insets} style={{ position: 'absolute', top: 0, bottom: 0, end: 0, ...motion }} panHandlers={responder.panHandlers} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The panel (SSH-5, SSH-7 … SSH-12, SSH-14)

interface PanelProps extends FormProps {
  modal: boolean;
  width: number;
  /** The insets the panel reaches under (the provider's, each side the sheet's own `insets` names replacing it). */
  edges: TanreiResolvedInsets;
  style: ViewStyle;
  panHandlers?: object;
}

function Panel({ variant, modal, width, edges, headline = '', closable = false, closeLabel = '', onClose, actions, children, containerRef, headlineRef, style, panHandlers, testID, insets: _own, ...rest }: PanelProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.sideSheet;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const rtl = I18nManager.isRTL;
  // SSH-13: an open key; a value the active system does not have is drawn from `standard`'s tokens (reported once).
  const look: TanreiSideSheetVariantTokens = lookupValue(tokens.variants, variant, 'standard', 'SideSheet variant');

  // SSH-5 / SSH-12: still rendered; development builds say what has no name.
  const named = headline.trim() !== '';
  const closeNamed = closeLabel.trim() !== '';
  useEffect(() => {
    if (__DEV__ && !named) console.warn(`Tanrei: a SideSheet${where} has no headline, so its ${modal ? 'dialog' : 'region'} has no name.`);
  }, [named, modal, where]);
  useEffect(() => {
    if (__DEV__ && closable && !closeNamed) console.warn(`Tanrei: the close button of a SideSheet${where} has no closeLabel, so it has no accessible name.`);
  }, [closable, closeNamed, where]);

  // SSH-7: the variant's color, elevation and start corners (square end corners), its start edge; the color reaches
  // under the end, top and bottom insets, the header, content and actions stay inside them.
  const elevation = theme.elevation(look.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(look.containerColor);
  const outline = theme.resolve(look.outlineColor);
  const shape = look.containerShape;
  const corners = { topStart: shape, bottomStart: shape, topEnd: 0, bottomEnd: 0 };
  const container: ViewStyle = {
    width,
    paddingEnd: rtl ? edges.left : edges.right,
    paddingTop: edges.top,
    paddingBottom: edges.bottom,
    borderTopStartRadius: shape,
    borderBottomStartRadius: shape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(look.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(shape > 0 ? cornerSmoothing : 0),
  };

  // SSH-8 / SSH-9 / SSH-5: the header — the headline (wrapping, a heading) from the padding, the close button ending
  // header.padding-inline-end before the end edge, header.gap apart, both centred in a row at least header.height high.
  const hasHeader = named || closable;
  const header = hasHeader ? (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: tokens.headerHeight, paddingStart: tokens.containerPaddingInline, paddingEnd: closable ? tokens.headerPaddingInlineEnd : tokens.containerPaddingInline, gap: tokens.headerGap }}
      testID={part('header')}
    >
      <View style={{ flex: 1 }}>
        {named ? (
          <Text ref={headlineRef} role="heading" style={{ ...theme.text(tokens.headlineTypescale), color: theme.paint(tokens.headlineColor) }} allowFontScaling testID={part('headline')}>
            {headline}
          </Text>
        ) : null}
      </View>
      {closable ? (
        // Placed, not restyled: `alignSelf` centres it in the header row (its own default is the row's start).
        <IconButton variant="standard" size="medium" accessibilityLabel={closeNamed ? closeLabel : undefined} onPress={() => onClose?.('close')} style={{ alignSelf: 'center' }} testID={part('close')}>
          {CLOSE_GLYPH}
        </IconButton>
      ) : null}
    </View>
  ) : null;

  // SSH-10: the content in the content color (a string in sys.typescale.body), scrolling between the header and the actions.
  const contentColor = theme.paint(tokens.contentColor);
  const hasActions = actionItems(actions).length > 0;
  const content = typeof children === 'string' ? (
    <Text style={{ ...theme.text('body'), color: contentColor }} allowFontScaling testID={part('text')}>
      {children}
    </Text>
  ) : (
    children
  );

  // SSH-12: a modal dialog, or a complementary region, named by the headline; SSH-4: Escape and the escape gesture ask to close (modal).
  const semantics = modal
    ? { role: 'dialog' as const, 'aria-modal': true, accessibilityViewIsModal: true, accessibilityLabel: named ? headline : undefined, onAccessibilityEscape: () => onClose?.('back') }
    : { role: 'complementary' as const, accessibilityLabel: named ? headline : undefined };
  const keys = modal ? escapeKey(() => onClose?.('escape')) : {};
  return (
    <Animated.View {...rest} {...semantics} {...keys} ref={containerRef} style={[container, style]} testID={testID}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={0} corners={corners} cornerSmoothing={shape > 0 ? cornerSmoothing : 0} testID={part('elevation-ring')} /> : null}
      {/* SSH-7: the start edge (a standard sheet's hairline; none where the variant's color draws nothing). */}
      {outline.a > 0 ? <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, width: tokens.outlineWidth, backgroundColor: theme.paint(look.outlineColor) }} pointerEvents="none" testID={part('outline')} {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY} /> : null}
      {/* SSH-4: a modal sheet can be dragged toward its edge from anywhere in it. */}
      <View {...(panHandlers ?? {})} style={{ flex: 1 }} testID={part('body')}>
        {header}
        <ContentColorProvider color={contentColor}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingTop: hasHeader ? 0 : tokens.containerPaddingBlock, paddingBottom: hasActions ? 0 : tokens.containerPaddingBlock }}
            showsVerticalScrollIndicator={false}
            testID={part('scroll')}
          >
            {content}
          </ScrollView>
        </ContentColorProvider>
        {hasActions ? (
          <>
            {/* SSH-11: a hairline across the full width, decorative; the actions below it, from the start. */}
            <View style={{ height: tokens.dividerWidth, backgroundColor: theme.paint(tokens.dividerColor) }} testID={part('divider')} {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY} />
            <View style={{ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.actionsPaddingBlock }} testID={part('actions-row')}>
              <ActionRow align="start" gap={tokens.actionsGap} testID={part('actions')}>
                {actions}
              </ActionRow>
            </View>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}


import { Children, useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import type { TanreiDialogTokens } from '../generated/vocabulary';
import { ActionRow, actionItems } from '../primitives/actionRow';
import { IconBox, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { ContentColorProvider } from '../theme/contentColor';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { toEasing, useReduceMotionSetting } from '../theme/motion';
import { OverlayLayer, useOverlayCover } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { NO_INSETS, useTanrei, useTanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';

/** What a dialog's icon given as a function receives: the icon color, the icon size and the glyph (unselected). */
export type DialogIconProps = GlyphSlotProps;

/** Something focus can be moved to: any host view (a `Button`, a `TextField`, your own `Pressable`). */
export interface DialogFocusTarget {
  focus?: () => void;
}

export interface DialogSurfaceProps {
  /** The question or statement ("Discard draft?"): the dialog's name. Required: an empty one still opens (reported). */
  headline: string;
  /** What will happen, or what the person needs to know: the dialog's description. */
  supportingText?: string;
  /** An urgent dialog (a destructive confirmation, a lost connection): the alert-dialog role, read out as it opens. */
  alert?: boolean;
  /** Whether Escape, the platform's back and a press on the scrim ask to close it (`onRequestClose`). */
  dismissible?: boolean;
  /** The spec's `dismiss`: Escape, Android's back, the iOS escape gesture or a press on the scrim, while `dismissible`. */
  onRequestClose?: () => void;
  /** A glyph above the headline (the spec's `icon` slot): a glyph name, a function or a node. With it, icon and headline are centred. */
  icon?: GlyphSlot<DialogIconProps>;
  /** The spec's `actions` slot: Tanrei Buttons, the confirming one last. The dialog lays them out and never restyles them. */
  actions?: ReactNode;
  /** The custom content (the spec's default slot), below the supporting text. `useContentColor()` gives it the dialog's content color. */
  children?: ReactNode;
  /** The dialog's test id; its parts are `<testID>.<part>`. */
  testID?: string;
}

export interface DialogProps extends DialogSurfaceProps {
  /** The spec's `open`: whether it is presented. **Controlled**: set it to false from an action or `onRequestClose`. */
  visible?: boolean;
  /** The element focus moves to when it opens (the least destructive action, the first field). Without it, the headline. */
  initialFocusRef?: RefObject<DialogFocusTarget | null>;
}

/** The parts of the surface that move while the dialog enters and leaves (DLG-13); at rest without them. */
interface SurfaceMotion {
  scrim: Animated.Value | number;
  container: Animated.Value | number;
  scale: Animated.AnimatedInterpolation<number> | number;
}

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei Dialog — spec: `specs/dialog.spec.json`.
 * A modal overlay, presented in a transparent React Native `Modal` (its own window: everything outside is inert), with
 * Tanrei's scrim and motion instead of the platform's (`animationType="none"`). Anatomy: scrim + container > [icon] +
 * headline + [supporting text] + [content] (scrolling between fixed headline and actions when they do not fit, with
 * dividers) + actions. Focus moves in when it opens.
 */
export function Dialog({ visible = false, initialFocusRef, ...surface }: DialogProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.dialog;
  // DLG-7: the window's safe area — React Native cannot read it; TanreiProvider's `insets` give it.
  const insets = useTanreiInsets();
  // Null until the platform has answered: the entrance waits for it, so that Android's reduced motion never animates.
  const reduceSetting = useReduceMotionSetting();
  const reduce = reduceSetting === true;
  const { dismissible = true, onRequestClose, headline, supportingText = '', alert = false } = surface;
  // SNK-9 / SNK-12: a snackbar of the layer this dialog covers pauses, and a waiting one waits.
  useOverlayCover(visible);

  // DLG-13: the scrim fades; the container fades while it grows from enter-scale; both fade out over the exit motion
  // before the Modal goes. Reduced motion: a fade (Android: at once).
  const [present, setPresent] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const instant = reduce && Platform.OS === 'android';
  useEffect(() => {
    if (visible) setPresent(true);
    else if (!present) return undefined;
    if (reduceSetting === null && visible) return undefined;
    const target = visible ? 1 : 0;
    if (instant) {
      progress.setValue(target);
      if (!visible) setPresent(false);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: visible ? tokens.motionEnterDuration : tokens.motionExitDuration,
      easing: toEasing(visible ? tokens.motionEnterEasing : tokens.motionExitEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresent(false);
    });
    return () => animation.stop();
  }, [visible, instant, reduceSetting === null]);
  const motion: SurfaceMotion = {
    scrim: progress,
    container: progress,
    scale: reduce ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [tokens.motionEnterScale, 1] }),
  };

  // DLG-2 / DLG-13: focus moves in as it opens (not when the motion ends): to the marked element, else the headline,
  // so that assistive technology reads the headline first. DLG-14: an alert dialog reads its headline and text at once.
  const headlineRef = useRef<ComponentRef<typeof Text> | null>(null);
  const opened = useRef(false);
  const moveFocusIn = useCallback(() => {
    const marked = initialFocusRef?.current;
    if (marked) marked.focus?.();
    // Screen-reader focus: `sendAccessibilityEvent(ref, 'focus')` is `setAccessibilityFocus` for a ref (no native tag).
    const target = marked ?? headlineRef.current;
    if (target) {
      try {
        AccessibilityInfo.sendAccessibilityEvent(target as never, 'focus');
      } catch {
        // Not a host view: keyboard focus only.
      }
    }
  }, [initialFocusRef]);
  useEffect(() => {
    if (visible && !opened.current) {
      opened.current = true;
      moveFocusIn();
      if (alert) {
        const text = [headline.trim(), supportingText.trim()].filter(Boolean).join(', ');
        if (text) AccessibilityInfo.announceForAccessibility(text);
      }
    } else if (!visible) opened.current = false;
  }, [visible]);

  // DLG-5: back and Escape ask to close only while dismissible; otherwise they do nothing.
  const requestClose = useCallback(() => {
    if (dismissible) onRequestClose?.();
  }, [dismissible, onRequestClose]);

  if (!present) return null;
  return (
    // DLG-1: React Native's Modal is a window of its own — everything outside it is inert and hidden from assistive
    // technology, and the content behind cannot scroll. Transparent and without its own animation: Tanrei draws the
    // scrim and the motion; translucent bars, so the scrim covers the whole window.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      onShow={moveFocusIn}
      testID={partTestID(surface.testID, 'modal')}
    >
      {/* TIP-13: the Modal's window hosts an overlay layer of its own, so a tooltip in the dialog is drawn above it. */}
      <OverlayLayer own testID={partTestID(surface.testID, 'layer') ?? 'tanrei.dialog.layer'}>
        <SurfaceView {...surface} theme={theme} tokens={tokens} motion={motion} onDismiss={requestClose} headlineRef={headlineRef} insets={insets} />
      </OverlayLayer>
    </Modal>
  );
}

/**
 * The dialog as it is drawn — the scrim over its whole area and the container centred in it — without a `Modal`,
 * motion or focus: the spec's snapshot harness, the gallery and a documentation page (DLG-7's look in place).
 */
export function DialogSurface(props: DialogSurfaceProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.dialog;
  const onDismiss = useCallback(() => {
    if (props.dismissible ?? true) props.onRequestClose?.();
  }, [props.dismissible, props.onRequestClose]);
  return <SurfaceView {...props} theme={theme} tokens={tokens} motion={{ scrim: 1, container: 1, scale: 1 }} onDismiss={onDismiss} inPlace />;
}

// ---------------------------------------------------------------------------------------------------------------
// The surface (DLG-5, DLG-7 … DLG-12, DLG-14, DLG-16)

interface SurfaceViewProps extends DialogSurfaceProps {
  theme: TanreiTheme;
  tokens: TanreiDialogTokens;
  motion: SurfaceMotion;
  onDismiss: () => void;
  headlineRef?: RefObject<ComponentRef<typeof Text> | null>;
  /** Drawn in place (`DialogSurface`): not bounded by the window. */
  inPlace?: boolean;
  /** The window's system insets (DLG-7's safe area); none in place. */
  insets?: TanreiResolvedInsets;
}

function SurfaceView({ headline, supportingText = '', alert = false, icon, actions, children, testID, theme, tokens, motion, onDismiss, headlineRef, inPlace = false, insets = NO_INSETS }: SurfaceViewProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // DLG-14: it still opens without a headline; development builds say it has no name.
  const named = headline.trim() !== '';
  useEffect(() => {
    if (__DEV__ && !named) console.warn(`Tanrei: a Dialog${where} has no headline, so it has no accessible name.`);
  }, [named, where]);

  // DLG-7: the window less the margins (and the keyboard) bounds the container.
  const window = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => setKeyboard(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  // The area the dialog is centred in: laid out, it is measured (the Modal's window, or the view a surface is drawn in
  // place in); before that, the window in a Modal and nothing in place (the width tokens alone bound it).
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const bounds = area ?? (inPlace ? null : window);
  // DLG-7: centred in the safe area — each edge moved in by its inset; the keyboard, when it is taller, replaces the
  // bottom inset — and at least the margin inside it.
  const bottomEdge = Math.max(insets.bottom, keyboard);
  const room = bounds
    ? { width: Math.max(0, bounds.width - 2 * tokens.containerMargin - insets.left - insets.right), height: Math.max(0, bounds.height - 2 * tokens.containerMargin - insets.top - bottomEdge) }
    : { width: Infinity, height: Infinity };
  // Only the sides that have an inset: without insets (in place, or a provider without them) the area is as it was.
  const insetPadding: ViewStyle = {
    ...(insets.top > 0 ? { paddingTop: insets.top } : null),
    ...(insets.left > 0 ? { paddingLeft: insets.left } : null),
    ...(insets.right > 0 ? { paddingRight: insets.right } : null),
  };

  // DLG-11 / DLG-12: whether the middle scrolls between the fixed parts, whether everything scrolls, and the dividers.
  const [fixed, setFixed] = useState({ top: 0, bottom: 0 });
  const [scroll, setScroll] = useState({ offset: 0, viewport: 0, content: 0 });
  const onTopLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.top === height ? previous : { ...previous, top: height }));
  }, []);
  const onBottomLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.bottom === height ? previous : { ...previous, bottom: height }));
  }, []);
  const lineHeight = theme.text(tokens.supportingTextTypescale).lineHeight ?? tokens.iconSize;
  // DLG-12: the fixed parts leave less than one line of the scrolled part — everything scrolls together.
  const scrollsAll = Number.isFinite(room.height) && fixed.top + fixed.bottom > 0 && fixed.top + fixed.bottom + 2 * tokens.containerPadding + (typeof lineHeight === 'number' ? lineHeight : 0) > room.height;
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setScroll({ offset: contentOffset.y, viewport: layoutMeasurement.height, content: contentSize.height });
  }, []);
  const onViewport = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setScroll((previous) => (previous.viewport === height ? previous : { ...previous, viewport: height }));
  }, []);
  const onContentSize = useCallback((_width: number, height: number) => setScroll((previous) => (previous.content === height ? previous : { ...previous, content: height })), []);
  const scrolledDown = scroll.offset > 0;
  const moreBelow = scroll.content - scroll.viewport - scroll.offset > 0.5;

  // DLG-9: an icon centres itself and the headline.
  const hasIcon = icon != null && icon !== '';
  const glyph = iconGlyphStyle(theme.system.icon, tokens.iconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(tokens.iconColor);
  const iconNode = hasIcon ? (
    <View style={{ alignSelf: 'center' }}>
      <IconBox icon={glyphSlotContent(icon, { color: iconColor, size: tokens.iconSize, glyph }, iconColor, part('icon.glyph'))} color={iconColor} size={tokens.iconSize} decorative testID={part('icon')} />
    </View>
  ) : null;
  // DLG-8 / DLG-14: the headline names the dialog: a header, read first.
  const headlineNode = (
    <Text
      ref={headlineRef}
      role="heading"
      style={{ ...theme.text(tokens.headlineTypescale), color: theme.paint(tokens.headlineColor), textAlign: hasIcon ? 'center' : undefined }}
      allowFontScaling
      testID={part('headline')}
    >
      {headline}
    </Text>
  );
  const supportingNode = supportingText.trim() ? (
    <Text style={{ ...theme.text(tokens.supportingTextTypescale), color: theme.paint(tokens.supportingTextColor) }} allowFontScaling testID={part('supporting-text')}>
      {supportingText}
    </Text>
  ) : null;
  const hasContent = Children.toArray(children).length > 0;
  // DLG-8: the content gets the dialog's content color as the Tanrei text context (`useContentColor()`); plain text is
  // drawn in it, in sys.typescale.body (as a card's content is, CRD-13; spec change 1c12655).
  const contentColor = theme.paint(tokens.contentColor);
  const contentNode = hasContent ? (
    <ContentColorProvider color={contentColor}>
      <View testID={part('content')}>{typeof children === 'string' ? <Text style={{ ...theme.text('body'), color: contentColor }}>{children}</Text> : children}</View>
    </ContentColorProvider>
  ) : null;
  // DLG-10: one row at the end, or a column at the end when they do not fit.
  const hasActions = actionItems(actions).length > 0;
  const actionsNode = hasActions ? (
    <ActionRow align="end" gap={tokens.actionsGap} testID={part('actions')}>
      {actions}
    </ActionRow>
  ) : null;

  // DLG-11: a hairline across the container (through its padding), drawn only while the middle is scrolled or has more below.
  const divider = (name: string) => <View style={{ height: tokens.dividerWidth, marginHorizontal: -tokens.containerPadding, backgroundColor: theme.paint(tokens.dividerColor) }} testID={part(name)} {...HIDDEN} />;
  const gap = tokens.containerGap;
  const middle = supportingNode || contentNode ? (
    <View style={{ gap }}>
      {supportingNode}
      {contentNode}
    </View>
  ) : null;

  // DLG-7: centred, its color, elevation and corners; as wide as its content between the width bounds, never wider or
  // taller than the window less the margins. DLG-8: inset by the padding.
  const elevation = theme.elevation(tokens.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.containerColor);
  const container: ViewStyle = {
    minWidth: Math.min(tokens.containerMinWidth, room.width),
    maxWidth: Math.min(tokens.containerMaxWidth, room.width),
    ...(Number.isFinite(room.height) ? { maxHeight: room.height } : null),
    borderRadius: tokens.containerShape,
    padding: tokens.containerPadding,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const top = (
    <View style={{ gap, alignItems: hasIcon ? 'center' : 'stretch' }} onLayout={scrollsAll ? undefined : onTopLayout} testID={part('top')}>
      {iconNode}
      {headlineNode}
    </View>
  );
  const bottom = actionsNode ? (
    <View style={{ paddingTop: tokens.actionsMarginBlockStart }} onLayout={scrollsAll ? undefined : onBottomLayout} testID={part('bottom')}>
      {actionsNode}
    </View>
  ) : null;
  const scrollProps = { onScroll, scrollEventThrottle: 16, onLayout: onViewport, onContentSizeChange: onContentSize, bounces: false } as const;

  // DLG-5: Escape and the iOS escape gesture ask to close (while dismissible — the caller decides).
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      if (event.nativeEvent.key !== 'Escape') return;
      event.preventDefault?.();
      onDismiss();
    },
    [onDismiss],
  );
  const keys = { onKeyDown } as object;

  return (
    <View onLayout={onAreaLayout} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: bottomEdge, ...insetPadding }} testID={part('area')}>
      {/* DLG-1 / DLG-5: the scrim over everything behind; a press on it asks to close. It is not an element to reach. */}
      <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.paint(tokens.scrimColor), opacity: motion.scrim }} testID={part('scrim')} {...HIDDEN}>
        <Pressable style={{ flex: 1 }} onPress={onDismiss} accessible={false} focusable={false} testID={part('scrim.press')} />
      </Animated.View>
      <Animated.View
        {...keys}
        onAccessibilityEscape={onDismiss}
        // DLG-14: a modal dialog, an alert dialog while `alert`; iOS keeps VoiceOver inside it.
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal
        accessibilityLabel={named ? headline : undefined}
        accessibilityHint={supportingText.trim() || undefined}
        style={[container, { opacity: motion.container, transform: [{ scale: motion.scale }] }]}
        testID={testID}
      >
        {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.containerShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
        {scrollsAll ? (
          // DLG-12: nothing is cut off — every part scrolls together.
          <ScrollView {...scrollProps} contentContainerStyle={{ gap }} testID={part('scroll')}>
            {top}
            {middle}
            {bottom}
          </ScrollView>
        ) : (
          <>
            {top}
            {middle ? (
              <>
                {scrolledDown ? <View style={{ marginTop: gap }}>{divider('divider-top')}</View> : null}
                <ScrollView {...scrollProps} style={{ flexGrow: 0, flexShrink: 1, marginTop: scrolledDown ? 0 : gap }} testID={part('scroll')}>
                  {middle}
                </ScrollView>
                {moreBelow ? divider('divider-bottom') : null}
              </>
            ) : null}
            {bottom}
          </>
        )}
      </Animated.View>
    </View>
  );
}

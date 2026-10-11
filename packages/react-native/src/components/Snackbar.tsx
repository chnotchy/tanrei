import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Keyboard,
  Platform,
  Pressable,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type TextLayoutEvent,
  type ViewStyle,
} from 'react-native';
import type { TanreiCoreSnackbarControl, TanreiSnackbarTokens } from '../generated/vocabulary';
import { IconBox, Label, RESTING_OPACITY, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { usePressInteraction } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayQueue, type QueuedOverlayProps } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { TanreiThemeScope, useTanrei, useTanreiInsets, type TanreiTheme } from '../theme/TanreiProvider';

/** How long a snackbar stays by itself. `auto`: `short` without an action, `indefinite` with one (WCAG 2.2.1). */
export type SnackbarDuration = 'auto' | 'short' | 'long' | 'indefinite';
const DURATIONS: readonly SnackbarDuration[] = ['auto', 'short', 'long', 'indefinite'];

/** Why a snackbar closed without its action (the spec's `dismiss` reasons). */
export type SnackbarDismissReason = 'close' | 'escape' | 'timeout' | 'host';

/** How a shown snackbar closed: what `useSnackbar().show()` resolves with. */
export type SnackbarResult = { result: 'action' } | { result: 'dismiss'; reason: SnackbarDismissReason };

/** What a snackbar says and offers: the props of `Snackbar` that `useSnackbar().show()` takes. */
export interface SnackbarOptions {
  /** What happened. Required: an empty message still renders, and development builds report it (SNK-20). */
  message: string;
  /** The label of the one action ("Undo"). Empty: no action. */
  actionLabel?: string;
  /** Draws a close button. */
  closable?: boolean;
  /** The close button's accessible name, in your language ("Close"). Required while `closable`. */
  closeLabel?: string;
  /** How long it stays by itself. Unknown values render as `auto`, reported in development builds. */
  duration?: SnackbarDuration;
  /** The bar's test id; its parts are `<testID>.<part>`. */
  testID?: string;
}

export interface SnackbarProps extends SnackbarOptions {
  /** The spec's `action`: the action was activated. */
  onAction?: () => void;
  /** The spec's `dismiss`: it closed without its action, with the reason (`close` or `escape` for a snackbar in place). */
  onDismiss?: (reason: SnackbarDismissReason) => void;
  /** Layout of the bar (margins); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

/** What `useSnackbar()` returns: the host `TanreiProvider` renders in its overlay layer. */
export interface SnackbarHost {
  /** Queues a snackbar; it is shown after the ones before it, and the promise resolves once it has closed. */
  show: (options: SnackbarOptions) => Promise<SnackbarResult>;
  /** Closes the showing snackbar (it resolves with dismiss, reason `host`). */
  dismissCurrent: () => void;
  /** Closes the showing snackbar and drops the waiting ones (each resolves with dismiss, reason `host`). */
  clear: () => void;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

const HOST_RESULT: SnackbarResult = { result: 'dismiss', reason: 'host' };
const CLOSE_GLYPH = 'close';

/** SNK-8: how long a snackbar with these options stays by itself, before the platform's accessibility settings (null: until closed). */
export function snackbarTimeout(tokens: Pick<TanreiSnackbarTokens, 'timeoutShort' | 'timeoutLong'>, duration: SnackbarDuration, hasAction: boolean): number | null {
  const effective = duration === 'auto' ? (hasAction ? 'indefinite' : 'short') : duration;
  switch (effective) {
    case 'short':
      return tokens.timeoutShort;
    case 'long':
      return tokens.timeoutLong;
    case 'indefinite':
      return null;
  }
}

/** SNK-10: what a shown snackbar announces — its message, then its action's label. */
export const snackbarAnnouncement = (message: string, actionLabel: string) => [message.trim(), actionLabel.trim()].filter(Boolean).join(', ');

/** SNK-20: the development reports of one snackbar. */
function reportsOf({ message, actionLabel = '', closable = false, closeLabel = '', duration = 'auto' }: SnackbarOptions, where: string): string[] {
  const reports: string[] = [];
  if (!message.trim()) reports.push(`Tanrei: a Snackbar${where} has no message.`);
  if (closable && !closeLabel.trim()) reports.push(`Tanrei: the close button of a Snackbar${where} has no closeLabel, so it has no accessible name.`);
  if ((duration === 'short' || duration === 'long') && actionLabel.trim()) reports.push(`Tanrei: a Snackbar${where} times out (duration "${duration}") with the action "${actionLabel}"; offer that action elsewhere too (WCAG 2.2.1).`);
  return reports;
}
function useReports(options: SnackbarOptions) {
  const where = options.testID ? ` (testID "${options.testID}")` : '';
  const reports = reportsOf(options, where).join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);
}

/**
 * Tanrei Snackbar — spec: `specs/snackbar.spec.json`, drawn IN PLACE (SNK-19): at its resting look, with no timeout,
 * queue, entrance or announcement, still emitting `onAction` and `onDismiss`. To show one to a person, call
 * `useSnackbar().show()`: the host in `TanreiProvider`'s overlay layer queues, places, times, animates and announces it.
 * Anatomy: container > supporting text + [action] + [close]; focus rings around the controls.
 */
export function Snackbar({ onAction, onDismiss, style, ...options }: SnackbarProps) {
  const theme = useTanrei();
  useReports(options);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [options.message, options.actionLabel]);
  const close = useCallback(
    (result: SnackbarResult) => {
      if (done.current) return;
      done.current = true;
      if (result.result === 'action') onAction?.();
      else onDismiss?.(result.reason);
    },
    [onAction, onDismiss],
  );
  return <SnackbarBar options={options} theme={theme} onClose={close} style={style} />;
}

/**
 * The host (SNK-8 … SNK-13, SNK-17): `show()` queues a snackbar in the nearest overlay layer — `TanreiProvider`'s — and
 * resolves once it has closed. Outside a `TanreiProvider` there is no layer: `show()` resolves at once with dismiss,
 * reason `host`, and development builds report it.
 */
export function useSnackbar(): SnackbarHost {
  const queue = useOverlayQueue();
  const theme = useTanrei();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  return useMemo<SnackbarHost>(
    () => ({
      show: (options) => {
        if (!queue) {
          if (__DEV__) console.warn('Tanrei: useSnackbar().show() was called outside a TanreiProvider, which hosts the snackbars; nothing is shown.');
          return Promise.resolve(HOST_RESULT);
        }
        const shownTheme = themeRef.current;
        return queue.enqueue<SnackbarResult>(
          (props) => (
            <TanreiThemeScope theme={shownTheme}>
              <HostedSnackbar options={options} {...props} />
            </TanreiThemeScope>
          ),
          HOST_RESULT,
        );
      },
      dismissCurrent: () => queue?.dismissCurrent(),
      clear: () => queue?.clear(),
    }),
    [queue],
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The shown snackbar (SNK-8 … SNK-13, SNK-17)

function HostedSnackbar({ options, closeRequested, covered, finish }: { options: SnackbarOptions } & QueuedOverlayProps<SnackbarResult>) {
  const theme = useTanrei();
  const tokens = theme.system.components.snackbar;
  useReports(options);
  const reduce = useReduceMotion();
  const duration = closedValue(DURATIONS, options.duration ?? 'auto', 'auto', 'Snackbar duration');
  const hasAction = Boolean(options.actionLabel?.trim());

  // SNK-17: it rises from below the bottom edge by its own height plus its margin while it fades in; it fades out in
  // place. Reduced motion: a fade (Android: at once).
  const [height, setHeight] = useState<number | null>(null);
  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const [closing, setClosing] = useState<SnackbarResult | null>(null);
  const instant = reduce && Platform.OS === 'android';
  useEffect(() => {
    if (height === null) return undefined;
    if (instant) {
      enter.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(enter, { toValue: 1, duration: tokens.motionEnterDuration, easing: toEasing(tokens.motionEnterEasing), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [height === null]);
  const close = useCallback((result: SnackbarResult) => setClosing((previous) => previous ?? result), []);
  useEffect(() => {
    if (!closing) return undefined;
    if (instant) {
      finish(closing);
      return undefined;
    }
    const animation = Animated.timing(exit, { toValue: 0, duration: tokens.motionExitDuration, easing: toEasing(tokens.motionExitEasing), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished) finish(closing);
    });
    return () => animation.stop();
  }, [closing]);
  // SNK-12: the product closed it or cleared the queue.
  useEffect(() => {
    if (closeRequested) close(HOST_RESULT);
  }, [closeRequested, close]);

  // SNK-10: announced once, politely (after what is being read), the message then the action; focus never moves.
  useEffect(() => {
    const text = snackbarAnnouncement(options.message, options.actionLabel ?? '');
    if (!text) return;
    if (Platform.OS === 'ios' && AccessibilityInfo.announceForAccessibilityWithOptions) AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
    else AccessibilityInfo.announceForAccessibility(text);
  }, []);

  // SNK-8: the timeout, lengthened by Android's accessibility timeout; none for an action while a screen reader runs.
  const base = snackbarTimeout(tokens, duration, hasAction);
  const [timeout, setTimeoutLength] = useState<number | null>(base);
  useEffect(() => {
    let live = true;
    if (base === null) return undefined;
    if (Platform.OS === 'android') {
      AccessibilityInfo.getRecommendedTimeoutMillis(base).then(
        (recommended) => live && typeof recommended === 'number' && recommended > base && setTimeoutLength(recommended),
        () => undefined,
      );
    }
    if (hasAction) {
      AccessibilityInfo.isScreenReaderEnabled().then(
        (running) => live && running === true && setTimeoutLength(null),
        () => undefined,
      );
    }
    return () => {
      live = false;
    };
  }, [base, hasAction]);

  // SNK-9: paused while hovered, while focus is inside, while the app is in the background, while a modal dialog covers
  // the host; each time none holds any longer, the whole length starts again.
  const [hovered, setHovered] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  const paused = hovered || focusInside || !active || covered;
  useEffect(() => {
    if (timeout === null || paused || closing || height === null) return undefined;
    const timer = setTimeout(() => close({ result: 'dismiss', reason: 'timeout' }), timeout);
    return () => clearTimeout(timer);
  }, [timeout, paused, closing, height === null, close]);

  // SNK-13: above the on-screen keyboard.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => setKeyboard(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    // The entrance starts on the first layout pass; a later one (the action moving to its own row) updates the rise.
    const measured = event.nativeEvent.layout.height;
    setHeight((previous) => (previous === measured ? previous : measured));
  }, []);
  // SNK-13: inside the safe area — the provider's insets (React Native has none of its own), the keyboard over the
  // bottom one while it is shown.
  const insets = useTanreiInsets();
  const bottom = Math.max(keyboard, insets.bottom);
  // SNK-14: never wider than the host less its margin on each side (and the side insets), whatever the minimum width says.
  const [hostWidth, setHostWidth] = useState<number | null>(null);
  const onHostLayout = useCallback((event: LayoutChangeEvent) => setHostWidth(event.nativeEvent.layout.width), []);
  const limit = hostWidth === null ? undefined : Math.max(0, hostWidth - 2 * tokens.containerMargin - insets.left - insets.right);
  const rise = height === null ? 0 : height + tokens.containerMargin + bottom;
  const moving: ViewStyle = {
    // Laid out unseen until its height is known.
    opacity: height === null ? 0 : Animated.multiply(enter, exit) as unknown as number,
    ...(reduce ? null : { transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) as unknown as number }] }),
  };
  return (
    // SNK-13: centred at the bottom of the host, its margin from the bottom and the sides of the safe area, above the keyboard.
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingLeft: tokens.containerMargin + insets.left,
        paddingRight: tokens.containerMargin + insets.right,
        paddingBottom: tokens.containerMargin + bottom,
      }}
      onLayout={onHostLayout}
      testID={partTestID(options.testID, 'host')}
    >
      <Animated.View style={moving} onLayout={onLayout} testID={partTestID(options.testID, 'motion')}>
        <SnackbarBar options={options} theme={theme} onClose={close} onPointerInside={setHovered} onFocusInside={setFocusInside} limit={limit} />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The bar (SNK-1 … SNK-7, SNK-11, SNK-14 … SNK-16, SNK-18)

interface SnackbarBarProps {
  options: SnackbarOptions;
  theme: TanreiTheme;
  onClose: (result: SnackbarResult) => void;
  onPointerInside?: (inside: boolean) => void;
  onFocusInside?: (inside: boolean) => void;
  /** The host's width less its margins (hosted only). */
  limit?: number;
  style?: StyleProp<ViewStyle>;
}

function SnackbarBar({ options, theme, onClose, onPointerInside, onFocusInside, limit, style }: SnackbarBarProps) {
  const tokens = theme.system.components.snackbar;
  const { message, actionLabel = '', closable = false, closeLabel = '', testID } = options;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const hasAction = actionLabel.trim() !== '';
  const hasControls = hasAction || closable;

  // SNK-16: the action moves to its own row when the message needs more than two lines beside the controls, or the
  // action's label would wrap. Decided from the laid-out lines, once per content.
  const [ownRow, setOwnRow] = useState(false);
  useEffect(() => setOwnRow(false), [message, actionLabel, closable]);
  const onMessageLayout = useCallback((event: TextLayoutEvent) => {
    if (event.nativeEvent.lines.length > 2) setOwnRow(true);
    const first = event.nativeEvent.lines[0];
    if (first) setFirstLine((previous) => (previous === first.height ? previous : first.height));
  }, []);
  const onActionLayout = useCallback((event: TextLayoutEvent) => {
    if (event.nativeEvent.lines.length > 1) setOwnRow(true);
  }, []);

  // SNK-15: the controls centred on the message's first line.
  const messageStyle = theme.text(tokens.supportingTextTypescale);
  const [firstLine, setFirstLine] = useState<number | null>(null);
  const lineHeight = firstLine ?? (typeof messageStyle.lineHeight === 'number' ? messageStyle.lineHeight : tokens.controlsHeight);
  const shift = tokens.containerPaddingBlock + lineHeight / 2 - tokens.controlsHeight / 2;

  // SNK-11: Escape while focus is inside closes it.
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      if (event.nativeEvent.key !== 'Escape') return;
      event.preventDefault?.();
      onClose({ result: 'dismiss', reason: 'escape' });
    },
    [onClose],
  );
  const focusCount = useRef(0);
  const focusChange = useCallback(
    (delta: 1 | -1) => {
      focusCount.current = Math.max(0, focusCount.current + delta);
      onFocusInside?.(focusCount.current > 0);
    },
    [onFocusInside],
  );

  const action = hasAction ? (
    <SnackbarControl control="action" label={actionLabel} tokens={tokens} theme={theme} onPress={() => onClose({ result: 'action' })} onFocusChange={focusChange} onTextLayout={onActionLayout} testID={part('action')} />
  ) : null;
  const close = closable ? (
    <SnackbarControl control="close" label={closeLabel} tokens={tokens} theme={theme} onPress={() => onClose({ result: 'dismiss', reason: 'close' })} onFocusChange={focusChange} testID={part('close')} />
  ) : null;

  // SNK-14: its color, elevation and corners; the message padded before it and above and below it; after it the end
  // padding, the smaller one when controls follow.
  const elevation = theme.elevation(tokens.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.containerColor);
  const container: ViewStyle = {
    // SNK-13 centres it in a host; SNK-19 centres it across the width it is given when drawn in place.
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: tokens.containerMinHeight,
    minWidth: limit === undefined ? tokens.containerMinWidth : Math.min(tokens.containerMinWidth, limit),
    maxWidth: limit === undefined ? tokens.containerMaxWidth : Math.min(tokens.containerMaxWidth, limit),
    borderRadius: tokens.containerShape,
    paddingStart: tokens.containerPaddingInlineStart,
    paddingEnd: hasControls ? tokens.containerPaddingInlineEndWithControls : tokens.containerPaddingInlineEnd,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const messageNode = (
    <Label style={{ ...messageStyle, flexShrink: 1, flexGrow: 1, paddingTop: tokens.containerPaddingBlock + Math.max(0, -shift), paddingBottom: tokens.containerPaddingBlock }} color={theme.paint(tokens.supportingTextColor)} onTextLayout={onMessageLayout} testID={part('message')}>
      {message}
    </Label>
  );
  const controlsStyle: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: tokens.controlsGap, marginTop: Math.max(0, shift) };
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown } as object;
  return (
    <View
      {...keys}
      onPointerEnter={() => onPointerInside?.(true)}
      onPointerLeave={() => onPointerInside?.(false)}
      style={[container, style]}
      testID={testID}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.containerShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {ownRow ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.containerGap }} testID={part('row')}>
            {messageNode}
            {close ? <View style={controlsStyle}>{close}</View> : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: tokens.containerGap - tokens.containerPaddingBlock, paddingBottom: tokens.containerPaddingInlineEndWithControls }} testID={part('action-row')}>
            {action}
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.containerGap }} testID={part('row')}>
          {messageNode}
          {hasControls ? (
            <View style={controlsStyle} testID={part('controls')}>
              {action}
              {close}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// A control: the action or the close button (SNK-1 … SNK-7, SNK-15)

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SnackbarControlProps {
  control: TanreiCoreSnackbarControl;
  label: string;
  tokens: TanreiSnackbarTokens;
  theme: TanreiTheme;
  onPress: () => void;
  onFocusChange: (delta: 1 | -1) => void;
  onTextLayout?: (event: TextLayoutEvent) => void;
  testID: string | undefined;
}

function SnackbarControl({ control, label, tokens, theme, onPress, onFocusChange, onTextLayout, testID }: SnackbarControlProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const appearance = lookupValue(tokens.controls, control, 'action', 'Snackbar control');
  const icon = control === 'close';
  const size = { width: tokens.controlsHeight, height: tokens.controlsHeight };
  const handlePress = useCallback((_event: GestureResponderEvent) => onPress(), [onPress]);
  // SNK-2 … SNK-6: the press hold, hover, keyboard focus, the minimum target and the ripple; the state that wins.
  const interaction = usePressInteraction({
    disabled: false,
    estimate: size,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    onPress: handlePress,
    onFocus: () => onFocusChange(1),
    onBlur: () => onFocusChange(-1),
  });
  const { wave } = interaction;
  // A control is never disabled: its states are the four of the spec.
  const active = (value: typeof interaction.state) => (value === 'disabled' ? 'enabled' : value);
  const state = active(interaction.state);
  const current = appearance[state];
  const containerPaint = interaction.layerless ? appearance[active(interaction.under)].containerColor : current.containerColor;
  // A control has no disabled state and one corner in every state.
  const { opacity } = stateShape({ containerShape: tokens.controlsShape, hoveredOpacity: tokens.hoveredOpacity, focusedOpacity: tokens.focusedOpacity, pressedOpacity: tokens.pressedOpacity, disabledOpacity: RESTING_OPACITY }, state);
  const colors = { container: theme.resolve(containerPaint), content: theme.resolve(current.contentColor) };
  const drawn = useStateTransition({ ...colors, opacity }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' }) as { container: Moving<string>; content: Moving<string>; opacity: Moving<number> };

  const box: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.controlsShape,
    minHeight: tokens.controlsHeight,
    ...(icon ? { width: tokens.controlsHeight, height: tokens.controlsHeight } : { paddingStart: tokens.controlsPaddingInline, paddingEnd: tokens.controlsPaddingInline }),
    ...borderCurveOf(cornerSmoothing),
  };
  const glyph = iconGlyphStyle(theme.system.icon, tokens.controlsIconSize, { selected: false, resolveFont: theme.resolveIconFont });
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      testID={testID}
      focusable
      role="button"
      accessibilityLabel={label}
      style={[box, { backgroundColor: fillOf(colors.container, drawn.container), opacity: drawn.opacity }]}
    >
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={tokens.controlsShape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {icon ? (
        <IconBox
          icon={
            <Animated.Text style={[glyph.style, { color: drawn.content, textAlign: 'center' }]} allowFontScaling={false} testID={part('glyph')}>
              {CLOSE_GLYPH}
            </Animated.Text>
          }
          color={theme.paint(current.contentColor)}
          size={tokens.controlsIconSize}
          decorative
          testID={part('icon')}
        />
      ) : (
        // SNK-16: the action's label never wraps or is cut; a label that would wrap moves the action to its own row.
        <Label style={theme.text(tokens.controlsLabelTypescale)} color={drawn.content} onTextLayout={onTextLayout} testID={part('label')}>
          {label}
        </Label>
      )}
      <FocusRing visible={interaction.focused} radius={tokens.controlsShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}


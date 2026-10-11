import { Children, Fragment, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type Ref, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  I18nManager,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEvent,
  type TextInputProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiSearchConditionStateTokens, TanreiSearchTokens } from '../generated/vocabulary';
import { IconBox, Label, fillOf, partTestID, textContent } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { resolveInteractionState, type InteractionState } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { ContentColorProvider } from '../theme/contentColor';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayPortal } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { NO_INSETS, TanreiThemeScope, useTanrei, useTanreiInsets, type TanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';
import { IconButton } from './IconButton';
import { placeMenu, type MenuBox } from './Menu';

/** Where the view opens: under the bar, or over the whole window with its own header. */
export type SearchPresentation = 'docked' | 'full-screen';
const PRESENTATIONS: readonly SearchPresentation[] = ['docked', 'full-screen'];

/** Why the search asks to close its view (the spec's `toggle` reasons, in React Native's casing — the Menu's). */
export type SearchCloseReason = 'escape' | 'back' | 'select' | 'submit' | 'outside' | 'tab' | 'focus-out';

/** One suggestion (the spec's item kind `suggestion`). */
export interface SearchSuggestion {
  /** Identifies it; `onSelect` receives it. Unique among the suggestions. */
  value: string;
  /** Its text, and its accessible name. */
  headline: string;
  /** A second line under the headline, and its description. */
  supportingText?: string;
  /** The name of a glyph of the system's icon font at the row's start (`history`, `folder`). Empty draws none. */
  leadingIcon?: string;
}

/** The bar's input: React Native's own `TextInput`. */
export type SearchRef = ComponentRef<typeof TextInput>;

export interface SearchProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `docked` (the default) opens the view under the bar; `full-screen` over the whole window. Unknown values render as `docked` (SRC-27). */
  presentation?: SearchPresentation;
  /** The query. **Controlled**, as `TextInput`'s: set it from `onChangeText`. */
  value?: string;
  /** The spec's `input`: the person changed the value (typing, the clear button, Escape). Not called when you set `value`. */
  onChangeText?: (value: string) => void;
  /** The spec's `label`: names the field, its view and its suggestions ("Search mail"). Never drawn. Required. */
  accessibilityLabel?: string;
  /** A hint in the empty input; never the accessible name. */
  placeholder?: string;
  /** Whether the view is open. **Controlled**: set it from `onExpandedChange`, as for the Menu. */
  expanded?: boolean;
  /** The spec's `toggle`: the search asks to open (`true`) or close (`false`, with the reason) its view. */
  onExpandedChange?: (expanded: boolean, reason?: SearchCloseReason) => void;
  /** Prevents focus, editing and opening the view. */
  disabled?: boolean;
  /** The clear button's accessible name ("Clear search"). Required while the clear button can show. */
  clearLabel?: string;
  /** The full-screen view's back button's accessible name ("Back"). Required for full-screen. */
  backLabel?: string;
  /** The spec's `submit`: the keyboard's action key with no suggestion active; the value. */
  onSubmitEditing?: (value: string) => void;
  /** The spec's `select`: the person chose a suggestion; its value. The search does not change `value` itself. */
  onSelect?: (value: string) => void;
  /** The suggestions, in order (the spec's items). */
  suggestions?: readonly SearchSuggestion[];
  /** The spec's `leading` slot: ONE `IconButton` (menu, back) in place of the search glyph. */
  leading?: ReactNode;
  /** The spec's `trailing` slot: up to two `IconButton`s after the clear button (a fragment is fine). */
  trailing?: ReactNode;
  /** The full-screen view's system insets (each side given replaces `TanreiProvider`'s); the docked view keeps clear of the provider's. */
  insets?: TanreiInsets;
  /** How a suggestion's position is announced. Default: `"2 of 5"` (English). */
  positionText?: (position: number, count: number) => string;
  /** The spec's `default` slot: your own content in the view, after the suggestions. Plain text takes the body style. */
  children?: ReactNode;
  /**
   * Test and gallery only (SRC-7's and SRC-9's `verify`): draws an open view in place — a docked one under the bar, a
   * full-screen one filling the parent (which stands for the window) — without the overlay layer, a `Modal`, placement,
   * motion or moving focus.
   */
  inline?: boolean;
  /** Layout of the search (margins, width); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the bar's `TextInput` (`focus()`, `blur()`). */
  ref?: Ref<SearchRef>;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
/** A built-in icon button sits centred across its row (its own default is the start). */
const CENTRED: ViewStyle = { alignSelf: 'center' };
const englishPosition = (position: number, count: number) => `${position} of ${count}`;

/** The items of a slot, fragments opened (SRC-27 counts them). */
function slotItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? slotItems(child.props.children) : [child]));
}

/** SRC-18: the outline's width in one state (per-component state tokens). States are closed, so this switch stays. */
function outlineWidthOf(tokens: TanreiSearchTokens, state: InteractionState): number {
  switch (state) {
    case 'enabled':
      return tokens.outlineWidth;
    case 'hovered':
      return tokens.hoveredOutlineWidth;
    case 'focused':
      return tokens.focusedOutlineWidth;
    case 'pressed':
      return tokens.pressedOutlineWidth;
    case 'disabled':
      return tokens.disabledOutlineWidth;
  }
}

/** The height of the on-screen keyboard (0 while it is hidden). */
function useKeyboardHeight(active: boolean): number {
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

/**
 * Tanrei Search — spec: `specs/search.spec.json`.
 * Anatomy: bar (container > [leading icon button] or the search glyph, the input, [clear button], [trailing icon
 * buttons]; its outline is its focus indicator) + the view: docked under the bar in `TanreiProvider`'s overlay layer (an
 * operated overlay whose focus is the input: it never takes focus), or full-screen in a `Modal` (header: back button,
 * input, clear button; a divider) — each holding the suggestion rows and your content. Text is edited in React Native's
 * own `TextInput`, as the text field edits it.
 */
export function Search({
  presentation: presentationProp = 'docked',
  value = '',
  onChangeText,
  accessibilityLabel = '',
  placeholder = '',
  expanded = false,
  onExpandedChange,
  disabled = false,
  clearLabel = '',
  backLabel = '',
  onSubmitEditing,
  onSelect,
  suggestions = [],
  leading,
  trailing,
  insets: ownInsets,
  positionText = englishPosition,
  children,
  inline = false,
  style,
  testID,
  ref,
  ...rest
}: SearchProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.search;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // SRC-27: a presentation the component does not define renders as docked (reported once).
  const presentation = closedValue(PRESENTATIONS, presentationProp, 'docked', 'Search presentation');
  const docked = presentation === 'docked';
  const appearance = lookupValue(tokens.conditions, 'standard', 'standard', 'Search condition');
  const { cornerSmoothing } = theme.system.shape;
  const { pressedFeedback } = theme.system.behavior;

  // SRC-27, SRC-10, SRC-11: what is missing or odd still renders; development builds say so.
  const trailingItems = slotItems(trailing);
  const clearShown = value !== '' && !disabled;
  const reports = useMemo(() => {
    const out: string[] = [];
    if (!accessibilityLabel.trim()) out.push(`Tanrei: a Search${where} has no accessibilityLabel. Name it for assistive technology ("Search mail"); the placeholder is never its name.`);
    if (clearShown && !clearLabel.trim()) out.push(`Tanrei: the clear button of a Search${where} has no clearLabel, so it has no accessible name.`);
    if (!docked && expanded && !backLabel.trim()) out.push(`Tanrei: the back button of a full-screen Search${where} has no backLabel, so it has no accessible name.`);
    if (trailingItems.length > 2) out.push(`Tanrei: the trailing slot of a Search${where} holds ${trailingItems.length} elements; it holds up to two icon buttons.`);
    const seen = new Set<string>();
    suggestions.forEach((each, index) => {
      if (!each.value) out.push(`Tanrei: suggestion ${index + 1} of a Search${where} has an empty value.`);
      else if (seen.has(each.value)) out.push(`Tanrei: suggestion ${index + 1} of a Search${where} repeats the value "${each.value}"; values must be unique.`);
      seen.add(each.value);
      if (!each.headline?.trim()) out.push(`Tanrei: suggestion ${index + 1} of a Search${where} has no headline, so it has no accessible name.`);
    });
    return out.join('\n');
  }, [accessibilityLabel, clearShown, clearLabel, docked, expanded, backLabel, trailingItems.length, suggestions, where]);
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // ---------------------------------------------------------------------------------------------------------------
  // Asking to open and close (SRC-5, SRC-6): once per change of `expanded`, never while disabled.

  const asked = useRef<boolean | null>(null);
  useEffect(() => {
    asked.current = null;
  }, [expanded]);
  const toggle = useCallback(
    (next: boolean, reason?: SearchCloseReason) => {
      if (disabled || next === expanded || asked.current === next) return;
      asked.current = next;
      if (next) onExpandedChange?.(true);
      else onExpandedChange?.(false, reason);
    },
    [disabled, expanded, onExpandedChange],
  );

  // ---------------------------------------------------------------------------------------------------------------
  // The active suggestion (SRC-14): moved by the arrow keys, focus staying in the input.

  const [active, setActive] = useState(-1);
  const suggestionKey = suggestions.map((each) => each.value).join('\u0000');
  useEffect(() => setActive(-1), [suggestionKey, expanded]);
  const choose = useCallback(
    (index: number) => {
      const suggestion = suggestions[index];
      if (!suggestion || disabled) return;
      // SRC-15: select, then the search asks to close; the value is the product's to set.
      onSelect?.(suggestion.value);
      toggle(false, 'select');
    },
    [suggestions, disabled, onSelect, toggle],
  );

  // ---------------------------------------------------------------------------------------------------------------
  // The inputs: the bar's, and the full-screen header's. Both edit the same value.

  const barInput = useRef<SearchRef | null>(null);
  const headerInput = useRef<SearchRef | null>(null);
  const setBarInput = useCallback(
    (node: SearchRef | null) => {
      barInput.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) (ref as { current: SearchRef | null }).current = node;
      return undefined;
    },
    [ref],
  );
  const [barFocused, setBarFocused] = useState(false);
  const focusedNow = useRef(false);
  const expandedNow = useRef(expanded);
  expandedNow.current = expanded;

  const change = useCallback(
    (next: string) => {
      if (disabled) return;
      setActive(-1);
      // SRC-4 (TXF-1): once per change, with the new value.
      onChangeText?.(next);
      // SRC-5: typing opens the view.
      if (!expanded) toggle(true);
    },
    [disabled, onChangeText, expanded, toggle],
  );
  const submit = useCallback(() => {
    if (disabled) return;
    // SRC-14 / SRC-13: Enter chooses the active suggestion; with none, submit, then close.
    if (expanded && active >= 0) {
      choose(active);
      return;
    }
    onSubmitEditing?.(value);
    if (expanded) toggle(false, 'submit');
  }, [disabled, expanded, active, choose, onSubmitEditing, value, toggle]);
  const onKeyPress = useCallback(
    (event: TextInputKeyPressEvent) => {
      if (disabled) return;
      const { key } = event.nativeEvent;
      if (key === 'Escape') {
        // SRC-6 / SRC-12: Escape closes an open view; while closed it clears a value (and does nothing without one).
        if (expanded) toggle(false, 'escape');
        else if (value !== '') onChangeText?.('');
        return;
      }
      if (key === 'ArrowDown') {
        if (!expanded) toggle(true);
        else if (suggestions.length > 0) setActive((previous) => Math.min(previous + 1, suggestions.length - 1));
        return;
      }
      if (key === 'ArrowUp') {
        if (expanded) setActive((previous) => (previous <= 0 ? -1 : previous - 1));
        return;
      }
      // SRC-6: Tab and Shift+Tab leave the docked search, which closes; focus moves on as it would have.
      if (key === 'Tab' && expanded && docked) toggle(false, 'tab');
    },
    [disabled, expanded, toggle, value, onChangeText, suggestions.length, docked],
  );
  const clear = useCallback(
    (input: 'bar' | 'header') => {
      if (disabled) return;
      setActive(-1);
      // SRC-10: empty, input once, focus to the input it belongs to; nothing opens or closes.
      onChangeText?.('');
      (input === 'bar' ? barInput : headerInput).current?.focus();
    },
    [disabled, onChangeText],
  );

  // ---------------------------------------------------------------------------------------------------------------
  // The bar (SRC-1 … SRC-4, SRC-18 … SRC-22)

  const barRef = useRef<PressableHost | null>(null);
  const interaction = usePressInteraction({
    disabled,
    ref: barRef,
    estimate: { width: theme.system.measure.target.touch, height: tokens.containerHeight },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    onPress: () => {
      // SRC-5: a press on the bar focuses the input and opens the view.
      if (disabled) return;
      barInput.current?.focus();
      if (!expanded) toggle(true);
    },
  });
  // SRC-18: focus by any means is the focused state (a field shows where typing goes). One state wins.
  const flags = { disabled, focused: barFocused && !disabled, hovered: interaction.hovered };
  const under = resolveInteractionState(flags);
  const state = pressedFeedback === 'none' ? under : resolveInteractionState({ ...flags, pressed: interaction.pressed });
  const layerless = state === 'pressed' && (pressedFeedback === 'dim' || interaction.wave.ripple !== null);
  const current: TanreiSearchConditionStateTokens = appearance[state];
  const { opacity } = stateShape(tokens, state);
  const shape = tokens.containerShape;
  const colors = {
    container: theme.resolve(layerless ? appearance[under].containerColor : current.containerColor),
    outline: theme.resolve(current.outlineColor),
    icon: theme.resolve(current.leadingIconColor),
    input: theme.resolve(current.inputColor),
  };
  const drawn = useStateTransition(
    { ...colors, opacity, outlineWidth: outlineWidthOf(tokens, state) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as { container: Moving<string>; outline: Moving<string>; icon: Moving<string>; input: Moving<string>; opacity: Moving<number>; outlineWidth: Moving<number> };
  const elevation = theme.elevation(current.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;

  // SRC-3 (TXF-6): the selection in comp.text-field.selection.color. iOS has ONE tint for the caret and the highlight:
  // there it stays the caret color, and the highlight is a tint of it.
  const caret = theme.paint(current.caretColor);
  const selectionColors: Pick<TextInputProps, 'cursorColor' | 'selectionColor' | 'selectionHandleColor'> =
    Platform.OS === 'ios' ? { cursorColor: caret, selectionColor: caret } : { cursorColor: caret, selectionColor: theme.paint(theme.system.components.textField.selectionColor), selectionHandleColor: caret };
  const inputStyle: TextStyle = theme.text(tokens.inputTypescale);

  /** SRC-3 / SRC-4 / SRC-24: the props both inputs share. */
  const inputProps = (which: 'bar' | 'header'): TextInputProps => ({
    value,
    onChangeText: change,
    onSubmitEditing: submit,
    onKeyPress,
    // SRC-4 (TXF-20): a general keyboard whose action key reads as search; the value stays on one line (SRC-28).
    keyboardType: 'default',
    inputMode: 'search',
    returnKeyType: 'search',
    enterKeyHint: 'search',
    submitBehavior: 'submit',
    multiline: false,
    readOnly: disabled,
    editable: !disabled,
    focusable: !disabled,
    placeholder,
    placeholderTextColor: theme.paint(current.placeholderColor),
    ...selectionColors,
    allowFontScaling: true,
    // SRC-24: a search field named by the label, never by the placeholder (React Native's role for it is
    // `accessibilityRole="search"`; its `role` prop has no search value).
    accessibilityRole: 'search',
    accessibilityLabel,
    accessibilityState: { disabled },
    testID: part(which === 'bar' ? 'input' : 'header.input'),
  });

  // SRC-2: the search glyph, unselected, at leading-icon.size, hidden.
  const glyph = iconGlyphStyle(theme.system.icon, tokens.leadingIconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const leadingItems = slotItems(leading);
  const hasLeading = leadingItems.length > 0;
  const endsWithButton = clearShown || trailingItems.length > 0;
  const bar: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.containerGap,
    // SRC-28: a minimum; the bar grows to hold one line of enlarged text.
    minHeight: tokens.containerHeight,
    paddingStart: hasLeading ? tokens.containerPaddingInlineWithButton : tokens.containerPaddingInline,
    paddingEnd: endsWithButton ? tokens.containerPaddingInlineWithButton : tokens.containerPaddingInline,
    borderRadius: shape,
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const glow = barFocused && !disabled && theme.system.behavior.focusStyle === 'glow' && supportsBoxShadow() ? <FocusRing visible radius={shape} cornerSmoothing={cornerSmoothing} testID={part('glow')} /> : null;

  const barNode = (
    <AnimatedPressable
      {...interaction.hostProps}
      // SRC-22: the hit area reaches the touch target vertically; the width is the layout's.
      hitSlop={{ ...interaction.hostProps.hitSlop, left: 0, right: 0 }}
      accessible={false}
      focusable={false}
      disabled={disabled}
      style={[bar, { backgroundColor: fillOf(colors.container, drawn.container), opacity: drawn.opacity }]}
      testID={part('bar')}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('bar.elevation-ring')} /> : null}
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('bar.ripple')} /> : null}
      {hasLeading ? (
        // SRC-25: the product's icon button, not restyled, its own focus stop before the input.
        <View testID={part('leading')}>{leading}</View>
      ) : (
        <IconBox
          icon={
            <Animated.Text style={[glyph.style, { color: drawn.icon, textAlign: 'center' }]} allowFontScaling={false} testID={part('leading-icon.glyph')}>
              search
            </Animated.Text>
          }
          color={theme.paint(current.leadingIconColor)}
          size={tokens.leadingIconSize}
          decorative
          testID={part('leading-icon')}
        />
      )}
      <AnimatedTextInput
        {...inputProps('bar')}
        ref={setBarInput}
        // SRC-5 / SRC-19: a press on the input is a press on the bar.
        onPressIn={(event: GestureResponderEvent) => {
          interaction.hostProps.onPressIn(event);
          if (!expanded && !disabled) toggle(true);
        }}
        onPressOut={(event: GestureResponderEvent) => {
          interaction.hostProps.onPressOut(event);
          interaction.hostProps.onTouchEnd(event);
        }}
        onFocus={() => {
          focusedNow.current = true;
          setBarFocused(true);
        }}
        onBlur={() => {
          focusedNow.current = false;
          setBarFocused(false);
          // SRC-6: focus that leaves the docked search closes it (focus moving to its own clear button included, which
          // gives it straight back).
          if (!inline && docked) {
            setTimeout(() => {
              if (!focusedNow.current && expandedNow.current) toggle(false, 'focus-out');
            }, 0);
          }
        }}
        style={[inputStyle, { flex: 1, flexShrink: 1, minHeight: typeof inputStyle.lineHeight === 'number' ? inputStyle.lineHeight : undefined, paddingTop: 0, paddingBottom: 0, paddingStart: 0, paddingEnd: 0, margin: 0 }, { color: drawn.input }]}
      />
      {/* SRC-10: a standard small icon button, centred in the row as every element is (SRC-1). */}
      {clearShown ? (
        <IconButton size="small" accessibilityLabel={clearLabel} onPress={() => clear('bar')} style={CENTRED} testID={part('clear')}>
          close
        </IconButton>
      ) : null}
      {trailingItems.length > 0 ? (
        // SRC-25: the product's icon buttons, not restyled, each its own focus stop after the clear button; each in a
        // box of its own, so that the row centres it (SRC-1).
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.containerGap }} testID={part('trailing')}>
          {trailingItems.map((item, index) => (
            <View key={isValidElement(item) && item.key != null ? item.key : index}>{item}</View>
          ))}
        </View>
      ) : null}
      {/* SRC-18: the focus indicator is the outline, inside the bar's edge — never a focus ring around the bar. */}
      {colors.outline.a > 0 || typeof drawn.outline !== 'string' ? (
        <Animated.View style={[FILL, { borderRadius: shape, borderWidth: drawn.outlineWidth, borderColor: drawn.outline, pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) }]} testID={part('outline')} {...HIDDEN} />
      ) : null}
      {glow}
    </AnimatedPressable>
  );

  // ---------------------------------------------------------------------------------------------------------------
  // The view's content (SRC-14 … SRC-17, SRC-29)

  const hasContent = suggestions.length > 0 || children != null;
  const content = (
    <SearchContent
      suggestions={suggestions}
      active={active}
      tokens={tokens}
      theme={theme}
      appearance={appearance}
      positionText={positionText}
      scroll={!inline}
      onChoose={choose}
      testID={testID}
    >
      {children}
    </SearchContent>
  );

  // ---------------------------------------------------------------------------------------------------------------
  // Full-screen focus (SRC-9): in when it opens, back to the bar's input when it closes.

  const fullScreenOpen = !docked && expanded && !disabled;
  const wasFullScreen = useRef(false);
  useEffect(() => {
    if (inline) return;
    if (fullScreenOpen) wasFullScreen.current = true;
    else if (wasFullScreen.current) {
      wasFullScreen.current = false;
      barInput.current?.focus();
    }
  }, [fullScreenOpen, inline]);

  // SRC-6: Android's back button closes the docked view (the full-screen view's Modal answers it itself).
  useEffect(() => {
    if (inline || !docked || !expanded || disabled) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      toggle(false, 'back');
      return true;
    });
    return () => subscription.remove();
  }, [inline, docked, expanded, disabled, toggle]);

  const header = (
    <SearchHeader
      tokens={tokens}
      theme={theme}
      backLabel={backLabel}
      clearLabel={clearLabel}
      clearShown={clearShown}
      inputProps={inputProps('header')}
      inputStyle={[inputStyle, { color: theme.paint(current.inputColor) }]}
      inputRef={headerInput}
      onBack={() => toggle(false, 'back')}
      onClear={() => clear('header')}
      testID={testID}
    />
  );

  if (inline && !docked) {
    // SRC-9's harness: the open view filling the parent that stands for the window.
    return expanded && !disabled ? (
      <View style={style} testID={testID}>
        <FullScreenSurface tokens={tokens} theme={theme} label={accessibilityLabel} insets={NO_INSETS} keyboard={0} header={header} testID={part('view')}>
          {content}
        </FullScreenSurface>
      </View>
    ) : (
      <View style={style} testID={testID}>
        {barNode}
      </View>
    );
  }

  return (
    <View {...rest} style={style} testID={testID}>
      {barNode}
      {inline && docked && expanded && !disabled && hasContent ? (
        <View style={{ marginTop: tokens.viewOffset }}>
          <DockedSurface tokens={tokens} theme={theme} label={accessibilityLabel} testID={part('view')}>
            {content}
          </DockedSurface>
        </View>
      ) : null}
      {!inline && docked ? (
        <DockedOverlay visible={expanded && !disabled && hasContent} anchorRef={barRef as RefObject<Measurable | null>} tokens={tokens} theme={theme} label={accessibilityLabel} onOutside={() => toggle(false, 'outside')} testID={testID}>
          {content}
        </DockedOverlay>
      ) : null}
      {!inline && !docked ? (
        <FullScreenModal visible={fullScreenOpen} tokens={tokens} theme={theme} label={accessibilityLabel} ownInsets={ownInsets} header={header} headerInput={headerInput} onBack={() => toggle(false, 'back')} testID={testID}>
          {content}
        </FullScreenModal>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The docked view (SRC-7, SRC-8, SRC-23): in TanreiProvider's overlay layer, under (or over) the bar.

interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

function DockedSurface({ tokens, theme, label, maxHeight, onLayout, children, testID }: { tokens: TanreiSearchTokens; theme: TanreiTheme; label: string; maxHeight?: number; onLayout?: (event: LayoutChangeEvent) => void; children: ReactNode; testID: string | undefined }) {
  const { cornerSmoothing } = theme.system.shape;
  const elevation = theme.elevation(tokens.viewContainerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.viewContainerColor);
  const part = (name: string) => partTestID(testID, name);
  return (
    <View
      onLayout={onLayout}
      accessibilityLabel={label}
      style={{ borderRadius: tokens.viewContainerShape, ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.viewContainerColor) } : null), ...shadow, ...borderCurveOf(cornerSmoothing), ...(maxHeight !== undefined ? { maxHeight } : null) }}
      testID={testID}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.viewContainerShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {/* SRC-7: the content clipped to the view's shape and inset by its padding. */}
      <View style={{ overflow: 'hidden', borderRadius: tokens.viewContainerShape, flexShrink: 1, paddingVertical: tokens.viewPaddingBlock, paddingStart: tokens.viewPaddingInline, paddingEnd: tokens.viewPaddingInline, ...borderCurveOf(cornerSmoothing) }} testID={part('clip')}>
        {children}
      </View>
    </View>
  );
}

interface DockedOverlayProps {
  visible: boolean;
  /** The bar: measured to place the view. */
  anchorRef: RefObject<Measurable | null>;
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  label: string;
  onOutside: () => void;
  children: ReactNode;
  testID: string | undefined;
}

function DockedOverlay({ visible, anchorRef, tokens, theme, label, onOutside, children, testID }: DockedOverlayProps) {
  const window = useWindowDimensions();
  const insets = useTanreiInsets();
  const keyboard = useKeyboardHeight(visible);
  const reduce = useReduceMotion();
  const [present, setPresent] = useState(visible);
  const [bar, setBar] = useState<MenuBox | null>(null);
  const [area, setArea] = useState<MenuBox | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const layerRef = useRef<{ current: Measurable | null } | null>(null);
  const part = (name: string) => partTestID(testID, name);

  // SRC-7: the bar (and the layer) is measured when the view opens, when its content is laid out and when the window or
  // the keyboard changes.
  const measure = useCallback(() => {
    const same = (a: MenuBox | null, b: MenuBox) => a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const node = anchorRef.current;
    if (node?.measureInWindow) node.measureInWindow((x, y, width, height) => setBar((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
    const layer = layerRef.current?.current;
    if (layer?.measureInWindow) layer.measureInWindow((x, y, width, height) => setArea((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
  }, [anchorRef]);
  useEffect(() => {
    if (!visible) return;
    setPresent(true);
    measure();
  }, [visible, measure, window.width, window.height, keyboard]);
  const onSurfaceLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
      measure();
    },
    [measure],
  );

  const box = area ?? { x: 0, y: 0, width: window.width, height: window.height };
  // The margin is kept from the safe area's edges and from the on-screen keyboard.
  const within: TanreiResolvedInsets = {
    top: Math.max(0, insets.top - box.y),
    left: Math.max(0, insets.left - box.x),
    bottom: Math.max(0, Math.max(insets.bottom, keyboard) - (window.height - box.y - box.height)),
    right: Math.max(0, insets.right - (window.width - box.x - box.width)),
  };
  const relative = bar ? { ...bar, x: bar.x - box.x, y: bar.y - box.y } : null;
  const position =
    relative && size
      ? placeMenu({ anchor: relative, surface: { width: relative.width, height: size.height }, viewport: box, placement: 'bottom-start', offset: tokens.viewOffset, margin: tokens.viewViewportMargin, rtl: I18nManager.isRTL, insets: within })
      : null;
  const placed = position !== null;

  // SRC-23: fades in and grows from the edge that faces the bar over the open motion; fades out over the close motion.
  useEffect(() => {
    if (visible && !placed) return undefined;
    const target = visible ? 1 : 0;
    if (reduce) {
      progress.setValue(target);
      if (!visible) setPresent(false);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: visible ? tokens.motionOpenDuration : tokens.motionCloseDuration,
      easing: toEasing(visible ? tokens.motionOpenEasing : tokens.motionCloseEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresent(false);
    });
    return () => animation.stop();
  }, [visible, placed, reduce, progress, tokens]);

  // SRC-6 / SRC-8: a press outside the bar and the view asks to close; it does not reach what is under it (the Menu's
  // MNU-5). The bar itself stays reachable: the catchers surround it. Nothing takes focus, nothing is inert, no scrim.
  const catchers: ViewStyle[] = relative
    ? [
        { position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, relative.y) },
        { position: 'absolute', top: relative.y + relative.height, left: 0, right: 0, bottom: 0 },
        { position: 'absolute', top: relative.y, height: relative.height, left: 0, width: Math.max(0, relative.x) },
        { position: 'absolute', top: relative.y, height: relative.height, left: relative.x + relative.width, right: 0 },
      ]
    : [];
  const grow: ViewStyle = position?.side === 'top' ? { transformOrigin: 'bottom' } : { transformOrigin: 'top' };
  const node = present ? (
    <TanreiThemeScope theme={theme}>
      <View style={FILL} pointerEvents="box-none" testID={part('overlay')}>
        {catchers.map((catcher, index) => (
          <Pressable
            key={index}
            style={catcher}
            onPress={onOutside}
            accessible={false}
            focusable={false}
            importantForAccessibility="no"
            accessibilityElementsHidden
            pointerEvents={visible ? 'auto' : 'none'}
            testID={part(`outside.${index}`)}
          />
        ))}
        <Animated.View
          pointerEvents={visible ? 'box-none' : 'none'}
          style={[
            { position: 'absolute', top: position?.top ?? 0, left: position?.left ?? 0, width: relative?.width },
            { opacity: placed ? progress : 0, transform: [{ scaleY: progress }], ...grow },
          ]}
          testID={part('placement')}
        >
          <DockedSurface tokens={tokens} theme={theme} label={label} maxHeight={position?.maxHeight} onLayout={onSurfaceLayout} testID={part('view')}>
            {children}
          </DockedSurface>
        </Animated.View>
      </View>
    </TanreiThemeScope>
  ) : null;
  const portal = useOverlayPortal('menu', node);
  layerRef.current = portal.layer as { current: Measurable | null } | null;
  const unhosted = visible && !portal.hosted;
  useEffect(() => {
    if (__DEV__ && unhosted) console.warn(`Tanrei: a Search${testID ? ` (testID "${testID}")` : ''} opened its view outside a TanreiProvider, which hosts the overlay layer it is drawn in; it is not drawn.`);
  }, [unhosted, testID]);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The full-screen view (SRC-9, SRC-11, SRC-23): a modal overlay in a transparent Modal.

interface SearchHeaderProps {
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  backLabel: string;
  clearLabel: string;
  clearShown: boolean;
  inputProps: TextInputProps;
  inputStyle: StyleProp<TextStyle>;
  inputRef: RefObject<SearchRef | null>;
  onBack: () => void;
  onClear: () => void;
  testID: string | undefined;
}

function SearchHeader({ tokens, theme, backLabel, clearLabel, clearShown, inputProps, inputStyle, inputRef, onBack, onClear, testID }: SearchHeaderProps) {
  const part = (name: string) => partTestID(testID, name);
  const style = StyleSheet.flatten(inputStyle);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.containerGap, minHeight: tokens.headerHeight, paddingStart: tokens.headerPaddingInline, paddingEnd: tokens.headerPaddingInline }}
      testID={part('header')}
    >
      {/* SRC-11: arrow_back, mirrored in right-to-left layouts. */}
      <IconButton accessibilityLabel={backLabel} onPress={onBack} style={I18nManager.isRTL ? [CENTRED, { transform: [{ scaleX: -1 }] }] : CENTRED} testID={part('back')}>
        arrow_back
      </IconButton>
      <TextInput {...inputProps} ref={inputRef} style={[style, { flex: 1, flexShrink: 1, paddingTop: 0, paddingBottom: 0, paddingStart: 0, paddingEnd: 0, margin: 0 }]} />
      {clearShown ? (
        <IconButton accessibilityLabel={clearLabel} onPress={onClear} style={CENTRED} testID={part('header.clear')}>
          close
        </IconButton>
      ) : null}
    </View>
  );
}

interface FullScreenSurfaceProps {
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  label: string;
  insets: TanreiResolvedInsets;
  keyboard: number;
  header: ReactNode;
  opacity?: Animated.Value;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID: string | undefined;
}

function FullScreenSurface({ tokens, theme, label, insets, keyboard, header, opacity, style, children, testID }: FullScreenSurfaceProps) {
  const part = (name: string) => partTestID(testID, name);
  const fill = theme.resolve(tokens.viewContainerColor);
  const divider = theme.resolve(tokens.dividerColor);
  return (
    // SRC-9 / SRC-24: a modal dialog named by the label, its color to every edge, its content inside the safe area and
    // above the keyboard.
    <Animated.View
      role="dialog"
      accessibilityLabel={label}
      accessibilityViewIsModal
      style={[
        { flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: Math.max(insets.bottom, keyboard) },
        fill.a > 0 ? { backgroundColor: theme.paint(tokens.viewContainerColor) } : null,
        opacity ? { opacity } : null,
        style,
      ]}
      testID={testID}
    >
      {header}
      {divider.a > 0 ? <View style={{ height: tokens.dividerThickness, backgroundColor: theme.paint(tokens.dividerColor) }} testID={part('divider')} {...HIDDEN} /> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}

interface FullScreenModalProps {
  visible: boolean;
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  label: string;
  ownInsets: TanreiInsets | undefined;
  header: ReactNode;
  headerInput: RefObject<SearchRef | null>;
  onBack: () => void;
  children: ReactNode;
  testID: string | undefined;
}

function FullScreenModal({ visible, tokens, theme, label, ownInsets, header, headerInput, onBack, children, testID }: FullScreenModalProps) {
  const reduce = useReduceMotion();
  const insets = useTanreiInsets(ownInsets);
  const keyboard = useKeyboardHeight(visible);
  const [present, setPresent] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) setPresent(true);
    else if (!present) return undefined;
    const target = visible ? 1 : 0;
    if (reduce) {
      progress.setValue(target);
      if (!visible) setPresent(false);
      return undefined;
    }
    // SRC-23: fades in over the open motion, out over the close motion.
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: visible ? tokens.motionOpenDuration : tokens.motionCloseDuration,
      easing: toEasing(visible ? tokens.motionOpenEasing : tokens.motionCloseEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresent(false);
    });
    return () => animation.stop();
  }, [visible, reduce]);

  // SRC-9: focus moves to the header's input as the view opens (not when the motion ends), the caret at the end.
  const moveFocusIn = useCallback(() => {
    const input = headerInput.current;
    if (!input) return;
    input.focus();
    const end = (input as unknown as { props?: { value?: string } }).props?.value?.length;
    (input as unknown as { setSelection?: (start: number, end: number) => void }).setSelection?.(end ?? 0, end ?? 0);
    try {
      AccessibilityInfo.sendAccessibilityEvent(input as never, 'focus');
    } catch {
      // Not a host view: keyboard focus only.
    }
  }, [headerInput]);
  // Once per opening, as soon as the Modal's content exists (`onShow` does the same where the platform calls it).
  const focused = useRef(false);
  useEffect(() => {
    if (!visible) focused.current = false;
    else if (present && !focused.current) {
      focused.current = true;
      moveFocusIn();
    }
  }, [visible, present, moveFocusIn]);

  if (!present) return null;
  return (
    // SRC-9: React Native's Modal is a window of its own — everything outside it is inert and hidden from assistive
    // technology. Transparent, without its own animation, with translucent bars so the view reaches every edge.
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onBack} onShow={moveFocusIn} testID={partTestID(testID, 'modal')}>
      <FullScreenSurface tokens={tokens} theme={theme} label={label} insets={insets} keyboard={keyboard} header={header} opacity={progress} testID={partTestID(testID, 'view')}>
        {children}
      </FullScreenSurface>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The suggestions and the product's content (SRC-14 … SRC-17, SRC-19, SRC-20, SRC-29)

interface SearchContentProps {
  suggestions: readonly SearchSuggestion[];
  active: number;
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  appearance: Record<InteractionState, TanreiSearchConditionStateTokens>;
  positionText: (position: number, count: number) => string;
  scroll: boolean;
  onChoose: (index: number) => void;
  children?: ReactNode;
  testID: string | undefined;
}

function SearchContent({ suggestions, active, tokens, theme, appearance, positionText, scroll, onChoose, children, testID }: SearchContentProps) {
  const part = (name: string) => partTestID(testID, name);
  const iconColumn = suggestions.some((each) => Boolean(each.leadingIcon));
  // SRC-14: an active suggestion partly out of view is scrolled into view.
  const scroller = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const boxes = useRef(new Map<number, { y: number; height: number }>());
  const viewport = useRef({ offset: 0, height: 0 });
  useEffect(() => {
    const box = boxes.current.get(active);
    const { offset, height } = viewport.current;
    if (!box || height <= 0) return;
    let target = offset;
    if (box.y < offset) target = box.y;
    else if (box.y + box.height > offset + height) target = box.y + box.height - height;
    if (target !== offset) {
      scroller.current?.scrollTo({ y: target, animated: false });
      viewport.current.offset = target;
    }
  }, [active]);

  // SRC-29: the product's content gets the headline color as its foreground, inset like the rows; plain text the body style.
  const contentColor = theme.paint(appearance.enabled.suggestionHeadlineColor);
  const own = textContent(children);
  const body =
    children == null ? null : (
      <ContentColorProvider color={contentColor}>
        <View style={{ paddingStart: tokens.suggestionContainerPaddingInline, paddingEnd: tokens.suggestionContainerPaddingInline }} testID={part('content')}>
          {own.textOnly ? (
            <Label style={theme.text('body')} color={contentColor} testID={part('content.text')}>
              {children}
            </Label>
          ) : (
            children
          )}
        </View>
      </ContentColorProvider>
    );
  const rows = suggestions.map((suggestion, index) => (
    <SuggestionRow
      key={`${index}:${suggestion.value}`}
      suggestion={suggestion}
      index={index}
      count={suggestions.length}
      active={index === active}
      iconColumn={iconColumn}
      tokens={tokens}
      theme={theme}
      appearance={appearance}
      positionText={positionText}
      onChoose={onChoose}
      onLayout={(event) => boxes.current.set(index, event.nativeEvent.layout)}
      testID={part(`suggestion.${index}`)}
    />
  ));
  if (!scroll) {
    return (
      <View testID={part('suggestions')}>
        {rows}
        {body}
      </View>
    );
  }
  return (
    // SRC-8: a press on a row never takes the keyboard away from the input.
    <ScrollView
      ref={scroller}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      scrollEventThrottle={16}
      onLayout={(event) => {
        viewport.current.height = event.nativeEvent.layout.height;
      }}
      onScroll={(event) => {
        viewport.current.offset = event.nativeEvent.contentOffset.y;
      }}
      testID={part('suggestions')}
    >
      {rows}
      {body}
    </ScrollView>
  );
}

interface SuggestionRowProps {
  suggestion: SearchSuggestion;
  index: number;
  count: number;
  active: boolean;
  iconColumn: boolean;
  tokens: TanreiSearchTokens;
  theme: TanreiTheme;
  appearance: Record<InteractionState, TanreiSearchConditionStateTokens>;
  positionText: (position: number, count: number) => string;
  onChoose: (index: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  testID: string | undefined;
}

function SuggestionRow({ suggestion, index, count, active, iconColumn, tokens, theme, appearance, positionText, onChoose, onLayout, testID }: SuggestionRowProps) {
  const part = (name: string) => partTestID(testID, name);
  const { cornerSmoothing } = theme.system.shape;
  const { pressedFeedback } = theme.system.behavior;
  const target = theme.system.measure.target.touch;
  // SRC-16: at least the row height and the touch target; rows never reach over each other.
  const minHeight = Math.max(tokens.suggestionContainerHeight, target);
  const interaction = usePressInteraction({
    disabled: false,
    estimate: { width: target, height: minHeight },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    onPress: () => onChoose(index),
    onLayout,
  });
  // SRC-17: pressed > active (the focused tokens) > hovered; a pointer over a row does not make it active.
  const flags = { disabled: false, focused: active, hovered: interaction.hovered };
  const under = resolveInteractionState(flags);
  const state = pressedFeedback === 'none' ? under : resolveInteractionState({ ...flags, pressed: interaction.pressed });
  const layerless = state === 'pressed' && (pressedFeedback === 'dim' || interaction.wave.ripple !== null);
  const current = appearance[state];
  const { opacity } = stateShape(tokens, state);
  const colors = {
    container: theme.resolve(layerless ? appearance[under].suggestionContainerColor : current.suggestionContainerColor),
    icon: theme.resolve(current.suggestionLeadingIconColor),
    headline: theme.resolve(current.suggestionHeadlineColor),
    supporting: theme.resolve(current.suggestionSupportingTextColor),
  };
  const drawn = useStateTransition(
    { ...colors, opacity },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as { container: Moving<string>; icon: Moving<string>; headline: Moving<string>; supporting: Moving<string>; opacity: Moving<number> };
  const shape = tokens.suggestionContainerShape;
  const glyph = iconGlyphStyle(theme.system.icon, tokens.suggestionLeadingIconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const { headline = '', supportingText = '', leadingIcon = '' } = suggestion;
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      // SRC-8 / SRC-14: a row never takes focus; the input keeps it and the arrow keys make a row active.
      focusable={false}
      accessibilityRole="button"
      accessibilityLabel={headline}
      accessibilityHint={supportingText || undefined}
      accessibilityValue={{ text: positionText(index + 1, count) }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.suggestionContainerGap,
          minHeight,
          paddingStart: tokens.suggestionContainerPaddingInline,
          paddingEnd: tokens.suggestionContainerPaddingInline,
          paddingVertical: tokens.suggestionContainerPaddingBlock,
          borderRadius: shape,
          ...borderCurveOf(cornerSmoothing),
        },
        { backgroundColor: fillOf(colors.container, drawn.container), opacity: drawn.opacity },
      ]}
      testID={testID}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={theme.paint(appearance.pressed.suggestionContainerColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {iconColumn ? (
        <View style={{ width: tokens.suggestionLeadingIconSize, alignItems: 'center' }} testID={part('icon-column')}>
          {leadingIcon ? (
            <IconBox
              icon={
                <Animated.Text style={[glyph.style, { color: drawn.icon, textAlign: 'center' }]} allowFontScaling={false} testID={part('leading-icon.glyph')}>
                  {leadingIcon}
                </Animated.Text>
              }
              color={theme.paint(current.suggestionLeadingIconColor)}
              size={tokens.suggestionLeadingIconSize}
              decorative
              testID={part('leading-icon')}
            />
          ) : null}
        </View>
      ) : null}
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Label style={theme.text(tokens.suggestionHeadlineTypescale)} color={drawn.headline} testID={part('headline')}>
          {headline}
        </Label>
        {supportingText ? (
          <Label style={theme.text(tokens.suggestionSupportingTextTypescale)} color={drawn.supporting} testID={part('supporting-text')}>
            {supportingText}
          </Label>
        ) : null}
      </View>
      {/* SRC-17: the active row's focus ring, inside it, never animated. */}
      <FocusRing visible={active} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

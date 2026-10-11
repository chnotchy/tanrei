import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  AccessibilityInfo,
  Animated,
  I18nManager,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type StyleProp,
  type TargetedEvent,
  type TextLayoutEvent,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { TanreiPaint, TanreiTextFieldSize, TanreiTextFieldTokens, TanreiTextFieldVariant, TanreiTextFieldVariantStateTokens } from '../generated/vocabulary';
import { IconBox, drawsColor, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { graphemeCount, limitEdit } from '../primitives/graphemes';
import { resolveInteractionState } from '../primitives/interaction';
import { minimumTargetHitSlop } from '../primitives/minimumTarget';
import { Ring } from '../primitives/Ring';
import { hasAccessibleName, useNamelessReport } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle, type TanreiIconGlyph } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/** Open keys: the core values — `filled`, `outlined` — plus whatever the product's design system added. */
export type TextFieldVariant = TanreiTextFieldVariant;
/** Open keys: the core values — `medium`, `large` — plus whatever the product's design system added. */
export type TextFieldSize = TanreiTextFieldSize;

/** What the value is (TXF-20): it chooses the keyboard, autocorrection, obscured entry and semantics. */
export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
const TYPES: readonly TextFieldType[] = ['text', 'email', 'password', 'number', 'search', 'tel', 'url'];

/** The field's host input: React Native's own `TextInput`, so IME, autofill and selection are the platform's. */
export type TextFieldRef = ComponentRef<typeof TextInput>;

/** What a function icon receives: the icon color of the current state, the size's icon size and the unselected glyph style. */
export interface TextFieldIconProps {
  color: string;
  size: number;
  glyph: TanreiIconGlyph;
}

/** An icon slot: a glyph name of the system's icon font, a function of the color and size, or any node (a product's own `IconButton`). */
export type TextFieldIcon = string | ReactNode | ((props: TextFieldIconProps) => ReactNode);

/** TXF-19: how long typing must pause before the count is announced — one second, a constant of the spec, not a token. */
const COUNT_ANNOUNCEMENT_PAUSE_MS = 1000;

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/** The states a field can be in: no pressed state (a press on a field is not an action). */
type FieldState = 'enabled' | 'hovered' | 'focused' | 'disabled';
/** Which parts of a variant a field is drawn from (TXF-11): its plain parts, or its `error.` parts. A condition, not a state. */
type Look = 'plain' | 'error';

interface FieldPaints {
  container: TanreiPaint;
  indicator: TanreiPaint;
  outline: TanreiPaint;
  label: TanreiPaint;
  input: TanreiPaint;
  placeholder: TanreiPaint;
  affix: TanreiPaint;
  leadingIcon: TanreiPaint;
  trailingIcon: TanreiPaint;
  supporting: TanreiPaint;
  counter: TanreiPaint;
  caret: TanreiPaint;
}

/** The paints of one look in one state. Looks are closed (the spec's error condition), so this switch stays. */
function fieldPaints(t: TanreiTextFieldVariantStateTokens, look: Look): FieldPaints {
  switch (look) {
    case 'plain':
      return {
        container: t.containerColor,
        indicator: t.activeIndicatorColor,
        outline: t.outlineColor,
        label: t.labelColor,
        input: t.inputColor,
        placeholder: t.placeholderColor,
        affix: t.affixColor,
        leadingIcon: t.leadingIconColor,
        trailingIcon: t.trailingIconColor,
        supporting: t.supportingTextColor,
        counter: t.counterColor,
        caret: t.caretColor,
      };
    case 'error':
      return {
        container: t.errorContainerColor,
        indicator: t.errorActiveIndicatorColor,
        outline: t.errorOutlineColor,
        label: t.errorLabelColor,
        input: t.errorInputColor,
        placeholder: t.errorPlaceholderColor,
        affix: t.errorAffixColor,
        leadingIcon: t.errorLeadingIconColor,
        trailingIcon: t.errorTrailingIconColor,
        supporting: t.errorSupportingTextColor,
        counter: t.errorCounterColor,
        caret: t.errorCaretColor,
      };
  }
}

/** The widths of the outline and the active indicator in one state (per-component state tokens). */
function edgeWidths(tokens: TanreiTextFieldTokens, state: FieldState): { outline: number; indicator: number } {
  switch (state) {
    case 'enabled':
      return { outline: tokens.outlineWidth, indicator: tokens.activeIndicatorWidth };
    case 'hovered':
      return { outline: tokens.hoveredOutlineWidth, indicator: tokens.hoveredActiveIndicatorWidth };
    case 'focused':
      return { outline: tokens.focusedOutlineWidth, indicator: tokens.focusedActiveIndicatorWidth };
    case 'disabled':
      return { outline: tokens.disabledOutlineWidth, indicator: tokens.disabledActiveIndicatorWidth };
  }
}

/** TXF-20: the keyboard and entry settings of a type. Types are closed (the spec's list), so this switch stays. */
function typeSettings(type: TextFieldType): Pick<TextInputProps, 'keyboardType' | 'inputMode' | 'autoCapitalize' | 'autoCorrect' | 'secureTextEntry' | 'returnKeyType'> {
  switch (type) {
    case 'text':
      return { keyboardType: 'default', inputMode: 'text' };
    case 'email':
      return { keyboardType: 'email-address', inputMode: 'email', autoCapitalize: 'none', autoCorrect: false };
    case 'password':
      return { keyboardType: 'default', inputMode: 'text', autoCapitalize: 'none', autoCorrect: false, secureTextEntry: true };
    case 'number':
      return { keyboardType: 'decimal-pad', inputMode: 'decimal' };
    case 'search':
      return { keyboardType: 'default', inputMode: 'search', returnKeyType: 'search' };
    case 'tel':
      return { keyboardType: 'phone-pad', inputMode: 'tel' };
    case 'url':
      return { keyboardType: 'url', inputMode: 'url', autoCapitalize: 'none', autoCorrect: false };
  }
}

/** TXF-24: these values are laid out left to right whatever the layout direction. */
const LEFT_TO_RIGHT_VALUES: readonly TextFieldType[] = ['email', 'url', 'tel', 'number', 'password'];

/** TXF-13: how many lines the label takes in one position, and the width of the widest (null before it is measured). */
interface LabelLines {
  count: number;
  widest: number | null;
}
const ONE_LINE: LabelLines = { count: 1, widest: null };
const linesOf = (lines: TextLayoutEvent['nativeEvent']['lines']): LabelLines => ({ count: Math.max(1, lines.length), widest: lines.length ? Math.max(...lines.map((line) => line.width)) : null });
const sameLines = (a: LabelLines, b: LabelLines) => a.count === b.count && a.widest === b.widest;

/** Where a field's container sits in the field (below any room reserved above it for a floated label) and how tall it is. */
export interface TextFieldContainerFrame {
  top: number;
  height: number;
}

/**
 * Package-internal: a component that lays parts beside its text fields (the time picker's separator and period, TMP-10)
 * learns where each field's container is drawn, since a wrapped label or enlarged text grows it (TXF-13, TXF-16). With
 * a `floor`, the field's container is drawn at least that tall (the date picker's range fields, DTP-25); it then reports
 * the height it would have without the floor whenever the floor is what sets it, so a floor never holds itself up.
 */
export interface TextFieldContainerLink {
  report: (frame: TextFieldContainerFrame) => void;
  floor?: number;
}
export const TextFieldContainerFrameContext = createContext<TextFieldContainerLink | null>(null);

/** Two container frames are the same (a field's layout reported again, unchanged). */
const sameFrame = (a: TextFieldContainerFrame | undefined, b: TextFieldContainerFrame) => a !== undefined && a.top === b.top && a.height === b.height;

/** Fields laid side by side with their containers level: where the containers start, how tall the tallest is. */
export interface LevelledContainers<K extends string> {
  /** The value for the key's `TextFieldContainerFrameContext.Provider`. */
  link: (key: K) => TextFieldContainerLink;
  /** The lower of the containers' tops within their fields (0 until one is laid out). */
  top: number;
  /** The tallest container (`restingHeight` until one is laid out, and never less). */
  height: number;
  /** How far down the key's field moves so that its container starts at `top`. */
  offset: (key: K) => number;
}

/**
 * Package-internal: lines up the containers of text fields laid in a row — the time picker's hour and minute (TMP-10),
 * the date picker's start and end (DTP-25). Each field reports its container's frame; every field is moved down to the
 * lowest container top. With `equalHeights`, each container is also drawn at least as tall as the others' (the taller
 * one's height), so the containers span the same rows.
 */
export function useLevelledContainers<K extends string>(keys: readonly K[], restingHeight: number, equalHeights: boolean): LevelledContainers<K> {
  const [frames, setFrames] = useState<Partial<Record<K, TextFieldContainerFrame>>>({});
  const reporters = useRef(new Map<K, (frame: TextFieldContainerFrame) => void>());
  const reporterFor = (key: K) => {
    let reporter = reporters.current.get(key);
    if (!reporter) {
      reporter = (frame: TextFieldContainerFrame) => setFrames((previous) => (sameFrame(previous[key], frame) ? previous : { ...previous, [key]: frame }));
      reporters.current.set(key, reporter);
    }
    return reporter;
  };
  const heightOf = (key: K): number | undefined => (frames[key] as TextFieldContainerFrame | undefined)?.height;
  const floorOf = (key: K): number | undefined => {
    if (!equalHeights) return undefined;
    const others = keys.filter((other) => other !== key).map(heightOf).filter((height): height is number => height !== undefined);
    return others.length > 0 ? Math.max(...others) : undefined;
  };
  // One link object per key and floor, so a field re-renders only when its own floor moves.
  const links = useRef(new Map<K, TextFieldContainerLink>());
  const link = (key: K): TextFieldContainerLink => {
    const floor = floorOf(key);
    const previous = links.current.get(key);
    if (previous && previous.floor === floor) return previous;
    const next: TextFieldContainerLink = floor === undefined ? { report: reporterFor(key) } : { report: reporterFor(key), floor };
    links.current.set(key, next);
    return next;
  };
  const measured = keys.map((key) => frames[key] as TextFieldContainerFrame | undefined).filter((frame): frame is TextFieldContainerFrame => frame !== undefined);
  const top = Math.max(0, ...measured.map((frame) => frame.top));
  const height = Math.max(restingHeight, ...measured.map((frame) => frame.height));
  return { link, top, height, offset: (key: K) => top - ((frames[key] as TextFieldContainerFrame | undefined)?.top ?? 0) };
}

/** A line height as a number (every Tanrei type style has one). */
const lineOf = (style: TextStyle): number => (typeof style.lineHeight === 'number' ? style.lineHeight : 0);

export interface TextFieldProps
  extends Omit<
    TextInputProps,
    | 'style'
    | 'value'
    | 'onChangeText'
    | 'onEndEditing'
    | 'onSubmitEditing'
    | 'multiline'
    | 'maxLength'
    | 'readOnly'
    | 'editable'
    | 'placeholder'
    | 'placeholderTextColor'
    | 'autoComplete'
    | 'secureTextEntry'
    | 'keyboardType'
    | 'inputMode'
    | 'numberOfLines'
    | 'cursorColor'
    | 'selectionColor'
    | 'selectionHandleColor'
    | 'submitBehavior'
    | 'accessibilityLabel'
    | 'accessibilityHint'
  > {
  /** `outlined` (a border) or `filled` (a tinted box and a bottom line). Use one per form. Unknown values render as `outlined` (TXF-9). */
  variant?: TextFieldVariant;
  /** Minimum height of a single-line field (36 / 40 in the default system). Unknown values render as `medium` (TXF-9). */
  size?: TextFieldSize;
  /** What the value is: the keyboard, autocorrection, obscured entry and semantics (TXF-20). The value is a string for every type. */
  type?: TextFieldType;
  /** The text in the field. With it the field is controlled: set it from `onChangeText`. Without it the field keeps its own. */
  value?: string;
  /** Names the field, visibly and to assistive technology (TXF-23). Required. */
  label?: string;
  /** Does not draw the label, which stays the accessible name. */
  labelHidden?: boolean;
  /** A hint shown while the value is empty and the label is floated or hidden (TXF-15). Never a label. */
  placeholder?: string;
  /** Help below the field, and the input's accessibility hint (its description). */
  supportingText?: string;
  /** Shown in place of `supportingText` while `error` is true. */
  errorText?: string;
  /** The error condition: the field draws its error parts (TXF-11). Validation is the product's. */
  error?: boolean;
  /** Not focusable, not editable, no events (TXF-5). */
  disabled?: boolean;
  /** Focusable, selectable and copyable, not editable (TXF-10). */
  readOnly?: boolean;
  /** The field is required. It draws no mark: word the label. */
  required?: boolean;
  /** Accepts line breaks and grows from `minRows` to `maxRows` lines (TXF-17). Ignored for `password`. */
  multiline?: boolean;
  /** Lines shown by an empty multi-line field. */
  minRows?: number;
  /** Lines a multi-line field grows to before it scrolls; 0 grows without limit. */
  maxRows?: number;
  /** The most user-perceived characters the user can enter (TXF-18); 0 is no limit. A value the product sets is never shortened. */
  maxLength?: number;
  /** Shows the character count (and `maxLength`) at the end of the supporting row (TXF-19). */
  counter?: boolean;
  /** Fixed text before the value, not part of it (the spec's `prefixText`). */
  prefix?: string;
  /** Fixed text after the value, not part of it (the spec's `suffixText`). */
  suffix?: string;
  /** The autofill hint, an HTML autofill field name (`email`, `current-password`, `one-time-code`, …; TXF-21). */
  autoComplete?: string;
  /** An icon at the start of the field. */
  leadingIcon?: TextFieldIcon;
  /** An icon at the end of the field, or the product's own `IconButton` (clear, reveal password). */
  trailingIcon?: TextFieldIcon;
  /** The user changed the value (the spec's `input`): the new value. Not called when the product sets `value`. */
  onChangeText?: (value: string) => void;
  /** The user committed a changed value (the spec's `change`): focus left, or the action key was pressed. */
  onEndEditing?: (value: string) => void;
  /** The keyboard's action key was pressed in a single-line field (the spec's `action`), after any `onEndEditing` it caused. */
  onSubmitEditing?: (value: string) => void;
  /** Layout overrides for the field (margins, width, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the `TextInput` (`focus()`, `blur()`, `clear()`). */
  ref?: Ref<TextFieldRef>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei TextField — spec: `specs/text-field.spec.json`.
 * Anatomy: host column > container (the pressable box: fill, outline or active indicator, [leading icon], input line
 * with [prefix] input [suffix], [trailing icon], the floating label) > supporting row ([supporting or error text],
 * [counter]). Text is edited in React Native's own `TextInput`. Every part is drawn from the tokens of
 * the state the field is in (focused > hovered; disabled), of its plain or its error parts.
 */
export function TextField({
  variant = 'outlined',
  size = 'medium',
  type = 'text',
  value,
  defaultValue,
  label = '',
  labelHidden = false,
  placeholder = '',
  supportingText = '',
  errorText = '',
  error = false,
  disabled = false,
  readOnly = false,
  required = false,
  multiline = false,
  minRows = 2,
  maxRows = 0,
  maxLength = 0,
  counter = false,
  prefix = '',
  suffix = '',
  autoComplete = '',
  leadingIcon,
  trailingIcon,
  onChangeText,
  onEndEditing,
  onSubmitEditing,
  onFocus,
  onBlur,
  style,
  testID,
  accessibilityState,
  ref,
  ...rest
}: TextFieldProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.textField;
  // TXF-9: variant and size are open keys; type is a closed list. An unknown value renders as the default, and
  // development builds report it.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'TextField size');
  const appearance = lookupValue(tokens.variants, variant, 'outlined', 'TextField variant');
  const kind = closedValue(TYPES, type, 'text', 'TextField type');
  // TXF-17: a password stays single-line.
  const lines = multiline && kind !== 'password';
  useEffect(() => {
    if (__DEV__ && multiline && kind === 'password') console.warn(`Tanrei: a TextField${testID ? ` (testID "${testID}")` : ''} is a multi-line password; a password stays single-line.`);
  }, [multiline, kind, testID]);

  // TXF-23: the label is the name, drawn or not. Without one the field still renders; development builds say so.
  useNamelessReport('TextField', hasAccessibleName(label, rest), testID);
  const labelDrawn = !labelHidden && label.trim() !== '';

  // The value: controlled when the product passes one (TXF-1: a value it sets emits nothing), else the field's own.
  const [own, setOwn] = useState(defaultValue ?? '');
  const text = value ?? own;
  const current = useRef(text);
  current.current = text;
  // A refused or shortened edit leaves the native text ahead of the value: a render hands the value back to it.
  const [, rerender] = useState(0);

  // TXF-6: focus by any means is the focused state (a field shows where typing goes); hover from the container.
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const state = resolveInteractionState({ disabled, focused: focused && !disabled, hovered }) as FieldState;
  const look: Look = error ? 'error' : 'plain';
  const paints = fieldPaints(appearance[state], look);
  const { opacity, shape } = stateShape(tokens, state);
  const widths = edgeWidths(tokens, state);

  // Which structure the variant has is read from its tokens, never from its name (variants are open): a variant whose
  // resting outline draws is bordered — the label floats onto the border, which opens a gap for it — and one without
  // is filled — the label floats inside the box, which is taller while it draws a label (TXF-13, TXF-16).
  const bordered = theme.resolve(appearance.enabled.outlineColor).a > 0;
  const tall = labelDrawn && !bordered;

  const resolved = {
    container: theme.resolve(paints.container),
    outline: theme.resolve(paints.outline),
    indicator: theme.resolve(paints.indicator),
    label: theme.resolve(paints.label),
    input: theme.resolve(paints.input),
    affix: theme.resolve(paints.affix),
    leadingIcon: theme.resolve(paints.leadingIcon),
    trailingIcon: theme.resolve(paints.trailingIcon),
    supporting: theme.resolve(paints.supporting),
    counter: theme.resolve(paints.counter),
  };
  // TXF-14: colors, widths and opacity move over the state motion (at once where motion is reduced).
  const drawn = useStateTransition(
    { ...resolved, opacity, outlineWidth: widths.outline, indicatorWidth: widths.indicator },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
  );

  // TXF-13: floated while focused or filled (autofill fills it too).
  const floated = focused || text !== '';
  const { fontScale } = useWindowDimensions();
  const inputStyle = theme.text(dimensions.inputTypescale);
  const restingStyle = theme.text(dimensions.labelTypescale);
  const floatedStyle = theme.text(dimensions.labelFloatedTypescale);
  const inputLine = lineOf(inputStyle);
  const floatedLine = lineOf(floatedStyle);
  const restingLine = lineOf(restingStyle);

  // TXF-13: a label that does not fit on one line in the width it is given wraps, resting and floated, and the field
  // grows to hold it. React Native lays text out natively: once the drawn label reports a second line, two copies that
  // are not drawn measure it in each position (so a field whose label fits renders nothing more), and their lines
  // decide the geometry below.
  const [wraps, setWraps] = useState(false);
  const [measured, setMeasured] = useState<{ resting: LabelLines; floated: LabelLines }>({ resting: ONE_LINE, floated: ONE_LINE });
  const onLabelLayout = useCallback((event: TextLayoutEvent) => {
    if (event.nativeEvent.lines.length > 1) setWraps(true);
  }, []);
  const measureIn = useCallback(
    (position: 'resting' | 'floated') => (event: TextLayoutEvent) => {
      const next = linesOf(event.nativeEvent.lines);
      setMeasured((previous) => (sameLines(previous[position], next) ? previous : { ...previous, [position]: next }));
    },
    [],
  );
  const labelLines = wraps && labelDrawn ? measured : { resting: ONE_LINE, floated: ONE_LINE };
  const restingCount = labelLines.resting.count;
  const floatedCount = labelLines.floated.count;

  // TXF-16: heights are minimums. A filled field that draws its label holds its floated label's lines above the input line.
  const padBlock = tall ? dimensions.containerPaddingBlockWithLabel : dimensions.containerPaddingBlock;
  const minHeight = tall ? 2 * dimensions.containerPaddingBlockWithLabel + floatedCount * floatedLine + inputLine : dimensions.containerHeight;
  const rowsShown = lines ? Math.max(1, minRows) : 1;
  const maxShown = lines && maxRows > 0 ? Math.max(rowsShown, maxRows) : 0;
  const labelSlot = tall ? floatedCount * floatedLine * fontScale : 0;
  const bodyHeight = labelSlot + rowsShown * inputLine * fontScale;
  // TXF-13: a resting label that wraps does so inside the container, which grows to hold its lines — centred in a
  // single-line field, from the first line of a multi-line one (TXF-17).
  const restingBlock = restingCount * restingLine * fontScale;
  const firstLineRestingTop = padBlock + labelSlot + ((inputLine - restingLine) * fontScale) / 2;
  const restingNeed = restingCount > 1 ? (lines ? firstLineRestingTop + restingBlock + padBlock : 2 * padBlock + restingBlock) : 0;
  // DTP-25: a field laid beside a taller one is drawn as tall as it (package-internal; never set by a product).
  const containerLink = useContext(TextFieldContainerFrameContext);
  const floor = containerLink?.floor ?? 0;
  const ownHeight = Math.max(minHeight, restingNeed, 2 * padBlock + bodyHeight);
  const boxMinHeight = Math.max(minHeight, restingNeed, floor);
  // Where the body starts: the input line is centred in a single-line field, at the top of a multi-line one.
  const bodyTop = lines ? padBlock : Math.max(padBlock, (boxMinHeight - bodyHeight) / 2);
  const firstLineTop = bodyTop + labelSlot;
  // TXF-13: an outlined field's floated label sits on the top edge with its last line centred on it; the lines above
  // that take room reserved above the container.
  const above = bordered && labelDrawn ? (floatedCount - 1) * floatedLine * fontScale : 0;

  const startPadding = leadingIcon != null ? dimensions.containerPaddingInlineWithIcon : dimensions.containerPaddingInline;
  const endPadding = trailingIcon != null ? dimensions.containerPaddingInlineWithIcon : dimensions.containerPaddingInline;
  const iconReach = dimensions.iconSize + dimensions.containerGap;
  const textStart = startPadding + (leadingIcon != null ? iconReach : 0);
  const textEnd = endPadding + (trailingIcon != null ? iconReach : 0);

  // TXF-13 / TXF-14: the label rests in the input line, and floats to the top of a filled box or onto a border's top
  // edge; its position and size move over the label motion.
  // A single-line filled field rests its label centred in the container (not in the input line below the floated-label
  // band); an outlined field's centre is its input line, and a multi-line field aligns it with the first line (TXF-17).
  const fieldHeight = Math.max(boxMinHeight, 2 * padBlock + bodyHeight);
  const restingTop = (tall || restingCount > 1) && !lines ? (fieldHeight - restingBlock) / 2 : firstLineTop + ((inputLine - restingLine) * fontScale) / 2;
  const restingGeometry = { top: restingTop, start: textStart, size: restingStyle.fontSize ?? 0, line: restingLine, gap: 0 };
  const floatedGeometry = {
    top: bordered ? (tokens.outlineWidth - floatedLine * fontScale) / 2 - above : bodyTop,
    start: bordered ? dimensions.containerPaddingInline : textStart,
    size: floatedStyle.fontSize ?? 0,
    line: floatedLine,
    gap: 1,
  };
  const geometry = useStateTransition(floated ? floatedGeometry : restingGeometry, { duration: tokens.motionLabelDuration, easing: tokens.motionLabelEasing });

  // TXF-15: the placeholder and the affixes appear only when the label cannot collide with them.
  const clear = floated || !labelDrawn;
  const shownPlaceholder = text === '' && clear ? placeholder : '';
  const affixesShown = clear;

  // TXF-11 / TXF-19: the shown help text and the count are the input's description.
  const shownHelp = error && errorText ? errorText : supportingText;
  const count = graphemeCount(text);
  const counterText = counter ? (maxLength > 0 ? `${count}/${maxLength}` : `${count}`) : '';
  // TXF-15: while they are shown, the prefix and suffix are read with the value (a currency, a unit).
  const affixes = affixesShown ? [prefix, suffix].filter(Boolean).join(' ') : '';
  const description = [affixes, shownHelp, counterText].filter(Boolean).join(', ');

  // TXF-12: an error that appears (or changes) while the field has focus is announced once, politely.
  const announced = useRef({ error, errorText });
  useEffect(() => {
    const before = announced.current;
    announced.current = { error, errorText };
    const appeared = error && (!before.error || before.errorText !== errorText);
    if (appeared && focused && shownHelp) AccessibilityInfo.announceForAccessibilityWithOptions(shownHelp, { queue: true });
  }, [error, errorText, focused, shownHelp]);

  // TXF-19: the count is announced once typing pauses for a second — never on every keystroke.
  const countTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterTextRef = useRef(counterText);
  counterTextRef.current = counterText;
  useEffect(
    () => () => {
      if (countTimer.current) clearTimeout(countTimer.current);
    },
    [],
  );

  // TXF-2: `change` compares with the value last committed — at focus, or at the last change.
  const committed = useRef(text);
  const inert = disabled || readOnly;
  const commit = useCallback(() => {
    if (disabled || current.current === committed.current) return;
    committed.current = current.current;
    onEndEditing?.(current.current);
  }, [disabled, onEndEditing]);

  const handleChangeText = useCallback(
    (next: string) => {
      // TXF-5 / TXF-10: a field that cannot be edited emits nothing (the native element should not change either).
      if (inert) {
        rerender((n) => n + 1);
        return;
      }
      // TXF-18: the limit counts user-perceived characters; an edit past it is shortened or refused.
      const limited = limitEdit(current.current, next, maxLength);
      if (limited !== next) rerender((n) => n + 1);
      if (limited === current.current) return;
      current.current = limited;
      if (value === undefined) setOwn(limited);
      // TXF-1: once per change, with the new value.
      onChangeText?.(limited);
      if (counter) {
        if (countTimer.current) clearTimeout(countTimer.current);
        countTimer.current = setTimeout(() => {
          countTimer.current = null;
          AccessibilityInfo.announceForAccessibilityWithOptions(counterTextRef.current, { queue: true });
        }, COUNT_ANNOUNCEMENT_PAUSE_MS);
      }
    },
    [inert, maxLength, value, onChangeText, counter],
  );
  const handleFocus = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      committed.current = current.current;
      setFocused(true);
      onFocus?.(event as never);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      setFocused(false);
      commit();
      onBlur?.(event as never);
    },
    [commit, onBlur],
  );
  const handleEndEditing = useCallback(() => commit(), [commit]);
  // TXF-3: the action key in a single-line field commits, then emits action; in a multi-line field it is a line break.
  const handleSubmitEditing = useCallback(() => {
    if (disabled || lines) return;
    commit();
    onSubmitEditing?.(current.current);
  }, [disabled, lines, commit, onSubmitEditing]);

  // TXF-8: a press anywhere on the field focuses the input; there is no press answer.
  const input = useRef<TextFieldRef | null>(null);
  const setInput = useCallback(
    (node: TextFieldRef | null) => {
      input.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );
  const focusInput = useCallback(() => {
    if (!disabled) input.current?.focus();
  }, [disabled]);
  // TXF-8: the hit area reaches the touch target vertically; the field's width is the layout's.
  const vertical = minimumTargetHitSlop({ width: theme.system.measure.target.touch, height: boxMinHeight }, theme.system.measure.target.touch);

  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);

  // TXF-16: an outlined field rounds four corners; a filled one its top corners, and its bottom ones by shape-bottom.
  const bottomShape = bordered ? shape : tokens.containerShapeBottom;
  const corners: ViewStyle = { borderTopStartRadius: shape, borderTopEndRadius: shape, borderBottomStartRadius: bottomShape, borderBottomEndRadius: bottomShape, ...borderCurveOf(cornerSmoothing) };
  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: lines ? 'flex-start' : 'center',
    gap: dimensions.containerGap,
    minHeight: boxMinHeight,
    ...(above > 0 ? { marginTop: above } : null),
    paddingStart: startPadding,
    paddingEnd: endPadding,
    paddingVertical: padBlock,
    ...corners,
  };

  // TXF-22: icons in the unselected glyph style at the size's icon size; in a multi-line field, beside the first line.
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const iconOffset: ViewStyle = lines ? { marginTop: Math.max(0, labelSlot + (inputLine * fontScale - dimensions.iconSize) / 2) } : {};
  const icon = (slot: TextFieldIcon | undefined, color: Moving<string>, paint: TanreiPaint, name: string) => {
    if (slot == null || slot === false) return null;
    if (typeof slot === 'string' || typeof slot === 'function') {
      const glyphNode =
        typeof slot === 'function' ? (
          slot({ color: theme.paint(paint), size: dimensions.iconSize, glyph })
        ) : (
          <Animated.Text style={[glyph.style, { color, textAlign: 'center' }]} allowFontScaling={false} testID={part(`${name}.glyph`)}>
            {slot}
          </Animated.Text>
        );
      return (
        <View style={iconOffset}>
          <IconBox icon={glyphNode} color={theme.paint(paint)} size={dimensions.iconSize} decorative testID={part(name)} />
        </View>
      );
    }
    // A node — the product's own icon button — keeps its tokens and its semantics, and is its own focus stop.
    return (
      <View style={iconOffset} testID={part(name)}>
        {slot}
      </View>
    );
  };

  // TXF-24: the values of these types are laid out left to right, aligned to the field's start edge.
  const direction: TextStyle = LEFT_TO_RIGHT_VALUES.includes(kind) ? { writingDirection: 'ltr', textAlign: I18nManager.isRTL ? 'right' : 'left' } : {};
  const rowHeight = inputLine * fontScale;
  const inputBox: TextStyle = lines
    ? { minHeight: rowsShown * rowHeight, ...(maxShown > 0 ? { maxHeight: maxShown * rowHeight } : null), textAlignVertical: 'top' }
    : { minHeight: inputLine };
  const affix = (content: string, name: string) =>
    affixesShown && content ? (
      <Animated.Text {...HIDDEN} style={[inputStyle, { color: drawn.affix }]} allowFontScaling testID={part(name)}>
        {content}
      </Animated.Text>
    ) : null;

  // The edge: a border (with a gap for a floated label while it draws one) or an active indicator; a part whose paint
  // resolves to nothing has no node.
  const outlineDraws = drawsColor(resolved.outline, drawn.outline);
  const indicatorDraws = drawsColor(resolved.indicator, drawn.indicator);
  const edgeReach = Math.max(shape, tokens.outlineWidth, tokens.hoveredOutlineWidth, tokens.focusedOutlineWidth, tokens.disabledOutlineWidth);
  const stroke = { borderColor: drawn.outline };
  // The gap opens notch-padding before the floated label's start and after its end; where the corner reaches further
  // than that, the gap starts at the corner and its leading padding shrinks, so it stays centred on the label.
  const notchLead = Math.max(0, dimensions.containerPaddingInline - tokens.outlineNotchPadding - edgeReach);
  const notchStartPadding = Math.max(0, dimensions.containerPaddingInline - edgeReach - notchLead);
  const outline = !outlineDraws ? null : !labelDrawn ? (
    <Ring placement="inside" width={widths.outline} color={drawn.outline} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} />
  ) : (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }} {...HIDDEN} testID={part('outline')}>
      <Animated.View
        style={[
          { position: 'absolute', top: edgeReach, right: 0, bottom: 0, left: 0, borderTopWidth: 0, borderBottomStartRadius: shape, borderBottomEndRadius: shape, ...borderCurveOf(cornerSmoothing) },
          stroke,
          { borderStartWidth: drawn.outlineWidth, borderEndWidth: drawn.outlineWidth, borderBottomWidth: drawn.outlineWidth },
        ]}
      />
      <View style={{ flexDirection: 'row', height: edgeReach }}>
        <Animated.View style={[{ width: edgeReach, height: edgeReach, borderTopStartRadius: shape, ...borderCurveOf(cornerSmoothing) }, stroke, { borderTopWidth: drawn.outlineWidth, borderStartWidth: drawn.outlineWidth }]} />
        <Animated.View style={[{ width: notchLead }, stroke, { borderTopWidth: drawn.outlineWidth }]} />
        {/* The gap is as wide as the floated label plus the notch padding on each side; closed, a line bridges it. */}
        <View style={{ height: edgeReach, overflow: 'hidden', paddingStart: notchStartPadding, paddingEnd: tokens.outlineNotchPadding, flexShrink: 1 }} testID={part('outline.gap')}>
          {/* TXF-13: a floated label that wraps opens the gap by its widest line. */}
          {floatedCount > 1 && labelLines.floated.widest !== null ? (
            <View style={{ width: labelLines.floated.widest }} testID={part('outline.gap.label')} />
          ) : (
            <Text style={[floatedStyle, { opacity: 0 }]} allowFontScaling numberOfLines={1}>
              {label}
            </Text>
          )}
          {geometry.gap === 1 ? null : (
            <Animated.View
              style={{ position: 'absolute', top: 0, start: 0, end: 0, height: drawn.outlineWidth, backgroundColor: drawn.outline, transform: [{ scaleX: typeof geometry.gap === 'number' ? 1 - geometry.gap : geometry.gap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }] }}
              testID={part('outline.bridge')}
            />
          )}
        </View>
        <Animated.View style={[{ flex: 1 }, stroke, { borderTopWidth: drawn.outlineWidth }]} />
        <Animated.View style={[{ width: edgeReach, height: edgeReach, borderTopEndRadius: shape, ...borderCurveOf(cornerSmoothing) }, stroke, { borderTopWidth: drawn.outlineWidth, borderEndWidth: drawn.outlineWidth }]} />
      </View>
    </View>
  );
  const indicator = indicatorDraws ? (
    <Animated.View
      style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', ...corners }, { borderColor: drawn.indicator, borderBottomWidth: drawn.indicatorWidth }]}
      {...HIDDEN}
      testID={part('active-indicator')}
    />
  ) : null;

  // TXF-7: the focused edge is the focus indicator — no focus ring; under `glow` the glow is drawn around the box too
  // (where the renderer has `boxShadow`; without it the edge alone shows focus).
  const glow = focused && !disabled && theme.system.behavior.focusStyle === 'glow' && supportsBoxShadow() ? <FocusRing visible radius={shape} cornerSmoothing={cornerSmoothing} testID={part('glow')} /> : null;

  const settings = typeSettings(kind);
  // TXF-6: selected text is highlighted in comp.text-field.selection.color. Android colors the highlight, the caret
  // and the handles apart: the highlight takes the token, the caret and its handles the caret color. iOS has ONE tint
  // for the caret and the highlight (`selectionColor`): there it stays the caret color, which must stay visible in
  // every field, and the highlight is a tint of it drawn by the OS.
  const caret = theme.paint(paints.caret);
  const selectionColors: Pick<TextInputProps, 'cursorColor' | 'selectionColor' | 'selectionHandleColor'> =
    Platform.OS === 'ios' ? { cursorColor: caret, selectionColor: caret } : { cursorColor: caret, selectionColor: theme.paint(tokens.selectionColor), selectionHandleColor: caret };
  const a11yState = { ...accessibilityState, disabled };

  // TXF-13: the label's lines in each position, measured at the width it is drawn in there; never drawn.
  const measurer = (position: 'resting' | 'floated') => (
    <Text
      {...HIDDEN}
      allowFontScaling
      onTextLayout={measureIn(position)}
      testID={part(`label.measure.${position}`)}
      style={[position === 'floated' ? floatedStyle : restingStyle, { position: 'absolute', top: 0, start: position === 'floated' ? floatedGeometry.start : textStart, end: textEnd, opacity: 0, pointerEvents: 'none' }]}
    >
      {label}
    </Text>
  );
  const reportFrame = containerLink?.report;
  const onContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { y: number; height: number } } }) => {
      const { y, height } = event.nativeEvent.layout;
      // Held up by the floor, the container reports its own height instead, so the floor can come down again.
      reportFrame?.({ top: y, height: floor > 0 && height <= floor ? ownHeight : height });
    },
    [reportFrame, floor, ownHeight],
  );

  return (
    <View style={style} testID={testID}>
      <AnimatedPressable
        testID={part('container')}
        accessible={false}
        focusable={false}
        disabled={disabled}
        onPress={focusInput}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onLayout={onContainerLayout}
        hitSlop={{ ...vertical, left: 0, right: 0 }}
        style={[container, { backgroundColor: fillOf(resolved.container, drawn.container), opacity: drawn.opacity }]}
      >
        {indicator}
        {outline}
        {icon(leadingIcon, drawn.leadingIcon, paints.leadingIcon, 'leading-icon')}
        <View style={{ flex: 1, flexShrink: 1 }}>
          {tall ? <View style={{ height: labelSlot }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: lines ? 'flex-start' : 'center', gap: tokens.affixGap }}>
            {affix(prefix, 'prefix')}
            <AnimatedTextInput
              {...rest}
              ref={setInput}
              testID={part('input')}
              value={text}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onEndEditing={handleEndEditing}
              onSubmitEditing={handleSubmitEditing}
              {...settings}
              autoComplete={(autoComplete || undefined) as TextInputProps['autoComplete']}
              readOnly={inert}
              focusable={!disabled}
              multiline={lines}
              submitBehavior={lines ? 'newline' : 'blurAndSubmit'}
              placeholder={shownPlaceholder}
              placeholderTextColor={theme.paint(paints.placeholder)}
              {...selectionColors}
              allowFontScaling
              accessibilityLabel={label}
              accessibilityHint={description || undefined}
              accessibilityState={a11yState}
              {...(kind === 'search' ? { accessibilityRole: 'search' as const } : null)}
              style={[inputStyle, { flex: 1, flexShrink: 1, paddingTop: 0, paddingBottom: 0, paddingStart: 0, paddingEnd: 0, margin: 0 }, inputBox, direction, { color: drawn.input }]}
            />
            {affix(suffix, 'suffix')}
          </View>
        </View>
        {icon(trailingIcon, drawn.trailingIcon, paints.trailingIcon, 'trailing-icon')}
        {labelDrawn ? (
          <Animated.Text
            {...HIDDEN}
            allowFontScaling
            onTextLayout={onLabelLayout}
            testID={part('label')}
            style={[
              floated ? floatedStyle : restingStyle,
              { position: 'absolute', top: geometry.top, start: geometry.start, end: textEnd, fontSize: geometry.size, lineHeight: geometry.line, color: drawn.label, pointerEvents: 'none' },
            ]}
          >
            {label}
          </Animated.Text>
        ) : null}
        {labelDrawn && wraps ? measurer('resting') : null}
        {labelDrawn && wraps ? measurer('floated') : null}
        {glow}
      </AnimatedPressable>
      {shownHelp || counter ? (
        <View
          {...HIDDEN}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: dimensions.containerGap, marginTop: tokens.supportingTextGap, paddingStart: textStart, paddingEnd: endPadding }}
          testID={part('supporting-row')}
        >
          <Animated.Text style={[theme.text(tokens.supportingTextTypescale), { flex: 1, flexShrink: 1, color: drawn.supporting }]} allowFontScaling testID={part('supporting-text')}>
            {shownHelp}
          </Animated.Text>
          {counter ? (
            <Animated.Text style={[theme.text(tokens.supportingTextTypescale), { flexShrink: 0, color: drawn.counter }]} allowFontScaling numberOfLines={1} testID={part('counter')}>
              {counterText}
            </Animated.Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

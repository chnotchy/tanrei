import { isValidElement, useCallback, useEffect, useMemo, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Animated, Pressable, Text, View, type GestureResponderEvent, type Insets, type NativeSyntheticEvent, type StyleProp, type TargetedEvent, type TextLayoutEvent, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiCoreListCondition, TanreiListConditionStateTokens, TanreiListTokens } from '../generated/vocabulary';
import { CheckMark } from '../primitives/checkMark';
import { IconBox, Label, drawsColor, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { useItemRow } from '../primitives/itemRow';
import type { PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { useRovingFocus, type FocusableNode, type KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { ContentColorProvider } from '../theme/contentColor';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/** Whether people choose items (the spec's `selection`): `none` shows or opens things; `single` and `multiple` make a listbox. */
export type ListSelectionMode = 'none' | 'single' | 'multiple';
const SELECTION_MODES: readonly ListSelectionMode[] = ['none', 'single', 'multiple'];

/** How an item's leading slot is framed: `avatar` a round box, `image` a larger rounded square, `none` not drawn. */
export type ListLeadingMedia = 'none' | 'avatar' | 'image';
const LEADING_MEDIA: readonly ListLeadingMedia[] = ['none', 'avatar', 'image'];

/** What an icon given as a function receives: the icon color of the item's condition and state, the size and the glyph. */
export type ListItemIconProps = GlyphSlotProps;

/**
 * One row of a `List` — the spec's item kind `list-item`: the element type of the list's `items`. Static
 * (no `onPress`, in a list whose `selectionMode` is `none`), interactive (`onPress`) or, in a selectable list, an
 * option chosen by its `value`.
 */
export interface ListItem {
  /** The item's main text and its accessible name. Required: an empty headline still renders, and development builds report it. */
  headline: string;
  /** A short line above the headline: a category, a source. */
  overline?: string;
  /** Text below the headline. One line makes a two-line item, two or more a three-line item. */
  supportingText?: string;
  /** The spec's `supportingMaxLines`: the lines of supporting text shown before an ellipsis; 0 (the default) shows all. The full text is still the item's description. */
  supportingNumberOfLines?: number;
  /** A short value at the end of the row: a count, a time, a size. */
  trailingText?: string;
  /** An icon at the start of the row: a glyph name of the system's icon font (`'inbox'`), a function or a node. Empty: nothing, and no space. */
  leadingIcon?: GlyphSlot<ListItemIconProps>;
  /** An icon at the end of the row (a chevron that says the row opens something). */
  trailingIcon?: GlyphSlot<ListItemIconProps>;
  /** Frames `leading` as an avatar or an image, in place of `leadingIcon`. Unknown values render as `none` (LST-7). */
  leadingMedia?: ListLeadingMedia;
  /** The avatar's or the image's content (an `Image`, a monogram): drawn only while `leadingMedia` is `avatar` or `image`. A string is drawn as a monogram. */
  leading?: ReactNode;
  /** A control of the product's own at the end of a STATIC item (a switch, a checkbox, an icon button); it keeps its own tokens, semantics and focus stop. */
  trailing?: ReactNode;
  /** The spec's `interactive` and its `click`: makes the item ONE pressable action. Ignored in a selectable list, where every item is an option. */
  onPress?: (event: GestureResponderEvent) => void;
  /** Identifies an option: the list's `value` (single) or `values` (multiple) select it, and `onSelectionChange` carries it. Unique within the list. */
  value?: string;
  /** Prevents activation; the arrow keys still reach it. Ignored for a static item. */
  disabled?: boolean;
  /** Draws a hairline along the bottom of the item, from the text's start to the row's end. */
  divider?: boolean;
  /** The row's test id (default: `<list testID>.item.<index>`); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** The list's host: a `View`. */
export type ListRef = ComponentRef<typeof View>;

interface ListBaseProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The items, in order. */
  items: readonly ListItem[];
  /** The spec's `label`: the list's accessible name — what the items are. Required when `selectionMode` is `single` or `multiple`. */
  accessibilityLabel?: string;
  /** How an item's position is announced (LST-12). Default: `"2 of 3"` (English). */
  positionText?: (position: number, count: number) => string;
  /** Layout of the column (margins, width). The list draws nothing and adds no space around its items. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ListRef>;
}

/**
 * The selection: React Native's idiom is a controlled value — the caller moves `value` or `values` from
 * `onSelectionChange` (the spec's `change`), which receives the selection after the change.
 */
export type ListProps = ListBaseProps &
  (
    | { selectionMode?: 'none'; value?: undefined; values?: undefined; onSelectionChange?: undefined }
    | { selectionMode: 'single'; value?: string | null; values?: undefined; onSelectionChange?: (value: string) => void }
    | { selectionMode: 'multiple'; values?: readonly string[]; value?: undefined; onSelectionChange?: (values: string[]) => void }
  );

/** The props as the implementation reads them (a selection mode may be a value the list does not define, LST-7). */
type ListInput = ListBaseProps & { selectionMode?: string; value?: string | null; values?: readonly string[]; onSelectionChange?: ((value: string) => void) | ((values: string[]) => void) };

const NO_VALUES: readonly string[] = [];
/** Stacked rows never extend a hit area over each other (LST-5): a row that is too short grows instead. */
const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** An English default; a product in another language passes its own `positionText`. */
const englishPosition = (position: number, count: number) => `${position} of ${count}`;

/** Is an item an option or an interactive item — something that takes focus and answers presses? */
const pressableItem = (item: ListItem, selectable: boolean) => selectable || item.onPress != null;

/**
 * Tanrei List — spec: `specs/list.spec.json`.
 * Anatomy: list (a column that draws nothing) > per item: [the row: container > leading icon or media, text column
 * (overline, headline, supporting text), trailing text, trailing icon, trailing control, mark] + [divider].
 * A static item is a `View` inside its list item; an interactive item is ONE `Pressable` with the button role; an option
 * (selectable list) is ONE `Pressable` with the option role and its selected state. The list owns the selection and
 * the keyboard: one tab stop, Up / Down Arrow, Home / End and typeahead. It never scrolls or virtualizes: for long data
 * the product builds its own lazy list.
 */
export function List(props: ListProps) {
  const {
    items,
    selectionMode = 'none',
    value = null,
    values = NO_VALUES,
    onSelectionChange,
    accessibilityLabel,
    positionText = englishPosition,
    testID,
    style,
    ref,
    ...rest
  } = props as ListInput;
  const theme = useTanrei();
  const tokens = theme.system.components.list;
  // LST-7: a selection mode the list does not define renders as `none`, and development builds report it.
  const mode = closedValue(SELECTION_MODES, selectionMode, 'none', 'List selectionMode');
  const selectable = mode !== 'none';

  // LST-26: an option is selected while the list's value (single) or values (multiple) hold its value.
  const chosen = useMemo(() => new Set(mode === 'single' ? (value != null ? [value] : []) : mode === 'multiple' ? values : []), [mode, value, values]);
  const isSelected = (item: ListItem) => selectable && item.value != null && item.value !== '' && chosen.has(item.value);

  // LST-23, LST-26: what development builds report — every item without a name, a listbox without a name, an option
  // whose value is empty or repeated, and a selected value that names no option. Each is still rendered.
  const reports = useMemo(() => {
    const out: string[] = [];
    const where = testID ? ` (testID "${testID}")` : '';
    items.forEach((item, index) => {
      if (!item.headline?.trim()) out.push(`Tanrei: item ${index + 1} of a List${where} has no headline, so it has no accessible name.`);
    });
    if (selectable) {
      if (!accessibilityLabel?.trim()) out.push(`Tanrei: a selectable List${where} has no accessibilityLabel, so the listbox has no accessible name. Say what the options are.`);
      const seen = new Set<string>();
      items.forEach((item, index) => {
        const own = item.value ?? '';
        if (own === '') out.push(`Tanrei: option ${index + 1} of a List${where} has no value, so it can never be selected.`);
        else if (seen.has(own)) out.push(`Tanrei: option ${index + 1} of a List${where} repeats the value "${own}"; values must be unique within the list.`);
        seen.add(own);
      });
      for (const named of chosen) if (!items.some((item) => item.value === named)) out.push(`Tanrei: the List${where} selects "${named}", which no option has as its value.`);
    }
    return out.join('\n');
  }, [items, selectable, accessibilityLabel, chosen, testID]);
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // LST-15: the list is one tab stop — the item focused last, else the first selected option, else the first enabled
  // item — and the arrow keys, Home, End and typeahead move focus among the items that take it. Static items do not.
  const labels = items.map((item) => (pressableItem(item, selectable) ? item.headline ?? '' : null));
  const firstSelected = items.findIndex((item) => isSelected(item));
  const firstEnabled = items.findIndex((item) => pressableItem(item, selectable) && !item.disabled);
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const roving = useRovingFocus({ labels, wrap: false, preferred: firstSelected >= 0 ? firstSelected : firstEnabled, onKeyDown: callerKeyDown });

  // LST-13 / LST-14: choosing an option moves the selection and emits it once; a single choice is never cleared by its
  // own option. Pressable never calls onPress while an item is disabled (LST-2).
  const choose = useCallback(
    (item: ListItem) => {
      const own = item.value ?? '';
      if (mode === 'single') {
        if (!chosen.has(own)) (onSelectionChange as ((next: string) => void) | undefined)?.(own);
      } else if (mode === 'multiple') {
        const next = values.includes(own) ? values.filter((each) => each !== own) : [...values, own];
        (onSelectionChange as ((next: string[]) => void) | undefined)?.(next);
      }
    },
    [mode, chosen, values, onSelectionChange],
  );

  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: roving.onKeyDown } as object;
  return (
    <View {...rest} {...keys} ref={ref} testID={testID} accessibilityRole="list" accessibilityLabel={accessibilityLabel} style={style}>
      {items.map((item, index) => (
        <ListRow
          // Items are positional (LST-26: values may repeat), so the index is the key.
          key={index}
          item={item}
          index={index}
          count={items.length}
          selectable={selectable}
          selected={isSelected(item)}
          tabStop={roving.tabStop === index}
          focusRef={roving.itemRef(index)}
          onFocused={roving.itemFocused}
          onChoose={choose}
          positionText={positionText}
          tokens={tokens}
          theme={theme}
          testID={item.testID ?? partTestID(testID, `item.${index}`)}
        />
      ))}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Part = 'headline' | 'overline' | 'supportingText' | 'trailingText' | 'leadingIcon' | 'trailingIcon' | 'mark';

/** The parts of a condition in one state, by the names the row draws them under. */
function rowPaints(state: TanreiListConditionStateTokens) {
  return {
    container: state.containerColor,
    headline: state.headlineColor,
    overline: state.overlineColor,
    supportingText: state.supportingTextColor,
    trailingText: state.trailingTextColor,
    leadingIcon: state.leadingIconColor,
    trailingIcon: state.trailingIconColor,
    mark: state.markColor,
  };
}

interface ListRowProps {
  item: ListItem;
  index: number;
  count: number;
  selectable: boolean;
  selected: boolean;
  tabStop: boolean;
  focusRef: (node: FocusableNode | null) => void;
  onFocused: (index: number) => void;
  onChoose: (item: ListItem) => void;
  positionText: (position: number, count: number) => string;
  tokens: TanreiListTokens;
  theme: TanreiTheme;
  testID: string | undefined;
}

function ListRow({ item, index, count, selectable, selected, tabStop, focusRef, onFocused, onChoose, positionText, tokens, theme, testID }: ListRowProps) {
  const { headline = '', overline = '', supportingText = '', supportingNumberOfLines = 0, trailingText = '', leadingIcon, trailingIcon, leading, trailing, onPress, disabled: disabledProp = false, divider = false } = item;
  // LST-7: a leading media value the list does not define renders as `none`, and development builds report it.
  const media = closedValue(LEADING_MEDIA, item.leadingMedia ?? 'none', 'none', 'List leadingMedia');
  const pressable = pressableItem(item, selectable);
  // LST-11: a static item has nothing to disable.
  const disabled = pressable && disabledProp;
  // LST-26 / LST-11: a selected option is drawn from `selected`; every other item from `unselected`.
  const condition: TanreiCoreListCondition = selected ? 'selected' : 'unselected';
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'List condition');
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);

  // LST-17: the minimum height follows the lines of text — the supporting text's lines as laid out (one until then).
  const [supportingLines, setSupportingLines] = useState(1);
  const onSupportingLayout = useCallback((event: TextLayoutEvent) => {
    const lines = Math.max(1, event.nativeEvent.lines.length);
    setSupportingLines((previous) => (previous === lines ? previous : lines));
  }, []);
  const lines = 1 + (overline ? 1 : 0) + (supportingText ? supportingLines : 0);
  const height = lines <= 1 ? tokens.containerHeightOneLine : lines === 2 ? tokens.containerHeightTwoLine : tokens.containerHeightThreeLine;
  // LST-5: a row that takes presses is at least the touch target tall; rows cannot extend a hit area over each other.
  const target = theme.system.measure.target.touch;
  const minHeight = pressable ? Math.max(height, target) : height;

  // LST-1 / LST-13 / LST-14: activation is the interactive item's click, or the option's choice.
  const activate = useCallback(
    (event: GestureResponderEvent) => {
      if (selectable) onChoose(item);
      else onPress?.(event);
    },
    [selectable, onChoose, item, onPress],
  );
  const handleFocus = useCallback((_event: NativeSyntheticEvent<TargetedEvent>) => onFocused(index), [onFocused, index]);

  // LST-3, LST-6, LST-8, LST-9, LST-25: the state that wins, its tokens, the press hold, the ripple and the motion.
  const row = useItemRow<Part>({
    pressable,
    disabled,
    condition,
    paints: (state) => rowPaints(appearance[state]),
    shapes: tokens,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: target, height: minHeight },
    ref: focusRef as unknown as Ref<PressableHost>,
    onPress: activate,
    onFocus: handleFocus,
  });
  const { drawn, colors } = row;
  const shape = stateShape(tokens, row.state).shape;
  // LST-21: the check draws along its path over the state motion (at once where motion is reduced).
  const check = useStateTransition({ progress: selected ? 1 : 0 }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing }).progress as Moving<number>;

  // LST-19: glyphs at their sizes, in the family and fill of the item's condition.
  const leadingGlyph = iconGlyphStyle(theme.system.icon, tokens.leadingIconSize, { selected, resolveFont: theme.resolveIconFont });
  const trailingGlyph = iconGlyphStyle(theme.system.icon, tokens.trailingIconSize, { selected, resolveFont: theme.resolveIconFont });
  const hasLeadingIcon = media === 'none' && leadingIcon != null && leadingIcon !== '';
  const hasTrailingIcon = trailingIcon != null && trailingIcon !== '';

  // LST-20: the avatar or the image box, filled behind its content and handing it the media content color.
  let lead: ReactNode = null;
  let leadWidth = 0;
  if (media !== 'none') {
    const side = media === 'avatar' ? tokens.avatarSize : tokens.imageSize;
    const radius = media === 'avatar' ? tokens.avatarShape : tokens.imageShape;
    const backdrop = theme.resolve(tokens.mediaContainerColor);
    const contentColor = theme.paint(tokens.mediaContentColor);
    // LST-23: the media is hidden from assistive technology unless the product names what it put in it.
    const named = isValidElement<{ accessibilityLabel?: string }>(leading) && Boolean(leading.props.accessibilityLabel);
    const box: ViewStyle = {
      width: side,
      height: side,
      borderRadius: radius,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      ...(backdrop.a > 0 ? { backgroundColor: theme.paint(tokens.mediaContainerColor) } : null),
      ...borderCurveOf(cornerSmoothing),
    };
    // LST-20: a monogram is set in the headline's type style, centred.
    const monogram: TextStyle = { ...theme.text(tokens.headlineTypescale), color: contentColor, textAlign: 'center' };
    lead = (
      <View style={box} testID={part(media)} {...(named ? null : HIDDEN)}>
        <ContentColorProvider color={contentColor}>
          {typeof leading === 'string' || typeof leading === 'number' ? (
            <Text style={monogram} allowFontScaling testID={part(`${media}.monogram`)}>
              {leading}
            </Text>
          ) : (
            leading
          )}
        </ContentColorProvider>
      </View>
    );
    leadWidth = side;
  } else if (hasLeadingIcon) {
    lead = (
      <IconBox
        icon={glyphSlotContent(leadingIcon, { color: colors.leadingIcon, size: tokens.leadingIconSize, glyph: leadingGlyph }, drawn.leadingIcon, part('leading-icon.glyph'))}
        color={colors.leadingIcon}
        size={tokens.leadingIconSize}
        decorative
        testID={part('leading-icon')}
      />
    );
    leadWidth = tokens.leadingIconSize;
  }

  // LST-18: the headline, overline and trailing text wrap; the supporting text ends in an ellipsis after
  // `supportingNumberOfLines` lines (0: never). Every text scales with the font.
  const text = (
    <View style={{ flex: 1 }} testID={part('text')}>
      {overline ? (
        <Label style={theme.text(tokens.overlineTypescale)} color={drawn.overline} testID={part('overline')}>
          {overline}
        </Label>
      ) : null}
      <Label style={theme.text(tokens.headlineTypescale)} color={drawn.headline} testID={part('headline')}>
        {headline}
      </Label>
      {supportingText ? (
        <Label style={theme.text(tokens.supportingTextTypescale)} color={drawn.supportingText} numberOfLines={supportingNumberOfLines > 0 ? supportingNumberOfLines : undefined} onTextLayout={onSupportingLayout} testID={part('supporting-text')}>
          {supportingText}
        </Label>
      ) : null}
    </View>
  );

  const trailingParts = (
    <>
      {trailingText ? (
        <Label style={theme.text(tokens.trailingTextTypescale)} color={drawn.trailingText} testID={part('trailing-text')}>
          {trailingText}
        </Label>
      ) : null}
      {hasTrailingIcon ? (
        <IconBox
          icon={glyphSlotContent(trailingIcon, { color: colors.trailingIcon, size: tokens.trailingIconSize, glyph: trailingGlyph }, drawn.trailingIcon, part('trailing-icon.glyph'))}
          color={colors.trailingIcon}
          size={tokens.trailingIconSize}
          decorative
          testID={part('trailing-icon')}
        />
      ) : null}
      {trailing != null ? <View testID={part('trailing')}>{trailing}</View> : null}
      {/* LST-21: the check's box is reserved at the end of every option, so the texts line up. */}
      {selectable ? (
        <View style={{ width: tokens.markSize, height: tokens.markSize }} testID={part('mark')} {...HIDDEN}>
          <CheckMark progress={check} color={drawn.mark} side={tokens.markSize} stroke={tokens.markWidth} testID={part('check')} />
        </View>
      ) : null}
    </>
  );

  // LST-16 / LST-17: one row — logical paddings (it mirrors in right-to-left), the gap between elements, the minimum
  // height of its lines; the leading and trailing elements centered on the text column in a one- or two-line item and
  // aligned with its top in a taller one.
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: lines >= 3 ? 'flex-start' : 'center',
    minHeight,
    paddingStart: tokens.containerPaddingInlineStart,
    paddingEnd: tokens.containerPaddingInlineEnd,
    paddingVertical: tokens.containerPaddingBlock,
    gap: tokens.containerGap,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(row.container, drawn.container), borderRadius: drawn.shape, opacity: drawn.opacity };

  // LST-22: the divider lies along the bottom edge, inside the item's height, from the start of the text column to the
  // row's end. It is drawn beside the row, not in it, so it keeps its color and its full opacity in every state and
  // condition: neither a disabled item's opacity nor a dim press reaches it.
  const dividerLine = divider && drawsColor(theme.resolve(tokens.dividerColor), theme.paint(tokens.dividerColor)) ? (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        start: tokens.containerPaddingInlineStart + (leadWidth > 0 ? leadWidth + tokens.containerGap : 0),
        end: 0,
        height: tokens.dividerThickness,
        backgroundColor: theme.paint(tokens.dividerColor),
        pointerEvents: 'none',
      }}
      testID={part('divider')}
      {...HIDDEN}
    />
  ) : null;

  if (!pressable) {
    // LST-11 / LST-12: a static item is a list item that takes no focus and answers nothing; its content keeps its own
    // semantics (a trailing control stays its own focus stop).
    return (
      <View role="listitem" testID={testID}>
        <Animated.View style={[rowStyle, { backgroundColor: fillOf(row.container, drawn.container), borderRadius: shape }]} testID={part('row')}>
          {lead}
          {text}
          {trailingParts}
        </Animated.View>
        {dividerLine}
      </View>
    );
  }

  // LST-23: named by the headline, described by the overline, supporting text and trailing text in reading order (the
  // full supporting text, even when it is cut); LST-12: the position and the list's size.
  const description = [overline, supportingText, trailingText].filter(Boolean).join(', ');
  return (
    <View role={selectable ? undefined : 'listitem'} testID={testID}>
      <AnimatedPressable
        {...row.interaction.hostProps}
        hitSlop={NO_SLOP}
        testID={part('row')}
        disabled={disabled}
        // LST-15: only the list's tab stop is in the tab order; the arrow keys make another item the tab stop.
        focusable={tabStop}
        role={selectable ? 'option' : 'button'}
        accessibilityLabel={headline}
        accessibilityHint={description || undefined}
        accessibilityValue={{ text: positionText(index + 1, count) }}
        accessibilityState={selectable ? { disabled, selected } : { disabled }}
        style={[rowStyle, surface]}
      >
        {row.interaction.wave.ripple ? <PressRipple ripple={row.interaction.wave.ripple} color={row.rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
        {lead}
        {text}
        {trailingParts}
        {/* LST-4: inside the row, so that a scrolling ancestor cannot clip it; LST-2: a disabled item reached by the arrow keys shows it too. */}
        <FocusRing visible={row.interaction.focused} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
      </AnimatedPressable>
      {dividerLine}
    </View>
  );
}

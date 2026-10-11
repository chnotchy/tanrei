import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  I18nManager,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  type Insets,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiNavigationDrawerConditionStateTokens, TanreiNavigationDrawerTokens, TanreiNavigationDrawerVariant, TanreiNavigationDrawerVariantTokens } from '../generated/vocabulary';
import { IconBox, Label, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { destinationModel } from '../primitives/destination';
import { FocusRing } from '../primitives/FocusRing';
import { useItemRow } from '../primitives/itemRow';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { OverlayLayer, useOverlayCover } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, useTanreiInsets, type TanreiTheme } from '../theme/TanreiProvider';
import { Divider } from './Divider';

/**
 * Open keys: the core values — `standard`, `modal` — plus whatever the product's design system added (its
 * generated file augments `TanreiNavigationDrawerVariantRegistry`). Only `modal` is presented over the content; any other
 * value is a layout region, as `standard` is.
 */
export type NavigationDrawerVariant = TanreiNavigationDrawerVariant;

/** What a destination's icon given as a function receives: the icon color of its condition and state, the size, the glyph. */
export type NavigationDrawerIconProps = GlyphSlotProps;

/** One destination (the spec's item kind `destination`): a row with an optional icon, a label and an optional badge text. */
export interface NavigationDrawerDestination {
  /** Identifies the destination: the drawer's `value` selects it; `onValueChange` and `onReselect` carry it. Unique; required. */
  value: string;
  /** Its name, drawn in the row and its accessible name. Required. */
  label: string;
  /** A glyph name of the system's icon font (a function or a node also works). Give every destination an icon, or none. */
  icon?: GlyphSlot<NavigationDrawerIconProps>;
  /** Short text at the row's end, a count or a word ("24", "New"), in the row's colors. Empty: none. */
  badge?: string;
  /** Keeps its place, draws its disabled look, cannot be activated and leaves the focus order. */
  disabled?: boolean;
  /** The row's test id (default: `<drawer testID>.destination.<n>`, n in reading order). */
  testID?: string;
}

/**
 * A group of destinations (the spec's item kind `section`): an optional heading and an optional divider before it. Its
 * `items` array tells it from a destination. Sections do not nest: an inner section's destinations are drawn in its place.
 */
export interface NavigationDrawerSection {
  heading?: string;
  divider?: boolean;
  items: readonly (NavigationDrawerDestination | NavigationDrawerSection)[];
}

/** One element of a drawer's `items`. */
export type NavigationDrawerItem = NavigationDrawerDestination | NavigationDrawerSection;

export type NavigationDrawerRef = ComponentRef<typeof View>;

export interface NavigationDrawerProps extends Omit<ViewProps, 'children' | 'style'> {
  /** Standard sits beside the content; modal slides over it with a scrim. Unknown values render as `standard` (NVD-26). */
  variant?: NavigationDrawerVariant;
  /** Whether the drawer is shown. **Controlled**: a modal drawer asks to close with `onClose`; set it to false then. */
  open?: boolean;
  /** The selected destination's value, wherever it stands. **Controlled**: move it from `onValueChange`. Empty selects none. */
  value?: string;
  /** The spec's `change`: the user activated a destination that is not the selected one; its value. */
  onValueChange?: (value: string) => void;
  /** The spec's `reselect`: the user activated the selected destination; its value. */
  onReselect?: (value: string) => void;
  /**
   * The spec's `close` (a modal drawer only): the scrim, Escape, Android's back, the iOS escape gesture, a drag toward
   * the start edge, or after a destination was activated. Called once per opening.
   */
  onClose?: () => void;
  /** The destinations and sections, in reading order. */
  items: readonly NavigationDrawerItem[];
  /** Above the destinations (a title, an account switcher, a close button): laid out, never restyled. */
  header?: ReactNode;
  /** The spec's `label`: names the drawer — the modal drawer's dialog ("Mail"). */
  accessibilityLabel?: string;
  /** How a destination's position is announced. Default: `"2 of 6"` (English). */
  positionText?: (position: number, count: number) => string;
  /**
   * Tests and the gallery only (the spec's snapshot harness): draws an open modal drawer — its scrim over the parent and
   * its panel at the parent's start — in place, without a `Modal`, motion or a focus move.
   */
  inline?: boolean;
  /** Layout of the drawer (margins); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<NavigationDrawerRef | null>;
}

// ---------------------------------------------------------------------------------------------------------------
// The drawer's structure (NVD-12, NVD-17): its destinations in reading order, its sections and the reports.

interface RowModel {
  destination: NavigationDrawerDestination;
  /** Its place in reading order among the destinations. */
  index: number;
}
type Block = { type: 'destination'; row: RowModel } | { type: 'section'; section: NavigationDrawerSection; rows: RowModel[]; index: number };

const isSection = (item: NavigationDrawerItem): item is NavigationDrawerSection => Array.isArray((item as NavigationDrawerSection).items);

function buildDrawer(items: readonly NavigationDrawerItem[], where: string): { blocks: Block[]; rows: RowModel[]; reports: string[] } {
  const rows: RowModel[] = [];
  const blocks: Block[] = [];
  const reports: string[] = [];
  const row = (destination: NavigationDrawerDestination): RowModel => {
    const model = { destination, index: rows.length };
    rows.push(model);
    return model;
  };
  // NVD-17: a section inside a section is drawn as its destinations, in its place.
  const flatten = (section: NavigationDrawerSection): RowModel[] =>
    section.items.flatMap((item) => {
      if (!isSection(item)) return [row(item)];
      reports.push(`Tanrei: a section of a NavigationDrawer${where} holds another section; sections do not nest, so its destinations are drawn in its place.`);
      return flatten(item);
    });
  items.forEach((item, index) => {
    if (isSection(item)) blocks.push({ type: 'section', section: item, rows: flatten(item), index });
    else blocks.push({ type: 'destination', row: row(item) });
  });
  return { blocks, rows, reports };
}

const englishPosition = (position: number, count: number) => `${position} of ${count}`;
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
/** NVD-20: how far a finger moves before the drawer follows it, and how fast a fling toward the start edge closes it (points per millisecond). Behaviour constants of the spec's gesture, not design values. */
const DRAG_SLOP = 8;
const FLING_VELOCITY = 0.5;

type Focusable = { focus?: () => void };

/**
 * Tanrei NavigationDrawer — spec: `specs/navigation-drawer.spec.json`.
 * Anatomy: [scrim] + container (the start edge, the parent's full height; the end edge; a modal drawer's end corners)
 * > scrolling: [header] + items: destinations (item container > [icon] + label + [badge], the focus ring inside) and
 * sections ([divider] + [heading] + destinations). Standard: a layout region beside the content. Modal: a
 * modal overlay presented in a transparent `Modal` with Tanrei's own scrim and slide.
 */
export function NavigationDrawer({
  variant = 'standard',
  open = false,
  value = '',
  onValueChange,
  onReselect,
  onClose,
  items,
  header,
  accessibilityLabel,
  positionText = englishPosition,
  inline = false,
  style,
  testID,
  ref,
  ...rest
}: NavigationDrawerProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.navigationDrawer;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // NVD-26: an open key; a value the active system does not have is drawn from `standard`'s tokens (reported once).
  const look = lookupValue(tokens.variants, variant, 'standard', 'NavigationDrawer variant');
  const modal = variant === 'modal';
  const reduce = useReduceMotion();
  const rtl = I18nManager.isRTL;
  // NVD-25: the provider's insets; the drawer is at the start edge.
  const insets = useTanreiInsets();
  const startInset = rtl ? insets.right : insets.left;
  const width = tokens.containerWidth + startInset;

  // NVD-3, NVD-17, NVD-24, NVD-29: the structure, the selection and the development reports.
  const model = useMemo(() => {
    const built = buildDrawer(items, where);
    const selection = destinationModel(
      built.rows.map((each) => each.destination),
      value,
      'NavigationDrawer',
      where,
    );
    const reports = [...built.reports, ...selection.reports];
    if (modal && !accessibilityLabel?.trim()) reports.push(`Tanrei: a modal NavigationDrawer${where} has no accessibilityLabel, so its dialog has no name.`);
    return { ...built, selected: selection.selected, reports };
  }, [items, value, where, modal, accessibilityLabel]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // NVD-20 / NVD-21: close asked for once per opening.
  const closeAsked = useRef(false);
  useEffect(() => {
    if (open) closeAsked.current = false;
  }, [open]);
  const close = useCallback(() => {
    if (!modal || closeAsked.current) return;
    closeAsked.current = true;
    onClose?.();
  }, [modal, onClose]);

  // NVD-1 / NVD-2 / NVD-21: change or reselect, nothing for a disabled destination; a modal drawer then closes.
  const activate = useCallback(
    (index: number) => {
      const destination = model.rows[index]?.destination;
      if (!destination || destination.disabled) return;
      if (index === model.selected) onReselect?.(destination.value);
      else onValueChange?.(destination.value);
      close();
    },
    [model, onValueChange, onReselect, close],
  );

  // NVD-19 / NVD-28: focus moves in when the drawer opens — to the selected destination, else the first that takes it.
  const rows = useRef(new Map<number, Focusable>());
  const rowRef = useCallback((index: number) => (node: Focusable | null) => {
    if (node) rows.current.set(index, node);
    else rows.current.delete(index);
  }, []);
  const focusIn = useCallback(() => {
    const selected = model.rows[model.selected];
    const target = selected && !selected.destination.disabled ? model.selected : model.rows.findIndex((each) => !each.destination.disabled);
    const node = target >= 0 ? rows.current.get(target) : undefined;
    if (!node) return;
    node.focus?.();
    try {
      AccessibilityInfo.sendAccessibilityEvent(node as never, 'focus');
    } catch {
      // Not a host view: keyboard focus only.
    }
  }, [model]);

  // NVD-18 / NVD-19 / NVD-22: present while open or while it leaves; the progress of the slide (and the scrim).
  const [present, setPresent] = useState(open);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [moving, setMoving] = useState(false);
  const opened = useRef(open);
  useEffect(() => {
    if (inline) return undefined;
    const was = opened.current;
    opened.current = open;
    if (open) setPresent(true);
    if (was === open) return undefined;
    const target = open ? 1 : 0;
    if (reduce) {
      progress.setValue(target);
      setMoving(false);
      if (!open) setPresent(false);
      return undefined;
    }
    setMoving(true);
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: open ? tokens.motionEnterDuration : tokens.motionExitDuration,
      easing: toEasing(open ? tokens.motionEnterEasing : tokens.motionExitEasing),
      // JS-driven: a standard drawer's width is layout, and a modal drawer's drag adds to its slide.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setMoving(false);
      if (!open) setPresent(false);
    });
    return () => animation.stop();
  }, [open, reduce, inline]);
  // A standard drawer takes focus as it opens (NVD-28); a modal one on the Modal's show as well (NVD-19).
  useEffect(() => {
    if (open && !inline && present) focusIn();
  }, [open, present]);

  // SNK-9 / SNK-12: a modal drawer covers the layer, as a dialog does: a snackbar pauses, a waiting one waits.
  useOverlayCover(modal && open && !inline);

  const panelProps: PanelProps = {
    model,
    tokens,
    look,
    theme,
    modal,
    width,
    startInset,
    insets,
    header,
    accessibilityLabel,
    positionText,
    rowRef,
    onActivate: activate,
    onClose: close,
    testID,
  };

  if (!modal) {
    // NVD-18: a layout region — its width in the layout while open, none (and no presence) while closed; sliding while
    // the content beside it resizes.
    if (!present) return null;
    const animatedWidth = moving ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) : width;
    return (
      <Animated.View {...rest} ref={ref} style={[{ alignSelf: 'stretch', width: animatedWidth, ...(moving ? { overflow: 'hidden' } : null) }, style]} testID={testID}>
        <Panel {...panelProps} style={moving ? { position: 'absolute', top: 0, bottom: 0, end: 0 } : { flex: 1 }} />
      </Animated.View>
    );
  }

  // NVD-19 … NVD-22: the modal drawer — the scrim and the panel sliding from the start edge, the drag toward it.
  if (inline) {
    return (
      <View {...rest} ref={ref} style={[FILL, style]} testID={testID}>
        <ModalStage {...panelProps} progress={1} onClose={close} />
      </View>
    );
  }
  if (!present) return null;
  return (
    // NVD-19: React Native's Modal is a window of its own — everything behind it is inert to touch, the keyboard and
    // assistive technology. Transparent, without its own animation; Android's back button closes (NVD-20).
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close} onShow={focusIn} testID={part('modal')}>
      <OverlayLayer own testID={partTestID(testID, 'layer') ?? 'tanrei.drawer.layer'}>
        <ModalStage {...panelProps} progress={progress} onClose={close} />
      </OverlayLayer>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The modal stage (NVD-19 … NVD-22): the scrim and the sliding, draggable panel.

interface PanelProps {
  model: { blocks: Block[]; rows: RowModel[]; selected: number };
  tokens: TanreiNavigationDrawerTokens;
  look: TanreiNavigationDrawerVariantTokens;
  theme: TanreiTheme;
  modal: boolean;
  width: number;
  startInset: number;
  insets: { top: number; bottom: number };
  header: ReactNode;
  accessibilityLabel: string | undefined;
  positionText: (position: number, count: number) => string;
  rowRef: (index: number) => (node: Focusable | null) => void;
  onActivate: (index: number) => void;
  onClose: () => void;
  testID: string | undefined;
  style?: ViewStyle;
}

function ModalStage(props: PanelProps & { progress: Animated.Value | number }) {
  const { tokens, theme, width, onClose, progress, testID } = props;
  const part = (name: string) => partTestID(testID, name);
  const rtl = I18nManager.isRTL;
  // NVD-20: the drag toward the start edge — past half the width, or a fling that way, closes; otherwise it springs back.
  const drag = useRef(new Animated.Value(0)).current;
  const toward = (dx: number) => (rtl ? Math.max(0, dx) : Math.min(0, dx));
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => drag.setValue(toward(gesture.dx)),
        onPanResponderRelease: (_event, gesture) => {
          const distance = Math.abs(toward(gesture.dx));
          const fling = rtl ? gesture.vx > FLING_VELOCITY : gesture.vx < -FLING_VELOCITY;
          if (distance > width / 2 || fling) {
            onClose();
            return;
          }
          Animated.timing(drag, { toValue: 0, duration: tokens.motionEnterDuration, easing: toEasing(tokens.motionEnterEasing), useNativeDriver: false }).start();
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [width, rtl, onClose, tokens, drag],
  );
  // Slid in from the start edge: the progress of the slide plus the drag (settled in place: no transform at all).
  const hidden = rtl ? width : -width;
  const translate = typeof progress === 'number' ? (progress === 1 ? undefined : hidden) : Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [hidden, 0] }), drag);
  const scrim = theme.resolve(tokens.scrimColor);
  return (
    <View style={FILL} testID={part('stage')}>
      {/* NVD-20: a press on the scrim closes the drawer; the scrim is not an element for assistive technology. */}
      <Animated.View style={[FILL, { opacity: progress }]} pointerEvents="box-none" {...HIDDEN}>
        <Pressable style={[FILL, scrim.a > 0 ? { backgroundColor: theme.paint(tokens.scrimColor) } : null]} onPress={onClose} accessible={false} focusable={false} testID={part('scrim')} />
      </Animated.View>
      <Panel {...props} style={{ position: 'absolute', top: 0, bottom: 0, start: 0 }} translate={translate} panHandlers={responder.panHandlers} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The panel (NVD-11 … NVD-17, NVD-23 … NVD-25)

function Panel({ model, tokens, look, theme, modal, width, startInset, insets, header, accessibilityLabel, positionText, rowRef, onActivate, onClose, testID, style, translate, panHandlers }: PanelProps & { translate?: number | Animated.AnimatedAddition; panHandlers?: object }) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const count = model.rows.length;

  const renderRow = (row: RowModel) => (
    <DrawerRow
      key={row.index}
      row={row}
      count={count}
      selected={row.index === model.selected}
      tokens={tokens}
      theme={theme}
      focusRef={rowRef(row.index)}
      onActivate={onActivate}
      positionText={positionText}
      testID={row.destination.testID ?? partTestID(testID, `destination.${row.index}`)}
    />
  );

  // NVD-12 / NVD-16 / NVD-17: the header, then the items in reading order, containerGap apart; a section lays out its
  // divider, its heading and its destinations.
  const content: ReactNode[] = [];
  if (header != null && header !== false) content.push(<View key="header" testID={part('header')}>{header}</View>);
  model.blocks.forEach((block, i) => {
    if (block.type === 'destination') {
      content.push(renderRow(block.row));
      return;
    }
    const heading = block.section.heading?.trim() ? block.section.heading : '';
    content.push(
      <View key={`section.${i}`} style={{ gap: tokens.containerGap }} testID={part(`section.${block.index}`)}>
        {block.section.divider ? <Divider testID={part(`section.${block.index}.divider`)} /> : null}
        {heading ? (
          <View style={{ minHeight: tokens.headingHeight, justifyContent: 'center', paddingStart: tokens.itemPaddingInline, paddingEnd: tokens.itemPaddingInline }} testID={part(`section.${block.index}.heading`)}>
            <Text role="heading" style={[theme.text(tokens.headingTypescale), { color: theme.paint(tokens.headingColor) }]} allowFontScaling testID={part(`section.${block.index}.heading.text`)}>
              {heading}
            </Text>
          </View>
        ) : null}
        {block.rows.map(renderRow)}
      </View>,
    );
  });

  // NVD-11: its variant's color, elevation and end corners (square start corners), its end edge; NVD-25: the color
  // under the start, top and bottom insets, the content inside them.
  const elevation = theme.elevation(look.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(look.containerColor);
  const outline = theme.resolve(look.outlineColor);
  const corners = { topStart: 0, bottomStart: 0, topEnd: look.containerShape, bottomEnd: look.containerShape };
  const container: ViewStyle = {
    width,
    paddingStart: startInset,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    borderTopEndRadius: look.containerShape,
    borderBottomEndRadius: look.containerShape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(look.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  // NVD-20: Escape (a hardware keyboard) closes a modal drawer; `onKeyDown` is a View prop React Native's types do not list yet.
  const keys = modal ? ({ onKeyDown: (event: KeyDownEvent) => event.nativeEvent.key === 'Escape' && (event.preventDefault?.(), onClose()) } as object) : {};
  // NVD-23: a modal drawer is a modal dialog named by the label; the escape gesture (VoiceOver) closes it.
  const semantics = modal ? { role: 'dialog' as const, 'aria-modal': true, accessibilityViewIsModal: true, accessibilityLabel, onAccessibilityEscape: onClose } : {};
  return (
    <Animated.View {...(panHandlers ?? {})} {...keys} {...semantics} style={[container, style, translate !== undefined ? { transform: [{ translateX: translate }] } : null]} testID={part('panel')}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={0} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {outline.a > 0 ? <View style={{ position: 'absolute', top: 0, bottom: 0, end: 0, width: tokens.outlineWidth, backgroundColor: theme.paint(look.outlineColor) }} pointerEvents="none" testID={part('outline')} {...HIDDEN} /> : null}
      {/* NVD-12: everything scrolls together while it is taller than the drawer. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.containerPaddingBlock, gap: tokens.containerGap }}
        showsVerticalScrollIndicator={false}
        testID={part('scroll')}
      >
        {content}
      </ScrollView>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// A destination row (NVD-1 … NVD-10, NVD-13 … NVD-15, NVD-23)

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Part = 'icon' | 'label' | 'badge';

function rowPaints(state: TanreiNavigationDrawerConditionStateTokens) {
  return { container: state.itemContainerColor, icon: state.itemIconColor, label: state.itemLabelColor, badge: state.itemBadgeColor };
}

interface DrawerRowProps {
  row: RowModel;
  count: number;
  selected: boolean;
  tokens: TanreiNavigationDrawerTokens;
  theme: TanreiTheme;
  focusRef: (node: Focusable | null) => void;
  onActivate: (index: number) => void;
  positionText: (position: number, count: number) => string;
  testID: string | undefined;
}

function DrawerRow({ row, count, selected, tokens, theme, focusRef, onActivate, positionText, testID }: DrawerRowProps) {
  const { destination, index } = row;
  const { label = '', icon, badge = '', disabled = false } = destination;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const condition = selected ? 'selected' : 'unselected';
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'NavigationDrawer condition');
  const target = theme.system.measure.target.touch;
  const handlePress = useCallback(() => onActivate(index), [onActivate, index]);
  const shapes = { containerShape: tokens.itemContainerShape, hoveredOpacity: tokens.hoveredOpacity, focusedOpacity: tokens.focusedOpacity, pressedOpacity: tokens.pressedOpacity, disabledOpacity: tokens.disabledOpacity };

  // NVD-4 … NVD-9: the state that wins, its tokens in the destination's condition, the press hold, the ripple, and one
  // transition over the state motion (a change of selection included; the drawer has no selection motion).
  const drawnRow = useItemRow<Part>({
    pressable: true,
    disabled,
    condition,
    paints: (state) => rowPaints(appearance[state]),
    shapes,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: target, height: tokens.itemContainerHeight },
    ref: focusRef as unknown as RefObject<ComponentRef<typeof Pressable>>,
    onPress: handlePress,
  });
  const { drawn, colors, interaction, state } = drawnRow;
  const shape = stateShape(shapes, state).shape;

  // NVD-6: the hit area is the item container with half the gap above and below, and never less than the touch target
  // high; the drawn row does not change.
  const reach = Math.max(tokens.containerGap / 2, (target - tokens.itemContainerHeight) / 2);
  const slop: Insets = { top: reach, bottom: reach, left: 0, right: 0 };

  // NVD-13 / NVD-14: [icon] label [badge], item.padding-inline from its ends and item.gap apart; the label wraps.
  const drawsIcon = icon != null && icon !== '';
  const glyph = iconGlyphStyle(theme.system.icon, tokens.itemIconSize, { selected, resolveFont: theme.resolveIconFont });
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.itemContainerHeight,
    paddingStart: tokens.itemPaddingInline,
    paddingEnd: tokens.itemPaddingInline,
    gap: tokens.itemGap,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(drawnRow.container, drawn.container), borderRadius: drawn.shape, opacity: drawn.opacity };
  // NVD-15 / NVD-23: named by its label, its selected state, its position, then its badge.
  const description = [positionText(index + 1, count), badge.trim()].filter(Boolean).join(', ');
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={slop}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      accessibilityValue={{ text: description }}
      style={[rowStyle, surface]}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={drawnRow.rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {drawsIcon ? (
        <IconBox icon={glyphSlotContent(icon, { color: colors.icon, size: tokens.itemIconSize, glyph }, drawn.icon, part('icon.glyph'))} color={colors.icon} size={tokens.itemIconSize} decorative testID={part('icon')} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Label style={theme.text(tokens.itemLabelTypescale)} color={drawn.label} testID={part('label')}>
          {label}
        </Label>
      </View>
      {badge.trim() ? (
        <Label style={theme.text(tokens.itemBadgeTypescale)} color={drawn.badge} testID={part('badge')}>
          {badge}
        </Label>
      ) : null}
      {/* NVD-5: inside the row, which the scrolling panel would otherwise clip; never animated. */}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

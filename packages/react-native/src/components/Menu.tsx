import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  I18nManager,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type Insets,
  type LayoutChangeEvent,
  type StyleProp,
  type TextLayoutEvent,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiCoreMenuCondition, TanreiMenuConditionStateTokens, TanreiMenuTokens } from '../generated/vocabulary';
import { CheckMark } from '../primitives/checkMark';
import { IconBox, Label, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { useItemRow } from '../primitives/itemRow';
import type { PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { useRovingFocus, type FocusableNode, type KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayPortal } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { NO_INSETS, TanreiThemeScope, useTanrei, useTanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/** Where the surface goes against the anchor: below or above it, its start or end edge aligned with the anchor's. */
export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
const PLACEMENTS: readonly MenuPlacement[] = ['bottom-start', 'bottom-end', 'top-start', 'top-end'];

/**
 * Why the menu asks to be closed (the spec's `close`, MNU-5 / MNU-6), by the spec's names: Escape, Android's back
 * button, a press outside the surface, Tab, keyboard focus leaving the menu (`'focus-out'`: an item lost focus and no
 * other item took it), or an item's activation.
 */
export type MenuDismissReason = 'escape' | 'back' | 'outside' | 'tab' | 'focus-out' | 'item';

/** What an icon given as a function receives: the icon color of the item's condition and state, the size and the glyph. */
export type MenuItemIconProps = GlyphSlotProps;

interface MenuEntryBase {
  /** The item's text and its accessible name. Required: an empty label still renders, and development builds report it (MNU-26). */
  label: string;
  /** A line below the label that says more about the item; it is the item's description. */
  supportingText?: string;
  /** An icon before the label: a glyph name of the system's icon font, a function or a node. Its column is reserved in every row while any item has one. */
  leadingIcon?: GlyphSlot<MenuItemIconProps>;
  /** An icon at the end of the row. */
  trailingIcon?: GlyphSlot<MenuItemIconProps>;
  /** Text at the end of the row, usually the keyboard shortcut of the same action (`⌘C`). */
  trailingText?: string;
  /** Prevents activation; the arrow keys still reach the item. */
  disabled?: boolean;
  /** The row's test id (default: `<menu testID>.item.<n>`, n in focus order); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** An action (the spec's item kind `item`): it does something, and the menu asks to close. */
export interface MenuItem extends MenuEntryBase {
  kind?: 'item';
  /** Marks an action that deletes or discards something: drawn from the `destructive` condition (the error color). */
  destructive?: boolean;
  /** The spec's `click`: the item was activated. The menu then calls `onDismiss('item')`. */
  onPress?: (event: GestureResponderEvent) => void;
}

/** An option switched on or off on its own (the spec's `checkbox-item`). **Controlled**: set `checked` from `onCheckedChange`. */
export interface MenuCheckboxItem extends MenuEntryBase {
  kind: 'checkbox-item';
  /** Whether the option is on. */
  checked?: boolean;
  /** The spec's `change`: the item was activated; the new value of `checked`. */
  onCheckedChange?: (checked: boolean) => void;
}

/** One choice of several in its group (the spec's `radio-item`): checked while its group's `value` equals its own. */
export interface MenuRadioItem extends MenuEntryBase {
  kind: 'radio-item';
  /** Identifies the choice within its group. Required. */
  value: string;
}

/**
 * A run of related items (the spec's `group`): the menu draws a divider between it and what is next to it, and its
 * radio items are one set of choices. **Controlled**: set `value` from `onValueChange`.
 */
export interface MenuGroup {
  kind: 'group';
  /** A heading above the group's items, which also names the group. Empty: none, and the group is unnamed. */
  title?: string;
  /** The value of the group's checked radio item; null checks none. */
  value?: string | null;
  /** The spec's group `change`: a radio item of the group was chosen; the group's new value. */
  onValueChange?: (value: string) => void;
  /** The group's items. A group inside a group is drawn as its outer group's items (MNU-29). */
  items: readonly (MenuItem | MenuCheckboxItem | MenuRadioItem | MenuGroup)[];
}

/** One element of a menu's `items`: told apart by `kind` (an action may leave it out). */
export type MenuEntry = MenuItem | MenuCheckboxItem | MenuRadioItem | MenuGroup;

/** What the menu reads from its anchor: where it is on the screen, and how to give it focus back. */
export interface MenuAnchor {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  focus?: () => void;
}

/** The menu's surface: a `View`. */
export type MenuRef = ComponentRef<typeof View>;

/**
 * Package-internal (not exported by src/index.ts): what a component that presents its own menu (a split button's
 * trailing half, SPB-16) claims of the presses that land outside the surface. A press it claims — on the element that
 * opened the menu — is that element's, not `'outside'`: the menu does not ask to close, and the owner answers it.
 */
export interface MenuOwner {
  /** A press outside the surface at `point` (page coordinates): true when the owner takes it. */
  claimsOutsidePress: (point: { x: number; y: number }) => boolean;
}
export const MenuOwnerContext = createContext<MenuOwner | null>(null);

export interface MenuProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The spec's `open`: whether the menu is shown. **Controlled**: set it to false from `onDismiss`. */
  visible?: boolean;
  /** The product's element the menu opens from (a button, an icon button, a field): it is measured to place the surface, and gets focus back when the menu closes. */
  anchorRef?: RefObject<MenuAnchor | null>;
  /** Where the surface goes against the anchor; it flips and shifts to stay on screen. Unknown values render as `bottom-start` (MNU-14). */
  placement?: MenuPlacement;
  /** The spec's `close`: the menu asks to be closed, with the reason. */
  onDismiss?: (reason: MenuDismissReason) => void;
  /** The items, in order: actions, checkbox and radio items, and groups of them. */
  items: readonly MenuEntry[];
  /** The menu's accessible name: the name of its anchor ("More", "Sort"). */
  accessibilityLabel?: string;
  /** How an item's position is announced. Default: `"2 of 5"` (English). */
  positionText?: (position: number, count: number) => string;
  /**
   * Test and gallery only (MNU-19's `verify`): draws the open surface where the menu is, at its natural size with its
   * elevation, without the overlay layer, an anchor, placement or motion, and without moving focus.
   */
  inline?: boolean;
  /** Layout of the surface (margins in `inline`); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------------------------------------------
// Placement (MNU-2): a pure function of the anchor's box, the surface's size and the window.

export interface MenuBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MenuPosition {
  /** The surface's top-left corner in window coordinates (physical: `left`, not `start`). */
  top: number;
  left: number;
  /** The room on the side it opens to: the surface scrolls beyond it. */
  maxHeight: number;
  /** The side of the anchor it opens on, after a flip. */
  side: 'top' | 'bottom';
}

/**
 * Where the surface goes (MNU-2): `offset` from the anchor on the placement's side, flipped to the other side when this
 * one has less room than the surface needs within `margin` of the window's edge and the other has more; aligned by its
 * start or end edge with the anchor's (mirrored in right-to-left), then shifted along the anchor to stay `margin` inside
 * the window; its height limited to the room left. `insets` (the provider's) move each edge of the viewport in by that
 * side's inset.
 */
export function placeMenu(input: { anchor: MenuBox; surface: { width: number; height: number }; viewport: { width: number; height: number }; placement: MenuPlacement; offset: number; margin: number; rtl: boolean; insets?: TanreiResolvedInsets }): MenuPosition {
  const { anchor, surface, viewport, placement, offset, margin: base, rtl, insets = NO_INSETS } = input;
  // The margin is kept from the safe area's edges: the viewport's less the provider's insets.
  const margin = { top: base + insets.top, bottom: base + insets.bottom, left: base + insets.left, right: base + insets.right };
  let side: 'top' | 'bottom';
  let edge: 'start' | 'end';
  switch (placement) {
    case 'bottom-start':
      [side, edge] = ['bottom', 'start'];
      break;
    case 'bottom-end':
      [side, edge] = ['bottom', 'end'];
      break;
    case 'top-start':
      [side, edge] = ['top', 'start'];
      break;
    case 'top-end':
      [side, edge] = ['top', 'end'];
      break;
  }
  const below = viewport.height - margin.bottom - (anchor.y + anchor.height + offset);
  const above = anchor.y - offset - margin.top;
  if (side === 'bottom' && below < surface.height && above > below) side = 'top';
  else if (side === 'top' && above < surface.height && below > above) side = 'bottom';
  const room = Math.max(0, side === 'bottom' ? below : above);
  const height = Math.min(surface.height, room);
  const top = side === 'bottom' ? anchor.y + anchor.height + offset : anchor.y - offset - height;
  // The start edge is the left one in left-to-right.
  const alignLeft = (edge === 'start') !== rtl;
  const wanted = alignLeft ? anchor.x : anchor.x + anchor.width - surface.width;
  const left = Math.max(margin.left, Math.min(wanted, viewport.width - margin.right - surface.width));
  return { top, left, maxHeight: room, side };
}

// ---------------------------------------------------------------------------------------------------------------
// The menu's structure (MNU-19, MNU-23, MNU-28, MNU-29): its rows in focus order, its groups and the reports.

type ItemKind = 'item' | 'checkbox-item' | 'radio-item';
const ITEM_KINDS: readonly (ItemKind | 'group')[] = ['item', 'checkbox-item', 'radio-item', 'group'];
type AnyItem = MenuItem | MenuCheckboxItem | MenuRadioItem;

interface RowModel {
  entry: AnyItem;
  kind: ItemKind;
  /** The group whose radio choice this row belongs to (the outermost group it is in). */
  group: MenuGroup | null;
  /** MNU-18: a checkbox item that is on, or a radio item whose group's value is its own. */
  checked: boolean;
  /** Its place in focus order. */
  index: number;
}

type Block = { type: 'row'; row: RowModel } | { type: 'group'; group: MenuGroup; rows: RowModel[]; index: number };

interface MenuModel {
  blocks: Block[];
  rows: RowModel[];
  /** MNU-19: the mark column while any item is a checkbox or radio item, the icon column while any item has an icon. */
  markColumn: boolean;
  iconColumn: boolean;
  reports: string[];
}

const hasGlyph = (slot: GlyphSlot<MenuItemIconProps> | undefined) => slot != null && slot !== '';

function buildMenu(items: readonly MenuEntry[], where: string): MenuModel {
  const rows: RowModel[] = [];
  const blocks: Block[] = [];
  const reports: string[] = [];
  const kindOf = (entry: MenuEntry) => closedValue(ITEM_KINDS, entry.kind ?? 'item', 'item', 'Menu item kind');
  const row = (entry: AnyItem, group: MenuGroup | null): RowModel => {
    const kind = kindOf(entry) as ItemKind;
    let checked = false;
    if (kind === 'checkbox-item') checked = (entry as MenuCheckboxItem).checked === true;
    if (kind === 'radio-item') {
      const own = (entry as MenuRadioItem).value;
      if (!group) reports.push(`Tanrei: the radio item "${entry.label}" of a Menu${where} is not inside a group, so it is never checked. Put the choices of one question in a group with a value.`);
      checked = group != null && group.value != null && own === group.value;
    }
    if (!entry.label?.trim()) reports.push(`Tanrei: item ${rows.length + 1} of a Menu${where} has no label, so it has no accessible name.`);
    const model = { entry, kind, group, checked, index: rows.length };
    rows.push(model);
    return model;
  };
  // MNU-29: a group inside a group is drawn as its outer group's items, without a title or divider of its own.
  const flatten = (group: MenuGroup, outer: MenuGroup): RowModel[] =>
    group.items.flatMap((entry) => {
      if (kindOf(entry) !== 'group') return [row(entry as AnyItem, outer)];
      reports.push(`Tanrei: a group of a Menu${where} holds another group; its items are drawn as the outer group's, without a title or divider of their own.`);
      return flatten(entry as MenuGroup, outer);
    });
  items.forEach((entry, index) => {
    if (kindOf(entry) !== 'group') {
      blocks.push({ type: 'row', row: row(entry as AnyItem, null) });
      return;
    }
    const group = entry as MenuGroup;
    const members = flatten(group, group);
    const radios = members.filter((each) => each.kind === 'radio-item').map((each) => (each.entry as MenuRadioItem).value);
    if (group.value != null && radios.length > 0 && !radios.includes(group.value)) reports.push(`Tanrei: a group of a Menu${where} has the value "${group.value}", which none of its radio items has.`);
    const seen = new Set<string>();
    for (const value of radios) {
      if (seen.has(value)) reports.push(`Tanrei: two radio items of one group of a Menu${where} share the value "${value}"; values must be unique within a group.`);
      seen.add(value);
    }
    blocks.push({ type: 'group', group, rows: members, index });
  });
  return {
    blocks,
    rows,
    markColumn: rows.some((each) => each.kind !== 'item'),
    iconColumn: rows.some((each) => hasGlyph(each.entry.leadingIcon)),
    reports,
  };
}

const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const englishPosition = (position: number, count: number) => `${position} of ${count}`;

/**
 * Tanrei Menu — spec: `specs/menu.spec.json`.
 * Anatomy: surface (its color, corners, elevation, padding; clips its items) > items: rows (container > [mark column]
 * [leading icon column] label + supporting text, trailing text, trailing icon; focus ring inside), groups (a title,
 * then their rows) and the dividers between groups. Drawn in `TanreiProvider`'s overlay layer, placed against
 * `anchorRef`; an operated overlay that is not modal: it takes focus to its first enabled item and gives it
 * back to the anchor, draws no scrim, leaves the rest of the screen reachable, and asks to be closed with a reason.
 */
export function Menu({
  visible = false,
  anchorRef,
  placement: placementProp = 'bottom-start',
  onDismiss,
  items,
  accessibilityLabel,
  positionText = englishPosition,
  inline = false,
  testID,
  style,
  ...rest
}: MenuProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.menu;
  // MNU-14: a placement the menu does not define renders as `bottom-start`, and development builds report it.
  const placement = closedValue(PLACEMENTS, placementProp, 'bottom-start', 'Menu placement');
  const where = testID ? ` (testID "${testID}")` : '';
  const model = useMemo(() => buildMenu(items, where), [items, where]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // Every close request is counted, so that a blur that follows one (Tab, an activation) is not also `'focus-out'`; and
  // focus that was inside when it was asked for goes back to the anchor when the menu closes, even if it has left.
  const requests = useRef(0);
  const focusInside = useRef(false);
  const returnFocus = useRef(false);
  const dismiss = useCallback(
    (reason: MenuDismissReason) => {
      requests.current += 1;
      if (focusInside.current) returnFocus.current = true;
      onDismiss?.(reason);
    },
    [onDismiss],
  );

  // MNU-7: Up and Down Arrow wrap through every item (groups included), Home, End and typeahead; disabled items are
  // reached. MNU-5: Escape and Tab ask to close. MNU-6: a Space that activates a checkbox or radio item keeps it open.
  const space = useRef(false);
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      callerKeyDown?.(event);
      const { key } = event.nativeEvent;
      space.current = key === ' ';
      if (key === 'Escape') {
        event.preventDefault?.();
        dismiss('escape');
      } else if (key === 'Tab') {
        // Focus stays in the menu until it closes, and then goes back to the anchor (MNU-5; the next Tab moves on).
        event.preventDefault?.();
        dismiss('tab');
      }
    },
    [callerKeyDown, dismiss],
  );
  const firstEnabled = model.rows.findIndex((each) => !each.entry.disabled);
  const first = firstEnabled >= 0 ? firstEnabled : model.rows.length > 0 ? 0 : -1;
  const roving = useRovingFocus({ labels: model.rows.map((each) => each.entry.label ?? ''), wrap: true, preferred: first, onKeyDown });

  // The rows' host views, for the screen reader's focus (the roving focus moves the keyboard's).
  const rowNodes = useRef(new Map<number, FocusableNode>());
  const rowRefs = useRef(new Map<number, (node: FocusableNode | null) => void>());
  const itemRef = useCallback(
    (index: number) => {
      let ref = rowRefs.current.get(index);
      if (!ref) {
        const inner = roving.itemRef(index);
        ref = (node: FocusableNode | null) => {
          inner(node);
          if (node) rowNodes.current.set(index, node);
          else rowNodes.current.delete(index);
        };
        rowRefs.current.set(index, ref);
      }
      return ref;
    },
    [roving.itemRef],
  );

  // MNU-1: focus moves to the first enabled item when the menu opens, and back to the anchor when it closes (if it
  // was inside): an operated overlay takes focus and returns it although it is not modal. MNU-5: focus that
  // leaves the menu (an item lost it and no other item took it) asks to close, `'focus-out'`.
  const visibleNow = useRef(visible);
  visibleNow.current = visible;
  const focusedAt = useRef(0);
  const onItemFocus = useCallback(
    (index: number) => {
      focusInside.current = true;
      focusedAt.current = requests.current;
      roving.itemFocused(index);
    },
    [roving.itemFocused],
  );
  const onItemBlur = useCallback(() => {
    focusInside.current = false;
    if (inline) return;
    // Focus moving between items blurs one and focuses the next in the same pass: wait for it.
    const since = focusedAt.current;
    setTimeout(() => {
      if (!focusInside.current && visibleNow.current && requests.current === since) dismiss('focus-out');
    }, 0);
  }, [inline, dismiss]);
  const opened = useRef(false);
  const focusFirst = useCallback(() => {
    if (first < 0) return;
    roving.focusItem(first);
    // The screen reader's focus too: the surface is drawn at the end of the app's content, not in a window of its own.
    const node = rowNodes.current.get(first);
    if (node) {
      try {
        AccessibilityInfo.sendAccessibilityEvent(node as never, 'focus');
      } catch {
        // Not a host view: keyboard focus only.
      }
    }
  }, [first, roving.focusItem]);
  useEffect(() => {
    if (inline) return;
    if (visible && !opened.current) {
      opened.current = true;
      returnFocus.current = false;
      focusFirst();
    } else if (!visible && opened.current) {
      opened.current = false;
      if (focusInside.current || returnFocus.current) anchorRef?.current?.focus?.();
      focusInside.current = false;
    }
  }, [visible, inline, focusFirst, anchorRef]);

  // MNU-6: activation of each kind; after it, the menu asks to close — unless a Space switched a checkbox or radio item.
  const activate = useCallback(
    (row: RowModel, event: GestureResponderEvent) => {
      const bySpace = space.current;
      space.current = false;
      if (row.kind === 'item') {
        (row.entry as MenuItem).onPress?.(event);
        dismiss('item');
        return;
      }
      if (row.kind === 'checkbox-item') (row.entry as MenuCheckboxItem).onCheckedChange?.(!row.checked);
      else if (row.group && !row.checked) row.group.onValueChange?.((row.entry as MenuRadioItem).value);
      if (!bySpace) dismiss('item');
    },
    [dismiss],
  );
  const onTouch = useCallback(() => {
    space.current = false;
  }, []);

  const surface = (
    <MenuSurface
      model={model}
      tokens={tokens}
      theme={theme}
      inline={inline}
      tabStop={roving.tabStop}
      itemRef={itemRef}
      onItemFocus={onItemFocus}
      onItemBlur={onItemBlur}
      onPointerEnter={roving.focusItem}
      onActivate={activate}
      onTouch={onTouch}
      positionText={positionText}
      accessibilityLabel={accessibilityLabel}
      keyHandler={roving.onKeyDown}
      rest={rest}
      style={style}
      testID={testID}
    />
  );

  if (inline) return visible ? surface : null;
  return (
    <MenuOverlay visible={visible} anchorRef={anchorRef} placement={placement} tokens={tokens} theme={theme} onDismiss={dismiss} onPlaced={focusFirst} testID={testID} where={where}>
      {surface}
    </MenuOverlay>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The overlay (MNU-1, MNU-2, MNU-4, MNU-5, MNU-25)

interface MenuOverlayProps {
  visible: boolean;
  anchorRef: RefObject<MenuAnchor | null> | undefined;
  placement: MenuPlacement;
  tokens: TanreiMenuTokens;
  theme: TanreiTheme;
  onDismiss: (reason: MenuDismissReason) => void;
  /** The surface was placed for the first time since it opened: focus moves in. */
  onPlaced: () => void;
  testID: string | undefined;
  where: string;
  children: ReactNode;
}

interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

function MenuOverlay({ visible, anchorRef, placement, tokens, theme, onDismiss, onPlaced, testID, where, children }: MenuOverlayProps) {
  const window = useWindowDimensions();
  const insets = useTanreiInsets();
  const reduce = useReduceMotion();
  const [present, setPresent] = useState(visible);
  const [anchor, setAnchor] = useState<MenuBox | null>(null);
  // The layer's box in the window: the viewport the surface is placed in, and what anchor coordinates are relative to.
  const [area, setArea] = useState<MenuBox | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const part = (name: string) => partTestID(testID, name);
  const layerRef = useRef<{ current: Measurable | null } | null>(null);
  const owner = useContext(MenuOwnerContext);

  // MNU-2: the anchor (and the layer it is drawn in) is measured when the menu opens, when the surface is laid out and
  // whenever the window changes (rotation, split view).
  const measure = useCallback(() => {
    const node = anchorRef?.current;
    const same = (a: MenuBox | null, b: MenuBox) => a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    if (node?.measureInWindow) node.measureInWindow((x, y, width, height) => setAnchor((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
    else setAnchor((previous) => previous ?? { x: 0, y: 0, width: 0, height: 0 });
    const layer = layerRef.current?.current;
    if (layer?.measureInWindow) layer.measureInWindow((x, y, width, height) => setArea((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
  }, [anchorRef]);
  useEffect(() => {
    if (!visible) return;
    setPresent(true);
    measure();
  }, [visible, measure, window.width, window.height]);
  const placedOnce = useRef(false);
  useEffect(() => {
    if (!visible) placedOnce.current = false;
  }, [visible]);
  const onSurfaceLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
      measure();
    },
    [measure],
  );

  // The layer fills the provider's parent (the window, with the provider at the app's root); the insets are the
  // window's, so each counts only where it reaches into the layer.
  const box = area ?? { x: 0, y: 0, width: window.width, height: window.height };
  const within: TanreiResolvedInsets = {
    top: Math.max(0, insets.top - box.y),
    left: Math.max(0, insets.left - box.x),
    bottom: Math.max(0, insets.bottom - (window.height - box.y - box.height)),
    right: Math.max(0, insets.right - (window.width - box.x - box.width)),
  };
  const relative = anchor ? { ...anchor, x: anchor.x - box.x, y: anchor.y - box.y } : null;
  const position = relative && size ? placeMenu({ anchor: relative, surface: size, viewport: box, placement, offset: tokens.surfaceOffset, margin: tokens.surfaceViewportMargin, rtl: I18nManager.isRTL, insets: within }) : null;
  const placed = position !== null;
  // MNU-1: focus moves in once the surface is in place (its rows exist then, in the layer).
  useEffect(() => {
    if (visible && placed && !placedOnce.current) {
      placedOnce.current = true;
      onPlaced();
    }
  }, [visible, placed, onPlaced]);

  // MNU-5: Android's back button asks to close while the menu is open.
  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss('back');
      return true;
    });
    return () => subscription.remove();
  }, [visible, onDismiss]);

  // MNU-4: it fades in and grows from the edge that faces the anchor over the open motion once it is placed, and fades
  // out over the close motion before it leaves; at once where motion is reduced.
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

  const grow: ViewStyle = position?.side === 'top' ? { transformOrigin: 'bottom' } : { transformOrigin: 'top' };
  // MNU-1 / MNU-25: drawn in TanreiProvider's overlay layer, above the app's content — not in a `Modal`, which is a
  // window of its own that would make the screen behind it unreachable. No scrim.
  const node = present ? (
    <TanreiThemeScope theme={theme}>
      <View style={FILL} pointerEvents="box-none" testID={part('overlay')}>
        {/* MNU-5: a press outside the surface closes the menu; it does not reach what is under it. Not an element for assistive technology. */}
        <Pressable
          style={FILL}
          onPress={(event: GestureResponderEvent) => {
            const touch = event?.nativeEvent;
            if (owner && touch && typeof touch.pageX === 'number' && owner.claimsOutsidePress({ x: touch.pageX, y: touch.pageY })) return;
            onDismiss('outside');
          }}
          accessible={false}
          focusable={false}
          importantForAccessibility="no"
          accessibilityElementsHidden
          pointerEvents={visible ? 'auto' : 'none'}
          testID={part('outside')}
        />
        <Animated.View
          onLayout={onSurfaceLayout}
          pointerEvents={visible ? 'box-none' : 'none'}
          style={[
            // Layer coordinates: `left` is physical, whatever the layout direction.
            { position: 'absolute', top: position?.top ?? 0, left: position?.left ?? 0, maxHeight: position?.maxHeight },
            // Until it is placed it is laid out unseen, to be measured.
            { opacity: placed ? progress : 0, transform: [{ scaleY: progress }], ...grow },
          ]}
          testID={part('placement')}
        >
          {children}
        </Animated.View>
      </View>
    </TanreiThemeScope>
  ) : null;
  const portal = useOverlayPortal('menu', node);
  layerRef.current = portal.layer as { current: Measurable | null } | null;
  // The overlay layer is TanreiProvider's: without one there is nowhere to draw.
  const unhosted = visible && !portal.hosted;
  useEffect(() => {
    if (__DEV__ && unhosted) console.warn(`Tanrei: a Menu${where} opened outside a TanreiProvider, which hosts the overlay layer it is drawn in; it is not drawn.`);
  }, [unhosted, where]);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The surface and its rows

interface MenuSurfaceProps {
  model: MenuModel;
  tokens: TanreiMenuTokens;
  theme: TanreiTheme;
  inline: boolean;
  tabStop: number;
  itemRef: (index: number) => (node: FocusableNode | null) => void;
  onItemFocus: (index: number) => void;
  onItemBlur: () => void;
  onPointerEnter: (index: number) => void;
  onActivate: (row: RowModel, event: GestureResponderEvent) => void;
  onTouch: () => void;
  positionText: (position: number, count: number) => string;
  accessibilityLabel: string | undefined;
  keyHandler: (event: KeyDownEvent) => void;
  rest: Omit<ViewProps, 'children' | 'style'>;
  style: StyleProp<ViewStyle> | undefined;
  testID: string | undefined;
}

function MenuSurface({ model, tokens, theme, inline, tabStop, itemRef, onItemFocus, onItemBlur, onPointerEnter, onActivate, onTouch, positionText, accessibilityLabel, keyHandler, rest, style, testID }: MenuSurfaceProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const count = model.rows.length;
  const labelStart = tokens.containerPaddingInline + (model.markColumn ? tokens.markSize + tokens.containerGap : 0) + (model.iconColumn ? tokens.leadingIconSize + tokens.containerGap : 0);

  const renderRow = (row: RowModel) => (
    <MenuRow
      key={row.index}
      row={row}
      count={count}
      markColumn={model.markColumn}
      iconColumn={model.iconColumn}
      tokens={tokens}
      theme={theme}
      tabStop={tabStop === row.index}
      focusRef={itemRef(row.index)}
      onFocused={onItemFocus}
      onBlurred={onItemBlur}
      onPointerEnter={onPointerEnter}
      onActivate={onActivate}
      onTouch={onTouch}
      positionText={positionText}
      testID={row.entry.testID ?? partTestID(testID, `item.${row.index}`)}
    />
  );

  // MNU-23: a divider between a group and whatever is next to it — never before the first or after the last element —
  // inside the surface's padding (comp.menu.surface.padding-inline), the same inset as the rows.
  const content: ReactNode[] = [];
  model.blocks.forEach((block, i) => {
    const previous = model.blocks[i - 1];
    if (previous && (previous.type === 'group' || block.type === 'group')) {
      content.push(
        <View
          key={`divider.${i}`}
          accessible
          role="separator"
          style={{ height: tokens.dividerThickness, marginVertical: tokens.dividerSpace, backgroundColor: theme.paint(tokens.dividerColor) }}
          testID={part(`divider.${i}`)}
        />,
      );
    }
    if (block.type === 'row') {
      content.push(renderRow(block.row));
      return;
    }
    const title = block.group.title?.trim() ? block.group.title : '';
    // MNU-24 / MNU-28: a group, named by its title; the title is a heading that takes no focus, where the labels start.
    const titleStyle: TextStyle = { ...theme.text(tokens.groupTitleTypescale), paddingStart: labelStart, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.containerPaddingBlock };
    content.push(
      <View key={`group.${i}`} role="group" accessibilityLabel={title || undefined} testID={part(`group.${block.index}`)}>
        {title ? (
          <Label style={titleStyle} color={theme.paint(tokens.groupTitleColor)} testID={part(`group.${block.index}.title`)}>
            {title}
          </Label>
        ) : null}
        {block.rows.map(renderRow)}
      </View>,
    );
  });

  // MNU-3: as wide as its widest item within the width bounds; its color, corners and elevation; its items clipped to
  // its shape and inset by its padding. The elevation is drawn outside the clip.
  const elevation = theme.elevation(tokens.surfaceElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.surfaceColor);
  const surfaceStyle: ViewStyle = {
    alignSelf: 'flex-start',
    minWidth: tokens.surfaceMinWidth,
    maxWidth: tokens.surfaceMaxWidth,
    borderRadius: tokens.surfaceShape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.surfaceColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const clip: ViewStyle = { overflow: 'hidden', borderRadius: tokens.surfaceShape, flexShrink: 1, ...borderCurveOf(cornerSmoothing) };
  const padding: ViewStyle = { paddingVertical: tokens.surfacePaddingBlock, paddingStart: tokens.surfacePaddingInline, paddingEnd: tokens.surfacePaddingInline };
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: keyHandler } as object;
  return (
    <View {...rest} {...keys} role="menu" accessibilityLabel={accessibilityLabel} style={[surfaceStyle, style]} testID={testID}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.surfaceShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      <View style={clip} testID={part('clip')}>
        {inline ? (
          <View style={padding}>{content}</View>
        ) : (
          // MNU-2: taller than the room left, the items scroll.
          <ScrollView contentContainerStyle={padding} bounces={false} testID={part('scroll')}>
            {content}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Part = 'label' | 'supportingText' | 'trailingText' | 'leadingIcon' | 'trailingIcon' | 'mark';

function rowPaints(state: TanreiMenuConditionStateTokens) {
  return {
    container: state.containerColor,
    label: state.labelColor,
    supportingText: state.supportingTextColor,
    trailingText: state.trailingTextColor,
    leadingIcon: state.leadingIconColor,
    trailingIcon: state.trailingIconColor,
    mark: state.markColor,
  };
}

interface MenuRowProps {
  row: RowModel;
  count: number;
  markColumn: boolean;
  iconColumn: boolean;
  tokens: TanreiMenuTokens;
  theme: TanreiTheme;
  tabStop: boolean;
  focusRef: (node: FocusableNode | null) => void;
  onFocused: (index: number) => void;
  onBlurred: () => void;
  onPointerEnter: (index: number) => void;
  onActivate: (row: RowModel, event: GestureResponderEvent) => void;
  onTouch: () => void;
  positionText: (position: number, count: number) => string;
  testID: string | undefined;
}

function MenuRow({ row, count, markColumn, iconColumn, tokens, theme, tabStop, focusRef, onFocused, onBlurred, onPointerEnter, onActivate, onTouch, positionText, testID }: MenuRowProps) {
  const { entry, kind, checked, index } = row;
  const { label = '', supportingText = '', trailingText = '', leadingIcon, trailingIcon, disabled = false } = entry;
  const destructive = kind === 'item' && (entry as MenuItem).destructive === true;
  // MNU-18: destructive for a destructive action, selected for a checked checkbox or radio item, else unselected.
  const condition: TanreiCoreMenuCondition = destructive ? 'destructive' : checked ? 'selected' : 'unselected';
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'Menu condition');
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  // MNU-12: at least the touch target tall; stacked rows never extend a hit area over each other.
  const target = theme.system.measure.target.touch;
  const minHeight = Math.max(tokens.containerHeight, target);

  // MNU-8: a pointer moving onto the item moves focus there — drawn hovered, without the focus ring.
  const [pointerFocus, setPointerFocus] = useState(false);
  const handleHoverIn = useCallback(() => {
    setPointerFocus(true);
    onPointerEnter(index);
  }, [onPointerEnter, index]);
  const handleFocus = useCallback(() => onFocused(index), [onFocused, index]);
  const handleBlur = useCallback(() => {
    setPointerFocus(false);
    onBlurred();
  }, [onBlurred]);
  const handlePress = useCallback((event: GestureResponderEvent) => onActivate(row, event), [onActivate, row]);

  // MNU-10, MNU-13, MNU-15, MNU-16, MNU-27: the state that wins, its tokens, the press hold, the ripple and the motion.
  const drawnRow = useItemRow<Part>({
    pressable: true,
    disabled,
    condition,
    paints: (state) => rowPaints(appearance[state]),
    shapes: tokens,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: target, height: minHeight },
    ref: focusRef as unknown as RefObject<PressableHost>,
    pointerFocus,
    onPress: handlePress,
    onPressIn: onTouch,
    onHoverIn: handleHoverIn,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });
  const { drawn, colors, interaction } = drawnRow;
  const shape = stateShape(tokens, drawnRow.state).shape;
  // MNU-22: the check draws along its path over the state motion when checked changes (at once where motion is reduced).
  const check = useStateTransition({ progress: checked ? 1 : 0 }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing }).progress as Moving<number>;

  // MNU-21: glyphs at their sizes, in the family and fill of the item's condition.
  const leadingGlyph = iconGlyphStyle(theme.system.icon, tokens.leadingIconSize, { selected: checked, resolveFont: theme.resolveIconFont });
  const trailingGlyph = iconGlyphStyle(theme.system.icon, tokens.trailingIconSize, { selected: checked, resolveFont: theme.resolveIconFont });
  const drawsTrailingIcon = hasGlyph(trailingIcon);

  // Every side element is centered on the label's FIRST line (the checkbox's and radio button's rule): a line box as
  // tall as the first line or the tallest side element, the label moved down when an element is taller than its line.
  const labelStyle = theme.text(tokens.labelTypescale);
  const [firstLine, setFirstLine] = useState<number | null>(null);
  const onLabelLayout = useCallback((event: TextLayoutEvent) => {
    const line = event.nativeEvent.lines[0];
    if (line) setFirstLine((previous) => (previous === line.height ? previous : line.height));
  }, []);
  const lineHeight = firstLine ?? (typeof labelStyle.lineHeight === 'number' ? labelStyle.lineHeight : tokens.leadingIconSize);
  const tallest = Math.max(markColumn ? tokens.markSize : 0, iconColumn ? tokens.leadingIconSize : 0, drawsTrailingIcon ? tokens.trailingIconSize : 0);
  const lineBox = Math.max(lineHeight, tallest);
  const labelShift = (lineBox - lineHeight) / 2;
  const onFirstLine = (width: number): ViewStyle => ({ width, height: lineBox, justifyContent: 'center', alignItems: 'center' });

  // MNU-19 / MNU-20: one row — the padding at each end (logical: it mirrors in right-to-left), the mark and icon columns
  // (kept in every row), the label and supporting text taking the rest, the trailing text and icon, the gap between them.
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight,
    paddingStart: tokens.containerPaddingInline,
    paddingEnd: tokens.containerPaddingInline,
    paddingVertical: tokens.containerPaddingBlock,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(drawnRow.container, drawn.container), borderRadius: drawn.shape, opacity: drawn.opacity };

  // MNU-24: named by the label, described by the supporting text and the shortcut (React Native has no shortcut
  // property); its position and the menu's size; checked for a checkbox or radio item.
  const description = [supportingText, trailingText].filter(Boolean).join(', ');
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={NO_SLOP}
      testID={testID}
      disabled={disabled}
      // MNU-7: only the tab stop is focusable; the arrow keys make another item the tab stop.
      focusable={tabStop}
      role="menuitem"
      accessibilityLabel={label}
      accessibilityHint={description || undefined}
      accessibilityValue={{ text: positionText(index + 1, count) }}
      accessibilityState={kind === 'item' ? { disabled } : { disabled, checked }}
      style={[rowStyle, surface]}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={drawnRow.rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: tokens.containerGap }} testID={part('content')}>
        {markColumn ? (
          <View style={onFirstLine(tokens.markSize)} testID={part('mark')} {...HIDDEN}>
            <View style={{ width: tokens.markSize, height: tokens.markSize }}>
              <CheckMark progress={check} color={drawn.mark} side={tokens.markSize} stroke={tokens.markWidth} testID={part('check')} />
            </View>
          </View>
        ) : null}
        {iconColumn ? (
          <View style={onFirstLine(tokens.leadingIconSize)} testID={part('icon-column')}>
            {hasGlyph(leadingIcon) ? (
              <IconBox
                icon={glyphSlotContent(leadingIcon, { color: colors.leadingIcon, size: tokens.leadingIconSize, glyph: leadingGlyph }, drawn.leadingIcon, part('leading-icon.glyph'))}
                color={colors.leadingIcon}
                size={tokens.leadingIconSize}
                decorative
                testID={part('leading-icon')}
              />
            ) : null}
          </View>
        ) : null}
        <View style={{ flex: 1, paddingTop: labelShift }} testID={part('text')}>
          <Label style={labelStyle} color={drawn.label} onTextLayout={onLabelLayout} testID={part('label')}>
            {label}
          </Label>
          {supportingText ? (
            <Label style={theme.text(tokens.supportingTextTypescale)} color={drawn.supportingText} testID={part('supporting-text')}>
              {supportingText}
            </Label>
          ) : null}
        </View>
        {trailingText ? (
          <View style={{ minHeight: lineBox, justifyContent: 'center' }}>
            <Label style={theme.text(tokens.trailingTextTypescale)} color={drawn.trailingText} testID={part('trailing-text')}>
              {trailingText}
            </Label>
          </View>
        ) : null}
        {drawsTrailingIcon ? (
          <View style={onFirstLine(tokens.trailingIconSize)}>
            <IconBox
              icon={glyphSlotContent(trailingIcon, { color: colors.trailingIcon, size: tokens.trailingIconSize, glyph: trailingGlyph }, drawn.trailingIcon, part('trailing-icon.glyph'))}
              color={colors.trailingIcon}
              size={tokens.trailingIconSize}
              decorative
              testID={part('trailing-icon')}
            />
          </View>
        ) : null}
      </View>
      {/* MNU-11: inside the row, which the surface would otherwise clip; never animated. */}
      <FocusRing visible={interaction.focused} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

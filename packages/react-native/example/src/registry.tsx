// What the gallery shows: one entry per implemented component — its spec (read for the title and the fixtures) and how
// a fixture's props become the element. Adding a component to the gallery is adding ONE entry here; a test fails while
// an implemented component (`src/components/<Pascal>.tsx`) has none.
//
// Specs are imported statically: Metro bundles JSON imports, it cannot list a directory at run time.
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  AppBar,
  Badge,
  BottomSheetSurface,
  Button,
  ButtonGroup,
  Card,
  Carousel,
  CarouselItem,
  Checkbox,
  Chip,
  DatePickerSurface,
  DialogSurface,
  Divider,
  ExtendedFloatingActionButton,
  FabMenu,
  List,
  Menu,
  NavigationBar,
  NavigationDrawer,
  NavigationRail,
  FloatingActionButton,
  IconButton,
  LoadingIndicator,
  ProgressIndicator,
  RadioButton,
  RadioGroup,
  Search,
  SideSheetSurface,
  SegmentedButton,
  Slider,
  SplitButton,
  Snackbar,
  Switch,
  Tabs,
  TextField,
  TimePickerSurface,
  Toolbar,
  Tooltip,
  iconGlyphStyle,
  useContentColor,
  useTanrei,
  type AppBarProps,
  type BadgeProps,
  type BottomSheetProps,
  type ButtonGroupProps,
  type ButtonProps,
  type CardProps,
  type CarouselProps,
  type CheckboxProps,
  type ChipProps,
  type DatePickerProps,
  type TimePickerProps,
  type DialogProps,
  type DividerProps,
  type ExtendedFloatingActionButtonProps,
  type FabMenuItem,
  type FabMenuProps,
  type FloatingActionButtonProps,
  type IconButtonProps,
  type ListItem,
  type ListProps,
  type MenuEntry,
  type MenuProps,
  type NavigationBarDestination,
  type NavigationBarProps,
  type NavigationDrawerItem,
  type NavigationDrawerProps,
  type NavigationRailProps,
  type LoadingIndicatorProps,
  type ProgressIndicatorProps,
  type RadioButtonProps,
  type SearchProps,
  type SideSheetProps,
  type SearchSuggestion,
  type Segment,
  type SegmentedButtonProps,
  type SliderProps,
  type SplitButtonProps,
  type SnackbarProps,
  type SwitchProps,
  type Tab,
  type TabsProps,
  type TextFieldProps,
  type ToolbarProps,
  type TooltipProps,
} from '@tanrei/react-native';
import appBarSpec from '../../../../specs/app-bar.spec.json';
import badgeSpec from '../../../../specs/badge.spec.json';
import bottomSheetSpec from '../../../../specs/bottom-sheet.spec.json';
import buttonSpec from '../../../../specs/button.spec.json';
import buttonGroupSpec from '../../../../specs/button-group.spec.json';
import cardSpec from '../../../../specs/card.spec.json';
import carouselSpec from '../../../../specs/carousel.spec.json';
import checkboxSpec from '../../../../specs/checkbox.spec.json';
import chipSpec from '../../../../specs/chip.spec.json';
import datePickerSpec from '../../../../specs/date-picker.spec.json';
import dialogSpec from '../../../../specs/dialog.spec.json';
import dividerSpec from '../../../../specs/divider.spec.json';
import extendedFabSpec from '../../../../specs/extended-fab.spec.json';
import fabSpec from '../../../../specs/fab.spec.json';
import fabMenuSpec from '../../../../specs/fab-menu.spec.json';
import iconButtonSpec from '../../../../specs/icon-button.spec.json';
import listSpec from '../../../../specs/list.spec.json';
import menuSpec from '../../../../specs/menu.spec.json';
import navigationBarSpec from '../../../../specs/navigation-bar.spec.json';
import navigationDrawerSpec from '../../../../specs/navigation-drawer.spec.json';
import navigationRailSpec from '../../../../specs/navigation-rail.spec.json';
import loadingIndicatorSpec from '../../../../specs/loading-indicator.spec.json';
import progressIndicatorSpec from '../../../../specs/progress-indicator.spec.json';
import radioButtonSpec from '../../../../specs/radio-button.spec.json';
import searchSpec from '../../../../specs/search.spec.json';
import sideSheetSpec from '../../../../specs/side-sheet.spec.json';
import segmentedButtonSpec from '../../../../specs/segmented-button.spec.json';
import sliderSpec from '../../../../specs/slider.spec.json';
import splitButtonSpec from '../../../../specs/split-button.spec.json';
import snackbarSpec from '../../../../specs/snackbar.spec.json';
import switchSpec from '../../../../specs/switch.spec.json';
import tabsSpec from '../../../../specs/tabs.spec.json';
import textFieldSpec from '../../../../specs/text-field.spec.json';
import timePickerSpec from '../../../../specs/time-picker.spec.json';
import toolbarSpec from '../../../../specs/toolbar.spec.json';
import tooltipSpec from '../../../../specs/tooltip.spec.json';

/** The part of a spec the gallery reads. */
/** What a fixture's string in a slot becomes. */
export type GallerySlotKind = 'glyph' | 'icon-only-button' | 'button' | 'text';

export interface GallerySpec {
  name: string;
  title: string;
  slots?: readonly { name: string; fixture?: string }[];
  fixtures: readonly GalleryFixture[];
  platforms: { 'react-native': { name: string; props: Readonly<Record<string, string>>; items?: Readonly<Record<string, { props: Readonly<Record<string, string>> }>> } };
}

/** One of a fixture's items: its kind, its props, and a group's own items. */
export interface GalleryItem {
  kind: string;
  props: Readonly<Record<string, unknown>>;
  content?: string;
  items?: readonly GalleryItem[];
}

export interface GalleryFixture {
  id: string;
  props: Readonly<Record<string, unknown>>;
  content?: string;
  items?: readonly GalleryItem[];
  /** Named slots the fixture fills. A slot one fixture of a spec leaves out is `undefined` in the JSON's inferred type. */
  slots?: Readonly<Record<string, string | readonly string[] | undefined>>;
}

export interface GalleryEntry {
  spec: GallerySpec;
  /** Props under their React Native names (`children` = the fixture's content, `testID`) → the element. */
  render: (props: Record<string, unknown> & { testID: string }) => ReactElement;
}

function entry<Props extends object>(spec: GallerySpec, render: (props: Props & { testID: string }) => ReactElement): GalleryEntry {
  return { spec, render: render as GalleryEntry['render'] };
}

/**
 * A divider spans the length its layout gives it: a vertical one needs a row with a height to be seen, so the gallery
 * puts it in one (a fixture of the gallery, not of the component).
 */
function DividerFrame({ orientation, children }: { orientation?: string; children: ReactNode }) {
  const { system } = useTanrei();
  if (orientation !== 'vertical') return <>{children}</>;
  return <View style={{ flexDirection: 'row', height: system.space.space600 }}>{children}</View>;
}

/** A sheet's stage (the spec's snapshot harness): a page in the system's `surface` role, the size the spec names. */
function SurfacePage({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const { color } = useTanrei();
  return <View style={{ width, height, backgroundColor: color('surface') }}>{children}</View>;
}

/** A carousel item's fixture content: its glyph, centred, at sys.icon.large (unselected), in the item's content color. */
function ItemGlyph({ name }: { name: string }) {
  const theme = useTanrei();
  const color = useContentColor();
  const glyph = iconGlyphStyle(theme.system.icon, theme.system.measure.icon.large, { selected: false, resolveFont: theme.resolveIconFont });
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[glyph.style, { color }]} allowFontScaling={false}>
        {name}
      </Text>
    </View>
  );
}

/** A text field fixture's `content` names its icons: `leading-icon=search trailing-icon=close`. */
function iconSlots(content: string | undefined): Pick<TextFieldProps, 'leadingIcon' | 'trailingIcon'> {
  const slots: Pick<TextFieldProps, 'leadingIcon' | 'trailingIcon'> = {};
  for (const pair of (content ?? '').split(/\s+/).filter(Boolean)) {
    const [slot, glyph] = pair.split('=');
    if (slot === 'leading-icon') slots.leadingIcon = glyph;
    if (slot === 'trailing-icon') slots.trailingIcon = glyph;
  }
  return slots;
}

/**
 * The image a chip fixture's `content: "avatar"` stands for: one neutral grey pixel, no person and no text (the same one
 * the tests draw).
 */
const FIXTURE_AVATAR = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOYN28eAAO4AdvqohIbAAAAAElFTkSuQmCC' };

/**
 * A list fixture's item as a `ListItem` (the entry receives the fixture's items): its `kind` dropped, the
 * spec's `interactive: true` (mapped to `onPress`) a handler, and an avatar's monogram the headline's first letter
 * (LST-16's `verify`).
 */
function listItemOf({ kind: _kind, onPress, ...item }: Omit<ListItem, 'onPress'> & { kind?: string; onPress?: boolean }): ListItem {
  return { ...item, onPress: onPress ? () => undefined : undefined, ...(item.leadingMedia === 'avatar' ? { leading: item.headline.slice(0, 1) } : null) };
}

/** A fixture item that is an icon button (`component: "icon-button"`): its label and its glyph. */
interface IconButtonItem {
  kind: string;
  accessibilityLabel?: string;
  children?: string;
}

/** The icon buttons of one item kind, in order: one element, several in a fragment, none as undefined. */
function iconButtons(items: readonly IconButtonItem[], kind: string): ReactNode {
  const buttons = items
    .filter((item) => item.kind === kind)
    .map((item, index) => (
      <IconButton key={index} accessibilityLabel={item.accessibilityLabel}>
        {item.children}
      </IconButton>
    ));
  if (buttons.length === 0) return undefined;
  return buttons.length === 1 ? buttons[0] : <Fragment>{buttons}</Fragment>;
}

/**
 * A fixture's destination as the entry receives it: `badgeCount` arrives as `count` and `badgeLabel` keeps its
 * spec name (its React Native name, the badge's `label`, is the destination's label's too); nested as `badge` while the
 * fixture's `badge` is true.
 */
interface FixtureDestination {
  kind?: string;
  value: string;
  label: string;
  icon: string;
  disabled?: boolean;
  badge?: boolean;
  count?: number | null;
  badgeLabel?: string;
}
function destinationOf({ kind: _kind, badge, count, badgeLabel, ...destination }: FixtureDestination): NavigationBarDestination {
  return { ...destination, ...(badge ? { badge: { count: count ?? null, label: badgeLabel ?? '' } } : null) };
}

/** A drawer fixture's item: its `kind` dropped, a section's items too (the `items` array tells a section apart). */
type FixtureDrawerItem = { kind?: string; items?: FixtureDrawerItem[] } & Record<string, unknown>;
function drawerItemOf({ kind: _kind, items, ...item }: FixtureDrawerItem): NavigationDrawerItem {
  return (items ? { ...item, items: items.map(drawerItemOf) } : item) as unknown as NavigationDrawerItem;
}

/** The registration table, keyed by spec name. */
export const COMPONENTS: Readonly<Record<string, GalleryEntry>> = {
  button: entry<ButtonProps>(buttonSpec, (props) => <Button {...props} />),
  // The fixture's items are icon buttons: the navigation item and the action items; the bar spans a 360-wide parent.
  'app-bar': entry<AppBarProps & { items?: IconButtonItem[] }>(appBarSpec, ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <AppBar {...props} navigation={iconButtons(items, 'navigation')} actions={iconButtons(items, 'action')} />
    </View>
  )),
  'icon-button': entry<IconButtonProps>(iconButtonSpec, (props) => <IconButton {...props} />),
  // A FAB fixture's `content` is the glyph: the `icon` prop on React Native.
  fab: entry<FloatingActionButtonProps & { children?: string }>(fabSpec, ({ children, ...props }) => <FloatingActionButton {...props} icon={children} />),
  'extended-fab': entry<ExtendedFloatingActionButtonProps & { children?: string }>(extendedFabSpec, ({ children, ...props }) => <ExtendedFloatingActionButton {...props} icon={children} />),
  // A chip fixture's `content` is its leading glyph (`icon`), or "avatar" (an input chip's image).
  chip: entry<ChipProps & { children?: string }>(chipSpec, ({ children, ...props }) => (children === 'avatar' ? <Chip {...props} avatar={FIXTURE_AVATAR} /> : <Chip {...props} icon={children} />)),
  badge: entry<BadgeProps>(badgeSpec, (props) => <Badge {...props} />),
  'loading-indicator': entry<LoadingIndicatorProps>(loadingIndicatorSpec, (props) => <LoadingIndicator {...props} />),
  'progress-indicator': entry<ProgressIndicatorProps>(progressIndicatorSpec, (props) => <ProgressIndicator {...props} />),
  checkbox: entry<CheckboxProps>(checkboxSpec, (props) => <Checkbox {...props} />),
  // The spec's `name` is the group an option belongs to: React Native forms it with a `RadioGroup` (named by it here).
  'radio-button': entry<RadioButtonProps & { RadioGroup?: string }>(radioButtonSpec, ({ RadioGroup: group, ...props }) => <RadioGroup accessibilityLabel={group}><RadioButton {...props} /></RadioGroup>),
  // SNK-19: a `Snackbar` element is drawn in place (no host, timeout or motion), in a 400-wide view.
  snackbar: entry<SnackbarProps>(snackbarSpec, (props) => (
    <View style={{ width: 400 }}>
      <Snackbar {...props} />
    </View>
  )),
  switch: entry<SwitchProps>(switchSpec, (props) => <Switch {...props} />),
  // The spec's `interactive` is the handler itself on React Native: a fixture's `interactive: true` arrives as `onPress`.
  card: entry<Omit<CardProps, 'onPress'> & { onPress?: boolean }>(cardSpec, ({ onPress, ...props }) => <Card {...props} onPress={onPress ? () => undefined : undefined} />),
  // The fixture's items are the list's `items`.
  list: entry<Omit<ListProps, 'items'> & { items: (Omit<ListItem, 'onPress'> & { kind?: string; onPress?: boolean })[] }>(listSpec, ({ items, ...props }) => (
    <List {...(props as ListProps)} items={items.map(listItemOf)} />
  )),
  // The fixture's items are the menu's `items` (each keeps its `kind`); the open menu is drawn in place (`inline`, MNU-19).
  menu: entry<Omit<MenuProps, 'items'> & { items: MenuEntry[] }>(menuSpec, (props) => <Menu {...props} inline />),
  // The fixture's items are the bar's destinations; the bar spans a 360-wide parent.
  'navigation-bar': entry<Omit<NavigationBarProps, 'destinations'> & { items?: FixtureDestination[] }>(navigationBarSpec, ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <NavigationBar {...props} destinations={items.map(destinationOf)} />
    </View>
  )),
  // The fixture's items are the drawer's destinations and sections. A standard drawer stands in a 640-high row; a modal
  // one is drawn in place (`inline`: its scrim over a 480 × 640 view) — a `Modal` would cover the gallery.
  'navigation-drawer': entry<Omit<NavigationDrawerProps, 'items'> & { items?: FixtureDrawerItem[] }>(navigationDrawerSpec, ({ items = [], variant, ...props }) =>
    variant === 'modal' ? (
      <View style={{ width: 480, height: 640 }}>
        <NavigationDrawer {...props} variant="modal" items={items.map(drawerItemOf)} inline />
      </View>
    ) : (
      <View style={{ height: 640, flexDirection: 'row' }}>
        <NavigationDrawer {...props} variant={variant} items={items.map(drawerItemOf)} />
      </View>
    ),
  ),
  // The fixture's items: header buttons (icon buttons, in the header) and destinations; the rail stands in a 640-high parent.
  'navigation-rail': entry<Omit<NavigationRailProps, 'destinations'> & { items?: (FixtureDestination & IconButtonItem)[] }>(navigationRailSpec, ({ items = [], ...props }) => (
    <View style={{ height: 640, flexDirection: 'row' }}>
      <NavigationRail {...props} header={iconButtons(items, 'header-button')} destinations={items.filter((item) => item.kind === 'destination').map(destinationOf)} />
    </View>
  )),
  // The fixture's items are Buttons and IconButtons (their content is the label or the glyph); BGR-1's verify: the group
  // at its natural width in a 400-wide stage.
  'button-group': entry<Omit<ButtonGroupProps, 'children'> & { items?: ({ kind: string; children?: string } & Record<string, unknown>)[] }>(buttonGroupSpec, ({ items = [], ...props }) => (
    <View style={{ width: 400, alignItems: 'flex-start' }}>
      <ButtonGroup {...props}>
        {items.map(({ kind, children, ...item }, index) =>
          kind === 'icon-button' ? (
            <IconButton key={index} {...(item as IconButtonProps)}>
              {children}
            </IconButton>
          ) : (
            <Button key={index} {...(item as ButtonProps)}>
              {children}
            </Button>
          ),
        )}
      </ButtonGroup>
    </View>
  )),
  // The fixture's items are the product's IconButtons (`action`) and Buttons (`button`). TBR-1 / TBR-4 / TBR-6's verify:
  // docked in a 360 × 56 stage; floating centered (by its layout, TBR-5) in a 360 × 96 stage, vertical in 96 × 240.
  toolbar: entry<Omit<ToolbarProps, 'children'> & { items?: ({ kind: string; children?: string } & Record<string, unknown>)[] }>(toolbarSpec, ({ items = [], ...props }) => (
    <View style={props.variant !== 'floating' ? { width: 360, height: 56 } : { width: props.orientation === 'vertical' ? 96 : 360, height: props.orientation === 'vertical' ? 240 : 96, alignItems: 'center', justifyContent: 'center' }}>
      <Toolbar {...props} style={props.variant === 'floating' ? { alignSelf: 'center' } : undefined}>
        {items.map(({ kind, children, ...item }, index) =>
          kind === 'action' ? (
            <IconButton key={index} {...(item as IconButtonProps)}>
              {children}
            </IconButton>
          ) : (
            <Button key={index} {...(item as ButtonProps)}>
              {children}
            </Button>
          ),
        )}
      </Toolbar>
    </View>
  )),
  // FBM-13's verify: the toggle at the inline-end bottom corner of a 320 × 320 stage, 16 from both edges; an open
  // fixture draws its items in place above it (`inline`).
  'fab-menu': entry<Omit<FabMenuProps, 'items'> & { items?: (FabMenuItem & { kind?: string })[] }>(fabMenuSpec, ({ items = [], ...props }) => (
    <View style={{ width: 320, height: 320 }}>
      <View style={{ position: 'absolute', bottom: 16, end: 16 }}>
        <FabMenu {...props} items={items.map(({ kind: _kind, ...item }) => item)} inline />
      </View>
    </View>
  )),
  // The fixture's items are the set's `items` (a `Segment` has no `kind`); SEG-14's verify: the set at its natural width
  // in a 400-wide stage.
  'segmented-button': entry<Omit<SegmentedButtonProps, 'items'> & { items: (Segment & { kind?: string })[] }>(segmentedButtonSpec, ({ items, ...props }) => (
    <View style={{ width: 400, alignItems: 'flex-start' }}>
      <SegmentedButton {...(props as SegmentedButtonProps)} items={items.map(({ kind: _kind, ...segment }) => segment)} />
    </View>
  )),
  // SRC-1 / SRC-7 / SRC-9's verify: the bar 328 wide centered in 360 × 72; docked open, the bar at the top of 360 × 320
  // with the view in place under it; full-screen open, the view in place in 360 × 480 (`inline`: no Modal, no overlay).
  search: entry<Omit<SearchProps, 'suggestions'> & { items?: (SearchSuggestion & { kind?: string })[] }>(searchSpec, ({ items = [], ...props }) => (
    <View
      style={
        props.presentation === 'full-screen' && props.expanded
          ? { width: 360, height: 480 }
          : props.expanded
            ? { width: 360, height: 320, paddingTop: 16, paddingHorizontal: 16 }
            : { width: 360, height: 72, justifyContent: 'center', paddingHorizontal: 16 }
      }
    >
      <Search {...props} suggestions={items.map(({ kind: _kind, ...suggestion }) => suggestion)} inline style={props.presentation === 'full-screen' && props.expanded ? { flex: 1 } : undefined} />
    </View>
  )),
  // SLD-7's verify: a horizontal slider 320 long, centered in a 320 × 96 stage; the vertical one 240 long in 96 × 240.
  slider: entry<SliderProps>(sliderSpec, (props) => (
    <View style={props.orientation === 'vertical' ? { width: 96, height: 240, alignItems: 'center' } : { width: 320, height: 96, justifyContent: 'center' }}>
      <Slider {...props} />
    </View>
  )),
  // SPB-12's verify: the split button at its natural width in a 320-wide stage; an open fixture shows the trailing
  // half's open form and presents no menu (a fixture cannot fill the menu slot).
  'split-button': entry<SplitButtonProps>(splitButtonSpec, (props) => (
    <View style={{ width: 320, alignItems: 'flex-start' }}>
      <SplitButton {...props} />
    </View>
  )),
  // The fixture's items are the row's `items` (a `Tab` has no `kind`); TAB-14's verify: one row 360 wide, no panel.
  tabs: entry<Omit<TabsProps, 'items'> & { items: (Tab & { kind?: string })[] }>(tabsSpec, ({ items, ...props }) => (
    <View style={{ width: 360 }}>
      <Tabs {...props} items={items.map(({ kind: _kind, ...tab }) => tab)} />
    </View>
  )),
  // The spec's snapshot harness: the anchor (an icon button with the fixture's glyph) and the open tooltip beside it,
  // drawn in place (`inline`) in a 320 × 200 view.
  tooltip: entry<Omit<TooltipProps, 'children'> & { children?: string }>(tooltipSpec, ({ children = '', testID, ...props }) => (
    <View style={{ width: 320, height: 200, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <Tooltip {...props} inline>
        <IconButton accessibilityLabel={children}>{children}</IconButton>
      </Tooltip>
    </View>
  )),
  'text-field': entry<TextFieldProps & { children?: string }>(textFieldSpec, ({ children, ...props }) => <TextField {...props} {...iconSlots(children)} />),
  // The spec's snapshot harness: `DialogSurface` (the scrim and the container) in place in a 480 × 640 view — a `Modal`
  // would cover the gallery. `visible` (the spec's open) is the Modal's; a fixture's content is the custom content.
  dialog: entry<DialogProps>(dialogSpec, ({ visible: _visible, ...props }) => (
    <View style={{ width: 480, height: 640 }}>
      <DialogSurface {...props} />
    </View>
  )),
  // The spec's snapshot harness (DTP-1's verify): `DatePickerSurface` in place — a modal picker's scrim and centred
  // container on a 480 × 640 stage, a docked one centred on a 400 × 440 stage — a `Modal` or the overlay layer would
  // cover the gallery. `visible` (the spec's open) is the Modal's and the overlay's.
  'date-picker': entry<DatePickerProps>(datePickerSpec, ({ visible: _visible, presentation, ...props }) =>
    presentation === 'docked' ? (
      <SurfacePage width={400} height={440}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <DatePickerSurface {...props} presentation="docked" />
        </View>
      </SurfacePage>
    ) : (
      <SurfacePage width={480} height={640}>
        <DatePickerSurface {...props} presentation={presentation} />
      </SurfacePage>
    ),
  ),
  // The spec's snapshot harness (TMP-1's verify): `TimePickerSurface` in place — the scrim and the centred container on a
  // 480 × 640 stage (720 × 480 for the horizontal layout); a `Modal` would cover the gallery. `visible` is the Modal's.
  'time-picker': entry<TimePickerProps>(timePickerSpec, ({ visible: _visible, ...props }) => (
    <SurfacePage width={props.layout === 'horizontal' ? 720 : 480} height={props.layout === 'horizontal' ? 480 : 640}>
      <TimePickerSurface {...props} />
    </SurfacePage>
  )),
  // The spec's snapshot harness: `BottomSheetSurface` (the sheet and, for a modal sheet, the scrim) in place in a
  // 400 × 720 view over the page — a `Modal` would cover the gallery. `open` is the Modal's.
  'bottom-sheet': entry<BottomSheetProps>(bottomSheetSpec, ({ open: _open, ...props }) => (
    <SurfacePage width={400} height={720}>
      <BottomSheetSurface {...props} />
    </SurfacePage>
  )),
  // The spec's snapshot harness: `SideSheetSurface` in place in a 720 × 480 view over the page — a standard sheet at the
  // end of a row, a modal one with its scrim over the stage (a `Modal` would cover the gallery). `open` is the row's / Modal's.
  'side-sheet': entry<SideSheetProps>(sideSheetSpec, ({ open: _open, variant, ...props }) => (
    <SurfacePage width={720} height={480}>
      {variant === 'modal' ? (
        <SideSheetSurface {...props} variant="modal" />
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <SideSheetSurface {...props} variant={variant} />
        </View>
      )}
    </SurfacePage>
  )),
  // The spec's stage: 400 × 200 over the page, the carousel filling it; a fixture item's content is its glyph, centred
  // at sys.icon.large in the item's content color (the item kind's slot note).
  carousel: entry<Omit<CarouselProps, 'children'> & { items?: { kind?: string; label?: string; children?: string }[] }>(carouselSpec, ({ items = [], ...props }) => (
    <SurfacePage width={400} height={200}>
      <Carousel {...props}>
        {items.map(({ kind: _kind, label, children }, index) => (
          <CarouselItem key={index} label={label}>
            <ItemGlyph name={children ?? ''} />
          </CarouselItem>
        ))}
      </Carousel>
    </SurfacePage>
  )),
  divider: entry<DividerProps>(dividerSpec, (props) => <DividerFrame orientation={props.orientation}><Divider {...props} /></DividerFrame>),
};

/** A fixture's items under their React Native names (`platforms.react-native.items.<kind>.props`), each keeping its `kind`. */
export function fixtureItems(spec: GallerySpec, items: readonly GalleryItem[]): Record<string, unknown>[] {
  const mappings = spec.platforms['react-native'].items ?? {};
  return items.map((item) => {
    const names = mappings[item.kind]?.props ?? {};
    // Two spec props may map to one name when the platform nests one of them (a destination's `label` and its
    // `badgeLabel`, the `label` of its `badge` object): the first keeps the name, a later one keeps its spec name.
    const props: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(item.props)) {
      const mapped = names[name] ?? name;
      props[mapped in props ? name : mapped] = value;
    }
    const mapped: Record<string, unknown> = { kind: item.kind, ...props };
    if (item.content !== undefined) mapped.children = item.content;
    if (item.items) mapped.items = fixtureItems(spec, item.items);
    return mapped;
  });
}

/**
 * One fixture string in a slot: a glyph is its name (the component's glyph slot draws it with the icon
 * helper), an icon button a standard `IconButton` showing the glyph and named by it, a button a text `Button`, text the
 * string itself.
 */
function slotElement(kind: string | undefined, value: string, key?: number): ReactNode {
  switch (kind as GallerySlotKind | undefined) {
    case 'icon-only-button':
      return (
        <IconButton key={key} accessibilityLabel={value}>
          {value}
        </IconButton>
      );
    case 'button':
      return (
        <Button key={key} variant="text">
          {value}
        </Button>
      );
    case 'glyph':
    case 'text':
      return value;
    default:
      throw new Error(`a fixture fills a slot that declares no fixture kind ("${kind}")`);
  }
}

/** A fixture's filled slots as props: the slot's name in camelCase, one element or several in a fragment. */
export function fixtureSlots(spec: GallerySpec, slots: Readonly<Record<string, string | readonly string[] | undefined>>): Record<string, ReactNode> {
  return Object.fromEntries(
    Object.entries(slots).flatMap(([name, value]) => (value === undefined ? [] : [[name, value] as const])).map(([name, value]) => {
      const kind = spec.slots?.find((slot) => slot.name === name)?.fixture;
      const prop = name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      return [prop, typeof value === 'string' ? slotElement(kind, value) : <Fragment>{value.map((each, index) => slotElement(kind, each, index))}</Fragment>];
    }),
  );
}

/** A fixture's props under their React Native names (the spec's `platforms.react-native.props`); `content` → `children`; `items` → `items`; `slots` → the slots' props. */
export function fixtureProps(spec: GallerySpec, fixture: GalleryFixture): Record<string, unknown> {
  const names = spec.platforms['react-native'].props;
  const props: Record<string, unknown> = Object.fromEntries(Object.entries(fixture.props).map(([name, value]) => [names[name] ?? name, value]));
  if (fixture.content !== undefined) props.children = fixture.content;
  if (fixture.items) props.items = fixtureItems(spec, fixture.items);
  if (fixture.slots) Object.assign(props, fixtureSlots(spec, fixture.slots));
  return props;
}

/** The testID of one fixture in the gallery: unique across components (`gallery.fixture.<component>.<fixture id>`). */
export const fixtureTestID = (component: string, fixture: string) => `gallery.fixture.${component}.${fixture}`;

/** The element of one fixture, as the gallery shows it. */
export function renderFixture(component: string, fixture: GalleryFixture, testID = fixtureTestID(component, fixture.id)): ReactElement {
  const registered = COMPONENTS[component];
  if (!registered) throw new Error(`the gallery has no entry for "${component}"`);
  return registered.render({ ...fixtureProps(registered.spec, fixture), testID });
}

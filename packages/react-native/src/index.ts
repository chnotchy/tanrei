// The public surface of @tanrei/react-native. Every value here is named in the README; `src/__tests__/index.test.ts`
// pins the list, so a helper that is only a building block (a ripple's geometry, a shadow's σ, a test hook) stays
// importable inside the package from its module, and never leaks through a wildcard.

// Components
export { AppBar, useAppBarScroll } from './components/AppBar';
export type { AppBarProps, AppBarRef, AppBarScroll, AppBarScrollState, AppBarSize, AppBarTitleAlignment } from './components/AppBar';
export { BottomSheet, BottomSheetSurface } from './components/BottomSheet';
export type { BottomSheetProps, BottomSheetSurfaceProps, BottomSheetVariant, BottomSheetDetent, BottomSheetCloseReason, BottomSheetRef } from './components/BottomSheet';
export type { SheetFocusTarget } from './primitives/sheet';
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonIconProps, ButtonRef } from './components/Button';
export { IconButton } from './components/IconButton';
export { ButtonGroup } from './components/ButtonGroup';
export type { ButtonGroupProps, ButtonGroupVariant, ButtonGroupRef } from './components/ButtonGroup';
export type { IconButtonProps, IconButtonVariant, IconButtonSize, IconButtonIconProps, IconButtonRef } from './components/IconButton';
export { FloatingActionButton } from './components/Fab';
export type { FloatingActionButtonProps, FloatingActionButtonVariant, FloatingActionButtonSize, FloatingActionButtonIconProps, FloatingActionButtonRef } from './components/Fab';
export { ExtendedFloatingActionButton } from './components/ExtendedFab';
export { FabMenu } from './components/FabMenu';
export type { FabMenuProps, FabMenuItem, FabMenuVariant, FabMenuSize, FabMenuIconProps, FabMenuDismissReason, FabMenuRef } from './components/FabMenu';
export type { ExtendedFloatingActionButtonProps, ExtendedFloatingActionButtonVariant, ExtendedFloatingActionButtonSize, ExtendedFloatingActionButtonIconProps, ExtendedFloatingActionButtonRef } from './components/ExtendedFab';
export { Chip } from './components/Chip';
export type { ChipProps, ChipKind, ChipVariant, ChipSize, ChipIconProps, ChipRef } from './components/Chip';
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps, CheckboxRef } from './components/Checkbox';
export { RadioButton, RadioGroup } from './components/RadioButton';
export type { RadioButtonProps, RadioButtonRef, RadioGroupProps } from './components/RadioButton';
export { Snackbar, useSnackbar } from './components/Snackbar';
export type { SnackbarProps, SnackbarOptions, SnackbarResult, SnackbarDismissReason, SnackbarDuration, SnackbarHost } from './components/Snackbar';
export { Switch } from './components/Switch';
export type { SwitchProps, SwitchRef } from './components/Switch';
export { Card } from './components/Card';
export { Carousel, CarouselItem } from './components/Carousel';
export type { CarouselProps, CarouselItemProps, CarouselLayout, CarouselRef, CarouselItemRef } from './components/Carousel';
export type { CardProps, CardRef, CardVariant } from './components/Card';
export { List } from './components/List';
export type { ListProps, ListItem, ListItemIconProps, ListSelectionMode, ListLeadingMedia, ListRef } from './components/List';
export { Menu } from './components/Menu';
export type { MenuProps, MenuEntry, MenuItem, MenuCheckboxItem, MenuRadioItem, MenuGroup, MenuItemIconProps, MenuPlacement, MenuDismissReason, MenuAnchor, MenuRef } from './components/Menu';
export { NavigationBar } from './components/NavigationBar';
export type { NavigationBarProps, NavigationBarDestination, NavigationBarIconProps, NavigationBarLabelVisibility, NavigationBarRef } from './components/NavigationBar';
export { NavigationDrawer } from './components/NavigationDrawer';
export type { NavigationDrawerProps, NavigationDrawerDestination, NavigationDrawerSection, NavigationDrawerItem, NavigationDrawerIconProps, NavigationDrawerVariant, NavigationDrawerRef } from './components/NavigationDrawer';
export { NavigationRail } from './components/NavigationRail';
export type { NavigationRailProps, NavigationRailDestination, NavigationRailIconProps, NavigationRailLabelVisibility, NavigationRailRef } from './components/NavigationRail';
export { Search } from './components/Search';
export { SideSheet, SideSheetSurface } from './components/SideSheet';
export type { SideSheetProps, SideSheetSurfaceProps, SideSheetVariant, SideSheetCloseReason, SideSheetRef } from './components/SideSheet';
export type { SearchProps, SearchPresentation, SearchCloseReason, SearchSuggestion, SearchRef } from './components/Search';
export { SegmentedButton } from './components/SegmentedButton';
export type { SegmentedButtonProps, SingleSegmentedButtonProps, MultipleSegmentedButtonProps, Segment, SegmentIconProps, SegmentedButtonSize, SegmentedButtonSelectionMode, SegmentedButtonRef } from './components/SegmentedButton';
export { Slider } from './components/Slider';
export type { SliderProps, SliderSize, SliderOrientation, SliderValueIndicator, SliderRef } from './components/Slider';
export { SplitButton } from './components/SplitButton';
export type { SplitButtonProps, SplitButtonVariant, SplitButtonSize, SplitButtonIconProps, SplitButtonRef } from './components/SplitButton';
export { Tabs } from './components/Tabs';
export type { TabsProps, Tab, TabIconProps, TabsVariant, TabsRef } from './components/Tabs';
export { TextField } from './components/TextField';
export { Toolbar } from './components/Toolbar';
export type { ToolbarProps, ToolbarVariant, ToolbarOrientation, ToolbarRef } from './components/Toolbar';
export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipVariant, TooltipPlacement } from './components/Tooltip';
export type { TextFieldProps, TextFieldRef, TextFieldVariant, TextFieldSize, TextFieldType, TextFieldIcon, TextFieldIconProps } from './components/TextField';
export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';
export { Dialog, DialogSurface } from './components/Dialog';
export type { DialogProps, DialogSurfaceProps, DialogIconProps, DialogFocusTarget } from './components/Dialog';
export { DatePicker, DatePickerSurface } from './components/DatePicker';
export { TimePicker, TimePickerSurface } from './components/TimePicker';
export type {
  TimePickerProps,
  TimePickerSurfaceProps,
  TimePickerHourCycle,
  TimePickerEntryMode,
  TimePickerUnit,
  TimePickerLayout,
  TimePickerCloseReason,
  TimePickerCloseEvent,
} from './components/TimePicker';
export type {
  DatePickerProps,
  DatePickerSurfaceProps,
  DatePickerPresentation,
  DatePickerMode,
  DatePickerFirstDayOfWeek,
  DatePickerEntryMode,
  DatePickerStartView,
  DatePickerCloseReason,
  DatePickerCloseEvent,
  DatePickerSelection,
  DatePickerAnchor,
} from './components/DatePicker';
export { Divider } from './components/Divider';
export type { DividerProps, DividerOrientation, DividerInset } from './components/Divider';
export { LoadingIndicator } from './components/LoadingIndicator';
export type { LoadingIndicatorProps, LoadingIndicatorSize } from './components/LoadingIndicator';
export { ProgressIndicator } from './components/ProgressIndicator';
export type { ProgressIndicatorProps, ProgressIndicatorSize, ProgressIndicatorVariant } from './components/ProgressIndicator';

// The provider, the theme and the default system
export { TanreiProvider, useTanrei, createTanreiTheme, tanrei } from './theme/TanreiProvider';
export type { TanreiInsets, TanreiProviderProps, TanreiTextOptions, TanreiTheme } from './theme/TanreiProvider';
export { resolveScheme } from './theme/scheme';
export type { TanreiContrast, TanreiThemePreference } from './theme/scheme';

// Theme helpers
export { evaluatePaint, formatColor, mixColors, roleColor } from './theme/paint';
export { lookupValue, seriesStep } from './theme/lookup';
export { typescaleStyle, toFontWeight, platformFontFamily, fontFamilyOf, typeFamilyOf, emphasize } from './theme/typography';
export type { TanreiFontResolver } from './theme/typography';
export { borderCurveOf } from './theme/shape';
export { iconFill, iconFamily, iconGlyphStyle, iconNeedsFillAxis } from './theme/icon';
export type { TanreiIconAxes, TanreiIconFontResolver, TanreiIconGlyph } from './theme/icon';
// Elevation, and the shadow conversions the README's table names (`shadowSigma` / `toBoxShadowBlur` are their internals).
export { resolveElevation, resolveElevationLayers, supportsBoxShadow, toAndroidElevation, toLegacyShadow, toShadowRadius } from './theme/elevation';
export type { TanreiElevationLayers, TanreiResolvedElevation, TanreiShadowLayer } from './theme/elevation';
export { toEasing, useReduceMotion } from './theme/motion';
// The foreground a container (a Card) hands its content: React Native has no inherited text color.
export { useContentColor } from './theme/contentColor';

// Primitives
export { resolveInteractionState } from './primitives/interaction';
export type { InteractionFlags, InteractionState } from './primitives/interaction';
export { useStateTransition } from './primitives/stateTransition';
export type { StateTransitionOptions, StateVisuals, Transitioned } from './primitives/stateTransition';
export { usePressHold } from './primitives/pressHold';
export type { PressHold } from './primitives/pressHold';
// The ripple's geometry (`rippleOrigin`, `rippleRadius`) is the hook's own.
export { PressRipple, usePressRipple } from './primitives/PressRipple';
export type { PressRippleOptions, PressRippleProps, PressRippleState, RipplePoint } from './primitives/PressRipple';
export { FocusRing, useKeyboardFocus } from './primitives/FocusRing';
export type { FocusRingProps, KeyboardFocus } from './primitives/FocusRing';
export { Ring } from './primitives/Ring';
export type { RingProps } from './primitives/Ring';
export { minimumTargetHitSlop, useMinimumTarget } from './primitives/minimumTarget';
export type { VisualSize } from './primitives/minimumTarget';

// The vocabulary: `TanreiSystem`, `TanreiPaint`, `TanreiColorRoleRegistry`, per-component token interfaces…
export type * from './generated/vocabulary';

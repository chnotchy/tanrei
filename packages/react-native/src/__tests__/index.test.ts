import * as pkg from '../index';

/**
 * The public surface is deliberate: exactly the values the README names. A building block — the ripple's geometry, a
 * shadow's σ, the icon module's test hook — is imported inside the package from its module and never through the barrel.
 */
const PUBLIC_VALUES = [
  // Components
  'AppBar',
  'useAppBarScroll',
  'BottomSheet',
  'BottomSheetSurface',
  'Button',
  'IconButton',
  'ButtonGroup',
  'FloatingActionButton',
  'ExtendedFloatingActionButton',
  'FabMenu',
  'Chip',
  'Checkbox',
  'RadioButton',
  'RadioGroup',
  'Snackbar',
  'useSnackbar',
  'Switch',
  'Dialog',
  'DialogSurface',
  'DatePicker',
  'DatePickerSurface',
  'TimePicker',
  'TimePickerSurface',
  'Divider',
  'Badge',
  'ProgressIndicator',
  'LoadingIndicator',
  'Card',
  'Carousel',
  'CarouselItem',
  'List',
  'Menu',
  'NavigationBar',
  'NavigationDrawer',
  'NavigationRail',
  'Search',
  'SideSheet',
  'SideSheetSurface',
  'SegmentedButton',
  'Slider',
  'SplitButton',
  'Tabs',
  'TextField',
  'Toolbar',
  'Tooltip',
  // The provider, the theme and the default system
  'TanreiProvider',
  'useTanrei',
  'createTanreiTheme',
  'tanrei',
  'resolveScheme',
  // Theme helpers
  'evaluatePaint',
  'formatColor',
  'mixColors',
  'roleColor',
  'lookupValue',
  'seriesStep',
  'typescaleStyle',
  'toFontWeight',
  'platformFontFamily',
  'fontFamilyOf',
  'typeFamilyOf',
  'emphasize',
  'borderCurveOf',
  'iconFill',
  'iconFamily',
  'iconGlyphStyle',
  'iconNeedsFillAxis',
  'resolveElevation',
  'resolveElevationLayers',
  'supportsBoxShadow',
  'toAndroidElevation',
  'toLegacyShadow',
  'toShadowRadius',
  'toEasing',
  'useReduceMotion',
  'useContentColor',
  // Primitives
  'resolveInteractionState',
  'useStateTransition',
  'usePressHold',
  'PressRipple',
  'usePressRipple',
  'FocusRing',
  'useKeyboardFocus',
  'Ring',
  'minimumTargetHitSlop',
  'useMinimumTarget',
].sort();

/** Package-internal helpers: importable from their modules, never public. */
const INTERNAL = [
  'resetIconReport',
  'resetLookupReports',
  // The total read of a closed enum prop (src/theme/lookup.ts): `lookupValue` is the public read of an open key.
  'closedValue',
  // The badge's form and text for a count and a max (src/components/Badge.tsx).
  'badgeContent',
  // A progress indicator's fraction and exposed value (src/components/ProgressIndicator.tsx).
  'progressReading',
  // The arc drawing, the looping value and the reduce-motion answer that loops wait for (src/primitives/Arc.tsx,
  // loop.ts; src/theme/motion.ts): building blocks of the progress and loading indicators.
  'Arc',
  'tidy',
  'useLoop',
  'useAppActive',
  'useReduceMotionSetting',
  'rippleOrigin',
  'rippleRadius',
  'shadowSigma',
  'toBoxShadowBlur',
  // The building blocks every pressable control shares (src/primitives/pressInteraction.ts, elevationTransition.ts,
  // content.tsx): internal until a product needs to build its own control from them.
  'INTERACTION_STATES',
  'usePressInteraction',
  'elevationVisuals',
  'shadowLayerCount',
  'useElevationDrawing',
  'IconBox',
  'Label',
  'RESTING_OPACITY',
  'drawsColor',
  'fillOf',
  'partTestID',
  'textContent',
  'glyphSlotContent',
  // The one switch over interaction states for the axis-free state tokens (src/primitives/stateShape.ts).
  'stateShape',
  // The shell every selection control shares (src/primitives/selectionControl.tsx) and the checkbox's condition
  // (src/components/Checkbox.tsx).
  'StateLayer',
  'hasAccessibleName',
  'useNamelessReport',
  'selectionRow',
  'ramp',
  'useControlTransition',
  'useFirstLineAlignment',
  'checkboxCondition',
  // The check the checkbox, the list and the menu stroke (src/primitives/checkMark.tsx).
  'CheckMark',
  'CHECK',
  // A column of items: the row's shared state and the one-tab-stop keyboard (src/primitives/itemRow.ts, rovingFocus.ts).
  'useItemRow',
  'useRovingFocus',
  'TYPEAHEAD_WINDOW',
  // Where a menu's surface goes against its anchor (src/components/Menu.tsx): a pure function under its tests.
  'placeMenu',
  // Gregorian calendar dates and their locale forms, the pickers' locale data (src/primitives/calendar.ts, locale.ts).
  'parseIsoDate',
  'isoOf',
  'monthGrid',
  'localeFirstDay',
  'numericDatePattern',
  'numericDateText',
  'parseNumericDate',
  'resolveLocale',
  'localeDigits',
  'formatInteger',
  // A time of day and its locale forms (src/primitives/clock.ts), and the modal pickers' Modal, motion and scrim
  // (src/primitives/pickerModal.tsx).
  'parseClockTime',
  'localeHourCycle',
  'hourText',
  'periodNames',
  'periodPlace',
  'timeSeparator',
  'PickerModal',
  'PickerModalArea',
  // A slider's numbers (its snap, keyboard step and fraction digits), its value text and the touch slop
  // (src/components/Slider.tsx).
  'sliderScale',
  'formatSliderValue',
  'TOUCH_SLOP',
  // A bottom sheet's heights and where a released drag goes (src/components/BottomSheet.tsx), and what the sheets share:
  // their presence and motion, the focus move, the Modal, the scrim and the drag's constants (src/primitives/sheet.tsx).
  'bottomSheetHeights',
  'bottomSheetRelease',
  'useSheetPresence',
  'useSheetFocus',
  'SheetModal',
  'SheetScrim',
  'escapeKey',
  'SHEET_DRAG_SLOP',
  'SHEET_FLING_VELOCITY',
  // A container's actions in a row that stacks when it does not fit (src/primitives/actionRow.tsx): the dialog's and the
  // side sheet's.
  'ActionRow',
  'actionItems',
  // A carousel's slots and where an item is at a scroll position (src/components/Carousel.tsx): pure, under their tests.
  'carouselArrangement',
  'carouselItemAt',
  // Which tab a row's value selects, its tab stop and its reports (src/components/Tabs.tsx).
  'buildTabs',
  // Where a tooltip goes against its anchor, and the description it gives the anchor (src/components/Tooltip.tsx).
  'placeTooltip',
  'tooltipDescription',
  // A snackbar's timeout by duration and the text it announces (src/components/Snackbar.tsx).
  'snackbarTimeout',
  'snackbarAnnouncement',
  // The provider of the content color a Card hands its content (src/theme/contentColor.tsx): `useContentColor` reads it.
  'ContentColorProvider',
  // User-perceived characters (src/primitives/graphemes.ts): what a text field's counter counts and its maxLength limits.
  'graphemes',
  'graphemeCount',
  'limitEdit',
  'resetGraphemeSegmenter',
];

describe('public surface', () => {
  test('the barrel exports exactly the values the README names', () => {
    expect(Object.keys(pkg).sort()).toEqual(PUBLIC_VALUES);
  });

  test('internal helpers and test hooks do not leak through the barrel', () => {
    for (const name of INTERNAL) expect(pkg).not.toHaveProperty(name);
  });
});

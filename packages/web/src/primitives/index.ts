// The pieces every interactive component is built from. Each takes the component's own selectors and custom
// properties, so a component composes them with its own comp tokens (README "Building a component").
//   shape       — styles/shape.ts: `shape` (the one corner rule) and `cornerRadius()` (a box names its shape token)
//   states      — the state rules and their precedence (pressed > focused > hovered, disabled over all)
//   press       — PressController (data-pressed, press-hold, the ripple's lifecycle) and pressHold()
//   ripple      — the ripple layer's styles, and its origin from a pointer or a key
//   focus-ring  — the keyboard focus indicator (ring or glow), the glow alone (focusGlow) and syncFocusStyle()
//   target      — the minimum target (::before), and neighbourTarget(): capped toward a neighbour in a row (BGR-4, SPB-6)
//   cut-text    — isCut() and CutTextTip: a one-line text cut with an ellipsis, shown whole in a tooltip while it is cut (TRV-50)
//   kept-length — KeptLengths, keptLength() and keptSpaces(): controls that stand close in a row keep a touch target's
//                 length each, the gap between two growing only by what they lack (SRC-34, TBR-16); between slotted
//                 elements the space is a spacer of the host's box, never a margin a page's reset could take away
//   behavior    — reading a choice of kind from the cascade
//   icon        — styles/icons.ts: `iconGlyph()` (a component's own icon, drawn as icons.css draws `.tanrei-icon`)
//   glyph       — GlyphDrawnController: `data-drawn` on a component's glyph while the icon set can draw it (CHK-19, MNU-30, SNK-26)
//   glyph-pending — PendingGlyphs: `data-glyphs="pending"` on a light-DOM component whose glyphs a stylesheet draws, while the icon set cannot (TRV-40)
//   glyph-mirror — GlyphMirrorController: `data-tanrei-mirrored` on a component's own glyphs and on the glyphs in its slots
//                 whose name the active icon set mirrors in right-to-left (BTN-19); the styles are
//                 `iconGlyph()`'s. markGlyph() is the one rule, observeIcons() the page's bare `.tanrei-icon`
//   axes        — OpenAxesController: sizes and variants a design system adds, and a value it does not have
//   report      — `report()`: what a debug build tells the developer (BTN-7, BTN-16…)
//   words       — the product's words: WordsController (`get(key, this.prop)`: the prop, else the set of the
//                 element's language, else the document's; `missing()`: recorded, reported once per key and page),
//                 wordFor() / watchWords() for a script; setWords() and missingWords() are the product's two functions
//   missing-value — missingValueMessage(): the browser's message of a required control left empty, else the element's own words
//   availability — AvailabilityController: a component or variant the active system leaves out, reported
//   arc         — arcStyles: a ring of SVG circles (center, radius, stroke, circumference), ring-turn and pulse
//   description — FORWARDED_DESCRIPTION: the host's aria-description, rendered on the native element (FORWARDED_INVALID: its aria-invalid)
//   focus-order — OUTSIDE_FOCUS_ORDER: a control a host takes out of the focus order (a number field's steppers, NUM-25)
//   host-aria   — `hostAria()`: semantics a non-interactive component carries on its host (divider, progress…)
//   visibility  — VisibilityController: whether the host can be seen, so a running animation pauses off screen
//   shared-choice — sharedChoice(), remembered(), remember(), keepInPlace(): what rows that share a choice have in common —
//                  one registry of groups for a document, one read of the storage for a key (TAB-36…41, TBV-21).
//   layout-scale — layoutScale(): how much larger an element is drawn than laid out (a transformed ancestor), for what is
//                 measured on the page and written in the element's own pixels
//   selection   — SelectionController and the styles of a form-associated selection control (checkbox, radio, switch),
//                 and conditionStates(): the state rules of any component whose conditions are its state variants
//   item-row    — the row of a column of items (list, menu): its states, paints, ripple and target height
//   places      — fillPlaces(), placeFaults(), reportPlaces(): a word of the product's with places a component fills
//                : how it is read, and what a debug build says of one that does not fit
//   roving      — RovingKeys: the arrow keys, Home, End and typeahead of a column of items that is one tab stop
//   interactive — findInteractive() / slottedInteractive(): what an action's content must not hold (CRD-15, LST-20)
//                 answersPress(): what a hit area that reaches over other content yields a press to (TAB-5)
//                 pressTakenWithin(): what a press inside an item's content belongs to instead of the item (ACC-36)
//   link        — a control with a destination is a link: LinkController (the link a control is now, the keys
//                 that press it, its description, the debug reports), linkAttributes() (the anchor's attributes, the
//                 disabled anchor), readDestination() / readTarget() / linkRel() (what a destination is), LINK_MARK,
//                 DISABLED and styledAsAnchorToo() (the anchor is the same styled part)
//   after-click — afterClick(): `change` after the `click` has gone through the page, as a native checkbox (CHP-11, BTN-14)
//   long-press  — TOUCH_SLOP and LONG_PRESS, the platform's where it names none (LST-36, MNU-60), and swallowRelease():
//                 the press under way ends where something opened under it, its release and click going no further
//                 (TIP-13, MNU-60)
//   default-button — a form's default button (BTN-30): defaultButton(), pressDefaultButton() — what every control that
//                 submits its form on Enter calls in place of `form.requestSubmit()` — watchNativeInputs() for Enter in
//                 the platform's own inputs, and SUBMIT_BUTTON, by which a Button says it is a submit button
//   composed    — a composed element (README "Composed elements"): ComposedElement and ComposedControl (the
//                 members' own elements in the shadow root; focus, the passed slot, the value that is the member's, the
//                 form), forward() (a prop set on its member) and exported() (a member's parts); form-says — FormSays,
//                 what a control tells its form, said where the element composed around it hears it; `formOf()` is in
//                 default-button. Imported from their own modules, not from here.
//   values      — parseValues(): the `values` attribute of a selection of several values (list, segmented button)
//   keyboard-convention — whose keyboard a keyboard shortcut writes (KBS-2): the ambient `data-tanrei-keyboard-convention`
//                 across shadow roots, the platform's, one page-wide watcher; the chords' attribute converter; and the
//                 internal event a keyboard shortcut tells its host with (KBS-12, a menu item's aria-keyshortcuts)
//   item-update — notifyItemUpdate(): an item tells its container a prop it reads changed, an internal event kept out of
//                 the manifest (segment, list item, menu item, suggestion, tab); CoalescedSync, the container's side: one
//                 re-read of its items per turn, however many said they changed (a build of N items is O(N), not O(N²))
//   work-count  — countWork(): a debug build counts a piece of work on globalThis.__tanreiCounts, for the performance
//                 tests to hold as a count
//   group-item  — the internal channel between a button group and its Buttons and icon buttons: GroupItemController
//                 (where the item sits), groupItemStyles() (its corners, width and hit area in the group), GROUP_PLACE;
//                 a toolbar's items are `row` items of it, their hit areas capped at the measured half-gaps (TBR-9);
//                 a dialog gives its actions their variant through it (HOST_VARIANT, DLG-20)
//   actions     — ActionPlacement and actionBoxStyles(): the actions at the foot of a dialog or a side sheet, placed by
//                 their flags as a full-width Button group places its items (BGR-13…19) into three hand-assigned slots,
//                 row or column by fit, each given the host's variant (DLG-10, DLG-20, SSH-11, SSH-17); compChoice()
//   destination — the destinations of a navigation region (bar, drawer): DestinationsController (selection, change /
//                 reselect, reports), NavigationDestination and destinationStyles() (a bar's item)
//   native-text — NativeTextController: a component's value and its native text element kept in step around an input
//                 method (text field, search: TXF-1, TXF-4, SRC-4)
//   composition-end — CompositionEnd, isCompositionInput(): what an engine reports for an input method's composition
//                 after its end (Firefox's last input, the committing key WebKit reports late), told by what it is, never by a timer
//   calendar-date — Gregorian dates and times of day as parts, without a time zone: parsing and writing ISO 8601, adding
//                 days and months, the month's grid of 42 cells, the clock's hours and minute steps (CAL-*, DTM-8, DTM-17)
//   locale-date — dates and times in the locale's forms: typed in its numeric form and held as ISO 8601 (formatValue(),
//                 valuePattern(), readText(), isoValue(), withinRange(), ambientLocale(), localeDirection(): TXF-28 …
//                 TXF-31), and drawn as a row of segments (valueRow(), unitName(), monthName(), yearText(): TXF-42,
//                 TXF-47); the calendar's names, digits and first day of the week (CAL-4, CAL-24); the clock's hours,
//                 separator, period names and preferred cycle (DTM-14, DTM-16, DTM-38)
//   system-watch — SystemWatchController: renders its host again when the document's root switches the design system,
//                 for a choice of kind drawn from script (a calendar's arrows, a picker's actions)
//   modal       — modalLayer: the Tanrei modal overlays open in the window, which a snackbar waits and pauses for (SNK-9, SNK-12);
//                 deepActive(), tabbables(), trapFocus() and holdPageScroll(): what every modal overlay (dialog, drawer) does;
//                 focusWithin() and returnFocus(): focus inside a host, and given back to its opener (the sheets)
//   sheet       — what the sheets share (bottom sheet, BSH-5, BSH-9; side sheet, SSH-4): SheetDrag (slop, following,
//                 velocity), the fling and slop constants, stoppedBefore() and POINTER_STOPPED_TIME (a still pointer's
//                 release is no fling, for every drag that flings), modalSheetKeys() (Escape and the trap), closeRequestReason()
//                 (Escape or back), keyboardCover() and onBackdrop()
//   separation  — sys.behavior.separation as a component reads it: separationHost() (the attribute over the
//                 component token, as `--_separation` on the host), whenGap() (the gap form's rules: a style query, and
//                 `data-separation` where a browser has none), separationOf(), syncSeparation()
//   divider-visibility — sys.behavior.divider-visibility as a component reads it (APB-18, DLG-24, POP-38, SSH-23):
//                 dividerVisibilityHost(), whenScroll() (the scroll form's rules), dividerVisibilityOf(),
//                 syncDividerVisibility()
//   follow      — FollowController: an overlay placed by script follows its anchor by events (scroll, resize, sizes, a place
//                 that changed with no event, a motion beginning), frame by frame only while something moves (TIP-9,
//                 MNU-2, FBM-13, SRC-7, DTM-2)
//   disclosure  — lineArrow(): the arrow key toward the end or the start of the line, for a row that opens and closes what is
//                 under it (a navigation drawer's group, NVD-45; an accordion's header, ACC-11)
//   placement   — placeAnchored(): where a surface that opens beside a control goes (the thirteen placements, offsets,
//                 flipping, shifting, holding, the arrow's point: TIP-9, TIP-22…25, POP-2…5); anchorGone() (the anchor
//                 removed, hidden or out of sight); the attributes of `offset`, `cross-offset` and a true/false/unset choice
//   arrow       — arrowStyles(), shadowLayers() and shadeFilter(): the arrow of an anchored surface, one shape with it
//                 under one elevation (TIP-25, POP-10); arrowOutlineStyles(): its outline in forced colors (POP-32)
//   anchored    — AnchoredSurfaceController and anchoredSurfaceStyles(): a surface presented in the top layer, placed
//                 beside its anchor, limited to the room, following it, with its open and close motion (POP-1…5,
//                 POP-7, POP-8, POP-26, POP-27, POP-36); what a select, a combobox and a color field stand on
//   dismiss     — DismissController: Escape (the topmost surface alone, after everything inside heard the key), a press
//                 outside and focus leaving ask the host to close (POP-21, POP-23); registerOverlay() and
//                 logicalAncestors(): an overlay opened from inside a surface is that surface's own (POP-24)
//   overlay-focus — focusOverlay(), tabThroughOverlay(), returnOverlayFocus(): focus into, through and back from an
//                 operated overlay that is not modal, as if it stood directly after its opener (POP-19, POP-20, POP-22)
//   direction   — DirectionController, DIRECTION_PROBE and directionProbeStyles: a script told when the layout direction it
//                 inherits changes (an ancestor's `dir`, at run time), for what it wrote physically (carousel, slider)
//   field       — a field and the control it frames, in different trees: FieldControlController (the control asks with
//                 the composed `tanrei-field-connect` event and writes the name, the description and the states it is
//                 told), FieldProviderController (the frame answers, tells of every change, and takes back),
//                 giveAttributes() / takeBack() for an element that does not ask (FLD-8, FLD-10, FLD-11, FLD-14, FLD-23,
//                 FGR-8, FGR-14). The frame's rows and styles are `primitives/field-frame.ts` (one control: a field, and
//                 every component that is a field itself) and `primitives/field-group-frame.ts` (a set: the field group
//                 and the radio group); they draw the requirement tag with the Tag component, so they are imported by
//                 path and are not part of this file
//   form-disabled — takeFormDisabled(): a form-associated element takes the platform's word that it is disabled (a
//                 fieldset's, or its own attribute's) where it is not lost: after the update under way
//   disabled-while-focused — waitsWhileFocused(): the `disabled` attribute of a form-associated element that holds focus
//                 waits until focus has left it, at most a frame, so focus leaves when the platform's own control's
//                 would in every engine (the Button)
//                 disabledWaitsWhileFocused(Class) gives a class the overrides; FocusedStop keeps a part's own tabindex a frame
//   autofocus   — focusedAtFirst(Class), wantsAutofocus(): `autofocus` on an element that is not focusable itself, at the
//                 page's first load
//   natural-height — naturalHeight(): an overlay's uncapped height, measured without lifting its cap, which would drop its
//                 list's scroll offset (menu, date picker, search)
//                 layoutSize(): a box's size as laid out — fractional, untouched by a transform — which an overlay is
//                 placed by, so an edge aligned to the anchor's is not a snapped pixel off it
export { iconGlyph } from '../styles/icons.js';
export { cornerRadius, shape } from '../styles/shape.js';
export { type OpenAxis, OpenAxesController, type OpenAxesOptions } from './axes.js';
export { BEHAVIOR, PRESSED_FEEDBACK, type PressedFeedback, choice, pressedFeedback } from './behavior.js';
export { isDisabledControl, takeFormDisabled } from './form-disabled.js';
export { type DisabledHost, FocusedStop, disabledWaitsWhileFocused, endsWaiting, waitsWhileFocused } from './disabled-while-focused.js';
export { focusedAtFirst, wantsAutofocus } from './autofocus.js';
export { type FocusRingOptions, type FocusSelector, focusGlow, focusGlowEnds, focusRing, syncFocusStyle } from './focus-ring.js';
export { PressController, type PressOptions, type PressedBy, pressHold } from './press.js';
export { type Point, type RippleTokens, fadeRipple, rippleStyles, startRipple } from './ripple.js';
export { type StatePaints, type StateSelector, stateRules } from './states.js';
export { arcStyles } from './arc.js';
export { FORWARDED_DESCRIPTION, FORWARDED_INVALID } from './description.js';
export { OUTSIDE_FOCUS_ORDER } from './focus-order.js';
export { DIRECTION_PROBE, DirectionController, directionProbeStyles } from './direction.js';
export { lineArrow } from './disclosure.js';
export { PendingGlyphs, isGlyphProbe } from './glyph-pending.js';
export { FollowController, type FollowOptions } from './follow.js';
export {
  ANCHORED_PLACEMENTS,
  type AnchoredArrow,
  type AnchoredBox,
  type AnchoredInput,
  type AnchoredPlace,
  type AnchoredPlacement,
  type AnchoredSide,
  type NamedSide,
  anchorGone,
  anchorOutOfSight,
  choiceAttribute,
  crossOffsetAttribute,
  numericAttribute,
  placeAnchored,
  usableLength,
} from './placement.js';
export { type ArrowStyleOptions, type ShadowLayer, arrowOutlineStyles, arrowStyles, shadeFilter, shadowLayers } from './arrow.js';
export { type AnchoredStyleOptions, AnchoredSurfaceController, type AnchoredSurfaceOptions, anchoredSurfaceStyles } from './anchored.js';
export { DismissController, type DismissOptions, type DismissReason, type OverlayEntry, logicalAncestors, overlayDepth, registerOverlay } from './dismiss.js';
export { type OverlayTabOptions, focusOverlay, keepOverlayFocusAfterPress, quietFocus, returnOverlayFocus, tabThroughOverlay, watchInput } from './overlay-focus.js';
export { hostAria } from './host-aria.js';
export {
  FIELD_CONNECT,
  FIELD_CONTROL,
  type FieldConnection,
  FieldControlController,
  type FieldControlOptions,
  FieldProviderController,
  type FieldProviderOptions,
  type FieldSays,
  type FieldState,
  type PlainGift,
  composedContains,
  giveAttributes,
  namesItself,
  takeBack,
  takesRequired,
} from './field.js';
export { DRAWN_WIDTH, GlyphDrawnController } from './glyph.js';
export { type GlyphMirrorOptions, GlyphMirrorController, type GlyphMirroring, activeIconSet, glyphMirrors, glyphName, markGlyph, observeIcons } from './glyph-mirror.js';
export { report } from './report.js';
export { type MissingWord, type TanreiWords, type WordKey, WordsController, missingWords, setWords, watchWords, wordFor, wordMissing } from './words.js';
export { type MissingValueKind, type OwnWords, browserMissingMessage, missingValueMessage } from './missing-value.js';
export { AvailabilityController } from './availability.js';
export {
  SELECTION_STATES,
  SelectionController,
  conditionStates,
  type SelectionHost,
  conditionBlock,
  markConditionChange,
  recolorTiming,
  selectionContainerShape,
  selectionRippleOrigin,
  selectionLabel,
  selectionState,
  selectionStates,
} from './selection.js';
export { minimumTarget, neighbourTarget } from './target.js';
export { type CutTextContent, CutTextTip, type CutTextTipOptions, type CutTextTooltip, isCut } from './cut-text.js';
export { KeptLengths, keptLength, keptSpaces } from './kept-length.js';
export { type ItemRowOptions, itemRowStyles, rowTarget } from './item-row.js';
export { RovingKeys, type RovingItem, TYPEAHEAD_WINDOW } from './roving.js';
export { answersPress, findInteractive, pressTakenWithin, slottedInteractive } from './interactive.js';
export { VisibilityController } from './visibility.js';
export { layoutScale } from './layout-scale.js';
export { deepActive, focusWithin, holdPageScroll, modalLayer, returnFocus, tabbables, trapFocus } from './modal.js';
export {
  POINTER_STOPPED_TIME,
  SHEET_FLING_VELOCITY,
  SHEET_TOUCH_SLOP,
  SheetDrag,
  type SheetDragStep,
  closeRequestReason,
  keyboardCover,
  modalSheetKeys,
  onBackdrop,
  stoppedBefore,
  watchEscape,
} from './sheet.js';
export { type NativeText, NativeTextController, type NativeTextOptions } from './native-text.js';
export { COMPOSITION_INPUT_TYPES, CompositionEnd, isCompositionInput } from './composition-end.js';
export {
  DATE_KINDS,
  type DateKind,
  FALLBACK_LOCALE,
  ambientLocale,
  asciiDigits,
  clockFor,
  formatValue,
  fullDateText,
  headerDateText,
  hourText,
  isoValue,
  localeDigits,
  localeDirection,
  localeFirstDay,
  localeHourCycle,
  longWeekdays,
  minuteText,
  monthName,
  monthYearText,
  narrowWeekdays,
  numberText,
  periodNames,
  periodPlace,
  readText,
  type RowPart,
  type SegmentUnit,
  supportedLocale,
  timeSeparator,
  timeText,
  todayName,
  unitName,
  valuePattern,
  valueRow,
  withinRange,
  yearText,
} from './locale-date.js';
export * from './calendar-date.js';
export { SystemWatchController } from './system-watch.js';
export {
  DIVIDER_VISIBILITIES,
  DIVIDER_VISIBILITY_VALUES,
  type DividerVisibility,
  type DividerVisibilityProp,
  dividerVisibilityHost,
  dividerVisibilityOf,
  isDividerVisibility,
  syncDividerVisibility,
  whenScroll,
} from './divider-visibility.js';
export { SEPARATIONS, SEPARATION_VALUES, type Separation, type SeparationProp, separationHost, separationOf, styleQueries, syncSeparation, whenGap } from './separation.js';
export { afterClick } from './after-click.js';
export { LONG_PRESS, TOUCH_SLOP, swallowRelease } from './long-press.js';
export { SUBMIT_BUTTON, type SubmitButtonState, defaultButton, markPassingSubmitter, pressDefaultButton, watchNativeInputs } from './default-button.js';
export {
  DISABLED,
  LINK_KEYS,
  LINK_MARK,
  LinkController,
  type LinkForm,
  type LinkOptions,
  type LinkProps,
  type LinkRefusal,
  type TanreiLinkTarget,
  linkAttributes,
  linkForm,
  linkRel,
  readDestination,
  readTarget,
  styledAsAnchorToo,
} from './link.js';
export { layoutSize, naturalHeight } from './natural-height.js';
export { parseValues } from './values.js';
export { CoalescedSync, notifyItemUpdate } from './item-update.js';
export { countWork } from './work-count.js';
export { type FilledRun, type FilledSentence, type PlaceFaults, fillPlaces, placeFaults, reportPlaces } from './places.js';
export {
  ACTION_COLUMN,
  ACTION_ROW,
  type ActionArrangement,
  type ActionMeasure,
  ActionPlacement,
  type ActionRun,
  BUTTON_VARIANTS,
  actionBoxStyles,
  assignSlot,
  compChoice,
  giveVariant,
  whenChosen,
} from './actions.js';
export {
  GROUP_AVAILABILITY,
  GROUP_ITEM,
  GROUP_ITEM_PROPERTIES,
  GROUP_PLACE,
  type GroupItem,
  GroupItemController,
  type GroupPlace,
  HOST_VARIANT,
  groupItemReset,
  groupItemStyles,
  type PlacingGroup,
  type VariantHost,
} from './group-item.js';
export {
  DESTINATION_UPDATE,
  type Destination,
  type DestinationContext,
  DestinationsController,
  type DestinationsHost,
  NavigationDestination,
  type TanreiLabelVisibility,
  type TanreiNavigationChangeDetail,
  badgeDescription,
  destinationStyles,
  notifyDestinationUpdate,
} from './destination.js';
export {
  type ConventionReader,
  KEYBOARD_CONVENTION,
  type KeyboardConvention,
  SHORTCUT_UPDATE,
  ambientConvention,
  chordsConverter,
  chordsOf,
  parseChords,
  platformConvention,
  unwatchConvention,
  watchConvention,
} from './keyboard-convention.js';
export { type IndicatorDragOptions, IndicatorDragController, type IndicatorPlace, type IndicatorStop, indicatorChoice, indicatorPlace } from './indicator-drag.js';
export { type SharedChoice, keepInPlace, remember, remembered, sharedChoice } from './shared-choice.js';

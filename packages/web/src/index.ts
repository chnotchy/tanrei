// `@tanrei/web` registers the components of the default system, Tanrei, and no other: a product on it can reach only
// the components its system ships. A component another system ships — the segmented button (the presets), the FAB
// menu (the m3-like layer) — is registered by that system's entry, `@tanrei/web/<id>` (`@tanrei/web/m3-like`), which registers
// everything this one does and the system's own; `@tanrei/web/all` registers every component of the package; and a
// component's own module, `@tanrei/web/components/<name>`, registers it alone, for a product that includes it in its
// own layer. The build writes those entries from the systems' components manifests (scripts/build.js), and
// test/entries.test.mjs holds each entry to its system's manifest.

// The bare `.tanrei-icon` of the page: loading the components also marks the glyphs the icon set mirrors in a
// right-to-left layout (`@tanrei/web/icons` is the same script alone).
export { type GlyphMirroring, type IconSet, activeIconSet, glyphMirrors, glyphName, iconSets, markGlyph, observeIcons, systemIconSets } from './icons.js';
// The text links of the page — `class="tanrei-link"` anchors and prose's own (link.css): loading the components also
// adds what a stylesheet cannot (`@tanrei/web/link` is the same script alone).
export { observeLinks, setExternalLabel, setSiteOrigins } from './link.js';
// The product's words: Tanrei ships none. `setWords()` gives them once for every component that reads them,
// `missingWords()` lists the keys that were needed and given by nobody (`@tanrei/web/words` is the same two alone).
export { type TanreiWords, type WordKey, missingWords, setWords, wordKeys, wordReaders } from './words.js';
// What the active system does not have: a debug build reports each use of it, as a warning or — after
// `setAvailabilityMode('error')`, in a product's tests — as an error, and `unavailableUses()` lists the uses
// (`@tanrei/web/availability` is the same two alone).
export { type AvailabilityMode, setAvailabilityMode, unavailableUses } from './availability.js';
// The steps and the previous and next links of the page — `class="tanrei-steps"` lists and `class="tanrei-previous-next-links"` landmarks
// (steps.css, previous-next-links.css): loading the components also adds the debug reports of the first and, for the second, what
// a stylesheet cannot (`@tanrei/web/steps` and `@tanrei/web/previous-next-links` are the same scripts alone).
export { observeSteps } from './steps.js';
export { observePreviousNextLinks } from './previous-next-links.js';
// The timelines of the page — `class="tanrei-timeline"` lists (timeline.css): loading the components also marks the one
// event under way as the list's current item and adds the debug reports (`@tanrei/web/timeline` is the same script alone).
export { observeTimeline } from './timeline.js';
// The frames first: a field and a field group are defined before the controls they frame, so that a control already
// finds its field when it is connected (one defined in another order asks again when its field is — primitives/field.ts).
export { TanreiField, type TanreiFieldRequiredMark, type TanreiFieldRequirement } from './components/field/field.js';
export {
  TanreiFieldGroup,
  type TanreiFieldGroupKind,
  type TanreiFieldGroupOrientation,
  type TanreiFieldGroupRequiredMark,
  type TanreiFieldGroupRequirement,
  type TanreiFieldGroupSpacing,
} from './components/field-group/field-group.js';
export { TanreiAccordion, type TanreiAccordionDensity, type TanreiAccordionSeparation, type TanreiAccordionVariant } from './components/accordion/accordion.js';
export { TanreiAppBar, type TanreiAppBarSize, type TanreiAppBarTitleAlignment } from './components/app-bar/app-bar.js';
export {
  TanreiAppShell,
  type TanreiAppShellAsideOrder,
  type TanreiAppShellHeaderPosition,
  type TanreiAppShellMainWidth,
  type TanreiAppShellNavigationOpenChangeDetail,
  type TanreiAppShellScroll,
  type TanreiAppShellSeparation,
  type TanreiAppShellWindowClassChangeDetail,
  type TanreiWindowClass,
} from './components/app-shell/app-shell.js';
export { TanreiAvatar, TanreiAvatarGroup, type TanreiAvatarShape, type TanreiAvatarSize } from './components/avatar/avatar.js';
export { TanreiSwatch, type TanreiSwatchShape, type TanreiSwatchSize } from './components/swatch/swatch.js';
export { TanreiBadge } from './components/badge/badge.js';
export {
  TanreiBottomSheet,
  type TanreiBottomSheetCloseDetail,
  type TanreiBottomSheetCloseReason,
  type TanreiBottomSheetClosedBy,
  type TanreiBottomSheetDetent,
  type TanreiBottomSheetDetentChangeDetail,
  type TanreiBottomSheetVariant,
} from './components/bottom-sheet/bottom-sheet.js';
export {
  TanreiButton,
  type TanreiButtonChangeDetail,
  type TanreiButtonIconPosition,
  type TanreiButtonSize,
  type TanreiButtonVariant,
  type TanreiButtonWidth,
} from './components/button/button.js';
export {
  TanreiButtonGroup,
  type TanreiButtonGroupOrientation,
  type TanreiButtonGroupSeparation,
  type TanreiButtonGroupVariant,
} from './components/button-group/button-group.js';
export {
  TanreiButtonWithMenu,
  type TanreiButtonWithMenuCloseDetail,
  type TanreiButtonWithMenuSeparation,
  type TanreiButtonWithMenuSize,
  type TanreiButtonWithMenuToggleDetail,
  type TanreiButtonWithMenuTrailingWidth,
  type TanreiButtonWithMenuVariant,
} from './components/button-with-menu/button-with-menu.js';
export {
  TanreiCalendar,
  type TanreiCalendarChangeDetail,
  type TanreiCalendarFirstDayOfWeek,
  type TanreiCalendarMode,
  type TanreiCalendarStartView,
} from './components/calendar/calendar.js';
export { TanreiCallout, type TanreiCalloutSize, type TanreiCalloutStatus, type TanreiCalloutVariant } from './components/callout/callout.js';
export { TanreiCard, type TanreiCardVariant } from './components/card/card.js';
export {
  TanreiCarousel,
  type TanreiCarouselContentAlignment,
  type TanreiCarouselHeroAlignment,
  TanreiCarouselItem,
  type TanreiCarouselPausedChangeDetail,
} from './components/carousel/carousel.js';
export { TanreiCheckbox, type TanreiCheckboxChangeDetail } from './components/checkbox/checkbox.js';
export {
  TanreiChip,
  type TanreiChipChangeDetail,
  type TanreiChipKind,
  type TanreiChipSize,
  type TanreiChipVariant,
} from './components/chip/chip.js';
export {
  TanreiCodeBlock,
  type TanreiCodeBlockCopiedDetail,
  type TanreiCodeBlockCopyFailedDetail,
  type TanreiCodeBlockHighlighter,
  type TanreiCodeBlockRun,
  type TanreiCodeBlockSize,
  type TanreiCodeBlockSyntax,
  type TanreiCodeBlockVariant,
} from './components/code-block/code-block.js';
export { TanreiPageHeader, type TanreiPageHeaderActionsPlacement, type TanreiPageHeaderSize } from './components/page-header/page-header.js';
export { TanreiBreadcrumbs, type TanreiBreadcrumbsOverflow, type TanreiBreadcrumbsUnderline } from './components/breadcrumbs/breadcrumbs.js';
export { TanreiPagination, type TanreiPaginationChangeDetail, type TanreiPaginationSize, type TanreiPaginationVariant } from './components/pagination/pagination.js';
export { TanreiTreeView, type TanreiTreeViewChangeDetail, type TanreiTreeViewDensity, type TanreiTreeViewSelection, type TanreiTreeViewToggleDetail } from './components/tree-view/tree-view.js';
export {
  TanreiPopover,
  type TanreiPopoverCloseDetail,
  type TanreiPopoverCloseReason,
  type TanreiPopoverInitialFocus,
  type TanreiPopoverPlacement,
  type TanreiPopoverWidth,
} from './components/popover/popover.js';
// The option elements before the fields that read them: a select (and a combobox) finds its options defined.
export { TanreiOption, TanreiOptionGroup } from './components/option/option.js';
export {
  TanreiSelect,
  type TanreiSelectSeparation,
  type TanreiSelectSize,
  type TanreiSelectToggleDetail,
  type TanreiSelectToggleReason,
  type TanreiSelectVariant,
} from './components/select/select.js';
export { TanreiSelectField } from './components/select-field/select-field.js';
export {
  TanreiCombobox,
  type TanreiComboboxChangeDetail,
  type TanreiComboboxFilter,
  type TanreiComboboxSeparation,
  type TanreiComboboxSize,
  type TanreiComboboxStatus,
  type TanreiComboboxToggleDetail,
  type TanreiComboboxToggleReason,
  type TanreiComboboxVariant,
} from './components/combobox/combobox.js';
export { TanreiComboboxField } from './components/combobox-field/combobox-field.js';
export { TanreiNumberField } from './components/number-field/number-field.js';
export {
  TanreiNumberInput,
  type TanreiNumberInputAlign,
  type TanreiNumberInputEntryErrorDetail,
  type TanreiNumberInputInputDetail,
  type TanreiNumberInputSize,
  type TanreiNumberInputVariant,
} from './components/number-input/number-input.js';
export {
  TanreiColorInput,
  type TanreiColorInputEntryErrorDetail,
  type TanreiColorInputPickerRequestDetail,
  type TanreiColorInputSize,
  type TanreiColorInputVariant,
} from './components/color-input/color-input.js';
export { TanreiColorField } from './components/color-field/color-field.js';
export { TanreiOneTimeCodeInput, type TanreiOneTimeCodeInputDetail, type TanreiOneTimeCodeInputType } from './components/one-time-code-input/one-time-code-input.js';
export { TanreiOneTimeCodeField } from './components/one-time-code-field/one-time-code-field.js';
export { TanreiCheckboxGroup, type TanreiCheckboxGroupChangeDetail } from './components/checkbox-group/checkbox-group.js';
export {
  TanreiChipField,
  type TanreiChipFieldChangeDetail,
  type TanreiChipFieldCheckDetail,
  type TanreiChipFieldRejectDetail,
  type TanreiChipFieldRejectReason,
} from './components/chip-field/chip-field.js';
export {
  TanreiCopyButton,
  type TanreiCopyButtonCopiedDetail,
  type TanreiCopyButtonCopyFailedDetail,
  type TanreiCopyButtonSize,
  type TanreiCopyButtonVariant,
} from './components/copy-button/copy-button.js';
export {
  TanreiDateTimePicker,
  type TanreiDateTimePickerChangeDetail,
  type TanreiDateTimePickerCloseDetail,
  type TanreiDateTimePickerCloseReason,
  type TanreiDateTimePickerEntryMode,
  type TanreiDateTimePickerHourCycle,
  type TanreiDateTimePickerLayout,
  type TanreiDateTimePickerMode,
  type TanreiDateTimePickerPresentation,
  type TanreiDateTimePickerUnit,
} from './components/date-time-picker/date-time-picker.js';
export { TanreiDescriptionList, type TanreiDescriptionListDensity, type TanreiDescriptionListLayout, type TanreiDescriptionListSeparation } from './components/description-list/description-list.js';
export { TanreiDialog, type TanreiDialogClosedBy } from './components/dialog/dialog.js';
export { TanreiModalLayer, type TanreiModalLayerCloseDetail, type TanreiModalLayerCloseReason, type TanreiModalLayerClosedBy } from './components/modal-layer/modal-layer.js';
export { TanreiEmptyState, type TanreiEmptyStateAlign, type TanreiEmptyStateSize } from './components/empty-state/empty-state.js';
export { TanreiSkeleton } from './components/skeleton/skeleton.js';
export {
  TanreiDivider,
  type TanreiDividerInset,
  type TanreiDividerLineCap,
  type TanreiDividerLineStyle,
  type TanreiDividerOrientation,
} from './components/divider/divider.js';
export { TanreiFigure, type TanreiFigureSeparation, type TanreiFigureVariant } from './components/figure/figure.js';
export { TanreiFileItem, type TanreiFileItemDetail, type TanreiFileItemFit, type TanreiFileItemForm, type TanreiFileItemStatus } from './components/file-item/file-item.js';
export {
  TanreiFilePicker,
  type TanreiFilePickerJudgement,
  type TanreiFilePickerLayout,
  type TanreiFilePickerRefused,
  type TanreiFilePickerRejectDetail,
  type TanreiFilePickerRejectReason,
  type TanreiFilePickerSelectDetail,
} from './components/file-picker/file-picker.js';
export {
  TanreiDropZone,
  type TanreiDropZoneJudgement,
  type TanreiDropZoneRefused,
  type TanreiDropZoneRejectDetail,
  type TanreiDropZoneRejectReason,
  type TanreiDropZoneSelectDetail,
} from './components/drop-zone/drop-zone.js';
export { TanreiImagePreview, TanreiImagePreviewItem, type TanreiImagePreviewCloseDetail, type TanreiImagePreviewCloseReason, type TanreiImagePreviewControlsHiddenChangeDetail, type TanreiImagePreviewIndexChangeDetail, type TanreiImagePreviewLoadErrorDetail, type TanreiImagePreviewZoomChangeDetail } from './components/image-preview/image-preview.js';
export {
  TanreiFileUpload,
  type TanreiFileUploadChangeDetail,
  type TanreiFileUploadRefused,
  type TanreiFileUploadRejectDetail,
  type TanreiFileUploadRejectReason,
  type TanreiFileUploadSelectDetail,
} from './components/file-upload/file-upload.js';
export { TanreiLinkCard, type TanreiLinkCardExternal, type TanreiLinkCardTarget, type TanreiLinkCardVariant } from './components/link-card/link-card.js';
export {
  TanreiKeyboardShortcut,
  type TanreiKeyboardShortcutConvention,
  type TanreiKeyboardShortcutSize,
  type TanreiKeyboardShortcutVariant,
} from './components/keyboard-shortcut/keyboard-shortcut.js';
export {
  TanreiList,
  type TanreiListChangeDetail,
  type TanreiListGap,
  TanreiListItem,
  type TanreiListMoveDetail,
  type TanreiListOrientation,
  type TanreiListSelection,
  type TanreiListItemFrame,
  type TanreiListItemContent,
} from './components/list/list.js';
export { TanreiListRow, type TanreiListRowDensity } from './components/list-row/list-row.js';
export {
  TanreiMainActionButton,
  type TanreiMainActionButtonIconPosition,
  type TanreiMainActionButtonSize,
  type TanreiMainActionButtonVariant,
} from './components/main-action-button/main-action-button.js';
export {
  TanreiMenu,
  TanreiMenuCheckboxItem,
  type TanreiMenuCheckboxItemChangeDetail,
  type TanreiMenuCloseDetail,
  type TanreiMenuCloseReason,
  type TanreiMenuContextInput,
  type TanreiMenuContextRequestDetail,
  TanreiMenuGroup,
  type TanreiMenuGroupChangeDetail,
  TanreiMenuItem,
  TanreiMenuItemBase,
  type TanreiMenuPlacement,
  TanreiMenuRadioItem,
  TanreiMenuRowBase,
  type TanreiMenuSeparation,
  type TanreiMenuTrigger,
  TanreiSubmenu,
  type TanreiSubmenuToggleDetail,
} from './components/menu/menu.js';
export { TanreiMenubar, TanreiMenubarItem, TanreiMenubarMenu, type TanreiMenubarMenuToggleDetail } from './components/menubar/menubar.js';
export {
  TanreiNavigationBar,
  TanreiNavigationBarItem,
  type TanreiLabelVisibility,
  type TanreiNavigationBarVariant,
  type TanreiNavigationChangeDetail,
} from './components/navigation-bar/navigation-bar.js';
export {
  TanreiNavigationDrawer,
  TanreiNavigationDrawerGroup,
  TanreiNavigationDrawerItem,
  TanreiNavigationDrawerSection,
  type TanreiNavigationDrawerCollapsedLabels,
  type TanreiNavigationDrawerExpandedChangeDetail,
  type TanreiNavigationDrawerPresentation,
  type TanreiNavigationDrawerPresentationChangeDetail,
  type TanreiNavigationDrawerToggleDetail,
  type TanreiNavigationDrawerVariant,
} from './components/navigation-drawer/navigation-drawer.js';
export { TanreiLoadingIndicator, type TanreiLoadingIndicatorEntrance, type TanreiLoadingIndicatorSize } from './components/loading-indicator/loading-indicator.js';
export {
  TanreiProgressIndicator,
  type TanreiProgressIndicatorSeparation,
  type TanreiProgressIndicatorSize,
  type TanreiProgressIndicatorVariant,
} from './components/progress-indicator/progress-indicator.js';
export { TanreiRadioButton, type TanreiRadioButtonChangeDetail, type TanreiRadioButtonOwner } from './components/radio-button/radio-button.js';
export {
  TanreiRadioGroup,
  type TanreiRadioGroupChangeDetail,
  type TanreiRadioGroupOrientation,
  type TanreiRadioGroupRequiredMark,
  type TanreiRadioGroupRequirement,
} from './components/radio-group/radio-group.js';
export {
  TanreiSearch,
  type TanreiSearchBar,
  type TanreiSearchCloseReason,
  type TanreiSearchPresentation,
  TanreiSearchResult,
  TanreiSearchResultGroup,
  TanreiSearchRow,
  type TanreiSearchSelectDetail,
  type TanreiSearchStatus,
  type TanreiSearchSubmitDetail,
  TanreiSearchSuggestion,
  type TanreiSearchToggleDetail,
} from './components/search/search.js';
export {
  TanreiStepper,
  type TanreiStepperLayout,
  type TanreiStepperPressable,
  type TanreiStepperSelectDetail,
  TanreiStepperStep,
  type TanreiStepperStepStatus,
} from './components/stepper/stepper.js';
export {
  TanreiSideSheet,
  type TanreiSideSheetCloseDetail,
  type TanreiSideSheetCloseReason,
  type TanreiSideSheetVariant,
} from './components/side-sheet/side-sheet.js';
export {
  TanreiSlider,
  type TanreiSliderChangeDetail,
  type TanreiSliderOrientation,
  type TanreiSliderSize,
  type TanreiSliderValueIndicator,
} from './components/slider/slider.js';
export { TanreiSliderField } from './components/slider-field/slider-field.js';
export {
  TanreiSnackbar,
  type TanreiSnackbarDismissDetail,
  type TanreiSnackbarDismissReason,
  type TanreiSnackbarDuration,
  type TanreiSnackbarExpandedChangeDetail,
  TanreiSnackbarHost,
  type TanreiSnackbarOptions,
  type TanreiSnackbarResult,
  type TanreiSnackbarStatus,
} from './components/snackbar/snackbar.js';
export { TanreiSwitch, type TanreiSwitchChangeDetail } from './components/switch/switch.js';
export { TanreiTab, TanreiTabPanel, TanreiTabs, type TanreiTabsChangeDetail, type TanreiTabsVariant } from './components/tabs/tabs.js';
export { TanreiTabView, type TanreiTabViewChangeDetail } from './components/tab-view/tab-view.js';
export {
  TanreiTable,
  type TanreiTableDensity,
  type TanreiTableSelection,
  type TanreiTableSelectionChangeDetail,
  type TanreiTableSeparation,
  type TanreiTableSortDetail,
  type TanreiTableSortDirection,
} from './components/table/table.js';
export {
  TanreiTableOfContents,
  type TanreiTableOfContentsCurrentChangeDetail,
  type TanreiTableOfContentsDensity,
  type TanreiTableOfContentsPresentation,
  type TanreiTableOfContentsSelectDetail,
  type TanreiTableOfContentsToggleDetail,
  type TanreiTableOfContentsTracking,
} from './components/table-of-contents/table-of-contents.js';
export { TanreiTag, type TanreiTagSize, type TanreiTagStatus, type TanreiTagVariant } from './components/tag/tag.js';
export { TanreiTagGroup, type TanreiTagGroupSpacing } from './components/tag-group/tag-group.js';
export { TanreiToolbar, type TanreiToolbarOrientation, type TanreiToolbarVariant } from './components/toolbar/toolbar.js';
export { TanreiTooltip, type TanreiTooltipPlacement, type TanreiTooltipToggleDetail, type TanreiTooltipVariant } from './components/tooltip/tooltip.js';
export { TanreiTextField } from './components/text-field/text-field.js';
export {
  TanreiTextInput,
  type TanreiTextInputActionDetail,
  type TanreiTextInputEntryErrorDetail,
  type TanreiTextInputPickerRequestDetail,
  type TanreiTextInputResize,
  type TanreiTextInputResizeAxis,
  type TanreiTextInputSize,
  type TanreiTextInputType,
  type TanreiTextInputVariant,
} from './components/text-input/text-input.js';
export {
  TanreiEmbeddedTextInput,
  type TanreiEmbeddedTextInputActionDetail,
  type TanreiEmbeddedTextInputEnterKey,
  type TanreiEmbeddedTextInputRowsChangeDetail,
  type TanreiEmbeddedTextInputType,
} from './components/embedded-text-input/embedded-text-input.js';
export {
  TanreiChatComposer,
  type TanreiChatComposerAttachmentForm,
  type TanreiChatComposerAttachments,
  type TanreiChatComposerAttachmentsChangeDetail,
  type TanreiChatComposerLayout,
  type TanreiChatComposerReason,
  type TanreiChatComposerRefused,
  type TanreiChatComposerRejectDetail,
  type TanreiChatComposerRejectReason,
  type TanreiChatComposerSelectDetail,
  type TanreiChatComposerSendDetail,
  type TanreiChatComposerSendKey,
  type TanreiChatComposerSendableDetail,
} from './components/chat-composer/chat-composer.js';

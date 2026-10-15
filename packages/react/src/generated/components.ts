// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../events.js';
import { type Marked, withMarks } from '../marks.js';
import { TanreiAccordion as TanreiAccordionElement } from '@tanrei/web/components/accordion';
import { TanreiAppBar as TanreiAppBarElement } from '@tanrei/web/components/app-bar';
import { TanreiAppShell as TanreiAppShellElement, type TanreiAppShellWindowClassChangeDetail, type TanreiAppShellNavigationOpenChangeDetail } from '@tanrei/web/components/app-shell';
import { TanreiAvatar as TanreiAvatarElement } from '@tanrei/web/components/avatar';
import { TanreiAvatarGroup as TanreiAvatarGroupElement } from '@tanrei/web/components/avatar';
import { TanreiBadge as TanreiBadgeElement } from '@tanrei/web/components/badge';
import { TanreiBottomSheet as TanreiBottomSheetElement, type TanreiBottomSheetCloseDetail, type TanreiBottomSheetDetentChangeDetail } from '@tanrei/web/components/bottom-sheet';
import { TanreiBreadcrumbs as TanreiBreadcrumbsElement } from '@tanrei/web/components/breadcrumbs';
import { TanreiButton as TanreiButtonElement, type TanreiButtonChangeDetail } from '@tanrei/web/components/button';
import { TanreiButtonGroup as TanreiButtonGroupElement } from '@tanrei/web/components/button-group';
import { TanreiButtonWithMenu as TanreiButtonWithMenuElement, type TanreiButtonWithMenuToggleDetail, type TanreiButtonWithMenuCloseDetail } from '@tanrei/web/components/button-with-menu';
import { TanreiCalendar as TanreiCalendarElement, type TanreiCalendarChangeDetail } from '@tanrei/web/components/calendar';
import { TanreiCallout as TanreiCalloutElement } from '@tanrei/web/components/callout';
import { TanreiCard as TanreiCardElement } from '@tanrei/web/components/card';
import { TanreiCarousel as TanreiCarouselElement, type TanreiCarouselPausedChangeDetail } from '@tanrei/web/components/carousel';
import { TanreiCarouselItem as TanreiCarouselItemElement } from '@tanrei/web/components/carousel';
import { TanreiChatComposer as TanreiChatComposerElement, type TanreiChatComposerSendableDetail, type TanreiChatComposerSendDetail, type TanreiChatComposerSelectDetail, type TanreiChatComposerRejectDetail, type TanreiChatComposerAttachmentsChangeDetail } from '@tanrei/web/components/chat-composer';
import { TanreiCheckbox as TanreiCheckboxElement, type TanreiCheckboxChangeDetail } from '@tanrei/web/components/checkbox';
import { TanreiCheckboxGroup as TanreiCheckboxGroupElement, type TanreiCheckboxGroupChangeDetail } from '@tanrei/web/components/checkbox-group';
import { TanreiChip as TanreiChipElement, type TanreiChipChangeDetail } from '@tanrei/web/components/chip';
import { TanreiChipField as TanreiChipFieldElement, type TanreiChipFieldChangeDetail, type TanreiChipFieldRejectDetail, type TanreiChipFieldCheckDetail, type TanreiTextInputActionDetail } from '@tanrei/web/components/chip-field';
import { TanreiCodeBlock as TanreiCodeBlockElement, type TanreiCodeBlockCopiedDetail, type TanreiCodeBlockCopyFailedDetail } from '@tanrei/web/components/code-block';
import { TanreiColorField as TanreiColorFieldElement, type TanreiColorInputPickerRequestDetail, type TanreiColorInputEntryErrorDetail } from '@tanrei/web/components/color-field';
import { TanreiColorInput as TanreiColorInputElement } from '@tanrei/web/components/color-input';
import { TanreiCombobox as TanreiComboboxElement, type TanreiComboboxChangeDetail, type TanreiComboboxToggleDetail } from '@tanrei/web/components/combobox';
import { TanreiComboboxField as TanreiComboboxFieldElement } from '@tanrei/web/components/combobox-field';
import { TanreiCopyButton as TanreiCopyButtonElement, type TanreiCopyButtonCopiedDetail, type TanreiCopyButtonCopyFailedDetail } from '@tanrei/web/components/copy-button';
import { TanreiDateTimePicker as TanreiDateTimePickerElement, type TanreiDateTimePickerChangeDetail, type TanreiDateTimePickerCloseDetail } from '@tanrei/web/components/date-time-picker';
import { TanreiDescriptionList as TanreiDescriptionListElement } from '@tanrei/web/components/description-list';
import { TanreiDialog as TanreiDialogElement, type TanreiDialogDismissDetail } from '@tanrei/web/components/dialog';
import { TanreiDivider as TanreiDividerElement } from '@tanrei/web/components/divider';
import { TanreiDropZone as TanreiDropZoneElement } from '@tanrei/web/components/drop-zone';
import { TanreiEmbeddedTextInput as TanreiEmbeddedTextInputElement, type TanreiEmbeddedTextInputActionDetail, type TanreiEmbeddedTextInputRowsChangeDetail } from '@tanrei/web/components/embedded-text-input';
import { TanreiEmptyState as TanreiEmptyStateElement } from '@tanrei/web/components/empty-state';
import { TanreiFabMenu as TanreiFabMenuElement, type TanreiFabMenuCloseDetail, type TanreiFabMenuToggleDetail } from '@tanrei/web/components/fab-menu';
import { TanreiFabMenuItem as TanreiFabMenuItemElement } from '@tanrei/web/components/fab-menu';
import { TanreiField as TanreiFieldElement } from '@tanrei/web/components/field';
import { TanreiFieldGroup as TanreiFieldGroupElement } from '@tanrei/web/components/field-group';
import { TanreiFigure as TanreiFigureElement } from '@tanrei/web/components/figure';
import { TanreiFileItem as TanreiFileItemElement } from '@tanrei/web/components/file-item';
import { TanreiFilePicker as TanreiFilePickerElement } from '@tanrei/web/components/file-picker';
import { TanreiFileUpload as TanreiFileUploadElement, type TanreiFileUploadMoveDetail } from '@tanrei/web/components/file-upload';
import { TanreiImagePreview as TanreiImagePreviewElement, type TanreiImagePreviewCloseDetail, type TanreiImagePreviewIndexChangeDetail, type TanreiImagePreviewZoomChangeDetail, type TanreiImagePreviewControlsHiddenChangeDetail, type TanreiImagePreviewLoadErrorDetail } from '@tanrei/web/components/image-preview';
import { TanreiImagePreviewItem as TanreiImagePreviewItemElement } from '@tanrei/web/components/image-preview';
import { TanreiKeyboardShortcut as TanreiKeyboardShortcutElement } from '@tanrei/web/components/keyboard-shortcut';
import { TanreiLinkCard as TanreiLinkCardElement } from '@tanrei/web/components/link-card';
import { TanreiList as TanreiListElement, type TanreiListMoveDetail, type TanreiListChangeDetail } from '@tanrei/web/components/list';
import { TanreiListItem as TanreiListItemElement } from '@tanrei/web/components/list';
import { TanreiLoadingIndicator as TanreiLoadingIndicatorElement } from '@tanrei/web/components/loading-indicator';
import { TanreiMainActionButton as TanreiMainActionButtonElement } from '@tanrei/web/components/main-action-button';
import { TanreiMenu as TanreiMenuElement, type TanreiMenuCloseDetail } from '@tanrei/web/components/menu';
import { TanreiMenuCheckboxItem as TanreiMenuCheckboxItemElement, type TanreiMenuCheckboxItemChangeDetail } from '@tanrei/web/components/menu';
import { TanreiMenuGroup as TanreiMenuGroupElement, type TanreiMenuGroupChangeDetail } from '@tanrei/web/components/menu';
import { TanreiMenuItem as TanreiMenuItemElement } from '@tanrei/web/components/menu';
import { TanreiMenuRadioItem as TanreiMenuRadioItemElement } from '@tanrei/web/components/menu';
import { TanreiMenubar as TanreiMenubarElement } from '@tanrei/web/components/menubar';
import { TanreiMenubarItem as TanreiMenubarItemElement } from '@tanrei/web/components/menubar';
import { TanreiMenubarMenu as TanreiMenubarMenuElement, type TanreiMenubarMenuToggleDetail } from '@tanrei/web/components/menubar';
import { TanreiModalLayer as TanreiModalLayerElement, type TanreiModalLayerCloseDetail } from '@tanrei/web/components/modal-layer';
import { TanreiNavigationBar as TanreiNavigationBarElement, type TanreiNavigationChangeDetail } from '@tanrei/web/components/navigation-bar';
import { TanreiNavigationBarItem as TanreiNavigationBarItemElement } from '@tanrei/web/components/navigation-bar';
import { TanreiNavigationDrawer as TanreiNavigationDrawerElement, type TanreiNavigationDrawerExpandedChangeDetail, type TanreiNavigationDrawerPresentationChangeDetail } from '@tanrei/web/components/navigation-drawer';
import { TanreiNavigationDrawerGroup as TanreiNavigationDrawerGroupElement, type TanreiNavigationDrawerToggleDetail } from '@tanrei/web/components/navigation-drawer';
import { TanreiNavigationDrawerItem as TanreiNavigationDrawerItemElement } from '@tanrei/web/components/navigation-drawer';
import { TanreiNavigationDrawerSection as TanreiNavigationDrawerSectionElement } from '@tanrei/web/components/navigation-drawer';
import { TanreiNumberField as TanreiNumberFieldElement, type TanreiNumberInputInputDetail, type TanreiNumberInputEntryErrorDetail } from '@tanrei/web/components/number-field';
import { TanreiNumberInput as TanreiNumberInputElement } from '@tanrei/web/components/number-input';
import { TanreiOneTimeCodeField as TanreiOneTimeCodeFieldElement, type TanreiOneTimeCodeInputDetail } from '@tanrei/web/components/one-time-code-field';
import { TanreiOneTimeCodeInput as TanreiOneTimeCodeInputElement } from '@tanrei/web/components/one-time-code-input';
import { TanreiOption as TanreiOptionElement } from '@tanrei/web/components/option';
import { TanreiOptionGroup as TanreiOptionGroupElement } from '@tanrei/web/components/option';
import { TanreiPageHeader as TanreiPageHeaderElement } from '@tanrei/web/components/page-header';
import { TanreiPagination as TanreiPaginationElement, type TanreiPaginationChangeDetail } from '@tanrei/web/components/pagination';
import { TanreiPopover as TanreiPopoverElement, type TanreiPopoverCloseDetail } from '@tanrei/web/components/popover';
import { TanreiProgressIndicator as TanreiProgressIndicatorElement } from '@tanrei/web/components/progress-indicator';
import { TanreiRadioButton as TanreiRadioButtonElement, type TanreiRadioButtonChangeDetail } from '@tanrei/web/components/radio-button';
import { TanreiRadioGroup as TanreiRadioGroupElement, type TanreiRadioGroupChangeDetail } from '@tanrei/web/components/radio-group';
import { TanreiSearch as TanreiSearchElement, type TanreiSearchToggleDetail, type TanreiSearchSelectDetail, type TanreiSearchSubmitDetail } from '@tanrei/web/components/search';
import { TanreiSearchResult as TanreiSearchResultElement } from '@tanrei/web/components/search';
import { TanreiSearchResultGroup as TanreiSearchResultGroupElement } from '@tanrei/web/components/search';
import { TanreiSearchSuggestion as TanreiSearchSuggestionElement } from '@tanrei/web/components/search';
import { TanreiSegment as TanreiSegmentElement } from '@tanrei/web/components/segmented-button';
import { TanreiSegmentedButton as TanreiSegmentedButtonElement, type TanreiSegmentedButtonChangeDetail } from '@tanrei/web/components/segmented-button';
import { TanreiSelect as TanreiSelectElement, type TanreiSelectToggleDetail } from '@tanrei/web/components/select';
import { TanreiSelectField as TanreiSelectFieldElement } from '@tanrei/web/components/select-field';
import { TanreiSideSheet as TanreiSideSheetElement, type TanreiSideSheetCloseDetail } from '@tanrei/web/components/side-sheet';
import { TanreiSkeleton as TanreiSkeletonElement } from '@tanrei/web/components/skeleton';
import { TanreiSlider as TanreiSliderElement, type TanreiSliderChangeDetail } from '@tanrei/web/components/slider';
import { TanreiSliderField as TanreiSliderFieldElement } from '@tanrei/web/components/slider-field';
import { TanreiSnackbar as TanreiSnackbarElement, type TanreiSnackbarDismissDetail, type TanreiSnackbarExpandedChangeDetail } from '@tanrei/web/components/snackbar';
import { TanreiSnackbarHost as TanreiSnackbarHostElement } from '@tanrei/web/components/snackbar';
import { TanreiStepper as TanreiStepperElement, type TanreiStepperSelectDetail } from '@tanrei/web/components/stepper';
import { TanreiStepperStep as TanreiStepperStepElement } from '@tanrei/web/components/stepper';
import { TanreiSubmenu as TanreiSubmenuElement, type TanreiSubmenuToggleDetail } from '@tanrei/web/components/menu';
import { TanreiSwatch as TanreiSwatchElement } from '@tanrei/web/components/swatch';
import { TanreiSwitch as TanreiSwitchElement, type TanreiSwitchChangeDetail } from '@tanrei/web/components/switch';
import { TanreiTab as TanreiTabElement } from '@tanrei/web/components/tabs';
import { TanreiTabPanel as TanreiTabPanelElement } from '@tanrei/web/components/tabs';
import { TanreiTabView as TanreiTabViewElement, type TanreiTabViewChangeDetail } from '@tanrei/web/components/tab-view';
import { TanreiTable as TanreiTableElement } from '@tanrei/web/components/table';
import { TanreiTableOfContents as TanreiTableOfContentsElement, type TanreiTableOfContentsCurrentChangeDetail, type TanreiTableOfContentsToggleDetail, type TanreiTableOfContentsSelectDetail } from '@tanrei/web/components/table-of-contents';
import { TanreiTabs as TanreiTabsElement, type TanreiTabsChangeDetail } from '@tanrei/web/components/tabs';
import { TanreiTag as TanreiTagElement } from '@tanrei/web/components/tag';
import { TanreiTagGroup as TanreiTagGroupElement } from '@tanrei/web/components/tag-group';
import { TanreiTextField as TanreiTextFieldElement, type TanreiTextInputPickerRequestDetail, type TanreiTextInputEntryErrorDetail } from '@tanrei/web/components/text-field';
import { TanreiTextInput as TanreiTextInputElement } from '@tanrei/web/components/text-input';
import { TanreiToolbar as TanreiToolbarElement } from '@tanrei/web/components/toolbar';
import { TanreiTooltip as TanreiTooltipElement, type TanreiTooltipToggleDetail } from '@tanrei/web/components/tooltip';
import { TanreiTreeView as TanreiTreeViewElement, type TanreiTreeViewCreateDetail, type TanreiTreeViewChangeDetail, type TanreiTreeViewToggleDetail, type TanreiTreeViewRenameDetail } from '@tanrei/web/components/tree-view';

/**
 * Content that a row shows and hides in place. One item is a single disclosure; several are a set whose items open by themselves or, with `exclusive`, one at a time. A help page's questions, the sections of a settings screen, the advanced part of a form.
 *
 * Children, by their `slot`:
 * - default — The items: native `<details>` elements, each with a `<summary>` first. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const Accordion = createComponent({
  tagName: 'tanrei-accordion',
  elementClass: TanreiAccordionElement,
  react: React,
  events: {},
});

/**
 * Names the current screen at its top edge and holds the way back and the screen's most used actions, its bottom edge drawn as the edge of a region that stays (or, under `divider-visibility="scroll"`, only once content scrolls under it).
 *
 * Children, by their `slot`:
 * - `navigation` — The navigation item: one icon-only `<tanrei-button>` (back, menu or close) at the start.
 * - `actions` — The action items: up to three icon-only `<tanrei-button>`s at the end, in reading order.
 */
export const AppBar = createComponent({
  tagName: 'tanrei-app-bar',
  elementClass: TanreiAppBarElement,
  react: React,
  events: {},
});

/**
 * Frames a page or an app: places a header, the navigation, the main content, an aside and a footer, decides from the window's width how each of them is shown, and lets a keyboard reach the content in one step. It draws the frame and none of what stands in it.
 *
 * Children, by their `slot`:
 * - default — The main region: the one `<main>` child without a `slot` attribute. Its `id` is the skip link's destination.
 * - `skip-link` — The skip link: a standalone Link (`class="tanrei-link" data-standalone`) whose `href` is the main region's id, with the product's words. Shown only while it has keyboard focus.
 * - `announcement` — The notice above the header: an element around a callout, across the frame's width.
 * - `header` — The header: a `<header>` around the product's app bar, with the menu button in the bar's navigation slot.
 * - `navigation` — The navigation: a `<tanrei-navigation-drawer responsive>`. Anything else is placed beside the content in an expanded window and is not shown in a narrower one.
 * - `aside` — The aside: an `<aside>` with the product's supporting content, or a side sheet.
 * - `footer` — The footer: a `<footer>` with the product's own layout.
 * - `navigation-bar` — A navigation bar for the bottom edge of a compact window.
 *
 * Events:
 * - `onWindowclasschange` (`windowclasschange`) — The frame decided the window's class for the first time, or the window's width changed it: `detail.windowClass` (and `windowClass`) is `compact`, `medium` or `expanded`.
 * - `onNavigationopenchange` (`navigationopenchange`) — The navigation asks to be presented over the content, or to be put away: the menu button was activated (`detail.navigationOpen` true), or the open navigation closed or the window's class changed (false). `navigationOpen` already holds it.
 */
export const AppShell = createComponent({
  tagName: 'tanrei-app-shell',
  elementClass: TanreiAppShellElement,
  react: React,
  events: {
    onWindowclasschange: 'windowclasschange' as EventName<TanreiEvent<TanreiAppShellElement, CustomEvent<TanreiAppShellWindowClassChangeDetail>>>,
    onNavigationopenchange: 'navigationopenchange' as EventName<TanreiEvent<TanreiAppShellElement, CustomEvent<TanreiAppShellNavigationOpenChangeDetail>>>,
  },
});

/**
 * Stands for a person, or for a team or a project, by a small picture — by initials or a glyph where there is no picture — in a round or a square box of three sizes. A picture, never a control.
 *
 * Children, by their `slot`:
 * - `icon` — The fallback glyph: a glyph of the system's icon set (its ligature text, in an element), drawn where there is neither a picture nor initials. Empty draws the system's own glyph for the shape. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Avatar = createComponent({
  tagName: 'tanrei-avatar',
  elementClass: TanreiAvatarElement,
  react: React,
  events: {},
});

/**
 * Several avatars drawn as one row in which each lies a little over the one before it, with a gap around each, and a last box that counts the members it does not draw: the avatar's group form.
 *
 * Children, by their `slot`:
 * - default — The members: `<tanrei-avatar>` elements, in order from the start edge.
 */
export const AvatarGroup = createComponent({
  tagName: 'tanrei-avatar-group',
  elementClass: TanreiAvatarGroupElement,
  react: React,
  events: {},
});

/**
 * Marks an icon, a navigation item or an avatar with a dot or a small count to show that something is waiting.
 *
 * Children, by their `slot`:
 * - default — The anchor the badge sits on, which it needs: an icon, an icon button, a navigation item or an avatar. Its first element is the one that is described; with none, the badge draws nothing (BDG-16).
 */
export const Badge = createComponent({
  tagName: 'tanrei-badge',
  elementClass: TanreiBadgeElement,
  react: React,
  events: {},
});

/**
 * Shows supplementary content or a short task in a surface that rises from the bottom edge: `standard`, over the lower part of its parent while the content above stays usable (a layout region), or `modal`, a modal step that dims and blocks everything else until it is dismissed (a modal overlay).
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role.
 *
 * Events:
 * - `onClose` (`close`) — The sheet asks to be closed: `detail.reason` is `drag`, `scrim`, `escape` or `back`. Set `open` to false. Only while `closedby` is not `none`.
 * - `onDetentchange` (`detentchange`) — The person moved the sheet to its other height, by a drag or with the handle: `detail.detent` (and `detent`) is the new one. Not fired when you set `detent`.
 */
export const BottomSheet = createComponent({
  tagName: 'tanrei-bottom-sheet',
  elementClass: TanreiBottomSheetElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiBottomSheetElement, CustomEvent<TanreiBottomSheetCloseDetail>>>,
    onDetentchange: 'detentchange' as EventName<TanreiEvent<TanreiBottomSheetElement, CustomEvent<TanreiBottomSheetDetentChangeDetail>>>,
  },
});

/**
 * Shows where a page sits in a hierarchy of pages and leads back up it: the levels above as links, in order from the top, with the page itself last.
 *
 * Children, by their `slot`:
 * - default — The levels, from the top of the hierarchy to the page: `<a href>` and `<span>` children. They stay in the document.
 */
export const Breadcrumbs = createComponent({
  tagName: 'tanrei-breadcrumbs',
  elementClass: TanreiBreadcrumbsElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-button>` that are not properties of the element, as props of `Button`. */
export interface ButtonMarks {
  /** A mark for the component that places this button as an action (a button group, a dialog, a popover, a side sheet): the action completes the task, and is placed at the end of a row and at the top of a column (BGR-13, BGR-14). Read by that component as an attribute; the button draws nothing for it and has no property of the name. */
  confirming?: boolean;
  /** The same mark for the action that backs out of the task: placed at the start of a row and at the bottom of a column. With `confirming` as well, the button is placed as one with neither (BGR-18). */
  dismissive?: boolean;
  /** The id of the form the button belongs to, where it stands outside it (a dialog's actions, a page header): the platform's own attribute, which then wins over a form around the button (BTN-29). The `form` property is read-only and returns the form element. */
  form?: string;
}
const ButtonElement = createComponent({
  tagName: 'tanrei-button',
  elementClass: TanreiButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiButtonElement, CustomEvent<TanreiButtonChangeDetail>>>,
  },
});
/**
 * Lets people take an action, or switch something on and off, with one tap or click — named by a label, an icon, or both.
 *
 * Children, by their `slot`:
 * - default — Label content: the text that names the action. Leave it empty for an icon-only button.
 * - `icon` — The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — A toggle was activated; fired after its `click`. `detail.selected` (and the element's `selected`) is the new value.
 */
export const Button: Marked<typeof ButtonElement, ButtonMarks> = withMarks<ButtonMarks>(['confirming', 'dismissive'], ['form'])(ButtonElement);

/**
 * Lays out a few related Buttons in one row or one column, spaced apart or joined into one shape, places the confirming and the dismissive ones by the orientation, and names them as a group.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-button>` elements, with `confirming` or `dismissive` on the ones the group should place. Anything else is still laid out, and reported in debug builds (BGR-10).
 */
export const ButtonGroup = createComponent({
  tagName: 'tanrei-button-group',
  elementClass: TanreiButtonGroupElement,
  react: React,
  events: {},
});

/**
 * Performs a main action with one press, and offers related actions in a menu from a second, joined button beside it.
 *
 * Children, by their `slot`:
 * - `icon` — The leading half's icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `chevron` — The trailing half's glyph in place of `expand_more` (one glyph of the icon set). Alone, it turns half a turn while open; with `chevron-open` it is the closed form only.
 * - `chevron-open` — The trailing half's glyph while open (one glyph of the icon set): the trailing half then cross-fades between the closed glyph and this one instead of turning. A glyph of either chevron slot that the icon set flags is mirrored in right-to-left (`data-mirror` decides for one use); `expand_more` never is.
 * - `menu` — The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>` and `<tanrei-menu-group>` children, each with `slot="menu"`. Their events are theirs, as in any menu.
 *
 * Events:
 * - `onToggle` (`toggle`) — The trailing half asks to open or close the menu — by a press, a key or, with `hover-open`, a hover: `detail.open` is the value asked for. Set `open` to it.
 * - `onClose` (`close`) — The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export const ButtonWithMenu = createComponent({
  tagName: 'tanrei-button-with-menu',
  elementClass: TanreiButtonWithMenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiButtonWithMenuElement, CustomEvent<TanreiButtonWithMenuToggleDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiButtonWithMenuElement, CustomEvent<TanreiButtonWithMenuCloseDetail>>>,
  },
});

/**
 * Shows one month as a grid of days, in the page or inside a picker, and lets a person choose one date or one range of dates from it.
 *
 * Events:
 * - `onChange` (`change`) — The person chose a day that changes the choice. `value`, `start` and `end` are already the new ones (end empty after a start alone); `detail` holds them too.
 */
export const Calendar = createComponent({
  tagName: 'tanrei-calendar',
  elementClass: TanreiCalendarElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCalendarElement, CustomEvent<TanreiCalendarChangeDetail>>>,
  },
});

/**
 * A notice that is part of the content and stays there, as a quiet fill or an outline, in a status's colors with its glyph. A note, a caution, the reason for something or a summary of what is wrong, in the flow of the page, with an optional title, actions and a close button.
 *
 * Children, by their `slot`:
 * - default — The body: text, or the product's own blocks (paragraphs, lists, a table, a code block, any component). Text placed directly takes the callout's text style and color; long-form blocks go in a `<div class="tanrei-prose" data-measure="false">` (with `data-size="large"` in a large callout).
 * - `icon` — A glyph of the system's icon set (its ligature text, in an element), drawn in place of the status glyph, or as the glyph of a callout without a status. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `title` — The product's own title content in place of `headline`: text with inline content, or a heading of the level the page's outline needs. It is drawn in the title's style; its role and its level are not changed.
 * - `actions` — The product's own Buttons or links, one or two, laid out in a row below the text.
 *
 * Events:
 * - `onDismiss` (`dismiss`) — The person closed the callout with its close button. Fired once, after `open` became false; never when the product sets `open`.
 */
export const Callout = createComponent({
  tagName: 'tanrei-callout',
  elementClass: TanreiCalloutElement,
  react: React,
  events: {
    onDismiss: 'dismiss' as EventName<TanreiEvent<TanreiCalloutElement>>,
  },
});

/**
 * Sets a group of related content apart from its background, and can be one action that opens what it shows.
 *
 * Children, by their `slot`:
 * - default — The content: any layout of media, text and — only when the card is neither interactive nor a link — actions.
 */
export const Card = createComponent({
  tagName: 'tanrei-card',
  elementClass: TanreiCardElement,
  react: React,
  events: {},
});

/**
 * Lets people browse a row of visual items that scrolls sideways around one item in focus — the hero, in the centre (the default) or at the start, the others narrower (fluid widths) or smaller (scaleOthers) as they move away, every two neighbours one gap apart at every scroll position (CRL-40) — each item opening what it shows. A featured row may loop, show its position in dots and advance by itself, with a control to stop it.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-carousel-item>` children: the items, in order.
 *
 * Events:
 * - `onPausedchange` (`pausedchange`) — The person paused or played autoplay with the playback control; `detail.paused` is the new value. Not fired when `paused` is set, nor for a hold.
 */
export const Carousel = createComponent({
  tagName: 'tanrei-carousel',
  elementClass: TanreiCarouselElement,
  react: React,
  events: {
    onPausedchange: 'pausedchange' as EventName<TanreiEvent<TanreiCarouselElement, CustomEvent<TanreiCarouselPausedChangeDetail>>>,
  },
});

/**
 * One item of a carousel — the spec's item kind `item`: the product's content in a rounded box, one action named by its label. A child of `<tanrei-carousel>`, which places it, sizes it and says which item is the Tab stop.
 *
 * Children, by their `slot`:
 * - default — The content: an image or other visual, never anything interactive.
 */
export const CarouselItem = createComponent({
  tagName: 'tanrei-carousel-item',
  elementClass: TanreiCarouselItemElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-chat-composer>` that are not properties of the element, as props of `ChatComposer`. */
export interface ChatComposerMarks {
  /** Web only: the name each kept file is submitted under, while `attachments` is `own` and the chat composer stands in a form. Without it no file is submitted. */
  "files-name"?: string;
  /** The id of the form the chat composer belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ChatComposerElement = createComponent({
  tagName: 'tanrei-chat-composer',
  elementClass: TanreiChatComposerElement,
  react: React,
  events: {
    onSendablechange: 'sendablechange' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendableDetail>>>,
    onSendblocked: 'sendblocked' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendableDetail>>>,
    onSend: 'send' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSendDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerSelectDetail>>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerRejectDetail>>>,
    onAttachmentschange: 'attachmentschange' as EventName<TanreiEvent<TanreiChatComposerElement, CustomEvent<TanreiChatComposerAttachmentsChangeDetail>>>,
    onStop: 'stop' as EventName<TanreiEvent<TanreiChatComposerElement>>,
  },
});
/**
 * Lets a person write a message and send it, in one capsule that holds everything. Built from an Embedded text input (`<tanrei-embedded-text-input>`) — the typing, which grows with what is written — a File picker (`<tanrei-file-picker>`) and File items (`<tanrei-file-item>`) — the attachments, as a strip at the top of the capsule — and Buttons (`<tanrei-button>`): the send button, the stop button in its place, the attach button, and the product's own in its slots. It adds what ties them: the capsule, which is its own part and shows the typing area's focus on its edge; whether what it holds can be sent, and why not; the files it keeps; the counter; one live region; and the form's value. **It never sends**: `send` hands the text and the attachments to the product.
 *
 * Children, by their `slot`:
 * - `leading` — The product's own Buttons after the attach button: before the typing area in the inline layout, at the start of the row beneath it in the stacked one. Laid out and never restyled.
 * - `trailing` — The product's own Buttons before the send button in the inline layout, and at the end of the row beneath the typing area in the stacked one. Laid out and never restyled.
 * - `attach` — The product's own Button in place of the attach button the chat composer brings. Exactly one; it opens the browser's picker. Not drawn while `attachments` is `none`.
 * - `send` — The product's own Button in place of the send button the chat composer brings. Exactly one; it sends, and is disabled while nothing can be sent.
 * - `stop` — The product's own Button in place of the stop button the chat composer brings, shown in the send button's place while `sending` and `stoppable` are set. Exactly one.
 * - default — While `attachments` is `given`: the attachments, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `attachments` is `own` or `none` nothing here is.
 *
 * Events:
 * - `onSendablechange` (`sendablechange`) — Whether what the chat composer holds can be sent changed, or the reasons it cannot did: `detail.sendable`, and `detail.reasons` by name — `disabled`, `sending`, `blocked`, `empty`, `length`, `uploading`, `failed`. Bubbles. Never when it is first drawn.
 * - `onSendblocked` (`sendblocked`) — The person asked to send by the keyboard while it could not be sent for a reason other than being empty or disabled; `detail.reasons` says why. Bubbles.
 * - `onSend` (`send`) — The person sent what the chat composer holds, by the send button or the keyboard, while it could be sent. `detail.value` is the text exactly as written; `detail.attachments` the kept `File`s (`own`) or the values of the File items that have not failed (`given`), in the order of the strip. Bubbles; cancelable — a cancelled one keeps the content and asks no form to submit.
 * - `onSelect` (`select`) — Files were chosen in the picker, dropped on the capsule or pasted, and passed. Once per arrival; `detail.files` is a `File[]` — while `attachments` is `own`, the files newly kept. Bubbles.
 * - `onReject` (`reject`) — Files of one arrival were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * - `onAttachmentschange` (`attachmentschange`) — While `attachments` is `own`: the kept files changed by what a person did — an arrival that kept a file, or a kept file removed by its File item. `detail.files` is the `File[]` now kept. Bubbles. Never for `addFiles()`, `clear()`, the emptying after `send` or a reset.
 * - `onStop` (`stop`) — The person activated the stop button while `sending` and `stoppable` were set. The product stops what is under way and sets `sending`. Bubbles.
 */
export const ChatComposer: Marked<typeof ChatComposerElement, ChatComposerMarks> = withMarks<ChatComposerMarks>([], ['form'])(ChatComposerElement);

/** The attributes of `<tanrei-checkbox>` that are not properties of the element, as props of `Checkbox`. */
export interface CheckboxMarks {
  /** The id of the form the checkbox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const CheckboxElement = createComponent({
  tagName: 'tanrei-checkbox',
  elementClass: TanreiCheckboxElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCheckboxElement, CustomEvent<TanreiCheckboxChangeDetail>>>,
  },
});
/**
 * Lets people turn one independent choice on or off, show a parent choice that is only partly on, and mark a required choice left unmade.
 *
 * Events:
 * - `onChange` (`change`) — The user switched it; `detail.checked` (and the element's `checked`) is the new value.
 */
export const Checkbox: Marked<typeof CheckboxElement, CheckboxMarks> = withMarks<CheckboxMarks>([], ['form'])(CheckboxElement);

/** The attributes of `<tanrei-checkbox-group>` that are not properties of the element, as props of `CheckboxGroup`. */
export interface CheckboxGroupMarks {
  /** The id of the form the checkbox group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const CheckboxGroupElement = createComponent({
  tagName: 'tanrei-checkbox-group',
  elementClass: TanreiCheckboxGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCheckboxGroupElement, CustomEvent<TanreiCheckboxGroupChangeDetail>>>,
  },
});
/**
 * Asks one question that may have several answers among a few choices shown all at once. Built from a field group (`<tanrei-field-group>`) and checkboxes (`<tanrei-checkbox>`): the field group's label, requirement, description and one error around the product's own checkboxes, whose checked values the group holds as one list under one name, and — where `select-all-label` is given — one more checkbox before the first that checks them all.
 *
 * Children, by their `slot`:
 * - default — The checkboxes of the set, in the order given: `<tanrei-checkbox value="…">` elements.
 *
 * Events:
 * - `onChange` (`change`) — The person switched a checkbox of the set, or the select-all checkbox; `detail.value` is a copy of the new list, which the group already holds. Fired once per action, by the group and not by its checkboxes.
 */
export const CheckboxGroup: Marked<typeof CheckboxGroupElement, CheckboxGroupMarks> = withMarks<CheckboxGroupMarks>([], ['form'])(CheckboxGroupElement);

/**
 * Shows a compact choice, a suggested action or an item the user entered as a small labelled control.
 *
 * Children, by their `slot`:
 * - `icon` — The leading icon: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `avatar` — The leading image of an input chip (an `<img>`), in place of the icon. Ignored for other kinds.
 *
 * Events:
 * - `onChange` (`change`) — A filter chip was activated; fired after its `click`, as a native checkbox does. `detail.selected` (and the element's `selected`) is the new value.
 * - `onRemove` (`remove`) — The user asked to remove an input chip, with its remove action or with Backspace or Delete. The chip stays until the page removes it.
 */
export const Chip = createComponent({
  tagName: 'tanrei-chip',
  elementClass: TanreiChipElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiChipElement, CustomEvent<TanreiChipChangeDetail>>>,
    onRemove: 'remove' as EventName<TanreiEvent<TanreiChipElement>>,
  },
});

/** The attributes of `<tanrei-chip-field>` that are not properties of the element, as props of `ChipField`. */
export interface ChipFieldMarks {
  /** The id of the form the chip field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ChipFieldElement = createComponent({
  tagName: 'tanrei-chip-field',
  elementClass: TanreiChipFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldChangeDetail>>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldRejectDetail>>>,
    onCheck: 'check' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiChipFieldCheckDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiChipFieldElement, CustomEvent<TanreiTextInputActionDetail>>>,
  },
});
/**
 * Collects a list of short texts — e-mail addresses, telephone numbers, keywords — typed one after another in one field. Built from a Field (`<tanrei-field>`), the Text input it frames (`<tanrei-text-input>`) and one Chip (`<tanrei-chip>`) for each entry, standing in the Text input's box before the typing part: each text the product's check accepts becomes a chip that can be removed or taken back, and the list is the field's one value.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The list changed by the person: an entry was made, several were made from pasted text, one was removed, or one was taken back to be changed. `detail.value` (and the element's `value`) is the new list, `detail.added` and `detail.removed` what the act added and took away. Never fired when the product sets `value`, nor for typed text.
 * - `onReject` (`reject`) — A candidate entry was refused: `detail.text`, `detail.reason` (`invalid`, `duplicate` or `limit`) and `detail.message`, the words shown. Once for each refused candidate.
 * - `onCheck` (`check`) — Asked once for each candidate entry, before it is made: `detail.text` and `detail.values`, the entries so far. Cancelable: `preventDefault()` refuses the candidate, and `detail.reason`, set by the listener, gives the words shown. Read when the event returns; an answer given later is not read.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const ChipField: Marked<typeof ChipFieldElement, ChipFieldMarks> = withMarks<ChipFieldMarks>([], ['form'])(ChipFieldElement);

/**
 * Shows lines of code to read, compare and copy: in the code face, on a quiet fill or inside one hairline, scrolling inside itself or wrapping, with an optional header, line numbers, marked lines, a prompt and a copy button; given the code and its language it highlights the code by itself, in the system's syntax colors.
 *
 * Children, by their `slot`:
 * - default — The code: one `<pre><code>`. Runs are `<span data-syntax="…">` inside the `<code>`.
 *
 * Events:
 * - `onCopied` (`copied`) — The code was copied by the block's copy button; `detail.text` is the text that was copied.
 * - `onCopyfailed` (`copyfailed`) — The platform refused the copy asked for by the block's copy button; `detail.reason` is its reason, where it gave one.
 */
export const CodeBlock = createComponent({
  tagName: 'tanrei-code-block',
  elementClass: TanreiCodeBlockElement,
  react: React,
  events: {
    onCopied: 'copied' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopiedDetail>>>,
    onCopyfailed: 'copyfailed' as EventName<TanreiEvent<TanreiCodeBlockElement, CustomEvent<TanreiCodeBlockCopyFailedDetail>>>,
  },
});

/** The attributes of `<tanrei-color-field>` that are not properties of the element, as props of `ColorField`. */
export interface ColorFieldMarks {
  /** The id of the form the color field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ColorFieldElement = createComponent({
  tagName: 'tanrei-color-field',
  elementClass: TanreiColorFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiColorFieldElement>>,
    onPickerrequest: 'pickerrequest' as EventName<TanreiEvent<TanreiColorFieldElement, CustomEvent<TanreiColorInputPickerRequestDetail>>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiColorFieldElement, CustomEvent<TanreiColorInputEntryErrorDetail>>>,
  },
});
/**
 * Lets people set one color as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Color input (`<tanrei-color-input>`) it frames: the box — a sample of the value, the value as text, a button that asks for a picker — under the Field's label, or, in the filled and the outlined look, with the label floating in it, with the Field's help and its error, tied together for assistive technology and taking part in a form as one control. It looks and measures like a text field.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onPickerrequest` (`pickerrequest`) — The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 */
export const ColorField: Marked<typeof ColorFieldElement, ColorFieldMarks> = withMarks<ColorFieldMarks>([], ['form'])(ColorFieldElement);

/** The attributes of `<tanrei-color-input>` that are not properties of the element, as props of `ColorInput`. */
export interface ColorInputMarks {
  /** The id of the form the color input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ColorInputElement = createComponent({
  tagName: 'tanrei-color-input',
  elementClass: TanreiColorInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiColorInputElement>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiColorInputElement, CustomEvent<TanreiColorInputEntryErrorDetail>>>,
    onPickerrequest: 'pickerrequest' as EventName<TanreiEvent<TanreiColorInputElement, CustomEvent<TanreiColorInputPickerRequestDetail>>>,
  },
});
/**
 * The box in which people set one color: a text value they can read, type and paste, a sample of it beside the text, a button that asks for a picker and — in the looks that float one — its label inside the box. It looks and measures like a text input. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-color-field>`, which is the two together.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 * - `onPickerrequest` (`pickerrequest`) — The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 */
export const ColorInput: Marked<typeof ColorInputElement, ColorInputMarks> = withMarks<ColorInputMarks>([], ['form'])(ColorInputElement);

/** The attributes of `<tanrei-combobox>` that are not properties of the element, as props of `Combobox`. */
export interface ComboboxMarks {
  /** The id of the form the combobox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ComboboxElement = createComponent({
  tagName: 'tanrei-combobox',
  elementClass: TanreiComboboxElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxToggleDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiComboboxElement, CustomEvent<TanreiComboboxChangeDetail>>>,
  },
});
/**
 * Lets people find one value by typing: a box that looks and measures like a text input, with a list of options that narrows as they type and that they choose from, or, where the product allows it, a value of their own. The bare control: it has no label row and no message of its own.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * - `leading-icon` — A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * - `onAction` (`action`) — The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 */
export const Combobox: Marked<typeof ComboboxElement, ComboboxMarks> = withMarks<ComboboxMarks>([], ['form'])(ComboboxElement);

/** The attributes of `<tanrei-combobox-field>` that are not properties of the element, as props of `ComboboxField`. */
export interface ComboboxFieldMarks {
  /** The id of the form the combobox field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const ComboboxFieldElement = createComponent({
  tagName: 'tanrei-combobox-field',
  elementClass: TanreiComboboxFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxToggleDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiComboboxFieldElement, CustomEvent<TanreiComboboxChangeDetail>>>,
  },
});
/**
 * Lets people find one value by typing, as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Combobox (`<tanrei-combobox>`) it frames: the box with its list of options under the Field's label — or, in the filled and the outlined look, with the label floating in it — with the Field's requirement mark, its help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `leading-icon` — A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * - `onAction` (`action`) — The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 */
export const ComboboxField: Marked<typeof ComboboxFieldElement, ComboboxFieldMarks> = withMarks<ComboboxFieldMarks>([], ['form'])(ComboboxFieldElement);

/**
 * Copies a given text to the clipboard with one press and confirms it — its glyph becomes a check for a moment and assistive technology is told — or says that it could not. It is drawn by Button and never moves the layout.
 *
 * Events:
 * - `onCopied` (`copied`) — The browser confirmed that the text is on the clipboard; `detail.text` is the text.
 * - `onCopyfailed` (`copyfailed`) — The browser refused the copy or has no clipboard to write to; `detail.reason` is its reason, where it gave one.
 */
export const CopyButton = createComponent({
  tagName: 'tanrei-copy-button',
  elementClass: TanreiCopyButtonElement,
  react: React,
  events: {
    onCopied: 'copied' as EventName<TanreiEvent<TanreiCopyButtonElement, CustomEvent<TanreiCopyButtonCopiedDetail>>>,
    onCopyfailed: 'copyfailed' as EventName<TanreiEvent<TanreiCopyButtonElement, CustomEvent<TanreiCopyButtonCopyFailedDetail>>>,
  },
});

/**
 * Lets a person choose a date, a time, or a date and time — or a span of any of them — from a Calendar and time wheels or a clock dial, in a dialog or in a surface that drops down from a field.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a choice that differs from the one before (OK, or choosing a date in a docked picker that sets a date only). `value`, `start` and `end` are already the new ones; `detail` holds them too. Fired before the `close` it causes.
 * - `onClose` (`close`) — The picker asks to be closed: `detail.reason` is `escape`, `back`, `outside`, `tab`, `focus-out`, `cancel`, `confirm` or `select`. Set `open` to false.
 */
export const DateTimePicker = createComponent({
  tagName: 'tanrei-date-time-picker',
  elementClass: TanreiDateTimePickerElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerChangeDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerCloseDetail>>>,
  },
});

/**
 * Presents what is known about one thing as named facts — a quiet term and the value that answers it — with the terms in one column beside their values, above them, or under a large figure. An order, a file, an account, a component; the few numbers a screen opens with. It is laid out by its own width and is never a control.
 *
 * Children, by their `slot`:
 * - default — The native `<dl>`: one `<div>` per fact around a `<dt>` and its `<dd>`s. It is a child in the document, not a slotted node: the element has no shadow root.
 */
export const DescriptionList = createComponent({
  tagName: 'tanrei-description-list',
  elementClass: TanreiDescriptionListElement,
  react: React,
  events: {},
});

/**
 * Stops a person for a decision or a few details that the task cannot go on without, in a surface that dims and blocks everything behind it and always offers at least one answer, until one is chosen or the dialog is dismissed.
 *
 * Children, by their `slot`:
 * - default — Custom content, below the supporting text: it gets the content color, and plain text the body role.
 * - `icon` — A glyph at the headline's start (its ligature text), centred on the headline's first line; or above a centred headline where the system sets `icon.placement` to above. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `actions` — The answers, one at least: Tanrei Buttons, each marked `confirming` or `dismissive`. The dialog places them and gives those without a `variant` its own.
 *
 * Events:
 * - `onCancel` (`cancel`) — Escape, back, a press on the scrim or the close button asked to close it (only while `closedby` is not `none`): `detail.reason` is `escape`, `back`, `scrim` or `close`. Cancelable: `preventDefault()` keeps it open.
 * - `onClose` (`close`) — The dialog closed, whatever closed it.
 */
export const Dialog = createComponent({
  tagName: 'tanrei-dialog',
  elementClass: TanreiDialogElement,
  react: React,
  events: {
    onCancel: 'cancel' as EventName<TanreiEvent<TanreiDialogElement, CustomEvent<TanreiDialogDismissDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiDialogElement>>,
  },
});

/**
 * Separates groups of content in a list, a layout or a toolbar with a thin line.
 */
export const Divider = createComponent({
  tagName: 'tanrei-divider',
  elementClass: TanreiDividerElement,
  react: React,
  events: {},
});

/**
 * Wraps any part of a screen so that files can be dropped anywhere on it, while what it holds is used exactly as without it: it draws nothing at rest and adds no hover, no press, no focus stop and no role (DRZ-1, DRZ-2). While files are dragged over it, one overlay covers it and says they can be dropped (DRZ-4); on the drop it judges them by the File picker's rule and hands over what passed and what was refused (DRZ-9). It keeps nothing (DRZ-10), and it is never the only way to add a file: the page also has a File picker or a File upload (DRZ-13).
 *
 * Children, by their `slot`:
 * - default — The content: any part of the product's screen.
 *
 * Events:
 * - `onSelect` (`select`) — Files were dropped and passed. Once per drop; `detail.files` is a `File[]`. Bubbles.
 * - `onReject` (`reject`) — Files of one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export const DropZone = createComponent({
  tagName: 'tanrei-drop-zone',
  elementClass: TanreiDropZoneElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiDropZoneElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiDropZoneElement>>,
  },
});

/** The attributes of `<tanrei-embedded-text-input>` that are not properties of the element, as props of `EmbeddedTextInput`. */
export interface EmbeddedTextInputMarks {
  /** The id of the form the input belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element. */
  form?: string;
}
const EmbeddedTextInputElement = createComponent({
  tagName: 'tanrei-embedded-text-input',
  elementClass: TanreiEmbeddedTextInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement, CustomEvent<TanreiEmbeddedTextInputActionDetail>>>,
    onRowschange: 'rowschange' as EventName<TanreiEvent<TanreiEmbeddedTextInputElement, CustomEvent<TanreiEmbeddedTextInputRowsChangeDetail>>>,
  },
});
/**
 * The typing alone, for a box that something else draws: the text, a placeholder, the caret and the selection — on one line, or (`multiline`) on lines that wrap, as tall as its lines between `min-rows` and `max-rows` and changing its height with a motion. **It draws no container, fill, edge, padding, label or message, and no focus indication**: whatever holds it — a Tanrei component built from it, or the product's own box — draws the box, shows the focus on the box (`:focus-within`), marks an error, pads the text, names the input (`label`, required: nothing else names it) and decides what its action is. A holder that shows no focus on its box fails WCAG 2.4.7. Where the box is a text field's box, use `<tanrei-text-input>` (or `<tanrei-text-field>`).
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, or `action` was emitted. Bubbles.
 * - `onAction` (`action`) — The person asked for the action of whatever holds the input, by Enter as `enter-key` says or by Ctrl+Enter or Command+Enter. `detail.value` is the value. Bubbles; cancelable — a cancelled one keeps a single-line input from submitting its form.
 * - `onRowschange` (`rowschange`) — The number of lines the input shows is about to change, or it was first drawn: `detail.rows`, and `detail.scrolling` where the text has more lines and scrolls inside. Once per change, before the height moves. Bubbles.
 */
export const EmbeddedTextInput: Marked<typeof EmbeddedTextInputElement, EmbeddedTextInputMarks> = withMarks<EmbeddedTextInputMarks>([], ['form'])(EmbeddedTextInputElement);

/**
 * What stands in the place of content that is not there — a search with no results, a list nobody has added to, a page before its first item: what is missing, why or what to do, and the action that does it. Quiet and flat: no fill, no edge, no elevation.
 *
 * Children, by their `slot`:
 * - default — The description: text, with the product's own links and inline content. Empty draws the title alone.
 * - `media` — A glyph of the system's icon set (its ligature text, in an element), drawn at the media size of the element's size; or a picture or a view of the product's own (an `<img>`, an `<svg>`, any other element), which keeps its own size and colors. Decorative: hidden from assistive technology. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `title` — The product's own title content in place of `headline`: a heading of the level the page's outline needs, or text with inline content. It is drawn in the title's style; its role and its level are not changed.
 * - `actions` — The product's own Buttons or links, one or two, the main one first, laid out in a row below the text.
 */
export const EmptyState = createComponent({
  tagName: 'tanrei-empty-state',
  elementClass: TanreiEmptyStateElement,
  react: React,
  events: {},
});

/**
 * Opens a short list of related actions from a floating action button, which turns into the list's close button while they show.
 *
 * Children, by their `slot`:
 * - `icon` — The toggle's glyph while closed: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - default — The items: `<tanrei-fab-menu-item>` children, two to six, the first drawn at the top.
 *
 * Events:
 * - `onClose` (`close`) — The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 * - `onToggle` (`toggle`) — The toggle asks to open or close the menu: `detail.open` is the value asked for. Set `open` to it.
 */
export const FabMenu = createComponent({
  tagName: 'tanrei-fab-menu',
  elementClass: TanreiFabMenuElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiFabMenuElement, CustomEvent<TanreiFabMenuCloseDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiFabMenuElement, CustomEvent<TanreiFabMenuToggleDetail>>>,
  },
});

/**
 * One action of a FAB menu — the spec's item kind `item`: an icon and a label on a raised container. The host carries the item's semantics (a menu item named by its label, with its position) and takes focus from the FAB menu; it is never a Tab stop. Its colors are the item parts of the FAB menu's variant, which it inherits from the menu.
 */
export const FabMenuItem = createComponent({
  tagName: 'tanrei-fab-menu-item',
  elementClass: TanreiFabMenuItemElement,
  react: React,
  events: {},
});

/**
 * Frames one control with what a form gives every field: a label above it that can say the control is required or optional, a line of help, and the reason a value was refused, each tied to the control for assistive technology. It is a frame, never a control.
 *
 * Children, by their `slot`:
 * - default — The one control the field frames.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Field = createComponent({
  tagName: 'tanrei-field',
  elementClass: TanreiFieldElement,
  react: React,
  events: {},
});

/**
 * Names a set of controls that answer one question — checkboxes, switches, or fields that belong together — with a label that can say the set is required or optional, a description, and one error for the set, and lays the controls out in a column or a row. It frames the set and never selects, moves focus or holds a value.
 *
 * Children, by their `slot`:
 * - default — The controls of the set, in the order given.
 */
export const FieldGroup = createComponent({
  tagName: 'tanrei-field-group',
  elementClass: TanreiFieldGroupElement,
  react: React,
  events: {},
});

/**
 * Sets one thing to look at — a picture, a chart, a specimen, a live example — on a stage of its own, framed or not, with a caption that says what it shows, and optionally a title with the product's controls above and a joined block beneath. It is never pressed and has no state; what stands in it stays as operable as it is anywhere else.
 *
 * Children, by their `slot`:
 * - default — The native `<figure>` — a frame (`data-part="frame"`) around an optional `<header>`, the stage (`data-part="stage"`) and an optional attachment, then an optional `<figcaption>` — or, for a figure the element builds, what is shown. A child in the document, not a slotted node: the element has no shadow root.
 * - `title` — For a figure the element builds: the product's own title content in place of `headline` (text with inline content, or a heading of the level the page's outline needs). In the native form it is the element with `data-part="title"`.
 * - `actions` — For a figure the element builds: the controls at the end of the header. In the native form they are the children of the element with `data-part="actions"`.
 * - `caption` — For a figure the element builds: the product's own caption content in place of `caption`. In the native form it is the `<figcaption>`.
 * - `attachment` — For a figure the element builds: the block joined under the stage. In the native form it is the element with `data-part="attachment"`.
 */
export const Figure = createComponent({
  tagName: 'tanrei-figure',
  elementClass: TanreiFigureElement,
  react: React,
  events: {},
});

/**
 * Shows one file: a glyph that says its format, or a small picture of it; its name; a second line with what the product says of it — its format, its size, where its sending stands, what went wrong; a bar while it is sent; and the actions to take it back and to try it again. As a row of a column of files (`form="row"`, the default) or as a tile of a strip of pictures (`form="tile"`, a box of `width` by `height`). **It never reads, keeps or sends the file** (FIT-7, FIT-33): what it shows is what its props say.
 *
 * Children, by their `slot`:
 * - `icon` — A glyph of the product's own in place of the format's glyph, where a name in the icon set (`glyph`) is not enough. Decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onRetry` (`retry`) — The person asked to try a failed file again. Bubbles and is composed; `detail.value` is the file item's value.
 * - `onRemove` (`remove`) — The person asked to take this file back. Bubbles and is composed; `detail.value` is the file item's value. Whoever holds the file item removes it.
 */
export const FileItem = createComponent({
  tagName: 'tanrei-file-item',
  elementClass: TanreiFileItemElement,
  react: React,
  events: {
    onRetry: 'retry' as EventName<TanreiEvent<TanreiFileItemElement>>,
    onRemove: 'remove' as EventName<TanreiEvent<TanreiFileItemElement>>,
  },
});

/**
 * Lets people choose files through the browser's own picker — from the product's Button and, where there is room, from a place files can also be dragged onto — says the limits in words before the choice, judges what was chosen against them, and hands over what passed and what was refused. **It keeps nothing, lists nothing and takes no part in a form** (FPK-7): whoever holds the files shows them — a `<tanrei-file-upload>` does, with a list and a form value.
 *
 * Children, by their `slot`:
 * - `trigger` — The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * - `icon` — A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onSelect` (`select`) — Files were chosen or dropped and passed. Once per choice; `detail.files` is a `File[]`. Bubbles.
 * - `onReject` (`reject`) — Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export const FilePicker = createComponent({
  tagName: 'tanrei-file-picker',
  elementClass: TanreiFilePickerElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiFilePickerElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiFilePickerElement>>,
  },
});

/** The attributes of `<tanrei-file-upload>` that are not properties of the element, as props of `FileUpload`. */
export interface FileUploadMarks {
  /** The id of the form the file upload belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const FileUploadElement = createComponent({
  tagName: 'tanrei-file-upload',
  elementClass: TanreiFileUploadElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onReject: 'reject' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiFileUploadElement>>,
    onMove: 'move' as EventName<TanreiEvent<TanreiFileUploadElement, CustomEvent<TanreiFileUploadMoveDetail>>>,
  },
});
/**
 * Lets people choose files and shows what was chosen. Built from a File picker (`<tanrei-file-picker>`) — the trigger, the drop area, the limits in words, the judging of a choice — and File items (`<tanrei-file-item>`), one for each file, in a column of rows or a strip of tiles; it adds the state that ties them: which files are kept, the room that is left, one form for all its items, one message for many changes, where focus goes after a removal, and the form's value. **It never uploads**: it opens no connection and reads no byte of a file (FUP-7).
 *
 * Children, by their `slot`:
 * - `trigger` — The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * - `icon` — A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - default — While `rows` is `given`: the rows, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `rows` is `own` nothing here is.
 *
 * Events:
 * - `onSelect` (`select`) — Files were chosen or dropped, passed and found room. Once per choice; `detail.files` is a `File[]` — while `rows` is `own`, the files newly kept. Bubbles.
 * - `onReject` (`reject`) — Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * - `onChange` (`change`) — While `rows` is `own`: the kept files changed by what a person did — a choice or a drop that kept or replaced a file, or a kept file's row removed. Once, after `select` and `reject`; `detail.files` is the `File[]` now kept. Bubbles. Never for `add()`, `clear()`, a reset or a change of `rows`.
 * - `onMove` (`move`) — While `rows` is `given` and `reorderable` is set: a person asked for a row to stand in another place, by the move menu, the keyboard or a drag. `detail.from` and `detail.to`, from 0. The file upload has moved nothing: put your file item in its new place. Bubbles.
 */
export const FileUpload: Marked<typeof FileUploadElement, FileUploadMarks> = withMarks<FileUploadMarks>([], ['form'])(FileUploadElement);

/**
 * Shows one picture of a set over the whole window when the person presses its thumbnail, to be looked at closely — enlarged and back by a double tap, a pinch, a control or a key, moved about while enlarged — and moved on to the next picture or back, until it is closed.
 *
 * Children, by their `slot`:
 * - default — The images: `<tanrei-image-preview-item>` elements, in the order they are shown. They are read, never drawn in place.
 *
 * Events:
 * - `onClose` (`close`) — The person asked to close the preview: `detail.reason` is `button`, `escape`, `back` or `swipe`. Set `open` to false.
 * - `onIndexchange` (`indexchange`) — The person moved to another image: `detail.index`, which `index` already is. Not fired when you set `index`.
 * - `onZoomchange` (`zoomchange`) — The zoom changed by the person's gesture, control or key, or returned to 1 because the image changed: `detail.zoom`, once the change has ended. Not fired when you set `zoom`.
 * - `onControlshiddenchange` (`controlshiddenchange`) — The person hid or showed the controls: `detail.hidden`. Not fired when you set `controlsHidden`.
 * - `onLoaderror` (`loaderror`) — The source of an image the preview asked for did not load: `detail.index`. Once for each source that fails.
 */
export const ImagePreview = createComponent({
  tagName: 'tanrei-image-preview',
  elementClass: TanreiImagePreviewElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewCloseDetail>>>,
    onIndexchange: 'indexchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewIndexChangeDetail>>>,
    onZoomchange: 'zoomchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewZoomChangeDetail>>>,
    onControlshiddenchange: 'controlshiddenchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewControlsHiddenChangeDetail>>>,
    onLoaderror: 'loaderror' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewLoadErrorDetail>>>,
  },
});

/**
 * One picture of an image preview's set: where it is, what it shows in words, and optionally what the product says about it. `<tanrei-image-preview-item src="room-large.jpg" alt="A bedroom with a window onto a garden">`.
 */
export const ImagePreviewItem = createComponent({
  tagName: 'tanrei-image-preview-item',
  elementClass: TanreiImagePreviewItemElement,
  react: React,
  events: {},
});

/**
 * Shows the keys that perform a command, as keys or as text, in the modifier symbols and names of the keyboard the person is using, read aloud in the product's own words.
 */
export const KeyboardShortcut = createComponent({
  tagName: 'tanrei-keyboard-shortcut',
  elementClass: TanreiKeyboardShortcutElement,
  react: React,
  events: {},
});

/**
 * One link drawn as a block: the destination's title, a sentence about it, its picture and the site it is on — from values the card is given and never loads. The host under the text is always computed from `href`.
 *
 * Children, by their `slot`:
 * - default — The product's own anchor, holding the parts (`data-part`: `body` around `title`, `description`, `image-alt`, `site` and `words`; then `media`). A child in the document, not a slotted node: the element has no shadow root. Nothing in it is pressed by itself (LKC-35).
 */
export const LinkCard = createComponent({
  tagName: 'tanrei-link-card',
  elementClass: TanreiLinkCardElement,
  react: React,
  events: {},
});

/**
 * Holds a set of your own items in one column, one line, or lines that wrap into a grid; people read them, open them one by one, choose from them, or drag them into another order.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-list-item>` children.
 *
 * Events:
 * - `onMove` (`move`) — The user asked for an item to stand in another place — by the move menu, the keyboard or a drag: `detail.from` is the item's index and `detail.to` the index it is to have, both from 0. Fired once per move; it bubbles and cannot be cancelled. The list has moved nothing: reorder your items.
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the list already holds.
 */
export const List = createComponent({
  tagName: 'tanrei-list',
  elementClass: TanreiListElement,
  react: React,
  events: {
    onMove: 'move' as EventName<TanreiEvent<TanreiListElement, CustomEvent<TanreiListMoveDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiListElement, CustomEvent<TanreiListChangeDetail>>>,
  },
});

/**
 * One item of a list — the spec's item kind `list-item`: a box around your own content (its children). Placed as a child of `<tanrei-list>`, which decides whether it is an option; otherwise it is static, one action with `interactive`, or a link with `href`.
 *
 * Children, by their `slot`:
 * - default — The item's content: your own — text, an image, a card, a file item. An interactive item, a link item or an option must hold no interactive element (reported in debug builds); a static item may hold your controls, which keep their own semantics and focus.
 */
export const ListItem = createComponent({
  tagName: 'tanrei-list-item',
  elementClass: TanreiListItemElement,
  react: React,
  events: {},
});

/**
 * Shows that a short wait of unknown length is under way, inline or over content.
 */
export const LoadingIndicator = createComponent({
  tagName: 'tanrei-loading-indicator',
  elementClass: TanreiLoadingIndicatorElement,
  react: React,
  events: {},
});

/**
 * Performs the single most important action of a screen on a raised container that floats above the content, showing its icon and its written name (extended), or collapsing to its icon alone.
 *
 * Children, by their `slot`:
 * - `icon` — The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. Required to collapse. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const MainActionButton = createComponent({
  tagName: 'tanrei-main-action-button',
  elementClass: TanreiMainActionButtonElement,
  react: React,
  events: {},
});

/**
 * Offers a short set of actions or choices on a temporary surface that opens from the element that asked for it, with further levels in submenus where the set needs them.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onClose` (`close`) — The menu asks to be closed, every open submenu with it: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export const Menu = createComponent({
  tagName: 'tanrei-menu',
  elementClass: TanreiMenuElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiMenuElement, CustomEvent<TanreiMenuCloseDetail>>>,
  },
});

/**
 * An option switched on or off on its own — the spec's item kind `checkbox-item`. Its `checked` is its own: the menu switches it when the item is activated and fires the item's `change`. A checked item's row is filled, and it is marked as the design system chooses (`comp.menu.checkbox-item.mark`: the checkbox look, a box in both conditions, in the default system; the icon set's check in m3-like and cupertino) unless the item or its group names a glyph.
 *
 * Events:
 * - `onChange` (`change`) — The item was activated: `detail.checked` (and the element's `checked`) is the new value.
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuCheckboxItem = createComponent({
  tagName: 'tanrei-menu-checkbox-item',
  elementClass: TanreiMenuCheckboxItemElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiMenuCheckboxItemElement, CustomEvent<TanreiMenuCheckboxItemChangeDetail>>>,
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuCheckboxItemElement, MouseEvent>>,
  },
});

/**
 * A run of related items — the spec's item kind `group` — optionally under a title (its `label`, as `<optgroup label>`: a `title` attribute would also draw the browser's tooltip), which names it. The menu separates a group from what is next to it, by a divider or a gap as its `separation` names; a group of radio items is one set of choices, and holds which one is checked in `value`.
 *
 * Children, by their `slot`:
 * - default — The group's items.
 *
 * Events:
 * - `onChange` (`change`) — A radio item of the group was chosen: `detail.value` (and the element's `value`) is the new value.
 */
export const MenuGroup = createComponent({
  tagName: 'tanrei-menu-group',
  elementClass: TanreiMenuGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiMenuGroupElement, CustomEvent<TanreiMenuGroupChangeDetail>>>,
  },
});

/**
 * An action in a menu — the spec's item kind `item`: it does something and closes the menu.
 *
 * Events:
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuItem = createComponent({
  tagName: 'tanrei-menu-item',
  elementClass: TanreiMenuItemElement,
  react: React,
  events: {
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuItemElement, MouseEvent>>,
  },
});

/**
 * One choice of several in its group — the spec's item kind `radio-item`: it is checked while its group's `value` is its own. A checked item's row is filled, and it is marked as the design system chooses (`comp.menu.radio-item.mark`: the radio look, a ring in both conditions, in the default system; the icon set's check in m3-like and cupertino) unless the item or its group names a glyph.
 *
 * Events:
 * - `onClick` (`click`) — the native event, listened to on the element.
 */
export const MenuRadioItem = createComponent({
  tagName: 'tanrei-menu-radio-item',
  elementClass: TanreiMenuRadioItemElement,
  react: React,
  events: {
    onClick: 'click' as EventName<TanreiEvent<TanreiMenuRadioItemElement, MouseEvent>>,
  },
});

/**
 * Keeps an application's commands within reach in one persistent row of named menus (File, Edit, View…), each opening a menu below its title, with the arrow keys moving along the row and into each menu.
 *
 * Children, by their `slot`:
 * - default — The entries, in the order given: `<tanrei-menubar-menu>` and `<tanrei-menubar-item>` elements. Anything else gets no title, no key and no place in the row, and is reported in debug builds (MBR-20).
 */
export const Menubar = createComponent({
  tagName: 'tanrei-menubar',
  elementClass: TanreiMenubarElement,
  react: React,
  events: {},
});

/**
 * A bar item of a menubar — the spec's item kind `item`: an entry of the row that acts by itself instead of opening a menu. It is drawn exactly as a menu's title is and reached by the same keys; nothing at rest tells them apart but their words, so name an action with a verb ("Run") and a link with its place ("Documentation").
 *
 * Children, by their `slot`:
 * - default — A link item's anchor: one `<a href>` child of the product's own. An action has no child.
 */
export const MenubarItem = createComponent({
  tagName: 'tanrei-menubar-item',
  elementClass: TanreiMenubarItemElement,
  react: React,
  events: {},
});

/**
 * One menu of a menubar — the spec's item kind `menu`: its title in the bar's row, and the items that open below it.
 *
 * Children, by their `slot`:
 * - default — The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The person opened or closed the menu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes to `open` fires none. A submenu item's `toggle` bubbles through the element too: tell them apart by the event's target.
 */
export const MenubarMenu = createComponent({
  tagName: 'tanrei-menubar-menu',
  elementClass: TanreiMenubarMenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiMenubarMenuElement, CustomEvent<TanreiMenubarMenuToggleDetail>>>,
  },
});

/**
 * The layer under every modal surface: it dims the window behind what it presents, makes everything there inert, moves focus in, keeps it there and gives it back, and asks to close on Escape, the platform's back or a press on the dim. The dialog, the modal sheets, the modal drawer, the image preview, the modal picker and the search's modal views are built from it; use it alone for a modal surface Tanrei does not have (a command palette, a takeover of the window).
 *
 * Children, by their `slot`:
 * - default — The content: the surface you present modally. The layer draws, styles and sizes nothing of it.
 *
 * Events:
 * - `onClose` (`close`) — The layer asks to be closed: `detail.reason` is `escape`, `back` or `scrim`. Set `open` to false. Only while `closedby` is not `none`.
 */
export const ModalLayer = createComponent({
  tagName: 'tanrei-modal-layer',
  elementClass: TanreiModalLayerElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiModalLayerElement, CustomEvent<TanreiModalLayerCloseDetail>>>,
  },
});

/**
 * Three to five top-level destinations along the bottom edge of a compact window, one of them the current screen.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-bar-item>` children: the destinations.
 *
 * Events:
 * - `onChange` (`change`) — The user activated another destination, or released a drag of the active indicator on one: `detail.value` (and, for a button destination, the bar's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * - `onReselect` (`reselect`) — The user activated the selected destination again: `detail.value` is its value; for a link, as `change`. A drag that returns the indicator to it does not fire it.
 */
export const NavigationBar = createComponent({
  tagName: 'tanrei-navigation-bar',
  elementClass: TanreiNavigationBarElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiNavigationBarElement, CustomEvent<TanreiNavigationChangeDetail>>>,
    onReselect: 'reselect' as EventName<TanreiEvent<TanreiNavigationBarElement, CustomEvent<TanreiNavigationChangeDetail>>>,
  },
});

/**
 * One destination of a navigation bar — the spec's item kind `destination`: an icon, a label under it and an optional badge on the icon, inside the item container. Placed as a child of `<tanrei-navigation-bar>`, in order; the bar decides whether it is the selected one and answers its activation.
 */
export const NavigationBarItem = createComponent({
  tagName: 'tanrei-navigation-bar-item',
  elementClass: TanreiNavigationBarItemElement,
  react: React,
  events: {},
});

/**
 * A panel of destinations at the start edge, in two variants — `standard`, a layout region beside the content, and `modal`, a modal overlay over a scrim that closes itself after a destination is chosen — and, while `collapsible`, in two forms: expanded, and collapsed to a column of icons, which is the expanded drawer with its labels gone: every row is the same row cut after its icon, at the same height and with the same corners, and every icon exactly in place while the drawer moves between the two. A collapsed cell shows its name in a plain tooltip on hover and keyboard focus; `collapsed-labels` draws short labels under the icons instead, for a product or a system whose column is labelled.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>`, `<tanrei-navigation-drawer-group>` and `<tanrei-navigation-drawer-section>` children.
 * - `header-button` — Icon-only `<tanrei-button>`s stacked in the icon column; the first is the menu button while the drawer is collapsible.
 * - `main-action` — A `<tanrei-main-action-button>` below the header buttons, collapsed to its icon with the drawer. Only the first is drawn.
 * - `header` — Content beside the first header button while the drawer is expanded (a title, an account switcher). Its box gives what it holds the header's inherited text style and color (`comp.navigation-drawer.header.typescale` and `.color`): plain text is drawn in them, and an element that sets its own keeps it.
 *
 * Events:
 * - `onClose` (`close`) — A modal drawer closed: the scrim, Escape, back, a drag, the menu button, or after a destination was activated. `open` is already false.
 * - `onExpandedchange` (`expandedchange`) — The user asked a collapsible drawer for its other form (its menu button, or a group's cell while collapsed): `detail.expanded`. `expanded` (or, for a modal drawer, `open`) already holds it.
 * - `onPresentationchange` (`presentationchange`) — A responsive drawer decided its presentation for the first time, or the window's width changed it: `detail.presentation` (and `presentation`) is `standard`, `column` or `modal`. A product shows its own menu button while it is `modal`.
 * - `onChange` (`change`) — The user activated another destination: `detail.value` (and, for a button destination, the drawer's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * - `onReselect` (`reselect`) — The user activated the selected destination again; for a link, as `change`.
 */
export const NavigationDrawer = createComponent({
  tagName: 'tanrei-navigation-drawer',
  elementClass: TanreiNavigationDrawerElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiNavigationDrawerElement>>,
    onExpandedchange: 'expandedchange' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>>>,
    onPresentationchange: 'presentationchange' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationDrawerPresentationChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationChangeDetail>>>,
    onReselect: 'reselect' as EventName<TanreiEvent<TanreiNavigationDrawerElement, CustomEvent<TanreiNavigationChangeDetail>>>,
  },
});

/**
 * A group of a drawer's destinations — the spec's item kind `group`: a row that opens and closes it (an icon, a label, a short label for the collapsed drawer, and the icon set's `expand_more` turned half a turn while open), and under it, indented one level further, its `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children. A collapsed drawer draws it as one cell; activating that cell expands the drawer with the group open.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The user opened or closed the group from its row, or from its cell in the collapsed drawer, or the drawer opened it to show the selected destination (`reveal-selected`, NVD-58): `detail.open` (and `open`) is its new state. Bubbles.
 */
export const NavigationDrawerGroup = createComponent({
  tagName: 'tanrei-navigation-drawer-group',
  elementClass: TanreiNavigationDrawerGroupElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiNavigationDrawerGroupElement, CustomEvent<TanreiNavigationDrawerToggleDetail>>>,
  },
});

/**
 * One destination of a navigation drawer — the spec's item kind `destination`: an icon, a label (a short label while the drawer is collapsed), optional trailing content at the end of its row and an optional badge on its icon. A child of `<tanrei-navigation-drawer>`, of one of its sections or of one of its groups, in order.
 *
 * Children, by their `slot`:
 * - `trailing` — Content at the end of the expanded row, in place of `trailing-text`: a glyph of the icon set (drawn at comp.navigation-drawer.item.trailing-icon.size, e.g. `open_in_new`), a short text. Not interactive. A count belongs in `trailing-text`, and a badge on the icon (`badge`): a badge needs an anchor, and the end of the row has none.
 */
export const NavigationDrawerItem = createComponent({
  tagName: 'tanrei-navigation-drawer-item',
  elementClass: TanreiNavigationDrawerItemElement,
  react: React,
  events: {},
});

/**
 * A group of a drawer's destinations and groups under an optional heading — the spec's item kind `section`: the divider component before it while `divider` is set, its heading (a heading, level 2 unless `heading-level` says otherwise) and its children. Sections do not nest and do not go inside a group: such a section draws only its items, in its place, and a debug build says so (NVD-17). Collapsed, its heading keeps its row and draws no text (NVD-16).
 *
 * Children, by their `slot`:
 * - default — `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 */
export const NavigationDrawerSection = createComponent({
  tagName: 'tanrei-navigation-drawer-section',
  elementClass: TanreiNavigationDrawerSectionElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-number-field>` that are not properties of the element, as props of `NumberField`. */
export interface NumberFieldMarks {
  /** The id of the form the number field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const NumberFieldElement = createComponent({
  tagName: 'tanrei-number-field',
  elementClass: TanreiNumberFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiNumberFieldElement, CustomEvent<TanreiNumberInputInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiNumberFieldElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiNumberFieldElement>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiNumberFieldElement, CustomEvent<TanreiNumberInputEntryErrorDetail>>>,
  },
});
/**
 * Lets people enter a number as one complete field. Built from a Field (`<tanrei-field>`) and the Number input (`<tanrei-number-input>`) it frames: the box — the number, its unit and its two steppers — under the Field's label, or, in the filled and the outlined look, with the label floating in it; with the Field's requirement mark, its help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * - `onChange` (`change`) — A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onAction` (`action`) — The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 */
export const NumberField: Marked<typeof NumberFieldElement, NumberFieldMarks> = withMarks<NumberFieldMarks>([], ['form'])(NumberFieldElement);

/** The attributes of `<tanrei-number-input>` that are not properties of the element, as props of `NumberInput`. */
export interface NumberInputMarks {
  /** The id of the form the number input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const NumberInputElement = createComponent({
  tagName: 'tanrei-number-input',
  elementClass: TanreiNumberInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiNumberInputElement>>,
    onInput: 'input' as EventName<TanreiEvent<TanreiNumberInputElement, CustomEvent<TanreiNumberInputInputDetail>>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiNumberInputElement, CustomEvent<TanreiNumberInputEntryErrorDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiNumberInputElement>>,
  },
});
/**
 * The box of a number: lets people enter a number as a number — typed in their locale's form or stepped by a key or a button, kept within limits, with its unit beside it — and draws no row around it. A `<tanrei-field>` frames it with a label, a requirement mark, help and an error, or the product names it with `label` where its visible label is elsewhere: the head of a table's column, a toolbar, the title of a row that also holds a slider. `<tanrei-number-field>` is the two as one element.
 *
 * Events:
 * - `onChange` (`change`) — A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onInput` (`input`) — The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryerror` (`entryerror`) — The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 * - `onAction` (`action`) — The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 */
export const NumberInput: Marked<typeof NumberInputElement, NumberInputMarks> = withMarks<NumberInputMarks>([], ['form'])(NumberInputElement);

/** The attributes of `<tanrei-one-time-code-field>` that are not properties of the element, as props of `OneTimeCodeField`. */
export interface OneTimeCodeFieldMarks {
  /** The id of the form the one-time-code field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const OneTimeCodeFieldElement = createComponent({
  tagName: 'tanrei-one-time-code-field',
  elementClass: TanreiOneTimeCodeFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onComplete: 'complete' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiOneTimeCodeFieldElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
  },
});
/**
 * Asks for a short code sent to the person as one complete field. Built from a Field (`<tanrei-field>`) and the One-time-code input (`<tanrei-one-time-code-input>`) it frames: the input under the Field's label, with the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the value; the element's `value` is already the new one.
 * - `onChange` (`change`) — The person committed a changed value: focus left the field, or Enter was pressed.
 * - `onComplete` (`complete`) — A change by the person left the value `length` characters long. After that change's input, once.
 * - `onAction` (`action`) — The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 */
export const OneTimeCodeField: Marked<typeof OneTimeCodeFieldElement, OneTimeCodeFieldMarks> = withMarks<OneTimeCodeFieldMarks>([], ['form'])(OneTimeCodeFieldElement);

/** The attributes of `<tanrei-one-time-code-input>` that are not properties of the element, as props of `OneTimeCodeInput`. */
export interface OneTimeCodeInputMarks {
  /** The id of the form the one-time-code input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const OneTimeCodeInputElement = createComponent({
  tagName: 'tanrei-one-time-code-input',
  elementClass: TanreiOneTimeCodeInputElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onComplete: 'complete' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiOneTimeCodeInputElement, CustomEvent<TanreiOneTimeCodeInputDetail>>>,
  },
});
/**
 * Takes a short code sent to the person — a sign-in or verification code — as one text value drawn in separate cells, so that its length and what is still missing can be seen, and the browser can fill it in one step.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the value; the element's `value` is already the new one.
 * - `onComplete` (`complete`) — A change by the person left the value `length` characters long. After that change's input, once.
 * - `onChange` (`change`) — The person committed a changed value: focus left the field, or Enter was pressed.
 * - `onAction` (`action`) — The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 */
export const OneTimeCodeInput: Marked<typeof OneTimeCodeInputElement, OneTimeCodeInputMarks> = withMarks<OneTimeCodeInputMarks>([], ['form'])(OneTimeCodeInputElement);

/**
 * One choice of a select or a combobox: a label, the value it stands for, and optionally a supporting line and a glyph. `<tanrei-option value="jp">Japan</tanrei-option>`: the label is the `label` attribute or, without one, the element's text, as a native `<option>`'s.
 *
 * Children, by their `slot`:
 * - default — The option's label, as text, where the `label` attribute is not given. It is read, never drawn in place.
 */
export const Option = createComponent({
  tagName: 'tanrei-option',
  elementClass: TanreiOptionElement,
  react: React,
  events: {},
});

/**
 * A run of related options of a select or a combobox, optionally titled: `<tanrei-option-group label="Asia">…</tanrei-option-group>`. The title is the `label` attribute, as a native `<optgroup>`'s — a `title` attribute would also draw the browser's tooltip. The field separates a group from what is next to it by a divider or a gap.
 *
 * Children, by their `slot`:
 * - default — The group's `<tanrei-option>` elements.
 */
export const OptionGroup = createComponent({
  tagName: 'tanrei-option-group',
  elementClass: TanreiOptionGroupElement,
  react: React,
  events: {},
});

/**
 * The head of a page's content: the page's title as its heading, with a sentence that says what the page is, a line of facts about it, the actions for the whole page and the way back up above it — in the content, scrolling with it, laid out by its own width, and never a control.
 *
 * Children, by their `slot`:
 * - default — The page's own elements, in reading order: the breadcrumbs, `[data-part="eyebrow"]`, the heading, the description's `p`, `[data-part="meta"]` and `[data-part="actions"]`. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const PageHeader = createComponent({
  tagName: 'tanrei-page-header',
  elementClass: TanreiPageHeaderElement,
  react: React,
  events: {},
});

/**
 * Moves through the numbered pages of one list — search results, the posts of a blog, the rows of a table: a row of page numbers with the current page marked and the pages that do not fit left out behind an ellipsis, previous and next, first and last where the product asks for them, and a short form that says which page of how many.
 *
 * Events:
 * - `onChange` (`change`) — The person asked for another page: `detail.page`. Fired before the page changes and before a link is followed; cancelable — `preventDefault()` keeps the page and opens nothing.
 */
export const Pagination = createComponent({
  tagName: 'tanrei-pagination',
  elementClass: TanreiPaginationElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiPaginationElement, CustomEvent<TanreiPaginationChangeDetail>>>,
  },
});

/**
 * Shows content a person can read and operate on a small surface that opens beside the control they pressed and stays with it, without dimming or blocking the rest of the page.
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * - `actions` — Tanrei Buttons, each marked `confirming` or `dismissive` where it is one. The popover places them and gives those without a `variant` its own; it never restyles them.
 *
 * Events:
 * - `onClose` (`close`) — The popover asks to be closed: `detail.reason` is `escape`, `outside`, `focus-out`, `close` (its close button) or `anchor-hidden`. Set `open` to false.
 */
export const Popover = createComponent({
  tagName: 'tanrei-popover',
  elementClass: TanreiPopoverElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiPopoverElement, CustomEvent<TanreiPopoverCloseDetail>>>,
  },
});

/**
 * Shows how far a task has come, or that it is under way when how far is unknown, as a bar or a ring.
 */
export const ProgressIndicator = createComponent({
  tagName: 'tanrei-progress-indicator',
  elementClass: TanreiProgressIndicatorElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-radio-button>` that are not properties of the element, as props of `RadioButton`. */
export interface RadioButtonMarks {
  /** The id of the form the radio button belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const RadioButtonElement = createComponent({
  tagName: 'tanrei-radio-button',
  elementClass: TanreiRadioButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiRadioButtonElement, CustomEvent<TanreiRadioButtonChangeDetail>>>,
  },
});
/**
 * Lets people choose exactly one option from a small group shown all at once.
 *
 * Events:
 * - `onChange` (`change`) — The user selected this option; `detail.value` is its value.
 */
export const RadioButton: Marked<typeof RadioButtonElement, RadioButtonMarks> = withMarks<RadioButtonMarks>([], ['form'])(RadioButtonElement);

/** The attributes of `<tanrei-radio-group>` that are not properties of the element, as props of `RadioGroup`. */
export interface RadioGroupMarks {
  /** The id of the form the radio group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const RadioGroupElement = createComponent({
  tagName: 'tanrei-radio-group',
  elementClass: TanreiRadioGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiRadioGroupElement, CustomEvent<TanreiRadioGroupChangeDetail>>>,
  },
});
/**
 * Asks one question that has exactly one answer among a few options shown all at once. Built from a field group (`<tanrei-field-group>`) and radio buttons (`<tanrei-radio-button>`): the field group itself, in its radio-group kind — its label, requirement, description and one error — around the product's own radio buttons, whose chosen value the group holds under one name.
 *
 * Children, by their `slot`:
 * - default — The radio buttons of the set, in the order given: `<tanrei-radio-button value="…">` elements.
 *
 * Events:
 * - `onChange` (`change`) — The person selected another option; `detail.value` is the new value, which the group already holds.
 */
export const RadioGroup: Marked<typeof RadioGroupElement, RadioGroupMarks> = withMarks<RadioGroupMarks>([], ['form'])(RadioGroupElement);

/** The attributes of `<tanrei-search>` that are not properties of the element, as props of `Search`. */
export interface SearchMarks {
  /** The id of the form the search belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SearchElement = createComponent({
  tagName: 'tanrei-search',
  elementClass: TanreiSearchElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchToggleDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchSelectDetail>>>,
    onSubmit: 'submit' as EventName<TanreiEvent<TanreiSearchElement, CustomEvent<TanreiSearchSubmitDetail>>>,
  },
});
/**
 * Lets people search the product from a bar or a compact trigger, and offers suggestions and results while they type in a view under the bar, in a dialog or over the whole screen.
 *
 * Children, by their `slot`:
 * - `leading` — An icon button at the bar's start (a menu or back button), drawn in place of the search glyph.
 * - `trailing` — Up to two icon buttons at the bar's end, after the clear button (voice input, account). The bar's action buttons — the clear button and these — stand `container.button-gap` apart (0 in the default system), each keeping a touch target's length along the row: two medium Buttons stand 8 apart, the small clear button and a medium one 12 (SRC-34).
 * - default — The product's own content in the view, after the suggestions, the status row and the results (a button that loads more results, a link to the full results page, richer content for an empty query); and the item children: `<tanrei-search-suggestion>`, which the search draws as rows, and `<tanrei-search-result>` and `<tanrei-search-result-group>`, which it places after the status row.
 *
 * Events:
 * - `onToggle` (`toggle`) — The search opened or closed its view: `detail.expanded` (and the element's `expanded`) is the new value, and `detail.reason` says why it closed (`escape`, `back`, `select`, `submit`, `outside`, `tab`, `focus-out`, `shortcut`), or `null` when it opened.
 * - `onSelect` (`select`) — The person chose a suggestion, or activated a result in place (without a modifier key, in the same window): `detail.value` is its value. The search does not change `value`; set the value you want. For a result it is fired before the browser follows the link and is cancelable: cancelling it keeps the link from being followed, so that a router can take it. A result opened in a new tab (a modifier key, the middle button, `target="new"`) fires nothing.
 * - `onSubmit` (`submit`) — The action key (Enter, Search) was pressed with no suggestion active: `detail.value`. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const Search: Marked<typeof SearchElement, SearchMarks> = withMarks<SearchMarks>([], ['form'])(SearchElement);

/**
 * A thing the search found that the person can go to — the spec's item kind `result`: a page, a section of a page, a message, a file. It is a link, never an option: with `href` its row is an `<a>` in its shadow root, which the browser follows as it follows any link; without one it is a `<button>`, and `select` is all that happens.
 *
 * Children, by their `slot`:
 * - default — The excerpt: text, with `<mark>` elements for the matches.
 */
export const SearchResult = createComponent({
  tagName: 'tanrei-search-result',
  elementClass: TanreiSearchResultElement,
  react: React,
  events: {},
});

/**
 * Results that belong together, under one heading — the spec's item kind `result-group`: the sections found in one page, or the results of one kind. With `href` its heading is itself a result (the page), drawn as a result's row, and its `<tanrei-search-result>` children are inset under it as its parts; without one its heading is a quiet title.
 *
 * Children, by their `slot`:
 * - default — The group's `<tanrei-search-result>` children and, while `href` is set, the heading's excerpt (text with `<mark>`).
 */
export const SearchResultGroup = createComponent({
  tagName: 'tanrei-search-result-group',
  elementClass: TanreiSearchResultGroupElement,
  react: React,
  events: {},
});

/**
 * A suggestion the search offers while the person types — the spec's item kind `suggestion`: a query they searched before, or a completion. Choosing it fires `select` and the product sets the value; a thing the product opens is a `<tanrei-search-result>`. It is data, as an `<option>` in a `<datalist>`: the search draws the row, names it and answers it; the element itself draws nothing.
 */
export const SearchSuggestion = createComponent({
  tagName: 'tanrei-search-suggestion',
  elementClass: TanreiSearchSuggestionElement,
  react: React,
  events: {},
});

/**
 * One option of a segmented button — the spec's item kind `segment`: a label, an optional icon, and the value that selects it. Placed as a child of `<tanrei-segmented-button>`, as `<option>` in a `<select>`; the set decides whether it is selected and which segment is the Tab stop, and answers its activation.
 */
export const Segment = createComponent({
  tagName: 'tanrei-segment',
  elementClass: TanreiSegmentElement,
  react: React,
  events: {},
});

/**
 * Lets people choose one option, or several, from two to five related options drawn side by side as the joined segments of one control.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-segment>` children: the segments.
 *
 * Events:
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the set already holds.
 */
export const SegmentedButton = createComponent({
  tagName: 'tanrei-segmented-button',
  elementClass: TanreiSegmentedButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSegmentedButtonElement, CustomEvent<TanreiSegmentedButtonChangeDetail>>>,
  },
});

/** The attributes of `<tanrei-select>` that are not properties of the element, as props of `Select`. */
export interface SelectMarks {
  /** The id of the form the select belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SelectElement = createComponent({
  tagName: 'tanrei-select',
  elementClass: TanreiSelectElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSelectElement, CustomEvent<TanreiSelectToggleDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSelectElement>>,
  },
});
/**
 * Lets people choose one value from a closed list: a trigger that looks and measures like a text input's box and shows the chosen option, and a list of options, optionally grouped, that opens from it. The bare control: it draws no label row, no requirement mark, no help and no error text.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place.
 * - `leading-icon` — A glyph at the start of the container that stands for the field whatever is chosen (a globe before a language). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onToggle` (`toggle`) — The list was opened or closed by the person; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `escape`, `outside`, `focus-out`, `anchor-hidden`, `press` or `tab`. After a choice it follows `change`. Composed and not bubbling: heard on the element — and on an element composed around it — and by no ancestor. Never fired when the product sets `open`.
 * - `onChange` (`change`) — The person chose an option whose value differs from the select's; `value` is already the new one. A composed, bubbling Event, as a native select's. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only moves through the list.
 */
export const Select: Marked<typeof SelectElement, SelectMarks> = withMarks<SelectMarks>([], ['form'])(SelectElement);

/** The attributes of `<tanrei-select-field>` that are not properties of the element, as props of `SelectField`. */
export interface SelectFieldMarks {
  /** For tests and fixtures: the select's own attribute of that name, passed on. It draws the open list in place below the trigger and not in the top layer, so that an open fixture and its twin are staged alike. No prop of the component. */
  inline?: boolean;
  /** The id of the form the select field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SelectFieldElement = createComponent({
  tagName: 'tanrei-select-field',
  elementClass: TanreiSelectFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSelectFieldElement>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSelectFieldElement, CustomEvent<TanreiSelectToggleDetail>>>,
  },
});
/**
 * Lets people choose one value from a closed list as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Select (`<tanrei-select>`) it frames: the trigger and its list under the Field's label — or, in the filled and the outlined look, with the label floating in the box — with the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place.
 * - `leading-icon` — A glyph at the start of the container that stands for the field whatever is chosen (a globe before a language). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The person chose an option whose value differs from the select's; `value` is already the new one. A composed, bubbling Event, as a native select's. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `escape`, `outside`, `focus-out`, `anchor-hidden`, `press` or `tab`. After a choice it follows `change`. Composed and not bubbling: heard on the element — and on an element composed around it — and by no ancestor. Never fired when the product sets `open`.
 */
export const SelectField: Marked<typeof SelectFieldElement, SelectFieldMarks> = withMarks<SelectFieldMarks>(['inline'], ['form'])(SelectFieldElement);

/**
 * Shows supplementary content or a secondary task in a panel at the end edge, with a headline, an optional close button and actions: `standard`, beside the content in the layout (a layout region), where actions are optional, or `modal`, over the content with a scrim, holding focus until it closes (a modal overlay), with at least one action (SSH-16).
 *
 * Children, by their `slot`:
 * - default — The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * - `actions` — Tanrei Buttons, each marked `confirming` or `dismissive`; at least one in a modal sheet. The sheet places them and gives those without a `variant` its own; it never restyles them.
 *
 * Events:
 * - `onClose` (`close`) — The sheet asks to be closed: `detail.reason` is `close` (its close button), or for a modal sheet `scrim`, `escape`, `back` or `drag`. Set `open` to false.
 */
export const SideSheet = createComponent({
  tagName: 'tanrei-side-sheet',
  elementClass: TanreiSideSheetElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiSideSheetElement, CustomEvent<TanreiSideSheetCloseDetail>>>,
  },
});

/**
 * Stands where content will be while it loads: quiet placeholders in the shape of what is coming — lines of text, a block, a circle — that keep the box the content will take, in a region that says once that it is busy.
 *
 * Children, by their `slot`:
 * - default — The placeholders — empty elements with `class="tanrei-skeleton-placeholder"` — alone or inside a layout of the product's own. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const Skeleton = createComponent({
  tagName: 'tanrei-skeleton',
  elementClass: TanreiSkeletonElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-slider>` that are not properties of the element, as props of `Slider`. */
export interface SliderMarks {
  /** The id of the form the slider belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SliderElement = createComponent({
  tagName: 'tanrei-slider',
  elementClass: TanreiSliderElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiSliderElement, CustomEvent<TanreiSliderChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSliderElement, CustomEvent<TanreiSliderChangeDetail>>>,
  },
});
/**
 * Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging a handle along a track.
 *
 * Events:
 * - `onInput` (`input`) — The person changed a value; the element's `value` (and `startValue`) is already the new one.
 * - `onChange` (`change`) — The person finished changing a value (the press ended, or a key was pressed); always after its input.
 */
export const Slider: Marked<typeof SliderElement, SliderMarks> = withMarks<SliderMarks>([], ['form'])(SliderElement);

/** The attributes of `<tanrei-slider-field>` that are not properties of the element, as props of `SliderField`. */
export interface SliderFieldMarks {
  /** The id of the form the slider field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SliderFieldElement = createComponent({
  tagName: 'tanrei-slider-field',
  elementClass: TanreiSliderFieldElement,
  react: React,
  events: {
    onInput: 'input' as EventName<TanreiEvent<TanreiSliderFieldElement, CustomEvent<TanreiSliderChangeDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSliderFieldElement, CustomEvent<TanreiSliderChangeDetail>>>,
  },
});
/**
 * Lets people choose a value, or a range of values, on a scale as one complete field. Built from a Field (`<tanrei-field>`) and the Slider (`<tanrei-slider>`) it frames: the track under the Field's label, with the value in words at the end of the label row, the Field's help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onInput` (`input`) — The person changed a value; the element's `value` (and `startValue`) is already the new one.
 * - `onChange` (`change`) — The person finished changing a value (the press ended, or a key was pressed); always after its input.
 */
export const SliderField: Marked<typeof SliderFieldElement, SliderFieldMarks> = withMarks<SliderFieldMarks>([], ['form'])(SliderFieldElement);

/**
 * Tells a person briefly, at the bottom edge of the screen, what the app just did or what happened (neutrally, or as information, a warning, an error or a success), with at most one action, without taking focus or interrupting their work.
 *
 * Events:
 * - `onAction` (`action`) — The action was activated; the snackbar closes.
 * - `onDismiss` (`dismiss`) — The snackbar closed without its action: `detail.reason` is `close`, `escape`, `timeout` or `host`.
 * - `onExpandedchange` (`expandedchange`) — The person expanded or collapsed the text with the expand button: `detail.expanded` is the new value. Not fired when the product sets `expanded`.
 */
export const Snackbar = createComponent({
  tagName: 'tanrei-snackbar',
  elementClass: TanreiSnackbarElement,
  react: React,
  events: {
    onAction: 'action' as EventName<TanreiEvent<TanreiSnackbarElement>>,
    onDismiss: 'dismiss' as EventName<TanreiEvent<TanreiSnackbarElement, CustomEvent<TanreiSnackbarDismissDetail>>>,
    onExpandedchange: 'expandedchange' as EventName<TanreiEvent<TanreiSnackbarElement, CustomEvent<TanreiSnackbarExpandedChangeDetail>>>,
  },
});

/**
 * Shows snackbars, one at a time, in the order they were asked for (SNK-12), at the bottom of the window (SNK-13). Place it once, as the last element of the page: its place in the focus order is where a snackbar's controls are (SNK-11). It holds the two live regions their messages are announced in (SNK-10) — polite (`role="status"`) for the default, info and success forms, assertive (`role="alert"`) for warning and error — so it must be in the document before the first one.
 *
 * Children, by their `slot`:
 * - default — The snackbar being shown (the host puts it there).
 */
export const SnackbarHost = createComponent({
  tagName: 'tanrei-snackbar-host',
  elementClass: TanreiSnackbarHostElement,
  react: React,
  events: {},
});

/**
 * Shows where a person is in a flow the product runs in a fixed order of steps — which step is current, which are complete, which has an error and which are still to come — and, where the product allows it, lets the person press a step to go back to it.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-stepper-step>` children: the steps.
 *
 * Events:
 * - `onSelect` (`select`) — The person pressed a step to go to it: `detail.value` is its value. The stepper does not change `value`.
 */
export const Stepper = createComponent({
  tagName: 'tanrei-stepper',
  elementClass: TanreiStepperElement,
  react: React,
  events: {
    onSelect: 'select' as EventName<TanreiEvent<TanreiStepperElement, CustomEvent<TanreiStepperSelectDetail>>>,
  },
});

/**
 * One step of a stepper — the spec's item kind `step`: its value, its label, an optional description, its status and whether it can be gone to. Placed as a child of `<tanrei-stepper>`, as `<option>` in a `<select>`; the stepper decides its condition, its number and whether it can be pressed.
 */
export const StepperStep = createComponent({
  tagName: 'tanrei-stepper-step',
  elementClass: TanreiStepperStepElement,
  react: React,
  events: {},
});

/**
 * An item that opens another level of the menu beside it — the spec's item kind `submenu`. It holds that level's items as its children, of any kind, further submenus included; it draws its row, ending in the icon set's `chevron_right`, in the surface that holds it, and its own surface as a manual popover in the top layer, placed against the row (MNU-46, MNU-47). It is not an action: activating it opens its submenu and closes nothing. `open` is its own: the menu sets it when the person opens or closes the submenu and fires `toggle`; the product may also set it. The menu it is in does the rest — the keys, the pointer's path, placement, focus and closing.
 *
 * Children, by their `slot`:
 * - default — The submenu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 *
 * Events:
 * - `onToggle` (`toggle`) — The person opened or closed the submenu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes, and the whole menu closing, fire none.
 */
export const Submenu = createComponent({
  tagName: 'tanrei-submenu',
  elementClass: TanreiSubmenuElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSubmenuElement, CustomEvent<TanreiSubmenuToggleDetail>>>,
  },
});

/**
 * Shows a color as a sample with its name beside it: a small square or dot of exactly that color, over a checkerboard where the color lets what is behind it through, edged so that a color close to the surface still shows where it ends. A sample to look at, never a control and never a picker.
 */
export const Swatch = createComponent({
  tagName: 'tanrei-swatch',
  elementClass: TanreiSwatchElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-switch>` that are not properties of the element, as props of `Switch`. */
export interface SwitchMarks {
  /** The id of the form the switch belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const SwitchElement = createComponent({
  tagName: 'tanrei-switch',
  elementClass: TanreiSwitchElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiSwitchElement, CustomEvent<TanreiSwitchChangeDetail>>>,
  },
});
/**
 * Turns one setting on or off, taking effect at once, with a handle that follows a finger dragged along the track.
 *
 * Events:
 * - `onChange` (`change`) — The user switched it; `detail.selected` (and the element's `selected`) is the new value.
 */
export const Switch: Marked<typeof SwitchElement, SwitchMarks> = withMarks<SwitchMarks>([], ['form'])(SwitchElement);

/**
 * One tab of a row — the spec's item kind `tab`: a label, an optional icon, and the value that selects it. Placed as a child of `<tanrei-tabs>`, as `<option>` in a `<select>`; the row decides whether it is selected, which tab is the Tab stop, and answers its activation.
 */
export const Tab = createComponent({
  tagName: 'tanrei-tab',
  elementClass: TanreiTabElement,
  react: React,
  events: {},
});

/**
 * The view a tab shows. Placed as a child of `<tanrei-tabs>` after its tabs, or of a `<tanrei-tab-view>`, and matched to the tab whose `value` is its own. The row (or the view) gives it the tab panel role, names it by its tab, hides it while its tab is not selected, and makes it a Tab stop itself while it holds nothing focusable.
 *
 * Children, by their `slot`:
 * - default — The view.
 */
export const TabPanel = createComponent({
  tagName: 'tanrei-tab-panel',
  elementClass: TanreiTabPanelElement,
  react: React,
  events: {},
});

/**
 * Shows the view of the selected tab under its own row of tabs, or linked to a row of `<tanrei-tabs>` placed elsewhere, and lets a person swipe from view to view with the tabs' indicator following the finger.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-tab-panel>` children: the panels, one per tab, each with the value of its tab.
 * - `tabs` — The view's own row, which it places there itself (a `<tanrei-tabs>`); not for the product.
 *
 * Events:
 * - `onChange` (`change`) — The user selected another panel — by a tab of the view's own row, or by a swipe: `detail.value` (and the view's and the tabs' `value`) is its value.
 */
export const TabView = createComponent({
  tagName: 'tanrei-tab-view',
  elementClass: TanreiTabViewElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTabViewElement, CustomEvent<TanreiTabViewChangeDetail>>>,
  },
});

/**
 * Presents data that has rows and columns, with named columns, optional row headers, a caption and footer rows. A price list, a comparison, a list of settings, a status of many things. It scrolls in its own box when it does not fit. A column's header can ask for the rows in its order (`sort`); the table itself never sorts, filters, fetches or pages: it draws the rows it is given, in the order it is given them.
 *
 * Children, by their `slot`:
 * - default — The native `<table>`: an optional `<caption>`, a `<thead>` of one row of `<th scope="col">`, one or more `<tbody>`, an optional `<tfoot>`. It is a child in the document, not a slotted node: the element has no shadow root.
 *
 * Events:
 * - `onSort` (`sort`) — The user pressed the header of a sortable column. `detail`: `{ column, index, direction }` — the header cell's `data-value`, its place among the columns of data (from 0) and the direction asked for (`ascending`, or `descending` where the rows ascend by it). The table changes nothing. Cancelable where the control is an anchor: cancelled, the link is not followed.
 * - `onSelectionchange` (`selectionchange`) — The user changed which rows are chosen, by a row's checkbox or by the header's. `detail`: `{ values }` — the `data-value` of every chosen row after the change, in row order. Not emitted for what the product writes.
 */
export const Table = createComponent({
  tagName: 'tanrei-table',
  elementClass: TanreiTableElement,
  react: React,
  events: {
    onSort: 'sort' as EventName<TanreiEvent<TanreiTableElement>>,
    onSelectionchange: 'selectionchange' as EventName<TanreiEvent<TanreiTableElement>>,
  },
});

/**
 * Lists the headings of the page being read as links to them and marks the one whose section is being read.
 *
 * Children, by their `slot`:
 * - default — The items: the product's own nested list (`<ul>` of `<li>`, each with its `<a href>` first). It stays in the document.
 * - `title` — The product's own title in place of the label's text: a heading of the level the page's outline needs. Drawn in the title's text style whatever its level; `label` still names the landmark and the compact row.
 *
 * Events:
 * - `onCurrentchange` (`currentchange`) — The current item changed while tracking is auto; `detail.href` is the new item's href, or an empty string. Never for a value the product set, never while tracking is manual.
 * - `onToggle` (`toggle`) — The compact presentation's list was shown or hidden by the user (the row, an item chosen, Escape); `detail.open` is the new state.
 * - `onSelect` (`select`) — An item was activated; `detail.href` is its href. Dispatched from the anchor's click, before the browser follows the link; cancelable, cancelling the click with it.
 */
export const TableOfContents = createComponent({
  tagName: 'tanrei-table-of-contents',
  elementClass: TanreiTableOfContentsElement,
  react: React,
  events: {
    onCurrentchange: 'currentchange' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsCurrentChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsToggleDetail>>>,
    onSelect: 'select' as EventName<TanreiEvent<TanreiTableOfContentsElement, CustomEvent<TanreiTableOfContentsSelectDetail>>>,
  },
});

/**
 * Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it shows.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-tab>` children (the tabs) and `<tanrei-tab-panel>` children (the panels).
 *
 * Events:
 * - `onChange` (`change`) — The user selected another tab: `detail.value` (and the row's `value`) is its value.
 */
export const Tabs = createComponent({
  tagName: 'tanrei-tabs',
  elementClass: TanreiTabsElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTabsElement, CustomEvent<TanreiTabsChangeDetail>>>,
  },
});

/**
 * Names a category or a status with a short static label, quietly, outlined or filled, in the colors of a status where it has one. It is text, never a control.
 *
 * Children, by their `slot`:
 * - `icon` — The leading glyph: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. It takes the dot's place. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Tag = createComponent({
  tagName: 'tanrei-tag',
  elementClass: TanreiTagElement,
  react: React,
  events: {},
});

/**
 * Lays out a set of tags or chips in lines that wrap, spaced for what it holds, and exposes the set as one named list.
 *
 * Children, by their `slot`:
 * - default — The members: `<tanrei-tag>` and `<tanrei-chip>` elements. Anything else is still laid out, and reported in debug builds (TGR-11).
 */
export const TagGroup = createComponent({
  tagName: 'tanrei-tag-group',
  elementClass: TanreiTagGroupElement,
  react: React,
  events: {},
});

/** The attributes of `<tanrei-text-field>` that are not properties of the element, as props of `TextField`. */
export interface TextFieldMarks {
  /** The id of the form the text field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const TextFieldElement = createComponent({
  tagName: 'tanrei-text-field',
  elementClass: TanreiTextFieldElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTextFieldElement>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputActionDetail>>>,
    onPickerrequest: 'pickerrequest' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputPickerRequestDetail>>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiTextFieldElement, CustomEvent<TanreiTextInputEntryErrorDetail>>>,
  },
});
/**
 * Lets people enter and edit text as one complete field. Built from a Field (`<tanrei-field>`) and the Text input (`<tanrei-text-input>`) it frames: the box under the Field's label — or, in the filled and the outlined look, with the label floating in it — with the Field's help, its error and the count, tied together for assistive technology and taking part in a form as one control.
 *
 * Children, by their `slot`:
 * - `label-icon` — A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `leading-icon` — An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `trailing-icon` — An icon at the end of the field, or the product's own icon-only Button (clear, reveal password). A date or time field's picker button comes after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 *
 * Events:
 * - `onChange` (`change`) — The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 * - `onPickerrequest` (`pickerrequest`) — The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * - `onEntryerror` (`entryerror`) — The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 */
export const TextField: Marked<typeof TextFieldElement, TextFieldMarks> = withMarks<TextFieldMarks>([], ['form'])(TextFieldElement);

/** The attributes of `<tanrei-text-input>` that are not properties of the element, as props of `TextInput`. */
export interface TextInputMarks {
  /** The id of the form the text input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element. */
  form?: string;
}
const TextInputElement = createComponent({
  tagName: 'tanrei-text-input',
  elementClass: TanreiTextInputElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTextInputElement>>,
    onEntryerror: 'entryerror' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputEntryErrorDetail>>>,
    onPickerrequest: 'pickerrequest' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputPickerRequestDetail>>>,
    onAction: 'action' as EventName<TanreiEvent<TanreiTextInputElement, CustomEvent<TanreiTextInputActionDetail>>>,
  },
});
/**
 * The box people type in, and everything typed in it — one line, or several that follow the text or are resized by hand, or a date or a time entered unit by unit in the locale's form — with optional icons, a prefix and a suffix, a picker button, and, in the two looks that have one, the label that floats inside the box. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-text-field>`, which is the two as one element. Bare, it is for a place whose label stands elsewhere: a filter in a toolbar, a cell of a table, a row with its label beside it; give it `label` there.
 *
 * Children, by their `slot`:
 * - `leading-icon` — An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `trailing-icon` — An icon at the end of the field, or the product's own icon-only Button (clear, reveal password). A date or time field's picker button comes after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 * - `entries` — What was entered already — the product's own elements, or the chips of a component that holds the input (a chip field): laid out inside the box before the typing part, in lines that wrap (TXI-64). The text input gives them no role, no focus order and no key (TXI-66).
 *
 * Events:
 * - `onChange` (`change`) — The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * - `onEntryerror` (`entryerror`) — The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 * - `onPickerrequest` (`pickerrequest`) — The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 */
export const TextInput: Marked<typeof TextInputElement, TextInputMarks> = withMarks<TextInputMarks>([], ['form'])(TextInputElement);

/**
 * Holds a short row of actions for the current screen or selection, docked across the bottom edge or floating over the content.
 *
 * Children, by their `slot`:
 * - default — The items, in reading order: `<tanrei-button>` elements — an icon-only one for an action (a toggle such as Bold is one with `toggle`), a labelled one for a text action. Anything else is still laid out, and reported in debug builds (TBR-12).
 */
export const Toolbar = createComponent({
  tagName: 'tanrei-toolbar',
  elementClass: TanreiToolbarElement,
  react: React,
  events: {},
});

/**
 * Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it, without taking focus or blocking anything.
 *
 * Children, by their `slot`:
 * - default — The anchor: the element the tooltip describes.
 *
 * Events:
 * - `onToggle` (`toggle`) — The tooltip opened or closed by itself (hover, focus, long-press, Escape, the touch timeout, another tooltip opening): `detail.open` (and the element's `open`) is the new value.
 */
export const Tooltip = createComponent({
  tagName: 'tanrei-tooltip',
  elementClass: TanreiTooltipElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTooltipElement, CustomEvent<TanreiTooltipToggleDetail>>>,
  },
});

/**
 * A hierarchy of items that open and close: rows that begin further in at each level, a chevron at the start or the end of every row that holds others (or none, the folder glyph opening), names on one line shown whole in a tooltip where they are cut, the rows of the open parents above what is shown pinned at the top of the scrolling box; read and opened only, or with one item or several chosen. One stop in the focus order, moved through with the arrow keys. A file tree in a page, the tokens of a design system, the folders of a product.
 *
 * Children, by their `slot`:
 * - default — The items: the product's own nested lists (`<ul>` of `<li>`). They are children in the document, not slotted nodes: the element has no shadow root.
 *
 * Events:
 * - `onCreate` (`create`) — The user named the new item `create()` asked for: `detail.label`, `detail.parent`, and the `<li>` it goes under (`detail.within`, null at the first level) and follows (`detail.after`, null where it is first). The tree's own row is gone; add the item, and the tree moves focus to it.
 * - `onChange` (`change`) — The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change.
 * - `onToggle` (`toggle`) — Dispatched on an item's `<li>` (it bubbles): the user, or the browser's find-in-page, opened or closed it; `detail.open` is its new state. The moment to give the items of an `data-expandable` parent.
 * - `onRename` (`rename`) — Dispatched on an item's `<li>` (it bubbles): the user gave it a new name in place; `detail.label` is the name (trimmed, not empty, not the old one) and `detail.previous` the label it had. The tree changes no label: set it to rename the item.
 */
export const TreeView = createComponent({
  tagName: 'tanrei-tree-view',
  elementClass: TanreiTreeViewElement,
  react: React,
  events: {
    onCreate: 'create' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewCreateDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewChangeDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewToggleDetail>>>,
    onRename: 'rename' as EventName<TanreiEvent<TanreiTreeViewElement, CustomEvent<TanreiTreeViewRenameDetail>>>,
  },
});

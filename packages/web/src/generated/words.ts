// GENERATED FILE — DO NOT EDIT.
// Source: specs/*.spec.json (the `words` field of a prop). Regenerate with `pnpm generate`.
// The keys of the product's words: the words a product gives once, for every component that reads them.

/** The product's words in one language. Every key is optional: a product gives the words of the components it uses. */
export interface TanreiWords {
  /** Read by `code-block.addedLabel`. */
  addedLabel?: string;
  /** Read by `chat-composer.attachLabel`. */
  attachLabel?: string;
  /** Read by `search.backLabel`. */
  backLabel?: string;
  /** Read by `breadcrumbs.overflowLabel`. */
  breadcrumbsOverflowLabel?: string;
  /** Read by `date-time-picker.cancelLabel`. */
  cancelLabel?: string;
  /** Read by `combobox.clearLabel`, `search.clearLabel`. */
  clearLabel?: string;
  /** Read by `callout.closeLabel`, `image-preview.closeLabel`, `popover.closeLabel`, `side-sheet.closeLabel`, `snackbar.closeLabel`. */
  closeLabel?: string;
  /** Read by `date-time-picker.confirmLabel`. */
  confirmLabel?: string;
  /** Read by `code-block.copiedLabel`, `copy-button.copiedLabel`. */
  copiedLabel?: string;
  /** Read by `code-block.copyFailedLabel`, `copy-button.failedLabel`. */
  copyFailedLabel?: string;
  /** Read by `code-block.copyLabel`, `copy-button.label`. */
  copyLabel?: string;
  /** Read by `date-time-picker.dateLabel`. */
  dateLabel?: string;
  /** Read by `number-input.decrementLabel`. */
  decrementLabel?: string;
  /** Read by `date-time-picker.dialLabel`. */
  dialLabel?: string;
  /** Read by `chip-field.duplicateText`. */
  duplicateEntryText?: string;
  /** Read by `combobox.emptyText`. */
  emptyText?: string;
  /** Read by `calendar.endLabel`, `date-time-picker.endLabel`. */
  endLabel?: string;
  /** Read by `chip-field.addedCountText`. A word with places: `{count}` (number). */
  entriesAddedText?: string;
  /** Read by `chip-field.addedText`. A word with places: `{entry}` (text). */
  entryAddedText?: string;
  /** Read by `chip-field.limitText`. */
  entryLimitText?: string;
  /** Read by `date-time-picker.entryModeLabel`. */
  entryModeLabel?: string;
  /** Read by `chip-field.removeLabel`. A word with places: `{entry}` (text, needed). */
  entryRemoveLabel?: string;
  /** Read by `chip-field.removedText`. A word with places: `{entry}` (text). */
  entryRemovedText?: string;
  /** Read by `snackbar.expandLabel`. */
  expandLabel?: string;
  /** Read by `link.externalLabel`, `link-card.externalLabel`. */
  externalLabel?: string;
  /** Read by `chat-composer.countErrorText`, `file-upload.countErrorText`. */
  fileCountErrorText?: string;
  /** Read by `chat-composer.sizeErrorText`, `file-upload.sizeErrorText`. */
  fileSizeErrorText?: string;
  /** Read by `chat-composer.typeErrorText`, `file-upload.typeErrorText`. */
  fileTypeErrorText?: string;
  /** Read by `bottom-sheet.handleLabel`. */
  handleLabel?: string;
  /** Read by `code-block.highlightedLabel`. */
  highlightedLabel?: string;
  /** Read by `date-time-picker.hourLabel`. */
  hourLabel?: string;
  /** Read by `image-preview.countText`. A word with places: `{position}` (number), `{count}` (number). */
  imageCountText?: string;
  /** Read by `image-preview.errorText`. */
  imageErrorText?: string;
  /** Read by `number-input.incrementLabel`. */
  incrementLabel?: string;
  /** Read by `image-preview.loadingLabel`, `skeleton.label`, `tree-view.loadingLabel`. */
  loadingLabel?: string;
  /** Read by `menubar.overflowLabel`. */
  menubarOverflowLabel?: string;
  /** Read by `date-time-picker.minuteLabel`. */
  minuteLabel?: string;
  /** Read by `list.moveDownLabel`. */
  moveDownLabel?: string;
  /** Read by `list.moveUpLabel`. */
  moveUpLabel?: string;
  /** Read by `list.movedText`. A word with places: `{headline}` (text), `{position}` (number), `{count}` (number). */
  movedText?: string;
  /** Read by `date-time-picker.nextDayLabel`. */
  nextDayLabel?: string;
  /** Read by `image-preview.nextLabel`. */
  nextImageLabel?: string;
  /** Read by `calendar.nextMonthLabel`, `date-time-picker.nextMonthLabel`. */
  nextMonthLabel?: string;
  /** Read by `file-upload.emptyText`. */
  noFileText?: string;
  /** Read by `field.optionalText`, `field-group.optionalText`. */
  optionalText?: string;
  /** Read by `carousel.pauseLabel`. */
  pauseLabel?: string;
  /** Read by `date-time-picker.periodLabel`. */
  periodLabel?: string;
  /** Read by `carousel.playLabel`. */
  playLabel?: string;
  /** Read by `image-preview.previousLabel`. */
  previousImageLabel?: string;
  /** Read by `calendar.previousMonthLabel`, `date-time-picker.previousMonthLabel`. */
  previousMonthLabel?: string;
  /** Read by `date-time-picker.rangeErrorText`. */
  rangeErrorText?: string;
  /** Read by `date-time-picker.rangeLabel`. */
  rangeLabel?: string;
  /** Read by `file-item.removeLabel`. */
  removeLabel?: string;
  /** Read by `code-block.removedLabel`. */
  removedLabel?: string;
  /** Read by `field.requiredText`, `field-group.requiredText`. */
  requiredText?: string;
  /** Read by `text-input.resizeLabel`. */
  resizeLabel?: string;
  /** Read by `file-item.retryLabel`. */
  retryLabel?: string;
  /** Read by `text-input.segmentEmptyText`. */
  segmentEmptyText?: string;
  /** Read by `table.selectAllLabel`. */
  selectAllLabel?: string;
  /** Read by `chat-composer.sendLabel`. */
  sendLabel?: string;
  /** Read by `table.sortedAscendingLabel`. */
  sortedAscendingLabel?: string;
  /** Read by `table.sortedDescendingLabel`. */
  sortedDescendingLabel?: string;
  /** Read by `calendar.startLabel`, `date-time-picker.startLabel`. */
  startLabel?: string;
  /** Read by `chat-composer.stopLabel`. */
  stopLabel?: string;
  /** Read by `button.targetLabel`, `card.targetLabel`, `chip.targetLabel`, `link.targetLabel`, `link-card.targetLabel`, `list/list-item.targetLabel`, `menu/item.targetLabel`, `menubar/item.targetLabel`, `navigation-bar/destination.targetLabel`, `navigation-drawer/destination.targetLabel`, `search/result.targetLabel`, `search/result-group.targetLabel`. */
  targetLabel?: string;
  /** Read by `calendar.todayLabel`, `date-time-picker.todayLabel`. */
  todayLabel?: string;
  /** Read by `date-time-picker.wheelsLabel`. */
  wheelsLabel?: string;
  /** Read by `calendar.yearViewLabel`, `date-time-picker.yearViewLabel`. */
  yearViewLabel?: string;
  /** Read by `image-preview.zoomInLabel`. */
  zoomInLabel?: string;
  /** Read by `image-preview.zoomOutLabel`. */
  zoomOutLabel?: string;
}

/** One key of the product's words. */
export type WordKey = keyof TanreiWords;

/** Every key of the product's words, in alphabetical order. */
export const wordKeys: readonly WordKey[] = ['addedLabel', 'attachLabel', 'backLabel', 'breadcrumbsOverflowLabel', 'cancelLabel', 'clearLabel', 'closeLabel', 'confirmLabel', 'copiedLabel', 'copyFailedLabel', 'copyLabel', 'dateLabel', 'decrementLabel', 'dialLabel', 'duplicateEntryText', 'emptyText', 'endLabel', 'entriesAddedText', 'entryAddedText', 'entryLimitText', 'entryModeLabel', 'entryRemoveLabel', 'entryRemovedText', 'expandLabel', 'externalLabel', 'fileCountErrorText', 'fileSizeErrorText', 'fileTypeErrorText', 'handleLabel', 'highlightedLabel', 'hourLabel', 'imageCountText', 'imageErrorText', 'incrementLabel', 'loadingLabel', 'menubarOverflowLabel', 'minuteLabel', 'moveDownLabel', 'moveUpLabel', 'movedText', 'nextDayLabel', 'nextImageLabel', 'nextMonthLabel', 'noFileText', 'optionalText', 'pauseLabel', 'periodLabel', 'playLabel', 'previousImageLabel', 'previousMonthLabel', 'rangeErrorText', 'rangeLabel', 'removeLabel', 'removedLabel', 'requiredText', 'resizeLabel', 'retryLabel', 'segmentEmptyText', 'selectAllLabel', 'sendLabel', 'sortedAscendingLabel', 'sortedDescendingLabel', 'startLabel', 'stopLabel', 'targetLabel', 'todayLabel', 'wheelsLabel', 'yearViewLabel', 'zoomInLabel', 'zoomOutLabel'];

/** The props that read each key, as `<component>.<prop>` and, for an item kind, `<component>/<kind>.<prop>`. */
export const wordReaders: Readonly<Record<WordKey, readonly string[]>> = {
  addedLabel: ['code-block.addedLabel'],
  attachLabel: ['chat-composer.attachLabel'],
  backLabel: ['search.backLabel'],
  breadcrumbsOverflowLabel: ['breadcrumbs.overflowLabel'],
  cancelLabel: ['date-time-picker.cancelLabel'],
  clearLabel: ['combobox.clearLabel', 'search.clearLabel'],
  closeLabel: ['callout.closeLabel', 'image-preview.closeLabel', 'popover.closeLabel', 'side-sheet.closeLabel', 'snackbar.closeLabel'],
  confirmLabel: ['date-time-picker.confirmLabel'],
  copiedLabel: ['code-block.copiedLabel', 'copy-button.copiedLabel'],
  copyFailedLabel: ['code-block.copyFailedLabel', 'copy-button.failedLabel'],
  copyLabel: ['code-block.copyLabel', 'copy-button.label'],
  dateLabel: ['date-time-picker.dateLabel'],
  decrementLabel: ['number-input.decrementLabel'],
  dialLabel: ['date-time-picker.dialLabel'],
  duplicateEntryText: ['chip-field.duplicateText'],
  emptyText: ['combobox.emptyText'],
  endLabel: ['calendar.endLabel', 'date-time-picker.endLabel'],
  entriesAddedText: ['chip-field.addedCountText'],
  entryAddedText: ['chip-field.addedText'],
  entryLimitText: ['chip-field.limitText'],
  entryModeLabel: ['date-time-picker.entryModeLabel'],
  entryRemoveLabel: ['chip-field.removeLabel'],
  entryRemovedText: ['chip-field.removedText'],
  expandLabel: ['snackbar.expandLabel'],
  externalLabel: ['link.externalLabel', 'link-card.externalLabel'],
  fileCountErrorText: ['chat-composer.countErrorText', 'file-upload.countErrorText'],
  fileSizeErrorText: ['chat-composer.sizeErrorText', 'file-upload.sizeErrorText'],
  fileTypeErrorText: ['chat-composer.typeErrorText', 'file-upload.typeErrorText'],
  handleLabel: ['bottom-sheet.handleLabel'],
  highlightedLabel: ['code-block.highlightedLabel'],
  hourLabel: ['date-time-picker.hourLabel'],
  imageCountText: ['image-preview.countText'],
  imageErrorText: ['image-preview.errorText'],
  incrementLabel: ['number-input.incrementLabel'],
  loadingLabel: ['image-preview.loadingLabel', 'skeleton.label', 'tree-view.loadingLabel'],
  menubarOverflowLabel: ['menubar.overflowLabel'],
  minuteLabel: ['date-time-picker.minuteLabel'],
  moveDownLabel: ['list.moveDownLabel'],
  moveUpLabel: ['list.moveUpLabel'],
  movedText: ['list.movedText'],
  nextDayLabel: ['date-time-picker.nextDayLabel'],
  nextImageLabel: ['image-preview.nextLabel'],
  nextMonthLabel: ['calendar.nextMonthLabel', 'date-time-picker.nextMonthLabel'],
  noFileText: ['file-upload.emptyText'],
  optionalText: ['field.optionalText', 'field-group.optionalText'],
  pauseLabel: ['carousel.pauseLabel'],
  periodLabel: ['date-time-picker.periodLabel'],
  playLabel: ['carousel.playLabel'],
  previousImageLabel: ['image-preview.previousLabel'],
  previousMonthLabel: ['calendar.previousMonthLabel', 'date-time-picker.previousMonthLabel'],
  rangeErrorText: ['date-time-picker.rangeErrorText'],
  rangeLabel: ['date-time-picker.rangeLabel'],
  removeLabel: ['file-item.removeLabel'],
  removedLabel: ['code-block.removedLabel'],
  requiredText: ['field.requiredText', 'field-group.requiredText'],
  resizeLabel: ['text-input.resizeLabel'],
  retryLabel: ['file-item.retryLabel'],
  segmentEmptyText: ['text-input.segmentEmptyText'],
  selectAllLabel: ['table.selectAllLabel'],
  sendLabel: ['chat-composer.sendLabel'],
  sortedAscendingLabel: ['table.sortedAscendingLabel'],
  sortedDescendingLabel: ['table.sortedDescendingLabel'],
  startLabel: ['calendar.startLabel', 'date-time-picker.startLabel'],
  stopLabel: ['chat-composer.stopLabel'],
  targetLabel: ['button.targetLabel', 'card.targetLabel', 'chip.targetLabel', 'link.targetLabel', 'link-card.targetLabel', 'list/list-item.targetLabel', 'menu/item.targetLabel', 'menubar/item.targetLabel', 'navigation-bar/destination.targetLabel', 'navigation-drawer/destination.targetLabel', 'search/result.targetLabel', 'search/result-group.targetLabel'],
  todayLabel: ['calendar.todayLabel', 'date-time-picker.todayLabel'],
  wheelsLabel: ['date-time-picker.wheelsLabel'],
  yearViewLabel: ['calendar.yearViewLabel', 'date-time-picker.yearViewLabel'],
  zoomInLabel: ['image-preview.zoomInLabel'],
  zoomOutLabel: ['image-preview.zoomOutLabel'],
};

/** One place of a word: the name the product writes between braces, and whether a number or a text fills it. */
export interface WordPlace {
  name: string;
  kind: 'number' | 'text';
  /** The sentence is used as written without it, and that is reported in debug builds. */
  required?: true;
}

/**
 * The places of each key whose word has any: the product writes `{name}` where the value goes, and the component
 * that reads the key fills it. A key that is not here is a whole string, and its braces are plain text.
 */
export const wordPlaces: Readonly<Partial<Record<WordKey, readonly WordPlace[]>>> = {
  entriesAddedText: [{ name: 'count', kind: 'number' }],
  entryAddedText: [{ name: 'entry', kind: 'text' }],
  entryRemoveLabel: [{ name: 'entry', kind: 'text', required: true }],
  entryRemovedText: [{ name: 'entry', kind: 'text' }],
  imageCountText: [{ name: 'position', kind: 'number' }, { name: 'count', kind: 'number' }],
  movedText: [{ name: 'headline', kind: 'text' }, { name: 'position', kind: 'number' }, { name: 'count', kind: 'number' }],
};

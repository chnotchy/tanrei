import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import {
  AnimatedSize,
  type AnimatedSizeOptions,
  AvailabilityController,
  FieldControlController,
  FieldProviderController,
  type FieldState,
  GROUP_PLACE,
  type GroupPlace,
  type PlacingGroup,
  SETTLING,
  WordsController,
  CoalescedSync,
  countWork,
  missingValueMessage,
  motionReduced,
  report,
} from '../../primitives/index.js';
import { ComposedElement, composedHost, exported, forward } from '../../primitives/composed.js';
import { delegatedAria, delegatesAria } from '../../primitives/delegated-aria.js';
import { acceptConverter } from '../../primitives/file-format.js';
import { FILE_ITEM_TAKE_FOCUS, FILE_ITEM_UPDATE, type FileItemGiven, giveFileItem } from '../../primitives/file-item-holder.js';
import { FormDisabledController } from '../../primitives/form-disabled.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiFileItem, type TanreiFileItemDetail, type TanreiFileItemFit, type TanreiFileItemForm, type TanreiFileItemStatus } from '../file-item/file-item.js';
import { TanreiFilePicker, type TanreiFilePickerLayout, type TanreiFilePickerRefused, type TanreiFilePickerRejectDetail, type TanreiFilePickerRejectReason, type TanreiFilePickerSelectDetail } from '../file-picker/file-picker.js';
import { LIST_MOTION, LIST_PRESENCE } from '../../primitives/list-presence.js';
import { startFromNextFrame } from '../../primitives/motion.js';
import type { TanreiList, TanreiListMoveDetail } from '../list/list.js';
import '../list/list.js';
import { styles } from './file-upload.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';

// The members' own types are the file upload's where a prop or an event detail is the member's.
export type { TanreiFileItemDetail, TanreiFileItemFit, TanreiFileItemForm, TanreiFileItemStatus, TanreiFilePickerLayout };

/** Why a file was refused — a name for the product's code, never words: its kind, its size, or how many there were. */
export type TanreiFileUploadRejectReason = TanreiFilePickerRejectReason;
/** A file that was refused, with the reason: what `reject` carries and `add()` answers with. */
export type TanreiFileUploadRefused = TanreiFilePickerRefused;
/** `select`: the files of one choice or one drop that passed and found room, in the order the browser gave them. */
export interface TanreiFileUploadSelectDetail {
  files: File[];
}
/** `reject`: the files of one choice or one drop that were refused, each with its reason. */
export interface TanreiFileUploadRejectDetail {
  files: TanreiFileUploadRefused[];
}
/** `move`: while `rows` is `given`, the row a person moved — its index before and the index it is to have, from 0 (FUP-59). */
export type TanreiFileUploadMoveDetail = TanreiListMoveDetail;
/** `change`: the files the file upload now keeps, in order (FUP-47). */
export interface TanreiFileUploadChangeDetail {
  files: File[];
}

const ITEM = 'tanrei-file-item';
const ITEM_FORMS: readonly string[] = ['row', 'tile'];
const STATUSES: readonly string[] = ['pending', 'uploading', 'done', 'error'];
const ROWS: readonly string[] = ['own', 'given'];


/** FUP-56: the props that are the file picker's, given to it unchanged. Its `maxFiles` and its `label` are never set, and its `selectionText` is the file upload's to fill (FUP-2). */
const PICKER = ['layout', 'multiple', 'accept', 'maxSize', 'constraintsText', 'dropText', 'disabled', 'error', 'required'] as const;
/**
 * FUP-58: what the file upload gives every file item, and the file item's attribute a product's own item would say it
 * with. A file item writes two of them on itself when the product said nothing (it reflects `form` and `fit`, each
 * with its first value): that value on an item is therefore not the product's word, and is the third entry.
 */
const SHARED: readonly (readonly [prop: 'itemForm' | 'itemPreview' | 'itemFit' | 'itemNameHidden' | 'itemWidth' | 'itemHeight' | 'removeLabel' | 'retryLabel', attribute: string, unsaid?: string])[] = [
  ['itemForm', 'form', 'row'],
  ['itemPreview', 'preview'],
  ['itemFit', 'fit', 'cover'],
  ['itemNameHidden', 'name-hidden'],
  ['itemWidth', 'width'],
  ['itemHeight', 'height'],
  ['removeLabel', 'remove-label'],
  ['retryLabel', 'retry-label'],
];

/** W4: each member's documented parts, from the member's own list. A made file item's leave under the prefix `item-`: three of them have a file picker's name. */
const PICKER_PARTS = exported(TanreiFilePicker);
const ITEM_PARTS = exported(TanreiFileItem, Object.fromEntries(TanreiFileItem.parts.map((part) => [part, { as: `item-${part}` }])));
/** FIT-18: what lies between two rows of the file upload's column — its own distance, given to each file item through the internal channel. */
const BETWEEN = 'var(--tanrei-comp-list-gap-small)';
/** FUP-29: what marks a product's row that leaves — drawn until its motion ends, and counted in nothing. */
const LEAVING = 'data-leaving';

/** Whether motion is reduced for this person. */

/** FUP-29: every element in `roots` and in the shadow roots inside them that has an update still to draw. */
function pendingUpdates(roots: readonly Element[]): Promise<unknown>[] {
  const pending: Promise<unknown>[] = [];
  const visit = (element: Element) => {
    const reactive = element as Element & { isUpdatePending?: boolean; updateComplete?: Promise<unknown> };
    if (reactive.isUpdatePending && reactive.updateComplete) pending.push(reactive.updateComplete);
    for (const child of element.children) visit(child);
    if (element.shadowRoot) for (const child of element.shadowRoot.children) visit(child);
  };
  for (const root of roots) visit(root);
  return pending;
}
/** FUP-29: waits until every element in `roots` has drawn what it has to draw. */
async function drawn(roots: () => readonly Element[]) {
  for (let pending = pendingUpdates(roots()); pending.length; pending = pendingUpdates(roots())) await Promise.all(pending);
}

/** FUP-38: a limit of the files it holds is a number above zero; anything else sets none. */
const limit = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

/** Whether focus is on `element` or inside it, its shadow root included. */
function holdsFocus(element: Element): boolean {
  const active = (element.getRootNode() as Document | ShadowRoot).activeElement;
  return !!active && element.contains(active);
}

/** What was announced of a row last (FUP-26). */
interface Known {
  status: string;
  errorText: string;
}
/** A row the file upload made itself (FUP-44, FUP-45): a file it keeps, or one the last arrival refused, with the reason. */
interface OwnRow {
  file: File;
  reason: TanreiFileUploadRejectReason | null;
}
/** FUP-29: a product's row that leaves, put back where it stood until its motion ends, with what was set on it to give back. */
interface Departure {
  inert: boolean;
  hidden: string | null;
}
/** FUP-53: each reason's key of the product's words, and the attribute of the instance's own sentence. */
const REASONS = [
  ['type', 'fileTypeErrorText', 'type-error-text'],
  ['size', 'fileSizeErrorText', 'size-error-text'],
  ['count', 'fileCountErrorText', 'count-error-text'],
] as const;
type Row = Element & Partial<Pick<TanreiFileItem, 'value' | 'name' | 'status' | 'statusText' | 'errorText' | 'retryable' | 'file' | 'updateComplete'>> & { [FILE_ITEM_TAKE_FOCUS]?: () => boolean };
/** A row's prop, from the element or — before it is defined — from its attribute. */
const rowText = (row: Row, prop: 'name' | 'status' | 'statusText' | 'errorText' | 'value', attribute: string) => String(row[prop] ?? row.getAttribute(attribute) ?? '');
const rowStatus = (row: Row) => {
  const status = rowText(row, 'status', 'status');
  return STATUSES.includes(status) ? status : 'pending';
};
/** FUP-30: focus into a row that stays — its remove action, or its body where it has none and that is pressable. */
const takeFocus = (row: Row): boolean => {
  if (row[FILE_ITEM_TAKE_FOCUS]) return row[FILE_ITEM_TAKE_FOCUS]();
  (row as HTMLElement).focus();
  return holdsFocus(row);
};

/**
 * Lets people choose files and shows what was chosen. Built from a File picker (`<tanrei-file-picker>`) — the trigger,
 * the drop area, the limits in words, the judging of a choice — and File items (`<tanrei-file-item>`), one for each
 * file, in a column of rows or a strip of tiles; it adds the state that ties them: which files are kept, the room that
 * is left, one form for all its items, one message for many changes, where focus goes after a removal, and the form's
 * value. **It never uploads**: it opens no connection and reads no byte of a file (FUP-7).
 *
 * Contract: specs/file-upload.spec.json. Who holds the rows is `rows`, and the product says which.
 *
 * `rows="own"`, the default: the element keeps the chosen files and makes a file item for each itself, so a plain form
 * works by placing it — `<form><tanrei-file-upload name="attachments" multiple remove-label="…"><tanrei-button
 * slot="trigger" variant="outlined">Choose files</tanrei-button></tanrei-file-upload></form>`. With `multiple` a second
 * choice adds and `max-files` counts the files kept; without it a file that passes takes the place of the one kept. The
 * same file (name, size, time of last change) is kept once. A refused file is a failed row with the product's sentence
 * for its reason (`type-error-text`, `size-error-text`, `count-error-text`, else `setWords`), is not kept, and leaves
 * when it is removed, when files next arrive or on `clear()`. The remove action removes. `files` reads the kept files,
 * `add(files)` hands files over and answers with the refused, `clear()` empties, and `formatSize` — a property — writes
 * a row's size; without it none is drawn. A kept file's row shows no status and no progress: the element sends nothing.
 *
 * `rows="given"`: the rows are `<tanrei-file-item>` children the product adds on `select` and removes on a row's
 * `remove`, each with its status, progress and error; the element adds, changes and removes none and keeps no file —
 * for a product that sends files itself. A row you take out is drawn leaving (FUP-29): the element puts your
 * `<tanrei-file-item>` back where it stood, as its child, for the length of the motion — `inert`, `aria-hidden="true"`
 * and `data-leaving` — then removes it and gives back what it had: read the rows as
 * `tanrei-file-item:not([data-leaving])` meanwhile.
 *
 * A row that is added opens and fades in, one that is removed fades out and closes, and a change of status that changes
 * a row's height moves it, as the List's items move (on its resize motion); what is exposed, counted, submitted and
 * focused changes at once. Under reduced motion every change is drawn at once.
 *
 * Every row is of one form: `item-form` (`row`, `tile`), `item-preview`, `item-fit`, `item-name-hidden`, `item-width`,
 * `item-height`, with `remove-label`, `retry-label` and `disabled`, are given to every file item it holds — the
 * product's own included — through an internal channel; a product's item that says one of them otherwise is drawn as
 * the file upload says. The picture of an image row is made and released by its file item, never by this element.
 *
 * `select` carries the files that passed `accept`, `max-size` and the count and found room, `reject` the ones that did
 * not, each with a reason that is a name and not words (`type`, `size`, `count`); while `rows` is `own`, `change` then
 * carries the files now kept. None is emitted for what the product did itself (`add()`, `clear()`, a reset, a change
 * of `rows`). The file picker's own two events do not leave the element.
 *
 * Form-associated: under its `name` it submits the kept files, in order — or, while `rows` is `given`, the `file` of
 * every row that has one; it is invalid for its form while `required` and there is none. A reset empties the kept
 * files and changes nothing of the product's rows. Nothing is restored with a page. Inside a `<tanrei-field>` it takes
 * the field's label, help, error, requirement and `disabled`.
 *
 * The rows are the items of a `<tanrei-list>` in the shadow root — a column, or with `item-form="tile"` lines that
 * wrap. With `reorderable` people can put them in another order (FUP-59): every row gets the List's handle, the whole
 * row can be dragged, and the handle offers the moves in a menu and to the keyboard. While `rows` is `own` the file
 * upload reorders the files it keeps and fires `change`; while it is `given` it fires `move` and you move your file item.
 *
 * One level down, the same by hand: a `<tanrei-file-picker>` and `<tanrei-file-item>`s the product arranges, alone or
 * as the content of a List's items.
 *
 * Without script, and until the element is defined, the trigger is a button that opens nothing and no row is drawn: a
 * page that must take files where script does not run writes a native `<input type="file">` in its own form.
 *
 * @tag tanrei-file-upload
 * @slot trigger - => tanrei-file-picker
 * @slot icon - => tanrei-file-picker
 * @slot - While `rows` is `given`: the rows, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `rows` is `own` nothing here is.
 * @csspart file-picker - The part that chooses: the `<tanrei-file-picker>` it is built from.
 * @csspart file-item - A row the file upload made itself, while `rows` is `own`: a `<tanrei-file-item>` it is built from.
 * @csspart list - The List that arranges the rows, a `<tanrei-list>`.
 * @exportparts tanrei-file-picker
 * @exportparts tanrei-file-item container: item-container, media: item-media, icon: item-icon, preview: item-preview, headline: item-headline, supporting-text: item-supporting-text, status-icon: item-status-icon, progress: item-progress, action: item-action
 * @attr {string} form - The id of the form the file upload belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires select - Files were chosen or dropped, passed and found room. Once per choice; `detail.files` is a `File[]` — while `rows` is `own`, the files newly kept. Bubbles.
 * @fires reject - Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * @fires {CustomEvent<TanreiFileUploadMoveDetail>} move - While `rows` is `given` and `reorderable` is set: a person asked for a row to stand in another place, by the move menu, the keyboard or a drag. `detail.from` and `detail.to`, from 0. The file upload has moved nothing: put your file item in its new place. Bubbles.
 * @fires change - While `rows` is `own`: the kept files changed by what a person did — a choice or a drop that kept or replaced a file, or a kept file's row removed. Once, after `select` and `reject`; `detail.files` is the `File[]` now kept. Bubbles. Never for `add()`, `clear()`, a reset or a change of `rows`.
 */
export class TanreiFileUpload extends ComposedElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'file-upload');
  static override styles = [composedHost, hiddenHost, styles];

  /**
   * FUP-17, FUP-41: its slots are assigned by hand — each of the product's rows to a slot of its own inside the List's
   * item that holds it, the trigger and the glyph to the two slots passed on to the file picker, and anything else to
   * nothing, so that it is not drawn.
   */
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  /** FUP-31, FUP-49: the one control the form meets. Its members stand in its shadow root, or are the product's own children, and take no part in a form. */
  static formAssociated = true;

  /**
   * Its parts, once: the two members, its own list, and what each member exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['file-picker', 'file-item', 'list', ...PICKER_PARTS.names, ...ITEM_PARTS.names];

  static override properties: PropertyDeclarations = {
    layout: { type: String, reflect: true },
    multiple: { type: Boolean, reflect: true },
    accept: { converter: acceptConverter },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    label: { type: String },
    constraintsText: { type: String, attribute: 'constraints-text' },
    dropText: { type: String, attribute: 'drop-text' },
    emptyText: { type: String, attribute: 'empty-text' },
    itemForm: { type: String, attribute: 'item-form', reflect: true },
    itemPreview: { type: Boolean, attribute: 'item-preview', reflect: true },
    itemFit: { type: String, attribute: 'item-fit', reflect: true },
    itemNameHidden: { type: Boolean, attribute: 'item-name-hidden', reflect: true },
    itemWidth: { type: Number, attribute: 'item-width' },
    itemHeight: { type: Number, attribute: 'item-height' },
    reorderable: { type: Boolean, reflect: true },
    dragHandleLabel: { type: String, attribute: 'drag-handle-label' },
    dragHandleHint: { type: String, attribute: 'drag-handle-hint' },
    moveToStartLabel: { type: String, attribute: 'move-to-start-label' },
    moveBeforeLabel: { type: String, attribute: 'move-before-label' },
    moveAfterLabel: { type: String, attribute: 'move-after-label' },
    moveToEndLabel: { type: String, attribute: 'move-to-end-label' },
    liftedText: { type: String, attribute: 'lifted-text' },
    movedText: { type: String, attribute: 'moved-text' },
    cancelledText: { type: String, attribute: 'cancelled-text' },
    removeLabel: { type: String, attribute: 'remove-label' },
    retryLabel: { type: String, attribute: 'retry-label' },
    announcement: { type: String },
    disabled: { type: Boolean, reflect: true },
    error: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    rows: { type: String, reflect: true },
    typeErrorText: { type: String, attribute: 'type-error-text' },
    sizeErrorText: { type: String, attribute: 'size-error-text' },
    countErrorText: { type: String, attribute: 'count-error-text' },
    formatSize: { attribute: false },
    count: { state: true },
  };

  /** @from tanrei-file-picker.layout */
  layout: TanreiFilePickerLayout = 'button';

  /** @from tanrei-file-picker.multiple */
  multiple = false;

  /** @from tanrei-file-picker.accept */
  accept: string[] = [];

  /** @from tanrei-file-picker.maxSize */
  maxSize: number | null = null;

  /** The most files while `multiple` is set (`max-files`): the files it keeps while `rows` is `own`, the rows the list holds while it is `given`. Files chosen beyond the room that is left are refused. Null sets no limit. It is the file upload's own and is not given to its file picker. */
  maxFiles: number | null = null;

  /** The accessible name of the group ("Attachments"): the file picker and the list together. Not drawn. Leave it empty inside a Field, whose label names the group. */
  label = '';

  /** @from tanrei-file-picker.constraintsText */
  constraintsText = '';

  /** @from tanrei-file-picker.dropText */
  dropText = '';

  /** What is shown beside the trigger while no file is chosen, in the button layout (`empty-text`): this instance's words, else the product's (`setWords({ noFileText })`); with neither, nothing is drawn. Given to the file picker as its `selectionText` while the list holds no row. */
  emptyText = '';

  /** @from tanrei-file-item.form */
  itemForm: TanreiFileItemForm = 'row';

  /** @from tanrei-file-item.preview */
  itemPreview = false;

  /** @from tanrei-file-item.fit */
  itemFit: TanreiFileItemFit = 'cover';

  /** @from tanrei-file-item.nameHidden */
  itemNameHidden = false;

  /** @from tanrei-file-item.width */
  itemWidth: number | null = null;

  /** @from tanrei-file-item.height */
  itemHeight: number | null = null;

  /** Lets people put the files in another order (FUP-59): every row gets a handle, the whole row can be dragged, and the handle offers the moves in a menu and to the keyboard. While `rows` is `own` the file upload reorders the files it keeps and fires `change`; while it is `given` it fires `move` and you reorder your file items. Ignored while disabled. */
  reorderable = false;

  /** The name of every row's handle (`drag-handle-label`): your sentence with the place `{label}`, filled with the file's name ("Reorder {label}"). Empty reads the product's words. Given to the List. */
  dragHandleLabel = '';

  /** The description of every handle (`drag-handle-hint`): how to move a row with the keyboard, in your words. Given to the List. */
  dragHandleHint = '';

  /** The move menu's item that moves a row to the first place (`move-to-start-label`). Given to the List. */
  moveToStartLabel = '';

  /** The move menu's item that moves a row one place toward the start (`move-before-label`). Given to the List. */
  moveBeforeLabel = '';

  /** The move menu's item that moves a row one place toward the end (`move-after-label`). Given to the List. */
  moveAfterLabel = '';

  /** The move menu's item that moves a row to the last place (`move-to-end-label`). Given to the List. */
  moveToEndLabel = '';

  /** Said when the keyboard lifts a row (`lifted-text`): `{label}`, `{position}`, `{count}`. Given to the List. */
  liftedText = '';

  /** Said when a lifted row reaches another place, and once a move has taken effect (`moved-text`): `{label}`, `{position}`, `{count}`. Given to the List. */
  movedText = '';

  /** Said when a move with the keyboard is cancelled (`cancelled-text`): `{label}`, `{position}`, `{count}`. Given to the List. */
  cancelledText = '';

  /** @from tanrei-file-item.removeLabel */
  removeLabel = '';

  /** @from tanrei-file-item.retryLabel */
  retryLabel = '';

  /** A message assistive technology hears through the one live region when the product sets or changes it ("3 files added"). Not drawn. Set in the same turn as rows change, it is said in their place. */
  announcement = '';

  /** @from tanrei-file-picker.disabled */
  disabled = false;

  /** @from tanrei-file-picker.error */
  error = false;

  /** @from tanrei-file-picker.required */
  required = false;

  /** The name the files are submitted under: the kept files while `rows` is `own`, the files of the product's rows while it is `given`. Web only. A product that sends files itself gives none. */
  name = '';

  /** Who holds the rows. `own` (the default, and every value it does not know): the file upload keeps the files a person chose and makes a file item for each itself — choose, see the list, remove, submit, with nothing written. `given`: the product gives the rows as `<tanrei-file-item>` children and the file upload keeps no file — for a product that sends files itself and shows each one's status. Never guessed from the children. */
  rows: 'own' | 'given' = 'own';

  /** While `rows` is `own`: the sentence on the row of a file refused for its kind (`type-error-text`): this instance's words, else the product's (`setWords({ fileTypeErrorText })`); with neither the row is drawn without a sentence. */
  typeErrorText = '';

  /** While `rows` is `own`: the sentence on the row of a file refused for its size (`size-error-text`): this instance's words, else the product's (`setWords({ fileSizeErrorText })`). */
  sizeErrorText = '';

  /** While `rows` is `own`: the sentence on the row of a file refused because no more files fit (`count-error-text`): this instance's words, else the product's (`setWords({ fileCountErrorText })`). */
  countErrorText = '';

  /** While `rows` is `own`: the product's function from a size in bytes to the text a kept or refused file's row draws ("820 KB"). A property, never an attribute. Null draws no size: the file upload writes none itself. */
  formatSize: ((bytes: number) => string) | null = null;

  /** FUP-17: how many rows the product gave. */
  protected count = 0;
  private readonly fieldset = new FormDisabledController(this);
  /** A disabled `<fieldset>` around the element, as the platform says it (src/primitives/form-disabled.ts). */
  protected get formDisabled(): boolean {
    return this.fieldset.byFieldset;
  }

  private readonly internals = this.attachInternals();

  /** FUP-27: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /**
   * FUP-32: what a field around the file upload gives it (src/primitives/field.ts): the name while it has no `label`
   * of its own, the description, the invalid, required and disabled states. The file upload is the field's one control.
   */
  private readonly field = new FieldControlController(this, { errorCondition: true, named: () => !!this.label.trim() });

  /**
   * FUP-24, FUP-32, FPK-21: the file picker inside asks as every control does, and the file upload answers it in a
   * field's place — the description a field gave and the three states, and no name, so that the file picker exposes no
   * second group inside this one. The file picker gives its trigger the rest.
   */
  private readonly provider = new FieldProviderController(this, {
    controls: () => (this.picker ? [this.picker] : []),
    state: () => this.given,
    plain: () => null,
  });

  /** FUP-57: what the file picker's two events of one arrival said, until the arrival is over. */
  private arriving: { accepted: File[]; refused: TanreiFileUploadRefused[] } = { accepted: [], refused: [] };
  /** FUP-26: what each row last said; a row not in it is new. */
  private readonly known = new Map<Element, Known>();
  /** FUP-26: the file upload has been presented: a row that comes now was added. */
  private presented = false;
  /** FUP-26: the product's own sentence, set or changed in this turn. */
  private own: string | null = null;
  private turn: ReturnType<typeof setTimeout> | undefined;
  /** FUP-43: the files it keeps while `rows` is `own`, in order — handles, never read (FUP-51). */
  private kept: OwnRow[] = [];
  /** FUP-45: the files the last arrival refused, in the order they were refused. Not kept. */
  private refused: OwnRow[] = [];
  /** FUP-50: what the arrivals of this turn say: each newly kept file's name, each refused file's name and sentence. */
  private arrived: string[] = [];
  /** FUP-52: the next message says no row: the rows that are there came by a change of `rows`. */
  private hush = false;
  /** FUP-52: a row that leaves because `rows` changed held focus. */
  private leavingHeld = false;
  /** FUP-30: the row focus is on, as the last `focusin` said, and the rows as they stood. */
  private held: Element | null = null;
  private stood: Element[] = [];

  /**
   * The re-read of the product's rows (`readRows()`), once per turn however many rows said they changed in it: a file
   * upload of N rows built, or N rows changed at once, re-reads its N rows once — not once per row, which made the build
   * O(N²). It runs in a microtask, before the next frame, so every frame draws the rows as they are (FUP-29, FUP-39).
   */
  private readonly rowSyncs = new CoalescedSync(() => {
    if (this.isConnected) this.readRows();
  });

  /** FUP-17, FUP-29, FUP-30: a row that comes or goes is a row, or none, at once; a row that left with focus on it hands focus on. */
  private readonly children$ = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.rowsChanged(records));

  /** FUP-29: the product's rows that leave — put back where they stood until the List has drawn them leaving — with what was set on them. */
  private readonly leavingRows = new Map<Element, Departure>();
  /** FUP-29: the product's rows the file upload took away itself at the end of their leave: no change of the product's. */
  private readonly takenAway = new WeakSet<Element>();
  /** FUP-29: the slot inside the List's item each of the product's rows was last drawn in — where a row that leaves is drawn until it has gone. */
  private readonly rowSlots = new WeakMap<Element, HTMLSlotElement>();
  /** FUP-29: the List's items the List put back to draw them leaving (LST-41). */
  private readonly putBack = new WeakSet<Element>();
  /** FUP-29: the List's items come and go: one drawn leaving that the List has taken away ends its row's leave. */
  private readonly list$ = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.listChanged(records));
  /** FUP-29: the status each of the product's rows was last read with: a row whose status changes may change its height. */
  private readonly statuses = new WeakMap<Element, string>();
  /** FUP-29: each of the product's rows' item of the List, whose height moves where a change of status changes it (MOT-5). */
  private readonly rowSizes = new Map<HTMLElement, AnimatedSize>();
  /** FUP-29: the strip of tiles, whose height moves where a tile that arrives or leaves adds or takes away a line (MOT-5). */
  private readonly stripSize = new AnimatedSize(this, this.resizing(() => this.renderRoot?.querySelector<HTMLElement>('.list') ?? null));
  /** FUP-29: the rows the last update drew, in order: a change of them moves the strip of tiles. */
  private drawnRows: readonly unknown[] | null = null;
  private stripFitting = false;
  /** FUP-29: whether the list held no row when it was last drawn, the room above it as it was drawn before a change of that, and its motion. */
  private shownEmpty: boolean | null = null;
  private roomFrom: string | null = null;
  private roomMotion: Animation | null = null;
  /** FUP-29: the check, a frame after a change, of what the List still draws. */
  private checkFrame = 0;

  constructor() {
    super();
    this.addEventListener(FILE_ITEM_UPDATE, this.onRowUpdate);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** FUP-56: its one file picker, once rendered. */
  private get picker(): TanreiFilePicker | null {
    return this.renderRoot?.querySelector<TanreiFilePicker>('tanrei-file-picker') ?? null;
  }

  /** Disabled by its own `disabled`, by a field around it, or by its form (FUP-28, FUP-31, FUP-32). */
  private get isDisabled(): boolean {
    return this.disabled || this.field.disabled || this.formDisabled;
  }

  private get isError(): boolean {
    return this.error || this.field.invalid;
  }

  private get isRequired(): boolean {
    return this.required || this.field.required;
  }

  /** The one element in the trigger slot; the first where there are several (FPK-5). */
  private get trigger(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  /** W7: the file upload's first stop — the product's own trigger. */
  protected override get control(): HTMLElement | null {
    return this.trigger;
  }

  /** FUP-42: it keeps the chosen files and makes their rows itself — `own`, and every value it does not know. */
  private get keeps(): boolean {
    return this.rows !== 'given';
  }

  /** FUP-17: the rows the product gave, in the order it gave them — and none while `rows` is `own` (FUP-42). */
  private get givenRows(): Row[] {
    return this.keeps ? [] : this.itemChildren.filter((row) => !this.leavingRows.has(row));
  }

  /** The `tanrei-file-item` children the product wrote, whatever `rows` says. */
  private get itemChildren(): Row[] {
    return [...this.children].filter((child) => child.localName === ITEM && !child.slot);
  }

  /** FUP-17: how many rows the list holds — the product's, or the file upload's own: the kept files, then the refused. */
  private get rowCount(): number {
    return this.keeps ? this.kept.length + this.refused.length : this.count;
  }

  /** FUP-24: the group's name — its own label, else the field's. */
  private get groupName(): string {
    return this.field.name(this.label);
  }

  /** FUP-2: what the file picker is given as its selectionText — emptyText (the prop, else the product's words) while the list holds no row, and nothing while it holds one. */
  private get shownEmptyText(): string {
    return this.rowCount === 0 ? this.words.get('noFileText', this.emptyText) : '';
  }

  /** FUP-17: the form of every row; one it does not know is a column of rows. */
  private get shownForm(): TanreiFileItemForm {
    return this.itemForm === 'tile' ? 'tile' : 'row';
  }

  /**
   * FUP-24, FUP-32: what the file picker is given, as a field gives its control: no name; the description a field
   * gave the file upload, which the file picker puts last in its trigger's description; and the three states.
   */
  private get given(): FieldState {
    return {
      label: '',
      description: this.field.description(),
      invalid: this.isError,
      required: this.isRequired,
      requiredText: this.field.state?.requiredText ?? '',
      disabled: this.isDisabled,
    };
  }

  /** FUP-58, FUP-25, FUP-28: what every file item it holds is given, through the internal channel and through no prop of the item's. */
  private get gift(): FileItemGiven {
    return {
      form: this.shownForm,
      preview: this.itemPreview,
      fit: this.itemFit,
      nameHidden: this.itemNameHidden,
      width: this.itemWidth,
      height: this.itemHeight,
      removeLabel: this.removeLabel,
      retryLabel: this.retryLabel,
      disabled: this.isDisabled,
      listItem: false,
      made: this.keeps,
      between: BETWEEN,
    };
  }

  // ─── Form (FUP-31, FUP-49) ────────────────────────────────────────────────────────────────────────────────────

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while it is required and no row carries a file. */
  get validity(): ValidityState {
    // Here and below: a row that said it changed in this task is read first, so its file counts.
    this.rowSyncs.flush();
    return this.internals.validity;
  }

  get validationMessage(): string {
    this.rowSyncs.flush();
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity() {
    this.rowSyncs.flush();
    return this.internals.checkValidity();
  }

  reportValidity() {
    this.rowSyncs.flush();
    return this.internals.reportValidity();
  }

  /** FUP-31: while `rows` is `given` a reset changes nothing — the rows are the product's to clear. FUP-49: while it is `own` a reset does what `clear()` does, and emits nothing. */
  formResetCallback() {
    if (this.keeps) this.clear();
    this.syncForm();
  }

  /** FUP-31, FUP-49: nothing is restored: no state is kept with the form — a handle does not outlast the page. */
  formStateRestoreCallback() {
    this.syncForm();
  }

  formDisabledCallback() {
    this.fieldset.formDisabledCallback();
  }

  /**
   * FUP-31: one entry per row that has a file, under the name, in the order of the rows — and nothing while disabled or
   * unnamed. FUP-49: while `rows` is `own`, one entry per kept file, never a refused one, and no empty entry.
   */
  private syncForm() {
    const files = this.keeps ? this.kept.map((row) => row.file) : this.givenRows.map((row) => row.file).filter((file): file is File => typeof File !== 'undefined' && file instanceof File);
    if (this.isDisabled || !this.name) this.internals.setFormValue(null, null);
    else {
      const data = new FormData();
      for (const file of files) data.append(this.name, file, file.name);
      this.internals.setFormValue(data, null);
    }
    if (!this.isRequired || files.length > 0) {
      this.internals.setValidity({});
      return;
    }
    // The browser's own words for a required file input left empty; the bubble stands at the trigger.
    const message = missingValueMessage('file', { errorText: '', requiredText: this.field.state?.requiredText ?? '', label: this.groupName });
    try {
      this.internals.setValidity({ valueMissing: true }, message, this.trigger ?? undefined);
    } catch {
      this.internals.setValidity({ valueMissing: true }, message);
    }
  }

  // ─── Arrivals (FUP-9, FUP-43, FUP-57) ─────────────────────────────────────────────────────────────────────────

  /** FUP-57: the file picker's `select` is answered here and does not reach the product as it is. */
  private readonly onPickerSelect = (event: Event) => {
    event.stopPropagation();
    this.arriving.accepted = [...(event as CustomEvent<TanreiFilePickerSelectDetail>).detail.files];
  };

  /** FUP-57: the file picker's `reject` is answered here and does not reach the product as it is. */
  private readonly onPickerReject = (event: Event) => {
    event.stopPropagation();
    this.arriving.refused = [...(event as CustomEvent<TanreiFilePickerRejectDetail>).detail.files];
  };

  /** FUP-57: the arrival is over — one choice is told once, by the file upload's own events. */
  private readonly onArrival = (event: Event) => {
    event.stopPropagation();
    const { accepted, refused } = this.arriving;
    this.arriving = { accepted: [], refused: [] };
    if (this.isDisabled || (!accepted.length && !refused.length)) return;
    if (this.keeps) this.arrive(accepted, refused, true);
    else this.handOver(accepted, refused);
  };

  /** FUP-9: the room that is left, which the file picker cannot know — `held` is what the list already holds. Answers with the files that found room and the ones that did not. */
  private room(files: readonly File[], held: number): { passed: File[]; refused: TanreiFileUploadRefused[] } {
    const maxFiles = this.multiple ? limit(this.maxFiles) : null;
    if (maxFiles === null) return { passed: [...files], refused: [] };
    const left = Math.max(0, maxFiles - held);
    return { passed: files.slice(0, left), refused: files.slice(left).map((file) => ({ file, reason: 'count' as const })) };
  }

  /**
   * FUP-9: while `rows` is `given` nothing is kept: `select` with the files that also found room, then `reject` with
   * the files the file picker refused, in the order it refused them, and then those refused for want of room. No row
   * is added: the product adds one for each file it keeps.
   */
  private handOver(accepted: readonly File[], refusedByPicker: readonly TanreiFileUploadRefused[]) {
    const { passed, refused: full } = this.room(accepted, this.givenRows.length);
    const refused = [...refusedByPicker, ...full];
    if (passed.length) this.dispatchEvent(new CustomEvent<TanreiFileUploadSelectDetail>('select', { bubbles: true, detail: { files: passed } }));
    if (refused.length) this.dispatchEvent(new CustomEvent<TanreiFileUploadRejectDetail>('reject', { bubbles: true, detail: { files: refused } }));
  }

  // ─── Its own files (FUP-42 to FUP-55) ─────────────────────────────────────────────────────────────────────────

  /**
   * FUP-48: the files it keeps while `rows` is `own`, in order, as the browser's own `File` handles: a new array on
   * each read, so changing it changes nothing that is kept. Never a refused file. Empty while `rows` is `given`.
   */
  get files(): File[] {
    return this.keeps ? this.kept.map((row) => row.file) : [];
  }

  /**
   * FUP-48: hands files over, as a product does that takes them elsewhere — a drop target of its own, a paste. They
   * are judged by its file picker (FPK-31) and are then an arrival (FUP-43): kept or refused, drawn and announced as a
   * choice is, with no event. Answers with the refused files and their reasons. Works while disabled. While `rows` is
   * `given` it does nothing and is reported.
   */
  add(files: Iterable<File>): TanreiFileUploadRefused[] {
    if (!this.keeps) {
      report(this, 'FUP-42', 'add() was called while rows is "given": the file upload keeps no file there, and nothing was added; give the product\'s rows their files, or leave rows as "own"');
      return [];
    }
    const given = typeof File === 'undefined' ? [] : [...(files ?? [])].filter((file): file is File => file instanceof File);
    if (!given.length) return [];
    // The file picker judges by what the file upload says now, also where it has not rendered since a prop changed —
    // and, before the file upload was first drawn, a file picker that is nowhere judges by the same props.
    const picker = this.picker ?? (document.createElement('tanrei-file-picker') as TanreiFilePicker);
    picker.multiple = this.multiple;
    picker.accept = this.accept;
    picker.maxSize = this.maxSize;
    const { accepted, refused } = picker.judge(given);
    return this.arrive(accepted, refused, false);
  }

  /**
   * FUP-48: lets go of every file it keeps and removes every row, kept and refused. Emits nothing and announces
   * nothing; focus that was on a row goes to the trigger. Works while disabled. Does nothing while `rows` is `given`.
   */
  clear(): void {
    if (!this.keeps || (!this.kept.length && !this.refused.length)) return;
    this.redraw(() => {
      this.kept = [];
      this.refused = [];
    });
    this.arrived = [];
  }

  /** FUP-43: the same file — the same name, size and time of last change, as the browser reports them. */
  private static same(a: File, b: File): boolean {
    return a === b || (a.name === b.name && a.size === b.size && a.lastModified === b.lastModified);
  }

  /**
   * FUP-43: files arrived while `rows` is `own` — chosen or dropped (`person`), or handed over by `add()` — and were
   * judged by the file picker. The rows of what an earlier arrival refused leave; a file that passed and that it
   * already keeps, and a second copy within the arrival, is passed over; the rest is judged for the room that is left.
   * With `multiple` what found room is kept after the others; without it a file that passed takes the place of them
   * all, and a refused choice replaces nothing. Then the rows are drawn, and — for what a person did — `select`,
   * `reject` and `change` are emitted, in that order (FUP-47). One message says it (FUP-50).
   */
  private arrive(accepted: readonly File[], refusedByPicker: readonly TanreiFileUploadRefused[], person: boolean): TanreiFileUploadRefused[] {
    const before = this.kept;
    const fresh: File[] = [];
    for (const file of accepted) {
      if (before.some((row) => TanreiFileUpload.same(row.file, file)) || fresh.some((other) => TanreiFileUpload.same(other, file))) continue;
      fresh.push(file);
    }
    const { passed, refused: full } = this.room(fresh, before.length);
    // FUP-45: first the files the file picker refused, in the order it refused them, then those refused for want of room.
    const refused = [...refusedByPicker, ...full];
    const added = passed.map((file): OwnRow => ({ file, reason: null }));
    const kept = !added.length ? before : this.multiple ? [...before, ...added] : added;
    this.redraw(() => {
      this.kept = kept;
      this.refused = refused.map(({ file, reason }): OwnRow => ({ file, reason }));
    });
    // FUP-50: the names are the files' own and the sentences the product's.
    this.arrived.push(...passed.map((file) => file.name), ...refused.map(({ file, reason }) => [file.name, this.sentence(reason)].map((text) => text.trim()).filter(Boolean).join(', ')));
    if (this.arrived.length) this.changed();
    if (person) {
      if (passed.length) this.dispatchEvent(new CustomEvent<TanreiFileUploadSelectDetail>('select', { bubbles: true, detail: { files: passed } }));
      if (refused.length) this.dispatchEvent(new CustomEvent<TanreiFileUploadRejectDetail>('reject', { bubbles: true, detail: { files: refused } }));
      if (kept !== before) this.emitChange();
    }
    return refused.map(({ file, reason }) => ({ file, reason }));
  }

  /** FUP-47: the files it keeps changed by what a person did. Never while disabled (FUP-54). */
  private emitChange() {
    if (this.isDisabled) return;
    this.dispatchEvent(new CustomEvent<TanreiFileUploadChangeDetail>('change', { bubbles: true, detail: { files: this.files } }));
  }

  /** FUP-53: the product's sentence for a reason — the instance's prop, else the product's words, else nothing. */
  private sentence(reason: TanreiFileUploadRejectReason): string {
    return reason === 'type' ? this.words.get('fileTypeErrorText', this.typeErrorText) : reason === 'size' ? this.words.get('fileSizeErrorText', this.sizeErrorText) : this.words.get('fileCountErrorText', this.countErrorText);
  }

  /** FUP-44: a file's size in the product's words: what its function writes, and nothing where it gave none. */
  private sizeOf(file: File): string {
    if (typeof this.formatSize !== 'function') return '';
    try {
      const text: unknown = this.formatSize(file.size);
      return typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text);
    } catch (error) {
      report(this, 'FUP-44', `formatSize threw for a size of ${file.size} bytes, so no size is drawn: ${String(error)}`);
      return '';
    }
  }

  /** The file items it made itself, in the order they are drawn — but for those the List draws leaving (FUP-29). */
  private get ownRows(): Row[] {
    return [...(this.renderRoot?.querySelectorAll<HTMLElement>(`.list > tanrei-list-item:not([${LEAVING}]) > ${ITEM}`) ?? [])];
  }

  /**
   * Changes the two lists and draws the rows at once, so that what is emitted afterwards is emitted with the rows as
   * they will be (FUP-47). FUP-30: where a row that leaves held focus, focus goes to the remove action of the row that
   * followed it, or of the one before where none follows, or to the trigger where no row is left.
   */
  private redraw(change: () => void) {
    const order = [...this.kept, ...this.refused];
    const active = this.shadowRoot?.activeElement ?? null;
    const at = active ? this.ownRows.indexOf(active as HTMLElement) : -1;
    const held = at >= 0 ? order[at] : undefined;
    change();
    this.requestUpdate();
    // Before it was first drawn there is no row to draw at once, and none that held focus.
    if (!this.hasUpdated || !this.isConnected) return;
    this.performUpdate();
    const now = [...this.kept, ...this.refused];
    if (!held || now.includes(held)) return;
    const next = [...order.slice(at + 1), ...order.slice(0, at).reverse()].find((row) => now.includes(row));
    const target = next ? this.ownRows[now.indexOf(next)] : undefined;
    if (!target || !takeFocus(target)) this.trigger?.focus();
  }

  /**
   * FUP-46: the remove action of a row it made itself removes the row, at once. A kept file is let go and `change` is
   * emitted; a refused one leaves and nothing is emitted. The file item's own `remove` does not leave the shadow root:
   * it is an event of the product's rows.
   */
  private removeOwn(event: Event, row: OwnRow) {
    event.stopPropagation();
    if (this.isDisabled) return;
    const kept = this.kept.includes(row);
    this.redraw(() => {
      this.kept = this.kept.filter((each) => each !== row);
      this.refused = this.refused.filter((each) => each !== row);
    });
    if (kept) this.emitChange();
  }

  /**
   * FUP-59: the List asks for a row to stand in another place. While `rows` is `given` the move is the product's: the
   * file upload says it as its own `move` and changes nothing. While it is `own` the kept file takes its new place, the
   * rows are drawn in the new order, and `change` says so — unless the move would put a refused file's row among the
   * kept ones, or a kept one after a refused one: then nothing changes, and the List takes the move as refused.
   */
  private readonly onListMove = (event: Event) => {
    event.stopPropagation();
    if (this.isDisabled) return;
    const { from, to } = (event as CustomEvent<TanreiListMoveDetail>).detail;
    if (!this.keeps) {
      this.dispatchEvent(new CustomEvent<TanreiFileUploadMoveDetail>('move', { bubbles: true, detail: { from, to } }));
      return;
    }
    const order = [...this.kept, ...this.refused];
    const [moved] = order.splice(from, 1);
    if (!moved) return;
    order.splice(to, 0, moved);
    const kept = order.slice(0, this.kept.length);
    if (kept.some((row) => row.reason)) return;
    this.redraw(() => {
      this.kept = kept;
    });
    this.syncForm();
    this.emitChange();
  };

  /**
   * FUP-17, FUP-41: the slots are assigned by hand after every render: each of the product's rows to the slot inside
   * the List's item that holds it, the trigger and the glyph to the slots passed on to the file picker; anything else
   * to nothing.
   */
  private assignSlots() {
    const root = this.shadowRoot;
    if (!root) return;
    for (const name of ['trigger', 'icon']) {
      const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
      slot?.assign(...[...this.children].filter((child) => child.slot === name));
    }
    const rows = this.givenRows;
    root.querySelectorAll<HTMLSlotElement>(`.list > tanrei-list-item:not([${LEAVING}]) > slot[data-row]`).forEach((slot, index) => {
      const row = rows[index];
      if (row) {
        slot.assign(row);
        this.rowSlots.set(row, slot);
      } else slot.assign();
    });
    // FUP-29: a row that leaves is drawn in the item it stood in, while the List draws that item leaving.
    for (const row of this.leavingRows.keys()) this.rowSlots.get(row)?.assign(row);
  }

  // ─── The rows (FUP-17, FUP-26, FUP-30, FUP-58) ────────────────────────────────────────────────────────────────

  private readonly onRowUpdate = (event: Event) => {
    if (event.target === this) return;
    event.stopPropagation();
    // A file item it made itself is drawn from what the file upload holds: nothing of it is read back.
    if (this.keeps) return;
    this.rowSyncs.request();
  };

  /** The rows were added to, removed from, or changed: drawn at once, said once, submitted as they are now. */
  private readRows() {
    countWork('file-upload.sync');
    const rows = this.givenRows;
    this.count = rows.length;
    // FUP-29: a row whose status changed changes its height in one motion, where the status changes it.
    const changedStatus = rows.filter((row) => {
      const [was, now] = [this.statuses.get(row), rowStatus(row)];
      this.statuses.set(row, now);
      return was !== undefined && was !== now;
    });
    if (changedStatus.length) void this.resizeRows(changedStatus);
    // FUP-17: the List draws the rows in the order they stand now — a new order of as many rows too.
    this.requestUpdate();
    this.tellRows(rows);
    this.syncForm();
    this.changed();
  }

  /** FUP-58, FUP-25, FUP-28: each file item it holds is given the one form of the rows, the two action names, whether it is disabled and that it is an item of a list; one it holds no longer is told so. */
  private tellRows(rows: Row[] = this.keeps ? this.ownRows : this.givenRows) {
    const gift = this.gift;
    for (const row of rows) giveFileItem(row, gift);
    // FUP-42: a child the file upload does not draw is given nothing.
    if (this.keeps) for (const row of this.itemChildren) giveFileItem(row, null);
  }

  private rowsChanged(records: MutationRecord[]) {
    const isRow = (node: Node): node is Element => node instanceof Element && node.localName === ITEM;
    // The product's rows this change took away and added — not those the file upload took away itself at the end of
    // their leave, and not one moved among the others.
    const removed = new Set<Element>();
    const added = new Set<Element>();
    for (const record of records) {
      for (const node of record.removedNodes) if (isRow(node) && !this.takenAway.delete(node)) removed.add(node);
      for (const node of record.addedNodes) if (isRow(node)) added.add(node);
    }
    for (const node of removed) if (node.parentNode === this) removed.delete(node);
    // FUP-29: a row that leaves and that the product takes away again is gone at once; one it gives back is a row again.
    for (const node of removed) {
      if (!this.leavingRows.has(node)) continue;
      removed.delete(node);
      this.depart(node);
    }
    for (const node of added) if (node.parentNode === this) this.giveBack(node);
    if (removed.size && this.moves) this.leave(records, removed);
    // A file item that left is the product's alone again: what it was given goes back.
    for (const node of removed) if (!this.leavingRows.has(node)) giveFileItem(node, null);
    const before = this.stood;
    this.rowSyncs.now();
    this.stood = this.givenRows;
    this.afterLeave(before, records);
  }

  private rowOf(target: EventTarget | null): Element | null {
    return target instanceof Element && target.parentNode === this && target.localName === ITEM ? target : null;
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    this.held = this.rowOf(event.target);
  };

  /**
   * Focus that leaves a row which is still here has gone elsewhere, by the person's doing. An engine that says so
   * while it removes the focused element says it of a row that is no longer here: that one is the observer's to follow.
   */
  private readonly onFocusOut = (event: FocusEvent) => {
    const row = this.rowOf(event.target);
    if (!row) return;
    queueMicrotask(() => {
      if (this.held === row && row.parentNode === this && !holdsFocus(row)) this.held = null;
    });
  };

  /**
   * FUP-30: a row left while focus was on one of its stops, and focus is now nowhere: it goes to the remove action of
   * the row that followed, or of the one before where none follows — to its body where it has no remove action and
   * that is pressable, and on to the next such row otherwise — or to the trigger where no row is left. Where the
   * product has already put focus somewhere, nothing is done.
   */
  private afterLeave(before: readonly Element[], records: MutationRecord[]) {
    const held = this.held;
    if (!held || !records.some((record) => [...record.removedNodes].includes(held))) return;
    const active = this.ownerDocument.activeElement;
    const nowhere = !active || active === this.ownerDocument.body || active === this.ownerDocument.documentElement;
    // A row that leaves (FUP-29) stands here only to be drawn: it is no row.
    const here = (node: Element) => node.parentNode === this && !this.leavingRows.has(node);
    if (!nowhere || here(held)) {
      if (!holdsFocus(held)) this.held = null;
      return;
    }
    this.held = null;
    const at = before.indexOf(held);
    const now = this.givenRows;
    // The rows that were its neighbours, the following ones first. A product that writes the whole list again leaves
    // none of them: the row that now stands where it stood is the one that followed it.
    const order = before.some(here) ? [...before.slice(at + 1), ...before.slice(0, Math.max(0, at)).reverse()] : [...now.slice(Math.max(0, at)), ...now.slice(0, Math.max(0, at)).reverse()];
    const candidates = order.filter(here) as Row[];
    const take = (): boolean => {
      for (const candidate of candidates.filter(here)) {
        if (takeFocus(candidate)) {
          this.held = candidate;
          return true;
        }
      }
      return false;
    };
    if (take()) return;
    // A row that was written a moment ago has no action to focus until it has rendered.
    const pending = candidates.map((candidate) => candidate.updateComplete).filter((promise) => !!promise);
    void Promise.all(pending).then(() => {
      const current = this.ownerDocument.activeElement;
      if (!this.isConnected || (current && current !== this.ownerDocument.body && current !== this.ownerDocument.documentElement)) return;
      if (!take()) this.trigger?.focus();
    });
  }

  /** FUP-26: something that may be said changed in this turn; everything of one turn is one message. */
  private changed() {
    if (this.turn !== undefined) return;
    this.turn = setTimeout(() => {
      this.turn = undefined;
      this.say();
    }, 0);
  }

  /**
   * FUP-26: the one message of a turn — the product's own sentence alone where it set one, else each row that was
   * added, finished or failed, in the order of the rows, in the product's words: the name, then the status or the error.
   * Rows that were there when the file upload was first presented say nothing.
   */
  private say() {
    const hush = this.hush;
    this.hush = false;
    // FUP-50: while `rows` is `own`, what arrived in this turn — nothing of it before the file upload was first presented.
    const messages: string[] = this.keeps && this.presented ? this.arrived : [];
    this.arrived = [];
    const rows = this.givenRows;
    for (const row of rows) {
      const now: Known = { status: rowStatus(row), errorText: rowText(row, 'errorText', 'error-text') };
      const was = this.known.get(row);
      const failed = now.status === 'error';
      const said = !was
        ? this.presented && !hush
        : (now.status === 'done' && was.status !== 'done') || (failed && (was.status !== 'error' || was.errorText !== now.errorText));
      if (said) messages.push([rowText(row, 'name', 'name'), failed ? now.errorText : rowText(row, 'statusText', 'status-text')].map((text) => text.trim()).filter(Boolean).join(', '));
      this.known.set(row, now);
    }
    for (const row of [...this.known.keys()]) if (!rows.includes(row)) this.known.delete(row);
    const first = !this.presented;
    this.presented = true;
    const own = this.own;
    this.own = null;
    this.check(first);
    const region = this.renderRoot?.querySelector('.announce');
    const lines = own ? [own] : messages.filter(Boolean);
    if (!region || !this.isConnected || lines.length === 0) return;
    // Written as new lines in place of the last ones, so that a text equal to the last one is said again.
    region.replaceChildren(
      ...lines.map((text) => {
        const line = document.createElement('div');
        line.textContent = text;
        return line;
      }),
    );
  }

  /** @internal FPK-22: where a child is placed, for the Button that asks its parent when it connects: the file picker says it of its trigger. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    return (this.picker as (TanreiFilePicker & Partial<PlacingGroup>) | null)?.[GROUP_PLACE]?.(child) ?? null;
  }

  // ─── The rows' motion (FUP-29) ────────────────────────────────────────────────────────────────────────────────

  /** FUP-29: a change of the rows moves — not under reduced motion, and not while the file upload settles (MOT-3). */
  private get moves(): boolean {
    return this.hasUpdated && this.isConnected && !this.hasAttribute(SETTLING) && !motionReduced();
  }

  /**
   * FUP-29: the product took rows away, and the List draws them leaving (LST-41): each one that was drawn is put back
   * where it stood, as the product's child — `inert`, `aria-hidden` and `data-leaving`, so that it is no row from now
   * on — and is drawn in the List's item it stood in until the List has drawn that item leaving.
   */
  private leave(records: MutationRecord[], removed: Set<Element>) {
    const back = [...removed].filter((node) => !node.parentNode && !!this.rowSlots.get(node)?.isConnected);
    if (!back.length) return;
    for (const record of [...records].reverse()) {
      const nodes = [...record.removedNodes].filter((node): node is Element => node instanceof Element && back.includes(node) && !node.parentNode);
      if (!nodes.length) continue;
      const next = record.nextSibling?.parentNode === this ? record.nextSibling : null;
      let after = !next && record.previousSibling?.parentNode === this ? (record.previousSibling as ChildNode) : null;
      for (const node of nodes) {
        if (next) this.insertBefore(node, next);
        else if (after) after.after(node);
        else this.append(node);
        after = next ? null : node;
      }
    }
    for (const node of back) {
      this.leavingRows.set(node, { inert: (node as HTMLElement).inert, hidden: node.getAttribute('aria-hidden') });
      (node as HTMLElement).inert = true;
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute(LEAVING, '');
    }
    // What was put back is the file upload's doing, not the product's: it is not heard as a change.
    this.children$?.takeRecords();
  }

  /** FUP-29: a row of the product's that was leaving is a row again, as it was before it left. */
  private giveBack(node: Element) {
    const was = this.leavingRows.get(node);
    if (!was) return;
    this.leavingRows.delete(node);
    (node as HTMLElement).inert = was.inert;
    if (was.hidden === null) node.removeAttribute('aria-hidden');
    else node.setAttribute('aria-hidden', was.hidden);
    node.removeAttribute(LEAVING);
  }

  /** FUP-29: a row of the product's has left: taken out of the file upload, as the product took it, and given back what it had. */
  private depart(node: Element) {
    if (!this.leavingRows.has(node)) return;
    this.giveBack(node);
    this.rowSlots.delete(node);
    if (node.parentNode === this) {
      // Heard as the file upload's own doing — while it is connected, and so heard at all.
      if (this.isConnected) this.takenAway.add(node);
      node.remove();
    }
    giveFileItem(node, null);
  }

  /** FUP-29: the List's items changed: an item it put back to draw leaving is noted, and one it has taken away ends its row's leave. */
  private listChanged(records: MutationRecord[]) {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element && node.hasAttribute(LEAVING)) this.putBack.add(node);
    this.checkLeaves(false);
    this.scheduleCheck();
  }

  /**
   * FUP-29: each row of the product's that leaves, whose item of the List is no longer drawn, has gone — once the List
   * has drawn it leaving and taken it away, or (`settled`, a frame after the change) where the List did not draw it so.
   */
  private checkLeaves(settled: boolean) {
    for (const row of [...this.leavingRows.keys()]) {
      const item = this.rowSlots.get(row)?.parentElement ?? null;
      if (item?.isConnected) continue;
      if (settled || !item || this.putBack.has(item)) this.depart(row);
    }
  }

  /**
   * FUP-29: a frame after a change of the rows — by then the List has put back what it draws leaving — the rows that
   * leave and that the List does not draw have gone.
   */
  private scheduleCheck() {
    if (this.checkFrame || typeof requestAnimationFrame !== 'function') return;
    this.checkFrame = requestAnimationFrame(() => {
      this.checkFrame = 0;
      this.checkLeaves(true);
    });
  }

  /** FUP-29: every row that leaves has gone, at once. */
  private endLeaves() {
    for (const row of [...this.leavingRows.keys()]) this.depart(row);
  }

  /**
   * FUP-29: the rows arrive, leave and change their height as the List's items do (LST-41): on the List's resize motion,
   * whose time and curve the List gives (`LIST_MOTION`) when a change moves — the token is the List's, and the file
   * upload reads none of a member's. A box of its own that moves with them (MOT-5), anchored at its top.
   */
  private resizing(box: () => HTMLElement | null): AnimatedSizeOptions {
    const motion = () => this.renderRoot?.querySelector<TanreiList>('.list')?.[LIST_MOTION]('resize') ?? { duration: 0, easing: 'ease' };
    return {
      box,
      anchor: () => 'start',
      still: () => this.hasAttribute(SETTLING),
      get duration() {
        return `${motion().duration}ms`;
      },
      get easing() {
        return motion().easing;
      },
    };
  }

  /**
   * FUP-29: the room of list.gap above the list opens with the first row and closes with the last, over the List's
   * resize motion, from the room drawn when the change came (MOT-2) — the time and the curve the List gives, as its
   * cascade computes them (`LIST_MOTION`: a duration token is an expression). Started here, in the
   * task of the change, and not by a transition, which WebKit does not start for a box whose children the same update
   * changes.
   */
  private moveRoom() {
    const list = this.renderRoot?.querySelector<TanreiList>('.list');
    const from = this.roomFrom;
    this.roomFrom = null;
    this.shownEmpty = this.rowCount === 0;
    if (!list || from === null) return;
    this.roomMotion?.cancel();
    this.roomMotion = null;
    const to = getComputedStyle(list).marginBlockStart;
    const { duration, easing } = list[LIST_MOTION]('resize');
    if (!(duration > 0) || from === to || !this.moves) return;
    const keyframes = [{ marginBlockStart: from }, { marginBlockStart: to }];
    let motion: Animation;
    try {
      motion = list.animate(keyframes, { duration, easing, id: 'file-upload-room' });
    } catch {
      motion = list.animate(keyframes, { duration, id: 'file-upload-room' });
    }
    // From the first frame drawn after the change, with the rows' own motions (the List's `showPresence`): WebKit dates
    // a motion begun in a task from the frame drawn before it, and rows that take longer to render than the motion
    // lasts would have it over before its first frame.
    startFromNextFrame([motion]);
    this.roomMotion = motion;
    const done = () => {
      if (this.roomMotion === motion) this.roomMotion = null;
    };
    motion.finished.then(done, done);
  }

  /** FUP-29: each of the product's rows has its item's height followed, so that a change of status can move it. */
  private syncRowSizes() {
    const items = new Set(this.givenRows.map((row) => this.rowSlots.get(row)?.parentElement).filter((item): item is HTMLElement => !!item?.isConnected));
    for (const [item, size] of this.rowSizes) {
      if (items.has(item)) continue;
      this.removeController(size);
      size.hostDisconnected();
      this.rowSizes.delete(item);
    }
    for (const item of items) {
      if (this.rowSizes.has(item)) continue;
      const size = new AnimatedSize(this, this.resizing(() => item));
      size.hostUpdated();
      this.rowSizes.set(item, size);
    }
  }

  /**
   * FUP-29: rows whose status changed: once each has drawn its new status, its item of the List moves from the height
   * the last frame drew to its new one, anchored at its top, the rows after it moving with it in the layout — where the
   * status changed its height, and at once where motion is reduced (`AnimatedSize`). A row that arrives or leaves
   * meanwhile is the List's to draw.
   */
  private async resizeRows(rows: Row[]) {
    await drawn(() => rows);
    for (const row of rows) {
      const item = this.rowSlots.get(row)?.parentElement;
      const size = item ? this.rowSizes.get(item) : undefined;
      if (!item || !size || !this.givenRows.includes(row) || item.getAnimations().some((motion) => motion.id.startsWith('list-item'))) continue;
      size.fit(true);
    }
  }

  /**
   * FUP-29: a tile arrived or left and the strip of tiles may have another number of lines: once every tile has drawn
   * itself, its height moves from the one the last frame drew to its new one, anchored at its top (MOT-5) — at once
   * where motion is reduced or the file upload settles (`AnimatedSize`).
   */
  private async fitStrip() {
    if (this.stripFitting) return;
    this.stripFitting = true;
    await drawn(() => [...(this.renderRoot?.querySelectorAll('.list > tanrei-list-item') ?? []), ...this.givenRows]);
    this.stripFitting = false;
    if (this.shownForm === 'tile') this.stripSize.fit(true);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    this.children$?.observe(this, { childList: true });
    this.stood = this.givenRows;
    this.count = this.stood.length;
    // FUP-58: the file items that are here already are given what every row shares before any of them draws itself.
    this.tellRows(this.stood);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$?.disconnect();
    // FUP-29: drawn again where it is connected next, at rest.
    this.endLeaves();
    cancelAnimationFrame(this.checkFrame);
    this.checkFrame = 0;
    clearTimeout(this.turn);
    this.turn = undefined;
    this.held = null;
    this.arriving = { accepted: [], refused: [] };
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // FUP-29: the list comes to hold its first row or loses its last: the room above it as it is drawn now, which the
    // update moves from.
    const empty = this.rowCount === 0;
    const list = this.renderRoot?.querySelector<HTMLElement>('.list');
    if (list && this.shownEmpty !== null && empty !== this.shownEmpty && this.moves) this.roomFrom = getComputedStyle(list).marginBlockStart;
    // FUP-52: `rows` changed while it is shown. From own to given every kept file is let go and every row it made
    // leaves; from given to own it begins with none (it kept none) and the product's rows are no longer drawn. Nothing
    // is emitted or said, and focus that a leaving row held goes to the trigger. (Before it was first drawn the same
    // holds, and there is no row that could hold focus: what it has read of the product's rows is read again.)
    if (changed.has('rows')) {
      const kept = changed.get('rows') !== 'given';
      if (kept !== this.keeps) {
        if (this.hasUpdated) {
          const active = this.shadowRoot?.activeElement ?? null;
          this.leavingHeld = kept ? !!active && this.ownRows.includes(active as HTMLElement) : this.itemChildren.some(holdsFocus);
        }
        if (kept) {
          this.kept = [];
          this.refused = [];
        }
        // FUP-29: the product's rows that leave have gone, at once.
        this.endLeaves();
        this.arrived = [];
        this.held = null;
        this.stood = this.givenRows;
        this.count = this.stood.length;
        this.hush = true;
        this.changed();
      }
    }
    // FUP-26: the product's sentence, when it is set to a text or changed — never the one it was first presented with.
    if (changed.has('announcement') && this.hasUpdated && this.announcement.trim()) {
      this.own = this.announcement;
      this.changed();
    }
  }

  protected override firstUpdated() {
    // FUP-26: the rows that are here now are the ones it was presented with.
    this.changed();
    // FUP-29: the List shows a row arriving and leaving also while it is not reorderable, and is watched for the rows it draws leaving.
    const list = this.renderRoot.querySelector<TanreiList>('.list');
    if (list) {
      list[LIST_PRESENCE](true);
      this.list$?.observe(list, { childList: true });
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.assignSlots();
    // FUP-24, FUP-32: the file picker is told at once what a field gave the file upload.
    this.provider.sync();
    // FUP-28: and its trigger, just passed on, is told by the file picker before the trigger is first drawn.
    this.picker?.tellTrigger();
    this.tellRows();
    this.syncForm();
    // FUP-29: what moves with a change of the rows — the height of each of the product's rows, and the strip of tiles.
    this.syncRowSizes();
    const rows = this.keeps ? [...this.kept, ...this.refused] : this.givenRows;
    const was = this.drawnRows;
    if (was && (rows.length !== was.length || rows.some((row, index) => row !== was[index])) && this.shownForm === 'tile') void this.fitStrip();
    this.drawnRows = rows;
    this.moveRoom();
    if (this.leavingRows.size) this.scheduleCheck();
    if (this.leavingHeld) {
      this.leavingHeld = false;
      this.trigger?.focus();
    }
    if (this.presented) this.reports(changed);
  }

  /** What a debug build is told about the content, once it has all been written: the file upload still renders. */
  private check(first: boolean) {
    // FUP-41: a child that is neither the trigger, the glyph nor a file item is not drawn.
    const strays = [...this.childNodes].filter((node) => (node instanceof Element ? !node.slot && node.localName !== ITEM : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
    if (strays.length) report(this, 'FUP-41', 'the file upload holds content that is neither its trigger, its glyph nor a file item; it is not drawn');
    // FUP-42: a row the product gives while the file upload keeps its own files is not drawn.
    if (this.keeps && this.itemChildren.length) report(this, 'FUP-42', 'the file upload holds tanrei-file-item children while rows is "own": it keeps the chosen files and makes their rows itself, so these are not drawn; say rows="given" to give the rows');
    const rows = this.givenRows;
    // FUP-38: two rows with one value are both drawn.
    const values = rows.map((row) => rowText(row, 'value', 'value'));
    const twice = values.find((value, index) => values.indexOf(value) !== index);
    if (twice !== undefined) report(this, 'FUP-38', `two rows have the value "${twice}"; both are drawn, and click, remove and retry cannot tell them apart`);
    // FUP-58: a product's file item that says otherwise what the file upload gives every row is drawn as the file upload says.
    for (const [prop, attribute, unsaid] of SHARED) {
      const mine = this[prop];
      const theirs = rows.find((row) => {
        if (!row.hasAttribute(attribute)) return false;
        const said = row.getAttribute(attribute);
        if (said === unsaid) return false;
        return typeof mine === 'boolean' ? !mine : typeof mine === 'number' || mine === null ? Number(said) !== mine : said !== mine;
      });
      if (theirs) report(this, 'FUP-58', `a file item says ${attribute}="${theirs.getAttribute(attribute)}" and the file upload gives every row its own ${prop}; the row is drawn as the file upload says — set it on the file upload`);
    }
    if (first) this.reports(new Map() as PropertyValues<this>, true);
  }

  private reports(changed: PropertyValues<this>, all = false) {
    const has = (name: keyof TanreiFileUpload) => all || changed.has(name);
    if (has('rows') && !ROWS.includes(this.rows)) report(this, 'FUP-42', `rows "${String(this.rows)}" is not a way of holding the rows; the file upload keeps its own files, as with "own"`);
    if (has('itemForm') && !ITEM_FORMS.includes(this.itemForm)) report(this, 'FUP-17', `item-form "${String(this.itemForm)}" is not a form of a file item; the rows are arranged as a column`);
    if (has('maxFiles') && this.maxFiles !== null && limit(this.maxFiles) === null) report(this, 'FUP-38', `max-files "${String(this.maxFiles)}" is not a number above zero; no limit of files is set`);
    // FUP-24: a group without a name.
    if (!this.groupName.trim()) report(this, 'FUP-24', 'label is empty and no field names the file upload, so the group has no accessible name; give it a label, or put it in a tanrei-field');
    // FUP-27: a limit of its own that is enforced and not said; the file picker says the same of accept and max-size (FPK-18).
    if (!this.constraintsText.trim() && this.multiple && limit(this.maxFiles) !== null) {
      report(this, 'FUP-27', 'max-files sets a limit and constraints-text is empty, so the limit is enforced and not said; say it in constraints-text');
    }
    // FUP-45, FUP-53: a refused file's row without the product's sentence for its reason is drawn with its mark and its name.
    for (const [reason, key, attribute] of REASONS) {
      if (this.keeps && this.refused.some((row) => row.reason === reason) && !this.sentence(reason)) {
        this.words.missing(key, { id: 'FUP-45', effect: `a file refused for its ${reason} is drawn as a failed row without a sentence that says why (${attribute})` });
      }
    }
  }

  /**
   * FUP-44, FUP-45: a row it makes itself — a file item, so a row has one drawing. A kept file is a pending file item
   * given the file's handle, its name and its media type, with the size the product's function writes; a refused one
   * a failed file item with the product's sentence for its reason, given no handle, never retryable. Neither is
   * pressable or a link: the file upload opens nothing.
   */
  private ownRow(row: OwnRow) {
    return html`<tanrei-file-item
      part="file-item"
      exportparts=${ITEM_PARTS.attribute}
      .file=${row.reason ? null : row.file}
      .name=${row.file.name}
      .mediaType=${row.file.type}
      .sizeText=${this.sizeOf(row.file)}
      .status=${row.reason ? 'error' : 'pending'}
      .errorText=${row.reason ? this.sentence(row.reason) : ''}
      @remove=${(event: Event) => this.removeOwn(event, row)}
      @retry=${(event: Event) => event.stopPropagation()}
      @click=${(event: Event) => event.stopPropagation()}
    ></tanrei-file-item>`;
  }

  // FUP-56, FUP-58: its file picker, as a product writes one — with the passage of the trigger and the glyph — and
  // below it the list: the product's own file items in the default slot, or the ones it makes.
  protected override render() {
    const name = this.groupName.trim();
    const tile = this.shownForm === 'tile';
    const empty = this.rowCount === 0;
    // FUP-17, FUP-29: the list stands list.gap below the file picker while it holds a row. While it holds none it is
    // hidden from assistive technology — at once when the last row goes — and takes no room once it has drawn that row
    // leaving: it is empty, and the room above it has closed.
    return html`
      <div class="group" role="group" ${delegatedAria(this, { 'aria-label': name })}>
        <tanrei-file-picker
          part="file-picker"
          exportparts=${PICKER_PARTS.attribute}
          ${forward(this, PICKER)}
          .selectionText=${this.shownEmptyText}
          @select=${this.onPickerSelect}
          @reject=${this.onPickerReject}
          @tanrei-file-picker-arrival=${this.onArrival}
          >${this.pass('trigger')}${this.pass('icon')}</tanrei-file-picker
        >
        <tanrei-list
          part="list"
          class="list"
          label=${name}
          orientation=${tile ? 'horizontal' : 'vertical'}
          ?wrap=${tile}
          gap="small"
          ?reorderable=${this.reorderable && !this.isDisabled}
          .dragHandleLabel=${this.dragHandleLabel}
          .dragHandleHint=${this.dragHandleHint}
          .moveToStartLabel=${this.moveToStartLabel}
          .moveBeforeLabel=${this.moveBeforeLabel}
          .moveAfterLabel=${this.moveAfterLabel}
          .moveToEndLabel=${this.moveToEndLabel}
          .liftedText=${this.liftedText}
          .movedText=${this.movedText}
          .cancelledText=${this.cancelledText}
          data-form=${this.shownForm}
          ?data-empty=${empty}
          aria-hidden=${empty ? 'true' : nothing}
          @move=${this.onListMove}
          >${this.keeps
            ? repeat(
                [...this.kept, ...this.refused],
                (row) => row,
                (row) => html`<tanrei-list-item label=${row.file.name}>${this.ownRow(row)}</tanrei-list-item>`,
              )
            : repeat(
                this.givenRows,
                (row) => row,
                (row) => html`<tanrei-list-item label=${rowText(row, 'name', 'name')}><slot data-row></slot></tanrei-list-item>`,
              )}</tanrei-list
        >
        <div class="announce" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiFileUpload);
// FUP-60: the product's ARIA on the host is its group's (src/primitives/delegated-aria.ts), but for its name and its states,
// which are its props and its Field's (FUP-24, FUP-32): its file picker exposes them (FPK-17).
delegatesAria(TanreiFileUpload, {
  owns: ['aria-label', 'aria-labelledby', 'aria-disabled', 'aria-required', 'aria-invalid', 'aria-errormessage'],
  sentence: 'FUP-60',
  instead: { 'aria-label': 'name it with label', 'aria-labelledby': 'name it with label' },
});
if (!customElements.get('tanrei-file-upload')) customElements.define('tanrei-file-upload', TanreiFileUpload);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-file-upload': TanreiFileUpload;
  }
}

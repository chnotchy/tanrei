import { type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import {
  BUTTON_VARIANTS,
  CoalescedSync,
  FieldControlController,
  FieldProviderController,
  type FieldState,
  GROUP_PLACE,
  type GroupPlace,
  type PlacingGroup,
  SystemWatchController,
  WordsController,
  compChoice,
  countWork,
  giveAttributes,
  giveVariant,
  report,
  syncFocusStyle,
  takeBack,
} from '../../primitives/index.js';
import { ComposedElement, composedHost, exported } from '../../primitives/composed.js';
import { delegatedAria, delegatesAria } from '../../primitives/delegated-aria.js';
import { acceptConverter, fileKind } from '../../primitives/file-format.js';
import { FILE_ITEM_TAKE_FOCUS, FILE_ITEM_UPDATE, type FileItemGiven, giveFileItem } from '../../primitives/file-item-holder.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiButton } from '../button/button.js';
import { TanreiEmbeddedTextInput } from '../embedded-text-input/embedded-text-input.js';
import { TanreiFileItem, type TanreiFileItemDetail, type TanreiFileItemForm, type TanreiFileItemStatus } from '../file-item/file-item.js';
import { TanreiFilePicker, type TanreiFilePickerRefused, type TanreiFilePickerRejectDetail, type TanreiFilePickerRejectReason, type TanreiFilePickerSelectDetail } from '../file-picker/file-picker.js';
import { measured, styles } from './chat-composer.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';

// The members' own types are the chat composer's where an item's prop or an event's detail is the member's.
export type { TanreiFileItemDetail, TanreiFileItemForm, TanreiFileItemStatus };

/** Where the actions stand in the capsule (CCM-2, CCM-3). */
export type TanreiChatComposerLayout = 'inline' | 'stacked';
/** What Enter does on a hardware keyboard (CCM-12). */
export type TanreiChatComposerSendKey = 'enter' | 'modifier';
/** Whether files can be attached, and who holds them (CCM-21, CCM-22). */
export type TanreiChatComposerAttachments = 'none' | 'own' | 'given';
/** The form of the File items the chat composer draws itself (CCM-44). */
export type TanreiChatComposerAttachmentForm = 'auto' | 'tile' | 'row';
/** Why what the chat composer holds cannot be sent — names for the product's code, never words (CCM-9). */
export type TanreiChatComposerReason = 'disabled' | 'sending' | 'blocked' | 'empty' | 'length' | 'uploading' | 'failed';
/** Why a file was refused — a name for the product's code, never words: its kind, its size, or how many there were. */
export type TanreiChatComposerRejectReason = TanreiFilePickerRejectReason;
/** A file that was refused, with the reason: what `reject` carries and `addFiles()` answers with. */
export type TanreiChatComposerRefused = TanreiFilePickerRefused;
/** `send`: the text exactly as written, and the attachments in the order of the strip — the kept `File`s while `attachments` is `own`, the values of the File items that have not failed while it is `given`. */
export interface TanreiChatComposerSendDetail {
  value: string;
  attachments: File[] | string[];
}
/** `sendablechange`, `sendblocked`: whether it can be sent, and each reason it cannot. */
export interface TanreiChatComposerSendableDetail {
  sendable: boolean;
  reasons: TanreiChatComposerReason[];
}
/** `select`: the files of one arrival that passed, in the order they came. */
export interface TanreiChatComposerSelectDetail {
  files: File[];
}
/** `reject`: the files of one arrival that were refused, each with its reason. */
export interface TanreiChatComposerRejectDetail {
  files: TanreiChatComposerRefused[];
}
/** `attachmentschange`: the files the chat composer now keeps, in order. */
export interface TanreiChatComposerAttachmentsChangeDetail {
  files: File[];
}

const ITEM = 'tanrei-file-item';
const BUTTON = 'tanrei-button';
const PREFIX = '--tanrei-comp-chat-composer';
const LAYOUTS: readonly string[] = ['inline', 'stacked'];
const SEND_KEYS: readonly string[] = ['enter', 'modifier'];
const ATTACHMENTS: readonly string[] = ['none', 'own', 'given'];
const FORMS: readonly string[] = ['auto', 'tile', 'row'];
const STATUSES: readonly string[] = ['pending', 'uploading', 'done', 'error'];
/** CCM-6, CCM-7, CCM-17: the glyphs of the Buttons it brings, by their names in the system's icon set. */
const GLYPHS = { send: 'send', stop: 'stop', attach: 'attach_file' } as const;
/** The named slots that hold the product's own Buttons. */
const SLOTS = ['leading', 'trailing', 'attach', 'send', 'stop'] as const;
type SlotName = (typeof SLOTS)[number];

/**
 * W4: each member's documented parts, from the member's own list, each under the member's name: `container`, `label`
 * and `icon` are parts of two or three of them, and `container` is the chat composer's own.
 */
const prefixed = (member: { readonly parts: readonly string[] }, prefix: string) => exported(member, Object.fromEntries(member.parts.map((part) => [part, { as: `${prefix}-${part}` }])));
const INPUT_PARTS = prefixed(TanreiEmbeddedTextInput, 'input');
const PICKER_PARTS = prefixed(TanreiFilePicker, 'picker');
const ITEM_PARTS = prefixed(TanreiFileItem, 'item');
const ATTACH_PARTS = prefixed(TanreiButton, 'attach');
const SEND_PARTS = prefixed(TanreiButton, 'send');

/** CCM-22: a limit of the files it keeps is a number above zero; anything else sets none. */
const limit = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

/** CCM-18: the user-perceived characters of a text: grapheme clusters, where the browser segments them, and code points where it does not. */
function graphemes(text: string): number {
  if (!text) return 0;
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => { segment(text: string): Iterable<unknown> } }).Segmenter;
  if (!Segmenter) return [...text].length;
  let count = 0;
  for (const _ of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) count++;
  return count;
}

/** Whether focus is on `element` or inside it, its shadow root included. */
function holdsFocus(element: Element): boolean {
  const active = (element.getRootNode() as Document | ShadowRoot).activeElement;
  return !!active && element.contains(active);
}

/** A file the chat composer keeps (CCM-22), or one the last arrival refused, with the reason. */
interface Own {
  file: File;
  reason: TanreiChatComposerRejectReason | null;
}
/** What was announced of a File item last (CCM-30). */
interface Known {
  status: string;
  errorText: string;
}
type Item = Element & Partial<Pick<TanreiFileItem, 'value' | 'name' | 'status' | 'statusText' | 'errorText' | 'retryable' | 'updateComplete'>> & { [FILE_ITEM_TAKE_FOCUS]?: () => boolean };
/** A File item's prop, from the element or — before it is defined — from its attribute. */
const itemText = (item: Item, prop: 'name' | 'status' | 'statusText' | 'errorText' | 'value', attribute: string) => String(item[prop] ?? item.getAttribute(attribute) ?? '');
const itemStatus = (item: Item) => {
  const status = itemText(item, 'status', 'status');
  return STATUSES.includes(status) ? status : 'pending';
};
const itemRetryable = (item: Item) => (typeof item.retryable === 'boolean' ? item.retryable : item.hasAttribute('retryable'));
/** CCM-25: focus into a File item that stays — its remove action. */
const takeFocus = (item: Item): boolean => {
  if (item[FILE_ITEM_TAKE_FOCUS]) return item[FILE_ITEM_TAKE_FOCUS]();
  (item as HTMLElement).focus();
  return holdsFocus(item);
};
/** CCM-22: the same file — the same name, size and time of last change, as the browser reports them. */
const sameFile = (a: File, b: File) => a === b || (a.name === b.name && a.size === b.size && a.lastModified === b.lastModified);
/** CCM-22, CCM-31: each reason's key of the product's words. */
const REASON_WORDS = { type: 'fileTypeErrorText', size: 'fileSizeErrorText', count: 'fileCountErrorText' } as const;

/** `multiple` is true unless it is said to be false: an attribute that is there says true, and `multiple="false"` false. */
const DEFAULT_TRUE = { fromAttribute: (value: string | null) => value !== 'false' };

/**
 * Lets a person write a message and send it, in one capsule that holds everything. Built from an Embedded text input
 * (`<tanrei-embedded-text-input>`) — the typing, which grows with what is written — a File picker
 * (`<tanrei-file-picker>`) and File items (`<tanrei-file-item>`) — the attachments, as a strip at the top of the
 * capsule — and Buttons (`<tanrei-button>`): the send button, the stop button in its place, the attach button, and the
 * product's own in its slots. It adds what ties them: the capsule, which is its own part and shows the typing area's
 * focus on its edge; whether what it holds can be sent, and why not; the files it keeps; the counter; one live
 * region; and the form's value. **It never sends**: `send` hands the text and the attachments to the product.
 *
 * Contract: specs/chat-composer.spec.json.
 *
 * ```html
 * <tanrei-chat-composer label="Message" placeholder="Write a message" send-label="Send"
 *   attachments="own" attach-label="Attach files" remove-label="Remove">
 *   <tanrei-button slot="leading" variant="text" label="Mention someone"><span slot="icon">alternate_email</span></tanrei-button>
 * </tanrei-chat-composer>
 * ```
 *
 * `layout="inline"` (the default) puts every action on the line being written; `layout="stacked"` keeps the send
 * button on that line and puts everything else in a row beneath it, inside the capsule. A capsule narrower than
 * `comp.chat-composer.layout.inline-min-width` is laid out stacked whatever `layout` says; a stacked composer with
 * nothing for the row beneath is drawn as an inline one. Tab moves through it in the order it is drawn.
 *
 * Enter sends and Shift+Enter begins a new line; with `send-key="modifier"` Enter begins a new line. Ctrl+Enter and
 * Command+Enter send under both. An input method's Enter never sends, and neither does the return key of an on-screen
 * keyboard: both are the embedded text input's to tell. A request by the keyboard while the message cannot be sent
 * emits `sendblocked` with the reasons, unless there is simply nothing to send.
 *
 * `attachments="own"`: the composer keeps the files a person attaches — chosen, dropped on the capsule or pasted — and
 * draws a File item for each (`attachment-form`: a tile with its picture for an image, a row for anything else); a
 * refused file is a failed row with the product's sentence for its reason. `files` reads the kept files,
 * `addFiles(files)` hands files over and answers with the refused, `clear()` empties the text and the files.
 * `attachments="given"`: the File items are `<tanrei-file-item>` children the product adds on `select` and removes on
 * an item's `remove`, each with its status and progress; nothing can be sent while one is uploading, or has failed and
 * can be tried again.
 *
 * Form-associated: it submits the text under `name` and, while `attachments` is `own`, each kept file under
 * `files-name`; after `send` — unless that was cancelled — it asks its form to submit, and then does not empty itself.
 * Inside a `<tanrei-field>` it takes the field's label, help, error and `disabled`.
 *
 * Without script, and until the element is defined, a `<textarea>` and a submit `<button>` the product wrote as its
 * children are the form; when it is defined it takes the text area's text and hides and disables both.
 *
 * @tag tanrei-chat-composer
 * @slot leading - The product's own Buttons after the attach button: before the typing area in the inline layout, at the start of the row beneath it in the stacked one. Laid out and never restyled.
 * @slot trailing - The product's own Buttons before the send button in the inline layout, and at the end of the row beneath the typing area in the stacked one. Laid out and never restyled.
 * @slot attach - The product's own Button in place of the attach button the chat composer brings. Exactly one; it opens the browser's picker. Not drawn while `attachments` is `none`.
 * @slot send - The product's own Button in place of the send button the chat composer brings. Exactly one; it sends, and is disabled while nothing can be sent.
 * @slot stop - The product's own Button in place of the stop button the chat composer brings, shown in the send button's place while `sending` and `stoppable` are set. Exactly one.
 * @slot - While `attachments` is `given`: the attachments, `<tanrei-file-item>` children, in order. Anything else is not drawn, and while `attachments` is `own` or `none` nothing here is.
 * @csspart container - The capsule: the one container the chat composer draws, behind everything it holds.
 * @csspart strip - The strip of attachments at the top of the capsule.
 * @csspart counter - The number of characters, and the limit.
 * @csspart embedded-text-input - The typing area: the `<tanrei-embedded-text-input>` it is built from.
 * @csspart file-picker - The `<tanrei-file-picker>` it is built from, around the attach button.
 * @csspart file-item - A File item the chat composer drew itself, while `attachments` is `own`: a `<tanrei-file-item>` it is built from.
 * @csspart button - Each `<tanrei-button>` the chat composer brings: the attach button, and the send or the stop button.
 * @csspart attach-button - The attach button the chat composer brings.
 * @csspart send-button - The send button the chat composer brings.
 * @csspart stop-button - The stop button the chat composer brings, in the send button's place.
 * @exportparts tanrei-embedded-text-input input: input-input
 * @exportparts tanrei-file-picker container: picker-container, icon: picker-icon, label: picker-label, supporting-text: picker-supporting-text, selection-text: picker-selection-text
 * @exportparts tanrei-file-item container: item-container, media: item-media, icon: item-icon, preview: item-preview, headline: item-headline, supporting-text: item-supporting-text, status-icon: item-status-icon, progress: item-progress, action: item-action
 * @exportparts tanrei-button container: attach-container, label: attach-label, icon: attach-icon
 * @exportparts tanrei-button container: send-container, label: send-label, icon: send-icon
 * @attr {string} form - The id of the form the chat composer belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element.
 * @attr {string} files-name - Web only: the name each kept file is submitted under, while `attachments` is `own` and the chat composer stands in a form. Without it no file is submitted.
 * @fires input - The person changed the text: the typing area's own `input` event, which leaves the element as it is. Read the new text from `event.target.value`. Never when `value` is set, and not when the chat composer empties itself after `send`.
 * @fires {CustomEvent<TanreiChatComposerSendDetail>} send - The person sent what the chat composer holds, by the send button or the keyboard, while it could be sent. `detail.value` is the text exactly as written; `detail.attachments` the kept `File`s (`own`) or the values of the File items that have not failed (`given`), in the order of the strip. Bubbles; cancelable — a cancelled one keeps the content and asks no form to submit.
 * @fires {CustomEvent} stop - The person activated the stop button while `sending` and `stoppable` were set. The product stops what is under way and sets `sending`. Bubbles.
 * @fires {CustomEvent<TanreiChatComposerSendableDetail>} sendablechange - Whether what the chat composer holds can be sent changed, or the reasons it cannot did: `detail.sendable`, and `detail.reasons` by name — `disabled`, `sending`, `blocked`, `empty`, `length`, `uploading`, `failed`. Bubbles. Never when it is first drawn.
 * @fires {CustomEvent<TanreiChatComposerSendableDetail>} sendblocked - The person asked to send by the keyboard while it could not be sent for a reason other than being empty or disabled; `detail.reasons` says why. Bubbles.
 * @fires {CustomEvent<TanreiChatComposerSelectDetail>} select - Files were chosen in the picker, dropped on the capsule or pasted, and passed. Once per arrival; `detail.files` is a `File[]` — while `attachments` is `own`, the files newly kept. Bubbles.
 * @fires {CustomEvent<TanreiChatComposerRejectDetail>} reject - Files of one arrival were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 * @fires {CustomEvent<TanreiChatComposerAttachmentsChangeDetail>} attachmentschange - While `attachments` is `own`: the kept files changed by what a person did — an arrival that kept a file, or a kept file removed by its File item. `detail.files` is the `File[]` now kept. Bubbles. Never for `addFiles()`, `clear()`, the emptying after `send` or a reset.
 */
export class TanreiChatComposer extends ComposedElement implements PlacingGroup {
  static override styles = [composedHost, styles, hiddenHost];

  /** CCM-36: the one control the form meets. Its members stand in its shadow root, or are the product's own children, and take no part in a form. */
  static formAssociated = true;

  /**
   * Its parts, once: its own three, each member's host, and what each member exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = [
    'container',
    'strip',
    'counter',
    'embedded-text-input',
    'file-picker',
    'file-item',
    'button',
    'attach-button',
    'send-button',
    'stop-button',
    ...INPUT_PARTS.names,
    ...PICKER_PARTS.names,
    ...ITEM_PARTS.names,
    ...ATTACH_PARTS.names,
    ...SEND_PARTS.names,
  ];

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'files-name'];
  }

  static override properties: PropertyDeclarations = {
    value: { type: String },
    label: { type: String },
    placeholder: { type: String },
    layout: { type: String, reflect: true },
    minRows: { type: Number, attribute: 'min-rows' },
    maxRows: { type: Number, attribute: 'max-rows' },
    maxLength: { type: Number, attribute: 'max-length' },
    counter: { type: Boolean },
    sendKey: { type: String, attribute: 'send-key' },
    attachments: { type: String, reflect: true },
    attachmentForm: { type: String, attribute: 'attachment-form' },
    multiple: { attribute: 'multiple', converter: DEFAULT_TRUE },
    accept: { converter: acceptConverter },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    sending: { type: Boolean, reflect: true },
    stoppable: { type: Boolean },
    blocked: { type: Boolean },
    keepAfterSend: { type: Boolean, attribute: 'keep-after-send' },
    disabled: { type: Boolean, reflect: true },
    error: { type: Boolean, reflect: true },
    sendLabel: { type: String, attribute: 'send-label' },
    stopLabel: { type: String, attribute: 'stop-label' },
    attachLabel: { type: String, attribute: 'attach-label' },
    removeLabel: { type: String, attribute: 'remove-label' },
    retryLabel: { type: String, attribute: 'retry-label' },
    typeErrorText: { type: String, attribute: 'type-error-text' },
    sizeErrorText: { type: String, attribute: 'size-error-text' },
    countErrorText: { type: String, attribute: 'count-error-text' },
    announcement: { type: String },
    name: { type: String, reflect: true },
    typing: { state: true },
    receiving: { state: true },
    narrow: { state: true },
    count: { state: true },
    formDisabled: { state: true },
  };

  /** @from tanrei-embedded-text-input.value */
  // W5: the value is the typing area's at every moment — what was last set here until the typing area has taken it,
  // and from then on what it holds, so that `event.target.value` is the new text in every listener of `input`.
  get value(): string {
    if (this.pending) return this.given;
    return this.input?.value ?? this.given;
  }

  set value(value: string) {
    const text = value === null || value === undefined ? '' : String(value);
    const input = this.input;
    if (!this.pending && input && input.value === text) return;
    this.given = text;
    this.pending = true;
  }

  /** @from tanrei-embedded-text-input.label */
  label = '';

  /** @from tanrei-embedded-text-input.placeholder */
  placeholder = '';

  /** Where the actions stand in the capsule. `inline` (the default, and every value it does not know): on the line being written — the attach button and the leading actions before the typing area, the counter, the trailing actions and the send button after it. `stacked`: the typing area and the send button on one line, and everything else in a row beneath them, inside the capsule. A capsule too narrow for inline is laid out stacked whatever this says; the number of lines never changes the layout. */
  layout: 'inline' | 'stacked' = 'inline';

  /** @from tanrei-embedded-text-input.minRows */
  minRows = 1;

  /** The most lines the typing area grows to before it scrolls inside itself (`max-rows`). Given to the embedded text input as its `maxRows`, with a default of the chat composer's own: six lines. 0 sets no limit. */
  maxRows = 6;

  /** The most user-perceived characters a message may hold (`max-length`); 0 is no limit. It refuses no edit and shortens no paste: text beyond it stays, is marked, and stops sending until the person has cut it. */
  maxLength = 0;

  /** Draws the number of characters, and `maxLength` where one is set, before the trailing actions. */
  counter = false;

  /** What Enter does on a hardware keyboard (`send-key`). `enter` (the default, and every value it does not know): Enter sends and Shift+Enter begins a new line. `modifier`: Enter begins a new line and Ctrl+Enter or Command+Enter sends. Ctrl+Enter and Command+Enter send under both. */
  sendKey: 'enter' | 'modifier' = 'enter';

  /** Whether files can be attached, and who holds them. `none` (the default, and every value it does not know): text alone. `own`: the chat composer keeps the files a person attached and draws a File item for each, and `send` carries them. `given`: the product gives the File items as children and the chat composer lays them out and keeps no file. */
  attachments: 'none' | 'own' | 'given' = 'none';

  /** The form of the File items the chat composer draws itself, while `attachments` is `own` (`attachment-form`). `auto` (the default, and every value it does not know): a tile with its picture for an image, a row for every other file. `tile`: every file a tile. `row`: every file a row, and no picture. A refused file is a row under every value. */
  attachmentForm: 'auto' | 'tile' | 'row' = 'auto';

  /** Whether more than one file can be attached. Given to the file picker as its `multiple`; the default is true (`multiple="false"` says false). */
  multiple = true;

  /** @from tanrei-file-picker.accept */
  accept: string[] = [];

  /** @from tanrei-file-picker.maxSize */
  maxSize: number | null = null;

  /** @from tanrei-file-picker.maxFiles */
  maxFiles: number | null = null;

  /** What was sent is on its way, or its answer is still arriving: the product's to set and to clear. While it is set nothing more can be sent; the typing area stays open. */
  sending = false;

  /** While `sending` is set, puts a stop button in the send button's place, which asks the product to stop what is under way (`stop`). Ignored while `sending` is not set. */
  stoppable = false;

  /** The product's own reason that nothing can be sent now. The send button is disabled and the send key sends nothing; the product says why in its own words. */
  blocked = false;

  /** Keeps the text and the attachments after `send` (`keep-after-send`), for a product that clears them itself (`clear()`) once it knows the message arrived. */
  keepAfterSend = false;

  /** Nothing can be written, attached, removed or sent: every member and every Button in a slot is disabled. Inside a Field, disable the Field. */
  disabled = false;

  /** Draws the capsule in its error condition and exposes the typing area as invalid. A Field sets it with its own error. It does not stop sending by itself: `blocked` does. */
  error = false;

  /** The accessible name of the send button the chat composer brings (`send-label`): this instance's words, else the product's (`setWords({ sendLabel })`). Tanrei has none: without them the button is drawn and works, and has no name. */
  sendLabel = '';

  /** The accessible name of the stop button the chat composer brings (`stop-label`): this instance's words, else the product's (`setWords({ stopLabel })`). */
  stopLabel = '';

  /** The accessible name of the attach button the chat composer brings (`attach-label`): this instance's words, else the product's (`setWords({ attachLabel })`). */
  attachLabel = '';

  /** @from tanrei-file-item.removeLabel */
  removeLabel = '';

  /** @from tanrei-file-item.retryLabel */
  retryLabel = '';

  /** While `attachments` is `own`: the sentence on the File item of a file refused for its kind (`type-error-text`): this instance's words, else the product's (`setWords({ fileTypeErrorText })`). */
  typeErrorText = '';

  /** While `attachments` is `own`: the sentence on the File item of a file refused for its size (`size-error-text`): this instance's words, else the product's (`setWords({ fileSizeErrorText })`). */
  sizeErrorText = '';

  /** While `attachments` is `own`: the sentence on the File item of a file refused because no more can be added (`count-error-text`): this instance's words, else the product's (`setWords({ fileCountErrorText })`). */
  countErrorText = '';

  /** A message assistive technology hears through the one live region when the product sets or changes it. Not drawn. */
  announcement = '';

  /** Web only: the name the text is submitted under. */
  name = '';

  /** CCM-42: the typing area has focus. */
  protected typing = false;
  /** CCM-23: files are dragged over the capsule. */
  protected receiving = false;
  /** CCM-4: the capsule is narrower than `layout.inline-min-width`. */
  protected narrow = false;
  /** CCM-43: how many File items the product gave. */
  protected count = 0;
  /** Set by an ancestor `<fieldset disabled>`, or by the element's own attribute (`formDisabledCallback`). */
  protected formDisabled = false;

  private readonly internals = this.attachInternals();

  /** CCM-31: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** CCM-6: the variant of the send button it brings is a choice the active design system makes; a system switch draws it again. */
  private readonly system = new SystemWatchController(this);

  /** CCM-28: what a field around the chat composer gives it (src/primitives/field.ts): the name while it has no `label` of its own, the description, the invalid and the disabled state. The chat composer is the field's one control. */
  private readonly field = new FieldControlController(this, { errorCondition: true, named: () => !!this.label.trim() });

  /**
   * CCM-28: the file picker inside asks as every control does, and the chat composer answers it in a field's place —
   * `disabled` alone — so that its question does not reach a field around the chat composer as a second control.
   */
  private readonly provider = new FieldProviderController(this, {
    controls: () => (this.picker ? [this.picker] : []),
    state: (): FieldState => ({ label: '', description: '', invalid: false, required: false, requiredText: '', disabled: this.isDisabled }),
    plain: () => null,
  });

  /** W5: the value last set on the element, while the typing area has not taken it. */
  private given = '';
  private pending = false;
  /** CCM-22: the files it keeps while `attachments` is `own`, in order — handles, never read (CCM-40). */
  private kept: Own[] = [];
  /** CCM-22: the files the last arrival refused, in the order they were refused. Not kept. */
  private refused: Own[] = [];
  /** What the file picker's two events of one arrival said, until the arrival is over. */
  private arriving: { accepted: File[]; refused: TanreiChatComposerRefused[] } = { accepted: [], refused: [] };
  /** CCM-9: what it last said of whether it can be sent; undefined until it was first drawn. */
  private said: string | undefined;
  /** CCM-30: what each File item last said; one not in it is new. */
  private readonly known = new Map<Element, Known>();
  /** CCM-30: the chat composer has been presented: a File item that comes now was added. */
  private presented = false;
  /** CCM-30: the product's own sentence, set or changed in this turn; what the arrivals of this turn say. */
  private own: string | null = null;
  private arrived: string[] = [];
  /** CCM-38: the next message says no File item: the ones that are there came by a change of `attachments`. */
  private hush = false;
  private turn: ReturnType<typeof setTimeout> | undefined;
  /** CCM-25: the File item focus is on, as the last `focusin` said, and the items as they stood. */
  private held: Element | null = null;
  private stood: Element[] = [];
  /** CCM-23: the drags that entered and have not left. */
  private drags = 0;
  /** CCM-17: focus was on the button in the send button's place when the update began. */
  private sendHeld = false;
  /** CCM-4: focus was on a Button the layout is about to draw again. */
  private startHeld = false;
  /** CCM-41: one line of the typing area's text, as its native element computes it, and the rule that is written from it. */
  private line = '';
  private readonly sheet = typeof CSSStyleSheet === 'undefined' ? null : new CSSStyleSheet();
  private sizes: ResizeObserver | undefined;
  private watched: Element[] = [];
  /** What the product's own Buttons in the slots were given, to take back (CCM-10, CCM-26). */
  private readonly lent = new Set<Element>();

  /**
   * The re-read of the product's File items (`readItems()`), once per turn however many items said they changed in it:
   * a chat composer of N items built, or N items changed at once, re-reads its N items once — not once per item, which
   * made the build O(N²). It runs in a microtask, before the next frame. What a handler decides from the items (whether
   * it can be sent, CCM-9) it reads from the items themselves, never from this re-read.
   */
  private readonly itemSyncs = new CoalescedSync(() => {
    if (this.isConnected) this.readItems();
  });

  /** CCM-43, CCM-25, CCM-3: a child that comes or goes — a File item, a Button in a slot — is drawn at once. */
  private readonly children$ = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.childrenChanged(records));

  constructor() {
    super();
    this.addEventListener(FILE_ITEM_UPDATE, this.onItemUpdate);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('dragenter', this.onDragEnter);
    this.addEventListener('dragover', this.onDragOver);
    this.addEventListener('dragleave', this.onDragLeave);
    this.addEventListener('drop', this.onDrop);
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** CCM-5: its one embedded text input, once rendered. */
  private get input(): TanreiEmbeddedTextInput | null {
    return this.renderRoot?.querySelector<TanreiEmbeddedTextInput>('tanrei-embedded-text-input') ?? null;
  }

  /** CCM-7: its one file picker, while `attachments` is not none. */
  private get picker(): TanreiFilePicker | null {
    return this.renderRoot?.querySelector<TanreiFilePicker>('tanrei-file-picker') ?? null;
  }

  private get capsule(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.capsule') ?? null;
  }

  /** W7: focus is the typing area's (CCM-5). */
  protected override get control(): HTMLElement | null {
    return this.input;
  }

  /** Disabled by its own `disabled`, by a field around it, or by its form (CCM-26, CCM-28, CCM-36). */
  private get isDisabled(): boolean {
    // The platform's word arrives a turn after the element's own `disabled` was unset (src/primitives/form-disabled.ts):
    // until then it is the platform's present answer that is read, so that nothing is said twice (CCM-9).
    return this.disabled || this.field.disabled || (this.formDisabled && this.matches(':disabled'));
  }

  /** CCM-18, CCM-27, CCM-28: the capsule is in its error condition, and the typing area is invalid — by `error`, by a field's, or over the limit. */
  private get isError(): boolean {
    return this.error || this.field.invalid || this.over;
  }

  /** CCM-38: who holds the files; a value it does not know is none. */
  private get attaches(): TanreiChatComposerAttachments {
    return this.attachments === 'own' || this.attachments === 'given' ? this.attachments : 'none';
  }

  /** CCM-29: the group's name, and the typing area's — its own label, else the field's. */
  private get groupName(): string {
    return this.field.name(this.label).trim();
  }

  /** CCM-18: the limit, where one is set. */
  private get lengthLimit(): number {
    return typeof this.maxLength === 'number' && Number.isFinite(this.maxLength) && this.maxLength > 0 ? this.maxLength : 0;
  }

  /** CCM-18: the count is over the limit. */
  private get over(): boolean {
    const most = this.lengthLimit;
    return most > 0 && graphemes(this.value) > most;
  }

  /** CCM-19: the counter is drawn. */
  private get counts(): boolean {
    return this.counter && !this.isDisabled;
  }

  /** CCM-19: what the counter shows — the count, then a slash and the limit where one is set. */
  private get counterText(): string {
    const most = this.lengthLimit;
    return `${graphemes(this.value)}${most ? `/${most}` : ''}`;
  }

  /** The elements the product placed in a named slot. */
  private slotted(name: SlotName): HTMLElement[] {
    return [...this.children].filter((child): child is HTMLElement => child.slot === name);
  }

  /** CCM-21, CCM-43: the File items the product gave, in the order it gave them — and none unless `attachments` is `given`. */
  private get givenItems(): Item[] {
    return this.attaches === 'given' ? this.itemChildren : [];
  }

  /** The `tanrei-file-item` children the product wrote, whatever `attachments` says. */
  private get itemChildren(): Item[] {
    return [...this.children].filter((child) => child.localName === ITEM && !child.slot);
  }

  /** The File items it drew itself, in the order they are drawn. */
  private get ownItems(): Item[] {
    return [...(this.renderRoot?.querySelectorAll<HTMLElement>(`.strip > ${ITEM}`) ?? [])];
  }

  /** CCM-7: the attach button is drawn. */
  private get attachShown(): boolean {
    return this.attaches !== 'none';
  }

  /** CCM-3: the row beneath would hold something — the attach button, a Button in either slot, or the counter. */
  private get rowHolds(): boolean {
    return this.attachShown || this.slotted('leading').length > 0 || this.slotted('trailing').length > 0 || this.counts;
  }

  /** CCM-3, CCM-4: it is laid out stacked — by `layout`, or because the capsule is too narrow for inline — and has something for the row beneath. */
  private get stacked(): boolean {
    return (this.layout === 'stacked' || this.narrow) && this.rowHolds;
  }

  /** CCM-12: what the embedded text input's Enter does; a value of `sendKey` it does not know is enter. */
  private get enterKey(): 'action' | 'line-break' {
    return this.sendKey === 'modifier' ? 'line-break' : 'action';
  }

  /** CCM-5: the most lines of the typing area — 0, or a number of at least its fewest. */
  private get mostRows(): number {
    const least = typeof this.minRows === 'number' && Number.isFinite(this.minRows) && this.minRows >= 1 ? this.minRows : 1;
    if (this.maxRows === 0) return 0;
    return typeof this.maxRows === 'number' && Number.isFinite(this.maxRows) && this.maxRows >= least ? this.maxRows : least;
  }

  /** CCM-19, CCM-28: the typing area's description — what the counter shows first, and the field's shown text last. */
  private get description(): string {
    return [this.counts ? this.counterText : '', this.field.description()].filter(Boolean).join(' ');
  }

  /** CCM-22: the room `maxFiles` leaves, which is what the file picker is given while the chat composer keeps the files. */
  private get room(): number | null {
    if (this.attaches !== 'own' || !this.multiple) return this.maxFiles;
    const most = limit(this.maxFiles);
    return most === null ? this.maxFiles : Math.max(0, Math.floor(most) - this.kept.length);
  }

  // ─── Whether it can be sent (CCM-9) ───────────────────────────────────────────────────────────────────────────

  /** CCM-9: each reason what it holds cannot be sent, by name; none while it can. */
  private reasons(): TanreiChatComposerReason[] {
    const reasons: TanreiChatComposerReason[] = [];
    if (this.isDisabled) reasons.push('disabled');
    if (this.sending) reasons.push('sending');
    if (this.blocked) reasons.push('blocked');
    const items = this.givenItems;
    const carried = this.attaches === 'own' ? this.kept.length : items.filter((item) => itemStatus(item) !== 'error').length;
    if (!/\S/.test(this.value) && carried === 0) reasons.push('empty');
    if (this.over) reasons.push('length');
    if (items.some((item) => itemStatus(item) === 'uploading')) reasons.push('uploading');
    if (items.some((item) => itemStatus(item) === 'error' && itemRetryable(item))) reasons.push('failed');
    return reasons;
  }

  /** Whether what it holds can be sent now, read-only: what the last `sendablechange` said. */
  get sendable(): boolean {
    return this.reasons().length === 0;
  }

  /** CCM-9: the answer or the reasons changed — said once, and never when it is first drawn. */
  private tellSendable() {
    const reasons = this.reasons();
    const key = reasons.join(',');
    const first = this.said === undefined;
    if (key === this.said) return;
    this.said = key;
    if (first) return;
    this.dispatchEvent(new CustomEvent<TanreiChatComposerSendableDetail>('sendablechange', { bubbles: true, composed: true, detail: { sendable: reasons.length === 0, reasons } }));
  }

  // ─── Sending (CCM-11 to CCM-17) ───────────────────────────────────────────────────────────────────────────────

  /**
   * CCM-11: a request to send — by the send button (`key` false) or by the keyboard. While it can be sent: `send`,
   * once, with the text exactly as it stands and the attachments in the order of the strip; then, in a form, the
   * form's submission (CCM-36), and outside one the emptying (CCM-15); then focus in the typing area (CCM-16). While
   * it cannot: nothing — but `sendblocked` for a request by the keyboard that a reason other than empty holds back (CCM-14).
   */
  private requestSend(key: boolean) {
    const reasons = this.reasons();
    if (reasons.length) {
      if (key && !reasons.includes('disabled') && reasons.some((reason) => reason !== 'empty')) {
        this.dispatchEvent(new CustomEvent<TanreiChatComposerSendableDetail>('sendblocked', { bubbles: true, composed: true, detail: { sendable: false, reasons } }));
      }
      return;
    }
    const attachments = this.attaches === 'own' ? this.files : this.givenItems.filter((item) => itemStatus(item) !== 'error').map((item) => itemText(item, 'value', 'value'));
    const proceed = this.dispatchEvent(new CustomEvent<TanreiChatComposerSendDetail>('send', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value, attachments } }));
    const form = this.internals.form;
    if (proceed && form) {
      // CCM-36: as a submit button of the platform's own does — the form's validation, then its submit event. In a
      // form it does not empty itself, whatever keepAfterSend says.
      this.syncForm();
      form.requestSubmit();
    } else if (proceed && !this.keepAfterSend) this.empty();
    // CCM-16: the next message can be written at once.
    if (!this.isDisabled) this.input?.focus();
  }

  /** CCM-15: empties itself — the text, every file it keeps and every File item it drew. Emits nothing. */
  private empty() {
    this.value = '';
    if (this.kept.length || this.refused.length) {
      this.kept = [];
      this.refused = [];
    }
    this.arrived = [];
    this.requestUpdate();
  }

  /**
   * CCM-15: empties the chat composer as it empties itself after `send` — the text, every file it keeps and every File
   * item it drew — for a product that set `keep-after-send` and now knows the message arrived. Emits nothing and
   * announces nothing. The product's own File items (`attachments="given"`) are the product's to remove.
   */
  clear(): void {
    this.empty();
  }

  private readonly onSend = (event: Event) => {
    // A click of the product's own Button in the slot, or of the one it brings.
    if (this.isDisabled || (event.target as { disabled?: unknown } | null)?.disabled === true) return;
    this.requestSend(false);
  };

  /** CCM-17: the stop button asks the product to stop, and changes nothing itself. */
  private readonly onStop = () => {
    if (this.isDisabled || !(this.sending && this.stoppable)) return;
    this.dispatchEvent(new CustomEvent('stop', { bubbles: true, composed: true }));
  };

  // ─── The typing area (CCM-5, CCM-12, CCM-42) ──────────────────────────────────────────────────────────────────

  /** The person changed the text: the event leaves as it is (W5); the counter, the limit and what can be sent follow. */
  private readonly onInput = () => {
    this.requestUpdate();
  };

  /** CCM-12: the embedded text input's action is a request to send. The event itself does not leave the element. */
  private readonly onAction = (event: Event) => {
    event.stopPropagation();
    this.requestSend(true);
  };

  /** W5: the embedded text input's `change` and `rowschange` are not events of the chat composer. */
  private readonly stop = (event: Event) => event.stopPropagation();

  /** CCM-42: the capsule's edge is the focus indication of the typing area, however its focus was given. */
  private readonly onTypingFocus = () => {
    syncFocusStyle(this, this.capsule);
    this.typing = true;
  };

  private readonly onTypingBlur = () => {
    this.typing = false;
  };

  /**
   * CCM-24: a paste into the typing area that holds files and no plain text is an arrival, and inserts nothing; one
   * that holds text is the typing area's.
   */
  private readonly onPaste = (event: ClipboardEvent) => {
    const data = event.clipboardData;
    if (this.attaches === 'none' || this.isDisabled || !data) return;
    const files = [...(data.files ?? [])];
    if (!files.length || data.getData('text/plain')) return;
    event.preventDefault();
    this.take(files);
  };

  /**
   * CCM-5: a press on the capsule's own ground — its padding, the room beside a short text, the gaps of the strip — is
   * passed on to the typing area, which takes focus with the caret at the nearest point of its text (ETI-12). A press
   * on a Button, a File item or the counter is not. The press's default is prevented, so that focus is not taken away
   * again; the capsule shows no pressed state.
   */
  private readonly onGround = (event: MouseEvent) => {
    if (this.isDisabled || event.button !== 0) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || target.getRootNode() !== this.renderRoot) return;
    // An element of its own tree that is a member, or the counter, is not ground.
    if (target.localName.includes('-') || target.closest('.counter, .announce')) return;
    event.preventDefault();
    this.input?.focusAt(event.clientX, event.clientY);
  };

  // ─── Files that arrive (CCM-21 to CCM-24) ─────────────────────────────────────────────────────────────────────

  /** The file picker's `select` and `reject` are answered here and do not leave the element as they are. */
  private readonly onPickerSelect = (event: Event) => {
    event.stopPropagation();
    this.arriving.accepted = [...(event as CustomEvent<TanreiFilePickerSelectDetail>).detail.files];
  };

  private readonly onPickerReject = (event: Event) => {
    event.stopPropagation();
    this.arriving.refused = [...(event as CustomEvent<TanreiFilePickerRejectDetail>).detail.files];
  };

  /** The browser's picker closed with a choice: one arrival, told once. CCM-25: with a file kept or handed over, focus goes to the typing area. */
  private readonly onArrival = (event: Event) => {
    event.stopPropagation();
    const { accepted, refused } = this.arriving;
    this.arriving = { accepted: [], refused: [] };
    if (this.isDisabled || (!accepted.length && !refused.length)) return;
    if (this.arrive(accepted, refused, true)) this.input?.focus();
  };

  /** CCM-23, CCM-24: files that came another way — dropped, pasted — are judged by the file picker as a choice is (FPK-31). */
  private take(files: readonly File[]) {
    const picker = this.judge();
    const { accepted, refused } = picker.judge(files);
    this.arrive(accepted, refused, true);
  }

  /** The file picker that judges by what the chat composer says now — its own, or, before it was first drawn, one that is nowhere and judges by the same props. */
  private judge(): TanreiFilePicker {
    const picker = this.picker ?? (document.createElement('tanrei-file-picker') as TanreiFilePicker);
    picker.multiple = this.multiple;
    picker.accept = this.accept;
    picker.maxSize = this.maxSize;
    picker.maxFiles = this.room;
    return picker;
  }

  /**
   * One arrival, judged. CCM-21: while `attachments` is `given` nothing is kept — `select`, then `reject`, and the
   * product gives back a File item for each file it keeps. CCM-22: while it is `own` the File items of what an earlier
   * arrival refused leave; a file that passed and that it already keeps is passed over; with `multiple` the rest is
   * kept after the others, each one beyond the room `maxFiles` leaves refused for the count, and without it a file
   * that passed takes the place of the one kept. Then, for what a person did (`person`): `select`, `reject`,
   * `attachmentschange`, each once and only where it applies. Answers whether a file was kept or handed over.
   */
  private arrive(accepted: readonly File[], refusedByPicker: readonly TanreiChatComposerRefused[], person: boolean): boolean {
    if (this.attaches === 'given') {
      if (accepted.length) this.dispatchEvent(new CustomEvent<TanreiChatComposerSelectDetail>('select', { bubbles: true, composed: true, detail: { files: [...accepted] } }));
      if (refusedByPicker.length) this.dispatchEvent(new CustomEvent<TanreiChatComposerRejectDetail>('reject', { bubbles: true, composed: true, detail: { files: [...refusedByPicker] } }));
      return accepted.length > 0;
    }
    if (this.attaches !== 'own') return false;
    const before = this.kept;
    const fresh: File[] = [];
    for (const file of accepted) {
      if (before.some((own) => sameFile(own.file, file)) || fresh.some((other) => sameFile(other, file))) continue;
      fresh.push(file);
    }
    const most = this.multiple ? limit(this.maxFiles) : null;
    const left = most === null ? fresh.length : Math.max(0, Math.floor(most) - before.length);
    const passed = fresh.slice(0, left);
    const refused = [...refusedByPicker, ...fresh.slice(left).map((file) => ({ file, reason: 'count' as const }))];
    const added = passed.map((file): Own => ({ file, reason: null }));
    const kept = !added.length ? before : this.multiple ? [...before, ...added] : added;
    this.redraw(() => {
      this.kept = kept;
      this.refused = refused.map(({ file, reason }): Own => ({ file, reason }));
    });
    // CCM-30: one message for the arrival — the names are the files' own and the sentences the product's.
    this.arrived.push(...passed.map((file) => file.name), ...refused.map(({ file, reason }) => [file.name, this.sentence(reason)].map((text) => text.trim()).filter(Boolean).join(', ')));
    if (this.arrived.length) this.changed();
    if (person && !this.isDisabled) {
      if (passed.length) this.dispatchEvent(new CustomEvent<TanreiChatComposerSelectDetail>('select', { bubbles: true, composed: true, detail: { files: passed } }));
      if (refused.length) this.dispatchEvent(new CustomEvent<TanreiChatComposerRejectDetail>('reject', { bubbles: true, composed: true, detail: { files: refused } }));
      if (kept !== before) this.emitAttachments();
    }
    return passed.length > 0;
  }

  /** CCM-22: the files it keeps changed by what a person did. */
  private emitAttachments() {
    if (this.isDisabled) return;
    this.dispatchEvent(new CustomEvent<TanreiChatComposerAttachmentsChangeDetail>('attachmentschange', { bubbles: true, composed: true, detail: { files: this.files } }));
  }

  /** CCM-22, CCM-31: the product's sentence for a reason — the instance's prop, else the product's words, else nothing. */
  private sentence(reason: TanreiChatComposerRejectReason): string {
    return reason === 'type' ? this.words.get('fileTypeErrorText', this.typeErrorText) : reason === 'size' ? this.words.get('fileSizeErrorText', this.sizeErrorText) : this.words.get('fileCountErrorText', this.countErrorText);
  }

  /**
   * CCM-22: the files it keeps while `attachments` is `own`, in order, as the browser's own `File` handles: a new array
   * on each read. Never a refused file. Empty while `attachments` is `given` or `none`.
   */
  get files(): File[] {
    return this.attaches === 'own' ? this.kept.map((own) => own.file) : [];
  }

  /**
   * CCM-22: hands files over, as a product does whose own action in a slot makes a file — a photograph, a recording.
   * They are judged by its file picker (FPK-31) and are then an arrival: kept or refused, drawn and announced as a
   * choice is, with no event. Answers with the refused files and their reasons. While `attachments` is not `own` it
   * does nothing and is reported.
   */
  addFiles(files: Iterable<File>): TanreiChatComposerRefused[] {
    if (this.attaches !== 'own') {
      report(this, 'CCM-22', `addFiles() was called while attachments is "${String(this.attachments)}": the chat composer keeps files only while it is "own", and nothing was added`);
      return [];
    }
    const given = typeof File === 'undefined' ? [] : [...(files ?? [])].filter((file): file is File => file instanceof File);
    if (!given.length) return [];
    const { accepted, refused } = this.judge().judge(given);
    this.arrive(accepted, refused, false);
    return this.refused.map(({ file, reason }) => ({ file, reason: reason! }));
  }

  // ─── A drag over the capsule (CCM-23) ─────────────────────────────────────────────────────────────────────────

  /** A drag that holds a file, while files can be attached. */
  private drops(event: DragEvent): boolean {
    return this.attaches !== 'none' && !this.isDisabled && [...(event.dataTransfer?.types ?? [])].includes('Files');
  }

  private readonly onDragEnter = (event: DragEvent) => {
    if (!this.drops(event)) return;
    event.preventDefault();
    this.drags += 1;
    this.receiving = true;
  };

  private readonly onDragOver = (event: DragEvent) => {
    if (!this.drops(event)) return;
    // Taken, so that the browser neither opens the file nor navigates to it.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.receiving = true;
  };

  private readonly onDragLeave = (event: DragEvent) => {
    if (!this.receiving) return;
    this.drags = Math.max(0, this.drags - 1);
    // The last of them left — or the drag left the element altogether.
    const to = event.relatedTarget;
    if (this.drags === 0 || (to instanceof Node && !this.contains(to) && !this.renderRoot.contains(to))) this.endDrag();
  };

  private readonly onDrop = (event: DragEvent) => {
    if (!this.drops(event)) {
      this.endDrag();
      return;
    }
    event.preventDefault();
    this.endDrag();
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length) this.take(files);
  };

  private endDrag() {
    this.drags = 0;
    this.receiving = false;
  }

  // ─── The File items (CCM-20, CCM-25, CCM-30, CCM-43) ──────────────────────────────────────────────────────────

  /** CCM-20, CCM-26, CCM-29: what every File item it holds is given, through the internal channel: the names of its two actions, whether it is disabled, and that it is an item of the strip's list. */
  private gift(made: boolean): FileItemGiven {
    return {
      ...(this.removeLabel ? { removeLabel: this.removeLabel } : {}),
      ...(this.retryLabel ? { retryLabel: this.retryLabel } : {}),
      disabled: this.isDisabled,
      listItem: true,
      ...(made ? { made: true } : {}),
    };
  }

  private tellItems() {
    const own = this.attaches === 'own';
    for (const item of this.ownItems) giveFileItem(item, this.gift(true));
    // A child it does not draw is given nothing.
    for (const item of this.itemChildren) giveFileItem(item, own || this.attaches === 'none' ? null : this.gift(false));
  }

  /**
   * Changes the files it keeps and draws their File items at once, so that what is emitted afterwards is emitted with
   * the strip as it will be. CCM-25: where an item that leaves held focus, focus goes to the remove action of the item
   * that followed it, or of the one before where none follows, or to the typing area where none is left.
   */
  private redraw(change: () => void) {
    const order = [...this.kept, ...this.refused];
    const active = this.shadowRoot?.activeElement ?? null;
    const at = active ? this.ownItems.indexOf(active as HTMLElement) : -1;
    const held = at >= 0 ? order[at] : undefined;
    change();
    this.requestUpdate();
    if (!this.hasUpdated || !this.isConnected) return;
    this.performUpdate();
    const now = [...this.kept, ...this.refused];
    if (!held || now.includes(held)) return;
    const next = [...order.slice(at + 1), ...order.slice(0, at).reverse()].find((own) => now.includes(own));
    const target = next ? this.ownItems[now.indexOf(next)] : undefined;
    if (!target || !takeFocus(target)) this.input?.focus();
  }

  /** CCM-22: the remove action of a File item it drew removes the item, at once; a kept file is let go and `attachmentschange` is emitted. The item's own `remove` does not leave the element: it is an event of the product's items. */
  private removeOwn(event: Event, own: Own) {
    event.stopPropagation();
    if (this.isDisabled) return;
    const kept = this.kept.includes(own);
    this.redraw(() => {
      this.kept = this.kept.filter((each) => each !== own);
      this.refused = this.refused.filter((each) => each !== own);
    });
    if (kept) this.emitAttachments();
  }

  private readonly onItemUpdate = (event: Event) => {
    if (event.target === this) return;
    event.stopPropagation();
    if (this.attaches !== 'given') return;
    this.itemSyncs.request();
  };

  /** The product's File items were added to, removed from, or changed: drawn at once, said once. */
  private readItems() {
    countWork('chat-composer.sync');
    const items = this.givenItems;
    this.count = items.length;
    this.tellItems();
    this.requestUpdate();
    this.changed();
  }

  private childrenChanged(records: MutationRecord[]) {
    this.adopt();
    for (const record of records) for (const node of record.removedNodes) if (node instanceof Element && node.localName === ITEM) giveFileItem(node, null);
    const before = this.stood;
    this.itemSyncs.now();
    this.stood = this.givenItems;
    this.afterLeave(before, records);
  }

  private itemOf(target: EventTarget | null): Element | null {
    return target instanceof Element && target.parentNode === this && target.localName === ITEM ? target : null;
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    this.held = this.itemOf(event.target);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const item = this.itemOf(event.target);
    if (!item) return;
    queueMicrotask(() => {
      if (this.held === item && item.parentNode === this && !holdsFocus(item)) this.held = null;
    });
  };

  /**
   * CCM-25: a File item the product gave left while focus was on one of its actions, and focus is now nowhere: it goes
   * to the remove action of the item that followed, or of the one before where none follows, or to the typing area
   * where no item is left. Where the product has already put focus somewhere, nothing is done.
   */
  private afterLeave(before: readonly Element[], records: MutationRecord[]) {
    const held = this.held;
    if (!held || !records.some((record) => [...record.removedNodes].includes(held))) return;
    const active = this.ownerDocument.activeElement;
    const nowhere = !active || active === this.ownerDocument.body || active === this.ownerDocument.documentElement;
    if (!nowhere || held.parentNode === this) {
      if (!holdsFocus(held)) this.held = null;
      return;
    }
    this.held = null;
    const here = (node: Element) => node.parentNode === this;
    const at = before.indexOf(held);
    const now = this.givenItems;
    const order = before.some(here) ? [...before.slice(at + 1), ...before.slice(0, Math.max(0, at)).reverse()] : [...now.slice(Math.max(0, at)), ...now.slice(0, Math.max(0, at)).reverse()];
    const candidates = order.filter(here) as Item[];
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
    // An item that was written a moment ago has no action to focus until it has rendered.
    const pending = candidates.map((candidate) => candidate.updateComplete).filter((promise) => !!promise);
    void Promise.all(pending).then(() => {
      const current = this.ownerDocument.activeElement;
      if (!this.isConnected || (current && current !== this.ownerDocument.body && current !== this.ownerDocument.documentElement)) return;
      if (!take()) this.input?.focus();
    });
  }

  /** CCM-30: something that may be said changed in this turn; everything of one turn is one message. */
  private changed() {
    if (this.turn !== undefined) return;
    this.turn = setTimeout(() => {
      this.turn = undefined;
      this.say();
    }, 0);
  }

  /**
   * CCM-30: the one message of a turn, in the product's words alone — its own sentence where it set one; while
   * `attachments` is `own`, what arrived; while it is `given`, each File item that was added after the chat composer
   * was first presented, finished or failed: its name, then its status text or its error text. Nothing of progress, and
   * nothing of the chat composer's own making.
   */
  private say() {
    const hush = this.hush;
    this.hush = false;
    const messages: string[] = this.attaches === 'own' && this.presented ? this.arrived : [];
    this.arrived = [];
    const items = this.givenItems;
    for (const item of items) {
      const now: Known = { status: itemStatus(item), errorText: itemText(item, 'errorText', 'error-text') };
      const was = this.known.get(item);
      const failed = now.status === 'error';
      const said = !was ? this.presented && !hush : (now.status === 'done' && was.status !== 'done') || (failed && (was.status !== 'error' || was.errorText !== now.errorText));
      if (said) messages.push([itemText(item, 'name', 'name'), failed ? now.errorText : itemText(item, 'statusText', 'status-text')].map((text) => text.trim()).filter(Boolean).join(', '));
      this.known.set(item, now);
    }
    for (const item of [...this.known.keys()]) if (!items.includes(item)) this.known.delete(item);
    const first = !this.presented;
    this.presented = true;
    const own = this.own;
    this.own = null;
    if (first) this.check();
    const region = this.renderRoot?.querySelector('.announce');
    const lines = [...(own ? [own] : []), ...messages.filter(Boolean)];
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

  // ─── Form (CCM-36, CCM-40) ────────────────────────────────────────────────────────────────────────────────────

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** CCM-36: a reset empties it, and emits nothing. */
  formResetCallback() {
    this.empty();
  }

  /** CCM-40: the text is restored with the page; it begins with no file. */
  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? state : '';
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    super.attributeChangedCallback(name, old, value);
    if (name === 'files-name' && old !== value) this.requestUpdate();
  }

  /** CCM-36: the text under its name and, while it keeps its own files, each of them under the name given for its files — nothing while disabled. The text is what a restored page gives back. */
  private syncForm() {
    const value = this.value;
    if (this.isDisabled) {
      this.internals.setFormValue(null, value);
      return;
    }
    const data = new FormData();
    if (this.name) data.append(this.name, value);
    const filesName = this.getAttribute('files-name');
    if (filesName && this.attaches === 'own') for (const { file } of this.kept) data.append(filesName, file, file.name);
    this.internals.setFormValue(data, value);
  }

  // ─── Without script (CCM-37) ──────────────────────────────────────────────────────────────────────────────────

  /**
   * CCM-37: the platform's own text area and submit button that the product wrote as children are the form until the
   * element is defined. Now the text area's text is the value while its own is empty, and each is taken out of what
   * is drawn, focused, read and submitted.
   */
  private adopt() {
    for (const child of this.children) {
      if (child.slot || child.hasAttribute('data-tanrei-adopted')) continue;
      if (!(child instanceof HTMLTextAreaElement || child instanceof HTMLButtonElement || child instanceof HTMLInputElement)) continue;
      child.setAttribute('data-tanrei-adopted', '');
      if (child instanceof HTMLTextAreaElement && !this.value && child.value) this.value = child.value;
      child.hidden = true;
      child.disabled = true;
    }
  }

  // ─── What it measures (CCM-4, CCM-41) ─────────────────────────────────────────────────────────────────────────

  /**
   * CCM-41: one line of the typing area's text — the member's computed line height, never its token — from which the
   * capsule's corners and the least height of its groups are written, as a rule of the element's own. CCM-4: whether
   * the capsule is narrower than `layout.inline-min-width`, by its own width.
   */
  private measure() {
    const capsule = this.capsule;
    if (!capsule || !this.isConnected) return;
    const typed = this.input?.shadowRoot?.querySelector('[part~="input"]');
    const line = typed ? getComputedStyle(typed).lineHeight : '';
    if (/^[\d.]+px$/.test(line) && line !== this.line) {
      this.line = line;
      this.sheet?.replaceSync(measured(line));
    }
    const probe = capsule.querySelector('.probe');
    const [width, least] = [capsule.getBoundingClientRect().width, probe?.getBoundingClientRect().width ?? 0];
    const narrow = width > 0 && least > 0 && width < least - 0.01;
    if (narrow !== this.narrow) this.narrow = narrow;
  }

  private watch() {
    const next = [this.capsule, this.input].filter((element): element is HTMLElement => !!element);
    if (next.length === this.watched.length && next.every((element, index) => element === this.watched[index])) return;
    this.sizes?.disconnect();
    this.watched = next;
    if (typeof ResizeObserver === 'undefined') return;
    this.sizes ??= new ResizeObserver(() => this.measure());
    for (const element of next) this.sizes.observe(element);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    // The rule it writes from what it measures stands after its stylesheet, and in no cascade layer.
    if (this.sheet && root instanceof ShadowRoot && 'adoptedStyleSheets' in root) root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.sheet];
    return root;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.adopt();
    this.children$?.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'], subtree: false });
    this.stood = this.givenItems;
    this.count = this.stood.length;
    this.tellItems();
    // CCM-36: a control of its form from the moment it stands in it, before it first draws.
    this.syncForm();
    if (this.hasUpdated) this.watch();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$?.disconnect();
    this.sizes?.disconnect();
    this.watched = [];
    clearTimeout(this.turn);
    this.turn = undefined;
    this.held = null;
    this.arriving = { accepted: [], refused: [] };
    this.endDrag();
    for (const element of this.lent) takeBack(element);
    this.lent.clear();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // CCM-38: `attachments` changed while it is shown: every file it keeps is let go and every File item it drew
    // leaves, or the product's items are no longer drawn and it begins with no kept file. Nothing is emitted or said.
    if (changed.has('attachments') && this.hasUpdated) {
      this.kept = [];
      this.refused = [];
      this.arrived = [];
      this.held = null;
      this.stood = this.givenItems;
      this.count = this.stood.length;
      this.hush = true;
      this.endDrag();
      this.changed();
    }
    if (this.isDisabled && this.receiving) this.endDrag();
    // CCM-30: the product's sentence, when it is set to a text or changed — never the one it was first presented with.
    if (changed.has('announcement') && this.hasUpdated && this.announcement.trim()) {
      this.own = this.announcement;
      this.changed();
    }
    if (this.hasUpdated) {
      // CCM-17: the button in the send button's place may change with this update; CCM-4: so may where the attach button stands.
      const active = this.shadowRoot?.activeElement ?? null;
      this.sendHeld = (!!active && active.matches('.send > *')) || [...this.slotted('send'), ...this.slotted('stop')].some(holdsFocus);
      this.startHeld = !!active && active.matches(`tanrei-file-picker > ${BUTTON}`);
    }
  }

  protected override firstUpdated() {
    // CCM-30: the File items that are here now are the ones it was presented with.
    this.changed();
  }

  protected override updated(changed: PropertyValues<this>) {
    // W5: the render that has just ended gave the typing area what was set; from here the value is its own.
    this.pending = false;
    super.updated(changed);
    this.provider.sync();
    this.tellItems();
    this.lend();
    // CCM-6, CCM-17: the Button it brings in the send button's place takes the variant the system names.
    const variant = compChoice(this, `${PREFIX}-send-button-variant`, BUTTON_VARIANTS);
    giveVariant(this.renderRoot.querySelector(`.send > ${BUTTON}`), variant);
    this.keepFocus();
    this.syncForm();
    this.tellSendable();
    this.watch();
    if (!this.line) void this.input?.updateComplete.then(() => this.measure());
    if (this.presented) this.reports(changed);
  }

  /**
   * CCM-10, CCM-26: the product's own Buttons in the slots are disabled as their own `disabled` does — every one while
   * the chat composer is disabled, and the one in the send slot while nothing can be sent — and each gets back what it
   * had; one the product disabled itself is never enabled.
   */
  private lend() {
    const disabled = this.isDisabled;
    const now = new Map<Element, boolean>();
    for (const element of [...this.slotted('leading'), ...this.slotted('trailing'), ...this.slotted('stop')]) now.set(element, disabled);
    for (const element of this.slotted('send')) now.set(element, disabled || !this.sendable);
    for (const [element, off] of now) {
      giveAttributes(element, { disabled: off });
      this.lent.add(element);
    }
    for (const element of [...this.lent]) {
      if (now.has(element)) continue;
      takeBack(element);
      this.lent.delete(element);
    }
  }

  /**
   * CCM-17: the button in the send button's place changed while it had focus — focus stays on the button now there, or
   * goes to the typing area where that one is disabled. CCM-4: an attach button the layout drew again keeps its focus.
   */
  private keepFocus() {
    if (this.sendHeld) {
      this.sendHeld = false;
      const place = this.renderRoot.querySelector<HTMLElement>(`.send > ${BUTTON}`) ?? this.slotted(this.sending && this.stoppable ? 'stop' : 'send')[0] ?? null;
      // A Button that is disabled now gives its focus up a moment later: it is not waited for.
      const off = !place || (place as { disabled?: unknown }).disabled === true;
      if (off) {
        if (!this.isDisabled) this.input?.focus();
      } else if (!holdsFocus(place)) place.focus();
    }
    if (this.startHeld) {
      this.startHeld = false;
      const attach = this.renderRoot.querySelector<HTMLElement>(`tanrei-file-picker > ${BUTTON}`);
      if (attach && !holdsFocus(attach) && !this.shadowRoot?.activeElement) attach.focus();
    }
  }

  /** What a debug build is told about the content, once it has all been written: the chat composer still renders. */
  private check() {
    this.reports(new Map() as PropertyValues<this>, true);
  }

  private reports(changed: PropertyValues<this>, all = false) {
    const has = (name: keyof TanreiChatComposer) => all || changed.has(name);
    if (has('layout') && !LAYOUTS.includes(this.layout)) report(this, 'CCM-4', `layout "${String(this.layout)}" is not a layout of the chat composer; it is laid out as "inline"`);
    if (has('sendKey') && !SEND_KEYS.includes(this.sendKey)) report(this, 'CCM-12', `send-key "${String(this.sendKey)}" is not a value of sendKey; Enter sends, as with "enter"`);
    if (has('attachments') && !ATTACHMENTS.includes(this.attachments)) report(this, 'CCM-38', `attachments "${String(this.attachments)}" is not a way of holding attachments; none can be attached, as with "none"`);
    if (has('attachmentForm') && !FORMS.includes(this.attachmentForm)) report(this, 'CCM-44', `attachment-form "${String(this.attachmentForm)}" is not a form of the attachments; each file's form is chosen, as with "auto"`);
    // CCM-7: an element in the attach slot while nothing can be attached is not drawn.
    if (this.attaches === 'none' && this.slotted('attach').length) report(this, 'CCM-7', 'the attach slot holds an element while attachments is "none"; it is not drawn — say attachments="own" or "given"');
    // CCM-8: what a slot holds is laid out as it is; one that is not a Button is said.
    for (const name of ['leading', 'trailing'] as const) {
      const other = this.slotted(name).find((element) => element.localName !== BUTTON);
      if (other) report(this, 'CCM-8', `<${other.localName}> in the ${name} slot is not a tanrei-button; it is laid out in its place as it is`);
    }
    // CCM-31: a control that assistive technology cannot name is a functional failure.
    if (!this.groupName) report(this, 'CCM-31', 'label is empty and no field names the chat composer, so the group and its typing area have no accessible name; give it a label, or put it in a tanrei-field', { level: 'error' });
    const stop = this.sending && this.stoppable;
    if (!stop && !this.slotted('send').length && !this.words.get('sendLabel', this.sendLabel)) this.words.missing('sendLabel', { id: 'CCM-31', effect: 'the send button is drawn and works, and has no accessible name' });
    if (stop && !this.slotted('stop').length && !this.words.get('stopLabel', this.stopLabel)) this.words.missing('stopLabel', { id: 'CCM-31', effect: 'the stop button is drawn and works, and has no accessible name' });
    if (this.attachShown && !this.slotted('attach').length && !this.words.get('attachLabel', this.attachLabel)) this.words.missing('attachLabel', { id: 'CCM-31', effect: 'the attach button is drawn and works, and has no accessible name' });
    // CCM-22, CCM-31: a refused file's File item without the product's sentence for its reason is drawn with its mark and its name.
    for (const reason of ['type', 'size', 'count'] as const) {
      if (this.refused.some((own) => own.reason === reason) && !this.sentence(reason)) this.words.missing(REASON_WORDS[reason], { id: 'CCM-22', effect: `a file refused for its ${reason} is drawn as a failed row without a sentence that says why` });
    }
  }

  // ─── What it draws ────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * CCM-22, CCM-44: a File item it draws itself. A kept file is a pending File item given the file's handle — a tile
   * with its picture and no drawn name for an image (auto, tile), a tile for any file (tile), a row otherwise; a
   * refused one a failed row with the product's sentence, given no handle and never retryable. Neither is pressable.
   */
  private ownItem(own: Own) {
    const image = fileKind(own.file.type, own.file.name) === 'image';
    const tile = !own.reason && (this.attachmentForm === 'tile' || (this.attachmentForm !== 'row' && image));
    const pictured = tile && image;
    return html`<tanrei-file-item
      part="file-item"
      exportparts=${ITEM_PARTS.attribute}
      .file=${own.reason ? null : own.file}
      .name=${own.file.name}
      .mediaType=${own.file.type}
      .status=${own.reason ? 'error' : 'pending'}
      .errorText=${own.reason ? this.sentence(own.reason) : ''}
      .form=${tile ? 'tile' : 'row'}
      .preview=${pictured}
      .nameHidden=${pictured}
      @remove=${(event: Event) => this.removeOwn(event, own)}
      @retry=${this.stop}
      @click=${this.stop}
    ></tanrei-file-item>`;
  }

  /** CCM-7: its file picker around its trigger — the product's own Button in the attach slot, or the one it brings. */
  private attachPart(disabled: boolean): TemplateResult {
    const own = this.slotted('attach').length > 0;
    return html`<tanrei-file-picker
      part="file-picker"
      exportparts=${PICKER_PARTS.attribute}
      .multiple=${this.multiple}
      .accept=${this.accept}
      .maxSize=${this.maxSize}
      .maxFiles=${this.room}
      .disabled=${disabled}
      @select=${this.onPickerSelect}
      @reject=${this.onPickerReject}
      @tanrei-file-picker-arrival=${this.onArrival}
      >${own
        ? html`<slot name="attach" slot="trigger"></slot>`
        : html`<tanrei-button slot="trigger" part="button attach-button" exportparts=${ATTACH_PARTS.attribute} variant="text" .label=${this.words.get('attachLabel', this.attachLabel)}
            ><span slot="icon">${GLYPHS.attach}</span></tanrei-button
          >`}</tanrei-file-picker
    >`;
  }

  /** CCM-6, CCM-17: the send button — or, while a stoppable sending is under way, the stop button in its place: the product's own in its slot, or the one it brings. */
  private sendPart(disabled: boolean, sendable: boolean): TemplateResult {
    const stop = this.sending && this.stoppable;
    const name = stop ? 'stop' : 'send';
    if (this.slotted(name).length) return html`<slot name=${name} @click=${stop ? this.onStop : this.onSend}></slot>`;
    return html`<tanrei-button
      part=${stop ? 'button stop-button' : 'button send-button'}
      exportparts=${SEND_PARTS.attribute}
      .label=${stop ? this.words.get('stopLabel', this.stopLabel) : this.words.get('sendLabel', this.sendLabel)}
      .disabled=${stop ? disabled : !sendable}
      @click=${stop ? this.onStop : this.onSend}
      ><span slot="icon">${stop ? GLYPHS.stop : GLYPHS.send}</span></tanrei-button
    >`;
  }

  protected override render() {
    const attaches = this.attaches;
    const disabled = this.isDisabled;
    const sendable = this.sendable;
    const stacked = this.stacked;
    const name = this.groupName;
    const own = attaches === 'own';
    const items = own ? [...this.kept, ...this.refused] : [];
    const drawn = own ? items.length : attaches === 'given' ? this.count : 0;
    const hasStart = this.attachShown || this.slotted('leading').length > 0;
    const hasEnd = this.counts || this.slotted('trailing').length > 0;
    // CCM-2, CCM-3: what stands before the typing area, or at the start of the row beneath — and what stands after it, or at that row's end.
    const start = hasStart ? html`${this.attachShown ? this.attachPart(disabled) : nothing}<slot name="leading"></slot>` : nothing;
    const end = hasEnd
      ? html`<div class="group end">${this.counts ? html`<span part="counter" class="counter" ?data-over=${this.over}>${this.counterText}</span>` : nothing}<slot name="trailing"></slot></div>`
      : nothing;
    return html`
      <div
        part="container"
        class="capsule"
        role="group"
        ${delegatedAria(this, { 'aria-label': name, 'aria-busy': this.sending && 'true', 'aria-disabled': disabled && 'true' })}
        data-layout=${stacked ? 'stacked' : 'inline'}
        ?data-error=${this.isError}
        ?data-focused=${this.typing && !disabled}
        ?data-receiving=${this.receiving && !disabled}
        ?data-disabled=${disabled}
        @mousedown=${this.onGround}
      >
        <span class="outline"></span>
        <div part="strip" class="strip" role=${drawn ? 'list' : nothing} aria-label=${drawn && name ? name : nothing} ?hidden=${!drawn}>
          ${own ? repeat(items, (each) => each, (each) => this.ownItem(each)) : attaches === 'given' ? html`<slot></slot>` : nothing}
        </div>
        <div class="line" ?data-start=${!stacked && hasStart}>
          ${!stacked && hasStart ? html`<div class="group start">${start}</div>` : nothing}
          <div class="typing">
            <tanrei-embedded-text-input
              part="embedded-text-input"
              exportparts=${INPUT_PARTS.attribute}
              multiline
              .value=${this.value}
              .label=${name}
              .placeholder=${this.placeholder}
              .minRows=${this.minRows}
              .maxRows=${this.mostRows}
              .enterKey=${this.enterKey}
              .description=${this.description}
              .error=${this.isError}
              .disabled=${disabled}
              @input=${this.onInput}
              @action=${this.onAction}
              @change=${this.stop}
              @rowschange=${this.stop}
              @focusin=${this.onTypingFocus}
              @focusout=${this.onTypingBlur}
              @paste=${this.onPaste}
            ></tanrei-embedded-text-input>
          </div>
          ${!stacked ? end : nothing}
          <div class="group send">${this.sendPart(disabled, sendable)}</div>
        </div>
        ${stacked ? html`<div class="row">${start}${end}</div>` : nothing}
        <div class="measures" aria-hidden="true"><span class="probe"></span></div>
        <div class="announce" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiChatComposer);
// CCM-45: the product's ARIA on the host is its group's (src/primitives/delegated-aria.ts), but for its name, its busy state
// and its other states, which are its props (CCM-29).
delegatesAria(TanreiChatComposer, {
  owns: ['aria-label', 'aria-labelledby', 'aria-busy', 'aria-disabled', 'aria-invalid', 'aria-errormessage'],
  sentence: 'CCM-45',
  instead: { 'aria-label': 'name it with label', 'aria-labelledby': 'name it with label', 'aria-busy': 'it is busy while sending is true' },
});
if (!customElements.get('tanrei-chat-composer')) customElements.define('tanrei-chat-composer', TanreiChatComposer);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-chat-composer': TanreiChatComposer;
  }
}

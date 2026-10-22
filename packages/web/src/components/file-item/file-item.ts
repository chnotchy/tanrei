import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { literal, html as staticHtml } from 'lit/static-html.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  GlyphMirrorController,
  LINK_MARK,
  LinkController,
  PressController,
  type TanreiLinkTarget,
  WordsController,
  linkAttributes,
  report,
  syncFocusStyle,
} from '../../primitives/index.js';
import { type FileKind, KIND_GLYPH, fileKind, nameParts } from '../../primitives/file-format.js';
import { FILE_ITEM_TAKE_FOCUS, FILE_ITEM_UPDATE, type FileItemGiven, fileItemGiven } from '../../primitives/file-item-holder.js';
import { notifyItemUpdate } from '../../primitives/item-update.js';
import { fillPlaces, placeFaults, reportPlaces } from '../../primitives/places.js';
import { wordPlaces } from '../../generated/words.js';
import '../progress-indicator/progress-indicator.js';
import { styles } from './file-item.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** How the file is shown: one line across the width its layout gives (`row`), or a box of a width and a height with the texts beneath it (`tile`). */
export type TanreiFileItemForm = 'row' | 'tile';
/** Where a file stands: chosen and waiting, being sent, with the product, or failed. */
export type TanreiFileItemStatus = 'pending' | 'uploading' | 'done' | 'error';
/** How the picture fills its box: filling it and cut at the edges (`cover`), or whole inside it (`contain`). */
export type TanreiFileItemFit = 'cover' | 'contain';
/** `click`, `remove` and `retry`: the file item's `value`. */
export interface TanreiFileItemDetail {
  value: string;
}

const FORMS: readonly string[] = ['row', 'tile'];
const STATUSES: readonly string[] = ['pending', 'uploading', 'done', 'error'];
const FITS: readonly string[] = ['cover', 'contain'];
/** FIT-4, FIT-11: the marks and the actions, by their names in the system's icon set. */
const GLYPHS = { done: 'check_circle', error: 'error', retry: 'refresh', remove: 'close' } as const;
/** FIT-29: a width or a height is a number above zero; anything else is as if it were not given. */
const size = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File;

/**
 * Shows one file: a glyph that says its format, or a small picture of it; its name; a second line with what the
 * product says of it — its format, its size, where its sending stands, what went wrong; a bar while it is sent; and
 * the actions to take it back and to try it again. As a row of a column of files (`form="row"`, the default) or as a
 * tile of a strip of pictures (`form="tile"`, a box of `width` by `height`). **It never reads, keeps or sends the
 * file** (FIT-7, FIT-33): what it shows is what its props say.
 *
 * Contract: specs/file-item.spec.json. `<tanrei-file-item name="brief.pdf" size-text="820 KB"
 * remove-label="Remove"></tanrei-file-item>`; a tile: `<tanrei-file-item form="tile" preview width="160" height="90"
 * name="floor-plan.png"></tanrei-file-item>`. `progress` absent is null: the bar is drawn as under way.
 *
 * The glyph is chosen by the file's format — `media-type`, else the end of `name` — in ten kinds (FIT-5); `glyph`
 * names another of the icon set, and the `icon` slot holds one the set does not have. With `preview` the picture at
 * `preview-src` stands in the glyph's place, or — for an image — a picture of `file` (a `File`, a property and never an
 * attribute), for which the element makes one object URL when it first comes near the viewport and revokes it when it
 * is taken out of the page, given another file or no longer asked for the picture. Until a picture can be drawn, and
 * where it cannot, the glyph stands there. A picture that moves is played by the browser's image element: give a still
 * `preview-src` where a strip must not move.
 *
 * The body — the glyph or the picture, and the texts — is a button with `interactive` (it emits `click`) and a link
 * with `href`; the two actions stand beside it, never inside it, and emit `remove` and `retry`. The element
 * removes nothing and changes no status: whoever holds it does. `readonly` draws no action; `disabled` disables them
 * and the body and leaves what is shown as it is.
 *
 * Alone it is a group named by `name`. A component that holds it as an item of a list of its own — a File upload —
 * says so through an internal channel, and gives it there what every one of its rows shares.
 *
 * Without script, and until the element is defined, nothing is drawn: the name is an attribute.
 *
 * @tag tanrei-file-item
 * @slot icon - A glyph of the product's own in place of the format's glyph, where a name in the icon set (`glyph`) is not enough. Decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The body: the glyph or the picture, and the texts. The button or the link where the file item is pressable.
 * @csspart media - The box of the glyph or the picture: the leading box of a row, the whole box of a tile.
 * @csspart icon - The box of the format's glyph (hidden from assistive technology).
 * @csspart preview - The picture, in the glyph's place.
 * @csspart headline - The file's name.
 * @csspart supporting-text - The second line: the format, the size, then the status or the error.
 * @csspart status-icon - The mark before the words of a file that is done or failed.
 * @csspart progress - The bar, while the status is uploading (a `<tanrei-progress-indicator>`).
 * @csspart action - An action: also `retry` or `remove`.
 * @fires click - The body of a pressable file item was activated. Bubbles and is composed; `detail.value` is the file item's value. A link fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 * @fires remove - The person asked to take this file back. Bubbles and is composed; `detail.value` is the file item's value. Whoever holds the file item removes it.
 * @fires retry - The person asked to try a failed file again. Bubbles and is composed; `detail.value` is the file item's value.
 */
export class TanreiFileItem extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'file-item');
  static override styles = styles;

  /**
   * Its documented parts, once: what a composed element exports them from (src/primitives/composed.ts, W4).
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'media', 'icon', 'preview', 'headline', 'supporting-text', 'status-icon', 'progress', 'action'];

  static override properties: PropertyDeclarations = {
    form: { type: String, reflect: true },
    value: { type: String },
    name: { type: String },
    mediaType: { type: String, attribute: 'media-type' },
    glyph: { type: String },
    formatText: { type: String, attribute: 'format-text' },
    sizeText: { type: String, attribute: 'size-text' },
    status: { type: String, reflect: true },
    statusText: { type: String, attribute: 'status-text' },
    progress: { type: Number },
    errorText: { type: String, attribute: 'error-text' },
    retryable: { type: Boolean, reflect: true },
    preview: { type: Boolean, reflect: true },
    previewSrc: { type: String, attribute: 'preview-src' },
    fit: { type: String, reflect: true },
    nameHidden: { type: Boolean, attribute: 'name-hidden', reflect: true },
    width: { type: Number },
    height: { type: Number },
    interactive: { type: Boolean, reflect: true },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    removeLabel: { type: String, attribute: 'remove-label' },
    retryLabel: { type: String, attribute: 'retry-label' },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    rel: { type: String },
    download: { type: String },
    file: { attribute: false },
    address: { state: true },
    pictured: { state: true },
    failed: { state: true },
    lengths: { state: true },
    stacked: { state: true },
  };

  /** How the file is shown. `row`: one line across the width its layout gives — for a column of files. `tile`: a box of `width` by `height` holding the picture or the glyph, the texts beneath it and the actions at its corner — for a strip of pictures. Anything else is `row`. */
  form: TanreiFileItemForm = 'row';

  /** What identifies the file to the product: given back by `click`, `remove` and `retry`. */
  value = '';

  /** The file's name as the person knows it ("report-2026.pdf"). The file item's name for assistive technology in every form, also where it is not drawn. Empty, it is read from `file.name`. */
  name = '';

  /** The file's kind as the browser reports it ("image/png"), from which the glyph is chosen (`media-type`). Empty, it is read from `file.type`, and then from the end of `name`. */
  mediaType = '';

  /** The name of a glyph of the icon set, drawn in place of the one the file's format would choose. Empty lets the format choose. */
  glyph = '';

  /** The file's format in the product's words ("PDF"), drawn first on the second line (`format-text`). Empty draws none. */
  formatText = '';

  /** The file's size as text, formatted by the product for the reader's locale ("1.2 MB"); the `size-text` attribute. Empty draws none. */
  sizeText = '';

  /** Where the file stands: `pending`, `uploading` (the bar is drawn), `done` or `error` (`errorText` says why). Anything else is `pending`. */
  status: TanreiFileItemStatus = 'pending';

  /** The status in the product's words ("Waiting", "Uploading", "Uploaded"), drawn last on the second line; the `status-text` attribute. */
  statusText = '';

  /** How far the sending has come, from 0 to 1, while the status is uploading. Null (no attribute) draws the bar as under way. */
  progress: number | null = null;

  /** Why the file failed and what to do, in the product's words; drawn in the status's place while the status is error (`error-text`), in every form, and never cut. */
  errorText = '';

  /** Whether a failed file offers the retry action. */
  retryable = false;

  /** Whether a picture of the file is drawn in the glyph's place: the one at `preview-src`, or — for an image — a picture of `file`. False draws the glyph, also for an image. */
  preview = false;

  /** The address of a picture of the file (`preview-src`): a small rendition the product's server made. With `preview` it is drawn for a file of any format. Empty, the picture comes from `file`. */
  previewSrc = '';

  /** How the picture fills its box. `cover`: it fills the box and is cut at the edges. `contain`: the whole picture inside the box, on the box's ground. Anything else is `cover`. */
  fit: TanreiFileItemFit = 'cover';

  /** In a tile: the name is not drawn beneath a tile that draws a picture (`name-hidden`). It stays the file item's name for assistive technology, and is drawn all the same wherever no picture is. Not read in a row. */
  nameHidden = false;

  /** In a tile: the width of the box, in CSS pixels. Null (no attribute) makes it as wide as it is high. */
  width: number | null = null;

  /** In a tile: the height of the box, in CSS pixels. Null (no attribute) reads the token of a tile's height. */
  height: number | null = null;

  /** Makes the body — the glyph or the picture, and the texts — one button that emits `click`, for a product that opens the file where it is. The actions stay their own. */
  interactive = false;

  /** The destination: the address of the file. Not empty, the body is a link to it whether `interactive` is set or not: an `<a href>`, followed by Enter and not by Space. */
  href = '';

  /** Where the destination opens. `same`: where the person is. `new`: a new tab, which a row marks and `target-label` says. Ignored without `href`. */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads after the link's name while `target` is `new` ("opens in a new tab"): your words (`target-label`). */
  targetLabel = '';

  /** The accessible name of the remove action (`remove-label`): your sentence with the place `{name}`, which the file item fills with the file's name ("Remove {name}"). This instance's words, else the product's (`setWords({ removeLabel })`). */
  removeLabel = '';

  /** The accessible name of the retry action (`retry-label`), with the place `{name}` filled by the file's name ("Retry {name}"). This instance's words, else the product's (`setWords({ retryLabel })`). */
  retryLabel = '';

  /** The actions are disabled and the body cannot be pressed. What the file item shows of the file stays as it is and stays readable. */
  disabled = false;

  /** The file is shown and cannot be taken back: no remove action and no retry action is drawn (`readonly`). The body can still be pressed where `interactive` or `href` says so. */
  readOnly = false;

  /** Web only: forwarded to the anchor's `rel`. `noopener` is added while `target` is `new`. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own), so that the link saves the file in place of opening it. Ignored without `href`. */
  download: string | null = null;

  /** The file itself, as the browser's own handle: what a picture is drawn of (with `preview`, for an image), what `name` and `media-type` are read from where they are empty, and what a File upload submits for the item. A property, never an attribute; no byte of it is read. */
  file: File | null = null;

  /** FIT-7: the one address made for `file`, while its picture is asked for and the item has come near the viewport. */
  protected address = '';
  /** FIT-6: the address whose picture can be drawn. */
  protected pictured = '';
  /** FIT-6: the picture at this address could not be drawn: the glyph stands in its place. */
  protected failed = '';
  /** FIT-3: three lengths of the tokens in CSS pixels, read where a tile is given a width or a height — the token of its height, and the least width and height its actions need. */
  protected lengths: { token: number; width: number; height: number } | null = null;
  /** FIT-24: a row's actions stand on a line of their own below its texts. */
  protected stacked = false;
  /** FIT-24: the watch on the row's width, while a row has actions. */
  private resize: ResizeObserver | null = null;
  /** FIT-24: the row and its actions, as last watched. */
  private watched: Element[] = [];
  /** The box the lengths were read for. */
  private measuredFor = '';
  /** FIT-23: the form last drawn. */
  private drawnForm: TanreiFileItemForm | null = null;

  /** FIT-20: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** FIT-28: a glyph is mirrored in right-to-left where the icon set marks its name; the one in the icon slot too. */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.icon:not(.given), .glyph, .mark' });

  /** FIT-31: each glyph box carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon, .glyph, .mark') ?? []);

  /** FIT-13: the link the body is while it has a destination (src/primitives/link.ts). */
  private readonly link = new LinkController(this, { ids: { refused: 'FIT-13', newContext: 'FIT-13' }, disabled: () => this.isDisabled });

  /** FIT-15, FIT-16: the pressed state of the body — a link's by Enter alone — and of each action. */
  private readonly presses = {
    body: new PressController(this, {
      container: () => this.renderRoot?.querySelector<HTMLElement>('.body.pressable') ?? null,
      holdCarrier: () => this.renderRoot.querySelector('.body .hold'),
      disabled: () => this.isDisabled,
      keys: () => this.link.pressKeys,
      rippleHost: () => this.renderRoot?.querySelector<HTMLElement>('.layer') ?? null,
    }),
    retry: this.pressOf('retry'),
    remove: this.pressOf('remove'),
  };

  /** FIT-30: focus was on the retry action when the render that takes it away began. */
  private retryHeld = false;
  /** FIT-7: the watch for the item coming near the viewport, while a picture of its file is asked for. */
  private near: IntersectionObserver | null = null;
  /** The role and the name it wrote on itself; what the product wrote is the product's. */
  private wrote: { role: string | null; label: string | null } = { role: null, label: null };

  private pressOf(kind: 'retry' | 'remove') {
    return new PressController(this, {
      container: () => this.renderRoot?.querySelector<HTMLElement>(`.action.${kind}`) ?? null,
      holdCarrier: () => this.renderRoot.querySelector(`.action.${kind} .hold`),
      disabled: () => this.isDisabled,
    });
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** FIT-19, FUP-58: what a component that holds it gives it (src/primitives/file-item-holder.ts). */
  private get given(): FileItemGiven {
    return fileItemGiven(this) ?? {};
  }

  /** FIT-29: a form it does not know is row. */
  private get shownForm(): TanreiFileItemForm {
    const form = this.given.form ?? this.form;
    return form === 'tile' ? 'tile' : 'row';
  }

  /** FIT-29: a status it does not know is pending. */
  private get shown(): TanreiFileItemStatus {
    return STATUSES.includes(this.status) ? this.status : 'pending';
  }

  private get shownFit(): TanreiFileItemFit {
    const fit = this.given.fit ?? this.fit;
    return fit === 'contain' ? 'contain' : 'cover';
  }

  private get wantsPreview(): boolean {
    return this.given.preview ?? this.preview;
  }

  /** FIT-21: disabled by its own `disabled`, or by the component that holds it. */
  private get isDisabled(): boolean {
    return this.disabled || !!this.given.disabled;
  }

  /** FIT-33: the name — the prop, else what the browser reports of the file. */
  private get shownName(): string {
    return this.name || (isFile(this.file) ? this.file.name : '');
  }

  /** FIT-33: the media type — the prop, else what the browser reports of the file. */
  private get shownType(): string {
    return this.mediaType || (isFile(this.file) ? this.file.type : '');
  }

  /** FIT-5: the kind of the file's format. */
  private get kind(): FileKind {
    return fileKind(this.shownType, this.shownName);
  }

  /** FIT-7: a picture of the file itself is asked for — preview is true, previewSrc is empty, the kind is image, and there is a file. */
  private get wantsFilePicture(): boolean {
    return this.wantsPreview && !this.previewSrc.trim() && this.kind === 'image' && isFile(this.file);
  }

  /** FIT-6: the address of the picture now: the product's, else the one made for the file, else none. */
  private get source(): string {
    if (!this.wantsPreview) return '';
    return this.previewSrc.trim() || (this.wantsFilePicture ? this.address : '');
  }

  /** FIT-12, FIT-13: the body can be pressed — it is a link, or `interactive`. */
  private get pressable(): boolean {
    return !!this.link.form || this.interactive;
  }

  // ─── Focus ────────────────────────────────────────────────────────────────────────────────────────────────────

  /** Moves focus to the file item's first stop: its body where that is pressable, else its retry action, else its remove action. */
  override focus(options?: FocusOptions) {
    if (this.keepFocusUntilRendered(options)) return;
    this.renderRoot?.querySelector<HTMLElement>('.body.pressable:not(:disabled):not([aria-disabled="true"]), .action:not(:disabled)')?.focus(options);
  }

  /** @internal FUP-30: focus after a row left — to the remove action, or to the body where there is none and it is pressable. */
  [FILE_ITEM_TAKE_FOCUS](): boolean {
    const target = this.renderRoot?.querySelector<HTMLElement>('.action.remove:not(:disabled)') ?? this.renderRoot?.querySelector<HTMLElement>('.body.pressable:not(:disabled):not([aria-disabled="true"])');
    target?.focus();
    return !!target && this.shadowRoot?.activeElement === target;
  }

  // ─── The picture (FIT-6, FIT-7) ───────────────────────────────────────────────────────────────────────────────

  /** FIT-7: the address is released — the item left the page, was given another file or none, or no longer draws the file's picture. */
  private release() {
    if (!this.address) return;
    URL.revokeObjectURL(this.address);
    this.address = '';
  }

  private unwatch() {
    this.near?.disconnect();
    this.near = null;
  }

  /** FIT-7: at most one address, made only once the item is in or near what is in view. */
  private watch() {
    if (this.near || this.address || typeof IntersectionObserver === 'undefined') return;
    this.near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.unwatch();
        if (!this.isConnected || !this.wantsFilePicture || this.address) return;
        this.address = URL.createObjectURL(this.file as File);
      },
      // Near: within half a viewport of what is in view, so that a picture is there when a strip is scrolled to it.
      { rootMargin: '50%' },
    );
    this.near.observe(this);
  }

  private readonly onPicture = (event: Event) => {
    const picture = event.target as HTMLImageElement;
    if (picture.getAttribute('src') !== this.source) return;
    if (event.type === 'load') {
      this.pictured = this.source;
      return;
    }
    // FIT-6: it cannot be drawn — the glyph stands in its place, with no sign of the failure, no event and no status.
    this.pictured = '';
    this.failed = this.source;
    if (this.previewSrc.trim()) report(this, 'FIT-6', 'the picture at preview-src could not be drawn, so the glyph of the file\'s format is drawn in its place; give an address the browser can load, or leave preview out');
  };

  // ─── Events (FIT-11 to FIT-13) ────────────────────────────────────────────────────────────────────────────────

  /** FIT-11: an action emits its event exactly once, with the value, and does nothing else. */
  private act(event: Event, kind: 'retry' | 'remove') {
    // The press is the action's alone: it is no click of the file item's (FIT-11, FIT-12).
    event.stopPropagation();
    if (this.isDisabled) return;
    // Each name is written out: the manifest reads an event's name from the dispatch, and a variable there became an
    // event called "kind" (and React's onKind).
    const init = { bubbles: true, composed: true, detail: { value: this.value } };
    if (kind === 'retry') this.dispatchEvent(new CustomEvent<TanreiFileItemDetail>('retry', init));
    else this.dispatchEvent(new CustomEvent<TanreiFileItemDetail>('remove', init));
  }

  /**
   * FIT-12, FIT-13: the body was activated — by pointer, touch, keyboard or assistive technology, which all arrive as
   * the native element's click. `click` is emitted once, with the value; a link is then followed by the browser,
   * unless the product cancelled the event (D4). The native click does not leave the element as a second one.
   */
  private readonly onBodyClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (!this.pressable) return;
    if (this.isDisabled) {
      event.preventDefault();
      return;
    }
    const mine = new CustomEvent<TanreiFileItemDetail>('click', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value } });
    if (!this.dispatchEvent(mine)) event.preventDefault();
  };

  /** FIT-12: a press on what is not the pressable body — a text of a body that is not pressable, the room between two parts — is no click of the file item's. The body's and the actions' own clicks never come this far. */
  private readonly onOtherClick = (event: MouseEvent) => event.stopPropagation();

  /** FIT-17: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = (event: FocusEvent) => syncFocusStyle(this, event.target as HTMLElement);

  private readonly onIconSlotChange = () => this.requestUpdate();

  /** FIT-5: the icon slot holds a glyph of the product's. */
  private get hasIcon(): boolean {
    return [...this.children].some((child) => child.slot === 'icon');
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    // Put back into the page: a picture of its file is made again when it is next in view (FIT-7).
    if (this.hasUpdated) this.requestUpdate();
    // A component that holds it reads it when it arrives.
    notifyItemUpdate(this, FILE_ITEM_UPDATE);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // FIT-7: taken out of the page, the address is released; put back, a new one is made when it is next in view.
    this.unwatch();
    this.release();
    this.pictured = '';
    this.resize?.disconnect();
    this.resize = null;
    this.watched = [];
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    const active = this.shadowRoot?.activeElement;
    this.retryHeld = !!active && active.classList.contains('retry');
    // FIT-7: another file or none, and a picture of the file that is no longer asked for, release the address.
    if (changed.has('file') || !this.wantsFilePicture) {
      this.release();
      if (!this.wantsFilePicture) this.unwatch();
    }
    if (changed.has('file') || changed.has('previewSrc') || changed.has('preview')) this.failed = '';
    // FIT-6: a picture is drawn once it has loaded; another address is another picture.
    if (!this.source || this.failed === this.source || this.pictured !== this.source) this.pictured = '';
    // FIT-3: the host of a tile is exactly as wide as its box.
    this.toggleAttribute('data-tile', this.shownForm === 'tile');
    // FIT-19: alone, a group named by the name; held as an item of a list, an item of that list in the group's place.
    const role = this.given.listItem ? 'listitem' : 'group';
    if (!this.hasAttribute('role') || this.getAttribute('role') === this.wrote.role) {
      if (this.getAttribute('role') !== role) this.setAttribute('role', role);
      this.wrote.role = role;
    }
    const label = role === 'group' ? this.shownName || null : null;
    if (!this.hasAttribute('aria-label') || this.getAttribute('aria-label') === this.wrote.label) {
      if (label === null) this.removeAttribute('aria-label');
      else if (this.getAttribute('aria-label') !== label) this.setAttribute('aria-label', label);
      this.wrote.label = label;
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // FIT-7: a picture of the file is asked for and none is made yet — made when the item comes near the viewport.
    if (this.wantsFilePicture && !this.address && this.isConnected) this.watch();
    // FIT-30: the retry action left while focus was on it: focus goes to the remove action, or to a pressable body.
    if (this.retryHeld && !this.renderRoot.querySelector('.action.retry')) {
      (this.renderRoot.querySelector<HTMLElement>('.action.remove') ?? this.renderRoot.querySelector<HTMLElement>('.body.pressable'))?.focus();
    }
    this.retryHeld = false;
    // FIT-3: a box that is given a width or a height — its proportion, and the least size its actions need, are numbers
    // of pixels of the tokens, which only a real property computes; read when the tile is given another box, never at rest.
    const tile = this.shownForm === 'tile';
    const { width, height } = this.box;
    const asked = tile && (width !== null || height !== null) ? `${width} ${height}` : '';
    if (asked && asked !== this.measuredFor) {
      const read = getComputedStyle(this.renderRoot.querySelector('.item')!);
      const now = { token: Number.parseFloat(read.scrollMarginBlockStart), width: Number.parseFloat(read.scrollMarginInlineStart), height: Number.parseFloat(read.scrollMarginBlockEnd) };
      const was = this.lengths;
      if (Object.values(now).every((value) => Number.isFinite(value) && value > 0) && (!was || was.token !== now.token || was.width !== now.width || was.height !== now.height)) this.lengths = now;
    }
    this.measuredFor = asked;
    // FIT-23: a change of form is drawn at once — an action's colors are its form's, and go to the other form's without their motion.
    const form = this.shownForm;
    if (this.drawnForm && this.drawnForm !== form) for (const animation of this.renderRoot.querySelector('.item')?.getAnimations({ subtree: true }) ?? []) if (animation instanceof CSSTransition) animation.finish();
    this.drawnForm = form;
    this.watchWidth();
    this.reports(changed);
    // A component that holds it reads it again: what it announces and what its form submits.
    if (changed.size) notifyItemUpdate(this, FILE_ITEM_UPDATE);
  }

  /** FIT-24: a row with actions is measured whenever it, or what stands beside its texts, changes size. */
  private watchWidth() {
    const item = this.renderRoot.querySelector<HTMLElement>('.item');
    const end = this.renderRoot.querySelector<HTMLElement>('.end');
    if (this.shownForm !== 'row' || !item || !end || typeof ResizeObserver === 'undefined') {
      this.resize?.disconnect();
      this.resize = null;
      this.watched = [];
      if (this.stacked) this.stacked = false;
      return;
    }
    if (this.watched[0] === item && this.watched[1] === end) return;
    this.resize ??= new ResizeObserver(() => this.measureStacked());
    this.resize.disconnect();
    this.resize.observe(item);
    this.resize.observe(end);
    this.watched = [item, end];
  }

  /**
   * FIT-24: whether what stands beside a row's texts — the glyph or the picture, the mark of a new context, the actions
   * and the gaps between them — would leave the texts less than half the row. Counted from the widths those parts have,
   * which do not change with where the actions stand, so the answer is the same either way.
   */
  private measureStacked() {
    const item = this.renderRoot.querySelector<HTMLElement>('.item');
    const end = this.renderRoot.querySelector<HTMLElement>('.end');
    if (!item || !end || this.shownForm !== 'row') return;
    const width = (element: Element | null) => (element ? element.getBoundingClientRect().width : 0);
    const row = width(item);
    if (row <= 0) return;
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    const bodyGap = body ? Number.parseFloat(getComputedStyle(body).columnGap) || 0 : 0;
    const gap = Number.parseFloat(getComputedStyle(item).columnGap) || 0;
    const beside = [this.renderRoot.querySelector('.body .lead'), this.renderRoot.querySelector('.body .open')]
      .map(width)
      .filter((each) => each > 0)
      .reduce((sum, each) => sum + each + bodyGap, 0) + gap + width(end);
    const stacked = beside > row / 2;
    if (stacked !== this.stacked) this.stacked = stacked;
  }

  /** FIT-29: the width and the height of a tile's box, as given — the holder's for every row, else the item's own — or null. */
  private get box(): { width: number | null; height: number | null } {
    const given = this.given;
    return { width: size('width' in given ? given.width : this.width), height: size('height' in given ? given.height : this.height) };
  }

  /** What a debug build is told; the file item still renders. */
  private reports(changed: PropertyValues<this>) {
    const given = this.given;
    const tile = this.shownForm === 'tile';
    if (changed.has('form') && !FORMS.includes(this.form)) report(this, 'FIT-29', `form "${this.form}" is not a form of the file item; it is drawn as "row"`);
    if (changed.has('status') && !STATUSES.includes(this.status)) report(this, 'FIT-29', `status "${this.status}" is not a status of the file item; it is drawn as "pending"`);
    if (changed.has('fit') && !FITS.includes(this.fit)) report(this, 'FIT-29', `fit "${this.fit}" is not a fit of the file item; the picture is drawn as "cover"`);
    for (const side of ['width', 'height'] as const) {
      const value = this[side];
      if (changed.has(side) && value !== null && size(value) === null) report(this, 'FIT-29', `${side} "${String(value)}" is not a number above zero; the tile is drawn as if it were not given`);
    }
    // FIT-2: a row without a name would be a glyph and a number.
    if (!tile && !('nameHidden' in given) && this.nameHidden) report(this, 'FIT-2', 'name-hidden is set on a file item whose form is "row": a row always draws its name; it is read in a tile alone');
    // FIT-8: a file without a name.
    if (!this.shownName.trim()) report(this, 'FIT-8', 'name is empty, so the file item has no name for a person or for assistive technology; give it the file\'s name');
    // FIT-4: a status is never told by the mark or its color alone.
    const status = this.shown;
    if (status === 'done' && !this.statusText.trim()) report(this, 'FIT-4', 'status is "done" and status-text is empty, so only the mark says the file is done; give the file item a status-text');
    if (status === 'error' && !this.errorText.trim() && !given.made) report(this, 'FIT-4', 'status is "error" and error-text is empty, so only the mark says the file failed; give the file item an error-text');
    // FIT-20: an action nobody named is still drawn; a name without the file's place names every file's action alike.
    if (!this.readOnly) {
      const remove = this.words.get('removeLabel', given.removeLabel ?? this.removeLabel);
      if (!remove) this.words.missing('removeLabel', { id: 'FIT-20', effect: 'the remove action is drawn and works, and has no accessible name' });
      else this.reportName('removeLabel', remove);
      if (status === 'error' && this.retryable) {
        const retry = this.words.get('retryLabel', given.retryLabel ?? this.retryLabel);
        if (!retry) this.words.missing('retryLabel', { id: 'FIT-20', effect: 'the retry action is drawn and works, and has no accessible name' });
        else this.reportName('retryLabel', retry);
      }
    }
    // FIT-32: the file item has no place for content of the product's.
    const strays = [...this.childNodes].filter((node) => (node instanceof Element ? node.slot !== 'icon' : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
    if (strays.length) report(this, 'FIT-32', 'the file item holds content that is not the glyph of its icon slot; it is not drawn — put it beside the file item');
    // FIT-3: a box given less than its actions need is drawn at the least size.
    const least = this.lengths;
    if (tile && least) {
      const { width, height } = this.box;
      for (const side of ['width', 'height'] as const) {
        const value = side === 'width' ? width : height;
        // A whole pixel of tolerance: the least size is a length of the tokens, rounded by the browser.
        if (value !== null && value < least[side] - 1) report(this, 'FIT-3', `${side} ${value} is less than a tile's actions need; the box is drawn ${Math.round(least[side])} ${side === 'width' ? 'wide' : 'high'}`);
      }
    }
    // FIT-29: a glyph the icon set does not have draws nothing, and its box is kept.
    if (this.glyph.trim() && !this.hasIcon && (changed.has('glyph') || !this.hasUpdatedOnce)) this.lookForGlyph();
    this.hasUpdatedOnce = true;
  }

  /** FIT-20: what of an action's sentence is not its place, and a sentence without the file's name. */
  private reportName(key: 'removeLabel' | 'retryLabel', sentence: string) {
    const declared = wordPlaces[key] ?? [];
    reportPlaces(this, 'FIT-20', key, sentence, declared, 'the action is named with it as it is written');
    for (const name of placeFaults(sentence, declared).absent) report(this, 'FIT-20', `${key} has no place {${name}}, so every file's action has the same name; write it as "${key === 'removeLabel' ? 'Remove' : 'Retry'} {${name}}"`);
  }

  /** The first update's reports were made. */
  private hasUpdatedOnce = false;

  /**
   * FIT-29: whether the icon set draws the glyph `glyph` names is known once the set's font can draw at all — which
   * another glyph of this file item shows (an action's, a mark's: each a name the set has, FIT-5's `verify`). A box that
   * stays empty beside a glyph that is drawn names a glyph the set does not have. The marks are written after the
   * render, in its turn (GlyphDrawnController), and again when the face arrives: looked at after each, never at rest.
   * A file item with no other glyph (read-only, with no status mark) has nothing to compare with and reports nothing.
   */
  private lookForGlyph(again = true) {
    const named = this.glyph;
    const look = () => {
      if (!this.isConnected || this.glyph !== named || this.hasIcon) return true;
      const icon = this.renderRoot.querySelector('.icon');
      const others = [...this.renderRoot.querySelectorAll('.glyph, .mark')];
      if (!icon || !others.some((other) => other.hasAttribute('data-drawn'))) return false;
      if (!icon.hasAttribute('data-drawn')) report(this, 'FIT-29', `glyph "${named}" is not a glyph the icon set draws; nothing is drawn in its box`);
      return true;
    };
    // After the marks of this turn; and, where the face was not there yet, once more when the page's faces have arrived.
    queueMicrotask(() => {
      if (look() || !again || typeof document === 'undefined' || !document.fonts) return;
      void document.fonts.ready.then(() => setTimeout(() => void look(), 0));
    });
  }

  // ─── Rendering ────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * FIT-19: an action's name — the product's sentence with its place `{name}` filled by the file's name, so that two
   * files' actions are told apart by their names. A plain string: the name is not described a second time.
   */
  private actionName(sentence: string): string {
    const said = sentence.trim();
    if (!said) return '';
    return fillPlaces(said, { name: this.shownName })
      .runs.map((run) => run.text)
      .join('');
  }

  private action(kind: 'retry' | 'remove', label: string) {
    const p = this.presses[kind];
    return html`<button
      part="action ${kind}"
      class="action ${kind}"
      type="button"
      data-tanrei-shape
      ?disabled=${this.isDisabled}
      aria-label=${this.actionName(label) || nothing}
      @click=${(event: Event) => this.act(event, kind)}
      @focus=${this.onFocus}
      @pointerdown=${p.onPointerDown}
      @pointerup=${p.release}
      @pointercancel=${p.release}
      @pointerleave=${p.release}
      @keydown=${p.onKeyDown}
      @keyup=${p.onKeyUp}
      @blur=${p.onBlur}
    >
      <span class="glyph hold" aria-hidden="true"><span class="ink">${GLYPHS[kind]}</span></span>
    </button>`;
  }

  protected override render() {
    const given = this.given;
    const status = this.shown;
    const failed = status === 'error';
    const tile = this.shownForm === 'tile';
    const name = this.shownName;
    const disabled = this.isDisabled;
    const link = this.link.form;
    const pressable = this.pressable;
    const source = this.failed === this.source ? '' : this.source;
    const pictured = !!source && this.pictured === source;
    // FIT-5: the glyph of the format, the one `glyph` names in its place, or the slot's in the place of both.
    const slotted = this.hasIcon;
    const glyph = this.glyph.trim() || KIND_GLYPH[this.kind];
    // FIT-4: the second line — the format, the size and the status in words, or the error in the status's place.
    const said = failed ? this.errorText : this.statusText;
    const marked = status === 'done' || failed;
    const words = [this.formatText, this.sizeText, said].filter((text) => !!text);
    const second = words.length > 0 || marked;
    const dot = html` <span aria-hidden="true">·</span> `;
    const before = [this.formatText, this.sizeText].filter((text) => !!text);
    // FIT-10: the bar while the file is being sent; a fraction clamped to 0 and 1, or null for "under way".
    const progress = typeof this.progress === 'number' && !Number.isNaN(this.progress) ? Math.min(1, Math.max(0, this.progress)) : null;
    const bar = status === 'uploading' ? html`<tanrei-progress-indicator part="progress" separation="divider" .label=${name} .value=${progress}></tanrei-progress-indicator>` : nothing;
    // FIT-8: a tile's name is not drawn only behind a picture that is drawn.
    const hidden = tile && (given.nameHidden ?? this.nameHidden) && pictured;
    const cut = nameParts(name);
    const headline = tile
      ? // FIT-9: the cut is the drawing's alone. What is drawn — the start and the ending, two boxes of one line — is kept
        // from assistive technology, which is given the name whole, as one text, beside it.
        html`<div part="headline" class="headline ${classMap({ unseen: hidden })}"
          >${hidden ? nothing : html`<bdi class="cut" aria-hidden="true"><span class="start">${cut.start}</span>${cut.ending ? html`<span class="ending">${cut.ending}</span>` : nothing}</bdi>`}<span class="whole">${name}</span></div
        >`
      : html`<div part="headline" class="headline">${name}</div>`;
    const text =
      name || second
        ? html`<div class="text ${classMap({ bare: hidden && !second })}">
            ${headline}
            ${second
              ? html`<div part="supporting-text" class="supporting ${classMap({ failed })}">
                  ${before.map((each, index) => html`${index ? dot : nothing}<span class="said">${each}</span>`)}${before.length && (said || marked) ? dot : nothing}${marked
                    ? html`<span part="status-icon" class="mark status" aria-hidden="true"><span class="ink">${failed ? GLYPHS.error : GLYPHS.done}</span></span>`
                    : nothing}${said ? html`<span class="said">${said}</span>` : nothing}
                </div>`
              : nothing}
          </div>`
        : nothing;
    const layer = pressable ? html`<span class="layer" data-tanrei-shape></span>` : nothing;
    // The leading box also carries press-hold for PressController (FIT-15): an element of the body that is always there
    // and has no motion of its own — never a part of its own, which would be one more item of the body's line and its gap.
    const media = html`<span class="lead hold"
      ><span part="media" class="media" ?data-tanrei-shape=${tile || this.wantsPreview} ?data-pictured=${pictured} aria-hidden="true"
        ><span part="icon" class="icon ${classMap({ given: slotted })}">${slotted ? nothing : html`<span class="ink">${glyph}</span>`}<slot name="icon" @slotchange=${this.onIconSlotChange}></slot></span
        >${source
          ? html`<img part="preview" class="preview" alt="" decoding="async" draggable="false" src=${source} ?data-drawn=${pictured} @load=${this.onPicture} @error=${this.onPicture} />`
          : nothing}${tile ? layer : nothing}</span
      ></span
    >`;
    // FIT-13: a row marks a link that opens a new context after its texts; a tile has no such place (D7).
    const opens = !tile && link?.opensNew ? html`<span class="open"><span class="mark new" aria-hidden="true"><span class="ink">${LINK_MARK}</span></span></span>` : nothing;
    const inside = html`${tile ? nothing : layer}${media}${text}${opens}`;
    // FIT-19: a pressable body is named by the name and described by the second line's texts, then by targetLabel.
    const description = this.link.describe(words.join(', ') || null);
    const p = this.presses.body;
    const tag = link ? literal`a` : this.interactive ? literal`button` : literal`div`;
    const body = pressable
      ? staticHtml`<${tag}
          part="container"
          class="body pressable"
          data-tanrei-shape
          type=${link ? nothing : 'button'}
          ?disabled=${!link && disabled}
          ${linkAttributes(link)}
          aria-label=${name || nothing}
          aria-description=${description ?? nothing}
          @click=${this.onBodyClick}
          @focus=${this.onFocus}
          @pointerdown=${p.onPointerDown}
          @pointerup=${p.release}
          @pointercancel=${p.release}
          @pointerleave=${p.release}
          @keydown=${p.onKeyDown}
          @keyup=${p.onKeyUp}
          @blur=${p.onBlur}
        >${inside}</${tag}>`
      : html`<div part="container" class="body">${inside}</div>`;
    const actions = this.readOnly
      ? nothing
      : html`<span class="end">${failed && this.retryable ? this.action('retry', this.words.get('retryLabel', given.retryLabel ?? this.retryLabel)) : nothing}${this.action('remove', this.words.get('removeLabel', given.removeLabel ?? this.removeLabel))}</span>`;
    // FIT-3: the box of a tile — the width and the height given, the token's height where there is none, and a square
    // where there is no width. Numbers of CSS pixels, as an image's.
    // Each side is no less than the actions need (the lengths are read after the first draw of a box: until then the
    // stylesheet holds the box to them, and a box of one side given is a square).
    const { width, height } = this.box;
    const least = this.lengths;
    const wide = width ?? height;
    const high = height ?? (width !== null ? (least?.token ?? null) : null);
    const [w, h] = [wide !== null && least ? Math.max(wide, least.width) : wide, high !== null && least ? Math.max(high, least.height) : high];
    const sizes = tile
      ? {
          '--_box-width': w !== null ? `${w}px` : null,
          '--_box-ratio': w !== null && h !== null ? `${w} / ${h}` : null,
          '--_between': null,
        }
      : { '--_between': given.between ?? null };
    return html`
      <div class="item" @click=${this.onOtherClick} data-form=${tile ? 'tile' : 'row'} data-status=${status} data-fit=${this.shownFit} ?data-preview=${this.wantsPreview} ?data-read-only=${this.readOnly} ?data-stacked=${!tile && !this.readOnly && this.stacked} style=${styleMap(sizes)}>
        ${body}${tile ? html`<span class="over" data-tanrei-shape>${bar}</span>` : status === 'uploading' ? html`<div class="bar">${bar}</div>` : nothing}${actions}
      </div>
    `;
  }
}

if (!customElements.get('tanrei-file-item')) customElements.define('tanrei-file-item', TanreiFileItem);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-file-item': TanreiFileItem;
  }
}

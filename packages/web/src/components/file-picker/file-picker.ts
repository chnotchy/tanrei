import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  FieldControlController,
  FieldProviderController,
  type FieldState,
  GROUP_ITEM,
  GROUP_PLACE,
  type GroupItem,
  type GroupPlace,
  type PlacingGroup,
  GlyphDrawnController,
  GlyphMirrorController,
  PressController,
  report,
  styleQueries,
} from '../../primitives/index.js';
import { acceptConverter, acceptList } from '../../primitives/file-format.js';
import { type FileJudgement, type FileRefused, type FileRejectReason, countLimit, dragAnswer, droppedFiles, givenFiles, judgeFiles, readAccept, sizeLimit } from '../../primitives/file-judge.js';
import { notifyArrival } from '../../primitives/file-item-holder.js';
import { PREFIX, styles } from './file-picker.styles.js';

/** How choosing is offered: the trigger alone (`button`), or a bounded place around it that also takes a drop (`drop-area`). */
export type TanreiFilePickerLayout = 'button' | 'drop-area';
/** Why a file was refused — a name for the product's code, never words: its kind, its size, or how many there were. */
export type TanreiFilePickerRejectReason = FileRejectReason;
/** A file that was refused, with the reason: what `reject` carries and `judge()` answers with. */
export type TanreiFilePickerRefused = FileRefused;
/** `select`: the files of one choice or one drop that passed, in the order the browser gave them. */
export interface TanreiFilePickerSelectDetail {
  files: File[];
}
/** `reject`: the files of one choice or one drop that were refused, each with its reason. */
export interface TanreiFilePickerRejectDetail {
  files: TanreiFilePickerRefused[];
}
/** What `judge()` answers with: the files that passed, and the refused files with their reasons, each in the order given. */
export type TanreiFilePickerJudgement = FileJudgement;

const LAYOUTS: readonly string[] = ['button', 'drop-area'];
const BUTTON = 'tanrei-button';
/** FPK-4, FPK-13: the glyphs, by their names in the system's icon set. */
const GLYPHS = { upload: 'upload', refusing: 'block' } as const;

/**
 * FPK-22: what the trigger is told through the Button's internal channel (src/primitives/group-item.ts) — the one thing
 * a button group's standard item has that a Button alone has not: its label may wrap when its line gives it less than
 * one line needs. First and last, so its hit area reaches as far as it would alone. Nothing of its look is touched.
 */
const TRIGGER_PLACE: GroupPlace = { variant: 'standard', first: true, last: true };

/** The elements a child stands for: itself, or — where it is a slot that passes content on — what is assigned to it. */
const reached = (child: Element): Element[] => (child instanceof HTMLSlotElement ? child.assignedElements({ flatten: true }) : [child]);

/**
 * Lets people choose files through the browser's own picker — from the product's Button and, where there is room, from
 * a place files can also be dragged onto — says the limits in words before the choice, judges what was chosen against
 * them, and hands over what passed and what was refused. **It keeps nothing, lists nothing and takes no part in a
 * form** (FPK-7): whoever holds the files shows them — a `<tanrei-file-upload>` does, with a list and a form value.
 *
 * Contract: specs/file-picker.spec.json. `<tanrei-file-picker accept=".json" constraints-text="…"><tanrei-button
 * slot="trigger" variant="outlined">Choose a file</tanrei-button></tanrei-file-picker>`. `layout="drop-area"` draws a
 * bounded place around the trigger that takes a drop and opens the picker when pressed. `select` carries the files of
 * one choice or one drop that passed `accept`, `max-size` and the count of one choice; `reject` the ones that did not,
 * each with a reason that is a name and not words (`type`, `size`, `count`). `judge(files)` judges files that came
 * another way — pasted, dropped elsewhere — and emits nothing. A second choice is judged as if it were the first.
 *
 * `selection-text` stands beside the trigger in the button layout: what is chosen now, written by whoever holds it.
 * Inside a `<tanrei-field>` it takes the field's label as its group's name, and gives its trigger the field's help,
 * error, requirement and `disabled`.
 *
 * Without script, and until the element is defined, the trigger is a button that opens nothing: a page that must take
 * files where script does not run writes a native `<input type="file">` in its own form.
 *
 * @tag tanrei-file-picker
 * @slot trigger - The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * @slot icon - A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The drop area.
 * @csspart icon - The box of the drop area's glyph.
 * @csspart label - The drop area's prompt.
 * @csspart supporting-text - The line of limits.
 * @csspart selection-text - The text beside the trigger that says what is chosen now.
 * @fires select - Files were chosen or dropped and passed. Once per choice; `detail.files` is a `File[]`. Bubbles.
 * @fires reject - Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export class TanreiFilePicker extends LitElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'file-picker');
  static override styles = styles;

  /**
   * Its documented parts, once: what a composed element exports them from (src/primitives/composed.ts, W4).
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'icon', 'label', 'supporting-text', 'selection-text'];

  static override properties: PropertyDeclarations = {
    layout: { type: String, reflect: true },
    multiple: { type: Boolean, reflect: true },
    accept: { converter: acceptConverter },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    label: { type: String },
    constraintsText: { type: String, attribute: 'constraints-text' },
    dropText: { type: String, attribute: 'drop-text' },
    selectionText: { type: String, attribute: 'selection-text' },
    disabled: { type: Boolean, reflect: true },
    error: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    drag: { state: true },
  };

  /** How choosing is offered: `button` is the trigger alone with the line of limits below it; `drop-area` is a bounded place around the trigger that also takes files dragged onto it and opens the picker when pressed. Anything else is `button`. */
  layout: TanreiFilePickerLayout = 'button';

  /** Whether more than one file can be chosen at a time. False: the picker offers one, and a drop of several is refused whole. */
  multiple = false;

  /** The kinds of file that are taken: extensions with their dot (".pdf") and media types ("image/png", a family as "image/*"). The attribute is a comma-separated list, as a native file input's. Empty takes every kind. */
  accept: string[] = [];

  /** The largest size of one file, in bytes (`max-size`). Null sets no limit. Judged from the size the browser reports; the file is not read. */
  maxSize: number | null = null;

  /** The most files one choice or one drop may bring, while `multiple` is set (`max-files`). Null sets no limit; zero refuses every file — the room a full list has left. Nothing is counted across choices. */
  maxFiles: number | null = null;

  /** The accessible name of the file picker as a group ("Photo"). Not drawn. Leave it empty inside a Field, whose label names the group; left empty elsewhere, no group is exposed and the trigger stands as the button it is. */
  label = '';

  /** The limits in the product's words, shown before the choice and given to assistive technology as the trigger's description (`constraints-text`). */
  constraintsText = '';

  /** The drop area's prompt, in the product's words (`drop-text`). Ignored in the button layout. */
  dropText = '';

  /** What stands beside the trigger in the button layout (`selection-text`): what is chosen now, in the product's words or the file's own name. Read with the trigger. Never written by the element. Ignored in the drop-area layout. */
  selectionText = '';

  /** Nothing can be chosen or dropped: the trigger is disabled and the area answers nothing. Inside a Field, disable the Field. */
  disabled = false;

  /** Puts the file picker in the error condition: the drop area's edge is drawn in the error role and the trigger is exposed as invalid. A Field sets it with its own error. Never set by the element. */
  error = false;

  /** Exposes the trigger as required; a button has no such state, so it is said by a Field's required text in the trigger's description. Draws nothing and validates nothing. */
  required = false;

  /** FPK-13: what is dragged over the area can be taken (receiving), cannot (refusing), or nothing is. */
  protected drag: '' | 'receiving' | 'refusing' = '';

  /**
   * FPK-21: what a field around the file picker — or a component that holds it — gives it (src/primitives/field.ts): the
   * name while it has no `label` of its own, the description, the invalid, required and disabled states.
   */
  private readonly field = new FieldControlController(this, { errorCondition: true, named: () => !!this.label.trim() });

  /**
   * FPK-17, FPK-19: what the file picker gives its trigger, as a field gives its control, and takes back when the
   * trigger leaves the slot — the description, the invalid state, the requirement and `disabled`, never a name. A
   * trigger the product disabled itself is left disabled.
   */
  private readonly provider = new FieldProviderController(this, {
    controls: () => (this.trigger ? [this.trigger] : []),
    state: () => this.given,
    plain: () => this.given,
  });

  /** FPK-26: the glyph in the icon slot, and the element's own, are marked where the icon set mirrors their names. */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.icon.own' });

  /** FPK-29: the area's glyph box carries `data-drawn` while the icon set can draw its ligature. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon') ?? []);

  /** FPK-8, FPK-10: the area's pressed state. It answers a pointer alone: Enter and Space are the trigger's (FPK-12). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.area') ?? null,
    holdCarrier: () => this.renderRoot.querySelector('.hold'),
    disabled: () => this.isDisabled,
    keys: [],
  });

  /** FPK-13: enters less leaves — a child of the area entered is the area still. */
  private drags = 0;
  /** FPK-6: a picker this element opened has not answered yet. */
  private picking = false;
  /** Its content has been written: what a debug build is told of it is told from now on. */
  private presented = false;
  private turn: ReturnType<typeof setTimeout> | undefined;
  /** The trigger it last placed. */
  private placed: Element | null = null;

  constructor() {
    super();
    // FPK-6: an input the person makes here says that the picker they were in is gone.
    this.addEventListener('pointerdown', this.onInput, { capture: true });
    this.addEventListener('keydown', this.onInput, { capture: true });
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** FPK-27: a layout it does not know is button. */
  private get area(): boolean {
    return this.layout === 'drop-area';
  }

  /** Disabled by its own `disabled`, or by a field or a component around it (FPK-19, FPK-21). */
  private get isDisabled(): boolean {
    return this.disabled || this.field.disabled;
  }

  private get isError(): boolean {
    return this.error || this.field.invalid;
  }

  private get isRequired(): boolean {
    return this.required || this.field.required;
  }

  /** The elements in the trigger slot — through a slot that passes them on, too. */
  private get triggers(): Element[] {
    return [...this.children].filter((child) => child.slot === 'trigger').flatMap(reached);
  }

  /** FPK-5: the one element in the trigger slot; the first where there are several. */
  private get trigger(): HTMLElement | null {
    return (this.triggers[0] as HTMLElement | undefined) ?? null;
  }

  /** FPK-4: the icon slot holds a glyph of the product's. */
  private get hasIcon(): boolean {
    return [...this.children].some((child) => child.slot === 'icon' && reached(child).length > 0);
  }

  /** FPK-17: the group's name — its own label, else the field's. */
  private get groupName(): string {
    return this.field.name(this.label);
  }

  /** FPK-2: selectionText as it is drawn — in the button layout alone. */
  private get shownSelectionText(): string {
    return this.area ? '' : this.selectionText;
  }

  /**
   * FPK-17: what the trigger is given. Its description is the line of limits, then selectionText while it is drawn,
   * then what a field or a holder gives; a control whose role has no required state says the requirement in its
   * description, in the field's words — the file picker has none (FPK-18).
   */
  private get given(): FieldState {
    return {
      label: '',
      description: [this.constraintsText, this.shownSelectionText, this.field.description()].map((text) => text.trim()).filter(Boolean).join(' '),
      invalid: this.isError,
      required: this.isRequired,
      requiredText: this.field.state?.requiredText ?? '',
      disabled: this.isDisabled,
    };
  }

  // ─── The picker (FPK-5, FPK-6, FPK-12) ────────────────────────────────────────────────────────────────────────

  /** FPK-21: moves focus to the trigger — the file picker's one stop — and opens nothing. */
  override focus(options?: FocusOptions) {
    this.trigger?.focus(options);
  }

  private get picker(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.picker') ?? null;
  }

  private readonly onInput = (event: Event) => {
    if (event.isTrusted) this.picking = false;
  };

  /** FPK-6: the browser's own picker — one file or any number, the kinds `accept` lists — and never a second while one is open. */
  private openPicker() {
    const picker = this.picker;
    if (!picker || this.isDisabled || this.picking) return;
    this.picking = true;
    picker.multiple = this.multiple;
    picker.accept = acceptList(this.accept).join(',');
    picker.click();
  }

  /** Whether the event came from the trigger: a press that begins there is the trigger's alone (FPK-12). */
  private fromTrigger(event: Event): boolean {
    const trigger = this.trigger;
    return !!trigger && event.composedPath().includes(trigger);
  }

  /**
   * FPK-5: the trigger was activated, by any input it takes — its click. FPK-12: a press on the area outside the
   * trigger does what activating the trigger does and moves focus to it. FPK-30: any element in the slot opens the
   * picker when it is clicked. A trigger that is disabled opens nothing, from either.
   */
  private readonly onClick = (event: MouseEvent) => {
    const trigger = this.trigger;
    if (this.isDisabled || (trigger as { disabled?: unknown } | null)?.disabled === true) return;
    if (this.fromTrigger(event)) {
      this.openPicker();
      return;
    }
    if (!this.area || event.button !== 0) return;
    trigger?.focus();
    this.openPicker();
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.area || this.fromTrigger(event)) return;
    this.press.onPointerDown(event);
  };

  /** FPK-6: the person chose. The value is cleared, so the same file can be chosen again; focus is where it was, on the trigger. */
  private readonly onChange = (event: Event) => {
    const picker = event.target as HTMLInputElement;
    const files = [...(picker.files ?? [])];
    picker.value = '';
    this.picking = false;
    event.stopPropagation();
    this.take(files);
  };

  /** FPK-6: the person left the picker without choosing: nothing is emitted and nothing changes. */
  private readonly onCancel = (event: Event) => {
    this.picking = false;
    event.stopPropagation();
  };

  /**
   * FPK-7, FPK-9: the input's own `input` event is composed — unlike its `change` — and would leave the element, and a
   * component that holds it, as the event of a control with a value. The file picker has none: a choice is told by
   * `select` and `reject` alone.
   */
  private readonly onPickerInput = (event: Event) => event.stopPropagation();

  // ─── Judging (FPK-9, FPK-31) ──────────────────────────────────────────────────────────────────────────────────

  /**
   * FPK-9: the files of one choice or one drop, judged in the order the browser gave them by what it reports of them —
   * the name, the size, the kind — and never opened (FPK-7). `select` with those that passed, then `reject` with the
   * refused and their reasons; nothing is kept.
   */
  private take(files: readonly File[], folders: ReadonlySet<File> = new Set()) {
    if (!files.length) return;
    const { accepted, refused } = this.judged(files, folders);
    if (accepted.length) this.dispatchEvent(new CustomEvent<TanreiFilePickerSelectDetail>('select', { bubbles: true, detail: { files: accepted } }));
    if (refused.length) this.dispatchEvent(new CustomEvent<TanreiFilePickerRejectDetail>('reject', { bubbles: true, detail: { files: refused } }));
    // The arrival is over: a component that holds the file picker answers its two events as one (FUP-57).
    notifyArrival(this);
  }

  /** FPK-9: the rule itself (src/primitives/file-judge.ts, shared with the drop zone) — what passed and what was refused, each in the order given. */
  private judged(files: readonly File[], folders: ReadonlySet<File>): TanreiFilePickerJudgement {
    return judgeFiles(files, this, folders);
  }

  /**
   * FPK-31: judges files that came neither through the picker nor onto the area — pasted, dropped on another part of
   * the page, made by the product — as one arrival, by the rule a choice is judged by. Answers with the files that
   * passed and the refused files with their reasons, each in the order given. Emits nothing and keeps nothing. Works
   * while disabled: disabled stops the person, not the product.
   */
  judge(files: Iterable<File>): TanreiFilePickerJudgement {
    return this.judged(givenFiles(files), new Set());
  }

  // ─── The drop area (FPK-13, FPK-14) ───────────────────────────────────────────────────────────────────────────

  /**
   * FPK-13: what the browser tells before the drop — kinds and a count, never names or sizes. Refusing: it holds no
   * file, it holds more than one where one is asked, or every file is of a kind `accept` refuses — which can be known
   * only where `accept` lists media types alone: an extension is the end of a name, and a name is not told yet.
   */
  private answer(data: DataTransfer | null): 'receiving' | 'refusing' {
    return dragAnswer(data, this);
  }

  /** Tells the browser what letting go here does: copy, or nothing. */
  private effect(event: DragEvent) {
    if (!event.dataTransfer) return;
    try {
      event.dataTransfer.dropEffect = this.isDisabled || this.drag !== 'receiving' ? 'none' : 'copy';
    } catch {
      // A data transfer that takes no effect.
    }
  }

  private readonly onDragEnter = (event: DragEvent) => {
    // FPK-13: the button layout takes no drop and leaves the drag to the browser and the product.
    if (!this.area) return;
    event.preventDefault();
    if (!this.isDisabled) {
      this.drags += 1;
      this.drag = this.answer(event.dataTransfer);
    }
    this.effect(event);
  };

  private readonly onDragOver = (event: DragEvent) => {
    if (!this.area) return;
    // Always: an area that did not take the drag would let the browser open the file.
    event.preventDefault();
    if (!this.isDisabled && !this.drag) {
      this.drags = Math.max(1, this.drags);
      this.drag = this.answer(event.dataTransfer);
    }
    this.effect(event);
  };

  private readonly onDragLeave = () => {
    if (!this.area) return;
    this.drags = Math.max(0, this.drags - 1);
    if (this.drags === 0) this.drag = '';
  };

  /**
   * FPK-14: the condition ends at once and the drop is taken — also when it is refused and when the file picker is
   * disabled — so that the browser does not open the file. What was dropped is judged as a choice in the picker is.
   */
  private readonly onDrop = (event: DragEvent) => {
    if (!this.area) return;
    event.preventDefault();
    this.endDrag();
    if (this.isDisabled) return;
    // A folder is told by its entry — a handle; nothing of it is read (FPK-7).
    const { files, folders } = droppedFiles(event.dataTransfer);
    this.take(files, folders);
  };

  private endDrag() {
    this.drags = 0;
    this.drag = '';
  }

  // ─── The trigger (FPK-5, FPK-22) ──────────────────────────────────────────────────────────────────────────────

  /** @internal FPK-22: where the file picker places a child, for the Button that asks when it connects: its trigger, and nothing else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    return child === this.trigger ? TRIGGER_PLACE : null;
  }

  /** FPK-22: the trigger is told that its label may wrap; one that left the slot is told that it stands alone again. */
  private place() {
    const trigger = this.trigger;
    if (this.placed && this.placed !== trigger) (this.placed as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(null);
    (trigger as (Element & Partial<GroupItem>) | null)?.[GROUP_ITEM]?.set(TRIGGER_PLACE);
    this.placed = trigger;
  }

  private readonly onIconSlotChange = () => this.requestUpdate();

  /** FPK-5: the trigger came, left or was replaced: it is given its description, and one that left gets back what it had. */
  private readonly onTriggerSlotChange = () => {
    this.requestUpdate();
    if (this.presented) this.check();
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.turn);
    this.turn = undefined;
    this.endDrag();
    this.picking = false;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && !this.presented) this.present();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // FPK-28: a layout that changes while something is dragged over the area ends the condition.
    if (changed.has('layout') && this.hasUpdated) this.endDrag();
    if (this.isDisabled && this.drag) this.endDrag();
  }

  protected override firstUpdated() {
    this.present();
  }

  /** What a debug build is told about the content is told once it has all been written: a turn after the first render. */
  private present() {
    if (this.turn !== undefined) return;
    this.turn = setTimeout(() => {
      this.turn = undefined;
      this.presented = true;
      this.check();
      this.reports(new Map() as PropertyValues<this>, true);
    }, 0);
  }

  protected override updated(changed: PropertyValues<this>) {
    // FPK-4: without style queries, the name the cascade gives outline.style now is written for the styles to match.
    const area = this.renderRoot.querySelector<HTMLElement>('.area');
    if (area) {
      if (styleQueries()) delete area.dataset.outline;
      else area.dataset.outline = getComputedStyle(this).getPropertyValue(`${PREFIX}-outline-style`).trim();
    }
    // FPK-17, FPK-19: the trigger is told at once; one that left gets back what it had.
    this.provider.sync();
    this.place();
    if (this.presented) this.reports(changed);
  }

  /**
   * @internal FPK-19, FUP-28: tells the trigger now what the file picker gives it. A file upload calls it once it has
   * passed its trigger on: the trigger is then told before it is first drawn, not after this picker's own first
   * render, which comes after the trigger's and would draw a disabled trigger enabled for a frame and fade it.
   */
  tellTrigger() {
    this.provider.sync();
  }

  /** What a debug build is told about the content, once it has all been written: the file picker still renders. */
  private check() {
    const triggers = this.triggers;
    // FPK-5: without a trigger, files cannot be chosen by keyboard, by touch or with assistive technology.
    if (triggers.length === 0) {
      report(this, 'FPK-5', 'the trigger slot is empty, so files cannot be chosen by keyboard, by touch or with assistive technology; put a tanrei-button in slot="trigger"', { level: 'error' });
    } else {
      if (triggers.length > 1) report(this, 'FPK-5', `the trigger slot holds ${triggers.length} elements; the first is the trigger and the others are not used`);
      // FPK-30: an element that is not a Button still opens the picker when it is clicked.
      if (triggers[0]!.localName !== BUTTON) report(this, 'FPK-30', `<${triggers[0]!.localName}> in the trigger slot is not a tanrei-button; it opens the picker when it is clicked, and its keys and its name are its own to give`);
    }
    // FPK-30: a child that is neither the trigger nor the glyph is not drawn.
    const strays = [...this.childNodes].filter((node) => (node instanceof Element ? !node.slot : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
    if (strays.length) report(this, 'FPK-30', 'the file picker holds content that is neither its trigger nor its glyph; it is not drawn');
  }

  private reports(changed: PropertyValues<this>, all = false) {
    const has = (name: keyof TanreiFilePicker) => all || changed.has(name);
    if (has('layout') && !LAYOUTS.includes(this.layout)) report(this, 'FPK-27', `layout "${this.layout}" is not a layout of the file picker; it is drawn as "button"`);
    if (has('maxSize') && this.maxSize !== null && sizeLimit(this.maxSize) === null) report(this, 'FPK-27', `max-size "${String(this.maxSize)}" is not a number above zero; no size limit is set`);
    if (has('maxFiles') && this.maxFiles !== null && countLimit(this.maxFiles) === null) report(this, 'FPK-27', `max-files "${String(this.maxFiles)}" is not a whole number of zero or more; no limit of files is set`);
    const list = acceptList(this.accept);
    if (has('accept')) {
      const { ignored } = readAccept(list);
      if (ignored.length) report(this, 'FPK-27', `accept holds ${ignored.map((entry) => `"${entry}"`).join(', ')}, which is neither an extension with its dot nor a media type; it is ignored`);
    }
    // FPK-18: a limit that is enforced and not said.
    if (!this.constraintsText.trim() && (list.length > 0 || sizeLimit(this.maxSize) !== null || (this.multiple && countLimit(this.maxFiles) !== null))) {
      report(this, 'FPK-18', 'accept, max-size or max-files sets a limit and constraints-text is empty, so the limit is enforced and not said; say it in constraints-text');
    }
  }

  protected override render() {
    const area = this.area;
    const disabled = this.isDisabled;
    const name = this.groupName.trim();
    const selectionText = this.shownSelectionText;
    const refusing = area && this.drag === 'refusing';
    // FPK-4, FPK-13: the upload glyph, the product's in its place, or the block glyph while the area refuses.
    const own = refusing ? GLYPHS.refusing : this.hasIcon ? '' : GLYPHS.upload;
    const p = this.press;
    // FPK-17: a group only while it has a name; with none, the trigger stands as the button it is.
    return html`
      <div class="group" role=${name ? 'group' : nothing} aria-label=${name || nothing}>
        <div
          part=${area ? 'container' : nothing}
          class=${classMap({ chooser: true, area })}
          ?data-tanrei-shape=${area}
          data-drag=${(area && !disabled && this.drag) || nothing}
          ?data-error=${this.isError}
          ?data-disabled=${disabled}
          @click=${this.onClick}
          @pointerdown=${this.onPointerDown}
          @pointerup=${p.release}
          @pointercancel=${p.release}
          @pointerleave=${p.release}
          @dragenter=${this.onDragEnter}
          @dragover=${this.onDragOver}
          @dragleave=${this.onDragLeave}
          @drop=${this.onDrop}
        >
          ${area
            ? html`<svg class="outline" aria-hidden="true" focusable="false"><rect></rect></svg
                ><span part="icon" class="icon ${classMap({ own: !!own, refusing })}" aria-hidden="true"
                  >${own ? html`<span class="ink">${own}</span>` : nothing}<slot name="icon" @slotchange=${this.onIconSlotChange}></slot></span
                >${this.dropText ? html`<span part="label" class="label" aria-disabled=${disabled ? 'true' : nothing}>${this.dropText}</span>` : nothing}`
            : nothing}
          <span class="line"
            ><slot name="trigger" @slotchange=${this.onTriggerSlotChange}></slot>${selectionText ? html`<span part="selection-text" class="selection" aria-disabled=${disabled ? 'true' : nothing}>${selectionText}</span>` : nothing}</span
          >
          ${this.constraintsText ? html`<span part="supporting-text" class="supporting" aria-disabled=${disabled ? 'true' : nothing}>${this.constraintsText}</span>` : nothing}
          <span class="hold"></span>
        </div>
        <input class="picker" type="file" tabindex="-1" aria-hidden="true" @input=${this.onPickerInput} @change=${this.onChange} @cancel=${this.onCancel} />
      </div>
    `;
  }
}

if (!customElements.get('tanrei-file-picker')) customElements.define('tanrei-file-picker', TanreiFilePicker);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-file-picker': TanreiFilePicker;
  }
}

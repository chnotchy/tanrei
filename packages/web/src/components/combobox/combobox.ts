import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  DismissController,
  type DismissReason,
  FieldControlController,
  type FieldSays,
  GlyphDrawnController,
  GlyphMirrorController,
  NativeTextController,
  OpenAxesController,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  registerOverlay,
  report,
  slottedInteractive,
  syncFocusStyle,
  WordsController,
} from '../../primitives/index.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { FloatingLabelController, floatingAsterisk, floatingLabel, triggerEdges } from '../../primitives/field-trigger.js';
import {
  OPTION_GLYPHS,
  OPTION_GROUP_TAG,
  OPTION_ICON_SPACES,
  OPTION_MIRRORED,
  OPTION_TAG,
  type OptionData,
  type OptionIconSpace,
  OptionListController,
  type OptionModel,
  OptionsController,
  anchoredOptionList,
  filterOptions,
} from '../../primitives/option-list.js';
import type { TanreiInputBoxSizeRegistry, TanreiInputBoxVariantRegistry } from '../../registry.js';
import '../button/button.js';
import '../loading-indicator/loading-indicator.js';
import '../option/option.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { FormSays } from '../../primitives/form-says.js';
import { AXES, INSET, styles } from './combobox.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';

/** The three looks of the input box (`comp.input-box`): a filled box with no label of its own (`stacked`: the label above is its Field's), or the label floating inside a `filled` or `outlined` box. A design system may leave some out or add values. */
export type TanreiComboboxVariant = keyof TanreiInputBoxVariantRegistry;
/** The container's minimum height: the box's `medium` and `large` (`small` is a size of the box this control does not offer). A design system may add values. */
export type TanreiComboboxSize = Exclude<keyof TanreiInputBoxSizeRegistry, 'small'>;
/** How a group of options is told from what is next to it: the design system's answer (auto), a line, or empty space. */
export type TanreiComboboxSeparation = SeparationProp;
/** Whether a shown option keeps the leading icon column where it has no icon (CMB-67). A closed set: the menu's values. */
export type TanreiComboboxIconSpace = OptionIconSpace;
/** Who decides which options answer the text: the combobox (`contains`), or the product (`none`). */
export type TanreiComboboxFilter = 'contains' | 'none';
/** What the product's source of options is doing. */
export type TanreiComboboxStatus = 'idle' | 'loading' | 'error';
/** Why the list closed (CMB-27 … CMB-30). The web has no back of its own, so it never sends `back`. */
export type TanreiComboboxToggleReason = 'select' | 'commit' | 'escape' | 'back' | 'outside' | 'press' | 'tab' | 'focus-out' | 'anchor-hidden' | 'empty';
/** `toggle`'s detail: the new `open`, and for a close its reason. */
export interface TanreiComboboxToggleDetail {
  open: boolean;
  reason?: TanreiComboboxToggleReason;
}
/** `change`'s and `action`'s detail: the committed value, and the text the input now shows. */
export interface TanreiComboboxChangeDetail {
  value: string;
  inputValue: string;
}

type Layout = 'stacked' | 'filled' | 'outlined';
const FILTERS: readonly string[] = ['contains', 'none'];
const STATUSES: readonly string[] = ['idle', 'loading', 'error'];

/** Runs `task` once the document has been read: an element upgraded while its children are still being parsed has none yet. */
function whenParsed(task: () => void) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', task, { once: true });
  else task();
}

// ── CMB-25, CMB-29, CMB-38: how a text is compared with a label ───────────────────────────────────────────────────
//
// Without regard to case, to the width of a character or to the marks on a letter: each letter with the marks that
// follow it is folded by itself — its compatibility form (a full-width "ｔ" is "t", a half-width "ｶ" is "カ"), without
// its marks (an "á" is "a"), in lower case — so that a place in the folded text is a place in the label, and the run
// that matched can be drawn. The two sound marks of kana are letters' own and are kept: "が" is not "か".

const CLUSTER = /\P{M}\p{M}*|\p{M}+/gu;
const KANA_SOUND_MARKS = new Set(['\u3099', '\u309A']);
const foldCluster = (cluster: string) =>
  cluster
    .normalize('NFKD')
    .replace(/\p{M}/gu, (mark) => (KANA_SOUND_MARKS.has(mark) ? mark : ''))
    .normalize('NFKC')
    .toLowerCase();

interface Folded {
  /** The label's letters, each with its marks. */
  clusters: string[];
  /** The folded text. */
  text: string;
  /** For each character of the folded text, the letter of the label it came from. */
  from: number[];
}

function fold(label: string): Folded {
  const clusters = label.match(CLUSTER) ?? [];
  let text = '';
  const from: number[] = [];
  clusters.forEach((cluster, index) => {
    const folded = foldCluster(cluster);
    text += folded;
    for (let i = 0; i < folded.length; i++) from.push(index);
  });
  return { clusters, text, from };
}

/** A text as it is compared: folded, without the spaces around it. */
const foldText = (text: string) => fold(text.trim()).text;

/** The first run of `label` that matched `query` (already folded), as the three pieces of the label; null when none did. */
function matchRun(folded: Folded, query: string): [string, string, string] | null {
  if (!query) return null;
  const at = folded.text.indexOf(query);
  if (at < 0) return null;
  const first = folded.from[at];
  const last = folded.from[at + query.length - 1];
  const { clusters } = folded;
  return [clusters.slice(0, first).join(''), clusters.slice(first, last + 1).join(''), clusters.slice(last + 1).join('')];
}

/**
 * Lets people find one value by typing: a box that looks and measures like a text input, with a list of options that
 * narrows as they type and that they choose from, or, where the product allows it, a value of their own. The bare
 * control: it has no label row and no message of its own.
 *
 * Contract: specs/combobox.spec.json. The options are `<tanrei-option>` children, optionally in
 * `<tanrei-option-group>` elements (the pair a select holds too); the combobox reads them — and reads them again when
 * they change — and renders the rows itself. A `<slot>` among its children stands for the elements assigned to it, so
 * that an element composed around it passes its own children on as the options. Every visual value is a token: the box is
 * drawn from `--tanrei-comp-input-box-*`, the one set every input box is drawn from (CMB-63), and the list and the
 * status row from `--tanrei-comp-combobox-*` — the list's hold the menu's values and the status row's the search's, in
 * every shipped design system.
 *
 * ```html
 * <tanrei-field label="City">
 *   <tanrei-combobox name="city" value="tokyo">
 *     <tanrei-option value="kyoto">Kyoto</tanrei-option>
 *     <tanrei-option value="tokyo">Tokyo</tanrei-option>
 *   </tanrei-combobox>
 * </tanrei-field>
 * ```
 *
 * In a form it is framed: by a Field, as above, or as `<tanrei-combobox-field>`, which is that pair as one element.
 * The Field gives it its name, its description and its required, invalid and disabled states, and draws the label
 * row, the requirement mark, the help and the error; the combobox says back that it draws the label itself where its
 * look floats one (`filled`, `outlined`), where its input text starts and ends, and that it is drawn focused for as
 * long as its list is open (`src/primitives/field.ts`). Bare — a filter in a toolbar, a cell of a table — it is named
 * by its own `label`, which a stacked combobox does not draw.
 *
 * It holds two things: `value`, the committed choice, and `inputValue`, the text in the input. Typing changes the text,
 * opens the list and filters it (`filter="contains"`; with `filter="none"` the product filters, on `input`); a press on
 * an option or Enter on the active one chooses; leaving the box resolves the text — a typed label chooses its
 * option, any other text is kept as the value (`allow-custom-value`) or given up. The value changes only by a choice,
 * a commit or the clear button.
 *
 * It is a block as wide as its place, with no width of its own. It is a form-associated element: it takes `name`,
 * submits `value` (never an uncommitted text), resets to the `value` attribute, is restored on navigation, follows
 * `<fieldset disabled>` and reports `valueMissing` while the Field that frames it says it is required and `value` is
 * empty. It never validates beyond that, and is never required by itself.
 *
 * The pattern is the editable combobox with a list box: focus stays in the input while the list is open and one
 * option at most is the active one (`aria-activedescendant`). While an input method composes, every key is its own.
 *
 * @tag tanrei-combobox
 * @slot - The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * @slot leading-icon - A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The combobox's box: the list's anchor.
 * @csspart outline - A stacked combobox's inner line, or an outlined one's border.
 * @csspart active-indicator - The line along the bottom of a filled combobox.
 * @csspart label - The label floating in a filled or an outlined combobox.
 * @csspart requirement-label - The required asterisk after a floating label.
 * @csspart input - The native `<input>`: the combobox.
 * @csspart leading-icon - The box of the glyph at the start of the container.
 * @csspart clear-button - The clear button, a `<tanrei-button>`.
 * @csspart chevron - The chevron's button at the end of the container.
 * @csspart list - The raised sheet that holds the options.
 * @csspart option - An option's row.
 * @csspart option-label - An option's label.
 * @csspart option-supporting-text - An option's supporting text.
 * @csspart option-leading-icon - The box of an option's glyph.
 * @csspart mark - The check of the chosen option.
 * @csspart group - A group of options.
 * @csspart group-title - A group's title.
 * @csspart divider - The line between two groups while the separation is divider.
 * @csspart status - The status row after the options.
 * @attr {string} form - The id of the form the combobox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The person changed the text: the native, composed `input` of the text element as they type, delete, paste or an input method commits; one more when the clear button empties the text and when Escape restores it. `inputValue` is already the new text. Never fired when the product sets `inputValue` or `value`, or when a choice writes its label. The product's cue to load options.
 * @fires {CustomEvent<TanreiComboboxChangeDetail>} change - The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * @fires {CustomEvent<TanreiComboboxToggleDetail>} toggle - The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * @fires {CustomEvent<TanreiComboboxChangeDetail>} action - The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 */
export class TanreiCombobox extends LitElement {
  private readonly availability = new AvailabilityController(this, 'combobox');
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = [
    'container',
    'outline',
    'active-indicator',
    'label',
    'requirement-label',
    'input',
    'leading-icon',
    'clear-button',
    'chevron',
    'list',
    'option',
    'option-label',
    'option-supporting-text',
    'option-leading-icon',
    'mark',
    'group',
    'group-title',
    'divider',
    'status',
  ];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: { type: String },
    inputValue: { type: String, attribute: 'input-value' },
    name: { type: String, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    placeholder: { type: String },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    open: { type: Boolean, reflect: true },
    allowCustomValue: { type: Boolean, attribute: 'allow-custom-value', reflect: true },
    filter: { type: String, reflect: true },
    noChevron: { type: Boolean, attribute: 'no-chevron', reflect: true },
    clearable: { type: Boolean, reflect: true },
    clearLabel: { type: String, attribute: 'clear-label' },
    status: { type: String, reflect: true },
    statusText: { type: String, attribute: 'status-text' },
    emptyText: { type: String, attribute: 'empty-text' },
    separation: { type: String, reflect: true },
    iconSpace: { type: String, attribute: 'icon-space', reflect: true },
    inline: { type: Boolean, reflect: true },
    hasLeading: { state: true },
    focused: { state: true },
    formDisabled: { state: true },
  };

  /** The look, as the text inputs beside it: `stacked` is a filled box that draws no label — the label above it is the row of the Field that frames it; `filled` and `outlined` float the label inside the box. Use one style per form. A value the combobox does not know by name is laid out as stacked. Reflected. */
  variant: TanreiComboboxVariant = 'stacked';

  /** The container's minimum height: `medium` or `large` (48 / 56 in the default system), the text input's two sizes. The hit area always meets the minimum target. Reflected. */
  size: TanreiComboboxSize = 'medium';

  /** The committed choice: the chosen option's value, or, with `allowCustomValue`, a text the person typed that names no option. Empty while nothing is chosen. The `value` attribute is the value a form reset returns to. */
  value = '';

  /** The text in the input (`input-value`). The combobox writes it as the person types and when a value is chosen or restored; the product may set it, and reads it from `input` to load options. */
  // An accessor, not a field: the text is the person's at every moment (CBF-3). The native `input`
  // event is the browser's own and composed — a capturing listener on an ancestor hears it before the element's own
  // listener has run — so what the person has just typed into the native element and the element has not taken yet is
  // read from that element. `event.target.inputValue` is then the new text in every listener, and in every listener of
  // an element composed around this one.
  get inputValue(): string {
    const native = this.nativeSeen === undefined ? null : this.input;
    return native && native.value !== this.nativeSeen ? native.value : this.text;
  }

  set inputValue(text: string) {
    this.text = text;
  }

  /** The text the element holds: what the product set, what the combobox wrote, or the person's last edit as the element took it. */
  private text = '';
  /** What the native element held when the element last wrote to it or took from it; undefined until it has. */
  private nativeSeen: string | undefined;

  /** The name the value is submitted under in a form. Reflected. */
  name = '';

  /** The combobox's own accessible name, for a combobox no Field frames or one whose visible label is elsewhere; a filled or an outlined combobox draws it floating. Inside a Field leave it empty: the Field's label names the combobox, and its own would win. */
  label = '';

  /** Does not draw the floating label of a filled or an outlined combobox, which stays the accessible name (`label-hidden`). Inside a Field, hide the label on the Field. */
  labelHidden = false;

  /** A hint shown while the input is empty and the label is not in the input line. Never a replacement for `label`. */
  placeholder = '';

  /** Puts the combobox in the error condition: its box is drawn from its error parts and it is exposed as invalid. Inside a Field, set `error` on the Field, which also shows the words. The combobox never sets this itself. */
  error = false;

  /** Disables the combobox: it takes no focus, cannot be edited, does not open and is left out of form submission. Inside a Field, disable the Field, so that its label follows. */
  disabled = false;

  /** The value is shown, can be focused, selected and copied, and is submitted, but cannot be changed: the list does not open and neither the chevron nor the clear button is drawn. The attribute is `readonly`. */
  readOnly = false;

  /** Whether the list is shown. The combobox opens and closes itself and emits `toggle`; the product may also set it (to open on focus, for one). Ignored while the combobox is disabled or read-only or has nothing to show. Reflected. */
  open = false;

  /** False: the value is always one of the options, and a text that names none is given up when the person leaves. True: the options are suggestions, and a text that names none becomes the value as typed (`allow-custom-value`). Reflected. */
  allowCustomValue = false;

  /** Who decides which options answer the text. `contains`: the combobox shows the options whose label contains what was typed, ignoring case, width and marks, and marks the match. `none`: it shows every option it is given and the product filters, on `input`. Reflected. */
  filter: TanreiComboboxFilter = 'contains';

  /** Draws no chevron (`no-chevron`: the spec's `chevron`, inverted, because a boolean attribute cannot default to true): for a field whose suggestions exist only for what was typed. The list then opens by typing and by the arrow keys alone. Reflected. */
  noChevron = false;

  /** Draws a clear button while the text is not empty, for a combobox whose value may be none. Without it, emptying the text and leaving the field clears the value. Reflected. */
  clearable = false;

  /** The clear button's accessible name, in the product's language (`clear-label`). Required while `clearable` is true. */
  clearLabel = '';

  /** What the product's source of options is doing: `idle`, `loading` (the status row shows a loading indicator and the list is marked busy) or `error` (the status row shows `statusText` as an error, announced at once). Reflected. */
  status: TanreiComboboxStatus = 'idle';

  /** The status row's text, in the product's language (`status-text`), announced when it changes: a count, that loading failed, or, while loading, the loading indicator's name. */
  statusText = '';

  /** Shown in the list while the text names nothing the combobox can show, `allowCustomValue` is false and no status is set (`empty-text`): this instance's words, else the product's (`setWords({ emptyText })`). Tanrei has none: without them no such row is drawn. */
  emptyText = '';

  /** How a group of options is told from what is next to it: `divider`, `gap`, or `auto` for the design system's answer (`--tanrei-comp-combobox-separation`). */
  separation: TanreiComboboxSeparation = 'auto';

  /**
   * Whether a shown option keeps the room of the leading icon column where it has no icon, so that the labels of a
   * section — the shown options of a group, or a run of shown options outside any group — start on one line (CMB-67):
   * `auto` while another shown option of its section has a `leading-icon` (one the filter hides does not count),
   * `always` in every option, `never` only where it has one.
   */
  iconSpace: TanreiComboboxIconSpace = 'auto';

  /** For tests and fixtures: draws the open list in place below the field — inside its positioned ancestor, which stands for the window — not in the top layer; it then answers no dismissal. */
  inline = false;

  /** Whether the leading-icon slot has content. */
  protected hasLeading = false;
  /** CMB-15: the input has focus, however it was gained. */
  protected focused = false;
  /** Set by an ancestor `<fieldset disabled>` (the element's `formDisabledCallback`). */
  protected formDisabled = false;

  private readonly internals: ElementInternals = this.attachInternals();
  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says = new FormSays(this, this.internals);
  /** Whether the list is presented: open, usable, and beside a container in the page. */
  private presented = false;
  private unregister: (() => void) | null = null;

  // ── CMB-17: the two things the combobox holds ─────────────────────────────────────────────────────────────────
  /** The text the combobox itself wrote or took from the person last: another `inputValue` is the product's. */
  private ownText = '';
  /** The value the combobox committed or took from the product last: another `value` is the product's. */
  private ownValue = '';
  /** The person is editing: the text was changed since the last commit (CMB-17). */
  private editing = false;
  /** CMB-25: the text the list is filtered by; null shows every option (a list opened by an arrow key or the chevron). */
  private query: string | null = null;
  /** The text was last taken during a composition: its end makes the first match active (CMB-26). */
  private composedText = false;
  /**
   * CMB-29: a Tab went down in the field and its focus move has not been seen yet: the focus-out that follows is that
   * move, and a list it closes says tab. It is taken by that focus-out, and given up when the key comes up without one
   * (the move was cancelled) or another key goes down — never by a timer, which the browser may run after later
   * tasks: a focus move made by the product after the Tab would be reported as the Tab's.
   */
  private tabbing = false;

  /** CMB-56: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'combobox', behavior: 'CMB-56', axes: AXES });
  /** CMB-44: where style queries are missing the system's separation is read by script, again when the system is switched. */
  private readonly system = new SystemWatchController(this);
  /**
   * CMB-61: the combobox's side of the exchange with the Field that frames it (src/primitives/field.ts). It takes the
   * Field's name, description and states, whether the label is hidden and whether an asterisk follows it; and it says
   * what only it knows — that it draws the label, how far its input text is inset, and that it is drawn focused while
   * its list is open. It has an error condition of its own (CMB-10). No Field: it is drawn as a bare combobox.
   */
  private readonly frame = new FieldControlController(this, {
    errorCondition: true,
    named: () => !!this.label.trim(),
    says: () => this.saysToField,
    changed: () => (this.frameChanged = true),
  });
  /** The Field's answer changed since the last update: the floating label may have other lines (CMB-8). */
  private frameChanged = false;
  /** CMB-31: the options, read from the children and read again when they change (src/primitives/option-list.ts). */
  private readonly options$ = new OptionsController(this);
  /** CMB-24, CMB-26, CMB-27, CMB-40, CMB-41: the active option, the keys that move it, the press and the choice. */
  private readonly list = new OptionListController(this, {
    model: () => this.shown,
    chosen: () => this.chosen,
    choose: (option) => this.choose(option),
    iconSpace: () => (OPTION_ICON_SPACES.includes(this.iconSpace) ? this.iconSpace : 'auto'),
    // CMB-26: an active option that is no longer shown gives way to what typing would have found.
    replacement: (options) => (this.native.composing ? null : this.found(options)),
  });
  /** CMB-22, CMB-23, CMB-58: where the list is — the anchored surface a popover is drawn on, as wide as the container. */
  private readonly anchored = anchoredOptionList(this, {
    anchor: () => this.container,
    inline: () => this.inline,
    gone: () => this.closeList('anchor-hidden'),
  });
  /** CMB-30: Escape pressed elsewhere, a press outside and focus arriving elsewhere (src/primitives/dismiss.ts). */
  private readonly dismiss = new DismissController(this, {
    related: () => [this],
    request: (reason: DismissReason) => this.closeList(reason),
  });
  /** CMB-16: the text and the native element kept in step without breaking an input method (src/primitives/native-text.ts). */
  private readonly native = new NativeTextController({
    input: () => this.input,
    value: () => this.text,
    setValue: (text) => this.took(text, this.native.composing),
  });
  /** CMB-8: a floating label that does not fit on one line is given the room its lines take. */
  private readonly floating = new FloatingLabelController(this);
  /** CMB-54: the glyphs of the two slots, the chosen option's own and the options' are marked when the icon set mirrors them. */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="leading-icon"]', drawn: `.leading-own, ${OPTION_MIRRORED}` });
  /** A glyph the combobox draws by name is drawn once the icon set can draw it; until then nothing stands in its place. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>(`.chevron-glyph, .leading-own, .clear-glyph, ${OPTION_GLYPHS}`));

  constructor() {
    super();
    // A `<label for>` of the page activates the element itself: its input takes focus, and nothing opens.
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this) this.focus();
    });
  }

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  private get input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.input') ?? null;
  }

  /** Disabled by its own `disabled`, a fieldset's, or the Field's or the field group's that frames it (CMB-46). */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled || this.frame.disabled;
  }

  /** How the variant is laid out: filled and outlined by name, every other value as stacked (CMB-56). */
  private get layout(): Layout {
    return this.variant === 'filled' || this.variant === 'outlined' ? this.variant : 'stacked';
  }

  /** CMB-56: a filter the combobox does not define is contains, a status idle. */
  private get filterNow(): TanreiComboboxFilter {
    return this.filter === 'none' ? 'none' : 'contains';
  }

  private get statusNow(): TanreiComboboxStatus {
    return STATUSES.includes(this.status) ? this.status : 'idle';
  }

  /** CMB-17, CMB-57: the chosen option — the first, in order and across groups, whose value equals `value`; never one whose value is empty. */
  private get chosen(): OptionData | null {
    return this.value === '' ? null : (this.options$.model.options.find((option) => option.value === this.value) ?? null);
  }

  /** CMB-17: the text of the committed value: the chosen option's label; a value that names no option itself where a custom value is allowed, and nothing otherwise. */
  private get committedText(): string {
    const chosen = this.chosen;
    return chosen ? chosen.label : this.allowCustomValue ? this.value : '';
  }

  // ── CMB-25: which options are shown ───────────────────────────────────────────────────────────────────────────

  private folded: { model: OptionModel; labels: Map<Element, Folded> } | null = null;
  private filtered: { model: OptionModel; query: string; out: OptionModel } | null = null;

  /** An option's label as it is compared, folded once for as long as the options stay. */
  private foldedLabel(option: OptionData): Folded {
    const model = this.options$.model;
    if (this.folded?.model !== model) this.folded = { model, labels: new Map() };
    let folded = this.folded.labels.get(option.element);
    if (!folded) this.folded.labels.set(option.element, (folded = fold(option.label)));
    return folded;
  }

  /** The folded text the combobox filters by now; empty while it shows every option. */
  private get needle(): string {
    return this.filterNow === 'contains' && this.query ? fold(this.query).text : '';
  }

  /** CMB-25: the options shown now, in their order: every one, or, while the combobox filters, those whose label contains the text. */
  private get shown(): OptionModel {
    const model = this.options$.model;
    const query = this.needle;
    if (!query) return model;
    if (this.filtered?.model !== model || this.filtered.query !== query) {
      this.filtered = { model, query, out: filterOptions(model, (option) => this.foldedLabel(option).text.includes(query)) };
    }
    return this.filtered.out;
  }

  /** CMB-60: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** CMB-12: the accessible name — its own label, else the label of the Field that frames it. */
  private get name_(): string {
    return this.frame.name(this.label.trim() ? this.label : '');
  }

  /** CMB-10: in the error condition — its own `error`, or its Field's (FLD-8). */
  private get inError(): boolean {
    return this.error || this.frame.invalid;
  }

  /** CMB-8: the label floats in the box — a filled or an outlined combobox with a name, unless its own `labelHidden` or its Field's says to draw none. */
  private get labelled(): boolean {
    return this.layout !== 'stacked' && !!this.name_ && !this.labelHidden && !this.frame.labelHidden;
  }

  /** CMB-7: an asterisk follows the floating label — the Field's answer (FLD-25); never outside a Field. */
  private get asterisked(): boolean {
    return this.labelled && this.frame.requiredMark === 'asterisk';
  }

  /** CMB-18: the glyph at the start of the container — the slot's, or else the chosen option's own while the person is not editing. */
  private get leading(): 'slot' | 'option' | null {
    return this.hasLeading ? 'slot' : this.chosen?.leadingIcon && !this.editing ? 'option' : null;
  }

  /** CMB-19: the chevron is drawn. */
  private get chevronShown(): boolean {
    return !this.noChevron && !this.readOnly;
  }

  /** CMB-20: the clear button is drawn. */
  private get clearShown(): boolean {
    return this.clearable && this.text !== '' && !this.inert_ && !this.readOnly;
  }

  /**
   * CMB-61: what the combobox says to the Field that frames it. That it draws the label while its look floats one — its
   * name, or nothing while the label is hidden; the Field draws no label row either way. How far its input text
   * stands from its start edge and the padding it keeps at its end edge, as lengths of the box's tokens (`INSET`, in the
   * styles). And that it is drawn focused for as long as its list is open, whether or not it has focus (CMB-15).
   */
  private get saysToField(): FieldSays {
    const size = /^[a-z0-9][a-z0-9-]*$/.test(this.size) ? this.size : 'medium';
    return {
      drawsLabel: this.layout !== 'stacked',
      inset: INSET(size, { leading: !!this.leading, trailing: this.chevronShown || this.clearShown }),
      drawnFocused: this.open && this.usable,
    };
  }

  /** CMB-32: the status row has something of the product's to show. */
  private get statusShown(): boolean {
    return this.statusNow === 'loading' || this.statusText !== '';
  }

  /** CMB-32: nothing matched, and nothing of the product's stands in the status row's place: the empty text is asked for. */
  private get emptyAsked(): boolean {
    return this.shown.options.length === 0 && !this.statusShown && !this.allowCustomValue && this.text !== '';
  }

  /** CMB-32, CMB-60: what says that nothing matched — the instance's emptyText, else the product's words, else nothing. */
  private get emptyWords(): string {
    return this.words.get('emptyText', this.emptyText);
  }

  /** CMB-32: nothing matched, and the combobox says so in the status row's place. */
  private get emptyShown(): boolean {
    return this.emptyAsked && this.emptyWords !== '';
  }

  /** CMB-21, CMB-57: there is something to show: an option after filtering, a status row or the empty text. */
  private get something(): boolean {
    return this.shown.options.length > 0 || this.statusShown || this.emptyShown;
  }

  /** CMB-21, CMB-46, CMB-47, CMB-57: whether the list can be shown at all. */
  private get usable(): boolean {
    return !this.inert_ && !this.readOnly && this.something;
  }

  /** CMB-26: the option typing makes active: the first shown that is not disabled, or none where Enter keeps the text. */
  private found(options: readonly OptionData[]): OptionData | null {
    return this.allowCustomValue ? null : (options.find((option) => !option.disabled) ?? null);
  }

  /** CMB-29: the first option that is not disabled whose whole label is `text`, compared as the filter compares and ignoring the spaces around it. */
  private named(text: string): OptionData | null {
    const wanted = foldText(text);
    if (!wanted) return null;
    return this.options$.model.options.find((option) => !option.disabled && option.value !== '' && foldText(option.label) === wanted) ?? null;
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while its Field says the combobox is required and its value is empty. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity() {
    return this.internals.checkValidity();
  }

  reportValidity() {
    return this.internals.reportValidity();
  }

  /** Moves focus to the input: the combobox's one stop in the focus order (the clear button, while shown, is the next). */
  override focus(options?: FocusOptions) {
    this.input?.focus(options);
  }

  override blur() {
    this.input?.blur();
  }

  /** Selects the text in the input. */
  select() {
    this.input?.select();
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
    this.settle();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? state : '';
    this.settle();
    this.requestUpdate();
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  // ── CMB-16, CMB-17: the text ──────────────────────────────────────────────────────────────────────────────────

  /** The combobox writes the text itself: no `input` is fired, and the element shows it at once (never into a composition). */
  private write(text: string) {
    this.inputValue = text;
    this.ownText = text;
    this.show();
  }

  /** CMB-16, CMB-31: the text is shown in the native element — never into a composition — and what the element then holds is what was seen of it. */
  private show() {
    this.native.show();
    this.nativeSeen = this.input?.value;
  }

  /** The person is no longer editing: the text is the committed value's, and the list shows every option again. */
  private settle() {
    this.editing = false;
    this.query = null;
    this.composedText = false;
  }

  /**
   * CMB-16, CMB-21, CMB-25, CMB-26: the person changed the text. The native `input` is the combobox's event — it is
   * composed and leaves the shadow root by itself. The list is filtered by the text, opened where there is something to
   * show, and the first match becomes the active option — none where a custom value is allowed or an input method is
   * composing, so that Enter keeps what was typed.
   */
  private took(text: string, composing: boolean) {
    // What the native element holds is taken from here on: `inputValue` is the element's own again.
    this.nativeSeen = this.input?.value ?? text;
    if (text === this.text && this.editing && (composing || !this.composedText)) return;
    this.composedText = composing;
    this.inputValue = text;
    this.ownText = text;
    this.editing = true;
    this.query = text;
    if (this.inert_ || this.readOnly) return;
    const active = composing ? null : this.found(this.shown.options);
    if (this.open && this.presented) this.list.setActive(active, true);
    else if (!this.open) this.openList('text', active);
    // CMB-30: a list with nothing left to show closes with the reason empty, once the text is drawn (updated()).
  }

  private onInput(event: Event) {
    if (this.native.composingInput(event)) return;
    const input = event.target as HTMLInputElement;
    this.took(input.value, false);
  }

  /** CMB-27, CMB-28, CMB-29: `value` is committed with the text that stands for it; `change` once while it differs. */
  private commit(value: string, text: string) {
    const changed = value !== this.value;
    this.value = value;
    this.ownValue = value;
    this.write(text);
    this.settle();
    if (changed) this.dispatchEvent(new CustomEvent<TanreiComboboxChangeDetail>('change', { bubbles: true, composed: true, detail: { value, inputValue: text } }));
  }

  /**
   * CMB-21, CMB-30: `toggle` — composed, so that it leaves the shadow root of an element composed around the combobox
   * with that element as its target, and not bubbling, as the platform's own `toggle`: no ancestor hears it.
   */
  private toggled(detail: TanreiComboboxToggleDetail) {
    this.dispatchEvent(new CustomEvent<TanreiComboboxToggleDetail>('toggle', { composed: true, detail }));
  }

  /**
   * CMB-29: resolves the text. An empty text makes the value empty; the whole label of an option that is not disabled
   * chooses the first such option; any other text becomes the value where a custom value is allowed. Returns false
   * where the text names nothing and no custom value is allowed: the caller keeps it (Enter) or gives it up (leaving).
   */
  private resolve(): boolean {
    if (!this.editing) return true;
    const text = this.text;
    if (text === '') this.commit('', '');
    else {
      const option = this.named(text);
      if (option) this.commit(option.value, option.label);
      else if (this.allowCustomValue) this.commit(text, text);
      else return false;
    }
    return true;
  }

  /** CMB-29, CMB-30: the text of the committed value is written back. Returns whether the text changed. */
  private restore(): boolean {
    const text = this.committedText;
    const changed = text !== this.text;
    this.write(text);
    this.settle();
    return changed;
  }

  // ── CMB-21, CMB-27, CMB-30: opening, closing and choosing ─────────────────────────────────────────────────────

  /**
   * CMB-21: the person opens the list. Opened by an arrow key or the chevron it shows every option and the chosen one
   * is active (CMB-26); opened by typing it is filtered and `active` is. `open` is true before `toggle` is fired; the
   * list is presented by the render that follows.
   */
  private openList(how: 'text' | 'key' | 'press', active?: OptionData | null) {
    if (this.open) return;
    if (how !== 'text') this.query = null;
    if (!this.usable) return;
    this.open = true;
    if (how === 'text') this.list.start(true, active ?? null);
    else this.list.start(how === 'key');
    this.toggled({ open: true });
  }

  /** CMB-30: the list closes, for `reason`. `open` is false, and the list no longer takes input, before `toggle` is fired. */
  private closeList(reason: TanreiComboboxToggleReason) {
    if (!this.open) return;
    // An `open` the product set over nothing to show was never a list: it is taken back, and nothing closed.
    const was = this.presented;
    this.open = false;
    this.withdraw();
    if (was) this.toggled({ open: false, reason });
  }

  /** CMB-27: the person confirmed `option`. `value` is the new one before `change`; the list then closes, so `toggle` follows. */
  private choose(option: OptionData) {
    // CMB-17, CMB-57: an option whose value is empty is not a choice.
    if (option.disabled || option.value === '' || this.inert_ || this.readOnly) return;
    this.commit(option.value, option.label);
    this.closeList('select');
  }

  /** CMB-22, CMB-24: into the overlay layer beside the container. Focus stays where it is. */
  private present() {
    if (!this.anchored.show()) return;
    this.presented = true;
    // CMB-23: the whole of the chosen option is in view when the list opens.
    this.list.reveal();
    if (!this.inline) this.dismiss.start();
  }

  /** CMB-30, CMB-45: out of it, fading; closed or closing it takes no pointer input. */
  private withdraw(fade = true) {
    if (!this.presented) return;
    this.presented = false;
    if (this.dismiss.active) {
      this.dismiss.closeOwned();
      this.dismiss.stop();
    }
    this.anchored.hide(fade);
  }

  // ── CMB-16, CMB-21, CMB-26 … CMB-30: the input's keys ─────────────────────────────────────────────────────────

  private onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || this.inert_) return;
    // CMB-16: while an input method composes, every key is its own.
    if (event.isComposing || this.native.composing || event.keyCode === 229) return;
    const { key } = event;
    // CMB-29: Tab moves focus on; the field marks the press (onFieldKeyDown).
    if (key === 'Tab') return;
    if (key === 'Enter') {
      this.enter(event);
      return;
    }
    if (this.readOnly) return;
    const open = this.open && this.presented;
    if (key === 'Escape') {
      if (open) {
        // CMB-30: the key closes the list and goes no further.
        event.preventDefault();
        event.stopPropagation();
        this.closeList('escape');
      } else if (this.editing && this.text !== this.committedText) {
        // CMB-30: a second Escape restores the committed value's text, and never clears a value.
        event.preventDefault();
        event.stopPropagation();
        this.restore();
        this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'historyUndo' }));
      }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (!open) {
        // CMB-21: with or without Alt, the list opens with every option.
        this.openList('key');
        if (this.open) event.preventDefault();
        return;
      }
      event.preventDefault();
      const { options } = this.shown;
      // CMB-26: where a custom value is allowed, Up Arrow on the first gives Enter back to the text.
      if (key === 'ArrowUp' && this.allowCustomValue && options.length > 0 && this.list.active?.element === options[0].element) this.list.setActive(null, true);
      else this.list.key(key);
      return;
    }
    // CMB-26: the page keys move by ten; Home, End, Left and Right Arrow are the text's.
    if ((key === 'PageDown' || key === 'PageUp') && open) {
      event.preventDefault();
      this.list.key(key);
    }
  }

  /**
   * CMB-27, CMB-28: Enter. With an option active it chooses it and does nothing else. With none it commits the text —
   * and where the text names nothing and no custom value is allowed, keeps it and keeps or opens the list — then fires
   * `action` after any `change` it caused, and asks the form to submit unless `action` was cancelled.
   */
  private enter(event: KeyboardEvent) {
    if (this.open && this.presented && this.list.active) {
      event.preventDefault();
      if (!this.readOnly) this.list.activate(event);
      return;
    }
    if (!this.resolve()) {
      event.preventDefault();
      if (!this.open) this.openList('text', null);
      return;
    }
    if (this.open) this.closeList('commit');
    const action = new CustomEvent<TanreiComboboxChangeDetail>('action', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value, inputValue: this.text } });
    // Its own form, or the form of the element composed around it (src/primitives/default-button.ts, `formOf`).
    const form = this.dispatchEvent(action) ? formOf(this, this.form) : null;
    if (form) {
      event.preventDefault();
      pressDefaultButton(form);
    }
  }

  private onFocus() {
    this.focused = true;
    // CMB-15: where style queries are missing, the focus style is read when focus arrives.
    syncFocusStyle(this, this.renderRoot.querySelector<HTMLElement>('.field'));
  }

  private onBlur() {
    this.focused = false;
  }

  /** CMB-29: every key that goes down in the field — the input's and the clear button's — says whether a Tab is moving focus. */
  private onFieldKeyDown(event: KeyboardEvent) {
    this.tabbing = event.key === 'Tab';
  }

  /** CMB-29: a Tab that comes up in the field moved no focus out of it (something cancelled it): it is over. */
  private onFieldKeyUp(event: KeyboardEvent) {
    if (event.key === 'Tab') this.tabbing = false;
  }

  /**
   * CMB-29: focus leaves the combobox — the input and, while it is shown, the clear button. The text is resolved, or
   * given up where it names nothing; the active option is not chosen; an open list closes with the reason tab or
   * focus-out. Focus that leaves the window has gone nowhere: nothing is resolved until it goes elsewhere in the page.
   */
  private onFocusOut(event: FocusEvent) {
    // A Tab's focus move is this one, wherever it goes: within the field, out of the window or elsewhere in the page.
    const tabbed = this.tabbing;
    this.tabbing = false;
    const next = event.relatedTarget as Node | null;
    if (next && this.renderRoot.contains(next)) return;
    if (!next && !document.hasFocus()) return;
    if (this.inert_ || this.readOnly) return;
    if (!this.resolve()) this.restore();
    this.closeList(tabbed ? 'tab' : 'focus-out');
  }

  /**
   * CMB-14: a press on the container's padding or on a decorative glyph moves focus to the input and does nothing
   * else. A press in the input places the caret; the clear button and the chevron answer their own click, and focus
   * stays where it is (the clear button is reached by Tab).
   */
  private onContainerPress(event: MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest('.input')) return;
    // The press must not take the focus it gives — nor take it from the input: where a pressed button takes no focus
    // (Safari), a press on the clear button or the chevron would leave the field, and resolve the text.
    event.preventDefault();
    if (!this.inert_ && !target.closest('.chevron, .clear-box')) this.focus();
  }

  /** CMB-19: a press on the chevron opens the list while it is closed and closes it while it is open; focus is the input's. */
  private onChevron() {
    if (this.inert_ || this.readOnly) return;
    this.focus({ preventScroll: true });
    if (this.open && this.presented) this.closeList('press');
    else this.openList('press');
  }

  /**
   * CMB-20: the clear button empties the text and the value: `input` once with the empty text, `change` once while the
   * value was not empty, focus to the input, and the list left as it is — showing every option while open.
   */
  private onClear() {
    if (this.inert_ || this.readOnly) return;
    const had = this.value !== '';
    this.value = '';
    this.ownValue = '';
    this.write('');
    this.settle();
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
    if (had) this.dispatchEvent(new CustomEvent<TanreiComboboxChangeDetail>('change', { bubbles: true, composed: true, detail: { value: '', inputValue: '' } }));
    this.focus();
  }

  private onLeadingSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this.hasLeading = slot.assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim());
    // CMB-18: the slot's content is a glyph only.
    void slottedInteractive(slot).then((found) => {
      if (found) report(this, 'CMB-18', `the leading-icon slot holds an interactive element (<${found.localName}>); it takes a glyph only`);
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    // The list belongs to the overlay the combobox stands in, and closes with it.
    this.unregister = registerOverlay(this, {
      openers: () => [this],
      open: () => this.presented,
      close: () => this.closeList('anchor-hidden'),
      kind: 'combobox',
    });
    // Put back in the page while open: presented again, as mounted.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unregister?.();
    this.unregister = null;
    // The controllers take the surface out of the top layer and stop listening.
    this.presented = false;
    this.focused = false;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the glyphs' room: the light-DOM children are there before the slots say so.
    if (!this.hasUpdated) this.hasLeading = [...this.children].some((child) => child.slot === 'leading-icon');
    if (this.inert_) this.focused = false;

    // CMB-31: a value or a text the product set. A value shows its text and ends an edit; a text is shown, and the list
    // is filtered by it as by typed text. Neither fires anything.
    const valueSet = changed.has('value') && this.value !== this.ownValue;
    const textSet = changed.has('inputValue') && this.text !== this.ownText;
    if (valueSet) {
      this.ownValue = this.value;
      if (!textSet) this.settle();
    }
    if (textSet) {
      this.ownText = this.text;
      this.editing = this.text !== this.committedText;
      this.query = this.editing ? this.text : null;
      this.composedText = false;
    }
    // CMB-17, CMB-31: while the person is not editing, the text is the committed value's — also when the options that
    // name it arrive later. A text the person is editing is never touched.
    if (!this.editing) {
      const text = this.committedText;
      if (text !== this.text) {
        this.inputValue = text;
        this.ownText = text;
      }
    }

    // CMB-24, CMB-26: the list runs for as long as it is shown, from the render that shows it. Opened by the product,
    // the chosen option is the active one — or, over a text that is being edited, what typing would have found.
    const shown = this.open && this.usable && this.isConnected;
    if (shown) {
      if (!this.list.started) this.list.start(false, this.editing ? (this.native.composing ? null : this.found(this.shown.options)) : undefined);
    } else this.list.stop();
  }

  protected override updated(changed: PropertyValues) {
    // CMB-16, CMB-31: the text is shown in the element — never into a composition.
    this.show();
    // CMB-8: a floating label whose words, mark or text style changed — its own, or what its Field gives — may wrap.
    if (this.frameChanged || changed.has('label') || changed.has('labelHidden') || changed.has('variant') || changed.has('size')) this.floating.measure();
    this.frameChanged = false;

    // CMB-31: the product's `open`, and what makes the list unusable, show or remove the list without `toggle`.
    const want = this.open && this.usable && this.isConnected;
    if (changed.has('inline') && this.presented) this.withdraw(false);
    if (want && !this.presented) this.present();
    else if (!want && this.presented) {
      // CMB-30: nothing is left to show — the filter left no option, or the product emptied the options and the
      // status: the list closes with the reason empty. Disabled or read-only while open, it is closed and says nothing.
      if (this.open && !this.inert_ && !this.readOnly && this.isConnected) this.closeList('empty');
      else {
        this.withdraw();
        if (this.open) this.open = false;
      }
    } else if (this.presented) this.anchored.request();

    // The form's view: the committed value — never the text of an edit — left out while disabled; a missing value while
    // the Field that frames it says it is required (CMB-12, CMB-59). Said through `FormSays`, so that an element
    // composed around the combobox repeats it on its own internals.
    this.says.value(this.inert_ ? null : this.value, this.value);
    if (this.frame.required && this.value === '' && !this.inert_ && !this.readOnly) {
      this.says.validity({ valueMissing: true }, missingValueMessage('text', { errorText: '', requiredText: this.frame.state?.requiredText ?? '', label: this.name_ }), this.input ?? undefined);
    } else this.says.validity();
    whenParsed(() => this.reports(changed));
  }

  private reportedOptions = '';

  /** What a debug build tells the developer; the combobox still renders. */
  private reports(changed: PropertyValues) {
    if (!this.isConnected) return;
    // CMB-12: a combobox no Field names, with no label of its own, still renders. (A Field with an empty label says so itself: FLD-10.)
    if (!this.label.trim() && !this.frame.state) report(this, 'CMB-12', 'label is empty and no field frames it, so the combobox has no accessible name; put it in a field with a label, or give it a label');
    if (this.clearable && this.words.lacks('clearLabel', this.clearLabel)) report(this, 'CMB-20', 'clearLabel is empty, so the clear button has no accessible name; give it one ("Clear")');
    // CMB-32, CMB-60: only where the row would be drawn — a person typed, or the product opened the list on, a text that
    // matches nothing. (Without the words the list has nothing to show and is not open: `open` is taken back.)
    if (this.emptyAsked && !this.emptyWords && !this.inert_ && !this.readOnly && (this.focused || this.open || changed.has('open'))) {
      this.words.missing('emptyText', { id: 'CMB-32', effect: 'a text that matches nothing draws no row in the list' });
    }
    if (changed.has('filter') && !FILTERS.includes(this.filter)) report(this, 'CMB-56', `filter "${this.filter}" is not contains or none; it behaves as "contains"`);
    if (changed.has('status') && !STATUSES.includes(this.status)) report(this, 'CMB-56', `status "${this.status}" is not idle, loading or error; it behaves as "idle"`);
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'CMB-44', `separation "${this.separation}" is not auto, divider or gap; it behaves as "auto"`);
    }
    // CMB-67: an iconSpace the combobox does not define is auto; a debug build says so.
    if (changed.has('iconSpace') && !OPTION_ICON_SPACES.includes(this.iconSpace)) {
      report(this, 'CMB-67', `iconSpace "${this.iconSpace}" is not auto, always or never; it behaves as "auto"`);
    }
    const { options, nested } = this.options$.model;
    // The options are reported when they change — not on every render.
    const signature = `${options.map((option) => `${option.value}\u0001${option.label}`).join('\u0000')}\u0000${nested.length}`;
    if (signature === this.reportedOptions) return;
    this.reportedOptions = signature;
    if (options.some((option) => !option.label)) report(this, 'CMB-57', `an option has an empty label, so it has no accessible name; give each <${OPTION_TAG}> a label or a text`);
    if (options.some((option) => option.value === '')) report(this, 'CMB-57', `an option has the empty value, which means that nothing is chosen: it is drawn and cannot be chosen; give each <${OPTION_TAG}> a value`);
    const seen = new Set<string>();
    for (const option of options) {
      if (seen.has(option.value)) report(this, 'CMB-57', `two options share the value "${option.value}"; the first is the one both stand for`);
      seen.add(option.value);
    }
    if (nested.length) report(this, 'CMB-43', `a <${OPTION_GROUP_TAG}> stands inside another; its options are drawn as the outer group's, with no title or separation of its own`);
  }

  /** CMB-38: an option's label with the first run that matched the text in a `<mark>`: one text, drawn heavier there. */
  private readonly labelText = (option: OptionData): unknown => {
    const run = matchRun(this.foldedLabel(option), this.needle);
    // The run is drawn, not said: without a role of its own it is no node of the option's label for assistive technology.
    return run ? html`${run[0]}<mark role="none">${run[1]}</mark>${run[2]}` : option.label;
  };

  /**
   * CMB-32, CMB-33: the status row, after the last option. Its two live regions exist from the moment the list opens —
   * the polite one holds statusText, or the empty text, while idle; the assertive one statusText while the source
   * failed; while loading both are empty, so nothing is announced, and the loading indicator, named by statusText,
   * stands in the text's place.
   */
  private renderStatus() {
    const status = this.statusNow;
    const said = status === 'idle' ? this.statusText || (this.emptyShown ? this.emptyWords : '') : '';
    return html`<div part="status" class=${status === 'error' ? 'status error' : 'status'} ?data-shown=${this.statusShown || this.emptyShown}>
      ${status === 'loading' ? html`<tanrei-loading-indicator class="spinner" size="small" label=${this.statusText}></tanrei-loading-indicator>` : nothing}<span class="said" role="status">${said}</span
      ><span class="said" role="alert">${status === 'error' ? this.statusText : ''}</span>
    </div>`;
  }

  protected override render() {
    const layout = this.layout;
    const stacked = layout === 'stacked';
    const inert = this.inert_;
    const chosen = this.chosen;
    const name = this.name_;
    const expanded = this.open && this.usable;
    const leading = this.leading;
    const chevron = this.chevronShown;
    const clear = this.clearShown;
    // CMB-8: the label floats in a filled or an outlined box, and nowhere else.
    const floating = this.labelled;
    // CMB-7: the asterisk follows a floating label while the Field says so (FLD-25); hidden from assistive technology,
    // because the required state already says it.
    const asterisk = floating ? floatingAsterisk(this.asterisked ? 'asterisk' : 'none') : nothing;
    // CMB-12: the description is what the Field gives — its shown supporting or error text and its optional text.
    const described = this.frame.description();
    // CMB-55: typed text is laid out by its own direction once it has a letter to tell it by; until then the input
    // keeps the layout's direction, so the caret and the placeholder stand at the box's start edge.
    const own = /\p{L}/u.test(this.text) ? 'auto' : nothing;
    // The text is the chosen option's label for as long as nobody has changed it: its words are in that option's
    // language, and in its direction where the option says one (`lang`, `dir` on the option or its group).
    const said = chosen && this.text === chosen.label ? chosen : null;
    // CMB-12, CMB-48: the input is an editable combobox named by its own label, else by the Field's — drawn or not, and
    // never by the placeholder — and described by what the Field gives. They are values written on this element
    // (`aria-label`; the description as a text of this shadow root), because an id cannot be referenced across a
    // shadow root. The drawn label and every glyph are kept from assistive technology.
    return html`
      <div
        class="field"
        data-layout=${layout}
        ?data-error=${this.inError}
        ?data-disabled=${inert}
        ?data-focused=${(this.focused || expanded) && !inert}
        ?data-labelled=${floating}
        ?data-has-value=${this.text !== ''}
        data-leading=${leading ?? nothing}
        ?data-chevron=${chevron}
        ?data-clear=${clear}
        @focusout=${this.onFocusOut}
        @keydown=${this.onFieldKeyDown}
        @keyup=${this.onFieldKeyUp}
      >
        <div part="container" class="container" data-tanrei-shape aria-disabled=${inert ? 'true' : nothing} @mousedown=${this.onContainerPress}>
          <span part="leading-icon" class="icon leading-slot" aria-hidden="true"><slot name="leading-icon" @slotchange=${this.onLeadingSlotChange}></slot></span>
          <span part="leading-icon" class="icon leading-own" aria-hidden="true"><span class="ink">${leading === 'option' ? chosen?.leadingIcon : nothing}</span></span>
          <div class="body">
            <input
              id="input"
              part="input"
              class="input"
              type="text"
              role="combobox"
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              lang=${said?.lang || nothing}
              dir=${said?.dir || own}
              .placeholder=${this.placeholder}
              ?disabled=${inert}
              ?readonly=${this.readOnly}
              aria-label=${name || nothing}
              aria-describedby=${described ? 'description' : nothing}
              aria-invalid=${this.inError ? 'true' : nothing}
              aria-required=${this.frame.required ? 'true' : nothing}
              aria-readonly=${this.readOnly ? 'true' : nothing}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded=${expanded ? 'true' : 'false'}
              aria-controls=${expanded ? 'list' : nothing}
              aria-activedescendant=${(expanded && this.list.activeId) || nothing}
              @input=${this.onInput}
              @keydown=${this.onKeyDown}
              @focus=${this.onFocus}
              @blur=${this.onBlur}
              @compositionstart=${this.native.onCompositionStart}
              @compositionend=${this.native.onCompositionEnd}
            />
          </div>
          ${clear
            ? html`<span class="clear-box"
                ><tanrei-button part="clear-button" class="clear" variant="text" size="small" label=${this.words.get('clearLabel', this.clearLabel)} @click=${this.onClear}
                  ><span slot="icon" class="clear-glyph"><span class="ink">close</span></span></tanrei-button
                ></span
              >`
            : nothing}${chevron
            ? html`<button part="chevron" class="chevron" type="button" tabindex="-1" aria-label=${name} aria-expanded=${expanded ? 'true' : 'false'} ?disabled=${inert} @click=${this.onChevron}>
                <span class="icon chevron-glyph" aria-hidden="true"><span class="ink">expand_more</span></span>
              </button>`
            : nothing}
          ${floatingLabel({ floating, label: name, asterisk })} ${triggerEdges({ stacked, floating, label: name, asterisk })}
        </div>
        <span id="name" hidden>${name}</span>
        ${described ? html`<span id="description" hidden>${described}</span>` : nothing}
      </div>
      ${this.list.render({ labelledBy: 'name', inline: this.inline, text: this.labelText, after: this.renderStatus(), tail: this.statusShown || this.emptyShown, busy: this.statusNow === 'loading' })}
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiCombobox);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiCombobox);
if (!customElements.get('tanrei-combobox')) customElements.define('tanrei-combobox', TanreiCombobox);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-combobox': TanreiCombobox;
  }
}

import { type ComplexAttributeConverter, LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html as staticHtml, literal } from 'lit/static-html.js';
import {
  AvailabilityController,
  FollowController,
  GlyphDrawnController,
  KeptLengths,
  GlyphMirrorController,
  type KeyboardConvention,
  LinkController,
  type LinkForm,
  NativeTextController,
  OpenAxesController,
  PressController,
  SHORTCUT_UPDATE,
  SystemWatchController,
  type TanreiLinkTarget,
  ambientConvention,
  assignSlot,
  chordsConverter,
  chordsOf,
  deepActive,
  focusWithin,
  holdPageScroll,
  hostAria,
  linkAttributes,
  markGlyph,
  modalLayer,
  naturalHeight,
  notifyItemUpdate,
  placeMenu,
  platformConvention,
  report,
  syncFocusStyle,
  trapFocus,
  viewportKey,
  visibleViewport,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
// SRC-37: the shortcut hint is drawn by the keyboard shortcut; SRC-47: the status row's indicator is the loading indicator.
import '../keyboard-shortcut/keyboard-shortcut.js';
import type { TanreiKeyboardShortcut } from '../keyboard-shortcut/keyboard-shortcut.js';
import '../loading-indicator/loading-indicator.js';
import { pressDefaultButton } from '../../primitives/default-button.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { AXES, groupStyles, rowStyles, styles, suggestionStyles } from './search.styles.js';
import type { TanreiSearchDensityRegistry } from '../../registry.js';
import { ownDirection } from '../../styles/product-text.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/**
 * The glyphs of the system's icon set the search draws — the spec's names, not values; it draws no mark of
 * its own: the leading magnifier (SRC-2, not mirrored), the clear button's close (SRC-10, not mirrored) and the back
 * button's arrow (SRC-11, mirrored in right-to-left by the styles).
 */
const SEARCH_GLYPH = 'search';
const CLOSE_GLYPH = 'close';
const BACK_GLYPH = 'arrow_back';

/** Where the view opens: under the bar, in a modal dialog near the top of the window, or over the whole window; the last two have their own header. */
export type TanreiSearchPresentation = 'docked' | 'dialog' | 'full-screen';
const PRESENTATIONS: readonly TanreiSearchPresentation[] = ['docked', 'dialog', 'full-screen'];

/** What stands where the search is placed: the bar with its input, a trigger shaped like the bar, or an icon-only Button. */
export type TanreiSearchBar = 'field' | 'button' | 'icon';
const BARS: readonly TanreiSearchBar[] = ['field', 'button', 'icon'];

/** What the product's search is doing: nothing awaited, a query running, or a query failed. */
export type TanreiSearchStatus = 'idle' | 'loading' | 'error';
const STATUSES: readonly TanreiSearchStatus[] = ['idle', 'loading', 'error'];
/** Whether a row of the view keeps the leading icon column where it has no icon (SRC-52). A closed set: the menu's values. */
export type TanreiSearchIconSpace = 'auto' | 'always' | 'never';
/** How much room a row of the view takes (SRC-53): `regular`, `compact`, or a density a design system added. */
export type TanreiSearchDensity = keyof TanreiSearchDensityRegistry;
const ICON_SPACES: readonly TanreiSearchIconSpace[] = ['auto', 'always', 'never'];

/**
 * Why the search closes its view (SRC-6), by the spec's names. `back` is the full-screen view's back button, or the
 * browser's own close request without a key (Android's back gesture); Escape is `escape`.
 */
export type TanreiSearchCloseReason = 'escape' | 'back' | 'select' | 'submit' | 'outside' | 'tab' | 'focus-out' | 'shortcut';

/** What `toggle` carries: the new `expanded`, and when closing, why. */
export interface TanreiSearchToggleDetail {
  expanded: boolean;
  reason: TanreiSearchCloseReason | null;
}
/** What `submit` carries: the value when the action key was pressed. */
export interface TanreiSearchSubmitDetail {
  value: string;
}
/** What `select` carries: the `value` of the chosen suggestion, or of the result activated in place. */
export interface TanreiSearchSelectDetail {
  value: string;
}

/**
 * A suggestion the search offers while the person types — the spec's item kind `suggestion`: a query they searched
 * before, or a completion. Choosing it fires `select` and the product sets the value; a thing the product opens is a
 * `<tanrei-search-result>`. It is data, as an `<option>` in a `<datalist>`: the search draws the row, names it and
 * answers it; the element itself draws nothing.
 *
 * @tag tanrei-search-suggestion
 */
export class TanreiSearchSuggestion extends TanreiElement {
  static override styles = suggestionStyles;

  static override properties: PropertyDeclarations = {
    value: { type: String },
    headline: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    leadingIcon: { type: String, attribute: 'leading-icon' },
  };

  /** Identifies the suggestion; `select` carries it. Unique among the suggestions. */
  value = '';

  /** The suggestion's text, and its accessible name. */
  headline = '';

  /** A second line under the headline ("Folder · 24 messages"), and its description (`supporting-text`). */
  supportingText = '';

  /** The name of a glyph of the system's icon set at the row's start (history, folder); empty draws none (`leading-icon`). A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. */
  leadingIcon = '';

  protected override updated() {
    // The search re-reads its suggestions whenever one changes; an internal event, kept out of the suggestion's public API.
    notifyItemUpdate(this, 'tanrei-search-suggestion-update');
  }

  protected override render() {
    return nothing;
  }
}

const SUGGESTION = 'tanrei-search-suggestion';
const RESULT = 'tanrei-search-result';
const RESULT_GROUP = 'tanrei-search-result-group';
/** The search's slot for its results and result groups: the search puts them there itself (SRC-46). */
const RESULT_SLOT = 'result';
/** A result tells its search that a prop the search reads changed; an internal event, kept out of the public API. */
const RESULT_UPDATE = 'tanrei-search-result-update';

/**
 * SRC-43: an excerpt as runs of text in order — the second, fourth and every further even run is a match. An array is
 * the runs; a string is the attribute: a JSON array of them, or one run (a passage without marks).
 */
function runsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((run) => String(run ?? ''));
  if (typeof value !== 'string' || value === '') return [];
  if (value.trimStart().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((run) => String(run ?? ''));
    } catch {
      // Not JSON: a passage that begins with a bracket.
    }
  }
  return [value];
}
const runsConverter: ComplexAttributeConverter<string[]> = {
  fromAttribute: (value) => runsOf(value),
  toAttribute: (value) => JSON.stringify(runsOf(value)),
};

/** The child nodes of `host` that hold something: an element, or text that is not white space alone. */
const contentNodes = (host: Element): (Element | Text)[] =>
  [...host.childNodes].filter((node): node is Element | Text => node instanceof Element || (node instanceof Text && !!node.data.trim()));

/**
 * What a result and a linked group heading share (SRC-42 … SRC-45): the destination props of a link, the row — a
 * suggestion's row, drawn by the element because the row is its own `<a>` — and the excerpt with its marks. It holds no
 * listener of its own: the search it is in answers its press, its keys and its activation.
 */
export abstract class TanreiSearchRow extends TanreiElement {
  static override properties: PropertyDeclarations = {
    value: { type: String },
    headline: { type: String },
    excerpt: { converter: runsConverter },
    leadingIcon: { type: String, attribute: 'leading-icon' },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    iconColumn: { attribute: false },
    current: { attribute: false },
  };

  /** Identifies it; `select` carries it. Unique among the search's suggestions, results and result groups. */
  value = '';

  /** Its title, and its accessible name. */
  headline = '';

  /**
   * A passage of the thing found, as runs of text in order: the first, third, fifth… run is plain text and the second,
   * fourth… is a match, drawn marked (`["Tokens are ", "design", " decisions"]` marks "design"; a passage that begins
   * with a match begins with an empty run). The attribute holds a JSON array of the runs, or one run as plain text. It is
   * used only while the element has no excerpt as child content. The search never looks for the query in the text.
   */
  excerpt: string[] = [];

  /** The name of a glyph of the system's icon set at the row's start (article, tag); empty draws none (`leading-icon`). A glyph the icon set flags as showing a direction is drawn mirrored in a right-to-left layout. */
  leadingIcon = '';

  /**
   * Where it goes: a URL, a path or a fragment. Not empty, it makes the row an `<a>`, which the browser
   * opens as it opens any link — a new tab by a modifier key or the middle button, the context menu, the address shown
   * before it is followed. Empty, or naming a script, the row is a `<button>` and `select` is all that happens.
   */
  href = '';

  /** Where the destination opens: `same` — where the person is — or `new`, a new tab or window, which `targetLabel` says. Ignored without `href`. */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads after the excerpt while `target` is `new` ("opens in a new tab"; `target-label`). */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `noopener` is added for a new context. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download`. */
  download: string | null = null;

  /** @internal SRC-42, SRC-52: the row keeps the leading icon column — the search's iconSpace keeps it, or the row has an icon. */
  iconColumn = false;

  /**
   * @internal SRC-49: the row is the one the action key in the search's input takes — the first result while the view
   * holds no suggestion — and is drawn as a focused one (SRC-42) while focus stays in the input.
   */
  current = false;

  /** SRC-45: the link the row is while it has a destination, and what a debug build is told (src/primitives/link.ts). */
  protected readonly link = new LinkController(this, { ids: { refused: 'SRC-45', newContext: 'SRC-45' }, disabled: () => false });

  /** The element's own child nodes that are its excerpt (text, with `<mark>` elements for the matches). */
  protected abstract excerptNodes(): (Element | Text)[];

  /** @internal The row: the `<a>` of a result with a destination, the `<button>` of one without; null where none is drawn. */
  get row(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.row') ?? null;
  }

  /** @internal SRC-45: the link the row is now, or null: it is a button. */
  get destination(): LinkForm | null {
    return this.link.form;
  }

  /** SRC-43: the excerpt as one text — the result's description, with no word about the marks. */
  private get excerptText(): string {
    const nodes = this.excerptNodes();
    const text = nodes.length ? nodes.map((node) => node.textContent ?? '').join('') : runsOf(this.excerpt).join('');
    return text.replace(/\s+/g, ' ').trim();
  }

  /** `element.focus()` focuses the row. */
  override focus(options?: FocusOptions) {
    if (this.keepFocusUntilRendered(options)) return;
    this.row?.focus(options);
  }

  /** @internal SRC-32: marks the leading glyph for mirroring, by its name and the active icon set. */
  markIcon() {
    const icon = this.renderRoot?.querySelector('.icon');
    if (icon) markGlyph(icon);
  }

  protected override updated(changed: PropertyValues<this>) {
    this.markIcon();
    // The search re-reads its results when a prop it depends on changes.
    if ((['value', 'headline', 'leadingIcon', 'href'] as const).some((key) => changed.has(key))) notifyItemUpdate(this, RESULT_UPDATE);
  }

  /**
   * SRC-42, SRC-43, SRC-45, SRC-50: the row — an anchor to `href`, or a button — named by the headline and described by
   * the excerpt and, for a new context, `targetLabel`. `slot` is where the product's own excerpt (child content) goes;
   * null draws the `excerpt` runs.
   */
  protected renderRow(slot: TemplateResult | null) {
    const link = this.link.form;
    const tag = link ? literal`a` : literal`button`;
    const runs = runsOf(this.excerpt);
    const excerpt = slot ?? (runs.some(Boolean) ? runs.map((run, index) => (index % 2 ? html`<mark>${run}</mark>` : run)) : null);
    const description = this.link.describe(this.excerptText);
    return staticHtml`<${tag}
      part="row"
      class="row"
      data-tanrei-shape
      ?data-current=${this.current}
      type=${link ? nothing : 'button'}
      ${linkAttributes(link)}
      aria-label=${this.headline || nothing}
      aria-description=${description ?? nothing}
      >${this.iconColumn ? html`<span class=${this.leadingIcon ? 'icon' : 'icon empty'} aria-hidden="true">${this.leadingIcon}</span>` : nothing}<span class="text"
        ><span part="headline" class="headline">${this.headline}</span>${excerpt === null ? nothing : html`<span part="excerpt" class="excerpt">${excerpt}</span>`}</span
      ></${tag}
    >`;
  }
}

/**
 * A thing the search found that the person can go to — the spec's item kind `result`: a page, a section of a page, a
 * message, a file. It is a link, never an option: with `href` its row is an `<a>` in its shadow root, which the browser
 * follows as it follows any link; without one it is a `<button>`, and `select` is all that happens.
 *
 * The excerpt is its child content — text with `<mark>` elements around the matches, which is what search engines hand
 * back (`<tanrei-search-result headline="Layers" href="/tokens/#layers">A layer changes a <mark>token</mark>.</tanrei-search-result>`)
 * — or, while it has no child content, the `excerpt` runs. Putting an engine's HTML there is the product's act: the
 * element never parses a string as markup.
 *
 * Place it in a `<tanrei-search>` or a `<tanrei-search-result-group>`: the search answers its press and its keys (Down
 * and Up Arrow move through the results; typing returns to the input) and fires `select` when it is activated in place.
 *
 * @tag tanrei-search-result
 * @slot - The excerpt: text, with `<mark>` elements for the matches.
 * @csspart row - The row: the `<a>` (or `<button>`), its container color, corners and every state.
 * @csspart headline - The title.
 * @csspart excerpt - The passage under it.
 */
export class TanreiSearchResult extends TanreiSearchRow {
  static override styles = rowStyles;

  override connectedCallback() {
    super.connectedCallback();
    // SRC-50: a result is an item of the results' list.
    hostAria(this, { role: 'listitem' });
  }

  protected excerptNodes() {
    return contentNodes(this);
  }

  protected override render() {
    return this.renderRow(this.excerptNodes().length ? html`<slot></slot>` : null);
  }
}

/**
 * Results that belong together, under one heading — the spec's item kind `result-group`: the sections found in one
 * page, or the results of one kind. With `href` its heading is itself a result (the page), drawn as a result's row, and
 * its `<tanrei-search-result>` children are inset under it as its parts; without one its heading is a quiet title.
 *
 * A linked heading's excerpt is the group's own child content besides its results — text with `<mark>` elements — or the
 * `excerpt` runs while it has none. A group holds results only, and no group.
 *
 * @tag tanrei-search-result-group
 * @slot - The group's `<tanrei-search-result>` children and, while `href` is set, the heading's excerpt (text with `<mark>`).
 * @csspart title - The heading of a group without a destination.
 * @csspart row - The heading of a group with a destination: a result's row.
 * @csspart headline - The linked heading's title.
 * @csspart excerpt - The linked heading's passage.
 */
export class TanreiSearchResultGroup extends TanreiSearchRow {
  static override styles = [rowStyles, groupStyles];

  // The results and the heading's excerpt are both child content: each is assigned to its own slot by hand.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    ...TanreiSearchRow.properties,
    gapBefore: { attribute: false },
    gapAfter: { attribute: false },
  };

  /** @internal SRC-44: something stands above the group in the view, so it stands group.gap below it. */
  gapBefore = false;

  /** @internal SRC-44: something that is not a group follows it, so it stands group.gap above it. */
  gapAfter = false;

  override connectedCallback() {
    super.connectedCallback();
    hostAria(this, { role: 'listitem' });
  }

  /** @internal The group's results, in order. */
  get results(): TanreiSearchResult[] {
    return [...this.children].filter((child): child is TanreiSearchResult => child instanceof TanreiSearchResult);
  }

  /** @internal SRC-44: the heading is a result's row — the group has a destination. */
  get linked(): boolean {
    return this.link.form !== null;
  }

  protected excerptNodes() {
    return contentNodes(this).filter((node) => !(node instanceof Element && node.localName.includes('-')));
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    const root = this.renderRoot;
    assignSlot(root.querySelector<HTMLSlotElement>('slot.excerpt-slot'), this.linked ? this.excerptNodes() : []);
    assignSlot(root.querySelector<HTMLSlotElement>('slot.results-slot'), this.results);
  }

  protected override render() {
    const linked = this.linked;
    const results = this.results.length > 0;
    // SRC-50: a group named by its headline, holding the linked heading and then its own list of its results.
    return html`<div
      class="group${linked ? ' linked' : ''}${this.gapBefore ? ' before' : ''}${this.gapAfter ? ' after' : ''}"
      role="group"
      aria-label=${this.headline || nothing}
    >
      ${linked
        ? this.renderRow(this.excerptNodes().length ? html`<slot class="excerpt-slot"></slot>` : null)
        : this.headline
          ? html`<div part="title" class="title" aria-hidden="true">${this.headline}</div>`
          : nothing}
      <div class="list" role=${results ? 'list' : nothing}><slot class="results-slot"></slot></div>
    </div>`;
  }
}

/** A result or a linked group heading in `event`'s path whose own row the event came from, or null. */
function rowOf(event: Event, within: Element): TanreiSearchRow | null {
  const path = event.composedPath();
  for (const node of path) {
    if (node === within) return null;
    if (node instanceof TanreiSearchRow) {
      const row = node.row;
      return row && path.includes(row) ? node : null;
    }
  }
  return null;
}

// ── The shortcut the search binds (SRC-38, SRC-39) ───────────────────────────────────────────────────────────────────

/** One chord as the search listens for it: its modifiers and its one other key, as `KeyboardEvent.key` names it. */
interface Binding {
  id: string;
  key: string;
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

/** KBS-1: the named keys, as `KeyboardEvent.key` reports them. */
const EVENT_KEYS: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  space: ' ',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  home: 'Home',
  end: 'End',
  'page-up': 'PageUp',
  'page-down': 'PageDown',
  'caps-lock': 'CapsLock',
  plus: '+',
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i + 1}`, `F${i + 1}`])),
};

/** SRC-38: a chord in the keyboard shortcut's key names (`mod+k`, `/`) as a binding, or null where it is not one chord of modifiers and one key. */
function readBinding(chord: string): Binding | null {
  const modifiers = new Set<string>();
  const others: string[] = [];
  for (const name of chord.split('+').map((each) => each.trim().toLowerCase())) {
    if (!name) continue;
    if (name === 'mod' || name === 'ctrl' || name === 'alt' || name === 'shift') modifiers.add(name);
    else others.push(name);
  }
  if (others.length !== 1) return null;
  const key = EVENT_KEYS[others[0]] ?? ([...others[0]].length === 1 ? others[0] : null);
  if (key === null) return null;
  const [mod, ctrl, alt, shift] = ['mod', 'ctrl', 'alt', 'shift'].map((name) => modifiers.has(name));
  return { id: [...['mod', 'ctrl', 'alt', 'shift'].filter((name) => modifiers.has(name)), key].join('+'), key, mod, ctrl, alt, shift };
}

/** SRC-38: whether `event` is that chord, read as KBS-1 reads it: mod is Command under the apple convention and Control otherwise. */
function chordPressed(event: KeyboardEvent, binding: Binding, convention: KeyboardConvention): boolean {
  const meta = binding.mod && convention === 'apple';
  const ctrl = binding.ctrl || (binding.mod && convention !== 'apple');
  if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== binding.alt) return false;
  const character = [...binding.key].length === 1 && binding.key !== ' ';
  const letter = character && /[\p{L}\p{N}]/u.test(binding.key);
  // A named key or a letter is pressed with Shift exactly when the chord names it; a sign that a layout writes with
  // Shift (?) is what `key` says it is.
  if (!character || letter ? event.shiftKey !== binding.shift : binding.shift && !event.shiftKey) return false;
  if (event.key.toLowerCase() === binding.key.toLowerCase()) return true;
  // Option on a Mac writes another character for the same key: with alt, the key's place decides.
  return letter && binding.alt && (event.code === `Key${binding.key.toUpperCase()}` || event.code === `Digit${binding.key}`);
}

/** SRC-38: whether `element` takes text, so that a key without a modifier types there. */
function takesText(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return !['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

/** SRC-39: the chord each shown search has bound, and the searches that wait for one another search holds. */
const BOUND = new Map<string, Element>();
const WAITING = new Set<{ syncShortcut(): void }>();

/**
 * Lets people search the product from a bar or a compact trigger, and offers suggestions and results while they type in
 * a view under the bar, in a dialog or over the whole screen.
 *
 * Contract: specs/search.spec.json. The value is edited in a native `<input type="search" enterkeyhint="search">` in the
 * shadow root, as the text field's, with the browser's own cancel button hidden: the search draws its own
 * clear button. Every visual value comes from `--tanrei-comp-search-*` tokens, its one condition's parts by state.
 *
 * Opening and closing: a press on the bar, typing or Down Arrow opens the view (focus alone never does); Escape, a
 * chosen suggestion, submitting, the back button, and — docked — a press outside, Tab and focus leaving close it. The
 * element sets its own `expanded` and then fires `toggle`, whose `detail` holds `expanded` and, when closing, `reason`.
 * Set `expanded` yourself to open or close it without an event.
 *
 * `docked` (the default) opens a view under the bar: a manual popover in the top layer, placed by script (flipped above
 * the bar when there is more room there), following the bar. Focus stays in the input — the WAI-ARIA combobox pattern:
 * the input controls the suggestions' listbox and names the active suggestion as its active descendant once the person
 * moves to it with an arrow key (the first, active as the suggestions show, is selected but not read out). A press outside
 * closes it AND reaches the element under it. `full-screen` opens a modal `<dialog>` over the whole window with its own
 * header (a back button, the input, the clear button); it takes focus, keeps it, and gives it back to the bar's input.
 *
 * A site search. `bar="button"` draws a trigger shaped like the bar — the search glyph, the placeholder
 * and the shortcut hint — and `bar="icon"` an icon-only Button; a trigger opens a modal view, where the input is
 * (`presentation="dialog"`: a `<dialog>` hung from the top of the window over a scrim, a press on which closes it,
 * its header starting with the same back button as the full-screen view's, so it can be left by Tab and Enter alone;
 * `docked` with a trigger opens as `dialog`). `shortcut` (chords separated by spaces, as the keyboard shortcut's `keys`)
 * is written as a hint — a line of text, no keycaps — and exposed as `aria-keyshortcuts`; it makes the keys work only with `bind-shortcut`, which adds one
 * `keydown` listener on the window while the element is connected and enabled. The results are
 * `<tanrei-search-result>` and `<tanrei-search-result-group>` children: links, never options, reached from the input
 * with Down Arrow (real focus), left with Up Arrow or by typing. As soon as the view shows suggestions, the first is
 * active (list autocomplete with automatic selection), and with no suggestion the first result is current — drawn as
 * focused while focus stays in the input — so that one Enter takes it; Up Arrow on the first gives Enter back to the
 * query as typed. `status` and `status-text` draw the status row — a
 * `role="status"` element that exists from the first render (`role="alert"` while `status="error"`). The search never
 * runs a query: listen to `input`, then set the results, `status` and `status-text`.
 *
 * Form-associated: with a `name` it submits `value`, and Enter (with no suggestion active and no result current) requests its form's
 * submission after `submit`, unless `submit` was cancelled. The `inline` attribute, for tests and documentation, draws
 * the open view in place: the docked view under the bar, the full-screen view filling the element.
 *
 * @tag tanrei-search
 * @slot leading - An icon button at the bar's start (a menu or back button), drawn in place of the search glyph.
 * @slot trailing - Up to two icon buttons at the bar's end, after the clear button (voice input, account). The bar's action buttons — the clear button and these — stand `container.button-gap` apart (0 in the default system), each keeping a touch target's length along the row: two medium Buttons stand 8 apart, the small clear button and a medium one 12 (SRC-34).
 * @slot - The product's own content in the view, after the suggestions, the status row and the results (a button that loads more results, a link to the full results page, richer content for an empty query); and the item children: `<tanrei-search-suggestion>`, which the search draws as rows, and `<tanrei-search-result>` and `<tanrei-search-result-group>`, which it places after the status row.
 * @csspart container - The bar, or the button trigger: its color, corners, elevation and every state.
 * @csspart input - The native `<input>` (the bar's, and a modal view's header's).
 * @csspart view - The docked view's surface.
 * @csspart dialog - The dialog view's container, or the full-screen view.
 * @csspart listbox - The suggestions.
 * @csspart status - The status row.
 * @csspart results - The list of the results and result groups.
 * @attr {string} form - The id of the form the search belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The person changed the value (typing, deleting, pasting, dictating, the clear button, Escape); `value` is already the new one. Never fired when the product sets `value`.
 * @fires {CustomEvent<TanreiSearchSubmitDetail>} submit - The action key (Enter, Search) was pressed with no suggestion active and no result current: `detail.value`. Cancelable: cancelling it keeps an enclosing form from being submitted.
 * @fires {CustomEvent<TanreiSearchSelectDetail>} select - The person chose a suggestion, or activated a result in place (without a modifier key, in the same window): `detail.value` is its value. The search does not change `value`; set the value you want. For a result it is fired before the browser follows the link and is cancelable: cancelling it keeps the link from being followed, so that a router can take it. A result opened in a new tab (a modifier key, the middle button, `target="new"`) fires nothing.
 * @fires {CustomEvent<TanreiSearchToggleDetail>} toggle - The search opened or closed its view: `detail.expanded` (and the element's `expanded`) is the new value, and `detail.reason` says why it closed (`escape`, `back`, `select`, `submit`, `outside`, `tab`, `focus-out`, `shortcut`), or `null` when it opened.
 */
export class TanreiSearch extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'search');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** SRC-30: each of the search's glyphs is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.glyph, .button-glyph'));

  /**
   * SRC-34: the bar's action buttons — the clear button while it is shown, then the trailing slot's — each keep a touch
   * target's length along the row; their lengths are measured for the styles (src/primitives/kept-length.ts). The space
   * before each of the trailing slot's buttons is a spacer in the trailing box, never a margin on the product's button.
   */
  private readonly kept = new KeptLengths(undefined, () => this.renderRoot?.querySelector<HTMLElement>('.bar .trailing') ?? null);
  /**
   * SRC-32: a suggestion's leading glyph is marked when the icon set mirrors its name in right-to-left
   * (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark. The search glyph (SRC-2) is not named here, and the
   * back and clear Buttons mark their own glyphs (BTN-19: `arrow_back` is flagged, `close` is not).
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.option-icon' });
  /** SRC-32: a switch of the design system changes the icon set; the results' glyphs are marked again (`updated()`). */
  private readonly system = new SystemWatchController(this);
  static override styles = styles;

  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    presentation: { type: String, reflect: true },
    bar: { type: String, reflect: true },
    value: { type: String },
    label: { type: String },
    placeholder: { type: String },
    expanded: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    clearLabel: { type: String, attribute: 'clear-label' },
    backLabel: { type: String, attribute: 'back-label' },
    shortcut: { converter: chordsConverter },
    bindShortcut: { type: Boolean, attribute: 'bind-shortcut' },
    status: { type: String, reflect: true },
    statusText: { type: String, attribute: 'status-text' },
    iconSpace: { type: String, attribute: 'icon-space', reflect: true },
    density: { type: String, reflect: true, useDefault: true },
    inline: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    suggestions: { state: true },
    entries: { state: true },
    iconColumn: { state: true },
    active: { state: true },
    moved: { state: true },
    resultCurrent: { state: true },
    typing: { state: true },
    hasLeading: { state: true },
    trailingCount: { state: true },
    hasContent: { state: true },
    formDisabled: { state: true },
  };

  /**
   * Where the view opens: `docked` under the bar, without taking focus from it; `dialog`, a modal surface near the top
   * of the window with its own header (a large screen, opened from a trigger); or `full-screen`, over the whole window
   * with its own header (a small screen).
   */
  presentation: TanreiSearchPresentation = 'docked';

  /**
   * What stands where the search is placed. `field`: the bar with its input. `button`: a trigger shaped like the bar
   * that holds no input — the search glyph, the placeholder and the shortcut hint — for an app bar with room. `icon`: an
   * icon-only Button showing the search glyph, for an app bar without. A trigger opens a modal view (`dialog` or
   * `full-screen`), where the input is; `docked` with a trigger opens as `dialog`.
   */
  bar: TanreiSearchBar = 'field';

  /** The query. Setting it shows it and fires nothing. The `value` attribute is what a form reset returns to. */
  value = '';

  /** Names the search field, the trigger, the view, the suggestions and the results for assistive technology ("Search mail"). Drawn only as a button trigger's text while `placeholder` is empty. Required. */
  label = '';

  /** A hint shown while the value is empty, and the text of a button trigger. Never a replacement for `label`. */
  placeholder = '';

  /** Whether the view is open. The search sets it itself (and fires `toggle`); set it to open or close the view yourself. */
  expanded = false;

  /** Prevents focus, editing and opening the view. */
  disabled = false;

  /** The clear button's accessible name, in the product's language ("Clear search"; `clear-label`). */
  clearLabel = '';

  /** The accessible name of the back button in a modal view's header — dialog or full-screen ("Back"; `back-label`). */
  backLabel = '';

  /**
   * The keyboard shortcut that opens the search, in the keyboard shortcut component's key names: one chord per string
   * (`["mod+k"]`, `["/"]`; the attribute holds the chords separated by spaces, `shortcut="mod+k"`). The search writes it
   * as a hint, a line of text with no keycaps — at the end of a button trigger, and in the bar while the value is empty and the input is not focused —
   * and exposes it as `aria-keyshortcuts` of its trigger or its input. It makes the keys work only with `bindShortcut`;
   * otherwise the product binds them and sets `expanded`.
   */
  shortcut: string[] = [];

  /**
   * Makes the search itself listen for `shortcut`, anywhere in the window, while it is connected and enabled: the keys
   * open it, and close it again while it is open (`bind-shortcut`). One chord; a press something else cancelled, a key
   * repeating while held, an input-method composition and — for a chord without mod, ctrl or alt — a press while focus
   * is in an element that takes text are left alone. Off by default.
   */
  bindShortcut = false;

  /**
   * What the product's search is doing, which the product sets: `idle` (results, or none, are final), `loading` (a
   * query is running: the status row shows a loading indicator after its delay, and the results are marked busy) or
   * `error` (the query failed: `statusText` is drawn as an error and announced at once). The search never runs a query.
   */
  status: TanreiSearchStatus = 'idle';

  /**
   * The status row's text, in the product's language, announced to assistive technology when it changes
   * (`status-text`): the count ("12 results for tokens"), that nothing was found, the failure; while loading, the
   * loading indicator's name ("Searching"). Empty draws no status row unless `status` is `loading`.
   */
  statusText = '';

  /**
   * Whether a row of the view — a suggestion, a result, a linked group heading — keeps the room of the leading icon
   * column where it has no icon, so that the headlines start on one line (SRC-52): `auto` while any suggestion or
   * result of the view has a `leading-icon`, `always` in every row, `never` only in a row that has one (`icon-space`).
   */
  iconSpace: TanreiSearchIconSpace = 'auto';

  /**
   * How much room a row of the view takes (SRC-53) — a suggestion, a result, a result group's linked heading —: its least
   * height, paddings, the gap after its icon column and the size of its glyph, never its text style; the bar is not
   * changed. `regular` (the default) is for a product used by touch as well as by pointer; `compact` for a tool used with
   * a pointer. For touch a row is never lower than the touch target (SRC-16). A design system may add values.
   */
  density: TanreiSearchDensity = 'regular';

  /** SRC-53: a density a design system added is drawn from its tokens; one the active system lacks is reported. */
  private readonly densities = new OpenAxesController(this, { component: 'search', behavior: 'SRC-53', axes: AXES });

  /** For tests and documentation: draws the open view in place, without the overlay's behaviour. */
  inline = false;

  /** Web only: the name it is submitted under. */
  name = '';

  protected suggestions: TanreiSearchSuggestion[] = [];
  /** The results and result groups (children), in the product's order. */
  protected entries: (TanreiSearchResult | TanreiSearchResultGroup)[] = [];
  /** SRC-16, SRC-42, SRC-52: every row of the view keeps the leading icon column, as iconSpace says. */
  protected iconColumn = false;
  /** The active suggestion's index, or -1. */
  protected active = -1;
  /**
   * SRC-14, SRC-24: the person moved to the active suggestion with an arrow key, so it is the input's active descendant
   * and is read out; a suggestion made active automatically (the first, as they show) is not, until they move.
   */
  protected moved = false;
  /** SRC-49: the first result is the one the action key takes (the view holds no suggestion), focus staying in the input. */
  protected resultCurrent = false;
  /** SRC-14, SRC-49: focus is in an input of the search (the bar's or the header's), where its keys are answered. */
  protected typing = false;
  protected hasLeading = false;
  protected trailingCount = 0;
  /** The default slot holds the product's own content (anything but the suggestions). */
  protected hasContent = false;
  /** Set by an ancestor `<fieldset disabled>`. */
  protected formDisabled = false;

  private readonly internals: ElementInternals;
  private readonly children$ = new MutationObserver((records) => this.readChildren(records));

  /** SRC-4: the bar's input and the header's, each kept in step with `value` around an input method (TXF-1, TXF-4). */
  private readonly barText = new NativeTextController({ input: () => this.barInput, value: () => this.value, setValue: (value) => (this.value = value) });
  private readonly headerText = new NativeTextController({ input: () => this.headerInput, value: () => this.value, setValue: (value) => (this.value = value) });

  /**
   * SRC-19, SRC-20: the bar's press — by pointer or touch only: Enter and Space in the input type and submit. SRC-36: a
   * button trigger is pressed as the bar is, and by Enter and Space as a button.
   */
  private readonly barPress = new PressController(this, {
    container: () => this.triggerButton ?? this.barElement,
    holdCarrier: () => this.renderRoot.querySelector('.hold'),
    disabled: () => this.inert_,
    keys: () => (this.triggerButton ? undefined : []),
  });

  /** SRC-19, SRC-20, SRC-42: a suggestion's or a result's press — by pointer, touch or Enter; the row being pressed is `pressedRow`. */
  private pressedRow: HTMLElement | null = null;
  private readonly rowPress = new PressController(this, {
    container: () => this.pressedRow,
    holdCarrier: () => this.renderRoot.querySelector('.hold'),
    disabled: () => false,
    keys: [],
  });

  private viewShown = false;
  private fullShown = false;
  private lastLayout = '';
  private listening = false;
  /** SRC-42: the result whose row is pressed by a pointer now. */
  private pressedResult: TanreiSearchRow | null = null;
  /** SRC-51: the result that took focus last, for the moment the product removes it. */
  private focusedResult: TanreiSearchRow | null = null;
  /** SRC-40: a press began on the dialog view's scrim. */
  private scrimPressed = false;
  /** SRC-38: the chord this search listens for now, or null. */
  private binding: Binding | null = null;
  private readQueued = false;
  /** SRC-49: the results in view order when they were last read, to tell when the product replaced them. */
  private lastRows: TanreiSearchRow[] = [];
  /** SRC-49: the result drawn as current now, or null. */
  private currentRow: TanreiSearchRow | null = null;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.addEventListener('keydown', this.onHostKeyDown);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('tanrei-search-suggestion-update', () => this.readChildren());
    // The results draw themselves and hold no listener: the search answers every one of them from here, however many.
    this.addEventListener('click', this.onResultClick);
    this.addEventListener('pointerdown', this.onResultPointerDown);
    this.addEventListener('pointerup', this.onResultPointerEnd);
    this.addEventListener('pointercancel', this.onResultPointerEnd);
    this.addEventListener('pointerout', this.onResultPointerOut);
    // A page of results tells the search about each of its rows; they are read once.
    this.addEventListener(RESULT_UPDATE, () => {
      if (this.readQueued) return;
      this.readQueued = true;
      queueMicrotask(() => {
        this.readQueued = false;
        if (this.isConnected) this.readChildren();
      });
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
    this.readChildren();
    // SRC-34: back in the page, the action buttons are measured again.
    if (this.hasUpdated) this.keepActions();
    // SRC-38: shown again, it listens again.
    if (this.hasUpdated) this.syncShortcut();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.kept.clear();
    this.children$.disconnect();
    this.stopFollowing();
    this.listen(false);
    if (this.fullShown) this.withdrawFull(false);
    // SRC-38: removed, it stops listening.
    this.syncShortcut();
  }

  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    // KBS-12: the hint's keys changed without the search (an ancestor's keyboard convention): expose them again.
    root.addEventListener(SHORTCUT_UPDATE, () => this.requestUpdate());
    return root;
  }

  // ── What the element holds ───────────────────────────────────────────────────────────────────────────────

  private get barElement() {
    return this.renderRoot?.querySelector<HTMLElement>('.bar') ?? null;
  }

  private get barInput() {
    return this.renderRoot?.querySelector<HTMLInputElement>('.bar .input') ?? null;
  }

  private get headerInput() {
    return this.renderRoot?.querySelector<HTMLInputElement>('.header .input') ?? null;
  }

  private get view() {
    return this.renderRoot?.querySelector<HTMLElement>('.view') ?? null;
  }

  private get dialog() {
    return this.renderRoot?.querySelector<HTMLDialogElement>('.full') ?? null;
  }

  private get inert_() {
    return this.disabled || this.formDisabled;
  }

  /** SRC-27: a bar the search does not define is drawn as the field. */
  private get barForm(): TanreiSearchBar {
    return BARS.includes(this.bar) ? this.bar : 'field';
  }

  /** SRC-35: a trigger stands in the bar's place. */
  private get triggered() {
    return this.barForm !== 'field';
  }

  /** SRC-35: the trigger — the native button of a button trigger, the Button of an icon one — or null. */
  private get trigger() {
    return this.renderRoot?.querySelector<HTMLElement>('.trigger, .trigger-icon') ?? null;
  }

  private get triggerButton() {
    return this.renderRoot?.querySelector<HTMLButtonElement>('.trigger') ?? null;
  }

  /**
   * Where the view opens now. SRC-27: a presentation the search does not define is drawn as docked. SRC-36: a trigger
   * opens a modal view — a docked view has no input of its own — so docked with a trigger is the dialog.
   */
  private get mode(): TanreiSearchPresentation {
    if (this.presentation === 'full-screen') return 'full-screen';
    return this.presentation === 'dialog' || this.triggered ? 'dialog' : 'docked';
  }

  /** SRC-9, SRC-40: the view is a modal one, with a header of its own. */
  private get modal() {
    return this.mode !== 'docked';
  }

  /** SRC-27: a status the search does not define is idle. */
  private get statusNow(): TanreiSearchStatus {
    return STATUSES.includes(this.status) ? this.status : 'idle';
  }

  /** SRC-47: the status row is drawn. */
  private get statusShown() {
    return this.statusNow === 'loading' || this.statusText !== '';
  }

  /** The view has content: a suggestion, a status row, a result, a result group, or something in the default slot (SRC-7). */
  private get viewHasContent() {
    return this.suggestions.length > 0 || this.statusShown || this.entries.length > 0 || this.hasContent;
  }

  /** SRC-49: the results in view order, across groups — a linked group heading counts as one, a title does not. */
  private get rows(): TanreiSearchRow[] {
    return this.entries.flatMap((entry) => (entry instanceof TanreiSearchResultGroup ? [...(entry.linked ? [entry] : []), ...entry.results] : [entry]));
  }

  /** The input focus belongs to now: the header's while a modal view is open, else the bar's. */
  private get currentInput() {
    return this.modal && this.expanded && !this.inert_ ? (this.headerInput ?? this.barInput) : this.barInput;
  }

  /**
   * Sends focus to the input it belongs to now: the header's while a modal view (dialog or full-screen) is open, the
   * bar's while the view is docked or closed — and, while the bar is a button or an icon and the view is closed, to
   * that trigger, as the platform's own delegation does. It opens and closes nothing (SRC-5), and a disabled search
   * takes no focus (SRC-25). This is how the product's own content in the view (SRC-46) gives focus back when it
   * removes the element that held it, as the search's own clear button does (SRC-10): behind an open modal view the
   * platform's delegation alone would land on the dialog, where nothing can be typed.
   */
  override focus(options?: FocusOptions) {
    const input = this.inert_ ? null : this.currentInput;
    if (input) input.focus(options);
    else super.focus(options);
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? '';
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** The suggestions, the results and the result groups (children), and whether anything else is the view's content. */
  /**
   * SRC-16, SRC-42, SRC-52: the leading icon column, decided for the view as a whole — every row while iconSpace keeps it
   * (auto: while any suggestion or result has an icon; always), and otherwise a row that has an icon of its own.
   */
  private decideIconColumn(suggestions: readonly TanreiSearchSuggestion[] = this.suggestions) {
    const space: TanreiSearchIconSpace = ICON_SPACES.includes(this.iconSpace) ? this.iconSpace : 'auto';
    const rows = this.entries.flatMap((entry) => (entry instanceof TanreiSearchResultGroup ? [entry, ...entry.results] : [entry]));
    const any = suggestions.some((s) => !!s.leadingIcon) || rows.some((row) => !!row.leadingIcon && (!(row instanceof TanreiSearchResultGroup) || row.linked));
    const every = space === 'always' || (space === 'auto' && any);
    if (every !== this.iconColumn) this.iconColumn = every;
    for (const row of rows) {
      const kept = every || !!row.leadingIcon;
      if (row.iconColumn !== kept) row.iconColumn = kept;
    }
  }

  private readChildren(records?: MutationRecord[]) {
    // SRC-43: a result's excerpt is its child content; the one observer tells each result whose content changed.
    if (records) {
      const touched = new Set<TanreiSearchRow>();
      for (const record of records) {
        const element = record.target instanceof Element ? record.target : record.target.parentElement;
        const row = element?.closest(`${RESULT}, ${RESULT_GROUP}`);
        if (row instanceof TanreiSearchRow) touched.add(row);
      }
      for (const row of touched) row.requestUpdate();
    }
    const suggestions = [...this.children].filter((child): child is TanreiSearchSuggestion => child instanceof TanreiSearchSuggestion);
    const changed = suggestions.length !== this.suggestions.length || suggestions.some((s, i) => s !== this.suggestions[i]);
    if (changed) this.suggestions = suggestions;
    const entries = [...this.children].filter(
      (child): child is TanreiSearchResult | TanreiSearchResultGroup => child instanceof TanreiSearchResult || child instanceof TanreiSearchResultGroup,
    );
    if (entries.length !== this.entries.length || entries.some((entry, i) => entry !== this.entries[i])) this.entries = entries;
    // SRC-14, SRC-49: suggestions or results the product gives or replaces make the first of them the one Enter takes.
    const rows = this.rows;
    if (changed || rows.length !== this.lastRows.length || rows.some((row, i) => row !== this.lastRows[i])) {
      this.lastRows = rows;
      this.firstCurrent();
    }
    // SRC-46: the results stand after the status row and before the product's own content, whatever the children's order.
    for (const entry of entries) if (entry.slot !== RESULT_SLOT) entry.slot = RESULT_SLOT;
    const content = [...this.childNodes].some((node) =>
      node instanceof Element
        ? node.localName !== SUGGESTION && node.localName !== RESULT && node.localName !== RESULT_GROUP && !node.getAttribute('slot')
        : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim(),
    );
    if (content !== this.hasContent) this.hasContent = content;
    this.decideIconColumn(suggestions);
    this.checkSuggestions();
    this.checkResults();
    // SRC-51: the result that had focus was removed or replaced: focus goes to the input rather than out of the view.
    const focused = this.focusedResult;
    if (focused && !this.contains(focused)) {
      this.focusedResult = null;
      const active = deepActive();
      if (this.expanded && !this.inert_ && (!active || active === document.body || active === this.dialog)) this.currentInput?.focus();
    }
    this.requestUpdate();
  }

  /** SRC-27: what a debug build reports about the results and the result groups. */
  private checkResults() {
    const seen = new Set(this.suggestions.map((suggestion) => suggestion.value).filter(Boolean));
    const check = (row: TanreiSearchRow, what: string) => {
      if (!row.value) report(row, 'SRC-27', `the ${what} "${row.headline}" has an empty value; select cannot tell it apart`);
      else if (seen.has(row.value)) report(row, 'SRC-27', `the value "${row.value}" of the ${what} "${row.headline}" repeats that of another suggestion, result or group; give each its own`);
      seen.add(row.value);
    };
    for (const entry of this.entries) {
      if (entry instanceof TanreiSearchResultGroup) {
        if (entry.linked) check(entry, 'linked group heading');
        const strangers = [...entry.children].filter((child) => child.localName.includes('-') && !(child instanceof TanreiSearchResult));
        if (strangers.length) report(entry, 'SRC-27', `the result group "${entry.headline}" holds <${strangers[0].localName}>; a group holds results only, and no group`);
      }
      for (const result of entry instanceof TanreiSearchResultGroup ? entry.results : [entry]) {
        if (!result.headline?.trim()) report(result, 'SRC-27', `the result "${result.value}" has an empty headline, so it has no text and no accessible name`);
        check(result, 'result');
      }
    }
  }

  /** SRC-27: what a debug build reports about the suggestions. */
  private checkSuggestions() {
    const seen = new Set<string>();
    for (const suggestion of this.suggestions) {
      if (!suggestion.value) report(this, 'SRC-27', `the suggestion "${suggestion.headline}" has an empty value; select cannot tell it apart`);
      else if (seen.has(suggestion.value)) report(this, 'SRC-27', `two suggestions share the value "${suggestion.value}"; give each its own`);
      seen.add(suggestion.value);
      if (!suggestion.headline?.trim()) report(this, 'SRC-27', `the suggestion "${suggestion.value}" has an empty headline, so it has no text and no accessible name`);
    }
  }

  #onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const elements = slot.assignedElements({ flatten: true });
    if (slot.name === 'leading') this.hasLeading = elements.length > 0;
    else if (slot.name === 'trailing') {
      this.trailingCount = elements.length;
      // SRC-34: another button in the same place is measured too, though nothing renders again.
      this.keepActions();
      // SRC-27: more than two trailing buttons are still laid out, and reported.
      if (elements.length > 2) report(this, 'SRC-27', `the trailing slot holds ${elements.length} elements; a search bar has room for two icon buttons`);
    }
  }

  // ── Opening and closing (SRC-5, SRC-6) ─────────────────────────────────────────────────────────────────

  /** SRC-5: the search opens its view — its own `expanded`, then `toggle` — once. */
  private expand() {
    if (this.expanded || this.inert_) return;
    this.expanded = true;
    // SRC-14, SRC-49: the view opens with its first suggestion active, or its first result current.
    this.firstCurrent();
    this.dispatchEvent(new CustomEvent<TanreiSearchToggleDetail>('toggle', { detail: { expanded: true, reason: null } }));
  }

  /** SRC-6: the search closes its view with a reason, once; the value stays as it is. */
  private collapse(reason: TanreiSearchCloseReason) {
    if (!this.expanded || this.inert_) return;
    // SRC-6, SRC-49: the docked view closes under a focused result: focus goes back to the input it belongs to (which
    // does not reopen it), and Tab moves on from there as it would have.
    if (!this.modal && this.resultFocused) this.barInput?.focus();
    this.expanded = false;
    this.noneCurrent();
    this.dispatchEvent(new CustomEvent<TanreiSearchToggleDetail>('toggle', { detail: { expanded: false, reason } }));
  }

  /** SRC-15: a suggestion was chosen: `select` with its value, then the view closes. The value is the product's to set. */
  private choose(index: number) {
    const suggestion = this.suggestions[index];
    if (!suggestion || this.inert_) return;
    this.dispatchEvent(new CustomEvent<TanreiSearchSelectDetail>('select', { detail: { value: suggestion.value } }));
    this.collapse('select');
  }

  /**
   * SRC-13: the action key: `submit`, then the view closes — unless it shows a result, a result group or a status row:
   * what the person asked for is already in front of them — then, in a form, unless cancelled, the form is submitted.
   */
  private submit() {
    const proceed = this.dispatchEvent(new CustomEvent<TanreiSearchSubmitDetail>('submit', { cancelable: true, detail: { value: this.value } }));
    if (this.entries.length === 0 && !this.statusShown) this.collapse('submit');
    if (proceed && this.form) pressDefaultButton(this.form);
  }

  /** SRC-10, SRC-12: the value emptied by the person (the clear button, Escape): `input` once, never a toggle. */
  private clearValue() {
    this.value = '';
    this.firstCurrent();
    for (const input of [this.barInput, this.headerInput]) if (input && !(input === this.barInput ? this.barText : this.headerText).composing) input.value = '';
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
  }

  /**
   * SRC-14: the active suggestion, scrolled into view inside the view's scrolling box, and its ring's focus style (SRC-21).
   * `moved`: the person moved to it with an arrow key, so it is announced (SRC-24); made active automatically, it is not.
   */
  private setActive(index: number, moved: boolean) {
    this.active = index;
    this.moved = moved && index >= 0;
    this.resultCurrent = false;
    if (index < 0) return;
    void this.updateComplete.then(() => {
      const row = this.renderRoot.querySelector<HTMLElement>(`#option-${index}`);
      if (!row) return;
      syncFocusStyle(this, row);
      this.scrollIntoRoom(row);
    });
  }

  /**
   * SRC-14, SRC-49: `row` — a suggestion's, or a result's in the result's own shadow root — scrolled into view inside
   * the view's scrolling box, its paddings kept clear. The box is the open view's: the docked one's, or the modal one's.
   */
  private scrollIntoRoom(row: HTMLElement) {
    const scroll = this.renderRoot.querySelector<HTMLElement>(this.modal ? '.full .scroll' : '.view .scroll');
    if (!scroll) return;
    const [box, room] = [row.getBoundingClientRect(), scroll.getBoundingClientRect()];
    const style = getComputedStyle(scroll);
    const top = room.top + (Number.parseFloat(style.paddingTop) || 0);
    const bottom = room.bottom - (Number.parseFloat(style.paddingBottom) || 0);
    if (box.top < top) scroll.scrollTop -= top - box.top;
    else if (box.bottom > bottom) scroll.scrollTop += box.bottom - bottom;
  }

  /** An input method is composing in one of the search's inputs (TXI-4). */
  private get composing() {
    return this.barText.composing || this.headerText.composing;
  }

  /**
   * SRC-14, SRC-49: the first row of the view becomes the one the action key takes — list autocomplete with automatic
   * selection — while the view is open, focus is in the input and no input method composes: the first suggestion, or
   * with none the first result; otherwise nothing is.
   */
  private firstCurrent(keepMoved = false) {
    const now = this.expanded && !this.inert_ && this.typing && !this.composing;
    if (now && this.suggestions.length > 0) {
      if (this.active !== 0 || this.resultCurrent) this.setActive(0, false);
      // SRC-14: made active again automatically, it is not read out until the person moves — unless this only confirms
      // the first that an arrow key moved to (the Down Arrow that opened the view).
      else if (!keepMoved) this.moved = false;
      return;
    }
    this.active = -1;
    this.moved = false;
    this.resultCurrent = now && this.rows.length > 0;
  }

  /**
   * SRC-49, SRC-42: the current result is told so — its row is drawn as a focused one while focus stays in the input —
   * with its ring's focus style (SRC-21), scrolled into view as it becomes current. Called from `updated()`.
   */
  private syncCurrentResult() {
    const next = this.expanded && !this.inert_ && this.resultCurrent && this.typing ? (this.rows[0] ?? null) : null;
    if (next === this.currentRow) return;
    if (this.currentRow) this.currentRow.current = false;
    this.currentRow = next;
    if (!next) return;
    next.current = true;
    void next.updateComplete.then(() => {
      const row = next.row;
      if (!row || this.currentRow !== next) return;
      syncFocusStyle(next, row);
      this.scrollIntoRoom(row);
    });
  }

  /** SRC-13, SRC-14, SRC-49: nothing in the view is the one the action key takes: it submits the value as typed. */
  private noneCurrent() {
    this.active = -1;
    this.moved = false;
    this.resultCurrent = false;
  }

  // ── The inputs ─────────────────────────────────────────────────────────────────────────────────────────

  /**
   * SRC-4 (TXF-1): the person changed the value. The native `input` is composed, so it leaves the shadow root by itself —
   * after the element has taken the new value. SRC-5: typing opens the view; SRC-14, SRC-49: it makes the first
   * suggestion active, or the first result current — and, while an input method composes, nothing.
   */
  private readonly onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const text = input === this.headerInput ? this.headerText : this.barText;
    if (!text.composingInput(event)) this.value = input.value;
    if (!this.expanded) {
      input.focus();
      this.expand();
    }
    this.firstCurrent();
  };

  /**
   * SRC-5, SRC-12, SRC-13, SRC-14, SRC-49: the keys the input answers. Escape while open and Tab are the host's (below).
   * While an input method composes every key is its own (TXI-4): the Enter that confirms a conversion takes nothing — in
   * WebKit that keydown comes after `compositionend`, with the key code 229.
   */
  private readonly onInputKeyDown = (event: KeyboardEvent) => {
    if (this.inert_ || event.altKey || event.ctrlKey || event.metaKey) return;
    const input = event.target as HTMLInputElement;
    if (event.isComposing || event.keyCode === 229 || this.composing) return;
    const count = this.suggestions.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.expanded) {
          this.expand();
          // SRC-14: the Down Arrow that opens the view moves to its first suggestion, which is read out (as APG's does).
          this.moved = this.active >= 0;
        }
        // SRC-49: from the current result, on to the one after it (staying on it where it is the only one).
        else if (this.resultCurrent) this.focusResult(Math.min(1, this.rows.length - 1));
        else if (this.active < count - 1) this.setActive(this.active + 1, true);
        // SRC-14, SRC-49: with no suggestion to go to — none in the view, or the last one active — on to the first result.
        else this.focusResult(0);
        return;
      case 'ArrowUp':
        // SRC-14, SRC-49: back from the first — suggestion or result — nothing is current: Enter submits the value as typed.
        if (this.expanded && (this.active >= 0 || this.resultCurrent)) {
          event.preventDefault();
          if (this.resultCurrent) this.noneCurrent();
          else this.setActive(this.active - 1, true);
        }
        return;
      case 'Enter': {
        if (event.shiftKey) return;
        event.preventDefault();
        if (event.repeat) return;
        const index = this.expanded ? this.active : -1;
        const result = this.expanded && this.resultCurrent ? this.rows[0] : undefined;
        if (index >= 0 && index < count) {
          // SRC-19: the chosen row shows its press.
          const row = this.renderRoot.querySelector<HTMLElement>(`#option-${index}`);
          if (row) {
            this.pressRow(row);
            this.rowPress.press(null);
            this.rowPress.release();
          }
          this.choose(index);
        } else if (result?.row) {
          // SRC-49, SRC-45: the current result is activated as Enter on it would be: its row shows the press (SRC-19),
          // and its own activation — select, then the link followed unless select was cancelled — is the click's.
          const row = result.row;
          this.pressRow(row);
          this.rowPress.press(null);
          this.rowPress.release();
          row.click();
        } else this.submit();
        return;
      }
      case 'Escape':
        // SRC-12: collapsed, Escape empties a value, as a native search input does; with none it passes on.
        if (!this.expanded && this.value !== '') {
          event.preventDefault();
          this.clearValue();
        }
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        // SRC-14, SRC-49: moving the caret makes the first suggestion active again, or the first result current.
        this.firstCurrent();
        return;
      default:
        void input;
    }
  };

  /** SRC-6, SRC-9: Escape anywhere in the search closes an open view; Tab closes the docked one and stays in the full-screen one. */
  private readonly onHostKeyDown = (event: KeyboardEvent) => {
    if (!this.expanded || this.inert_ || event.defaultPrevented) return;
    // SRC-14 (TXI-4): Escape while an input method composes is the input method's — it cancels the composition — and
    // closes nothing.
    if (event.isComposing || event.keyCode === 229 || this.composing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.collapse('escape');
      return;
    }
    const row = rowOf(event, this);
    if (row && this.#onResultKeyDown(event, row)) return;
    if (event.key !== 'Tab' || this.inline) return;
    const dialog = this.dialog;
    if (this.modal && dialog && this.fullShown) {
      // SRC-49: in a modal view Tab goes through the header's controls, the results and the product's content.
      trapFocus(event, dialog);
      return;
    }
    // Docked: the Tab's own move goes on from where it was, as it would have (from the input, for a result: `collapse()`).
    if (!this.modal) this.collapse('tab');
  };

  /**
   * SRC-49: the keys a focused result answers. Down and Up Arrow move real focus through the results in view order,
   * across groups, staying on the last and going from the first back to the input (the last suggestion active, where
   * there is one). Typing, deleting or pasting moves focus to the input, so that the key edits the value there. Enter is
   * the browser's own activation of the link; the row only shows its press (SRC-19). Returns whether the key was taken.
   */
  #onResultKeyDown(event: KeyboardEvent, row: TanreiSearchRow): boolean {
    const plain = !event.altKey && !event.ctrlKey && !event.metaKey;
    if (plain && !event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const rows = this.rows;
      const at = rows.indexOf(row);
      if (event.key === 'ArrowDown') this.focusResult(Math.min(at + 1, rows.length - 1));
      else if (at > 0) this.focusResult(at - 1);
      else {
        // SRC-49: from the first result back to the input — the last suggestion active, or nothing current.
        this.currentInput?.focus();
        if (this.suggestions.length > 0) this.setActive(this.suggestions.length - 1, true);
        else this.noneCurrent();
      }
      return true;
    }
    if (event.key === 'Enter') {
      const target = row.row;
      if (!event.repeat && target) {
        this.pressRow(target);
        this.rowPress.press(null);
        this.rowPress.release();
      }
      return true;
    }
    const types = plain && [...event.key].length === 1 && event.key !== ' ';
    const deletes = plain && (event.key === 'Backspace' || event.key === 'Delete');
    const pastes = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'v';
    if (types || deletes || pastes) {
      this.currentInput?.focus();
      return true;
    }
    return false;
  }

  /** SRC-49: real focus on the result at `index` in view order (the browser scrolls it into view); none is active meanwhile. */
  private focusResult(index: number) {
    const row = this.rows[index];
    if (!row) return;
    this.noneCurrent();
    row.focus();
  }

  /** Whether focus is in a result's row now. */
  private get resultFocused() {
    const root = deepActive()?.getRootNode();
    return root instanceof ShadowRoot && root.host instanceof TanreiSearchRow && this.contains(root.host);
  }

  /** SRC-42, SRC-51: the result that takes focus — its ring's focus style (SRC-21), and which one to miss when it is removed. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const row = rowOf(event, this);
    this.focusedResult = row;
    if (row) syncFocusStyle(row, row.row);
  };

  /**
   * SRC-45: a result was activated. In place — a primary press, a touch or Enter, without a modifier key, in the same
   * window — `select` with its value, then the browser follows the link unless `select` was cancelled (a router took
   * it), then the view closes. Any other way (a modifier key, `target: new`; the middle button fires no click) nothing
   * is emitted and the view stays, so that a person can open several results from one search. Never Space on a link.
   */
  private readonly onResultClick = (event: MouseEvent) => {
    const row = rowOf(event, this);
    if (!row || this.inert_) return;
    const link = row.destination;
    if (link && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.opensNew)) return;
    const proceed = this.dispatchEvent(new CustomEvent<TanreiSearchSelectDetail>('select', { cancelable: true, detail: { value: row.value } }));
    if (!proceed) event.preventDefault();
    this.collapse('select');
  };

  /** SRC-42, SRC-19: a result's row shows its press, from the point of contact. */
  private readonly onResultPointerDown = (event: PointerEvent) => {
    const row = rowOf(event, this);
    const target = row?.row;
    if (!row || !target || this.inert_) return;
    this.pressedResult = row;
    this.pressRow(target);
    this.rowPress.onPointerDown(event);
  };

  private readonly onResultPointerEnd = (event: PointerEvent) => {
    if (!this.pressedResult) return;
    this.pressedResult = null;
    this.rowPress.release(event);
  };

  /** The pointer left the pressed result (its row fills it), as a row's own `pointerleave`. */
  private readonly onResultPointerOut = (event: PointerEvent) => {
    if (this.pressedResult && event.relatedTarget !== this.pressedResult) this.onResultPointerEnd(event);
  };

  /** SRC-6: focus moving out of the search closes the docked view. */
  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.expanded || this.inline || this.modal) return;
    const to = event.relatedTarget as Node | null;
    // Focus that goes nowhere (a press on the page) is the press's to answer; a window switch keeps the view.
    if (!to || to === this || this.contains(to) || this.renderRoot.contains(to)) return;
    this.collapse('focus-out');
  };

  /** SRC-6: a press outside the bar and the view closes the docked view; the press also reaches what is under it. */
  private readonly onOutsidePress = (event: PointerEvent) => {
    if (event.composedPath().includes(this)) return;
    this.collapse('outside');
  };

  private listen(on: boolean) {
    if (on === this.listening) return;
    this.listening = on;
    if (on) document.addEventListener('pointerdown', this.onOutsidePress, true);
    else document.removeEventListener('pointerdown', this.onOutsidePress, true);
  }

  private readonly onInputFocus = (event: FocusEvent) => {
    // SRC-18: where style queries are missing, the focus style is read when focus arrives (the glow).
    if (event.target === this.barInput) syncFocusStyle(this, this.barElement);
    // SRC-14, SRC-49: focus coming back to the input makes the first suggestion active, or the first result current.
    this.typing = true;
    this.firstCurrent();
  };

  /** SRC-14, SRC-49: while the input does not have focus nothing in the view is the one its action key takes. */
  private readonly onInputBlur = () => {
    this.typing = false;
    this.noneCurrent();
  };

  /** SRC-14: a press in the input moves the caret, which makes the first suggestion active again. */
  private readonly onInputPointerDown = () => {
    this.firstCurrent();
  };

  /**
   * SRC-14, SRC-49 (TXI-4): while an input method composes nothing is current. Its end makes the first current again
   * through the `input` that a committed composition always produces (`onInput`), not at `compositionend` itself: a
   * render between the two would write the value back into the element before the controller has taken the committed
   * text (src/primitives/native-text.ts).
   */
  private readonly onBarCompositionStart = () => {
    this.barText.onCompositionStart();
    this.firstCurrent();
  };

  private readonly onHeaderCompositionStart = () => {
    this.headerText.onCompositionStart();
    this.firstCurrent();
  };

  // ── The bar (SRC-5, SRC-19) ────────────────────────────────────────────────────────────────────────────

  /** Whether an event came from the bar's own elements rather than a slot's icon button or the clear button. */
  private fromBar(event: Event) {
    for (const node of event.composedPath()) {
      if (node === this.barElement) return true;
      if (node instanceof HTMLElement && (node.classList.contains('leading') || node.classList.contains('trailing') || node.classList.contains('clear'))) return false;
    }
    return false;
  }

  private readonly onBarPointerDown = (event: PointerEvent) => {
    if (this.inert_ || !this.fromBar(event)) return;
    this.barPress.onPointerDown(event);
  };

  /** A press on the bar outside the input focuses the input without leaving it first (as the text field's TXF-8). */
  private readonly onBarMouseDown = (event: MouseEvent) => {
    const input = this.barInput;
    if (this.inert_ || !input || event.button !== 0 || !this.fromBar(event) || event.composedPath().includes(input)) return;
    event.preventDefault();
    input.focus();
  };

  /** SRC-5: a press on the bar — outside its slots and the clear button — focuses the input and opens the view. */
  private readonly onBarClick = (event: MouseEvent) => {
    if (this.inert_ || !this.fromBar(event)) return;
    const input = this.barInput;
    if (input && (this.renderRoot as ShadowRoot).activeElement !== input) input.focus();
    this.expand();
  };

  /** SRC-10: the clear button empties the value and gives focus back to the input it belongs to; nothing opens or closes. */
  private readonly onClear = (event: MouseEvent) => {
    const header = (event.currentTarget as Element).closest('.header');
    this.clearValue();
    (header ? this.headerInput : this.barInput)?.focus();
  };

  /** SRC-11, SRC-40: the back button closes the modal view it stands in — full-screen or dialog. */
  private readonly onBack = () => this.collapse('back');

  /** SRC-36: the trigger was activated (by pointer, touch, Enter or Space — a button's own click): the modal view opens. */
  private readonly onTriggerClick = () => {
    if (!this.inert_) this.expand();
  };

  /** SRC-36: where style queries are missing, the trigger's focus style is read when focus arrives (the glow). */
  private readonly onTriggerFocus = () => syncFocusStyle(this, this.triggerButton);

  /** SRC-40, SRC-6: a press on the dialog view's scrim — outside its container, begun and ended there — closes it. */
  private outsideDialog(event: MouseEvent) {
    const dialog = this.dialog;
    if (!dialog || event.target !== dialog || this.mode !== 'dialog') return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  private readonly onDialogPointerDown = (event: PointerEvent) => {
    this.scrimPressed = this.outsideDialog(event);
  };

  private readonly onDialogClick = (event: MouseEvent) => {
    const pressed = this.scrimPressed;
    this.scrimPressed = false;
    if (pressed && this.outsideDialog(event)) this.collapse('outside');
  };

  /** The scrim of a dialog view drawn in place (tests and documentation) answers as the backdrop does. */
  private readonly onScrimClick = () => this.collapse('outside');

  /** SRC-6: the browser's own close request without a key (Android's back) arrives as the dialog's cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.collapse('back');
  };

  // ── The suggestions (SRC-14 … SRC-17) ──────────────────────────────────────────────────────────────────

  /** The row that is pressed now; a new press ends the last one's at once. */
  private pressRow(row: HTMLElement) {
    if (this.pressedRow && this.pressedRow !== row) delete this.pressedRow.dataset.pressed;
    this.pressedRow = row;
  }

  private readonly onRowPointerDown = (event: PointerEvent) => {
    this.pressRow(event.currentTarget as HTMLElement);
    this.rowPress.onPointerDown(event);
  };

  /**
   * SRC-8: a press on a suggestion, on the status row or on the docked view's surface never takes focus from the input.
   * SRC-9, SRC-40: in a modal view a press on anything that takes no focus of its own keeps focus inside (on the header,
   * it goes to the input).
   */
  private readonly onViewMouseDown = (event: MouseEvent) => {
    if (!this.modal) {
      // SRC-8: a result is a link and takes focus when the person presses it, which is still focus inside the search.
      if (!rowOf(event, this)) event.preventDefault();
      return;
    }
    const path = event.composedPath();
    const focusable = path.some((node) => node instanceof HTMLElement && node.matches('input, textarea, select, button, a[href], [contenteditable], [tabindex]:not([tabindex="-1"])'));
    if (focusable) return;
    event.preventDefault();
    if (path.some((node) => node instanceof HTMLElement && node.classList.contains('header'))) this.headerInput?.focus();
  };

  private readonly onRowClick = (event: MouseEvent) => {
    const index = Number((event.currentTarget as HTMLElement).dataset.index);
    this.choose(index);
  };

  // ── Presenting the views (SRC-7, SRC-9, SRC-23) ────────────────────────────────────────────────────────

  /** SRC-7: the docked view, placed under the bar (or above it when there is more room there), as wide as it. */
  private place() {
    const view = this.view;
    const bar = this.barElement;
    if (!view || !bar || !this.viewShown) return;
    const style = getComputedStyle(view);
    const offset = Number.parseFloat(style.scrollMarginBlockStart) || 0;
    const margin = Number.parseFloat(style.scrollMarginBlockEnd) || 0;
    const box = bar.getBoundingClientRect();
    view.style.inlineSize = `${box.width}px`;
    const at = placeMenu({
      anchor: box,
      // SRC-14: measured capped, so following the bar never loses the active suggestion.
      surface: { width: box.width, height: naturalHeight(view, view.querySelector<HTMLElement>('.scroll')) },
      // The visible part of the window: above the on-screen keyboard.
      viewport: visibleViewport(),
      placement: 'bottom-start',
      offset,
      margin,
      rtl: false,
    });
    view.style.top = `${at.top}px`;
    view.style.left = `${box.left}px`;
    view.style.maxBlockSize = `${at.maxHeight}px`;
    view.classList.toggle('side-top', at.side === 'top');
  }

  /** SRC-7: follows the bar while it moves (scrolling, layout, the viewport, the keyboard) — asked by FollowController, frame by frame only while something moves. */
  private readonly follow = (): boolean => {
    const box = this.barElement?.getBoundingClientRect();
    const scroll = this.view?.querySelector<HTMLElement>('.scroll');
    const layout = `${box?.x},${box?.y},${box?.width},${box?.height},${viewportKey()},${scroll?.scrollHeight}`;
    if (layout === this.lastLayout) return false;
    this.lastLayout = layout;
    this.place();
    return true;
  };

  private readonly following = new FollowController(this, {
    followed: () => [this.barElement],
    sized: () => [this.view, this.view?.querySelector('.scroll')],
    check: this.follow,
  });

  private stopFollowing() {
    this.following.stop();
    this.lastLayout = '';
  }

  /** SRC-7, SRC-23: the docked view is drawn while expanded, docked and holding content; it grows in and fades out. */
  private syncView() {
    const view = this.view;
    if (!view) return;
    const wanted = this.expanded && !this.inert_ && !this.modal && this.viewHasContent;
    view.classList.toggle('inline', wanted && this.inline);
    // SRC-6: a view that is fading out holds nothing Tab could stop at.
    view.inert = !wanted && !this.inline;
    if (this.inline) {
      this.stopFollowing();
      this.viewShown = false;
      if (view.matches(':popover-open')) view.hidePopover();
      return;
    }
    if (wanted && !this.viewShown) {
      view.classList.remove('leaving');
      if (!view.matches(':popover-open')) view.showPopover();
      this.viewShown = true;
      this.place();
      this.following.start();
      view.classList.remove('entering');
      void view.offsetWidth; // restart the animation
      view.classList.add('entering');
    } else if (!wanted && this.viewShown) {
      this.viewShown = false;
      this.stopFollowing();
      view.classList.remove('entering');
      view.classList.add('leaving');
      const finish = () => {
        if (this.viewShown || !view.classList.contains('leaving')) return;
        view.classList.remove('leaving');
        if (view.matches(':popover-open')) view.hidePopover();
      };
      const running = view.getAnimations();
      if (running.length === 0) finish();
      else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
    }
  }

  /** SRC-9: the full-screen view above the on-screen keyboard. */
  private readonly onViewport = () => {
    const visual = window.visualViewport;
    const dialog = this.dialog;
    if (!visual || !dialog) return;
    dialog.style.setProperty('--_keyboard', `${Math.max(0, document.documentElement.clientHeight - (visual.offsetTop + visual.height))}px`);
  };

  /** SRC-9: modal over the whole window, the page held, focus to the header's input with the caret at the end. */
  private presentFull() {
    const dialog = this.dialog;
    if (!dialog || this.fullShown || !this.isConnected) return;
    if (!dialog.open) dialog.showModal();
    this.fullShown = true;
    modalLayer.add(this);
    holdPageScroll(this, true);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    this.onViewport();
    const input = this.headerInput;
    if (input) {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }

  /** SRC-9: out of the top layer (fading), the page given back, focus back to the bar's input — which does not reopen it. */
  private withdrawFull(restoreFocus = true) {
    const dialog = this.dialog;
    if (!this.fullShown) return;
    this.fullShown = false;
    modalLayer.delete(this);
    holdPageScroll(this, false);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    const active = deepActive();
    const inside = !!active && (dialog?.contains(active) || focusWithin(this) || active === document.body);
    if (dialog?.open) dialog.close();
    // SRC-9, SRC-40: focus back to the bar's input — which does not reopen it — or to the trigger.
    if (restoreFocus && inside && !this.inert_) (this.triggered ? this.trigger : this.barInput)?.focus();
  }

  private syncFull() {
    const dialog = this.dialog;
    if (!dialog) return;
    const wanted = this.expanded && !this.inert_ && this.modal;
    dialog.classList.toggle('inline', this.inline);
    if (this.inline) {
      if (this.fullShown) this.withdrawFull(false);
      // Drawn in place, the view is marked open and takes no focus of its own (`show()` would run the dialog's
      // focusing steps, in a view the page drew and nobody opened): the input keeps it where the person's act put it.
      if (wanted && !dialog.open) dialog.open = true;
      else if (!wanted && dialog.open) dialog.open = false;
      return;
    }
    if (wanted) this.presentFull();
    else this.withdrawFull();
  }

  // ── Updates ────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues<this>) {
    // SRC-27: an unknown presentation is drawn as docked, an unknown bar as the field and an unknown status as idle, and reported.
    if (changed.has('presentation') && !PRESENTATIONS.includes(this.presentation)) {
      report(this, 'SRC-27', `presentation "${this.presentation}" is not a value the search defines; it is drawn as "docked"`);
    }
    if (changed.has('bar') && !BARS.includes(this.bar)) report(this, 'SRC-27', `bar "${this.bar}" is not a value the search defines; it is drawn as "field"`);
    if (changed.has('status') && !STATUSES.includes(this.status)) report(this, 'SRC-27', `status "${this.status}" is not a value the search defines; it is read as "idle"`);
    // SRC-52: an iconSpace the search does not define is auto, reported; a change decides the column again.
    if (changed.has('iconSpace')) {
      if (!ICON_SPACES.includes(this.iconSpace)) report(this, 'SRC-52', `iconSpace "${this.iconSpace}" is not a value the search defines; it is drawn as "auto"`);
      this.decideIconColumn();
    }
    // SRC-14, SRC-49: the view the product opens or closes, or a search that becomes disabled, decides again what the
    // action key takes: the first suggestion or result while the view is open and the input has focus, else nothing.
    if (changed.has('expanded') || changed.has('disabled') || (changed as Map<PropertyKey, unknown>).has('formDisabled')) this.firstCurrent(true);
    if (this.active >= this.suggestions.length || !this.expanded) this.active = -1;
    // SRC-44: a group stands group.gap below whatever stands above it in the view and above whatever follows it; two
    // groups that follow each other stand one gap apart.
    let above = (this.expanded && !this.inert_ && this.suggestions.length > 0) || this.statusShown;
    this.entries.forEach((entry, index) => {
      if (entry instanceof TanreiSearchResultGroup) {
        const next = this.entries[index + 1];
        const [before, after] = [above, next ? !(next instanceof TanreiSearchResultGroup) : this.hasContent];
        if (entry.gapBefore !== before) entry.gapBefore = before;
        if (entry.gapAfter !== after) entry.gapAfter = after;
      }
      above = true;
    });
  }

  /**
   * SRC-38, SRC-39: the one `keydown` listener on the window, held only while the search is connected, enabled and told
   * to bind exactly one chord that no search shown before it has bound.
   * @internal
   */
  syncShortcut() {
    const chords = chordsOf(this.shortcut);
    let next: Binding | null = null;
    WAITING.delete(this);
    if (this.isConnected && this.bindShortcut && !this.inert_) {
      if (chords.length !== 1) {
        report(this, 'SRC-39', chords.length ? `bindShortcut is set and shortcut holds ${chords.length} chords; a sequence is not bound, so the search listens for nothing` : 'bindShortcut is set and shortcut is empty, so the search listens for nothing');
      } else {
        next = readBinding(chords[0]);
        const owner = next ? BOUND.get(next.id) : undefined;
        if (!next) report(this, 'SRC-39', `the chord "${chords[0]}" is not modifiers and one key; the search listens for nothing`);
        else if (owner && owner !== this) {
          report(this, 'SRC-39', `another search shown before this one binds the chord "${chords[0]}"; this one binds nothing`);
          WAITING.add(this);
          next = null;
        }
      }
    }
    if ((next?.id ?? null) === (this.binding?.id ?? null)) return;
    if (this.binding) {
      BOUND.delete(this.binding.id);
      window.removeEventListener('keydown', this.onWindowKeyDown);
      this.binding = null;
      // The chord is free: a search that waited for it takes it.
      for (const waiting of [...WAITING]) waiting.syncShortcut();
    }
    if (next) {
      BOUND.set(next.id, this);
      window.addEventListener('keydown', this.onWindowKeyDown);
      this.binding = next;
    }
  }

  /**
   * SRC-38, KBS-2: whose keyboard the chord is read for — the one the hint is written for: the nearest ancestor's
   * `data-tanrei-keyboard-convention` (the search's own included), else the platform's.
   */
  private get convention(): KeyboardConvention {
    return ambientConvention(this.renderRoot.firstElementChild ?? this) ?? platformConvention();
  }

  /**
   * SRC-38: the bound chord, pressed anywhere in the window, opens the search — as its trigger does, or by focusing its
   * input — and closes it again with the reason shortcut, and does nothing else. Left alone: a press something else has
   * taken, a key repeating while held, an input-method composition, and a chord without mod, ctrl or alt while focus is
   * in an element that takes text (the search's own input included), so that such a key types there.
   */
  private readonly onWindowKeyDown = (event: KeyboardEvent) => {
    const binding = this.binding;
    if (!binding || this.inert_ || event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return;
    if (!chordPressed(event, binding, this.convention)) return;
    if (!binding.mod && !binding.ctrl && !binding.alt && takesText(deepActive())) return;
    event.preventDefault();
    if (this.expanded) {
      this.collapse('shortcut');
      return;
    }
    if (!this.triggered) this.barInput?.focus();
    this.expand();
  };

  /**
   * SRC-36, SRC-37: what the trigger or the bar's input carries for assistive technology besides its name — the
   * shortcut as `aria-keyshortcuts`, in the form the keyboard shortcut it draws gives (KBS-12), and for a trigger that
   * it opens a dialog and whether that is open. An icon trigger is a Tanrei Button: they go on its native button.
   */
  private expose() {
    const drawn = this.renderRoot.querySelector<TanreiKeyboardShortcut>('tanrei-keyboard-shortcut');
    const keys = drawn?.ariaKeyShortcuts ?? null;
    const form = this.barForm;
    if (form !== 'icon') {
      const target = form === 'button' ? this.triggerButton : this.barInput;
      if (target) hostAria(target, { 'aria-keyshortcuts': keys });
      return;
    }
    const button = this.trigger as (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
    const expanded = String(this.expanded && !this.inert_);
    void button?.updateComplete?.then(() => {
      const native = button.shadowRoot?.querySelector('button');
      if (native) hostAria(native, { 'aria-haspopup': 'dialog', 'aria-expanded': expanded, 'aria-keyshortcuts': keys });
    });
  }

  protected override updated(changed: PropertyValues<this>) {
    // TXF-4: never written into a composition; a value set meanwhile waits for its end.
    this.barText.show();
    this.headerText.show();
    // Disabled, it submits nothing: said here too, since its attribute waits a frame where it holds focus.
    this.internals.setFormValue(this.disabled ? null : this.value, this.value);
    this.syncView();
    this.syncFull();
    this.listen(this.expanded && !this.inert_ && !this.modal && !this.inline);
    this.keepActions();
    this.syncShortcut();
    this.expose();
    // SRC-32: the results' leading glyphs are marked for the icon set that is active now (a design system was switched).
    if (changed.size === 0) for (const row of this.rows) row.markIcon();
    this.syncCurrentResult();
    // SRC-36: a docked view has no input of its own, so a trigger opens the dialog view instead.
    if (this.expanded && this.triggered && this.presentation !== 'dialog' && this.presentation !== 'full-screen') {
      report(this, 'SRC-36', `presentation "${this.presentation}" with a trigger (bar "${this.barForm}") has no input to type in; the view opens as "dialog"`);
    }
    // SRC-27, SRC-10, SRC-11: what a debug build reports.
    if (changed.has('label') && !this.label.trim()) report(this, 'SRC-27', 'label is empty, so the search field has no accessible name; give it a label');
    if (this.clearShown && this.words.lacks('clearLabel', this.clearLabel)) report(this, 'SRC-10', 'clearLabel is empty, so the clear button has no accessible name; give it one in the product’s language');
    if (this.modal && this.expanded && !this.inert_ && this.words.lacks('backLabel', this.backLabel)) report(this, 'SRC-11', 'backLabel is empty, so the back button has no accessible name; give it one in the product’s language');
  }

  private get clearShown() {
    return this.value !== '' && !this.inert_;
  }

  /** SRC-34: the bar's action buttons in reading order — the clear button while it is shown, then the trailing slot's elements. */
  private keepActions() {
    const bar = this.renderRoot.querySelector('.bar');
    const clear = bar?.querySelector<HTMLElement>(':scope > .clear') ?? null;
    const trailing = bar?.querySelector<HTMLSlotElement>('slot[name="trailing"]')?.assignedElements({ flatten: true }) ?? [];
    this.kept.set([...(clear ? [clear] : []), ...trailing.filter((element): element is HTMLElement => element instanceof HTMLElement)]);
  }

  /**
   * SRC-4, TXF-24: typed text is laid out by its own direction (`dir="auto"`) once it has a letter to tell it by; an
   * empty or letterless value keeps the layout's direction, so the caret and the placeholder stand at the bar's start
   * edge (an empty `dir="auto"` input is left to right in every layout).
   */
  /**
   * SRC-24: the input's semantics — a search field named by label; a combobox while its view shows the suggestions,
   * whose active descendant is the active suggestion once the person has moved to it (SRC-14).
   */
  private renderInput(place: 'bar' | 'header', listed: boolean) {
    const activeId = listed && this.active >= 0 && this.moved ? `option-${this.active}` : undefined;
    return html`<input
      part="input"
      class="input"
      type="search"
      enterkeyhint="search"
      dir=${/\p{L}/u.test(this.value) ? 'auto' : nothing}
      autocomplete="off"
      role=${listed ? 'combobox' : nothing}
      aria-autocomplete=${listed ? 'list' : nothing}
      aria-expanded=${listed ? 'true' : nothing}
      aria-controls=${listed ? 'listbox' : nothing}
      aria-activedescendant=${ifDefined(activeId)}
      aria-label=${ifDefined(this.label || undefined)}
      .placeholder=${this.placeholder}
      ?disabled=${this.inert_}
      @input=${this.onInput}
      @keydown=${this.onInputKeyDown}
      @focus=${this.onInputFocus}
      @blur=${this.onInputBlur}
      @pointerdown=${this.onInputPointerDown}
      @compositionstart=${place === 'bar' ? this.onBarCompositionStart : this.onHeaderCompositionStart}
      @compositionend=${place === 'bar' ? this.barText.onCompositionEnd : this.headerText.onCompositionEnd}
    />`;
  }

  /** SRC-10: an icon-only text Button showing close, small in the bar and medium in the header. */
  private renderClear(size: 'small' | 'medium') {
    return this.clearShown ? html`<tanrei-button class="clear" variant="text" size=${size} label=${this.words.get('clearLabel', this.clearLabel)} @click=${this.onClear}><span slot="icon" class="button-glyph"><span class="ink">${CLOSE_GLYPH}</span></span></tanrei-button>` : nothing;
  }

  /**
   * SRC-7, SRC-9, SRC-16, SRC-24, SRC-29, SRC-46: what a view holds, from top to bottom — the suggestions' listbox, the
   * status row, the results and result groups, then the product's content; a part that is absent takes no room.
   *
   * SRC-47, SRC-48: the status row's two live regions exist from the moment the view opens — the polite one holds
   * statusText while idle, the assertive one while the query failed; while loading both are empty, so nothing is
   * announced, and the loading indicator, named by statusText, stands in the text's place. SRC-50: the results are links
   * in one list named by label, outside the listbox, marked busy while loading.
   */
  private renderBody(listed: boolean) {
    const icons = this.iconColumn;
    const status = this.statusNow;
    const label = this.label || undefined;
    return html`<div class=${this.viewHasContent ? 'scroll' : 'scroll empty'}>
      ${listed
        ? html`<div part="listbox" class="listbox" id="listbox" role="listbox" aria-label=${ifDefined(this.label || undefined)}>
            ${this.suggestions.map(
              (s, i) => html`<div
                class="option"
                id="option-${i}"
                role="option"
                aria-selected=${i === this.active ? 'true' : 'false'}
                aria-labelledby="headline-${i}"
                aria-describedby=${ifDefined(s.supportingText ? `supporting-${i}` : undefined)}
                data-index=${i}
                ?data-active=${i === this.active}
                data-tanrei-shape
                @pointerdown=${this.onRowPointerDown}
                @pointerup=${this.rowPress.release}
                @pointercancel=${this.rowPress.release}
                @pointerleave=${this.rowPress.release}
                @click=${this.onRowClick}
              >
                ${icons || s.leadingIcon ? html`<span class="option-icon ${s.leadingIcon ? '' : 'empty'}" aria-hidden="true">${s.leadingIcon}</span>` : nothing}
                <span class="text">
                  <span class="headline" id="headline-${i}">${s.headline}</span>
                  ${s.supportingText ? html`<span class="supporting" id="supporting-${i}">${s.supportingText}</span>` : nothing}
                </span>
              </div>`,
            )}
          </div>`
        : nothing}
      <div part="status" class=${status === 'error' ? 'status error' : 'status'} ?data-shown=${this.statusShown}>
        ${status === 'loading' ? html`<tanrei-loading-indicator class="spinner" size="small" label=${this.statusText}></tanrei-loading-indicator>` : nothing}<span class="said" role="status"
          >${status === 'idle' ? this.statusText : ''}</span
        ><span class="said" role="alert">${status === 'error' ? this.statusText : ''}</span>
      </div>
      <div part="results" class="results" role="list" aria-label=${ifDefined(label)} aria-busy=${status === 'loading' ? 'true' : nothing} ?hidden=${this.entries.length === 0}>
        <slot name=${RESULT_SLOT}></slot>
      </div>
      <div class="content" ?hidden=${!this.hasContent}><slot></slot></div>
    </div>`;
  }

  /** SRC-37: the hint — the keyboard shortcut, hosted (KBS-13): its plain form (a line of text, no cap), small, the ambient convention, faded with the search. */
  private renderHint(hidden: boolean) {
    const keys = chordsOf(this.shortcut);
    return keys.length
      ? html`<tanrei-keyboard-shortcut class="hint" .keys=${keys} .hosted=${true} variant="plain" size="small" ?disabled=${this.inert_} ?hidden=${hidden}></tanrei-keyboard-shortcut>`
      : nothing;
  }

  /**
   * SRC-35, SRC-36: what stands in the bar's place while bar is button or icon — one button that opens a modal view.
   * As a button: the bar's container at the trigger's height, holding the search glyph, the placeholder (or the label)
   * and the hint. As an icon: an icon-only text Button showing the search glyph, from the Button's own tokens, and no
   * drawn hint (its keys are still exposed).
   */
  private renderTrigger(open: boolean, hidden: boolean) {
    const label = this.label || undefined;
    if (this.barForm === 'icon') {
      return html`<tanrei-button class="trigger-icon" variant="text" label=${ifDefined(label)} ?disabled=${this.inert_} ?hidden=${hidden} @click=${this.onTriggerClick}
          ><span slot="icon" class="button-glyph"><span class="ink">${SEARCH_GLYPH}</span></span></tanrei-button
        >${this.renderHint(true)}`;
    }
    return html`<button
      part="container"
      class="trigger"
      type="button"
      data-tanrei-shape
      aria-label=${ifDefined(label)}
      aria-haspopup="dialog"
      aria-expanded=${open ? 'true' : 'false'}
      ?disabled=${this.inert_}
      ?hidden=${hidden}
      @click=${this.onTriggerClick}
      @focus=${this.onTriggerFocus}
      @pointerdown=${this.barPress.onPointerDown}
      @pointerup=${this.barPress.release}
      @pointercancel=${this.barPress.release}
      @pointerleave=${this.barPress.release}
      @keydown=${this.barPress.onKeyDown}
      @keyup=${this.barPress.onKeyUp}
      @blur=${this.barPress.onBlur}
    >
      <span class="outline" aria-hidden="true"></span>
      <span class="hold" aria-hidden="true"></span>
      <span class="glyph" aria-hidden="true"><span class="ink">${SEARCH_GLYPH}</span></span>
      <span class="trigger-text" dir=${ownDirection(this.placeholder || this.label)} aria-hidden="true">${this.placeholder || this.label}</span>
      ${this.renderHint(false)}
    </button>`;
  }

  protected override render() {
    const open = this.expanded && !this.inert_;
    const mode = this.mode;
    const modal = mode !== 'docked';
    const hung = mode === 'dialog';
    const listed = open && this.suggestions.length > 0;
    const endButton = this.clearShown || this.trailingCount > 0;
    const body = this.renderBody(listed);
    // The <dialog> is never a Tab stop of its own view: Firefox reports `tabIndex` 0 for it, so the focus trap would
    // count it as the first one (SRC-9, SRC-49). `tabindex="-1"` says what every other engine assumes.
    // For tests and documentation, a modal view drawn in place stands for the window: what opened it is not drawn.
    const covered = this.inline && modal && open;
    const glyph = html`<span class="glyph" aria-hidden="true"><span class="ink">${SEARCH_GLYPH}</span></span>`;
    return html`
      ${this.triggered
        ? this.renderTrigger(open, covered)
        : html`<div
            part="container"
            class="bar"
            data-tanrei-shape
            ?data-leading=${this.hasLeading}
            ?data-end-button=${endButton}
            ?hidden=${covered}
            @pointerdown=${this.onBarPointerDown}
            @pointerup=${this.barPress.release}
            @pointercancel=${this.barPress.release}
            @pointerleave=${this.barPress.release}
            @mousedown=${this.onBarMouseDown}
            @click=${this.onBarClick}
          >
            <span class="outline" aria-hidden="true"></span>
            <span class="hold" aria-hidden="true"></span>
            <span class="leading" ?hidden=${!this.hasLeading}><slot name="leading" @slotchange=${this.#onSlotChange}></slot></span>
            ${this.hasLeading ? nothing : glyph} ${this.renderInput('bar', listed && !modal)} ${this.renderHint(this.value !== '')} ${this.renderClear('small')}
            <span class="trailing" ?hidden=${this.trailingCount === 0}><slot name="trailing" @slotchange=${this.#onSlotChange}></slot></span>
          </div>`}
      <div part="view" class="view" data-tanrei-shape popover=${this.inline ? nothing : 'manual'} role="none" @mousedown=${this.onViewMouseDown}>${modal ? nothing : body}</div>
      ${hung && covered ? html`<div class="scrim" @click=${this.onScrimClick}></div>` : nothing}
      <dialog
        part="dialog"
        class=${hung ? 'full hung' : 'full'}
        data-tanrei-appear
        ?data-tanrei-shape=${hung}
        tabindex="-1"
        aria-label=${ifDefined(this.label || undefined)}
        @cancel=${this.onNativeCancel}
        @mousedown=${this.onViewMouseDown}
        @pointerdown=${this.onDialogPointerDown}
        @click=${this.onDialogClick}
      >
        ${modal
          ? html`<div class="header" ?data-end-button=${this.clearShown}>
                <tanrei-button
                  class="back"
                  variant="text"
                  label=${this.words.get('backLabel', this.backLabel)}
                  aria-hidden=${
                    // SRC-11: in a view that is not open the button is in no one's reach, and a name it lacks is not
                    // missed yet — the search reports it when the view opens, as its own (the Button reports none for a
                    // button its host keeps from assistive technology, BTN-16).
                    ifDefined(this.expanded ? undefined : 'true')
                  }
                  @click=${this.onBack}
                  ><span slot="icon" class="button-glyph"><span class="ink">${BACK_GLYPH}</span></span></tanrei-button
                >
                ${this.renderInput('header', listed)} ${this.renderClear('medium')}
              </div>
              ${hung && !this.viewHasContent ? nothing : html`<div class="divider" aria-hidden="true"></div>`} ${body}`
          : nothing}
      </dialog>
    `;
  }
}

if (!customElements.get(RESULT)) customElements.define(RESULT, TanreiSearchResult);
if (!customElements.get(RESULT_GROUP)) customElements.define(RESULT_GROUP, TanreiSearchResultGroup);
if (!customElements.get('tanrei-search-suggestion')) customElements.define('tanrei-search-suggestion', TanreiSearchSuggestion);
// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiSearch);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiSearch);
if (!customElements.get('tanrei-search')) customElements.define('tanrei-search', TanreiSearch);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-search': TanreiSearch;
    'tanrei-search-suggestion': TanreiSearchSuggestion;
    'tanrei-search-result': TanreiSearchResult;
    'tanrei-search-result-group': TanreiSearchResultGroup;
  }
  interface HTMLElementEventMap {
    'tanrei-search-suggestion-update': Event;
    'tanrei-search-result-update': Event;
  }
}

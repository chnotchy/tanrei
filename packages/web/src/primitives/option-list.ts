import { type CSSResult, type ReactiveController, type ReactiveControllerHost, type TemplateResult, html, nothing, unsafeCSS } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { iconGlyph } from '../styles/icons.js';
import { productText } from '../styles/product-text.js';
import { cornerRadius } from '../styles/shape.js';
import { AnchoredSurfaceController, anchoredSurfaceStyles } from './anchored.js';
import { focusRing, syncFocusStyle } from './focus-ring.js';
import { itemRowStyles, rowTarget } from './item-row.js';
import { PressController, pressHold } from './press.js';
import { RovingKeys } from './roving.js';
import { SELECTION_STATES } from './selection.js';
import { separationHost, syncSeparation, whenGap } from './separation.js';

// A list of options that opens from a field (a select, SEL-24 … SEL-45; a combobox, which shares the field, the list
// and the options and adds a text input). Three things are shared, and each is here once:
//
//   the options   `<tanrei-option>` and `<tanrei-option-group>` children of the field (src/components/option/): data
//                 the field reads (`readOptions()`), and reads again when they change (`OptionsController`). They draw
//                 nothing themselves.
//   the list      the rows the field renders in its own shadow root from that data — so that the field's combobox, its
//                 `aria-controls` list box and its `aria-activedescendant` option are in one tree — on the raised sheet
//                 a menu and a popover are drawn on, placed against the field as a popover is against its anchor
//                 (`optionListStyles()`, `anchoredOptionList()`, `OptionListController.render()`).
//   the active    the one option the keys act on and assistive technology is told of, moved by the arrow keys, Home,
//   option        End, the page keys, typing and the pointer, pressed and chosen (`OptionListController`). Focus is
//                 never moved into the list: it stays on the field.
//
// The rows are drawn while the list is shown and at no other time: a field that is closed holds the placed box, the
// sheet and an empty list box (what `aria-controls` names), and no row — so what a closed field costs to draw, and to
// draw again, does not grow with the number of its options. The rows are made by the render that opens the list and
// taken away once it has closed and faded out (`OptionListController.drawn`). Everything a closed field needs of its
// options — the chosen one's label and glyph, the form's value, what a typed character finds — is read from the data.
//
// A long list (more than `OPTION_WINDOW_FROM` options shown) draws only the rows near the box that scrolls, and the
// active option with its neighbours; a row that is not drawn is room of its height (`.skipped`), so the box scrolls
// over the whole list and every option is reached by scrolling and by the keys. What assistive technology is told
// does not change: each drawn option says its position and the number of options, the active option is always drawn,
// and a group that draws any of its options draws its title. A list of fewer options draws them all.
//
// Nothing here knows which field it is drawn for. The component gives its token prefix (`--tanrei-comp-select`), whose
// tokens the list reads by the names every such field has (`list.*`, `option.*`, `group.*`, `divider.*`, `motion.*`,
// and per variant `<variant>.[<state>.]option.*` and `<variant>.[<state>.]selected-option.*`), and what its own rules
// decide: which options are drawn (a combobox draws the ones its filter leaves), which is the chosen one, what an
// option's label is drawn as (a combobox marks the match), and what choosing does.

/** The option's element: one choice. Data for its field. */
export const OPTION_TAG = 'tanrei-option';
/** The group's element: a run of options under an optional title. */
export const OPTION_GROUP_TAG = 'tanrei-option-group';
/** The attributes of the two elements that their field reads (the properties reflect to them). */
export const OPTION_ATTRIBUTES = ['label', 'value', 'supporting-text', 'leading-icon', 'disabled'] as const;
/**
 * The two attributes of every element that say what an option's — or a group's — own words are: the language they are
 * in, and their direction where their first letter does not tell it. The field reads them with the words and gives
 * them to what it draws from those words (the row, the value it shows): the option itself is never drawn, so nothing
 * would inherit them from it.
 */
export const OPTION_TEXT_ATTRIBUTES = ['lang', 'dir'] as const;

/** One option, as its field reads it. */
export interface OptionData {
  /** The `<tanrei-option>` it was read from. */
  element: Element;
  /** Its place among every option of the field, in order and across groups, from 0: its row's id is `option-<index>`. */
  index: number;
  /** The `label` attribute or, without one, the element's text. */
  label: string;
  value: string;
  supportingText: string;
  leadingIcon: string;
  disabled: boolean;
  /** The language its words are in: its `lang` attribute, or its group's. Empty where neither says: the field's, then. */
  lang: string;
  /** The direction of its words, where it — or its group — says one (`dir`). Empty where neither does: each text's own, by its first strong character. */
  dir: string;
}

/** One group, as its field reads it. */
export interface OptionGroupData {
  /** The `<tanrei-option-group>` it was read from. */
  element: Element;
  /** Its place among the field's groups, from 0: its title's id is `group-<index>`. */
  index: number;
  /** The `label` attribute: the title. Empty draws none and leaves the group unnamed. */
  title: string;
  /** The language its title is in (`lang`), and its options' unless one says its own. Empty where it says none. */
  lang: string;
  /** The direction of its title (`dir`), and of its options' words unless one says its own. Empty where it says none. */
  dir: string;
  options: OptionData[];
}

/** An element of the list, in the order drawn: an option outside any group, or a group with its options. */
export type OptionEntry = { kind: 'option'; option: OptionData } | { kind: 'group'; group: OptionGroupData };

/** What a field's children say. */
export interface OptionModel {
  /** The list's elements, in order. */
  entries: OptionEntry[];
  /** Every option, in order and across groups. */
  options: OptionData[];
  /** Whether any option has a leading icon (the closed field sizes itself to show a chosen option's icon). */
  hasIcons: boolean;
  /** Groups found inside a group: their options are drawn as the outer group's, and the field reports them. */
  nested: Element[];
}

const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * What `element` or the nearest group around it says of its own words, below its owner: a `lang` or a `dir`. The owner
 * is the element whose child the option — or its outermost group — is in the page: the field itself, or, for an option
 * that reaches the field through a slot, the element it was written in. The
 * owner's own, and the page's, are inherited by everything the field draws.
 */
function said(element: Element, name: (typeof OPTION_TEXT_ATTRIBUTES)[number], owner: Element | null): string {
  for (let at: Element | null = element; at && at !== owner; at = at.parentElement) {
    const value = at.getAttribute(name)?.trim();
    if (value) return value;
  }
  return '';
}

function readOption(element: Element, index: number, owner: Element | null): OptionData {
  return {
    element,
    index,
    label: element.getAttribute('label') || text(element),
    value: element.getAttribute('value') ?? '',
    supportingText: element.getAttribute('supporting-text') ?? '',
    leadingIcon: (element.getAttribute('leading-icon') ?? '').trim(),
    disabled: element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false',
    lang: said(element, 'lang', owner),
    dir: said(element, 'dir', owner),
  };
}

/** What a reading went through to find its options (O4): `OptionsController` hears and observes these. */
interface Passage {
  /** Whether the field has a `<slot>` among its children that stands for the elements assigned to it. */
  slots: boolean;
  /** Each element that reached the field through such a slot, in order. */
  assigned: Element[];
}

/**
 * Reads a field's options: its `<tanrei-option>` and `<tanrei-option-group>` children, in order. A group inside a group
 * gives its options to the outer group and is listed in `nested`; anything else among the children (a slotted glyph)
 * is not an option.
 *
 * A child that is a `<slot>` with no `slot` attribute stands for the elements assigned to it, flattened, in its place
 * — each read as though it were the field's child there: how an element composed
 * around the field, or a product's own, gives it the options written as that element's children, which are never
 * moved or copied. A `<slot>` that names a slot of the field's own (a glyph passed on) is not read for options, and a
 * `<slot>` inside a group is not followed. `through`, where given, is told what the reading went through.
 */
export function readOptions(host: Element, through?: Passage): OptionModel {
  const entries: OptionEntry[] = [];
  const options: OptionData[] = [];
  const nested: Element[] = [];
  let groups = 0;
  const take = (element: Element, owner: Element | null): OptionData => {
    const option = readOption(element, options.length, owner);
    options.push(option);
    return option;
  };
  const inside = (group: Element, into: OptionData[], owner: Element | null) => {
    for (const child of group.children) {
      if (child.localName === OPTION_TAG) into.push(take(child, owner));
      else if (child.localName === OPTION_GROUP_TAG) {
        nested.push(child);
        inside(child, into, owner);
      }
    }
  };
  // O5: an option's own words are looked for up to its owner — the element it is a child of in the page.
  const top = (child: Element) => {
    const owner = child.parentElement;
    if (child.localName === OPTION_TAG) entries.push({ kind: 'option', option: take(child, owner) });
    else if (child.localName === OPTION_GROUP_TAG) {
      const group: OptionGroupData = { element: child, index: groups++, title: child.getAttribute('label') ?? '', lang: said(child, 'lang', owner), dir: said(child, 'dir', owner), options: [] };
      inside(child, group.options, owner);
      entries.push({ kind: 'group', group });
    }
  };
  for (const child of host.children) {
    if (child.localName === 'slot' && !child.hasAttribute('slot')) {
      if (through) through.slots = true;
      for (const assigned of (child as HTMLSlotElement).assignedElements({ flatten: true })) {
        through?.assigned.push(assigned);
        top(assigned);
      }
    } else top(child);
  }
  return { entries, options, hasIcons: options.some((option) => !!option.leadingIcon), nested };
}

/**
 * The model with only the options `keep` keeps, each with the index it had: a group the filter leaves empty is not
 * drawn, and neither is its title (what a combobox draws while the person types).
 */
export function filterOptions(model: OptionModel, keep: (option: OptionData) => boolean): OptionModel {
  const entries: OptionEntry[] = [];
  for (const entry of model.entries) {
    if (entry.kind === 'option') {
      if (keep(entry.option)) entries.push(entry);
    } else {
      const options = entry.group.options.filter(keep);
      if (options.length) entries.push({ kind: 'group', group: { ...entry.group, options } });
    }
  }
  const options = entries.flatMap((entry) => (entry.kind === 'option' ? [entry.option] : entry.group.options));
  return { entries, options, hasIcons: model.hasIcons, nested: model.nested };
}

type Host = ReactiveControllerHost & HTMLElement;

/** What the field's own children, and each element that reaches it through a slot, are observed for. */
const OBSERVED: MutationObserverInit = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...OPTION_ATTRIBUTES, ...OPTION_TEXT_ATTRIBUTES] };

/**
 * Keeps a field's options read: when the host is connected, and whenever a `<tanrei-option>` or a
 * `<tanrei-option-group>` is added, removed, moved or changed (an attribute the field reads, or the text that is its
 * label). The host is rendered again; `changed` is told first.
 *
 * Options that reach the field through a slot (`readOptions()`, O4) are not its descendants, so the
 * one observer does not see them: the controller also hears `slotchange` on the host — the event of a slot among its
 * children bubbles to it, and so does that of a slot assigned to that slot, at any depth — and observes each element
 * assigned through a slot as it observes the host's own children, the set rebuilt when a reading finds it changed.
 * A field with no slot among its children hears and observes nothing more than before.
 */
export class OptionsController implements ReactiveController {
  model: OptionModel = { entries: [], options: [], hasIcons: false, nested: [] };
  private readonly observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** O4: the elements observed because they reach the host through a slot. */
  private assigned: Element[] = [];
  private readonly onSlotChange = (event: Event) => {
    // The host's own shadow tree is not heard here (a `slotchange` is not composed); a slot that names one of the
    // host's own slots passes a glyph, not options.
    const slot = event.target as Element | null;
    if (slot?.localName === 'slot' && !(slot.parentElement === this.host && slot.hasAttribute('slot'))) this.read();
  };

  constructor(
    private readonly host: Host,
    private readonly changed?: (model: OptionModel) => void,
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.observer?.observe(this.host, OBSERVED);
    this.host.addEventListener('slotchange', this.onSlotChange);
    this.read();
  }

  hostDisconnected() {
    this.observer?.disconnect();
    this.assigned = [];
    this.host.removeEventListener('slotchange', this.onSlotChange);
  }

  /** Reads the options now. Called for you; call it after changing an option in a way no mutation tells. */
  read() {
    const through: Passage = { slots: false, assigned: [] };
    this.model = readOptions(this.host, through);
    this.observe(through.assigned);
    this.changed?.(this.model);
    this.host.requestUpdate();
  }

  /** O4: each element that came through a slot is observed as a child is; one that no longer comes is let go. */
  private observe(assigned: Element[]) {
    const was = this.assigned;
    if (!this.observer || (assigned.length === was.length && assigned.every((element, index) => element === was[index]))) return;
    const now = new Set(assigned);
    if (was.some((element) => !now.has(element))) {
      // An observer lets go of everything or nothing: what it has not delivered yet is this reading's already.
      this.observer.disconnect();
      this.observer.observe(this.host, OBSERVED);
      for (const element of assigned) this.observer.observe(element, OBSERVED);
    } else {
      const had = new Set(was);
      for (const element of assigned) if (!had.has(element)) this.observer.observe(element, OBSERVED);
    }
    this.assigned = assigned;
  }
}

// ── The list's styles ──────────────────────────────────────────────────────────────────────────────────────

/** The parts an option's condition colors in every state: private key → token part. `c` is the row's fill. */
const PARTS = { c: 'container-color', l: 'label-color', s: 'supporting-text-color', li: 'leading-icon-color', m: 'mark-color' } as const;
/** An option's two conditions (its state variants): every option, and the chosen one. */
const CONDITIONS = ['option', 'selected-option'] as const;
/** Only the chosen option draws a mark. */
const HAS = (condition: string, part: string) => part !== 'mark-color' || condition === 'selected-option';
/**
 * The row primitive (item-row.ts) reads `<prefix>-<condition>-[<state>-]<part>`; a field's option tokens are its
 * variant's (`<prefix>-<variant>-[<state>-]<condition>-<part>`: the list holds the same values under every variant, a
 * token test says so). The variant's are given the names the primitive reads, under this private prefix.
 */
const ROW = '--_option';
const STATE_NAMES = Object.keys(SELECTION_STATES).filter(Boolean);

/** The rows' colors from one variant's tokens, under `selector`; `fallback` is the variant read where the system has none of `variant`. */
export function optionVariantRules(prefix: string, variant: string, selector: string, fallback: string | null = null): string {
  const token = (look: string, state: string, condition: string, part: string) => `${prefix}-${look}-${state ? `${state}-` : ''}${condition}-${part}`;
  const value = (state: string, condition: string, part: string) =>
    fallback ? `var(${token(variant, state, condition, part)}, var(${token(fallback, state, condition, part)}))` : `var(${token(variant, state, condition, part)})`;
  const lines = CONDITIONS.flatMap((condition) =>
    ['', ...STATE_NAMES].flatMap((state) =>
      Object.values(PARTS)
        .filter((part) => HAS(condition, part))
        .map((part) => `    ${ROW}-${condition}-${state ? `${state}-` : ''}${part}: ${value(state, condition, part)};`),
    ),
  );
  return `${selector} {\n${lines.join('\n')}\n  }`;
}

export interface OptionListStyleOptions {
  /** The field's token prefix: `--tanrei-comp-select`. */
  prefix: `--tanrei-comp-${string}`;
  /** The field's variants that every design system has, the default first; a variant a layer adds takes `optionVariantRules()`. */
  variants: readonly string[];
  /** The least width of a list under a narrower field, as a CSS expression; left out by a field that names none. */
  minWidth?: string;
  /**
   * The most a list grows past a narrower field for its options, as a CSS expression. Given, the list is as wide as its
   * options need unwrapped, never narrower than the field and never wider than this or the field (a select, SEL-25);
   * left out, it is exactly as wide as the field (a combobox, CMB-22).
   */
  maxWidth?: string;
}

/** The most the list may be now: what the placement allows (the window less its margins, or the room its side leaves). */
const MAX_INLINE = 'var(--_anchored-max-inline, 100vw)';
const MAX_BLOCK = 'var(--_anchored-max-block, 100vh)';
/** The field's width, which the list is never narrower than (written while the list is placed). */
const ANCHOR_INLINE = 'var(--_anchored-anchor-inline, 0px)';

/** Where each state of a row is read. Every selector has the same specificity, so the order is the precedence. */
const on = (state: string) => {
  // SEL-32: the active option by the keyboard is the focused one; focus itself stays on the field.
  if (state === ':focus-visible') return '.row.p.kf';
  if (state === ':disabled') return '.row.p.d';
  if (state === ':hover') return '.row.p:hover';
  return `.row.p${state}`;
};

/**
 * The list's styles (SEL-24, SEL-25, SEL-30, SEL-37 … SEL-45, SEL-53, SEL-55, SEL-59): the placed box and its motion,
 * the raised sheet, the box that scrolls, the rows with their columns, conditions, states, press answers and focus
 * indicator, the group titles and what separates the groups. Every value is a token of `prefix`.
 */
export function optionListStyles({ prefix, variants, minWidth, maxWidth }: OptionListStyleOptions): CSSResult {
  const T = (name: string) => `var(${prefix}-${name})`;
  const [first, ...others] = variants;
  const motion = `${T('motion-state-duration')} ${T('motion-state-easing')}`;
  return unsafeCSS(`
  /* The rows' colors, from the variant's option tokens: the default's for every value the field does not know. */
  ${optionVariantRules(prefix, first, ':host')}
  ${others.map((variant) => optionVariantRules(prefix, variant, `:host([variant='${variant}'])`)).join('\n  ')}
  :host {
    ${ROW}-motion-state-duration: ${T('motion-state-duration')};
    ${ROW}-motion-state-easing: ${T('motion-state-easing')};
    ${ROW}-motion-feedback-duration: ${T('motion-feedback-duration')};
    ${ROW}-container-shape: ${T('option-shape')};
    ${ROW}-container-shape-pill: var(${prefix}-option-shape-pill, 0);
${STATE_NAMES.map((state) => `    ${ROW}-${state}-container-shape: ${T('option-shape')};\n    ${ROW}-${state}-container-shape-pill: var(${prefix}-option-shape-pill, 0);\n    ${ROW}-${state}-opacity: ${T(`${state}-opacity`)};`).join('\n')}
  }
  /* What separates the groups: the field's attribute, else its separation token. */
  ${separationHost(`${prefix}-separation`)}

  /* The placed box and its motion: in the top layer, or in place for a fixture (src/primitives/anchored.ts). */
  ${anchoredSurfaceStyles({
    surface: '.surface',
    motion: '.motion',
    offset: T('list-offset'),
    margin: T('list-viewport-margin'),
    open: { duration: T('motion-open-duration'), easing: T('motion-open-easing') },
    close: { duration: T('motion-close-duration'), easing: T('motion-close-easing') },
  })}

  /* The sheet: its color, elevation and corners (eased by the smoothing), its options clipped to that shape; ${
    maxWidth
      ? `as wide as its options need unwrapped — never narrower than the field or its least width, never wider than its
     greatest width or the field where the field is wider — a long list taking the width of the rows it drew as it opened
     (--_list-content, OptionListController)`
      : `as wide
     as the field${minWidth ? ', at least its least width' : ''}`
  }, never wider than the window allows; as tall as its options and paddings up to its
     greatest height and the room its side leaves. */
  .list {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
${
  maxWidth
    ? `    inline-size: var(--_list-content, max-content);
    min-inline-size: min(max(${ANCHOR_INLINE}, ${minWidth ?? '0px'}), ${MAX_INLINE});
    max-inline-size: min(max(${ANCHOR_INLINE}, ${maxWidth}), ${MAX_INLINE});`
    : `    inline-size: var(--_anchored-anchor-inline, auto);
    min-inline-size: ${minWidth ? `min(${minWidth}, ${MAX_INLINE})` : '0'};
    max-inline-size: ${MAX_INLINE};`
}
    max-block-size: min(${T('list-max-height')}, ${MAX_BLOCK});
    overflow: hidden;
    background: ${T('list-color')};
    box-shadow: ${T('list-elevation')};
    text-align: start;
    cursor: default;
    ${cornerRadius(`${prefix}-list-shape`)}
  }
  /* The options scroll inside the sheet, vertically only, the paddings with them. It also carries press-hold for the
     rows' press (it has no transition of its own). */
  .scroll {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: ${T('list-padding-block')};
    padding-inline: ${T('list-padding-inline')};
    outline: none;
  }
  ${pressHold('.scroll')}
  /* What a field draws after the options (a combobox's status row) stands under the box that scrolls, in the sheet: the
     options scroll above it and it stays in view. The end padding is then below it, and a list that draws no option is
     that row alone. */
  .list.tail > .scroll {
    padding-block-end: 0;
  }
  .list.bare > .scroll {
    display: none;
  }
  .group {
    display: flex;
    flex: none;
    flex-direction: column;
  }
  /* A long list: the room of the rows that are not drawn now, as tall as they would be (the script writes the height). */
  .skipped {
    flex: none;
  }
  /* A group's title: above its options, inset from the rows' edges, wrapping; never a choice. */
  .group-title {
    display: block;
    padding-block: ${T('option-padding-block')};
    padding-inline: ${T('group-title-padding-inline')};
    font: ${T('group-title-typescale-font')};
    letter-spacing: ${T('group-title-typescale-letter-spacing')};
    color: ${T('group-title-color')};
    overflow-wrap: break-word;
  }
  /* Divider: a line across the list's inner width with space above and below. Gap: empty space in its place, and no
     line. The cascade answers which (the attribute over the token), so a change of either is followed at once. */
  .divider {
    flex: none;
    block-size: ${T('divider-thickness')};
    margin-block: ${T('divider-space')};
    background: ${T('divider-color')};
  }
  .gap {
    display: none;
    flex: none;
    block-size: ${T('group-gap')};
  }
  ${whenGap(
    '.scroll',
    (scroll) => `
  ${scroll} > .divider {
    display: none;
  }
  ${scroll} > .gap {
    display: block;
  }`,
  )}

  /* The glyphs: an option's own, in the family and fill of its condition, and the check, always the selected ones. */
  ${iconGlyph('.option-icon', { size: `${prefix}-option-leading-icon-size`, selected: '.row.selected', duration: `${prefix}-motion-state-duration`, easing: `${prefix}-motion-state-easing` })}
  ${iconGlyph('.check', { size: `${prefix}-option-mark-size`, selected: '.mark', duration: `${prefix}-motion-state-duration`, easing: `${prefix}-motion-state-easing` })}

  /* The conditions, the states and their precedence, the paints, the ripple and the state motion (item-row.ts). */
  ${itemRowStyles({
    prefix: ROW,
    parts: PARTS,
    conditions: { option: '.row', 'selected-option': '.row.selected' },
    on,
    paints: { '.option-label': 'l', '.option-supporting': 's', '.option-icon': 'li' },
  })}
  .row.p {
    -webkit-user-select: none;
  }
  .row.p.d {
    cursor: default;
  }
  /* One row: the padding at each end (logical, so right-to-left mirrors), at least the option's height and the minimum
     target tall, growing with its content and never cutting it. */
  .row {
    display: flex;
    flex: none;
    align-items: center;
    padding-block: ${T('option-padding-block')};
    padding-inline: ${T('option-padding-inline')};
  }
  ${rowTarget('.row', T('option-height'))}
  /* The columns — the leading icon, the texts, the check's box — a gap apart, each centred on the label's first line. */
  .row-content {
    --_first: max(1lh, ${T('option-mark-size')}, ${T('option-leading-icon-size')});
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    gap: ${T('option-gap')};
    min-inline-size: 0;
    font: ${T('option-label-typescale-font')};
    letter-spacing: ${T('option-label-typescale-letter-spacing')};
  }
  .row-column {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
  }
  .row-column.leading {
    margin-block-start: calc((var(--_first) - ${T('option-leading-icon-size')}) / 2);
  }
  .row-column.mark {
    inline-size: ${T('option-mark-size')};
    block-size: ${T('option-mark-size')};
    margin-block-start: calc((var(--_first) - ${T('option-mark-size')}) / 2);
  }
  .row-text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
    padding-block-start: calc((var(--_first) - 1lh) / 2);
  }
  .option-label,
  .option-supporting {
    overflow-wrap: break-word;
  }
  .option-supporting {
    font: ${T('option-supporting-text-typescale-font')};
    letter-spacing: ${T('option-supporting-text-typescale-letter-spacing')};
  }
  /* Each text is its own run, in the direction of its first strong character, aligned to the layout's start. */
  ${productText(':is(.option-label, .option-supporting, .group-title)', { align: 'start' })}

  /* An option's glyph, and the check, are drawn once the icon set can draw them (GlyphDrawnController sets
     data-drawn): until then nothing stands in the box, never the glyph's name. An option without a glyph keeps the
     column. */
  .option-icon:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  /* The check: in the mark color of the chosen option's state, faded in and out over the state motion and never moved
     or scaled; nothing in its box for any other option. */
  .check {
    color: var(--_m);
    opacity: 0;
    visibility: hidden;
    transition:
      opacity ${motion},
      visibility ${motion},
      color ${motion},
      font-variation-settings ${motion};
  }
  .row.selected .check {
    opacity: 1;
  }
  .row.selected .check[data-drawn] {
    visibility: visible;
  }
  .check:not([data-drawn]) {
    transition: none;
  }

  /* The focus indicator of the option that is active by the keyboard: inside the row, which the list would otherwise
     clip, never animated. Focus itself is on the field, so the row carries the mark (kf) and the focus style's name. */
  ${focusRing((focus) => (focus === ':focus-visible' ? '.row.kf' : ".row.kf[data-focus-style='glow']"), { inside: true })}

  @media (prefers-reduced-motion: reduce) {
    .check {
      transition: none;
    }
  }
  /* Forced colors: an edge round the list, the active option in the highlight colors, a disabled option in the
     disabled text color; the chosen option is then shown by its check alone. */
  @media (forced-colors: active) {
    .list {
      border: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
    .divider {
      background: CanvasText;
    }
    .row.p.d,
    .row.p.d :is(.option-label, .option-supporting, .option-icon, .check) {
      color: GrayText;
    }
    .row.p.active {
      forced-color-adjust: none;
      background: Highlight;
    }
    .row.p.active :is(.option-label, .option-supporting, .option-icon, .check) {
      color: HighlightText;
    }
  }
`);
}

// ── Where the list is ──────────────────────────────────────────────────────────────────────────────────────

export interface AnchoredOptionListOptions {
  /** The field's box: the list's anchor and its opener. */
  anchor: () => Element | null;
  /** Drawn in place below the field, for a fixture. */
  inline: () => boolean;
  /** The field went out of sight while the list is shown. */
  gone: () => void;
}

/**
 * The list as an anchored surface (src/primitives/anchored.ts), placed as a popover whose placement is bottom-start
 * and whose width is its anchor's (a list that widens is at least that wide): below the field with the start edges
 * together, above it where below has no room, limited to the room where neither has, following the field, without an
 * arrow.
 */
export function anchoredOptionList(host: Host & { renderRoot: HTMLElement | DocumentFragment }, { anchor, inline, gone }: AnchoredOptionListOptions): AnchoredSurfaceController {
  const find = (selector: string) => host.renderRoot?.querySelector<HTMLElement>(selector) ?? null;
  return new AnchoredSurfaceController(host, {
    surface: () => find('.surface'),
    motion: () => find('.motion'),
    box: () => find('.list'),
    anchor,
    placement: () => 'bottom-start',
    fallback: 'bottom-start',
    auto: ['bottom', 'top'],
    autoAlign: 'start',
    offset: () => null,
    crossOffset: () => 0,
    arrow: () => false,
    matchWidth: () => true,
    inline,
    // Limited to the room its side leaves down to one option and the paddings; with less, it covers the field.
    least: () => {
      const scroll = find('.scroll');
      const row = find('.row');
      if (!scroll || !row) return { width: 0, height: 0 };
      const style = getComputedStyle(scroll);
      return { width: 0, height: row.offsetHeight + (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0) };
    },
    scroller: () => find('.scroll'),
    gone,
  });
}

// ── The active option ──────────────────────────────────────────────────────────────────────────────────────

/** How far Page Down and Page Up move the active option. */
export const OPTION_PAGE = 10;
/** A list that shows more options than this draws only the rows near the box that scrolls. */
export const OPTION_WINDOW_FROM = 100;
/** The rows a long list draws from its start before any row has been measured. */
const UNMEASURED_ROWS = 40;
/** How often in a row a measurement may ask for another render: heights that never settle are left as they are. */
const SETTLE_PASSES = 4;

/** The rows a long list draws: those near the box that scrolls, and the active option's neighbours. */
interface OptionWindow {
  /** What is drawn, as one comparable string. */
  key: string;
  /** Whether the option at `index` — its place among the options shown, from 0 — is drawn. */
  has: (index: number) => boolean;
}

/** An element's own block size as laid out, fractions kept (a row and a title are border boxes; neither has a margin). */
const blockSize = (element: Element) => Number.parseFloat(getComputedStyle(element).blockSize) || 0;
/** The boxes of the glyphs the list draws by name, for GlyphDrawnController. */
export const OPTION_GLYPHS = '.check, .option-icon';
/** The boxes of the glyphs the icon set may mirror in right-to-left (the check is never mirrored), for GlyphMirrorController. */
export const OPTION_MIRRORED = '.option-icon';
/** The id of an option's row in the field's shadow root: what `aria-activedescendant` names. */
export const optionId = (option: OptionData) => `option-${option.index}`;

/**
 * Whether an option keeps the room of the leading icon column where it has no icon (SEL-66): `auto` while another
 * option of its section has an icon, `always` in every option, `never` only where it has one. A closed set: the menu's
 * values.
 */
export type OptionIconSpace = 'auto' | 'always' | 'never';
export const OPTION_ICON_SPACES: readonly OptionIconSpace[] = ['auto', 'always', 'never'];

/**
 * The options of `model` that keep the leading icon column (SEL-66). A section is a group, or a run of adjacent options
 * outside any group — what is separated from its neighbours (SEL-45) — and while `space` is auto its options keep the
 * column where any of them has an icon.
 */
export function iconColumns(model: OptionModel, space: OptionIconSpace): (option: OptionData) => boolean {
  if (space === 'always') return () => true;
  if (space === 'never') return (option) => !!option.leadingIcon;
  const kept = new Set<OptionData>();
  const close = (section: readonly OptionData[]) => {
    if (section.some((option) => !!option.leadingIcon)) for (const option of section) kept.add(option);
  };
  let run: OptionData[] = [];
  for (const entry of model.entries) {
    if (entry.kind === 'option') {
      run.push(entry.option);
      continue;
    }
    close(run);
    run = [];
    close(entry.group.options);
  }
  close(run);
  return (option) => kept.has(option);
}

export interface OptionListOptions {
  /** The options the list draws now, in order (a combobox gives the ones its filter leaves). */
  model: () => OptionModel;
  /** The chosen option: the one drawn with the fill and the check. */
  chosen: () => OptionData | null;
  /** The person confirmed `option` — a press, Enter or Space; never a disabled option. */
  choose: (option: OptionData, event: Event) => void;
  /**
   * The field's iconSpace, read as a value it defines (SEL-66): which options keep the leading icon column, section by
   * section. A field that gives none keeps the column in every option while any option it draws has an icon.
   */
  iconSpace?: () => OptionIconSpace;
  /**
   * The option that becomes the active one when the active one is no longer drawn, or while none is; the one an
   * opening list has when left out (SEL-36). A combobox names the first that is not disabled, or none where Enter
   * keeps the text (CMB-26).
   */
  replacement?: (options: readonly OptionData[]) => OptionData | null;
  /**
   * The list is as wide as its options need (its styles were given `maxWidth`): a long list then takes that width from
   * the rows it draws as it opens and keeps it while it scrolls, so that it does not change width under the pointer
   * as other rows are drawn (SEL-25).
   */
  widens?: boolean;
}

export interface OptionListView {
  /** The id, in the field's shadow root, of the element that names the list box (the field's label). */
  labelledBy: string;
  /** What an option's label is drawn as; its `label` when left out (a combobox marks what matched). */
  text?: (option: OptionData) => unknown;
  /** Drawn in place, not in the top layer. */
  inline: boolean;
  /**
   * What stands after the last option and is not one (a combobox's status row): in the sheet, under the box that
   * scrolls, so that the list box holds options and groups only and the row stays in view while they scroll.
   */
  after?: unknown;
  /** `after` draws something now: the sheet's end padding is below it (`.list.tail`); with no option drawn it is the sheet's only row (`.list.bare`). */
  tail?: boolean;
  /** The options are on their way: the list box is marked busy. */
  busy?: boolean;
}

/**
 * The list's active option and what acts on it. The field keeps focus; one option at a time is the active one, which
 * the keys act on and `aria-activedescendant` names. The component calls `start()` when its list opens and `stop()`
 * when it closes, `key()` for a key pressed on the field while the list is open, `activate()` for Enter or Space, and
 * renders the list with `render()`.
 */
export class OptionListController implements ReactiveController {
  /** The active option, or null while the list is closed or holds no option. */
  active: OptionData | null = null;
  /** Whether the active option was made active by the keyboard: it is then drawn focused, with the focus indicator. */
  keyboard = false;
  private running = false;
  /**
   * Whether the rows are drawn: from the render that opens the list until the list has closed and its sheet has left
   * the top layer (a closing sheet fades with its rows in it). A closed field draws none.
   */
  private drawn = false;
  // ── A long list's rows (see the head of this file) ──
  /** The rows are windowed in what is drawn now. */
  private windowed = false;
  /** What the last render drew of a long list. */
  private windowKey = '';
  /** The options, and the titled groups, the last render of a long list drew, in order: its `.row` and `.group-title` elements. */
  private drawnRows: OptionData[] = [];
  private drawnTitles: Element[] = [];
  /** A drawn row's height — the least seen since the list opened: what a row that was never drawn is taken to be. */
  private rowHeight = 0;
  /** A drawn title's height, and the room between two groups, likewise. */
  private titleHeight = 0;
  private separatorHeight = 0;
  /** The height of each row and title that was drawn and is not of that height, by its `<tanrei-option>` or group. */
  private readonly heights = new WeakMap<Element, number>();
  private settling = 0;
  /** A long list that widens holds the width its options needed as it opened (`--_list-content`). */
  private widthHeld = false;
  private activeElement: Element | null = null;
  private activeValue: string | null = null;
  private readonly keys = new RovingKeys({ wrap: false, repeat: true });
  private pressedRow: HTMLElement | null = null;
  private pressedOption: OptionData | null = null;
  private revealing = false;
  private readonly press: PressController;

  constructor(
    private readonly host: Host & { renderRoot: HTMLElement | DocumentFragment },
    private readonly options: OptionListOptions,
  ) {
    host.addController(this);
    this.press = new PressController(host, {
      container: () => this.pressedRow,
      holdCarrier: () => this.find('.scroll'),
      disabled: () => !!this.pressedOption?.disabled,
    });
  }

  private find<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.host.renderRoot?.querySelector<T>(selector) ?? null;
  }

  private rowOf(option: OptionData | null): HTMLElement | null {
    return option ? this.find(`#${optionId(option)}`) : null;
  }

  /** The id of the active option's row, for `aria-activedescendant`; undefined while there is none. */
  get activeId(): string | undefined {
    return this.running && this.active ? optionId(this.active) : undefined;
  }

  /** The option SEL-31 names for an opening list: the chosen one, or the first that is not disabled where none is chosen. */
  private initial(): OptionData | null {
    const { options } = this.options.model();
    const chosen = this.options.chosen();
    return (chosen && options.find((option) => option.element === chosen.element)) || options.find((option) => !option.disabled) || null;
  }

  /** Whether the list is running: between `start()` and `stop()`. */
  get started(): boolean {
    return this.running;
  }

  /**
   * Makes `option` the active one, or none (`null`: a combobox while Enter keeps the text, CMB-26). `keyboard` says
   * whether it is drawn focused. The whole of it is brought into view.
   */
  setActive(option: OptionData | null, keyboard: boolean) {
    this.makeActive(option, keyboard);
    if (option) this.revealing = true;
    this.host.requestUpdate();
  }

  private makeActive(option: OptionData | null, keyboard: boolean) {
    const changed = option?.element !== this.activeElement || keyboard !== this.keyboard;
    this.active = option;
    this.activeElement = option?.element ?? null;
    this.activeValue = option?.value ?? null;
    this.keyboard = keyboard;
    if (changed) this.host.requestUpdate();
  }

  /** The list opened: the chosen option is the active one, or the first enabled one. `keyboard` says what opened it. */
  start(keyboard: boolean, active?: OptionData | null) {
    this.running = true;
    this.drawn = true;
    // Measured again each time the list opens: the text may have another size by now.
    this.rowHeight = this.titleHeight = this.separatorHeight = 0;
    this.settling = 0;
    this.widthHeld = false;
    this.find('.list')?.style.removeProperty('--_list-content');
    this.makeActive(active === undefined ? this.initial() : active, keyboard);
    this.revealing = true;
    this.host.requestUpdate();
  }

  /** The list closed. A press that is still held ends by itself. */
  stop() {
    if (!this.running) return;
    this.running = false;
    this.makeActive(null, false);
    // A sheet that is fading out keeps its rows until it has gone (`onSurfaceToggle`); one that is not in the top layer
    // — drawn in place, never shown, or taken out of the page — has nothing to fade.
    if (!this.find('.surface')?.matches(':popover-open')) this.drawn = false;
  }

  /** The placed box left the top layer (a popover's `toggle`): the closed list's rows are taken away. */
  private readonly onSurfaceToggle = (event: Event) => {
    if (this.running || !this.drawn || (event.currentTarget as HTMLElement).matches(':popover-open')) return;
    this.drawn = false;
    this.host.requestUpdate();
  };

  /**
   * The options changed, or the chosen one did: the active option stays where an option of the same element or value
   * still exists, and is otherwise the one an opening list has (SEL-36). Called before every render.
   */
  hostUpdate() {
    if (!this.running) return;
    const { options } = this.options.model();
    const kept = options.find((option) => option.element === this.activeElement) ?? (this.activeValue === null ? undefined : options.find((option) => option.value === this.activeValue));
    if (kept) {
      this.active = kept;
      this.activeElement = kept.element;
      this.activeValue = kept.value;
    } else {
      const next = this.options.replacement ? this.options.replacement(options) : this.initial();
      this.active = next;
      this.activeElement = next?.element ?? null;
      this.activeValue = next?.value ?? null;
    }
  }

  hostUpdated() {
    if (!this.running) return;
    const row = this.rowOf(this.active);
    // The focus style's name, for a browser without style queries: read when the option becomes the focused one.
    if (row && this.keyboard) syncFocusStyle(this.host, row);
    syncSeparation(this.host, this.find('.scroll'));
    if (this.options.widens) this.holdWidth();
    if (this.revealing) this.reveal();
    else this.measure();
  }

  /**
   * SEL-25: a long list that widens takes the width its drawn rows need unwrapped as it opens, and keeps it while it
   * scrolls; the field's width and the list's limits still apply to it. A list that draws every row needs no hold.
   */
  private holdWidth() {
    const list = this.find('.list');
    if (!list) return;
    if (!this.windowed) {
      if (this.widthHeld) list.style.removeProperty('--_list-content');
      this.widthHeld = false;
      return;
    }
    if (this.widthHeld || !list.querySelector('.row')) return;
    // Read without the limits, and from the style: the sheet may be scaled while it grows in, the style is not.
    list.style.minInlineSize = '0';
    list.style.maxInlineSize = 'none';
    const width = Number.parseFloat(getComputedStyle(list).inlineSize) || 0;
    list.style.removeProperty('min-inline-size');
    list.style.removeProperty('max-inline-size');
    if (width <= 0) return;
    list.style.setProperty('--_list-content', `${Math.ceil(width)}px`);
    this.widthHeld = true;
  }

  // ── A long list's rows ───────────────────────────────────────────────────────────────────────────────────

  private rowExtent(option: OptionData): number {
    return this.heights.get(option.element) ?? this.rowHeight;
  }

  private titleExtent(group: OptionGroupData): number {
    return group.title ? (this.heights.get(group.element) ?? this.titleHeight) : 0;
  }

  /** Where each option of `model` begins in the box that scrolls, from its first row's edge: measured, or for what was never drawn taken from what was. */
  private tops(model: OptionModel): number[] {
    const tops: number[] = [];
    let at = 0;
    model.entries.forEach((entry, index) => {
      const before = model.entries[index - 1];
      if (before && (entry.kind === 'group' || before.kind === 'group')) at += this.separatorHeight;
      const options = entry.kind === 'option' ? [entry.option] : entry.group.options;
      if (entry.kind === 'group') at += this.titleExtent(entry.group);
      for (const option of options) {
        tops.push(at);
        at += this.rowExtent(option);
      }
    });
    return tops;
  }

  /**
   * The rows a list of `model` draws now, or null for a list short enough to draw them all: the rows in the box that
   * scrolls and as much again before and after it, and the active option with a page of rows on each side — so the row
   * a key moves to is there before the box has scrolled to it. Before anything was measured, the list's first rows.
   */
  private windowOf(model: OptionModel): OptionWindow | null {
    const { options } = model;
    const count = options.length;
    if (count <= OPTION_WINDOW_FROM) return null;
    const scroll = this.find('.scroll');
    const view = scroll?.clientHeight ?? 0;
    let from = 0;
    let to = Math.min(count, UNMEASURED_ROWS);
    if (scroll && view > 0 && this.rowHeight > 0) {
      const tops = this.tops(model);
      const start = scroll.scrollTop - view;
      const end = scroll.scrollTop + 2 * view;
      from = count;
      to = 0;
      for (let index = 0; index < count; index++) {
        if (tops[index] >= end) break;
        if (tops[index] + this.rowExtent(options[index]) <= start) continue;
        from = Math.min(from, index);
        to = index + 1;
      }
      // Scrolled past what the list now holds (the options changed): its last rows, until the box has followed.
      if (from >= to) {
        from = Math.max(0, count - UNMEASURED_ROWS);
        to = count;
      }
    }
    const active = this.activeElement ? options.findIndex((option) => option.element === this.activeElement) : -1;
    const near = active < 0 ? 0 : Math.max(0, active - OPTION_PAGE);
    const far = active < 0 ? 0 : Math.min(count, active + OPTION_PAGE + 1);
    return { key: `${from}:${to}:${near}:${far}`, has: (index) => (index >= from && index < to) || (index >= near && index < far) };
  }

  /** The box scrolled, or was scrolled: a long list draws the rows that are near it now. */
  private rewindow() {
    if (!this.windowed || !this.running) return;
    const next = this.windowOf(this.options.model());
    if (next && next.key !== this.windowKey) this.host.requestUpdate();
  }

  private readonly onScroll = () => this.rewindow();

  /**
   * A long list's drawn rows, titles and separation are measured, so that what is not drawn takes the room it would.
   * A height that is not the one assumed draws the list again (the rooms change), a few times at most. Returns whether
   * it does.
   */
  private measure(): boolean {
    if (!this.windowed) return false;
    const scroll = this.find('.scroll');
    if (!scroll || scroll.clientHeight === 0) return false;
    let changed = false;
    const take = (elements: HTMLElement[], keys: Element[], assumed: number): number => {
      if (elements.length === 0 || elements.length !== keys.length) return assumed;
      // Whole pixels tell which elements differ; the fractions are read only for those, and once for the common height.
      const sizes = elements.map((element) => element.offsetHeight);
      const least = Math.min(...sizes);
      let common = assumed;
      if (common === 0 || least < Math.round(common)) {
        common = blockSize(elements[sizes.indexOf(least)]);
        changed = true;
      }
      elements.forEach((element, index) => {
        const own = Math.abs(sizes[index] - common) < 1 ? undefined : blockSize(element);
        if (own === this.heights.get(keys[index])) return;
        if (own === undefined) this.heights.delete(keys[index]);
        else this.heights.set(keys[index], own);
        changed = true;
      });
      return common;
    };
    this.rowHeight = take(
      [...scroll.querySelectorAll<HTMLElement>('.row')],
      this.drawnRows.map((option) => option.element),
      this.rowHeight,
    );
    this.titleHeight = take([...scroll.querySelectorAll<HTMLElement>('.group-title')], this.drawnTitles, this.titleHeight);
    // What separates two groups: the line with the space above and below it, or the gap — whichever is drawn.
    const divider = scroll.querySelector<HTMLElement>('.divider');
    if (divider) {
      const outer = (element: Element | null) => {
        if (!element) return 0;
        const style = getComputedStyle(element);
        return style.display === 'none' ? 0 : (Number.parseFloat(style.blockSize) || 0) + (Number.parseFloat(style.marginBlockStart) || 0) + (Number.parseFloat(style.marginBlockEnd) || 0);
      };
      const separator = outer(divider) + outer(divider.nextElementSibling);
      if (separator !== this.separatorHeight) {
        this.separatorHeight = separator;
        changed = true;
      }
    }
    if (!changed) {
      this.settling = 0;
      return false;
    }
    if (this.settling >= SETTLE_PASSES) return false;
    this.settling += 1;
    this.host.requestUpdate();
    return true;
  }

  /** Whether characters typed now continue a search: a Space then belongs to it, and does not choose. */
  searching(): boolean {
    return this.keys.searching();
  }

  /**
   * A key pressed on the field while its list is open: the arrow keys (stopping at the ends), Home, End, the page keys
   * (by `OPTION_PAGE`) and printable characters (the next option whose label begins with what was typed within a
   * second, wrapping). A disabled option is reached like any other. Returns whether the key was the list's.
   */
  key(key: string): boolean {
    const { options } = this.options.model();
    if (options.length === 0) return false;
    const current = this.active ? options.findIndex((option) => option.element === this.active?.element) : -1;
    let target: number | null;
    if (key === 'PageDown') target = Math.min((current < 0 ? -1 : current) + OPTION_PAGE, options.length - 1);
    else if (key === 'PageUp') target = Math.max((current < 0 ? options.length : current) - OPTION_PAGE, 0);
    else
      target = this.keys.target(
        key,
        current,
        options.map((option) => ({ focusable: true, label: option.label })),
      );
    if (target === null) return false;
    this.makeActive(options[target], true);
    this.revealing = true;
    this.host.requestUpdate();
    return true;
  }

  /**
   * Enter or Space on the active option: it shows the pressed state from its centre, held for press-hold, and is
   * chosen — unless it is disabled, which does nothing. Returns whether there was an active option.
   */
  activate(event: Event): boolean {
    const option = this.active;
    if (!option) return false;
    if (option.disabled) return true;
    this.pressOn(option, null);
    this.press.release();
    this.options.choose(option, event);
    return true;
  }

  /** The whole of the active option in view, in the list's own scroll box and nowhere else (the page does not move). */
  reveal() {
    // A long list whose rooms are about to change is revealed again by the render that changes them.
    this.revealing = this.measure();
    const scroll = this.find('.scroll');
    const row = this.rowOf(this.active);
    if (!scroll || !row) return;
    // Layout offsets, not drawn boxes: the list may be growing in.
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < scroll.scrollTop) scroll.scrollTop = top;
    else if (bottom > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = bottom - scroll.clientHeight;
    // …and a long list draws the rows around it now, not when the box says it has scrolled.
    this.rewindow();
  }

  private optionAt(event: Event): { option: OptionData; row: HTMLElement } | null {
    const row = (event.composedPath().find((node) => node instanceof HTMLElement && node.classList.contains('row')) as HTMLElement | undefined) ?? null;
    if (!row) return null;
    const index = Number(row.dataset.index);
    const option = this.options.model().options.find((each) => each.index === index);
    return option ? { option, row } : null;
  }

  private pressOn(option: OptionData, at: { x: number; y: number } | null) {
    const row = this.rowOf(option);
    if (this.pressedRow && this.pressedRow !== row) delete this.pressedRow.dataset.pressed;
    this.pressedRow = row;
    this.pressedOption = option;
    this.press.press(at);
  }

  /** A press on the list never takes focus from the field; on an option it shows the pressed state without delay. */
  readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const hit = this.optionAt(event);
    if (!hit) return;
    this.makeActive(hit.option, false);
    this.pressOn(hit.option, { x: event.clientX, y: event.clientY });
  };

  /** Focus stays on the field: the press that would move it is cancelled (the pointer events still come). */
  readonly onMouseDown = (event: MouseEvent) => event.preventDefault();

  readonly onPointerUp = (event: PointerEvent) => this.press.release(event);

  /** A pointer that moves onto an option makes it the active one, without the focus indicator. */
  readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const hit = this.optionAt(event);
    if (hit && (hit.option.element !== this.activeElement || this.keyboard)) this.makeActive(hit.option, false);
  };

  /** A press that ended on an option chooses it; on a disabled one, on a title or on the sheet, nothing. */
  readonly onClick = (event: MouseEvent) => {
    const hit = this.optionAt(event);
    if (!hit || hit.option.disabled) return;
    this.options.choose(hit.option, event);
  };

  /**
   * The list (SEL-24, SEL-25, SEL-37 … SEL-45, SEL-48): the placed box, the sheet, and in the box that scrolls a list
   * box named by the field's label whose options are named by their label and described by their supporting text, each
   * with its selected state, its disabled state, its position and the number of options; groups named by their title.
   * The glyphs, the check and what separates the groups are kept from assistive technology.
   */
  render({ labelledBy, text: drawn, inline, after, tail, busy }: OptionListView): TemplateResult {
    const model = this.options.model();
    const chosen = this.options.chosen();
    const size = model.options.length;
    // SEL-66: which rows keep the leading icon column — by section, as the field's iconSpace says.
    const space = this.options.iconSpace?.();
    const column = space ? iconColumns(model, space) : () => model.hasIcons;
    // A long list draws the rows near the box that scrolls; what it skips is room of the rows' heights.
    const windowed = this.drawn ? this.windowOf(model) : null;
    this.windowed = !!windowed;
    this.windowKey = windowed?.key ?? '';
    this.drawnRows = [];
    this.drawnTitles = [];
    let position = 0;
    let skipped = 0;
    /** The room of what was skipped since the last element drawn, as one element; nothing where nothing was. */
    const room = () => {
      const block = skipped;
      skipped = 0;
      return block > 0 ? html`<div class="skipped" aria-hidden="true" style=${styleMap({ blockSize: `${block}px` })}></div>` : nothing;
    };
    /**
     * Words in the direction their option or group says (`dir`): a run of their own inside the text's box, which stays
     * placed and aligned by the layout (the row is never turned: its check stays at the layout's end). Words that say
     * none are the box's own text, by their first strong character.
     */
    const words = (dir: string, content: unknown) => (dir ? html`<span class="said" dir=${dir}>${content}</span>` : content);
    const row = (option: OptionData) => {
      const id = optionId(option);
      const selected = !!chosen && chosen.element === option.element;
      const active = this.running && this.active?.element === option.element;
      position += 1;
      return html`<div
        part="option"
        class=${classMap({ row: true, p: true, d: option.disabled, selected, active, kf: active && this.keyboard })}
        role="option"
        id=${id}
        data-index=${option.index}
        data-tanrei-shape
        lang=${option.lang || nothing}
        aria-selected=${selected ? 'true' : 'false'}
        aria-disabled=${option.disabled ? 'true' : nothing}
        aria-labelledby=${`${id}-label`}
        aria-describedby=${option.supportingText ? `${id}-supporting` : nothing}
        aria-posinset=${position}
        aria-setsize=${size}
      >
        <span class="row-content">
          ${column(option)
            ? html`<span class="row-column leading" aria-hidden="true"><span part="option-leading-icon" class="option-icon"><span class="ink">${option.leadingIcon}</span></span></span>`
            : nothing}
          <span class="row-text"
            ><span part="option-label" class="option-label" id=${`${id}-label`}>${words(option.dir, drawn ? drawn(option) : option.label)}</span>${option.supportingText
              ? html`<span part="option-supporting-text" class="option-supporting" id=${`${id}-supporting`}>${words(option.dir, option.supportingText)}</span>`
              : nothing}</span
          >
          <span class="row-column mark" aria-hidden="true"><span part="mark" class="check"><span class="ink">check</span></span></span>
        </span>
      </div>`;
    };
    /** An option's row — or, in a long list, its room where it is not drawn (it still has its position). */
    const each = (option: OptionData) => {
      if (!windowed) return row(option);
      if (!windowed.has(position)) {
        position += 1;
        skipped += this.rowExtent(option);
        return nothing;
      }
      this.drawnRows.push(option);
      return html`${room()}${row(option)}`;
    };
    // Closed, the list box is empty: the rows are drawn by the render that opens the list.
    const shown = this.drawn ? model.entries : [];
    const entries = shown.map((entry, index) => {
      const before = shown[index - 1];
      // A group is told from an adjacent group, and from an adjacent option outside any group; never before the first
      // element or after the last.
      const parted = !!before && (entry.kind === 'group' || before.kind === 'group');
      const separator = parted ? html`<div part="divider" class="divider" aria-hidden="true"></div><div class="gap" aria-hidden="true"></div>` : nothing;
      if (entry.kind === 'option') {
        if (!windowed) return html`${separator}${row(entry.option)}`;
        if (windowed.has(position)) return html`${room()}${separator}${each(entry.option)}`;
        if (parted) skipped += this.separatorHeight;
        return each(entry.option);
      }
      const { group } = entry;
      const titled = !!group.title;
      // A long list's group that draws none of its options is room: its title and what separates it with them.
      if (windowed && !group.options.some((_, at) => windowed.has(position + at))) {
        skipped += (parted ? this.separatorHeight : 0) + this.titleExtent(group);
        for (const option of group.options) each(option);
        return nothing;
      }
      const lead = room();
      if (windowed && titled) this.drawnTitles.push(group.element);
      const rows = group.options.map(each);
      return html`${lead}${separator}
        <div part="group" class="group" role="group" lang=${group.lang || nothing} aria-labelledby=${titled ? `group-${group.index}` : nothing}>
          ${titled ? html`<div part="group-title" class="group-title" id=${`group-${group.index}`} role="presentation">${words(group.dir, group.title)}</div>` : nothing}${rows}${room()}
        </div>`;
    });
    const rest = room();
    // The press that would take focus from the field is cancelled on the whole placed box, not on the sheet alone: while
    // the sheet grows in, the box already has its full size and the sheet inside it does not, and a press on the part
    // the sheet has not reached yet lands on the box (SEL-26).
    // The placed box is only a box: without `role="none"` a popover element with no role is exposed as an unnamed group
    // around the list box.
    return html`<div class="surface" popover=${inline ? nothing : 'manual'} role="none" @mousedown=${this.onMouseDown} @toggle=${this.onSurfaceToggle}>
      <div class="motion">
        <div
          part="list"
          class=${classMap({ list: true, tail: !!tail, bare: !!tail && size === 0 })}
          data-tanrei-shape
          @pointerdown=${this.onPointerDown}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @pointermove=${this.onPointerMove}
          @click=${this.onClick}
        >
          <div class="scroll" role="listbox" id="list" aria-labelledby=${labelledBy} aria-busy=${busy ? 'true' : nothing} @scroll=${this.onScroll}>${entries}${rest}</div>
          ${after ?? nothing}
        </div>
      </div>
    </div>`;
  }
}

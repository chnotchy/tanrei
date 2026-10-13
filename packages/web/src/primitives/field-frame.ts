import { type CSSResult, type TemplateResult, html, nothing, unsafeCSS } from 'lit';
// The requirement tag is the Tag component, as it is (FLD-5, FGR-5): nothing of it is set here. This module is therefore not re-exported by
// `primitives/index.ts` (the tag's own styles import that file): a component imports it by its path.
import '../components/tag/tag.js';
import { iconGlyph } from '../styles/icons.js';
import { productText } from '../styles/product-text.js';
import { compChoice, whenChosen } from './actions.js';
import { report } from './report.js';
import type { WordsController } from './words.js';

// The field frame: what a form gives every control — a label above it that can say the control is
// required or optional, a line of help, the reason a value was refused — drawn once, here, for every component that
// draws it:
//
//   <tanrei-field>         around one control of the product's (FLD-2 … FLD-13), from `--tanrei-comp-field-*`
//   <tanrei-field-group>   around a set, as a legend, a description and one error (FGR-2 … FGR-9), from
//                          `--tanrei-comp-field-group-*`; a radio group draws the same rows from the same tokens
//   a component that is a field itself (a select, a combobox, a number field, a color field) draws these rows as part
//   of itself, from its OWN tokens of the same names: it passes its own prefix.
//
// Nothing here knows which component it is drawn for. A component gives:
//   - its token prefix (`--tanrei-comp-select`); every length, text style and choice is read from it by the frame's
//     names (`label.gap`, `requirement.gap`, `supporting-text.typescale` …);
//   - the current color of each part as a private custom property (`--_frame-label` …), which `frameColors()` writes
//     from the tokens of the look and state the component is in;
//   - the rows, where it wants them: `frameLabelRow()`, `frameText()`, `frameAnnouncer()`.
// What reaches assistive technology is the component's to wire, because it depends on where its semantics are: ids in
// one shadow root (`aria-labelledby` / `aria-describedby` to the rows' ids) for a component whose control is in its own
// root; strings through `primitives/field.ts` for a control in another tree.

/** What the form asks of a control (FLD-4). The first value is what an unknown one behaves as (FLD-22). */
export const REQUIREMENTS = ['none', 'required', 'optional'] as const;
export type FrameRequirement = (typeof REQUIREMENTS)[number];
/** How a required control is marked (FLD-6). The first value is what an unknown one behaves as (FLD-22). */
export const REQUIRED_MARKS = ['auto', 'tag', 'asterisk', 'none'] as const;
export type FrameRequiredMark = (typeof REQUIRED_MARKS)[number];
/**
 * `comp.<name>.requirement.mark`, the design system's answer — the component's token, which follows
 * `sys.behavior.requirement-mark` unless a layer sets it apart: the first value is what an unknown name
 * falls back to.
 */
export const SYSTEM_MARKS = ['tag', 'asterisk', 'none'] as const;

/** The frame's props, as every component that draws it has them (the same ten names, types and defaults). */
export interface FrameProps {
  label: string;
  labelHidden: boolean;
  supportingText: string;
  errorText: string;
  error: boolean;
  requirement: string;
  requiredMark: string;
  requiredText: string;
  optionalText: string;
}

/**
 * FLD-24 and its copies: the frame's props with its two words read — the instance's prop, else the product's words
 * (`setWords()`), else nothing. Tanrei has no words of its own: every function of the frame takes what this returns.
 */
export function frameWithWords(props: FrameProps, words: WordsController): FrameProps {
  return {
    label: props.label,
    labelHidden: props.labelHidden,
    supportingText: props.supportingText,
    errorText: props.errorText,
    error: props.error,
    requirement: props.requirement,
    requiredMark: props.requiredMark,
    requiredText: words.get('requiredText', props.requiredText),
    optionalText: words.get('optionalText', props.optionalText),
  };
}

/** FLD-4, FLD-22: the requirement, an unknown value behaving as none. */
export const frameRequirement = (props: Pick<FrameProps, 'requirement'>): FrameRequirement =>
  (REQUIREMENTS as readonly string[]).includes(props.requirement) ? (props.requirement as FrameRequirement) : 'none';

/** FLD-2: the label row is drawn. */
export const frameLabelled = (props: Pick<FrameProps, 'label' | 'labelHidden'>): boolean => !!props.label && !props.labelHidden;

/**
 * FLD-6, FLD-22: the required mark this frame draws — `auto` leaves it to the styles, which read the design system's
 * choice; `none` while the control is not required or the label is not drawn. An unknown value behaves as auto.
 */
export function frameMark(props: Pick<FrameProps, 'label' | 'labelHidden' | 'requirement' | 'requiredMark'>): FrameRequiredMark {
  if (frameRequirement(props) !== 'required' || !frameLabelled(props)) return 'none';
  return (REQUIRED_MARKS as readonly string[]).includes(props.requiredMark) ? (props.requiredMark as FrameRequiredMark) : 'auto';
}

/** FLD-31: the error text the supporting row shows (where FLD-7 puts it) — `errorText` while the frame is in error; nothing otherwise. */
export const frameErrorText = (props: Pick<FrameProps, 'errorText' | 'error'>): string => (props.error ? props.errorText : '');

/** FLD-4, FLD-11: the optional text that joins the description (assistive technology has no state for it). */
export const frameOptionalText = (props: Pick<FrameProps, 'requirement' | 'optionalText'>): string => (frameRequirement(props) === 'optional' ? props.optionalText : '');

/**
 * The debug reports every frame makes about its own props (FLD-22, FLD-24 and their copies): an unknown requirement or
 * required mark, and a requirement word that neither the instance nor the product's words gave (recorded for
 * `missingWords()` in every build). `props` are the frame's with its words read (`frameWithWords()`); `ids` are the
 * component's own behaviour ids for the two sentences and `prefix` its token prefix. The required word is needed only
 * where the tag would be drawn — the mark is tag, by the frame's own prop or by the design system's answer, and the
 * label row is drawn (`row`: false for a label that floats) — or, for a frame that says the requirement in words
 * whichever mark is drawn (`always`: a field group, which has no required state — FGR-24), wherever it is required.
 */
export function reportFrame(
  host: Element,
  props: FrameProps,
  changed: { has: (name: never) => boolean },
  ids: { unknown: string; words: string },
  words: WordsController,
  { prefix, always = false, row = true, tag = 'tag' }: { prefix: string; always?: boolean; row?: boolean; tag?: string },
) {
  const has = (name: keyof FrameProps) => changed.has(name as never);
  if (has('requirement') && !(REQUIREMENTS as readonly string[]).includes(props.requirement)) {
    report(host, ids.unknown, `requirement "${props.requirement}" is not none, required or optional; it behaves as "none"`);
  }
  if (has('requiredMark') && !(REQUIRED_MARKS as readonly string[]).includes(props.requiredMark)) {
    report(host, ids.unknown, `requiredMark "${props.requiredMark}" is not auto, tag, asterisk or none; it behaves as "auto"`);
  }
  const mark = frameMark(props);
  const asked = frameRequirement(props);
  // The design system's answer is read from the cascade only where a word is missing.
  const tagged = () => row && (mark === 'tag' || (mark === 'auto' && compChoice(host, `${prefix}-requirement-mark`, SYSTEM_MARKS) === 'tag'));
  if (!props.requiredText && ((always && asked === 'required') || tagged())) {
    words.missing('requiredText', {
      id: ids.words,
      effect: always
        ? `no required ${tag} is drawn, and nothing says the requirement to assistive technology, because a group has no required state`
        : `the asterisk is drawn where the required ${tag} would be, and the required state is kept`,
    });
  }
  if (asked === 'optional' && !props.optionalText) words.missing('optionalText', { id: ids.words, effect: `no optional ${tag} is drawn and nothing is added to the description` });
}

export interface FrameLabelRow extends Pick<FrameProps, 'label' | 'labelHidden' | 'requirement' | 'requiredMark' | 'requiredText' | 'optionalText'> {
  /** The label glyph's box and slot, for a frame that has one (`frameLabelIcon()`); nothing for one that has none (a group). */
  glyph?: TemplateResult | typeof nothing;
  /** The glyph's slot holds something: the row keeps the glyph's room (`data-label-icon`). */
  hasGlyph?: boolean;
  /**
   * The label's text is kept from assistive technology: the control is named some other way (a string, `aria-label`)
   * and the drawn text would be read a second time. False where the row itself is the name (a legend, or the target of
   * an `aria-labelledby` in the same root).
   */
  labelHidden_?: boolean;
  /** The id of the label's text, for a control in the same shadow root to be named by (`aria-labelledby`). */
  labelId?: string;
  /**
   * The frame is disabled: the row says so (`aria-disabled`), as the label of a disabled native control is known to be
   * one — what it holds is disabled content. Left out where an ancestor in the same root already says it (a fieldset).
   */
  disabled?: boolean;
  /**
   * The frame is disabled, for its requirement tag, which is then drawn as a tag inside something disabled (FLD-5,
   * FGR-5, TAG-21). `disabled` where it is left out; a frame that leaves `disabled` out because an ancestor says it (a
   * fieldset) gives this one.
   */
  tagDisabled?: boolean;
  /** A press on the row (FLD-12): the component moves focus to its control. */
  onPress?: (event: MouseEvent) => void;
}

/**
 * The label row (FLD-2, FLD-3, FLD-5, FLD-6): the glyph, the label with the asterisk as its last character, and the
 * requirement tag — a `<tanrei-tag size="small">`, filled for required and tonal for optional, `disabled` while the frame
 * is, with nothing else of the frame's set on it: it reads the Tag's tokens as every tag does. It stands in a box one label line high
 * (`.requirement-box`), which is what the row's layout sees of it. `nothing` while the label is not drawn. Under `requiredMark: auto` both marks
 * are in the row and the styles draw the one the design system names. The asterisk and the tag are kept from assistive
 * technology: the required state, or the description, says what they say.
 */
export function frameLabelRow(row: FrameLabelRow): TemplateResult | typeof nothing {
  if (!frameLabelled(row)) return nothing;
  const asked = frameRequirement(row);
  const mark = frameMark(row);
  // FLD-24: without the word, the asterisk stands in the tag's place — as the frame's own mark (tag), or as the
  // design system's (auto: the styles draw it unless the system marks none).
  const wordless = (mark === 'tag' || mark === 'auto') && !row.requiredText;
  const asterisk = mark === 'asterisk' || mark === 'auto' || wordless ? html`<span part="requirement-label" class="asterisk" aria-hidden="true">*</span>` : nothing;
  // FLD-5, FGR-5, TAG-21: a disabled frame's tag is drawn as a tag inside something disabled — the Tag's own disabled
  // tokens; nothing else of the tag is set.
  const faded = row.tagDisabled ?? !!row.disabled;
  const tag =
    (mark === 'tag' || mark === 'auto') && row.requiredText
      ? html`<span class="requirement-box required-box"><tanrei-tag part="requirement-label" class="requirement-tag required-tag" size="small" variant="filled" ?disabled=${faded} label=${row.requiredText} aria-hidden="true"></tanrei-tag></span>`
      : asked === 'optional' && row.optionalText
        ? html`<span class="requirement-box optional-box"><tanrei-tag part="requirement-label" class="requirement-tag optional-tag" size="small" variant="tonal" ?disabled=${faded} label=${row.optionalText} aria-hidden="true"></tanrei-tag></span>`
        : nothing;
  return html`<span class="label-row" ?data-tag=${tag !== nothing} ?data-label-icon=${!!row.hasGlyph} data-mark=${mark} ?data-wordless=${wordless} aria-disabled=${row.disabled ? 'true' : nothing} @mousedown=${row.onPress ?? nothing}>
    ${row.glyph ?? nothing}<span part="label" class="label" id=${row.labelId ?? nothing} aria-hidden=${row.labelHidden_ ? 'true' : nothing}>${row.label}${asterisk}</span>${tag}
  </span>`;
}

/** The label glyph's box around the `label-icon` slot (FLD-3): decorative, drawn by the icon helper. */
export const frameLabelIcon = (onSlotChange: (event: Event) => void): TemplateResult =>
  html`<span part="label-icon" class="label-icon" aria-hidden="true"><slot name="label-icon" @slotchange=${onSlotChange}></slot></span>`;

/** A row of the frame's small text (FLD-7; a group's description and its error): `nothing` while it has no text. */
export function frameText(
  text: string,
  { id, part = 'supporting-text', className = 'supporting-text', disabled = false }: { id: string; part?: string; className?: string; disabled?: boolean },
): TemplateResult | typeof nothing {
  return text ? html`<div part=${part} class=${className} id=${id} aria-disabled=${disabled ? 'true' : nothing}>${text}</div>` : nothing;
}

/** What is announced politely and drawn nowhere (FLD-9). */
export const frameAnnouncer = (): TemplateResult => html`<span class="announcer" role="status" aria-live="polite"></span>`;

/**
 * FLD-9: has assistive technology read `text` once, politely. A new text node in a cleared region is announced even
 * when it repeats the last one. The caller decides when: an error that appeared, or changed its words, while focus is
 * inside the frame.
 */
export function frameAnnounce(root: ParentNode, text: string) {
  const region = root.querySelector('.announcer');
  if (!region || !text) return;
  region.textContent = '';
  requestAnimationFrame(() => (region.textContent = text));
}

/**
 * FLD-6 for a browser without style queries: the design system's required mark, by name, on the label row
 * (`data-required-mark`), which the styles read where the query is missing. Call it after every render.
 */
export function syncFrameMark(host: Element, root: ParentNode, prefix: string) {
  const row = root.querySelector<HTMLElement>('.label-row');
  if (!row) return;
  if (row.dataset.mark === 'auto') row.dataset.requiredMark = compChoice(host, `${prefix}-requirement-mark`, SYSTEM_MARKS);
  else delete row.dataset.requiredMark;
}

/**
 * The parts of the frame that a look and a state color, by the names their tokens have. The requirement tag is not one:
 * it is a Tag and takes the Tag's colors (FLD-5).
 */
export const FRAME_PARTS = ['label', 'label-icon', 'supporting-text', 'required-asterisk'] as const;

/** Where each look and state of the frame is read: selectors of equal specificity, later ones winning. */
export interface FrameColorSelectors {
  rest: string;
  error: string;
  /** Left out by a frame that has no focused state (a group). */
  focused?: string;
  focusedError?: string;
  disabled: string;
  disabledError: string;
}

/**
 * The current color of every part, as `--_frame-<part>`, from the tokens of the look (plain, or `error.`) and the state
 * (resting, focused, disabled) the component is in: `<prefix>-<variant>-[<state>-][error-]<part>-color`. The component
 * never computes how a state looks (FLD-8, FLD-13, FLD-14). `plain` names the parts that have no `error.` form of
 * their own — the error text, which is drawn only in error (`<prefix>-<variant>-[<state>-]error-text-color`): they
 * take the same token in both looks. `fallback` names the variant whose token is read where the
 * active design system has none for `variant` — a value a layer added that another system lacks.
 */
export function frameColors(prefix: string, variant: string, on: FrameColorSelectors, parts: readonly string[] = FRAME_PARTS, fallback: string | null = null, plain: readonly string[] = []): CSSResult {
  const token = (look: string, state: string, error: boolean, part: string) => `${prefix}-${look}-${state ? `${state}-` : ''}${error && !plain.includes(part) ? 'error-' : ''}${part}-color`;
  const value = (state: string, error: boolean, part: string) => (fallback ? `var(${token(variant, state, error, part)}, var(${token(fallback, state, error, part)}))` : `var(${token(variant, state, error, part)})`);
  const block = (selector: string | undefined, state: string, error: boolean) =>
    selector ? `${selector} {\n${parts.map((part) => `    --_frame-${part}: ${value(state, error, part)};`).join('\n')}\n  }` : '';
  return unsafeCSS(
    [block(on.rest, '', false), block(on.error, '', true), block(on.focused, 'focused', false), block(on.focusedError, 'focused', true), block(on.disabled, 'disabled', false), block(on.disabledError, 'disabled', true)]
      .filter(Boolean)
      .join('\n  '),
  );
}

export interface FrameStyleOptions {
  /** The component's token prefix: `--tanrei-comp-field`. */
  prefix: `--tanrei-comp-${string}`;
  /** The label's text style, for a component whose label follows its size (the defaults read `<prefix>-label-typescale-*`). */
  label?: { font: string; letterSpacing: string; line: string };
  /** The state motion's tokens; a frame that has none (a group) changes at once. */
  motion?: { duration: string; easing: string } | null;
  /** The frame has a label glyph (FLD-3). */
  glyph?: boolean;
  /** Where the frame is disabled, for the forced-colors rule (`:host([disabled])`). */
  disabled: string;
}

/**
 * The frame's styles: the label row with its glyph, its asterisk and its requirement tag, the supporting text, and the
 * announcer. Every length, text style and choice is a token of `prefix`; every color is the `--_frame-*` property
 * `frameColors()` wrote. The private names start with `--_frame-` because a control in the default slot inherits them.
 */
export function frameStyles({ prefix, label, motion, glyph = false, disabled }: FrameStyleOptions): CSSResult {
  const T = (name: string) => `var(${prefix}-${name})`;
  const font = label?.font ?? T('label-typescale-font');
  const tracking = label?.letterSpacing ?? T('label-typescale-letter-spacing');
  const line = label?.line ?? `calc(${T('label-typescale-line-height')} * ${T('label-typescale-font-size')})`;
  const timing = motion === undefined ? { duration: T('motion-state-duration'), easing: T('motion-state-easing') } : motion;
  const recolor = (...properties: string[]) => (timing ? `transition: ${properties.map((p) => `${p} ${timing.duration} ${timing.easing}`).join(', ')};` : '');
  const MARK = `${prefix}-requirement-mark`;
  return unsafeCSS(`
  /* FLD-2: the label above the control, from the start edge, in the label's text style and color, label.gap above what
     follows; it wraps rather than being cut and never moves. */
  .label-row {
    --_frame-label-line: ${line};
    display: flex;
    align-items: flex-start;
    min-inline-size: 0;
    margin-block-end: ${T('label-gap')};
    cursor: default;
  }
  .label {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow-wrap: break-word;
    font: ${font};
    letter-spacing: ${tracking};
    color: var(--_frame-label);
    ${recolor('color')}
  }
  /* FLD-5: the requirement tag after the label's text, requirement.gap from it, centred on the label's line: the Tag
     component at its small size, filled for required and tonal for optional, drawn from the Tag's own tokens — nothing
     of the tag is set here, no token and no size, and its height is never read. What the row lays out is
     a box one label line high around the tag, which centres it: a tag taller than the line reaches equally above and
     below it and never makes the label's row taller. When the label and the tag do not fit on one line the label wraps
     and the box moves, whole, to a line of its own after it. */
  .label-row[data-tag] {
    flex-wrap: wrap;
  }
  /* The gaps are the label's margins — outside its box, whose text is laid out by its own direction (FLD-21): padding
     on that box is misplaced by WebKit for a left-to-right label in a right-to-left form. */
  .label-row[data-tag] .label {
    flex: 0 1 auto;
    margin-inline-end: ${T('requirement-gap')};
  }
  .requirement-box {
    display: flex;
    flex: none;
    align-items: center;
    block-size: var(--_frame-label-line);
  }
  .requirement-tag {
    flex: none;
  }
  /* FLD-6: the asterisk after the label's text, requirement.asterisk-gap from it, in the label's own text style — it is
     part of the label. */
  .asterisk {
    margin-inline-start: ${T('requirement-asterisk-gap')};
    color: var(--_frame-required-asterisk);
    ${recolor('color')}
  }
  /* FLD-6: a frame that does not say (requiredMark auto, data-mark="auto") draws the mark requirement.mark names — the
     tag, the first value; the asterisk; or none. A style query where the browser has them, and the name the script
     read (data-required-mark) where it has not. */
  .label-row[data-mark='auto'] .asterisk {
    display: none;
  }
  /* FLD-24: a frame that has no word for the tag draws the asterisk in its place — unless the system marks none, whose
     rule follows and is as specific. */
  .label-row[data-mark='auto']:where([data-wordless]) .asterisk {
    display: inline;
  }
  ${whenChosen(MARK, ".label-row[data-mark='auto']", 'required-mark', 'asterisk', (row) => `
  ${row} :is(.required-box, .required-tag) {
    display: none;
  }
  ${row} .asterisk {
    display: inline;
  }`)}
  ${whenChosen(MARK, ".label-row[data-mark='auto']", 'required-mark', 'none', (row) => `
  ${row} :is(.required-box, .required-tag, .asterisk) {
    display: none;
  }`)}
  ${
    glyph
      ? `
  /* FLD-3: a glyph of the icon set before the label, label-icon.gap away, at label-icon.size, centred on the label's
     first line, in the label-icon color; FLD-20: mirrored by the icon helper, in its own box. */
  ${iconGlyph('.label-icon', { size: `${prefix}-label-icon-size`, selected: '.never-selected', ...(timing ? { duration: `${prefix}-motion-state-duration` as const, easing: `${prefix}-motion-state-easing` as const } : {}) })}
  .label-icon {
    display: none;
    margin-block-start: calc((var(--_frame-label-line) - ${T('label-icon-size')}) / 2);
    color: var(--_frame-label-icon);
    ${recolor('color', 'font-variation-settings')}
  }
  .label-row[data-label-icon] .label-icon {
    display: inline-block;
  }
  /* The gap is the row's: the glyph's box lays its glyph out left to right, whatever the frame's direction. Beside a
     tag the row's gap would stand between the label and the tag too: there the label keeps it. */
  .label-row[data-label-icon] {
    column-gap: ${T('label-icon-gap')};
  }
  .label-row[data-label-icon][data-tag] {
    column-gap: 0;
  }
  .label-row[data-label-icon][data-tag] .label {
    margin-inline-start: ${T('label-icon-gap')};
  }
  .label-icon ::slotted(svg),
  .label-icon ::slotted(img) {
    display: block;
    inline-size: ${T('label-icon-size')};
    block-size: ${T('label-icon-size')};
  }`
      : ''
  }

  /* FLD-7, FLD-31: a row of the frame's small text — the help, the error text — supporting-text.gap below what it
     follows unless the component places it, in the supporting text's style and its own color, wrapping and never cut. */
  .supporting-text {
    margin-block-start: ${T('supporting-text-gap')};
    min-inline-size: 0;
    overflow-wrap: break-word;
    font: ${T('supporting-text-typescale-font')};
    letter-spacing: ${T('supporting-text-typescale-letter-spacing')};
    color: var(--_frame-supporting-text);
    ${recolor('color')}
  }

  /* FLD-21: the label, the help and the error text are each a run of their own, in the direction of their first
     strong character, their lines still aligned by the layout (src/styles/product-text.ts). The tag's text is the Tag's
     own run (TAG-18). */
  ${productText(':is(.label, .supporting-text)', { align: 'start' })}

  /* FLD-9: what is announced politely, drawn nowhere. */
  .announcer {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* FLD-13: where motion is reduced, the colors change at once. */
  @media (prefers-reduced-motion: reduce) {
    .label,
    .label-icon,
    .asterisk,
    .supporting-text {
      transition: none !important;
    }
  }
  /* FLD-17: forced colors — every text in the platform's text color; the tag draws itself as a tag is drawn there
     (an edge and a label in the text color, TAG-14). An error is then told from help by its words and by the invalid
     state alone. */
  @media (forced-colors: active) {
    .label,
    .label-icon,
    .asterisk,
    .supporting-text {
      color: CanvasText;
    }
    ${disabled} :is(.label, .label-icon, .asterisk, .supporting-text) {
      color: GrayText;
    }
  }
`);
}

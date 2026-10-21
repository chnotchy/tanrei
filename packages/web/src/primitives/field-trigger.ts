import { type CSSResult, type ReactiveController, type ReactiveControllerHost, type TemplateResult, html, nothing, unsafeCSS } from 'lit';
import { labelLines } from './label-lines.js';
import { productText } from '../styles/product-text.js';

// The box of an input control that is not a text input (a select's trigger, SEL-1 … SEL-22; a combobox's container,
// CMB-1 … CMB-15; a number input's and a color input's): the container of its variant and size. What such controls
// write alike is here once:
//
//   the tokens    per variant, both looks (plain and error) of every part in every state; per size, the members of the
//                 size axis; which look is painted; and each state's paint (`triggerTokens()`).
//   the label     of a filled or outlined field: resting in the line, floated to the top of a filled container or onto
//                 an outlined one's edge, wrapping rather than cut, with the two copies its lines are counted by
//                 (`floatingLabelStyles()`, `floatingLabel()`, `FloatingLabelController`).
//   the edges     a stacked field's inner line, an outlined field's three-piece outline with the gap for the floated
//                 label, and a filled field's active indicator (`triggerEdgeStyles()`, `triggerEdges()`).
//
// The tokens are the one set every input box is drawn from, `comp.input-box` (SEL-65, CMB-63, NMI-47,
// CLI-45): this module owns its prefix, and no caller gives one. A product that sets a custom property of that family
// on an element, or on anything around it, sets it for the boxes there — custom properties inherit into a shadow
// tree, and no element writes one itself. What a component alone draws (a list, steppers, a swatch) it reads from its
// own family, in its own styles.
//
// Nothing here knows which field it is drawn for: the component gives the parts its states recolor, and its own box,
// line and glyphs. The root is `.field` with `data-layout` (`stacked`, `filled`, `outlined`),
// `data-error`, `data-focused`, `data-disabled`, `data-labelled` and `data-has-value`; the box is `.container`.

/** The custom properties of the one set of tokens every input box is drawn from (`comp.input-box`). */
export const INPUT_BOX = '--tanrei-comp-input-box';
const P = INPUT_BOX;

/** The states a trigger declares: no pressed — a press on it is answered by the list and by the focused edge. */
export const TRIGGER_STATES = { '': '-r', hovered: '-h', focused: '-f', disabled: '-d' } as const;
/** The two looks of each variant: the plain parts, and their `error.` twins while error is true. */
export const TRIGGER_LOOKS = { plain: '', error: 'error-' } as const;
/**
 * The members of the size axis. Text styles are used whole: font and tracking. A stacked box has a height and a block
 * padding of its own, as tall as a Button of the same size (`stackedBoxStyles()`); a box that floats its label reads
 * `height` and `pad-block`.
 */
export const TRIGGER_SIZE_MEMBERS = {
  height: 'container-height',
  'stacked-height': 'stacked-container-height',
  pad: 'container-padding-inline',
  'pad-icon': 'container-padding-inline-with-icon',
  'pad-block': 'container-padding-block',
  'stacked-pad-block': 'stacked-container-padding-block',
  'pad-label': 'container-padding-block-with-label',
  gap: 'container-gap',
  label: 'label-typescale',
  floated: 'label-floated-typescale',
  input: 'input-typescale',
  icon: 'icon-size',
  'state-duration': 'motion-state-duration',
} as const;
const TYPESCALES = new Set(['label-typescale', 'label-floated-typescale', 'input-typescale']);

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

export interface TriggerTokens {
  /** Per variant, both looks' parts in every state, as private custom properties (`--_error-l-f` = the error look's label, focused). */
  variantBlock: (variant: string, selector: string, fallback?: string | null) => string;
  /** The members of the size axis for one size (`--_height`, `--_pad`, `--_input-font` …). */
  sizeBlock: (size: string, selector: string, fallback?: string | null) => string;
  /** Which look the trigger paints: the error look exactly while `error` is true (`data-error` on the root). */
  lookBlock: (look: keyof typeof TRIGGER_LOOKS, selector: string) => string;
  /** The current value of every part, the widths of the edges and the opacity, from one state's tokens. */
  paint: (suffix: string, state: string) => string;
}

/**
 * The token blocks of a trigger whose states recolor `parts` (private key → token part: `{ c: 'container-color', … }`),
 * read from the box's tokens. The token of a state and a look is `<variant>-[<state>-]<look><part>`.
 * `members` are the members of the size axis the field has, for one that has fewer than a trigger's (a number field
 * holds no glyph in its container, so it has neither an icon size nor a padding beside one).
 */
export function triggerTokens(parts: Readonly<Record<string, string>>, members: Readonly<Record<string, string>> = TRIGGER_SIZE_MEMBERS): TriggerTokens {
  const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
    `${selector} {\n${Object.entries(TRIGGER_LOOKS)
      .flatMap(([look, lookPrefix]) =>
        Object.entries(TRIGGER_STATES).flatMap(([state, suffix]) =>
          Object.entries(parts).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${P}-${v}-${state ? `${state}-` : ''}${lookPrefix}${part}`, variant, fallback)};`),
        ),
      )
      .join('\n')}\n}`;
  const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
    `${selector} {\n${Object.entries(members)
      .flatMap(([key, member]) =>
        TYPESCALES.has(member)
          ? ['font', 'letter-spacing', 'line-height', 'font-size'].map((field) => `  --_${key}-${field}: ${ref((v) => `${P}-${member}-${v}-${field}`, size, fallback)};`)
          : [`  --_${key}: ${ref((v) => `${P}-${member}-${v}`, size, fallback)};`],
      )
      .join('\n')}\n}`;
  const lookBlock = (look: keyof typeof TRIGGER_LOOKS, selector: string) =>
    `${selector} {\n${Object.values(TRIGGER_STATES)
      .flatMap((suffix) => Object.keys(parts).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
      .join('\n')}\n}`;
  const paint = (suffix: string, state: string) =>
    `${Object.keys(parts)
      .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
      .join('')}
    --_ow: var(${P}-${state ? `${state}-` : ''}outline-width);
    --_iw: var(${P}-${state ? `${state}-` : ''}active-indicator-width);${state ? `
    opacity: var(${P}-${state}-opacity);` : ''}`;
  return { variantBlock, sizeBlock, lookBlock, paint };
}

/**
 * Where each state of the trigger is read (for `stateRules()`): hover is the container's; focused is the field's own
 * mark (`data-focused`: it has focus, however that was gained, or its list is open), and disabled is the field's. The
 * trigger has no press, so the pressed conditions name a mark it never sets. `:where()` keeps every state rule at the
 * resting rule's specificity, so the order `stateRules()` writes them in is the precedence.
 */
export const triggerOn = (state: string) =>
  state === ':hover'
    ? '.field:where(:has(.container:hover))'
    : state === ':focus-visible'
      ? '.field:where([data-focused])'
      : state === ':disabled'
        ? '.field:where([data-disabled])'
        : `.field:where(${state})`;

/** A filled or outlined label is floated while the field holds something, or is focused or open. */
const FLOAT = ':is([data-has-value], [data-focused])';
const FILLED = ".field[data-layout='filled']";
const OUTLINED = ".field[data-layout='outlined']";
const STACKED = ".field[data-layout='stacked']";
/** The label of a floating-label field (filled or outlined) is floated. */
const FLOATED = `.field:not([data-layout='stacked'])${FLOAT}`;

/**
 * A stacked box is as tall as a Button of the same size, with the block padding that leaves room for its line in that
 * height (SEL-1, CMB-1, NMI-1, CLI-1): everything that reads `--_height` and `--_pad-block` inside a stacked field reads
 * the stacked box's own. A filled or an outlined box keeps the taller height, which holds the label floated in it.
 */
export const stackedBoxStyles = (): CSSResult =>
  unsafeCSS(`
  ${STACKED} {
    --_height: var(--_stacked-height);
    --_pad-block: var(--_stacked-pad-block);
  }`);

/**
 * The label of a filled or outlined field (SEL-15, CMB-8): it rests centred in the container in label.typescale, and
 * floats — onto the outline's top edge, or to the top of a filled container — in label.floated-typescale. A label that
 * does not fit in the width it is given wraps, and is never cut. It moves and resizes over motion.label-*, and
 * recolors over motion.state-*. A control draws the asterisk exactly while the Field that frames it says so (FLD-25):
 * nothing here reads the design system's required mark.
 *
 * Reads the trigger's private properties (`--_text-start`, `--_text-end`, `--_pad`, `--_end`, `--_pad-block`,
 * `--_pad-label`, `--_height`, `--_ow`, `--_l`, `--_ra`, the three lines and the label's two text styles).
 */
export function floatingLabelStyles(): CSSResult {
  const motion = `var(--_state-duration) var(${P}-motion-state-easing)`;
  return unsafeCSS(`
  .floating,
  .measure {
    position: absolute;
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
    overflow-wrap: break-word;
    font: var(--_label-font);
    letter-spacing: var(--_label-letter-spacing);
  }
  .floating {
    z-index: 1;
    inset-block-start: 50%;
    translate: 0 -50%;
    color: var(--_l);
    pointer-events: none;
    transition-property: inset-block-start, inset-inline-start, translate, font-size, line-height, letter-spacing, max-inline-size, color;
    transition-duration:
      var(${P}-motion-label-duration), var(${P}-motion-label-duration), var(${P}-motion-label-duration), var(${P}-motion-label-duration),
      var(${P}-motion-label-duration), var(${P}-motion-label-duration), var(${P}-motion-label-duration), var(--_state-duration);
    transition-timing-function:
      var(${P}-motion-label-easing), var(${P}-motion-label-easing), var(${P}-motion-label-easing), var(${P}-motion-label-easing),
      var(${P}-motion-label-easing), var(${P}-motion-label-easing), var(${P}-motion-label-easing), var(${P}-motion-state-easing);
  }
  ${FLOATED} .floating {
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  /* Outlined: centred on the outline's top edge, starting at padding-inline — over a leading icon, not at the value. */
  ${OUTLINED + FLOAT} .floating {
    inset-block-start: calc(var(--_ow) / 2);
    inset-inline-start: var(--_pad);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    translate: 0 -50%;
  }
  /* Wrapped, its last line is centred on the edge; the lines above it take the room above the container. */
  ${OUTLINED + FLOAT}[data-label-wraps] .floating {
    translate: 0 calc(-50% - (var(--_float-lines) - 1) * var(--_floated-line) / 2);
  }
  /* Filled: at the top of the container, above the value, at the value's start in both positions. */
  ${FILLED + FLOAT} .floating {
    inset-block-start: var(--_pad-label);
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
    translate: 0 0;
  }
  /* The asterisk after the label's text, requirement.asterisk-gap from it, in the label's own text style and at the
     label's place: it floats and rests with it. */
  .floating .asterisk,
  .measure .asterisk,
  .notch-label .asterisk {
    margin-inline-start: var(${P}-requirement-asterisk-gap);
  }
  .floating .asterisk {
    color: var(--_ra);
    transition: color ${motion};
  }
  /* Two copies of the label, never drawn, laid out as the label is resting and floated: the element counts their
     lines (and the widest floated one) to give a label that wraps its room. */
  .measure {
    inset-block-start: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .measure-floated {
    inset-inline-start: var(--_pad);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  ${FILLED} .measure-floated {
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
  }
  /* The room a wrapped label takes, resting and floated alike, so the field never changes height when it floats: an
     outlined field reserves room above its container for the floated lines above the last, and its container holds
     the resting lines, centred; a filled field's band holds every floated line. */
  .field[data-label-wraps] .container {
    margin-block-start: calc((var(--_float-lines) - 1) * var(--_floated-line));
    min-block-size: max(var(--_height), calc(2 * var(--_pad-block) + var(--_rest-lines) * var(--_label-line)));
  }
  ${FILLED}[data-labelled][data-label-wraps] .container {
    margin-block-start: 0;
    min-block-size: max(
      var(--_height),
      calc(2 * var(--_pad-label) + var(--_float-lines) * var(--_floated-line) + var(--_input-line)),
      calc(2 * var(--_pad-label) + var(--_rest-lines) * var(--_label-line))
    );
  }
  ${FILLED}[data-labelled][data-label-wraps] .body {
    padding-block: calc(var(--_pad-label) + var(--_float-lines) * var(--_floated-line)) var(--_pad-label);
  }
`);
}

/**
 * The trigger's edges (SEL-15, SEL-20; CMB-8, CMB-15). A stacked field's edge is a line inside the container's edge,
 * following its corners, that takes no layout space: nothing inside moves as it appears, thickens or goes; at rest its
 * color is transparent (no edge), in error the error line; focused, the focused color and width. An outlined field's
 * is three pieces, so that the floated label opens a gap of outline.notch-padding on each side of it — the gap's width
 * is the floated label's own, measured by a hidden copy of the label in the floated style, and opens over
 * motion.label-*. A filled field's active indicator is a line along the bottom, active-indicator.width wide.
 *
 * Reads `--_ow`, `--_iw`, `--_o`, `--_i`, `--_pad`, `--_end`, `--_float-widest` and the floated text style.
 */
export function triggerEdgeStyles(): CSSResult {
  const motion = `var(--_state-duration) var(${P}-motion-state-easing)`;
  return unsafeCSS(`
  .edge {
    position: absolute;
    z-index: 1;
    inset: 0;
    box-sizing: border-box;
    border: var(--_ow) solid var(--_o);
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
    transition:
      border-color ${motion},
      border-width ${motion};
  }

  .outline {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: flex;
    pointer-events: none;
    corner-shape: inherit;
  }
  .outline > span {
    box-sizing: border-box;
    border: 0 solid var(--_o);
    border-block-width: var(--_ow);
    corner-shape: inherit;
    transition:
      border-color ${motion},
      border-width ${motion};
  }
  .outline-start {
    flex: none;
    inline-size: max(calc(var(--tanrei-corner-radius) * var(--_corner-scale)), calc(var(--_pad) - var(${P}-outline-notch-padding)));
    border-inline-start-width: var(--_ow) !important;
    border-start-start-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    border-end-start-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
  }
  .outline-notch {
    flex: none;
    display: grid;
    grid-template-columns: minmax(0, 0fr);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    transition:
      border-color ${motion},
      border-width ${motion},
      grid-template-columns var(${P}-motion-label-duration) var(${P}-motion-label-easing) !important;
  }
  ${FLOATED} .outline-notch {
    grid-template-columns: minmax(0, 1fr);
    border-block-start-color: transparent;
  }
  .notch-label {
    min-inline-size: 0;
    overflow: hidden;
    visibility: hidden;
    white-space: nowrap;
    padding-inline: var(${P}-outline-notch-padding);
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  /* A wrapped floated label opens the gap by the width of its widest line. */
  .field[data-label-wraps] .notch-label {
    inline-size: var(--_float-widest);
  }
  .outline-end {
    flex: 1 1 auto;
    border-inline-end-width: var(--_ow) !important;
    border-start-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    border-end-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
  }
  .indicator {
    position: absolute;
    z-index: 1;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: var(--_iw);
    background: var(--_i);
    pointer-events: none;
    transition:
      background-color ${motion},
      block-size ${motion};
  }
  ${OUTLINED} .indicator,
  ${FILLED} .outline,
  ${STACKED} :is(.outline, .indicator) {
    display: none;
  }
`);
}

/** The floating label and the copies it is measured by are each a run of their own direction, aligned to the layout's start. */
export const floatingLabelText = (): CSSResult => productText(':is(.floating, .measure)', { align: 'start' });

/**
 * The asterisk a floating label draws for a required field that marks itself (a tag is drawn as the asterisk there);
 * hidden from assistive technology, because the required state already says it. `nothing` under the mark `none`.
 */
export const floatingAsterisk = (mark: string): TemplateResult | typeof nothing => (mark !== 'none' ? html`<span part="requirement-label" class="asterisk" aria-hidden="true">*</span>` : nothing);

/** The trigger's edges, inside the container: a stacked field's inner line, or the outline's three pieces and the active indicator. */
export function triggerEdges({ stacked, floating, label, asterisk }: { stacked: boolean; floating: boolean; label: string; asterisk: unknown }): TemplateResult {
  return stacked
    ? html`<span part="outline" class="edge" aria-hidden="true"></span>`
    : html`<span part="outline" class="outline" aria-hidden="true"
          ><span class="outline-start"></span><span class="outline-notch">${floating ? html`<span class="notch-label">${label}${asterisk}</span>` : nothing}</span
          ><span class="outline-end"></span></span
        ><span part="active-indicator" class="indicator" aria-hidden="true"></span>`;
}

/** The floating label and its two copies, inside the container; kept from assistive technology (the field is named by a text of its own). */
export function floatingLabel({ floating, label, asterisk }: { floating: boolean; label: string; asterisk: unknown }): TemplateResult | typeof nothing {
  return floating
    ? html`<span part="label" class="floating" aria-hidden="true">${label}${asterisk}</span
        ><span class="measure measure-resting" aria-hidden="true">${label}${asterisk}</span
        ><span class="measure measure-floated" aria-hidden="true">${label}${asterisk}</span>`
    : nothing;
}

type Host = ReactiveControllerHost & HTMLElement & { renderRoot: HTMLElement | DocumentFragment };

/**
 * A floating label that does not fit on one line (SEL-15, CMB-8): watches the two copies of the label that are never
 * drawn, one in each position, for a change in their lines. While both take one line nothing is set; once either
 * wraps the field is marked (`data-label-wraps`) and the styles give the lines their room (`--_rest-lines`,
 * `--_float-lines`, `--_float-widest`), so the label is never cut and never over the value. Call `measure()` when a
 * property the label's lines follow changed.
 */
export class FloatingLabelController implements ReactiveController {
  private observer: ResizeObserver | undefined;
  private copies: Element[] = [];

  constructor(private readonly host: Host) {
    host.addController(this);
  }

  hostConnected() {
    if (this.host.renderRoot) this.observe();
  }

  hostDisconnected() {
    this.observer?.disconnect();
    this.copies = [];
  }

  hostUpdated() {
    this.observe();
  }

  private observe() {
    const copies = Array.from(this.host.renderRoot.querySelectorAll('.measure'));
    if (copies.length === this.copies.length && copies.every((copy, i) => copy === this.copies[i])) return;
    if (!copies.length && !this.observer) return;
    this.observer ??= new ResizeObserver(() => this.measure());
    this.observer.disconnect();
    for (const copy of copies) this.observer.observe(copy);
    this.copies = copies;
    if (!copies.length) this.measure();
  }

  /** How many lines the label takes resting and floated, and the width of the widest floated line (src/primitives/label-lines.ts). */
  measure() {
    const root = this.host.renderRoot;
    const field = root.querySelector<HTMLElement>('.field');
    if (!field) return;
    const resting = labelLines(root.querySelector('.measure-resting'));
    const floated = labelLines(root.querySelector('.measure-floated'));
    const wraps = resting.count > 1 || floated.count > 1;
    if (field.hasAttribute('data-label-wraps') !== wraps) field.toggleAttribute('data-label-wraps', wraps);
    if (wraps) {
      field.style.setProperty('--_rest-lines', String(resting.count));
      field.style.setProperty('--_float-lines', String(floated.count));
      field.style.setProperty('--_float-widest', `${floated.widest}px`);
    } else if (field.style.getPropertyValue('--_rest-lines')) {
      for (const name of ['--_rest-lines', '--_float-lines', '--_float-widest']) field.style.removeProperty(name);
    }
  }
}

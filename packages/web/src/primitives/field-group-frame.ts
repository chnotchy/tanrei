import { type CSSResult, type TemplateResult, html, nothing, unsafeCSS } from 'lit';
import { productText } from '../styles/product-text.js';
import { FRAME_PARTS, type FrameProps, frameAnnouncer, frameColors, frameLabelRow, frameLabelled, frameRequirement, frameStyles, frameText } from './field-frame.js';

// The field frame for a SET (FGR-1 … FGR-9, FGR-13, FGR-16 … FGR-18, FGR-21): the label row of a field,
// then the description under it — before the controls, and staying while the set is in error — the controls in a column
// or a row that wraps, and the error in a row of its own below them. `<tanrei-field-group>` draws it around a
// `<fieldset>`, and is the one element that does: a radio group and a checkbox group hold that element itself.
// Like `field-frame.ts`, this module is imported by its path and is not part of
// `primitives/index.ts`.

/** How the controls are laid out (FGR-3, FGR-13). The first value is what an unknown one is drawn as (FGR-22). */
export const GROUP_ORIENTATIONS = ['vertical', 'horizontal'] as const;
export type GroupOrientation = (typeof GROUP_ORIENTATIONS)[number];
export const groupOrientation = (orientation: string): GroupOrientation => ((GROUP_ORIENTATIONS as readonly string[]).includes(orientation) ? (orientation as GroupOrientation) : 'vertical');

/** The ids of the rows a group's description is made of, inside the shadow root that holds them. */
export const GROUP_IDS = { label: 'label', description: 'supporting', error: 'error', requirement: 'requirement' } as const;

/** What the element that carries the group's semantics can say by itself. */
export interface GroupSemantics {
  /** Its role has a required state (a field group in its radio-group kind): the state carries "required", so requiredText is not said in words (FGR-25). */
  requiredState?: boolean;
}

/**
 * FGR-11: the words that carry the requirement, because a group has no required state: requiredText, or optionalText.
 * FGR-25: a group whose role has the state says only optionalText in words.
 */
export function groupRequirementText(props: Pick<FrameProps, 'requirement' | 'requiredText' | 'optionalText'>, { requiredState = false }: GroupSemantics = {}): string {
  const asked = frameRequirement(props);
  return asked === 'required' ? (requiredState ? '' : props.requiredText) : asked === 'optional' ? props.optionalText : '';
}

/**
 * FGR-11: what describes the group, in this order — the description, the error text while the group is in error, the
 * requirement in words — as the ids of the rows `groupRows()` renders (`aria-describedby`); `undefined` while none is.
 */
export function groupDescribedBy(props: FrameProps, semantics: GroupSemantics = {}): string | undefined {
  return (
    [props.supportingText ? GROUP_IDS.description : '', props.error && props.errorText ? GROUP_IDS.error : '', groupRequirementText(props, semantics) ? GROUP_IDS.requirement : ''].filter(Boolean).join(' ') ||
    undefined
  );
}

/** The rows of a group's frame, for the component to place around its controls. */
export interface GroupRows {
  /** The label row (FGR-2, FGR-5, FGR-6): the content of the legend, or of the element the group is labelled by. `nothing` while the label is not drawn. */
  label: TemplateResult | typeof nothing;
  /** The description (FGR-7), which goes before the controls. */
  description: TemplateResult | typeof nothing;
  /** The error text (FGR-8), which goes after the controls. */
  error: TemplateResult | typeof nothing;
  /** The requirement in words, drawn nowhere, and the announcer (FGR-9, FGR-11). */
  unseen: TemplateResult;
  /** The state attributes of the group's root element, which the styles read. */
  labelled: boolean;
  described: boolean;
}

/**
 * The rows. The label's text is not hidden from assistive technology: it is the group's name, as a legend's content or
 * as the target of `aria-labelledby` (its id is `GROUP_IDS.label`); the tag and the asterisk are hidden.
 */
export function groupRows(props: FrameProps, semantics: GroupSemantics = {}, disabled = false): GroupRows {
  const words = groupRequirementText(props, semantics);
  return {
    // Named one by one: the props are a component's accessors, which a spread would not copy.
    label: frameLabelRow({
      label: props.label,
      labelHidden: props.labelHidden,
      requirement: props.requirement,
      requiredMark: props.requiredMark,
      requiredText: props.requiredText,
      optionalText: props.optionalText,
      labelId: GROUP_IDS.label,
      // FGR-5, FGR-14: the fieldset says the group is disabled; its tag is drawn as a tag inside something disabled.
      tagDisabled: disabled,
    }),
    description: frameText(props.supportingText, { id: GROUP_IDS.description }),
    error: props.error ? frameText(props.errorText, { id: GROUP_IDS.error, part: 'error-text', className: 'error-text' }) : nothing,
    unseen: html`${words ? html`<span id=${GROUP_IDS.requirement} hidden>${words}</span>` : nothing}${frameAnnouncer()}`,
    labelled: frameLabelled(props),
    described: !!props.supportingText,
  };
}

/** The parts a group's look and state color: a field's, without a label glyph. */
export const GROUP_PARTS = FRAME_PARTS.filter((part) => part !== 'label-icon');

/**
 * The group frame's styles, from the tokens of `prefix` (`--tanrei-comp-field-group`). The component's root element —
 * the fieldset — has the class `group` and carries `data-labelled`, `data-described`,
 * `data-error` and `data-disabled`; its controls' box has the class `controls` and carries `data-orientation` and
 * `data-spacing`. The distance between two members is `--_frame-gap`, which the component may set on its host (a
 * spacing axis); it is `gap.controls` otherwise.
 */
export function groupFrameStyles({ prefix }: { prefix: `--tanrei-comp-${string}` }): CSSResult {
  const T = (name: string) => `var(${prefix}-${name})`;
  return unsafeCSS(`
  :host {
    --_frame-gap: ${T('gap-controls')};
  }
  /* FGR-8, FGR-14: the current color of every part, from the tokens of the look and the state the group is in. A group
     has no focused state (the control that has focus shows it). */
  ${frameColors(prefix, 'standard', { rest: '.group', error: '.group[data-error]', disabled: '.group[data-disabled]', disabledError: '.group[data-disabled][data-error]' }, GROUP_PARTS)}
  .group {
    --_frame-error-text: ${T('standard-error-text-color')};
  }
  .group[data-disabled] {
    --_frame-error-text: ${T('standard-disabled-error-text-color')};
  }
  /* FGR-2, FGR-5, FGR-6, FGR-7, FGR-9, FGR-16, FGR-17, FGR-21: the field's rows, from the group's tokens; its colors
     change at once (the group declares no motion). */
  ${frameStyles({ prefix, motion: null, disabled: '.group[data-disabled]' })}

  /* FGR-1: no container, edge, fill or elevation, and no padding around the rows: the root is the positioning container
     of the announcer and nothing else (a fieldset's own border, padding, margin and minimum width are taken off). */
  .group {
    position: relative;
    box-sizing: border-box;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  /* The legend is the label row's box: it has no padding of its own and is as wide as the row needs, up to the group. */
  .legend {
    box-sizing: border-box;
    max-inline-size: 100%;
    margin: 0;
    padding: 0;
  }
  /* FGR-2: labelHidden draws no label row; the legend stays the group's name, drawn nowhere. */
  .legend[data-unseen] {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* FGR-1: the gaps are those of what follows — the description supporting-text.gap below the label row, the controls
     label.gap below whichever of the two is drawn last, the error error-text.gap below the last control — so a row that
     is not drawn keeps no room and no gap. */
  .label-row {
    margin-block-end: 0;
  }
  .supporting-text {
    margin-block-start: 0;
  }
  .group[data-labelled] .supporting-text {
    margin-block-start: ${T('supporting-text-gap')};
  }
  .group:is([data-labelled], [data-described]) .controls {
    margin-block-start: ${T('label-gap')};
  }
  /* FGR-8: the error text below the last control, in the supporting text's style and the error-text color. */
  .error-text {
    margin-block-start: ${T('error-text-gap')};
    min-inline-size: 0;
    overflow-wrap: break-word;
    font: ${T('supporting-text-typescale-font')};
    letter-spacing: ${T('supporting-text-typescale-letter-spacing')};
    color: var(--_frame-error-text);
  }
  ${productText('.error-text', { align: 'start' })}

  /* FGR-3: a column in the order given, each control from the start edge at its own size — a checkbox or a switch takes
     what its mark and its label need — the members gap.<spacing> apart. FGR-18: a row runs from the start edge, which
     is the right in right-to-left; a column keeps its order. */
  .controls {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--_frame-gap);
    min-inline-size: 0;
  }
  /* FGR-3: a field fills the group's width. */
  .controls[data-spacing='fields'] {
    align-items: stretch;
  }
  /* FGR-13: a row that wraps, gap-inline apart along it and gap.<spacing> between its lines, the controls aligned at
     their tops so that their first lines stand on one line; no control is cut, scrolled or narrowed. */
  .controls[data-orientation='horizontal'] {
    flex-flow: row wrap;
    align-items: flex-start;
    column-gap: ${T('gap-inline')};
    row-gap: var(--_frame-gap);
  }
  /* FGR-13: fields share the row equally, each never narrower than field.min-width nor than its content needs: they
     grow from that width alike, and the row wraps where the next one would be narrower. A field alone on a line that is
     narrower still shrinks to it. */
  .controls[data-orientation='horizontal'][data-spacing='fields'] ::slotted(*) {
    flex: 1 1 ${T('field-min-width')};
  }

  /* FGR-17: forced colors — the error text is text like the rest; the words and the invalid state carry the error. */
  @media (forced-colors: active) {
    .error-text {
      color: CanvasText;
    }
    .group[data-disabled] .error-text {
      color: GrayText;
    }
  }
`);
}

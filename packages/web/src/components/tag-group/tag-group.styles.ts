import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';

// Every value is a token (tokens/comp/tag-group.tokens.json): two distances for each spacing, and the time and curve of
// a member's move. The group draws nothing of its own (TGR-1) — no container, no fill, no edge, no padding, no label —
// and has no state, so there is no state rule, no focus indicator and no target here; the move (TGR-10) is the
// element's script, which reads its timing from the list.
export const PREFIX = '--tanrei-comp-tag-group';
/** The values of `spacing` every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SPACINGS = ['tags', 'chips'] as const;
export const DEFAULT_SPACING = 'chips';
/**
 * The members of the spacing axis (`dev.tanrei.axes.spacing.members`), and the private property each is read into. The
 * names are the group's alone (`--_set-*`): custom properties inherit into the members' shadow roots, where `--_gap`
 * is a member's own.
 */
const SPACING_MEMBERS = { gap: '--_set-gap', 'row-gap': '--_set-row-gap' } as const;

/**
 * TGR-1, TGR-2, TGR-4: the two distances of what the set holds. A value a layer added falls back to the default's
 * token where the active system lacks it (TGR-16).
 */
const spacingBlock = (spacing: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SPACING_MEMBERS)
    .map(([member, name]) => `  ${name}: ${fallback ? `var(${PREFIX}-${member}-${spacing}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${spacing})`};`)
    .join('\n')}\n}`;

/** The open axis (TGR-16): a spacing the active design system does not have is drawn as `tags` and reported. */
export const AXES: readonly OpenAxis[] = [
  { name: 'spacing', core: CORE_SPACINGS, default: DEFAULT_SPACING, rules: (value, selector) => spacingBlock(value, selector, DEFAULT_SPACING), probe: (value) => `${PREFIX}-gap-${value}` },
];

export const styles = css`
  /* TGR-1: a block as wide as its layout gives it and as tall as its lines. Nothing is drawn on it. */
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  /* TGR-8: a group with no member takes no space — not a line, and not a gap of the layout around it. Its own rule: a
     browser without custom states drops only this one, and the empty group is then an empty block, no height. */
  :host(:state(empty)) {
    display: none;
  }
  ${unsafeCSS(spacingBlock(DEFAULT_SPACING, ':host'))}
  ${unsafeCSS(CORE_SPACINGS.filter((spacing) => spacing !== DEFAULT_SPACING).map((spacing) => spacingBlock(spacing, `:host([spacing='${spacing}'])`)).join('\n'))}

  /* TGR-1: lines from the start edge, in the order given, each member at its own size and centred on its line's middle.
     TGR-2: a member that does not fit goes whole to a new line — a wrapping line shrinks nothing that fits on a line of
     its own — and only one that is wider than the group is given the group's width, where its own rule cuts its label
     (TAG-5, CHP-17: both cap themselves at the width they are given). Nothing scrolls and nothing is hidden.
     TGR-14, TGR-15: the row follows the direction of where the group stands, so a right-to-left layout starts every line
     at the right; there is no setting and nothing to draw again. TGR-13: no color is used, forced or not. */
  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: var(--_set-gap);
    row-gap: var(--_set-row-gap);
    /* TGR-5: the distance along a line is handed to the members, which inherit it: an internal contract between Tanrei
       elements, not a styling API. A chip reads it to end its hit area half a gap past its visible edge, so that the
       areas of two chips narrower than the target meet at the middle of the gap (chip.styles.ts). */
    --tanrei-set-gap: var(--_set-gap);
    /* TGR-10: the time and the curve of a member's move as the cascade computes them, for the script that moves the
       members (a duration token is an expression: it is computed through a real property, here one that moves nothing). */
    transition-property: none;
    transition-duration: var(--tanrei-comp-tag-group-motion-move-duration);
    transition-timing-function: var(--tanrei-comp-tag-group-motion-move-easing);
  }
  /* TGR-5: the distance between two lines is handed on only while there are two lines — the custom state the element
     sets when its members wrap — so that the chips of a set on one line keep their whole target above and below. A
     browser without custom states hands nothing on, and the areas of two lines overlap as they would without a group. */
  :host(:state(wrapped)) .list {
    --tanrei-set-row-gap: var(--_set-row-gap);
  }
`;

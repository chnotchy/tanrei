import { css, unsafeCSS } from 'lit';
import { groupFrameStyles } from '../../primitives/field-group-frame.js';
import type { OpenAxis } from '../../primitives/index.js';

// Every visual value is a token (tokens/comp/field-group.tokens.json). The group draws a frame and lays its controls
// out; it draws no container and nothing of a control (FGR-1). It has no state layer and no focused state: it answers
// no hover, no press and no key (FGR-12).
export const PREFIX = '--tanrei-comp-field-group';
/** The values of `spacing` every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SPACINGS = ['controls', 'fields'] as const;
const DEFAULT_SPACING = 'controls';

/** FGR-3, FGR-13: the distance between two members is the token of what the set holds; a value a layer added falls back to the default's. */
const spacingBlock = (spacing: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n  --_frame-gap: ${fallback ? `var(${PREFIX}-gap-${spacing}, var(${PREFIX}-gap-${fallback}))` : `var(${PREFIX}-gap-${spacing})`};\n}`;

/** The open axis (FGR-22): a spacing the active design system does not have is drawn as `controls` and reported. */
export const AXES: readonly OpenAxis[] = [
  { name: 'spacing', core: CORE_SPACINGS, default: DEFAULT_SPACING, rules: (value, selector) => spacingBlock(value, selector, DEFAULT_SPACING), probe: (value) => `${PREFIX}-gap-${value}` },
];

export const styles = css`
  /* FGR-1: a block as wide as its layout gives it, as tall as its rows and its controls together. */
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  /* FGR-1 … FGR-9, FGR-13, FGR-16 … FGR-18, FGR-21: the group's frame, from the group's tokens. */
  ${groupFrameStyles({ prefix: PREFIX })}
  ${unsafeCSS(CORE_SPACINGS.filter((spacing) => spacing !== DEFAULT_SPACING).map((spacing) => spacingBlock(spacing, `:host([spacing='${spacing}'])`)).join('\n'))}
`;

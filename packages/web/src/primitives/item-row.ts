import { type CSSResult, unsafeCSS } from 'lit';
import { rippleStyles } from './ripple.js';
import { conditionBlock, conditionStates, selectionContainerShape } from './selection.js';
import type { StateSelector } from './states.js';

/**
 * A row of a column of items (a list item, LST-*; a menu item, MNU-*): one box, `.row`, that carries the item's condition
 * (its state variants), hover, focus and press, the ripple and the focus ring drawn inside it.
 * The row answers states only while it is pressable (`.p`) and reads disabled from `.d`, so that a row whose semantics
 * live on its host (an option, a menu item) and a row that is its own button (an interactive list item) share one set of
 * rules. The component supplies its prefix, its parts, which selector draws each condition, where each state is read,
 * and which element paints each colored part.
 */
export interface ItemRowOptions {
  /** `--tanrei-comp-<name>`. */
  prefix: `--${string}`;
  /** The parts every condition colors in every state: private key → token part (`h: 'headline-color'`). `c` is the container. */
  parts: Record<string, string>;
  /** Each condition and the selector of the row that draws it (`unselected: '.row'`, `selected: '.row.selected'`); later ones win. */
  conditions: Record<string, string>;
  /** Where each state is read (`stateRules()`); every selector it returns must have the same specificity. */
  on: StateSelector;
  /** Each element that is painted in a part's color: selector → key. It recolors over the state motion. */
  paints: Record<string, string>;
}

/**
 * The row's styles: the condition blocks, the resting paint, the state rules and their precedence (pressed > focused >
 * hovered, disabled over all; the four `pressed-feedback` answers), the state motion of every color and of the opacity
 * (none where motion is reduced) and the ripple. The pressed state arrives without a transition in, colors included.
 */
export function itemRowStyles({ prefix, parts, conditions, on, paints }: ItemRowOptions): CSSResult {
  const motion = `var(${prefix}-motion-state-duration) var(${prefix}-motion-state-easing)`;
  const painted = Object.keys(paints).join(', ');
  return unsafeCSS(`
  ${Object.entries(conditions)
    .map(([condition, selector]) => conditionBlock(prefix, condition, parts, selector))
    .join('\n')}
  .row {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    outline: none;
    ${selectionContainerShape}
    background: var(--_c);
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, opacity, border-radius;
    transition-duration: var(${prefix}-motion-state-duration);
    transition-timing-function: var(${prefix}-motion-state-easing);
  }
  .row.p {
    cursor: pointer;
    /* A row is pressed, never selected as text (MNU-15). WebKit keeps the text selectable until its own name
       says so: a drag that began on a row selected the rows' text. (A press held on a selection is never the engine's
       drag of the text: PressController refuses it.) */
    -webkit-user-select: none;
    user-select: none;
  }
  ${Object.entries(paints)
    // An icon's fill (`iconGlyph()`) keeps its transition: this declaration replaces that one, so it carries both.
    .map(([selector, key]) => `${selector} {\n    color: var(--_${key});\n    transition:\n      color ${motion},\n      font-variation-settings ${motion};\n  }`)
    .join('\n  ')}
  ${conditionStates(prefix, parts, { container: 'c', root: '.row', on })}
  .row[data-pressed]:not([data-pressed='none']) :is(${painted}) {
    transition-duration: 0s;
  }
  ${rippleStyles({
    color: '--_c-p',
    grow: `${prefix}-motion-feedback-duration`,
    fade: `${prefix}-motion-state-duration`,
    easing: `${prefix}-motion-state-easing`,
  })}
  @media (prefers-reduced-motion: reduce) {
    .row,
    ${painted} {
      transition: none;
    }
  }
`);
}

/**
 * LST-11, MNU-12: a pressable row is at least `sys.target.pointer` tall for a fine pointer and `sys.target.touch` for a
 * coarse one — rows that touch cannot extend a hit area over each other, so the row itself grows — and at least `height`
 * (its own minimum) whatever the pointer.
 */
export function rowTarget(selector: string, height: string): CSSResult {
  return unsafeCSS(`
  ${selector} {
    min-block-size: max(${height}, var(--tanrei-sys-target-pointer));
  }
  @media (pointer: coarse) {
    ${selector} {
      min-block-size: max(${height}, var(--tanrei-sys-target-touch));
    }
  }
`);
}

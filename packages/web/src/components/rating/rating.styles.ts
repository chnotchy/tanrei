import { css, unsafeCSS } from 'lit';
import {
  type OpenAxis,
  type StateSelector,
  conditionBlock,
  conditionStates,
  focusRing,
  iconGlyph,
  pressHold,
  rippleStyles,
  selectionContainerShape,
} from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/rating.tokens.json). Each mark has two conditions — unselected (beyond the
// score) and selected (within it; a half mark is selected) — which are the rating's state variants: each colors the
// round container behind the mark in every state. The mark itself is drawn twice, in the two forms of the icon set:
// the selected form in the selected condition's mark color and the unselected form in the unselected one's, and the
// score decides which of the two is shown, or both, each on its half (RAT-1, RAT-2).
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_SIZE = 'medium';
const PREFIX = '--tanrei-comp-rating';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The members of the size axis (`dev.tanrei.axes.size.members`), as private properties on the host. */
const SIZE_MEMBERS = { mark: 'mark-size', container: 'container-size' } as const;

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (member: string, size: string, fallback: string | null) => (fallback ? `var(${PREFIX}-${member}-${size}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${size})`);

/** One size's members as private properties (`--_mark`, `--_container`). */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .map(([key, member]) => `  --_${key}: ${ref(member, size, fallback)};`)
    .join('\n')}\n}`;

/** RAT-18: sizes a design system adds get their block on demand; a size the active system lacks draws medium. */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-size-${value}` },
];

/**
 * Where each state of a mark's container is read. Hover is `data-hovered`, written by the rating on the mark the pointer
 * would press (its hit area reaches beyond the containers, RAT-8, so `:hover` on a container would miss it); focus is
 * the radio's own keyboard focus; pressed is `data-pressed` (PressController); disabled is the rating's, on each mark.
 * `:where()` keeps every rule at the resting rule's specificity, so the order `stateRules()` writes them in is the
 * precedence.
 */
const on: StateSelector = (state) => {
  if (state === ':hover') return '.item:where([data-hovered])';
  if (state === ':disabled') return '.item:where([data-disabled])';
  return `.item:where(${state})`;
};

/** The parts each state recolors: the container of the mark's condition, and the two forms' mark colors. */
const PARTS = { c: 'container-color', n: 'mark-color', f: 'mark-color' } as const;

export const styles = css`
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}

  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
  }

  ${shape}

  /* RAT-1: the marks in a row from the inline-start edge (the score grows leftward in right-to-left, RAT-16), their
     containers touching. The row is the radio group, the slider or the image (RAT-3, RAT-4, RAT-5); its corners are
     the container's, so the slider's focus ring around it is a capsule (RAT-11). */
  .row {
    position: relative;
    display: flex;
    flex-wrap: nowrap;
    outline: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
  }
  .row[data-interactive] {
    cursor: pointer;
  }

  /* RAT-8: the hit area reaches sys.target.pointer (a fine pointer) or sys.target.touch (touch) on both axes around the
     row of containers, without changing what is drawn. A point anywhere on it belongs to the mark whose centre is
     nearer: the rating reads the point against the row (src/components/rating/rating.ts, scoreAt), so the row is
     divided at the middle between marks and the end marks take what reaches past the ends. */
  .row::before {
    --_target: var(--tanrei-sys-target-pointer);
    content: '';
    position: absolute;
    inset-block: calc((100% - max(100%, var(--_target))) / 2);
    inset-inline: calc((var(--_container) - max(var(--_container), var(--_target))) / 2);
  }
  @media (pointer: coarse) {
    .row::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', { c: PARTS.c }, '.item'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', { c: PARTS.c }, '.item[data-selected]'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', { n: PARTS.n }, '.item'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', { f: PARTS.f }, '.item'))}

  /* RAT-1: each mark centred in its round container, container.size across. The container carries the state layer, the
     ripple (its own stacking context) and the radio's focus ring. */
  .item {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    flex: none;
    inline-size: var(--_container);
    block-size: var(--_container);
    outline: none;
    background: var(--_c);
    ${unsafeCSS(selectionContainerShape)}
    transition-property: background-color, border-radius;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }

  /* RAT-7, RAT-9, RAT-10, RAT-13: each state paints from that state's tokens of the mark's condition; pressed > focused >
     hovered, disabled over all. */
  ${unsafeCSS(conditionStates(PREFIX, PARTS, { container: 'c', root: '.item', on }))}

  /* RAT-10 ripple: the pressed container color of the mark's condition, grown over motion.feedback-duration and faded
     over motion.state-duration, both with motion.state-easing, clipped to the container. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* RAT-9: the mark carries press-hold for each mark's PressController; it has no transition of its own. */
  ${pressHold('.mark')}

  /* RAT-1, RAT-2: the mark's glyph box, mark.size across, holding its two forms in the same place. */
  .mark {
    display: grid;
    inline-size: var(--_mark);
    block-size: var(--_mark);
    pointer-events: none;
  }
  .layer {
    grid-area: 1 / 1;
    display: grid;
    /* RAT-12: a change of score fades each mark between its two forms; a fade, so it stays where motion is reduced. */
    transition: opacity ${t('motion-selection-duration')} ${t('motion-selection-easing')};
  }
  .layer > .glyph {
    transition: color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .on > .glyph {
    color: var(--_n);
  }
  .off > .glyph {
    color: var(--_f);
  }
  ${iconGlyph('.on > .glyph', { size: '--_mark', selected: '.mark' })}
  ${iconGlyph('.off > .glyph', { size: '--_mark', selected: ':not(*)' })}

  /* RAT-1: a mark within the score shows its selected form, a mark beyond it its unselected form. */
  .on {
    opacity: 0;
  }
  .item[data-fill='full'] .on {
    opacity: 1;
  }
  .item[data-fill='full'] .off {
    opacity: 0;
  }
  /* RAT-2: a half mark is both forms, each clipped to its half at the glyph's centre line: the selected form on the
     inline-start half, the unselected one on the inline-end half. The clip is on the layer, around the glyph, so a glyph
     the icon set mirrors in right-to-left (RAT-16) keeps its halves where the direction puts them. */
  .item[data-fill='half'] .on {
    opacity: 1;
    clip-path: inset(0 50% 0 0);
  }
  .item[data-fill='half'] .off {
    clip-path: inset(0 0 0 50%);
  }
  :host(:dir(rtl)) .item[data-fill='half'] .on {
    clip-path: inset(0 0 0 50%);
  }
  :host(:dir(rtl)) .item[data-fill='half'] .off {
    clip-path: inset(0 50% 0 0);
  }

  /* RAT-11: keyboard focus, never for focus gained by pointer: around the focused mark's container while the rating is a
     radio group, around the row of containers while it is a slider. Never animated. */
  ${focusRing((focus) => `.item${focus}`)}
  ${focusRing((focus) => `.row[role='slider']${focus}`)}

  .item[data-pressed]:not([data-pressed='none']) .layer > .glyph {
    transition-duration: 0s;
  }

  @media (forced-colors: active) {
    /* RAT-17: every mark in the text color — the selected form filled and the unselected form outlined, so the score is
       read from the shapes — the hovered mark's container in the highlight color, a disabled rating in the disabled
       text color. */
    .layer > .glyph {
      forced-color-adjust: none;
      color: CanvasText;
    }
    .item {
      forced-color-adjust: none;
      background: transparent;
    }
    .item[data-hovered]:not([data-disabled]) {
      background: Highlight;
    }
    .item[data-disabled] .layer > .glyph {
      color: GrayText;
    }
  }
`;

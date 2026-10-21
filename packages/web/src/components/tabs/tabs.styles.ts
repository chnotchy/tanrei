import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, iconGlyph, pressHold, rippleStyles, stateRules, whenChosen } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/tabs.tokens.json). A tab has two looks in each variant: a tab
// that is not selected reads the variant's own parts, the selected tab its `selected.` parts. How a state looks is the
// design system's decision: hover, focus and press mix each look's container with its `state-layer.color` in the default
// system and draw nothing in cupertino, by value; the component only says which state's tokens are drawn.
export const CORE_VARIANTS = ['primary', 'secondary', 'tonal'] as const;
const DEFAULT_VARIANT = 'primary';
/** TAB-44: the sizes every design system has; a layer may add values. */
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_SIZE = 'medium';
/**
 * TAB-18, TAB-50: the variants whose tab puts its icon before its label and whose underline spans the whole tab —
 * secondary's structure. Anything else, a variant a layer added included, has primary's.
 */
export const INLINE_VARIANTS: readonly string[] = ['secondary', 'tonal'];
const PREFIX = '--tanrei-comp-tabs';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The interaction states as the token names say them, and their private suffix (`-r` is at rest). */
const STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
/** The parts each look colors in every state. */
const LOOK_PARTS = {
  c: 'container-color',
  l: 'label-color',
  i: 'icon-color',
  a: 'active-indicator-color',
  cl: 'covered-label-color',
  ci: 'covered-icon-color',
  u: 'underline-color',
} as const;
const LOOKS = { plain: '', selected: 'selected-' } as const;
/**
 * The indicator's corner and the underline's thickness and corner: per variant and state, not per look (the rules pin
 * them to rest). `active-indicator.thickness` is read by no behaviour of this revision (it stays for the lagging platforms).
 */
const VARIANT_PARTS = { s: 'active-indicator-shape', ut: 'underline-thickness', us: 'underline-shape' } as const;

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (variant: string) => string, variant: string, fallback: string | null) => (fallback ? `var(${name(variant)}, var(${name(fallback)}))` : `var(${name(variant)})`);

/**
 * One variant's parts, in every look and state, as private custom properties on the tabs (`--_selected-c-h` is the
 * selected look's container, hovered; `--_ut-r` the underline's thickness at rest). The row declares them on its slotted
 * tabs, so the variant is the row's and every tab inherits it. The token of a look and a state is
 * `<variant>-<state>-<look>-<part>`.
 */
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${[
    ...Object.entries(LOOKS).flatMap(([look, prefix]) =>
      Object.entries(STATES).flatMap(([state, suffix]) =>
        Object.entries(LOOK_PARTS).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${prefix}${part}`, variant, fallback)};`),
      ),
    ),
    ...Object.entries(STATES).flatMap(([state, suffix]) =>
      Object.entries(VARIANT_PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${part}`, variant, fallback)};`),
    ),
    // TAB-50: the weight the selected label gains.
    `  --_emph: ${ref((v) => `${PREFIX}-${v}-selected-label-emphasis`, variant, fallback)};`,
  ].join('\n')}\n}`;

const TAB = '::slotted(tanrei-tab)';

/** TAB-44: the members of the size axis (tokens/comp/tabs.tokens.json, `dev.tanrei.axes`), and the private name of each. */
const SIZE_PARTS = {
  height: 'container-height',
  'padding-inline': 'container-padding-inline',
  'indicator-padding-inline': 'active-indicator-padding-inline',
  'indicator-padding-block': 'active-indicator-padding-block',
  icon: 'icon-size',
  'icon-placement': 'icon-placement',
} as const;
/**
 * One size's tokens as private custom properties (`--_size-height`…), declared by the row on its slotted tabs as a
 * variant's parts are, so the size is the row's and every tab inherits it.
 */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_PARTS)
    .map(([key, part]) => `  --_size-${key}: ${ref((v) => `${PREFIX}-${part}-${v}`, size, fallback)};`)
    .join('\n')}\n}`;
const S = (key: keyof typeof SIZE_PARTS) => unsafeCSS(`var(--_size-${key})`);

/** `comp.tabs.icon.placement` of the row's size (TAB-18): a choice's name. The first is what an unknown name is. */
export const ICON_PLACEMENT = ['stacked', 'inline'] as const;
/** `comp.tabs.track.visible` (TAB-49): a choice's name. The first is what an unknown name is. */
export const TRACK_CHOICE = ['off', 'on'] as const;
/** TAB-49: whether the track is filled, as the host carries it: its `track` attribute's, or — unset — the system's choice. */
export const TRACK_PROPERTY = '--_tabs-track';
/** TAB-51, TAB-60: the directions the tabs run. The first is the default, and what an unknown value draws. */
export const ORIENTATIONS = ['horizontal', 'vertical'] as const;
/** The row's own selector while it runs vertically (TAB-51): exactly `vertical`; any other value is horizontal (TAB-60). */
const VERTICAL = ":host([orientation='vertical'])";
const V = unsafeCSS(VERTICAL);
/** `comp.tabs.motion.transition` (TAB-43): a choice's name. The first is what an unknown name is. */
export const TRANSITION_CHOICE = ['slide', 'none'] as const;
/** The row's `transition` prop: `auto` takes the component token, and so does a value the tabs do not define. */
export const TRANSITION_VALUES = ['auto', ...TRANSITION_CHOICE] as const;
/** TAB-43: how a new selection is drawn, as the host carries it: its `transition` attribute's name, or the system's choice. */
export const TRANSITION_PROPERTY = '--_tabs-transition';
/** TAB-27: the track's color is the row's, one per variant, the same in every state of every tab. */
const trackBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n  --_track: ${ref((v) => `${PREFIX}-${v}-track-color`, variant, fallback)};\n  --_indicator-shape: ${ref((v) => `${PREFIX}-${v}-active-indicator-shape`, variant, fallback)};\n}`;

/**
 * TAB-7: a variant a layer added gets its block on demand, built by the same function and falling back to the default's
 * tokens; a value the active system lacks is reported in debug builds (src/primitives/axes.ts).
 */
export const AXES: readonly OpenAxis[] = [
  {
    name: 'variant',
    core: CORE_VARIANTS,
    default: DEFAULT_VARIANT,
    rules: (value, selector) => `${variantBlock(value, `${selector} ${TAB}`, DEFAULT_VARIANT)}\n${trackBlock(value, selector, DEFAULT_VARIANT)}`,
    probe: (value) => `${PREFIX}-${value}-container-color`,
  },
  {
    name: 'size',
    core: CORE_SIZES,
    default: DEFAULT_SIZE,
    rules: (value, selector) => sizeBlock(value, `${selector} ${TAB}`, DEFAULT_SIZE),
    probe: (value) => `${PREFIX}-container-height-${value}`,
  },
];

/**
 * The row (TAB-14, TAB-15, TAB-20, TAB-21, TAB-27): the tab list; the divider along its whole bottom; and the track,
 * which is the scroller — one constant color per variant, its corners track.shape, no outline — that lays the tabs out
 * track.padding in from its ends, each its content's width (hug, the default: the track then ends with its last tab)
 * or an equal share of the row (`full-width`), and scrolls them sideways inside itself when they do not fit, clipped to
 * its shape. The panels follow the row.
 */
export const tabsStyles = css`
  :host {
    display: block;
    /* TAB-49, TAB-43: the system's choices (their NAMES, as the cascade gives them here)… */
    ${unsafeCSS(TRACK_PROPERTY)}: ${t('track-visible')};
    ${unsafeCSS(TRANSITION_PROPERTY)}: ${t('motion-transition')};
  }
  /* …unless the row says so itself: \`track\` (true) or ="false"; \`transition\` by name (any other value is auto). */
  :host([track]) {
    ${unsafeCSS(TRACK_PROPERTY)}: on;
  }
  :host([track='false' i]) {
    ${unsafeCSS(TRACK_PROPERTY)}: off;
  }
  ${unsafeCSS(TRANSITION_CHOICE.map((name) => `:host([transition='${name}']) {\n    ${TRANSITION_PROPERTY}: ${name};\n  }`).join('\n  '))}
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, `:host ${TAB}`))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}']) ${TAB}`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, `:host ${TAB}`))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}']) ${TAB}`)).join('\n'))}
  ${unsafeCSS(trackBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => trackBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  .row {
    position: relative;
  }
  /* TAB-20: the line under the whole row, under the track, the tabs, the indicator and the underline, across the full
     width while the tabs scroll. Transparent in the default system. */
  .divider {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: ${t('divider-thickness')};
    background: ${t('divider-color')};
    /* TAB-5: the two minimum targets, read through real properties that do nothing here (the divider is scrolled to
       by nothing): how far above and below a row lower than the target its tabs still answer a press. */
    scroll-margin-block-start: var(--tanrei-sys-target-pointer);
    scroll-margin-block-end: var(--tanrei-sys-target-touch);
  }
  /* TAB-27: the track, behind the whole row — the same whichever tab is selected and whatever state a tab is in. It is
     as wide as its tabs plus track.padding at each end and never wider than the row; it stays still while the tabs
     scroll inside it, and its shape clips them (and a focus ring, TAB-4).
     TAB-14, TAB-15: the tabs scroll sideways when they do not fit — always for tabs that hug a long row, and for tabs
     that share it only when the shares would fall below the minimum target. No scroll bar: a wheel, a trackpad, a drag
     or the arrow keys scroll it. The reveal and the indicator's slide read the indicator's timing through real
     properties (no animation is named, so they change nothing); where motion is reduced it is 0.
     TAB-28: sideways drags are the row's and vertical ones the page's — unless the tabs scroll (.scrolls), where a
     sideways drag scrolls them and only the selected tab keeps it for the indicator (the tab's own touch-action). */
  .scroller {
    position: relative;
    box-sizing: border-box;
    inline-size: fit-content;
    max-inline-size: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    touch-action: pan-y pinch-zoom;
    ${unsafeCSS(cornerRadius('--tanrei-comp-tabs-track-shape'))}
    animation-duration: ${t('motion-indicator-duration')};
    animation-timing-function: ${t('motion-indicator-easing')};
  }
  /* TAB-27, TAB-49: the track is filled while the row's track is on. Off — the first value, and so what an unknown name
     draws — fills nothing and changes nothing else: the box, the inset, the corners and the clip stay. */
  ${whenChosen(TRACK_PROPERTY, '.row', 'track', 'on', (row) => `${row} .scroller {\n    background: var(--_track);\n  }`)}
  .scroller.scrolls {
    touch-action: auto;
  }
  :host([full-width]) .scroller {
    inline-size: auto;
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  /* TAB-14, TAB-34: the tabs are placed by the indicator — the first tab's starts track.padding in from the track's
     start and the last one's ends the same distance before its end. Where an end tab is wider than its indicator (a
     circle in a tab widened to the minimum target) the tab reaches into that inset by half the difference (--_reach-*,
     written by the row from what its end tabs measured) and no further than the track's edge: the inset is the row's
     padding, less that reach. A tab as wide as its indicator (a capsule, a share of a row that fills) reaches nowhere.
     TAB-28: the catch-up of a drag reads the
     state motion through real properties here (no property is named, so nothing transitions). */
  .tabs {
    position: relative;
    box-sizing: border-box;
    display: flex;
    padding-inline: calc(${t('track-padding')} - min(${t('track-padding')}, var(--_reach-start, 0px))) calc(${t('track-padding')} - min(${t('track-padding')}, var(--_reach-end, 0px)));
    transition-property: none;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* TAB-14: tabs that hug are their content's width and the row starts at its start edge (the right one in RTL); the
     row of them is their width, so a change of their size (a font arriving) is seen and the selected tab kept in view. */
  :host(:not([full-width])) .tabs {
    inline-size: max-content;
  }
  ${unsafeCSS(TAB)} {
    flex: none;
  }
  /* TAB-14: tabs that fill share the row's width, less the track's padding, equally, each at least the minimum target
     (the tab's own minimum); a row too narrow for that scrolls. */
  :host([full-width]) ${unsafeCSS(TAB)} {
    flex: 1 1 0;
  }
  ${shape}
  /* TAB-43: while the row's transition is none, the indicator's motion and the catch-up of a drag take no time — what the
     row reads through these two properties is what it reads where motion is reduced, so a new selection is drawn in one
     frame, a tab is brought into view at once and a drag lands at once. A tab's states keep their motion (the tab's own). */
  ${whenChosen(TRANSITION_PROPERTY, '.row', 'transition', 'none', (row) => `${row} .scroller {\n    animation-duration: 0s;\n  }\n  ${row} .tabs {\n    transition-duration: 0s;\n  }`)}
  @media (prefers-reduced-motion: reduce) {
    .scroller {
      animation-duration: 0s;
    }
    .tabs {
      transition-duration: 0s;
    }
  }
  /* TAB-51: a column of tabs at the start edge, beside the panels, which take the rest of the row. The column is as wide
     as its widest tab (or as the product makes the tab list) and never wider than the row; it is as tall as the row,
     so that a row given a height holds its tabs in it and scrolls them (TAB-56). */
  ${V} {
    display: flex;
    align-items: stretch;
  }
  ${V} .row {
    flex: none;
    box-sizing: border-box;
    max-inline-size: 100%;
    min-block-size: 0;
  }
  ${V} ::slotted(tanrei-tab-panel) {
    flex: 1 1 0;
    min-inline-size: 0;
  }
  /* TAB-53: the divider along the column's end edge, the panels' side (the left one in right-to-left), its whole height. */
  ${V} .divider {
    inset-block: 0;
    inset-inline: auto 0;
    block-size: auto;
    inline-size: ${t('divider-thickness')};
  }
  /* TAB-56: the tabs scroll up and down inside the track, as tall as the tabs and no taller than the row; every touch is
     the scroll's (TAB-57). TAB-58: the track's corners are the smaller of its own shape and the indicator's corner — the
     variant's shape, at most half the indicator's height (--_ih, written by the row) — plus the inset, so that the two
     are concentric at the column's ends. */
  ${V} .scroller {
    inline-size: auto;
    max-inline-size: none;
    max-block-size: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-x: auto;
    overscroll-behavior-y: contain;
    touch-action: auto;
    --tanrei-corner-radius: min(${t('track-shape')}, min(var(--_indicator-shape), var(--_ih, 0px) / 2) + ${t('track-padding')});
  }
  /* TAB-51, TAB-52: the tabs one above another, each as wide as the column; the indicator's inset is each tab's own
     (TAB-52), so the strip has none. fullWidth does not apply (TAB-56). */
  ${V} .tabs,
  :host([orientation='vertical']:not([full-width])) .tabs {
    flex-direction: column;
    inline-size: auto;
    padding: 0;
  }
  ${V} ${unsafeCSS(TAB)} {
    flex: none;
  }
  @media (forced-colors: active) {
    .divider {
      background: CanvasText;
    }
  }
`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus ring
// drawn inside the tab, the carrier of press-hold and the icon glyph, plus the one corner rule (styles/shape.ts).
/**
 * Where each state is read (TAB-3): hover and press on the tab's container, keyboard focus on its host (the tab takes
 * focus itself), disabled from `.d`. Every selector has the same specificity, so the order is the precedence.
 */
const on = (state: string) => {
  if (state === ':focus-visible') return ':host(:focus-visible) .tab';
  if (state === ':disabled') return '.tab.p.d';
  return `.tab.p${state}`;
};
const KEYS = [...Object.keys(LOOK_PARTS), ...Object.keys(VARIANT_PARTS)];
const set = (suffix: string, skip?: string) =>
  KEYS.filter((key) => key !== skip)
    .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
    .join('');
const lookBlock = (look: keyof typeof LOOKS, selector: string) =>
  `${selector} {\n${Object.values(STATES)
    .flatMap((suffix) => Object.keys(LOOK_PARTS).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
    .join('\n')}\n}`;
const STATE_MOTION = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

/**
 * One tab (TAB-3…6, TAB-8…10, TAB-14, TAB-16, TAB-18, TAB-19, TAB-23, TAB-24): the whole tab answers the pointer; its
 * container (.box) — the state layer and the ripple — is drawn in the box the active indicator has on this tab, or would
 * have if it were selected, never on the tab's rectangle; its icon and label on one line, centred and kept clear of the
 * underline; the covered layer over them, which is the indicator's piece on this tab and carries the covered copy of
 * the icon and label; the underline's piece on its bottom edge (both clipped by the row to where the indicator is,
 * TAB-17); and, above them all, the focus ring around the same box (.ring).
 */
export const tabStyles = css`
  :host {
    display: flex;
    /* TAB-5, TAB-14: a tab that shares the row never shrinks below the minimum target. */
    /* TAB-14: nor is it ever narrower than its indicator, which is as tall as the row less the track's padding (--_th,
       written by the tab once it knows the row's height). */
    min-inline-size: calc(max(var(--tanrei-sys-target-pointer), var(--_th, 0px)) - var(--_trim, 0px));
    /* TAB-4: the ring is drawn around the container, never around the host. */
    outline: none;
  }
  /* TAB-4: the ring reaches over the neighbouring tabs, so the focused tab is drawn above them. */
  :host(:focus-visible) {
    z-index: 1;
  }
  @media (pointer: coarse) {
    :host {
      min-inline-size: calc(max(var(--tanrei-sys-target-touch), var(--_th, 0px)) - var(--_trim, 0px));
    }
  }
  ${unsafeCSS(lookBlock('plain', '.tab'))}
  ${unsafeCSS(lookBlock('selected', '.tab.selected'))}
  /* TAB-17, TAB-24: the indicator is drawn in the selected tab's colors wherever it is — over this tab mid-slide too. The
     selected tab draws its own state's; the others its resting look, or its disabled one while it is disabled (TAB-6). */
  .tab {
    --_pill: var(--_selected-a-r);
    --_line: var(--_selected-u-r);
  }
  .tab.pill-disabled {
    --_pill: var(--_selected-a-d);
    --_line: var(--_selected-u-d);
  }
  .tab.selected {
    --_pill: var(--_a);
    --_line: var(--_u);
  }

  /* TAB-18: the content centred, inside the indicator's box (track.padding above and below it) and with the underline's
     thickness kept clear above and below; the covered layer lays its copy out the same way, so the two coincide to the
     pixel. */
  .tab,
  .cover {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-inline: ${S('padding-inline')};
    padding-block: max(${t('track-padding')}, var(--_ut));
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
  }
  /* TAB-14: a tab whose indicator is a circle (data-round, measured by the tab in a row that hugs) is that circle and
     no wider: it takes no inline padding, and its width is its least one — the larger of the circle and the minimum
     target. The covered copy is laid out the same way.
     TAB-34: at an end of the row, where that width is more than the circle and the track's inset on each side (a small
     row's 24 circle in a 44 tab), the tab ends at the track's edge — it is laid out narrower by what would lie beyond
     it (--_trim, written by the tab) — and its circle keeps the inset from the track's end: the content leans toward
     that end by the same amount (--_lean-*), and the container and the ring with it. */
  .tab[data-round],
  .tab[data-round] .cover {
    padding-inline: var(--_lean-start, 0px) var(--_lean-end, 0px);
  }
  /* The probe of a capsule's width is not read for a circle; it stays inside the tab, so that it never widens what the
     track scrolls. */
  .tab[data-round] .plate {
    inset-inline: 0;
  }
  /* TAB-34, TAB-35: what is left of the track's inset beside the first and the last tab is theirs: their hit areas
     reach the track's edge (the rest of the row's height is the tab's already). It draws nothing. */
  .tab.first::before,
  .tab.last::after {
    content: '';
    position: absolute;
    inset-block: 0;
    inline-size: max(0px, calc(${t('track-padding')} - var(--_wider, 0px)));
  }
  .tab.first::before {
    inset-inline-end: 100%;
  }
  .tab.last::after {
    inset-inline-start: 100%;
  }
  .tab {
    position: relative;
    /* Its own stacking context: the container under the content, the ring above everything. */
    isolation: isolate;
    flex: 1 1 auto;
    ${unsafeCSS(set('-r'))}
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* TAB-28: in a row whose tabs scroll, a sideways drag from the selected tab is the indicator's, not the scroll's. */
  .tab.selected {
    touch-action: pan-y pinch-zoom;
  }
  /* TAB-18, TAB-9: the container — hover, focus and press, and the ripple, clipped to it — in the indicator's box:
     track.padding in from the row's top and bottom, centred in the tab, as wide as the tab's content plus
     active-indicator.padding-inline on each side and exactly as wide as it is tall where that content is not wider than
     it is tall (--_bw, measured by the tab; the whole tab until then), and the tab's whole share in a row that fills.
     Its corners are container.shape. It lies above the track and under the indicator, and answers no pointer itself:
     the whole tab does. TAB-4: the ring's box is the same one, drawn above the indicator and under the underline. */
  .box,
  .ring {
    position: absolute;
    inset-block: ${t('track-padding')};
    inset-inline-start: calc(50% - var(--_bw, 100%) / 2 + (var(--_lean-start, 0px) - var(--_lean-end, 0px)) / 2);
    inline-size: var(--_bw, 100%);
    pointer-events: none;
    ${unsafeCSS(cornerRadius('--tanrei-comp-tabs-container-shape'))}
  }
  .tab.fill :is(.box, .ring) {
    inset-inline: 0;
    inline-size: auto;
  }
  .box {
    /* Its own stacking context, so the ripple sits above the container color. */
    isolation: isolate;
    background: var(--_c);
    transition: background-color ${unsafeCSS(STATE_MOTION)};
  }
  /* TAB-18: on the selected tab the container — hover, focus, press and the ripple, in the selected parts, whose state
     layer is the covered content's color — lies over the active indicator, so the states show there too; the ring and
     the underline stay above it, in the order they are written. */
  .tab.selected :is(.box, .ring, .underline) {
    z-index: 1;
  }
  /* TAB-18, TAB-44: at least the container height of the row's size tall (height-with-icon for a medium primary tab
     that stacks its icon above its label); every tab is as tall as the row (the row stretches them). TAB-5: at least
     the minimum target wide, in layout — tabs touch their neighbours, so the tab itself grows. The height is not met
     in layout: a row lower than the target (the small size) stays as low as it is, and the row answers a press above
     and below it (tabs.ts, \`onPressBeside\`). */
  .tab {
    min-block-size: ${S('height')};
    min-inline-size: calc(max(var(--tanrei-sys-target-pointer), var(--_th, 0px)) - var(--_trim, 0px));
  }
  /* TAB-51: in a column the tabs touch above and below, so each is at least the minimum target tall in layout. */
  .tab.vertical {
    min-block-size: max(${S('height')}, var(--tanrei-sys-target-pointer));
  }
  @media (pointer: coarse) {
    .tab.vertical {
      min-block-size: max(${S('height')}, var(--tanrei-sys-target-touch));
    }
  }
  /* TAB-18: a primary tab with an icon and a drawn label (.stacked) stacks them as the size's icon.placement says:
     stacked, the first value and so what an unknown name draws, unless it is inline. */
  .tab.stacked {
    min-block-size: ${t('container-height-with-icon')};
  }
  @media (pointer: coarse) {
    .tab {
      min-inline-size: calc(max(var(--tanrei-sys-target-touch), var(--_th, 0px)) - var(--_trim, 0px));
    }
  }

  /* TAB-16, TAB-18: the content keeps active-indicator.padding-block between itself and the indicator's top and bottom
     edges, so the row grows to hold its tallest content inside the indicator. A primary tab stacks its icon above its
     label; a secondary one puts it before the label, centred on its line. */
  .content {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    justify-content: center;
    gap: ${t('container-gap')};
    min-inline-size: 0;
    padding-block: ${S('indicator-padding-block')};
  }
  .tab.stacked .content {
    flex-direction: column;
  }
  /* TAB-18: …unless the size's icon.placement is inline: the icon before the label, the row its size's height. */
  ${whenChosen('--_size-icon-placement', '.tab.stacked', 'placement', 'inline', (tab) => `${tab} {\n    min-block-size: ${S('height')};\n  }\n  ${tab} .content {\n    flex-direction: row;\n  }`)}
  /* TAB-16: the indicator's width where the content is wider than it is tall — the content plus
     active-indicator.padding-inline on each side, centred on it — and its corner. It draws nothing: the tab measures it
     (and keeps the box within the tab). */
  .plate {
    position: absolute;
    inset-block: 0;
    inset-inline: calc(-1 * ${S('indicator-padding-inline')});
    border-radius: var(--_s);
    visibility: hidden;
    pointer-events: none;
  }
  /* TAB-14: one line, never wrapped or broken within a word; a tab that shares the row truncates its label with an
     ellipsis. The icon never shrinks for it. TAB-33, TAB-21: the label, in both of its copies, is its own run in the
     direction of its first strong character (src/styles/product-text.ts), so it keeps its order in a right-to-left
     row and is cut at the end of ITS direction — a left-to-right label at its right end, never at its beginning. */
  ${productText('.label, .text')}
  .label {
    display: grid;
    flex: 0 1 auto;
    min-inline-size: 0;
    max-inline-size: 100%;
    overflow: hidden;
    white-space: nowrap;
    color: var(--_l);
    transition:
      color ${unsafeCSS(STATE_MOTION)},
      font-weight ${unsafeCSS(STATE_MOTION)};
  }
  .text {
    grid-area: 1 / 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }
  /* TAB-50, TAB-16: the selected label gains its variant's selected.label.emphasis of weight; every label keeps the room
     it needs at that weight — the label once more, at the heavier weight, unseen and of no height, in the same cell —
     so no tab, indicator or container changes width when the selection moves. */
  .tab.selected .label {
    font-weight: calc(${t('label-typescale-font-weight')} + var(--_emph, 0));
  }
  .label::after {
    content: attr(data-label);
    content: attr(data-label) / '';
    grid-area: 1 / 1;
    block-size: 0;
    overflow: hidden;
    font-weight: calc(${t('label-typescale-font-weight')} + max(0, var(--_emph, 0)));
    visibility: hidden;
    pointer-events: none;
  }

  /* TAB-24: the covered layer — the indicator's piece on this tab, in the indicator's color, with the covered copy of the
     icon and label over it in the covered colors of the tab's look — clipped to the indicator's current shape. The row
     writes the clip (inset(… round <corner>)), and the same shape cut out of the plain content (path(evenodd, …)), so
     under a translucent indicator nothing is drawn twice; until it does, and while no tab is selected, the layer draws
     nothing. A clip, not a blend mode: the colors are the tokens'. */
  .cover {
    position: absolute;
    inset: 0;
    background: var(--_pill);
    clip-path: inset(50%);
    pointer-events: none;
    transition: background-color ${unsafeCSS(STATE_MOTION)};
  }
  .cover .label {
    color: var(--_cl);
  }
  /* TAB-16: the underline's piece on the tab's bottom edge (the row's), above the divider, underline.thickness thick; the
     row clips it to the selected tab's content (primary) or the whole tab (secondary), the corners that face away from
     the divider rounded by underline.shape. */
  .underline {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: var(--_ut);
    background: var(--_line);
    clip-path: inset(50%);
    pointer-events: none;
    transition: background-color ${unsafeCSS(STATE_MOTION)};
  }
  /* TAB-51, TAB-52: in a column the content starts at the tab's start edge, and the container and the ring are the tab
     less track.padding on every side; nothing of an end tab reaches beyond the track (TAB-34 is the row's). TAB-53: the
     underline's piece lies on the column's end edge, as tall as the tab. */
  .tab.vertical,
  .tab.vertical .cover {
    justify-content: flex-start;
  }
  .tab.vertical .text {
    text-align: start;
  }
  .tab.vertical :is(.box, .ring) {
    inset: ${t('track-padding')};
    inline-size: auto;
  }
  .tab.vertical.first::before,
  .tab.vertical.last::after {
    content: none;
  }
  .tab.vertical .underline {
    inset-block: 0;
    inset-inline: auto 0;
    block-size: auto;
    inline-size: var(--_ut);
  }
  /* TAB-57: no touch drags the indicator along a column: a touch scrolls. */
  .tab.vertical.selected {
    touch-action: auto;
  }
  /* TAB-25: the plain tooltip of a truncated label lies over the whole tab, drawing nothing, so the pointer over the tab
     is over it. */
  .tip {
    position: absolute;
    inset: 0;
    display: block;
  }

  /* TAB-3, TAB-6, TAB-8, TAB-9: each state paints from that state's tokens of the tab's look; pressed > focused > hovered,
     disabled over all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens on the
     whole container; ripple and dim paint everything else from them while the container color stays with the state
     under the press; none paints nothing. */
  ${stateRules(on, {
    hovered: `${set('-h')}
    opacity: ${T('hovered-opacity')};`,
    focused: `${set('-f')}
    opacity: ${T('focused-opacity')};`,
    pressed: `${set('-p')}
    opacity: ${T('pressed-opacity')};`,
    pressedContent: `${set('-p', 'c')}
    opacity: ${T('pressed-opacity')};`,
    disabled: `
    cursor: default;${set('-d')}
    opacity: ${T('disabled-opacity')};`,
  })}
  .tab[data-pressed]:not([data-pressed='none']) :is(.box, .label, .icon, .cover, .underline) {
    transition-duration: 0s;
  }
  /* TAB-23, TAB-38: a tab that appears, and a tab of a row that follows its group's choice or one restored from storage,
     changes its colors at once — the row marks it for the frame that draws the change. */
  .tab[data-still],
  .tab[data-still] :is(.box, .label, .icon, .cover, .underline) {
    transition-duration: 0s;
  }

  /* TAB-9 ripple: grows over comp.tabs.motion.feedback-duration and fades over motion.state-duration, both with
     motion.state-easing. */
  ${rippleStyles({
    color: '--_c-p',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}

  /* TAB-4, TAB-10: the ring (or the glow) around the container, concentric and in its shape, sys.focus.offset outside
     it, and held inside the track: where track.padding is less than the ring reaches it is drawn further in by the
     difference. For keyboard focus only, never animated; drawn over the covered layer and the neighbouring tabs. */
  ${focusRing((focus) => `:host(${focus}) .ring`, { within: T('track-padding') })}

  /* TAB-10: corner smoothing on the container and the ring (data-tanrei-shape). */
  ${shape}

  /* TAB-18: the icon, drawn with the system's icon set in the family and fill of the tab's selection. TAB-32: iconGlyph()
     mirrors the glyph GlyphMirrorController marked, in both copies, in right-to-left, in its own box. */
  ${iconGlyph('.icon', { size: '--_size-icon', selected: '.tab.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .icon {
    flex: none;
    color: var(--_i);
    transition:
      color ${unsafeCSS(STATE_MOTION)},
      font-variation-settings ${unsafeCSS(STATE_MOTION)};
  }
  .cover .icon {
    color: var(--_ci);
  }

  /* TAB-8: the content carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.content')}

  @media (prefers-reduced-motion: reduce) {
    .tab,
    .box,
    .label,
    .icon,
    .cover,
    .underline {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .cover,
    .underline {
      forced-color-adjust: none;
      background: Highlight;
    }
    .cover :is(.label, .icon) {
      color: HighlightText;
    }
    .tab.p.d :is(.label, .icon) {
      color: GrayText;
    }
    .tab.pill-disabled :is(.cover, .underline) {
      background: GrayText;
    }
  }
`;

/**
 * A tab panel (TAB-13, TBV-9, TBV-10): shown only while its tab is selected; a Tab stop itself when it holds nothing
 * focusable. A panel of a `<tanrei-tab-view>` (`.inside`) draws its ring inside its edge — the view clips what is drawn
 * outside it — with its corners following comp.tab-view.container.shape; the tabs' own panel draws it around its edge.
 */
export const panelStyles = css`
  :host {
    display: block;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  .panel {
    position: relative;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  .panel.inside {
    box-sizing: border-box;
    min-block-size: 100%;
    ${unsafeCSS(cornerRadius('--tanrei-comp-tab-view-container-shape'))}
  }
  ${focusRing((focus) => `:host(${focus}) .panel:not(.inside)`)}
  ${focusRing((focus) => `:host(${focus}) .panel.inside`, { inside: true })}
  ${shape}
`;

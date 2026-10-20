import { css, unsafeCSS } from 'lit';
import { directionProbeStyles, focusRing, whenChosen } from '../../primitives/index.js';
import { hiddenHost } from '../../primitives/hidden.js';

/** The edges a scroll area can watch (SCA-2); start and end follow the layout direction (SCA-13). */
export const EDGES = ['top', 'bottom', 'start', 'end'] as const;
export type Edge = (typeof EDGES)[number];
/** `sys.behavior.scroll-edge`, in the order of its token: the first is what an unknown name draws (SCA-7, SCA-9). */
export const FORMS = ['shadow', 'fade', 'line', 'blur'] as const;
/** The `scrollEdge` prop: `auto` takes the component token; `none` is the instance's only. */
export const SCROLL_EDGES = ['auto', ...FORMS, 'none'] as const;

const PREFIX = '--tanrei-comp-scroll-area';
/** The private property the attribute and the component token meet in (as `--_separation` does for separation). */
export const CHOICE = '--_scroll-edge';
/** The blur's layer count, read by the script to render that many layers (SCA-6). */
export const LAYERS = `${PREFIX}-blur-layers`;

const T = (name: string) => `var(${PREFIX}-${name})`;

/** The form's rules: a style query on `--_scroll-edge`, and `data-scroll-edge` on the frame where a browser has none. */
const when = (form: string, rules: (frame: string) => string) => whenChosen(CHOICE, '.frame', 'scroll-edge', form, rules);

/** The selector of a drawn edge's part while content lies beyond that edge: `data-<edge>` on the frame. */
const beyond = (part: string) => EDGES.map((edge) => `.frame[data-${edge}] .edge.${edge} ${part}`).join(',\n  ');

// Every visual value is a token (tokens/comp/scroll-area.tokens.json). The area draws no fill, edge, corner or elevation
// of its own (SCA-1): what it draws is the mark at each edge it watches while content lies beyond it (SCA-2), in one of
// four forms (SCA-3…6), and the keyboard focus of its box (SCA-11).
//
//   :host            a flex column, as large as its layout gives it; never larger than its content asks
//   .frame           the positioning box of the marks and the ring; carries data-<edge> while content lies beyond
//   .scroll          the scroll box (part container): the platform's own scrolling and scroll bars; the fade's mask
//   .content         the content at the box's width, wider where a row of it cannot wrap; the four sentinels
//   .edge            one per watched edge, over the box and inside its scroll bars: the band (.band) of the shadow and
//                    the line, and the blur's layers (.layer)
//   .ring            the focus indicator, over every mark and never masked by the fade
export const styles = [
  directionProbeStyles,
  css`
    /* SCA-1: as large as its layout gives it. A flex column, so that a height, a max-height or a share of a flex or
       grid track given to the host is the box's; overflow: hidden makes its least size in a flex or grid track 0, as a
       native scroll box's is, so that it shrinks and scrolls rather than growing with its content. Nothing is drawn
       outside the box. */
    :host {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      ${unsafeCSS(CHOICE)}: ${unsafeCSS(T('scroll-edge'))};
      --_dur: ${unsafeCSS(T('motion-duration'))};
      --_ease: ${unsafeCSS(T('motion-easing'))};
    }
    ${unsafeCSS(SCROLL_EDGES.filter((value) => value !== 'auto').map((value) => `:host([scroll-edge='${value}']) {\n      ${CHOICE}: ${value};\n    }`).join('\n    '))}

    .frame {
      position: relative;
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-block-size: 0;
      /* SCA-2: each edge 0 or 1 — content beyond it (named and drawn) or not; the fade moves its mask by them. */
      --_top: 0;
      --_bottom: 0;
      --_start: 0;
      --_end: 0;
      --_depth: ${unsafeCSS(T('shadow-extent'))};
    }
    ${unsafeCSS(EDGES.map((edge) => `.frame[data-${edge}] {\n      --_${edge}: 1;\n    }`).join('\n    '))}

    /* SCA-1: the platform's own scrolling — wheel, trackpad, touch, scroll bars, keyboard while it has focus — in each
       direction the content does not fit. No fill, edge or corner. */
    .scroll {
      flex: 1 1 auto;
      min-block-size: 0;
      display: flex;
      align-items: flex-start;
      overflow: auto;
      outline: none;
      /* SCA-4: the fade's mask, laid out in every form so that a change of form moves nothing (SCA-7): one gradient per
         edge, each a band fade.extent deep beyond the box's edge until content lies beyond that edge, when it is moved
         in. Only the fade form draws the image. */
      --_e: ${unsafeCSS(T('fade-extent'))};
      --_left: var(--_start);
      --_right: var(--_end);
      mask-repeat: no-repeat;
      mask-size:
        100% calc(100% + var(--_e)),
        100% calc(100% + var(--_e)),
        calc(100% + var(--_e)) 100%,
        calc(100% + var(--_e)) 100%;
      mask-position:
        0 calc((var(--_top) - 1) * var(--_e)),
        0 calc(var(--_bottom) * -1 * var(--_e)),
        calc((var(--_left) - 1) * var(--_e)) 0,
        calc(var(--_right) * -1 * var(--_e)) 0;
      mask-composite: intersect;
    }
    :host(:dir(rtl)) .scroll {
      --_left: var(--_end);
      --_right: var(--_start);
    }

    /* SCA-1: laid out at the box's width — a paragraph wraps there — and wider only where a row cannot wrap (its least
       width), which the box then scrolls sideways. */
    .content {
      position: relative;
      flex: 1 1 auto;
    }

    /* SCA-8: a mark at each end of the content; one IntersectionObserver on the box says when one leaves or enters it. */
    .sentinel {
      position: absolute;
      pointer-events: none;
    }
    .sentinel.top,
    .sentinel.bottom {
      inset-inline: 0;
      block-size: 1px;
    }
    .sentinel.top {
      inset-block-start: 0;
    }
    .sentinel.bottom {
      inset-block-end: 0;
    }
    .sentinel.start,
    .sentinel.end {
      inset-block: 0;
      inline-size: 1px;
    }
    .sentinel.start {
      inset-inline-start: 0;
    }
    .sentinel.end {
      inset-inline-end: 0;
    }

    /* SCA-2, SCA-12: an edge's mark over the content, along the whole edge inside the box and its scroll bars (whose
       sizes the script writes as --_bar-*), hidden from assistive technology and taking no input. SCA-13: start is the
       left in left-to-right and the right in right-to-left; each form is drawn the same toward its own edge. */
    .edge {
      position: absolute;
      pointer-events: none;
    }
    .edge.top,
    .edge.bottom {
      left: var(--_bar-left, 0);
      right: var(--_bar-right, 0);
      height: var(--_depth);
    }
    .edge.top {
      top: 0;
      --_in: to bottom;
    }
    .edge.bottom {
      bottom: var(--_bar-bottom, 0);
      --_in: to top;
    }
    .edge.start,
    .edge.end {
      top: 0;
      bottom: var(--_bar-bottom, 0);
      width: var(--_depth);
    }
    .edge.start {
      left: var(--_bar-left, 0);
      --_in: to right;
    }
    .edge.end {
      right: var(--_bar-right, 0);
      --_in: to left;
    }
    :host(:dir(rtl)) .edge.start {
      left: auto;
      right: var(--_bar-right, 0);
      --_in: to left;
    }
    :host(:dir(rtl)) .edge.end {
      right: auto;
      left: var(--_bar-left, 0);
      --_in: to right;
    }

    /* SCA-3, shadow (the plain rules: the first form, and what an unknown name draws): a band shadow.extent deep in
       shadow.color — the surface the area stands on — full at the edge, none at its inner end. No line. SCA-8: faded in
       and out by its opacity over motion.duration with motion.easing. */
    .band {
      position: absolute;
      inset: 0;
      opacity: 0;
      background: linear-gradient(var(--_in), ${unsafeCSS(T('shadow-color'))}, transparent);
      transition: opacity var(--_dur) var(--_ease);
    }
    ${unsafeCSS(beyond('.band'))} {
      opacity: 1;
    }

    /* SCA-6: the blur's layers, drawn only by the blur form. Each blurs what lies behind it by blur.radius × i / n and
       is masked to its step of the band — full at its own depth, none a step either side — so that the radius falls
       from blur.radius at the edge to none at the inner end with no step seen. Each layer fades by its own opacity: an
       opacity on a box around them would make that box their backdrop's root, and they would blur nothing while it
       fades. */
    .layer {
      display: none;
      position: absolute;
      inset: 0;
      opacity: 0;
      --_step: calc(var(--_depth) / var(--_n));
      --_at: calc((var(--_n) - var(--_i)) * var(--_step));
      backdrop-filter: blur(calc(${unsafeCSS(T('blur-radius'))} * var(--_i) / var(--_n)));
      mask-image: linear-gradient(var(--_in), transparent calc(var(--_at) - var(--_step)), black var(--_at), transparent calc(var(--_at) + var(--_step)));
      transition: opacity var(--_dur) var(--_ease);
    }
    ${unsafeCSS(beyond('.layer'))} {
      opacity: 1;
    }

    /* SCA-11: the focus indicator inside the box's edge, over every mark and never faded by one (the fade masks the box,
       not this), without animation, for keyboard focus only. The area has no corner of its own. */
    .ring {
      position: absolute;
      inset: 0;
      pointer-events: none;
      --tanrei-corner-radius: var(--tanrei-sys-shape-corner-none);
      --tanrei-corner-pill: 0;
    }
    /* SCA-8: the marks change at once where motion is reduced. */
    @media (prefers-reduced-motion: reduce) {
      :host {
        --_dur: 0s;
      }
    }
  `,
  focusRing((focus) => `.scroll${focus} ~ .ring`, { inside: true }),

  // SCA-5, line: a line line.width thick in line.color along the edge, inside the box.
  when('line', (frame) => `${frame} {
    --_depth: ${T('line-width')};
  }
  ${frame} .band {
    background: ${T('line-color')};
  }`),

  // SCA-4, fade: the content itself fades toward the edge, none of it at the edge and all of it fade.extent in; no
  // color, no line — the scroll bar fades with it. The mask moves (mask-position) over the motion of SCA-8.
  when('fade', (frame) => `${frame} .edge {
    display: none;
  }
  ${frame} .scroll {
    mask-image:
      linear-gradient(to bottom, transparent, black var(--_e)),
      linear-gradient(to top, transparent, black var(--_e)),
      linear-gradient(to right, transparent, black var(--_e)),
      linear-gradient(to left, transparent, black var(--_e));
    transition: mask-position var(--_dur) var(--_ease);
  }`),

  // SCA-6, blur: blur.layers layers in a band blur.extent deep, no line and no tint. SCA-9: a browser without backdrop
  // filters draws the shadow (the plain rules) in its place.
  unsafeCSS(`@supports (backdrop-filter: blur(1px)) {
${when('blur', (frame) => `${frame} {
    --_depth: ${T('blur-extent')};
  }
  ${frame} .band {
    display: none;
  }
  ${frame} .layer {
    display: block;
  }`).cssText}
}`),

  // SCA-2: none draws nothing at any edge.
  when('none', (frame) => `${frame} .edge {
    display: none;
  }`),

  css`
    /* SCA-9: with a person's own forced colors every form is the line of SCA-5, in the text color. */
    @media (forced-colors: active) {
      :host .frame {
        --_depth: var(--tanrei-comp-scroll-area-line-width);
      }
      :host .frame .scroll {
        mask-image: none;
      }
      :host .frame .edge {
        display: block;
      }
      :host .frame .band {
        display: block;
        background: CanvasText;
        forced-color-adjust: none;
      }
      :host .frame .layer {
        display: none;
      }
    }
  `,
  unsafeCSS(`@media (forced-colors: active) {
${when('none', (frame) => `:host ${frame} .edge {
    display: none;
  }`).cssText}
}`),
  hiddenHost,
];

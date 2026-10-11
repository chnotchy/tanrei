import { css } from 'lit';

/** The values the divider defines (DIV-7). None is a token axis: a design system restyles the line, not its forms. */
export const ORIENTATIONS = ['horizontal', 'vertical'] as const;
export const INSETS = ['none', 'start', 'both'] as const;
export const LINE_STYLES = ['solid', 'dotted', 'dashed', 'wavy'] as const;
export const LINE_CAPS = ['butt', 'round'] as const;

// Every visual value is a token (tokens/comp/divider.tokens.json): the line's color and thickness, the length it is
// shortened by, and the lengths of the dots, the dashes and the wave. The host is the whole length of the line and takes
// exactly the thickness across it (DIV-2); the line is an absolutely positioned child, so an inset shortens what is
// drawn and never what the layout sees (DIV-3).
//
// The line is a BORDER, not a background (DIV-8): engines snap a border's width to whole device pixels — at least one —
// and its edges to the device pixel grid, so a 1px line on a 2× screen is exactly two device rows wherever the layout
// puts it, and a hairline thinner than a device pixel is still drawn whole. A border is also what forced-colors mode keeps (it repaints it in the
// system's text color), where a background would be dropped. Firefox snaps a border's edges to the grid only on a
// transformed box (measured: a 1px border at a +0.3px offset paints a half-covered row without it), hence the identity
// translate, which creates no layer.
//
// A dotted or dashed line is the same border under a mask (DIV-10, DIV-11), so it keeps the grid, the color and forced
// colors. The component lays the dashes out (a dot is a dash `line.thickness` long) and writes them as one SVG mask
// image the size of the line: a repeated tile cannot place them, because `mask-repeat: space` spaces whole CSS pixels
// only in WebKit (the last dash falls short of the end) and every engine rounds a fractional tile to device pixels (the
// pitch drifts along the line). A round cap (DIV-13) is the mask's stroke cap, inside each dash's length. A solid line
// with round caps is masked by two discs and the rectangle between them. A mask is alpha only: its black and
// transparent are not colors of the design.
//
// A wavy line is an SVG path of circular arcs laid out by the component (DIV-12); CSS gives it its cross size, color
// and cap, and mirrors it in RTL (DIV-4).
//
// The lengths a divider is given (thickness, insetLength, dashLength, gap, amplitude, wavelength) arrive as `--_given-*`
// from the component's own sheet, after this one; `initial` here makes each one take its token. `--_thickness` is the
// line's thickness resolved once — the one given, else the token — and everything that reads the thickness reads it
// (DIV-16). `--_scale` arrives the same way while a thickness is given: that thickness over the token's, a number, by
// which every pattern length that comes from a token (not from a prop) is multiplied, so the pattern keeps the
// proportions the tokens give it. The inset is not scaled.
export const styles = css`
  :host {
    --_given-thickness: initial;
    --_scale: initial;
    --_given-inset: initial;
    --_given-dash: initial;
    --_given-gap: initial;
    --_given-amplitude: initial;
    --_given-wavelength: initial;
    --_thickness: var(--_given-thickness, var(--tanrei-comp-divider-line-thickness));
    --_inset: var(--_given-inset, var(--tanrei-comp-divider-line-inset));
    --_amplitude: var(--_given-amplitude, calc(var(--tanrei-comp-divider-line-wave-amplitude) * var(--_scale, 1)));
    --_wavelength: var(--_given-wavelength, calc(var(--tanrei-comp-divider-line-wave-wavelength) * var(--_scale, 1)));
    --_start: 0px;
    --_end: 0px;
    display: block;
    position: relative;
    box-sizing: border-box;
    flex: none;
    /* DIV-2: no margin or padding of its own; the space around the line belongs to the layout. */
    margin: 0;
    padding: 0;
    /* DIV-1, horizontal (the default, and what an unknown orientation draws — DIV-7): the full inline size of the
       container — in block flow as any block does, in a flex column and a grid by stretching. */
    align-self: stretch;
    justify-self: stretch;
    block-size: var(--_thickness);
  }
  :host([hidden]) {
    display: none;
  }
  /* DIV-1, vertical: the full block size of the container (a flex row or a grid stretches it), the thickness across. */
  :host([orientation='vertical']) {
    justify-self: auto;
    inline-size: var(--_thickness);
    block-size: auto;
  }

  /* DIV-3: the inset stretch draws nothing. */
  :host([inset='start']) {
    --_start: var(--_inset);
  }
  :host([inset='both']) {
    --_start: var(--_inset);
    --_end: var(--_inset);
  }

  .line {
    position: absolute;
    box-sizing: border-box;
    transform: translate(0);
    /* Horizontal: along the inline axis, so an RTL layout puts the start inset at the right end (DIV-4). */
    inset-block-start: 0;
    inset-inline-start: var(--_start);
    inset-inline-end: var(--_end);
    block-size: 0;
    border-block-start: var(--_thickness) solid var(--tanrei-comp-divider-line-color);
  }
  /* Vertical: along the block axis — the top first, whatever the direction (DIV-4). */
  :host([orientation='vertical']) .line {
    inset-block: var(--_start) var(--_end);
    inset-inline-start: 0;
    inset-inline-end: auto;
    block-size: auto;
    inline-size: 0;
    border-block-start: none;
    border-inline-start: var(--_thickness) solid var(--tanrei-comp-divider-line-color);
  }

  /* DIV-13, solid: a disc at each end and the rectangle between them, inside the line's length. */
  :host([line-cap='round']:not([line-style='dotted'], [line-style='dashed'], [line-style='wavy'])) .line {
    --_r: calc(var(--_thickness) / 2);
    --_dir: to right;
    --_at-start: var(--_r) 50%;
    --_at-end: calc(100% - var(--_r)) 50%;
    mask-image:
      linear-gradient(var(--_dir), transparent var(--_r), black 0 calc(100% - var(--_r)), transparent 0),
      radial-gradient(circle var(--_r) at var(--_at-start), black calc(100% - 0.25px), transparent calc(100% + 0.25px)),
      radial-gradient(circle var(--_r) at var(--_at-end), black calc(100% - 0.25px), transparent calc(100% + 0.25px));
    mask-size: 100% 100%;
    mask-repeat: no-repeat;
  }
  :host([line-cap='round'][orientation='vertical']:not([line-style='dotted'], [line-style='dashed'], [line-style='wavy'])) .line {
    --_dir: to bottom;
    --_at-start: 50% var(--_r);
    --_at-end: 50% calc(100% - var(--_r));
  }

  /* DIV-10, DIV-11: the least gap of the style drawn; the dashes are the component's mask (--_pattern). Until it is laid
     out, nothing is drawn. */
  :host([line-style='dotted']) {
    --_gap: var(--_given-gap, calc(var(--tanrei-comp-divider-line-dot-gap) * var(--_scale, 1)));
  }
  :host([line-style='dashed']) {
    --_gap: var(--_given-gap, calc(var(--tanrei-comp-divider-line-dash-gap) * var(--_scale, 1)));
  }
  :host([line-style='dotted']) .line,
  :host([line-style='dashed']) .line {
    mask-image: var(--_pattern, linear-gradient(transparent, transparent));
    mask-size: 100% 100%;
    mask-repeat: no-repeat;
  }

  /* DIV-2, DIV-12: a wavy divider is twice the amplitude it is given plus the thickness across, whatever its length. */
  :host([line-style='wavy']) {
    block-size: calc(2 * var(--_amplitude) + var(--_thickness));
  }
  :host([line-style='wavy'][orientation='vertical']) {
    inline-size: calc(2 * var(--_amplitude) + var(--_thickness));
    block-size: auto;
  }
  .wave {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .wave path {
    fill: none;
    stroke: var(--tanrei-comp-divider-line-color);
    stroke-linecap: butt;
  }
  :host([line-cap='round']) .wave path {
    stroke-linecap: round;
  }
  /* DIV-4: a horizontal wave starts at the inline start — the right end in RTL — mirrored; a vertical one never turns. */
  :host(:dir(rtl):not([orientation='vertical'])) .wave {
    transform: scaleX(-1);
  }
  /* What the component reads the lengths it lays out from, resolved (a token is an expression, not a number): the
     thickness drawn, the pattern lengths as given or as scaled (DIV-16), and — last — the token's own thickness, which
     the scale is taken over. Not rendered, so it neither takes room nor overflows. */
  .probe {
    display: none;
    padding: var(--_amplitude) var(--_end) var(--_wavelength) var(--_start);
    margin: var(--_thickness) var(--_given-dash, calc(var(--tanrei-comp-divider-line-dash-length) * var(--_scale, 1))) var(--_gap, 0px)
      var(--tanrei-comp-divider-line-thickness);
  }

  @media (forced-colors: active) {
    .wave path {
      stroke: CanvasText;
    }
  }
`;

import { type TemplateResult, html, svg } from 'lit';

/**
 * A control that keeps its place, its size and the person's focus while the action it started is under way: a busy
 * Button (BTN-36, BTN-37), the leading half of a busy button with menu (SPB-39, SPB-40). Its label and its glyphs stay
 * laid out and are not drawn, fading out as it becomes busy and back in as it stops; the loading indicator's arc (LDG-1)
 * turns at the centre of its container, appearing and going at once, and under reduced motion it is LDG-4's whole
 * circle, its opacity easing once per cycle; and what it says to assistive technology is said once, politely, through a
 * status region that exists only while it is busy.
 *
 * Each piece takes the component's own selectors and the NAMES of its own tokens; nothing here knows which component
 * uses it. The component draws the arc (`busyArc()`) inside its busy container, which is positioned, and the region
 * (`busyStatus()`) beside it, both only while it is busy, and calls `announceBusy()` when it becomes busy.
 */
export interface BusyParts {
  /** The busy container: the control's own element with the class it carries while busy (`button.busy`). */
  on: string;
  /** The label: laid out and transparent while busy (it is still the control's name), its opacity fading over `fade`. */
  label: string;
  /**
   * The glyph boxes: laid out and hidden while busy, once they have faded. Their fade is `iconGlyph()`'s `fade`, which
   * the component gives the same duration: a box's own transition, so that it is drawn again from the start of its way
   * back.
   */
  glyphs: string;
  /** The custom property NAME of the arc's box: the icon size the control draws. */
  ring: string;
  /** The token NAMES of the arc's stroke, of one turn of it, of the fade, and of the fade's easing. */
  thickness: string;
  cycle: string;
  fade: string;
  easing: string;
}

// The arc is the loading indicator's: a quarter of the circle, its ends round, turning once per cycle. The region is
// fixed to the window, so that the host needs no containing block of its own and the region widens no scroll box it
// stands in. (No comment goes inside the strings: they ship as written.)
/** The rules of a busy control, for a component's stylesheet (`unsafeCSS(busyStyles(…))`). */
export function busyStyles(p: BusyParts): string {
  return `
  ${p.on} {
    cursor: default;
  }
  ${p.label} {
    transition: opacity var(${p.fade}) var(${p.easing});
  }
  ${p.on} ${p.label} {
    opacity: 0;
  }
  ${p.glyphs
    .split(',')
    .map((glyph) => `${p.on} ${glyph.trim()}`)
    .join(',\n  ')} {
    opacity: 0;
    visibility: hidden;
  }
  .busy-arc {
    --_ring: var(${p.ring});
    --_stroke: var(${p.thickness});
    position: absolute;
    inset: 0;
    margin: auto;
    inline-size: var(--_ring);
    block-size: var(--_ring);
    pointer-events: none;
    animation: busy-turn var(${p.cycle}) var(--tanrei-sys-motion-easing-linear) infinite;
  }
  .busy-arc svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    transform: rotate(-90deg);
  }
  .busy-arc circle {
    --_c: calc(pi * (var(--_ring) - var(--_stroke)));
    cx: 50%;
    cy: 50%;
    r: calc(50% - var(--_stroke) / 2);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--_stroke);
    stroke-linecap: round;
    stroke-dasharray: max(0px, calc(var(--_c) / 4 - var(--_stroke))) var(--_c);
    stroke-dashoffset: calc(var(--_stroke) / -2);
  }
  @keyframes busy-turn {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }
  @keyframes busy-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  .live {
    position: fixed;
    inset-block-start: 0;
    inset-inline-start: 0;
    overflow: hidden;
    inline-size: 1px;
    block-size: 1px;
    clip-path: inset(50%);
    white-space: nowrap;
  }`;
}

/**
 * The reduced form, for the component's `reducedMotion()` block: the label is drawn again, and stops being drawn, at
 * once (the glyph boxes too: `iconGlyph()` turns their transition off), and the arc is LDG-4's whole circle, not
 * turning, its opacity easing once per cycle.
 */
export function busyReducedStyles(p: BusyParts): string {
  return `
  ${p.label} {
    transition: none;
  }
  .busy-arc {
    animation: busy-pulse var(${p.cycle}) var(--tanrei-sys-motion-easing-standard) infinite;
  }
  .busy-arc circle {
    stroke-dasharray: none;
    stroke-dashoffset: 0;
  }`;
}

/** The arc, drawn inside the busy container while it is busy; hidden from assistive technology. */
export const busyArc = (): TemplateResult => html`<span class="busy-arc" aria-hidden="true">${svg`<svg focusable="false"><circle></circle></svg>`}</span>`;

/** The polite region the busy words are announced through, drawn nowhere; rendered only while the control is busy. */
export const busyStatus = (): TemplateResult => html`<span class="live" role="status"></span>`;

/**
 * Announces `words` once, politely, without moving focus: the region exists only while the control is busy (a status
 * region on every control would be one in every list of the page's regions), so the words are put in a frame after it
 * was, where a screen reader hears a change — and only if the control is still busy then (`still()`). Nothing is said
 * when it ends: what the action did is the product's to say.
 */
export function announceBusy(root: ParentNode | null | undefined, words: string, still: () => boolean): void {
  requestAnimationFrame(() => {
    const status = root?.querySelector<HTMLElement>('.live');
    if (status && still()) status.textContent = words;
  });
}

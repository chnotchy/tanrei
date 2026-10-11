import { css, unsafeCSS } from 'lit';
import { heldFocusGlow } from '../../primitives/focus-ring.js';
import { heldRadius, heldShape } from '../../styles/shape.js';

// What the chat composer draws itself and how it arranges what it holds (tokens/comp/chat-composer.tokens.json): the
// capsule — its fill, its lift, its edge and its corners, in two conditions and four states, and while files are
// dragged over it — the places of its members, the strip of attachments, and the counter. The typing, every File item
// and every Button are drawn by their own elements from their own tokens.
//
// Nothing here writes a custom property or reads a token of a member: the capsule
// holds its members, and a custom property on it would be inherited by each of them. So every state is written out
// from its own tokens, and the one length the stylesheet cannot know — a line of the typing area's text, which is the
// member's — is measured by the element and written as a rule of its own (`measured()`), never as a property.
const PREFIX = '--tanrei-comp-chat-composer';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
const MOTION = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

/** CCM-41: whether the capsule's shape token is the full step, which is drawn round whatever the smoothing. */
const PILL = `var(${PREFIX}-container-shape-pill, 0)`;

/** CCM-41: the height of a capsule laid out inline with one line of text and no attachment, where one line is `line` high. */
const oneLine = (line: string) => `max(${T('container-height')}, calc(${line} + 2 * ${T('input-padding-block')} + 2 * ${T('container-padding-block')}))`;

/** CCM-41: the capsule's one radius — its shape token, and never more than half the height it has with one line. */
const radius = (line: string) => `min(${T('container-shape')}, calc(${oneLine(line)} / 2))`;

/**
 * CCM-42: where the capsule's glow is read — while the typing area has focus, however it was given — as the focus
 * primitive asks for it: the condition of a style query, or `data-focus-style` where a browser has none.
 */
const focusedCapsule = (focus: string) => (focus === ':focus-visible' ? '.capsule[data-focused]:not([data-disabled])' : ".capsule[data-focus-style='glow'][data-focused]:not([data-disabled])");

/**
 * What depends on one line of the typing area's text (CCM-2, CCM-3, CCM-41), for a line of `line` (a CSS length):
 * the capsule's corners and its glow, which follow the one-line height, and the least height of each group of
 * Buttons, which is the typing area's with one line — so that a Button is centred on a single line and, as lines
 * grow, stays at the bottom edge at the distance it had. The stylesheet has it for a line of no height, which is
 * `container.height` alone; the element writes it again, as a rule of its own, once it has read the member's line.
 */
export const measured = (line: string): string => `
  ${heldShape('.capsule', radius(line), PILL)}
  ${heldFocusGlow(focusedCapsule, { plain: radius(line), eased: heldRadius(radius(line), PILL) }).cssText}
  .group {
    min-block-size: calc(${line} + 2 * ${T('input-padding-block')});
  }`;

/** One state of one condition: the capsule's fill and lift and the group's opacity, and its edge's color and width. */
const state = (on: string, condition: 'standard' | 'error', name: '' | 'hovered' | 'focused' | 'disabled') => {
  const part = (key: string) => T(`${condition}-${name ? `${name}-` : ''}${key}`);
  return `
  .capsule:where(${on}) {
    background-color: ${part('container-color')};
    box-shadow: ${part('container-elevation')};${name ? `\n    opacity: ${T(`${name}-opacity`)};` : ''}
  }
  .capsule:where(${on}) > .outline {
    border-color: ${part('outline-color')};
    border-width: ${T(`${name ? `${name}-` : ''}outline-width`)};
  }`;
};

/** What is drawn nowhere and still read: the live region (CCM-30). It names its place, so it widens nothing (src/scroll-box.test.ts). */
const unseen = `
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 1px;
    block-size: 1px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;`;

export const styles = css`
  :host {
    min-inline-size: 0;
  }

  /* ── The capsule (CCM-1, CCM-41) ── one container behind everything it holds: as wide as its layout gives it, as tall
     as what it holds and never less than container.height; filled and lifted by its condition; its edge drawn inside
     its box (.outline), so that no state moves what it holds. It is the box of the text (CCM-5): the pointer over its
     own ground is a text pointer, and it answers no press. */
  .capsule {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-inline-size: 0;
    min-block-size: ${t('container-height')};
    padding-block: ${t('container-padding-block')};
    background-color: ${t('standard-container-color')};
    box-shadow: ${t('standard-container-elevation')};
    cursor: text;
    transition:
      background-color ${unsafeCSS(MOTION)},
      box-shadow ${unsafeCSS(MOTION)},
      opacity ${unsafeCSS(MOTION)};
  }
  .outline {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: ${t('outline-width')} solid ${t('standard-outline-color')};
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
    transition:
      border-color ${unsafeCSS(MOTION)},
      border-width ${unsafeCSS(MOTION)};
  }

  /* CCM-27, CCM-42: each state paints from that state's tokens of the capsule's condition. Every rule has the resting
     rule's specificity, so their order is the precedence: hovered, then focused — the typing area's focus, which the
     element says (data-focused) — then receiving (CCM-23), then disabled over all; the error condition recolors each. */
  ${unsafeCSS(state('[data-error]', 'error', ''))}
  @media (hover: hover) {
    ${unsafeCSS(state(':hover', 'standard', 'hovered'))}
    ${unsafeCSS(state('[data-error]:hover', 'error', 'hovered'))}
  }
  ${unsafeCSS(state('[data-focused]', 'standard', 'focused'))}
  ${unsafeCSS(state('[data-error][data-focused]', 'error', 'focused'))}
  /* CCM-23: receiving — the capsule's own fill and edge, at its own shape and inside its own box: nothing moves. */
  .capsule:where([data-receiving]) {
    background-color: ${t('receiving-container-color')};
  }
  .capsule:where([data-receiving]) > .outline {
    border-color: ${t('receiving-outline-color')};
    border-width: ${t('receiving-outline-width')};
  }
  ${unsafeCSS(state('[data-disabled]', 'standard', 'disabled'))}
  ${unsafeCSS(state('[data-error][data-disabled]', 'error', 'disabled'))}
  .capsule:where([data-disabled]) {
    cursor: default;
  }

  /* CCM-41: the corners — one radius at every height — the glow of CCM-42 around them, and the groups' least height. */
  ${unsafeCSS(measured('0px'))}

  /* ── The strip (CCM-43) ── the attachments at the top of the capsule, from the start edge, strip.gap apart: a tile
     at its own size beside its neighbours, aligned to the top of its line; a row across a whole line. A full line wraps;
     nothing scrolls sideways, and no item is cut, shrunk or hidden. Only a File item is drawn in it. */
  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: ${t('strip-gap')};
    min-inline-size: 0;
    padding-block-start: ${t('strip-padding-block-start')};
    padding-inline: ${t('container-padding-inline')};
    margin-block-end: ${t('strip-offset')};
  }
  .strip[hidden] {
    display: none;
  }
  .strip > tanrei-file-item,
  .strip ::slotted(tanrei-file-item) {
    flex: 1 0 100%;
    min-inline-size: 0;
    max-inline-size: 100%;
    cursor: default;
  }
  .strip > tanrei-file-item[form='tile'],
  .strip ::slotted(tanrei-file-item[form='tile']) {
    flex: none;
  }
  .strip ::slotted(:not(tanrei-file-item)) {
    display: none;
  }

  /* ── The line being written (CCM-2, CCM-3) ── the typing area takes the room the others leave, with
     input.padding-block above its first line and below its last. Inline it stands between its two groups; stacked,
     before the send button alone. Everything beside it stays at the bottom edge of the line as the text grows. */
  .line {
    display: flex;
    align-items: flex-end;
    min-inline-size: 0;
    padding-inline: ${t('container-padding-inline')} ${t('container-padding-inline-with-button')};
  }
  .line[data-start] {
    padding-inline-start: ${t('container-padding-inline-with-button')};
  }
  .typing {
    flex: 1 1 0;
    min-inline-size: 0;
    padding-block: ${t('input-padding-block')};
  }
  /* A group of Buttons, and the counter among them: centred on one line, actions.gap apart. */
  .group {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('actions-gap')};
    max-inline-size: 100%;
    cursor: default;
  }
  /* container.gap between a group and the typing area; the send button is the last of the group after it. */
  .line > .start {
    margin-inline-end: ${t('container-gap')};
  }
  .line > .end,
  .line > .typing + .send {
    margin-inline-start: ${t('container-gap')};
  }
  .line > .end + .send {
    margin-inline-start: ${t('actions-gap')};
  }

  /* ── The row beneath (CCM-3) ── stacked: everything but the send button, container.row-gap below the line. The
     attach button and the leading actions from its start, wrapping onto further lines where the row is too short;
     the counter and the trailing actions together at the end of the last line. Nothing is cut, shrunk or hidden. */
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${t('actions-gap')};
    min-inline-size: 0;
    margin-block-start: ${t('container-row-gap')};
    padding-inline: ${t('container-padding-inline-with-button')};
    cursor: default;
  }
  .row > .end {
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-inline-start: auto;
  }
  /* CCM-7, CCM-8: a Button keeps the size, the variant and the width the product gave it; none shrinks. */
  .group > tanrei-file-picker,
  .row > tanrei-file-picker,
  ::slotted([slot='leading']),
  ::slotted([slot='trailing']),
  ::slotted([slot='send']),
  ::slotted([slot='stop']),
  ::slotted([slot='attach']) {
    flex: none;
  }

  /* ── The counter (CCM-19) ── on one line, as text of its own direction, in digits of equal width. */
  .counter {
    flex: none;
    font: ${t('counter-typescale-font')};
    letter-spacing: ${t('counter-typescale-letter-spacing')};
    font-variant-numeric: tabular-nums;
    color: ${t('counter-color')};
    white-space: nowrap;
    unicode-bidi: isolate;
    transition: color ${unsafeCSS(MOTION)};
  }
  .counter[data-over] {
    color: ${t('counter-error-color')};
  }

  /* CCM-4: the width under which it is laid out stacked, as a length the element reads; it is drawn nowhere, takes
     no room and — inside a box that clips — widens nothing. */
  .measures {
    position: absolute;
    inset: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }
  .probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: ${t('layout-inline-min-width')};
    block-size: 0;
  }

  /* CCM-30: the one live region is drawn nowhere and still read. */
  .announce {${unsafeCSS(unseen)}
  }

  /* CCM-35: where motion is reduced a change of state is made at once. */
  @media (prefers-reduced-motion: reduce) {
    .capsule,
    .outline,
    .counter {
      transition: none;
    }
  }

  /* CCM-33: with a person's own colors the capsule stands on the platform's background with an edge in its text color
     at rest and in error; in its highlight at the focused width while the typing area has focus, and at twice the
     receiving width while it is receiving; in its disabled text color while disabled. The counter is text. */
  @media (forced-colors: active) {
    .capsule,
    .capsule:where([data-error], :hover, [data-focused], [data-receiving], [data-disabled]) {
      background-color: Canvas;
      box-shadow: none;
    }
    .capsule > .outline,
    .capsule:where([data-error], :hover) > .outline {
      border-color: CanvasText;
      border-width: ${t('outline-width')};
    }
    .capsule:where([data-focused]) > .outline {
      border-color: Highlight;
      border-width: ${t('focused-outline-width')};
    }
    .capsule:where([data-receiving]) > .outline {
      border-color: Highlight;
      border-width: calc(2 * ${t('receiving-outline-width')});
    }
    .capsule:where([data-disabled]) > .outline {
      border-color: GrayText;
      border-width: ${t('outline-width')};
    }
    .counter,
    .counter[data-over] {
      color: CanvasText;
    }
  }
`;

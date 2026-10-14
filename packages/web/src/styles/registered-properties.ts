// The custom properties the package registers: none — and why none.
//
// A registered custom property is not free for the page it is registered on. On a page whose elements inherit the ten
// thousand custom properties of `tokens.css`, ONE registered name anywhere in the document — by an `@property` rule or
// by `CSS.registerProperty()`, used or not — makes every element on which a transition starts cost Chromium about
// 0.7 ms a restyle, where it costs 0.01 ms without; and one that inherits makes WebKit pay the same for every element
// whose `transition-property` is `all` (a change of contrast on
// 300 buttons takes 278 ms against 41). So:
//
//   - `dist/tokens.css` registers NOTHING, and no element of a shadow root needs a registered name. The switch draws
//     its one progress by real properties — a `translate`, layers' opacities, a share of a ruler — and the calendar
//     writes its progress in each frame of a clock of its own; neither name is registered.
//   - No stylesheet that draws a component where no script runs registers a name either — not the link's,
//     prose's, the accordion's or the tree view's. What a registered name would do is done without one:
//       · a line's height as a length, for a part whose font is its own (a glyph, a task's mark, a trailing text): the
//         part says `1lh` in its own `line-height`, where the unit is the PARENT's line, and reads it back as its own
//         `1lh`; a glyph's one line of text, now taller than its box, is centred on the box by a flex container;
//       · a state's color changing over the state motion: the background's own transition;
//       · the hold of a press that no script answers, on an inline box that can hold no layer: the pressed color is
//         an image of one color and the state's color under it is clipped away, both said by two unregistered names
//         that step back after press-hold — properties with no transition of their own, so nothing fades while it is
//         held. The hold ends in a step, where a registered number would leave over the state motion;
//       · the accordion's clock, whose transition the element hears: an unregistered name that changes in one step
//         over the disclosure motion (`allow-discrete`) — nothing is drawn from it;
//       · the tree view's depth as a length: the sum as it is written, one `calc()` longer a level, handed down in
//         two unregistered names and computed where a real property reads it;
//       · a length the tree view's element reads from script (the indent of a level, the least width of a chevron's
//         hit area): said in a real property that draws nothing on the tree (`object-position`), which computes it.
//     The press that a stylesheet holds where no script answers it (the table of contents, the breadcrumbs, a table's
//     sort button, the previous and next links) is an unregistered property that steps as well: `transition-behavior: allow-discrete`.
//
// src/styles/registered-properties.test.ts holds it in three engines: no `@property` rule in any stylesheet of `dist/`,
// no `CSS.registerProperty()` in any source, and none of the names below answering on a page of every element.

/**
 * The names the package uses where a registered property would otherwise serve, kept unregistered. A page has none of
 * them registered,
 * whatever it loads: a registered property has its initial value on the root, and these have none.
 */
export const RETIRED_NAMES: readonly string[] = [
  // The switch's progress and the two ends of each of its six mixed parts; the calendar's progress.
  '--_tanrei-switch-progress',
  ...['c', 't', 'o', 'h', 'l', 'hs'].flatMap((key) => [`--_tanrei-switch-${key}0`, `--_tanrei-switch-${key}1`]),
  '--_tanrei-calendar-progress',
  // The press a stylesheet holds where no script answers it (TOC-20, BRC-18, TBL-37, PNL-10): a property that steps.
  '--_toc-pressed',
  '--_brc-pressed',
  '--_table-pressed',
  '--_pnl-pressed',
  // The link's and prose's four: a line's height as a length, the hold of a press on an inline box and the color
  // under it (LNK-8, LNK-11).
  '--_link-line',
  '--_link-pressed',
  '--_link-shown-container',
  '--_prose-line-height',
  // The accordion's three: the label's line as a length, the held press, and the item's clock, which is
  // `--_acc-open`, unregistered, and so has no value where no item sets it.
  '--_acc-line',
  '--_acc-pressed',
  '--_acc-open',
  // The tree view's five: a row's line as a length, the indent of a level and the depth as lengths computed once, and
  // the least width of a chevron's hit area.
  '--_trv-line',
  '--_trv-step',
  '--_trv-inset',
  '--_trv-outer',
  '--_trv-target',
];

// The pages whose tables of measurements hold the room they will take, in each engine, in a look a reader may choose
// other than the default, before the modules that define their elements have arrived: held-room.mjs holds the tests
// and says how they read the page. The pages whose tables, keyboard maps and lists of status tags hold their room in
// the default look are in held-room-tables.test.mjs, and those whose figures the web package's cloak holds in
// held-room-figures.test.mjs, held-room-buttons.test.mjs, held-room-actions.test.mjs and held-room-calendar.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-measures.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, in the look a reader chose (`system`), at the width where their table moved: a measure figure follows the
 * look, and so does the table under it (components/visuals/MeasureDiagram.astro). The page wrote each row's value and
 * note as the default system has them, and the figure wrote them again for the look once it had measured the
 * component, so a table grew where the look draws a length otherwise than its token, and the figure measured that:
 * - Cupertino's Main action button at a phone's width (323.78 → 341.77 px): the figure narrowed the button to the room
 *   the default system's holds, its label wrapped onto two lines, and the button was 56 px high for its 48;
 * - Cupertino's Segmented button (89.95 → 125.92 px), whose segment is the set's height less the track's inset on each
 *   side, where its token is the set's (lib/visuals/lengths-not-drawn.json); and its Keyboard shortcut (89.95 →
 *   125.92 px) and Navigation bar (59.97 → 113.92 px), which it drew a hairline off their tokens' heights then
 *   (KNOWN holds what is left of the Keyboard shortcut's);
 * - the Loading indicator's in m3-like (59.97 → 107.92 px): its square was measured part of the way through its turn
 *   (31.7 px across for 24).
 */
const CASES = [
  { url: '/components/main-action-button/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/segmented-button/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/keyboard-shortcut/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/navigation-bar/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/loading-indicator/', viewport: WIDE, system: 'm3-like' },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 * None is a table: each is a figure the web package's cloak holds (`@tanrei/web/cloak.css`).
 */
const KNOWN = [
  {
    url: '/components/keyboard-shortcut/',
    width: WIDE.width,
    box: '#docs-figure-2-stage',
    why: "in Cupertino, in Chromium, the line of text that holds two small shortcuts is 20.5 px high while the cloak holds them and 21.48 px once they are defined: each 20 px cap stands 0.98 px lower on the line's baseline than the cloak stands it. Where the cloak puts a shortcut's baseline is the web package's to settle, not the page's",
  },
];

heldRoomTests({ cases: CASES, known: KNOWN });

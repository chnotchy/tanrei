// The pages whose figures the web package's cloak holds at the box they are drawn in, in each engine, before the modules
// that define their elements have arrived: rows of tags, of switches and of avatars, cards, dividers, badges and app
// bars. held-room.mjs holds the tests and says how they read the page. The pages of buttons and other actions
// are in held-room-buttons.test.mjs and held-room-actions.test.mjs; the pages whose tables, keyboard maps and lists of status tags hold their room are in
// held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-figures.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, and the figure a reader looks at when its modules arrive:
 * - pages whose rows of tags, of switches and of avatars wrap where they will, and whose cards, dividers and badges keep
 *   their box, in the design system a reader may choose (`system`): when the cloak held a tag or a switch at no width,
 *   their rows wrapped only once they were drawn (the Tag's figures 88 to 90 px high before, 128 to 216 px drawn); a
 *   group of avatars held every member it was given (a row of six, 160 px high at a phone's width, was 104 px with
 *   three and its overflow box); a card's content stood without its padding (each card 32 px lower before), a divider
 *   was no line at all (a figure of wavy and thick ones 136 px high before, 156 px drawn), and a badge was as high as
 *   the line of text it stood in rather than as its icon (88.53 px before, 88 px drawn);
 * - the App bar's, whose bars stood with their slots' Buttons laid out in a column under the title (the cloak's rule
 *   for a Button won over the bar's own stand-in, a small bar 230 px high before and 128 px drawn), and whose large
 *   bar took the header's box (82 px before, 138 px drawn).
 */
const CASES = [
  { url: '/components/tag/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/tag/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/divider/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-4-stage' },
  { url: '/ar/components/switch/', viewport: PHONE, system: 'm3-like', look: '#docs-figure-2-stage' },
  { url: '/components/card/', viewport: WIDE, look: '#docs-figure-1-stage' },
  { url: '/ar/components/avatar/', viewport: PHONE, look: '#docs-figure-1-stage' },
  { url: '/components/badge/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/app-bar/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/app-bar/', viewport: PHONE, system: 'cupertino' },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 */
const KNOWN = [
  {
    url: '/components/app-bar/',
    width: WIDE.width,
    box: 'table "Anatomy"',
    why: "in Firefox the table's automatic layout gives its first column 159.6 px before the table is defined and 139.1 px once it is, so its last row's description takes one line fewer (646 → 624 px): the table's own room (components/Table.astro), which holds no element but the table",
  },
];

heldRoomTests({ cases: CASES, known: KNOWN });

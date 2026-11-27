// The pages of lists whose figures the web package's cloak holds at the box they are drawn in, in each engine, before
// the modules that define their elements have arrived: lists, laid out by the cloak as they will lay out their items.
// held-room.mjs holds the tests and says how they read the page. The other pages whose figures the cloak holds are in
// held-room-figures.test.mjs, held-room-buttons.test.mjs, held-room-actions.test.mjs and held-room-chips.test.mjs; the
// pages whose tables, keyboard maps and lists of status tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-lists.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive. When the cloak did not lay a list out, its items stood one under another
 * with no gap, each as wide as the list, and an option was a line of text: the List's first figure, a grid of photos,
 * 294 px high before and 234 px drawn; its second, a column, a line and a grid, 602 px before and 474 px drawn at a
 * phone's width in the default system, 294 px before and 412 px drawn at a desktop's; its third, whose options have no
 * List row, 254 px before and 336 px drawn; and its fourth, a reorderable column, 244 px before and 268 px drawn.
 */
const CASES = [
  { url: '/components/list/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'cupertino', look: '#docs-figure-3-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'm3-like' },
];

heldRoomTests({ cases: CASES });

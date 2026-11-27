// The pages of actions whose figures the web package's cloak holds at the box they are drawn in, in each engine, before
// the modules that define their elements have arrived: main action buttons, segmented buttons, FAB menus, and buttons
// beside a bottom sheet, a popover or a tooltip. held-room.mjs holds the tests and says how they read the page. The
// pages of buttons are in held-room-buttons.test.mjs — two files, so that CI's shards, which take whole files, can place
// them in different jobs; the other pages whose figures the cloak holds are in held-room-figures.test.mjs, and the
// pages whose tables, keyboard maps and lists of status tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-actions.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE } from './held-room.mjs';

/**
 * The pages, at a phone's width, in the design system a reader may choose (`system`), and the figure a reader looks at
 * when its modules arrive. When the cloak held these elements at the width of the words and the glyphs' names written
 * in them, or at none where they draw their words from an attribute: the Main Action Button's row of sizes 156 px high
 * before, 332 px drawn; a segmented button, its segments of no width, 112 px before, 272 px drawn; a FAB menu's toggle
 * a line of text, 90 px before, 232 px drawn; a tooltip's anchors 227 px before, 271 px drawn; a popover's 148 px
 * before, 198 px drawn; and a modal bottom sheet's content stood in the page, a figure 204 px high before, 100 px drawn.
 */
const CASES = [
  { url: '/components/main-action-button/', viewport: PHONE, look: '#docs-figure-3-stage' },
  { url: '/components/segmented-button/', viewport: PHONE, system: 'm3-like', look: '#docs-figure-2-stage' },
  { url: '/components/fab-menu/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/bottom-sheet/', viewport: PHONE, look: '#docs-figure-1-stage' },
  { url: '/components/popover/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/tooltip/', viewport: PHONE, look: '#docs-figure-21-stage' },
];

heldRoomTests({ cases: CASES });

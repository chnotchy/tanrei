// The pages of lists and menus whose figures the web package's cloak and the elements' own stylesheets hold at the box
// they are drawn in, in each engine, before the modules that define their elements have arrived: lists, laid out by
// the cloak as they will lay out their items, and menus drawn in place and menu bars (`menu.css`, `menubar.css`).
// held-room.mjs holds the tests and says how they read the page. The pages of fields and inline values are in
// held-room-fields.test.mjs, and those of file items and tabs in held-room-file-items-tabs.test.mjs — three files, so
// that CI's shards, which take whole files, can place them in different jobs; the other pages whose figures the cloak
// holds are in held-room-figures.test.mjs, held-room-buttons.test.mjs, held-room-actions.test.mjs and
// held-room-chips.test.mjs, and the pages whose tables, keyboard maps and lists of status tags hold their room in
// held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-lists.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive:
 * - the List's: when the cloak did not lay a list out, its items stood one under another with no gap, each as wide as
 *   the list, and an option was a line of text — its first figure, a grid of photos, 294 px high before and 234 px
 *   drawn; its second, a column, a line and a grid, 602 px before and 474 px drawn at a phone's width in the default
 *   system, 294 px before and 412 px drawn at a desktop's; its third, whose options have no List row, 254 px before and
 *   336 px drawn; and its fourth, a reorderable column, 244 px before and 268 px drawn. A reader looking at the third
 *   in cupertino saw the page move by 0.0358 while a list's action, defined before its List row, padded a row still
 *   held at its whole height;
 * - the Menu's: when menu.css held a menu drawn in place at its height alone, it had no width, so two menus side by side
 *   that wrap onto two rows once drawn stood on one before (its sixth figure 406 px high before and 764 px drawn at a
 *   phone's width, 474 px and 900 px in cupertino);
 * - the Menubar's: when menubar.css held a bar of titles at its paddings alone, its first figure was 72 px high before
 *   and 108 px drawn (112 px in cupertino).
 */
const CASES = [
  { url: '/components/list/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'cupertino', look: '#docs-figure-3-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/menu/', viewport: PHONE, look: '#docs-figure-6-stage' },
  { url: '/components/menu/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/menubar/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-1-stage' },
  { url: '/components/menubar/', viewport: PHONE },
];

heldRoomTests({ cases: CASES });

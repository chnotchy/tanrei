// The pages of file items, tabs and tab views whose figures the web package's cloak holds at the box they are drawn
// in, in each engine, before the modules that define their elements have arrived: file items' rows and tiles, with
// their second lines as they wrap, and the panels of tabs and tab views. held-room.mjs holds the tests and says how they
// read the page. The pages of fields, ratings, swatches and number tickers are in held-room-fields.test.mjs, and those
// of lists and menus in held-room-lists.test.mjs — three files, so that CI's shards, which take whole files, can place
// them in different jobs; the other pages whose figures the cloak holds are in held-room-figures.test.mjs,
// held-room-buttons.test.mjs, held-room-actions.test.mjs and held-room-chips.test.mjs, and the pages whose tables,
// keyboard maps and lists of status tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-file-items-tabs.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive:
 * - the File item's: when the cloak did not hold a file item, a row or a tile had no height at all, so its second
 *   figure, a column of six rows, was 144 px high before and 432 px drawn at a phone's width, and a grid of ten rows
 *   100 px before and 520 px drawn; when it held a second line that joins a size to the status at one line, that
 *   column was 412 px before and 432 px drawn at a phone's width, and in cupertino, whose face is wider where the
 *   system has no San Francisco (CI's Linux), 388 px and 406 px at a desktop's;
 * - the Tabs' and the Tab view's: when the cloak held a row of tabs at its row's height and a tab view not at all,
 *   every panel stood under the row, and a column of vertical tabs above its panels rather than beside them — the Tabs'
 *   figure of vertical tabs 238 px high before and 172 px drawn, the Tab view's second figure 305 px and 237 px.
 */
const CASES = [
  { url: '/components/file-item/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/file-item/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/tabs/', viewport: WIDE, look: '#docs-figure-94-stage' },
  { url: '/components/tab-view/', viewport: PHONE, look: '#docs-figure-2-stage' },
];

heldRoomTests({ cases: CASES });

// The pages of fields, ratings, swatches and number tickers whose figures the web package's cloak holds at the box
// they are drawn in, in each engine, before the modules that define their elements have arrived: fields whose help or
// error text wraps, and the widths of ratings, swatches and number tickers. held-room.mjs holds the tests and says how
// they read the page. The pages of file items, tabs and tab views are in held-room-file-items-tabs.test.mjs — two
// files, so that CI's shards, which take whole files, can place them in different jobs (in one file, the pages of the
// two took 1057 s of a job's 20 minutes in CI, its three engines one after another); those of lists, menus and menu
// bars are in held-room-list.test.mjs, held-room-list-cupertino.test.mjs, held-room-menu.test.mjs,
// held-room-menu-cupertino.test.mjs and held-room-menubar.test.mjs, and the other pages whose figures the cloak holds
// in held-room-figures.test.mjs, held-room-buttons.test.mjs, held-room-actions.test.mjs and held-room-chips.test.mjs,
// and the pages whose tables, keyboard maps and lists of status tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-fields.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive:
 * - the fields': when the cloak held a help or an error text at one line, the Color field's first figure, two fields
 *   17.5rem wide, was 248 px high before and 280 px drawn, and the Select field's and the Combobox field's third, whose
 *   field in error explains it in two lines, 468 px before and 484 px drawn;
 * - the Rating's, the Swatch's and the Number ticker's: when the cloak held a rating and a swatch at their height and no
 *   width, and a number ticker at none, a row of them wrapped only once they were drawn — a figure of four ratings
 *   96 px high before and 240 px drawn at a phone's width, of swatches 106 px and 164 px, of tickers 64 px and 160 px.
 */
const CASES = [
  { url: '/components/color-field/', viewport: PHONE, look: '#docs-figure-1-stage' },
  { url: '/components/select-field/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-3-stage' },
  { url: '/components/combobox-field/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/rating/', viewport: PHONE, look: '#docs-figure-3-stage' },
  { url: '/components/swatch/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/number-ticker/', viewport: PHONE, look: '#docs-figure-2-stage' },
];

heldRoomTests({ cases: CASES });

// The pages of lists, menus, fields, file items and inline values whose figures the web package's cloak and the elements' own
// stylesheets hold at the box they are drawn in, in each engine, before the modules that define their elements have
// arrived: lists, laid out by the cloak as they will lay out their items, menus drawn in place and menu bars
// (`menu.css`, `menubar.css`), fields whose help or error text wraps, file items, ratings, swatches and number
// tickers, and tabs and tab views with their panels. held-room.mjs holds the tests and says how they read the page. The other pages whose figures the cloak holds are in held-room-figures.test.mjs,
// held-room-buttons.test.mjs, held-room-actions.test.mjs and held-room-chips.test.mjs; the pages whose tables,
// keyboard maps and lists of status tags hold their room in held-room-tables.test.mjs.
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
 *   336 px drawn; and its fourth, a reorderable column, 244 px before and 268 px drawn;
 * - the Menu's: when menu.css held a menu drawn in place at its height alone, it had no width, so two menus side by side
 *   that wrap onto two rows once drawn stood on one before (its sixth figure 406 px high before and 764 px drawn at a
 *   phone's width, 474 px and 900 px in cupertino);
 * - the Menubar's: when menubar.css held a bar of titles at its paddings alone, its first figure was 72 px high before
 *   and 108 px drawn (112 px in cupertino);
 * - the fields': when the cloak held a help or an error text at one line, the Color field's first figure, two fields
 *   17.5rem wide, was 248 px high before and 280 px drawn, and the Select field's and the Combobox field's third, whose
 *   field in error explains it in two lines, 468 px before and 484 px drawn;
 * - the File item's: when the cloak did not hold a file item, a row or a tile had no height at all, so its second
 *   figure, a column of six rows, was 144 px high before and 432 px drawn at a phone's width, and a grid of ten rows
 *   100 px before and 520 px drawn;
 * - the Rating's, the Swatch's and the Number ticker's: when the cloak held a rating and a swatch at their height and no
 *   width, and a number ticker at none, a row of them wrapped only once they were drawn — a figure of four ratings
 *   96 px high before and 240 px drawn at a phone's width, of swatches 106 px and 164 px, of tickers 64 px and 160 px;
 * - the Tabs' and the Tab view's: when the cloak held a row of tabs at its row's height and a tab view not at all,
 *   every panel stood under the row, and a column of vertical tabs above its panels rather than beside them — the Tabs'
 *   figure of vertical tabs 238 px high before and 172 px drawn, the Tab view's second figure 305 px and 237 px.
 */
const CASES = [
  { url: '/components/list/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'cupertino', look: '#docs-figure-3-stage' },
  { url: '/components/list/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/menu/', viewport: PHONE, look: '#docs-figure-6-stage' },
  { url: '/components/menu/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/menubar/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-1-stage' },
  { url: '/components/menubar/', viewport: PHONE },
  { url: '/components/color-field/', viewport: PHONE, look: '#docs-figure-1-stage' },
  { url: '/components/select-field/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-3-stage' },
  { url: '/components/combobox-field/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/file-item/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/file-item/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/rating/', viewport: PHONE, look: '#docs-figure-3-stage' },
  { url: '/components/swatch/', viewport: PHONE, system: 'm3-like' },
  { url: '/components/number-ticker/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/tabs/', viewport: WIDE, look: '#docs-figure-94-stage' },
  { url: '/components/tab-view/', viewport: PHONE, look: '#docs-figure-2-stage' },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 */
const KNOWN = [
  {
    url: '/components/file-item/',
    width: PHONE.width,
    box: '#docs-figure-2-stage',
    why: "a file item's second line joins its size to its error text after the status's mark (FIT-4), which CSS cannot write in one run: the cloak holds that line at one line, and a row of a phone's width wraps it onto a second (the figure 20 px lower before)",
  },
];

heldRoomTests({ cases: CASES, known: KNOWN });

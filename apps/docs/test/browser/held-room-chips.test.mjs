// The pages of chips, callouts and empty states, whose figures the web package's cloak (chips, tag groups, a text
// input's entries) and the elements' own stylesheets (`callout.css`, `empty-state.css`) hold at the box they are drawn
// in, in each engine, before the modules that define their elements have arrived. held-room.mjs holds the tests and
// says how they read the page. The other pages whose figures the cloak holds are in held-room-figures.test.mjs,
// held-room-buttons.test.mjs and held-room-actions.test.mjs; the pages whose tables, keyboard maps and lists of status
// tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-chips.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive. When the cloak held a chip at its container's height and no width, its
 * label (an attribute) took no room and a row of chips wrapped only once they were drawn (the Chip's first figure 100 px
 * high before, 152 px drawn at 1440, 204 px at a phone's width; the Tag group's figure of filters and entries 100 px
 * before, 256 px drawn); a tag group laid its members out as words with spaces between them; and a callout and an empty
 * state wrote neither their `headline` nor the row of their actions (the Callout's first figure 322 px before, 404 px
 * drawn; the Empty state's 328 px before, 532 px drawn).
 */
const CASES = [
  { url: '/components/chip/', viewport: WIDE, look: '#docs-figure-1-stage' },
  { url: '/components/chip/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/tag-group/', viewport: PHONE, system: 'm3-like', look: '#docs-figure-28-stage' },
  { url: '/components/chip-field/', viewport: PHONE },
  { url: '/components/callout/', viewport: WIDE, system: 'm3-like', look: '#docs-figure-1-stage' },
  { url: '/components/empty-state/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-1-stage' },
  { url: '/components/empty-state/', viewport: PHONE },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 */
const ENTRIES = "a chip field draws its entries from its `value`, a list written as JSON, which CSS cannot read as a list: the cloak holds its box at one line, and its chips take as many lines as they need once it is defined";
const KNOWN = [
  { url: '/components/chip-field/', box: '#docs-figure-1-stage', why: ENTRIES },
  { url: '/components/chip-field/', box: '#docs-figure-3-stage', why: ENTRIES },
  {
    url: '/components/empty-state/',
    box: '#docs-figure-22-stage',
    why: 'in a column of 14rem, a Button whose label is longer than its line wraps that label once the empty state tells it its place (EMP-11): the cloak holds a Button on one line, so the figure is 32 px lower before',
  },
];

heldRoomTests({ cases: CASES, known: KNOWN });

// The Calendar's page, whose figures the web package's cloak holds at the box they are drawn in, in each engine, before
// the modules that define their elements have arrived. held-room.mjs holds the tests and says how they read the page.
// A file of its own, so that CI's shards, which take whole files, can place it in a job of its own share: the page of
// buttons is in held-room-buttons.test.mjs, the other actions in held-room-actions.test.mjs, the other pages whose
// figures the cloak holds in held-room-figures.test.mjs, and the pages whose tables, keyboard maps and lists of status
// tags hold their room in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-calendar.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The page, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive. When the cloak held no calendar, one stood in the page as an empty inline
 * element of no height: each figure of a calendar was 64 px high before (its stage's padding alone) and 448 px drawn,
 * and the figure of two calendars, one above the other at a phone's width, 64 px before and 848 px drawn.
 */
const CASES = [
  { url: '/components/calendar/', viewport: WIDE, look: '#docs-figure-1-stage' },
  { url: '/components/calendar/', viewport: PHONE, look: '#docs-figure-18-stage' },
  { url: '/components/calendar/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-13-stage' },
  { url: '/components/calendar/', viewport: PHONE, system: 'm3-like', look: '#docs-figure-15-stage' },
];

heldRoomTests({ cases: CASES });

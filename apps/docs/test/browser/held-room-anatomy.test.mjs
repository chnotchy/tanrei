// The pages whose anatomy tables hold the room they will take, in each engine, at a desktop's width, before the
// modules that define their elements have arrived: held-room.mjs holds the tests and says how they read the page. The
// App bar's is in held-room-figures.test.mjs with its figures, and the Calendar's in held-room-calendar.test.mjs; the
// pages whose other tables, keyboard maps and lists of status tags hold their room are in held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=firefox node --test test/browser/held-room-anatomy.test.mjs   # in one engine (all three by default)
import { heldRoomTests, WIDE } from './held-room.mjs';

/**
 * The pages, each in a design system a reader may choose (`system`), whose anatomy table changed its height once the
 * page's elements were defined, in Firefox at 1440 px: a part's number and its name stood under `white-space: nowrap`,
 * parted by a space, and the name wraps after its hyphens (`pre-wrap`). Firefox let the table's automatic layout break
 * the line at that space once the page's elements were defined and not before, so the first column narrowed and the
 * table grew or shrank by a line: the Bottom sheet's 836 → 792 px (149.4 → 139.6 px wide) and the FAB menu's in
 * Cupertino 497 → 517 px (138 → 119.2 px wide). A no-break space now holds the number to its name
 * (components/ComponentSpecs.astro). Of every component's page, in the three systems at 1440 and 390 px, the tables
 * that changed were four pages': the App bar's, the Calendar's and the FAB menu's in each system, and the Bottom
 * sheet's in the default one (the Calendar's in the default system changed its first column, not its height); at
 * 390 px the table stands as blocks and none did. The Calendar's table (597 → 618 px in Cupertino) keeps its height
 * now too: its page is read at 1440 px in the default system and in Cupertino in held-room-calendar.test.mjs, with its
 * figures, as the App bar's is in held-room-figures.test.mjs.
 */
const CASES = [
  { url: '/components/bottom-sheet/', viewport: WIDE },
  { url: '/components/fab-menu/', viewport: WIDE, system: 'cupertino' },
];

heldRoomTests({ cases: CASES });

// The Menu's page in cupertino, at a phone's width, whose figures the Menu's own stylesheet (`menu.css`) holds at the
// box they are drawn in, in each engine, before the modules that define their elements have arrived: menus drawn in
// place. held-room.mjs holds the tests and says how they read the page. The Menu's page in the default system is in
// held-room-menu.test.mjs, the List's in held-room-list.test.mjs and held-room-list-cupertino.test.mjs, and the
// Menubar's in held-room-menubar.test.mjs — five files, so that CI's shards, which take whole files, can place them in
// different jobs (in one file, these pages ran 19 minutes of a job's 20 in CI, their three engines one after another,
// and the job reached its limit in WebKit); the other pages whose figures the cloak holds, and those whose tables hold
// their room, are in the files held-room.mjs names.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-menu-cupertino.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE } from './held-room.mjs';

/**
 * The Menu's page at a phone's width in cupertino: when menu.css held a menu drawn in place at its height alone, it had
 * no width, so two menus side by side that wrap onto two rows once drawn stood on one before — its sixth figure 474 px
 * high before and 900 px drawn.
 */
const CASES = [{ url: '/components/menu/', viewport: PHONE, system: 'cupertino' }];

heldRoomTests({ cases: CASES });

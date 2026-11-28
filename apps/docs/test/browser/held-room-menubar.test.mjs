// The Menubar's page, at a desktop's width in cupertino and at a phone's in the default system, whose figures the
// Menubar's own stylesheet (`menubar.css`) holds at the box they are drawn in, in each engine, before the modules that
// define their elements have arrived: menu bars. held-room.mjs holds the tests and says how they read the page. The
// List's page is in held-room-list.test.mjs and held-room-list-cupertino.test.mjs, and the Menu's in
// held-room-menu.test.mjs and held-room-menu-cupertino.test.mjs — five files, so that CI's shards, which take whole
// files, can place them in different jobs (in one file, these pages ran 19 minutes of a job's 20 in CI, their three
// engines one after another, and the job reached its limit in WebKit); the other pages whose figures the cloak holds,
// and those whose tables hold their room, are in the files held-room.mjs names.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-menubar.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The Menubar's page, at a desktop's width and a phone's, in the design system a reader may choose (`system`), and the
 * figure a reader looks at when its modules arrive: when menubar.css held a bar of titles at its paddings alone, its
 * first figure was 72 px high before and 108 px drawn (112 px in cupertino).
 */
const CASES = [
  { url: '/components/menubar/', viewport: WIDE, system: 'cupertino', look: '#docs-figure-1-stage' },
  { url: '/components/menubar/', viewport: PHONE },
];

heldRoomTests({ cases: CASES });

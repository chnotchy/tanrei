// The List's page in cupertino, at a phone's width, whose figures the web package's cloak holds at the box they are
// drawn in, in each engine, before the modules that define their elements have arrived: lists, laid out by the cloak
// as they will lay out their items. held-room.mjs holds the tests and says how they read the page. The List's page in
// the default system and in m3-like is in held-room-list.test.mjs, the Menu's in held-room-menu.test.mjs and
// held-room-menu-cupertino.test.mjs, and the Menubar's in held-room-menubar.test.mjs — five files, so that CI's
// shards, which take whole files, can place them in different jobs (in one file, these pages ran 19 minutes of a
// job's 20 in CI, their three engines one after another, and the job reached its limit in WebKit); the other pages
// whose figures the cloak holds, and those whose tables hold their room, are in the files held-room.mjs names.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-list-cupertino.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE } from './held-room.mjs';

/**
 * The List's page at a phone's width in cupertino, and the figure a reader looks at when its modules arrive: a reader
 * looking at its third figure, whose options have no List row, saw the page move by 0.0358 while a list's action,
 * defined before its List row, padded a row still held at its whole height (the List's figures, and what they measured
 * before the cloak laid a list out: held-room-list.test.mjs).
 */
const CASES = [{ url: '/components/list/', viewport: PHONE, system: 'cupertino', look: '#docs-figure-3-stage' }];

heldRoomTests({ cases: CASES });

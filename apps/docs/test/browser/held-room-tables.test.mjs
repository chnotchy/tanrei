// The pages whose tables, keyboard maps and lists of status tags hold the room they will take, in each engine, before
// the modules that define their elements have arrived, and whose figures of multi-line fields and open pickers do too:
// held-room.mjs holds the tests and says how they read the page. The pages whose figures the web package's cloak holds at
// the box they are drawn in are in held-room-figures.test.mjs, held-room-buttons.test.mjs and
// held-room-actions.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-tables.test.mjs   # in one engine (all three by default)
import { GRID, heldRoomTests, LEGEND, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, and the figure a reader looks at when its modules arrive:
 * - the Text field's, whose examples of multi-line fields are each `min-rows` lines of the input's text tall (when the
 *   cloak held one line, the first of them, 384 px tall before, was 510 px drawn);
 * - the Date and time picker's, whose specs draw open pickers in place (when the cloak took them out of the page, a
 *   stage of two was 64 px tall before and 1033 px drawn);
 * - the Select's in Japanese, whose tables wrap their rows at a phone's width (its keyboard table drawn in words before
 *   its keys were defined, 1248 px tall at a phone's width, was 1126 to 1148 px once the keys were drawn in the reader's
 *   convention: components/visuals/KeyboardMap.astro now draws the reader's keys before);
 * - a component's page and the status page, in each design system a reader may choose (`system`) and in scripts other
 *   than the Latin, whose platforms' grid and legend are rows of status tags (components/StatusBadge.astro): drawn as
 *   their words before they were defined, a line of the label's text tall, each tag was 4 px lower than the small tag's
 *   container, and the grid and the legend grew when they were defined (the grid by 2 px in a desktop's window in
 *   cupertino and by 3 px at a phone's width in m3-like, the legend by 2 to 3 px). `lists` names what each must read.
 */
const CASES = [
  { url: '/components/text-field/', viewport: PHONE, look: '#docs-figure-7-stage', lists: [GRID] },
  { url: '/components/text-field/', viewport: WIDE, look: '#docs-figure-7-stage', lists: [GRID] },
  { url: '/components/date-time-picker/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/date-time-picker/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/ja/components/select/', viewport: PHONE, look: '.docs-keyboard-map', lists: [GRID] },
  { url: '/components/link/', viewport: WIDE, system: 'cupertino', look: '.availability .platforms', lists: [GRID] },
  { url: '/ar/components/link/', viewport: PHONE, system: 'm3-like', lists: [GRID] },
  { url: '/status/', viewport: WIDE, system: 'm3-like', lists: [LEGEND] },
  { url: '/hi/status/', viewport: PHONE, look: '.matrix tanrei-description-list', lists: [LEGEND] },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 */
const KNOWN = [
  {
    url: '/components/date-time-picker/',
    width: PHONE.width,
    box: '#docs-figure-4-stage',
    why: "a range field's time wraps where the surface is narrower than its words (\"6:00 AM next day\" on two lines at a phone's width), and the cloak holds a range field at one line: how many lines it takes is a matter of the words, the width and the face, which no token says",
  },
];

heldRoomTests({ cases: CASES, known: KNOWN });

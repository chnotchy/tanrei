// The pages whose tables of measurements hold the room they will take, in each engine, in a look a reader may choose
// other than the default, before the modules that define their elements have arrived: held-room.mjs holds the tests
// and says how they read the page. The pages whose tables, keyboard maps and lists of status tags hold their room in
// the default look are in held-room-tables.test.mjs, and those whose figures the web package's cloak holds in
// held-room-figures.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-measures.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, in the look a reader chose (`system`), at the width where their table moved: a measure figure follows the
 * look, and so does the table under it (components/visuals/MeasureDiagram.astro). The page wrote each row's value and
 * note as the default system has them, and the figure wrote them again for the look once it had measured the
 * component, so a table grew where the look draws a length otherwise than its token, and the figure measured that:
 * - Cupertino's Main action button at a phone's width (323.78 → 341.77 px): the figure narrowed the button to the room
 *   the default system's holds, its label wrapped onto two lines, and the button was 56 px high for its 48;
 * - Cupertino's Segmented button (89.95 → 125.92 px), Keyboard shortcut (89.95 → 125.92 px) and Navigation bar
 *   (59.97 → 113.92 px), each a hairline taller than its token's height there (lib/visuals/lengths-not-drawn.json);
 * - the Loading indicator's in m3-like (59.97 → 107.92 px): its square was measured part of the way through its turn
 *   (31.7 px across for 24).
 */
const CASES = [
  { url: '/components/main-action-button/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/segmented-button/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/keyboard-shortcut/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/navigation-bar/', viewport: WIDE, system: 'cupertino' },
  { url: '/components/loading-indicator/', viewport: WIDE, system: 'm3-like' },
];

/** A component drawn a hairline taller in Cupertino than its token says, which the cloak holds it at. */
const HAIRLINE = (component, height) =>
  `in Cupertino the ${component} is drawn a hairline taller than its token's height (${height}; lib/visuals/lengths-not-drawn.json), and the web package's cloak holds it at the token's: where the component and its token part is the web package's to settle, not the page's`;
const figures = (url, width, numbers, why) => numbers.map((n) => ({ url, width, box: `#docs-figure-${n}-stage`, why }));

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 * None is a table: each is a figure the web package's cloak holds (`@tanrei/web/cloak.css`).
 */
const KNOWN = [
  ...figures('/components/main-action-button/', PHONE.width, [2, 3, 4], "the cloak holds a Main action button with a label at its icon's square (30 px wide) where it is drawn with its label (133 to 154 px), so a row of them wraps only once they are drawn (the figure of the sizes 128 px high before, 272 px drawn)"),
  ...figures('/components/segmented-button/', WIDE.width, [2], 'the cloak holds a Segmented button at no width where it is drawn with its segments (275 px each), so the row of its sizes wraps only once they are drawn (112 px high before, 168 px drawn)'),
  ...figures('/components/keyboard-shortcut/', WIDE.width, [1, 2, 3, 4], HAIRLINE('Keyboard shortcut', '24.98 px for 24')),
  ...figures('/components/navigation-bar/', WIDE.width, [1, 2, 3, 4], HAIRLINE('Navigation bar', '49.98 px for 49')),
];

heldRoomTests({ cases: CASES, known: KNOWN });

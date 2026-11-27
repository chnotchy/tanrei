// The pages of buttons whose figures the web package's cloak holds at the box they are drawn in, in each engine, before
// the modules that define their elements have arrived: buttons, button groups, buttons with menu, copy buttons, and a
// side sheet's page, whose figure is a button beside the sheet. held-room.mjs holds the tests and says how they read
// the page. The pages of the other actions (main action buttons, segmented buttons, FAB menus, and buttons beside a
// bottom sheet, a popover or a tooltip) are in held-room-actions.test.mjs — two files, so that CI's shards, which take
// whole files, can place them in different jobs; the other pages whose figures the cloak holds are in
// held-room-figures.test.mjs, and the pages whose tables, keyboard maps and lists of status tags hold their room in
// held-room-tables.test.mjs.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room-buttons.test.mjs   # in one engine (all three by default)
import { heldRoomTests, PHONE, WIDE } from './held-room.mjs';

/**
 * The pages, at a phone's width and a desktop's, in the design system a reader may choose (`system`), and the figure a
 * reader looks at when its modules arrive. When the cloak held a button at the width of the words and the glyphs'
 * names written in it, a row of buttons wrapped where it is not drawn wrapping, and a button group took the line of
 * text it stood in: the Button's figure of icon buttons 152 px high before, 100 px drawn; the Button Group's figures
 * 100 px before, 188 px drawn; the Button with Menu's rows 116 px before, 264 px drawn (its label is an attribute, and
 * it was held at no width); a row of copy buttons 100 px before, 152 px drawn; and a modal side sheet's content stood in
 * the page, a figure 126 px high before, 100 px drawn.
 */
const CASES = [
  { url: '/components/button/', viewport: PHONE, look: '#docs-figure-7-stage' },
  { url: '/components/button-group/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/components/button-group/', viewport: PHONE, system: 'cupertino', look: '#docs-figure-4-stage' },
  { url: '/components/button-with-menu/', viewport: PHONE, system: 'm3-like', look: '#docs-figure-4-stage' },
  { url: '/components/copy-button/', viewport: PHONE, system: 'cupertino' },
  { url: '/components/side-sheet/', viewport: WIDE, system: 'cupertino' },
];

heldRoomTests({ cases: CASES });

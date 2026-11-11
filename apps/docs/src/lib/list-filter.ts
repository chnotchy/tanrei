// The lists of components as the reader asked for them, in the browser: the sidebar's and the index's, under the
// switch that shows every component (components/ListingSwitch.astro) and the reader's look (lib/appearance.ts, chosen
// in the header's Appearance panel). One module for both, so that what one asks is never undone by the other.
//
// - A row shown only on request is out of the document while the reader has not asked for everything (lib/listing.mjs).
//   What is not shown is taken out of the document, not only out of sight: a list counts its items and moves focus
//   among them, and must count what the reader sees. Each row is held, and put back in its place, by a comment that
//   keeps that place; so is what is said under another look only.
// - A row, or a group, the look does not have stays where it is, and is drawn faint (`FAINT_ATTR`): the reader can
//   still reach its page. Faint is not a lighter color — the sidebar's labels are already the secondary text role, the
//   quietest that holds text's contrast — but words: the index's row ends with "Not in <look>", said under that look
//   only, and the sidebar's row takes the same words as its supporting text, under its label, which the drawer reads
//   after the row's name. (A group none of whose rows the look has is marked; its rows say why.)
//
// The head's scripts said before the first paint what was asked for (`listingBootstrap`, and the appearance's script);
// the rule the appearance's script wrote is taken away here, once the rows are held instead.
import { APPEARANCE_EVENT, CUSTOM_BASE_ATTR, CUSTOM_LOOK, CUSTOM_SHEET_EVENT } from './appearance';
import { ABSENT_ATTR, FAINT_ATTR, LISTING_ATTR, NOT_IN_ATTR, ON_REQUEST_ATTR, SYSTEM_ATTR, SYSTEM_ONLY_ATTR, SYSTEM_RULE_ID } from './listing.mjs';

const root = document.documentElement;
/** The rows taken out of the document, each by the mark that keeps its place, in the order they were taken. */
const held = new Map<Comment, Element>();

/** Whether the lists show every component, or only those listed by default. */
export const showsEverything = () => root.getAttribute(LISTING_ATTR) !== 'listed';
/** The system the lists follow — under the reader's own theme, the system it extends; null where the head's script did not run. */
export const shownSystem = () => (root.getAttribute(SYSTEM_ATTR) === CUSTOM_LOOK ? root.getAttribute(CUSTOM_BASE_ATTR) : root.getAttribute(SYSTEM_ATTR));

/** Whether a row (a group of rows, or what is said under one system only) is not shown, as asked now. */
const hidden = (row: Element, everything: boolean, system: string | null) =>
  (!everything && row.hasAttribute(ON_REQUEST_ATTR)) || (system !== null && row.hasAttribute(SYSTEM_ONLY_ATTR) && row.getAttribute(SYSTEM_ONLY_ATTR) !== system);

/** Marks a row, or a group, the look does not have as faint, and gives a row of the sidebar the words that say so. */
function markFaint(row: Element, system: string | null): void {
  const faint = system !== null && (row.getAttribute(ABSENT_ATTR) ?? '').split(' ').includes(system);
  row.toggleAttribute(FAINT_ATTR, faint);
  const words = row.getAttribute(NOT_IN_ATTR);
  if (words === null) return;
  if (faint) row.setAttribute('supporting-text', words.replace('{system}', system ?? ''));
  else row.removeAttribute('supporting-text');
}

/** Puts every held row back, marks what the look does not have, then takes out of the document what the reader has not asked to see. */
export function apply(): void {
  for (const [mark, row] of held) mark.replaceWith(row);
  held.clear();
  const everything = showsEverything();
  const system = shownSystem();
  shownLook = system;
  for (const row of document.querySelectorAll(`[${ABSENT_ATTR}]`)) markFaint(row, system);
  for (const row of document.querySelectorAll(`[${ON_REQUEST_ATTR}], [${SYSTEM_ONLY_ATTR}]`)) {
    // A row in a group already taken out goes with its group.
    if (!row.isConnected || !hidden(row, everything, system)) continue;
    const mark = document.createComment('');
    row.replaceWith(mark);
    held.set(mark, row);
  }
  document.getElementById(SYSTEM_RULE_ID)?.remove();
}

/** The lists show every component (`true`) or what is listed by default. */
export function showEverything(everything: boolean): void {
  if (everything) root.removeAttribute(LISTING_ATTR);
  else root.setAttribute(LISTING_ATTR, 'listed');
  apply();
}

// The lists follow the look wherever it is chosen: it is the root's attribute, announced with the appearance.
// (A theme of the reader's own that Theme Studio replaced may extend another system: its sheet is announced too.)
for (const type of [APPEARANCE_EVENT, CUSTOM_SHEET_EVENT]) {
  document.addEventListener(type, () => {
    if (shownLook !== shownSystem()) apply();
  });
}
let shownLook = shownSystem();

// What the head's scripts found before the first paint, once, whichever control's script loads this first.
apply();

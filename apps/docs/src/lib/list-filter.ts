// The lists of components as the reader asked for them, in the browser: the sidebar's and the index's, under the
// switch that shows every component (components/ListingSwitch.astro). One module for both, so that what one asks is
// never undone by the other.
//
// A row shown only on request is out of the document while the reader has not asked for everything (lib/listing.mjs).
// What is not shown is taken out of the document, not only out of sight: a list counts its items and moves focus among
// them, and must count what the reader sees. Each row is held, and put back in its place, by a comment that keeps that
// place. The head's script said before the first paint what was asked for (`listingBootstrap`).
//
// No list follows the reader's look: the look is how the site is drawn, not which product's catalogue is read.
import { LISTING_ATTR, ON_REQUEST_ATTR } from './listing.mjs';

const root = document.documentElement;
/** The rows taken out of the document, each by the mark that keeps its place, in the order they were taken. */
const held = new Map<Comment, Element>();

/** Whether the lists show every component, or only those listed by default. */
export const showsEverything = () => root.getAttribute(LISTING_ATTR) !== 'listed';

/** Puts every held row back, then takes out of the document what the reader has not asked to see. */
export function apply(): void {
  for (const [mark, row] of held) mark.replaceWith(row);
  held.clear();
  if (showsEverything()) return;
  for (const row of document.querySelectorAll(`[${ON_REQUEST_ATTR}]`)) {
    // A row in a group already taken out goes with its group.
    if (!row.isConnected) continue;
    const mark = document.createComment('');
    row.replaceWith(mark);
    held.set(mark, row);
  }
}

/** The lists show every component (`true`) or what is listed by default. */
export function showEverything(everything: boolean): void {
  if (everything) root.removeAttribute(LISTING_ATTR);
  else root.setAttribute(LISTING_ATTR, 'listed');
  apply();
}

// What the head's script found before the first paint, once, whichever control's script loads this first.
apply();

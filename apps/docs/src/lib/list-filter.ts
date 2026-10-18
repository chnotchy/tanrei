// The lists of components as the reader asked for them, in the browser: the sidebar's and the index's, under both of
// their controls — the switch that shows every component (components/ListingSwitch.astro) and the choice of design
// system (components/SystemSelect.astro). One module for both, so that a row hidden by one is never put back by the
// other: a row is out of the document while a component is shown only on request and the reader has not asked for
// everything, or while the chosen system does not have it (lib/listing.mjs).
//
// What is not shown is taken out of the document, not only out of sight: a list counts its items and moves focus
// among them, and must count what the reader sees. Each row is held, and put back in its place, by a comment that
// keeps that place. The head's scripts said before the first paint what was asked for (`listingBootstrap`,
// `systemBootstrap`); the rule the system's script wrote is taken away here, once the rows are held instead.
import { ABSENT_ATTR, LISTING_ATTR, ON_REQUEST_ATTR, SYSTEM_ATTR, SYSTEM_ONLY_ATTR, SYSTEM_RULE_ID } from './listing.mjs';

const root = document.documentElement;
/** The rows taken out of the document, each by the mark that keeps its place, in the order they were taken. */
const held = new Map<Comment, Element>();

/** Whether the lists show every component, or only those listed by default. */
export const showsEverything = () => root.getAttribute(LISTING_ATTR) !== 'listed';
/** The system the lists show; null where the head's script did not run. */
export const shownSystem = () => root.getAttribute(SYSTEM_ATTR);

/** Whether a row (a group of rows, or a line said under one system only) is not shown, as asked now. */
const hidden = (row: Element, everything: boolean, system: string | null) =>
  (!everything && row.hasAttribute(ON_REQUEST_ATTR)) ||
  (system !== null && (row.getAttribute(ABSENT_ATTR) ?? '').split(' ').includes(system)) ||
  (system !== null && row.hasAttribute(SYSTEM_ONLY_ATTR) && row.getAttribute(SYSTEM_ONLY_ATTR) !== system);

/** Puts every held row back, then takes out of the document what the reader has not asked to see. */
export function apply(): void {
  for (const [mark, row] of held) mark.replaceWith(row);
  held.clear();
  const everything = showsEverything();
  const system = shownSystem();
  for (const row of document.querySelectorAll(`[${ON_REQUEST_ATTR}], [${ABSENT_ATTR}], [${SYSTEM_ONLY_ATTR}]`)) {
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

/** The lists show the components of `system`. */
export function showSystem(system: string): void {
  root.setAttribute(SYSTEM_ATTR, system);
  apply();
}

// What the head's scripts found before the first paint, once, whichever control's script loads this first.
apply();

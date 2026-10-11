// What rows of tabs that share a choice have in common (TAB-36…41): one registry for a document, kept by this module
// and never in the DOM. A group is a name, its members and its choice; what a person chose is remembered under the
// product's own key, read once for a key and written once for a choice, however many rows name it.

/** The rows of one document that name one group, and the choice they share (TAB-36). */
export interface SharedChoice<Member> {
  readonly name: string;
  /** The rows that are in the document now. A row that leaves it is taken out (TAB-41). */
  readonly members: Set<Member>;
  /** The value of a tab, or null until a person, the product or the storage gives the group one (TAB-37, TAB-39). */
  choice: string | null;
}

/** What one document shares: its groups, which outlive their members (TAB-41), and what its storage held under each key. */
interface Shared {
  groups: Map<string, SharedChoice<unknown>>;
  stored: Map<string, string | null>;
}

const documents = new WeakMap<Document, Shared>();

function sharedBy(document: Document): Shared {
  let shared = documents.get(document);
  if (!shared) {
    shared = { groups: new Map(), stored: new Map() };
    documents.set(document, shared);
  }
  return shared;
}

/**
 * TAB-36, TAB-41: the group `name` of `document` — made the first time it is named, and kept, with its choice, for as
 * long as the document lasts, with or without members. The name is compared exactly.
 */
export function sharedChoice<Member>(document: Document, name: string): SharedChoice<Member> {
  const { groups } = sharedBy(document);
  let group = groups.get(name) as SharedChoice<Member> | undefined;
  if (!group) {
    group = { name, members: new Set(), choice: null };
    groups.set(name, group as SharedChoice<unknown>);
  }
  return group;
}

/** The storage the origin keeps across pages and visits, or null where there is none; reaching for it may itself throw. */
function storage(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * TAB-39, TAB-41: the value stored under exactly `key`, or null — read from the storage at most once for a key in the
 * life of the document, and afterwards what was last read or written. A storage that is missing, blocked or throws is
 * the same as nothing stored, and nothing is raised or reported.
 */
export function remembered(document: Document, key: string): string | null {
  const { stored } = sharedBy(document);
  if (stored.has(key)) return stored.get(key) ?? null;
  let value: string | null = null;
  try {
    value = storage(document)?.getItem(key) ?? null;
  } catch {
    value = null;
  }
  stored.set(key, value);
  return value;
}

/**
 * TAB-39: stores `value`, and nothing else, under exactly `key`. A storage that is missing, blocked or full keeps
 * nothing: the choice then lasts as long as the document does (what `remembered()` answers), and nothing is raised or
 * reported.
 */
export function remember(document: Document, key: string, value: string) {
  sharedBy(document).stored.set(key, value);
  try {
    storage(document)?.setItem(key, value);
  } catch {
    // A person who blocks storage has made a choice, not a mistake.
  }
}

/** The regions `element` scrolls in up and down, nearest first, across shadow trees, ending with the document's own. */
function scrollRegions(element: Element): Element[] {
  const regions: Element[] = [];
  const document = element.ownerDocument;
  const up = (node: Element): Element | null => node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
  for (let node = up(element); node && node !== document.documentElement; node = up(node)) {
    if (node.scrollHeight - node.clientHeight < 1) continue;
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') regions.push(node);
  }
  const page = document.scrollingElement;
  if (page && !regions.includes(page)) regions.push(page);
  return regions;
}

/**
 * TAB-40, TBV-21: `element` was at `top` in the window before the choice changed what lies before it. Moves the regions
 * it scrolls in — the nearest first, each as far as it goes — by what is left of the difference, at once and without a
 * scrolling motion. A browser that anchors scrolling itself has by now moved some or all of the way, so only what is
 * left is corrected and the two never add up. Where scroll positions are whole pixels the element ends within half a
 * pixel of where it was.
 */
export function keepInPlace(element: Element, top: number) {
  const left = () => element.getBoundingClientRect().top - top;
  let moved = left();
  if (Math.abs(moved) < 0.01) return;
  for (const region of scrollRegions(element)) {
    region.scrollBy({ top: moved, behavior: 'instant' });
    moved = left();
    // A browser that keeps whole scroll positions drops the fraction of the distance: the next whole position is the
    // nearer one when more than half a pixel is left.
    if (Math.abs(moved) > 0.5 && Math.abs(moved) < 1) {
      region.scrollBy({ top: Math.sign(moved), behavior: 'instant' });
      moved = left();
    }
    if (Math.abs(moved) < 0.01) return;
  }
}

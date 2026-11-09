// The internal channel from a component that arranges its own items in a List (the file upload's rows, FUP-29) to that
// List: called with true, the list shows an item that arrives or leaves as LST-41 says of a reorderable list's — and
// moves the items whose place that changes — also while it is not reorderable. Not a prop: a product's list is never
// asked. The same component moves what stands around those items with the List's own motions, and asks the List for
// their time and curve: a composed element reads no token of a member's, in its sheet or in its script.
//
// It is kept outside `src/components/**` — the files custom-elements.json is made from — so that none of it becomes
// part of the List's public surface (the manifest, the generated React wrapper).

/** The List's method of the channel: `list[LIST_PRESENCE](true)`. */
export const LIST_PRESENCE = Symbol('tanrei-list-presence');

/** The List's motions, as the cascade computes them: `list[LIST_MOTION]('resize')` — milliseconds and a curve. */
export const LIST_MOTION = Symbol('tanrei-list-motion');

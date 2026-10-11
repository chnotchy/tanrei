// The internal channel from an item to the container that reads it (a segment to its set, a list item to its list, a menu
// item to its menu, a suggestion to its search, a tab or tab panel to its row): the item says that a prop the container
// depends on changed, and the container re-reads its items.
//
// It is dispatched here, outside `src/components/**` — the files custom-elements.json is made from — so the event never
// becomes part of an item's public API (the manifest, the generated React wrappers). The navigation destinations do the
// same through `notifyDestinationUpdate()` (destination.ts).

/** Tells the item's container, with a bubbling `type` event, that a prop it reads changed. */
export function notifyItemUpdate(item: HTMLElement, type: string): void {
  item.dispatchEvent(new Event(type, { bubbles: true }));
}

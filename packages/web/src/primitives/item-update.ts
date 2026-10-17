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

/**
 * The container's side of the channel: it re-reads its items once per turn, however many of them said they changed in
 * it. Building a container of N items has each item say so as it first draws; a container that re-read all N on each
 * of the N calls did O(N²) work — seconds for a menu of 1,000 items — where one re-read is O(N).
 *
 * `request()` queues the re-read for a microtask, which runs before the next frame, so no frame draws the items with
 * what they said before. A reader that needs the items' context within the same task (a key press, focus, a click)
 * calls `flush()` first; a re-read the container makes itself calls `now()`, which settles a queued request with it.
 */
export class CoalescedSync {
  private queued = false;

  constructor(private readonly run: () => void) {}

  /** The items changed: re-read them once, in a microtask. */
  readonly request = (): void => {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      if (!this.queued) return;
      this.queued = false;
      this.run();
    });
  };

  /** Re-reads now if a request is queued: before a read that needs the items' context in this task. */
  flush(): void {
    if (this.queued) this.now();
  }

  /** Re-reads now, and settles a queued request with it. */
  now(): void {
    this.queued = false;
    this.run();
  }
}

// One resize observer for every host that lays out when one of its parts changes size (a dialog, a side sheet): a frame
// reports every element that changed size in one callback, and the hosts they belong to lay out together. An observer
// of each host's own reported in callbacks of their own, each laying its host out after the one before had written.

/** Whom each observed element is watched for: the layout of the host that watches it last. */
const owners = new WeakMap<Element, () => void>();

const resizes =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        for (const entry of entries) owners.get(entry.target)?.();
      });

/** What one host watches with the shared observer, and the layout it asks for when any of it changes size. */
export class ResizeWatch {
  private readonly watched = new Set<Element>();

  constructor(private readonly onResize: () => void) {}

  /** Watches `element` for this host. Observed once; an element another host watched is this host's from now on. */
  watch(element: Element, options?: ResizeObserverOptions) {
    if (!resizes || (this.watched.has(element) && owners.get(element) === this.onResize)) return;
    owners.set(element, this.onResize);
    this.watched.add(element);
    resizes.observe(element, options);
  }

  /** Stops watching all of it, as the host disconnects; an element moved into another host is that host's to watch now. */
  stop() {
    for (const element of this.watched) {
      if (owners.get(element) !== this.onResize) continue;
      resizes?.unobserve(element);
      owners.delete(element);
    }
    this.watched.clear();
  }
}

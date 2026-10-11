import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Whether the host can be seen (PRG-14, LDG-7 and every component with a running animation): false while it is scrolled
 * out of the viewport or in a hidden subtree (`display: none`, a closed `<details>`), which an IntersectionObserver
 * reports as not intersecting. The component pauses its animation while `visible` is false — it renders
 * `animation-play-state: paused` — and it resumes where it stopped. A page in a background tab is not rendered at all,
 * so the browser already stops its animations there.
 */
const owners = new WeakMap<Element, VisibilityController>();
/**
 * One observer for every host of the page: the hosts that come into view or leave it in one frame — fifty skeletons
 * of a page that is first laid out, ten of them under the fold — are told in one callback, so that their updates run
 * in one turn, and what they read after them is read together. With an observer each, each host was told in a
 * callback of its own, and wrote and read between the others'.
 */
let observer: IntersectionObserver | null = null;
const shared = () =>
  (observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) owners.get(entry.target)?.took(entry.isIntersecting);
  }));

export class VisibilityController implements ReactiveController {
  /** True until the first observation says otherwise, so an animation never waits for the observer to start. */
  visible = true;
  private observed = false;

  constructor(private readonly host: ReactiveControllerHost & Element) {
    host.addController(this);
  }

  hostConnected() {
    if (typeof IntersectionObserver === 'undefined') return;
    owners.set(this.host, this);
    shared().observe(this.host);
    this.observed = true;
  }

  hostDisconnected() {
    if (!this.observed) return;
    shared().unobserve(this.host);
    owners.delete(this.host);
    this.observed = false;
  }

  /** @internal The observer's report of the host: the last of a callback is how it is now. */
  took(visible: boolean) {
    if (visible === this.visible) return;
    this.visible = visible;
    this.host.requestUpdate();
  }
}

import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * How long a row a component made current by itself (the search's query row or first result, SRC-24 and SRC-50; the
 * combobox's first match, CMB-48) stays current, with nothing typed, before it is announced: half a second, as React
 * Aria's autocomplete waits. A behaviour of the specs, not a design value: no system re-values it.
 */
export const ANNOUNCE_PAUSE = 500;

/**
 * Whether the row the component's input names as its active descendant is announced now. A row an arrow key moves to
 * is announced at once (`now()`); a row the component made current by itself, while the person types, only once it has
 * stayed current for `ANNOUNCE_PAUSE` (`later()`, which every edit calls again), so that a screen reader reads the
 * character typed first and then what the action key takes, not a row after every key. `none()`: nothing is current.
 * The host renders `aria-activedescendant` only while `announced` is true.
 */
export class PausedAnnouncement implements ReactiveController {
  /** The current row is the input's active descendant now. */
  announced = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this);
  }

  /** The component made the row current by itself: it is announced once it has stayed so for ANNOUNCE_PAUSE. */
  later() {
    this.stop();
    this.set(false);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.set(true);
    }, ANNOUNCE_PAUSE);
  }

  /** The person moved to the row (an arrow key, a page key, a pointer): it is announced at once. */
  now() {
    this.stop();
    this.set(true);
  }

  /** No row is current: nothing is announced, and nothing waits to be. */
  none() {
    this.stop();
    this.set(false);
  }

  /** Whether a row the component made current is waiting to be announced. */
  get waiting(): boolean {
    return this.timer !== undefined;
  }

  hostDisconnected() {
    this.none();
  }

  private stop() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private set(announced: boolean) {
    if (announced === this.announced) return;
    this.announced = announced;
    this.host.requestUpdate();
  }
}

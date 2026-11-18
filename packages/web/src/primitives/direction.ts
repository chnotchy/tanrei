import { type ReactiveController, type ReactiveControllerHost, css, html } from 'lit';

// A component follows the layout direction of where it is used: the `dir` it inherits, from <html> or from any ancestor,
// and a change of it while the page runs. What CSS draws follows by itself (logical properties, `:host(:dir(rtl))`).
// What script wrote for one direction — a physical scroll offset, a physical inset computed from a measured box — does
// not: nothing tells a script that an ancestor's `dir` changed (no event, and a MutationObserver would have to watch
// every ancestor across every shadow root). DirectionController tells it; an element with no shadow root of its own
// watches the roots it is in instead (DirAttributeWatch, below).
//
// The component renders DIRECTION_PROBE in its shadow root and includes `directionProbeStyles`; the host must be a
// positioning container. The probe is an empty, hidden box that is as wide as the host in right-to-left and has no
// width in left-to-right, so a ResizeObserver sees the direction change — in every engine, with no polling. A resize of
// the host in right-to-left is seen too, and ignored: the callback runs only when the computed direction differs from
// the last one seen.

/** The element a component renders (anywhere in its shadow root) for DirectionController to watch. */
export const DIRECTION_PROBE = html`<span class="direction-probe" aria-hidden="true"></span>`;

/** The probe's styles: no box in left-to-right, the host's width in right-to-left, never drawn, never hit. */
export const directionProbeStyles = css`
  .direction-probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 0;
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
  }
  :host(:dir(rtl)) .direction-probe {
    inline-size: 100%;
  }
`;

type Host = ReactiveControllerHost & HTMLElement;

/**
 * The direction the host is in when it is first watched, asked of the document and not of the cascade: `:dir()` is
 * answered from the `dir` attributes around the host — what the probe's own rule follows — and styles nothing, where a
 * read of the computed `direction` in the host's first update, after it wrote its shadow tree, had the page styled
 * once for each instance. An engine that
 * cannot answer is asked for the computed value, as before.
 */
export function directionOf(host: Element): string {
  try {
    return host.matches(':dir(rtl)') ? 'rtl' : 'ltr';
  } catch {
    return getComputedStyle(host).direction;
  }
}

/** Calls `changed` when the host's computed layout direction changes while it is connected (never for the first one). */
export class DirectionController implements ReactiveController {
  private readonly observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.check());
  private probe: Element | null = null;
  private last: string | null = null;

  constructor(
    private readonly host: Host,
    private readonly changed: (direction: 'ltr' | 'rtl') => void,
  ) {
    host.addController(this);
  }

  /** The host's layout direction now, read from the cascade. */
  get rtl(): boolean {
    return getComputedStyle(this.host).direction === 'rtl';
  }

  hostConnected() {
    this.last = null;
    this.watch();
  }

  hostUpdated() {
    this.watch();
  }

  hostDisconnected() {
    this.observer?.disconnect();
    this.probe = null;
  }

  private watch() {
    const probe = this.host.shadowRoot?.querySelector('.direction-probe') ?? null;
    if (!probe || probe === this.probe || !this.host.isConnected) return;
    if (this.probe) this.observer?.unobserve(this.probe);
    this.probe = probe;
    this.last ??= directionOf(this.host);
    this.observer?.observe(probe);
  }

  private check() {
    if (!this.host.isConnected) return;
    const direction = getComputedStyle(this.host).direction;
    const before = this.last;
    this.last = direction;
    if (before !== null && before !== direction) this.changed(direction === 'rtl' ? 'rtl' : 'ltr');
  }
}

/** Each root watched for `dir`, and whom to tell there: one observer for every element in it. */
const dirWatches = new Map<Node, { observer: MutationObserver; heard: Set<() => void> }>();

/** The roots `element` is in: its own, and each shadow root's host's up to the document. */
function rootsOf(element: Element): Node[] {
  const roots: Node[] = [];
  for (let root = element.getRootNode(); ; ) {
    roots.push(root);
    if (!(root instanceof ShadowRoot)) break;
    root = root.host.getRootNode();
  }
  return roots;
}

/**
 * DirectionController's counterpart for an element that draws in the tree it is in, with no shadow root of its own to
 * hold the probe (the table, the tree view). The direction comes from a `dir` on an ancestor, so each root the host is
 * in — the document, and every shadow root between it and the document — is watched for that one attribute, by one
 * observer for all the hosts in it. `heard` is called whenever a `dir` changes in one of them, in a microtask of the
 * task that changed it: before the frame that draws the change. The `dir` may be anyone's (the host's own writes too):
 * the host compares the direction it drew for with the one now (`directionOf()`).
 */
export class DirAttributeWatch {
  private roots: Node[] = [];

  constructor(
    private readonly host: Element,
    private readonly heard: () => void,
  ) {}

  /** Call when the host is connected. */
  connect() {
    this.disconnect();
    if (typeof MutationObserver === 'undefined') return;
    this.roots = rootsOf(this.host);
    for (const root of this.roots) {
      let watch = dirWatches.get(root);
      if (!watch) {
        const heard = new Set<() => void>();
        const observer = new MutationObserver(() => {
          for (const each of [...heard]) each();
        });
        observer.observe(root, { attributes: true, attributeFilter: ['dir'], subtree: true });
        dirWatches.set(root, (watch = { observer, heard }));
      }
      watch.heard.add(this.heard);
    }
  }

  /** Call when the host is disconnected. */
  disconnect() {
    for (const root of this.roots) {
      const watch = dirWatches.get(root);
      if (!watch) continue;
      watch.heard.delete(this.heard);
      if (!watch.heard.size) {
        watch.observer.disconnect();
        dirWatches.delete(root);
      }
    }
    this.roots = [];
  }
}

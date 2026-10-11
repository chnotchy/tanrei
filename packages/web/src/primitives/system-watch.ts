import type { ReactiveController, ReactiveControllerHost } from 'lit';

// A choice of kind that a component draws from script (a glyph it chooses, markup it orders) is read from the cascade
// when it renders. A design system is switched on the document's root — `data-tanrei-system`,
// `data-tanrei-theme`, a class or an inline token — without touching the component, so the component would keep the
// old choice until something else rendered it. SystemWatchController renders its host again whenever the root's
// attributes change: one observer for the page, every connected host told. (A choice drawn by CSS alone needs none.)

type Host = ReactiveControllerHost & Element;

const hosts = new Set<Host>();
let observer: MutationObserver | null = null;

function watch() {
  if (observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  observer = new MutationObserver(() => {
    for (const host of hosts) host.requestUpdate();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tanrei-system', 'data-tanrei-theme', 'class', 'style'] });
}

export class SystemWatchController implements ReactiveController {
  constructor(private readonly host: Host) {
    host.addController(this);
  }

  hostConnected() {
    hosts.add(this.host);
    watch();
  }

  hostDisconnected() {
    hosts.delete(this.host);
    if (hosts.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  }
}

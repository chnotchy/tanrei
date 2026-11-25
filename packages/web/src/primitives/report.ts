import { DEBUG } from './debug.js';

const reported = new WeakMap<Element, Set<string>>();

/**
 * A debug report (BTN-7, BTN-16 and every spec sentence that says "in debug builds report"): something the
 * component survives — it still renders — but the developer should fix. A `console.warn` naming the element, the
 * problem and the behaviour id, once per element and problem (unless `once` is false), and nothing at all in a production
 * build. A spec sentence that says "report as an error" (DLG-19) is a `console.error`: `level: 'error'`. A caller
 * guards the call with `DEBUG` (`if (DEBUG) report(…)`), so that a production bundle leaves out its message as well.
 */
export function report(host: Element, id: string, message: string, { once = true, level = 'warn' }: { once?: boolean; level?: 'warn' | 'error' } = {}) {
  if (!DEBUG) return;
  const seen = reported.get(host) ?? new Set<string>();
  // `once: false` is for a condition that can come back (a menu slot that becomes empty again): the caller reports
  // each time it begins, never on every render.
  if (once && seen.has(message)) return;
  seen.add(message);
  reported.set(host, seen);
  console[level](`[tanrei] <${host.localName}>: ${message} (${id})`, host);
}

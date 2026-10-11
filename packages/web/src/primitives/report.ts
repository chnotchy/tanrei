// `process` exists only where a bundler (or Node) defines it; it is read in a try, never assumed.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether this is a debug build. The web has no debug build of its own: the PRODUCT's bundler decides, by the
 * convention every web bundler shares — `process.env.NODE_ENV`, which Vite, webpack, Rollup and esbuild replace with
 * `"production"` in a production build (the expression is written out whole so they can). Without a bundler there is
 * no `process` and reports stay on; `dist/tanrei.bundle.js` is built as a development bundle, so it reports too.
 */
export function debugBuild(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
}

const reported = new WeakMap<Element, Set<string>>();

/**
 * A debug report (BTN-7, BTN-16 and every spec sentence that says "in debug builds report"): something the
 * component survives — it still renders — but the developer should fix. A `console.warn` naming the element, the
 * problem and the behaviour id, once per element and problem (unless `once` is false), and nothing at all in a production
 * build. A spec sentence that says "report as an error" (DLG-19) is a `console.error`: `level: 'error'`.
 */
export function report(host: Element, id: string, message: string, { once = true, level = 'warn' }: { once?: boolean; level?: 'warn' | 'error' } = {}) {
  if (!debugBuild()) return;
  const seen = reported.get(host) ?? new Set<string>();
  // `once: false` is for a condition that can come back (a menu slot that becomes empty again): the caller reports
  // each time it begins, never on every render.
  if (once && seen.has(message)) return;
  seen.add(message);
  reported.set(host, seen);
  console[level](`[tanrei] <${host.localName}>: ${message} (${id})`, host);
}

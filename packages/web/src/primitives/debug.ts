// `process` exists only where a bundler (or Node) defines it; here it is read in a try, never assumed.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether this is a debug build. The web has no debug build of its own: the PRODUCT's bundler decides, by the
 * convention every web bundler shares — `process.env.NODE_ENV`, which Vite, webpack, Rollup and esbuild replace with
 * `"production"` in a production build. Without a bundler there is no `process` and reports stay on;
 * `dist/tanrei.bundle.js` is built as a development bundle, so it reports too.
 *
 * Every debug-only path is guarded by this constant where it starts, first in its condition
 * (`if (DEBUG && …) report(…)`), never by a call, so that a production bundle leaves the message out with the call
 * (IMPLEMENTATION.md, "Debug builds"). This module is the one a page loads without a bundler (and Node), so it reads
 * `process` in a try and is a value at run time. A bundler that builds for the browser reads the package's `browser`
 * field and takes `debug.bundled.ts` in its place, whose constant is the bare expression: the bundler replaces it with
 * `false` and drops what it guards (`test/debug-code.test.mjs`).
 */
export const DEBUG: boolean = /* @__PURE__ */ (() => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
})();

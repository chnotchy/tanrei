// The address of the script of the worker that computes a reader's own theme's stylesheet (@tanrei/studio/page-sheet's
// worker), as the site's build names it, for the head's script (components/frame/ThemeProvider.astro): where IndexedDB
// holds no sheet for the theme, the head's script starts the worker itself, while the document is still being parsed
// (lib/appearance.ts `EARLY_WORKER`), instead of leaving it to lib/custom-theme.ts.
//
// It reaches the page as the virtual module `virtual:tanrei-docs/sheet-worker` (its default export: the address, or
// null). The worker is bundled with the site's scripts, by the client's build, and its file name holds a hash of its
// contents; the pages are rendered once every build has been written, so the client's build leaves the name where the
// rendering reads it. The two are separate bundles of one process: they share only the process's global object. Under
// `astro dev` there is no client build, and no address: the worker is started by lib/custom-theme.ts, as it is there for
// a theme chosen once the page is loaded.

/** The virtual module's name. */
export const SHEET_WORKER_MODULE = 'virtual:tanrei-docs/sheet-worker';
const RESOLVED = `\0${SHEET_WORKER_MODULE}`;
/** Where the client's build leaves the address for the rendering: a key of the process's global object. */
const FOUND = 'tanrei-docs:sheet-worker';

/** Whether a file of the client's build is the page sheet's worker (packages/studio/src/sheet-worker.ts, bundled). */
export const isSheetWorker = (fileName) => /(^|\/)sheet-worker-[^/]+\.js$/.test(fileName);

/** The Vite plugin that serves the address, and finds it in the client's build. */
export function sheetWorkerPlugin() {
  let base = '/';
  return {
    name: 'tanrei-docs:sheet-worker',
    configResolved(config) {
      base = config.base;
    },
    resolveId: (id) => (id === SHEET_WORKER_MODULE ? RESOLVED : undefined),
    // Read when the rendering runs the module: after the client's build.
    load: (id) => (id === RESOLVED ? `export default globalThis[Symbol.for(${JSON.stringify(FOUND)})] ?? null;` : undefined),
    generateBundle(_, bundle) {
      if (this.environment?.name !== 'client') return;
      const files = Object.keys(bundle).filter(isSheetWorker);
      if (files.length !== 1) this.error(`${SHEET_WORKER_MODULE}: the client's build holds ${files.length} files of the page sheet's worker (${files.join(', ') || 'none'}), not one`);
      globalThis[Symbol.for(FOUND)] = `${base.replace(/\/?$/, '/')}${files[0]}`;
    },
  };
}

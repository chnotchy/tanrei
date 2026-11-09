// Waits on what the page can only answer later: IndexedDB, where the stylesheet of the reader's own theme is kept
// (src/lib/custom-theme.ts). Playwright's `waitForFunction` does not wait for a promise its function returns — a
// promise is a value, and a truthy one, so it is taken as the answer at once — and the stylesheet's store answers only
// asynchronously. `until` asks the page again (`evaluate` waits for the promise) until it says yes.
import { bounded } from './launch.mjs';

/** How often the page is asked again, in milliseconds. */
const EVERY = 250;

/**
 * Resolves once `fn(arg)`, run in the page and awaited there, is truthy; fails after `timeout` saying what it waited for.
 * @template A
 * @param {import('@playwright/test').Page} page
 * @param {string} what
 * @param {(arg: A) => unknown} fn
 * @param {A} arg
 * @param {number} [timeout]
 */
export async function until(page, what, fn, arg, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await bounded(what, page.evaluate(fn, arg))) return;
    if (Date.now() > deadline) throw new Error(`${what}: not so within ${timeout / 1000} s`);
    await new Promise((resolve) => setTimeout(resolve, EVERY));
  }
}

/**
 * Run in the page: whether IndexedDB keeps the stylesheet of the theme whose layer's hash is `hash` (under any build's
 * key). The store is opened as the page opens it (src/lib/appearance.ts, `readSheet`): one asked for before the page
 * made it is made as the page makes it, never left without its store.
 * @param {{ db: string, store: string, hash: string }} where
 */
export async function sheetKept({ db, store, hash }) {
  const base = await new Promise((resolve, reject) => {
    const open = indexedDB.open(db, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(store);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    const keys = await new Promise((resolve, reject) => {
      const all = base.transaction(store, 'readonly').objectStore(store).getAllKeys();
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => reject(all.error);
    });
    return keys.some((key) => String(key).endsWith(`:${hash}`));
  } finally {
    base.close();
  }
}

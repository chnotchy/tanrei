// The reader's own theme ("My theme"): a layer made in Theme Studio, which its Share menu gives the docs, in this
// browser only (components/StudioPage.astro hands the Studio `keepCustomTheme` and `keptCustomTheme`). lib/appearance.ts
// holds the look; this module holds the theme and its stylesheet.
//
//   the theme        localStorage `tanrei-docs-custom-theme`: `{ hash, layer }`, the layer file and a hash of its text
//   its stylesheet   Theme Studio's page sheet of the layer (@tanrei/studio/page-sheet): only what differs from the
//                    default system's sheet, which every page already holds on the root, in the same cascade layer —
//                    applied after it, the whole page is drawn in the theme. It is computed in a worker, off the page's
//                    thread, and kept in IndexedDB under the build's key (lib/sheet-key.mjs: a sheet another build
//                    computed is not used) and the layer's hash; IndexedDB keeps one sheet, the last.
//
// The head's script reads the sheet from IndexedDB before the first paint where it can (lib/appearance.ts); what it
// cannot is done here, once the page's modules run: `showCustomSheet`.
import build from 'virtual:tanrei-docs/sheet-key';
import { pageSheetInWorker } from '@tanrei/studio/page-sheet';
import { APPEARANCE_KEY, CUSTOM_KEY, CUSTOM_LOOK, CUSTOM_SHEET_EVENT, CUSTOM_STYLE_ID, LATE_ATTR, LOOK_ATTR, PENDING_ATTR, SHEET_STORE, customOf, placeSheet, readSheet, sheetKey } from './appearance';

/** The theme as it is kept. */
interface Kept {
  hash: string;
  layer: Record<string, unknown>;
}

/** A short hash of a text (53 bits, in base 36): the name of a layer's stylesheet, made when the layer is kept. */
export function hashOf(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** The theme this browser keeps, or null. */
function kept(): Kept | null {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null');
    return customOf(value, []) ? (value as Kept) : null;
  } catch {
    return null;
  }
}

/** Whether this browser keeps a theme of the reader's own. */
export const keptCustomTheme = () => kept() !== null;

/** IndexedDB keeps `css` under `key`, and no other sheet. */
function writeSheet(key: string, css: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(SHEET_STORE.db, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore(SHEET_STORE.store);
      };
      open.onsuccess = () => {
        const db = open.result;
        try {
          const transaction = db.transaction(SHEET_STORE.store, 'readwrite');
          const store = transaction.objectStore(SHEET_STORE.store);
          store.clear();
          store.put(css, key);
          transaction.oncomplete = transaction.onerror = transaction.onabort = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      open.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Resolves after `count` frames. */
const frames = (count: number) => new Promise<void>((resolve) => {
  const next = (left: number) => (left ? requestAnimationFrame(() => next(left - 1)) : resolve());
  next(count);
});

/**
 * Every motion of the page that has an end — in the document and in every shadow root in it, where an element of the
 * web package moves — taken to its end now. A motion with no end (a spinner's) runs on.
 */
function finishMotions(): void {
  const roots: (Document | ShadowRoot)[] = [document];
  for (let at = 0; at < roots.length; at += 1) for (const element of roots[at]!.querySelectorAll('*')) if (element.shadowRoot) roots.push(element.shadowRoot);
  for (const root of roots) {
    for (const animation of root.getAnimations()) {
      if (!Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Number.POSITIVE_INFINITY)) continue;
      try {
        animation.finish();
      } catch {}
    }
  }
}

/** The theme's stylesheet: IndexedDB's, else computed in the worker and kept there. */
async function sheetOf(theme: Kept): Promise<string> {
  const key = sheetKey(build, theme.hash);
  const cached = await new Promise<string | null>((resolve) => readSheet(SHEET_STORE.db, SHEET_STORE.store, key, resolve));
  if (cached !== null) return cached;
  const css = await pageSheetInWorker(theme.layer);
  await writeSheet(key, css);
  return css;
}

/**
 * The theme's stylesheet in place, while the look is the reader's theme — then the page is shown, if the head's script
 * hid it. A page the head's script could not keep hidden until the sheet was in (`LATE_ATTR`) stays in the default
 * system: the sheet is only computed and kept, for the next page. A sheet that cannot be had (the worker failed)
 * leaves the page in the default system, and says why in the console.
 */
export async function showCustomSheet(): Promise<void> {
  const root = document.documentElement;
  const theme = kept();
  try {
    if (!theme || (root.getAttribute(LOOK_ATTR) !== CUSTOM_LOOK && !root.hasAttribute(LATE_ATTR))) return;
    const key = sheetKey(build, theme.hash);
    if (document.getElementById(CUSTOM_STYLE_ID)?.getAttribute('data-key') === key) return;
    const css = await sheetOf(theme);
    // Still asked for: the look, or the theme, may have changed meanwhile.
    if (root.getAttribute(LOOK_ATTR) !== CUSTOM_LOOK || kept()?.hash !== theme.hash) return;
    placeSheet(css, key, CUSTOM_STYLE_ID);
    document.dispatchEvent(new CustomEvent(CUSTOM_SHEET_EVENT));
    // A hidden page is shown once it has settled in the theme: what its elements measured under the default system's
    // tokens (the shell's columns, a drawer's width) is measured again in the next two frames, and a size an element
    // moves to by a motion of its own (a drawer resizes itself) is drawn where the motion ends, before anything of
    // the page is drawn.
    if (root.hasAttribute(PENDING_ATTR)) {
      await frames(2);
      finishMotions();
      await frames(1);
    }
  } catch (error) {
    console.warn(`[docs] The theme this browser keeps could not be drawn (${(error as Error).message}): the page is drawn in the default system.`);
  } finally {
    root.removeAttribute(PENDING_ATTR);
  }
}

/** The look kept in storage, changed as `change` says. */
function keepLook(change: (look: unknown) => string | undefined) {
  try {
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null');
    const given = stored && typeof stored === 'object' ? stored : {};
    const look = change(given.look);
    if (look === given.look) return;
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...given, look }));
  } catch {}
}

/**
 * Theme Studio gives the docs a layer (its Share menu): kept as the reader's theme, in the place of any before it, and
 * its stylesheet computed now, so that the next page of the docs finds it. With `show`, the docs are drawn in it from
 * now on. `null`: the docs keep no theme, and a reader whose look it was has the default look again.
 */
export function keepCustomTheme(layer: Record<string, unknown> | null, { show = false }: { show?: boolean } = {}): void {
  if (!layer) {
    try {
      localStorage.removeItem(CUSTOM_KEY);
    } catch {}
    keepLook((look) => (look === CUSTOM_LOOK ? undefined : (look as string | undefined)));
    return;
  }
  const theme: Kept = { hash: hashOf(JSON.stringify(layer)), layer };
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(theme));
  } catch {
    return;
  }
  if (show) keepLook(() => CUSTOM_LOOK);
  void sheetOf(theme).catch((error) => console.warn(`[docs] The theme’s stylesheet could not be computed (${(error as Error).message}).`));
}

// How the docs look to the reader, in one place: the color mode (the device's, light or dark), the contrast
// (standard, medium, high) and the look — Tanrei's own design system, one of the theme gallery's examples that imitate
// another design system, or the reader's own theme ("My theme"), made in Theme Studio and kept in this browser. One
// type, one key of the origin's storage, one set of attributes on `<html>`, one event.
//
// Every look is drawn the same way: on the whole page, by one stylesheet over the default system's on the root — what
// differs from it, Theme Studio's page sheet — at the end of the head (`LOOK_SHEET_ID`). The default system has none;
// a gallery example's is a file the build computes (lib/look-sheets.mjs), linked; the reader's own theme's is computed
// in this browser and kept in IndexedDB (lib/custom-theme.ts), written in a `<style>`. Nothing is drawn under a scope
// of a system's own but the figures that compare systems or are pinned to one, which say so.
//
//   `<html>`            data-theme             the scheme drawn, light or dark (the framework's styles and
//                                              styles/tanrei-theme.css, which turns it into `color-scheme`)
//                       data-tanrei-theme      the same scheme, as Tanrei's tokens read it on any element
//                       data-docs-mode         what the reader chose: system, light or dark
//                       data-tanrei-contrast   medium or high; absent for standard (the tokens are resolved at :root)
//                       data-docs-look         the look: a shipped system's id, or `custom`, the reader's own theme
//                       data-docs-custom       present while this browser keeps a theme of the reader's own
//                       data-docs-appearance-pending  while the look's stylesheet is not in yet and nothing else holds the
//                                              first paint for it: nothing of the page is drawn (styles/tanrei-theme.css)
//                       data-docs-custom-missing  while the look is the reader's theme and IndexedDB, asked by the
//                                              head's script, held no stylesheet for it: the key it is computed under
//                       data-docs-look-late    on a page whose look's stylesheet was not in after `REVEAL_AFTER`, or could
//                                              not be had: the page is drawn in the default system, and the sheet is
//                                              kept for the next (the reader's theme's in IndexedDB, a file in the cache)
//                       data-docs-appearance-shared   present while the page shows an appearance from its address
//   storage             `tanrei-docs-appearance`: `{ mode, contrast, look }` as JSON. Nothing else is read: a choice
//                       kept under an older key is not carried over.
//                       `tanrei-docs-custom-theme`: the reader's own theme, `{ hash, layer }` — the layer file Theme
//                       Studio gave the docs (its Share menu; lib/custom-theme.ts writes it) and a hash of its text. The
//                       look `custom` is one only while it is there.
//                       `tanrei-docs-custom-sheet`: the key of the last stylesheet of it given to IndexedDB to keep.
//   IndexedDB           `tanrei-docs`, store `sheets`: the stylesheet of the reader's theme — what differs from the
//                       default system's on the root (Theme Studio's page sheet) — under the build's key and the
//                       layer's hash; computed in a worker where it is not there (lib/custom-theme.ts).
//   the page            `docs-appearance` (a CustomEvent on `document`, its detail the appearance shown) whenever it
//                       changes — here, in another tab of the site (the `storage` event), with the device's scheme
//                       while the mode is the device's, or because the look's stylesheet came too late for the page
//                       (`LATE_ATTR`, which the head's script sets and announces the same way). What is shown is read
//                       from `<html>`: the header's controls say what is drawn, never what was asked for.
//   the address         `?look=<id>&mode=<mode>&contrast=<contrast>`: a link to a page as someone else sees it. It is
//                       shown on that page and not kept: the header offers to keep it (Header.astro), and any choice the
//                       reader makes from there is kept whole and leaves the address.
//
// The head's script (`appearanceBootstrap`, written by components/frame/ThemeProvider.astro in place of the framework's
// own theme script) applies the stored or shared appearance before the first paint. It is made of the same functions
// as the module below — each written as a function of its arguments alone, so that its text is the script — and never
// a second copy of them. Under a gallery example it links the example's stylesheet: where the engine blocks rendering
// on a stylesheet a script asks it to (`blocking="render"`), the first paint waits for it; elsewhere the page is hidden
// until it has loaded. Under the reader's own theme it hides the page until the theme's stylesheet is in: read from
// IndexedDB at once, else computed by lib/custom-theme.ts, which the module right after the head's script asks for
// (components/frame/ThemeProvider.astro) — where the head's script found no sheet kept, at once, before the document is
// parsed, and in the worker the head's script starts then (`EARLY_WORKER`). After `REVEAL_AFTER` it shows a hidden page
// whatever happens — without the sheet, in the default system, which that page keeps.

export type Mode = 'system' | 'light' | 'dark';
export type Contrast = 'standard' | 'medium' | 'high';
export type Scheme = 'light' | 'dark';

/** How the docs look: one value of this type is stored, shown, shared and announced. */
export interface Appearance {
  mode: Mode;
  contrast: Contrast;
  /** A shipped system's id — the default system, or a showcase system — or `custom`: the reader's own theme. */
  look: string;
}

export const MODES: readonly Mode[] = ['system', 'light', 'dark'];
export const CONTRASTS: readonly Contrast[] = ['standard', 'medium', 'high'];

/** Where the appearance is kept (the origin's localStorage). */
export const APPEARANCE_KEY = 'tanrei-docs-appearance';
/** The event on `document` whenever the appearance shown changes. */
export const APPEARANCE_EVENT = 'docs-appearance';
/** The attributes of `<html>`. */
export const THEME_ATTR = 'data-theme';
export const TANREI_THEME_ATTR = 'data-tanrei-theme';
export const MODE_ATTR = 'data-docs-mode';
export const CONTRAST_ATTR = 'data-tanrei-contrast';
export const LOOK_ATTR = 'data-docs-look';
export const SHARED_ATTR = 'data-docs-appearance-shared';
/** The address's names. */
export const PARAMS = { look: 'look', mode: 'mode', contrast: 'contrast' } as const;

/** The look of the reader's own theme. A shipped system is never so named: its id is a layer's, and no layer of the repository is. */
export const CUSTOM_LOOK = 'custom';
/** Where the reader's own theme is kept: `{ hash, layer }`. */
export const CUSTOM_KEY = 'tanrei-docs-custom-theme';
export const CUSTOM_ATTR = 'data-docs-custom';
export const PENDING_ATTR = 'data-docs-appearance-pending';
/** On a page whose look's stylesheet was not in after `REVEAL_AFTER`, or could not be had: that look. The page is drawn in the default system, and the sheet is kept for the next. */
export const LATE_ATTR = 'data-docs-look-late';
/**
 * Set by the head's script when IndexedDB holds no stylesheet for the reader's theme: the key it is to be computed
 * under. lib/custom-theme.ts computes it without asking IndexedDB a second time, and takes the mark away.
 */
export const MISSING_ATTR = 'data-docs-custom-missing';
/**
 * The property of `window` that holds the worker that computes the theme's stylesheet, where the head's script started
 * it (it found no sheet kept), until lib/custom-theme.ts takes it. Started from the head, while the document is still
 * being parsed, Firefox fetches the worker's script at once; started by a module, once the parser is busy with the
 * page's body, it fetched it only once the document was parsed (1.4 to 2.2 s after navigation on a Mac).
 */
export const EARLY_WORKER = 'tanreiDocsSheetWorker';
/** The look's stylesheet at the end of the head: a gallery example's `<link>`, or the reader's theme's `<style>`; none under the default system. */
export const LOOK_SHEET_ID = 'docs-look-sheet';
/** Where the theme's stylesheet is kept (IndexedDB). */
export const SHEET_STORE = { db: 'tanrei-docs', store: 'sheets' } as const;
/**
 * The key of the last stylesheet given to IndexedDB to keep (the origin's localStorage), which the head's script reads
 * at once: where it names another key, IndexedDB holds no sheet for the theme, and the head's script does not ask it
 * (which answers in tens of milliseconds, and up to half a second in WebKit while the page loads) before the sheet is computed. Where it names this key,
 * IndexedDB is asked; a sheet it does not hold after all (its write failed or is not done) is computed then.
 */
export const SHEET_HELD_KEY = 'tanrei-docs-custom-sheet';
/**
 * The longest the page stays hidden for the look's stylesheet, in milliseconds. A sheet not in by then is not put in
 * on that page — it would move everything drawn: the page is drawn in the default system, its look says so, and the
 * sheet, once had, is kept for the next page (`LATE_ATTR`).
 */
export const REVEAL_AFTER = 3000;
/** Sent on `document` once the look's stylesheet is in, another took its place, or it was taken away: the root's tokens changed. */
export const LOOK_SHEET_EVENT = 'docs-look-sheet';

/** What `docs-appearance` carries. */
export interface AppearanceDetail {
  appearance: Appearance;
  /** Whether it is the one the page's address gave, not the reader's own. */
  shared: boolean;
}

// ── The functions the head's script is made of: each uses its arguments and nothing else ─────────────────────────────

/**
 * An appearance from anything: what storage held (parsed JSON, or nothing) with what the address asked for over it.
 * A value that is not one of the allowed ones is the default's: the device's mode, standard contrast, the default look.
 * The reader's own theme (`custom`) is a look only where this browser keeps one (`custom` is true).
 */
export function normalize(value: unknown, looks: readonly string[], defaultLook: string, custom?: boolean): Appearance {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const mode = given.mode === 'light' || given.mode === 'dark' ? given.mode : 'system';
  const contrast = given.contrast === 'medium' || given.contrast === 'high' ? given.contrast : 'standard';
  const look = typeof given.look === 'string' && (looks.indexOf(given.look) >= 0 || (custom === true && given.look === 'custom')) ? given.look : defaultLook;
  return { mode, contrast, look };
}

/** The reader's own theme as storage keeps it (parsed JSON, or nothing): its hash, or null where there is none, or none that can be read. */
export function customOf(value: unknown): { hash: string } | null {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const layer = given.layer && typeof given.layer === 'object' ? given.layer : null;
  if (typeof given.hash !== 'string' || !/^[0-9a-z]{1,32}$/.test(given.hash) || !layer) return null;
  return { hash: given.hash };
}

/** The stylesheet IndexedDB keeps under `key`, given to `done` — or null where it keeps none, or fails. */
export function readSheet(db: string, store: string, key: string, done: (css: string | null) => void): void {
  try {
    const open = indexedDB.open(db, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(store);
    };
    open.onsuccess = () => {
      const base = open.result;
      try {
        const get = base.transaction(store, 'readonly').objectStore(store).get(key);
        get.onsuccess = () => {
          base.close();
          done(typeof get.result === 'string' ? get.result : null);
        };
        get.onerror = () => {
          base.close();
          done(null);
        };
      } catch (e) {
        base.close();
        done(null);
      }
    };
    open.onerror = () => done(null);
  } catch (e) {
    done(null);
  }
}

/** The reader's theme's stylesheet put in place: one `<style>` at the end of the head, named by its key, in the place of any look's sheet before it. */
export function placeSheet(css: string, key: string, id: string): void {
  var style = document.getElementById(id);
  if (!style || style.localName !== 'style') {
    var made = document.createElement('style');
    made.id = id;
    if (style) style.replaceWith(made);
    else document.head.appendChild(made);
    style = made;
  }
  if (style.getAttribute('data-key') !== key) {
    style.textContent = css;
    style.setAttribute('data-key', key);
  }
}

/** What the address asks for (`?look=&mode=&contrast=`), or null where it names none of the three. */
export function sharedFrom(search: string): Record<string, string> | null {
  const params = new URLSearchParams(search);
  const asked: Record<string, string> = {};
  let any = false;
  for (const name of ['look', 'mode', 'contrast']) {
    const value = params.get(name);
    if (value !== null) {
      asked[name] = value;
      any = true;
    }
  }
  return any ? asked : null;
}

/** The scheme drawn: the one chosen, or the device's while the mode is the device's. */
export function schemeOf(mode: Mode, deviceDark: boolean): Scheme {
  return mode === 'light' || mode === 'dark' ? mode : deviceDark ? 'dark' : 'light';
}

/** The attributes of `<html>` for an appearance; null takes one away. */
export function attributesOf(appearance: Appearance, deviceDark: boolean, names: { theme: string; tanreiTheme: string; mode: string; contrast: string; look: string }): Record<string, string | null> {
  const scheme = appearance.mode === 'light' || appearance.mode === 'dark' ? appearance.mode : deviceDark ? 'dark' : 'light';
  const out: Record<string, string | null> = {};
  out[names.theme] = scheme;
  out[names.tanreiTheme] = scheme;
  out[names.mode] = appearance.mode;
  out[names.contrast] = appearance.contrast === 'standard' ? null : appearance.contrast;
  out[names.look] = appearance.look;
  return out;
}

/**
 * A gallery example's stylesheet linked at the end of the head as the look's sheet (`id`). `done` is called once: with
 * true at once where that link is the look's sheet already, else once it has loaded — the look's sheet before it taken
 * away then, so that the page is never drawn in neither — and with false where it could not be loaded (the link is
 * taken away). With `render`, the engine is asked to block rendering on it where it can (`blocking="render"`); the
 * answer is whether it does: where it does, the first paint waits for the sheet.
 */
export function linkSheet(href: string, id: string, render: boolean, done: (loaded: boolean) => void): boolean {
  var before = document.getElementById(id);
  if (before && before.localName === 'link' && before.getAttribute('href') === href) {
    done(true);
    return false;
  }
  var link = document.createElement('link') as HTMLLinkElement & { blocking?: DOMTokenList };
  link.rel = 'stylesheet';
  link.href = href;
  // Every look's link is marked, the one still loading too: a look chosen meanwhile takes them all away.
  link.setAttribute('data-docs-look-sheet', '');
  var blocks = false;
  if (render && link.blocking && typeof link.blocking.supports === 'function' && link.blocking.supports('render')) {
    link.blocking.add('render');
    blocks = true;
  }
  link.addEventListener('load', function () {
    // A link taken away meanwhile (another look was chosen, or the page could not wait for it) is no look's sheet.
    if (!link.isConnected) return;
    var held = document.getElementById(id);
    if (held && held !== link) held.remove();
    link.id = id;
    done(true);
  });
  link.addEventListener('error', function () {
    if (!link.isConnected) return;
    link.remove();
    done(false);
  });
  // Named the look's sheet at once where it is the only one; beside another, once it has taken that one's place.
  if (!before) link.id = id;
  document.head.appendChild(link);
  return blocks;
}

/** What the head's script and the module are told: the looks and the names. */
export interface BootConfig {
  key: string;
  /** The event sent on `document` when the head's script changes the appearance shown (a look that came too late). */
  event: string;
  /**
   * Every look that is a shipped system, the default first, with the address of the stylesheet that draws it over the
   * default system's on the root (lib/look-sheets.mjs) — null for the default, which every page holds already.
   */
  looks: Record<string, string | null>;
  defaultLook: string;
  names: { theme: string; tanreiTheme: string; mode: string; contrast: string; look: string };
  shared: string;
  /** The look's stylesheet: its element's id, the root's marks while it is awaited and where it came too late, and how long the page waits for it. */
  sheet: { id: string; pending: string; late: string; wait: number };
  /**
   * The reader's own theme: where it is kept, its mark on the root, where its stylesheet is kept, the build that
   * computes it, and the worker that does (its script's address, null where the build does not name it; and where the
   * head's script leaves the worker it starts).
   */
  custom: { key: string; look: string; available: string; missing: string; db: string; store: string; build: string; held: string; worker: string | null; early: string };
}

/**
 * The configuration of a site whose shipped systems are `looks`, the first the default. `build` names what a theme's
 * stylesheet is computed from (lib/sheet-key.mjs): a sheet that another build computed is not used. `worker` is the
 * address of the script of the worker that computes it (lib/sheet-worker.mjs), or null. `sheets` is the address of
 * each other system's stylesheet, by id (`virtual:tanrei-docs/looks`).
 */
export const bootConfig = (looks: string[], build = '', worker: string | null = null, sheets: Readonly<Record<string, string>> = {}): BootConfig => ({
  key: APPEARANCE_KEY,
  event: APPEARANCE_EVENT,
  looks: Object.fromEntries(looks.map((look, at) => [look, at === 0 ? null : (sheets[look] ?? null)])),
  defaultLook: looks[0] ?? '',
  names: { theme: THEME_ATTR, tanreiTheme: TANREI_THEME_ATTR, mode: MODE_ATTR, contrast: CONTRAST_ATTR, look: LOOK_ATTR },
  shared: SHARED_ATTR,
  sheet: { id: LOOK_SHEET_ID, pending: PENDING_ATTR, late: LATE_ATTR, wait: REVEAL_AFTER },
  custom: { key: CUSTOM_KEY, look: CUSTOM_LOOK, available: CUSTOM_ATTR, missing: MISSING_ATTR, db: SHEET_STORE.db, store: SHEET_STORE.store, build, held: SHEET_HELD_KEY, worker, early: EARLY_WORKER },
});

/** Where a theme's stylesheet is kept: under the build's key and the layer's hash. */
export const sheetKey = (build: string, hash: string) => `${build}:${hash}`;

/**
 * The script of every page's head: before the first paint it shows the appearance the address shares, over the
 * stored one, else the stored one, else the default, and puts the look's stylesheet in. Storage that is blocked or
 * throws is a reader who has chosen nothing. Under a gallery example it links the example's sheet, which the first
 * paint waits for where the engine blocks rendering on it, and the page is hidden until it has loaded where it does
 * not. Under the reader's own theme the page is hidden until the theme's stylesheet is in, and two frames more: what
 * was measured under the default system's tokens is measured again before it is drawn. Where IndexedDB holds no sheet
 * for it, the script starts the worker that computes one (`EARLY_WORKER`, where the build names its script) and runs
 * at once the module after it, which takes the worker. A hidden page is shown after `REVEAL_AFTER` whatever happens: a
 * sheet not in by then is not used on that page (a gallery example's is fetched for the next one, `prefetch`), and the
 * change of look is announced as any other is (`docs-appearance`): the header then says what is drawn.
 */
export function appearanceBootstrap(config: BootConfig): string {
  return `(function(c){var me=document.currentScript,normalize=${normalize},sharedFrom=${sharedFrom},attributesOf=${attributesOf},customOf=${customOf},readSheet=${readSheet},placeSheet=${placeSheet},linkSheet=${linkSheet};var looks=Object.keys(c.looks),stored=null,custom=null;try{stored=JSON.parse(localStorage.getItem(c.key)||'null')}catch(e){}try{custom=customOf(JSON.parse(localStorage.getItem(c.custom.key)||'null'))}catch(e){}var asked=sharedFrom(location.search),given=stored&&typeof stored==='object'?stored:{},merged={};for(var k in given)merged[k]=given[k];if(asked)for(var a in asked)merged[a]=asked[a];var shown=normalize(merged,looks,c.defaultLook,!!custom),root=document.documentElement,attrs=attributesOf(shown,matchMedia('(prefers-color-scheme: dark)').matches,c.names);for(var n in attrs){if(attrs[n]===null)root.removeAttribute(n);else root.setAttribute(n,attrs[n])}if(asked)root.setAttribute(c.shared,'');if(custom)root.setAttribute(c.custom.available,'');var late=function(){root.setAttribute(c.names.look,c.defaultLook);root.setAttribute(c.sheet.late,shown.look);document.dispatchEvent(new CustomEvent(c.event,{detail:{appearance:{mode:shown.mode,contrast:shown.contrast,look:c.defaultLook},shared:!!asked}}))},href=c.looks[shown.look];if(href){var settled=false,blocks=linkSheet(href,c.sheet.id,true,function(loaded){settled=true;if(!loaded)late();root.removeAttribute(c.sheet.pending)});if(!blocks&&!settled){root.setAttribute(c.sheet.pending,'');setTimeout(function(){if(settled)return;var link=document.getElementById(c.sheet.id);if(link)link.remove();var next=document.createElement('link');next.rel='prefetch';next.href=href;document.head.appendChild(next);late();root.removeAttribute(c.sheet.pending)},c.sheet.wait)}}if(custom&&shown.look===c.custom.look){root.setAttribute(c.sheet.pending,'');var key=c.custom.build+':'+custom.hash;setTimeout(function(){if(!root.hasAttribute(c.sheet.pending))return;if(!document.getElementById(c.sheet.id))late();root.removeAttribute(c.sheet.pending)},c.sheet.wait);var held=null;try{held=localStorage.getItem(c.custom.held)}catch(e){}var answer=function(css){if(root.getAttribute(c.names.look)!==c.custom.look)return;if(css===null){root.setAttribute(c.custom.missing,key);if(c.custom.worker&&typeof Worker==='function')try{window[c.custom.early]=new Worker(c.custom.worker,{type:'module'})}catch(e){}if(me&&me.parentNode&&typeof MutationObserver==='function'){var start=function(){var next=me.nextElementSibling;while(next&&next.localName!=='script')next=next.nextElementSibling;if(!next)return false;if(next.type==='module'&&next.src){var early=document.createElement('script');early.type='module';early.src=next.src;document.head.appendChild(early)}return true};if(!start()){var parsed=new MutationObserver(function(){if(start())parsed.disconnect()});parsed.observe(me.parentNode,{childList:true})}}return}placeSheet(css,key,c.sheet.id);requestAnimationFrame(function(){requestAnimationFrame(function(){root.removeAttribute(c.sheet.pending)})})};if(held===key)readSheet(c.custom.db,c.custom.store,key,answer);else answer(null)}})(${JSON.stringify(config)})`;
}

/**
 * The script of a document that stands outside the site's frame (Theme Studio's page): the scheme
 * the reader forced, and the contrast, on its root as Tanrei's tokens read them. The device's mode writes no scheme:
 * the tokens follow the device there by themselves. Its own chrome stays in the default system, whatever the look.
 */
export const standaloneBootstrap = `(function(key){var normalize=${normalize},a;try{a=normalize(JSON.parse(localStorage.getItem(key)||'null'),[],'')}catch(e){a=normalize(null,[],'')}var root=document.documentElement;if(a.mode!=='system')root.setAttribute(${JSON.stringify(TANREI_THEME_ATTR)},a.mode);if(a.contrast!=='standard')root.setAttribute(${JSON.stringify(CONTRAST_ATTR)},a.contrast)})(${JSON.stringify(APPEARANCE_KEY)})`;

/** The address of `href` showing `appearance` (`?look=&mode=&contrast=`, any other part of the address kept). */
export function linkTo(href: string, appearance: Appearance): string {
  const url = new URL(href);
  url.searchParams.set(PARAMS.look, appearance.look);
  url.searchParams.set(PARAMS.mode, appearance.mode);
  url.searchParams.set(PARAMS.contrast, appearance.contrast);
  return url.href;
}

/** `href` without the appearance's names. */
export function withoutShared(href: string): string {
  const url = new URL(href);
  for (const name of Object.values(PARAMS)) url.searchParams.delete(name);
  return url.href;
}

// ── In the browser ───────────────────────────────────────────────────────────────────────────────────────────────────

/** The holder of what the head's script was told of, on the page (the Appearance panel, components/frame/Appearance.astro). */
const holder = () => (typeof document !== 'undefined' ? document.querySelector<HTMLElement>('[data-docs-looks]') : null);

/** The looks that are shipped systems, the default first. */
const looksOnPage = (): string[] => holder()?.dataset.docsLooks?.split(' ').filter(Boolean) ?? [];

/** The address of each gallery example's stylesheet, by look (lib/look-sheets.mjs). */
const sheetsOnPage = (): Record<string, string> => {
  try {
    const sheets = JSON.parse(holder()?.dataset.docsLookSheets ?? '{}');
    return sheets && typeof sheets === 'object' ? sheets : {};
  } catch {
    return {};
  }
};

const deviceDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

/** The reader's own theme this browser keeps, or null. */
export function keptCustom(): { hash: string } | null {
  try {
    return customOf(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

function readStored(looks: string[]): Appearance {
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null');
  } catch {}
  return normalize(stored, looks, looks[0] ?? '', keptCustom() !== null);
}

/** The appearance shown now, read from `<html>` (the head's script wrote it). */
export function shownAppearance(): Appearance {
  const root = document.documentElement;
  const looks = looksOnPage();
  const look = root.getAttribute(LOOK_ATTR);
  return normalize({ mode: root.getAttribute(MODE_ATTR), contrast: root.getAttribute(CONTRAST_ATTR) ?? 'standard', look }, looks.length ? looks : [look ?? ''], looks[0] ?? '', look === CUSTOM_LOOK);
}

/** The look that came too late for this page (`LATE_ATTR`), drawn in the default system: null on any other page. */
export const lateLook = (): string | null => document.documentElement.getAttribute(LATE_ATTR);

/** The appearance the reader asked for: the one shown, with the look that came too late for this page in its place. */
function chosenAppearance(): Appearance {
  const shown = shownAppearance();
  const late = lateLook();
  return late ? { ...shown, look: late } : shown;
}

/** Whether the page shows the appearance its address shares. */
export const isShared = () => document.documentElement.hasAttribute(SHARED_ATTR);

/** Each choice of the reader's own theme the page has, and where it stands. */
const customChoices = new Map<Element, Element>();
/**
 * The choices of the reader's own theme (`[data-docs-look-custom]`: the Appearance panel's item, the index's option)
 * in their place while this browser keeps a theme, and out of the document while it keeps none: a list counts what it
 * holds, and offers only what can be chosen.
 */
export function placeCustomChoices(): void {
  const kept = document.documentElement.hasAttribute(CUSTOM_ATTR);
  for (const choice of document.querySelectorAll('[data-docs-look-custom]')) if (!customChoices.has(choice) && choice.parentElement) customChoices.set(choice, choice.parentElement);
  for (const [choice, parent] of customChoices) {
    if (kept && !choice.isConnected) parent.append(choice);
    else if (!kept && choice.isConnected) choice.remove();
  }
}

/** The reader's theme's stylesheet, put in place once it is in (lib/custom-theme.ts, loaded when it is first needed). */
const drawCustom = () => import('./custom-theme').then((module) => module.showCustomSheet());

/** Says that the root's tokens changed: the look's sheet is in, another took its place, or it was taken away. */
const announceSheet = () => document.dispatchEvent(new CustomEvent(LOOK_SHEET_EVENT));

/** Says that the appearance shown changed: what `<html>` says now. */
const announce = (shared: boolean) => document.dispatchEvent(new CustomEvent<AppearanceDetail>(APPEARANCE_EVENT, { detail: { appearance: shownAppearance(), shared } }));

/**
 * The look's stylesheet in place, the one way for every look: a gallery example's linked — the one before it kept
 * until it has loaded, so that the page is never drawn in neither — the reader's own theme's put in by
 * lib/custom-theme.ts, and none for the default system, whose tokens are the root's. `late` is the look that came too
 * late for this page, which it goes on drawing in the default system (`look`), or null.
 */
function showLook(look: string, late: string | null): void {
  const root = document.documentElement;
  const custom = keptCustom();
  root.toggleAttribute(CUSTOM_ATTR, custom !== null);
  if (late) root.setAttribute(LATE_ATTR, late);
  else root.removeAttribute(LATE_ATTR);
  root.removeAttribute(PENDING_ATTR);
  const href = sheetsOnPage()[look];
  // A link still loading for another look is no longer asked for.
  for (const link of document.querySelectorAll('link[data-docs-look-sheet]')) if (link.id !== LOOK_SHEET_ID && link.getAttribute('href') !== href) link.remove();
  const current = document.getElementById(LOOK_SHEET_ID);
  if (custom && look === CUSTOM_LOOK) {
    void drawCustom();
    return;
  }
  if (href) {
    if (current?.localName === 'link' && current.getAttribute('href') === href) return;
    linkSheet(href, LOOK_SHEET_ID, false, (loaded) => {
      if (loaded) return announceSheet();
      console.warn(`[docs] The stylesheet of ${look} could not be loaded: the page is drawn in the default system.`);
      if (root.getAttribute(LOOK_ATTR) !== look) return;
      document.getElementById(LOOK_SHEET_ID)?.remove();
      root.setAttribute(LOOK_ATTR, looksOnPage()[0] ?? '');
      root.setAttribute(LATE_ATTR, look);
      announceSheet();
      announce(isShared());
    });
    return;
  }
  for (const link of document.querySelectorAll('link[data-docs-look-sheet]')) link.remove();
  if (current) {
    current.remove();
    announceSheet();
  }
}

/**
 * The appearance `chosen` shown. A look that came too late for this page stays drawn in the default system while it is
 * still the one chosen, unless `apply`: only the reader's own choice of it puts its sheet in on this page — a sheet put
 * in by itself would move everything drawn.
 */
function show(chosen: Appearance, shared: boolean, apply: boolean): void {
  const root = document.documentElement;
  const before = shownAppearance();
  const lateBefore = lateLook();
  const scheme = root.getAttribute(THEME_ATTR);
  const late = !apply && lateBefore !== null && chosen.look === lateBefore ? lateBefore : null;
  const appearance = late ? { ...chosen, look: looksOnPage()[0] ?? chosen.look } : chosen;
  for (const [name, value] of Object.entries(attributesOf(appearance, deviceDark(), bootConfig([]).names))) {
    if (value === null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
  root.toggleAttribute(SHARED_ATTR, shared);
  showLook(appearance.look, late);
  const changed = before.mode !== appearance.mode || before.contrast !== appearance.contrast || before.look !== appearance.look || lateBefore !== late || scheme !== root.getAttribute(THEME_ATTR);
  if (changed) announce(shared);
}

/**
 * The reader changes the appearance: what they chose before with `change` over it is kept, shown and announced. A page
 * that showed a shared appearance shows the reader's own from here on, and its address loses the shared names. On a
 * page whose look came too late, that look is still the one kept, and is put in only where `change` chooses it.
 */
export function setAppearance(change: Partial<Appearance>): Appearance {
  const looks = looksOnPage();
  const next = normalize({ ...chosenAppearance(), ...change }, looks, looks[0] ?? '', keptCustom() !== null);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {}
  if (isShared()) history.replaceState(history.state, '', withoutShared(location.href));
  show(next, false, change.look !== undefined);
  return next;
}

/** The reader keeps the shared appearance as their own. */
export const keepShared = () => setAppearance({});

/**
 * The reader asks for the look that came too late for this page on this page: its sheet put in now, as a choice of it
 * in the panel would. A shared appearance stays the address's, and nothing is kept.
 */
export function applyLate(): void {
  const look = lateLook();
  if (!look) return;
  if (isShared()) show({ ...shownAppearance(), look }, true, true);
  else setAppearance({ look });
}

/** Calls `listener` with the appearance whenever it changes. */
export function onAppearance(listener: (detail: AppearanceDetail) => void): void {
  document.addEventListener(APPEARANCE_EVENT, (event) => listener((event as CustomEvent<AppearanceDetail>).detail));
}

if (typeof document !== 'undefined' && typeof matchMedia === 'function') {
  // The device's scheme, while the mode is the device's.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const chosen = chosenAppearance();
    if (chosen.mode === 'system') show(chosen, isShared(), false);
  });
  // A choice made in another tab of the site, or a theme Theme Studio gave the docs there; a page that shows a shared
  // appearance keeps showing it.
  addEventListener('storage', (event) => {
    if (event.key !== APPEARANCE_KEY && event.key !== CUSTOM_KEY && event.key !== null) return;
    if (isShared()) {
      document.documentElement.toggleAttribute(CUSTOM_ATTR, keptCustom() !== null);
      return;
    }
    show(readStored(looksOnPage()), false, false);
  });
  // The reader's theme, where the head's script found it the look: its stylesheet, if IndexedDB did not hold it (and,
  // where the page could not wait for it, kept for the next page). The head's module (ThemeProvider.astro) has asked for
  // it already, before any module that defines an element runs: this asks for the same, and waits for that.
  if (document.documentElement.getAttribute(LOOK_ATTR) === CUSTOM_LOOK || document.documentElement.getAttribute(LATE_ATTR) === CUSTOM_LOOK) void drawCustom();
}

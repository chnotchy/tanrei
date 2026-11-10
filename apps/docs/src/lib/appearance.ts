// How the docs look to the reader, in one place: the color mode (the device's, light or dark), the contrast
// (standard, medium, high) and the look — Tanrei's own design system, one of the showcase systems that imitate
// another design system, or the reader's own theme ("My theme"), made in Theme Studio and kept in this browser. One
// type, one key of the origin's storage, one set of attributes on `<html>`, one event.
//
//   `<html>`            data-theme             the scheme drawn, light or dark (the framework's styles and
//                                              styles/tanrei-theme.css, which turns it into `color-scheme`)
//                       data-tanrei-theme      the same scheme, as Tanrei's tokens read it on any element
//                       data-docs-mode         what the reader chose: system, light or dark
//                       data-tanrei-contrast   medium or high; absent for standard (the tokens are resolved at :root)
//                       data-docs-system       the look: a shipped system's id, which every frame draws its stage under
//                                              (lib/example.ts) and the lists of components follow (lib/list-filter.ts),
//                                              or `custom`: the reader's own theme, which the whole page is drawn in
//                       data-docs-custom       present while this browser keeps a theme of the reader's own
//                       data-docs-custom-base  while the look is the reader's theme: the shipped system it extends, whose
//                                              components the lists show
//                       data-docs-appearance-pending  while the look is the reader's theme and its stylesheet is not in
//                                              yet: nothing of the page is drawn (styles/tanrei-theme.css)
//                       data-docs-custom-missing  while the look is the reader's theme and IndexedDB, asked by the
//                                              head's script, held no stylesheet for it: the key it is computed under
//                       data-docs-custom-late  on a page whose theme's stylesheet was not in after `REVEAL_AFTER`: the
//                                              page is drawn in the default system, and the sheet is kept for the next
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
//                       changes — here, in another tab of the site (the `storage` event), or with the device's scheme
//                       while the mode is the device's.
//   the address         `?look=<id>&mode=<mode>&contrast=<contrast>`: a link to a page as someone else sees it. It is
//                       shown on that page and not kept: the header offers to keep it (Header.astro), and any choice the
//                       reader makes from there is kept whole and leaves the address.
//
// The head's script (`appearanceBootstrap`, written by components/frame/ThemeProvider.astro in place of the framework's
// own theme script) applies the stored or shared appearance before the first paint. It is made of the same functions
// as the module below — each written as a function of its arguments alone, so that its text is the script — and never
// a second copy of them. Under the reader's own theme it hides the page until the theme's stylesheet is in: read from
// IndexedDB at once, else computed by lib/custom-theme.ts, which the module right after the head's script asks for
// (components/frame/ThemeProvider.astro) — where the head's script found no sheet kept, at once, before the document is
// parsed, and in the worker the head's script starts then (`EARLY_WORKER`). After `REVEAL_AFTER` it shows the page
// whatever happens — without the sheet, in the default system, which that page keeps.
import { ABSENT_ATTR, SYSTEM_ATTR, SYSTEM_ONLY_ATTR, SYSTEM_RULE_ID } from './listing.mjs';

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
export const LOOK_ATTR = SYSTEM_ATTR;
export const SHARED_ATTR = 'data-docs-appearance-shared';
/** The address's names. */
export const PARAMS = { look: 'look', mode: 'mode', contrast: 'contrast' } as const;

/** The look of the reader's own theme. A shipped system is never so named: its id is a layer's, and no layer of the repository is. */
export const CUSTOM_LOOK = 'custom';
/** Where the reader's own theme is kept: `{ hash, layer }`. */
export const CUSTOM_KEY = 'tanrei-docs-custom-theme';
export const CUSTOM_ATTR = 'data-docs-custom';
export const CUSTOM_BASE_ATTR = 'data-docs-custom-base';
export const PENDING_ATTR = 'data-docs-appearance-pending';
/** On a page whose theme's stylesheet was not in after `REVEAL_AFTER`: the page is drawn in the default system, and the sheet is kept for the next. */
export const LATE_ATTR = 'data-docs-custom-late';
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
/** The `<style>` that holds the reader's theme while it is the look. */
export const CUSTOM_STYLE_ID = 'docs-custom-system';
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
 * The longest the page stays hidden for the theme's stylesheet, in milliseconds. A sheet not in by then is not put in
 * on that page — it would move everything drawn: the page is drawn in the default system, its look says so, and the
 * sheet, once computed, is kept for the next page (`LATE_ATTR`).
 */
export const REVEAL_AFTER = 3000;
/** Sent on `document` once the reader's theme's stylesheet is in, or another took its place. */
export const CUSTOM_SHEET_EVENT = 'docs-custom-sheet';

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

/**
 * The reader's own theme as storage keeps it (parsed JSON, or nothing): its hash, and the shipped system it extends —
 * the default where it extends another — or null where there is none, or none that can be read.
 */
export function customOf(value: unknown, looks: readonly string[]): { hash: string; base: string } | null {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const layer = (given.layer && typeof given.layer === 'object' ? given.layer : null) as Record<string, unknown> | null;
  if (typeof given.hash !== 'string' || !/^[0-9a-z]{1,32}$/.test(given.hash) || !layer) return null;
  const base = typeof layer.extends === 'string' && looks.indexOf(layer.extends) >= 0 ? layer.extends : looks[0] || '';
  return { hash: given.hash, base };
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

/** The reader's theme's stylesheet put in place: one `<style>` at the end of the head, named by its key, in the place of any before it. */
export function placeSheet(css: string, key: string, id: string): void {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
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

/** The rule that hides, from the first paint, what the look does not have in the lists, and what is said under another look only. */
export function listRuleOf(look: string, absent: string, only: string): string {
  return `[${absent}~="${look}"],[${only}]:not([${only}="${look}"]){display:none}`;
}

/** What the head's script and the module are told: the looks and the names. */
export interface BootConfig {
  key: string;
  looks: string[];
  defaultLook: string;
  names: { theme: string; tanreiTheme: string; mode: string; contrast: string; look: string };
  shared: string;
  rule: { id: string; absent: string; only: string };
  /**
   * The reader's own theme: where it is kept, its marks on the root, where its stylesheet is kept, the build that
   * computes it, and the worker that does (its script's address, null where the build does not name it; and where the
   * head's script leaves the worker it starts).
   */
  custom: { key: string; look: string; available: string; base: string; pending: string; late: string; missing: string; style: string; db: string; store: string; build: string; wait: number; held: string; worker: string | null; early: string };
}

/**
 * The configuration of a site whose shipped systems are `looks`, the first the default. `build` names what a theme's
 * stylesheet is computed from (lib/sheet-key.mjs): a sheet that another build computed is not used. `worker` is the
 * address of the script of the worker that computes it (lib/sheet-worker.mjs), or null.
 */
export const bootConfig = (looks: string[], build = '', worker: string | null = null): BootConfig => ({
  key: APPEARANCE_KEY,
  looks,
  defaultLook: looks[0] ?? '',
  names: { theme: THEME_ATTR, tanreiTheme: TANREI_THEME_ATTR, mode: MODE_ATTR, contrast: CONTRAST_ATTR, look: LOOK_ATTR },
  shared: SHARED_ATTR,
  rule: { id: SYSTEM_RULE_ID, absent: ABSENT_ATTR, only: SYSTEM_ONLY_ATTR },
  custom: { key: CUSTOM_KEY, look: CUSTOM_LOOK, available: CUSTOM_ATTR, base: CUSTOM_BASE_ATTR, pending: PENDING_ATTR, late: LATE_ATTR, missing: MISSING_ATTR, style: CUSTOM_STYLE_ID, db: SHEET_STORE.db, store: SHEET_STORE.store, build, wait: REVEAL_AFTER, held: SHEET_HELD_KEY, worker, early: EARLY_WORKER },
});

/** Where a theme's stylesheet is kept: under the build's key and the layer's hash. */
export const sheetKey = (build: string, hash: string) => `${build}:${hash}`;

/**
 * The script of every page's head: before the first paint it shows the appearance the address shares, over the
 * stored one, else the stored one, else the default; and writes the rule that hides what the look does not have in
 * the lists of components. Storage that is blocked or throws is a reader who has chosen nothing. Under the reader's
 * own theme the lists are those of the system it extends, and the page is hidden until the theme's stylesheet is in,
 * and two frames more: what was measured under the default system's tokens is measured again before it is drawn.
 * Where IndexedDB holds no sheet for it, the script starts the worker that computes one (`EARLY_WORKER`, where the
 * build names its script) and runs at once the module after it, which takes the worker.
 */
export function appearanceBootstrap(config: BootConfig): string {
  return `(function(c){var me=document.currentScript,normalize=${normalize},sharedFrom=${sharedFrom},attributesOf=${attributesOf},listRuleOf=${listRuleOf},customOf=${customOf},readSheet=${readSheet},placeSheet=${placeSheet};var stored=null,custom=null;try{stored=JSON.parse(localStorage.getItem(c.key)||'null')}catch(e){}try{custom=customOf(JSON.parse(localStorage.getItem(c.custom.key)||'null'),c.looks)}catch(e){}var asked=sharedFrom(location.search),given=stored&&typeof stored==='object'?stored:{},merged={};for(var k in given)merged[k]=given[k];if(asked)for(var a in asked)merged[a]=asked[a];var shown=normalize(merged,c.looks,c.defaultLook,!!custom),root=document.documentElement,attrs=attributesOf(shown,matchMedia('(prefers-color-scheme: dark)').matches,c.names);for(var n in attrs){if(attrs[n]===null)root.removeAttribute(n);else root.setAttribute(n,attrs[n])}if(asked)root.setAttribute(c.shared,'');if(custom)root.setAttribute(c.custom.available,'');var listed=shown.look;if(custom&&shown.look===c.custom.look){listed=custom.base;root.setAttribute(c.custom.base,custom.base);root.setAttribute(c.custom.pending,'');var key=c.custom.build+':'+custom.hash;setTimeout(function(){if(!root.hasAttribute(c.custom.pending))return;if(!document.getElementById(c.custom.style)){root.setAttribute(c.names.look,c.defaultLook);root.removeAttribute(c.custom.base);root.setAttribute(c.custom.late,'')}root.removeAttribute(c.custom.pending)},c.custom.wait);var held=null;try{held=localStorage.getItem(c.custom.held)}catch(e){}var answer=function(css){if(root.getAttribute(c.names.look)!==c.custom.look)return;if(css===null){root.setAttribute(c.custom.missing,key);if(c.custom.worker&&typeof Worker==='function')try{window[c.custom.early]=new Worker(c.custom.worker,{type:'module'})}catch(e){}if(me&&me.parentNode&&typeof MutationObserver==='function'){var start=function(){var next=me.nextElementSibling;while(next&&next.localName!=='script')next=next.nextElementSibling;if(!next)return false;if(next.type==='module'&&next.src){var early=document.createElement('script');early.type='module';early.src=next.src;document.head.appendChild(early)}return true};if(!start()){var parsed=new MutationObserver(function(){if(start())parsed.disconnect()});parsed.observe(me.parentNode,{childList:true})}}return}placeSheet(css,key,c.custom.style);requestAnimationFrame(function(){requestAnimationFrame(function(){root.removeAttribute(c.custom.pending)})})};if(held===key)readSheet(c.custom.db,c.custom.store,key,answer);else answer(null)}var r=document.createElement('style');r.id=c.rule.id;r.textContent=listRuleOf(listed,c.rule.absent,c.rule.only);document.head.appendChild(r)})(${JSON.stringify(config)})`;
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

/** The looks the head's script was told of: the systems the root's lists know, read from the page (Header.astro). */
const looksOnPage = (): string[] => {
  const holder = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('[data-docs-looks]') : null;
  return holder?.dataset.docsLooks?.split(' ').filter(Boolean) ?? [];
};

const deviceDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

/** The reader's own theme this browser keeps, or null. */
export function keptCustom(looks: string[] = looksOnPage()): { hash: string; base: string } | null {
  try {
    return customOf(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null'), looks);
  } catch {
    return null;
  }
}

function readStored(looks: string[]): Appearance {
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null');
  } catch {}
  return normalize(stored, looks, looks[0] ?? '', keptCustom(looks) !== null);
}

/** The appearance shown now, read from `<html>` (the head's script wrote it). */
export function shownAppearance(): Appearance {
  const root = document.documentElement;
  const looks = looksOnPage();
  const look = root.getAttribute(LOOK_ATTR);
  return normalize({ mode: root.getAttribute(MODE_ATTR), contrast: root.getAttribute(CONTRAST_ATTR) ?? 'standard', look }, looks.length ? looks : [look ?? ''], looks[0] ?? '', look === CUSTOM_LOOK);
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

/**
 * The marks of the reader's own theme on the root, and its stylesheet: in place while it is the look, taken away
 * when it is not — the page is drawn in the default system's tokens again.
 */
function showCustom(look: string): void {
  const root = document.documentElement;
  const custom = keptCustom();
  root.toggleAttribute(CUSTOM_ATTR, custom !== null);
  if (custom && look === CUSTOM_LOOK) {
    root.setAttribute(CUSTOM_BASE_ATTR, custom.base);
    root.removeAttribute(LATE_ATTR);
    void drawCustom();
    return;
  }
  root.removeAttribute(CUSTOM_BASE_ATTR);
  root.removeAttribute(PENDING_ATTR);
  if (document.getElementById(CUSTOM_STYLE_ID)) {
    document.getElementById(CUSTOM_STYLE_ID)?.remove();
    document.dispatchEvent(new CustomEvent(CUSTOM_SHEET_EVENT));
  }
}

function show(appearance: Appearance, shared: boolean): void {
  const root = document.documentElement;
  const before = shownAppearance();
  const scheme = root.getAttribute(THEME_ATTR);
  for (const [name, value] of Object.entries(attributesOf(appearance, deviceDark(), bootConfig([]).names))) {
    if (value === null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
  root.toggleAttribute(SHARED_ATTR, shared);
  showCustom(appearance.look);
  const changed = before.mode !== appearance.mode || before.contrast !== appearance.contrast || before.look !== appearance.look || scheme !== root.getAttribute(THEME_ATTR);
  if (changed) document.dispatchEvent(new CustomEvent<AppearanceDetail>(APPEARANCE_EVENT, { detail: { appearance, shared } }));
}

/**
 * The reader changes the appearance: what is shown now with `change` over it is kept, shown and announced. A page
 * that showed a shared appearance shows the reader's own from here on, and its address loses the shared names.
 */
export function setAppearance(change: Partial<Appearance>): Appearance {
  const looks = looksOnPage();
  const next = normalize({ ...shownAppearance(), ...change }, looks, looks[0] ?? '', keptCustom(looks) !== null);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {}
  if (isShared()) history.replaceState(history.state, '', withoutShared(location.href));
  show(next, false);
  return next;
}

/** The reader keeps the shared appearance as their own. */
export const keepShared = () => setAppearance({});

/** Calls `listener` with the appearance whenever it changes. */
export function onAppearance(listener: (detail: AppearanceDetail) => void): void {
  document.addEventListener(APPEARANCE_EVENT, (event) => listener((event as CustomEvent<AppearanceDetail>).detail));
}

if (typeof document !== 'undefined' && typeof matchMedia === 'function') {
  // The device's scheme, while the mode is the device's.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const shown = shownAppearance();
    if (shown.mode === 'system') show(shown, isShared());
  });
  // A choice made in another tab of the site, or a theme Theme Studio gave the docs there; a page that shows a shared
  // appearance keeps showing it.
  addEventListener('storage', (event) => {
    if (event.key !== APPEARANCE_KEY && event.key !== CUSTOM_KEY && event.key !== null) return;
    if (isShared()) {
      document.documentElement.toggleAttribute(CUSTOM_ATTR, keptCustom() !== null);
      return;
    }
    show(readStored(looksOnPage()), false);
  });
  // The reader's theme, where the head's script found it the look: its stylesheet, if IndexedDB did not hold it (and,
  // where the page could not wait for it, kept for the next page). The head's module (ThemeProvider.astro) has asked for
  // it already, before any module that defines an element runs: this asks for the same, and waits for that.
  if (document.documentElement.getAttribute(LOOK_ATTR) === CUSTOM_LOOK || document.documentElement.hasAttribute(LATE_ATTR)) void drawCustom();
}

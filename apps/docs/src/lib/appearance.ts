// How the docs look to the reader, in one place: the color mode (the device's, light or dark), the contrast
// (standard, medium, high) and the look — Tanrei's own design system, or one of the showcase systems that imitate
// another design system. One type, one key of the origin's storage, one set of attributes on `<html>`, one event.
//
//   `<html>`            data-theme             the scheme drawn, light or dark (the framework's styles and
//                                              styles/tanrei-theme.css, which turns it into `color-scheme`)
//                       data-tanrei-theme      the same scheme, as Tanrei's tokens read it on any element
//                       data-docs-mode         what the reader chose: system, light or dark
//                       data-tanrei-contrast   medium or high; absent for standard (the tokens are resolved at :root)
//                       data-docs-system       the look: a shipped system's id, which every frame draws its stage under
//                                              (lib/example.ts) and the lists of components follow (lib/list-filter.ts)
//                       data-docs-appearance-shared   present while the page shows an appearance from its address
//   storage             `tanrei-docs-appearance`: `{ mode, contrast, look }` as JSON. Nothing else is read: a choice
//                       kept under an older key is not carried over.
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
// a second copy of them.
import { ABSENT_ATTR, SYSTEM_ATTR, SYSTEM_ONLY_ATTR, SYSTEM_RULE_ID } from './listing.mjs';

export type Mode = 'system' | 'light' | 'dark';
export type Contrast = 'standard' | 'medium' | 'high';
export type Scheme = 'light' | 'dark';

/** How the docs look: one value of this type is stored, shown, shared and announced. */
export interface Appearance {
  mode: Mode;
  contrast: Contrast;
  /** A shipped system's id: the default system, or a showcase system. */
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
 */
export function normalize(value: unknown, looks: readonly string[], defaultLook: string): Appearance {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const mode = given.mode === 'light' || given.mode === 'dark' ? given.mode : 'system';
  const contrast = given.contrast === 'medium' || given.contrast === 'high' ? given.contrast : 'standard';
  const look = typeof given.look === 'string' && looks.indexOf(given.look) >= 0 ? given.look : defaultLook;
  return { mode, contrast, look };
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
}

/** The configuration of a site whose shipped systems are `looks`, the first the default. */
export const bootConfig = (looks: string[]): BootConfig => ({
  key: APPEARANCE_KEY,
  looks,
  defaultLook: looks[0] ?? '',
  names: { theme: THEME_ATTR, tanreiTheme: TANREI_THEME_ATTR, mode: MODE_ATTR, contrast: CONTRAST_ATTR, look: LOOK_ATTR },
  shared: SHARED_ATTR,
  rule: { id: SYSTEM_RULE_ID, absent: ABSENT_ATTR, only: SYSTEM_ONLY_ATTR },
});

/**
 * The script of every page's head: before the first paint it shows the appearance the address shares, over the
 * stored one, else the stored one, else the default; and writes the rule that hides what the look does not have in
 * the lists of components. Storage that is blocked or throws is a reader who has chosen nothing.
 */
export function appearanceBootstrap(config: BootConfig): string {
  return `(function(c){var normalize=${normalize},sharedFrom=${sharedFrom},attributesOf=${attributesOf},listRuleOf=${listRuleOf};var stored=null;try{stored=JSON.parse(localStorage.getItem(c.key)||'null')}catch(e){}var asked=sharedFrom(location.search),given=stored&&typeof stored==='object'?stored:{},merged={};for(var k in given)merged[k]=given[k];if(asked)for(var a in asked)merged[a]=asked[a];var shown=normalize(merged,c.looks,c.defaultLook),root=document.documentElement,attrs=attributesOf(shown,matchMedia('(prefers-color-scheme: dark)').matches,c.names);for(var n in attrs){if(attrs[n]===null)root.removeAttribute(n);else root.setAttribute(n,attrs[n])}if(asked)root.setAttribute(c.shared,'');var r=document.createElement('style');r.id=c.rule.id;r.textContent=listRuleOf(shown.look,c.rule.absent,c.rule.only);document.head.appendChild(r)})(${JSON.stringify(config)})`;
}

/**
 * The script of a document that stands outside the site's frame (Theme Studio's page): the scheme
 * the reader forced, and the contrast, on its root as Tanrei's tokens read them. The device's mode writes no scheme:
 * the tokens follow the device there by themselves.
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

function readStored(looks: string[]): Appearance {
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null');
  } catch {}
  return normalize(stored, looks, looks[0] ?? '');
}

/** The appearance shown now, read from `<html>` (the head's script wrote it). */
export function shownAppearance(): Appearance {
  const root = document.documentElement;
  const looks = looksOnPage();
  return normalize({ mode: root.getAttribute(MODE_ATTR), contrast: root.getAttribute(CONTRAST_ATTR) ?? 'standard', look: root.getAttribute(LOOK_ATTR) }, looks.length ? looks : [root.getAttribute(LOOK_ATTR) ?? ''], looks[0] ?? '');
}

/** Whether the page shows the appearance its address shares. */
export const isShared = () => document.documentElement.hasAttribute(SHARED_ATTR);

function show(appearance: Appearance, shared: boolean): void {
  const root = document.documentElement;
  const before = shownAppearance();
  const scheme = root.getAttribute(THEME_ATTR);
  for (const [name, value] of Object.entries(attributesOf(appearance, deviceDark(), bootConfig([]).names))) {
    if (value === null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
  root.toggleAttribute(SHARED_ATTR, shared);
  const changed = before.mode !== appearance.mode || before.contrast !== appearance.contrast || before.look !== appearance.look || scheme !== root.getAttribute(THEME_ATTR);
  if (changed) document.dispatchEvent(new CustomEvent<AppearanceDetail>(APPEARANCE_EVENT, { detail: { appearance, shared } }));
}

/**
 * The reader changes the appearance: what is shown now with `change` over it is kept, shown and announced. A page
 * that showed a shared appearance shows the reader's own from here on, and its address loses the shared names.
 */
export function setAppearance(change: Partial<Appearance>): Appearance {
  const looks = looksOnPage();
  const next = normalize({ ...shownAppearance(), ...change }, looks, looks[0] ?? '');
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
  // A choice made in another tab of the site; a page that shows a shared appearance keeps showing it.
  addEventListener('storage', (event) => {
    if (event.key !== APPEARANCE_KEY && event.key !== null) return;
    if (isShared()) return;
    show(readStored(looksOnPage()), false);
  });
}

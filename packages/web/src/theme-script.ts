// `@tanrei/web/theme-script`: a person's choice of theme, kept across visits and drawn from the first frame.
//
// The tokens follow the operating system by default (`light-dark()`), and `data-tanrei-theme` on `<html>` forces a
// theme. A product that lets a person choose one has to store the choice, and to set the attribute before the page is
// first drawn: set by a script that runs after the first frame, the page flashes the other theme first. So:
//
//   <script>{themeScript()}</script>        in <head>, inline, before any stylesheet: the stored choice, at once
//   saveTheme('dark')                       when the person chooses: stored, and drawn now
//   loadTheme()                             what was stored: 'light', 'dark' or 'system'
//
// 'system' is no choice: the key is taken away and the attribute with it, and the page follows the system again.
// Storage that is blocked or full is no error: the page follows the system. Nothing here runs when the module is
// imported, so a server can import it to write the inline script; the script is a few hundred bytes and imports nothing.

/** A person's choice: one of the two themes, or the operating system's. */
export type ThemeChoice = 'light' | 'dark' | 'system';

export interface ThemeOptions {
  /** The key the choice is stored under in `localStorage`. `tanrei-theme` when left out. */
  storageKey?: string;
}

/** The key the choice is stored under when none is given. */
export const THEME_STORAGE_KEY = 'tanrei-theme';
/** The attribute the tokens read on `<html>` (and on any subtree) to force a theme. */
export const THEME_ATTRIBUTE = 'data-tanrei-theme';

const forced = (value: unknown): value is 'light' | 'dark' => value === 'light' || value === 'dark';

/**
 * The script to inline in `<head>`, before the stylesheets: it puts the stored theme on `<html>` while the page is
 * still being parsed, so the first frame is drawn in it. Its text is the same on the server and in the browser.
 */
export function themeScript({ storageKey = THEME_STORAGE_KEY }: ThemeOptions = {}): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)});if(t==="light"||t==="dark")document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t)}catch(e){}})();`;
}

/** What was stored: `'light'` or `'dark'`, else `'system'` (nothing stored, something else stored, or no storage). */
export function loadTheme({ storageKey = THEME_STORAGE_KEY }: ThemeOptions = {}): ThemeChoice {
  try {
    const stored = localStorage.getItem(storageKey);
    return forced(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Stores a person's choice and draws it now: `'light'` or `'dark'` is stored and put on `<html>`; `'system'` takes
 * both away, and the page follows the operating system. Where storage is blocked, the choice is still drawn, for this
 * page.
 */
export function saveTheme(theme: ThemeChoice, { storageKey = THEME_STORAGE_KEY }: ThemeOptions = {}): void {
  const root = document.documentElement;
  try {
    if (forced(theme)) localStorage.setItem(storageKey, theme);
    else localStorage.removeItem(storageKey);
  } catch {
    // No storage: the choice lasts as long as the page.
  }
  if (forced(theme)) root.setAttribute(THEME_ATTRIBUTE, theme);
  else root.removeAttribute(THEME_ATTRIBUTE);
}

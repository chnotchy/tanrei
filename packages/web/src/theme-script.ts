// `@tanrei/web/theme-script`: a person's choice of theme, kept across visits and drawn from the first frame.
//
// The tokens follow the operating system by default (`light-dark()`), and `data-tanrei-theme` on `<html>` forces a
// theme. A product that lets a person choose one has to store the choice, and to set the attribute before the page is
// first drawn: set by a script that runs after the first frame, the page flashes the other theme first. So:
//
//   <script>{themeScript()}</script>        in <head>, inline, before any stylesheet: the stored choice, at once
//   saveTheme('dark')                       when the person chooses: stored, and drawn now
//   loadTheme()                             what was stored: 'light', 'dark' or 'system'
//   themeColorMeta(colors)                  in <head>, before the script: the browser's own interface in the page's colors
//
// 'system' is no choice: the key is taken away and the attribute with it, and the page follows the system again.
// Storage that is blocked or full is no error: the page follows the system. Nothing here runs when the module is
// imported, so a server can import it to write the inline script; the script is a few hundred bytes and imports nothing.
//
// The browser paints its own interface (an address bar, a title bar) in the page's `theme-color`. `themeColorMeta()`
// writes one `<meta name="theme-color">` per scheme from a system's theme colors
// (`@tanrei/web/systems/<id>.theme-color.json`: the surface of each scheme), each with the media query that picks it.
// Written before the inline script, they follow a stored theme too: the script and `saveTheme()` point them at the
// chosen theme.

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

/** The attribute that names the scheme of a theme-color tag `themeColorMeta()` writes. */
export const THEME_COLOR_ATTRIBUTE = 'data-tanrei-theme-color';

/**
 * A system's theme color in each scheme, as `@tanrei/web/systems/<id>.theme-color.json` holds it (`tanrei build` writes
 * a product's beside its stylesheet): the system's surface, `#rrggbb`.
 */
export type ThemeColors = Partial<Record<'light' | 'dark' | 'light-high' | 'dark-high', string>>;

const MORE_CONTRAST = '(prefers-contrast: more)';
/**
 * The schemes a browser can be asked for, the most specific first: a browser takes the first theme-color tag whose
 * media query matches. Medium contrast is set on the page (`data-tanrei-contrast`), never asked of the browser.
 */
const THEME_COLOR_SCHEMES = ['dark-high', 'light-high', 'dark', 'light'] as const;

/** The media query of a scheme's tag: what the operating system asks for, or, with a theme chosen, that theme alone. */
function themeColorMedia(scheme: string, theme: ThemeChoice): string {
  const [base, level] = scheme.split('-');
  if (forced(theme) && base !== theme) return 'not all';
  return [!forced(theme) && base === 'dark' ? '(prefers-color-scheme: dark)' : '', level ? MORE_CONTRAST : ''].filter(Boolean).join(' and ') || 'all';
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The `<meta name="theme-color">` tags to write in `<head>`, before the inline script: one per scheme in `colors`, the
 * most specific first, each with the media query that picks it.
 */
export function themeColorMeta(colors: ThemeColors): string {
  return THEME_COLOR_SCHEMES.filter((scheme) => colors[scheme])
    .map((scheme) => `<meta name="theme-color" content="${escapeAttribute(colors[scheme]!)}" media="${themeColorMedia(scheme, 'system')}" ${THEME_COLOR_ATTRIBUTE}="${scheme}">`)
    .join('');
}

/** Points the theme-color tags `themeColorMeta()` wrote at a theme, or back at the operating system's. */
function drawThemeColor(theme: ThemeChoice): void {
  for (const meta of document.querySelectorAll(`meta[${THEME_COLOR_ATTRIBUTE}]`)) meta.setAttribute('media', themeColorMedia(meta.getAttribute(THEME_COLOR_ATTRIBUTE)!, theme));
}

/**
 * The script to inline in `<head>`, before the stylesheets: it puts the stored theme on `<html>` while the page is
 * still being parsed, so the first frame is drawn in it. Its text is the same on the server and in the browser.
 */
export function themeScript({ storageKey = THEME_STORAGE_KEY }: ThemeOptions = {}): string {
  // With a theme stored, the theme-color tags are pointed at it as `themeColorMedia()` does, written small: the other
  // theme's tags match nothing, and the chosen theme's match always (its high-contrast tag when more contrast is asked).
  const color = JSON.stringify(THEME_COLOR_ATTRIBUTE);
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)});if(t==="light"||t==="dark"){document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);document.querySelectorAll(${JSON.stringify(`meta[${THEME_COLOR_ATTRIBUTE}]`)}).forEach(function(m){var s=m.getAttribute(${color}).split("-");m.setAttribute("media",s[0]!==t?"not all":s[1]?${JSON.stringify(MORE_CONTRAST)}:"all")})}}catch(e){}})();`;
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
  drawThemeColor(theme);
}

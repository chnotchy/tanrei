// `@tanrei/web/keyboard-convention`: a keyboard shortcut drawn by a page written on a server before the element is
// defined, as the element will draw it.
//
// A `<tanrei-keyboard-shortcut>` draws its keys in the reader's convention: under `convention="auto"`, the nearest
// ancestor's `data-tanrei-keyboard-convention`, else the platform's — Apple's symbols on Apple's platforms (⇧⌘K, one cap
// per key), the names elsewhere (Ctrl+Shift+K). Until its module has arrived the element is not defined, and what a
// page puts between its tags is drawn instead. Words there take another width than the caps, and the line they stand
// in wraps again when the caps are drawn: what stands below moves. So a page that must hold its room writes the keys
// the element will draw, and loads the stylesheet that draws them (`@tanrei/web/keyboard-shortcut.css`):
//
//   <script>{keyboardPlatformScript()}</script>       in <head>, inline: the platform's convention on <html>, at once
//   <tanrei-keyboard-shortcut keys="mod+k" label="Command K">{keyboardShortcutContent('mod+k', { label: 'Command K' })}</tanrei-keyboard-shortcut>
//
// The content holds the keys in both conventions and the text read in their place; the stylesheet shows the reader's,
// as the element resolves `auto`. The legends, the order of the keys and the test of the platform are the element's
// own (one table, one test), so the page and the element agree. Nothing here runs when the module is imported, and
// nothing touches a document: a server imports it to write the page.
import { type KeyboardConvention, platformConvention } from './primitives/keyboard-convention.js';
import { writeChords } from './primitives/keyboard-writing.js';

export type { KeyboardConvention };

/** The attribute `keyboardPlatformScript()` puts on `<html>`, which `keyboard-shortcut.css` reads: the platform's convention. */
export const KEYBOARD_PLATFORM_ATTRIBUTE = 'data-tanrei-keyboard-platform';

/**
 * The script to inline in `<head>`: it puts the platform's convention (`apple` or `standard`) on `<html>` while the
 * page is still being parsed, by the test the element itself makes under `auto` (its own text), so the first frame
 * draws the keys the element will. It sets no `data-tanrei-keyboard-convention`: that is a choice a product makes,
 * which the element would then follow.
 */
export function keyboardPlatformScript(): string {
  return `(function(){try{document.documentElement.setAttribute(${JSON.stringify(KEYBOARD_PLATFORM_ATTRIBUTE)},(${platformConvention.toString()})())}catch(e){}})();`;
}

const CONVENTIONS: readonly KeyboardConvention[] = ['apple', 'standard'];
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface KeyboardShortcutContentOptions {
  /** The element's `label`: the shortcut in the product's own words, read in place of the keys. Without it, the notation of `aria-keyshortcuts`, as the element reads it (KBS-11). */
  label?: string;
}

/**
 * What to write between the tags of a `<tanrei-keyboard-shortcut>` with these `keys` (as its attribute or property
 * takes them: `'mod+k mod+c'` or `['mod+k', 'mod+c']`) and this `label`: for each convention, the text read in place of
 * the keys, and the keys as the element draws them — each chord's keys in its order, with a + between two keys in the
 * standard convention (KBS-3, KBS-4), a chord with no key to draw left out (KBS-18) — hidden from assistive technology.
 * Markup, its text escaped. `keyboard-shortcut.css` draws it until the element is defined; the element, once defined,
 * draws its own and shows none of it.
 */
export function keyboardShortcutContent(keys: string | readonly string[], { label = '' }: KeyboardShortcutContentOptions = {}): string {
  return CONVENTIONS.map((convention) => {
    const chords = writeChords(keys, convention)
      .map(({ drawn }) => drawn)
      .filter((chord) => chord.keys.length);
    if (!chords.length) return '';
    const spoken = label.trim() || chords.map((chord) => chord.aria).join(' ');
    const drawn = chords
      .map((chord) => `<kbd data-tanrei-keys-chord>${chord.keys.map((key, i) => `${convention === 'standard' && i > 0 ? '<span data-tanrei-keys-separator>+</span>' : ''}<kbd data-tanrei-keys-key data-tanrei-shape>${escape(key.legend)}</kbd>`).join('')}</kbd>`)
      .join('');
    return `<span data-tanrei-keys="${convention}"><span data-tanrei-keys-spoken>${escape(spoken)}</span><span data-tanrei-keys-sequence aria-hidden="true">${drawn}</span></span>`;
  }).join('');
}

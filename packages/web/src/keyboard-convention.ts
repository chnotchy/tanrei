// `@tanrei/web/keyboard-convention`: a keyboard shortcut's keys, drawn by a page written on a server before the element
// is defined, as the element will draw them.
//
// A `<tanrei-keyboard-shortcut>` draws its keys in the reader's convention: under `convention="auto"`, the nearest
// ancestor's `data-tanrei-keyboard-convention`, else the platform's — Apple's symbols on Apple's platforms (⇧⌘K, one cap
// per key), the names elsewhere (Ctrl+Shift+K). Until its module has arrived the element is not defined, and what a
// page puts inside it is drawn instead. Words there take another width than the caps, and the line they stand in wraps
// again when the caps are drawn: what stands below moves. So a page that must hold its room draws the keys themselves,
// in both conventions, and shows the reader's:
//
//   <script>{keyboardPlatformScript()}</script>    in <head>, inline: the platform's convention on <html>, at once
//   shortcutLegends('mod+shift+k', 'apple')        on the server: [['⇧', '⌘', 'K']], each chord's legends in order
//   shortcutLegends('mod+shift+k', 'standard')     [['Ctrl', 'Shift', 'K']], drawn with a + between two keys
//
// and, in its stylesheet, hides the face of the other convention: `[data-tanrei-keyboard-platform='apple']` on <html>
// shows the Apple one, anything else the standard one, and an ancestor's `data-tanrei-keyboard-convention` comes first,
// as it does for the element. The legends and the platform's convention are the element's own (one table, one test of
// the platform), so the page and the element agree. Nothing here runs when the module is imported, and nothing touches
// a document: a server imports it to write the page.
import { type KeyboardConvention, platformConvention } from './primitives/keyboard-convention.js';
import { drawnChords } from './primitives/keyboard-writing.js';

export type { KeyboardConvention };
export { platformConvention };

/** The attribute `keyboardPlatformScript()` puts on `<html>` when none is given: the platform's convention. */
export const KEYBOARD_PLATFORM_ATTRIBUTE = 'data-tanrei-keyboard-platform';

export interface KeyboardPlatformOptions {
  /** The attribute put on `<html>`. `data-tanrei-keyboard-platform` when left out. */
  attribute?: string;
}

/**
 * The script to inline in `<head>`: it puts the platform's convention (`apple` or `standard`) on `<html>` while the
 * page is still being parsed, by the test the element itself makes under `auto` (`platformConvention()`, its own text),
 * so the first frame draws the keys the element will. It sets no `data-tanrei-keyboard-convention`: that is a choice a
 * product makes, which the element would then follow.
 */
export function keyboardPlatformScript({ attribute = KEYBOARD_PLATFORM_ATTRIBUTE }: KeyboardPlatformOptions = {}): string {
  return `(function(){try{document.documentElement.setAttribute(${JSON.stringify(attribute)},(${platformConvention.toString()})())}catch(e){}})();`;
}

/**
 * The legends a shortcut's chords are drawn with in a convention, chord by chord, in the order the element draws them
 * (`keys` as the element's property or attribute takes it: `'mod+k mod+c'` or `['mod+k', 'mod+c']`). A chord with no
 * key to draw is left out, as the element leaves it out. In the standard convention the element draws a + between two
 * keys of a chord; in Apple's, nothing.
 */
export function shortcutLegends(keys: string | readonly string[], convention: KeyboardConvention): string[][] {
  return drawnChords(keys, convention).map((chord) => chord.keys.map((key) => key.legend));
}

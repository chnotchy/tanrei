// How a keyboard shortcut writes its keys in each convention (KBS-1, KBS-3…5, KBS-12, KBS-18): the legend of each key,
// the order of the modifiers, and the form `aria-keyshortcuts` takes. The element draws from it
// (components/keyboard-shortcut), and so does a page written on a server that draws a shortcut's keys before the
// element is defined (`@tanrei/web/keyboard-convention`): one table, so the two agree. It lives here, outside
// `src/components/**`, so that it is no part of the element's API, and it touches no document.

import { type KeyboardConvention, chordsOf } from './keyboard-convention.js';

type Modifier = 'mod' | 'ctrl' | 'alt' | 'shift';
const MODIFIERS: readonly Modifier[] = ['mod', 'ctrl', 'alt', 'shift'];

/**
 * How one key is written and given to `aria-keyshortcuts`, in each convention. A legend is what the key itself carries
 * in that convention — an engraving, as a glyph is — and the `aria` form is a standard's notation, the same in every
 * language. Neither is a word of Tanrei's, and there is no third form: the shortcut has no names for keys (KBS-11).
 * What is read aloud is the product's `label`, or the notation.
 */
interface Writing {
  apple: string;
  standard: string;
}
interface KeyForms {
  legend: Writing;
  aria: Writing;
}
const same = (text: string): Writing => ({ apple: text, standard: text });
const key = (legend: Writing | string, aria: Writing | string): KeyForms => ({
  legend: typeof legend === 'string' ? same(legend) : legend,
  aria: typeof aria === 'string' ? same(aria) : aria,
});

/** KBS-3, KBS-4, KBS-12: the modifiers. */
const MODIFIER_FORMS: Record<Modifier, KeyForms> = {
  mod: key({ apple: '⌘', standard: 'Ctrl' }, { apple: 'Meta', standard: 'Control' }),
  ctrl: key({ apple: '⌃', standard: 'Ctrl' }, 'Control'),
  alt: key({ apple: '⌥', standard: 'Alt' }, 'Alt'),
  shift: key({ apple: '⇧', standard: 'Shift' }, 'Shift'),
};

/** KBS-3, KBS-4: the order modifiers are drawn and read in, whatever order keys gives. */
const DRAWN_ORDER: Record<KeyboardConvention, readonly Modifier[]> = {
  apple: ['ctrl', 'alt', 'shift', 'mod'],
  standard: ['mod', 'ctrl', 'alt', 'shift'],
};
/** KBS-12: the order of the modifiers in `aria-keyshortcuts` (Meta+Shift+K), as KBS-12 lists them. */
const ARIA_ORDER: readonly Modifier[] = ['mod', 'ctrl', 'alt', 'shift'];

/** KBS-1, KBS-3, KBS-4, KBS-12: the named keys. */
const NAMED: Record<string, KeyForms> = {
  enter: key({ apple: '↩', standard: 'Enter' }, 'Enter'),
  escape: key({ apple: '⎋', standard: 'Esc' }, 'Escape'),
  tab: key({ apple: '⇥', standard: 'Tab' }, 'Tab'),
  backspace: key({ apple: '⌫', standard: 'Backspace' }, 'Backspace'),
  delete: key({ apple: '⌦', standard: 'Delete' }, 'Delete'),
  space: key('Space', 'Space'),
  'arrow-up': key('↑', 'ArrowUp'),
  'arrow-down': key('↓', 'ArrowDown'),
  'arrow-left': key('←', 'ArrowLeft'),
  'arrow-right': key('→', 'ArrowRight'),
  home: key({ apple: '↖', standard: 'Home' }, 'Home'),
  end: key({ apple: '↘', standard: 'End' }, 'End'),
  'page-up': key({ apple: '⇞', standard: 'PgUp' }, 'PageUp'),
  'page-down': key({ apple: '⇟', standard: 'PgDn' }, 'PageDown'),
  'caps-lock': key({ apple: '⇪', standard: 'Caps Lock' }, 'CapsLock'),
  plus: key('+', 'Plus'),
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i + 1}`, key(`F${i + 1}`, `F${i + 1}`)])),
};

/** KBS-5: a letter key is its capital letter; any other character is as given. */
const capital = (char: string) => {
  if (!/\p{L}/u.test(char)) return char;
  const upper = char.toUpperCase();
  return [...upper].length === 1 ? upper : char;
};

/** KBS-1, KBS-18: one key other than a modifier — named, a character, or an unknown name drawn as given. */
function keyForms(name: string): { forms: KeyForms; unknown: boolean } {
  const named = NAMED[name.toLowerCase()];
  if (named) return { forms: named, unknown: false };
  if ([...name].length === 1) {
    const char = capital(name);
    return { forms: key(char, char), unknown: false };
  }
  return { forms: key(name, name), unknown: true };
}

/** One key as drawn: its legend. */
export interface DrawnKey {
  legend: string;
}
/** One chord as drawn, in the convention: its keys in order, and its `aria-keyshortcuts` form. */
export interface DrawnChord {
  keys: DrawnKey[];
  aria: string;
}

/**
 * KBS-1, KBS-3…5, KBS-18: a chord ("mod+shift+k") as the convention writes it — each modifier once, in the convention's
 * order, then each other key once, in order — and what is wrong with it (reported in debug builds).
 */
export function writeChord(chord: string, convention: KeyboardConvention): { drawn: DrawnChord; problems: string[] } {
  const names = chord.split('+').map((name) => name.trim());
  const problems: string[] = [];
  const modifiers = new Set<Modifier>();
  const others: KeyForms[] = [];
  let repeated = false;
  for (const name of names) {
    if (!name) continue;
    const lower = name.toLowerCase();
    if ((MODIFIERS as readonly string[]).includes(lower)) {
      if (modifiers.has(lower as Modifier)) repeated = true;
      modifiers.add(lower as Modifier);
      continue;
    }
    const { forms, unknown } = keyForms(name);
    if (unknown) problems.push(`the key "${name}" is not a key name; it is drawn as given`);
    if (others.some((other) => other.legend[convention] === forms.legend[convention])) repeated = true;
    else others.push(forms);
  }
  // A modifier the convention writes like another (ctrl and mod are both Ctrl in the standard convention) is drawn once.
  const drawnModifiers: KeyForms[] = [];
  for (const modifier of DRAWN_ORDER[convention]) {
    if (!modifiers.has(modifier)) continue;
    const forms = MODIFIER_FORMS[modifier];
    if (drawnModifiers.some((each) => each.legend[convention] === forms.legend[convention])) repeated = true;
    else drawnModifiers.push(forms);
  }
  const aria: string[] = [];
  for (const modifier of ARIA_ORDER) {
    const name = MODIFIER_FORMS[modifier].aria[convention];
    if (modifiers.has(modifier) && !aria.includes(name)) aria.push(name);
  }
  aria.push(...others.map((forms) => forms.aria[convention]));
  if (!names.some(Boolean)) problems.push('a chord is empty');
  else if (!others.length) problems.push('it holds only modifiers');
  if (others.length > 1) problems.push('it holds more than one key other than modifiers');
  if (repeated) problems.push('it names a key twice once the convention has written it');
  const keys = [...drawnModifiers, ...others].map((forms) => ({ legend: forms.legend[convention] }));
  return { drawn: { keys, aria: aria.join('+') }, problems };
}

/** The chords of `keys` (an array, or the attribute's string) as the convention writes them, and what is wrong with each. */
export function writeChords(keys: unknown, convention: KeyboardConvention) {
  return chordsOf(keys).map((chord) => ({ chord, ...writeChord(chord, convention) }));
}

/** KBS-8, KBS-18: the chords the element draws, in order: a chord with no key to draw is not drawn. */
export function drawnChords(keys: unknown, convention: KeyboardConvention): DrawnChord[] {
  return writeChords(keys, convention)
    .map(({ drawn }) => drawn)
    .filter((chord) => chord.keys.length);
}

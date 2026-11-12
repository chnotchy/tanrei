// The keys of a component's keyboard table, as the docs' keyboard map draws them (components/visuals/KeyboardMap.astro).
// A spec writes each row's keys as a phrase of its own (`specs/*.spec.json`, `accessibility.keyboard[].keys`): «Tab /
// Shift+Tab», «Enter, Space or Down Arrow on the anchor», «Escape (during a drag)», «Printable characters». Each phrase is
// read here into what the map draws, in order: a chord the Keyboard shortcut can draw (its key names, `mod+a`), the
// words between two chords that only say "or" (« / », « or », «, »), and any other words, which stay as the spec wrote
// them, in English. Nothing of the phrase is dropped: read back in order, the segments are the phrase.
//
// A key's name in the page's language is the dictionary's (`keys` in lib/i18n.ts, by the Keyboard shortcut's names):
// the Keyboard shortcut has no names for keys of its own, and reads the product's (`label`).

/** One piece of a phrase: a chord, a mark that the chords on each side are alternatives, or words of the spec's. */
export type KeySegment = { chord: string[] } | { or: string } | { text: string };

/** The names the dictionary gives a key, by the Keyboard shortcut's name of it. */
export const NAMED_KEYS = ['tab', 'shift', 'ctrl', 'alt', 'mod', 'enter', 'escape', 'space', 'backspace', 'delete', 'home', 'end', 'page-up', 'page-down', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrows'] as const;
export type NamedKey = (typeof NAMED_KEYS)[number];

/** The four arrow keys at once («Arrow keys»): drawn as four caps, read as one name. */
export const ARROWS = ['arrow-up', 'arrow-down', 'arrow-left', 'arrow-right'];

const ARROW = '[Aa]rrow';
/** A key a spec names, longest first, and the Keyboard shortcut's name for it. */
const KEYS: [RegExp, string][] = [
  [/Arrow keys/y, 'arrows'],
  [new RegExp(`Up ${ARROW}|ArrowUp`, 'y'), 'arrow-up'],
  [new RegExp(`Down ${ARROW}|ArrowDown`, 'y'), 'arrow-down'],
  [new RegExp(`Left ${ARROW}|ArrowLeft`, 'y'), 'arrow-left'],
  [new RegExp(`Right ${ARROW}|ArrowRight`, 'y'), 'arrow-right'],
  [/Page ?Up|PgUp/y, 'page-up'],
  [/Page ?Down|PgDn/y, 'page-down'],
  [/Backspace/y, 'backspace'],
  [/Delete/y, 'delete'],
  [/Escape|Esc/y, 'escape'],
  [/Enter/y, 'enter'],
  [/Space/y, 'space'],
  [/Home/y, 'home'],
  [/End/y, 'end'],
  [/Tab/y, 'tab'],
  [/F(?:2[0-4]|1\d|[1-9])/y, 'f'],
];
/** A modifier a spec names, and the Keyboard shortcut's name for it. Control becomes `mod` where the phrase says Apple's keyboards take Command. */
const MODIFIERS: [RegExp, string][] = [
  [/Ctrl|Control/y, 'ctrl'],
  [/Command|Cmd/y, 'mod'],
  [/Alt|Option/y, 'alt'],
  [/Shift/y, 'shift'],
];
/** A key that is one character other than a letter, standing alone («* (asterisk)», «+ or = / − / 0»). */
const SYMBOL = /[*+=\-−0-9]/y;
/** What may stand before and after a key's name: it is a word of its own. */
const BEFORE = /[\s(/,;]/;
const AFTER = /^(?:$|[\s),;/])/;
/** The words between two chords that say only that either may be pressed. */
const OR = /^\s*(?:\/|,|or|,\s*or)\s*$/;

function at(re: RegExp, text: string, index: number): string | null {
  re.lastIndex = index;
  const found = re.exec(text);
  return found ? found[0] : null;
}

/** The key the phrase names at `index`, and its length; a character after a `+` may be any. */
function keyAt(text: string, index: number, afterPlus: boolean): [string, number] | null {
  for (const [re, name] of KEYS) {
    const found = at(re, text, index);
    if (found) return [name === 'f' ? found.toLowerCase() : name, found.length];
  }
  if (afterPlus) {
    const char = [...text.slice(index)][0];
    if (char && !/\s/.test(char)) return [char === '+' ? 'plus' : char.toLowerCase(), char.length];
    return null;
  }
  const symbol = at(SYMBOL, text, index);
  if (symbol) return [symbol === '+' ? 'plus' : symbol === '−' ? '-' : symbol, symbol.length];
  return null;
}

/** The chord the phrase names at `index` (modifiers joined by `+`, then a key), and its length; null where none stands there as a word. */
function chordAt(text: string, index: number, commandIsMod: boolean): [string[], number] | null {
  if (index > 0 && !BEFORE.test(text[index - 1] ?? '')) return null;
  const keys: string[] = [];
  let position = index;
  for (;;) {
    let modifier: [string, number] | null = null;
    for (const [re, name] of MODIFIERS) {
      const found = at(re, text, position);
      if (found && text[position + found.length] === '+') modifier = [name === 'ctrl' && commandIsMod ? 'mod' : name, found.length + 1];
      if (modifier) break;
    }
    if (!modifier) break;
    keys.push(modifier[0]);
    position += modifier[1];
  }
  const key = keyAt(text, position, keys.length > 0);
  if (!key) return null;
  position += key[1];
  if (!AFTER.test(text.slice(position))) return null;
  return [[...keys, key[0]], position - index];
}

/**
 * A phrase of a spec's keyboard table, read into what the keyboard map draws, in order. A slash at the very start is
 * the slash key («/ (the filterShortcut chord, on a row)»); anywhere else it says "or". «Left / Right Arrow» names two
 * arrows. Where a phrase says that Apple's keyboards take Command, its Control is the Keyboard shortcut's `mod`, and a
 * chord written twice, once with each, is one.
 */
export function keySegments(phrase: string): KeySegment[] {
  const text = phrase.replace(/\b(Up|Down|Left|Right) \/ (Up|Down|Left|Right) ([Aa]rrow)\b/g, '$1 $3 / $2 $3');
  const commandIsMod = /\bCommand\b/.test(text);
  const out: KeySegment[] = [];
  let words = '';
  const flush = () => {
    if (!words) return;
    const last = out.at(-1);
    out.push(last && 'chord' in last && OR.test(words) ? { or: words } : { text: words });
    words = '';
  };
  for (let index = 0; index < text.length; ) {
    const chord = index === 0 && text[0] === '/' && AFTER.test(text.slice(1)) ? ([['/'], 1] as [string[], number]) : chordAt(text, index, commandIsMod);
    if (!chord) {
      words += text[index];
      index += 1;
      continue;
    }
    // An "or" that stands before a chord: an alternative only where a chord stands before it too (else words).
    flush();
    const [keys, length] = chord;
    const previous = out.at(-1);
    const before = out.at(-2);
    // «Control+Enter / Command+Enter»: one chord, once Control is `mod`.
    if (previous && 'or' in previous && before && 'chord' in before && before.chord.join('+') === keys.join('+')) out.pop();
    else out.push({ chord: keys });
    index += length;
  }
  if (words) out.push({ text: words });
  // An "or" mark is between two chords; one before words is part of the words.
  const merged: KeySegment[] = [];
  out.forEach((segment, i) => {
    const next = out[i + 1];
    const kept: KeySegment = 'or' in segment && !(next && 'chord' in next) ? { text: segment.or } : segment;
    const last = merged.at(-1);
    if ('text' in kept && last && 'text' in last) last.text += kept.text;
    else merged.push(kept);
  });
  return merged;
}

/** The keys a chord is drawn with by the Keyboard shortcut, as its `keys` attribute (four chords for the arrow keys). */
export function shortcutKeys(chord: string[]): string {
  return chord.length === 1 && chord[0] === 'arrows' ? ARROWS.join(' ') : chord.join('+');
}

/** A chord's name in the page's language: each key's name from the dictionary, a character as it is, joined by `join`. */
export function spokenChord(chord: string[], names: Record<string, string>, join = ' '): string {
  return chord.map((key) => names[key] ?? (/^f\d+$/.test(key) ? key.toUpperCase() : key === 'plus' ? '+' : key.toUpperCase())).join(join);
}

// How a one-time-code input reads text and edits its value (specs/one-time-code-input.spec.json). Nothing here touches
// an element: the element (one-time-code-input.ts) hears the native input and asks these functions what the value and
// the active cell become. The value is always ASCII, in upper case, at most `length` characters, without a gap.

/** What a cell takes (OTC-4): the digits 0 to 9, or those and the letters A to Z. */
export type CodeType = 'numeric' | 'alphanumeric';

/** The value, the active cell, and whether the whole value is selected (OTC-5, OTC-10). */
export interface CodeState {
  value: string;
  /** The cell the next character goes to: 0 … the first empty cell, or the last cell while all are filled. */
  active: number;
  /** The platform's select all was used: every filled cell is drawn active, and the next edit acts on the whole value. */
  all: boolean;
}

const DECIMAL_DIGIT = /^\p{Nd}$/u;
/** White space, and the hyphen and dash characters a code is written with ("123 456", "123-456", "123–456"): OTC-11. */
const SEPARATORS = /[\s\p{Pd}−]/gu;

/**
 * The value of a decimal digit of any script. Unicode encodes every script's digits as a run of ten in ascending order,
 * and several runs may stand side by side (the mathematical digits), so the digit is its place in its run, modulo ten.
 */
function digitValue(char: string): number {
  const point = char.codePointAt(0)!;
  let start = point;
  while (start > 0 && DECIMAL_DIGIT.test(String.fromCodePoint(start - 1))) start--;
  return (point - start) % 10;
}

/**
 * OTC-4: one character as the field reads it — a decimal digit of any script and a full-width digit or letter as its
 * ASCII form, a lower-case letter as its upper-case form — or `null` where the type does not permit it.
 */
export function readCharacter(char: string, type: CodeType): string | null {
  if (DECIMAL_DIGIT.test(char)) return String(digitValue(char));
  if (type !== 'alphanumeric') return null;
  const point = char.codePointAt(0)!;
  // Full-width Latin letters (U+FF21 … U+FF3A, U+FF41 … U+FF5A) are read as the ASCII ones.
  const ascii = point >= 0xff21 && point <= 0xff3a ? point - 0xff21 + 0x41 : point >= 0xff41 && point <= 0xff5a ? point - 0xff41 + 0x61 : point;
  if (ascii >= 0x41 && ascii <= 0x5a) return String.fromCharCode(ascii);
  if (ascii >= 0x61 && ascii <= 0x7a) return String.fromCharCode(ascii - 0x20);
  return null;
}

/** The permitted characters of `text`, each read by OTC-4, in order; what is not permitted is dropped. */
export function readPermitted(text: string, type: CodeType): string {
  let out = '';
  for (const char of text) out += readCharacter(char, type) ?? '';
  return out;
}

/** OTC-18, OTC-19: a value the product set as the field holds it, and whether anything of it was dropped. */
export function readValue(text: string, length: number, type: CodeType): { value: string; dropped: boolean } {
  const permitted = readPermitted(text, type);
  const value = permitted.slice(0, length);
  return { value, dropped: value !== text };
}

/**
 * OTC-11: a whole text — pasted, dropped, dictated or given by autofill — read as one code, or `null` where it holds
 * none. White space, hyphens and dashes go; if every remaining character is permitted (and there is one) the code is
 * the first `length` of them. Otherwise, for digits only, the text is searched: exactly one run of exactly `length`
 * digits that no other digit adjoins is the code ("Your code is 123456."). Anything else is no code.
 */
export function readCode(text: string, length: number, type: CodeType): string | null {
  const bare = text.replace(SEPARATORS, '');
  let whole = '';
  let every = bare !== '';
  for (const char of bare) {
    const read = readCharacter(char, type);
    if (read === null) {
      every = false;
      break;
    }
    whole += read;
  }
  if (every) return whole.slice(0, length);
  if (type !== 'numeric') return null;
  const runs: string[] = [];
  let run = '';
  for (const char of text) {
    if (DECIMAL_DIGIT.test(char)) run += digitValue(char);
    else {
      if (run) runs.push(run);
      run = '';
    }
  }
  if (run) runs.push(run);
  const exact = runs.filter((digits) => digits.length === length);
  return exact.length === 1 ? exact[0] : null;
}

/** OTC-5: the furthest cell that can be active — the first empty cell, or the last cell while all are filled. */
export const furthest = (value: string, length: number) => Math.min(value.length, Math.max(0, length - 1));

/** The state with its active cell brought inside what the value allows. */
export const settle = (state: CodeState, length: number): CodeState => ({
  value: state.value,
  active: Math.max(0, Math.min(state.active, furthest(state.value, length))),
  all: state.all && state.value !== '',
});

/**
 * OTC-6, OTC-10: one permitted character typed — it stands in the active cell, in place of what the cell holds, and the
 * active cell moves on (it stays on the last); typed over a selected value it replaces the whole value.
 */
export function typeCharacter(state: CodeState, char: string, length: number): CodeState {
  if (state.all) return { value: char, active: furthest(char, length), all: false };
  const at = Math.min(state.active, state.value.length, length - 1);
  const value = (state.value.slice(0, at) + char + state.value.slice(at + 1)).slice(0, length);
  return { value, active: Math.min(at + 1, furthest(value, length)), all: false };
}

/** Characters typed one after another (OTC-6: text an input method commits is read character by character). */
export function typeText(state: CodeState, text: string, length: number): CodeState {
  let next = state;
  for (const char of text) next = typeCharacter(next, char, length);
  return next;
}

/**
 * OTC-9, OTC-10: Backspace — a filled active cell loses its character and stays active; an empty one loses the
 * character before it and the active cell moves there; a selected value is emptied. The rest closes the gap.
 */
export function removeBackward(state: CodeState, length: number): CodeState {
  if (state.all) return { value: '', active: 0, all: false };
  const { value, active } = settle(state, length);
  if (active < value.length) return { value: value.slice(0, active) + value.slice(active + 1), active, all: false };
  if (active === 0) return { value, active, all: false };
  return { value: value.slice(0, active - 1), active: active - 1, all: false };
}

/** OTC-9, OTC-10: Delete — the active cell loses its character; a selected value is emptied. */
export function removeForward(state: CodeState, length: number): CodeState {
  if (state.all) return { value: '', active: 0, all: false };
  const { value, active } = settle(state, length);
  return { value: value.slice(0, active) + value.slice(active + 1), active, all: false };
}

/** The platform's removal of a word or a line: everything before the active cell, or everything from it on. */
export function removeRun(state: CodeState, direction: 'backward' | 'forward', length: number): CodeState {
  if (state.all) return { value: '', active: 0, all: false };
  const { value, active } = settle(state, length);
  // A filled active cell is part of what is removed, as Backspace removes it (OTC-9).
  const value_ = direction === 'backward' ? value.slice(Math.min(active + 1, value.length)) : value.slice(0, active);
  return { value: value_, active: direction === 'backward' ? 0 : furthest(value_, length), all: false };
}

/** OTC-11, OTC-18: a whole value taken at once; the active cell is the first empty cell, or the last. */
export const replaceAll = (value: string, length: number): CodeState => ({ value, active: furthest(value, length), all: false });

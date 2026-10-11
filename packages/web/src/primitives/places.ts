import type { WordPlace } from '../generated/words.js';
import { debugBuild } from './report.js';

// A word of the product's with places to fill. The product writes the whole sentence in its own language and
// marks the places a component fills — `{headline}: {position} of {count}` — so the order of the words is its
// language's, and the component builds no phrase of its own. The spec declares a word's places
// (`src/generated/words.ts`, `wordPlaces`); a component fills those and does nothing else to the sentence.
//
// This is the one place the web reads such a sentence, and it reads as every platform does (the tools' `readPlaces`,
// packages/tools/src/places.js): from left to right, the first rule that fits —
//
//   1. `{{` or `}}`                        one literal brace
//   2. otherwise `{`, and the next brace   the text between them is a place where the component fills that name;
//      after it is `}`                     otherwise it is unknown, and is kept as written with its braces
//   3. any other `{` or `}`                a brace that opens or closes nothing: kept as written
//
// so `{{count}}` is the text `{count}`, and `{count}}}` is the place and one brace. What fills a place is never read
// again: a brace inside an entry a person typed is a brace.

/** One run of a filled sentence: the product's own text (`place` null), or what filled the place of that name. */
export interface FilledRun {
  text: string;
  place: string | null;
}

export interface FilledSentence {
  /** The sentence in order: the product's text and the fillings, each a run of its own. */
  runs: FilledRun[];
  /** What stands between braces and names no place the component fills, each once: left as it is written, for a debug report. */
  unknown: string[];
  /** How many braces open or close nothing: left as they are written, for a debug report. */
  stray: number;
  /** The places the sentence has. */
  used: ReadonlySet<string>;
}

/**
 * `sentence` with each `{name}` that `places` names filled, wherever and however often the product wrote it. Any other
 * text between braces stays as it is written and is returned in `unknown`; a brace that opens or closes nothing stays
 * and is counted in `stray`; a brace written twice is one brace. The fillings come back as runs of their own, so the
 * caller can isolate one whose direction is its own (a name) from the sentence around it.
 */
export function fillPlaces(sentence: string, places: Readonly<Record<string, string>>): FilledSentence {
  const runs: FilledRun[] = [];
  const unknown: string[] = [];
  const used = new Set<string>();
  let stray = 0;
  const text = (piece: string) => {
    if (!piece) return;
    const last = runs.at(-1);
    if (last && last.place === null) last.text += piece;
    else runs.push({ text: piece, place: null });
  };
  /** Where the next brace at or after `from` stands; the sentence's end where there is none. */
  const nextBrace = (from: number) => {
    const found = sentence.slice(from).search(/[{}]/);
    return found < 0 ? sentence.length : from + found;
  };
  for (let at = 0; at < sentence.length; ) {
    const c = sentence[at];
    if (c !== '{' && c !== '}') {
      const end = nextBrace(at);
      text(sentence.slice(at, end));
      at = end;
    } else if (sentence[at + 1] === c) {
      text(c);
      at += 2;
    } else {
      const close = c === '{' ? nextBrace(at + 1) : -1;
      if (close < 0 || sentence[close] !== '}') {
        // A closing brace alone; or an opening one that no brace follows, or that another opening brace follows first.
        text(c);
        stray += 1;
        at += 1;
        continue;
      }
      const name = sentence.slice(at + 1, close);
      if (Object.hasOwn(places, name)) {
        runs.push({ text: places[name], place: name });
        used.add(name);
      } else {
        const written = `{${name}}`;
        text(written);
        if (!unknown.includes(written)) unknown.push(written);
      }
      at = close + 1;
    }
  }
  return { runs, unknown, stray, used };
}

/** What is wrong with a sentence as a word with places. */
export interface PlaceFaults {
  /** An unknown place, or a brace that opens or closes nothing: each a clause that follows the word's name, "holds {place}, which is not …". */
  written: string[];
  /** The names of the places the spec marks as needed that the sentence is without. */
  absent: string[];
}

/**
 * What a debug build says of `sentence` as a word with the places `declared`: each text between braces that names
 * none of them, a brace that opens or closes nothing, and each needed place the sentence is without. A sentence that
 * fits has no fault. Nothing is reported here: the caller names the word and where it was given.
 */
export function placeFaults(sentence: string, declared: readonly WordPlace[]): PlaceFaults {
  const names = declared.map((place) => `{${place.name}}`).join(', ');
  const read = fillPlaces(sentence, Object.fromEntries(declared.map((place) => [place.name, ''])));
  const written = read.unknown.map((each) => `holds ${each}, which is not a place of it (${names})`);
  if (read.stray) written.push('holds a brace that opens or closes nothing (a brace meant as one is written twice, {{ or }})');
  return { written, absent: declared.filter((place) => place.required && !read.used.has(place.name)).map((place) => place.name) };
}

// What was reported on this page, under a registered symbol so that two copies of the module hold one list.
const REPORTED = Symbol.for('tanrei.places.reported');
const reportedOnPage = (): Set<string> => ((globalThis as { [REPORTED]?: Set<string> })[REPORTED] ??= new Set());

/**
 * Reports, in a debug build, what of `sentence` is not a place of the word and what brace opens or closes nothing —
 * once per kind of element, prop, fault and page, naming the prop. `effect` says what is done
 * with the sentence all the same ("it is announced as it is written"). A place that is needed and absent is the
 * caller's to report, with what it breaks. Call it where the sentence is used: an instance's own prop does not pass
 * through `setWords()`.
 */
export function reportPlaces(host: Element, id: string, prop: string, sentence: string, declared: readonly WordPlace[], effect: string): void {
  if (!debugBuild()) return;
  const seen = reportedOnPage();
  for (const fault of placeFaults(sentence, declared).written) {
    const message = `[tanrei] <${host.localName}>: ${prop} ${fault}; ${effect} (${id})`;
    if (seen.has(message)) continue;
    seen.add(message);
    console.warn(message, host);
  }
}

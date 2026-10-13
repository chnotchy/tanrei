// A word of the product's with places a component fills: `fillPlaces()`, the one function of
// the package that reads such a sentence, with `placeFaults()` and `reportPlaces()`, what a debug build says of one
// that does not fit. They are plain functions, so they are called here and no page is opened; the sentences are the
// ones the tools' reference reading is held to (packages/tools/test/places.test.js), so that the two read alike. What
// each component does with its own sentence is in its own tests (LST-42, IMP-9, CHF-22, CHF-23).
import { expect, test } from '@playwright/test';
import { wordPlaces } from '../generated/words.js';
import { type FilledRun, fillPlaces, placeFaults, reportPlaces } from './places.js';

const VALUES = { headline: 'Body font', position: '2', count: '3' };
const filled = (sentence: string, values: Record<string, string> = VALUES) =>
  fillPlaces(sentence, values)
    .runs.map((run) => run.text)
    .join('');
const run = (text: string, place: string | null = null): FilledRun => ({ text, place });

/** What `act` warns, with `console.warn` put back after it. */
function warned(act: () => void): string[] {
  const seen: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void seen.push(String(args[0]));
  try {
    act();
  } finally {
    console.warn = warn;
  }
  return seen;
}
/** As much of an element as a report reads. */
const element = (localName: string) => ({ localName }) as Element;

test.describe('a word with places', () => {
  test('every occurrence of a place is filled, a place may be left out, and the fillings are runs of their own', () => {
    expect(filled('{headline}: {position} of {count}')).toBe('Body font: 2 of 3');
    expect(filled('{count} 件中 {position} 番目、{count} 件')).toBe('3 件中 2 番目、3 件');
    expect(filled('Moved')).toBe('Moved');
    expect(filled('')).toBe('');
    const read = fillPlaces('{headline}: {position} of {count}', VALUES);
    expect(read.runs).toEqual([run('Body font', 'headline'), run(': '), run('2', 'position'), run(' of '), run('3', 'count')]);
    expect([...read.used].sort()).toEqual(['count', 'headline', 'position']);
    expect({ unknown: read.unknown, stray: read.stray }).toEqual({ unknown: [], stray: 0 });
    // The product's own text between two things that are not places is one run.
    expect(fillPlaces('a {place} b', VALUES).runs).toEqual([run('a {place} b')]);
    // A place filled with nothing is an empty run of its own, and is not a fault.
    expect(fillPlaces('[{headline}]', { headline: '' })).toMatchObject({ runs: [run('['), run('', 'headline'), run(']')], unknown: [], stray: 0 });
  });

  test('a text between braces that names no place is kept exactly as it is written, and returned once', () => {
    expect(filled('{headline} {place}')).toBe('Body font {place}');
    expect(filled('{ count }'), 'a name has no spaces').toBe('{ count }');
    expect(filled('{Count} {}')).toBe('{Count} {}');
    expect(fillPlaces('{place} {place} { count } {}', VALUES).unknown).toEqual(['{place}', '{ count }', '{}']);
    expect(fillPlaces('{place} {place}', VALUES).stray).toBe(0);
    // Only the names given are places: a property of every object is not one.
    expect(filled('{toString} {constructor} {__proto__}')).toBe('{toString} {constructor} {__proto__}');
  });

  test('a brace that opens or closes nothing is kept as it is written, and counted', () => {
    expect(filled('{headline} {')).toBe('Body font {');
    expect(fillPlaces('{headline} {', VALUES).stray).toBe(1);
    expect(filled('} {count')).toBe('} {count');
    expect(fillPlaces('} {count', VALUES).stray).toBe(2);
    // An opening brace that another opening brace follows opens nothing; the place after it is still a place.
    expect(filled('{a{count}')).toBe('{a3');
    expect(fillPlaces('{a{count}', VALUES)).toMatchObject({ stray: 1, unknown: [] });
    expect(fillPlaces('{', VALUES)).toMatchObject({ runs: [run('{')], stray: 1 });
    expect(fillPlaces('}', VALUES)).toMatchObject({ runs: [run('}')], stray: 1 });
  });

  test('a brace written twice is one brace, and what stands between doubled braces is not filled', () => {
    expect(filled('{{')).toBe('{');
    expect(filled('}}')).toBe('}');
    expect(filled('{{count}}'), 'the seven characters, and nothing is filled').toBe('{count}');
    expect(filled('{{headline}} {position}')).toBe('{headline} 2');
    expect(filled('{count}}}'), 'the place, and one brace').toBe('3}');
    expect(filled('{{{count}}}'), 'one brace, the place, one brace').toBe('{3}');
    expect(filled('{{{{}}}}')).toBe('{{}}');
    for (const sentence of ['{{', '}}', '{{count}}', '{{headline}} {position}', '{count}}}', '{{{count}}}']) {
      expect(fillPlaces(sentence, VALUES), sentence).toMatchObject({ unknown: [], stray: 0 });
    }
    expect([...fillPlaces('{{count}}', VALUES).used]).toEqual([]);
  });

  test('what fills a place is plain text and is not read again — a brace or a place inside an entry stays as the person typed it', () => {
    expect(filled('{entry} added', { entry: '{count} {{ } <b>', count: '3' })).toBe('{count} {{ } <b> added');
    const read = fillPlaces('{entry} added', { entry: '{count} {{ }' });
    expect(read.runs).toEqual([run('{count} {{ }', 'entry'), run(' added')]);
    expect({ unknown: read.unknown, stray: read.stray }).toEqual({ unknown: [], stray: 0 });
  });

  test('what a debug build says of a sentence — an unknown place with the places the word has, a stray brace, and a needed place that is absent; a sentence that fits has no fault', () => {
    const moved = wordPlaces.movedText!;
    const remove = wordPlaces.entryRemoveLabel!;
    expect(placeFaults('{headline}: {position} of {count}', moved)).toEqual({ written: [], absent: [] });
    expect(placeFaults('Moved', moved), 'a place may be left out').toEqual({ written: [], absent: [] });
    expect(placeFaults('{{headline}}', moved)).toEqual({ written: [], absent: [] });
    expect(placeFaults('{headline} {place}', moved).written).toEqual(['holds {place}, which is not a place of it ({headline}, {position}, {count})']);
    expect(placeFaults('{headline} {', moved).written).toEqual(['holds a brace that opens or closes nothing (a brace meant as one is written twice, {{ or }})']);
    expect(placeFaults('{a} } {b}', moved).written).toHaveLength(3);
    // The one place of any word that is needed: the name of an entry's remove action.
    expect(placeFaults('Remove {entry}', remove)).toEqual({ written: [], absent: [] });
    expect(placeFaults('Remove', remove)).toEqual({ written: [], absent: ['entry'] });
    expect(placeFaults('Remove {{entry}}', remove), 'a doubled brace is not the place').toEqual({ written: [], absent: ['entry'] });
    expect(placeFaults('Remove {entri}', remove)).toEqual({ written: ['holds {entri}, which is not a place of it ({entry})'], absent: ['entry'] });
  });

  test('an unknown place and a stray brace are reported in a debug build, once per prop, fault and page, naming the element, the prop and the sentence’s id; a sentence that fits and a production build report nothing', () => {
    const moved = wordPlaces.movedText!;
    const list = element('tanrei-places-test-list');
    expect(warned(() => reportPlaces(list, 'LST-42', 'movedText', '{headline}: {position} of {count}', moved, 'it is announced as it is written'))).toEqual([]);
    expect(warned(() => reportPlaces(list, 'LST-42', 'movedText', '{{headline}} {position}', moved, 'it is announced as it is written'))).toEqual([]);
    const first = warned(() => reportPlaces(list, 'LST-42', 'movedText', '{headline} {place} {', moved, 'it is announced as it is written'));
    expect(first).toEqual([
      '[tanrei] <tanrei-places-test-list>: movedText holds {place}, which is not a place of it ({headline}, {position}, {count}); it is announced as it is written (LST-42)',
      '[tanrei] <tanrei-places-test-list>: movedText holds a brace that opens or closes nothing (a brace meant as one is written twice, {{ or }}); it is announced as it is written (LST-42)',
    ]);
    // The same fault again, on this element or on another of its kind: nothing more.
    expect(warned(() => reportPlaces(list, 'LST-42', 'movedText', '{headline} {place} {', moved, 'it is announced as it is written'))).toEqual([]);
    expect(warned(() => reportPlaces(element('tanrei-places-test-list'), 'LST-42', 'movedText', '{place}', moved, 'it is announced as it is written'))).toEqual([]);
    // Another fault of the same prop is another report.
    expect(warned(() => reportPlaces(list, 'LST-42', 'movedText', '{headlin}', moved, 'it is announced as it is written'))).toHaveLength(1);
    // A needed place that is absent is its caller's to report, with what it breaks.
    expect(warned(() => reportPlaces(element('tanrei-places-test-field'), 'CHF-23', 'removeLabel', 'Remove', wordPlaces.entryRemoveLabel!, 'x'))).toEqual([]);
    // A release build reports nothing.
    const mode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(warned(() => reportPlaces(list, 'LST-42', 'movedText', '{another}', moved, 'it is announced as it is written'))).toEqual([]);
    } finally {
      if (mode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = mode;
    }
  });

  test('the keys of the product’s words that have places are the specs’, and every place is a number or a text', () => {
    expect(Object.keys(wordPlaces).sort()).toEqual(['avatarGroupOverflowLabel', 'characterCountNoLimitText', 'characterCountText', 'entriesAddedText', 'entryAddedText', 'entryRemoveLabel', 'entryRemovedText', 'filesDroppedText', 'filesRefusedText', 'imageCountText', 'moveDownLabel', 'moveUpLabel', 'movedText', 'removeLabel', 'retryLabel']);
    expect(wordPlaces.movedText).toEqual([
      { name: 'headline', kind: 'text' },
      { name: 'position', kind: 'number' },
      { name: 'count', kind: 'number' },
    ]);
    expect(wordPlaces.entryRemoveLabel).toEqual([{ name: 'entry', kind: 'text', required: true }]);
    const kinds = new Map(Object.values(wordPlaces).flatMap((places) => places!.map((place) => [place.name, place.kind])));
    expect([...kinds].sort()).toEqual([['count', 'number'], ['entry', 'text'], ['headline', 'text'], ['limit', 'number'], ['name', 'text'], ['position', 'number'], ['remaining', 'number']]);
  });
});

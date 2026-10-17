import { CONFIG, exists, loadSpecs, read } from './conventions.js';
import { readPlaces } from './places.js';

/**
 * The product's words: Tanrei has no words of its own, and a prop whose words a product says the same way
 * wherever the part is drawn names, in its spec, the key under which the product gives them once (`words`). This is
 * the one list of those keys — each with the props that read it — and every platform's type of the product's words is
 * written from it, so that no platform keeps a list by hand.
 *
 * A key whose word has places a component fills carries them as `places`, as its readers declare them:
 * `validate` holds that every reader of one key declares the same (rule P6 of `placesProblems`), so the first
 * reader's are the key's. A key without places has no such field.
 */
export function productWords(specs = loadSpecs().map(({ spec }) => spec)) {
  const readers = new Map();
  const places = new Map();
  const add = (key, reader, prop) => {
    readers.set(key, [...(readers.get(key) ?? []), reader]);
    if (prop.places && !places.has(key)) places.set(key, prop.places.map(({ name, kind, description, required }) => ({ name, kind, description, ...(required ? { required: true } : {}) })));
  };
  for (const spec of [...specs].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const prop of spec.props) if (prop.words) add(prop.words, { component: spec.name, prop: prop.name }, prop);
    for (const kind of spec.items ?? []) for (const prop of kind.props ?? []) if (prop.words) add(prop.words, { component: spec.name, item: kind.name, prop: prop.name }, prop);
  }
  return [...readers.keys()].sort().map((key) => ({ key, readers: readers.get(key), ...(places.has(key) ? { places: places.get(key) } : {}) }));
}

/** A key's places as a sentence of its comment: "`{entry}` (text, needed)". */
const placesLine = (places) => places.map((p) => `\`{${p.name}}\` (${p.kind}${p.required ? ', needed' : ''})`).join(', ');

const readerName = ({ component, item, prop }) => `${component}${item ? `/${item}` : ''}.${prop}`;

/** The web's type of the product's words: what `setWords()` takes and `missingWords()` returns keys of. */
export function emitWordsTs(words = productWords(), namespace = CONFIG.namespace) {
  const type = `${namespace[0].toUpperCase()}${namespace.slice(1)}Words`;
  const lines = [
    '// GENERATED FILE — DO NOT EDIT.',
    '// Source: specs/*.spec.json (the `words` field of a prop). Regenerate with `pnpm generate`.',
    "// The keys of the product's words: the words a product gives once, for every component that reads them.",
    '',
    "/** The product's words in one language. Every key is optional: a product gives the words of the components it uses. */",
    `export interface ${type} {`,
    ...words.flatMap(({ key, readers, places }) => [
      `  /** Read by ${readers.map((r) => `\`${readerName(r)}\``).join(', ')}.${places ? ` A word with places: ${placesLine(places)}.` : ''} */`,
      `  ${key}?: string;`,
    ]),
    '}',
    '',
    "/** One key of the product's words. */",
    `export type WordKey = keyof ${type};`,
    '',
    "/** Every key of the product's words, in alphabetical order. */",
    `export const wordKeys: readonly WordKey[] = [${words.map(({ key }) => `'${key}'`).join(', ')}];`,
    '',
    '/** The props that read each key, as `<component>.<prop>` and, for an item kind, `<component>/<kind>.<prop>`. */',
    'export const wordReaders: Readonly<Record<WordKey, readonly string[]>> = {',
    ...words.map(({ key, readers }) => `  ${key}: [${readers.map((r) => `'${readerName(r)}'`).join(', ')}],`),
    '};',
    '',
    '/** One place of a word: the name the product writes between braces, and whether a number or a text fills it. */',
    'export interface WordPlace {',
    '  name: string;',
    "  kind: 'number' | 'text';",
    '  /** The sentence is used as written without it, and that is reported in debug builds. */',
    '  required?: true;',
    '}',
    '',
    '/**',
    ' * The places of each key whose word has any: the product writes `{name}` where the value goes, and the component',
    ' * that reads the key fills it. A key that is not here is a whole string, and its braces are plain text.',
    ' */',
    'export const wordPlaces: Readonly<Partial<Record<WordKey, readonly WordPlace[]>>> = {',
    ...words.filter(({ places }) => places).map(({ key, places }) => `  ${key}: [${places.map((p) => `{ name: '${p.name}', kind: '${p.kind}'${p.required ? ', required: true' : ''} }`).join(', ')}],`),
    '};',
    '',
  ];
  return lines.join('\n');
}

/**
 * The English word pack: a word for every key, written by hand in `specs/words/en.json` (`{ description, words }`).
 * No component reads it; a product applies it only by importing it (`@tanrei/web/words/en`). Returns the pack's words,
 * or `{}` where the file is missing.
 */
export const WORD_PACK = 'specs/words/en.json';
export const readWordPack = (file = WORD_PACK) => (exists(file) ? (JSON.parse(read(file)).words ?? {}) : {});

/**
 * What keeps the pack from being whole: a key of the list without a word, a word whose key the list does not have, and
 * a word that does not keep the places its key declares — a place the key does not have, a brace that opens or closes
 * nothing, a needed place left out. `pnpm validate` and `pnpm drift` report these.
 */
export function wordPackProblems(words = productWords(), pack = readWordPack(), file = WORD_PACK) {
  const problems = [];
  const keys = new Set(words.map(({ key }) => key));
  for (const { key, places } of words) {
    const text = pack[key];
    if (typeof text !== 'string' || text.trim() === '') {
      problems.push(`${file}: no word for "${key}", a key of the product's words: write its English word`);
      continue;
    }
    if (!places) continue;
    const names = places.map((p) => p.name);
    const sentence = readPlaces(text, names);
    for (const written of sentence.unknown) problems.push(`${file}: "${key}" writes ${written}, which is not a place of it (${names.map((n) => `{${n}}`).join(', ')})`);
    if (sentence.stray) problems.push(`${file}: "${key}" has a brace that opens or closes nothing; a brace is written twice`);
    for (const p of places) if (p.required && !sentence.used.has(p.name)) problems.push(`${file}: "${key}" is without the place {${p.name}}, which it needs`);
  }
  for (const key of Object.keys(pack)) if (!keys.has(key)) problems.push(`${file}: "${key}" is not a key of the product's words (docs/status/words.json): remove it`);
  return problems;
}

/**
 * The web's module of the pack's words, in the order of the list. It is typed as the whole set, so a key without a
 * word fails the type check as well as `wordPackProblems()`.
 */
export function emitWordPackTs(words = productWords(), pack = readWordPack(), namespace = CONFIG.namespace) {
  const type = `${namespace[0].toUpperCase()}${namespace.slice(1)}Words`;
  return [
    '// GENERATED FILE — DO NOT EDIT.',
    `// Source: ${WORD_PACK}, in the order of the keys of the specs. Regenerate with \`pnpm generate\`.`,
    '// The English word pack. Only src/words/en.ts imports it: a product applies it by importing `@tanrei/web/words/en`.',
    '',
    `import type { ${type} } from './words.js';`,
    '',
    "/** A word for every key of the product's words, in plain English. */",
    `export const englishWords: Readonly<Required<${type}>> = {`,
    ...words.filter(({ key }) => typeof pack[key] === 'string').map(({ key }) => `  ${key}: ${JSON.stringify(pack[key])},`),
    '};',
    '',
  ].join('\n');
}

/** The generated files of the product's words: the platform-neutral list, the web's type, and the web's English pack. */
export function wordsFiles() {
  const words = productWords();
  return {
    'docs/status/words.json': `${JSON.stringify({ keys: words }, null, 2)}\n`,
    'packages/web/src/generated/words.ts': emitWordsTs(words),
    'packages/web/src/generated/words-en.ts': emitWordPackTs(words),
  };
}

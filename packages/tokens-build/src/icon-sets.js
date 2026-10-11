// Icon-set data: what Tanrei needs to know about an icon set that its font cannot tell it — which glyph
// names are mirrored in a right-to-left layout. One file per set, tokens/icon-sets/<id>.icon-set.json, validated by
// tokens/schema/icon-set.schema.json. It is data, not a token: a system gets the file whose `families` holds the first
// family of its sys.icon.family.unselected, and a system whose set has no file mirrors no glyph by itself.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { GENERATED_HEADER } from './pure.js';

const DIR = 'tokens/icon-sets';
const SUFFIX = '.icon-set.json';

/** Every icon-set file of the repository, parsed, sorted by file id: `[{ fileId, doc }]`. */
export function loadIconSets(repoRoot) {
  const dir = path.join(repoRoot, DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(SUFFIX))
    .sort()
    .map((f) => ({ fileId: f.slice(0, -SUFFIX.length), doc: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

/**
 * Problems in a list of icon-set files: the schema, the id against the file name, a family claimed by two files, a
 * list that is not sorted (it is regenerated, never edited: an unsorted list is a hand edit or a broken generator), and
 * a shipped set with no source to regenerate and attribute it from.
 * @param {object} schema tokens/schema/icon-set.schema.json, parsed
 * @param {{ fileId: string, doc: object }[]} sets
 * @returns {string[]}
 */
export function checkIconSets(schema, sets) {
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  const problems = [];
  const owner = new Map();
  for (const { fileId, doc } of sets) {
    const file = `${fileId}${SUFFIX}`;
    if (!validate(doc)) {
      problems.push(...validate.errors.map((e) => `${file} ${e.instancePath || '/'} ${e.message}`));
      continue;
    }
    if (doc.id !== fileId) problems.push(`${file}: "id" must equal the file name`);
    if (!doc.source) problems.push(`${file}: a set Tanrei ships names its "source"`);
    for (const family of doc.families) {
      if (owner.has(family)) problems.push(`${file}: family "${family}" is already described by ${owner.get(family)}${SUFFIX}`);
      else owner.set(family, fileId);
    }
    const sorted = [...doc.mirrored].sort();
    if (sorted.some((name, i) => name !== doc.mirrored[i])) problems.push(`${file}: "mirrored" is not sorted`);
  }
  return problems;
}

/** `checkIconSets` for the files on disk. */
export function validateIconSets(repoRoot) {
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tokens/schema/icon-set.schema.json'), 'utf8'));
  return checkIconSets(schema, loadIconSets(repoRoot));
}

/**
 * The icon set a system draws: the file whose `families` holds the first family of its sys.icon.family.unselected.
 * @param {{ fileId: string, doc: object }[]} sets
 * @param {string[] | undefined} families the system's resolved unselected icon font stack
 * @returns {object | null} the icon-set document, or null when no file describes that family
 */
export function iconSetFor(sets, families) {
  const first = families?.[0];
  return sets.find(({ doc }) => doc.families.includes(first))?.doc ?? null;
}

/**
 * The web's copy of the data: each set once, and the set of each shipped system. The icon helper reads it; nothing
 * else does. (The native platforms have no list of their own.)
 * @param {{ fileId: string, doc: object }[]} sets
 * @param {Record<string, string | null>} bySystem system id → icon-set id, or null when its family has no file
 */
export function emitIconSetsTs(sets, bySystem) {
  const lines = [
    ...GENERATED_HEADER.map((l) => `// ${l}`),
    '// The icon-set data of tokens/icon-sets/*.icon-set.json.',
    '',
    '/** One icon set: the font families it describes and the glyph names mirrored in a right-to-left layout. */',
    'export interface IconSet {',
    '  readonly families: readonly string[];',
    '  readonly mirrored: ReadonlySet<string>;',
    '}',
    '',
    '/** Every icon set that has a data file, by id. */',
    'export const iconSets: Readonly<Record<string, IconSet>> = {',
    ...sets.flatMap(({ doc }) => [
      `  ${JSON.stringify(doc.id)}: {`,
      `    families: ${JSON.stringify(doc.families)},`,
      `    mirrored: new Set(${JSON.stringify(doc.mirrored)}),`,
      '  },',
    ]),
    '};',
    '',
    '/** The icon set of each shipped design system, by system id; null where the system\'s icon family has no data file (nothing mirrors by itself). */',
    'export const systemIconSets: Readonly<Record<string, string | null>> = {',
    ...Object.entries(bySystem).map(([system, id]) => `  ${JSON.stringify(system)}: ${JSON.stringify(id)},`),
    '};',
    '',
  ];
  return lines.join('\n');
}

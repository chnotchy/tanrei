// What the published @tanrei/cli and @tanrei/mcp carry of the vocabulary: what they read at run time, and nothing
// else. Each package's build writes its copy with these functions, and each package's suite proves the copy is enough
// (packages/<cli|mcp>/test/packed-vocabulary.test.js): every file a run reads from the repository is in the copy, and
// every answer from the copy is the same, byte for byte, as the answer from the repository.
import fs from 'node:fs';
import path from 'node:path';

/**
 * What tokens/ holds that no run reads: the generated outputs (a run computes every system from its layers; the mcp
 * copies the few reports it reads as they are), the lock file (what the repository's own drift check compares the core
 * against) and the contributors' notes.
 */
export const UNREAD_TOKEN_ENTRIES = ['generated', 'vocabulary.lock.json', 'AGENTS.md'];

/** tokens/ as a run reads it: the sources, without what `UNREAD_TOKEN_ENTRIES` names. */
export function copyTokenSources(repo, vocabulary) {
  const unread = new Set(UNREAD_TOKEN_ENTRIES.map((name) => path.join('tokens', name)));
  fs.cpSync(path.join(repo, 'tokens'), path.join(vocabulary, 'tokens'), { recursive: true, filter: (source) => !unread.has(path.relative(repo, source)) });
}

/**
 * What of a component spec the mcp never reads: the schema pointer, `uses`, `fills`, `anatomyFixture`, the spec's
 * `layer` and `category` (the mcp takes a component's category from the inventory and its layer from the manifest),
 * each rule's `verify` (the tests that hold it to its words) and each fixture's `twin` (the member fixture it is drawn
 * against), which get_component leaves out of what it returns.
 */
export const UNREAD_SPEC_KEYS = ['$schema', 'uses', 'fills', 'anatomyFixture', 'layer', 'category'];

/** A spec as the mcp reads it, keys in the order the spec writes them. */
export function packedSpec(spec) {
  const out = {};
  for (const [key, value] of Object.entries(spec)) {
    if (UNREAD_SPEC_KEYS.includes(key)) continue;
    if (key === 'behavior') out.behavior = value.map(({ verify: _verify, ...rule }) => rule);
    else if (key === 'fixtures') out.fixtures = value.map(({ twin: _twin, ...fixture }) => fixture);
    else out[key] = value;
  }
  return out;
}

/**
 * What the mcp reads of specs/component.schema.json: the platforms a spec names, the statuses a platform may have,
 * and the values of `level` and `listing` — the enums list_components filters on. Nothing validates a spec at run time.
 */
export function packedComponentSchema(schema) {
  return {
    $comment: 'The parts of specs/component.schema.json that @tanrei/mcp reads, written by its build. Not a schema to validate with.',
    properties: {
      platforms: { properties: Object.fromEntries(Object.keys(schema.properties.platforms.properties).map((platform) => [platform, {}])) },
      level: { enum: schema.properties.level.enum },
      listing: { enum: schema.properties.listing.enum },
    },
    $defs: { platform: { properties: { status: { enum: schema.$defs.platform.properties.status.enum } } } },
  };
}

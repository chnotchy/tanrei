// Vocabulary rationale and LLM guidance are read from the token or inherited from the groups above it.
// `dev.tanrei.llm` is optional: a vocabulary without it yields an empty list, never an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectMetadata } from '../src/systems.js';

test('metadata is inherited from groups; the nearest rationale wins, guidance accumulates outermost first', () => {
  const meta = collectMetadata({
    'sys/shape.tokens.json': {
      tanrei: {
        sys: {
          shape: {
            $extensions: { 'dev.tanrei.vocabulary': { rationale: 'group rationale' }, 'dev.tanrei.llm': { use: 'Corners of containers.' } },
            corner: {
              small: { $value: { value: 6, unit: 'px' } },
              full: { $value: { value: 9999, unit: 'px' }, $extensions: { 'dev.tanrei.vocabulary': { rationale: 'own rationale' }, 'dev.tanrei.llm': { avoid: 'Do not use for cards.' } } },
            },
          },
          space: { space100: { $value: { value: 8, unit: 'px' } } },
        },
      },
    },
    'tanrei.resolver.json': { sets: {} },
    'generated/sys.color.dark.tokens.json': { tanrei: { sys: { color: { primary: { $value: '{x}', $extensions: { 'dev.tanrei.llm': { use: 'ignored: the light document carries the same metadata' } } } } } } },
  });
  assert.deepEqual(meta.get('tanrei.sys.shape.corner.small'), { vocabulary: { rationale: 'group rationale', from: 'tanrei.sys.shape' }, llm: [{ from: 'tanrei.sys.shape', guidance: { use: 'Corners of containers.' } }] });
  assert.equal(meta.get('tanrei.sys.shape.corner.full').vocabulary.from, 'tanrei.sys.shape.corner.full');
  assert.deepEqual(meta.get('tanrei.sys.shape.corner.full').llm.map((g) => g.from), ['tanrei.sys.shape', 'tanrei.sys.shape.corner.full']);
  assert.deepEqual(meta.get('tanrei.sys.space.space100'), { vocabulary: undefined, llm: [] });
  assert.ok(!meta.has('tanrei.sys.color.primary'));
});

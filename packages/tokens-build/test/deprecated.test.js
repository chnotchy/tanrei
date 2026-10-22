// Tanrei's own token sources carry no `$deprecated`: during the 0.x prereleases a token that goes is removed, with what
// reads it, and the changeset names it. The emitters have no path for a deprecated token.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deprecatedInSources } from '../src/model.js';

test('a $deprecated token, group or layer entry in a source is refused, by file and path', () => {
  const problems = deprecatedInSources({
    'tokens/comp/x.tokens.json': { tanrei: { comp: { x: { size: { $type: 'dimension', $deprecated: 'Use gap.', $value: { value: 4, unit: 'px' } } } } } },
    'tokens/sys/y.tokens.json': { tanrei: { sys: { y: { $deprecated: true, one: { $type: 'number', $value: 1 } } } } },
    'tokens/systems/z.system.json': { id: 'z', tokens: { 'tanrei.comp.x.size': { $value: { value: 8, unit: 'px' }, $deprecated: 'Gone.' } } },
  });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /^tokens\/comp\/x\.tokens\.json: tanrei\.comp\.x\.size has \$deprecated — during 0\.x a token is removed/);
  assert.match(problems[1], /^tokens\/sys\/y\.tokens\.json: tanrei\.sys\.y has \$deprecated/);
  assert.match(problems[2], /^tokens\/systems\/z\.system\.json: tokens\.tanrei\.comp\.x\.size has \$deprecated/);
});

test('a source without $deprecated passes, as does a token named "deprecated" or a description that mentions it', () => {
  assert.deepEqual(deprecatedInSources({ 'tokens/comp/x.tokens.json': { tanrei: { comp: { x: { deprecated: { $type: 'number', $value: 1, $description: 'Not $deprecated.' } } } } } }), []);
});

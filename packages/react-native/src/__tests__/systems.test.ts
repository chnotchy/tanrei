// The shipped systems, independent of any component: the rule "design systems differ in values, never in tokens" for
// what is not a component token (schemes, roles, intents, series, the type scale), and no library source that knows a
// preset. Each component proves its own tokens with `describeSharedVocabulary` (src/testing/harness.tsx).
import fs from 'node:fs';
import path from 'node:path';
import { tanrei } from '../generated/systems/tanrei';
import { SHIPPED_SYSTEMS } from '../testing/harness';
import { intentRoles, referencedRoles, schemesOf, unknownRoles } from '../testing/systemRoles';

describe.each(SHIPPED_SYSTEMS)('structure of the shipped system $id', (system) => {
  test('has the six schemes of the vocabulary', () => {
    expect(schemesOf(system).sort()).toEqual(schemesOf(tanrei).sort());
    expect(schemesOf(system)).toHaveLength(6);
  });

  test('every role a component token or an elevation layer references exists in all six schemes', () => {
    expect(referencedRoles(system).length).toBeGreaterThan(0);
    expect(unknownRoles(system)).toEqual([]);
  });

  test('every intent resolves to four roles in all six schemes', () => {
    expect(system.intents.length).toBeGreaterThan(0);
    for (const intent of system.intents) {
      expect(intentRoles(intent)).toHaveLength(4);
      expect(unknownRoles(system, intentRoles(intent))).toEqual([]);
    }
  });

  test('speaks the same vocabulary as the default system outside the components: same series, only values differ', () => {
    expect(Object.keys(system.components).sort()).toEqual(Object.keys(tanrei.components).sort());
    for (const key of ['shape', 'space', 'state', 'measure', 'icon', 'elevation'] as const) {
      expect(Object.keys(system[key]).sort()).toEqual(Object.keys(tanrei[key]).sort());
    }
    // The type scale: every core role and the four emphasis steps; a preset ADDS the roles its source has and the core
    // lacks — m3-like the two other display sizes, cupertino callout / subhead / caption-2.
    expect(Object.keys(system.typescale)).toEqual(expect.arrayContaining(Object.keys(tanrei.typescale)));
    expect(Object.keys(system.typescale.emphasis).sort()).toEqual(['body', 'display', 'heading', 'label']);
    expect(system.shape.cornerSmoothing).toBeGreaterThanOrEqual(0);
    expect(system.shape.cornerSmoothing).toBeLessThanOrEqual(1);
  });

  test('the roles it adds to the type scale are the ones its source has, reachable under any system through its accessors', () => {
    const added = Object.keys(system.typescale).filter((key) => !(key in tanrei.typescale)).sort();
    const expected: Record<string, string[]> = { tanrei: [], 'm3-like': ['displayLarge', 'displaySmall'], cupertino: ['bodyCallout', 'bodySubhead', 'captionSmall'] };
    expect(added).toEqual(expected[system.id]);
  });
});

test('SHIPPED_SYSTEMS is every system under src/generated/systems/', () => {
  const shipped = fs.readdirSync(path.resolve(__dirname, '../generated/systems')).map((file) => file.replace(/\.ts$/, '')).sort();
  expect(SHIPPED_SYSTEMS.map((system) => system.id).sort()).toEqual(shipped);
});

describe('no preset-specific code', () => {
  const SRC = path.resolve(__dirname, '..');
  const files = ['components', 'primitives', 'theme'].flatMap((dir) =>
    fs
      .readdirSync(path.join(SRC, dir))
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => path.join(SRC, dir, name)),
  );

  test.each(files.map((file) => [path.relative(SRC, file), file]))('%s never names a preset or branches on the system id', (_, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(/m3-?like|cupertino|material/i);
    expect(source).not.toMatch(/system\.id|\.id\s*===/);
  });
});

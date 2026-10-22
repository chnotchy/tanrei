// Runtime dials must agree with the build. The browser evaluates the emitted
// calc()/pow()/round() expressions; the engine evaluates the same rules in JS. For the default
// dials and for perturbed ones, every derived length and duration has to come out identical.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { mergeLayers, resolveNumericTokens, walkTokens } from '@tanrei/token-engine';
import { loadSpec, mountFixtures, resolveToken, rootTokens } from '../test/harness.js';

const tokensDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../tokens');
const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(tokensDir, rel), 'utf8'));
const resolver = read('tanrei.resolver.json');
const sources = Object.fromEntries(
  Object.values<{ sources: { $ref: string }[] }>(resolver.sets)
    .flatMap((set) => set.sources.map((s) => s.$ref))
    .filter((ref) => !ref.startsWith('generated/'))
    .map((ref) => [ref, read(ref)]),
);
const root = read('systems/tanrei.system.json');

const DIAL_SETS: Record<string, Record<string, [number, string]>> = {
  defaults: {},
  larger: { 'type.base': [18, 'px'], 'space.unit': [10, 'px'], 'size.unit': [5, 'px'] },
  'dense and sharp': { 'type.base': [14, 'px'], 'space.unit': [6, 'px'], 'shape.unit': [1, 'px'], 'motion.unit': [35, 'ms'] },
  'strong hierarchy': { 'type.contrast': [1.2, ''], 'shape.unit': [3.5, 'px'], 'stroke.unit': [1.5, 'px'] },
  // The density moves heights on the size unit's grid, never below the minimum target, and the paddings with them.
  // 0.95 puts many heights on a tie of the 4px grid (4 × 10 × 0.95 = 38), which every engine rounds upward.
  denser: { density: [0.95, ''] },
  dense: { density: [0.85, ''] },
  'roomier, on another grid': { density: [1.3, ''], 'size.unit': [4.5, 'px'] },
};

for (const [label, dials] of Object.entries(DIAL_SETS)) {
  test(`runtime dials match the build: ${label}`, async ({ page }) => {
    const layer = {
      id: 'probe',
      tokens: Object.fromEntries(
        Object.entries(dials).map(([name, [value, unit]]) => [`tanrei.dial.${name}`, { $value: unit ? { value, unit } : value, reason: 'Dial parity test.' }]),
      ),
    };
    const docs = resolveNumericTokens(sources, mergeLayers([root, layer]));

    await mountFixtures(page, loadSpec('button'));
    await rootTokens(page, Object.fromEntries(Object.entries(dials).map(([name, [value, unit]]) => [`--tanrei-dial-${name.replace('.', '-')}`, unit === 'px' ? `${value / 16}rem` : `${value}${unit}`] as [string, string])));

    let checked = 0;
    const mismatches: string[] = [];
    for (const doc of Object.values(docs)) {
      for (const { id, token, type } of walkTokens(doc as object)) {
        const rule = (token as any).$extensions?.['dev.tanrei.derive'];
        if (!rule || 'fixed' in rule || id.split('.')[1] === 'dial') continue;
        const css = `--${id.replaceAll('.', '-')}`;
        const value = (token as any).$value;
        const [name, expected, kind] =
          type === 'typography' ? [`${css}-font-size`, value.fontSize.value, 'length' as const] : [css, value.value, type === 'duration' ? ('duration' as const) : ('length' as const)];
        const actual = await resolveToken(page, name, kind);
        checked++;
        if (Math.abs(actual - expected) > 0.001) mismatches.push(`${id}: browser ${actual}, engine ${expected}`);
      }
    }
    // A floor against an empty walk, not a count: the 16 typescale roles alone derive dozens of tokens.
    expect(checked).toBeGreaterThan(80);
    expect(mismatches, mismatches.slice(0, 8).join('\n')).toEqual([]);
  });
}

// Regenerates the generated fixtures of the Flutter tests:
//
//   test_fixtures/acme_system.g.dart — the Flutter output of `tanrei build` for the fixture layer
//     packages/tokens-build/test/fixtures/acme.system.json, which extends the vocabulary in every way a layer
//     allows. The tests in test/systems/extensions_test.dart compile against it.
//   test_fixtures/tone_per_state_system.g.dart (+ tone_per_state_expected.g.dart) — the same for
//     tone-per-state.system.json, whose filled Button takes two state colors from a non-monotonic `tone` rule, so
//     they reach Dart as `TanreiPaint.scheme`. The `expected` file holds what the
//     TOKEN BUNDLE says those colors are in each scheme — not what the Dart emitter wrote — so
//     test/components/button_per_scheme_paint_test.dart compares the emitter and the widget against the source.
//
//   node packages/flutter/tool/generate_acme_fixture.mjs      (from the repository root)
//
// The file lives outside test/ because CI checks the formatting of test/, and generated code is never formatted.
// Run it whenever packages/tokens-build/src/emit/dart.js, the fixture layer or the vocabulary changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const { buildProductSystem } = await import(path.join(repoRoot, 'packages/tokens-build/src/product.js'));
const { resolveSystem } = await import(path.join(repoRoot, 'packages/tokens-build/src/resolve.js'));
const { buildIR } = await import(path.join(repoRoot, 'packages/tokens-build/src/ir.js'));
const { emitDart } = await import(path.join(repoRoot, 'packages/tokens-build/src/emit/dart.js'));

function write(name, text) {
  const out = path.join(here, '../test_fixtures', name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log(`✔ ${path.relative(repoRoot, out)}`);
}

const { files } = await buildProductSystem({
  layerFile: path.join(repoRoot, 'packages/tokens-build/test/fixtures/acme.system.json'),
  targets: ['flutter'],
  command: 'node packages/flutter/tool/generate_acme_fixture.mjs',
});
for (const [name, text] of Object.entries(files.flutter)) write(name, text);

// The per-scheme fixture goes through the emitter's own entry point — what `buildProductSystem` calls for the
// `flutter` target — because `buildProductSystem` refuses a system with per-scheme paints for every target still on
// the blocked list of `refusePerSchemePaints` (product.js), whatever this emitter can do.
{
  const layer = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/tokens-build/test/fixtures/tone-per-state.system.json'), 'utf8'));
  const resolved = await resolveSystem({ layers: [layer] });
  const ir = buildIR(await resolved.model());
  for (const [file, text] of Object.entries(emitDart(ir, { external: true }))) write(path.basename(file), text);

  const states = ['hovered', 'pressed'];
  const camel = (s) => s.replace(/-(.)/g, (_, c) => c.toUpperCase());
  const color = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
  const at = (scheme, state) => resolved.tokens(scheme)[`tanrei.comp.button.filled.${state}.container.color`].$value.hex;
  write(
    'tone_per_state_expected.g.dart',
    [
      '// GENERATED FILE — DO NOT EDIT. Regenerate with `node packages/flutter/tool/generate_acme_fixture.mjs`.',
      '//',
      '// What the resolved TOKENS of the "tone-per-state" fixture say the filled Button\'s container color is, per scheme',
      '// and state (`tanrei.comp.button.filled.<state>.container.color`). Read from the token bundle, not from the Dart',
      '// emitter: the test compares the two.',
      '// ignore_for_file: type=lint',
      "import 'dart:ui' show Color;",
      '',
      'const Map<String, Map<String, Color>> tonePerStateExpected = <String, Map<String, Color>>{',
      ...ir.schemes.map((scheme) => `  '${camel(scheme)}': <String, Color>{${states.map((state) => `'${state}': ${color(at(scheme, state))}`).join(', ')}},`),
      '};',
      '',
    ].join('\n'),
  );
}

// Checks of the Swift emitter that the shipped systems cannot exercise, because no shipped system (and not the
// acme fixture) produces the input: a per-scheme paint (`{ kind: 'scheme', by }`),
// an added spring SCHEME, and the refusal of a font stack whose generic class SwiftUI cannot carry.
// The Swift side of the same features is tested in Tests/TanreiTests (TanreiPaintTests, TanreiPrimitivesTests).
//
//   node packages/swiftui/scripts/check-emitter.mjs        exit 1 on the first failed expectation
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(root);
const { emitSwift } = await import('../../tokens-build/src/emit/swift.js');
const { buildIR } = await import('../../tokens-build/src/ir.js');
const { buildModel } = await import('../../tokens-build/src/model.js');

const ir = () => structuredClone(base);
const base = buildIR(await buildModel());
const values = (x) => Object.entries(emitSwift(x, { vocabulary: false })).find(([file]) => file.endsWith('TanreiSystem+Tanrei.swift'))[1];

// 1. A per-scheme paint becomes `.scheme(by:)` with all six schemes, inner paints of the existing kinds.
{
  const x = ir();
  const token = x.componentTokens.button.find((t) => t.type === 'color' && t.paint.kind === 'role');
  const inner = { kind: 'mix', base: { kind: 'role', role: 'primary' }, with: { kind: 'none' }, amount: 0.5 };
  token.paint = { kind: 'scheme', by: Object.fromEntries(x.schemes.map((s, i) => [s, i ? { kind: 'role', role: 'primary' } : inner])) };
  const text = values(x);
  assert.match(text, /\.scheme\(by: \[\.light: \.mix\(base: \.role\(\.primary\), with: \.none, amount: 0\.5\), \.lightMedium: \.role\(\.primary\), \.lightHigh: \.role\(\.primary\), \.dark: \.role\(\.primary\), \.darkMedium: \.role\(\.primary\), \.darkHigh: \.role\(\.primary\)\]\)/);
  assert.match(text, /TanreiColors\(scheme: \.darkHigh, values: \[/);
}

// 2. An added spring (one scheme only) and an added spring SCHEME: `extra`, constants, typed accessors.
{
  const x = ir();
  x.system = 'tanrei';
  const wobble = { damping: 0.4, stiffness: 300, easing: [0.3, 1.5, 0.3, 1], duration: 600 };
  x.spring.standard.wobble = wobble;
  x.spring.playful = Object.fromEntries(Object.keys(base.spring.standard).map((k) => [k, wobble]));
  x.extensions.series.spring = [
    { key: 'wobble', scheme: 'standard', id: 'tanrei.sys.motion.spring.standard.wobble', declaredBy: 'tanrei', value: wobble },
    ...Object.keys(x.spring.playful).map((k) => ({ key: k, scheme: 'playful', id: `tanrei.sys.motion.spring.playful.${k}`, declaredBy: 'tanrei', value: wobble })),
  ];
  const text = values(x);
  assert.match(text, /private let tanreiSpringStandardWobble: TanreiSpringSpec = TanreiSpringSpec\(damping: 0\.4, stiffness: 300/);
  assert.match(text, /"wobble": tanreiSpringStandardWobble,/);
  assert.match(text, /private let tanreiSpringsPlayful: TanreiSpringSet = /);
  assert.match(text, /"playful": tanreiSpringsPlayful,/);
  assert.match(text, /extension TanreiSpringSet \{[\s\S]*public var wobble: TanreiSpringSpec \{[\s\S]*return tanreiSpringStandardWobble/);
  assert.match(text, /extension TanreiSprings \{[\s\S]*public var playful: TanreiSpringSet \{/);
  // A scheme that lacks a core spring is refused with a message, not emitted half.
  delete x.spring.playful['fast-spatial'];
  assert.throws(() => values(x), /spring scheme "playful".*lacks the core springs fast-spatial/);
}

// 3. The generic class is the IR's reading for a platform with three classes of platform font
//    (`genericClass`): a stack that ends in `cursive` arrives as sans-serif and is emitted as such — the emitter decides
//    nothing. What SwiftUI cannot carry is still refused by name: a class outside the three, and an IR without
//    `genericClass` (an older one) whose `generic` is outside them.
{
  const { fontStack } = await import('../../tokens-build/src/ir.js');
  const cursive = fontStack(['Snell Roundhand', 'cursive']);
  assert.equal(cursive.generic, 'cursive');
  assert.equal(cursive.genericClass, 'sans-serif');
  const x = ir();
  x.typefaces.brand = cursive;
  assert.match(values(x), /brand: TanreiFontStack\(families: \["Snell Roundhand"\], generic: \.sansSerif, system: false\)/);

  const y = ir();
  y.typefaces.brand = { ...y.typefaces.brand, genericClass: 'cursive' };
  assert.throws(() => values(y), /generic class "cursive"/);

  const z = ir();
  const { genericClass, ...older } = z.typefaces.brand;
  z.typefaces.brand = { ...older, generic: 'fantasy' };
  assert.throws(() => values(z), /generic class "fantasy"/);
}

// 4. Type and shape: the family of a role comes from the IR (`ir.typescale[role].family`, decided once in
//    `pure.js`: the first segment of the name, else label), `emphasis` is written as the four steps, corner smoothing
//    as a number — and what is not one of those is refused by name rather than emitted half: a role whose IR entry
//    carries no family, a missing or extra emphasis step, an amount outside [0, 1].
{
  const { typeFamily } = await import('../../tokens-build/src/pure.js');
  assert.deepEqual(['display', 'heading-3', 'body-callout', 'label-small', 'caption', 'code-small', 'eyebrow', 'kicker'].map(typeFamily), ['display', 'heading', 'body', 'label', 'label', 'label', 'label', 'label']);
  const text = values(ir());
  assert.match(text, /heading1: TanreiTextStyle\([^\n]*family: \.heading\)/);
  assert.match(text, /eyebrow: TanreiTextStyle\([^\n]*family: \.label\)/);
  assert.match(text, /emphasis: TanreiTypeEmphasis\(\n\s+display: 100,\n\s+heading: 100,\n\s+body: 100,\n\s+label: 100\n\s+\)/);
  assert.match(text, /cornerSmoothing: 0\n/);

  const x = ir();
  x.typescale.kicker = { ...x.typescale.eyebrow, family: undefined };
  assert.throws(() => values(x), /role "kicker" has no family in the IR/);
  const x2 = ir();
  x2.typescale.kicker = x2.typescale.eyebrow; // an added role with an unknown first segment: the IR says label
  assert.match(values(x2), /kicker: TanreiTextStyle\([^\n]*family: \.label\)/);
  const y = ir();
  delete y.typeEmphasis.label;
  assert.throws(() => values(y), /lacks the emphasis step of label/);
  const z = ir();
  z.typeEmphasis.code = 100;
  assert.throws(() => values(z), /emphasis step for code, which is not a family/);
  const w = ir();
  w.cornerSmoothing = 1.5;
  assert.throws(() => values(w), /corner smoothing 1.5; it is a number in \[0, 1\]/);
  w.cornerSmoothing = 0.6;
  assert.match(values(w), /cornerSmoothing: 0\.6\n/);
}

// 5. The state lookups: `subscript(state: TanreiInteraction)` is
//    generated next to the groups it reads — total where every interaction state has a group, optional where one has
//    none (the rest state of per-component values; a state a component does not declare, as text-field has no
//    pressed) — and a state that TanreiInteraction does not have is refused by name.
{
  const vocabulary = (x) => Object.entries(emitSwift(x)).find(([file]) => file.endsWith('TanreiTokens.swift'))[1];
  const lookup = (text, type) => text.match(new RegExp(`public struct ${type}: Sendable, Equatable \\{[\\s\\S]*?\\n  public subscript\\(state state: TanreiInteraction\\) -> ([^ ]+) \\{\\n([\\s\\S]*?)\\n  \\}\\n\\}`));
  const text = vocabulary(ir());
  const variant = lookup(text, 'TanreiButtonVariantTokens');
  assert.ok(variant, 'TanreiButtonVariantTokens has a state lookup');
  assert.equal(variant[1], 'TanreiButtonVariantStateTokens');
  assert.match(variant[2], /case \.enabled: return enabled\n    case \.hovered: return hovered\n    case \.focused: return focused\n    case \.pressed: return pressed\n    case \.disabled: return disabled/);
  const shared = lookup(text, 'TanreiButtonTokens');
  assert.equal(shared[1], 'TanreiButtonStateTokens?');
  assert.match(shared[2], /case \.enabled: return nil\n    case \.hovered: return hovered/);

  const x = ir();
  x.componentTokens['icon-button'] = x.componentTokens['icon-button'].filter((t) => t.state !== 'pressed');
  const partial = vocabulary(x);
  const partialVariant = lookup(partial, 'TanreiIconButtonVariantTokens');
  assert.equal(partialVariant[1], 'TanreiIconButtonVariantStateTokens?');
  assert.match(partialVariant[2], /case \.pressed: return nil/);
  assert.match(partial, /`nil` for `pressed`, which icon-button has no group for\./);
  assert.match(lookup(partial, 'TanreiIconButtonTokens')[2], /case \.enabled: return nil[\s\S]*case \.pressed: return nil/);

  const y = ir();
  y.componentTokens.button = y.componentTokens.button.map((t) => (t.state === 'hovered' ? { ...t, state: 'dragged' } : t));
  assert.throws(() => vocabulary(y), /button declares the state\(s\) dragged, which TanreiInteraction does not have/);
}

// 6. A component whose name is a Swift keyword (`switch`) keeps it as a property of TanreiSystem, escaped where it is
//    declared; the values file passes it as an argument label, which Swift allows unescaped.
{
  const text = Object.entries(emitSwift(ir())).find(([file]) => file.endsWith('TanreiTokens.swift'))[1];
  if (Object.keys(base.componentTokens).includes('switch')) {
    // A component's tokens sit behind a copy-on-write box, so that a copy of the system stays small enough for the stack of a test thread.
    assert.match(text, /public var `switch`: TanreiSwitchTokens \{\n    get \{ _switch\.value \}\n    set \{ _switch\.value = newValue \}\n/);
    assert.match(text, /private var _switch: TanreiBox<TanreiSwitchTokens>\n/);
    assert.match(text, /\n    `switch`: TanreiSwitchTokens[,\n]/);
    assert.match(text, /self\._switch = TanreiBox\(`switch`\)\n/);
    // Each component's tokens are a file-scope constant of their own.
    assert.match(values(ir()), /\n    switch: tanreiSwitchTokens,\n/);
    assert.match(values(ir()), /\nprivate let tanreiSwitchTokens = TanreiSwitchTokens\(/);
  }
  assert.doesNotMatch(text, /public var (switch|default|case|for|if|in|is|do|as|repeat|return|struct|class|enum|func|let|var|while): /);
}

console.log('✔ swift emitter: per-scheme paints, added springs and spring schemes, generic classes, type families, emphasis, corner smoothing, state lookups, keyword component names');

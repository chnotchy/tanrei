#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { emitCss } from './emit/css.js';
import { emitFigmaPlan } from './emit/figma.js';
import { fidelityMaps, loadFidelityMap, measureFidelity } from './fidelity.js';
import { dartSystemNames, emitDart } from './emit/dart.js';
import { KOTLIN_PACKAGE, emitKotlin } from './emit/kotlin.js';
import { emitSwift } from './emit/swift.js';
import { emitTs } from './emit/ts.js';
import { checkGuidance, checkSources } from '@tanrei/token-engine';
import { ROOT_SYSTEM, availabilityOf, buildBundle, layerChain, listSystems, shippedLayerProblems, writeBundle } from './bundle.js';
import { emitIconSetsTs, iconSetFor, loadIconSets, validateIconSets } from './icon-sets.js';
import { PRESET_CRITERIA_NOTE, checkInvariants, isCriterionFinding, presetAccessibilityReport } from './invariants.js';
import { buildIR } from './ir.js';
import { CONFIG, GENERATED_HEADER, REPO_ROOT, TOKENS_DIR, buildModel, buildModelFromBundle, lintValues } from './model.js';
import { readBundle } from './reader.js';
import { generateSchemeFiles, loadSystem } from './scheme.js';

function write(relative, content) {
  const file = path.join(REPO_ROOT, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text);
  return true;
}

function generateSchemes() {
  const system = loadSystem(REPO_ROOT);
  const written = [];
  for (const [name, doc] of Object.entries(generateSchemeFiles(system, REPO_ROOT))) {
    const rel = `tokens/generated/${name}`;
    write(rel, doc);
    written.push(rel);
  }
  return written;
}

/** Resolved, alias-free DTCG per scheme — the hand-off format for Figma, Penpot and other design tools. */
function designToolExports(model, dir = 'design/tokens') {
  const files = {};
  for (const scheme of model.schemes) {
    const doc = { $description: `Tanrei tokens resolved for scheme "${scheme}". Generated; do not edit.` };
    for (const token of Object.values(model.tokens)) {
      // Colors that vary by scheme: the roles, and every component color (resting and per state). Other tokens have
      // one value in every scheme.
      const source =
        token.path[0] === 'sys' && token.path[1] === 'color'
          ? model.colors[scheme][token.path[2]]
          : (model.componentColors[scheme]?.[token.id] ?? token);
      let node = doc;
      for (const part of [CONFIG.namespace, ...token.path.slice(0, -1)]) node = node[part] ??= {};
      node[token.path.at(-1)] = {
        $type: source.type,
        $value: source.value,
        ...(token.description ? { $description: token.description } : {}),
      };
    }
    files[`${dir}/tanrei.${scheme}.tokens.json`] = doc;
  }
  return files;
}

/** Every hand-authored DTCG source the resolver names (generated documents are the engine's own output). */
function sourceDocuments() {
  const resolver = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, `${CONFIG.namespace}.resolver.json`), 'utf8'));
  return Object.values(resolver.sets)
    .flatMap((set) => set.sources.map((s) => s.$ref))
    .filter((ref) => !ref.startsWith('generated/'))
    .map((ref) => JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, ref), 'utf8')));
}

function failOn(title, failures) {
  if (!failures.length) return;
  console.error(`✖ ${failures.length} ${title}:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}

/** id + type of every token: vocabulary cannot change without a diff in this one file. */
function vocabularyLock(model) {
  const tokens = Object.values(model.tokens).map((t) => [t.id, t.type]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { $comment: 'Generated. The vocabulary of the default system. A change here is a vocabulary change: it needs the one-product test and maintainer review.', count: tokens.length, tokens: Object.fromEntries(tokens) };
}

const readLayer = (id) => loadSystem(REPO_ROOT, id);

const checkLayers = () => shippedLayerProblems(REPO_ROOT, readLayer);

/**
 * Every system other than the root gets its own bundle and outputs. These are the imitation presets: Tanrei's
 * accessibility criteria do not apply to them in any contrast scheme, so their contrast
 * measurements are information — printed, written to a11y-report.json and named in each artifact's header, never called
 * warnings. A structural or functional failure fails the build here as it does for the root system (point 3).
 */
function nativeSystemFiles(ir, banner) {
  const dart = dartSystemNames(ir.system);
  const files = {
    // `import 'package:tanrei/systems/<id>.dart'` — the preset's public entry point on Flutter.
    [`packages/flutter/lib/systems/${dart.file.replace('_system.g.dart', '.dart')}`]: `${GENERATED_HEADER.map((l) => `// ${l}`).join('\n')}\n/// The "${ir.system}" design system: \`${dart.constant}\`.\nlibrary;\n\nexport '../src/generated/${dart.file}';\n`,
    ...emitTs(ir, { vocabulary: false }), ...emitSwift(ir, { vocabulary: false }), ...emitKotlin(ir, { vocabulary: false }), ...emitDart(ir, { vocabulary: false }) };
  return Object.fromEntries(Object.entries(files).map(([file, text]) => [file, banner.replace('/* ', '// ').replace(' */', '') + text]));
}

/**
 * The icon set a system draws, by its icon family. A system whose family has no icon-set file mirrors
 * no glyph by itself: a warning, never an error — a layer may have no directional glyph at all.
 */
function iconSetOf(ir, sets) {
  const families = ir.iconFamilies?.unselected?.families;
  const set = iconSetFor(sets, families);
  if (!set) console.warn(`⚠ system "${ir.system}": no tokens/icon-sets/*.icon-set.json describes its icon family "${families?.[0] ?? '(none)'}" — no glyph is mirrored in right-to-left by itself`);
  return set?.id ?? null;
}

async function generateSystems(outputs, iconSets, systemIconSets) {
  for (const id of listSystems(REPO_ROOT).filter((s) => s !== ROOT_SYSTEM)) {
    const { files } = buildBundle(REPO_ROOT, layerChain(id, readLayer));
    const bundleDir = `tokens/generated/${id}`;
    outputs.push(...writeBundle(bundleDir, files, write));
    // Read from memory: what was just written is these documents (`test/resolve.test.js` holds the two readings equal).
    const reader = readBundle(files, id);
    await lintValues(reader.tokens());
    const model = await buildModelFromBundle(files, id, reader);
    const findings = checkInvariants(model);
    failOn(`structural/functional invariant violation(s) in system "${id}" — these fail in every system`, findings.filter((f) => !isCriterionFinding(f)));
    const measurements = findings.filter(isCriterionFinding);
    if (measurements.length) console.log(`ℹ system "${id}": ${measurements.length} contrast measurement(s) below Tanrei's thresholds, recorded as information — ${PRESET_CRITERIA_NOTE}`);
    const banner = measurements.length ? `/* ${measurements.length} contrast measurement(s) below Tanrei's thresholds in system "${id}", which do not apply to an imitation preset. See tokens/generated/${id}/a11y-report.json */\n` : '';
    const ir = buildIR(model);
    systemIconSets[id] = iconSetOf(ir, iconSets);
    const targets = {
      [`${bundleDir}/a11y-report.json`]: presetAccessibilityReport(id, measurements),
      // Exactness, measured against the published system this preset reproduces.
      ...(fidelityMaps(REPO_ROOT).includes(id) ? { [`${bundleDir}/fidelity.json`]: measureFidelity(model, loadFidelityMap(id)) } : {}),
      [`packages/web/src/generated/systems/${id}.css`]: banner + emitCss(model, { scope: id, unavailable: availabilityOf(layerChain(id, readLayer)) }),
      ...designToolExports(model, `design/tokens/${id}`),
      // Native values of the preset, next to the default system's: same vocabulary types, one more value.
      // Opt-in by reference — an app that never names the constant does not carry it.
      ...nativeSystemFiles(ir, banner),
    };
    for (const [rel, content] of Object.entries(targets)) { write(rel, content); outputs.push(rel); }
    console.log(`✔ system "${id}": ${Object.keys(model.tokens).length} tokens, ${measurements.length} contrast measurement(s) that do not apply`);
  }
}

async function generate() {
  failOn('source token problem(s)', [...checkSources(sourceDocuments()), ...checkGuidance(sourceDocuments())]);
  failOn('system layer problem(s)', checkLayers());
  failOn('icon set problem(s)', validateIconSets(REPO_ROOT));
  const iconSets = loadIconSets(REPO_ROOT);
  const outputs = generateSchemes();
  const model = await buildModel();
  const failures = checkInvariants(model);
  if (failures.length) {
    console.error(`✖ ${failures.length} token invariant violation(s):\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    process.exit(1);
  }
  const ir = buildIR(model);
  // An emitter returns either one file's text (written to the default path) or a map of
  // repo-relative paths → text, when a platform splits its output (vocabulary types + system values).
  const platform = (defaultPath, output) => (typeof output === 'string' ? { [defaultPath]: output } : output);
  const targets = {
    'packages/web/src/generated/tokens.css': emitCss(model, { unavailable: availabilityOf(layerChain(ROOT_SYSTEM, readLayer)) }),
    ...platform('packages/react-native/src/generated/tokens.ts', emitTs(ir)),
    ...platform('packages/swiftui/Sources/Tanrei/Generated/TanreiTokens.swift', emitSwift(ir)),
    ...platform(`packages/compose/tanrei/src/main/kotlin/${KOTLIN_PACKAGE.replaceAll('.', '/')}/TanreiTokens.kt`, emitKotlin(ir)),
    ...platform('packages/flutter/lib/src/generated/tokens.g.dart', emitDart(ir)),
    ...designToolExports(model),
    'tokens/vocabulary.lock.json': vocabularyLock(model),
  };
  for (const [rel, content] of Object.entries(targets)) {
    write(rel, content);
    outputs.push(rel);
  }
  const systemIconSets = { [ROOT_SYSTEM]: iconSetOf(ir, iconSets) };
  await generateSystems(outputs, iconSets, systemIconSets);
  // The mirrored glyph names of each icon set, and the set of each system: read by the web's icon helper.
  write('packages/web/src/generated/icon-sets.ts', emitIconSetsTs(iconSets, systemIconSets));
  outputs.push('packages/web/src/generated/icon-sets.ts');
  // A file this build used to produce and no longer does (a platform renamed or split its output) is
  // stale generated code: remove it, so nothing keeps compiling against tokens that no longer exist.
  const manifestPath = path.join(REPO_ROOT, 'packages/tokens-build/generated-manifest.json');
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).files : [];
  for (const rel of previous.filter((f) => !outputs.includes(f))) {
    const file = path.join(REPO_ROOT, rel);
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`  removed stale generated file ${rel}`);
    }
  }
  // The drift check and the edit-guard hook both read this list.
  write('packages/tokens-build/generated-manifest.json', { files: outputs.sort() });
  console.log(`✔ tokens: ${Object.keys(model.tokens).length} tokens × ${model.schemes.length} schemes → ${outputs.length} files`);
}

async function validate() {
  failOn('source token problem(s)', [...checkSources(sourceDocuments()), ...checkGuidance(sourceDocuments())]);
  failOn('system layer problem(s)', checkLayers());
  failOn('icon set problem(s)', validateIconSets(REPO_ROOT));
  generateSchemes();
  const model = await buildModel(); // Refuses an alias that leads nowhere, in a circle or to another type (reader.js), and a value that is not well-formed (the token lint).
  const failures = checkInvariants(model);
  if (failures.length) {
    console.error(`✖ ${failures.length} token invariant violation(s):\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    process.exit(1);
  }
  const iconSets = loadIconSets(REPO_ROOT);
  iconSetOf(buildIR(model), iconSets);
  for (const id of listSystems(REPO_ROOT).filter((s) => s !== ROOT_SYSTEM)) {
    // Read from the layer alone, without building the system: enough to say whether its icon family has a file.
    const family = [...layerChain(id, readLayer)].reverse().map((layer) => layer.tokens?.[`${CONFIG.namespace}.sys.icon.family.unselected`]?.$value ?? layer.tokens?.[`${CONFIG.namespace}.ref.typeface.icon`]?.$value).find(Array.isArray);
    if (family && !iconSetFor(iconSets, family)) console.warn(`⚠ system "${id}": no tokens/icon-sets/*.icon-set.json describes its icon family "${family[0]}" — no glyph is mirrored in right-to-left by itself`);
  }
  console.log(`✔ icon sets valid: ${iconSets.map(({ doc }) => `${doc.id} (${doc.mirrored.length} mirrored)`).join(', ')}`);
  console.log(`✔ tokens valid: ${Object.keys(model.tokens).length} tokens, ${model.schemes.length} schemes, all contrast invariants hold`);
}

/**
 * A Figma sync plan per design system (`<dir>/<id>.json`, emit/figma.js). Not part of `generate`: a plan is only of
 * use to whoever applies it to a Figma file, so it is written where that person asks, and the repository holds none.
 */
async function figmaPlans(dir) {
  if (!dir) {
    console.error('usage: tokens-build figma-plans <dir>');
    process.exit(2);
  }
  const out = path.resolve(process.env.INIT_CWD ?? process.cwd(), dir);
  generateSchemes();
  const plans = { [ROOT_SYSTEM]: emitFigmaPlan(await buildModel()) };
  for (const id of listSystems(REPO_ROOT).filter((s) => s !== ROOT_SYSTEM)) {
    const { files } = buildBundle(REPO_ROOT, layerChain(id, readLayer));
    plans[id] = emitFigmaPlan(await buildModelFromBundle(files, id, readBundle(files, id)));
  }
  fs.mkdirSync(out, { recursive: true });
  for (const [id, plan] of Object.entries(plans)) fs.writeFileSync(path.join(out, `${id}.json`), `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`✔ figma plans: ${Object.keys(plans).join(', ')} → ${path.relative(REPO_ROOT, out) || '.'}`);
}

const command = process.argv[2];
if (command === 'generate') await generate();
else if (command === 'validate') await validate();
else if (command === 'figma-plans') await figmaPlans(process.argv[3]);
else {
  console.error('usage: tokens-build <generate|validate|figma-plans <dir>>');
  process.exit(2);
}

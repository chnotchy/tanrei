// tanrei — build your own design system on Tanrei.
//   tanrei init <id> [--extends <system>]   write a starter layer file and tanrei.json
//   tanrei build [--config tanrei.json]      one layer in → tokens + code for every platform the product ships
//   tanrei validate [--config tanrei.json]   schema + vocabulary rules + a trial build in memory; nothing written
//   tanrei explain <token> [--config …]      the value, where it comes from layer by layer, and what a layer may write
//   tanrei studio [--port n] [--no-open]     Theme Studio, locally, editing the product's layer file in place
//   tanrei systems                           the systems that ship with this version
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DERIVE, ENUM, enumName, legalOperations, matchingRules } from '@tanrei/token-engine';
import { TARGETS, buildProductSystem } from '@tanrei/tokens-build/product';
import { listSystems } from '@tanrei/tokens-build/bundle';
import { FONT_NOTE, fontLines, fontReport } from '@tanrei/tokens-build/fonts';
import { leadWithStructure } from '@tanrei/tokens-build/invariants';
import { buildIR } from '@tanrei/tokens-build/ir';
import { CONFIG, REPO_ROOT } from '@tanrei/tokens-build/model';
import { resolveSystem, validateSystem } from '@tanrei/tokens-build/resolve';
import { loadSystem } from '@tanrei/tokens-build/scheme';
import { startStudioServer } from './studio-server.js';

const CONFIG_FILE = 'tanrei.json';
/** The systems `init --extends` accepts: the ones this version ships, the default first. Read, never listed by hand, so the help cannot fall behind them. */
export function shippedSystems() {
  const ids = listSystems(REPO_ROOT);
  return [...ids.filter((id) => id === CONFIG.namespace), ...ids.filter((id) => id !== CONFIG.namespace)];
}

const help = () => `tanrei — build your own design system on Tanrei

  tanrei init <id> [--extends ${shippedSystems().join('|')}]
  tanrei build     [--config ${CONFIG_FILE}] [--check]
  tanrei validate  [--config ${CONFIG_FILE}]
  tanrei explain <token-id> [--config ${CONFIG_FILE}]
  tanrei studio    [--config ${CONFIG_FILE}] [--port <n>] [--no-open]
  tanrei systems

${CONFIG_FILE}:
  {
    "system": "design/acme.system.json",
    "kotlinPackage": "com.acme.design",          // only for the compose output
    "outputs": {                                 // a directory per target; omit what you do not ship
      ${TARGETS.map((t) => `"${t}": "…"`).join(', ')}
    }
  }

--check writes nothing and fails if a committed output is out of date (for CI).`;

function parse(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) positional.push(argv[i]);
    else if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) flags[argv[i].slice(2)] = true;
    else flags[argv[i].slice(2)] = argv[(i += 1)];
  }
  return { flags, positional };
}

function readConfig(flags) {
  const file = path.resolve(typeof flags.config === 'string' ? flags.config : CONFIG_FILE);
  if (!fs.existsSync(file)) throw new Error(`${path.relative(process.cwd(), file) || file} not found. Run \`tanrei init <id>\` or pass --config.`);
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = path.dirname(file);
  if (typeof config.system !== 'string') throw new Error(`${CONFIG_FILE}: "system" must be the path of a <id>.system.json file`);
  const unknown = Object.keys(config.outputs ?? {}).filter((t) => !TARGETS.includes(t));
  if (unknown.length) throw new Error(`${CONFIG_FILE}: unknown output(s) ${unknown.join(', ')}. Known: ${TARGETS.join(', ')}`);
  return { base, layerFile: path.resolve(base, config.system), outputs: config.outputs ?? {}, kotlinPackage: config.kotlinPackage };
}

const serialize = (content) => (typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);

/** Write (or, with `check`, only compare) every generated file. Returns one entry per file. */
function writeOutputs(result, base, outputs, { check = false } = {}) {
  const files = [];
  for (const target of Object.keys(result.files)) {
    for (const [name, content] of Object.entries(result.files[target])) {
      const file = path.resolve(base, outputs[target], name);
      const text = serialize(content);
      const changed = !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text;
      if (changed && !check) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
      }
      files.push({ target, path: path.relative(process.cwd(), file), changed });
    }
  }
  return files;
}

async function build(flags) {
  const { base, layerFile, outputs, kotlinPackage } = readConfig(flags);
  const targets = Object.keys(outputs);
  if (!targets.length) throw new Error(`${CONFIG_FILE}: "outputs" is empty — name at least one of ${TARGETS.join(', ')}`);
  const result = await buildProductSystem({ layerFile, targets, kotlinPackage });

  const files = writeOutputs(result, base, outputs, { check: Boolean(flags.check) });
  const stale = files.filter((f) => f.changed).map((f) => f.path);
  const written = stale.length;

  printWarnings(result.warnings);
  if (flags.check) {
    if (stale.length) {
      console.error(`✖ ${stale.length} generated file(s) are out of date. Run \`tanrei build\` and commit:\n${stale.map((f) => `  - ${f}`).join('\n')}`);
      return 1;
    }
    console.log(`✔ "${result.id}" (${result.chain.join(" → ")}): every generated file is up to date`);
    return 0;
  }
  console.log(`✔ "${result.id}" (${result.chain.join(" → ")}): ${result.tokens} tokens → ${targets.join(', ')} — ${written} file(s) changed`);
  for (const [target, name] of Object.entries(result.names)) if (targets.includes(target)) console.log(`  ${target}: ${name}`);
  printFonts(result.id, result.fonts);
  return 0;
}

/** Accessibility and structure warnings, the same list for `build` and `validate`: what concerns the whole system first. */
function printWarnings(warnings) {
  if (!warnings.length) return;
  console.warn(`⚠ ${warnings.length} accessibility/structure warning(s). Thresholds are constants; a product layer is warned, not failed:`);
  for (const warning of leadWithStructure(warnings).slice(0, 12)) console.warn(`  - ${warning}`);
  if (warnings.length > 12) console.warn(`  … and ${warnings.length - 12} more (a11y-report.json in the tokens output lists them all)`);
}

/** The named font families a system references: what the product has to install, per use. */
function printFonts(id, report, { note = true } = {}) {
  console.log(`  fonts "${id}" names:`);
  for (const line of fontLines(report, '    ')) console.log(line);
  if (note) console.log(`  ${FONT_NOTE}`);
  for (const warning of report.warnings) console.warn(`⚠ ${warning}`);
}

async function validate(flags) {
  const { layerFile } = readConfig(flags);
  const problems = validateSystem({ layerFile });
  if (problems.length) {
    console.error(`✖ ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    return 1;
  }
  // The engine is the final authority (an unknown token id, a cycle, a choice out of range): build it, in memory.
  const resolved = await resolveSystem({ layerFile }, { validate: false });
  const fonts = fontReport(buildIR(await resolved.model()));
  for (const notice of resolved.notices) console.warn(`⚠ ${notice}`);
  for (const warning of fonts.warnings) console.warn(`⚠ ${warning}`);
  // Valid is not the same as free of findings: what `tanrei build` would warn about is said here already.
  printWarnings(await resolved.warnings());
  console.log(`✔ ${path.relative(process.cwd(), layerFile)} is a valid layer (${resolved.chain.map((l) => l.id).join(' → ')})`);
  return 0;
}

const isRef = (value) => typeof value === 'string' && /^\{[^}]+\}$/.test(value);

function show(value) {
  if (Array.isArray(value)) return value.every((v) => typeof v === 'string' || typeof v === 'number') ? value.join(', ') : JSON.stringify(value);
  if (value && typeof value === 'object' && 'colorSpace' in value) return value.alpha === undefined || value.alpha === 1 ? value.hex : `${value.hex} / ${value.alpha}`;
  if (value && typeof value === 'object' && 'unit' in value) return `${value.value}${value.unit}`;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * One token: its value (a choice of kind by NAME), every layer that touches it, root first, the pattern rules that
 * match it with the one that wins, and what a layer may legally write for it.
 */
async function explain(flags, [tokenId]) {
  if (!tokenId) throw new Error('usage: tanrei explain <token-id>');
  const { layerFile } = readConfig(flags);
  const resolved = await resolveSystem({ layerFile });
  const token = resolved.tokens('light')[tokenId];
  if (!token) throw new Error(`${tokenId}: not a token of "${resolved.id}". To add it, declare it under "vocabulary" with a rationale.`);

  const names = token.$extensions?.[ENUM]?.values;
  console.log(`${tokenId}  (${token.$type})`);
  if (names) console.log(`  value: ${enumName(token)}   — choice ${token.$value} of ${names.map((name, i) => `${name} (${i})`).join(', ')}`);
  else console.log(`  value: ${show(token.$value)}${token.aliasChain?.length ? `   ← ${token.aliasChain.map((id) => `{${id}}`).join(' ← ')}` : ''}`);

  const precedence = matchingRules(tokenId, resolved.chain);
  let found = false;
  for (const layer of resolved.chain) {
    const op = layer.tokens?.[tokenId];
    const rules = precedence.rules.filter((rule) => rule.layer === layer.id);
    if (!op && !rules.length) continue;
    found = true;
    console.log(`${layer.id}:`);
    if (op) console.log(`  ${JSON.stringify(op)}`);
    for (const rule of rules) console.log(`  ${rule.wins ? '✔' : '·'} rule ${rule.match} → ${JSON.stringify(layer.rules[rule.index].derive ?? layer.rules[rule.index].$value)}   (${rule.wins ? 'wins' : 'loses'}: ${rule.because})`);
  }
  if (!found) console.log(`No layer changes ${tokenId}: it has the value its source file gives it (tokens/ in the Tanrei repository).`);

  const alias = isRef(token.originalValue?.$value) ? token.aliasChain?.[0] ?? null : null;
  const operations = legalOperations({ id: tokenId, type: token.$type, value: token.$value, alias, rule: token.$extensions?.[DERIVE] ?? null, state: token.$extensions?.['dev.tanrei.state'] ?? false, choices: names }, { namespace: CONFIG.namespace });
  console.log('a layer may:');
  for (const operation of operations) console.log(`  ${operation.op}${operation.write ? `   ${JSON.stringify(operation.write)}` : ''}`);
  return 0;
}

function init([id], flags) {
  if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('usage: tanrei init <id>   (lowercase letters, digits and hyphens)');
  const parent = typeof flags.extends === 'string' ? flags.extends : 'tanrei';
  if (!shippedSystems().includes(parent)) throw new Error(`"${parent}" is not a shipped system. Try one of: ${shippedSystems().join(', ')}`);
  const layerFile = path.resolve(`design/${id}.system.json`);
  if (fs.existsSync(layerFile) || fs.existsSync(CONFIG_FILE)) throw new Error(`${fs.existsSync(CONFIG_FILE) ? CONFIG_FILE : layerFile} already exists`);
  const layer = {
    id,
    name: id[0].toUpperCase() + id.slice(1),
    extends: parent,
    description: 'Describe what makes this product look like itself.',
    palettes: {},
    tokens: {},
  };
  fs.mkdirSync(path.dirname(layerFile), { recursive: true });
  fs.writeFileSync(layerFile, `${JSON.stringify(layer, null, 2)}\n`);
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify({ system: `design/${id}.system.json`, outputs: { tokens: `design/tokens/${id}`, web: 'src/styles' } }, null, 2)}\n`);
  console.log(`✔ wrote design/${id}.system.json and ${CONFIG_FILE}. Edit the layer, add the outputs you ship, then run \`tanrei build\`.`);
  return 0;
}

/** Serve Theme Studio locally, editing this product's layer file in place. Runs until interrupted. */
async function studio(flags, { wait = true } = {}) {
  const { base, layerFile, outputs, kotlinPackage } = readConfig(flags);
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Packaged: dist/studio next to the bundled CLI. In the Tanrei repository: the app built by packages/studio.
  const appDir = [path.join(here, 'studio'), path.join(here, '../../studio/dist-app')].find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? path.join(here, 'studio');
  const server = await startStudioServer({ layerFile, outputs, kotlinPackage, appDir, port: flags.port ? Number(flags.port) : 0, writeOutputs: (result) => writeOutputs(result, base, outputs) });
  console.log(`Theme Studio is editing ${path.relative(process.cwd(), layerFile)}\n\n  ${server.url}\n\nLocal only (127.0.0.1); the link carries a one-time key. Edits are saved to the file as you make them — review them with git like any other change. Ctrl+C to stop.`);
  if (flags.open !== false && !flags['no-open']) openInBrowser(server.url);
  if (!wait) return server;
  await new Promise((resolve) => process.once('SIGINT', resolve).once('SIGTERM', resolve));
  await server.close();
  return 0;
}

function openInBrowser(url) {
  const [command, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try {
    spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    // No browser to open (CI, a container): the URL is printed above.
  }
}

async function systems() {
  for (const id of listSystems(REPO_ROOT)) {
    const layer = loadSystem(REPO_ROOT, id);
    console.log(`${id.padEnd(12)} ${layer.name ?? ''}${layer.extends ? `  (extends ${layer.extends})` : ''}`);
    const resolved = await resolveSystem({ system: id }, { validate: false });
    const report = fontReport(buildIR(await resolved.model()));
    for (const line of fontLines(report, '             ')) console.log(line);
    for (const warning of report.warnings) console.warn(`⚠ ${id}: ${warning}`);
  }
  console.log(`\n${FONT_NOTE}`);
  return 0;
}

export async function main(argv) {
  const { flags, positional } = parse(argv);
  const [command, ...rest] = positional;
  try {
    if (!command || flags.help || command === 'help') return console.log(help()), 0;
    if (command === 'build') return await build(flags);
    if (command === 'validate') return await validate(flags);
    if (command === 'explain') return await explain(flags, rest);
    if (command === 'init') return init(rest, flags);
    if (command === 'studio') return await studio(flags);
    if (command === 'systems') return await systems();
    console.error(`unknown command "${command}"\n\n${help()}`);
    return 2;
  } catch (error) {
    console.error(`✖ ${error.message}`);
    return 1;
  }
}

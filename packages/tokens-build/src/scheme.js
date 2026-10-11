// Node-side adapter around @tanrei/token-engine: loads a system layer from disk and
// injects material-color-utilities. All derivation logic lives in the engine.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMES, createPaletteEngine, mergeLayers, resolveNumericTokens } from '@tanrei/token-engine';
import { CONFIG } from './config.js';
import { Hct, TonalPalette } from './mcu.js';
import { assertSystemId } from './pure.js';

export { SCHEMES };

// Names come from tanrei.config.json; the engine itself has no file access and takes the namespace as a parameter.
const NAMESPACE = CONFIG.namespace;
const engine = createPaletteEngine({ Hct, TonalPalette, namespace: NAMESPACE });

export const systemPath = (id) => `tokens/systems/${id}.system.json`;

export function loadSystem(repoRoot, id = NAMESPACE) {
  assertSystemId(id, 'a shipped system');
  return JSON.parse(fs.readFileSync(path.join(repoRoot, systemPath(id)), 'utf8'));
}

/** Generated color documents for one system. Returns `{ fileName: dtcgDocument }`. */
export function colorVocabulary(repoRoot) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'tokens/sys/color.vocabulary.json'), 'utf8'));
}

/**
 * @param {object} system  a merged system, or a single root layer
 * @param {Record<string, object>} [documents]  the system's resolved numeric documents; computed for a lone root layer
 */
export function generateSchemeFiles(system, repoRoot, documents) {
  const merged = system.chain ? system : mergeLayers([system], { namespace: NAMESPACE });
  const docs = documents ?? resolveNumericTokens(sourceFiles(repoRoot), merged);
  return engine.generateColorFiles(merged, { sourcePath: systemPath(merged.id), vocabulary: colorVocabulary(repoRoot), documents: docs });
}

/** Palette-declared intents of a system (beyond the core ones), for data-driven contrast checks. */
export function declaredIntents(system, repoRoot) {
  const core = Object.keys(colorVocabulary(repoRoot).intents);
  return [...core, ...Object.entries(system.palettes).filter(([name, p]) => p.roles === 'intent' && !core.includes(name)).map(([name]) => name)];
}

/** The hand-authored sources of the vocabulary, relative to tokens/: the default resolver, what it names, and the color vocabulary. */
function sourcePaths(repoRoot) {
  const dir = path.join(repoRoot, 'tokens');
  const resolverFile = `${NAMESPACE}.resolver.json`;
  const resolver = JSON.parse(fs.readFileSync(path.join(dir, resolverFile), 'utf8'));
  const refs = Object.values(resolver.sets).flatMap((set) => set.sources.map((s) => s.$ref)).filter((ref) => !ref.startsWith('generated/'));
  return { dir, resolverFile, refs };
}

/** Hand-authored DTCG sources named by the default resolver, keyed by their path relative to tokens/. */
export function sourceFiles(repoRoot) {
  const { dir, refs } = sourcePaths(repoRoot);
  return Object.fromEntries(refs.map((ref) => [ref, JSON.parse(fs.readFileSync(path.join(dir, ref), 'utf8'))]));
}

/**
 * A stable name for "the vocabulary as it is on disk right now": the resolver, every source it names and the color
 * vocabulary, by size and modification time — a stat per file, no reading. A cache of resolved systems keys on this
 * next to the chain digest, so an edit under tokens/ is seen by a long-running server without a restart.
 */
export function vocabularyDigest(repoRoot) {
  const { dir, resolverFile, refs } = sourcePaths(repoRoot);
  const files = [resolverFile, ...refs, 'sys/color.vocabulary.json'];
  const stamp = (file) => {
    try {
      const { size, mtimeMs } = fs.statSync(path.join(dir, file));
      return `${file}:${size}:${mtimeMs}`;
    } catch {
      return `${file}:missing`;
    }
  };
  return crypto.createHash('sha256').update(files.map(stamp).join('\n')).digest('hex').slice(0, 32);
}

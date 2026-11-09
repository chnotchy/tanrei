// What the page sheet's worker (./sheet-worker.ts) is given of the repository's files, beside the files themselves:
// the bundler (../vite-plugin.js) and the tests (test/page-sheet.test.js) shape them with these, so that the worker
// computes from exactly what the tests compute from.
import { LLM } from '@tanrei/token-engine';

/** The query a token document is imported with when its prose is left out (`withoutProse`). */
export const SHEET_QUERY = 'tanrei-sheet';
/** The query a shipped layer is imported with when only what `layerIndex` keeps is wanted. */
export const INDEX_QUERY = 'tanrei-sheet-index';

/**
 * A token document without its prose: each `$description`, and the usage guidance for agents (`$extensions` LLM).
 * No value, no rule and no declaration of a sheet is computed from them — the emitter writes neither — and they are
 * half of the documents' bytes. A vocabulary rationale is kept: the engine asks whether a component has one.
 * @param {unknown} node
 * @returns {unknown}
 */
export function withoutProse(node) {
  if (Array.isArray(node)) return node.map(withoutProse);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$description') continue;
    if (key === '$extensions' && value && typeof value === 'object' && LLM in value) {
      const { [LLM]: _, ...rest } = value;
      if (Object.keys(rest).length) out[key] = withoutProse(rest);
      continue;
    }
    out[key] = withoutProse(value);
  }
  return out;
}

/**
 * What the worker keeps of every shipped layer, loaded or not: its id, what it extends (the chain of a layer that
 * extends it), and its vocabulary — where each component that lives in a layer lives, what a system without it uses
 * instead, and what a layer that includes one from it borrows.
 * @param {{ id: string, extends?: string, vocabulary?: object }} layer
 */
export function layerIndex(layer) {
  return { id: layer.id, ...(layer.extends ? { extends: layer.extends } : {}), ...(layer.vocabulary ? { vocabulary: layer.vocabulary } : {}) };
}

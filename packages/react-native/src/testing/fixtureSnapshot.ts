// Serialized render-tree baselines, one JSON file per spec fixture:
//   src/components/__tests__/__snapshots__/<Component>/<fixture-id>.json
// (the path is fixed by packages/tools/src/conventions.js).
//
// The matcher COMPARES. It fails when the baseline is missing or different and never writes on a
// mismatch. It writes only when TANREI_RECORD_SNAPSHOTS=1, and then TANREI_SNAPSHOT_REASON is required.
import fs from 'node:fs';
import path from 'node:path';
import { StyleSheet } from 'react-native';

const SNAPSHOT_ROOT = path.resolve(__dirname, '../components/__tests__/__snapshots__');

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function normalize(value: unknown, key?: string): Json | undefined {
  if (value === null) return null;
  if (key === 'style') return normalize(StyleSheet.flatten(value as never) ?? {});
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'object': {
      if (Array.isArray(value)) return value.map((item) => normalize(item) ?? null);
      const out: { [key: string]: Json } = {};
      for (const name of Object.keys(value as object).sort()) {
        const normalized = normalize((value as Record<string, unknown>)[name], name);
        if (normalized !== undefined) out[name] = normalized;
      }
      return out;
    }
    default:
      // Functions (event handlers), symbols ($$typeof) and undefined are not part of the baseline.
      return undefined;
  }
}

interface RenderedNode {
  type: string;
  props: Record<string, unknown>;
  children?: (RenderedNode | string)[] | null;
}

function serializeNode(node: RenderedNode | string): Json {
  if (typeof node === 'string') return node;
  return {
    type: node.type,
    props: normalize(node.props) ?? {},
    children: (node.children ?? []).map(serializeNode),
  };
}

/** Deterministic JSON text for a `toJSON()` render tree: sorted keys, flattened styles, no functions. */
export function serializeTree(tree: RenderedNode | string | (RenderedNode | string)[] | null): string {
  const json = tree === null ? null : Array.isArray(tree) ? tree.map(serializeNode) : serializeNode(tree);
  return `${JSON.stringify(json, null, 2)}\n`;
}

export const fixtureSnapshotPath = (component: string, fixtureId: string) => path.join(SNAPSHOT_ROOT, component, `${fixtureId}.json`);

function firstDifference(expected: string, actual: string): string {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const index = a.findIndex((line, i) => line !== b[i]);
  const at = index === -1 ? Math.min(a.length, b.length) : index;
  return `first difference at line ${at + 1}:\n  baseline: ${a[at] ?? '<end of file>'}\n  received: ${b[at] ?? '<end of file>'}`;
}

export function toMatchFixtureSnapshot(received: RenderedNode | string | (RenderedNode | string)[] | null, component: string, fixtureId: string) {
  const file = fixtureSnapshotPath(component, fixtureId);
  const shown = path.relative(process.cwd(), file);
  const actual = serializeTree(received);
  const baseline = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

  if (process.env.TANREI_RECORD_SNAPSHOTS === '1') {
    if (!process.env.TANREI_SNAPSHOT_REASON?.trim()) {
      return { pass: false, message: () => 'Recording baselines requires TANREI_SNAPSHOT_REASON="<what changed and why>".' };
    }
    if (baseline !== actual) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, actual);
    }
    return { pass: true, message: () => `recorded ${shown}` };
  }

  if (baseline === null) {
    return {
      pass: false,
      message: () =>
        `No baseline at ${shown}. Record it deliberately: TANREI_SNAPSHOT_REASON="…" TANREI_RECORD_SNAPSHOTS=1 pnpm --filter @tanrei/react-native test`,
    };
  }
  const pass = baseline === actual;
  return {
    pass,
    message: () =>
      pass
        ? `expected the render tree not to match ${shown}`
        : `The render tree differs from ${shown}; ${firstDifference(baseline, actual)}\nA snapshot diff is a finding. Re-record only when the change is the intended result of a spec or token change.`,
  };
}

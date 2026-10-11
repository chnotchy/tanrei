// Tests are driven by the platform-neutral spec, not by hand-written cases.
import fs from 'node:fs';
import path from 'node:path';

/** A value a fixture may set: `strings` props (a list's `values`) are lists of strings. */
export type FixtureValue = string | boolean | number | null | string[];

/** One of a fixture's items: its kind, that kind's props, and a group's own items. */
export interface FixtureItem {
  kind: string;
  props: Record<string, FixtureValue>;
  content?: string;
  items?: FixtureItem[];
}

export interface Fixture {
  id: string;
  props: Record<string, FixtureValue>;
  content?: string;
  /** The component's items, in order. */
  items?: FixtureItem[];
  /** Named slots the fixture fills: a string, or several in order. */
  slots?: Record<string, string | string[]>;
}

/** What a fixture's string in a slot becomes. */
export type SlotFixtureKind = 'glyph' | 'icon-only-button' | 'button' | 'text';

/** How a platform maps one item kind. */
export interface ItemMapping {
  name: string;
  props: Record<string, string>;
  events?: Record<string, string>;
}

export interface Spec {
  name: string;
  /** `axis`: the token axis an open enum prop selects, e.g. `tanrei.comp.button.size`. */
  props: { name: string; type: string; values?: string[]; default?: unknown; axis?: string }[];
  behavior: { id: string; text: string }[];
  /** Named slots; `fixture` says what a fixture's string in it becomes. */
  slots?: { name: string; fixture?: SlotFixtureKind }[];
  fixtures: Fixture[];
  /** Item kinds: each with its own props. */
  items?: { name: string; props: { name: string; type: string; values?: string[]; default?: unknown }[]; container?: boolean }[];
  platforms: { 'react-native': { status: string; name: string; props: Record<string, string>; events: Record<string, string>; items?: Record<string, ItemMapping> } };
}

const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** The spec names under `specs/` (`button`, …), sorted. */
export const specNames = (): string[] =>
  fs
    .readdirSync(path.join(REPO_ROOT, 'specs'))
    .filter((file) => file.endsWith('.spec.json'))
    .map((file) => file.replace(/\.spec\.json$/, ''))
    .sort();

export const loadSpec = (name: string): Spec => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `specs/${name}.spec.json`), 'utf8'));

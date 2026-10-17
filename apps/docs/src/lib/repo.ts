// Everything the docs render as data comes from here, and everything here is imported
// from the repository's sources of truth (or files generated from them). Nothing in this
// module may contain a hand-maintained copy of a name, a status or a token value.
import config from '../../../../tanrei.config.json';
import statusData from '../../../../docs/status/status.json';
import inventoryData from '../../../../specs/inventory.json';
// What a composed component takes from a member is written once, in the member's spec (`from`): the tools'
// own resolver writes it out, so the site and the checks read a spec the same way.
import { resolveFrom } from '../../../../packages/tools/src/from.js';

export type PlatformId = string;
export type Status = string;

export interface StatusComponent {
  name: string;
  title: string;
  category: string;
  /** Its level: one of the names of `levels`. */
  level: string;
  /** Whether a list shows it by default: one of the names of `listings`. */
  listing: string;
  /** The components it is built from, by name; empty where it is built from none. */
  builtFrom: string[];
  hasSpec: boolean;
  /** The address of its page on this site (`/components/button/`), or null where no page documents it. */
  docs: string | null;
  platforms: Record<PlatformId, Status>;
}

export interface Spec {
  name: string;
  title: string;
  summary: string;
  category: string;
  /** Its level: one of the names of `levels`. */
  level: string;
  /** Whether a list shows it by default: one of the names of `listings`. */
  listing: string;
  /** The components it is built from, by name. Left out where it is built from none. */
  builtFrom?: string[];
  anatomy: { id: string; description: string; optional?: boolean }[];
  props: SpecProp[];
  slots?: (Forwarded & { name: string; description: string })[];
  events?: (Forwarded & { name: string; description: string })[];
  /** Item kinds. */
  items?: {
    name: string;
    summary: string;
    /** The component an item of this kind is, where it is another component: a Field's control, a tag group's tag. */
    component?: string;
    props: SpecProp[];
    container?: boolean;
    slots?: { name: string; description: string }[];
    events?: { name: string; description: string }[];
  }[];
  states: string[];
  behavior: { id: string; text: string }[];
  accessibility: {
    role: string;
    keyboard: { keys: string; action: string }[];
    labeling: string;
    minimumTarget: boolean;
    notes?: string[];
  };
  tokens: string;
  fixtures: { id: string; props: Record<string, string | boolean | number>; content?: string; items?: FixtureItem[]; /** The fixture of a member that is the same thing made by hand. */ twin?: string }[];
  platforms: Record<
    PlatformId,
    {
      status: Status;
      name: string;
      props?: Record<string, string>;
      events?: Record<string, string>;
      items?: Record<string, { name: string; props: Record<string, string>; events?: Record<string, string>; notes?: string }>;
      notes?: string;
    }
  >;
}

/** What a resolved entry keeps of where it is from. */
export interface Forwarded {
  /** The member's entry this one is: `"<member>.<name>"`. Left out for an entry of the component's own. */
  from?: string;
  /** The one sentence a composed spec adds to a member's entry: what the composition does with it. */
  note?: string;
}

export interface SpecProp extends Forwarded {
  name: string;
  type: string;
  values?: string[];
  default: string | boolean | number | null;
  description: string;
}

export interface FixtureItem {
  kind: string;
  props: Record<string, string | boolean | number>;
  content?: string;
  items?: FixtureItem[];
}

export { config };
export const platforms: PlatformId[] = statusData.platforms;
export const statuses: Status[] = statusData.statuses;
export const statusComponents = statusData.components as StatusComponent[];
export const statusTotals = statusData.totals as Record<PlatformId, Record<Status, number>>;
/** What each design system does not ship: system id → components and `variant` values. */
export const unavailable = (statusData.unavailable ?? {}) as Record<string, { components: string[]; variants: Record<string, string[]> }>;
export const inventory = inventoryData.components as { name: string; title: string; category: string; level: string }[];
/**
 * Which name is which level, as the tools write it into the status file: a single part with
 * one job, components put together to complete one value or one job, and several controls the component coordinates.
 * The site reads the names here and writes none itself.
 */
export const levels = statusData.levels as { single: string; completes: string; coordinates: string };
/** What a level is, by its name (`single`, `completes`, `coordinates`): the key of its word in the dictionary (`level`). */
export const levelRole = (level: string): string | undefined => Object.keys(levels).find((key) => (levels as Record<string, string>)[key] === level);
/**
 * Which name is which listing, as the tools write it into the status file: a component
 * every list shows, and one a list shows only when the reader asks for everything. The site reads the names here and
 * writes none itself; what its lists do with them is `./listing.mjs`.
 */
export const listings = statusData.listings as { listed: string; onRequest: string };

const specModules = import.meta.glob<Spec>('../../../../specs/*.spec.json', { eager: true, import: 'default' });
/** Every spec as it is written, by its name. */
const writtenSpecs = new Map(Object.values(specModules).map((spec) => [spec.name, spec]));
/**
 * Every spec **resolved** (`resolveFrom`, packages/tools/src/from.js): a prop, an event or a slot that a composed
 * component takes from a member (`from`) has no type and no description as written; here it is the member's own entry
 * under the composed component's name, with `from` — and the `note` the composed spec adds — kept, so that a table can
 * say where it is from. Everything on the site that reads a spec's props, events or slots reads them from here.
 */
export const specs: Record<string, Spec> = Object.fromEntries([...writtenSpecs].map(([name, spec]) => [name, resolveFrom(spec, writtenSpecs) as Spec]));

/** The member a forwarded prop, event or slot is from (`"<member>.<name>"`): the member's spec name. */
export const memberOf = (entry: { from?: string }): string | undefined => (entry.from ? entry.from.slice(0, entry.from.indexOf('.')) : undefined);

export function getSpec(name: string): Spec {
  const spec = specs[name];
  if (!spec) throw new Error(`No spec named "${name}" in specs/. Component pages can only document components that have a spec.`);
  return spec;
}


export function statusOf(name: string): StatusComponent | undefined {
  return statusComponents.find((c) => c.name === name);
}

/**
 * Where a component's name links to, under a language's base ('' or '/ja'): the page the status matrix records for it,
 * or nothing. A spec alone is not a page — a foundation with a spec is documented under Foundations, and a component
 * may have a spec before it has a page — so every list of components asks here and never builds the address itself.
 */
export function componentHref(base: string, name: string): string | undefined {
  const page = statusOf(name)?.docs;
  return page ? `${base}${page}` : undefined;
}

const RANK = Object.fromEntries(statuses.map((s, i) => [s, i]));
/** True once a platform has anything shippable at the current spec (alpha or later; not lagging, not deprecated). */
export const isImplemented = (status: Status) => RANK[status] > RANK.planned && status !== 'lagging' && status !== 'deprecated';

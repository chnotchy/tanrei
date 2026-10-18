// Everything the docs render as data comes from here, and everything here is imported
// from the repository's sources of truth (or files generated from them). Nothing in this
// module may contain a hand-maintained copy of a name, a status or a token value.
import config from '../../../../tanrei.config.json';
import statusData from '../../../../docs/status/status.json';
import inventoryData from '../../../../specs/inventory.json';
import customElements from '@tanrei/web/custom-elements.json';
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
  /** The design system layer it lives in, where that is not the root: it is listed in that layer's group. */
  layer?: string;
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
  /** The design system layer it lives in, where that is not the root: only the systems that descend from it have it. */
  layer?: string;
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

/** Tags that the installed @tanrei/web build actually defines (from its custom elements manifest). */
export const definedTags: Set<string> = new Set(
  (customElements.modules ?? []).flatMap((m: any) => (m.declarations ?? []).map((d: any) => d.tagName).filter(Boolean)),
);

/** An attribute of an element of the installed @tanrei/web build, as its manifest declares it. */
export interface WebAttribute {
  /** The attribute's name as HTML writes it (`readonly`, `supporting-text`, `flush`). */
  name: string;
  /** True where the attribute says the opposite of its property: a boolean that defaults to true (`inset`) has an attribute that turns it off (`flush`). */
  inverse: boolean;
}
const webAttributes: Map<string, Map<string, WebAttribute>> = new Map(
  (customElements.modules ?? []).flatMap((m: any) =>
    (m.declarations ?? [])
      .filter((d: any) => d.tagName)
      .map((d: any) => [
        d.tagName,
        new Map(
          (d.attributes ?? [])
            .filter((a: any) => a.fieldName)
            .map((a: any) => [a.fieldName, { name: a.name, inverse: a.type?.text === 'boolean' && a.default === 'true' && a.name !== a.fieldName.replace(/[A-Z]/g, (c: string) => `-${c.toLowerCase()}`) }]),
        ),
      ]),
  ),
);
/**
 * The attribute that reflects a property of an element (`tanrei-text-field`, `readOnly` → `readonly`), from the
 * manifest of the installed build; nothing where the manifest does not know the element or the property.
 */
export function webAttribute(tag: string, property: string): WebAttribute | undefined {
  return webAttributes.get(tag)?.get(property);
}

const webAttributeNames: Map<string, Set<string>> = new Map(
  (customElements.modules ?? []).flatMap((m: any) => (m.declarations ?? []).filter((d: any) => d.tagName).map((d: any) => [d.tagName, new Set((d.attributes ?? []).map((a: any) => a.name))])),
);
/** Whether the installed build's element reads an attribute of this name: its manifest lists it. Nothing is known of an element the build does not define. */
export const webReadsAttribute = (tag: string, name: string): boolean => webAttributeNames.get(tag)?.has(name) ?? false;

const webAttributeValueLists: Map<string, Map<string, string[]>> = new Map(
  (customElements.modules ?? []).flatMap((m: any) =>
    (m.declarations ?? [])
      .filter((d: any) => d.tagName)
      .map((d: any) => [
        d.tagName,
        new Map(
          (d.attributes ?? []).flatMap((a: any) => {
            const pieces = String(a.type?.text ?? '').split('|').map((piece) => piece.trim()).filter((piece) => piece !== 'undefined' && piece !== 'null');
            return pieces.length && pieces.every((piece) => /^'[^']*'$/.test(piece)) ? [[a.name, pieces.map((piece) => piece.slice(1, -1))]] : [];
          }),
        ),
      ]),
  ),
);
/**
 * The values the installed build's element reads for an attribute, where its manifest declares them as a closed list
 * of strings (`'none' | 'buttons'`); nothing where the attribute's values are open or not known.
 */
export const webAttributeValues = (tag: string, name: string): string[] | undefined => webAttributeValueLists.get(tag)?.get(name);

/** A component a design system ships, as its components manifest lists it (packages/tokens-build/src/components-manifest.js). */
export interface ManifestComponent {
  name: string;
  title: string;
  level: string;
  listing: string;
  /** The layer it lives in: the root's name for a component of the core. */
  layer: string;
  /** An element (`tag`, registered by `import`, or by its own `module`), or a class a stylesheet styles (`class`, `import`). */
  web?: { tag?: string; class?: string; import: string; module?: string };
  react?: { name: string; import: string };
  /** The values of its `variant` prop this system has. */
  variants?: string[];
}
/** A component a design system does not ship: left out by a layer of its chain, or living in a layer it does not extend. */
export interface ManifestOmission {
  name: string;
  title: string;
  /** The layer that left it out. */
  omittedBy?: string;
  reason?: string;
  /** What the system ships for the same job, by component name. */
  insteadUse?: string[];
  /** The layer it lives in, which this system does not extend. */
  providedBy?: string;
}
/** A shipped design system's components manifest: `tokens/generated/<id>/components.json`, written by `pnpm generate`. */
export interface ComponentsManifest {
  system: string;
  name: string;
  extends?: string;
  /** Its layers, the root first and the system last. */
  chain: string[];
  components: ManifestComponent[];
  omitted: ManifestOmission[];
  /** Component name → the values of its `variant` prop the system leaves out. */
  omittedVariants: Record<string, string[]>;
}
const manifestFiles = import.meta.glob<ComponentsManifest>('../../../../tokens/generated/*/components.json', { eager: true, import: 'default' });
/**
 * Every shipped design system's components manifest, the default system's first and then by id: the one list of what
 * a system ships, which the site's text for language models follows (`./llms.ts`).
 */
export const manifests: ComponentsManifest[] = Object.values(manifestFiles).sort((a, b) => Number(a.system !== config.namespace) - Number(b.system !== config.namespace) || a.system.localeCompare(b.system));

/** A design system's layer as written (`tokens/systems/<id>.system.json`): what the site says of the system. */
export interface SystemLayer {
  id: string;
  name: string;
  extends?: string;
  description?: string;
}
const layerFiles = import.meta.glob<SystemLayer>('../../../../tokens/systems/*.system.json', { eager: true, import: 'default' });
/** Every layer of tokens/systems/, by id. */
export const systemLayers: Record<string, SystemLayer> = Object.fromEntries(Object.values(layerFiles).map((layer) => [layer.id, layer]));

/**
 * The token documents of the components as written — those of the core (`tokens/comp/`) and those of the components
 * that live in a layer (`tokens/systems/<layer>/comp/`) — by path. What a component's tokens alias is read here; what
 * a system resolves them to is `./tokens.ts`'s.
 */
type TokenDocument = Record<string, any>;
export const componentTokenSources: Record<string, TokenDocument> = {
  ...import.meta.glob<TokenDocument>('../../../../tokens/comp/*.tokens.json', { eager: true, import: 'default' }),
  ...import.meta.glob<TokenDocument>('../../../../tokens/systems/*/comp/*.tokens.json', { eager: true, import: 'default' }),
};

const RANK = Object.fromEntries(statuses.map((s, i) => [s, i]));
/** True once a platform has anything shippable at the current spec (alpha or later; not lagging, not deprecated). */
export const isImplemented = (status: Status) => RANK[status] > RANK.planned && status !== 'lagging' && status !== 'deprecated';

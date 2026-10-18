// What the site says of the shipped design systems' components, from their components manifests
// (`tokens/generated/<id>/components.json`, written by `pnpm generate`) and nothing else: which systems have a
// component and which entries register it, what a system without it uses instead, how a product takes it all the same,
// and what each preset has that the default system does not. The availability block of a component's page, the index
// of components and the page on the presets read it here (components/ComponentAvailability.astro, ComponentIndex.astro,
// PresetFacts.astro); Node tests it (test/systems.test.mjs).
import { manifests, type ComponentsManifest, type ManifestComponent, type ManifestOmission } from './repo';

/** The default system's manifest: the first of `manifests`. */
export const defaultManifest: ComponentsManifest = manifests[0];
/** The presets' manifests: every shipped system but the default, by id. */
export const presetManifests: ComponentsManifest[] = manifests.slice(1);

/** A component's title, as a manifest names it (the spec's), or its name where no manifest knows it. */
export function titleOf(name: string): string {
  for (const manifest of manifests) {
    const found = manifest.components.find((entry) => entry.name === name) ?? manifest.omitted.find((entry) => entry.name === name);
    if (found) return found.title;
  }
  return name;
}

/** Systems that do not have a component for one reason, with that reason (what a manifest says of it, `omitted`). */
export interface Lack {
  systems: string[];
  /** The layer it lives in, which these systems do not extend. */
  providedBy?: string;
  /** The layer of their chain that left it out. */
  omittedBy?: string;
  reason?: string;
  /** What these systems ship for the same job, by component name. */
  insteadUse: string[];
}

/** Where a component is, across the shipped systems. */
export interface Availability {
  /** The systems that have it, the default first. */
  has: string[];
  /** The entries that register it on the web, one for each system that has it (no two the same). */
  entries: string[];
  /** The systems that do not have it, grouped by what their manifests say of it. */
  lacks: Lack[];
  /** The line a product's layer takes it with (`components.include`): its name, or `{ name, from }` for a component that lives in a layer. */
  include: string | { name: string; from: string };
  /** What a product imports to register it alone: its own module (or the stylesheet that styles its class). */
  module?: string;
}

/** Where a component is, across the shipped systems; null for one no manifest names. */
export function availabilityOf(name: string): Availability | null {
  const own = manifests.map((manifest) => [manifest, manifest.components.find((entry) => entry.name === name)] as const).filter((pair): pair is [ComponentsManifest, ManifestComponent] => !!pair[1]);
  const lacks: Lack[] = [];
  for (const manifest of manifests) {
    const omission: ManifestOmission | undefined = manifest.omitted.find((entry) => entry.name === name);
    if (!omission) continue;
    const insteadUse = omission.insteadUse ?? [];
    const same = lacks.find((lack) => lack.providedBy === omission.providedBy && lack.omittedBy === omission.omittedBy && lack.reason === omission.reason && lack.insteadUse.join() === insteadUse.join());
    if (same) same.systems.push(manifest.system);
    else lacks.push({ systems: [manifest.system], ...(omission.providedBy ? { providedBy: omission.providedBy } : {}), ...(omission.omittedBy ? { omittedBy: omission.omittedBy } : {}), ...(omission.reason ? { reason: omission.reason } : {}), insteadUse });
  }
  if (own.length === 0 && lacks.length === 0) return null;
  const providedBy = lacks.find((lack) => lack.providedBy)?.providedBy;
  const web = own[0]?.[1].web;
  return {
    has: own.map(([manifest]) => manifest.system),
    entries: [...new Set(own.map(([, entry]) => entry.web?.import).filter((entry): entry is string => !!entry))],
    lacks,
    include: providedBy ? { name, from: providedBy } : name,
    module: web?.module ?? (web?.class ? web.import : undefined),
  };
}

/** The values of a component's `variant` prop each system leaves out: system → values. */
export function variantsLeftOut(name: string): { system: string; values: string[] }[] {
  return manifests.flatMap((manifest) => (manifest.omittedVariants[name] ? [{ system: manifest.system, values: manifest.omittedVariants[name] }] : []));
}

/** Components that share the same values, gathered: `values` and the components, in the order first met. */
export interface SameValues {
  values: string[];
  components: string[];
}
const gathered = (pairs: [string, string[]][]): SameValues[] => {
  const out: SameValues[] = [];
  for (const [component, values] of pairs) {
    if (values.length === 0) continue;
    const same = out.find((entry) => entry.values.join() === values.join());
    if (same) same.components.push(component);
    else out.push({ values, components: [component] });
  }
  return out;
};

/** What a preset has and does not have, beside the default system. */
export interface PresetComponents {
  system: string;
  name: string;
  /** How many components it ships. */
  count: number;
  /** The entry that registers them on the web (the one most of them name). */
  entry?: string;
  /** The components it ships that the default system does not, by name. */
  beyond: string[];
  /** The components it does not have, as its manifest says. */
  lacks: { name: string; insteadUse: string[] }[];
  /** The values of `variant` it has that the default system does not, gathered by the values. */
  variantsBeyond: SameValues[];
  /** The values of `variant` it leaves out, gathered by the values. */
  variantsOut: SameValues[];
}

/** What a shipped system has and does not have, beside the default system. */
export function presetComponents(manifest: ComponentsManifest): PresetComponents {
  const base = new Map(defaultManifest.components.map((entry) => [entry.name, entry]));
  const entries = manifest.components.map((entry) => entry.web?.tag && entry.web.import).filter((entry): entry is string => !!entry);
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry, (counts.get(entry) ?? 0) + 1);
  return {
    system: manifest.system,
    name: manifest.name,
    count: manifest.components.length,
    entry: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0],
    beyond: manifest.components.filter((entry) => !base.has(entry.name)).map((entry) => entry.name),
    lacks: manifest.omitted.map((entry) => ({ name: entry.name, insteadUse: entry.insteadUse ?? [] })),
    variantsBeyond: gathered(manifest.components.filter((entry) => base.has(entry.name)).map((entry) => [entry.name, (entry.variants ?? []).filter((value) => !(base.get(entry.name)?.variants ?? []).includes(value))])),
    variantsOut: gathered(Object.entries(manifest.omittedVariants)),
  };
}

/**
 * A sentence of the dictionary in pieces: its text, and the `{place}`s where the page writes names, links or code
 * (components/Sentence.astro draws them).
 */
export function pieces(sentence: string): (string | { place: string })[] {
  return sentence.split(/(\{\w+\})/).filter(Boolean).map((piece) => (/^\{\w+\}$/.test(piece) ? { place: piece.slice(1, -1) } : piece));
}

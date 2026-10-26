// The parts a component's anatomy figure numbers, and the sentence that stands for the figure where it is not seen.
// From the spec alone (`spec.anatomy`): a part's number is its place in the spec, so the figure, its legend and the
// anatomy table of the Specs section count alike. Which element of the web build draws each part is the spec's
// `platforms.web.parts` (`webPartsOf`); a figure stands on the web package's own stage of a fixture (`blueprintStageOf`)
// and its script lays the numbers over the parts it finds there (lib/visuals/blueprint.ts).
import { readPart } from '../../../../../packages/tools/src/parts.js';
import { fixtureDocument } from '../fixture-documents';
import { definedTags, getSpec } from '../repo';

export interface AnatomyPart {
  /** Its number in the figure and in the legend, from 1, in the spec's order. */
  n: number;
  id: string;
  description: string;
  optional: boolean;
}

export function anatomyOf(name: string): AnatomyPart[] {
  return getSpec(name).anatomy.map((part, index) => ({ n: index + 1, id: part.id, description: part.description, optional: part.optional ?? false }));
}

/**
 * The figure's text alternative in the page's language: the dictionary's sentence (`visuals.anatomyAlt`, one for each
 * plural form of the language, `other` for the rest) for the number of parts, with `{component}` the component's title,
 * `{count}` that number and `{list}` the parts' ids as a list in that language. Every spec has at least one part, so it
 * is never only the sentence's own words.
 */
export function anatomyAlt(name: string, forms: Record<string, string>, lang: string): string {
  const ids = anatomyOf(name).map((part) => part.id);
  const form = forms[new Intl.PluralRules(lang).select(ids.length)] ?? forms.other;
  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(ids);
  return form.replaceAll('{component}', getSpec(name).title).replaceAll('{count}', String(ids.length)).replaceAll('{list}', list);
}

// ── Where each part is drawn on the web ──────────────────────────────────────────────────────────────────────────────

/**
 * Where a part is drawn, as the spec's `platforms.web.parts` says it (read by packages/tools/src/parts.js, which
 * `validate` holds every value to): the element itself, a CSS part it exports, what a slot holds, a child element (and
 * a part of it), or a class of the light-DOM stylesheet; and what of that target the part is — its box where no aspect
 * is named, the border or ring at its edge (`outline`), the focus indicator it draws (`focus-ring`) or the scrim behind
 * it (`backdrop`).
 */
export type PartTarget = ({ host: true } | { part: string } | { slot: string } | { child: string[]; part?: string } | { className: string }) & {
  aspect?: 'outline' | 'focus-ring' | 'backdrop';
};

/** A part of the anatomy figure: its number and id, and where the web draws it, or why it has no box there. */
export interface DrawnPart extends AnatomyPart {
  target: PartTarget | null;
  /** Why the web draws no box of its own for it (the spec's `noBox`), where it says so. */
  noBox?: string;
}

/** The parts of a component and where the web draws each; null where its spec does not say (`platforms.web.parts`). */
export function webPartsOf(name: string): DrawnPart[] | null {
  const parts = getSpec(name).platforms.web?.parts;
  if (!parts) return null;
  return anatomyOf(name).map((part) => {
    const value = parts[part.id];
    if (value === undefined) throw new Error(`${name}: platforms.web.parts has no "${part.id}" (pnpm validate holds every anatomy id to be mapped)`);
    const read = readPart(value, definedTags) as Record<string, unknown>;
    if ('noBox' in read) return { ...part, target: null, noBox: String(read.noBox) };
    if (read.problem) throw new Error(`${name}: platforms.web.parts "${part.id}": "${String(value)}" ${String(read.problem)}`);
    const { problem: _problem, aspect, ...rest } = read;
    return { ...part, target: (aspect ? { ...rest, aspect } : rest) as PartTarget };
  });
}

/** The fixture a component's anatomy figure draws: the spec's `anatomyFixture`, else its first fixture. */
export function anatomyFixtureOf(name: string): string | undefined {
  const spec = getSpec(name);
  return spec.anatomyFixture ?? spec.fixtures[0]?.id;
}

/** What a figure drawn over one of a component's fixtures stands on: the web package's own stage of it. */
export interface BlueprintStage {
  fixture: string;
  /** The document's stage, `<div class="stage" data-fixture="…">…</div>`, as the web package's tests draw it. */
  html: string;
  /** The component's staging, which the stage is drawn in (scoped to the figure's subject). */
  staging: string;
  /** The stage's size in CSS pixels, from the fixture's baseline: the room the subject holds before it is defined. */
  room: { width: number; height: number };
  /** The web element the parts are found in. */
  tag: string;
  /** The shipped system the stage is always drawn under: a component that lives in a layer is drawn under that layer's. */
  system?: string;
}

/**
 * The web package's stage of one of a component's fixtures, for a figure that lays numbers or lines over it; null where
 * a figure cannot stand on it: no document, a document whose every stage is a page, a fixture drawn in a window of its
 * own (presented, or sized by the window), a document that takes a step in script before its stages are what the
 * baselines show, no baseline to take the room of, or a stage that does not hold the component's web element.
 */
export function blueprintStageOf(name: string, fixture = anatomyFixtureOf(name)): BlueprintStage | null {
  const spec = getSpec(name);
  const document = fixtureDocument(name);
  const tag = spec.platforms.web?.name;
  if (!fixture || !document || !tag || document.page || document.after || document.windowed.includes(fixture)) return null;
  const stage = document.stages.find((candidate) => candidate.id === fixture);
  const room = document.sizes[fixture];
  if (!stage || !room || !new RegExp(`<${tag}[\\s/>]`).test(stage.html)) return null;
  const system = spec.layer && spec.layer !== 'core' ? spec.layer : undefined;
  return { fixture, html: stage.html, staging: document.staging, room, tag, system };
}

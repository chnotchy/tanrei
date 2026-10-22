// The parts a component's anatomy figure numbers, and the sentence that stands for the figure where it is not seen.
// From the spec alone (`spec.anatomy`): a part's number is its place in the spec, so the figure, its legend and the
// anatomy table of the Specs section count alike. Which element of the web build draws each part is not in the spec
// yet; a figure that points at a part waits for the spec to name it, and draws only the legend until then.
import { getSpec } from '../repo';

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

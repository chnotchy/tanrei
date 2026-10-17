// The web package's own fixture documents, as scripts/fixture-documents.mjs writes them before the site is built: for
// each component, the document its tests draw every fixture in and take each baseline from, taken apart — its
// stylesheets, its stages, its step in script — and the size of each fixture's stage, read from its baseline. The site
// draws every fixture from them, and from nothing else.
import documents from '../fixture-documents.generated.json';

export interface FixtureDocument {
  /** The rules of the document's head: the stage's own, the component's staging, and the package's stylesheets it carries whole. */
  styles: string;
  /** The stage's own rules and the component's staging alone: `styles` less the package's stylesheets (`sheets`). */
  staging: string;
  /** The package's stylesheets the document carries whole (`text.css`), which a page of the site loads itself. */
  sheets: string[];
  /** Each fixture's stage is a page of its own (the app shell): the stages stand in a `div`, not in the page's `main`. */
  page: boolean;
  /** Every stage, in the spec's order: `<div class="stage" data-fixture="…">…</div>`. */
  stages: { id: string; html: string }[];
  /** The step the staging takes in script once the component is defined, as a module's source. */
  after?: string;
  /** The same step taken apart, for a page that draws its stages one at a time: the step's source and the fixtures it reads, as source. */
  step?: { source: string; fixtures: string };
  /** The size of each stage that has a baseline, in CSS pixels. */
  sizes: Record<string, { width: number; height: number }>;
}

/** A component's fixture document; nothing where the web package's harness does not draw the component. */
export const fixtureDocument = (name: string): FixtureDocument | undefined => (documents as Record<string, FixtureDocument>)[name];

/** The components that have a fixture document. */
export const documentedComponents = (): string[] => Object.keys(documents);

/**
 * A stage's markup as a product writes it, for the copy action: what the stage holds, with each picture the harness
 * inlined (a `data:` address many kilobytes long) left as an empty address.
 */
export function stageMarkup(html: string): string {
  const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</div>'));
  return inner.replace(/="data:[^"]*"/g, '=""').trim();
}

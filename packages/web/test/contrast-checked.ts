import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** What a contrast check made of the texts it found: each text as its mark, in each of the three outcomes. */
export interface ContrastChecked {
  /** Checked, and too faint. */
  violations: string[];
  /** Checked, and enough. */
  passes: string[];
  /** Left unchecked: axe could not tell the text's background (an element over it, a graphic under it, …). */
  incomplete: string[];
}

/**
 * Runs axe-core's `color-contrast` rule over `scope` and names each text it reports by the mark the element that holds
 * the text carries (`data-text="<mark>"`, for the product's text in a slot), or else by the text itself (a component's
 * own: a tab's label, a snackbar's message), so that a test says which texts it expects in each outcome.
 *
 * Why a test needs it: the rule builds its own paint order of every visible element with a size, whatever its
 * `pointer-events`, and leaves a text under any of them "incomplete" (overlapped by another element) instead of
 * checking it — a page whose decorations stand in front of its text passes by not being looked at. A component's
 * decorations over its text (a focus indicator's box, an edge, a state layer) are drawn so that the text is checked
 * (`drawnAsNoElement()`, src/primitives/no-element.ts); a test of it puts faint text where the decoration lies and
 * expects it reported, a text in the component's colors expected to pass, and nothing left unchecked.
 */
export async function contrastChecked(page: Page, scope = '.stage'): Promise<ContrastChecked> {
  // Legacy mode runs axe in the page itself: no fixture has a frame, and the default opens a blank page per run.
  const results = await new AxeBuilder({ page }).setLegacyMode().include(scope).withRules(['color-contrast']).analyze();
  const mark = (html: string) => /data-text="([^"]+)"/.exec(html)?.[1] ?? html.replace(/<[^>]*>/g, '').trim();
  const marks = (list: typeof results.violations) => list.flatMap((rule) => rule.nodes.map((node) => mark(node.html))).sort();
  return { violations: marks(results.violations), passes: marks(results.passes), incomplete: marks(results.incomplete) };
}

// What the panel can show. The rail lists it: first the nine rows — each a part of the look, in the order of how much of
// it they change, with its current value — then the rest of what a layer holds. A row or an item of the rest is a
// section; the panel edits the one chosen. Inspect is no section: it opens over the panel, with the token tree and the
// file itself.

/** The rows: what most of a look is. Each can be locked, so that the shuffle leaves it alone. */
export const ROWS = ['color', 'neutral', 'typeface', 'size', 'radius', 'smoothing', 'icons', 'press', 'focus'] as const;
/** The rest of what a layer holds, each the panel of Groups it always was. */
export const MORE = ['base', 'dials', 'palettes', 'components', 'behavior', 'vocabulary', 'about', 'a11y'] as const;
export type Row = (typeof ROWS)[number];
export type Section = Row | (typeof MORE)[number];
export const SECTIONS: readonly Section[] = [...ROWS, ...MORE];
/** Inspect's two tabs: the token tree (every token, each with its editor) and Source (the layer file). */
export const INSPECT = ['tokens', 'source'] as const;
export type Inspect = (typeof INSPECT)[number];
/** What the panel's column holds: a section's controls, or Inspect at one of its tabs. Each keeps its own width. */
export type Pane = 'edit' | Inspect;
export const PANES: readonly Pane[] = ['edit', ...INSPECT];

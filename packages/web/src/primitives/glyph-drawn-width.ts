// A module of its own, with nothing else in it: the glyphs of a shadow root (`GlyphDrawnController`, glyph.ts) and the
// pending glyphs of a light-DOM component (`PendingGlyphs`, glyph-pending.ts) both measure by this width, and importing
// it from glyph.ts would bring that module's page-wide observer and font watch into a bundle that uses neither.

/**
 * A glyph of the icon set is a ligature: while its font is missing (still loading, failed, or never made available —
 * fonts are named, not bundled) the browser spells the glyph's name in a text face instead (CHK-19). A
 * ligature is one glyph, about one em wide; its name spelled out is several. A glyph is drawn while its ink is at most
 * `DRAWN_WIDTH` of its box (the box is one em: `iconGlyph()` sizes both from the icon size). The one answer on the web to
 * whether a glyph of the icon set can be drawn yet: the checkbox (CHK-19), the switch (SWT-17), the menu's check (MNU-30),
 * the snackbar's glyphs (SNK-26) and every other mark of the icon set use it.
 *
 * It assumes that a face that draws the ligature draws it no wider than `DRAWN_WIDTH` em, and that a fallback face
 * spells the name wider than that. That holds for Material Symbols and Material Icons; an icon font whose ligatures are
 * wider than their em box would read as not drawable.
 */
export const DRAWN_WIDTH = 1.5;

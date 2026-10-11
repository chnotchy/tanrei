/// The glyphs a component draws itself, as code points of Material Symbols, the icon set every
/// shipped system names (`system.icon`): drawn as text through `TanreiControlIcon`, so they take the
/// family, fill, weight and optical size of the system. Glyph names, not design values; a system whose
/// icon set has other code points would draw the wrong glyphs here.
library;

/// `check`: a filter chip's (CHP-13) and a selected segment's check (SEG-16).
const String tanreiCheckGlyph = '\u{e5ca}';

/// `close`: an input chip's remove action (CHP-18), a snackbar's close button, and an open FAB
/// menu's toggle (FBM-11).
const String tanreiCloseGlyph = '\u{e5cd}';

/// `keyboard_arrow_down`: a split button's chevron (SPB-14), turned half a turn while its menu is
/// open.
const String tanreiArrowDownGlyph = '\u{e313}';

/// `search`: a search bar's glyph (SRC-2).
const String tanreiSearchGlyph = '\u{e8b6}';

/// `arrow_back`: a full-screen search view's back button (SRC-11), mirrored right to left.
const String tanreiArrowBackGlyph = '\u{e5c4}';

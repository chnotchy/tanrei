// `@tanrei/web/icons` — the script side of `@tanrei/web/icons.css`, for a page that uses `.tanrei-icon` without the
// components: loading it marks every bare `.tanrei-icon` of the document whose glyph the icon set mirrors in a
// right-to-left layout, and keeps the marks right as the page changes. `@tanrei/web` loads it too.
// With no script at all, the product writes `data-mirror="always"` on each glyph that shows a direction.
import { observeIcons } from './primitives/glyph-mirror.js';

export { type GlyphMirroring, activeIconSet, glyphMirrors, glyphName, markGlyph, observeIcons } from './primitives/glyph-mirror.js';
export { type IconSet, iconSets, systemIconSets } from './generated/icon-sets.js';

if (typeof document !== 'undefined') observeIcons(document);

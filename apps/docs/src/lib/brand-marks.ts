// The brand marks as the site reads them: the sources (in `currentColor`) and the copies `pnpm generate` paints in
// the light scheme's on-surface, with the light scheme's surface they are drawn on. lib/brand.mjs makes the icons and
// the social image from them; components/frame/Header.astro draws the symbol inline.
import symbol from '../../../../design/brand/symbol.svg?raw';
import wordmark from '../../../../design/brand/wordmark.svg?raw';
import symbolLight from '../../../../design/brand/generated/symbol.light.svg?raw';
import symbolAdaptive from '../../../../design/brand/generated/symbol.adaptive.svg?raw';
import wordmarkLight from '../../../../design/brand/generated/wordmark.light.svg?raw';
import { config } from './repo';
import { contexts } from './tokens';

export const marks = { symbol, wordmark, symbolLight, symbolAdaptive, wordmarkLight };

/** The light scheme's surface: what a raster icon and the social image are drawn on (they cannot follow a scheme). */
export const surface: string = contexts.light[config.namespace].sys.color.surface.$value.hex;

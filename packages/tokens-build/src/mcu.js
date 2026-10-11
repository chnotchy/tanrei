// material-color-utilities@0.4.0 ships extensionless ESM imports in its barrel
// (dynamiccolor/*), so `import '@material/material-color-utilities'` fails under
// Node, and its `exports` map blocks deep specifiers. The leaf modules we need
// are fine, so load them by file path. Revisit when upstream fixes the barrel.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve('@material/material-color-utilities'));
const load = (p) => import(pathToFileURL(path.join(root, p)).href);

export const { Hct } = await load('hct/hct.js');
export const { TonalPalette } = await load('palettes/tonal_palette.js');

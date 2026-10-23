// The glyph names of the icon set that Tanrei's components may draw, and the axis values a system draws its icons at:
// what a product needs to cut its icon font down to (a subset of Material Symbols with the names its own screens use
// and these). `tanrei build` prints them.
//
// The names are generated from the specs and the web components' code (packages/tools/src/glyphs.js, `pnpm
// generate`) into packages/web/src/generated/glyphs.json; the published CLI carries a copy at the same path under its
// vocabulary (packages/cli/scripts/build.js).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './model.js';

export const COMPONENT_GLYPHS = 'packages/web/src/generated/glyphs.json';

/** The glyph names the components may draw (the list says where they are read from), or null where no list is at hand. */
export function componentGlyphs(root = REPO_ROOT) {
  const file = path.join(root, COMPONENT_GLYPHS);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).glyphs : null;
}

/**
 * The axis values a system draws icons at, from its IR (`ir.icon`): the fills of the two selection states, the
 * weights of an icon and of a control's mark, the optical sizes the box sizes are clamped to. The grade is 0: no token
 * moves it.
 * @returns {Record<'FILL'|'wght'|'GRAD'|'opsz', [number, number]>}
 */
export function iconAxesOf(ir) {
  const span = (...values) => {
    const known = values.filter((value) => typeof value === 'number');
    return known.length ? [Math.min(...known), Math.max(...known)] : null;
  };
  const icon = ir.icon ?? {};
  return Object.fromEntries(
    Object.entries({
      FILL: span(icon['fill-unselected'], icon['fill-selected']),
      wght: span(icon.weight, icon['mark-weight']),
      GRAD: [0, 0],
      opsz: span(icon['optical-size-min'], icon['optical-size-max']),
    }).filter(([, range]) => range),
  );
}

const range = ([min, max]) => (min === max ? `${min}` : `${min}–${max}`);

/** The names and the axes as the lines the CLI prints. */
export function glyphLines(names, axes, indent = '  ') {
  return [
    `${indent}glyphs the components may draw (${names.length}), at ${Object.entries(axes).map(([axis, span]) => `${axis} ${range(span)}`).join(' · ')}:`,
    `${indent}  ${names.join(',')}`,
    `${indent}Cut the icon font down to these names and your product's own, at these axis values (Google Fonts: icon_names=<names>; or a subsetter such as hb-subset or pyftsubset, keeping the ligature features).`,
  ];
}

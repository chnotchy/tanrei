// Which fonts a design system names. Fonts are referenced by NAME and never bundled, so a product
// must install or register every named family on each platform it ships; `tanrei build` and `tanrei systems` print
// this report, and `tanrei validate` prints its warnings.
const same = (a, b) => JSON.stringify(a.stack) === JSON.stringify(b.stack);

/**
 * @param {ReturnType<import('./ir.js').buildIR>} ir
 * @returns {{
 *   text: Record<'brand'|'plain'|'mono', { families: string[], generic: string, system: boolean, fallback: boolean, stack: string[] }>,
 *   icons: Record<'unselected'|'selected', { families: string[], stack: string[] }>,
 *   styles: Record<string, string[]>,   // text styles whose stack is none of the system's typefaces → its named families
 *   families: string[],                 // every named family, once, in order of first use
 *   warnings: string[],
 * }}
 */
export function fontReport(ir) {
  const text = Object.fromEntries(['brand', 'plain', 'mono'].filter((name) => ir.typefaces[name]).map((name) => [name, ir.typefaces[name]]));
  const icons = Object.fromEntries(['unselected', 'selected'].filter((state) => ir.iconFamilies[state]).map((state) => [state, ir.iconFamilies[state]]));
  const styles = {};
  for (const [style, { font }] of Object.entries(ir.typescale)) if (font && !Object.values(text).some((face) => same(face, font))) styles[style] = font;
  const families = [...new Set([...Object.values(text), ...Object.values(styles), ...Object.values(icons)].flatMap((stack) => stack.families))];
  const warnings = [];
  const check = (what, stack) => {
    if (!stack.fallback) warnings.push(`${what}: the font stack ${JSON.stringify(stack.stack)} has no system or generic fallback. Where ${stack.families.length > 1 ? 'none of these families' : 'this family'} is installed, text falls to whatever the platform picks. End the stack with system-ui, ui-monospace, sans-serif, serif or monospace.`);
  };
  for (const [name, stack] of Object.entries(text)) check(`typeface "${name}"`, stack);
  for (const [style, stack] of Object.entries(styles)) check(`text style "${style}"`, stack);
  // An icon font has no meaningful fallback (a generic family would draw the icon's NAME as text), so none is asked for.
  return { text, icons, styles: Object.fromEntries(Object.entries(styles).map(([style, stack]) => [style, stack.families])), families, warnings };
}

/** The report as the lines the CLI prints. */
export function fontLines(report, indent = '  ') {
  const list = (stack) => (stack.families.length ? stack.families.map((family) => `"${family}"`).join(', ') : 'none') + (stack.system ? ' (the platform’s own font first)' : '');
  const lines = [`${indent}text:  ${Object.entries(report.text).map(([name, stack]) => `${name} ${list(stack)}`).join(' · ')}`];
  for (const [style, families] of Object.entries(report.styles)) lines.push(`${indent}       ${style}: ${families.map((family) => `"${family}"`).join(', ') || 'none'}`);
  lines.push(`${indent}icons: ${Object.entries(report.icons).map(([state, stack]) => `${state} ${list(stack)}`).join(' · ')}`);
  return lines;
}

export const FONT_NOTE = 'Fonts are referenced by name, never bundled: the product installs or registers these families on every platform it ships.';

// Tanrei references fonts BY NAME and bundles none. Our own sites (the docs, the Theme Studio app) and the web test
// harness load typefaces from @fontsource packages — which register a variable font as "<Family> Variable". This
// writes a stylesheet that registers the same files under the names the TOKENS use ("Inter", "Noto Sans JP",
// "Roboto", "Material Symbols Outlined"…), so token-driven UI and the site chrome share one set of files, and a
// shipped preset previewed there is drawn in its own faces instead of a fallback.
//
// The packages are dependencies of private apps and devDependencies of test suites; no published library lists them,
// and nothing this file writes is inside a package's `files` (test/font-faces.test.js checks). The one published copy
// of the font files is the Theme Studio app that @tanrei/cli carries (dist/studio/): its build writes their licences
// beside them (THIRD_PARTY_LICENSES.md, packages/tools/src/third-party.js).
//
//   node packages/tools/src/font-faces.js <out.css> [--check-systems] [--icon-glyphs <list.json>,…] [--full-icons <out.css>]
//                                                                             (run from the app's directory)
//
//   --check-systems   also fail when a SHIPPED system (tokens/systems/*) names a family that is not registered:
//                     the package exists but this app does not depend on it, or nobody has decided where the
//                     family comes from (add it to FONT_PACKAGES or to PLATFORM_FAMILIES below).
//   --icon-glyphs     register each icon family from a file cut down to the glyph names of these lists (glyphs.js
//                     writes them) at the axis values the tokens use, written beside <out.css> as
//                     <family>.subset.generated.woff2 — instead of the package's full file (5.4 MB for Material
//                     Symbols Rounded). The docs site does; the web test harness and the Theme Studio app keep the
//                     full file, which draws any name a test or a person types.
//   --full-icons      also write a stylesheet that registers the icon families from their full files, for a page that
//                     loads it later and may draw any glyph at any axis value (the docs' Theme Studio page).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * The family name the tokens use → [package, stylesheet inside it, the subsets to register (all, when not named)].
 * A family a site adds for one script names that script's subset alone: its unicode-range then covers that script and
 * nothing else, so the faces before it in the stack keep drawing Latin, digits and symbols.
 */
export const FONT_PACKAGES = {
  // The default system.
  Inter: ['@fontsource-variable/inter', 'wght.css'],
  'Noto Sans JP': ['@fontsource-variable/noto-sans-jp', 'wght.css'],
  'Roboto Mono': ['@fontsource-variable/roboto-mono', 'wght.css'],
  // `full.css` carries every axis: FILL, wght, GRAD, opsz — sys.icon sets FILL and wght, the browser sets opsz.
  'Material Symbols Rounded': ['@fontsource-variable/material-symbols-rounded', 'full.css'],
  // m3-like and m3-expressive-like.
  Roboto: ['@fontsource-variable/roboto', 'wght.css'],
  'Material Symbols Outlined': ['@fontsource-variable/material-symbols-outlined', 'full.css'],
  // A face of a further script that a site of ours is shown in (the Theme Studio app in Arabic): the stack's first
  // faces have no Arabic, and the platform's fallback is drawn smaller and thinner than the text around it.
  'Noto Sans Arabic': ['@fontsource-variable/noto-sans-arabic', 'wght.css', ['arabic']],
};

/**
 * Families a shipped system names that are NOT ours to register: they belong to a platform (and its license), or are
 * a later entry of a stack whose first family is registered. They draw where the platform has them and fall through
 * the stack elsewhere — which is what the system asked for.
 */
export const PLATFORM_FAMILIES = {
  'SF Mono': 'Apple platforms only; no redistributable package (cupertino falls to Menlo, then ui-monospace).',
  Menlo: 'Apple platforms only; no redistributable package (cupertino falls to ui-monospace).',
  'Noto Sans': 'The default stack’s fallback after Noto Sans JP, for a machine that has it installed; Inter and Noto Sans JP are registered before it.',
};

export const isIconFamily = (family) => /^Material (Symbols|Icons)/.test(family);

/**
 * The font files a family is registered from, as absolute paths: those of its package's stylesheet (every subset).
 * @param {string} family a family of FONT_PACKAGES
 * @param {string} [from] the app (or package) whose dependencies provide the fonts
 */
export function fontFiles(family, from = process.cwd()) {
  const entry = FONT_PACKAGES[family];
  if (!entry) throw new Error(`font-faces: no package is known for "${family}"`);
  const sheet = createRequire(path.join(from, 'package.json')).resolve(`${entry[0]}/${entry[1]}`);
  return [...fs.readFileSync(sheet, 'utf8').matchAll(/url\(\.\/(files\/[^)]+)\)/g)].map((m) => path.join(path.dirname(sheet), m[1]));
}

/** The file name of a family's cut-down file: `material-symbols-rounded.subset.generated.woff2`. */
export const subsetFileName = (family) => `${family.toLowerCase().replaceAll(' ', '-')}.subset.generated.woff2`;

/**
 * How to cut an icon font down to `axes` (glyphs.js, `iconAxes()`): an axis the tokens hold at one value is pinned
 * there, a range narrower than the font's is cut to it, and the rest are kept whole.
 * @param {Record<string, [number, number]>} axes
 * @param {Record<string, { min: number, max: number }>} fontAxes the font's own (HarfBuzz `getAxisInfos()`)
 */
export function axisCuts(axes, fontAxes) {
  const pin = {};
  const ranges = {};
  for (const [axis, [min, max]] of Object.entries(axes)) {
    const own = fontAxes[axis];
    if (!own) continue;
    if (min === max) pin[axis] = min;
    else if (min > own.min || max < own.max) ranges[axis] = [Math.max(min, own.min), Math.min(max, own.max)];
  }
  return { pin, ranges };
}

/**
 * Writes each icon family `from` registers, cut down to `names` at `axes`, beside `outFile`.
 * @returns {Promise<Record<string, { file: string, weight?: [number, number], bytes: number }>>} family → the file written
 */
export async function writeIconSubsets(outFile, names, axes, from = process.cwd(), families = registeredFamilies(from).filter(isIconFamily)) {
  const { iconFont, subsetIconFont } = await import('./icon-font.js');
  const out = {};
  for (const family of families) {
    const files = fontFiles(family, from);
    if (files.length !== 1) throw new Error(`font-faces: "${family}" is registered from ${files.length} files; an icon family is cut down from one`);
    const full = fs.readFileSync(files[0]);
    const cuts = axisCuts(axes, (await iconFont(full)).axes());
    const bytes = await subsetIconFont(full, names, cuts);
    const file = path.join(path.dirname(outFile), subsetFileName(family));
    if (!fs.existsSync(file) || !Buffer.from(bytes).equals(fs.readFileSync(file))) fs.writeFileSync(file, bytes);
    const weight = cuts.ranges.wght ?? (cuts.pin.wght === undefined ? undefined : [cuts.pin.wght, cuts.pin.wght]);
    out[family] = { file, ...(weight ? { weight } : {}), bytes: bytes.byteLength };
  }
  return out;
}

/**
 * @param {string} outFile where the stylesheet will live: font URLs are written relative to it
 * @param {string} [from] the app (or package) whose dependencies provide the fonts
 * @param {{ families?: string[], embed?: boolean, subsets?: string[], iconFiles?: Record<string, { file: string, weight?: [number, number] }> }} [options]
 *   `families` — register only these (default: every family in FONT_PACKAGES whose package `from` depends on);
 *   `embed` — inline the font files as data: URLs, for a page with no file system behind it (the web test harness);
 *   `subsets` — keep only these @fontsource subsets (`latin`, `japanese`…); icon fonts have one subset and keep it;
 *   `iconFiles` — an icon family registered from this file instead of its package's (writeIconSubsets()), with the
 *   weights it still has.
 */
export function fontFacesCss(outFile, from = process.cwd(), { families, embed = false, subsets, iconFiles = {} } = {}) {
  const require = createRequire(path.join(from, 'package.json'));
  const out = ['/* GENERATED by packages/tools/src/font-faces.js — do not edit. Fonts are loaded from @fontsource packages (development', '   dependencies) and registered under the family names the tokens use. Tanrei\'s libraries bundle no font. */'];
  for (const family of families ?? Object.keys(FONT_PACKAGES)) {
    const entry = FONT_PACKAGES[family];
    if (!entry) throw new Error(`font-faces: no package is known for "${family}". Known: ${Object.keys(FONT_PACKAGES).join(', ')}`);
    const [pkg, sheet, familySubsets] = entry;
    const wanted = familySubsets ?? subsets;
    let file;
    try {
      file = require.resolve(`${pkg}/${sheet}`);
    } catch {
      if (families) throw new Error(`font-faces: "${family}" needs ${pkg}, which ${path.relative(process.cwd(), from) || '.'} does not depend on`);
      continue; // an app loads only the fonts it depends on
    }
    const dir = path.dirname(file);
    const faces = fs.readFileSync(file, 'utf8').match(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]*\}/g) ?? [];
    // A face's file is `<family id>-<subset>-<axis>-<style>.woff2`: the subset is the segment before the axis, so
    // `latin` keeps neither `latin-ext` nor, for a family whose id holds the subset's name (noto-sans-arabic), `math`.
    const kept = faces.filter((face) => !wanted || isIconFamily(family) || wanted.some((subset) => new RegExp(`files/[a-z0-9-]*?-${subset}-[a-z]+-(?:normal|italic)\\.`).test(face)));
    const own = iconFiles[family];
    const relative = (file) => path.relative(path.dirname(outFile), file).split(path.sep).join('/');
    const css = (own ? kept.map((face) => face.replace(/font-weight: [\d ]+;/, (weights) => (own.weight ? `font-weight: ${[...new Set(own.weight)].join(' ')};` : weights))) : kept)
      .join('\n')
      .replace(/font-family:\s*'[^']+';/g, `font-family: '${family}';`)
      .replace(/url\(\.\/(files\/[^)]+)\)/g, (_, rel) => {
        const file = own ? own.file : path.join(dir, rel);
        if (embed) return `url(data:font/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString('base64')})`;
        const url = relative(file);
        return `url('${url.startsWith('.') ? url : `./${url}`}')`;
      })
      // Icons must not flash as ligature text while the font loads: the only other rendering of a ligature icon font
      // is its glyph's name in letters, so the text stays invisible until the file is there — for at most the
      // browser's block period, about 3 s, which a cut-down file fits in on a slow line and the full one did not.
      .replace(/font-display: swap;/g, isIconFamily(family) ? 'font-display: block;' : 'font-display: swap;');
    out.push(`\n/* ${family} — ${pkg} */`, css.trim());
  }
  return `${out.join('\n')}\n`;
}

/** Which of the families in FONT_PACKAGES `from` can register (its package resolves from there). */
export function registeredFamilies(from = process.cwd()) {
  const require = createRequire(path.join(from, 'package.json'));
  return Object.entries(FONT_PACKAGES)
    .filter(([, [pkg, sheet]]) => {
      try {
        return !!require.resolve(`${pkg}/${sheet}`);
      } catch {
        return false;
      }
    })
    .map(([family]) => family);
}

/**
 * The named families of every shipped system — the list `tanrei build` prints (fontReport), not a table kept by hand.
 * @returns {Promise<Record<string, string[]>>} system id → families
 */
export async function shippedFamilies() {
  const build = (file) => import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tokens-build/src', file)).href);
  const [{ shippedSystems }, { fontReport }, { buildIR }, { REPO_ROOT }, { resolveSystem }] = await Promise.all(['bundle.js', 'fonts.js', 'ir.js', 'model.js', 'resolve.js'].map(build));
  const out = {};
  for (const system of shippedSystems(REPO_ROOT)) out[system] = fontReport(buildIR(await (await resolveSystem({ system })).model())).families;
  return out;
}

/**
 * What stops a shipped system from being drawn in its own faces on a site built in `from`.
 * @param {Record<string, string[]>} systems the result of shippedFamilies()
 */
export function missingFamilies(systems, from = process.cwd()) {
  const registered = new Set(registeredFamilies(from));
  const problems = [];
  for (const [system, families] of Object.entries(systems)) {
    for (const family of families) {
      if (registered.has(family) || family in PLATFORM_FAMILIES) continue;
      const known = FONT_PACKAGES[family];
      problems.push(
        known
          ? `system "${system}" names "${family}": add ${known[0]} to the dependencies of ${path.relative(process.cwd(), from) || 'this app'} (development only)`
          : `system "${system}" names "${family}", and nobody has decided where it comes from: add its package to FONT_PACKAGES, or the reason there is none to PLATFORM_FAMILIES (packages/tools/src/font-faces.js)`,
      );
    }
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const values = new Set(['--icon-glyphs', '--full-icons'].map(option).filter(Boolean));
  const outFile = path.resolve(args.find((arg) => !arg.startsWith('--') && !values.has(arg)) ?? 'fonts.css');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  let iconFiles = {};
  if (option('--icon-glyphs')) {
    const lists = option('--icon-glyphs').split(',').map((file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')));
    const axes = lists.find((list) => list.axes)?.axes;
    if (!axes) throw new Error('font-faces: no list given to --icon-glyphs holds the icon axes (packages/web/src/generated/glyphs.json does)');
    const names = [...new Set(lists.flatMap((list) => list.glyphs))].sort();
    iconFiles = await writeIconSubsets(outFile, names, axes);
    for (const [family, { file, bytes }] of Object.entries(iconFiles)) console.log(`✔ fonts: ${family} cut down to ${names.length} glyph names → ${path.relative(process.cwd(), file)} (${Math.round(bytes / 1024)} KB)`);
  }
  fs.writeFileSync(outFile, fontFacesCss(outFile, process.cwd(), { iconFiles }));
  console.log(`✔ fonts: ${path.relative(process.cwd(), outFile)} (${registeredFamilies().join(', ') || 'no @fontsource package found'})`);
  if (option('--full-icons')) {
    const fullFile = path.resolve(option('--full-icons'));
    fs.writeFileSync(fullFile, fontFacesCss(fullFile, process.cwd(), { families: registeredFamilies().filter(isIconFamily) }));
    console.log(`✔ fonts: ${path.relative(process.cwd(), fullFile)} (the icon families from their full files, for a page that loads them later)`);
  }
  if (args.includes('--check-systems')) {
    const problems = missingFamilies(await shippedFamilies());
    for (const problem of problems) console.error(`✖ fonts: ${problem}`);
    if (problems.length) process.exit(1);
    console.log('✔ fonts: every family a shipped system names is registered, or belongs to a platform');
  }
}

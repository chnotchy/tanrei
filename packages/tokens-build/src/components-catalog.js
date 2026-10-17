// Writes the component catalog and every shipped system's components manifest (components-manifest.js says what they
// are):
//
//   packages/tokens-build/generated/component-catalog.json   every component with a spec: where it lives, its
//                                                            names on the web and in React, its `variant` prop —
//                                                            the same for every system
//   tokens/generated/<id>/components.json                    what system <id> ships, for each shipped system
//
//   node packages/tokens-build/src/components-catalog.js   (pnpm generate runs it; pnpm drift fails while one is stale)
//
// It reads the specs and what the platforms generate from them — the web package's custom-elements.json, its
// `exports`, and the React wrappers — so it runs after them. A name the catalog gives is one a product can import
// today: a tag the web package defines in the module named, a stylesheet it exports, an entry it has, a wrapper the
// React package exports. Where one is missing the generator fails rather than write a name that does not exist.
// The published CLI carries a copy of the catalog (packages/cli/scripts/build.js), so `tanrei build` writes a
// product's manifest from the same list.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveFrom, source } from '../../tools/src/from.js';
import { ROOT_SYSTEM, heldComponents, layerChain, listSystems, shippedSystems } from './bundle.js';
import { CATALOG_FILE, componentsManifest, manifestComment, manifestFile } from './components-manifest.js';
import { CONFIG } from './config.js';
import { loadSystem } from './scheme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREFIX = `${CONFIG.web.tagPrefix}-`;
const WEB = `${CONFIG.packages.npmScope}/web`;
const pascal = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

/** Where a forwarded prop comes from, followed to its end: the component whose own prop it is. */
function ownerOf(spec, prop, byName, seen = new Set()) {
  if (!prop.from || seen.has(spec.name)) return spec.name;
  const { component, name } = source(prop.from);
  const member = byName.get(component);
  const theirs = member?.props?.find((each) => each.name === name);
  return theirs ? ownerOf(member, theirs, byName, new Set([...seen, spec.name])) : component;
}

/**
 * The catalog of every component of specs/inventory.json that has a spec, in the inventory's order.
 * @param {string} [root] the repository
 */
export function componentCatalog(root = ROOT) {
  const rows = readJson(root, 'specs/inventory.json').components;
  const specs = new Map(rows.filter((row) => fs.existsSync(path.join(root, `specs/${row.name}.spec.json`))).map((row) => [row.name, readJson(root, `specs/${row.name}.spec.json`)]));
  const elements = new Map(readJson(root, 'packages/web/custom-elements.json').modules.flatMap((module) => (module.declarations ?? []).filter((each) => each.customElement && each.tagName).map((each) => [each.tagName, module.path])));
  const exported = new Set(Object.keys(readJson(root, 'packages/web/package.json').exports));
  const wrappers = new Set([...fs.readFileSync(path.join(root, 'packages/react/src/generated/components.ts'), 'utf8').matchAll(/^export \{ (\w+)[ ,]/gm)].map((match) => match[1]));
  const shipped = shippedSystems(root);
  const problems = [];

  const components = [];
  for (const row of rows) {
    const spec = specs.get(row.name);
    if (!spec) continue; // planned everywhere: nothing to import yet
    const layer = row.layer ?? ROOT_SYSTEM;
    // A component that lives in a layer is registered by the entries of the systems that ship it, and a layer that holds
    // one is a shipped system: its entry is `@tanrei/web/<layer>`, which the web build writes.
    if (layer !== ROOT_SYSTEM && !(shipped.includes(layer) && exported.has(`./${layer}`))) problems.push(`${row.name} lives in "${layer}", which is not a shipped system with an entry of ${WEB} ("./${layer}" in packages/web/package.json exports)`);
    const entry = { name: row.name, title: row.title, level: row.level, listing: row.listing, layer };
    const web = spec.platforms?.web;
    if (web && web.status !== 'planned') {
      const at = elements.get(web.name);
      if (at) {
        // `@tanrei/web/components/<dir>` is dist/components/<dir>/<dir>.js (packages/web/package.json exports).
        const [, dir, file] = /^src\/components\/([a-z0-9-]+)\/([a-z0-9-]+)\.ts$/.exec(at) ?? [];
        if (!dir || dir !== file) problems.push(`${row.name}: <${web.name}> is defined in ${at}, which ${WEB}/components/* does not name`);
        entry.web = { tag: web.name, module: `${WEB}/components/${dir}` };
        const name = pascal(web.name.slice(PREFIX.length));
        if (!wrappers.has(name)) problems.push(`${row.name}: the React package exports no ${name} for <${web.name}> (packages/react/src/generated/components.ts)`);
        entry.react = { name };
      } else {
        // Not an element: a class on the product's own element, styled by a stylesheet of the package.
        const sheet = `./${web.name.slice(PREFIX.length)}.css`;
        if (!exported.has(sheet)) problems.push(`${row.name}: "${web.name}" is neither an element of custom-elements.json nor a class whose stylesheet ${WEB} exports (${sheet})`);
        entry.web = { class: web.name, stylesheet: `${WEB}${sheet.slice(1)}` };
      }
    }
    const variant = resolveFrom(spec, specs).props?.find((prop) => prop.name === 'variant' && Array.isArray(prop.values));
    if (variant) {
      const own = spec.props.find((prop) => prop.name === 'variant');
      entry.variant = { values: variant.values, ...(variant.default !== undefined ? { default: variant.default } : {}), ...(variant.axis ? { axis: variant.axis } : {}), source: ownerOf(spec, own, specs) };
    }
    components.push(entry);
  }
  if (problems.length) throw new Error(`the component catalog names what does not exist:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  return {
    $comment: 'GENERATED by packages/tokens-build/src/components-catalog.js (pnpm generate) — do not edit. Every component with a spec: the layer it lives in, its names on the web and in React, and its `variant` prop. The same for every system; a system\'s components manifest (tokens/generated/<id>/components.json) is worked out from it and the system\'s layers.',
    components,
  };
}

/** The files this generator writes, relative to the repository. */
export const componentFiles = (root = ROOT) => [CATALOG_FILE, ...shippedSystems(root).map(manifestFile)];

/** Writes the catalog and every shipped system's manifest. Returns the files written. */
export function writeComponentFiles(root = ROOT) {
  const catalog = componentCatalog(root);
  const read = (id) => loadSystem(root, id);
  const held = heldComponents(listSystems(root), read);
  const files = {
    [CATALOG_FILE]: catalog,
    ...Object.fromEntries(
      shippedSystems(root).map((id) => [
        manifestFile(id),
        {
          $comment: manifestComment(id, 'packages/tokens-build/src/components-catalog.js (pnpm generate)'),
          ...componentsManifest(layerChain(id, read), catalog, held, shippedSystems(root)),
        },
      ]),
    ),
  };
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = `${JSON.stringify(content, null, 2)}\n`;
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
  }
  return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const written = writeComponentFiles();
  console.log(`✔ components: ${written.join(', ')}`);
}

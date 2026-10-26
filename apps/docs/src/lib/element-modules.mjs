// Which module of `@tanrei/web` defines each element, for a page that loads only the elements it draws
// (lib/define-on-demand.ts).
//
// The table is the web package's own Custom Elements Manifest (`custom-elements.json`): each module that declares a
// custom element, with the tags it defines. It reaches the browser as the virtual module `virtual:tanrei-element-modules`,
// which is the table and nothing else: for each tag, a function that imports its module through the package's own export
// (`@tanrei/web/components/<name>`). The bundler makes each of those modules a chunk of its own, asked for only when
// the function is called, and the manifest itself (several megabytes) never reaches a page.
import fs from 'node:fs';
import { createRequire } from 'node:module';

/** The virtual module's name, as a page's script imports it. */
export const ELEMENT_MODULES = 'virtual:tanrei-element-modules';
const RESOLVED = `\0${ELEMENT_MODULES}`;

/**
 * The modules that define elements, from a Custom Elements Manifest: one row for each export of the package that
 * loads them, with every tag that loading it defines, in the manifest's order.
 * @param {{ modules?: { path: string, declarations?: { name?: string, customElement?: boolean, tagName?: string }[], exports?: { kind: string, name: string, declaration?: { name: string, module?: string } }[] }[] }} manifest
 * @returns {{ specifier: string, tags: string[] }[]}
 */
export function elementModules(manifest) {
  const modules = manifest.modules ?? [];
  const byPath = new Map(modules.map((module) => [module.path, module]));
  const rows = new Map();
  for (const module of modules) {
    const elements = (module.declarations ?? []).filter((declaration) => declaration.customElement && declaration.tagName);
    if (!elements.length) continue;
    const tags = elements.map((declaration) => declaration.tagName);
    // The package exports `./components/<name>` as `dist/components/<name>/<name>.js`: a module that defines an element
    // is the one of its folder's name, or another module of that folder whose elements the folder's module re-exports
    // (the toolbar's group, `toolbar-group.ts`), and so imports. One elsewhere would have no export to load it by, so
    // it is refused here.
    const [, folder, file] = /^src\/components\/([^/]+)\/([^/]+)\.ts$/.exec(module.path) ?? [];
    const main = folder && byPath.get(`src/components/${folder}/${folder}.ts`);
    const reexported = (declaration) => (main?.exports ?? []).some((exported) => exported.kind === 'js' && exported.declaration?.name === declaration.name && exported.declaration?.module === `./${file}.js`);
    if (!folder || (file !== folder && !elements.every(reexported))) throw new Error(`${ELEMENT_MODULES}: ${module.path} defines ${tags.join(', ')}, but @tanrei/web exports only src/components/<name>/<name>.ts as @tanrei/web/components/<name>, and that module does not re-export it`);
    const specifier = `@tanrei/web/components/${folder}`;
    rows.set(specifier, [...(rows.get(specifier) ?? []), ...tags]);
  }
  return [...rows].map(([specifier, tags]) => ({ specifier, tags }));
}

/**
 * The virtual module's source: `loaders`, a function for each tag that imports the module defining it (the same
 * function for the tags of one module), and `modules`, how many modules there are.
 * @param {{ specifier: string, tags: string[] }[]} rows
 */
export function elementModulesSource(rows) {
  const lines = rows.map(({ specifier }, index) => `const m${index} = () => import(${JSON.stringify(specifier)});`);
  const entries = rows.flatMap(({ tags }, index) => tags.map((tag) => `  ${JSON.stringify(tag)}: m${index},`));
  return [...lines, 'export const loaders = {', ...entries, '};', `export const modules = ${rows.length};`, ''].join('\n');
}

/**
 * The names the React package gives each element, for the code of an example (lib/example-code.ts): the module the
 * wrappers are imported from, and for each tag its wrapper — the tag without the prefix, in PascalCase, as the React
 * package's generator names it (packages/react/scripts/generate.js) — and the attributes whose prop is not the
 * attribute's name in camelCase, or whose value is a number. Served as `virtual:tanrei-react-names`, a table and nothing else, which a page
 * loads when a reader first opens an example's code.
 * @param {{ modules?: { declarations?: { tagName?: string, customElement?: boolean, attributes?: { name: string, fieldName?: string, type?: { text?: string } }[] }[] }[] }} manifest
 * @param {{ web: { tagPrefix: string }, packages: { npmScope: string } }} config  tanrei.config.json
 */
export function reactNames(manifest, config) {
  const prefix = `${config.web.tagPrefix}-`;
  const pascal = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');
  const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const elements = {};
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.customElement || !declaration.tagName?.startsWith(prefix)) continue;
      // Only what a reader of the attribute's name could not tell: a property not named as the attribute in camelCase
      // (`readonly` → `readOnly`), an attribute of no property whose name has a hyphen (kept as written), a number, and
      // an attribute that turns off a property that is on by default (`flush` for `inset`, which React sets to false).
      const props = {};
      for (const attribute of declaration.attributes ?? []) {
        const number = /^number\b/.test(attribute.type?.text ?? '');
        const property = attribute.fieldName ?? attribute.name;
        const turnsOff = attribute.type?.text === 'boolean' && String(attribute.default) === 'true' && property !== camel(attribute.name);
        if (property !== camel(attribute.name) || number) props[attribute.name] = number ? [property, 1] : turnsOff ? [property, 2] : [property];
      }
      elements[declaration.tagName] = [pascal(declaration.tagName.slice(prefix.length)), props];
    }
  }
  return { module: `${config.packages.npmScope}/react`, elements };
}

/** The virtual module of the React names' table. */
export const REACT_NAMES = 'virtual:tanrei-react-names';
const RESOLVED_NAMES = `\0${REACT_NAMES}`;

/**
 * The Vite plugin that serves `virtual:tanrei-element-modules` and `virtual:tanrei-react-names`, from the manifest of
 * the installed `@tanrei/web` and the repository's names (tanrei.config.json).
 */
export function elementModulesPlugin() {
  const manifest = createRequire(import.meta.url).resolve('@tanrei/web/custom-elements.json');
  const config = new URL('../../../../tanrei.config.json', import.meta.url);
  return {
    name: 'tanrei-docs:element-modules',
    resolveId(source) {
      if (source === ELEMENT_MODULES) return RESOLVED;
      if (source === REACT_NAMES) return RESOLVED_NAMES;
      return undefined;
    },
    load(id) {
      if (id === RESOLVED) {
        this.addWatchFile(manifest);
        return elementModulesSource(elementModules(JSON.parse(fs.readFileSync(manifest, 'utf8'))));
      }
      if (id === RESOLVED_NAMES) {
        this.addWatchFile(manifest);
        const names = reactNames(JSON.parse(fs.readFileSync(manifest, 'utf8')), JSON.parse(fs.readFileSync(config, 'utf8')));
        return `export default ${JSON.stringify(names)};\n`;
      }
      return undefined;
    },
  };
}

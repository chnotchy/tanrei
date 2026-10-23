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

/** The Vite plugin that serves `virtual:tanrei-element-modules`, from the manifest of the installed `@tanrei/web`. */
export function elementModulesPlugin() {
  const manifest = createRequire(import.meta.url).resolve('@tanrei/web/custom-elements.json');
  return {
    name: 'tanrei-docs:element-modules',
    resolveId(source) {
      return source === ELEMENT_MODULES ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      this.addWatchFile(manifest);
      return elementModulesSource(elementModules(JSON.parse(fs.readFileSync(manifest, 'utf8'))));
    },
  };
}

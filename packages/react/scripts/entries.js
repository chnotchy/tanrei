// The package's entries, generated from the components manifests (tokens/generated/<id>/components.json): each
// component a manifest lists names, as `react.import`, the entry a product imports its wrapper from, and this script
// gives every such entry exactly the wrappers the manifests put in it. Which entry a component is in is decided once,
// by `importOf` (packages/tokens-build/src/components-manifest.js); nothing here lists a component or a system.
//
//   @tanrei/react            the default system's components
//   @tanrei/react/<id>       another shipped system's components
//   @tanrei/react/advanced   the components listed as advanced (building blocks), in every system
//   @tanrei/react/all        every wrapper (a product's own system, a system builder, the docs)
//
// A wrapper of an element a component draws among its children (`ListItem` for the list, `Option` for the select) is in
// every entry its component is in. In an entry whose systems leave values of a component's `variant` out, the wrapper's
// type takes none of them (`Narrowed`, types only: the wrapper is the same one). An advanced component's doc comment
// names the components built from it, which a product usually writes instead.
//
//   node packages/react/scripts/entries.js   (pnpm generate runs it after the manifests; pnpm drift fails while one is stale)
//
// It writes packages/react/src/entries/generated/ whole, and fails where the package's `exports` (package.json) do not
// name each entry, or a manifest names a wrapper the package does not have.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PACKAGE = path.join(ROOT, 'packages/react');
const OUT = path.join(PACKAGE, 'src/entries/generated');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const { web: { tagPrefix }, packages: { npmScope } } = readJson(path.join(ROOT, 'tanrei.config.json'));
const REACT = `${npmScope}/react`;
const ALL = `${REACT}/all`;
const pkg = readJson(path.join(PACKAGE, 'package.json'));
if (pkg.name !== REACT) throw new Error(`packages/react/package.json is "${pkg.name}", and tanrei.config.json makes it "${REACT}"`);

// Every wrapper, as src/generated/components.ts exports it, with what its module says of it.
const wrappersDir = path.join(PACKAGE, 'src/generated/wrappers');
const wrappers = new Map(
  [...fs.readFileSync(path.join(PACKAGE, 'src/generated/components.ts'), 'utf8').matchAll(/^export \{ (\w+)(, type (\w+))? \} from '\.\/wrappers\/([a-z0-9-]+)\.js';$/gm)].map(([, name, , marks, file]) => {
    const text = fs.readFileSync(path.join(wrappersDir, `${file}.ts`), 'utf8');
    const doc = new RegExp(`(/\\*\\*(?:(?!\\*/)[\\s\\S])*\\*/)\\s*export const ${name}\\b`).exec(text)?.[1];
    const tag = /^ {2}tagName: '([a-z0-9-]+)',$/m.exec(text)?.[1];
    const dir = new RegExp(`from '${npmScope}/web/components/([a-z0-9-]+)';$`, 'm').exec(text)?.[1];
    if (!doc || !tag || !dir) throw new Error(`src/generated/wrappers/${file}.ts: no doc comment, tag or element module found for ${name}`);
    return [name, { name, marks, file, doc, tag, dir }];
  }),
);
if (!wrappers.size) throw new Error('src/generated/components.ts exports no wrapper: run scripts/generate.js first');

// The components whose wrapper is each element. A component's own element is that component's alone, wherever another
// spec names it among its children (a field's text input is the text input). Any other element is its components':
// those whose spec names it among their items (`platforms.web.items`), or — where no spec names it — the component
// whose module defines it.
const specs = fs
  .readdirSync(path.join(ROOT, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .sort()
  .map((file) => readJson(path.join(ROOT, 'specs', file)));
const shipping = specs.filter((spec) => spec.platforms?.web && spec.platforms.web.status !== 'planned');
const ownersOf = new Map(shipping.filter((spec) => spec.platforms.web.name?.startsWith(`${tagPrefix}-`)).map((spec) => [spec.platforms.web.name, new Set([spec.name])]));
const owned = new Set(ownersOf.keys());
const own = (tag, component) => ownersOf.set(tag, new Set([...(ownersOf.get(tag) ?? []), component]));
for (const spec of shipping) for (const item of Object.values(spec.platforms.web.items ?? {})) if (item.name && !owned.has(item.name)) own(item.name, spec.name);
const specNames = new Set(specs.map((spec) => spec.name));
for (const wrapper of wrappers.values()) {
  if (!ownersOf.has(wrapper.tag) && specNames.has(wrapper.dir)) own(wrapper.tag, wrapper.dir);
  if (!ownersOf.has(wrapper.tag)) throw new Error(`<${wrapper.tag}> (${wrapper.name}) is no component's element: name it in its component's spec (platforms.web.items)`);
}
const builtFrom = new Map(specs.map((spec) => [spec.name, spec.builtFrom ?? []]));

// Every shipped system's manifest, and each entry they name with the components it holds.
const generated = path.join(ROOT, 'tokens/generated');
const manifests = fs
  .readdirSync(generated)
  .filter((id) => fs.existsSync(path.join(generated, id, 'components.json')))
  .sort()
  .map((id) => readJson(path.join(generated, id, 'components.json')));
if (!manifests.length) throw new Error('no components manifest in tokens/generated/: run packages/tokens-build/src/components-catalog.js first');
const entries = new Map();
for (const manifest of manifests) {
  for (const component of manifest.components) {
    if (!component.react) continue;
    if (!wrappers.has(component.react.name)) throw new Error(`tokens/generated/${manifest.system}/components.json names ${component.react.name}, and src/generated/components.ts exports no such wrapper`);
    const { import: specifier } = component.react;
    if (specifier !== REACT && !specifier.startsWith(`${REACT}/`)) throw new Error(`tokens/generated/${manifest.system}/components.json: ${component.name} is imported from "${specifier}", outside ${REACT}`);
    if (specifier === ALL) throw new Error(`tokens/generated/${manifest.system}/components.json: a shipped system's ${component.name} is imported from ${ALL}, the entry of every wrapper`);
    if (!entries.has(specifier)) entries.set(specifier, { specifier, systems: new Set(), components: new Map() });
    const entry = entries.get(specifier);
    entry.systems.add(manifest.system);
    // The values left out in this entry: those every system that has the component in it leaves out.
    const out = new Set(manifest.omittedVariants[component.name] ?? []);
    const before = entry.components.get(component.name);
    entry.components.set(component.name, { ...component, out: before ? new Set([...before.out].filter((value) => out.has(value))) : out, systems: new Set([...(before?.systems ?? []), manifest.system]) });
  }
}

const fileOf = (specifier) => (specifier === REACT ? 'index' : specifier.slice(REACT.length + 1));
const subpath = (specifier) => (specifier === REACT ? '.' : `.${specifier.slice(REACT.length)}`);
const HEADER = ['// GENERATED FILE — DO NOT EDIT.', '// Source: tokens/generated/<id>/components.json, the components manifests. Regenerate with `pnpm generate`.'];
const quoted = (values) => [...values].map((value) => `'${value}'`).join(' | ');
const docLines = (doc) => doc.split('\n').slice(1, -1);
const listed = new Map(manifests.flatMap((manifest) => manifest.components.map((component) => [component.name, component])));

/** The wrappers of an entry's components and of the elements they draw among their children, by name. */
function wrappersOf(components) {
  return [...wrappers.values()].filter((wrapper) => [...ownersOf.get(wrapper.tag)].some((owner) => components.has(owner)));
}

/** What a product usually writes instead of an advanced component: the components of the listing that are built from it. */
function builtOn(name) {
  return [...listed.values()].filter((component) => component.listing === 'default' && component.react && builtFrom.get(component.name)?.includes(name)).map((component) => component.react.name);
}

function entryModule(entry) {
  const { specifier, components } = entry;
  const systems = [...entry.systems].sort();
  const advanced = [...components.values()].every((component) => component.listing === 'advanced');
  const lines = [
    ...HEADER,
    advanced
      ? `// ${specifier}: the components listed as advanced — building blocks of the others — in every system that has them (${systems.join(', ')}).`
      : `// ${specifier}: the components the "${systems.join('", "')}" system ships, and nothing it leaves out.`,
  ];
  const plain = [];
  const renamed = [];
  for (const wrapper of wrappersOf(components)) {
    const component = [...components.values()].find((each) => each.web?.tag === wrapper.tag);
    const out = component?.out ?? new Set();
    const instead = component?.listing === 'advanced' ? builtOn(component.name) : [];
    if (!out.size && !instead.length) {
      plain.push(`export { ${[wrapper.name, ...(wrapper.marks ? [`type ${wrapper.marks}`] : [])].join(', ')} } from '../../generated/wrappers/${wrapper.file}.js';`);
      continue;
    }
    // A wrapper with a type or a doc comment of this entry's own: the same component, under its name.
    const local = `${wrapper.name}Wrapper`;
    const note = [
      ...(instead.length ? [' *', ` * A building block: a product usually writes ${instead.length > 1 ? 'one of the components built from it' : 'the component built from it'} instead — ${instead.map((name) => `\`${name}\``).join(', ')}.`] : []),
      ...(out.size ? [' *', ` * \`variant\` takes none of ${[...out].map((value) => `\`${value}\``).join(', ')}: ${systems.length > 1 ? 'these systems leave them' : `the "${systems[0]}" system leaves ${out.size > 1 ? 'them' : 'it'}`} out.`] : []),
    ];
    renamed.push(
      {
        imports: `import { ${wrapper.name} as ${local}${wrapper.marks ? `, type ${wrapper.marks}` : ''} } from '../../generated/wrappers/${wrapper.file}.js';`,
        lines: [
          ...(wrapper.marks ? [`export type { ${wrapper.marks} };`] : []),
          '/**',
          ...docLines(wrapper.doc),
          ...note,
          ' */',
          out.size ? `export const ${wrapper.name}: Narrowed<typeof ${local}, 'variant', ${quoted(out)}> = ${local} as Narrowed<typeof ${local}, 'variant', ${quoted(out)}>;` : `export const ${wrapper.name}: typeof ${local} = ${local};`,
        ],
      },
    );
  }
  return [
    ...lines,
    ...(renamed.some((each) => each.lines.at(-1).includes('Narrowed<')) ? ["import type { Narrowed } from '../../narrowed.js';"] : []),
    ...renamed.map((each) => each.imports),
    '',
    "export * from '../../common.js';",
    ...plain,
    ...renamed.flatMap((each) => ['', ...each.lines]),
    '',
  ].join('\n');
}

const files = new Map();
for (const entry of [...entries.values()].sort((a, b) => a.specifier.localeCompare(b.specifier))) files.set(`${fileOf(entry.specifier)}.ts`, entryModule(entry));
if (files.has('all.ts')) throw new Error(`a system's entry is named "all", which is ${ALL}, the entry of every wrapper`);
files.set('all.ts', [...HEADER, `// ${ALL}: every wrapper, whichever system ships its component.`, "export * from '../../common.js';", "export * from '../../generated/components.js';", ''].join('\n'));

// The package's `exports` name each entry, and nothing else.
const expected = Object.fromEntries(
  [...entries.keys(), ALL]
    .sort((a, b) => (a === REACT ? -1 : b === REACT ? 1 : a.localeCompare(b)))
    .map((specifier) => [subpath(specifier), { types: `./dist/entries/generated/${fileOf(specifier)}.d.ts`, default: `./dist/entries/generated/${fileOf(specifier)}.js` }]),
);
if (JSON.stringify(pkg.exports) !== JSON.stringify(expected)) {
  throw new Error(`packages/react/package.json "exports" must name each entry the components manifests name, in this order:\n"exports": ${JSON.stringify(expected, null, 2)}`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(OUT)) if (!files.has(file)) fs.rmSync(path.join(OUT, file));
for (const [file, text] of files) if (!fs.existsSync(path.join(OUT, file)) || fs.readFileSync(path.join(OUT, file), 'utf8') !== text) fs.writeFileSync(path.join(OUT, file), text);
console.log(`✔ react: ${[...files.keys()].map((file) => `src/entries/generated/${file}`).join(', ')}`);

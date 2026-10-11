// What Vite gives a module of `src/lib/` when Astro builds the site, given to Node for a test (registered by
// `module.register` from the test that needs it; nothing here runs in the site):
//
// - TypeScript: a `.ts` module is compiled one file at a time by the app's own TypeScript (types go, nothing is
//   checked — `astro check` does that), and a relative import without an extension finds its `.ts` file;
// - `import x from './file.json'`: the file's value as the default export;
// - `import x from './picture.png?inline'`: the file as a `data:` address;
// - `import.meta.glob('<pattern>', { eager: true, import: 'default' })` over JSON files: the object of path → value.
//
// Anything else a module asks of Vite is not known here and fails the import with a sentence that says so.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const INLINE = /\?inline$/;
const MEDIA = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const GLOB = /import\.meta\.glob(?:<[^>]*>)?\(\s*'([^']+)'\s*,\s*\{\s*eager:\s*true\s*,\s*import:\s*'default'\s*\}\s*\)/g;

export async function resolve(specifier, context, nextResolve) {
  const fromTs = context.parentURL?.endsWith('.ts');
  if (fromTs && INLINE.test(specifier)) return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  if (fromTs && /^\.{1,2}\//.test(specifier) && !path.extname(specifier)) {
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (fs.existsSync(url)) return { url: url.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

/** `import.meta.glob`, eager, default import, over JSON: the files the pattern names beside `file`. */
function glob(pattern, file) {
  const directory = path.resolve(path.dirname(file), path.dirname(pattern));
  const name = path.basename(pattern);
  if (path.dirname(pattern).includes('*') || !name.endsWith('.json')) throw new Error(`${file}: import.meta.glob('${pattern}') is a form this test's shim does not know (test/vite-shim.mjs).`);
  const matches = new RegExp(`^${name.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  const entries = fs.readdirSync(directory).filter((entry) => matches.test(entry)).sort();
  return `({${entries.map((entry) => `${JSON.stringify(`${path.dirname(pattern)}/${entry}`)}: ${fs.readFileSync(path.join(directory, entry), 'utf8')}`).join(',')}})`;
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) return nextLoad(url, context);
  const file = fileURLToPath(url.replace(INLINE, ''));
  if (INLINE.test(url)) {
    const media = MEDIA[path.extname(file)];
    if (!media) throw new Error(`${file}?inline: a kind of file this test's shim does not know (test/vite-shim.mjs).`);
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(`data:${media};base64,${fs.readFileSync(file).toString('base64')}`)};` };
  }
  if (file.endsWith('.json') && context.importAttributes?.type !== 'json') return { format: 'module', shortCircuit: true, source: `export default ${fs.readFileSync(file, 'utf8')};` };
  if (file.endsWith('.ts')) {
    const written = fs.readFileSync(file, 'utf8');
    const source = written.replace(GLOB, (_, pattern) => glob(pattern, file));
    if (/import\.meta\.(glob|env)\b/.test(written.replace(GLOB, ''))) throw new Error(`${file}: asks Vite for something this test's shim does not give (test/vite-shim.mjs).`);
    const { outputText } = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false } });
    return { format: 'module', shortCircuit: true, source: outputText };
  }
  return nextLoad(url, context);
}

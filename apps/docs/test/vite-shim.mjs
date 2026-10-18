// What Vite gives a module of `src/lib/` when Astro builds the site, given to Node for a test (registered by
// `module.register` from the test that needs it; nothing here runs in the site):
//
// - TypeScript: a `.ts` module is compiled one file at a time by the app's own TypeScript (types go, nothing is
//   checked — `astro check` does that), and a relative import without an extension finds its `.ts` file;
// - `import x from './file.json'`: the file's value as the default export;
// - `import x from './picture.png?inline'`: the file as a `data:` address;
// - `import x from './mark.svg?raw'`: the file's text;
// - `import.meta.glob('<pattern>', { eager: true, import: 'default' })` over JSON files: the object of path → value
//   (a `*` in a file's or a folder's name).
//
// Anything else a module asks of Vite is not known here and fails the import with a sentence that says so.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const INLINE = /\?inline$/;
const RAW = /\?raw$/;
const MEDIA = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const GLOB = /import\.meta\.glob(?:<[^>]*>)?\(\s*'([^']+)'\s*,\s*\{\s*eager:\s*true\s*,\s*import:\s*'default'\s*\}\s*\)/g;

export async function resolve(specifier, context, nextResolve) {
  const fromTs = context.parentURL?.endsWith('.ts');
  if (fromTs && (INLINE.test(specifier) || RAW.test(specifier))) return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  if (fromTs && /^\.{1,2}\//.test(specifier) && !path.extname(specifier)) {
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (fs.existsSync(url)) return { url: url.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

/**
 * `import.meta.glob`, eager, default import, over JSON: the files the pattern names beside `file`. A `*` stands for
 * any part of one name, the file's or a folder's (a folder of each system, then its `components.json`); `**` and
 * braces are not known here.
 */
function glob(pattern, file) {
  const name = path.basename(pattern);
  if (pattern.includes('**') || /[{}]/.test(pattern) || !name.endsWith('.json')) throw new Error(`${file}: import.meta.glob('${pattern}') is a form this test's shim does not know (test/vite-shim.mjs).`);
  const like = (part) => new RegExp(`^${part.split('*').map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  // Each name of the pattern in turn: a name without `*` is taken as written, one with it is every entry it matches.
  let found = [''];
  for (const part of pattern.split('/')) {
    found = found.flatMap((at) => {
      if (!part.includes('*')) return [at ? `${at}/${part}` : part];
      const directory = path.resolve(path.dirname(file), at);
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
      return fs.readdirSync(directory).filter((entry) => like(part).test(entry)).sort().map((entry) => `${at}/${entry}`);
    });
  }
  const files = found.filter((rel) => fs.existsSync(path.resolve(path.dirname(file), rel)) && fs.statSync(path.resolve(path.dirname(file), rel)).isFile());
  return `({${files.map((rel) => `${JSON.stringify(rel)}: ${fs.readFileSync(path.resolve(path.dirname(file), rel), 'utf8')}`).join(',')}})`;
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) return nextLoad(url, context);
  const file = fileURLToPath(url.replace(INLINE, '').replace(RAW, ''));
  if (RAW.test(url)) return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(fs.readFileSync(file, 'utf8'))};` };
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

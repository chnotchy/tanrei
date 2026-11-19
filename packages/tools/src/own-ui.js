// The project's own interfaces are drawn by the default system, so they use only the components it ships, as a product
// of it does. A component the default system does not have — a layer left it out (its `components.omit`), or it lives
// in a layer the default system does not descend from — is never registered for them: Theme Studio imports
// `@tanrei/web`, which registers only the default system's components, and the documentation site defines one only
// where it shows a system that has it (apps/docs/src/lib/omitted-elements.ts).
//
// This module works the default system out from its layers, as `tanrei audit` does (nothing generated is read, so a
// component the system file leaves out counts the moment it is left out), and reads a source with the check `tanrei
// audit` runs (tokens-build/src/components-audit.js): every import that would register a component the default system
// does not have, every element of one, and every static value of a `variant` it leaves out. Read by
// apps/docs/test/own-ui.test.mjs and packages/studio/test/own-ui.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { heldComponents, layerChain, listSystems, shippedSystems } from '../../tokens-build/src/bundle.js';
import { AUDITED_EXTENSIONS, auditContext, auditText, textKind } from '../../tokens-build/src/components-audit.js';
import { componentsManifest, readComponentCatalog } from '../../tokens-build/src/components-manifest.js';
import { CONFIG, REPO_ROOT } from '../../tokens-build/src/model.js';
import { loadSystem } from '../../tokens-build/src/scheme.js';

/** The default system's audit context, and the components it does not have (the manifest's `omitted`). */
export function defaultSystemContext(root = REPO_ROOT) {
  const catalog = readComponentCatalog(root);
  if (!catalog) throw new Error('the component catalog is missing: run `pnpm generate`');
  const read = (id) => loadSystem(root, id);
  const held = heldComponents(listSystems(root), read);
  const ids = shippedSystems(root);
  const shipped = new Map(ids.map((id) => [id, componentsManifest(layerChain(id, read), catalog, held, ids)]));
  const manifest = shipped.get(CONFIG.namespace);
  return { context: auditContext(catalog, manifest, shipped), omitted: manifest.omitted, shipped };
}

/** Elements the way Theme Studio builds them: from the prefix in `tanrei.config.json` (`${tagPrefix}-name`), or by name through its `el('name')` and `tag('name')`. */
function prefixedTags(text, names) {
  const findings = [];
  const pattern = new RegExp(`(?:tagPrefix\\}-|\\b(?:el|tag)\\(\\s*['"\`])(${names.map((name) => name.replace(/[-]/g, '\\-')).join('|')})(?![\\w-])`, 'g');
  for (const match of text.matchAll(pattern)) {
    const offset = match.index + match[0].length - match[1].length;
    const before = text.slice(0, offset);
    const line = before.split('\n').length;
    findings.push({ line, column: offset - before.lastIndexOf('\n'), kind: 'element', found: match[1], component: match[1] });
  }
  return findings;
}

/**
 * Every element (and stylesheet selector) of a component the default system does not have, in one text: the audit's
 * findings of kind element or selector that name such a component, and the elements built from the prefix.
 * @param {ReturnType<typeof defaultSystemContext>} system
 * @param {string} text
 * @param {{ file: string, kind?: string }} options
 */
export function omittedElements(system, text, { file, kind = textKind(file) }) {
  const names = system.omitted.map((entry) => entry.name);
  const items = new Map(); // the elements a component draws among its children, by the plain name of each
  for (const component of system.context.catalog.components) {
    if (!names.includes(component.name)) continue;
    for (const tag of component.web?.items ?? []) items.set(tag.slice(`${CONFIG.web.tagPrefix}-`.length), component.name);
  }
  const fromAudit = auditText(system.context, text, { file, kind }).filter((finding) => ['element', 'selector'].includes(finding.kind) && names.includes(finding.component));
  const built = prefixedTags(text, [...names, ...items.keys()]).map((finding) => ({ ...finding, component: items.get(finding.component) ?? finding.component }));
  const seen = new Set(fromAudit.map((finding) => `${finding.line}:${finding.column}`));
  return [...fromAudit, ...built.filter((finding) => !seen.has(`${finding.line}:${finding.column}`))].sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * Every static value of a component's `variant` the default system leaves out (its manifest's `omittedVariants`: the
 * text field's `outlined`), which a product of it still draws but a debug build reports: the audit's findings of kind
 * variant that say so, and the props of an element built by name or from the prefix (`el('text-field', { variant:
 * 'outlined' })`, `h('tanrei-select', { variant: 'filled' })`).
 * @param {ReturnType<typeof defaultSystemContext>} system
 */
export function omittedVariants(system, text, { file, kind = textKind(file) }) {
  const leftOut = system.context.manifest.omittedVariants;
  const prefix = `${CONFIG.web.tagPrefix}-`;
  const fromAudit = auditText(system.context, text, { file, kind }).filter((finding) => finding.kind === 'variant' && (leftOut[finding.component] ?? []).includes(/variant="([^"]*)"/.exec(finding.found)?.[1]));
  const built = [];
  const call = new RegExp(`(?:\\b(?:el|tag)\\(\\s*['"\`]([a-z][\\w-]*)['"\`]|\\bh\\(\\s*(?:['"\`]${prefix}([a-z][\\w-]*)['"\`]|\`\\$\\{[\\w.]*tagPrefix\\}-([a-z][\\w-]*)\`(?:\\s+as\\s+'[^']*')?))\\s*,\\s*\\{([^{}]*)\\}`, 'g');
  for (const match of text.matchAll(call)) {
    const component = match[1] ?? match[2] ?? match[3];
    const value = /\bvariant\s*:\s*['"`]([\w-]+)['"`]/.exec(match[4]);
    if (!value || !(leftOut[component] ?? []).includes(value[1])) continue;
    const offset = match.index + match[0].indexOf(value[0]);
    const before = text.slice(0, offset);
    built.push({ line: before.split('\n').length, column: offset - before.lastIndexOf('\n'), kind: 'variant', found: `variant: '${value[1]}'`, component });
  }
  return [...fromAudit, ...built].sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * Every import that does not fit the default system: an entry of another system or of every component
 * (`@tanrei/web/all`), a module that registers only components it does not have, a React wrapper of one.
 * @param {ReturnType<typeof defaultSystemContext>} system
 */
export function entryFindings(system, text, { file, kind = textKind(file) }) {
  return auditText(system.context, text, { file, kind }).filter((finding) => finding.kind === 'import');
}

const SKIP = new Set(['node_modules', 'dist', 'dist-app', '.astro', 'test', 'test-results', 'coverage']);
const READ = new RegExp(`\\.(?:${AUDITED_EXTENSIONS.join('|')})$`, 'i');

/** Every file under `dir` the check reads (relative paths, with `/`): sources and pages, without tests, builds and hidden directories. */
export function ownFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) ownFiles(full, base, out);
    else if (entry.isFile() && READ.test(entry.name)) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

/** A finding as a line of a failure: the file, the line and column, what was found and what the system uses instead. */
export function describe(system, file, finding) {
  if (finding.kind === 'import') return `${file}:${finding.line}:${finding.column} ${finding.found}: ${finding.problem}`;
  if (finding.kind === 'variant') {
    const shipped = system.context.manifest.components.find((each) => each.name === finding.component)?.variants ?? [];
    return `${file}:${finding.line}:${finding.column} ${finding.found} of ${finding.component}: "${CONFIG.namespace}" leaves it out; use ${shipped.join(', ') || 'what it ships'}`;
  }
  const entry = system.omitted.find((each) => each.name === finding.component);
  return `${file}:${finding.line}:${finding.column} ${finding.found}: "${CONFIG.namespace}" does not have ${finding.component}; use ${entry?.insteadUse?.join(', ') ?? 'what it ships'}`;
}

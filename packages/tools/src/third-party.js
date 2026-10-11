// The licences of the third-party code and fonts a build copies INTO a published package (a bundle, a prebuilt app).
// MIT, BSD and Apache-2.0 require their copyright notice and licence text to travel with every copy, the SIL Open
// Font License requires the same of a font file, and Apache-2.0 also requires the NOTICE of a work that has one. A
// dependency npm installs beside the package brings its own; what a bundler inlines or an app copies does not — so
// every build that does either writes this file beside its output, from the packages the build actually read.
//
//   const text = thirdPartyLicenses(files)    files: the absolute paths a bundle was made from (esbuild's metafile
//                                             inputs, a Vite chunk's module ids, an emitted asset's original file)
//
// Files of the workspace (Tanrei's own packages) are skipped: the package's LICENSE and NOTICE cover them.
import fs from 'node:fs';
import path from 'node:path';

/** The file a build writes beside what it bundles, with this name, in the directory that holds the bundle. */
export const THIRD_PARTY_FILE = 'THIRD_PARTY_LICENSES.md';

const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i;
const NOTICE_FILE = /^notice(\.(md|txt))?$/i;

/** The installed package a file belongs to: the nearest package.json with a name, not crossing out of node_modules. */
function packageOf(file) {
  const parts = path.resolve(file).split(path.sep);
  const last = parts.lastIndexOf('node_modules');
  if (last < 0) return null;
  // node_modules/<name> or node_modules/@scope/<name>
  const root = parts.slice(0, last + (parts[last + 1]?.startsWith('@') ? 3 : 2)).join(path.sep);
  const manifest = path.join(root, 'package.json');
  if (!fs.existsSync(manifest)) return null;
  return root;
}

/**
 * The packages under node_modules that `files` were read from, one entry per name@version, sorted by name.
 * @returns {{ name: string, version: string, license: string, dir: string, licenseText: string, noticeText: string | null }[]}
 */
export function bundledPackages(files) {
  const found = new Map();
  for (const file of files) {
    if (!file || file.startsWith('\0')) continue;
    const dir = packageOf(file.replace(/\?.*$/, ''));
    if (!dir) continue;
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const key = `${manifest.name}@${manifest.version}`;
    if (found.has(key)) continue;
    const entries = fs.readdirSync(dir);
    const licenseFile = entries.find((entry) => LICENSE_FILE.test(entry));
    const noticeFile = entries.find((entry) => NOTICE_FILE.test(entry));
    const license = typeof manifest.license === 'string' ? manifest.license : (manifest.license?.type ?? '');
    if (!licenseFile) throw new Error(`third-party: ${key} (${license || 'no licence named'}) is bundled but carries no licence file to reproduce — make it an external dependency, or add its licence text here`);
    found.set(key, {
      name: manifest.name,
      version: manifest.version,
      license,
      dir,
      licenseText: fs.readFileSync(path.join(dir, licenseFile), 'utf8').trim(),
      noticeText: noticeFile ? fs.readFileSync(path.join(dir, noticeFile), 'utf8').trim() : null,
    });
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/**
 * The text of THIRD_PARTY_LICENSES.md: what `files` bundle, each package's licence as it ships it, and its NOTICE.
 * @param {string[]} files
 * @param {{ what: string, notes?: Record<string, string> }} options  `what` — the bundle, in words; `notes` — a line
 *   to print under a package (by name), for what its licence file alone does not say.
 */
export function thirdPartyLicenses(files, { what, notes = {} }) {
  const packages = bundledPackages(files);
  const out = [
    '# Third-party licences',
    '',
    `${what} includes the following third-party software and fonts. Each is reproduced under the licence below, as`,
    'its own package ships it. Tanrei\'s own code is covered by LICENSE and NOTICE at the root of this package.',
  ];
  for (const pkg of packages) {
    out.push('', `## ${pkg.name} ${pkg.version}${pkg.license ? ` (${pkg.license})` : ''}`, '');
    if (notes[pkg.name]) out.push(notes[pkg.name], '');
    out.push('```', pkg.licenseText, '```');
    if (pkg.noticeText) out.push('', `NOTICE of ${pkg.name}:`, '', '```', pkg.noticeText, '```');
  }
  return { text: `${out.join('\n')}\n`, packages };
}

/** Write THIRD_PARTY_LICENSES.md into `dir` when `files` bundle anything third-party; returns the packages named. */
export function writeThirdPartyLicenses(dir, files, options) {
  const { text, packages } = thirdPartyLicenses(files, options);
  const out = path.join(dir, THIRD_PARTY_FILE);
  if (packages.length) fs.writeFileSync(out, text);
  else fs.rmSync(out, { force: true });
  return packages;
}

/**
 * A Vite / Rolldown plugin that writes THIRD_PARTY_LICENSES.md into the build's output: the packages of every module
 * in a chunk and of every asset (a font file a stylesheet names) copied from node_modules, plus `files`: what another
 * plugin inlines as text under a virtual module id, which the bundle cannot trace back to its package.
 */
export function thirdPartyLicensesPlugin({ files: extra = [], ...options }) {
  let root = process.cwd();
  return {
    name: 'tanrei-third-party-licenses',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_, bundle) {
      const files = [...extra];
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') files.push(...(item.moduleIds ?? Object.keys(item.modules ?? {})));
        // An asset's original file is relative to the build's root.
        else files.push(...(item.originalFileNames ?? []).map((file) => path.resolve(root, file)));
      }
      const { text, packages } = thirdPartyLicenses(files, options);
      if (packages.length) this.emitFile({ type: 'asset', fileName: THIRD_PARTY_FILE, source: text });
    },
  };
}

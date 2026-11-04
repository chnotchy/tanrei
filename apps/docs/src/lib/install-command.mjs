// The command that adds a package to a product, in each package manager a reader may use: what
// `components/InstallCommand.astro` draws as a set of tabs, one for each manager, sharing the reader's choice across
// the site (`<Tabs syncKey="package-manager">`).
//
// npm comes first: every Node installation has it, so it is the tab a reader who never chose sees. The others follow
// in the order of their age. Each is written as its own documentation writes it: npm's `install`, and the `add` of
// the other three; a development dependency with each one's own long flag.

/** The package managers, in the order their tabs stand. */
export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

const ADD = { npm: 'npm install', pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' };
const DEV = { npm: '--save-dev', pnpm: '--save-dev', yarn: '--dev', bun: '--dev' };

/**
 * The command that adds `packages` with `manager`.
 *
 * @param {string} manager One of `PACKAGE_MANAGERS`.
 * @param {string[]} packages The packages, by their published names.
 * @param {{ dev?: boolean }} [options] `dev`: as a development dependency.
 * @returns {string}
 */
export function installCommand(manager, packages, { dev = false } = {}) {
  if (!PACKAGE_MANAGERS.includes(manager)) throw new Error(`installCommand: no package manager "${manager}": the managers are ${PACKAGE_MANAGERS.join(', ')}`);
  if (packages.length === 0) throw new Error('installCommand: no package to install');
  return [ADD[manager], dev && DEV[manager], ...packages].filter(Boolean).join(' ');
}

/**
 * The published names of packages of the repository, from their names under the scope: `web` → `@tanrei/web`.
 *
 * @param {string} names Names under the scope, separated by white space (`react web`).
 * @param {string} scope The npm scope (tanrei.config.json, `packages.npmScope`).
 * @returns {string[]}
 */
export function publishedNames(names, scope) {
  const list = names.split(/\s+/).filter(Boolean);
  for (const name of list) if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`InstallCommand: "${name}" is not a package's name under the scope (write \`web\`, not \`${scope}/web\`)`);
  return list.map((name) => `${scope}/${name}`);
}

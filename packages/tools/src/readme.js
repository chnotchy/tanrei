// The status paragraphs of the READMEs: what is released and what each platform has, written by `pnpm generate`
// between two markers in a hand-written README, from the same data as the status matrix and from tanrei.config.json.
// A README's prose is written as the project should read once it is released; what it says exists comes from here,
// so it never claims more than the repository holds.
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, PLATFORMS, REPO_ROOT } from './conventions.js';
import { release } from './release.js';

export const BEGIN = '<!-- tanrei:status -->';
export const END = '<!-- /tanrei:status -->';
const NOTE = '<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->';

/** The READMEs that carry a status block, and what each states: the whole repository's, one platform's, or a package's release alone. */
export const READMES = {
  'README.md': { kind: 'repository' },
  'packages/web/README.md': { kind: 'platform', platform: 'web' },
  'packages/cli/README.md': { kind: 'package' },
  'packages/mcp/README.md': { kind: 'package' },
  'packages/token-engine/README.md': { kind: 'package' },
};

/** What each status means, as CONTRIBUTING.md defines them, for the legend under a count. */
const MEANINGS = {
  stable: 'covered by semver',
  beta: 'API frozen pending feedback',
  alpha: 'implemented and tested; the API may change',
  lagging: 'an implementation exists but has not caught up with the current spec',
  planned: 'nothing shippable yet',
  deprecated: 'scheduled for removal',
};

/** The most finished status first. */
const ORDER = ['stable', 'beta', 'alpha', 'lagging', 'planned', 'deprecated'];

const scope = CONFIG.packages.npmScope;

/** What a product installs for each platform, from tanrei.config.json. */
const PACKAGES = {
  web: `\`${scope}/web\` · \`${scope}/react\` (npm)`,
  swiftui: `\`${CONFIG.packages.swiftPackage}\` (Swift Package Manager)`,
  compose: `\`${CONFIG.packages.mavenGroup}:${CONFIG.packages.mavenArtifactPrefix}\` (Maven)`,
  flutter: `\`${CONFIG.packages.pubPackage}\` (pub.dev)`,
  'react-native': `\`${scope}/react-native\` (npm)`,
};

const repositoryFile = (rel) => `https://github.com/${CONFIG.repository.public}/blob/main/${rel}`;

/** "7 alpha · 83 lagging": a platform's components by status, the most finished first, none of a count of 0. */
export function counts(totals) {
  return ORDER.filter((s) => totals[s]).map((s) => `${totals[s]} ${s}`).join(' · ');
}

const pausedPlatforms = () => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages/tools/paused-platforms.json'), 'utf8')).paused;

/**
 * The release line: empty for a release; for a prerelease, what to install until the release, and that a 0.x prerelease keeps
 * no backward compatibility (the rule while the versions are 0.x prereleases; nothing is said here of later versions).
 */
function releaseLine(pkg, { version, prerelease, tag, release: next }) {
  if (!prerelease) return [];
  return [`> **Prerelease.** \`${version}\` is published under the npm dist-tag \`${tag}\`: until \`${next}\`, install \`${pkg}@${tag}\`. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no deprecation period first, and its changeset says what broke.`, ''];
}

/** "A, B and C". */
const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]);

function legend(statuses) {
  return `*${statuses.map((s) => `${s}*: ${MEANINGS[s]}`).join(' · *')}.`;
}

/**
 * The block a README carries, without its markers. `status` is the status matrix's data (`buildStatus()`), `paused`
 * the platforms whose CI is paused, `pkg` the README's own package name.
 */
export function block(target, { status, paused, pkg, version = CONFIG.version }) {
  const r = release(version);
  const matrix = target.kind === 'repository' ? 'docs/status/STATUS.md' : repositoryFile('docs/status/STATUS.md');
  const lines = [NOTE];
  if (target.kind === 'repository') {
    lines.push(...releaseLine(`${scope}/web`, r));
    lines.push('| Platform | Package | Components |', '|---|---|---|');
    for (const p of status.platforms) lines.push(`| ${PLATFORMS[p].label}${paused.includes(p) ? ' (paused)' : ''} | ${PACKAGES[p]} | ${counts(status.totals[p])} |`);
    const shown = ORDER.filter((s) => status.platforms.some((p) => status.totals[p][s]));
    lines.push('', `${legend(shown)} The [component status matrix](${matrix}) has every component on every platform; it is computed from the repository and cannot claim more than is there.`);
    const held = status.platforms.filter((p) => paused.includes(p)).map((p) => PLATFORMS[p].label);
    if (held.length) lines.push('', `**Paused:** ${list(held)} — not built by CI and not published until ${held.length > 1 ? 'each catches' : 'it catches'} up with the specs.`);
  } else if (target.kind === 'platform') {
    lines.push(...releaseLine(pkg, r));
    const totals = status.totals[target.platform];
    const shown = ORDER.filter((s) => totals[s]);
    lines.push(`**Components:** ${counts(totals)} (${legend(shown).slice(0, -1)}). The [component status matrix](${matrix}) has each one, computed from the repository.`);
  } else {
    lines.push(...releaseLine(pkg, r));
  }
  while (lines.at(-1) === '') lines.pop();
  return lines.join('\n');
}

/** `text` with the block between its markers replaced by `content`. A README without both markers is an error. */
export function splice(text, content, rel = 'README') {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start < 0 || end < start) throw new Error(`${rel}: no status block (${BEGIN} … ${END}) — the generator writes what exists there`);
  // A blank line before the end marker: the block's last line is never read as continuing into it.
  return `${text.slice(0, start + BEGIN.length)}\n${content}\n\n${text.slice(end)}`;
}

/** Every README with a status block, as `pnpm generate` writes it: path → text. */
export function readmeFiles(status) {
  const paused = pausedPlatforms();
  return Object.fromEntries(
    Object.entries(READMES).map(([rel, target]) => {
      const dir = path.dirname(rel);
      const pkg = dir === '.' ? null : JSON.parse(fs.readFileSync(path.join(REPO_ROOT, dir, 'package.json'), 'utf8')).name;
      const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      return [rel, splice(text, block(target, { status, paused, pkg }), rel)];
    }),
  );
}

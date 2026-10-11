#!/usr/bin/env node
// A pull request that changes a released package carries a changeset (AGENTS.md: every user-visible change needs one).
// Released: every platform package (tanrei.config.json `platforms`; the native ones ship to SwiftPM, Maven Central and
// pub.dev though npm calls them private) and every workspace package whose package.json is not `private`. A change
// only to a package's tests or baselines needs none. A change that releases nothing still says so:
// `pnpm changeset --empty`. Adding or editing any changeset file counts.
//
//   node scripts/ci/check-changeset.mjs <base> [<head>]   (CI passes the pull request's base commit)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [base, head = 'HEAD'] = process.argv.slice(2);
if (!base) {
  console.error('usage: node scripts/ci/check-changeset.mjs <base> [<head>]');
  process.exit(2);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'tanrei.config.json'), 'utf8'));

const released = new Set(config.platforms.map((p) => `packages/${p}/`));
for (const group of ['packages', 'apps']) {
  for (const dir of fs.readdirSync(path.join(root, group))) {
    const manifest = path.join(root, group, dir, 'package.json');
    if (fs.existsSync(manifest) && !JSON.parse(fs.readFileSync(manifest, 'utf8')).private) released.add(`${group}/${dir}/`);
  }
}

// Tests, fixtures of tests and recorded baselines are not part of what a package ships.
const NOT_SHIPPED = [/\/(test|tests|Tests|__tests__|__snapshots__|snapshots|goldens|androidTest)\//, /\.test\.[cm]?[jt]sx?$/];

const changed = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const touched = changed.filter((f) => [...released].some((dir) => f.startsWith(dir)) && !NOT_SHIPPED.some((re) => re.test(f)));
const changesets = changed.filter((f) => /^\.changeset\/[^/]+\.md$/.test(f) && f !== '.changeset/README.md');

if (touched.length === 0) {
  console.log('✔ no released package changed');
} else if (changesets.length > 0) {
  console.log(`✔ ${touched.length} file(s) of released packages changed, with ${changesets.join(', ')}`);
} else {
  const packages = [...new Set(touched.map((f) => f.split('/').slice(0, 2).join('/')))];
  console.error(`✖ ${packages.join(', ')} changed and no changeset was added or edited. Run \`pnpm changeset\` (or \`pnpm changeset --empty\` when the change releases nothing) and commit the file.`);
  process.exit(1);
}

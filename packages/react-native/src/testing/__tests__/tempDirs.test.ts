// A suite leaves nothing behind. This package needs no temporary directory at all:
// its fixture generator builds in memory (`buildProductSystem`), and its tests render in memory. So the guarantee is
// static — nothing here may make one — plus a check that running the generator leaves `os.tmpdir()` as it was.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACKAGE = path.resolve(__dirname, '../../..');
const CODE = ['src', 'scripts', 'example/src', 'example/__tests__', 'example/App.tsx', 'example/metro.config.js'];
const SELF = path.relative(PACKAGE, __filename);

function sources(entry: string): string[] {
  const full = path.join(PACKAGE, entry);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [entry];
  return fs.readdirSync(full).filter((name) => name !== 'node_modules').flatMap((name) => sources(path.join(entry, name)));
}

test('no code of this package makes a temporary directory', () => {
  const calls = CODE.flatMap(sources)
    .filter((file) => /\.(m?js|tsx?)$/.test(file) && file !== SELF)
    .flatMap((file) => fs.readFileSync(path.join(PACKAGE, file), 'utf8').split('\n').flatMap((line, i) => (/\bmkdtemp(Sync)?\s*\(|\btmpdir\s*\(/.test(line) ? [`${file}:${i + 1}`] : [])));
  expect(calls).toEqual([]);
});

test('the fixture generator leaves no directory behind', () => {
  // `tanrei-fixture-*` is what the generator made before it built in memory; no other package uses that name.
  const mine = () => fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('tanrei-fixture-')).sort();
  const before = mine();
  execFileSync(process.execPath, ['scripts/acme-fixture.mjs', '--check'], { cwd: PACKAGE, stdio: 'pipe' });
  expect(mine()).toEqual(before);
});

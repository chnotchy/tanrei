// The web package's dist parses as the edition its tsconfig targets (src/syntax.js): ES2022 passes, and each construct
// of a later edition is refused, with its file and place.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { REPO_ROOT } from '../src/conventions.js';
import { syntaxProblems, targetEdition } from '../src/syntax.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);

const dist = (files) => {
  const root = tempDir('syntax');
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
};

test('the edition is the web package tsconfig target, as a year', () => {
  assert.equal(targetEdition(path.join(REPO_ROOT, 'packages/web/tsconfig.json')), 2022);
  const root = dist({ 'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ESNext' } }) });
  assert.throws(() => targetEdition(path.join(root, 'tsconfig.json')), /by its year/);
});

test('what ES2022 writes parses: static blocks, private names and `in`, top-level await, a lookbehind, the d flag, a hashbang', () => {
  const root = dist({
    'components/a.js': 'export class A { static { this.styles = 1; } #p = 1; static has(o) { return #p in o; } }\nawait 0;\nexport const r = /(?<![\\w.])0/dg;\n',
    'links/node/cli.js': '#!/usr/bin/env node\nconsole.log(1);\n',
    'styles.css': 'not { javascript',
  });
  assert.deepEqual(syntaxProblems(root, 2022), { files: 2, problems: [] });
});

test('each construct of a later edition is refused, with the file and the place', () => {
  const later = {
    'v-flag.js': 'export const r = /[\\p{L}--[a-z]]/v;\n', // ES2024
    'duplicate-groups.js': 'export const r = /(?<y>a)|(?<y>b)/;\n', // ES2025
    'modifiers.js': 'export const r = /(?i:a)b/;\n', // ES2025
    'import-attributes.js': 'import data from "./data.json" with { type: "json" };\nexport default data;\n', // ES2025
    'nested/using.js': 'export function f(open) {\n  using handle = open();\n}\n', // ES2026
  };
  const { files, problems } = syntaxProblems(dist(later), 2022);
  assert.equal(files, 5);
  assert.deepEqual(
    problems.map((problem) => problem.split(' ')[0]),
    ['duplicate-groups.js:1:19', 'import-attributes.js:1:32', 'modifiers.js:1:19', 'nested/using.js:2:9', 'v-flag.js:1:19'],
  );
  for (const problem of problems) assert.match(problem, /: not ES2022 syntax$/);
  // The same files are what a later edition writes, and parse as it.
  assert.deepEqual(syntaxProblems(dist(later), 2026).problems, []);
});

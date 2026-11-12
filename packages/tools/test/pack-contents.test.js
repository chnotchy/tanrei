// What a published package's tarball should not hold (src/pack-contents.js), on file lists made up here; each published
// package's own tarball is checked by its tests, after its build (web, react, cli, mcp, token-engine).
import assert from 'node:assert/strict';
import test from 'node:test';
import { packFindings } from '../src/pack-contents.js';

/** A package in memory: path → text. */
const findings = (files) => packFindings(Object.keys(files), (file) => files[file]);
const map = (fields) => JSON.stringify({ version: 3, names: [], mappings: 'AAAA', ...fields });

test('code, declarations, data and a self-contained source map pass', () => {
  assert.deepEqual(
    findings({
      'package.json': '{}',
      'dist/index.js': 'export {};\n',
      'dist/index.d.ts': 'export {};\n',
      'dist/index.d.mts': 'export {};\n',
      'dist/vocabulary/specs/button.spec.json': '{}',
      'dist/bundle.js': 'x();\n//# sourceMappingURL=bundle.js.map',
      'dist/bundle.js.map': map({ sources: ['../src/a.ts', '../../node_modules/lit/index.js'], sourcesContent: ['a', 'b'] }),
      'dist/packed.js': 'x();\n//# sourceMappingURL=packed.js.map',
      'dist/packed.js.map': map({ sources: ['packed.src.js'] }),
      'dist/packed.src.js': 'x();\n',
      'dist/inline.js': 'x();\n//# sourceMappingURL=data:application/json;base64,e30=',
    }),
    [],
  );
});

test("the repository's working files are found", () => {
  assert.deepEqual(
    findings({
      'test/a.test.js': '',
      'dist/fixtures/one.json': '{}',
      'dist/button/__snapshots__/a.snap': '',
      'dist/button.spec.ts': '',
      'src/button.ts': '',
      'dist/button.tsx': '',
      'tsconfig.tsbuildinfo': '{}',
    }),
    [
      'test/a.test.js: a test, fixture or snapshot directory',
      'dist/fixtures/one.json: a test, fixture or snapshot directory',
      'dist/button/__snapshots__/a.snap: a test, fixture or snapshot directory',
      'dist/button.spec.ts: a test file',
      'src/button.ts: a TypeScript source (only declarations ship)',
      'dist/button.tsx: a TypeScript source (only declarations ship)',
      "tsconfig.tsbuildinfo: the compiler's build info",
    ],
  );
});

test('a source map that leads outside the tarball is found, and a comment naming a map that is not packed', () => {
  assert.deepEqual(
    findings({
      'dist/components/button/button.js': 'x();\n//# sourceMappingURL=button.js.map',
      'dist/components/button/button.js.map': map({ sourceRoot: '', sources: ['../../../src/components/button/button.ts'] }),
      'dist/half.js.map': map({ sources: ['../src/a.ts', '../src/b.ts'], sourcesContent: ['a', null] }),
      'dist/orphan.js': 'x();\n//# sourceMappingURL=orphan.js.map\n',
    }),
    [
      'dist/components/button/button.js.map: a source map naming 1 source(s) neither packed nor in sourcesContent, e.g. ../../../src/components/button/button.ts',
      'dist/half.js.map: a source map naming 1 source(s) neither packed nor in sourcesContent, e.g. ../src/b.ts',
      'dist/orphan.js: names the source map orphan.js.map, which is not packed',
    ],
  );
});

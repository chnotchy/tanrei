// The source scans, proven on throwaway trees: each rule must fail when it is broken.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { checkRetiredTerms, checkWorkMarkers } from '../src/scans.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

function sandbox(files = {}) {
  const root = tempDir('scans');
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

test('the repository’s own markers and names are clean', () => {
  assert.deepEqual(checkWorkMarkers(), []);
  assert.deepEqual(checkRetiredTerms(), []);
});

test('a work marker says what is missing; one that carries a tag instead is refused', () => {
  const marked = (line) => checkWorkMarkers(sandbox({ 'packages/x/src/a.ts': `const a = 1;\n${line}\n` }));
  assert.deepEqual(marked('// TODO: build the drag handle'), []);
  assert.deepEqual(marked('// TODO build the drag handle'), []);
  // Kotlin's TODO("…") is a function call that says what is missing.
  assert.deepEqual(marked('TODO("build the drag handle")'), []);
  assert.match(marked('// FIXME(sample-entry): later')[0], /a\.ts:2: FIXME\(sample-entry\) — write what is missing instead of a tag/);
  assert.deepEqual(checkWorkMarkers(sandbox({ 'notes.md': 'TODO(sample-entry) in prose is not source' })), []);
});

test('a retired name is caught outside its allow list — NOTICE crediting the former typeface is how this rule was born', () => {
  const terms = JSON.stringify({ terms: [{ term: 'Geist', since: '2026-09-21', reason: 'the default typefaces changed', replacedBy: 'Inter', allow: ['.changeset/', 'CHANGELOG.md'] }] });
  const root = sandbox({ 'docs/governance/retired-terms.json': terms, NOTICE: 'Tanrei\n\nTypefaces: Geist Sans\n', '.changeset/fonts.md': 'were Geist', 'packages/web/CHANGELOG.md': 'Geist → Inter', 'src/a.ts': 'const geistless = 1;' });
  assert.deepEqual(checkRetiredTerms(root), ['NOTICE:3: "Geist" was retired on 2026-09-21 (the default typefaces changed) — now: Inter']);
});

test('a retired name that is the start of a longer, living name spares that name (notFollowedBy)', () => {
  const terms = JSON.stringify({ terms: [{ term: 'tanrei-fab', notFollowedBy: '-menu', since: '2026-09-27', reason: 'merged into the main action button', replacedBy: 'tanrei-main-action-button', allow: [] }] });
  const root = sandbox({ 'docs/governance/retired-terms.json': terms, 'src/a.ts': 'html`<tanrei-fab-menu></tanrei-fab-menu>`;\n', 'src/b.ts': 'html`<tanrei-fab></tanrei-fab>`;\n' });
  assert.deepEqual(checkRetiredTerms(root), ['src/b.ts:1: "tanrei-fab" was retired on 2026-09-27 (merged into the main action button) — now: tanrei-main-action-button']);
});

test('a retired name that is the end of a longer, living name spares that name (notPrecededBy)', () => {
  const terms = JSON.stringify({ terms: [{ term: 'icon-button', notPrecededBy: 'absorbs-', since: '2026-09-27', reason: 'Icon button is a form of Button', replacedBy: 'Button with an icon and no label', allow: [] }] });
  const root = sandbox({ 'docs/governance/retired-terms.json': terms, 'specs/a.json': '{ "note": "list-absorbs-icon-button" }\n', 'specs/b.json': '{ "component": "icon-button" }\n' });
  assert.deepEqual(checkRetiredTerms(root), ['specs/b.json:1: "icon-button" was retired on 2026-09-27 (Icon button is a form of Button) — now: Button with an icon and no label']);
});

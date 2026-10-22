// How the check behind `tanrei audit` and the MCP server's check_usage reads text: what is code, what is a comment,
// where a stylesheet is. The findings themselves, end to end, are tested where they are used (packages/cli,
// packages/mcp); here, against the default system's manifest, each way of writing the same thing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { auditContext, auditText, readText, textKind } from '../src/components-audit.js';
import { manifestFile, readComponentCatalog } from '../src/components-manifest.js';
import { CONFIG } from '../src/config.js';
import { shippedSystems } from '../src/bundle.js';
import { REPO_ROOT } from '../src/model.js';

const manifest = (id) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, manifestFile(id)), 'utf8'));
const shipped = new Map(shippedSystems(REPO_ROOT).map((id) => [id, manifest(id)]));
const context = auditContext(readComponentCatalog(REPO_ROOT), shipped.get(CONFIG.namespace), shipped);
const P = CONFIG.web.tagPrefix;
const W = `${CONFIG.packages.npmScope}/web`;
/** Where each finding is, as line:column, in a text read as `file` says. */
const found = (text, file = 'x.ts') => auditText(context, text, { file }).map((f) => `${f.line}:${f.column} ${f.kind}`);

test('the kind of text, by its extension', () => {
  assert.deepEqual(['a.css', 'a.scss', 'a.html', 'a.vue', 'a.svelte', 'a.astro', 'a.tsx', 'a.mjs', undefined].map(textKind), ['css', 'scss', 'html', 'html', 'html', 'html', 'script', 'script', 'script']);
});

test('script: comments are blanked, never a string, a template, a regular expression or a closing tag', () => {
  const text = [
    `const a = '// <${P}-fab-menu>'; // <${P}-fab-menu>`,
    `const b = \`/* \${'\`'} <${P}-fab-menu> */\`; /* <${P}-fab-menu> */`,
    `function c() { return /\\/*/.test(a) ? '<${P}-fab-menu>' : 0; }`,
    `const d = <p>see https://example.com <${P}-fab-menu></${P}-fab-menu></p>;`,
  ].join('\n');
  const { code } = readText(text, 'script');
  assert.equal(code.length, text.length, 'offsets stay the file’s own');
  assert.equal(code.split('\n').length, 4);
  // The tag in each string, template and JSX text is found; the one in each comment is not.
  assert.deepEqual(found(text), ['1:16 element', '2:23 element', '3:41 element', '4:39 element']);
});

test('markup comments are blanked in a page, a string and a template; a page’s script and frontmatter are script', () => {
  assert.deepEqual(found(`<!-- <${P}-fab-menu> -->\n<${P}-fab-menu></${P}-fab-menu>`, 'a.html'), ['2:2 element']);
  assert.deepEqual(found(`html\`<!-- <${P}-fab-menu> --><${P}-fab-menu>\``), ['1:33 element']);
  assert.deepEqual(found(`---\n// import '${W}/components/fab-menu';\nimport '${W}/components/fab-menu';\n---\n<div></div>`, 'a.astro'), ['3:9 import']);
  assert.deepEqual(found(`<script setup>\n/* <${P}-fab-menu> */\n</script>\n<template><${P}-fab-menu /></template>`, 'a.vue'), ['4:12 element']);
});

test('stylesheets: a type selector names an element; a class, a custom property, a part name or an attribute value does not', () => {
  const css = [
    `@media (width > 1px) { .${P}-fab-menu, [x="${P}-fab-menu"], :is(${P}-fab-menu) { --${P}-fab-menu-gap: 0; } }`,
    `${P}-button::part(${P}-fab-menu) { color: inherit; }`,
    `${P}-fab-menu-item:hover { color: inherit; }`,
  ].join('\n');
  assert.deepEqual(found(css, 'a.css'), ['1:69 selector', '3:1 selector']);
  assert.deepEqual(found(`// ${P}-fab-menu { }\na { b: url(//c.d/e); } ${P}-fab-menu { }`, 'a.scss'), ['2:24 selector'], 'a Sass line comment, not a protocol-relative URL');
  // In script: lit's css`` and a <style> element; a tag in a string elsewhere is an element.
  assert.deepEqual(found(`css\`${P}-fab-menu { }\`;\nconst s = <style>{\`${P}-fab-menu { }\`}</style>;`), ['1:5 selector', '2:20 selector']);
});

test('a static variant in every way markup writes one, and none that a template or a variable computes', () => {
  const text = [
    `<${P}-text-field variant="outlined"></${P}-text-field>`,
    `<${P}-text-field variant='filled'></${P}-text-field>`,
    `<${P}-text-field variant=outlined></${P}-text-field>`,
    `<${P}-text-field variant="\${v}" .variant=\${v} data-variant="outlined"></${P}-text-field>`,
  ].join('\n');
  assert.deepEqual(found(text, 'a.html'), ['1:20 variant', '2:20 variant', '3:20 variant']);
});

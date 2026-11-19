// Theme Studio is the project's own tool, drawn by the default system: it registers its interface's elements with
// `@tanrei/web`, the default system's entry, so a component the default system does not have — one its layer leaves
// out (`components.omit` in its system file) or one that lives in a layer it does not descend from — is never defined
// for it, as for a product of that system. Held here, from its sources (packages/tools/src/own-ui.js, the check
// `tanrei audit` runs), each failure at its file, line and column:
// - it imports no entry but that one: not `@tanrei/web/all`, another system's, or a module of such a component;
// - it writes no element of such a component either — in markup, in a string, built from the prefix
//   (`${tagPrefix}-name`, `el('name')`), or in a stylesheet's selector — which would be left undefined.
// The documentation site, which defines its elements on demand, is held to the same in apps/docs/test/own-ui.test.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultSystemContext, describe as say, entryFindings, omittedElements, ownFiles } from '../../tools/src/own-ui.js';

const studioDir = fileURLToPath(new URL('../', import.meta.url));
const system = defaultSystemContext();

const files = ownFiles(studioDir);
const text = (file) => fs.readFileSync(path.join(studioDir, file), 'utf8');

test('Studio registers its elements with the default system’s entry, and with no entry or module of another system', () => {
  assert.ok(files.some((file) => file.startsWith('src/ui/')) && files.some((file) => file.startsWith('app/')), 'the check reads the interface and the app');
  assert.match(text('src/index.ts'), /^import \* as components from '@tanrei\/web';$/m, 'the default system’s entry');
  const stray = files.flatMap((file) => entryFindings(system, text(file), { file }).map((finding) => say(system, `packages/studio/${file}`, finding)));
  assert.deepEqual(stray, []);
  const seen = entryFindings(system, `import '@tanrei/web/all';\nimport { FabMenu } from '@tanrei/react/m3-like';\n`, { file: 'src/any.ts' });
  assert.deepEqual(seen.map((finding) => finding.line), [1, 2], 'the check sees an entry of every component, and another system’s');
});

test('Studio writes no element of a component the default system does not have', () => {
  const stray = files.flatMap((file) => omittedElements(system, text(file), { file }).map((finding) => say(system, `packages/studio/${file}`, finding)));
  assert.deepEqual(stray, []);
});

test('the check sees each way Studio writes an element', () => {
  assert.ok(system.omitted.length > 0);
  for (const { name } of system.omitted) {
    const { tag, items = [] } = system.context.catalog.components.find((component) => component.name === name).web;
    const plain = (each) => each.slice(each.indexOf('-') + 1);
    const code = [
      `const a = h('${tag}', { size: 'small' });`,
      `const b = h(\`\${studio.tagPrefix}-${name}\` as 'div', {});`,
      `const c = el('${name}', {});`,
      ...items.map((item) => `const d = el('${plain(item)}', {});`),
      `const css = '.row > ${tag} { inline-size: 100%; }';`,
    ].join('\n');
    const lines = omittedElements(system, code, { file: 'src/ui/any.ts' }).map((finding) => `${finding.line} ${finding.component}`);
    for (let line = 1; line <= 3 + items.length; line++) assert.ok(lines.includes(`${line} ${name}`), `${name}: line ${line} of\n${code}\nseen: ${lines.join(', ')}`);
    const sheet = omittedElements(system, `.row > ${tag} { inline-size: 100%; }\n`, { file: 'src/studio.css' });
    assert.deepEqual(sheet.map((finding) => finding.kind), ['selector'], `${name}: a selector in a stylesheet`);
  }
});

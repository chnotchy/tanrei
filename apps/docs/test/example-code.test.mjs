// The code an example shows (src/lib/example-code.ts): what its stage held as the page was built, written again as a
// product writes it — in HTML, and in React with the React package's wrappers, whose names come from the web
// package's manifest as the React package's own generator reads them (`reactNames`, src/lib/element-modules.mjs).
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { htmlOf, reactOf, parse } = await import('../src/lib/example-code.ts');
const { reactNames } = await import('../src/lib/element-modules.mjs');

const repo = (file) => fileURLToPath(new URL(`../../../${file}`, import.meta.url));
const manifest = JSON.parse(fs.readFileSync(repo('packages/web/custom-elements.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(repo('tanrei.config.json'), 'utf8'));
const names = reactNames(manifest, config);

// As the build writes a page's example: no white space between tags, a boolean attribute as `="true"`, the search's
// mark on a glyph, the framework's scoping class.
const BUILT =
  '<tanrei-button variant="text" label="Search"><span slot="icon" data-pagefind-ignore>search</span></tanrei-button>' +
  '<tanrei-button variant="outlined" toggle="true" selected="true" label="Favorite" class="astro-abc123"><span slot="icon">favorite</span></tanrei-button>' +
  '<tanrei-text-field label="Name" readonly="true" aria-describedby="hint" style="inline-size: 20rem; --tanrei-x: 1px"></tanrei-text-field>' +
  '<p id="hint">Use {braces} &amp; &lt;angles&gt;</p>' +
  '<div class="docs-resize-handle" role="separator" data-resize-handle></div>';

describe('the code in HTML', () => {
  const html = htmlOf(BUILT);
  test('is the markup as an author writes it: a boolean attribute bare, nothing the site adds', () => {
    assert.match(html, /^<tanrei-button variant="text" label="Search"><span slot="icon">search<\/span><\/tanrei-button>$/m);
    assert.match(html, /<tanrei-button variant="outlined" toggle selected label="Favorite">/);
    assert.match(html, /<tanrei-text-field label="Name" readonly aria-describedby="hint" style="inline-size: 20rem; --tanrei-x: 1px"><\/tanrei-text-field>/);
    assert.doesNotMatch(html, /data-pagefind|astro-|data-resize-handle|docs-resize-handle/);
  });
  test('of a figure is what its canvas holds, without the frame’s overlay', () => {
    assert.equal(htmlOf('<div class="docs-example-canvas" style="--docs-example-block: 0px" data-example-canvas><tanrei-button variant="filled">Filled</tanrei-button><div class="docs-example-overlay" aria-hidden="true" data-example-overlay></div></div>'), '<tanrei-button variant="filled">Filled</tanrei-button>');
  });
  test('keeps text as text, escaped as markup needs', () => {
    assert.match(html, /<p id="hint">Use \{braces\} &amp; &lt;angles><\/p>/);
  });
  test('writes one element to a line, and an element that does not fit on one with its children each on their own', () => {
    const long = htmlOf(`<tanrei-menu>${['One', 'Two', 'Three', 'Four', 'Five'].map((label) => `<tanrei-menu-item label="${label} item"></tanrei-menu-item>`).join('')}</tanrei-menu>`);
    assert.deepEqual(long.split('\n'), ['<tanrei-menu>', ...['One', 'Two', 'Three', 'Four', 'Five'].map((label) => `  <tanrei-menu-item label="${label} item"></tanrei-menu-item>`), '</tanrei-menu>']);
  });
  test('keeps an attribute whose value `true` is a word of its own', () => {
    assert.equal(htmlOf('<div aria-hidden="true" data-open="true" draggable="true"></div>'), '<div aria-hidden="true" data-open="true" draggable="true"></div>');
  });
});

describe('the code in React', () => {
  const react = reactOf(BUILT, names);
  test('imports the wrappers it draws from the React package, by the names that package gives them', () => {
    assert.match(react, /^import \{ Button, TextField \} from '@tanrei\/react';$/m);
    assert.match(react, /export function Example\(\) \{\n {2}return \(\n {4}<>/);
  });
  test('writes each attribute as the prop of its property, and the platform’s attributes as React names them', () => {
    assert.match(react, /<Button variant="outlined" toggle selected label="Favorite">/);
    assert.match(react, /<TextField label="Name" readOnly aria-describedby="hint" style=\{\{ inlineSize: '20rem', '--tanrei-x': '1px' \}\} \/>/);
    assert.match(reactOf('<tanrei-button icon-position="trailing" class="wide">Next</tanrei-button>', names), /<Button iconPosition="trailing" className="wide">Next<\/Button>/);
  });
  test('writes text that JSX would read as code as a string', () => {
    assert.match(react, /<p id="hint">Use \{'\{'\}braces\{'\}'\} &amp; \{'<'\}angles\{'>'\}<\/p>/);
  });
  test('a number is a number, and an inline handler a function of the event', () => {
    const numbered = Object.entries(names.elements).flatMap(([tag, [, props]]) => Object.entries(props).filter(([, [, kind]]) => kind === 1).map(([attribute]) => [tag, attribute]));
    assert.ok(numbered.length > 0, 'some element takes a number');
    const [tag, attribute] = numbered[0];
    assert.match(reactOf(`<${tag} ${attribute}="3"></${tag}>`, names), new RegExp(`=\\{3\\} />`));
    assert.match(reactOf('<tanrei-button onclick="this.closest(\'figure\').hidden = true">Hide</tanrei-button>', names), /onClick=\{\(event\) => \{ event\.currentTarget\.closest\('figure'\)\.hidden = true \}\}/);
  });
  test('an attribute that turns off a property on by default is that property, false', () => {
    const turnsOff = Object.entries(names.elements).flatMap(([tag, [, props]]) => Object.entries(props).filter(([, [, kind]]) => kind === 2).map(([attribute, [property]]) => [tag, attribute, property]));
    assert.ok(turnsOff.some(([tag, attribute, property]) => tag === 'tanrei-card' && attribute === 'flush' && property === 'inset'), 'the card’s flush turns its inset off');
    assert.match(reactOf('<tanrei-card flush="true">Text</tanrei-card>', names), /<Card inset=\{false\}>Text<\/Card>/);
  });
});

describe('the React names', () => {
  test('are the React package’s: every wrapper it exports, from the module of the repository’s scope', () => {
    const exported = [...fs.readFileSync(repo('packages/react/src/generated/components.ts'), 'utf8').matchAll(/^export \{ (\w+)\b/gm)].map(([, name]) => name);
    assert.equal(names.module, `${config.packages.npmScope}/react`);
    assert.deepEqual(Object.values(names.elements).map(([name]) => name).sort(), [...exported].sort());
  });
  test('name every Tanrei element a page’s example draws', () => {
    const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
    const tags = new Set();
    for (const file of fs.readdirSync(docs, { recursive: true }).map(String).filter((file) => file.endsWith('.mdx'))) {
      const text = fs.readFileSync(docs + file, 'utf8');
      for (const [, body] of text.matchAll(/<Example\b[^>]*>([\s\S]*?)<\/Example>/g)) {
        const walk = (nodes) => {
          for (const node of nodes) {
            if (node.kind !== 'element') continue;
            if (node.tag.startsWith(`${config.web.tagPrefix}-`)) tags.add(node.tag);
            walk(node.children);
          }
        };
        walk(parse(body));
      }
    }
    assert.ok(tags.size > 40, `${tags.size} tags in the pages' examples: fewer than they draw`);
    assert.deepEqual([...tags].filter((tag) => !names.elements[tag]).sort(), []);
  });
});

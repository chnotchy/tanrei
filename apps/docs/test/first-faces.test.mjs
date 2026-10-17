// The font files a page's head preloads (src/lib/first-faces.mjs, src/components/frame/Head.astro): the first family
// of each stack that text on every page is set in, read from the tokens, each from the file the site registers the
// family's Latin letters from — so that text is first laid out in the family it stays in, and nothing under it moves
// when a file arrives.
//
//   pnpm --filter @tanrei/docs test:node      (it writes src/styles/fonts.generated.css first, as dev and build do)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { firstFamilies, latinFile } from '../src/lib/first-faces.mjs';

const read = (file) => fs.readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
const config = JSON.parse(read('../../tanrei.config.json'));
const typeface = JSON.parse(read(`../../design/tokens/${config.namespace}.light.tokens.json`))[config.namespace].ref.typeface;
const stacks = Object.fromEntries(Object.entries(typeface).filter(([, token]) => Array.isArray(token?.$value)).map(([name, token]) => [name, token.$value]));

describe('the families of a page’s first screen', () => {
  test('are the first family of the brand, plain and code stacks, once each', () => {
    assert.deepEqual(firstFamilies({ brand: ['A', 'B'], plain: ['A', 'C'], mono: ['M', 'A'], icon: ['Glyphs'] }), ['A', 'M']);
    assert.deepEqual(firstFamilies({ brand: ['Display'], plain: ['Text'], mono: ['Code'] }), ['Display', 'Text', 'Code']);
  });
  test('are refused where the tokens have no such stack', () => {
    assert.throws(() => firstFamilies({ brand: ['A'], plain: ['A'] }), /no "mono" font stack/);
    assert.throws(() => firstFamilies({ brand: [], plain: ['A'], mono: ['M'] }), /no "brand" font stack/);
  });
  test('a family’s Latin file is named as its package names it', () => {
    assert.equal(latinFile('Inter'), 'inter-latin-wght-normal.woff2');
    assert.equal(latinFile('Roboto Mono'), 'roboto-mono-latin-wght-normal.woff2');
  });
});

describe('what the head preloads', () => {
  const head = read('src/components/frame/Head.astro');
  // Written by `pnpm --filter @tanrei/docs fonts` (gitignored); `test:node` runs that step first.
  if (!fs.existsSync(fileURLToPath(new URL('../src/styles/fonts.generated.css', import.meta.url)))) {
    throw new Error('src/styles/fonts.generated.css is missing: run `pnpm --filter @tanrei/docs fonts` (test:node does it first)');
  }
  const faces = read('src/styles/fonts.generated.css');
  const families = firstFamilies(stacks);

  test('is a file for each family the tokens set text in, and no other', () => {
    assert.ok(families.length > 0);
    const listed = [...head.match(/const FILES: Record<string, string> = \{([^}]*)\};/)[1].matchAll(/(?:'([^']+)'|(\w+)): (\w+)/g)].map((entry) => [entry[1] ?? entry[2], entry[3]]);
    assert.deepEqual(listed.map(([family]) => family).sort(), [...families].sort());
    for (const [family, name] of listed) {
      // The import is the family's Latin file, by address.
      const file = head.match(new RegExp(`^import ${name} from '(@fontsource-variable/[^']+)\\?url';$`, 'm'))?.[1];
      assert.ok(file, `${family}: no import of a file by its address`);
      assert.ok(file.endsWith(`/files/${latinFile(family)}`), `${family}: ${file}`);
    }
  });
  test('is the file the site registers the family from: one face of that family names it', () => {
    for (const family of families) {
      const face = faces.split('@font-face').filter((rule) => rule.includes(`font-family: '${family}';`) && rule.includes(`/${latinFile(family)}')`));
      assert.equal(face.length, 1, family);
      // It is the face of the basic Latin letters, and it is drawn at once in a fallback until its file is there: what the preload is for.
      assert.match(face[0], /unicode-range: U\+0000-00FF/, family);
      assert.match(face[0], /font-display: swap;/, family);
    }
  });
  test('is the cut-down file of the icon family too: the one the site registers that family from', () => {
    const family = stacks.icon?.[0];
    assert.ok(family, 'the tokens have an icon stack');
    const listed = [...head.match(/const ICON_FILES: Record<string, string> = \{([^}]*)\};/)[1].matchAll(/(?:'([^']+)'|(\w+)): (\w+)/g)].map((entry) => [entry[1] ?? entry[2], entry[3]]);
    assert.deepEqual(listed.map(([name]) => name), [family]);
    const file = head.match(new RegExp(`^import ${listed[0][1]} from '\\.\\./\\.\\./styles/([^']+)\\?url';$`, 'm'))?.[1];
    assert.equal(file, `${family.toLowerCase().replaceAll(' ', '-')}.subset.generated.woff2`);
    const face = faces.split('@font-face').filter((rule) => rule.includes(`font-family: '${family}';`));
    assert.equal(face.length, 1, family);
    assert.match(face[0], new RegExp(`url\\('\\./${file.replaceAll('.', '\\.')}'\\)`), 'registered from the same file');
    // Invisible until its file is there, never drawn as its glyphs' names: what the preload is for.
    assert.match(face[0], /font-display: block;/);
    assert.match(head, /files\.push\(iconFile\);/);
  });
  test('is written as a font preload a browser will use: with the type, and fetched as a font is', () => {
    assert.match(head, /\{files\.map\(\(href\) => <link rel="preload" as="font" type="font\/woff2" href=\{href\} crossorigin \/>\)\}/);
    assert.match(head, /import Default from '@astrojs\/starlight\/components\/Head\.astro';/);
    assert.match(head, /<Default \/>/);
    assert.match(head, /firstFamilies\(stacks\)/);
    assert.match(read('astro.config.mjs'), /Head: '\.\/src\/components\/frame\/Head\.astro',/);
  });
});

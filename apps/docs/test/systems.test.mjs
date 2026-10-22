// What the site says of the shipped design systems' components (src/lib/systems.ts) is their components manifests',
// read from disk here and compared: the note on the page of a component that some systems do not have, the facts of
// each preset on the presets page, and that page itself in every language.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { availabilityOf, pieces, presetComponents, presetManifests, titleOf, variantsLeftOut } = await import('../src/lib/systems.ts');
const { manifests } = await import('../src/lib/repo.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const read = (file) => fs.readFileSync(here(`../${file}`), 'utf8');
const config = JSON.parse(fs.readFileSync(here('../../../tanrei.config.json'), 'utf8'));
const WEB = `${config.packages.npmScope}/web`;
const DEFAULT = config.namespace;
const manifestOf = (id) => JSON.parse(fs.readFileSync(here(`../../../tokens/generated/${id}/components.json`), 'utf8'));
const has = (manifest, name) => manifest.components.some((entry) => entry.name === name);

describe('where a component is', () => {
  test('the FAB menu: in the systems of the m3-like layer; the others are told to use a main action button and a bottom sheet', () => {
    const where = availabilityOf('fab-menu');
    assert.deepEqual(where.has, manifests.filter((manifest) => has(manifest, 'fab-menu')).map((manifest) => manifest.system));
    assert.ok(where.has.includes('m3-like') && !where.has.includes(DEFAULT));
    assert.deepEqual(where.entries, where.has.map((id) => `${WEB}/${id}`), 'each system’s own entry registers it');
    assert.equal(where.lacks.length, 1, 'the default system and cupertino are told the same');
    assert.deepEqual(where.lacks[0].systems, [DEFAULT, 'cupertino']);
    assert.equal(where.lacks[0].providedBy, 'm3-like');
    assert.deepEqual(where.lacks[0].insteadUse, ['main-action-button', 'bottom-sheet']);
    assert.equal(where.lacks[0].reason, manifestOf(DEFAULT).omitted.find((entry) => entry.name === 'fab-menu').reason);
    assert.deepEqual(where.include, { name: 'fab-menu', from: 'm3-like' });
    assert.equal(where.module, `${WEB}/components/fab-menu`);
  });
  test('the segmented button: the default system’s layer leaves it out and names what it uses instead; it is brought back by name', () => {
    const where = availabilityOf('segmented-button');
    assert.ok(where.has.includes('m3-like') && where.has.includes('cupertino'));
    assert.deepEqual(where.lacks.map((lack) => lack.systems), [[DEFAULT]]);
    assert.equal(where.lacks[0].omittedBy, DEFAULT);
    assert.equal(where.lacks[0].providedBy, undefined);
    assert.deepEqual(where.lacks[0].insteadUse, manifestOf(DEFAULT).omitted.find((entry) => entry.name === 'segmented-button').insteadUse);
    assert.equal(where.include, 'segmented-button');
  });
  test('every system that does not have a component is one of its lacks, with what its manifest says; one every system has has none', () => {
    const names = new Set(manifests.flatMap((manifest) => [...manifest.components, ...manifest.omitted].map((entry) => entry.name)));
    for (const name of names) {
      const where = availabilityOf(name);
      const without = manifests.filter((manifest) => manifest.omitted.some((entry) => entry.name === name)).map((manifest) => manifest.system);
      assert.deepEqual(where.lacks.flatMap((lack) => lack.systems).sort(), without.sort(), name);
      assert.deepEqual([...where.has, ...without].sort(), manifests.map((manifest) => manifest.system).sort(), `${name}: every system either has it or says why not`);
      for (const lack of where.lacks) for (const instead of lack.insteadUse) for (const id of lack.systems) assert.ok(has(manifestOf(id), instead), `${name}: ${id} is told to use ${instead}, which it has`);
    }
    assert.deepEqual(availabilityOf('button').lacks, []);
    assert.equal(availabilityOf('no-such-component'), null);
  });
  test('the values of `variant` each system leaves out are its manifest’s', () => {
    for (const name of ['text-input', 'tabs', 'navigation-bar', 'button']) {
      assert.deepEqual(variantsLeftOut(name), manifests.flatMap((manifest) => (manifest.omittedVariants[name] ? [{ system: manifest.system, values: manifest.omittedVariants[name] }] : [])), name);
    }
    assert.ok(variantsLeftOut('text-input').some((entry) => entry.system === DEFAULT));
  });
  test('a component’s title is its spec’s, read from a manifest', () => {
    assert.equal(titleOf('fab-menu'), JSON.parse(read('../../specs/fab-menu.spec.json')).title);
    assert.equal(titleOf('main-action-button'), JSON.parse(read('../../specs/main-action-button.spec.json')).title);
  });
});

describe('the page of a component that some systems do not have', () => {
  const text = read('src/components/ComponentAvailability.astro');
  test('leads with the note drawn from the manifests, and no page writes one by hand', () => {
    assert.match(text, /const where = availabilityOf\(spec\.name\);/);
    assert.match(text, /\{where && lacks\.length > 0 && \(\s*<div class="systems" data-docs-availability-note>\s*<Callout type="note" title=\{t\.system\.noteTitle\}>/);
    assert.match(text, /<Sentence text=\{t\.system\.use\}>/);
    assert.match(text, /<span lang=\{lang === 'en' \? undefined : 'en'\}>\{lack\.reason\}<\/span>/, 'the layer’s reason is shown as written, in English');
    const languages = ['', ...translations.map(({ dir }) => `${dir}/`)];
    for (const name of ['fab-menu', 'segmented-button']) {
      for (const dir of languages) {
        const page = read(`src/content/docs/${dir}components/${name}.mdx`);
        assert.match(page, new RegExp(`<ComponentAvailability name="${name}" />`), `${dir}${name}`);
        assert.doesNotMatch(page, /:::note\[/, `${dir}${name}: a note written by hand`);
        assert.doesNotMatch(page, /"include":/, `${dir}${name}: the layer's line written by hand`);
      }
    }
  });
  test('its sentences have their places in the six languages, and the pieces are the sentence', () => {
    for (const lang of [source.lang, ...translations.map(({ lang: other }) => other)]) {
      for (const sentence of Object.values(strings(lang).system)) assert.equal(pieces(sentence).map((piece) => (typeof piece === 'string' ? piece : `{${piece.place}}`)).join(''), sentence);
    }
    assert.deepEqual(pieces('Not in {systems}.'), ['Not in ', { place: 'systems' }, '.']);
  });
});

describe('the presets', () => {
  test('are every shipped system but the default one', () => {
    assert.deepEqual(presetManifests.map((manifest) => manifest.system), manifests.slice(1).map((manifest) => manifest.system));
    assert.ok(!presetManifests.some((manifest) => manifest.system === DEFAULT));
  });
  test('each one’s components beside the default system’s are its manifest’s', () => {
    const base = manifestOf(DEFAULT);
    for (const manifest of presetManifests) {
      const facts = presetComponents(manifest);
      const own = manifestOf(manifest.system);
      assert.equal(facts.count, own.components.length);
      assert.equal(facts.entry, `${WEB}/${manifest.system}`, `${manifest.system}: its entry`);
      assert.deepEqual(facts.beyond, own.components.filter((entry) => !has(base, entry.name)).map((entry) => entry.name));
      assert.deepEqual(facts.lacks.map((lack) => lack.name), own.omitted.map((entry) => entry.name));
      assert.deepEqual(facts.variantsOut.flatMap((group) => group.components).sort(), Object.keys(own.omittedVariants).sort());
      for (const group of facts.variantsOut) for (const name of group.components) assert.deepEqual(own.omittedVariants[name], group.values);
      for (const group of facts.variantsBeyond) {
        for (const name of group.components) {
          const theirs = own.components.find((entry) => entry.name === name).variants;
          const ours = base.components.find((entry) => entry.name === name).variants ?? [];
          assert.deepEqual(theirs.filter((value) => !ours.includes(value)), group.values, `${manifest.system}: ${name}`);
        }
      }
    }
    assert.ok(presetComponents(presetManifests.find((manifest) => manifest.system === 'm3-like')).beyond.includes('fab-menu'));
    assert.ok(presetComponents(presetManifests.find((manifest) => manifest.system === 'm3-like')).variantsBeyond.some((group) => group.components.includes('text-input')));
  });
  test('the presets page, in every language, has a section of facts for each preset and for no other system', () => {
    const want = presetManifests.map((manifest) => manifest.system);
    for (const dir of ['', ...translations.map((entry) => `${entry.dir}/`)]) {
      const page = read(`src/content/docs/${dir}getting-started/presets.mdx`);
      const facts = [...page.matchAll(/<PresetFacts system="([a-z0-9-]+)" \/>/g)].map((match) => match[1]);
      assert.deepEqual([...facts].sort(), [...want].sort(), `${dir}presets`);
      for (const id of want) assert.match(page, new RegExp(`^### ${id}\\n\\n<PresetFacts system="${id}" />`, 'm'), `${dir}presets: ${id} has its heading`);
      assert.match(page, /"include": \[\{ "name": "fab-menu", "from": "m3-like" \}, "segmented-button"\]/, `${dir}presets: the layer that takes a preset’s component`);
      assert.match(page, /"extends": "tanrei"/);
    }
    assert.match(read('astro.config.mjs'), /'getting-started\/react-native',\n\s*'getting-started\/presets',\n\s*'getting-started\/your-design-system',/);
  });
  test('the page’s code names only what the packages export', () => {
    const exports = Object.keys(JSON.parse(read('../../packages/web/package.json')).exports);
    const allowed = (specifier) => exports.some((entry) => {
      const subpath = `.${specifier.slice(WEB.length)}`;
      return entry.includes('*') ? new RegExp(`^${entry.replace(/[.]/g, '\\.').replace('*', '[a-z0-9-]+')}$`).test(subpath) : entry === subpath;
    });
    const page = read('src/content/docs/getting-started/presets.mdx');
    const specifiers = [...page.matchAll(/import '(@tanrei\/web[^']*)'/g)].map((match) => match[1]);
    assert.ok(specifiers.length > 4);
    for (const specifier of specifiers) assert.ok(allowed(specifier), specifier);
    for (const id of presetManifests.map((manifest) => manifest.system)) assert.ok(allowed(`${WEB}/systems/${id}.css`) && allowed(`${WEB}/${id}`), id);
  });
  test('its facts are drawn from the manifests, the resolved tokens and the font packages, with the names of the configuration', () => {
    const text = read('src/components/PresetFacts.astro');
    assert.match(text, /const facts = presetComponents\(manifest\);/);
    assert.match(text, /const stylesheet = `\$\{config\.packages\.npmScope\}\/web\/systems\/\$\{system\}\.css`;/);
    assert.match(text, /const attribute = `data-\$\{config\.namespace\}-system="\$\{system\}"`;/);
    assert.match(text, /resolved\.tree\?\.\[ns\]\?\.ref\?\.typeface\?\.\[role\]\?\.\$value/);
    assert.match(text, /import \{ FONT_PACKAGES \} from '..\/..\/..\/..\/packages\/tools\/src\/font-faces\.js';/);
    for (const lang of [source.lang, ...translations.map(({ lang: other }) => other)]) {
      for (const [key, word] of Object.entries(strings(lang).preset)) {
        assert.ok(word.trim(), `${lang}: preset.${key}`);
        if (lang !== source.lang) assert.notEqual(word, strings(source.lang).preset[key], `${lang}: preset.${key} is not translated`);
      }
    }
  });
});

// The site's lists of components follow the specs' `listing`:
// the sidebar, the index, the search and the head of a component's page, all made by `src/lib/listing.mjs` and
// `src/lib/page-head.ts` from the generated status file and the specs. The tests compare each list with the spec
// files themselves, read from disk: a component listed by hand, or a listing written into the site's code, fails
// here. Nothing depends on how many components there are.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { ABSENT_ATTR, LISTING_ATTR, LISTING_EVERYTHING, LISTING_KEY, ON_REQUEST_ATTR, SYSTEM_ONLY_ATTR, absentFrom, componentPages, groupOf, isOnRequest, listedFirst, listingBootstrap, shownIn, shownUnder, sidebarSlugs, sidebarTree, usedIn } = await import('../src/lib/listing.mjs');
const { aroundPlace, listingFacts } = await import('../src/lib/page-head.ts');
const { levelRole, levels, listings, manifests, statusComponents } = await import('../src/lib/repo.ts');
const { pageGroup } = await import('../src/lib/search.mjs');
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const read = (file) => fs.readFileSync(here(`../${file}`), 'utf8');
/** The specs as they are written, from disk: what every list is compared with. */
const specs = fs.readdirSync(here('../../../specs/')).filter((file) => file.endsWith('.spec.json')).map((file) => JSON.parse(fs.readFileSync(here(`../../../specs/${file}`), 'utf8')));
const specOf = (name) => specs.find((spec) => spec.name === name);
const hasPage = (name) => fs.existsSync(here(`../src/content/docs/components/${name}.mdx`));
const languages = [source.lang, ...translations.map(({ lang }) => lang)];
const requested = specs.filter((spec) => spec.listing === listings.onRequest);

describe('what the lists read', () => {
  test('is the specs’: each row’s listing and members are its spec’s, and the status file says which name is which', () => {
    assert.ok(listings.listed && listings.onRequest && listings.listed !== listings.onRequest);
    for (const spec of specs) {
      const row = statusComponents.find((entry) => entry.name === spec.name);
      assert.ok(row, `${spec.name}: no row`);
      assert.deepEqual([row.listing, row.level, row.builtFrom], [spec.listing, spec.level, spec.builtFrom ?? []], spec.name);
      assert.ok([listings.listed, listings.onRequest].includes(spec.listing), spec.name);
    }
  });
  test('and no source of the site writes a listing’s name, or the name of a component shown on request', () => {
    const files = ['astro.config.mjs', 'src/lib/listing.mjs', 'src/lib/page-head.ts', 'src/lib/repo.ts', 'src/lib/search.mjs', 'src/components/ListingSwitch.astro', 'src/components/ComponentIndex.astro', 'src/components/frame/Sidebar.astro', 'src/components/frame/PageTitle.astro', 'src/components/frame/Search.astro'];
    for (const file of files) {
      // Without the comments, and without the word a module's default export is asked for by (`import: 'default'`).
      const text = read(file).replace(/^\s*(\/\/|\*|\/\*).*$/gm, '').replace(/\bimport: 'default'/g, '');
      for (const name of Object.values(listings)) assert.doesNotMatch(text, new RegExp(`['"\`]${name}['"\`]`), `${file}: writes the listing "${name}"`);
      for (const spec of requested) assert.doesNotMatch(text, new RegExp(`['"\`/]${spec.name}['"\`/]`), `${file}: names ${spec.name}`);
    }
  });
});

describe('the sidebar', () => {
  const config = read('astro.config.mjs');
  const slugs = sidebarSlugs(statusComponents);

  test('lists no component by hand: the configuration asks for the pages of the status file', () => {
    assert.match(config, /items: sidebarSlugs\(status\.components\),/);
    assert.match(config, /JSON\.parse\(fs\.readFileSync\(new URL\('\.\.\/\.\.\/docs\/status\/status\.json', import\.meta\.url\), 'utf8'\)\)/);
    assert.doesNotMatch(config, /['"`]components\/[a-z0-9-]+['"`]/, 'a component’s page is written into the configuration');
  });
  test('holds the index and the page of every spec that has one — listed or shown on request — and nothing else', () => {
    assert.equal(slugs[0], 'components');
    const pages = specs.filter((spec) => hasPage(spec.name)).map((spec) => `components/${spec.name}`);
    assert.deepEqual([...slugs.slice(1)].sort(), [...pages].sort());
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs.slice(1)) assert.ok(hasPage(slug.slice('components/'.length)), `${slug}: no page`);
  });
  test('runs category by category, in the inventory’s order within each, and then a group for each layer that holds components', () => {
    const rows = componentPages(statusComponents);
    const categories = rows.map(groupOf);
    assert.deepEqual([...new Set(categories)].flatMap((category) => categories.filter((other) => other === category)), categories, 'a category is one run');
    // A component that lives in a layer stands in that layer's group, after every category.
    assert.equal(groupOf(rows.find((row) => row.name === 'fab-menu')), 'layer:m3-like');
    const first = categories.findIndex((group) => group.startsWith('layer:'));
    assert.ok(first > 0 && categories.slice(first).every((group) => group.startsWith('layer:')));
    for (const category of new Set(categories)) {
      const run = rows.filter((row) => groupOf(row) === category).map((row) => row.name);
      assert.deepEqual(run, statusComponents.filter((row) => run.includes(row.name)).map((row) => row.name));
    }
  });

  /** The sidebar as the framework gives it to a page under `base`, with `current` as the page being read. */
  const given = (base, current) => [
    { type: 'group', label: 'Start', collapsed: false, entries: [{ type: 'link', label: 'Install', href: `${base}/getting-started/`, isCurrent: false }] },
    { type: 'group', label: 'Components', collapsed: false, entries: slugs.map((slug) => ({ type: 'link', label: slug, href: `${base}/${slug}/`, isCurrent: slug === current })) },
  ];
  const links = (entries) => entries.flatMap((entry) => (entry.type === 'link' ? [entry] : links(entry.entries)));

  test('draws each component in a group of its category, named in the page’s language, with the index before them', () => {
    for (const lang of languages) {
      const base = lang === source.lang ? '' : `/${translations.find((entry) => entry.lang === lang).dir}`;
      const words = strings(lang).category;
      const [start, components] = sidebarTree(given(base, 'components'), statusComponents, listings, base, (category) => words[category] ?? category);
      assert.deepEqual(start, given(base, 'components')[0], 'a group that holds no component is left as it is');
      assert.deepEqual(components.entries[0], { type: 'link', label: 'components', href: `${base}/components/`, isCurrent: true });
      const groups = components.entries.slice(1);
      assert.ok(groups.length > 1 && groups.every((group) => group.type === 'group' && !group.collapsed));
      for (const group of groups) {
        for (const link of group.entries) {
          const spec = specOf(link.label.slice('components/'.length));
          assert.equal(group.label, words[spec.layer ? `layer:${spec.layer}` : spec.category], `${lang}: ${spec.name}`);
          assert.ok(group.label, `${lang}: ${spec.name} has a group named in the page's language`);
        }
      }
      // Every page is still there, once.
      assert.deepEqual(links(components.entries).map((link) => link.href).sort(), slugs.map((slug) => `${base}/${slug}/`).sort());
    }
  });
  test('marks exactly the components a spec shows on request: the default list leaves them out and the switched one holds all', () => {
    const [, components] = sidebarTree(given('', 'components'), statusComponents, listings, '', (category) => category);
    const all = links(components.entries).slice(1);
    for (const link of all) assert.equal(!!link.onRequest, specOf(link.label.slice('components/'.length)).listing === listings.onRequest, link.label);
    const byDefault = all.filter((link) => !link.onRequest).map((link) => link.label.slice('components/'.length));
    assert.deepEqual(byDefault, shownIn(componentPages(statusComponents), listings).map((row) => row.name));
    assert.deepEqual(all.map((link) => link.label.slice('components/'.length)), shownIn(componentPages(statusComponents), listings, { everything: true }).map((row) => row.name));
    for (const name of byDefault) assert.notEqual(specOf(name).listing, listings.onRequest, name);
  });
  test('shows the page of a component shown on request while it is open, whatever the switch says', () => {
    for (const spec of requested.filter((entry) => hasPage(entry.name))) {
      const [, components] = sidebarTree(given('/ja', `components/${spec.name}`), statusComponents, listings, '/ja', (category) => category);
      const own = links(components.entries).find((link) => link.isCurrent);
      assert.equal(own.href, `/ja/components/${spec.name}/`);
      assert.equal(own.onRequest, undefined, `${spec.name}: its own page is taken out of the sidebar`);
    }
  });
  test('is drawn from that tree, a marked row with the attribute the switch reads and the word at its end', () => {
    const text = read('src/components/frame/Sidebar.astro');
    assert.match(text, /const drawn = sidebarTree\(sidebar, statusComponents, listings, base, \(category\) => t\.category\[category\] \?\? category, manifests\)/);
    assert.match(text, /<Fragment set:html=\{cells\(drawn, true\)\} \/>/);
    assert.match(text, /entry\.onRequest \? ` \$\{ON_REQUEST_ATTR\} trailing-text="\$\{escape\(t\.listing\.advanced\)\}"`/);
    // The switch's row is the first of the drawer's list (a list item, as a list holds), after the row of the
    // appearance's button a compact window draws there, and before the rows of pages.
    assert.match(text, /<div role="listitem" class="docs-look-row"><Appearance id="docs-appearance-drawer" part="button" \/><Appearance id="docs-appearance-drawer" part="panel" \/><\/div>\s*<div role="listitem" class="docs-listing-row"><ListingSwitch lang=\{route\.lang\} \/><\/div>\s*<Fragment set:html=\{cells\(drawn, true\)\} \/>/);
    assert.doesNotMatch(text, /slot="header(?:-button)?"/, 'the drawer has no header: its menu button is the app bar’s');
    // The drawer's value and the page's trail read the framework's own sidebar, which holds every page.
    assert.match(text, /value=\{currentHref\(sidebar\)\}/);
  });
});

describe('the index of components', () => {
  const text = read('src/components/ComponentIndex.astro');
  test('draws every row of the status file, marks the ones shown on request, and says each one’s level', () => {
    assert.match(text, /statusComponents\.filter\(\(c\) => groupOf\(c\) === category\)\.map\(/);
    assert.match(text, /const onRequest = isOnRequest\(c, listings\);/);
    assert.match(text, /<tanrei-list-item href=\{href\} \{\.\.\.marked\(onRequest\)\} \{\.\.\.absent\(absentFrom\(c\.name, manifests\)\)\}>/);
    assert.match(text, /<span class="title">\{c\.title\}<\/span>/);
    assert.match(text, /const meta = `\$\{shipped\}\/\$\{platforms\.length\} · \$\{\(role && t\.level\[role\]\) \?\? c\.level\}`;/);
    assert.match(text, /<ListingSwitch lang=\{lang\} \/>/);
  });
  test('every level a spec carries has its word in the six languages', () => {
    for (const spec of specs) {
      const role = levelRole(spec.level);
      assert.ok(role, `${spec.name}: ${spec.level}`);
      for (const lang of languages) assert.ok(strings(lang).level[role], `${lang}: ${role}`);
    }
    assert.deepEqual(Object.keys(levels).map((key) => levelRole(levels[key])), Object.keys(levels));
  });
});

describe('the switch', () => {
  const text = read('src/components/ListingSwitch.astro');
  test('is Tanrei’s Switch, named in the page’s language, the same control in the sidebar and on the index', () => {
    assert.match(text, /<tanrei-switch class="docs-listing" label=\{t\.listing\.showAll\} data-docs-listing-switch \/>/);
    for (const lang of languages) {
      const words = strings(lang).listing;
      for (const key of ['showAll', 'advanced', 'placedInstead']) assert.ok(String(words[key] ?? '').trim(), `${lang}: listing.${key}`);
      assert.equal(words.placedInstead.split('{components}').length, 2, `${lang}: one place for the components`);
      assert.ok(String(strings(lang).usedIn ?? '').trim(), `${lang}: usedIn`);
      if (lang !== source.lang) assert.notEqual(words.showAll, strings(source.lang).listing.showAll, `${lang}: not translated`);
    }
  });
  test('keeps the reader’s choice under the key the head’s script reads before the first paint', () => {
    assert.match(read('astro.config.mjs'), /\{ tag: 'script', content: listingBootstrap \}/);
    assert.ok(listingBootstrap.includes(JSON.stringify(LISTING_KEY)) && listingBootstrap.includes(JSON.stringify(LISTING_EVERYTHING)) && listingBootstrap.includes(JSON.stringify(LISTING_ATTR)));
    assert.match(text, /localStorage\.setItem\(LISTING_KEY, LISTING_EVERYTHING\)/);
    assert.match(text, /localStorage\.removeItem\(LISTING_KEY\)/);
  });
  /** The head's script, run with a storage that holds `stored` (or throws): the attribute it leaves on the root. */
  const after = (stored) => {
    const attributes = {};
    const document = { documentElement: { setAttribute: (name, value) => (attributes[name] = value) } };
    const localStorage = { getItem: (key) => (stored instanceof Error ? (() => { throw stored; })() : key === LISTING_KEY ? stored : null) };
    new Function('document', 'localStorage', listingBootstrap)(document, localStorage);
    return attributes[LISTING_ATTR];
  };
  test('a first visit, a blocked storage and an unknown value show what is listed; a reader who asked sees everything', () => {
    assert.equal(after(null), 'listed');
    assert.equal(after('something else'), 'listed');
    assert.equal(after(new Error('blocked')), 'listed');
    assert.equal(after(LISTING_EVERYTHING), undefined);
  });
  test('hides a marked row only under the attribute a script wrote: without script everything is shown', () => {
    assert.match(text, new RegExp(`:root\\[${LISTING_ATTR}='listed'\\] \\[${ON_REQUEST_ATTR}\\] \\{\\s*display: none;`));
    // No other rule of the site hides a marked row.
    for (const file of ['src/styles/frame.css', 'src/styles/tanrei-theme.css', 'src/components/ComponentIndex.astro', 'src/components/frame/Sidebar.astro']) assert.doesNotMatch(read(file), /\[data-docs-on-request\][^{]*\{[^}]*display: none/, file);
  });
});

describe('the choice of design system', () => {
  /** Every shipped system's components manifest, read from disk: what the lists are compared with. */
  const generated = here('../../../tokens/generated/');
  const onDisk = fs.readdirSync(generated).filter((id) => fs.existsSync(`${generated}${id}/components.json`)).map((id) => JSON.parse(fs.readFileSync(`${generated}${id}/components.json`, 'utf8')));
  const DEFAULT = JSON.parse(fs.readFileSync(here('../../../tanrei.config.json'), 'utf8')).namespace;
  const pages = componentPages(statusComponents);
  const names = (rows) => rows.map((row) => row.name);

  test('reads every shipped system’s manifest, the default system first', () => {
    assert.deepEqual(manifests.map((manifest) => manifest.system).sort(), onDisk.map((manifest) => manifest.system).sort());
    assert.equal(manifests[0].system, DEFAULT);
    assert.ok(manifests.length > 1, 'the premise: there are presets');
  });
  test('a list under a system leaves out exactly what its manifest says it does not have', () => {
    for (const manifest of onDisk) {
      const out = new Set(manifest.omitted.map((entry) => entry.name));
      assert.deepEqual(names(shownUnder(pages, manifests, manifest.system)), names(pages).filter((name) => !out.has(name)), manifest.system);
      for (const row of statusComponents) assert.equal(absentFrom(row.name, manifests).includes(manifest.system), out.has(row.name), `${manifest.system}: ${row.name}`);
    }
  });
  test('selecting m3-like shows the FAB menu and the segmented button; the default system shows neither', () => {
    for (const name of ['fab-menu', 'segmented-button']) {
      assert.ok(names(shownUnder(pages, manifests, 'm3-like')).includes(name), `m3-like: ${name}`);
      assert.ok(!names(shownUnder(pages, manifests, DEFAULT)).includes(name), `${DEFAULT}: ${name}`);
    }
    assert.ok(!names(shownUnder(pages, manifests, 'cupertino')).includes('fab-menu') && names(shownUnder(pages, manifests, 'cupertino')).includes('segmented-button'));
  });

  /** The sidebar as the framework gives it, the index first, with `current` as the page being read. */
  const given = (current) => [{ type: 'group', label: 'Components', collapsed: false, entries: sidebarSlugs(statusComponents).map((slug) => ({ type: 'link', label: slug, href: `/${slug}/`, isCurrent: slug === current })) }];
  const links = (entries) => entries.flatMap((entry) => (entry.type === 'link' ? [entry] : links(entry.entries)));
  test('the sidebar marks each component with the systems that do not have it, and a group none of whose components a system has', () => {
    const [components] = sidebarTree(given('components'), statusComponents, listings, '', (category) => category, manifests);
    for (const link of links(components.entries).slice(1)) assert.deepEqual(link.absentFrom ?? [], absentFrom(link.label.slice('components/'.length), manifests), link.label);
    const fab = components.entries.find((entry) => entry.type === 'group' && entry.entries.some((child) => child.href === '/components/fab-menu/'));
    assert.ok(fab.absentFrom?.includes(DEFAULT), 'the layer’s group is not drawn under the default system');
    for (const group of components.entries.filter((entry) => entry.type === 'group')) {
      const every = manifests.map((manifest) => manifest.system).filter((id) => group.entries.every((child) => (child.absentFrom ?? []).includes(id)));
      assert.deepEqual(group.absentFrom ?? [], every, group.label);
    }
    // Without the manifests nothing is marked.
    const [bare] = sidebarTree(given('components'), statusComponents, listings, '', (category) => category);
    assert.ok(links(bare.entries).every((link) => !link.absentFrom));
  });
  test('the page being read stays in the sidebar whatever system is chosen, and so does its group', () => {
    const [components] = sidebarTree(given('components/fab-menu'), statusComponents, listings, '', (category) => category, manifests);
    const own = links(components.entries).find((link) => link.isCurrent);
    assert.equal(own.href, '/components/fab-menu/');
    assert.equal(own.absentFrom, undefined);
    assert.equal(components.entries.find((entry) => entry.type === 'group' && entry.entries.includes(own)).absentFrom, undefined);
  });

  test('the index’s select chooses the reader’s look, one option for each shipped system', () => {
    const text = read('src/components/SystemSelect.astro');
    assert.match(text, /setAppearance\(\{ look: control\.value \}\)/);
    assert.match(text, /<tanrei-select-field class="docs-system" size="small" label=\{t\.system\.choice\}/);
    assert.match(text, /manifests\.map\(\(manifest\) => <tanrei-option value=\{manifest\.system\} supporting-text=\{manifest\.name\}>\{manifest\.system\}<\/tanrei-option>\)/);
  });
  test('is the header’s Appearance panel beside the brand (in a compact window, first in the drawer), the index’s select beside the switch, and the index says what the chosen system does not have', () => {
    const panel = read('src/components/frame/Appearance.astro');
    assert.match(panel, /<tanrei-list class="docs-appearance-look" selection="single" label=\{t\.system\.choice\} value=\{look\}/);
    assert.match(panel, /const looks = manifests\.map\(/);
    assert.match(panel, /<tanrei-button slot="actions" variant="text" href=\{studio\}>\{words\.editTheme\}<\/tanrei-button>/);
    const header = read('src/components/frame/Header.astro');
    assert.match(header, /<Fragment set:html=\{wordmark\} \/>\s*<Appearance id="docs-appearance" part="button" slot="context" \/>/);
    assert.match(read('src/components/frame/Sidebar.astro'), /<Appearance id="docs-appearance-drawer" part="button" \/>/);
    const index = read('src/components/ComponentIndex.astro');
    assert.match(index, /<SystemSelect lang=\{lang\} \/>\s*<ListingSwitch lang=\{lang\} \/>/);
    assert.match(index, /manifests\.filter\(\(manifest\) => manifest\.omitted\.length > 0\)\.map\(\(manifest\) => \(\s*<p class="absent" \{\.\.\.\{ \[SYSTEM_ONLY_ATTR\]: manifest\.system \}\}>/);
  });
  test('its words are in the six languages, each sentence with its places', () => {
    const places = { choice: [], notIn: ['system'], insteadUse: ['component', 'components'], noteTitle: [], has: ['systems', 'entries'], lacks: ['systems'], livesIn: ['layer'], leftOutBy: ['layer'], use: ['components'], take: ['guide'], guide: [], layerFile: [], yourCode: [] };
    for (const lang of languages) {
      const words = strings(lang).system;
      for (const [key, want] of Object.entries(places)) {
        assert.ok(String(words[key] ?? '').trim(), `${lang}: system.${key}`);
        assert.deepEqual([...words[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(), [...want].sort(), `${lang}: system.${key}`);
        if (lang !== source.lang) assert.notEqual(words[key], strings(source.lang).system[key], `${lang}: system.${key} is not translated`);
      }
    }
  });
  test('no source of the lists writes the name of a system, or of a component a system does not have', () => {
    const files = ['astro.config.mjs', 'src/lib/listing.mjs', 'src/lib/list-filter.ts', 'src/lib/systems.ts', 'src/components/SystemSelect.astro', 'src/components/frame/Appearance.astro', 'src/components/frame/Header.astro', 'src/components/frame/ThemeProvider.astro', 'src/lib/appearance.ts', 'src/components/ComponentIndex.astro', 'src/components/frame/Sidebar.astro', 'src/components/ComponentAvailability.astro', 'src/components/PresetFacts.astro'];
    const left = [...new Set(onDisk.flatMap((manifest) => manifest.omitted.map((entry) => entry.name)))];
    for (const file of files) {
      const text = read(file).replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');
      for (const name of [...onDisk.map((manifest) => manifest.system), ...left]) assert.doesNotMatch(text, new RegExp(`['"\`/]${name}['"\`/]`), `${file}: names ${name}`);
    }
  });
});

describe('the head of a component’s page', () => {
  const known = Object.fromEntries(specs.map((spec) => [spec.name, spec]));
  const hrefOf = (base, name) => `${base}/components/${name}/`;

  test('a member says where it is used: every component whose spec is built from it', () => {
    for (const spec of specs) {
      const users = specs.filter((other) => (other.builtFrom ?? []).includes(spec.name));
      const facts = listingFacts(spec, '/es', known, hrefOf, listings);
      assert.deepEqual(facts.usedIn, users.map((user) => ({ name: user.name, title: user.title, href: `/es/components/${user.name}/` })), spec.name);
      assert.deepEqual(usedIn(specs, spec.name).map((user) => user.name), users.map((user) => user.name));
    }
    assert.ok(specs.some((spec) => listingFacts(spec, '', known, hrefOf, listings).usedIn.length > 0), 'no spec is built from another');
  });
  test('a component shown on request leads with what most products place in its stead, which every list shows', () => {
    for (const spec of specs) {
      const facts = listingFacts(spec, '', known, hrefOf, listings);
      assert.equal(facts.onRequest, spec.listing === listings.onRequest, spec.name);
      if (!facts.onRequest) {
        assert.deepEqual(facts.placedInstead, []);
        continue;
      }
      assert.ok(facts.placedInstead.length > 0, `${spec.name}: no listed component is built from it`);
      for (const higher of facts.placedInstead) {
        assert.ok(known[higher.name].builtFrom.includes(spec.name));
        assert.notEqual(known[higher.name].listing, listings.onRequest);
        assert.equal(higher.href, `/components/${higher.name}/`);
      }
    }
  });
  test('with made-up names: nothing is read but which name the status file gives', () => {
    const made = { input: { name: 'input', title: 'Input', listing: 'y' }, field: { name: 'field', title: 'Field', listing: 'x', builtFrom: ['input'] }, form: { name: 'form', title: 'Form', listing: 'y', builtFrom: ['input'] } };
    const facts = listingFacts(made.input, '', made, () => undefined, { listed: 'x', onRequest: 'y' });
    assert.deepEqual(facts, { onRequest: true, usedIn: [{ name: 'field', title: 'Field' }, { name: 'form', title: 'Form' }], placedInstead: [{ name: 'field', title: 'Field' }] });
    assert.equal(isOnRequest(made.field, { listed: 'x', onRequest: 'y' }), false);
  });
  test('the line is the dictionary’s sentence around the links, in every language', () => {
    for (const lang of languages) {
      const [before, after] = aroundPlace(strings(lang).listing.placedInstead, 'components');
      assert.equal(`${before}{components}${after}`, strings(lang).listing.placedInstead, lang);
    }
    assert.deepEqual(aroundPlace('no place', 'components'), ['no place', '']);
  });
  test('is drawn by the page’s head: the line as Tanrei’s Callout before the facts, “Used in” among them, and both given to the search index', () => {
    const text = read('src/components/frame/PageTitle.astro');
    assert.match(text, /const listingOf = spec && listingFacts\(spec, localeBase\(Astro\)\);/);
    assert.match(text, /\{listingOf\?\.onRequest && \(\s*<Callout type="note" title=\{t\.listing\.advanced\}>/);
    assert.ok(text.indexOf('<Callout type="note"') < text.indexOf('<tanrei-description-list class="docs-page-facts"'), 'the line leads');
    assert.match(text, /<dt>\{t\.usedIn\}<\/dt>/);
    // One fact to an element: the index reads everything after a key's colon as the value.
    assert.match(text, /<tanrei-description-list class="docs-page-facts"[^>]* data-pagefind-meta=\{indexLevel\}>\s*<dl data-pagefind-meta=\{indexOnRequest\}>/);
    assert.match(text, /const indexLevel = levelOf && `level:\$\{levelOf\.level\}`;/);
    assert.match(text, /const indexOnRequest = listingOf\?\.onRequest \? `onrequest:\$\{t\.listing\.advanced\}` : undefined;/);
    for (const lang of languages) for (const word of [...Object.values(strings(lang).level), strings(lang).listing.advanced]) assert.doesNotMatch(word, /[,:]/, `${lang}: ${word}`);
  });
});

describe('the search', () => {
  const page = (url, meta) => ({ url, meta: { title: url, ...meta } });
  test('finds every component — nothing of a page shown on request is kept from the index', () => {
    const text = read('src/components/frame/PageTitle.astro');
    assert.doesNotMatch(text, /pagefind: false|data-pagefind-ignore="all"/);
    for (const spec of requested.filter((entry) => hasPage(entry.name))) assert.doesNotMatch(read(`src/content/docs/components/${spec.name}.mdx`).split('---')[1], /pagefind:\s*false/, spec.name);
  });
  test('a result says the component’s level, and that it is shown on request', () => {
    assert.equal(pageGroup(page('/components/a/', { title: 'A field', level: 'Composed' })).headline, 'A field · Composed');
    assert.equal(pageGroup(page('/components/b/', { title: 'An input', level: 'Base', onrequest: 'Advanced' })).headline, 'An input · Base · Advanced');
    assert.equal(pageGroup(page('/foundations/color/', { title: 'Color' })).headline, 'Color');
  });
  test('among the components of an answer, one every list shows comes before one shown on request; every other page keeps its place', () => {
    const input = page('/components/input/', { level: 'Base', onrequest: 'Advanced' });
    const picker = page('/components/picker/', { level: 'Base', onrequest: 'Advanced' });
    const field = page('/components/field/', { level: 'Composed' });
    const upload = page('/components/upload/', { level: 'Feature' });
    const guide = page('/foundations/guide/');
    assert.deepEqual(listedFirst([input, guide, field, picker, upload]).map((entry) => entry.url), [field, guide, upload, input, picker].map((entry) => entry.url));
    assert.deepEqual(listedFirst([guide, field, input]), [guide, field, input]);
    assert.deepEqual(listedFirst([]), []);
    assert.match(read('src/components/frame/Search.astro'), /const pages = listedFirst\(await Promise\.all\(next\.map\(\(result\) => result\.data\(\)\)\)\);/);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { ROOT_SYSTEM } from '../../tokens-build/src/layers.js';
import { systemAvailability } from './checks.js';
import { CONFIG, DOCS_PAGES, PLATFORMS, REPO_ROOT, exists, loadSpecs, read } from './conventions.js';
import { LEVELS, LISTINGS, levelCounts, listingCounts } from './levels.js';
import { readmeFiles } from './readme.js';
import { wordsFiles } from './words.js';

const ICON = { planned: '·', lagging: '◌', alpha: '◔', beta: '◑', stable: '●', deprecated: '✕' };

// The full inventory (M3's component families). Anything without a spec yet is "planned" on every platform.
function inventory() {
  return JSON.parse(read('specs/inventory.json')).components;
}

const DOCS_CONTENT = 'apps/docs/src/content/docs/';

/**
 * The address of a component's page on the docs site, or null where it has none: the English page the conventions
 * name for it (a component's own page, or the page that documents a foundation with a spec), and only when that file
 * exists. The docs site links a component's name from this alone, so it never links to a page that is not built.
 */
export function docsAddress(name) {
  const page = DOCS_PAGES(name)[0];
  if (!page?.startsWith(DOCS_CONTENT) || !exists(page)) return null;
  const slug = page.slice(DOCS_CONTENT.length).replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
  return slug ? `/${slug}/` : '/';
}

export function buildStatus() {
  const specs = new Map(loadSpecs().map(({ spec }) => [spec.name, spec]));
  const rows = inventory().map((item) => {
    const spec = specs.get(item.name);
    const platforms = Object.fromEntries(CONFIG.platforms.map((p) => [p, spec?.platforms[p].status ?? 'planned']));
    // The level, the members and what else the component is built with: the spec's, and the
    // inventory's level where no spec exists yet.
    // `listing`: whether the component is listed by default, for every reader of this file.
    // `layer`: where a component that does not live in the root lives — only the systems that descend from it have it.
    const layer = spec?.layer ?? item.layer;
    return { name: item.name, title: spec?.title ?? item.title, category: item.category, level: spec?.level ?? item.level, listing: spec?.listing ?? item.listing, ...(layer && layer !== ROOT_SYSTEM ? { layer } : {}), builtFrom: spec?.builtFrom ?? [], uses: spec?.uses ?? [], hasSpec: Boolean(spec), docs: docsAddress(item.name), platforms };
  });
  const unknown = [...specs.keys()].filter((n) => !rows.some((r) => r.name === n));
  if (unknown.length) throw new Error(`Spec(s) not listed in specs/inventory.json: ${unknown.join(', ')}`);

  const totals = Object.fromEntries(
    CONFIG.platforms.map((p) => [p, Object.fromEntries(CONFIG.statuses.map((s) => [s, rows.filter((r) => r.platforms[p] === s).length]))]),
  );
  // What each design system does not ship: a component can be implemented everywhere and still not be one of a system's.
  // `levels` says which name is which (a single part, components that complete one value or job, controls the
  // component coordinates), so that a reader of this file —
  // the docs site — never writes a name itself.
  // `listings` does the same for the two values of `listing`: listed by default, or only when everything is asked for.
  return { namespace: CONFIG.namespace, platforms: CONFIG.platforms, statuses: CONFIG.statuses, levels: LEVELS, listings: LISTINGS, components: rows, totals, unavailable: systemAvailability() };
}

/** How many components are of each level: "62 base · 6 composed · 2 feature". */
export const levelLine = (status) => levelCounts(status.components).map(({ level, count }) => `${count} ${level}`).join(' · ');

/** How many components are listed by default and how many only on request: "70 default · 0 advanced". */
export const listingLine = (status) => listingCounts(status.components).map(({ listing, count }) => `${count} ${listing}`).join(' · ');

/** What `listing` says, under the matrix's legend. It names neither value. */
const LISTING_NOTE =
  'A component of the first value is shown wherever components are listed; one of the second is a bare control that most products meet inside a higher level, listed only when everything is asked for. This matrix shows every component, whatever its listing.';

/** What the three levels say, under the matrix's legend. It names none of them. */
const LEVEL_NOTE =
  'A component of the first level is a single part with one job; one of the second is put together from other components to complete one value or one job; one of the third holds several controls, each with a value or an action of its own, and coordinates them by state of its own. A cell names the members a component is built from.';

/** A row's level, and its members where it has any: "composed: Field group, Radio button". */
const levelCell = (row, titles) => (row.builtFrom.length ? `${row.level}: ${row.builtFrom.map((name) => titles.get(name) ?? name).join(', ')}` : (row.level ?? '–'));

function markdown(status) {
  const titles = new Map(status.components.map((c) => [c.name, c.title]));
  const head = ['Component', 'Level', 'Listing', 'Category', 'Spec', ...status.platforms.map((p) => PLATFORMS[p].label)];
  const lines = [
    '<!-- GENERATED FILE — DO NOT EDIT. Source: specs/. Regenerate with `pnpm generate`. -->',
    '# Component status',
    '',
    `Legend: ${status.statuses.map((s) => `${ICON[s]} ${s}`).join(' · ')}`,
    '',
    `Level: ${levelLine(status)}. ${LEVEL_NOTE}`,
    '',
    `Listing: ${listingLine(status)}. ${LISTING_NOTE}`,
    '',
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...status.components.map(
      (r) => `| ${r.title} | ${levelCell(r, titles)} | ${r.listing ?? '–'} | ${r.category} | ${r.hasSpec ? '✓' : '–'} | ${status.platforms.map((p) => `${ICON[r.platforms[p]]} ${r.platforms[p]}`).join(' | ')} |`,
    ),
    '',
    '## Not shipped by a system',
    '',
    'A system can leave a component, or some of its variants, out; the implementation above still exists.',
    '',
    ...Object.entries(status.unavailable).map(([id, { components, variants }]) => {
      const out = [...components, ...Object.entries(variants).map(([c, v]) => `${c} (${v.join(', ')})`)];
      return `- \`${id}\`: ${out.length ? out.join(', ') : 'ships everything'}`;
    }),
    '',
  ];
  return lines.join('\n');
}

/**
 * Contact sheet: the committed baseline of every fixture, side by side per platform.
 * This is the human half of "equivalent visual result" — geometry and
 * color should match across a row; font rasterization will not.
 */
function paritySheet() {
  const lines = [
    '<!-- GENERATED FILE — DO NOT EDIT. Source: specs/ fixtures + committed baselines. Regenerate with `pnpm generate`. -->',
    '# Cross-platform parity sheet',
    '',
    'Each row is one spec fixture; each cell is that platform\'s committed baseline. Compare across a row: size, radius, color, padding and border should agree. Text rendering differs by platform (and Flutter baselines use the test font, so labels appear as blocks).',
    '',
  ];
  for (const { spec } of loadSpecs()) {
    // A lagging platform's baselines show the spec it has not caught up with: not comparable.
    const platforms = CONFIG.platforms.filter((p) => !['planned', 'lagging'].includes(spec.platforms[p].status));
    if (!platforms.length) continue;
    lines.push(`## ${spec.title}`, '', `| Fixture | ${platforms.map((p) => PLATFORMS[p].label).join(' | ')} |`, `| --- | ${platforms.map(() => '---').join(' | ')} |`);
    for (const fixture of spec.fixtures) {
      const cells = platforms.map((p) => {
        const rel = PLATFORMS[p].snapshot(spec.name, fixture.id);
        if (!exists(rel)) return '_missing_';
        return rel.endsWith('.png') ? `<img src="../../${rel}" alt="${p} ${fixture.id}" width="160">` : `[render tree](../../${rel})`;
      });
      lines.push(`| \`${fixture.id}\` | ${cells.join(' | ')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function statusFiles() {
  const status = buildStatus();
  return {
    'docs/status/status.json': `${JSON.stringify(status, null, 2)}\n`,
    'docs/status/STATUS.md': markdown(status),
    'docs/status/PARITY.md': paritySheet(),
    // The keys of the product's words and the web's type of them, from the specs' `words` fields.
    ...wordsFiles(),
    // The status block of each README (readme.js): what is released, and what each platform has.
    ...readmeFiles(status),
  };
}

export function writeStatus() {
  for (const [rel, content] of Object.entries(statusFiles())) {
    const file = path.join(REPO_ROOT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return buildStatus();
}

// The site's text for language models and other programs that read it (https://llmstxt.org/): `/llms.txt`, an index of
// the site in Markdown; `/llms-full.txt`, the pages of the default system's components in one file;
// `/systems/<id>/llms.txt`, the index of one shipped design system; and `/components/<name>.md`, a component's page as
// Markdown. Pages under src/pages/ serve them; this module writes them, as plain functions, so that Node can test them
// without the site (test/llms.test.mjs).
//
// Everything here is read from the sources of truth, never from the site's HTML: what a system ships from its
// components manifest (tokens/generated/<id>/components.json, written by `pnpm generate`), what a component is from its
// spec (resolved, as every table of the site reads it), its tokens from its token documents as written, its status on
// each platform from the status file. English only: a spec is written in English, and the site shows it as written in
// every language.
import { strings } from './i18n';
import { specOfPage } from './page-head';
import { usedIn } from './listing.mjs';
import {
  componentTokenSources,
  config,
  definedTags,
  listings,
  manifests,
  memberOf,
  platforms,
  specs,
  statusComponents,
  statusOf,
  statuses,
  systemLayers,
  webAttribute,
  type ComponentsManifest,
  type ManifestOmission,
  type Spec,
  type SpecProp,
} from './repo';

const en = strings('en');
const ns = config.namespace;
const repository = `https://github.com/${config.repository.public}`;

/** What every file opens with: what Tanrei is, in one sentence of facts. */
const summary = `${config.name} is one design system for ${new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(platforms.map((p) => en.platform[p] ?? p))}. Its sources of truth are design tokens in the DTCG format and a platform-neutral spec for each component: each platform's tokens, the documentation's tables and these files are generated from them, and each platform implements the specs.`;

/** A page of the site that the index links to: its address under the site (`/foundations/color/`), title and description. */
export interface SitePage {
  href: string;
  title: string;
  description?: string;
}
/** A group of pages, under a heading of the index. */
export interface PageGroup {
  title: string;
  pages: SitePage[];
}

/** The address of a component's page as Markdown, under the site. */
export const markdownPath = (name: string) => `/components/${name}.md`;
/** The address of a design system's index, under the site. */
export const systemIndexPath = (id: string) => `/systems/${id}/llms.txt`;

/** The default design system's manifest: the system a product has unless it chooses another. */
export const defaultManifest: ComponentsManifest = (() => {
  const found = manifests.find((manifest) => manifest.system === ns);
  if (!found) throw new Error(`tokens/generated/${ns}/components.json is missing. Run pnpm generate.`);
  return found;
})();

/** The shipped design systems, the default first: each has its own index. */
export const systemIds = manifests.map((manifest) => manifest.system);

/** The manifest of a shipped design system. */
export function manifestOf(id: string): ComponentsManifest {
  const found = manifests.find((manifest) => manifest.system === id);
  if (!found) throw new Error(`No components manifest for the system "${id}" (tokens/generated/${id}/components.json).`);
  return found;
}

/**
 * The folders of the site whose pages the index lists, in the sidebar's order, under the sidebar's headings. The
 * components are listed from the manifests, and the status page under "Optional".
 */
export const PAGE_FOLDERS: [folder: string, title: string][] = [
  ['getting-started', 'Getting started'],
  ['foundations', 'Foundations'],
  ['tokens', 'Token reference'],
  ['project', 'Project'],
];

/**
 * The English pages of the site's content (Starlight's `docs` collection) in the index's groups: a folder's own page
 * first, then its pages by title. `translations` are the folders of the other languages, whose pages are left out.
 */
export function pageGroups(entries: { id: string; data: { title: string; description?: string } }[], translations: string[]): PageGroup[] {
  const english = entries.filter((entry) => !translations.includes(entry.id.split('/')[0]));
  return PAGE_FOLDERS.map(([folder, title]) => ({
    title,
    pages: english
      .filter((entry) => entry.id === folder || entry.id.startsWith(`${folder}/`))
      .sort((a, b) => Number(b.id === folder) - Number(a.id === folder) || a.data.title.localeCompare(b.data.title))
      .map((entry) => ({ href: `/${entry.id.replace(/\/index$/, '')}/`, title: entry.data.title, description: entry.data.description })),
  }));
}

// ── Markdown ─────────────────────────────────────────────────────────────

/** Text for one cell of a Markdown table: on one line, with its pipes escaped. */
const cell = (text: string | undefined) => (text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim() || '—';
/** Text on one line: a list item or a link's note. */
const line = (text: string | undefined) => (text ?? '').replace(/\s*\n\s*/g, ' ').trim();
const code = (text: string) => `\`${text}\``;
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n');
const absolute = (site: URL, path: string) => new URL(path, site).href;
const titleOf = (name: string) => specs[name]?.title ?? statusOf(name)?.title ?? name;
const list = (names: string[]) => names.map(titleOf).join(', ');

/** The value a prop takes when nothing sets it, as the spec writes it. */
function defaultOf(prop: SpecProp): string {
  if (prop.default === null || prop.default === undefined) return '—';
  return code(typeof prop.default === 'string' ? JSON.stringify(prop.default) : String(prop.default));
}

/** A prop's type, with the values it takes where the spec lists them. */
const typeOf = (prop: SpecProp) => (prop.values?.length ? `${code(prop.type)}: ${prop.values.map(code).join(', ')}` : code(prop.type));

/** What a forwarded entry says of where it is from: the member, and the sentence the composed spec adds. */
const fromNote = (entry: { from?: string; note?: string }) => {
  const member = memberOf(entry);
  return member ? ` (From ${titleOf(member)}${entry.note ? `: ${line(entry.note)}` : '.'})` : '';
};

function propsTable(props: SpecProp[], tag?: string): string {
  const withAttribute = Boolean(tag);
  const head = ['Prop', 'Type', 'Default', ...(withAttribute ? ['Web attribute'] : []), 'Description'];
  const rows = props.map((prop) => {
    const attribute = tag ? webAttribute(tag, prop.name) : undefined;
    return [
      code(prop.name),
      typeOf(prop),
      defaultOf(prop),
      ...(withAttribute ? [attribute ? `${code(attribute.name)}${attribute.inverse ? ' (turns it off)' : ''}` : '—'] : []),
      `${line(prop.description)}${fromNote(prop)}`,
    ];
  });
  return table(head, rows);
}

/** A token's value as written, as text: an alias as written, a dimension or a duration by its unit, a color by its hex. */
function valueText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if ('value' in object && 'unit' in object && Object.keys(object).length === 2) return `${object.value}${object.unit}`;
    if (typeof object.hex === 'string' && (object.alpha === undefined || object.alpha === 1)) return object.hex;
  }
  return JSON.stringify(value);
}

/** Every token of a group of a token document, by its dotted name: what it aliases, or its value as written. */
function tokensOf(group: string): { name: string; type?: string; value: string }[] {
  const path = `${ns}.${group}`.split('.');
  const out: { name: string; type?: string; value: string }[] = [];
  const walk = (node: any, at: string[], type: string | undefined) => {
    if (!node || typeof node !== 'object') return;
    const own = node.$type ?? type;
    if ('$value' in node) {
      const value = node.$value;
      out.push({ name: at.join('.'), type: own, value: valueText(value) });
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child, [...at, key], own);
  };
  for (const document of Object.values(componentTokenSources)) {
    const node = path.reduce<any>((at, key) => at?.[key], document);
    if (node) walk(node, path, undefined);
  }
  return out;
}

/** The extension a component's token group declares its per-state tokens with (`dev.<namespace>.states`). */
function statesOf(group: string): { variants?: string[]; states: string[]; perVariant?: Record<string, string>; perComponent?: Record<string, string> } | undefined {
  const path = `${ns}.${group}`.split('.');
  for (const document of Object.values(componentTokenSources)) {
    const node = path.reduce<any>((at, key) => at?.[key], document);
    const states = node?.$extensions?.[`dev.${ns}.states`];
    if (states) return states;
  }
  return undefined;
}

/** The sets of tokens a component reads beside its own group and that are no component's (`dev.<namespace>.shared.readers`). */
function sharedSetsOf(name: string): string[] {
  const out: string[] = [];
  for (const document of Object.values(componentTokenSources)) {
    for (const [group, node] of Object.entries<any>(document[ns]?.comp ?? {})) {
      if (node?.$extensions?.[`dev.${ns}.shared`]?.readers?.includes(name)) out.push(`comp.${group}`);
    }
  }
  return [...new Set(out)].sort();
}


function tokensSection(spec: Spec): string[] {
  const groups = [spec.tokens, ...sharedSetsOf(spec.name)];
  const out = [
    '## Tokens',
    '',
    `As written in the token documents (DTCG): an alias in braces names the token it takes its value from, which each design system resolves. On the web each token is a CSS custom property: ${code(config.web.cssPrefix)} and the name after ${code(ns)}, joined by hyphens (${code(`${ns}.${spec.tokens}.…`)} → ${code(`${config.web.cssPrefix}-${spec.tokens.replace(/\./g, '-')}-…`)}).`,
  ];
  for (const group of groups) {
    const tokens = tokensOf(group);
    out.push('', `### ${code(`${ns}.${group}`)}`, '');
    out.push(tokens.length ? table(['Token', 'Type', 'Value'], tokens.map((token) => [code(token.name.slice(ns.length + 1)), token.type ? code(token.type) : '—', code(token.value)])) : 'No tokens of its own.');
    const states = statesOf(group);
    if (states) {
      out.push('', 'Per-state tokens, valued by the design system\'s pattern rules (not written by hand):', '');
      if (states.variants?.length && Object.keys(states.perVariant ?? {}).length)
        out.push(`- ${code(`${group}.<variant>.<state>.<property>`)} for the variants ${states.variants.map(code).join(', ')}, the states ${states.states.map(code).join(', ')} and the properties ${Object.keys(states.perVariant ?? {}).map(code).join(', ')}.`);
      if (Object.keys(states.perComponent ?? {}).length)
        out.push(`- ${code(`${group}.<state>.<property>`)} for the states ${states.states.map(code).join(', ')} and the properties ${Object.keys(states.perComponent ?? {}).map(code).join(', ')}.`);
    }
  }
  return out;
}

/** Where a component is and is not, in each shipped system. */
function availabilitySection(name: string): string[] {
  const rows = manifests.map((manifest) => {
    const shipped = manifest.components.find((component) => component.name === name);
    if (shipped) {
      const out = manifest.omittedVariants[name];
      return [`${manifest.name} (${code(manifest.system)})`, 'Yes', out?.length ? `Variants left out: ${out.map(code).join(', ')}.` : ''];
    }
    const omitted = manifest.omitted.find((each) => each.name === name);
    if (omitted?.providedBy) {
      const carriers = manifests.filter((other) => other.chain.includes(omitted.providedBy!)).map((other) => code(other.system));
      return [`${manifest.name} (${code(manifest.system)})`, 'No', [`It lives in the ${code(omitted.providedBy)} layer, which this system does not extend; the systems that have it: ${carriers.join(', ')}.`, ...standIns(omitted)].join(' ')];
    }
    return [`${manifest.name} (${code(manifest.system)})`, 'No', [`Left out by the ${code(omitted?.omittedBy ?? manifest.system)} layer.`, ...standIns(omitted)].join(' ')];
  });
  return ['## Availability', '', table(['Design system', 'Has it', 'Notes'], rows)];
}

/**
 * What a system that does not ship a component uses for the same job, and why, where its manifest says: for one a
 * layer of its chain left out, and for one that lives in a layer it does not extend alike.
 */
export function standIns(omitted: ManifestOmission | undefined): string[] {
  return [omitted?.insteadUse?.length ? `Instead use: ${list(omitted.insteadUse)}.` : '', line(omitted?.reason)].filter(Boolean);
}

/** How a product names the component on each platform, and how far each platform is. */
function platformsSection(spec: Spec): string[] {
  const shipped = manifests.flatMap((manifest) => manifest.components).find((component) => component.name === spec.name);
  const status = statusOf(spec.name)?.platforms ?? {};
  const out = ['## Platforms', ''];
  if (shipped?.web) {
    out.push(
      shipped.web.tag
        ? `- Web: the element ${code(`<${shipped.web.tag}>`)}, registered by importing ${code(shipped.web.import)}${shipped.web.module ? ` (or only its own module, ${code(shipped.web.module)})` : ''}.`
        : `- Web: the class ${code(shipped.web.class!)} on the product's own element, styled by ${code(shipped.web.import)}.`,
    );
  }
  if (shipped?.react) out.push(`- React: ${code(shipped.react.name)} from ${code(shipped.react.import)}.`);
  if (out.length > 2) out.push('');
  out.push(table(['Platform', 'Name', 'Status'], platforms.map((p) => [en.platform[p] ?? p, spec.platforms[p]?.name ? code(spec.platforms[p].name) : '—', status[p] ?? spec.platforms[p]?.status ?? '—'])));
  // A prop or an event a platform names in its own idiom.
  const renamed = (kind: 'props' | 'events', names: string[]) =>
    names.flatMap((name) => {
      const each = platforms.map((p) => spec.platforms[p]?.[kind]?.[name]);
      return each.some((value) => value && value !== name) ? [[`${code(name)} (${kind === 'props' ? 'prop' : 'event'})`, ...each.map((value) => (value ? code(value) : '—'))]] : [];
    });
  const rows = [...renamed('props', spec.props.map((prop) => prop.name)), ...renamed('events', (spec.events ?? []).map((event) => event.name))];
  if (rows.length) out.push('', 'Names a platform gives in its own idiom:', '', table(['Spec', ...platforms.map((p) => en.platform[p] ?? p)], rows));
  out.push('', `Statuses: ${statuses.map((s) => `${code(s)} — ${en.statusHelp[s] ?? ''}`.trim()).join(' ')}`);
  return out;
}

/**
 * A component's page as Markdown, from its spec: what it is, where it is available, its names on each platform, its
 * anatomy, props, events, slots, items and states, its accessibility, every requirement with its id, and its tokens.
 */
export function componentMarkdown(name: string, site: URL): string {
  const spec = specs[name];
  if (!spec) throw new Error(`No spec named "${name}" in specs/.`);
  const row = statusOf(name);
  const shipped = manifests.flatMap((manifest) => manifest.components).find((component) => component.name === name);
  const tag = shipped?.web?.tag;
  const facts = [
    `- Category: ${en.category[spec.category as keyof typeof en.category] ?? spec.category}`,
    `- Level: ${spec.level}`,
    `- Listing: ${spec.listing}`,
    ...(spec.layer ? [`- Lives in the ${code(spec.layer)} layer`] : []),
    ...(spec.builtFrom?.length ? [`- Built from: ${list(spec.builtFrom)}`] : []),
    ...(() => {
      const users = usedIn(statusComponents, name).map((other: { name: string }) => other.name);
      return users.length ? [`- Used in: ${list(users)}`] : [];
    })(),
    ...(row?.docs ? [`- Page: ${absolute(site, row.docs)}`] : []),
    `- Spec: ${repository}/blob/main/specs/${name}.spec.json`,
  ];
  const out: string[] = [`# ${spec.title}`, '', `> ${line(spec.summary)}`, '', ...facts, '', ...availabilitySection(name), '', ...platformsSection(spec)];

  out.push('', '## Anatomy', '', ...spec.anatomy.map((part) => `- ${code(part.id)}${part.optional ? ' (optional)' : ''}: ${line(part.description)}`));
  out.push('', '## Props', '', spec.props.length ? propsTable(spec.props, tag) : 'None.');
  if (spec.events?.length) out.push('', '## Events', '', table(['Event', 'Description'], spec.events.map((event) => [code(event.name), `${line(event.description)}${fromNote(event)}`])));
  if (spec.slots?.length) out.push('', '## Slots', '', table(['Slot', 'Description'], spec.slots.map((slot) => [code(slot.name), `${line(slot.description)}${fromNote(slot)}`])));
  for (const item of spec.items ?? []) {
    out.push('', `## Item: ${code(item.name)}`, '', line(item.summary) || '—');
    if (item.component) out.push('', `It is a ${titleOf(item.component)}.`);
    const names = platforms.filter((p) => spec.platforms[p]?.items?.[item.name]?.name).map((p) => `${en.platform[p] ?? p} ${code(spec.platforms[p].items![item.name].name)}`);
    if (names.length) out.push('', `Names: ${names.join(', ')}.`);
    const itemTag = spec.platforms.web?.items?.[item.name]?.name;
    if (item.props?.length) out.push('', propsTable(item.props, itemTag && definedTags.has(itemTag) ? itemTag : undefined));
    if (item.events?.length) out.push('', table(['Event', 'Description'], item.events.map((event) => [code(event.name), line(event.description)])));
    if (item.slots?.length) out.push('', table(['Slot', 'Description'], item.slots.map((slot) => [code(slot.name), line(slot.description)])));
  }
  out.push('', '## States', '', spec.states.map(code).join(', '));

  const a11y = spec.accessibility;
  out.push('', '## Accessibility', '', `- Role: ${code(a11y.role)}`, `- Labeling: ${line(a11y.labeling)}`, `- Minimum target size: ${a11y.minimumTarget ? 'yes' : 'no'}`);
  if (a11y.keyboard.length) out.push('', table(['Keys', 'Action'], a11y.keyboard.map((key) => [key.keys, key.action])));
  if (a11y.notes?.length) out.push('', ...a11y.notes.map((note) => `- ${line(note)}`));

  out.push('', '## Behaviour', '', 'Requirements in EARS form, each with its stable id.', '', ...spec.behavior.map((rule) => `- **${rule.id}** ${line(rule.text)}`));
  out.push('', ...tokensSection(spec));
  return `${out.join('\n')}\n`;
}

// ── Indexes ──────────────────────────────────────────────────────────────

const pageLine = (site: URL, page: SitePage) => `- [${page.title}](${absolute(site, page.href)})${page.description ? `: ${line(page.description)}` : ''}`;
const componentLine = (site: URL, name: string, note?: string) => {
  const spec = specs[name];
  return `- [${titleOf(name)}](${absolute(site, markdownPath(name))}): ${[line(spec?.summary), note].filter(Boolean).join(' ')}`;
};

/** What the index says of the components a system does not ship, one line each. */
function omittedLines(site: URL, manifest: ComponentsManifest): string[] {
  return manifest.omitted.map((omitted) => {
    const carriers = manifests.filter((other) => other.components.some((component) => component.name === omitted.name)).map((other) => code(other.system));
    const place = omitted.providedBy ? `It lives in the ${code(omitted.providedBy)} layer, which ${manifest.name} does not extend.` : `${manifest.name} leaves it out.`;
    return componentLine(site, omitted.name, [place, ...standIns(omitted), `Only in: ${carriers.join(', ') || 'none of the shipped systems'}.`].join(' '));
  });
}

/** How a product chooses a system on the web: the default system's stylesheet, and one more for any other. */
function choosing(manifest: ComponentsManifest): string {
  const web = `${config.packages.npmScope}/web`;
  if (manifest.system === ns) return `On the web the default system's tokens are ${code(`${web}/tokens.css`)}.`;
  return `On the web, ${code(`${web}/tokens.css`)} then ${code(`${web}/systems/${manifest.system}.css`)}, which applies inside an element with ${code(`data-${ns}-system="${manifest.system}"`)}.`;
}

/**
 * An index of the site for one shipped design system (`/llms.txt` for the default one, `/systems/<id>/llms.txt` for
 * each): its components first — those its lists show, then those shown on request — then the components it does not
 * ship, the other systems, the site's pages, and the rest under "Optional".
 */
export function llmsIndex(site: URL, groups: PageGroup[], id: string = ns): string {
  const manifest = manifestOf(id);
  const isDefault = id === ns;
  const layer = systemLayers[id];
  const listed = manifest.components.filter((component) => component.listing !== listings.onRequest);
  const onRequest = manifest.components.filter((component) => component.listing === listings.onRequest);
  const variantsNote = (name: string) => (manifest.omittedVariants[name]?.length ? `(Variants ${manifest.name} leaves out: ${manifest.omittedVariants[name].join(', ')}.)` : undefined);
  const out: string[] = [
    `# ${config.name}${isDefault ? '' : `: ${manifest.name}`}`,
    '',
    `> ${summary}`,
    '',
    isDefault
      ? `This index follows the default design system, ${manifest.name} (${code(manifest.system)}): the components listed first are the ones it ships. A component it does not ship is listed apart, with what to use instead; it is only in the systems named there. Each other system has an index of its own (below).`
      : `This index follows the ${manifest.name} design system (${code(manifest.system)})${layer?.extends ? `, which extends ${code(layer.extends)}` : ''}: the components listed first are the ones it ships. ${line(layer?.description)}`,
    '',
    `${choosing(manifest)} Each component link is a Markdown page generated from the component's spec: its props, events, slots, states, accessibility, every requirement with its id, its tokens, and its name and status on each platform. The version is ${code(config.version)}, a 0.x prerelease: names and APIs may change between releases.`,
    '',
    `## Components in ${manifest.name}`,
    '',
    ...listed.map((component) => componentLine(site, component.name, variantsNote(component.name))),
  ];
  if (onRequest.length) {
    out.push(
      '',
      `## Advanced components in ${manifest.name}`,
      '',
      'Parts a product usually reaches through a component built from them.',
      '',
      ...onRequest.map((component) => {
        const users = usedIn(statusComponents, component.name).map((other: { name: string }) => other.name);
        return componentLine(site, component.name, [users.length ? `Used in: ${list(users)}.` : '', variantsNote(component.name)].filter(Boolean).join(' ') || undefined);
      }),
    );
  }
  if (manifest.omitted.length) out.push('', `## Components not in ${manifest.name}`, '', `Do not use these with ${manifest.name}: they are documented for the systems that ship them.`, '', ...omittedLines(site, manifest));
  out.push(
    '',
    '## Design systems',
    '',
    ...manifests.map((each) => `- [${each.name}](${absolute(site, systemIndexPath(each.system))}): ${line(systemLayers[each.system]?.description)}`),
  );
  for (const group of groups) if (group.pages.length) out.push('', `## ${group.title}`, '', ...group.pages.map((page) => pageLine(site, page)));
  out.push(
    '',
    '## Optional',
    '',
    ...(isDefault ? [`- [llms-full.txt](${absolute(site, '/llms-full.txt')}): The Markdown pages of every component ${manifest.name} ships, in one file.`] : []),
    `- [Status](${absolute(site, '/status/')}): Which component exists on which platform, generated from the repository.`,
    `- [Source repository](${repository}): The tokens (${code('tokens/')}), the specs (${code('specs/')}) and every platform's package.`,
  );
  return `${out.join('\n')}\n`;
}

/**
 * Every page of the components the default system ships, in one file, after the default index's head: what a model
 * that reads one file needs to build with the default system.
 */
export function llmsFull(site: URL): string {
  const head = [
    `# ${config.name}`,
    '',
    `> ${summary}`,
    '',
    `This file holds the page of every component the default design system, ${defaultManifest.name} (${code(defaultManifest.system)}), ships, generated from its spec. The index is ${absolute(site, '/llms.txt')}; a component ${defaultManifest.name} does not ship is not here.`,
  ].join('\n');
  // Each page's headings one level down, so that the file has one title.
  const pages = defaultManifest.components.map((component) => componentMarkdown(component.name, site).replace(/^(#{1,5}) /gm, '#$1 '));
  return `${head}\n\n${pages.join('\n')}`;
}

/**
 * The Markdown version of a page of the site, by the page's id (`components/button`, `ja/components/button`): a
 * component's page has one, in English; no other page has.
 */
export function markdownAlternate(id: string): string | undefined {
  const spec = specOfPage(id);
  return spec ? markdownPath(spec.name) : undefined;
}

// Copies the generated token stylesheets into dist/ (the default system, plus one opt-in sheet per preset), writes the optional
// stylesheets (icons, text, prose, link, code, table, accordion, table-of-contents, description-list, figure, app-shell, page-header, tree-view, breadcrumbs, shape, callout) and produces a self-contained, callout, empty-state) and produces a self-contained, avatar) and produces a self-contained
// bundle (Lit included) for <script type="module"> use, demos and the test harness.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { writeThirdPartyLicenses } from '../../tools/src/third-party.js';
import { declarations, resolved, tokensIn, writeConditions } from './conditions.js';

fs.mkdirSync('dist', { recursive: true });
// Letter-spacing follows the script of the text (src/styles/script-tracking.ts): one source, shared with the
// components' shadow styles. A light-DOM stylesheet writes a `script-tracking` mark where the rules go, and every
// stylesheet is read through `sheet()`, which writes them in place.
const { writeScriptTracking } = await import('../dist/styles/script-tracking.js');
const sheet = (file) => writeScriptTracking(fs.readFileSync(file, 'utf8'));
// dist/tokens.css is the generated tokens, and nothing else. It registers no custom property: one registered name in
// a document makes every transition that starts on a page of ten thousand tokens dear (src/styles/registered-properties.ts),
// and this is the sheet every page loads.
fs.copyFileSync('src/generated/tokens.css', 'dist/tokens.css');
fs.writeFileSync('dist/text.css', sheet('src/styles/text.css'));
// The callout before its element is defined (CLO-13, CLO-22): the box its server-rendered content keeps a place in.
fs.writeFileSync('dist/callout.css', sheet('src/components/callout/callout.css'));
// The avatar before its element is defined (AVT-1, AVT-16): the box it will have, so a page of avatars does not move.
fs.copyFileSync('src/components/avatar/avatar.css', 'dist/avatar.css');
// The empty state before its element is defined (EMP-1, EMP-2): the place its server-rendered words keep.
fs.writeFileSync('dist/empty-state.css', sheet('src/components/empty-state/empty-state.css'));
// The menu drawn in place before its elements are defined (MNU-19's verify): the block size its surface will have.
fs.copyFileSync('src/components/menu/menu.css', 'dist/menu.css');
// The menubar before its elements are defined, and where script does not run (MBR-45): its link items, as links that work.
fs.copyFileSync('src/components/menubar/menubar.css', 'dist/menubar.css');
// Prose leaves alone what is inside a Tanrei element (PRS-16): the stylesheet's source names the opt-out class, and the
// tag names of every element this package defines are written beside it here, from the generated manifest — so a new
// component is an island without anyone editing a list (src/styles/prose.test.ts holds the two together).
const NOT_PROSE = ':where(.tanrei-not-prose)';
const tags = JSON.parse(fs.readFileSync('custom-elements.json', 'utf8'))
  .modules.flatMap((module) => module.declarations ?? [])
  .map((declaration) => declaration.tagName)
  .filter(Boolean)
  .sort();
// The corner-smoothing rule is one source (src/styles/shape.ts, shared by the components' shadow styles); for a
// light-DOM box it is the same text as a stylesheet.
const { SHAPE_CSS } = await import('../dist/styles/shape.js');
// A stylesheet that draws a glyph of the icon set in a generated box names the box's size and leaves the optical-size
// axis to the one source that writes it (src/styles/icons.ts): the condition and the axes are written in place here.
const { writeGlyphAxes } = await import('../dist/styles/icons.js');
// The link (specs/link.spec.json) is a class on the product's anchor: its stylesheet is one parent rule, and the rules
// between its two `link:rules` marks are written twice — into dist/link.css as they are, and into dist/prose.css under
// prose's own anchors (PRS-16, PRS-17), so rendered Markdown needs no class and the two can never differ. The corners
// are the shared rule, written for the anchor in place of the `link:shape` mark (the anchor carries the radius token).
const between = (text, name) => {
  const [start, end] = [`/* ${name} */`, `/* ${name}:end */`];
  if (!text.includes(start) || !text.includes(end)) throw new Error(`${name.split(':')[0]}.css: the mark "${name}" is missing`);
  return text.slice(text.indexOf(start) + start.length, text.indexOf(end));
};
const LINK_SHAPE = '/* link:shape */';
const linkSource = writeGlyphAxes(sheet('src/styles/link.css'));
if (!linkSource.includes(LINK_SHAPE)) throw new Error('link.css: nowhere to write the corner rule');
const link = linkSource.replace(LINK_SHAPE, SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/^/gm, '    ').trimStart());
fs.writeFileSync('dist/link.css', link);
const LINK_RULES = '/* link:rules */';
// A rule that begins `:where(a, b, c)` — a list of names: tags, classes, attributes — is written once per name,
// `:where(a)…, :where(b)…, :where(c)…`: the same elements at the same (zero) specificity, in the one form every engine
// files under the name, so that it is tried on the elements of that name and not on every element of the document. A
// list that holds anything else (a pseudo-class alone, a combinator) is left as it is: src/styles/prose.test.ts counts
// the rules that are tried on every element, and src/styles/prose.perf.test.ts measures what they cost.
const parts = (list) => {
  const out = [''];
  let depth = 0;
  for (const char of list) {
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (char === ',' && depth === 0) out.push('');
    else out[out.length - 1] += char;
  }
  return out.map((part) => part.trim());
};
const NAMED = /^(?:[a-z][\w-]*|\.[\w-]+|\[[\w-]+(?:[~|^$*]?=[^\]]*)?\])(?:\.[\w-]+|\[[^\]]*\]|:(?:has|not|where|is)\((?:[^()]|\([^()]*\))*\)|:[\w-]+)*$/;
const byName = (text) =>
  text.replace(/^( +):where\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)(.*?)( \{|,)$/gm, (line, indent, list, rest, end) => {
    const names = parts(list);
    return names.length > 1 && names.every((name) => NAMED.test(name)) ? `${indent}${names.map((name) => `:where(${name})${rest}`).join(', ')}${end}` : line;
  });
const prose = writeGlyphAxes(sheet('src/styles/prose.css'));
if (!prose.includes(NOT_PROSE) || !tags.length) throw new Error('prose.css: nothing to write the Tanrei tag names into, or no tag names');
if (!prose.includes(LINK_RULES)) throw new Error('prose.css: nowhere to write the link\'s rules');
// Code (specs/inline-code.spec.json, specs/code-block.spec.json). code.css holds inline code — a class
// on the product's `code`, one parent rule, as the link is — and the build adds the code block's light-DOM rules to it
// (src/components/code-block/code-block.light.ts, which the element adopts too). Into dist/prose.css go inline code's
// rules, under every `code` that is prose's own and not in a `pre`, with what an ancestor chooses for the runs inside
// it; and the look of a bare `pre`. The corners are the shared rule, written in place of the `code:shape` mark.
const CODE_SHAPE = '/* code:shape */';
const CODE_RULES = '/* code:rules */';
const CODE_BLOCK = '/* code:block */';
const codeSource = sheet('src/styles/code.css');
if (!codeSource.includes(CODE_SHAPE)) throw new Error('code.css: nowhere to write the corner rule');
const { CODE_BLOCK_CSS, BARE_BLOCK_CSS, SYNTAX_ROLES } = await import('../dist/components/code-block/code-block.light.js');
// A block that is not upgraded: rules of code.css alone, which the element does not carry.
const { CODE_BLOCK_BEFORE_CSS } = await import('../dist/components/code-block/code-block.before.js');
// The syntax roles are the values of a token axis (comp.code-block.syntax): the rules of code.css are one
// per role the generated tokens name. The element's list is held to that axis here — a role added to the tokens, or
// taken from them, stops the build until the list follows.
const syntaxAxis = [...new Set([...fs.readFileSync('src/generated/tokens.css', 'utf8').matchAll(/--tanrei-comp-code-block-syntax-color-([a-z0-9-]+):/g)].map((match) => match[1]))].sort();
if (syntaxAxis.join(' ') !== [...SYNTAX_ROLES].sort().join(' ')) throw new Error(`code.css: the syntax roles of the generated tokens (${syntaxAxis.join(', ')}) are not the element's (${[...SYNTAX_ROLES].sort().join(', ')}): src/components/code-block/code-block.light.ts`);
const code = codeSource.replace(CODE_SHAPE, SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/^/gm, '    ').trimStart());
fs.writeFileSync('dist/code.css', `${code}\n/* The code block: a block that is not upgraded, drawn where the element will draw it; then the lines and the runs (src/components/code-block/code-block.before.ts, code-block.light.ts). */\n${CODE_BLOCK_BEFORE_CSS}${CODE_BLOCK_CSS}`);
if (!prose.includes(CODE_RULES) || !prose.includes(CODE_BLOCK)) throw new Error('prose.css: nowhere to write the code rules');
const withCode = (text) =>
  text
    .replace(CODE_RULES, between(code, 'code:rules').replace(/^/gm, '  ').trim())
    .replace(CODE_BLOCK, BARE_BLOCK_CSS.replace(/^/gm, '      ').trim());
fs.writeFileSync(
  'dist/prose.css',
  `${withCode(byName(prose).replaceAll(NOT_PROSE, ['.tanrei-not-prose', ...new Set(tags)].map((name) => `:where(${name})`).join(', ')).replace(LINK_RULES, between(link, 'link:rules').replace(/^/gm, '  ').trim()))}\n@layer tanrei.components {\n  ${between(link, 'link:keyframes').trim()}\n  ${between(code, 'code:context').trim()}\n}\n`,
);
// The steps (specs/steps.spec.json) and the previous and next links (specs/previous-next-links.spec.json) are classes on the product's own
// elements, one stylesheet each. The corners are the shared rule, written for the marker's ring in place of the
// `steps:shape` mark and for an item in place of `previous-next-links:shape`. The steps' rules are also written at the end of
// dist/prose.css: prose reaches into a set of steps (it is not an island) and both stylesheets have no specificity, so
// the one loaded last would decide the list's inset, gaps, measure and the title's text style — with the same rules in
// both, a set of steps is drawn the same whichever comes last (src/styles/steps.test.ts holds the two together).
const shapeFor = (selector) => SHAPE_CSS.replace(/\[data-tanrei-shape\]::before,[\s\S]*$/, '').replaceAll(':where([data-tanrei-shape])', selector).replaceAll('[data-tanrei-shape]', selector).replace(/^/gm, '  ').trim();
const STEPS_SHAPE = '/* steps:shape */';
const stepsSource = sheet('src/styles/steps.css');
if (!stepsSource.includes(STEPS_SHAPE)) throw new Error('steps.css: nowhere to write the corner rule');
const steps = stepsSource.replace(STEPS_SHAPE, shapeFor(':where(.tanrei-steps) > :where(li)::before'));
fs.writeFileSync('dist/steps.css', steps);
fs.appendFileSync('dist/prose.css', `/* The steps' own rules (steps.css), said again after prose's: see scripts/build.js. */\n${between(steps, 'steps:rules').trim()}\n`);
// The timeline (specs/timeline.spec.json) is the steps' form: a class on the product's own ordered list and one
// stylesheet. The corners are the shared rule, written at the `timeline:shape` mark for the two boxes a marker can be —
// the item's generated box, and the product's own glyph. Its rules are said again in dist/prose.css for the steps'
// reason, after the steps' (src/styles/timeline.test.ts holds the two together).
const TIMELINE_SHAPE = '/* timeline:shape */';
const TIMELINE_MARKERS = [':where(.tanrei-timeline) > :where(li)::before', ':where(.tanrei-timeline) > :where(li) > :is(.tanrei-timeline-marker, .tanrei-timeline-marker.tanrei-icon)'];
const timelineSource = writeGlyphAxes(sheet('src/styles/timeline.css'));
if (!timelineSource.includes(TIMELINE_SHAPE)) throw new Error('timeline.css: nowhere to write the corner rule');
const timeline = timelineSource.replace(TIMELINE_SHAPE, TIMELINE_MARKERS.map(shapeFor).join('\n  '));
fs.writeFileSync('dist/timeline.css', timeline);
fs.appendFileSync('dist/prose.css', `/* The timeline's own rules (timeline.css), said again after prose's: see scripts/build.js. */\n${between(timeline, 'timeline:rules').trim()}\n`);
const PREVIOUS_NEXT_SHAPE = '/* previous-next-links:shape */';
const previousNextSource = writeGlyphAxes(sheet('src/styles/previous-next-links.css'));
if (!previousNextSource.includes(PREVIOUS_NEXT_SHAPE)) throw new Error('previous-next-links.css: nowhere to write the corner rule');
fs.writeFileSync('dist/previous-next-links.css', previousNextSource.replace(PREVIOUS_NEXT_SHAPE, shapeFor(':where(.tanrei-previous-next-links-item)')));
// The table (specs/table.spec.json) is an element with no shadow root and one stylesheet that draws everything:
// dist/table.css is the source as it is, for a page that draws its tables before any script runs, and the same text
// (without its comments) is written into the element, which adds it to the root it is connected to — the compiled
// module here, the bundle below.
const TABLE_CSS_NAME = 'TANREI_TABLE_CSS';
const tableSource = sheet('src/styles/table.css');
fs.writeFileSync('dist/table.css', tableSource);
const tableText = JSON.stringify(
  tableSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n'),
);
const tableModule = fs.readFileSync('dist/components/table/table.js', 'utf8');
// Once in the source (a `declare const`, which is not emitted, and one read of it); a module the build already wrote
// into holds the text instead, and is written again from the compiler's output only when that changes.
if (tableModule.split(TABLE_CSS_NAME).length === 2) fs.writeFileSync('dist/components/table/table.js', tableModule.replace(TABLE_CSS_NAME, () => tableText));
else if (!tableModule.includes('tanrei-table) {') && !tableModule.includes(':where(tanrei-table)')) throw new Error(`table.js: expected one ${TABLE_CSS_NAME} to write table.css into`);
// The description list (specs/description-list.spec.json) and the figure (specs/figure.spec.json) are the table's
// form: an element with no shadow root and one stylesheet, written to dist/ for the page and into the element. The
// figure's frame takes the corner-smoothing rule in place of its `figure:shape` mark, as the link and inline code do.
const FIGURE_SHAPE = '/* figure:shape */';
const figureSource = sheet('src/styles/figure.css');
if (!figureSource.includes(FIGURE_SHAPE)) throw new Error('figure.css: nowhere to write the corner rule');
// The app shell (specs/app-shell.spec.json) and the page header (specs/page-header.spec.json) are the same form around
// the product's own regions and the page's own heading. Each decides a layout by a width that is a token — the window's
// two classes, the width from which a head's actions stand beside its title — and a custom property cannot stand in a
// `@media` or a `@container` condition: the source names the token (`token(comp.app-shell.breakpoint.medium)`) and the
// resolved value is written in its place here, in rem, from the generated tokens (scripts/conditions.js). The skip
// link's box takes the corner-smoothing rule in place of the `app-shell:shape` mark.
const APP_SHELL_SHAPE = '/* app-shell:shape */';
const appShellSource = sheet('src/styles/app-shell.css');
if (!appShellSource.includes(APP_SHELL_SHAPE)) throw new Error('app-shell.css: nowhere to write the corner rule');
// The tree view (specs/tree-view.spec.json) is the same form around the product's own nested lists. A row's container
// is the row's `::after` and the ripple's layer a box of its own in the row: each takes the corner-smoothing rule, in
// place of the `tree-view:shape` mark.
const TREE_VIEW_SHAPE = '/* tree-view:shape */';
const treeViewSource = writeGlyphAxes(sheet('src/styles/tree-view.css'));
if (!treeViewSource.includes(TREE_VIEW_SHAPE)) throw new Error('tree-view.css: nowhere to write the corner rule');
const TREE_VIEW_ROW = ':where(tanrei-tree-view) :where(li) > :where(:first-child:not(ul, ol))';
// The link card (specs/link-card.spec.json) is the same form around the product's own anchor. It stands its picture
// beside its text from a width that is a token (comp.link-card.layout.beside-min-width), written into its `@container`
// condition as the page header's is; and the anchor — the card's container — takes the corner-smoothing rule in place
// of the `link-card:shape` mark.
const LINK_CARD_SHAPE = '/* link-card:shape */';
const linkCardSource = writeGlyphAxes(sheet('src/styles/link-card.css'));
if (!linkCardSource.includes(LINK_CARD_SHAPE)) throw new Error('link-card.css: nowhere to write the corner rule');
const SKELETON_SHAPE = '/* skeleton:shape */';
const skeletonSource = sheet('src/styles/skeleton.css');
if (!skeletonSource.includes(SKELETON_SHAPE)) throw new Error('skeleton.css: nowhere to write the corner rule');
const CONDITIONED = [
  { file: 'app-shell', source: appShellSource.replace(APP_SHELL_SHAPE, shapeFor(":where(tanrei-app-shell) > [slot='skip-link']:focus-visible::after")) },
  { file: 'page-header', source: sheet('src/styles/page-header.css') },
  { file: 'link-card', source: linkCardSource.replace(LINK_CARD_SHAPE, shapeFor(':where(tanrei-link-card) > :where(a)')) },
];
const BREADCRUMBS_SHAPE = '/* breadcrumbs:shape */';
const breadcrumbsSource = writeGlyphAxes(sheet('src/styles/breadcrumbs.css'));
if (!breadcrumbsSource.includes(BREADCRUMBS_SHAPE)) throw new Error('breadcrumbs.css: nowhere to write the corner rule');
const defaultTokens = declarations(fs.readFileSync('src/generated/tokens.css', 'utf8'));
const LIGHT_SHEETS = [
  { name: 'TANREI_APP_SHELL_CSS', file: 'app-shell', module: 'dist/components/app-shell/app-shell.js', source: writeConditions(CONDITIONED[0].source, defaultTokens) },
  { name: 'TANREI_PAGE_HEADER_CSS', file: 'page-header', module: 'dist/components/page-header/page-header.js', source: writeConditions(CONDITIONED[1].source, defaultTokens) },
  { name: 'TANREI_LINK_CARD_CSS', file: 'link-card', module: 'dist/components/link-card/link-card.js', source: writeConditions(CONDITIONED[2].source, defaultTokens) },
  // The breadcrumbs (specs/breadcrumbs.spec.json) keep a shadow root for what the product did not write and let one
  // stylesheet draw the product's own anchors in the document, as the table of contents does. A level's
  // corners are the shared rule, written in place of the `breadcrumbs:shape` mark.
  { name: 'TANREI_BREADCRUMBS_CSS', file: 'breadcrumbs', module: 'dist/components/breadcrumbs/breadcrumbs.js', source: breadcrumbsSource.replace(BREADCRUMBS_SHAPE, shapeFor(':where(tanrei-breadcrumbs) > :where(a)')) },
  { name: 'TANREI_DESCRIPTION_LIST_CSS', file: 'description-list', module: 'dist/components/description-list/description-list.js', source: sheet('src/styles/description-list.css') },
  {
    name: 'TANREI_FIGURE_CSS',
    file: 'figure',
    module: 'dist/components/figure/figure.js',
    source: figureSource.replace(FIGURE_SHAPE, SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/^/gm, '    ').trimStart()),
  },
  // The skeleton (specs/skeleton.spec.json) is the same form around the product's own layout and its placeholders: the
  // stylesheet is the whole component before any script runs. A placeholder's box and the two bars a text placeholder
  // generates take the corner-smoothing rule in place of the `skeleton:shape` mark.
  {
    name: 'TANREI_SKELETON_CSS',
    file: 'skeleton',
    module: 'dist/components/skeleton/skeleton.js',
    source: skeletonSource.replace(SKELETON_SHAPE, [':where(.tanrei-skeleton-placeholder)', ':where(.tanrei-skeleton-placeholder)::before', ':where(.tanrei-skeleton-placeholder)::after'].map((selector) => shapeFor(selector)).join('\n  ')),
  },
  {
    name: 'TANREI_TREE_VIEW_CSS',
    file: 'tree-view',
    module: 'dist/components/tree-view/tree-view.js',
    source: treeViewSource.replace(TREE_VIEW_SHAPE, [`${TREE_VIEW_ROW}::after`, `${TREE_VIEW_ROW} > :where(.ripple)`].map((selector) => shapeFor(selector)).join('\n  ')),
  },
].map((light) => {
  fs.writeFileSync(`dist/${light.file}.css`, light.source);
  const text = JSON.stringify(
    light.source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n'),
  );
  const compiled = fs.readFileSync(light.module, 'utf8');
  // Once in the source; a module the build already wrote into holds the text instead (see the table's, above).
  if (compiled.split(light.name).length === 2) fs.writeFileSync(light.module, compiled.replace(light.name, () => text));
  else if (!compiled.includes(`:where(tanrei-${light.file})`)) throw new Error(`${light.file}.js: expected one ${light.name} to write ${light.file}.css into`);
  return [light.name, text];
});
// The accordion (specs/accordion.spec.json) is the same form around the product's own `details` elements:
// dist/accordion.css draws the whole look and every state before any script runs, and the same text is written into
// the element. Its corners are the shared rule, written in place of the `accordion:shape` mark.
const ACCORDION_CSS_NAME = 'TANREI_ACCORDION_CSS';
const ACCORDION_SHAPE = '/* accordion:shape */';
const accordionSource = writeGlyphAxes(sheet('src/styles/accordion.css'));
if (!accordionSource.includes(ACCORDION_SHAPE)) throw new Error('accordion.css: nowhere to write the corner rule');
const accordionCss = accordionSource.replace(ACCORDION_SHAPE, SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/^/gm, '    ').trimStart());
fs.writeFileSync('dist/accordion.css', accordionCss);
const accordionText = JSON.stringify(
  accordionCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n'),
);
const accordionModule = fs.readFileSync('dist/components/accordion/accordion.js', 'utf8');
if (accordionModule.split(ACCORDION_CSS_NAME).length === 2) fs.writeFileSync('dist/components/accordion/accordion.js', accordionModule.replace(ACCORDION_CSS_NAME, () => accordionText));
else if (!accordionModule.includes(':where(tanrei-accordion)')) throw new Error(`accordion.js: expected one ${ACCORDION_CSS_NAME} to write accordion.css into`);
// The table of contents (specs/table-of-contents.spec.json) keeps a shadow root for what the product did not write and
// lets one stylesheet draw the product's own list of anchors in the document: dist/table-of-contents.css
// draws the list before any script runs, and the same text is written into the element, which adds it to the root it
// is connected to. A row's corners are the shared rule, written in place of the `table-of-contents:shape` mark.
const TABLE_OF_CONTENTS_CSS_NAME = 'TANREI_TABLE_OF_CONTENTS_CSS';
const TABLE_OF_CONTENTS_SHAPE = '/* table-of-contents:shape */';
const tableOfContentsSource = sheet('src/styles/table-of-contents.css');
if (!tableOfContentsSource.includes(TABLE_OF_CONTENTS_SHAPE)) throw new Error('table-of-contents.css: nowhere to write the corner rule');
const tableOfContentsCss = tableOfContentsSource.replace(TABLE_OF_CONTENTS_SHAPE, SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/^/gm, '    ').trimStart());
fs.writeFileSync('dist/table-of-contents.css', tableOfContentsCss);
const tableOfContentsText = JSON.stringify(
  tableOfContentsCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n'),
);
const tableOfContentsFile = 'dist/components/table-of-contents/table-of-contents.js';
const tableOfContentsModule = fs.readFileSync(tableOfContentsFile, 'utf8');
if (tableOfContentsModule.split(TABLE_OF_CONTENTS_CSS_NAME).length === 2) fs.writeFileSync(tableOfContentsFile, tableOfContentsModule.replace(TABLE_OF_CONTENTS_CSS_NAME, () => tableOfContentsText));
else if (!tableOfContentsModule.includes(':where(tanrei-table-of-contents)')) throw new Error(`table-of-contents.js: expected one ${TABLE_OF_CONTENTS_CSS_NAME} to write table-of-contents.css into`);
// The icon style is one source too (src/styles/icons.ts): the components draw their own icons with the same declarations.
const { ICONS_CSS } = await import('../dist/styles/icons.js');
fs.writeFileSync('dist/icons.css', ICONS_CSS);
fs.writeFileSync('dist/shape.css', `/* Corner smoothing for a light-DOM box: put data-tanrei-shape on it and name its radius token in --tanrei-corner-radius (and set --tanrei-corner-pill: 1 on a pill). */\n@layer tanrei.components {\n${SHAPE_CSS.replace(/^/gm, '  ')}\n}\n`);
fs.rmSync('dist/systems', { recursive: true, force: true });
fs.cpSync('src/generated/systems', 'dist/systems', { recursive: true });
// Each shipped system's components manifest, the default's among them (`@tanrei/web/systems/<id>.components.json`):
// what the system ships, with the module that registers each component, generated beside the system's tokens.
const manifests = fs.readdirSync('../../tokens/generated', { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(`../../tokens/generated/${entry.name}/components.json`));
for (const { name } of manifests) fs.copyFileSync(`../../tokens/generated/${name}/components.json`, `dist/systems/${name}.components.json`);
// A shipped system that moves a width a condition is written from gets that stylesheet written for it, beside its
// tokens: `dist/systems/<id>.app-shell.css`, `dist/systems/<id>.page-header.css` (`@tanrei/web/systems/<id>.app-shell.css`).
// A system that only restyles needs none — the default's conditions are its own — and none is written.
const conditionedForSystems = [];
for (const system of fs.readdirSync('src/generated/systems').filter((file) => file.endsWith('.css'))) {
  const values = declarations(fs.readFileSync(`src/generated/systems/${system}`, 'utf8'), defaultTokens);
  for (const { file, source } of CONDITIONED) {
    if (tokensIn(source).every((id) => resolved(id, values) === resolved(id, defaultTokens))) continue;
    const name = `${system.replace(/\.css$/, '')}.${file}.css`;
    fs.writeFileSync(`dist/systems/${name}`, writeConditions(source, values));
    conditionedForSystems.push(`dist/systems/${name}`);
  }
}
// The bundle defines every component this package has: the main entry's and those of the layers' own entries
// (`@tanrei/web/m3-like`), for demos and the test harness, which draw a component under the system it lives in.
const bundle = await build({
  stdin: { contents: "export * from './src/index.ts';\nexport * from './src/m3-like.ts';\n", resolveDir: '.', loader: 'ts', sourcefile: 'tanrei.bundle.ts' },
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: true,
  metafile: true,
  outfile: 'dist/tanrei.bundle.js',
  // A development bundle: debug reports (src/primitives/report.ts) stay on. esbuild would otherwise define
  // process.env.NODE_ENV as "production" for a minified browser bundle.
  define: { 'process.env.NODE_ENV': '"development"', [TABLE_CSS_NAME]: tableText, [ACCORDION_CSS_NAME]: accordionText, [TABLE_OF_CONTENTS_CSS_NAME]: tableOfContentsText, ...Object.fromEntries(LIGHT_SHEETS) },
});
// The bundle inlines Lit, whose licence asks for its copyright notice and licence text in every copy: they are
// written beside it, from the packages the bundle was made from.
writeThirdPartyLicenses('dist', Object.keys(bundle.metafile.inputs).map((input) => path.resolve(input)), { what: 'dist/tanrei.bundle.js (and its source map)' });
// `@tanrei/web/links/node`, the build-time helper (src/links/node/REQUIREMENTS.md). It runs under Node only
// and is JavaScript with types written beside it, so the compiler above does not emit it: its files are copied as
// they are. Nothing the bundle above is made from imports it (LKD-1; src/links/node/test/surface.test.mjs).
fs.rmSync('dist/links/node', { recursive: true, force: true });
fs.mkdirSync('dist/links/node', { recursive: true });
for (const file of fs.readdirSync('src/links/node')) if (/\.(?:js|d\.ts)$/.test(file)) fs.copyFileSync(`src/links/node/${file}`, `dist/links/node/${file}`);
fs.chmodSync('dist/links/node/cli.js', 0o755);
console.log('✔ web: dist/tokens.css, dist/icons.css, dist/text.css, dist/prose.css, dist/link.css, dist/steps.css, dist/timeline.css, dist/previous-next-links.css, dist/code.css, dist/table.css, dist/accordion.css, dist/table-of-contents.css, dist/description-list.css, dist/figure.css, dist/app-shell.css, dist/page-header.css, dist/link-card.css, dist/tree-view.css, dist/breadcrumbs.css, dist/skeleton.css, dist/shape.css, dist/callout.css, dist/empty-state.css, dist/avatar.css, dist/menubar.css, dist/systems/*.css, dist/systems/*.components.json, dist/tanrei.bundle.js' + conditionedForSystems.map((file) => `, ${file}`).join(''));

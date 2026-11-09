// Where each part of a component's anatomy is drawn on the web: `platforms.web.parts` of a spec, read by the docs'
// anatomy and measurement diagrams, which outline and measure what each value names. The anatomy itself is
// platform-neutral; this is the web's mapping of it, like `props` and `events`. What `validate` holds of it is here.

/**
 * What a value may say it is of its target, where the part is not the target's box: the border or ring drawn at its
 * edge, the focus indicator drawn on it, the scrim a modal target draws behind itself (`::backdrop`).
 */
export const ASPECTS = ['outline', 'focus-ring', 'backdrop'];

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// The light-DOM parts no target can name: a native element or a `data-*` attribute of the product's own markup, with
// no CSS part, no class of the stylesheet and no element of the manifest to find it by.
const LIGHT = 'are drawn on light-DOM elements no target can name (a native element or a data-* attribute, with no CSS part, class or element of the manifest)';
// The shadow-tree parts the element draws without exporting them.
const UNEXPORTED = 'are drawn in the shadow tree on elements that export no CSS part';
// A modal whose every part can be named, but whose figure the docs cannot yet draw over its open fixture.
const MODAL = 'every part can be named, but the docs\' anatomy figure over its open modal fixture does not yet number them reliably (apps/docs/test/browser/blueprint-pages.test.mjs)';

/**
 * The components the web draws whose `parts` cannot be written yet, by name, with why: most have anatomy parts no
 * target can name, and the docs draw no figure for a spec that maps only some of its ids; three are modal, and the
 * docs' figure over their open fixture does not yet number their parts reliably. Their specs write no `parts`, and the
 * check that every spec the web draws writes it passes over them. Each comes off this list in the change that writes
 * its `parts`, which `partsProblems` holds.
 *
 * TODO: what is missing is a target for an element of the product's light DOM (a native element, an attribute
 * selector), a CSS part on each unexported shadow element named here, a target outside the host (the avatar's group
 * around it, the popover's anchor), and an anatomy figure that numbers the parts of an open modal (the dialog's and
 * the modal layer's number none on some runs; the image preview's numbers for its zoom and close buttons overlap);
 * once the grammar, the web and the figure have them, map these components and empty the list.
 */
export const PARTS_PENDING = {
  accordion: `item, container, label, supporting-text, trailing-text, content, outline and focus-ring ${LIGHT}: the product's <details>, <summary>, [data-supporting-text] and [data-trailing-text]`,
  'app-shell': `menu-button ${LIGHT}: the element marked [data-app-shell-menu]`,
  avatar: 'group and overflow are drawn by <tanrei-avatar-group>, around the avatar: a target names only what is inside the host',
  breadcrumbs: `container and label ${LIGHT}: the product's anchors`,
  calendar: `navigation and weekday-row ${UNEXPORTED}: the arrows' span and the weekdays' row of the grid`,
  carousel: `playback.icon ${UNEXPORTED}: the icon inside the playback button`,
  'code-block': `prompt ${LIGHT}: a line's [data-line-prompt]`,
  'date-time-picker': `divider, wheels and time-display ${UNEXPORTED}`,
  'description-list': `fact, term, value and divider ${LIGHT}: the product's <div>, <dt> and <dd>`,
  dialog: MODAL,
  figure: `every part ${LIGHT}: its [data-part] elements, <header> and <figcaption>`,
  'image-preview': MODAL,
  'inline-code': `label ${LIGHT}: the text of the code element`,
  link: `label ${LIGHT}: the text of the anchor`,
  'link-card': `title, description, site, site-icon, host and media ${LIGHT}: their [data-part] elements`,
  'marquee-text': `copy ${UNEXPORTED}: the repeated copy of the text`,
  'modal-layer': MODAL,
  'number-ticker': `digit ${UNEXPORTED}: each place of the number`,
  'page-header': `eyebrow, title, description, meta and actions ${LIGHT}: their [data-part] elements and the product's heading and paragraph`,
  popover: 'anchor is the product\'s element the popover is anchored to, outside the host: a target names only what is inside the host',
  prose: `heading, paragraph, list, quote, rule, description-list and block ${LIGHT}: the product's own HTML elements`,
  'scroll-area': `scroll-edge ${UNEXPORTED}: the fade at each scrollable edge`,
  search: `leading-icon, clear-button, header, query-row and suggestion ${UNEXPORTED}, and mark ${LIGHT}: the product's <mark> in a result's excerpt`,
  steps: `step and body ${LIGHT}: the list's items and their content`,
  table: `caption, header-row, header-cell, sort-button, row, row-header, selection-cell, cell, divider, stripe, selected-row, placeholder-row, empty, footer-row and status ${LIGHT}: the product's table elements and [data-part] rows`,
  'table-of-contents': `container, label and focus-ring ${LIGHT}: the product's anchors; supporting-text ${UNEXPORTED}`,
  timeline: `item and body ${LIGHT}: the list's items and their content`,
  'tree-view': `filter.status, item, label, supporting-text, trailing, trailing-text, loading-row, pinned-row and new-row ${LIGHT}: the product's list items and their data-* children`,
};

/**
 * One value of `parts`, read: `{ noBox }` for a part with no box of its own, otherwise the target and its aspect.
 * A target is `{ host }`, `{ part }`, `{ slot }` (the default slot is ''), `{ child, part? }` or `{ className }`, where
 * `child` is the path of child elements, each inside the one before it, and `part` one of the last one's parts. A word that
 * is a tag of `tags` is a child element; any other is a CSS part, and only the last word may be one. `problem` says
 * what cannot be read.
 */
export function readPart(value, tags) {
  if (value && typeof value === 'object') return { noBox: value.noBox };
  const [target, aspect, ...rest] = value.split('@');
  if (rest.length) return { problem: 'names more than one aspect' };
  if (aspect !== undefined && !ASPECTS.includes(aspect)) return { problem: `names the aspect "@${aspect}", which is none of ${ASPECTS.map((a) => `@${a}`).join(', ')}` };
  const read = (() => {
    if (target === 'host') return { host: true };
    if (target === 'slot') return { slot: '' };
    if (target.startsWith('slot:')) return NAME.test(target.slice(5)) ? { slot: target.slice(5) } : null;
    if (target.startsWith('.')) return NAME.test(target.slice(1)) ? { className: target.slice(1) } : null;
    const words = target.split(' ');
    if (!words.every((word) => NAME.test(word))) return null;
    const last = words.at(-1);
    const path = tags.has(last) ? words : words.slice(0, -1);
    if (!path.every((word) => tags.has(word))) return null;
    if (!path.length) return { part: last };
    return path.length === words.length ? { child: path } : { child: path, part: last };
    return null;
  })();
  if (!read) return { problem: `is not a target (host, <css part>, slot, slot:<name>, <child tag>…, <child tag>… <css part>, .<class>)` };
  return { ...read, aspect };
}

/**
 * Every web element of the manifest (packages/web/custom-elements.json), by tag: its CSS parts and its slots by name.
 */
export function manifestElements(manifest) {
  const tags = new Map();
  for (const mod of manifest.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (d.tagName) tags.set(d.tagName, { parts: new Set((d.cssParts ?? []).map((p) => p.name)), slots: new Set((d.slots ?? []).map((s) => s.name)) });
    }
  }
  return tags;
}

/**
 * The problems of every spec's `platforms.web.parts` and `anatomyFixture`. Every spec whose web status is not `planned`
 * writes `parts` — a component the web draws has an anatomy figure, which needs to know where each part is — except
 * the components of `pendingNames` (`validate` passes `PARTS_PENDING`'s), which write none until they can name every part.
 * Where `parts` is written: each key is an anatomy id, or a member part's id followed by an anatomy id of that member
 * (`text-input.label`); every anatomy id of the spec is a key; and each target exists — the element's part or slot in
 * the manifest, a child element and its part in the manifest, a class in the component's light-DOM stylesheet. `stylesheetOf(name)` gives the source of a
 * component's web stylesheets (empty where it has none).
 */
export function partsProblems(specs, manifest, stylesheetOf = () => '', pendingNames = []) {
  const problems = [];
  const tags = manifestElements(manifest);
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  const pending = new Set(pendingNames);
  for (const name of pending) if (!byName.has(name)) problems.push(`packages/tools/src/parts.js: PARTS_PENDING names ${name}, which is no spec`);
  for (const { file, spec } of specs) {
    if (spec.anatomyFixture !== undefined && !spec.fixtures.some((f) => f.id === spec.anatomyFixture)) {
      problems.push(`${file}: anatomyFixture "${spec.anatomyFixture}" is not a fixture of this spec`);
    }
    const web = spec.platforms.web;
    if (pending.has(spec.name) && web.parts) problems.push(`${file}: platforms.web.parts is written, so ${spec.name} comes off PARTS_PENDING in packages/tools/src/parts.js`);
    if (!web.parts) {
      if (web.status !== 'planned' && !pending.has(spec.name)) problems.push(`${file}: platforms.web.parts is not written — the web draws ${spec.name} (status "${web.status}"), so its spec says where each anatomy part is drawn (\`node packages/tools/src/cli.js parts ${spec.name} --write\` writes the ids that match a CSS part by name)`);
      continue;
    }
    const where = `${file}: platforms.web.parts`;
    const ids = spec.anatomy.map((a) => a.id);
    const missing = ids.filter((id) => !(id in web.parts));
    if (missing.length) problems.push(`${where} is missing ${missing.join(', ')} — every anatomy id is mapped, or says why it has no box ({ "noBox": … })`);
    const members = new Set(spec.builtFrom ?? []);
    for (const key of Object.keys(web.parts)) {
      if (ids.includes(key)) continue;
      const dot = key.indexOf('.');
      const head = key.slice(0, dot);
      const member = dot > 0 && ids.includes(head) && members.has(head) ? byName.get(head) : undefined;
      if (!member) problems.push(`${where} maps "${key}", which is not an anatomy id — nor a member's part: an anatomy id that names a component of builtFrom, then one of that member's anatomy ids`);
      else if (!member.anatomy.some((a) => a.id === key.slice(dot + 1))) problems.push(`${where} maps "${key}", but ${head} has no anatomy id "${key.slice(dot + 1)}"`);
    }
    const element = tags.get(web.name);
    const sheet = stylesheetOf(spec.name);
    for (const [key, value] of Object.entries(web.parts)) {
      const read = readPart(value, tags);
      const at = `${where} "${key}"`;
      if (read.problem) { problems.push(`${at}: "${value}" ${read.problem}`); continue; }
      if (read.noBox !== undefined) continue;
      if (read.className !== undefined) {
        if (!new RegExp(`\\.${read.className}(?![a-z0-9-])`).test(sheet)) problems.push(`${at}: the class .${read.className} is not in the web stylesheet of ${spec.name}`);
        continue;
      }
      if (read.child) {
        const last = read.child.at(-1);
        if (read.part !== undefined && !tags.get(last).parts.has(read.part)) problems.push(`${at}: ${last} exports no part "${read.part}"`);
        continue;
      }
      if (!element) { problems.push(`${at}: ${web.name} is not an element of packages/web/custom-elements.json`); continue; }
      if (read.part !== undefined && !element.parts.has(read.part)) problems.push(`${at}: ${web.name} exports no part "${read.part}"`);
      if (read.slot !== undefined && !element.slots.has(read.slot)) problems.push(`${at}: ${web.name} has no ${read.slot ? `slot "${read.slot}"` : 'default slot'}`);
    }
  }
  return problems;
}

/**
 * A first `parts` for a spec that has none: each anatomy id the element exports a CSS part of the same name for is
 * mapped to it, and the rest are left for the author (`open`), who reads the implementation to say where each is drawn.
 */
export function draftParts(spec, tags) {
  const element = tags.get(spec.platforms.web.name);
  const parts = {};
  const open = [];
  for (const { id } of spec.anatomy) {
    if (element?.parts.has(id)) parts[id] = id;
    else open.push(id);
  }
  return { parts, open };
}

/**
 * The text of a spec with `parts` written into its web block, before `notes` where there are notes, so that the edit
 * is an insertion and touches no line around it. Null where the spec's text is not the canonical form
 * (`JSON.stringify(…, null, 2)`), which this would rewrite.
 */
export function withParts(text, parts) {
  const spec = JSON.parse(text);
  if (`${JSON.stringify(spec, null, 2)}\n` !== text) return null;
  const web = {};
  for (const [key, value] of Object.entries(spec.platforms.web)) {
    if (key === 'notes') web.parts = parts;
    if (key !== 'parts') web[key] = value;
  }
  web.parts = parts;
  spec.platforms.web = web;
  return `${JSON.stringify(spec, null, 2)}\n`;
}

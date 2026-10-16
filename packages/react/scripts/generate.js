// React wrappers are derived from @tanrei/web's custom elements manifest, so the
// React API can never drift from the elements themselves.
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('../../web/custom-elements.json', import.meta.url), 'utf8'));
const elements = manifest.modules
  .flatMap((m) => (m.declarations ?? []).map((d) => ({ ...d, module: m.path })))
  .filter((d) => d.customElement && d.tagName)
  .sort((a, b) => a.tagName.localeCompare(b.tagName));

const pascal = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
// Events React already delivers through its own handlers, because the browser's event reaches the host: they bubble
// and are composed out of the shadow root. `change` is not among them — the native one is not composed, so a component
// that fires `change` dispatches its own on the host, and React's synthetic onChange never sees a custom element's.
const NATIVE_EVENTS = new Set(['click', 'focus', 'blur', 'input', 'keydown', 'keyup']);
// Elements whose `click` is listened to on the element itself instead: a menu's items. A button with menu forwards them into
// its menu and stops their click at its shadow root, because only its leading half's click may reach listeners on it
// (specs/button-with-menu.spec.json, web note) — so React's root listener never sees an item's click there, and a delegated
// onClick would never fire. On the element it fires in any menu, and `ButtonWithMenu`'s own onClick stays the leading half's.
const DIRECT_CLICK = new Set(['tanrei-menu-item', 'tanrei-menu-checkbox-item', 'tanrei-menu-radio-item']);

// An event the manifest types as `CustomEvent<Detail>` (JSDoc `@fires {CustomEvent<Detail>} name`), where the element's
// module exports `Detail`, is typed for React too, so a handler reads `event.detail` without a cast.
const detailOf = (event) => /^CustomEvent<(\w+)>$/.exec(event.type?.text ?? '')?.[1];
// An event with a native name that carries a detail of the element's own (a slider's and a number field's `input`) is
// listened to on the element too: React's synthetic event for that name has no `detail`, in its type or at run time.
const customEvents = (el) => (el.events ?? []).filter((e) => !NATIVE_EVENTS.has(e.name) || detailOf(e));
// Attributes the manifest lists with no property behind them (JSDoc `@attr {boolean} confirming - …`): marks another
// component reads from the element. A wrapper's prop types are the element's properties, so these are typed here, and the
// boolean ones are written as attributes that are present or absent (`withMarks`). A deprecated one is not offered.
const marksOf = (el) => (el.attributes ?? []).filter((a) => !a.fieldName && !/^deprecated\b/i.test(a.description ?? ''));
const oneLine = (text) => (text ?? '').replace(/\s+/g, ' ').trim().replace(/\*\//g, '*\\/');
/** The events a wrapper maps to listeners on the element: its custom events, and `click` where it must be direct. */
const listened = (el) => [...customEvents(el), ...(DIRECT_CLICK.has(el.tagName) && !customEvents(el).some((e) => e.name === 'click') ? [{ name: 'click', direct: true }] : [])];

// One module per wrapper (`src/generated/wrappers/<name>.ts`), and `src/generated/components.ts` re-exports them all.
// A product imports what it uses from the package's one entry, and its bundler keeps only that: the package declares
// itself free of side effects (package.json `sideEffects: false`), so a wrapper's module is left out, with its import of
// the element's module, unless something it exports is used. Each element's module defines its element when it is
// evaluated — a side effect `@tanrei/web` declares — so wrappers that shared one module would keep every element: that
// module is used, and none of its imports could be dropped. Importing a wrapper still defines its element, and the
// elements it is drawn with, because the wrapper's module imports the element's.
// Every call made at load is marked pure as well, for a bundler that reads those marks and not the field.
const HEADER = ['// GENERATED FILE — DO NOT EDIT.', '// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.'];
const PURE = '/* @__PURE__ */';
const fileOf = (el) => el.tagName.replace(/^tanrei-/, '');
const wrappers = elements.map((el) => {
  const name = pascal(fileOf(el));
  const events = listened(el);
  const marks = marksOf(el);
  const slots = el.slots ?? [];
  const dir = el.module.replace(/^src\//, '').replace(/\/[^/]+\.ts$/, '').replace(/^components\//, '');
  const details = [...new Set(customEvents(el).map(detailOf).filter(Boolean))];
  const lines = [
    ...HEADER,
    events.length ? "import { type EventName, createComponent } from '@lit/react';" : "import { createComponent } from '@lit/react';",
    "import * as React from 'react';",
    ...(events.length ? ["import type { TanreiEvent } from '../../events.js';"] : []),
    ...(marks.length ? ["import { type Marked, withMarks } from '../../marks.js';"] : []),
    // Importing the element's module defines the element, and the elements it is drawn with.
    `import { ${[`${el.name} as ${el.name}Element`, ...details.map((d) => `type ${d}`)].join(', ')} } from '@tanrei/web/components/${dir}';`,
    '',
  ];
  // Every listener is on the element, so `currentTarget` is the element (`TanreiEvent`): a handler reads the new value
  // from it (`event.currentTarget.value`) whether or not the event carries a detail.
  const eventType = (e) => `EventName<TanreiEvent<${el.name}Element${e.direct ? ', MouseEvent' : detailOf(e) ? `, CustomEvent<${detailOf(e)}>` : ''}>>`;
  const map = events.map((e) => `    on${pascal(e.name)}: '${e.name}' as ${eventType(e)},`).join('\n');
  // What an editor shows for the wrapper: the element's first line, then what the prop types cannot say — which children
  // go where, and what each event prop is fired for.
  const doc = [
    oneLine((el.description ?? '').split(/\n\s*\n/)[0]),
    ...(slots.length ? ['', 'Children, by their `slot`:', ...slots.map((s) => `- ${s.name ? `\`${s.name}\`` : 'default'} — ${oneLine(s.description)}`)] : []),
    ...(events.length ? ['', 'Events:', ...events.map((e) => `- \`on${pascal(e.name)}\` (\`${e.name}\`) — ${oneLine(e.description) || 'the native event, listened to on the element.'}`)] : []),
  ];
  if (marks.length) {
    lines.push(
      `/** The attributes of \`<${el.tagName}>\` that are not properties of the element, as props of \`${name}\`. */`,
      `export interface ${name}Marks {`,
      ...marks.flatMap((a) => [`  /** ${oneLine(a.description)} */`, `  ${JSON.stringify(a.name).replace(/^"([A-Za-z_$][\w$]*)"$/, '$1')}?: ${a.type?.text ?? 'string'};`]),
      '}',
      '',
    );
  }
  const booleans = marks.filter((a) => a.type?.text === 'boolean').map((a) => `'${a.name}'`).join(', ');
  // A mark that has the name of a property of the element (`form`: the attribute is a form's id, the read-only
  // property returns the form) cannot be assigned as a prop: the wrapper writes it on the element as an attribute.
  const shadowed = marks.filter((a) => (el.members ?? []).some((m) => m.name === a.name)).map((a) => `'${a.name}'`).join(', ');
  const comment = ['/**', ...doc.map((line) => (line ? ` * ${line}` : ' *')), ' */'];
  // With marks the wrapper is made in steps, so that the exported type names the element's wrapper instead of spelling
  // its props out (which a declaration file cannot do for an element with a symbol-keyed member), and so that each call
  // carries its own pure mark.
  lines.push(
    ...(marks.length ? [] : comment),
    `${marks.length ? `const ${name}Element` : `export const ${name}`} = ${PURE} createComponent({`,
    `  tagName: '${el.tagName}',`,
    `  elementClass: ${el.name}Element,`,
    '  react: React,',
    `  events: {${map ? `\n${map}\n  ` : ''}},`,
    '});',
    ...(marks.length
      ? [
          `const with${name}Marks = ${PURE} withMarks<${name}Marks>([${booleans}]${shadowed ? `, [${shadowed}]` : ''});`,
          ...comment,
          `export const ${name}: Marked<typeof ${name}Element, ${name}Marks> = ${PURE} with${name}Marks(${name}Element);`,
        ]
      : []),
    '',
  );
  return { file: fileOf(el), name, marked: marks.length > 0, text: lines.join('\n') };
});

const out = new URL('../src/generated/wrappers/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
// A wrapper whose element is gone goes with it.
const written = new Set(wrappers.map((w) => `${w.file}.ts`));
for (const file of fs.readdirSync(out)) if (!written.has(file)) fs.rmSync(new URL(file, out));
for (const w of wrappers) fs.writeFileSync(new URL(`${w.file}.ts`, out), w.text);
fs.writeFileSync(
  new URL('../src/generated/components.ts', import.meta.url),
  [
    ...HEADER,
    '// Every wrapper, each from its own module (src/generated/wrappers/): a bundler keeps the ones a product uses.',
    ...wrappers.map((w) => `export { ${[w.name, ...(w.marked ? [`type ${w.name}Marks`] : [])].join(', ')} } from './wrappers/${w.file}.js';`),
    '',
  ].join('\n'),
);
console.log(`✔ react: ${wrappers.length} wrapper(s)`);

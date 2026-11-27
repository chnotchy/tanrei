// What a wrapper is given in the server-rendering tests (ssr.test.mjs, browser/ssr.test.mjs), read from the elements'
// manifest so that every wrapper and every prop its element reads from an attribute is covered, and none by hand: for
// each such prop of a string, boolean or number type, a value that is not the element's default, and the attribute the
// element reads it from.
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('../../web/custom-elements.json', import.meta.url), 'utf8'));
const { web: { tagPrefix } } = JSON.parse(fs.readFileSync(new URL('../../../tanrei.config.json', import.meta.url), 'utf8'));
const pascal = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

/** The kind of value a manifest type is, where the attribute carries it whole: `string`, `number`, `boolean`, or none. */
export function kindOf(text = '') {
  const type = text.replace(/\s*\|\s*null$/, '');
  if (type === 'boolean' || type === 'number' || type === 'string') return type;
  // A union of literals (`'eager' | 'lazy' | ''`) or one of the package's named unions of them (`TanreiButtonVariant`).
  if (/^'[^']*'(\s*\|\s*'[^']*')*$/.test(type) || /^Tanrei\w+$/.test(type)) return 'string';
  return undefined;
}

/**
 * The values of `kind` that differ from the manifest's `initial` (its default, as written in source): a boolean whose
 * default is null (the system decides) is given both.
 */
function valuesOf(kind, initial) {
  if (kind === 'boolean') return initial === 'true' ? [false] : initial === 'false' ? [true] : [true, false];
  if (kind === 'number') return [initial === '7' ? 8 : 7];
  return [initial === "'x'" ? 'y' : 'x'];
}

export const elements = manifest.modules
  .flatMap((m) => m.declarations ?? [])
  .filter((d) => d.customElement && d.tagName)
  .map((d) => ({ tag: d.tagName, wrapper: pascal(d.tagName.slice(tagPrefix.length + 1)), members: d.members ?? [] }))
  .sort((a, b) => a.tag.localeCompare(b.tag));

/** One case per prop: `{ tag, wrapper, prop, attribute, kind, value, initial }`. */
export const cases = elements.flatMap(({ tag, wrapper, members }) =>
  members
    .filter((m) => m.kind === 'field' && !m.static && m.attribute && m.privacy !== 'private' && m.privacy !== 'protected')
    .map((m) => ({ tag, wrapper, prop: m.name, attribute: m.attribute, kind: kindOf(m.type?.text), initial: m.default }))
    .filter((c) => c.kind)
    .flatMap((c) => valuesOf(c.kind, c.initial).map((value) => ({ ...c, value }))),
);

/**
 * A value for each list prop an element reads from an attribute (a type that ends in `[]`), by `<tag> <prop>`: one the
 * element's converter reads (a date for a disabled date, a chord for a shortcut, a member of the union), and not its
 * default. A list prop the manifest gains is missing here until it is given one: `lists` names it with no value, and
 * the tests fail on it.
 */
const LIST_VALUES = {
  'tanrei-calendar disabledDates': ['2026-01-01', '2026-01-02'],
  'tanrei-chat-composer accept': ['image/png', '.pdf'],
  'tanrei-chip-field value': ['ada@example.com', 'grace@example.com'],
  'tanrei-chip-field separators': [',', ';'],
  'tanrei-combobox values': ['tokyo', 'osaka'],
  'tanrei-date-time-picker disabledDates': ['2026-01-01'],
  'tanrei-drop-zone accept': ['image/*', '.pdf'],
  'tanrei-file-picker accept': ['image/*'],
  'tanrei-file-upload accept': ['.pdf', '.txt'],
  'tanrei-keyboard-shortcut keys': ['mod+k'],
  'tanrei-list values': ['a', 'b'],
  'tanrei-menu-checkbox-item shortcut': ['mod+b'],
  'tanrei-menu-item shortcut': ['mod+c'],
  'tanrei-menu-radio-item shortcut': ['mod+1'],
  'tanrei-navigation-drawer filterShortcut': ['mod+k'],
  'tanrei-popover trigger': ['hover', 'focus'],
  'tanrei-rating optionLabels': ['Poor', 'Fair', 'Good'],
  'tanrei-resizable-frame handles': ['start', 'end'],
  'tanrei-resizable-frame snapWidths': [240, 320],
  'tanrei-scroll-area edges': ['start'],
  'tanrei-search shortcut': ['mod+k'],
  'tanrei-search-result excerpt': ['A ', 'match', ' in its text'],
  'tanrei-search-result-group excerpt': ['A ', 'match'],
  'tanrei-segmented-button values': ['day', 'week'],
  'tanrei-tag-group values': ['a', 'b'],
  'tanrei-text-field disabledDates': ['2026-01-01'],
  'tanrei-text-input disabledDates': ['2026-01-01'],
  'tanrei-toolbar-group values': ['bold', 'italic'],
  'tanrei-tooltip shortcut': ['mod+s'],
  'tanrei-tree-view filterShortcut': ['mod+f'],
  'tanrei-tree-view values': ['a', 'b'],
};

/** One case per list prop an element reads from an attribute: `{ tag, wrapper, prop, attribute, value }` (`value` is `undefined` where `LIST_VALUES` has none). */
export const lists = elements.flatMap(({ tag, wrapper, members }) =>
  members
    .filter((m) => m.kind === 'field' && !m.static && m.attribute && m.privacy !== 'private' && m.privacy !== 'protected' && /\[\]$/.test(m.type?.text ?? ''))
    .map((m) => ({ tag, wrapper, prop: m.name, attribute: m.attribute, value: LIST_VALUES[`${tag} ${m.name}`] })),
);

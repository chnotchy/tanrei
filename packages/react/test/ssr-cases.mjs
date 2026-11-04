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

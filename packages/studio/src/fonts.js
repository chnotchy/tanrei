// A font stack, as the Studio's list editor sees it — and back, without losing anything.
//
// The build reads a stack once, in the IR (`fontStack()` in @tanrei/tokens-build/src/ir.js):
// `{ families, generic, system }`. That module is filesystem-bound, so the same reading is written here for the
// browser; `test/system-groups.test.js` holds the two together for every stack that ships.
//
// The editor's model keeps a little more than the IR, so that `composeStack(parseStack(stack))` is `stack`:
//   families  named families, in order
//   keywords  the platform-font keywords the stack names (`system-ui`, `-apple-system`, `ui-monospace`, …), in order
//   system    the keywords come FIRST (the platform's own font wins); otherwise they sit after the named families
//   generic   the generic family the stack ends with, or null when it names none
export const SYSTEM_FONT_KEYWORDS = ['system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded'];
export const GENERIC_FONT_KEYWORDS = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji'];
/** The generic fallbacks the editor offers; anything else a stack already names is kept and shown. */
export const GENERIC_CHOICES = ['sans-serif', 'serif', 'monospace'];

const isSystem = (name) => SYSTEM_FONT_KEYWORDS.includes(name.toLowerCase());
const isGeneric = (name) => GENERIC_FONT_KEYWORDS.includes(name.toLowerCase());

/** The platform-font keyword that belongs to a generic family. */
export const systemKeywordFor = (generic) => (generic === 'monospace' ? 'ui-monospace' : generic === 'serif' ? 'ui-serif' : 'system-ui');

/** @param {string[] | string} stack */
export function parseStack(stack) {
  const list = (Array.isArray(stack) ? stack : [stack]).filter((name) => typeof name === 'string' && name.trim());
  const families = list.filter((name) => !isSystem(name) && !isGeneric(name));
  const keywords = list.filter(isSystem);
  const firstSystem = list.findIndex(isSystem);
  const firstNamed = list.findIndex((name) => !isSystem(name) && !isGeneric(name));
  const generic = list.find(isGeneric) ?? null;
  return { families, keywords, system: firstSystem !== -1 && (firstNamed === -1 || firstSystem < firstNamed), generic };
}

/**
 * @typedef {{ families?: string[], keywords?: string[], system?: boolean, generic?: string | null }} StackModel
 */
/** What the IR would infer for a stack that names no generic family. @param {StackModel} model */
export function inferredGeneric({ keywords = [], generic }) {
  if (generic) return generic.toLowerCase();
  const lower = keywords.map((name) => name.toLowerCase());
  return lower.includes('ui-monospace') ? 'monospace' : lower.includes('ui-serif') ? 'serif' : 'sans-serif';
}

/** @param {StackModel} model @returns {string[]} the DTCG `fontFamily` value */
export function composeStack({ families = [], keywords = [], system = false, generic = null }) {
  const platform = system && !keywords.length ? [systemKeywordFor(inferredGeneric({ keywords, generic }))] : keywords;
  const named = families.map((name) => name.trim()).filter(Boolean);
  return [...(system ? [...platform, ...named] : [...named, ...platform]), ...(generic ? [generic] : [])];
}

/**
 * A family name typed by a person → the name to store, or why it cannot be one.
 * @returns {{ name: string } | { problem: 'empty' | 'keyword' | 'characters' | 'duplicate' }}
 */
export function familyName(input, existing = []) {
  const name = String(input ?? '').trim().replace(/^["']|["']$/g, '').trim().replace(/\s+/g, ' ');
  if (!name) return { problem: 'empty' };
  if (/[,;{}"'\\<>]/.test(name)) return { problem: 'characters' };
  if (isSystem(name) || isGeneric(name)) return { problem: 'keyword' };
  if (existing.some((other) => other.toLowerCase() === name.toLowerCase())) return { problem: 'duplicate' };
  return { name };
}

/** `font-family` as CSS: what the build's emitter writes for the same value. */
export const cssFontFamily = (stack) => stack.map((name) => (/\s/.test(name) ? `"${name}"` : name)).join(', ');

/** Families the editor suggests. Free text is always accepted; none of these is loaded from anywhere. */
export const SUGGESTED_FAMILIES = {
  text: ['Inter', 'Roboto', 'Noto Sans', 'Noto Sans JP', 'IBM Plex Sans', 'Source Sans 3'],
  mono: ['Roboto Mono', 'IBM Plex Mono', 'Source Code Pro', 'Noto Sans Mono', 'JetBrains Mono'],
  icon: ['Material Symbols Rounded', 'Material Symbols Outlined', 'Material Symbols Sharp'],
  iconStatic: ['Material Icons Outlined', 'Material Icons', 'Material Icons Round', 'Material Icons Sharp'],
};

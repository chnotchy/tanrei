/**
 * Letter-spacing follows the script of the text, not a token (docs/architecture/overview.md, component conventions:
 * "Text follows its script"). One rule, shared by every component that draws a title or a heading — in its shadow
 * styles through `scriptTracking()`, and in a light-DOM stylesheet at a `script-tracking` mark that the build writes
 * (scripts/build.js, through `writeScriptTracking()`):
 *
 *   - Chinese, Japanese and Korean take no NEGATIVE letter-spacing. A negative tracking is a device of Latin display
 *     type; kana and ideographs are designed in a full-width square, and a value chosen for Latin does not tighten them
 *     the way their own composition does. They are set solid (zero) instead, and a positive tracking a product's layer
 *     chose — open setting, which Japanese composition allows in a short heading — is kept: `max(0px, tracking)`.
 *   - A script that joins its letters or stacks marks on them (Arabic and the scripts written in it, the Brahmic
 *     scripts of South and Southeast Asia) takes no letter-spacing at all: spacing pulls such a word apart.
 *
 * Nothing here is a token: no design system chooses whether a word of Arabic falls apart, as none chooses whether a
 * back arrow points the right way. The language is the element's own (`:lang()`): the `lang` of the text or of an
 * ancestor, and inside a shadow root the host's.
 */

/** The languages whose text is set solid: a negative tracking is dropped, a positive one kept. */
export const SOLID_LANGUAGES = ['ja', 'zh', 'ko'] as const;

/** The languages whose script joins its letters or stacks marks on them: no letter-spacing at all. */
export const UNTRACKED_LANGUAGES = ['ar', 'fa', 'ur', 'ps', 'hi', 'mr', 'ne', 'bn', 'pa', 'gu', 'ta', 'te', 'kn', 'ml', 'si', 'th', 'lo', 'km', 'my'] as const;

const languages = (list: readonly string[]) => `:where(${list.map((language) => `:lang(${language})`).join(', ')})`;

/** `:where(:lang(ja), :lang(zh), :lang(ko))` */
export const SOLID = languages(SOLID_LANGUAGES);
/** `:where(:lang(ar), …)`: every language of `UNTRACKED_LANGUAGES`. */
export const UNTRACKED = languages(UNTRACKED_LANGUAGES);

/**
 * The rules that make `selector`'s letter-spacing follow its script, for an element whose own rule sets
 * `letter-spacing: <tracking>`. `selector` is ONE compound selector (wrap a list in `:is()` or `:where()`, or use `&`
 * inside a nested rule); the rules add no specificity to it, so they are written after its own rule. With `slotted`,
 * the rules are for what a shadow root's slot holds — `::slotted(<slotted>)`, by the slotted element's own language —
 * and `selector` is what stands before `::slotted` (empty for any slot).
 */
export const scriptTracking = (selector: string, tracking: string, { slotted }: { slotted?: string } = {}): string => {
  const on = (condition: string) => (slotted ? `${selector}::slotted(${slotted}${condition})` : `${selector}${condition}`);
  return [`${on(SOLID)} {\n  letter-spacing: max(0px, ${tracking});\n}`, `${on(UNTRACKED)} {\n  letter-spacing: 0;\n}`].join('\n');
};

/** The mark a light-DOM stylesheet writes where the rules go: `/* script-tracking: <selector> | <tracking> *\/`. */
const MARK = /^( *)\/\* script-tracking: (.+?) \| (.+?) \*\/$/gm;

/** Writes the rules in place of every mark of a stylesheet, at the mark's indentation (scripts/build.js). */
export const writeScriptTracking = (source: string): string =>
  source.replace(MARK, (_, indent: string, selector: string, tracking: string) => scriptTracking(selector.trim(), tracking.trim()).replace(/^/gm, indent));

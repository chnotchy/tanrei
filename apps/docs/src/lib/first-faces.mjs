// The font files a page's first screen is set in, so that the page's head can ask for them before the stylesheets
// are read (components/frame/Head.astro).
//
// Why: the site's faces are registered `font-display: swap` (styles/fonts.generated.css) — text is drawn at once in
// the stack's next family and drawn again when the file arrives. The two families do not set a line to the same
// width, so a paragraph or a heading above the fold takes a line more (or less) at that moment and everything under
// it moves: 0.15 to 0.19 of layout shift on a page in a compact window, about 0.1 s after it is first drawn. A file
// the head preloads is fetched together with the stylesheets and is there when the text is first laid out.
//
// Which families: the first family of each stack that text on every page is set in — the brand and plain stacks
// (headings, running text) and the code stack — read from the tokens, never written here. Which file: the family's
// Latin subset, the one that holds the letters of a path, a token id and the site's own name in every language. A
// language whose own script comes from a family in many files (Japanese: about 120 by Unicode range) is not
// preloaded: no one file is the page's.

/**
 * The first family of each text stack, once each.
 *
 * @param {Record<string, string[] | undefined>} stacks The font stacks by name (`brand`, `plain`, `mono`, `icon`…).
 * @param {string[]} [names] The stacks text on every page is set in.
 * @returns {string[]}
 */
export function firstFamilies(stacks, names = ['brand', 'plain', 'mono']) {
  const families = names.map((name) => {
    const first = stacks[name]?.[0];
    if (!first) throw new Error(`first-faces: the tokens have no "${name}" font stack.`);
    return first;
  });
  return [...new Set(families)];
}

/**
 * The name of a family's Latin file in its font package, as the registered faces name it.
 *
 * @param {string} family "Roboto Mono"
 * @returns {string} "roboto-mono-latin-wght-normal.woff2"
 */
export const latinFile = (family) => `${family.toLowerCase().replaceAll(' ', '-')}-latin-wght-normal.woff2`;

// Reading a stylesheet's selectors, for the tests of what the selectors cost (src/styles/prose.test.ts,
// src/styles/has.test.ts): a selector list cut into its selectors, a selector into its compounds, a compound into the
// functional pseudo-classes written in it — by the parentheses, which is all these tests need of the grammar.
export interface Piece { text: string; start: number }
/** `text` cut where `separator` matches outside parentheses and brackets; each piece with where it begins in `text`. */
export function cut(text: string, separator: RegExp): (Piece & { by: string })[] {
  const out = [{ text: '', start: 0, by: '' }];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (depth === 0 && separator.test(char)) {
      // A run of separators is one (`a > b` is one child combinator): the one that is not white space names it.
      const last = out.at(-1)!;
      if (last.text) out.push({ text: '', start: i + 1, by: char });
      else Object.assign(last, { start: i + 1, by: last.by.trim() || char });
    } else out.at(-1)!.text += char;
  }
  return out.filter((piece) => piece.text);
}
/** The selectors of a list, and the compounds of a selector — each compound with the combinator before it (`' '`, `>`, `+`, `~`). */
export const list = (text: string) => cut(text, /,/).map((piece) => ({ text: piece.text.trim(), start: piece.start + piece.text.length - piece.text.trimStart().length }));
export const compounds = (selector: string) => cut(selector, /[\s>+~]/);
/** Every functional pseudo-class written directly in `compound` (not inside another's argument): its name, its argument, and where the argument begins. */
export function functions(compound: string): { name: string; argument: string; start: number }[] {
  const out: { name: string; argument: string; start: number }[] = [];
  let depth = 0;
  for (let i = 0; i < compound.length; i++) {
    if (compound[i] === '(' || compound[i] === '[') {
      if (depth === 0 && compound[i] === '(') {
        const name = /:([\w-]+)$/.exec(compound.slice(0, i))?.[1] ?? '';
        let end = i + 1;
        for (let open = 1; end < compound.length && open; end++) open += compound[end] === '(' ? 1 : compound[end] === ')' ? -1 : 0;
        out.push({ name, argument: compound.slice(i + 1, end - 1), start: i + 1 });
      }
      depth += 1;
    } else if (compound[i] === ')' || compound[i] === ']') depth -= 1;
  }
  return out;
}

/**
 * Every `:has()` of `selector` that is asked of an element OTHER than the one the rule styles — each as the compound
 * it stands in. `ul:has(> li > p) > li` asks the list for the sake of its items: the list is then an element whose
 * subtree an engine may restyle when anything inside it changes, and whole where any such rule of the page styles an
 * element it cannot name. `ul:where(:has(> li > p))` asks the list about the list. A pseudo-element is its element's:
 * `li:has(> input)::before` styles the item.
 */
export function hasForAnother(selector: string): string[] {
  const found: string[] = [];
  // `styled`: this list is written in the compound the rule styles (or is the rule's own selector).
  const walk = (text: string, styled: boolean) => {
    for (const complex of list(text)) {
      const all = compounds(complex.text);
      all.forEach((compound, index) => {
        const last = styled && index === all.length - 1;
        for (const fn of functions(compound.text)) {
          if (fn.name === 'has') {
            if (!last) found.push(compound.text);
          } else if (['where', 'is', 'not'].includes(fn.name)) walk(fn.argument, last);
        }
      });
    }
  };
  walk(selector.replace(/::[\w-]+(?:\([^()]*\))?$/, ''), true);
  return found;
}

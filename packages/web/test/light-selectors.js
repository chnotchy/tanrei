// Reading the selectors of a light-DOM stylesheet as an engine files and filters them, for test/keyed-selectors.test.mjs.
//
// An engine files a style rule under a name its LAST compound holds — a tag, a class, an id, an attribute, `:root` or
// `:host` (Blink's rule set, WebKit's RuleSet, Stylo's selector map) — and tries the rule on the elements of that name
// alone. A last compound with none is tried on every element of the page. Then, before matching, it asks its filter of
// the element's ancestors for the names of the selector's ANCESTOR compounds (one reached through `>` or a space), and
// rejects the element at once where one is missing. `:where()` or `:is()` of ONE selector is read as that selector, in
// both places (`:where(li)`, `:where(li > :first-child)`, a nested rule's `&` under a parent of one selector). What
// neither reads: `:where()` or `:is()` of a LIST of several — any one of them may be the one that matches — which is
// what a nested rule's `&` is under a parent of several selectors (`a > b, c > b { & > x {} }`); and a compound reached
// through `+` or `~`, a sibling and not an ancestor.
//
// A rule that the filter cannot reject and that asks where an element stands among its siblings (`:first-child`,
// `:last-child`, `:nth-child()`, `+`, `~` …) is matched on every element of its name — `<body>`, and any element a
// script puts on `<html>` — and Firefox marks the PARENT of each element it asks: a child added to or taken from that
// parent then restyles the siblings, and, for `<html>`, everything in `<body>`. (Measured in Firefox with one such
// rule, `:is(a > dl, b > dl) > :where(div:first-child)`, on a page whose script once put a `div` on `<html>`.)
//
// Only what these tests need of the grammar: a selector list cut at its commas, a selector at its combinators, a
// compound at its functional pseudo-classes, by the parentheses, the brackets and the quotes.

/** `text` without its comments, its strings kept. */
export function withoutComments(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < text.length && text[end] !== char) end += text[end] === '\\' ? 2 : 1;
      out += text.slice(i, end + 1);
      i = end;
    } else if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
    } else out += char;
  }
  return out;
}

/** `text` cut where `separator(char)` is true outside parentheses, brackets and quotes; each piece with the separator before it. */
function cut(text, separator) {
  const out = [{ text: '', by: '' }];
  let depth = 0;
  let quote = '';
  for (const char of text) {
    if (quote) {
      out.at(-1).text += char;
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (depth === 0 && !quote && separator(char)) {
      // A run of separators is one (`a > b` is one child combinator): the one that is not white space names it.
      const last = out.at(-1);
      if (last.text.trim()) out.push({ text: '', by: char.trim() || ' ' });
      else if (char.trim()) last.by = char;
    } else out.at(-1).text += char;
  }
  return out.map((piece) => ({ text: piece.text.trim(), by: piece.by })).filter((piece) => piece.text);
}

/** The selectors of a list. */
export const selectorsOf = (list) => cut(list, (char) => char === ',').map((piece) => piece.text);
/** The compounds of a selector, each with the combinator before it (`' '`, `>`, `+`, `~`; `''` for the first). */
export const compoundsOf = (selector) => cut(selector, (char) => /[\s>+~]/.test(char));

/** The functional pseudo-classes written directly in `compound`: name and argument. */
export function functionsOf(compound) {
  const out = [];
  let depth = 0;
  for (let i = 0; i < compound.length; i++) {
    const char = compound[i];
    if (char === '[') depth += 1;
    else if (char === ']') depth -= 1;
    else if (char === '(') {
      if (depth === 0) {
        const name = /:([\w-]+)$/.exec(compound.slice(0, i))?.[1] ?? '';
        let end = i + 1;
        for (let open = 1; end < compound.length && open; end++) open += compound[end] === '(' ? 1 : compound[end] === ')' ? -1 : 0;
        out.push({ name, argument: compound.slice(i + 1, end - 1) });
      }
      depth += 1;
    } else if (char === ')') depth -= 1;
  }
  return out;
}

/** `compound` with its pseudo-element taken off: `li::before` is filed as `li`. */
const ownPart = (compound) => compound.replace(/::[\w-]+(\([^()]*\))?$/, '');

/** `compound` with every parenthesis' and bracket's content taken out, for reading what stands at its top level. */
function topLevel(compound) {
  let out = '';
  let depth = 0;
  for (const char of compound) {
    if (char === '(' || char === '[') {
      if (depth === 0) out += char;
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) out += char;
    } else if (depth === 0) out += char;
  }
  return out;
}

/** A name the compound itself holds, at its top level: a tag (not `*`), a class, an id or an attribute — or `:root` or `:host`, where `withRoot`. */
function ownName(compound, withRoot = true) {
  const top = topLevel(ownPart(compound));
  if (/^(?:\*\|)?[a-zA-Z][\w-]*/.test(top) || /[.#]-?[_a-zA-Z]|\[\]/.test(top)) return true;
  return withRoot && /:(?:root|host)(?![\w-])/.test(top);
}

/**
 * Whether an engine files `compound`, as a rule's last, under a name: it holds one itself, or it holds `:where()` or
 * `:is()` of ONE selector whose last compound is filed so. `:where(a, b)` of several is filed under each name by
 * Stylo, and by Blink and WebKit only once the build has written it as one rule per name: it counts when every one of
 * its selectors is filed.
 */
export function filed(compound) {
  if (ownName(compound)) return true;
  return functionsOf(ownPart(compound)).some(({ name, argument }) => {
    if (name !== 'where' && name !== 'is') return false;
    return selectorsOf(argument).every((inner) => filed(compoundsOf(inner).at(-1).text));
  });
}

/** The one selector of each `:where()` and `:is()` of `compound` that holds exactly one. */
const singleInner = (compound) =>
  functionsOf(compound)
    .filter(({ name, argument }) => (name === 'where' || name === 'is') && selectorsOf(argument).length === 1)
    .map(({ argument }) => argument.trim());

/**
 * Whether the ancestor filter reads a name from `compound` standing as an ancestor: it holds one itself (`:root` is
 * not one: every element has it), or it holds `:where()` or `:is()` of ONE selector that gives one — its last compound,
 * or an ancestor of that.
 */
function filtered(compound) {
  if (ownName(compound, false)) return true;
  return singleInner(compound).some((inner) => filtered(compoundsOf(inner).at(-1).text) || ancestorFiltered(inner));
}

/** Every `:has(…)` of `text` taken out, with what it holds. */
function withoutHas(text) {
  let out = text;
  for (let at = out.indexOf(':has('); at >= 0; at = out.indexOf(':has(')) {
    let end = at + 5;
    for (let open = 1; end < out.length && open; end++) open += out[end] === '(' ? 1 : out[end] === ')' ? -1 : 0;
    out = out.slice(0, at) + out.slice(end);
  }
  return out;
}

/** A condition on where an element stands among its siblings: an edge or a count. */
const STRUCTURAL = /:(?:first-child|last-child|only-child|nth-child|nth-last-child|first-of-type|last-of-type|only-of-type|nth-of-type|nth-last-of-type)(?![\w-])/;

/**
 * Whether matching `selector` asks some element where it stands among its siblings — an edge, a count or a sibling
 * combinator, at any depth but inside `:has()`, whose argument an engine asks of the descendants it finds.
 */
export function structural(selector) {
  const text = withoutHas(selector).replace(/\[[^\]]*\]/g, '[]');
  return STRUCTURAL.test(text) || /[+~]/.test(text);
}

/**
 * Whether the ancestor filter can reject an element for `selector`: one of its ancestor compounds gives it a name, or
 * the subject holds `:where()` or `:is()` of ONE selector whose ancestors do (`:where(li > :first-child)`). A list of
 * several gives none — the form of a nested rule under a parent of several selectors (`a > b, c > b { & > x {} }`):
 * any one of them may be the one that matches.
 */
export function ancestorFiltered(selector) {
  const all = compoundsOf(selector);
  // A compound is an ancestor of the subject when the combinator after it is a child or descendant one.
  if (all.some((compound, index) => index < all.length - 1 && (all[index + 1].by === '>' || all[index + 1].by === ' ') && filtered(compound.text))) return true;
  return singleInner(ownPart(all.at(-1).text)).some(ancestorFiltered);
}

/**
 * Every style rule's selectors in `css`, as the engine reads them: a nested rule's resolved against its parent's
 * (`&` is `:is(<the parent's list>)`, and a selector without `&` is a descendant of it). Keyframes, font faces,
 * registered properties and the like hold no selector.
 */
export function styleSelectors(css) {
  const text = withoutComments(css);
  const found = [];
  let i = 0;
  const skip = () => {
    for (let open = 1; i < text.length && open; i++) open += text[i] === '{' ? 1 : text[i] === '}' ? -1 : 0;
  };
  const block = (parents) => {
    let prelude = '';
    let depth = 0;
    let quote = '';
    while (i < text.length) {
      const char = text[i++];
      if (quote) {
        prelude += char;
        if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        prelude += char;
        continue;
      }
      if (char === '(' || char === '[') depth += 1;
      if (char === ')' || char === ']') depth -= 1;
      if (depth > 0) prelude += char;
      else if (char === ';') prelude = '';
      else if (char === '}') return;
      else if (char === '{') {
        const head = prelude.trim();
        prelude = '';
        if (head.startsWith('@')) {
          if (/^@(?:keyframes|font-face|property|counter-style|page|font-feature-values|position-try|view-transition)\b/.test(head)) skip();
          else block(parents);
        } else {
          const own = selectorsOf(head);
          const resolved = parents
            ? own.flatMap((selector) => (selector.includes('&') ? [selector.replaceAll('&', `:is(${parents.join(', ')})`)] : [`:is(${parents.join(', ')}) ${selector}`]))
            : own;
          found.push(...resolved);
          block(resolved);
        }
      } else prelude += char;
    }
  };
  block(null);
  return found;
}

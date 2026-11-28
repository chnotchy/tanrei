// A stylesheet for the time before the elements are defined (the cloak, the menu's, the menubar's) written so that an
// engine files each of its selectors under the element it styles.
//
// An engine keeps a page's rules in buckets by what the rightmost compound of their selector names — an id, a class,
// an element's name — and tries on an element only the buckets of what it is, plus the rules it could not file, which
// it tries on every element of the page. It files a rule under the name in a `:where()` of ONE selector
// (`:where(tanrei-tag:not(:defined))`), but not under the names of a `:where()` of several (`:where(tanrei-checkbox,
// tanrei-switch):where(:not(:defined))`): that rule is tried on every element, whatever its name, at each restyle.
// Measured on the docs' Button page (10,135 elements, its scripts not run) by a style recalc of the whole page with the
// docs' stage cloak in place (the cloak within `@scope ([data-example-stage])`, which makes each rule tried that way
// walk up to its scope as well): in WebKit the cloak took 170 ms of it with 94 such selectors of 463, 264 ms with 113 of
// 553 once lists, fields, file items and tabs were held, and 46 ms with every selector filed; in Chromium 7 ms, and
// under 1 ms filed. Four hundred rules of each form that match nothing, on a page of 12,000 elements: 72 ms in WebKit
// (730 ms in an `@scope`) and 130 ms in Chromium for the lists, 2 ms (18 ms) and 2 ms written one name each.
//
// So each selector whose rightmost compound is not filed is written as one selector for each alternative of the first
// `:where()` list in that compound that names an element (and, inside a `:where()` of one selector, of the first
// `:where()` or `:is()` list that does), until every selector is filed, or names no element to file it under. Each
// alternative stays within its own `:where()`, so a selector the engine cannot read (a `:has()` an older engine does
// not know) is still forgiven and drops only itself, as the list dropped it; the specificity stays none. The rules and
// their order are as written; only their selector lists are longer.
//
// It reads the grammar these stylesheets are written in: style rules (no nesting) whose preludes may be inside at-rules
// (`@layer`, `@media`, `@supports`, `@container`), comments, strings in attribute values. A style rule inside another is
// refused, rather than read wrong.

/** The pieces of `text` between top-level occurrences of the characters of `separators`, outside (), [] and strings; each with the separator before it. */
function cut(text, separators) {
  const out = [{ text: '', by: '' }];
  let depth = 0;
  let quote = null;
  for (const char of text) {
    if (quote) {
      out.at(-1).text += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    if (depth === 0 && separators.includes(char)) {
      const last = out.at(-1);
      if (last.text.trim()) out.push({ text: '', by: char });
      else last.by = last.by.trim() || char;
    } else out.at(-1).text += char;
  }
  return out;
}

/** The selectors of a list. */
export const alternatives = (text) => cut(text, [',']).map((piece) => piece.text.trim());

/** The compound a selector ends in (its pseudo-element left out), and where it starts. */
function rightmost(selector) {
  const pieces = cut(selector, [' ', '\n', '\t', '>', '+', '~']);
  const last = pieces.at(-1).text;
  return { compound: last.replace(/::?(?:before|after)$/, ''), start: selector.length - last.length };
}

/** The functional pseudo-classes written directly in `compound`: each its name, its argument and where it is. */
function functions(compound) {
  const out = [];
  for (let i = 0; i < compound.length; i++) {
    const match = /^:(where|is|not|has)\(/.exec(compound.slice(i));
    if (!match) {
      if (compound[i] === '[') i = compound.indexOf(']', i);
      continue;
    }
    let depth = 0;
    let j = i + match[0].length - 1;
    for (; j < compound.length; j++) {
      if (compound[j] === '(') depth += 1;
      else if (compound[j] === ')' && --depth === 0) break;
    }
    out.push({ name: match[1], argument: compound.slice(i + match[0].length, j), start: i, end: j + 1 });
    i = j;
  }
  return out;
}

/** Whether an engine files `selector` under a name: its rightmost compound names an element, or holds a `:where()` or `:is()` of one selector it files. */
export function filed(selector) {
  const { compound } = rightmost(selector);
  if (/^[a-z]/i.test(compound)) return true;
  return functions(compound).some(({ name, argument }) => (name === 'where' || name === 'is') && alternatives(argument).length === 1 && filed(argument));
}

/** Whether `selector` names an element in its rightmost compound, directly or in a `:where()` or `:is()` there. */
function namesElement(selector) {
  const { compound } = rightmost(selector);
  if (/^[a-z]/i.test(compound)) return true;
  return functions(compound).some(({ name, argument }) => (name === 'where' || name === 'is') && alternatives(argument).some(namesElement));
}

/**
 * `selector` as the selectors an engine files, each taking one alternative of a list (see the head of this file).
 * `zero` says the selector is inside a `:where()`, where an `:is()` list may be taken apart too (its specificity is none
 * there whichever alternative matches).
 */
export function fileSelector(selector, zero = false) {
  if (filed(selector) || !namesElement(selector)) return [selector];
  const { compound, start } = rightmost(selector);
  const groups = functions(compound).filter(({ name }) => name === 'where' || (zero && name === 'is'));
  const write = (group, inner) => selector.slice(0, start + group.start) + `:${group.name}(${inner})` + selector.slice(start + group.end);
  const list = groups.find(({ argument }) => alternatives(argument).length > 1 && alternatives(argument).some(namesElement));
  if (list) return alternatives(list.argument).flatMap((each) => fileSelector(write(list, each), zero));
  const one = groups.find(({ name, argument }) => name === 'where' && alternatives(argument).length === 1 && namesElement(argument));
  if (one) return fileSelector(one.argument, true).map((each) => write(one, each));
  return [selector];
}

/**
 * The stylesheet with each style rule's selectors written as the selectors an engine files (`fileSelector`), each on a
 * line of its own; comments, at-rules and declarations as they are.
 * @param {string} css
 * @param {string} file  named in an error
 */
export function fileSelectors(css, file) {
  let out = '';
  let prelude = '';
  /** What is open: 'at' for an at-rule's block, 'rule' for a style rule's. */
  const open = [];
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`${file}: a comment that does not end`);
      prelude += css.slice(i, end + 2);
      i = end + 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = css.indexOf(char, i + 1);
      prelude += css.slice(i, end + 1);
      i = end;
      continue;
    }
    if (char === '{') {
      // The prelude is what was written since the last `{`, `}` or `;`: its comments and the white space before it stay.
      const lead = /^(?:\s|\/\*[\s\S]*?\*\/)*/.exec(prelude)[0];
      const text = prelude.slice(lead.length);
      if (text.startsWith('@')) {
        open.push('at');
        out += prelude + char;
      } else {
        if (open.includes('rule')) throw new Error(`${file}: a style rule inside another (${text.trim().slice(0, 80)}), which this does not read`);
        open.push('rule');
        const indent = /[^\n]*$/.exec(lead)[0];
        const selectors = alternatives(text).flatMap((selector) => fileSelector(selector));
        out += lead + selectors.join(`,\n${indent}`) + ' ' + char;
      }
      prelude = '';
      continue;
    }
    if (char === '}' || char === ';') {
      if (char === '}' && !open.pop()) throw new Error(`${file}: a } that closes nothing`);
      out += prelude + char;
      prelude = '';
      continue;
    }
    prelude += char;
  }
  if (open.length) throw new Error(`${file}: ${open.length} block(s) not closed`);
  return out + prelude;
}

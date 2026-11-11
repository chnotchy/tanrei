// Drops comments and runs of whitespace inside Lit `css` tagged templates, in a module's source (TypeScript or the
// JavaScript the compiler writes). esbuild's minifier leaves a template literal's text as it is, and the components'
// styles are most of what the package ships, written over many indented lines with comments between them.
//
// Only what cannot change the style sheet goes:
// - a comment, unless it starts with `/*!` (a notice that has to stay), or unless taking it out would join two tokens
//   (`a/**/b` is two identifiers, `ab` one), when it is kept as `/**/`;
// - a run of whitespace (comments in it included) becomes one space, and none at all next to `{`, `}`, `;` and `,`, after
//   `(` and after `:` (but not in parentheses: `(forced-colors: active)` keeps its space), and before `)`. A space is kept wherever it may separate tokens: around `+`, `-`, `>` and `~`, around an
//   interpolation, before `(` (`and (` is not `and(`), after an escape (`\31 0`), at either end of the template.
// - In the value of a custom property (`--name: …`, read back as text by script and by `@property`), a run of whitespace
//   only becomes one space: the value stays the same tokens with the same spaces between them.
// - Strings, `url(…)` and escapes are copied as they are, and so is every `${…}`.
// A template the stripper cannot read to the end (a comment around an interpolation) is left as it is.

const WS = new Set([' ', '\t', '\n', '\r', '\f']);
const DROP_AFTER = new Set(['{', '}', ';', ',', ':', '(']);
const DROP_BEFORE = new Set(['{', '}', ';', ',', ')']);
const NAME = /[\w\-\u0080-￿\\]/;

class Unreadable extends Error {}

/**
 * The static parts of one `css` template, raw (as written in the source, escapes and all), with comments and
 * whitespace taken out. An interpolation sits between two parts and is opaque: whitespace next to it is kept unless
 * the character on its other side lets it go.
 */
export function minifyCssParts(parts) {
  const result = [];
  // `prev` is what was last written: 'start', 'hole', 'escape', 'word' or the punctuation character itself.
  let prev = 'start';
  let ws = false;
  let comment = false;
  let quote = null;
  let inUrl = false;
  let custom = false;
  let depth = 0;
  let parens = 0;
  let out = '';
  const flush = (next) => {
    const gap = ws;
    const hadComment = comment;
    ws = false;
    comment = false;
    if (gap) {
      if (custom) out += ' ';
      // After a colon in parentheses — a media or container feature, an @supports or style() test — the space stays:
      // `(forced-colors: active)` reads as it is written, not as a pseudo-class.
      else if ((DROP_AFTER.has(prev) && !(prev === ':' && parens > 0)) || DROP_BEFORE.has(next)) return;
      else out += ' ';
      return;
    }
    if (hadComment) {
      const before = prev === 'hole' || prev === 'escape' || prev === 'word' || prev === '/';
      const after = next === 'hole' || next === '*' || NAME.test(next);
      if (before && after) out += '/**/';
    }
  };
  parts.forEach((part, index) => {
    if (index > 0) prev = 'hole';
    for (let i = 0; i < part.length; i++) {
      const c = part[i];
      if (quote || inUrl) {
        if (c === '\\') {
          out += part.slice(i, i + 2);
          i++;
          continue;
        }
        out += c;
        if (quote && c === quote) {
          quote = null;
          prev = 'word';
        } else if (inUrl && c === ')') {
          inUrl = false;
          prev = ')';
          parens--;
        }
        continue;
      }
      if (WS.has(c)) {
        ws = true;
        continue;
      }
      if (c === '/' && part[i + 1] === '*') {
        const end = part.indexOf('*/', i + 2);
        if (end < 0) throw new Unreadable();
        if (part[i + 2] === '!') {
          flush('/');
          out += part.slice(i, end + 2);
          prev = '/';
        } else {
          comment = true;
        }
        i = end + 1;
        continue;
      }
      flush(c);
      if (c === '\\') {
        out += part.slice(i, i + 2);
        i++;
        prev = 'escape';
        continue;
      }
      out += c;
      if (c === '"' || c === "'") {
        quote = c;
        continue;
      }
      if (NAME.test(c)) {
        prev = 'word';
        continue;
      }
      prev = c;
      if (c === '(') parens++;
      else if (c === ')' && parens > 0) parens--;
      if (c === '(' && /url\($/i.test(out)) {
        let j = i + 1;
        while (j < part.length && WS.has(part[j])) j++;
        if (part[j] !== '"' && part[j] !== "'") inUrl = true;
        continue;
      }
      if (custom) {
        if (c === '(' || c === '[' || c === '{') depth++;
        else if ((c === ')' || c === ']' || c === '}') && depth > 0) depth--;
        else if ((c === ';' || c === '}') && depth === 0) custom = false;
        continue;
      }
      // A custom property's value starts here: its name is the identifier just written, or an interpolation.
      if (c === ':' && (/(?:^|[^\w-])--[\w-]*:$/.test(out) || (out.endsWith(':') && out.length === 1 && index > 0))) {
        custom = true;
        depth = 0;
      }
    }
    if (quote === null && !inUrl && index === parts.length - 1) {
      // At the end of the template, the last run of whitespace goes the same way as any other.
      if (ws) {
        ws = false;
        comment = false;
        if (!DROP_AFTER.has(prev) || custom) out += ' ';
      } else if (comment) comment = false;
    } else if (quote === null && !inUrl) flush('hole');
    result.push(out);
    out = '';
  });
  if (quote || inUrl) throw new Unreadable();
  return result;
}

/**
 * Finds every `css` tagged template in a module's source. Returns, for each, the raw ranges of its static parts
 * (`[start, end)` offsets into `source`). A plain JavaScript/TypeScript scanner: comments, strings, regular expressions
 * and nested templates are stepped over, so `css` in a comment or a string is not a template.
 */
export function findCssTemplates(source) {
  const templates = [];
  const stack = []; // 'brace' or a template being read ({ parts })
  let last = null; // the last significant token: a punctuation character, or a word
  const regexAfterWord = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
  let i = 0;
  const n = source.length;
  // Reads a template's static text from `i` (just after the backtick or the `}` closing an interpolation).
  const readTemplate = (template) => {
    const start = i;
    while (i < n) {
      const c = source[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`') {
        template?.parts.push([start, i]);
        i++;
        last = ')';
        return;
      }
      if (c === '$' && source[i + 1] === '{') {
        template?.parts.push([start, i]);
        stack.push({ template });
        i += 2;
        last = '(';
        return;
      }
      i++;
    }
    throw new Error('css-literals: a template literal runs to the end of the file');
  };
  while (i < n) {
    const c = source[i];
    if (WS.has(c)) {
      i++;
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end < 0 ? n : end;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) throw new Error('css-literals: a comment runs to the end of the file');
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && source[i] !== c) {
        if (source[i] === '\\') i++;
        else if (source[i] === '\n') throw new Error(`css-literals: a string breaks a line at ${i}`);
        i++;
      }
      i++;
      last = ')';
      continue;
    }
    if (c === '`') {
      const tagged = /(?:^|[^\w$.])css\s*$/.test(source.slice(Math.max(0, i - 8), i));
      const template = tagged ? { parts: [] } : null;
      if (template) templates.push(template);
      i++;
      readTemplate(template);
      continue;
    }
    if (c === '/') {
      const regex = last === null || (last.length === 1 && !/[\w$)\]}]/.test(last)) || regexAfterWord.has(last);
      if (regex) {
        i++;
        let inClass = false;
        while (i < n) {
          const d = source[i];
          if (d === '\\') i++;
          else if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) break;
          else if (d === '\n') throw new Error(`css-literals: a regular expression breaks a line at ${i}`);
          i++;
        }
        i++;
        while (i < n && /[a-z]/i.test(source[i])) i++;
        last = ')';
        continue;
      }
      i++;
      last = '/';
      continue;
    }
    if (c === '{') {
      stack.push('brace');
      i++;
      last = '{';
      continue;
    }
    if (c === '}') {
      const frame = stack.pop();
      i++;
      if (frame === undefined) throw new Error(`css-literals: an unmatched } at ${i - 1}`);
      if (frame !== 'brace') {
        readTemplate(frame.template);
        continue;
      }
      last = '}';
      continue;
    }
    if (/[\w$]/.test(c)) {
      const match = /[\w$]+/y;
      match.lastIndex = i;
      const word = match.exec(source)[0];
      i += word.length;
      last = /^\d/.test(word) ? ')' : word;
      continue;
    }
    // TypeScript's non-null assertion (`a!`, `b[0]!`) leaves an expression, after which `/` divides.
    last = c === '!' && /[\w$)\]]/.test(source[i - 1] ?? '') && source[i + 1] !== '=' ? ')' : c;
    i++;
  }
  if (stack.length) throw new Error('css-literals: unbalanced braces at the end of the file');
  return templates;
}

/**
 * The source with every `css` template's comments and whitespace taken out, and the edits made (offsets into the
 * old source; none when the module has nothing to take out).
 */
export function minifyCssLiterals(source) {
  const edits = [];
  for (const { parts } of findCssTemplates(source)) {
    let minified;
    try {
      minified = minifyCssParts(parts.map(([start, end]) => source.slice(start, end)));
    } catch (error) {
      if (error instanceof Unreadable) continue;
      throw error;
    }
    parts.forEach(([start, end], index) => {
      if (minified[index] !== source.slice(start, end)) edits.push({ start, end, text: minified[index] });
    });
  }
  edits.sort((a, b) => a.start - b.start);
  let code = '';
  let at = 0;
  for (const { start, end, text } of edits) {
    code += source.slice(at, start) + text;
    at = end;
  }
  code += source.slice(at);
  return { code, edits };
}

/** The esbuild plugin: every TypeScript module of the package's own source is read with its `css` templates minified. */
export function cssLiteralsPlugin() {
  return {
    name: 'tanrei-css-literals',
    setup(build) {
      build.onLoad({ filter: /[\\/]src[\\/].*\.ts$/ }, async (args) => {
        if (args.path.includes('node_modules')) return undefined;
        const fs = await import('node:fs');
        const source = fs.readFileSync(args.path, 'utf8');
        return { contents: minifyCssLiterals(source).code, loader: 'ts' };
      });
    },
  };
}

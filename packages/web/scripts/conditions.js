// A stylesheet cannot read a custom property in a `@media` or a `@container` condition, so a width that decides a
// layout — the window's two classes (comp.app-shell.breakpoint.*), the width at which a page header's actions stand
// beside its title (comp.page-header.wide.container-width) — cannot be read there as the token it is. The source of
// such a stylesheet names the token where the number goes,
//
//   @media (width >= token(comp.app-shell.breakpoint.expanded)) { … }
//
// and the build (scripts/build.js) writes the token's resolved value in its place, in rem, from the generated token
// stylesheet of the system it builds for: one source, one value, and a test that fails when the two part
// (src/components/app-shell/app-shell.test.ts, src/components/page-header/page-header.test.ts). A system or a product
// layer that changes such a token needs a stylesheet of its own, written the same way.

// (Not one that a comment quotes: `token(…)` between backticks is prose, and stays as it is written.)
const TOKEN = /(?<!`)token\(([a-z][a-z0-9.-]*)\)/g;

/** `comp.app-shell.breakpoint.medium` → `--tanrei-comp-app-shell-breakpoint-medium`, under the namespace the generated CSS uses. */
export const propertyOf = (id, namespace = 'tanrei') => `--${namespace}-${id.replaceAll('.', '-')}`;

/**
 * The custom properties a generated token stylesheet declares, by name. A dimension is declared once whatever the
 * scheme, so the last declaration of a name stands; `over` (another stylesheet's map: the default system's) is what
 * the names this one does not declare fall back to, as the cascade would.
 */
export function declarations(css, over = new Map()) {
  const found = new Map(over);
  for (const [, name, value] of css.matchAll(/(?<![\w(-])(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) found.set(name, value.trim());
  return found;
}

/** Splits the arguments of a function at its top-level commas. */
function split(text) {
  const out = [''];
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) out.push('');
    else out[out.length - 1] += char;
  }
  return out.map((part) => part.trim());
}

/**
 * The length an expression of the generated CSS resolves to, in rem: a literal in rem or px (16 px to the rem, the
 * emitter's own), a `var()` of another token, a product of a length and numbers in `calc()`, and the emitter's
 * `round(nearest, <length>, <step>)`. Anything else is not a width the build can write, and stops it.
 */
export function lengthInRem(expression, values, seen = []) {
  const text = expression.trim();
  let match;
  if ((match = /^(-?\d*\.?\d+)(rem|px)$/.exec(text))) return Number(match[1]) / (match[2] === 'px' ? 16 : 1);
  if ((match = /^var\((--[a-z0-9-]+)\)$/.exec(text))) {
    const name = match[1];
    if (seen.includes(name)) throw new Error(`conditions: ${name} refers to itself`);
    if (!values.has(name)) throw new Error(`conditions: ${name} is not declared in the generated tokens`);
    return lengthInRem(values.get(name), values, [...seen, name]);
  }
  if ((match = /^round\((.*)\)$/s.exec(text))) {
    const [strategy, value, step] = split(match[1]);
    if (strategy !== 'nearest' || step === undefined) throw new Error(`conditions: cannot resolve "${text}"`);
    const [length, to] = [lengthInRem(value, values, seen), lengthInRem(step, values, seen)];
    return to > 0 ? Math.round(length / to) * to : length;
  }
  if ((match = /^calc\((.*)\)$/s.exec(text))) {
    const factors = match[1].split('*').map((factor) => factor.trim());
    let product = 1;
    let lengths = 0;
    for (const factor of factors) {
      if (/^-?\d*\.?\d+$/.test(factor)) product *= Number(factor);
      else {
        product *= lengthInRem(factor, values, seen);
        lengths += 1;
      }
    }
    if (lengths !== 1) throw new Error(`conditions: cannot resolve "${text}"`);
    return product;
  }
  throw new Error(`conditions: cannot resolve "${text}" to a length`);
}

/** The token ids a stylesheet's source names in `token(…)`, each once. */
export const tokensIn = (source) => [...new Set([...source.matchAll(TOKEN)].map(([, id]) => id))];

/** A token's resolved length as the stylesheet writes it: rem, to four places. */
export const resolved = (id, values) => `${+lengthInRem(`var(${propertyOf(id)})`, values).toFixed(4)}rem`;

/**
 * `source` with every `token(<id>)` replaced by the token's resolved length in rem, read from `values` (the
 * `declarations()` of the generated stylesheet of the system the sheet is written for).
 */
export function writeConditions(source, values) {
  if (!tokensIn(source).length) throw new Error('conditions: the stylesheet names no token()');
  return source.replace(TOKEN, (_, id) => resolved(id, values));
}

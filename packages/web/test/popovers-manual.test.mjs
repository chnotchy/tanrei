// Every popover the package draws is a manual one, read from the source. An `auto` popover (the attribute's default,
// `popover` with no value or an empty one, and `hint`) is light-dismissed by the browser: a press outside or Escape
// takes it out of the top layer at once, before the component has played its exit. Only Chromium keeps drawing it
// there while its exit plays (a discrete transition of `display` and `overlay`); WebKit and Firefox drop it with no
// motion, and Firefox has no `overlay` at all. So a component draws its surface as `popover="manual"`, dismisses it
// itself (src/primitives/dismiss.ts), and takes it out of the top layer once its exit has ended — the same in every
// engine (src/primitives/motion.ts). A modal `<dialog>` leaves with `closeModal()` (src/primitives/modal-exit.ts),
// which makes it a manual popover while it leaves.
//
// What is read: a `popover` attribute inside an element's markup (a template, or markup in a string), with its value —
// a literal, or a `${…}` whose quoted strings may only be 'manual' (beside `nothing` and `undefined`, which leave the
// attribute off); `setAttribute('popover', …)`, `toggleAttribute('popover')` and `.popover = …`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function files(dir) {
  return fs.readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(rel);
    return /\.ts$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [rel] : [];
  });
}
const SOURCES = files('src').sort();

/** The value of a `${…}` that begins at `at` (just after `${`): up to its closing brace. */
function expression(text, at) {
  let depth = 1;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(at, i);
  }
  return text.slice(at);
}

/** Whether a value written for the attribute makes a manual popover (or leaves the attribute off). */
function manual(value) {
  const literal = value.match(/^(['"])(.*)\1$/s);
  if (literal) return literal[2] === 'manual';
  const strings = [...value.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
  return strings.length > 0 && strings.every((s) => s === 'manual');
}

/** Every popover the text writes that is not a manual one, as `<line>: <what>`. */
export function notManual(text) {
  const found = [];
  const line = (index) => text.slice(0, index).split('\n').length;
  // In an element's markup: `<tag … popover …>`.
  for (const tag of text.matchAll(/<[a-z][a-z0-9-]*\b(?:[^<>`$]|\$\{[^}]*\})*?\spopover(?=[\s=>/])/g)) {
    const end = tag.index + tag[0].length;
    const rest = text.slice(end);
    const assigned = rest.match(/^\s*=\s*/);
    if (!assigned) {
      found.push(`${line(end)}: popover with no value (auto)`);
      continue;
    }
    const from = end + assigned[0].length;
    let value;
    if (text.startsWith('${', from)) value = expression(text, from + 2);
    else value = (text.slice(from).match(/^("[^"]*"|'[^']*'|[^\s>]+)/) ?? [''])[0];
    if (!manual(value)) found.push(`${line(end)}: popover=${value}`);
  }
  for (const m of text.matchAll(/setAttribute\(\s*['"]popover['"]\s*,\s*([^)]*)\)/g)) if (!manual(m[1].trim())) found.push(`${line(m.index)}: setAttribute('popover', ${m[1].trim()})`);
  for (const m of text.matchAll(/toggleAttribute\(\s*['"]popover['"]/g)) found.push(`${line(m.index)}: toggleAttribute('popover') (auto)`);
  for (const m of text.matchAll(/\.popover\s*=(?!=)\s*([^;\n]*)/g)) if (!manual(m[1].trim())) found.push(`${line(m.index)}: .popover = ${m[1].trim()}`);
  return found;
}

test('the reader tells a manual popover from one the browser light-dismisses', () => {
  assert.deepEqual(notManual('html`<div class="surface" popover="manual" role="none">`'), []);
  assert.deepEqual(notManual("html`<div popover=${this.inline ? nothing : 'manual'} role=\"none\">`"), []);
  assert.deepEqual(notManual("html`<div popover=${ifDefined(this.inline ? undefined : 'manual')}>`"), []);
  assert.deepEqual(notManual("surface.setAttribute('popover', 'manual'); el.popover = 'manual';"), []);
  assert.equal(notManual('html`<div class="surface" popover role="none">`').length, 1);
  assert.equal(notManual('html`<div popover>`').length, 1);
  assert.equal(notManual('html`<div popover="">`').length, 1);
  assert.equal(notManual('html`<div popover="auto">`').length, 1);
  assert.equal(notManual('html`<div popover="hint">`').length, 1);
  assert.equal(notManual("html`<div popover=${this.light ? 'auto' : 'manual'}>`").length, 1);
  assert.equal(notManual("el.setAttribute('popover', '');").length, 1);
  assert.equal(notManual("el.setAttribute('popover', 'auto');").length, 1);
  assert.equal(notManual("el.toggleAttribute('popover', true);").length, 1);
  assert.equal(notManual("el.popover = 'auto';").length, 1);
  // A word in a sentence is no markup.
  assert.deepEqual(notManual('// a popover is drawn in the top layer, as <tanrei-popover> says'), []);
});

test('every popover the package draws is popover="manual": the browser light-dismisses an auto popover at once, and only Chromium keeps drawing its exit', () => {
  const found = SOURCES.flatMap((file) => notManual(fs.readFileSync(path.join(pkg, file), 'utf8')).map((what) => `${file}:${what}`));
  assert.deepEqual(
    found,
    [],
    'an auto (or hint) popover is light-dismissed by the browser before its component plays its exit, and WebKit and Firefox then drop it at once with no motion: draw it as popover="manual", dismiss it with src/primitives/dismiss.ts, and take it out of the top layer once its exit has ended',
  );
});

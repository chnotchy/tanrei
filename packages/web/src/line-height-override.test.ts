// A role's line height is one entry: `<role>-line-height`, its ratio, which a product overrides on the root or on one
// element (src/styles/type.ts). The text reads it where it is drawn, rounded to a whole pixel at its own size; every box
// that holds the role's lines reads the same entry where it is, times the role's size, rounded the same way. So one
// override moves the text's line, the box a component computes from it (a stacked text input), and the row the cloak
// holds before the element is defined (a filled text input with a label) — together, in every engine.
// affected: text-input
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, fixturesDocument, loadSpec } from '../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = (file: string) => fs.readFileSync(path.join(here, '../dist', file), 'utf8');

const INPUT = '--tanrei-comp-input-box-input-typescale-medium';
/** The overrides: lines three and four times the size, taller than any box the medium size has. */
const RATIO = '3';
const TALLER = '4';
const FIXTURES: Fixture[] = [
  { id: 'stacked', props: { label: 'Name', value: 'Ada' } },
  { id: 'filled', props: { variant: 'filled', label: 'Name', value: 'Ada' } },
];

interface Read {
  id: string;
  /** The element's height. */
  box: number;
  /** The input's font size and line, as computed (0 before the element draws its input). */
  size: number;
  line: number;
}

/** Runs in the page: each fixture's element, and the input it draws in its shadow tree. */
function read(): Read[] {
  return [...document.querySelectorAll<HTMLElement>('[data-fixture]')].map((stage) => {
    const host = stage.querySelector('tanrei-text-input')!;
    const input = host.shadowRoot?.querySelector('[part~="input"]');
    const style = input ? getComputedStyle(input) : undefined;
    return { id: stage.dataset.fixture!, box: host.getBoundingClientRect().height, size: style ? Number.parseFloat(style.fontSize) : 0, line: style ? Number.parseFloat(style.lineHeight) : 0 };
  });
}

/**
 * The fixtures as a server sends them — the cloak's stylesheet and no script — with `override` set on each fixture's
 * stage (one element of the page, not the root), read before the element is defined and once it is.
 */
async function drawn(first: Page, override: string | null): Promise<{ cloaked: Read[]; defined: Read[] }> {
  const page = await first.context().newPage();
  const markup = await fixturesDocument(loadSpec('text-input'), { fixtures: FIXTURES });
  const at = markup.indexOf('<script type="module">');
  const scripts = [...markup.slice(at).matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
  await page.setContent(`${markup.slice(0, at).replace('</head>', `<style>${dist('cloak.css')}</style></head>`)}</body></html>`);
  if (override) await page.evaluate(([name, value]) => document.querySelectorAll<HTMLElement>('[data-fixture]').forEach((stage) => stage.style.setProperty(name!, value!)), [`${INPUT}-line-height`, override]);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => !!customElements.get('tanrei-text-input'))).toBe(false);
  const cloaked = await page.evaluate(read);
  for (const content of scripts) await page.addScriptTag({ type: 'module', content });
  await page.evaluate(() => customElements.whenDefined('tanrei-text-input'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const defined = await page.evaluate(read);
  await page.close();
  return { cloaked, defined };
}

test('TXI: a role\'s line height overridden on one element moves its text\'s line, the stacked box drawn from it and the row the cloak holds, together', async ({ page }) => {
  const rest = await drawn(page, null);
  const now = await drawn(page, RATIO);
  const more = await drawn(page, TALLER);
  for (const id of ['stacked', 'filled']) {
    const [was, is, taller] = [rest, now, more].map((run) => run.defined.find((r) => r.id === id)!);
    // The text: the size times the override, on a whole pixel.
    expect(is.line, `${id}: the input's line`).toBe(Math.round(is.size * Number(RATIO)));
    expect(taller.line, `${id}: the input's line`).toBe(Math.round(taller.size * Number(TALLER)));
    expect(Number.isInteger(was.line), `${id}: the line at rest, ${was.line}px, is a whole pixel`).toBe(true);
    // The box is computed from the same entry: past the box's own height, it grows by what the line grows.
    expect(is.box, `${id}: the box (${was.box}px at rest) grows with a line of ${is.line}px`).toBeGreaterThan(was.box);
    expect(Math.abs(taller.box - is.box - (taller.line - is.line)), `${id}: ${is.box}px → ${taller.box}px for a line of ${is.line}px → ${taller.line}px`).toBeLessThanOrEqual(0.5);
  }
  // The cloak holds the labelled filled row at the height it is drawn, with the override and without it.
  for (const run of [rest, now, more]) {
    const [cloaked, defined] = [run.cloaked.find((r) => r.id === 'filled')!, run.defined.find((r) => r.id === 'filled')!];
    expect(Math.abs(cloaked.box - defined.box), `the cloaked filled row (${cloaked.box}px) is as high as drawn (${defined.box}px)`).toBeLessThanOrEqual(0.5);
  }
  expect(now.cloaked.find((r) => r.id === 'filled')!.box).toBeGreaterThan(rest.cloaked.find((r) => r.id === 'filled')!.box);
});

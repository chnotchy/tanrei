// text.css: every role of sys.typescale as a utility — under the default system and under a preset scope.
// Rendered Markdown bound to the roles by level is prose (src/styles/prose.test.ts, specs/prose.spec.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The roles of the default system, from the generated stylesheet: the source text.css must cover, one class each. */
const ROLES = [...new Set([...read('dist/tokens.css').matchAll(/--tanrei-sys-typescale-([a-z0-9-]+)-font:/g)].map((m) => m[1]))].sort();
const FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;

async function mount(page: Page, body: string, options: { system?: string } = {}) {
  await page.setContent(`<!doctype html>
<html lang="en"${options.system ? ` data-tanrei-system="${options.system}"` : ''}>
  <head>
    <meta charset="utf-8" />
    <style>${read('dist/tokens.css')}</style>
    ${options.system ? `<style>${read(`dist/systems/${options.system}.css`)}</style>` : ''}
    <style>${read('dist/text.css')}</style>
  </head>
  <body>${body}</body>
</html>`);
}

/** The computed fields of `selector`, and of a probe that reads the role's own properties: the class must equal the role. */
async function fields(page: Page, selector: string, role: string) {
  return page.evaluate(
    ([sel, r, keys]) => {
      const pick = (el: Element) => Object.fromEntries(keys.map((k) => [k, (getComputedStyle(el) as unknown as Record<string, string>)[k].replaceAll('"', '')]));
      const probe = document.createElement('span');
      probe.style.cssText = `font: var(--tanrei-sys-typescale-${r}-font); letter-spacing: var(--tanrei-sys-typescale-${r}-letter-spacing)`;
      probe.textContent = 'probe';
      document.body.append(probe);
      const out = { element: pick(document.querySelector(sel)!), role: pick(probe) };
      probe.remove();
      return out;
    },
    [selector, role, FIELDS] as const,
  );
}

const weight = (page: Page, selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).fontWeight);

test.describe('text.css', () => {
  test('one utility per role sets every field of the role, tracking included', async ({ page }) => {
    expect(ROLES).toHaveLength(16);
    await mount(page, ROLES.map((r) => `<span class="tanrei-text-${r}" data-role="${r}">${r}</span>`).join(''));
    for (const role of ROLES) {
      const { element, role: expected } = await fields(page, `[data-role="${role}"]`, role);
      expect(element, role).toEqual(expected);
    }
    // Known anchors, so the probe is not the only witness: heading-1 is h1 (32 px, 500), body is p (14 px, 400).
    const anchor = async (role: string) => {
      const e = (await fields(page, `[data-role="${role}"]`, role)).element;
      return { size: Number.parseFloat(e.fontSize), weight: e.fontWeight, lineHeight: Number.parseFloat(e.lineHeight), tracking: Number.parseFloat(e.letterSpacing) };
    };
    expect(await anchor('heading-1')).toMatchObject({ size: 32, weight: '500', lineHeight: 40 });
    const body = await anchor('body');
    expect(body).toMatchObject({ size: 14, weight: '400' });
    expect(body.lineHeight).toBeCloseTo(22, 1);
    expect((await anchor('display')).tracking).toBeCloseTo(-1.92, 2);
  });

  test('.tanrei-text-emphasized is the role weight plus the family step, on the element or a descendant; nothing else moves', async ({ page }) => {
    await mount(page, `
      <h1 class="tanrei-text-heading-1" id="h">h</h1>
      <h1 class="tanrei-text-heading-1 tanrei-text-emphasized" id="he">h</h1>
      <p class="tanrei-text-body" id="p">p <em class="tanrei-text-emphasized" id="pe">e</em></p>
      <span class="tanrei-text-label tanrei-text-emphasized" id="le">l</span>
      <span class="tanrei-text-caption tanrei-text-emphasized" id="ce">c</span>
      <span class="tanrei-text-code tanrei-text-emphasized" id="ke">k</span>`);
    const step = (family: string) => page.evaluate((f) => Number(getComputedStyle(document.documentElement).getPropertyValue(`--tanrei-sys-typescale-emphasis-${f}`)), family);
    expect(await weight(page, '#h')).toBe('500');
    expect(await weight(page, '#he')).toBe(String(500 + (await step('heading')))); // 600 by default
    expect(await weight(page, '#pe')).toBe(String(400 + (await step('body'))));
    expect(await weight(page, '#le')).toBe(String(500 + (await step('label'))));
    // caption and code take the label step.
    expect(await weight(page, '#ce')).toBe(String(500 + (await step('label'))));
    expect(await weight(page, '#ke')).toBe(String(400 + (await step('label'))));
    const [h, he] = await Promise.all(['#h', '#he'].map((sel) => fields(page, sel, 'heading-1').then((f) => f.element)));
    expect({ ...he, fontWeight: h.fontWeight }).toEqual(h);

    // Under m3-like a label's step is 200: label emphasized = 500 + 200.
    await mount(page, `<span class="tanrei-text-label tanrei-text-emphasized" id="le">l</span><h1 class="tanrei-text-heading-1 tanrei-text-emphasized" id="he">h</h1>`, { system: 'm3-like' });
    expect(await weight(page, '#le')).toBe('700');
    expect(await weight(page, '#he')).toBe('500'); // m3-like: heading-1 is 400 + 100
  });

  test('.tanrei-text-eyebrow is the plain face (Inter), small and tracked; the uppercase is the component’s', async ({ page }) => {
    await mount(page, `<span class="tanrei-text-eyebrow" id="e">Eyebrow</span>`);
    const style = await page.locator('#e').evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily.replaceAll('"', ''), size: Number.parseFloat(s.fontSize), tracking: Number.parseFloat(s.letterSpacing), transform: s.textTransform };
    });
    expect(style.family.split(',')[0].trim()).toBe('Inter');
    expect(style.size).toBeLessThan(14);
    expect(style.tracking).toBeGreaterThan(0);
    expect(style.transform).toBe('none');
  });
});

// Letter-spacing follows the script of the text (src/styles/script-tracking.ts; docs/architecture/overview.md, component
// conventions): every component's title, and prose's headings, are measured in English, in Japanese, Chinese and
// Korean, and in scripts that join their letters or stack marks on them. Each case gives its title a tracking of its own
// through the token it reads, so the rule is seen whatever value the default system has: a negative one is dropped in
// Chinese, Japanese and Korean and a positive one kept; in Arabic or Hindi there is none.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { SOLID_LANGUAGES, UNTRACKED_LANGUAGES, scriptTracking, writeScriptTracking } from './script-tracking.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** A page with the tokens, the class stylesheets and every element. */
const mount = async (page: Page, body: string) => {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <style>${read('dist/tokens.css')}</style>
    <style>${['text', 'prose', 'steps', 'timeline'].map((name) => read(`dist/${name}.css`)).join('\n')}</style>
    </head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-dialog'));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

interface Case {
  /** The behaviour that says the title follows its script. */
  id: string;
  /** The custom properties that set its tracking (each is given the value under test). */
  tokens: string[];
  /** The component, with `LANG` where its `lang` attribute goes and `STYLE` where the tokens are given. */
  markup: string;
  /** The title, from the component's host (`>>>` steps into a shadow root). */
  title: string;
}

const C = (name: string) => `--tanrei-comp-${name}`;
const CASES: Case[] = [
  { id: 'DLG-8', tokens: [C('dialog-headline-typescale-letter-spacing')], markup: '<tanrei-dialog LANG STYLE headline="Title 見出し"></tanrei-dialog>', title: '>>> .headline' },
  { id: 'POP-12', tokens: [C('popover-headline-typescale-letter-spacing')], markup: '<tanrei-popover LANG STYLE headline="Title 見出し"></tanrei-popover>', title: '>>> .headline' },
  { id: 'SSH-9', tokens: [C('side-sheet-headline-typescale-letter-spacing')], markup: '<tanrei-side-sheet LANG STYLE headline="Title 見出し"></tanrei-side-sheet>', title: '>>> .headline' },
  { id: 'SNK-22', tokens: [C('snackbar-title-typescale-letter-spacing')], markup: '<tanrei-snackbar LANG STYLE headline="Title 見出し" message="Message"></tanrei-snackbar>', title: '>>> .title' },
  { id: 'TIP-11', tokens: [C('tooltip-rich-title-typescale-letter-spacing')], markup: '<tanrei-tooltip LANG STYLE variant="rich" title="Title 見出し" text="Text"><span>info</span></tanrei-tooltip>', title: '>>> .title' },
  { id: 'APB-5', tokens: [C('app-bar-title-typescale-small-letter-spacing')], markup: '<tanrei-app-bar LANG STYLE headline="Title 見出し"></tanrei-app-bar>', title: '>>> .title' },
  { id: 'APB-7', tokens: [C('app-bar-title-typescale-large-letter-spacing')], markup: '<tanrei-app-bar LANG STYLE size="large" headline="Title 見出し"></tanrei-app-bar>', title: '>>> .block .title' },
  { id: 'CLO-7', tokens: [C('callout-title-typescale-medium-letter-spacing')], markup: '<tanrei-callout LANG STYLE headline="Title 見出し">Body</tanrei-callout>', title: '>>> .title' },
  { id: 'CLO-7', tokens: [C('callout-title-typescale-medium-letter-spacing')], markup: '<tanrei-callout STYLE><h3 slot="title" LANG>Title 見出し</h3>Body</tanrei-callout>', title: 'h3' },
  { id: 'EMP-4', tokens: [C('empty-state-title-typescale-medium-letter-spacing')], markup: '<tanrei-empty-state LANG STYLE headline="Title 見出し"></tanrei-empty-state>', title: '>>> .title' },
  { id: 'EMP-4', tokens: [C('empty-state-title-typescale-medium-letter-spacing')], markup: '<tanrei-empty-state STYLE><h3 slot="title" LANG>Title 見出し</h3></tanrei-empty-state>', title: 'h3' },
  { id: 'NVD-16', tokens: [C('navigation-drawer-heading-typescale-letter-spacing')], markup: '<tanrei-navigation-drawer LANG STYLE label="Menu" open><tanrei-navigation-drawer-section heading="Title 見出し"></tanrei-navigation-drawer-section></tanrei-navigation-drawer>', title: 'tanrei-navigation-drawer-section >>> .heading-text' },
  { id: 'DTM-10', tokens: [C('date-time-picker-header-value-typescale-letter-spacing')], markup: '<tanrei-date-time-picker LANG STYLE open presentation="modal" mode="date" value="2026-09-17" locale="ja-JP" label="日付を選択" date-label="日付"></tanrei-date-time-picker>', title: '>>> .header > .value' },
  { id: 'ACC-3', tokens: [C('accordion-label-typescale-regular-letter-spacing')], markup: '<tanrei-accordion LANG STYLE><details><summary>Title 見出し</summary><p>Body</p></details></tanrei-accordion>', title: 'summary' },
  { id: 'FIG-8', tokens: [C('figure-title-typescale-letter-spacing')], markup: '<tanrei-figure LANG STYLE headline="Title 見出し"><svg width="40" height="40"></svg></tanrei-figure>', title: '[data-part="title"]' },
  { id: 'LKC-4', tokens: [C('link-card-title-typescale-letter-spacing')], markup: '<tanrei-link-card LANG STYLE><a href="#t"><div data-part="body"><span data-part="title">Title 見出し</span></div></a></tanrei-link-card>', title: '[data-part="title"]' },
  { id: 'STP-6', tokens: [C('steps-title-typescale-medium-letter-spacing')], markup: '<ol class="tanrei-steps" LANG STYLE><li><p class="tanrei-steps-title">Title 見出し</p><p>Body</p></li></ol>', title: '.tanrei-steps-title' },
  { id: 'TML-4', tokens: [C('timeline-title-typescale-medium-letter-spacing')], markup: '<ol class="tanrei-timeline" LANG STYLE><li><p class="tanrei-timeline-title">Title 見出し</p><p>Body</p></li></ol>', title: '.tanrei-timeline-title' },
  { id: 'PGH-4', tokens: [C('page-header-title-typescale-medium-letter-spacing')], markup: '<tanrei-page-header LANG STYLE><h1>Title 見出し</h1></tanrei-page-header>', title: 'h1' },
  { id: 'PGH-4', tokens: [C('page-header-eyebrow-typescale-letter-spacing')], markup: '<tanrei-page-header LANG STYLE><p data-part="eyebrow">Eyebrow</p><h1>Title</h1></tanrei-page-header>', title: '[data-part="eyebrow"]' },
  { id: 'DSL-6', tokens: [C('description-list-stat-value-typescale-regular-letter-spacing')], markup: '<tanrei-description-list LANG STYLE layout="stat"><dl><div><dt>Term 用語</dt><dd>1,234</dd></div></dl></tanrei-description-list>', title: 'dd' },
  { id: 'PRS-20', tokens: ['--tanrei-sys-typescale-heading-2-letter-spacing'], markup: '<div class="tanrei-prose" LANG STYLE><h2>Title 見出し</h2><p>Body</p></div>', title: 'h2' },
  { id: 'PRS-20', tokens: ['--tanrei-sys-typescale-heading-2-letter-spacing'], markup: '<div class="tanrei-prose" STYLE><h2 LANG>Title 見出し</h2><p>Body</p></div>', title: 'h2' },
];

/** The computed letter-spacing of each case's title, in px (0 for `normal`), for one language and one tracking. */
const measure = async (page: Page, lang: string, tracking: string) => {
  await mount(
    page,
    CASES.map((c, i) => `<div class="case" data-case="${i}">${c.markup.replace('LANG', `lang="${lang}"`).replace('STYLE', `style="${c.tokens.map((t) => `${t}: ${tracking}`).join('; ')}"`)}</div>`).join(''),
  );
  return page.evaluate((titles) =>
    titles.map((title, i) => {
      const stage = document.querySelector(`[data-case="${i}"]`)!;
      const [first, ...inside] = title.split('>>>').map((part) => part.trim());
      let element: Element | null = first ? stage.querySelector(first) : stage.firstElementChild;
      for (const part of inside) element = element?.shadowRoot?.querySelector(part) ?? null;
      if (!element) return Number.NaN;
      const value = getComputedStyle(element).letterSpacing;
      return value === 'normal' ? 0 : Number.parseFloat(value);
    }), CASES.map((c) => c.title));
};

/** The cases whose title is not at `px`, each with what it is at. */
const wrong = (got: number[], px: number) => got.flatMap((value, i) => (value === px ? [] : [`${CASES[i].id} (case ${i}, ${CASES[i].title}): ${value}`]));

test.describe('a title’s letter-spacing follows its script', () => {
  test('DLG-8, POP-12, SSH-9, SNK-22, TIP-11, APB-5, APB-7, CLO-7, EMP-4, NVD-16, DTM-10, ACC-3, FIG-8, LKC-4, STP-6, TML-4, PGH-4, DSL-6, PRS-20: in English a title takes the tracking its token gives, negative or positive', async ({ page }) => {
    for (const [tracking, px] of [['-2px', -2], ['3px', 3]] as const) {
      expect(wrong(await measure(page, 'en', tracking), px), `en ${tracking}`).toEqual([]);
    }
  });

  test('DLG-8, POP-12, SSH-9, SNK-22, TIP-11, APB-5, APB-7, CLO-7, EMP-4, NVD-16, DTM-10, ACC-3, FIG-8, LKC-4, STP-6, TML-4, PGH-4, DSL-6, PRS-20: in Chinese, Japanese and Korean a negative tracking is dropped — the title is set solid — and a positive one is kept', async ({ page }) => {
    for (const lang of ['ja', 'zh-Hans', 'ko']) {
      expect(wrong(await measure(page, lang, '-2px'), 0), lang).toEqual([]);
    }
    expect(wrong(await measure(page, 'ja', '3px'), 3), 'ja 3px').toEqual([]);
  });

  test('DLG-8, POP-12, SSH-9, SNK-22, TIP-11, APB-5, APB-7, CLO-7, EMP-4, NVD-16, DTM-10, ACC-3, FIG-8, LKC-4, STP-6, TML-4, PGH-4, DSL-6, PRS-20: in a script that joins its letters or stacks marks on them the title takes no tracking at all', async ({ page }) => {
    for (const [lang, tracking] of [['ar', '-2px'], ['ar-EG', '3px'], ['hi', '3px'], ['th', '-2px']] as const) {
      expect(wrong(await measure(page, lang, tracking), 0), `${lang} ${tracking}`).toEqual([]);
    }
  });

  test('PRS-20: the rule is one source — the languages, the rules it writes, and a light-DOM stylesheet’s mark written in its place', async () => {
    expect([...SOLID_LANGUAGES]).toEqual(['ja', 'zh', 'ko']);
    expect(UNTRACKED_LANGUAGES).toContain('ar');
    expect(scriptTracking('.title', 'var(--x)')).toContain('.title:where(:lang(ja), :lang(zh), :lang(ko)) {\n  letter-spacing: max(0px, var(--x));\n}');
    expect(scriptTracking('slot', 'var(--x)', { slotted: true })).toContain('slot::slotted(*) {\n  letter-spacing: var(--x);\n}');
    expect(writeScriptTracking('  /* script-tracking: & | var(--y) */\n')).toBe(`${scriptTracking('&', 'var(--y)').replace(/^/gm, '  ')}\n`);
    // No stylesheet the package ships keeps a mark, or a language list of its own for letter-spacing.
    for (const file of fs.readdirSync(path.join(pkg, 'dist')).filter((name) => name.endsWith('.css'))) {
      const text = read(`dist/${file}`);
      expect(text, file).not.toContain('script-tracking:');
    }
    for (const file of ['prose', 'page-header', 'description-list'].map((name) => `src/styles/${name}.css`)) {
      expect(read(file).replace(/\/\*[\s\S]*?\*\//g, ''), file).not.toMatch(/:lang\([a-z]+\)[^{]*\{[^}]*letter-spacing/);
    }
  });
});

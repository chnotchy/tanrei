// `hidden` hides: an element of the package that carries the attribute has no box, whatever it is and wherever it
// stands.
//
// The browser's own rule for `[hidden]` is the weakest there is: a host that names its `display` in its shadow sheet,
// a light-DOM element whose stylesheet names it, a class on the product's element that does — each is an author's
// rule, and beats it. So every sheet that gives an element of the package a `display` says what `hidden` means too
// (`hiddenHost`, src/primitives/hidden.ts, for a shadow host; `:where(<tag>[hidden])` in a light-DOM stylesheet), and
// this walks the WHOLE registry — the generated manifest's tags, and the specs whose web form is a class — so that a
// component added tomorrow is asked the same without anyone adding it to a list.
//
// Three places an element can stand: the document; a product's own shadow root, where no rule of the document reaches
// it; and a page that loaded every stylesheet of the package before the elements were defined.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

interface Declaration {
  tagName?: string;
  attributes?: { name: string }[];
}
const declarations: Declaration[] = (JSON.parse(read('custom-elements.json')) as { modules: { declarations?: Declaration[] }[] }).modules.flatMap((module) => module.declarations ?? []).filter((declaration) => declaration.tagName);
/** Every element the package defines. */
const TAGS = declarations.map((declaration) => declaration.tagName!).sort();
/** Those that can be open: asked again while open, which is when an overlay has a box at all. */
const OPENABLE = declarations.filter((declaration) => declaration.attributes?.some((attribute) => attribute.name === 'open')).map((declaration) => declaration.tagName!);

/**
 * The components whose web form is a class on the product's own element: every spec whose web name is not a tag of the
 * manifest. The element is the one the component's documentation writes the class on (a `div` where none is named
 * here — the class's rules do not ask for a tag).
 */
const ELEMENT: Record<string, string> = { 'tanrei-link': 'a', 'tanrei-code': 'code', 'tanrei-steps': 'ol', 'tanrei-timeline': 'ol', 'tanrei-pagination': 'nav', 'tanrei-prose': 'div' };
const CLASSES = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => (JSON.parse(fs.readFileSync(path.join(repo, 'specs', file), 'utf8')) as { name: string; platforms?: { web?: { name?: string } } }))
  // A spec accepted ahead of its implementation has neither a tag nor a stylesheet yet.
  .filter((spec) => spec.platforms?.web?.name && !TAGS.includes(spec.platforms.web.name) && fs.existsSync(path.join(pkg, `src/styles/${spec.name === 'inline-code' ? 'code' : spec.name}.css`)))
  .map((spec) => spec.platforms!.web!.name!)
  .sort();
/** The classes a class-form component writes on the product's elements inside it, which name a `display` of their own. */
const INNER_CLASSES = ['tanrei-pagination-item', 'tanrei-icon', 'tanrei-skeleton-placeholder'];

/** Every stylesheet the package ships for a page (the tokens apart). */
const SHEETS = fs
  .readdirSync(path.join(pkg, 'dist'))
  .filter((file) => file.endsWith('.css') && file !== 'tokens.css')
  .sort();

const PAGE = 'http://hidden.test/';
const html = (sheets: string[]) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style>${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}</head><body><main></main><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

async function open(page: Page, sheets: string[] = []) {
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html(sheets) }));
  await page.goto(PAGE);
  await page.evaluate((tags) => Promise.all(tags.map((tag) => customElements.whenDefined(tag))), TAGS);
}

interface Subject {
  /** What is mounted, as a failure names it. */
  name: string;
  html: string;
}

/**
 * Mounts every subject in `where` — the document's `main`, or a shadow root on an element of the product's — lets each
 * draw itself, and returns the names of those that are drawn: a computed `display` that is not `none` (a host of
 * `display: contents` has no box of its own and still draws its children), or any box.
 */
async function drawn(page: Page, subjects: Subject[], where: 'document' | 'shadow root'): Promise<string[]> {
  return page.evaluate(
    async ({ subjects, where }) => {
      const main = document.querySelector('main')!;
      const root: ParentNode = where === 'document' ? main : main.appendChild(document.createElement('div')).attachShadow({ mode: 'open' });
      const mounted = subjects.map((subject) => {
        const holder = root.appendChild(document.createElement('div'));
        holder.innerHTML = subject.html;
        return { name: subject.name, element: holder.firstElementChild as HTMLElement };
      });
      // Each has had its first update (an element that is not a Lit element has none to wait for), then two frames.
      await Promise.all(mounted.map(({ element }) => (element as unknown as { updateComplete?: Promise<unknown> }).updateComplete));
      for (let frame = 0; frame < 2; frame++) await new Promise((done) => requestAnimationFrame(done));
      const seen = mounted.filter(({ element }) => getComputedStyle(element).display !== 'none' || element.getClientRects().length > 0).map(({ name, element }) => `${name} (display: ${getComputedStyle(element).display})`);
      main.replaceChildren();
      return seen;
    },
    { subjects, where },
  );
}

/**
 * Drawn still, a known gap: the menu's six elements, the tabs and a tab, and a skeleton's
 * placeholder. They are expected to be drawn — exactly these, in every place — so that the one that is fixed fails
 * here until its name is taken out, and the list cannot outlive its reason. Nothing is added to it.
 */
const OWED: string[] = [];
const owed = (name: string) => OWED.includes(name.replace(/\[open\]$/, ''));

/** What is asked of `subjects` in `where`: none is drawn but those owed, and those owed are (see `OWED`). */
async function expectHidden(page: Page, subjects: Subject[], where: 'document' | 'shadow root') {
  const seen = (await drawn(page, subjects, where)).map((line) => line.replace(/ \(display: [^)]*\)$/, ''));
  expect(seen.filter((name) => !owed(name)), `drawn with the hidden attribute, in the ${where}`).toEqual([]);
  expect(seen.filter(owed), `owed and drawn no more, in the ${where}: take the name out of OWED`).toEqual(subjects.map((subject) => subject.name).filter(owed));
}

const ELEMENTS: Subject[] = TAGS.map((tag) => ({ name: tag, html: `<${tag} hidden></${tag}>` }));
const OPEN: Subject[] = OPENABLE.map((tag) => ({ name: `${tag}[open]`, html: `<${tag} hidden open></${tag}>` }));
const CLASSED: Subject[] = [
  // A link's two forms that name a display: a glyph alone, and (below, with no destination) what is not a link.
  { name: '.tanrei-link of a glyph alone', html: '<a class="tanrei-link" href="#there" aria-label="There" hidden><span class="tanrei-icon">home</span></a>' },
  ...CLASSES.map((name) => ({ name: `.${name}`, html: `<${ELEMENT[name] ?? 'div'} class="${name}" hidden>text</${ELEMENT[name] ?? 'div'}>` })),
  ...INNER_CLASSES.map((name) => ({ name: `.${name}`, html: `<span class="${name}" hidden>text</span>` })),
];

test.describe('hidden hides', () => {
  test('the registry is read: every tag of the manifest, and the class-form components', () => {
    expect(TAGS.length).toBeGreaterThanOrEqual(84);
    expect(OPENABLE).toContain('tanrei-dialog');
    expect(CLASSES).toEqual(expect.arrayContaining(['tanrei-code', 'tanrei-link', 'tanrei-pagination', 'tanrei-prose', 'tanrei-steps', 'tanrei-timeline']));
  });

  test('every element of the package with the hidden attribute has no box in the document', async ({ page }) => {
    await open(page);
    await expectHidden(page, ELEMENTS, 'document');
  });

  test('every element of the package with the hidden attribute has no box in a shadow root of the product\'s, where no rule of the document reaches it', async ({ page }) => {
    await open(page);
    await expectHidden(page, ELEMENTS, 'shadow root');
  });

  test('every element that can be open has no box while it is hidden and open', async ({ page }) => {
    await open(page);
    await expectHidden(page, OPEN, 'document');
    await expectHidden(page, OPEN, 'shadow root');
  });

  test('on a page that loaded every stylesheet of the package, every element and every class-form component with the hidden attribute has no box', async ({ page }) => {
    await open(page, SHEETS);
    await expectHidden(page, [...ELEMENTS, ...CLASSED], 'document');
  });
});

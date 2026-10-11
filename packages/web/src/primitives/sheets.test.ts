// What defining the elements of a page costs its stylesheets (src/primitives/sheets.ts). A
// sheet added to the document has the browser build the document's
// rules again and, for most of the package's sheets, style every element of the page again — 60 to 90 ms each on a
// long page, once per component whose module arrived. So the WRITES are counted here, not the time (a time is the
// machine's as much as the package's): every assignment of `adoptedStyleSheets`, to the document and to each shadow
// root, and every `CSS.registerProperty()`, from before the bundle is evaluated until the page is at rest.
//
// What is held:
//   - a page that loaded a component's stylesheet gets that sheet from no element (and stays drawn the same);
//   - a page that did not gets it once, however many instances are defined, and each instance is drawn;
//   - no root is ever handed a sheet it has, and no assignment leaves a root's list as it was;
//   - a product's shadow root inside an element of the same kind — which hands it its private names by inheritance —
//     still gets the sheet;
//   - an element connected inside one of its own kind, in a later turn, is handed nothing either: it inherits the
//     name its own rule would give it, and is not mistaken for an element its root does not draw;
//   - no element registers a custom property from script, and no stylesheet — the tokens, or an element's own,
//     loaded by the page or handed to the document by the element — registers one (src/styles/registered-properties.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { LIGHT_DOM_SUBJECTS, type LightDomSubject } from '../../test/light-dom.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's pages are served at (nothing is fetched from it). */
const PAGE = 'http://sheets.test/';

/** How many of each: enough that "once" and "once each" cannot be mistaken for one another. */
const N = 6;

type Subject = LightDomSubject;
const SUBJECTS = LIGHT_DOM_SUBJECTS;

/** One write of `adoptedStyleSheets`, as the page saw it. */
interface Write {
  /** `document`, or the tag of the shadow root's host. */
  root: string;
  /** The marks (of `SUBJECTS`) the sheets this write added set; a sheet that sets none is listed as `other`. */
  added: string[];
  /** A sheet in the new list that the root had already and that the new list holds twice, or a list that changed nothing. */
  idle: boolean;
}
interface Seen {
  writes: Write[];
  registered: string[];
}

/** Counts from before any script of the page runs. `marks` are the names that tell the package's sheets apart. */
async function watch(page: Page, marks: string[]) {
  await page.addInitScript((names) => {
    const seen: Seen = { writes: [], registered: [] };
    (window as unknown as { __sheets: Seen }).__sheets = seen;
    const kind = (sheet: CSSStyleSheet) => {
      const text = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      // The sheet's own declaration of the name on the element (`--name:`), not a rule that reads it.
      return names.find((name) => text.includes(`${name}:`)) ?? 'other';
    };
    for (const [proto, root] of [
      [Document.prototype, () => 'document'],
      [ShadowRoot.prototype, (self: ShadowRoot) => self.host.localName],
    ] as const) {
      const own = Object.getOwnPropertyDescriptor(proto, 'adoptedStyleSheets')!;
      Object.defineProperty(proto, 'adoptedStyleSheets', {
        configurable: true,
        get(this: Document | ShadowRoot) {
          return own.get!.call(this);
        },
        set(this: Document | ShadowRoot, list: CSSStyleSheet[]) {
          const before: CSSStyleSheet[] = own.get!.call(this);
          const same = before.length === list.length && before.every((sheet, index) => sheet === list[index]);
          seen.writes.push({
            root: (root as (self: unknown) => string)(this),
            added: list.filter((sheet) => !before.includes(sheet)).map(kind),
            idle: same || new Set(list).size !== list.length,
          });
          own.set!.call(this, list);
        },
      });
    }
    const register = CSS.registerProperty.bind(CSS);
    CSS.registerProperty = (definition) => {
      seen.registered.push(definition.name);
      register(definition);
    };
  }, marks);
}

const seen = (page: Page) => page.evaluate(() => (window as unknown as { __sheets: Seen }).__sheets);

/** The tokens as the generator writes them: what `dist/tokens.css` is, to the byte (it registers no custom property). */
const BARE_TOKENS = 'src/generated/tokens.css';

/** A page of `body`, with the tokens, `css` as the page's own stylesheets and the bundle that defines every element. */
const document = (body: string, css: string[] = [], module = read('dist/tanrei.bundle.js'), tokens = 'dist/tokens.css') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read(tokens)}</style>${css.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}</head><body>${body}<script type="module">${module}</script></body></html>`;

/** Loads `html` as a page of its own, so that the counting starts before any of its scripts (an init script runs at a navigation). */
async function open(page: Page, html: string) {
  await page.unroute(PAGE);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
}

async function settle(page: Page, tag: string) {
  await page.evaluate((name) => customElements.whenDefined(name), tag);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

const instances = (subject: Subject) => Array.from({ length: N }, (_, n) => subject.html(n)).join('\n');
/** Each instance as it is drawn: the sheet's mark on it, and the property the sheet decides. */
const drawings = (page: Page, subject: Subject) =>
  page.evaluate(
    ({ tag, mark, part, property }) =>
      [...document.querySelectorAll(tag)].map((host) => ({
        mark: getComputedStyle(host).getPropertyValue(mark).trim(),
        value: getComputedStyle(part ? host.querySelector(part)! : host).getPropertyValue(property),
      })),
    { tag: subject.tag, mark: subject.mark, part: subject.drawn.part, property: subject.drawn.property },
  );

test.describe('the sheets an element adds to its root', () => {
  for (const subject of SUBJECTS) {
    test(`${subject.tag}: a page that loaded ${subject.css} is handed the sheet by no instance, and a page that did not is handed it once for ${N}`, async ({ page }) => {
      const marks = SUBJECTS.map((s) => s.mark);

      // The page loaded the stylesheet: the cascade already answers, and the document's list is not written for it.
      await watch(page, marks);
      await open(page, document(instances(subject), [subject.css]));
      await settle(page, subject.tag);
      let { writes } = await seen(page);
      expect(writes.filter((write) => write.root === 'document' && write.added.includes(subject.mark)), 'the document already has these rules').toEqual([]);
      expect(writes.filter((write) => write.idle), 'no write hands a root what it has').toEqual([]);
      const loaded = await drawings(page, subject);
      expect(loaded).toHaveLength(N);
      for (const drawing of loaded) expect(drawing.mark, `${subject.mark} on a drawn instance`).not.toBe('');

      // The page did not: the first instance adds it, the others find it there.
      await open(page, document(instances(subject)));
      await settle(page, subject.tag);
      ({ writes } = await seen(page));
      expect(writes.filter((write) => write.root === 'document' && write.added.includes(subject.mark)), 'one write for every instance').toHaveLength(1);
      expect(writes.filter((write) => write.idle), 'no write hands a root what it has').toEqual([]);
      // Drawn the same by the element's sheet as by the page's.
      expect(await drawings(page, subject)).toEqual(loaded);
    });
  }

  for (const subject of SUBJECTS) {
    test(`${subject.tag}: one connected inside another of its kind, in a later turn, adds no sheet to a page that loaded ${subject.css}, nor a second one to a page that did not`, async ({ page }) => {
      const marks = SUBJECTS.map((s) => s.mark);
      /** Writes another instance inside the first one, two frames after the page came to rest: a turn of its own. */
      const nest = () =>
        page.evaluate(
          async ({ tag, inside, html }) => {
            await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const outer = document.querySelector(tag)!;
            (inside ? outer.querySelector(inside)! : outer).insertAdjacentHTML('beforeend', html);
          },
          { tag: subject.tag, inside: subject.inside, html: subject.html(1) },
        );
      const inner = () =>
        page.evaluate(
          ({ tag, mark }) =>
            [...document.querySelectorAll(`${tag} ${tag}`)].map((host) =>
              // An element its parent's shadow root gives no slot (the breadcrumbs assign their links) is not drawn at all.
              host.parentElement?.shadowRoot && !host.assignedSlot ? null : getComputedStyle(host).getPropertyValue(mark).trim(),
            ),
          { tag: subject.tag, mark: subject.mark },
        );

      await watch(page, marks);
      await open(page, document(subject.html(0), [subject.css]));
      await settle(page, subject.tag);
      await nest();
      await settle(page, subject.tag);
      let { writes } = await seen(page);
      expect(writes.filter((write) => write.root === 'document' && write.added.includes(subject.mark)), 'the document already has these rules').toEqual([]);
      expect(writes.filter((write) => write.idle), 'no write hands a root what it has').toEqual([]);
      const loaded = await inner();
      expect(loaded).toHaveLength(1);
      if (loaded[0] !== null) expect(loaded[0], `${subject.mark} on the inner one`).not.toBe('');

      await open(page, document(subject.html(0)));
      await settle(page, subject.tag);
      await nest();
      await settle(page, subject.tag);
      ({ writes } = await seen(page));
      expect(writes.filter((write) => write.root === 'document' && write.added.includes(subject.mark)), 'one write, for the outer one').toHaveLength(1);
      expect(writes.filter((write) => write.idle), 'no write hands a root what it has').toEqual([]);
      expect(await inner()).toEqual(loaded);
    });
  }

  test('a page that loaded every stylesheet: defining every element adds none of them to the document, and each shadow root is written once', async ({ page }) => {
    await watch(
      page,
      SUBJECTS.map((s) => s.mark),
    );
    const body = `${SUBJECTS.map(instances).join('\n')}${Array.from({ length: N * 4 }, (_, n) => `<tanrei-button label="Button ${n}"></tanrei-button>`).join('')}`;
    await open(page, 
      document(
        body,
        SUBJECTS.map((s) => s.css),
      ),
    );
    await settle(page, 'tanrei-button');
    const { writes } = await seen(page);
    const toDocument = writes.filter((write) => write.root === 'document');
    expect(toDocument.flatMap((write) => write.added).filter((added) => added !== 'other'), 'the sheets the page loaded').toEqual([]);
    // What is left is what an element writes at run time and no stylesheet can hold (a table's columns, a list's
    // measured width): a sheet per kind of rule, not per instance. Counted: 2.
    expect(toDocument.length, 'writes to the document for the whole page').toBeLessThanOrEqual(4);
    expect(writes.filter((write) => write.idle), 'no write hands a root what it has').toEqual([]);
    // A shadow root is given its sheets when it is made, in one write (the sheets themselves are shared).
    const buttons = writes.filter((write) => write.root === 'tanrei-button');
    expect(buttons).toHaveLength(N * 4);
  });

  test('a page that loaded the stylesheets of the elements that once registered properties: nothing is registered, though every module is evaluated', async ({ page }) => {
    // The bundle evaluates every module — the switch's and the calendar's too, which have no stylesheet to register
    // their properties and no instance on this page. Nothing registers at evaluation, and the four elements here,
    // whose stylesheets once registered names, register none.
    const tags = ['tanrei-accordion', 'tanrei-table-of-contents', 'tanrei-breadcrumbs', 'tanrei-tree-view'];
    const subjects = SUBJECTS.filter((s) => tags.includes(s.tag));
    expect(subjects).toHaveLength(tags.length);
    await watch(
      page,
      SUBJECTS.map((s) => s.mark),
    );
    // The tokens of this page register nothing, so that it is the elements' own stylesheets that would answer.
    await open(page, 
      document(
        subjects.map(instances).join('\n'),
        subjects.map((s) => s.css),
        undefined,
        BARE_TOKENS,
      ),
    );
    for (const subject of subjects) await settle(page, subject.tag);
    const { writes, registered } = await seen(page);
    expect(registered, 'nothing is registered from script').toEqual([]);
    expect(writes.filter((write) => write.root === 'document').flatMap((write) => write.added).filter((added) => added !== 'other')).toEqual([]);
    // And none by a stylesheet: a registered name has its initial value where nothing sets it, and these have none.
    // (The accordion's clock, the tree view's lengths and the press of a table of contents' row are properties no one registers.)
    expect(await page.evaluate(() => ['--_acc-open', '--_trv-step', '--_trv-target', '--_toc-pressed'].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()))).toEqual(['', '', '', '']);
  });

  test('a page that loaded the package\'s tokens has no registered property and registers none from script: a switch, a calendar, an accordion and a tree view need none', async ({ page }) => {
    const answers = () => page.evaluate(() => ['--_tanrei-switch-progress', '--_tanrei-calendar-progress', '--_acc-open', '--_trv-step'].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()));
    await watch(page, []);
    await open(page, document('<tanrei-button label="Button"></tanrei-button>'));
    await settle(page, 'tanrei-button');
    // Nothing is registered: a registered name has its initial value where nothing sets it, and these have none.
    expect(await answers()).toEqual(['', '', '', '']);
    await page.evaluate(() => document.body.append(document.createElement('tanrei-switch'), document.createElement('tanrei-switch'), document.createElement('tanrei-calendar')));
    await settle(page, 'tanrei-switch');
    await settle(page, 'tanrei-calendar');
    expect((await seen(page)).registered).toEqual([]);
    expect(await answers()).toEqual(['', '', '', '']);
    // An accordion is drawn by a stylesheet that registers nothing: still none.
    await page.evaluate((accordion) => document.body.insertAdjacentHTML('beforeend', accordion), SUBJECTS.find((s) => s.tag === 'tanrei-accordion')!.html(0));
    await settle(page, 'tanrei-accordion');
    expect((await seen(page)).registered).toEqual([]);
    expect(await answers()).toEqual(['', '', '', '']);
    // A tree view hands the document its stylesheet, which registers nothing either (it registered five names).
    await page.evaluate((tree) => document.body.insertAdjacentHTML('beforeend', tree), SUBJECTS.find((s) => s.tag === 'tanrei-tree-view')!.html(0));
    await settle(page, 'tanrei-tree-view');
    expect((await seen(page)).registered).toEqual([]);
    expect(await answers()).toEqual(['', '', '', '']);
  });

  test('a page that loaded none of the stylesheets: the elements hand the document their sheets, and nothing is registered — by a rule of a sheet or from script', async ({ page }) => {
    await watch(page, []);
    await open(page, document(instances(SUBJECTS.find((s) => s.tag === 'tanrei-tree-view')!), [], undefined, BARE_TOKENS));
    await settle(page, 'tanrei-tree-view');
    expect((await seen(page)).registered).toEqual([]);
    expect(await page.evaluate(() => ['--_trv-step', '--_trv-target'].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()))).toEqual(['', '']);
    // The sheet did arrive: the tree draws from it.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('tanrei-tree-view')!).getPropertyValue('--_trv-gap').trim())).not.toBe('');
  });

  test('a shadow root of the product inside an element of the same kind gets the sheet, though it inherits the element\'s names', async ({ page }) => {
    const table = SUBJECTS.find((s) => s.tag === 'tanrei-table')!;
    await watch(page, [table.mark]);
    // The outer table is the page's (its stylesheet is loaded); a cell of it holds the product's own element, whose
    // shadow root holds another table. The page's rules do not reach in, and the outer table's private names do.
    await open(page, 
      document(
        `<tanrei-table><table><tbody><tr><td><div id="product"></div></td></tr></tbody></table></tanrei-table>
        <script>
          const root = document.getElementById('product').attachShadow({ mode: 'open' });
          root.innerHTML = ${JSON.stringify(table.html(0))};
        </script>`,
        [table.css],
      ),
    );
    await settle(page, table.tag);
    const { writes } = await seen(page);
    expect(writes.filter((write) => write.root === 'document' && write.added.includes(table.mark))).toEqual([]);
    expect(writes.filter((write) => write.root === 'div' && write.added.includes(table.mark)), 'the product\'s root').toHaveLength(1);
    const padding = await page.evaluate(() => {
      const outer = document.querySelector('tanrei-table td')!;
      const inner = document.getElementById('product')!.shadowRoot!.querySelector('td')!;
      return [getComputedStyle(outer).paddingTop, getComputedStyle(inner).paddingTop];
    });
    expect(padding[1]).toBe(padding[0]);
  });

  test('the question whether style queries are answered writes nothing into the document\'s sheets', async ({ page }) => {
    await watch(page, []);
    // A menu asks when it is drawn (MNU-35); so do the others that read a choice of kind.
    await open(page, document('<tanrei-menu open><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-menu><tanrei-button label="Button"></tanrei-button>'));
    await settle(page, 'tanrei-menu');
    const { writes } = await seen(page);
    expect(writes.filter((write) => write.root === 'document')).toEqual([]);
    expect(await page.evaluate(() => document.adoptedStyleSheets.length)).toBe(0);
    expect(await page.evaluate(() => document.querySelector('[data-tanrei-style-query-probe]'))).toBeNull();
  });
});

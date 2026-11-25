// The reader's appearance (src/lib/appearance.ts): one type, one key of storage, one set of attributes on `<html>`, and
// the head's script made of the same functions. The script is run here against a document and a storage of plain
// objects; what it does in each engine is asked by test/browser/appearance.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const appearance = await import('../src/lib/appearance.ts');
const { manifests } = await import('../src/lib/repo.ts');
const { APPEARANCE_EVENT, APPEARANCE_KEY, CONTRAST_ATTR, CUSTOM_ATTR, CUSTOM_KEY, CUSTOM_LOOK, EARLY_WORKER, LATE_ATTR, LOOK_ATTR, LOOK_SHEET_ID, MISSING_ATTR, MODE_ATTR, PENDING_ATTR, REVEAL_AFTER, SHARED_ATTR, SHEET_HELD_KEY, TANREI_THEME_ATTR, THEME_ATTR, appearanceBootstrap, attributesOf, bootConfig, customOf, linkTo, normalize, sharedFrom, sheetKey, standaloneBootstrap, withoutShared } = appearance;
/** The key of a build, as lib/sheet-key.mjs gives one. */
const BUILD = '0123456789abcdef';

const read = (file) => fs.readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
const looks = manifests.map((manifest) => manifest.system);
const DEFAULT = JSON.parse(read('../../tanrei.config.json')).namespace;
const SHOWCASE = looks.find((id) => id !== DEFAULT);
/** The address of each gallery example's stylesheet, as the build names them (lib/look-sheets.mjs). */
const SHEETS = Object.fromEntries(looks.filter((id) => id !== DEFAULT).map((id) => [id, `/_astro/look-${id}.0a1b2c3d.css`]));

/**
 * The head's script, run with a storage that holds `stored` (or throws), an address, and the device's scheme: the
 * attributes it leaves on the root, and what it puts in the head (`head`; the look's sheet, `sheet`). `after` is what
 * the parser has put after the script in the head so far (`{ localName, type, src }`); the head's observers are kept in
 * `observers`, the workers it starts in `workers` (`{ url, options }`), and what it leaves on `window` in `scope`.
 * `held` is the key storage says IndexedDB was last given (by default, the key of the sheet `sheets` holds); `reads`
 * counts the times IndexedDB is asked. With `blocking`, the engine blocks rendering on a stylesheet a script asks it to
 * (`blocking="render"`, as Chromium does); without, it does not (Firefox, WebKit). An element's `fire(type)` sends it an
 * event (a link's `load`). The events it sends on the document are in `events` (`{ type, detail }`).
 */
function boot({ stored = null, custom = null, sheets = null, held = (sheets && Object.keys(sheets)[0]) || null, search = '', dark = false, after = null, blocking = false, script = appearanceBootstrap(bootConfig(looks, BUILD, null, SHEETS)) } = {}) {
  const attributes = {};
  const head = [];
  const timers = [];
  const element = (localName) => {
    const own = {};
    const listeners = {};
    const made = {
      localName,
      setAttribute: (name, value) => (own[name] = String(value)),
      getAttribute: (name) => own[name] ?? (name === 'href' ? made.href ?? null : null),
      attributes: own,
      addEventListener: (type, listener) => (listeners[type] ??= []).push(listener),
      fire: (type) => (listeners[type] ?? []).forEach((listener) => listener()),
      remove: () => head.includes(made) && head.splice(head.indexOf(made), 1),
      get isConnected() {
        return head.includes(made);
      },
    };
    if (blocking && localName === 'link') {
      const tokens = [];
      made.blocking = { supports: (token) => token === 'render', add: (token) => tokens.push(token), tokens };
    }
    Object.defineProperty(made, 'nextElementSibling', { get: () => siblings()[siblings().indexOf(made) + 1] ?? null });
    return made;
  };
  // The script itself, in the head: its next siblings are what the parser has put after it, then what it appended.
  const parsed = after ?? [];
  const siblings = () => [...parsed, ...head];
  const me = after && { get parentNode() { return document.head; }, get nextElementSibling() { return siblings()[0] ?? null; } };
  for (const node of parsed) Object.defineProperty(node, 'nextElementSibling', { configurable: true, get: () => siblings()[siblings().indexOf(node) + 1] ?? null });
  const observers = [];
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target, options) {
      observers.push({ observer: this, target, options });
    }
    disconnect() {
      observers.splice(observers.findIndex((entry) => entry.observer === this), 1);
    }
  }
  const events = [];
  class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }
  const document = {
    currentScript: me,
    dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail }),
    documentElement: { setAttribute: (name, value) => (attributes[name] = String(value)), removeAttribute: (name) => delete attributes[name], getAttribute: (name) => attributes[name] ?? null, hasAttribute: (name) => name in attributes },
    createElement: element,
    getElementById: (id) => head.find((node) => node.id === id) ?? null,
    head: { appendChild: (node) => head.push(node) },
  };
  const localStorage = { getItem: (key) => (stored instanceof Error ? (() => { throw stored; })() : key === APPEARANCE_KEY ? stored : key === CUSTOM_KEY ? custom : key === SHEET_HELD_KEY ? held : null) };
  const reads = { count: 0 };
  const matchMedia = (query) => ({ matches: query.includes('dark') && dark });
  // IndexedDB as the head's script uses it: one database, one store, a get by key, each answered at once. None where `sheets` is null.
  const indexedDB = sheets && {
    open: () => {
      reads.count += 1;
      const request = { result: { createObjectStore() {}, close() {}, transaction: () => ({ objectStore: () => ({ get: (key) => {
        const got = { result: sheets[key] };
        queueMicrotask(() => got.onsuccess());
        return got;
      } }) }) } };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  };
  const setTimeout = (run, ms) => timers.push({ run, ms });
  const workers = [];
  class Worker {
    constructor(url, options) {
      workers.push({ url, options });
    }
  }
  const scope = {};
  // A frame is a turn of the microtasks here: what waits for two of them has waited when a test has waited for a task.
  const requestAnimationFrame = (run) => queueMicrotask(run);
  new Function('document', 'localStorage', 'location', 'matchMedia', 'URLSearchParams', 'indexedDB', 'setTimeout', 'requestAnimationFrame', 'MutationObserver', 'Worker', 'window', 'CustomEvent', script)(document, localStorage, { search }, matchMedia, URLSearchParams, indexedDB ?? undefined, setTimeout, requestAnimationFrame, MutationObserver, Worker, scope, CustomEvent);
  return { attributes, events, get sheet() { return head.find((node) => node.id === LOOK_SHEET_ID); }, head, timers, parsed, observers, workers, scope, reads };
}

describe('the appearance', () => {
  test('one shape: anything stored or asked for that is not an allowed value is the default’s', () => {
    assert.deepEqual(normalize(null, looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
    assert.deepEqual(normalize({ mode: 'dark', contrast: 'high', look: SHOWCASE }, looks, DEFAULT), { mode: 'dark', contrast: 'high', look: SHOWCASE });
    assert.deepEqual(normalize({ mode: 'dim', contrast: 'max', look: 'not-a-system' }, looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
    assert.deepEqual(normalize('"]{}*{display:none}', looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
  });

  test('the attributes of the root: the scheme drawn twice, the mode chosen, the contrast only when it is not standard, the look', () => {
    const names = bootConfig(looks).names;
    assert.deepEqual(attributesOf({ mode: 'system', contrast: 'standard', look: DEFAULT }, true, names), { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'system', [CONTRAST_ATTR]: null, [LOOK_ATTR]: DEFAULT });
    assert.deepEqual(attributesOf({ mode: 'light', contrast: 'medium', look: SHOWCASE }, true, names), { [THEME_ATTR]: 'light', [TANREI_THEME_ATTR]: 'light', [MODE_ATTR]: 'light', [CONTRAST_ATTR]: 'medium', [LOOK_ATTR]: SHOWCASE });
    assert.equal(LOOK_ATTR, 'data-docs-look');
  });

  test('the address shares an appearance: ?look=&mode=&contrast=, and leaves the rest of the address alone', () => {
    assert.equal(sharedFrom('?q=1'), null);
    assert.deepEqual(sharedFrom(`?look=${SHOWCASE}&mode=dark`), { look: SHOWCASE, mode: 'dark' });
    const link = linkTo('https://example.com/components/button/?tab=specs#anatomy', { mode: 'dark', contrast: 'high', look: SHOWCASE });
    assert.equal(link, `https://example.com/components/button/?tab=specs&look=${SHOWCASE}&mode=dark&contrast=high#anatomy`);
    assert.equal(withoutShared(link), 'https://example.com/components/button/?tab=specs#anatomy');
  });

  test('the head’s script: the default on a first visit, a blocked storage, an older key or a broken value; the stored one otherwise', () => {
    for (const stored of [null, new Error('blocked'), '{', 'dark']) {
      const { attributes } = boot({ stored });
      assert.equal(attributes[LOOK_ATTR], DEFAULT, String(stored));
      assert.equal(attributes[MODE_ATTR], 'system');
      assert.equal(attributes[THEME_ATTR], 'light', 'the device’s scheme');
      assert.equal(attributes[CONTRAST_ATTR], undefined);
    }
    assert.equal(boot({ dark: true }).attributes[THEME_ATTR], 'dark');
    const { attributes, head } = boot({ stored: JSON.stringify({ mode: 'dark', contrast: 'high', look: SHOWCASE }), blocking: true });
    assert.deepEqual(attributes, { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'dark', [CONTRAST_ATTR]: 'high', [LOOK_ATTR]: SHOWCASE });
    assert.deepEqual(head.map((node) => node.localName), ['link'], 'the look’s sheet, and nothing else');
    assert.deepEqual(boot().head, [], 'the default system: no sheet of its own');
  });

  test('the head’s script under a gallery example: its sheet linked on the root, the first paint held for it, at most REVEAL_AFTER', () => {
    const stored = JSON.stringify({ look: SHOWCASE });
    // An engine that blocks rendering on it: the first paint waits for the sheet, and nothing is hidden.
    const blocked = boot({ stored, blocking: true });
    assert.equal(blocked.sheet.localName, 'link');
    assert.deepEqual([blocked.sheet.rel, blocked.sheet.href, blocked.sheet.blocking.tokens], ['stylesheet', SHEETS[SHOWCASE], ['render']]);
    assert.equal(blocked.sheet.getAttribute('data-docs-look-sheet'), '', 'marked as a look’s sheet');
    assert.equal(blocked.attributes[PENDING_ATTR], undefined);
    assert.deepEqual(blocked.timers, []);
    blocked.sheet.fire('load');
    assert.equal(blocked.attributes[LOOK_ATTR], SHOWCASE);
    // An engine that does not: the page hidden until the sheet has loaded.
    const hidden = boot({ stored });
    assert.equal(hidden.sheet.href, SHEETS[SHOWCASE]);
    assert.equal(hidden.attributes[PENDING_ATTR], '');
    assert.deepEqual(hidden.timers.map((timer) => timer.ms), [REVEAL_AFTER]);
    hidden.sheet.fire('load');
    assert.equal(hidden.attributes[PENDING_ATTR], undefined, 'shown once it is in');
    hidden.timers[0].run();
    assert.deepEqual([hidden.attributes[LOOK_ATTR], hidden.attributes[LATE_ATTR], hidden.sheet?.href], [SHOWCASE, undefined, SHEETS[SHOWCASE]], 'the time limit changes nothing once the sheet is in');
    assert.deepEqual(hidden.events, [], 'and nothing is announced');
    // Not in after REVEAL_AFTER: the page is shown in the default system, and the sheet fetched for the next page.
    const slow = boot({ stored });
    const link = slow.sheet;
    slow.timers[0].run();
    assert.equal(slow.attributes[PENDING_ATTR], undefined);
    assert.deepEqual([slow.attributes[LOOK_ATTR], slow.attributes[LATE_ATTR]], [DEFAULT, SHOWCASE], 'drawn in the default system, and marked with the look that came too late');
    assert.deepEqual(slow.events, [{ type: APPEARANCE_EVENT, detail: { appearance: { mode: 'system', contrast: 'standard', look: DEFAULT }, shared: false } }], 'and announced as any change of look is: the header says what is drawn');
    assert.equal(slow.sheet, undefined, 'no look’s sheet on this page');
    assert.deepEqual(slow.head.map((node) => [node.rel, node.href]), [['prefetch', SHEETS[SHOWCASE]]]);
    link.fire('load');
    assert.equal(slow.attributes[LOOK_ATTR], DEFAULT, 'a sheet that arrives later is not put in: it would move everything drawn');
    // A sheet that cannot be had: the default system at once.
    const failed = boot({ stored, blocking: true });
    failed.sheet.fire('error');
    assert.deepEqual([failed.attributes[LOOK_ATTR], failed.attributes[LATE_ATTR], failed.sheet], [DEFAULT, SHOWCASE, undefined]);
    assert.deepEqual(failed.events.map((event) => [event.type, event.detail.appearance.look]), [[APPEARANCE_EVENT, DEFAULT]]);
    // A look the build names no sheet for (the dev server's before it serves one) is drawn without one.
    assert.deepEqual(boot({ stored, script: appearanceBootstrap(bootConfig(looks, BUILD)) }).head, []);
  });

  test('the head’s script shows what the address shares over what is stored, and marks it shared', () => {
    const stored = JSON.stringify({ mode: 'light', contrast: 'medium', look: DEFAULT });
    const { attributes, sheet } = boot({ stored, search: `?look=${SHOWCASE}&mode=dark`, blocking: true });
    assert.equal(sheet.href, SHEETS[SHOWCASE], 'drawn in the look it shares');
    assert.deepEqual(attributes, { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'dark', [CONTRAST_ATTR]: 'medium', [LOOK_ATTR]: SHOWCASE, [SHARED_ATTR]: '' });
    assert.equal(boot({ search: '?look=not-a-system' }).attributes[LOOK_ATTR], DEFAULT, 'an unknown look is the default');
    assert.equal(boot({ stored }).attributes[SHARED_ATTR], undefined);
  });

  test('the reader’s own theme is a look only while this browser keeps one; what is kept of it is read whole or not at all', () => {
    assert.equal(normalize({ look: CUSTOM_LOOK }, looks, DEFAULT).look, DEFAULT, 'no theme kept: the default look');
    assert.equal(normalize({ look: CUSTOM_LOOK }, looks, DEFAULT, true).look, CUSTOM_LOOK);
    assert.ok(!looks.includes(CUSTOM_LOOK), 'no shipped system has the look’s name');
    assert.deepEqual(customOf({ hash: 'k3x9', layer: { id: 'acme', extends: SHOWCASE } }), { hash: 'k3x9' });
    for (const broken of [null, 'x', { hash: 'k3x9' }, { layer: {} }, { hash: '"]{}', layer: {} }, { hash: 'K', layer: {} }]) assert.equal(customOf(broken), null, JSON.stringify(broken));
    assert.equal(sheetKey(BUILD, 'k3x9'), `${BUILD}:k3x9`);
  });

  test('the head’s script under the reader’s theme: the look, the marks, and the page hidden until the sheet is in', async () => {
    const custom = JSON.stringify({ hash: 'k3x9', layer: { id: 'acme', extends: SHOWCASE } });
    const stored = JSON.stringify({ mode: 'dark', contrast: 'standard', look: CUSTOM_LOOK });
    // No sheet yet (IndexedDB holds none): hidden, and shown after REVEAL_AFTER whatever happens — in the default system,
    // which that page keeps: a sheet put in later would move everything drawn.
    const waiting = boot({ stored, custom, sheets: {} });
    assert.equal(waiting.attributes[LOOK_ATTR], CUSTOM_LOOK);
    assert.equal(waiting.attributes[CUSTOM_ATTR], '');
    assert.equal(waiting.attributes[PENDING_ATTR], '');
    assert.equal(waiting.head.filter((node) => node.localName === 'link').length, 0, 'no gallery example’s sheet, whatever the theme extends');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(waiting.attributes[PENDING_ATTR], '', 'still hidden: the modules compute the sheet');
    assert.equal(waiting.attributes[MISSING_ATTR], sheetKey(BUILD, 'k3x9'), 'and told that IndexedDB holds none, under the key it is computed under');
    assert.deepEqual(waiting.timers.map((timer) => timer.ms), [REVEAL_AFTER]);
    waiting.timers[0].run();
    assert.equal(waiting.attributes[PENDING_ATTR], undefined);
    assert.equal(waiting.attributes[LOOK_ATTR], DEFAULT, 'drawn in the default system');
    assert.equal(waiting.attributes[LATE_ATTR], CUSTOM_LOOK, 'and marked: the modules keep the sheet for the next page');
    assert.deepEqual(waiting.events, [{ type: APPEARANCE_EVENT, detail: { appearance: { mode: 'dark', contrast: 'standard', look: DEFAULT }, shared: false } }], 'and announced: the header says the default system, not the reader’s theme');

    // The sheet in IndexedDB, under this build's key and the theme's hash: put in place, and the page shown.
    const css = '@layer tanrei.tokens { :root { --tanrei-sys-color-primary: #0b6e4f; } }';
    const found = boot({ stored, custom, sheets: { [sheetKey(BUILD, 'k3x9')]: css } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const style = found.sheet;
    assert.equal(style?.localName, 'style');
    assert.equal(style?.textContent, css);
    assert.equal(style.getAttribute('data-key'), sheetKey(BUILD, 'k3x9'));
    assert.equal(found.attributes[PENDING_ATTR], undefined);
    assert.equal(found.attributes[MISSING_ATTR], undefined);
    found.timers[0].run();
    assert.deepEqual([found.attributes[LOOK_ATTR], found.attributes[LATE_ATTR]], [CUSTOM_LOOK, undefined], 'the time limit changes nothing once the sheet is in');
    assert.deepEqual(found.events, [], 'and nothing is announced');
    // Another build's sheet is not used.
    const other = boot({ stored, custom, sheets: { [sheetKey('fedcba9876543210', 'k3x9')]: css } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(other.sheet, undefined);
    assert.equal(other.attributes[PENDING_ATTR], '');
    // IndexedDB that fails, or is not there: hidden until the modules say, at most REVEAL_AFTER.
    const none = boot({ stored, custom });
    assert.equal(none.attributes[PENDING_ATTR], '');
    assert.deepEqual(none.timers.map((timer) => timer.ms), [REVEAL_AFTER]);
  });

  test('the head’s script under the reader’s theme with no sheet kept: the module after it run at once, as a script of its own, once the parser has put it there', async () => {
    const custom = JSON.stringify({ hash: 'k3x9', layer: { id: 'acme', extends: SHOWCASE } });
    const stored = JSON.stringify({ look: CUSTOM_LOOK });
    const module = { localName: 'script', type: 'module', src: '/_astro/ThemeProvider.js' };
    const started = (run) => run.head.filter((node) => node.localName === 'script').map((node) => [node.type, node.src]);
    // Parsed already (after the rule the script appended): asked for at once.
    const ready = boot({ stored, custom, sheets: {}, after: [module] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(started(ready), [['module', module.src]]);
    assert.deepEqual(ready.observers, []);
    // Not parsed yet: asked for once the parser puts it in the head.
    const later = boot({ stored, custom, sheets: {}, after: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(started(later), []);
    assert.equal(later.observers.length, 1);
    later.parsed.push(module);
    later.observers[0].observer.callback();
    assert.deepEqual(started(later), [['module', module.src]]);
    assert.deepEqual(later.observers, [], 'and the head no longer watched');
    // A sheet kept: nothing asked for (the module runs in its turn), and no mark.
    const kept = boot({ stored, custom, sheets: { [sheetKey(BUILD, 'k3x9')]: 'x' }, after: [module] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(started(kept), []);
    assert.equal(kept.attributes[MISSING_ATTR], undefined);
  });

  test('the head’s script under the reader’s theme with no sheet kept: the worker that computes it started at once, where the build names its script, and left for the module', async () => {
    const custom = JSON.stringify({ hash: 'k3x9', layer: { id: 'acme', extends: SHOWCASE } });
    const stored = JSON.stringify({ look: CUSTOM_LOOK });
    const key = sheetKey(BUILD, 'k3x9');
    const WORKER = '/_astro/sheet-worker-0a1b2c3d.js';
    const script = appearanceBootstrap(bootConfig(looks, BUILD, WORKER));
    const started = [{ url: WORKER, options: { type: 'module' } }];
    // Storage names another sheet as the one IndexedDB keeps (or none): IndexedDB is not asked, and the sheet is
    // computed at once — the root marked, the worker started, before the script ends.
    for (const held of [null, sheetKey(BUILD, 'other1'), sheetKey('fedcba9876543210', 'k3x9')]) {
      const missing = boot({ stored, custom, sheets: {}, held, script });
      assert.deepEqual([missing.attributes[MISSING_ATTR], missing.workers, missing.reads.count], [key, started, 0], `held: ${held}`);
      assert.ok(missing.scope[EARLY_WORKER], 'where the module takes it');
    }
    // Storage names this sheet, and IndexedDB does not hold it after all (its write failed, or is not done yet): computed
    // once IndexedDB has answered.
    const lost = boot({ stored, custom, sheets: {}, held: key, script });
    assert.deepEqual([lost.attributes[MISSING_ATTR], lost.workers, lost.reads.count], [undefined, [], 1]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual([lost.attributes[MISSING_ATTR], lost.workers], [key, started]);
    // A sheet kept, another look, or no address (`astro dev`): no worker.
    for (const [why, run] of [
      ['a sheet kept', boot({ stored, custom, sheets: { [key]: 'x' }, script })],
      ['another look', boot({ stored: JSON.stringify({ look: SHOWCASE }), custom, sheets: {}, script })],
      ['no address', boot({ stored, custom, sheets: {} })],
    ]) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.deepEqual([run.workers, run.scope[EARLY_WORKER]], [[], undefined], why);
    }
  });

  test('the head’s script with a theme kept and another look: nothing hidden for the theme, the mark that one is kept; with none kept, the look `custom` is the default', () => {
    const custom = JSON.stringify({ hash: 'k3x9', layer: { id: 'acme', extends: DEFAULT } });
    const other = boot({ stored: JSON.stringify({ look: SHOWCASE }), custom, sheets: {}, blocking: true });
    assert.equal(other.attributes[LOOK_ATTR], SHOWCASE);
    assert.equal(other.attributes[CUSTOM_ATTR], '');
    assert.equal(other.attributes[PENDING_ATTR], undefined);
    assert.equal(other.sheet.href, SHEETS[SHOWCASE], 'the look’s own sheet');
    assert.deepEqual(other.timers, []);
    const gone = boot({ stored: JSON.stringify({ look: CUSTOM_LOOK }), sheets: {} });
    assert.equal(gone.attributes[LOOK_ATTR], DEFAULT);
    assert.equal(gone.attributes[CUSTOM_ATTR], undefined);
    assert.equal(gone.attributes[PENDING_ATTR], undefined);
    // A shared link cannot name the reader's theme for someone who keeps none.
    assert.equal(boot({ search: `?look=${CUSTOM_LOOK}` }).attributes[LOOK_ATTR], DEFAULT);
  });

  test('a document outside the frame reads the same key: the scheme the reader forced, and the contrast', () => {
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: JSON.stringify({ mode: 'dark', contrast: 'high', look: SHOWCASE }) }).attributes, { [TANREI_THEME_ATTR]: 'dark', [CONTRAST_ATTR]: 'high' });
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: JSON.stringify({ mode: 'system' }) }).attributes, {}, 'the device’s mode: the tokens follow the device');
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: new Error('blocked') }).attributes, {});
  });

  test('is the head’s one script of the appearance, in place of the framework’s, and the only reader of its key', () => {
    assert.match(read('astro.config.mjs'), /ThemeProvider: '\.\/src\/components\/frame\/ThemeProvider\.astro'/);
    assert.doesNotMatch(read('astro.config.mjs'), /localStorage/);
    assert.match(read('src/components/StudioPage.astro'), /<script is:inline set:html=\{standaloneBootstrap\} \/>/);
    // No other key of an appearance is read anywhere in the site.
    const sources = fs.readdirSync(fileURLToPath(new URL('../src/', import.meta.url)), { recursive: true }).filter((file) => /\.(astro|ts|mjs)$/.test(file));
    for (const file of sources) assert.doesNotMatch(read(`src/${file}`), /starlight-theme|tanrei-docs-contrast|tanrei-docs-tabs-system/, file);
  });
});

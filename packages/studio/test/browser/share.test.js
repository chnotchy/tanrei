// Share: the bar's menu of what the Studio can share of the layer, in a host that is a documentation (host/): the link
// to the Studio that holds the layer, and the switch that shows the documentation in it — off until it is turned on,
// on given the layer this browser keeps (and shown), given it again once edits rest without changing the reader's look,
// off taking it away. The menu passes axe and keeps every target at 24 by 24. The page sheet the documentation draws
// the layer with comes from a worker, under the CLI's policy, and is the core's own (core.pageSheet).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studioTest, until } from './harness.js';
import { studio } from '../studio-node.js';

const hostDir = process.env.TANREI_STUDIO_HOST;
const hosted = { server: { appDir: hostDir }, ready: false };
const share = (page) => page.locator('[data-share]');
const open = async (page) => {
  await page.locator('[data-share-open]').click();
  await page.waitForFunction(() => document.querySelector('[data-share]')?.open === true);
};
const calls = (page) => page.evaluate(() => window.docsCalls);

if (!hostDir) test('the documentation host is built', () => assert.fail('run these through `pnpm test:browser` (test/browser/run.mjs builds test/browser/host/ and says where it is)'));

studioTest('the Share menu: the link, and the documentation shown in the layer — off until it is turned on', hosted, async ({ page, axe, targets }) => {
  await open(page);
  assert.equal(await share(page).locator('[data-share-copy-link]').count(), 1, 'the link: the layer is in the address');
  const toggle = share(page).locator('[data-share-docs]');
  assert.equal(await toggle.evaluate((element) => element.checked), false, 'off by default');
  assert.match(await share(page).textContent(), /In this browser only\. The documentation’s choice of design system gains “My theme”, and choosing Tanrei there goes back\./);
  await axe('[data-share]', 'the Share menu');
  await targets('the Share menu', '[data-share]');
  assert.deepEqual(await calls(page), [], 'nothing is given before the switch is turned on');

  await toggle.click();
  await until(async () => (await calls(page)).length === 1, 'the documentation is given the layer');
  const [on] = await calls(page);
  assert.deepEqual(on, { layer: { id: 'acme', extends: 'tanrei' }, show: true }, 'the layer this browser keeps, shown');
  assert.match(await page.locator('[data-status]').textContent(), /The documentation shows this theme now, in this browser\./);

  // An edit, once it rests: the documentation is given the layer again, and its look is left as the reader chose.
  await page.keyboard.press('Escape');
  await page.locator('[data-shuffle]').click();
  await until(async () => (await calls(page)).length === 2, 'the edited layer given again');
  const [, again] = await calls(page);
  assert.equal(again.show, false, 'the reader’s look is not changed');
  assert.notDeepEqual(again.layer, on.layer, 'the shuffled layer');

  await open(page);
  await toggle.click();
  await until(async () => (await calls(page)).length === 3, 'the documentation keeps no layer');
  assert.deepEqual((await calls(page))[2], { layer: null, show: false });
  assert.match(await page.locator('[data-status]').textContent(), /The documentation is back to Tanrei\./);
  // Off, an edit gives the documentation nothing.
  await page.keyboard.press('Escape');
  await page.locator('[data-shuffle]').click();
  await page.waitForTimeout(600); // longer than the menu's rest (src/ui/share.ts, 300 ms): a call would have come
  assert.equal((await calls(page)).length, 3);
});

studioTest('the page sheet from the worker is the core’s, for any layer; a layer that cannot be computed is refused', hosted, async ({ page, requests }) => {
  // On the default system; on a showcase system, whose layers the worker loads only now; borrowing a component from a
  // layer the chain does not hold (the worker has only that layer's index).
  const layers = [
    studio.setEssential(studio.setPalette({ id: 'acme', extends: 'tanrei' }, 'primary', { source: { seed: '#0b6e4f' } }), 'space.unit', 3),
    studio.setPalette({ id: 'acme', extends: 'm3-expressive-like' }, 'primary', { source: { seed: '#d00000' } }),
    { id: 'acme', extends: 'tanrei', components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } },
  ];
  for (const layer of layers) {
    const css = await page.evaluate((given) => window.pageSheetOf(given), layer);
    assert.equal(css, studio.pageSheet(studio.preview(layer)), `${layer.extends}: the same sheet, character for character`);
  }
  assert.ok(requests.some((url) => /sheet-worker[^/]*\.js$/.test(url)), 'computed in the worker');
  assert.ok(requests.some((url) => /m3-like\.system[^/]*\.js$/.test(url)), 'a showcase system’s layer loaded when a chain needs it');
  assert.ok(!requests.some((url) => /cupertino\.system[^/]*\.js$/.test(url)), 'and no layer no chain needs');
  const refused = await page.evaluate(() => window.pageSheetOf({ id: 'acme', extends: 'nothing-like-this' }).then(() => 'resolved', (error) => error.message));
  assert.match(refused, /nothing-like-this/);
});

// What a file upload of many rows costs (specs/file-upload.spec.json): a file upload that holds up to 1,000 of the
// product's rows re-reads them a bounded number of times — never once for each row that draws or changes — and a
// change of every row costs the same for each row at 1,000 as at 100.
//
// Counted, not timed (test/work-count.ts): how many times the file upload re-read its rows (`file-upload.sync`, a debug
// build's counter), and the function calls the page made from the change to two frames after, per row, at 100 and at
// 1,000 rows. The time is reported beside them, never held: a time is the machine's as much as the file upload's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

/** A file upload of `n` rows the product gives, each a file item that has finished. */
const upload = (n: number) =>
  `<tanrei-file-upload id="upload" rows="given" label="Attachments" name="files" remove-label="Remove" retry-label="Retry"><tanrei-button slot="trigger">Choose files</tanrei-button>${Array.from(
    { length: n },
    (_, i) => `<tanrei-file-item value="f${i}" name="file-${i}.pdf" status="done"></tanrei-file-item>`,
  ).join('')}</tanrei-file-upload>`;

test.describe('a file upload of many rows', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  test('FUP-17, FUP-25, FUP-39: built with 100 and with 1,000 rows, and every row renamed at once, the file upload reads its rows a bounded number of times — and a renaming costs the same calls per row at both sizes', async ({ page }) => {
    test.setTimeout(180_000);
    const cdp = await countingPage(page, ['tanrei-file-upload', 'tanrei-file-item', 'tanrei-list', 'tanrei-list-item']);
    /** The List's items and, for the last row, the List's item's name and the file item's role (FUP-25). */
    const drawn = () =>
      page.evaluate(() => {
        const host = document.querySelector('#upload')!;
        const items = [...host.shadowRoot!.querySelectorAll('tanrei-list-item')];
        return { items: items.length, label: items.at(-1)?.getAttribute('label') ?? '', role: [...host.querySelectorAll('tanrei-file-item')].at(-1)?.getAttribute('role') ?? '' };
      });
    const run = async (n: number) => {
      const built = await buildCost(page, cdp, upload(n), n, 'file upload');
      // Every row is drawn inside an item of the List, named by its file's name (FUP-17); the file item in it is the group it
      // is when it stands alone (FUP-25).
      expect(await drawn()).toEqual({ items: n, label: `file-${n - 1}.pdf`, role: 'group' });
      // Every row renamed in one task, as a product that renames the files it sent does.
      const renamed = await costOf(page, cdp, n, 'file upload, every row renamed', () =>
        page.evaluate(() => {
          for (const [i, row] of [...document.querySelectorAll<HTMLElement & { name: string }>('#upload tanrei-file-item')].entries()) row.name = `named-${i}.pdf`;
        }),
      );
      // FUP-39: drawn with the new names.
      expect(await drawn()).toEqual({ items: n, label: `named-${n - 1}.pdf`, role: 'group' });
      return { built, renamed };
    };
    // The first run compiles what the others run.
    await run(100);
    const small = await run(100);
    const large = await run(1000);
    for (const { built, renamed } of [small, large]) {
      expect(built.counts['file-upload.sync'] ?? 0, `file-upload.sync in a build of ${built.n} rows`).toBeLessThanOrEqual(3);
      expect(renamed.counts['file-upload.sync'] ?? 0, `file-upload.sync as ${renamed.n} rows are renamed`).toBeLessThanOrEqual(1);
    }
    expect(perItemRatio('file upload, every row renamed', small.renamed, large.renamed)).toBeLessThanOrEqual(1.1);
    // Not held yet: the build's calls per row. The List the rows stand in still re-reads its items once for each row
    // (`list.sync` is N + 3): the slot that holds each row inside its List item is assigned the row, and the slotchange
    // that sends passes through the List item to the List's own slot, which re-reads every item. Once the List answers
    // only a change of its own children there, this is held at 1.1 as the renaming is.
    perItemRatio('file upload, built', small.built, large.built);
    await cdp.detach();
  });
});

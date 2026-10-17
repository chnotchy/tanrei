// What a chat composer of many attachments costs (specs/chat-composer.spec.json): a chat composer that holds up to
// 1,000 of the product's File items costs the same for each item at 1,000 as at 100 — linear, never a re-read of every
// item for each item that draws or changes.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from the change to two frames after, per
// item, at 100 and at 1,000 items; and how many times the chat composer re-read its items (`chat-composer.sync`, a
// debug build's counter). The time is reported beside them, never held: a time is the machine's as much as the chat
// composer's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

/** A chat composer with a text and `n` File items the product gives, each finished. */
const composer = (n: number) =>
  `<tanrei-chat-composer id="composer" attachments="given" label="Message" value="Hello" send-label="Send" attach-label="Attach files" remove-label="Remove" retry-label="Retry">${Array.from(
    { length: n },
    (_, i) => `<tanrei-file-item value="f${i}" name="file-${i}.pdf" status="done"></tanrei-file-item>`,
  ).join('')}</tanrei-chat-composer>`;

test.describe('a chat composer of many attachments', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  test('CCM-9, CCM-10, CCM-43: built with 100 and with 1,000 File items, and every item set uploading at once, the chat composer reads its items a bounded number of times — the same calls per item at both sizes', async ({ page }) => {
    test.setTimeout(180_000);
    const cdp = await countingPage(page, ['tanrei-chat-composer', 'tanrei-file-item', 'tanrei-button']);
    /** Whether the send button the chat composer brings is enabled (CCM-10), and what the last item was given. */
    const drawn = () =>
      page.evaluate(() => {
        const host = document.querySelector('#composer')!;
        const send = host.shadowRoot!.querySelector<HTMLElement & { disabled: boolean }>('tanrei-button[part~="send-button"]');
        return { sendable: send ? !send.disabled : null, role: [...host.querySelectorAll('tanrei-file-item')].at(-1)?.getAttribute('role') ?? '' };
      });
    const run = async (n: number) => {
      const built = await buildCost(page, cdp, composer(n), n, 'chat composer');
      // Text and finished attachments: it can be sent (CCM-9); every item is an item of the strip's list (CCM-43).
      expect(await drawn()).toEqual({ sendable: true, role: 'listitem' });
      // Every item set uploading in one task, as a product that starts sending them all does.
      const uploading = await costOf(page, cdp, n, 'chat composer, every item set uploading', () =>
        page.evaluate(() => {
          for (const item of document.querySelectorAll<HTMLElement & { status: string }>('#composer tanrei-file-item')) item.status = 'uploading';
        }),
      );
      // CCM-9, CCM-10: an item still uploading — it cannot be sent.
      expect(await drawn()).toEqual({ sendable: false, role: 'listitem' });
      return { built, uploading };
    };
    // The first run compiles what the others run.
    await run(100);
    const small = await run(100);
    const large = await run(1000);
    for (const { built, uploading } of [small, large]) {
      expect(built.counts['chat-composer.sync'] ?? 0, `chat-composer.sync in a build of ${built.n} items`).toBeLessThanOrEqual(3);
      expect(uploading.counts['chat-composer.sync'] ?? 0, `chat-composer.sync as ${uploading.n} items change`).toBeLessThanOrEqual(1);
    }
    expect(perItemRatio('chat composer, built', small.built, large.built)).toBeLessThanOrEqual(1.1);
    expect(perItemRatio('chat composer, every item set uploading', small.uploading, large.uploading)).toBeLessThanOrEqual(1.1);
    await cdp.detach();
  });
});

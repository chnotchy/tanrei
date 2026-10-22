// What a stepper of many steps costs (specs/stepper.spec.json): a stepper of up to 1,000 steps costs the same for each
// step at 1,000 as at 100 — linear, never a re-read of every step for each step that draws or changes. A step that
// changes asks the stepper for an update, which runs once per turn however many steps asked, and the stepper re-reads
// its steps in that update; this holds it there.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from the change to two frames after, per
// step, at 100 and at 1,000 steps; and how many times the stepper re-read its steps (`stepper.sync`, a debug build's
// counter). The time is reported beside them, never held: a time is the machine's as much as the stepper's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

const LAYOUTS = {
  /** The full form, one column: every step drawn, each told its condition, number and whether it can be pressed. */
  vertical: 'layout="vertical" pressable="visited"',
  /** The compact form: the steps are read for the bar and the position, none of them drawn. */
  compact: 'layout="compact"',
} as const;

/** A stepper of `n` steps, the middle one current, every other step before it marked complete. */
const stepper = (n: number, layout: string) =>
  `<tanrei-stepper id="stepper" label="Progress" ${layout} value="s${n / 2}" completed-text="Completed" error-text="Has an error" position-text="Step {position} of {count}">${Array.from(
    { length: n },
    (_, i) => `<tanrei-stepper-step value="s${i}" label="Step ${i}"${i < n / 2 && i % 2 ? ' status="complete"' : ''}></tanrei-stepper-step>`,
  ).join('')}</tanrei-stepper>`;

test.describe('a stepper of many steps', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  for (const [kind, layout] of Object.entries(LAYOUTS)) {
    test(`SPR-1, SPR-19: a ${kind} stepper, built with 100 and with 1,000 steps, and every step's label changed at once, reads its steps a bounded number of times — the same calls per step at both sizes`, async ({ page }) => {
      test.setTimeout(180_000);
      const cdp = await countingPage(page, ['tanrei-stepper', 'tanrei-stepper-step']);
      const run = async (n: number) => {
        const built = await buildCost(page, cdp, stepper(n, layout), n, `${kind} stepper`);
        // Every step was told its place (SPR-1, SPR-19): the last is numbered n, the middle one is the current step.
        const told = await page.evaluate(() => {
          const steps = [...document.querySelectorAll('#stepper tanrei-stepper-step')];
          return { current: steps.findIndex((step) => step.getAttribute('aria-current') === 'step'), last: steps.at(-1)?.shadowRoot?.querySelector('.number')?.textContent ?? '' };
        });
        expect(told.current).toBe(n / 2);
        if (kind === 'vertical') expect(told.last).toBe(String(n));
        // Every step renamed in one task, as a product that translates its flow does.
        const renamed = await costOf(page, cdp, n, `${kind} stepper, every label changed`, () =>
          page.evaluate(() => {
            for (const [i, step] of [...document.querySelectorAll<HTMLElement & { label: string }>('#stepper tanrei-stepper-step')].entries()) step.label = `Named ${i}`;
          }),
        );
        const shown = await page.evaluate(() => {
          const host = document.querySelector('#stepper')!;
          return host.shadowRoot!.querySelector('.compact .label')?.textContent ?? host.querySelector('tanrei-stepper-step')!.shadowRoot!.querySelector('.label')?.textContent ?? '';
        });
        expect(shown).toBe(kind === 'compact' ? `Named ${n / 2}` : 'Named 0');
        return { built, renamed };
      };
      // The first run compiles what the others run.
      await run(100);
      const small = await run(100);
      const large = await run(1000);
      for (const { built, renamed } of [small, large]) {
        expect(built.counts['stepper.sync'] ?? 0, `stepper.sync in a build of ${built.n} steps`).toBeLessThanOrEqual(3);
        expect(renamed.counts['stepper.sync'] ?? 0, `stepper.sync as ${renamed.n} labels change`).toBeLessThanOrEqual(1);
      }
      expect(perItemRatio(`${kind} stepper, built`, small.built, large.built)).toBeLessThanOrEqual(1.1);
      expect(perItemRatio(`${kind} stepper, every label changed`, small.renamed, large.renamed)).toBeLessThanOrEqual(1.1);
      await cdp.detach();
    });
  }
});

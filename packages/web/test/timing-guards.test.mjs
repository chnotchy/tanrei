// Patterns in the Playwright tests that are always wrong on a slow machine, and pass on a fast one — so a fast machine
// never shows them. Each rule counts its offenders by file, and the counts must equal the rule's allowlist: a new
// offender fails (fix it), and so does one that is gone (take it off the list, which only shrinks).
//
// - `document.getAnimations()` used to wait for a motion: it does not look into shadow roots in any engine, so it
//   returns before the component's own motions end.
// - any other wait for motions (`getAnimations(…)` and `.finished`) or count of them (`.length`) outside
//   test/motions.ts: an element's `getAnimations({ subtree: true })` does not enter its own shadow root either, and a
//   walk of one's own misses what the shared one sees. Wait with `motionEnded()` from test/motions.ts, or count
//   `transitionrun` (test/transitions.ts).
// - `waitForTimeout(<number>)` with no reason beside it: a fixed wait is either too short on a loaded runner (a wait
//   for something) or proves less there (a wait for "nothing happened"). Hold the page clock (test/page-clock.ts) or
//   wait for a condition; where a real wait is right, say why in a comment on the line or the line above.
// - `goto('about:blank')` in a file whose tests hover or move the pointer: in Chromium on Linux a page that went to
//   about:blank and on to the stage sends no pointerleave or pointerout to anything on it, so a hover never ends
//   there. Mount on the test's own page (`setContent`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Each rule: what it counts in one file's text, and today's offenders by file (`<path from packages/web>: <count>`). */
export const RULES = {
  'document.getAnimations() used as a wait': {
    // Code only: a comment that names the call to warn against it (test/motions.ts, a helper's note) is not a use.
    count: (text, file) =>
      file === 'test/motions.ts'
        ? 0
        : text
            .split('\n')
            .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
            .reduce((n, line) => n + (line.match(/\bdocument\.getAnimations\(\)/g) ?? []).length, 0),
    allowed: {
      'src/components/accordion/accordion.test.ts': 3,
      'src/components/table-of-contents/table-of-contents.test.ts': 1,
      'src/components/tabs/tabs.test.ts': 4,
      'src/components/tree-view/tree-view.test.ts': 2,
    },
  },
  'a wait for motions or a count of them that is not test/motions.ts': {
    count: (text, file) => {
      if (file === 'test/motions.ts') return 0;
      const lines = text.split('\n');
      return lines.filter((line, at) => line.includes('getAnimations(') && /\.finished\b|\)\s*\)?\.length\b|\.length\s*[=!<>]/.test(`${line} ${lines[at + 1] ?? ''}`)).length;
    },
    allowed: {
      'src/components/accordion/accordion.test.ts': 5,
      'src/components/app-bar/app-bar.test.ts': 1,
      'src/components/avatar/avatar.test.ts': 5,
      'src/components/bottom-sheet/bottom-sheet.test.ts': 3,
      'src/components/breadcrumbs/breadcrumbs.test.ts': 2,
      'src/components/button-group/button-group.test.ts': 3,
      'src/components/button-with-menu/button-with-menu.test.ts': 4,
      'src/components/calendar/calendar.test.ts': 2,
      'src/components/callout/callout.test.ts': 2,
      'src/components/chat-composer/chat-composer.test.ts': 3,
      'src/components/chip/chip.test.ts': 2,
      'src/components/code-block/code-block.test.ts': 4,
      'src/components/combobox/combobox.test.ts': 2,
      'src/components/copy-button/copy-button.test.ts': 6,
      'src/components/date-time-picker/date-time-picker.test.ts': 1,
      'src/components/dialog/dialog.test.ts': 2,
      'src/components/embedded-text-input/embedded-text-input.test.ts': 6,
      'src/components/empty-state/empty-state.test.ts': 2,
      'src/components/fab-menu/fab-menu.test.ts': 1,
      'src/components/field/field.test.ts': 1,
      'src/components/file-item/file-item.test.ts': 8,
      'src/components/file-picker/file-picker.test.ts': 4,
      'src/components/file-upload/file-upload.test.ts': 5,
      'src/components/image-preview/image-preview.test.ts': 4,
      'src/components/list/list.test.ts': 3,
      'src/components/main-action-button/main-action-button.test.ts': 1,
      'src/components/menu/menu.test.ts': 7,
      'src/components/menubar/menubar.test.ts': 4,
      // Two more since the list was made: the open helper that waits on the layer's own fade, merged just before.
      'src/components/modal-layer/modal-layer.test.ts': 4,
      'src/components/navigation-bar/navigation-bar.test.ts': 7,
      'src/components/navigation-drawer/navigation-drawer.test.ts': 3,
      'src/components/one-time-code-input/one-time-code-input.test.ts': 1,
      'src/components/pagination/pagination.test.ts': 2,
      'src/components/popover/popover.test.ts': 8,
      'src/components/progress-indicator/progress-indicator.test.ts': 4,
      'src/components/radio-button/radio-button.test.ts': 5,
      'src/components/radio-group/radio-group.test.ts': 1,
      'src/components/search/search.test.ts': 3,
      'src/components/segmented-button/segmented-button.test.ts': 2,
      'src/components/select/select.test.ts': 2,
      'src/components/side-sheet/side-sheet.test.ts': 5,
      'src/components/skeleton/skeleton.test.ts': 4,
      'src/components/slider-field/slider-field.test.ts': 1,
      'src/components/snackbar/snackbar.test.ts': 6,
      'src/components/stepper/stepper.test.ts': 1,
      'src/components/swatch/swatch.test.ts': 2,
      'src/components/switch/switch.test.ts': 4,
      'src/components/tab-view/tab-view.test.ts': 5,
      'src/components/table-of-contents/table-of-contents.test.ts': 6,
      'src/components/tabs/tabs.test.ts': 17,
      'src/components/tag-group/tag-group.test.ts': 2,
      'src/components/tag/tag.test.ts': 3,
      'src/components/text-input/text-input.test.ts': 7,
      'src/components/tooltip/tooltip.test.ts': 3,
      'src/components/tree-view/tree-view.test.ts': 6,
      'src/styles/code.test.ts': 1,
      'src/styles/link.test.ts': 2,
      'src/styles/registered-properties.test.ts': 1,
      'test/destinations.ts': 2,
      'test/links.ts': 1,
    },
  },
  'waitForTimeout(<number>) with no reason in a comment': {
    count: (text) => {
      const lines = text.split('\n');
      return lines.filter((line, at) => /waitForTimeout\(\s*\d[\d_]*\s*\)/.test(line) && !line.includes('//') && !/^\s*(\/\/|\*|\/\*)/.test(lines[at - 1] ?? '')).length;
    },
    allowed: {
      'src/components/accordion/accordion.test.ts': 3,
      'src/components/app-shell/app-shell.test.ts': 2,
      'src/components/avatar/avatar.test.ts': 1,
      'src/components/bottom-sheet/bottom-sheet.test.ts': 4,
      'src/components/button-group/button-group.test.ts': 1,
      'src/components/button-with-menu/button-with-menu.test.ts': 7,
      'src/components/button/button.test.ts': 1,
      'src/components/calendar/calendar.test.ts': 1,
      'src/components/callout/callout.test.ts': 1,
      'src/components/card/card.test.ts': 2,
      'src/components/carousel/carousel.test.ts': 19,
      'src/components/chip-field/chip-field.test.ts': 1,
      'src/components/code-block/code-block.test.ts': 19,
      'src/components/color-field/color-field.test.ts': 1,
      'src/components/combobox-field/combobox-field.test.ts': 1,
      'src/components/copy-button/copy-button.test.ts': 1,
      'src/components/date-time-picker/date-time-picker.test.ts': 14,
      'src/components/dialog/dialog.test.ts': 3,
      'src/components/fab-menu/fab-menu.test.ts': 1,
      'src/components/figure/figure.test.ts': 1,
      'src/components/file-item/file-item.test.ts': 1,
      'src/components/image-preview/image-preview.test.ts': 19,
      'src/components/link-card/link-card.test.ts': 6,
      'src/components/list/list.test.ts': 4,
      'src/components/main-action-button/main-action-button.test.ts': 1,
      'src/components/menu/menu.test.ts': 5,
      'src/components/menubar/menubar.test.ts': 4,
      'src/components/modal-layer/modal-layer.test.ts': 1,
      'src/components/navigation-bar/navigation-bar.test.ts': 5,
      'src/components/navigation-drawer/navigation-drawer.test.ts': 9,
      'src/components/number-field/number-field.test.ts': 1,
      'src/components/pagination/pagination.test.ts': 3,
      'src/components/popover/popover.test.ts': 3,
      'src/components/search/search.test.ts': 2,
      'src/components/segmented-button/segmented-button.test.ts': 1,
      'src/components/select/select.test.ts': 3,
      'src/components/side-sheet/side-sheet.test.ts': 6,
      'src/components/skeleton/skeleton.test.ts': 2,
      'src/components/slider/slider.test.ts': 3,
      'src/components/snackbar/snackbar.test.ts': 5,
      'src/components/switch/switch.test.ts': 2,
      'src/components/table-of-contents/table-of-contents.test.ts': 5,
      'src/components/table/table.test.ts': 1,
      'src/components/tabs/tabs.test.ts': 2,
      'src/components/text-field/text-field.test.ts': 1,
      'src/components/text-input/text-input.test.ts': 5,
      'src/components/toolbar/toolbar.test.ts': 1,
      'src/components/tooltip/tooltip.test.ts': 10,
      'src/components/tree-view/tree-view.test.ts': 8,
      'src/primitives/availability.test.ts': 3,
      'src/primitives/default-button.test.ts': 3,
      'src/primitives/words.test.ts': 1,
      'src/styles/link.test.ts': 5,
      'src/styles/previous-next-links.test.ts': 1,
      'src/styles/prose.test.ts': 1,
      'src/styles/steps.test.ts': 1,
      'src/styles/timeline.test.ts': 5,
      'test/held-press.ts': 2,
    },
  },
  "goto('about:blank') where the pointer hovers or leaves": {
    count: (text) => (/\.hover\(|mouse\.move\(|pointerleave|pointerout/.test(text) ? (text.match(/\.goto\(\s*['"`]about:blank['"`]/g) ?? []).length : 0),
    allowed: {
      'src/components/link-card/link-card.test.ts': 1,
      'src/components/menu/menu.test.ts': 1,
      'src/styles/link.test.ts': 1,
      'src/styles/previous-next-links.test.ts': 5,
      'src/styles/steps.test.ts': 2,
      'src/styles/timeline.test.ts': 3,
    },
  },
};

/** Planted offenders: each rule counts its own once, and its correct twin not at all. */
const PLANTED = {
  'document.getAnimations() used as a wait': [
    "await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));",
    "await host.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));",
  ],
  'a wait for motions or a count of them that is not test/motions.ts': [
    'await host.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));',
    'await motionEnded(host);',
  ],
  'waitForTimeout(<number>) with no reason in a comment': [
    'await page.click("#a");\nawait page.waitForTimeout(100);',
    'await page.click("#a");\n// Nothing may happen for a whole second: the real delay is what is asked.\nawait page.waitForTimeout(1000);',
  ],
  "goto('about:blank') where the pointer hovers or leaves": [
    "await page.goto('about:blank');\nawait mount(page);\nawait page.hover('#card');",
    "await page.setContent(html);\nawait page.hover('#card');",
  ],
};

const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' || entry.name === 'fixtures' ? [] : files(file);
    return /\.ts$/.test(entry.name) ? [file] : [];
  });

/** The tests and their shared helpers. */
const sources = () => [...files(path.join(pkg, 'src')).filter((file) => file.endsWith('.test.ts')), ...files(path.join(pkg, 'test'))];

for (const [rule, { count, allowed }] of Object.entries(RULES)) {
  test(`timing guard: ${rule}`, () => {
    const found = {};
    for (const file of sources()) {
      const name = path.relative(pkg, file).split(path.sep).join('/');
      const n = count(fs.readFileSync(file, 'utf8'), name);
      if (n) found[name] = n;
    }
    assert.deepEqual(found, allowed, 'a file with more is a new offender: fix it; a file with fewer: lower its count, or take it off the list');
  });

  test(`timing guard: ${rule} — catches a planted offender`, () => {
    const [wrong, right] = PLANTED[rule];
    assert.equal(count(wrong), 1);
    assert.equal(count(right), 0);
  });
}

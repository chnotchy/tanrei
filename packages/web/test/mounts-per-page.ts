// How many documents of fixtures a test may mount into one page (`mountFixtures`, test/harness.ts).
//
// Each mount writes a whole document into the same window — the bundle, the tokens and the faces inline, about 11 MB —
// and the engine keeps much of what each one held until the page closes: WebKit's web process on Linux grew by about
// 30 MB a mount (0.5 GB to 2.2 GB over 46 mounts in the CI-like container), and under that pressure a later mount had
// no loaded icon face or the page crashed. A page closed after its test frees it all, so a test of one fixture per page
// costs nothing of the kind: what is checked of every fixture is a test per fixture (or per group of them).
//
// MOUNTS_PER_PAGE is the most a page may take. Measured in Chromium over every test the static count found looping
// over mounts or making four or more (513 tests; every other test makes three or fewer): 491 mount 8 or fewer, the
// counts thin out past 6 (6: 47 tests, 7: 11, 8: 9), and the rest is a tail from 9 to 23. Eight mounts are about
// 240 MB in WebKit, a ninth of what crashed it. A test that mounts more fails at the mount past the cap, unless it is
// in MOUNTS_OVER_THE_CAP.
//
// MOUNTS_OVER_THE_CAP lists the tests that still mount more, each with the most it may mount; it only shrinks. A test
// on it that mounts more than its number fails, and so does one that passes having mounted no more than the cap: take
// it off the list.
//
// TANREI_MOUNT_LOG=<file> appends, as each page closes, a line of JSON — the test, the project and how many documents
// the page took — to count them again.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../src');

export const MOUNTS_PER_PAGE = 8;

/** Each test that mounts more than MOUNTS_PER_PAGE into a page, by `<file under src/> › <its titles>`: the most it mounts. */
export const MOUNTS_OVER_THE_CAP: Readonly<Record<string, number>> = {
  'components/app-shell/app-shell.test.ts › telling regions apart › APS-18: auto parts the regions as comp.app-shell.separation names — under the default system a hairline of outline.width in outline.color above the footer and at the start edge of the aside — and divider and gap are themselves whatever the token says; the lines take no room; between the main content and a stacked aside the line is in the middle of aside.gap; no line around the navigation, the announcement or the navigation bar; an unknown value is auto': 10,
  'components/bottom-sheet/bottom-sheet.test.ts › forms, focus and dismissal › BSH-5: while dismissible, the scrim, Escape, back and a drag below the lowest height ask to close — once, with the reason — and the product closes it; with closedby none nothing is asked and the scrim still blocks': 9,
  'components/date-time-picker/date-time-picker.test.ts › the range fields and typed entries › DTM-20, DTM-39, DTM-44: the minute wheel shows the ring after the hour’s entry moves on to it in every form with wheels — time and date-time, a range, docked and modal, a joined selection container, right to left': 9,
  'components/date-time-picker/date-time-picker.test.ts › the range fields and typed entries › DTM-44: digits, ASCII or the locale’s, are shown on the middle row in place of the value; a second digit joins the first where the two make a value, else the hour ends with the first and the second begins the minute; an entry ends by two digits or one that none could join, an hour’s moving focus to the minute wheel, as the separator does; Backspace removes the last digit; other characters are ignored, pasted text is read in order, and the period never changes': 13,
  'components/date-time-picker/date-time-picker.test.ts › the time › DTM-15: a range with a time draws the range display — the start’s range field, an en dash, the end’s, range-field.gap apart, equally wide, in a group named rangeLabel — each field at least its height, padded, its time in its role, on the selector’s shape and its condition’s selector tokens (acme values them apart); no word for start or end; the start’s selected when it opens, and the time section sets the selected end; the display is the first row and as wide as the time section in every mode and layout': 10,
  'components/link-card/link-card.test.ts › the site line and the host › LKC-8 the host is computed from href and from nothing else — never a user name, a path, a query, a fragment or a value the card is given — and no prop can set, replace or hide it; an address with no host of its own draws none; a host written in the document that differs is replaced and reported': 13,
  'components/navigation-drawer/navigation-drawer.test.ts › a drawer that follows the window › NVD-53: a window exactly 1024 wide is standard and 1023 the column, 600 the column and 599 modal, and a drawer that is not collapsible is modal at 800; variant is ignored; each presentation behaves as the drawer it stands for; while responsive is false the window’s width is not read': 9,
  'components/snackbar/snackbar.test.ts › controls: states, press, corners and focus style › SNK-2, SNK-34: the action renders each state from its form’s tokens, and the expand and close Buttons in their form’s tone — a status’s, the inverse form’s and an inverse status’s': 23,
  'components/snackbar/snackbar.test.ts › controls: states, press, corners and focus style › SNK-3, SNK-34: the indicator’s outer stroke is the form’s focus-ring color — on the action, the close and expand buttons (through their tone) and the scrolling text, in the default, a status, the inverse and an inverse status form — at the system’s widths and offset, and 3:1 or more against that form’s bar in every scheme': 9,
};

const mounts = new WeakMap<Page, number>();

/** The test's name as MOUNTS_OVER_THE_CAP writes it, or nothing outside a test. */
function testId(): string | undefined {
  try {
    const info = test.info();
    return [path.relative(src, info.file).split(path.sep).join('/'), ...info.titlePath.slice(1)].join(' › ');
  } catch {
    return undefined;
  }
}

/** Counts one mount of a document of fixtures into `page`, and fails the test at a mount past what it may make. */
export function countMount(page: Page): void {
  const count = (mounts.get(page) ?? 0) + 1;
  mounts.set(page, count);
  const id = testId();
  const allowed = (id && MOUNTS_OVER_THE_CAP[id]) || MOUNTS_PER_PAGE;
  if (count > allowed) {
    throw new Error(
      allowed === MOUNTS_PER_PAGE
        ? `mountFixtures: this page's mount ${count} is past the ${MOUNTS_PER_PAGE} a page may take (test/mounts-per-page.ts): every document mounted into one page grows the engine's memory until the page closes. Split the test — a test per fixture, or per group of fixtures — so each page mounts ${MOUNTS_PER_PAGE} or fewer.`
        : `mountFixtures: this page's mount ${count} is past the ${allowed} that MOUNTS_OVER_THE_CAP allows this test (test/mounts-per-page.ts). The list only shrinks: split the test instead.`,
    );
  }
  if (count > 1) return;
  // The page closes at the end of its test (or when the test closes it): a test on the list that passed with no more
  // mounts than the cap is taken off it.
  page.once('close', () => {
    const total = mounts.get(page) ?? 0;
    let info: ReturnType<typeof test.info> | undefined;
    try {
      info = test.info();
    } catch {}
    const log = process.env.TANREI_MOUNT_LOG;
    if (log) fs.appendFileSync(log, `${JSON.stringify({ id, project: info?.project.name, mounts: total })}\n`);
    // (A page that outlives its test — one a hook opened — is not that test's to judge.)
    if (!info || !id || testId() !== id || !(id in MOUNTS_OVER_THE_CAP) || info.errors.length || info.status !== 'passed' || info.expectedStatus !== 'passed') return;
    expect.soft(total, `${id} is in MOUNTS_OVER_THE_CAP (test/mounts-per-page.ts) but mounted ${total} documents into its page, no more than the ${MOUNTS_PER_PAGE} a page may take: take it off the list`).toBeGreaterThan(MOUNTS_PER_PAGE);
  });
}

// No component that measures with a resize observer writes a size inside that observer's report.
//
// A frame reports a box that changed size in an observer's callback only if it lies deeper than every box reported
// before it in that frame; a write in the report that changes the size of a box already reported, or of one above it,
// leaves that box undelivered, and the browser raises "ResizeObserver loop completed with undelivered notifications"
// (WebKit as a page error, once a page) and reports it in the next frame. It shows wherever nothing above the element
// changes size — a box of fixed size — because a page that observes its root element hides it
// (src/primitives/read-phase.ts).
//
// Each subject here measures with an observer of its own or a shared one (the snackbar, the chat composer, the dialog
// and the side sheet through src/primitives/resize-watch.ts, the popover, the date-time picker, the embedded text input
// and the size transition). Each is put in a box of fixed size and changed in every way that has its observer report:
// the box's width (or the window's, for a surface in the top layer), the text it holds, the direction, a CSS zoom.
// Each change is made in a frame callback of its own, before that frame's layout. The probe counts the loop errors —
// none is allowed — and the frames in which anything the element draws (its host, its shadow root's elements, its
// children) changed size or place, each read in a task after the frame that drew it: as the element is first drawn,
// where one is allowed (the first frame painted is at rest, MOT-3: a measure the first frame needs is not put off), and
// after each change, which is only reported (1 where everything follows in the frame of the change, 2 or 3 where a part
// is drawn a frame or two late by the read phase, as the component's code says, IMPLEMENTATION.md "Write nothing in a
// resize observer's report").
// affected: each component — each test names in its title the components it draws.
import { type Page, expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

/** One change, made in a frame callback before that frame's layout (`window` is the window's size, set by the test). */
interface Step {
  width?: number;
  /** The element's properties, set together. */
  props?: Record<string, unknown>;
  /** The text of the element marked `data-probe-text`, in the element or its holder. */
  text?: string;
  dir?: 'ltr' | 'rtl';
  zoom?: number;
  window?: { width: number; height: number };
}

interface Subject {
  /** What it is, and the behaviour ids of what it measures. */
  name: string;
  tag: string;
  props: Record<string, unknown>;
  /** The element's children. */
  html?: string;
  /** The element's own style attribute. */
  style?: string;
  /** Markup of the holder's own, before the element (an anchor). */
  before?: string;
  /** The holder's size; the element fills its width unless `fill` is false. */
  width: number;
  height: number;
  fill?: boolean;
  steps: Step[];
}

const LONG = 'Your photos were moved to the shared album, and everyone in the family can now see and comment on them.';
const SHORT = 'Moved.';
const WORDS = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty';
/** Changes every subject in a box goes through: narrower and wider, its text, the direction and a zoom. */
const boxSteps = (wide: number, narrow: number, text: (long: boolean) => Step): Step[] => [
  { width: narrow },
  { width: wide },
  { width: Math.round((wide + narrow) / 2) },
  { width: narrow },
  text(false),
  { width: wide },
  text(true),
  { width: narrow },
  { dir: 'rtl' },
  { width: wide },
  { width: narrow },
  { dir: 'ltr' },
  { zoom: 1.5 },
  { width: wide },
  { zoom: 1 },
  { width: narrow },
  { width: wide },
];

const SUBJECTS: Subject[] = [
  {
    name: 'snackbar, with its button controls (SNK-16, SNK-23, SNK-25)',
    tag: 'tanrei-snackbar',
    props: { message: LONG, title: 'Album updated', action: 'Undo', closable: true, closeLabel: 'Close', expandLabel: 'Show more' },
    width: 600,
    height: 400,
    fill: false,
    steps: boxSteps(600, 220, (long) => ({ props: { message: long ? LONG : SHORT } })),
  },
  {
    name: 'chat-composer, with its embedded-text-input, file-picker and button parts (CCM-4, CCM-41)',
    tag: 'tanrei-chat-composer',
    props: { label: 'Message', sendLabel: 'Send', attachments: 'own', attachLabel: 'Attach', value: 'Hello' },
    html: '<tanrei-button slot="leading" variant="text">Ask a question about the photos</tanrei-button>',
    // Drawn first too narrow for the inline layout: the first frame is already stacked.
    width: 200,
    height: 400,
    steps: boxSteps(640, 200, (long) => ({ props: { value: long ? WORDS : 'Hi' } })),
  },
  {
    name: 'dialog, with button actions, through the shared resize watch (DLG-7, DLG-10, DLG-12)',
    tag: 'tanrei-dialog',
    props: { open: true, headline: 'Empty the trash?' },
    html: `<p data-probe-text>${LONG}</p><tanrei-button slot="actions" dismissive>Cancel</tanrei-button><tanrei-button slot="actions" confirming>Empty the trash now</tanrei-button>`,
    width: 640,
    height: 480,
    steps: [
      { props: { width: 'small' } },
      { props: { width: 'large' } },
      { text: SHORT },
      { props: { width: 'small' } },
      { text: `${LONG} ${LONG} ${LONG} ${LONG}` },
      { window: { width: 360, height: 640 } },
      { window: { width: 1280, height: 720 } },
      { window: { width: 600, height: 300 } },
      { props: { width: 'content' } },
      { window: { width: 700, height: 400 } },
      { window: { width: 460, height: 260 } },
      { window: { width: 640, height: 200 } },
      { window: { width: 420, height: 720 } },
      { dir: 'rtl' },
      { props: { width: 'medium' } },
      { dir: 'ltr' },
      { window: { width: 1280, height: 720 } },
      { props: { width: 'content' } },
    ],
  },
  {
    name: 'side-sheet, standard, with button actions, through the shared resize watch (SSH-1, SSH-11, SSH-14)',
    tag: 'tanrei-side-sheet',
    props: { open: true, headline: 'Filters for the photos in the shared album', closeLabel: 'Close' },
    html: `<p data-probe-text>${LONG}</p><tanrei-button slot="actions" confirming>Apply the filters</tanrei-button><tanrei-button slot="actions">Reset</tanrei-button>`,
    width: 640,
    height: 400,
    fill: false,
    steps: [
      { text: SHORT },
      { text: `${LONG} ${LONG} ${LONG} ${LONG} ${LONG}` },
      { width: 300 },
      { width: 640 },
      { dir: 'rtl' },
      { text: SHORT },
      { dir: 'ltr' },
      { zoom: 1.5 },
      { text: LONG },
      { zoom: 1 },
    ],
  },
  {
    name: 'side-sheet, modal, with button actions, through the shared resize watch (SSH-11, SSH-14)',
    tag: 'tanrei-side-sheet',
    props: { variant: 'modal', open: true, headline: 'Filters for the photos in the shared album', closeLabel: 'Close' },
    html: `<p data-probe-text>${LONG}</p><tanrei-button slot="actions" confirming>Apply the filters</tanrei-button><tanrei-button slot="actions">Reset</tanrei-button>`,
    width: 640,
    height: 400,
    steps: [
      { window: { width: 800, height: 300 } },
      { text: `${LONG} ${LONG} ${LONG} ${LONG} ${LONG}` },
      { window: { width: 1280, height: 720 } },
      { window: { width: 360, height: 640 } },
      { window: { width: 300, height: 200 } },
      { text: SHORT },
      { dir: 'rtl' },
      { window: { width: 1280, height: 720 } },
      { dir: 'ltr' },
    ],
  },
  {
    name: 'popover, with a button anchor and button actions (POP-7, POP-30)',
    tag: 'tanrei-popover',
    props: { open: true, headline: 'Storage', anchor: 'probe-anchor', width: 'anchor', closable: true, closeLabel: 'Close' },
    html: `<p data-probe-text>${LONG}</p><tanrei-button slot="actions" dismissive>Cancel</tanrei-button><tanrei-button slot="actions" confirming>Manage the storage</tanrei-button>`,
    before: '<tanrei-button id="probe-anchor" variant="outlined" style="inline-size: 100%">Storage</tanrei-button>',
    width: 480,
    height: 120,
    steps: [
      { width: 240 },
      { width: 480 },
      { text: SHORT },
      { width: 200 },
      { text: LONG },
      { width: 360 },
      { dir: 'rtl' },
      { width: 220 },
      { dir: 'ltr' },
      { zoom: 1.5 },
      { width: 480 },
      { zoom: 1 },
      { window: { width: 900, height: 500 } },
      { window: { width: 1280, height: 720 } },
    ],
  },
  {
    name: 'date-time-picker, inline (DTM-10, DTM-34)',
    tag: 'tanrei-date-time-picker',
    props: { open: true, inline: true, presentation: 'docked', mode: 'date-time', value: '2026-08-17T07:30', today: '2026-09-24', locale: 'en-US', label: 'Select date and time', dateLabel: 'Date', hourLabel: 'Hour', minuteLabel: 'Minute', periodLabel: 'Period', confirmLabel: 'OK', cancelLabel: 'Cancel', previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month', yearViewLabel: 'Choose a year', todayLabel: 'Today', wheelsLabel: 'Wheels', dialLabel: 'Dial', entryModeLabel: 'Time input' },
    width: 720,
    height: 700,
    fill: false,
    steps: [
      // August 2026 takes six weeks, September five.
      { props: { value: '2026-09-17T07:30' } },
      { props: { value: '2026-08-17T07:30' } },
      { props: { layout: 'horizontal' } },
      { props: { layout: 'vertical' } },
      { props: { confirmLabel: 'Confirm the date and the time', cancelLabel: 'Keep the one chosen before' } },
      { props: { confirmLabel: 'OK', cancelLabel: 'Cancel' } },
      { dir: 'rtl' },
      { props: { value: '2026-09-17T07:30' } },
      { dir: 'ltr' },
      { zoom: 1.25 },
      { props: { value: '2026-08-17T07:30' } },
      { zoom: 1 },
    ],
  },
  {
    name: 'date-time-picker, modal, its layout chosen by the window (DTM-10, DTM-34)',
    tag: 'tanrei-date-time-picker',
    props: { open: true, presentation: 'modal', mode: 'date-time', value: '2026-08-17T07:30', today: '2026-09-24', locale: 'en-US', label: 'Select date and time', dateLabel: 'Date', hourLabel: 'Hour', minuteLabel: 'Minute', periodLabel: 'Period', confirmLabel: 'OK', cancelLabel: 'Cancel', previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month', yearViewLabel: 'Choose a year', todayLabel: 'Today', wheelsLabel: 'Wheels', dialLabel: 'Dial', entryModeLabel: 'Time input' },
    width: 400,
    height: 100,
    steps: [
      { window: { width: 900, height: 500 } },
      { window: { width: 480, height: 900 } },
      { window: { width: 900, height: 520 } },
      { window: { width: 900, height: 900 } },
      { props: { value: '2026-09-17T07:30' } },
      { window: { width: 800, height: 600 } },
      { window: { width: 360, height: 640 } },
      { window: { width: 1280, height: 480 } },
      { props: { confirmLabel: 'Confirm the date and the time', cancelLabel: 'Keep the one chosen before' } },
      { window: { width: 600, height: 900 } },
      { window: { width: 1280, height: 720 } },
    ],
  },
  {
    name: 'embedded-text-input (ETI-9)',
    tag: 'tanrei-embedded-text-input',
    props: { label: 'Notes', multiline: true, value: WORDS },
    width: 400,
    height: 400,
    steps: boxSteps(400, 120, (long) => ({ props: { value: long ? WORDS : 'a' } })),
  },
  {
    name: 'size-transition (SZT-2, SZT-6)',
    tag: 'tanrei-size-transition',
    props: {},
    // As wide as the box (the fixtures' stage gives it a width of its own).
    style: 'inline-size: auto',
    html: `<p data-probe-text>${LONG}</p>`,
    width: 400,
    height: 400,
    steps: boxSteps(400, 120, (long) => ({ text: long ? `${LONG} ${LONG}` : SHORT })),
  },
  {
    name: 'size-transition on both axes (SZT-2, SZT-6)',
    tag: 'tanrei-size-transition',
    props: { axis: 'both' },
    html: `<p data-probe-text style="margin: 0">${LONG}</p>`,
    width: 400,
    height: 400,
    fill: false,
    steps: boxSteps(400, 120, (long) => ({ text: long ? `${LONG} ${LONG}` : SHORT })),
  },
];

/** What a run saw: the loop errors, and the frames in which what the element draws changed — as it was drawn first, and after each change. */
interface Seen {
  errors: string[];
  /** Frames that changed from the first frame drawn on: 1 where the first frame drawn is already at rest. */
  mount: number;
  /** For each change, the frames that changed what is drawn, and the loop errors counted so far. */
  steps: { frames: number; errors: number }[];
}

type Probe = { errors: string[]; changed: number; last: string; running: boolean; holder: HTMLElement; element: HTMLElement; append: boolean };

/** Builds the holder and the element, and starts counting the frames in which what it draws changes. */
function setUp(subject: Omit<Subject, 'steps' | 'name'>): void {
  const errors: string[] = [];
  const onError = (event: ErrorEvent) => {
    if (/ResizeObserver/.test(event.message)) errors.push(event.message);
  };
  window.addEventListener('error', onError);
  // Fixed: the element changes the size of nothing above it, so that its own boxes are the shallowest a frame reports.
  const holder = document.createElement('div');
  holder.style.cssText = `position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: ${subject.width}px; block-size: ${subject.height}px; display: flex; flex-direction: column; align-items: ${subject.fill === false ? 'flex-start' : 'stretch'}`;
  holder.innerHTML = subject.before ?? '';
  const element = document.createElement(subject.tag);
  Object.assign(element, subject.props);
  element.innerHTML = subject.html ?? '';
  if (subject.style) element.setAttribute('style', subject.style);
  holder.append(element);
  const probe: Probe = { errors, changed: 0, last: '', running: true, holder, element, append: true };
  // Every box the element draws, read in a task after each frame: what that frame drew.
  const signature = () => {
    const boxes: Element[] = [element, ...element.querySelectorAll('*'), ...(element.shadowRoot?.querySelectorAll('*') ?? [])];
    return boxes
      .map((box) => {
        const { x, y, width, height } = box.getBoundingClientRect();
        return [x, y, width, height].map((n) => Math.round(n * 10)).join(',');
      })
      .join(';');
  };
  const sample = () => {
    if (!probe.running) return;
    // Not on the page yet: the first frame counted is the first one it is drawn in.
    const now = holder.isConnected ? signature() : '';
    if (now !== probe.last) probe.changed++;
    probe.last = now;
    // Appended in a task, as a product draws a view: in the task that read the frame before, so that the next frame
    // is the first to draw it and the next reading is of that frame.
    if (probe.append) {
      probe.append = false;
      document.body.append(holder);
    }
    requestAnimationFrame(() => setTimeout(sample));
  };
  (window as unknown as { probe: Probe }).probe = probe;
  requestAnimationFrame(() => setTimeout(sample));
}

/**
 * Makes `step` in a frame callback, before that frame's layout, then counts the frames in the next eight that change
 * what the element draws. With `reset` false the count goes on from what it was.
 */
async function apply({ step, reset }: { step: Step | null; reset: boolean }): Promise<{ frames: number; errors: number }> {
  const probe = (window as unknown as { probe: Probe }).probe;
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await frame();
  if (reset) probe.changed = 0;
  if (step) {
    if (step.width !== undefined) probe.holder.style.inlineSize = `${step.width}px`;
    if (step.props) Object.assign(probe.element, step.props);
    if (step.text !== undefined) {
      const text = probe.element.querySelector('[data-probe-text]') ?? probe.holder.querySelector('[data-probe-text]');
      if (text) text.textContent = step.text;
    }
    if (step.dir) probe.holder.dir = step.dir;
    if (step.zoom !== undefined) probe.holder.style.zoom = String(step.zoom);
  }
  for (let i = 0; i < 8; i++) await frame();
  return { frames: probe.changed, errors: probe.errors.length };
}

function tearDown(): string[] {
  const probe = (window as unknown as { probe: Probe }).probe;
  probe.running = false;
  probe.holder.remove();
  return probe.errors;
}

async function run(page: Page, { steps, name: _name, ...subject }: Subject): Promise<Seen> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(setUp, subject);
  const { frames: mount } = await page.evaluate(apply, { step: null, reset: false });
  const seen: Seen['steps'] = [];
  for (const step of steps) {
    if (step.window) {
      // The window is the test's to resize: the change lands between frames, as a person's does.
      await page.evaluate(() => {
        (window as unknown as { probe: Probe }).probe.changed = 0;
      });
      await page.setViewportSize(step.window);
      seen.push(await page.evaluate(apply, { step: null, reset: false }));
    } else seen.push(await page.evaluate(apply, { step, reset: true }));
  }
  // The browser says what a frame left undelivered after that frame: one more task.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  const errors = await page.evaluate(tearDown);
  return { errors, mount, steps: seen };
}

test.describe('resize observer reports write no size', () => {
  for (const subject of SUBJECTS) {
    test(`${subject.name}: in a box of fixed size whose width, text, direction and zoom change, no frame leaves a change of size undelivered — the browser reports no "ResizeObserver loop" error`, async ({ page }) => {
      const spec = loadSpec(subject.tag.replace(/^tanrei-/, ''));
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => {
        if (/ResizeObserver/.test(error.message)) pageErrors.push(error.message);
      });
      await mountFixtures(page, spec, { fixtures: [], reducedMotion: true });
      const seen = await run(page, subject);
      test.info().annotations.push({ type: 'probe', description: JSON.stringify({ errors: seen.errors.length, pageErrors: pageErrors.length, mount: seen.mount, steps: seen.steps.map(({ frames, errors }) => `${frames}/${errors}`).join(' ') }) });
      expect(seen.errors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(seen.mount, 'the frames that changed what it draws from the first one it is drawn in').toBe(1);
    });
  }
});

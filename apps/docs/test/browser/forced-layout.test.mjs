// A docs page that is loading is not styled or laid out for a script before DOMContentLoaded: no read of the cascade
// or the layout — the page's own inline scripts, its modules, the components — makes the browser style or lay out the
// page there and then, before its frame would. A page is parsed before its modules run, and each module upgrades its
// elements in a task of its own, with a frame now and then between them: a read in a task, or in a frame after another
// script wrote, has the browser style and lay out the whole page for it. On the Arabic button page in WebKit, five
// such reads cost 0.13 to 0.8 s each before DOMContentLoaded (an app bar's scroll after the style queries' probe, a
// tab row after a description list's new rule, a figure after an app shell's lengths, a table in content the browser
// skips, the app bar's actions after the frame's writes), and the head's inline script laid the page out at
// DOMContentLoaded (0.8 s).
// What a script reads while the page loads is read in a frame's read phase, after its layout (the web package's
// src/primitives/read-phase.ts), from an observer's report of sizes, or after the first paint.
//
//   pnpm --filter @tanrei/docs build && node --test test/browser/forced-layout.test.mjs
//
// The passes are counted from a Chromium trace, as the web package's own test of a loading page counts them
// (packages/web/src/perf-budget.test.ts, `forcedPasses`, which this follows): the `UpdateLayoutTree` and `Layout`
// events that carry a script's stack, but the first of each kind in a frame's animation frame callbacks, which is that
// frame's own; those before the page's `MarkDOMContent`. Each is named by its script: the module its innermost frame
// stands in (a chunk of the build, `_astro/<name>.<hash>.js`), or the page itself for an inline script. Chromium only:
// the passes are the engines' own, and no other engine traces them for a test.
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** The Button page in Arabic (right to left, its text the costliest to lay out) and in English, and a long page: the Text field's, its gallery of fixtures. */
const PAGES = ['/ar/components/button/', '/components/button/', '/components/text-field/'];
const VIEWPORT = { width: 1280, height: 800 };

/**
 * The scripts that force nothing before DOMContentLoaded: the page's inline scripts (the icons' probes of the head,
 * the frame's code, the reader's day…), and the modules that read as a loading page upgrades — the style queries'
 * probe, the table, the figure, the app bar, the table of contents and the navigation drawer.
 */
const HELD = ['separation', 'table', 'figure', 'app-bar', 'table-of-contents', 'navigation-drawer'];

/**
 * Scripts that still force a pass while the page loads, and why: each is measured and reported, as a TODO rather than a
 * failure. A script that is in neither list fails the test: no other read may come to force the page's layout.
 */
const KNOWN = {
  'navigation-drawer:watchWidths': 'TODO: a responsive navigation drawer reads its system\'s two widths from its computed style as it is connected, so that its first render is in the presentation the window\'s width asks for; read in the first frame\'s read phase instead, an app shell laid out the frame of a compact window with the drawer beside the content, and the page shifted by 0.75 at 390 (test/browser/layout-shift.test.mjs). The widths would be read where no style is computed for them, or the first render would wait for them',
  example:'TODO: the docs\' one frame (lib/example.ts) places its frames after the first frame\'s layout from a resize observer\'s report of the root element; the web package\'s read phase reports first and writes, so the places are read after its writes when that frame is the one the module asked for',
  'description-list':'TODO: the description list measures its widest term by laying the list out in two columns (`data-measuring`) and reading it, in the writes of the read phase and in its observer\'s report; a measure that needs no change of the layout would read with the phase\'s reads',
  breadcrumbs: 'TODO: the breadcrumbs measure each level by laying the trail out unwrapped (`.measure`) and reading it, in the writes of the read phase; a measure that needs no change of the layout would read with the phase\'s reads',
  'group-item': 'TODO: a group item reads its container\'s computed size in its observer\'s report, after another observer\'s report wrote; the size the report gives is coarser on a zoomed page, so it is not used',
  'page-header': 'TODO: the page header reads whether its actions wrap in its observer\'s report, after another observer\'s report wrote',
  tabs: 'TODO: a row of tabs is first placed in the writes of the read phase, where it reads its tabs, writes their boxes and reads them again, then reads and writes where each row scrolls to; its first reading would be the phase\'s reads, and what follows from the boxes it writes would need a reading that does not change the layout',
  'text-input':'TODO: a text input reads its icon box\'s least width (its computed style) in its observer\'s report, after another observer\'s report wrote',
};

/** Frames to wait for after the load: what the page asked for in its last task before it, run to its end. */
const FRAMES = 4;

/**
 * The passes script forced, out of the trace's events (packages/web/src/perf-budget.test.ts, `forcedPasses`): the
 * `UpdateLayoutTree` and `Layout` events that carry a stack, but the first of each kind forced in a frame's animation
 * frame callbacks, which is the frame's own pass, made earlier. The callbacks of one frame run one after another in one
 * task; any event between two of them that is not inside either ends that frame's run.
 */
function forcedPasses(events) {
  const timed = events.filter((event) => event.ph === 'X').sort((a, b) => a.ts - b.ts);
  const forced = [];
  const threads = new Map();
  for (const event of timed) {
    const key = `${event.pid}:${event.tid}`;
    const thread = threads.get(key) ?? { callbackEnd: Number.NEGATIVE_INFINITY, own: null };
    threads.set(key, thread);
    const inCallback = event.ts <= thread.callbackEnd;
    if (event.name === 'FireAnimationFrame') {
      thread.own ??= new Set();
      thread.callbackEnd = event.ts + (event.dur ?? 0);
      continue;
    }
    if (!inCallback) thread.own = null;
    if ((event.name !== 'Layout' && event.name !== 'UpdateLayoutTree') || !event.args?.beginData?.stackTrace?.length) continue;
    if (inCallback && thread.own && !thread.own.has(event.name)) {
      thread.own.add(event.name);
      continue;
    }
    forced.push(event);
  }
  return forced;
}

/** The script a stack frame stands in: a module of the build by its name, the page for an inline script. */
const scriptOf = (frame, page) => {
  const url = frame.url ?? '';
  const chunk = url.match(/\/_astro\/([^/]+?)\.[\w-]{8}\.js$/);
  if (chunk) return chunk[1];
  return new URL(url, 'http://x').pathname === page ? 'the page' : url || '(no script)';
};

/** What a pass says: its kind, its duration and the four innermost frames of its stack. */
const said = (event) => `${event.name} ${((event.dur ?? 0) / 1000).toFixed(1)} ms < ${event.args.beginData.stackTrace.slice(0, 4).map((frame) => `${frame.functionName || '(anonymous)'}@${(frame.url ?? '').replace(/^https?:\/\/[^/]+/, '')}:${frame.lineNumber}:${frame.columnNumber ?? 0}`).join(' < ')}`;

let host;
let browser;
before(async () => {
  host = await serveDist(dist);
  browser = await launch('chromium');
});
after(async () => {
  await browser?.close();
  await host?.close();
});

/** Loads `page` in a page of its own, traced from before its navigation, and returns the passes forced before DOMContentLoaded. */
async function loadTraced(page) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  try {
    const tab = await context.newPage();
    // Nothing of the page before it is in the trace.
    await tab.goto('about:blank');
    const cdp = await context.newCDPSession(tab);
    const events = [];
    cdp.on('Tracing.dataCollected', ({ value }) => events.push(...value));
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.stack'] }, transferMode: 'ReportEvents' });
    await tab.goto(`${host.origin}${page}`, { waitUntil: 'load' });
    await tab.evaluate(
      (count) =>
        new Promise((resolve) => {
          const frame = (left) => requestAnimationFrame(() => setTimeout(() => (left > 1 ? frame(left - 1) : resolve())));
          frame(count);
        }),
      FRAMES,
    );
    const complete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    await complete;
    await cdp.detach();
    const parsed = events.find((event) => event.name === 'MarkDOMContent' && event.args?.data?.isMainFrame !== false);
    if (!parsed) throw new Error(`${page}: the trace has no MarkDOMContent event`);
    return forcedPasses(events).filter((event) => event.ts < parsed.ts);
  } finally {
    await context.close();
  }
}

describe('a loading docs page is styled and laid out by its frames, not for a script, before DOMContentLoaded (a Chromium trace)', () => {
  for (const page of PAGES) {
    test(`${page} at ${VIEWPORT.width}: no forced pass of the held scripts before DOMContentLoaded, and none of any script not known`, LIMIT, async (t) => {
      // Loaded once first: the run traced compiles nothing the first did not.
      await loadTraced(page);
      const forced = await loadTraced(page);
      const by = forced.map((event) => {
        const script = scriptOf(event.args.beginData.stackTrace[0], page);
        // A known pass of a held script is named by the function of that script its stack passes through.
        const named = event.args.beginData.stackTrace.filter((frame) => scriptOf(frame, page) === script).map((frame) => `${script}:${frame.functionName}`);
        const known = named.find((name) => name in KNOWN) ?? (script in KNOWN && !HELD.includes(script) ? script : null);
        return { event, script, known };
      });
      const lines = by.map(({ event, script }) => `${script}: ${said(event)}`);
      console.log(`forced-layout ${page}: ${forced.length} passes forced before DOMContentLoaded${lines.length ? `\n  ${lines.join('\n  ')}` : ''}`);
      const held = by.filter(({ script, known }) => !known && (script === 'the page' || HELD.includes(script)));
      assert.deepEqual(held.map(({ event, script }) => `${script}: ${said(event)}`), [], 'passes the held scripts forced');
      const unknown = by.filter(({ script, known }) => !known && script !== 'the page' && !HELD.includes(script));
      assert.deepEqual(unknown.map(({ event, script }) => `${script}: ${said(event)}`), [], 'passes forced by a script no list names');
      const known = [...new Set(by.map(({ known }) => known).filter(Boolean))];
      if (known.length) t.todo(known.map((name) => `${name}: ${KNOWN[name]}`).join('\n'));
    });
  }
});

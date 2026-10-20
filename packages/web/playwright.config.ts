import { defineConfig, devices, type Project } from '@playwright/test';
import { harsh, harshOptOuts } from './test/harsh.js';

/** Tests that compare against a recorded image are titled `snapshot: <fixture id>`. */
const BASELINES = /snapshot: /;

/**
 * Harsh mode (`TANREI_HARSH=1`, test/harsh.ts): this run's tsconfig puts test/harsh/ in place of @playwright/test, whose
 * fixtures wait around every input action in every engine and slow Chromium's motion (and, on request, its CPU). The
 * tests exempted by name, each with its reason, do not run; a test gets 4 times its time, an expect 3 times.
 */
const harshly = (project: Project): Project =>
  harsh
    ? {
        ...project,
        grepInvert: [...[project.grepInvert ?? []].flat(), harshOptOuts()],
      }
    : project;

export default defineConfig({
  ...(harsh ? { tsconfig: 'test/harsh/tsconfig.json', timeout: 120_000 } : {}),
  testDir: 'src',
  testMatch: '**/*.test.ts',
  // Baselines live at snapshots/<component>/<fixture-id>.png — the path the parity check expects.
  snapshotPathTemplate: 'snapshots/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flake is not a root cause, and a test that passes only on its retry still fails the run (failOnFlakyTests). On
  // CI the retry exists to record evidence: the retry of a failed test is traced.
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  // CI runs in shards: each writes a blob report (ci.yml uploads it, and the web-report job merges every shard's into
  // one HTML report), keeps the GitHub annotations, and logs every test.
  reporter: process.env.CI ? [['blob'], ['github'], ['list']] : 'list',
  // A missing baseline is a failure, not something to write silently. Record with `pnpm test:update`.
  updateSnapshots: 'none',
  expect: { ...(harsh ? { timeout: 15_000 } : {}), toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', scale: 'device' } },
  // On CI only a retry is traced (in the blob report, so in the merged HTML report): a trace of a harness page is large,
  // and tracing every attempt runs a shard out of disk and about doubles its time (measured: Chromium shards of 26–40
  // minutes took 56 to more than 60). A targeted run (ci.yml sets TANREI_TRACE=first-failure: a few tests, repeated)
  // traces every attempt and keeps the trace of each one that fails (retain-on-failure), the first attempt included —
  // without DOM snapshots: a snapshot per action made a test of ~1000 actions three times as long (Firefox, 4 CPUs:
  // 5–6 s untraced, 13–19 s traced, 5–7 s traced without snapshots), past its 30 s timeout on a runner.
  use: {
    deviceScaleFactor: 2,
    colorScheme: 'light',
    trace: !process.env.CI ? 'off' : process.env.TANREI_TRACE === 'first-failure' ? { mode: 'retain-on-failure', snapshots: false, screenshots: true, sources: true } : 'on-first-retry',
  },
  projects: [
    // Chromium runs everything, and is the only engine the pixel baselines are recorded and compared in.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 } },
    // Firefox and WebKit run every test that is not a baseline comparison. They are the browsers that take the
    // branches Chromium never needs: circular corners where \`corner-shape\` is missing, \`data-focus-style\` where
    // style container queries are missing — and they prove press-hold and the ripple outside one engine.
    { name: 'firefox', grepInvert: BASELINES, use: { ...devices['Desktop Firefox'], deviceScaleFactor: 2 } },
    { name: 'webkit', grepInvert: BASELINES, use: { ...devices['Desktop Safari'], deviceScaleFactor: 2 } },
    // Every current engine evaluates style container queries, so the path written for browsers without them —
    // `data-focus-style`, set by the element when focus arrives — would never run. Firefox can still be that
    // browser: the feature sits behind a preference. Only the tests about choices of kind run here.
    {
      name: 'firefox-no-style-queries',
      grep: /BSH-18|BTN-10|CHK-11|RAD-13|SWT-9|CRD-10|CRL-7|TXI-7|MAB-10|FBM-10|CHP-10|CAL-22|LST-10|MNU-17|MNU-35|MNU-38|TAB-10|TAB-49: where|TBV-22: where|DTM-31|SNK-7|SNK-30|TIP-26|SRC-21|NVB-10|NVD-10|SEG-11|SLD-15|BGR-2|SPB-11|TBV-10|LNK-10|LNK-27|LNK-33|CLO-19|TBL-9|COD-7|CPY-14|TBL-39|PNL-12|DSL-13|FIG-12|ACC-10|ACC-23|POP-15|POP-19|TOC-22|FLD-6|FGR-6|SEL-7|SEL-21|SEL-43|SEL-45|CMB-7|CMB-15|CMB-42|CMB-44|APS-6|APS-18|RGP-1:|NMI-15|CLI-7|CLI-23|BRC-20|BRC-30|TRV-30|FLD-24|FGR-24|SEL-62|CMB-60|NMI-44|TXI-52|FLD-25|RGP-19|CLF-47|LKC-20|SKL-12|SPB-30|PRG-17|MTR-4|ETI-11:|CCM-42: where the focus style|OTC-7 \(focus-style|MBR-7|MBR-8|MBR-32|FPK-4:|FPK-10|FPK-11|FIT-16|FIT-17|W13-7|OTF-7|IMP-26|IMP-27|CKG-1 twin|SEF-5|PGN-17|HDL-13 corner/,
      use: { ...devices['Desktop Firefox'], deviceScaleFactor: 2, launchOptions: { firefoxUserPrefs: { 'layout.css.style-queries.enabled': false } } },
    },
  ].map(harshly),
});

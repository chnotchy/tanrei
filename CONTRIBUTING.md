# Contributing to Tanrei

Tanrei is one design system on five platforms, so the rules are about keeping those five honest with each other. [`AGENTS.md`](AGENTS.md) is the short version and applies to people as much as to AI agents; this page is the long one. How the pieces fit: [`docs/architecture/overview.md`](docs/architecture/overview.md). Who decides what: [`docs/governance/GOVERNANCE.md`](docs/governance/GOVERNANCE.md).

## Outside contributions are not accepted

Every change to Tanrei is made by its maintainers. Pull requests from outside are not accepted, and neither are proposals for new components or tokens. The reason is the supply chain: Tanrei is code that runs inside other people's products, every change from outside is a way for code its maintainers did not write to reach them, and the current security climate makes that a risk the project does not take. What Tanrei covers, and how it changes, is the maintainers' decision.

- **Issues are for bug reports and questions.** [Open one](https://github.com/chnotchy/tanrei/issues) and say what you saw, where, and what you expected.
- **A pull request is closed unmerged**, whatever it contains.
- **Security problems** go privately, as [`SECURITY.md`](SECURITY.md) describes, never into an issue.

The rest of this page is how the maintainers make a change in this repository. It is public so that what each check guards, and why, can be read by anyone who uses Tanrei.

## Setup

- Node ≥ 22.12 and **pnpm 12** (`packageManager` is pinned; use Corepack or a recent pnpm, which switches automatically).
- Per platform, only what you work on: Xcode/Swift 6 · JDK 17 + Android SDK · Flutter ≥ 3.32 · nothing extra for Web/React Native.
- Optional but recommended: [`lefthook`](https://github.com/evilmartians/lefthook) (`lefthook install`) and [`gitleaks`](https://github.com/gitleaks/gitleaks).

```
pnpm install
pnpm check      # validate → generate → drift → build → test
```

### What `pnpm check` runs on a fresh clone

`pnpm check` checks what CI checks, and needs only Node and pnpm plus the browsers Playwright runs (`pnpm --filter @tanrei/web exec playwright install`): validate, generate (the tree stays clean), drift, the format check, then `pnpm build` and `pnpm test` over the token engine, the pipeline, the tools, the CLI, the MCP server, Theme Studio, the docs site, and the web and React packages. The platforms listed in [`packages/tools/paused-platforms.json`](packages/tools/paused-platforms.json) are left out of `pnpm build` and `pnpm test`, as CI leaves them out ([Native CI is paused](#native-ci-is-paused)); run one on its own with `pnpm --filter @tanrei/<platform> test`. Each native platform needs its own toolchain:

| Platform | Toolchain |
|---|---|
| SwiftUI | macOS with Xcode 26.6 (Swift 6); the gallery's UI tests and Dynamic Type need an iOS simulator |
| Compose | JDK 17 and the Android SDK; the accessibility and keyboard tests need an emulator (API 34) |
| Flutter | Flutter 3.32.8 (the goldens are recorded with it); run `flutter pub get` in `packages/flutter` before `dart format` |
| React Native | nothing beyond Node (Jest renders the trees) |

## How a change flows

The same steps apply to people and to AI agents. The checks named here are the ones CI runs.

### 1. Start from the source of truth

- Visual value changes → `tokens/` (colors: the palette declarations and role rules in `tokens/systems/<id>.system.json`).
- Anything about a component's surface or behaviour → `specs/<name>.spec.json`.
- A new component, or a breaking change to an existing one, is the maintainers' decision, made before the spec changes. A non-breaking addition to an existing spec needs no decision first.

Write behaviour as EARS sentences with stable ids (`BTN-7`). Tests cite those ids, so the requirement and its proof stay linked.

### 2. Validate and generate

```
pnpm validate     # spec schema + cross-references, token parsing, contrast invariants
pnpm generate     # token outputs, custom elements manifest, React wrappers, status matrix
```

A failing invariant is a design bug. Fix the token or the tone table; never the threshold.

### 3. Implement per platform

Use the platform's `AGENTS.md`. Bind every value to a generated token. Cite behaviour ids in tests. Record a baseline for every fixture. You do not have to implement all five platforms: a platform you cannot finish stays `planned` in the spec, and the status matrix shows it.

### 4. Prove it

```
pnpm drift        # parity + generated files up to date
                  # (rewrites what was stale; `pnpm drift --check` only reports — use it in a shared checkout)
pnpm build && pnpm test
```

`pnpm test` runs every package's `test` script after its build. The web package has two suites: `test` is Playwright, and `test:node` is Node's own runner for what has no page to run in (the links build helper, the manifest against the built elements); `pnpm test` runs `test:node` before it (`turbo.json`). The docs app has two as well: its `test` builds the site, and first runs `test:node` — Node's own runner over the Markdown passes and over every spec fixture's live markup — neither of which needs the site built.

Baselines change only when the visual change is the intended outcome of a spec/token change. Say why in the changeset.

#### Timing: harsh mode and the CI-like run

A web test that is green on a fast Mac can still fail on CI once in fifty runs: a runner shard is a busier, slower machine, and a test that reads a colour while its transition still runs, reads a 100 ms press-hold after a few round trips, or presses a box it measured while the box moved, only loses the race there. Two commands find those races before CI does; run both on the tests you touched before opening a pull request:

```
# Harsh mode: makes those races fail every time (on the Mac, any engine).
TANREI_HARSH=1 pnpm --filter @tanrei/web test src/components/<name> --grep-invert "snapshot: " --project=chromium --project=firefox --project=webkit

# As CI runs them: Linux, the Playwright image ci.yml pins, the runner's user, 2 workers, CI=1 (Docker needed).
pnpm --filter @tanrei/web test:ci-like src/components/<name> --grep-invert "snapshot: " --project=webkit
TANREI_HARSH=1 pnpm --filter @tanrei/web test:ci-like src/components/<name> --project=chromium   # both at once
```

- **Harsh mode** (`packages/web/test/harsh.ts`) waits 300 ms before and after every input action in every engine, and plays Chromium's animations and transitions at a fifth of their speed (CDP `Animation.setPlaybackRate`); CPU throttling is there on request (`TANREI_HARSH_CPU=4`), off by default because a slower page hides motion races instead of showing them. The page clock is untouched, so a test that holds it is unaffected. A test that is correct under real timing passes in harsh mode; a test that legitimately measures real time is exempted by name with its reason (`HARSH_OPT_OUTS`), never to make a race pass. The old versions of four tests CI caught flaking (BRC-16, MDL-9, SEL-60, TAB-45) fail in it every time in Chromium and their fixed versions pass (`harsh.ts` has the numbers).
- **The CI-like run** (`scripts/ci-like.sh`) copies the working tree into a new container without `.git` (uncommitted files included, the Mac's `node_modules` never), installs and builds the web package there, runs the given Playwright arguments, copies `test-results/` out when the run fails, and removes the container. `CI_LIKE_CPUS` (default 4, a runner's vCPUs) and `CI_LIKE_WORKERS` (default 2) set its budget. Measured against a CI run (211 Chromium tests of the breadcrumbs, badge, card and callout, CI's first Chromium shard): the container took 1.55 times CI's time per test (median 1.54, 10th–90th percentile 1.29–1.86) on a Mac whose load was about 9, against 1.25 for the same tests run natively on that Mac. So it is as slow as a runner or slower, never faster. What cannot match: the CPU architecture (Docker on Apple silicon runs arm64 Linux, a runner is x86_64: the same image, other builds of the browsers, so a `snapshot:` test may differ by a pixel here and says nothing), the Mac's own load, and GitHub's host.
- **Static guards** (`packages/web/test/timing-guards.test.mjs`, part of `test:node`) refuse the patterns that are always wrong: `document.getAnimations()` as a wait (it sees no shadow root), any other wait for motions or count of them outside `test/motions.ts` (an element's `getAnimations({ subtree: true })` does not enter its own shadow root either), `waitForTimeout(<number>)` with no reason in a comment, and `goto('about:blank')` in a file whose tests hover or move the pointer (Chromium on Linux then sends no `pointerleave`). Each has an allowlist of today's offenders by file, which only shrinks: a new offender fails, and so does one that was fixed and is still listed.

### 5. Record it

`pnpm changeset` — one version for all platforms. During the 0.x prereleases backward compatibility is not kept: a change may break anything, with no deprecation period first, and its changeset says what broke and what to use instead. Commit with Conventional Commits (`feat(web): …`, `fix(tokens): …`, `docs: …`). In the pull request, say what you noticed and did not fix, with what was seen and what would fix it.

## Adding a component

The shared conventions every component follows are in [`docs/architecture/overview.md`](docs/architecture/overview.md#component-conventions). The `add-component` skill in `.claude/skills/` walks an agent through the same steps.

1. **Inventory.** The name must exist in `specs/inventory.json`. Changing the inventory, like adding a component, is the maintainers' decision, made before the spec is written.
2. **Tokens.** Write `tokens/comp/<name>.tokens.json` (aliases only; container heights may be literals) and add it to the `comp` set in `tokens/tanrei.resolver.json`. Conditions that recolor every state (selected, error, …) are `dev.tanrei.states.variants`. A part whose disabled or pressed look differs from the fallback rules gets its own rule in every shipped system (`tokens/systems/*.system.json`).
3. **Spec.** `specs/<name>.spec.json`, every platform `planned`. Behaviour in EARS form with a stable id prefix (`CHK-1`…); a pressable component copies BTN-8, BTN-9 and BTN-10 for its own name. Fixtures cover each variant, each size and each non-default condition. Every prop and event is mapped for every platform in its idiom.
   - **Repeated items** (tabs, list and menu items, destinations) are item kinds under `items`, each with its own `props` (no `axis`), `slots` and `events`; a group kind that holds items says `"container": true`. Fixtures list their items in order (`items: [{ "kind", "props", "content" }]`, never a text grammar in `content`), selection stays the component's prop (by the item's `value`, else by index), and every platform maps every kind under `platforms.<p>.items.<kind>` (`name`, `props`, `events`) — the parity check looks for those names in the implementation file.
4. `pnpm validate && pnpm generate`. Fix invariant failures in the tokens, never in the thresholds.
5. **Each platform**, at the paths in `packages/tools/src/conventions.js`: the implementation (built on the platform's shared primitives — focus ring, press and ripple, target, elevation, corner shape, icon), tests citing every behaviour id, accessibility checks, one baseline per fixture in the default system and one representative fixture per shipped preset, one registration line in the platform's gallery (the galleries read every spec's fixtures), and the component's section in the platform's notes (the web's are `packages/web/IMPLEMENTATION.md`, the others' each package's `README.md`). Then that platform's status becomes `alpha`.
6. **Docs.** `apps/docs/src/content/docs/components/<name>.mdx` and the translations (Overview, Specs, Guidelines, Accessibility; tables come from the spec). The sidebar lists every component that has a page by itself.
7. **Figma.** A page named after the component; a component set with every axis value × state, every paint and size bound to `tanrei/comp` and `tanrei/comp.color` variables, text to text styles, icons as instance swaps (`design/figma/README.md`).
8. `pnpm check`, and a changeset.

Status meanings: `alpha` implemented + tested, API may change · `beta` API frozen pending feedback · `stable` covered by semver · `deprecated` scheduled for removal · `lagging` an implementation exists but has not caught up with the current spec · `planned` nothing shippable yet.

## CI

### What runs when

On a pull request and on a push to `main`, CI (`.github/workflows/ci.yml`) runs only the jobs the changed paths can affect; its `changes` job decides, with `dorny/paths-filter` over `git diff` against the pull request's base, or against the commit `main` was at before the push (the first push of a branch has no such commit, and a force push may have dropped it: either way the push runs every job). A dispatched run (`workflow_dispatch`, which the Record baselines workflow sends) and a release (`workflow_call`) run every job that is not paused (see [Native CI is paused](#native-ci-is-paused)) — except a dispatch given a `grep`, which is a [targeted run](#a-targeted-run). The full run before anything is published is the release's.

**The web runs what a change can affect** (`packages/tools/src/affected.js`). The changes job traces the changed paths to components — a component's directory, spec, comp tokens or baselines, a component drawn by a stylesheet — and widens them to the components built from or using them (`builtFrom`, `uses`) and to every module and test of `packages/web/src` and `packages/web/test` that imports what changed. A change to a component's own tests or baselines alone selects that component and nothing more. The web job then runs those tests: **on a pull request in Chromium alone, on a push to `main` in all three engines**, in as many shards as the selection needs. A change it cannot trace — the Playwright config, a generator, a token below comp, the lockfile — runs every test (on a pull request every Chromium test). A change to `ci.yml` alone runs one component's tests, to show the jobs still start. Firefox and WebKit therefore first see a change on `main`; dispatch CI on a branch (`gh workflow run ci.yml --ref <branch>`) to run everything before a merge that warrants it. `node packages/tools/src/affected.js <base>` prints what a branch selects.

**Shared inputs** feed every platform, so a change to any of them runs everything: `tokens/`, `specs/`, `tanrei.config.json`, `packages/token-engine/`, `packages/tokens-build/`, `packages/tools/`, `scripts/`, `patches/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.github/workflows/ci.yml`.

| Job | Runs on a pull request when these change (besides the shared inputs) |
|---|---|
| Validate · generate · drift | always |
| Changeset: a change to a released package (outside its tests and baselines) adds or edits a `.changeset/*.md` (`pnpm changeset`, or `pnpm changeset --empty` when nothing is released) | always, on a pull request only |
| Workflow audit (zizmor): any finding in `.github/` fails it — template injection, a checkout that keeps its credentials, cache poisoning, an unpinned action, a dangerous trigger, excessive permissions. An intended finding is silenced on its line with `# zizmor: ignore[<audit>]` and the reason, never in a configuration file. Locally: `uvx zizmor@<the version in ci.yml> .` | `.github/` only (none of the other shared inputs) |
| Core tests · token engine and repo tools, · pipeline | only the shared inputs |
| Core tests · CLI | `packages/cli/`, `packages/studio/`, `packages/web/`, `packages/react/` |
| Core tests · MCP server | `packages/mcp/` |
| Core tests · Theme Studio | `packages/studio/`, `packages/web/`, `packages/react/` |
| Web (in shards: the selection above) and the merged Playwright report; its first Chromium shard also runs the web package's Node tests (`test:node`) and the React bindings' tests | `packages/web/`, `packages/react/` |
| Docs · build, the built site's check, then the docs app's Node tests (and the Deploy docs preview) | the web paths, `apps/docs/`, `packages/studio/`, `design/`, `docs/status/` |
| SwiftUI (build, Dynamic Type, gallery shards) — macOS | `packages/swiftui/`, `Package.swift`, `Package.resolved` |
| Flutter | `packages/flutter/` |
| Compose, and Compose on an emulator | `packages/compose/` |
| React Native | `packages/react-native/` |

**CI result** is the one check to require: it fails unless every job that should have run succeeded; a job may be skipped only when its paths did not change.

The docs site is deployed by its own workflow (`.github/workflows/deploy-docs.yml`, outside ci.yml so that a release never deploys it): a pull request gets a preview and a push to `main` deploys production, when the Docs row's paths change. `gh workflow run deploy-docs.yml --ref main` deploys by hand — for a site that is behind, or after a change outside those paths.

Known vulnerabilities in the locked dependencies are checked by their own workflow (`.github/workflows/osv-scanner.yml`, OSV-Scanner). A pull request that changes `pnpm-lock.yaml` is scanned on its base and on its head, and fails only on a vulnerability it brings in; a draft is held, as in CI. Every Monday (and on `gh workflow run osv-scanner.yml --ref main`) `main` is scanned whole: that run does not fail, and its findings go to the repository's Security tab (Code scanning), where what is already locked is dealt with.

Runner images are pinned (`ubuntu-24.04`, `macos-26` with `XCODE_VERSION`), and the web runs in the Playwright image pinned to the lockfile: a baseline depends on the renderer, so a runner image or toolchain moves only on purpose — bump it in ci.yml and record-baselines.yml together, then re-record.

### Native CI is paused

The jobs of the four native platforms are **paused** until each platform catches up with the web: SwiftUI (`swiftui`, `swiftui-dynamic-type`, `swiftui-gallery`), Compose (`compose`, `compose-instrumented`), Flutter (`flutter`) and React Native (`react-native`). They are skipped in every kind of run — a pull request, `main`, a dispatched run, a release — and **CI result** passes without them. Validate (drift and parity included), the core suites (the pipeline's emitters of native token code among them), the web, the docs and the tools are not paused, and nothing else ever is.

- **The switch** is one file, [`packages/tools/paused-platforms.json`](packages/tools/paused-platforms.json): the names of the paused platforms. CI's changes job reads it, and so do the root `pnpm build`, `pnpm test` and `pnpm check` (`scripts/run-unpaused.mjs`), so a fresh clone checks what CI checks. Every run that pauses something says so in a notice.
- **A green run says nothing about a paused platform.** Whoever changes a native's code runs that platform's suite on their own machine and says what it showed.
- **A paused platform's status is not raised and nothing of it is published** (`release.yml` refuses).
- **It ends per platform**, in the commit that brings the platform up to the current specs: that commit takes the platform's name out of `paused-platforms.json`, and the platform's rules out of `renovate.json` (see [Dependency updates](#dependency-updates)).

### A draft is held

A pull request that is a **draft** runs nothing: the CI run is skipped whole and costs no minutes. While a draft is held:

- the pull request shows **no check at all**, so nothing unverified reads as green — and nothing reads as verified;
- what Validate would have run is run on the machine that pushes: the pre-push hook runs the drift and parity checks, and `pnpm validate` is run before a commit of sources of truth;
- marking the pull request **ready for review** starts the full run at once, without a push;
- the label **`ci:run`** on the draft runs it as if it were ready, from the next push (with `ci:web-only` beside it, the web, docs and core suites only). Take the label off again when the run has told you what you wanted.

Run the suites on your own machine while the draft is held (`pnpm test`, or one package's); the hold moves the cost, it does not waive the proof.

### Web-only iteration

To iterate on a web component against the docs preview without paying for the other platforms on every push, put the label **`ci:web-only`** on the pull request. While it is set:

- the pull request runs `validate`, the web and docs jobs (and the core suites its changes affect); Flutter, Compose, React Native and SwiftUI are skipped, whatever changed;
- the docs preview deploys as usual;
- **CI result fails on purpose**, so the pull request cannot merge with platforms nobody checked.

The label is read when a run starts; adding or removing it does not start a run by itself — push, or **Re-run all jobs**. It never applies to `main`, a dispatched run or a release. A change to `specs/` or `tokens/` still fails `validate` (spec ↔ implementation parity) until every platform that claims a status implements it — the label does not bypass that.

### A targeted run

When CI fails on a few web tests, show that the fix holds on CI's own machines before running everything again: dispatch CI on the branch with a Playwright pattern, a repeat count and the engines to run in.

```
gh workflow run ci.yml --ref <branch> -f grep='CMB-45' -f repeat=30 -f engines=webkit
```

- **`grep`** is passed to `playwright test --grep`: it matches each test's file and titles (a behaviour id such as `CMB-45`, a component's file name, or several joined with `|`). Empty, the dispatch is the full run.
- **`repeat`** (default 1) runs each matching test that many times (`--repeat-each`).
- **`engines`** is a comma list of `chromium`, `firefox` and `webkit` (`firefox` includes `firefox-no-style-queries`); empty, all three. An engine the pattern matches nothing in runs no shard (Firefox and WebKit run no `snapshot:` test).

The run is the web job alone, as CI runs it — the same Playwright image, `CI=1`, the same workers and retries — in as few shards as it needs: the changes job counts the matching tests per engine and gives each engine one shard per about 400 test runs (matches × `repeat`), at most the full run's 8, 6 and 8. Validate runs first, as always; the core suites, the web package's Node tests, the React bindings, the docs and the native platforms do not run, since no Playwright pattern reaches them. `repeat` or `engines` without `grep` is refused, and so is a pattern that matches no test.

**A targeted run never stands for the full run.** It is named `CI targeted · <grep> · ×<repeat> · <engines>`, its web jobs `Web · targeted (…)`, and its result check `CI result (targeted)` — never `CI result`, the check a branch requires. It has a concurrency group of its own, so it neither cancels nor is cancelled by the full run on the same branch. When it is green, run the whole CI again (`gh workflow run ci.yml --ref <branch>`, no inputs): only that run's **CI result** says the branch is green.

**A targeted run keeps a failure's trace from its first attempt.** It sets `TANREI_TRACE=first-failure`, and Playwright then traces every attempt and keeps the trace of each one that fails (`trace: 'retain-on-failure'` in `packages/web/playwright.config.ts`; retries unchanged), so a flake that passes on its retry still leaves the failing attempt's trace. Every other run traces only a retry (`on-first-retry`): tracing every test about doubles a shard's time (measured on Chromium's eight shards: 26–40 minutes became 56 to more than 60, the job's timeout), which a targeted run of a few tests can afford and the full run cannot. In any run, a web shard that fails uploads its `test-results/` — only failed tests leave anything there — as the artifact `test-results-<engine>-<shard>`, kept 7 days; the same traces are in the merged Playwright report. Open one with `pnpm --filter @tanrei/web exec playwright show-trace <trace.zip>`.

### Recording baselines

A baseline is verified on the machine it was recorded on, and CI is that machine:

| Platform | Recorded and verified on | Baselines |
|---|---|---|
| web (Chromium) | Linux, in `mcr.microsoft.com/playwright:v<the lockfile's Playwright>-noble` | `packages/web/snapshots/` |
| Flutter | Linux (`ubuntu-24.04`), Flutter 3.32.8 | `packages/flutter/test/components/goldens/` |
| Compose | Linux (`ubuntu-24.04`), JDK 17, Robolectric native graphics | `packages/compose/tanrei/src/test/snapshots/` |
| React Native | anywhere (render trees, JSON) | `packages/react-native/src/components/__tests__/__snapshots__/` |
| SwiftUI | macOS (`macos-26`, Xcode 26.6 — `XCODE_VERSION` in ci.yml) | `packages/swiftui/Tests/TanreiTests/__Snapshots__/` |

An image recorded on a developer's Mac does not match what Linux CI renders (web, Flutter, Compose). Record with the **Record baselines** workflow (`.github/workflows/record-baselines.yml`), dispatched on the branch that needs them:

```sh
gh workflow run record-baselines.yml --ref <branch> \
  -f platforms=web \
  -f reason="<what changed and why>" \
  -f filter=button-group,toolbar     # optional: spec names; empty records every baseline
  # -f start_ci=true                 # optional: start a three-engine CI run on the branch afterwards
```

It runs each platform's record command on CI's own runner with `TANREI_SNAPSHOT_REASON` set to the reason, and commits only the changed files under the baseline directories above to the branch — one commit per platform, `test(<platform>): record baselines — <reason>`. It refuses the default branch. While native CI is paused its default is the web alone. Then:

1. **CI does not start by itself.** A branch's three-engine run comes with the merge train it joins: up to about eight pull requests whose Chromium runs are green are merged on one `train/<n>` branch, CI runs there once in all three engines, and each pull request then merges on its own. A run per recording (about 38 jobs) would fill the account's runners for everyone. Set `start_ci=true` to start one on the branch anyway. The pull request's own runs queued by the bot's push wait for approval; do not approve them.
2. **Look at every image** in the commits (the pull request's file view shows them) — a baseline is evidence.
3. Repeat the reason in the changeset.

To record locally the same way, in a separate clone (the container installs Linux `node_modules`): web — `docker run --rm -it --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v<version>-noble`, then inside `corepack enable pnpm && pnpm install && pnpm --filter @tanrei/web build` and the record command in `packages/web/IMPLEMENTATION.md` ("Tests"); Flutter and Compose — a Linux machine or VM with the versions above.

### Dependency updates

Renovate (the GitHub App) opens the dependency updates, as `renovate.json` says:

- **Once a week, grouped**: on Monday (Asia/Tokyo), one pull request for the npm packages' minor and patch updates (pnpm catalog entries and the `packageManager` field included), one for the fonts, and one for the GitHub Actions, which stay pinned to a commit SHA with the version in a comment.
- **Three days after a release**: Renovate raises a version only once it has been on the registry for three days, the age `minimumReleaseAge` in `pnpm-workspace.yaml` requires of every install (the lockfile Renovate writes included). A fix for a known vulnerability (from GitHub's Dependabot alerts) skips Renovate's schedule and wait, but not pnpm's: a fix younger than three days goes in `minimumReleaseAgeExclude` as `name@version`, on its branch.
- **Approved on the Dependency Dashboard** (an issue Renovate keeps open) before Renovate opens anything: a major update; Playwright, because its browsers draw the baselines — its npm packages and the image in `ci.yml` and `record-baselines.yml` move in one pull request, and the baselines are re-recorded on it; and `@terrazzo/parser`, whose patch in `patches/` has to be made again for a new version.
- **Left alone**: the paused native platforms (Gradle, SwiftPM and pub, React Native's npm packages, and the actions, JDK and Flutter versions only their CI jobs use), since no CI job would test the update; and the runner images, which move only on purpose (see [What runs when](#what-runs-when)).

**An update opens as a draft**, so it is held like any draft ([A draft is held](#a-draft-is-held)): neither CI nor the docs preview deploy runs on it, so nothing installs the lockfile Renovate wrote in a job that holds the Cloudflare token until someone has read it. To take one in:

1. Read what it changes (Renovate's description links each package's release notes).
2. If it changes a released package's manifest, push a changeset to its branch (`pnpm changeset`, or `pnpm changeset --empty`): the Changeset job requires one. Once anyone else pushes to a Renovate branch, Renovate stops updating it until it is asked to rebase (the checkbox in the pull request's description).
3. Mark it **ready for review**: the full run starts, and the docs preview deploys.

## What blocks you, by design

| You tried to… | Blocked by |
|---|---|
| edit a generated file | Claude Code hook, drift check |
| mark a platform `alpha` without tests/baselines/docs | parity check |
| add an implementation but leave the spec `planned` | parity check |
| commit with `--no-verify`, publish, or change a repository's visibility | Claude Code hook (and these are maintainers' decisions) |
| update baselines silently | hook requires `TANREI_SNAPSHOT_REASON` |
| lower contrast below the floor in any of six schemes | token invariants |

## Ground rules

- No hardcoded design values in components; no hand-edits to generated files.
- Accessibility thresholds are floors. If a check fails, the design changes, not the threshold.
- All prose is original. Write your own text, and copy no text or assets from anywhere.
- Conventional Commits; one changeset per user-visible change.

Tanrei is licensed under Apache-2.0 ([`LICENSE`](LICENSE)).

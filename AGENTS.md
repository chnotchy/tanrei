# Tanrei — agent & contributor rules

Tanrei is one design system shipped to five platforms (Web Components, SwiftUI, Jetpack Compose, Flutter, React Native). These rules apply to humans and AI agents alike. Nested `AGENTS.md` files add local rules; the nearest one wins on conflict, but none may weaken this file.

## The two sources of truth

1. `tokens/` — design tokens, DTCG 2025.10 (`*.tokens.json`, `*.resolver.json`).
2. `specs/` — platform-neutral component specs (`*.spec.json`, validated by `specs/component.schema.json`).

Everything else is **derived**: generated token outputs, platform implementations, docs tables, the status matrix. If a derived thing disagrees with a source of truth, the derived thing is wrong.

## Hard rules

- **Spec first.** Never change a component's public surface (props, events, states, slots, a11y semantics, token bindings) in a platform package without the same change in `specs/` in the same commit. A new component, or a breaking change to one, is the maintainers' decision: open an issue before writing it.
- **Never hand-edit generated files.** Anything under a `generated/` directory, `custom-elements.json`, and `docs/status/` is produced by `pnpm generate`. Edit the source or the generator instead.
- **No hardcoded design values in components.** Colors, radii, type, spacing, motion, and opacity come from `tanrei.comp.*` / `tanrei.sys.*` tokens. Component tokens alias system tokens; the only literals allowed are a component's own container heights (the invariant check enforces exactly this).
- **Names come from `tanrei.config.json`.** Do not hardcode the namespace, npm scope, or tag prefix anywhere a generator could supply it.
- **Do not update snapshot baselines to make a test pass.** A snapshot diff is a finding. Update baselines only when the visual change is the intended result of a spec/token change, and say so in the changeset.
- **Do not bypass checks.** No `--no-verify`, no disabling CI jobs. The one standing exception is the maintainers': the native platforms' CI jobs are paused until each platform catches up with the web (one switch, `packages/tools/paused-platforms.json`, read by CI and by the root `pnpm build`, `pnpm test` and `pnpm check`; see CONTRIBUTING.md) — nothing else is paused, and a paused platform is neither published nor raised in status. Accessibility thresholds are constants in code: never edit them, and never turn an error for the default `tanrei` system into a warning. (Product layers report violations as warnings by design. Imitation presets are held to fidelity to their original, not to Tanrei's accessibility criteria, in every contrast scheme; a functional failure is a bug in any system.)
- **The core vocabulary is decided by the one-product test**: a core token exists because one product may need that distinction — not because one design system has it, and not because a component happens to use it today. Never grow the core for one design system's sake. **A layer extends the vocabulary instead**: under `vocabulary`, with a `rationale`, additive only — a step in a series, a value on a component axis, or tokens in the layer's own namespace. A shipped preset extends only with evidence in its fidelity map.
- **Say what you leave undone.** What you notice and do not fix goes into your report or pull request description, with what was seen (a path, a command, a number) and what would fix it. A `TODO` in source says in words what is missing.
- **Never publish.** Releasing to npm / pub.dev / Maven Central, pushing a release tag, or changing a repository's visibility is a maintainer's decision.
- **No backward compatibility during the 0.x prereleases.** Rename, remove and change freely, everywhere at once: no deprecated alias, shim, fallback for an old name or shape, or token kept for an implementation that has not caught up. Compatibility code you find is removed, not extended. The changeset says what broke.
- **Every user-visible change needs a changeset** (`pnpm changeset`). All packages version in lockstep.

## Definition of parity

Parity means: same tokens, equivalent visual result, same states, same accessibility semantics. It does **not** mean identical API — each platform uses its own idioms, and the mapping lives in the spec's `platforms` block.

## Workflow

1. Write or update the spec (and tokens if needed). Behaviour is written in EARS form (`WHEN <trigger> THE <component> SHALL <response>`).
2. `pnpm validate` — schemas, token lint, contrast invariants.
3. `pnpm generate` — token outputs, scaffolds, status matrix.
4. Implement on each platform listed in the spec, with tests (unit + snapshot + a11y).
5. `pnpm check` — must be green, including the drift check.
6. Add a changeset. Commit using Conventional Commits (`feat(web): …`, `fix(tokens): …`, `docs: …`).

If you cannot finish a platform, leave its status as it truly is. The status matrix is generated from the repository; it must never claim more than exists. See [CONTRIBUTING.md](CONTRIBUTING.md) for the details (what CI runs when, recording baselines, adding a component).

## Where things live

| Path | What | Editable by hand? |
|---|---|---|
| `tokens/`, `specs/` | Sources of truth | yes (spec-first workflow) |
| `packages/tokens-build/` | Token pipeline and generators | yes |
| `packages/tools/` | Validation, drift, status, scaffolding CLIs | yes |
| `packages/{web,react,swiftui,compose,flutter,react-native}/` | Platform implementations | yes, except `generated/` |
| `apps/docs/` | Documentation site (Astro Starlight, six languages) | yes, except generated content |
| `docs/` | Architecture, governance, the registries the checks read; `docs/status/` is generated | yes, except `docs/status/` |
| `design/` | Hand-off to design tools (resolved tokens, the Figma library's conventions) and the brand marks | the READMEs, `figma/renames.json` and `brand/figma.json`; the marks are pulled from Figma (`pnpm brand:pull`); the rest is generated |

## Commands

```
pnpm install
pnpm validate      # schema + lint + invariants
pnpm generate      # regenerate all derived files
pnpm drift         # fail if generated files differ from committed ones, or specs/implementations disagree
                   # it runs the generators, so a stale file is rewritten; `pnpm drift --check` reports the same and leaves the tree as it was
pnpm build && pnpm test   # three suites at a time: each one starts its own workers (Jest, Playwright, Gradle, Flutter, Swift), and
                          # tests that watch a 100 ms hold or a 40 ms transition cannot see it on an oversubscribed machine
pnpm check         # all of the above, in order
pnpm status        # print the component × platform status matrix
pnpm brand:pull    # refresh the brand marks from Figma (design/brand/README.md), then regenerate what is derived from them
```

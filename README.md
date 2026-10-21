<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/brand/generated/wordmark.dark.svg">
    <img src="design/brand/generated/wordmark.light.svg" alt="Tanrei" width="180" height="60">
  </picture>
</h1>

**One design system, five platforms, kept honest by machines.**

Tanrei (端麗 — "clean, well-formed") is an open-source, platform-neutral design system. It is not tied to an operating system or a vendor: the same tokens and the same component specs ship to the web (CSS custom properties and Web Components built with Lit, with generated React bindings), SwiftUI, Jetpack Compose, Flutter (widgets, no Material dependency) and React Native (pure TypeScript, the New Architecture).

**Documentation: <https://tanrei.chnotchy.com>** — guides for each platform, the foundations, the token reference and every component, in six languages.

## Install

```sh
npm install @tanrei/web            # the tokens as CSS custom properties, and the Web Components
npm install @tanrei/react          # React bindings for the same elements, beside @tanrei/web
```

```js
import '@tanrei/web/tokens.css';   // the default system's tokens, once, as early as possible
import '@tanrei/web';              // every element; or one at a time: '@tanrei/web/components/button'
```

```html
<tanrei-button variant="filled">Deploy</tanrei-button>
```

Without a bundler, serve the package's `dist/` and link `dist/tokens.css` and `dist/tanrei.bundle.js` (Lit and every element in one module). Each platform's [getting-started guide](https://tanrei.chnotchy.com/getting-started/) goes further: the presets, dark mode and contrast, your product's words, fonts and icons.

To build **your own design system** on Tanrei's vocabulary — one layer file in, tokens and code for every platform out — see [Your own design system](https://tanrei.chnotchy.com/getting-started/your-design-system/): `@tanrei/cli` (`npx tanrei init`, `tanrei build`), Theme Studio and the `@tanrei/mcp` server for AI agents.

## Status

<!-- tanrei:status -->
<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->
> **Prerelease.** `0.1.0-next.0` is published under the npm dist-tag `next`: until `0.1.0`, install `@tanrei/web@next`. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no deprecation period first, and its changeset says what broke.

| Platform | Package | Components |
|---|---|---|
| Web Components | `@tanrei/web` · `@tanrei/react` (npm) | 10 alpha · 84 lagging |
| SwiftUI (paused) | `Tanrei` (Swift Package Manager) | 29 lagging · 65 planned |
| Jetpack Compose (paused) | `io.github.chnotchy:tanrei` (Maven) | 29 lagging · 65 planned |
| Flutter (paused) | `tanrei` (pub.dev) | 29 lagging · 65 planned |
| React Native (paused) | `@tanrei/react-native` (npm) | 29 lagging · 65 planned |

*alpha*: implemented and tested; the API may change · *lagging*: an implementation exists but has not caught up with the current spec · *planned*: nothing shippable yet. The [component status matrix](docs/status/STATUS.md) has every component on every platform; it is computed from the repository and cannot claim more than is there.

**Paused:** SwiftUI, Jetpack Compose, Flutter and React Native — not built by CI and not published until each catches up with the specs.

<!-- /tanrei:status -->

## What it is

- **The structure is tiers of tokens, and most values are generated**: token tiers (`ref` → `sys` → `comp`, with numeric dials underneath), color roles with guaranteed `on-*` pairings, generated tonal palettes, light/dark × three contrast levels, state layers, a typescale, a shape scale, elevation levels, spring motion, 48/44 minimum targets.
- **The look is its own**: near-monochrome surfaces, 1px hairlines, ring-plus-soft-shadow elevation instead of tint, 6px controls, large light tightly-tracked display type, a monochrome primary and a single accent reserved for links, focus and selection.
- **Text styles are named by level**: sixteen roles — `display`, `heading-1`…`heading-6` (h1–h6), `body-large` / `body` / `body-small` (lead, p, small), `label` / `label-small` / `caption`, `code` / `code-small`, `eyebrow` — and emphasis is a weight step per family that every platform's text API takes as `emphasized`, not a second set of roles. Corner smoothing is an amount, 0–1 with Figma's meaning (0.6 = the iOS corner), and the web, Compose and Flutter draw the same curve for it.
- **Values are derived, and a design system is a layer**: seven dials sit under every size, distance, radius and duration, so one change propagates to five platforms in one commit. A design system is a small JSON file that extends another — it changes values, declares palettes, picks among a few choices of kind (ripple or dim; ring or glow) and, where it must, extends the vocabulary. Three presets ship next to the default as proof and as starting points: `m3-like`, `m3-expressive-like` and `cupertino`. How exactly a preset matches its reference is measured, not claimed.
- **Accessibility is enforced, not recommended**: every color pair in all six schemes is contrast-checked on each build; functional boundaries must reach 3:1; keyboard focus is always visible; hit areas meet the minimum even when the control looks smaller. The thresholds are constants. In the default system a violation fails the build; in a product's layer it is a warning that is printed and written into the generated files. An imitation preset is held to fidelity to the system it imitates instead, in every contrast scheme: Tanrei's criteria do not apply to it, and what the ruler measures there is information, not a warning. A functional failure fails in every system.

Tanrei is an independent project. Third-party notices: [NOTICE](NOTICE).

## How it stays consistent

```
tokens/  ─┐                       ┌─► CSS · TypeScript · Swift · Kotlin · Dart · DTCG for design tools
          ├─► generators ─────────┤
specs/   ─┘   (committed output)  └─► status matrix · docs tables · React bindings
                    ▲
        validate · parity · drift · snapshot + a11y tests  (local hooks and CI)
```

Only `tokens/` (DTCG 2025.10, including the layer file of each shipped design system) and `specs/` (schema-validated component contracts) are authored. Everything else is generated — token code once per design system — or checked against them, so documentation, specs and five implementations cannot silently drift apart — including when the work is done by AI agents. Start with [`AGENTS.md`](AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md), then [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Working in this repository

```bash
pnpm install          # pnpm 12 (pinned via packageManager); Node ≥ 22.12
pnpm check            # validate → generate → drift → build → test
pnpm status           # component × platform matrix
pnpm docs:dev         # documentation site (Astro Starlight, six languages)
```

Platform toolchains are only needed for the platform you touch: Xcode/Swift 6 (`swift test` from the repo root), JDK 17 + Android SDK (`packages/compose/gradlew`), Flutter ≥ 3.32 (`flutter test` in `packages/flutter`).

## Repository map

| Path | Contents |
|---|---|
| `tokens/`, `specs/`, `tanrei.config.json` | Sources of truth. `tokens/systems/` holds the design systems as layer files: the default `tanrei` and the presets `m3-like`, `m3-expressive-like`, `cupertino`; `tokens/fidelity/` holds the maps a preset is measured against |
| `packages/token-engine` | The isomorphic engine: palettes, derive rules, layers, vocabulary extensions, legal operations |
| `packages/tokens-build`, `packages/tools` | Token pipeline and the five emitters; validation, parity, drift, status |
| `packages/web`, `react`, `swiftui`, `compose`, `flutter`, `react-native` | Platform implementations |
| `packages/cli` | `@tanrei/cli` — `tanrei init · build · validate · explain · systems · studio`: build a product's own design system from one layer file |
| `packages/mcp` | `@tanrei/mcp` — a read-only Model Context Protocol server, so agents can query a design system and validate an edit |
| `packages/studio` | `@tanrei/studio` — Theme Studio, a visual editor over the same layer file; hosted by the docs site and served locally by `tanrei studio` |
| `apps/docs` | Documentation site |
| `design/` | Hand-off to Figma and other tools: generated, resolved DTCG per design system, and instructions |
| `docs/` | [Architecture](docs/architecture/overview.md), [governance](docs/governance/GOVERNANCE.md), the registries the checks read, generated [status](docs/status/STATUS.md) |
| `.claude/` | Agent guard-rail hooks, skills and per-platform subagents |

## Issues · License

Tanrei does not accept outside contributions: the maintainers make every change, for the supply chain's sake ([CONTRIBUTING.md](CONTRIBUTING.md#outside-contributions-are-not-accepted) says why). [Issues](https://github.com/chnotchy/tanrei/issues) are for bug reports and questions. See also the [governance](docs/governance/GOVERNANCE.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go privately: [SECURITY.md](SECURITY.md).

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

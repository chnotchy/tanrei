<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/brand/generated/wordmark.dark.svg">
    <img src="design/brand/generated/wordmark.light.svg" alt="Tanrei" width="180" height="60">
  </picture>
</h1>

**One design system, five platforms, kept honest by machines.**

Tanrei (端麗 — "clean, well-formed") is an open-source, platform-neutral design system. It is not tied to an operating system or a vendor: the same tokens and the same component specs ship to

| Platform | Package | Technology |
|---|---|---|
| Web | `@tanrei/web` · `@tanrei/react` | CSS custom properties, Web Components (Lit), generated React bindings |
| Apple | `Tanrei` (SwiftPM) | SwiftUI |
| Android | `io.github.chnotchy:tanrei` | Jetpack Compose |
| Flutter | `tanrei` (pub.dev) | Widgets, no Material dependency |
| React Native | `@tanrei/react-native` | Pure TypeScript, New Architecture |

> **Status: pre-release.** Nothing has been released and no package is on a registry yet; the APIs can change before the first release. What exists today is always stated by the generated [component status matrix](docs/status/STATUS.md) — it is computed from the repository and cannot claim more than is there. Every component is still marked *lagging*: no implementation has caught up with the current specs yet. The web and React packages build from source; the four native platforms (SwiftUI, Compose, Flutter, React Native) do not build yet, and their CI is paused until they catch up.

**Documentation: <https://tanrei.chnotchy.com>** — guides for each platform, the foundations, the token reference and every component, in six languages.

## Try it

Until the first release, build the web packages from source (Git, Node ≥ 22.12, pnpm 12 — `corepack enable` picks the pinned version):

```bash
git clone https://github.com/chnotchy/tanrei.git && cd tanrei
pnpm install
pnpm --filter @tanrei/web --filter @tanrei/react build
pnpm --filter @tanrei/web --filter @tanrei/react pack --pack-destination ../tanrei-packages
# then, in your project:
npm install path/to/tanrei-packages/tanrei-web-*.tgz      # add tanrei-react-*.tgz for the React wrappers
```

```html
<link rel="stylesheet" href="/node_modules/@tanrei/web/dist/tokens.css" />
<script type="module" src="/node_modules/@tanrei/web/dist/tanrei.bundle.js"></script>
<tanrei-button variant="filled">Deploy</tanrei-button>
```

Each platform's [getting-started guide](https://tanrei.chnotchy.com/getting-started/) shows the same from-source path, and the registry install that will work after the first release. To build your own design system on Tanrei's vocabulary, see [Your own design system](https://tanrei.chnotchy.com/getting-started/your-design-system/) (`@tanrei/cli`, Theme Studio, the MCP server).

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

## Quick start (contributors)

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

## Contributing · License

[Issues](https://github.com/chnotchy/tanrei/issues) are welcome — bugs, questions, proposals. Pull requests are not accepted for now. See [CONTRIBUTING.md](CONTRIBUTING.md), the [governance](docs/governance/GOVERNANCE.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go privately: [SECURITY.md](SECURITY.md).

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

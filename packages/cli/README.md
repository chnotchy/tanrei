# @tanrei/cli

<!-- tanrei:status -->
<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->
> **Prerelease.** `0.1.0-next.1` is published under the npm dist-tag `next`: until `0.1.0`, install `@tanrei/cli@next`. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no deprecation period first, and its changeset says what broke.

<!-- /tanrei:status -->

Build your own design system on [Tanrei](https://github.com/chnotchy/tanrei): **one layer file in, tokens and code for every platform out.** Change a value, run one command, and the web, SwiftUI, Jetpack Compose, Flutter and React Native all move in the same pull request.

```bash
npm install --save-dev @tanrei/cli
npx tanrei init acme --extends tanrei   # or m3-like, m3-expressive-like, cupertino
npx tanrei build
```

`init` writes two files. `design/acme.system.json` is your design system — a *layer*: it changes values of the shared vocabulary and declares palettes; what it adds goes under `vocabulary`, additively and with a `rationale`.

```json
{
  "id": "acme",
  "extends": "tanrei",
  "palettes": {
    "accent":  { "description": "Acme red, fixed by the brand guideline.", "source": { "seed": "#e60012" }, "roles": "intent" },
    "correct": { "description": "A right answer — neither success nor primary.", "source": { "seed": "#0f766e" }, "roles": "intent" }
  },
  "tokens": {
    "tanrei.dial.type.base": { "$value": { "value": 17, "unit": "px" }, "reason": "Read at arm's length." },
    "tanrei.comp.button.container.padding-inline-start.medium": { "scale": 2 },
    "tanrei.comp.button.container.gap.medium": { "$value": "{tanrei.sys.space.space50}" },
    "tanrei.sys.typescale.label-small": { "$value": { "fontSize": { "value": 11, "unit": "px" } }, "reason": "Contractual footnote size." }
  }
}
```

`tanrei.json` says where each output goes. List only what you ship.

```json
{
  "system": "design/acme.system.json",
  "kotlinPackage": "com.acme.design",
  "outputs": {
    "tokens": "design/tokens/acme",
    "web": "apps/web/src/styles",
    "tailwind": "apps/web/src/styles",
    "shadcn": "apps/web/src/styles",
    "swiftui": "apps/ios/Acme/Design",
    "compose": "apps/android/app/src/main/kotlin/com/acme/design",
    "flutter": "apps/flutter/lib/design",
    "react-native": "apps/mobile/src/design"
  }
}
```

| Output | What you get | Use it with |
|---|---|---|
| `tokens` | A self-contained **DTCG 2025.10** bundle with a standard resolver, the recipe that produced it, `a11y-report.json`, and `components.json` — the components the system ships, with the module that registers each, and those it does not have, with what to use instead | any design-token tool, Figma/Penpot importers, AI agents |
| `web` | `acme.css`, scoped to `[data-tanrei-system="acme"]` | `@tanrei/web` |
| `tailwind` | `acme.tailwind.css` — a Tailwind CSS v4 `@theme` mapped onto Tanrei's variables | Tailwind v4 |
| `shadcn` | `acme.shadcn.css` — shadcn/ui's variables mapped onto Tanrei's roles | shadcn/ui |
| `swiftui` | `TanreiSystem+Acme.swift` → `TanreiSystem.acme` | the `Tanrei` Swift package |
| `compose` | `TanreiSystemAcme.kt` → `TanreiSystem.Acme` | `io.github.chnotchy:tanrei` |
| `flutter` | `acme_system.g.dart` → `acmeSystem` | `package:tanrei` |
| `react-native` | `acme.ts` → `acme` | `@tanrei/react-native` |

The vocabulary *types* always come from the library; a build only writes your system's *values*. If the library's vocabulary moves, the generated file stops compiling instead of drifting silently — keep `@tanrei/cli` and the libraries on the same version.

## Commands

| | |
|---|---|
| `tanrei init <id> [--extends <system>]` | starter layer + `tanrei.json` |
| `tanrei build [--check]` | generate; `--check` writes nothing and fails when a committed output is stale (CI). Prints the font families the system names (text: brand, plain, mono; icons: unselected, selected) — fonts are referenced by name and never bundled, so the product installs or registers them |
| `tanrei validate` | schema and vocabulary rules, then a trial build in memory (nothing is written); prints the accessibility/structure warnings `tanrei build` would print (what concerns the whole system first — e.g. `pressed-feedback: dim` while every pressed opacity is 1), and warns when a font stack has no system or generic fallback |
| `tanrei explain <token-id>` | the value (a choice of kind by its name), which layer or pattern rule gives it — every matching rule, with the one that wins and why — and what a layer may write for it |
| `tanrei studio [--config tanrei.json] [--port <n>] [--no-open]` | serve [Theme Studio](../studio/README.md) on `127.0.0.1` (a random free port unless `--port` is given) and open it in the browser (`--no-open` prints the link only). It edits the layer file `tanrei.json` names in place — saves are atomic, conditional and refused when the engine would refuse the layer — and its build writes the configured outputs. Local only; the link carries a one-time key. Ctrl+C stops it |
| `tanrei systems` | the systems that ship with this version, with the font families each one names |
| `tanrei audit <file\|dir\|glob…> [--system <id\|layer file>] [--format text\|json]` | what your code uses that the system does not have, each at its file, line and column with what to write instead: an element (in markup, a template, JSX, a string, an imported React wrapper, a CSS selector) of a component the system does not have, an import from an entry that does not fit the system (`@tanrei/react/all` or `@tanrei/web/m3-like` in a product of the default system), a written `variant="…"` it leaves out. The system is `--system`, else the product's (`tanrei.json`), else `tanrei`. A directory is read for script, markup and stylesheets, without `node_modules` and hidden directories; quote a glob. Comments are skipped; a variant held in a variable is not seen. Exit 0: nothing found; 1: something found (CI); 2: it could not run |

## Accessibility

Contrast thresholds and structural checks are constants. In your layer a violation is a **warning**, never silent: it is printed, written to `a11y-report.json`, and stamped at the top of every generated file. The report also records how many contrast pairs were checked in each scheme (`checked`): the pairs of color roles, and the pairs of a component's own colors.

The shipped imitation presets (`m3-like`, `m3-expressive-like`, `cupertino`) are held to fidelity to the systems they imitate, not to Tanrei's accessibility criteria, in every contrast scheme: what the fixed ruler measures in a preset is recorded as information, not as a warning. Your layer is a product layer, whatever it extends, so a layer built on a preset is warned about what it inherits from it too.

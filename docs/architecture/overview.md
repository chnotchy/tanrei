# Architecture overview

Tanrei is one design system delivered to five platforms from a single repository — and a mechanism for delivering *any* design system the same way. This page is the map of the current state; how to work in the repository is in [`AGENTS.md`](../../AGENTS.md) and [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Two sources of truth

| Source | Path | Holds |
|---|---|---|
| Design tokens | `tokens/` | DTCG 2025.10 token files, the resolver, and the layer files of the shipped design systems |
| Component specs | `specs/` | Platform-neutral contracts (`*.spec.json`, validated by `specs/component.schema.json`) and the inventory of planned components (`specs/inventory.json`) |

Names — namespace, npm scope, tag prefix, platform list, version — come from `tanrei.config.json`. Everything else in the repository is generated from these or checked against them, and a generated file that differs from what the generators write fails the build.

## The whole picture

```
 tokens/dial ─┐
 tokens/ref  ─┤  core vocabulary (the one-product test)              specs/*.spec.json
 tokens/sys  ─┤  every numeric token: literal + derive rule          specs/inventory.json
 tokens/comp ─┘                                                            │
       │                                                                   │
 tokens/systems/<id>.system.json   layers: extends · palettes · tokens     │
       │                           · rules · vocabulary                    │
       ▼                                                                   │
 packages/token-engine        palettes → HCT tonal ramps → color roles,    │
       │                      rules evaluated, extensions materialised     │
       ▼                                                                   │
 tokens/generated/<system>/   one DTCG bundle per system, own resolver,    │
       │                      recipe embedded, a11y-report.json,           │
       │                      fidelity.json, components.json               │
       ▼                                                                   │
 packages/tokens-build        model.js ─► invariants.js (contrast, heights)│
       │                          │                                        │
       │                          ▼                                        │
       │                        ir.js   unit-free view for native code     │
       │                          │                                        │
       ▼                          ▼                                        ▼
  emit/css.js          emit/ts.js · swift.js · kotlin.js · dart.js    packages/tools
       │                          │                                   validate · parity ·
       ▼                          ▼                                   drift · status
  packages/web          react-native · swiftui · compose · flutter         │
  tokens.css +          one generated file per shipped system              ▼
  systems/<id>.css      + the shared token types                      docs/status/*
       │                                                                   │
       └──── custom-elements.json ─► packages/react (generated wrappers)   │
                                                                           ▼
 design/tokens/ (resolved DTCG per scheme, per system) ─► Figma sync plans ─► Figma library
                                                                           │
 apps/docs reads tokens/, specs/, design/tokens/ and docs/status/ directly ◄┘
```

## Token tiers and derivation

Four tiers with one reference order, `dial < ref < sys < comp`. A token may reference its own tier or a lower one.

| Tier | Path | What it is |
|---|---|---|
| `dial` | `tokens/dial/dial.tokens.json` | Seven numbers under everything: `type.base`, `type.contrast`, `space.unit`, `size.unit`, `shape.unit`, `stroke.unit`, `motion.unit` |
| `ref` | `tokens/ref/`, `tokens/generated/ref.palette.tokens.json` | Raw options: tonal palettes (generated), typeface stacks, weights |
| `sys` | `tokens/sys/` | Decisions: color roles, typescale, shape, space, elevation, motion, state, measures, icon style, behaviour |
| `comp` | `tokens/comp/` | Per-component bindings, including one token per state; aliases and rules only, no literals except container heights |

Every value is one of three kinds: **derived** by a rule in `$extensions["dev.tanrei.derive"]` (usually `mul` — a coefficient on a dial; `pick` gives one value per name of a choice of kind, so that the values that go with a choice follow it), **fixed** with a stated reason, or an **alias**. The rule language is closed (`packages/token-engine/src/rules.js`). Sources stay plain DTCG: the literal `$value` sits next to the rule, and validation requires `rule(default dials) === $value`.

The **core vocabulary** is what these files declare. It is decided by the one-product test (a core token exists because one product may need that distinction), every group carries a rationale and usage guidance for agents (`dev.tanrei.vocabulary`, `dev.tanrei.llm`), and `tokens/vocabulary.lock.json` lists it so that growth is a visible diff.

A token's value also depends on a **context**: `scheme` = theme (light, dark) × contrast (standard, medium, high), six in all, resolved through `tokens/tanrei.resolver.json`.

## Design systems are layers

A design system is a layer file, `tokens/systems/<id>.system.json`, validated by `tokens/schema/system.schema.json`:

```
core.system.json              the root layer: palettes, the role → tone table, the per-state rules; leaves nothing out
  ├─ tanrei.system.json         the default system: the components and variants it leaves out
  ├─ m3-like.system.json        extends core; holds the FAB menu (m3-like/comp/fab-menu.tokens.json)
  │    └─ m3-expressive-like.system.json   extends m3-like
  └─ cupertino.system.json      extends core
(a product's own <id>.system.json extends any of them but the root, in the product's repository)
```

The root has no output of its own — no stylesheet, bundle or native constant — and is not offered where a system is chosen; it is the first layer of every chain. The default system is the documents under `tokens/` as written plus what is generated from its layers, so neither the root nor the default system's own layer may set any other token (`pnpm validate` names the document that holds it). The presets extend the root, not the default system: they inherit none of its choices of components, and each says for itself what it leaves out.

**A component lives in the layer every system that ships it descends from.** Most live in the root. One that a single line of systems ships lives in that line's root — the FAB menu in `m3-like` — which declares the component's whole vocabulary (its document, kept next to the layer, and the rules that value its states) and what a system without it uses for its job (`outside`: a `reason` and `insteadUse` — for the FAB menu, a main action button that opens a bottom sheet). Only the systems that descend from that layer have the component; a platform's main entry does not register it (the entries of the systems that ship it, `@tanrei/web/m3-like`, do), and the other systems' stylesheets say where it lives. The spec and the inventory row say `"layer": "<layer>"`. A product on another line takes it with `components.include: [{ "name": "fab-menu", "from": "m3-like" }]`, and draws it with its own tokens: the component's aliases resolve against the product's sys tokens, and none of m3-like's values come along. The native platforms type every system with the whole vocabulary, so a system's native outputs value such a component the same way until each platform decides how it packages it.

| Layer key | Does |
|---|---|
| `extends` | names the parent; values, palettes, rules and extensions are inherited down the chain |
| `palettes` | declares palettes (from a seed or a hue and chroma, with single tones fixed where a reference publishes them); each yields a four-role intent set with its contrast checks; `null` drops an inherited declared palette |
| `tokens` | per token id: set `$value` (fixed or alias, with a `reason`), replace `derive`, or `scale` the inherited definition |
| `rules` | pattern rules, chiefly how per-state component tokens are valued (state-layer mix, explicit color, dim, nothing) |
| `vocabulary` | **extends the vocabulary**: a step in a series, a value on a component axis, tokens in the layer's own namespace, or the whole vocabulary of a component that lives in the layer — additive only, each with a `rationale` |
| `components` | which components and `variant` values the system ships, as a change to what its parent ships: `omit` (each with a `reason` and what to use instead, `insteadUse`), `include` (bring back what an ancestor left out; or, as `{ name, from }`, take a component that lives in a layer the system does not extend), `variants` (`omit` / `include` per component). An ancestor's choice stays unless a layer undoes it by name: a product on the default system brings back a component the default leaves out with one `include`, and draws it with the tokens every system values |

Legal operations per token are computed by `packages/token-engine/src/operations.js`; the tools below offer only those.

**Choices of kind, icon sets, font stacks.** What no amount can express is a token under `tokens/sys/behavior.tokens.json`: a number that indexes `$extensions["dev.tanrei.enum"].values` (`pressed-feedback`, `focus-style`). The IR resolves it to the name, and platforms receive a typed enumeration. A choice may set values that go with it: `sys.behavior.appearance` sets where a surface that appears starts from (`sys.motion.appear.*`, by `pick` rules), and a layer that pins one of those keeps its pin. How a corner curves is *not* one of them: `sys.shape.corner-smoothing` is an amount 0–1 with Figma's meaning (0.6 = the iOS corner), `ir.cornerSmoothing`; the web, Compose and Flutter draw Figma's construction of the curve for it, SwiftUI and iOS React Native the OS curve for any amount above 0.

**Text styles by level.** `tokens/sys/typescale.tokens.json` holds sixteen roles named by level — `display`, `heading-1`…`heading-6` (h1–h6), `body-large` / `body` / `body-small` (lead, p, small), `label` / `label-small` / `caption`, `code` / `code-small`, `eyebrow` — as `ir.typescale`, and four weight steps `sys.typescale.emphasis.{display,heading,body,label}` as `ir.typeEmphasis`. There are no emphasized roles: a platform's text-style API takes `emphasized` and adds the family's step to the role's weight (a role's family is its first name segment; `caption`, `code*` and `eyebrow` take the label step). Presets re-value the roles and extend the vocabulary where their source has more (`m3-like`: `display-large`, `display-small`; `cupertino`: `body-callout`, `body-subhead`, `caption-small`). The color vocabulary has no `emphasis*` roles: components bind `primary`, and a recolored control is a declared variant. The icon set is a family per selection state (`sys.icon.family.unselected` / `.selected` in `tokens/sys/measure.tokens.json`), and a font stack (`tokens/ref/typeface.tokens.json`) is read once, in the IR, into `{ stack, families, generic, system }`. Fonts are referenced by name and never bundled.

## From a system to five platforms

`packages/tokens-build` turns each system into platform code. Its command line is `packages/tokens-build/src/cli.js` (`validate`, `generate`).

1. `bundle.js` resolves the layer chain with `@tanrei/token-engine` and writes the system's **bundle** to `tokens/generated/<system>/`: plain, fully valued DTCG 2025.10 with its own resolver and the recipe embedded — the shareable artifact. (The default system's generated documents sit at the top of `tokens/generated/`.)
2. `model.js` parses the bundle (`@terrazzo/parser`) for all six schemes. `invariants.js` checks contrast pairs, focus indicators, boundaries and control heights.
3. `ir.js` builds the **IR**: a resolved, unit-free view for native code — colors per scheme, component colors as scheme-independent *paints*, axes (size, variant) with every member, typefaces and icon families as read font stacks, behaviour as names, and what the system added to the vocabulary.
4. **Five emitters** in `packages/tokens-build/src/emit/` write committed output:

| Emitter | Output (default system · one per shipped system) |
|---|---|
| `css.js` | `packages/web/src/generated/tokens.css` · `packages/web/src/generated/systems/<id>.css`, scoped to `[data-tanrei-system="<id>"]`. Alias chains stay visible, colors use `light-dark()`, derived tokens are `calc()` expressions so dials work at runtime |
| `ts.js` | `packages/react-native/src/generated/vocabulary.ts` · `packages/react-native/src/generated/systems/<id>.ts` |
| `swift.js` | `packages/swiftui/Sources/Tanrei/Generated/TanreiTokens.swift` · `TanreiSystem+<Id>.swift` |
| `kotlin.js` | `packages/compose/tanrei/src/main/kotlin/io/github/chnotchy/tanrei/tokens/TanreiTokens.kt` · `TanreiSystem<Id>.kt` |
| `dart.js` | `packages/flutter/lib/src/generated/tokens.g.dart` · `<id>_system.g.dart` |

Two more writers sit beside them: `emit/theme-exports.js` (Tailwind CSS v4 `@theme`, shadcn/ui variables) and `emit/figma.js` (sync plans). `design/tokens/` receives resolved, alias-free DTCG per scheme and per system for design tools.

**Components manifests.** What a system ships is one generated list per system, `tokens/generated/<id>/components.json` (the default system's among them; `@tanrei/web/systems/<id>.components.json`; a product's in the `tokens` output of `tanrei build`): each component it ships — its level and listing, the layer it lives in, its element or class with the module that registers it, its React name, its `variant` values — and each it does not have — with the layer that left it out, or the layer it lives in (`providedBy`) — with the `reason` and what to use instead (`insteadUse`, only components the system ships), and the variant values it leaves out. Whatever suggests or checks a component reads this list rather than the specs. It is worked out (`components-manifest.js`) from the system's chain, as the stylesheets read it, and from the component catalog `packages/tokens-build/generated/component-catalog.json` — every component with a spec, where it lives and its names on each platform — which `components-catalog.js` writes after the web elements' manifest and the React wrappers are generated, and refuses to write a name a platform does not have. Which entry registers a component is decided in one place there (`importOf`): on the web, `@tanrei/web` registers the default system's components and no other, `@tanrei/web/<id>` what system `<id>` ships, `@tanrei/web/all` every component, and a component's own module, `@tanrei/web/components/<name>`, the component alone — what a product imports for a component that no system it is built on ships. The web build writes the systems' entries from their manifests, and `@tanrei/web/custom-elements/<id>.json`, the elements' manifest of what system `<id>` ships.

On the native platforms every token is read through a **system instance** carried by the theme, so the default system, a shipped preset and a product's generated system coexist in one app. Core values are named in types; extensions arrive as open keys with a total lookup that falls back to the default (Button requirement BTN-7), and a system that adds nothing generates no trace of the feature.

`product.js` runs the same pipeline for one layer file that lives anywhere — the entry point the CLI, the MCP server and Theme Studio share.

## Presets and the fidelity harness

The shipped presets (`m3-like`, `m3-expressive-like`, `cupertino`) prove the mechanism and are starting points for products. A preset that reproduces a published system carries a **fidelity map**: `tokens/fidelity/<id>.fidelity.json` maps the reference's resolved tokens (snapshots in `tokens/fidelity/reference/`) to Tanrei ids. `packages/tokens-build/src/fidelity.js` measures it, `packages/tokens-build/test/fidelity.test.js` requires every reference token in scope to be equal, covered, or unmapped under a registered gap, and the result is written to `tokens/generated/<system>/fidelity.json`. What a design system still cannot express is a defect of Tanrei, filed in `docs/governance/mimicry-gaps.json`.

## Accessibility severity

The ruler never changes; the consequence depends on the system. Thresholds are constants in `packages/tokens-build/src/invariants.js`. A violation **fails the build** for the default system `tanrei`, in every scheme. For a product layer it is a **warning** — in the build log, in the header of every generated artifact and in the bundle's `a11y-report.json`. An imitation preset is held to fidelity to the system it imitates, not to Tanrei's accessibility criteria, in standard, medium and high contrast: its contrast findings are **measurements that do not apply** — named in the header of its generated artifacts, listed in `tokens/generated/<system>/a11y-report.json` (`criteria: "not-applied"`) and shown on the docs site — and never filed as mimicry gaps. A structural or functional failure (a missing role, a press that shows nothing, a height that cannot hold its label) fails a preset's build as it fails the default system's.

## Components

A spec declares anatomy, props, slots, events, states, behaviour (EARS sentences with ids), accessibility (role, keyboard map, labeling, minimum target), the token group, canonical **fixtures**, and a per-platform block with status and idiomatic names. Tests on every platform cite the behaviour ids, and every platform snapshots every fixture under the same id. That is what makes parity — same tokens, equivalent visual result, same states, same accessibility semantics, each platform in its own idiom — checkable. Components read per-state tokens and behaviour choices; they never compute a state's appearance and never branch on a system's id.

| Platform | Package | Distribution (planned) | Visual tests | Accessibility tests |
|---|---|---|---|---|
| Web Components | `packages/web` (Lit), `packages/react` (generated wrappers) | npm `@tanrei/web`, `@tanrei/react` | Playwright screenshots | axe-core, keyboard tests |
| SwiftUI | `packages/swiftui` (root `Package.swift`) | SwiftPM | image snapshots | accessibility traits |
| Jetpack Compose | `packages/compose` | Maven Central `io.github.chnotchy:tanrei` | Roborazzi | Compose semantics checks |
| Flutter | `packages/flutter` | pub.dev `tanrei` | golden files | `meetsGuideline` matchers |
| React Native | `packages/react-native` | npm `@tanrei/react-native` | serialized render snapshots | role and state assertions |

What is implemented where is never written by hand: `docs/status/STATUS.md` and `docs/status/status.json` are generated from the specs and the repository. A platform whose implementation has not caught up with a changed spec is `lagging`: its implementation and docs page must still exist, and its baselines are not compared until it catches up.

### Component conventions

What every component shares, so that no spec decides it again:

1. **The container carries the state answer.** `container` is the part that shows hover, focus and press (the state layer is drawn on it). Every other part a state touches is named for what it is (`box`, `mark`, `track`, `handle`, `indicator`, `icon`, `label`, `outline`, …) and keeps its resting value under hover, focus and press; disabled reads as disabled content. The default system states these fallbacks as pattern rules; a component whose design needs another answer for a part adds its own rule in every shipped system. A component whose content part is not `label` names a `state-layer.color`.
2. **Conditions that recolor every state are not new states.** The four interaction states are closed. Selected, checked, indeterminate or error is a condition: listed in `dev.tanrei.states.variants` for a component without a variant axis, or named by a one-word prefix inside each variant (`comp.<name>.filled.selected.container.color`) for one with an axis.
3. **A press is answered the way Button answers it.** Every pressable element reads `sys.behavior.pressed-feedback`, `sys.behavior.focus-style` and `sys.motion.duration.press-hold` through the platform's shared press, ripple and focus-ring primitives, never branches on a system's id, and has the minimum target. A spec copies BTN-8, BTN-9 and BTN-10 for its own name.
4. **Tokens belong to the component that draws the part.** A component has its own `comp.<name>.*` tokens for the parts it draws; a member or a small part that is another component keeps that component's tokens, and a component never repeats their ids. A component that only adds behaviour to another is drawn from that component's tokens.
5. **Overlays** use the platform's own presentation (the web's `<dialog>` and the popover API; SwiftUI's sheet and popover; Compose's `Dialog` and `Popup`; Flutter's routes and `Overlay`; React Native's `Modal`). An overlay a person operates takes focus and returns it to the element that opened it; a modal one keeps focus in. Escape (or the platform's back) dismisses what the spec says can be dismissed.
6. **Text entry** always edits in the platform's native text element, so IME, autofill and selection work as the platform does.
7. **Icons** go through each platform's icon helper: the family and fill of the selection state, the weight, and the optical size; a control's own mark is drawn at the weight its component token names.
8. **Fixtures and baselines.** Fixtures cover every variant, every size and every non-default condition; the default system records one baseline per fixture on each platform, and each shipped preset one representative fixture per component.
9. **Repeated items** (tabs, list and menu items, destinations) are item kinds of the spec, and **components form three levels**: a base component is a single part with one job; a composed one is put together from other components to complete one value or job; a feature holds several controls and coordinates them by state of its own.
10. **No words.** A component ships no words of its own: a string prop has no default but the empty one, and a word comes from the instance, the product's words set once, or the platform's locale data.
11. **Text follows its script, not a token.** A title or a heading — whatever text style its token names — is set by the language of its text. In Chinese, Japanese and Korean it takes no negative letter-spacing: it is set solid, and a positive letter-spacing a layer chose stays. In a script that joins its letters or stacks marks on them (Arabic, Persian, Urdu, Pashto; Hindi, Marathi, Nepali, Bengali, Punjabi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Sinhala; Thai, Lao, Khmer, Burmese) it takes none. A negative tracking is a device of Latin display type that does not tighten kana and ideographs, which are designed in a full-width square, and spacing pulls a joined or stacked word apart. No design system chooses this, so it is no token: each platform's text primitives apply it in one place (on the web, `packages/web/src/styles/script-tracking.ts`), and a spec says only that its title follows it, as prose says of its headings (PRS-20).
12. **Stacking stays inside the component.** A component orders its own parts (a divider over its segments, a copy button over the code, a pinned row over the rows scrolling under it) and nothing else: its levels never compete with the page's. What must stand over the page — a menu, a popover, a tooltip, a snackbar, a dialog, a sheet, a modal drawer — is drawn by the platform's own overlay layer (point 5), never lifted by a level. There is no system scale of levels, and no token for one: the overlay layer orders what is open by the order it opened, and the one frame that orders regions of a page, the app shell, orders them inside a stacking order of its own (APS-32: the regions that scroll, the footer, the header and the navigation bar, the skip link). On the web, a component that gives any part a `z-index` above 0 makes its outermost box a stacking context (`isolation: isolate` on the host or the class's root), so a shadow root — which makes none — does not let the level out; the levels are `-2` to `4`; and nothing is lifted with a large number. `packages/web/test/stacking-guards.test.mjs` reads every `z-index` the package writes, and `packages/web/src/stacking.test.ts` mounts every fixture and finds any part ordered in the page's stacking context, and lays a sticky header over the sealed components.
13. **Motion follows its role.** A component animates a change over the role of what moves and eases it by the role of the change — `sys.motion.role.*` and `sys.motion.easing.{enter, exit, state, spatial}`, through component tokens that alias them — and a surface that appears starts from `sys.motion.appear.*`, which `sys.behavior.appearance` sets. A surface leaves faster than it appears, on the exit curve. The principles every motion is held to (MOT-1 to MOT-6: animate a change, never flicker or jump, a first frame at rest, an overlay mounted open, a box that keeps its content anchored, reduced motion) are in [motion.md](motion.md); a spec cites them by id.
14. **A component a system does not have still works, and says so.** A system leaves components and `variant` values out (`components.omit`, `components.variants`), and a component that lives in a layer is not in the systems that do not extend it. Each platform reads what the active system does not have from that system's own output — on the web, three string properties of the system's stylesheet, a product's sheet among them: `--tanrei-unavailable`, `--tanrei-unavailable-layer` and `--tanrei-unavailable-replacement`, the last from the `insteadUse` of the system's components manifest — and every component follows three sentences, which no spec repeats:
    - **AVL-1.** WHEN an element connects, or its `variant` changes, and the active system leaves its component or that `variant` value out, or does not extend the layer its component lives in, THE component SHALL render and work as under any system, and in debug builds SHALL report the use once per element, naming the system and, for a component that lives in a layer, that layer; an element another component draws inside it is reported under the component the product wrote, by that component's name (a text field's `outlined`, not its text input's).
    - **AVL-2.** WHEN the active system names what it uses instead of what it does not have THE report SHALL name those components, in the system's order.
    - **AVL-3.** WHEN the availability mode is `error` THE report SHALL be made at error level; in either mode each use SHALL be recorded once per page, as `component` or `component:variant` named as in AVL-1, for the product's own tests (`setAvailabilityMode()` and `unavailableUses()` on the web).

## Tools around a layer file

All three work on one product-owned layer file and share `buildProductSystem` and the engine's `legalOperations`.

| Package | What it is |
|---|---|
| `packages/cli` (`@tanrei/cli`) | `tanrei init · build · validate · explain · systems · studio`. `build` writes the bundle, a scoped stylesheet, Tailwind and shadcn/ui exports and the system's values for the four native platforms into the product's own modules; `--check` is the CI mode. `tanrei studio` (`packages/cli/src/studio-server.js`) serves Theme Studio on loopback and edits the product's file in place |
| `packages/mcp` (`@tanrei/mcp`) | A Model Context Protocol server (stdio, `tanrei-mcp`) with read-only tools: search and explain tokens, resolve and diff systems, validate a layer, propose an extension, list mimicry gaps (`packages/mcp/src/tools.js`) |
| `packages/studio` (`@tanrei/studio`) | Theme Studio: four levels over the same layer file (Essentials, Groups, Every token, Source). The preview is produced in the browser by the build's own CSS emitter and invariants. Mounted by the docs site and by a standalone app |

## Design tools

Design tools are never a source of truth (`design/README.md`). `design/tokens/` is the hand-off format. For Figma, `emit/figma.js` writes a **sync plan** per system on request (`node packages/tokens-build/src/cli.js figma-plans <dir>`, not part of `pnpm generate`); a plan is applied by variable name in place and verified by digest, and `design/figma/README.md` lists where the library must differ from code.

## The governance loop

```
 edit a source of truth ─► validate ─► generate ─► drift ─► build + tests ─► parity
        ▲                                                                     │
        └──────────────── what is found is fixed at its source ◄──────────────┘
```

| Step | Command | Does |
|---|---|---|
| validate | `pnpm validate` | token sources (schema, derive rules equal literals, guidance present, invariants), specs, retired names (`docs/governance/retired-terms.json`), licenses in publishable packages, the docs site's translations and types (`astro check`) |
| generate | `pnpm generate` | bundles, platform token code, design-tool exports, the custom elements manifest, `docs/status/` |
| drift | `pnpm drift` | fails when a committed generated file differs from what the generators write |
| parity | `node packages/tools/src/cli.js parity` | specs against each platform package: the implementation exists where the status says so, spec names and prop values appear in it, its tests cite every behaviour id, every fixture has a baseline, the docs pages exist. The human half — one row of baselines per fixture — is the generated `docs/status/PARITY.md` |
| check | `pnpm check` | all of the above with build and tests, in order |

Around the loop:

- **Hooks.** `lefthook.yml` runs parity, a secrets scan and — when `tokens/` or `specs/` changed — validate before a commit, enforces Conventional Commits, and runs drift before a push. For agents, `.claude/settings.json` wires `.claude/hooks/guard-generated.mjs` (no hand edits to generated files), `guard-bash.mjs` (no publishing, no release tags, no pushes to `main`, no creating a repository or changing its visibility, no bypassing hooks) and `stop-check.mjs` (a turn may not end while validate or parity fails). Skills and per-platform agent briefs are in `.claude/skills/` and `.claude/agents/`.
- **CI.** `.github/workflows/ci.yml` runs the same checks plus every platform's test suite (what runs when: `CONTRIBUTING.md`); `.github/workflows/release.yml` never runs on a push — a maintainer dispatches it and approves each registry. Publishing is a maintainer's decision.
- **Versioning.** Changesets, all packages in lockstep: one version for every platform, because parity is the product.

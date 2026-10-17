# @tanrei/mcp

<!-- tanrei:status -->
<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->
> **Prerelease.** `0.1.0-next.0` is published under the npm dist-tag `next`: until `0.1.0`, install `@tanrei/mcp@next`, and expect the API to change.

<!-- /tanrei:status -->

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Tanrei](https://github.com/chnotchy/tanrei). It lets an AI agent working in **your product's repository** discover the token vocabulary, see where a value comes from, and write a **valid** edit to your design system's layer file — a changed value, or an extension of the vocabulary. It works from the two ideals Tanrei holds together:

> **A small core** — Tanrei's own tokens are a necessary and sufficient set, simply named, fitted to no one design system.
> **Exact reproduction** — by customizing Tanrei, any design system can be matched exactly.
> Both hold because the core stays small and **any layer may extend it**.

Every tool is read-only. The server computes values with the same pipeline `tanrei build` runs, and carries its own copy of the vocabulary, so it needs nothing else checked out.

## Install

Claude Code:

```bash
claude mcp add tanrei -- npx -y @tanrei/mcp
```

Any MCP client (Claude Desktop, Cursor, VS Code, …) — stdio transport:

```json
{
  "mcpServers": {
    "tanrei": {
      "command": "npx",
      "args": ["-y", "@tanrei/mcp"]
    }
  }
}
```

Node.js 20 or newer. Relative `layerFile` paths are resolved from the server's working directory (normally your project root). Keep `@tanrei/mcp`, `@tanrei/cli` and the Tanrei libraries on the same version: they share one vocabulary.

## Tools

| Tool | What it answers |
|---|---|
| `list_systems` | The shipped systems — the root `tanrei` and the presets `m3-like`, `m3-expressive-like` (extends `m3-like`; adds the button sizes `xsmall` and `xlarge`) and `cupertino` — and, with `layerFile`, your product's chain: id, name, `extends`, description, declared palettes, number of value changes and pattern rules, **the extensions that exist in it** (count, by kind, the first few, each with `declaredBy`), and the accessibility findings: a warning count for the root system and a product (none for the root, whose violations fail its build), and for an imitation preset `accessibility: { criteria: "not-applied", measurements, because }` — its contrast measured with the fixed ruler and shown as information, since Tanrei's accessibility criteria do not apply to a preset in any contrast scheme. A preset that is measured against the published system it reproduces also carries **`fidelity`**: `{ equal, measured, different, unmapped, reference: { name, version, source } }` — of `measured` reference tokens, `equal` have exactly the reference's value, `different` do not, and `unmapped` have no counterpart in Tanrei yet (see `mimicry_gaps`). It is the report of the preset's last build (`tokens/generated/<id>/fidelity.json`), read as it is; a system without one claims nothing. |
| `search_tokens` | Find tokens by id: substring, or a glob (`tanrei.comp.button.*.hovered.*`, `sys.color.on-*`, `**.opacity`, `acme.comp.*` for a layer's own tokens). Filters: `tier` (dial, ref, sys, comp), `type`, `kind`, `extensions` (only / no vocabulary added by a layer). Returns id, `$type`, kind (derived, fixed, alias, dial), `extension: true` + `declaredBy` where a layer added the token, and a short description. Paginated. |
| `resolve` | Token id(s) + system + scheme → the resolved value (a choice of kind — `sys.behavior.*` — as its **name**, with `choice: { name, index, of }`), the alias chain, the derive rule with the current value of its inputs, the layer that set it (and, for an extension, the layer that declared it), and the CSS custom property name — `--tanrei-…`, or `--<namespace>-…` for a layer's own tokens. A palette tone that the palette states exactly (`source.tones`) says so: `rule.exact`. |
| `explain_token` | One token in one system: why it exists (the core's one-product rationale — or, for an extension, `declaredBy` and its `rationale`), usage guidance (`dev.tanrei.llm`, when the vocabulary carries it), which layers and pattern rules touch it, root first — every matching pattern rule says whether it `wins` and `because` (an explicit entry beats patterns, fewer wildcards beat more, the later layer wins a tie), and `winningRule` names the one that values the token — **what follows it** (`followers`: every token that moves when this token or dial does), **the operations a layer may legally write for it** (`howToChange`; a choice of kind offers **choose** with its names, a typeface **set the font stack**) and **how to add vocabulary next to it** (`howToExtend`: one more step of its series, one more size/variant of its axis, a token of your own). Every `write` is a ready-to-edit fragment of a layer. |
| `diff_systems` | Two systems → the tokens whose resolved value differs in a scheme. Counts by tier and group first; details paginated, narrowed with `group`. Ids that exist on one side only are reported apart: extensions (with `declaredBy`), and what declared palettes bring. |
| `validate_layer` | A layer (object or file; with an object, `parents` — other layers of the request it extends — and `dir` — where the product's other layer files live) → JSON Schema problems of every layer of the chain; then every problem at once, with the way out: `vocabulary` declarations as the engine judges them (rationale, own namespace, declared once, an existing axis and `from`, never an interaction state), ids under `tokens`/`rules` that are neither core nor declared, a pinned literal without `reason`, a `$type` change, leftover placeholders; then the real build, which is the final authority. Ids declared under `vocabulary` — including the member tokens a new size generates and a new variant's state tokens — are valid targets. If valid: the accessibility/structure warnings `tanrei build` would print. Writes nothing. |
| `propose_extension` | `{ kind: "step" \| "axis-value" \| "own-token", … }` → a ready `vocabulary` fragment for the layer, checked (the id is new, names are valid, an own token uses the layer's namespace, the axis and `from` exist, it is not a state) and **verified by a trial build**: the new token ids with their values, and any new warnings. The `rationale` is a placeholder the agent must fill — `validate_layer` rejects it as it stands. Writes nothing. |
| `mimicry_gaps` | Tanrei's registry of traits it cannot reproduce yet — behaviours and mechanisms no token can express. A shipped preset's accessibility measurements are not gaps. Missing vocabulary is not a gap: a layer declares it. Filter by `status`, `kind`, `system`. |

Wherever a tool takes a system, pass `system` (a shipped id, default `tanrei`) or `layerFile` (the path of your `<id>.system.json`). `scheme` is one of `light`, `light-medium`, `light-high`, `dark`, `dark-medium`, `dark-high`. In a glob, `*` stays inside one id segment (as in a layer's pattern rules); `**`, or a `*` that ends the glob, takes the rest of the id. Lists return `total`, `offset`, `limit` and `nextOffset`.

Systems are built once and cached; a layer file is rebuilt when it, or a layer it extends, changes on disk, and every system is rebuilt when a hand-authored file under `tokens/` (the vocabulary) changes — no restart needed.

## Resources

| URI | |
|---|---|
| `tanrei://philosophy` | One page: the two ideals, the one-product test for the core, tiers and kinds, the layer operations, the three kinds of extension, accessibility severity. Read once. |
| `tanrei://schema/system` | The JSON Schema of a layer file. |
| `tanrei://systems/<id>` | Each shipped layer file as authored — worked examples of every operation. |

The server's `instructions` give the agent the hard rules up front — the same ones the tools enforce:

- **Values first.** Find the token that exists and change it in the layer: set a dial, `scale`, re-point an alias, replace `derive`, and only then pin a literal `$value`, which needs a `reason`. Color families are `palettes`.
- **If the word is missing, add it — in the layer, under `vocabulary`, with a `rationale`** (8+ characters). Three kinds: a step in a series inside Tanrei's tree (`tanrei.sys.space.space1200`, or a single color role with its `onRole`); a value on a component axis (`tanrei.comp.button.size.3x`, `tanrei.comp.button.variant.danger` — one line values every member; a variant's state tokens come from the system's pattern rules); the layer's own tokens in its own namespace, which is the layer's id (`acme.comp.rating.star.size` → `--acme-comp-rating-star-size`). They may reference `tanrei.*`; nothing in `tanrei.*` may reference them.
- **Additive only.** Extensions are inherited down `extends` and stay attributed to the layer that declared them. Nothing is removed or retyped; re-declaring what core or an ancestor declared is an error — change its value under `tokens`. Interaction states (hovered, focused, pressed, disabled) are not extensible.
- **Accessibility thresholds are constants**, for extensions too; a violation in a product layer is a warning every build prints.
- Never edit generated files; run `tanrei build` after editing the layer.

## An example session

> **You:** Our buttons should be rounder, and links should use the brand red `#e60012`.

1. `search_tokens { "query": "button.container.shape" }` → `tanrei.comp.button.container.shape` — alias.
2. `explain_token { "token": "tanrei.comp.button.container.shape", "layerFile": "design/acme.system.json" }` → aliases `{tanrei.sys.shape.corner.small}` (6px = `dial.shape.unit` × 3); legal operations: **re-point alias**, **scale**, derive, pin `$value` (needs `reason`).
3. `explain_token { "token": "tanrei.sys.color.link", … }` → a color role: change the palette it reads, give it a `tone` rule, alias another role, or **declare a palette**. A literal hex on a role is not accepted.
4. The agent edits `design/acme.system.json`:

   ```json
   {
     "id": "acme",
     "extends": "tanrei",
     "palettes": {
       "brand": { "description": "Acme red is fixed by the brand guideline.", "source": { "seed": "#e60012" }, "roles": "intent" }
     },
     "tokens": {
       "tanrei.comp.button.container.shape": { "$value": "{tanrei.sys.shape.corner.large}" },
       "tanrei.sys.color.link": { "$value": "{tanrei.sys.color.brand}" }
     }
   }
   ```

5. `validate_layer { "layerFile": "design/acme.system.json" }` → `valid: true`, plus any contrast warnings the brand red causes — the same ones the build prints.
6. `npx tanrei build` → CSS, SwiftUI, Compose, Flutter and React Native values change together.

> **You:** The landing page needs a much bigger call-to-action button than `large`.

7. `search_tokens { "query": "comp.button.container.height.*" }` → `small`, `medium`, `large`. Nothing bigger exists, and scaling `large` would change every large button. The word is missing.
8. `explain_token { "token": "tanrei.comp.button.container.height.large", … }` → `howToExtend`: **add a size** — `"tanrei.comp.button.size.<new-value>": { "from": "large", "scale": 1.5, "rationale": … }`.
9. `propose_extension { "kind": "axis-value", "component": "button", "axis": "size", "value": "3x", "from": "large", "scale": 1.5, "layerFile": "design/acme.system.json" }` →

   ```json
   {
     "declares": "tanrei.comp.button.size.3x",
     "write": { "vocabulary": { "tanrei.comp.button.size.3x": { "from": "large", "scale": 1.5, "rationale": "<why this design system or product needs it — 8+ characters>" } } },
     "verified": {
       "built": true,
       "newTokens": { "total": 9, "values": {
         "tanrei.comp.button.container.height.3x": "60px",
         "tanrei.comp.button.container.padding-inline-start.3x": "24px",
         "tanrei.comp.button.container.padding-inline-end.3x": "24px",
         "tanrei.comp.button.container.gap.3x": "12px",
         "tanrei.comp.button.outline.width.3x": "1.5px",
         "…": "…" } },
       "newWarnings": []
     }
   }
   ```

10. The agent merges `write` into the layer and writes the rationale itself — one line values every member of the size axis (nine: height, the paddings, text style, icon size, icon-to-label gap, outline width), still following the dials:

    ```json
    "vocabulary": {
      "tanrei.comp.button.size.3x": { "from": "large", "scale": 1.5, "rationale": "The hero call-to-action on the landing page." }
    }
    ```

11. `validate_layer` → `valid: true, extensions: 1`. (With the placeholder left in, it answers *the "rationale" is still the placeholder*.) A single member can still be changed under `tokens` — `"tanrei.comp.button.container.padding-block.3x": { "$value": "{tanrei.sys.space.space200}" }` — like any core token.
12. `npx tanrei build` → the generated values of every platform gain the size; platforms keep named fields for the core sizes and reach `3x` as an open key.

Had the agent written `"tanrei.comp.button.container.height.3x": { … }` under `tokens` without declaring the size, `validate_layer` would have answered *not a token of this system*, with the way out: use the token that exists, or declare it under `vocabulary` — `propose_extension` writes the declaration.

## Inside the Tanrei monorepo

`bin/tanrei-mcp.js` runs the bundled `dist/server.js` with its copy of the vocabulary (`dist/vocabulary`: the sources under `tokens/` plus the presets' `fidelity.json` reports — no other build output —, `tanrei.config.json`, the mimicry-gaps registry) when `dist/` exists. Set `TANREI_MCP_FROM_SOURCE=1` to run `src/` against the repository's own `tokens/`. `pnpm --filter @tanrei/mcp build` produces `dist/`; `node --test` covers both modes over stdio.

License: Apache-2.0.

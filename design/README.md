# design/ — hand-off to design tools

Design tools are **renderers** of Tanrei's tokens, not their master. The repository's `tokens/` stay canonical; design files are rebuilt or updated from them.

## What is here

| Path | What | Generated? |
|---|---|---|
| `tokens/tanrei.<scheme>.tokens.json` | Fully resolved, alias-free DTCG 2025.10 for each of the six schemes (`light`, `light-medium`, `light-high`, `dark`, `dark-medium`, `dark-high`) | yes — `pnpm generate` |
| `figma/` | Notes and scripts for the Figma library | by hand |
| `brand/` | The symbol and the wordmark, and what is derived from them (`brand/generated/`) | the marks are pulled from Figma (`pnpm brand:pull`), `brand/generated/` by `pnpm generate`; `brand/figma.json` and the README by hand |

The resolved files exist because most tools cannot evaluate the DTCG *resolver* yet. Tools that can should read `tokens/tanrei.resolver.json` directly.

## Figma

Constraints that shape the workflow (checked September 2026):

- The Variables **REST API is Enterprise-only**, and **Code Connect needs an Organization/Enterprise plan**. Neither is on Tanrei's critical path.
- What works on any paid seat: Figma's native **variable import/export as DTCG JSON**, the **Figma MCP server** (agents can create variables, styles and components in a file), and plugins such as Tokens Studio (Git sync, DTCG mode).
- Variable **modes per collection are limited by plan** (4 on Professional). Tanrei therefore uses the modes `light`, `dark`, `light-high`, `dark-high` in the `sys.color` collection; medium contrast is left to code.

Library structure (mirrors the token tiers):

| Collection | Modes | Content |
|---|---|---|
| `tanrei/ref` | — | tonal palettes, alpha ramp (hidden from publishing) |
| `tanrei/sys.color` | light · dark · light-high · dark-high | every color role, aliased to `ref` |
| `tanrei/sys` | — | shape corners, space, measures, state opacities |
| Text styles `tanrei/typescale/*` | — | 15 roles + emphasized + code/eyebrow |
| Effect styles `tanrei/elevation/level0–5` | — | ring + shadows |
| Components | — | one component set per spec, variants named after spec props, bound to `comp` values via `sys` variables |

Updating the library after a token change: regenerate (`pnpm generate`), then re-import `design/tokens/*.tokens.json` (or re-run the MCP sync) and publish the library. Never "fix" a value in Figma first.

## Penpot and others

**Not verified.** Only the Figma hand-off above has been exercised; nothing here has been tried in Penpot or the other tools. What should work, by their documentation: Penpot imports DTCG natively (Tokens panel → Import) — use the resolved per-scheme files as token sets and themes. Sketch, Framer and zeroheight accept DTCG to varying degrees; the same files apply. Composite types (typography, shadow) are not yet supported everywhere; where they are not, the tool gets the primitives and the text/effect styles are built once by hand from the token values.

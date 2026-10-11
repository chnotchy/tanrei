---
name: add-token
description: Add or change a Tanrei design token (ref, sys or comp tier) or the color scheme generation, and propagate it to every platform safely.
---

# Add or change a token

1. Decide the tier. `ref` = raw option, `sys` = system decision (public API by name), `comp` = a component's binding (alias only). Colors are **not** edited by hand: change the palette declarations or the role rules in `tokens/systems/<id>.system.json` (bump `specVersion` when the role table changes meaningfully). Before adding any token, apply the one-product test (`AGENTS.md`).
2. Edit the DTCG file under `tokens/`. Use `$type` at group level, DTCG 2025.10 object values (`{ "value": 6, "unit": "px" }`, color objects), and aliases `{tanrei.sys…}`.
3. New token *category* or composite shape? Extend `packages/tokens-build/src/ir.js` and **all** emitters in `src/emit/`, not just one.
4. `pnpm validate` — contrast invariants run for all six schemes. A failure means the design is wrong.
5. `pnpm generate`, then build/test each platform package: generated Swift/Kotlin/Dart must still compile.
6. Value changes will move snapshots. Review the diffs, update baselines with `TANREI_SNAPSHOT_REASON="…"`, and repeat the reason in the changeset.

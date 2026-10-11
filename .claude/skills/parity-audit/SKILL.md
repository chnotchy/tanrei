---
name: parity-audit
description: Audit how well the platforms match each other and the specs — mechanical checks first, then a visual comparison of the per-fixture baselines across platforms.
---

# Parity audit

1. `node packages/tools/src/cli.js validate && node packages/tools/src/cli.js drift` — must be green before anything else.
2. `node packages/tools/src/cli.js status` — note every cell that is not `planned`.
3. For each implemented component, open the baseline of the **same fixture id** on every implemented platform (paths in `packages/tools/src/conventions.js`) and compare: container size and radius, colors, label weight/size/tracking, padding, border/ring, disabled treatment. Differences in font rasterization are expected; differences in geometry or color are findings.
4. Read each platform's implementation for literal design values (numbers, hex colors) that should be tokens.
5. Report findings as a table: component · fixture · platform · expected (token) · observed. Fix by changing the platform (or the token/spec if the source of truth is wrong) — never by editing a baseline to match a bug.

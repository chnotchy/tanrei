---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
---

**Breaking — the root layer `core` is grey, and Tanrei's own colors are the default system's.** `core` now values the
vocabulary with a neutral palette without chroma, the four status palettes, the color roles drawn from them and the
per-state rules, and declares no accent, no tints and no code colors. What was Tanrei's look moved to
`tokens/systems/tanrei.system.json`: the accent palette (the keyboard focus ring and its `accent` roles), the four quiet
palettes of the status containers and of the inverse status bars, and the six syntax palettes of code. `m3-like` and
`cupertino` declare every palette and color they used to take from the root, each with a reason where Material 3 or
Apple's guidelines have no counterpart.

No shipped system moved: every stylesheet, bundle value and native constant of `tanrei`, `m3-like`,
`m3-expressive-like` and `cupertino` is byte for byte what it was, and `fidelity.json` is unchanged. Only the bundles'
recipe (`dial/dial.tokens.json`, which carries the layers as written) differs.

What broke, for anyone who read `core` directly (a layer chain built on it, `diff_systems … core`, the Studio's preview
of it):

- `core` has no `accent` palette and no `sys.color.accent`, `on-accent`, `accent-container` or `on-accent-container`;
  its focus ring is the primary's. A layer on `core` that wants an accent declares the palette itself.
- `core` has no `error-quiet`, `success-quiet`, `warning-quiet`, `info-quiet` or `syntax-*` palettes. Its status
  containers are tints of the status palettes themselves; its inverse status bars take the roles their component
  document names; its code is drawn in the text colors the code block's document gives it.
- `accent: null` in a layer that extends `core` drops nothing any more: delete it.

New: the root's stylesheet, `@tanrei/web/systems/core.css` (scoped to `[data-tanrei-system="core"]`), the grey starting
point. `core` is still not offered where a system is chosen, and the build holds it to every accessibility invariant as
it holds the default system: a finding fails `pnpm generate` and `pnpm validate`.

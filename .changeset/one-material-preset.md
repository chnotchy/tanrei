---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/token-engine': minor
'@tanrei/mcp': minor
'@tanrei/cli': minor
---

**Breaking — one Material preset: `m3-like` follows current Material 3, and `m3-expressive-like` is removed.**
Material 3 Expressive is not a separate design system: it is the name of an update to Material 3, documented on the
same site and pages. So there is one Material preset, `m3-like`, and it follows the current Material 3 specification,
the Expressive update included. Like every preset it is an example of imitating another design system, not Tanrei's
own design.

What breaks:

- The system `m3-expressive-like` is gone, with everything generated from it: the `@tanrei/web/m3-expressive-like` and
  `@tanrei/react/m3-expressive-like` entries, `systems/m3-expressive-like.css`, its native system constants
  (`TanreiSystem.m3ExpressiveLike`, `TanreiSystem.M3ExpressiveLike`, `m3ExpressiveLikeSystem`, `m3ExpressiveLike`),
  its design-tool export, its fidelity report, its place on the docs site and in the Theme Studio's start menu. There
  is no alias and no redirect from the old id: use `m3-like`, which now has what it had.
- `m3-like`'s buttons are Material 3's five sizes (androidx.compose.material3's `Button*Tokens` and
  `*IconButtonTokens`). `xsmall` (32) and `xlarge` (136) join its vocabulary, and `small`, `medium` and `large` are 40,
  56 and 96 tall (were 32, 40 and 56), with Material's leading and trailing space (16 / 16 / 24 / 48 / 64; were 12 / 16
  / 24 at small to large), icon-to-label gap (8 / 8 / 8 / 12 / 16; large was 8), icon size (20 / 20 / 24 / 32 / 40;
  was 18), outline width (1 / 1 / 1 / 2 / 3; large was 1) and label style (label, label, heading-5, heading-3,
  heading-1, after `ButtonDefaults.textStyleFor`; medium and large were label). An icon-only Button draws its glyph at
  20 / 24 / 24 / 32 / 40 (small was 20, large 24), is 28 / 32 / 48 / 64 / 104 wide when narrow and 40 / 52 / 72 / 128 /
  184 when wide (small to large were 40 / 52 / 72). Everything sized from a Button grows with it: a host's close button
  and the snackbar's actions are 40 tall under `m3-like` (were 32), Material 3's standard icon button. Tanrei's `size`
  still defaults to `medium` (56 under `m3-like`), where Material's default is its small (40): the mimicry gap
  `axis-default`.
- `m3-like`'s loading indicator is 38 in its 48 container (was 40), and contained it draws on-primary-container on a
  flat primary-container (was on-surface-variant on surface-container-lowest at level 2), as androidx's
  `LoadingIndicatorTokens` give it.
- The fidelity report's `reference` is a list (one entry per reference snapshot), in `tokens/generated/<id>/fidelity.json`
  and in the MCP server's `list_systems`. `m3-like` is measured against material-web and against androidx's Material 3
  tokens (the five button sizes, the five icon button sizes and the loading indicator); where material-web's older
  figure differs (a button's icon at 18), the androidx one is current Material 3, and the map says so
  (`superseded-by`). `tokens/fidelity/reference/androidx-material3-buttons.json` is now `androidx-material3.json`.

Baselines: the snapshot baselines of the `m3-like` fixtures that draw these parts change, and that is the intended
result of this change. They are recorded again on Linux, not in this change. Every `m3-expressive-like` baseline is
removed with its system.

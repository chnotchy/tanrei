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
  `*IconButtonTokens`), mapped to Tanrei's by role: `small`, `medium` and `large` are Material's extra small, small
  and medium, 32, 40 and 56 tall as before, so a Button at the default size is Material's default, and `xlarge` (96)
  and `xxlarge` (136), Material's large and extra large, join its vocabulary. From `small` to `xxlarge` they take
  Material's leading and trailing space (16 / 16 / 24 / 48 / 64; small was 12), icon-to-label gap (8 / 8 / 8 / 12 /
  16), icon size (20 / 20 / 24 / 32 / 40; was 18), outline width (1 / 1 / 1 / 2 / 3) and label style (label, label,
  heading-5, heading-3, heading-1, after `ButtonDefaults.textStyleFor`; large was label). An icon-only Button draws
  its glyph at 20 / 24 / 24 / 32 / 40, is 28 / 32 / 48 / 64 / 104 wide when narrow and 40 / 52 / 72 / 128 / 184 when
  wide (small to large as before). A host's close button and the snackbar's actions stay at the small Button size,
  32 under `m3-like`, where Material draws its 40 standard icon button: the mimicry gap `close-button-size`.
- `m3-like`'s loading indicator is 38 in its 48 container (was 40), and contained it draws on-primary-container on a
  flat primary-container (was on-surface-variant on surface-container-lowest at level 2), as androidx's
  `LoadingIndicatorTokens` give it.
- The fidelity report's `reference` is a list (one entry per reference snapshot), in `tokens/generated/<id>/fidelity.json`
  and in the MCP server's `list_systems`. `m3-like` is measured against material-web and against androidx's Material 3
  tokens (the five button sizes, the five icon button sizes and the loading indicator); where material-web's older
  figure differs (a button's icon at 18), the androidx one is current Material 3, and the map says so
  (`superseded-by`). `tokens/fidelity/reference/androidx-material3-buttons.json` is now `androidx-material3.json`.

Baselines: the snapshot baselines of the `m3-like` fixtures that draw these parts change, and that is the intended
result of this change. They are recorded again on Linux, not in this change. On the web, 25 of the 107
`packages/web/snapshots/systems/m3-like/` baselines change, found by rendering every one before and after the change
on one machine and comparing the two renders: app-bar/small-scrolled, button/{elevated,filled,outlined,text,tonal}-medium,
button-group/connected, calendar/range, callout/closable-title-actions, chat-composer/inline-rtl,
code-block/syntax-marked, copy-button/labelled-tonal, date-time-picker/modal-date-time, dialog/icon,
empty-state/actions, figure/docs-demo-code, file-picker/drop-area-error, file-upload/drop-area-statuses,
image-preview/several-rtl, loading-indicator/contained-medium, navigation-drawer/collapsed-labels-always,
page-header/everything, popover/arrow-actions, side-sheet/modal and toolbar/floating. The native platforms'
`m3-like` baselines of the button, button group, icon button, loading indicator and the fixtures that draw Buttons
change too, when those platforms catch up. Every `m3-expressive-like` baseline is removed with its system: 107 on
the web and 35 each on SwiftUI, Compose and Flutter.

---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/mcp': minor
'@tanrei/cli': minor
---

**Breaking — one Material preset: `m3-like` follows current Material 3, and `m3-expressive-like` is removed.**
Material 3 Expressive is not a separate design system: it is the name of an update to Material 3. So there is one
Material preset, `m3-like`, and it follows the current Material 3 specification, the Expressive update included. Like
every preset it is an example of imitating another design system, not Tanrei's own design.

What breaks:

- The system `m3-expressive-like` is gone, with everything generated from it: the `@tanrei/web/m3-expressive-like` and
  `@tanrei/react/m3-expressive-like` entries, `systems/m3-expressive-like.css`, its native system constants
  (`TanreiSystem.m3ExpressiveLike`, `TanreiSystem.M3ExpressiveLike`, `m3ExpressiveLikeSystem`, `m3ExpressiveLike`),
  its design-tool export and its fidelity report. There is no alias: use `m3-like`, which now has what it had.
- `m3-like`'s buttons are Material 3's five sizes. `xsmall` (32) and `xlarge` (136) join its vocabulary, and `small`,
  `medium` and `large` are 40, 56 and 96 tall (were 32, 40 and 56), with Material's paddings (16 / 16 / 24 / 48 / 64),
  icon-to-label gap (8 / 8 / 8 / 12 / 16), icon size (20 / 20 / 24 / 32 / 40; was 18), outline width
  (1 / 1 / 1 / 2 / 3) and label style (label, label, heading-5, heading-3, heading-1). An icon-only Button draws its
  glyph at 20 / 24 / 24 / 32 / 40, is 28 / 32 / 48 / 64 / 104 wide when narrow and 40 / 52 / 72 / 128 / 184 when wide.
  Everything sized from a Button grows with it: a host's close button and the snackbar's action are 40 tall under
  `m3-like` (were 32), Material 3's standard icon button. Tanrei's `size` still defaults to `medium` (56 under
  `m3-like`), where Material's default is its small (40): the mimicry gap `axis-default`.
- `m3-like`'s loading indicator is 38 in its 48 container, and contained it draws on-primary-container on a flat
  primary-container (was on-surface-variant on surface-container-lowest at level 2).
- The fidelity report's `reference` is a list (one entry per reference snapshot), in `tokens/generated/<id>/fidelity.json`
  and in the MCP server's `list_systems`. `m3-like` is measured against material-web and against androidx's Material 3
  tokens (the five button sizes, the five icon button sizes and the loading indicator);
  `tokens/fidelity/reference/androidx-material3-buttons.json` is now `androidx-material3.json`.

Baselines: the snapshot baselines of the `m3-like` fixtures that draw these parts change, and that is the intended
result of this change. They are recorded again on Linux, not in this change. On the web, 30 of the 101
`packages/web/snapshots/systems/m3-like/` baselines change (measured by rendering every one before and after):
app-bar/small-scrolled, button-group/connected, button/{elevated,filled,outlined,text,tonal}-medium, calendar/range,
callout/closable-title-actions, chat-composer/inline-rtl, code-block/syntax-marked, copy-button/labelled-tonal,
date-time-picker/modal-date-time, dialog/icon, drop-zone/dragged, empty-state/actions, figure/docs-demo-code,
file-picker/drop-area-error, file-upload/drop-area-statuses, image-preview/several-rtl, loading-indicator/contained-medium,
navigation-drawer/collapsed-labels-always, number-field/stacked-required-label-icon, number-input/stacked-unit,
page-header/everything, popover/arrow-actions, search/docked, side-sheet/modal, snackbar/action-closable and
toolbar/floating. The native platforms' `m3-like` baselines of the button, button group, loading indicator and the
fixtures that draw Buttons change too, when those platforms catch up. Every `m3-expressive-like` baseline is removed
with its system.

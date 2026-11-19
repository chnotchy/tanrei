---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/mcp': minor
---

**Breaking — `m3-like` maps Material 3's button sizes to Tanrei's by role, not by name.** Material 3's default button
and icon button is its small size, 40dp (`ButtonSmallTokens`, `SmallIconButtonTokens`), and its top app bar's actions
are icon buttons of that size. Tanrei's default size is `medium`, so `m3-like`'s `medium` is Material's small, 40; its
`small` is Material's extra small, 32, and its `large` Material's medium, 56. Material's large (96) and extra large
(136) are the two sizes `m3-like` adds above them. Before, `medium` was Material's medium (56), so every Button at the
default size was 56 tall where Material draws 40, and the docs site's app bar was 408 px wide in a 390 px window.

What breaks:

- `tanrei.comp.button.size.xsmall` is gone from `m3-like`, with no alias: its 32 is now `small`. `xlarge` is 96 tall
  (was 136) and `xxlarge` (136) joins the vocabulary. `small`, `medium` and `large` are 32, 40 and 56 (were 40, 56
  and 96), each with the leading space, icon size, gap, outline width, label style and icon-only widths of the
  Material size it now stands for. The native constants follow: `TanreiButtonSize.Xxlarge` (Compose),
  `.xxlarge` (SwiftUI), `M3LikeButtonSize.xxlarge` (Flutter) and `xxlarge` (React Native), and no `xsmall`.
- Everything sized from a Button moves with it under `m3-like`: a Button at the default size, the app bar's
  navigation item, brand and actions, and the toolbar's items are 40 (were 56); a host's close button and the
  snackbar's actions are 32 (were 40), where Material draws 40 — the mimicry gap `close-button-size` is open again,
  and `axis-default` is resolved.
- The fidelity map maps androidx's `ButtonXSmallTokens` … `ButtonXLargeTokens` (and the icon button objects) to
  `small` … `xxlarge`, and material-web's single 40px button to `medium`. Every mapped value is still equal.

`tanrei` and `cupertino` do not move: their generated outputs are byte for byte what they were. Baselines: 24 of the
107 `packages/web/snapshots/systems/m3-like/` baselines change, the intended result of this change, found by rendering
every one with the stylesheet before and after the change on one machine and comparing the two renders:
app-bar/small-scrolled, button/{elevated,filled,outlined,text,tonal}-medium, button-group/connected, calendar/range,
callout/closable-title-actions, chat-composer/inline-rtl, code-block/syntax-marked, copy-button/labelled-tonal,
date-time-picker/modal-date-time, dialog/icon, empty-state/actions, figure/docs-demo-code, file-picker/drop-area-error,
file-upload/drop-area-statuses, image-preview/several-rtl, navigation-drawer/collapsed-labels-always,
page-header/everything, popover/arrow-actions, side-sheet/modal and toolbar/floating. They are recorded again on
Linux, not in this change. The native platforms' `m3-like` baselines of the fixtures that draw Buttons change too,
when those platforms catch up.

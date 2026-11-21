---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

App bar: a `context` slot for one control of the product's context after the brand (APB-25) — a Button, or a Button
that opens a Menu, that says and changes the workspace, the project or the design system the screen is in. The bar
places it `comp.app-bar.actions.gap` after the brand's cell (after the navigation item where there is no brand), centred
on the row, before the title block and the actions in reading order, and never restyles it. Additive: nothing changes
for a bar without it, and no token is new. The native platforms do not draw it yet, and their notes say so.

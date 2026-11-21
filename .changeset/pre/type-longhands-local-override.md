---
'@tanrei/web': patch
---

**A type token overridden on one element now reaches the text.** Every component, and `text.css`, `prose.css` and
`base.css`, set its text with `font: var(<role>-font)`, the role's composite. Tokens are declared on the root and a
custom property is resolved where it is declared, so the composite was the root's whatever an element set below it:
`--tanrei-comp-button-label-typescale-medium-font-size: 20px` on one button, or a role's family, weight or line height
set on a section of the page, changed nothing. The text is now set from the role's longhands, read where it is drawn
and composed into `font` there (`font: <role>-font-weight <role>-font-size/<role>-line-height <role>-font-family`), so
one longhand overridden on an instance or a subtree changes that property of the text and nothing else. A component
that keeps a size in private properties keeps one per longhand.

- Nothing is drawn differently by default: the computed family, size, weight, line height, letter spacing, style,
  stretch, variant, feature and variation settings of every element of every fixture are the same as before, in
  Chromium, Firefox and WebKit. The `font` shorthand still resets what a role does not name, so a label does not take
  an icon glyph's variation axes or a table cell's tabular figures from what holds it.
- A longhand a product sets on the root (`--tanrei-sys-typescale-body-font-weight`) now reaches components too; the
  composite carried the build's weight, line height and family, and only the size followed.
- **What broke: setting a role's composite no longer restyles a component.** A product that set
  `--tanrei-comp-badge-label-typescale-font: 500 2rem/1.5 Inter`, on the root or anywhere, saw the badge's label change;
  now it changes nothing, because no component reads the composite. Set the longhands instead (`-font-weight`,
  `-font-size`, `-line-height`, `-font-family`), on the root for every instance or on an element for one. The two
  cannot both hold: the composite's default is declared on the root, so where it is read nothing tells an override of
  it from that default. A style the composite could carry and no longhand names (`italic`) is no longer reachable
  through a role's tokens.
- Enlarged text is drawn as before: at the reader's text size (the root's font size, 200 % included), with the type
  dial turned, and for a size the active design system does not have (each longhand falls back to the default size's),
  every element of every fixture has the same computed type as before, in Chromium, Firefox and WebKit.
- The emphasized weight is a longhand of its own (`-font-weight-emphasized`): text drawn emphasized (a selected tab's
  label, where the system emphasizes it) follows an override of that longhand, not of `-font-weight`.

Reading four tokens where one was read costs bytes: `@tanrei/web/all` grows by about 1.9 kB gzip (to 672.8 kB), and a
component by up to about 0.3 kB (the light-DOM stylesheets most: page header, tree view, description list, accordion,
table). Fifteen bundle budgets are raised to their measured size and 5 % (bottom sheet, callout, carousel, description
list, dialog, embedded text input, FAB menu, file upload, image preview, list row, side sheet, table, table of
contents, toolbar and `all`): a product's override on one instance is part of the token contract, and there is no way
to honour it but to read the longhands where the text is drawn.

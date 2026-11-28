---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio: a rail of the look, the panel it opens, and Inspect.** The four levels (Essentials, Groups, Every
token, Source) are gone.

- **The rail** lists what a layer holds. First the nine rows of the look, in the order of how much of it they change:
  brand color, gray, typeface, size (density and the size unit, with the least target), corners, corner smoothing,
  icons, press feedback and focus. Each says what it holds now and draws a small sample in the layer itself. Then the
  rest: the base system, the eight dials, every palette, each component, every behaviour, your vocabulary, the layer's
  own words, and accessibility. Pressing a row shows its controls in the panel on the right, where Groups' panels now
  stand, each with its row. The row the panel shows is marked as the current one. The file (its id, the checks, copy
  and download) stays at the foot of every panel, and the preview's warnings count opens Accessibility.
- **Lock and shuffle.** Each row has a lock. The bar's **Shuffle** gives every row that is not locked another of its
  usual values, written as that row's own controls write them, in one step to undo. The locks are kept in the browser.
- **Inspect** opens over the panel, wider, at **Tokens** (the token tree and the chosen token's editor, then the
  pattern rules) or **Source** (the layer file). It is a toggle in the bar, and opens at the tab it was last at. A link
  to a token, such as a component's "Every token of it" or a token named in a warning, opens Inspect at that token.
  The panel's width is kept apart for the sections and for each tab of Inspect.
- In a narrow window each list of the rail is one line that scrolls by itself, above the preview and the panel.
- The words are in the six languages.

**Breaking (`mountStudio`'s API).** `setLevel` is gone: `show({ section })` shows a section (`color`, `neutral`,
`typeface`, `size`, `radius`, `smoothing`, `icons`, `press`, `focus`, `base`, `dials`, `palettes`, `components`,
`behavior`, `vocabulary`, `about`, `a11y`), and `show({ inspect: 'tokens' | 'source' })` opens Inspect. `getState()`
reports `section`, `inspect` and `locks` in place of `level`, and `shuffle()` shuffles. The Studio's root says
`data-section` and `data-pane` in place of `data-level`. What the browser keeps changes shape: a section, Inspect's
tab, the locks and a width for each pane.

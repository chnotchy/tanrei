---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Figure: a ground pattern behind what is shown (`pattern`, FIG-26).

- **The prop.** `pattern` is `none` (the default), `grid` (a hairline every `comp.figure.pattern.spacing`, across and
  down), `dots` (a dot of `pattern.dot-size` at every crossing of that grid), `grid-fade` (the grid, clear around the
  stage's centre to `pattern.clear-extent` of the way to its corners and at full strength at the corners — the ground
  the documentation's live examples have always had) or `checkerboard` (squares of `pattern.checkerboard-size`, for a
  picture that may be transparent). It is drawn across the stage over the look's fill and under the content, centred,
  still while the content scrolls and the same in either direction.
- **Decoration only.** No element, no input, nothing exposed to assistive technology. It is drawn in
  `surface-container-highest`, a step from both fills that a raised contrast level leaves as it is, so it is seen in
  every scheme and never louder than the content; on-surface text and the focus indicator are held against that role by
  the token invariants. The plain look draws none, and forced colors remove it (FIG-20). A value the figure does not
  define draws none and is reported in debug builds.
- **Tokens.** New in `tanrei.comp.figure`: `pattern.color`, `pattern.spacing`, `pattern.line-thickness`,
  `pattern.dot-size`, `pattern.checkerboard-size` and `pattern.clear-extent` (the vocabulary grows by these six). The
  rule that a ground pattern is the product's decoration is replaced by this prop.
- **Web.** `<tanrei-figure pattern="grid">`: the stage's own `background-image`, drawn by `@tanrei/web/figure.css`
  before and without script; the values are read on the stage, so a stage scoped to another system draws that system's
  pattern on its fill. A look a design system adds draws its pattern on its own fill. The React wrapper passes `pattern`
  through.
- **Native platforms.** Planned: each spec entry names `pattern` in its planned API; nothing is drawn yet.
- **Baselines.** New fixtures `pattern-grid`, `pattern-dots`, `pattern-grid-fade`, `pattern-checkerboard`,
  `filled-pattern-grid`, `filled-pattern-dots`, `plain-pattern-grid`, `title-pattern-grid-fade` and `pattern-dots-rtl`.
  The fixtures `docs-demo`, `docs-demo-code` and `docs-demo-system` now carry `pattern: grid-fade`, as the documentation
  draws them, and their baselines change for that reason (the default system's and each preset's).
- **Documentation.** The live examples (`DemoFrame`) and the landing page's specimen draw their grid with the Figure's
  `grid-fade` pattern instead of a hand-drawn layer; the figure page shows the five patterns and when to use each.

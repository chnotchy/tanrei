---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
---

**A type role reaches web CSS as its longhands only: the composite `--…-<role>-font` is gone.** No component, and none
of `text.css`, `prose.css` or `base.css`, read it any more, so a product that set one changed nothing and could not tell.
The token pipeline no longer writes it, for a role of `sys.typescale` or for a component's text that aliases one
(`--tanrei-comp-button-label-typescale-medium-font`); every other property of a role is written as before: `-font-family`,
`-font-size`, `-font-weight`, `-line-height`, `-letter-spacing` and, for a role, `-font-weight-emphasized`. The
typography token itself is unchanged, and so are the native outputs, the DTCG outputs and the Tailwind theme, none of
which read the CSS composite.

- **What broke: `var(--…-<role>-font)` is no longer defined.** A rule that set its text with
  `font: var(--tanrei-sys-typescale-body-font)` now takes its parent's font. Compose `font` from the longhands where the
  text is drawn —
  `font: var(--tanrei-sys-typescale-body-font-weight) var(--tanrei-sys-typescale-body-font-size)/var(--tanrei-sys-typescale-body-line-height) var(--tanrei-sys-typescale-body-font-family)`,
  with `letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing)` beside it — or use `text.css`
  (`class="tanrei-text-body"`). A product that set a composite sets the longhands instead, one at a time, on the root
  for every instance or on an element for one.
- Italic is not a token: no role sets a style. It is the text's own (`em`, or `font-style: italic` on the element).
- No component and no test fixture is drawn differently: every reader of a composite in the documentation site, Theme
  Studio and the tests now composes the same `font` from the longhands. The documentation's examples set their text
  with the `text.css` utilities, which set the role whole, so the headings in the Card and Inline code examples now
  take their role's letter spacing (−0.01em, −0.025em), which the composite never carried. The pages on typography,
  the typescale tokens and getting started on the web say that a style is changed one longhand at a time.

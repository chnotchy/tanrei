---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Snackbar: a snackbar may stand at the top end of the window. `placement` is `bottom` (the default, unchanged) or
`top-end`.

At `top-end` the bar stands at the top of the window on the end side (the top right, the top left in a right-to-left
layout), the container margin below the top edge and from the end edge, inside the safe area and below a sticky header,
so that it never covers the top app bar. In a compact window it stands across the top instead. It comes down from above
the top edge while fading in (the mirror of the rise at the bottom), fades out in place, and an expanded bar grows
downward with its top edge in place. One snackbar at a time, as before, and never a stack; the focus order and the
announcement do not change.

- Web: `placement` is a property and attribute of `<tanrei-snackbar>` and of `<tanrei-snackbar-host>`, whose own
  placement is that of each snackbar whose `show()` options name none; `show()` takes `placement`. The sticky header's
  height is read from `--tanrei-app-shell-scroll-offset` on the document's root, which `<tanrei-app-shell>` sets and a
  product's own frame may set. Drawn in place, a top-end snackbar stands at the end of the width it is given.
- React: `SnackbarHost` takes `placement`.
- New token: `comp.snackbar.breakpoint.medium` (`--tanrei-comp-snackbar-breakpoint-medium`), the window width below
  which a top-end snackbar stands across the top; it aliases `sys.breakpoint.medium` (600 in the default system).

SwiftUI, Compose, Flutter and React Native receive the new token and do not have the placement yet; they stay lagging.
Baselines: three new web fixtures, `top-end`, `top-end-rtl` and `top-end-compact`; no existing baseline changes.

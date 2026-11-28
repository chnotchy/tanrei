---
'@tanrei/web': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
---

Breaking: the tabs' `active-indicator.height` token is removed (`--tanrei-comp-tabs-active-indicator-height` on the web,
`activeIndicatorHeight` in the tabs' tokens on the native platforms). No platform read it: the active indicator is as
tall as the row less `track.padding` above and below. The documentation's measure figure of the tabs labelled the
indicator with it and found it drawn at another length. The size prop's description now gives the rows' heights the
tokens give, 28 and 36 in the default system, in place of 36 and 48.

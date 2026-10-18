---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/docs': patch
---

Meter, a new component: where a known value stands in a known range — storage used, a battery's charge, a quota, a
password's strength — as a bar or a ring that looks like the progress indicator, without saying that anything is under
way.

- Web: `<tanrei-meter>` (`variant`, `size`, `separation`, `status`, `value`, `min`, `max`, `label`, `value-text`);
  React: `Meter`. The host is a meter (`role="meter"`, `aria-valuemin`, `-max`, `-now`, `aria-valuetext`), never a
  progressbar and never busy. SwiftUI, Compose, Flutter and React Native are planned: their generated tokens carry
  `comp.meter`, and no component yet.
- `status` (`default`, `info`, `success`, `warning`, `error`) changes the indicator's color and nothing else. The meter
  has no thresholds: the product decides what a value means, and says it in `valueText` too.
- Tokens: `comp.meter`. Its sizes, track, separation, stop indicator, default indicator color and motion alias the
  progress indicator's, so the two match side by side and a layer can set either apart; the four status colors are the
  status roles.
- The token build holds every meter indicator color — the default and the four statuses — 3:1 against the meter's track
  and against every surface role, in every scheme (WCAG 1.4.11).
- The progress indicator's determinate drawing is now a shared web primitive; nothing it draws changes.
- Baselines: new images for the meter's 18 fixtures, and one per preset — new, not changed.

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

Rating, a new component: a score out of a few marks — stars by default — that a person gives, or a score already given
(an average, a review's score), in whole marks or, where the product allows it, in halves.

- Web: `<tanrei-rating>` (`value`, `max`, `allow-half`, `size`, `icon`, `label`, `option-labels`, `value-text`,
  `read-only`, `disabled`, `name`; `change` and `preview`); React: `Rating`. SwiftUI, Compose, Flutter and React Native
  are planned: their generated tokens carry `comp.rating`, and no component yet.
- What it is to assistive technology follows the number of choices (WAI-ARIA APG): whole marks up to seven are a radio
  group with the radio group's keys; halves, or more than seven marks, a slider; read-only, one image named by `label`
  and described by `value-text`. A read-only rating shows halves whatever `allow-half` says.
- No input takes a score back to none: a press on the score already given changes nothing. A product that needs it
  places a Button beside the rating.
- New vocabulary: `comp.rating` — per size the mark (the icon sizes) and the round container behind it (28 / 32 / 40),
  the container's corner, and for each condition (unselected, selected) the container, mark and state-layer colors, and
  the motion of a state, a change of score and a press. The unselected mark is `sys.color.outline` (3:1 against the
  surface), the selected one `sys.color.primary`. The default system's rules keep the round state layer invisible when
  disabled, as the radio button's.

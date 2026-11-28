---
'@tanrei/web': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
---

**Motion by role, one appearance, and an accelerating exit.** New core tokens name how long a change takes and how it
eases by what moves, and where everything that appears starts from. Nothing drawn changes yet: no component reads them
in this release.

- `tanrei.sys.motion.role.*` (21 durations, following `dial.motion.unit`): `state.{compact,default,large}` 200 / 250 /
  250 ms, `selection.{mark,travel}` 250 / 250, `resize.{default,large}` 300 / 400, `disclosure` 400,
  `appear.{hint,anchored,modal,sheet,toast}.{enter,exit}` 250/200, 300/250, 350/300, 400/350, 350/300, `feedback` 450,
  `show-delay` 300, `reduced` 100. A component's duration token is to alias its role, so a product re-times every
  component of a role in one line.
- `tanrei.sys.motion.easing.{enter,exit,state,spatial}`: the default system enters, changes state and moves on the
  standard curve, `cubic-bezier(0.2, 0, 0, 1)`, and leaves on the accelerating one, `cubic-bezier(0.3, 0, 1, 1)`.
- `tanrei.sys.behavior.appearance` — `fade-scale` (the default system: fade in, grow from 0.96), `fade`, `fade-slide`,
  `blur-slide`, `unfold` — sets `tanrei.sys.motion.appear.{opacity,scale,distance,blur}`; `appear.origin` (`anchor` |
  `center`) says where an anchored surface grows from. A layer chooses the appearance, or pins one of the values.
- The rule language has a ninth function, `pick`: one value per name of a choice of kind, and the token takes the one
  the system's choice names. A pin holds against it as it does against a dial.
- `m3-like` states Material 3's durations and emphasized curves for every role and
  chooses `unfold`, so it draws the same when its components take their roles. `cupertino` takes the root's.
- The vocabulary grows by 31 ids (`tokens/vocabulary.lock.json`). The Figma plan documents the role durations and the
  appear values as numbers without a scope. The native platforms' generated system types gain `appearance` and the four
  easing roles.
- `docs/architecture/motion.md` states the principles every component's motion is held to (MOT-1 to MOT-6).

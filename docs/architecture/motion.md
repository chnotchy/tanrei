# Motion

How Tanrei moves: the principles every component's motion is held to, and the tokens it is made of. A component's spec
names the role of each change it animates; this page says what a role is and what holds for every one of them.

## Principles

Every component is held to these, on every platform. They are written in EARS form like a spec's behaviour, and a spec
cites them by id rather than restating them.

- **MOT-1** — WHEN a component's visible state, size or presence changes because of a person's act, a prop or its
  content THE component SHALL animate the change over the motion role its spec names, and SHALL make it at once only
  where its spec keeps that change instant or the change is the component's first frame (MOT-3).
- **MOT-2** — THE component SHALL draw no frame whose painted value lies outside the path from the value shown to the
  end value — no flash of another color, no frame of another state, no jump at the start or the end of a motion — and a
  motion that is turned round SHALL go on from the value then shown. The last frame of a surface that leaves on an
  accelerating curve (`sys.motion.easing.exit`) is the one exception at the end: it may still hold a little of the
  surface (about 7–9 % of its opacity at 250–350 ms under the default system) when the surface is taken away.
- **MOT-3** — WHEN a component is first drawn THE component SHALL draw its first frame in the state its props,
  attributes, content and the components around it give it, and SHALL run no transition into that state. An overlay
  mounted open is the one exception and follows MOT-4.
- **MOT-4** — WHEN an overlay is mounted with open true THE overlay SHALL appear without its enter motion while the
  document has not yet been first painted, and SHALL play its enter motion when it is mounted after that.
- **MOT-5** — WHEN a box changes its size because its content changed THE box SHALL change its size in its layout at
  every frame, keeping its content fixed to the box's anchor edge (its start by default; its end where the box is docked
  to its container's end), and nothing inside it SHALL scroll during the motion.
- **MOT-6** — WHERE motion is reduced THE component SHALL replace every movement, scaling and blur with a change of
  opacity over `sys.motion.role.reduced`, and SHALL make changes of size at once. (WCAG 2.3.3 counts an element that
  moves into place or changes its size as it appears as motion, and a change of color or opacity as none.)

Under MOT-2 a surface that appears and leaves runs one path both ways: it leaves the way it came, and a surface turned
round in the middle of either goes back from where it is.

## Durations by role

How long a change takes is decided by what moves — its **role** — not by a step of the duration scale. A component's
duration token aliases its role (`tanrei.comp.menu.motion.…` → `tanrei.sys.motion.role.appear.anchored.enter`), so
every component of one role keeps one pace, and a product re-times a role in one line of its layer. Every component
duration and curve that a role describes aliases it; a state duration may follow the component's size
(`tanrei.comp.button.motion.state-duration.small` → `role.state.compact`). What no role describes keeps a step of the
scale: a cycle (a loading indicator's turn, a skeleton's pulse), a progress bar moving to its value, a scroll, a zoom
or a page that slides into place, and a wait (a
delay, a repeat interval). A preset that keeps another design system's motion pins a component token, with its reason,
where that system times the component otherwise than its role. The roles follow
`tanrei.dial.motion.unit`, so the dial still re-times everything.

| Role | Default system | What moves |
|---|---|---|
| `role.state.compact` · `.default` · `.large` | 200 · 250 · 250 ms | A change of state of a small control, a control of medium size, a large surface |
| `role.selection.mark` · `.travel` | 250 · 250 ms | A mark that appears in place; a selection that travels (a switch's handle, an indicator) |
| `role.resize.default` · `.large` | 300 · 400 ms | A box that changes its size in place; a large change of size |
| `role.disclosure` | 400 ms | Content that opens and closes in place |
| `role.appear.hint` | 250 / 200 ms | A tooltip appears / leaves |
| `role.appear.anchored` | 300 / 250 ms | A menu, a list, a popover, a docked picker |
| `role.appear.modal` | 350 / 300 ms | A dialog, a modal picker, an image preview, and the scrim behind them |
| `role.appear.sheet` | 400 / 350 ms | A bottom sheet, a side sheet, a modal drawer |
| `role.appear.toast` | 350 / 300 ms | A snackbar |
| `role.feedback` | 450 ms | A ripple |
| `role.show-delay` | 300 ms | How long a loading indicator or a skeleton waits before it appears |
| `role.reduced` | 100 ms | The cross-fade that replaces a motion under MOT-6 |

A surface leaves faster than it appears.

## Curves by role

`tanrei.sys.motion.easing.{enter, exit, state, spatial}` alias a curve of the scale. A component eases a change by
the role of the change: a surface that appears by `enter`, one that leaves by `exit`, a change of state in place by
`state`, something that moves or resizes in place by `spatial`. Under the default system `enter`, `state` and
`spatial` are the standard curve, `cubic-bezier(0.2, 0, 0, 1)`, and `exit` is the accelerating one,
`cubic-bezier(0.3, 0, 1, 1)`: a surface that leaves gathers speed and is gone (MOT-2 says what its last frame may
hold).

## One appearance

Every surface that appears — a menu, a select's list, a popover, a tooltip, a dialog, a snackbar — starts from the same
place: `tanrei.sys.motion.appear.{opacity, scale, distance, blur}`, and grows from `appear.origin` (its anchor, or its
own centre). A modal surface grows from its centre. A sheet slides in from its edge whatever the appearance.

The values are set by one choice of kind, `tanrei.sys.behavior.appearance`:

| Appearance | Opacity | Scale | Distance | Blur |
|---|---|---|---|---|
| `fade-scale` (the default system) | 0 | 0.96 | 0 | 0 |
| `fade` | 0 | 1 | 0 | 0 |
| `fade-slide` | 0 | 1 | `sys.space.space100` | 0 |
| `blur-slide` | 0 | 1 | `sys.space.space100` | 4 px |
| `unfold` | 0 | 0, along the axis that leaves the anchor | 0 | 0 |

Each `appear.*` token is derived by a `pick` rule: one value per name of the choice, and the token takes the one the
system's choice names. A layer that sets the appearance gets the values that go with it; a layer that pins one of them
keeps its pin whatever the appearance, as a pin holds against a dial. A component that must start from somewhere else
says so with a component token of its own that aliases the system's.

## The presets

`m3-like` states Material 3's durations for every role, its emphasized curves for `enter` and `exit`, its fast spatial
spring's curve for `spatial`, and `unfold`. `cupertino` states no motion of its own and takes the root's.

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
  surface (about 7–9 % of its opacity at 250–350 ms under the default system) when the surface is taken away. A scrim
  is not such a surface (MOT-8).
- **MOT-3** — WHEN a component is first drawn THE component SHALL draw its first frame in the state its props,
  attributes, content and the components around it give it, and SHALL run no transition into that state. An overlay
  mounted open is the one exception and follows MOT-4.
- **MOT-4** — WHEN an overlay is mounted with open true THE overlay SHALL appear without its enter motion while the
  document has not yet been first painted, and SHALL play its enter motion when it is mounted after that.
- **MOT-5** — WHEN a box changes its size because its content changed THE box SHALL change its size in its layout at
  every frame, keeping its content fixed to the box's anchor edge (its start by default; its end where the box is docked
  to its container's end), and nothing inside it SHALL scroll during the motion.
- **MOT-6** — WHERE motion is reduced — by the person's setting on their platform, or by the product's own setting in
  the app ([Reduced motion](#reduced-motion)) — THE component SHALL replace every movement, scaling and blur with a
  change of opacity over `sys.motion.role.reduced`, and SHALL make changes of size at once. (WCAG 2.3.3 counts an
  element that moves into place or changes its size as it appears as motion, and a change of color or opacity as none.)
- **MOT-7** — WHILE a surface that appears and is taken away again (a menu, a popover, a tooltip, a snackbar, a dialog,
  a sheet) is closed or leaving THE surface SHALL take no pointer input: a press where it is still drawn SHALL reach
  what lies under it, and a pointer on it SHALL NOT be hover. WHEN it is told to open again while it leaves THE surface
  SHALL take pointer input again at once, while it enters. WHILE a modal surface leaves, its scrim SHALL take no pointer
  input either, and what it made inert SHALL no longer be inert, so that the press reaches the page and focus goes back
  when the surface closes (MDL-5), not when its motion ends. A surface that is not taken away but becomes part of the
  page as it closes (a collapsible navigation drawer, which narrows back to its column) is none of these.
- **MOT-8** — WHEN a surface that draws a scrim begins to close THE component SHALL draw its scrim at no opacity, and
  without its blur, from the first frame of the closing, at once, whatever motion the surface leaves by and whether or
  not motion is reduced; WHEN it opens THE component SHALL fade the scrim in over its enter motion (MOT-6 where motion is
  reduced); WHEN a closing is turned round THE component SHALL fade the scrim in again from no opacity. WHEN a surface
  that stays open stops being drawn over the content (a drawer whose presentation becomes standard) THE component SHALL
  take its scrim away at once; WHEN it comes to be drawn over the content while open, THE component SHALL draw the scrim
  at once. A scrim SHALL never be eased by the exit curve. (From the first frame of a closing the scrim takes no press
  (MOT-7) and what it covered is no longer inert: a scrim still drawn would show a barrier that is gone. Faded on the
  exit curve, which gathers speed, it stayed almost whole for most of the exit and then vanished.)

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

## Reduced motion

Motion is reduced (MOT-6) where either of two settings says so:

- **The person's**, on their platform: the operating system's or the browser's reduce-motion setting.
- **The product's**, in the app: a product that offers its own "reduce motion" setting, or that reduces motion on a
  screen of its own, says so once for the whole app, in the platform's idiom for an app-wide setting.

The two are one condition, and every component answers it the same way, whichever set it. The product's setting can
only add to the person's: there is no value that turns motion back on where the person asked for less (WCAG 2.3.3).

| Platform | The person's setting | The product's setting | Owed |
|---|---|---|---|
| Web | `prefers-reduced-motion: reduce` | `data-tanrei-motion="reduce"` on the root element (`<html>`) | — |
| SwiftUI | `\.accessibilityReduceMotion` | an environment value set once at the root of the app's scene | the environment value, read wherever `\.accessibilityReduceMotion` is read now (`TanreiMotion` and each component that reads it) |
| Jetpack Compose | the animator duration scale ("Remove animations"), as the composition's `MotionDurationScale` | a `CompositionLocal` provided once at the root of the app's content | the local, read by `tanreiMotionReduced()` and by every transition, which today follows the duration scale alone |
| Flutter | `MediaQuery.disableAnimations` | the same `MediaQuery`, which an app overrides above its widgets (`MediaQuery(data: … .copyWith(disableAnimations: true))`) | nothing new: a component reads `MediaQuery.disableAnimationsOf(context)` wherever it moves, never the platform's setting directly |
| React Native | `AccessibilityInfo.isReduceMotionEnabled()` | a prop of `TanreiProvider` | the prop, read by `useReduceMotion()` and `useReduceMotionSetting()` (the product's answer needs no wait) |

On the web the root's tokens say either setting as one inherited value, `--tanrei-motion: reduce` (the generated
`tokens.css`: under the media query, and under the attribute). A component's reduced form is written once and drawn
under both the media query and a style container query of that value (`reducedMotion()`, `src/styles/motion.ts`); a
motion played from script asks `motionReduced()` and follows a change with `watchMotionReduced()`
(`src/primitives/motion.ts`). A browser without style container queries answers the media query alone: there the
attribute reduces only the motions played from script.

## The first frames on the web

How the web package keeps MOT-3 and MOT-4 (`packages/web/src/primitives/motion.ts`, `src/styles/motion.ts`,
`src/primitives/modal-exit.ts`):

- **Settling.** Every element carries `data-tanrei-settling` from each time it is connected until two frames after its
  first update there: the frame its first render is drawn in, and the one after it, where a state it measured in a
  frame callback or a resize observer is written. Meanwhile nothing in it starts a transition
  (`transition-property: none`, never a zero duration, which still runs a transition that has a delay). The element a
  surface's entrance moves (`data-tanrei-appear`) is left alone: its entrance is MOT-4's to play or skip.
- **Layout is forced before settling ends.** The elements that ask in one frame are let go together, by one pair of
  frame callbacks, and before they are let go the document is laid out once. A state written after the last frame drawn
  while they settled — in a task between two frames (an image preview's zoom-in control, enabled when its picture has
  loaded) or in an earlier callback of the same frame — is then styled while transitions are still off, not in the same
  pass as the change that turns them back on, which would move it from the state before it. The layout is one the frame
  was about to make; letting go then changes only `transition-property`.
- **The first paint.** The document counts as painted at the second frame callback after it has been parsed (a module
  that arrives later trusts Paint Timing where the browser reports a paint). An overlay mounted open before then
  appears at once: the element its entrance moves starts no transition until that paint, from the update that renders
  it. Mounted after it, the overlay plays its entrance.
- **A modal's scrim is kept quiet until the first paint.** A modal `<dialog>` opened before the first paint is opened
  at once, and its `::backdrop` starts no transition until that paint: WebKit can start the scrim's entrance from its
  `@starting-style` again when the component lays the dialog out anew in the task that opened it (a dialog or a side
  sheet whose actions are stacked), and the scrim would fade in as the page loads.

Two sweeps hold every fixture to this: `src/first-frame-all.test.ts` makes each fixture appear on a page that is
already there and compares its first frame with its rest, and `src/written-open-all.test.ts` loads each fixture written
open (and, where the harness draws a surface in place, the real overlay it stands for) by a navigation and counts every
transition and animation that starts before the page is at rest.

## A surface that leaves, on the web

How the web package keeps MOT-7. The rule is in the appearance itself, so that a surface drawn with it cannot leave it
out: `appearStyles()` (`packages/web/src/primitives/motion.ts`) gives the motion element, the box round it that holds
its open state (`box`: an anchored surface's placed box, a tooltip's, the dialog round an image preview's pages), and
everything inside them `pointer-events: none` wherever its open condition does not match — closed, and from the moment
it is told to close until it is told to open again. A modal `<dialog>` is closed with `closeModal()`
(`src/primitives/modal-exit.ts`): it is no longer modal at once, as HTML closes a dialog — the page is no longer inert,
and focus goes back to the opener in the same task — and while it is still drawn in the top layer for its exit it is
inert, takes no pointer, and its `::backdrop` takes none. A modal surface cannot stay modal until its exit ends: what a
modal dialog blocks is inert, and an inert element cannot take focus, which goes back when it closes (MDL-5).

A box that holds the surface but stands outside its shadow root is its component's to close for the pointer: a
snackbar's host, shown as a popover round its bar, takes no pointer itself; a FAB menu's list, round the items, takes
none while they leave. A surface that does not move with `appearStyles()` takes none while it leaves by its own rule
or by being inert (a docked date-time picker, a search's docked view, a standard sheet): HTML has hit-testing treat an
inert element as `pointer-events: none`. `src/primitives/motion.test.ts` holds the rule for the appearance, and
`src/primitives/modal-exit.test.ts` for every modal surface.

## The presets

`m3-like` states Material 3's durations for every role, its emphasized curves for `enter` and `exit`, its fast spatial
spring's curve for `spatial`, and `unfold`. `cupertino` states no motion of its own and takes the root's.

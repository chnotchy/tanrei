---
'@tanrei/web': minor
---

Reduced motion can be set from inside the app. `<html data-tanrei-motion="reduce">` reduces motion in every component
exactly as `prefers-reduced-motion: reduce` does: no movement, scaling or blur, a cross-fade over
`sys.motion.role.reduced` in their place, and sizes that change at once — in the components' styles and in the motions
they play from script (a carousel's autoplay, a marquee, a sheet's drag, a scroll). It is read as it changes, and it can
only reduce motion: no value turns it back on where the person asked for less. `tokens.css` says either setting as one
inherited value, `--tanrei-motion: reduce`, and the components read it with a style container query; a browser without
style container queries follows the media query alone, and the attribute only for motion played from script.

Nothing breaks: under the media query every component draws what it drew before. Inside the package each component's
reduced rules are now written once, inside `reducedMotion()`, and a motion played from script asks `motionReduced()`
or follows `watchMotionReduced()`, in place of the components' own media queries and `matchMedia` reads.

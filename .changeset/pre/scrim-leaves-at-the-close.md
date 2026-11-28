---
'@tanrei/web': minor
---

A scrim leaves at once when its surface closes (MOT-8, a new motion principle), on every surface that draws one: the
modal layer, the dialog (centred and as a sheet), the modal bottom and side sheets, the modal date-time picker, the
popover shown as a sheet, the search's dialog view and the modal navigation drawer, inside an app shell and outside one.
From the first frame of a closing the scrim is drawn at no opacity, without its blur, and takes no press, while the
surface itself still leaves by its own motion; it fades in as before when the surface opens, and fades in again from no
opacity when a closing is turned round. A drawer whose presentation over the content ends because the window became
wide enough also takes its scrim away at once. **Breaking** (a motion 0.1.0-next.0 shipped): the scrim no longer fades
out over the surface's exit motion. That fade ran on the exit curve, which gathers speed, so the scrim stayed almost
fully dark while the surface left and then vanished, after the page under it had already been given back.

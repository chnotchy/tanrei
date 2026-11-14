---
'@tanrei/web': patch
---

A menu, or a docked date-time picker, whose anchor is taken out of the page before the first frame after it opened now
closes with the reason `anchor-hidden`, as MNU-65 and DTM-51 say. The follower that tells it its anchor went learned
which anchor it stood against only in that first frame, so an anchor removed sooner was found by its id no longer and
by nothing else: the surface stayed open with nothing beside it. `FollowController.start()` now remembers the anchor
it starts from.

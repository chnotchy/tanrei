---
'@tanrei/web': minor
---

Tag group: when a member is added, removed or changes its size, the members whose place changes now move there from
where they were drawn, along their line or from one line to another, instead of jumping. The motion is timed by two new
component tokens, `tanrei.comp.tag-group.motion.move-duration` (`sys.motion.role.selection.travel`) and `move-easing`
(`sys.motion.easing.spatial`). A line that keeps the same members follows the change at once, so a filter chip that
grows with its own selection motion carries the chips after it. A new member appears and a removed one leaves at once.
Reduced motion, a change of the group's width, direction or gaps, and the group's first frames place every member at
once, as before. What broke: TGR-10 no longer says the group places its members at once, and a test that read a
member's place in the frame after such a change now reads it mid-move; wait for the motion to end first.

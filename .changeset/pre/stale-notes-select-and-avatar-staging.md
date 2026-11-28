---
---

The select's web note no longer says the element draws its own label row, requirement mark and supporting row, or
that its `toggle` still bubbles: the select field frames it, and its `toggle` is composed and not bubbling. It counts
the seven frame attributes a debug build reports. The web test harness stops wrapping the avatar group's
right-to-left fixture in a right-to-left box of its own, since the fixture names its direction. No change to what the
packages ship.

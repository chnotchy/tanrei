---
'@tanrei/tokens-build': patch
'@tanrei/web': patch
---

The segmented button's `container.height` is the set's height. A segment is that height less `set.padding` above and
below. The token's description, SEG-32 and the web component's description said that every segment was
`container.height` tall too, which held only where the set does not inset its segments. cupertino insets them: its
medium set is 32 and its segments are 28. No token value and no drawn pixel changes.

The segmented button page no longer lists cupertino's small and medium sets as 30 and 34 tall. They are 28 and 32
since the cupertino segments' block padding was corrected.

---
'@tanrei/web': patch
---

Date and time picker: a picker drawn in place with the `inline` test attribute takes the room of the box it stands
in. It used to be capped at that box less the modal picker's margins, which belong to the window: at a phone's width,
in a box with padding of its own, a modal picker in the dial mode was 32 px narrower than its parts and its period
selector was cut off at the surface's edge. A picker that opens over the page is unchanged.

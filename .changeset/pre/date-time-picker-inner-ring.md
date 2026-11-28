---
'@tanrei/web': patch
---

Date and time picker: on the 24-hour dial, the handle no longer lies over the hours beside it.

- The inner ring (12 to 23) stood 48 px inside the outer one, half its radius, so neighbouring inner hours stood
  24.8 px apart and the 48 px handle on 19 lay over half of 20. The inner ring now stands where two neighbouring
  hours on it are as far apart as the two rings are (the outer radius over 1 + 2 sin 15°: 63.3 px of 96 by default),
  as Material 3's 24-hour dial gives its rings room (101 and 69 of 128). With the handle on any hour, every other
  number's centre is at least 32 px from the handle's centre, half the handle and half the label's size (DTM-23).
- The number under the handle is drawn once, by the copy inside the handle in `dial.selected-label.color`; the dial's
  own number beneath, wholly covered, is no longer drawn (DTM-24).
- The handle's arm and the copy inside it are now points at the dial's centre rather than boxes the size of the dial,
  which a contrast check took for something drawn over every number: the dial's numbers, and the number on the
  handle, are now checked for contrast.

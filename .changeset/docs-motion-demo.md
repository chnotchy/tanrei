---
'@tanrei/docs': patch
---

Documentation site: a motion demo, which plays a component's own motion on the live component in the example frame,
on the pages of the switch (its handle's travel), the tabs (the indicator's slide) and the accordion (an item opening),
in the six languages.

- It plays once, when it comes into view, from one of the component's fixtures to another, and never in a loop; "Play
  again" plays it from the start.
- "Slow motion" plays it at a quarter of the speed: every duration of the component's motion is stretched on its
  custom property, and an animation its script starts at an unstretched duration is slowed by its playback rate.
- The caption names the motion, its milliseconds and the motion role it stands for, read from the tokens in the
  design system chosen in the header.
- Where the device asks for reduced motion it shows where the motion ends, still, says why, and nothing in it runs.

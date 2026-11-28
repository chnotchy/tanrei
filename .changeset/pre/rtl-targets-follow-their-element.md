---
'@tanrei/web': patch
---

**A minimum target is centred in its own direction.** A control whose hit area reaches past what it draws centred
that area by the component's direction rather than its own, so a control laid out left to right inside a
right-to-left component had its hit area a half target toward its inline end, over the gap to its neighbour: in a
right-to-left time picker, a press in the gap nearer the minute selector went to the hour selector. The centring now
follows the control's own direction (`:dir(rtl)`), in every component that draws a minimum target; no picture changes.

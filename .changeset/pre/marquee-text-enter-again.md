---
'@tanrei/web': patch
---

Marquee text: a pointer that enters the line (or the control it stands in) again while it is already over it is no new
trigger, and the line no longer decides again on it, as a leave without a hover was already nothing. Chromium sends an
element the pointer rests on its boundary events again; the line now leaves what it plays or holds as it is. No change to
the API, the tokens or any baseline.

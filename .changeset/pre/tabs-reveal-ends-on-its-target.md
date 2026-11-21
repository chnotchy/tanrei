---
'@tanrei/web': patch
---

Tabs: a reveal, the scroll that brings a tab into view over the indicator's motion, now always ends on its scroll
position itself. Its last frame wrote the curve's value there, and an engine may call a motion finished while its
progress is still a hair under 1 (WebKit, within its timing tolerance: 0.9999999999999999). WebKit also keeps whole
scroll offsets, so the tabs could come to rest a pixel short of their position and stay there. The last frame now writes
the position itself.

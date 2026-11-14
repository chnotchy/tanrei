---
'@tanrei/mcp': minor
'@tanrei/tokens-build': minor
---

**`cupertino` is measured against Apple's Human Interface Guidelines.** Its fidelity map
(`tokens/fidelity/cupertino.fidelity.json`) compares it with the figures the guidelines publish — the control sizes,
the iOS text styles at the default Dynamic Type size, and the system colors its accent and statuses stand for — read
from the guidelines' render data into `tokens/fidelity/reference/apple-hig.json`. The result is
`tokens/generated/cupertino/fidelity.json`, and the MCP server's system summary now reports it: 36 of 52 figures equal.
The 16 that differ are listed in the map as open findings; no cupertino value changed. What cupertino sets and Apple
gives no figure for (corner radii, control heights, shadows, the pressed dimming, the neutral roles) is named in the map.

The fidelity harness gains what this needed: a section's reference prefix, single figures (`values`), an `outside`
list of reference tokens a preset does not reproduce (each with its reason, not counted), and `findings`, differences
awaiting a decision that still count against the number. Every fidelity report gains an `outside` list.

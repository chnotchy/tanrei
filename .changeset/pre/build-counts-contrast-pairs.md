---
'@tanrei/cli': minor
---

The token build reports how many contrast pairs it checked, in each scheme. Every `a11y-report.json` — a product's in
the `tokens` output of `tanrei build`, and each shipped system's in the repository — has a `checked` field: `rolePairs`,
the pairs of color roles (each foreground role on every background it may sit on, the tonal and declared pairs, and the
hairline and an input's edge in the raised-contrast schemes), and `componentPairs`, the pairs of a component's own
colors (a focus indicator on its own bar, the snackbar's inverse status forms, code, a radio's mark, a link told from
text by color), as totals and per scheme. A pair whose colors a role pair already holds, or that the system does not
have, is neither measured nor counted. The default system now has a report of its own, `tokens/generated/a11y-report.json`
(`criteria: "enforced"`): 826 role pairs across its six schemes (127 at standard contrast, 143 at medium and at high)
and 888 component pairs (148 per scheme), none failing. The build's output prints the same count.

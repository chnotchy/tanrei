---
'@tanrei/web': minor
---

**A tab's covered copy of its icon and label are parts: `covered-icon` and `covered-label`.** Where the active
indicator covers a tab, the tab draws its icon and label again on it, in the covered colors (`covered-icon.color`,
`covered-label.color`), and cuts the indicator's shape out of the ones under it. The Tabs spec now names the two copies
in its anatomy, and `<tanrei-tab>` exports them: `tanrei-tab::part(covered-label)` styles the label drawn on the
indicator, as `::part(label)` styles the one beside it. Nothing a tab draws changes.

The docs' color role figure reads them: the Tabs page's rows for the covered icon and label are the colors drawn on the
selected tab, with their contrast against the indicator.

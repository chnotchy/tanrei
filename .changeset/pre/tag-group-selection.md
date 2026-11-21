---
'@tanrei/web': minor
'@tanrei/react': minor
---

Tag group: `selection` (`none`, the default, `single` or `multiple`) makes the group hold the selection of its filter
chips, named by each chip's new `value`: `value` is the chip that is on (single; `null` for none), `values` the chips
that are on (multiple). The group sets each filter chip's `selected`; when a person switches a chip it sets `value` or
`values` and fires one `change` with `detail.value` or `detail.values` — the chip's own `change` stops at the group. A
single selection can be emptied by switching its chip off, since each chip is a toggle. With a selection the set is one
Tab stop, and the arrow keys (the way they point, also right to left), Home and End move between its chips without
switching anything; removing an entered item still moves focus to the next chip, which becomes the set's stop. The
group stays a list and each chip keeps its pressed state. React's `TagGroup` takes `onChange`.

Nothing changes for an existing group: `selection` defaults to `none`. Under a selection, the filter chips' own
`change` no longer reaches listeners on the group or above it, and the group's `value` or `values` decides each filter
chip's `selected`. New baselines: tag group `chips-filters-multiple` and `chips-filters-single`; no existing baseline changes. The
native platforms have not implemented the tag group yet.

---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Select: the list is now as wide as its options need on one line, instead of exactly as wide as the container. It is
never narrower than the container or `comp.select.list.min-width`, and never wider than the new
`comp.select.list.max-width` (320 in the default system, the menu's `surface.max-width`) where the container is
narrower. So a long label or a supporting line takes fewer lines, and the container and the layout around it keep
their width. An option that needs more still wraps. A list wider than its container keeps the start edges aligned and
shifts along the container to stay inside the window. A long list draws only the rows near the box that scrolls; it
takes its width from the rows it draws as it opens and keeps that width while it scrolls. `m3-like` restates the menu's
280 for the new token. This is new vocabulary: one dimension token, `comp.select.list.max-width`. It is generated for
every platform. The native selects are not built yet.

The specs also state rules the web already followed. Choosing an option closes the select's list at once, so the
option's pressed state shows only while the list closes. A long select or combobox list may draw only the rows near
its scroll position, and each drawn option still states its position among all the options. The combobox's status
row stands outside the region that scrolls, under it, and stays in view. The m3-like preset's arrow is recorded as a
gap from its original: Material's web select swaps its arrow to point up while open, and Tanrei's chevron does not
change.

Four web baselines are re-recorded for this: `select/open-supporting-text` and `select/open-disabled-chosen` show the list wider than the trigger, with each supporting line on one line. `select/open-long-options` and `select-field/open-long-options` show the list at the width its stage allows, shifted to stay inside it.

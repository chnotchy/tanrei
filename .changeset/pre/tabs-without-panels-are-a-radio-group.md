---
'@tanrei/web': minor
---

Tabs: a row without panels is announced as the choice it is. A `<tanrei-tabs>` that holds no `<tanrei-tab-panel>` and
is linked to no `<tanrei-tab-view>` with a panel for its tabs — a row over a calendar, a set of examples, a table or a
list, whose result the product draws on `change` — is now a radio group named by its `label`, and each `<tanrei-tab>`
a radio with `aria-checked` in place of a tab with `aria-selected`. A screen reader no longer says "tab" where no panel
follows. Every arrow key moves to the next or previous enabled tab and selects it, in either orientation, as a radio
group's arrows do (Right and Left still mirrored in right-to-left); Home, End, Enter, Space and the one Tab stop are
unchanged. A row becomes a tab list again as soon as it has a panel, and a row with panels is unchanged. There is no
prop for this: the row reads it from the panels it holds. Nothing is drawn differently, so no baseline changes.

What breaks: a product or a test that looks for `role="tab"`, `aria-selected` or `role="tablist"` on a row without
panels finds `role="radio"`, `aria-checked` and `role="radiogroup"` instead. A vertical row without panels now moves
with Right and Left as well as Down and Up, and a horizontal one with Down and Up as well as Right and Left; it has no
`aria-orientation`.

The date-time picker's entry-mode tabs stay a tab list: the picker links its time section to them as their panel, so
both tabs control it from the row's first update.

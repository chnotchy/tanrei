---
'@tanrei/web': patch
---

Search: when no clear button is shown, the trailing slot's first Button no longer reaches over the end of the input.
The clear button already stopped its hit area at the middle of `comp.search.container.gap`, but the first trailing
Button did not. When a layer narrowed that gap, a press on the end of the query went to the Button. That Button now
stops at the same place whenever it stands first. The Buttons after it keep the length SRC-34 keeps for them. SRC-25
now names this pair. Nothing is drawn differently.

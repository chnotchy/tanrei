---
'@tanrei/web': patch
---

Popover, select, combobox and context menu: what a press, a key or a focus move set up now ends with the events of
that act, never with a timer. A browser may run a timer after later work, and until then:

- a popover, a select's list or a combobox's list whose close the product had declined (after Escape, or after focus
  left it) asked nothing when focus was moved outside it again — by the product or by assistive technology — and
  stayed open;
- a popover left by Tab from its last element could not take focus again: focus the product moved back into it right
  away went nowhere;
- after Shift+F10 or the ContextMenu key asked for a context menu (`trigger="context"`), the context-menu command of
  assistive technology was cancelled and asked for nothing.

What each act does, and when a close is asked for once, is unchanged.

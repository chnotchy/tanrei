---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Popover: `trigger` chooses what opens it — one or more of `press` (the default), `hover` and `focus`, in any
combination (`trigger="hover focus"` on the web). Hover is a mouse, a trackpad or a pen resting on the anchor, never
touch; focus is keyboard focus resting on it. Both wait `showDelay` (`comp.popover.motion.show-delay`, 700 ms in the
default system) before asking to open; a popover they open takes no focus, stays beside its anchor in every window,
stays while the pointer is on the anchor, the gap or the popover or focus is in it, and asks to close once they have
been gone for `hideDelay` (`comp.popover.motion.hide-delay`, 300 ms). Escape closes it wherever focus is (WCAG 1.4.13).
With `press` as well, a press on the opener keeps a popover opened by hover open and moves focus in. New tokens:
`comp.popover.motion.show-delay` and `comp.popover.motion.hide-delay`.

**Breaking**: the popover now answers its opener's press itself. It asks with a new `toggle` event (`detail.open`,
`detail.reason`: `press`, `hover`, `focus` or `leave`), and the product sets `open` to `detail.open`; `close` keeps its
reasons. Remove the click handler that toggled `open` from the opener — kept, it would undo the popover's own request
— and answer `toggle` instead (`onToggle` in React, `ontoggle="this.open = event.detail.open"` in markup). With
`trigger` that has no `press`, the opener carries no `aria-haspopup`, `aria-expanded` or `aria-controls`.

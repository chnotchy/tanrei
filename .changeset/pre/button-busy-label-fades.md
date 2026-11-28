---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Button — the label and the icon fade when busy changes.** When a busy Button stops being busy its label and its icon
fade back in, and when it becomes busy they fade out, one change of opacity on the new token
`tanrei.comp.button.motion.busy-fade-duration` (the role `sys.motion.role.state.compact`, 200 ms in the default system,
the same at every size) and the button's `state-easing`. Nothing changes place or size, and a change of `busy` during
the fade turns it round from the opacity then drawn. Before, both happened in one frame. The loading indicator's arc
still appears and goes at once, and what the button exposes to assistive technology (`aria-disabled` and `busyLabel`
as its description, on the web) still changes at once, not at the end of the fade. Under reduced motion the label and
the icon change at once, as the button's other changes of state do on the web.

**Breaking:** a test or a stylesheet that read a Button's label or icon as whole (or as gone) in the frame after `busy`
changed now sees it partway through the fade: wait for the button's transitions to finish. On the web the label's
default slot, not the label itself, now carries the inert `transition-delay` of `sys.motion.duration.press-hold`, and
the icon of a busy button is at opacity 0 as well as `visibility: hidden`.

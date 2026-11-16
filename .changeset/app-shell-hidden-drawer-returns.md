---
'@tanrei/web': patch
---

App shell: in an expanded window, a responsive navigation drawer with no collapsed form whose `expanded` is false can
be shown again. Before, a frame without a header, or one with `menu-button-placement="drawer"`, showed no menu button
there, and nothing could bring the hidden drawer back. While such a drawer is hidden beside the content it has no place
in the layout, so the frame now shows its menu button, as it does in the modal presentation. A frame without a header
shows the `menu-button` slot's button alone in the header's place. With a header and the `drawer` placement it shows
the header's marked button. The button says collapsed. Activating it shows the drawer, with one `expandedchange` and no
`navigationopenchange`. The button is then no longer shown, and focus moves into the drawer, to the selected
destination or else its first focusable element, as when the drawer opens. Nothing else changes in any presentation.

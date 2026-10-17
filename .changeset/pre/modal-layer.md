---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Modal layer: a new advanced component, the layer under every modal surface — the scrim over the window, everything
behind it inert and kept from scrolling, focus moved in, kept and given back, and a close request on Escape, the
platform's back or a press on the scrim. On the web it is `<tanrei-modal-layer>` (`ModalLayer` in React), for a modal
surface Tanrei does not have (a command palette, a takeover of the window); the other platforms have it planned.

The dialog, the modal side sheet, the modal bottom sheet, the modal navigation drawer, the image preview, the modal
date-time picker and the search's modal views are built from it and cite its rules; the dialog, the side sheet, the
bottom sheet and the navigation drawer are therefore composed components now. Their scrim colors and their enter and
exit motion tokens alias the layer's new tokens (`comp.modal-layer.scrim.color`, `comp.modal-layer.motion.*`), so a
product restyles what lies under every modal surface in one place, and each gets a `scrim.blur` token that aliases
`comp.modal-layer.scrim.blur` (0, no blur, in every shipped system). Values are unchanged: nothing looks or moves
differently, and no baseline of an existing component changes. The search's views keep their own open and close
motion, which their docked view shares. Vocabulary: twelve new tokens (the layer's six, and a scrim blur for each of
the six overlays that draw a scrim).

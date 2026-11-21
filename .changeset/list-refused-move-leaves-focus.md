---
'@tanrei/web': patch
---

List: when the product does not answer a move chosen from the move menu or made with the keyboard, the list no longer
takes focus back to the handle if the person has put it somewhere else since (another list's handle, any other
control). It gives focus back only when focus was lost (LST-43). Before, a move menu opened in another list within the
reorder motion's time closed again as focus was taken from it.

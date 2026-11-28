---
'@tanrei/web': patch
---

Date-time picker: in the dial mode, the minute selector that typing on the hour selector moves focus to now shows its
focus indicator in every browser (DTM-22, DTM-28), as the minute wheel does in the wheels mode (DTM-20). The picker
gave it the indicator only where the hour selector matched `:focus-visible`, and whether a key pressed after a
pointer's press makes it match is each browser's own call: Chrome and Safari said yes, Firefox no, so after a press on
the hour selector and two digits Firefox showed no indicator on the minute selector. The spec now says that focus is
keyboard focus.

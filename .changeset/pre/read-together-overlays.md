---
'@tanrei/web': patch
---

The popover, the tooltip, the snackbar and the image preview do less work per instance when many are built at once.

- The popover's placement (and that of every surface placed beside an anchor) is made in steps: each step's reads are
  made with every other popover's of the turn, before any of their writes, still before the first frame. A popover
  drawn whole at once no longer draws its closed state first. One resize watch serves every popover. Building 100 open
  popovers forces 179 more style or layout passes than building 10 (was 971); what is left is the appearance's own work.
- The tooltip enters the top layer, and is placed, once the renders of the turn are done, and only if it is still the
  one showing: of many tooltips opened at once, those that gave way to the next are never presented. One that was never
  presented has nothing to take away when it closes. 100 tooltips force no more passes than 10 (was 353 more).
- The snackbar measures its text with every other snackbar's of the turn, through one resize watch for all of them,
  and changes a class for the measurement only where it differs. Its text is scrolled back to its top only when it had
  shown expanded. 100 snackbars force no more passes than 10 (was 180 more).
- The image preview measures its stage with every other preview's of the turn, and a picture that loads or fails is
  placed from what was measured, reading nothing. Building 100 open previews forces 1079 more passes than 10 (was 1440);
  what is left is the modal dialog's and the appearance's own work.

Nothing drawn, exposed or announced changes. The forced-pass budgets of the popover and the image preview are lowered
to the new counts; the tooltip's and the snackbar's are removed.

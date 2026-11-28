---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/docs': patch
---

**Checkboxes, radio buttons, switches and sliders are drawn at the control height.** The round state layers of the
checkbox, the radio button, the switch and the slider's handle (`comp.checkbox.container.size`,
`comp.radio-button.container.size`, `comp.switch.container.size`, `comp.slider.container.size`) now read
`sys.control.height.medium` and are marked `"dev.tanrei.aligned": "control"`. Each control takes that height in a row:
a checkbox, a radio button or a switch with a label of one line is a row as tall as the control height, and a horizontal
slider is that thick, so that they stand as tall as the Buttons and fields beside them. At a control height of 32 they
are 32 tall; at 36, 36.

- **At the default control height of 40 no token value changes**: each state layer was 40 and stays 40.
- **A switch now takes the control height in layout**: across its track it is as tall as the larger of its track and
  its round container, the track centered in it. In the default system a switch is **40 tall, was 32** (its track's
  height), as a checkbox and a radio button already were; the track and the handle keep their sizes, and the container
  still takes no room along the track. The same rule gives m3-like and m3-expressive-like switches 40 (their 40 state
  layer around a 32 track), and leaves cupertino's at its 31 track.
- **What each control draws inside its row keeps its own size**, and the spec says why: the checkbox's 18 box and its
  mark, the radio button's 20 ring, the switch's 52 × 32 track and its handle, the slider's tracks and its 20 handle —
  the sign of a condition or of a value, sized for the eye and the glyph, no control on a row.
- **A rating keeps its own size**: a mark's container is the pitch of a row of glyphs, which follows the mark's size,
  and its targets reach the minimum beyond it; it does not follow the control height.
- **The presets keep their originals' sizes**, pinned with the reason: m3-like and m3-expressive-like keep Material 3's
  40 state layers of the checkbox, the radio button and the switch, and their own slider inset; cupertino keeps the 28
  and 32 it drew.
- The web baselines of the switch, and of what draws a switch (the field and the field group), move with this change;
  they are not recorded in it.
- New behaviour: CHK-26, RAD-30, RGP-22, SWT-27, SLD-31 and RAT-20; SWT-10 says the switch's layout is its row.
  `src/control-height-selection.test.ts` draws each at 32, 36 and 40 in Chromium, Firefox and WebKit.

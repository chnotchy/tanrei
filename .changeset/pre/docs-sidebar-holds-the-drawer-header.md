---
'@tanrei/docs': patch
---

Documentation site: the sidebar no longer moves when its navigation drawer is defined.

- Until the drawer is defined, the sidebar is laid out the way the drawer lays out its header, using the drawer's and
  the button's tokens. The menu button sits on the icon column, centred on the header's height. Beside it, at the
  drawer's own inset, the choice of design system sits above the "All components" switch, and each control holds its
  own room. The first row comes header.gap below them. Before this, the stand-in kept only a 48 px row for the menu
  button and gave the two controls no room. Every row then moved down when the drawer arrived: by 100 px on a
  desktop (122 px in Spanish).
- What the desktop component pages shift as they load, measured on the production build in Chromium at 1440 × 900:
  0.0139 → 0.0051 on the chip page, 0.0120 → 0.0031 on the switch page, 0.0119 → 0.0012 on the Spanish button page,
  and 0.0201 → 0.0087 on the field page. At a phone's width nothing changes, because the drawer is not in the layout
  there before it is defined.

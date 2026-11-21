---
'@tanrei/web': patch
---

App shell: an aside above or below the main region no longer overlaps it. In a compact or medium window, the aside
reached back into the main region's padding by a negative margin: under the default system, 20.5 into it (20 with
`separation="gap"`), so the aside's first line lay inside the main region's box. A press there reached the aside, a
fill the product gave the main region showed under the aside's text, and the outline a screen reader draws around the
main landmark crossed the aside.

The two regions now share the space between them (APS-8, APS-9). The aside keeps its padding of half of `aside.gap`
less half the line. The main region's padding on the aside's side is the other half, in place of `main.padding-block`.
The two boxes meet where the line is, in the middle of the gap. The space between the main content and the aside's is
still `aside.gap`, and the main region keeps `main.padding-block` on its other side. An expanded window, an aside
beside the main region, a side sheet in the aside and `scroll="main"` are unchanged. The spec now says this.

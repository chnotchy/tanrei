---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Progress indicator: whether a determinate bar draws the stop indicator (the dot at its track's end) no longer depends
on `separation`. The dot is drawn whenever `comp.progress-indicator.stop-indicator.size` is above 0, under `divider` and
under `gap` alike, and not at max, where the indicator covers it; `separation` still decides only the gap between the
indicator and the track. The default `tanrei` system's `stop-indicator.size` is now 0 (`sys.space.space0`), so it and
`cupertino` still draw no dot, and `m3-like` keeps its. A bar given `separation="gap"` under
the default system now draws the gap without a dot (the `linear-gap`, `linear-gap-small` and `linear-gap-large`
fixtures); a bar given `separation="divider"` under `m3-like` now draws the dot. The file item's upload bar, which has no
dot, sets the size to 0 for the bar it embeds.

The web baselines of `linear-gap`, `linear-gap-small` and `linear-gap-large` are re-recorded for this: they no longer show the dot.

---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Button: the `inline` variant of the previous prerelease work is withdrawn before any release carried it. An action
drawn as a link that is not a link only leaves people unsure what it will do: an action that belongs to a passage of
text is a text Button after it, and a destination is a Link. The `comp.button.inline.*` tokens go with it (in every
platform's generated tokens), and Theme Studio and the docs hero use text Buttons again.

Button and Main action button: `full-width` (`fullWidth`) makes the control as wide as its container, at the height of
its size, its icon and label centred and a label that does not fit wrapped. A Button that a host lays out — a button
group, a toolbar, the actions of a dialog or a popover — takes the host's width and ignores it; a full-width Main action
button stays extended. New baselines: button `full-width` and `full-width-leading-icon`, main action button
`filled-full-width` and `filled-full-width-collapsed`. The native platforms do not draw `fullWidth` yet; their notes
say so.

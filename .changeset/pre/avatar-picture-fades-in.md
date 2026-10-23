---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Avatar — the picture fades in.** When an avatar's picture arrives it fades in while the initials or the glyph fade out
beneath it, one cross-fade of opacity on the new tokens `tanrei.comp.avatar.motion.picture-duration` (the role
`sys.motion.role.state.default`, 250 ms in the default system) and `picture-easing` (`sys.motion.easing.state`).
Nothing changes place or size, and reduced motion keeps the fade, since a change of opacity is not motion. Before, the
picture took the fallback's place in one frame. A picture the browser already holds when the avatar asks for it, and
one that loads while the avatar draws its first frames, are still drawn at once; a new `src` still draws the fallback at
once until its picture arrives.

**Breaking:** a test or a stylesheet that read the picture as whole the moment its `loaded` class appeared now sees it
partway through the fade: wait for the avatar's transitions to finish. The initials and the glyph stay in the avatar's
shadow root under a loaded picture, hidden, rather than being removed.

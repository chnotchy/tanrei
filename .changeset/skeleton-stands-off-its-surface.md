---
'@tanrei/compose': patch
'@tanrei/swiftui': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
'@tanrei/tokens-build': patch
'@tanrei/web': patch
'@tanrei/docs': patch
---

**A skeleton's placeholders are seen on every surface, the highest container step included.** A placeholder was
filled with `surface-variant`, which in the default system is the tone of `surface-container-highest`: on that
surface, in light and in dark, the placeholders were 1.00:1 from it and could not be seen at all, and in dark they
were 1.04:1 on `surface-bright`. The presets had the same gap on one surface or another (m3-like on its highest
container, cupertino on its high container in light and on its bright surface and its container in dark).

`comp.skeleton.placeholder.color` is now valued in the root layer as a layer of the content color, `on-surface` at a
tenth of its opacity, laid over whatever surface is beneath. It stands off every surface role by the same quiet step:
1.22:1 on each in light, 1.18:1 to 1.32:1 in dark, and at least 1.18:1 in every scheme of every shipped system. This is how
Material's placeholder for Compose, MUI, Atlassian, Radix, Ant Design and Fluent's translucent skeleton draw theirs.
On the page's own surface a placeholder is a little stronger than before (1.22:1 where it was 1.16:1 in light).

The spec (SKL-2) now says that the fill is laid over what stands behind the placeholder, once at each point, and holds it
to 1.1:1 on every surface role. A layer that points the token at one opaque tone gives up that step on the surface of
that tone, and the docs now say so in place of the advice to re-point it on the highest container. Every skeleton baseline changes.

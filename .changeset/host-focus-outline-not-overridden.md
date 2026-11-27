---
'@tanrei/web': patch
---

Focus: a page's own focus rule no longer draws a rectangle around an element that draws its own ring. A tab, a tab
panel, a list item, a menubar's menu and the other elements whose host takes focus itself draw their ring on a box
inside and said `outline: none` on their host, but a page's rules win over a shadow root's, so a rule such as
`:focus-visible { outline: … }` drew the page's outline around the host on top of the component's ring. The host now
says `outline: none !important`, which no rule of the page outweighs. The README's "Your own focus ring" says how a
global focus rule sits beside Tanrei's, including the stylesheets for your own markup, which are in a cascade layer.

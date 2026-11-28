---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

App shell: `footerHidden` (`footer-hidden`, React `footerHidden`) decides whether the footer is shown. The footer was
shown exactly while the product filled the footer region; a screen that is a task rather than a page of the site (a
checkout, a sign-in, an editor) can now leave the site's footer out without taking it out of the markup. While it is
true the footer takes no space, draws no line, is no content-information landmark and has no stop of the keyboard, the
navigation and the aside stay in view to the end of the page, and focus that was in the footer moves to the main
region. A footer slot left unfilled is still never drawn and never a landmark. Pages that do not set it are unchanged. The
spec names the prop on every platform; SwiftUI, Compose, Flutter and React Native have not implemented the app shell
yet.

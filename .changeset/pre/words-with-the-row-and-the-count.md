---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Words with places for the count and for a row's actions, so that what is said holds the number and the row in the
order of the product's language:

- Avatar group: `overflowLabel` is a sentence with the place `{count}`, which the group fills with the real number of
  members it does not draw — also above 999, where the box draws `999+` — in the locale's digits. It can be given once
  for every group as the product's words `avatarGroupOverflowLabel`. A sentence without `{count}` is read as written and
  reported in debug builds.
- Text input and text field: the count can be said as a sentence. `counterText` (`characterCountText`) has the places
  `{count}`, `{limit}` and `{remaining}` and is said while there is a `maxLength`; `counterNoLimitText`
  (`characterCountNoLimitText`) has `{count}` and is said while there is none. They are the input's description and
  what is announced once typing pauses; `countText`, and what a Field draws, stay the digits ("12/40"). Without a
  sentence, and for a value the product set past the limit, the digits are said as before.
- File item (and the file upload and chat composer that hand their words to it): `removeLabel` and `retryLabel` are
  sentences with the place `{name}`, filled by the file's name ("Remove {name}"), so the actions of two files are told
  apart by their names. The file's name is no longer given to the actions as a description.
- List: `moveUpLabel` and `moveDownLabel` are sentences with the place `{headline}`, filled by the item's headline
  ("Move {headline} up"); the headline is no longer the buttons' description.

A word without its place still names the action, as it is written, and is reported in debug builds: give the place to
keep two rows' actions apart. No baseline changes: every changed name is read and not drawn.

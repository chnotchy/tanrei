---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`): the Japanese messages are Japanese sentences — a message that names a thing
puts the name first («<id> を語彙に追加しました», «<file> をダウンロードしました»), a label and its value are joined by a
full-width colon with no space after it, and two sentences are joined with no space. The Japanese wording changed.
Arabic is drawn in Noto Sans Arabic, which the app now loads for the Arabic subset alone (its OFL notice travels in the
app's third-party licences); a label beside a value is set in the text face and only the value in the code face; a
component with no size axis or no variants shows no empty "Sizes:" or "Variants:" row.

The default system's token descriptions say each measure by its value and role instead of by another design system's
name, and the corner smoothing description says how the curve differs on Apple's platforms and on the web. The Japanese
fixture of the table now says «4 件中 1 件を選択中» (its web baseline is recorded again with the new text), and the color
field's and the field's Japanese fixtures name their picker «色を選択» (an accessible name, not drawn).

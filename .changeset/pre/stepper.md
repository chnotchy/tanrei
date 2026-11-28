---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

New component: Stepper (`specs/stepper.spec.json`, SPR-1…27). It shows where a person is in a flow the product runs in a
fixed order of steps — a checkout, a set-up, an application.

- **Conditions.** Each step is current (where the person is: a filled marker with its number), complete (a check),
  error (a ring and `priority_high`, the label in the error color) or incomplete (a ring with its number). A step's
  `status` is `auto` by default — complete before the current step, incomplete after it — and the product sets
  `error`, `complete` or `incomplete` where its flow knows more. Conditions differ by shape, not by color alone.
- **Forms.** `layout` is `horizontal` (equal columns above the content), `vertical` (a column beside it) or `compact`
  (a bar of segments, the position in the product's words — "Step 2 of 5" — and the current step's label). A
  horizontal stepper turns compact by itself when its width cannot hold every step at `comp.stepper.step.min-width`.
- **Going back.** `pressable` is `none` (the default), `visited` (the complete and error steps that are not current)
  or `all` (every step that is not current). A pressable step is a native button that fires `select` with its value;
  the stepper never changes `value` itself. A `disabled` step of a pressable stepper is a disabled button.
- **Accessibility.** An ordered list named by `label`, the current step `aria-current="step"`, each step read as its
  label, the product's word for its condition (`completedText`, `errorText`) and its description; the compact form is
  one group that reads what it draws. New product's words: `stepCompletedText`, `stepErrorText`, `stepPositionText`.
- **Tokens.** New group `tanrei.comp.stepper` (marker, container, label, description, connector, bar, position, motion,
  and per condition — incomplete, current, complete, error — the colors of each part in each state). The default
  system adds two rules: a disabled step grows no container fill and keeps its marker's fill. No preset re-values it:
  neither Material 3 nor Apple's guidelines have a stepper.
- **Platforms.** Web (`<tanrei-stepper>`, `<tanrei-stepper-step>`) and the generated React wrappers (`Stepper`,
  `StepperStep`). SwiftUI, Compose, Flutter and React Native are planned; their generated token code gains the group.
- **Docs.** A Stepper page in six languages, beside Steps, which stays a procedure to read with no position.

New baselines: every fixture of `stepper` on the web, and `horizontal-error` under each preset.

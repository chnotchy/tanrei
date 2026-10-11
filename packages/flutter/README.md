# tanrei (Flutter)

> **Pre-release.** Nothing has been released: `tanrei` is not on pub.dev yet. It has not caught up with the current specs and tokens and **does not build yet**; its CI is paused until it does (the [status matrix](../../docs/status/STATUS.md) marks it *lagging*). Documentation: <https://tanrei.chnotchy.com/getting-started/flutter/>.

The Flutter package of the Tanrei design system. Widgets are driven entirely by the tokens of a
design system instance carried by the theme, and implement the platform-neutral specs in
[`specs/`](../../specs) with Flutter idioms. Tanrei is its own system: the library depends on `package:flutter/widgets.dart` only and
does not use Material widgets or `ThemeData`.

## Install

```yaml
dependencies:
  tanrei: ^0.0.0
```

```sh
flutter pub add tanrei
```

Requires Flutter >= 3.32 (Dart >= 3.8).

## Usage

```dart
import 'package:flutter/widgets.dart';
import 'package:tanrei/tanrei.dart';

class DeployBar extends StatelessWidget {
  const DeployBar({super.key, required this.onDeploy});

  final VoidCallback? onDeploy; // null disables the button

  @override
  Widget build(BuildContext context) {
    final TanreiSystem system = TanreiTheme.of(context).system;
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: system.space.space100,
      children: <Widget>[
        TanreiButton(
          onPressed: () {},
          variant: TanreiButtonVariant.text,
          child: const Text('Cancel'),
        ),
        TanreiButton(onPressed: onDeploy, child: const Text('Deploy')),
      ],
    );
  }
}
```

`TanreiButton` props: `onPressed` (null = disabled), `child` (label), `icon` (leading), `variant`
(`filled` | `tonal` | `elevated` | `outlined` | `text`), `size` (`small` | `medium` | `large`),
`focusNode`, `autofocus`, `semanticLabel`. Enter and Space activate it; the hit area is always at
least 48 x 48 even though the visual height is 32 / 36 / 40. A size decides the container height,
the paddings, the label style, the icon size, and — since they joined the size axis — the gap
between icon and label and the outline width (`system.button.sizes[size].containerGap` /
`.outlineWidth`; 8 and 1 at every size of the default system).

`TanreiButtonVariant` and `TanreiButtonSize` are **open keys**, not enums: the constants
are the core values (`TanreiButtonSize.core` lists them), and a design system may add its own
(`const TanreiButtonSize('3x')`, see [Values a design system adds](#values-a-design-system-adds)).
A value the active system does not have renders as the default (`filled`, `medium`) and is reported
in debug builds only (spec BTN-7).

### Icon button

```dart
// An action.
TanreiIconButton(
  onPressed: share,
  semanticLabel: 'Share',
  icon: const Icon(AppSymbols.share),
);

// A toggle: a non-null isSelected makes it one, and onPressed is where its owner flips it.
TanreiIconButton(
  isSelected: favorite,
  onPressed: () => setState(() => favorite = !favorite),
  variant: TanreiIconButtonVariant.filled,
  semanticLabel: 'Favorite',
  icon: Text(String.fromCharCode(0xe87d)), // a glyph drawn as text takes the theme's icon family
);
```

`TanreiIconButton` (spec `icon-button`) follows Flutter's `IconButton` idiom: `onPressed` (null =
disabled; for a toggle it is the change, the button keeps no selection of its own), `isSelected`
(null = an action button, `true` / `false` = a toggle that is on / off), `semanticLabel` (the
accessible name, **required** — an icon alone is not a name; an empty or blank one still renders and
is reported in debug builds through `debugTanreiReportMissingName`, ICB-14), `icon`, `variant`
(`standard` | `filled` | `tonal` | `outlined`), `size` (`small` | `medium` | `large`: a square of
32 / 36 / 40 with a 16 / 20 / 24 icon in the default system), `focusNode`, `autofocus`. Both keys
are open, as Button's are (ICB-7).

- **Looks.** A plain button draws its variant's own parts (`variants[v].of(state).containerColor`,
  `iconColor`, `outlineColor`); a toggle that is off draws the `unselected…` parts and one that is
  on the `selected…` parts (ICB-12) — in every state, disabled included. The state layer a system
  mixes into each look's container is that look's `stateLayerColor`; the widget never
  reads it, the tokens already carry the mix.
- **The icon** is a slot drawn by `TanreiControlIcon`: an `IconTheme` (size, color, `FILL`, `wght`,
  `GRAD`, `opsz` clamped to `sys.icon.optical-size`) and a `DefaultTextStyle` with the **family** of
  the selection — selected only for a toggle that is on (ICB-13). A glyph drawn as text therefore
  switches family by itself under a static icon set; an `Icon`'s `IconData` names its own family, so
  pick the constant with `system.icon.family(selected:)`. The icon is decorative to assistive
  technology and does not grow with the text size (the square does not either).
- **Semantics.** A button with `semanticLabel` as its label; a toggle adds the *selected* state
  (`Semantics(selected:)`, Flutter's own `IconButton` idiom), a plain icon button has no selected
  state at all (ICB-11). Not `toggled`: every Flutter engine announces that as a switch (web
  `role="switch"`, Android `android.widget.Switch`, iOS a switch), and the spec says a toggle button
  is not a switch. Flutter has no pressed state: on iOS *selected* is the selected trait the spec
  asks for, on Android `setSelected`, and on Flutter web the engine writes `aria-selected`, not
  `aria-pressed`.
- Presses, keyboard focus, the target, the press-hold, `pressedFeedback`, `focusStyle` and corner
  smoothing are Button's (ICB-1…10 = BTN-1…10), through the same primitives. Nothing falls back.

### Divider

```dart
Column(
  children: <Widget>[
    const ListRow(title: 'Inbox'),
    const TanreiDivider(inset: TanreiDividerInset.start), // lines up with an inset list's text
    const ListRow(title: 'Archive'),
  ],
);

// In a toolbar, where the groups mean something: exposed to assistive technology.
IntrinsicHeight(
  child: Row(children: <Widget>[...editing, const TanreiDivider(axis: Axis.vertical, excludeFromSemantics: false), ...sharing]),
);
```

`TanreiDivider` (spec `divider`) is one widget for both orientations: `axis` (`Axis.horizontal`, the
default, or `Axis.vertical`; the spec's `orientation`), `inset` (`TanreiDividerInset.none` |
`start` | `both`, a length of `comp.divider.line.inset` — not Flutter's `indent` / `endIndent`
lengths), and `excludeFromSemantics` (the spec's `decorative`, same polarity, default `true`).

- **Layout.** A horizontal divider spans the width its constraints give it and a vertical one the
  height; across, it takes exactly `comp.divider.line.thickness` and adds no margin (DIV-1, DIV-2):
  put the space around it in the layout. Where its length is unbounded (a horizontal divider in a
  `Row`, a vertical one in a `Column`) it is as short as the constraints allow; its intrinsic size
  is the thickness across and nothing along, so `IntrinsicHeight` gives a vertical one the row's
  height. The start inset of a horizontal divider is on the right in a right-to-left layout (DIV-4).
- **Pixels.** The line is painted on the device pixel grid, a whole number of device pixels thick
  and at least one (DIV-8): a hairline at 2x is exactly two rows of pixels wherever it sits.
- **Semantics.** Decorative (the default) it adds nothing to the semantics tree (DIV-5). Flutter's
  semantics have no separator role and no orientation, so `excludeFromSemantics: false` gives the
  divider an empty semantics node of its own — no name, no value, no actions, never focusable — and
  cannot say "separator" (DIV-6).
- **Names as text.** Dart enums cannot hold an unknown value; a prop that arrives as text is read
  with `TanreiDivider.axisFromName` / `TanreiDividerInset.fromName`, which answer the default for a
  name the spec does not define and report it in debug builds (DIV-7).

### Badge

```dart
TanreiBadge(
  count: unread,               // null = a dot, 0 = nothing, above 0 = the number
  semanticLabel: '$unread unread',
  child: TanreiIconButton(onPressed: openInbox, semanticLabel: 'Inbox', icon: inboxIcon),
);
```

`TanreiBadge` (spec `badge`) follows Flutter's `Badge.count` with the anchor as `child`: `count`
(`num?`; null is the dot — Flutter's plain `Badge`), `max` (default 999: a larger count shows as
`999+`), `semanticLabel` (the spec's `label`).

- **Placement.** The dot's center, or the center of the pill's leading circle, sits
  `comp.badge.dot.offset` / `container.offset` inside the anchor's top-end corner; a longer count
  grows toward the end, to the left in a right-to-left layout (BDG-1, BDG-3, BDG-11). The anchor
  keeps the constraints, size and position it has without a badge (`Stack(fit: passthrough)`); the
  badge takes no space, may extend past the anchor, and ignores the pointer, so a tap on it reaches
  the anchor (BDG-7). The outline is drawn outside the edge (`BorderSide.strokeAlignOutside`) and
  moves nothing (BDG-6). The dot is a circle of `dot.size` whatever `container.shape` is; the
  pill takes `container.shape`. The leading circle is a square of the pill's drawn height, so at
  enlarged text the grown pill stays centered on the same point (BDG-3, BDG-13).
- **Text.** The number grows with the text size (the pill's `container.height` is a minimum; the
  dot does not grow, BDG-13), uses tabular figures, has no grouping separator, and is laid out
  left to right on its own so `999+` keeps its plus sign in a right-to-left layout (BDG-11,
  BDG-12). Digits follow the locale's default numbering system for the locales whose default is
  not Latin (Arabic, Persian, Bengali, …): Flutter has no number formatting without
  `package:intl`, so the package keeps that subset of CLDR itself. `TanreiBadge.displayText(count, max:, locale:)` returns what the
  badge draws.
- **Semantics.** The drawn dot and number are excluded. With a label, or a count, the anchor and
  the badge become one semantics node whose **value** is the label (or, without one, the displayed
  text): "Inbox, button, 3 unread" (BDG-8). A count of 0 adds nothing — the anchor is announced as
  without a badge (BDG-5). A change updates the value and is never announced (no live region,
  BDG-10). A dot without a label is reported in debug builds through `debugTanreiReportMissingName`
  (BDG-9).
- **Fixtures** (the spec's default slot): the anchor is the glyph the fixture's content names, drawn
  with `TanreiControlIcon` at `sys.icon.large` (`system.measure.iconLarge`) in on-surface-variant,
  and named by that glyph name ("notifications"); the badge adds the fixture's label as the value,
  so it is read once: "notifications, 3 unread" (`GalleryBadge`, `badgeOf` in the test).
- **Values out of range** (BDG-14): a negative or NaN count is 0, a fractional one is rounded
  down, a `max` below 1 is 999; each is reported once through `debugTanreiReportUnknownValue`.

### Progress indicator

```dart
TanreiProgressIndicator(value: sent, max: total, semanticsLabel: 'Uploading report.pdf');
TanreiProgressIndicator(
  variant: TanreiProgressIndicatorVariant.circular,
  size: TanreiProgressIndicatorSize.small,
  semanticsLabel: 'Syncing', // value: null — indeterminate
);
```

`TanreiProgressIndicator` (spec `progress-indicator`) follows Flutter's `ProgressIndicator`:
`value` (null = indeterminate; read between `min` and `max`, default 0 and 1, as `Slider` reads
it), `semanticsLabel` (the accessible name, **required**; empty is reported in debug builds,
PRG-15), `semanticsValue` (the spec's `valueText`), `variant` (`linear` | `circular`, a Dart enum:
a form is drawing code, not a token), `size` (an open key: bars 2 / 4 / 8 high, rings 16 / 24 /
40 in the default system).

- **Drawing.** A bar fills the width its layout gives it (none in an unbounded `Row`) and is
  `linear.thickness` high; a ring fills `circular.size`. The track is drawn in `track.color`, the
  indicator over it in `indicator.color`; a bar's ends are rounded by `track.shape` (at most half the
  thickness), a ring has round caps unless the shape is 0 (PRG-3, PRG-4). `track.gap` and
  `stop-indicator.size` (0 in the default system; 4 in m3-like) leave empty space between the
  indicator and the track — after a bar's indicator, at both ends of a ring's arc — and draw a dot
  whose center is half the thickness before the bar's end, concentric with its rounded end (PRG-5). A right-to-left bar fills from the right; a
  ring always starts at the top and turns clockwise (PRG-13).
- **Motion.** A value change eases over `motion.value-duration` with `motion.value-easing`; a
  switch between determinate and indeterminate is immediate (PRG-6). Indeterminate, a bar moves a
  segment of two fifths of the track per `motion.cycle-duration` with `motion.cycle-easing`, a ring
  turns a quarter arc at constant speed (PRG-2). With `MediaQuery.disableAnimations` the value jumps
  and the indeterminate form stands still over the whole track, its opacity pulsing once per cycle
  (PRG-7). The animation runs on tickers: it stops where `TickerMode` is off (a route that is not
  visible) and while the app is in the background (PRG-14), and resumes where its clock is.
- **Semantics** are Flutter's own progress indicators': `semanticsLabel` is the label and, when
  determinate, the value is `semanticsValue` or the clamped percentage (`40%`); indeterminate has
  no value (PRG-8, PRG-9). Never focusable, no live region, no announcements (PRG-10). Flutter 3.32
  has no usable progressbar role (`SemanticsRole.progressBar` throws "Missing checks" in debug
  builds), no range and no busy state.
- **Out of range** (PRG-11): a value outside `min`…`max` is drawn and exposed clamped; `max` not
  above `min` draws the track alone and exposes `0%`; both are reported once through
  `debugTanreiReportUnknownValue`, as an unknown `size` or a `variant` name read with
  `TanreiProgressIndicatorVariant.fromName` are (PRG-12).

### Loading indicator

```dart
const TanreiLoadingIndicator(semanticsLabel: 'Loading messages');
const TanreiLoadingIndicator(
  semanticsLabel: 'Refreshing',
  size: TanreiLoadingIndicatorSize.large,
  contained: true, // on a raised container, over content
);
```

`TanreiLoadingIndicator` (spec `loading-indicator`): `semanticsLabel` (the accessible name,
**required**; empty is reported in debug builds, LDG-10), `size` (an open key: 16 / 24 / 40 in
the default system; LDG-9), `contained` (a flag, as in the spec; Compose makes it a second
composable).

- **Drawing.** A quarter arc with round caps turns clockwise once per `motion.cycle-duration`
  at the constant speed of `sys.motion.easing.linear`, in `indicator.size` with a stroke of
  `indicator.thickness`, and no track (LDG-1). Inline it is exactly that square in
  `indicator.color` (LDG-2); contained it is a `container.size` square filled with
  `contained.container.color`, raised by `contained.container.elevation` (resolved like every
  elevation: ring as a border, the rest as shadows) and shaped by `container.shape`, with the arc
  centered on it in `contained.indicator.color` (LDG-3). It is never mirrored (LDG-8).
- **Reduced motion** (`MediaQuery.disableAnimations`): the whole circle, still, its opacity eased
  1 → 0 → 1 once per cycle with `sys.motion.easing.standard`; the container does not move or fade
  (LDG-4). The ring geometry and the pulse are shared with the progress indicator
  (`TanreiRing`, `tanreiPulseOpacity`).
- **Semantics.** The label is the name, with no value; never focusable, no live region, nothing
  announced when it appears or goes (LDG-5, LDG-6). The progressbar role and a busy state are not
  available in Flutter 3.32.
- **Visibility.** The animation is a ticker: `TickerMode` (a route that is not visible) and an app
  in the background stop it, and it resumes after (LDG-7). An indicator scrolled out of view in a
  non-lazy scroll view keeps its ticker.

### Checkbox, radio button and switch

```dart
TanreiCheckbox(
  value: agreed, // bool? — null (with tristate: true) is indeterminate
  onChanged: (bool value) => setState(() => agreed = value), // null disables it
  isError: submitted && !agreed,
  label: 'I accept the terms',
);

TanreiRadioGroup<Frequency>(
  groupValue: frequency,
  onChanged: (Frequency value) => setState(() => frequency = value),
  semanticLabel: 'How often',
  child: Column(
    children: <Widget>[
      for (final Frequency option in Frequency.values)
        TanreiRadioButton<Frequency>(value: option, label: option.label),
    ],
  ),
);

TanreiSwitch(
  value: wifi,
  onChanged: (bool value) => setState(() => wifi = value),
  thumbIcon: WidgetStateProperty.resolveWith(
    (Set<WidgetState> states) => states.contains(WidgetState.selected) ? checkGlyph : null,
  ),
  label: 'Wi-Fi',
);
```

The three selection controls (specs `checkbox`, `radio-button`, `switch`) share one structure:
a **round state layer** (`container`, `TanreiStateLayer`) behind the box, the ring
or the handle carries hover, focus and press, and is clear at rest and when disabled; the box, ring,
track and handle keep their resting colors under hover, focus and press. Their **conditions are
state variants**, a token axis no prop names: the props select the condition
(`tokens.conditions[...]`) and the interaction state selects that condition's tokens. A visible
`label` is drawn at the inline end (a right-to-left layout mirrors the row) with the control
centered on its first line, wraps rather than truncates, grows with the text size while the control
does not, and is part of the hit area: a press on it activates the control. `labelHidden` keeps the
label as the accessible name without drawing it; an empty label still renders and is reported in
debug builds (`debugTanreiReportMissingName`).

- **Keys.** Space activates them everywhere; Enter only on Android, where any focused control
  activates with Enter — not on the web, where Enter submits the form, and not on iOS or a desktop
  (CHK-1, RAD-1, SWT-1). They answer their own `TanreiToggleIntent` (`tanreiToggleShortcuts`), not
  the app's `ActivateIntent`, which `WidgetsApp` sends for Enter on every platform but the web.
- **Motion.** A part the interaction states recolor (or resize: m3-like's pressed handle) changes
  over the state motion, pressed at once, as the container does; only a change of condition eases
  over the component's `motion.selection-*` tokens: the check draws along its path, the dash grows
  from its center, the radio's dot grows from the center, the switch's handle travels (with a
  spring's easing, which may overshoot) and grows or shrinks; where motion is reduced the new condition shows at once (`TanreiSelectionTransitionMixin`). Presses,
  press-hold, `pressedFeedback`, `focusStyle`, corner smoothing and the minimum target are
  Button's, through the same primitives; a ripple grows from the point of contact on the round
  layer, and from its center when the press lands on the label.
- **Fill and outline.** A box or a track fills inside its outline, never under it, so a translucent
  fill and outline do not add up (CHK-12, SWT-10). Where the two are one color the shape is drawn
  once, and an opaque outline is drawn over the fill it hides, so no anti-aliased hairline of the
  background shows between them (`tanreiPaintOutlinedShape`).
- **`TanreiCheckbox`** follows Flutter's `Checkbox`: `value` (`bool?`), `tristate`, `onChanged`,
  plus `isError`, `label`, `labelHidden`. Unlike Flutter's, activation from indeterminate calls
  `onChanged(true)` (CHK-2), and `onChanged` is a `ValueChanged<bool>` (a `(bool?)` callback fits).
  Semantics: checked, not checked or **mixed**; `isError` is `SemanticsValidationResult.invalid`.
  The mark is the spec's (anatomy `mark`), in fractions of the box: the check (0.2, 0.5) →
  (0.4, 0.7) → (0.8, 0.3), the dash (0.1375, 0.5) → (0.8625, 0.5), square caps.
- **`TanreiRadioButton<T>`** sits in a **`TanreiRadioGroup<T>`** (the spec's `name`; Flutter 3.32,
  the oldest this package supports, has no `RadioGroup`, and a later one's would clash):
  `groupValue`, `onChanged` (called once with the option the user selects, never for the selected
  one, RAD-2), `semanticLabel` (the group's name, the question). An option has `value`, `enabled`
  (the spec's `disabled`, inverted, as Flutter's `Radio` has it since `RadioGroup`), `label`,
  `labelHidden`. The group handles the **arrow keys** (next / previous enabled option, wrapping,
  selecting as it goes; Left and Right swap in right-to-left) and keeps **one Tab stop**: the
  selected option, or the first enabled one while none is (it sets `skipTraversal` on the others'
  focus nodes). Semantics: the group is `SemanticsRole.radioGroup`, each option checked or not in a
  mutually exclusive group. Flutter's semantics cannot state an option's position in its group
  ("2 of 3").
- **`TanreiSwitch`** follows Flutter's `Switch`: `value`, `onChanged`, `thumbIcon`
  (`WidgetStateProperty<Widget?>`, resolved with `selected` while on — the spec's `selectedIcon` /
  `unselectedIcon` — plus the interaction state), `label`, `labelHidden`. The layout box is the
  track; the round layer centered on the handle may extend beyond it. With an icon the handle is
  at least `handle.size-with-icon` and the glyph is drawn by `TanreiControlIcon` at `icon.size` with
  the family and fill of the condition. Semantics: toggled on or off, never checked; the icon is
  decorative. No dragging (the spec leaves it out): a press anywhere switches it.

### Card

```dart
// A container: not focusable, no role of its own.
TanreiCard(
  variant: TanreiCardVariant.filled,
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text('Quarterly report', style: theme.textStyle(system.typescale.heading5)),
      const Text('Revenue grew 12% over the previous quarter.'),
      TanreiButton(onPressed: openReport, child: const Text('Open')), // allowed: not interactive
    ],
  ),
);

// One action: a non-null onTap makes the whole card a button, named by its heading.
TanreiCard(
  onTap: openReport,
  semanticLabel: 'Quarterly report',
  child: const Text('Quarterly report. Revenue grew 12% over the previous quarter.'),
);
```

`TanreiCard` (spec `card`): `onTap` (non-null = the spec's `interactive`, and its `click`),
`enabled` (the spec's `disabled`, inverted; ignored while `onTap` is null — a card that is not an
action cannot be disabled, and a null `onTap` already means "not an action", so disabling keeps the
callback, as `ListTile` does), `variant` (`elevated` | `filled` | `outlined`, an open key, default
`outlined`, CRD-7), `inset` (default true: the content sits `comp.card.container.padding` inside
the container on every side; false lets a photo reach the edges), `semanticLabel` (the spec's
`label`), `focusNode`, `autofocus`, `child`.

- **Free content.** The card lays nothing out: it insets the child (by logical start and end,
  CRD-17), clips it to the container's corner shape (smoothing included), draws the outlined
  variant's outline *above* it, and grows with it — it has no height of its own (CRD-12). It hands
  the content the variant's and state's `contentColor` as the default text and icon color
  (`DefaultTextStyle.merge`, `IconTheme.merge`, CRD-13), and plain text the `body` style, so a
  bare `Text` needs nothing and a `Text` that names a text style and no color takes the card's
  color. Use `heading5` for a card's title.
- **Not interactive** (null `onTap`): no focus, no press, no state answer; the resting tokens of
  the variant, whatever `enabled` says (CRD-11). No semantics of its own — unless `semanticLabel`
  is set, when it is a container node named by it with the content as its children (Flutter has no
  group role; this is the closest node, CRD-14).
- **Interactive**: pressed, focused and hovered exactly as `TanreiButton` (CRD-1…10 = BTN-1…10:
  Enter and Space, the press-hold, `pressedFeedback`, `focusStyle`, corner smoothing, the minimum
  target) through the same primitives; the state layer is in the tokens (`stateLayerColor`), an
  elevated card rises on hover, and a change eases over the card's motion tokens
  (CRD-16). Disabled, the whole card — content included — dims to the disabled opacity: a card
  cannot recolor content it does not know (CRD-6). Semantics: **one** button node
  (`MergeSemantics`) named by `semanticLabel`, the content excluded; without a label the content's
  text, merged in reading order, is the name, and debug builds report the missing label through
  `debugTanreiReportMissingName` (CRD-14).
- **Never put an interactive element in an interactive card** (CRD-15): no button, link, field,
  toggle or anything else focusable. The content is merged into the card's one accessible element,
  so assistive technology cannot reach what is nested, and a press on it would also activate the
  card. Flutter cannot reliably tell whether a subtree is interactive, so `TanreiCard` does not
  check. A card that needs its own actions stays non-interactive, and its main action is one of
  those buttons.

### Text field

```dart
TanreiTextField(
  controller: email, // or initialValue: '…'
  labelText: 'Email',
  type: TanreiTextFieldType.email,
  autofillHints: const <String>[AutofillHints.email],
  helperText: 'We only use it to sign you in.',
  isError: submitted && !isValid(email.text),
  errorText: 'Enter a complete email address.',
  onChanged: (String value) {}, // every edit (the spec's input)
  onCommit: save, // focus left or the action key, with a changed value (change)
  onSubmitted: (String value) {}, // the action key of a single-line field (action)
);

// A search box in a toolbar: the label stays the accessible name, the placeholder shows.
TanreiTextField(
  labelText: 'Search',
  labelHidden: true,
  hintText: 'Search components',
  type: TanreiTextFieldType.search,
  leadingIcon: const Icon(AppSymbols.search),
  trailingIcon: TanreiIconButton(onPressed: clear, semanticLabel: 'Clear', icon: closeGlyph),
);
```

`TanreiTextField` (spec `text-field`) follows `TextField` and `InputDecoration` and edits in the
widgets library's own `EditableText`: input methods, autofill, the keyboard and
selection behave as the platform's text element does. Props: `controller` / `initialValue` (the
spec's `value`), `labelText`, `labelHidden`, `variant` (`filled` | `outlined`, open key),
`size` (`medium` | `large`, open key), `type` (`TanreiTextFieldType`: `text`, `email`,
`password`, `number`, `search`, `tel`, `url`; `TanreiTextFieldType.fromName` answers `text` for a
name it does not know and reports it, TXF-9), `hintText` (placeholder), `helperText` (supporting
text), `errorText`, `isError`, `enabled` (the spec's `disabled`, inverted), `readOnly`,
`isRequired`, `multiline`, `minLines` / `maxLines` (the spec's `minRows` / `maxRows`; a null
`maxLines` is `maxRows: 0`, no limit), `maxLength` (0 = none), `showCounter`, `prefixText`,
`suffixText`, `autofillHints` (`AutofillHints` constants; `TanreiTextField.autofillHintsFromHtml`
maps the spec's HTML `autocomplete` names), the `leadingIcon` and `trailingIcon` slots, `focusNode`,
`autofocus`.

- **States.** Hovered, focused and disabled, and the error condition (the `error…` parts of the
  variant, in every state). Focus by *any* means selects the focused state (TXF-6): a field shows
  where typing will go. The focused outline or active indicator — `sys.border.thick` in the
  focus-ring role by default — is the focus indicator; no focus ring is drawn, and a system whose
  focus style is glow adds the glow around the container (TXF-7). The container keeps its color
  under focus, and an outlined one under hover. No press answer: a press anywhere on the
  field outside an interactive slot element focuses the input and places the caret (TXF-8). Colors
  and widths change over the state motion, the label over the label motion; both at once where
  motion is reduced (TXF-14).
- **Which edge a variant draws is read from its tokens, not from its name**: a variant
  whose resting outline paints is drawn as an outlined field — the label floats onto its top edge,
  centred on the line, the outline opening a gap `outline.notch-padding` on each side, and all four
  corners are `container.shape`. Any other variant floats its label inside the container above the
  input, is tall enough for both lines from the start (46 / 50 in the default system, TXF-16), and
  rounds its bottom corners by `container.shape-bottom`. An outlined field floats its label from
  `padding-inline`, over a leading icon; a filled one keeps it over the input text.
- **The label** rests while the field is empty and unfocused — centred in the container of a
  filled single-line field, in the input line of an outlined one, on the first line of a
  multi-line one — and floats while it is focused or has a value (an autofill fills the value, so it floats too; TXF-13, TXF-21).
  A label that does not fit wraps, never cut and never over the input: resting, inside the
  container, which grows to hold it; floated in a filled field, in a band above the input that
  grows; floated in an outlined field, with its last line on the edge and room reserved above the
  container for the lines above it, the gap opening by the widest line. Neither variant changes height when its
  label floats: the room, the band and the grown container are there resting and floated
  (TXF-13, TXF-16).
  The placeholder, the prefix and the suffix show only while the label is floated or not drawn;
  the prefix sits `affix.gap` before the value and the suffix at the end of the input line,
  `affix.gap` after the input (TXF-15). Icons sit on the first line (TXF-17) at `icon.size`, unselected, with the system's
  weight and optical size (TXF-22); a slot is its own semantics node, so a product's icon button
  there keeps its name, its tokens and its own focus stop after the input. A decorative glyph drawn
  as `Text` in a slot is a node too: wrap it in `ExcludeSemantics`, or use an `Icon`.
- **Values.** `maxLength` counts grapheme clusters (`characters`), refuses an edit past it,
  shortens a paste, and leaves a composition whole until it is committed; a value the product sets
  is never shortened (TXF-18). The field edits its own copy of the value and keeps the product's
  `controller` in step: a value the product sets while an input method is composing waits for the
  composition to end, and an echo of the value shown never disturbs it (TXF-4). `onCommit` is
  never called during a composition.
- **Semantics.** One text-field node: `labelText` is the name, drawn or hidden, never the
  placeholder; the shown supporting or error text and the count are its hint (the description);
  `isError` is `SemanticsValidationResult.invalid`, `isRequired` the required state, `readOnly`
  read-only, a password obscured (TXF-11, TXF-23). An error that appears or changes while the
  input has focus is announced once, politely; the count is announced once typing pauses for a
  second, as the counter's visible text (`3/40`) (TXF-12, TXF-19). While the prefix and suffix are
  shown they are part of the hint too, so a unit or currency is read with the value (TXF-15). A
  search field is `SemanticsInputType.search`: Flutter 3.32, the oldest this package supports,
  asserts on `SemanticsRole.searchBox`.
- **Right to left** mirrors the layout; typed text is laid out by its first strong character (as
  the web's `dir="auto"`), and an email, url, tel, number or password value left to right at the
  field's start edge (TXF-24).
- **Not built in:** clear, reveal-password or any other trailing action (the product's own icon
  button goes in the trailing slot). Without Material or Cupertino there are no selection handles
  and no selection toolbar on a touch screen: iOS shows its system menu where the OS offers one,
  and keyboard shortcuts work everywhere. Selected
  text is highlighted in `comp.text-field.selection.color` in every variant and state, whatever an
  app's `DefaultSelectionStyle` says (TXF-6).

### Floating action button

```dart
Stack(
  children: <Widget>[
    content,
    // The FAB does not place itself: the screen's layout does (FAB-13).
    PositionedDirectional(
      end: 16,
      bottom: 16,
      child: TanreiFloatingActionButton(
        onPressed: compose,
        semanticLabel: 'Compose',
        icon: const Icon(AppSymbols.edit),
      ),
    ),
  ],
);
```

`TanreiFloatingActionButton` (spec `fab`) follows `FloatingActionButton`: `onPressed` (null =
disabled; hiding a FAB whose action is unavailable is usually better), `icon` (a slot, drawn by
`TanreiControlIcon`), `semanticLabel` (the spec's `label`, the accessible name — **required**: an
empty or blank one still renders and is reported through `debugTanreiReportMissingName`, FAB-14),
`variant` (`filled` | `tonal` | `surface`, open key, default `filled`), `size` (`small` | `medium` |
`large`, open key: a square of 40 / 48 / 64 with corners 8 / 12 / 16 and a 20 / 24 / 24 icon in
the default system), `focusNode`, `autofocus`.

- **Elevation is part of each state.** The container casts `variants[v].of(state).containerElevation`
  outside itself, never clipped (FAB-12): level3 at rest, under focus and under press, level4 under
  hover, nothing when disabled (the default system's values). Colors and elevation change over
  `motionStateDuration` / `motionStateEasing`, at once where animations are disabled.
- **Corners are the size's** (`sizes[s].containerShape`), in every state: a FAB does not change
  shape when pressed. The icon keeps its size at any text size, as the square does.
- **It does not position itself** (FAB-13): no `Hero`, no scrim, nothing moved. Put it where the
  screen's layout wants it — a scaffold's slot, a `Stack`, an `Align`. Its place in the focus order
  is its place in the tree.
- Presses, keyboard focus, the target, the press-hold, `pressedFeedback`, `focusStyle` and corner
  smoothing are Button's (FAB-1…10 = BTN-1…10), through the same primitives. The medium FAB is
  exactly the touch target; the small one's hit area grows to it (FAB-5).

### Extended floating action button

```dart
TanreiExtendedFloatingActionButton(
  onPressed: compose,
  label: 'Compose',
  icon: const Icon(AppSymbols.edit),
  isExtended: !scrolledDown, // collapses to the icon while the content scrolls
);
```

`TanreiExtendedFloatingActionButton` (spec `extended-fab`) follows `FloatingActionButton.extended`
as a class of its own, because it has its own tokens: `onPressed` (null = disabled), `label` (a
`String`: the visible text **and** the accessible name, shown or collapsed away; an empty one
renders and is reported, EFB-19), `icon` (optional leading slot), `isExtended` (the spec's
`expanded`, default true), `variant` (`filled` | `tonal` | `surface`, open key), `size` (`small` |
`medium` | `large`, open key: 40 / 48 / 64 high, the FAB's sides), `focusNode`, `autofocus`.

- **Layout** is Button's (EFB-11): at least the size's `containerHeight`, as wide as start padding
  (`containerPaddingInlineStartWithIcon` next to an icon, `containerPaddingInlineStart` without),
  icon, `containerGap`, label, `containerPaddingInlineEnd`. The label (the size's `labelTypescale`,
  `heading5` for large in the default system) never truncates: it wraps when the layout gives it
  less width, and the container grows in both axes with it (EFB-12). The icon takes the label
  color, unselected, and does not scale with text.
- **Collapsing** (`isExtended: false`) narrows it to a square of `containerHeight` with the icon
  centered — the FAB of the same size in the default system (EFB-13) — over
  `motionResizeDuration` / `motionResizeEasing` (a springy curve, so it overshoots a little), the
  label fading out as it narrows and in as it widens; at once where animations are disabled
  (EFB-14). Which edge stays put is the layout's business: in a `PositionedDirectional(end: …)`
  it collapses towards the end. Semantics do not change: one button named by `label`.
- **Without an icon it cannot collapse** (EFB-15): `isExtended: false` is ignored and reported in
  debug builds through `debugTanreiReportIgnoredValue` (`primitives/ignored_value.dart`; replace it
  to collect or silence reports, as `debugTanreiReportMissingName`).
- Elevation per state, placement, presses, focus, the target, corner smoothing and unknown values
  are the FAB's (EFB-1…10, EFB-16, EFB-17). Right to left mirrors the order and the paddings
  (EFB-18).

### Chip

```dart
Wrap(
  spacing: 8, // the row is the product's layout (CHP-23)
  children: <Widget>[
    TanreiChip(label: 'Add to calendar', icon: const Icon(AppSymbols.event), onPressed: add),
    TanreiChip.filter(
      label: 'Vegetarian',
      selected: vegetarian,
      onSelected: (bool value) => setState(() => vegetarian = value),
    ),
    TanreiChip.input(
      label: 'Ada Lovelace',
      removeSemanticLabel: 'Remove Ada Lovelace',
      avatar: Image.asset('ada.png', fit: BoxFit.cover),
      onDeleted: () => setState(() => recipients.remove(ada)), // and move focus yourself
    ),
  ],
);
```

`TanreiChip` (spec `chip`) chooses its kind by constructor, as Flutter's own chips do: `TanreiChip`
(action), `TanreiChip.filter`, `TanreiChip.input`; `chip.kind` answers it (`TanreiChipKind`).
Props: `label` (the visible text and the accessible name), `onPressed` (the spec's `click`, any
kind), `selected` / `onSelected` (a filter chip's value and `change`; the chip keeps no value of its
own), `onDeleted` / `removeSemanticLabel` (an input chip's `remove` and its remove action's name),
`icon`, `avatar`, `variant` (`outlined` | `elevated`, open key), `size` (`small` | `medium`, open
key: 24 / 32 high in the default system), `isEnabled` (the spec's `disabled`, inverted, as
Flutter's chips name it), `focusNode`, `autofocus`.

- **Looks.** A chip draws its variant's own parts; a filter chip that is on draws the `selected…`
  parts and a check in the leading position, in place of its icon (CHP-12, CHP-13). Turning it on
  or off eases the colors, the check and — without an icon — the width over `motionSelection…`;
  a hover, focus or press eases over `motionState…` (CHP-24); both at once where animations are
  disabled. The elevated chip rises one level under hover in the default system.
- **Glyphs.** The icon is a slot. The check and the remove glyph are drawn by the chip as the
  `check` (U+E5CA) and `close` (U+E5CD) glyphs of Material Symbols — the icon set of every shipped
  system — through `TanreiControlIcon`, so they take the family, fill, weight and optical size of
  their selection (CHP-14). A system with another icon set would need other code points.
- **Avatar.** Drawn by an input chip only, at `avatarSize`, clipped to `avatarShape` (a circle by
  default), decorative, faded to `sys.state.disabled-content-opacity` when disabled. The other
  constructors accept `avatar` (Flutter's chips all do) but ignore it, and debug builds report it
  through `debugTanreiReportIgnoredValue` (CHP-15).
- **Layout** (CHP-16, CHP-17): one row; each end padded for what it holds (label, glyph or avatar);
  the label on one line in the size's `labelTypescale`, cut with an ellipsis only when the chip is
  given less width than it needs; taller with larger text. The full label stays the name.
- **Semantics.** One button node named by `label`; a filter chip adds the *selected* state
  (Flutter's toggle-button idiom, as `TanreiIconButton`), the other kinds none (CHP-11). An input
  chip's remove action is a **second** button node, named by `removeSemanticLabel`, reached by Tab
  after the chip (CHP-18, CHP-23). An empty `label`, or an input chip's empty
  `removeSemanticLabel`, is reported (`chip`, `chip remove action`, CHP-26).
- **The remove action** (CHP-18…22) has its own interaction state: hovering, focusing or pressing
  it recolors only its round container (`remove…` parts) and shows the focus ring around it, never
  around the chip. A tap on it, or Enter / Space while it has focus, calls `onDeleted` once and
  never `onPressed`; Backspace or Delete while the chip itself has focus calls it too. The chip
  never removes itself and never moves focus. Its hit area is at least `measure.targetTouch` on
  both axes, around the glyph; toward the label it reaches no further than the gap before the
  glyph, so it never covers the label, and outward it extends past the chip's end as far as it
  needs (CHP-21). The chip is not hovered or pressed while the pointer or a press is on the remove
  action (CHP-20). Flutter hit-tests only inside a render box, so the input
  chip's layout box grows at its end by that much (16 in the default medium size, 22 small). A
  dimmed or disabled chip dims its remove action with it.
- Presses, keyboard focus, the target, the press-hold, `pressedFeedback`, `focusStyle` and corner
  smoothing are Button's (CHP-1…10). The chip handles no arrow keys; a row of chips, its keyboard
  model and selection across chips belong to the product's layout until a chip group exists.

### List

```dart
// Rows that each open something: interactive tiles (one button each).
TanreiList<String>(
  children: <Widget>[
    TanreiListTile<String>(
      title: 'Wi-Fi',
      subtitle: 'Connected',
      leadingIcon: const Icon(AppSymbols.wifi),
      trailingIcon: const Icon(AppSymbols.chevronRight),
      onTap: openWifi,
      divider: true,
    ),
    // A static row with the product's own control, named by the headline.
    TanreiListTile<String>(
      title: 'Bluetooth',
      trailing: TanreiSwitch(value: on, onChanged: setOn, label: 'Bluetooth', labelHidden: true),
    ),
  ],
);

// A listbox: the owner keeps the selection in one Set, as SegmentedButton does.
TanreiList<String>(
  selectionMode: TanreiListSelectionMode.single,
  selected: <String>{theme},
  onSelectionChanged: (Set<String> value) => setState(() => theme = value.single),
  semanticLabel: 'Theme',
  children: const <Widget>[
    TanreiListTile<String>(value: 'light', title: 'Light'),
    TanreiListTile<String>(value: 'dark', title: 'Dark'),
  ],
);
```

`TanreiList<T>` (spec `list`): `selectionMode` (`none` | `single` | `multiple`, the spec's
`selection`; `TanreiListSelectionMode.fromName` for a name that arrives as text, LST-7),
`selected` (a `Set<T>`: the spec's `value` while single — at most one member — and `values` while
multiple), `onSelectionChanged` (the spec's `change`, with the new set), `semanticLabel` (the
spec's `label`, required for a selectable list), `children`. `TanreiListTile<T>` (the item kind
`list-item`, with `ListTile`'s names): `value`, `title` (the headline), `overline`, `subtitle` (the
supporting text), `subtitleMaxLines` (0 = all), `trailingText`, `leadingIcon`, `trailingIcon`
(icon slots), `leadingMedia` (`none` | `avatar` | `image`) with `leading` (its content), `trailing`
(a control of the product's own), `onTap` (non-null = the spec's `interactive`, and its `click`),
`enabled` (the spec's `disabled`, inverted, as `ListTile`), `divider`, `focusNode`.

- **Three kinds of row.** In a list whose `selectionMode` is none, a tile with a null `onTap` is
  **static**: no focus, no state answer, the resting `unselected` tokens, `enabled` ignored; a
  control in `trailing` keeps its own tokens, semantics and Tab stop (LST-11). A non-null `onTap`
  makes it **interactive**: pressed, focused and hovered exactly as `TanreiButton` (LST-1…10, the
  whole row the hit area, at least `measure.targetTouch` tall — Flutter cannot tell a fine pointer
  before it arrives, so the touch target applies, LST-5). In a selectable list every tile is an
  **option** and `onTap` is ignored: choosing one selects it (single; the selected one changes
  nothing) or switches it (multiple), and the list calls `onSelectionChanged` once (LST-13, LST-14).
- **Keyboard** (LST-15): a list with interactive tiles or options is one Tab stop — the tile
  focused last, else the first selected option, else the first enabled tile. Down / Up Arrow move
  without wrapping, Home / End go to the ends, typed characters within one second
  (`tanreiTypeaheadWindow`) go to the next headline that begins with them. A **disabled tile stays
  reachable** and shows the focus ring, but nothing activates it (LST-2). Moving focus never changes
  the selection; Space or Enter activates. The keys act only while a tile has focus, so a switch in
  a static row keeps its own.
- **Layout** (LST-16, LST-17): one `TanreiItemRow` — start padding, leading icon or media, the text
  column (overline, headline, supporting text), trailing text, trailing icon, `trailing`, and in a
  selectable list the check's box (reserved in every option, LST-21), a `containerGap` apart,
  mirrored in right-to-left. The row is at least the one-, two- or three-line height by the lines of
  text beyond the headline — counted from the laid-out text, so supporting text that wraps makes a
  three-line row — grows with its content and with enlarged text, and centers the leading and
  trailing elements on the text (top-aligned from three lines). Headline, overline and trailing text
  wrap; `subtitleMaxLines` cuts the supporting text with an ellipsis and its full text stays in the
  description (LST-18).
- **Media** (LST-20): `avatar` and `image` fit `leading` into a box of `avatarSize` / `imageSize`,
  clipped to its shape (corner smoothing included), filled with `mediaContainerColor`, with
  `mediaContentColor` as the default text and icon color. An **avatar** centres its content and
  sets a monogram (`Text('A')`) in `headlineTypescale`; a photo in it fills the circle as
  `SizedBox.expand(child: Image(…, fit: BoxFit.cover))`. An **image** box gives its content tight
  constraints (an `Image` with `fit: BoxFit.cover` fills it). `leadingIcon` is not drawn with media,
  and `leading` is not drawn without it.
- **Selection look** (LST-21, LST-26): a selected option draws the `selected` condition — in the
  default system the `secondary-container` fill and a `primary` check — stroked along the shared
  check path (`TanreiCheckMarkPainter`, the checkbox's geometry) and drawn in or taken back over the
  state motion, at once with animations disabled. A selection that names no option, an option
  without a value or with a repeated one, and a second value in a single-select list are reported in
  debug builds through `debugTanreiReportIgnoredValue` (`list selected`); the list still renders.
- **Divider** (LST-22): painted along the bottom edge from the text column's start to the row's
  end, outside the row's opacity, so a dimmed or pressed row keeps its line's color; no node.
- **Disabled** (LST-6): the row keeps its resting colors (the default system's rules) and dims as a
  whole — media included — to `comp.list.disabled.opacity`.
- **Semantics** (LST-12, LST-23): the list is a node with `SemanticsRole.list`, named by
  `semanticLabel`; each tile a `SemanticsRole.listItem` node. An interactive tile is one button node
  inside its list item; an option is the list item itself, with its selected state and a tap
  action. The headline is the name; overline, supporting and trailing text are the description
  (`hint`) in reading order; icons, the mark, the divider and the media are hidden. Flutter has no
  listbox or option role, no multi-selectable flag and no position-in-set / set-size properties, so
  a selectable list is a list of selectable items, and the
  leading media is always hidden — Flutter cannot tell a named image from a monogram. An empty headline (`list item`) or the empty label of a selectable
  list (`list`) is reported through `debugTanreiReportMissingName`.
- **Never put an interactive element in the slots of an interactive tile or an option** (LST-24):
  their content is presentational (excluded from semantics), so assistive technology could not
  reach it, and a press on it would also activate the row. Flutter cannot tell reliably whether a
  subtree is interactive, so the tile does not check. A row with its own control stays static.
- The list draws nothing of its own, adds no space around its tiles and does not scroll: place it
  on a surface or in a card, inside the product's scroll view.

### Menu

```dart
final TanreiMenuController menu = TanreiMenuController(); // dispose it with its owner

TanreiMenuAnchor(
  controller: menu,
  placement: TanreiMenuPlacement.bottomEnd,
  onClose: (TanreiMenuCloseReason reason) {}, // the menu closes itself; reason says why
  menuChildren: <Widget>[
    TanreiMenuItem(onPressed: cut, leadingIcon: const Icon(AppSymbols.cut), trailingText: '⌘X', child: const Text('Cut')),
    TanreiMenuGroup<String>(
      title: 'Sort by',
      groupValue: sort,
      onChanged: (String value) => setState(() => sort = value),
      children: const <Widget>[
        TanreiRadioMenuItem<String>(value: 'name', child: Text('Name')),
        TanreiRadioMenuItem<String>(value: 'date', child: Text('Date')),
      ],
    ),
    TanreiMenuGroup<String>(children: <Widget>[
      TanreiCheckboxMenuItem(value: grid, onChanged: (bool v) => setState(() => grid = v), child: const Text('Show grid')),
      TanreiMenuItem(onPressed: delete, destructive: true, child: const Text('Delete')),
    ]),
  ],
  builder: (BuildContext context, TanreiMenuController controller, Widget? child) =>
      TanreiIconButton(onPressed: controller.open, icon: const Icon(AppSymbols.more), semanticLabel: 'More'),
);
```

`TanreiMenuAnchor` (spec `menu`, Flutter's `MenuAnchor` idiom): `controller` (a `TanreiMenuController`
with `open()` / `close()` / `isOpen`: the spec's `open`), `placement` (`bottomStart` | `bottomEnd` |
`topStart` | `topEnd`; `TanreiMenuPlacement.fromName('bottom-end')` for a name that arrives as
text, MNU-14), `onClose` (the spec's `close`, with a `TanreiMenuCloseReason`), `menuChildren`,
`builder` / `child` (the anchor), `childFocusNode` (where focus returns; else the first focusable
node in the anchor). Items (the spec's item kinds), with `MenuItemButton`'s names:
`TanreiMenuItem` (`onPressed` — null disables — and `destructive`), `TanreiCheckboxMenuItem`
(`value` is `checked`, `onChanged` its `change`, null disables), `TanreiRadioMenuItem<T>` (`value`,
`enabled`) and `TanreiMenuGroup<T>` (`title`, `groupValue`, `onChanged`, `children`; also the radio
group of its radio items). Every item has `child` (the label, normally a `Text`: its text is the
accessible name and what typeahead matches), `supportingText`, `leadingIcon`, `trailingText` (a
shortcut) and `trailingIcon`.

- **Overlay** (MNU-1, MNU-25): the surface is an `OverlayPortal` child of the nearest `Overlay`
  (every `WidgetsApp` with a `Navigator` has one; wrap a bare tree in `Overlay.wrap`). It is an
  operated overlay that is not modal: opening focuses the first enabled item (with the
  ring when a key opened it; a pointer's open shows no ring, as the web's `:focus-visible`), closing
  returns focus to the anchor if it was inside; no scrim, no focus trap, nothing made inert. The
  anchor's node gets the *expanded* state (`MergeSemantics` around it, so the anchor should be one
  control).
- **Placement** (MNU-2, MNU-3): `surface.offset` from the anchor on the named side, start or end
  edges aligned (mirrored in right-to-left); it flips when that side has less room than the
  surface needs and the other more, shifts to stay `surface.viewport-margin` inside the overlay,
  limits its height to the room left and scrolls its items (keyboard focus scrolls an item into
  view), and follows the anchor while an ancestor scrolls or the layout moves it. As wide as its
  widest item within `surface.min-width`–`surface.max-width`; items inset by the surface padding and
  clipped to its (smoothed) shape.
- **Motion** (MNU-4): fades in and grows from the edge facing the anchor over the open motion, fades
  out over the close motion (its easing applied to the close's own progress), at once with
  animations disabled.
- **Closing** (MNU-5): the menu calls `onClose` once with `escape`, `back`, `outside` (a press
  outside the surface and the anchor — **it also reaches what is under it**, as Flutter's menus do),
  `tab` (Tab or Shift+Tab: focus then moves on from the anchor), `focusOut` (focus moved elsewhere)
  or `item` (an activation), then closes itself through its controller. All six are observed on
  Flutter: the platform's back through a `PopEntry` on the enclosing route (so back closes the menu,
  not the route), or `WidgetsBindingObserver.didPopRoute` without one. `controller.close()` by the
  product emits nothing.
- **Items** (MNU-6, MNU-18): an action calls `onPressed`, then the menu closes; a checkbox item
  calls `onChanged(!value)` and a radio item its group's `onChanged` (a checked one: nothing); after
  those — a checked radio item included — pointer, touch and Enter close the menu and **Space leaves
  it open**. Conditions:
  `destructive` for a destructive action, `selected` for a checked item, else `unselected`.
- **Keyboard** (MNU-7, MNU-8): Down / Up Arrow wrap and pass through groups, Home / End, typeahead
  on labels within `tanreiTypeaheadWindow`; disabled items are reached but never activate; titles
  and dividers take no focus. A pointer moving onto an item focuses it without the ring and draws
  it hovered (`TanreiPressableStateMixin.suppressFocusHighlight`); the keys continue from it.
- **Layout** (MNU-19, MNU-20, MNU-28): the check column (while any item is a checkbox or radio
  item) and the icon column (while any has a leading icon) are reserved in every row, so labels
  align; label and supporting text wrap and grow with the text size; the row is at least
  `container.height`, and `measure.targetTouch` for touch (MNU-12). Marks and icons align with the
  label's first line. A group title starts where labels start, in `group-title.*`, and names its
  group.
- **Dividers** (MNU-23): drawn by the menu between a group and whatever is next to it, never at the
  ends, across the surface's inner width — inside `surface.padding-inline`, the rows' inset — with
  `divider.space` above and below.
- **Semantics** (MNU-24): the surface is a `SemanticsRole.menu` node; items are `menuItem`,
  `menuItemCheckbox` and `menuItemRadio` nodes (checked state; radios in a mutually exclusive
  group), named by the label, described by the supporting and trailing text (Flutter has no
  keyboard-shortcut property); a group is a container node named by its title. Flutter cannot name
  the menu by its anchor, say that the anchor has a popup, expose a separator or a group role, or
  give positions and set sizes. An empty label `Text` is
  reported (`menu item`, MNU-26).
- **Groups** (MNU-29): a radio item outside a group is unchecked; a group value naming no radio item
  checks none; two radio items with one value are both checked; a group inside a group is drawn as
  the outer group's items (no title or divider of its own). Each is reported in debug builds
  through `debugTanreiReportIgnoredValue`.
- **In place** (MNU-19's `verify`): `TanreiMenuAnchor.inPlace(menuChildren:)` draws the open surface
  where it is built — its natural size, its elevation, no anchor, placement, motion or overlay — for
  tests, baselines and galleries. Its items still work; `onClose` still reports.
- Presses, keyboard focus (the ring inside the row), the press-hold, `pressedFeedback`, `focusStyle`
  and corner smoothing are Button's (MNU-10…17). Submenus are not part of the spec.

### Tabs

```dart
TanreiTabBar<String>(
  value: view, // null selects the first enabled tab
  onChanged: (String value) => setState(() => view = value),
  variant: TanreiTabsVariant.primary,
  isScrollable: false,
  semanticLabel: 'Project',
  tabs: const <TanreiTab<String>>[
    TanreiTab<String>(value: 'overview', label: 'Overview', icon: Icon(AppSymbols.dashboard)),
    TanreiTab<String>(value: 'activity', label: 'Activity', icon: Icon(AppSymbols.history)),
    TanreiTab<String>(value: 'billing', label: 'Billing', icon: Icon(AppSymbols.receipt), enabled: false),
  ],
),
TanreiTabBarView<String>(
  value: view,
  semanticLabels: const <String, String>{'overview': 'Overview', 'activity': 'Activity', 'billing': 'Billing'},
  children: <String, Widget>{'overview': const OverviewPage(), 'activity': const ActivityPage(), 'billing': const BillingPage()},
),
```

`TanreiTabBar<T>` (spec `tabs`, Flutter's `TabBar` idiom, selected by value instead of a
`TabController`'s index): `value` (the spec's `selected`), `onChanged` (its `change`; the bar keeps
no selection — the owner stores the value), `variant` (`TanreiTabsVariant.primary` | `.secondary`,
or a value the system adds), `isScrollable` (its `scrollable`), `semanticLabel` (its `label`, the
row's name) and `tabs`. Each `TanreiTab<T>` (the item kind `tab`) has `value`, `label` (text and
accessible name), `icon` (a slot), `labelHidden` and `enabled` (the spec's `disabled`, inverted).
`TanreiTabBarView<T>` shows the view of the selected value and does not swipe.

- **Selection** (TAB-1, TAB-11): a press, Enter or Space on an enabled tab that is not selected
  calls `onChanged` once; the selected tab emits nothing. `null` selects the first enabled tab; a
  value that names no tab selects none (no indicator); a value that is empty or repeated is
  rendered, the first tab with it being the one it selects — each reported once in debug builds
  through `debugTanreiReportIgnoredValue`.
- **Keyboard** (TAB-2, TAB-12): one Tab stop, the selected tab (the first enabled tab when the
  selected one is disabled); Right / Left Arrow (swapped in right-to-left) move to the next and
  previous enabled tab, wrapping, Home / End to the ends, and each move selects the tab it reaches
  (automatic activation). Disabled tabs are skipped. `TanreiItemGroupMixin` with a horizontal
  `itemAxis` and no typeahead.
- **Layout** (TAB-5, TAB-14, TAB-18): fixed rows share the width equally, wrap a long label and
  grow every tab to the tallest; scrollable rows size each tab to its content plus
  `container.padding-inline` on each side, keep labels on one line, start at the start edge and
  scroll. A tab is at least `container.height` (`container.height-with-icon` for a primary tab with
  an icon over its label) and the touch target on both axes. Its content is inset from the top and
  bottom edges by the variant's indicator thickness, so a wrapping label never runs under the
  indicator. Icons are drawn through `TanreiControlIcon` with the tab's selection.
- **Indicator** (TAB-16, TAB-17): drawn by the bar on the bottom edge of the row, spanning the
  content (primary) or the whole tab (secondary), its top corners rounded by
  `active-indicator.shape`; it slides and resizes to a newly selected tab over the indicator
  motion, at once with animations disabled. A newly selected or keyboard-focused tab that is partly
  scrolled out of view is scrolled into view with the same motion (TAB-15). When the row first
  appears with its selected tab out of view it scrolls there at once, with no animation, right
  after its first layout (so the first frame still shows the row at its start edge).
- **Divider** (TAB-20): along the bottom of the whole row, under the tabs and the indicator, across
  the full width while the row scrolls; excluded from semantics.
- **Semantics** (TAB-13): the row is a `SemanticsRole.tabBar` node named by `semanticLabel`; each
  tab a `SemanticsRole.tab` node with its selected and enabled state, named by `label` whether drawn
  or not; `TanreiTabBarView` is a `SemanticsRole.tabPanel` node named by `semanticLabels[value]`,
  focusable itself while nothing in it is. Flutter gives no position in the row, no number of tabs
  and no tab-to-panel relation. A hidden label without an
  icon is drawn anyway and reported (TAB-19); an empty label is reported (`tab`, TAB-22).
- Presses, keyboard focus (the ring inside the tab, which a scrolling row would clip), the
  press-hold, `pressedFeedback`, `focusStyle` and corner smoothing are Button's (TAB-3…10); colors
  ease over the state motion between states and between selected and not (TAB-23).

### Search

```dart
final TanreiSearchController search = TanreiSearchController(); // a TextEditingController + isExpanded

TanreiSearch(
  controller: search,
  semanticLabel: 'Search mail',
  hintText: 'Search mail',
  clearLabel: 'Clear search',
  presentation: TanreiSearchPresentation.docked, // .fullScreen on a small screen (needs backLabel)
  onChanged: (String query) => setState(() => suggestions = suggest(query)),
  onSubmitted: runSearch,
  onSelected: (String value) => search.text = value, // the query is the product's to set
  onExpandedChanged: (bool expanded, TanreiSearchCloseReason? reason) {},
  trailing: <Widget>[TanreiIconButton(onPressed: dictate, icon: const Icon(AppSymbols.mic), semanticLabel: 'Voice search')],
  suggestions: <TanreiSearchSuggestion>[
    for (final String q in history) TanreiSearchSuggestion(value: q, headline: q, leadingIcon: 'history'),
  ],
  child: results.isEmpty ? const Text('No results') : null, // the view's own content
),
```

`TanreiSearch` (spec `search`, the idiom of Material's `SearchAnchor` and `SearchController` without
Material): `controller` (the spec's `value` and `expanded`: a `TanreiSearchController`, a
`TextEditingController` with `isExpanded`, `expand()` and `collapse()`), `semanticLabel` (`label`),
`presentation` (`TanreiSearchPresentation.docked` | `.fullScreen`; `fromName` reads `full-screen`),
`hintText` (`placeholder`), `enabled` (`disabled`, inverted), `clearLabel`, `backLabel`, `leading`,
`trailing`, `suggestions` (the item kind `suggestion`: `TanreiSearchSuggestion(value:, headline:,
supportingText:, leadingIcon:)`, the icon a glyph name or code point drawn as text) and `child` (the
default slot). Events: `onChanged` (`input`), `onSubmitted` (`submit`), `onSelected` (`select`) and
`onExpandedChanged(expanded, reason)` (`toggle`; `TanreiSearchCloseReason.escape`, `back`, `select`,
`submit`, `outside`, `tab`, `focusOut`). `inPlace: true` draws an open view where the search is built
(under the bar, or the full-screen view alone), for baselines and the gallery.

- **Bar** (SRC-1…4, SRC-22, SRC-28): as wide as its layout, at least `container.height`, one row
  vertically centered and `container.gap` apart: the search glyph (`tanreiSearchGlyph`, hidden from
  assistive technology) `container.padding-inline` from the start, or the `leading` icon button
  `container.padding-inline-with-button` from it; the input; the clear button; the `trailing` icon
  buttons. Icon buttons take their visible size in the row (`TanreiVisibleSize`), so a 40 bar holds
  36 buttons whose 48 targets reach past it; the bar's own hit area grows to the touch target
  (`TanreiTapTarget`). The input is an `EditableText` with `TextInputAction.search`, a text keyboard,
  the typed text's own direction (`tanreiTextDirectionOf`, shared with the text field) and the text
  field's selection color; the placeholder is drawn, never the name. The bar grows with the text
  size; the icon buttons keep their size.
- **Opening and closing** (SRC-5, SRC-6, SRC-12, SRC-13): a press on the bar (outside its buttons),
  typing, or Down Arrow focuses the input and opens the view — Tab focus does not. The search calls
  `onExpandedChanged` and then updates the controller itself; a product calling `expand()` /
  `collapse()` gets no callback. Escape closes (or, closed, clears a query); a press outside the bar
  and a docked view, Tab / Shift+Tab (which then move on), focus leaving, and the platform's back
  (a `PopEntry` on the enclosing route) close a docked view with their reasons; the query stays. A
  press outside also reaches what is under it, and a touch outside lets go of the input on a phone
  as a text field does. The action key emits `onSubmitted`, then closes; the input keeps focus (the
  search passes an empty `onEditingComplete`, so `EditableText` does not unfocus first).
- **Docked view** (SRC-7, SRC-8, SRC-14…17, SRC-23): an `OverlayPortal` in the nearest `Overlay`,
  `view.offset` under the bar (above it where the room below, less `view.viewport-margin` and the
  keyboard, is too small and the room above larger), as wide as the bar, its height limited to the
  room and its content scrolling, following the bar; faded in over `motion.open-*` and grown from the
  edge facing the bar, faded out over `motion.close-*`, at once with animations disabled. No
  content, no view (the search stays expanded). Focus stays in the input (`TextFieldTapRegion` around
  the bar and the view): Down / Up Arrow make a suggestion active (focused tokens, the ring inside the
  row), typing or a new list of suggestions leaves none active, Enter chooses the active one. A
  suggestion row is a `TanreiItemRow` at least `suggestion.container.height` and the touch target,
  never focusable, pressed with the pressable mixin (`setFocused` shows it active).
- **Full-screen view** (SRC-9, SRC-11): a modal `PopupRoute` over the whole window (it counts as a
  `TanreiModalOverlays` entry), in the view color with its content inside the safe area and above the
  keyboard: a header at least `header.height` with a back button (`tanreiArrowBackGlyph`, mirrored
  right to left), its own input on the same controller (focused, the caret at the end) and a medium
  clear button, a divider, then the suggestions and `child`, scrolling. The route scopes and names
  itself (`SemanticsRole.dialog`); the platform's back closes it with the reason `back`, and focus
  returns to the bar's input without opening it again. It needs a `Navigator`; without one the view
  is docked.
- **States** (SRC-18…21): the bar is the pressable mixin with `pressedByTaps` and `hoveredByPointer`
  off: hovered from its `MouseRegion`, pressed from its `Listener` (with the press-hold and a ripple
  from the point of contact), focused whenever the input has focus however it got it. Focus is drawn
  by the focused outline inside the edge (`outline-width` of the state), and a glow around the bar
  only under `focusStyle` glow.
- **Semantics** (SRC-24, SRC-25): the bar is one text-field node named by `semanticLabel` with
  `SemanticsInputType.search` (Flutter 3.32 has no search-box role); the slot and clear buttons are nodes of their own inside it, in
  reading order, and the slots are not drawn in the full-screen header. Suggestions are buttons named
  by their headline and described by their supporting text; Flutter has no combobox, listbox or
  position in the list.
- **Disabled and reports** (SRC-26, SRC-27): disabled, the input is read-only and unfocusable, the
  clear button hidden, nothing opens or emits, and the bar draws the disabled tokens. An empty label,
  clear label (while the button shows) or back label, suggestions with an empty or repeated value or
  an empty headline, and more than two trailing buttons are drawn and reported.
- **Default slot** (SRC-29): `child` gets a `DefaultTextStyle` of `typescale.body` in the rows'
  headline color and an `IconTheme` of that color, inset like the rows.

### Segmented button

```dart
TanreiSegmentedButton<String>(
  segments: const <TanreiSegment<String>>[
    TanreiSegment<String>(value: 'day', label: 'Day'),
    TanreiSegment<String>(value: 'week', label: 'Week'),
    TanreiSegment<String>(value: 'month', label: 'Month', enabled: false),
  ],
  selected: <String>{range}, // zero or one value; several with multiSelectionEnabled
  onSelectionChanged: (Set<String> next) => setState(() => range = next.single),
  multiSelectionEnabled: false,
  size: TanreiSegmentedButtonSize.medium,
  semanticLabel: 'Range',
),
```

`TanreiSegmentedButton<T>` (spec `segmented-button`, shaped like Flutter's `SegmentedButton<T>`
without Material): `segments` (the item kind `segment`), `selected` (the spec's `value` and
`values`: a set that holds zero or one value while `multiSelectionEnabled` is false),
`onSelectionChanged` (its `change`, with the selection after the change; the set keeps none — the
owner stores it), `multiSelectionEnabled` (its `selection`: false is `single`, true `multiple`),
`size` (`TanreiSegmentedButtonSize.small` | `.medium` | `.large`, or a value the system adds) and
`semanticLabel` (its `label`, the question the options answer). Each `TanreiSegment<T>` is a value
like `ButtonSegment`: `value`, `label` (text and accessible name), `icon` (a slot), `labelHidden`
and `enabled` (the spec's `disabled`, inverted).

- **Selection** (SEG-1, SEG-2, SEG-12): single — a press, Enter or Space on an enabled segment that
  is not selected calls `onSelectionChanged` once with it; the selected one emits nothing (a single
  choice is never cleared by its own segment). Multiple — a press adds or removes the value; the
  set may become empty. A selected value that names no segment selects nothing; a repeated value
  selects the first segment with it; a single choice given several values selects the first that
  names a segment — each reported once through `debugTanreiReportIgnoredValue`.
- **Keyboard** (SEG-3, SEG-18, SEG-19): one Tab stop — the selected segment (single), or the one
  focused last, else the first selected (multiple), else the first enabled; Right / Down Arrow to
  the next enabled segment and Left / Up Arrow to the previous one (Left and Right swapped in
  right-to-left), wrapping, Home / End to the ends; with single selection each move selects (a radio
  group). Disabled segments are skipped and never the Tab stop. `TanreiItemGroupMixin` with a
  horizontal `itemAxis` and `verticalArrowsInRow`.
- **Layout** (SEG-13, SEG-14, SEG-24): one row inside the set — `set.color` under it, the outline
  inside its edge and the dividers between the segments over it, the segments `set.padding` in. The
  first and last segments' outer corners are `set.shape` less `set.padding`, every other corner the
  state's `container.shape` (`TanreiCornerShape.only`). Every segment is as wide as the widest
  one's content measured as if selected (the check included), at least the touch target; given
  more width the set divides it equally, given less its labels wrap and every segment grows to the
  tallest. The set is at least `container.height` tall — taller where a line of the label and the
  block padding need it. Selected segments are painted after their neighbours, so a raised one
  (cupertino) casts its shadow over them; nothing is clipped.
- **Check** (SEG-15, SEG-16): a selected segment draws the check (`tanreiCheckGlyph`, as the filter
  chip) before its label, in place of its icon; an icon-only segment keeps its icon (filled) and no
  check; a `check.size` of 0 draws none and reserves no room. The check and the colors change over
  the selection motion, at once with animations disabled.
- **Target** (SEG-6): the widget is at least `measure.targetTouch` tall; a press above or below the
  set, in its padding or on a divider goes to the segment in that column (a ripple from its
  center), and each segment's accessibility node spans that column.
- **Semantics** (SEG-20): single — a `SemanticsRole.radioGroup` node named by `semanticLabel`, each
  segment a radio (`checked`, `inMutuallyExclusiveGroup`); multiple — a container node named by
  `semanticLabel` (Flutter has no group role), each segment a toggle button (`button`, `toggled`).
  Each is named by its label, drawn or not; icons, the check, the dividers and the outline are not
  read. Flutter gives no position in the set or number of segments. An empty label (`segment`), an empty
  `semanticLabel` (`segmented button`), a hidden label without an icon and fewer than two or more
  than five segments are reported (SEG-22).
- Presses, keyboard focus (the ring inside the segment and inside the set's outline), the
  press-hold, `pressedFeedback`, `focusStyle` and corner smoothing are Button's (SEG-4…11); colors
  and elevation ease over the state motion between states (SEG-23).

### Button group

```dart
TanreiButtonGroup(
  variant: TanreiButtonGroupVariant.connected,
  semanticLabel: 'Text style', // optional: without it the group adds no node
  children: <Widget>[
    TanreiIconButton(onPressed: toggleBold, isSelected: bold, icon: const Icon(AppSymbols.bold), semanticLabel: 'Bold', variant: TanreiIconButtonVariant.tonal),
    TanreiIconButton(onPressed: toggleItalic, isSelected: italic, icon: const Icon(AppSymbols.italic), semanticLabel: 'Italic', variant: TanreiIconButtonVariant.tonal),
  ],
),
```

`TanreiButtonGroup` (spec `button-group`): `variant` (`TanreiButtonGroupVariant.standard` |
`.connected` — a closed enum, not a token axis; `TanreiButtonGroupVariant.fromName` for a name that
arrives as text, BGR-9), `semanticLabel` (its `label`) and `children`: `TanreiButton`s and
`TanreiIconButton`s (the item kinds `button` and `icon-button`), each configured and behaving as it
does anywhere — its own tokens, states, events, semantics and Tab stop (BGR-5). The group takes no
focus, handles no arrow keys and keeps no selection.

- **Standard** (BGR-1, BGR-4): one row, `standard.gap` apart, centred on its middle; each button
  keeps its own target. A press between two buttons goes to the nearer one.
- **Connected** (BGR-1, BGR-2, BGR-3, BGR-8, BGR-11): `connected.gap` apart, every item stretched to
  the tallest and at least `measure.targetTouch` wide (an icon button widens around its centred
  icon). Every corner that faces a neighbour is `connected.inner-shape`; the outer corners stay the
  button's own (right-to-left mirrors which are inner); fill, outline, ripple and focus ring follow
  (`TanreiCornerShape.only`). The group extends every item's hit area and accessibility node above
  and below the row to the target. Adding, removing or disabling an item recomputes the corners at
  once; a disabled item keeps its place.
- **Internal channel** (BTN-10, ICB-10): the group reaches Button and IconButton through
  `TanreiButtonGroupItemScope`, an `InheritedWidget` in `lib/src/primitives/button_group_item.dart`
  that the barrel does not export. It is not part of either button's public surface, and it applies
  only to the group's direct child. Inside a connected group the item leaves its vertical target
  extension to the group and merges its semantics into the node the group gives it.
- **Narrow rows** (BGR-7): a row wider than its layout narrows its Buttons in proportion to their
  widths, down to their longest word (labels wrap), keeps icon buttons at their size and never
  wraps or scrolls; a row that still does not fit overflows and is reported once.
- **Semantics** (BGR-6): with `semanticLabel` a container node named by it that holds the items;
  without one no node (Flutter has no group role). Fewer than two items, or a child that is not a
  Tanrei Button or icon button, are reported (BGR-10).

### Split button

```dart
final TanreiMenuController saveMenu = TanreiMenuController(); // dispose it with its owner

TanreiSplitButton(
  label: 'Save',
  icon: const Icon(AppSymbols.save),
  menuSemanticLabel: 'More save options',
  onPressed: save, // null disables both halves
  menuController: saveMenu,
  onMenuToggle: (bool open) {}, // the chevron asked; the split button opens or closes itself
  onMenuClose: (TanreiMenuCloseReason reason) {}, // the menu asked; it closes itself
  variant: TanreiSplitButtonVariant.filled,
  size: TanreiSplitButtonSize.medium,
  menuChildren: <Widget>[
    TanreiMenuItem(onPressed: saveAs, child: const Text('Save as…')),
    TanreiMenuItem(onPressed: saveAll, child: const Text('Save all')),
  ],
),
```

`TanreiSplitButton` (spec `split-button`, widgets library only): `label` and `icon` (the leading
half), `menuSemanticLabel` (the trailing half's name, the spec's `menuLabel`), `onPressed` (its
`click`; null is its `disabled`), `menuController` (its `open`: a `TanreiMenuController`, internal
when null), `menuChildren` (the menu slot: the menu's own item widgets), `onMenuToggle` (its
`toggle`, with the open value asked for), `onMenuClose` (its `close`, with a
`TanreiMenuCloseReason`), `variant` (`filled` | `tonal` | `elevated` | `outlined`, or a value the
system adds) and `size`.

- **Two halves** (SPB-1, SPB-2, SPB-4, SPB-17): each is its own button, Tab stop, state and node.
  The leading half clicks; the trailing half — pointer, touch, Enter, Space, or Down Arrow while
  closed — calls `onMenuToggle(!open)` and then opens or closes the menu through the controller.
  The trailing node has the expanded state; nothing wraps the two (the menu anchor adds no
  `MergeSemantics` here: `TanreiMenuAnchorOwnSemantics`, internal, in
  `lib/src/primitives/menu_anchor_semantics.dart`). Flutter has no has-popup property.
- **The menu** (SPB-15, SPB-16): a `TanreiMenuAnchor` around the drawn split button, `bottomEnd`,
  focus returning to the trailing half; it behaves as the Menu section says. When it asks to close,
  `onMenuClose` gets the reason once and the menu closes itself; an action item's `onPressed` comes
  first. A press on the trailing half while open toggles closed and emits no close.
- **Shape** (SPB-11, SPB-13): the outer corners are the state's `container.shape`, the join
  `container.inner-shape`; while open the trailing half's inner corners ease to
  `container.inner-shape-open` and the chevron (`tanreiArrowDownGlyph`, not mirrored) turns half a
  turn over the open motion, at once with animations disabled. Each half clips its fill and ripple
  to its own shape, draws its outline inside its edge and casts its elevation unclipped (SPB-18).
- **Layout and target** (SPB-6, SPB-12, SPB-14, SPB-19): the halves `container.inner-gap` apart,
  as tall as the taller; the label never truncates (it wraps when the layout gives less width, and
  both halves grow). Each half's hit area and accessibility node reach the touch target above and
  below and outward past its own edge — the widget's layout grows by that much — and toward the
  other half only to the middle of the gap. Right-to-left puts the trailing half on the left.
- **Disabled and empty** (SPB-3, SPB-20): disabled, neither half reacts or takes focus and no menu
  is presented whatever the controller says. An empty menu still toggles and draws the open form
  but presents nothing; it, an empty `label` (`split button`) and an empty `menuSemanticLabel`
  (`split button menu`) are reported in debug builds.
- Presses, keyboard focus (a ring around the focused half), the press-hold, `pressedFeedback`,
  `focusStyle` and corner smoothing are Button's (SPB-5…11).

### FAB menu

```dart
final TanreiMenuController create = TanreiMenuController(); // dispose it with its owner

TanreiFabMenu(
  controller: create,
  semanticLabel: 'Create',
  icon: const Icon(AppSymbols.add),
  variant: TanreiFabMenuVariant.filled,
  size: TanreiFabMenuSize.medium,
  onToggle: (bool open) {}, // the toggle asked; the FAB menu opens or closes itself
  onClose: (TanreiMenuCloseReason reason) {}, // the menu asked; it closes itself
  items: <TanreiFabMenuItem>[
    TanreiFabMenuItem(label: 'Document', icon: const Icon(AppSymbols.description), onPressed: newDocument),
    TanreiFabMenuItem(label: 'Folder', icon: const Icon(AppSymbols.folder), onPressed: newFolder),
  ],
),
```

`TanreiFabMenu` (spec `fab-menu`, widgets library only): `controller` (its `open`: a
`TanreiMenuController`, internal when null), `semanticLabel` (its `label`), `icon` (the slot: the
toggle's glyph while closed), `variant` (`filled` | `tonal` | `surface`, or a value the system
adds), `size`, `enabled` (the spec's `disabled`, inverted: the toggle's press is the component's
own), `items` (`TanreiFabMenuItem(label:, icon:, onPressed:)`, the item kind `item`; `onPressed` is
its `click`), `onToggle` (its `toggle`) and `onClose` (its `close`, with a `TanreiMenuCloseReason`).
It does not position itself (FBM-12): place it where a FAB goes.

- **Toggle** (FBM-1, FBM-11, FBM-19, FBM-21): a FAB of its size; pointer, touch, Enter, Space — and
  Down or Up Arrow while closed — call `onToggle(!open)` and open or close the menu through the
  controller. Opening turns it to the variant's `open.` look (colors and elevation), rounds its
  corners to `container.shape-open` and cross-fades its glyph to the close glyph
  (`tanreiCloseGlyph`) over the open motion; closing reverses that over the close motion. The hover
  lift is the tokens' (FBM-21).
- **Items** (FBM-5, FBM-13, FBM-18, FBM-19): presented through an `OverlayPortal` in the nearest
  `Overlay` as a column above the toggle — `list.offset` above it, `list.gap` apart, end edges on
  the toggle's (its left edge in right-to-left, FBM-22) — each a pill of `item.*` tokens at least
  `item.height` and the touch target tall, its label wrapping rather than truncating. They fade and
  grow in from their end edges, the one nearest the toggle first and each next one
  `motion.stagger` later, and fade out together (paint only: layout, hit areas and semantics stay
  whole). Everything is at once with animations disabled.
- **Focus and closing** (FBM-13…17): opening moves focus to the first item (the last,
  nearest the toggle, when Up Arrow opened it; a pointer's open shows no ring), closing returns it
  to the toggle. Down / Up Arrow wrap, Home / End go to the ends; no typeahead. Escape, the
  platform's back, a press outside the items and the toggle (**it also reaches what is under
  it**), Tab or Shift+Tab (focus then moves on from the toggle) and focus moving out call
  `onClose` once with the reason, then the menu closes itself; an item calls its `onPressed`, then
  `onClose(item)`. A press on the toggle while open toggles closed and emits no close. Not modal:
  no scrim, no trap, nothing inert.
- **Disabled** (FBM-2, FBM-6): the toggle is not focusable, reacts to nothing, draws its closed
  look's disabled tokens and presents no items whatever the controller says.
- **Semantics** (FBM-20): the toggle is a button named by `semanticLabel` with the expanded state;
  the open items are a `SemanticsRole.menu` node named by `semanticLabel`, each item a
  `SemanticsRole.menuItem` node named by its label; icons are not read. Flutter gives no position
  in the menu, number of items or has-popup. An empty
  label (`fab menu`), an item's empty label (`fab menu item`) or missing icon, and fewer than two or
  more than six items are reported (FBM-23).
- **In place** (FBM-13's `verify`): `TanreiFabMenu.inPlace(...)` lays the open items out above the
  toggle, without the overlay and without motion — for tests, baselines and galleries. Its items
  and toggle still work; `onClose` still reports.
- Presses, keyboard focus (a ring around the toggle or the item), the press-hold,
  `pressedFeedback`, `focusStyle` and corner smoothing are Button's (FBM-4, FBM-8…10).

### Tooltip

```dart
TanreiTooltip(
  message: 'Move to trash',
  excludeFromSemantics: true, // the text repeats the button's own name
  child: TanreiIconButton(onPressed: trash, icon: const Icon(AppSymbols.delete), semanticLabel: 'Move to trash'),
),
TanreiTooltip(
  variant: TanreiTooltipVariant.rich,
  title: 'Storage',
  message: 'Files in the trash still count toward your storage until they are deleted.',
  placement: TanreiTooltipPlacement.bottom,
  controller: hint, // a TanreiTooltipController: hint.show() for a first-run hint
  child: TanreiIconButton(onPressed: info, icon: const Icon(AppSymbols.info), semanticLabel: 'Storage'),
),
```

`TanreiTooltip` (spec `tooltip`, Flutter's `Tooltip` idiom): `message` (the spec's `text`),
`variant` (`TanreiTooltipVariant.plain` | `.rich`, a closed enum: the forms differ in structure),
`title` (rich only), `placement` (`top` | `bottom` | `start` | `end`; `fromName('bottom')` for a name
that arrives as text), `excludeFromSemantics` (the inverse of `describes`), `controller` (a
`TanreiTooltipController`: `show()` / `hide()` are the spec's `open` and notify nobody; its listeners
are the spec's `toggle`, notified when the tooltip opens or closes by itself) and `child` (the
anchor).

- **Opening** (TIP-1…3, TIP-5, TIP-6): a mouse resting on the anchor for `motion.show-delay`, at once
  on keyboard focus (focus a pointer or touch gave does not open it), a touch long-press (without
  activating the anchor; it closes `timeout.touch` after the finger lifts, sooner on a touch
  elsewhere). It stays while the pointer moves onto it and closes `motion.hide-delay` after the
  pointer left both, never while hovered or focused. A press, Enter or Space on the anchor closes it,
  and the same hover does not reopen it.
- **Escape** (TIP-4): closes the open tooltip wherever focus is, without moving focus. The key is
  taken before the focus system sees it (a `HardwareKeyboard` handler) and consumed by the anchor's
  focus chain, so an ancestor of the anchor (a dialog) does not also close; `TanreiDialog` checks
  `tanreiTooltipTookKey(event)` for the case where focus is elsewhere in it. Another ancestor that
  handles Escape while focus is outside the anchor still sees it. It stays closed until the anchor is entered or focused again.
- **One at a time** (TIP-7, TIP-8): a tooltip opening closes the one open elsewhere at once, and a
  hover then opens without the delay. This holds for `controller.show()` too, so a gallery of open
  fixtures shows only the last one.
- **Placement** (TIP-9): an `OverlayPortal` in the nearest `Overlay` (every `WidgetsApp` with a
  `Navigator` has one; wrap a bare tree in `Overlay.wrap`), so above a dialog route opened earlier.
  It is placed when it paints, from where the anchor is then: `offset` away on the preferred side,
  centred along it, flipped when that side has no room (the side with more room when neither has),
  shifted along the side to stay `window-margin` inside the overlay's safe area; it follows the anchor
  while an ancestor scrolls or the layout moves it, and closes when the anchor is removed or leaves
  the overlay.
- **Drawing** (TIP-10…12): the plain and rich container tokens (shape eased by corner smoothing,
  elevation as the ring and shadows of `primitives/elevation.dart`), texts start-aligned, wrapping
  within `max-width`, growing with the text size; a plain tooltip is at least `min-height` tall and
  ignores `title` (reported).
- **Motion** (TIP-15): a fade over the enter and exit motion, no movement or scale. With animations
  disabled it keeps the fade, except on Android, whose setting removes every animation.
- **Semantics** (TIP-13, TIP-14, TIP-16): the text — `title, text` for a rich tooltip — is the
  anchor's `Semantics(tooltip:)` (merged into the anchor's node, open or not; nothing while
  `excludeFromSemantics`); the anchor keeps its name and role. The drawn tooltip is excluded from
  semantics and from focus (Flutter 3.32's `SemanticsRole.tooltip` is not usable: its debug role
  check always fails); a press on it closes it and stops
  there. An empty `message` never opens and is reported.

### Slider

```dart
TanreiSlider(
  value: volume,
  onChanged: (double v) => setState(() => volume = v), // every change (the spec's input); null disables
  onChangeEnd: save,                                    // once, when the person is done (change)
  step: 10,                                             // 0 (the default) is continuous
  showStops: true,
  valueIndicator: TanreiSliderValueIndicator.active,
  semanticLabel: 'Volume',
  semanticValue: '${volume.round()} %',
),

TanreiSlider.range(
  start: low,
  end: high,
  onChanged: (double start, double end) => setState(() => (low, high) = (start, end)),
  max: 500,
  semanticLabel: 'Maximum price',
  startSemanticLabel: 'Minimum price',
),
```

`TanreiSlider` (spec `slider`, Flutter's `Slider` idiom): `value`, `onChanged` (the spec's `input`;
null is `disabled`), `onChangeEnd` (`change`), `min` / `max` (0 / 100), `step` (a size, not
Material's `divisions`; 0 continuous), `origin` (null: `min`), `showStops` (`stops`),
`valueIndicator` (`TanreiSliderValueIndicator.none` | `.active` | `.always`), `size`
(`TanreiSliderSize.small` | `.medium` | `.large`, or a size the system adds), `orientation`
(Flutter's `Axis`), `semanticLabel` (`label`) and `semanticValue` (`valueText`). The range is the
named constructor `TanreiSlider.range(start:, end:, onChanged: (start, end) {…})` with
`startSemanticLabel` and `startSemanticValue`, since Flutter's `RangeValues` belongs to Material.
`TanreiSlider.orientationFromName` and `TanreiSliderValueIndicator.fromName` read the spec's names.

- **Values** (SLD-1, SLD-22): clamped to `min`–`max` and snapped to `min` plus whole steps (the last
  step not above `max`). Values the product gives outside the scale or off a step are drawn clamped
  and snapped, a range start above its end is drawn at the end, `max` not above `min` draws the
  handles at the start and takes no input, a negative step is 0; each is reported
  (`debugTanreiReportIgnoredValue`), and none emits anything.
- **Pointer and touch** (SLD-2, SLD-5): a press anywhere on the slider moves the nearer handle (where
  two meet, the one that can move toward the press). A mouse or stylus moves it at once and a drag
  follows; on touch the handle moves once the finger has travelled along the track by the touch slop
  (an axis drag recognizer), or on a tap, and a press that travels across the track first is left to
  the enclosing scroll view. `onChanged` fires once per change of value, `onChangeEnd` once after
  the last one when the value differs from where the press began. A range's handles meet but never
  cross.
- **Keyboard and assistive technology** (SLD-3, SLD-4, SLD-5): each handle is its own Tab stop (a
  range's start first, in widget order). Right / Up Arrow add one keyboard step (`step`, or a
  hundredth of the scale), Left / Down Arrow subtract one (Right and Left swapped in a right-to-left
  horizontal slider), Page Up / Down ten, Home / End go to the lowest and highest value the handle
  can take; each change is `onChanged` then `onChangeEnd`. Each handle is a
  `Semantics(slider: true)` node named by its label, with its value text, `increasedValue` /
  `decreasedValue` and the increase and decrease actions (one keyboard step). Flutter's semantics
  have no set-value action for a slider and carry no minimum, maximum or orientation, so those are
  not exposed.
- **Drawing** (SLD-6…10, SLD-21): the slider is as long as its layout gives it (a bounded width, or a
  bounded height when vertical) and as thick as the larger of `container.size` and the size's
  `handle.height`. The track is inset by half the container at each end and drawn in pieces rounded
  by the size's `track.shape`: the active piece from the origin (or the start handle) to the value,
  no track under a handle or its `track.gap`. Stop dots of `stop-indicator.size` mark an end of the
  travel that lies on the track and, with `showStops`, every step, each in the color of the part it
  lies on. Each handle has the round state layer (`container.size`, `container.shape`) behind it,
  and is `handle.width` along and `handle.height` across, raised by `handle.elevation`. A vertical
  slider runs from the bottom up in every direction; a horizontal one runs from the right right to
  left.
- **Target** (SLD-7): the whole slider is the hit area, grown across the axis to `measure.targetTouch`
  without changing its size; the growth works where the slider's parent is larger than the slider
  (a stage's padding, a `Column`), and a parent exactly its size (a tight `SizedBox`) cuts it off,
  since Flutter hit-tests a child only inside its parent.
  Each handle's semantics node is a `measure.targetTouch` square.
- **States** (SLD-11…15): each handle has the pressable mixin's states and press: hovered while the
  mouse is over the slider and that handle is the one a press would move (`hoveredByPointer: false`
  + `setHovered`), pressed from the pointer-down for the whole press and at least
  `motion.duration.pressHold` (`pressedByTaps: false` + `beginPress` / `endPress`), keyboard focus
  with the ring around the handle. A press gives the handle focus without the focused state or the
  ring (`suppressFocusHighlight`) until a key is used on it. The tracks, dots and opacity take the
  state of the handle with the highest precedence. `pressedFeedback` answers the press from the
  handle's center; `focusStyle`, corner smoothing and the state motion are Button's.
- **Motion** (SLD-16): a value set by a key, assistive technology, a press that did not drag, or the
  product moves the handle over `motion.value-*`; a drag follows at once; with animations disabled
  everything moves at once.
- **Value indicator** (SLD-17, SLD-18): with `.always`, or `.active` while the handle is pressed or
  has keyboard focus (never while disabled), the value text in the value-indicator tokens,
  `value-indicator.offset` above the handle (at its inline start when vertical), kept inside the
  window along the axis, fading over the state motion. It is drawn through an `OverlayPortal` in the
  nearest `Overlay`, or in place (outside the handle, unclipped by the slider) where there is none;
  it takes no input and no focus and is excluded from semantics. The value text is `semanticValue`,
  else the number with the keyboard step's fraction digits (at most two); Flutter's widgets library
  has no number formatting, so the decimal separator is always `.`.
- **Disabled** (SLD-20): no input, no focus, no indicator, the disabled tokens, and a disabled
  semantics node without actions.

### Snackbar

```dart
// Around a page, inside its route, so that a dialog route opened later is drawn above it.
TanreiSnackbarMessenger(child: InboxPage());

// Anywhere below it:
final TanreiSnackbarController shown = TanreiSnackbarMessenger.of(context).show(
  const TanreiSnackbar(message: 'Conversation archived', actionLabel: 'Undo'),
);
if (await shown.closed == TanreiSnackbarClosedReason.action) {
  restore();
}
```

`TanreiSnackbar` (spec `snackbar`, Flutter's `SnackBar` idiom): `message`, `actionLabel` (the
spec's `action`; empty draws none), `showCloseIcon` and `closeIconLabel` (its `closable` and
`closeLabel`), `duration` (`TanreiSnackbarDuration.auto` | `short` | `long` | `indefinite`) and
`onClosed` (called once with a `TanreiSnackbarClosedReason`: `action` is the spec's `action` event,
`close`, `escape`, `timeout` and `host` its `dismiss` reasons). `TanreiSnackbarMessenger` (Flutter's
`ScaffoldMessenger` idiom) hosts them: `TanreiSnackbarMessenger.of(context).show(snackbar)` returns a
`TanreiSnackbarController` (`closed`, a future of the reason; `close()`), and the messenger's state
has `dismissCurrent()` and `clear()`.

- **Queue** (SNK-12): one at a time, in order; the next waits for the showing one's exit and for
  every Tanrei modal overlay to close (`TanreiModalOverlays`, which `TanreiDialog` joins). Each
  controller completes with its reason; `dismissCurrent()`, `clear()` and `controller.close()` give
  `host`.
- **Timing** (SNK-8, SNK-9): `auto` is `timeout.short` without an action and never times out with
  one; `short` / `long` use their timeout tokens; `indefinite` stays. A snackbar with an action never
  times out while `MediaQuery.accessibleNavigation` says a screen reader runs. The timeout pauses
  while the pointer is over the bar, focus is inside it, the app is not resumed
  (`AppLifecycleState`) or a modal overlay is open, and restarts from its whole length. Android's
  recommended accessibility timeout is not read (Flutter does not expose it).
- **Placement** (SNK-13, SNK-14): bottom centre of the messenger's area, `container.margin` from the
  bottom and the sides, inside the safe area and above the keyboard (`MediaQuery.viewInsets`); as
  wide as its content between `min-width` and `max-width`, never wider than the area less the
  margins; drawn over the page, and below a dialog route pushed above the page's route.
- **Layout** (SNK-15, SNK-16, SNK-18): the message wraps; the action and the close button follow it
  `container.gap` later, `controls.gap` apart, centred on the message's first line; the action
  moves to a row of its own — `container.gap` below the message, at the end, with
  `container.padding-inline-end-with-controls` below it — when the message would take more than two
  lines beside the controls or the controls leave it less than its longest word; the close button
  stays on the first row. Mirrored in right-to-left. The close glyph is Material Symbols' `close`
  (U+E5CD) through `TanreiControlIcon`, as the chip's.
- **Controls** (SNK-1…7): the action and the close button are the snackbar's own controls (the
  `control` axis, `controls.action` / `controls.close`), pressed, held, rippled, dimmed and focused as
  Button is; each answers over the touch target around its centre, and its semantics node is that
  large, while it keeps its own size (SNK-4).
- **Announcement and focus** (SNK-10, SNK-11): showing announces `message, action` once through
  `SemanticsService.announce` (polite) and moves no focus; the bar follows the page in the focus
  order; Escape inside closes it (`escape`); closing with focus inside returns focus to where it was
  before it entered, or unfocuses.
- **Motion** (SNK-17): rises by its height plus its margin while fading in over the enter motion,
  fades out in place over the exit motion. With animations disabled it fades without moving, and on
  Android, whose setting removes every animation, appears and disappears at once.
- **In place** (SNK-19): a `TanreiSnackbar` built outside a messenger draws at rest with no timer,
  queue, entrance or announcement, and still calls `onClosed` — the fixtures' and the gallery's
  form. An empty message, a close button without `closeIconLabel` (`snackbar close button`) and a
  timed action are reported in debug builds (SNK-20).

### Dialog

```dart
final bool? discard = await showTanreiDialog<bool>(
  context: context,
  barrierDismissible: true, // Escape, back and the scrim complete the future with null
  builder: (BuildContext context) => TanreiDialog(
    headline: 'Discard draft?',
    supportingText: 'The message you were writing will be deleted from this device.',
    icon: const Icon(AppSymbols.delete),
    actions: <Widget>[
      TanreiButton(variant: TanreiButtonVariant.text, autofocus: true, onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
      TanreiButton(variant: TanreiButtonVariant.text, onPressed: () => Navigator.of(context).pop(true), child: const Text('Discard')),
    ],
  ),
);
```

`showTanreiDialog<T>` (spec `dialog`'s `open`, Flutter's `showDialog` idiom: `context`, `builder`,
`barrierDismissible` — the spec's `dismissible` —, `barrierLabel`, `useRootNavigator`,
`routeSettings`) pushes a modal route and returns a `Future<T?>`: `Navigator.pop(context, value)` from
an action completes it (the dialog never closes by itself, DLG-6), and a dismissal completes it with
null (the spec's `dismiss`, DLG-5). `TanreiDialog` is the surface the builder returns: `headline`,
`supportingText`, `alert`, `icon`, `actions` (Tanrei Buttons, confirming last) and `child` (the
content).

- **Presentation** (DLG-1, DLG-3, DLG-15): a `PopupRoute`; the scrim (`scrim.color`) is drawn over the
  whole navigator with the dialog's motion, and the route's barrier under it takes every press and
  wheel behind the dialog, hides what is behind from assistive technology and keeps Tab inside
  (Flutter's closed-loop route traversal). A dialog opened from a dialog stacks above it with its own
  scrim; Escape and back reach only the topmost. While it is shown the route counts in
  `TanreiModalOverlays`, so snackbar hosts pause and hold their queue.
- **Focus** (DLG-2, DLG-4, DLG-13): `autofocus: true` on a widget in the dialog marks initial focus;
  without one the container takes it, so the headline is read first and Tab goes on to the first
  control. Closing returns focus to where it was (the navigator's own restoration), at the start of
  the motion.
- **Dismissing** (DLG-5): Escape (the route's `DismissIntent`), the platform's back
  (`Navigator.maybePop`) and a press on the scrim, only while `barrierDismissible`; a non-dismissible
  dialog's route refuses to pop on back. An Escape that closed an open tooltip in the dialog goes no
  further (`tanreiTooltipTookKey`, TIP-4).
- **Layout** (DLG-7…12, DLG-16): centred in the safe area, `container.margin` from every edge and the
  keyboard, as wide as its widest part plus `container.padding` between `min-width` and `max-width`
  (never wider than the room); icon and headline, `container.gap`, supporting text and content,
  `actions.margin-block-start`, actions, each left out when empty. An icon centres itself and the
  headline. Actions are an `OverflowBar`: a row at the end, `actions.gap` apart, or a column at the
  end when the row does not fit; never restyled. When the parts do not fit the height, the supporting
  text and the content scroll between a fixed headline and fixed actions, with a divider across the
  container on each side while something is scrolled out of view there; when the headline and the
  actions alone leave no room, everything scrolls together — decided after a layout, so that case
  settles one frame later. Mirrored in right-to-left.
  The content gets `content.color` as its default text and icon color, and plain text in it takes
  `sys.typescale.body` (Flutter's `Text` has no style of its own to fall back on), as the card's
  content does.
- **Motion** (DLG-13): the scrim and the dialog fade in over the enter motion, the dialog growing from
  `motion.enter-scale`; both fade out over the exit motion without shrinking. With animations
  disabled it fades without growing, and on Android, whose setting removes every animation, it opens
  and closes at once.
- **Semantics** (DLG-14): the container is a `SemanticsRole.dialog` node (`alertDialog` while
  `alert`) that scopes and names the route, labelled by the headline and described by the supporting
  text through `hint` (Flutter has no description property; the two texts are not read again). An
  alert dialog announces its headline and supporting text assertively when it opens. An empty
  headline is reported (`dialog`). The scrim's own semantics label is `barrierLabel` (none by
  default: the package has no localized "Dismiss").

### App bar

```dart
// A small bar, in a Material Scaffold's appBar slot or at the top of a Column.
TanreiAppBar(
  leading: TanreiIconButton(onPressed: () => Navigator.of(context).maybePop(), icon: const Icon(AppSymbols.arrowBack), semanticLabel: 'Back'),
  title: 'Inbox',
  subtitle: 'ada@example.com', // optional, one line
  centerTitle: false, // the spec's titleAlignment: start
  actions: <Widget>[
    TanreiIconButton(onPressed: search, icon: const Icon(AppSymbols.search), semanticLabel: 'Search'),
  ],
  // scrolledUnder: null follows the nearest ScrollNotificationObserver (a Scaffold's body has one).
),

// A large bar that collapses with its content: the first sliver of a CustomScrollView.
CustomScrollView(
  slivers: <Widget>[
    TanreiSliverAppBar(title: 'Inbox', size: TanreiAppBarSize.large, actions: <Widget>[/* … */]),
    SliverList.list(children: messages),
  ],
),
```

`TanreiAppBar` (spec `app-bar`, Flutter's `AppBar` idiom) is a `PreferredSizeWidget`: `title` (the
screen's name and heading), `subtitle`, `leading` (the item kind `navigation`: one `TanreiIconButton`
with its own `semanticLabel` and `onPressed`), `actions` (the item kind `action`, up to three
`TanreiIconButton`s), `size` (`TanreiAppBarSize.small` | `.large`, or a size the system adds),
`centerTitle` (the spec's `titleAlignment`: `false` start, `true` center) and `scrolledUnder` (its
`scrolled`). `TanreiSliverAppBar` takes the same parameters (large by default) and is pinned at the
top of its `CustomScrollView`.

- **Conditions** (APB-1…3): flat or scrolled — the container color, its elevation and the bottom edge
  (`outline.width` thick) of that condition, eased over `motion.condition-*` when it changes (at once
  with animations disabled), through `TanreiSelectionTransitionMixin`. In the default system the
  scrolled bar only draws its hairline edge; m3-like tints it; cupertino's flat bar is transparent.
- **Scrolled** (APB-9): `scrolledUnder: null` listens to the nearest `ScrollNotificationObserver`
  (`Scaffold` puts one around its body; without a scaffold, wrap the page in one) and is scrolled
  while the vertical view's content is scrolled from its top, as `AppBar`'s scrolled-under state; a
  bool overrides it. A `TanreiSliverAppBar` is scrolled once content lies under it — a large one only
  after it has fully collapsed — and applies the change one frame after the layout that saw it.
- **Layout** (APB-4…7, APB-15): full width; a top row at least `container.height.small` high; the
  navigation item `container.padding-inline` from the start, the title block `container.gap` after
  it (at `title.inset` without one), the actions `container.padding-inline` from the end,
  `actions.gap` apart, all vertically centered; mirrored in right-to-left. A centered title block is
  centered on the whole bar and narrowed equally on both sides, so it never runs under the buttons.
  Title and subtitle are one line each, truncated with an ellipsis, in the small styles; a large bar
  draws its title row below the top row in the large styles from `title.inset`,
  `container.padding-block-end` above the bottom edge. Heights are minimums: enlarged text grows the
  rows, and the items are kept at text scale 1. The items' touch targets also count: cupertino's
  44 row is 48 high with icon buttons in it.
- **Collapse** (APB-8): only `TanreiSliverAppBar` collapses: it shrinks one for one with the scroll
  offset to the top row's height, the expanded title moving up with the bottom edge and clipped
  under the top row, and the top row's title fading in with the part of the expanded title that is
  covered. A large `TanreiAppBar` stays expanded, and is drawn collapsed while `scrolledUnder` is true
  (it ignores the observer: it cannot collapse by scrolling).
- **Insets** (APB-10): the container reaches under `MediaQuery.paddingOf(context).top`; the content
  sits below it and inside the left and right padding, and the parts see that padding removed.
- **Items and semantics** (APB-11…13): the items are the product's icon buttons, laid out and never
  restyled; the bar is not focusable, so Tab goes from `leading` through `actions`. The title is a
  heading node (`header`, `headingLevel: 1`) and the subtitle a text node after it; a large bar
  exposes only one of its two titles (the expanded one while any of it is visible). An empty title
  draws no title block and no heading. More than three actions are drawn and reported
  (`debugTanreiReportIgnoredValue`); Flutter's single `leading` cannot hold two navigation items.
- `preferredSize` cannot read the theme, so it reports an unbounded (finite) height and the bar
  sizes itself inside a `Scaffold`.

### Toolbar

```dart
// Docked: across the bottom edge (in a Scaffold's bottomNavigationBar slot, or at the end of a Column).
TanreiToolbar(
  semanticLabel: 'Message actions',
  children: <Widget>[
    TanreiIconButton(onPressed: archive, icon: const Icon(AppSymbols.archive), semanticLabel: 'Archive'),
    TanreiIconButton(onPressed: null, icon: const Icon(AppSymbols.delete), semanticLabel: 'Delete'), // disabled
    TanreiButton(onPressed: send, child: const Text('Send')),
  ],
),

// Floating: a pill over the content, placed by the layout (a Stack's Positioned, an Align).
TanreiToolbar(
  semanticLabel: 'Formatting',
  variant: TanreiToolbarVariant.floating,
  orientation: Axis.horizontal, // Axis.vertical stands a floating toolbar upright
  children: <Widget>[
    TanreiIconButton(onPressed: () => setState(() => bold = !bold), isSelected: bold, icon: const Icon(AppSymbols.formatBold), semanticLabel: 'Bold'),
  ],
),
```

`TanreiToolbar` (spec `toolbar`): `semanticLabel` (the spec's `label`, never drawn), `variant`
(`TanreiToolbarVariant.docked` | `.floating`, or a value a layer adds, which takes the docked
structure — full width, under the insets, spread, a top edge — with its own values, TBR-13), `orientation` (Flutter's `Axis`; `TanreiToolbar.orientationFromName` reads
the spec's names) and `children`. The item kinds are the components themselves: `action` is a
`TanreiIconButton` (`semanticLabel`, `variant`, `isSelected` non-null for a toggle — `onPressed` is
both the click and the change —, `onPressed: null` to disable), `button` a `TanreiButton`
(`variant`, `onPressed`).

- **Docked** (TBR-1…3): full width, at least `container.size.docked` above the bottom inset, in the
  docked color, elevation and corners with a top edge (`TanreiEdgePainter`) `outline.width` thick.
  The first item sits `container.padding-inline.docked` from the start and the last as far from the
  end, with equal space between neighbours and never less than `container.gap.docked`; one item is
  centered. The container reaches under `MediaQuery.paddingOf(context).bottom` and the items sit
  above it and inside the side insets, which they no longer see.
- **Floating** (TBR-4…6): as long as its items need — `container.padding-inline.floating` at each end
  and exactly `container.gap.floating` between neighbours — and at least `container.size.floating`
  across, in the floating color, elevation and corners (eased by `shape.cornerSmoothing`) with an
  edge all round. It positions nothing, draws no scrim and reaches under no inset. A vertical one
  stacks its items top to bottom; a vertical docked one is laid out horizontally and reported
  (`debugTanreiReportIgnoredValue`).
- **Items are placed by what they draw** (TBR-2, TBR-4, TBR-9): the paddings and gaps run between the
  items' visible containers (a medium icon button's 36, not its 48 target: four make a 204 pill with the
  default's 16 gaps), while each item keeps its own 48 target, reaching into the space around it
  (`tanreiVisibleRectOf`). Between two items the hit areas meet at the middle of the gap between what
  they draw and never overlap (as BGR-4), in a docked toolbar's wide gap too; on a side without a
  neighbour an item keeps its own target. Across
  the axis the toolbar holds the tallest target: cupertino's 44 docked row is 48 high with icon
  buttons in it, as the app bar's is. The items are never restyled; enlarged text grows a Button and
  with it the toolbar (TBR-14), and never scales an icon button.
- **Right to left** (TBR-7): a horizontal toolbar runs from the right edge; a vertical one keeps its
  order.
- **Overflow** (TBR-8): items that do not fit scroll along the axis at their own size and the minimum
  gap, an item that takes keyboard focus is scrolled fully into view, and debug builds report that
  the extra actions belong in an overflow menu (a `TanreiMenuAnchor` on a "More" icon button).
- **Keyboard** (TBR-10): one Tab stop — the item focused last, else the first enabled one — through
  `TanreiItemGroupMixin` with its item axis set by the orientation: Right / Left Arrow (mirrored right
  to left) or Down / Up Arrow move among the enabled items, wrapping, Home and End go to the ends,
  and Enter and Space act as the item does. The toolbar takes an item out of the Tab order with a
  focus node of its own around it (`descendantsAreTraversable`, through the mixin's
  `applyTabStop`), since an icon button's `Focus` resets its own `skipTraversal` on every build.
  Disabled items are passed.
- **Semantics** (TBR-11, TBR-12): Flutter's widgets library has no toolbar role, so the toolbar is a
  semantics container named by `semanticLabel` (`Semantics(container: true, explicitChildNodes:
  true)`) holding its items' own nodes in order (a scrolling node may sit between them); it exposes
  no orientation. An empty label is reported (`toolbar`); a toolbar with no items, or a child with no
  icon button or Button in it, is laid out and reported.

### Navigation bar

```dart
TanreiNavigationBar(
  selectedIndex: current, // null selects none
  onDestinationSelected: (int index) {
    if (index == current) {
      scrollToTop(); // reselect
    } else {
      setState(() => current = index); // change
    }
  },
  labelBehavior: TanreiNavigationBarLabelBehavior.alwaysShow,
  semanticLabel: 'Main',
  destinations: const <TanreiNavigationDestination>[
    TanreiNavigationDestination(icon: 'inbox', label: 'Inbox', badge: TanreiNavigationBadge(count: 3, semanticLabel: '3 unread')),
    TanreiNavigationDestination(icon: 'send', label: 'Sent'),
    TanreiNavigationDestination(icon: 'star', label: 'Starred', enabled: false),
    TanreiNavigationDestination(icon: 'settings', label: 'Settings'),
  ],
),
```

`TanreiNavigationBar` (spec `navigation-bar`, Flutter's `NavigationBar` idiom, selected by index):
`selectedIndex` (the spec's `value`; a destination's value is its index in `destinations`),
`onDestinationSelected` (both `change` and `reselect`: called for the selected destination too, the
caller compares), `labelBehavior` (`alwaysShow` | `onlyShowSelected` | `alwaysHide`: the spec's
`labelVisibility` always, selected, never) and `semanticLabel` (its `label`). Each
`TanreiNavigationDestination` (the item kind `destination`) has `icon` (the glyph's name or code point
in the system's icon font, drawn as text through `TanreiControlIcon`), `label`, `enabled` (the spec's
`disabled`, inverted) and `badge`, a `TanreiNavigationBadge(count:, semanticLabel:)` drawn as a
`TanreiBadge` on the icon (null count: the dot).

- **Selection** (NVB-1, NVB-3, NVB-22): a press, Enter or Space calls `onDestinationSelected` once;
  the bar keeps no selection. An index that names no destination selects none and is reported
  (`debugTanreiReportIgnoredValue`). Values are indices, so none can repeat.
- **Keyboard** (NVB-2): every enabled destination is a Tab stop; a disabled one is not, and calls
  nothing.
- **Layout** (NVB-6, NVB-11…14, NVB-18, NVB-21): full width, at least `container.height` (and the
  touch target) above the bottom inset, in `container.color` with `container.elevation` and a top
  edge of `outline.width` in `outline.color` (`TanreiEdgePainter`); equal cells in reading order,
  mirrored right to left, each the destination's whole hit area. In a cell, the item container
  (`item.container.width` × `height`, corners `item.container.shape`) holds the icon at
  `item.icon.size`, with the label `item.gap` below on one line, truncated; the two are centered as a
  group, and a destination without a drawn label centers its item container. The container reaches
  under `MediaQuery.paddingOf(context).bottom`; the cells sit above it and inside the side insets.
  Enlarged text grows the bar with the labels; the item containers and icons keep their size. A bar
  narrower than 48 per destination gets narrower cells.
- **Motion** (NVB-15): a new selection grows its active indicator (the item container in the
  selected condition) from the center — in width, at full height — while the old one fades at full
  size; colors, and a label shown only while selected, ease over `motion.selection-*`. The glyph's
  fill switches at once. With animations disabled
  everything changes at once.
- **Badges** (NVB-16): a `TanreiBadge` on the icon from the badge's count and label, kept while
  disabled; its description (`semanticLabel`, or the displayed count) is the destination's semantics
  value, read after its name and state.
- **Semantics** (NVB-19, NVB-20): the bar is a `SemanticsRole.tabBar` node named by `semanticLabel`;
  each destination one `SemanticsRole.tab` node with its selected and enabled state, named by its
  label drawn or not, the icon hidden. Flutter gives no position in the set. An empty label is reported (`navigation destination`). Fewer than
  three or more than five destinations are drawn and reported (NVB-17).
- Presses, keyboard focus (the ring around the item container), the press-hold, `pressedFeedback`
  (a ripple is clipped to the item container, from its center for a press elsewhere in the cell),
  `focusStyle` and corner smoothing are Button's (NVB-4…10). Bar and rail destinations share
  `TanreiNavigationItem` (`primitives/navigation_item.dart`).

### Navigation rail

```dart
Row(
  children: <Widget>[
    TanreiNavigationRail(
      selectedIndex: current, // null selects none
      onDestinationSelected: (int index) => setState(() => current = index), // change and reselect
      labelType: TanreiNavigationRailLabelType.all,
      semanticLabel: 'Main',
      leading: TanreiIconButton(onPressed: openDrawer, icon: const Icon(AppSymbols.menu), semanticLabel: 'Menu'),
      destinations: const <TanreiNavigationRailDestination>[
        TanreiNavigationRailDestination(icon: 'inbox', label: 'Inbox', badge: TanreiNavigationBadge(count: 3, semanticLabel: '3 unread')),
        TanreiNavigationRailDestination(icon: 'send', label: 'Sent'),
        TanreiNavigationRailDestination(icon: 'star', label: 'Starred', disabled: true),
      ],
    ),
    const Expanded(child: Page()),
  ],
),
```

`TanreiNavigationRail` (spec `navigation-rail`, Flutter's `NavigationRail` idiom): `selectedIndex`,
`onDestinationSelected` (both `change` and `reselect`), `labelType` (`all` | `selected` | `none`: the
spec's `labelVisibility` always, selected, never), `leading` (the `header` slot: the header-button
items, `TanreiIconButton`s with their own `semanticLabel` and `onPressed`, and a floating action
button, in a `Column` when there are both) and `semanticLabel`. Each
`TanreiNavigationRailDestination` has `icon`, `label`, `disabled` (as `NavigationRailDestination`'s
flag) and `badge` (a `TanreiNavigationBadge`, as the bar's). Destinations are the bar's
`TanreiNavigationItem`, so selection, keyboard, states, presses, badges, motion and semantics are the
navigation bar's (NVR-1…10, NVR-14…17, NVR-20, NVR-21, NVR-23).

- **Layout** (NVR-6, NVR-11…13, NVR-18, NVR-19, NVR-22): `container.width` wide beside the start
  inset and as tall as its parent (put it first in a `Row`), in `container.color` with
  `container.elevation` and an end edge of `outline.width` in `outline.color` (on the left in
  right-to-left). The header is centered `container.padding-block` below the top and stays put; the
  destinations scroll below it, the first `header.gap` under the header (`container.padding-block`
  under the top without one), `container.gap` apart. A cell is the rail's width and the destination
  with half the gap above and below — the whole hit area, at least the touch target high, so without
  labels the item containers are 48 apart. A label takes
  up to two lines, then an ellipsis; enlarged text grows the destinations, never the width, the
  item containers or the icons. The container reaches under the insets at the rail's start, top and
  bottom; the content sits inside them. Fewer than three or more than seven destinations are drawn
  and reported.
- **Semantics** (NVR-20): the destinations are a `SemanticsRole.tabBar` node named by
  `semanticLabel` (inside the scroll view: a tab bar's children must be tabs), after the header,
  which keeps its own semantics and comes first in focus order.

### Navigation drawer

```dart
// Standard: a layout region, first in a Row beside the content.
Row(
  children: <Widget>[
    TanreiNavigationDrawer(
      open: sidebarOpen,
      selectedIndex: current,
      onDestinationSelected: (int index) => setState(() => current = index),
      semanticLabel: 'Mail',
      children: const <TanreiNavigationDrawerChild>[
        TanreiNavigationDrawerSection(
          heading: 'Mail',
          children: <TanreiNavigationDrawerChild>[
            TanreiNavigationDrawerDestination(icon: 'inbox', label: 'Inbox', badge: '24'),
            TanreiNavigationDrawerDestination(icon: 'send', label: 'Sent'),
          ],
        ),
        TanreiNavigationDrawerSection(
          heading: 'Labels',
          divider: true,
          children: <TanreiNavigationDrawerChild>[
            TanreiNavigationDrawerDestination(icon: 'label', label: 'Work', enabled: false),
          ],
        ),
      ],
    ),
    const Expanded(child: Page()),
  ],
),

// Modal: over the page, as the last child of a Stack that fills the window.
Stack(
  children: <Widget>[
    const Positioned.fill(child: Page()),
    TanreiNavigationDrawer(
      variant: TanreiNavigationDrawerVariant.modal,
      open: menuOpen,
      onClose: () => setState(() => menuOpen = false),
      selectedIndex: current,
      onDestinationSelected: (int index) => setState(() => current = index),
      semanticLabel: 'Mail',
      children: destinations,
    ),
  ],
),
```

`TanreiNavigationDrawer` (spec `navigation-drawer`, Flutter's `NavigationDrawer` idiom, selected by
index): `variant` (`TanreiNavigationDrawerVariant.standard` | `.modal`, or a value a system adds),
`open`, `selectedIndex` (the spec's `value`: a destination's index among all destinations, counted in
reading order through the sections), `onDestinationSelected` (both `change` and `reselect`),
`onClose` (its `close`), `semanticLabel` (its `label`), `header` (its `header` slot) and `children`:
`TanreiNavigationDrawerDestination(icon:, label:, badge:, enabled:)` (the item kind `destination`;
`icon` a glyph name or code point, null for none; `badge` the trailing text) and
`TanreiNavigationDrawerSection(heading:, divider:, children:)` (the item kind `section`).

- **Rows** (NVD-3…10, NVD-13…15): each destination is an item container across the inner width, at
  least `item.container.height`, corners `item.container.shape`: icon, label (wrapping) and badge
  text, `item.padding-inline` in and `item.gap` apart, mirrored right to left, colored by its
  condition (selected or not) in its state; its hit area is the row with half of `container.gap`
  above and below (the touch target with the default tokens; a system whose rows and gap give less
  grows the row instead of only the hit area). Presses, focus ring, press-hold, `pressedFeedback`,
  `focusStyle` and corner smoothing are Button's. A disabled destination is not focusable and keeps
  its badge. Each is a button with its selected state, named by its label, the badge text as its
  value; no position in the set.
- **Sections** (NVD-16, NVD-17): a `TanreiDivider` before a section whose `divider` is true, the
  heading in `heading.typescale` / `heading.color` in a row at least `heading.height`, starting where
  the rows' content starts, exposed as a heading; then its destinations. A section in a section is
  drawn in its place and reported.
- **Panel** (NVD-11, NVD-12, NVD-25, NVD-27): `container.width` beside the start inset and as tall as
  its parent, in the variant's `container.color`, `container.elevation` and end corners
  (`container.shape`; the start corners are square: the container is drawn past the start edge and
  clipped there), with an end edge of `outline.width` in the variant's `outline.color`. The header and
  the items, `container.padding-inline` and `container.padding-block` in, scroll together. The
  container reaches under the insets at its start, top and bottom. Enlarged text grows rows and
  headings, never the width or the icons.
- **Standard** (NVD-18, NVD-28): a layout region. Open, it takes its width; closed, none, and it is
  neither seen nor focused. A change slides it over `motion.enter-*` / `motion.exit-*` while the
  content beside it resizes (at once with animations disabled). Opening moves focus to the selected
  destination (or the first focusable element); closing with focus inside returns focus to where it
  was. Tab leaves it; it never calls `onClose`.
- **Modal** (NVD-19…22): a modal overlay placed over the page (not `Scaffold.drawer`, which would
  draw Material's scrim and motion). Open, it
  slides in from the start edge over `scrim.color`, takes focus, keeps Tab in its `FocusScope`, blocks
  the page's semantics (`BlockSemantics`) and presses (the scrim), and counts in
  `TanreiModalOverlays`. The scrim, Escape, the platform's back (a `PopScope` on the enclosing route),
  a drag toward the start edge past half its width or a fling, and activating a destination call
  `onClose` once; it is controlled, so it closes when the owner sets `open` to false (and is put back
  if the owner does not), sliding out and returning focus to where it was. It is a
  `SemanticsRole.dialog` node that scopes and names the route with `semanticLabel`; an empty one is
  reported (`navigation drawer`, NVD-24).
- A variant the system does not have is drawn with standard's tokens, reported, and behaves as
  standard (NVD-26).

### Bottom sheet

```dart
// Modal: over the page, as the last child of a Stack that fills the window.
Stack(
  children: <Widget>[
    const Positioned.fill(child: Page()),
    TanreiBottomSheet(
      open: shareOpen,
      onClose: (TanreiSheetCloseReason reason) => setState(() => shareOpen = false),
      detent: detent,
      onDetentChanged: (TanreiBottomSheetDetent value) => detent = value,
      semanticLabel: 'Share photo',
      handleSemanticLabel: 'Resize sheet',
      child: const ShareTargets(),
    ),
  ],
),

// Standard: over the bottom of its parent, which stays usable (a layout region).
Stack(
  children: <Widget>[
    const Positioned.fill(child: Map()),
    TanreiBottomSheet(
      variant: TanreiBottomSheetVariant.standard,
      open: true,
      semanticLabel: 'Nearby places',
      handleSemanticLabel: 'Resize sheet',
      inset: false,
      child: const PlacesList(),
    ),
  ],
),
```

`TanreiBottomSheet` (spec `bottom-sheet`), controlled: `variant` (`TanreiBottomSheetVariant.modal`,
the default, or `.standard`; a Dart enum, not a token axis — `fromName` renders an unknown name as
modal and reports it, BSH-25), `open`, `onClose` (the spec's `close`, with a `TanreiSheetCloseReason`:
`drag`, `scrim`, `escape` or `back`; called only while `dismissible`, and the caller sets `open` to
false), `detent` (`TanreiBottomSheetDetent.partial` | `.full`) and `onDetentChanged` (its
`detentChange`), `dismissible`, `showHandle` and `handleSemanticLabel` (its `handle` and
`handleLabel`), `inset`, `semanticLabel` (its `label`) and `child` (the content). Place it as the
last child of a `Stack` over what it covers; it fills the `Stack`. Not `showModalBottomSheet`, which
needs Material.

- **Heights** (BSH-6, BSH-7, BSH-24): as tall as its handle's row and its content, up to
  `container.partial-fraction` of the area (partial) or the area less
  `container.margin-block-start` (full); with content shorter than the partial height it has one
  height and `detent` changes nothing. The area is the window below its top inset (modal) or the
  parent (standard), and ends at the on-screen keyboard (`MediaQuery.viewInsets`). At the area's
  bottom edge, at most `container.max-width` wide and centred, in `container.color` and
  `container.elevation`, the top corners `container.shape` (eased by the system's smoothing; the
  bottom corners are square: the container is drawn past the bottom edge and clipped there). Its
  color reaches under the bottom inset and the content stays above it. Enlarged text grows it up to
  its detent and scrolls; the handle does not scale.
- **Content** (BSH-8, BSH-10): below the handle's row, inset by `container.padding` from the start,
  end and bottom (and the top without a handle) unless `inset` is false, clipped to the container,
  given `content.color` and the body style (`DefaultTextStyle`, `IconTheme`). It scrolls in a
  `SingleChildScrollView` whose position hands a drag to the sheet first: up on the content raises
  the sheet to full, then scrolls; down scrolls to the top, then lowers the sheet.
- **Dragging** (BSH-9, BSH-20): a vertical drag on the handle's row, the padding or the content
  follows the finger past `kTouchSlop`, never above full; a release settles at the next height in a
  fling's direction (`kMinFlingVelocity`) or the nearest one, over `motion.enter-*` (at once with
  animations disabled), and `onDetentChanged` reports a new detent once. Below half of the lowest
  height, or a fling down from it, asks to close (`drag`); the sheet holds for one frame, then slides
  out if `open` became false or settles back. Not dismissible, it settles at the lowest height.
- **Drag handle** (BSH-11 – BSH-19): a box `handle.container-width` × `handle.container-height`
  (`handle.container-shape`) with `handle.margin-block` above and below, the grip
  `handle.grip-width` × `handle.grip-height` in it; drawn from `controls[dragHandle]` in its state.
  With two heights it is a button named by `handleSemanticLabel` with the expanded state (full),
  and a press, Enter or Space moves the sheet to its other height; with one height it is drawn at
  rest and neither focusable, pressable nor exposed. Its target is its row across the box, at least
  `measure.targetTouch` on both axes from the sheet's top edge, reaching into the content below a
  lower row (cupertino's). Presses show at once (a raw pointer down, since the tap competes with
  the sheet's drag), are held for `motion.duration.pressHold`, and answer as
  `behavior.pressedFeedback` says; a drag that moves the sheet ends the press. Focus ring, focus
  style and corner smoothing are Button's.
- **Modal** (BSH-1 – BSH-3, BSH-5, BSH-23): rises from below over `motion.enter-*` and leaves over
  `motion.exit-*` while `scrim.color` fades in and out (with animations disabled it fades in place,
  and on Android appears and disappears at once). It blocks presses behind it (the scrim), the
  page's semantics (`BlockSemantics`), keeps Tab in its `FocusScope`, is a `SemanticsRole.dialog`
  node that scopes and names the route, counts in `TanreiModalOverlays`, and answers the platform's
  back (a `PopScope` on the enclosing route) and Escape. A dialog opened from it stacks above it and
  gives focus back to it.
- **Standard** (BSH-4): no scrim; presses above it reach the content, Tab leaves it
  (`TraversalEdgeBehavior.parentScope`) without closing it, Escape and back are ignored. It does not
  pad the content it covers. A named container, not a landmark: Flutter 3.32 has no region role.
- **Focus** (BSH-3): opening moves focus to the content's `autofocus: true` widget or, without one,
  to the sheet's own focus scope; closing with focus inside returns it to where it was (or to the
  scope around the sheet when that element is gone). A sheet mounted with `open` true does not move
  focus. An empty `semanticLabel` is reported (`bottom sheet`), and so is an interactive handle
  without `handleSemanticLabel` (`bottom sheet handle`).

### Side sheet

```dart
// Standard: a layout region, last in a Row beside the content.
Row(
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: <Widget>[
    const Expanded(child: Results()),
    TanreiSideSheet(
      open: filtersOpen,
      onClose: (TanreiSheetCloseReason reason) => setState(() => filtersOpen = false),
      headline: 'Filters',
      showCloseButton: true,
      closeButtonSemanticLabel: 'Close filters',
      child: const FilterForm(),
    ),
  ],
),

// Modal: over the page, as the last child of a Stack that fills the window.
Stack(
  children: <Widget>[
    const Positioned.fill(child: Results()),
    TanreiSideSheet(
      variant: TanreiSideSheetVariant.modal,
      open: filtersOpen,
      onClose: (TanreiSheetCloseReason reason) => setState(() => filtersOpen = false),
      headline: 'Filters',
      showCloseButton: true,
      closeButtonSemanticLabel: 'Close filters',
      actions: <Widget>[
        TanreiButton(onPressed: apply, child: const Text('Apply')),
        TanreiButton(variant: TanreiButtonVariant.text, onPressed: reset, child: const Text('Reset')),
      ],
      child: const FilterForm(),
    ),
  ],
),
```

`TanreiSideSheet` (spec `side-sheet`), controlled: `variant` (`TanreiSideSheetVariant.standard` |
`.modal`, or a value a system adds; an unknown one is drawn with standard's tokens, reported, and
behaves as standard, SSH-13), `open`, `onClose` (the spec's `close`, with a `TanreiSheetCloseReason`:
`close`, `scrim`, `escape`, `back` or `drag`; the caller sets `open` to false), `headline`,
`showCloseButton` and `closeButtonSemanticLabel` (its `closable` and `closeLabel`), `actions` (its
`actions` slot: Tanrei Buttons, main action first) and `child` (the content).

- **Panel** (SSH-7, SSH-14): `container.width` beside the end inset and as tall as its parent
  (standard) or the window (modal) — a modal sheet never wider than the window less
  `measure.targetTouch`, so a strip of scrim stays pressable — in the variant's `container.color` and
  `container.elevation`, the start corners the variant's `container.shape` (eased by the system's
  smoothing; the end corners are square: the container is drawn past the end edge and clipped with
  `TanreiEdgeClipper`), the start edge `outline.width` in the variant's `outline.color`. Mirrored
  right to left. Enlarged text keeps the width.
- **Header** (SSH-5, SSH-8, SSH-9): while there is a headline or a close button, a row at least
  `header.height`: the headline in `headline.typescale` / `headline.color`, wrapping, a heading,
  `container.padding-inline` from the start edge; the close button — a standard, medium
  `TanreiIconButton` with the close glyph, named by `closeButtonSemanticLabel`, laid out by what it
  draws (`TanreiVisibleSize`) — `header.padding-inline-end` from the end edge, `header.gap` after the
  headline. Activating it calls `onClose(close)` in either variant; without a name it is drawn and
  the icon button reports itself.
- **Content** (SSH-8, SSH-10): `container.padding-inline` in, directly below the header (or
  `container.padding-block` below the top without one), `container.padding-block` above the bottom
  without actions; `content.color` and the body style as `DefaultTextStyle` / `IconTheme`; it scrolls
  between the header and the actions.
- **Actions** (SSH-11): a hidden `divider.width` line in `divider.color` across the sheet, then the
  buttons in an `OverflowBar` from the start edge, `actions.gap` apart, `actions.padding-block` above
  and below, stacked from the start when they do not fit; never restyled.
- **Standard** (SSH-1, SSH-3): a layout region. Open, it takes its width; closed, none, and it is
  neither seen nor focused; a change slides it over `motion.enter-*` / `motion.exit-*` while the
  content beside it resizes (at once with animations disabled). Tab leaves it
  (`TraversalEdgeBehavior.parentScope`); Escape, back and drags are ignored. A named container, not a
  complementary landmark.
- **Modal** (SSH-2 – SSH-4, SSH-6, SSH-15): slides in from the end edge over `scrim.color` and out to
  it (with animations disabled it fades, and on Android appears at once); keeps Tab in its
  `FocusScope`, blocks presses (the scrim) and the page's semantics (`BlockSemantics`), is a
  `SemanticsRole.dialog` node named by the headline, and counts in `TanreiModalOverlays`. The scrim,
  Escape, back (`PopScope`), a drag toward the end edge past half its width or a fling that way
  (`kTouchSlop`, `kMinFlingVelocity`) call `onClose` once; a shorter drag slides back over the enter
  motion, and a declined drag holds for a frame and slides back. A dialog opened from it stacks above
  it and gives focus back to it.
- **Focus** (SSH-3): as the bottom sheet's — the content's `autofocus: true` widget or the sheet's own
  scope on opening, returned on closing; none moved when mounted open. An empty `headline` is
  reported (`side sheet`).

### Carousel

```dart
TanreiCarousel(
  semanticLabel: 'Walks near you',
  children: <TanreiCarouselItem>[
    for (final Walk walk in walks)
      TanreiCarouselItem(
        key: ValueKey<String>(walk.id),
        label: '${walk.name}, ${walk.photos} photos',
        onTap: () => open(walk),
        child: Image(image: walk.cover, fit: BoxFit.cover),
      ),
  ],
),
```

`TanreiCarousel` (spec `carousel`), built on the widgets library's `Scrollable` with a layout of its
own and settling scroll physics, not Material's `CarouselView`: `layout`
(`TanreiCarouselLayout.multiBrowse`, the default, `.hero` or `.uncontained`; a Dart enum, not a
token axis — `fromName('multi-browse')` renders an unknown name as multi-browse and reports it,
CRL-24), `itemWidth` (the large width; null for `container.large-width`, a value that is not a
positive number is treated as null and reported), `semanticLabel` (its `label`) and `children`:
`TanreiCarouselItem(label:, onTap:, child:)` (the item kind `item`; `onTap` is its `click`).

- **Row** (CRL-8, CRL-9, CRL-25): as wide as its parent and `layout.height` tall unless the parent
  gives a tight height (never lower than `measure.targetTouch`), items as tall, `layout.gap` apart
  inside `layout.padding-inline`; items scroll under the padding and are clipped at the edges.
  Enlarged text changes nothing: the row holds no text of its own.
- **Arrangement** (CRL-10 – CRL-13): CRL-10's closed formula for multi-browse (n large, one medium,
  one small between `container.small-min-width` and `container.small-max-width`), CRL-11's for hero,
  every item the large width for uncontained, one slot as wide as the row when three small slots do
  not fit. Widths are not rounded. In multi-browse and hero each item sits at slot `i − p`,
  interpolated between the slots around it, `p` advancing by one per large slot and gap scrolled;
  at the end of the range the last item is large.
- **Scrolling** (CRL-14, CRL-18, CRL-21): touch, trackpad, a horizontal wheel or Shift with a
  vertical wheel. Multi-browse and hero settle at a whole position — the next in a fling's direction
  (`kMinFlingVelocity`), else the nearest — over `motion.scroll-*` (at once with animations disabled);
  Flutter settles after every wheel event, not at the end of a wheel gesture. Uncontained scrolls freely. Keyboard and
  assistive-technology focus bring an item to slot 0 (or just into view, uncontained). A new width
  or new items keep the item in place where it was (items are matched by `key`).
- **Items** (CRL-1 – CRL-7, CRL-15, CRL-16, CRL-22): the content laid out at the large slot's width
  and the row's height, centred and clipped to `container.shape` (eased by the system's smoothing),
  over the resting `item.container.color`, given `item.content.color` and the body style. Hover,
  focus and press draw a state layer **over the content** — `item.state-layer.color` at
  `sys.state.hover-`, `focus-` or `pressed-state-layer-opacity` — with the ripple in that same layer,
  so they show on an image (the state's content color, opacity and shape come from `parts[item]` and
  the state's tokens); the focus ring inside the container, presses shown at once (a raw pointer down, since the tap competes with the scroll)
  and held for `motion.duration.pressHold`, answered as `behavior.pressedFeedback` says; a press that
  becomes a scroll activates nothing. The hit area is the container with half the gap on each side,
  at least the touch target wide.
- **Keyboard** (CRL-17): one Tab stop (the last focused item, else the one in place); Right and Left
  Arrow move to the next and previous item without wrapping (mirrored right to left), Home and End
  to the ends.
- **Semantics** (CRL-19, CRL-20): a container named by `semanticLabel` around the `Scrollable`, which
  reports the number of items (`semanticChildCount`); each item an `IndexedSemantics` button named by
  its label, its node as wide as its hit area; the content is excluded. Items out of view stay in the
  tree (marked hidden), in order. An empty `semanticLabel` is reported (`carousel`), and so is an
  item without a label (`carousel item`). **An item's content must hold no interactive element**:
  Flutter cannot inspect it; the content receives no pointer events (`IgnorePointer`).
- **Right to left** (CRL-23): the row is mirrored — slot 0 at the right, the scroll direction
  reversed — and the content is not.

### Date picker

```dart
// Modal: a dialog with a header, text entry and Cancel and OK.
final TanreiDateSelection? chosen = await showTanreiDatePicker(
  context: context,
  value: dueDate,
  firstDate: DateTime(2026),
  lastDate: DateTime(2027, 12, 31),
  isDateDisabled: (DateTime day) => day.weekday == DateTime.sunday,
);
if (chosen != null) setState(() => dueDate = chosen.value);

// Docked: below the product's own field, committed by choosing a day.
TanreiDatePickerAnchor(
  controller: controller,
  mode: TanreiDatePickerMode.range,
  start: stay.start,
  end: stay.end,
  labels: const TanreiDatePickerLabels(label: 'Select dates'),
  onChanged: (TanreiDateSelection s) => setState(() => stay = (start: s.start, end: s.end)),
  builder: (BuildContext context, TanreiDatePickerController controller, Widget? child) =>
      TanreiIconButton(onPressed: controller.open, icon: const Icon(AppSymbols.calendarMonth), semanticLabel: 'Choose dates'),
),
```

The spec's `presentation` is the API, as Flutter's own pickers are: `showTanreiDatePicker` (spec
`date-picker`, `showDatePicker`'s idiom) pushes a modal route and returns a
`Future<TanreiDateSelection?>` — the committed choice on OK, null otherwise; `TanreiDatePickerAnchor`
(the menu anchor's shape: `controller`, `builder`, `child`, `childFocusNode`) shows a docked picker
in the `Overlay`, and `TanreiDatePickerController.open()` / `.close()` are its `open`. Both take
`mode` (`TanreiDatePickerMode.single` / `.range`), `value`, `start`, `end`, `firstDate` and
`lastDate` (the spec's `min` and `max`), `disabledDates`, `isDateDisabled`, `currentDate` (the
spec's `today`), `firstDayOfWeek` (`TanreiDatePickerFirstDayOfWeek.locale`, `.sunday` …), `locale`,
`entryMode` (`calendar` / `text`), `startView` (`day` / `year`), `labels` (a
`TanreiDatePickerLabels` whose fields are the spec's fourteen words, English by default),
`onChanged` (the spec's `change`, a `TanreiDateSelection`) and `onClose` (its `close`, with a
`TanreiDatePickerCloseReason`: `escape`, `back`, `outside`, `tab`, `focusOut`, `cancel`, `confirm`,
`select`). The picker closes itself through its route or controller; `onChanged` comes before
`onClose`. The enums are Dart enums with `fromName` for text (an unknown name renders as the
default and is reported, DTP-40). `TanreiDatePicker` draws either surface in place, without an
overlay or motion: the fixtures' form, for tests and galleries.

- **Dates** (DTP-37): `DateTime`s of which only the year, month and day are read; the picker hands
  out local midnights and never computes with an instant, so no time zone moves a date.
  `TanreiDatePicker.parseDate('2026-09-17')` reads an ISO date that arrives as text (a malformed one
  is null and reported).
- **Locale** (DTP-37): month and weekday names, the header's forms, digits and the numeric date's
  order and separator come from `TanreiDateLocalizations`, looked up with `Localizations`. The
  package ships English only (`TanreiDateLocalizations.delegate`: US forms for `en-US`, day-first
  forms for other English regions) and takes no `intl` dependency; a product in another language
  adds its own delegate (`package:intl`'s `DateFormat` can back one in a few lines). Without one the
  picker falls back to English. `locale` overrides the ambient locale as `showDatePicker`'s does
  (`Localizations.override`), keeping the ambient text direction. The first day of the week is the
  localizations' `firstDayOfWeek`, else CLDR's week data embedded in `tanreiFirstDayOfWeek`.
- **Modal** (DTP-1, DTP-6, DTP-22 … DTP-24, DTP-38): a `PopupRoute` like the dialog's; the scrim
  (`modal.scrim.color`) takes presses itself (reason `outside`), back is a `PopScope` (reason `back`),
  Escape is handled in the surface (reason `escape`); Tab moves through the entry-mode toggle, the
  view toggle, the arrows, the active day (or the fields), Cancel and OK, wrapping. The choice is
  pending until OK, which is disabled while it is incomplete or a field holds text that is no
  available date. The header shows `labels.label` and the pending choice (the year added outside
  today's year, a missing part as its label in `header.placeholder.color`); Cancel and OK are text
  Buttons in an `OverflowBar`. When the window is short the header and the actions stay and the
  calendar scrolls between them; when they alone leave no room everything scrolls together, one
  frame later (as the dialog's). Where the window is too narrow for the surface the side margins
  shrink first (a docked picker's too), then the container's inline padding; below seven touch
  targets the cells narrow equally so the grid fits the window, keeping their height and their
  numbers' size (DTP-38). It fades in growing from
  `modal.motion.enter-scale`, fades out without shrinking; with animations disabled it fades
  without growing, and on Android opens and closes at once. While shown it counts in
  `TanreiModalOverlays`.
- **Docked** (DTP-2, DTP-5, DTP-7, DTP-22): placed as the menu's surface — `docked.offset` below the
  anchor, start edges aligned, flipped above when the space below is smaller, shifted to stay
  `docked.viewport-margin` inside, its height limited to the room (it then scrolls), following the
  anchor. It traps nothing and draws no scrim; a press outside it and its anchor closes it **and also
  reaches what is under it** (a `TapRegion`, as Flutter's menus). Tab out of its last part, or
  Shift+Tab out of its first, closes it (reason `tab`) and moves focus on from the anchor; focus
  leaving otherwise closes it (`focusOut`); back closes it before the route. Choosing a day that
  completes the choice commits it (`select`); a range's start commits nothing. `entryMode: text` is
  reported and ignored (DTP-28). It fades in growing from the edge that faces the anchor and fades
  out; with animations disabled it appears and disappears at once. The anchor reports `expanded`.
- **Calendar** (DTP-10 … DTP-21, DTP-29 … DTP-35): six rows of seven cells of `cell.size` (at least
  `measure.targetTouch`; Flutter cannot tell a fine pointer); each day (`TanreiDatePickerDay`, the
  item kind `day`, generated by the picker) is drawn from one condition —
  `TanreiDatePickerCondition.selected` over `inRange` over `today` over `unselected` — in the
  interaction state it is in, with the press held and answered as `behavior.pressedFeedback` says and
  the focus ring as `behavior.focusStyle` says, like a Button. An in-range day's container spans its
  cell (the band); a range's ends draw the half cell toward each other. Unavailable days draw their
  condition's disabled tokens, stay reachable by the arrows and are never chosen. The grid is one Tab
  stop (the active day); the arrows (mirrored right to left), Home, End, Page Up and Page Down (with
  Shift: a year) move it across months, within the bounds. The view toggle switches to the year list
  (`TanreiDatePickerYear`, the item kind `year`), which opens with the displayed year in its third
  row. Months slide and views cross-fade over `motion.page-*`; the arrows announce the new month
  politely.
- **Text entry** (DTP-25 … DTP-28): outlined `TanreiTextField`s with the locale's pattern
  (`mm/dd/yyyy`) as placeholder, filled in the numeric form and never reformatted. Text reading as an
  available date becomes the pending date; a committed field that does not is put in error
  (`labels.invalidText` or `labels.unavailableText`) until its next edit. The action key moves to the
  next field, or activates OK in the last.
- **Semantics** (DTP-36): the surface is a `SemanticsRole.dialog` node named by `labels.label` (a
  modal one scopes and names the route); the grid a `table` named by the month and year, whose rows
  are `row`s of `columnHeader`s (the weekdays' full names) and `cell`s; each day a button in its cell,
  named by its full date (`, Today` after today's: Flutter has no current-date property), selected
  for the chosen date and every day of a range, described (`hint`) by `startLabel` or `endLabel`, and
  disabled while unavailable; empty cells and an empty last row are left out. The view toggle is a
  button named by its month and year, described by `yearViewLabel`, with its expanded state; each
  year a button with its selected state. An empty `labels.label` is reported (`date picker`).
- **Right to left** (DTP-39): everything mirrors; the arrows' glyphs swap, and a later month comes
  in from the left.

### Time picker

```dart
final TanreiTimeOfDay? chosen = await showTanreiTimePicker(
  context: context,
  initialTime: alarm, // null: the picker starts from the device's time
  labels: const TanreiTimePickerLabels(label: 'Set alarm'),
);
if (chosen != null) setState(() => alarm = chosen);
```

`showTanreiTimePicker` (spec `time-picker`, `showTimePicker`'s idiom) is the spec's `open`: it pushes
a modal route and returns a `Future<TanreiTimeOfDay?>` — the committed time on OK, null otherwise.
It takes `initialTime` (the spec's `value`, a `TanreiTimeOfDay(hour:, minute:)`, 24-hour, the
package's own because `TimeOfDay` belongs to the Material library; `TanreiTimeOfDay.parse('19:30')`
reads "HH:MM" text, and anything else is null and reported), `hourCycle`
(`TanreiTimePickerHourCycle.locale` / `.h12` / `.h23`), `entryMode` (`dial` / `text`), `unit`
(`hour` / `minute`: the dial it opens on), `layout` (`auto` / `vertical` / `horizontal`), `locale`,
`labels` (a `TanreiTimePickerLabels` whose fields are the spec's eight words, `label` among them,
English by default), `onChanged` (the spec's `change`, called before the close only when the time
differs from `initialTime`) and `onClose` (its `close`, with a `TanreiTimePickerCloseReason`:
`escape`, `back`, `outside`, `cancel`, `confirm`). The picker closes itself. The enums have
`fromName` for text (an unknown name renders as the default and is reported, TMP-29).
`TanreiTimePicker` is the surface the route shows, drawn in place without a route, scrim or motion.

- **Clock and locale** (TMP-6, TMP-9, TMP-10, TMP-27): the period names, the digits, the separator
  and the preferred clock come from `TanreiDateLocalizations` (`anteMeridiemAbbreviation`,
  `postMeridiemAbbreviation`, `preferredHourMinutePattern`, `hourMinutePattern12`,
  `hourMinutePattern24`: CLDR's `jm`, `hm` and `Hm` patterns, which `package:intl` gives), read with
  `TanreiTimePattern`. English is built in (US 12-hour, a 24-hour clock for the English regions
  that prefer it); a product in another language adds a delegate, as for the date picker. With
  `hourCycle: locale`, `MediaQuery.alwaysUse24HourFormatOf` wins, then the locale's pattern (a `K`
  clock is shown 1 to 12, a `k` clock 00 to 23). The period goes where the 12-hour pattern writes
  `a`: after the minutes in English, before the hour in Japanese.
- **Modal** (TMP-1 … TMP-5, TMP-25): a `PopupRoute` like the date picker's; the scrim takes presses
  itself (`outside`), back is a `PopScope`, Escape is handled in the surface; Tab moves through the
  period (where it is written first), the selectors (or the fields), the period, the entry-mode
  toggle, Cancel and OK, wrapping. The time is pending until OK, which is disabled while a field
  holds no number of its unit. It fades in growing from `motion.enter-scale` and fades out; with
  animations disabled it fades without growing, and on Android appears and disappears at once.
- **Layout** (TMP-7, TMP-8): vertical — the label, the time and the dial stacked and centred, the
  actions below; horizontal — the label, the time and the actions beside the dial. `auto` measures
  the parts after their first frame and chooses horizontal only for a room lower than the vertical
  layout and wide enough for the horizontal one. When the room is short the label and the actions
  stay and the middle scrolls; when they alone leave no room (less than a selector's height between
  them) everything scrolls, one frame later; the horizontal layout scrolls as one. Text entry is
  always vertical.
- **Selectors and period** (TMP-9 … TMP-11, TMP-16 … TMP-22): `TanreiTimePickerSelector` and
  `TanreiTimePickerPeriod` (built by the picker) are drawn from `TanreiTimePickerCondition.selected`
  or `unselected` in the interaction state they are in, with the press held and answered as
  `behavior.pressedFeedback` says and the focus ring as `behavior.focusStyle` says, like a Button;
  a change of condition eases over `motion.state-duration` too. The hour, the separator and the
  minute are always written left to right. Each is drawn at least `measure.targetTouch`; beside the
  fields the separator and the period are centred on the fields' containers and the period is as
  tall as they are, however a field grows around its container (a label that wraps, enlarged text),
  and its target reaches equally above and below it without moving the layout (its semantics node
  has the target's height). A press on a selector
  shows its unit; it does not move focus (a mouse click must not draw the focused state).
- **Dial** (TMP-12 … TMP-15): painted (`CustomPaint`) under `ExcludeSemantics`; a `Listener` reads
  presses and drags and an eager recognizer keeps a scrolling ancestor from taking them. The handle
  follows a drag at once; a key, an action or a field moves it along the shorter arc over
  `motion.dial-*`, and a change of unit cross-fades the numbers; both are at once with animations
  disabled. Releasing on the hour dial shows the minute dial and moves focus from the hour selector
  to the minute selector.
- **Text entry** (TMP-23, TMP-24): two outlined large `TanreiTextField`s of the number type with
  `maxLength: 2`, `selector.container.width` wide; a whole number of the unit (ASCII or the locale's
  digits) becomes pending, a committed field that is not one is put in error with
  `labels.invalidText` until its next edit; the action key moves to the minute field, then activates
  OK.
- **Semantics** (TMP-26): the surface is a `SemanticsRole.dialog` node named by `labels.label`
  (scoping and naming the route); each selector is named by its label with its value as drawn (the
  hour with its period, "7 AM"), `increasedValue`, `decreasedValue`, `onIncrease` and `onDecrease`;
  the period a `radioGroup` of two checked-state nodes in a mutually exclusive group. An empty
  `labels.label` is reported (`time picker`).
- **Right to left** (TMP-28): the layout mirrors — the period's place, the columns, the actions — but
  the time is written left to right and the dial runs clockwise.

## Theming

Without any setup, widgets follow the platform: `MediaQuery.platformBrightnessOf` picks light or
dark and `MediaQuery.highContrastOf` picks the high-contrast scheme. To choose explicitly, wrap a
subtree in `TanreiTheme`:

```dart
TanreiTheme(
  data: const TanreiThemeData(brightness: Brightness.dark, contrast: TanreiContrast.medium),
  child: app,
)
```

`TanreiThemeData` carries a design system (`system`, default: the generated `tanreiSystem`) and
selects one of its six `TanreiColors` schemes (light / dark x standard / medium / high). Read it
with `TanreiTheme.of(context)`.

### Every token comes from the system instance

```dart
final TanreiThemeData theme = TanreiTheme.of(context);
final TanreiSystem system = theme.system;

system.space.space200;                       // sys.space
system.shape.small;                          // sys.shape.corner
system.shape.cornerSmoothing;                // sys.shape.corner-smoothing: 0–1 (see Corners)
system.typescale.body.toTextStyle();         // sys.typescale -> TextStyle (see Text styles)
theme.textStyle(system.typescale.heading2, emphasized: true); // + the family's weight step
system.motion.duration.short3;               // milliseconds; tanreiDuration(...) -> Duration
system.motion.easing.standard.toCurve();     // -> Cubic
system.measure.focusOuterWidth;              // borders, focus indicator, targets, icon sizes
system.motion.duration.pressHold;            // how long a press stays visible at least
system.icon.resolve(size: 24, selected: true); // sys.icon: family, fill, weight, opsz (see Icons)
system.behavior.pressedFeedback;             // sys.behavior: choices of kind (enums, see below)
system.typefaces.mono.resolve();             // ref.typeface as (fontFamily, fontFamilyFallback)
system.elevation.level2;                     // TanreiResolvedElevation.resolve(level, theme.colors)
system.button.sizes.medium.containerHeight;  // comp.button.container.height.medium
system.button.sizes[size].labelTypescale;    // total lookup by key: what the widget does
system.button.variants.filled.hovered.containerColor; // comp.button.filled.hovered.container.color
system.button.variants[variant].of(state);   // total lookup by key, then the state's tokens
theme.color(TanreiColorRole.primary);        // a role in the current scheme
theme.paint(system.button.variants.filled.hovered.containerColor); // a component color in the current scheme
```

One shape everywhere: **named fields for the core vocabulary, an `extra` map for what a
design system added, and a lookup by key.** `TanreiColors[role]`, `button.sizes[size]` and
`button.variants[variant]` are total (unknown key: the fallback, reported in debug builds);
the series `space`, `shape`, `typescale`, `state`, `measure`, `motion.duration`, `motion.easing`,
the spring schemes and `elevation` answer `series['token-key']` with null for a step the system does not have.
`extra` defaults to empty, `keys` / `has(key)` tell what a system has, and `copyWith(extra: ...)`
adds to the existing entries.

There are no static token classes: `TanreiSpace`, `TanreiShape`, `TanreiButtonTokens`, ... are the
*types* of the parts of a `TanreiSystem`, and values are read from an instance. Animate between
themes with `TanreiThemeData.lerp` (colors interpolate; everything else — the choices of kind,
typefaces and icon families included — steps at the midpoint with the system).

### Colors are paints

Component color tokens are scheme-independent `TanreiPaint`s, evaluated against the current scheme
at runtime with `theme.paint(paint)` (or `paint.resolve(colors)`):

| Paint | Meaning |
|---|---|
| `TanreiPaint.role(role)` | a color role of the current scheme |
| `TanreiPaint.mix(base, other, amount)` | premultiplied interpolation, identical to CSS `color-mix(in srgb, ...)` |
| `TanreiPaint.alpha(of, amount)` | `of` with its alpha multiplied |
| `TanreiPaint.none()` | nothing is drawn |
| `TanreiPaint.literal(color)` | a fixed color, the same in every scheme |

`TanreiColorRole` is an open key (`const TanreiColorRole('tertiary')`): the constants on it are
the roles of the default system, and a system that declares more palettes stores them in
`TanreiColors.extra`. The lookup is total, like every lookup of an open key: `colors[role]` for a
role the active system does not have answers with the `primary` slot of the same kind (`on-x` →
`on-primary`, `x-container` → `primary-container`) and debug builds report it through
`debugTanreiReportUnknownValue`. It never throws and never asserts. A `TanreiColors` knows which of
the six schemes it is (`colors.scheme`); a per-scheme paint (`TanreiPaint.scheme`, what a `tone` or
`contrast-pick` rule gives when the schemes disagree) and the typed accessor of an added role read
it.

### States are values, not mechanisms

A widget only decides *which* interaction state it is in (disabled, or pressed > keyboard-focused
> hovered; `tanreiInteractionStateOf`). How that state looks is read from that state's tokens:
`system.button.variants.<variant>.<state>.{containerColor, labelColor, outlineColor, containerElevation}`
and `system.button.<state>.{opacity, containerShape}`. In the Tanrei system hover is a 8 % mix of
the label color into the container; another system may use explicit colors, a dim, or nothing.

### Supplying your own design system

A product (or a preset) generates its own system with the token pipeline:
`emitDartSystem(ir, { vocabularyRoles, vocabularyImport: 'package:tanrei/tanrei.dart' })` in
`packages/tokens-build/src/emit/dart.js` produces one file with
`const TanreiSystem <id>System = TanreiSystem(...)`. Pass it to the theme:

```dart
TanreiTheme(
  data: const TanreiThemeData(system: acmeSystem, brightness: Brightness.dark),
  child: app,
)
```

Every constructor parameter of `TanreiSystem` and its parts is `required`, so a system generated
against an older vocabulary stops compiling instead of silently missing a token. For small
adjustments at runtime, every part has `copyWith`:

```dart
final TanreiButtonTokens button = tanreiSystem.button;
final TanreiSystem compact = tanreiSystem.copyWith(
  button: button.copyWith(
    sizes: button.sizes.copyWith(medium: button.sizes.medium.copyWith(containerHeight: 32)),
  ),
);
```

### Text styles: by level, with emphasis as a weight step

`system.typescale` has sixteen roles, each a complete `TanreiTextStyle` (font stack,
size, weight, tracking, line height) and each knowing its `family`:

| Role | HTML | Family | For |
|---|---|---|---|
| `display` | — | display | the one hero size |
| `heading1` … `heading6` | `h1` … `h6` | heading | `heading5` a card's or dialog's title, `heading6` a table's |
| `bodyLarge`, `body`, `bodySmall` | lead, `p`, `small` | body | running text |
| `label`, `labelSmall`, `caption` | — | label | text inside and next to controls (buttons, inputs, helper text) |
| `code`, `codeSmall` | `code` | label | monospace |
| `eyebrow` | — | label | a section's kicker, small and tracked (uppercase it yourself) |

In the default system a heading that shares a size with a body role weighs 500 and the body role 400
(a preset sets its own weights: `m3-like`'s `heading1` is Material's 400). There are
no `emphasized` roles: **emphasis is a weight step per family**, `system.typescale.emphasis`
(`TanreiTypeEmphasis { display, heading, body, label }`, integers; 100 everywhere by default,
`m3-like` adds 200 to labels). Ask for it, and only the weight changes:

```dart
theme.textStyle(system.typescale.heading1, emphasized: true, color: theme.colors.onSurface);
system.typescale.label.emphasized(system.typescale.emphasis).toTextStyle();   // the same by hand
```

`TanreiTextStyle.family` is the role's first name segment (`heading3` → heading); `caption`, the
code roles and `eyebrow` take the `label` step, and so does any role a preset adds under a name
that is not a family (`cupertino`'s `captionSmall`; its `bodyCallout` is body). `TanreiTypescale[key]`
looks a role up by token key (`'heading-1'`); `emphasis` is not a role and is not found there.

### Corners: smoothing is an amount

`system.shape.cornerSmoothing` is a number 0–1 with Figma's meaning: 0 is a quarter
circle, 0.6 is what Figma calls the iOS corner, 1 the most eased curve. The radius does not change
with it, only how the curve eases into the straight edge. The default system is 0; `cupertino` is
0.6. Every container of this package is a `TanreiContainerDecoration` inside a
`TanreiCornerShape(smoothing:, radius:)`, so the container, its outline, its elevation ring and
shadows, the ripple clip and the focus indicator all ease alike. At 0 a shape is a plain `RRect`,
drawn with the very calls `BoxDecoration` makes; above 0 it is a path.

The path is **Figma's corner-smoothing construction** (`tanreiSmoothedRectPath`; the formulas are
those of `figma-squircle`, MIT, and are written out in `corner_shape.dart`), which the Compose
package draws too, so one amount rasterizes the same on both (the web draws the nearest superellipse):
per corner
an eased cubic leg on each side, the corner circle between them as one cubic. A corner takes the
amount its room allows — half the shorter side, minus the radius the circle needs — on both of its
sides: Figma's own per-corner budget, so a pill has no room left and is exactly the circular capsule
Figma draws for it.

Measured against Apple's own corner (`UIBezierPath(roundedRect:cornerRadius:)`, what SwiftUI's
`RoundedRectangle(style: .continuous)` builds; CoreGraphics reference in
`tool/continuous_corner_reference.swift`): at 0.6 this path differs from it by 5.1 px² on a
180 × 80 box at radius 20 (symmetric difference; a circle is 18.2 away, the rasterizers alone
differ by 1.8, no amount gets closer than 5.1 — Figma's 60 % is a little less eased than iOS). A
180 × 40 pill, being a circle, is 11.2 px² from Apple's pill (which SwiftUI eases along its long
side). Flutter's `RSuperellipse` is 14.0 from Apple's and falls back to a
plain `RRect` on Flutter web and in `Canvas.drawRSuperellipse` on Skia; `ContinuousRectangleBorder`
is a different curve (280.8). Figma's construction is what the amount means, and
Apple's corner is a different curve, 5.1 px² apart here (0.035 % of the area, not visible, but not
rasterizer noise); the test pins the construction, not Apple.

### Choices of kind: how a press and keyboard focus behave

Two things a design system decides are not amounts but choices between a few named ways.
They are typed enumerations on the system instance, `system.behavior`, required like
every token; a widget reads them and never looks at the id of a system:

| Field | Values | Shipped |
|---|---|---|
| `pressedFeedback` (`TanreiPressedFeedback`) | `overlay`, `ripple`, `dim`, `none` | default `overlay`, `m3-like` `ripple`, `cupertino` `dim` |
| `focusStyle` (`TanreiFocusStyle`) | `ring`, `glow` | all `ring` |

What `TanreiButton` draws for each (spec BTN-9, BTN-10):

- **overlay** — every pressed token applies to the whole container at once.
- **ripple** — the pressed *container color* of the tokens grows as a circle from the point of
  contact (from the center for Enter / Space), clipped to the container shape. It replaces the fill
  inside the circle rather than being composited over it, so the fully grown ripple is exactly the
  pressed container the tokens describe. Label, outline, elevation, opacity and shape take their
  pressed values at once. The ripple grows over `button.motionFeedbackDuration`
  (`comp.button.motion.feedback-duration`) with the Button's `motionStateEasing` and fades over
  `motionStateDuration` once the press has ended and the press-hold has passed; with animations
  disabled it covers the container at once. It is drawn by `TanreiContainerDecoration`
  (`TanreiRipple`), not by Material's `InkWell`: no `Material` ancestor is needed.
- **dim** — the container keeps the color of the state underneath (no state layer is drawn, even
  if the pressed tokens carry one) and the pressed `opacity` dims the whole control. As under
  ripple, label, outline, elevation and shape are the pressed tokens'.
- **none** — a press changes nothing: every part stays with the state underneath; hover and
  keyboard focus still apply.
- **glow** — the same two focus strokes in the same two colors, blurred by the outer ring width
  (read as a CSS blur radius, σ = width / 2).

Nothing falls back on Flutter: both choices and every amount of corner smoothing are drawn on every
target.

A press is visible **without delay and for at least `system.motion.duration.pressHold`** (100 ms by
default; BTN-8) — a tap or a key press is over within a frame. The hold is a `Timer`, so in a widget
test advance the clock (`await tester.pump(const Duration(milliseconds: 100))`) before expecting the
button to have left the pressed state; `pumpAndSettle()` alone does not wait for it. Inside a
scrollable, Flutter's gesture arena delays `onTapDown` until it knows the touch is not a scroll —
that is the platform's idiom and applies to every tappable widget.

### Values a design system adds

A layer may extend the vocabulary: a step in a series, a color role, a Button size or
variant, and tokens in its own namespace. `tanrei build` writes them into the same generated file
as the system. The values go into `extra`; one marked section gives product code full typing:

```dart
import 'package:acme_design/acme_system.g.dart'; // generated into the product's package

TanreiButton(
  onPressed: delete,
  size: AcmeButtonSize.size3x,        // `3x` is not an identifier: the axis name goes in front
  variant: AcmeButtonVariant.danger,
  child: const Text('Delete'),
);

final TanreiThemeData theme = TanreiTheme.of(context);
theme.system.space.space1200;                // typed accessor (a Dart extension on TanreiSpace); never throws
theme.system.space['space1200'];             // keyed lookup, null in a system without it
theme.system.button.sizes.size3x;            // = sizes[AcmeButtonSize.size3x]
theme.colors.brandGlow;                      // = colors[AcmeColorRoles.brandGlow]
theme.paint(acmeTokens.rating.star.color);   // the layer's own tokens: `acme.comp.rating.star.color`
acmeTokens.rating.star.size;
```

The layer's own tokens (`AcmeTokens`, `const acmeTokens`) are a typed object in the product's
package, not part of `TanreiSystem`; their colors are `TanreiPaint`s, so they follow the scheme.
A system that adds nothing is generated without any of this.

A typed accessor never throws and never asserts — of an added step, spring or color role alike.
Read under a design system that lacks the value (a preset in one subtree of the app),
`space.space1200` answers with the value the system that DECLARED the step gives it, and debug
builds report the lookup through `debugTanreiReportUnknownValue` — the same spirit as an unknown
Button size (BTN-7). The keyed lookup (`space['space1200']`) answers `null` there. A color role
(`colors.brandGlow`, `colors.surfaceTint` of `m3-like`) answers with the declaring system's color
**of the same scheme** — the generated file holds all six. A spring (`springStandard.bouncy`)
answers with the value of the FIRST spring scheme of the declaring system that has it, whichever
scheme it is read from: a `TanreiSpring` does not know which scheme it is (the accessor's doc
comment names the scheme). Springs are a series like the others:
`motion.springStandard['default-spatial']`, added springs in `TanreiSpring.extra`, added spring
schemes in `TanreiMotion.extra` (`motion.spring('playful')`).

In debug builds an unknown size or
variant is reported once through `debugTanreiReportUnknownValue` (default:
`FlutterError.reportError`); assign your own function to collect or silence the reports.

### Shipped presets

Besides the default system (`tanreiSystem`, exported by `package:tanrei/tanrei.dart`) the package
ships three presets, each behind its own import so an app only compiles what it uses:

| Import | Constant | Notes |
|---|---|---|
| `package:tanrei/systems/m3_like.dart` | `m3LikeSystem` | declares the `tertiary` palette and more roles (`M3LikeColorRoles`) |
| `package:tanrei/systems/m3_expressive_like.dart` | `m3ExpressiveLikeSystem` | extends `m3-like`; adds the Button sizes `M3ExpressiveLikeButtonSize.xsmall` / `.xlarge` and revalues all five (heights 32 / 40 / 56 / 96 / 136, gap up to 16, outline width up to 3) |
| `package:tanrei/systems/cupertino.dart` | `cupertinoSystem` | |

### Fonts

Fonts are referenced by name and are **never bundled**. A font stack reaches Flutter the way the
token pipeline read it once for every platform — `TanreiFontStack { families, generic,
system }` on every text style (`TanreiTextStyle.font`) and on `system.typefaces.{brand, plain,
mono, icon}` — and no CSS keyword (`system-ui`, `ui-monospace`, `sans-serif`) is ever passed to
Flutter as a family. `toTextStyle()` / `TanreiFontStack.resolve()` deliver it:

| Stack | `fontFamily` | `fontFamilyFallback` |
|---|---|---|
| default text: Inter, Noto Sans JP, Noto Sans, *sans-serif* | `Inter` | `Noto Sans JP`, `Noto Sans` |
| `m3-like` text: Roboto | `Roboto` | — |
| `cupertino` text: *the system font*, Inter | — (none) | `Inter` |
| default mono: Roboto Mono, Noto Sans JP, *monospace* | `Roboto Mono` | `Noto Sans JP`, then the platform's monospace (`Menlo`, `Courier` on Apple; `monospace` on Android; `Consolas`, `Courier New` on Windows; `DejaVu Sans Mono`, `Liberation Mono`, `monospace` on Linux) |

Flutter tries `fontFamily`, then each fallback, then the platform's own UI font; a family that is
neither registered by the app nor installed on the device is skipped. So *sans-serif* needs no
entry at all, and a `system` stack like `cupertino`'s has **no family**: Flutter then draws with
the font of the OS — San Francisco on iOS and macOS, Roboto on Android, Segoe UI on Windows — on
and off Apple platforms.

**Flutter web is the exception.** The web engine (CanvasKit and skwasm) cannot read the fonts
installed on the device at all: it draws with the fonts the app registers (`pubspec.yaml` →
`FontManifest.json`, or `FontLoader`) and, for everything else, with a Roboto it downloads as its
default (engine `lib/web_ui/lib/src/engine/canvaskit/fonts.dart`). So on the web a `system` stack
like `cupertino`'s is drawn in **Roboto**, not in the visitor's OS font, and the platform
monospace / serif families below resolve to nothing. This is engine behaviour, not something the
mapping can change: a product that targets Flutter web registers the families it wants to see
(Inter for `cupertino`, which its stack names as the fallback). The example gallery says so under
every system whose text is set in the platform font.

Where the platform family names of the *monospace* and *serif* classes come from
(`tanreiPlatformFontFamilies`; the mapping is unit-tested for every `TargetPlatform`, the sources
are repeated next to the code):

| Platform | monospace | serif | Source |
|---|---|---|---|
| iOS, macOS | `Menlo`, `Courier` | `Times New Roman`, `Times` | the OS font directories (macOS 26 `/System/Library/Fonts`, iOS 26 simulator runtime); seen drawn on macOS |
| Android | `monospace` | `serif` | `<family name>` entries of the platform's `fonts.xml` (AOSP `frameworks/base/data/fonts`, in the SDK under `platforms/android-*/data/fonts/`), which Skia's Android font manager matches names against |
| Fuchsia | `monospace` | `serif` | generic names in Skia's `SkFontMgr_fuchsia.cpp` (`kGenericFontFamiliesByName`) |
| Windows | `Consolas`, `Courier New` | `Times New Roman`, `Georgia` | Microsoft's Windows 11 font list (base fonts, not an optional feature) |
| Linux | `DejaVu Sans Mono`, `Liberation Mono`, `monospace` | `DejaVu Serif`, `Liberation Serif`, `serif` | distribution defaults, then the fontconfig alias (`60-latin.conf`), which Skia's fontconfig font manager resolves |

Only the Apple row has been seen on a device; the others are as documented. A token stack that ends in `cursive`, `fantasy`, `math`
or `emoji` has no platform font to name and is delivered like *sans-serif*.

What a product installs, and how — in its own `pubspec.yaml`, under exactly these family names:

| System | Families to register |
|---|---|
| default (`tanreiSystem`) | `Inter` (the variable font, for the in-between weights 450 / 550), `Noto Sans JP`, optionally `Noto Sans`; `Roboto Mono` for code; `Material Symbols Rounded` (variable) for icons |
| `m3-like`, `m3-expressive-like` | `Roboto` (already the OS font on Android), `Roboto Mono`, `Material Symbols Outlined` (variable) |
| `cupertino` | nothing for text (the OS font); `Material Symbols Rounded` for icons |

```yaml
flutter:
  fonts:
    - family: Inter
      fonts:
        - asset: fonts/Inter-Variable.ttf
```

`tanrei build` lists the families a product system names. `toTextStyle()` passes the exact token
weight on the `wght` axis, so the in-between weights of the type scale (450, 550) are exact with
the variable Inter and round to the nearest `FontWeight` (w500, w600) with static instances.

### Icons

`system.icon` (`TanreiIconStyle`) says how icons are drawn; the icon *sizes* stay measures
(`system.measure.iconSmall` / `iconMedium` / `iconLarge`) and component tokens (`iconSize`).

| Field | Token | Default | `m3-like` |
|---|---|---|---|
| `familyUnselected` | `sys.icon.family.unselected` | Material Symbols Rounded | Material Symbols Outlined |
| `familySelected` | `sys.icon.family.selected` | Material Symbols Rounded | Material Symbols Outlined |
| `weight` | `sys.icon.weight` | 300 | 400 |
| `fillUnselected` | `sys.icon.fill.unselected` | 0 | 0 |
| `fillSelected` | `sys.icon.fill.selected` | 1 | 1 |
| `opticalSizeMin` / `opticalSizeMax` | `sys.icon.optical-size.min` / `.max` | 20 / 48 | 20 / 48 |

The rule: an icon for something **unselected** is drawn in `familyUnselected` with
`fillUnselected`, the same icon in its **selected** state in `familySelected` with `fillSelected` —
consistently, everywhere. An icon set is a family per selection state: a *variable* font
(Material Symbols) is one family and two fills; a *static* set (Material Icons Outlined / Material
Icons) is two families, and the axes do nothing. One helper (an extension on `TanreiIconStyle`,
`src/theme/icon_style.dart`) returns, for a selection state and a size, the family, `FILL`, `wght`,
`opsz` (the icon box size, clamped to the icon font's range, `sys.icon.optical-size.min` / `.max`:
`opticalSizeMin` / `opticalSizeMax`, 20–48 for Material Symbols) and `GRAD` (0):

```dart
final TanreiSystem system = TanreiTheme.of(context).system;

final TanreiResolvedIconStyle style = system.icon.resolve(size: 24, selected: isSelected);
style.fontFamily;        // 'Material Symbols Rounded' — or 'Material Icons' / 'Material Icons Outlined'
style.fill;              // 1 or 0 (the tokens of the system)
style.weight;            // 300
style.opticalSize;       // 24
style.grade;             // 0

// For `Icon`: an IconThemeData with size, fill, weight, grade and opticalSize.
IconTheme.merge(
  data: system.icon.toIconThemeData(size: system.measure.iconMedium, selected: isSelected),
  child: Icon(isSelected ? AppSymbols.homeSelected : AppSymbols.home),
);

// For a glyph drawn as text.
Text(String.fromCharCode(0xe88a), style: style.toTextStyle(color: color));
```

A control draws its icon slot with `TanreiControlIcon(icon:, size:, selected:, color:)`, which
applies all of this to the slot (see [Icon button](#icon-button)).

The icon fonts are **not bundled** and there is no icon widget yet. A product adds the icon font(s)
to its `pubspec.yaml` under the family names the system gives and declares its glyphs as
constants. Flutter's `IconData` carries its font family itself and must be a constant for icon tree
shaking, so the family cannot come from the theme at runtime: declare one constant per family the
product's system uses (`static const IconData home = IconData(0xe88a, fontFamily: 'Material Symbols
Rounded')`) and pick by selection state; `system.icon.family(selected:)` is the name to check them
against. Icon *names* belong to the product. With a static font, or a font without these axes,
Flutter ignores the variations and draws the glyph as the file has it. `TanreiButton`'s `icon` is a
plain slot: the button sets the icon size and color of the subtree and nothing else.

### Elevation

`system.elevation.*` and a component's elevation tokens have **CSS `box-shadow` semantics**: `blur`
is the CSS blur radius (σ = blur / 2), and `level0` is an empty list — nothing is drawn. Flutter's
`BoxShadow.blurRadius` is another quantity (`σ = blurRadius × 0.57735 + 0.5`,
`Shadow.convertRadiusToSigma`), so the token is converted in exactly one place,
`tanreiBlurRadiusFromCss` (`src/primitives/elevation.dart`): `blur: 3` becomes `blurRadius: 1.73`.
A blur of 1 px or less (σ < 0.5) cannot be drawn by Flutter and is sharp. A shadow's spread grows
the corner radius with it, as in CSS. Elevation is interpolated between states like every other
visual: a shadow never jumps.

## Example

`example/` is a gallery: every fixture of every component spec (`specs/*.spec.json`) under every
shipped system, with theme and contrast switches (it is also what pub.dev shows). The fixtures come
from the specs themselves, never from a hand-kept list; `galleryComponents` in `example/lib/main.dart`
maps a spec name to the widget for a fixture's props — one entry per component. It is a `WidgetsApp`
— nothing from Material — and has the platform folder of one target only, `web/` (a single
`index.html`):

```sh
cd example
dart run tool/copy_specs.dart   # copies specs/*.spec.json into assets/specs/ (gitignored)
flutter run -d chrome           # or: flutter build web
flutter test                    # reads the specs in place, pumps the gallery, rejects a stale copy
```

For another target run `flutter create --platforms=macos .` inside `example/`; those folders are
not committed.

### Primitives for components

A component is built from the shared primitives, not from scratch (`button.dart` is the
reference): `TanreiPressableStateMixin` (interaction state, activation, press-hold, the answer to a
press, state transitions), `TanreiControlVisuals` / `TanreiControlContainer` (one state's tokens and
the container that draws them), `TanreiControlContent` (icon + label), `TanreiControlIcon` (an
icon slot drawn with the system's icon style for a selection), `TanreiFocusRing`,
`TanreiTapTarget`, `TanreiCornerShape`, the selection-control pieces in `selection_control.dart`
(`TanreiSelectionControlLayout`, `TanreiStateLayer`, `TanreiSelectionTransitionMixin`,
`tanreiPaintOutlinedShape`), and `debugTanreiReportMissingName` (a control that needs an
accessible name and has none; `icon_button.dart` shows how a component calls it), and
`debugTanreiReportIgnoredValue` (a prop the spec says a component ignores and reports: an extended
FAB asked to collapse without an icon, an avatar on a chip that is not an input chip). Composites of
items (the list, the menu) add `TanreiItemRow` (one row: leading, text column, trailing; minimum
heights by lines of text; centered, or aligned with the first line), `TanreiItemGroupMixin` (roving
focus, Down / Up / Home / End — Right / Left for a horizontal `itemAxis`, mirrored in right-to-left —,
typeahead unless `typeaheadEnabled` is false, one Tab stop), `TanreiCheckMarkPainter` /
`tanreiPaintCheck` (the checkbox's check geometry), `TanreiFocusRing(inside: true)` (the ring inside
a row, where a scrolling ancestor or a menu surface cannot clip it) and
`TanreiPressableStateMixin.focusableWhileDisabled` (a disabled item the arrow keys still reach) and
`suppressFocusHighlight` (focus a pointer moved onto an item: drawn hovered, no ring). Joined
items (the segmented button, a connected button group, the split button) draw corners of their own
with `TanreiCornerShape.only` and `TanreiCornerRadii` (`.directional` for start and end), which a
`TanreiFocusRing` follows from a per-corner `BorderRadius`; a row that also moves with Down and Up
Arrow sets `TanreiItemGroupMixin.verticalArrowsInRow`; the glyphs a component draws itself are
`tanreiCheckGlyph`, `tanreiCloseGlyph` and `tanreiArrowDownGlyph` (`glyphs.dart`). Layout
regions (the app bar, the navigation bar, rail and drawer) draw their edge line with
`TanreiEdgePainter` (top, bottom, start or end, over the content), and the bar's and rail's
destinations are one `TanreiNavigationItem` (item container, icon with a `TanreiNavigationBadge`,
label; pressed as a button, the selection eased), styled by the component's own tokens through a
`TanreiNavigationItemStyle`. A group whose items are other components (the toolbar's icon buttons
and buttons) overrides `TanreiItemGroupMixin.applyTabStop`, and a layout that places controls by
what they draw rather than by their grown targets reads `tanreiVisibleRectOf` (`tap_target.dart`).
A control whose presses its owner recognizes (a slider's handle, moved by a drag along the whole
slider) turns off `pressedByTaps` and `hoveredByPointer` and drives the mixin with `beginPress`,
`endPress` and `setHovered`; an element whose keyboard focus is elsewhere (a search suggestion that is
active while focus stays in the input, a bar focused through its input) shows it with `setFocused`.
`TanreiVisibleSize` lays a control out at its visible size, its target reaching past it.
`cancelPress` ends a press at once (a drag that started on a bottom sheet's drag handle). Sheets
share `TanreiSheetCloseReason` and `tanreiReturnFocus` (`sheet.dart`: focus back to where it was,
or to the scope around a region whose opener is gone), and draw their square edge by drawing the
container past it and clipping with `TanreiEdgeClipper` (`edge.dart`). Components that draw dates
(the date picker) read their words and forms from `TanreiDateLocalizations`
(`date_localizations.dart`), with the week's first day from `tanreiFirstDayOfWeek`.

## Development

```sh
flutter pub get
flutter analyze
flutter test
dart format --output=none --set-exit-if-changed lib/tanrei.dart lib/src/theme lib/src/primitives lib/src/components test example/lib example/test example/tool
```

Do not run `dart format` on all of `lib/`: `lib/src/generated/` is produced by
`pnpm generate` from `tokens/` and must stay byte-identical to the generator output. It holds two
files per kind: `tokens.g.dart` (the vocabulary types, system-independent) and one
`<id>_system.g.dart` per system (`tanrei_system.g.dart` = the default, `const TanreiSystem
tanreiSystem`; the presets' are re-exported by the generated `lib/systems/<id>.dart`).

### Golden baselines

`test/components/goldens/<component>/<fixture-id>.png` holds one baseline per fixture in the
component's spec, rendered on `surface`, light scheme, 160 x 80 logical pixels at 2x. Text is
drawn with the Flutter test font (solid boxes), so baselines are stable across machines and do not
depend on installed fonts. `flutter test` also sets `debugDisableShadows`, so a shadow is drawn as
a solid shape: baselines verify a shadow's offset, spread and color, not its blur. The blur is
verified without a baseline: `test/primitives/shadow_blur_test.dart` turns the flag off for one
capture (and restores it), and samples the alpha under the elevated fixture of `m3-like` and along
a straight edge — half the shadow's alpha at the edge, 15.9 % one σ outside, 84.1 % one σ inside,
σ = the token's CSS blur / 2 — so it does not depend on how one engine rasterizes a blur.

Icon glyphs (the icon button's `favorite`, U+E87D of Material Symbols, drawn as text) have no
glyph in the test font and are drawn as its hollow fallback box, scaled with the icon size: the
baselines show the icon's box, position and color, not its shape or fill.

Presets record one representative fixture per component
(`goldens/<component>/<preset id>/<fixture>.png`; Button records five, the icon button
`filled-medium`, the divider `horizontal-inset-start`, the badge `count-double`, the progress
indicator `linear-determinate`, the loading indicator `contained-medium`, the checkbox and the radio
button `selected`, the switch `selected-icon`, the card `elevated`, the text field `outlined-filled`, the FAB and the extended FAB `filled-medium`, the chip `filter-selected`, the list `multiple-selected`, the menu `group-titles`, the tabs `primary-icons`, the segmented button `icons`, the button group `connected-icon-buttons`, the split button `filled-open`, the FAB menu `filled-open`, the tooltip `rich`, the snackbar `action-closable`, the dialog `icon`, the toolbar `floating`, the slider `discrete-stops`, the search `docked`, the bottom sheet and the side sheet `modal`, the carousel `multi-browse`). The divider, badge,
indicator and selection-control baselines share one capture, `test/components/fixture_golden.dart`
(the checkbox, radio button and switch on a wider 320 x 80 surface, so that the longest fixture
label stays on one line beside the control; the card on 320 x 160, four `space900` wide, so the
fixture's sentence wraps inside it; the text field on 320 x 160, so that a three-line field and a
supporting row fit; the FAB on 160 x 112 and the extended FAB on 240 x 112, so that the large
size, its label in the test font and the solid shadow below it fit; the chip on 320 x 80, like the
selection controls, with a solid square of `secondary` standing in for the avatar image; the list on 392 x 304, a list 360 wide as LST-16 asks, tall enough for
three three-line rows of m3-like — the test font's square glyphs wrap a sentence of supporting
text that a real font keeps on one line, so those rows are three-line; the menu, drawn in place
(`TanreiMenuAnchor.inPlace`), on 360 x 400, the widest surface with the tallest fixture; the tabs
on 392 x 120, a row 360 wide as TAB-14 asks, tall enough for a primary tab with an icon whose label
the test font wraps onto two lines; the segmented button and the button group on 432 x 128, the 400 x 96 stage of SEG-14 and BGR-1
with the row start-aligned in it (the button group's 480 wide); the split button on 352 x 128, SPB-12's 320 x 96 stage; the FAB menu on 352 x 352, FBM-13's
320 x 320 stage, drawn in place; the tooltip on 352 x 472, a stage of 320 x 440 with the anchor at
its centre — the spec's stage is 320 x 200, but the test font's square glyphs make the wrapped
and rich texts too tall for it; the snackbar in place on
432 x 232, a 400-wide stage as the spec asks, tall enough for `action-own-row`; the dialog on
512 x 672, the 480 x 640 stage of the spec with a navigator of its own, captured after
`showTanreiDialog` settled, scrim included; the toolbar on the stages of TBR-1, TBR-4 and TBR-6 —
392 x 88 with a docked toolbar at the bottom of 360 x 56, 392 x 128 with a floating one centered in
360 x 96, 128 x 272 with a vertical one centered in 96 x 240; the slider on SLD-7's stages, 352 x 128
with a slider 320 long centered in 320 x 96, 128 x 272 with a vertical one 240 tall; the search on
SRC-1's, SRC-7's and SRC-9's stages, 392 x 104 with a bar 328 wide centered in 360 x 72, 392 x 352
with the bar 16 from the top of 360 x 320 and its docked view in place under it, 392 x 512 with the
full-screen view in place in a 360 x 480 window; the bottom sheet on 432 x 752, the 400 x 720
stage of the spec with the sheet in a `Stack` over a bare page, scrim included; the side sheet
on 752 x 512, the 720 x 480 stage of the spec, a standard sheet at the end of a row beside a
bare page and a modal one over it with its scrim; the carousel on 432 x 232, the 400 x 200 stage of
the spec filled by the carousel, each item's glyph at `sys.icon.large` in the middle of its
content box); the indicators'
fixtures are recorded with reduced motion at the start of a cycle (PRG-7, LDG-4), so a looping
animation has a deterministic baseline.

A golden diff is a finding, not a nuisance. Re-record only when the visual change is the intended
result of a spec or token change:

```sh
TANREI_SNAPSHOT_REASON="<what changed and why>" flutter test --update-goldens test/components/button_test.dart
```

Goldens are compared pixel for pixel, and the engine rasterizes a little differently on each OS, so they are
recorded and verified on one: Linux (`ubuntu-24.04`, Flutter 3.32.8 — CI's `flutter` job). A golden recorded on a
Mac does not match; record with the **Record baselines** workflow (`../../CONTRIBUTING.md#recording-baselines`).

## License

Apache-2.0. See [LICENSE](LICENSE).

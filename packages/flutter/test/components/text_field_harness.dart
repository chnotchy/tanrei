import 'package:flutter/widgets.dart';
import 'package:tanrei/tanrei.dart';

// What the text-field suites share: the fixture's field, and finders into it.

/// The frame of the text-field baselines: as wide as the selection controls', and tall enough for
/// a three-line field with its floated label, or a field with a supporting row.
const Size textFieldGoldenSurface = Size(320, 160);

/// The code points of the icon names the text-field fixtures use (Material Symbols).
const Map<String, int> fieldIconCodePoints = <String, int>{'search': 0xe8b6, 'close': 0xe5cd};

/// A decorative glyph of the icon font, drawn as text (it takes the icon family of the slot).
Widget fieldGlyph(String name) =>
    ExcludeSemantics(child: Text(String.fromCharCode(fieldIconCodePoints[name] ?? 0xe5cd)));

/// The slots a fixture's `content` names: `leading-icon=<glyph> trailing-icon=<glyph>`.
Map<String, String> fixtureSlots(String? content) => <String, String>{
  for (final String part in (content ?? '').split(' '))
    if (part.contains('=')) part.split('=').first: part.split('=').last,
};

/// The text field of a spec fixture's [props] (the spec's defaults where a prop is absent).
Widget fixtureField(Map<String, dynamic> props, {String? content, Key? key}) {
  final Map<String, String> slots = fixtureSlots(content);
  final int maxRows = (props['maxRows'] as num?)?.toInt() ?? 0;
  return TanreiTextField(
    key: key,
    initialValue: props['value'] as String? ?? '',
    labelText: props['label'] as String? ?? '',
    labelHidden: props['labelHidden'] as bool? ?? false,
    variant: TanreiTextFieldVariant(props['variant'] as String? ?? 'outlined'),
    size: TanreiTextFieldSize(props['size'] as String? ?? 'medium'),
    type: TanreiTextFieldType.fromName(props['type'] as String? ?? 'text'),
    hintText: props['placeholder'] as String? ?? '',
    helperText: props['supportingText'] as String? ?? '',
    errorText: props['errorText'] as String? ?? '',
    isError: props['error'] as bool? ?? false,
    enabled: !(props['disabled'] as bool? ?? false),
    readOnly: props['readOnly'] as bool? ?? false,
    isRequired: props['required'] as bool? ?? false,
    multiline: props['multiline'] as bool? ?? false,
    minLines: (props['minRows'] as num?)?.toInt() ?? 2,
    maxLines: maxRows == 0 ? null : maxRows,
    maxLength: (props['maxLength'] as num?)?.toInt() ?? 0,
    showCounter: props['counter'] as bool? ?? false,
    prefixText: props['prefixText'] as String? ?? '',
    suffixText: props['suffixText'] as String? ?? '',
    autofillHints: TanreiTextField.autofillHintsFromHtml(props['autocomplete'] as String? ?? ''),
    leadingIcon: slots['leading-icon'] == null ? null : fieldGlyph(slots['leading-icon']!),
    trailingIcon: slots['trailing-icon'] == null ? null : fieldGlyph(slots['trailing-icon']!),
  );
}

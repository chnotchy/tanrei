import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';

/// Everything that decides how one icon glyph is drawn, for a selection state and a size.
@immutable
class TanreiResolvedIconStyle {
  /// Creates a resolved icon style.
  const TanreiResolvedIconStyle({
    required this.fontFamily,
    required this.fontFamilyFallback,
    required this.size,
    required this.fill,
    required this.weight,
    required this.opticalSize,
    required this.grade,
  });

  /// The icon font of the selection state: the family a product's `IconData` constants for that
  /// state must name.
  final String fontFamily;

  /// Further families of the state's stack, if the design system names more than one.
  final List<String>? fontFamilyFallback;

  /// The icon box, in logical pixels.
  final double size;

  /// The `FILL` axis. A static icon font has no axes; the value is then harmless.
  final double fill;

  /// The `wght` axis.
  final double weight;

  /// The `opsz` axis.
  final double opticalSize;

  /// The `GRAD` axis: always 0.
  final double grade;

  /// The axes as [FontVariation]s.
  List<FontVariation> get fontVariations => <FontVariation>[
    FontVariation('FILL', fill),
    FontVariation.weight(weight),
    FontVariation('GRAD', grade),
    FontVariation.opticalSize(opticalSize),
  ];

  /// A [TextStyle] that draws a glyph of the icon font as text (`Text(String.fromCharCode(...))`).
  TextStyle toTextStyle({Color? color}) => TextStyle(
    inherit: false,
    color: color,
    fontFamily: fontFamily,
    fontFamilyFallback: fontFamilyFallback,
    fontSize: size,
    height: 1,
    fontVariations: fontVariations,
  );
}

/// Draws icons the way the design system's icon tokens (`system.icon`) say.
///
/// The rule the tokens encode: an icon for something unselected is drawn in `familyUnselected` with
/// `fillUnselected`, the same icon in its selected state in `familySelected` with `fillSelected`,
/// in one weight, everywhere. A variable icon font (Material Symbols) is one family and two fills;
/// a static set (Material Icons Outlined / Material Icons) is two families, and the axes do
/// nothing.
///
/// The icon fonts are referenced by name and are not bundled: a product adds the fonts to its own
/// `pubspec.yaml` under those family names. Flutter's `IconData` carries its font family itself and
/// must be a constant (the icon tree shaker rejects anything else), so a product declares one
/// constant per family it uses and picks with [family]:
///
/// ```dart
/// const IconData starOutlined = IconData(0xe838, fontFamily: 'Material Symbols Rounded');
/// ```
extension TanreiIconStyleToIconTheme on TanreiIconStyle {
  /// The font stack of an icon whose subject is [selected] or not.
  TanreiFontStack familyStack({required bool selected}) =>
      selected ? familySelected : familyUnselected;

  /// The icon font family of an icon whose subject is [selected] or not: the first named family of
  /// that state's stack.
  String family({required bool selected}) => familyStack(selected: selected).families.first;

  /// The `FILL` axis value of an icon whose subject is [selected] or not.
  double fill({required bool selected}) => selected ? fillSelected : fillUnselected;

  /// The `opsz` axis value for an icon box of [size] logical pixels: the box size, kept within the
  /// optical sizes the system's icon font is drawn for (`sys.icon.optical-size.min` / `.max`:
  /// 20–48 for Material Symbols; another icon font names its own range).
  double opticalSize(double size) => size.clamp(opticalSizeMin, opticalSizeMax).toDouble();

  /// Family, fill, weight, optical size and grade for one icon of [size] logical pixels — usually a
  /// measure of the system (`system.measure.iconMedium`) or a component's icon size token.
  TanreiResolvedIconStyle resolve({required double size, required bool selected}) {
    final List<String> families = familyStack(selected: selected).families;
    return TanreiResolvedIconStyle(
      fontFamily: families.first,
      fontFamilyFallback: families.length > 1 ? families.sublist(1) : null,
      size: size,
      fill: fill(selected: selected),
      weight: weight,
      opticalSize: opticalSize(size),
      grade: _grade,
    );
  }

  /// The arguments of `Icon(size:, fill:, weight:, grade:, opticalSize:)` as an [IconThemeData]:
  /// wrap a subtree in `IconTheme.merge(data: ...)`, or read the fields for a single `Icon`. The
  /// family is not part of an icon theme — it belongs to the `IconData` (see [family]).
  IconThemeData toIconThemeData({required double size, required bool selected, Color? color}) {
    final TanreiResolvedIconStyle style = resolve(size: size, selected: selected);
    return IconThemeData(
      size: style.size,
      fill: style.fill,
      weight: style.weight,
      grade: style.grade,
      opticalSize: style.opticalSize,
      color: color,
    );
  }

  /// The same axes as [FontVariation]s, for a glyph drawn as text.
  List<FontVariation> fontVariations({required double size, required bool selected}) =>
      resolve(size: size, selected: selected).fontVariations;
}

/// The default grade of a variable icon font: a constant of the font format, not a design value.
const double _grade = 0;

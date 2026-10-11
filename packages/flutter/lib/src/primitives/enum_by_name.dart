import '../generated/tokens.g.dart';

/// The value of [values] named [name], or [fallback] when none is: a total lookup for a component
/// prop that is a closed Dart enum, not a token axis (a divider's `inset`, a progress indicator's
/// `variant`).
///
/// In Dart code an enum value cannot be unknown; a name can, when a prop arrives as text (a
/// fixture, a server-driven screen, a deep link). Such a name renders as the prop's default and is
/// reported in debug builds through [debugTanreiReportUnknownValue] (`kind`, the name, the
/// fallback's name), exactly like an open key the design system does not have. It never
/// throws and never asserts; release builds stay silent.
T tanreiEnumByName<T extends Enum>(
  List<T> values,
  String name, {
  required T fallback,
  required String kind,
}) {
  for (final T value in values) {
    if (value.name == name) {
      return value;
    }
  }
  assert(() {
    debugTanreiReportUnknownValue(kind, name, fallback.name);
    return true;
  }());
  return fallback;
}

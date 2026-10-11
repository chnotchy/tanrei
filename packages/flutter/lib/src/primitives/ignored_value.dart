import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Receives a prop a component was given and cannot honour: [component] is its spec name
/// (`extended-fab`), [prop] the prop as the widget names it (`isExtended`), [why] one sentence
/// that says why it is ignored, and [widget] the widget that was built with it.
typedef TanreiIgnoredValueReporter =
    void Function(String component, String prop, String why, Widget widget);

/// Called — in debug builds only — when a component is given a value its spec says it ignores and
/// reports: an extended FAB asked to collapse without an icon (EFB-15), an avatar given to a chip
/// that is not an input chip (CHP-15). The component still renders, as the spec says; release
/// builds never call it and never fail.
///
/// The default reports through [FlutterError.reportError]. A component calls it once per element —
/// when it is first built so, and again only after the value was honoured in between — never on
/// every build. Replace it to collect or silence the reports, for example in tests.
TanreiIgnoredValueReporter debugTanreiReportIgnoredValue = tanreiReportIgnoredValue;

/// The default [debugTanreiReportIgnoredValue].
void tanreiReportIgnoredValue(String component, String prop, String why, Widget widget) {
  FlutterError.reportError(
    FlutterErrorDetails(
      exception: FlutterError.fromParts(<DiagnosticsNode>[
        ErrorSummary('A $component ignores its $prop.'),
        ErrorDescription(why),
        DiagnosticsProperty<Widget>(
          'The widget was',
          widget,
          style: DiagnosticsTreeStyle.errorProperty,
        ),
      ]),
      library: 'tanrei',
      context: ErrorDescription('while building a $component'),
    ),
  );
}

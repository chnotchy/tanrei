import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Receives a control that has no accessible name: [component] is its spec name (`icon-button`),
/// [widget] the widget that was built without one.
typedef TanreiMissingNameReporter = void Function(String component, Widget widget);

/// Called — in debug builds only — when a control whose spec requires an accessible name is built
/// with an empty one (an icon button without `semanticLabel`, spec ICB-14; a progress or loading
/// indicator without `semanticsLabel`; a badge's dot without `semanticLabel`, BDG-9; a checkbox,
/// radio button or switch without `label`, CHK-16 / RAD-18 / SWT-16; an interactive card without
/// `semanticLabel`, CRD-14; a text field without `labelText`, TXF-23; a FAB without
/// `semanticLabel`, FAB-14; an extended FAB or a chip without `label`, EFB-19 / CHP-26; an input
/// chip's remove action without `removeSemanticLabel`, reported as `chip remove action`; a
/// selectable list without `semanticLabel`, LST-23; a list tile without `title`, reported as
/// `list item`; a menu item whose label `Text` is empty, MNU-26, reported as `menu item`; a tab
/// without `label`, TAB-22, reported as `tab`; a navigation bar's, rail's or drawer's destination
/// without `label`, NVB-20 / NVR-21 / NVD-24, reported as `navigation destination`; a modal
/// navigation drawer without `semanticLabel`, NVD-24, reported as `navigation drawer`; a snackbar's close button without `closeIconLabel`,
/// SNK-20, reported as `snackbar close button`; a dialog without `headline`, DLG-14; a bottom
/// sheet without `semanticLabel`, BSH-22, reported as `bottom sheet`, and its interactive drag
/// handle without `handleSemanticLabel`, BSH-11, reported as `bottom sheet handle`; a side sheet
/// without `headline`, SSH-12, reported as `side sheet`; a carousel without `semanticLabel`, CRL-20,
/// reported as `carousel`, and its item without `label`, reported as `carousel item`; a date picker
/// whose `labels.label` is empty, DTP-40, reported as `date picker`; a time picker whose
/// `labels.label` is empty, TMP-29, reported as `time picker`). The
/// control still renders; release builds never call it and never fail.
///
/// The default reports through [FlutterError.reportError], once per element (when it is first
/// built without a name, and again only if it gets one and loses it). Replace it to collect or
/// silence the reports, for example in tests.
TanreiMissingNameReporter debugTanreiReportMissingName = tanreiReportMissingName;

/// The default [debugTanreiReportMissingName].
void tanreiReportMissingName(String component, Widget widget) {
  FlutterError.reportError(
    FlutterErrorDetails(
      exception: FlutterError.fromParts(<DiagnosticsNode>[
        ErrorSummary('A $component has no accessible name.'),
        ErrorDescription(_why[component] ?? _whyByDefault(component)),
        ErrorHint('Give it a non-empty ${_property[component] ?? _nameProperty(widget)}.'),
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

/// Why a missing name matters, for a component whose reason is not the default one.
const Map<String, String> _why = <String, String>{
  'bottom sheet':
      'A bottom sheet is a dialog or a region: without a label assistive technology announces an '
      'unnamed one, and nothing says what it is for.',
  'carousel':
      'A carousel is a list: without a label assistive technology cannot say what its items are.',
  'carousel item':
      'The label is the item\'s accessible name; its content is not read. Without one assistive '
      'technology announces an unnamed button. Say what the content shows: "Coast path, 12 photos".',
  'side sheet':
      'The headline is the side sheet\'s accessible name: without one assistive technology '
      'announces an unnamed dialog or region, and nothing says what the panel is for.',
  'bottom sheet handle':
      'The drag handle is a button that changes the sheet\'s height: without its own name '
      'assistive technology announces an unnamed button. Name it: "Resize sheet".',
  'card':
      'Without a label, assistive technology reads the whole content of an interactive card as '
      'its name: long, and hard to act on. Name it by its heading.',
  'chip remove action':
      'An input chip\'s remove action is a separate button: without its own name assistive '
      'technology announces an unnamed button next to the chip. Name the item: "Remove Ada".',
  'date picker':
      'The label is the picker\'s accessible name and its header\'s first line: without one '
      'assistive technology announces an unnamed dialog, and nothing says what the date is for.',
  'time picker':
      'The label is the picker\'s accessible name and its first line: without one assistive '
      'technology announces an unnamed dialog, and nothing says what the time is for.',
  'dialog':
      'The headline is the dialog\'s accessible name: without one assistive technology announces an '
      'unnamed dialog, and nothing says what the decision is about.',
  'list':
      'A list people choose from is a listbox: without a label assistive technology cannot say '
      'what its options are for.',
  'list item':
      'The headline is the item\'s accessible name: without one assistive technology announces an '
      'unnamed item.',
  'menu item':
      'The label is the item\'s accessible name: without one assistive technology announces an '
      'unnamed menu item.',
  'navigation destination':
      'The label is the destination\'s accessible name, drawn or not: without one assistive '
      'technology announces an unnamed tab or button.',
  'navigation drawer':
      'A modal drawer is a dialog: without a label assistive technology announces an unnamed '
      'dialog, and nothing says what the destinations are for.',
  'segment':
      'The label is the segment\'s accessible name, drawn or not: without one assistive technology '
      'announces an unnamed option.',
  'segmented button':
      'The label names the question the segments answer ("Range"): without one assistive '
      'technology announces a group of options without saying what they choose.',
  'snackbar close button':
      'The close button shows only a glyph: without its own name assistive technology announces '
      'an unnamed button. Name it in the product\'s language: "Close".',
  'split button':
      'The label is the leading half\'s text and accessible name: without one assistive technology '
      'announces an unnamed button for the main action.',
  'split button menu':
      'The trailing half shows only a chevron: without menuSemanticLabel assistive technology '
      'announces an unnamed button. Say what the menu offers: "More save options".',
  'fab menu':
      'The toggle shows only a glyph, and its label also names the menu: without one assistive '
      'technology announces an unnamed button and an unnamed menu.',
  'fab menu item':
      'The label is the item\'s text and accessible name: without one assistive technology '
      'announces an unnamed menu item.',
  'tab':
      'The label is the tab\'s accessible name, drawn or not: without one assistive technology '
      'announces an unnamed tab.',
  'text-field':
      'Assistive technology announces an unnamed text box: nobody can tell what to type. A '
      'placeholder is not a name.',
};

/// The property that names a part which is not the widget itself (a sub-control).
const Map<String, String> _property = <String, String>{
  'bottom sheet': 'semanticLabel',
  'bottom sheet handle': 'handleSemanticLabel',
  'side sheet': 'headline',
  'carousel': 'semanticLabel',
  'carousel item': 'label',
  'chip remove action': 'removeSemanticLabel',
  'list item': 'title',
  'menu item': 'child',
  'navigation destination': 'label',
  'navigation drawer': 'semanticLabel',
  'segment': 'label',
  'segmented button': 'semanticLabel',
  'snackbar close button': 'closeIconLabel',
  'split button': 'label',
  'split button menu': 'menuSemanticLabel',
  'fab menu': 'semanticLabel',
  'fab menu item': 'label',
  'dialog': 'headline',
  'date picker': 'labels.label',
};

String _whyByDefault(String component) =>
    'An icon, a dot or a moving mark alone is not a name: assistive technology announces '
    'this $component without saying what it does or means.';

/// The parameter that carries [widget]'s accessible name, as its diagnostics call it
/// (`semanticLabel`, `semanticsLabel`, or the `label` of a selection control), so the report says
/// what to set.
String _nameProperty(Widget widget) {
  for (final DiagnosticsNode property in widget.toDiagnosticsNode().getProperties()) {
    final String name = property.name ?? '';
    if (name == 'label' ||
        name == 'labelText' ||
        (name.startsWith('semantic') && name.endsWith('Label'))) {
      return name;
    }
  }
  return 'accessible name';
}

/// Whether [label] names a control: not empty and not only white space.
bool tanreiIsAccessibleName(String? label) => label != null && label.trim().isNotEmpty;

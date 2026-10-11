import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show ClipOp, SemanticsInputType, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/corner_shape.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/field_container.dart';
import '../primitives/focus_ring.dart';
import '../primitives/interaction_state.dart';
import '../primitives/tap_target.dart';
import '../primitives/text_direction.dart';
import '../theme/icon_style.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// What the value of a text field is (the spec's `type`): chooses the keyboard, autocorrection,
/// obscured entry and semantics (TXF-20). The value is a string for every type.
enum TanreiTextFieldType {
  /// A general keyboard.
  text,

  /// An email keyboard, without autocapitalization or autocorrection.
  email,

  /// Obscured, secure entry without autocorrection. Always single-line.
  password,

  /// A numeric keyboard with a decimal separator. The value is not parsed, rounded or validated.
  number,

  /// A general keyboard whose action key reads as search; exposed as a search box.
  search,

  /// A phone keypad.
  tel,

  /// A URL keyboard, without autocapitalization or autocorrection.
  url;

  /// The type named [name] (a fixture, a server-driven screen). A name the text field does not know
  /// behaves as [text] and is reported in debug builds (TXF-9).
  static TanreiTextFieldType fromName(String name) =>
      tanreiEnumByName(values, name, fallback: text, kind: 'text-field type');
}

/// Lets people enter and edit text: one line or several, with a floating label, supporting and
/// error text, a character counter, icons, and a prefix and suffix.
///
/// Implements `specs/text-field.spec.json` with the idiom of Flutter's `TextField` and
/// `InputDecoration`, on the widgets library's own `EditableText` — the platform's text element,
/// so input methods, autofill, selection and the keyboard behave as the platform
/// does:
///
/// * the value lives in a [controller] (or an internal one, seeded with [initialValue]);
///   [onChanged] is the spec's `input` (every user edit, never a value the product sets),
///   [onCommit] its `change` (focus left, or the action key, with a value that differs from the
///   one last committed) and [onSubmitted] its `action` (the action key of a single-line field,
///   after any `change` it causes);
/// * [labelText] is the accessible name, drawn or not ([labelHidden]); [hintText] the placeholder,
///   [helperText] the supporting text, [errorText] the text shown in its place while [isError];
/// * [enabled] `false` is the spec's `disabled`; [readOnly], [isRequired], [multiline],
///   [minLines], [maxLines] (null = the spec's `maxRows: 0`, no limit), [maxLength] (0 = none),
///   [showCounter], [prefixText], [suffixText] and [autofillHints] are the spec's props of the
///   same meaning; [leadingIcon] and [trailingIcon] are its two slots.
///
/// Every design value comes from the `TanreiTextFieldTokens` of the active design system
/// (`TanreiTheme.of(context).system.textField`). The field resolves its interaction state —
/// disabled, else focused (by any means: a field shows where typing will go) over hovered — and its
/// condition (the `error…` parts while [isError]) and draws every part from that state's tokens
/// (TXF-5, TXF-6, TXF-11). A press on it focuses the input; it is not an action and draws no press
/// answer (TXF-8). Its focus indicator is its own edge — the focused outline or active indicator —
/// never the focus ring; a system whose focus style is glow adds the glow (TXF-7).
///
/// Which edge a variant has is read from its tokens, not from its name: a variant whose resting
/// outline paints is drawn as an outlined field (the label floats onto its top edge, which opens a
/// gap for it, and every corner is `container.shape`); any other variant floats its label inside
/// the container, over the input, is tall enough for both from the start, and rounds its bottom
/// corners by `container.shape-bottom` (TXF-13, TXF-16).
///
/// [variant] and [size] are open keys: `TanreiTextFieldVariant.filled` and `outlined`,
/// `TanreiTextFieldSize.medium` and `large` are the core values. A value the active system does not
/// have renders as the default (`outlined`, `medium`) and is reported in debug builds (TXF-9).
class TanreiTextField extends StatefulWidget {
  /// Creates a text field. [labelText] names it; pass a [controller] to own the value, or an
  /// [initialValue].
  const TanreiTextField({
    super.key,
    this.controller,
    this.initialValue = '',
    required this.labelText,
    this.labelHidden = false,
    this.variant = TanreiTextFieldVariant.outlined,
    this.size = TanreiTextFieldSize.medium,
    this.type = TanreiTextFieldType.text,
    this.hintText = '',
    this.helperText = '',
    this.errorText = '',
    this.isError = false,
    this.enabled = true,
    this.readOnly = false,
    this.isRequired = false,
    this.multiline = false,
    this.minLines = 2,
    this.maxLines,
    this.maxLength = 0,
    this.showCounter = false,
    this.prefixText = '',
    this.suffixText = '',
    this.autofillHints,
    this.leadingIcon,
    this.trailingIcon,
    this.onChanged,
    this.onCommit,
    this.onSubmitted,
    this.focusNode,
    this.autofocus = false,
  });

  /// Holds the value (the spec's `value`). Setting it from code shows the new value and emits
  /// nothing; set during an input method's composition, it is applied when the composition ends
  /// (TXF-4). Null: the field keeps its own, starting at [initialValue].
  final TextEditingController? controller;

  /// The value of a field without a [controller].
  final String initialValue;

  /// Names the field, visibly and to assistive technology. An empty one still renders and is
  /// reported in debug builds (TXF-23).
  final String labelText;

  /// Does not draw the label, which stays the accessible name.
  final bool labelHidden;

  /// Filled marks the field by a tinted box and a bottom line; outlined by a border.
  final TanreiTextFieldVariant variant;

  /// The minimum height of a single-line field and the size of its text and icons.
  final TanreiTextFieldSize size;

  /// What the value is: the keyboard, autocorrection, obscured entry and semantics (TXF-20).
  final TanreiTextFieldType type;

  /// The placeholder (the spec's `placeholder`): shown while the value is empty and the label is
  /// floated or not drawn. Never the name.
  final String hintText;

  /// The supporting text below the field (the spec's `supportingText`), and part of the input's
  /// description.
  final String helperText;

  /// Shown in place of [helperText] while [isError].
  final String errorText;

  /// Puts the field in the error condition (the spec's `error`). Validation is the product's.
  final bool isError;

  /// Whether the field can be focused and edited (the spec's `disabled`, inverted).
  final bool enabled;

  /// Whether the value can be focused, selected and copied but not changed.
  final bool readOnly;

  /// Exposes the field as required (the spec's `required`). It draws no mark.
  final bool isRequired;

  /// Accepts line breaks and grows from [minLines] to [maxLines]. Ignored for a password.
  final bool multiline;

  /// The lines an empty multi-line field shows (the spec's `minRows`).
  final int minLines;

  /// The lines a multi-line field grows to before it scrolls (the spec's `maxRows`); null grows
  /// without limit. Smaller than [minLines], it stays at [minLines].
  final int? maxLines;

  /// The most user-perceived characters (grapheme clusters) the user can enter; 0 is no limit.
  final int maxLength;

  /// Shows the character count (the spec's `counter`), and the limit when [maxLength] is set.
  final bool showCounter;

  /// Fixed text before the value, not part of it.
  final String prefixText;

  /// Fixed text after the value, not part of it.
  final String suffixText;

  /// The autofill hints (the spec's `autocomplete`), as `AutofillHints` constants. A product that
  /// holds HTML autofill field names maps them with [autofillHintsFromHtml].
  final Iterable<String>? autofillHints;

  /// An icon at the start of the field (the spec's `leading-icon` slot).
  final Widget? leadingIcon;

  /// An icon, or the product's own icon button, at the end of the field (the spec's
  /// `trailing-icon` slot).
  final Widget? trailingIcon;

  /// The user changed the value (the spec's `input`).
  final ValueChanged<String>? onChanged;

  /// The user committed a changed value (the spec's `change`).
  final ValueChanged<String>? onCommit;

  /// The user pressed the action key in a single-line field (the spec's `action`).
  final ValueChanged<String>? onSubmitted;

  /// An optional focus node for the input, instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus the input when nothing else is focused.
  final bool autofocus;

  /// The autofill hint for an HTML autofill field name (`email`, `current-password`,
  /// `one-time-code`, …): Flutter's `AutofillHints` constant where it has one, else [name] as is.
  static String autofillHintFromHtml(String name) => _htmlAutofill[name] ?? name;

  /// The autofill hints of the spec's `autocomplete` string (space-separated HTML autofill field
  /// names; the section and shipping / billing tokens are dropped), or null when it names none.
  static List<String>? autofillHintsFromHtml(String autocomplete) {
    final List<String> hints = <String>[
      for (final String name in autocomplete.trim().split(RegExp(r'\s+')))
        if (name.isNotEmpty &&
            !name.startsWith('section-') &&
            !_htmlAutofillQualifiers.contains(name))
          autofillHintFromHtml(name),
    ];
    return hints.isEmpty ? null : hints;
  }

  @override
  State<TanreiTextField> createState() => _TanreiTextFieldState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('labelText', labelText))
      ..add(FlagProperty('labelHidden', value: labelHidden, ifTrue: 'label hidden'))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(EnumProperty<TanreiTextFieldType>('type', type, defaultValue: TanreiTextFieldType.text))
      ..add(FlagProperty('isError', value: isError, ifTrue: 'error'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled', defaultValue: true))
      ..add(FlagProperty('readOnly', value: readOnly, ifTrue: 'read-only'))
      ..add(FlagProperty('multiline', value: multiline, ifTrue: 'multiline'))
      ..add(IntProperty('maxLength', maxLength, defaultValue: 0));
  }
}

/// HTML autofill field names -> Flutter's `AutofillHints` constants (which the web engine turns
/// back into HTML names).
const Map<String, String> _htmlAutofill = <String, String>{
  'name': AutofillHints.name,
  'honorific-prefix': AutofillHints.namePrefix,
  'given-name': AutofillHints.givenName,
  'additional-name': AutofillHints.middleName,
  'family-name': AutofillHints.familyName,
  'honorific-suffix': AutofillHints.nameSuffix,
  'nickname': AutofillHints.nickname,
  'username': AutofillHints.username,
  'new-password': AutofillHints.newPassword,
  'current-password': AutofillHints.password,
  'one-time-code': AutofillHints.oneTimeCode,
  'organization-title': AutofillHints.jobTitle,
  'organization': AutofillHints.organizationName,
  'street-address': AutofillHints.fullStreetAddress,
  'address-line1': AutofillHints.streetAddressLine1,
  'address-line2': AutofillHints.streetAddressLine2,
  'address-line3': AutofillHints.streetAddressLine3,
  'address-level4': AutofillHints.addressCityAndState,
  'address-level3': AutofillHints.sublocality,
  'address-level2': AutofillHints.addressCity,
  'address-level1': AutofillHints.addressState,
  'country': AutofillHints.countryCode,
  'country-name': AutofillHints.countryName,
  'postal-code': AutofillHints.postalCode,
  'cc-name': AutofillHints.creditCardName,
  'cc-given-name': AutofillHints.creditCardGivenName,
  'cc-additional-name': AutofillHints.creditCardMiddleName,
  'cc-family-name': AutofillHints.creditCardFamilyName,
  'cc-number': AutofillHints.creditCardNumber,
  'cc-exp': AutofillHints.creditCardExpirationDate,
  'cc-exp-month': AutofillHints.creditCardExpirationMonth,
  'cc-exp-year': AutofillHints.creditCardExpirationYear,
  'cc-csc': AutofillHints.creditCardSecurityCode,
  'cc-type': AutofillHints.creditCardType,
  'transaction-currency': AutofillHints.transactionCurrency,
  'transaction-amount': AutofillHints.transactionAmount,
  'language': AutofillHints.language,
  'bday': AutofillHints.birthday,
  'bday-day': AutofillHints.birthdayDay,
  'bday-month': AutofillHints.birthdayMonth,
  'bday-year': AutofillHints.birthdayYear,
  'sex': AutofillHints.gender,
  'url': AutofillHints.url,
  'photo': AutofillHints.photo,
  'tel': AutofillHints.telephoneNumber,
  'tel-country-code': AutofillHints.telephoneNumberCountryCode,
  'tel-national': AutofillHints.telephoneNumberNational,
  'tel-area-code': AutofillHints.telephoneNumberAreaCode,
  'tel-local': AutofillHints.telephoneNumberLocal,
  'tel-local-prefix': AutofillHints.telephoneNumberLocalPrefix,
  'tel-local-suffix': AutofillHints.telephoneNumberLocalSuffix,
  'tel-extension': AutofillHints.telephoneNumberExtension,
  'email': AutofillHints.email,
  'impp': AutofillHints.impp,
};

/// The qualifiers of an HTML `autocomplete` value, which name no field.
const Set<String> _htmlAutofillQualifiers = <String>{
  'shipping',
  'billing',
  'home',
  'work',
  'mobile',
  'fax',
  'pager',
  'on',
  'off',
  'webauthn',
};

/// How the input of a type behaves (TXF-20, TXF-24).
typedef _InputOfType = ({
  TextInputType keyboard,
  bool obscure,
  bool autocorrect,
  TextCapitalization capitalization,
  TextInputAction? action,
  // email, url, tel, number and password are laid out left to right in any layout direction.
  bool leftToRight,
});

_InputOfType _inputOf(TanreiTextFieldType type) => switch (type) {
  TanreiTextFieldType.text => (
    keyboard: TextInputType.text,
    obscure: false,
    autocorrect: true,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: false,
  ),
  TanreiTextFieldType.email => (
    keyboard: TextInputType.emailAddress,
    obscure: false,
    autocorrect: false,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: true,
  ),
  TanreiTextFieldType.password => (
    keyboard: TextInputType.visiblePassword,
    obscure: true,
    autocorrect: false,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: true,
  ),
  TanreiTextFieldType.number => (
    keyboard: const TextInputType.numberWithOptions(decimal: true),
    obscure: false,
    autocorrect: false,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: true,
  ),
  TanreiTextFieldType.search => (
    keyboard: TextInputType.text,
    obscure: false,
    autocorrect: true,
    capitalization: TextCapitalization.none,
    action: TextInputAction.search,
    leftToRight: false,
  ),
  TanreiTextFieldType.tel => (
    keyboard: TextInputType.phone,
    obscure: false,
    autocorrect: false,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: true,
  ),
  TanreiTextFieldType.url => (
    keyboard: TextInputType.url,
    obscure: false,
    autocorrect: false,
    capitalization: TextCapitalization.none,
    action: null,
    leftToRight: true,
  ),
};

/// How long typing must pause before the counter is announced (TXF-19). A behaviour of the spec,
/// not a design value.
const Duration _counterAnnouncementPause = Duration(seconds: 1);

/// Every color and width of one state and condition, evaluated in the current scheme. State and
/// condition changes interpolate these ([lerp]).
@immutable
class _FieldVisuals {
  const _FieldVisuals({
    required this.container,
    required this.activeIndicator,
    required this.outline,
    required this.label,
    required this.input,
    required this.placeholder,
    required this.affix,
    required this.leadingIcon,
    required this.trailingIcon,
    required this.supportingText,
    required this.counter,
    required this.caret,
    required this.outlineWidth,
    required this.activeIndicatorWidth,
    required this.opacity,
  });

  /// The tokens of [parts] in [theme], the plain parts or — in error — the `error…` parts.
  factory _FieldVisuals.resolve(
    TanreiThemeData theme,
    TanreiTextFieldVariantStateTokens parts, {
    required bool error,
    required double outlineWidth,
    required double activeIndicatorWidth,
    required double opacity,
  }) {
    Color c(TanreiPaint plain, TanreiPaint inError) => theme.paint(error ? inError : plain);
    return _FieldVisuals(
      container: c(parts.containerColor, parts.errorContainerColor),
      activeIndicator: c(parts.activeIndicatorColor, parts.errorActiveIndicatorColor),
      outline: c(parts.outlineColor, parts.errorOutlineColor),
      label: c(parts.labelColor, parts.errorLabelColor),
      input: c(parts.inputColor, parts.errorInputColor),
      placeholder: c(parts.placeholderColor, parts.errorPlaceholderColor),
      affix: c(parts.affixColor, parts.errorAffixColor),
      leadingIcon: c(parts.leadingIconColor, parts.errorLeadingIconColor),
      trailingIcon: c(parts.trailingIconColor, parts.errorTrailingIconColor),
      supportingText: c(parts.supportingTextColor, parts.errorSupportingTextColor),
      counter: c(parts.counterColor, parts.errorCounterColor),
      caret: c(parts.caretColor, parts.errorCaretColor),
      outlineWidth: outlineWidth,
      activeIndicatorWidth: activeIndicatorWidth,
      opacity: opacity,
    );
  }

  final Color container;
  final Color activeIndicator;
  final Color outline;
  final Color label;
  final Color input;
  final Color placeholder;
  final Color affix;
  final Color leadingIcon;
  final Color trailingIcon;
  final Color supportingText;
  final Color counter;
  final Color caret;
  final double outlineWidth;
  final double activeIndicatorWidth;
  final double opacity;

  static _FieldVisuals lerp(_FieldVisuals a, _FieldVisuals b, double t) => _FieldVisuals(
    container: Color.lerp(a.container, b.container, t)!,
    activeIndicator: Color.lerp(a.activeIndicator, b.activeIndicator, t)!,
    outline: Color.lerp(a.outline, b.outline, t)!,
    label: Color.lerp(a.label, b.label, t)!,
    input: Color.lerp(a.input, b.input, t)!,
    placeholder: Color.lerp(a.placeholder, b.placeholder, t)!,
    affix: Color.lerp(a.affix, b.affix, t)!,
    leadingIcon: Color.lerp(a.leadingIcon, b.leadingIcon, t)!,
    trailingIcon: Color.lerp(a.trailingIcon, b.trailingIcon, t)!,
    supportingText: Color.lerp(a.supportingText, b.supportingText, t)!,
    counter: Color.lerp(a.counter, b.counter, t)!,
    caret: Color.lerp(a.caret, b.caret, t)!,
    outlineWidth: lerpDouble(a.outlineWidth, b.outlineWidth, t)!,
    activeIndicatorWidth: lerpDouble(a.activeIndicatorWidth, b.activeIndicatorWidth, t)!,
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

class _TanreiTextFieldState extends State<TanreiTextField>
    with TickerProviderStateMixin<TanreiTextField>
    implements TextSelectionGestureDetectorBuilderDelegate {
  /// What the input edits. The product's [TanreiTextField.controller] is kept in step with it, so
  /// that a value the product sets during a composition waits for the composition to end (TXF-4).
  late final TextEditingController _editing = TextEditingController(
    text: widget.controller?.text ?? widget.initialValue,
  );

  FocusNode? _ownFocusNode;
  FocusNode get _focusNode => widget.focusNode ?? (_ownFocusNode ??= FocusNode());

  @override
  final GlobalKey<EditableTextState> editableTextKey = GlobalKey<EditableTextState>();

  @override
  bool get forcePressEnabled => false;

  @override
  bool get selectionEnabled => true;

  late final TextSelectionGestureDetectorBuilder _gestures = TextSelectionGestureDetectorBuilder(
    delegate: this,
  );

  bool _hovered = false;
  bool _focused = false;

  /// The value last committed: at focus, or at the last `change` (TXF-2).
  String _committed = '';

  /// The value the last build showed.
  late String _shownText = _editing.text;

  /// A value the product set while a composition was in progress (TXF-4).
  TextEditingValue? _pending;

  /// Whether the product's controller is being written from here.
  bool _syncing = false;

  /// Runs 0 -> 1 while the visuals move from [_from] to the current state's (TXF-14).
  late final AnimationController _transition = AnimationController(vsync: this, value: 1);
  _FieldVisuals? _from;
  _FieldVisuals? _drawn;
  TanreiInteractionState? _lastState;
  bool? _lastError;

  /// How far the label is floated: 0 at rest, 1 floated, eased (TXF-14).
  late final AnimationController _float = AnimationController(vsync: this, value: _floats ? 1 : 0);

  Timer? _counterAnnouncement;
  bool _disableAnimations = false;

  TanreiTextFieldTokens get _tokens => TanreiTheme.of(context).system.textField;

  /// The type in use: a password is never multi-line (TXF-17).
  bool get _multiline => widget.multiline && widget.type != TanreiTextFieldType.password;

  bool get _labelDrawn => !widget.labelHidden && widget.labelText.isNotEmpty;

  /// TXF-13: floated while focused or not empty (autofill fills the value, and floats it too).
  bool get _floats => _focusNode.hasFocus || _editing.text.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _focused = _focusNode.hasFocus;
    _committed = _editing.text;
    _focusNode.addListener(_handleFocus);
    _editing.addListener(_handleEditing);
    widget.controller?.addListener(_handleProductValue);
    _transition.addListener(_rebuild);
    _float.addListener(_rebuild);
    _debugReport(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    _transition.duration = tanreiDuration(_tokens.motionStateDuration);
  }

  @override
  void didUpdateWidget(TanreiTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      (oldWidget.focusNode ?? _ownFocusNode)?.removeListener(_handleFocus);
      _focusNode.addListener(_handleFocus);
      _focused = _focusNode.hasFocus;
    }
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?.removeListener(_handleProductValue);
      widget.controller?.addListener(_handleProductValue);
      if (widget.controller case final TextEditingController controller) {
        _applyProductValue(controller.value);
      }
    }
    _debugReport(oldWidget);
    // TXF-12: an error that appears, or changes, while the input has focus is announced once.
    if (_focused &&
        widget.isError &&
        (!oldWidget.isError || oldWidget.errorText != widget.errorText)) {
      final String shown = _shownSupportingText;
      if (shown.isNotEmpty) {
        unawaited(SemanticsService.announce(shown, Directionality.of(context)));
      }
    }
  }

  @override
  void dispose() {
    _counterAnnouncement?.cancel();
    _focusNode.removeListener(_handleFocus);
    widget.controller?.removeListener(_handleProductValue);
    _ownFocusNode?.dispose();
    _editing.dispose();
    _transition.dispose();
    _float.dispose();
    super.dispose();
  }

  void _rebuild() => setState(() {});

  void _debugReport(TanreiTextField? oldWidget) {
    assert(() {
      // TXF-23: a field without a label still renders, and is reported once.
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.labelText);
      if (had && !tanreiIsAccessibleName(widget.labelText)) {
        debugTanreiReportMissingName('text-field', widget);
      }
      // TXF-17: a password is single-line.
      bool multilinePassword(TanreiTextField field) =>
          field.multiline && field.type == TanreiTextFieldType.password;
      if ((oldWidget == null || !multilinePassword(oldWidget)) && multilinePassword(widget)) {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: FlutterError.fromParts(<DiagnosticsNode>[
              ErrorSummary('A password text field cannot be multi-line.'),
              ErrorDescription('It is drawn single-line: a password has no line breaks.'),
              ErrorHint('Set multiline to false, or use another type.'),
            ]),
            library: 'tanrei',
            context: ErrorDescription('while building a text-field'),
          ),
        );
      }
      return true;
    }());
  }

  void _handleFocus() {
    final bool focused = _focusNode.hasFocus;
    if (focused == _focused) {
      return;
    }
    setState(() => _focused = focused);
    if (focused) {
      _committed = _editing.text;
    } else {
      _counterAnnouncement?.cancel();
      _commit();
    }
    _animateFloat();
  }

  /// TXF-2: a `change` once for a value that differs from the one last committed — never during a
  /// composition (TXF-4).
  void _commit() {
    if (_editing.value.composing.isValid || _editing.text == _committed) {
      return;
    }
    _committed = _editing.text;
    widget.onCommit?.call(_committed);
  }

  /// The input changed: text, selection or composition. The product's controller follows, and a
  /// value the product set during a composition is applied once it ends (TXF-4).
  void _handleEditing() {
    if (_editing.text != _shownText) {
      // The placeholder, the counter and the text's direction follow the value.
      setState(() => _shownText = _editing.text);
    }
    final TextEditingController? product = widget.controller;
    if (product != null && product.value != _editing.value) {
      _syncing = true;
      product.value = _editing.value;
      _syncing = false;
    }
    if (_pending != null && !_editing.value.composing.isValid) {
      // After this edit has been delivered (EditableText reports it to onChanged after its
      // listeners), unless the product sets another value first.
      scheduleMicrotask(() {
        if (!mounted) {
          return;
        }
        final TextEditingValue? pending = _pending;
        _pending = null;
        if (pending != null) {
          _applyProductValue(pending);
        }
      });
    }
    _animateFloat();
  }

  void _handleProductValue() {
    if (_syncing) {
      return;
    }
    _applyProductValue(widget.controller!.value);
  }

  /// Shows a value the product set (TXF-1): now, or when a composition in progress ends (TXF-4).
  void _applyProductValue(TextEditingValue value) {
    final bool composing = _editing.value.composing.isValid;
    if (value.text == _editing.text) {
      // An echo of the value shown never disturbs a composition; a new selection applies outside
      // one.
      _pending = null;
      if (!composing && value.selection.isValid && value.selection != _editing.selection) {
        _editing.selection = value.selection;
      }
      return;
    }
    if (composing) {
      _pending = value;
      return;
    }
    _pending = null;
    final TextSelection selection = value.selection.isValid
        ? value.selection
        : TextSelection.collapsed(offset: value.text.length);
    _editing.value = value.copyWith(selection: selection, composing: TextRange.empty);
  }

  void _animateFloat() {
    final double target = _floats ? 1 : 0;
    if (_float.value == target && !_float.isAnimating) {
      return;
    }
    if (_disableAnimations) {
      _float.value = target;
    } else {
      final TanreiTextFieldTokens tokens = _tokens;
      unawaited(
        _float.animateTo(
          target,
          duration: tanreiDuration(tokens.motionLabelDuration),
          curve: tokens.motionLabelEasing.toCurve(),
        ),
      );
    }
  }

  void _handleChanged(String value) {
    widget.onChanged?.call(value);
    // TXF-19: the count is announced once typing pauses — never on every keystroke.
    _counterAnnouncement?.cancel();
    if (widget.showCounter && _focused) {
      _counterAnnouncement = Timer(_counterAnnouncementPause, () {
        if (mounted) {
          unawaited(SemanticsService.announce(_counterText, Directionality.of(context)));
        }
      });
    }
  }

  void _handleSubmitted(String value) {
    // TXF-3: after any change it causes.
    _commit();
    widget.onSubmitted?.call(value);
  }

  /// The shown supporting text: the error text in error (the supporting text while it is empty).
  String get _shownSupportingText =>
      widget.isError && widget.errorText.isNotEmpty ? widget.errorText : widget.helperText;

  int get _count => _editing.text.characters.length;

  String get _counterText => widget.maxLength > 0 ? '$_count/${widget.maxLength}' : '$_count';

  TanreiInteractionState get _state => tanreiInteractionStateOf(<WidgetState>{
    if (!widget.enabled) WidgetState.disabled,
    if (_focused) WidgetState.focused,
    if (_hovered) WidgetState.hovered,
  });

  /// The visuals to draw: [target], or — while a change of state or condition runs — the way there
  /// from what was drawn. A first build, a theme change and reduced motion apply at once.
  _FieldVisuals _animate(_FieldVisuals target, TanreiInteractionState state) {
    final bool changed =
        _lastState != null && (state != _lastState || widget.isError != _lastError);
    _lastState = state;
    _lastError = widget.isError;
    if (changed && _drawn != null) {
      _from = _drawn;
      if (_disableAnimations) {
        _transition.value = _transition.upperBound;
      } else {
        _transition.forward(from: _transition.lowerBound);
      }
    }
    final _FieldVisuals? from = _from;
    final _FieldVisuals visuals = from == null || _transition.isCompleted
        ? target
        : _FieldVisuals.lerp(
            from,
            target,
            _tokens.motionStateEasing.toCurve().transform(_transition.value),
          );
    _drawn = visuals;
    return visuals;
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSystem system = theme.system;
    final TanreiTextFieldTokens tokens = system.textField;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (TXF-9).
    final TanreiTextFieldSizeTokens size = tokens.sizes[widget.size];
    final TanreiTextFieldVariantTokens variant = tokens.variants[widget.variant];
    final TanreiInteractionState state = _state;
    final TanreiTextFieldStateTokens? stateTokens = tokens.stateTokens(state);
    final bool error = widget.isError;
    final _FieldVisuals visuals = _animate(
      _FieldVisuals.resolve(
        theme,
        variant.of(state),
        error: error,
        outlineWidth: stateTokens?.outlineWidth ?? tokens.outlineWidth,
        activeIndicatorWidth: stateTokens?.activeIndicatorWidth ?? tokens.activeIndicatorWidth,
        opacity: stateTokens?.opacity ?? 1,
      ),
      state,
    );
    // The variant's edge, read from its tokens: an outline that paints at rest.
    final bool outlined = theme.paint(variant.enabled.outlineColor).a > 0;

    final TextScaler textScaler = MediaQuery.textScalerOf(context);
    double lineOf(TanreiTextStyle style) =>
        textScaler.scale(style.size) * style.lineHeight / style.size;
    final double inputLine = lineOf(size.inputTypescale);
    final double floatedLine = lineOf(size.labelFloatedTypescale);
    final bool labelDrawn = _labelDrawn;
    final bool labelInside = labelDrawn && !outlined;
    final bool floats = _floats;
    final double float = labelDrawn ? _float.value : 1;
    // TXF-15: the placeholder, the prefix and the suffix show only while the label is floated or
    // not drawn.
    final bool affixesShown = !labelDrawn || floats;
    final double affixOpacity = labelDrawn ? _float.value : 1;

    final _InputOfType input = _inputOf(widget.type);
    final TextDirection ambient = Directionality.of(context);
    final TextDirection textDirection = input.leftToRight
        ? TextDirection.ltr
        : tanreiTextDirectionOf(_editing.text) ?? ambient;
    final TextStyle inputStyle = size.inputTypescale.toTextStyle(color: visuals.input);
    final bool multiline = _multiline;
    final int? maxLines = multiline
        ? (widget.maxLines == null ? null : math.max(widget.maxLines!, widget.minLines))
        : 1;

    final Widget editable = EditableText(
      key: editableTextKey,
      controller: _editing,
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      readOnly: widget.readOnly || !widget.enabled,
      style: inputStyle,
      cursorColor: visuals.caret,
      backgroundCursorColor: visuals.placeholder,
      // TXF-6: the highlight behind selected text, in every variant and state.
      selectionColor: theme.paint(tokens.selectionColor),
      textDirection: textDirection,
      // TXF-24: a left-to-right value sits at the field's start edge.
      textAlign: input.leftToRight
          ? (ambient == TextDirection.rtl ? TextAlign.right : TextAlign.left)
          : TextAlign.start,
      keyboardType: multiline ? TextInputType.multiline : input.keyboard,
      textInputAction: multiline ? TextInputAction.newline : input.action,
      obscureText: input.obscure,
      autocorrect: input.autocorrect,
      enableSuggestions: !input.obscure && input.autocorrect,
      textCapitalization: input.capitalization,
      maxLines: maxLines,
      minLines: multiline ? widget.minLines : null,
      // TXF-18: grapheme clusters, a paste shortened to fit, a composition left alone until it is
      // committed; a value the product sets is never shortened (formatters see user edits only).
      inputFormatters: widget.maxLength > 0
          ? <TextInputFormatter>[
              LengthLimitingTextInputFormatter(
                widget.maxLength,
                maxLengthEnforcement: MaxLengthEnforcement.truncateAfterCompositionEnds,
              ),
            ]
          : null,
      autofillHints: widget.enabled && !widget.readOnly ? widget.autofillHints : null,
      onChanged: _handleChanged,
      onSubmitted: _handleSubmitted,
      rendererIgnoresPointer: true,
      mouseCursor: MouseCursor.defer,
      contextMenuBuilder: MediaQuery.maybeSupportsShowingSystemContextMenu(context) ?? false
          ? (BuildContext context, EditableTextState state) =>
                SystemContextMenu.editableText(editableTextState: state)
          : null,
    );

    // The placeholder and the affixes are drawn, not named: the label is the name (TXF-23); the
    // affixes are read in the description instead (TXF-15).
    Widget affix(String text) => Opacity(
      opacity: affixOpacity,
      child: ExcludeSemantics(
        child: Text(
          text,
          style: size.inputTypescale.toTextStyle(color: visuals.affix),
          maxLines: 1,
          softWrap: false,
        ),
      ),
    );

    final Widget inputRow = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: tokens.affixGap,
      children: <Widget>[
        if (affixesShown && widget.prefixText.isNotEmpty) affix(widget.prefixText),
        Expanded(
          child: Stack(
            children: <Widget>[
              if (affixesShown && widget.hintText.isNotEmpty && _editing.text.isEmpty)
                Positioned.fill(
                  child: ExcludeSemantics(
                    child: IgnorePointer(
                      child: Opacity(
                        opacity: affixOpacity,
                        child: Text(
                          widget.hintText,
                          style: size.inputTypescale.toTextStyle(color: visuals.placeholder),
                          maxLines: multiline ? null : 1,
                          overflow: multiline ? null : TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ),
                ),
              editable,
            ],
          ),
        ),
        if (affixesShown && widget.suffixText.isNotEmpty) affix(widget.suffixText),
      ],
    );

    Widget? slot(Widget? icon, Color color) {
      if (icon == null) {
        return null;
      }
      final TanreiIconStyle style = system.icon;
      // TXF-22: an unselected icon at the size's icon size. An interactive element the product
      // places here keeps its own tokens (its own theme wins) and stays its own semantics node.
      return Semantics(
        container: true,
        child: MediaQuery.withNoTextScaling(
          child: IconTheme(
            data: style.toIconThemeData(size: size.iconSize, selected: false, color: color),
            child: DefaultTextStyle(
              style: style.resolve(size: size.iconSize, selected: false).toTextStyle(color: color),
              textAlign: TextAlign.center,
              softWrap: false,
              maxLines: 1,
              child: ConstrainedBox(
                constraints: BoxConstraints(minWidth: size.iconSize, minHeight: size.iconSize),
                child: Center(widthFactor: 1, heightFactor: 1, child: icon),
              ),
            ),
          ),
        ),
      );
    }

    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );
    final _FieldGeometry geometry = _FieldGeometry(
      padTop: labelInside
          ? size.containerPaddingBlockWithLabel + floatedLine
          : size.containerPaddingBlock,
      padBottom: labelInside ? size.containerPaddingBlockWithLabel : size.containerPaddingBlock,
      // TXF-16: a filled field that draws its label is tall enough for both lines from the start.
      minHeight: labelInside
          ? math.max(
              size.containerHeight,
              2 * size.containerPaddingBlockWithLabel + floatedLine + inputLine,
            )
          : size.containerHeight,
      paddingInline: size.containerPaddingInline,
      paddingInlineWithIcon: size.containerPaddingInlineWithIcon,
      gap: size.containerGap,
      firstLine: inputLine,
      floatedLine: floatedLine,
      float: float,
      labelOnEdge: outlined,
      // TXF-13: a filled single-line field rests its label centred in the container; an outlined
      // one, and a multi-line one (TXF-17), in the first input line.
      restCentred: !outlined && !multiline,
      notchPadding: tokens.outlineNotchPadding,
    );
    final _FieldPaint paint = _FieldPaint(
      container: visuals.container,
      outline: visuals.outline,
      outlineWidth: visuals.outlineWidth,
      activeIndicator: visuals.activeIndicator,
      activeIndicatorWidth: visuals.activeIndicatorWidth,
      shape: shape,
      // TXF-16: an outlined field rounds all four corners alike.
      bottomRadius: outlined ? tokens.containerShape : tokens.containerShapeBottom,
    );

    // TXF-13: the label in each position, as it is drawn, so that the field can make room for
    // every line of a label that wraps.
    final DefaultTextStyle ambientText = DefaultTextStyle.of(context);
    TextSpan spanOf(String text, TanreiTextStyle style) =>
        TextSpan(text: text, style: ambientText.style.merge(style.toTextStyle()));
    TextSpan? labelIn(TanreiTextStyle style) => labelDrawn ? spanOf(widget.labelText, style) : null;
    final _LabelText labelText = _LabelText(
      resting: labelIn(size.labelTypescale),
      floated: labelIn(size.labelFloatedTypescale),
      textScaler: textScaler,
      textHeightBehavior: ambientText.textHeightBehavior,
      // TXF-13: fields laid out as peers make room for each other's labels (DTP-25).
      room: <(TextSpan, TextSpan)>[
        if (labelDrawn)
          for (final String peer in TanreiFieldLabelRoom.of(context))
            if (peer != widget.labelText && peer.isNotEmpty)
              (spanOf(peer, size.labelTypescale), spanOf(peer, size.labelFloatedTypescale)),
      ],
    );
    final Widget field = _FieldLayout(
      geometry: geometry,
      paint: paint,
      labelText: labelText,
      leading: slot(widget.leadingIcon, visuals.leadingIcon),
      input: inputRow,
      trailing: slot(widget.trailingIcon, visuals.trailingIcon),
      label: labelDrawn
          ? ExcludeSemantics(
              // TXF-13: a label that does not fit wraps, never cut; the outline's gap opens by its
              // widest line.
              child: Text(
                widget.labelText,
                textWidthBasis: TextWidthBasis.longestLine,
                style: TextStyle.lerp(
                  size.labelTypescale.toTextStyle(color: visuals.label),
                  size.labelFloatedTypescale.toTextStyle(color: visuals.label),
                  float,
                ),
              ),
            )
          : null,
    );

    // TXF-7: the edge is the focus indicator; only a glow is drawn around it.
    final bool glow = switch (system.behavior.focusStyle) {
      TanreiFocusStyle.ring => false,
      TanreiFocusStyle.glow => _focused,
    };

    final String shown = _shownSupportingText;
    final bool counter = widget.showCounter;
    final Widget container = _LabelReserve(
      // TXF-13: an outlined field's floated label keeps its last line on the edge; the room for
      // the lines above it is reserved above the container (outside its target and glow).
      labelText: outlined ? labelText : const _LabelText.none(),
      inset:
          size.containerPaddingInline +
          (widget.trailingIcon == null
              ? size.containerPaddingInline
              : size.containerPaddingInlineWithIcon),
      floatedLine: floatedLine,
      child: MouseRegion(
        cursor: widget.enabled ? SystemMouseCursors.text : MouseCursor.defer,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        // TXF-8: the minimum target; a press anywhere on the field focuses the input.
        child: TanreiTapTarget(
          child: _gestures.buildGestureDetector(
            behavior: HitTestBehavior.translucent,
            child: TanreiFocusRing(
              visible: glow,
              borderRadius: BorderRadius.circular(tokens.containerShape),
              child: field,
            ),
          ),
        ),
      ),
    );

    final double inputStart = (widget.leadingIcon == null
        ? size.containerPaddingInline
        : size.containerPaddingInlineWithIcon + size.iconSize + size.containerGap);
    final TextStyle supportingStyle = tokens.supportingTextTypescale.toTextStyle(
      color: visuals.supportingText,
    );
    final Widget? supportingRow = shown.isEmpty && !counter
        ? null
        : ExcludeSemantics(
            child: Padding(
              padding: EdgeInsetsDirectional.only(
                top: tokens.supportingTextGap,
                start: inputStart,
                end: size.containerPaddingInline,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: size.containerGap,
                children: <Widget>[
                  Expanded(child: Text(shown, style: supportingStyle)),
                  if (counter)
                    Text(
                      _counterText,
                      style: tokens.supportingTextTypescale.toTextStyle(color: visuals.counter),
                      maxLines: 1,
                      softWrap: false,
                    ),
                ],
              ),
            ),
          );

    // TXF-11, TXF-15, TXF-19, TXF-23: the label is the name (drawn or not, never the placeholder);
    // the shown affixes, the shown supporting or error text and the count are the description.
    // TXF-15: while shown, the prefix and suffix are read with the value (a unit, a currency).
    final String affixes = affixesShown
        ? <String>[widget.prefixText, widget.suffixText].where((String a) => a.isNotEmpty).join(' ')
        : '';
    final String description = <String>[
      if (affixes.isNotEmpty) affixes,
      if (shown.isNotEmpty) shown,
      if (counter) _counterText,
    ].join('\n');

    return Semantics(
      container: true,
      label: widget.labelText,
      hint: description.isEmpty ? null : description,
      enabled: widget.enabled,
      validationResult: error ? SemanticsValidationResult.invalid : SemanticsValidationResult.none,
      isRequired: widget.isRequired ? true : null,
      // A search box where the platform has one (Flutter 3.32 has no search-box role yet).
      inputType: widget.type == TanreiTextFieldType.search ? SemanticsInputType.search : null,
      maxValueLength: widget.maxLength > 0 ? widget.maxLength : null,
      currentValueLength: widget.maxLength > 0 ? _count : null,
      onTap: widget.enabled ? _requestFocus : null,
      onFocus: widget.enabled ? _requestFocus : null,
      // TXF-5: not focusable, not editable, no events.
      child: ExcludeFocus(
        excluding: !widget.enabled,
        child: IgnorePointer(
          ignoring: !widget.enabled,
          child: Opacity(
            opacity: visuals.opacity,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[container, ?supportingRow],
            ),
          ),
        ),
      ),
    );
  }

  void _requestFocus() {
    if (!_editing.selection.isValid) {
      _editing.selection = TextSelection.collapsed(offset: _editing.text.length);
    }
    editableTextKey.currentState?.requestKeyboard();
  }
}

/// The geometry of a field that does not depend on its children's sizes.
@immutable
class _FieldGeometry {
  const _FieldGeometry({
    required this.padTop,
    required this.padBottom,
    required this.minHeight,
    required this.paddingInline,
    required this.paddingInlineWithIcon,
    required this.gap,
    required this.firstLine,
    required this.floatedLine,
    required this.float,
    required this.labelOnEdge,
    required this.restCentred,
    required this.notchPadding,
  });

  /// Above the input (a filled field with a label: the floated label's band as well).
  final double padTop;
  final double padBottom;
  final double minHeight;
  final double paddingInline;
  final double paddingInlineWithIcon;
  final double gap;

  /// The height of one input line: icons and a resting label align with it.
  final double firstLine;

  /// The height of one line of the floated label.
  final double floatedLine;

  /// 0 = the label rests in the input line, 1 = it is floated.
  final double float;

  /// Whether the label floats onto the outline's top edge (an outlined field).
  final bool labelOnEdge;

  /// Whether the resting label is centred in the container rather than in the first input line.
  final bool restCentred;
  final double notchPadding;

  @override
  bool operator ==(Object other) =>
      other is _FieldGeometry &&
      other.padTop == padTop &&
      other.padBottom == padBottom &&
      other.minHeight == minHeight &&
      other.paddingInline == paddingInline &&
      other.paddingInlineWithIcon == paddingInlineWithIcon &&
      other.gap == gap &&
      other.firstLine == firstLine &&
      other.floatedLine == floatedLine &&
      other.float == float &&
      other.labelOnEdge == labelOnEdge &&
      other.restCentred == restCentred &&
      other.notchPadding == notchPadding;

  @override
  int get hashCode => Object.hash(
    padTop,
    padBottom,
    minHeight,
    paddingInline,
    paddingInlineWithIcon,
    gap,
    firstLine,
    floatedLine,
    float,
    labelOnEdge,
    restCentred,
    notchPadding,
  );
}

/// What the field's container paints: fill, outline (with its gap) and active indicator.
@immutable
class _FieldPaint {
  const _FieldPaint({
    required this.container,
    required this.outline,
    required this.outlineWidth,
    required this.activeIndicator,
    required this.activeIndicatorWidth,
    required this.shape,
    required this.bottomRadius,
  });

  final Color container;
  final Color outline;
  final double outlineWidth;
  final Color activeIndicator;
  final double activeIndicatorWidth;

  /// The top corners (and the smoothing of all four).
  final TanreiCornerShape shape;
  final double bottomRadius;

  /// The container's outline in [rect]: the top corners of [shape], the bottom corners of
  /// [bottomRadius].
  Path pathOf(Rect rect) {
    if (bottomRadius == shape.radius) {
      return shape.path(rect);
    }
    final TanreiCornerShape bottom = TanreiCornerShape(
      smoothing: shape.smoothing,
      radius: bottomRadius,
    );
    return Path.combine(
      PathOperation.intersect,
      shape.path(Rect.fromLTRB(rect.left, rect.top, rect.right, rect.bottom + shape.radius)),
      bottom.path(Rect.fromLTRB(rect.left, rect.top - bottomRadius, rect.right, rect.bottom)),
    );
  }

  @override
  bool operator ==(Object other) =>
      other is _FieldPaint &&
      other.container == container &&
      other.outline == outline &&
      other.outlineWidth == outlineWidth &&
      other.activeIndicator == activeIndicator &&
      other.activeIndicatorWidth == activeIndicatorWidth &&
      other.shape == shape &&
      other.bottomRadius == bottomRadius;

  @override
  int get hashCode => Object.hash(
    container,
    outline,
    outlineWidth,
    activeIndicator,
    activeIndicatorWidth,
    shape,
    bottomRadius,
  );
}

enum _FieldSlot { leading, input, trailing, label }

/// The label as it is drawn at rest and floated (TXF-13), for measuring how many lines it takes,
/// and the labels of the peers it makes room for ([TanreiFieldLabelRoom]), drawn alike.
@immutable
class _LabelText {
  const _LabelText({
    required this.resting,
    required this.floated,
    required this.textScaler,
    this.textHeightBehavior,
    this.room = const <(TextSpan, TextSpan)>[],
  });

  /// No label is drawn.
  const _LabelText.none()
    : resting = null,
      floated = null,
      textScaler = TextScaler.noScaling,
      textHeightBehavior = null,
      room = const <(TextSpan, TextSpan)>[];

  final TextSpan? resting;
  final TextSpan? floated;
  final TextScaler textScaler;
  final TextHeightBehavior? textHeightBehavior;

  /// The peers' labels, resting and floated: the field is as tall as the tallest of them needs.
  final List<(TextSpan resting, TextSpan floated)> room;

  @override
  bool operator ==(Object other) =>
      other is _LabelText &&
      other.resting == resting &&
      other.floated == floated &&
      other.textScaler == textScaler &&
      other.textHeightBehavior == textHeightBehavior &&
      listEquals(other.room, room);

  @override
  int get hashCode =>
      Object.hash(resting, floated, textScaler, textHeightBehavior, Object.hashAll(room));
}

/// How tall a label is, and in how many lines, in a given width.
typedef _LabelLines = ({double height, int lines});

/// Measures a [_LabelText] (never paints it).
class _LabelMeasure {
  _LabelMeasure(this._text, TextDirection textDirection)
    : _resting = _painter(_text.resting, _text, textDirection),
      _floated = _painter(_text.floated, _text, textDirection) {
    _syncRoom(textDirection);
  }

  _LabelText _text;
  final TextPainter _resting;
  final TextPainter _floated;

  /// The peers' labels, resting and floated.
  final List<(TextPainter, TextPainter)> _room = <(TextPainter, TextPainter)>[];

  static TextPainter _painter(TextSpan? span, _LabelText text, TextDirection direction) =>
      TextPainter(
        text: span,
        textDirection: direction,
        textScaler: text.textScaler,
        textHeightBehavior: text.textHeightBehavior,
      );

  void _syncRoom(TextDirection textDirection) {
    while (_room.length > _text.room.length) {
      final (TextPainter resting, TextPainter floated) = _room.removeLast();
      resting.dispose();
      floated.dispose();
    }
    for (int i = 0; i < _text.room.length; i++) {
      final (TextSpan resting, TextSpan floated) = _text.room[i];
      if (i < _room.length) {
        for (final (TextPainter painter, TextSpan span) in <(TextPainter, TextSpan)>[
          (_room[i].$1, resting),
          (_room[i].$2, floated),
        ]) {
          painter
            ..text = span
            ..textDirection = textDirection
            ..textScaler = _text.textScaler
            ..textHeightBehavior = _text.textHeightBehavior;
        }
      } else {
        _room.add((
          _painter(resting, _text, textDirection),
          _painter(floated, _text, textDirection),
        ));
      }
    }
  }

  /// Takes [value]; true when that changes a measurement.
  bool update(_LabelText value, TextDirection textDirection) {
    final bool changed =
        value != _text ||
        textDirection != _resting.textDirection ||
        textDirection != _floated.textDirection;
    if (!changed) {
      return false;
    }
    _text = value;
    for (final (TextPainter painter, TextSpan? span) in <(TextPainter, TextSpan?)>[
      (_resting, value.resting),
      (_floated, value.floated),
    ]) {
      painter
        ..text = span
        ..textDirection = textDirection
        ..textScaler = value.textScaler
        ..textHeightBehavior = value.textHeightBehavior;
    }
    _syncRoom(textDirection);
    return true;
  }

  static _LabelLines _measure(TextPainter painter, double width) {
    if (painter.text == null) {
      return (height: 0, lines: 0);
    }
    painter.layout(maxWidth: math.max(0, width));
    return (height: painter.height, lines: painter.computeLineMetrics().length);
  }

  /// This field's own label.
  _LabelLines resting(double width) => _measure(_resting, width);
  _LabelLines floated(double width) => _measure(_floated, width);

  /// The most that this field's label or a peer's (drawn in this field, [width] wide) needs:
  /// [need] of each one's lines. 0 without a label.
  double mostNeeded(
    double width,
    double Function(_LabelLines lines) need, {
    required bool floated,
  }) {
    double most = _resting.text == null ? 0 : need(floated ? this.floated(width) : resting(width));
    for (final (TextPainter r, TextPainter f) in _room) {
      most = math.max(most, need(_measure(floated ? f : r, width)));
    }
    return most;
  }

  void dispose() {
    _resting.dispose();
    _floated.dispose();
    for (final (TextPainter resting, TextPainter floated) in _room) {
      resting.dispose();
      floated.dispose();
    }
  }
}

/// TXF-13: reserves room above an outlined field's container for the lines of its floated label
/// above the last, which sits on the outline's top edge — resting and floated alike, so that the
/// field does not change height when the label floats. Nothing is reserved for a label that fits
/// on one line, or when no label is drawn.
class _LabelReserve extends SingleChildRenderObjectWidget {
  const _LabelReserve({
    required this.labelText,
    required this.inset,
    required this.floatedLine,
    required Widget super.child,
  });

  final _LabelText labelText;

  /// The room the floated label does not get: from its start and from the end.
  final double inset;

  /// The height of one line of the floated label.
  final double floatedLine;

  @override
  _RenderLabelReserve createRenderObject(BuildContext context) => _RenderLabelReserve(
    measure: _LabelMeasure(labelText, Directionality.of(context)),
    inset: inset,
    floatedLine: floatedLine,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderLabelReserve renderObject) {
    renderObject
      ..labelText = (labelText, Directionality.of(context))
      ..inset = inset
      ..floatedLine = floatedLine;
  }
}

class _RenderLabelReserve extends RenderShiftedBox {
  _RenderLabelReserve({
    required _LabelMeasure measure,
    required double inset,
    required double floatedLine,
  }) : _measure = measure,
       _inset = inset,
       _floatedLine = floatedLine,
       super(null);

  final _LabelMeasure _measure;

  set labelText((_LabelText, TextDirection) value) {
    if (_measure.update(value.$1, value.$2)) {
      markNeedsLayout();
    }
  }

  double _inset;
  set inset(double value) {
    if (value != _inset) {
      _inset = value;
      markNeedsLayout();
    }
  }

  double _floatedLine;
  set floatedLine(double value) {
    if (value != _floatedLine) {
      _floatedLine = value;
      markNeedsLayout();
    }
  }

  /// The room above the container for a field [width] wide: for its own label, or a peer's
  /// that needs more ([TanreiFieldLabelRoom]).
  double _reserveFor(double width) => _measure.mostNeeded(
    width - _inset,
    (_LabelLines floated) => floated.lines < 2 ? 0 : math.max(0, floated.height - _floatedLine),
    floated: true,
  );

  double _widthIn(BoxConstraints constraints) => constraints.hasBoundedWidth
      ? constraints.maxWidth
      : child?.getMaxIntrinsicWidth(double.infinity) ?? 0;

  @override
  double computeMinIntrinsicHeight(double width) =>
      _reserveFor(width) + (child?.getMinIntrinsicHeight(width) ?? 0);

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _reserveFor(width) + (child?.getMaxIntrinsicHeight(width) ?? 0);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final RenderBox? child = this.child;
    if (child == null) {
      return constraints.smallest;
    }
    final double reserve = _reserveFor(_widthIn(constraints));
    final Size size = child.getDryLayout(constraints.deflate(EdgeInsets.only(top: reserve)));
    return constraints.constrain(Size(size.width, size.height + reserve));
  }

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    final double reserve = _reserveFor(_widthIn(constraints));
    child.layout(constraints.deflate(EdgeInsets.only(top: reserve)), parentUsesSize: true);
    (child.parentData! as BoxParentData).offset = Offset(0, reserve);
    size = constraints.constrain(Size(child.size.width, child.size.height + reserve));
  }

  @override
  void dispose() {
    _measure.dispose();
    super.dispose();
  }
}

/// Lays out a field's container — the icons, the input line and the label — and paints its fill,
/// outline and active indicator (TXF-13, TXF-16).
class _FieldLayout extends SlottedMultiChildRenderObjectWidget<_FieldSlot, RenderBox> {
  const _FieldLayout({
    required this.geometry,
    required this.paint,
    required this.labelText,
    this.leading,
    required this.input,
    this.trailing,
    this.label,
  });

  final _FieldGeometry geometry;
  final _FieldPaint paint;

  /// The label at rest and floated, measured to make room for a label that wraps (TXF-13).
  final _LabelText labelText;
  final Widget? leading;
  final Widget input;
  final Widget? trailing;
  final Widget? label;

  @override
  Iterable<_FieldSlot> get slots => _FieldSlot.values;

  @override
  Widget? childForSlot(_FieldSlot slot) => switch (slot) {
    _FieldSlot.leading => leading,
    _FieldSlot.input => input,
    _FieldSlot.trailing => trailing,
    _FieldSlot.label => label,
  };

  @override
  _RenderField createRenderObject(BuildContext context) => _RenderField(
    geometry: geometry,
    fieldPaint: paint,
    textDirection: Directionality.of(context),
    measure: _LabelMeasure(labelText, Directionality.of(context)),
  );

  @override
  void updateRenderObject(BuildContext context, _RenderField renderObject) {
    renderObject
      ..geometry = geometry
      ..fieldPaint = paint
      ..textDirection = Directionality.of(context)
      ..labelText = labelText;
  }
}

class _RenderField extends RenderBox
    with SlottedContainerRenderObjectMixin<_FieldSlot, RenderBox>, TanreiFieldContainerBox {
  _RenderField({
    required _FieldGeometry geometry,
    required _FieldPaint fieldPaint,
    required TextDirection textDirection,
    required _LabelMeasure measure,
  }) : _geometry = geometry,
       _fieldPaint = fieldPaint,
       _textDirection = textDirection,
       _measure = measure;

  final _LabelMeasure _measure;

  set labelText(_LabelText value) {
    if (_measure.update(value, _textDirection)) {
      markNeedsLayout();
    }
  }

  @override
  void dispose() {
    _measure.dispose();
    super.dispose();
  }

  _FieldGeometry get geometry => _geometry;
  _FieldGeometry _geometry;
  set geometry(_FieldGeometry value) {
    if (value != _geometry) {
      _geometry = value;
      markNeedsLayout();
    }
  }

  _FieldPaint get fieldPaint => _fieldPaint;
  _FieldPaint _fieldPaint;
  set fieldPaint(_FieldPaint value) {
    if (value != _fieldPaint) {
      _fieldPaint = value;
      markNeedsPaint();
    }
  }

  TextDirection get textDirection => _textDirection;
  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      _measure.update(_measure._text, value);
      markNeedsLayout();
    }
  }

  RenderBox? get _leading => childForSlot(_FieldSlot.leading);
  RenderBox get _input => childForSlot(_FieldSlot.input)!;
  RenderBox? get _trailing => childForSlot(_FieldSlot.trailing);
  RenderBox? get _label => childForSlot(_FieldSlot.label);

  /// Where the input line's top is, and the gap in the outline for the floated label, from the last
  /// layout.
  double _inputTop = 0;
  Rect? _notch;

  double _startPad() => _leading == null ? geometry.paddingInline : geometry.paddingInlineWithIcon;
  double _endPad() => _trailing == null ? geometry.paddingInline : geometry.paddingInlineWithIcon;

  /// The logical x of the input and its width, for a container [width] wide.
  ({double start, double width}) _inputSpan(double width) {
    final double leading = _leading == null
        ? 0
        : _leading!.getMaxIntrinsicWidth(double.infinity) + geometry.gap;
    final double trailing = _trailing == null
        ? 0
        : _trailing!.getMaxIntrinsicWidth(double.infinity) + geometry.gap;
    final double start = _startPad() + leading;
    return (start: start, width: math.max(0, width - start - trailing - _endPad()));
  }

  /// The start of the floated label: an outlined field floats it over the outline, from the
  /// text's padding; a filled one keeps it over the input.
  double _floatStart(double inputStart) =>
      geometry.labelOnEdge ? geometry.paddingInline : inputStart;

  /// TXF-13: what a label that wraps needs of a container [width] wide whose input starts at
  /// [inputStart]. [band] is how much taller than one line a filled field's floated label is (its
  /// band above the input grows by that); [resting] is the height a wrapped resting label needs of
  /// the container, 0 for one line. The field holds both positions at once, so that it does not
  /// change height when the label floats (TXF-13, TXF-16). [band] and [resting] are the most that
  /// its own label or a peer's needs ([TanreiFieldLabelRoom]); [restWraps] and [floatWraps] are
  /// its own label's, which is the one drawn.
  ({double band, double resting, bool restWraps, bool floatWraps}) _labelNeeds(
    double width,
    double inputStart,
  ) {
    final double end = _endPad();
    final double restWidth = width - inputStart - end;
    final double floatWidth = width - _floatStart(inputStart) - end;
    return (
      band: geometry.labelOnEdge
          ? 0
          : _measure.mostNeeded(
              floatWidth,
              (_LabelLines floated) =>
                  floated.lines > 1 ? math.max(0, floated.height - geometry.floatedLine) : 0,
              floated: true,
            ),
      resting: _measure.mostNeeded(
        restWidth,
        (_LabelLines rest) => rest.lines > 1 ? rest.height + 2 * geometry.padBottom : 0,
        floated: false,
      ),
      restWraps: _measure.resting(restWidth).lines > 1,
      floatWraps: _measure.floated(floatWidth).lines > 1,
    );
  }

  double _heightFor(double inputHeight, double width, double inputStart) {
    final ({double band, double resting, bool restWraps, bool floatWraps}) needs = _labelNeeds(
      width,
      inputStart,
    );
    return math.max(
      math.max(geometry.minHeight + needs.band, needs.resting),
      geometry.padTop + needs.band + inputHeight + geometry.padBottom,
    );
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      _intrinsicWidth((RenderBox child) => child.getMinIntrinsicWidth(double.infinity));

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _intrinsicWidth((RenderBox child) => child.getMaxIntrinsicWidth(double.infinity));

  double _intrinsicWidth(double Function(RenderBox child) of) =>
      _startPad() +
      (_leading == null ? 0 : of(_leading!) + geometry.gap) +
      of(_input) +
      (_trailing == null ? 0 : of(_trailing!) + geometry.gap) +
      _endPad();

  @override
  double computeMinIntrinsicHeight(double width) {
    final ({double start, double width}) span = _inputSpan(width);
    return _heightFor(_input.getMinIntrinsicHeight(span.width), width, span.start);
  }

  @override
  double computeMaxIntrinsicHeight(double width) {
    final ({double start, double width}) span = _inputSpan(width);
    return _heightFor(_input.getMaxIntrinsicHeight(span.width), width, span.start);
  }

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final double width = constraints.hasBoundedWidth
        ? constraints.maxWidth
        : computeMaxIntrinsicWidth(double.infinity);
    final ({double start, double width}) span = _inputSpan(width);
    final Size input = _input.getDryLayout(BoxConstraints.tightFor(width: span.width));
    return constraints.constrain(Size(width, _heightFor(input.height, width, span.start)));
  }

  @override
  double? computeDistanceToActualBaseline(TextBaseline baseline) {
    final double? inputBaseline = _input.getDistanceToActualBaseline(baseline);
    return inputBaseline == null ? null : _inputTop + inputBaseline;
  }

  /// The physical x of a child [childWidth] wide whose logical start is [start].
  double _x(double start, double childWidth) =>
      textDirection == TextDirection.ltr ? start : size.width - start - childWidth;

  @override
  void performLayout() {
    final BoxConstraints constraints = this.constraints;
    final double width = constraints.hasBoundedWidth
        ? constraints.maxWidth
        : computeMaxIntrinsicWidth(double.infinity);
    final BoxConstraints loose = BoxConstraints(maxWidth: width);
    _leading?.layout(loose, parentUsesSize: true);
    _trailing?.layout(loose, parentUsesSize: true);
    final double leadingWidth = _leading == null ? 0 : _leading!.size.width + geometry.gap;
    final double trailingWidth = _trailing == null ? 0 : _trailing!.size.width + geometry.gap;
    final double inputStart = _startPad() + leadingWidth;
    final double inputWidth = math.max(0, width - inputStart - trailingWidth - _endPad());
    final RenderBox input = _input
      ..layout(BoxConstraints.tightFor(width: inputWidth), parentUsesSize: true);

    // TXF-13: a label that wraps grows the field — a filled field's band above the input for its
    // floated lines, the container for its resting lines — in both positions (TXF-16).
    final ({double band, double resting, bool restWraps, bool floatWraps}) needs = _labelNeeds(
      width,
      inputStart,
    );
    final double padTop = geometry.padTop + needs.band;
    final double natural = padTop + input.size.height + geometry.padBottom;
    size = constraints.constrain(
      Size(width, math.max(math.max(geometry.minHeight + needs.band, needs.resting), natural)),
    );
    recordContainerSize();
    // Taller than its content (the minimum height): the content is centred.
    final double inputTop = padTop + math.max(0, size.height - natural) / 2;
    _inputTop = inputTop;
    _parentData(input).offset = Offset(_x(inputStart, inputWidth), inputTop);

    // Icons align with the first line (TXF-17).
    double centreOnFirstLine(RenderBox child) =>
        inputTop + (geometry.firstLine - child.size.height) / 2;
    if (_leading case final RenderBox leading) {
      _parentData(leading).offset = Offset(
        _x(_startPad(), leading.size.width),
        centreOnFirstLine(leading),
      );
    }
    if (_trailing case final RenderBox trailing) {
      _parentData(trailing).offset = Offset(
        _x(width - _endPad() - trailing.size.width, trailing.size.width),
        centreOnFirstLine(trailing),
      );
    }

    _notch = null;
    if (_label case final RenderBox label) {
      final double t = geometry.float;
      final double start = lerpDouble(inputStart, _floatStart(inputStart), t)!;
      label.layout(
        BoxConstraints(maxWidth: math.max(0, width - start - _endPad())),
        parentUsesSize: true,
      );
      final double h = label.size.height;
      // A resting label that wraps is centred in the container, which has grown to hold it.
      final double rest = geometry.restCentred || needs.restWraps
          ? (size.height - h) / 2
          : centreOnFirstLine(label);
      final double band = geometry.floatedLine + needs.band;
      final double floated = geometry.labelOnEdge
          ? needs.floatWraps
                // Its last line centred on the outline's top edge, the lines above it in the room
                // reserved above the container.
                ? fieldPaint.outlineWidth / 2 + geometry.floatedLine / 2 - h
                // Centred on the outline's top edge.
                : fieldPaint.outlineWidth / 2 - h / 2
          // In the band above the input line.
          : inputTop - band + (band - h) / 2;
      final double x = _x(start, label.size.width);
      _parentData(label).offset = Offset(x, lerpDouble(rest, floated, t)!);
      if (geometry.labelOnEdge && t > 0) {
        // The gap opens from the label's centre (TXF-14), as wide as its widest line (TXF-13).
        final double gap = (label.size.width + 2 * geometry.notchPadding) * t;
        final double centre = x + label.size.width / 2;
        _notch = Rect.fromLTRB(
          centre - gap / 2,
          -h,
          centre + gap / 2,
          math.min(h, geometry.floatedLine),
        );
      }
    }
  }

  BoxParentData _parentData(RenderBox child) => child.parentData! as BoxParentData;

  /// What the container paints and where the label is, for tests and the inspector.
  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ColorProperty('container', fieldPaint.container))
      ..add(ColorProperty('outline', fieldPaint.outline))
      ..add(DoubleProperty('outlineWidth', fieldPaint.outlineWidth))
      ..add(ColorProperty('activeIndicator', fieldPaint.activeIndicator))
      ..add(DoubleProperty('activeIndicatorWidth', fieldPaint.activeIndicatorWidth))
      ..add(DiagnosticsProperty<TanreiCornerShape>('shape', fieldPaint.shape))
      ..add(DoubleProperty('bottomRadius', fieldPaint.bottomRadius))
      ..add(DoubleProperty('float', geometry.float))
      ..add(FlagProperty('labelOnEdge', value: geometry.labelOnEdge, ifTrue: 'label on edge'))
      ..add(DiagnosticsProperty<Rect>('notch', _notch, defaultValue: null));
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final Canvas canvas = context.canvas;
    final Rect rect = offset & size;
    final _FieldPaint p = fieldPaint;
    final bool fill = p.container.a > 0;
    final bool indicator = p.activeIndicator.a > 0 && p.activeIndicatorWidth > 0;
    if (fill || indicator) {
      final Path path = p.pathOf(rect);
      if (fill) {
        canvas.drawPath(path, Paint()..color = p.container);
      }
      if (indicator) {
        // Along the bottom, inside the container's corners.
        canvas
          ..save()
          ..clipPath(path)
          ..drawRect(
            Rect.fromLTRB(rect.left, rect.bottom - p.activeIndicatorWidth, rect.right, rect.bottom),
            Paint()..color = p.activeIndicator,
          )
          ..restore();
      }
    }
    if (p.outline.a > 0 && p.outlineWidth > 0) {
      canvas.save();
      if (_notch case final Rect notch) {
        canvas.clipRect(notch.shift(offset), clipOp: ClipOp.difference);
      }
      p.shape.paintBand(canvas, rect, Paint()..color = p.outline, inner: -p.outlineWidth, outer: 0);
      canvas.restore();
    }
    for (final RenderBox child in <RenderBox?>[_leading, _input, _trailing, _label].nonNulls) {
      context.paintChild(child, offset + _parentData(child).offset);
    }
  }

  @override
  bool hitTestSelf(Offset position) => true;

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final RenderBox child in <RenderBox?>[_trailing, _input, _leading].nonNulls) {
      final Offset childOffset = _parentData(child).offset;
      if (result.addWithPaintOffset(
        offset: childOffset,
        position: position,
        hitTest: (BoxHitTestResult result, Offset transformed) =>
            child.hitTest(result, position: transformed),
      )) {
        return true;
      }
    }
    return false;
  }
}

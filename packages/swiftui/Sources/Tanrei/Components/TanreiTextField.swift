import SwiftUI

#if os(iOS)
import UIKit
#endif

// Spec: specs/text-field.spec.json — tokens: TanreiTextFieldTokens (comp.text-field), read from the design system in the
// environment (`system.textField`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. Text entry happens in SwiftUI's own `TextField` / `SecureField`: IME,
// autofill, selection and the clipboard are the platform's. The field answers focus with its edge: the focused
// outline or active indicator is its focus indicator, and it draws no focus ring (TXF-7).

// `variant` is a `TanreiTextFieldVariant` (filled, outlined — the default) and `size` a `TanreiTextFieldSize` (medium —
// the default —, large: the heights of Button's medium and large). Both are generated open keys: TXF-9, a value
// the current design system does not have draws the default value's tokens and is reported in debug builds.

/// What the value of a text field is (TXF-20): it chooses the keyboard, autocorrection, obscured entry and semantics. The
/// value is a `String` for every type. A closed set: `TanreiTextFieldType(named:)` reads a spec name from data, and an
/// unknown one is `.text`, reported in debug builds (TXF-9).
public enum TanreiTextFieldType: String, CaseIterable, Sendable {
  case text, email, password, number, search, tel, url

  /// The type a spec name (`"email"` …) stands for; an unknown name is `.text`, reported in debug builds (TXF-9).
  public init(named name: String) {
    if let type = TanreiTextFieldType(rawValue: name) {
      self = type
    } else {
      TanreiDiagnostics.report("Tanrei: a text field has no type \"\(name)\"; it behaves as \"text\" (TXF-9).")
      self = .text
    }
  }

  /// TXF-24: the values of these types read left to right in every layout direction.
  var readsLeftToRight: Bool {
    switch self {
    case .email, .url, .tel, .number, .password: return true
    case .text, .search: return false
    }
  }
}

/// A single- or multi-line field for text the user types, with a label, help and an error.
///
///     @State private var email = ""
///     TanreiTextField("Email", text: $email, type: .email, textContentType: "email")
///     TanreiTextField("Email", text: $email, supportingText: "We only use it to sign you in.")
///     TanreiTextField("Email", text: $email, errorText: "Enter a complete email address.", error: !isValid)
///     TanreiTextField("Amount", text: $amount, type: .number, prefix: "$", suffix: "USD")
///     TanreiTextField("Message", text: $message, axis: .vertical, lineLimit: 3...8)
///     TanreiTextField("Search", text: $query, prompt: Text("Search components"), type: .search) {
///       Image(systemName: "magnifyingglass")
///     } trailingIcon: {
///       TanreiIconButton("Clear", action: { query = "" }) { Image(systemName: "xmark") }
///     }
///     .labelsHidden()
///     TanreiTextField("Search", text: $query, type: .search, onSubmit: search)   // the spec's `action`
///
/// Every edit writes `text` — that is the spec's `input`; a value the product writes is shown and emits nothing.
/// `onCommit` (the spec's `change`) is called when focus leaves the field, or the action key is pressed, with a value that
/// differs from the one last committed. `onSubmit` is the action key of a single-line field (the spec's `action`), called
/// after that commit; an enclosing `.onSubmit` modifier fires as well, but SwiftUI runs it before the field's commit. `disabled` follows
/// `.disabled(_:)`; `.labelsHidden()` hides the drawn label (honoured from iOS 18 / macOS 15), which stays the name.
public struct TanreiTextField<LeadingIcon: View, TrailingIcon: View>: View {
  let title: TanreiControlTitle
  let text: Binding<String>
  let options: TanreiTextFieldOptions
  let leadingIcon: LeadingIcon
  let trailingIcon: TrailingIcon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.tanreiStaticTextInput) private var staticInput
  @Environment(\.tanreiTextFieldLabelRoom) private var labelRoom
  @TanreiPalette private var colors
  @FocusState private var isFocused: Bool
  @State private var isHovered = false
  /// What the platform's text element holds: the value as the user edits it, before `maxLength`.
  @State private var draft: String
  /// The value last committed (TXF-2): when the field gained focus, or at the last `onCommit`.
  @State private var committed: String
  /// Whether the user has edited since the field appeared: the count is announced only after an edit (TXF-19).
  @State private var hasEdited = false

  init(title: TanreiControlTitle, text: Binding<String>, options: TanreiTextFieldOptions, leadingIcon: LeadingIcon, trailingIcon: TrailingIcon) {
    // TXF-17: a password stays single-line.
    if options.type == .password && options.axis == .vertical {
      TanreiDiagnostics.report("Tanrei: a password text field cannot be multi-line; it stays single-line (TXF-17).")
    }
    self.title = title
    self.text = text
    self.options = options
    self.leadingIcon = leadingIcon
    self.trailingIcon = trailingIcon
    _draft = State(initialValue: text.wrappedValue)
    _committed = State(initialValue: text.wrappedValue)
  }

  /// A field named by `label`, with icons in its leading and trailing slots (`EmptyView()` for none).
  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, prompt: Text? = nil, variant: TanreiTextFieldVariant = .outlined, size: TanreiTextFieldSize = .medium,
    type: TanreiTextFieldType = .text, supportingText: String = "", errorText: String = "", error: Bool = false, readOnly: Bool = false,
    required: Bool = false, axis: Axis = .horizontal, lineLimit: ClosedRange<Int>? = nil, maxLength: Int = 0, counter: Bool = false,
    prefix: String = "", suffix: String = "", textContentType: String? = nil, onCommit: (@MainActor (String) -> Void)? = nil,
    onSubmit: (@MainActor () -> Void)? = nil,
    @ViewBuilder leadingIcon: () -> LeadingIcon, @ViewBuilder trailingIcon: () -> TrailingIcon
  ) {
    self.init(
      title: TanreiControlTitle(label, component: "text field", behavior: "TXF-23"), text: text,
      options: TanreiTextFieldOptions(
        prompt: prompt, variant: variant, size: size, type: type, supportingText: supportingText, errorText: errorText, error: error,
        readOnly: readOnly, required: required, axis: axis, lineLimit: lineLimit, maxLength: maxLength, counter: counter, prefix: prefix,
        suffix: suffix, textContentType: textContentType, onCommit: onCommit, onSubmit: onSubmit),
      leadingIcon: leadingIcon(), trailingIcon: trailingIcon())
  }

  /// A field named by a localized label, with icons.
  public init(
    _ labelKey: LocalizedStringKey, text: Binding<String>, prompt: Text? = nil, variant: TanreiTextFieldVariant = .outlined,
    size: TanreiTextFieldSize = .medium, type: TanreiTextFieldType = .text, supportingText: String = "", errorText: String = "", error: Bool = false,
    readOnly: Bool = false, required: Bool = false, axis: Axis = .horizontal, lineLimit: ClosedRange<Int>? = nil, maxLength: Int = 0,
    counter: Bool = false, prefix: String = "", suffix: String = "", textContentType: String? = nil, onCommit: (@MainActor (String) -> Void)? = nil,
    onSubmit: (@MainActor () -> Void)? = nil,
    @ViewBuilder leadingIcon: () -> LeadingIcon, @ViewBuilder trailingIcon: () -> TrailingIcon
  ) {
    self.init(
      title: TanreiControlTitle(labelKey, component: "text field", behavior: "TXF-23"), text: text,
      options: TanreiTextFieldOptions(
        prompt: prompt, variant: variant, size: size, type: type, supportingText: supportingText, errorText: errorText, error: error,
        readOnly: readOnly, required: required, axis: axis, lineLimit: lineLimit, maxLength: maxLength, counter: counter, prefix: prefix,
        suffix: suffix, textContentType: textContentType, onCommit: onCommit, onSubmit: onSubmit),
      leadingIcon: leadingIcon(), trailingIcon: trailingIcon())
  }

  public var body: some View {
    TanreiLabelsVisibilityReader { labelsHidden in
      content(labelDrawn: title.drawn(labelsHidden: labelsHidden) != nil)
    }
  }

  // MARK: Behaviour

  /// TXF-6 / TXF-5 / TXF-10: one state — disabled, else focused (by keyboard, pointer or touch) over hovered. A read-only
  /// field is drawn as an enabled one.
  var state: TanreiInteraction {
    TanreiTextFieldBehavior.state(isEnabled: isEnabled, isFocused: isFocused, isHovered: isHovered)
  }

  /// The text element's binding (TXF-1): every edit it writes is emitted as it is written. Not from
  /// `onChange(of: draft)` alone: that runs once per update of the view, with the last of the edits made since the one
  /// before, so two keys that arrive between two updates would write `text` once (typing "ab" would emit one
  /// input on a loaded machine).
  private var draftBinding: Binding<String> {
    Binding(
      get: { draft },
      set: { newDraft in
        guard newDraft != draft else { return }
        draft = newDraft
        emitInput(TanreiTextFieldBehavior.limit(newDraft, previous: text.wrappedValue, maxLength: options.maxLength))
      })
  }

  /// A new draft, once the view has updated with it (TXF-18): the draft is corrected when the limit refused part of it
  /// — after the element has shown it, so that the element takes the correction. Its input was emitted when the element
  /// wrote it (`draftBinding`); a draft the product set (`text` changed) emits nothing, as it equals `text`.
  private func draftChanged(to newDraft: String) {
    let limited = TanreiTextFieldBehavior.limit(newDraft, previous: text.wrappedValue, maxLength: options.maxLength)
    if limited != newDraft { draft = limited }
    emitInput(limited)
  }

  /// TXF-1 / TXF-5 / TXF-10: `value` written to `text` once when it differs, and only by an enabled, editable field.
  private func emitInput(_ value: String) {
    guard value != text.wrappedValue, isEnabled, !options.readOnly else { return }
    hasEdited = true
    text.wrappedValue = value
  }

  /// TXF-3: the action key of a single-line field commits, then emits the action; a multi-line field inserts a line
  /// break instead and emits nothing.
  private func submit() {
    guard !options.isMultiline else { return }
    commit()
    options.onSubmit?()
  }

  /// TXF-2: `onCommit` once, with a value different from the one last committed.
  private func commit() {
    guard TanreiTextFieldBehavior.shouldCommit(value: text.wrappedValue, committed: committed) else { return }
    committed = text.wrappedValue
    options.onCommit?(text.wrappedValue)
  }

  // MARK: Drawing

  private func content(labelDrawn: Bool) -> AnyView {
    let tokens = system.textField
    let state = self.state
    let appearance = TanreiTextFieldAppearance(tokens: tokens, variant: options.variant, size: options.size, state: state, error: options.error)
    let isFloated = TanreiTextFieldBehavior.labelFloats(isFocused: isFocused, value: text.wrappedValue)
    // TXF-15: prefix, suffix and placeholder show while the label is floated or not drawn.
    let showsAffixes = TanreiTextFieldBehavior.showsAffixes(isFloated: isFloated, labelDrawn: labelDrawn)
    let metrics = TanreiTextFieldMetrics(
      appearance: appearance, variant: options.variant, labelDrawn: labelDrawn, hasLeadingIcon: !TanreiSlotContent.isEmpty(leadingIcon),
      hasTrailingIcon: !TanreiSlotContent.isEmpty(trailingIcon), isMultiline: options.isMultiline,
      scale: { style in style.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight })
    let target = TanreiHitTarget.minimum(in: system.measure)
    let reach = max(.zero, (target - metrics.minimumHeight) / 2)
    let stateMotion = tokens.stateMotion(reduceMotion: reduceMotion)
    let labelMotion = tokens.labelMotion(reduceMotion: reduceMotion)
    let description = TanreiTextFieldBehavior.description(
      prefix: showsAffixes ? options.prefix : "", suffix: showsAffixes ? options.suffix : "", supporting: options.shownSupportingText,
      counter: options.counter ? options.counterText(for: text.wrappedValue) : "")

    // The body is erased at its parts: the fully nested type is deep enough to overflow the runtime's stack when it
    // resolves the metadata (measured: a SIGSEGV in `swift_getTypeByMangledName`).
    // TXF-13: laid out from the room the label needs, measured in the width the field is given (`TanreiTextFieldLayout`).
    let field = TanreiTextFieldLayout(metrics: metrics) {
      // TXF-7: no focus ring — the edge is the indicator; under `glow`, the glow around the container too.
      AnyView(
        container(appearance: appearance)
          .tanreiFocusRing(system.behavior.focusStyle == .glow && state == .focused, cornerRadius: appearance.cornerRadius))
      // TXF-8: a press anywhere on the field outside its text focuses the input — the container's padding, the label,
      // the affixes, a decorative icon, and the extended hit area above and below the container. No press answer.
      AnyView(
        Color.clear
          .padding(.vertical, -reach)
          .contentShape(Rectangle())
          .onTapGesture { if isEnabled { isFocused = true } })
      AnyView(row(appearance: appearance, metrics: metrics, showsAffixes: showsAffixes, description: description))
        .layoutValue(key: TanreiTextFieldPartKey.self, value: .row)
      if labelDrawn {
        AnyView(
          TanreiFloatingLabel(
            text: title.text, peers: labelRoom, progress: isFloated ? TanreiFloatingLabel.floated : TanreiFloatingLabel.resting,
            rest: appearance.labelTypescale, floated: appearance.labelFloatedTypescale, metrics: metrics
          )
          .foregroundStyle(colors[appearance.label])
          .animation(labelMotion, value: isFloated)
          .allowsHitTesting(false)
          .accessibilityHidden(true))
        .layoutValue(key: TanreiTextFieldPartKey.self, value: .label)
      }
      edge(appearance: appearance, metrics: metrics, labelDrawn: labelDrawn, isFloated: isFloated, labelMotion: labelMotion)
      if labelDrawn {
        TanreiTextFieldLabelProbes(own: title.text, peers: labelRoom, rest: appearance.labelTypescale, floated: appearance.labelFloatedTypescale)
      }
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .compositingGroup()
    .opacity(appearance.opacity)
    .animation(stateMotion, value: state)
    .onHover { isHovered = $0 }

    return AnyView(VStack(alignment: .leading, spacing: .zero) {
      AnyView(field)
      supportingRow(appearance: appearance, metrics: metrics)
    }
    .onChange(of: draft) { _, newDraft in draftChanged(to: newDraft) }
    .onChange(of: text.wrappedValue) { _, value in
      // TXF-1: a value the product sets is shown and emits nothing.
      if value != draft { draft = value }
    }
    .onChange(of: isFocused) { _, focused in
      if focused { committed = text.wrappedValue } else { commit() }
    }
    // TXF-12: an error set or changed while the input has focus is announced once.
    .onChange(of: options.error ? options.shownSupportingText : nil) { _, message in
      if let message = TanreiTextFieldBehavior.errorToAnnounce(message, isFocused: isFocused) { TanreiTextFieldBehavior.announce(message) }
    }
    // TXF-19: the count, once typing has paused for a second, as the counter shows it.
    .task(id: text.wrappedValue) {
      guard options.counter, hasEdited, isFocused else { return }
      try? await Task.sleep(for: .seconds(TanreiTextFieldBehavior.countAnnouncementDelay))
      guard !Task.isCancelled else { return }
      TanreiTextFieldBehavior.announce(options.counterText(for: text.wrappedValue))
    })
  }

  /// The row inside the container: leading icon, the input column (prefix, input, suffix), trailing icon. The layout
  /// places it at the input line (TXF-13, TXF-16).
  private func row(appearance: TanreiTextFieldAppearance, metrics: TanreiTextFieldMetrics, showsAffixes: Bool, description: String) -> AnyView {
    AnyView(HStack(alignment: .top, spacing: appearance.containerGap) {
      if !TanreiSlotContent.isEmpty(leadingIcon) {
        icon(leadingIcon, color: appearance.leadingIcon, appearance: appearance, metrics: metrics)
      }
      HStack(alignment: .top, spacing: appearance.affixGap) {
        if showsAffixes && !options.prefix.isEmpty {
          affix(options.prefix, appearance: appearance)
        }
        input(appearance: appearance, metrics: metrics, showsPlaceholder: showsAffixes, description: description)
          .frame(maxWidth: .infinity, alignment: .leading)
        if showsAffixes && !options.suffix.isEmpty {
          affix(options.suffix, appearance: appearance)
        }
      }
      if !TanreiSlotContent.isEmpty(trailingIcon) {
        icon(trailingIcon, color: appearance.trailingIcon, appearance: appearance, metrics: metrics)
      }
    }
    .padding(.leading, metrics.leadingPadding)
    .padding(.trailing, metrics.trailingPadding))
  }

  /// TXF-22: an icon of the slot, at the size's icon size, unselected, in its part's color, centred on the first line.
  /// A decorative icon is hidden from assistive technology; an interactive element the product places there (a button,
  /// an icon button) keeps its own tokens and is its own focus stop, so it stays in the accessibility tree.
  private func icon<Icon: View>(_ icon: Icon, color: TanreiPaint, appearance: TanreiTextFieldAppearance, metrics: TanreiTextFieldMetrics) -> AnyView {
    if TanreiTextFieldSlot.isInteractive(icon) {
      return AnyView(
        Color.clear
          .frame(width: appearance.iconSize, height: .zero)
          .overlay { icon.frame(width: appearance.iconSize, height: appearance.iconSize) }
          .frame(height: metrics.inputLine))
    }
    return AnyView(
      TanreiIconSlot(size: appearance.iconSize) { icon }
        .tanreiIconContext(size: appearance.iconSize, selected: false)
        .foregroundStyle(colors[color])
        .frame(height: metrics.inputLine))
  }

  private func affix(_ value: String, appearance: TanreiTextFieldAppearance) -> some View {
    Text(verbatim: value)
      .tanreiTextStyle(appearance.inputTypescale)
      .foregroundStyle(colors[appearance.affix])
      .fixedSize()
      .accessibilityHidden(true)
  }

  /// The platform's own text element, styled from the tokens.
  private func input(appearance: TanreiTextFieldAppearance, metrics: TanreiTextFieldMetrics, showsPlaceholder: Bool, description: String) -> AnyView {
    let lines = options.lineRange
    let leftToRight = options.type.readsLeftToRight && layoutDirection == .rightToLeft
    return AnyView(ZStack(alignment: .topLeading) {
      // TXF-15: the placeholder, only while the value is empty and the label is floated or not drawn; never the name.
      if showsPlaceholder, draft.isEmpty, let prompt = options.prompt {
        prompt
          .tanreiTextStyle(appearance.inputTypescale)
          .foregroundStyle(colors[appearance.placeholder])
          .lineLimit(1)
          .accessibilityHidden(true)
          .allowsHitTesting(false)
      }
      Group {
        if staticInput {
          // Snapshots only: `ImageRenderer` cannot draw the platform's text element, so baselines draw its text.
          TanreiStaticTextInput(value: draft, isSecure: options.type == .password, minimumLines: options.isMultiline ? lines.lowerBound : 1)
        } else if options.readOnly {
          // TXF-10: focusable, selectable and copyable; never editable.
          Text(verbatim: draft)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
            .focusable()
            .accessibilityValue(Text(verbatim: draft))
        } else if options.type == .password {
          SecureField(text: draftBinding) { title.text }
        } else if options.isMultiline {
          TextField(text: draftBinding, axis: .vertical) { title.text }
            .lineLimit(lines)
        } else {
          TextField(text: draftBinding) { title.text }
        }
      }
      .textFieldStyle(.plain)
      .labelsHidden()
      .tanreiTextStyle(appearance.inputTypescale)
      .foregroundStyle(colors[appearance.input])
      // TXF-6: the caret color. SwiftUI draws the selection highlight from the same tint,
      // not from `comp.text-field.selection.color`.
      .tint(colors[appearance.caret])
      .focused($isFocused)
      .modifier(TanreiTextFieldTypeTraits(type: options.type, textContentType: options.textContentType))
      // TXF-2 / TXF-3: the action key commits, then emits `onSubmit` (the spec's `action`). An enclosing `.onSubmit`
      // modifier fires too, but SwiftUI runs it BEFORE this one, so before the commit.
      .onSubmit(submit)
      // TXF-24: the values of email, url, tel, number and password read left to right, at the field's start edge.
      .environment(\.layoutDirection, leftToRight ? .leftToRight : layoutDirection)
      .multilineTextAlignment(leftToRight ? .trailing : .leading)
      // TXF-23: the label is the name, drawn or not; never the placeholder. TXF-11/15/19: the description.
      .accessibilityLabel(title.text)
      .accessibilityHint(Text(verbatim: description))
    })
  }

  /// TXF-16: the container's fill — top corners `container.shape`, a filled field's bottom corners `container.shape-bottom`.
  private func container(appearance: TanreiTextFieldAppearance) -> some View {
    TanreiTextFieldShape(appearance: appearance, style: system.shape.roundedCornerStyle)
      .fill(colors[appearance.container])
  }

  /// The edge: an outlined field's outline (with the gap the floated label opens, TXF-13), a filled field's active
  /// indicator along the bottom. Their widths are the state's (TXF-6).
  private func edge(appearance: TanreiTextFieldAppearance, metrics: TanreiTextFieldMetrics, labelDrawn: Bool, isFloated: Bool, labelMotion: Animation?) -> AnyView {
    let shape = TanreiTextFieldShape(appearance: appearance, style: system.shape.roundedCornerStyle)
    return AnyView(ZStack {
      shape
        .strokeBorder(colors[appearance.outline], lineWidth: appearance.outlineWidth)
        .mask {
          TanreiOutlineNotch(
            label: labelDrawn ? title.text : nil, style: appearance.labelFloatedTypescale, padding: appearance.notchPadding,
            metrics: metrics, progress: isFloated ? TanreiFloatingLabel.floated : TanreiFloatingLabel.resting
          )
          .animation(labelMotion, value: isFloated)
        }
      Rectangle()
        .fill(colors[appearance.activeIndicator])
        .frame(height: appearance.activeIndicatorWidth)
        .frame(maxHeight: .infinity, alignment: .bottom)
        .clipShape(shape)
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true))
  }

  /// TXF-19: the shown supporting or error text at the start, the counter at the end, `supporting-text.gap` below.
  private func supportingRow(appearance: TanreiTextFieldAppearance, metrics: TanreiTextFieldMetrics) -> AnyView? {
    let shown = options.shownSupportingText
    guard !shown.isEmpty || options.counter else { return nil }
    return AnyView(
      HStack(alignment: .top, spacing: appearance.containerGap) {
        Text(verbatim: shown)
          .tanreiTextStyle(appearance.supportingTextTypescale)
          .foregroundStyle(colors[appearance.supportingText])
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
        if options.counter {
          Text(verbatim: options.counterText(for: text.wrappedValue))
            .tanreiTextStyle(appearance.supportingTextTypescale)
            .foregroundStyle(colors[appearance.counter])
            .fixedSize()
        }
      }
      .padding(.top, appearance.supportingTextGap)
      .padding(.leading, metrics.inputStart)
      .padding(.trailing, appearance.paddingInline)
      .opacity(appearance.opacity)
      // Read as the input's description, not as elements of their own.
      .accessibilityHidden(true))
  }
}

extension TanreiTextField where LeadingIcon == EmptyView, TrailingIcon == EmptyView {
  /// A field named by `label`, without icons.
  public init<S: StringProtocol>(
    _ label: S, text: Binding<String>, prompt: Text? = nil, variant: TanreiTextFieldVariant = .outlined, size: TanreiTextFieldSize = .medium,
    type: TanreiTextFieldType = .text, supportingText: String = "", errorText: String = "", error: Bool = false, readOnly: Bool = false,
    required: Bool = false, axis: Axis = .horizontal, lineLimit: ClosedRange<Int>? = nil, maxLength: Int = 0, counter: Bool = false,
    prefix: String = "", suffix: String = "", textContentType: String? = nil, onCommit: (@MainActor (String) -> Void)? = nil,
    onSubmit: (@MainActor () -> Void)? = nil
  ) {
    self.init(
      label, text: text, prompt: prompt, variant: variant, size: size, type: type, supportingText: supportingText, errorText: errorText,
      error: error, readOnly: readOnly, required: required, axis: axis, lineLimit: lineLimit, maxLength: maxLength, counter: counter,
      prefix: prefix, suffix: suffix, textContentType: textContentType, onCommit: onCommit, onSubmit: onSubmit, leadingIcon: { EmptyView() }, trailingIcon: { EmptyView() })
  }

  /// A field named by a localized label, without icons.
  public init(
    _ labelKey: LocalizedStringKey, text: Binding<String>, prompt: Text? = nil, variant: TanreiTextFieldVariant = .outlined,
    size: TanreiTextFieldSize = .medium, type: TanreiTextFieldType = .text, supportingText: String = "", errorText: String = "", error: Bool = false,
    readOnly: Bool = false, required: Bool = false, axis: Axis = .horizontal, lineLimit: ClosedRange<Int>? = nil, maxLength: Int = 0,
    counter: Bool = false, prefix: String = "", suffix: String = "", textContentType: String? = nil, onCommit: (@MainActor (String) -> Void)? = nil,
    onSubmit: (@MainActor () -> Void)? = nil
  ) {
    self.init(
      labelKey, text: text, prompt: prompt, variant: variant, size: size, type: type, supportingText: supportingText, errorText: errorText,
      error: error, readOnly: readOnly, required: required, axis: axis, lineLimit: lineLimit, maxLength: maxLength, counter: counter,
      prefix: prefix, suffix: suffix, textContentType: textContentType, onCommit: onCommit, onSubmit: onSubmit, leadingIcon: { EmptyView() }, trailingIcon: { EmptyView() })
  }
}

// MARK: - Options and rules

/// Everything a field is given besides its label, value and icons.
struct TanreiTextFieldOptions {
  var prompt: Text?
  var variant: TanreiTextFieldVariant
  var size: TanreiTextFieldSize
  var type: TanreiTextFieldType
  var supportingText: String
  var errorText: String
  var error: Bool
  var readOnly: Bool
  var required: Bool
  var axis: Axis
  var lineLimit: ClosedRange<Int>?
  var maxLength: Int
  var counter: Bool
  var prefix: String
  var suffix: String
  var textContentType: String?
  var onCommit: (@MainActor (String) -> Void)?
  /// TXF-3: the action, after the commit.
  var onSubmit: (@MainActor () -> Void)? = nil

  /// TXF-17: multi-line unless the type is password.
  var isMultiline: Bool { axis == .vertical && type != .password }

  /// TXF-17: `minRows` 2 by default; no upper limit unless given; at `minRows` when the upper bound is smaller.
  var lineRange: ClosedRange<Int> {
    let range = lineLimit ?? TanreiTextFieldBehavior.defaultLines
    return range.lowerBound...max(range.lowerBound, range.upperBound)
  }

  /// TXF-11: the error text while in error (the supporting text while the error text is empty), else the supporting text.
  var shownSupportingText: String {
    error && !errorText.isEmpty ? errorText : supportingText
  }

  /// TXF-19: the count of user-perceived characters, and "/maxLength" while there is a limit.
  func counterText(for value: String) -> String {
    maxLength > 0 ? "\(value.count)/\(maxLength)" : "\(value.count)"
  }
}

/// The text field's rules, pure: they are tested without a view.
enum TanreiTextFieldBehavior {
  /// TXF-17: `minRows` 2, no `maxRows`.
  static let defaultLines: ClosedRange<Int> = 2...Int.max
  /// TXF-19: the pause after which the count is announced (a fact of the spec, not a design value).
  static let countAnnouncementDelay: Double = 1

  /// TXF-6 / TXF-5 / TXF-10: disabled, else focused over hovered. No pressed state: a press on a field is not an action.
  static func state(isEnabled: Bool, isFocused: Bool, isHovered: Bool) -> TanreiInteraction {
    guard isEnabled else { return .disabled }
    if isFocused { return .focused }
    if isHovered { return .hovered }
    return .enabled
  }

  /// TXF-13 / TXF-21: floated while focused or filled (an autofilled value is a value).
  static func labelFloats(isFocused: Bool, value: String) -> Bool {
    isFocused || !value.isEmpty
  }

  /// TXF-18: an edit that would make the value longer than `maxLength` grapheme clusters is refused when the value was
  /// already full, and shortened to fit otherwise (a paste). 0 is no limit.
  static func limit(_ value: String, previous: String, maxLength: Int) -> String {
    guard maxLength > 0, value.count > maxLength else { return value }
    return previous.count >= maxLength ? previous : String(value.prefix(maxLength))
  }

  /// TXF-15: prefix, suffix and placeholder show while the label is floated or not drawn, so they never overlap it.
  static func showsAffixes(isFloated: Bool, labelDrawn: Bool) -> Bool {
    isFloated || !labelDrawn
  }

  /// TXF-12: the error text to announce when the error (or its text) changes — only while the input has focus; an error
  /// set without focus is read with the description when the field is next focused.
  static func errorToAnnounce(_ message: String?, isFocused: Bool) -> String? {
    guard isFocused, let message, !message.isEmpty else { return nil }
    return message
  }

  /// TXF-2: change is emitted only for a value that differs from the one last committed.
  static func shouldCommit(value: String, committed: String) -> Bool {
    value != committed
  }

  /// TXF-11 / TXF-15 / TXF-19: the input's description — the affixes while shown, the shown supporting or error text,
  /// and the count.
  static func description(prefix: String, suffix: String, supporting: String, counter: String) -> String {
    [prefix, suffix, supporting, counter].filter { !$0.isEmpty }.joined(separator: ", ")
  }

  /// TXF-12 / TXF-19: a polite announcement.
  @MainActor
  static func announce(_ message: String) {
    AccessibilityNotification.Announcement(message).post()
  }
}

// MARK: - Token bindings

extension TanreiTextFieldTokens {
  /// TXF-14: colors and widths change over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// TXF-14: the label floats and rests (and the outline's gap opens) over the label motion; `nil` under Reduce Motion.
  func labelMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionLabelDuration, easing: motionLabelEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a text field draws for one variant × size × state, plain or in error. Pure data read from a
/// `TanreiTextFieldTokens`. TXF-5 / TXF-6 / TXF-11: every part, in every state, from that state's tokens — the `error.`
/// parts while in error.
struct TanreiTextFieldAppearance: Equatable {
  let container: TanreiPaint
  let activeIndicator: TanreiPaint
  let outline: TanreiPaint
  let label: TanreiPaint
  let input: TanreiPaint
  let placeholder: TanreiPaint
  let affix: TanreiPaint
  let leadingIcon: TanreiPaint
  let trailingIcon: TanreiPaint
  let supportingText: TanreiPaint
  let counter: TanreiPaint
  let caret: TanreiPaint
  let opacity: Double
  let outlineWidth: CGFloat
  let activeIndicatorWidth: CGFloat
  let cornerRadius: CGFloat
  let bottomCornerRadius: CGFloat
  let isFilled: Bool
  let containerHeight: CGFloat
  let paddingInline: CGFloat
  let paddingInlineWithIcon: CGFloat
  let paddingBlock: CGFloat
  let paddingBlockWithLabel: CGFloat
  let containerGap: CGFloat
  let labelTypescale: TanreiTextStyle
  let labelFloatedTypescale: TanreiTextStyle
  let inputTypescale: TanreiTextStyle
  let iconSize: CGFloat
  let affixGap: CGFloat
  let notchPadding: CGFloat
  let supportingTextGap: CGFloat
  let supportingTextTypescale: TanreiTextStyle
  let selection: TanreiPaint

  init(tokens: TanreiTextFieldTokens, variant: TanreiTextFieldVariant, size: TanreiTextFieldSize, state: TanreiInteraction, error: Bool = false) {
    // TXF-9: both lookups are total — an unknown value reads the default value's tokens (and is reported). A field has
    // no pressed tokens: a press is drawn as the state beneath it (TXF-8).
    let variantTokens = tokens.variants[variant]
    let drawn = state == .pressed ? TanreiInteraction.focused : state
    let parts = variantTokens[state: drawn] ?? variantTokens.enabled
    if error {
      container = parts.errorContainerColor
      activeIndicator = parts.errorActiveIndicatorColor
      outline = parts.errorOutlineColor
      label = parts.errorLabelColor
      input = parts.errorInputColor
      placeholder = parts.errorPlaceholderColor
      affix = parts.errorAffixColor
      leadingIcon = parts.errorLeadingIconColor
      trailingIcon = parts.errorTrailingIconColor
      supportingText = parts.errorSupportingTextColor
      counter = parts.errorCounterColor
      caret = parts.errorCaretColor
    } else {
      container = parts.containerColor
      activeIndicator = parts.activeIndicatorColor
      outline = parts.outlineColor
      label = parts.labelColor
      input = parts.inputColor
      placeholder = parts.placeholderColor
      affix = parts.affixColor
      leadingIcon = parts.leadingIconColor
      trailingIcon = parts.trailingIconColor
      supportingText = parts.supportingTextColor
      counter = parts.counterColor
      caret = parts.caretColor
    }
    let shared = tokens[state: drawn]
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    outlineWidth = shared?.outlineWidth ?? tokens.outlineWidth
    activeIndicatorWidth = shared?.activeIndicatorWidth ?? tokens.activeIndicatorWidth
    cornerRadius = tokens.containerShape
    // The filled variant is told apart by its data, never by its name: a variant whose resting container is drawn and
    // whose outline is not is a filled field (bottom corners `shape-bottom`, the label inside the container).
    isFilled = variantTokens.enabled.outlineColor == .none && variantTokens.enabled.containerColor != .none
    bottomCornerRadius = isFilled ? tokens.containerShapeBottom : tokens.containerShape
    let metrics = tokens.sizes[size]
    containerHeight = metrics.containerHeight
    paddingInline = metrics.containerPaddingInline
    paddingInlineWithIcon = metrics.containerPaddingInlineWithIcon
    paddingBlock = metrics.containerPaddingBlock
    paddingBlockWithLabel = metrics.containerPaddingBlockWithLabel
    containerGap = metrics.containerGap
    labelTypescale = metrics.labelTypescale
    labelFloatedTypescale = metrics.labelFloatedTypescale
    inputTypescale = metrics.inputTypescale
    iconSize = metrics.iconSize
    affixGap = tokens.affixGap
    notchPadding = tokens.outlineNotchPadding
    supportingTextGap = tokens.supportingTextGap
    supportingTextTypescale = tokens.supportingTextTypescale
    selection = tokens.selectionColor
  }
}

/// TXF-13 / TXF-16: where things go in the container, from the tokens and the lines as Dynamic Type scales them.
struct TanreiTextFieldMetrics: Equatable {
  /// One line of the input, of the resting label and of the floated label.
  let inputLine: CGFloat
  let labelLine: CGFloat
  let floatedLine: CGFloat
  /// The container's minimum height.
  let minimumHeight: CGFloat
  let leadingPadding: CGFloat
  let trailingPadding: CGFloat
  /// Where the input line starts, from the container's leading edge.
  let inputStart: CGFloat
  let rowTop: CGFloat
  let rowBottom: CGFloat
  /// The top-leading corner of the label's line box, resting and floated, for a label on one line.
  let restingLabelOrigin: CGPoint
  let floatedLabelOrigin: CGPoint
  /// Where the floated label starts: at the input text in a filled field, at `padding-inline` (over a leading icon) in
  /// an outlined one.
  let floatedStart: CGFloat
  /// How far from the container's trailing edge the label's lines end: the trailing padding, and the trailing icon with
  /// its gap.
  let textEnd: CGFloat
  /// A filled field that draws its label keeps the floated label inside its container, above the input line.
  let labelInside: Bool
  let labelDrawn: Bool
  let isMultiline: Bool
  private let containerHeight: CGFloat
  private let paddingBlock: CGFloat
  private let paddingBlockWithLabel: CGFloat

  init(
    appearance a: TanreiTextFieldAppearance, variant: TanreiTextFieldVariant, labelDrawn: Bool, hasLeadingIcon: Bool, hasTrailingIcon: Bool,
    isMultiline: Bool, scale line: (TanreiTextStyle) -> CGFloat
  ) {
    inputLine = line(a.inputTypescale)
    labelLine = line(a.labelTypescale)
    floatedLine = line(a.labelFloatedTypescale)
    leadingPadding = hasLeadingIcon ? a.paddingInlineWithIcon : a.paddingInline
    trailingPadding = hasTrailingIcon ? a.paddingInlineWithIcon : a.paddingInline
    inputStart = hasLeadingIcon ? a.paddingInlineWithIcon + a.iconSize + a.containerGap : a.paddingInline
    textEnd = hasTrailingIcon ? a.paddingInlineWithIcon + a.iconSize + a.containerGap : a.paddingInline
    containerHeight = a.containerHeight
    paddingBlock = a.paddingBlock
    paddingBlockWithLabel = a.paddingBlockWithLabel
    self.labelDrawn = labelDrawn
    self.isMultiline = isMultiline
    // TXF-16: a filled field that draws its label keeps room for the floated label above the input line, so it never
    // changes height when the label floats; any other field centres its input line in its minimum height.
    labelInside = a.isFilled && labelDrawn
    floatedStart = labelInside ? inputStart : a.paddingInline
    // With a label on one line (the plan of `room(resting:floated:)` with one line each).
    if labelInside {
      minimumHeight = max(a.containerHeight, 2 * a.paddingBlockWithLabel + floatedLine + inputLine)
      rowTop = a.paddingBlockWithLabel + floatedLine
      rowBottom = a.paddingBlockWithLabel
    } else {
      minimumHeight = max(a.containerHeight, 2 * a.paddingBlock + inputLine)
      let centred = (minimumHeight - inputLine) / 2
      rowTop = isMultiline ? a.paddingBlock : centred
      rowBottom = isMultiline ? a.paddingBlock : centred
    }
    // TXF-13: resting, the label sits in the input line (a filled single-line field: centred in the container), at the
    // input's start; floated, a filled field's label is at the top of the container, an outlined field's centred on the
    // outline's top edge, starting at `padding-inline` (over a leading icon).
    let restingCentre = labelInside && !isMultiline ? minimumHeight / 2 : rowTop + inputLine / 2
    restingLabelOrigin = CGPoint(x: inputStart, y: restingCentre - labelLine / 2)
    floatedLabelOrigin = labelInside
      ? CGPoint(x: inputStart, y: a.paddingBlockWithLabel)
      : CGPoint(x: a.paddingInline, y: -floatedLine / 2)
  }

  /// TXF-13: the width the resting label wraps in — the input's — in a container `width` wide.
  func restingLabelWidth(in width: CGFloat) -> CGFloat { max(.zero, width - inputStart - textEnd) }

  /// TXF-13: the width the floated label wraps in, from where it floats to, in a container `width` wide.
  func floatedLabelWidth(in width: CGFloat) -> CGFloat { max(.zero, width - floatedStart - textEnd) }

  /// TXF-13 / TXF-16: how the field makes room for a label whose resting lines are `resting` tall and whose floated lines
  /// are `floated` tall (the tallest of the labels it makes room for, `\.tanreiTextFieldLabelRoom`) — the same plan
  /// whether the label rests or floats, so neither variant changes height when it floats.
  func room(resting: CGFloat, floated: CGFloat) -> TanreiTextFieldRoom {
    guard labelDrawn else {
      return TanreiTextFieldRoom(base: minimumHeight, rowTop: rowTop, rowBottom: rowBottom, reservedAbove: .zero, contentFloor: .zero)
    }
    let resting = max(resting, labelLine)
    let floated = max(floated, floatedLine)
    // A multi-line field rests its label's first line on its first input line (TXF-17): its lines below need room below
    // that line, inside the row.
    let contentFloor = isMultiline ? (inputLine - labelLine) / 2 + resting : .zero
    if labelInside {
      // A filled field's floated lines sit above the input line, inside the container; a resting label wraps inside it.
      let block = floated + inputLine
      let base = max(containerHeight, 2 * paddingBlockWithLabel + block, isMultiline ? .zero : 2 * paddingBlockWithLabel + resting)
      // What a wrapped resting label adds is shared above and below the floated label and the input line.
      let extra = isMultiline ? .zero : (base - max(containerHeight, 2 * paddingBlockWithLabel + block)) / 2
      return TanreiTextFieldRoom(
        base: base, rowTop: paddingBlockWithLabel + extra + floated, rowBottom: paddingBlockWithLabel + extra, reservedAbove: .zero,
        contentFloor: contentFloor)
    }
    // An outlined field: a resting label wraps inside the container, around the input line's centre; the floated
    // label's lines above its last are held above the container, whether the label rests or floats.
    let base = max(containerHeight, 2 * paddingBlock + inputLine, isMultiline ? .zero : 2 * paddingBlock + resting)
    let centred = (base - inputLine) / 2
    return TanreiTextFieldRoom(
      base: base, rowTop: isMultiline ? paddingBlock : centred, rowBottom: isMultiline ? paddingBlock : centred,
      reservedAbove: floated - floatedLine, contentFloor: contentFloor)
  }

  /// TXF-13: the top of a resting label `height` tall, in the container: centred in it (single-line), or its first line
  /// centred on the first input line (multi-line, TXF-17).
  func restingLabelTop(height: CGFloat, room: TanreiTextFieldRoom) -> CGFloat {
    isMultiline ? room.rowTop + (inputLine - labelLine) / 2 : (room.base - max(height, labelLine)) / 2
  }

  /// TXF-13: the top of a floated label `height` tall: a filled field's just above the input line; an outlined field's
  /// with its last line centred on the outline's top edge.
  func floatedLabelTop(height: CGFloat, room: TanreiTextFieldRoom) -> CGFloat {
    let height = max(height, floatedLine)
    return labelInside ? room.rowTop - height : floatedLine / 2 - height
  }
}

/// TXF-13 / TXF-16: the room a field makes for its label, in the container's own coordinates.
struct TanreiTextFieldRoom: Equatable {
  /// The container's height before the row grows it (a multi-line input, enlarged text).
  let base: CGFloat
  /// Where the row (the input line) starts, and the room below it.
  let rowTop: CGFloat
  let rowBottom: CGFloat
  /// The room held above an outlined container for the floated label's lines above the last (the last is centred on
  /// the top edge, as a label on one line is).
  let reservedAbove: CGFloat
  /// The least height of a multi-line row: the resting label's lines below the first input line.
  let contentFloor: CGFloat

  /// The container's height with a row `rowHeight` tall.
  func containerHeight(rowHeight: CGFloat) -> CGFloat {
    max(base, rowTop + max(rowHeight, contentFloor) + rowBottom)
  }
}

// MARK: - Parts

/// TXF-16: an outlined field rounds four corners by `container.shape`; a filled one its top corners by `container.shape`
/// and its bottom corners by `container.shape-bottom`. Corners ease by the corner smoothing.
struct TanreiTextFieldShape: InsettableShape {
  let appearance: TanreiTextFieldAppearance
  let style: RoundedCornerStyle
  var inset: CGFloat = .zero

  func path(in rect: CGRect) -> Path {
    let rect = rect.insetBy(dx: inset, dy: inset)
    let top = max(.zero, appearance.cornerRadius - inset)
    let bottom = max(.zero, appearance.bottomCornerRadius - inset)
    return UnevenRoundedRectangle(topLeadingRadius: top, bottomLeadingRadius: bottom, bottomTrailingRadius: bottom, topTrailingRadius: top, style: style)
      .path(in: rect)
  }

  func inset(by amount: CGFloat) -> TanreiTextFieldShape {
    var shape = self
    shape.inset += amount
    return shape
  }
}

/// TXF-13: which part of a field a subview of `TanreiTextFieldLayout` is.
enum TanreiTextFieldPart: Equatable, Sendable {
  /// Drawn over the container: its fill, the press target, the edge.
  case container
  /// The input line: icons, affixes, the input.
  case row
  /// The drawn label.
  case label
  /// A hidden copy of a label, measured in the width it would wrap in: resting or floated, this field's own or one it
  /// makes room for (`\.tanreiTextFieldLabelRoom`).
  case probe(resting: Bool, own: Bool)
}

struct TanreiTextFieldPartKey: LayoutValueKey {
  static let defaultValue = TanreiTextFieldPart.container
}

/// TXF-13: the heights of the labels a field measures in the width they are given.
struct TanreiTextFieldLabelHeights: Equatable {
  var restingRoom: CGFloat = .zero
  var floatedRoom: CGFloat = .zero
  var restingOwn: CGFloat = .zero
  var floatedOwn: CGFloat = .zero

  /// The probes among `subviews`, measured in a container `width` wide.
  init(_ subviews: LayoutSubviews, metrics: TanreiTextFieldMetrics, width: CGFloat) {
    for subview in subviews {
      guard case .probe(let resting, let own) = subview[TanreiTextFieldPartKey.self] else { continue }
      let lineWidth = resting ? metrics.restingLabelWidth(in: width) : metrics.floatedLabelWidth(in: width)
      let height = subview.sizeThatFits(ProposedViewSize(width: lineWidth, height: nil)).height
      if resting {
        restingRoom = max(restingRoom, height)
        if own { restingOwn = height }
      } else {
        floatedRoom = max(floatedRoom, height)
        if own { floatedOwn = height }
      }
    }
  }
}

/// The hidden copies of the labels a field measures (TXF-13): its own and those it makes room for, resting and floated.
struct TanreiTextFieldLabelProbes: View {
  let own: Text
  let peers: [Text]
  let rest: TanreiTextStyle
  let floated: TanreiTextStyle

  var body: some View {
    probe(own, resting: true, own: true)
    probe(own, resting: false, own: true)
    ForEach(peers.indices, id: \.self) { index in
      probe(peers[index], resting: true, own: false)
      probe(peers[index], resting: false, own: false)
    }
  }

  private func probe(_ text: Text, resting: Bool, own: Bool) -> some View {
    text
      .tanreiTextStyle(resting ? rest : floated)
      .fixedSize(horizontal: false, vertical: true)
      .hidden()
      .accessibilityHidden(true)
      .layoutValue(key: TanreiTextFieldPartKey.self, value: .probe(resting: resting, own: own))
  }
}

/// TXF-13 / TXF-16: lays out a field — the container (its fill, the press target, the edge), the input row, the label
/// — from the room its label needs. The label is measured in the width it is given (hidden copies, `TanreiTextFieldPart
/// .probe`) and wraps there; the container grows to hold a resting label's lines, a filled field's floated lines, and an
/// outlined field holds the floated lines above the last above its container. One plan whether the label rests or
/// floats: the field keeps one height. A `Layout`, so the first pass is right (`ImageRenderer`).
struct TanreiTextFieldLayout: Layout {
  let metrics: TanreiTextFieldMetrics

  private struct Plan {
    let width: CGFloat
    let room: TanreiTextFieldRoom
    let rowHeight: CGFloat
    let containerHeight: CGFloat
  }

  private func plan(width proposed: CGFloat?, subviews: Subviews) -> Plan {
    let row = subviews.first { $0[TanreiTextFieldPartKey.self] == .row }
    let width = proposed.flatMap { $0.isFinite ? $0 : nil } ?? row?.sizeThatFits(.unspecified).width ?? .zero
    let heights = TanreiTextFieldLabelHeights(subviews, metrics: metrics, width: width)
    let room = metrics.room(resting: heights.restingRoom, floated: heights.floatedRoom)
    let rowHeight = row?.sizeThatFits(ProposedViewSize(width: width, height: nil)).height ?? metrics.inputLine
    return Plan(width: width, room: room, rowHeight: rowHeight, containerHeight: room.containerHeight(rowHeight: rowHeight))
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let plan = plan(width: proposal.width, subviews: subviews)
    return CGSize(width: plan.width, height: plan.room.reservedAbove + plan.containerHeight)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let plan = plan(width: bounds.width, subviews: subviews)
    let top = bounds.minY + plan.room.reservedAbove
    let container = ProposedViewSize(width: plan.width, height: plan.containerHeight)
    for subview in subviews {
      switch subview[TanreiTextFieldPartKey.self] {
      case .container, .label:
        subview.place(at: CGPoint(x: bounds.minX, y: top), anchor: .topLeading, proposal: container)
      case .row:
        subview.place(
          at: CGPoint(x: bounds.minX, y: top + plan.room.rowTop), anchor: .topLeading,
          proposal: ProposedViewSize(width: plan.width, height: plan.rowHeight))
      case .probe(let resting, _):
        let lineWidth = resting ? metrics.restingLabelWidth(in: plan.width) : metrics.floatedLabelWidth(in: plan.width)
        subview.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: lineWidth, height: nil))
      }
    }
  }
}

/// TXF-13 / TXF-14: the label, moving and resizing between its resting and floated places, wrapping in the width it is
/// given there. At either end it is drawn in that place's own type style; in between, the resting text is scaled toward
/// the floated size and its centre moves between the two.
struct TanreiFloatingLabel: View, Animatable {
  static let resting: CGFloat = 0
  static let floated: CGFloat = 1

  let text: Text
  let peers: [Text]
  var progress: CGFloat
  let rest: TanreiTextStyle
  let floated: TanreiTextStyle
  let metrics: TanreiTextFieldMetrics

  nonisolated var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  var body: some View {
    let p = min(max(progress, Self.resting), Self.floated)
    let isFloated = p >= Self.floated
    let scale = isFloated || p <= Self.resting ? Self.floated : 1 + (floated.size / max(rest.size, 1) - 1) * p
    TanreiFloatingLabelLayout(progress: p, metrics: metrics) {
      text
        .tanreiTextStyle(isFloated ? floated : rest)
        .fixedSize(horizontal: false, vertical: true)
        .scaleEffect(scale, anchor: .leading)
        .layoutValue(key: TanreiTextFieldPartKey.self, value: .label)
      TanreiTextFieldLabelProbes(own: text, peers: peers, rest: rest, floated: floated)
    }
  }
}

/// TXF-13: places the label in the container it is given, at `progress` between its resting and floated places — the
/// same plan as `TanreiTextFieldLayout`, from the same probes.
struct TanreiFloatingLabelLayout: Layout {
  let progress: CGFloat
  let metrics: TanreiTextFieldMetrics

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    proposal.replacingUnspecifiedDimensions()
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let heights = TanreiTextFieldLabelHeights(subviews, metrics: metrics, width: bounds.width)
    let room = metrics.room(resting: heights.restingRoom, floated: heights.floatedRoom)
    let restingHeight = max(heights.restingOwn, metrics.labelLine)
    let floatedHeight = max(heights.floatedOwn, metrics.floatedLine)
    let restingCentre = metrics.restingLabelTop(height: restingHeight, room: room) + restingHeight / 2
    let floatedCentre = metrics.floatedLabelTop(height: floatedHeight, room: room) + floatedHeight / 2
    let isFloated = progress >= TanreiFloatingLabel.floated
    for subview in subviews {
      let part = subview[TanreiTextFieldPartKey.self]
      if case .probe(let resting, _) = part {
        let lineWidth = resting ? metrics.restingLabelWidth(in: bounds.width) : metrics.floatedLabelWidth(in: bounds.width)
        subview.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: lineWidth, height: nil))
        continue
      }
      // The label: its centre and start move with the progress; it wraps in the resting width until it has floated.
      let x = metrics.inputStart + (metrics.floatedStart - metrics.inputStart) * progress
      let centre = restingCentre + (floatedCentre - restingCentre) * progress
      let lineWidth = isFloated ? metrics.floatedLabelWidth(in: bounds.width) : metrics.restingLabelWidth(in: bounds.width)
      subview.place(at: CGPoint(x: bounds.minX + x, y: bounds.minY + centre), anchor: .leading, proposal: ProposedViewSize(width: lineWidth, height: nil))
    }
  }
}

/// The mask of an outlined field's outline: everything, except a gap of `padding` on each side of the floated label
/// where its last line crosses the top edge (TXF-13) — as wide as its widest line, wrapped in the width it floats in —,
/// opened from its centre as the label floats (TXF-14).
struct TanreiOutlineNotch: View, Animatable {
  let label: Text?
  let style: TanreiTextStyle
  let padding: CGFloat
  let metrics: TanreiTextFieldMetrics
  var progress: CGFloat

  nonisolated var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  var body: some View {
    let line = metrics.floatedLine
    Rectangle()
      .overlay(alignment: .topLeading) {
        if let label, progress > TanreiFloatingLabel.resting {
          label
            .tanreiTextStyle(style)
            .fixedSize(horizontal: false, vertical: true)
            .hidden()
            // The last line's band: the frame takes the text's own width, its widest line.
            .frame(height: line, alignment: .bottom)
            .padding(.horizontal, padding)
            .background(Rectangle())
            .scaleEffect(x: min(progress, TanreiFloatingLabel.floated), y: TanreiFloatingLabel.floated, anchor: .center)
            // Proposed the width the floated label wraps in (and its padding on each side).
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, metrics.floatedStart - padding)
            .padding(.trailing, max(.zero, metrics.textEnd - padding))
            .offset(y: -line / 2)
            .blendMode(.destinationOut)
        }
      }
      .compositingGroup()
  }
}

/// TXF-22: whether what the product placed in a slot is interactive — a Tanrei button or icon button, or SwiftUI's
/// `Button`, `Link`, `Toggle` or `Menu`, under any modifiers — and so must stay in the accessibility tree.
enum TanreiTextFieldSlot {
  static func isInteractive<Content: View>(_ content: Content) -> Bool {
    content is any TanreiInteractiveSlotContent
  }
}

/// A view that is an interactive element when placed in a text field's slot (TXF-22).
protocol TanreiInteractiveSlotContent {}

extension TanreiButton: TanreiInteractiveSlotContent {}
extension TanreiIconButton: TanreiInteractiveSlotContent {}
extension Button: TanreiInteractiveSlotContent {}
extension Link: TanreiInteractiveSlotContent {}
extension Toggle: TanreiInteractiveSlotContent {}
extension Menu: TanreiInteractiveSlotContent {}
extension ModifiedContent: TanreiInteractiveSlotContent where Content: TanreiInteractiveSlotContent {}

private struct TanreiTextFieldLabelRoomKey: EnvironmentKey {
  static let defaultValue: [Text] = []
}

extension EnvironmentValues {
  /// Internal (TXF-13): labels the text fields below make room for besides their own — each reserves the room the
  /// tallest of them needs, resting and floated —, so fields laid out side by side as peers (the date picker's range
  /// fields, DTP-25) keep containers equally tall and level when one label wraps and the other does not.
  var tanreiTextFieldLabelRoom: [Text] {
    get { self[TanreiTextFieldLabelRoomKey.self] }
    set { self[TanreiTextFieldLabelRoomKey.self] = newValue }
  }
}

/// TXF-20 / TXF-21: the keyboard, autocorrection, capitalization, action key and autofill hint of a type.
private struct TanreiTextFieldTypeTraits: ViewModifier {
  let type: TanreiTextFieldType
  let textContentType: String?

  func body(content: Content) -> some View {
    #if os(iOS)
    content
      .keyboardType(TanreiTextFieldPlatform.keyboard(type))
      .textInputAutocapitalization(TanreiTextFieldPlatform.capitalizes(type) ? .sentences : .never)
      .autocorrectionDisabled(!TanreiTextFieldPlatform.corrects(type))
      .submitLabel(type == .search ? .search : .return)
      .textContentType(textContentType.flatMap(TanreiTextFieldPlatform.contentType(forAutocomplete:)))
    #else
    content
      .autocorrectionDisabled(!TanreiTextFieldPlatform.corrects(type))
      .textContentType(textContentType.flatMap(TanreiTextFieldPlatform.contentType(forAutocomplete:)))
    #endif
  }
}

/// TXF-20 / TXF-21, per type, as the platform names it.
enum TanreiTextFieldPlatform {
  /// Autocorrection is off for email, url, password, number and tel (TXF-20).
  static func corrects(_ type: TanreiTextFieldType) -> Bool {
    type == .text || type == .search
  }

  /// Capitalization is off for email, url and password (and meaningless for number and tel).
  static func capitalizes(_ type: TanreiTextFieldType) -> Bool {
    type == .text || type == .search
  }

  #if os(iOS)
  static func keyboard(_ type: TanreiTextFieldType) -> UIKeyboardType {
    switch type {
    case .text, .password, .search: return .default
    case .email: return .emailAddress
    case .number: return .decimalPad
    case .tel: return .phonePad
    case .url: return .URL
    }
  }

  /// TXF-21: an HTML autofill field name → `UITextContentType`; `nil` for a name the platform has no type for.
  static func contentType(forAutocomplete name: String) -> UITextContentType? {
    let types: [String: UITextContentType] = [
      "email": .emailAddress, "username": .username, "current-password": .password, "new-password": .newPassword,
      "one-time-code": .oneTimeCode, "tel": .telephoneNumber, "name": .name, "given-name": .givenName, "family-name": .familyName,
      "additional-name": .middleName, "honorific-prefix": .namePrefix, "honorific-suffix": .nameSuffix, "nickname": .nickname,
      "organization": .organizationName, "organization-title": .jobTitle, "street-address": .fullStreetAddress,
      "address-line1": .streetAddressLine1, "address-line2": .streetAddressLine2, "address-level1": .addressState,
      "address-level2": .addressCity, "postal-code": .postalCode, "country-name": .countryName, "url": .URL,
      "cc-number": .creditCardNumber,
    ]
    return types[name]
  }
  #else
  /// TXF-21: an HTML autofill field name → `NSTextContentType`; `nil` for a name the platform has no type for.
  static func contentType(forAutocomplete name: String) -> NSTextContentType? {
    let types: [String: NSTextContentType] = [
      "username": .username, "email": .username, "current-password": .password, "new-password": .password, "one-time-code": .oneTimeCode,
    ]
    return types[name]
  }
  #endif
}

// MARK: - Snapshots

private struct TanreiStaticTextInputKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  /// Internal: draws the input's text as text instead of the platform's text element, for `ImageRenderer` (snapshots),
  /// which cannot draw an AppKit- or UIKit-backed field. Never set by a product.
  var tanreiStaticTextInput: Bool {
    get { self[TanreiStaticTextInputKey.self] }
    set { self[TanreiStaticTextInputKey.self] = newValue }
  }
}

/// What the platform's text element shows, as text: the value (a password's as the platform's bullets).
private struct TanreiStaticTextInput: View {
  let value: String
  let isSecure: Bool
  /// `minRows` while multi-line (TXF-17): the lines the platform's field reserves.
  let minimumLines: Int

  /// The character the platform's secure field shows for each character of a password.
  private static let bullet: Character = "\u{2022}"

  var body: some View {
    let shown = isSecure ? String(repeating: Self.bullet, count: value.count) : value
    // Empty lines up to `minimumLines`, so that the line box counts them as lines of text.
    let missing = max(0, minimumLines - shown.split(separator: "\n", omittingEmptySubsequences: false).count)
    Text(verbatim: shown + String(repeating: "\n ", count: missing))
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}

import SwiftUI

// Spec: specs/segmented-button.spec.json — tokens: TanreiSegmentedButtonTokens (comp.segmented-button), read from the design
// system in the environment (`system.segmentedButton`). Every design value in this file comes from a token; there are no
// literals, and no state's look is computed here. A segment is pressed like Button: press, hold, ripple,
// focus ring and key activation are the shared primitives, and SEG-9, SEG-10 and SEG-11 are BTN-8, BTN-9 and BTN-10 for
// the segment. Its two conditions — unselected and selected — are the component's state variants, read
// through the generated `conditions[_:]` and `[state:]` lookups.
//
// The set reads its segments as data, as the tabs do: each `TanreiSegment` puts what it is into a trait of its own view
// (its title, icon, value, whether its label is hidden and whether it is enabled), and the set draws every segment itself
// from that list. So everything a segment needs from the whole set — the equal widths and the common height (SEG-14), which
// segments are selected (SEG-12), its position (SEG-20), the Tab stop (SEG-18, SEG-19) and its outer corners (SEG-13) — is
// known on the first layout pass. SwiftUI's `Picker` with `.pickerStyle(.segmented)` is not used: its segments cannot be
// tokenised.

/// Lets people choose one option, or several, from two to five related options drawn side by side as the joined segments
/// of one control.
///
///     @State private var range: String? = "week"
///     TanreiSegmentedButton("Range", selection: $range) {
///       TanreiSegment("Day").tag("day")
///       TanreiSegment("Week").tag("week")
///       TanreiSegment("Month").tag("month").disabled(!hasHistory)
///     }
///
///     @State private var days: Set<String> = ["mon"]
///     TanreiSegmentedButton("Days", selection: $days, size: .small) {
///       TanreiSegment("Mon").tag("mon")
///       TanreiSegment("Tue").tag("tue")
///     }
///
///     TanreiSegmentedButton("Text alignment", selection: $alignment) {
///       TanreiSegment("Align left", icon: "format_align_left").tag(Alignment.leading).labelStyle(.iconOnly)
///       …
///     }
///
/// The type of the binding is the spec's `selection`: a `Binding<V?>` is a single choice (a radio group; `nil` selects
/// none, and a choice is never cleared by its own segment), a `Binding<Set<V>>` a multiple choice (each segment switched
/// on and off; the set may become empty). Activating a segment — by pointer, touch, Enter or Space, or, with a single
/// choice, by moving to it with the arrow keys, Home or End — writes the binding once, which is the spec's `change` (SEG-1,
/// SEG-2, SEG-18). **Apply `.tag(_:)` and `.labelStyle(.iconOnly)` directly to the `TanreiSegment`**, before any other
/// modifier: the segment reads them itself.
///
/// `size` is a `TanreiSegmentedButtonSize` (`.small`, `.medium`, `.large`: Button's heights), a generated open key: a
/// value the design system does not have draws medium's tokens and is reported in debug builds (SEG-8). `label`
/// names the set: the question its options answer (SEG-20).
///
/// The set takes the width it is offered and divides it equally among its segments, each at least as wide as the widest
/// segment's content and the minimum target (SEG-6, SEG-14); `.fixedSize(horizontal: true, vertical: false)` keeps it at
/// that natural width. Offered less, it divides what it has and its labels wrap.
public struct TanreiSegmentedButton<SelectionValue: Hashable, Content: View>: View {
  private let selection: TanreiSegmentedSelection
  private let size: TanreiSegmentedButtonSize
  private let label: Text
  private let labelIsEmpty: Bool
  private let content: Content

  /// A single choice: `selection` holds the selected segment's tag, `nil` none.
  public init(
    _ label: LocalizedStringKey, selection: Binding<SelectionValue?>, size: TanreiSegmentedButtonSize = .medium,
    @ViewBuilder content: () -> Content
  ) {
    self.init(selection: TanreiSegmentedSelection(selection), size: size, label: Text(label), labelIsEmpty: label == "", content: content())
  }

  /// A single choice named by a string that is not localized.
  public init<S: StringProtocol>(
    _ label: S, selection: Binding<SelectionValue?>, size: TanreiSegmentedButtonSize = .medium, @ViewBuilder content: () -> Content
  ) {
    self.init(
      selection: TanreiSegmentedSelection(selection), size: size, label: Text(label), labelIsEmpty: TanreiSegmentedButtonRules.isBlank(label),
      content: content())
  }

  /// A multiple choice: `selection` holds the tags of the selected segments.
  public init(
    _ label: LocalizedStringKey, selection: Binding<Set<SelectionValue>>, size: TanreiSegmentedButtonSize = .medium,
    @ViewBuilder content: () -> Content
  ) {
    self.init(selection: TanreiSegmentedSelection(selection), size: size, label: Text(label), labelIsEmpty: label == "", content: content())
  }

  /// A multiple choice named by a string that is not localized.
  public init<S: StringProtocol>(
    _ label: S, selection: Binding<Set<SelectionValue>>, size: TanreiSegmentedButtonSize = .medium, @ViewBuilder content: () -> Content
  ) {
    self.init(
      selection: TanreiSegmentedSelection(selection), size: size, label: Text(label), labelIsEmpty: TanreiSegmentedButtonRules.isBlank(label),
      content: content())
  }

  private init(selection: TanreiSegmentedSelection, size: TanreiSegmentedButtonSize, label: Text, labelIsEmpty: Bool, content: Content) {
    self.selection = selection
    self.size = size
    self.label = label
    self.labelIsEmpty = labelIsEmpty
    self.content = content
  }

  public var body: some View {
    _VariadicView.Tree(TanreiSegmentedButtonRoot(selection: selection, size: size, label: label, labelIsEmpty: labelIsEmpty)) {
      content
    }
  }
}

/// Reads the set's content — every segment's trait, in order — and hands the segments to `TanreiSegmentedSetView`.
private struct TanreiSegmentedButtonRoot: _VariadicView_UnaryViewRoot {
  let selection: TanreiSegmentedSelection
  let size: TanreiSegmentedButtonSize
  let label: Text
  let labelIsEmpty: Bool

  func body(children: _VariadicView.Children) -> some View {
    let entries = children.compactMap { $0[TanreiSegmentEntryKey.self] }
    return TanreiSegmentedSetView(entries: entries, selection: selection, size: size, label: label, labelIsEmpty: labelIsEmpty)
  }
}

/// A change the user makes to the selection (SEG-1, SEG-2).
enum TanreiSegmentChange: Equatable {
  /// Single: the segment's value becomes the selection.
  case select(AnyHashable)
  /// Multiple: the value is added.
  case insert(AnyHashable)
  /// Multiple: the value is removed.
  case remove(AnyHashable)
}

/// The set's selection, typed away: whether it is a multiple choice, the values it holds (a single choice holds none or
/// one), and the route to the binding. A value of another type than the binding's writes nothing.
struct TanreiSegmentedSelection {
  let isMultiple: Bool
  let values: [AnyHashable]
  let apply: @MainActor (TanreiSegmentChange) -> Void

  @MainActor
  init<V: Hashable>(_ binding: Binding<V?>) {
    isMultiple = false
    values = binding.wrappedValue.map { [AnyHashable($0)] } ?? []
    apply = { change in
      if case .select(let value) = change, let typed = value.base as? V { binding.wrappedValue = typed }
    }
  }

  @MainActor
  init<V: Hashable>(_ binding: Binding<Set<V>>) {
    isMultiple = true
    values = binding.wrappedValue.map { AnyHashable($0) }
    apply = { change in
      switch change {
      case .insert(let value): if let typed = value.base as? V { binding.wrappedValue.insert(typed) }
      case .remove(let value): if let typed = value.base as? V { binding.wrappedValue.remove(typed) }
      case .select: break
      }
    }
  }

  init(isMultiple: Bool, values: [AnyHashable], apply: @escaping @MainActor (TanreiSegmentChange) -> Void = { _ in }) {
    self.isMultiple = isMultiple
    self.values = values
    self.apply = apply
  }
}

// MARK: - The segment

/// One segment of a `TanreiSegmentedButton` (the spec's item kind `segment`): a title, an optional icon, and the value
/// that selects it (its tag).
///
///     TanreiSegment("Week").tag("week")
///     TanreiSegment("Grid", icon: "grid_view").tag(Layout.grid)
///     TanreiSegment("Map", icon: .image(Image(systemName: "map"))).tag(Layout.map)
///     TanreiSegment("Center", icon: "format_align_center").tag(Alignment.center).labelStyle(.iconOnly)
///     TanreiSegment("Month").tag("month").disabled(true)
///
/// `title` is the segment's text and its accessible name, required even when `.labelStyle(.iconOnly)` hides it (SEG-20,
/// SEG-22). `icon` is a glyph of the icon font by name, or an image of the product's own (`TanreiItemIcon`); give every
/// segment of a set an icon, or none. `disabled` follows `.disabled(_:)`: a disabled segment cannot be chosen or cleared,
/// the arrow keys skip it and it is never the Tab stop (SEG-3).
///
/// A segment draws nothing where it is written: the set draws it from what it reads.
public struct TanreiSegment: View {
  let title: String
  let icon: TanreiItemIcon?
  /// The value that selects it: set by `.tag(_:)`.
  var value: AnyHashable?
  /// `.labelStyle(.iconOnly)`: the spec's `labelHidden`.
  var labelHidden = false

  @Environment(\.isEnabled) private var isEnabled

  public init<S: StringProtocol>(_ title: S, icon: TanreiItemIcon? = nil) {
    self.title = String(title)
    self.icon = icon
    // SEG-22: still rendered, but an empty label is no name — reported in debug builds only.
    if TanreiSegmentedButtonRules.isBlank(self.title) {
      TanreiDiagnostics.report("Tanrei: a segment's label is empty, so it has no accessible name (SEG-22); give it a label")
    }
  }

  /// The segment's value (the spec's item prop `value`): the set's selection names the segment by it, and writing it is
  /// `change`. Apply it to the `TanreiSegment` itself, before any other modifier: the segment reads it, SwiftUI's own `tag`
  /// does not reach it (SEG-12 reports a segment without one in debug builds).
  public func tag<V: Hashable>(_ tag: V) -> TanreiSegment {
    var segment = self
    segment.value = AnyHashable(tag)
    return segment
  }

  /// `.labelStyle(.iconOnly)` draws the icon alone and keeps the title as the accessible name (the spec's `labelHidden`,
  /// SEG-20); any other style draws the title. Apply it to the `TanreiSegment` itself.
  public func labelStyle<S: LabelStyle>(_ style: S) -> TanreiSegment {
    var segment = self
    segment.labelHidden = style is IconOnlyLabelStyle
    return segment
  }

  public var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiSegmentEntryKey.self, TanreiSegmentEntry(title: title, icon: icon.drawn, labelHidden: labelHidden, isEnabled: isEnabled, value: value))
  }
}

/// One segment as the set reads it.
struct TanreiSegmentEntry: Equatable {
  let title: String
  /// The icon to draw; `nil` when there is none (an empty name included).
  let icon: TanreiItemIcon?
  let labelHidden: Bool
  let isEnabled: Bool
  let value: AnyHashable?

  init(title: String, icon: TanreiItemIcon? = nil, labelHidden: Bool = false, isEnabled: Bool = true, value: AnyHashable? = nil) {
    self.title = title
    self.icon = icon
    self.labelHidden = labelHidden
    self.isEnabled = isEnabled
    self.value = value
  }

  /// SEG-22: the label is drawn unless it is hidden AND there is an icon to draw instead.
  var drawsLabel: Bool { !labelHidden || icon == nil }

  static func == (lhs: TanreiSegmentEntry, rhs: TanreiSegmentEntry) -> Bool {
    lhs.title == rhs.title && (lhs.icon == nil) == (rhs.icon == nil) && lhs.labelHidden == rhs.labelHidden && lhs.isEnabled == rhs.isEnabled
      && lhs.value == rhs.value
  }
}

struct TanreiSegmentEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiSegmentEntry? { nil }
}

// MARK: - The rules, pure

/// The rules of a segmented button, pure, so they are tested without a keyboard or a render.
enum TanreiSegmentedButtonRules {
  /// SEG-22: the number of segments the set is made for. Fewer or more still render, and are reported.
  static let segmentRange = 2...5

  static func isBlank<S: StringProtocol>(_ text: S) -> Bool {
    text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  /// SEG-12: the segments drawn selected — for each value of the selection, the FIRST segment with that value. A value
  /// naming no segment selects nothing.
  static func selectedIndices(_ entries: [TanreiSegmentEntry], values: [AnyHashable]) -> Set<Int> {
    Set(values.compactMap { value in entries.indices.first { entries[$0].value == value } })
  }

  /// SEG-18, SEG-19, SEG-3: the one Tab stop. Single: the selected segment, or the first enabled one. Multiple: the segment
  /// that had focus last, or the first selected one, or the first enabled one. Never a disabled segment; `nil` when none is
  /// enabled.
  static func tabStop(_ entries: [TanreiSegmentEntry], selected: Set<Int>, isMultiple: Bool, lastFocused: Int?) -> Int? {
    func enabled(_ index: Int?) -> Int? {
      guard let index, entries.indices.contains(index), entries[index].isEnabled else { return nil }
      return index
    }
    let firstSelected = entries.indices.first { selected.contains($0) && entries[$0].isEnabled }
    let firstEnabled = entries.indices.first { entries[$0].isEnabled }
    if isMultiple { return enabled(lastFocused) ?? firstSelected ?? firstEnabled }
    return firstSelected ?? firstEnabled
  }

  /// SEG-1, SEG-2, SEG-3: what activating segment `index` changes. Single: its value becomes the selection, unless it is
  /// selected already — a single choice is never cleared by its own segment. Multiple: its value is added, or removed when
  /// it is selected. `nil` for a disabled segment, a segment without a value, or no change.
  static func change(_ entries: [TanreiSegmentEntry], activating index: Int, selected: Set<Int>, isMultiple: Bool) -> TanreiSegmentChange? {
    guard entries.indices.contains(index), entries[index].isEnabled, let value = entries[index].value else { return nil }
    let isSelected = selected.contains(index)
    if isMultiple { return isSelected ? .remove(value) : .insert(value) }
    return isSelected ? nil : .select(value)
  }

  /// The keys the set hears from a focused segment.
  static let keys: Set<KeyEquivalent> = [.leftArrow, .rightArrow, .upArrow, .downArrow, .home, .end]

  /// SEG-18, SEG-19, SEG-21: Right and Down Arrow are the next segment, Left and Up Arrow the previous one — Left and Right
  /// mirrored right to left —, Home and End the ends; as `TanreiRovingKeys` moves (down = next).
  static func movement(for key: KeyEquivalent, layoutDirection: LayoutDirection) -> KeyEquivalent? {
    let forward: KeyEquivalent = layoutDirection == .rightToLeft ? .leftArrow : .rightArrow
    let backward: KeyEquivalent = layoutDirection == .rightToLeft ? .rightArrow : .leftArrow
    switch key {
    case forward, .downArrow: return .downArrow
    case backward, .upArrow: return .upArrow
    case .home: return .home
    case .end: return .end
    default: return nil
    }
  }

  /// SEG-18, SEG-19: where `key` moves focus from segment `index` — the next or previous enabled segment, wrapping, or the
  /// first or last; disabled segments are skipped (SEG-3). `nil` when it is not one of the set's keys or none is enabled.
  static func target(for key: KeyEquivalent, from index: Int?, in entries: [TanreiSegmentEntry], layoutDirection: LayoutDirection) -> Int? {
    guard let movement = movement(for: key, layoutDirection: layoutDirection) else { return nil }
    let items = entries.map { TanreiRovingItem(focusable: $0.isEnabled, label: $0.title) }
    return TanreiRovingKeys(wraps: true).target(for: movement, from: index, in: items)
  }

  /// SEG-12, SEG-22: a selection naming no segment, segments without a value, with an empty value or sharing one, hidden
  /// labels without an icon, an unnamed set, and a set of fewer than two or more than five segments.
  static func problems(_ entries: [TanreiSegmentEntry], values: [AnyHashable], labelIsEmpty: Bool) -> [String] {
    var problems: [String] = []
    var seen: Set<AnyHashable> = []
    var reported: Set<AnyHashable> = []
    for (index, entry) in entries.enumerated() {
      guard let value = entry.value else {
        problems.append("segment \(index + 1) (\"\(entry.title)\") has no value (apply .tag(_:) to the TanreiSegment itself), so it cannot be chosen (SEG-12)")
        continue
      }
      if value == AnyHashable("") {
        problems.append("segment \(index + 1) (\"\(entry.title)\") has an empty value; give every segment a unique value (SEG-12)")
      }
      if !seen.insert(value).inserted && reported.insert(value).inserted {
        problems.append("the value \"\(value.base)\" is given to more than one segment; the first of them is the one it selects (SEG-12)")
      }
    }
    if !entries.isEmpty {
      for value in values where !entries.contains(where: { $0.value == value }) {
        problems.append("the value \"\(value.base)\" names no segment; nothing is selected for it (SEG-12)")
      }
    }
    for (index, entry) in entries.enumerated() where entry.labelHidden && entry.icon == nil {
      problems.append("segment \(index + 1) (\"\(entry.title)\") hides its label but has no icon, so its label is drawn anyway (SEG-22)")
    }
    if labelIsEmpty {
      problems.append("its label is empty, so the set has no accessible name; give it the question its options answer (SEG-22)")
    }
    if !segmentRange.contains(entries.count) {
      problems.append("it holds \(entries.count) segments; it is made for \(segmentRange.lowerBound) to \(segmentRange.upperBound) (SEG-22)")
    }
    return problems
  }

  /// SEG-20: a single-choice segment's position in the set and the set's size, as its accessibility value (iOS has no radio
  /// role and no position of its own outside a tab bar; in English). A
  /// multiple-choice segment states none: its value is the toggle's on / off, which any value of its own would replace.
  static func positionText(index: Int, count: Int, isMultiple: Bool) -> String? {
    isMultiple ? nil : "\(index + 1) of \(count)"
  }

  /// SEG-20: a single-choice segment is a button with the selected trait while it is selected (iOS has no radio role); a
  /// multiple-choice segment is a toggle button, on while it is selected.
  static func traits(isMultiple: Bool, isSelected: Bool) -> AccessibilityTraits {
    var traits: AccessibilityTraits = isSelected ? .isSelected : []
    if isMultiple { traits.formUnion(.isToggle) }
    return traits
  }
}

// MARK: - The set

/// The set: its fill, the segments laid out equally (SEG-13, SEG-14), the dividers between them (SEG-17), its outline over
/// them (SEG-13), the keyboard (SEG-18, SEG-19) and the semantics of the group (SEG-20).
struct TanreiSegmentedSetView: View {
  let entries: [TanreiSegmentEntry]
  let selection: TanreiSegmentedSelection
  let size: TanreiSegmentedButtonSize
  let label: Text
  let labelIsEmpty: Bool

  @Environment(\.tanreiSystem) private var system
  @Environment(\.layoutDirection) private var layoutDirection
  @TanreiPalette private var colors
  @FocusState private var focused: Int?
  /// SEG-19: the segment that had focus last, the multiple-choice set's Tab stop while it is enabled.
  @State private var lastFocused: Int?

  var body: some View {
    let tokens = system.segmentedButton
    let problems = TanreiSegmentedButtonRules.problems(entries, values: selection.values, labelIsEmpty: labelIsEmpty)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report("Tanrei: a segmented button: \($0)") }
    }
    // SEG-8: the lookup is total — a size this design system does not have reads medium's tokens (and is reported).
    let metrics = tokens.sizes[size]
    let selected = TanreiSegmentedButtonRules.selectedIndices(entries, values: selection.values)
    let tabStop = TanreiSegmentedButtonRules.tabStop(entries, selected: selected, isMultiple: selection.isMultiple, lastFocused: lastFocused)
    let style = system.shape.roundedCornerStyle
    let setShape = TanreiCornerShape(cornerRadius: tokens.setShape, style: style)
    let layout = TanreiSegmentedSetLayout(
      padding: tokens.setPadding, dividerWidth: tokens.dividerWidth, minimumWidth: TanreiHitTarget.minimum(in: system.measure),
      minimumHeight: metrics.containerHeight)
    layout {
      // SEG-13: the set's fill, under everything.
      setShape
        .fill(colors[tokens.setColor])
        .layoutValue(key: TanreiSegmentedPartKey.self, value: .track)
        .accessibilityHidden(true)
      // SEG-17: the lines between segments, in their own color whatever either segment's state; decorative.
      ForEach(Array(entries.indices.dropLast()), id: \.self) { index in
        Rectangle()
          .fill(colors[tokens.dividerColor])
          .layoutValue(key: TanreiSegmentedPartKey.self, value: .divider(index))
          .accessibilityHidden(true)
      }
      ForEach(entries.indices, id: \.self) { index in
        segment(index, selected: selected, tabStop: tabStop)
          .layoutValue(key: TanreiSegmentedPartKey.self, value: .segment(index))
          // SEG-24: a selected segment casts its elevation above its neighbours; SEG-5: a keyboard-focused one is above
          // the outline, so that nothing covers the ring inside it.
          .zIndex(TanreiSegmentedLayers.segment(isSelected: selected.contains(index), isFocused: focused == index))
      }
      // SEG-13, SEG-7: the outline inside the set's edge, over the segments' fills; not a state token, so a disabled
      // segment keeps its boundary.
      setShape
        .strokeBorder(colors[tokens.outlineColor], lineWidth: tokens.outlineWidth)
        .allowsHitTesting(false)
        .layoutValue(key: TanreiSegmentedPartKey.self, value: .outline)
        .zIndex(TanreiSegmentedLayers.outline)
        .accessibilityHidden(true)
    }
    .onChange(of: focused) { _, now in
      if let now { lastFocused = now }
    }
    // SEG-20: a radio group (single) or a group (multiple), named by the set's label. SwiftUI has neither role: the set is
    // a container named by its label, its segments buttons with their state and position.
    .accessibilityElement(children: .contain)
    .modifier(TanreiSegmentedButtonName(label: label, isEmpty: labelIsEmpty))
  }

  private func segment(_ index: Int, selected: Set<Int>, tabStop: Int?) -> some View {
    let entry = entries[index]
    let isSelected = selected.contains(index)
    return TanreiSegmentView(
      entry: entry, size: size, position: TanreiSegmentPosition(index: index, count: entries.count), isSelected: isSelected,
      isMultiple: selection.isMultiple, isTabStop: index == tabStop, focus: $focused,
      activate: { activate(index, selected: selected) },
      move: { key in
        // SEG-18, SEG-19: the arrows (wrapping, mirrored right to left), Home and End move focus; with a single choice each
        // move also selects the segment it reaches.
        guard let target = TanreiSegmentedButtonRules.target(for: key, from: index, in: entries, layoutDirection: layoutDirection) else {
          return false
        }
        if !selection.isMultiple { activate(target, selected: selected) }
        Task { @MainActor in focused = target }
        return true
      })
  }

  /// SEG-1, SEG-2, SEG-3: the single route to the binding — once per activation, never for a disabled segment, never for
  /// the selected segment of a single choice.
  private func activate(_ index: Int, selected: Set<Int>) {
    guard let change = TanreiSegmentedButtonRules.change(entries, activating: index, selected: selected, isMultiple: selection.isMultiple) else {
      return
    }
    selection.apply(change)
  }
}

private struct TanreiSegmentedButtonName: ViewModifier {
  let label: Text
  let isEmpty: Bool

  func body(content: Content) -> some View {
    if isEmpty { content } else { content.accessibilityLabel(label) }
  }
}

/// The drawing order inside the set (SEG-5, SEG-13, SEG-24): the fill and the dividers, the segments — a selected one
/// above its neighbours —, the outline, and above it a keyboard-focused segment. An order, not a design value.
enum TanreiSegmentedLayers {
  static let outline: Double = 3

  static func segment(isSelected: Bool, isFocused: Bool) -> Double {
    if isFocused { return 4 }
    return isSelected ? 2 : 1
  }
}

/// Which part of the set a subview of `TanreiSegmentedSetLayout` is.
enum TanreiSegmentedPart: Equatable {
  case track
  case outline
  case divider(Int)
  case segment(Int)
}

struct TanreiSegmentedPartKey: LayoutValueKey {
  static let defaultValue: TanreiSegmentedPart? = nil
}

/// SEG-6, SEG-13, SEG-14, SEG-17: the set's layout. Every segment one width — the widest segment's content measured as if
/// selected, plus its padding, and at least `minimumWidth` (the minimum target: neighbours cannot reach over each other) —;
/// a width it is offered divided equally (labels wrap where it is less). The segments are inset by `padding`,
/// `dividerWidth` apart, and as tall as the tallest (at least `minimumHeight` less the padding); the set is that plus the
/// padding. The dividers fill the gaps from the top padding to the bottom padding; the fill and the outline span the set.
/// Stateless, so it is right on the first layout pass; SwiftUI mirrors it right to left (SEG-21).
struct TanreiSegmentedSetLayout: Layout {
  let padding: CGFloat
  let dividerWidth: CGFloat
  let minimumWidth: CGFloat
  let minimumHeight: CGFloat

  private func segments(_ subviews: Subviews) -> [LayoutSubview] {
    subviews.filter { if case .segment = $0[TanreiSegmentedPartKey.self] { return true } else { return false } }
  }

  /// The space the set takes besides its segments: the padding on both sides and the dividers between them.
  private func fixed(count: Int) -> CGFloat {
    2 * padding + CGFloat(max(0, count - 1)) * dividerWidth
  }

  /// SEG-14, SEG-6: the width of every segment.
  func segmentWidth(proposal: ProposedViewSize, segments: [LayoutSubview]) -> CGFloat {
    guard !segments.isEmpty else { return .zero }
    if let width = proposal.width, width.isFinite {
      return max(minimumWidth, (width - fixed(count: segments.count)) / CGFloat(segments.count))
    }
    let widest = segments.map { $0.sizeThatFits(.unspecified).width }.max() ?? .zero
    return max(minimumWidth, widest)
  }

  /// SEG-13, SEG-14: the height of every segment — the tallest at that width, at least the size's height less the padding.
  func segmentHeight(width: CGFloat, segments: [LayoutSubview]) -> CGFloat {
    let tallest = segments.map { $0.sizeThatFits(ProposedViewSize(width: width, height: nil)).height }.max() ?? .zero
    return max(minimumHeight - 2 * padding, tallest)
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let segments = segments(subviews)
    let width = segmentWidth(proposal: proposal, segments: segments)
    let height = segmentHeight(width: width, segments: segments)
    return CGSize(width: fixed(count: segments.count) + CGFloat(segments.count) * width, height: height + 2 * padding)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let segments = segments(subviews)
    let width = segmentWidth(proposal: ProposedViewSize(width: bounds.width, height: nil), segments: segments)
    let height = segmentHeight(width: width, segments: segments)
    let set = CGSize(width: fixed(count: segments.count) + CGFloat(segments.count) * width, height: height + 2 * padding)
    let origin = CGPoint(x: bounds.minX, y: bounds.midY - set.height / 2)
    func x(of index: Int) -> CGFloat { origin.x + padding + CGFloat(index) * (width + dividerWidth) }
    for subview in subviews {
      switch subview[TanreiSegmentedPartKey.self] {
      case .track, .outline:
        subview.place(at: origin, anchor: .topLeading, proposal: ProposedViewSize(set))
      case .divider(let index):
        subview.place(
          at: CGPoint(x: x(of: index) + width, y: origin.y + padding), anchor: .topLeading,
          proposal: ProposedViewSize(width: dividerWidth, height: height))
      case .segment(let index):
        subview.place(
          at: CGPoint(x: x(of: index), y: origin.y + padding), anchor: .topLeading, proposal: ProposedViewSize(width: width, height: height))
      case nil:
        subview.place(at: origin, anchor: .topLeading, proposal: .zero)
      }
    }
  }
}

// MARK: - One segment

/// Where a segment stands in its set: the first and last have the set's outer corners (SEG-13) and each states its
/// position (SEG-20).
struct TanreiSegmentPosition: Equatable {
  let index: Int
  let count: Int

  var isFirst: Bool { index == 0 }
  var isLast: Bool { index == count - 1 }
}

/// One segment: a button drawn by `TanreiSegmentStyle`, activated by pointer, touch, Enter and Space, over a hidden copy of
/// its visual measured as if selected, which alone gives it its layout size (SEG-14) while the button's hit area reaches
/// the minimum target above and below the set (SEG-6, `TanreiMinimumHitTarget`).
private struct TanreiSegmentView: View {
  let entry: TanreiSegmentEntry
  let size: TanreiSegmentedButtonSize
  let position: TanreiSegmentPosition
  let isSelected: Bool
  let isMultiple: Bool
  let isTabStop: Bool
  let focus: FocusState<Int?>.Binding
  let activate: @MainActor () -> Void
  /// Handles a movement key; whether it was one.
  let move: @MainActor (KeyEquivalent) -> Bool

  /// Counts activations by key: each one starts a press that no pointer held down (SEG-9).
  @State private var keyboardPresses = 0

  var body: some View {
    TanreiMinimumHitTarget {
      TanreiSegmentChrome(entry: entry, size: size, position: position, isSelected: isSelected, isPressed: false, isFocused: false, measures: true)
    } control: {
      Button(action: activate) { Text(verbatim: entry.title) }
        .buttonStyle(
          TanreiSegmentStyle(
            entry: entry, size: size, position: position, isSelected: isSelected, isFocused: focus.wrappedValue == position.index,
            keyboardPresses: keyboardPresses))
        .disabled(!entry.isEnabled)
        // Tanrei draws its own ring (SEG-5); the system focus effect would double it.
        .focusEffectDisabled()
        .focused(focus, equals: position.index)
        // SEG-18, SEG-19: one Tab stop (SEG-3: never a disabled segment).
        .focusable(isTabStop)
        .onKeyPress(keys: TanreiSegmentedButtonRules.keys, phases: .down) { press in
          move(press.key) ? .handled : .ignored
        }
        // SEG-1, SEG-2, SEG-9: Enter and Space activate, once per key press, and show the press from the center.
        .tanreiKeyActivation(isEnabled: entry.isEnabled) {
          keyboardPresses += 1
          activate()
        }
        // SEG-20: named by its label, drawn or not; selected (single) or a toggle that is on (multiple).
        .accessibilityLabel(Text(verbatim: entry.title))
        .accessibilityAddTraits(TanreiSegmentedButtonRules.traits(isMultiple: isMultiple, isSelected: isSelected))
    }
    // SEG-20: a single choice's position, on the segment's one element. Applied here, around the hit target, not on the
    // button: a conditional modifier on the button makes SwiftUI place it again at its own grown size, which the segment
    // would then be drawn at.
    .modifier(TanreiOptionalAccessibilityValue(value: TanreiSegmentedButtonRules.positionText(index: position.index, count: position.count, isMultiple: isMultiple)))
  }
}

struct TanreiSegmentStyle: ButtonStyle {
  let entry: TanreiSegmentEntry
  let size: TanreiSegmentedButtonSize
  let position: TanreiSegmentPosition
  let isSelected: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiSegmentHitArea {
      TanreiSegmentChrome(
        entry: entry, size: size, position: position, isSelected: isSelected, isPressed: configuration.isPressed, isFocused: isFocused,
        keyboardPresses: keyboardPresses)
    }
  }
}

/// SEG-6: the segment's hit area — at least the minimum target on both axes, centred on the segment — while the segment is
/// drawn at exactly the size its set proposed. (`tanreiHitTargetExpansion()` would propose the grown size to the segment,
/// which fills what it is proposed, so the segment would be drawn a target tall.)
private struct TanreiSegmentHitArea<Content: View>: View {
  @ViewBuilder let content: Content
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    TanreiSegmentHitLayout(minimum: TanreiHitTarget.minimum(in: system.measure)) { content }
      .contentShape(.interaction, Rectangle())
  }
}

/// At least `minimum` on both axes; its one subview is proposed what the layout was proposed and centred in it.
struct TanreiSegmentHitLayout: Layout {
  let minimum: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let size = subviews.first?.sizeThatFits(proposal) ?? .zero
    return CGSize(width: max(size.width, minimum), height: max(size.height, minimum))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let subview = subviews.first else { return }
    subview.place(at: CGPoint(x: bounds.midX, y: bounds.midY), anchor: .center, proposal: proposal)
  }
}

/// The visual of one segment: its content (the leading glyph and the label), its container with the state layer, the
/// ripple and the focus ring inside it, drawn from the tokens of the one resolved state of its condition.
struct TanreiSegmentChrome: View {
  let entry: TanreiSegmentEntry
  let size: TanreiSegmentedButtonSize
  let position: TanreiSegmentPosition
  let isSelected: Bool
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (SEG-4, SEG-5).
  let isFocused: Bool
  var keyboardPresses = 0
  /// The hidden sizing copy: the content measured as if selected (SEG-14), with nothing drawn around it.
  var measures = false

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    if measures {
      let tokens = theme.system.segmentedButton
      let appearance = TanreiSegmentAppearance(tokens: tokens, isSelected: true, state: .enabled)
      content(tokens: tokens, appearance: appearance, lead: .measured)
    } else {
      let feedback = theme.system.behavior.pressedFeedback
      // SEG-9: a press stays visible at least `duration.press-hold`; SEG-10: the point of contact only under `ripple`.
      TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
        chrome(press: press, feedback: feedback)
      }
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let system = theme.system
    let tokens = system.segmentedButton
    // SEG-4: exactly one state — pressed > focused > hovered; SEG-7: disabled is a state too.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiSegmentAppearance(tokens: tokens, isSelected: isSelected, state: state, feedback: feedback, beneath: beneath)
    let corners = TanreiSegmentCorners(tokens: tokens, inner: appearance.cornerRadius, position: position)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let ring = TanreiFocusRingMetrics(containerCornerRadius: corners.largest, measure: system.measure)
    let inset = max(.zero, ring.outerOutset)
    return content(tokens: tokens, appearance: appearance, lead: isSelected ? .selected : .unselected)
      // SEG-13: the segment's fill and elevation, its corners (the set's less its padding at the ends, eased by the corner
      // smoothing, SEG-11), the ripple clipped to them (SEG-10), and the state's opacity on the whole segment.
      .background {
        TanreiSegmentSurface(fill: colors[appearance.container], elevation: appearance.elevation, corners: corners, ripple: ripple)
      }
      .compositingGroup()
      .opacity(appearance.opacity)
      // SEG-23: a change of state over the state motion; SEG-16: a change of condition over the selection motion. At once
      // under Reduce Motion.
      .tanreiSelectionAnimation(tokens.motion(reduceMotion: reduceMotion), condition: isSelected, state: state)
      // SEG-5: the ring inside the segment — its outer edge on the segment's edge —, keyboard focus only, never animated,
      // never dimmed.
      .overlay {
        Color.clear
          .tanreiFocusRing(isFocused && isEnabled, cornerRadius: max(.zero, corners.largest - inset))
          .padding(inset)
      }
      .onHover { isHovered = $0 }
  }

  /// SEG-15, SEG-16: the leading glyph — the icon, or the check in its place — then the label, centred in the segment and
  /// padded by the size's paddings; the glyph beside the label's first line. SwiftUI mirrors it right to left (SEG-21).
  private func content(tokens: TanreiSegmentedButtonTokens, appearance: TanreiSegmentAppearance, lead: TanreiSegmentGeometry.Lead) -> some View {
    let metrics = tokens.sizes[size]
    let geometry = TanreiSegmentGeometry(entry: entry, metrics: metrics)
    let line = metrics.labelTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let shown: CGFloat = isSelected && geometry.drawsCheck ? 1 : 0
    let iconColor = colors[appearance.icon]
    return HStack(alignment: .top, spacing: .zero) {
      if geometry.arrangement != .labelOnly || geometry.drawsCheck {
        // Width in the row; as tall as the label's line (the icon box alone in an icon-only segment), so it never grows the
        // segment. The glyph is centred in it, at the leading edge; the gap is inside it.
        Color.clear
          .frame(width: geometry.leadWidth(lead), height: geometry.arrangement == .iconOnly ? geometry.glyphBox : line)
          .overlay(alignment: .leading) {
            glyphs(geometry: geometry, metrics: metrics, shown: shown, color: iconColor)
          }
          .accessibilityHidden(true)
      }
      if entry.drawsLabel {
        // SEG-14: the label wraps rather than truncates, centred; SEG-15: in the size's label style and the label color of
        // the condition and state.
        Text(verbatim: entry.title)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(metrics.labelTypescale)
          .foregroundStyle(colors[appearance.label])
      }
    }
    .padding(.horizontal, metrics.containerPaddingInline)
    .padding(.vertical, metrics.containerPaddingBlock)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  /// SEG-15, SEG-16: the icon at the size's icon size, in the family and fill of the segment's condition, and the check at
  /// the check size in the same color, taking the icon's place as it shows (the filter chip's check, CHP-13, CHP-14).
  @ViewBuilder
  private func glyphs(geometry: TanreiSegmentGeometry, metrics: TanreiSegmentedButtonSizeTokens, shown: CGFloat, color: Color) -> some View {
    ZStack(alignment: .leading) {
      if let icon = entry.icon {
        TanreiItemIconView(icon: icon, size: metrics.iconSize, selected: isSelected)
          .opacity(Double(TanreiCheckboxMarkShape.drawn - shown))
      }
      if geometry.drawsCheck {
        TanreiChipGlyph(kind: .check, progress: shown)
          .tanreiIconContext(size: metrics.checkSize, selected: true)
      }
    }
    .foregroundStyle(color)
  }
}

/// The fill, elevation and ripple of one segment, in its own corners (SEG-13): the ends' outer corners are the set's less
/// its padding, every other corner the state's `container.shape`. The shadows are cast by `TanreiElevationSurface` in the
/// largest of the corners (it has one radius), the fill and the ripple in the segment's own.
private struct TanreiSegmentSurface: View {
  let fill: Color
  let elevation: [TanreiShadowLayer]
  let corners: TanreiSegmentCorners
  let ripple: TanreiContainerRipple?

  @Environment(\.tanreiSystem) private var system

  var body: some View {
    let shape = TanreiSegmentShape(corners: corners, style: system.shape.roundedCornerStyle)
    ZStack {
      TanreiElevationSurface(elevation, fill: .clear, cornerRadius: corners.largest)
      shape.fill(fill)
      if let ripple {
        TanreiRipple(origin: ripple.origin, color: ripple.color, animation: ripple.growth, startsGrown: ripple.startsGrown)
          .clipShape(shape)
          .id(ripple.generation)
          .transition(.opacity)
          .allowsHitTesting(false)
      }
    }
    .accessibilityHidden(true)
  }
}

/// SEG-13: the corners of one segment — its leading pair and its trailing pair.
struct TanreiSegmentCorners: Equatable {
  let leading: CGFloat
  let trailing: CGFloat

  init(leading: CGFloat, trailing: CGFloat) {
    self.leading = leading
    self.trailing = trailing
  }

  /// The first segment's leading corners and the last one's trailing corners are the set's less its padding (concentric
  /// with the set's); every other corner is `inner`, the state's `container.shape`.
  init(tokens: TanreiSegmentedButtonTokens, inner: CGFloat, position: TanreiSegmentPosition) {
    let outer = max(.zero, tokens.setShape - tokens.setPadding)
    leading = position.isFirst ? outer : inner
    trailing = position.isLast ? outer : inner
  }

  var largest: CGFloat { max(leading, trailing) }
}

/// A rectangle with rounded leading and trailing corner pairs, eased by `style` — except where a corner reaches half the
/// shorter side: that end is then a round cap at every smoothing, as `TanreiCornerShape` draws a pill (SWT-9's rule;
/// SwiftUI's `.continuous` style would draw a different pill). SwiftUI mirrors it right to left.
struct TanreiSegmentShape: Shape {
  let corners: TanreiSegmentCorners
  let style: RoundedCornerStyle

  func path(in rect: CGRect) -> Path {
    let half = min(rect.width, rect.height) / 2
    let leading = min(max(.zero, corners.leading), half)
    let trailing = min(max(.zero, corners.trailing), half)
    let capped = leading >= half || trailing >= half
    return UnevenRoundedRectangle(
      topLeadingRadius: leading, bottomLeadingRadius: leading, bottomTrailingRadius: trailing, topTrailingRadius: trailing,
      style: capped ? .circular : style
    )
    .path(in: rect)
  }
}

/// SEG-14, SEG-15, SEG-16: what a segment's content holds and how wide its leading glyph is.
struct TanreiSegmentGeometry: Equatable {
  enum Arrangement: Equatable {
    case labelOnly
    case iconAndLabel
    /// `labelHidden` with an icon: the icon alone, never a check.
    case iconOnly
  }

  /// Which width the leading glyph takes.
  enum Lead: Equatable {
    case unselected
    case selected
    /// SEG-14: as if selected, the check or the icon whichever is wider — what the set measures.
    case measured
  }

  let arrangement: Arrangement
  /// SEG-16: a selected segment draws the check before its label — not in an icon-only segment, nor where the size's check
  /// size is 0.
  let drawsCheck: Bool
  let iconSize: CGFloat
  let checkSize: CGFloat
  let gap: CGFloat

  init(entry: TanreiSegmentEntry, metrics: TanreiSegmentedButtonSizeTokens) {
    switch (entry.icon != nil, entry.drawsLabel) {
    case (true, false): arrangement = .iconOnly
    case (true, true): arrangement = .iconAndLabel
    default: arrangement = .labelOnly
    }
    drawsCheck = arrangement != .iconOnly && metrics.checkSize > .zero
    iconSize = metrics.iconSize
    checkSize = metrics.checkSize
    gap = metrics.containerGap
  }

  /// The box the glyph is centred in: the icon's, or the check's when there is no icon.
  var glyphBox: CGFloat { arrangement == .labelOnly ? checkSize : iconSize }

  /// The width the leading glyph and the gap after it take in the row.
  func leadWidth(_ lead: Lead) -> CGFloat {
    switch arrangement {
    case .iconOnly:
      return iconSize
    case .iconAndLabel:
      switch lead {
      case .unselected: return iconSize + gap
      case .selected: return (drawsCheck ? checkSize : iconSize) + gap
      case .measured: return max(iconSize, drawsCheck ? checkSize : .zero) + gap
      }
    case .labelOnly:
      guard drawsCheck, lead != .unselected else { return .zero }
      return checkSize + gap
    }
  }
}

// MARK: - Token bindings

extension TanreiSegmentedButtonTokens {
  /// How the SEG-10 ripple grows: over `motion.feedback-duration`, with the state easing. `nil` under Reduce Motion — the
  /// layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SEG-23 (a change of state: the state motion) and SEG-16 (a change of condition: the selection motion).
  func motion(reduceMotion: Bool) -> TanreiSelectionMotion {
    TanreiSelectionMotion(
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a segment draws for one condition × state. Pure data read from a `TanreiSegmentedButtonTokens`, so the
/// bindings can be tested without rendering. SEG-4 / SEG-7: every state, disabled included, is drawn from that state's
/// tokens of the segment's condition (SEG-12: selected or unselected).
struct TanreiSegmentAppearance: Equatable {
  let container: TanreiPaint
  /// SEG-10 `ripple`: the pressed container paint of the condition, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let elevation: [TanreiShadowLayer]
  let label: TanreiPaint
  /// The icon's color, and the check's (SEG-16).
  let icon: TanreiPaint
  /// Opacity of the whole segment.
  let opacity: Double
  /// The corners where the segment meets its neighbours.
  let cornerRadius: CGFloat

  init(
    tokens: TanreiSegmentedButtonTokens, isSelected: Bool, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let condition = tokens.conditions[isSelected ? TanreiSegmentedButtonCondition.selected : .unselected]
    let own = condition[state: layers.state]
    container = condition[state: layers.container].containerColor
    ripple = layers.ripple.map { condition[state: $0].containerColor }
    elevation = own.containerElevation
    label = own.labelColor
    icon = own.iconColor
    // (The condition's `state-layer.color` is not read: it is what the design system mixed into this state's container.)
    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: a segment at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    cornerRadius = shared?.containerShape ?? tokens.containerShape
  }
}

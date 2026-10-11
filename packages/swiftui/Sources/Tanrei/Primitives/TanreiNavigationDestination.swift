import SwiftUI

// The destinations of a navigation bar and a navigation rail (NVB-*, NVR-*): the same item structure in both, each
// component with its own tokens. A component maps its generated tokens into a `TanreiDestinationStyle`; everything one
// destination does — its cell and hit area, the item container that carries the state answer and is the active
// indicator, its icon and badge, its label, the selection motion and its semantics — is drawn here once. What the whole
// region decides (which destination is selected, what an activation emits, the debug reports) is
// `TanreiDestinationRules`, pure. No design value lives here: every one is handed in.
//
// A destination is read as data, as a tab is: the item view (`TanreiNavigationBarItem`) puts a `TanreiDestinationEntry`
// into a trait of its own view — `.disabled(_:)` applied to it is seen — and the region draws every destination itself.

// MARK: - The entry

/// One destination as its region reads it (the spec's item kind `destination`).
struct TanreiDestinationEntry {
  let title: String
  /// The icon to draw; `nil` when there is none (an empty name included).
  let icon: TanreiItemIcon?
  let value: AnyHashable
  let badge: TanreiNavigationBadge?
  let isEnabled: Bool

  init(title: String, icon: TanreiItemIcon? = nil, value: AnyHashable, badge: TanreiNavigationBadge? = nil, isEnabled: Bool = true) {
    self.title = title
    self.icon = icon
    self.value = value
    self.badge = badge
    self.isEnabled = isEnabled
  }
}

struct TanreiDestinationEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiDestinationEntry? { nil }
}

/// What an item view draws where it is written: nothing, and its entry in a trait the region reads. It reads
/// `isEnabled` here, so `.disabled(_:)` on the item reaches the region.
struct TanreiDestinationTrait: View {
  let title: String
  let icon: TanreiItemIcon?
  let value: AnyHashable
  let badge: TanreiNavigationBadge?

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiDestinationEntryKey.self, TanreiDestinationEntry(title: title, icon: icon.drawn, value: value, badge: badge, isEnabled: isEnabled))
  }
}

/// Reads a region's content — every destination's trait, in order — and hands them to `body`.
struct TanreiDestinationsRoot<Region: View>: _VariadicView_UnaryViewRoot {
  let region: ([TanreiDestinationEntry]) -> Region

  func body(children: _VariadicView.Children) -> some View {
    region(children.compactMap { $0[TanreiDestinationEntryKey.self] })
  }
}

// MARK: - The rules, pure

/// What activating a destination emits (NVB-1, NVR-1).
enum TanreiDestinationActivation: Equatable {
  /// Another destination than the selected one: the region's value becomes its value.
  case change(AnyHashable)
  /// The selected destination again.
  case reselect(AnyHashable)
}

/// The ids a region's debug reports cite, and how many destinations it is made for.
struct TanreiDestinationReportIds {
  let unknownValue: String
  let emptyLabel: String
  let duplicate: String
  let count: String
  let range: ClosedRange<Int>
}

/// The rules of a region's destinations, pure, so they are tested without a render.
enum TanreiDestinationRules {
  /// Whether a selection selects nothing on purpose: `nil`, or an empty string (the spec's empty `value`).
  static func isEmpty(_ selection: AnyHashable?) -> Bool {
    guard let selection else { return true }
    if let string = selection.base as? String { return string.isEmpty }
    return false
  }

  /// NVB-3, NVB-22: the destination the selection selects — the FIRST whose value equals it; none for an empty
  /// selection or one that names no destination.
  static func selectedIndex(_ entries: [TanreiDestinationEntry], selection: AnyHashable?) -> Int? {
    guard !isEmpty(selection), let selection else { return nil }
    return entries.firstIndex { $0.value == selection }
  }

  /// NVB-1, NVB-2: what activating destination `index` emits — `change` for one that is not selected, `reselect` for the
  /// selected one, nothing for a disabled one (or an index out of range).
  static func activation(_ entries: [TanreiDestinationEntry], activating index: Int, selected: Int?) -> TanreiDestinationActivation? {
    guard entries.indices.contains(index), entries[index].isEnabled else { return nil }
    let value = entries[index].value
    return index == selected ? .reselect(value) : .change(value)
  }

  /// NVB-3, NVB-17, NVB-20, NVB-22 (and the rail's): a selection naming no destination, a count outside the range, a
  /// destination without a label, a value two destinations share. A consistent region reports nothing.
  static func problems(_ entries: [TanreiDestinationEntry], selection: AnyHashable?, ids: TanreiDestinationReportIds) -> [String] {
    var problems: [String] = []
    if !isEmpty(selection), let selection, !entries.isEmpty, !entries.contains(where: { $0.value == selection }) {
      problems.append("the value \"\(selection.base)\" names none of its destinations, so none is drawn selected (\(ids.unknownValue))")
    }
    var seen: Set<AnyHashable> = []
    var reported: Set<AnyHashable> = []
    for entry in entries where !seen.insert(entry.value).inserted && reported.insert(entry.value).inserted {
      problems.append("the value \"\(entry.value.base)\" is given to more than one destination; the first of them is the one it selects (\(ids.duplicate))")
    }
    for entry in entries where entry.title.trimmingCharacters(in: .whitespaces).isEmpty {
      problems.append("a destination (value \"\(entry.value.base)\") has an empty label, so it has no accessible name (\(ids.emptyLabel)); give it a label")
    }
    if !entries.isEmpty, !ids.range.contains(entries.count) {
      problems.append("it holds \(entries.count) destinations; it is made for \(ids.range.lowerBound) to \(ids.range.upperBound) (\(ids.count))")
    }
    return problems
  }

  /// NVB-19: a destination's position and the number of destinations, where the platform does not state it itself
  /// (in English). On iOS a container with the tab bar trait makes VoiceOver
  /// say "tab, 2 of 4" itself, so there is none.
  static func positionText(index: Int, count: Int) -> String? {
    #if os(iOS)
    nil
    #else
    "\(index + 1) of \(count)"
    #endif
  }

  /// NVB-16: the badge's description — its label, or the displayed count when the label is empty; nothing for a count of
  /// 0 or a dot without a label (the badge component's own rule, BDG-8).
  static func badgeDescription(_ badge: TanreiNavigationBadge?, locale: Locale) -> String? {
    guard let badge else { return nil }
    let input = TanreiBadgeInput(count: badge.count, max: TanreiBadge<EmptyView>.defaultMax, label: badge.label)
    return TanreiBadgeContent(count: input.count, max: input.max, locale: locale).accessibilityValue(label: badge.label)
  }

  /// NVB-16, NVB-19: what a destination adds after its name and state — its position (where the platform does not say
  /// it), then its badge's description.
  static func accessibilityValue(position: String?, badge: String?) -> String? {
    let parts = [position, badge].compactMap { $0 }
    return parts.isEmpty ? nil : parts.joined(separator: ", ")
  }
}

// MARK: - Token bindings

/// A destination's item container, icon and label paints in one condition (selected or not) and one interaction state.
struct TanreiDestinationParts: Equatable {
  let container: TanreiPaint
  let icon: TanreiPaint
  let label: TanreiPaint
}

/// What a region's destinations are drawn from: its own tokens, mapped by the component.
struct TanreiDestinationStyle {
  let containerWidth: CGFloat
  let containerHeight: CGFloat
  let containerShape: CGFloat
  /// From the item container to the label under it.
  let gap: CGFloat
  let iconSize: CGFloat
  let labelTypescale: TanreiTextStyle
  /// The lines a label may take before it is truncated at its end: one in a bar (NVB-12), two in a rail (NVR-13).
  let labelLineLimit: Int
  let feedbackDuration: Double
  let stateDuration: Double
  let stateEasing: TanreiCubicBezier
  let selectionDuration: Double
  let selectionEasing: TanreiCubicBezier
  /// The parts of a condition (selected or not) in a state (NVB-3).
  let parts: (_ selected: Bool, _ state: TanreiInteraction) -> TanreiDestinationParts
  /// The opacity of the whole destination in a state; `nil` for a state without one (at rest).
  let opacity: (_ state: TanreiInteraction) -> Double?

  /// NVB-4 … NVB-7: a change of state over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: stateDuration, easing: stateEasing, reduceMotion: reduceMotion)
  }

  /// NVB-15: a change of selection — the indicator's growth and fade, colors, labels coming and going — over the selection
  /// motion; `nil` under Reduce Motion (the new selection is shown at once).
  func selectionMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: selectionDuration, easing: selectionEasing, reduceMotion: reduceMotion)
  }

  /// NVB-9 `ripple`: grows over the feedback duration with the state easing; `nil` under Reduce Motion (it appears whole).
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: feedbackDuration, easing: stateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a destination draws for one condition × state, under `sys.behavior.pressed-feedback`. Pure data, so
/// the bindings are tested without rendering. NVB-4, NVB-7: every state, disabled included, is drawn from that state's
/// tokens of the destination's condition (NVB-3); NVB-9: under ripple and dim only the item container stays with the state
/// under the press.
struct TanreiDestinationAppearance: Equatable {
  /// The item container: the state layer's box and, while selected, the active indicator.
  let container: TanreiPaint
  /// NVB-9 `ripple`: the pressed item container paint of the condition, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  let icon: TanreiPaint
  let label: TanreiPaint
  /// The opacity of the whole destination.
  let opacity: Double

  init(style: TanreiDestinationStyle, isSelected: Bool, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let parts = style.parts(isSelected, layers.state)
    container = style.parts(isSelected, layers.container).container
    ripple = layers.ripple.map { style.parts(isSelected, $0).container }
    icon = parts.icon
    label = parts.label
    // The vocabulary has no rest-state `opacity` token: a destination at rest is not dimmed.
    opacity = style.opacity(layers.state) ?? TanreiIdentity.opacity
  }
}

// MARK: - One destination

/// One destination: a button drawn by `TanreiDestinationButtonStyle`, activated by pointer, touch, Enter and Space, one
/// element named by its label with its selected state, its position and its badge's description (NVB-19).
struct TanreiDestinationButton: View {
  let entry: TanreiDestinationEntry
  let style: TanreiDestinationStyle
  let isSelected: Bool
  /// Whether its label is drawn (the region's label visibility, NVB-13).
  let labelShown: Bool
  /// Its position among the destinations, 0-based, and how many there are.
  let index: Int
  let count: Int
  let activate: @MainActor () -> Void

  @Environment(\.locale) private var locale
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (NVB-8).
  @State private var keyboardPresses = 0

  var body: some View {
    let value = TanreiDestinationRules.accessibilityValue(
      position: TanreiDestinationRules.positionText(index: index, count: count),
      badge: TanreiDestinationRules.badgeDescription(entry.badge, locale: locale))
    // An empty label draws nothing and takes no room: the item container is centered as without one (NVB-20 reports it).
    let drawsLabel = labelShown && !entry.title.trimmingCharacters(in: .whitespaces).isEmpty
    Button(action: activate) { Text(verbatim: entry.title) }
      .buttonStyle(
        TanreiDestinationButtonStyle(
          entry: entry, style: style, isSelected: isSelected, labelShown: drawsLabel, isFocused: isFocused, keyboardPresses: keyboardPresses))
      // NVB-2: a disabled destination cannot be activated, takes no focus and is exposed as disabled.
      .disabled(!entry.isEnabled)
      // NVB-5: SwiftUI never moves focus to a button on a click or tap, so this is keyboard focus.
      .focused($isFocused)
      // Tanrei draws its own ring (NVB-5); the system focus effect would double it.
      .focusEffectDisabled()
      // NVB-1, NVB-8: Enter and Space activate, once per key press, and show the press from the center.
      .tanreiKeyActivation(isEnabled: entry.isEnabled) {
        keyboardPresses += 1
        activate()
      }
      // NVB-19: one element named by its label, drawn or not, with its selected state; its position (where the platform
      // does not state it) and its badge's description (NVB-16) after them.
      .accessibilityLabel(Text(verbatim: entry.title))
      .modifier(TanreiOptionalAccessibilityValue(value: value))
      .accessibilityAddTraits(isSelected ? .isSelected : [])
      // NVB-21: a long press at the large text sizes shows the icon and the label enlarged (iOS's large-content viewer).
      .accessibilityShowsLargeContentViewer {
        if let icon = entry.icon { TanreiItemIconView(icon: icon, size: style.iconSize, selected: isSelected) }
        Text(verbatim: entry.title)
      }
  }
}

struct TanreiDestinationButtonStyle: ButtonStyle {
  let entry: TanreiDestinationEntry
  let style: TanreiDestinationStyle
  let isSelected: Bool
  let labelShown: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiDestinationChrome(
      entry: entry, style: style, isSelected: isSelected, labelShown: labelShown, isPressed: configuration.isPressed, isFocused: isFocused,
      keyboardPresses: keyboardPresses)
  }
}

/// The visual of one destination: its cell (the whole hit area, NVB-6), and in it — centered as a group (NVB-12) — the item
/// container with its icon and badge, and the label under it while it is drawn; everything drawn from the tokens of the one
/// resolved state of its condition.
struct TanreiDestinationChrome: View {
  let entry: TanreiDestinationEntry
  let style: TanreiDestinationStyle
  let isSelected: Bool
  let labelShown: Bool
  let isPressed: Bool
  /// Keyboard focus: SwiftUI never moves focus to a button on a click or tap (NVB-4, NVB-5).
  let isFocused: Bool
  var keyboardPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // NVB-8: a press stays visible at least `duration.press-hold`; NVB-9: the point of contact only under `ripple`,
    // measured in the item container, so a press elsewhere in the cell grows the ripple from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    // NVB-4: exactly one state — pressed > focused > hovered; NVB-7: disabled is a state too.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiDestinationAppearance(style: style, isSelected: isSelected, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: style.rippleGrowth(reduceMotion: reduceMotion))
    }
    let selectionMotion = style.selectionMotion(reduceMotion: reduceMotion)

    return TanreiDestinationGroup(style: style, labelShown: labelShown) {
      itemContainer(appearance: appearance, ripple: ripple)
      label(appearance.label)
    }
    // NVB-15: a change of selection — colors, the indicator, a label coming or going and the item container moving with
    // it — over the selection motion (at once where motion is reduced).
    .animation(selectionMotion, value: isSelected)
    .animation(selectionMotion, value: labelShown)
    // NVB-7, NVB-9 `dim`: the state's opacity on the whole destination, its parts flattened first.
    .compositingGroup()
    .opacity(appearance.opacity)
    // NVB-4: a change of state over the state motion.
    .animation(style.stateMotion(reduceMotion: reduceMotion), value: state)
    // NVB-5: the ring around the item container, keyboard focus only, never animated and never dimmed.
    .overlay {
      if isFocused && isEnabled {
        TanreiDestinationGroup(style: style, labelShown: labelShown) {
          Color.clear
            .modifier(TanreiDestinationContainerFrame(style: style))
            .tanreiFocusRing(true, cornerRadius: style.containerShape)
          label(appearance.label).hidden()
        }
        .accessibilityHidden(true)
      }
    }
    // NVB-6: the whole cell is the hit area, and hover over any part of it answers on the item container.
    .contentShape(Rectangle())
    .onHover { isHovered = $0 }
  }

  /// NVB-12: the item container, `item.container.width` × `.height` with its corners (NVB-10: eased by the corner
  /// smoothing), the icon centered in it and the badge on the icon; its fill is the state layer and, while selected, the
  /// active indicator; the ripple is clipped to it.
  private func itemContainer(appearance: TanreiDestinationAppearance, ripple: TanreiContainerRipple?) -> some View {
    let shape = RoundedRectangle(cornerRadius: style.containerShape, style: system.shape.roundedCornerStyle)
    // The box is there with or without an icon to draw.
    return Color.clear
      .modifier(TanreiDestinationContainerFrame(style: style))
      .overlay { icon(appearance.icon) }
      .modifier(
        TanreiContainerLayers(
          fill: colors[TanreiPaint.none], elevation: TanreiIdentity.elevation, cornerRadius: style.containerShape, outline: colors[TanreiPaint.none],
          outlineWidth: .zero, ripple: ripple, opacity: TanreiIdentity.opacity))
      // Under the ripple: the item container's fill.
      .background { TanreiDestinationIndicator(shape: shape, fill: colors[appearance.container], isSelected: isSelected) }
      .tanreiContactArea()
  }

  /// NVB-14: the icon at `item.icon.size`, with the family and fill of the destination's condition (not scaled with the
  /// text, NVB-21); NVB-16: the badge on it, as the badge component draws one. Hidden: the destination is named by its
  /// label and the badge's words are its value (NVB-19).
  @ViewBuilder
  private func icon(_ paint: TanreiPaint) -> some View {
    if let icon = entry.icon {
      let glyph = TanreiItemIconView(icon: icon, size: style.iconSize, selected: isSelected)
        .foregroundStyle(colors[paint])
      Group {
        if let badge = entry.badge {
          glyph.tanreiBadge(badge.count, label: badge.label)
        } else {
          glyph
        }
      }
      .accessibilityHidden(true)
    }
  }

  /// NVB-12, NVB-13: the label under the item container while it is drawn, centered, on at most `labelLineLimit` lines,
  /// truncated at the end; it comes and goes with a fade.
  @ViewBuilder
  private func label(_ paint: TanreiPaint) -> some View {
    if labelShown {
      Text(verbatim: entry.title)
        .lineLimit(style.labelLineLimit)
        .truncationMode(.tail)
        .multilineTextAlignment(.center)
        .tanreiTextStyle(style.labelTypescale)
        .foregroundStyle(colors[paint])
        .transition(.opacity)
    }
  }
}

/// NVB-12, NVB-13: the item container and, while it is drawn, the label `gap` below it — centered as a group in the whole
/// cell, which is as large as it is offered (the region gives it its share and its full height).
struct TanreiDestinationGroup<Content: View>: View {
  let style: TanreiDestinationStyle
  let labelShown: Bool
  @ViewBuilder let content: Content

  var body: some View {
    VStack(spacing: style.gap) { content }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

/// NVB-12: the item container's box, `containerWidth` × `containerHeight` — NVB-6: narrower in a cell narrower than it
/// (a bar whose equal share is below the target), so it never reaches into the next cell, as Compose's and Flutter's
/// constraints narrow theirs. Its ideal width is the token's, so a region asked for its ideal size keeps it.
struct TanreiDestinationContainerFrame: ViewModifier {
  let style: TanreiDestinationStyle

  func body(content: Content) -> some View {
    content
      .frame(minWidth: .zero, idealWidth: style.containerWidth, maxWidth: style.containerWidth)
      .frame(height: style.containerHeight)
  }
}

/// NVB-15: the item container's fill. The selected destination's is its own view: when a destination becomes the selected
/// one, its fill grows in width from the center to the whole item container at its full height, and the previous
/// destination's fades out, over the selection motion of the enclosing transaction; at once without one.
struct TanreiDestinationIndicator: View {
  let shape: RoundedRectangle
  let fill: Color
  let isSelected: Bool

  var body: some View {
    ZStack {
      if isSelected {
        shape.fill(fill)
          .transition(.asymmetric(insertion: .modifier(active: TanreiWidthScale(scale: .zero), identity: TanreiWidthScale(scale: TanreiIdentity.scale)), removal: .opacity))
      } else {
        shape.fill(fill)
          .transition(.identity)
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// A view scaled in width only, about its center (NVB-15: the indicator grows at its full height throughout).
struct TanreiWidthScale: ViewModifier {
  let scale: CGFloat

  func body(content: Content) -> some View {
    content.scaleEffect(x: scale, y: TanreiIdentity.scale, anchor: .center)
  }
}

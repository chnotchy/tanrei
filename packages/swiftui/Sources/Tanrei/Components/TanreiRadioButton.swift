import SwiftUI

// Spec: specs/radio-button.spec.json — tokens: TanreiRadioButtonTokens (comp.radio-button), read from the design system
// in the environment (`system.radioButton`). Every design value in this file comes from a token; there are no literals,
// and no state's look is computed here. Press, hold, ripple, focus ring, hit target and the round container are the
// shared primitives: RAD-9, RAD-11, RAD-12 and RAD-13 are BTN-5, BTN-8, BTN-9 and BTN-10 for this
// component. The label row, `.labelsHidden()` and the two motions are the selection controls'
// (`TanreiSelectionControl.swift`). The group (the spec's `name`) is `TanreiRadioGroup`: SwiftUI has no radio group on
// iOS, so this container — which draws nothing and has no tokens — carries the group's name, its arrow keys, its one
// tab stop and each option's position (RAD-3 … RAD-5, RAD-16).

/// One option of a question whose options exclude each other. Put the options of one question in a `TanreiRadioGroup`.
///
///     @State private var frequency: Frequency? = .weekly
///     TanreiRadioGroup("Email frequency") {
///       TanreiRadioButton("Daily", value: .daily, selection: $frequency)
///       TanreiRadioButton("Weekly", value: .weekly, selection: $frequency)
///       TanreiRadioButton("Never", value: .never, selection: $frequency).disabled(true)
///     }
///
/// The option is selected while `selection == value`; activation writes `value` to `selection` (the spec's `change`) —
/// once, and never when it is already selected (RAD-2): an option is never cleared by its own activation. The title is
/// drawn at the ring's inline end and is the accessible name, visible or not (`.labelsHidden()`, honoured from iOS 18 /
/// macOS 15). `disabled` follows SwiftUI's `.disabled(_:)`.
public struct TanreiRadioButton<Value: Hashable>: View {
  private let title: TanreiControlTitle
  private let value: Value
  private let selection: Binding<Value?>

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.tanreiRadioGroup) private var group
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (RAD-11).
  @State private var keyboardPresses = 0
  /// This option's identity in its group.
  @State private var id = TanreiRadioOptionID()

  /// An option named by `title`.
  public init<S: StringProtocol>(_ title: S, value: Value, selection: Binding<Value?>) {
    self.init(title: TanreiControlTitle(title, component: "radio button", behavior: "RAD-18"), value: value, selection: selection)
  }

  /// An option named by a localized title.
  public init(_ titleKey: LocalizedStringKey, value: Value, selection: Binding<Value?>) {
    self.init(title: TanreiControlTitle(titleKey, component: "radio button", behavior: "RAD-18"), value: value, selection: selection)
  }

  private init(title: TanreiControlTitle, value: Value, selection: Binding<Value?>) {
    self.title = title
    self.value = value
    self.selection = selection
  }

  public var body: some View {
    let condition = self.condition
    let isSelected = self.isSelected
    // The group's actions for this option: select it, and give it keyboard focus (RAD-4).
    group?.register(id, select: { activate(isEnabled: isEnabled) }, focus: { isFocused = true })
    let entry = TanreiRadioOptionEntry(id: id, isEnabled: isEnabled, isSelected: isSelected)
    return TanreiLabelsVisibilityReader { labelsHidden in
      let label = title.drawn(labelsHidden: labelsHidden)
      // RAD-9: the hidden sizing copy keeps layout at the visual size while the real button, centred over it, is laid
      // out at least at the minimum target on both axes.
      TanreiMinimumHitTarget {
        TanreiRadioButtonChrome(condition: condition, label: label, isPressed: false, isFocused: false)
      } control: {
        Button(action: { activate(isEnabled: isEnabled) }) { title.text }
          .buttonStyle(TanreiRadioButtonStyle(condition: condition, label: label, isFocused: isFocused, keyboardPresses: keyboardPresses))
          .focused($isFocused)
          // Tanrei draws its own ring (RAD-8); the system focus effect would double it.
          .focusEffectDisabled()
          // RAD-5: in a group, only its tab stop takes keyboard focus; RAD-6: SwiftUI never focuses a disabled button.
          .modifier(TanreiRadioTabStop(isTabStop: group.map { $0.isTabStop(id) }))
          // RAD-1 / RAD-11: Space activates, once per key press, and shows the press from the center. Enter is left to
          // the platform: iOS and macOS do not activate a focused control with it.
          .tanreiKeyActivation(isEnabled: isEnabled, keys: TanreiActivationKeys.selection) {
            keyboardPresses += 1
            activate(isEnabled: isEnabled)
          }
          // RAD-4: the arrow keys move through the group's enabled options, select as they go, and wrap.
          .onKeyPress(keys: TanreiRadioGroupNavigation.keys, phases: .down) { press in
            guard isEnabled, let group, let forward = TanreiRadioGroupNavigation.isForward(press.key, layoutDirection: layoutDirection) else {
              return .ignored
            }
            group.move(from: id, forward: forward)
            return .handled
          }
          // RAD-18: the title is the name, visible or not; the drawn text is not a second element.
          .accessibilityLabel(title.text)
          // RAD-16: iOS has no radio role — a button, selected while chosen, and its position in the group as its value.
          .accessibilityAddTraits(isSelected ? .isSelected : [])
          .modifier(TanreiOptionalAccessibilityValue(value: group?.positionText(of: id)))
      }
    }
    .preference(key: TanreiRadioOptionsKey.self, value: [entry])
  }

  /// RAD-14: the condition — selected while `selection == value`.
  var condition: TanreiRadioButtonCondition { isSelected ? .selected : .unselected }

  var isSelected: Bool { selection.wrappedValue == value }

  /// The single route to `selection` (RAD-1, RAD-2, RAD-6): one call writes `value` once, never when this option is
  /// already selected, and never while disabled.
  func activate(isEnabled: Bool) {
    guard isEnabled, !isSelected else { return }
    selection.wrappedValue = value
  }
}

// MARK: - The group

/// The options of one question (the spec's `name`, RAD-3 … RAD-5, RAD-16): a container that draws nothing and lays its
/// options out as it is given them (a `VStack`, or pass your own layout inside). Its title is the group's accessible
/// name — the question the options answer. Inside it:
///
/// - the options are exposed with their position and the group's size ("2 of 3") as their value;
/// - the group has one tab stop: the selected option, or the first enabled one while none is selected;
/// - Down / Right Arrow move keyboard focus to the next enabled option and select it, Up / Left Arrow to the previous,
///   wrapping at the ends; in a right-to-left layout Right and Left swap.
///
/// Choosing one option clears the others through the shared `selection` binding (RAD-3): they read `selection == value`.
public struct TanreiRadioGroup<Content: View>: View {
  private let title: Text
  private let content: Content
  @State private var model = TanreiRadioGroupModel()

  /// A group named by `title`.
  public init<S: StringProtocol>(_ title: S, @ViewBuilder content: () -> Content) {
    self.title = Text(title)
    self.content = content()
  }

  /// A group named by a localized title.
  public init(_ titleKey: LocalizedStringKey, @ViewBuilder content: () -> Content) {
    self.title = Text(titleKey)
    self.content = content()
  }

  public var body: some View {
    let model = self.model
    VStack(alignment: .leading, spacing: .zero) { content }
      .environment(\.tanreiRadioGroup, model)
      .onPreferenceChange(TanreiRadioOptionsKey.self) { options in
        MainActor.assumeIsolated { model.update(options) }
      }
      // The options belong to this group only: an enclosing group does not count them.
      .transformPreference(TanreiRadioOptionsKey.self) { $0 = [] }
      // RAD-16: a container with the product's name; iOS has no radio group role.
      .accessibilityElement(children: .contain)
      .accessibilityLabel(title)
  }
}

/// The identity of one option in its group.
struct TanreiRadioOptionID: Hashable, Sendable {
  let raw = UUID()
}

/// What an option tells its group: in tree order, through `TanreiRadioOptionsKey`.
struct TanreiRadioOptionEntry: Equatable, Sendable {
  let id: TanreiRadioOptionID
  let isEnabled: Bool
  let isSelected: Bool
}

struct TanreiRadioOptionsKey: PreferenceKey {
  static var defaultValue: [TanreiRadioOptionEntry] { [] }
  static func reduce(value: inout [TanreiRadioOptionEntry], nextValue: () -> [TanreiRadioOptionEntry]) {
    value.append(contentsOf: nextValue())
  }
}

/// RAD-4 / RAD-5 — the rules of the group, pure: which option is the tab stop, and where an arrow key goes.
enum TanreiRadioGroupNavigation {
  static let keys: Set<KeyEquivalent> = [.upArrow, .downArrow, .leftArrow, .rightArrow]

  /// Whether `key` moves to the next option (`true`), the previous one (`false`), or is not a group key (`nil`). Right
  /// Arrow is "next" left to right and "previous" right to left; Left Arrow the opposite.
  static func isForward(_ key: KeyEquivalent, layoutDirection: LayoutDirection) -> Bool? {
    switch key {
    case .downArrow: return true
    case .upArrow: return false
    case .rightArrow: return layoutDirection == .leftToRight
    case .leftArrow: return layoutDirection == .rightToLeft
    default: return nil
    }
  }

  /// RAD-5: the selected option (when enabled), else the first enabled one; `nil` when every option is disabled.
  static func tabStop(_ options: [TanreiRadioOptionEntry]) -> TanreiRadioOptionID? {
    (options.first { $0.isSelected && $0.isEnabled } ?? options.first { $0.isEnabled })?.id
  }

  /// RAD-4: the next (or previous) enabled option after `id`, wrapping; disabled options are skipped. `nil` when no
  /// other enabled option exists.
  static func target(from id: TanreiRadioOptionID, forward: Bool, in options: [TanreiRadioOptionEntry]) -> TanreiRadioOptionID? {
    guard let start = options.firstIndex(where: { $0.id == id }) else { return nil }
    let count = options.count
    for step in 1..<max(count, 1) {
      let index = ((start + (forward ? step : -step)) % count + count) % count
      if options[index].isEnabled { return options[index].id }
    }
    return nil
  }

  /// RAD-16: an option's position in its group and the group's size, as VoiceOver reads it (in
  /// English).
  static func positionText(of id: TanreiRadioOptionID, in options: [TanreiRadioOptionEntry]) -> String? {
    guard let index = options.firstIndex(where: { $0.id == id }) else { return nil }
    return "\(index + 1) of \(options.count)"
  }
}

/// A group's state: its options in tree order (from the preference), a tab stop that follows a keyboard move before the
/// options report it, and each option's actions.
@MainActor
@Observable
final class TanreiRadioGroupModel {
  private(set) var options: [TanreiRadioOptionEntry] = []
  /// The option an arrow key just selected: the tab stop until the options report the new selection.
  private var pendingTabStop: TanreiRadioOptionID?
  @ObservationIgnored private var actions: [TanreiRadioOptionID: (select: @MainActor () -> Void, focus: @MainActor () -> Void)] = [:]

  func update(_ options: [TanreiRadioOptionEntry]) {
    guard options != self.options else { return }
    self.options = options
    if let pendingTabStop, options.contains(where: { $0.id == pendingTabStop && $0.isSelected }) {
      self.pendingTabStop = nil
    }
    let present = Set(options.map(\.id))
    actions = actions.filter { present.contains($0.key) }
  }

  /// Called by an option each time it is drawn (not observed: registering never redraws anything).
  func register(_ id: TanreiRadioOptionID, select: @escaping @MainActor () -> Void, focus: @escaping @MainActor () -> Void) {
    actions[id] = (select, focus)
  }

  func isTabStop(_ id: TanreiRadioOptionID) -> Bool {
    (pendingTabStop ?? TanreiRadioGroupNavigation.tabStop(options)) == id
  }

  func positionText(of id: TanreiRadioOptionID) -> String? {
    TanreiRadioGroupNavigation.positionText(of: id, in: options)
  }

  /// RAD-4: select the next (previous) enabled option and move keyboard focus to it — once it can take focus.
  func move(from id: TanreiRadioOptionID, forward: Bool) {
    guard let target = TanreiRadioGroupNavigation.target(from: id, forward: forward, in: options), let action = actions[target] else { return }
    pendingTabStop = target
    action.select()
    Task { @MainActor in action.focus() }
  }
}

private struct TanreiRadioGroupKey: EnvironmentKey {
  static var defaultValue: TanreiRadioGroupModel? { nil }
}

extension EnvironmentValues {
  /// The group the options below belong to; `nil` outside a `TanreiRadioGroup`.
  var tanreiRadioGroup: TanreiRadioGroupModel? {
    get { self[TanreiRadioGroupKey.self] }
    set { self[TanreiRadioGroupKey.self] = newValue }
  }
}

/// RAD-5: inside a group, only the tab stop is focusable. Outside a group (`nil`) the button keeps its own focus rule.
private struct TanreiRadioTabStop: ViewModifier {
  let isTabStop: Bool?

  func body(content: Content) -> some View {
    if let isTabStop {
      content.focusable(isTabStop)
    } else {
      content
    }
  }
}

// MARK: - Token bindings

extension TanreiRadioButtonTokens {
  /// How the RAD-12 ripple grows: over `comp.radio-button.motion.feedback-duration`, with the state easing. `nil` under
  /// Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// RAD-7 / RAD-15: the state motion and the selection motion.
  func motion(reduceMotion: Bool) -> TanreiSelectionMotion {
    TanreiSelectionMotion(
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a radio button draws for one condition × state. Pure data read from a `TanreiRadioButtonTokens`,
/// so the bindings can be tested without rendering. RAD-7 / RAD-10: every state, disabled included, is drawn from that
/// condition's tokens in that state; RAD-14: the geometry.
struct TanreiRadioButtonAppearance: Equatable {
  /// The round state layer behind the ring.
  let container: TanreiPaint
  let ring: TanreiPaint
  let dot: TanreiPaint
  let label: TanreiPaint
  /// RAD-12 `ripple`: the pressed container paint of the condition, drawn as a layer that grows over `container`.
  let ripple: TanreiPaint?
  /// Opacity of the whole control (ring, container and label).
  let opacity: Double
  let containerCornerRadius: CGFloat
  let containerSize: CGFloat
  let ringSize: CGFloat
  let ringWidth: CGFloat
  let dotSize: CGFloat
  /// RAD-14: the dot is drawn (whole) while selected; RAD-15: it grows from nothing and shrinks back.
  let dotScale: CGFloat
  let labelGap: CGFloat
  let labelTypescale: TanreiTextStyle

  init(
    tokens: TanreiRadioButtonTokens,
    condition: TanreiRadioButtonCondition,
    state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // The condition lookup is total: a condition this system does not have reads `unselected` (and is reported).
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].containerColor }
    ring = own.ringColor
    dot = own.dotColor
    label = own.labelColor

    let shared = tokens[state: layers.state]
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    containerCornerRadius = shared?.containerShape ?? tokens.containerShape
    containerSize = tokens.containerSize
    ringSize = tokens.ringSize
    ringWidth = tokens.ringWidth
    dotSize = tokens.dotSize
    dotScale = condition == .selected ? TanreiRadioButtonAppearance.drawn : .zero
    labelGap = tokens.labelGap
    labelTypescale = tokens.labelTypescale
  }

  /// The dot's scale while it is shown.
  static let drawn: CGFloat = 1
}

// MARK: - Style

struct TanreiRadioButtonStyle: ButtonStyle {
  let condition: TanreiRadioButtonCondition
  let label: Text?
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiRadioButtonChrome(
      condition: condition, label: label, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses
    )
    // RAD-9: the hit area — the control and its label — reaches the minimum target on both axes.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: the round state layer, the ring and its dot, and the label, drawn from the tokens of the one resolved
/// state of the condition.
struct TanreiRadioButtonChrome: View {
  let condition: TanreiRadioButtonCondition
  let label: Text?
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (RAD-11).
  var keyboardPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // RAD-11: a press stays visible at least `duration.press-hold`; RAD-12: the point of contact is measured in the
    // round container, so a press on the label grows the ripple from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.radioButton
    // RAD-7: exactly one state — pressed > focused > hovered; RAD-10: disabled is a state too. SwiftUI focus is keyboard
    // focus, so neither the focused state nor the ring (RAD-8) appears for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiRadioButtonAppearance(tokens: tokens, condition: condition, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    // RAD-14: the ring, stroked inside its outer diameter, and the dot centered in it. RAD-15: the dot grows from the
    // ring's center and shrinks back.
    let ring = ZStack {
      Circle()
        .strokeBorder(colors[appearance.ring], lineWidth: appearance.ringWidth)
      Circle()
        .fill(colors[appearance.dot])
        .frame(width: appearance.dotSize, height: appearance.dotSize)
        .scaleEffect(appearance.dotScale)
    }
    .frame(width: appearance.ringSize, height: appearance.ringSize)

    let control = ring
      .frame(width: appearance.containerSize, height: appearance.containerSize)
      // The round state layer: hover, focus and press show here, never on the ring. RAD-13: its corners
      // ease by the corner smoothing (in `TanreiContainerLayers`).
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.containerCornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: TanreiIdentity.opacity))
      .tanreiContactArea()
      .compositingGroup()
      .opacity(appearance.opacity)
      // RAD-8: around the ring, shown for keyboard focus, never animated and never dimmed by a state's opacity.
      .overlay {
        Color.clear
          .frame(width: appearance.ringSize, height: appearance.ringSize)
          .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.ringSize / 2)
      }

    // RAD-17: the label at the container's inline end, the control centered on its first line.
    return TanreiLabelledControl(
      label: label, gap: appearance.labelGap, style: appearance.labelTypescale, color: colors[appearance.label],
      opacity: appearance.opacity, controlHeight: appearance.containerSize
    ) {
      control
    }
    .tanreiSelectionAnimation(tokens.motion(reduceMotion: reduceMotion), condition: condition, state: state)
    .onHover { isHovered = $0 }
  }
}

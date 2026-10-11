import SwiftUI

// Spec: specs/checkbox.spec.json — tokens: TanreiCheckboxTokens (comp.checkbox), read from the design system in the
// environment (`system.checkbox`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. Press, hold, ripple, focus ring, hit target and the round container are the shared
// primitives: CHK-7, CHK-9, CHK-10 and CHK-11 are BTN-5, BTN-8, BTN-9 and BTN-10 for this component. The
// label row, `.labelsHidden()` and the two motions are the selection controls' (`TanreiSelectionControl.swift`).

/// Turns one independent choice on or off, shows a parent choice that is only partly on, and marks a required choice
/// left unmade.
///
///     @State private var updates = false
///     TanreiCheckbox("Email me updates", isOn: $updates)
///     TanreiCheckbox("Select all", isOn: $allOn, isIndeterminate: someOn && !allOn)   // a parent of mixed children
///     TanreiCheckbox("I accept the terms", isOn: $accepted, isError: showsErrors && !accepted)
///     TanreiCheckbox("Select row", isOn: $rowSelected).labelsHidden()                  // named, no visible label
///     TanreiCheckbox("Email me updates", isOn: $updates).disabled(true)
///
/// The title is drawn at the box's inline end and is the accessible name, visible or not (`.labelsHidden()`, honoured
/// from iOS 18 / macOS 15). Activation writes `isOn` (the spec's `change`): it flips it, and while `isIndeterminate`
/// is true it sets it to true (CHK-2) — the indeterminate state is a value the caller derives from its data, so the
/// caller's data clears it. `disabled` follows SwiftUI's `.disabled(_:)`.
public struct TanreiCheckbox: View {
  private let title: TanreiControlTitle
  private let isOn: Binding<Bool>
  private let isIndeterminate: Bool
  private let isError: Bool

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (CHK-9).
  @State private var keyboardPresses = 0

  /// A checkbox named by `title`.
  public init<S: StringProtocol>(_ title: S, isOn: Binding<Bool>, isIndeterminate: Bool = false, isError: Bool = false) {
    self.init(title: TanreiControlTitle(title, component: "checkbox", behavior: "CHK-16"), isOn: isOn, isIndeterminate: isIndeterminate, isError: isError)
  }

  /// A checkbox named by a localized title.
  public init(_ titleKey: LocalizedStringKey, isOn: Binding<Bool>, isIndeterminate: Bool = false, isError: Bool = false) {
    self.init(title: TanreiControlTitle(titleKey, component: "checkbox", behavior: "CHK-16"), isOn: isOn, isIndeterminate: isIndeterminate, isError: isError)
  }

  private init(title: TanreiControlTitle, isOn: Binding<Bool>, isIndeterminate: Bool, isError: Bool) {
    self.title = title
    self.isOn = isOn
    self.isIndeterminate = isIndeterminate
    self.isError = isError
  }

  public var body: some View {
    let condition = self.condition
    let mark = self.mark
    return TanreiLabelsVisibilityReader { labelsHidden in
      let label = title.drawn(labelsHidden: labelsHidden)
      // CHK-7: the hidden sizing copy keeps layout at the visual size (the container and the label) while the real
      // button, centred over it, is laid out at least at the minimum target on both axes.
      TanreiMinimumHitTarget {
        TanreiCheckboxChrome(condition: condition, mark: mark, label: label, isPressed: false, isFocused: false)
      } control: {
        Button(action: { activate(isEnabled: isEnabled) }) { title.text }
          .buttonStyle(TanreiCheckboxStyle(condition: condition, mark: mark, label: label, isFocused: isFocused, keyboardPresses: keyboardPresses))
          .focused($isFocused)
          // Tanrei draws its own ring (CHK-6); the system focus effect would double it.
          .focusEffectDisabled()
          // CHK-1 / CHK-9: Space activates, once per key press, and shows the press from the center. Enter is left to
          // the platform: iOS and macOS do not activate a focused control with it.
          .tanreiKeyActivation(isEnabled: isEnabled, keys: TanreiActivationKeys.selection) {
            keyboardPresses += 1
            activate(isEnabled: isEnabled)
          }
          // CHK-16: the title is the name, visible or not; the drawn text is not a second element.
          .accessibilityLabel(title.text)
          // CHK-14: a toggle, on (the selected trait) or off; mixed through the value (iOS has no mixed trait).
          .accessibilityAddTraits(mark.accessibilityTraits)
          .modifier(TanreiOptionalAccessibilityValue(value: mark.accessibilityValue))
      }
    }
  }

  /// CHK-4: the condition the props select.
  var condition: TanreiCheckboxCondition {
    TanreiCheckboxCondition.of(isOn: isOn.wrappedValue, isIndeterminate: isIndeterminate, isError: isError)
  }

  /// CHK-12: what the box shows.
  var mark: TanreiCheckboxMark {
    TanreiCheckboxMark(isOn: isOn.wrappedValue, isIndeterminate: isIndeterminate)
  }

  /// The single route to `isOn` (CHK-1, CHK-2, CHK-3): one call writes the binding once — `true` from indeterminate,
  /// the opposite otherwise — and never while disabled. SwiftUI already drops taps, focus and key presses for a
  /// disabled button; the guard keeps that true for every input path.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    isOn.wrappedValue = isIndeterminate ? true : !isOn.wrappedValue
  }
}

// MARK: - Token bindings

extension TanreiCheckboxCondition {
  /// CHK-4 — indeterminate when `isIndeterminate`, otherwise selected when `isOn`, otherwise unselected; the `error-`
  /// form of that condition while `isError`.
  static func of(isOn: Bool, isIndeterminate: Bool, isError: Bool) -> TanreiCheckboxCondition {
    switch (isIndeterminate, isOn, isError) {
    case (true, _, false): return .indeterminate
    case (true, _, true): return .errorIndeterminate
    case (false, true, false): return .selected
    case (false, true, true): return .errorSelected
    case (false, false, false): return .unselected
    case (false, false, true): return .errorUnselected
    }
  }
}

/// CHK-12 — what the box shows: nothing, a check, or a dash. Indeterminate wins over checked (CHK-4, CHK-14).
enum TanreiCheckboxMark: Equatable, Sendable, CaseIterable {
  case none
  case check
  case dash

  init(isOn: Bool, isIndeterminate: Bool) {
    self = isIndeterminate ? .dash : (isOn ? .check : .none)
  }

  /// CHK-14: a toggle to assistive technology, selected while checked. Mixed is not "on": it is the value.
  var accessibilityTraits: AccessibilityTraits {
    self == .check ? [.isToggle, .isSelected] : .isToggle
  }

  /// CHK-14: "mixed" while indeterminate — iOS has no mixed trait (the spec's accessibility notes).
  var accessibilityValue: String? {
    self == .dash ? "mixed" : nil
  }
}

extension TanreiCheckboxTokens {
  /// How the CHK-10 ripple grows: over `comp.checkbox.motion.feedback-duration`, with the state easing. `nil` under
  /// Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// CHK-5 / CHK-13: the state motion and the selection motion.
  func motion(reduceMotion: Bool) -> TanreiSelectionMotion {
    TanreiSelectionMotion(
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a checkbox draws for one condition × state. Pure data read from a `TanreiCheckboxTokens`, so the
/// bindings can be tested without rendering. CHK-5 / CHK-8: every state, disabled included, is drawn from that
/// condition's tokens in that state; CHK-12: the geometry.
struct TanreiCheckboxAppearance: Equatable {
  /// The round state layer behind the box.
  let container: TanreiPaint
  let box: TanreiPaint
  let mark: TanreiPaint
  let outline: TanreiPaint
  let label: TanreiPaint
  /// CHK-10 `ripple`: the pressed container paint of the condition, drawn as a layer that grows over `container`.
  let ripple: TanreiPaint?
  /// Opacity of the whole control (box, container and label).
  let opacity: Double
  let containerCornerRadius: CGFloat
  let containerSize: CGFloat
  let boxSize: CGFloat
  let boxCornerRadius: CGFloat
  let outlineWidth: CGFloat
  let markWidth: CGFloat
  let labelGap: CGFloat
  let labelTypescale: TanreiTextStyle

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback` — how a press is answered (CHK-10). It matters only while `state`
  ///     is `.pressed`.
  ///   - beneath: the state the checkbox would be in without the press.
  init(
    tokens: TanreiCheckboxTokens,
    condition: TanreiCheckboxCondition,
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
    box = own.boxColor
    mark = own.markColor
    outline = own.outlineColor
    label = own.labelColor

    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    containerCornerRadius = shared?.containerShape ?? tokens.containerShape
    containerSize = tokens.containerSize
    boxSize = tokens.boxSize
    boxCornerRadius = tokens.boxShape
    outlineWidth = tokens.outlineWidth
    markWidth = tokens.markWidth
    labelGap = tokens.labelGap
    labelTypescale = tokens.labelTypescale
  }
}

// MARK: - The mark

/// CHK-12 / CHK-13 — the check or the dash as the spec's anatomy gives them: the stroke's centre line in fractions of
/// the box's side (square caps extend past the ends). These points are the shape of the glyph, as a font's glyph is,
/// not design values; the stroke is `mark.width`. `progress` draws the check along its path from its start, and the
/// dash from its center; 0 draws nothing (not even a cap).
struct TanreiCheckboxMarkShape: Shape {
  enum Kind: Sendable {
    case check
    case dash
  }

  let kind: Kind
  var progress: CGFloat

  static let checkPoints: [CGPoint] = [CGPoint(x: 0.2, y: 0.5), CGPoint(x: 0.4, y: 0.7), CGPoint(x: 0.8, y: 0.3)]
  static let dashPoints: [CGPoint] = [CGPoint(x: 0.1375, y: 0.5), CGPoint(x: 0.8625, y: 0.5)]
  static let drawn: CGFloat = 1

  var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  func path(in rect: CGRect) -> Path {
    let amount = min(max(progress, .zero), Self.drawn)
    guard amount > .zero else { return Path() }
    let points = (kind == .check ? Self.checkPoints : Self.dashPoints).map {
      CGPoint(x: rect.minX + $0.x * rect.width, y: rect.minY + $0.y * rect.height)
    }
    var full = Path()
    full.addLines(points)
    guard amount < Self.drawn else { return full }
    switch kind {
    case .check:
      return full.trimmedPath(from: .zero, to: amount)
    case .dash:
      let half = amount / 2
      let middle = Self.drawn / 2
      return full.trimmedPath(from: middle - half, to: middle + half)
    }
  }
}

// MARK: - Style

struct TanreiCheckboxStyle: ButtonStyle {
  let condition: TanreiCheckboxCondition
  let mark: TanreiCheckboxMark
  let label: Text?
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiCheckboxChrome(
      condition: condition, mark: mark, label: label, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses
    )
    // CHK-7: the hit area — the control and its label — reaches the minimum target on both axes.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: the round state layer, the box with its outline and mark, and the label, drawn from the tokens of the one
/// resolved state of the condition.
struct TanreiCheckboxChrome: View {
  let condition: TanreiCheckboxCondition
  let mark: TanreiCheckboxMark
  let label: Text?
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (CHK-9).
  var keyboardPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // CHK-9: a press stays visible at least `duration.press-hold`; CHK-10: the point of contact is only needed by
    // `ripple`, and it is measured in the round container, so a press on the label grows from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.checkbox
    // CHK-5: exactly one state — pressed > focused > hovered; CHK-8: disabled is a state too. SwiftUI focus is keyboard
    // focus: a click or tap never moves focus to a button, so neither the focused state nor the ring (CHK-6) appears
    // for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiCheckboxAppearance(tokens: tokens, condition: condition, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let stroke = StrokeStyle(lineWidth: appearance.markWidth, lineCap: .square, lineJoin: .miter)

    // CHK-12: the box, its outline inside its edge and its fill inside the outline, and the mark. CHK-11: its corners
    // ease by the corner smoothing. The box does not mirror in a right-to-left layout: a check is not a direction.
    let box = ZStack {
      TanreiInsetOutlinedShape(
        cornerRadius: appearance.boxCornerRadius, fill: colors[appearance.box], outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth)
      // CHK-13: the check draws along its path from its start; the dash grows from its center; each is undrawn the
      // same way when it goes away (a check that becomes a dash undraws while the dash grows).
      TanreiCheckboxMarkShape(kind: .check, progress: mark == .check ? TanreiCheckboxMarkShape.drawn : .zero)
        .stroke(colors[appearance.mark], style: stroke)
      TanreiCheckboxMarkShape(kind: .dash, progress: mark == .dash ? TanreiCheckboxMarkShape.drawn : .zero)
        .stroke(colors[appearance.mark], style: stroke)
    }
    .frame(width: appearance.boxSize, height: appearance.boxSize)
    .environment(\.layoutDirection, .leftToRight)

    let control = box
      .frame(width: appearance.containerSize, height: appearance.containerSize)
      // The round state layer: hover, focus and press show here, never on the box. Its whole-control
      // opacity is applied below, with the box's and the label's.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.containerCornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: TanreiIdentity.opacity))
      .tanreiContactArea()
      .compositingGroup()
      .opacity(appearance.opacity)
      // CHK-6: around the box, shown for keyboard focus, never animated and never dimmed by a state's opacity.
      .overlay {
        Color.clear
          .frame(width: appearance.boxSize, height: appearance.boxSize)
          .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.boxCornerRadius)
      }

    // CHK-15: the label at the container's inline end, the control centered on its first line.
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

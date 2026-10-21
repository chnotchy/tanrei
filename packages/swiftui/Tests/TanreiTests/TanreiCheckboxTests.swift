import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/checkbox.spec.json. Each behavior id (CHK-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. CHK-7, CHK-9, CHK-10 and CHK-11 are BTN-5, BTN-8, BTN-9 and BTN-10 for this
// component: the primitives they rest on (press hold, ripple, contact point, focus ring, hit target, container layers)
// are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the checkbox.
//
// Geometry: a render is the checkbox plus `Snapshot.inset` on every side. The control is the round container
// (`containerSize`), the box centered in it; the label starts `labelGap` after the container. Accessibility on iOS is
// tested end to end in the gallery's UI tests (the macOS accessibility tree is not available to unit tests). A hosted
// checkbox is `.fixedSize()`: its label wraps, so its minimum height (one word per line) would otherwise become the
// test window's minimum size.

private let suiteName = "TanreiCheckboxTests"

/// A checkbox's state, outside any view: what a `Binding` in a real app points at.
@MainActor
private final class Choice {
  var isOn: Bool
  var changes: [Bool] = []
  init(_ isOn: Bool) { self.isOn = isOn }

  var binding: Binding<Bool> {
    Binding(
      get: { MainActor.assumeIsolated { self.isOn } },
      set: { value in
        MainActor.assumeIsolated {
          self.isOn = value
          self.changes.append(value)
        }
      })
  }
}

/// The snapshot theme with another design system.
@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

/// Device pixel for a point given in layout points from the top-left of the render.
@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

private let light = TanreiSystem.tanrei.colors.light

/// The chrome alone, as the style draws it.
@MainActor
private func chrome(
  _ condition: TanreiCheckboxCondition = .selected, mark: TanreiCheckboxMark? = nil, label: String? = nil, isPressed: Bool = false, isFocused: Bool = false
) -> some View {
  let mark = mark ?? (condition == .selected || condition == .errorSelected ? .check : (condition == .indeterminate || condition == .errorIndeterminate ? .dash : .none))
  return TanreiCheckboxChrome(condition: condition, mark: mark, label: label.map { Text($0) }, isPressed: isPressed, isFocused: isFocused)
}

/// The center of the container (and of the box) in a render.
@MainActor
private func center(_ tokens: TanreiCheckboxTokens) -> CGPoint {
  CGPoint(x: Snapshot.inset + tokens.containerSize / 2, y: Snapshot.inset + tokens.containerSize / 2)
}

/// The top-left of the box in a render.
@MainActor
private func boxOrigin(_ tokens: TanreiCheckboxTokens) -> CGPoint {
  let margin = (tokens.containerSize - tokens.boxSize) / 2
  return CGPoint(x: Snapshot.inset + margin, y: Snapshot.inset + margin)
}

/// A point of the round container outside the box: half-way between the box and the container's leading edge.
@MainActor
private func containerPoint(_ tokens: TanreiCheckboxTokens) -> CGPoint {
  CGPoint(x: Snapshot.inset + (tokens.containerSize - tokens.boxSize) / 4, y: Snapshot.inset + tokens.containerSize / 2)
}

/// A point of the round container outside the focus ring around the box: half-way between the ring's outer edge and the
/// container's leading edge.
@MainActor
private func outsideRingPoint(_ system: TanreiSystem) -> CGPoint {
  let tokens = system.checkbox
  let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.boxShape, measure: system.measure)
  let ringEdge = boxOrigin(tokens).x - metrics.outerOutset
  return CGPoint(x: (Snapshot.inset + ringEdge) / 2, y: Snapshot.inset + tokens.containerSize / 2)
}

/// A point on the check's stroke: its corner, (0.4, 0.7) of the box.
@MainActor
private func checkCorner(_ tokens: TanreiCheckboxTokens) -> CGPoint {
  let origin = boxOrigin(tokens)
  return CGPoint(x: origin.x + 0.4 * tokens.boxSize, y: origin.y + 0.7 * tokens.boxSize)
}

// MARK: - Activation (CHK-1, CHK-2, CHK-3, CHK-16)

@MainActor
@Suite("TanreiCheckbox activation", .serialized)
struct TanreiCheckboxActivationTests {
  /// CHK-1 — one activation switches checked and emits change once with the new value.
  @Test("CHK-1 activation switches isOn once per activation")
  func activationSwitches() {
    let choice = Choice(false)
    TanreiCheckbox("Email me updates", isOn: choice.binding).activate(isEnabled: true)
    #expect(choice.isOn && choice.changes == [true])
    TanreiCheckbox("Email me updates", isOn: choice.binding).activate(isEnabled: true)
    #expect(!choice.isOn && choice.changes == [true, false])
  }

  /// CHK-2 — activating an indeterminate checkbox sets checked to true (from off and from on) and emits true.
  @Test("CHK-2 activation from indeterminate sets isOn to true", arguments: [false, true])
  func indeterminateBecomesChecked(isOn: Bool) {
    let choice = Choice(isOn)
    TanreiCheckbox("Select all", isOn: choice.binding, isIndeterminate: true).activate(isEnabled: true)
    #expect(choice.isOn && choice.changes == [true])
  }

  /// CHK-3 — a disabled checkbox neither changes nor emits.
  @Test("CHK-3 disabled: no change")
  func disabledDoesNotChange() {
    let choice = Choice(false)
    TanreiCheckbox("Email me updates", isOn: choice.binding).activate(isEnabled: false)
    TanreiCheckbox("Select all", isOn: choice.binding, isIndeterminate: true).activate(isEnabled: false)
    #expect(!choice.isOn && choice.changes.isEmpty)
  }

  /// CHK-1 / CHK-9 — Space activates; Enter is not a selection control's key on iOS or macOS (neither platform
  /// activates any focused control with Enter). A button keeps Enter and Space (BTN-1).
  @Test("CHK-1 CHK-9 Space activates, Enter does not")
  func keys() {
    #expect(TanreiActivationKeys.selection == [.space])
    #expect(!TanreiActivationKeys.selection.contains(.return))
    #expect(TanreiActivationKeys.button == [.return, .space])
  }

  /// CHK-16 — an empty label is reported in debug builds, and the checkbox still renders and works.
  @Test("CHK-16 an empty label is reported and the checkbox still renders")
  func emptyLabel() throws {
    let choice = Choice(false)
    let (_, reports) = Reports.collecting {
      _ = TanreiCheckbox("", isOn: choice.binding)
      _ = TanreiCheckbox(LocalizedStringKey(""), isOn: choice.binding)
    }
    #expect(reports.messages.count == 2)
    #expect(reports.mention("empty label") && reports.mention("accessible name") && reports.mention("CHK-16"))
    let (_, silent) = Reports.collecting {
      _ = TanreiCheckbox("Email me updates", isOn: choice.binding)
      _ = TanreiCheckbox(LocalizedStringKey("Email me updates"), isOn: choice.binding)
    }
    #expect(silent.messages.isEmpty)

    let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiCheckbox("", isOn: .constant(true))) }
    let tokens = TanreiSystem.tanrei.checkbox
    #expect(CGFloat(bitmap.width) == (tokens.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(pixel(bitmap, x: boxOrigin(tokens).x + 2, y: boxOrigin(tokens).y + 2).isClose(to: light[.primary].rgba8()))
    let (_, _) = Reports.collecting { TanreiCheckbox("", isOn: choice.binding).activate(isEnabled: true) }
    #expect(choice.isOn)
  }

  /// CHK-16 — `.labelsHidden()` draws no label, exactly as an empty one: the control alone.
  @Test("CHK-16 labelsHidden draws no label")
  func labelsHidden() throws {
    guard #available(macOS 15, iOS 18, *) else { return }
    let hidden = try Snapshot.renderExact(TanreiCheckbox("Select row", isOn: .constant(true)).labelsHidden())
    let (bare, _) = try Reports.collecting { try Snapshot.renderExact(TanreiCheckbox("", isOn: .constant(true))) }
    let shown = try Snapshot.renderExact(TanreiCheckbox("Select row", isOn: .constant(true)))
    #expect(hidden.width == bare.width && hidden.height == bare.height)
    #expect(hidden.mismatch(against: bare, channelTolerance: 0) == 0)
    #expect(shown.width > hidden.width)
    // The name stays: the title decides what is drawn, never whether the checkbox is named.
    let title = TanreiControlTitle("Select row", component: "checkbox", behavior: "CHK-16")
    #expect(title.drawn(labelsHidden: true) == nil && title.drawn(labelsHidden: false) != nil && !title.isEmpty)
  }

  #if os(macOS)
  /// CHK-1 by pointer, on the box and on the label; CHK-3: disabled, neither does anything.
  @Test("CHK-1 CHK-3 a click on the box or on the label switches it once; never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let choice = Choice(false)
    let hosted = HostedView(
      TanreiCheckbox("Email me updates", isOn: choice.binding)
        .disabled(!isEnabled)
        .fixedSize()
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let tokens = Snapshot.theme.system.checkbox
    hosted.click(at: center(tokens))
    #expect(choice.changes == (isEnabled ? [true] : []))
    // The label: past the container and the gap.
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.containerSize + tokens.labelGap + 20, y: center(tokens).y))
    #expect(choice.changes == (isEnabled ? [true, false] : []))
  }

  /// CHK-7 end to end: a click above the control but inside the minimum target switches it; beyond it nothing happens.
  @Test("CHK-7 a click in the extended hit area switches it")
  func extendedHitAreaClick() {
    let choice = Choice(false)
    let hosted = HostedView(
      TanreiCheckbox("Email me updates", isOn: choice.binding)
        .fixedSize()
        .padding(Snapshot.inset)
        .tanreiTheme(Snapshot.theme)
    )
    let system = Snapshot.theme.system
    let height = system.checkbox.containerSize
    let outset = (TanreiHitTarget.minimum(in: system.measure) - height) / 2
    #expect(outset > 0)
    let middle = center(system.checkbox).x
    hosted.click(at: CGPoint(x: middle, y: Snapshot.inset - outset / 2))  // above the box
    #expect(choice.changes == [true])
    hosted.click(at: CGPoint(x: middle, y: Snapshot.inset - outset - 1))  // beyond the target
    #expect(choice.changes == [true])
  }
  #endif
}

// MARK: - Condition and semantics (CHK-4, CHK-12, CHK-14)

@MainActor
@Suite("TanreiCheckbox condition")
struct TanreiCheckboxConditionTests {
  /// CHK-4 — indeterminate wins over checked, and error prefixes whichever applies.
  @Test("CHK-4 the props select the condition")
  func condition() {
    #expect(TanreiCheckboxCondition.of(isOn: false, isIndeterminate: false, isError: false) == .unselected)
    #expect(TanreiCheckboxCondition.of(isOn: true, isIndeterminate: false, isError: false) == .selected)
    #expect(TanreiCheckboxCondition.of(isOn: false, isIndeterminate: true, isError: false) == .indeterminate)
    #expect(TanreiCheckboxCondition.of(isOn: true, isIndeterminate: true, isError: false) == .indeterminate)
    #expect(TanreiCheckboxCondition.of(isOn: false, isIndeterminate: false, isError: true) == .errorUnselected)
    #expect(TanreiCheckboxCondition.of(isOn: true, isIndeterminate: false, isError: true) == .errorSelected)
    #expect(TanreiCheckboxCondition.of(isOn: false, isIndeterminate: true, isError: true) == .errorIndeterminate)
    #expect(TanreiCheckboxCondition.of(isOn: true, isIndeterminate: true, isError: true) == .errorIndeterminate)
    #expect(TanreiCheckboxCondition.core == [.unselected, .selected, .indeterminate, .errorUnselected, .errorSelected, .errorIndeterminate])
  }

  /// CHK-12 — a check while selected, a dash while indeterminate, nothing while unselected.
  @Test("CHK-12 the mark of each condition")
  func mark() {
    #expect(TanreiCheckboxMark(isOn: false, isIndeterminate: false) == .none)
    #expect(TanreiCheckboxMark(isOn: true, isIndeterminate: false) == .check)
    #expect(TanreiCheckboxMark(isOn: false, isIndeterminate: true) == .dash)
    #expect(TanreiCheckboxMark(isOn: true, isIndeterminate: true) == .dash)
  }

  /// CHK-14 — a toggle to assistive technology, on (selected) while checked, off otherwise; mixed through the value.
  @Test("CHK-14 toggle trait, selected while checked, value mixed while indeterminate")
  func semantics() {
    #expect(TanreiCheckboxMark.none.accessibilityTraits == .isToggle)
    #expect(TanreiCheckboxMark.check.accessibilityTraits == [.isToggle, .isSelected])
    #expect(TanreiCheckboxMark.dash.accessibilityTraits == .isToggle)
    #expect(TanreiCheckboxMark.dash.accessibilityValue == "mixed")
    #expect(TanreiCheckboxMark.check.accessibilityValue == nil && TanreiCheckboxMark.none.accessibilityValue == nil)
  }

  /// CHK-12 / CHK-13 — the mark's path: the spec's points, drawn from the start (check) or the center (dash); nothing at
  /// 0, not even a cap.
  @Test("CHK-12 CHK-13 the check follows its path from the start, the dash grows from its center")
  func markPath() {
    let rect = CGRect(x: 0, y: 0, width: 100, height: 100)
    #expect(TanreiCheckboxMarkShape(kind: .check, progress: 0).path(in: rect).isEmpty)
    #expect(TanreiCheckboxMarkShape(kind: .dash, progress: 0).path(in: rect).isEmpty)
    let check = TanreiCheckboxMarkShape(kind: .check, progress: 1).path(in: rect).boundingRect
    #expect(abs(check.minX - 20) < 0.01 && abs(check.maxX - 80) < 0.01 && abs(check.minY - 30) < 0.01 && abs(check.maxY - 70) < 0.01)
    let dash = TanreiCheckboxMarkShape(kind: .dash, progress: 1).path(in: rect).boundingRect
    #expect(abs(dash.minX - 13.75) < 0.01 && abs(dash.maxX - 86.25) < 0.01 && abs(dash.midY - 50) < 0.01)
    // Half the check starts where the check starts; half the dash is centered.
    let halfCheck = TanreiCheckboxMarkShape(kind: .check, progress: 0.5).path(in: rect).boundingRect
    #expect(abs(halfCheck.minX - 20) < 0.01 && halfCheck.maxX < 80)
    let halfDash = TanreiCheckboxMarkShape(kind: .dash, progress: 0.5).path(in: rect).boundingRect
    #expect(abs(halfDash.midX - 50) < 0.01 && abs(halfDash.width - 36.25) < 0.01)
  }
}

// MARK: - Token bindings (CHK-5, CHK-8)

@MainActor
@Suite("TanreiCheckbox token bindings")
struct TanreiCheckboxTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiCheckboxTokens { system.checkbox }

  struct Expected: Sendable {
    let box: TanreiColorRole?
    let mark: TanreiColorRole?
    let outline: TanreiColorRole
  }

  /// The default system's values: the container is transparent in every condition, the
  /// label on-surface.
  static let expected: [TanreiCheckboxCondition: Expected] = [
    .unselected: Expected(box: nil, mark: nil, outline: .outline),
    .selected: Expected(box: .primary, mark: .onPrimary, outline: .primary),
    .indeterminate: Expected(box: .primary, mark: .onPrimary, outline: .primary),
    .errorUnselected: Expected(box: nil, mark: nil, outline: .error),
    .errorSelected: Expected(box: .error, mark: .onError, outline: .error),
    .errorIndeterminate: Expected(box: .error, mark: .onError, outline: .error),
  ]

  private func paint(_ role: TanreiColorRole?) -> TanreiPaint { role.map { .role($0) } ?? TanreiPaint.none }

  private func appearance(_ condition: TanreiCheckboxCondition, _ state: TanreiInteraction, tokens: TanreiCheckboxTokens? = nil) -> TanreiCheckboxAppearance {
    TanreiCheckboxAppearance(tokens: tokens ?? self.tokens, condition: condition, state: state)
  }

  /// CHK-4 / CHK-12 — at rest each condition binds its roles; its state-layer color is its outline color.
  @Test("CHK-4 at rest each condition binds the expected color roles", arguments: TanreiCheckboxCondition.core)
  func roles(condition: TanreiCheckboxCondition) throws {
    let expected = try #require(Self.expected[condition])
    let rest = appearance(condition, .enabled)
    #expect(rest.container == TanreiPaint.none)
    #expect(rest.box == paint(expected.box) && rest.mark == paint(expected.mark) && rest.outline == paint(expected.outline))
    #expect(rest.label == .role(.onSurface))
    #expect(rest.opacity == 1 && rest.containerCornerRadius == tokens.containerShape && rest.ripple == nil)
    #expect(tokens.conditions[condition].enabled.stateLayerColor == rest.outline)
  }

  @Test("paints resolve to the generated colors in light and dark", arguments: TanreiCheckboxCondition.core)
  func colorsInLightAndDark(condition: TanreiCheckboxCondition) throws {
    let expected = try #require(Self.expected[condition])
    let rest = appearance(condition, .enabled)
    for (themeAppearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(colors == scheme)
      #expect(rest.outline.resolve(in: colors) == scheme.value(expected.outline))
      #expect(rest.box.resolve(in: colors) == expected.box.map { scheme.value($0) } ?? .clear)
      #expect(rest.label.resolve(in: colors) == scheme.value(.onSurface))
    }
  }

  /// CHK-12 — the geometry: container 28, box 16 with corner extra-small, outline hairline, mark thick, label body at
  /// space50, each read from its token.
  @Test("CHK-12 CHK-15 the geometry binds its tokens")
  func geometry() {
    let rest = appearance(.selected, .enabled)
    #expect(rest.containerSize == tokens.containerSize && rest.boxSize == tokens.boxSize && rest.boxCornerRadius == tokens.boxShape)
    #expect(rest.outlineWidth == tokens.outlineWidth && rest.markWidth == tokens.markWidth)
    #expect(rest.labelGap == tokens.labelGap && rest.labelTypescale == tokens.labelTypescale)
    #expect([tokens.containerSize, tokens.boxSize] == [28, 16])
    #expect(tokens.boxShape == system.shape.extraSmall && tokens.containerShape == system.shape.full)
    #expect(tokens.outlineWidth == system.measure.borderHairline && tokens.markWidth == system.measure.borderThick)
    #expect(tokens.labelTypescale == system.typescale.body && tokens.labelGap == system.space.space50)
    var custom = tokens
    custom.containerSize = 40
    custom.boxSize = 20
    custom.boxShape = 6
    custom.outlineWidth = 3
    custom.markWidth = 4
    custom.labelGap = 12
    let modified = appearance(.selected, .enabled, tokens: custom)
    #expect(modified.containerSize == 40 && modified.boxSize == 20 && modified.boxCornerRadius == 6)
    #expect(modified.outlineWidth == 3 && modified.markWidth == 4 && modified.labelGap == 12)
  }

  /// CHK-5 — hovered, focused and pressed mix the condition's state-layer color into the container, a VALUE of this
  /// system; every other part keeps its resting value.
  @Test("CHK-5 each state binds that state's tokens", arguments: TanreiCheckboxCondition.core)
  func stateBindings(condition: TanreiCheckboxCondition) {
    let rest = appearance(condition, .enabled)
    let layer = tokens.conditions[condition].enabled.stateLayerColor
    let amounts: [(TanreiInteraction, Double)] = [
      (.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ]
    for (state, amount) in amounts {
      let drawn = appearance(condition, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount), "\(condition) \(state)")
      #expect(drawn.box == rest.box && drawn.mark == rest.mark && drawn.outline == rest.outline && drawn.label == rest.label)
      #expect(drawn.opacity == 1 && drawn.containerCornerRadius == tokens[state: state]?.containerShape)
    }
  }

  /// CHK-5 (verify) — under the `acme` fixture system hovered, focused and pressed are three different values.
  @Test("CHK-5 under acme, hovered, focused and pressed differ")
  func acmeStates() {
    let acme = TanreiSystem.acme.checkbox
    for condition in TanreiCheckboxCondition.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiCheckboxAppearance(tokens: acme, condition: condition, state: $0).container }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(condition)")
      #expect(containers[0] != TanreiCheckboxAppearance(tokens: tokens, condition: condition, state: .hovered).container)
    }
  }

  /// CHK-8 — disabled draws the disabled tokens of the condition: the container stays invisible, box, outline and label
  /// fade to on-surface at the disabled content opacity (an unfilled box stays unfilled), the mark is surface.
  @Test("CHK-8 disabled bindings", arguments: TanreiCheckboxCondition.core)
  func disabled(condition: TanreiCheckboxCondition) {
    let rest = appearance(condition, .enabled)
    let drawn = appearance(condition, .disabled)
    let faded = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity)
    #expect(drawn.container == TanreiPaint.none)
    #expect(drawn.box == (rest.box == TanreiPaint.none ? TanreiPaint.none : faded), "\(condition)")
    #expect(drawn.outline == faded && drawn.label == faded)
    #expect(drawn.mark == .role(.surface))
    #expect(drawn.opacity == tokens.disabled.opacity && drawn.containerCornerRadius == tokens.disabled.containerShape)
  }

  /// CHK-5 CHK-8 — the values drive the result: change one token of one state of one condition and exactly that changes.
  @Test("CHK-5 CHK-8 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.selected.hovered.containerColor = .role(.error)
    custom.conditions.selected.focused.boxColor = .role(.warning)
    custom.conditions.errorIndeterminate.pressed.markColor = .role(.success)
    custom.conditions.unselected.disabled.labelColor = .role(.secondary)
    custom.pressed.containerShape = 2
    custom.pressed.opacity = 0.4
    custom.disabled.opacity = 0.5
    #expect(appearance(.selected, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.selected, .focused, tokens: custom).box == .role(.warning))
    #expect(appearance(.errorIndeterminate, .pressed, tokens: custom).mark == .role(.success))
    #expect(appearance(.unselected, .disabled, tokens: custom).label == .role(.secondary))
    #expect(appearance(.selected, .pressed, tokens: custom).containerCornerRadius == 2)
    #expect(appearance(.selected, .pressed, tokens: custom).opacity == 0.4)
    #expect(appearance(.selected, .disabled, tokens: custom).opacity == 0.5)
    // Nothing else moved.
    #expect(appearance(.selected, .enabled, tokens: custom) == appearance(.selected, .enabled))
    #expect(appearance(.indeterminate, .hovered, tokens: custom) == appearance(.indeterminate, .hovered))
    #expect(appearance(.errorSelected, .pressed, tokens: custom).mark == appearance(.errorSelected, .pressed).mark)
  }
}

// MARK: - Open axis (the condition axis)

@MainActor
@Suite("TanreiCheckbox open condition axis")
struct TanreiCheckboxOpenAxisTests {
  let tokens = TanreiSystem.tanrei.checkbox
  let unknown = TanreiCheckboxCondition(rawValue: "sparkly")

  /// The condition axis is open to a design system though no prop can name a new value: a condition the system does not have
  /// reads `unselected`, in every state, and is reported (debug builds only).
  @Test("an unknown condition binds the default condition's tokens and is reported", arguments: TanreiInteraction.allCases)
  func unknownCondition(state: TanreiInteraction) {
    let (appearance, reports) = Reports.collecting { TanreiCheckboxAppearance(tokens: tokens, condition: unknown, state: state) }
    #expect(appearance == TanreiCheckboxAppearance(tokens: tokens, condition: .unselected, state: state))
    #expect(reports.mention("checkbox condition \"sparkly\""))
    let (_, silent) = Reports.collecting {
      for condition in TanreiCheckboxCondition.core { _ = TanreiCheckboxAppearance(tokens: tokens, condition: condition, state: state) }
    }
    #expect(silent.messages.isEmpty)
  }

  @Test("an unknown condition renders exactly like unselected; a value a system adds is used")
  func unknownRendersDefault() throws {
    let expected = try Snapshot.renderExact(TanreiCheckboxChrome(condition: .unselected, mark: .none, label: Text("Label"), isPressed: false, isFocused: false))
    let (actual, reports) = try Reports.collecting {
      try Snapshot.renderExact(TanreiCheckboxChrome(condition: unknown, mark: .none, label: Text("Label"), isPressed: false, isFocused: false))
    }
    #expect(actual.mismatch(against: expected, channelTolerance: 0) == 0)
    #expect(reports.mention("sparkly"))
    var custom = tokens
    var added = tokens.conditions.selected
    added.enabled.boxColor = .role(.warning)
    custom.conditions.extra[unknown] = added
    let (value, silent) = Reports.collecting { TanreiCheckboxAppearance(tokens: custom, condition: unknown, state: .enabled) }
    #expect(value.box == .role(.warning) && silent.messages.isEmpty)
  }
}

// MARK: - Rendered (CHK-6, CHK-8, CHK-11, CHK-12, CHK-13, CHK-15)

@MainActor
@Suite("TanreiCheckbox rendered")
struct TanreiCheckboxRenderedTests {
  /// Two paths of the same circle differ only in antialiasing (see CHK-11 below).
  static let samePathTolerance = 48
  let system = TanreiSystem.tanrei
  var tokens: TanreiCheckboxTokens { system.checkbox }

  /// CHK-12 — the box is the box size, centered in the container; filled in the box color with the check in the mark
  /// color while selected; only its outline while unselected; the container invisible at rest.
  @Test("CHK-12 the box, its fill, its outline and the check")
  func box() throws {
    let origin = boxOrigin(tokens)
    let selected = try Snapshot.render(chrome(.selected))
    let unselected = try Snapshot.render(chrome(.unselected))
    // Inside the box, away from the mark.
    let fillPoint = CGPoint(x: origin.x + 2.5, y: origin.y + 2.5)
    #expect(pixel(selected, x: fillPoint.x, y: fillPoint.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(unselected, x: fillPoint.x, y: fillPoint.y).isClose(to: light[.surface].rgba8()))
    // The outline, half its width inside the box's edge.
    let edge = CGPoint(x: origin.x + tokens.outlineWidth / 2, y: center(tokens).y)
    #expect(pixel(unselected, x: edge.x, y: edge.y).isClose(to: light[.outline].rgba8()))
    // Just outside the box: the container, invisible at rest.
    #expect(pixel(unselected, x: origin.x - 1, y: center(tokens).y).isClose(to: light[.surface].rgba8()))
    // The mark: the check's corner in the mark color while selected.
    let corner = checkCorner(tokens)
    #expect(pixel(selected, x: corner.x, y: corner.y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(unselected, x: corner.x, y: corner.y).isClose(to: light[.surface].rgba8()))
    // The dash, through the center, while indeterminate — not the check's corner.
    let dash = try Snapshot.render(chrome(.indeterminate))
    #expect(pixel(dash, x: center(tokens).x, y: center(tokens).y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(dash, x: corner.x, y: corner.y).isClose(to: light[.primary].rgba8()))
    // The render is the container (and the inset), whatever the mark.
    #expect(CGFloat(selected.width) == (tokens.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
  }

  /// CHK-12 — the fill lies inside the outline, never under it: with a translucent fill and outline (disabled), the
  /// outline's pixels are the outline alone.
  @Test("CHK-12 a translucent fill never lies under the outline")
  func fillInsideOutline() throws {
    let origin = boxOrigin(tokens)
    let disabled = try Snapshot.render(chrome(.selected).disabled(true))
    let faded = light[.onSurface].opacity(system.state.disabledContentOpacity).rgba8(over: light[.surface])
    #expect(pixel(disabled, x: origin.x + tokens.outlineWidth / 2, y: origin.y + tokens.boxSize / 2 - 3).isClose(to: faded))
    #expect(pixel(disabled, x: origin.x + tokens.outlineWidth + 1.5, y: origin.y + 2.5).isClose(to: faded))
    // The width is the token's: a thick outline in another color covers the band a hairline leaves to the fill.
    var custom = system
    custom.checkbox.outlineWidth = 3
    custom.checkbox.conditions.selected.enabled.outlineColor = .role(.error)
    let thick = try Snapshot.render(chrome(.selected), theme: theme(custom))
    #expect(pixel(thick, x: origin.x + 2.5, y: origin.y + tokens.boxSize / 2 - 3).isClose(to: light[.error].rgba8()))
    #expect(pixel(try Snapshot.render(chrome(.selected)), x: origin.x + 2.5, y: origin.y + tokens.boxSize / 2 - 3).isClose(to: light[.primary].rgba8()))
  }

  /// CHK-5 — the round container shows the state, never the box: focused and pressed render the state's container
  /// color around the box.
  @Test("CHK-5 the state shows on the round container")
  func stateContainer() throws {
    let point = containerPoint(tokens)
    let pressed = try Snapshot.render(chrome(.selected, isPressed: true))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: light[.primary].opacity(system.state.pressedStateLayerOpacity).rgba8(over: light[.surface])))
    // With focus, the ring runs around the box: read the container between the ring and the container's edge.
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.boxShape, measure: system.measure)
    let ringEdge = boxOrigin(tokens).x - metrics.outerOutset
    let outside = CGPoint(x: (Snapshot.inset + ringEdge) / 2, y: point.y)
    #expect(ringEdge - Snapshot.inset >= 1.5)
    let focused = try Snapshot.render(chrome(.unselected, isFocused: true))
    #expect(pixel(focused, x: outside.x, y: outside.y).isClose(to: light[.outline].opacity(system.state.focusStateLayerOpacity).rgba8(over: light[.surface])))
    // The container is round: its corner square is surface.
    #expect(pixel(pressed, x: Snapshot.inset + 1, y: Snapshot.inset + 1).isClose(to: light[.surface].rgba8()))
    // A modified system drives it, with precedence pressed > focused.
    var custom = system
    custom.checkbox.conditions.selected.pressed.containerColor = .role(.error)
    custom.checkbox.conditions.selected.focused.containerColor = .role(.success)
    let both = try Snapshot.render(chrome(.selected, isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(both, x: outside.x, y: outside.y).isClose(to: light[.error].rgba8()))
    let focusedOnly = try Snapshot.render(chrome(.selected, isFocused: true), theme: theme(custom))
    #expect(pixel(focusedOnly, x: outside.x, y: outside.y).isClose(to: light[.success].rgba8()))
  }

  /// CHK-6 — the focus ring around the box: offset, then the ring in the focusRing color; not when disabled; outside
  /// the layout; not dimmed by the state's opacity.
  @Test("CHK-6 the focus ring is drawn around the box")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.boxShape, measure: system.measure)
    let ringX = boxOrigin(tokens).x - metrics.outerCenterlineOutset
    let y = center(tokens).y
    let focused = try Snapshot.render(chrome(.selected, isFocused: true))
    #expect(pixel(focused, x: ringX, y: y).isClose(to: light[.focusRing].rgba8()))
    let rest = try Snapshot.render(chrome(.selected))
    #expect(!pixel(rest, x: ringX, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(focused.width == rest.width && focused.height == rest.height)
    let focusedDisabled = try Snapshot.render(chrome(.selected, isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: try Snapshot.render(chrome(.selected).disabled(true)), channelTolerance: Snapshot.channelTolerance) == 0)
    var dim = system
    dim.checkbox.focused.opacity = 0.3
    let dimmed = try Snapshot.render(chrome(.selected, isFocused: true), theme: theme(dim))
    #expect(pixel(dimmed, x: ringX, y: y).isClose(to: light[.focusRing].rgba8()))
  }

  /// CHK-8 — rendered: the disabled tokens, and the disabled opacity on the whole control (the label too).
  @Test("CHK-8 disabled renders from the disabled tokens, the label included")
  func disabledRender() throws {
    let origin = boxOrigin(tokens)
    var custom = system
    custom.checkbox.conditions.selected.disabled.boxColor = .role(.error)
    custom.checkbox.conditions.selected.disabled.labelColor = .role(.error)
    custom.checkbox.disabled.opacity = 0.5
    let bitmap = try Snapshot.render(chrome(.selected, label: "█████").disabled(true), theme: theme(custom))
    let half = light[.error].opacity(0.5).rgba8(over: light[.surface])
    #expect(pixel(bitmap, x: origin.x + 2.5, y: origin.y + 2.5).isClose(to: half))
    // The label's text, dimmed the same way (a full block glyph, read in its middle).
    let labelX = Snapshot.inset + tokens.containerSize + tokens.labelGap + 4
    #expect(pixel(bitmap, x: labelX, y: center(tokens).y).isClose(to: half, tolerance: 6))
  }

  /// CHK-11 — the box's corners follow `sys.shape.corner-smoothing` (every amount above 0 is the OS's continuous curve);
  /// the round container is unchanged by any amount; focus follows `sys.behavior.focus-style`.
  @Test("CHK-11 corner smoothing reaches the box, not the round container; focus style reaches the ring")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, pressed: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.checkbox.boxShape = 6
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.selected, isPressed: pressed, isFocused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(0.3).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
    // The round container alone (a transparent box): the same circle at 0 and 0.6.
    func container(_ amount: Double) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.checkbox.conditions.unselected.pressed.outlineColor = .none
      return try Snapshot.renderExact(chrome(.unselected, isPressed: true), theme: theme(custom))
    }
    // SwiftUI builds the continuous full-radius path differently from the circular one, so edge pixels are
    // antialiased a little differently (measured under 40/255); no pixel is a different shape.
    #expect(try container(0).mismatch(against: try container(0.6), channelTolerance: Self.samePathTolerance) == 0)
  }

  /// CHK-13 — the selection motion is the checkbox's own; the state motion is the state's; both are nil under Reduce
  /// Motion (the new condition is shown at once), and so is the ripple's growth.
  @Test("CHK-13 CHK-5 the selection and state motions come from the tokens; none under Reduce Motion")
  func motions() {
    var custom = tokens
    custom.motionSelectionDuration = 700
    custom.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionStateDuration = 300
    let motion = custom.motion(reduceMotion: false)
    #expect(motion.selection == Animation.timingCurve(0, 0, 1, 1, duration: 0.7))
    let easing = custom.motionStateEasing
    #expect(motion.state == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: 0.3))
    #expect(custom.motion(reduceMotion: true) == TanreiSelectionMotion(stateDuration: 1, stateEasing: easing, selectionDuration: 1, selectionEasing: easing, reduceMotion: true))
    #expect(custom.motion(reduceMotion: true).selection == nil && custom.motion(reduceMotion: true).state == nil)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil && tokens.rippleGrowth(reduceMotion: false) != nil)
  }

  /// CHK-13 — rendered under Reduce Motion, a change of condition is drawn at once: the first render after the change
  /// is the new condition, whole.
  @Test("CHK-13 under Reduce Motion the new condition shows at once")
  func reduceMotionShowsAtOnce() throws {
    let view = chrome(.selected).environment(\._accessibilityReduceMotion, true)
    let reference = try Snapshot.renderExact(chrome(.selected))
    #expect(try Snapshot.renderExact(view).mismatch(against: reference, channelTolerance: 0) == 0)
  }

  /// CHK-15 — the label starts `labelGap` after the container, in the label color; the control is centered on its
  /// first line when the label wraps; right-to-left mirrors the order.
  @Test("CHK-15 the label sits at the container's inline end; right-to-left mirrors it")
  func labelLayout() throws {
    var custom = system
    custom.checkbox.conditions.selected.enabled.labelColor = .role(.error)
    let label = "██"
    let ltr = try Snapshot.render(chrome(.selected, label: label), theme: theme(custom))
    let start = Snapshot.inset + tokens.containerSize + tokens.labelGap
    let y = center(tokens).y
    #expect(!pixel(ltr, x: start - 1, y: y).isClose(to: light[.error].rgba8()))
    #expect(pixel(ltr, x: start + 3, y: y).isClose(to: light[.error].rgba8(), tolerance: 6))
    // Right to left: the box at the right end, the label to its left, the check not mirrored.
    let rtl = try Snapshot.render(chrome(.selected, label: label).environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    #expect(rtl.width == ltr.width)
    let width = CGFloat(rtl.width) / Snapshot.scale
    let rtlCorner = CGPoint(x: width - Snapshot.inset - tokens.containerSize + (checkCorner(tokens).x - Snapshot.inset), y: checkCorner(tokens).y)
    #expect(pixel(rtl, x: rtlCorner.x, y: rtlCorner.y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(rtl, x: width - start - 3, y: y).isClose(to: light[.error].rgba8(), tolerance: 6))
    #expect(pixel(rtl, x: Snapshot.inset + tokens.containerSize / 2, y: y).isClose(to: light[.surface].rgba8()) == false)
  }

  /// CHK-15 — a label that wraps grows the checkbox downwards; the box stays beside the first line; the text is never
  /// truncated.
  @Test("CHK-15 a wrapped label keeps the box on its first line")
  func wrapping() throws {
    let long = "A label long enough to wrap onto more than one line"
    let one = try Snapshot.render(chrome(.selected, label: "Short"))
    let wrapped = try Snapshot.render(chrome(.selected, label: long).frame(width: 160))
    #expect(wrapped.height > one.height + Int(tokens.labelTypescale.lineHeight * Snapshot.scale))
    // The box stays beside the FIRST line: its top row is where it is with a one-line label.
    let row = Int((boxOrigin(tokens).y + 2.5) * Snapshot.scale)
    let above = Int((boxOrigin(tokens).y - 1) * Snapshot.scale)
    let primary = light[.primary].rgba8()
    #expect((0..<wrapped.width).contains { wrapped[$0, row].isClose(to: primary) })
    #expect((0..<one.width).contains { one[$0, row].isClose(to: primary) })
    #expect(!(0..<wrapped.width).contains { wrapped[$0, above].isClose(to: primary) })
  }

  /// "The label wraps at 200% text size; the box does not grow with text" (accessibility notes).
  @Test("the box does not grow with Dynamic Type")
  func noDynamicTypeForTheBox() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(TanreiCheckbox("", isOn: .constant(true)).environment(\.dynamicTypeSize, size))
    }
    let (regular, _) = try Reports.collecting { try render(.large) }
    let (huge, _) = try Reports.collecting { try render(.accessibility5) }
    #expect(huge.width == regular.width && huge.height == regular.height)
    #expect(huge.mismatch(against: regular, channelTolerance: 0) == 0)
  }
}

// MARK: - Press (CHK-9, CHK-10)

@MainActor
@Suite("TanreiCheckbox press", .serialized)
struct TanreiCheckboxPressTests {
  /// A system whose pressed tokens differ from rest in every part of `selected`, so each choice is told apart.
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.checkbox.conditions.selected.pressed.containerColor = .role(.error)
    system.checkbox.conditions.selected.pressed.boxColor = .role(.warning)
    system.checkbox.conditions.selected.pressed.labelColor = .role(.success)
    system.checkbox.conditions.selected.focused.containerColor = .role(.success)
    system.checkbox.pressed.opacity = 0.5
    return system
  }

  /// CHK-10 — which tokens a press reads under each choice.
  @Test("CHK-10 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).checkbox
    let selected = tokens.conditions.selected
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiCheckboxAppearance(tokens: tokens, condition: .selected, state: .pressed, feedback: feedback, beneath: beneath)
      let under = selected[state: beneath]
      switch feedback {
      case .overlay:
        #expect(appearance.container == selected.pressed.containerColor && appearance.ripple == nil)
        #expect(appearance.box == selected.pressed.boxColor && appearance.opacity == tokens.pressed.opacity)
      case .ripple:
        #expect(appearance.container == under.containerColor && appearance.ripple == selected.pressed.containerColor)
        #expect(appearance.box == selected.pressed.boxColor && appearance.label == selected.pressed.labelColor)
      case .dim:
        #expect(appearance.container == under.containerColor && appearance.ripple == nil)
        #expect(appearance.box == selected.pressed.boxColor && appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiCheckboxAppearance(tokens: tokens, condition: .selected, state: beneath))
      }
    }
  }

  /// CHK-10 — rendered under a system that sets each value.
  @Test("CHK-10 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system.checkbox)
    let bitmap = try Snapshot.render(chrome(.selected, isPressed: true), theme: theme(system))
    let actual = pixel(bitmap, x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple:
      // A render that never saw the press begin shows the ripple grown: the same pixels as overlay.
      #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim:
      #expect(actual.isClose(to: colors[.surface].rgba8()))
    case .none:
      #expect(actual.isClose(to: colors[.surface].rgba8()))
    }
    if feedback == .dim || feedback == .none {
      let focused = try Snapshot.render(chrome(.selected, isPressed: true, isFocused: true), theme: theme(system))
      let expected = feedback == .dim ? colors[.success].opacity(0.5).rgba8(over: colors[.surface]) : colors[.success].rgba8()
      let outside = outsideRingPoint(system)
      #expect(pixel(focused, x: outside.x, y: outside.y).isClose(to: expected))
    }
  }

  /// CHK-10 — the shipped systems, by their own values: m3-like ripples, cupertino dims, the default overlays.
  @Test("CHK-10 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiCheckboxAppearance {
      TanreiCheckboxAppearance(tokens: system.checkbox, condition: .selected, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.checkbox.conditions.selected.pressed.containerColor)
    #expect(pressed(.m3Like).container == TanreiSystem.m3Like.checkbox.conditions.selected.enabled.containerColor)
    let cupertino = pressed(.cupertino)
    #expect(cupertino.ripple == nil && cupertino.opacity == TanreiSystem.cupertino.checkbox.pressed.opacity && cupertino.opacity < 1)
    #expect(pressed(.tanrei).ripple == nil && pressed(.tanrei).container == TanreiSystem.tanrei.checkbox.conditions.selected.pressed.containerColor)
  }

  /// CHK-10 — the ripple grows over comp.checkbox.motion.feedback-duration with the state easing.
  @Test("CHK-10 the ripple grows over the checkbox's own feedback duration")
  func rippleTiming() {
    var tokens = TanreiSystem.m3Like.checkbox
    let easing = tokens.motionStateEasing
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: tokens.motionFeedbackDuration / 1000))
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  /// CHK-10 — the point of contact is measured in the round container only: the press tracking of a selection control
  /// hands the container its sink (under `ripple`), and a press elsewhere — on the label — has no point: the center.
  @Test("CHK-10 the ripple's point of contact is the container's; a press on the label grows from its center")
  func contactInTheContainer() throws {
    final class Probe: @unchecked Sendable {
      var sinks: [Bool] = []
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.tanreiContactSink) private var sink
      var body: some View {
        probe.sinks.append(sink != nil)
        return Color.clear.frame(width: 1, height: 1)
      }
    }
    for (area, watches, expected) in [(TanreiContactArea.part, true, true), (.part, false, false), (.whole, true, false)] {
      let probe = Probe()
      _ = try Snapshot.render(TanreiPressTracking(isPressed: false, watchesContact: watches, contactArea: area) { _ in Reader(probe: probe) })
      #expect(probe.sinks.last == expected, "\(area) \(watches)")
    }
    // A contact outside the container's bounds is no contact (iOS: `TanreiTouchObserver`; macOS: the hover ends).
    let ripple = TanreiRippleShape(origin: nil, progress: TanreiRippleShape.grown)
    let rect = CGRect(x: 0, y: 0, width: 28, height: 28)
    #expect(ripple.path(in: rect).boundingRect.midX == rect.midX)
  }

  #if os(macOS)
  private func holdSystem(holdMs: Double) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = holdMs
    system.checkbox.motionStateDuration = 0  // no fade: a color read is the state, not a frame of a transition
    system.checkbox.motionSelectionDuration = 0
    system.checkbox.conditions.unselected.pressed.containerColor = .role(.error)
    system.checkbox.conditions.selected.pressed.containerColor = .role(.error)
    return system
  }

  /// CHK-9 end to end with real mouse events: pressed at once on mouse-down, still pressed after a quick release, at
  /// rest again once press-hold has passed — and the checkbox switched exactly once (CHK-1).
  @Test("CHK-9 CHK-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    let system = holdSystem(holdMs: 1500)
    let colors = system.colors.light
    let choice = Choice(false)
    let hosted = HostedView(
      TanreiCheckbox("Email me updates", isOn: choice.binding).fixedSize().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = containerPoint(system.checkbox)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.surface].rgba8()))
    hosted.mouse(.leftMouseDown, at: center(system.checkbox))
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: center(system.checkbox))
    hosted.settle()
    #expect(choice.changes == [true])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // The hold ends once press-hold has passed (checked with slack: the machine may be loaded).
    #expect(await hosted.wait(atMost: 6) { hosted.color(at: point)?.isClose(to: colors[.surface].rgba8()) == true })
    #expect(choice.changes == [true])
  }

  /// CHK-1 under `ripple`: recording the point of contact must not take the click away from the checkbox.
  @Test("CHK-1 CHK-10 a click still switches exactly once under ripple")
  func clickUnderRipple() {
    let choice = Choice(false)
    let hosted = HostedView(TanreiCheckbox("Email me updates", isOn: choice.binding).fixedSize().padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: Snapshot.inset + TanreiSystem.m3Like.checkbox.containerSize / 2, y: hosted.size.height / 2))
    #expect(choice.changes == [true])
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiCheckbox under the shipped presets")
struct TanreiCheckboxPresetTests {
  /// The presets' values, read from the instances: m3-like box 18 in a 40 container with thick outline and mark, the
  /// unchecked state layer on-surface; cupertino 16 in 28, a press dims, no hover state layer.
  @Test("CHK-5 CHK-12 the presets' own values reach the checkbox")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.checkbox
    #expect(m3.boxSize == 18 && m3.containerSize == 40 && m3.boxShape == 2)
    #expect(m3.outlineWidth == TanreiSystem.m3Like.measure.borderThick && m3.markWidth == TanreiSystem.m3Like.measure.borderThick)
    #expect(m3.conditions.unselected.enabled.stateLayerColor == .role(.onSurface))
    #expect(TanreiCheckboxAppearance(tokens: m3, condition: .unselected, state: .enabled).outline == .role(.onSurfaceVariant))
    let cupertino = TanreiSystem.cupertino.checkbox
    #expect(cupertino.boxSize == 16 && cupertino.containerSize == 28)
    for condition in TanreiCheckboxCondition.core {
      let rest = TanreiCheckboxAppearance(tokens: cupertino, condition: condition, state: .enabled)
      #expect(TanreiCheckboxAppearance(tokens: cupertino, condition: condition, state: .hovered) == rest)
    }
    // Each system lays out its own container.
    for shipped in ShippedSystem.allCases {
      let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiCheckbox("", isOn: .constant(true)), theme: theme(shipped.system)) }
      #expect(CGFloat(bitmap.width) == (shipped.system.checkbox.containerSize + 2 * Snapshot.inset) * Snapshot.scale, "\(shipped.rawValue)")
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiCheckbox snapshots")
struct TanreiCheckboxSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var checked = false
    var indeterminate = false
    var error = false
    var disabled = false
    let label: String
    var labelHidden = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/checkbox.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "unselected", label: "Email me updates"),
    Fixture(id: "selected", checked: true, label: "Email me updates"),
    Fixture(id: "indeterminate", indeterminate: true, label: "Select all"),
    Fixture(id: "error-unselected", error: true, label: "I accept the terms"),
    Fixture(id: "error-selected", checked: true, error: true, label: "I accept the terms"),
    Fixture(id: "error-indeterminate", indeterminate: true, error: true, label: "Select all"),
    Fixture(id: "disabled-unselected", disabled: true, label: "Email me updates"),
    Fixture(id: "disabled-selected", checked: true, disabled: true, label: "Email me updates"),
    Fixture(id: "disabled-indeterminate", indeterminate: true, disabled: true, label: "Select all"),
    Fixture(id: "label-hidden", checked: true, label: "Select row", labelHidden: true),
  ]

  /// The fixture as a product writes it.
  static func view(_ fixture: Fixture) -> some View {
    Group {
      if fixture.labelHidden {
        TanreiCheckbox(fixture.label, isOn: .constant(fixture.checked), isIndeterminate: fixture.indeterminate, isError: fixture.error).labelsHidden()
      } else {
        TanreiCheckbox(fixture.label, isOn: .constant(fixture.checked), isIndeterminate: fixture.indeterminate, isError: fixture.error)
      }
    }
    .disabled(fixture.disabled)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "checkbox")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect((theirs.bool("checked") ?? false) == ours.checked, "\(ours.id)")
      #expect((theirs.bool("indeterminate") ?? false) == ours.indeterminate, "\(ours.id)")
      #expect((theirs.bool("error") ?? false) == ours.error, "\(ours.id)")
      #expect((theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect((theirs.bool("labelHidden") ?? false) == ours.labelHidden, "\(ours.id)")
      #expect(theirs.string("label") == ours.label, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiCheckboxTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiCheckbox preset snapshots")
struct TanreiCheckboxPresetSnapshotTests {
  /// Checked: it shows the preset's box, corner, outline, mark, container and label.
  nonisolated static let fixtureId = "selected"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiCheckboxSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiCheckboxSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiCheckboxSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

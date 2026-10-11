import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/radio-button.spec.json. Each behavior id (RAD-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. RAD-9, RAD-11, RAD-12 and RAD-13 are BTN-5, BTN-8, BTN-9 and BTN-10
// for this component: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here
// each is proven to reach the radio button. The group's rules (RAD-3 … RAD-5, RAD-16) are tested as the pure rules of
// `TanreiRadioGroupNavigation`, through the group's model, and end to end in a hosted group; the arrow keys themselves
// need keyboard focus, which neither a unit test nor the simulator under automation gives.
//
// Geometry: a render is the option plus `Snapshot.inset` on every side; the ring is centered in the round container,
// the label starts `labelGap` after it. A hosted option is `.fixedSize()`: its label wraps, so its minimum height
// would otherwise become the test window's minimum size.

private let suiteName = "TanreiRadioButtonTests"

private enum Frequency: Hashable {
  case daily, weekly, never
}

/// The selection of a question, outside any view: what a `Binding` in a real app points at.
@MainActor
private final class Answer {
  var value: Frequency?
  var changes: [Frequency?] = []
  init(_ value: Frequency?) { self.value = value }

  var binding: Binding<Frequency?> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { value in
        MainActor.assumeIsolated {
          self.value = value
          self.changes.append(value)
        }
      })
  }
}

@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

private let light = TanreiSystem.tanrei.colors.light

@MainActor
private func chrome(_ condition: TanreiRadioButtonCondition = .selected, label: String? = nil, isPressed: Bool = false, isFocused: Bool = false) -> some View {
  TanreiRadioButtonChrome(condition: condition, label: label.map { Text($0) }, isPressed: isPressed, isFocused: isFocused)
}

@MainActor
private func center(_ tokens: TanreiRadioButtonTokens) -> CGPoint {
  CGPoint(x: Snapshot.inset + tokens.containerSize / 2, y: Snapshot.inset + tokens.containerSize / 2)
}

/// The leading edge of the ring in a render.
@MainActor
private func ringLeading(_ tokens: TanreiRadioButtonTokens) -> CGFloat {
  Snapshot.inset + (tokens.containerSize - tokens.ringSize) / 2
}

/// A point of the round container outside the ring and its focus ring: half-way between the focus ring's outer edge
/// and the container's leading edge.
@MainActor
private func containerPoint(_ system: TanreiSystem) -> CGPoint {
  let tokens = system.radioButton
  let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.ringSize / 2, measure: system.measure)
  return CGPoint(x: (Snapshot.inset + ringLeading(tokens) - metrics.outerOutset) / 2, y: Snapshot.inset + tokens.containerSize / 2)
}

/// Entries of a group, in order: `enabled` and `selected` per option.
private func entries(_ flags: [(enabled: Bool, selected: Bool)]) -> [TanreiRadioOptionEntry] {
  flags.map { TanreiRadioOptionEntry(id: TanreiRadioOptionID(), isEnabled: $0.enabled, isSelected: $0.selected) }
}

// MARK: - Activation (RAD-1, RAD-2, RAD-3, RAD-6, RAD-18)

@MainActor
@Suite("TanreiRadioButton activation", .serialized)
struct TanreiRadioButtonActivationTests {
  /// RAD-1 — activating an unselected option selects it and emits change once with its value.
  @Test("RAD-1 activation writes the option's value once")
  func activationSelects() {
    let answer = Answer(nil)
    TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding).activate(isEnabled: true)
    #expect(answer.value == .weekly && answer.changes == [.weekly])
  }

  /// RAD-2 — activating the selected option changes nothing and emits nothing: it is never cleared by itself.
  @Test("RAD-2 activating the selected option does not emit")
  func selectedStaysSelected() {
    let answer = Answer(.weekly)
    let option = TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding)
    #expect(option.isSelected && option.condition == .selected)
    option.activate(isEnabled: true)
    #expect(answer.value == .weekly && answer.changes.isEmpty)
  }

  /// RAD-3 — selecting one option unselects the others of its group, which emit nothing: they read the shared value.
  @Test("RAD-3 selecting one option unselects the others without emitting")
  func othersUnselect() {
    let answer = Answer(.daily)
    let daily = TanreiRadioButton("Daily", value: Frequency.daily, selection: answer.binding)
    let weekly = TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding)
    #expect(daily.condition == .selected && weekly.condition == .unselected)
    weekly.activate(isEnabled: true)
    #expect(answer.changes == [.weekly])
    #expect(daily.condition == .unselected && weekly.condition == .selected)
  }

  /// RAD-6 — a disabled option neither changes nor emits.
  @Test("RAD-6 disabled: no change")
  func disabledDoesNotChange() {
    let answer = Answer(nil)
    TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding).activate(isEnabled: false)
    #expect(answer.value == nil && answer.changes.isEmpty)
  }

  /// RAD-1 / RAD-11 — Space selects; Enter is not a selection control's key on iOS or macOS.
  @Test("RAD-1 RAD-11 Space activates, Enter does not")
  func keys() {
    #expect(TanreiActivationKeys.selection == [.space])
  }

  /// RAD-18 — an empty label is reported in debug builds, and the option still renders; `.labelsHidden()` draws no
  /// label and keeps the title as the name.
  @Test("RAD-18 an empty label is reported; labelsHidden draws no label")
  func labels() throws {
    let answer = Answer(.weekly)
    let (_, reports) = Reports.collecting {
      _ = TanreiRadioButton("", value: Frequency.weekly, selection: answer.binding)
      _ = TanreiRadioButton(LocalizedStringKey(""), value: Frequency.weekly, selection: answer.binding)
    }
    #expect(reports.messages.count == 2 && reports.mention("radio button") && reports.mention("RAD-18"))
    let (_, silent) = Reports.collecting { _ = TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding) }
    #expect(silent.messages.isEmpty)
    let tokens = TanreiSystem.tanrei.radioButton
    let (bare, _) = try Reports.collecting { try Snapshot.renderExact(TanreiRadioButton("", value: Frequency.weekly, selection: .constant(.weekly))) }
    #expect(CGFloat(bare.width) == (tokens.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
    guard #available(macOS 15, iOS 18, *) else { return }
    let hidden = try Snapshot.renderExact(TanreiRadioButton("Weekly", value: Frequency.weekly, selection: .constant(.weekly)).labelsHidden())
    #expect(hidden.mismatch(against: bare, channelTolerance: 0) == 0)
  }

  #if os(macOS)
  /// RAD-1 by pointer, on the ring and on the label; RAD-2 a click on the selected one emits nothing; RAD-6 disabled
  /// ignores clicks, its label's too.
  @Test("RAD-1 RAD-2 RAD-6 clicks on the ring and on the label select once; never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let answer = Answer(nil)
    let hosted = HostedView(
      TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding)
        .disabled(!isEnabled).fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let tokens = Snapshot.theme.system.radioButton
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.containerSize + tokens.labelGap + 15, y: center(tokens).y))
    #expect(answer.changes == (isEnabled ? [.weekly] : []))
    hosted.click(at: center(tokens))
    #expect(answer.changes == (isEnabled ? [.weekly] : []))
  }

  /// RAD-9 end to end: a click above the ring but inside the minimum target selects it; beyond it nothing happens.
  @Test("RAD-9 a click in the extended hit area selects it")
  func extendedHitAreaClick() {
    let answer = Answer(nil)
    let hosted = HostedView(
      TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding).fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let system = Snapshot.theme.system
    let outset = (TanreiHitTarget.minimum(in: system.measure) - system.radioButton.containerSize) / 2
    #expect(outset > 0)
    hosted.click(at: CGPoint(x: center(system.radioButton).x, y: Snapshot.inset - outset - 1))
    #expect(answer.changes.isEmpty)
    hosted.click(at: CGPoint(x: center(system.radioButton).x, y: Snapshot.inset - outset / 2))
    #expect(answer.changes == [.weekly])
  }
  #endif
}

// MARK: - The group (RAD-3, RAD-4, RAD-5, RAD-16)

@MainActor
@Suite("TanreiRadioGroup", .serialized)
struct TanreiRadioGroupTests {
  /// RAD-4 — Down and Right go to the next option, Up and Left to the previous; right to left, Right and Left swap.
  @Test("RAD-4 the arrow keys and the layout direction")
  func arrowDirections() {
    #expect(TanreiRadioGroupNavigation.keys == [.upArrow, .downArrow, .leftArrow, .rightArrow])
    #expect(TanreiRadioGroupNavigation.isForward(.downArrow, layoutDirection: .leftToRight) == true)
    #expect(TanreiRadioGroupNavigation.isForward(.rightArrow, layoutDirection: .leftToRight) == true)
    #expect(TanreiRadioGroupNavigation.isForward(.upArrow, layoutDirection: .leftToRight) == false)
    #expect(TanreiRadioGroupNavigation.isForward(.leftArrow, layoutDirection: .leftToRight) == false)
    #expect(TanreiRadioGroupNavigation.isForward(.rightArrow, layoutDirection: .rightToLeft) == false)
    #expect(TanreiRadioGroupNavigation.isForward(.leftArrow, layoutDirection: .rightToLeft) == true)
    #expect(TanreiRadioGroupNavigation.isForward(.downArrow, layoutDirection: .rightToLeft) == true)
    #expect(TanreiRadioGroupNavigation.isForward(.space, layoutDirection: .leftToRight) == nil)
  }

  /// RAD-4 / RAD-6 — the next enabled option, wrapping at both ends; disabled options are skipped.
  @Test("RAD-4 RAD-6 the next and previous enabled options, wrapping, skipping disabled ones")
  func targets() {
    let options = entries([(true, false), (false, false), (true, true), (true, false)])
    let ids = options.map(\.id)
    #expect(TanreiRadioGroupNavigation.target(from: ids[0], forward: true, in: options) == ids[2])
    #expect(TanreiRadioGroupNavigation.target(from: ids[2], forward: false, in: options) == ids[0])
    #expect(TanreiRadioGroupNavigation.target(from: ids[3], forward: true, in: options) == ids[0])
    #expect(TanreiRadioGroupNavigation.target(from: ids[0], forward: false, in: options) == ids[3])
    let lone = entries([(true, true), (false, false)])
    #expect(TanreiRadioGroupNavigation.target(from: lone[0].id, forward: true, in: lone) == nil)
  }

  /// RAD-5 — one tab stop: the selected option, or the first enabled one while none (or a disabled one) is selected.
  @Test("RAD-5 the tab stop is the selected option, else the first enabled one")
  func tabStop() {
    let selected = entries([(true, false), (true, true), (true, false)])
    #expect(TanreiRadioGroupNavigation.tabStop(selected) == selected[1].id)
    let none = entries([(false, false), (true, false), (true, false)])
    #expect(TanreiRadioGroupNavigation.tabStop(none) == none[1].id)
    let disabledSelected = entries([(true, false), (false, true)])
    #expect(TanreiRadioGroupNavigation.tabStop(disabledSelected) == disabledSelected[0].id)
    #expect(TanreiRadioGroupNavigation.tabStop(entries([(false, false)])) == nil)
  }

  /// RAD-16 — each option's position and the group's size.
  @Test("RAD-16 the position of an option in its group")
  func position() {
    let options = entries([(true, false), (true, true), (false, false)])
    #expect(TanreiRadioGroupNavigation.positionText(of: options[1].id, in: options) == "2 of 3")
    #expect(TanreiRadioGroupNavigation.positionText(of: TanreiRadioOptionID(), in: options) == nil)
  }

  /// RAD-4 / RAD-5 — a move selects the target through its own action, makes it the tab stop at once (before the
  /// options report the new selection), and gives it focus.
  @Test("RAD-4 RAD-5 a move selects the target and makes it the tab stop")
  func modelMove() async {
    let model = TanreiRadioGroupModel()
    let options = entries([(true, true), (true, false), (true, false)])
    model.update(options)
    var selected: [Int] = []
    var focused: [Int] = []
    for (index, option) in options.enumerated() {
      model.register(option.id, select: { selected.append(index) }, focus: { focused.append(index) })
    }
    #expect(model.isTabStop(options[0].id) && !model.isTabStop(options[1].id))
    model.move(from: options[0].id, forward: true)
    #expect(selected == [1])
    #expect(model.isTabStop(options[1].id) && !model.isTabStop(options[0].id))
    await Task.yield()
    #expect(focused == [1])
    // Once the options report it, the pending tab stop is settled by the selection itself.
    model.update(options.indices.map { TanreiRadioOptionEntry(id: options[$0].id, isEnabled: true, isSelected: $0 == 1) })
    #expect(model.isTabStop(options[1].id))
    model.move(from: options[1].id, forward: false)
    #expect(selected == [1, 0])
  }

  #if os(macOS)
  /// RAD-3 / RAD-16 end to end: a hosted group collects its options in order (the preference), exposes each one's
  /// position, and a click on one option unselects the other through the shared selection.
  @Test("RAD-3 RAD-16 a hosted group knows its options in order; a click moves the selection")
  func hostedGroup() throws {
    final class Probe: @unchecked Sendable {
      var model: TanreiRadioGroupModel?
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.tanreiRadioGroup) private var group
      var body: some View {
        probe.model = group
        return Color.clear.frame(width: 1, height: 1)
      }
    }
    /// Owns the selection in `@State`, as an app does, and reports each change.
    struct Question: View {
      let probe: Probe
      let answer: Answer
      @State private var value: Frequency? = .daily
      var body: some View {
        let selection = Binding(get: { value }, set: { value = $0; answer.changes.append($0) })
        TanreiRadioGroup("Email frequency") {
          TanreiRadioButton("Daily", value: Frequency.daily, selection: selection)
          TanreiRadioButton("Weekly", value: Frequency.weekly, selection: selection)
          TanreiRadioButton("Never", value: Frequency.never, selection: selection).disabled(true)
          Reader(probe: probe)
        }
      }
    }
    let probe = Probe()
    let answer = Answer(.daily)
    let hosted = HostedView(Question(probe: probe, answer: answer).fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    hosted.settle()
    let model = try #require(probe.model)
    #expect(model.options.count == 3)
    #expect(model.options.map(\.isSelected) == [true, false, false])
    #expect(model.options.map(\.isEnabled) == [true, true, false])
    #expect(model.options.indices.map { model.positionText(of: model.options[$0].id) } == ["1 of 3", "2 of 3", "3 of 3"])
    #expect(model.isTabStop(model.options[0].id))
    // A click on "Weekly" (the second row).
    let tokens = Snapshot.theme.system.radioButton
    hosted.click(at: CGPoint(x: center(tokens).x, y: center(tokens).y + tokens.containerSize))
    hosted.settle()
    #expect(answer.changes == [.weekly])
    #expect(model.options.map(\.isSelected) == [false, true, false])
    #expect(model.isTabStop(model.options[1].id))
  }
  #endif
}

// MARK: - Token bindings (RAD-7, RAD-10, RAD-14)

@MainActor
@Suite("TanreiRadioButton token bindings")
struct TanreiRadioButtonTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiRadioButtonTokens { system.radioButton }

  private func appearance(_ condition: TanreiRadioButtonCondition, _ state: TanreiInteraction, tokens: TanreiRadioButtonTokens? = nil) -> TanreiRadioButtonAppearance {
    TanreiRadioButtonAppearance(tokens: tokens ?? self.tokens, condition: condition, state: state)
  }

  /// RAD-14 — at rest: unselected is an outline ring and no dot, selected a primary ring and dot; the
  /// container is transparent; the state-layer color is the ring color.
  @Test("RAD-14 at rest each condition binds the expected color roles")
  func roles() {
    let off = appearance(.unselected, .enabled)
    let on = appearance(.selected, .enabled)
    #expect(off.container == TanreiPaint.none && on.container == TanreiPaint.none)
    #expect(off.ring == .role(.outline) && off.dot == TanreiPaint.none && off.dotScale == 0)
    #expect(on.ring == .role(.primary) && on.dot == .role(.primary) && on.dotScale == 1)
    #expect(off.label == .role(.onSurface) && on.label == .role(.onSurface))
    for condition in TanreiRadioButtonCondition.core {
      #expect(tokens.conditions[condition].enabled.stateLayerColor == appearance(condition, .enabled).ring)
    }
    for (themeAppearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(on.ring.resolve(in: colors) == scheme.value(.primary) && off.ring.resolve(in: colors) == scheme.value(.outline))
    }
  }

  /// RAD-14 — the geometry reads its tokens: container 28, ring 16 at hairline, dot 8, label body at space50.
  @Test("RAD-14 RAD-17 the geometry binds its tokens")
  func geometry() {
    let rest = appearance(.selected, .enabled)
    #expect([rest.containerSize, rest.ringSize, rest.ringWidth, rest.dotSize] == [tokens.containerSize, tokens.ringSize, tokens.ringWidth, tokens.dotSize])
    #expect([tokens.containerSize, tokens.ringSize, tokens.dotSize] == [28, 16, 8] && tokens.ringWidth == system.measure.borderHairline)
    #expect(rest.labelGap == system.space.space50 && rest.labelTypescale == system.typescale.body)
    var custom = tokens
    custom.ringSize = 24
    custom.ringWidth = 3
    custom.dotSize = 12
    custom.containerSize = 44
    let modified = appearance(.selected, .enabled, tokens: custom)
    #expect([modified.ringSize, modified.ringWidth, modified.dotSize, modified.containerSize] == [24, 3, 12, 44])
  }

  /// RAD-7 — hovered, focused and pressed mix the condition's state-layer color into the container; every other part
  /// keeps its resting value.
  @Test("RAD-7 each state binds that state's tokens", arguments: TanreiRadioButtonCondition.core)
  func stateBindings(condition: TanreiRadioButtonCondition) {
    let rest = appearance(condition, .enabled)
    let layer = tokens.conditions[condition].enabled.stateLayerColor
    for (state, amount) in [(TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity)] {
      let drawn = appearance(condition, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.ring == rest.ring && drawn.dot == rest.dot && drawn.label == rest.label && drawn.opacity == 1)
    }
  }

  /// RAD-7 (verify) — under the `acme` fixture system hovered, focused and pressed are three different values.
  @Test("RAD-7 under acme, hovered, focused and pressed differ")
  func acmeStates() {
    for condition in TanreiRadioButtonCondition.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiRadioButtonAppearance(tokens: TanreiSystem.acme.radioButton, condition: condition, state: $0).container }
      #expect(Set(containers.map { "\($0)" }).count == 3, "\(condition)")
    }
  }

  /// RAD-10 — disabled: the container stays invisible; ring, dot (while selected) and label fade to on-surface at the
  /// disabled content opacity.
  @Test("RAD-10 disabled bindings")
  func disabled() {
    let faded = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity)
    let on = appearance(.selected, .disabled)
    let off = appearance(.unselected, .disabled)
    #expect(on.container == TanreiPaint.none && on.ring == faded && on.dot == faded && on.label == faded)
    #expect(off.container == TanreiPaint.none && off.ring == faded && off.label == faded && off.dotScale == 0)
    #expect(on.opacity == tokens.disabled.opacity)
  }

  /// RAD-7 RAD-10 — the values drive the result.
  @Test("RAD-7 RAD-10 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.selected.hovered.containerColor = .role(.error)
    custom.conditions.selected.focused.ringColor = .role(.warning)
    custom.conditions.unselected.pressed.labelColor = .role(.success)
    custom.conditions.selected.disabled.dotColor = .role(.secondary)
    custom.pressed.opacity = 0.4
    custom.pressed.containerShape = 3
    #expect(appearance(.selected, .hovered, tokens: custom).container == .role(.error))
    #expect(appearance(.selected, .focused, tokens: custom).ring == .role(.warning))
    #expect(appearance(.unselected, .pressed, tokens: custom).label == .role(.success))
    #expect(appearance(.selected, .disabled, tokens: custom).dot == .role(.secondary))
    #expect(appearance(.selected, .pressed, tokens: custom).opacity == 0.4)
    #expect(appearance(.selected, .pressed, tokens: custom).containerCornerRadius == 3)
    #expect(appearance(.selected, .enabled, tokens: custom) == appearance(.selected, .enabled))
    #expect(appearance(.unselected, .hovered, tokens: custom) == appearance(.unselected, .hovered))
  }

  /// The condition axis is open to a design system: an unknown condition reads `unselected` and is reported.
  @Test("an unknown condition binds the default condition's tokens and is reported", arguments: TanreiInteraction.allCases)
  func unknownCondition(state: TanreiInteraction) {
    let unknown = TanreiRadioButtonCondition(rawValue: "sparkly")
    let (value, reports) = Reports.collecting { TanreiRadioButtonAppearance(tokens: tokens, condition: unknown, state: state) }
    #expect(value == TanreiRadioButtonAppearance(tokens: tokens, condition: .unselected, state: state))
    #expect(reports.mention("radio-button condition \"sparkly\""))
    #expect(TanreiRadioButtonCondition.core == [.unselected, .selected] && TanreiRadioButtonCondition.fallback == .unselected)
  }
}

// MARK: - Rendered (RAD-7, RAD-8, RAD-10, RAD-13, RAD-14, RAD-15, RAD-17)

@MainActor
@Suite("TanreiRadioButton rendered")
struct TanreiRadioButtonRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiRadioButtonTokens { system.radioButton }

  /// RAD-14 — the ring stroked inside its diameter, the dot centered while selected, no dot while unselected; the
  /// container invisible at rest.
  @Test("RAD-14 the ring and the dot")
  func ringAndDot() throws {
    let on = try Snapshot.render(chrome(.selected))
    let off = try Snapshot.render(chrome(.unselected))
    let c = center(tokens)
    #expect(pixel(on, x: c.x, y: c.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(off, x: c.x, y: c.y).isClose(to: light[.surface].rgba8()))
    // The ring: half its width inside the ring's edge; just outside it, the invisible container.
    let edge = ringLeading(tokens) + tokens.ringWidth / 2
    #expect(pixel(off, x: edge, y: c.y).isClose(to: light[.outline].rgba8()))
    #expect(pixel(on, x: edge, y: c.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(off, x: ringLeading(tokens) - 1, y: c.y).isClose(to: light[.surface].rgba8()))
    // Between the ring and the dot: surface.
    let gap = ringLeading(tokens) + (tokens.ringSize - tokens.dotSize) / 4 + tokens.ringWidth / 2
    #expect(pixel(on, x: gap, y: c.y).isClose(to: light[.surface].rgba8()))
    // The dot's edge: inside it primary, outside it surface.
    #expect(pixel(on, x: c.x - tokens.dotSize / 2 + 0.75, y: c.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(on, x: c.x - tokens.dotSize / 2 - 0.75, y: c.y).isClose(to: light[.surface].rgba8()))
    #expect(CGFloat(on.width) == (tokens.containerSize + 2 * Snapshot.inset) * Snapshot.scale)
    // The sizes are the tokens': a larger dot reaches where the default one does not.
    var custom = system
    custom.radioButton.dotSize = 14
    let big = try Snapshot.render(chrome(.selected), theme: theme(custom))
    #expect(pixel(big, x: c.x - 6, y: c.y).isClose(to: light[.primary].rgba8()))
    #expect(!pixel(on, x: c.x - 6, y: c.y).isClose(to: light[.primary].rgba8()))
  }

  /// RAD-7 — the state shows on the round container, with precedence pressed > focused.
  @Test("RAD-7 the state shows on the round container")
  func stateContainer() throws {
    let point = containerPoint(system)
    let pressed = try Snapshot.render(chrome(.unselected, isPressed: true))
    #expect(pixel(pressed, x: point.x, y: point.y).isClose(to: light[.outline].opacity(system.state.pressedStateLayerOpacity).rgba8(over: light[.surface])))
    var custom = system
    custom.radioButton.conditions.selected.pressed.containerColor = .role(.error)
    custom.radioButton.conditions.selected.focused.containerColor = .role(.success)
    let both = try Snapshot.render(chrome(.selected, isPressed: true, isFocused: true), theme: theme(custom))
    #expect(pixel(both, x: point.x, y: point.y).isClose(to: light[.error].rgba8()))
    let focused = try Snapshot.render(chrome(.selected, isFocused: true), theme: theme(custom))
    #expect(pixel(focused, x: point.x, y: point.y).isClose(to: light[.success].rgba8()))
  }

  /// RAD-8 — the focus ring around the ring; not when disabled; not dimmed; outside the layout.
  @Test("RAD-8 the focus ring is drawn around the ring")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.ringSize / 2, measure: system.measure)
    let x = ringLeading(tokens) - metrics.outerCenterlineOutset
    let y = center(tokens).y
    let focused = try Snapshot.render(chrome(.selected, isFocused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    let rest = try Snapshot.render(chrome(.selected))
    #expect(!pixel(rest, x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(focused.width == rest.width && focused.height == rest.height)
    let focusedDisabled = try Snapshot.render(chrome(.selected, isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: try Snapshot.render(chrome(.selected).disabled(true)), channelTolerance: Snapshot.channelTolerance) == 0)
    var dim = system
    dim.radioButton.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(.selected, isFocused: true), theme: theme(dim)), x: x, y: y).isClose(to: light[.focusRing].rgba8()))
  }

  /// RAD-10 — rendered: the disabled tokens and the disabled opacity, the label included.
  @Test("RAD-10 disabled renders from the disabled tokens, the label included")
  func disabledRender() throws {
    var custom = system
    custom.radioButton.conditions.selected.disabled.dotColor = .role(.error)
    custom.radioButton.conditions.selected.disabled.labelColor = .role(.error)
    custom.radioButton.disabled.opacity = 0.5
    let bitmap = try Snapshot.render(chrome(.selected, label: "█████").disabled(true), theme: theme(custom))
    let half = light[.error].opacity(0.5).rgba8(over: light[.surface])
    #expect(pixel(bitmap, x: center(tokens).x, y: center(tokens).y).isClose(to: half))
    #expect(pixel(bitmap, x: Snapshot.inset + tokens.containerSize + tokens.labelGap + 4, y: center(tokens).y).isClose(to: half, tolerance: 6))
  }

  /// RAD-13 — a round container is unchanged by the corner smoothing; a container given a corner below full shows it;
  /// focus follows `sys.behavior.focus-style`.
  @Test("RAD-13 corner smoothing and focus style reach the radio button")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, shape: CGFloat? = nil, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      if let shape { custom.radioButton.pressed.containerShape = shape }
      custom.radioButton.conditions.unselected.pressed.ringColor = .none
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.unselected, isPressed: true, isFocused: focused), theme: theme(custom))
    }
    // The OS builds the continuous full-radius path differently; its edge pixels differ in antialiasing only.
    #expect(try render(0).mismatch(against: try render(0.6), channelTolerance: 48) == 0)
    let corner = TanreiSystem.tanrei.shape.small
    #expect(try render(0, shape: corner).mismatch(against: try render(0.6, shape: corner), channelTolerance: 0) > 0)
    #expect(try render(0.3, shape: corner).mismatch(against: try render(1, shape: corner), channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// RAD-15 — the dot grows from the ring's center over the selection motion and shrinks back; the state motion is the
  /// state's; neither under Reduce Motion.
  @Test("RAD-15 RAD-7 the selection and state motions come from the tokens; none under Reduce Motion")
  func motions() throws {
    var custom = tokens
    custom.motionSelectionDuration = 600
    custom.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(custom.motion(reduceMotion: false).selection == Animation.timingCurve(0, 0, 1, 1, duration: 0.6))
    let easing = custom.motionStateEasing
    #expect(custom.motion(reduceMotion: false).state == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: custom.motionStateDuration / 1000))
    #expect(custom.motion(reduceMotion: true).selection == nil && custom.motion(reduceMotion: true).state == nil)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
    // The dot is scaled from its center: at scale 0 nothing, at 1 the dot.
    #expect(TanreiRadioButtonAppearance(tokens: tokens, condition: .unselected, state: .enabled).dotScale == 0)
    #expect(TanreiRadioButtonAppearance(tokens: tokens, condition: .selected, state: .enabled).dotScale == TanreiRadioButtonAppearance.drawn)
    let reduced = try Snapshot.renderExact(chrome(.selected).environment(\._accessibilityReduceMotion, true))
    #expect(reduced.mismatch(against: try Snapshot.renderExact(chrome(.selected)), channelTolerance: 0) == 0)
  }

  /// RAD-17 — the label starts `labelGap` after the container; right to left mirrors the order; a wrapped label keeps
  /// the ring beside its first line.
  @Test("RAD-17 the label at the container's inline end; right-to-left mirrors it; a wrapped label")
  func labelLayout() throws {
    var custom = system
    custom.radioButton.conditions.selected.enabled.labelColor = .role(.error)
    let ltr = try Snapshot.render(chrome(.selected, label: "██"), theme: theme(custom))
    let start = Snapshot.inset + tokens.containerSize + tokens.labelGap
    let y = center(tokens).y
    #expect(!pixel(ltr, x: start - 1, y: y).isClose(to: light[.error].rgba8()))
    #expect(pixel(ltr, x: start + 3, y: y).isClose(to: light[.error].rgba8(), tolerance: 6))
    let rtl = try Snapshot.render(chrome(.selected, label: "██").environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let width = CGFloat(rtl.width) / Snapshot.scale
    #expect(pixel(rtl, x: width - Snapshot.inset - tokens.containerSize / 2, y: y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(rtl, x: width - start - 3, y: y).isClose(to: light[.error].rgba8(), tolerance: 6))
    let wrapped = try Snapshot.render(chrome(.selected, label: "A label long enough to wrap onto more than one line").frame(width: 160))
    #expect(CGFloat(wrapped.height) / Snapshot.scale > tokens.containerSize + 2 * Snapshot.inset + tokens.labelTypescale.lineHeight)
    #expect(pixel(wrapped, x: (CGFloat(wrapped.width) / Snapshot.scale - 160) / 2 + tokens.containerSize / 2, y: y).isClose(to: light[.primary].rgba8()))
  }

  /// "The ring does not grow with text": Dynamic Type changes the label, never the control.
  @Test("the ring does not grow with Dynamic Type")
  func noDynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(TanreiRadioButton("", value: Frequency.weekly, selection: .constant(.weekly)).environment(\.dynamicTypeSize, size))
    }
    let (regular, _) = try Reports.collecting { try render(.large) }
    let (huge, _) = try Reports.collecting { try render(.accessibility5) }
    #expect(huge.mismatch(against: regular, channelTolerance: 0) == 0)
  }
}

// MARK: - Press (RAD-11, RAD-12)

@MainActor
@Suite("TanreiRadioButton press", .serialized)
struct TanreiRadioButtonPressTests {
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.radioButton.conditions.selected.pressed.containerColor = .role(.error)
    system.radioButton.conditions.selected.pressed.ringColor = .role(.warning)
    system.radioButton.conditions.selected.focused.containerColor = .role(.success)
    system.radioButton.pressed.opacity = 0.5
    return system
  }

  /// RAD-12 — which tokens a press reads under each choice.
  @Test("RAD-12 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).radioButton
    let selected = tokens.conditions.selected
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiRadioButtonAppearance(tokens: tokens, condition: .selected, state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(appearance.container == selected.pressed.containerColor && appearance.ripple == nil && appearance.ring == selected.pressed.ringColor)
      case .ripple:
        #expect(appearance.container == selected[state: beneath].containerColor && appearance.ripple == selected.pressed.containerColor)
        #expect(appearance.ring == selected.pressed.ringColor && appearance.opacity == tokens.pressed.opacity)
      case .dim:
        #expect(appearance.container == selected[state: beneath].containerColor && appearance.ripple == nil && appearance.opacity == tokens.pressed.opacity)
      case .none:
        #expect(appearance == TanreiRadioButtonAppearance(tokens: tokens, condition: .selected, state: beneath))
      }
    }
  }

  /// RAD-12 — rendered under a system that sets each value.
  @Test("RAD-12 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system)
    let actual = pixel(try Snapshot.render(chrome(.selected, isPressed: true), theme: theme(system)), x: point.x, y: point.y)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: colors[.error].opacity(0.5).rgba8(over: colors[.surface])))
    case .dim, .none: #expect(actual.isClose(to: colors[.surface].rgba8()))
    }
    if feedback == .dim || feedback == .none {
      let focused = try Snapshot.render(chrome(.selected, isPressed: true, isFocused: true), theme: theme(system))
      let expected = feedback == .dim ? colors[.success].opacity(0.5).rgba8(over: colors[.surface]) : colors[.success].rgba8()
      #expect(pixel(focused, x: point.x, y: point.y).isClose(to: expected))
    }
  }

  /// RAD-12 — the shipped systems: m3-like ripples, cupertino dims, the default overlays; the ripple grows over the
  /// radio button's own feedback duration.
  @Test("RAD-12 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiRadioButtonAppearance {
      TanreiRadioButtonAppearance(tokens: system.radioButton, condition: .selected, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.radioButton.conditions.selected.pressed.containerColor)
    #expect(pressed(.cupertino).ripple == nil && pressed(.cupertino).opacity < 1)
    #expect(pressed(.tanrei).ripple == nil)
    var tokens = TanreiSystem.m3Like.radioButton
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  #if os(macOS)
  /// RAD-11 end to end: pressed at once on mouse-down, still pressed after a quick release, at rest once press-hold has
  /// passed — and selected exactly once (RAD-1).
  @Test("RAD-11 RAD-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.radioButton.motionStateDuration = 0
    system.radioButton.motionSelectionDuration = 0
    system.radioButton.conditions.unselected.pressed.containerColor = .role(.error)
    system.radioButton.conditions.selected.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let answer = Answer(nil)
    let hosted = HostedView(
      TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding).fixedSize().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let point = containerPoint(system)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.surface].rgba8()))
    hosted.mouse(.leftMouseDown, at: center(system.radioButton))
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: center(system.radioButton))
    hosted.settle()
    #expect(answer.changes == [.weekly])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // The hold ends once press-hold has passed (checked with slack: the machine may be loaded).
    #expect(await hosted.wait(atMost: 6) { hosted.color(at: point)?.isClose(to: colors[.surface].rgba8()) == true })
  }

  /// RAD-1 under `ripple`: watching the point of contact does not take the click away.
  @Test("RAD-1 RAD-12 a click still selects exactly once under ripple")
  func clickUnderRipple() {
    let answer = Answer(nil)
    let hosted = HostedView(TanreiRadioButton("Weekly", value: Frequency.weekly, selection: answer.binding).fixedSize().padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: Snapshot.inset + TanreiSystem.m3Like.radioButton.containerSize / 2, y: hosted.size.height / 2))
    #expect(answer.changes == [.weekly])
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiRadioButton under the shipped presets")
struct TanreiRadioButtonPresetTests {
  /// The presets' values, read from the instances: m3-like ring 20 at thick, dot 10, container 40, unselected state
  /// layer on-surface; cupertino as the default sizes, no hover.
  @Test("RAD-7 RAD-14 the presets' own values reach the radio button")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.radioButton
    #expect(m3.ringSize == 20 && m3.dotSize == 10 && m3.containerSize == 40 && m3.ringWidth == TanreiSystem.m3Like.measure.borderThick)
    #expect(m3.conditions.unselected.enabled.stateLayerColor == .role(.onSurface))
    let cupertino = TanreiSystem.cupertino.radioButton
    #expect(cupertino.ringSize == 16 && cupertino.dotSize == 8)
    for condition in TanreiRadioButtonCondition.core {
      #expect(TanreiRadioButtonAppearance(tokens: cupertino, condition: condition, state: .hovered) == TanreiRadioButtonAppearance(tokens: cupertino, condition: condition, state: .enabled))
    }
    for shipped in ShippedSystem.allCases {
      let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiRadioButton("", value: Frequency.weekly, selection: .constant(.weekly)), theme: theme(shipped.system)) }
      #expect(CGFloat(bitmap.width) == (shipped.system.radioButton.containerSize + 2 * Snapshot.inset) * Snapshot.scale, "\(shipped.rawValue)")
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiRadioButton snapshots")
struct TanreiRadioButtonSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var selected = false
    var disabled = false
    var labelHidden = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/radio-button.spec.json (value "weekly", name "frequency", label "Weekly").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "unselected"),
    Fixture(id: "selected", selected: true),
    Fixture(id: "disabled-unselected", disabled: true),
    Fixture(id: "disabled-selected", selected: true, disabled: true),
    Fixture(id: "label-hidden", selected: true, labelHidden: true),
  ]

  /// The fixture as a product writes it: one option of the "frequency" group.
  static func view(_ fixture: Fixture) -> some View {
    let selection: String? = fixture.selected ? "weekly" : nil
    return TanreiRadioGroup("frequency") {
      if fixture.labelHidden {
        TanreiRadioButton("Weekly", value: "weekly", selection: .constant(selection)).labelsHidden()
      } else {
        TanreiRadioButton("Weekly", value: "weekly", selection: .constant(selection))
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
    let spec = try SpecFixture.load(spec: "radio-button")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect((theirs.bool("selected") ?? false) == ours.selected, "\(ours.id)")
      #expect((theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect((theirs.bool("labelHidden") ?? false) == ours.labelHidden, "\(ours.id)")
      #expect(theirs.string("label") == "Weekly" && theirs.string("value") == "weekly" && theirs.string("name") == "frequency", "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiRadioButtonTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiRadioButton preset snapshots")
struct TanreiRadioButtonPresetSnapshotTests {
  /// Selected: it shows the preset's ring, dot, container and label.
  nonisolated static let fixtureId = "selected"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiRadioButtonSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiRadioButtonSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiRadioButtonSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

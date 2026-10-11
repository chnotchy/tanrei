import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/switch.spec.json. Each behavior id (SWT-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. SWT-5, SWT-7, SWT-8 and SWT-9 are BTN-5, BTN-8, BTN-9 and BTN-10 for this
// component: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is
// proven to reach the switch.
//
// Geometry: without a label a render is the track plus `Snapshot.inset` on every side; the round container on the handle
// may reach into the inset. Icons: baselines render with the platform font (`Snapshot.theme`), under which a glyph of
// the icon font draws nothing, so the fixtures' glyphs "check" and "close" are drawn as the SF Symbols a product would
// pass (`checkmark`, `xmark`); the glyph path is the icon button's (TanreiIconButtonTests). A hosted switch is
// `.fixedSize()`: its label wraps, so its minimum height would otherwise become the test window's minimum size.

private let suiteName = "TanreiSwitchTests"

@MainActor
private final class Setting {
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

private typealias Plain = TanreiSwitchIcons<EmptyView, EmptyView>

/// The chrome alone, with no icon (or square icons that fill their box, in the icon color).
@MainActor
private func chrome(_ condition: TanreiSwitchCondition = .selected, label: String? = nil, icons: Bool = false, isPressed: Bool = false, isFocused: Bool = false) -> AnyView {
  if icons {
    return AnyView(
      TanreiSwitchChrome(
        condition: condition, icons: TanreiSwitchIcons(selected: Rectangle(), unselected: Rectangle()), label: label.map { Text($0) }, isPressed: isPressed,
        isFocused: isFocused))
  }
  return AnyView(
    TanreiSwitchChrome(condition: condition, icons: Plain(selected: EmptyView(), unselected: EmptyView()), label: label.map { Text($0) }, isPressed: isPressed, isFocused: isFocused))
}

/// The center of the handle in a render of the chrome without a label.
@MainActor
private func handleCenter(_ tokens: TanreiSwitchTokens, on: Bool) -> CGPoint {
  let x = on ? Snapshot.inset + tokens.trackWidth - tokens.trackHeight / 2 : Snapshot.inset + tokens.trackHeight / 2
  return CGPoint(x: x, y: Snapshot.inset + tokens.trackHeight / 2)
}

/// A point of the track away from the handle: the middle of the track, when the handle is at either end.
@MainActor
private func trackPoint(_ tokens: TanreiSwitchTokens) -> CGPoint {
  CGPoint(x: Snapshot.inset + tokens.trackWidth / 2, y: Snapshot.inset + tokens.trackHeight / 2)
}

/// A point of the round container outside the track: above the handle, half-way between the track's edge and the
/// container's.
@MainActor
private func containerPoint(_ tokens: TanreiSwitchTokens, on: Bool) -> CGPoint {
  let handle = handleCenter(tokens, on: on)
  let reach = (tokens.containerSize - tokens.trackHeight) / 2
  return CGPoint(x: handle.x, y: Snapshot.inset - reach / 2)
}

// MARK: - Activation (SWT-1, SWT-2, SWT-14, SWT-16)

@MainActor
@Suite("TanreiSwitch activation", .serialized)
struct TanreiSwitchActivationTests {
  /// SWT-1 — one activation switches selected and emits change once with the new value.
  @Test("SWT-1 activation flips isOn once per activation")
  func activation() {
    let setting = Setting(false)
    TanreiSwitch("Wi-Fi", isOn: setting.binding).activate(isEnabled: true)
    #expect(setting.isOn && setting.changes == [true])
    TanreiSwitch("Wi-Fi", isOn: setting.binding).activate(isEnabled: true)
    #expect(!setting.isOn && setting.changes == [true, false])
  }

  /// SWT-2 — disabled: no change.
  @Test("SWT-2 disabled: no change")
  func disabled() {
    let setting = Setting(false)
    TanreiSwitch("Wi-Fi", isOn: setting.binding).activate(isEnabled: false)
    #expect(!setting.isOn && setting.changes.isEmpty)
  }

  /// SWT-1 / SWT-7 — Space activates; Enter is not a selection control's key on iOS or macOS.
  @Test("SWT-1 SWT-7 Space activates, Enter does not")
  func keys() {
    #expect(TanreiActivationKeys.selection == [.space])
  }

  /// SWT-14 — a switch (the toggle trait) that is on (selected) or off; never a checked checkbox (iOS has no checkbox
  /// role to confuse it with). The icons are hidden (`TanreiIconSlot`).
  @Test("SWT-14 the toggle trait, selected while on")
  func traits() {
    #expect(TanreiSwitch<EmptyView, EmptyView>.accessibilityTraits(isOn: true) == [.isToggle, .isSelected])
    #expect(TanreiSwitch<EmptyView, EmptyView>.accessibilityTraits(isOn: false) == .isToggle)
    #expect(TanreiSwitch("Wi-Fi", isOn: .constant(true)).condition == .selected)
    #expect(TanreiSwitch("Wi-Fi", isOn: .constant(false)).condition == .unselected)
  }

  /// SWT-16 — an empty label is reported and the switch still renders; `.labelsHidden()` draws none.
  @Test("SWT-16 an empty label is reported; labelsHidden draws no label")
  func labels() throws {
    let setting = Setting(true)
    let (_, reports) = Reports.collecting {
      _ = TanreiSwitch("", isOn: setting.binding)
      _ = TanreiSwitch(LocalizedStringKey(""), isOn: setting.binding)
      _ = TanreiSwitch("", isOn: setting.binding, selectedIcon: "check")
    }
    #expect(reports.messages.count == 3 && reports.mention("switch") && reports.mention("SWT-16"))
    let tokens = TanreiSystem.tanrei.switch
    let (bare, _) = try Reports.collecting { try Snapshot.renderExact(TanreiSwitch("", isOn: .constant(true))) }
    #expect(CGFloat(bare.width) == (tokens.trackWidth + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(CGFloat(bare.height) == (tokens.trackHeight + 2 * Snapshot.inset) * Snapshot.scale)
    guard #available(macOS 15, iOS 18, *) else { return }
    let hidden = try Snapshot.renderExact(TanreiSwitch("Wi-Fi", isOn: .constant(true)).labelsHidden())
    #expect(hidden.mismatch(against: bare, channelTolerance: 0) == 0)
  }

  #if os(macOS)
  /// SWT-1 by pointer on the track and on the label; SWT-2: disabled, neither does anything.
  @Test("SWT-1 SWT-2 a click on the track or the label switches it once; never when disabled", arguments: [true, false])
  func pointerClick(isEnabled: Bool) {
    let setting = Setting(false)
    let hosted = HostedView(TanreiSwitch("Wi-Fi", isOn: setting.binding).disabled(!isEnabled).fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let tokens = Snapshot.theme.system.switch
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.trackWidth - 3, y: y))  // the far end of the track (SWT-5)
    #expect(setting.changes == (isEnabled ? [true] : []))
    hosted.click(at: CGPoint(x: Snapshot.inset + tokens.trackWidth + tokens.labelGap + 10, y: y))  // the label
    #expect(setting.changes == (isEnabled ? [true, false] : []))
  }

  /// SWT-5 end to end: a click above the track inside the minimum target switches it; beyond it nothing happens.
  @Test("SWT-5 a click in the extended hit area switches it")
  func extendedHitArea() {
    let setting = Setting(false)
    let hosted = HostedView(TanreiSwitch("Wi-Fi", isOn: setting.binding).fixedSize().padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let system = Snapshot.theme.system
    let height = hosted.size.height - 2 * Snapshot.inset
    let outset = (TanreiHitTarget.minimum(in: system.measure) - height) / 2
    #expect(outset > 0)
    hosted.click(at: CGPoint(x: Snapshot.inset + 5, y: Snapshot.inset - outset - 1))
    #expect(setting.changes.isEmpty)
    hosted.click(at: CGPoint(x: Snapshot.inset + 5, y: Snapshot.inset - outset / 2))
    #expect(setting.changes == [true])
  }
  #endif
}

// MARK: - Token bindings (SWT-3, SWT-6, SWT-10, SWT-12)

@MainActor
@Suite("TanreiSwitch token bindings")
struct TanreiSwitchTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSwitchTokens { system.switch }

  private func appearance(_ condition: TanreiSwitchCondition, _ state: TanreiInteraction, icon: Bool = false, tokens: TanreiSwitchTokens? = nil) -> TanreiSwitchAppearance {
    TanreiSwitchAppearance(tokens: tokens ?? self.tokens, condition: condition, state: state, showsIcon: icon)
  }

  /// SWT-10 — at rest: off is a surface-container-highest track with an outline edge and an outline handle,
  /// on a primary track and outline with an on-primary handle; the state-layer color is the outline color.
  @Test("SWT-10 at rest each condition binds the expected color roles")
  func roles() {
    let off = appearance(.unselected, .enabled)
    let on = appearance(.selected, .enabled)
    #expect(off.container == TanreiPaint.none && off.track == .role(.surfaceContainerHighest) && off.outline == .role(.outline))
    #expect(off.handle == .role(.outline) && off.icon == .role(.surfaceContainerHighest) && off.label == .role(.onSurface))
    #expect(on.track == .role(.primary) && on.outline == .role(.primary) && on.handle == .role(.onPrimary) && on.icon == .role(.primary))
    #expect(!off.handleAtEnd && on.handleAtEnd && !off.iconSelected && on.iconSelected)
    for condition in TanreiSwitchCondition.core {
      #expect(tokens.conditions[condition].enabled.stateLayerColor == appearance(condition, .enabled).outline)
    }
    for (themeAppearance, scheme) in [(TanreiAppearance.light, system.colors.light), (.dark, system.colors.dark)] {
      let colors = TanreiTheme(appearance: themeAppearance, contrast: .standard).colors(systemScheme: .light, systemContrast: .standard)
      #expect(on.track.resolve(in: colors) == scheme.value(.primary) && off.handle.resolve(in: colors) == scheme.value(.outline))
    }
  }

  /// SWT-10 / SWT-12 — the geometry: track 36 × 20 (full corners), outline hairline, handle 14 (16 with an icon), glyph
  /// box icon.small, container 28, label body at space100.
  @Test("SWT-10 SWT-12 SWT-15 the geometry binds its tokens")
  func geometry() {
    let rest = appearance(.selected, .enabled)
    #expect([rest.trackWidth, rest.trackHeight, rest.containerSize, rest.handleSize] == [36, 20, 28, 14])
    #expect(rest.trackCornerRadius == system.shape.full && rest.outlineWidth == system.measure.borderHairline)
    #expect(rest.iconSize == system.measure.iconSmall && rest.labelGap == system.space.space100 && rest.labelTypescale == system.typescale.body)
    // SWT-12: with an icon, the larger of the state's size and size-with-icon.
    #expect(appearance(.selected, .enabled, icon: true).handleSize == max(tokens.conditions.selected.enabled.handleSize, tokens.handleSizeWithIcon))
    var custom = tokens
    custom.conditions.selected.enabled.handleSize = 30
    custom.handleSizeWithIcon = 18
    #expect(appearance(.selected, .enabled, icon: true, tokens: custom).handleSize == 30)
    #expect(appearance(.selected, .enabled, icon: false, tokens: custom).handleSize == 30)
    custom.conditions.selected.enabled.handleSize = 10
    #expect(appearance(.selected, .enabled, icon: true, tokens: custom).handleSize == 18)
    #expect(appearance(.selected, .enabled, icon: false, tokens: custom).handleSize == 10)
  }

  /// SWT-12 — which positions show an icon: an `EmptyView` or an empty glyph name shows none.
  @Test("SWT-12 an icon per position; empty shows none")
  func icons() {
    let none = Plain(selected: EmptyView(), unselected: EmptyView())
    #expect(!none.shows(.selected) && !none.shows(.unselected))
    let onOnly = TanreiSwitchIcons(glyphs: "check", "")
    #expect(onOnly.shows(.selected) && !onOnly.shows(.unselected))
    let both = TanreiSwitchIcons(glyphs: "check", "close")
    #expect(both.shows(.selected) && both.shows(.unselected))
    let views = TanreiSwitchIcons(selected: Image(systemName: "checkmark"), unselected: EmptyView())
    #expect(views.shows(.selected) && !views.shows(.unselected))
    // An icon written from data that has none shows none.
    let fromData = TanreiSwitchIcons(
      selected: ForEach([String](), id: \.self) { Image(systemName: $0) }, unselected: ForEach(["xmark"], id: \.self) { Image(systemName: $0) })
    #expect(!fromData.shows(.selected) && fromData.shows(.unselected))
  }

  /// SWT-3 — hovered, focused and pressed mix the condition's state-layer color into the container; track, outline,
  /// handle (color, size, elevation), icon and label keep their resting values.
  @Test("SWT-3 each state binds that state's tokens", arguments: TanreiSwitchCondition.core)
  func stateBindings(condition: TanreiSwitchCondition) {
    let rest = appearance(condition, .enabled)
    let layer = tokens.conditions[condition].enabled.stateLayerColor
    for (state, amount) in [(TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity)] {
      let drawn = appearance(condition, state)
      #expect(drawn.container == .mix(base: rest.container, with: layer, amount: amount))
      #expect(drawn.track == rest.track && drawn.outline == rest.outline && drawn.handle == rest.handle && drawn.icon == rest.icon && drawn.label == rest.label)
      #expect(drawn.handleSize == rest.handleSize && drawn.handleElevation == rest.handleElevation && drawn.opacity == 1)
    }
  }

  /// SWT-3 (verify) — acme values the three states differently; m3-like grows the handle under a press.
  @Test("SWT-3 under acme the states differ; m3-like grows the handle under a press")
  func acmeAndM3() {
    for condition in TanreiSwitchCondition.core {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiSwitchAppearance(tokens: TanreiSystem.acme.switch, condition: condition, state: $0).container }
      #expect(Set(containers.map { "\($0)" }).count == 3)
      let m3 = TanreiSystem.m3Like.switch
      let pressed = TanreiSwitchAppearance(tokens: m3, condition: condition, state: .pressed)
      #expect(pressed.handleSize > TanreiSwitchAppearance(tokens: m3, condition: condition, state: .enabled).handleSize)
      #expect(pressed.handleSize == m3.conditions[condition].pressed.handleSize)
    }
  }

  /// SWT-6 — disabled: the container invisible; track and outline on-surface at the disabled container
  /// opacity; off handle and on icon at the disabled content opacity; on handle and off icon surface.
  @Test("SWT-6 disabled bindings")
  func disabled() {
    let fill = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContainerOpacity)
    let content = TanreiPaint.alpha(of: .role(.onSurface), amount: system.state.disabledContentOpacity)
    let off = appearance(.unselected, .disabled)
    let on = appearance(.selected, .disabled)
    #expect(off.container == TanreiPaint.none && on.container == TanreiPaint.none)
    #expect(off.track == fill && off.outline == fill && on.track == fill && on.outline == fill)
    #expect(off.handle == content && off.icon == .role(.surface) && on.handle == .role(.surface) && on.icon == content)
    #expect(off.label == content && on.label == content && on.opacity == tokens.disabled.opacity)
    #expect(on.handleElevation == tokens.conditions.selected.disabled.handleElevation)
  }

  /// SWT-3 SWT-6 — the values drive the result.
  @Test("SWT-3 SWT-6 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.selected.hovered.trackColor = .role(.error)
    custom.conditions.unselected.focused.handleSize = 18
    custom.conditions.selected.pressed.handleElevation = system.elevation.level2
    custom.conditions.unselected.disabled.iconColor = .role(.warning)
    custom.pressed.opacity = 0.6
    #expect(appearance(.selected, .hovered, tokens: custom).track == .role(.error))
    #expect(appearance(.unselected, .focused, tokens: custom).handleSize == 18)
    #expect(appearance(.selected, .pressed, tokens: custom).handleElevation == system.elevation.level2)
    #expect(appearance(.unselected, .disabled, tokens: custom).icon == .role(.warning))
    #expect(appearance(.selected, .pressed, tokens: custom).opacity == 0.6)
    #expect(appearance(.selected, .enabled, tokens: custom) == appearance(.selected, .enabled))
  }

  /// The condition axis is open to a design system: an unknown condition reads `unselected` and is reported.
  @Test("an unknown condition binds the default condition's tokens and is reported", arguments: TanreiInteraction.allCases)
  func unknownCondition(state: TanreiInteraction) {
    let unknown = TanreiSwitchCondition(rawValue: "sparkly")
    let (value, reports) = Reports.collecting { TanreiSwitchAppearance(tokens: tokens, condition: unknown, state: state) }
    let fallback = TanreiSwitchAppearance(tokens: tokens, condition: .unselected, state: state)
    #expect(value.track == fallback.track && value.handle == fallback.handle && value.handleSize == fallback.handleSize && value.container == fallback.container)
    #expect(reports.mention("switch condition \"sparkly\""))
  }
}

// MARK: - Rendered (SWT-3, SWT-4, SWT-6, SWT-9 … SWT-13, SWT-15)

@MainActor
@Suite("TanreiSwitch rendered")
struct TanreiSwitchRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSwitchTokens { system.switch }

  /// SWT-10 — the track fills its box with the outline inside its edge; the handle's center is half the track height
  /// from the start while off and from the end while on; the container on the handle is invisible at rest.
  @Test("SWT-10 the track, the outline and the handle's two positions")
  func geometry() throws {
    let off = try Snapshot.render(chrome(.unselected))
    let on = try Snapshot.render(chrome(.selected))
    let middle = trackPoint(tokens)
    #expect(pixel(off, x: middle.x, y: middle.y).isClose(to: light[.surfaceContainerHighest].rgba8()))
    #expect(pixel(on, x: middle.x, y: middle.y).isClose(to: light[.primary].rgba8()))
    #expect(pixel(off, x: middle.x, y: Snapshot.inset + tokens.outlineWidth / 2).isClose(to: light[.outline].rgba8()))
    let offHandle = handleCenter(tokens, on: false)
    let onHandle = handleCenter(tokens, on: true)
    #expect(pixel(off, x: offHandle.x, y: offHandle.y).isClose(to: light[.outline].rgba8()))
    #expect(pixel(off, x: onHandle.x, y: onHandle.y).isClose(to: light[.surfaceContainerHighest].rgba8()))
    #expect(pixel(on, x: onHandle.x, y: onHandle.y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(on, x: offHandle.x, y: offHandle.y).isClose(to: light[.primary].rgba8()))
    // The handle's size: its edge 1pt inside is handle, 1pt outside is track.
    let half = tokens.conditions.selected.enabled.handleSize / 2
    #expect(pixel(on, x: onHandle.x + half - 1, y: onHandle.y).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(on, x: onHandle.x + half + 1, y: onHandle.y).isClose(to: light[.primary].rgba8()))
    // The container at rest: nothing above the track.
    let above = containerPoint(tokens, on: true)
    #expect(pixel(on, x: above.x, y: above.y).isClose(to: light[.surface].rgba8()))
    // The layout box is the track: the container never grows the render.
    #expect(CGFloat(on.width) == (tokens.trackWidth + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(CGFloat(on.height) == (tokens.trackHeight + 2 * Snapshot.inset) * Snapshot.scale)
  }

  /// SWT-10 — the fill lies inside the outline, never under it: disabled, the translucent fill and outline do not stack.
  @Test("SWT-10 a translucent track fill never lies under the outline")
  func fillInsideOutline() throws {
    let disabled = try Snapshot.render(chrome(.selected).disabled(true))
    let faded = light[.onSurface].opacity(system.state.disabledContainerOpacity).rgba8(over: light[.surface])
    let middle = trackPoint(tokens)
    #expect(pixel(disabled, x: middle.x, y: Snapshot.inset + tokens.outlineWidth / 2).isClose(to: faded))
    #expect(pixel(disabled, x: middle.x, y: middle.y).isClose(to: faded))
  }

  /// SWT-3 — the state shows on the round container around the handle, outside the track too; pressed > focused.
  @Test("SWT-3 the state shows on the round container, which moves with the handle")
  func stateContainer() throws {
    let above = containerPoint(tokens, on: false)
    let hovered = try Snapshot.render(chrome(.unselected, isPressed: true))
    #expect(pixel(hovered, x: above.x, y: above.y).isClose(to: light[.outline].opacity(system.state.pressedStateLayerOpacity).rgba8(over: light[.surface])))
    let aboveOn = containerPoint(tokens, on: true)
    #expect(pixel(hovered, x: aboveOn.x, y: aboveOn.y).isClose(to: light[.surface].rgba8()))
    var custom = system
    custom.switch.conditions.selected.pressed.containerColor = .role(.error)
    custom.switch.conditions.selected.focused.containerColor = .role(.success)
    let both = try Snapshot.render(chrome(.selected, isPressed: true), theme: theme(custom))
    #expect(pixel(both, x: aboveOn.x, y: aboveOn.y).isClose(to: light[.error].rgba8()))
  }

  /// SWT-4 — the focus ring around the track; not when disabled; outside the layout; not dimmed.
  @Test("SWT-4 the focus ring is drawn around the track")
  func focusRing() throws {
    let metrics = TanreiFocusRingMetrics(containerCornerRadius: tokens.trackShape, measure: system.measure)
    let x = trackPoint(tokens).x
    let y = Snapshot.inset - metrics.outerCenterlineOutset
    let focused = try Snapshot.render(chrome(.unselected, isFocused: true))
    #expect(pixel(focused, x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    let rest = try Snapshot.render(chrome(.unselected))
    #expect(!pixel(rest, x: x, y: y).isClose(to: light[.focusRing].rgba8()))
    #expect(focused.width == rest.width && focused.height == rest.height)
    let focusedDisabled = try Snapshot.render(chrome(.unselected, isFocused: true).disabled(true))
    #expect(focusedDisabled.mismatch(against: try Snapshot.render(chrome(.unselected).disabled(true)), channelTolerance: Snapshot.channelTolerance) == 0)
    var dim = system
    dim.switch.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(.unselected, isFocused: true), theme: theme(dim)), x: x, y: y).isClose(to: light[.focusRing].rgba8()))
  }

  /// SWT-6 — rendered: the disabled tokens and the disabled opacity, the label included.
  @Test("SWT-6 disabled renders from the disabled tokens, the label included")
  func disabledRender() throws {
    var custom = system
    custom.switch.conditions.selected.disabled.trackColor = .role(.error)
    custom.switch.conditions.selected.disabled.labelColor = .role(.error)
    custom.switch.disabled.opacity = 0.5
    let bitmap = try Snapshot.render(chrome(.selected, label: "█████").disabled(true), theme: theme(custom))
    let half = light[.error].opacity(0.5).rgba8(over: light[.surface])
    let height = CGFloat(bitmap.height) / Snapshot.scale
    #expect(pixel(bitmap, x: Snapshot.inset + tokens.trackWidth / 2, y: height / 2).isClose(to: half))
    #expect(pixel(bitmap, x: Snapshot.inset + tokens.trackWidth + tokens.labelGap + 4, y: height / 2).isClose(to: half, tolerance: 6))
  }

  /// SWT-9 — a pill track is unchanged by the corner smoothing; a track given a corner below full shows it; focus
  /// follows `sys.behavior.focus-style`.
  @Test("SWT-9 corner smoothing and focus style reach the switch")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, shape: CGFloat? = nil, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      if let shape { custom.switch.trackShape = shape }
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(.selected, isFocused: focused), theme: theme(custom))
    }
    // A pill track is the same pill at every amount (the handle, a circle, differs only in antialiasing: the OS builds
    // its continuous path differently).
    #expect(try render(0).mismatch(against: try render(0.6), channelTolerance: 48) == 0)
    let pill = TanreiCornerShape(cornerRadius: tokens.trackShape, style: .continuous).path(in: CGRect(x: 0, y: 0, width: 36, height: 20))
    #expect(pill == Capsule(style: .circular).path(in: CGRect(x: 0, y: 0, width: 36, height: 20)))
    let corner = TanreiSystem.tanrei.shape.small
    #expect(try render(0, shape: corner).mismatch(against: try render(0.6, shape: corner), channelTolerance: 0) > 0)
    #expect(try render(0.3, shape: corner).mismatch(against: try render(1, shape: corner), channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// SWT-11 — right to left, the handle's positions mirror: off at the right end, on at the left; the label mirrors
  /// too (SWT-15).
  @Test("SWT-11 SWT-15 right to left mirrors the handle and the label")
  func rightToLeft() throws {
    let off = try Snapshot.render(chrome(.unselected).environment(\.layoutDirection, .rightToLeft))
    let on = try Snapshot.render(chrome(.selected).environment(\.layoutDirection, .rightToLeft))
    let atEnd = handleCenter(tokens, on: true)
    let atStart = handleCenter(tokens, on: false)
    #expect(pixel(off, x: atEnd.x, y: atEnd.y).isClose(to: light[.outline].rgba8()))
    #expect(pixel(off, x: atStart.x, y: atStart.y).isClose(to: light[.surfaceContainerHighest].rgba8()))
    #expect(pixel(on, x: atStart.x, y: atStart.y).isClose(to: light[.onPrimary].rgba8()))
    var custom = system
    custom.switch.conditions.selected.enabled.labelColor = .role(.error)
    let labelled = try Snapshot.render(chrome(.selected, label: "██").environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let width = CGFloat(labelled.width) / Snapshot.scale
    let height = CGFloat(labelled.height) / Snapshot.scale
    #expect(pixel(labelled, x: width - Snapshot.inset - tokens.trackWidth - tokens.labelGap - 3, y: height / 2).isClose(to: light[.error].rgba8(), tolerance: 6))
    #expect(pixel(labelled, x: width - Snapshot.inset - tokens.trackWidth / 2, y: height / 2).isClose(to: light[.primary].rgba8()))
  }

  /// SWT-12 — an icon is centered in the handle, in its box, in the icon color; the handle grows to size-with-icon; the
  /// slot is handed the icon size and the family and fill of the condition.
  @Test("SWT-12 the icon in the handle")
  func icon() throws {
    var custom = system
    custom.switch.handleSizeWithIcon = 18
    custom.switch.iconSize = 10
    custom.switch.conditions.selected.enabled.iconColor = .role(.error)
    let bitmap = try Snapshot.render(chrome(.selected, icons: true), theme: theme(custom))
    let c = handleCenter(tokens, on: true)
    #expect(pixel(bitmap, x: c.x, y: c.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(bitmap, x: c.x + 5 - 0.5, y: c.y).isClose(to: light[.error].rgba8()))
    #expect(pixel(bitmap, x: c.x + 5 + 1, y: c.y).isClose(to: light[.onPrimary].rgba8()))  // the handle, grown to 18
    #expect(pixel(bitmap, x: c.x + 9 - 0.75, y: c.y).isClose(to: light[.onPrimary].rgba8()))
    // The slot is handed the icon box and the selection of the condition.
    final class Probe: @unchecked Sendable {
      var contexts: [TanreiIconContext] = []
    }
    struct Reader: View {
      let probe: Probe
      @Environment(\.tanreiIconContext) private var context
      var body: some View {
        if let context { probe.contexts.append(context) }
        return Color.clear
      }
    }
    for condition in TanreiSwitchCondition.core {
      let probe = Probe()
      _ = try Snapshot.render(
        TanreiSwitchChrome(condition: condition, icons: TanreiSwitchIcons(selected: Reader(probe: probe), unselected: Reader(probe: probe)), label: nil, isPressed: false, isFocused: false))
      #expect(probe.contexts.last == TanreiIconContext(size: tokens.iconSize, selected: condition == .selected))
    }
    // Without the icon font (the baselines' policy) a glyph name draws nothing: the handle alone, at size-with-icon.
    let (glyph, _) = try Reports.collecting { try Snapshot.renderExact(TanreiSwitch("", isOn: .constant(true), selectedIcon: "check")) }
    let (blank, _) = try Reports.collecting { try Snapshot.renderExact(TanreiSwitch("", isOn: .constant(true)) { Color.clear } unselectedIcon: { EmptyView() }) }
    #expect(glyph.mismatch(against: blank, channelTolerance: 0) == 0)
  }

  /// SWT-13 — the handle's travel, size and colors move over the selection motion; states over the state motion; at
  /// once under Reduce Motion.
  @Test("SWT-13 SWT-3 the selection and state motions come from the tokens; none under Reduce Motion")
  func motions() throws {
    var custom = tokens
    custom.motionSelectionDuration = 500
    custom.motionSelectionEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(custom.motion(reduceMotion: false).selection == Animation.timingCurve(0, 0, 1, 1, duration: 0.5))
    let easing = custom.motionStateEasing
    #expect(custom.motion(reduceMotion: false).state == Animation.timingCurve(easing.x1, easing.y1, easing.x2, easing.y2, duration: custom.motionStateDuration / 1000))
    #expect(custom.motion(reduceMotion: true).selection == nil && custom.motion(reduceMotion: true).state == nil)
    #expect(tokens.rippleGrowth(reduceMotion: true) == nil)
    let reduced = try Snapshot.renderExact(chrome(.selected).environment(\._accessibilityReduceMotion, true))
    #expect(reduced.mismatch(against: try Snapshot.renderExact(chrome(.selected)), channelTolerance: 0) == 0)
  }

  /// SWT-15 — the label at the track's inline end, `labelGap` away, the track centered on its first line.
  @Test("SWT-15 the label at the track's inline end")
  func label() throws {
    var custom = system
    custom.switch.conditions.selected.enabled.labelColor = .role(.error)
    let bitmap = try Snapshot.render(chrome(.selected, label: "██"), theme: theme(custom))
    let height = CGFloat(bitmap.height) / Snapshot.scale
    let start = Snapshot.inset + tokens.trackWidth + tokens.labelGap
    #expect(!pixel(bitmap, x: start - 1, y: height / 2).isClose(to: light[.error].rgba8()))
    #expect(pixel(bitmap, x: start + 3, y: height / 2).isClose(to: light[.error].rgba8(), tolerance: 6))
    // The row is one line tall: the taller of the track and the label's line.
    let line = max(tokens.trackHeight, tokens.labelTypescale.lineHeight)
    #expect(CGFloat(bitmap.height) == (line + 2 * Snapshot.inset) * Snapshot.scale)
    // A wrapped label keeps the track beside its first line.
    let wrapped = try Snapshot.render(chrome(.selected, label: "A label long enough to wrap onto more than one line").frame(width: 160))
    #expect(CGFloat(wrapped.height) / Snapshot.scale > line + 2 * Snapshot.inset + tokens.labelTypescale.lineHeight)
    let left = (CGFloat(wrapped.width) / Snapshot.scale - 160) / 2
    #expect(pixel(wrapped, x: left + tokens.trackWidth / 2, y: Snapshot.inset + line / 2).isClose(to: light[.primary].rgba8()))
  }

  /// "The track does not grow with text."
  @Test("the track does not grow with Dynamic Type")
  func noDynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(TanreiSwitch("", isOn: .constant(true)).environment(\.dynamicTypeSize, size))
    }
    let (regular, _) = try Reports.collecting { try render(.large) }
    let (huge, _) = try Reports.collecting { try render(.accessibility5) }
    #expect(huge.mismatch(against: regular, channelTolerance: 0) == 0)
  }
}

// MARK: - Press (SWT-7, SWT-8)

@MainActor
@Suite("TanreiSwitch press", .serialized)
struct TanreiSwitchPressTests {
  private func distinct(_ feedback: TanreiPressedFeedback) -> TanreiSystem {
    var system = TanreiSystem.tanrei
    system.behavior.pressedFeedback = feedback
    system.switch.conditions.selected.pressed.containerColor = .role(.error)
    system.switch.conditions.selected.pressed.trackColor = .role(.warning)
    system.switch.conditions.selected.pressed.handleSize = 18
    system.switch.conditions.selected.focused.containerColor = .role(.success)
    system.switch.pressed.opacity = 0.5
    return system
  }

  /// SWT-8 — which tokens a press reads under each choice (the handle's size included).
  @Test("SWT-8 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func bindings(feedback: TanreiPressedFeedback) {
    let tokens = distinct(feedback).switch
    let selected = tokens.conditions.selected
    for beneath in [TanreiInteraction.enabled, .hovered, .focused] {
      let appearance = TanreiSwitchAppearance(tokens: tokens, condition: .selected, state: .pressed, feedback: feedback, beneath: beneath)
      switch feedback {
      case .overlay:
        #expect(appearance.container == selected.pressed.containerColor && appearance.ripple == nil && appearance.handleSize == 18)
      case .ripple:
        #expect(appearance.container == selected[state: beneath].containerColor && appearance.ripple == selected.pressed.containerColor)
        #expect(appearance.track == selected.pressed.trackColor && appearance.handleSize == 18)
      case .dim:
        #expect(appearance.container == selected[state: beneath].containerColor && appearance.ripple == nil && appearance.opacity == tokens.pressed.opacity)
        #expect(appearance.track == selected.pressed.trackColor)
      case .none:
        #expect(appearance == TanreiSwitchAppearance(tokens: tokens, condition: .selected, state: beneath))
      }
    }
  }

  /// SWT-8 — rendered under a system that sets each value.
  @Test("SWT-8 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    let system = distinct(feedback)
    let colors = system.colors.light
    let point = containerPoint(system.switch, on: true)
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

  /// SWT-8 — the shipped systems: m3-like ripples, cupertino dims, the default overlays; the ripple's own duration.
  @Test("SWT-8 m3-like ripples, cupertino dims, the default overlays")
  func shipped() {
    func pressed(_ system: TanreiSystem) -> TanreiSwitchAppearance {
      TanreiSwitchAppearance(tokens: system.switch, condition: .selected, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(pressed(.m3Like).ripple == TanreiSystem.m3Like.switch.conditions.selected.pressed.containerColor)
    #expect(pressed(.cupertino).ripple == nil && pressed(.cupertino).opacity < 1)
    #expect(pressed(.tanrei).ripple == nil)
    var tokens = TanreiSystem.m3Like.switch
    tokens.motionFeedbackDuration = 900
    tokens.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    #expect(tokens.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
  }

  #if os(macOS)
  /// SWT-7 end to end: pressed at once, held for press-hold after a quick click, then at rest — switched once (SWT-1).
  @Test("SWT-7 SWT-1 a quick click shows the pressed state at once and keeps it for press-hold")
  func quickClickIsHeld() async throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.switch.motionStateDuration = 0
    system.switch.motionSelectionDuration = 0
    system.switch.conditions.unselected.pressed.trackColor = .role(.error)
    system.switch.conditions.selected.pressed.trackColor = .role(.error)
    let colors = system.colors.light
    let setting = Setting(false)
    let hosted = HostedView(TanreiSwitch("Wi-Fi", isOn: setting.binding).fixedSize().padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    // The far end of the track: beyond the round container on the handle, which is drawn over the track.
    let point = CGPoint(x: Snapshot.inset + system.switch.trackWidth - 4, y: hosted.size.height / 2)
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.surfaceContainerHighest].rgba8()))
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(setting.changes == [true])
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    // The hold ends once press-hold has passed (checked with slack: the machine may be loaded).
    // At rest again (the binding here is not view state, so the drawn condition stays off).
    #expect(await hosted.wait(atMost: 6) { hosted.color(at: point)?.isClose(to: colors[.surfaceContainerHighest].rgba8()) == true })
  }

  /// SWT-1 under `ripple`: watching the point of contact does not take the click away.
  @Test("SWT-1 SWT-8 a click still switches exactly once under ripple")
  func clickUnderRipple() {
    let setting = Setting(false)
    let hosted = HostedView(TanreiSwitch("Wi-Fi", isOn: setting.binding).fixedSize().padding(Snapshot.inset).tanreiTheme(theme(.m3Like)))
    hosted.click(at: CGPoint(x: Snapshot.inset + 10, y: hosted.size.height / 2))
    #expect(setting.changes == [true])
  }
  #endif
}

// MARK: - Presets

@MainActor
@Suite("TanreiSwitch under the shipped presets")
struct TanreiSwitchPresetTests {
  /// The presets' values, read from the instances: m3-like 52 × 32 track, handle 16 off / 24 on / 28 pressed; cupertino
  /// 51 × 31 with a raised 27 handle and no growth for an icon.
  @Test("SWT-3 SWT-10 SWT-12 the presets' own values reach the switch")
  func presetValues() throws {
    let m3 = TanreiSystem.m3Like.switch
    #expect(m3.trackWidth == 52 && m3.trackHeight == 32 && m3.containerSize == 40)
    #expect(m3.conditions.unselected.enabled.handleSize == 16 && m3.conditions.selected.enabled.handleSize == 24 && m3.handleSizeWithIcon == 24)
    let cupertino = TanreiSystem.cupertino.switch
    #expect(cupertino.trackWidth == 51 && cupertino.trackHeight == 31 && cupertino.handleSizeWithIcon == cupertino.conditions.selected.enabled.handleSize)
    #expect(!cupertino.conditions.selected.enabled.handleElevation.isEmpty)
    for shipped in ShippedSystem.allCases {
      let (bitmap, _) = try Reports.collecting { try Snapshot.render(TanreiSwitch("", isOn: .constant(true)), theme: theme(shipped.system)) }
      #expect(CGFloat(bitmap.width) == (shipped.system.switch.trackWidth + 2 * Snapshot.inset) * Snapshot.scale, "\(shipped.rawValue)")
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiSwitch snapshots")
struct TanreiSwitchSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var selected = false
    var disabled = false
    var selectedIcon = ""
    var unselectedIcon = ""
    var labelHidden = false
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/switch.spec.json (label "Wi-Fi").
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "unselected"),
    Fixture(id: "selected", selected: true),
    Fixture(id: "disabled-unselected", disabled: true),
    Fixture(id: "disabled-selected", selected: true, disabled: true),
    Fixture(id: "selected-icon", selected: true, selectedIcon: "check"),
    Fixture(id: "unselected-icon", selectedIcon: "check", unselectedIcon: "close"),
    Fixture(id: "label-hidden", selected: true, labelHidden: true),
  ]

  /// The fixtures' glyph names as the SF Symbols a product would pass (see the file header).
  static let symbols = ["check": "checkmark", "close": "xmark"]

  /// An SF Symbol fills its font size, where the icon font's glyphs keep a margin inside their box (a check fills
  /// about 12 of 16): a product passes the small scale for a handle, as here.
  @ViewBuilder
  private static func icon(_ glyph: String) -> some View {
    if let symbol = symbols[glyph] { Image(systemName: symbol).imageScale(.small) }
  }

  /// The fixture as a product writes it.
  static func view(_ fixture: Fixture) -> some View {
    Group {
      if fixture.labelHidden {
        TanreiSwitch("Wi-Fi", isOn: .constant(fixture.selected)).labelsHidden()
      } else if fixture.selectedIcon.isEmpty && fixture.unselectedIcon.isEmpty {
        TanreiSwitch("Wi-Fi", isOn: .constant(fixture.selected))
      } else if fixture.unselectedIcon.isEmpty {
        TanreiSwitch("Wi-Fi", isOn: .constant(fixture.selected)) { icon(fixture.selectedIcon) } unselectedIcon: { EmptyView() }
      } else {
        TanreiSwitch("Wi-Fi", isOn: .constant(fixture.selected)) { icon(fixture.selectedIcon) } unselectedIcon: { icon(fixture.unselectedIcon) }
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
    let spec = try SpecFixture.load(spec: "switch")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect((theirs.bool("selected") ?? false) == ours.selected, "\(ours.id)")
      #expect((theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect((theirs.bool("labelHidden") ?? false) == ours.labelHidden, "\(ours.id)")
      #expect((theirs.string("selectedIcon") ?? "") == ours.selectedIcon && (theirs.string("unselectedIcon") ?? "") == ours.unselectedIcon, "\(ours.id)")
      #expect(theirs.string("label") == "Wi-Fi", "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSwitchTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSwitch preset snapshots")
struct TanreiSwitchPresetSnapshotTests {
  /// On with an icon: it shows the preset's track, handle (its size with an icon, its elevation), icon and label.
  nonisolated static let fixtureId = "selected-icon"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .m3ExpressiveLike, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSwitchSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiSwitchSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiSwitchSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}

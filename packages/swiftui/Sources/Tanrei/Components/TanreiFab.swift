import SwiftUI

// Spec: specs/fab.spec.json — tokens: TanreiFabTokens (comp.fab), read from the design system in the environment
// (`system.fab`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. Press, hold, ripple, focus ring, hit target, container layers (with the elevation of the state) and
// the icon slot are the shared primitives: FAB-1…10 are BTN-1…10 for this component.

// `variant` is a `TanreiFabVariant` (filled, the screen's main action at full strength and the default; tonal, quieter;
// surface, a neutral container over colored content) and `size` a `TanreiFabSize` (the side of the square; the hit
// area always meets the minimum target). Both are generated open keys. FAB-7: a value the current design
// system does not have draws the default value's tokens (`sizes[_:]` / `variants[_:]` are total and report in debug
// builds).

/// Performs the single most important action of a screen with one icon on a raised container that floats above the
/// content.
///
///     TanreiFloatingActionButton("Create", icon: "add", action: create)                          // a glyph of the icon font
///     TanreiFloatingActionButton("Create", variant: .tonal, action: create) { Image(systemName: "plus") }
///     TanreiFloatingActionButton("Directions", size: .large, action: route) { Image(systemName: "arrow.triangle.turn.up.right.diamond") }
///
/// `label` is the accessible name and is required: an icon alone is not a name (FAB-14 reports an empty one in debug
/// builds). The icon is decorative. `disabled` follows SwiftUI's `.disabled(_:)` environment — hiding a FAB whose
/// action is unavailable is usually better.
///
/// FAB-13: the button does not position itself. Place it where the screen wants it, typically
///
///     content.overlay(alignment: .bottomTrailing) { TanreiFloatingActionButton("Create", icon: "add", action: create).padding() }
///
/// It draws no scrim and moves no content.
public struct TanreiFloatingActionButton<Icon: View>: View {
  private let label: Text
  private let variant: TanreiFabVariant
  private let size: TanreiFabSize
  private let action: @MainActor () -> Void
  private let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (FAB-8).
  @State private var keyboardPresses = 0

  private init(
    label: Text, isLabelEmpty: Bool, variant: TanreiFabVariant, size: TanreiFabSize,
    action: @escaping @MainActor () -> Void, icon: Icon
  ) {
    // FAB-14: still drawn, but an icon is not a name — reported in debug builds only.
    if isLabelEmpty {
      TanreiDiagnostics.report("Tanrei: a floating action button has an empty label; it has no accessible name (FAB-14). Pass the name of the action.")
    }
    self.label = label
    self.variant = variant
    self.size = size
    self.action = action
    self.icon = icon
  }

  /// A floating action button drawing any icon view.
  public init<S: StringProtocol>(
    _ label: S,
    variant: TanreiFabVariant = .filled,
    size: TanreiFabSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(label), isLabelEmpty: label.isEmpty, variant: variant, size: size, action: action, icon: icon())
  }

  /// A floating action button with a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    variant: TanreiFabVariant = .filled,
    size: TanreiFabSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(labelKey), isLabelEmpty: labelKey == "", variant: variant, size: size, action: action, icon: icon())
  }

  public var body: some View {
    // FAB-5: the hidden sizing copy keeps layout at the visual size (FAB-13: the FAB lays out at its own size) while the
    // real button, centred over it, is laid out at the minimum target on both axes (see TanreiMinimumHitTarget).
    TanreiMinimumHitTarget {
      TanreiFabChrome(variant: variant, size: size, isPressed: false, isFocused: false) { icon }
    } control: {
      Button(action: { activate(isEnabled: isEnabled) }) { icon }
        .buttonStyle(TanreiFabStyle(variant: variant, size: size, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .focused($isFocused)
        // Tanrei draws its own ring (FAB-4); the system focus effect would double it.
        .focusEffectDisabled()
        // FAB-1: Enter and Space activate, exactly once per key press, and the press is shown like a pointer's
        // (FAB-8, FAB-9: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled)
        }
        // The label is the accessible name; the icon is hidden from assistive technology (`TanreiIconSlot`).
        .accessibilityLabel(label)
    }
  }

  /// The single route to `action`: one call emits exactly once, and never while disabled (FAB-1, FAB-2). SwiftUI
  /// already drops taps, focus and key presses for a disabled button; the guard keeps that true for every input path.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    action()
  }
}

extension TanreiFloatingActionButton where Icon == TanreiIconGlyph {
  /// A floating action button drawing a glyph of the design system's icon font by name.
  public init<S: StringProtocol>(
    _ label: S,
    icon: String,
    variant: TanreiFabVariant = .filled,
    size: TanreiFabSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(label, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// A floating action button with a localized label, drawing a glyph of the icon font.
  public init(
    _ labelKey: LocalizedStringKey,
    icon: String,
    variant: TanreiFabVariant = .filled,
    size: TanreiFabSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(labelKey, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }
}

// MARK: - Token bindings

extension TanreiFabTokens {
  /// How the FAB-9 ripple grows: over `comp.fab.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// FAB-12: a change of state — colors and elevation — over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a floating action button draws for one variant × size × state. Pure data read from a
/// `TanreiFabTokens`, so the bindings can be tested without rendering. FAB-3 / FAB-6: every state, disabled included, is
/// drawn from that state's tokens — the elevation too (FAB-12).
struct TanreiFabAppearance: Equatable {
  let container: TanreiPaint
  let icon: TanreiPaint
  let elevation: [TanreiShadowLayer]
  /// Opacity of the whole control.
  let opacity: Double
  /// FAB-11: the corners of the size. A FAB does not change shape per state (the vocabulary has no per-state shape).
  let cornerRadius: CGFloat
  /// The side of the square.
  let containerSize: CGFloat
  /// The icon box (FAB-11): the icon is drawn at this size, and its `opsz` follows it.
  let iconSize: CGFloat
  /// FAB-9 `ripple`: the pressed container paint, drawn as a layer that grows from the point of contact over
  /// `container` (then the container of the state beneath). `nil` in every other case.
  let ripple: TanreiPaint?

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback` — how a press is answered (FAB-9). It matters only while `state` is
  ///     `.pressed`; the pressed TOKENS still decide every color, elevation and opacity.
  ///   - beneath: the state the button would be in without the press (focused for a key press, hovered for a
  ///     pointer): what is drawn where the choice says the press draws nothing.
  init(
    tokens: TanreiFabTokens,
    variant: TanreiFabVariant,
    size: TanreiFabSize,
    state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // FAB-7: both lookups are total — an unknown value reads the default value's tokens.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { variantTokens[state: $0].containerColor }
    icon = own.iconColor
    elevation = own.containerElevation
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity

    let metrics = tokens.sizes[size]
    cornerRadius = metrics.containerShape
    containerSize = metrics.containerSize
    iconSize = metrics.iconSize
  }
}

// MARK: - Style

struct TanreiFabStyle: ButtonStyle {
  let variant: TanreiFabVariant
  let size: TanreiFabSize
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiFabChrome(variant: variant, size: size, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses) {
      configuration.label
    }
    // FAB-5: the hit area reaches the minimum target on both axes; the visual size does not change.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: a raised square container with the elevation of its state, and the focus indicator around the icon,
/// all drawn from the tokens of the one resolved state.
struct TanreiFabChrome<Icon: View>: View {
  let variant: TanreiFabVariant
  let size: TanreiFabSize
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (FAB-8).
  var keyboardPresses = 0
  @ViewBuilder let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // FAB-8: a press stays visible at least `duration.press-hold`, even when it ended sooner; FAB-9: the point of
    // contact is only needed by `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.fab
    // FAB-3: exactly one state — pressed > focused > hovered; FAB-6: disabled is a state too. SwiftUI focus is
    // keyboard focus: a click or tap never moves focus to a button, so the focused state and the focus indicator
    // (FAB-4) cannot appear for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiFabAppearance(tokens: tokens, variant: variant, size: size, state: state, feedback: feedback, beneath: beneath)
    // FAB-9, as BTN-9: the ripple grows over `motion.feedback-duration` with the state easing and fades with the state
    // change once the press — held at least `press-hold` — has ended; whole under Reduce Motion.
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    // FAB-11: the icon box of the size, centred, with the icon font of an unselected icon (family, fill, weight,
    // `opsz` clamped to the optical-size tokens) — or the platform font at the box size for a view that is not a
    // glyph. An icon is not text: Dynamic Type changes neither the icon nor the square (spec, accessibility notes).
    return TanreiIconSlot(size: appearance.iconSize) { icon }
      .tanreiIconContext(size: appearance.iconSize, selected: false)
      .foregroundStyle(colors[appearance.icon])
      .frame(width: appearance.containerSize, height: appearance.containerSize)
      // FAB-12: the elevation of the state, cast outside the container and never clipped; FAB-10: the corners ease
      // by `sys.shape.corner-smoothing` (both in `TanreiContainerLayers`). No outline part.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
      // FAB-12: colors and elevation change over the state motion; at once under Reduce Motion.
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      // FAB-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius)
      .onHover { isHovered = $0 }
  }
}

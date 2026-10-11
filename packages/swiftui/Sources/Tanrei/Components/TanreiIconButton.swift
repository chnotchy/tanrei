import SwiftUI

// Spec: specs/icon-button.spec.json — tokens: TanreiIconButtonTokens (comp.icon-button), read from the design system
// in the environment (`system.iconButton`). Every design value in this file comes from a token; there are no
// literals, and no state's look is computed here. Press, hold, ripple, focus ring, hit target, container layers and
// the icon slot are the shared primitives: ICB-1…10 are BTN-1…10 for this component.

// `variant` is a `TanreiIconButtonVariant` (standard, the quiet default for toolbars and rows; filled for the one most
// important icon action in a view) and `size` a `TanreiIconButtonSize` (the side of the square; the hit area always
// meets the minimum target). Both are generated open keys. ICB-7: a value the current design system does
// not have draws the default value's tokens (`sizes[_:]` / `variants[_:]` are total and report in debug builds).

/// Performs an action, or switches something on and off, with a single icon and no visible label.
///
///     TanreiIconButton("Favorite", action: like) { TanreiIconGlyph("favorite") }           // an action
///     TanreiIconButton("Favorite", icon: "favorite", variant: .filled, action: like)         // the same, by glyph name
///     TanreiIconButton("Favorite", isSelected: $isFavorite, icon: "favorite")                // a toggle
///     TanreiIconButton("Settings", action: open) { Image(systemName: "gearshape") }          // any icon view
///     TanreiIconButton("Favorite", icon: "favorite", action: like).disabled(true)
///
/// `label` is the accessible name and is required: an icon alone is not a name (ICB-14 reports an empty one in debug
/// builds). The icon is decorative. Passing `isSelected` makes it a toggle (ICB-11): activation calls `action`, then
/// flips the binding (click, then change, as a native checkbox), and assistive technology hears it as a toggle that is on (the selected trait) or off.
/// `disabled` follows SwiftUI's `.disabled(_:)` environment.
///
/// The icon slot is drawn with the icon font of the button's selection state at its size (ICB-13): a
/// `TanreiIconGlyph` (or the `icon:` name) is a glyph of that font; any other view gets the font's size. Tanrei does
/// not bundle the icon font — without it a glyph draws nothing, so pass your own icon view instead.
public struct TanreiIconButton<Icon: View>: View {
  private let label: Text
  private let variant: TanreiIconButtonVariant
  private let size: TanreiIconButtonSize
  /// `nil`: an action. Otherwise a toggle, on while the binding is true.
  private let isSelected: Binding<Bool>?
  private let action: @MainActor () -> Void
  private let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (ICB-8).
  @State private var keyboardPresses = 0
  /// Whether this icon button is an item of a button group (ICB-10); its place there is read below
  /// `TanreiButtonTarget`.
  @Environment(\.tanreiInJoinedRow) private var inJoinedRow

  private init(
    label: Text, isLabelEmpty: Bool, variant: TanreiIconButtonVariant, size: TanreiIconButtonSize,
    isSelected: Binding<Bool>?, action: @escaping @MainActor () -> Void, icon: Icon
  ) {
    // ICB-14: still drawn, but an icon is not a name — reported in debug builds only.
    if isLabelEmpty {
      TanreiDiagnostics.report("Tanrei: an icon button has an empty label; it has no accessible name (ICB-14). Pass the name of the action.")
    }
    self.label = label
    self.variant = variant
    self.size = size
    self.isSelected = isSelected
    self.action = action
    self.icon = icon
  }

  /// An icon button that performs an action.
  public init<S: StringProtocol>(
    _ label: S,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(label), isLabelEmpty: label.isEmpty, variant: variant, size: size, isSelected: nil, action: action, icon: icon())
  }

  /// An icon button that performs an action, with a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(labelKey), isLabelEmpty: labelKey == "", variant: variant, size: size, isSelected: nil, action: action, icon: icon())
  }

  /// A toggle: activation calls `action` (ICB-11's `click`), then flips `isSelected` (its `change`).
  public init<S: StringProtocol>(
    _ label: S,
    isSelected: Binding<Bool>,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void = {},
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(label), isLabelEmpty: label.isEmpty, variant: variant, size: size, isSelected: isSelected, action: action, icon: icon())
  }

  /// A toggle with a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    isSelected: Binding<Bool>,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void = {},
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(label: Text(labelKey), isLabelEmpty: labelKey == "", variant: variant, size: size, isSelected: isSelected, action: action, icon: icon())
  }

  public var body: some View {
    let look = self.look
    // ICB-5: the hidden sizing copy keeps layout at the visual size while the real button, centred over it, is laid
    // out at the minimum target on both axes (see TanreiMinimumHitTarget).
    return TanreiButtonTarget(inJoinedRow: inJoinedRow) {
      TanreiIconButtonChrome(variant: variant, size: size, look: look, isPressed: false, isFocused: false) { icon }
    } control: {
      Button(action: { activate(isEnabled: isEnabled) }) { icon }
        .buttonStyle(TanreiIconButtonStyle(variant: variant, size: size, look: look, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .focused($isFocused)
        // Tanrei draws its own ring (ICB-4); the system focus effect would double it.
        .focusEffectDisabled()
        // In a toolbar (TBR-10): one Tab stop for the row, the arrow keys move among its items; anywhere else nothing.
        .modifier(TanreiJoinedFocusStop(isFocused: isFocused, focus: { isFocused = true }))
        // ICB-1: Enter and Space activate, exactly once per key press, and the press is shown like a pointer's
        // (ICB-8, ICB-9: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled)
        }
        // The label is the accessible name; the icon is hidden from assistive technology (`TanreiIconSlot`).
        .accessibilityLabel(label)
        // ICB-11: a toggle is announced as one, and as on (the selected trait) or off. An action exposes neither.
        .accessibilityAddTraits(look.accessibilityTraits)
    }
    // BGR-10: the group that holds it knows it for a Tanrei icon button; BGR-2: a focused item of a group is drawn above
    // its neighbours, so its ring is not covered where they meet.
    ._trait(TanreiJoinedItemKey.self, true)
    .zIndex(inJoinedRow && isFocused ? 1 : 0)
  }

  /// ICB-12: which parts of the variant are drawn.
  var look: TanreiIconButtonLook {
    TanreiIconButtonLook(isToggle: isSelected != nil, isSelected: isSelected?.wrappedValue ?? false)
  }

  /// The single route to `isSelected` and `action`: one call emits once and flips a toggle once — click, then change,
  /// in that order (ICB-11, as a native checkbox and CHP-11) — and never while disabled (ICB-1, ICB-2). SwiftUI already
  /// drops taps, focus and key presses for a disabled button; the guard keeps that true for every input path.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    action()
    isSelected?.wrappedValue.toggle()
  }
}

extension TanreiIconButton where Icon == TanreiIconGlyph {
  /// An icon button that performs an action, drawing a glyph of the design system's icon font by name.
  public init<S: StringProtocol>(
    _ label: S,
    icon: String,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(label, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// An icon button that performs an action, with a localized label and a glyph of the icon font.
  public init(
    _ labelKey: LocalizedStringKey,
    icon: String,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(labelKey, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// A toggle drawing a glyph of the icon font: outlined when off, filled when on (the fill of each state, ICB-13).
  public init<S: StringProtocol>(
    _ label: S,
    isSelected: Binding<Bool>,
    icon: String,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void = {}
  ) {
    self.init(label, isSelected: isSelected, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// A toggle with a localized label, drawing a glyph of the icon font.
  public init(
    _ labelKey: LocalizedStringKey,
    isSelected: Binding<Bool>,
    icon: String,
    variant: TanreiIconButtonVariant = .standard,
    size: TanreiIconButtonSize = .medium,
    action: @escaping @MainActor () -> Void = {}
  ) {
    self.init(labelKey, isSelected: isSelected, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }
}

// MARK: - Token bindings

/// ICB-12 — which parts of a variant an icon button draws: an action draws the variant's own parts (`plain`); a toggle
/// draws the `unselected.` parts while off and the `selected.` parts while on.
enum TanreiIconButtonLook: Equatable, Sendable, CaseIterable {
  case plain
  case unselected
  case selected

  init(isToggle: Bool, isSelected: Bool) {
    self = isToggle ? (isSelected ? .selected : .unselected) : .plain
  }

  /// ICB-13: the icon is drawn in its selected state (family and fill) only when toggle and selected are both true.
  var drawsSelectedIcon: Bool { self == .selected }

  /// ICB-11: a toggle is a toggle to assistive technology and is selected while on; an action has neither trait.
  var accessibilityTraits: AccessibilityTraits {
    switch self {
    case .plain: return []
    case .unselected: return .isToggle
    case .selected: return [.isToggle, .isSelected]
    }
  }
}

/// The colors of one look in one state.
struct TanreiIconButtonParts: Equatable {
  let container: TanreiPaint
  let icon: TanreiPaint
  let outline: TanreiPaint
}

extension TanreiIconButtonVariantStateTokens {
  /// The parts of `look`: the variant's own, or those under its `unselected.` / `selected.` prefix. (The look's
  /// `state-layer.color` is not read: it is what the design system mixed into this state's container.)
  func parts(_ look: TanreiIconButtonLook) -> TanreiIconButtonParts {
    switch look {
    case .plain: return TanreiIconButtonParts(container: containerColor, icon: iconColor, outline: outlineColor)
    case .unselected: return TanreiIconButtonParts(container: unselectedContainerColor, icon: unselectedIconColor, outline: unselectedOutlineColor)
    case .selected: return TanreiIconButtonParts(container: selectedContainerColor, icon: selectedIconColor, outline: selectedOutlineColor)
    }
  }
}

extension TanreiIconButtonTokens {
  /// How the ICB-9 ripple grows: over `comp.icon-button.motion.feedback-duration`, with the state easing. `nil` under
  /// Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values an icon button draws for one variant × size × look × state. Pure data read from a
/// `TanreiIconButtonTokens`, so the bindings can be tested without rendering. ICB-3 / ICB-6: every state, disabled
/// included, is drawn from that state's tokens; ICB-12: from the parts of the look.
struct TanreiIconButtonAppearance: Equatable {
  let container: TanreiPaint
  let icon: TanreiPaint
  let outline: TanreiPaint
  /// Opacity of the whole control.
  let opacity: Double
  let cornerRadius: CGFloat
  /// The side of the square.
  let containerSize: CGFloat
  /// The icon box (ICB-13): the icon is drawn at this size, and its `opsz` follows it.
  let iconSize: CGFloat
  let outlineWidth: CGFloat
  /// ICB-13: the family and fill of the selected state.
  let iconSelected: Bool
  /// ICB-9 `ripple`: the pressed container paint of the look, drawn as a layer that grows from the point of contact
  /// over `container` (then the container of the state beneath). `nil` in every other case.
  let ripple: TanreiPaint?

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback` — how a press is answered (ICB-9). It matters only while `state`
  ///     is `.pressed`; the pressed TOKENS still decide every color and opacity.
  ///   - beneath: the state the button would be in without the press (focused for a key press, hovered for a
  ///     pointer): what is drawn where the choice says the press draws nothing.
  init(
    tokens: TanreiIconButtonTokens,
    variant: TanreiIconButtonVariant,
    size: TanreiIconButtonSize,
    look: TanreiIconButtonLook = .plain,
    state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // ICB-7: both lookups are total — an unknown value reads the default value's tokens.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state].parts(look)
    container = variantTokens[state: layers.container].parts(look).container
    ripple = layers.ripple.map { variantTokens[state: $0].parts(look).container }
    icon = own.icon
    outline = own.outline

    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    cornerRadius = shared?.containerShape ?? tokens.containerShape

    let metrics = tokens.sizes[size]
    containerSize = metrics.containerSize
    iconSize = metrics.iconSize
    outlineWidth = metrics.outlineWidth
    iconSelected = look.drawsSelectedIcon
  }
}

// MARK: - Style

struct TanreiIconButtonStyle: ButtonStyle {
  let variant: TanreiIconButtonVariant
  let size: TanreiIconButtonSize
  let look: TanreiIconButtonLook
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiIconButtonChrome(
      variant: variant, size: size, look: look, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses
    ) {
      configuration.label
    }
    // ICB-5: the hit area reaches the minimum target on both axes; the visual size does not change. In a button group,
    // sideways no further than the middle of the gap (BGR-4).
    .modifier(TanreiButtonHitTarget())
  }
}

/// The visual: a square container, its outline and the focus indicator around the icon, all drawn from the tokens of
/// the one resolved state.
struct TanreiIconButtonChrome<Icon: View>: View {
  let variant: TanreiIconButtonVariant
  let size: TanreiIconButtonSize
  var look: TanreiIconButtonLook = .plain
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (ICB-8).
  var keyboardPresses = 0
  @ViewBuilder let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false
  /// Where a button group placed this icon button (BGR-1 … BGR-3); `nil` anywhere else.
  @Environment(\.tanreiJoinedPlace) private var place

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // ICB-8: a press stays visible at least `duration.press-hold`, even when it ended sooner; ICB-9: the point of
    // contact is only needed by `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.iconButton
    // ICB-3: exactly one state — pressed > focused > hovered; ICB-6: disabled is a state too. SwiftUI focus is
    // keyboard focus: a click or tap never moves focus to a button, so the focused state and the focus indicator
    // (ICB-4) cannot appear for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiIconButtonAppearance(
      tokens: tokens, variant: variant, size: size, look: look, state: state, feedback: feedback, beneath: beneath)
    let motion = TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: reduceMotion)
    // ICB-9, as BTN-9: the ripple grows over `motion.feedback-duration` with the state easing and fades with the state
    // change once the press — held at least `press-hold` — has ended; whole under Reduce Motion.
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    // ICB-13: the icon box of the size, the icon font of the look's selection state (family, fill, weight, `opsz`
    // clamped to the optical-size tokens) — or the platform font at the box size for a view that is not a glyph.
    // An icon is not text: Dynamic Type changes neither the icon nor the square (spec, accessibility notes).
    let corners = place?.corners(own: appearance.cornerRadius)
    return TanreiIconSlot(size: appearance.iconSize) { icon.tanreiOutsideJoinedRow() }
      .tanreiIconContext(size: appearance.iconSize, selected: appearance.iconSelected)
      .foregroundStyle(colors[appearance.icon])
      .modifier(TanreiIconButtonFrame(side: appearance.containerSize, place: place))
      .modifier(TanreiJoinedSizeFrame())
      // ICB-10: the corners ease by `sys.shape.corner-smoothing` (in `TanreiContainerLayers`); BGR-2: in a connected group
      // the corners that face a neighbour are the group's.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity,
          sides: corners))
      .animation(motion, value: state)
      .animation(motion, value: look)
      // BGR-11: which corners are inner changes at once, never animated.
      .transaction(value: place) { $0.animation = nil }
      // ICB-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius, sides: corners)
      .onHover { isHovered = $0 }
  }
}

/// The icon button's square (ICB-5). In a connected button group it is at least the platform's target wide — the
/// container widens around its centred icon (BGR-3) — and as tall as the tallest item of the row (BGR-1).
struct TanreiIconButtonFrame: ViewModifier {
  let side: CGFloat
  let place: TanreiJoinedPlace?

  func body(content: Content) -> some View {
    if let place {
      let width = max(side, place.minimumWidth)
      content.frame(minWidth: width, maxWidth: width, minHeight: side, maxHeight: place.isConnected ? .infinity : side)
    } else {
      content.frame(width: side, height: side)
    }
  }
}

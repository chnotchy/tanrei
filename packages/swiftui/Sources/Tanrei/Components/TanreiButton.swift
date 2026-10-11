import SwiftUI

// Spec: specs/button.spec.json — tokens: TanreiButtonTokens (comp.button), read from the design
// system in the environment (`theme.system.button`). Every design value in this file comes from a
// token; there are no literals, and no state's look is computed here.

// `variant` is a `TanreiButtonVariant` (emphasis level: use one `.filled` button per view for the
// main action) and `size` a `TanreiButtonSize` (visual height; the hit area always meets the
// minimum target). Both are generated open keys: constants for the values every design
// system has, and any value a design system adds. BTN-7: a value the current design system does
// not have draws the default value's tokens (`sizes[_:]` / `variants[_:]` are total).

/// Lets people take an action or make a choice with one tap or click.
///
///     TanreiButton("Deploy", variant: .filled, size: .medium, action: deploy)
///     TanreiButton("Deploy", action: deploy) { Image(systemName: "arrow.up") }
///     TanreiButton("Deploy", action: deploy).disabled(true)
///     TanreiButton("Delete", variant: .danger, size: .size3x, action: delete)  // values a product's system adds
///
/// `disabled` follows SwiftUI's `.disabled(_:)` environment. The label text is the
/// accessible name; an icon is decorative. For icon-only actions use the icon button.
public struct TanreiButton<Icon: View>: View {
  private let title: Text
  /// The words of a title given as a string: in a button group, the label is never narrower than the longest (BGR-7).
  /// `nil` for a localized title, whose words cannot be read.
  private let words: [String]?
  private let variant: TanreiButtonVariant
  private let size: TanreiButtonSize
  private let action: @MainActor () -> Void
  private let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (BTN-8).
  @State private var keyboardPresses = 0
  /// The icon grows by the factor its label's type does (`TanreiDynamicType`).
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  /// Whether this button is an item of a button group (BTN-10); its place there is read below `TanreiButtonTarget`.
  @Environment(\.tanreiInJoinedRow) private var inJoinedRow

  /// A button with a leading icon.
  public init<S: StringProtocol>(
    _ title: S,
    variant: TanreiButtonVariant = .filled,
    size: TanreiButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.title = Text(title)
    self.words = TanreiWordFloorLayout.words(title)
    self.variant = variant
    self.size = size
    self.action = action
    self.icon = icon()
  }

  /// A button with a localized title and a leading icon.
  public init(
    _ titleKey: LocalizedStringKey,
    variant: TanreiButtonVariant = .filled,
    size: TanreiButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.title = Text(titleKey)
    self.words = nil
    self.variant = variant
    self.size = size
    self.action = action
    self.icon = icon()
  }

  public var body: some View {
    // BTN-5: the hidden sizing copy keeps layout at the visual size while the real button,
    // centred over it, is laid out at the minimum target (see TanreiMinimumHitTarget).
    TanreiButtonTarget(inJoinedRow: inJoinedRow) {
      TanreiButtonChrome(variant: variant, size: size, hasIcon: hasIcon, isPressed: false, isFocused: false) { label }
    } control: {
      Button(action: { activate(isEnabled: isEnabled) }) { label }
        .buttonStyle(TanreiButtonStyle(variant: variant, size: size, hasIcon: hasIcon, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .focused($isFocused)
        // Tanrei draws its own ring (BTN-4); the system focus effect would double it.
        .focusEffectDisabled()
        // In a toolbar (TBR-10): one Tab stop for the row, the arrow keys move among its items; anywhere else nothing.
        .modifier(TanreiJoinedFocusStop(isFocused: isFocused, focus: { isFocused = true }))
        // BTN-1: Enter and Space activate, exactly once per key press, and the press is shown like a
        // pointer's (BTN-8, BTN-9: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled)
        }
    }
    // BGR-10: the group that holds it knows it for a Tanrei button; BGR-2: a focused item of a group is drawn above its
    // neighbours, so its ring is not covered where they meet.
    ._trait(TanreiJoinedItemKey.self, true)
    .zIndex(inJoinedRow && isFocused ? 1 : 0)
  }

  private var hasIcon: Bool { Icon.self != EmptyView.self }

  private var label: some View {
    let metrics = system.button.sizes[size]
    let iconSize = metrics.iconSize * TanreiDynamicType.scale(forSize: metrics.labelTypescale.size, at: dynamicTypeSize)
    return HStack(spacing: metrics.containerGap) {
      if hasIcon {
        // Width in the row, no height: the icon never grows the container (`TanreiIconSlot`).
        TanreiIconSlot(size: iconSize) { icon.tanreiOutsideJoinedRow() }
      }
      TanreiButtonTitle(title: title, words: words, typescale: metrics.labelTypescale)
    }
  }

  /// The single route to `action`: one call emits exactly once, and never while disabled
  /// (BTN-1, BTN-2). SwiftUI already drops taps, focus and key presses for a disabled
  /// button; the guard keeps that true for every input path.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    action()
  }
}

extension TanreiButton where Icon == EmptyView {
  /// A text-only button.
  public init<S: StringProtocol>(
    _ title: S,
    variant: TanreiButtonVariant = .filled,
    size: TanreiButtonSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(title, variant: variant, size: size, action: action, icon: { EmptyView() })
  }

  /// A text-only button with a localized title.
  public init(
    _ titleKey: LocalizedStringKey,
    variant: TanreiButtonVariant = .filled,
    size: TanreiButtonSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(titleKey, variant: variant, size: size, action: action, icon: { EmptyView() })
  }
}

/// A Button's label text. The container grows with the text; the label never truncates. The line box — the exact token
/// line height — belongs to the text alone. BGR-7: in a button group, which may narrow the Button, it wraps between words
/// and never inside one.
struct TanreiButtonTitle: View {
  let title: Text
  let words: [String]?
  let typescale: TanreiTextStyle
  @Environment(\.tanreiJoinedPlace) private var place

  var body: some View {
    if place != nil, let words, !words.isEmpty {
      TanreiWordFloorLayout {
        text
        ForEach(Array(words.enumerated()), id: \.offset) { _, word in
          Text(word).tanreiTextStyle(typescale).fixedSize().hidden().accessibilityHidden(true)
        }
      }
    } else {
      text
    }
  }

  private var text: some View {
    title
      .multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(typescale)
  }
}

// MARK: - Token bindings

extension TanreiButtonTokens {
  /// How the BTN-9 ripple grows: over `comp.button.motion.feedback-duration`, with the state easing.
  /// `nil` under Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a button draws for one variant × size × state, with or without an icon.
/// Pure data read from a `TanreiButtonTokens`, so the bindings can be tested without rendering.
/// BTN-3 / BTN-6: every state, disabled included, is drawn from that state's tokens.
struct TanreiButtonAppearance: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  let outline: TanreiPaint
  let elevation: [TanreiShadowLayer]
  /// Opacity of the whole control.
  let opacity: Double
  let cornerRadius: CGFloat
  /// A minimum: the container grows with its label.
  let height: CGFloat
  let paddingStart: CGFloat
  let paddingEnd: CGFloat
  let paddingBlock: CGFloat
  let labelTypescale: TanreiTextStyle
  let iconSize: CGFloat
  /// Space between the icon and the label.
  let gap: CGFloat
  let outlineWidth: CGFloat
  /// BTN-9 `ripple`: the pressed container paint, drawn as a layer that grows from the point of contact
  /// over `container` (then the container of the state beneath). `nil` in every other case.
  let ripple: TanreiPaint?

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback` — how a press is answered (BTN-9). It matters only
  ///     while `state` is `.pressed`; the pressed TOKENS still decide every color and opacity.
  ///   - beneath: the state the button would be in without the press (focused for a key press,
  ///     hovered for a pointer): what is drawn where the choice says the press draws nothing.
  init(
    tokens: TanreiButtonTokens,
    variant: TanreiButtonVariant,
    size: TanreiButtonSize,
    state: TanreiInteraction,
    hasIcon: Bool = false,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    // BTN-9 `none`: no answer to the press at all — the button is drawn in the state beneath.
    // `ripple`: the pressed container paint grows over the container beneath; `dim`: the container stays
    // with the state beneath; `none`: the state beneath, all of it (`TanreiPressLayers`).
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // BTN-7: both lookups are total — an unknown value reads the default value's tokens.
    // The state lookups are generated (`[state:]`), one exhaustive switch per token group.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { variantTokens[state: $0].containerColor }
    label = own.labelColor
    outline = own.outlineColor
    elevation = own.containerElevation

    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    cornerRadius = shared?.containerShape ?? tokens.containerShape

    let metrics = tokens.sizes[size]
    height = metrics.containerHeight
    paddingStart = hasIcon ? metrics.containerPaddingInlineStartWithIcon : metrics.containerPaddingInlineStart
    paddingEnd = metrics.containerPaddingInlineEnd
    paddingBlock = metrics.containerPaddingBlock
    labelTypescale = metrics.labelTypescale
    iconSize = metrics.iconSize
    gap = metrics.containerGap
    outlineWidth = metrics.outlineWidth
  }
}

// MARK: - Style

struct TanreiButtonStyle: ButtonStyle {
  let variant: TanreiButtonVariant
  let size: TanreiButtonSize
  let hasIcon: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiButtonChrome(
      variant: variant,
      size: size,
      hasIcon: hasIcon,
      isPressed: configuration.isPressed,
      isFocused: isFocused,
      keyboardPresses: keyboardPresses
    ) {
      configuration.label
    }
    // BTN-5: the hit area reaches the minimum target; the visual size does not change. In a button group, sideways no
    // further than the middle of the gap (BGR-4).
    .modifier(TanreiButtonHitTarget())
  }
}

/// The hit area of a Tanrei Button: the minimum target (BTN-5), in a group the group's (BGR-4).
struct TanreiButtonHitTarget: ViewModifier {
  @Environment(\.tanreiJoinedPlace) private var place
  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    content.tanreiJoinedHitTarget(place, minimum: TanreiHitTarget.minimum(in: system.measure))
  }
}

/// The visual: container, outline and focus indicator around a label, all drawn from the
/// tokens of the one resolved state.
struct TanreiButtonChrome<Label: View>: View {
  let variant: TanreiButtonVariant
  let size: TanreiButtonSize
  var hasIcon = false
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (BTN-8).
  var keyboardPresses = 0
  @ViewBuilder let label: Label

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false
  /// Where a button group placed this button (BGR-1 … BGR-3); `nil` anywhere else.
  @Environment(\.tanreiJoinedPlace) private var place

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // BTN-8: a press stays visible at least `duration.press-hold`, even when it ended sooner; BTN-9: the point
    // of contact is only needed by `ripple` — no other choice pays for finding it.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.button
    // BTN-3: exactly one state — pressed > focused > hovered; BTN-6: disabled is a state too.
    // SwiftUI focus is keyboard focus: a click or tap never moves focus to a button, so the
    // focused state and the focus indicator (BTN-4) cannot appear for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiButtonAppearance(
      tokens: tokens, variant: variant, size: size, state: state, hasIcon: hasIcon, feedback: feedback, beneath: beneath)
    let motion = TanreiMotion.animation(durationMs: tokens.motionStateDuration, easing: tokens.motionStateEasing, reduceMotion: reduceMotion)
    // One rule on every platform (BTN-9): the ripple GROWS over `motion.feedback-duration` with the
    // state easing, and fades out with the state change (`motion.state-duration`) once the press — held
    // at least `press-hold` — has ended. Under Reduce Motion it appears whole. A render that never saw
    // the press begin — a snapshot of the pressed state — shows it grown.
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let corners = place?.corners(own: appearance.cornerRadius)

    return label
      // The font reaches everything in the label (an SF Symbol in the icon slot is sized like the
      // text); the line box is applied to the text itself, by whoever builds the label.
      .tanreiFont(appearance.labelTypescale)
      .foregroundStyle(colors[appearance.label])
      .padding(.leading, appearance.paddingStart)
      .padding(.trailing, appearance.paddingEnd)
      .padding(.vertical, appearance.paddingBlock)
      // BGR-3: a connected item is at least the target wide, its label centred.
      .modifier(TanreiJoinedMinimumWidth(place: place))
      // BGR-1: every connected item is as tall as the tallest (the height is a minimum). Outside a group:
      // `.frame(minHeight:)`, as ever.
      .frame(minHeight: appearance.height, maxHeight: place?.isConnected == true ? .infinity : nil)
      .modifier(TanreiJoinedSizeFrame())
      // BTN-10: the corners ease by `sys.shape.corner-smoothing` (in `TanreiContainerLayers`); BGR-2: in a connected group
      // the corners that face a neighbour are the group's.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity,
          sides: corners))
      .animation(motion, value: state)
      // BGR-11: which corners are inner changes at once, never animated.
      .transaction(value: place) { $0.animation = nil }
      // BTN-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius, sides: corners)
      .onHover { isHovered = $0 }
  }
}

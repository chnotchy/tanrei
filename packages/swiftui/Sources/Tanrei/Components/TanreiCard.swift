import SwiftUI

// Spec: specs/card.spec.json — tokens: TanreiCardTokens (comp.card), read from the design system in the environment
// (`system.card`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. An interactive card is pressed like Button: press, hold, ripple, focus ring, target and
// container layers are the shared primitives, and CRD-5, CRD-8, CRD-9 and CRD-10 are BTN-5, BTN-8, BTN-9 and BTN-10 for
// this component.

// `variant` is a `TanreiCardVariant` (elevated, filled, outlined — the default): how the card separates from its
// background. A generated open key: CRD-7, a value the current design system does not have draws the default
// value's tokens and is reported in debug builds.

/// A surface that holds content about one subject, and optionally is itself one action.
///
///     TanreiCard { ReportSummary() }                                                  // outlined, content inset
///     TanreiCard(variant: .elevated, label: Text("Quarterly report")) { ReportSummary() }   // a named group
///     TanreiCard(variant: .filled, inset: false) { Photo(); Caption().padding() }       // content to the edges
///     TanreiCard(label: Text("Quarterly report"), action: open) { ReportSummary() }     // one pressable action
///     TanreiCard(label: Text("Quarterly report"), action: open) { ReportSummary() }.disabled(true)
///
/// As with `Button`, the initializer that takes `action:` makes the card interactive (the spec's `interactive`): the
/// whole card is then ONE button, its content read as part of that button, so **its content must contain no other
/// interactive element** (no button, link, field or toggle): SwiftUI cannot see inside it to report one (CRD-15). A card
/// without `action:` has no role of its own and is not focusable; `disabled` does not apply to it (CRD-11).
///
/// The content is inset by `container.padding` unless `inset` is false, clipped to the container's corners, drawn in the
/// variant's content color as its foreground style, and plain text in it takes `sys.typescale.body` (CRD-12, CRD-13).
/// The card grows with its content: it has no height of its own.
public struct TanreiCard<Content: View>: View {
  private let variant: TanreiCardVariant
  private let inset: Bool
  private let label: Text?
  /// `nil`: a container. Otherwise an interactive card.
  private let action: (@MainActor () -> Void)?
  private let content: Content

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (CRD-8).
  @State private var keyboardPresses = 0

  /// A card that is not an action: a container, named as a group by `label` when one is given (CRD-14).
  public init(variant: TanreiCardVariant = .outlined, inset: Bool = true, label: Text? = nil, @ViewBuilder content: () -> Content) {
    self.variant = variant
    self.inset = inset
    self.label = label
    self.action = nil
    self.content = content()
  }

  /// An interactive card: the whole card is one button that calls `action` (the spec's `click`). `label` is its
  /// accessible name — normally the text of its heading; without it the content's text is the name, which is reported
  /// in debug builds (CRD-14).
  public init(
    variant: TanreiCardVariant = .outlined, inset: Bool = true, label: Text? = nil, action: @escaping @MainActor () -> Void,
    @ViewBuilder content: () -> Content
  ) {
    if label == nil {
      TanreiDiagnostics.report("Tanrei: an interactive card has no label; its whole content becomes its accessible name (CRD-14). Pass the text of its heading as `label`.")
    }
    self.variant = variant
    self.inset = inset
    self.label = label
    self.action = action
    self.content = content()
  }

  public var body: some View {
    if let action {
      Button(action: { activate(isEnabled: isEnabled, action: action) }) { content }
        .buttonStyle(TanreiCardStyle(variant: variant, inset: inset, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .focused($isFocused)
        // Tanrei draws its own ring (CRD-4); the system focus effect would double it.
        .focusEffectDisabled()
        // CRD-1 / CRD-8: Enter and Space activate, once per key press, and show the press from the center.
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled, action: action)
        }
        // CRD-14: one element with the button role; the content is read as part of it, named by `label` if given.
        .modifier(TanreiCardName(label: label))
    } else {
      // CRD-11: not an action — no role, not focusable, no state answer; `disabled` is ignored.
      TanreiCardChrome(variant: variant, inset: inset, isInteractive: false, isPressed: false, isFocused: false) { content }
        .modifier(TanreiCardGroup(label: label))
    }
  }

  /// Whether the card is one action (the spec's `interactive`).
  var isInteractive: Bool { action != nil }

  /// The single route to `action` (CRD-1, CRD-2): once per activation, never while disabled.
  func activate(isEnabled: Bool, action: @MainActor () -> Void) {
    guard isEnabled else { return }
    action()
  }
}

/// CRD-14: an interactive card's name is `label` when given; otherwise SwiftUI's button reads its content.
private struct TanreiCardName: ViewModifier {
  let label: Text?

  func body(content: Content) -> some View {
    if let label { content.accessibilityLabel(label) } else { content }
  }
}

/// CRD-14: a card that is not interactive leaves its content's semantics alone, and is a named group when labelled.
private struct TanreiCardGroup: ViewModifier {
  let label: Text?

  func body(content: Content) -> some View {
    if let label {
      content.accessibilityElement(children: .contain).accessibilityLabel(label)
    } else {
      content
    }
  }
}

// MARK: - Token bindings

extension TanreiCardTokens {
  /// How the CRD-9 ripple grows: over `comp.card.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// CRD-16: a change of state — colors and elevation — over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a card draws for one variant × state. Pure data read from a `TanreiCardTokens`, so the bindings can
/// be tested without rendering. CRD-3 / CRD-6: every state, disabled included, is drawn from that state's tokens;
/// CRD-11: a card that is not interactive is always drawn at rest.
struct TanreiCardAppearance: Equatable {
  let container: TanreiPaint
  let elevation: [TanreiShadowLayer]
  let outline: TanreiPaint
  let content: TanreiPaint
  /// CRD-9 `ripple`: the pressed container paint, grown from the point of contact over `container`.
  let ripple: TanreiPaint?
  /// Opacity of the whole card.
  let opacity: Double
  let cornerRadius: CGFloat
  let outlineWidth: CGFloat
  /// CRD-12: the content's inset on every side; zero when `inset` is false.
  let padding: CGFloat

  init(
    tokens: TanreiCardTokens,
    variant: TanreiCardVariant,
    inset: Bool = true,
    isInteractive: Bool = true,
    state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    // CRD-11: only an interactive card answers hover, focus, press or disabled.
    let state = isInteractive ? state : .enabled
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: isInteractive ? beneath : .enabled)
    // CRD-7: the lookup is total — an unknown variant reads the default value's tokens (and is reported).
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { variantTokens[state: $0].containerColor }
    elevation = own.containerElevation
    outline = own.outlineColor
    content = own.contentColor
    // The vocabulary has no rest-state `opacity` token: a card at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.containerShape
    outlineWidth = tokens.outlineWidth
    padding = inset ? tokens.containerPadding : .zero
  }
}

// MARK: - Style

struct TanreiCardStyle: ButtonStyle {
  let variant: TanreiCardVariant
  let inset: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiCardChrome(variant: variant, inset: inset, isInteractive: true, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses) {
      configuration.label
    }
    // CRD-5: a card smaller than the minimum target on an axis is hit-tested at the target on that axis; its container
    // keeps its size, centred.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: the container with its elevation, the content inset, clipped and colored, the outline above it, and the
/// focus ring, all drawn from the tokens of the one resolved state.
struct TanreiCardChrome<Content: View>: View {
  let variant: TanreiCardVariant
  let inset: Bool
  let isInteractive: Bool
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (CRD-8).
  var keyboardPresses = 0
  @ViewBuilder let content: Content

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // CRD-8: a press stays visible at least `duration.press-hold`; CRD-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: isInteractive && feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.card
    // CRD-3: exactly one state — pressed > focused > hovered; CRD-6: disabled is a state too; CRD-11: a card that is not
    // interactive is drawn at rest, whatever the environment says.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiCardAppearance(
      tokens: tokens, variant: variant, inset: inset, isInteractive: isInteractive, state: state, feedback: feedback, beneath: beneath)
    let drawnState = isInteractive ? state : .enabled
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let shape = RoundedRectangle(cornerRadius: appearance.cornerRadius, style: system.shape.roundedCornerStyle)

    return content
      // CRD-13: the content color as the inherited foreground, and body type for plain text.
      .tanreiFont(system.typescale.body)
      .foregroundStyle(colors[appearance.content])
      // CRD-12: inset on every side (logical, so it mirrors), or to the edges; clipped to the container's corners.
      .padding(appearance.padding)
      .clipShape(shape)
      // CRD-10: the corners ease by `sys.shape.corner-smoothing`; the outline lies above the content.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity))
      // CRD-16: colors and elevation change over the state motion; at once under Reduce Motion.
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: drawnState)
      // CRD-4: shown for keyboard focus of an interactive card, never animated, never dimmed.
      .tanreiFocusRing(isInteractive && isFocused && isEnabled, cornerRadius: appearance.cornerRadius)
      .onHover { if isInteractive { isHovered = $0 } }
  }
}

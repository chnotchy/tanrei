import SwiftUI

// Spec: specs/extended-fab.spec.json — tokens: TanreiExtendedFabTokens (comp.extended-fab), read from the design system
// in the environment (`system.extendedFab`). Every design value in this file comes from a token; there are no literals,
// and no state's look is computed here. Press, hold, ripple, focus ring, hit target, container layers (with the
// elevation of the state) and the icon slot are the shared primitives: EFB-1…10 are BTN-1…10 for this
// component. Its geometry is Button's (paddings, gap, a label style per size), plus the collapse to a square (EFB-13,
// EFB-14), which `TanreiExtendedFabLayout` draws.

// `variant` is a `TanreiExtendedFabVariant` (filled, the default; tonal; surface — the FAB's meanings) and `size` a
// `TanreiExtendedFabSize` (the height; the FAB's sides, so a collapsed one matches the FAB of its size). Both are
// generated open keys. EFB-7: a value the current design system does not have draws the default value's
// tokens (`sizes[_:]` / `variants[_:]` are total and report in debug builds).

/// The floating action button with its name written out: a label and an optional leading icon on a raised container
/// that floats above the content, collapsing to a square that holds only the icon.
///
///     TanreiExtendedFloatingActionButton("Compose", icon: "edit", action: compose)             // a glyph of the icon font
///     TanreiExtendedFloatingActionButton("Compose", isExpanded: !isScrolling, action: compose) { Image(systemName: "pencil") }
///     TanreiExtendedFloatingActionButton("New invoice", variant: .tonal, action: create)       // no icon: never collapses
///
/// `title` is the visible text and the accessible name — also while collapsed, when it is not drawn. It never truncates:
/// it wraps when the layout gives the button less width, and the container grows. `isExpanded: false` collapses it to a
/// square of its height holding the icon (EFB-13), over the resize motion (EFB-14); without an icon it stays expanded
/// and reports it in debug builds (EFB-15). `disabled` follows SwiftUI's `.disabled(_:)` environment.
///
/// EFB-17: the button does not position itself. Place it where the screen wants it, typically in an
/// `.overlay(alignment: .bottomTrailing)`; that alignment also decides which edge stays in place while it collapses.
public struct TanreiExtendedFloatingActionButton<Icon: View>: View {
  private let title: Text
  private let variant: TanreiExtendedFabVariant
  private let size: TanreiExtendedFabSize
  /// The spec's `expanded`, as asked for.
  private let isExpanded: Bool
  private let action: @MainActor () -> Void
  private let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (EFB-8).
  @State private var keyboardPresses = 0

  private init(
    title: Text, isTitleEmpty: Bool, variant: TanreiExtendedFabVariant, size: TanreiExtendedFabSize, isExpanded: Bool,
    action: @escaping @MainActor () -> Void, icon: Icon
  ) {
    self.title = title
    self.variant = variant
    self.size = size
    self.isExpanded = isExpanded
    self.action = action
    self.icon = icon
    // EFB-19: still drawn, but without a name — reported in debug builds only.
    if isTitleEmpty {
      TanreiDiagnostics.report("Tanrei: an extended floating action button has an empty label; it has no accessible name (EFB-19). Pass the name of the action.")
    }
    // EFB-15: it collapses to its icon; without one it stays expanded.
    if !isExpanded && !hasIcon {
      TanreiDiagnostics.report("Tanrei: an extended floating action button cannot collapse without an icon; it stays expanded (EFB-15). Pass an icon, or keep isExpanded true.")
    }
  }

  /// An extended FAB with a leading icon view.
  public init<S: StringProtocol>(
    _ title: S,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(title: Text(title), isTitleEmpty: title.isEmpty, variant: variant, size: size, isExpanded: isExpanded, action: action, icon: icon())
  }

  /// An extended FAB with a localized title and a leading icon view.
  public init(
    _ titleKey: LocalizedStringKey,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(title: Text(titleKey), isTitleEmpty: titleKey == "", variant: variant, size: size, isExpanded: isExpanded, action: action, icon: icon())
  }

  public var body: some View {
    let form = self.form
    // EFB-5: the hidden sizing copy keeps layout at the visual size (EFB-17: it lays out at its own size) while the real
    // button, centred over it, is laid out at the minimum target on both axes (see TanreiMinimumHitTarget).
    return TanreiMinimumHitTarget {
      TanreiExtendedFabChrome(variant: variant, size: size, isPressed: false, isFocused: false) { content(form) }
    } control: {
      Button(action: { activate(isEnabled: isEnabled) }) { content(form) }
        .buttonStyle(TanreiExtendedFabStyle(variant: variant, size: size, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .focused($isFocused)
        // Tanrei draws its own ring (EFB-4); the system focus effect would double it.
        .focusEffectDisabled()
        // EFB-1: Enter and Space activate, exactly once per key press, and the press is shown like a pointer's
        // (EFB-8, EFB-9: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled)
        }
        // EFB-13: the title is the accessible name, drawn or collapsed away; the icon is hidden (decorative).
        .accessibilityLabel(title)
    }
  }

  private func content(_ form: TanreiExtendedFabForm) -> some View {
    TanreiExtendedFabContent(size: size, form: form, title: title) { icon }
  }

  private var hasIcon: Bool { !TanreiSlotContent.isEmpty(icon) }

  /// EFB-13, EFB-15: what is drawn — collapsed only when asked AND there is an icon to collapse to.
  var form: TanreiExtendedFabForm { TanreiExtendedFabForm(isExpanded: isExpanded, hasIcon: hasIcon) }

  /// The single route to `action`: one call emits exactly once, and never while disabled (EFB-1, EFB-2).
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    action()
  }
}

extension TanreiExtendedFloatingActionButton where Icon == EmptyView {
  /// An extended FAB without an icon. It never collapses (EFB-15).
  public init<S: StringProtocol>(
    _ title: S,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(title, variant: variant, size: size, isExpanded: isExpanded, action: action) { EmptyView() }
  }

  /// An extended FAB without an icon, with a localized title.
  public init(
    _ titleKey: LocalizedStringKey,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(titleKey, variant: variant, size: size, isExpanded: isExpanded, action: action) { EmptyView() }
  }
}

extension TanreiExtendedFloatingActionButton where Icon == TanreiIconGlyph {
  /// An extended FAB whose icon is a glyph of the design system's icon font, by name (as `systemImage:` names an SF
  /// Symbol).
  public init<S: StringProtocol>(
    _ title: S,
    icon: String,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(title, variant: variant, size: size, isExpanded: isExpanded, action: action) { TanreiIconGlyph(icon) }
  }

  /// An extended FAB with a localized title and a glyph of the icon font.
  public init(
    _ titleKey: LocalizedStringKey,
    icon: String,
    variant: TanreiExtendedFabVariant = .filled,
    size: TanreiExtendedFabSize = .medium,
    isExpanded: Bool = true,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(titleKey, variant: variant, size: size, isExpanded: isExpanded, action: action) { TanreiIconGlyph(icon) }
  }
}

// MARK: - Token bindings

/// EFB-11, EFB-13, EFB-15 — the form an extended FAB is drawn in.
struct TanreiExtendedFabForm: Equatable, Sendable {
  let hasIcon: Bool
  /// Whether the label is shown: expanded, or collapsed without an icon to collapse to (EFB-15).
  let showsLabel: Bool

  init(isExpanded: Bool, hasIcon: Bool) {
    self.hasIcon = hasIcon
    showsLabel = isExpanded || !hasIcon
  }

  /// 1 = expanded, 0 = the collapsed square: what `TanreiExtendedFabLayout` interpolates over the resize motion.
  var progress: CGFloat { showsLabel ? 1 : 0 }
}

extension TanreiExtendedFabTokens {
  /// How the EFB-9 ripple grows: over `comp.extended-fab.motion.feedback-duration`, with the state easing. `nil` under
  /// Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// EFB-16: a change of state — colors and elevation — over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// EFB-14: the collapse and expansion — width, the icon's place and the label's opacity — over the resize motion;
  /// `nil` under Reduce Motion (the new form at once).
  func resizeMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionResizeDuration, easing: motionResizeEasing, reduceMotion: reduceMotion)
  }
}

/// EFB-11 — the lengths of one size. Pure data read from a `TanreiExtendedFabTokens`.
struct TanreiExtendedFabMetrics: Equatable {
  /// A minimum while expanded (the container grows with its label); the side of the collapsed square.
  let height: CGFloat
  let cornerRadius: CGFloat
  let paddingStart: CGFloat
  let paddingStartWithIcon: CGFloat
  let paddingEnd: CGFloat
  let paddingBlock: CGFloat
  let gap: CGFloat
  let labelTypescale: TanreiTextStyle
  let iconSize: CGFloat

  init(tokens: TanreiExtendedFabTokens, size: TanreiExtendedFabSize) {
    // EFB-7: total — an unknown size reads the default size's tokens.
    let metrics = tokens.sizes[size]
    height = metrics.containerHeight
    cornerRadius = metrics.containerShape
    paddingStart = metrics.containerPaddingInlineStart
    paddingStartWithIcon = metrics.containerPaddingInlineStartWithIcon
    paddingEnd = metrics.containerPaddingInlineEnd
    paddingBlock = metrics.containerPaddingBlock
    gap = metrics.containerGap
    labelTypescale = metrics.labelTypescale
    iconSize = metrics.iconSize
  }
}

/// Which token values an extended FAB draws for one variant × size × state. Pure data read from a
/// `TanreiExtendedFabTokens`, so the bindings can be tested without rendering. EFB-3 / EFB-6: every state, disabled
/// included, is drawn from that state's tokens — the elevation too (EFB-16). The icon takes the label color (EFB-12).
struct TanreiExtendedFabAppearance: Equatable {
  let container: TanreiPaint
  /// The label's color, and the icon's.
  let label: TanreiPaint
  let elevation: [TanreiShadowLayer]
  /// Opacity of the whole control.
  let opacity: Double
  let metrics: TanreiExtendedFabMetrics
  /// EFB-9 `ripple`: the pressed container paint, grown from the point of contact over `container`.
  let ripple: TanreiPaint?

  var cornerRadius: CGFloat { metrics.cornerRadius }

  init(
    tokens: TanreiExtendedFabTokens,
    variant: TanreiExtendedFabVariant,
    size: TanreiExtendedFabSize,
    state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // EFB-7: both lookups are total — an unknown value reads the default value's tokens.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { variantTokens[state: $0].containerColor }
    label = own.labelColor
    elevation = own.containerElevation
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    metrics = TanreiExtendedFabMetrics(tokens: tokens, size: size)
  }
}

// MARK: - Layout (EFB-11, EFB-13, EFB-14, EFB-18)

/// EFB-11: `[start padding][icon][gap][label][end padding]`, at least `height` high, padded top and bottom by at least
/// `paddingBlock`, and as wide as that content — the label wraps when the layout gives the button less width, and the
/// container grows. The icon takes its width in the row and no height (`TanreiIconSlot`); the line box is the label's.
/// Paddings are logical, so the row mirrors in a right-to-left layout (EFB-18).
struct TanreiExtendedFabRow<Icon: View, Label: View>: View {
  let metrics: TanreiExtendedFabMetrics
  let hasIcon: Bool
  /// 1 = expanded, 0 = collapsed (`TanreiExtendedFabForm.progress`), animated by the caller.
  let progress: CGFloat
  @ViewBuilder let icon: Icon
  @ViewBuilder let label: Label

  var body: some View {
    // EFB-13: collapsed, the row slides so that the icon sits in the middle of the square of the height.
    let collapsedOffset = hasIcon ? (metrics.height - metrics.iconSize) / 2 - metrics.paddingStartWithIcon : .zero
    TanreiExtendedFabLayout(progress: progress, side: metrics.height, collapsedOffset: collapsedOffset) {
      HStack(spacing: metrics.gap) {
        if hasIcon {
          TanreiIconSlot(size: metrics.iconSize) { icon }
        }
        // EFB-14: the label fades out as the container narrows and in as it widens.
        label.opacity(Double(progress))
      }
      .padding(.leading, hasIcon ? metrics.paddingStartWithIcon : metrics.paddingStart)
      .padding(.trailing, metrics.paddingEnd)
      .padding(.vertical, metrics.paddingBlock)
      .frame(minHeight: metrics.height)
    }
  }
}

/// EFB-13, EFB-14: interpolates between the expanded row (its one subview, at its own size) and the collapsed square of
/// `side`, by `progress` — animatable, so the width, the height and the icon's place move together. The row keeps its
/// expanded width while it narrows (the container clips it), so the label never reflows during the collapse. Placements
/// are logical: SwiftUI mirrors a layout's placements in a right-to-left environment (EFB-18).
struct TanreiExtendedFabLayout: Layout {
  var progress: CGFloat
  /// The side of the collapsed square: the size's height.
  let side: CGFloat
  /// Where the row starts, relative to the container, when collapsed: the icon centred in the square.
  let collapsedOffset: CGFloat

  var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  /// Linear interpolation between the collapsed and the expanded value.
  private func mix(_ collapsed: CGFloat, _ expanded: CGFloat) -> CGFloat {
    collapsed + (expanded - collapsed) * progress
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let row = subviews.first?.sizeThatFits(proposal) ?? .zero
    return CGSize(width: mix(side, row.width), height: mix(side, row.height))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let row = subviews.first else { return }
    let size = row.sizeThatFits(proposal)
    row.place(at: CGPoint(x: bounds.minX + mix(collapsedOffset, .zero), y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(size))
  }
}

/// The row inside the container of an extended FAB: the icon and the title, in the form asked for.
struct TanreiExtendedFabContent<Icon: View>: View {
  let size: TanreiExtendedFabSize
  let form: TanreiExtendedFabForm
  let title: Text
  @ViewBuilder let icon: Icon

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let tokens = system.extendedFab
    let metrics = TanreiExtendedFabMetrics(tokens: tokens, size: size)
    TanreiExtendedFabRow(metrics: metrics, hasIcon: form.hasIcon, progress: form.progress) {
      // EFB-12: the icon box of the size, in the label color (the inherited foreground), with the icon font of an
      // unselected icon. Decorative: the title is the name (`TanreiIconSlot` hides it).
      icon.tanreiIconContext(size: metrics.iconSize, selected: false)
    } label: {
      // EFB-12: the label style of the size; never truncated (it wraps, and the container grows).
      title
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(metrics.labelTypescale)
    }
    // EFB-14: the width, the icon's place and the label's opacity move together over the resize motion.
    .animation(tokens.resizeMotion(reduceMotion: reduceMotion), value: form)
  }
}

// MARK: - Style

struct TanreiExtendedFabStyle: ButtonStyle {
  let variant: TanreiExtendedFabVariant
  let size: TanreiExtendedFabSize
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiExtendedFabChrome(variant: variant, size: size, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses) {
      configuration.label
    }
    // EFB-5: the hit area reaches the minimum target on both axes; the visual size does not change.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: the raised container with the elevation of its state around the row, clipped to its corners (a label
/// sliding out while it collapses never draws outside them), and the focus indicator, all drawn from the tokens of the
/// one resolved state.
struct TanreiExtendedFabChrome<Content: View>: View {
  let variant: TanreiExtendedFabVariant
  let size: TanreiExtendedFabSize
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (EFB-8).
  var keyboardPresses = 0
  @ViewBuilder let content: Content

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // EFB-8: a press stays visible at least `duration.press-hold`; EFB-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.extendedFab
    // EFB-3: exactly one state — pressed > focused > hovered; EFB-6: disabled is a state too. SwiftUI focus is keyboard
    // focus: a click or tap never moves focus to a button (EFB-4).
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiExtendedFabAppearance(tokens: tokens, variant: variant, size: size, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let shape = RoundedRectangle(cornerRadius: appearance.cornerRadius, style: system.shape.roundedCornerStyle)

    return content
      // EFB-12: the label color reaches the label and the icon.
      .foregroundStyle(colors[appearance.label])
      .clipShape(shape)
      // EFB-16: the elevation of the state, cast outside the container and never clipped; EFB-10: the corners ease by
      // `sys.shape.corner-smoothing` (both in `TanreiContainerLayers`). No outline part.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
      // EFB-16: colors and elevation change over the state motion; at once under Reduce Motion.
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      // EFB-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius)
      .onHover { isHovered = $0 }
  }
}

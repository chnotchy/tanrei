import SwiftUI

// Spec: specs/chip.spec.json — tokens: TanreiChipTokens (comp.chip), read from the design system in the environment
// (`system.chip`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. Press, hold, ripple, focus ring, hit target, container layers (with the elevation of the state) and
// the icon slot are the shared primitives: CHP-1…10 are BTN-1…10 for this component.
//
// The spec's `kind` (action, filter, input) maps to `isSelected / onRemove` — it is chosen by initializer:
// `init(_:action:)` is an ACTION chip, `init(_:isSelected:)` (a `Binding<Bool>`) a FILTER chip, and
// `init(_:removeLabel:action:onRemove:)` an INPUT chip. `variant` is a `TanreiChipVariant` (outlined, the default;
// elevated) and `size` a `TanreiChipSize` (small 24, medium 32): generated open keys. CHP-7: a value the
// current design system does not have draws the default value's tokens (`sizes[_:]` / `variants[_:]` are total and
// report in debug builds).
//
// An input chip is two controls (CHP-18): the chip, and at its inline end its remove action — a second `Button` beside
// the chip's (not inside its label, where it would take the chip's taps), laid over the chip's trailing glyph box. It
// is its own element for assistive technology, its own focus stop after the chip, and has its own hover, focus and
// press (CHP-20), its own hit area of at least the minimum target (CHP-21).

/// A compact control in a row: an action, a filter that is on or off, or an item the user entered and can remove.
///
///     TanreiChip("Add to calendar", icon: "event", action: add)                                  // an action chip
///     TanreiChip("Vegetarian", isSelected: $vegetarian)                                          // a filter chip
///     TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", onRemove: { remove(ada) })   // an input chip
///     TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", avatar: { Photo(ada) }, onRemove: { remove(ada) })
///
/// `title` is the visible text and the accessible name; it stays on one line and truncates only when the layout gives
/// the chip less width than it needs (CHP-17). A filter chip is a button with a pressed state — the selected trait
/// while on — never a checkbox (CHP-11): activation calls `action`, then flips `isSelected`. An input chip asks its
/// owner to remove it through `onRemove` — from its remove action, or Backspace / Delete on the focused chip — and never
/// removes itself or moves focus (CHP-19, CHP-22). `disabled` follows SwiftUI's `.disabled(_:)` environment, and reaches
/// the remove action too. The chip does not group itself: a row of chips, its keyboard model and its selection rules
/// belong to the layout that holds them (CHP-23).
public struct TanreiChip<Icon: View, Avatar: View>: View {
  private let kind: TanreiChipKind
  private let title: TanreiControlTitle
  private let variant: TanreiChipVariant
  private let size: TanreiChipSize
  /// A filter chip's selection; `nil` for the other kinds (CHP-11: they ignore `selected`).
  private let isSelected: Binding<Bool>?
  /// An input chip's remove action: its name (the spec's `removeLabel`) and the `remove` event.
  private let removeLabel: TanreiControlTitle?
  private let onRemove: (@MainActor () -> Void)?
  private let action: @MainActor () -> Void
  private let icon: Icon
  private let avatar: Avatar

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @FocusState private var isFocused: Bool
  @FocusState private var isRemoveFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (CHP-8).
  @State private var keyboardPresses = 0
  @State private var removeKeyboardPresses = 0
  /// CHP-20: while the pointer is on the remove action, the chip itself is not hovered.
  @State private var isRemoveHovered = false
  /// The chip's whole-control opacity (a `dim` press), which reaches the remove action drawn over it (CHP-9).
  @State private var chipOpacity = TanreiIdentity.opacity

  init(
    kind: TanreiChipKind, title: TanreiControlTitle, variant: TanreiChipVariant, size: TanreiChipSize, isSelected: Binding<Bool>?,
    removeLabel: TanreiControlTitle?, action: @escaping @MainActor () -> Void, onRemove: (@MainActor () -> Void)?, icon: Icon, avatar: Avatar
  ) {
    self.kind = kind
    self.title = title
    self.variant = variant
    self.size = size
    self.isSelected = kind == .filter ? isSelected : nil
    self.removeLabel = kind == .input ? removeLabel : nil
    self.action = action
    self.onRemove = kind == .input ? onRemove : nil
    self.icon = icon
    self.avatar = avatar
    // CHP-15: only an input chip draws an avatar; another kind ignores it and says so in debug builds.
    if kind != .input && !TanreiSlotContent.isEmpty(avatar) {
      TanreiDiagnostics.report("Tanrei: only an input chip draws an avatar; this \(kind.rawValue) chip ignores it (CHP-15).")
    }
  }

  public var body: some View {
    let tokens = system.chip
    let look = self.look
    let parts = self.parts
    let row = TanreiChipRow(size: size, kind: kind, look: look, parts: parts, title: title.text, icon: icon, avatar: avatar)
    let removal = kind == .input ? TanreiChipRemoveGeometry(tokens: tokens, size: size, measure: system.measure) : nil
    // CHP-5: the hidden sizing copy keeps layout at the visual size while the real button, centred over it, is laid out
    // at the minimum target on both axes (see TanreiMinimumHitTarget).
    return TanreiMinimumHitTarget {
      TanreiChipChrome(variant: variant, size: size, look: look, isPressed: false, isFocused: false) { row }
    } control: {
      Button(action: { activate(isEnabled: isEnabled) }) { row }
        .buttonStyle(
          TanreiChipStyle(
            variant: variant, size: size, look: look, isFocused: isFocused, keyboardPresses: keyboardPresses, isRemoveHovered: isRemoveHovered,
            opacity: $chipOpacity))
        .focused($isFocused)
        // Tanrei draws its own ring (CHP-4); the system focus effect would double it.
        .focusEffectDisabled()
        // CHP-1: Enter and Space activate, exactly once per key press, and the press is shown like a pointer's
        // (CHP-8, CHP-9: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          activate(isEnabled: isEnabled)
        }
        // CHP-19: Backspace or Delete on the focused input chip — the chip, not its remove action — asks for removal.
        .onKeyPress(keys: TanreiChipKeys.remove, phases: .down) { _ in
          guard kind == .input, isEnabled else { return .ignored }
          remove(isEnabled: isEnabled)
          return .handled
        }
        // The title is the name, in full even when truncated (CHP-17); the icon, check and avatar are decorative.
        .accessibilityLabel(title.text)
        // CHP-11: a filter chip is a toggle, selected while on; an action or input chip exposes neither.
        .accessibilityAddTraits(look.accessibilityTraits(kind: kind))
    }
    // CHP-18, CHP-21: the remove action at the chip's inline end — its own button over the chip's trailing glyph box,
    // reached after the chip. Its hit area reaches outward past the chip as far as it needs (`overhang`).
    .overlay(alignment: .trailing) {
      if let removal, let removeLabel {
        Button(action: { remove(isEnabled: isEnabled) }) { Color.clear }
          .buttonStyle(
            TanreiChipRemoveStyle(
              variant: variant, geometry: removal, isFocused: isRemoveFocused, keyboardPresses: removeKeyboardPresses,
              chipOpacity: chipOpacity, isHovered: $isRemoveHovered))
          .focused($isRemoveFocused)
          .focusEffectDisabled()
          .tanreiKeyActivation(isEnabled: isEnabled) {
            removeKeyboardPresses += 1
            remove(isEnabled: isEnabled)
          }
          .accessibilityLabel(removeLabel.text)
          // Laid out `overhang` narrower than it is, so that aligned to the chip's inline end it reaches past it.
          .padding(.trailing, -removal.overhang)
      }
    }
  }

  /// CHP-12: which parts are drawn — only a filter chip that is on draws its `selected.` parts.
  var look: TanreiChipLook { TanreiChipLook(kind: kind, isSelected: isSelected?.wrappedValue ?? false) }

  /// CHP-16: what the row holds at its ends.
  var parts: TanreiChipParts {
    TanreiChipParts(kind: kind, hasIcon: !TanreiSlotContent.isEmpty(icon), hasAvatar: kind == .input && !TanreiSlotContent.isEmpty(avatar))
  }

  /// The single route to the chip's own events (CHP-1, CHP-2, CHP-11): one call emits `action` once and, for a filter
  /// chip, then flips `isSelected` once — click, then change, as a native checkbox — and never while disabled.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    action()
    isSelected?.wrappedValue.toggle()
  }

  /// The single route to `remove` (CHP-18, CHP-19): once per activation of the remove action or per key press, never
  /// while disabled, never `action` (CHP-18). The chip does not remove itself (CHP-22).
  func remove(isEnabled: Bool) {
    guard isEnabled else { return }
    onRemove?()
  }
}

// MARK: - Initializers

extension TanreiChip where Avatar == EmptyView {
  /// An action chip with a leading icon view.
  public init<S: StringProtocol>(
    _ title: S, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium, action: @escaping @MainActor () -> Void,
    @ViewBuilder icon: () -> Icon
  ) {
    self.init(
      kind: .action, title: TanreiControlTitle(title, component: "chip", behavior: "CHP-26"), variant: variant, size: size, isSelected: nil,
      removeLabel: nil, action: action, onRemove: nil, icon: icon(), avatar: EmptyView())
  }

  /// An action chip with a localized title and a leading icon view.
  public init(
    _ titleKey: LocalizedStringKey, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void, @ViewBuilder icon: () -> Icon
  ) {
    self.init(
      kind: .action, title: TanreiControlTitle(titleKey, component: "chip", behavior: "CHP-26"), variant: variant, size: size, isSelected: nil,
      removeLabel: nil, action: action, onRemove: nil, icon: icon(), avatar: EmptyView())
  }

  /// A filter chip with a leading icon view (replaced by the check while on). `action` is the click, before the change.
  public init<S: StringProtocol>(
    _ title: S, isSelected: Binding<Bool>, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, @ViewBuilder icon: () -> Icon
  ) {
    self.init(
      kind: .filter, title: TanreiControlTitle(title, component: "chip", behavior: "CHP-26"), variant: variant, size: size,
      isSelected: isSelected, removeLabel: nil, action: action, onRemove: nil, icon: icon(), avatar: EmptyView())
  }

  /// A filter chip with a localized title and a leading icon view.
  public init(
    _ titleKey: LocalizedStringKey, isSelected: Binding<Bool>, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, @ViewBuilder icon: () -> Icon
  ) {
    self.init(
      kind: .filter, title: TanreiControlTitle(titleKey, component: "chip", behavior: "CHP-26"), variant: variant, size: size,
      isSelected: isSelected, removeLabel: nil, action: action, onRemove: nil, icon: icon(), avatar: EmptyView())
  }

  /// An input chip with a leading icon view. `removeLabel` names its remove action and should name the item.
  public init<S: StringProtocol, R: StringProtocol>(
    _ title: S, removeLabel: R, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, onRemove: @escaping @MainActor () -> Void, @ViewBuilder icon: () -> Icon
  ) {
    self.init(
      kind: .input, title: TanreiControlTitle(title, component: "chip", behavior: "CHP-26"), variant: variant, size: size, isSelected: nil,
      removeLabel: TanreiControlTitle(removeLabel, component: "chip's remove action", behavior: "CHP-26"), action: action, onRemove: onRemove,
      icon: icon(), avatar: EmptyView())
  }
}

extension TanreiChip where Icon == EmptyView, Avatar == EmptyView {
  /// An action chip without an icon.
  public init<S: StringProtocol>(_ title: S, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium, action: @escaping @MainActor () -> Void) {
    self.init(title, variant: variant, size: size, action: action) { EmptyView() }
  }

  /// A filter chip without an icon: the check appears in the leading position while it is on (CHP-13).
  public init<S: StringProtocol>(
    _ title: S, isSelected: Binding<Bool>, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}
  ) {
    self.init(title, isSelected: isSelected, variant: variant, size: size, action: action) { EmptyView() }
  }

  /// An input chip without an icon or avatar.
  public init<S: StringProtocol, R: StringProtocol>(
    _ title: S, removeLabel: R, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, onRemove: @escaping @MainActor () -> Void
  ) {
    self.init(title, removeLabel: removeLabel, variant: variant, size: size, action: action, onRemove: onRemove) { EmptyView() }
  }
}

extension TanreiChip where Icon == EmptyView {
  /// An input chip with a leading avatar (an image of a person or a file), drawn at the size's avatar size and clipped
  /// to the avatar shape (CHP-15). Only an input chip takes an avatar.
  public init<S: StringProtocol, R: StringProtocol>(
    _ title: S, removeLabel: R, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, @ViewBuilder avatar: () -> Avatar, onRemove: @escaping @MainActor () -> Void
  ) {
    self.init(
      kind: .input, title: TanreiControlTitle(title, component: "chip", behavior: "CHP-26"), variant: variant, size: size, isSelected: nil,
      removeLabel: TanreiControlTitle(removeLabel, component: "chip's remove action", behavior: "CHP-26"), action: action, onRemove: onRemove,
      icon: EmptyView(), avatar: avatar())
  }
}

extension TanreiChip where Icon == TanreiIconGlyph, Avatar == EmptyView {
  /// An action chip whose icon is a glyph of the design system's icon font, by name.
  public init<S: StringProtocol>(
    _ title: S, icon: String, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium, action: @escaping @MainActor () -> Void
  ) {
    self.init(title, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// A filter chip whose icon is a glyph of the icon font.
  public init<S: StringProtocol>(
    _ title: S, isSelected: Binding<Bool>, icon: String, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}
  ) {
    self.init(title, isSelected: isSelected, variant: variant, size: size, action: action) { TanreiIconGlyph(icon) }
  }

  /// An input chip whose icon is a glyph of the icon font.
  public init<S: StringProtocol, R: StringProtocol>(
    _ title: S, removeLabel: R, icon: String, variant: TanreiChipVariant = .outlined, size: TanreiChipSize = .medium,
    action: @escaping @MainActor () -> Void = {}, onRemove: @escaping @MainActor () -> Void
  ) {
    self.init(title, removeLabel: removeLabel, variant: variant, size: size, action: action, onRemove: onRemove) { TanreiIconGlyph(icon) }
  }
}

// MARK: - Kind, look and parts

/// The spec's `kind` — what the chip does, its role and its parts. A closed set, chosen by initializer.
enum TanreiChipKind: String, CaseIterable, Sendable {
  /// A button that performs or suggests something.
  case action
  /// A two-state control, on or off.
  case filter
  /// An item the user entered, which the user can remove.
  case input
}

/// The keys a chip answers besides Enter and Space (`TanreiActivationKeys.button`). No arrow key: moving between chips
/// belongs to the layout that holds them (CHP-23).
enum TanreiChipKeys {
  /// CHP-19: Backspace (`delete`) and Delete (`deleteForward`) on a focused input chip.
  static let remove: Set<KeyEquivalent> = [.delete, .deleteForward]
}

/// CHP-12 — the looks of one variant: its own parts, or — a filter chip that is on — its `selected.` parts. There is no
/// `unselected.` look: a filter chip that is off looks like any chip of its variant.
enum TanreiChipLook: Equatable, Sendable, CaseIterable {
  case plain
  case selected

  init(kind: TanreiChipKind, isSelected: Bool) {
    self = kind == .filter && isSelected ? .selected : .plain
  }

  /// CHP-11: a filter chip is a toggle to assistive technology, selected while on; the other kinds are plain buttons.
  func accessibilityTraits(kind: TanreiChipKind) -> AccessibilityTraits {
    guard kind == .filter else { return [] }
    return self == .selected ? [.isToggle, .isSelected] : .isToggle
  }

  /// CHP-13: how much of the check is shown (1 on, 0 off): what the width, the check and the icon fade move by.
  var checkShown: CGFloat { self == .selected ? 1 : 0 }
}

/// CHP-16 — what the chip's row holds at each end.
struct TanreiChipParts: Equatable, Sendable {
  enum Leading: Equatable, Sendable {
    case none
    /// The leading icon; for a filter chip, the check takes its place while on.
    case icon
    /// A filter chip without an icon: the check appears alone, growing its room (CHP-13).
    case check
    /// An input chip's avatar (CHP-15).
    case avatar
  }

  let leading: Leading
  /// An input chip's remove glyph at the inline end (CHP-18).
  let hasRemove: Bool

  init(kind: TanreiChipKind, hasIcon: Bool, hasAvatar: Bool) {
    if hasAvatar && kind == .input {
      leading = .avatar
    } else if hasIcon {
      leading = .icon
    } else if kind == .filter {
      leading = .check
    } else {
      leading = .none
    }
    hasRemove = kind == .input
  }
}

/// CHP-16 — the lengths of the row for one size, parts and look. Pure data read from a `TanreiChipTokens`.
struct TanreiChipGeometry: Equatable {
  let height: CGFloat
  let paddingBlock: CGFloat
  /// The padding at the start, before the leading element or the label.
  let start: CGFloat
  /// The width the leading element takes in the row (its box may be larger while the check appears).
  let leadingWidth: CGFloat
  /// The gap after the leading element.
  let leadingGap: CGFloat
  /// The gap before the remove glyph, and the glyph's box.
  let trailingGap: CGFloat
  let trailingWidth: CGFloat
  /// The padding at the end, after the label or the remove glyph.
  let end: CGFloat
  let iconSize: CGFloat
  let avatarSize: CGFloat
  let labelTypescale: TanreiTextStyle

  /// - Parameter shown: how much of the check is shown (`TanreiChipLook.checkShown`, animated by the caller).
  init(tokens: TanreiChipTokens, size: TanreiChipSize, parts: TanreiChipParts, shown: CGFloat) {
    // CHP-7: total — an unknown size reads the default size's tokens.
    let metrics = tokens.sizes[size]
    height = metrics.containerHeight
    paddingBlock = metrics.containerPaddingBlock
    iconSize = metrics.iconSize
    avatarSize = metrics.avatarSize
    labelTypescale = metrics.labelTypescale
    let gap = metrics.containerGap
    switch parts.leading {
    case .none:
      start = metrics.containerPaddingInline
      leadingWidth = .zero
      leadingGap = .zero
    case .icon:
      start = metrics.containerPaddingInlineWithIcon
      leadingWidth = metrics.iconSize
      leadingGap = gap
    case .check:
      // CHP-13: the check's room, the gap after it and the padding before it grow as it shows.
      start = metrics.containerPaddingInline + (metrics.containerPaddingInlineWithIcon - metrics.containerPaddingInline) * shown
      leadingWidth = metrics.iconSize * shown
      leadingGap = gap * shown
    case .avatar:
      start = metrics.containerPaddingInlineWithAvatar
      leadingWidth = metrics.avatarSize
      leadingGap = gap
    }
    trailingGap = parts.hasRemove ? gap : .zero
    trailingWidth = parts.hasRemove ? metrics.iconSize : .zero
    end = parts.hasRemove ? metrics.containerPaddingInlineWithIcon : metrics.containerPaddingInline
  }
}

/// CHP-18, CHP-21 — where the remove action is and how far its hit area reaches. Pure data from the tokens.
struct TanreiChipRemoveGeometry: Equatable {
  /// The round container (`remove.container.size` of the size), centred on the glyph.
  let containerSize: CGFloat
  let cornerRadius: CGFloat
  let iconSize: CGFloat
  /// The hit area: at least the minimum target on both axes, and never smaller than the round container.
  let hitWidth: CGFloat
  let hitHeight: CGFloat
  /// From the glyph's centre toward the label: no further than the gap before the glyph (CHP-21: never over the label).
  let inward: CGFloat
  /// How far the hit area reaches past the chip's inline end.
  let overhang: CGFloat

  init(tokens: TanreiChipTokens, size: TanreiChipSize, measure: TanreiMeasure) {
    let metrics = tokens.sizes[size]
    containerSize = metrics.removeContainerSize
    cornerRadius = tokens.removeContainerShape
    iconSize = metrics.iconSize
    let target = TanreiHitTarget.minimum(in: measure)
    hitWidth = max(target, metrics.removeContainerSize)
    hitHeight = max(target, metrics.removeContainerSize)
    inward = min(hitWidth / 2, metrics.containerGap + metrics.iconSize / 2)
    // The glyph's centre sits half a glyph and the end padding in from the chip's inline end.
    let glyphToEnd = metrics.containerPaddingInlineWithIcon + metrics.iconSize / 2
    overhang = max(.zero, hitWidth - inward - glyphToEnd)
  }
}

// MARK: - Token bindings

extension TanreiChipTokens {
  /// How the CHP-9 ripple grows: over `comp.chip.motion.feedback-duration`, with the state easing. `nil` under Reduce
  /// Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// CHP-24 (a change of state: the state motion) and CHP-13 (a change of selection: the selection motion).
  func motion(reduceMotion: Bool) -> TanreiSelectionMotion {
    TanreiSelectionMotion(
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing, reduceMotion: reduceMotion)
  }
}

extension TanreiChipVariantStateTokens {
  /// The container, elevation, outline, label and icon of `look`: the variant's own, or its `selected.` parts. (The
  /// look's `state-layer.color` is not read: it is what the design system mixed into this state's container.)
  func parts(_ look: TanreiChipLook) -> (container: TanreiPaint, elevation: [TanreiShadowLayer], outline: TanreiPaint, label: TanreiPaint, icon: TanreiPaint) {
    switch look {
    case .plain: return (containerColor, containerElevation, outlineColor, labelColor, iconColor)
    case .selected: return (selectedContainerColor, selectedContainerElevation, selectedOutlineColor, selectedLabelColor, selectedIconColor)
    }
  }
}

/// Which token values a chip draws for one variant × look × state. Pure data read from a `TanreiChipTokens`, so the
/// bindings can be tested without rendering. CHP-3 / CHP-6: every state, disabled included, is drawn from that state's
/// tokens; CHP-12: from the parts of the look.
struct TanreiChipAppearance: Equatable {
  let container: TanreiPaint
  let elevation: [TanreiShadowLayer]
  let outline: TanreiPaint
  let label: TanreiPaint
  /// The icon's color, and the check's (CHP-14).
  let icon: TanreiPaint
  /// Opacity of the whole chip.
  let opacity: Double
  let cornerRadius: CGFloat
  let outlineWidth: CGFloat
  /// CHP-9 `ripple`: the pressed container paint of the look, grown from the point of contact over `container`.
  let ripple: TanreiPaint?

  init(
    tokens: TanreiChipTokens, variant: TanreiChipVariant, look: TanreiChipLook = .plain, state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // CHP-7: total — an unknown variant reads the default value's tokens.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state].parts(look)
    container = variantTokens[state: layers.container].parts(look).container
    ripple = layers.ripple.map { variantTokens[state: $0].parts(look).container }
    elevation = own.elevation
    outline = own.outline
    label = own.label
    icon = own.icon
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.containerShape
    outlineWidth = tokens.outlineWidth
  }
}

/// CHP-20 — which token values the remove action draws in ITS OWN state: the variant's `remove.` parts. Pure data.
struct TanreiChipRemoveAppearance: Equatable {
  let container: TanreiPaint
  let glyph: TanreiPaint
  /// The remove action's opacity: a `dim` press of it dims it (CHP-20 answers its press as CHP-9 names).
  let opacity: Double
  let ripple: TanreiPaint?

  init(
    tokens: TanreiChipTokens, variant: TanreiChipVariant, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let variantTokens = tokens.variants[variant]
    container = variantTokens[state: layers.container].removeContainerColor
    ripple = layers.ripple.map { variantTokens[state: $0].removeContainerColor }
    glyph = variantTokens[state: layers.state].removeIconColor
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
  }
}

// MARK: - The row (CHP-13, CHP-14, CHP-15, CHP-16, CHP-17, CHP-25)

/// The colors the chip's chrome hands its row: the label's and the icon's (and the check's) of the resolved state.
struct TanreiChipRowColors: Equatable {
  var label: TanreiPaint
  var icon: TanreiPaint
}

private struct TanreiChipRowColorsKey: EnvironmentKey {
  static let defaultValue: TanreiChipRowColors? = nil
}

extension EnvironmentValues {
  /// Set by a chip's chrome around its row.
  var tanreiChipRowColors: TanreiChipRowColors? {
    get { self[TanreiChipRowColorsKey.self] }
    set { self[TanreiChipRowColorsKey.self] = newValue }
  }
}

/// CHP-16: `[start][leading][gap][label][gap][remove glyph box][end]`, at least the size's height, padded top and bottom
/// by at least padding-block. The leading element and the glyph box take their width in the row and no height (the
/// line box is the label's, CHP-17: the chip grows in height with larger text). An `HStack` with logical paddings, so a
/// right-to-left layout mirrors it (CHP-25). The remove glyph itself is drawn by the remove action, over its box.
struct TanreiChipRow<Icon: View, Avatar: View>: View {
  let size: TanreiChipSize
  let kind: TanreiChipKind
  let look: TanreiChipLook
  let parts: TanreiChipParts
  let title: Text
  let icon: Icon
  let avatar: Avatar

  @Environment(\.tanreiSystem) private var system
  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiChipRowColors) private var rowColors
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.chip
    let shown = look.checkShown
    let geometry = TanreiChipGeometry(tokens: tokens, size: size, parts: parts, shown: shown)
    let fallback = TanreiChipAppearance(tokens: tokens, variant: .outlined, look: look, state: isEnabled ? .enabled : .disabled)
    let paints = rowColors ?? TanreiChipRowColors(label: fallback.label, icon: fallback.icon)
    HStack(spacing: .zero) {
      if parts.leading != .none {
        leading(geometry: geometry, shown: shown, iconColor: colors[paints.icon])
        Color.clear.frame(width: geometry.leadingGap, height: .zero)
      }
      // CHP-17: one line, in the size's text style and the label color of the look; an ellipsis only when the layout
      // gives the chip less width than the label needs. It grows in height with larger text.
      title
        .lineLimit(1)
        .truncationMode(.tail)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(geometry.labelTypescale)
        .foregroundStyle(colors[paints.label])
      if parts.hasRemove {
        Color.clear.frame(width: geometry.trailingGap + geometry.trailingWidth, height: .zero)
      }
    }
    .padding(.leading, geometry.start)
    .padding(.trailing, geometry.end)
    .padding(.vertical, geometry.paddingBlock)
    .frame(minHeight: geometry.height)
  }

  @ViewBuilder
  private func leading(geometry: TanreiChipGeometry, shown: CGFloat, iconColor: Color) -> some View {
    let box = parts.leading == .avatar ? geometry.avatarSize : geometry.iconSize
    Color.clear
      .frame(width: geometry.leadingWidth, height: .zero)
      .overlay(alignment: .leading) {
        Group {
          switch parts.leading {
          case .avatar:
            // CHP-15: the avatar at the avatar size, clipped to the avatar shape; CHP-6: at the disabled content
            // opacity while disabled.
            avatar
              .frame(width: box, height: box)
              .clipShape(TanreiCornerShape(cornerRadius: system.chip.avatarShape, style: system.shape.roundedCornerStyle))
              .opacity(isEnabled ? TanreiIdentity.opacity : system.state.disabledContentOpacity)
          case .icon, .check:
            // CHP-14: the icon box of the size, in the icon color of the look, with the icon font of the selection
            // (selected only while a filter chip is on). CHP-13: the check takes the icon's place as it shows.
            ZStack {
              if parts.leading == .icon {
                icon
                  .frame(width: box, height: box)
                  .opacity(kind == .filter ? Double(TanreiChipLook.selected.checkShown - shown) : TanreiIdentity.opacity)
              }
              if kind == .filter {
                TanreiChipGlyph(kind: .check, progress: shown)
              }
            }
            .frame(width: box, height: box)
            .foregroundStyle(iconColor)
            .tanreiIconContext(size: box, selected: look == .selected)
          case .none:
            EmptyView()
          }
        }
        .accessibilityHidden(true)
      }
  }
}

/// A glyph the chip draws itself: the filter chip's check and the remove action's close (CHP-13, CHP-14). With the icon
/// font — the family, fill, weight and optical size of the slot's context — its `check` / `close` glyph; without it (or
/// under the platform-font policy) a vector in the same box: the check follows the checkbox's mark geometry
/// (`TanreiCheckboxMarkShape`), stroked at `sys.border.thick` as the checkbox's mark is. `progress` draws the check in
/// from its start (and fades the font's glyph). It does not mirror in a right-to-left layout.
struct TanreiChipGlyph: View {
  enum Kind: String, Sendable {
    case check
    case close
  }

  let kind: Kind
  var progress: CGFloat = TanreiCheckboxMarkShape.drawn

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.tanreiIconContext) private var context

  var body: some View {
    let context = context ?? TanreiIconContext(size: theme.system.measure.iconSmall, selected: false)
    let stroke = StrokeStyle(lineWidth: theme.system.measure.borderThick, lineCap: .square, lineJoin: .miter)
    Group {
      if theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) != nil {
        TanreiIconGlyph(kind.rawValue)
          .opacity(Double(min(max(progress, .zero), TanreiCheckboxMarkShape.drawn)))
      } else {
        switch kind {
        case .check:
          TanreiCheckboxMarkShape(kind: .check, progress: progress).stroke(style: stroke)
        case .close:
          TanreiChipCrossShape().stroke(style: stroke)
        }
      }
    }
    .frame(width: context.size, height: context.size)
    .environment(\.layoutDirection, .leftToRight)
    .accessibilityHidden(true)
  }
}

/// A close glyph: two strokes as ONE path in fractions of the box, so a translucent color is laid down once where they
/// cross, as a font's glyph is. The shape of a glyph, not a design value (as `TanreiCheckboxMarkShape`'s points).
struct TanreiChipCrossShape: Shape {
  static let near: CGFloat = 0.25
  static let far: CGFloat = 0.75

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.move(to: point(Self.near, Self.near))
    path.addLine(to: point(Self.far, Self.far))
    path.move(to: point(Self.far, Self.near))
    path.addLine(to: point(Self.near, Self.far))
    return path
  }
}

// MARK: - Style

struct TanreiChipStyle: ButtonStyle {
  let variant: TanreiChipVariant
  let size: TanreiChipSize
  let look: TanreiChipLook
  let isFocused: Bool
  var keyboardPresses = 0
  var isRemoveHovered = false
  /// Where the chip reports its whole-control opacity, for the remove action drawn over it.
  var opacity: Binding<Double>?

  func makeBody(configuration: Configuration) -> some View {
    TanreiChipChrome(
      variant: variant, size: size, look: look, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses,
      isRemoveHovered: isRemoveHovered, reportsOpacity: opacity
    ) {
      configuration.label
    }
    // CHP-5: the hit area reaches the minimum target on both axes; the visual size does not change.
    .tanreiHitTargetExpansion()
  }
}

/// The visual of the chip itself: its container with the elevation and outline of its state and look, the row colored
/// by the state, and the focus indicator, all drawn from the tokens of the one resolved state.
struct TanreiChipChrome<Content: View>: View {
  let variant: TanreiChipVariant
  let size: TanreiChipSize
  let look: TanreiChipLook
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (CHP-8).
  var keyboardPresses = 0
  /// CHP-20: the pointer is on the remove action — the chip itself is not hovered then.
  var isRemoveHovered = false
  var reportsOpacity: Binding<Double>?
  @ViewBuilder let content: Content

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // CHP-8: a press stays visible at least `duration.press-hold`; CHP-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.chip
    // CHP-3: exactly one state — pressed > focused > hovered; CHP-6: disabled is a state too. SwiftUI focus is keyboard
    // focus (CHP-4). CHP-20: a pointer on the remove action does not hover the chip.
    let hovered = isHovered && !isRemoveHovered
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: hovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: hovered)
    let appearance = TanreiChipAppearance(tokens: tokens, variant: variant, look: look, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    return content
      // CHP-12, CHP-14, CHP-17: the label and the icon (and the check) in the colors of the look and state.
      .environment(\.tanreiChipRowColors, TanreiChipRowColors(label: appearance.label, icon: appearance.icon))
      // CHP-16: the outline `outline.width` wide inside the edge; CHP-10: the corners ease by the corner smoothing;
      // CHP-24: the elevation of the state and look, cast outside the container.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
          outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity))
      // CHP-24: a change of state over the state motion; CHP-13: a change of selection over the selection motion.
      .tanreiSelectionAnimation(tokens.motion(reduceMotion: reduceMotion), condition: look, state: state)
      // CHP-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius)
      .onHover { isHovered = $0 }
      .onChange(of: appearance.opacity, initial: true) { _, opacity in reportsOpacity?.wrappedValue = opacity }
  }
}

// MARK: - The remove action (CHP-18, CHP-20, CHP-21)

struct TanreiChipRemoveStyle: ButtonStyle {
  let variant: TanreiChipVariant
  let geometry: TanreiChipRemoveGeometry
  let isFocused: Bool
  var keyboardPresses = 0
  /// The chip's own whole-control opacity (its `dim` press), which reaches the glyph drawn over it.
  var chipOpacity = TanreiIdentity.opacity
  /// Where the remove action reports that the pointer is on it (CHP-20).
  var isHovered: Binding<Bool>?

  func makeBody(configuration: Configuration) -> some View {
    TanreiChipRemoveChrome(
      variant: variant, geometry: geometry, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses,
      chipOpacity: chipOpacity, reportsHover: isHovered)
  }
}

/// The remove action: its hit area (CHP-21) — at least the minimum target on both axes, reaching from the glyph toward
/// the label no further than the gap before it, and outward past the chip — and inside it, centred on the glyph, the
/// round container with the close glyph, drawn from the remove parts of ITS OWN state (CHP-20), with its own ripple
/// (from the container's centre for a press outside it), dim and focus ring.
struct TanreiChipRemoveChrome: View {
  let variant: TanreiChipVariant
  let geometry: TanreiChipRemoveGeometry
  let isPressed: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  var chipOpacity = TanreiIdentity.opacity
  var reportsHover: Binding<Bool>?

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.chip
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiChipRemoveAppearance(tokens: tokens, variant: variant, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }
    let visual = TanreiChipGlyph(kind: .close)
      .tanreiIconContext(size: geometry.iconSize, selected: false)
      .foregroundStyle(colors[appearance.glyph])
      .frame(width: geometry.containerSize, height: geometry.containerSize)
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: geometry.cornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
      .tanreiContactArea()
      .opacity(chipOpacity)
      .animation(tokens.motion(reduceMotion: reduceMotion).state, value: state)
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: geometry.cornerRadius)

    return Color.clear
      .frame(width: geometry.hitWidth, height: geometry.hitHeight)
      .overlay(alignment: .leading) {
        visual.padding(.leading, geometry.inward - geometry.containerSize / 2)
      }
      .contentShape(.interaction, Rectangle())
      .onHover { hovering in
        isHovered = hovering
        reportsHover?.wrappedValue = hovering
      }
  }
}

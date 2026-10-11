import SwiftUI

// Spec: specs/switch.spec.json — tokens: TanreiSwitchTokens (comp.switch), read from the design system in the
// environment (`system.switch`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. Press, hold, ripple, focus ring, hit target, the round container, the elevation of the
// handle and the icon slot are the shared primitives: SWT-5, SWT-7, SWT-8 and SWT-9 are BTN-5, BTN-8,
// BTN-9 and BTN-10 for this component. The label row, `.labelsHidden()` and the two motions are the selection controls'
// (`TanreiSelectionControl.swift`).

/// Turns one setting on or off, with an immediate effect.
///
///     @State private var wifi = true
///     TanreiSwitch("Wi-Fi", isOn: $wifi)
///     TanreiSwitch("Wi-Fi", isOn: $wifi, selectedIcon: "check", unselectedIcon: "close")   // glyphs of the icon font
///     TanreiSwitch("Wi-Fi", isOn: $wifi) { Image(systemName: "checkmark") } unselectedIcon: { EmptyView() }
///     TanreiSwitch("Wi-Fi", isOn: $wifi).labelsHidden()                                  // a list row names it
///
/// Drawn by Tanrei, not by SwiftUI's `Toggle`: the label follows the track (at its inline end), as the spec says; a row
/// that wants the label first is a list item's layout. Activation flips `isOn` (the spec's `change`). The title is the
/// accessible name, visible or not (`.labelsHidden()`, honoured from iOS 18 / macOS 15). The icons are decorative: on and
/// off are announced from the state. `disabled` follows SwiftUI's `.disabled(_:)`.
public struct TanreiSwitch<SelectedIcon: View, UnselectedIcon: View>: View {
  private let title: TanreiControlTitle
  private let isOn: Binding<Bool>
  private let icons: TanreiSwitchIcons<SelectedIcon, UnselectedIcon>

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (SWT-7).
  @State private var keyboardPresses = 0

  private init(title: TanreiControlTitle, isOn: Binding<Bool>, icons: TanreiSwitchIcons<SelectedIcon, UnselectedIcon>) {
    self.title = title
    self.isOn = isOn
    self.icons = icons
  }

  /// A switch whose handle shows `selectedIcon` while on and `unselectedIcon` while off (SWT-12). Pass `EmptyView()` for
  /// a position that shows none.
  public init<S: StringProtocol>(
    _ title: S, isOn: Binding<Bool>, @ViewBuilder selectedIcon: () -> SelectedIcon, @ViewBuilder unselectedIcon: () -> UnselectedIcon
  ) {
    self.init(title: TanreiControlTitle(title, component: "switch", behavior: "SWT-16"), isOn: isOn, icons: TanreiSwitchIcons(selected: selectedIcon(), unselected: unselectedIcon()))
  }

  /// A switch with a localized title and icons.
  public init(
    _ titleKey: LocalizedStringKey, isOn: Binding<Bool>, @ViewBuilder selectedIcon: () -> SelectedIcon, @ViewBuilder unselectedIcon: () -> UnselectedIcon
  ) {
    self.init(title: TanreiControlTitle(titleKey, component: "switch", behavior: "SWT-16"), isOn: isOn, icons: TanreiSwitchIcons(selected: selectedIcon(), unselected: unselectedIcon()))
  }

  public var body: some View {
    let condition = self.condition
    return TanreiLabelsVisibilityReader { labelsHidden in
      let label = title.drawn(labelsHidden: labelsHidden)
      // SWT-5: the hidden sizing copy keeps layout at the visual size (the track and the label) while the real button,
      // centred over it, is laid out at least at the minimum target on both axes.
      TanreiMinimumHitTarget {
        // The handle takes no room in layout (it lies inside the track), so the sizing copy draws none of its icons.
        TanreiSwitchChrome(condition: condition, icons: TanreiSwitchIcons(selected: EmptyView(), unselected: EmptyView()), label: label, isPressed: false, isFocused: false)
      } control: {
        Button(action: { activate(isEnabled: isEnabled) }) { title.text }
          .buttonStyle(TanreiSwitchStyle(condition: condition, icons: icons, label: label, isFocused: isFocused, keyboardPresses: keyboardPresses))
          .focused($isFocused)
          // Tanrei draws its own ring (SWT-4); the system focus effect would double it.
          .focusEffectDisabled()
          // SWT-1 / SWT-7: Space activates, once per key press, and shows the press from the center. Enter is left to the
          // platform: iOS and macOS do not activate a focused control with it.
          .tanreiKeyActivation(isEnabled: isEnabled, keys: TanreiActivationKeys.selection) {
            keyboardPresses += 1
            activate(isEnabled: isEnabled)
          }
          // SWT-16: the title is the name, visible or not; the drawn text is not a second element.
          .accessibilityLabel(title.text)
          // SWT-14: a switch (the toggle trait), on (the selected trait) or off; the icons are hidden.
          .accessibilityAddTraits(Self.accessibilityTraits(isOn: isOn.wrappedValue))
      }
    }
  }

  /// SWT-10: the condition — selected while on.
  var condition: TanreiSwitchCondition { isOn.wrappedValue ? .selected : .unselected }

  /// SWT-14: a switch to assistive technology — the toggle trait, which iOS announces as a switch with on / off — and on
  /// while selected (the selected trait).
  static func accessibilityTraits(isOn: Bool) -> AccessibilityTraits {
    isOn ? [.isToggle, .isSelected] : .isToggle
  }

  /// The single route to `isOn` (SWT-1, SWT-2): one call flips it once, and never while disabled.
  func activate(isEnabled: Bool) {
    guard isEnabled else { return }
    isOn.wrappedValue.toggle()
  }
}

extension TanreiSwitch where SelectedIcon == EmptyView, UnselectedIcon == EmptyView {
  /// A switch whose handle shows no icon.
  public init<S: StringProtocol>(_ title: S, isOn: Binding<Bool>) {
    self.init(title, isOn: isOn, selectedIcon: { EmptyView() }, unselectedIcon: { EmptyView() })
  }

  /// A switch with a localized title and no icon.
  public init(_ titleKey: LocalizedStringKey, isOn: Binding<Bool>) {
    self.init(titleKey, isOn: isOn, selectedIcon: { EmptyView() }, unselectedIcon: { EmptyView() })
  }
}

extension TanreiSwitch where SelectedIcon == TanreiIconGlyph, UnselectedIcon == TanreiIconGlyph {
  /// A switch whose handle shows glyphs of the design system's icon font by name: `selectedIcon` while on,
  /// `unselectedIcon` while off; an empty name shows none (SWT-12).
  public init<S: StringProtocol>(_ title: S, isOn: Binding<Bool>, selectedIcon: String, unselectedIcon: String = "") {
    self.init(
      title: TanreiControlTitle(title, component: "switch", behavior: "SWT-16"), isOn: isOn,
      icons: TanreiSwitchIcons(glyphs: selectedIcon, unselectedIcon))
  }

  /// A switch with a localized title and glyphs of the icon font.
  public init(_ titleKey: LocalizedStringKey, isOn: Binding<Bool>, selectedIcon: String, unselectedIcon: String = "") {
    self.init(
      title: TanreiControlTitle(titleKey, component: "switch", behavior: "SWT-16"), isOn: isOn,
      icons: TanreiSwitchIcons(glyphs: selectedIcon, unselectedIcon))
  }
}

/// SWT-12 — the two icons of a handle, and whether each position shows one: `EmptyView`, an `if` with no match, or an
/// empty glyph name shows none.
struct TanreiSwitchIcons<Selected: View, Unselected: View> {
  let selected: Selected
  let unselected: Unselected
  let hasSelected: Bool
  let hasUnselected: Bool

  init(selected: Selected, unselected: Unselected) {
    self.selected = selected
    self.unselected = unselected
    hasSelected = !TanreiSlotContent.isEmpty(selected)
    hasUnselected = !TanreiSlotContent.isEmpty(unselected)
  }

  /// Whether the handle of `condition` shows an icon.
  func shows(_ condition: TanreiSwitchCondition) -> Bool {
    condition == .selected ? hasSelected : hasUnselected
  }
}

extension TanreiSwitchIcons where Selected == TanreiIconGlyph, Unselected == TanreiIconGlyph {
  @MainActor
  init(glyphs selected: String, _ unselected: String) {
    self.selected = TanreiIconGlyph(selected)
    self.unselected = TanreiIconGlyph(unselected)
    hasSelected = !selected.isEmpty
    hasUnselected = !unselected.isEmpty
  }
}

// MARK: - Token bindings

extension TanreiSwitchTokens {
  /// How the SWT-8 ripple grows: over `comp.switch.motion.feedback-duration`, with the state easing. `nil` under
  /// Reduce Motion — the layer appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SWT-3 / SWT-13: the state motion and the selection motion (the handle's travel).
  func motion(reduceMotion: Bool) -> TanreiSelectionMotion {
    TanreiSelectionMotion(
      stateDuration: motionStateDuration, stateEasing: motionStateEasing, selectionDuration: motionSelectionDuration,
      selectionEasing: motionSelectionEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values a switch draws for one condition × state. Pure data read from a `TanreiSwitchTokens`, so the
/// bindings can be tested without rendering. SWT-3 / SWT-6: every state, disabled included, is drawn from that
/// condition's tokens in that state; SWT-10 / SWT-12: the geometry.
struct TanreiSwitchAppearance: Equatable {
  /// The round state layer on the handle.
  let container: TanreiPaint
  let track: TanreiPaint
  let outline: TanreiPaint
  let handle: TanreiPaint
  let icon: TanreiPaint
  let label: TanreiPaint
  /// SWT-8 `ripple`: the pressed container paint of the condition, drawn as a layer that grows over `container`.
  let ripple: TanreiPaint?
  /// Opacity of the whole control (track, handle, container and label).
  let opacity: Double
  let containerCornerRadius: CGFloat
  let containerSize: CGFloat
  let trackWidth: CGFloat
  let trackHeight: CGFloat
  let trackCornerRadius: CGFloat
  let outlineWidth: CGFloat
  /// SWT-12: the larger of the state's handle size and `handle.size-with-icon` while an icon is shown.
  let handleSize: CGFloat
  let handleElevation: [TanreiShadowLayer]
  let iconSize: CGFloat
  /// SWT-10: the handle sits at the inline end while selected.
  let handleAtEnd: Bool
  /// SWT-12: the icon's family and fill are the selected state's while selected.
  let iconSelected: Bool
  let labelGap: CGFloat
  let labelTypescale: TanreiTextStyle

  init(
    tokens: TanreiSwitchTokens,
    condition: TanreiSwitchCondition,
    state: TanreiInteraction,
    showsIcon: Bool = false,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // The condition lookup is total: a condition this system does not have reads `unselected` (and is reported).
    let conditionTokens = tokens.conditions[condition]
    let own = conditionTokens[state: layers.state]
    container = conditionTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { conditionTokens[state: $0].containerColor }
    track = own.trackColor
    outline = own.outlineColor
    handle = own.handleColor
    icon = own.iconColor
    label = own.labelColor
    handleSize = showsIcon ? max(own.handleSize, tokens.handleSizeWithIcon) : own.handleSize
    handleElevation = own.handleElevation

    let shared = tokens[state: layers.state]
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    containerCornerRadius = shared?.containerShape ?? tokens.containerShape
    containerSize = tokens.containerSize
    trackWidth = tokens.trackWidth
    trackHeight = tokens.trackHeight
    trackCornerRadius = tokens.trackShape
    outlineWidth = tokens.outlineWidth
    iconSize = tokens.iconSize
    let selected = condition == .selected
    handleAtEnd = selected
    iconSelected = selected
    labelGap = tokens.labelGap
    labelTypescale = tokens.labelTypescale
  }
}

// MARK: - Style

struct TanreiSwitchStyle<SelectedIcon: View, UnselectedIcon: View>: ButtonStyle {
  let condition: TanreiSwitchCondition
  let icons: TanreiSwitchIcons<SelectedIcon, UnselectedIcon>
  let label: Text?
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiSwitchChrome(
      condition: condition, icons: icons, label: label, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses
    )
    // SWT-5: the hit area — the whole track and the label — reaches the minimum target on both axes.
    .tanreiHitTargetExpansion()
  }
}

/// The visual: the track with its outline, the handle with its icon and the round state layer that moves with it, and
/// the label, drawn from the tokens of the one resolved state of the condition.
struct TanreiSwitchChrome<SelectedIcon: View, UnselectedIcon: View>: View {
  let condition: TanreiSwitchCondition
  let icons: TanreiSwitchIcons<SelectedIcon, UnselectedIcon>
  let label: Text?
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (SWT-7).
  var keyboardPresses = 0

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // SWT-7: a press stays visible at least `duration.press-hold`; SWT-8: the point of contact is measured in the round
    // container on the handle, so a press elsewhere (the track's far end, the label) grows the ripple from its center.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple, contactArea: .part) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.switch
    // SWT-3: exactly one state — pressed > focused > hovered; SWT-6: disabled is a state too. SwiftUI focus is keyboard
    // focus, so neither the focused state nor the ring (SWT-4) appears for pointer or touch input.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let showsIcon = icons.shows(condition)
    let appearance = TanreiSwitchAppearance(
      tokens: tokens, condition: condition, state: state, showsIcon: showsIcon, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    // SWT-12: the icon of the position, centered in the handle at `icon.size`, in the icon font of the condition.
    let icon = TanreiIconSlot(size: appearance.iconSize) {
      // SWT-14: the icon is never announced; on and off come from the state.
      if condition == .selected {
        if icons.hasSelected { icons.selected.accessibilityHidden(true) }
      } else if icons.hasUnselected {
        icons.unselected.accessibilityHidden(true)
      }
    }
    .tanreiIconContext(size: appearance.iconSize, selected: appearance.iconSelected)
    .foregroundStyle(colors[appearance.icon])
    .frame(height: appearance.iconSize)

    // The handle and, centered on it, the round state layer — it may extend beyond the track without
    // affecting layout. The handle's center is half the track height from the end it sits at (SWT-10).
    let handle = Color.clear
      .frame(width: appearance.containerSize, height: appearance.containerSize)
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.containerCornerRadius,
          outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: TanreiIdentity.opacity))
      .tanreiContactArea()
      .overlay {
        icon
          .frame(width: appearance.handleSize, height: appearance.handleSize)
          .background { TanreiElevationSurface(appearance.handleElevation, fill: colors[appearance.handle], cornerRadius: appearance.handleSize / 2) }
      }
      .frame(width: appearance.trackHeight, height: appearance.trackHeight)

    // SWT-10: the track, its outline inside its edge and its fill inside the outline; SWT-9: its corners ease by the
    // corner smoothing. SWT-11: `.leading` / `.trailing` mirror in a right-to-left layout, so the handle does too.
    let control = TanreiInsetOutlinedShape(
      cornerRadius: appearance.trackCornerRadius, fill: colors[appearance.track], outline: colors[appearance.outline], outlineWidth: appearance.outlineWidth
    )
    .frame(width: appearance.trackWidth, height: appearance.trackHeight)
    .overlay(alignment: appearance.handleAtEnd ? .trailing : .leading) { handle }
    .compositingGroup()
    .opacity(appearance.opacity)
    // SWT-4: around the track, shown for keyboard focus, never animated and never dimmed by a state's opacity.
    .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.trackCornerRadius)

    // SWT-15: the label at the track's inline end, the control centered on its first line.
    return TanreiLabelledControl(
      label: label, gap: appearance.labelGap, style: appearance.labelTypescale, color: colors[appearance.label],
      opacity: appearance.opacity, controlHeight: appearance.trackHeight
    ) {
      control
    }
    // SWT-13: the handle travels, resizes and recolors over the selection motion; SWT-3: a state over the state motion.
    .tanreiSelectionAnimation(tokens.motion(reduceMotion: reduceMotion), condition: condition, state: state)
    .onHover { isHovered = $0 }
  }
}

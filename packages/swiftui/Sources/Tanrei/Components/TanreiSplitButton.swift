import SwiftUI

// Spec: specs/split-button.spec.json — tokens: TanreiSplitButtonTokens (comp.split-button), read from the design system in
// the environment (`system.splitButton`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here.
//
// Two halves, each a SwiftUI `Button` with Button's chain (SPB-9, SPB-10 and SPB-11 are BTN-8, BTN-9 and
// BTN-10 for the half): press, hold, ripple, focus ring, container layers, eased corners, from the shared primitives, and
// its OWN interaction state. Their corners are the per-side corners of the button group's joined items
// (`TanreiSideCorners`, `TanreiSideRoundedRectangle`), their hit areas the group's (`TanreiJoinedHitLayout`: outward and
// above and below to the target, toward the other half only to the middle of the gap), and each is drawn at the height of
// the row through the same channel (`TanreiButtonTarget`, `tanreiJoinedSize`). The menu is the Tanrei Menu
// (`.tanreiMenu(isPresented:placement:content:)`), presented from the trailing half at `bottom-end`.

/// Performs a main action with one press, and offers related actions in a menu from a second, joined button beside it
/// (spec `split-button`).
///
///     @State private var showsSaveOptions = false
///
///     TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: $showsSaveOptions, action: save) {
///       TanreiMenuItem("Save as…", action: saveAs)
///       TanreiMenuItem("Save a copy", action: saveCopy)
///     }
///     TanreiSplitButton("Save", icon: "save", menuLabel: "More save options", isMenuPresented: $showsSaveOptions, variant: .outlined,
///                       action: save) { … }
///     TanreiSplitButton("Save", icon: { Image(systemName: "square.and.arrow.down") }, menuLabel: "More save options",
///                       isMenuPresented: $showsSaveOptions, action: save) { … }
///
/// The leading half performs `action` (the spec's `click`) and never opens or closes the menu. The trailing half — named by
/// `menuLabel` — writes the opposite of `isMenuPresented` (the spec's `toggle`; Down Arrow on it opens a closed menu), and the
/// menu writes `false` when it asks to close (the spec's `close`: Escape, Tab, a press outside, an item chosen — after the
/// item's own action). The view builder is the menu's content, the menu's own item kinds: `TanreiMenuItem`,
/// `TanreiMenuToggle`, `TanreiMenuSection` with `TanreiMenuOption`s. `disabled` follows `.disabled(_:)`: both halves are
/// disabled, no menu is presented and the closed form is drawn, whatever `isMenuPresented` says.
public struct TanreiSplitButton<Icon: View, MenuContent: View>: View {
  let title: Text
  let titleIsEmpty: Bool
  let menuLabel: Text
  let menuLabelIsEmpty: Bool
  let isMenuPresented: Binding<Bool>
  let variant: TanreiSplitButtonVariant
  let size: TanreiSplitButtonSize
  let action: @MainActor () -> Void
  let icon: Icon
  let menu: MenuContent
  /// SPB-20: whether an empty menu slot is reported. Not for a fixture (`init(fixture:…)`), whose menu slot cannot be
  /// filled (SPB-15).
  let reportsEmptyMenu: Bool

  init(
    title: Text, titleIsEmpty: Bool, menuLabel: Text, menuLabelIsEmpty: Bool, isMenuPresented: Binding<Bool>, variant: TanreiSplitButtonVariant,
    size: TanreiSplitButtonSize, action: @escaping @MainActor () -> Void, icon: Icon, menu: MenuContent, reportsEmptyMenu: Bool
  ) {
    self.title = title
    self.titleIsEmpty = titleIsEmpty
    self.menuLabel = menuLabel
    self.menuLabelIsEmpty = menuLabelIsEmpty
    self.isMenuPresented = isMenuPresented
    self.variant = variant
    self.size = size
    self.action = action
    self.icon = icon
    self.menu = menu
    self.reportsEmptyMenu = reportsEmptyMenu
  }

  /// A split button whose leading half holds an icon before its title.
  public init<S: StringProtocol, M: StringProtocol>(
    _ title: S,
    @ViewBuilder icon: () -> Icon,
    menuLabel: M,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(
      title: Text(title), titleIsEmpty: TanreiSplitButtonRules.isBlank(title), menuLabel: Text(menuLabel),
      menuLabelIsEmpty: TanreiSplitButtonRules.isBlank(menuLabel), isMenuPresented: isMenuPresented, variant: variant, size: size, action: action,
      icon: icon(), menu: menu(), reportsEmptyMenu: true)
  }

  /// A split button with a localized title and menu label, and an icon before the title.
  public init(
    _ titleKey: LocalizedStringKey,
    @ViewBuilder icon: () -> Icon,
    menuLabel: LocalizedStringKey,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(
      title: Text(titleKey), titleIsEmpty: titleKey == "", menuLabel: Text(menuLabel), menuLabelIsEmpty: menuLabel == "",
      isMenuPresented: isMenuPresented, variant: variant, size: size, action: action, icon: icon(), menu: menu(), reportsEmptyMenu: true)
  }

  public var body: some View {
    // SPB-15, SPB-20: the menu slot is read as the menu reads it, so whether it holds an item is known on the first pass.
    _VariadicView.Tree(TanreiSplitButtonMenuReader(button: self)) { menu }
      // A split button is not an item of a button group, and its halves read no group's place.
      .tanreiOutsideJoinedRow()
  }
}

extension TanreiSplitButton where Icon == EmptyView {
  /// A split button whose leading half holds its title only.
  public init<S: StringProtocol, M: StringProtocol>(
    _ title: S,
    menuLabel: M,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(title, icon: { EmptyView() }, menuLabel: menuLabel, isMenuPresented: isMenuPresented, variant: variant, size: size, action: action, menu: menu)
  }

  /// A split button with a localized title and menu label.
  public init(
    _ titleKey: LocalizedStringKey,
    menuLabel: LocalizedStringKey,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(
      titleKey, icon: { EmptyView() }, menuLabel: menuLabel, isMenuPresented: isMenuPresented, variant: variant, size: size, action: action, menu: menu)
  }
}

extension TanreiSplitButton where Icon == TanreiIconGlyph {
  /// A split button whose icon is a glyph of the design system's icon font, by name (`"save"`), drawn as `TanreiIconGlyph`.
  public init<S: StringProtocol, M: StringProtocol>(
    _ title: S,
    icon: String,
    menuLabel: M,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(
      title, icon: { TanreiIconGlyph(icon) }, menuLabel: menuLabel, isMenuPresented: isMenuPresented, variant: variant, size: size, action: action,
      menu: menu)
  }

  /// A split button with a localized title and menu label, and a glyph of the icon font by name.
  public init(
    _ titleKey: LocalizedStringKey,
    icon: String,
    menuLabel: LocalizedStringKey,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void,
    @ViewBuilder menu: () -> MenuContent
  ) {
    self.init(
      titleKey, icon: { TanreiIconGlyph(icon) }, menuLabel: menuLabel, isMenuPresented: isMenuPresented, variant: variant, size: size,
      action: action, menu: menu)
  }
}

extension TanreiSplitButton where MenuContent == EmptyView {
  /// A split button drawn as a spec fixture (fixtures and galleries only): its menu slot is empty, as a fixture's must be
  /// (SPB-15), so it presents no menu (SPB-20) — and, unlike a product's empty menu, that is not reported. The trailing half
  /// still writes `isMenuPresented` and draws the open form.
  @_spi(Fixtures)
  public init<S: StringProtocol, M: StringProtocol>(
    fixture title: S,
    @ViewBuilder icon: () -> Icon,
    menuLabel: M,
    isMenuPresented: Binding<Bool>,
    variant: TanreiSplitButtonVariant = .filled,
    size: TanreiSplitButtonSize = .medium,
    action: @escaping @MainActor () -> Void
  ) {
    self.init(
      title: Text(title), titleIsEmpty: TanreiSplitButtonRules.isBlank(title), menuLabel: Text(menuLabel),
      menuLabelIsEmpty: TanreiSplitButtonRules.isBlank(menuLabel), isMenuPresented: isMenuPresented, variant: variant, size: size, action: action,
      icon: icon(), menu: EmptyView(), reportsEmptyMenu: false)
  }
}

// MARK: - The rules

/// What the split button decides from its props and the menu slot, without drawing: pure, so each rule is tested once.
enum TanreiSplitButtonRules {
  /// SPB-20: a name that is empty or only white space names nothing.
  static func isBlank(_ text: some StringProtocol) -> Bool {
    text.allSatisfy(\.isWhitespace)
  }

  /// SPB-7, SPB-13, SPB-20: the trailing half's open form — its open inner corners and the upturned chevron — is drawn
  /// while `isMenuPresented` holds and the split button is enabled, whether or not the menu holds an item.
  static func drawsOpen(isMenuPresented: Bool, isEnabled: Bool) -> Bool {
    isMenuPresented && isEnabled
  }

  /// SPB-3, SPB-15, SPB-20: a menu is presented while `isMenuPresented` holds, the split button is enabled and its menu
  /// slot holds an item.
  static func presentsMenu(isMenuPresented: Bool, isEnabled: Bool, hasItems: Bool) -> Bool {
    drawsOpen(isMenuPresented: isMenuPresented, isEnabled: isEnabled) && hasItems
  }

  /// SPB-15, SPB-16: the binding the menu is presented through: presented as `presentsMenu` says, and closed by the menu —
  /// Escape, Tab, a press outside, an item after its own action — by writing `false` to `isMenuPresented` (SPB-16). While
  /// disabled nothing is written (SPB-3: no close).
  static func menuBinding(_ isMenuPresented: Binding<Bool>, isEnabled: Bool, hasItems: Bool) -> Binding<Bool> {
    Binding(
      get: { presentsMenu(isMenuPresented: isMenuPresented.wrappedValue, isEnabled: isEnabled, hasItems: hasItems) },
      set: { value in if isEnabled { isMenuPresented.wrappedValue = value } })
  }

  /// SPB-2: what the trailing half asks for when it is activated — the opposite of `isMenuPresented`.
  static func toggled(_ isMenuPresented: Bool) -> Bool {
    !isMenuPresented
  }

  /// SPB-2: Down Arrow on the trailing half opens a closed menu; on an open one, or disabled, it is not the split button's.
  static func opensOnDownArrow(isMenuPresented: Bool, isEnabled: Bool) -> Bool {
    isEnabled && !isMenuPresented
  }

  /// SPB-20: what a debug build reports — a half without a name, and an empty menu slot.
  static func problems(titleIsEmpty: Bool, menuLabelIsEmpty: Bool, hasItems: Bool, reportsEmptyMenu: Bool) -> [String] {
    var problems: [String] = []
    if titleIsEmpty {
      problems.append("Tanrei: a split button's title is empty, so its leading half has no accessible name (SPB-20); give it a title")
    }
    if menuLabelIsEmpty {
      problems.append(
        "Tanrei: a split button's menuLabel is empty, so its trailing half has no accessible name (SPB-20); say what the menu offers (\"More save options\")")
    }
    if !hasItems && reportsEmptyMenu {
      problems.append(
        "Tanrei: a split button's menu holds no item, so the trailing half toggles but no menu is presented (SPB-20); give it TanreiMenuItem, TanreiMenuToggle or TanreiMenuSection content")
    }
    return problems
  }

  /// SPB-6: how far a half's hit area may reach sideways — without limit outward, past the split button's start edge for
  /// the leading half and its end edge for the trailing half, and toward the other half to the middle of the gap. Only the
  /// reach of the place is read (`TanreiJoinedHitLayout`); the split button draws its own corners.
  static func hitPlace(_ half: TanreiSplitButtonHalf, gap: CGFloat) -> TanreiJoinedPlace {
    TanreiJoinedPlace(
      isConnected: false, innerLeading: false, innerTrailing: false, innerRadius: .zero, minimumWidth: .zero,
      reachLeading: half == .leading ? .infinity : gap / 2, reachTrailing: half == .leading ? gap / 2 : .infinity)
  }
}

/// Which half of the split button.
enum TanreiSplitButtonHalf: Equatable, Sendable {
  /// The main action: the icon and the title.
  case leading
  /// The menu button: the chevron.
  case trailing
}

// MARK: - Token bindings

extension TanreiSplitButtonTokens {
  /// SPB-18: a change of state over `motion.state-duration` with `motion.state-easing`; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SPB-10: the ripple grows over `motion.feedback-duration` with the state easing; `nil` under Reduce Motion — it
  /// appears whole.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SPB-13: the trailing half's inner corners and the chevron's half turn over `motion.open-duration` with
  /// `motion.open-easing`; `nil` under Reduce Motion — they change at once.
  func openMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionOpenDuration, easing: motionOpenEasing, reduceMotion: reduceMotion)
  }
}

/// Which token values one half draws for a variant × size × state, open or closed. Pure data read from a
/// `TanreiSplitButtonTokens`, so the bindings can be tested without rendering. SPB-4 / SPB-7: every state, disabled
/// included, is drawn from that state's tokens of the variant; SPB-8: both lookups are total.
struct TanreiSplitButtonAppearance: Equatable {
  let container: TanreiPaint
  /// The label, the icon and the chevron.
  let label: TanreiPaint
  let outline: TanreiPaint
  let elevation: [TanreiShadowLayer]
  /// Opacity of the whole half.
  let opacity: Double
  /// SPB-13: the outer corners — the leading half's start corners, the trailing half's end corners — of the state.
  let outerRadius: CGFloat
  /// SPB-13: the half's corners by side: outer, and `inner-shape` (the trailing half's `inner-shape-open` while open)
  /// where the halves meet.
  let corners: TanreiSideCorners
  /// A minimum: the half grows with its label (SPB-12, SPB-14).
  let height: CGFloat
  let paddingStart: CGFloat
  let paddingEnd: CGFloat
  let paddingBlock: CGFloat
  let labelTypescale: TanreiTextStyle
  /// The icon's and the chevron's box.
  let iconSize: CGFloat
  /// Between the icon and the label.
  let gap: CGFloat
  let outlineWidth: CGFloat
  /// SPB-10 `ripple`: the pressed container paint, grown from the point of contact over `container`. `nil` otherwise.
  let ripple: TanreiPaint?

  /// - Parameters:
  ///   - feedback: `sys.behavior.pressed-feedback`; it matters only while `state` is `.pressed` (SPB-10).
  ///   - beneath: the state the half would be in without the press: what is drawn where the choice says the press draws
  ///     nothing.
  ///   - isOpen: the trailing half's open form (`TanreiSplitButtonRules.drawsOpen`).
  init(
    tokens: TanreiSplitButtonTokens,
    variant: TanreiSplitButtonVariant,
    size: TanreiSplitButtonSize,
    half: TanreiSplitButtonHalf,
    state: TanreiInteraction,
    hasIcon: Bool = false,
    isOpen: Bool = false,
    feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].containerColor
    ripple = layers.ripple.map { variantTokens[state: $0].containerColor }
    label = own.labelColor
    outline = own.outlineColor
    elevation = own.containerElevation

    let shared = tokens[state: layers.state]
    // The vocabulary has no rest-state `opacity` token: a half at rest is not dimmed.
    opacity = shared?.opacity ?? TanreiIdentity.opacity
    let outer = shared?.containerShape ?? tokens.containerShape
    outerRadius = outer
    switch half {
    case .leading:
      corners = TanreiSideCorners(leading: outer, trailing: tokens.containerInnerShape)
    case .trailing:
      corners = TanreiSideCorners(leading: isOpen ? tokens.containerInnerShapeOpen : tokens.containerInnerShape, trailing: outer)
    }

    let metrics = tokens.sizes[size]
    height = metrics.containerHeight
    switch half {
    case .leading:
      paddingStart = hasIcon ? metrics.leadingPaddingInlineStartWithIcon : metrics.leadingPaddingInlineStart
      paddingEnd = metrics.leadingPaddingInlineEnd
    case .trailing:
      paddingStart = metrics.trailingPaddingInline
      paddingEnd = metrics.trailingPaddingInline
    }
    paddingBlock = metrics.containerPaddingBlock
    labelTypescale = metrics.labelTypescale
    iconSize = metrics.iconSize
    gap = metrics.containerGap
    outlineWidth = metrics.outlineWidth
  }
}

// MARK: - Content

/// Reads the menu slot — every item's and section's trait, as `TanreiMenu` reads it — and draws the split button knowing
/// whether the slot holds an item (SPB-15, SPB-20). The items are not drawn here; the menu draws them when it is presented.
private struct TanreiSplitButtonMenuReader<Icon: View, MenuContent: View>: _VariadicView_UnaryViewRoot {
  let button: TanreiSplitButton<Icon, MenuContent>

  func body(children: _VariadicView.Children) -> some View {
    let parts = children.map { TanreiMenuPart(entry: $0[TanreiMenuEntryKey.self], section: $0[TanreiMenuSectionKey.self], title: $0[TanreiMenuTitleKey.self]) }
    return TanreiSplitButtonRow(button: button, hasItems: !TanreiMenuContent(parts: parts).entries.isEmpty)
  }
}

/// The two halves in one row, and the menu (SPB-12, SPB-15, SPB-17).
private struct TanreiSplitButtonRow<Icon: View, MenuContent: View>: View {
  let button: TanreiSplitButton<Icon, MenuContent>
  let hasItems: Bool

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    // SPB-20: still drawn and working; a debug build reports what is missing.
    let problems = TanreiSplitButtonRules.problems(
      titleIsEmpty: button.titleIsEmpty, menuLabelIsEmpty: button.menuLabelIsEmpty, hasItems: hasItems, reportsEmptyMenu: button.reportsEmptyMenu)
    if !problems.isEmpty {
      let _ = problems.forEach { TanreiDiagnostics.report($0) }
    }
    let binding = button.isMenuPresented
    let isOpen = TanreiSplitButtonRules.drawsOpen(isMenuPresented: binding.wrappedValue, isEnabled: isEnabled)
    // SPB-3, SPB-15, SPB-20: the menu is presented only while enabled and holding an item. Only the menu writes through
    // here (SPB-16: it closes itself), and never while disabled (SPB-3: no close).
    let presented = TanreiSplitButtonRules.menuBinding(binding, isEnabled: isEnabled, hasItems: hasItems)
    let hasIcon = !TanreiSlotContent.isEmpty(button.icon)
    let iconSize = system.splitButton.sizes[button.size].iconSize

    TanreiSplitButtonLayout(gap: system.splitButton.containerInnerGap) {
      // SPB-1, SPB-17: the leading half, a button named by its title.
      TanreiSplitButtonHalfButton(half: .leading, variant: button.variant, size: button.size, hasIcon: hasIcon, isOpen: false, activate: button.action) {
        HStack(spacing: system.splitButton.sizes[button.size].containerGap) {
          if hasIcon {
            // SPB-14: in the label color, at the icon size, through the icon helper (unselected); width in the row, no
            // height (`TanreiIconSlot`); decorative (SPB-17).
            TanreiIconSlot(size: iconSize) { button.icon.tanreiIconContext(size: iconSize, selected: false) }
          }
          TanreiButtonTitle(title: button.title, words: nil, typescale: system.splitButton.sizes[button.size].labelTypescale)
        }
      }
      // SPB-2, SPB-17: the trailing half, a button named by menuLabel; it asks for the opposite of the open value.
      TanreiSplitButtonHalfButton(
        half: .trailing, variant: button.variant, size: button.size, hasIcon: false, isOpen: isOpen, name: button.menuLabel,
        activate: { binding.wrappedValue = TanreiSplitButtonRules.toggled(binding.wrappedValue) },
        downArrow: {
          // SPB-2: Down Arrow on a closed menu's trailing half opens it.
          guard TanreiSplitButtonRules.opensOnDownArrow(isMenuPresented: binding.wrappedValue, isEnabled: isEnabled) else { return false }
          binding.wrappedValue = true
          return true
        }
      ) {
        TanreiIconSlot(size: iconSize) { TanreiSplitButtonChevron(isOpen: isOpen, size: iconSize) }
      }
      // SPB-15: the Tanrei Menu, end-aligned below. It is attached to the trailing half: its bottom end is the split
      // button's (the halves are one height and the trailing half ends the row, on either side), so the menu sits where
      // the whole split button places it — and the trailing half is where focus returns when it closes (MNU-1).
      .tanreiMenu(isPresented: presented, placement: .bottomEnd) { button.menu }
    }
  }
}

/// SPB-12, SPB-19: the leading half, then the trailing half, `gap` apart between their visible bounds, from the leading
/// edge — SwiftUI mirrors the placement in a right-to-left layout, so the trailing half is on the left there. The leading
/// half is as wide as its content, or what is left when the row is given less (its label wraps); the trailing half is its
/// chevron and padding; both are as tall as the taller one (a wrapped label or larger text grows them together).
struct TanreiSplitButtonLayout: Layout {
  let gap: CGFloat

  private func sizes(_ subviews: Subviews, width available: CGFloat?) -> (leading: CGSize, trailing: CGSize, height: CGFloat) {
    guard subviews.count == 2 else { return (.zero, .zero, .zero) }
    let trailing = subviews[1].sizeThatFits(.unspecified)
    let natural = subviews[0].sizeThatFits(.unspecified).width
    let width = available.map { min(natural, max(.zero, $0 - gap - trailing.width)) } ?? natural
    let leading = subviews[0].sizeThatFits(ProposedViewSize(width: width, height: nil))
    return (leading, trailing, max(leading.height, trailing.height))
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let row = sizes(subviews, width: proposal.width)
    return CGSize(width: row.leading.width + gap + row.trailing.width, height: row.height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard subviews.count == 2 else { return }
    let row = sizes(subviews, width: bounds.width)
    subviews[0].place(
      at: CGPoint(x: bounds.minX, y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(width: row.leading.width, height: row.height))
    subviews[1].place(
      at: CGPoint(x: bounds.minX + row.leading.width + gap, y: bounds.midY), anchor: .leading,
      proposal: ProposedViewSize(width: row.trailing.width, height: row.height))
  }
}

// MARK: - A half

/// One half: a SwiftUI `Button` (its accessibility semantics are the platform's button's) with the half's chrome, at the
/// height of the row (`TanreiButtonTarget`: a sizing copy lays it out, the control is drawn at the size it was given).
private struct TanreiSplitButtonHalfButton<Label: View>: View {
  let half: TanreiSplitButtonHalf
  let variant: TanreiSplitButtonVariant
  let size: TanreiSplitButtonSize
  let hasIcon: Bool
  let isOpen: Bool
  /// The half's accessible name when its label is not one (the trailing half's `menuLabel`).
  var name: Text? = nil
  let activate: @MainActor () -> Void
  /// Down Arrow on the half: whether it was the split button's.
  var downArrow: (@MainActor () -> Bool)? = nil
  @ViewBuilder let label: Label

  @Environment(\.isEnabled) private var isEnabled
  @FocusState private var isFocused: Bool
  /// Activations by key so far: each one starts a press no pointer held down (SPB-9).
  @State private var keyboardPresses = 0

  var body: some View {
    TanreiButtonTarget(inJoinedRow: true) {
      TanreiSplitButtonChrome(half: half, variant: variant, size: size, hasIcon: hasIcon, isOpen: isOpen, isPressed: false, isFocused: false) { label }
    } control: {
      Button(action: { perform() }) { label }
        .buttonStyle(
          TanreiSplitButtonStyle(half: half, variant: variant, size: size, hasIcon: hasIcon, isOpen: isOpen, isFocused: isFocused, keyboardPresses: keyboardPresses))
        .modifier(TanreiSplitButtonName(name: name))
        .focused($isFocused)
        // Tanrei draws its own ring (SPB-5); the system focus effect would double it.
        .focusEffectDisabled()
        // SPB-1, SPB-2: Enter and Space activate, exactly once per key press, and the press is shown like a pointer's
        // (SPB-9, SPB-10: from the center).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          perform()
        }
        .onKeyPress(.downArrow, phases: .down) { _ in
          guard isEnabled, let downArrow, downArrow() else { return .ignored }
          return .handled
        }
    }
    // A focused half is drawn above the other, so its ring is not covered where they meet.
    .zIndex(isFocused ? 1 : 0)
  }

  /// The single route to the half's event: one call emits once, and never while disabled (SPB-3).
  private func perform() {
    guard isEnabled else { return }
    activate()
  }
}

/// SPB-17: the trailing half is named by `menuLabel` (the chevron is hidden); the leading half by its title, its label.
private struct TanreiSplitButtonName: ViewModifier {
  let name: Text?

  func body(content: Content) -> some View {
    if let name { content.accessibilityLabel(name) } else { content }
  }
}

struct TanreiSplitButtonStyle: ButtonStyle {
  let half: TanreiSplitButtonHalf
  let variant: TanreiSplitButtonVariant
  let size: TanreiSplitButtonSize
  let hasIcon: Bool
  let isOpen: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiSplitButtonChrome(
      half: half, variant: variant, size: size, hasIcon: hasIcon, isOpen: isOpen, isPressed: configuration.isPressed, isFocused: isFocused,
      keyboardPresses: keyboardPresses
    ) {
      configuration.label
    }
    // SPB-6: the target above and below and outward; toward the other half only to the middle of the gap.
    .modifier(TanreiSplitButtonHitTarget(half: half))
  }
}

/// SPB-6: a half's hit area (`TanreiJoinedHitLayout`, the button group's).
private struct TanreiSplitButtonHitTarget: ViewModifier {
  let half: TanreiSplitButtonHalf
  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    content.tanreiJoinedHitTarget(
      TanreiSplitButtonRules.hitPlace(half, gap: system.splitButton.containerInnerGap), minimum: TanreiHitTarget.minimum(in: system.measure))
  }
}

/// The visual of a half: container, outline and focus indicator around its label, all drawn from the tokens of its one
/// resolved state.
struct TanreiSplitButtonChrome<Label: View>: View {
  let half: TanreiSplitButtonHalf
  let variant: TanreiSplitButtonVariant
  let size: TanreiSplitButtonSize
  var hasIcon = false
  var isOpen = false
  let isPressed: Bool
  let isFocused: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it (SPB-9).
  var keyboardPresses = 0
  @ViewBuilder let label: Label

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // SPB-9: a press stays visible at least `duration.press-hold`; SPB-10: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.splitButton
    // SPB-4: this half's one state — pressed > focused > hovered; SPB-7: disabled is a state too. SwiftUI focus is keyboard
    // focus: a click or tap never moves focus to a button, so neither the focused state nor the ring (SPB-5) follows a
    // pointer or a touch.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiSplitButtonAppearance(
      tokens: tokens, variant: variant, size: size, half: half, state: state, hasIcon: hasIcon, isOpen: isOpen, feedback: feedback, beneath: beneath)
    // SPB-10: the ripple grows over `motion.feedback-duration` and fades with the state change; whole under Reduce Motion.
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    return label
      .tanreiFont(appearance.labelTypescale)
      .foregroundStyle(colors[appearance.label])
      // SPB-12, SPB-19: paddings by logical start and end.
      .padding(.leading, appearance.paddingStart)
      .padding(.trailing, appearance.paddingEnd)
      .padding(.vertical, appearance.paddingBlock)
      // SPB-12: at least the size's height, as tall as the row (the sizing copy stretches; the control is drawn at the size
      // it was laid out at).
      .frame(minHeight: appearance.height, maxHeight: .infinity)
      .modifier(TanreiJoinedSizeFrame())
      // SPB-11, SPB-13, SPB-18: the half's own corners, eased by the corner smoothing; its fill, ripple and outline clipped
      // to them; its elevation outside it.
      .modifier(
        TanreiContainerLayers(
          fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.outerRadius, outline: colors[appearance.outline],
          outlineWidth: appearance.outlineWidth, ripple: ripple, opacity: appearance.opacity, sides: appearance.corners))
      .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
      // SPB-13: the open corners over the open motion.
      .animation(tokens.openMotion(reduceMotion: reduceMotion), value: isOpen)
      // SPB-5: around this half's own shape, keyboard focus only, never animated, never dimmed by a state's opacity.
      .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.outerRadius, sides: appearance.corners)
      .onHover { isHovered = $0 }
  }
}

// MARK: - The chevron (SPB-13, SPB-14, SPB-19)

/// The trailing half's glyph: the icon set's `keyboard_arrow_down` through the icon helper, unselected, at the icon size
/// (SPB-14) — without the icon font (or under the platform-font policy), a vector chevron in the same box, stroked at
/// `sys.border.thick` as the chip's drawn glyphs are. It points up while the menu is open, turning half a turn over the open
/// motion (at once under Reduce Motion, SPB-13), and never mirrors (SPB-19). Decorative (SPB-17).
struct TanreiSplitButtonChevron: View {
  /// The icon font's ligature.
  static let glyph = "keyboard_arrow_down"
  /// Half a turn: the chevron of an open menu points up. A geometric constant, not a design value.
  static let openTurn = Angle.degrees(180)

  let isOpen: Bool
  let size: CGFloat

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let context = TanreiIconContext(size: size, selected: false)
    Group {
      if theme.system.icon.slotFont(context, policy: theme.fontFamilyPolicy) != nil {
        TanreiIconGlyph(Self.glyph)
      } else {
        TanreiSplitButtonChevronShape()
          .stroke(style: StrokeStyle(lineWidth: theme.system.measure.borderThick, lineCap: .square, lineJoin: .miter))
      }
    }
    .frame(width: size, height: size)
    .tanreiIconContext(size: size, selected: false)
    .rotationEffect(isOpen ? Self.openTurn : .zero)
    .animation(theme.system.splitButton.openMotion(reduceMotion: reduceMotion), value: isOpen)
    .environment(\.layoutDirection, .leftToRight)
    .accessibilityHidden(true)
  }
}

/// A downward chevron in fractions of its box: the outline of the icon set's `keyboard_arrow_down` (the shape of a glyph,
/// not a design value, as `TanreiChipCrossShape`'s points; Compose draws the same points).
struct TanreiSplitButtonChevronShape: Shape {
  static let side: CGFloat = 0.27
  static let top: CGFloat = 0.39
  static let tip: CGFloat = 0.62

  func path(in rect: CGRect) -> Path {
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.move(to: point(Self.side, Self.top))
    path.addLine(to: point(0.5, Self.tip))
    path.addLine(to: point(1 - Self.side, Self.top))
    return path
  }
}

import SwiftUI

// Spec: specs/fab-menu.spec.json — tokens: TanreiFabMenuTokens (comp.fab-menu), read from the design system in the
// environment (`system.fabMenu`). Every design value in this file comes from a token; there are no literals, and no
// state's look is computed here. The toggle reads the FAB menu's own tokens, not the FAB's, and is built
// from the same pressable pieces as the FAB: press, hold, ripple, focus ring, hit target, container layers and icon slot
// are the shared primitives, so FBM-8, FBM-9 and FBM-10 are BTN-8, BTN-9 and BTN-10 for the toggle and for each item.
//
// Each variant has three looks: the closed toggle (its plain parts), the open toggle (`open.`) and the items
// (`item.`), each in every state. The open menu is an operated overlay that is not modal: the items are
// presented in a popover, as `TanreiMenu` presents its surface, on a clear background; focus moves in when it opens and
// back to the toggle when it closes. The FAB menu reads its items as data (as the menu does):
// each `TanreiFabMenuItem` puts its title, icon and action into a trait of its own view,
// and the FAB menu draws every item itself, so the count, the positions and the stagger order are known on the first pass.

/// Opens a short list of related actions from a floating action button, which turns into the list's close button while
/// they show.
///
///     @State private var showsCreate = false
///     ScrollView { Documents() }
///       .overlay(alignment: .bottomTrailing) {
///         TanreiFabMenu("Create", icon: "add", isPresented: $showsCreate) {
///           TanreiFabMenuItem("Document", icon: "description", action: newDocument)
///           TanreiFabMenuItem("Folder", icon: "create_new_folder", action: newFolder)
///           TanreiFabMenuItem("Upload", icon: .image(Image(systemName: "square.and.arrow.up")), action: upload)
///         }
///         .padding(system.space.space200)
///       }
///
/// `label` names the toggle and the list and is required: an icon alone is not a name (FBM-23 reports an empty one in
/// debug builds). The toggle keeps its name while open. The FAB menu opens and closes itself through `isPresented`
/// (the spec's `toggle` and `close`): a press on the toggle writes the opposite, and Escape, Tab, a press outside and
/// an item's activation (after its action) write `false`. `disabled` follows `.disabled(_:)`: a disabled FAB menu is
/// drawn closed and presents nothing, whatever `isPresented` says.
///
/// FBM-12: it does not position itself. Place it where the screen wants it, as a FAB, typically in an
/// `.overlay(alignment: .bottomTrailing)`; the items are presented above the page and move no content.
public struct TanreiFabMenu<Icon: View, Items: View>: View {
  let label: String
  let variant: TanreiFabMenuVariant
  let size: TanreiFabMenuSize
  let isPresented: Binding<Bool>
  let icon: Icon
  let items: Items
  var isInPlace = false

  /// A FAB menu whose toggle draws any icon view while closed (an SF Symbol, an image).
  public init<S: StringProtocol>(
    _ label: S,
    variant: TanreiFabMenuVariant = .filled,
    size: TanreiFabMenuSize = .medium,
    isPresented: Binding<Bool>,
    @ViewBuilder items: () -> Items,
    @ViewBuilder icon: () -> Icon
  ) {
    // FBM-23: still drawn, but an icon is not a name — reported in debug builds only.
    if label.trimmingCharacters(in: .whitespaces).isEmpty {
      TanreiDiagnostics.report("Tanrei: a FAB menu has an empty label, so the toggle and the list have no accessible name (FBM-23); give it a label (\"Create\")")
    }
    self.label = String(label)
    self.variant = variant
    self.size = size
    self.isPresented = isPresented
    self.items = items()
    self.icon = icon()
  }

  /// The FAB menu drawn in place, for fixtures and documentation (`@_spi(Fixtures)`): while open, its items are drawn
  /// above the toggle in its own layout's overlay — with their elevation, without the popover, the open motion or focus
  /// moving in (FBM-13's verify).
  @_spi(Fixtures)
  public func inPlace() -> Self {
    var menu = self
    menu.isInPlace = true
    return menu
  }

  public var body: some View {
    _VariadicView.Tree(
      TanreiFabMenuRoot(label: label, variant: variant, size: size, isPresented: isPresented, isInPlace: isInPlace, icon: icon)
    ) {
      items
    }
  }
}

extension TanreiFabMenu where Icon == TanreiIconGlyph {
  /// A FAB menu whose toggle draws a glyph of the design system's icon font by name while closed.
  public init<S: StringProtocol>(
    _ label: S,
    icon: String,
    variant: TanreiFabMenuVariant = .filled,
    size: TanreiFabMenuSize = .medium,
    isPresented: Binding<Bool>,
    @ViewBuilder items: () -> Items
  ) {
    self.init(label, variant: variant, size: size, isPresented: isPresented, items: items) { TanreiIconGlyph(icon) }
  }
}

// MARK: - Items

/// One action of a FAB menu (the spec's item kind `item`): an icon and a label on a raised container. Activating it calls
/// `action` and then closes the menu (FBM-16). It draws nothing outside a `TanreiFabMenu`.
///
///     TanreiFabMenuItem("Upload", icon: "upload", action: upload)                                  // a glyph of the icon font
///     TanreiFabMenuItem("Upload", icon: .image(Image(systemName: "square.and.arrow.up")), action: upload)
public struct TanreiFabMenuItem: View {
  let entry: TanreiFabMenuEntry

  public init<S: StringProtocol>(_ title: S, icon: TanreiItemIcon, action: @escaping @MainActor () -> Void) {
    entry = TanreiFabMenuEntry(title: String(title), icon: icon, action: action)
    // FBM-23: an item without a label or an icon still renders; a debug build says what is missing.
    for problem in entry.problems {
      TanreiDiagnostics.report("Tanrei: a FAB menu item's \(problem) (FBM-23)")
    }
  }

  public var body: some View {
    Color.clear
      .frame(width: .zero, height: .zero)
      .accessibilityHidden(true)
      ._trait(TanreiFabMenuEntryKey.self, entry)
  }
}

/// One item as the FAB menu reads it.
struct TanreiFabMenuEntry {
  let title: String
  let icon: TanreiItemIcon
  let action: @MainActor () -> Void

  /// FBM-23: an empty label (no accessible name) and an empty icon.
  var problems: [String] {
    var problems: [String] = []
    if title.trimmingCharacters(in: .whitespaces).isEmpty { problems.append("label is empty, so it has no accessible name; give it a label") }
    if icon.isEmpty { problems.append("icon is empty; give it the name of a glyph of the icon set") }
    return problems
  }
}

struct TanreiFabMenuEntryKey: _ViewTraitKey {
  static var defaultValue: TanreiFabMenuEntry? { nil }
}

/// Reads the items — every `TanreiFabMenuItem`'s trait, in order — and hands them to the FAB menu's body.
private struct TanreiFabMenuRoot<Icon: View>: _VariadicView_UnaryViewRoot {
  let label: String
  let variant: TanreiFabMenuVariant
  let size: TanreiFabMenuSize
  let isPresented: Binding<Bool>
  let isInPlace: Bool
  let icon: Icon

  func body(children: _VariadicView.Children) -> some View {
    let entries = children.compactMap { $0[TanreiFabMenuEntryKey.self] }
    // FBM-23: fewer than two or more than six items still render; a debug build reports it.
    if let problem = TanreiFabMenuRules.countProblem(entries.count) {
      let _ = TanreiDiagnostics.report("Tanrei: a FAB menu \(problem) (FBM-23)")
    }
    return TanreiFabMenuBody(
      label: label, variant: variant, size: size, isPresented: isPresented, isInPlace: isInPlace, entries: entries, icon: icon)
  }
}

// MARK: - Rules

/// Which item takes focus when the menu opens (FBM-13): the first, or the last — the one nearest the toggle — when Up
/// Arrow opened it; and whether the keyboard opened it, so that focus moved in after a pointer shows no ring (FBM-4).
struct TanreiFabMenuOpening: Equatable, Sendable {
  enum Entry: Equatable, Sendable {
    case first
    case last
  }

  var entry: Entry = .first
  var byKey = false
}

/// The rules of a FAB menu, pure.
enum TanreiFabMenuRules {
  /// "Two to six items" (FBM-23): a behaviour of the spec, not a design value.
  static let fewest = 2
  static let most = 6

  /// FBM-23: a count outside two to six.
  static func countProblem(_ count: Int) -> String? {
    guard count < fewest || count > most else { return nil }
    return "holds \(count) item\(count == 1 ? "" : "s"); a FAB menu holds \(fewest) to \(most)"
  }

  /// FBM-2: open only while enabled — a disabled FAB menu is drawn closed and presents no items.
  static func isOpen(_ isPresented: Bool, isEnabled: Bool) -> Bool {
    isPresented && isEnabled
  }

  /// FBM-1: a press, Enter or Space on the toggle asks for the opposite of open; nothing while disabled.
  static func toggled(isOpen: Bool, isEnabled: Bool) -> Bool? {
    isEnabled ? !isOpen : nil
  }

  /// FBM-1, FBM-13: Down or Up Arrow on the closed toggle opens the menu — focus to the first item, or to the last for Up
  /// Arrow; `nil` for any other key, while open, or while disabled.
  static func opening(for key: KeyEquivalent, isOpen: Bool, isEnabled: Bool) -> TanreiFabMenuOpening? {
    guard isEnabled, !isOpen else { return nil }
    switch key {
    case .downArrow: return TanreiFabMenuOpening(entry: .first, byKey: true)
    case .upArrow: return TanreiFabMenuOpening(entry: .last, byKey: true)
    default: return nil
    }
  }

  /// FBM-13: the item focus moves to when the menu opens; `nil` without items.
  static func initialFocus(count: Int, entry: TanreiFabMenuOpening.Entry) -> Int? {
    guard count > 0 else { return nil }
    return entry == .first ? 0 : count - 1
  }

  /// FBM-15: the keys that close the menu from an item, and the reason each is.
  static func closeReason(for key: KeyEquivalent) -> TanreiMenuCloseReason? {
    switch key {
    case .escape: return .escape
    case .tab: return .tab
    default: return nil
    }
  }

  /// FBM-17: where Down / Up Arrow (wrapping), Home and End move focus from item `index` of `count`; `nil` for any other
  /// key. Every item takes focus: an item has no disabled state (the spec leaves it out).
  static func target(for key: KeyEquivalent, from index: Int, count: Int, keys: TanreiRovingKeys) -> Int? {
    keys.target(for: key, from: index, in: Array(repeating: TanreiRovingItem(focusable: true, label: ""), count: count))
  }

  /// FBM-3, FBM-4: whether the keyboard leads when the items appear — the keyboard opened the menu (in place, the
  /// keyboard is the only way focus reaches an item).
  static func keyboardLeads(opening: TanreiFabMenuOpening, isInPlace: Bool) -> Bool {
    opening.byKey || isInPlace
  }

  /// FBM-3, FBM-4: item `index` shows the focused state and the ring only for focus the keyboard leads.
  static func showsFocus(_ index: Int, focused: Int?, keyboardLeads: Bool) -> Bool {
    focused == index && keyboardLeads
  }

  /// FBM-19: the place of item `index` in the opening stagger — the item nearest the toggle (the last) first.
  static func staggerOrder(index: Int, count: Int) -> Int {
    max(.zero, count - 1 - index)
  }

  /// FBM-20: an item's position in the menu and the menu's size (in English).
  static func positionText(index: Int, count: Int) -> String {
    TanreiMenuRules.positionText(index: index, count: count)
  }

  /// How far a shadow of `layers` visibly reaches beyond its caster: offset, spread and the blur's extent.
  static func shadowReach(_ layers: [TanreiShadowLayer]) -> CGFloat {
    layers.map { max(abs($0.x), abs($0.y)) + max(.zero, $0.spread) + TanreiShadowBlur.extent(cssBlur: $0.blur) }.max() ?? .zero
  }

  /// The room the popover leaves around the items, so that it clips neither their elevation (FBM-18) nor a focus ring
  /// (FBM-4): the farthest reach of any item state's shadow, or of the ring.
  static func room(tokens: TanreiFabMenuTokens, variant: TanreiFabMenuVariant, measure: TanreiMeasure) -> CGFloat {
    let states = tokens.variants[variant]
    let shadows = TanreiInteraction.allCases.map { shadowReach(states[state: $0].itemContainerElevation) }
    let ring = TanreiFocusRingMetrics(containerCornerRadius: tokens.itemShape, measure: measure).outerOutset
    return (shadows + [ring]).max()?.rounded(.up) ?? .zero
  }
}

// MARK: - The FAB menu

/// The toggle, and the items above it while open: in a popover, or in place.
struct TanreiFabMenuBody<Icon: View>: View {
  let label: String
  let variant: TanreiFabMenuVariant
  let size: TanreiFabMenuSize
  let isPresented: Binding<Bool>
  let isInPlace: Bool
  let entries: [TanreiFabMenuEntry]
  let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @FocusState private var toggleFocused: Bool
  /// Counts activations by key: each one starts a press that no pointer held down (FBM-8).
  @State private var keyboardPresses = 0
  /// Whether the popover is up: it stays while the items fade out (FBM-19).
  @State private var presented = false
  /// The items are fading out together.
  @State private var leaving = false
  @State private var opening = TanreiFabMenuOpening()
  @State private var focusInside = TanreiMenuFocusFlag()

  private var isOpen: Bool { TanreiFabMenuRules.isOpen(isPresented.wrappedValue, isEnabled: isEnabled) }

  var body: some View {
    let tokens = system.fabMenu
    let open = isOpen
    let side = tokens.sizes[size].containerSize
    let toggle = TanreiMinimumHitTarget {
      // FBM-5, FBM-12: the hidden sizing copy keeps layout at the visual square while the real button, centred over it,
      // is laid out at the minimum target on both axes.
      TanreiFabMenuToggleChrome(variant: variant, size: size, isOpen: open, isPressed: false, isFocused: false) { icon }
    } control: {
      Button(action: { press(byKey: false) }) { icon }
        .buttonStyle(TanreiFabMenuToggleStyle(variant: variant, size: size, isOpen: open, isFocused: toggleFocused, keyboardPresses: keyboardPresses))
        .focused($toggleFocused)
        // Tanrei draws its own ring (FBM-4); the system focus effect would double it.
        .focusEffectDisabled()
        // FBM-1: Enter and Space toggle, exactly once per key press, and show the press from the center (FBM-8, FBM-9).
        .tanreiKeyActivation(isEnabled: isEnabled) {
          keyboardPresses += 1
          press(byKey: true)
        }
        // FBM-1, FBM-13: Down or Up Arrow opens a closed menu; FBM-15: Escape closes an open one.
        .onKeyPress(keys: [.downArrow, .upArrow, .escape], phases: .down) { press in
          if press.key == .escape {
            guard open else { return .ignored }
            close(.escape)
            return .handled
          }
          guard let opening = TanreiFabMenuRules.opening(for: press.key, isOpen: open, isEnabled: isEnabled) else { return .ignored }
          self.opening = opening
          isPresented.wrappedValue = true
          return .handled
        }
        // FBM-20: a button named by label; the glyphs are hidden (`TanreiIconSlot`). SwiftUI has no "opens a menu" or
        // expanded property.
        .accessibilityLabel(Text(verbatim: label))
    }

    return Group {
      if isInPlace {
        // FBM-13 verify: the items in place above the toggle, `list.offset` from its top edge, end-aligned with it; an
        // overlay, so they move nothing.
        toggle.overlay(alignment: .bottomTrailing) {
          if open {
            // Its bottom edge on the toggle's, then moved up by the toggle's side and the offset.
            list(isInPlace: true)
              .fixedSize()
              .offset(y: -(side + tokens.listOffset))
          }
        }
      } else {
        // FBM-13: presented as the menu's surface is, above the toggle's end edge, on a clear background.
        toggle.popover(
          isPresented: popoverBinding,
          attachmentAnchor: .point(TanreiMenuPlacement.topEnd.attachmentPoint(layoutDirection: layoutDirection)),
          arrowEdge: TanreiMenuPlacement.topEnd.arrowEdge
        ) {
          list(isInPlace: false)
            .padding(TanreiFabMenuRules.room(tokens: tokens, variant: variant, measure: system.measure))
            .presentationCompactAdaptation(.popover)
            .presentationBackground(.clear)
        }
      }
    }
    .onChange(of: open, initial: true) { _, open in
      if open { present() } else { dismiss() }
    }
  }

  private func list(isInPlace: Bool) -> some View {
    TanreiFabMenuList(
      label: label, variant: variant, entries: entries, isInPlace: isInPlace, isLeaving: leaving, opening: opening,
      focusInside: isInPlace ? nil : focusInside, close: { close($0) })
  }

  /// The popover's own dismissal (a press outside) closes the menu (FBM-15 `outside`).
  private var popoverBinding: Binding<Bool> {
    Binding(
      get: { presented },
      set: { shown in
        guard !shown else { return }
        presented = false
        if isPresented.wrappedValue { close(.outside) }
        returnFocus()
      })
  }

  /// FBM-1: the toggle asks for the opposite of open.
  private func press(byKey: Bool) {
    guard let next = TanreiFabMenuRules.toggled(isOpen: isOpen, isEnabled: isEnabled) else { return }
    opening = TanreiFabMenuOpening(entry: .first, byKey: byKey)
    isPresented.wrappedValue = next
  }

  /// FBM-15, FBM-16: closes the menu through its binding. On SwiftUI the reason is not exposed: writing the binding is
  /// the close event.
  private func close(_ reason: TanreiMenuCloseReason) {
    guard isPresented.wrappedValue else { return }
    isPresented.wrappedValue = false
    if reason == .tab || reason == .escape { returnFocus() }
  }

  private func present() {
    leaving = false
    if !isInPlace { presented = true }
  }

  /// FBM-19: the items fade out together over the close motion, then the popover goes (at once under Reduce Motion);
  /// FBM-13: focus returns to the toggle if it was in them.
  private func dismiss() {
    guard presented else {
      returnFocus()
      return
    }
    let tokens = system.fabMenu
    guard !reduceMotion, tokens.motionCloseDuration > 0 else {
      presented = false
      returnFocus()
      return
    }
    leaving = true
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(tokens.motionCloseDuration)))
      guard !isOpen else { return }
      presented = false
      returnFocus()
    }
  }

  private func returnFocus() {
    guard focusInside.value else { return }
    focusInside.value = false
    Task { @MainActor in toggleFocused = true }
  }
}

// MARK: - The list

/// FBM-13, FBM-17, FBM-19, FBM-20: the column of items — the first at the top, every item's end edge on the column's end
/// edge, `list.gap` apart — a menu named by label; the arrows, Home and End; and the staggered entrance.
struct TanreiFabMenuList: View {
  let label: String
  let variant: TanreiFabMenuVariant
  let entries: [TanreiFabMenuEntry]
  let isInPlace: Bool
  let isLeaving: Bool
  let opening: TanreiFabMenuOpening
  let focusInside: TanreiMenuFocusFlag?
  let close: @MainActor (TanreiMenuCloseReason) -> Void

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @FocusState private var focused: Int?
  /// Whether the keyboard leads: focus moved in after a pointer opened the menu shows neither the focused state nor the
  /// ring until a key moves it (FBM-3, FBM-4).
  @State private var keyboardLeads: Bool
  @State private var hasOpened = false
  @State private var keys = TanreiRovingKeys(wraps: true)

  init(
    label: String, variant: TanreiFabMenuVariant, entries: [TanreiFabMenuEntry], isInPlace: Bool, isLeaving: Bool, opening: TanreiFabMenuOpening,
    focusInside: TanreiMenuFocusFlag?, close: @escaping @MainActor (TanreiMenuCloseReason) -> Void
  ) {
    self.label = label
    self.variant = variant
    self.entries = entries
    self.isInPlace = isInPlace
    self.isLeaving = isLeaving
    self.opening = opening
    self.focusInside = focusInside
    self.close = close
    _keyboardLeads = State(initialValue: TanreiFabMenuRules.keyboardLeads(opening: opening, isInPlace: isInPlace))
  }

  var body: some View {
    let tokens = system.fabMenu
    let count = entries.count
    VStack(alignment: .trailing, spacing: tokens.listGap) {
      ForEach(entries.indices, id: \.self) { index in
        let shown = isInPlace || (hasOpened && !isLeaving)
        row(index, count: count)
          // FBM-19: each item fades and grows in from its end edge, the one nearest the toggle first and each next one
          // `motion.stagger` later; they leave together over the close motion. At once under Reduce Motion.
          .opacity(shown ? 1 : .zero)
          .scaleEffect(shown ? 1 : .zero, anchor: .trailing)
          .animation(
            isInPlace ? nil : tokens.itemEntrance(order: TanreiFabMenuRules.staggerOrder(index: index, count: count), reduceMotion: reduceMotion),
            value: hasOpened
          )
          .animation(tokens.closeMotion(reduceMotion: reduceMotion), value: isLeaving)
      }
    }
    // FBM-20: the items are a menu named by label (SwiftUI has no menu role: a container).
    .accessibilityElement(children: .contain)
    .accessibilityLabel(Text(verbatim: label))
    .onAppear {
      guard !isInPlace else { return }
      hasOpened = true
      // FBM-13: focus moves to the first item, or to the last when Up Arrow opened the menu.
      if let first = TanreiFabMenuRules.initialFocus(count: count, entry: opening.entry) {
        Task { @MainActor in focused = first }
      }
    }
    .onChange(of: focused) { _, now in focusInside?.value = now != nil }
  }

  private func row(_ index: Int, count: Int) -> some View {
    TanreiFabMenuRow(
      entry: entries[index], index: index, count: count, variant: variant,
      isKeyboardFocused: TanreiFabMenuRules.showsFocus(index, focused: focused, keyboardLeads: keyboardLeads),
      focus: $focused,
      activate: {
        // FBM-16: the item's click, then close with the reason item.
        entries[index].action()
        close(.item)
      },
      key: { key in handle(key, from: index) })
  }

  /// FBM-15, FBM-17: the keys of item `index`; whether one was the menu's. No typeahead: six items at most are reached
  /// with the arrows.
  private func handle(_ key: KeyEquivalent, from index: Int) -> Bool {
    if let reason = TanreiFabMenuRules.closeReason(for: key) {
      close(reason)
      return true
    }
    guard let target = TanreiFabMenuRules.target(for: key, from: index, count: entries.count, keys: keys) else { return false }
    keyboardLeads = true
    focused = target
    return true
  }
}

/// One item: a button drawn by `TanreiFabMenuItemStyle`, focusable, with the menu's keys.
private struct TanreiFabMenuRow: View {
  let entry: TanreiFabMenuEntry
  let index: Int
  let count: Int
  let variant: TanreiFabMenuVariant
  let isKeyboardFocused: Bool
  let focus: FocusState<Int?>.Binding
  let activate: @MainActor () -> Void
  let key: @MainActor (KeyEquivalent) -> Bool

  /// Counts activations by key: each one starts a press that no pointer held down (FBM-8).
  @State private var keyboardPresses = 0

  var body: some View {
    Button(action: activate) { Text(verbatim: entry.title) }
      .buttonStyle(TanreiFabMenuItemStyle(entry: entry, variant: variant, isFocused: isKeyboardFocused, keyboardPresses: keyboardPresses))
      .focused(focus, equals: index)
      .focusEffectDisabled()
      // FBM-16: Enter and Space activate, once per key press, and show the press from the center.
      .tanreiKeyActivation(isEnabled: true) {
        keyboardPresses += 1
        activate()
      }
      // FBM-15, FBM-17: the arrows (wrapping), Home and End, Escape and Tab.
      .onKeyPress(keys: TanreiRovingKeys.movementKeys.union([.escape, .tab]), phases: .down) { press in
        key(press.key) ? .handled : .ignored
      }
      #if os(macOS)
      .onExitCommand { _ = key(.escape) }
      #endif
      // FBM-20: a menu item named by its label, with its position (iOS has no menu item role: a button).
      .accessibilityLabel(Text(verbatim: entry.title))
      .accessibilityValue(Text(verbatim: TanreiFabMenuRules.positionText(index: index, count: count)))
  }
}

// MARK: - Token bindings

extension TanreiFabMenuTokens {
  /// FBM-9: the ripple grows over `motion.feedback-duration` with the state easing; `nil` under Reduce Motion.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// FBM-21: a change of state — colors and elevation — over the state motion; `nil` under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// FBM-19: opening — the toggle's change and each item's entrance; `nil` under Reduce Motion.
  func openMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionOpenDuration, easing: motionOpenEasing, reduceMotion: reduceMotion)
  }

  /// FBM-19: closing — the toggle's change back and the items leaving together; `nil` under Reduce Motion.
  func closeMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionCloseDuration, easing: motionCloseEasing, reduceMotion: reduceMotion)
  }

  /// FBM-19: the toggle turning to `isOpen` — over the open motion when it opens, the close motion when it closes.
  func turnMotion(toOpen isOpen: Bool, reduceMotion: Bool) -> Animation? {
    isOpen ? openMotion(reduceMotion: reduceMotion) : closeMotion(reduceMotion: reduceMotion)
  }

  /// FBM-19: the entrance of the item `order` places after the first: the open motion, delayed by `motion.stagger` per
  /// place; `nil` under Reduce Motion.
  func itemEntrance(order: Int, reduceMotion: Bool) -> Animation? {
    openMotion(reduceMotion: reduceMotion)?.delay(Double(order) * motionStagger / 1000)
  }
}

/// Which token values the toggle draws for one variant × size × open or closed × state. Pure data read from a
/// `TanreiFabMenuTokens`, so the bindings can be tested without rendering. FBM-3 / FBM-6: every state, disabled included,
/// is drawn from that state's tokens of the look — the closed parts, or the `open.` parts while open — elevation too
/// (FBM-21).
struct TanreiFabMenuToggleAppearance: Equatable {
  let container: TanreiPaint
  let icon: TanreiPaint
  let elevation: [TanreiShadowLayer]
  /// Opacity of the whole control.
  let opacity: Double
  /// FBM-11: the size's corners while closed, `container.shape-open` while open — held to half the side, so that the
  /// corners move to round over the open motion instead of jumping.
  let cornerRadius: CGFloat
  /// The side of the square.
  let containerSize: CGFloat
  /// The icon box (FBM-11).
  let iconSize: CGFloat
  /// FBM-9 `ripple`: the pressed container paint of the look, grown from the point of contact; `nil` otherwise.
  let ripple: TanreiPaint?

  init(
    tokens: TanreiFabMenuTokens, variant: TanreiFabMenuVariant, size: TanreiFabMenuSize, isOpen: Bool, state: TanreiInteraction,
    feedback: TanreiPressedFeedback = .overlay, beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    // FBM-7: both lookups are total — an unknown value reads the default value's tokens.
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    let under = variantTokens[state: layers.container]
    container = isOpen ? under.openContainerColor : under.containerColor
    ripple = layers.ripple.map { isOpen ? variantTokens[state: $0].openContainerColor : variantTokens[state: $0].containerColor }
    icon = isOpen ? own.openIconColor : own.iconColor
    elevation = isOpen ? own.openContainerElevation : own.containerElevation
    // The vocabulary has no rest-state `opacity` token: a control at rest is not dimmed.
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity

    let metrics = tokens.sizes[size]
    containerSize = metrics.containerSize
    iconSize = metrics.iconSize
    cornerRadius = isOpen ? min(tokens.containerShapeOpen, metrics.containerSize / 2) : metrics.containerShape
  }
}

/// Which token values an item draws for one variant × state: the `item.` parts (FBM-3, FBM-9, FBM-18). Items have no
/// disabled look of their own; a disabled FAB menu presents none (FBM-2).
struct TanreiFabMenuItemAppearance: Equatable {
  let container: TanreiPaint
  let label: TanreiPaint
  let icon: TanreiPaint
  let elevation: [TanreiShadowLayer]
  let opacity: Double
  let cornerRadius: CGFloat
  let ripple: TanreiPaint?

  init(
    tokens: TanreiFabMenuTokens, variant: TanreiFabMenuVariant, state: TanreiInteraction, feedback: TanreiPressedFeedback = .overlay,
    beneath: TanreiInteraction = .enabled
  ) {
    let layers = TanreiPressLayers(state: state, feedback: feedback, beneath: beneath)
    let variantTokens = tokens.variants[variant]
    let own = variantTokens[state: layers.state]
    container = variantTokens[state: layers.container].itemContainerColor
    ripple = layers.ripple.map { variantTokens[state: $0].itemContainerColor }
    label = own.itemLabelColor
    icon = own.itemIconColor
    elevation = own.itemContainerElevation
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity
    cornerRadius = tokens.itemShape
  }
}

// MARK: - The toggle

struct TanreiFabMenuToggleStyle: ButtonStyle {
  let variant: TanreiFabMenuVariant
  let size: TanreiFabMenuSize
  let isOpen: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiFabMenuToggleChrome(
      variant: variant, size: size, isOpen: isOpen, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses
    ) {
      configuration.label
    }
    // FBM-5: the hit area reaches the minimum target on both axes; the visual size does not change.
    .tanreiHitTargetExpansion()
  }
}

/// The toggle's visual: a raised square of the look (closed or open) with the elevation of its state, the icon slot's
/// glyph while closed and the close glyph while open, and the focus indicator, all drawn from the tokens of the one
/// resolved state.
struct TanreiFabMenuToggleChrome<Icon: View>: View {
  let variant: TanreiFabMenuVariant
  let size: TanreiFabMenuSize
  let isOpen: Bool
  let isPressed: Bool
  let isFocused: Bool
  var keyboardPresses = 0
  @ViewBuilder let icon: Icon

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // FBM-8: a press stays visible at least `duration.press-hold`; FBM-9: the point of contact only under `ripple`.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.fabMenu
    // FBM-3: exactly one state — pressed > focused > hovered; FBM-6: disabled is a state too. SwiftUI focus is keyboard
    // focus: a click or tap never moves focus to a button.
    let state = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiFabMenuToggleAppearance(
      tokens: tokens, variant: variant, size: size, isOpen: isOpen, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    // FBM-11: the icon box of the size, centred, with the icon font of an unselected icon; the slot's glyph while closed
    // and the icon set's close glyph while open (a drawn cross without the icon font), cross-faded (FBM-19). An icon is
    // not text: Dynamic Type changes neither the icon nor the square.
    return ZStack {
      TanreiIconSlot(size: appearance.iconSize) { icon }
        .opacity(isOpen ? .zero : 1)
      TanreiIconSlot(size: appearance.iconSize) { TanreiChipGlyph(kind: .close) }
        .opacity(isOpen ? 1 : .zero)
    }
    .tanreiIconContext(size: appearance.iconSize, selected: false)
    .foregroundStyle(colors[appearance.icon])
    .frame(width: appearance.containerSize, height: appearance.containerSize)
    // FBM-21: the elevation of the look and state, cast outside the container and never clipped; FBM-10: the corners
    // ease by `sys.shape.corner-smoothing` (both in `TanreiContainerLayers`).
    .modifier(
      TanreiContainerLayers(
        fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
        outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
    // FBM-21: colors and elevation change over the state motion; FBM-19: the change between closed and open — colors,
    // corners and the glyph's cross-fade — over the open or close motion. At once under Reduce Motion.
    .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
    .animation(tokens.turnMotion(toOpen: isOpen, reduceMotion: reduceMotion), value: isOpen)
    // FBM-4: shown for keyboard focus, never animated, and never dimmed by a state's opacity.
    .tanreiFocusRing(isFocused && isEnabled, cornerRadius: appearance.cornerRadius)
    .onHover { isHovered = $0 }
  }
}

// MARK: - An item

struct TanreiFabMenuItemStyle: ButtonStyle {
  let entry: TanreiFabMenuEntry
  let variant: TanreiFabMenuVariant
  let isFocused: Bool
  var keyboardPresses = 0

  func makeBody(configuration: Configuration) -> some View {
    TanreiFabMenuItemChrome(
      title: entry.title, icon: entry.icon, variant: variant, isPressed: configuration.isPressed, isFocused: isFocused, keyboardPresses: keyboardPresses)
  }
}

/// FBM-18: one item — a raised container at least `item.height` (and the minimum target) tall and as wide as its content,
/// its icon and then its label `item.gap` apart, padded by `item.padding-inline-start` and `-end` (logical, so right to
/// left mirrors them, FBM-22) — drawn from the item parts of the one resolved state.
struct TanreiFabMenuItemChrome: View {
  let title: String
  let icon: TanreiItemIcon
  let variant: TanreiFabMenuVariant
  let isPressed: Bool
  let isFocused: Bool
  var keyboardPresses = 0

  @Environment(\.tanreiSystem) private var system
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors
  @State private var isHovered = false

  var body: some View {
    let feedback = system.behavior.pressedFeedback
    // FBM-8, FBM-9 for an item: its own press, held, answered as the system chooses within its own container.
    TanreiPressTracking(isPressed: isPressed, keyPresses: keyboardPresses, watchesContact: feedback == .ripple) { press in
      chrome(press: press, feedback: feedback)
    }
  }

  private func chrome(press: TanreiPressState, feedback: TanreiPressedFeedback) -> some View {
    let tokens = system.fabMenu
    let state = TanreiInteraction.resolve(isPressed: press.isPressed, isFocused: isFocused, isHovered: isHovered)
    let beneath = TanreiInteraction.resolve(isPressed: false, isFocused: isFocused, isHovered: isHovered)
    let appearance = TanreiFabMenuItemAppearance(tokens: tokens, variant: variant, state: state, feedback: feedback, beneath: beneath)
    let ripple = appearance.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: tokens.rippleGrowth(reduceMotion: reduceMotion))
    }

    return HStack(alignment: .center, spacing: icon.isEmpty ? .zero : tokens.itemGap) {
      // FBM-18: the icon at `item.icon.size` with the family and fill of an unselected icon; decorative (FBM-20). An empty
      // name takes no room.
      if !icon.isEmpty {
        TanreiIconSlot(size: tokens.itemIconSize) {
          TanreiItemIconView(icon: icon, size: tokens.itemIconSize, selected: false)
        }
        .foregroundStyle(colors[appearance.icon])
      }
      // FBM-18: one line while it fits; it wraps rather than truncates, and the item grows with it (and with Dynamic
      // Type — the label is text).
      Text(verbatim: title)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .tanreiTextStyle(tokens.itemLabelTypescale)
        .foregroundStyle(colors[appearance.label])
    }
    .padding(.leading, tokens.itemPaddingInlineStart)
    .padding(.trailing, tokens.itemPaddingInlineEnd)
    // FBM-5: at least `item.height` and the minimum target tall — stacked items cannot extend a hit area over each other —
    // and the whole container is the hit area.
    .frame(minHeight: max(tokens.itemHeight, TanreiHitTarget.minimum(in: system.measure)))
    // The item's accessibility frame also takes in its drawn shadow.
    .contentShape(.interaction, Rectangle())
    // FBM-18: the container of the state with its elevation, cast outside it and never clipped; FBM-9: the ripple within
    // it; FBM-10: corners eased by the corner smoothing.
    .modifier(
      TanreiContainerLayers(
        fill: colors[appearance.container], elevation: appearance.elevation, cornerRadius: appearance.cornerRadius,
        outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: appearance.opacity))
    // FBM-21: colors and elevation change over the state motion; at once under Reduce Motion.
    .animation(tokens.stateMotion(reduceMotion: reduceMotion), value: state)
    // FBM-4: the ring around the item's own shape, for keyboard focus only, never animated.
    .tanreiFocusRing(isFocused, cornerRadius: appearance.cornerRadius)
    .onHover { isHovered = $0 }
  }
}
